// Delivered 0.31.1 vs Stage B: alternating warmed samples, separate from regressions.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
(async()=>{
 const pair=[boot(path.join(__dirname,'stage-b-base')),boot(root)],rows=[];
 pair[0].r.context.fetch=async url=>{const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');}
 const saves=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 for(const [width,height,mode]of [[390,844,'MOBILE'],[1280,800,'PC']])for(const sceneName of ['quiet_surface','stress_surface','bunker_hall']){
  for(const [index,h]of pair.entries()){
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;playerDead=false;document.hidden=false;GameFlow.resume();stopControls(true);frameScale=1;window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${mode}');resizeCanvas();V010Camera.restore({...V010Camera.capture(),zoom:.65});WorldClock.restore({schema:1,day:17,minute:759});zombies=[];scene='surface';player.x=800;player.y=850;V09Power.running=true;V09Power.fuel=100;`);
   if(sceneName==='bunker_hall')h.E("scene='bunker';player.x=1210;player.y=790;");
   if(sceneName==='stress_surface')h.E("zombies=Array.from({length:200},(_,i)=>{const z=makeZombie(250+(i%20)*52,350+Math.floor(i/20)*78);if(i>=100){z.alive=false;z.hp=0;z.deathAt=Date.now();}return z;});");
   h.E('updateCamera();');
  }
  const samples=[[],[]],frames=pair.map(h=>h.E('()=>{update();GameAudioWorld.tick();draw();}'));
  for(let pass=0;pass<4;pass++)for(const index of (pass%2?[1,0]:[0,1])){
   const h=pair[index];h.E(`window.innerWidth=${width};window.innerHeight=${height};resizeCanvas();`);
   for(let n=0;n<45;n++){h.advance(16.667);const at=performance.now();frames[index]();h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=15)samples[index].push(performance.now()-at);}
  }
  const before=stats(samples[0]),after=stats(samples[1]);rows.push({viewport:width+'x'+height,scene:sceneName,before,after,deltaMs:after.p50Ms-before.p50Ms,percent:(after.p50Ms/before.p50Ms-1)*100});console.log(JSON.stringify(rows.at(-1)));
 }
 const navigation=[],commands=[],serialization=[],heaps=[];
 for(const [index,h]of pair.entries()){
  h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;playerDead=false;document.hidden=false;GameFlow.resume();scene='bunker';player.x=1120;player.y=-120;for(const d of v09Doors)d.open=1;invalidateGeometry();`);
  const nav=[],input=[];let reachable=0;
  for(const [x,y]of [[600,30],[590,510],[650,1050],[1870,90],[1870,510],[1870,1010],[1260,1460],[2034,195]])for(let n=0;n<10;n++){const at=performance.now(),p=h.E(`findWalkPath(1120,-120,{id:'ground',kind:'ground',x:${x+n*.07},y:${y},r:0,range:1},'bunker',15)`);nav.push(performance.now()-at);if(p?.length)reachable++;}
  navigation.push({version:index?'0.32.0':'0.31.1',reachable,...stats(nav)});
  const inputFn=h.E("()=>GameActions.dispatch('MOVE',{kind:'vector',x:1,y:0,power:.4})");for(let n=0;n<500;n++){const at=performance.now();inputFn();if(n>=100)input.push(performance.now()-at);}commands.push({version:index?'0.32.0':'0.31.1',...stats(input)});
  const serialize=h.E('()=>JSON.stringify(captureGameProgress())'),times=[];let raw;
  global.gc?.();const beforeHeap=process.memoryUsage().heapUsed;
  for(let n=0;n<100;n++){const at=performance.now();raw=serialize();times.push(performance.now()-at);}
  const transientHeap=process.memoryUsage().heapUsed-beforeHeap;global.gc?.();const retainedHeap=process.memoryUsage().heapUsed-beforeHeap;
  serialization.push({version:index?'0.32.0':'0.31.1',characters:raw.length,utf8Bytes:Buffer.byteLength(raw),...stats(times)});heaps.push({version:index?'0.32.0':'0.31.1',snapshots:100,transientHeapDeltaBytes:transientHeap,postGcHeapDeltaBytes:retainedHeap,gcAvailable:!!global.gc});
 }
 const after=pair[1];after.E("stopControls(true);scene='bunker';player.x=1210;player.y=700;V09Power.running=true;GameCampaign.refresh(true);");
 const closed=[],opened=[],refresh=after.E('()=>GameCampaign.tick(250)');
 for(const [which,out]of [['closed',closed],['open',opened]]){if(which==='open')after.E('CommandCoreUI.show()');for(let n=0;n<500;n++){const at=performance.now();refresh();if(n>=100)out.push(performance.now()-at);}}
 const report={version:'0.32.0',baseline:'immutable delivered Stage A Corrective 0.31.1',environment:{node:process.version,cpu:os.cpus()[0]?.model,mode:'Modeled DOM/WebAudio, native Canvas2D, DPR 1, zoom .65, 120 measured frames per scene/version'},rows,navigation,commands,serialization,heaps,campaignPoll:{closed:stats(closed),open:stats(opened)},errors:pair.flatMap(h=>h.r.errors),limitations:['These are CPU measurements on a shared host, not phone/browser FPS, GPU time or physical touch latency.','Command dispatch timings exclude OS/browser event delivery. Navigation timings are complete path queries; existing incremental routing is covered by regression tests.','Heap deltas include harness and serialization allocations; post-GC values are not a browser/device memory budget.']};
 fs.writeFileSync('qa/results/stage-b-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.errors.length||navigation.some(n=>n.reachable!==80))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
