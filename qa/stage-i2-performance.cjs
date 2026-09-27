// Serial, bounded diagnostic against the exact uploaded Claude baseline.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),{performance}=require('perf_hooks');process.chdir(path.resolve(__dirname,'..'));process.env.LAST_BASE_ASSETS=process.cwd();
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const stats=a=>{a.sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.min(a.length-1,Math.floor(a.length*.95))]};};
if(process.argv[2]==='worker'){
 const which=process.argv[3],scene=process.argv[4],{setup}=require('./runtime.cjs'),r=setup(which==='before'?'qa/stage-i2-base/index.html':'index.html',{}, {width:390,height:844,maxTouchPoints:5,beforeScripts:s=>s.devicePixelRatio=3});
 const E=s=>r.eval(s);E("StoryPlayer.cancel();for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);for(const reason of GameFlow.reasons)GameFlow.resume(reason);stopControls(true);scene='"+scene+"';player.x=800;player.y=850;WorldClock.restore({schema:1,day:9,minute:1300});zombies=Array.from({length:50},(_,i)=>makeZombie(300+i%10*95,350+Math.floor(i/10)*85));WorldClock.restore({schema:1,day:10,minute:180});");
 const update=E('()=>{frameScale=1;update()}'),times=[];for(let i=0;i<180;i++){r.advance(17);const t=performance.now();r.flushTimers(0);update();if(i>=30)times.push(performance.now()-t);}
 const saves=[],capture=E('()=>JSON.stringify(captureGameProgress())');let bytes=0;for(let i=0;i<12;i++){const t=performance.now(),raw=capture();bytes=Buffer.byteLength(raw);if(i>=2)saves.push(performance.now()-t);}
 console.log(JSON.stringify({which,scene,initialEnemies:50,living:E('zombies.filter(z=>z.alive).length'),dayX:E("WorldEvents.isActive('day_x')"),updateMs:stats(times),captureMs:stats(saves),saveBytes:bytes,deviceDpr:3,renderDpr:E('canvas.width/screenWidth'),errors:r.errors}));
}else{
 const rows=[];for(const scene of ['surface','bunker'])for(const which of ['before','after']){const r=cp.spawnSync(process.execPath,[__filename,'worker',which,scene],{encoding:'utf8',timeout:45000,maxBuffer:1e6});try{if(r.status!==0)throw Error(r.error?.message||r.stderr);rows.push(JSON.parse(r.stdout.trim().split('\n').at(-1)));}catch(e){rows.push({which,scene,limitation:e.message});}}
 const report={version:'0.41.0',baselineSha256:hash('qa/stage-i2-base/js/game.js'),runtimeSha256:hash('js/game.js'),scope:'Day X, 50 initial real enemies, authoritative update + capture; modeled DOM, DPR3 device/capped2 canvas. No draw/FPS/native browser claim.',rows};fs.writeFileSync('qa/results/stage-i2-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
