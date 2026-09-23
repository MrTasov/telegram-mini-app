// Real Canvas2D, unchanged Audio Pass vs R1. Run separately from the suite.
// CPU timings on this host are not mobile GPU/FPS or browser performance claims.
const fs=require('fs'),path=require('path'),os=require('os'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
(async()=>{
 const selected=process.env.LAST_BASE_PERF_SCENES?.split(',');
 const prior=selected&&fs.existsSync('qa/results/bunker-performance.json')?JSON.parse(fs.readFileSync('qa/results/bunker-performance.json')):null;
 const pair=[boot(path.join(__dirname,'bunker-base')),boot(root)],rows=[];
 pair[0].r.context.fetch=async url=>{const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');}
 const saves=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 for(const [width,height,mode]of [[390,844,'MOBILE'],[1280,800,'PC']])for(const name of ['quiet_surface','bunker_hall','bunker_energy']){
  if(selected&&!selected.includes(name))continue;
  for(const [index,h]of pair.entries()){
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;playerDead=false;document.hidden=false;GameFlow.resume();stopControls(true);frameScale=1;window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${mode}');resizeCanvas();V010Camera.restore({...V010Camera.capture(),zoom:.65});V016Lighting.restore({schema:1,day:17,minute:759});zombies=[];scene='surface';player.x=800;player.y=850;`);
   if(name==='bunker_hall')h.E(`scene='bunker';player.x=${index?1210:725};player.y=790;V09Power.running=true;V09Power.fuel=100;`);
   if(name==='bunker_energy')h.E(`scene='bunker';player.x=${index?2070:1100};player.y=${index?90:590};V09Power.running=true;V09Power.fuel=100;Object.assign(V014Robots.state,V014Robots.dockPosition(),{scene:'bunker',packed:false,hp:100,battery:25,task:'docked'});`);
   h.E('updateCamera();');
  }
  const measured=[[],[]],frames=pair.map(h=>h.E('()=>{update();GameAudioWorld.tick();draw();}'));
  for(let pass=0;pass<6;pass++)for(const index of (pass%2?[1,0]:[0,1])){
   const h=pair[index];h.E(`window.innerWidth=${width};window.innerHeight=${height};resizeCanvas();`);
   for(let n=0;n<45;n++){h.advance(16.667);const at=performance.now();frames[index]();h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=15)measured[index].push(performance.now()-at);}
  }
  const before=stats(measured[0]),after=stats(measured[1]);rows.push({viewport:width+'x'+height,scene:name,before,after,p50DeltaMs:after.p50Ms-before.p50Ms,p50Percent:(after.p50Ms/before.p50Ms-1)*100});
 }
 if(prior)rows.push(...prior.rows.filter(r=>!selected.includes(r.scene)));
 const after=pair[1],nav=prior?prior.navigation:[];after.E("scene='bunker';for(const d of v09Doors)d.open=1;invalidateGeometry();");
 if(!prior)for(const [x,y]of [[400,30],[390,510],[450,1050],[2070,90],[2070,510],[2070,1010],[1260,1460],[2234,195]]){
  const samples=[];let reachable=0;for(let n=0;n<20;n++){const at=performance.now();const p=after.E(`findWalkPath(1070,-120,{id:'ground',kind:'ground',x:${x+n*.07},y:${y},r:0,range:1},'bunker',15)`);samples.push(performance.now()-at);if(p?.length)reachable++;}nav.push({to:{x,y},reachable,...stats(samples)});
 }
 const report={patch:'bunker-level1-rework-r1',environment:{node:process.version,cpu:os.cpus()[0]?.model,dpr:1,zoom:.65,mode:'Alternating warmed update + audio observer + real Canvas2D draw, 180 measured frames per scene/version'},baseline:'Immutable LAST_BASE_0.29.0_Audio_Pass_Recovery_1',reusedUnchangedSurfaceAndNavigation:!!prior,rows,navigation:nav,errors:pair.flatMap(h=>h.r.errors),floorCache:after.J('V011Rooms.floorCacheInfo()'),additionalImage:{path:'assets/images/props/command_core.png',compressedBytes:fs.statSync('assets/images/props/command_core.png').size,width:1422,height:1106,decodedRgbaBytes:1422*1106*4},limitations:['Modeled DOM/WebAudio; no physical browser, WebView, phone GPU or subjective audio measurement.','Room cameras compare corresponding relocated rooms. New hall intentionally includes the additional Command Core. Shared-host p95 includes scheduling noise.','Navigation queries use open doors; closed-door behavior is covered separately by player and drone integration tests.']};
 fs.writeFileSync('qa/results/bunker-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||nav.some(n=>n.reachable!==20))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
