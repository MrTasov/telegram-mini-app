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
 ['localization-controls','qa/localization-controls.cjs',[]]
],runs=[];
for(const [id,file,args]of jobs){
 console.log('Running '+id+'…');const start=Date.now();
 const r=cp.spawnSync(process.execPath,[path.join(root,file),...args],{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:8e6});
 fs.writeFileSync(path.join(out,id+'.log'),r.stdout+'\n'+r.stderr);if(r.stdout)console.log(r.stdout.trim());if(r.stderr)console.error(r.stderr.trim());
 runs.push({id,exitCode:r.status,elapsedMs:Date.now()-start,error:r.error?.message});
}
const read=file=>fs.existsSync(path.join(out,file))?JSON.parse(fs.readFileSync(path.join(out,file))):null;
const reports=[read('verification.json'),read('regression/summary.json'),read('interactions.json'),read('saves.json'),read('balance.json'),read('state-saves.json'),read('differential.json'),read('systems.json'),read('stage3-differential.json'),read('controls.json'),read('controls-differential.json'),read('assets.json'),read('asset-rendering.json'),read('stage4-differential.json'),read('map-workbar.json'),read('localization.json'),read('localization-rendering.json'),read('localization-controls.json')];
const summary={version:require('../package.json').version,stage:5,stage6Started:false,passed:runs.every(r=>r.exitCode===0)&&reports.every(r=>r&&!r.failed),automatedAssertions:reports.reduce((n,r)=>n+(r?.passed||0),0),originalBaselineAssertions:477,runs,limitations:['VM with modeled DOM and real Canvas2D. No native browser/WebView/phone result is implied.','Seven optional audio assets were already absent in Stage 0; absent sounds are not requested.']};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
