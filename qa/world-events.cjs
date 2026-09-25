const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
process.chdir(path.resolve(__dirname,'..'));const {setup}=require('./runtime.cjs'),checks=[];
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack?.slice(0,3500)});}}
const json=v=>JSON.parse(JSON.stringify(v)),r=setup('index.html'),E=s=>r.eval(s),initial=E('JSON.stringify(captureGameProgress())');
function reset(){E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(initial)}));menuOpen=false;`);}
function time(day,minute){E(`V016Lighting.restore({schema:1,day:${day},minute:${minute}})`);}
const active=()=>E("WorldEvents.isActive('day_x')");
for(const day of [10,20,30,40,50,100,1000,1000010])for(const [minute,want]of [[0,true],[1,true],[180,true],[359,true],[359.999,true],[360,false],[361,false],[1439,false]])check(`calendar.${day}.${minute}`,()=>{time(day,minute);assert.equal(active(),want);assert.equal(E('V017Monsters.isDayX()'),want);});
for(const day of [1,9,11,19,21,29,31,99,101])check(`calendar.ordinary.${day}`,()=>{time(day,0);assert.equal(active(),false);time(day,359);assert.equal(active(),false);});
for(const day of [9,19,29,99])check(`calendar.realTick.${day}.midnightAndSix`,()=>{
 reset();time(day,1439);assert.equal(active(),false);
 // A minute takes 833.333ms; split frame-size advances around the endpoint.
 E('V016Lighting.tick(800)');assert.equal(active(),false);E('V016Lighting.tick(34)');assert.equal(active(),true);assert.equal(E('WorldClock.day'),day+1);
 time(day+1,359);E('V016Lighting.tick(800)');assert.equal(active(),true);E('V016Lighting.tick(34)');assert.equal(active(),false);
 assert.ok(!r.doc.getElementById('v016WorldClock').textContent.includes('X'));
});
check('clock.noDOMNoLocalPlayerOrCameraDependency',()=>{
 const c={window:{}};c.window=c;vm.createContext(c);for(const f of ['clock','events'])vm.runInContext(fs.readFileSync('src/world/'+f+'.js','utf8'),c);
 vm.runInContext('WorldClock.restore({schema:1,day:10,minute:180})',c);assert.equal(c.WorldEvents.isActive('day_x'),true);
 vm.runInContext('WorldClock.restore({schema:1,day:10,minute:360})',c);assert.equal(c.WorldEvents.isActive('day_x'),false);
});
check('balance.allFiveStatsExactlyMatchAcceptedDayX',()=>{
 const old=setup('qa/pre-stage6/index.html');for(const type of ['normal','heavy','fast','leaper','bloater'])for(const raid of [false,true])assert.deepEqual(json(E(`V017Monsters.stats('${type}',${raid})`)),json(old.eval(`V017Monsters.stats('${type}',${raid})`)));
});
check('balance.spawnTargetOrdinary48Raid96Cap144',()=>{
 reset();for(const strength of [.5,1,2,4]){E(`V010World.settings.enemyCount=${strength}`);time(10,180);assert.equal(E('V017Monsters.targetCount()'),Math.min(144,Math.round(96*strength)));time(10,360);assert.equal(E('V017Monsters.targetCount()'),Math.min(144,Math.round(48*strength)));}
 reset();
});
check('modifiers.repeatedCalendarChangesPreserveHPRatioAndRemoveBoost',()=>{
 reset();time(9,1439);E('zombies.forEach(z=>{V017Monsters.prepare(z);z.health=z.maxHealth*.37})');
 for(let n=1;n<=10;n++){
  time(n*10,0);for(const z of json(E('zombies')))if(z.alive){assert.ok(Math.abs(z.health/z.maxHealth-.37)<1e-12);assert.equal(z.maxHealth,E(`V017Monsters.stats('${z.type}',true).hp`));}
  const before=E('JSON.stringify(zombies.map(z=>[z.health,z.maxHealth]))');time(n*10,180);assert.equal(E('JSON.stringify(zombies.map(z=>[z.health,z.maxHealth]))'),before);
  time(n*10,360);assert.equal(E('V017Monsters.factor()'),1);for(const z of json(E('zombies')))if(z.alive){assert.ok(Math.abs(z.health/z.maxHealth-.37)<1e-12);assert.equal(z.maxHealth,E(`V017Monsters.stats('${z.type}',false).hp`));}
 }
});
for(const day of [10,20,30,100])for(const [minute,want]of [[1,true],[180,true],[359,true],[360,false],[361,false]])check(`save.load.${day}.${minute}`,()=>{
 reset();time(day,minute);const raw=E('JSON.stringify(captureGameProgress())'),before=E('JSON.stringify(zombies.map(z=>[z.health,z.maxHealth]))');
 for(let n=0;n<3;n++){E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}))`);assert.equal(active(),want);assert.equal(E('JSON.stringify(zombies.map(z=>[z.health,z.maxHealth]))'),before);}
});
for(const day of [9,19,29])check(`save.preMidnight.${day}`,()=>{reset();time(day,1439);const raw=E('JSON.stringify(captureGameProgress())');time(1,480);E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));V016Lighting.tick(834)`);assert.equal(active(),true);});
for(let id=1;id<=5;id++)check(`save.slot.${id}.restoresCalendarNotPreviousSession`,()=>{
 reset();time(10,id%2?180:360);const raw=E('JSON.stringify(captureGameProgress())');const slot=setup('index.html',{['survival_base_v09_slot_'+id]:raw},{mainMenu:true});assert.equal(slot.eval(`V09Saves.load(${id})`),true);assert.equal(slot.eval("WorldEvents.isActive('day_x')"),id%2===1);assert.equal(slot.eval('GameState.session.activeSlot'),id);
});
for(const mode of ['PC','MOBILE'])check('input.'+mode+'.sharedWorldEvent',()=>{reset();E(`GameInput.setMode('${mode}')`);time(10,0);assert.equal(active(),true);time(10,360);assert.equal(active(),false);});
for(const stage of ['stage0','stage1','stage2'])check(`legacy.original23hSave.${stage}.removesExpiredBoostOnce`,()=>{
 const d=JSON.parse(fs.readFileSync('qa/'+stage+'/fixtures/day_x.json','utf8'));assert.ok(d.lighting016.minute>=360);
 E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(JSON.stringify(d))}))`);assert.equal(active(),false);
 for(const [i,z]of json(E('zombies')).entries())if(z.alive){assert.equal(z.maxHealth,E(`V017Monsters.stats('${z.type}',false).hp`));assert.ok(Math.abs(z.health/z.maxHealth-d.zombies[i].health/E(`V017Monsters.stats('${z.type}',true).hp`))<1e-12);}
 const raw=E('JSON.stringify(captureGameProgress())');E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}))`);assert.equal(E('JSON.stringify(captureGameProgress())'),raw);
});
check('debug.notExposedInProduction',()=>{assert.equal(E('typeof WorldEvents.debugOverride'),'undefined');const html=fs.readFileSync('index.html','utf8');assert.ok(!html.includes('dev/'));assert.ok(!html.includes('worldEventDebug'));});
check('debug.realIsolatedStorageStartStopBoundaryAndSaves',()=>{
 const saves=Object.fromEntries(Array.from({length:5},(_,i)=>['survival_base_v09_slot_'+(i+1),initial]));let original;
 const d=setup('index.html',saves,{beforeScripts:s=>{original=s.localStorage;vm.runInNewContext(fs.readFileSync('dev/storage.js','utf8'),s);}});
 assert.notEqual(d.context.localStorage,original);const before=Object.fromEntries(d.storage),D=s=>d.eval(s);
 D("V016Lighting.restore({schema:1,day:1,minute:480});zombies.forEach(z=>{V017Monsters.prepare(z);z.health=z.maxHealth*.5})");const calendar=D('JSON.stringify(WorldClock.capture())');
 for(let n=0;n<5;n++){
  D("WorldEvents.debugOverride('day_x',true)");const hp=D('JSON.stringify(zombies.map(z=>[z.health,z.maxHealth]))');D("WorldEvents.debugOverride('day_x',true)");assert.equal(D('JSON.stringify(zombies.map(z=>[z.health,z.maxHealth]))'),hp);assert.equal(D('V017Monsters.factor()'),1.5);
  D("WorldEvents.debugOverride('day_x',false)");assert.equal(D('V017Monsters.factor()'),1);assert.equal(D('JSON.stringify(WorldClock.capture())'),calendar);
 }
 D("WorldEvents.debugOverride('day_x',null);V016Lighting.restore({schema:1,day:9,minute:1439});V016Lighting.tick(834)");assert.equal(D("WorldEvents.isActive('day_x')"),true);
 D('saveGameProgress();queueGameSave()');d.flushTimers(100);assert.deepEqual(Object.fromEntries(d.storage),before);
 D(fs.readFileSync('dev/panel.js','utf8'));assert.ok(d.doc.getElementById('qaOverlay'));assert.equal(d.errors.length,0);
});
check('events.extensibleChannelsAndNoAtmosphereInstalled',()=>{
 const c={window:{}};c.window=c;vm.createContext(c);for(const f of ['clock','events'])vm.runInContext(fs.readFileSync('src/world/'+f+'.js','utf8'),c);
 assert.deepEqual(Object.keys(json(c.WorldEvents.snapshot().modifiers)),[]);
 vm.runInContext("WorldEvents.register({id:'qa_event',schedule:({day})=>day===2,modifiers:{'spawn.intensity':1.25,'lighting.darkness':.9,'audio.ambient':.5}});WorldClock.restore({schema:1,day:2,minute:0});",c);
 assert.equal(c.WorldEvents.value('lighting.darkness'),.9);assert.equal(c.WorldEvents.value('spawn.intensity'),1.25);c.WorldClock.restore({schema:1,day:3,minute:0});assert.equal(c.WorldEvents.value('lighting.darkness'),1);
});
check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
const result={version:require('../package.json').version,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks};fs.writeFileSync('qa/results/world-events.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL')}));if(result.failed)process.exitCode=1;
