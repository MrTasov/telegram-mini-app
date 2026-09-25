// Final two-change release. Prior full/performance passes remain historical.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables-stage-f-final'));process.chdir(root);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=file=>JSON.parse(fs.readFileSync(file));
const runtimeSha256=sha(fs.readFileSync('js/game.js')),version=read('package.json').version;
const baseline=read('qa/stage-f-final-base/release_manifest.json'),baselineHash='201bbd5da6ac2cb7f33528b804f95477ecffe8ea68a7e201204b3d37cbe95a4d';
assert.equal(version,'0.37.1');assert.equal(baseline.version,'0.37.0');assert.equal(baseline.runtimeSha256,baselineHash);assert.equal(sha(fs.readFileSync('qa/stage-f-final-base/js/game.js')),baselineHash);
const summary=read('qa/results/stage-f-final-summary.json'),story=read('qa/results/stage-f-final.json'),media=read('qa/results/stage-f-final-media.json');
assert.ok(summary.complete&&summary.passed&&summary.runtimeUnchanged);assert.equal(summary.scope,'targeted-final-two-changes');assert.equal(summary.runtimeSha256,runtimeSha256);assert.equal(summary.version,version);assert.equal(summary.groups,8);assert.equal(summary.failedChecks,0);
assert.deepEqual(summary.runs.map(r=>r.id),['build','verification','stage-f','stage-f-final','state-saves','main-menu','stage-e-audio-corrective','stage-e-corrective']);
for(const r of summary.runs){assert.equal(r.exitCode,0,r.id);assert.equal(r.runtimeSha256,runtimeSha256,r.id);assert.ok(r.passed,r.id);if(r.report){const data=read(r.report);assert.equal(data.failed,0,r.id);assert.equal(data.passed,r.checks,r.id);if(data.runtimeSha256)assert.equal(data.runtimeSha256,runtimeSha256,r.id);}}
assert.equal(story.failed,0);assert.ok(story.passed>=22);assert.equal(story.runtimeSha256,runtimeSha256);
const videoHash='b5a6fca2bceb66546dce80d09523ec7acc1440d780326860b39650a782185790',video=fs.readFileSync('assets/video/last-base-intro.mp4');
assert.equal(sha(video),videoHash);assert.equal(video.length,18124094);assert.equal(media.sha256,videoHash);assert.ok(media.sourceByteIdentical);assert.equal(media.decodeToNull.exitCode,0);assert.equal(media.decodeToNull.errors,'');assert.equal(media.edited,false);assert.equal(media.transcoded,false);
cp.execFileSync(process.execPath,['tools/build.cjs','--check'],{stdio:'inherit'});
const reference=read('qa/stage-f-final-source-reference.json');for(const kind of ['changes','added'])for(const [file,hashes]of Object.entries(reference[kind]))assert.equal(sha(fs.readFileSync(file)),hashes.after,file+' source reference');
const allowed=new Set(['src/assets/manifest.js','src/i18n/catalogs.js','src/manifest.json','src/save/format.js','src/save/envelope.js','src/save/slots.js','src/story/definitions.js','src/story/player.js','src/ui/archive.js','locales/ru.json','locales/en.json','assets/manifest.json']);
for(const f of baseline.files){if(/^(src|styles|locales|assets)\//.test(f.file)&&!allowed.has(f.file))assert.equal(sha(fs.readFileSync(f.file)),f.sha256,'Unrequested production change '+f.file);}
const oldCatalog=JSON.parse(fs.readFileSync('qa/stage-f-final-base/js/game.js','utf8').match(/const AssetManifest=(.*);/)[1]),catalog=JSON.parse(fs.readFileSync('src/assets/manifest.js','utf8').match(/const AssetManifest=(.*);/)[1]);assert.deepEqual(Object.keys(catalog.videos),['story/intro']);delete catalog.videos;assert.deepEqual(catalog,oldCatalog);
const report='STAGE_F_FINAL_REPORT_RU.md';assert.ok(fs.existsSync(report));assert.ok(!fs.readFileSync(report,'utf8').includes('<!-- FINAL_RESULTS -->'));
const proof={version,runtimeSha256,passed:true,baseline:'LAST_BASE_0.37.0_Stage_F_GitHub.zip',baselineSha256:'442e45cbbb52f6b612c7f43ba1ad568390c56c70c4c3eb01c040c075444c069d',baselineRuntimeSha256:baselineHash,scope:'Official Intro video + Archive rereading only',regressionGroups:summary.groups,automatedAssertions:summary.checks,allGroupsSameRuntime:true,fullRegressionRepeated:false,performanceRepeated:false,historicalBaselineFullPass:{version:'0.37.0',runtimeSha256:baselineHash,groups:59,checks:12904,errors:0},officialVideo:{file:'assets/video/last-base-intro.mp4',bytes:video.length,sha256:videoHash,durationMs:21250,byteIdenticalToUserAttachment:true,transcoded:false,decodeToNullPassed:true},introAutomaticTrigger:'New Game only',continueReplaysIntro:false,manualArchiveReplayRetained:true,archiveReadEntriesReopenable:true,saveVersion:17,newMigration:false,storySchema:1,storyContentRevision:1,chapterContentRevision:6,acceptedAudioSourcesUnchanged:true,acceptedGameplayDomainsUnchanged:true,browserVisualQAPassed:false,nativeVideoPlaybackVerified:false,physicalAudioVerified:false,report,stageGStarted:false,level2Implemented:false,nextStageStarted:false,manualAcceptance:'pending',limitations:summary.limitations};
fs.writeFileSync('qa/results/stage-f-final-release-validation.json',JSON.stringify(proof,null,2)+'\n');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const before=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes=[],added=[];
for(const name of walk()){if(['release_manifest.json','STAGE_F_FINAL_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));assert.deepEqual(removed,[]);
for(const f of added.filter(f=>/^(src|styles|locales|assets)\//.test(f.file)))assert.ok(['src/story/video.js','assets/video/last-base-intro.mp4'].includes(f.file),'Unrequested production addition '+f.file);
fs.writeFileSync('STAGE_F_FINAL_CHANGESET.json',JSON.stringify({version,baseline:'0.37.0 Stage F',changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={...proof,patch:'stage-f-final',builtAt:new Date().toISOString(),stageFStarted:true,automatedGatePassed:true,validationReport:'qa/results/stage-f-final-release-validation.json',regressionSummary:'qa/results/stage-f-final-summary.json',historicalPerformance:['qa/results/stage-f-performance.json','qa/results/stage-f-ui-performance.json','qa/results/stage-f-story-performance.json','qa/results/stage-f-movement-tail-performance.json'],files};fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const stem='LAST_BASE_0.37.1_Stage_F_Final',zip=path.join(out,stem+'_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite an existing release');
cp.execFileSync('zip',['-q','-9',zip,'-@'],{cwd:root,input:walk().join('\n')+'\n',maxBuffer:1024*1024});cp.execFileSync('unzip',['-tq',zip],{maxBuffer:1024*1024});
cp.execFileSync('python3',['-c',`import hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 m=json.loads(z.read('release_manifest.json'));names=z.namelist()
 assert len(names)==len(set(names))==len(m['files'])+1
 assert set(names)=={f['file'] for f in m['files']}|{'release_manifest.json'}
 for f in m['files']:
  b=z.read(f['file']);assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256'],f['file']
  assert b==(root/f['file']).read_bytes(),f['file']
 assert z.read('release_manifest.json')==(root/'release_manifest.json').read_bytes()
`,zip,root],{maxBuffer:1024*1024});
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,crcPassed:true,allManifestHashesPassed:true,sourceTreeEqualityPassed:true,runtimeSha256,report:path.join(out,stem+'_Report_RU.md')};fs.copyFileSync(report,result.report);const proofPath=path.join(out,stem+'_Verification.json');fs.writeFileSync(proofPath,JSON.stringify({...proof,archive:result},null,2)+'\n');fs.writeFileSync(path.join(out,stem+'_SHA256.txt'),result.sha256+'  '+path.basename(zip)+'\n');console.log(JSON.stringify({...result,verification:proofPath}));
