// Equipment acceptance against the frozen, integrated 0.29.0 MASTER game.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs');
const catalog=require('../assets/manifest.json'),mod=catalog.actors.modular,checks=[],runtimes=[],plain=v=>JSON.parse(JSON.stringify(v)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
const make=(file='index.html',options={})=>{const r=setup(file,{},options);runtimes.push(r);return r;};
const load=r=>r.eval('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
const snapshot=r=>require('./corrective-contract.cjs').snapshot(r.eval('({save:captureGameProgress(),player:{...player},moveX,moveY,movePower,firing,scene})'));
async function main(){
 const b=make('qa/pre-equipment/index.html'),r=make(),E=s=>r.eval(s),B=s=>b.eval(s);await load(r);await load(b);
 const raw=B('JSON.stringify(captureGameProgress())');
 const init=`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);V014Controls.stopRoute();stopControls(true);V010World.setSneaking(false);el('fade').classList.remove('show');scene='surface';player.wallLevel=false;player.x=800;player.y=850;player.walkAnimation=0;player.moving=false;player.running=false;player.aimX=1;player.aimY=0;menuOpen=false;playerDead=false;document.hidden=false;frameScale=1;zombies=[];V013City.setFloor(0);`;
 function pair(code){B(code);E(code);}function fresh(code=''){pair(init+code);E('ActorVisuals.pose(null)');}function same(){assert.deepEqual(snapshot(r),snapshot(b));}
 function step(ms=1000/60,code='updatePlayer();'){for(const q of [b,r]){q.advance(ms);q.eval(code);}}
 await check('source.onlyPresentationAndCatchNotificationChanged',()=>{
  const hashes=require('./pre-equipment/source-hashes.json'),allowed=['src/render/actors.js','src/core/rendering.js','src/assets/manifest.js','src/world/fishing.js','src/ui/maps-windows.js','src/base/construction.js'];
  for(const [file,h]of Object.entries(hashes))if(!require('./corrective-contract.cjs').sourceChanges.has(file)&&!allowed.includes(file))require('./hud-contract.cjs').assertSource(file,h);
  for(const file of ['src/save/format.js','src/save/envelope.js','src/config/gameplay.js','src/combat/monsters.js','src/combat/weapons-crafting.js','src/player/controls.js'])if(!require('./corrective-contract.cjs').sourceChanges.has(file))require('./hud-contract.cjs').assertSource(file,hashes[file]);
 });
 await check('assets.sevenApprovedItemsTwelveWalkFrames',()=>{
  assert.deepEqual(Object.keys(mod.items),['rifle_ak74','axe','pickaxe','hammer','remote','flashlight','fishing_rod']);
  for(const d of Object.values(mod.items)){assert.equal(d.walk.length,12);assert.ok(d.idle.body);}
  assert.equal(new Set(['axe','pickaxe','hammer','fishing_rod'].map(k=>mod.items[k].idle.body.id)).size,1);
  for(const k of ['axe','pickaxe','hammer'])assert.equal(mod.items[k].action.impactFrame,7);
  assert.equal(mod.items.fishing_rod.action.frames.length,12);
  for(const d of Object.values(mod.items))if(d.action)assert.equal(d.action.duration,d.action.durations.reduce((s,v)=>s+v,0));
 });
 await check('assets.AKRevisionFourUnderhandGripFixedToRifle',()=>{
  assert.equal(mod.revision,4);const frames=mod.items.rifle_ak74.walk;
  assert.deepEqual(frames.map(f=>f.gear.position),[[399.75,546.25],[396.875,545.75],[397.125,546],[397.375,546.75],[398.125,546.75],[398.5,546.25],[397.25,546.25],[396.625,546.5],[396.625,546.25],[397.5,546],[400.875,546],[402.875,546.25]]);
  for(const f of [mod.items.rifle_ak74.idle,...frames]){assert.equal(f.gear.angle,0);assert.equal(f.gear.scale,.60);assert.equal(f.cap,null);assert.ok(f.gear.front&&f.gear.rear);assert.deepEqual(f.gear.muzzle.map((v,i)=>v-f.gear.position[i]),[0,120]);}
 });
 await check('save.full029PayloadAndRoundtripPreserved',()=>{fresh();same();pair('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())))');same();assert.equal(E('captureGameProgress().saveVersion'),5);});
 for(const mode of ['PC','MOBILE'])for(const item of Object.keys(mod.items))await check('movement.'+mode+'.'+item,()=>{
  fresh(`GameInput.setMode('${mode}');addItem('${item}',1);V013Inventory.equip('${item}');moveX=1;moveY=0;movePower=1;`);const frames=new Set();
  for(let i=0;i<78;i++){step();const p=plain(E(`ActorVisuals.pose('${item}')`));assert.equal(p.mode,'walk');frames.add(p.frame);E('drawPlayer()');if(i%13===0)same();}
  assert.equal(frames.size,12);assert.equal(E('player.radius'),10);
  pair('movePower=0');step();assert.equal(E(`ActorVisuals.pose('${item}').mode`),'idle');same();
 });
 await check('collision.blockedAKUsesIdleAndKeepsOriginalHitbox',()=>{
  fresh("addItem('rifle_ak74',1);V013Inventory.equip('rifle_ak74');player.x=800;player.y=212;moveX=0;moveY=-1;movePower=1;");for(let i=0;i<30;i++){step();assert.equal(E("ActorVisuals.pose('rifle_ak74').mode"),'idle');same();}
 });
 for(const item of ['axe','pickaxe','hammer'])await check('work.'+item+'.allTwelvePhasesImpactAndNoSimulationChanges',()=>{
  fresh();const action=mod.items[item].action;let elapsed=0;const seen=new Set();
  for(let i=0;i<12;i++){
   const t=elapsed+action.durations[i]/2;
   if(item==='axe')E(`chopState={id:worldTrees[0].id,duration:${action.duration},startedAt:Date.now()-${t/catalog.actors.gathering.playbackRate}}`);
   if(item==='pickaxe')E(`V09World.resumeMining({id:V09World.ores[0].id,elapsed:${t/catalog.actors.gathering.playbackRate},duration:${action.duration},at:Date.now()})`);
   if(item==='hammer')E(`window.qaHammer=ActorVisuals.framePose('hammer','work',${i});qaHammer.localTime=${t};qaHammer.work={key:'qa',elapsed:${t},duration:${action.duration},material:'metal',target:{x:840,y:810,w:15,h:80}}`);
   const expr=item==='hammer'?'qaHammer':`ActorVisuals.pose('${item}')`,p=plain(E(expr));seen.add(p.frame);assert.equal(p.frame,i);
   const position=plain(E('({...player})'));E(`ActorVisuals.renderPose(${expr},player.x,player.y,Math.atan2(player.aimY,player.aimX))`);assert.deepEqual(plain(E('({...player})')),position);
   if(i===7){const hit=plain(E(`ActorVisuals.impactSample(${expr})`)),contact=plain(E(`contactPoint((${expr}).work.target,player.x,player.y)`));assert.ok(hit);assert.ok(Math.hypot(hit.point.x-contact.x,hit.point.y-contact.y)<1e-7);}
   elapsed+=action.durations[i];
  }assert.equal(seen.size,12);E('chopState=null;V09World.stopMining()');
 });
 await check('work.realTreeExplicitCorrectiveBalance',()=>{
  fresh("addItem('axe',1);V013Inventory.equip('axe');window.qaTree=worldTrees.find(t=>t.wood>0&&!t.felled);player.x=qaTree.x+50;player.y=qaTree.y;useTree(qaTree);");assert.ok(E('chopState'));
  assert.equal(B('chopState.duration'),1800);assert.equal(E('chopState.duration'),2300);
  const oldWood=B("bagCount('wood')"),newWood=E("bagCount('wood')");
  for(let i=0;i<139;i++){step(1000/60,'updateChop();');E('drawPlayer()');}
  assert.equal(E('qaTree.felled'),true);assert.equal(B("bagCount('wood')")-oldWood,15);assert.equal(E("bagCount('wood')")-newWood,10);
 });
 await check('work.realMiningYieldAndToolUpgradeRatePreserved',()=>{
  fresh("addItem('pickaxe',1);V013Inventory.equip('pickaxe');window.qaOre=V09World.ores[0];player.x=qaOre.x+qaOre.r+20;player.y=qaOre.y;executeInteraction(interactionObjects('surface').find(o=>o.id===qaOre.id));");assert.ok(E('V09World.miningState()'));
  for(let i=0;i<125;i++){step(1000/60,'V09World.tickMining();');E('drawPlayer()');if(i%10===0)same();}same();assert.ok(E('qaOre.remaining<qaOre.capacity'));
 });
 await check('work.realRepairHPAndConcreteConsumptionPreserved',()=>{
  fresh("addItem('hammer',1);addItem('concrete',5);V013Inventory.equip('hammer');window.qaWall=[...V018Build.structures.values()].find(r=>r.kind==='wall'&&!r.object.corner);qaWall.object.hp-=100;player.x=qaWall.object.x+qaWall.object.w/2;player.y=qaWall.object.y-25;V018Build.start(qaWall.id);");assert.ok(E('V018Build.job'));
  for(let i=0;i<100;i++){step(1000/60,'V018Build.repairStep(1000/60);');E('drawPlayer()');if(i%10===0)same();}same();
 });
 await check('work.oneTickRepairFinishesAllTwelveVisualFramesWithoutDelayingHP',()=>{
  fresh("addItem('hammer',1);addItem('concrete',5);V013Inventory.equip('hammer');window.qaWall=[...V018Build.structures.values()].find(r=>r.kind==='wall'&&!r.object.corner);qaWall.object.hp-=1;player.x=qaWall.object.x+qaWall.object.w/2;player.y=qaWall.object.y-25;V018Build.start(qaWall.id);");
  step(1,'V018Build.repairStep(1)');same();assert.equal(E('V018Build.job'),null);assert.equal(E('qaWall.object.hp'),E('qaWall.object.maxHp'));
  const frames=new Set();for(let i=0;i<69;i++){const p=plain(E("ActorVisuals.pose('hammer')"));if(p.working)frames.add(p.frame);E('drawPlayer()');step(1000/60,'');}assert.equal(frames.size,12);assert.equal(E("ActorVisuals.pose('hammer').mode"),'idle');same();
 });
 await check('work.repairVisualClearsOnCancelMovementAndSaveRestore',()=>{
  for(const cancel of ["V018Build.stop()","movePower=1","restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())))"]){
   fresh("addItem('hammer',1);addItem('concrete',5);V013Inventory.equip('hammer');window.qaWall=[...V018Build.structures.values()].find(r=>r.kind==='wall'&&!r.object.corner);qaWall.object.hp-=100;player.x=qaWall.object.x+qaWall.object.w/2;player.y=qaWall.object.y-25;V018Build.start(qaWall.id);");
   assert.equal(E("ActorVisuals.pose('hammer').mode"),'work');pair(cancel);assert.notEqual(E("ActorVisuals.pose('hammer').mode"),'work');same();
  }
 });
 await check('fishing.realCatchNotificationInventoryRNGAndStationaryWait',()=>{
  fresh("addItem('fishing_rod',1);V013Inventory.equip('fishing_rod');player.x=210;player.y=1535;V012Fishing.start(V012Fishing.spots[0]);");assert.ok(E('V012Fishing.state'));
  assert.equal(E("ActorVisuals.pose('fishing_rod').mode"),'wait');const wait=plain(E("ActorVisuals.pose('fishing_rod')"));
  step(1000,'V012Fishing.tick()');assert.deepEqual(plain(E("ActorVisuals.pose('fishing_rod')")),wait);same();
  const dt=E('V012Fishing.state.duration-(performance.now()-V012Fishing.state.started)+1');step(dt,'V012Fishing.tick()');same();assert.equal(E("ActorVisuals.pose('fishing_rod').mode"),'catch');
  const frames=new Set();for(let i=0;i<55;i++){const p=plain(E("ActorVisuals.pose('fishing_rod')"));if(p.mode==='catch')frames.add(p.frame);E('drawPlayer()');step(34,'V012Fishing.tick()');}assert.equal(frames.size,12);assert.equal(E("ActorVisuals.pose('fishing_rod').mode"),'wait');same();
  pair('V012Fishing.stop()');assert.equal(E("ActorVisuals.pose('fishing_rod').mode"),'idle');same();
 });
 await check('fishing.catchCancelledOnMovementDeathOrRestore',()=>{
  for(const code of ['player.moving=true','playerDead=true','restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())))']){
   fresh("addItem('fishing_rod',1);V013Inventory.equip('fishing_rod');");E("ActorVisuals.fishCaught({waterX:850,waterY:900})");assert.equal(E("ActorVisuals.pose('fishing_rod').mode"),'catch');E(code);assert.notEqual(E("ActorVisuals.pose('fishing_rod').mode"),'catch');
  }
 });
 await check('render.allStatesAnglesAndSharedAnchor',()=>{
  fresh();for(const item of Object.keys(mod.items))for(const mode of ['idle','walk',...(mod.items[item].action?['work']:[])])for(let i=0;i<(mode==='idle'?1:12);i++)for(const angle of [0,.75,Math.PI,4.8]){
   const prior=plain(E('({...player})'));assert.equal(E(`ActorVisuals.renderPose(ActorVisuals.framePose('${item}','${mode}',${i}),150,150,${angle})`),true);assert.deepEqual(plain(E('({...player})')),prior);
   const pivot=plain(E(`ActorVisuals.worldPoint(ActorVisuals.framePose('${item}','${mode}',${i}),[448,448],150,150,${angle})`));assert.deepEqual(pivot,{x:150,y:150});
  }
 });
 await check('render.AKBarrelForwardAcrossAllFramesAndTurns',()=>{
  for(let i=0;i<12;i++)for(const angle of [0,.8,2,4.4]){
   const points=plain(E(`(()=>{const p=ActorVisuals.framePose('rifle_ak74','walk',${i});return [ActorVisuals.worldPoint(p,p.record.gear.position,10,20,${angle}),ActorVisuals.worldPoint(p,p.record.gear.muzzle,10,20,${angle})]})()`)),dx=points[1].x-points[0].x,dy=points[1].y-points[0].y;
   assert.ok(Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle))<1e-9);assert.ok(dx*Math.cos(angle)+dy*Math.sin(angle)>0);
  }
 });
 await check('cache.lazyStartupAndNoRepeatedRequests',()=>{
  const q=make();assert.ok(q.imageRequests.length<15);const historical=Object.values(catalog.images).filter(d=>d.historical).map(d=>d.path);assert.ok(!q.imageRequests.some(p=>historical.includes(p)));
  const n=r.imageRequests.length;fresh();for(let i=0;i<30;i++)for(const item of Object.keys(mod.items))E(`ActorVisuals.renderPose(ActorVisuals.pose('${item}'),120,120,${i})`);assert.equal(r.imageRequests.length,n);assert.equal(new Set(r.imageRequests).size,n);
 });
 for(const viewport of [{id:'pc',width:1280,height:800,maxTouchPoints:0},{id:'portrait',width:390,height:844,maxTouchPoints:5},{id:'landscape',width:844,height:390,maxTouchPoints:5}])await check('viewport.'+viewport.id+'.renderAndSavedStateUnchanged',async()=>{
  const q=make('index.html',viewport);await load(q);q.eval(init);for(const item of Object.keys(mod.items))for(const which of ['surface','bunker']){
   q.eval(`scene='${which}';player.x=${which==='surface'?800:725};player.y=${which==='surface'?850:650};addItem('${item}',1);V013Inventory.equip('${item}');updateCamera();restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())));draw();`);const prev=snapshot(q);q.eval('draw()');assert.deepEqual(snapshot(q),prev);
  }assert.deepEqual(q.errors,[]);
 });
 const bytes=mod.preload.reduce((sum,id)=>sum+catalog.images[id].size[0]*catalog.images[id].size[1]*4,0);
 await check('memory.packedLayersUnder18MiBNoLargeTextures',()=>{assert.ok(bytes<18*1024*1024);for(const id of mod.preload)assert.ok(catalog.images[id].size.every(n=>n<=2048));});
 await check('console.clean',()=>{for(const q of runtimes)assert.deepEqual(q.errors,[]);});
 const result={reference:'0.29.0 MASTER integrated',revision:4,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,newAtlasDecodedBytes:bytes,checks,limitations:['DOM model + native Canvas2D. Physical PC/Mobile/WebView manual acceptance remains.']};
 fs.writeFileSync('qa/results/equipment-integration.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL')},null,2));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
