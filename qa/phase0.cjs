// 0.43 Phase 0 (final Pass A polish): speed, Pantry, removed Pantry<->farm doors and their save
// cleanup, centred doors, Water Room, horizontal bed and sleep, Medical/Kitchen furniture, L1 hall
// cabinet removal, floor fade, and the door matrix (healthy power / overload / auto / manual / save).
const fs=require('fs'),assert=require('assert/strict'),{setup}=require('./runtime.cjs'),r=setup('index.html'),E=s=>r.eval(s),J=s=>JSON.parse(E('JSON.stringify('+s+')')),checks=[];
const test=(name,fn)=>{try{fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.stack});}console.log(name,checks.at(-1).ok?'PASS':'FAIL');};
const reset=()=>E('StoryPlayer.cancel();restoreGameProgress(GameNewGame.create());for(const p of GameFlow.reasons)GameFlow.resume(p);menuOpen=false;document.hidden=false;playerDead=false;scene="bunker";player.x=1120;player.y=-120;player.floor=1;invalidateGeometry()');
const healthy=()=>E('V09Power.running=true;V09Power.fuel=80;V010Energy.battery.charge=V010Energy.battery.capacity;for(const d of Object.values(V09Power.devices))d.enabled=true;V09Power.frame++');
const tick=n=>E(`for(let i=0;i<${n};i++){V09Power.frame++;V09Power.tick(.1);}`);
const save=()=>E('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())));for(const p of GameFlow.reasons)GameFlow.resume(p);scene="bunker"');
const inside=(a,q)=>a.x>=q.left&&a.x+a.w<=q.right&&a.y>=q.top&&a.y+a.h<=q.bottom;
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const removedDoors=['v09door_pantry_chicken','v09door_pantry_cow'];
E(`window.p0Sides=d=>{const cx=d.x+d.w/2,cy=d.y+d.h/2,h=d.w>d.h,o=d.open;d.open=0;invalidateGeometry();const pick=sg=>{for(let k=45;k<=110;k+=5)for(const t of [0,-30,30,-60,60]){const p=h?{x:cx+t,y:cy+sg*k}:{x:cx+sg*k,y:cy+t};if(!worldCollision(p.x,p.y,15,'bunker'))return p;}return null;};const out=[pick(-1),pick(1)];d.open=o;invalidateGeometry();return out;}`);

test('speed_base_x130_and_modifiers_relative',()=>{reset();E('V010Combat.refreshStats?.()');const s=J('({walk:player.walkSpeed,run:player.runSpeed})');
 // Base 3.15/5.25 x1.30. Full joystick = runSpeed*0.60 px per 60 Hz frame = 245.7 px/s (was 189).
 assert.ok(Math.abs(s.walk-4.095)<1e-9&&Math.abs(s.run-6.825)<1e-9,JSON.stringify(s));assert.ok(Math.abs(s.run*.6*60-245.7)<.01);
 E("GameSurvival.grant?.('adrenaline')");const adrenaline=E("GameSurvival.active('adrenaline')");E('V010Combat.refreshStats?.()');
 if(adrenaline){const k=E('GameplayBalance.survival.effects.adrenaline.speed');assert.ok(Math.abs(E('player.runSpeed')-6.825*k)<1e-9);}});
test('pantry_top_wall_at_L2_bounds_other_rooms_unchanged',()=>{const q=J('BunkerLayout.rooms'),b=J('BunkerLayout.floorBounds[2]');
 assert.deepEqual([q.pantry.left,q.pantry.right,q.pantry.top,q.pantry.bottom],[4800,5240,b.y,-100]);assert.equal(b.y,-400);
 assert.deepEqual([q.cow_farm.top,q.chicken_farm.top,q.water_room.top,q.l2_corridor.top],[-240,-100,-100,-400]);
 for(const id of ['chest8','chest9','feed_craft'])assert.ok(inside(J(`BunkerLayout.fixture('${id}')`),q.pantry),id);
 for(const l of J("BunkerLayout.lights('pantry')"))assert.ok(l.y>q.pantry.top&&l.y<q.pantry.bottom);
 reset();E('player.x=4700;player.y=-160;player.floor=2;for(const d of v09Doors)d.open=1;invalidateGeometry()');assert.ok(E("findWalkPath(4700,-160,{id:'g',kind:'ground',x:5020,y:-250,r:0,range:1},'bunker',15)")?.length);});
test('pantry_farm_doors_removed_everywhere',()=>{reset();for(const id of removedDoors){r.context.rid=id;
 assert.equal(E('v09Doors.some(d=>d.id===rid)'),false);assert.equal(E('interactionObjects("bunker").some(o=>o.id===rid)'),false);assert.equal(E('solidObjects("bunker").some(o=>o.id===rid)'),false);
 assert.equal(E('!!V018Build.record(rid)'),false);assert.equal(E('GameBaseControl.list().some(d=>d.id===rid)'),false);}
 const s=JSON.stringify(J('captureGameProgress()'));for(const id of removedDoors)assert.ok(!s.includes(id),id);
 // Walls are now closed where the doors were: Pantry<->Chicken (y -100) and Pantry<->Cow (x 5240).
 assert.equal(E("lineClear(5112,-130,5112,-70,10,'bunker')"),false);assert.equal(E("lineClear(5210,-175,5270,-175,10,'bunker')"),false);});
test('current_043_save_with_removed_doors_loads_and_is_cleaned',()=>{reset();const raw=fs.readFileSync('qa/fixtures/phase0-corrective-save.json','utf8');assert.ok(raw.includes('v09door_pantry_cow')&&raw.includes('"v09door_pantry_cow":false'));
 r.context.p0raw=raw;E('restoreGameProgress(decodeGameProgress(p0raw));for(const p of GameFlow.reasons)GameFlow.resume(p)');
 assert.equal(E('player.floor'),2);assert.equal(E("worldCollision(player.x,player.y,player.radius,'bunker')"),false);
 // Owner records are gone (the base-control command receipt history may still name the old request; it is replay protection only).
 const c=J('captureGameProgress()');for(const id of removedDoors){assert.ok(!c.v09.power.doors.some(d=>d.id===id)&&!c.building018.doors.some(d=>d.id===id)&&!Object.hasOwn(c.control0353.autoOpen,id),id);}
 assert.deepEqual(J("GameEquipment.records.filter(r=>['chest8','chest9','feed_craft'].includes(r.id)).map(r=>[r.id,r.transform.x,r.transform.y,r.placement])").sort(),J("['chest8','chest9','feed_craft'].map(id=>{const f=BunkerLayout.fixture(id);return [id,f.x,f.y,'installed'];})").sort(),'authored Pantry objects move with the layout');
 assert.equal(E('v09Doors.length'),14);save();assert.equal(E('v09Doors.length'),14);});
test('old_position_inside_new_furniture_is_moved_free',()=>{reset();const d=JSON.parse(fs.readFileSync('qa/fixtures/phase0-corrective-save.json','utf8'));Object.assign(d.player||{},{});
 r.context.p0d=d;E('p0d.player.x=4265;p0d.player.y=0;restoreGameProgress(decodeGameProgress(JSON.stringify(p0d)));for(const p of GameFlow.reasons)GameFlow.resume(p)');
 assert.equal(E("worldCollision(player.x,player.y,player.radius,'bunker')"),false);assert.equal(E('BunkerLayout.floorAt(player.x,player.y)'),2);});
test('current_043_save_with_equipment_under_new_furniture_loads_and_packs_it',()=>{reset();r.context.p0raw=fs.readFileSync('qa/fixtures/phase0-corrective-save-placed.json','utf8');
 // Genuine corrective-baseline save: a Kitchen Stove where the dining table now stands and a Med Lab where the medical table now stands; the player inside the new table.
 E('restoreGameProgress(decodeGameProgress(p0raw));for(const p of GameFlow.reasons)GameFlow.resume(p)');
 for(const id of ['build:kitchen_stove:1','build:med_lab:1']){r.context.pid=id;assert.equal(E('GameEquipment.get(pid).placement'),'packed',id);assert.equal(E('GameCarried.owns(pid)'),true,id+' in the backpack');}
 assert.equal(E("worldCollision(player.x,player.y,player.radius,'bunker')"),false);save();for(const id of ['build:kitchen_stove:1','build:med_lab:1']){r.context.pid=id;assert.equal(E('GameEquipment.get(pid).placement'),'packed');}
 E("player.x=4700;player.y=-160;player.floor=2;window.pid='build:kitchen_stove:1'");assert.equal(J("GamePlacement.request(pid,'place',GamePlacement.centered('kitchen_stove','room6',4440,-60))").ok,true,'re-placeable in the kitchen');});
test('chicken_door_centred_and_passable',()=>{reset();const d=J("v09Doors.find(d=>d.id==='v09door_chicken_farm')"),q=J('BunkerLayout.rooms.chicken_farm');
 assert.equal(d.x+d.w/2,(q.left+q.right)/2);assert.equal(d.y+d.h/2,q.bottom);E("v09Doors.find(d=>d.id==='v09door_chicken_farm').open=1;invalidateGeometry()");
 assert.equal(E("lineClear(5107.5,200,5107.5,300,15,'bunker')"),true);});
test('water_room_door_centred_tank_top_pump_purifier_bottom_free_passage',()=>{reset();const d=J("v09Doors.find(d=>d.id==='v09door_water_room')"),q=J('BunkerLayout.rooms.water_room');
 assert.equal(d.y+d.h/2,(q.top+q.bottom)/2);const tank=J('BunkerPassA.tank'),pump=J("BunkerPassA.fixtures.find(f=>f.id==='water_pump')"),pur=J("BunkerPassA.fixtures.find(f=>f.id==='water_purifier')");
 assert.ok(tank.y-q.top<20&&inside(tank,q));for(const f of [pump,pur]){assert.ok(q.bottom-(f.y+f.h)<20&&inside(f,q));assert.ok(f.y>d.y+d.h+40,f.id+' clear of the doorway');}
 assert.ok(tank.y+tank.h<d.y,'tank above the doorway');E("v09Doors.find(d=>d.id==='v09door_water_room').open=1;invalidateGeometry()");
 assert.equal(E(`lineClear(4740,70,${q.right-25},70,15,'bunker')`),true);
 for(const t of [tank,pump,pur]){r.context.wt=t;E('player.x=4700;player.y=-160;player.floor=2');const p=E(`findWalkPath(4700,-160,{...wt,kind:'fixture',range:40},'bunker',15)`);assert.ok(p?.length,t.id);}
 // Water balance unchanged.
 assert.deepEqual(J('[GameplayBalance.water?.cleanTank??100,GameplayBalance.water?.purifierPerDay??28,GameplayBalance.water?.irrigationBuffer??40]'),[100,28,40]);});
test('bed_horizontal_on_bottom_wall_bath_side_routes_and_no_placement',()=>{reset();const b=J("BunkerLayout.fixture('bed')"),q=J('BunkerLayout.rooms.room7');
 assert.ok(b.w>b.h);assert.ok(inside(b,q));assert.ok(q.bottom-(b.y+b.h)<25,'along the bottom wall');assert.ok(b.x-q.left<25,'bath side');
 assert.deepEqual(J('V011Living.bed').x,b.x);assert.equal(J("EquipmentInstances.placement.storage_crate.rooms").includes('room7'),false);
 const door=J("v09Doors.find(d=>d.id==='v09door_room7')"),bath=J('V011Living.bathDoor');assert.equal(overlap(b,{x:door.x-60,y:door.y,w:80,h:door.h}),false);assert.equal(overlap(b,{x:bath.x,y:bath.y,w:bath.w+60,h:bath.h}),false);
 E('player.x=4700;player.y=-160;player.floor=2;for(const d of v09Doors)d.open=1;invalidateGeometry()');
 for(const [x,y] of [[4280,715],[4450,650],[4070,835]])assert.ok(E(`findWalkPath(4700,-160,{id:'g',kind:'ground',x:${x},y:${y},r:0,range:1},'bunker',15)`)?.length,x+','+y);
 E('player.x=4280;player.y=715');assert.equal(E('V011Living.start("rest")'),true);E('V011Living.stop();player.x=4070;player.y=835');assert.equal(E('V011Living.start("shower")'),true);E('V011Living.stop()');
 // Drone returns from the bedroom to its L1 station.
 E("{const s=V014Robots.state;s.x=4450;s.y=650;s.scene='bunker';s.packed=false;V014Robots.returnToDock()}");for(let i=0;i<1500&&E('V014Robots.state.task')!=='docked';i++)E('frameScale=1;V014Robots.update?V014Robots.update(1/60):update()');
 assert.equal(E('BunkerLayout.floorAt(V014Robots.state.x,V014Robots.state.y)'),1);});
test('sleep_visual_turns_with_the_bed_head_on_pillow',()=>{const src=fs.readFileSync('src/render/actors.js','utf8');assert.ok(/turned=bed\.w>bed\.h/.test(src)&&/ctx\.rotate\(-Math\.PI\/2\)/.test(src));
 const rend=fs.readFileSync('src/core/rendering.js','utf8');assert.ok(/id==='bed'&&f\.w>f\.h\)\{ctx\.translate\(f\.x,f\.y\+f\.h\);ctx\.rotate\(-Math\.PI\/2\)/.test(rend),'bed art and sleeper share the same -90 degree turn');
 reset();E('scene="bunker";player.x=4280;player.y=715;player.floor=2;V011Living.start("rest")');const hp=E('player.health');E('V011Living.tick(1000)');assert.equal(E('V011Living.state().mode'),'rest');E('V011Living.stop()');});
test('medical_bed_removed_table_is_one_real_object_cabinet_visual_only',()=>{reset();assert.equal(E("solidObjects('bunker').some(o=>o.id==='medical_bed')"),false);assert.equal(E("interactionObjects('bunker').some(o=>o.id==='medical_bed')"),false);
 const t=J("BunkerLayout.fixture('medical_table')"),s=J("solidObjects('bunker').find(o=>o.id==='medical_table')"),f=J("GameFootprints.body('medical_table')");
 for(const k of ['x','y','w','h'])assert.equal(s[k],t[k]),assert.equal(f[k],t[k]);assert.ok(inside(t,J('BunkerLayout.rooms.room4')));
 const c=J("BunkerLayout.fixture('cabinet')");assert.ok(inside(c,J('BunkerLayout.rooms.room4')));assert.equal(E("interactionObjects('bunker').some(o=>o.id==='cabinet')"),false);});
test('kitchen_furniture_solid_inside_room_with_route_and_placement_space',()=>{reset();const q=J('BunkerLayout.rooms.room6');for(const id of ['kitchen','fridge','dining']){const f=J(`BunkerLayout.fixture('${id}')`);assert.ok(inside(f,q),id);assert.equal(E(`solidObjects('bunker').some(o=>o.id==='${id}')`),true);assert.equal(E(`interactionObjects('bunker').some(o=>o.id==='${id}')`),false);}
 E("player.x=1210;player.y=440;player.floor=1;bag=[];for(const t of ['iron','copper','parts'])addItem(t,100)");const ids={};for(const type of ['kitchen_stove','med_lab']){const a=J(`GamePlacement.request('${type}','craft')`);assert.equal(a.ok,true,type);ids[type]=a.instanceId;}
 E('player.x=4700;player.y=-160;player.floor=2');for(const [type,room] of [['kitchen_stove','room6'],['med_lab','room4']]){r.context.pid=ids[type];const n=E(`(()=>{const q=BunkerLayout.rooms['${room}'];let n=0;for(let x=q.left;x<=q.right;x+=20)for(let y=q.top;y<=q.bottom;y+=20)if(GamePlacement.check(pid,GamePlacement.centered('${type}','${room}',x,y),false).ok)n++;return n;})()`);assert.ok(n>=40,type+' spots '+n);}});
test('L1_hall_grey_cabinet_gone',()=>{reset();assert.equal(E("solidObjects('bunker').some(o=>o.id==='cabinet'&&BunkerLayout.floorAt(o.x,o.y)===1)"),false);assert.equal(E("worldCollision(1450,-150,15,'bunker')"),false);
 const rend=fs.readFileSync('src/core/rendering.js','utf8');assert.ok(/const props=floor===1\?\[\]/.test(rend));});
test('floor_fade_localized_no_double_trigger_and_correct_floor',()=>{for(const lang of ['ru','en']){reset();healthy();E(`I18n.setLanguage('${lang}')`);E("V014Robots.follow?.()");const s=J('BunkerLayout.stairs[1]');E(`player.x=${s.x+s.w/2};player.y=${s.y+s.h-30};player.floor=1`);
  assert.equal(E('BunkerPassA.travel(2)'),true);assert.equal(E('BunkerPassA.travel(2)'),false);assert.equal(E('BunkerPassA.travelling()'),true);assert.equal(E('player.floor'),1);
  assert.equal(E("el('fade').textContent"),E("I18n.t('bunker.floor.l2')"));assert.ok(!E("el('fade').textContent").includes('bunker.'));
  r.flushTimers(310);assert.equal(E('BunkerPassA.travelling()'),false);assert.equal(E('player.floor'),2);assert.equal(E('BunkerLayout.floorAt(player.x,player.y)'),2);r.flushTimers(300);assert.equal(E("el('fade').classList.contains('show')"),false);
  assert.deepEqual(J('V010Camera.mapBounds?.()')??J('BunkerLayout.floorBounds[2]'),J('BunkerLayout.floorBounds[2]'));
  if(E("V014Robots.state.task")==='follow')assert.equal(E('BunkerLayout.floorAt(V014Robots.state.x,V014Robots.state.y)'),2);
  const u=J('BunkerPassA.up');E(`player.x=${u.x+u.w/2};player.y=${u.y+u.h}`);assert.equal(E('BunkerPassA.travel(1)'),true);r.flushTimers(310);assert.equal(E('player.floor'),1);r.flushTimers(300);
  save();assert.equal(E('player.floor'),1);}
 E("I18n.setLanguage('ru')");});
test('save_load_on_both_floors',()=>{for(const [x,y,f] of [[1120,-120,1],[4700,-160,2],[5020,-250,2]]){reset();E(`player.x=${x};player.y=${y};player.floor=${f}`);save();assert.deepEqual(J('[player.x,player.y,player.floor]'),[x,y,f]);}});
test('door_matrix_healthy_auto_manual_save_and_overload',()=>{const rows=[];for(const id of J('v09Doors.map(d=>d.id)')){r.context.did=id;const sides=J('p0Sides(v09Doors.find(d=>d.id===did))');assert.ok(sides[0]&&sides[1],id+' both sides reachable');
  const always=E('v09Doors.find(d=>d.id===did).alwaysOpen');
  for(const p of sides){reset();healthy();E(`{const d=v09Doors.find(d=>d.id===did);d.open=0;d.away=4;d.manual=false;player.x=${p.x};player.y=${p.y};player.floor=BunkerLayout.floorAt(${p.x},${p.y})}`);tick(8);assert.equal(E('v09Doors.find(d=>d.id===did).open'),1,id+' healthy '+JSON.stringify(p));}
  E(`v09Doors.find(d=>d.id===did).open=1;invalidateGeometry()`);assert.equal(E(`lineClear(${sides[0].x},${sides[0].y},${sides[1].x},${sides[1].y},15,'bunker')`),true,id+' passage');
  if(!always){reset();healthy();assert.equal(J("GameBaseControl.request(did,'doorAuto',{value:false})").ok,true);E(`{const d=v09Doors.find(d=>d.id===did);d.open=0;d.away=4;d.manual=false;player.x=${sides[0].x};player.y=${sides[0].y};player.floor=BunkerLayout.floorAt(player.x,player.y)}`);tick(8);assert.equal(E('v09Doors.find(d=>d.id===did).open'),0,id+' auto off');
   save();assert.equal(E('GameBaseControl.autoOpen(did)'),false,id+' auto off survives save');healthy();E(`player.x=${sides[0].x};player.y=${sides[0].y}`);E("executeInteraction(interactionObjects('bunker').find(o=>o.id===did&&o.kind==='v09door'));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false");tick(8);assert.equal(E('v09Doors.find(d=>d.id===did).open'),1,id+' manual');
   E('{const d=v09Doors.find(d=>d.id===did);player.x=d.x+d.w/2;player.y=d.y+d.h/2;d.manual=false}');tick(60);assert.equal(E('v09Doors.find(d=>d.id===did).open'),1,id+' never closes on the player');}
  // Overload with an empty battery: recorded, not changed (the bus sheds and recovers step by step).
  reset();E("V09Power.running=true;V09Power.fuel=80;V010Energy.battery.charge=0;for(const d of Object.values(V09Power.devices))d.enabled=true;bag=[];addItem('coal',10);V09Craft.start('furnace','gunpowder',1);V09Power.frame++");
  const ov=E('V09Power.allocation().shed.length>0');E(`{const d=v09Doors.find(d=>d.id===did);d.open=0;d.away=4;d.manual=false;player.x=${sides[0].x};player.y=${sides[0].y};player.floor=BunkerLayout.floorAt(player.x,player.y)}`);
  let served=0;for(let i=0;i<120;i++){E('V09Power.frame++;V09Power.tick(1/60)');if(E("V09Power.allocation().served.has('door_'+v09Doors.find(d=>d.id===did).room)"))served++;}
  rows.push({id,overloadedAtStart:ov,servedFrames:served,openAfter2s:E('v09Doors.find(d=>d.id===did).open')});}
 r.context.p0matrix=rows;assert.equal(rows.length,14);});
test('console_no_errors',()=>assert.deepEqual(r.errors,[]));
const result={runtimeSha256:require('crypto').createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex'),passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,overloadMatrix:r.context.p0matrix||null,checks};fs.writeFileSync('qa/results/phase0.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
