// Semantic input/animation/audio/combat tests with the existing game harness.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),cfg=require('../assets/manifest.json').actors,checks=[];
const plain=v=>JSON.parse(JSON.stringify(v)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
const meter={requests:[],events:[],active:new Set(),maxActive:0,gains:0,sources:0,htmlAudio:0};let sandbox;
const options={width:390,height:844,maxTouchPoints:5,beforeScripts:s=>{
 sandbox=s;
 const Base=s.Audio;s.Audio=class extends Base{constructor(...a){super(...a);meter.htmlAudio++;}};
 s.fetch=async url=>{meter.requests.push(url);const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 s.AudioContext=class{
  state='running';destination={};get currentTime(){return s.performance.now()/1000;}resume(){return Promise.resolve();}
  async decodeAudioData(data){const d=new DataView(data);assert.equal(d.getUint32(0,false),0x52494646);return {duration:(data.byteLength-44)/(d.getUint32(24,true)*2)};}
  createGain(){meter.gains++;return {gain:{value:1},connect(){},disconnect(){}};}
  createBufferSource(){meter.sources++;const ctx=this;return {buffer:null,loop:false,playbackRate:{value:1},connect(){},disconnect(){},start(){this.end=ctx.currentTime+this.buffer.duration/this.playbackRate.value;meter.active.add(this);meter.maxActive=Math.max(meter.maxActive,meter.active.size);},stop(){meter.active.delete(this);this.onended?.();}};}
 };
}};
async function main(){
 const r=setup('index.html',{},options),E=s=>r.eval(s),J=s=>plain(E(s));
 await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 await E('preloadGameAudio()');await E('preloadGameAudio()');
 E(`window.realAnimationSound=playAnimationSound;playAnimationSound=function(name,channel,volume,rate){window.audioEvents.push({name,channel,at:performance.now(),pose:ActorVisuals.pose(heldItem())?.frame});return realAnimationSound(name,channel,volume,rate);};window.audioEvents=[];`);
 const original=E('JSON.stringify(captureGameProgress())');
 function reset(){E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(original)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);stopControls();V014Controls.stopRoute();scene='surface';player.wallLevel=false;player.x=800;player.y=850;player.aimX=1;player.aimY=0;player.moving=false;playerDead=false;document.hidden=false;frameScale=1;el('fade').classList.remove('show');zombies=[];masterVolume=.7;updateFootstepsAudio();audioEvents=[];`);}
 function advance(ms=1000/60,code='updateFootstepsAudio()'){
  r.advance(ms);for(const source of [...meter.active])if(source.end<=sandbox.performance.now()/1000){meter.active.delete(source);source.onended?.();}E(code);
 }
 check('scope.onlyDeclaredPresentationSourcesChanged',()=>{const hashes=require('./pre-polish/source-hashes.json'),allowed=require('./polish-contract.cjs').sourceChanges;for(const [f,h]of Object.entries(hashes))if(!allowed.has(f))assert.equal(sha(fs.readFileSync(f)),h,f);});
 check('assets.threeWavFilesDecodedOnce',()=>{assert.deepEqual([...meter.requests].sort(),['assets/audio/effects/chop_wood.wav','assets/audio/effects/footstep_boot.wav','assets/audio/effects/mine_rock.wav']);assert.deepEqual(J('Object.keys(audioBuffers).sort()'),['chopWood','footsteps','mineRock']);});
 check('assets.noDuplicateImages',()=>assert.equal(r.imageRequests.length,new Set(r.imageRequests).size));
 check('gameplay.definitionsAndMiningOwnersByteIdentical',()=>{const hashes=require('./pre-polish/source-hashes.json');for(const f of ['src/config/gameplay.js','src/crafting/manufacturing.js','src/world/resources.js','src/ui/context-map.js','src/save/legacy-progress.js','src/drones/companion.js'])assert.equal(sha(fs.readFileSync(f)),hashes[f]);});
 for(const material of ['tree','stone','iron_ore','copper_ore','coal'])check('gathering.'+material+'.twoCyclesAndSynchronizedHits',()=>{
  reset();const tree=material==='tree',item=tree?'axe':'pickaxe';
  E(`window.testResource=${tree?'worldTrees[0]':`V09World.ores.find(o=>o.type==='${material}')`};window.testJob=interactionObjects().find(o=>o.id===testResource.id);player.x=testResource.x+testResource.r+25;player.y=testResource.y;executeInteraction(testJob);updateFootstepsAudio();audioEvents=[];`);
  const duration=E(tree?'chopState.duration':'V09World.miningState().duration'),cycle=duration/2;
  assert.equal(duration,tree?2300:1800);const frames=[];
  // Observe the job through its existing timing owner up to just before completion.
  for(let i=0;i<120;i++){
   const elapsed=(i+.1)*duration/120;
   if(tree)E(`chopState.startedAt=Date.now()-${elapsed}`);else E(`V09World.resumeMining({...V09World.miningState(),elapsed:${elapsed}})`);
   E('updateFootstepsAudio()');frames.push(E(`ActorVisuals.pose('${item}').frame`));
  }
  assert.equal(new Set(frames.slice(0,60)).size,12);assert.deepEqual(frames.slice(0,60),frames.slice(60));
  const events=J('audioEvents');assert.equal(events.length,2);assert.ok(events.every(e=>e.name===(tree?'chopWood':'mineRock')&&e.pose===7));
  assert.equal(E(tree?'chopState.duration':'V09World.miningState().duration'),duration);
  assert.equal(E(`ActorVisuals.pose('${item}').work.cycleMs`),cycle);
  const count=E('audioEvents.length');for(let i=0;i<20;i++)E('updateFootstepsAudio();drawPlayer()');assert.equal(E('audioEvents.length'),count);
 });
 check('gathering.realTreeYieldAndCompletionUnchanged',()=>{reset();E("window.testResource=worldTrees[0];window.testJob=interactionObjects().find(o=>o.id===testResource.id);player.x=testResource.x+testResource.r+25;player.y=testResource.y;window.woodBefore=bagCount('wood');executeInteraction(testJob);updateFootstepsAudio()");advance(2299,'updateChop();updateFootstepsAudio()');assert.equal(E('testResource.felled'),false);advance(1,'updateChop();updateFootstepsAudio()');assert.equal(E('testResource.felled'),true);assert.equal(E("bagCount('wood')-woodBefore"),10);});
 for(const direction of [1,-1])check('audio.stepsFollowForwardAndBackwardContactPhases.'+direction,()=>{
  reset();E(`player.moving=true;movePower=1;ActorVisuals.pose(null);`);
  const start=E('player.x');
  for(let i=0;i<150;i++)advance(1000/60,`player.x+=${direction*2};player.walkAnimation+=.21;player.moving=true;updateFootstepsAudio();`);
  const steps=J('audioEvents').filter(e=>e.channel==='step');assert.ok(steps.length>=2&&steps.length<=3);assert.ok(steps.every(e=>[0,6].includes(e.pose)));assert.ok(Math.abs(E('player.x')-start)>290);
  E('stopControls();player.moving=false;updateFootstepsAudio()');assert.equal(E("!!animationVoices.get('step')?.source"),false);
 });
 check('audio.blockedPlayerDoesNotPlaySteps',()=>{reset();E('player.moving=true;movePower=1');for(let i=0;i<180;i++)advance(1000/60,'player.walkAnimation+=.21;updateFootstepsAudio()');assert.equal(E('audioEvents.length'),0);});
 check('audio.hiddenAndMutedStopAllVoices',()=>{reset();E("playAnimationSound('footsteps','step');playAnimationSound('mineRock','work');document.hidden=true;updateFootstepsAudio()");assert.equal(meter.active.size,0);E("document.hidden=false;playAnimationSound('footsteps','step');masterVolume=0;updateFootstepsAudio()");assert.equal(meter.active.size,0);});
 check('audio.1000ContactsBoundedSourcesAndReusableGains',()=>{reset();const oldHtml=meter.htmlAudio;for(let i=0;i<1000;i++)advance(250,`playAnimationSound('${i%2?'footsteps':'mineRock'}','${i%2?'step':'work'}',.3,1);`);advance(500,'stopFootsteps();stopAnimationSound("work")');assert.ok(meter.maxActive<=2);assert.equal(meter.gains,2);assert.equal(meter.active.size,0);assert.equal(meter.htmlAudio,oldHtml);assert.equal(E('animationVoices.size'),2);});
 check('audio.resumeDoesNotReplayOldMiningHit',()=>{reset();E("V013Inventory.equip('pickaxe');V09World.resumeMining({id:V09World.ores[0].id,duration:1800,elapsed:800,at:Date.now()});document.hidden=true;updateFootstepsAudio();document.hidden=false;updateFootstepsAudio()");assert.equal(E('audioEvents.length'),0);});
 for(const item of ['rifle_ak74','rifle_m4'])for(const moving of [false,true])check('weapon.'+item+'.muzzleAndTrajectory.'+(moving?'walk':'idle'),()=>{
  reset();E(`addItem('${item}',1);V013Inventory.equip('${item}');V010Combat.currentWeapon().rounds=30;`);assert.equal(E('heldItem()'),item);
  for(let i=0;i<8;i++){
   advance(450,`lastShot=-10000;player.aimX=Math.cos(${i}*Math.PI/4);player.aimY=Math.sin(${i}*Math.PI/4);player.moving=${moving};player.walkAnimation+=.21;player.x+=${moving?2:0};bullets.length=0;shoot();`);
   assert.equal(E('bullets.length'),1);const tip=J('ActorVisuals.muzzlePoint()'),seg=J('ActorVisuals.tracerSegment(bullets[0])');assert.deepEqual(seg.from,tip);assert.deepEqual(seg.to,tip);
   E('bullets[0].x+=bullets[0].dx;bullets[0].y+=bullets[0].dy');assert.deepEqual(J('ActorVisuals.tracerSegment(bullets[0]).from'),tip);
   assert.ok(E('(()=>{const s=ActorVisuals.tracerSegment(bullets[0]),b=bullets[0];return (s.to.x-s.from.x)*b.dx+(s.to.y-s.from.y)*b.dy>0})()'),'a tracer must always move away from the muzzle');
   E('bullets[0].x+=bullets[0].dx*7;bullets[0].y+=bullets[0].dy*7');const after=J('ActorVisuals.tracerSegment(bullets[0])'),real=J('({x:bullets[0].x,y:bullets[0].y})');assert.ok(Math.hypot(after.to.x-real.x,after.to.y-real.y)<1e-9);assert.ok(Math.hypot(after.to.x-after.from.x,after.to.y-after.from.y)<11);
  }
 });
 check('weapon.AKSpriteMuzzleAndWorldAnchorMatchAllWalkFrames',()=>{
  reset();E("window.muzzleMatrix=null;window.realMuzzleDraw=ctx.drawImage;ctx.drawImage=function(im,...a){if(im===GameAssets.image('actor/v4/items'))muzzleMatrix=ctx.getTransform();return realMuzzleDraw.call(this,im,...a);}");
  try{for(let i=0;i<12;i++)for(let a=0;a<8;a++){
   E(`window.p=ActorVisuals.framePose('rifle_ak74','walk',${i});ctx.setTransform(1,0,0,1,0,0);ActorVisuals.renderPose(p,150,150,${a}*Math.PI/4);`);
   const point=J(`ActorVisuals.worldPoint(p,p.record.gear.muzzle,150,150,${a}*Math.PI/4)`),matrix=J('({a:muzzleMatrix.a,b:muzzleMatrix.b,c:muzzleMatrix.c,d:muzzleMatrix.d,e:muzzleMatrix.e,f:muzzleMatrix.f})');
   assert.ok(Math.hypot(point.x-(matrix.a*273+matrix.c*500+matrix.e),point.y-(matrix.b*273+matrix.d*500+matrix.f))<.0001);
  }}finally{E('ctx.drawImage=realMuzzleDraw');}
 });
 check('scale.idleUnchangedMovementOnlySharedLayerTransform',()=>{assert.equal(cfg.visualScale,1.65);assert.equal(cfg.unarmed.walkScale,.94);assert.deepEqual(cfg.modular.walkScale,{firearm:.91,tool:.91,handheld:.9});reset();for(const item of Object.keys(cfg.modular.items)){assert.equal(E(`ActorVisuals.movementScale(ActorVisuals.framePose('${item}','idle'))`),1);for(let i=0;i<12;i++)assert.equal(E(`ActorVisuals.movementScale(ActorVisuals.framePose('${item}','walk',${i}))`),cfg.modular.walkScale[cfg.modular.items[item].body]);}});
 check('scale.corpseExactly120percentOfPrevious',()=>assert.equal(cfg.corpseScaleFromPrevious,1.2));
 check('corpse.cacheSharedByTypeAndPoseAndReplacedOnZoom',()=>{
  reset();E("camera.x=600;camera.y=650;window.corpses=[];for(const type of ['normal','heavy','fast','leaper','bloater'])for(let variant=0;variant<3;variant++){const z=makeZombie(800,850);z.type=type;const pose=V017Monsters.prepare(z);pose.variant=variant;pose.deadAt=performance.now();z.alive=false;z.health=0;corpses.push(z);}");
  for(const scale of [1,1.4,3,1]){E(`ctx.setTransform(${scale},0,0,${scale},0,0);for(let i=0;i<20;i++)for(const z of corpses)drawZombie(z);`);assert.equal(E('V017Monsters.visualCacheStats().corpseRasters'),15);}
  E('ctx.setTransform(1,0,0,1,0,0)');assert.ok(E('V017Monsters.visualCacheStats().corpseRgbaBytes')<180000);
 });
 check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
 const before=setup(path.join(root,'qa/pre-polish/index.html')),B=s=>before.eval(s);
 const init="stopControls();scene='surface';player.x=800;player.y=850;player.wallLevel=false;playerDead=false;menuOpen=false;zombies=[];frameScale=1;V013Inventory.equip('rifle_ak74');V010Combat.currentWeapon().rounds=30;player.aimX=1;player.aimY=0;lastShot=-10000;";
 E(init);B(init);
 check('combat.seededShotsIdenticalDamageAmmoSpreadAndProjectileStates',()=>{
  // Restart both PRNGs from the same state. VFX must not consume gameplay RNG.
  for(const q of [r,before])q.eval("window.seed=781;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};bullets.length=0;");
  for(let i=0;i<35;i++){r.advance(170);before.advance(170);for(const q of [r,before])q.eval('shoot();updateBullets()');assert.deepEqual(J('bullets'),plain(B('bullets')));assert.equal(E('V010Combat.currentWeapon().rounds'),B('V010Combat.currentWeapon().rounds'));assert.deepEqual(J("V010Combat.gunSpec(V010Combat.currentWeapon())"),plain(B("V010Combat.gunSpec(V010Combat.currentWeapon())")));}
 });
 const result={patch:'visual-audio-polish-1',passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,audio:{requests:meter.requests.length,maxActiveSources:meter.maxActive,reusedGainNodes:meter.gains,htmlAudioInstances:meter.htmlAudio},checks};
 fs.writeFileSync('qa/results/polish.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
