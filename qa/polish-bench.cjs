// Native Canvas comparison at a mobile viewport, not hardware phone FPS.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs');
const stats=a=>{const s=a.slice().sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],maxMs:s.at(-1)};};
async function measure(dir){
 const r=setup(path.join(dir,'index.html'),{},{width:390,height:844,maxTouchPoints:5}),E=s=>r.eval(s);
 await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 E("stopControls();scene='surface';menuOpen=false;playerDead=false;player.wallLevel=false;player.x=800;player.y=850;player.aimX=1;player.aimY=0;camera.x=610;camera.y=430;equipment.body=null;equipment.head=null;frameScale=1;zombies=[];V013Inventory.equip('rifle_ak74');");
 const result={};
 const cases=[
  ['ak_walk_20_tracers',"chopState=null;V09World.stopMining();V013Inventory.equip('rifle_ak74');bullets.length=0;for(let i=0;i<20;i++)bullets.push({x:810+i*4,y:860+i%3*8,dx:12,dy:0,weapon:'rifle_ak74',life:20,radius:3});",'player.moving=true;player.x=800+(i%72)*2;player.walkAnimation+=.21;drawPlayer();drawBullets();'],
  ['axe_gathering',"V013Inventory.equip('axe');window.tree=worldTrees[0];player.x=tree.x+tree.r+25;player.y=tree.y;player.moving=false;chopState={id:tree.id,duration:2300,startedAt:Date.now()};",'chopState.startedAt=Date.now()-(i*16.667%2300);updateFootstepsAudio();drawPlayer();'],
  ['100_living_100_corpses',"chopState=null;player.x=800;player.y=850;camera.x=610;camera.y=630;zombies=Array.from({length:200},(_,i)=>{const z=makeZombie(615+i%20*17,670+Math.floor(i/20)*22);z.type=['normal','heavy','fast','leaper','bloater'][i%5];V017Monsters.prepare(z).variant=i%3;z.alive=i<100;z.health=z.alive?120:0;return z});",'for(const z of zombies)drawZombie(z);']
 ];
 for(const [name,init,code]of cases){
  E(init);const times=[];
  for(let i=0;i<180;i++){r.advance(16.667);r.context.i=i;const start=performance.now();E('ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,844);ctx.save();ctx.translate(195-player.x,422-player.y);'+code+'ctx.restore();');r.canvas.getContext('2d').getImageData(0,0,1,1);if(i>=30)times.push(performance.now()-start);}
  result[name]=stats(times);
 }
 result.decodedImageRgbaBytes=E('Object.values(AssetManifest.images).filter(d=>!d.historical).reduce((s,d)=>s+d.size[0]*d.size[1]*4,0)');
 result.imageRequests=r.imageRequests.length;result.uniqueRequests=new Set(r.imageRequests).size;result.corpseCache=E('V017Monsters.visualCacheStats?.()||null');result.errors=r.errors;return result;
}
(async()=>{const before=await measure(path.join(root,'qa/pre-polish')),after=await measure(root);const result={environment:{node:process.version,viewport:[390,844],renderer:'Native Canvas2D + modeled DOM, no physical device/WebView/audio hardware',samples:'180 frames per scene, first 30 warm-up; run separately from regression tests'},before,after,addedDecodedPcmBytes:(.16+.20+.24)*44100*4};fs.writeFileSync('qa/results/polish-performance.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));})().catch(e=>{console.error(e);process.exitCode=1});
