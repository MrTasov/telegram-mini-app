// GitHub-ready root archive, complete inventory and immutable-baseline delta.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables'));
process.chdir(root);fs.mkdirSync(out,{recursive:true});
const summary=require('../qa/results/summary.json'),full=require('../qa/results/stage-ab-full-run.json'),perf=require('../qa/results/stage-ab-performance.json');
for(const gate of [summary,full])if(!gate.passed||gate.filtered||gate.version!=='0.32.1'||gate.patch!=='stage-ab-corrective'||gate.runs.length!==46||gate.runs.some(r=>r.exitCode!==0))throw Error('Complete corrective regression gate is not green');
if(!perf.passed||perf.version!=='0.32.1'||perf.errors.length||perf.rows.length!==10)throw Error('Corrective performance gate is not green');
for(const name of ['stage-ab-corrective','stage-ab-light-audio'])if(require('../qa/results/'+name+'.json').failed)throw Error('Corrective targeted gate failed: '+name);
cp.execFileSync(process.execPath,['tools/build.cjs','--check'],{stdio:'inherit'});
const report='STAGE_AB_CORRECTIVE_REPORT_RU.md';if(!fs.existsSync(report))throw Error('Missing corrective report');
if(fs.readFileSync(report,'utf8').includes('<!-- PERFORMANCE_RESULTS -->'))throw Error('Unfinished performance report');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const followup=require('../qa/results/stage-ab-light-followup.json');
if(!followup.passed||followup.runtimeSha256!==sha(fs.readFileSync('js/game.js'))||followup.sourceSha256!==sha(fs.readFileSync('src/render/lighting.js')))throw Error('Current lighting follow-up is missing or stale');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const baseline=require('../qa/stage-ab-base/release_manifest.json'),before=new Map(baseline.files.map(f=>[f.file,f.sha256]));
const changes=[],added=[];for(const name of walk()){if(['release_manifest.json','STAGE_AB_CORRECTIVE_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));if(removed.length!==1||removed[0]!=='assets/audio/full/day.wav')throw Error('Unexpected removals: '+removed.join(','));
fs.writeFileSync('STAGE_AB_CORRECTIVE_CHANGESET.json',JSON.stringify({version:'0.32.1',baseline:'0.32.0',changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={version:'0.32.1',patch:'stage-ab-corrective',reference:'LAST_BASE_0.32.0_Stage_B_GitHub.zip',referenceSha256:'02571f47a11d32c0f31b8411de83a0e78993b28bfacbff9a81484fa6ffe19b11',builtAt:new Date().toISOString(),saveVersion:8,layout:'R3',campaignSchema:1,campaignContentRevision:3,stageAStatus:'corrected; repeat manual acceptance pending',stageBStatus:'corrected; repeat manual acceptance pending',stageC1Started:false,buildingPlacementImplemented:false,finalChapter1Implemented:false,level2Implemented:false,manualAcceptance:'Repeat user review of Stage A/B corrective patch pending',automatedGatePassed:true,automatedAssertions:summary.automatedAssertions,fullRegressionGroups:full.runs.length,fullRegressionPassed:full.passed,correctiveChecks:require('../qa/results/stage-ab-corrective.json').passed+require('../qa/results/stage-ab-light-audio.json').passed,performanceComparison:'qa/results/stage-ab-performance.json',validationReport:'qa/results/summary.json',report,scope:'User attachment sections 1–34; section 35 contains a heading only.',files};
fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const zip=path.join(out,'LAST_BASE_0.32.1_Stage_AB_Corrective_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite an existing release archive');
cp.execFileSync('zip',['-q','-9',zip,'-@'],{cwd:root,input:walk().join('\n')+'\n',maxBuffer:1024*1024});
cp.execFileSync('unzip',['-tq',zip],{maxBuffer:1024*1024});
// Validate both the archive manifest and equality to the packaged source tree.
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
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,crcPassed:true,allManifestHashesPassed:true,sourceTreeEqualityPassed:true,report:path.join(out,'LAST_BASE_0.32.1_Stage_AB_Corrective_Report_RU.md')};
fs.copyFileSync(report,result.report);fs.writeFileSync(path.join(out,'LAST_BASE_0.32.1_Stage_AB_Corrective_ZIP_Check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
