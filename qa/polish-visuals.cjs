const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas'),{setup}=require('./runtime.cjs');
const out='qa/results/polish-visuals';fs.mkdirSync(out,{recursive:true});
const checks=[],capture=async(r,code)=>{r.eval(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);equipment.body=null;equipment.head=null;${code}`);return loadImage(r.canvas.toBuffer('image/png'));};
async function main(){
 const before=setup('qa/pre-polish/index.html'),after=setup('index.html');
 for(const r of [before,after])await r.eval('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 const sheet=createCanvas(1200,840),c=sheet.getContext('2d');c.fillStyle='#344138';c.fillRect(0,0,1200,840);c.fillStyle='#edf0e7';c.font='19px sans-serif';
 ['IDLE — reference','WALK — before','WALK — corrected','WALK — opposite step'].forEach((t,i)=>c.fillText(t,12+i*300,28));
 for(const [row,item]of [null,'rifle_ak74','axe','remote'].entries())for(let col=0;col<4;col++){
  const r=col===1?before:after,mode=col?'walk':'idle',frame=col===3?6:0;
  const pose=item?`ActorVisuals.framePose('${item}','${mode}',${frame})`:`{kind:'unarmed',id:ActorVisuals.config.${col?'body.unarmed':'unarmed.idle'},frame:${frame},item:null}`;
  const im=await capture(r,`ctx.save();ctx.translate(150,115);ctx.scale(2.4,2.4);ActorVisuals.renderPose(${pose},0,0,Math.PI/2);ctx.restore();`);
  c.drawImage(im,0,0,300,195,col*300,40+row*195,300,195);c.fillStyle='#e9eee4';c.font='16px sans-serif';c.fillText(item||'unarmed',col*300+12,225+row*195);
 }
 fs.writeFileSync(out+'/player-scale.png',sheet.toBuffer('image/png'));
 const guns=createCanvas(1120,1040),g=guns.getContext('2d');g.fillStyle='#344138';g.fillRect(0,0,1120,1040);
 for(const [index,item]of ['rifle_ak74','rifle_m4'].entries())for(let a=0;a<8;a++){
  after.eval(`stopControls();scene='surface';player.x=800;player.y=850;player.wallLevel=false;menuOpen=false;playerDead=false;zombies=[];addItem('${item}',1);V013Inventory.equip('${item}');V010Combat.currentWeapon().rounds=30;V010Combat.cancelReload();lastShot=-10000;bullets.length=0;player.aimX=Math.cos(${a}*Math.PI/4);player.aimY=Math.sin(${a}*Math.PI/4);player.moving=true;player.walkAnimation+=.21;player.x+=2;shoot();`);
  after.eval('for(const b of bullets){b.x+=b.dx;b.y+=b.dy;}');
  const im=await capture(after,'ctx.save();ctx.translate(140,130);ctx.scale(1.6,1.6);ctx.translate(-player.x,-player.y);drawPlayer();drawBullets();ctx.restore();');
  const x=a%4*280,y=(index*2+Math.floor(a/4))*260;g.drawImage(im,0,0,280,260,x,y,280,260);g.fillStyle='#eef2e9';g.font='17px sans-serif';g.fillText(item+' · '+a*45+'°',x+12,y+25);
 }
 fs.writeFileSync(out+'/muzzle-directions.png',guns.toBuffer('image/png'));
 const corpses=createCanvas(1000,640),zctx=corpses.getContext('2d');zctx.fillStyle='#46513f';zctx.fillRect(0,0,1000,640);
 const sizes=[];
 for(const [side,r]of [before,after].entries()){
  r.eval("scene='surface';camera.x=600;camera.y=650;window.drawMeasures=[];window.measureDraw=ctx.drawImage;ctx.drawImage=function(im,...a){if(a.length===8)drawMeasures.push(a);else if(a.length===4&&a[0]<0&&a[1]<0)drawMeasures.push([0,0,im.width,im.height,...a]);return measureDraw.call(this,im,...a);}");
  const row=[];
  for(const [i,type]of ['normal','heavy','fast','leaper','bloater'].entries())for(const dead of [false,true]){
   const im=await capture(r,`window.visualZombie=makeZombie(800,850);visualZombie.type='${type}';window.visualPose=V017Monsters.prepare(visualZombie);visualPose.variant=0;visualPose.angle=Math.PI;visualPose.deathAngle=.4;visualZombie.alive=${!dead};visualZombie.health=${dead?0:100};drawMeasures=[];ctx.save();ctx.translate(100-800,120-850);ctx.scale(1,1);drawZombie(visualZombie);ctx.restore();`);
   const d=r.eval('drawMeasures.at(-1)');row.push({type,dead,w:d[6],h:d[7]});zctx.drawImage(im,20,40,160,160,side*500+i*100,dead?345:90,100,100);
  }
  sizes.push(row);r.eval('ctx.drawImage=measureDraw');
 }
 zctx.fillStyle='#f0f1e9';zctx.font='22px sans-serif';zctx.fillText('CURRENT — before polish',15,35);zctx.fillText('POLISH',515,35);zctx.font='18px sans-serif';zctx.fillText('Living bodies — same size',15,75);zctx.fillText('Corpses — current size × 1.2, matching shadows',15,310);
 for(let i=0;i<sizes[0].length;i++){const a=sizes[0][i],b=sizes[1][i],ratio=a.dead?1.2:1;assert.ok(Math.abs(b.w/a.w-ratio)<1e-9&&Math.abs(b.h/a.h-ratio)<1e-9);checks.push({id:(a.dead?'corpse120.':'livingUnchanged.')+a.type,status:'PASS'});}
 fs.writeFileSync(out+'/corpses.png',corpses.toBuffer('image/png'));
 const icons=createCanvas(960,330),ic=icons.getContext('2d');ic.fillStyle='#263631';ic.fillRect(0,0,960,330);
 for(const [i,[name,file]]of [['Stone','assets/images/items/stone.webp'],['Coal','assets/icons/items/coal.png'],['Iron Ore','assets/icons/items/iron_ore_polish.png'],['Copper Ore','assets/icons/items/copper_ore_polish.png']].entries()){
  const im=await loadImage(file);ic.drawImage(im,i*240+30,35,180,180);ic.drawImage(im,i*240+55,260,32,32);ic.drawImage(im,i*240+120,247,48,48);ic.fillStyle='#eef1e6';ic.font='18px sans-serif';ic.fillText(name,i*240+35,240);
 }
 fs.writeFileSync(out+'/ore-icons.png',icons.toBuffer('image/png'));
 for(const [id,opts]of [['phone',{width:390,height:844,maxTouchPoints:5}],['pc',{width:1280,height:800,maxTouchPoints:0}]]){
  const r=setup('index.html',{},opts);await r.eval('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
  r.eval("scene='surface';player.x=800;player.y=850;menuOpen=false;playerDead=false;zombies=[];V013Inventory.equip('rifle_ak74');player.aimX=.6;player.aimY=.8;V016Lighting.restore({schema:1,day:1,minute:840});V010Camera.restore({...V010Camera.capture(),zoom:.85});ActorVisuals.pose('rifle_ak74');player.walkAnimation+=.21;player.x+=2;player.moving=true;draw();");
  fs.writeFileSync(out+'/'+id+'.png',r.canvas.toBuffer('image/png'));assert.deepEqual(r.errors,[]);checks.push({id:'render.'+id,status:'PASS'});
 }
 for(const r of [before,after])assert.deepEqual(r.errors,[]);
 const result={passed:checks.length,failed:0,checks};fs.writeFileSync('qa/results/polish-visuals.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e);process.exitCode=1});
