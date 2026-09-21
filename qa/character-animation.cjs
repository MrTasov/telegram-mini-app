// Visual patch regression against the EXACT stable 0.28 executable.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs'),checks=[];
const plain=v=>JSON.parse(JSON.stringify(v)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
const capture=r=>{const d=require('./corrective-contract.cjs').resourceProjection(r.eval('captureGameProgress()'));d.gameVersion='metadata';return d;};
async function main(){
 const before=setup('qa/pre-character/index.html'),r=setup('index.html'),E=s=>r.eval(s),catalog=require('../assets/manifest.json'),cfg=catalog.actors;
 await E('Promise.all(Object.keys(AssetManifest.images).filter(id=>!AssetManifest.images[id].historical).map(id=>GameAssets.load(id)))');
 await check('gameplay.exactSpecs',()=>assert.deepEqual(plain(E('V017Monsters.specs')),plain(before.eval('V017Monsters.specs'))));
 await check('save.028FullCaptureCompatible',()=>{const old=before.eval('JSON.stringify(captureGameProgress())');for(const q of [before,r])q.eval(`restoreGameProgress(decodeGameProgress(${JSON.stringify(old)}))`);assert.deepEqual(capture(r),capture(before));});
 for(const mode of ['PC','MOBILE'])await check('simulation.exact028.'+mode,()=>{
  for(const q of [before,r])q.eval(`GameInput.setMode('${mode}');scene='surface';menuOpen=false;playerDead=false;player.x=800;player.y=850;frameScale=1;movePower=0;WorldClock.set?.({day:1,minute:840});`);
  for(let i=0;i<90;i++){for(const q of [before,r]){q.advance(16.667);q.eval('update();');}if(i%30===29)assert.deepEqual(capture(r),capture(before));}
 });
 await check('render.noGameplayMutation',()=>{
  E('scene="surface";player.x=800;player.y=850;updateCamera();zombies.forEach(z=>V017Monsters.prepare(z));');const state=capture(r);
  E('for(let i=0;i<12;i++){drawPlayer();zombies.forEach(drawZombie);}');assert.deepEqual(capture(r),state);
 });
 await check('walk.twelveMasterFrames',()=>{assert.equal(cfg.unarmed.walkCount,12);assert.equal(catalog.images[cfg.body.unarmed].atlas.frameCount,12);});
 await check('walk.backwardsUsesSameAimAndPhase',()=>{E('player.moving=true;player.aimX=1;player.aimY=0;moveX=-1;moveY=0;ActorVisuals.pose("rifle_ak74");player.walkAnimation+=.21;player.x-=2;');assert.equal(E('ActorVisuals.pose("rifle_ak74").frame'),E('ActorVisuals.pose(null).frame'));assert.equal(E('player.aimX'),1);E('moveX=moveY=0');});
 await check('tools.sharedCarryBodyAndTwelveStrikePhases',()=>{
  E('player.moving=false;chopState={startedAt:Date.now(),duration:1200};');const frames=[];let elapsed=1;
  for(const duration of cfg.modular.items.axe.action.durations){E(`chopState.startedAt=Date.now()-${elapsed/cfg.gathering.playbackRate}`);frames.push(E('ActorVisuals.pose("axe").frame'));elapsed+=duration;}
  assert.deepEqual(frames,Array.from({length:12},(_,i)=>i));E('chopState=null');
  assert.equal(cfg.modular.items.axe.body,cfg.modular.items.pickaxe.body);assert.equal(cfg.modular.items.axe.body,cfg.modular.items.hammer.body);
 });
 await check('idle.plantedSeparatePose',()=>{E('player.moving=false');assert.equal(E('ActorVisuals.pose(null).id'),'actor/unarmed_idle');assert.equal(E('ActorVisuals.pose("rifle_ak74").mode'),'idle');});
 const shot=code=>{E('ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,1280,800);'+code);return Buffer.from(r.canvas.getContext('2d').getImageData(0,0,320,320).data);};
 for(const item of [null,'rifle_ak74','axe','pickaxe','hammer'])await check('pixels.distinct.'+(item||'unarmed'),()=>{
  const count=['axe','pickaxe','hammer'].includes(item)?24:12,frames=new Set();
  for(let i=0;i<count;i++){
   const p=item?`ActorVisuals.framePose('${item}','${i>=12?'work':'walk'}',${i%12})`:`{kind:'unarmed',id:ActorVisuals.config.body.unarmed,item:null,frame:${i}}`;
   const pixels=shot(`ActorVisuals.renderPose(${p},150,150,Math.PI/2)`);assert.ok(pixels.some(x=>x));frames.add(hash(pixels));
  }assert.equal(frames.size,count);
 });
 await check('attachment.commonRootAllRotations',()=>{
  for(const item of Object.keys(cfg.modular.items))for(let i=0;i<12;i++)for(const angle of [0,.7,Math.PI,4.8]){
   assert.deepEqual(plain(E(`ActorVisuals.worldPoint(ActorVisuals.framePose('${item}','walk',${i}),[448,448],150,150,${angle})`)),{x:150,y:150});
  }
 });
 await check('sleep.liveRestOwnerFourFramesLoop',()=>{
  E('scene="bunker";player.x=1210;player.y=-115;player.health=50;movePower=0;navigation=null;');assert.equal(E('V011Living.start("rest")'),true);
  const location=plain(E('({x:player.x,y:player.y,radius:player.radius})')),frames=new Set();
  for(let i=0;i<4;i++)frames.add(hash(shot(`ActorVisuals.drawSleep({x:90,y:20,w:99,h:198},${i*1200});`)));assert.equal(frames.size,4);
  assert.ok(shot('ActorVisuals.drawSleep({x:90,y:20,w:99,h:198},0);').equals(shot('ActorVisuals.drawSleep({x:90,y:20,w:99,h:198},4800);')));
  E('for(let i=0;i<10;i++)V011Living.tick(100);');assert.ok(Math.abs(E('player.health')-51)<1e-8);assert.deepEqual(plain(E('({x:player.x,y:player.y,radius:player.radius})')),location);E('V011Living.stop()');
 });
 for(const type of ['normal','heavy','fast','leaper','bloater'])await check('enemy.'+type+'.walkAttackCorpseHitbox',()=>{
  const frames=new Set();E(`scene='surface';player.x=800;player.y=850;updateCamera();window.visualZombie=makeZombie(800,850);visualZombie.type='${type}';V017Monsters.prepare(visualZombie).angle=Math.PI/2;`);
  const radius=E('visualZombie.radius');
  for(let i=0;i<12;i++){
   const p=shot(`{const z=visualZombie,s=V017Monsters.prepare(z);s.walk=${i*4.5};s.attack=${i>=8?`performance.now()+400-(${i-8}+.2)*100`:'0'};ctx.save();ctx.translate(-650,-700);drawZombie(z);ctx.restore();}`);assert.ok(p.some(x=>x));frames.add(hash(p));
  }assert.equal(frames.size,12);assert.equal(E('visualZombie.radius'),radius);
  for(let i=0;i<3;i++)assert.ok(shot(`{const z=visualZombie,s=V017Monsters.prepare(z);z.alive=false;s.deadAt=performance.now();s.variant=${i};ctx.save();ctx.translate(-650,-700);drawZombie(z);ctx.restore();}`).some(x=>x));
  const d=catalog.images['art/monster_'+E(`V017Monsters.specs['${type}'].art`)+'017'];assert.equal(d.visualScale,.88);
 });
 await check('cache.noRepeatedLoadsOnPoseChanges',()=>{const n=r.imageRequests.length;E('for(let n=0;n<100;n++){for(const item of [null,"rifle_ak74","axe","pickaxe","hammer"]){const p=ActorVisuals.pose(item);ActorVisuals.renderPose(p,200,200,n*.01);}ActorVisuals.drawSleep(V011Living.bed,n*100);}');assert.equal(r.imageRequests.length,n);assert.equal(new Set(r.imageRequests).size,n);assert.ok(!r.imageRequests.some(p=>Object.values(catalog.images).some(d=>d.historical&&d.path===p)));});
 const oldManifest=before.eval('AssetManifest'),oldBytes=Object.entries(oldManifest.images).filter(([id])=>id.startsWith('art/monster_')).reduce((n,[,d])=>n+d.size[0]*d.size[1]*4,0),newBytes=Object.entries(catalog.images).filter(([id,d])=>!d.historical&&(id.startsWith('art/monster_')||id.startsWith('actor/'))).reduce((n,[,d])=>n+d.size[0]*d.size[1]*4,0);
 await check('memory.characterAtlasesWithin40MiB',()=>assert.ok(newBytes<40*1024*1024));
 await check('console.clean',()=>assert.deepEqual(r.errors,[]));
 const result={version:'0.29.0',reference:'0.28.0',passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,memory:{oldZombieDecodedBytes:oldBytes,newZombieAndPlayerDecodedBytes:newBytes,sleepBlendCanvasBytes:192*288*4,deltaBytes:newBytes+192*288*4-oldBytes,scope:'RGBA pixel estimate, corpse and all other shared images unchanged; not process RSS'},checks};
 fs.writeFileSync('qa/results/character-animation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
