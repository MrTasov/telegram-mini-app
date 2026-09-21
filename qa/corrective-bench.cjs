// Same-host comparison. Real Canvas2D + modeled DOM, not physical-phone FPS.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),base=path.join(root,'qa/pre-corrective-performance'),{setup}=require('./runtime.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],maxMs:s.at(-1)};};
async function run(dir){
 process.env.LAST_BASE_ASSETS=root;const r=setup(path.join(dir,'index.html'),{}, {width:390,height:844,maxTouchPoints:5,media:{'(pointer: coarse)':true}}),E=s=>r.eval(s),cv=r.doc.getElementById('canvas'),result={};
 // Let existing millisecond budgets see actual CPU time within each simulated
 // frame. The default fixture clock is deliberately frozen during evaluation.
 const advance=r.advance,wallStart=performance.now();let clock=E('performance.now()');r.context.performance.now=()=>clock+performance.now()-wallStart;r.advance=ms=>{clock+=ms;advance(ms);};
 E(`stopControls();scene='surface';player.wallLevel=false;GameInput.setMode('MOBILE');zombies=[];frameScale=1;`);
 await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 const reset=(x=1300,y=1120)=>E(`stopControls();V014Controls.stopRoute();player.wallLevel=false;player.x=${x};player.y=${y};camera.x=player.x-195/V010Camera.zoom;camera.y=player.y-422/V010Camera.zoom;`);
 const emit=(type,id,x,y)=>{const p=E(`worldToScreen(${x},${y})`);r.emit(type,cv,{pointerId:id,pointerType:'touch',clientX:p.x,clientY:p.y});};
 // Measure synchronous input completion separately from each incremental slice.
 for(const [id,x,y]of [['free',1300,1135],['detour',1300,1600]]){
  const input=[],slices=[],counts=[];
  for(let n=0;n<25;n++){
   reset();E('v092PathCache.clear()');const t=performance.now();E(`GameActions.dispatch('MOVE',{x:${x},y:${y}})`);input.push(performance.now()-t);
   let count=0;while(E('V091Navigation.pending')&&count<1200){r.advance(16.667);const t=performance.now();E('updatePlayer()');slices.push(performance.now()-t);count++;}counts.push(count);
  }
  result['tap_'+id]={input:stats(input),slices:slices.length?stats(slices):null,maxSlices:Math.max(...counts)};
 }
 const gestures=[['free',900,1300],['obstacle',1072,1300]];
 for(const [id,x,y]of gestures){reset(980,1300);emit('pointerdown',101,940,1300);emit('pointermove',101,x,y);r.advance(200);
  E('window.searches=0;window.probeSearch=v092PathSearch;v092PathSearch=function(...args){searches++;return probeSearch(...args)};');
  const input=[],frames=[];
  for(let n=0;n<360;n++){r.advance(16.667);const t=performance.now();emit('pointermove',101,x,y);input.push(performance.now()-t);const a=performance.now();E('updatePointerFollow();updatePlayer();updateAction();');frames.push(performance.now()-a);}
  result['held_'+id]={pointerMove:stats(input),movementAndContext:stats(frames),searches:E('searches'),collisionFree:!E('worldCollision(player.x,player.y,player.radius,scene)')};E('v092PathSearch=probeSearch');emit('pointerup',101,x,y);
 }
 for(const [id,width,height]of [['mobile',390,844],['pc',1280,800]]){
  E(`window.innerWidth=${width};window.innerHeight=${height};refreshViewport();scene='surface';player.x=800;player.y=850;camera.x=600;camera.y=650;stopControls();zombies=Array.from({length:200},(_,i)=>{const z=makeZombie(610+i%20*18,660+Math.floor(i/20)*20);z.type=['normal','heavy','fast','leaper','bloater'][i%5];const p=V017Monsters.prepare(z);p.variant=i%3;z.alive=i<100;z.health=z.alive?120:0;return z});`);
  const times=[];for(let n=0;n<150;n++){const t=performance.now();E('ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ctx.save();ctx.translate(-600,-650);for(const z of zombies)drawZombie(z);ctx.restore();');r.canvas.getContext('2d').getImageData(0,0,1,1);if(n>=30)times.push(performance.now()-t);}
  result['zombies100_corpses100_'+id]=stats(times);
 }
 result.imageRequests=r.imageRequests.length;result.uniqueImageRequests=new Set(r.imageRequests).size;result.errors=r.errors;return result;
}
(async()=>{const before=await run(base),after=await run(root),report={environment:{node:process.version,kind:'Native Canvas2D and modeled DOM; timings include VM crossings; no browser layout, compositor or physical touch'},before,after};fs.writeFileSync(path.join(root,'qa/results/corrective-performance-comparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));})().catch(e=>{console.error(e);process.exitCode=1;});
