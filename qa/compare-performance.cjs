// Sequential, alternating local benchmarks. Do not run with the regression suite.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');process.chdir(root);const env={...process.env,LAST_BASE_ASSETS:root,LAST_BASE_CONTROL_MODE:'MOBILE',LAST_BASE_TEST_LANGUAGE:'en'};
const before='qa/stage4-fixed/index.html',after='index.html',out='qa/results';
function run(script,args){const r=cp.spawnSync(process.execPath,[script,...args],{cwd:root,env,encoding:'utf8',timeout:240000,maxBuffer:4e6});if(r.stdout)process.stdout.write(r.stdout);if(r.status!==0)throw Error(r.stderr||'Benchmark failed');}
const loading={before:[],after:[]};
for(let round=0;round<3;round++)for(const side of round%2?['after','before']:['before','after']){
 const file=`${out}/stage5-loading-${side}-${round+1}.json`;run('qa/resource-startup.cjs',[side==='before'?before:after,file]);loading[side].push(JSON.parse(fs.readFileSync(file)));
}
for(const [side,file]of [['before',before],['after',after]])run('qa/performance.cjs',[file,`${out}/stage5-performance-${side}.json`]);
const base=JSON.parse(fs.readFileSync(`${out}/stage5-performance-before.json`)),candidate=JSON.parse(fs.readFileSync(`${out}/stage5-performance-after.json`));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)],pct=(a,b)=>(b/a-1)*100;
const scenes=base.scenes.map((a,i)=>{const b=candidate.scenes[i];return {id:a.id,beforeP50Ms:a.combined.p50Ms,afterP50Ms:b.combined.p50Ms,p50ChangePercent:pct(a.combined.p50Ms,b.combined.p50Ms),beforeP95Ms:a.combined.p95Ms,afterP95Ms:b.combined.p95Ms,p95ChangePercent:pct(a.combined.p95Ms,b.combined.p95Ms)};});
const bundles={};for(const [side,file]of [['before','qa/stage4-fixed/js/game.js'],['after','js/game.js']]){const bytes=fs.readFileSync(file);bundles[side]={bytes:bytes.length,gzipBytes:zlib.gzipSync(bytes).length};}
const result={reference:'0.24.1',candidate:require('../package.json').version,scenes,loading:Object.fromEntries(Object.entries(loading).map(([side,rows])=>[side,{medianBootMs:median(rows.map(r=>r.totalLocalBootAndDecodeMs)),medianHeapGrowthBytes:median(rows.map(r=>r.memoryAfter.heapUsed-r.memoryBefore.heapUsed)),medianRSSGrowthBytes:median(rows.map(r=>r.memoryAfter.rss-r.memoryBefore.rss)),canvasRequests:rows.map(r=>r.canvas.requested),decodedRGBABytes:rows[0].canvas.estimatedRGBABytes,compressedImageBytes:rows[0].uniqueCanvasAndDOMCompressedBytes,uniqueImages:rows[0].uniqueCanvasAndDOMResources}])),bundles,errors:[...base.consoleErrors,...candidate.consoleErrors,...Object.values(loading).flatMap(rs=>rs.flatMap(r=>r.consoleErrors))],limitations:base.limitations,method:'Three alternating cold processes per build; warm five-scene benchmark, 60 warmup + 180 measured frames, sequential baseline then candidate. Local Canvas2D and modeled DOM, not phone FPS.'};
fs.writeFileSync(`${out}/stage5-performance-comparison.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
