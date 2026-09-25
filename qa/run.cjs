const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const hash=()=>require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../js/game.js'))).digest('hex'),runtimeSha256=hash();
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'results');fs.mkdirSync(out,{recursive:true});
const env={...process.env,LAST_BASE_TEST_LANGUAGE:process.env.LAST_BASE_TEST_LANGUAGE||'ru',LAST_BASE_ASSETS:root,LAST_BASE_BASELINE:path.join(__dirname,'stage0'),NODE_PATH:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,path.join(root,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)};
// Persist actual completed child results so an interrupted host session does
// not erase the provenance of the pass. The release still requires all groups.
const checkpoint=path.join(out,'run-checkpoint.json');
const jobs=[
 ['perf-visuals','qa/perf-visuals.cjs',[]],
 ['perf-corrective','qa/perf-corrective-tests.cjs',[]],
 ['perf-equivalence','qa/perf-equivalence.cjs',[]],
 ['dev-qa','qa/dev-qa.cjs',[]],
 ['stage-h-corrective','qa/stage-h-corrective.cjs',[]],
 ['stage-i1','qa/stage-i1.cjs',[]],
 ['stage-h','qa/stage-h.cjs',[]],
 ['stage-h-visuals','qa/stage-h-visuals.cjs',[]],
 ['stage-h-prerequisites','qa/stage-h-prerequisites.cjs',[]],
 ['stage-g','qa/stage-g.cjs',[]],
 ['stage-g-routes','qa/stage-g-routes.cjs',[]],
 ['stage-f','qa/stage-f.cjs',[]],
 ['stage-f-final','qa/stage-f-final.cjs',[]],
 ['stage-e-corrective','qa/stage-e-corrective.cjs',[]],
 ['stage-e-audio-corrective','qa/stage-e-audio-corrective.cjs',[]],
 ['stage-e','qa/stage-e.cjs',[]],
 ['stage-d-complete','qa/stage-d-complete.cjs',[]],
 ['stage-d-corrective','qa/stage-d-corrective.cjs',[]],
 ['stage-d','qa/stage-d.cjs',[]],
 ['stage-d-repair','qa/stage-d-repair.cjs',[]],
 ['stage-d-visuals','qa/stage-d-visuals.cjs',[]],
 ['stage-c2','qa/stage-c2.cjs',[]],
 ['stage-c2-prerequisites','qa/stage-c2-prerequisites.cjs',[]],
 ['stage-c1-light-modules','qa/stage-c1-light-modules.cjs',[]],
 ['stage-c1-recovery','qa/stage-c1-recovery.cjs',[]],
 ['build','tools/build.cjs',['--check']],
 ['stage-ab-corrective','qa/stage-ab-corrective.cjs',[]],
 ['stage-ab-light-audio','qa/stage-ab-light-audio.cjs',[]],
 ['stage-b','qa/stage-b.cjs',[]],
 ['campaign','qa/campaign.cjs',[]],
 ['stage-a-corrective','qa/stage-a-corrective.cjs',[]],
 ['verification','qa/verify.cjs',[]],
 ['regressions','qa/run-regressions.cjs',[path.join(root,'index.html'),path.join(out,'regression')]],
 ['interactions','qa/interactions.cjs',[path.join(root,'index.html'),path.join(out,'interactions.json')]],
 ['saves','qa/saves.cjs',[]],
 ['balance','qa/balance.cjs',[]],
 ['state-saves','qa/state-saves.cjs',[]],
 ['differential','qa/differential.cjs',[]],
 ['systems','qa/systems.cjs',['4']],
 ['stage3-differential','qa/stage3-differential.cjs',[]],
 ['controls','qa/controls.cjs',[]],
 ['controls-differential','qa/controls-differential.cjs',[]],
 ['assets','qa/assets.cjs',[]],
 ['asset-rendering','qa/asset-rendering.cjs',[]],
 ['stage4-differential','qa/stage4-differential.cjs',[]],
 ['map-workbar','qa/map-workbar.cjs',[]],
 ['localization','qa/localization.cjs',[]],
 ['localization-rendering','qa/localization-rendering.cjs',[]],
 ['localization-controls','qa/localization-controls.cjs',[]],
 ['main-menu','qa/main-menu.cjs',[]],
 ['menu-preferences','qa/menu-preferences.cjs',[]],
 ['world-events','qa/world-events.cjs',[]],
 ['readiness','qa/readiness.cjs',[]],
 ['corrective','qa/corrective.cjs',[]],
 ['world-farm','qa/world-farm.cjs',[]],
 ['drone-return','qa/drone-return.cjs',[]],
 ['resource-access','qa/resource-access.cjs',[]],
 ['character-animation','qa/character-animation.cjs',[]],
 ['master-unarmed','qa/master-unarmed.cjs',[]],
 ['equipment-integration','qa/equipment-integration.cjs',[]],
 ['player-visual-fix','qa/player-visual-fix.cjs',[]],
 ['corrective-performance','qa/corrective-performance.cjs',[]],
 ['corrective-visuals','qa/corrective-visuals.cjs',[]],
 ['polish','qa/polish.cjs',[]],
 ['polish-visuals','qa/polish-visuals.cjs',[]],
 ['audio-unlock','qa/audio-unlock.cjs',['.','qa/results/audio-unlock.json']],
 ['hud-display','qa/hud-display.cjs',[]],
 ['audio-pass','qa/audio-pass.cjs',[]],
 ['bunker-level1','qa/bunker-level1.cjs',[]],
 ['bunker-floor-cache','qa/bunker-floor-cache.cjs',[]],
 ['bunker-r2','qa/bunker-r2.cjs',[]]
],runs=[];
// Retry only failed children of a completed full pass, on the very same
// runtime. Successful actual exit results retain their original provenance.
const retry=process.env.LAST_BASE_TEST_RETRY?JSON.parse(fs.readFileSync(checkpoint)):null;
if(retry&&(!retry.complete||retry.filtered||!retry.runtimeUnchanged||retry.runtimeSha256!==runtimeSha256||retry.runs.length!==jobs.length||retry.runs.some((r,i)=>r.id!==jobs[i][0]||r.runtimeSha256!==runtimeSha256)))throw Error('Cannot retry an incomplete, filtered or different-runtime pass');
async function run(index){
 const [id,file,args]=jobs[index];
 if(retry&&retry.runs[index].exitCode===0){runs[index]=retry.runs[index];return;}
 if(process.env.LAST_BASE_TEST_FILTER&&!process.env.LAST_BASE_TEST_FILTER.split(',').includes(id)){const old=fs.existsSync(path.join(out,'summary.json'))?JSON.parse(fs.readFileSync(path.join(out,'summary.json'))):null;runs[index]=old?.runs?.find(r=>r.id===id)||{id,exitCode:1,error:'No previous result for skipped group'};return;}
 console.log('Running '+id+'…');const start=Date.now();
 // Explicitly close child stdin. Serial CI also has a synchronous path, so a
 // lost asynchronous child-close notification cannot stall the entire gate.
 const options={cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:8e6,stdio:['ignore','pipe','pipe']};
 const r=process.env.LAST_BASE_TEST_JOBS==='1'?cp.spawnSync(process.execPath,[path.join(root,file),...args],options):await new Promise(resolve=>cp.execFile(process.execPath,[path.join(root,file),...args],options,(error,stdout,stderr)=>resolve({status:error?(typeof error.code==='number'?error.code:1):0,stdout,stderr,error})));
 fs.writeFileSync(path.join(out,id+'.log'),r.stdout+'\n'+r.stderr);if(r.stdout)console.log(r.stdout.trim());if(r.stderr)console.error(r.stderr.trim());
 runs[index]={id,runtimeSha256,exitCode:r.status,elapsedMs:Date.now()-start,error:r.error?.message};
 fs.writeFileSync(checkpoint,JSON.stringify({runtimeSha256,version:require('../package.json').version,complete:false,runs:runs.filter(Boolean)},null,2)+'\n');
}
(async()=>{
 // Independent suites own separate report files. Default remains serial; CI
 // may opt into a small process pool. Performance measurements run separately.
 const concurrency=Math.max(1,Math.min(3,Number(process.env.LAST_BASE_TEST_JOBS)||1));let next=0;
 await Promise.all(Array.from({length:concurrency},async()=>{while(next<jobs.length)await run(next++);}));
const read=file=>fs.existsSync(path.join(out,file))?JSON.parse(fs.readFileSync(path.join(out,file))):null;
const reports=[read('perf-visuals.json'),read('perf-corrective-tests.json'),read('perf-equivalence.json'),read('dev-qa.json'),read('stage-i1.json'),read('stage-h-corrective.json'),read('stage-h.json'),read('stage-h-prerequisites.json'),read('stage-h-visuals.json'),read('stage-g.json'),read('stage-g-routes.json'),read('stage-f-final.json'),read('stage-f.json'),read('stage-e-corrective.json'),read('stage-e-audio-corrective.json'),read('stage-e.json'),read('stage-d-complete.json'),read('stage-d-corrective.json'),read('stage-d.json'),read('stage-d-repair.json'),read('stage-d-visuals.json'),read('stage-c2.json'),read('stage-c2-prerequisites.json'),read('stage-c1-light-modules.json'),read('stage-c1-recovery.json'),read('stage-a-corrective.json'),read('campaign.json'),read('verification.json'),read('regression/summary.json'),read('interactions.json'),read('saves.json'),read('balance.json'),read('state-saves.json'),read('differential.json'),read('systems.json'),read('stage3-differential.json'),read('controls.json'),read('controls-differential.json'),read('assets.json'),read('asset-rendering.json'),read('stage4-differential.json'),read('map-workbar.json'),read('localization.json'),read('localization-rendering.json'),read('localization-controls.json'),read('main-menu.json')];
reports.push(read('menu-preferences.json'),read('world-events.json'),read('readiness.json'),read('corrective.json'),read('world-farm.json'),read('drone-return.json'),read('resource-access.json'),read('character-animation.json'),read('master-unarmed.json'),read('equipment-integration.json'),read('player-visual-fix.json'),read('corrective-performance.json'),read('corrective-visuals.json'),read('polish.json'),read('polish-visuals.json'),read('audio-unlock.json'),read('hud-display.json'));
reports.push(read('audio-pass.json'),read('bunker-level1.json'),read('bunker-floor-cache.json'),read('bunker-r2.json'),read('stage-b.json'));
reports.push(read('stage-ab-corrective.json'),read('stage-ab-light-audio.json'));
const summary={runtimeSha256,runtimeUnchanged:runtimeSha256===hash(),version:require('../package.json').version,stage:9,patch:"performance-gameplay-corrective",stageAStarted:true,stageAStatus:"accepted-in-general",stageBStarted:true,stageBStatus:"accepted-in-general",stageC1Started:true,stageC1Status:"accepted-by-user",stageC2Started:true,stageDStarted:true,stageEStarted:true,stageFStarted:true,stageGStarted:true,stageHStarted:true,stageI1Started:true,stageI2Started:false,level2Started:false,passed:runtimeSha256===hash()&&runs.every(r=>r.exitCode===0)&&reports.every(r=>r&&!r.failed),automatedAssertions:reports.reduce((n,r)=>n+(r?.passed||0),0),historicalBaselineAssertions:477,ladderContractChanged:true,filtered:!!process.env.LAST_BASE_TEST_FILTER,runs,limitations:['VM with modeled DOM, modeled WebAudio lifecycle and real Canvas2D. No native browser/WebView/phone result is implied.','All audio paths are included and decoded; subjective mix requires physical device listening.']};
if(retry)summary.retriedGroups=retry.runs.filter(r=>r.exitCode!==0).map(r=>r.id);
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
fs.writeFileSync(checkpoint,JSON.stringify({...summary,complete:true},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
