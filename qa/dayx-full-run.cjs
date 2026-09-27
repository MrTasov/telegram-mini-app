/* Real DEV target job through the released update chain; no synthetic kills/spawns/ticks. */
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),{performance}=require('perf_hooks'),{setup}=require('./runtime.cjs');
const r=setup('index.html',{}, {beforeScripts:s=>{s.performance.now=()=>performance.now();}}),E=s=>r.eval(s),J=s=>JSON.parse(E('JSON.stringify('+s+')')),started=performance.now();
E("restoreGameProgress(GameNewGame.create());GameStory.request('finish_intro',{outcome:'skipped'});StoryPlayer.cancel();for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);for(const reason of GameFlow.reasons)GameFlow.resume(reason);menuOpen=false;playerDead=false;document.hidden=false;stopControls(true);GameState.session.activeSlot=1;GameState.session.lastVerified=null;saveGameProgress()");
assert.equal(E('GameDevQA.enable().ok'),true);
E("for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);for(const reason of GameFlow.reasons)GameFlow.resume(reason);scene='surface';player.x=800;player.y=850;GameDevQA.request('repair');GameDevQA.request('power');window.dxGuns=[];");
for(const type of ['automatic_turret','heavy_turret','heavy_turret']){
 r.context.dxType=type;const result=J("GameDevQA.request('buildable',{id:dxType})");assert.ok(result.ok,JSON.stringify(result));r.context.dxId=result.instanceId;
 assert.equal(E("(()=>{for(let y=280;y<980;y+=100)for(let x=320;x<1320;x+=100){const tr=GamePlacement.centered(dxType,'yard',x,y);if(GamePlacement.check(dxId,tr).ok&&GamePlacement.request(dxId,'place',tr).ok){const r=JSON.parse(JSON.stringify(GameEquipment.get(dxId)));r.state.settings.ammo=DefenseDefinitions.types[dxType].capacity;GameEquipment.change(r);dxGuns.push(dxId);return true;}}return false;})()"),true);
}
E("scene='bunker';player.x=1210;player.y=680;WorldClock.restore({schema:1,day:10,minute:0});window.startFuel=V09Power.fuel;window.startWall=V015Base.sections.reduce((n,w)=>n+w.hp,0);window.startAmmo=dxGuns.map(id=>GameEquipment.get(id).state.settings.ammo)");
const ids=J('dxGuns');assert.equal(E("GameDevQA.request('time',{minutes:360}).ok"),true);
let elapsed=0,calls=0,phase=-1,maxUpdate=0,saved=new Set(),checkpoints=[],updateTimes=[];
while(E('GameDevQA.metrics().target!==null')){
 if(performance.now()-started>1200000)throw Error('Bounded full run timeout; checkpoint preserved');
 r.flushTimers(17);const tickStart=performance.now();E('frameScale=1;GameDevQA.runFrame(update)');const tickMs=performance.now()-tickStart;const m=J('GameDevQA.metrics()');elapsed+=m.simulatedMs;calls++;maxUpdate=Math.max(maxUpdate,m.updateMs);updateTimes.push(tickMs/Math.max(1,m.steps));
 if(!m.simulatedMs||E('GameFlow.paused'))throw Error('Simulation paused: '+E('JSON.stringify({reasons:GameFlow.reasons,dead:playerDead,menu:MainMenu.active,ready:GameState.session.ready})'));
 if(calls%100===0){console.log('heartbeat',calls,Math.round(elapsed),E('WorldClock.minute'),m.steps,m.enemies);fs.writeFileSync('qa/results/dayx-full-run-live.json',JSON.stringify({calls,elapsed,minute:E('WorldClock.minute'),maxUpdate,alive:m.enemies}));}
 const i=E('Math.floor(WorldClock.minute/60)');if(i!==phase){phase=i;const row={minute:E('WorldClock.minute'),elapsedMs:elapsed,wave:J('GameSignal.capture().wave'),history:J('GameSignal.capture().history'),living:E('zombies.filter(z=>z.alive).length')};checkpoints.push(row);fs.writeFileSync('qa/results/dayx-full-run-checkpoint.json',JSON.stringify({calls,elapsed,checkpoints},null,2));console.log('PHASE',i,'alive',m.enemies,'simulated ms',Math.round(elapsed));}
 if(i===2)E("scene='surface';player.x=3500;player.y=5500");else if(i>=3)E("scene='bunker';player.x=1210;player.y=680");
}
const history=J('GameSignal.capture().history'),phases=history.at(-1).phases;
assert.equal(phases.length,6);assert.equal(E('GameSignal.cap()'),144);assert.equal(E('GameSignal.capture().wave'),null);
const end=J('({fuel:V09Power.fuel,startFuel,wallHP:V015Base.sections.reduce((n,w)=>n+w.hp,0),startWall,ammo:dxGuns.map(id=>GameEquipment.get(id).state.settings.ammo),startAmmo,defenseHP:dxGuns.map(id=>GameEquipment.get(id).state.condition.hp),clock:WorldClock.capture(),living:zombies.filter(z=>z.alive).length})');
E('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())))');assert.deepEqual(J('GameSignal.capture().history'),history);assert.deepEqual(r.errors,[]);
updateTimes.sort((a,b)=>a-b);const out={runtimeSha256:crypto.createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex'),phases,history,elapsedSimulationRealMs:elapsed,endMinute:end.clock.minute,wallSeconds:(performance.now()-started)/1000,calls,meanUpdateP50:updateTimes[Math.floor(updateTimes.length*.5)],meanUpdateP95:updateTimes[Math.floor(updateTimes.length*.95)],end,checkpoints,scope:'Real DEV speed/target commands, real update chain, seeded existing enemies, three installed real turrets, bunker off-zone. Modeled DOM/no draw; not phone FPS.'};fs.writeFileSync('qa/results/dayx-full-run.json',JSON.stringify(out,null,2));console.log(JSON.stringify({phases,end,duration:elapsed,wallSeconds:out.wallSeconds}));
