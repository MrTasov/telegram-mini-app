// Fresh Stage D release gate and reproducible file inventory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables'));process.chdir(root);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),version=require('../package.json').version;
const summary=require('../qa/results/summary.json'),validation=require('../qa/results/stage-d-final-validation.json'),perf=require('../qa/results/stage-d-performance.json');
if(version!=='0.35.1'||!summary.passed||summary.patch!=='stage-d-clean-restart'||summary.runs.length!==53||summary.runs.some(r=>r.exitCode!==0))throw Error('Stage D regression gate is not green');
const runtimeHash=sha(fs.readFileSync('js/game.js'));
if(!validation.passed||validation.fullCoverageGroups!==53||validation.runtimeSha256!==runtimeHash)throw Error('Current Stage D proof missing or stale');
if(!perf.passed||perf.version!==version||perf.runtimeSha256!==runtimeHash||perf.errors.length||perf.rows.length!==12||perf.idlePlacementChecks!==0)throw Error('Stage D performance gate failed');
for(const name of ['stage-d','stage-d-repair','stage-d-visuals','stage-c2-prerequisites','stage-c2','stage-c1-light-modules','stage-c1-recovery'])if(require('../qa/results/'+name+'.json').failed)throw Error('Failed group: '+name);
cp.execFileSync(process.execPath,['tools/build.cjs','--check'],{stdio:'inherit'});
const report='STAGE_D_REPORT_RU.md';if(!fs.existsSync(report)||fs.readFileSync(report,'utf8').includes('<!-- FINAL_RESULTS -->'))throw Error('Unfinished report');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const baseline=require('../qa/stage-d-base/release_manifest.json'),before=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes=[],added=[];
for(const name of walk()){if(['release_manifest.json','STAGE_D_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));if(removed.length)throw Error('Unexpected removals: '+removed.join(','));
fs.writeFileSync('STAGE_D_CHANGESET.json',JSON.stringify({version,baseline:'0.34.0 Stage C2',cleanRestart:true,changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={version,patch:'stage-d-clean-restart',reference:'LAST_BASE_0.34.0_Stage_C2_GitHub.zip',referenceSha256:'11a1742cf3887b29036f7a9d3168942bf86829db9c1fdee9c32bbb1a49cb2b60',builtAt:new Date().toISOString(),saveVersion:13,equipmentSchema:2,placementSchema:1,layout:'R3',campaignSchema:1,campaignContentRevision:4,legacyCampaignContentRevision:3,authoredEquipmentInstances:18,maximumEquipmentInstances:20,placementTypes:['furnace','craft_bench'],placementRooms:['workshop','reserve_l1'],sameInstancePackUp:true,packedPower:false,stageC2Status:'stable input; repair guard recreated and tested',stageDStatus:'implemented; manual acceptance pending',stageDStarted:true,buildingPlacementSystemImplemented:true,nextStageStarted:false,level2Implemented:false,farmAnimalsPaused:true,toolLevels:{min:0,max:5},coreUIState:'transient; reset when leaving Level 1 or loading',automatedGatePassed:true,automatedAssertions:summary.automatedAssertions,regressionGroups:summary.runs.length,validationReport:'qa/results/stage-d-final-validation.json',performanceComparison:'qa/results/stage-d-performance.json',report,files};
fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const zip=path.join(out,'LAST_BASE_0.35.1_Stage_D_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite existing release');
cp.execFileSync('zip',['-q','-9',zip,'-@'],{cwd:root,input:walk().join('\n')+'\n',maxBuffer:1024*1024});cp.execFileSync('unzip',['-tq',zip],{maxBuffer:1024*1024});
cp.execFileSync('python3',['-c',`import hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
 m=json.loads(z.read('release_manifest.json')); names=z.namelist()
 assert len(names)==len(set(names))==len(m['files'])+1
 assert set(names)=={f['file'] for f in m['files']}|{'release_manifest.json'}
 for f in m['files']:
  b=z.read(f['file']); assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256'],f['file']
  assert b==(root/f['file']).read_bytes(),f['file']
 assert z.read('release_manifest.json')==(root/'release_manifest.json').read_bytes()
`,zip,root],{maxBuffer:1024*1024});
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,crcPassed:true,allManifestHashesPassed:true,sourceTreeEqualityPassed:true,baseline:manifest.reference,baselineSha256:manifest.referenceSha256,report:path.join(out,'LAST_BASE_0.35.1_Stage_D_Report_RU.md')};fs.copyFileSync(report,result.report);fs.writeFileSync(path.join(out,'LAST_BASE_0.35.1_Stage_D_ZIP_Check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
