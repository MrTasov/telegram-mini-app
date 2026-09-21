const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs');
const manifest=require('../assets/manifest.json'),cfg=manifest.actors,mod=cfg.modular,checks=[];
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),plain=v=>JSON.parse(JSON.stringify(v));
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
(async()=>{
 const r=setup('index.html'),E=s=>r.eval(s);await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 E('scene="surface";player.x=800;player.y=850;player.aimX=0;player.aimY=1;player.moving=false;equipment.body=null;equipment.head=null;');
 await check('source.gameplayOwnersByteIdenticalToDeliveredEquipmentBuild',()=>{
  const hashes=require('./pre-player-visual/source-hashes.json');
  for(const [file,h]of Object.entries(hashes))if(!require('./corrective-contract.cjs').sourceChanges.has(file)&&!['src/render/actors.js','src/assets/manifest.js','src/core/rendering.js'].includes(file))assert.equal(sha(fs.readFileSync(file)),h,file);
  const oldBullets=fs.readFileSync('qa/pre-polish/js/game.js','utf8').match(/function drawBullets\(\)\{[\s\S]*?\n\}/)[0];
  const fallback=fs.readFileSync('src/core/rendering.js','utf8').replace('ctx.scale(AssetManifest.actors.visualScale||1,AssetManifest.actors.visualScale||1);','').replace(/function drawBullets\(\)\{[\s\S]*?\n\}/,oldBullets);
  assert.equal(sha(fallback),hashes['src/core/rendering.js'],'fallback changes must only scale the rendered character');
 });
 E('window.visualCalls=[];window.originalVisualDraw=ctx.drawImage;ctx.drawImage=function(im,...args){const m=ctx.getTransform();visualCalls.push({args,m:[m.a,m.b,m.c,m.d,m.e,m.f],width:im.width,height:im.height});return originalVisualDraw.call(this,im,...args);};');
 await check('scale.unarmedAllFramesAndAllModularStatesExactly165percent',()=>{
  assert.equal(cfg.visualScale,1.65);
  for(const item of [null,...Object.keys(mod.items)])for(const mode of ['idle','walk',...(item&&mod.items[item].action?['work']:[])])for(let i=0;i<(mode==='idle'?1:12);i++){
   const expr=item?`ActorVisuals.framePose('${item}','${mode}',${i})`:`{kind:'unarmed',id:'${mode==='idle'?cfg.unarmed.idle:cfg.body.unarmed}',frame:${i}}`;
   E(`visualCalls=[];ctx.setTransform(1,0,0,1,0,0);ActorVisuals.renderPose(${expr},200,200,.73);`);
   const calls=plain(E('visualCalls')),body=item?mod.items[item][mode==='work'?'action':mode]?.frames?.[i]?.body|| (mode==='walk'?mod.items[item].walk[i].body:mod.items[item].idle.body):{id:mode==='idle'?cfg.unarmed.idle:cfg.body.unarmed};
   const size=manifest.images[body.id].size,call=calls.find(c=>c.width===size[0]&&c.height===size[1]);assert.ok(call,item+' '+mode);
   const correction=mode==='walk'?(item?mod.walkScale[mod.items[item].body]:cfg.unarmed.walkScale):1;
   assert.ok(Math.abs(Math.hypot(call.m[0],call.m[1])-.125*1.65*correction)<1e-6,item+' '+mode+' scale');
  }
 });
 await check('scale.sleepExactly165percentSameFourBreathingFrames',()=>{
  E('visualCalls=[];ActorVisuals.drawSleep({x:80,y:20,w:99,h:198},600)');const c=plain(E('visualCalls.at(-1)'));
  assert.ok(Math.abs(c.args[3]-100.8*1.65)<1e-8);assert.equal(cfg.sleep.count,4);assert.equal(cfg.sleep.cycleMs,4800);
 });
 await check('helmet.equippedProtectionDoesNotPaintAnOvalOverHair',()=>{
  E("addItem('helmet1',1);window.visualHelmet=bag.find(i=>i?.type==='helmet1');V010Combat.ensure(visualHelmet);bag[bag.indexOf(visualHelmet)]=null;");
  for(const item of [null,'rifle_ak74','axe','pickaxe','hammer','fishing_rod']){
   const p=item?`ActorVisuals.framePose('${item}','idle')`:`{id:'${cfg.unarmed.idle}',frame:0}`;
   const pixels=helmet=>{E(`equipment.head=${helmet?'visualHelmet':'null'};ctx.clearRect(0,0,1280,800);ActorVisuals.renderPose(${p},150,150,Math.PI/2)`);return r.canvas.getContext('2d').getImageData(0,0,300,300).data;};
   assert.equal(sha(pixels(false)),sha(pixels(true)),item||'unarmed');
  }
  E('V010Combat.getItemStats(equipment.head)');
  const before=E('JSON.stringify({save:captureGameProgress(),stats:V010Combat.getItemStats(equipment.head)})');E('ActorVisuals.drawPlayer(.4,null,0)');assert.equal(E('JSON.stringify({save:captureGameProgress(),stats:V010Combat.getItemStats(equipment.head)})'),before);
 });
 for(const item of ['axe','pickaxe'])await check('tool.'+item+'.twelvePosesThreeViewsPalmsAndRealContact',()=>{
  const a=mod.items[item].action;assert.equal(a.frames.length,12);assert.equal(a.impactFrame,7);assert.equal(a.duration,1200);assert.equal(new Set(a.frames.map(f=>f.gear.front.key)).size,3);
  for(const rec of a.frames){
   const g=rec.gear;assert.equal(g.front.id,'actor/work-tool-views');assert.ok(g.rear);assert.equal(rec.equipment,undefined);
   for(const h of rec.hands){const dx=h[0]-g.position[0],dy=h[1]-g.position[1];assert.ok(Math.abs(dx*Math.cos(g.angle)+dy*Math.sin(g.angle))<18,'hand outside handle grip');}
  }
  for(const angle of [0,.6,Math.PI,4.8]){
   E(`ActorVisuals.cancelRepair();player.moving=false;window.visualPose=ActorVisuals.framePose('${item}','work',7);visualPose.localTime=${a.durations.slice(0,7).reduce((s,v)=>s+v,0)+2};visualPose.work={key:'test',elapsed:1400,duration:1800,material:'wood',target:{x:840,y:890,r:18}};player.aimX=Math.cos(${angle});player.aimY=Math.sin(${angle});`);
   const p=plain(E('ActorVisuals.worldPoint(visualPose,visualPose.record.tip)')),target=plain(E('contactPoint(visualPose.work.target,player.x,player.y)'));
   assert.ok(Math.hypot(p.x-target.x,p.y-target.y)<1e-7,'visible tip differs from interaction contact');
   assert.ok(E('ActorVisuals.impactSample(visualPose)'));
  }
 });
 await check('work.repeatedCyclesKeepStancePlantedThenEaseOut',()=>{
  E("ActorVisuals.cancelRepair();player.moving=false;window.visualPose=ActorVisuals.framePose('pickaxe','work',7);visualPose.localTime=760;visualPose.work={key:'repeat',elapsed:1500,duration:1800,material:'mineral',target:{x:840,y:890,r:18}}");
  const p=plain(E('ActorVisuals.worldPoint(visualPose,[448,448])'));
  for(const elapsed of [1750,10,300,1200,1799,1]){r.advance(100);E(`visualPose.work.elapsed=${elapsed}`);assert.deepEqual(plain(E('ActorVisuals.worldPoint(visualPose,[448,448])')),p);}
  E("window.visualIdle=ActorVisuals.framePose('pickaxe','idle')");const release=plain(E('ActorVisuals.worldPoint(visualIdle,[448,448])'));assert.deepEqual(release,p);r.advance(200);assert.deepEqual(plain(E('ActorVisuals.worldPoint(visualIdle,[448,448])')),{x:800,y:850});
 });
 await check('fish.visibleCatchExactlyDoubleSizeIndependentOfPlayerScale',()=>{
  E("ActorVisuals.cancelRepair();equipment.head=null;player.moving=false;player.aimX=0;player.aimY=1;addItem('fishing_rod',1);V013Inventory.equip('fishing_rod');ActorVisuals.fishCaught({waterX:820,waterY:930});");
  r.advance(mod.items.fishing_rod.action.durations.slice(0,7).reduce((s,v)=>s+v,0)+1);
  E('visualCalls=[];ctx.setTransform(1,0,0,1,0,0);ActorVisuals.drawFishingLine()');const c=plain(E('visualCalls.at(-1)'));
  assert.ok(c);assert.ok(Math.abs(Math.hypot(c.m[0],c.m[1])-14/128)<1e-7);assert.ok(Math.abs(Math.hypot(c.m[2],c.m[3])-18/128)<1e-7);
 });
 await check('cache.sharedViewsLoadedOnceNoPerFrameImages',()=>{
  const n=r.imageRequests.length;for(let i=0;i<60;i++)E(`ActorVisuals.renderPose(ActorVisuals.framePose('pickaxe','work',${i%12}),150,150,.4)`);
  assert.equal(r.imageRequests.length,n);assert.equal(r.imageRequests.filter(p=>p==='assets/atlases/player/work-tool-views.png').length,1);
  const bytes=Object.entries(manifest.images).filter(([id,d])=>!d.historical&&(id.startsWith('actor/')||id.startsWith('art/monster_'))).reduce((s,[,d])=>s+d.size[0]*d.size[1]*4,0);assert.ok(bytes<40*1024*1024);assert.equal(manifest.images['actor/work-tool-views'].size[0]*manifest.images['actor/work-tool-views'].size[1]*4,1572864);
 });
 await check('fallback.M4ScaleAndMuzzleRemainAligned',()=>{
  E("ActorVisuals.cancelRepair();ActorVisuals.cancelFishing();equipment.head=null;addItem('rifle_m4',1);V013Inventory.equip('rifle_m4');player.aimX=0;player.aimY=1;player.moving=false;window.fallbackScales=[];window.originalFallbackFill=ctx.fillRect;ctx.fillRect=function(...args){if(args[0]===37&&args[1]===-2&&args[2]===9){const m=ctx.getTransform();fallbackScales.push(Math.hypot(m.a,m.b));}return originalFallbackFill.apply(this,args)};ctx.setTransform(1,0,0,1,0,0);drawPlayer();ctx.fillRect=originalFallbackFill;");
  const scales=plain(E('fallbackScales'));assert.equal(scales.length,1);assert.ok(Math.abs(scales[0]-1.65)<1e-6);const p=plain(E('ActorVisuals.muzzlePoint()'));assert.ok(Math.abs(p.x-800-.5*1.65)<1e-7);assert.ok(Math.abs(p.y-850-46*1.65)<1e-6);
 });
 E('ctx.drawImage=originalVisualDraw');
 await check('console.clean',()=>assert.deepEqual(r.errors,[]));
 const result={passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks,limitations:['Native Canvas2D with modeled DOM. Physical phone/Telegram WebView manual acceptance remains.']};
 fs.writeFileSync('qa/results/player-visual-fix.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
