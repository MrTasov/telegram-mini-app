// Run after regressions, with no concurrent tests. Local VM/Canvas timings only.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');process.chdir(root);
const out='qa/results',before='qa/pre-stage7/index.html',after='index.html';
function run(script,args,mode='MOBILE',gc=false){
 const result=cp.spawnSync(process.execPath,[...(gc?['--expose-gc']:[]),script,...args],{cwd:root,encoding:'utf8',timeout:300000,maxBuffer:2e6,
  env:{...process.env,LAST_BASE_ASSETS:root,LAST_BASE_TEST_LANGUAGE:'en',LAST_BASE_CONTROL_MODE:mode}});
 if(result.stdout)process.stdout.write(result.stdout);if(result.status!==0)throw Error(result.stderr||'Benchmark failed');
 return JSON.parse(fs.readFileSync(args.at(-1),'utf8'));
}
const paired={};
for(const mode of ['MOBILE','PC']){
 const prior=run('qa/performance.cjs',[before,`${out}/performance-stage7-before-${mode.toLowerCase()}.json`],mode);
 const current=run('qa/performance.cjs',[after,`${out}/performance-stage7-after-${mode.toLowerCase()}.json`],mode);
 paired[mode]={before:prior,after:current};
}
const loading={before:[],after:[]};
for(let i=0;i<3;i++)for(const side of i%2?['after','before']:['before','after'])loading[side].push(run('qa/resource-startup.cjs',[side==='before'?before:after,`${out}/stage7-loading-${side}-${i+1}.json`]));
const memory={accepted:[],before:[],after:[]},targets={accepted:'qa/pre-stage6/index.html',before,after};
for(let i=0;i<3;i++)for(const side of i%2?['after','before','accepted']:['accepted','before','after'])memory[side].push(run('qa/localization-memory.cjs',[targets[side],`${out}/stage7-memory-${side}-${i+1}.json`],'MOBILE',true));
const pct=(a,b)=>100*(b/a-1),median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
const modes=Object.fromEntries(Object.entries(paired).map(([mode,{before:a,after:b}])=>[mode,{
 scenes:a.scenes.map((s,i)=>{const t=b.scenes[i];return {id:s.id,beforeP50Ms:s.combined.p50Ms,afterP50Ms:t.combined.p50Ms,p50Percent:pct(s.combined.p50Ms,t.combined.p50Ms),beforeP95Ms:s.combined.p95Ms,afterP95Ms:t.combined.p95Ms,p95Percent:pct(s.combined.p95Ms,t.combined.p95Ms),beforeUpdateP50Ms:s.update.p50Ms,afterUpdateP50Ms:t.update.p50Ms,beforeHeapBytes:s.memoryEnd.heapUsed,afterHeapBytes:t.memoryEnd.heapUsed,beforeRSSBytes:s.memoryEnd.rss,afterRSSBytes:t.memoryEnd.rss};}),
 save:{beforeMs:a.save.p50Ms,afterMs:b.save.p50Ms},load:{beforeMs:a.load.p50Ms,afterMs:b.load.p50Ms},consoleErrors:[...a.consoleErrors,...b.consoleErrors]
}]));
const bundles={};for(const [key,file]of [['accepted','qa/pre-stage6/js/game.js'],['stage6','qa/pre-stage7/js/game.js'],['stage7','js/game.js']]){const bytes=fs.readFileSync(file);bundles[key]={bytes:bytes.length,gzipBytes:zlib.gzipSync(bytes).length};}
const result={reference:'0.26.0 verified Stage 6; accepted 0.25.3 raw baseline also retained',candidate:require('../package.json').version,modes,
 loading:Object.fromEntries(Object.entries(loading).map(([side,rows])=>[side,{medianBootMs:median(rows.map(r=>r.totalLocalBootAndDecodeMs)),medianHeapGrowthBytes:median(rows.map(r=>r.memoryAfter.heapUsed-r.memoryBefore.heapUsed)),medianRSSGrowthBytes:median(rows.map(r=>r.memoryAfter.rss-r.memoryBefore.rss)),canvasRequests:rows.map(r=>r.canvas.requested),decodedRGBABytes:rows[0].canvas.estimatedRGBABytes,uniqueImageBytes:rows[0].uniqueCanvasAndDOMCompressedBytes,uniqueImages:rows[0].uniqueCanvasAndDOMResources}])),bundles,
 retainedMemory:Object.fromEntries(Object.entries(memory).map(([side,rows])=>[side,{medianHeapGrowthBytes:median(rows.map(r=>r.heapGrowthBytes)),medianRSSGrowthBytes:median(rows.map(r=>r.rssGrowthBytes)),samples:rows.length}])),
 consoleErrors:[...Object.values(modes).flatMap(m=>m.consoleErrors),...Object.values(loading).flatMap(rows=>rows.flatMap(r=>r.consoleErrors)),...Object.values(memory).flatMap(rows=>rows.flatMap(r=>r.consoleErrors))],
 method:'Four fresh processes, sequential before/after for MOBILE and PC; five scenes each, 60 warmup + 180 measured frames. Three alternating cold startup processes per build. Same seed, native Canvas raster readback and modeled DOM.',
 limitations:paired.MOBILE.before.limitations};
fs.writeFileSync(`${out}/performance-stage7-comparison.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({modes,loading:result.loading,retainedMemory:result.retainedMemory,bundles,consoleErrors:result.consoleErrors},null,2));
if(result.consoleErrors.length)process.exitCode=1;
