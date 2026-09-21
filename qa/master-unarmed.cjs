// Master UNARMED: real movement owners plus real Canvas2D, compared with the
// frozen pre-integration 0.29 executable. No native WebView result is implied.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),catalog=require('../assets/manifest.json');
const plain=v=>JSON.parse(JSON.stringify(v)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[],runtimes=[],rates=[];
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack?.slice(0,4500)||String(e)});}}
function make(file='index.html',options={}){const r=setup(file,{},options);runtimes.push(r);return r;}
function snapshot(r){return require('./corrective-contract.cjs').snapshot(r.eval('({save:captureGameProgress(),player:{...player},moveX,moveY,movePower,aimPower,rightAimActive,firing,scene,transitioning:V091Fortress.transitioning})'));}
function compact(frames){return frames.filter((f,i)=>i===0||f!==frames[i-1]);}
const walkId=catalog.actors.body.unarmed,idleId=catalog.actors.unarmed?.idle;
async function load(r){await r.eval('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');}
async function main(){
 const before=make('qa/pre-master/index.html'),r=make(),E=s=>r.eval(s),B=s=>before.eval(s),raw=B('JSON.stringify(captureGameProgress())');
 await load(r);
 const baseCode=`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);V014Controls.stopRoute();stopControls(true);V010World.setSneaking(false);V010Camera.resetTouch();el('fade').classList.remove('show');scene='surface';player.wallLevel=false;player.x=800;player.y=850;player.walkAnimation=0;player.moving=false;player.running=false;player.aimX=1;player.aimY=0;menuOpen=false;playerDead=false;document.hidden=false;frameScale=1;zombies=[];V013City.setFloor(0);`;
 function fresh(code=''){for(const q of [before,r])q.eval(baseCode+code);E('ActorVisuals.pose(null)');}
 function pair(code){B(code);E(code);}
 function step(code='updatePlayer();',ms=1000/60){for(const q of [before,r]){q.advance(ms);q.eval(code);}return plain(E('ActorVisuals.pose(null)'));}
 function equalState(){assert.deepEqual(snapshot(r),snapshot(before));}
 await check('source.allGameplayOwnersByteIdenticalTo029',()=>{
  const hashes=require('./pre-master/source-hashes.json'),allowed=new Set(['src/assets/manifest.js','src/render/actors.js','src/core/rendering.js','src/world/fishing.js','src/ui/maps-windows.js','src/base/construction.js']);
  for(const [file,expected]of Object.entries(hashes))if(!require('./corrective-contract.cjs').sourceChanges.has(file)&&!allowed.has(file))assert.equal(sha(fs.readFileSync(file)),expected,file+' changed');
 });
 await check('assets.exactApprovedIdleAndPolishedTwelveFramePNG',()=>{
  assert.equal(sha(fs.readFileSync(catalog.images[walkId].path)),'9603c13125f2e30d6651b181b67754338501fdad49e339af7667d4cd3d426ce5');
  assert.equal(sha(fs.readFileSync(catalog.images[idleId].path)),'15b7e104533b9470282c3cc84fa16a6ff50207a0e93c04f4b528b788958e2011');
  assert.deepEqual(catalog.images[walkId].atlas,{layout:'grid',columns:6,rows:2,frameSize:[384,384],frameCount:12});
  assert.equal(catalog.images[idleId].atlas.frameCount,1);
 });
 await check('assets.approvedEquipmentPreservesUnarmedSleepAndZombies',()=>{
  const prior=plain(B('AssetManifest'));
  assert.deepEqual(catalog.actors.unarmed,{idle:'actor/unarmed_idle',pivot:[192,192],bodyScale:.125,walkCount:12,cycleDistance:75.6,walkScale:.94,contactPhases:[0,.5]});
  assert.deepEqual(catalog.images[catalog.actors.body.sleep],prior.images[prior.actors.body.sleep]);
  for(const [id,d]of Object.entries(catalog.images))if(id.startsWith('art/monster_')||id.startsWith('art/corpse_'))assert.deepEqual(d,prior.images[id]);
  for(const d of Object.values(catalog.actors.modular.items))assert.equal(d.walk.length,12);
 });
 await check('save.full029PayloadLoadsUnchanged',()=>{fresh();equalState();assert.equal(E('captureGameProgress().saveVersion'),3);});
 await check('save.roundtripAfterAnimationKeepsIdentityInventoryAndWorld',()=>{
  fresh('movePower=1;moveX=1;moveY=0;');for(let i=0;i<35;i++)step();
  pair('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())))');equalState();
 });
 await check('idle.timeAndRepeatedRenderingNeverAnimateOrMutateGame',()=>{
  fresh();const state=snapshot(r),frames=[];
  for(let i=0;i<30;i++){frames.push(plain(E('ActorVisuals.pose(null)')));E('ActorVisuals.drawPlayer(Math.PI/2,null,0)');}
  assert.ok(frames.every(p=>p.id===idleId&&p.frame===0));assert.deepEqual(snapshot(r),state);
 });
 for(const mode of ['PC','MOBILE'])for(const direction of [
  ['forward',1,0,1,0],['backward',-1,0,1,0],['strafeLeft',0,-1,1,0],['strafeRight',0,1,1,0],['diagonal',.7,.7,1,0]
 ])await check('movement.'+mode+'.'+direction[0]+'.sameGameplayAndTwelveValidFrames',()=>{
  const [,dx,dy,ax,ay]=direction;fresh(`GameInput.setMode('${mode}');moveX=${dx};moveY=${dy};movePower=.6;player.aimX=${ax};player.aimY=${ay};`);
  const seen=new Set();for(let i=0;i<48;i++){const p=step();assert.equal(p.id,walkId);assert.ok(p.frame>=0&&p.frame<12);seen.add(p.frame);equalState();}
  assert.ok(seen.size>=4,'movement did not advance visual gait');assert.equal(E('player.radius'),10);
  assert.equal(E('player.aimX'),ax);assert.equal(E('player.aimY'),ay);
 });
 for(const fps of [60,30,20])await check('timing.'+fps+'fps.fullStickDistanceBasedCadence',()=>{
  fresh(`moveX=1;moveY=0;movePower=1;frameScale=${60/fps};`);
  const frames=[],start=E('player.x');for(let i=0;i<Math.ceil(fps*1.22);i++){frames.push(step('updatePlayer();',1000/fps).frame);equalState();}
  const sequence=compact(frames),maxAdvance=Math.ceil(E('player.runSpeed')*.6*(60/fps)/catalog.actors.unarmed.cycleDistance*12);
  assert.ok(new Set(sequence).size>=(fps>=30?12:8));
  for(let i=1;i<sequence.length;i++){const advance=(sequence[i]-sequence[i-1]+12)%12;assert.ok(advance>=1&&advance<=maxAdvance,'frame advance exceeds distance-based cadence');}
  assert.ok(sequence.some((f,i)=>i&&sequence[i-1]>f),'walk cycle never wrapped');
  const travelled=E('player.x')-start;rates.push({fps,distance:travelled,elapsedMs:frames.length*1000/fps,frames:sequence});
 });
 await check('timing.analogAndSneakFollowActualDistance',()=>{
  const measurements=[];
  for(const [power,sneak]of [[1,false],[.5,false],[1,true]]){
   fresh(`moveX=1;moveY=0;movePower=${power};V010World.setSneaking(${sneak});`);
   const start=E('player.x'),frames=[];
   for(let i=0;i<42;i++){frames.push(step().frame);equalState();}
   measurements.push({power,sneak,distance:E('player.x')-start,changes:compact(frames).length-1});
  }
  assert.ok(measurements[0].changes>=6);
  assert.ok(measurements[1].changes<measurements[0].changes);
  assert.ok(measurements[2].changes<measurements[0].changes);
  assert.ok(Math.abs(measurements[2].distance/measurements[0].distance-.5)<1e-10);
  rates.push({analog:measurements});
 });
 await check('collision.blockedInputUsesIdleWithoutChangingPhysicalMovement',()=>{
  fresh('player.x=800;player.y=212;moveX=0;moveY=-1;movePower=1;player.aimX=0;player.aimY=-1;');
  assert.equal(E('worldCollision(player.x,player.y,player.radius,scene)'),false);const start=plain(E('({x:player.x,y:player.y})'));
  for(let i=0;i<30;i++){const p=step();assert.equal(p.id,idleId);equalState();}
  assert.deepEqual(plain(E('({x:player.x,y:player.y})')),start);assert.equal(E('player.moving'),true,'original owner input state was changed');
 });
 await check('transitions.startStopAndRepeatedPoseQueriesRemainStable',()=>{
  fresh();assert.equal(E('ActorVisuals.pose(null).id'),idleId);pair('moveX=1;moveY=0;movePower=.8;');
  for(let i=0;i<24;i++){const p=step();for(let j=0;j<5;j++)assert.deepEqual(plain(E('ActorVisuals.pose(null)')),p);}
  pair('movePower=0;');step();assert.equal(E('ActorVisuals.pose(null).id'),idleId);equalState();
  pair('movePower=.8;');assert.equal(step().id,walkId);equalState();
 });
 await check('aim.fastTurnsAndCircularMovementKeepExistingPositionAndAim',()=>{
  fresh('movePower=.8;');
  for(let i=0;i<120;i++){
   const a=i*Math.PI/60,aim=i*1.93;pair(`moveX=${Math.cos(a)};moveY=${Math.sin(a)};player.aimX=${Math.cos(aim)};player.aimY=${Math.sin(aim)};`);
   const p=step();assert.equal(p.id,walkId);const prior=snapshot(r);E('ActorVisuals.drawPlayer(Math.atan2(player.aimY,player.aimX),null,0)');assert.deepEqual(snapshot(r),prior);equalState();
  }
 });
 await check('rotation.idleAndAllTwelveFramesUseOneGroundAnchorAndScale',()=>{
  fresh();E(`window.masterMatrices=[];window.masterOriginalDraw=ctx.drawImage;ctx.drawImage=function(im,...args){if(im===GameAssets.image('${walkId}')||im===GameAssets.image('${idleId}')){const m=ctx.getTransform();masterMatrices.push({args,m:[m.a,m.b,m.c,m.d,m.e,m.f]});}return masterOriginalDraw.call(this,im,...args);};`);
  try{for(const id of [idleId,walkId])for(let i=0;i<(id===idleId?1:12);i++)for(const angle of [0,.73,Math.PI,4.92]){
   E(`ctx.setTransform(1,0,0,1,0,0);ActorVisuals.renderPose({kind:'unarmed',id:'${id}',frame:${i},item:null,hands:null},150,150,${angle});`);
   const {m}=plain(E('masterMatrices.at(-1)')),pivot=[m[0]*192+m[2]*192+m[4],m[1]*192+m[3]*192+m[5]];
   assert.ok(Math.hypot(pivot[0]-150,pivot[1]-150)<1e-4,'rotation shifted ground anchor');
   assert.ok(Math.abs(Math.hypot(m[0],m[1])-.125*catalog.actors.visualScale*(id===walkId?catalog.actors.unarmed.walkScale:1))<1e-6,'pose scale differs from requested visual correction');
  }}finally{E('ctx.drawImage=masterOriginalDraw');}
 });
 await check('legacy.M4RetainedAndApprovedItemsUseExistingMotion',()=>{
  fresh();assert.equal(E("ActorVisuals.pose('rifle_m4')"),null);
  for(const item of ['rifle_ak74','axe','pickaxe','hammer','fishing_rod','remote','flashlight'])assert.equal(E(`ActorVisuals.pose('${item}').modular`),true);
  equalState();
 });
 await check('doors.realManualDoorOpensAndPlayerCrossesUnchanged',()=>{
  fresh("scene='bunker';player.x=802;player.y=1010;player.aimX=1;player.aimY=0;window.masterDoor=interactionObjects().find(o=>o.id==='v09door_storage');executeInteraction(masterDoor);");
  assert.equal(E("v09Doors.find(d=>d.id==='v09door_storage').manual"),true);
  for(let i=0;i<32;i++){pair('V09Power.tick(1/60)');step();}pair('moveX=1;moveY=0;movePower=.8;');
  const frames=new Set();for(let i=0;i<32;i++){pair('V09Power.tick(1/60)');frames.add(step().frame);equalState();}
  assert.ok(E('player.x>860'),'player did not cross open doorway');assert.ok(frames.size>=3);
 });
 await check('stairs.actualAscentDescentRetainsTimingPositionHitbox',()=>{
  fresh("window.masterStair=V091Fortress.stairs[0];player.x=masterStair.foot.x;player.y=masterStair.foot.y;window.masterTarget=interactionObjects().find(o=>o.id==='v091stairs_'+masterStair.id);executeInteraction(masterTarget);");
  assert.equal(E('V091Fortress.transitioning'),true);const frames=new Set();
  for(let i=0;i<45;i++){const p=step();if(p.id===walkId)frames.add(p.frame);equalState();}
  assert.equal(E('V091Fortress.isElevated()'),true);assert.equal(E('V091Fortress.transitioning'),false);assert.ok(frames.size>=4);
  pair("executeInteraction(interactionObjects().find(o=>o.id==='v091stairs_'+masterStair.id))");
  assert.equal(E('V091Fortress.transitioning'),true);for(let i=0;i<45;i++){step();equalState();}assert.equal(E('V091Fortress.isElevated()'),false);
 });
 await check('sleep.sameRestOwnerHealthAndCollisionWithFourBreathingFrames',()=>{
  fresh("scene='bunker';player.x=1210;player.y=-115;player.health=50;");pair("V011Living.start('rest')");equalState();
  const location=plain(E('({x:player.x,y:player.y,radius:player.radius})'));
  const pixels=ms=>{E(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ActorVisuals.drawSleep({x:80,y:20,w:99,h:198},${ms});`);return Buffer.from(r.canvas.getContext('2d').getImageData(0,0,320,320).data);};
  const frames=[0,1200,2400,3600].map(ms=>sha(pixels(ms)));assert.equal(new Set(frames).size,4);assert.ok(pixels(0).equals(pixels(4800)));
  const im=pixels(600);for(let y=0;y<320;y++)for(let x=0;x<320;x++)if(im[(y*320+x)*4+3])assert.ok(x>=80&&x<179&&y>=20&&y<218,'sleep sprite escaped bed');
  pair('for(let i=0;i<10;i++)V011Living.tick(100)');equalState();assert.ok(Math.abs(E('player.health')-51)<1e-10);assert.deepEqual(plain(E('({x:player.x,y:player.y,radius:player.radius})')),location);
  pair('V011Living.stop()');equalState();
 });
 for(const viewport of [{id:'pc',width:1280,height:800,maxTouchPoints:0},{id:'portrait',width:390,height:844,maxTouchPoints:5},{id:'landscape',width:844,height:390,maxTouchPoints:5}])await check('viewport.'+viewport.id+'.surfaceInteriorZoomAndAssets',async()=>{
  const v=make('index.html',viewport);await load(v);v.eval(baseCode);
  for(const which of ['surface','bunker'])for(const zoom of [.55,1,1.8]){
   v.eval(`scene='${which}';player.x=${which==='surface'?800:725};player.y=${which==='surface'?850:650};V010Camera.zoom=${zoom};updateCamera();`);
   const state=snapshot(v);v.eval('draw()');assert.deepEqual(snapshot(v),state);
  }
  const stats=plain(v.eval('GameAssets.stats()'));assert.ok(stats.entries.every(x=>x.status==='ready'));assert.deepEqual(v.errors,[]);
 });
 await check('cache.noRepeatedRequestsAfterMovementRestAndEquipmentChanges',()=>{
  const count=r.imageRequests.length;fresh('movePower=1;moveX=1;moveY=0;');
  for(let i=0;i<24;i++){step();for(const item of [null,'rifle_ak74','axe','pickaxe','hammer'])E(`ActorVisuals.drawPlayer(.5,${JSON.stringify(item)},0)`);E('ActorVisuals.drawSleep(V011Living.bed,1200)');}
  assert.equal(r.imageRequests.length,count);assert.equal(new Set(r.imageRequests).size,count);
 });
 await check('console.allCandidateAndFrozenRuntimesClean',()=>{for(const v of runtimes)assert.deepEqual(v.errors,[]);});
 const result={version:require('../package.json').version,reference:'frozen 0.29.0 before MASTER integration',passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,rates,checks,limitations:['VM with modeled DOM and real Canvas2D; physical PC browser, phone and Telegram WebView are manual checks.','Pixel identity, frame order and state isolation tests do not prove artistic gait quality; use supplied visual previews.']};
 fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});fs.writeFileSync(path.join(__dirname,'results/master-unarmed.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL'),rates},null,2));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
