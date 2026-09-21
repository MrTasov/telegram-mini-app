const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),cfg=require('../assets/manifest.json').actors;
const out='qa/results/player-visual-fix';fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','Review');
const phases=['Подготовка','Подъём','Подъём','Замах','Верхняя точка','Разгон','Удар вниз','Контакт','Отдача','Возврат','Возврат','Готовность'];
(async()=>{
 const r=setup('index.html'),E=s=>r.eval(s);
 await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 E('scene="surface";player.x=600;player.y=600;player.aimX=0;player.aimY=1;player.moving=false;equipment.head="helmet";equipment.body=null;');
 const sheets={axe:createCanvas(1200,1020),pickaxe:createCanvas(1200,1020)},anim=[];
 for(let i=0;i<12;i++){
  const c=createCanvas(600,340),x=c.getContext('2d');x.fillStyle='#26352f';x.fillRect(0,0,600,340);
  for(const [j,item]of ['axe','pickaxe'].entries()){
   const a=cfg.modular.items[item].action,t=a.durations.slice(0,i).reduce((s,n)=>s+n,0)+1;
   E(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ctx.save();ctx.translate(150,150);ctx.scale(2.5,2.5);ActorVisuals.renderPose(ActorVisuals.framePose('${item}','work',${i}),0,0,Math.PI/2);ctx.restore();`);
   const im=await loadImage(r.canvas.toBuffer('image/png'));x.drawImage(im,0,0,300,290,j*300,25,300,290);
   x.fillStyle='#e7ece3';x.font='18px Review';x.fillText((item==='axe'?'Топор':'Кирка')+' · '+String(i+1).padStart(2,'0'),j*300+14,24);x.font='15px Review';x.fillText(phases[i],j*300+14,327);
   sheets[item].getContext('2d').drawImage(c,j*300,0,300,340,i%4*300,Math.floor(i/4)*340,300,340);
  }
  const file=out+'/work-'+String(i+1).padStart(2,'0')+'.png';fs.writeFileSync(file,c.toBuffer('image/png'));anim.push(file);
 }
 for(const [name,c]of Object.entries(sheets))fs.writeFileSync(out+'/'+name+'-12-phases.png',c.toBuffer('image/png'));
 fs.writeFileSync(out+'/animation.txt',anim.map((f,i)=>`file '${path.resolve(f)}'\nduration ${cfg.modular.items.axe.action.durations[i]*1.5/1000}`).join('\n')+`\nfile '${path.resolve(anim[0])}'\n`);
 for(const v of [{id:'pc',width:1280,height:800,maxTouchPoints:0},{id:'phone',width:390,height:844,maxTouchPoints:5},{id:'phone-landscape',width:844,height:390,maxTouchPoints:5}]){
  const q=setup('index.html',{},v);await q.eval('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
  q.eval("scene='surface';player.x=800;player.y=850;menuOpen=false;playerDead=false;player.aimX=.6;player.aimY=.8;addItem('rifle_ak74',1);V013Inventory.equip('rifle_ak74');addItem('helmet1',1);equipment.head=bag.find(i=>i?.type==='helmet1');V016Lighting.restore({schema:1,day:1,minute:840});V010Camera.restore({...V010Camera.capture(),zoom:.85});ActorVisuals.pose('rifle_ak74');player.walkAnimation+=.21;player.x+=2;player.moving=true;draw();");
  fs.writeFileSync(out+'/'+v.id+'.png',q.canvas.toBuffer('image/png'));
  if(q.errors.length)throw Error(q.errors.join('\n'));
 }
 console.log('Saved 12-phase work sheets and PC/phone renderer captures.');
})().catch(e=>{console.error(e);process.exitCode=1;});
