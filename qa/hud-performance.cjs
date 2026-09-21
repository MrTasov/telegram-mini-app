// Monitor CPU overhead and paired game-frame measurements. NOT browser/phone FPS.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks'),os=require('node:os');
process.chdir(path.resolve(__dirname,'..'));const {setup}=require('./runtime.cjs');
const stats=a=>{const s=a.slice().sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((n,v)=>n+v,0)/s.length};};
async function main(){
 const r=setup('index.html',{}, {width:390,height:844,maxTouchPoints:5}),E=s=>r.eval(s),direct={off:[],on:[]};
 E('window.hudMeasure=function(n){for(let i=0,t=0;i<n;i++){t+=16+(i%3)*.7;GameHUD.sample(t);}}');
 const toggle=on=>E(`GameHUD.set('fps',${on});GameHUD.set('frameTime',${on});`);
 for(let pair=0;pair<16;pair++)for(const on of (pair%2?[true,false]:[false,true])){
  toggle(on);E('hudMeasure(12000)');const start=performance.now();E('hudMeasure(60000)');direct[on?'on':'off'].push((performance.now()-start)/60000);
 }
 const node=id=>r.doc.getElementById(id),desc=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node('hudFPS').childNodes[0]),'nodeValue');let writes=0;
 for(const id of ['hudFPS','hudFrameTime']){const t=node(id).childNodes[0];Object.defineProperty(t,'nodeValue',{configurable:true,get(){return desc.get.call(this)},set(v){writes++;desc.set.call(this,v)}});}
 toggle(false);toggle(true);writes=0;E('hudMeasure(600)');const monitorWrites= writes;
 for(const id of ['hudFPS','hudFrameTime'])delete node(id).childNodes[0].nodeValue;
 await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
 E("scene='surface';menuOpen=false;playerDead=false;stopControls(true);player.x=800;player.y=850;V010Camera.restore({...V010Camera.capture(),zoom:.8});V016Lighting.restore({schema:1,day:17,minute:759});V013Inventory.equip('rifle_ak74');zombies=[];frameScale=1;updateCamera();");
 // Identical warm scene, frozen simulation, alternating ON/OFF. Isolates HUD
 // changes from enemy movement/spawns, resource timers and random game state.
 const frame={off:[],on:[]};let t=0;const draw=E('(t)=>{GameHUD.sample(t);GameHUD.refreshClock();updateAmmoHud();draw();}');
 for(let pass=0;pass<6;pass++)for(const on of (pass%2?[true,false]:[false,true])){
  toggle(on);for(let i=0;i<50;i++){r.advance(16.667);t+=16.667;const start=performance.now();draw(t);r.canvas.getContext('2d').getImageData(0,0,1,1);const ms=performance.now()-start;if(i>=20)frame[on?'on':'off'].push(ms);}
 }
 const report={patch:'hud-display-1',environment:{node:process.version,cpu:os.cpus()[0]?.model,viewport:{width:390,height:844,dpr:1},mode:'VM DOM + native Canvas2D'},monitor:{off:stats(direct.off),on:stats(direct.on),textWritesIn600SyntheticFrames:monitorWrites,displayIntervalMs:250,newRAFLoops:0,newTimers:0},scene:{name:'same_surface_day_frozen_simulation',off:stats(frame.off),on:stats(frame.on)},errors:r.errors,limitations:['Microbenchmark includes modeled text writes, not browser layout/paint/compositing.','Paired native Canvas scene timings are shared-host CPU measurements, NOT mobile FPS or Telegram performance.','Real mobile/PC/Telegram overhead still requires manual review.']};
 report.monitor.p50IncrementMs=report.monitor.on.p50Ms-report.monitor.off.p50Ms;report.scene.p50IncrementMs=report.scene.on.p50Ms-report.scene.off.p50Ms;
 fs.writeFileSync('qa/results/hud-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(r.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
