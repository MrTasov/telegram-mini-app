// Visual patch regression against the EXACT stable 0.28 executable.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs'),checks=[];
const plain=v=>JSON.parse(JSON.stringify(v)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
const capture=r=>{const d=plain(r.eval('captureGameProgress()'));d.gameVersion='metadata';return d;};
async function main(){
 const before=setup('qa/pre-character/index.html'),r=setup('index.html'),E=s=>r.eval(s),catalog=require('../assets/manifest.json'),cfg=catalog.actors;
 await E('Promise.all(Object.keys(AssetManifest.images).filter(id=>!id.startsWith("historical/")).map(id=>GameAssets.load(id)))');
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
 await check('walk.existingPhaseEightFrames',()=>{E('player.moving=true');const got=[];for(let i=0;i<8;i++){E(`player.walkAnimation=${(i+.05)*Math.PI*2/8}`);got.push(E('ActorVisuals.pose(null).frame'));}assert.deepEqual(got,[0,1,2,3,4,5,6,7]);});
 await check('walk.backwardsUsesSameAimAndPhase',()=>{E('player.moving=true;player.aimX=1;player.aimY=0;moveX=-1;moveY=0;player.walkAnimation=Math.PI/2');assert.equal(E('ActorVisuals.pose("rifle_ak74").frame'),6);assert.equal(E('player.aimX'),1);E('moveX=moveY=0');});
 await check('tools.sharedBodyAndFullStrike',()=>{
  E('player.moving=false;chopState={startedAt:Date.now(),duration:1800};');const frames=[];
  for(let i=0;i<8;i++){E(`chopState.startedAt=Date.now()-${i*112.5+1}`);frames.push(E('ActorVisuals.pose("axe").frame'));}assert.deepEqual(frames,[8,9,10,11,12,13,14,15]);E('chopState=null');
  assert.equal(cfg.items.axe.body,cfg.items.pickaxe.body);assert.equal(cfg.items.axe.body,cfg.items.hammer.body);
 });
 await check('idle.plantedSeparatePose',()=>{E('player.moving=false');assert.equal(E('ActorVisuals.pose(null).id'),'actor/idle');assert.equal(E('ActorVisuals.pose("rifle_ak74").frame'),1);});
 const shot=code=>{E('ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,1280,800);'+code);return Buffer.from(r.canvas.getContext('2d').getImageData(0,0,320,320).data);};
 for(const kind of ['unarmed','rifle','tool'])for(const item of kind==='tool'?['axe','pickaxe','hammer']:[kind==='rifle'?'rifle_ak74':null]){
  await check('pixels.distinct.'+(item||'unarmed'),()=>{
   const frames=new Set();for(let i=0;i<(kind==='tool'?16:8);i++){
    const code=`{const c=ActorVisuals.config;ActorVisuals.renderPose({kind:'${kind}',id:c.body.${kind},item:${JSON.stringify(item)},frame:${i},hands:${kind==='unarmed'?'null':`c.${kind}Hands[${i}]`}},150,150,Math.PI/2);}`;
    const pixels=shot(code);assert.ok(pixels.some(x=>x));frames.add(hash(pixels));
   }assert.equal(frames.size,kind==='tool'?16:8);
  });
 }
 await check('attachment.renderedGripAtHandAllRotations',()=>{
  E(`window.gripAudit=[];window.originalActorDrawImage=ctx.drawImage;ctx.drawImage=function(im,...a){if(im===GameAssets.image(ActorVisuals.config.equipment)){const m=ctx.getTransform();gripAudit.push({args:a,m:[m.a,m.b,m.c,m.d,m.e,m.f]});}return originalActorDrawImage.call(this,im,...a);};`);
  try{for(const [item,d]of Object.entries(cfg.items))for(let i=0;i<cfg[d.body+'Hands'].length;i++)for(const angle of [0,.7,Math.PI,4.8]){
   E(`{const c=ActorVisuals.config;ActorVisuals.renderPose({kind:'${d.body}',id:c.body.${d.body},item:'${item}',frame:${i},hands:c.${d.body}Hands[${i}]},150,150,${angle});}`);
   const {args:a,m}=plain(E('gripAudit.at(-1)')),pair=cfg[d.body+'Hands'][i],ha=Math.atan2(pair[1][1]-pair[0][1],pair[1][0]-pair[0][0]),ba=d.body==='rifle'?angle-ha:angle-Math.PI/2;
   const gx=a[4]+d.grip[0]*a[6]/a[2],gy=a[5]+d.grip[1]*a[7]/a[3],actual=[m[0]*gx+m[2]*gy+m[4],m[1]*gx+m[3]*gy+m[5]];
   const hx=(pair[0][0]-cfg.pivot[0])*cfg.bodyScale,hy=(pair[0][1]-cfg.pivot[1])*cfg.bodyScale,expected=[150+hx*Math.cos(ba)-hy*Math.sin(ba),150+hx*Math.sin(ba)+hy*Math.cos(ba)];
   assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<.001,item+' grip detached');assert.ok(Math.abs(Math.hypot(m[0],m[1])*a[6]/a[2]-d.scale)<.001,item+' scale jitter');
  }}finally{E('ctx.drawImage=originalActorDrawImage');}
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
 const oldManifest=before.eval('AssetManifest'),oldBytes=Object.entries(oldManifest.images).filter(([id])=>id.startsWith('art/monster_')).reduce((n,[,d])=>n+d.size[0]*d.size[1]*4,0),newBytes=Object.entries(catalog.images).filter(([id])=>id.startsWith('art/monster_')||id.startsWith('actor/')).reduce((n,[,d])=>n+d.size[0]*d.size[1]*4,0);
 await check('memory.moreFramesLessActiveDecodedPixels',()=>assert.ok(newBytes<oldBytes));
 await check('console.clean',()=>assert.deepEqual(r.errors,[]));
 const result={version:'0.29.0',reference:'0.28.0',passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,memory:{oldZombieDecodedBytes:oldBytes,newZombieAndPlayerDecodedBytes:newBytes,sleepBlendCanvasBytes:192*288*4,deltaBytes:newBytes+192*288*4-oldBytes,scope:'RGBA pixel estimate, corpse and all other shared images unchanged; not process RSS'},checks};
 fs.writeFileSync('qa/results/character-animation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
