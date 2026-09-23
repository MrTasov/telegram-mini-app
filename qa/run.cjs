const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'results');fs.mkdirSync(out,{recursive:true});
const env={...process.env,LAST_BASE_TEST_LANGUAGE:process.env.LAST_BASE_TEST_LANGUAGE||'ru',LAST_BASE_ASSETS:root,LAST_BASE_BASELINE:path.join(__dirname,'stage0'),NODE_PATH:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,path.join(root,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)};
const jobs=[
 ['build','tools/build.cjs',['--check']],
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
 ['bunker-floor-cache','qa/bunker-floor-cache.cjs',[]]
],runs=[];
async function run(index){
 const [id,file,args]=jobs[index];
 if(process.env.LAST_BASE_TEST_FILTER&&!process.env.LAST_BASE_TEST_FILTER.split(',').includes(id)){const old=fs.existsSync(path.join(out,'summary.json'))?JSON.parse(fs.readFileSync(path.join(out,'summary.json'))):null;runs[index]=old?.runs?.find(r=>r.id===id)||{id,exitCode:1,error:'No previous result for skipped group'};return;}
 console.log('Running '+id+'…');const start=Date.now();
 const r=await new Promise(resolve=>cp.execFile(process.execPath,[path.join(root,file),...args],{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:8e6},(error,stdout,stderr)=>resolve({status:error?(typeof error.code==='number'?error.code:1):0,stdout,stderr,error})));
 fs.writeFileSync(path.join(out,id+'.log'),r.stdout+'\n'+r.stderr);if(r.stdout)console.log(r.stdout.trim());if(r.stderr)console.error(r.stderr.trim());
 runs[index]={id,exitCode:r.status,elapsedMs:Date.now()-start,error:r.error?.message};
}
(async()=>{
 // Independent suites own separate report files. Default remains serial; CI
 // may opt into a small process pool. Performance measurements run separately.
 const concurrency=Math.max(1,Math.min(3,Number(process.env.LAST_BASE_TEST_JOBS)||1));let next=0;
 await Promise.all(Array.from({length:concurrency},async()=>{while(next<jobs.length)await run(next++);}));
const read=file=>fs.existsSync(path.join(out,file))?JSON.parse(fs.readFileSync(path.join(out,file))):null;
const reports=[read('verification.json'),read('regression/summary.json'),read('interactions.json'),read('saves.json'),read('balance.json'),read('state-saves.json'),read('differential.json'),read('systems.json'),read('stage3-differential.json'),read('controls.json'),read('controls-differential.json'),read('assets.json'),read('asset-rendering.json'),read('stage4-differential.json'),read('map-workbar.json'),read('localization.json'),read('localization-rendering.json'),read('localization-controls.json'),read('main-menu.json')];
reports.push(read('menu-preferences.json'),read('world-events.json'),read('readiness.json'),read('corrective.json'),read('world-farm.json'),read('drone-return.json'),read('resource-access.json'),read('character-animation.json'),read('master-unarmed.json'),read('equipment-integration.json'),read('player-visual-fix.json'),read('corrective-performance.json'),read('corrective-visuals.json'),read('polish.json'),read('polish-visuals.json'),read('audio-unlock.json'),read('hud-display.json'));
reports.push(read('audio-pass.json'),read('bunker-level1.json'),read('bunker-floor-cache.json'));
const summary={version:require('../package.json').version,stage:7,patch:"bunker-level1-rework-r1",stageAStarted:false,level2Started:false,passed:runs.every(r=>r.exitCode===0)&&reports.every(r=>r&&!r.failed),automatedAssertions:reports.reduce((n,r)=>n+(r?.passed||0),0),historicalBaselineAssertions:477,ladderContractChanged:true,runs,limitations:['VM with modeled DOM, modeled WebAudio lifecycle and real Canvas2D. No native browser/WebView/phone result is implied.','All audio paths are included and decoded; subjective mix requires physical device listening.']};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
