// 0.43 Post-Pass-B corrective: save ownership/rollback, power stability, 20 kW, L2 doors, quick slots, combat visuals, farm visuals.
const fs=require('fs'),assert=require('assert/strict'),{performance}=require('perf_hooks'),{setup}=require('./runtime.cjs'),checks=[],perf={};
const test=(name,fn)=>{try{fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.stack});}console.log(name,checks.at(-1).ok?'PASS':'FAIL');};
const wrap=r=>({r,E:s=>r.eval(s),J:s=>JSON.parse(r.eval('JSON.stringify('+s+')'))});
const boot=(storage={},menu=false)=>wrap(setup('index.html',storage,menu?{mainMenu:true}:{}));
const share=(from,to)=>{to.r.storage.clear();for(const [k,v] of from.r.storage)to.r.storage.set(k,v);};
const resume='StoryPlayer.cancel();for(const p of GameFlow.reasons)GameFlow.resume(p);menuOpen=false;document.hidden=false;playerDead=false;';
const vitals='player.hunger=player.maxHunger||100;player.thirst=player.maxThirst||100;player.health=player.maxHealth;';
const frames=(g,n)=>{for(let i=0;i<n;i++){g.E('frameScale=3;'+vitals+'update()');g.r.advance(50);if(i%20===0)g.r.flushTimers(0);}};
const snapshot=g=>g.J(`{clock:[WorldClock.day,+WorldClock.minute.toFixed(3)],pos:[+player.x.toFixed(2),+player.y.toFixed(2),player.floor,scene],bag:bag.map(s=>s&&[s.type,s.qty]),storage:storageChests.map(c=>c.items.filter(Boolean).map(s=>[s.type,s.qty])),jobs:V09Craft.craftQueue.getJob('furnace'),farm:farmState,animals:GameLivestock.animals,feed:[GameLivestock.state.chicken,GameLivestock.state.cow],water:BunkerPassA.capture(),power:{fuel:V09Power.fuel,running:V09Power.running,battery:V010Energy.battery.charge,devices:Object.values(V09Power.devices).map(d=>d.enabled)},chapter:GameCampaign.capture?GameCampaign.capture():null}`);
const stored=(g,slot=1)=>g.J(`(()=>{const d=JSON.parse(localStorage.getItem(v09SlotKey(${slot})));return {day:d.lighting016.day,minute:d.lighting016.minute,savedAt:d.savedAt};})()`);
const overload=`WorldClock.restore({schema:1,day:8,minute:1420});scene="bunker";player.x=4700;player.y=-160;player.floor=2;V09Power.running=true;V09Power.fuel=100;
 for(const d of Object.values(V09Power.devices))d.enabled=true;V010Energy.battery.charge=.02;addItem("iron_ore",900);V09Craft.start("furnace","iron",90);`;

// ---------------- P0 Save rollback ----------------
test('p0_single_instance_overload_day8_to_day9_autosaves_and_continue_restores_latest',()=>{
 const g=boot({},true);g.E('V09Saves.newGame(1);'+resume+overload+'flushGameSave();window.qaWrites=0;{const o=localStorage.setItem.bind(localStorage);localStorage.setItem=(k,v)=>{if(k===v09SlotKey(1))qaWrites++;return o(k,v);};}');
 const a=performance.now();frames(g,2400);perf.p0Frames2400Ms=+(performance.now()-a).toFixed(1);
 const writes=g.E('qaWrites');assert.ok(writes>=7,'autosave every ~15 s: '+writes);assert.equal(g.E('GameState.session.blocked'),false);
 assert.ok(g.E('WorldClock.day')===9,'crossed midnight into Day 9');
 const before=snapshot(g);g.r.dispatch('pagehide');
 const s=stored(g);assert.deepEqual([s.day,+s.minute.toFixed(3)],before.clock,'exit flush wrote the live clock');
 const f=boot(Object.fromEntries(g.r.storage),true);const latest=f.J('MainMenu.inspect().latest.id');assert.equal(latest,1);
 assert.equal(f.E('MainMenu.continueGame()'),true);f.E(resume);const after=snapshot(f);
 // Continue runs exactly one 16.7 ms frame after restore (sessionSelected -> gameLoop): allow that drift only.
 const near=(x,y,path)=>{if(typeof x==='number'&&typeof y==='number'){assert.ok(Math.abs(x-y)<=Math.max(.05,Math.abs(y)*1e-4)||/remainingMs|Ms$/.test(path)&&Math.abs(x-y)<=100,path+': '+x+' vs '+y);return;}
  if(x&&y&&typeof x==='object'){assert.deepEqual(Object.keys(x).sort(),Object.keys(y).sort(),path);for(const k of Object.keys(x))near(x[k],y[k],path+'.'+k);return;}assert.deepEqual(x,y,path);};
 for(const k of Object.keys(before))near(after[k],before[k],k);});
test('p0_stale_second_instance_cannot_overwrite_newer_progress',()=>{
 const A=boot({},true);A.E('V09Saves.newGame(1);'+resume+overload+'flushGameSave()');
 const B=boot(Object.fromEntries(A.r.storage),true);B.r.advance(7777);assert.equal(B.E('MainMenu.continueGame()'),true);B.E(resume);assert.equal(B.J('V09SlotOwner.conflict'),false);
 B.E('WorldClock.restore({schema:1,day:9,minute:600});player.x=4800;flushGameSave()');const newest=B.r.storage.get('survival_base_v09_slot_1');
 share(B,A);// The older window is still alive with Day 8 in memory.
 assert.equal(A.E('WorldClock.day'),8);assert.equal(A.E('saveGameProgress()'),false,'stale autosave refused');
 assert.equal(A.J('V09SlotOwner.conflict'),true);assert.equal(A.E('GameState.session.blocked'),true);assert.equal(A.r.storage.get('survival_base_v09_slot_1'),newest);
 A.E('queueGameSave()');A.r.flushTimers(20000);A.r.dispatch('pagehide');A.E('document.hidden=true');A.r.flushTimers(1000);
 assert.equal(A.r.storage.get('survival_base_v09_slot_1'),newest,'pagehide/visibility flush of the stale window writes nothing');
 assert.match(A.E("el('saveStatus').textContent"),/другом окне|another window/);
 // Recovery in the old window: Saves -> Continue loads the newest progress and takes the slot back.
 A.E('document.hidden=false');assert.equal(A.E('V09Saves.load(1)'),true);A.E(resume);assert.equal(A.E('WorldClock.day'),9);assert.equal(A.J('V09SlotOwner.conflict'),false);
 A.E('player.x=4810');assert.equal(A.E('saveGameProgress()'),true);share(A,B);assert.equal(B.E('saveGameProgress()'),false,'now B is the stale copy');});
test('p0_storage_event_locks_stale_window_immediately',()=>{
 const A=boot({},true);A.E('V09Saves.newGame(1);'+resume+'flushGameSave()');const B=boot(Object.fromEntries(A.r.storage),true);B.r.advance(7777);B.E('MainMenu.continueGame()');share(B,A);
 assert.notEqual(A.E('V09SlotOwner.instance'),B.E('V09SlotOwner.instance'));A.r.dispatch('storage',{key:'survival_base_v09_owner_1',newValue:B.E('V09SlotOwner.instance')});
 assert.equal(A.J('V09SlotOwner.conflict'),true);assert.equal(A.E('GameState.session.timer'),null);});
test('p0_continue_picks_newest_valid_save_and_backup_only_for_corrupt_primary',()=>{
 const g=boot({},true);g.E('V09Saves.newGame(1);'+resume+'WorldClock.restore({schema:1,day:3,minute:100});flushGameSave()');g.r.advance(60000);
 g.E('V09Saves.newGame(2);'+resume+'WorldClock.restore({schema:1,day:7,minute:100});flushGameSave();WorldClock.restore({schema:1,day:8,minute:900});flushGameSave()');g.r.advance(60000);
 g.E('V09Saves.newGame(3);'+resume+'WorldClock.restore({schema:1,day:5,minute:100});flushGameSave()');g.r.advance(60000);
 g.E('V09Saves.load(2);'+resume);g.r.advance(1000);g.E('WorldClock.restore({schema:1,day:9,minute:30});flushGameSave()');
 const f=boot(Object.fromEntries(g.r.storage),true);let i=f.J('(()=>{const d=MainMenu.inspect();return {id:d.latest.id,rec:d.latest.recovered}})()');assert.deepEqual(i,{id:2,rec:false});
 f.E('MainMenu.continueGame()');assert.deepEqual(f.J('[WorldClock.day,Math.round(WorldClock.minute)]'),[9,30]);
 // Corrupt primary: the independent backup (previous verified save of the same slot) is used and marked.
 const store=Object.fromEntries(g.r.storage);store.survival_base_v09_slot_2='{broken';delete store.survival_base_v09_slot_3;delete store.survival_base_v09_slot_3_backup;const h=boot(store,true);i=h.J('(()=>{const d=MainMenu.inspect();return {id:d.latest.id,rec:d.latest.recovered}})()');assert.deepEqual(i,{id:2,rec:true});
 h.E('MainMenu.continueGame()');assert.deepEqual(h.J('[WorldClock.day,Math.round(WorldClock.minute)]'),[8,900]);});


// ---------------- P1/P2 Power: stable overload, 20 kW ----------------
const furnaces=g=>{g.E(resume+"StoryPlayer.cancel();GameStory.request('finish_intro',{outcome:'skipped'});StoryPlayer.cancel();"+resume+"scene='bunker';player.x=1210;player.y=440;player.floor=1;V09Power.running=true;V09Power.fuel=100;V010Energy.battery.charge=1;for(const d of Object.values(V09Power.devices))d.enabled=true;V09Power.devices[GameCampaign.powerId].enabled=true;V09Power.frame++");
 for(const a of ['obtain','submit'])assert.equal(g.J(`GameResearch.request('${a}',{sourceId:'source.core_diagnostics'})`).ok,true);assert.equal(g.J("GameResearch.request('research',{researchId:'research.station_fabrication'})").ok,true);
 const ids=['furnace'];for(const [x,y] of [[630,400],[420,620]]){g.E("player.x=1210;player.y=440;player.floor=1;bag=bag.map(()=>null);for(const [t,q]of [['iron',40],['parts',20],['concrete',20]])addItem(t,q)");const c=g.J("GamePlacement.request('furnace','craft')");assert.equal(c.ok,true,JSON.stringify(c));g.r.context.qaCid=c.instanceId;
  g.r.context.qaTarget=g.J(`GamePlacement.centered('furnace','reserve_l1',${x},${y})`);g.E("{const b=BunkerLayout.rooms.reserve_l1;player.x=(b.left+b.right)/2;player.y=(b.top+b.bottom)/2;}");assert.equal(g.J("GamePlacement.request(qaCid,'place',qaTarget)").ok,true);ids.push(c.instanceId);}
 g.E("bag=bag.map(()=>null);addItem('iron_ore',900);scene='bunker';player.x=4700;player.y=-160;player.floor=2;V010Energy.battery.charge=0;V09Power.frame++");return ids;};
const alloc=g=>g.J('(()=>{V09Power.frame++;const a=V09Power.allocation();return {demand:+a.demand.toFixed(2),load:+a.load.toFixed(2),supply:+a.supply.toFixed(2),generator:a.generator,battery:+a.batteryOutput.toFixed(2),shed:a.shed.length,recovering:a.recovering}})()');
const tick=(g,seconds,dt=.1)=>g.J(`(()=>{let toggles=0,prev=null,on=0,n=0;for(let t=0;t<${seconds};t+=${dt}){V09Power.frame++;powerTick(${dt});const s=V09Power.allocation().served.has('furnace');if(prev!==null&&s!==prev)toggles++;prev=s;n++;if(s)on++;}return {toggles,onShare:+(on/n).toFixed(3),charge:+V010Energy.battery.charge.toFixed(4),recovering:V010Energy.recovering}})()`);
let P=null;const power=()=>{if(!P){P=boot({},true);P.E('V09Saves.newGame(1)');P.ids=furnaces(P);}return P;};
test('p2_generator_20kW_everywhere_fuel_per_kW_unchanged',()=>{const g=power();assert.equal(g.E('V09Power.supply'),20);assert.equal(g.E('V09Power.fuelKW'),10);
 assert.equal(g.E("I18n.t('legacy.e5911fec9a7f')").includes('20'),true);g.E("I18n.setLanguage&&I18n.setLanguage('ru')");
 g.E('v09OpenGenerator()');assert.match(g.E("el('v09GeneratorOverlay').textContent"),/20/);assert.doesNotMatch(g.E("el('v09GeneratorOverlay').textContent"),/(^|[^0-9.,])10 (кВт|kW)(?! ?load| нагрузк)/);closeOverlay(g);
 // Fuel per kW of real load is unchanged: a 10 kW load still burns 1 unit per minute (0.43 Pass B rule), 20 kW burns 2.
 g.E("for(const d of Object.values(V09Power.devices))d.enabled=false;V09Power.running=true;V09Power.fuel=50;V010Energy.battery.enabled=false;V09Power.frame++");
 const f0=g.E('V09Power.fuel');g.E('for(let i=0;i<600;i++){V09Power.frame++;powerTick(.1)}');assert.ok(Math.abs(f0-g.E('V09Power.fuel'))<.001,'no load, no burn');
 g.E("V09Power.devices.furnace.enabled=true;V09Craft.start('furnace','iron',50);V09Power.frame++");const kw=alloc(g).load;const f1=g.E('V09Power.fuel');g.E('for(let i=0;i<600;i++){V09Power.frame++;powerTick(.1)}');
 assert.ok(Math.abs((f1-g.E('V09Power.fuel'))-kw/10)<.01,'fuel/min = load/10 kW: '+kw+' '+(f1-g.E('V09Power.fuel')));perf.fuelPerMinute={loadKW:kw,units:+(f1-g.E('V09Power.fuel')).toFixed(3)};g.E("V010Energy.battery.enabled=true;for(const d of Object.values(V09Power.devices))d.enabled=true");});
function closeOverlay(g){g.E("for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o)");}
test('p2_measured_loads_1_2_3_furnaces_and_full_base',()=>{const g=power();g.E("V09Power.running=true;V09Power.fuel=100;V010Energy.battery.charge=0;for(const d of Object.values(V09Power.devices))d.enabled=true");
 const dev=id=>`V09Power.devices[GameEquipment.get('${id}')?.refs?.device||'${id}']`;for(const id of g.ids){g.r.context.qaF=id;if(!g.E('!!V09Craft.craftQueue.getJob(qaF)'))assert.equal(g.E("V09Craft.start(qaF,'iron',60)"),true);g.E(dev(id)+'.enabled=false');}
 const base=alloc(g);perf.loads={base:base.demand};assert.ok(base.demand>4&&base.demand<7,'normal base with L2 + animals + water: '+base.demand);
 g.ids.forEach((id,i)=>{assert.equal(g.E(dev(id)+'.watts'),6);g.E(dev(id)+'.enabled=true');perf.loads['furnaces'+(i+1)]=alloc(g).demand;});
 assert.equal(+(perf.loads.furnaces1-base.demand).toFixed(2),6);assert.equal(+(perf.loads.furnaces2-base.demand).toFixed(2),12);assert.equal(+(perf.loads.furnaces3-base.demand).toFixed(2),18);
 assert.ok(perf.loads.furnaces2<=20&&perf.loads.furnaces3>20,JSON.stringify(perf.loads));
 perf.loads.byRoom=g.J("Object.values(V09Power.devices).filter(d=>d.enabled&&d.active()).reduce((m,d)=>(m[d.room]=+((m[d.room]||0)+d.watts).toFixed(2),m),{})");
 perf.loads.stations=g.J("Object.fromEntries(Object.values(V09Power.devices).filter(d=>d.watts>=1).map(d=>[d.id,d.watts]))");});
test('p1_overload_battery_full_drains_without_flicker_then_stable_recovery',()=>{const g=power();g.E('V09Power.running=true;V09Power.fuel=100;V010Energy.battery.enabled=true;V010Energy.battery.charge=V010Energy.battery.capacity');
 for(const id of g.ids){g.r.context.qaF=id;if(!g.E('!!V09Craft.craftQueue.getJob(qaF)'))g.E("V09Craft.start(qaF,'iron',60)");}
 tick(g,.2);const a=alloc(g);assert.ok(a.demand>20&&a.battery>0&&a.shed===0,JSON.stringify(a));
 // Battery full -> draining: 60 s of play, bus stays on.
 let t=tick(g,60);assert.equal(t.toggles,0);assert.equal(t.onShare,1);perf.drainSeconds=+(1.5/(a.demand-20)*3600).toFixed(0);
 // Jump to the last 2 s of charge: empties once, then a single stable OFF while recovering.
 g.E('V010Energy.battery.charge=.001');t=tick(g,120);assert.ok(t.toggles<=1,'one OFF edge: '+JSON.stringify(t));assert.equal(t.recovering,true);assert.ok(t.charge>0);
 const off=alloc(g);assert.equal(off.load,0);assert.ok(off.shed>0);
 // 200 s of recovery: no ON/OFF churn (old build: ~20 toggles per second).
 t=tick(g,200);assert.equal(t.toggles,0,JSON.stringify(t));assert.equal(t.onShare,0);
 // Recovery after charging: exactly one ON edge at 20 %, then the deficit is covered again.
 t=tick(g,120);assert.equal(t.toggles,1,JSON.stringify(t));assert.equal(t.recovering,false);assert.ok(alloc(g).shed===0);
 perf.recoverySeconds=+(1.5*.2/3*3600).toFixed(0);});
test('p1_recovery_after_load_drops_is_immediate',()=>{const g=power();g.E('V010Energy.battery.charge=.001');tick(g,5);assert.equal(g.J('V010Energy.recovering'),true);assert.ok(alloc(g).shed>0);
 g.r.context.qaF=g.ids[2];g.E('V09Power.devices[GameEquipment.get(qaF).refs.device].enabled=false');
 const a=alloc(g);assert.ok(a.demand<=20,JSON.stringify(a));assert.equal(a.shed,0,'generator serves at once while the reserve recharges');const t=tick(g,30);assert.equal(t.toggles,0);assert.equal(t.onShare,1);
 g.E('V09Power.devices[GameEquipment.get(qaF).refs.device].enabled=true');});
test('p1_generator_stopped_reserve_drains_normally_no_latch',()=>{const g=power();g.E('V010Energy.battery.charge=.001');tick(g,3);assert.equal(g.J('V010Energy.recovering'),true);
 // Fuel runs out: nothing can refill the reserve, so there is no oscillation to prevent; a small load runs on it again.
 g.E('V09Power.running=false;V010Energy.battery.charge=.25;for(const d of Object.values(V09Power.devices))d.enabled=false;V09Power.devices[GameCampaign.powerId].enabled=true');tick(g,.2);assert.equal(g.J('V010Energy.recovering'),false);
 assert.equal(g.E('V09Power.allocation().served.has(GameCampaign.powerId)'),true,'core runs on the reserve');g.E('V09Power.running=true;V09Power.fuel=100;for(const d of Object.values(V09Power.devices))d.enabled=true;V010Energy.battery.charge=V010Energy.battery.capacity');});
test('p1_battery_insufficient_is_a_stable_off_state',()=>{const g=power();g.E("V010Energy.battery.charge=V010Energy.battery.capacity;V010Energy.battery.maxDischarge=2");
 const a=alloc(g);assert.ok(a.demand>a.generator+2,'deficit larger than battery output');assert.ok(a.shed>0);const t=tick(g,60);assert.equal(t.toggles,0);assert.equal(t.onShare,0);g.E('V010Energy.battery.maxDischarge=6');});
test('p1_save_load_each_power_state',()=>{const g=power();const states=[['full',`V010Energy.battery.charge=V010Energy.battery.capacity`,false],['draining',`V010Energy.battery.charge=.7`,false],['recovering',`V010Energy.battery.charge=.001`,true]];
 for(const [name,setup,rec] of states){g.E(setup);tick(g,name==='recovering'?3:1);const before={a:alloc(g),charge:g.E('V010Energy.battery.charge'),rec:g.J('V010Energy.recovering')};assert.equal(before.rec,rec,name);
  g.E('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())));'+resume);const after={a:alloc(g),charge:g.E('V010Energy.battery.charge'),rec:g.J('V010Energy.recovering')};assert.deepEqual(after,before,name);}
 assert.throws(()=>g.E("{const d=captureGameProgress();d.v010.energy.battery.recovering='yes';decodeGameProgress(JSON.stringify(d))}"));});

// ---------------- P3 L2 doors / Base Control ----------------
const legacy042=fs.readFileSync('qa/fixtures/legacy-042-new-game.json','utf8');
const doorTable=g=>g.J("(()=>{V09Power.frame++;const a=V09Power.allocation();return Object.fromEntries(v09Doors.filter(d=>!d.alwaysOpen).map(d=>[d.id,{enabled:V09Power.devices['door_'+d.room].enabled,served:a.served.has('door_'+d.room),auto:GameBaseControl.autoOpen(d.id)}]))})()");
const approach=(g,id,side,seconds=1.2)=>g.J(`(()=>{const d=v09Doors.find(d=>d.id==='${id}');const f=BunkerLayout.rooms[d.room].floor,cx=d.x+d.w/2,cy=d.y+d.h/2;scene='bunker';player.floor=f;if(d.horizontal){player.x=cx;player.y=cy+${side}*60;}else{player.x=cx+${side}*60;player.y=cy;}for(let t=0;t<${seconds};t+=1/60){V09Power.frame++;powerTick(1/60);}return +d.open.toFixed(2);})()`);
const closeAll=g=>g.E("for(const d of v09Doors)if(!d.alwaysOpen){d.open=0;d.away=4;d.manual=false;}player.x=2800;player.y=100;for(let i=0;i<10;i++){V09Power.frame++;powerTick(1/60);}for(const d of v09Doors)if(!d.alwaysOpen){d.open=0;d.away=4;d.manual=false;}");
const legacyGame=()=>{const g=boot({},true);g.r.context.qaLegacy=legacy042;assert.equal(g.E('V09Saves.importRaw(qaLegacy)'),true);g.E(resume+"scene='bunker';V09Power.running=true;V09Power.fuel=100;V010Energy.battery.charge=V010Energy.battery.capacity;V09Power.frame++");return g;};
test('p3_root_cause_042_saves_left_L2_door_switches_off_now_normalised',()=>{const raw=JSON.parse(legacy042);
 for(const id of ['door_room6','door_room4','door_room7','door_farm'])assert.equal(raw.v09.power.deviceEnabled[id],false,'0.42 new game stored '+id+' off');
 const g=legacyGame();const t=doorTable(g);for(const [id,v] of Object.entries(t)){assert.equal(v.enabled,true,id);assert.equal(v.served,true,id);assert.equal(v.auto,true,id);}
 // The saved game now carries the repaired switch.
 assert.equal(g.J("captureGameProgress().v09.power.deviceEnabled.door_room6"),true);});
test('p3_all_L1_L2_doors_auto_open_from_both_sides_normal_power',()=>{const g=legacyGame();for(const id of Object.keys(doorTable(g))){for(const side of [-1,1]){closeAll(g);assert.ok(approach(g,id,side)>.9,id+' side '+side);}}});
test('p3_auto_off_blocks_auto_open_manual_still_opens',()=>{const g=legacyGame();for(const id of ['v09door_room6','v09door_room4','v09door_room7','v09door_workshop','v09door_pantry']){g.r.context.qaD=id;
 const rev=g.E('GameBaseControl.revision');g.E("bagCount('remote')||addItem('remote',1)");assert.equal(g.J(`GameBaseControl.request(qaD,'doorAuto',{value:false,previous:true},${rev})`).ok,true);assert.equal(g.E('GameBaseControl.autoOpen(qaD)'),false);
 closeAll(g);assert.ok(approach(g,id,-1)<.05,id+' stays closed with auto-open OFF');
 g.E("{const d=v09Doors.find(d=>d.id===qaD);executeInteraction({...d,kind:'v09door',range:68});}");g.E('menuOpen=false');assert.ok(approach(g,id,-1,1)>.9,id+' manual open');
 const rev2=g.E('GameBaseControl.revision');assert.equal(g.J(`GameBaseControl.request(qaD,'doorAuto',{value:true,previous:false},${rev2})`).ok,true);}});
test('p3_overload_doors_unpowered_manual_open_then_recover',()=>{const g=legacyGame();g.E("V010Energy.battery.charge=0;registerPowerDevice('qa_overload','workshop',30,()=>true,'QA');V09Power.frame++;for(let i=0;i<5;i++){V09Power.frame++;powerTick(.1);}");
 const t=doorTable(g);assert.ok(Object.values(t).every(v=>v.enabled&&!v.served),'whole bus shed, switches untouched');closeAll(g);assert.ok(approach(g,'v09door_room6',1)<.05,'no power, no auto-open');
 g.E("{const d=v09Doors.find(d=>d.id==='v09door_room6');executeInteraction({...d,kind:'v09door',range:68});menuOpen=false;}");assert.ok(approach(g,'v09door_room6',1,1)>.9,'manual open without power');
 g.E("V09Power.devices.qa_overload.enabled=false;V09Power.frame++");closeAll(g);assert.ok(approach(g,'v09door_room6',1)>.9,'power back -> auto-open');});
test('p3_door_states_survive_save_load',()=>{const g=legacyGame();g.r.context.qaD='v09door_room4';const rev=g.E('GameBaseControl.revision');g.E("bagCount('remote')||addItem('remote',1)");g.J(`GameBaseControl.request(qaD,'doorAuto',{value:false,previous:true},${rev})`);
 const before=doorTable(g);g.E('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())));'+resume);assert.deepEqual(doorTable(g),before);assert.equal(before.v09door_room4.auto,false);});
test('p3_base_control_labels_feed_mill_and_open_passage_hint',()=>{const g=boot();for(const lang of ['ru','en']){g.E(`I18n.setLanguage('${lang}')`);assert.notEqual(g.E("I18n.t('build.type.feed_craft')"),'build.type.feed_craft');assert.match(g.E("I18n.t('control.openPassage')"),/door|двер/i);}
 assert.equal(g.E("I18n.t('build.type.feed_craft')"),'Feed mill');assert.deepEqual(g.J("v09Doors.filter(d=>d.alwaysOpen).map(d=>d.room).sort()"),['empty_l1','reserve_l1']);
 assert.ok(fs.readFileSync('src/ui/base-control.js','utf8').includes("data-control-hint")||fs.readFileSync('src/ui/base-control.js','utf8').includes("controlHint='openPassage'"));});

// ---------------- P4 Quick slots 5 -> 6, instant consumables ----------------
const quickGame=()=>{const g=boot();g.E(resume+"scene='surface';player.x=800;player.y=860;bag=bag.map(()=>null);addItem('water',4);addItem('meds',2);addItem('adrenaline_injector',3);addItem('bread',5);player.thirst=20;player.hunger=20;player.health=40;renderQuickSlots()");return g;};
const moveKey=(g,code,type)=>g.r.dispatch(type,{key:code.replace('Key','').toLowerCase(),code,repeat:false});
test('p4_six_slots_same_owner_hud_and_inventory',()=>{const g=quickGame();assert.deepEqual(g.J("[el('hotbar').children.length,el('quickSlots').children.length]"),[6,6]);
 assert.equal(g.J("[...el('hotbar').children].at(-1).dataset.quickConsumable"),'1');assert.equal(g.J("[...el('hotbar').children].slice(0,5).every(b=>!b.dataset.quickConsumable)"),true);
 assert.equal(g.E('V013Inventory.items.length'),5,'slots 1-5 unchanged');assert.equal(g.E("V013Inventory.bindConsumable('rifle_ak74')"),false,'weapons/tools are not consumables');assert.equal(g.E("V013Inventory.bindConsumable('water')"),true);
 assert.equal(g.J("captureGameProgress().quick013.consumable"),'water');});
test('p4_instant_use_water_meds_buff_one_each_no_inventory_no_channel',()=>{const g=quickGame();
 for(const [type,before,check] of [['water',4,"player.thirst>20"],['meds',2,"player.health>40"],['adrenaline_injector',3,"GameSurvival.remaining('adrenaline')>0"],['bread',5,"player.hunger>20"]]){
  g.E(`V013Inventory.bindConsumable('${type}')`);assert.equal(g.E(`bagCount('${type}')`),before);const vit=g.J('[player.thirst,player.health,player.hunger]');
  assert.equal(g.E("GameActions.dispatch('SELECT_SLOT',{index:5})"),true,type);assert.equal(g.E(`bagCount('${type}')`),before-1,type+' -1 at once');assert.equal(g.E(check),true,type+' effect');
  assert.equal(g.E('SurvivalUse.active'),false,'no channel/progress bar');assert.equal(g.E("document.querySelectorAll('.overlay.open').length"),0,'no inventory/confirmation');
  assert.match(g.E("[...el('hotbar').children].at(-1).textContent"),new RegExp('×'+(before-1)));}
 // Effect applied once per press.
 g.E("V013Inventory.bindConsumable('water');player.thirst=10");g.E("GameActions.dispatch('SELECT_SLOT',{index:5})");assert.equal(g.E('player.thirst'),50);});
test('p4_full_or_missing_consumable_is_not_spent',()=>{const g=quickGame();g.E("V013Inventory.bindConsumable('water');player.thirst=GameplayBalance.survival.max");assert.equal(g.E("GameActions.dispatch('SELECT_SLOT',{index:5})"),false);assert.equal(g.E("bagCount('water')"),4);
 g.E("bag=bag.map(s=>s?.type==='water'?null:s);renderQuickSlots();player.thirst=10");assert.equal(g.E("GameActions.dispatch('SELECT_SLOT',{index:5})"),false);assert.equal(g.E('player.thirst'),10);assert.match(g.E("[...el('hotbar').children].at(-1).className"),/v043Empty/);});
test('p4_keyboard_1_to_6_while_running_movement_not_stopped',()=>{const g=quickGame();g.E("V013Inventory.bindConsumable('water');GameInput.setMode&&GameInput.setMode('PC')");
 g.E("addItem('axe',1);addItem('flashlight',1);moveX=0;moveY=-1;movePower=1;player.running=true");for(let i=0;i<5;i++)g.E('frameScale=1;update()');const y0=g.E('player.y');
 assert.equal(g.E('player.moving'),true,'walking/running');const canvas=g.r.doc.querySelector('#canvas');
 for(const key of ['1','2','3','4','5','6']){const water=g.E("bagCount('water')");g.r.emit('keydown',canvas,{key,code:'Digit'+key,repeat:false});g.r.emit('keyup',canvas,{key,code:'Digit'+key});
  for(let i=0;i<3;i++)g.E('frameScale=1;update()');assert.deepEqual(g.J('[player.moving,movePower]'),[true,1],'still moving after '+key);g.E("for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false");if(key==='6')assert.equal(g.E("bagCount('water')"),water-1,'6 used water while moving');}
 assert.ok(g.E('player.y')<y0-5,'kept moving through all presses');g.E('movePower=0');});
test('p4_mobile_hotbar_tap_uses_slot6',()=>{const g=quickGame();g.E("V013Inventory.bindConsumable('meds')");g.E("[...el('hotbar').children].at(-1).click()");assert.equal(g.E("bagCount('meds')"),1);
 g.E("[...el('quickSlots').children].at(-1).click()");assert.equal(g.E("el('v043ConsumablePicker').classList.contains('open')"),true,'inventory slot 6 opens the picker');
 g.E("el('v043ConsumablePicker').querySelector('[data-consumable-type=\"water\"]').click()");assert.equal(g.E('V013Inventory.consumable'),'water');});
test('p4_save_load_and_legacy_5_slot_saves',()=>{const g=quickGame();g.E("V013Inventory.bindConsumable('bread')");g.E('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())))');assert.equal(g.E('V013Inventory.consumable'),'bread');
 const legacy=JSON.parse(legacy042);assert.equal(legacy.quick013.consumable,undefined);g.r.context.qaL=legacy042;g.E('restoreGameProgress(decodeGameProgress(qaL))');assert.equal(g.E('V013Inventory.consumable'),null);assert.equal(g.J("el('hotbar').children.length"),6);
 assert.throws(()=>g.E("{const d=captureGameProgress();d.quick013.consumable='rifle_ak74';decodeGameProgress(JSON.stringify(d))}"));
 g.E("V013Inventory.bindConsumable('bread')");assert.equal(g.J("GameNewGame.create().quick013.consumable??null"),null,'new game starts with an empty slot 6');});

// ---------------- P5 Combat visuals ----------------
const combatGame=()=>{const g=boot();g.E(resume+"scene='surface';player.x=640;player.y=300;zombies.forEach(z=>{z.alive=false;});{const z=zombies[0];z.alive=true;z.health=z.maxHealth=5000;z.x=900;z.y=300;z.state='idle';}bag=bag.map(()=>null);addItem('rifle_ak74',1);addItem('ammo',60);V013Inventory.equip('rifle_ak74');player.aimX=1;player.aimY=0;rightAimActive=true;aimPower=1;V09Power.frame++");return g;};
test('p5_old_two_lines_and_circle_indicator_removed',()=>{const src=fs.readFileSync('src/crafting/manufacturing.js','utf8')+fs.readFileSync('src/core/rendering.js','utf8');
 assert.ok(!src.includes("rgba(235,220,162,.28)"),'spread-cone lines gone');assert.ok(!src.includes("ctx.arc(player.x+dx*reach,player.y+dy*reach,4"),'reach circle gone');
 const g=combatGame();for(const [label,setup] of [['aiming full mag',''],['aiming empty mag',"V010Combat.currentWeapon().rounds=0;bag=bag.map(s=>s?.type==='ammo'?null:s)"]]){g.E(setup);
  const calls=g.J(`(()=>{const out=[];const A=ctx.arc,L=ctx.lineTo;ctx.arc=function(x,y,r,...a){out.push(['arc',Math.round(Math.hypot(x-player.x,y-player.y)),r]);return A.call(this,x,y,r,...a);};ctx.lineTo=function(x,y){out.push(['line',Math.round(Math.hypot(x-player.x,y-player.y))]);return L.call(this,x,y);};try{drawPlayer();}finally{ctx.arc=A;ctx.lineTo=L;}return out;})()`);
  assert.equal(calls.filter(c=>c[0]==='arc'&&c[2]===4&&c[1]>=18&&c[1]<=88).length,0,label+': no reach circle');assert.equal(calls.filter(c=>c[0]==='line'&&c[1]>=120&&c[1]<=130).length,0,label+': no cone lines');}});
test('p5_player_shot_muzzle_flash_60ms_tracer_and_zero_ammo_nothing',()=>{const g=combatGame();const z0=g.E('zombies[0].health'),n0=g.E('CombatVfx.shots');
 g.E('shoot()');assert.equal(g.E('CombatVfx.shots')-n0,1,'one tracer per real shot');assert.ok(g.E('CombatVfx.active()')>=1);assert.equal(g.E('V010Combat.currentWeapon().rounds'),29);
 assert.ok(fs.readFileSync('src/render/actors.js','utf8').includes('flashMs:Math.max(vfx.flashMs'),'player flash >= 60 ms');assert.equal(g.E('CombatVfx.constants.FLASH_MS'),60);
 // Hitscan/projectile stays authoritative: the tracer is only a picture.
 for(let i=0;i<60;i++)g.E('frameScale=1;updateBullets()');assert.ok(g.E('zombies[0].health')<z0,'projectile still does the damage');
 g.E("V010Combat.currentWeapon().rounds=0;bag=bag.map(s=>s?.type==='ammo'?null:s)");const n1=g.E('CombatVfx.shots'),t1=g.E('muzzleFlash.time'),z1=g.E('zombies[0].health');g.r.advance(1000);g.E('shoot()');for(let i=0;i<30;i++)g.E('frameScale=1;updateBullets()');
 assert.deepEqual([g.E('CombatVfx.shots')-n1,g.E('muzzleFlash.time')===t1,g.E('zombies[0].health')===z1],[0,true,true],'0 ammo: no tracer, no flash, no damage');});
test('p5_drone_and_turrets_real_shots_only_pooled',()=>{const g=combatGame();g.E("Object.assign(V014Robots.state,{scene:'surface',packed:false,task:'guard',mode:'defense',hp:100,battery:100,ammo:5,light:false,economy:false,x:820,y:300,guard:{scene:'surface',x:820,y:300}});rightAimActive=false;firing=false");
 const n0=g.E('CombatVfx.shots'),h0=g.E('zombies[0].health');for(let i=0;i<120;i++){g.E('frameScale=1;update()');g.r.advance(17);}const droneShots=5-g.E('V014Robots.state.ammo');assert.ok(droneShots>0,'drone fired');
 assert.equal(g.E('CombatVfx.shots')-n0,droneShots,'one tracer per drone round');assert.ok(g.E('zombies[0].health')<h0);
 g.E('V014Robots.state.ammo=0');const n1=g.E('CombatVfx.shots');for(let i=0;i<60;i++){g.E('frameScale=1;update()');g.r.advance(17);}assert.equal(g.E('CombatVfx.shots'),n1,'no ammo, no drone tracer');
 // Wall heavy turret (V016): its tracer used to be stored but never drawn.
 g.E("Object.assign(V014Robots.state,{packed:true});V016Turret.guns.splice(0,9,{id:'hmg016_1',ammo:3,angle:-Math.PI*3/4,enabled:true,x:1410,y:1050,wallId:'v091wall020_corner_SE',fallen:false});{const z=zombies[0];z.alive=true;z.health=5000;}");const n2=g.E('CombatVfx.shots');
 for(let i=0;i<200;i++){g.E('frameScale=1;update();zombies[0].x=1560;zombies[0].y=1110');g.r.advance(17);}const used=3-g.E('V016Turret.guns[0].ammo');assert.equal(used,3,'heavy turret fired');assert.equal(g.E('CombatVfx.shots')-n2,used);perf.heavyTurretShots=used;
 const n3=g.E('CombatVfx.shots');for(let i=0;i<60;i++){g.E('frameScale=1;update();zombies[0].x=1560;zombies[0].y=1110');g.r.advance(17);}assert.equal(g.E('CombatVfx.shots'),n3,'empty heavy turret: no tracer');
 assert.ok(fs.readFileSync('src/defense/runtime.js','utf8').includes("kind:r.typeId==='heavy_turret'?'heavy':'turret'"),'automatic + heavy defense turrets report real shots');});
test('p5_vfx_pool_is_fixed_size',()=>{const g=combatGame();g.E("for(let i=0;i<5000;i++)CombatVfx.shot({scene:'surface',x0:0,y0:0,x1:300,y1:i%200,kind:'turret'})");const c=g.J('CombatVfx.constants');assert.ok(g.E('CombatVfx.active()')<=c.TRACERS+c.FLASHES);
 const a=performance.now();for(let i=0;i<20;i++)g.E('CombatVfx.draw()');perf.vfxDrawFullPoolMs=+((performance.now()-a)/20).toFixed(3);});

// ---------------- P6/P7/P8/P9 Farm, nest and Water Room visuals ----------------
const farmGame=()=>{const g=boot();g.E(resume+"scene='bunker';player.x=4700;player.y=-160;player.floor=2;GameLivestock.setRandom(null);V09Power.running=true;V09Power.fuel=100;for(const d of Object.values(V09Power.devices))d.enabled=true;V09Power.frame++");return g;};
test('p6_cows_face_far_wall_troughs_rumps_to_entrance_service_from_aisle',()=>{const g=farmGame();const fx=g.J('GameLivestock.fixtures'),cw=g.J('BunkerLayout.rooms.cow_farm'),door=g.J("v09Doors.find(d=>d.id==='v09door_cow_farm')");
 for(const t of [fx.cowFeeder,fx.cowDrinker]){assert.ok(t.y-cw.top<=12,'trough on the far wall');assert.equal(t.y+t.h,fx.stalls.y,'stalls start at the troughs');}
 assert.ok(door.y>fx.stalls.y+fx.stalls.h,'entrance is behind the cows');assert.equal(fx.stalls.y+fx.stalls.h-cw.top,149,'solid footprint unchanged (aisle edge)');assert.equal(g.J('GameplayBalance.animals.cowMax'),6);
 for(let i=0;i<6;i++){const c=g.J(`GameLivestock.stallCenter(${i})`);assert.ok(c.x>fx.stalls.x&&c.x<fx.stalls.x+fx.stalls.w&&c.y>fx.stalls.y&&c.y<fx.stalls.y+fx.stalls.h,'stall '+i);}
 for(const a of g.J("GameLivestock.list('cow')"))assert.equal(g.J(`GameLivestock.view(GameLivestock.animals.find(x=>x.id==='${a.id}'))`).angle,0,'faces the troughs, away from the door');
 g.E('for(const d of v09Doors)d.open=1;invalidateGeometry()');for(const id of ['l2_cow_feeder','l2_cow_drinker']){g.r.context.qaO=g.J(`interactionObjects('bunker').find(o=>o.id==='${id}')`);assert.ok(g.E("findWalkPath(4700,-160,{...qaO},'bunker',15)")?.length,id+' reachable from the aisle');}
 g.E(`player.x=${fx.cowFeeder.x+60};player.y=${fx.stalls.y+fx.stalls.h+24}`);assert.equal(g.E('worldCollision(player.x,player.y,player.radius,"bunker")'),false,'player stands in the aisle');g.E("executeInteraction(interactionObjects('bunker').find(o=>o.id==='l2_cow_feeder'))");assert.equal(g.E("el('livestockCows').classList.contains('open')"),true);});
test('p6_cow_stage_sizes_calf_juvenile_adult',()=>{const g=farmGame();const sizes=g.J(`(()=>{const out={};const E=ctx.ellipse;ctx.ellipse=function(x,y,rx,ry,...a){if(!window.qaFirst){window.qaFirst=[rx,ry];}return E.call(this,x,y,rx,ry,...a);};try{for(const stage of [0,1,2]){window.qaFirst=null;drawLivestockAnimal({id:'cow:q'+stage,kind:'cow',stage,ageMs:0,milkMs:0,stall:stage},0);out[stage]={w:+(qaFirst[0]/.31).toFixed(1),h:+(qaFirst[1]/.39).toFixed(1)};}}finally{ctx.ellipse=E;}return out;})()`);
 assert.ok(sizes[0].h<sizes[1].h&&sizes[1].h<sizes[2].h&&sizes[0].w<sizes[1].w&&sizes[1].w<sizes[2].w,JSON.stringify(sizes));assert.ok(sizes[2].h>=1.6*sizes[1].h&&sizes[2].h>=2.5*sizes[0].h,'adult clearly larger and longer '+JSON.stringify(sizes));assert.ok(sizes[2].h<121-8,'adult fits its stall');perf.cowSizes=sizes;});
test('p6_cow_lamp_moved_to_free_left_aisle_and_reachable',()=>{const g=farmGame();const fx=g.J('GameLivestock.fixtures'),door=g.J("v09Doors.find(d=>d.id==='v09door_cow_farm')"),lamp=g.J("BunkerLayout.lights('cow_farm')[0]"),cw=g.J('BunkerLayout.rooms.cow_farm');
 assert.ok(lamp.x<door.x&&lamp.x<(cw.left+cw.right)/2,'left part');assert.ok(lamp.y>fx.stalls.y+fx.stalls.h+20,'free aisle, not over troughs/stalls');g.E('for(const d of v09Doors)d.open=1;invalidateGeometry()');
 g.r.context.qaO=g.J("interactionObjects('bunker').find(o=>o.id==='lamp_cow_farm_0')");assert.ok(g.r.context.qaO,'lamp stays a service point');assert.ok(g.E("findWalkPath(4700,-160,{...qaO},'bunker',15)")?.length,'lamp reachable');});
const eggDraws=g=>g.J(`(()=>{let n=0;const E=ctx.ellipse;ctx.ellipse=function(x,y,rx,ry,...a){if(Math.abs(rx-3.2*.85)<1e-6&&Math.abs(ry-4.1*.85)<1e-6)n++;return E.call(this,x,y,rx,ry,...a);};try{GameLivestock.draw();}finally{ctx.ellipse=E;}return n;})()`);
test('p7_nest_shows_incubating_eggs_count_max6_and_brooding_hen_moves_a_little',()=>{const g=farmGame();g.E('player.x=5107;player.y=120');assert.equal(eggDraws(g),0,'empty nest without incubation');
 for(const n of [1,4,6]){g.E(`{const s=GameLivestock.state;s.animals=s.animals.filter(a=>a.kind==='cow').concat([{id:'chicken:1',kind:'chicken',stage:2,ageMs:3*GameLivestock.constants.DAY,eggMs:0,brood:{eggs:${n},progressMs:1000}},{id:'chicken:2',kind:'chicken',stage:2,ageMs:3*GameLivestock.constants.DAY,eggMs:0,brood:null}]);GameLivestock.poses.clear();}`);
  assert.equal(eggDraws(g),n,'eggs in the nest = brood '+n);}
 for(let i=0;i<30;i++)g.E('GameLivestock.update()');const v=g.J("GameLivestock.view(GameLivestock.animals.find(a=>a.brood))"),seat=g.J('GameLivestock.nestSeat');assert.equal(v.mode,'brood');assert.deepEqual([v.x,v.y],[seat.x,seat.y]);
 const rot=()=>g.J(`(()=>{const out=[];const R=ctx.rotate;ctx.rotate=function(a){out.push(+a.toFixed(4));return R.call(this,a);};try{drawLivestockAnimal(GameLivestock.animals.find(a=>a.brood),0);}finally{ctx.rotate=R;}return out;})()`);
 const a=rot();g.r.advance(900);const b=rot();assert.notDeepEqual(a,b,'small idle motion over time');assert.ok([...a,...b].every(x=>Math.abs(x)<.2),'motion stays small');
 assert.ok(g.E("typeof GameLivestock.drawFloor==='function'"));g.E("GameLivestock.drawFloor('cow_farm');GameLivestock.drawFloor('chicken_farm')");});
test('p8_pump_and_purifier_compact_on_bottom_wall_clear_of_lamp_door_and_passage',()=>{const g=farmGame();const q=g.J('BunkerLayout.rooms.water_room'),pump=g.J("BunkerPassA.fixtures.find(f=>f.id==='water_pump')"),pur=g.J("BunkerPassA.fixtures.find(f=>f.id==='water_purifier')"),tank=g.J('BunkerPassA.tank'),door=g.J("v09Doors.find(d=>d.id==='v09door_water_room')");
 for(const f of [pump,pur]){assert.ok(q.bottom-(f.y+f.h)<=14&&f.h<=46&&f.x>=q.left+10&&f.x+f.w<=q.right-10,f.id+' compact on the wall');assert.ok(f.y>door.y+door.h+40,f.id+' clear of the doorway');}
 for(const l of g.J("BunkerLayout.lights('water_room')"))for(const f of [pump,pur,tank])assert.ok(!(l.x>f.x-12&&l.x<f.x+f.w+12&&l.y>f.y-12&&l.y<f.y+f.h+12),'lamp clear of '+f.id);
 const bottomLamp=g.J("BunkerLayout.lights('water_room')[1]");assert.ok(bottomLamp.x-(pump.x+pump.w)>=20&&pur.x-bottomLamp.x>=20,'room between the units for the lamp');
 g.E('for(const d of v09Doors)d.open=1;invalidateGeometry()');for(const t of [tank,pump,pur]){g.r.context.qaO=t;assert.ok(g.E("findWalkPath(4700,-160,{...qaO,kind:'fixture',range:40},'bunker',15)")?.length,t.id);}
 g.r.context.qaO=g.J("interactionObjects('bunker').find(o=>o.id==='lamp_water_room_1')");assert.ok(g.E("findWalkPath(4700,-160,{...qaO},'bunker',15)")?.length,'bottom lamp reachable');
 assert.ok(g.E("typeof drawBoreholePump==='function'&&typeof drawFiltrationUnit==='function'&&typeof drawFeedMill==='function'"));});
const result={runtimeSha256:require('crypto').createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex'),passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,performance:perf,checks};
fs.mkdirSync('qa/results',{recursive:true});fs.writeFileSync('qa/results/post-pass-b.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,failed:result.failed,performance:perf}));if(result.failed){for(const c of checks.filter(c=>!c.ok))console.log(c.name,c.error.split('\n').slice(0,6).join('\n'));process.exitCode=1;}
