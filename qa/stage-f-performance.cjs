// Immutable delivered 0.36.1 vs Stage F. Run separately from regression suites.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
(async()=>{
 const runtimeSha256=require('node:crypto').createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex');
 const checkpoint='qa/results/stage-f-performance-progress.json';
 const retained=process.env.STAGE_F_PERF_RESUME?JSON.parse(fs.readFileSync(checkpoint)):null;
 if(retained&&(retained.runtimeSha256!==runtimeSha256||retained.benchmarkVersion!==1))throw Error('Stale performance checkpoint');
 const pair=[boot(path.join(__dirname,'stage-f-base'),{beforeScripts:s=>{s.fetch=async url=>{const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};}}),boot(root)],rows=retained?.rows||[];
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');}
 for(const h of pair)assert.equal(h.E('GameAudio.inspect().buffers'),57,'both immutable baseline and current runtime preload all original audio buffers');
 const saves=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 for(const [width,height,mode]of (process.env.STAGE_F_SHORT?[[390,844,'MOBILE']]:[[390,844,'MOBILE'],[1280,800,'PC']]))for(const sceneName of (process.env.STAGE_F_SHORT?['bunker_moving_lights','night_combined_lights','bunker_door_spill']:['quiet_surface','stress_surface','bunker_hall','bunker_moving_lights','night_combined_lights','bunker_door_spill'])){
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
  for(let pass=0;pass<4;pass++)for(const index of (pass%2?[1,0]:[0,1])){
   const h=pair[index];h.E(`window.innerWidth=${width};window.innerHeight=${height};resizeCanvas();`);
   for(let n=0;n<45;n++){h.advance(17);const at=performance.now();frames[index](pass*45+n);h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=15)samples[index].push(performance.now()-at);}
  }
  const before=stats(samples[0]),after=stats(samples[1]);rows.push({viewport:width+'x'+height,scene:sceneName,before,after,deltaMs:after.p50Ms-before.p50Ms,percent:(after.p50Ms/before.p50Ms-1)*100});console.log(JSON.stringify(rows.at(-1)));fs.writeFileSync(checkpoint,JSON.stringify({runtimeSha256,benchmarkVersion:1,rows},null,2)+'\n');
  if(outside&&width===1280)fs.mkdirSync('qa/results/stage-f-visuals',{recursive:true});if(outside&&width===1280)fs.writeFileSync('qa/results/stage-f-visuals/night-combined.png',pair[1].r.canvas.toBuffer('image/png'));
 }
 const navigation=[],commands=[],serialization=[],heaps=[];
 for(const [index,h]of pair.entries()){
  const version=index?require('../package.json').version:'0.36.1';
  h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;playerDead=false;document.hidden=false;GameFlow.resume();scene='bunker';player.x=1120;player.y=-120;for(const d of v09Doors)d.open=1;invalidateGeometry();`);
  const nav=[],input=[];let reachable=0;
  for(const [x,y]of [[600,30],[590,510],[650,1050],[1870,90],[1870,510],[1870,1010],[1260,1460],[2034,195]])for(let n=0;n<10;n++){const at=performance.now(),p=h.E(`findWalkPath(1120,-120,{id:'ground',kind:'ground',x:${x+n*.07},y:${y},r:0,range:1},'bunker',15)`);nav.push(performance.now()-at);if(p?.length)reachable++;}
  navigation.push({version,reachable,...stats(nav)});
  const inputFn=h.E("()=>GameActions.dispatch('MOVE',{kind:'vector',x:1,y:0,power:.4})");for(let n=0;n<500;n++){const at=performance.now();inputFn();if(n>=100)input.push(performance.now()-at);}commands.push({version,...stats(input)});
  const serialize=h.E('()=>JSON.stringify(captureGameProgress())'),times=[];let raw;
  global.gc?.();const beforeHeap=process.memoryUsage().heapUsed;
  for(let n=0;n<100;n++){const at=performance.now();raw=serialize();times.push(performance.now()-at);}
  const transientHeap=process.memoryUsage().heapUsed-beforeHeap;global.gc?.();const retainedHeap=process.memoryUsage().heapUsed-beforeHeap;
  serialization.push({version,characters:raw.length,utf8Bytes:Buffer.byteLength(raw),...stats(times)});heaps.push({version,snapshots:100,transientHeapDeltaBytes:transientHeap,postGcHeapDeltaBytes:retainedHeap,gcAvailable:!!global.gc});
 }
 const after=pair[1];after.E("restoreGameProgress(GameNewGame.create());GameFlow.resume();menuOpen=false;playerDead=false;document.hidden=false;stopControls(true);scene='bunker';player.x=1210;player.y=675;V09Power.running=true;GameCampaign.refresh(true);");
 const closed=[],opened=[],refresh=after.E('()=>GameCampaign.tick(250)');
 for(const [which,out]of [['closed',closed],['open',opened]]){if(which==='open')after.E("V09Power.fuel=10;CommandCoreUI.show('chapters')");for(let n=0;n<500;n++){const at=performance.now();refresh();if(n>=100)out.push(performance.now()-at);}}
 // Exercise the bounded moving-drone cache even when resuming only a static
 // final scene. These warm frames are diagnostics, outside timed samples.
 after.E("closeOverlay(el('commandCoreOverlay'));scene='bunker';player.x=1210;player.y=750;V09Power.running=false;V010Energy.battery.charge=0;Object.assign(V014Robots.state,{scene,packed:false,task:'guard',hp:100,battery:100,light:true,economy:false,x:1160,y:710,guard:{scene,x:1160,y:710}});updateCamera()");
 for(let n=0;n<12;n++){after.advance(17);after.E(`V014Robots.state.x=1160+${n*.23};draw()`);}
 const movingDroneMetrics=after.J('V016Lighting.droneMetrics()'),movingLightingCache=after.J('V016Lighting.cacheInfo()');
 const placement=[],preview=[],baselinePlacement=[],baselinePreview=[],dragPreview=[],baselineDragPreview=[];
 after.E("scene='bunker';player.x=1210;player.y=675;V09Power.running=true;V09Power.fuel=100;for(const type of ['iron','parts','wood','concrete'])addItem(type,100);if(!GameAvailability.buildable('furnace').available){for(const action of ['obtain','submit']){const a=GameResearch.request(action,{sourceId:'source.core_diagnostics'});if(!a.ok)throw Error(a.reason);}if(!GameResearch.request('research',{researchId:'research.station_fabrication'}).ok)throw Error('Benchmark research setup failed');}window.perfCraft=GamePlacement.request('furnace','craft');GamePlacementUI.show(perfCraft.instanceId)");
 const checkPlacement=after.E("()=>GamePlacement.check(perfCraft.instanceId,GamePlacement.centered('furnace','reserve_l1',1950,400,1))"),paintPreview=after.E("()=>GamePlacementUI.tick()");
 for(let n=0;n<160;n++){let at=performance.now();assert.equal(checkPlacement().ok,true);if(n>=40)placement.push(performance.now()-at);at=performance.now();paintPreview();if(n>=40)preview.push(performance.now()-at);}
 const drag=after.E("n=>GamePlacementUI.move(1870+(n%7)*2,430)");for(let n=0;n<100;n++){const at=performance.now();drag(n);after.r.doc.getElementById("placementPlan")._canvas.getContext("2d").getImageData(0,0,1,1);if(n>=20)dragPreview.push(performance.now()-at);}
 after.E("closeOverlay(el('equipmentPlacementOverlay'));GamePlacementUI.tick()");const idleBefore=after.E('GamePlacement.metrics().checks');for(let n=0;n<120;n++)after.E('update();GamePlacementUI.tick()');assert.equal(after.E('GamePlacement.metrics().checks'),idleBefore);
 const controlUI=[];
 for(const [index,h] of pair.entries()){
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;GameFlow.resume();scene='bunker';player.x=1210;player.y=675;V09Power.running=true;V09Power.fuel=100;v09OpenPowerRemote()`);
   const times=[],poll=h.E('()=>GameBaseControlUI.tick()');
   for(let n=0;n<160;n++){const at=performance.now();poll();if(n>=40)times.push(performance.now()-at);}
   controlUI.push({version:index?require('../package.json').version:'0.36.1',scope:'operational Remote refresh',...stats(times)});
   h.E("for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o)");
 }
 const beforePlacement=pair[0];beforePlacement.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[0])}));menuOpen=false;GameFlow.resume();scene='bunker';player.x=1210;player.y=675;for(const t of ['wood','iron','parts','concrete'])addItem(t,100);window.perfCraft=GamePlacement.request('furnace','craft');GamePlacementUI.show(perfCraft.instanceId)`);
 const oldCheck=beforePlacement.E("()=>GamePlacement.check(perfCraft.instanceId,GamePlacement.centered('furnace','reserve_l1',1950,400,1))"),oldPreview=beforePlacement.E('()=>GamePlacementUI.tick()');for(let n=0;n<160;n++){let at=performance.now();assert.equal(oldCheck().ok,true);if(n>=40)baselinePlacement.push(performance.now()-at);at=performance.now();oldPreview();if(n>=40)baselinePreview.push(performance.now()-at);}
 const oldDrag=beforePlacement.E("n=>GamePlacementUI.move(1870+(n%7)*2,430)");for(let n=0;n<100;n++){const at=performance.now();oldDrag(n);beforePlacement.r.doc.getElementById("placementPlan")._canvas.getContext("2d").getImageData(0,0,1,1);if(n>=20)baselineDragPreview.push(performance.now()-at);}
 beforePlacement.E("closeOverlay(el('equipmentPlacementOverlay'));GamePlacementUI.tick()");
 const maxEquipment=[],severalEquipment=[],maxSerialization=[],corridorChecks=[];
 for(const [index,h] of pair.entries()){
   const version=index?require('../package.json').version:'0.36.1';
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[index])}));menuOpen=false;GameFlow.resume();stopControls(true);scene='bunker';player.x=1210;player.y=675;V09Power.running=true;V09Power.fuel=100;for(const d of v09Doors)d.open=1;bag=[];for(const c of storageChests)c.items=[];if(!V014Robots.pack())throw Error('Real drone token required');for(const t of ['iron','parts','wood','concrete','copper'])addItem(t,300);`);
   // Place each result immediately: identical gameplay in both versions and
   // the new finite bag cannot become an artificial stress-test blocker.
   h.E(`window.perfPlaced=[];window.perfInstall=function(id){const type=GameEquipment.get(id).typeId;for(const room of GamePlacement.zones){const b=BunkerLayout.rooms[room];for(const turn of [0,1,2,3])for(let y=b.top+50;y<b.bottom-30;y+=40)for(let x=b.left+40;x<b.right-30;x+=40){const t=GamePlacement.centered(type,room,x,y,turn);if(GamePlacement.check(id,t).ok){const p=GamePlacement.request(id,'place',t);if(!p.ok)throw Error(p.reason);perfPlaced.push(id);return;}}}throw Error('No placement for '+id);};for(const type of ['furnace','utility_workbench','storage_crate']){const a=GamePlacement.request(type,'craft');if(!a.ok)throw Error(a.reason);perfInstall(a.instanceId);}`);
   for(const [width,height]of [[390,844],[1280,800]]){
     h.E(`window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${width<600?'MOBILE':'PC'}');resizeCanvas();updateCamera()`);const times=[],frame=h.E('()=>{update();GameAudioWorld.tick();draw()}');
     for(let n=0;n<160;n++){h.advance(17);const at=performance.now();frame();h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=40)times.push(performance.now()-at);}
     severalEquipment.push({version,viewport:width+'x'+height,newInstances:3,...stats(times)});
   }
   h.E(`for(const [type,rule]of Object.entries(GamePlacement.rules)){if(!rule.craftable)continue;while(GameEquipment.records.filter(r=>r.typeId===type).length<rule.limit){const a=GamePlacement.request(type,'craft');if(!a.ok)throw Error(type+': '+a.reason);perfInstall(a.instanceId);}}GameMovable.receive('base_lamp',8);for(const r of GameEquipment.inventory(GameActors.localId))perfInstall(r.id);for(const id of GameEquipment.productionIds){const type=GameEquipment.recipeStation(id);if(type==='furnace')V09Craft.start(id,'iron',4);if(type==='craft_bench')V09Craft.start(id,'ammo',4);if(type==='utility_workbench')V09Craft.start(id,'flashlight',4);}for(const d of Object.values(V09Power.devices))d.enabled=false;for(const r of GameEquipment.records.filter(r=>r.typeId==='base_lamp'))V09Power.devices[r.refs.device].enabled=true;const dense=GamePlacement.zones.map(room=>({room,count:GameEquipment.records.filter(r=>r.placement==='installed'&&r.transform.room===room).length})).sort((a,b)=>b.count-a.count)[0];window.perfDenseRoom=dense;const b=BunkerLayout.rooms[dense.room],points=[];for(let y=b.top+40;y<b.bottom-30;y+=20)for(let x=b.left+40;x<b.right-30;x+=20)if(!worldCollision(x,y,player.radius,'bunker'))points.push({x,y,d:Math.hypot(x-(b.left+b.right)/2,y-(b.top+b.bottom)/2)});points.sort((a,b)=>a.d-b.d);Object.assign(player,points[0]);updateCamera();`);
   assert.equal(h.E('GameEquipment.ids.length'),42);
   assert.equal(h.E("GameEquipment.records.filter(r=>r.typeId==='base_lamp'&&devicePowered(r.refs.device)).length"),8);
   h.E('window.fullEquipmentSave=JSON.stringify(captureGameProgress());restoreGameProgress(decodeGameProgress(fullEquipmentSave))');assert.equal(h.E('GameEquipment.ids.length'),42);
   for(const [width,height]of [[390,844],[1280,800]]){
     h.E(`window.innerWidth=${width};window.innerHeight=${height};GameInput.setMode('${width<600?'MOBILE':'PC'}');resizeCanvas();updateCamera()`);const times=[],frame=h.E('()=>{update();GameAudioWorld.tick();draw()}');
     for(let n=0;n<160;n++){h.advance(17);const at=performance.now();frame();h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=40)times.push(performance.now()-at);}
     maxEquipment.push({version,viewport:width+'x'+height,instances:42,activeInstances:h.E('GameEquipment.records.filter(r=>GameEquipment.present(r.id)).length'),placedLamps:8,poweredLamps:h.E("GameEquipment.records.filter(r=>r.typeId==='base_lamp'&&devicePowered(r.refs.device)).length"),denseRoom:h.J('perfDenseRoom'),...stats(times)});
   }
   const times=[],serialize=h.E('()=>JSON.stringify(captureGameProgress())');let raw;
   for(let n=0;n<100;n++){const at=performance.now();raw=serialize();times.push(performance.now()-at);}maxSerialization.push({version,instances:42,utf8Bytes:Buffer.byteLength(raw),...stats(times)});
 }
 // A corridor route check is intentionally more expensive than a room check;
 // measure the actual new worst case separately from idle-preview work.
 after.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saves[1])}));menuOpen=false;GameFlow.resume();scene='bunker';player.x=1210;player.y=675;for(const t of ['iron','wood'])addItem(t,100);window.hallCase=GamePlacement.request('storage_crate','craft').instanceId;`);
 after.E("window.hallTarget=null;for(const x of [920,1020,1400,1500])for(const y of [350,170,-120,720,870,1120]){const t=GamePlacement.centered('storage_crate','corridor',x,y);if(GamePlacement.check(hallCase,t).ok){hallTarget=t;break;}}");assert.ok(after.E('hallTarget'));
 const hallCheck=after.E("()=>GamePlacement.check(hallCase,hallTarget)");for(let n=0;n<80;n++){const at=performance.now();assert.equal(hallCheck().ok,true);if(n>=20)corridorChecks.push(performance.now()-at);}

 const researchUI={},researchCommands=[];
 after.E("restoreGameProgress(GameNewGame.create());menuOpen=false;playerDead=false;GameFlow.resume();scene='bunker';player.x=1210;player.y=680;V09Power.running=true;V09Power.fuel=100;V010Energy.battery.charge=1;for(const d of Object.values(V09Power.devices))d.enabled=d.id===GameCampaign.powerId;");
 for(const phase of ['closed','open']){
  if(phase==='open')after.E("CommandCoreUI.show('research')");const before=after.E('GameResearchUI.metrics().renders'),times=[],poll=after.E('()=>CommandCoreUI.tick()');
  for(let n=0;n<600;n++){const at=performance.now();poll();if(n>=100)times.push(performance.now()-at);}
  researchUI[phase]={...stats(times),idleRenders:after.E('GameResearchUI.metrics().renders')-before};assert.equal(researchUI[phase].idleRenders,0);
 }
 for(const [action,payload]of [['obtain',{sourceId:'source.core_diagnostics'}],['submit',{sourceId:'source.core_diagnostics'}],['research',{researchId:'research.station_fabrication'}],['obtain',{sourceId:'source.scout_service'}],['submit',{sourceId:'source.scout_service'}],['research',{researchId:'research.scout_service'}]]){
  const at=performance.now(),result=after.E(`GameResearch.request(${JSON.stringify(action)},${JSON.stringify(payload)})`);assert.equal(result.ok,true);after.E('CommandCoreUI.tick()');researchCommands.push({action,elapsedMs:performance.now()-at});
 }
 const researchSave=after.E('JSON.stringify(captureGameProgress())'),researchDecode=[],decode=after.E('raw=>decodeGameProgress(raw)');
 for(let n=0;n<60;n++){const at=performance.now();decode(researchSave);if(n>=10)researchDecode.push(performance.now()-at);}
 researchUI.save={utf8Bytes:Buffer.byteLength(researchSave),researchBytes:Buffer.byteLength(after.E('JSON.stringify(GameResearch.capture())')),decode:stats(researchDecode)};
 const report={researchUI,researchCommands,benchmarkVersion:1,audioBuffers:pair.map(h=>h.E('GameAudio.inspect().buffers')),resumed:!!retained,version:require('../package.json').version,runtimeSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex'),baseline:'immutable delivered 0.36.1 Stage F',environment:{node:process.version,cpu:os.cpus()[0]?.model,mode:'Modeled DOM/WebAudio, native Canvas2D, DPR 1, zoom .65, 120 measured frames per scene/version; alternating AB/BA'},rows,navigation,commands,serialization,heaps,placementCheck:stats(placement),placementPreview:stats(preview),baselinePlacementCheck:stats(baselinePlacement),baselinePlacementPreview:stats(baselinePreview),dragPreview:stats(dragPreview),baselineDragPreview:stats(baselineDragPreview),idlePlacementChecks:0,maxEquipment,severalEquipment,maxSerialization,controlUI,corridorChecks:stats(corridorChecks),campaignPoll:{closed:stats(closed),open:stats(opened)},droneMetrics:movingDroneMetrics,lightingCache:movingLightingCache,errors:pair.flatMap(h=>h.r.errors),limitations:['CPU measurements on a shared host, not phone/browser FPS, GPU time or physical touch latency.','Moving-light scenes include continuously changing drone positions and player aim; night scene runs all eight searchlights.','Command dispatch excludes OS/browser delivery. Navigation covers complete path queries.','Heap deltas include harness and serialization allocations, not a browser/device memory budget.','Maximum-equipment comparison enables the same eight lamps in both versions; production is queued but deliberately disabled so power allocation policy does not confound render cost.']};
 report.passed=report.audioBuffers.every(n=>n===57)&&maxEquipment.every(row=>row.instances===42&&row.placedLamps===8&&row.poweredLamps===8)&&!report.errors.length&&navigation.every(n=>n.reachable===80)&&report.droneMetrics.rayCasts===0&&report.lightingCache.droneBytes>0&&report.lightingCache.droneBytes<=1048576;
 report.movement=await require('./stage-f-movement-performance.cjs').measure();report.passed=report.passed&&report.movement.passed;
 fs.writeFileSync('qa/results/stage-f-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
