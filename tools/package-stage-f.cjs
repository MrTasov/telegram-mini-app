// Release gate for Stage F over the immutable, accepted 0.36.1 archive.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables-stage-f'));process.chdir(root);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),runtimeSha256=sha(fs.readFileSync('js/game.js')),version=require('../package.json').version;
const summary=require('../qa/results/summary.json'),story=require('../qa/results/stage-f.json'),perf=require('../qa/results/stage-f-performance.json'),ui=require('../qa/results/stage-f-ui-performance.json'),storyPerf=require('../qa/results/stage-f-story-performance.json');
if(version!=='0.37.0'||!summary.passed||summary.filtered||summary.patch!=='stage-f'||summary.runs.length!==59||!summary.runtimeUnchanged||summary.runtimeSha256!==runtimeSha256||summary.runs.some(r=>r.exitCode!==0||r.runtimeSha256!==runtimeSha256))throw Error('Full current Stage F regression gate failed or stale');
if(story.failed||story.passed<53||story.runtimeSha256!==runtimeSha256)throw Error('Story regression gate missing/stale');
for(const name of ['stage-e','stage-e-corrective','stage-e-audio-corrective','stage-d-complete','stage-d-corrective','stage-d','stage-c2']){const r=require('../qa/results/'+name+'.json');if(r.failed||r.runtimeSha256&&r.runtimeSha256!==runtimeSha256)throw Error('Accepted contract failed/stale: '+name);}
if(!perf.passed||perf.runtimeSha256!==runtimeSha256||perf.rows.length!==12||perf.errors.length||!perf.audioBuffers.every(n=>n===57)||perf.maxEquipment.length!==4||perf.maxEquipment.some(r=>r.instances!==42||r.poweredLamps!==8)||!perf.movement.passed||perf.movement.rows.length!==4)throw Error('Performance comparison incomplete or stale');
if(!ui.passed||ui.runtimeSha256!==runtimeSha256||ui.rows.length!==12||!storyPerf.passed||storyPerf.runtimeSha256!==runtimeSha256||storyPerf.idleArchiveRebuilds!==0)throw Error('UI/story performance gate missing/stale');
const tail=require('../qa/results/stage-f-movement-tail-performance.json');if(!tail.passed||tail.runtimeSha256!==runtimeSha256||tail.rows.length!==2||tail.rows.some(r=>r.samples!==240))throw Error('Targeted PC movement check missing/stale');
cp.execFileSync(process.execPath,['tools/build.cjs','--check'],{stdio:'inherit'});
const report='STAGE_F_REPORT_RU.md';if(!fs.existsSync(report)||/<!-- (?:FINAL_RESULTS|PERFORMANCE_ASSESSMENT) -->/.test(fs.readFileSync(report,'utf8')))throw Error('Unfinished report');
const baseline=require('../qa/stage-f-base/release_manifest.json'),reference='LAST_BASE_0.36.1_Stage_E_Corrective_GitHub.zip',referenceSha256='ac1ffa81d421f3b885e91c0d463f676dbdce26489d568cd1b9dace36b844aced';
if(sha(fs.readFileSync('qa/stage-f-base/js/game.js'))!==baseline.runtimeSha256||baseline.version!=='0.36.1')throw Error('Invalid baseline');
for(const kind of ['changes','added'])for(const [file,hashes]of Object.entries(require('../qa/stage-f-source-reference.json')[kind]))if(sha(fs.readFileSync(file))!==hashes.after)throw Error('Stale source reference '+file);
for(const file of baseline.files.filter(f=>f.file.startsWith('assets/')))if(sha(fs.readFileSync(file.file))!==file.sha256)throw Error('Unexpected asset change '+file.file);
const proof={version,runtimeSha256,passed:true,baseline:reference,baselineSha256:referenceSha256,regressionGroups:59,automatedAssertions:summary.automatedAssertions,storyCases:story.passed,allGroupsSameRuntime:true,performanceScenes:12,performanceUITabCases:12,performanceMovementRows:4,performancePassMeaning:'coverage/error checks; includes unfavorable timing results; not a browser or real-device FPS guarantee',browserVisualQAPassed:false,physicalAudioVerified:false,saveVersion:17,storySchema:1,storyContentRevision:1,storyEntries:4,introDurationMs:18000,introMedia:'localized text, no generated assets',introOnLegacyContinue:false,sharedUnlocksPersonalWatched:true,realBackpackSlots:true,pickupHoldMs:3000,sameInstancePackUp:true,chapterContentRevision:6,researchCreatesEquipment:false,maximumCurrentEquipment:42,report,nextStageStarted:false,stageGStarted:false,level2Implemented:false,manualAcceptance:'pending',limitations:[...perf.limitations,...storyPerf.limitations]};
fs.writeFileSync('qa/results/stage-f-final-validation.json',JSON.stringify(proof,null,2)+'\n');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const before=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes=[],added=[];
for(const name of walk()){if(['release_manifest.json','STAGE_F_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));if(removed.length)throw Error('Unexpected baseline removals');
fs.writeFileSync('STAGE_F_CHANGESET.json',JSON.stringify({version,baseline:'0.36.1 Stage E Corrective',changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={...baseline,...proof,patch:'stage-f',reference,referenceSha256,builtAt:new Date().toISOString(),stageFStarted:true,automatedGatePassed:true,validationReport:'qa/results/stage-f-final-validation.json',performanceComparison:'qa/results/stage-f-performance.json',performanceFollowUps:['qa/results/stage-f-ui-performance.json','qa/results/stage-f-story-performance.json','qa/results/stage-f-movement-tail-performance.json'],files};fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const zip=path.join(out,'LAST_BASE_0.37.0_Stage_F_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite an existing release');
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
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,crcPassed:true,allManifestHashesPassed:true,sourceTreeEqualityPassed:true,runtimeSha256,baseline:reference,baselineSha256:referenceSha256,report:path.join(out,'LAST_BASE_0.37.0_Stage_F_Report_RU.md')};fs.copyFileSync(report,result.report);const proofPath=path.join(out,'LAST_BASE_0.37.0_Stage_F_Verification.json');fs.writeFileSync(proofPath,JSON.stringify({...proof,archive:result},null,2)+'\n');fs.writeFileSync(path.join(out,'LAST_BASE_0.37.0_Stage_F_SHA256.txt'),result.sha256+'  '+path.basename(zip)+'\n');console.log(JSON.stringify({...result,verification:proofPath}));
