// Focused release pass requested for 0.37.1; never impersonates a full pass.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex');
const runtimeSha256=hash(),runs=[],startedAt=new Date().toISOString();
const jobs=[
 ['build','tools/build.cjs',['--check'],null],
 ['verification','qa/verify.cjs',[],'verification.json'],
 ['stage-f','qa/stage-f.cjs',[],'stage-f.json'],
 ['stage-f-final','qa/stage-f-final.cjs',[],'stage-f-final.json'],
 ['state-saves','qa/state-saves.cjs',[],'state-saves.json'],
 ['main-menu','qa/main-menu.cjs',[],'main-menu.json'],
 ['stage-e-audio-corrective','qa/stage-e-audio-corrective.cjs',[],'stage-e-audio-corrective.json'],
 ['stage-e-corrective','qa/stage-e-corrective.cjs',[],'stage-e-corrective.json']
];
for(const [id,file,args,reportFile]of jobs){
 const start=Date.now();console.log('Checking '+id);
 const result=cp.spawnSync(process.execPath,[file,...args],{cwd:root,env:{...process.env,LAST_BASE_ASSETS:root,LAST_BASE_TEST_LANGUAGE:'ru'},encoding:'utf8',timeout:300000,maxBuffer:8e6,stdio:['ignore','pipe','pipe']});
 const log='qa/results/stage-f-final-check-'+id+'.log';fs.writeFileSync(log,(result.stdout||'')+'\n'+(result.stderr||''));
 const report=reportFile&&fs.existsSync('qa/results/'+reportFile)?JSON.parse(fs.readFileSync('qa/results/'+reportFile)):null;
 const passed=result.status===0&&(!reportFile||report&&report.failed===0&&(!report.runtimeSha256||report.runtimeSha256===runtimeSha256))&&hash()===runtimeSha256;
 const row={id,runtimeSha256,exitCode:result.status,passed,checks:report?.passed||0,failedChecks:report?.failed||0,elapsedMs:Date.now()-start,log,report:reportFile?'qa/results/'+reportFile:null,error:result.error?.message};runs.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync('qa/results/stage-f-final-checkpoint.json',JSON.stringify({complete:false,startedAt,runtimeSha256,runs},null,2)+'\n');
}
const summary={version:require('../package.json').version,scope:'targeted-final-two-changes',startedAt,finishedAt:new Date().toISOString(),runtimeSha256,runtimeUnchanged:hash()===runtimeSha256,complete:true,passed:runs.every(r=>r.passed)&&hash()===runtimeSha256,groups:runs.length,checks:runs.reduce((n,r)=>n+r.checks,0),failedChecks:runs.reduce((n,r)=>n+r.failedChecks,0),runs,fullRegressionRepeated:false,performanceRepeated:false,limitations:['Modeled DOM/HTMLVideoElement/WebAudio; no native browser, physical phone, Telegram playback or listening certification.']};
fs.writeFileSync('qa/results/stage-f-final-summary.json',JSON.stringify(summary,null,2)+'\n');fs.writeFileSync('qa/results/stage-f-final-checkpoint.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({passed:summary.passed,groups:summary.groups,checks:summary.checks,failedChecks:summary.failedChecks}));if(!summary.passed)process.exitCode=1;
