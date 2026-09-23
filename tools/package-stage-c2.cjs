// Package only a completely reviewed C2 tree; preserve the immutable 0.33.0 base.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables'));process.chdir(root);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),version=require('../package.json').version;
const summary=require('../qa/results/summary.json'),validation=require('../qa/results/stage-c2-final-validation.json'),perf=require('../qa/results/stage-c2-performance.json');
if(version!=='0.34.0'||!summary.passed||summary.patch!=='stage-c2'||summary.runs.length!==50||summary.runs.some(r=>r.exitCode!==0))throw Error('C2 regression gate is not green');
if(!validation.passed||validation.fullCoverageGroups!==50||validation.runtimeSha256!==sha(fs.readFileSync('js/game.js')))throw Error('Current C2 validation proof is missing or stale');
if(!perf.passed||perf.version!==version||perf.runtimeSha256!==sha(fs.readFileSync('js/game.js'))||perf.errors.length||perf.rows.length!==12)throw Error('C2 performance gate is not green');
for(const name of ['stage-c2-prerequisites','stage-c2','stage-c1-light-modules','stage-c1-recovery'])if(require('../qa/results/'+name+'.json').failed)throw Error('C2 gate failed: '+name);
cp.execFileSync(process.execPath,['tools/build.cjs','--check'],{stdio:'inherit'});
const report='STAGE_C2_REPORT_RU.md';if(!fs.existsSync(report)||/<!-- .*RESULTS -->/.test(fs.readFileSync(report,'utf8')))throw Error('Missing or unfinished report');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const baseline=require('../qa/stage-c2-base/release_manifest.json'),before=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes=[],added=[];
for(const name of walk()){if(['release_manifest.json','STAGE_C2_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));if(removed.length)throw Error('Unexpected removals: '+removed.join(','));
fs.writeFileSync('STAGE_C2_CHANGESET.json',JSON.stringify({version,baseline:'0.33.0',changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={version,patch:'stage-c2',reference:'LAST_BASE_0.33.0_Stage_C1_GitHub.zip',referenceSha256:'cb223567033e911483be4f231fa2d9d64bdd59d4f25de5556df6970844c71d8e',builtAt:new Date().toISOString(),saveVersion:12,layout:'R3',campaignSchema:1,campaignContentRevision:4,legacyCampaignContentRevision:3,fixedEquipmentInstances:18,stageAStatus:'accepted in general by user',stageBStatus:'accepted in general by user',stageC1Status:'accepted by user',stageC2Started:true,stageC2Status:'implemented; manual review pending',stageDStarted:false,buildingPlacementSystemImplemented:false,chapter1RecoveryLoopImplemented:true,damagedDefaultNewGame:true,damagedPresetAppliedToOldSaves:false,level2Implemented:false,farmAnimalsPaused:true,toolLevels:{min:0,max:5},coreUIState:'transient; reset on leaving Level 1 or loading a save',automatedGatePassed:true,automatedAssertions:summary.automatedAssertions,regressionGroups:summary.runs.length,validationReport:'qa/results/stage-c2-final-validation.json',performanceComparison:'qa/results/stage-c2-performance.json',report,files};
fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const zip=path.join(out,'LAST_BASE_0.34.0_Stage_C2_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite an existing release');
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
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,crcPassed:true,allManifestHashesPassed:true,sourceTreeEqualityPassed:true,report:path.join(out,'LAST_BASE_0.34.0_Stage_C2_Report_RU.md')};fs.copyFileSync(report,result.report);fs.writeFileSync(path.join(out,'LAST_BASE_0.34.0_Stage_C2_ZIP_Check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
