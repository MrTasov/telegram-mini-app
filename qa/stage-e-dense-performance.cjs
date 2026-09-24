// Interleaved dense-equipment / Base Control recheck after sequential full-pass variance.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
(async()=>{
const runtimeSha256=require('node:crypto').createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex');
 const pair=[boot(path.join(__dirname,'stage-e-base'),{beforeScripts:s=>{s.fetch=async url=>{const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};}}),boot(root)],rows=[];
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');}
 for(const h of pair)assert.equal(h.E('GameAudio.inspect().buffers'),57,'both immutable baseline and current runtime preload all original audio buffers');
 const saves=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 for(const [index,h]of pair.entries()){
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;GameFlow.resume();stopControls(true);scene='bunker';player.x=1210;player.y=675;V09Power.running=true;V09Power.fuel=100;for(const d of v09Doors)d.open=1;bag=[];for(const c of storageChests)c.items=[];if(!V014Robots.pack())throw Error('Real drone token required');for(const t of ['iron','parts','wood','concrete','copper'])addItem(t,300);`);
   // Place each result immediately: identical gameplay in both versions and
   // the new finite bag cannot become an artificial stress-test blocker.
   h.E(`window.perfPlaced=[];window.perfInstall=function(id){const type=GameEquipment.get(id).typeId;for(const room of GamePlacement.zones){const b=BunkerLayout.rooms[room];for(const turn of [0,1,2,3])for(let y=b.top+50;y<b.bottom-30;y+=40)for(let x=b.left+40;x<b.right-30;x+=40){const t=GamePlacement.centered(type,room,x,y,turn);if(GamePlacement.check(id,t).ok){const p=GamePlacement.request(id,'place',t);if(!p.ok)throw Error(p.reason);perfPlaced.push(id);return;}}}throw Error('No placement for '+id);};for(const type of ['furnace','utility_workbench','storage_crate']){const a=GamePlacement.request(type,'craft');if(!a.ok)throw Error(a.reason);perfInstall(a.instanceId);}`);
   h.E(`for(const [type,rule]of Object.entries(GamePlacement.rules)){if(!rule.craftable)continue;while(GameEquipment.records.filter(r=>r.typeId===type).length<rule.limit){const a=GamePlacement.request(type,'craft');if(!a.ok)throw Error(type+': '+a.reason);perfInstall(a.instanceId);}}GameMovable.receive('base_lamp',8);for(const r of GameEquipment.inventory(GameActors.localId))perfInstall(r.id);for(const id of GameEquipment.productionIds){const type=GameEquipment.recipeStation(id);if(type==='furnace')V09Craft.start(id,'iron',4);if(type==='craft_bench')V09Craft.start(id,'ammo',4);if(type==='utility_workbench')V09Craft.start(id,'flashlight',4);}for(const d of Object.values(V09Power.devices))d.enabled=false;for(const r of GameEquipment.records.filter(r=>r.typeId==='base_lamp'))V09Power.devices[r.refs.device].enabled=true;const dense=GamePlacement.zones.map(room=>({room,count:GameEquipment.records.filter(r=>r.placement==='installed'&&r.transform.room===room).length})).sort((a,b)=>b.count-a.count)[0];window.perfDenseRoom=dense;const b=BunkerLayout.rooms[dense.room],points=[];for(let y=b.top+40;y<b.bottom-30;y+=20)for(let x=b.left+40;x<b.right-30;x+=20)if(!worldCollision(x,y,player.radius,'bunker'))points.push({x,y,d:Math.hypot(x-(b.left+b.right)/2,y-(b.top+b.bottom)/2)});points.sort((a,b)=>a.d-b.d);Object.assign(player,points[0]);updateCamera();`);
   assert.equal(h.E('GameEquipment.ids.length'),42);
   assert.equal(h.E("GameEquipment.records.filter(r=>r.typeId==='base_lamp'&&devicePowered(r.refs.device)).length"),8);
   h.E('window.fullEquipmentSave=JSON.stringify(captureGameProgress());restoreGameProgress(decodeGameProgress(fullEquipmentSave))');assert.equal(h.E('GameEquipment.ids.length'),42);

 }
 assert.deepEqual(pair[0].J('GameEquipment.capture()'),pair[1].J('GameEquipment.capture()'),'identical dense physical instances, transforms and state');
 for(const [width,height,mode]of [[390,844,'MOBILE'],[1280,800,'PC']]){
  const samples=[[],[]],frame=pair.map(h=>h.E('()=>{update();GameAudioWorld.tick();draw()}'));
  for(const h of pair)h.E(`window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${mode}');resizeCanvas();updateCamera()`);
  for(const [i,h]of pair.entries())for(let n=0;n<80;n++){h.advance(17);frame[i]();h.r.canvas.getContext('2d').getImageData(0,0,1,1);}
  global.gc?.();
  for(let pass=0;pass<8;pass++)for(const i of pass%2?[1,0]:[0,1])for(let n=0;n<45;n++){const h=pair[i];h.advance(17);const at=performance.now();frame[i]();h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=15)samples[i].push(performance.now()-at);}
  const before=stats(samples[0]),after=stats(samples[1]);rows.push({viewport:width+'x'+height,instances:42,lamps:8,before,after,percent:(after.p50Ms/before.p50Ms-1)*100});console.log(JSON.stringify(rows.at(-1)));
 }
 const current=pair[1];current.E('window.perfResearchOriginal=GameResearch;window.perfResearchFactCalls=0;window.GameResearch={...perfResearchOriginal,facts(...args){perfResearchFactCalls++;return perfResearchOriginal.facts(...args)}}');
 for(let n=0;n<120;n++){current.advance(17);current.E('update();GameAudioWorld.tick();draw()');}
 const closedResearchFactCalls=current.E('perfResearchFactCalls');current.E('window.GameResearch=perfResearchOriginal');assert.equal(closedResearchFactCalls,0);
 const control=[[],[]],poll=pair.map(h=>h.E('()=>GameBaseControlUI.tick()'));
 for(const [i,h]of pair.entries())h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[i])}));menuOpen=false;GameFlow.resume();scene='bunker';player.x=1210;player.y=675;V09Power.running=true;V09Power.fuel=100;v09OpenPowerRemote()`);
 for(let pass=0;pass<8;pass++)for(const i of pass%2?[1,0]:[0,1])for(let n=0;n<60;n++){const at=performance.now();poll[i]();if(n>=10)control[i].push(performance.now()-at);}
 const report={version:require('../package.json').version,runtimeSha256,baseline:'immutable delivered 0.35.3',purpose:'Recheck initial sequential dense-case and operational UI variance with warmed AB/BA sampling',rows,closedResearchFactCalls,control:{before:stats(control[0]),after:stats(control[1])},errors:pair.flatMap(h=>h.r.errors),environment:{node:process.version,cpu:os.cpus()[0]?.model,mode:'Modeled DOM/WebAudio, native Canvas2D, DPR1, warmed 8-pass AB/BA'},limitations:['Shared-host CPU timing, not phone/browser FPS.','First full-pass samples remain in their original report; this is a separately reported repeat.']};report.passed=rows.length===2&&!report.errors.length&&closedResearchFactCalls===0&&rows.every(r=>r.before.samples===240&&r.after.samples===240);fs.writeFileSync('qa/results/stage-e-dense-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
