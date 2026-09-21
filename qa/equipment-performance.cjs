// Identical seeded 100-zombie Canvas scene; one selected, walking player.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs');
(async()=>{
 const target=process.argv[2]||'index.html',out=process.argv[3]||'qa/results/equipment-performance.json',mode=process.env.LAST_BASE_CONTROL_MODE||'PC';
 const r=setup(target,{},mode==='MOBILE'?{width:390,height:844,maxTouchPoints:5}:{width:1280,height:800,maxTouchPoints:0}),E=s=>r.eval(s);
 await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 E(`GameInput.setMode('${mode}');scene='surface';menuOpen=false;playerDead=false;player.x=800;player.y=850;player.moving=true;player.aimX=1;player.aimY=0;equipment.head=null;equipment.body=null;window.benchActors=Array.from({length:100},(_,i)=>{const z=makeZombie(450+(i%10)*75,500+Math.floor(i/10)*70);z.type=V017Monsters.typeAt(i);V017Monsters.prepare(z);return z;});`);
 const frame=`player.walkAnimation+=.21;player.x+=2;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,${mode==='PC'?1280:390},${mode==='PC'?800:844});ctx.save();ctx.scale(.45,.45);ctx.translate(100-player.x,100-player.y);for(const z of benchActors){V017Monsters.prepare(z).walk+=1.65;drawZombie(z);}drawPlayer();ctx.restore();`;
 const cases=[];for(const item of ['rifle_ak74','axe','pickaxe','hammer','fishing_rod']){
  E(`player.x=800;player.y=850;addItem('${item}',1);V013Inventory.equip('${item}');`);if(E('heldItem()')!==item)throw Error('Wrong benchmark equipment');
  const n=r.imageRequests.length,times=[];for(let i=0;i<150;i++){r.advance(1000/60);const t=performance.now();E(frame);r.canvas.getContext('2d').getImageData(0,0,1,1);if(i>=30)times.push(performance.now()-t);}
  times.sort((a,b)=>a-b);cases.push({item,p50Ms:times[60],p95Ms:times[114],newImageRequests:r.imageRequests.length-n});
 }
 const result={mode,target,actors:100,samples:120,warmup:30,cases,errors:r.errors,limitation:'Native Canvas2D in this environment, not physical-device FPS.'};fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(r.errors.length||cases.some(c=>c.newImageRequests))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
