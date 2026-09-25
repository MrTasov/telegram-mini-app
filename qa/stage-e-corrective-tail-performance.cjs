// Targeted repeat for the observed p95 variance; preserve the first full benchmark.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
(async()=>{
const runtimeSha256=require('node:crypto').createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex');
 const pair=[boot(path.join(__dirname,'stage-e-corrective-base'),{beforeScripts:s=>{s.fetch=async url=>{const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};}}),boot(root)],rows=[];
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');}
 for(const h of pair)assert.equal(h.E('GameAudio.inspect().buffers'),57,'both immutable baseline and current runtime preload all original audio buffers');
 const saves=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 for(const [width,height,mode,sceneName]of [[390,844,'MOBILE','bunker_moving_lights'],[1280,800,'PC','bunker_moving_lights'],[1280,800,'PC','bunker_door_spill']]){
  if(rows.some(r=>r.viewport===width+'x'+height&&r.scene===sceneName))continue;
  const moving=sceneName.endsWith('lights'),outside=sceneName==='night_combined_lights';
  for(const [index,h]of pair.entries()){
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;playerDead=false;document.hidden=false;GameFlow.resume();stopControls(true);frameScale=1;window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${mode}');resizeCanvas();V010Camera.restore({...V010Camera.capture(),zoom:.65});WorldClock.restore({schema:1,day:1,minute:759});zombies=[];scene='surface';player.x=800;player.y=850;V09Power.running=true;V09Power.fuel=100;V014Robots.state.packed=true;activeHandSlot=null;`);
   if(sceneName.startsWith('bunker'))h.E("scene='bunker';player.x=1210;player.y=790;");
   if(sceneName==='stress_surface')h.E("zombies=Array.from({length:200},(_,i)=>{const z=makeZombie(250+(i%20)*52,350+Math.floor(i/20)*78);if(i>=100){z.alive=false;z.hp=0;z.deathAt=Date.now();}return z;});");
   if(sceneName==='bunker_door_spill')h.E("V09Power.devices.light_workshop.enabled=false;V09Power.devices.light_storage.enabled=false;for(const d of v09Doors)d.open=1;");
   if(moving){
    h.E("equipment.head={type:'head_mount',qty:1};addItem('flashlight',1);var qaBenchLight=bag.find(i=>i?.type==='flashlight');V010Combat.ensure(qaBenchLight);GameHeadModules.request('install',{moduleId:qaBenchLight.uid});addItem('flashlight',1);");
    h.E(`V013Inventory.equip('flashlight');flashlightOn=true;player.aimX=-.3;player.aimY=-1;player.x=${outside?330:1210};player.y=${outside?40:750};V09Power.running=${outside};V010Energy.battery.charge=${outside?1.5:0};WorldClock.restore({schema:1,day:1,minute:${outside?0:759}});Object.assign(V014Robots.state,{scene,packed:false,task:'guard',hp:100,battery:100,light:true,economy:false,x:${outside?460:1160},y:${outside?60:710},guard:{scene,x:${outside?460:1160},y:${outside?60:710}}});`);
    assert.equal(h.E('V016Lighting.droneActive()'),true);assert.ok(h.E('V091Light.cone()'));
    if(outside)assert.equal(h.E('V016Lighting.fixtures().filter(f=>f.kind==="flood"&&V016Lighting.active(f)).length'),8);
   }
   h.E('updateCamera();');
  }
  const samples=[[],[]],frames=pair.map(h=>h.E(`n=>{update();${moving?`player.aimX=Math.sin(n*.035)*.65;player.aimY=-1;V014Robots.state.x=${outside?460:1160}+Math.sin(n*.045)*20;V014Robots.state.y=${outside?60:710}+Math.cos(n*.045)*12;`:''}GameAudioWorld.tick();draw();}`));
  for(let pass=0;pass<8;pass++)for(const index of (pass%2?[1,0]:[0,1])){
   const h=pair[index];h.E(`window.innerWidth=${width};window.innerHeight=${height};resizeCanvas();`);
   for(let n=0;n<45;n++){h.advance(17);const at=performance.now();frames[index](pass*45+n);h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=15)samples[index].push(performance.now()-at);}
  }
  const before=stats(samples[0]),after=stats(samples[1]);rows.push({viewport:width+'x'+height,scene:sceneName,before,after,deltaMs:after.p50Ms-before.p50Ms,percent:(after.p50Ms/before.p50Ms-1)*100});console.log(JSON.stringify(rows.at(-1)));
  if(outside&&width===1280)fs.mkdirSync('qa/results/stage-e-corrective-visuals',{recursive:true});if(outside&&width===1280)fs.writeFileSync('qa/results/stage-e-corrective-visuals/night-combined.png',pair[1].r.canvas.toBuffer('image/png'));
 }

const report={version:require('../package.json').version,runtimeSha256,baseline:'immutable delivered 0.36.0',purpose:'Recheck observed upper-tail variance without replacing the first full comparison',passes:8,samplesPerVersionPerScene:240,rows,errors:pair.flatMap(h=>h.r.errors),environment:{node:process.version,cpu:os.cpus()[0]?.model,mode:'Modeled DOM/WebAudio, native Canvas2D, DPR1; warmed alternating AB/BA'},limitations:['Shared-host CPU timing, not browser/phone FPS.','This targeted repeat is separate from the required twelve-scene full pass.']};report.passed=rows.length===3&&!report.errors.length&&rows.every(r=>r.before.samples===240&&r.after.samples===240);fs.writeFileSync('qa/results/stage-e-corrective-tail-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
