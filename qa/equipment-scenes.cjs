// Real renderer review artifacts; optional approved directory adds pixel QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),approved=process.argv[2]&&path.resolve(process.argv[2]);process.chdir(root);
const {createCanvas,loadImage,GlobalFonts}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const {setup}=require('./runtime.cjs'),out='qa/results/equipment-visuals';fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','Review');
const items=['rifle_ak74','axe','pickaxe','hammer','remote','flashlight','fishing_rod'],names=['AK · хват снизу','Топор','Кирка','Молот','Пульт','Фонарик','Удочка'];
(async()=>{
 const r=setup('index.html'),E=s=>r.eval(s);await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');E('equipment.body=null;equipment.head=null;');
 const frames=[],metrics=[];for(let i=0;i<12;i++){
  const c=createCanvas(1200,900),x=c.getContext('2d');x.fillStyle='#172820';x.fillRect(0,0,1200,900);x.fillStyle='#e2eadf';x.font='24px Review';x.fillText('LAST BASE · подключено к игровому renderer · '+String(i+1).padStart(2,'0')+' / 12',24,37);
  const rows=[...items.map((item,j)=>({item,mode:'walk',label:names[j]})),...['axe','pickaxe','hammer','fishing_rod'].map((item,j)=>({item,mode:item==='fishing_rod'?'catch':'work',label:['Рубка','Добыча','Ремонт','Улов'][j]}))];
  for(let k=0;k<rows.length;k++){
   const {item,mode,label}=rows[k];E(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ctx.scale(3,3);ActorVisuals.renderPose(ActorVisuals.framePose('${item}','${mode}',${i}),50,43,Math.PI/2);`);
   const im=await loadImage(r.canvas.toBuffer('image/png')),xx=k%4*300,yy=Math.floor(k/4)*270+75;
   x.fillStyle='#c3d2bb';x.font='17px Review';x.fillText(label,xx+18,yy);x.drawImage(im,0,0,300,240,xx,yy+7,300,240);
  }const file=out+'/frame-'+String(i+1).padStart(2,'0')+'.png';fs.writeFileSync(file,c.toBuffer('image/png'));frames.push(file);
 }
 fs.copyFileSync(frames[7],out+'/equipment-in-game.png');
 if(approved){
  const m=JSON.parse(fs.readFileSync(path.join(approved,'prototype.json')));
  for(const item of items)for(const mode of ['idle','walk',...(m.sequences[(item==='fishing_rod'?'fishing':item)+'_action']&&!require('../assets/manifest.json').actors.modular.items[item]?.action?.motionRevision?['work']:[])])for(let i=0;i<(mode==='idle'?1:12);i++){
   const name=item==='rifle_ak74'?'ak':item,src=mode==='work'?m.sequences[(item==='fishing_rod'?'fishing':name)+'_action'].frames[i].composite:mode==='idle'?'composed/'+name+'/idle.png':m.sequences[name+'_walk'].frames[i].composite;
   const c=createCanvas(112,112),x=c.getContext('2d');x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(57,60,17,12,0,0,Math.PI*2);x.fill();x.drawImage(await loadImage(path.join(approved,src)),0,0,112,112);
   E(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ctx.save();ctx.scale(1/ActorVisuals.config.visualScale,1/ActorVisuals.config.visualScale);ActorVisuals.renderPose(ActorVisuals.framePose('${item}','${mode}',${i}),56*ActorVisuals.config.visualScale,56*ActorVisuals.config.visualScale,Math.PI/2);ctx.restore();`);
   const a=c.getContext('2d').getImageData(0,0,112,112).data,b=r.canvas.getContext('2d').getImageData(0,0,112,112).data;let delta=0,n=0;
   for(let j=0;j<a.length;j+=4)if(a[j+3]||b[j+3]){for(let k=0;k<3;k++)delta+=Math.abs(a[j+k]*a[j+3]/255-b[j+k]*b[j+3]/255);delta+=Math.abs(a[j+3]-b[j+3]);n+=4;}
   metrics.push({item,mode,frame:i+1,meanPremultipliedError:delta/n});
  }
  assert.ok(metrics.every(m=>m.meanPremultipliedError<12),'Packed render differs materially from approved art: '+JSON.stringify(metrics.filter(m=>m.meanPremultipliedError>=12)));
 }
 for(const v of [{id:'pc',width:1280,height:800,maxTouchPoints:0},{id:'mobile',width:390,height:844,maxTouchPoints:5},{id:'mobile-landscape',width:844,height:390,maxTouchPoints:5}]){
  const q=setup('index.html',{},v);await q.eval('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
  q.eval("scene='surface';player.x=800;player.y=850;menuOpen=false;playerDead=false;player.aimX=.6;player.aimY=.8;addItem('rifle_ak74',1);V013Inventory.equip('rifle_ak74');V016Lighting.restore({schema:1,day:1,minute:840});V010Camera.restore({...V010Camera.capture(),zoom:.85});ActorVisuals.pose('rifle_ak74');player.walkAnimation+=.21;player.x+=2;player.moving=true;draw();");
  fs.writeFileSync(out+'/game-'+v.id+'.png',q.canvas.toBuffer('image/png'));assert.deepEqual(q.errors,[]);
 }
 const result={frames:12,approvedComparisons:metrics.length,maxMeanPremultipliedError:Math.max(0,...metrics.map(m=>m.meanPremultipliedError)),metrics,errors:r.errors};assert.deepEqual(r.errors,[]);fs.writeFileSync('qa/results/equipment-pixels.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,metrics:undefined}));
})().catch(e=>{console.error(e);process.exitCode=1;});
