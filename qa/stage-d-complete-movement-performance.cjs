// Separate actual movement workload: no scripted player/drone positions per frame.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
async function measure(){
 const pair=[boot(path.join(__dirname,'stage-d-complete-base'),{beforeScripts:s=>{s.fetch=async url=>{const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};}}),boot(root)],rows=[];
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');assert.equal(h.E('GameAudio.inspect().buffers'),57);}
 const saves=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 for(const [width,height,mode]of [[390,844,'MOBILE'],[1280,800,'PC']]){
  for(const [index,h]of pair.entries())h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;playerDead=false;document.hidden=false;GameFlow.resume();stopControls(true);frameScale=1;window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${mode}');resizeCanvas();V010Camera.restore({...V010Camera.capture(),zoom:.65});WorldClock.restore({schema:1,day:1,minute:759});zombies=[];scene='bunker';player.x=1210;player.y=850;V09Power.running=false;V010Energy.battery.charge=0;for(const d of v09Doors)d.open=1;equipment.head={type:'head_mount',qty:1};addItem('flashlight',1);var qaMovingLight=bag.find(i=>i?.type==='flashlight');V010Combat.ensure(qaMovingLight);GameHeadModules.request('install',{moduleId:qaMovingLight.uid});addItem('flashlight',1);V013Inventory.equip('flashlight');flashlightOn=true;Object.assign(V014Robots.state,{scene,packed:false,task:'follow',hp:100,battery:100,light:true,economy:false,x:1210,y:950});updateCamera();`);
  const samples=[[],[]],travel=[{player:0,drone:0},{player:0,drone:0}],frames=pair.map(h=>h.E(`n=>{const p={x:player.x,y:player.y},d={x:V014Robots.state.x,y:V014Robots.state.y};if(!GameActions.dispatch('MOVE',{kind:'vector',x:0,y:Math.floor(n/40)%2?1:-1,power:.65}))throw Error('MOVE rejected');update();GameAudioWorld.tick();draw();return {player:Math.hypot(player.x-p.x,player.y-p.y),drone:Math.hypot(V014Robots.state.x-d.x,V014Robots.state.y-d.y)};}`));
  for(let pass=0;pass<4;pass++)for(const index of (pass%2?[1,0]:[0,1]))for(let n=0;n<45;n++){
   const h=pair[index];h.advance(17);const at=performance.now(),moved=frames[index](pass*45+n);h.r.canvas.getContext('2d').getImageData(0,0,1,1);
   if(n>=15){samples[index].push(performance.now()-at);travel[index].player+=moved.player;travel[index].drone+=moved.drone;}
  }
  for(const [index,h]of pair.entries()){
   assert.ok(travel[index].player>10,'actual player movement');assert.ok(travel[index].drone>2,'actual following drone movement');
   rows.push({version:index?require('../package.json').version:'0.35.2',viewport:width+'x'+height,playerDistance:travel[index].player,droneDistance:travel[index].drone,...stats(samples[index])});
   h.E("GameActions.dispatch('MOVE',{kind:'vector',x:0,y:0,power:0})");
  }
 }
 const errors=pair.flatMap(h=>h.r.errors);return {passed:rows.length===4&&!errors.length,rows,errors,scope:'Actual MOVE, update, following Drone, flashlight and Drone light, audio, native Canvas2D; 120 measured frames per version/viewport, alternating AB/BA. Distances cover measured frames only; no OS/browser input delivery.'};
}
module.exports={measure};
if(require.main===module)measure().then(m=>{
 const file=path.join(root,'qa/results/stage-d-complete-performance.json'),p=JSON.parse(fs.readFileSync(file));
 const sha=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'js/game.js'))).digest('hex');assert.equal(p.runtimeSha256,sha);assert.equal(p.rows.length,12);
 p.movement=m;p.passed=p.passed&&m.passed;fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(m));if(!m.passed)process.exitCode=1;
}).catch(e=>{console.error(e);process.exitCode=1;});
