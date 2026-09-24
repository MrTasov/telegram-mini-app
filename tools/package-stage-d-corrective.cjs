// Reproducible file inventory and release gates for 0.35.2.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables'));process.chdir(root);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),version=require('../package.json').version,runtimeSha256=sha(fs.readFileSync('js/game.js'));
const summary=require('../qa/results/summary.json'),perf=require('../qa/results/stage-d-corrective-performance.json');
if(version!=='0.35.2'||!summary.passed||summary.filtered||summary.patch!=='stage-d-corrective'||summary.runs.length!==54||!summary.runtimeUnchanged||summary.runtimeSha256!==runtimeSha256||summary.runs.some(r=>r.exitCode!==0||r.runtimeSha256!==runtimeSha256))throw Error('Full current corrective regression gate failed or stale');
if(perf.benchmarkVersion!==2||perf.audioBuffers?.length!==2||!perf.audioBuffers.every(n=>n===57)||!perf.passed||perf.version!==version||perf.runtimeSha256!==runtimeSha256||perf.rows.length!==12||perf.errors.length||perf.idlePlacementChecks!==0||perf.maxEquipment.length!==2||perf.maxEquipment.some(r=>r.instances!==42||r.placedLamps!==8||r.poweredLamps!==8))throw Error('Full current corrective performance gate failed or stale');
const specific=require('../qa/results/stage-d-corrective.json');if(specific.failed||specific.runtimeSha256!==runtimeSha256)throw Error('Current corrective suite failed or stale');
cp.execFileSync(process.execPath,['tools/build.cjs','--check'],{stdio:'inherit'});
const report='STAGE_D_CORRECTIVE_REPORT_RU.md';if(!fs.existsSync(report)||fs.readFileSync(report,'utf8').includes('<!-- FINAL_RESULTS -->'))throw Error('Unfinished report');
const proof={version,runtimeSha256,passed:true,regressionGroups:54,automatedAssertions:summary.automatedAssertions,correctiveCases:specific.passed,saveBoundaries:specific.boundaries.length,allGroupsSameRuntime:true,performanceScenes:12,maximumCurrentEquipment:42,registryCap:48,placedLamps:8,inventoryInstances:true,sameInstancePackUp:true,saveVersion:14,report,nextStageStarted:false,manualAcceptance:'pending',limitations:perf.limitations};
fs.writeFileSync('qa/results/stage-d-corrective-final-validation.json',JSON.stringify(proof,null,2)+'\n');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const baseline=require('../qa/stage-d-corrective-base/release_manifest.json'),before=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes=[],added=[];
for(const name of walk()){if(['release_manifest.json','STAGE_D_CORRECTIVE_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));if(removed.length)throw Error('Unexpected baseline removals: '+removed.join(','));
fs.writeFileSync('STAGE_D_CORRECTIVE_CHANGESET.json',JSON.stringify({version,baseline:'0.35.1 Stage D',changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={version,patch:'stage-d-corrective',reference:'LAST_BASE_0.35.1_Stage_D_GitHub.zip',referenceSha256:'99e6fcd2ffe3e83d554c621901924687702d04adf5993658ac94790d630dadfa',builtAt:new Date().toISOString(),runtimeSha256,saveVersion:14,equipmentSchema:3,placementSchema:2,chapterSchema:2,layout:'R3',campaignContentRevision:5,retainedCampaignContentRevisions:[3,4],authoredEquipmentInstances:18,registryCap:48,maximumCurrentEquipment:42,constructionTypes:['furnace','craft_bench','utility_workbench','storage_crate'],utilityBuildableTypes:['base_lamp'],placementRooms:['workshop','room4','room5','room6','room7','storage','reserve_l1'],roomNamesPersistent:true,craftGoesToInventory:true,sameInstancePackUp:true,packedPower:false,destructiveDismantle:false,manualAcceptance:'pending',nextStageStarted:false,level2Implemented:false,farmAnimalsPaused:true,toolLevels:{min:0,max:5},coreUIState:'transient; reset when leaving Level 1 or loading',automatedGatePassed:true,automatedAssertions:summary.automatedAssertions,regressionGroups:54,validationReport:'qa/results/stage-d-corrective-final-validation.json',performanceComparison:'qa/results/stage-d-corrective-performance.json',report,files};
fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const zip=path.join(out,'LAST_BASE_0.35.2_Stage_D_Corrective_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite an existing release');
cp.execFileSync('zip',['-q','-9',zip,'-@'],{cwd:root,input:walk().join('\n')+'\n',maxBuffer:1024*1024});cp.execFileSync('unzip',['-tq',zip],{maxBuffer:1024*1024});
cp.execFileSync('python3',['-c',`import hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
 m=json.loads(z.read('release_manifest.json'));names=z.namelist()
 assert len(names)==len(set(names))==len(m['files'])+1
 assert set(names)=={f['file'] for f in m['files']}|{'release_manifest.json'}
 for f in m['files']:
  b=z.read(f['file']);assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256'],f['file']
  assert b==(root/f['file']).read_bytes(),f['file']
 assert z.read('release_manifest.json')==(root/'release_manifest.json').read_bytes()
`,zip,root],{maxBuffer:1024*1024});
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,crcPassed:true,allManifestHashesPassed:true,sourceTreeEqualityPassed:true,runtimeSha256,baseline:manifest.reference,baselineSha256:manifest.referenceSha256,report:path.join(out,'LAST_BASE_0.35.2_Stage_D_Corrective_Report_RU.md')};fs.copyFileSync(report,result.report);const proofPath=path.join(out,'LAST_BASE_0.35.2_Stage_D_Corrective_Verification.json');fs.writeFileSync(proofPath,JSON.stringify({...proof,archive:result},null,2)+'\n');console.log(JSON.stringify({...result,verification:proofPath}));
