// Local comparison baseline. These timings are NOT browser/mobile FPS.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{performance}=require('node:perf_hooks');
const {setup}=require('./runtime.cjs'),root=path.resolve(__dirname,'..');
const target=path.resolve(process.argv[2]||path.join(root,'index.html'));
const reportFile=path.resolve(process.argv[3]||path.join(__dirname,'results/performance.json'));
process.chdir(process.env.LAST_BASE_ASSETS||path.dirname(target));
const percentile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(s.length*q))];};
const stats=a=>({samples:a.length,meanMs:a.reduce((a,b)=>a+b,0)/a.length,p50Ms:percentile(a,.5),p95Ms:percentile(a,.95),p99Ms:percentile(a,.99),maxMs:Math.max(...a)});
async function main(){
 const before=process.memoryUsage(),boot=performance.now(),r=setup(target),bootMs=performance.now()-boot,E=s=>r.eval(s);
 if(process.env.LAST_BASE_CONTROL_MODE)E(`window.GameInput?.setMode(${JSON.stringify(process.env.LAST_BASE_CONTROL_MODE)})`);
 const decodeStart=performance.now();await Promise.all([...E('(window.GameAssets?Object.values(AssetManifest.art).map(id=>GameAssets.load(id)):Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode()))'),...E('(window.GameAssets?Object.values(AssetManifest.walls).map(id=>GameAssets.load(id)):[1,2,3,4,5].map(n=>V020Walls.image(n).decode()))')]);const decodeWaitMs=performance.now()-decodeStart;
 const initial=E('JSON.stringify(captureGameProgress())'),scenes=[];
 const cases=[
  {id:'surface_day',setup:"scene='surface';player.x=800;player.y=850;V016Lighting.restore({schema:1,day:1,minute:840});"},
  {id:'surface_night_day_x',setup:"scene='surface';player.x=800;player.y=850;V09Power.running=true;V09Power.fuel=80;V016Lighting.restore({schema:1,day:10,minute:180});"},
  {id:'bunker_power_drone',setup:"scene='bunker';player.x=1264;player.y=740;V09Power.running=true;V09Power.fuel=80;V014Robots.follow();"},
  {id:'inventory_open',setup:"scene='bunker';player.x=1264;player.y=740;openOverlay(el('inventoryOverlay'));"},
  {id:'surface_zoom_out',setup:"scene='surface';player.x=800;player.y=850;V010Camera.restore({...V010Camera.capture(),zoom:.35});"}
 ];
 const selectedScenes=process.env.LAST_BASE_BENCH_SCENES?.split(',');
 for(const c of cases.filter(c=>!selectedScenes||selectedScenes.includes(c.id))){
  E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(initial)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false;playerDead=false;stopControls(true);frameScale=1;${c.setup}for(let n=0;n<32;n++)V017Monsters.population(performance.now(),true);updateCamera();`);
  // Native Canvas defers rasterization without a browser compositor. A readback
  // flushes queued drawing on every frame; otherwise RSS measures retained commands.
  for(let i=0;i<60;i++){r.advance(16.667);E('window.GameInput?.refreshAim();frameScale=1;update();draw();');r.canvas.getContext('2d').getImageData(0,0,1,1);}
  const snapshot=E('({scene,zoom:V010Camera.zoom,day:V016Lighting.day,zombies:zombies.length,liveZombies:zombies.filter(z=>z.alive).length,trees:worldTrees.length,ores:V09World.ores.length,menuOpen})');
  const update=[],draw=[],frames=[],memoryStart=process.memoryUsage(),errorsBefore=r.errors.length;
  for(let i=0;i<180;i++){r.advance(16.667);const a=performance.now();E('window.GameInput?.refreshAim();frameScale=1;update();');const b=performance.now();E('draw();');r.canvas.getContext('2d').getImageData(0,0,1,1);const end=performance.now();update.push(b-a);draw.push(end-b);frames.push(end-a);}
  scenes.push({id:c.id,scenario:snapshot,warmupFrames:60,samples:180,update:stats(update),draw:stats(draw),combined:stats(frames),rawMs:{update,draw,combined:frames},memoryStart,memoryEnd:process.memoryUsage(),lightingCache:E('V016Lighting.cacheInfo()'),consoleErrors:r.errors.slice(errorsBefore)});
  console.log(JSON.stringify({scene:c.id,p50Ms:scenes.at(-1).combined.p50Ms,p95Ms:scenes.at(-1).combined.p95Ms}));
 }
 const save=[],load=[];for(let i=0;i<20;i++){let a=performance.now();const raw=E('JSON.stringify(captureGameProgress())');save.push(performance.now()-a);a=performance.now();E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));`);load.push(performance.now()-a);}
 const report={gameVersion:'0.20.0',measuredAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,totalMemoryBytes:os.totalmem(),canvas:'@napi-rs/canvas',viewport:{width:1280,height:800,dpr:1},randomSeed:20260919,clockStepMs:16.667},startup:{javascriptAndModeledDOMMs:bootMs,remainingAssetDecodeWaitMs:decodeWaitMs,memoryBefore:before,memoryAfter:process.memoryUsage()},save:stats(save),load:stats(load),scenes,consoleErrors:r.errors,
 limitations:['NOT measured in a browser, WebView, Telegram, or physical phone. No browser FPS assertion.','Modeled DOM omits layout, paint, native touch and browser compositing. VM crossings and one-pixel raster flush are included.','Canvas2D runs in this container; timing depends on shared-host CPU load. RSS includes harness and decoded images; not mobile memory.','Warm scenarios, assets decoded; cache behavior/network startup and audio decoding are not measured.','Native browser, Telegram and phone validation is not performed by this runner.','Compare future stages on the same runner with the same seed, scenes and warmup; investigate changes, do not infer phone FPS.']};
 report.gameVersion=E('captureGameProgress().gameVersion');report.controlMode=E('window.GameInput?.mode??null');
 fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
