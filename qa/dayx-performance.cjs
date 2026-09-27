const fs=require('fs'),{performance}=require('perf_hooks'),{setup}=require('./runtime.cjs'),out=[];
for(const version of ['before','after'])for(const distance of [2600,850]){
 const r=setup(version==='before'?'qa/dayx-baseline/index.html':'index.html'),E=s=>r.eval(s);
 E("StoryPlayer.cancel();for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);for(const reason of GameFlow.reasons)GameFlow.resume(reason);document.hidden=false;menuOpen=false;playerDead=false;scene='bunker';player.x=1210;player.y=680;WorldClock.restore({schema:1,day:10,minute:310});zombies=[]");
 E(`for(let i=0;i<120;i++){const a=i/120*Math.PI*2,z=makeZombie(800+Math.cos(a)*${distance},600+Math.sin(a)*${distance});z.type=['normal','fast','heavy','leaper','bloater'][i%5];V017Monsters.prepare(z);zombies.push(z);if(typeof GameSignal.admitted==='function')GameSignal.admitted(z);}`);
 const times=[];for(let i=0;i<70;i++){r.flushTimers(16.667);const start=performance.now();E('frameScale=1;update()');if(i>=10)times.push(performance.now()-start);}times.sort((a,b)=>a-b);
 out.push({version,distance,alive:E('zombies.filter(z=>z.alive).length'),p50:times[30],p95:times[57],errors:r.errors});console.log(out.at(-1));
}
fs.writeFileSync('qa/results/dayx-performance.json',JSON.stringify({scope:'Modeled DOM/no drawing, identical 120 existing actor types, 60 samples; CPU ms not real phone FPS',rows:out},null,2));
