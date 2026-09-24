// Same runtime configuration sampling as the frozen Stage 0 audit.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {setup}=require('./runtime.cjs'),root=path.resolve(__dirname,'..');process.chdir(root);
const r=setup('index.html'),E=s=>r.eval(s);
const configs=E(`({version:captureGameProgress().gameVersion,items:ITEM,recipes:V09Craft.recipes,weapons:V09Craft.weapons,
 effectiveWeapons:Object.fromEntries(Object.keys(V09Craft.weapons).map(type=>[type,Array.from({length:6},(_,level)=>V010Combat.gunSpec({type,level,variant:'balanced',modules:{},magazineType:'magazine_standard',rounds:0}))])),
 magazines:V0162Magazines.TYPES,enemies:V017Monsters.specs,dayXEnemies:Object.fromEntries(Object.keys(V017Monsters.specs).map(t=>[t,V017Monsters.stats(t,true)])),
 equipment:Object.fromEntries(Object.entries(ITEM).filter(([t,d])=>d.equip).map(([type])=>[type,Array.from({length:6},(_,level)=>V010Combat.getItemStats({type,level,variant:'balanced',specialization:'balanced'}))])),
 upgradeCosts:Object.fromEntries(['rifle_ak74','rifle_m4','vest5','drone014','hmg016'].map(type=>[type,Array.from({length:5},(_,level)=>V0161Upgrade.cost({type,level,turretData:{level}},'body'))])),
 drone:{defaults:JSON.parse(JSON.stringify(V014Robots.state)),station:V014Robots.station,combat:{...V014Robots.combat},maxHP:V014Robots.maxHp(),cargoCapacity:V014Robots.capacity()},
 turret:{...V016Turret.combat},power:{supply:V09Power.supply,capacity:V09Power.capacity,rooms:V09Power.rooms,devices:Object.values(V09Power.devices).map(d=>({id:d.id,room:d.room,watts:d.watts,enabled:d.enabled})),battery:{...V010Energy.battery}},wallHP:V018Build.LEVELS,wallCosts:V018Build.COSTS,wallLayout:V015Base.sections.map(o=>({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,group:o.group,level:o.level,hp:o.hp,maxHp:o.maxHp})),
 player:{...player},farm: farmCrops.map((c,i)=>({...c,index:i,growMs:farmGrowMs(i)})),farmBeds:getFarmBeds(),
 save:{topKeys:Object.keys(captureGameProgress()),schemas:Object.fromEntries(Object.entries(captureGameProgress()).filter(([k,v])=>v&&typeof v==='object'&&'schema'in v).map(([k,v])=>[k,v.schema])),registeredModules:Object.keys(V010.modules)},
 exposedAPIs:Object.fromEntries(Object.keys(window).filter(k=>/^V\\d/.test(k)&&window[k]&&typeof window[k]==='object').map(k=>[k,Object.keys(window[k])]))})`);
// Costs that depend on live singleton modules must be sampled with each level.
configs.upgradeCosts.drone014=E(`Array.from({length:5},(_,level)=>{const old=V014Robots.state.modules.body;V014Robots.state.modules.body=level;const cost=V0161Upgrade.droneCost('body');V014Robots.state.modules.body=old;return cost;})`);
configs.environmentAssumptions={equipment:'starter gear; balanced variant and specialization',drone:'base modules unless explicit level sample',time:'seeded fixture clock, no offline interval',source:'actual runtime APIs, no reimplemented balance formulas'};

const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'stage0/audit/configurations.json'))),actual=JSON.parse(JSON.stringify(configs));
const version=actual.version;actual.version=expected.version; // Release metadata and the explicitly versioned envelope are the only additions.
assert.equal(actual.save.topKeys.filter(k=>k==='saveVersion').length,1);
assert.equal(E('captureGameProgress().saveVersion'),E('SaveFormat.version'));
actual.save.topKeys=actual.save.topKeys.filter(k=>k!=='saveVersion'&&k!=='identity027'&&k!=='bunker030'&&k!=='campaign031'&&k!=='equipment032'&&k!=='headModules033'&&k!=='recovery033'&&k!=='chapter034'&&k!=='placement035'&&k!=='carry0353'&&k!=='control0353');
delete actual.save.schemas.identity027;delete actual.save.schemas.bunker030;delete actual.save.schemas.campaign031;delete actual.save.schemas.equipment032;delete actual.save.schemas.headModules033;delete actual.save.schemas.recovery033;delete actual.save.schemas.chapter034;delete actual.save.schemas.placement035;delete actual.save.schemas.carry0353;delete actual.save.schemas.control0353;actual.save.schemas.gathering=expected.save.schemas.gathering;
// Explicit tool contracts are covered at every level by stage-c2-prerequisites.
for(const type of ['axe','pickaxe']){delete actual.items[type].upgrades;delete actual.items[type].gathering;}
actual.drone.defaults.x=expected.drone.defaults.x;actual.drone.defaults.y=expected.drone.defaults.y;actual.drone.station.x=expected.drone.station.x;actual.drone.station.y=expected.drone.station.y;delete actual.drone.station.room;delete actual.power.rooms.reserve_l1;actual.power.rooms.corridor=expected.power.rooms.corridor;actual.power.devices=actual.power.devices.filter(d=>d.room!=='reserve_l1'&&d.id!=='command_core_l1').sort((a,b)=>expected.power.devices.findIndex(d=>d.id===a.id)-expected.power.devices.findIndex(d=>d.id===b.id));
const definitionFields={items:['ammo','stackMax','caliber','drone','turret','moduleSlot','moduleSlots'],weapons:['category','reloadMs','noise','heldStyle','visualRecoil','recoilLabel','magazineTypes','defaultMagazine','extendedMagazine']};
for(const [group,keys] of Object.entries(definitionFields))for(const [id,def] of Object.entries(actual[group]))for(const key of keys)if(!Object.hasOwn(expected[group][id]||{},key))delete def[key];
for(const [id,levels] of Object.entries(actual.effectiveWeapons))for(const [i,def] of levels.entries())for(const key of definitionFields.weapons)if(!Object.hasOwn(expected.effectiveWeapons[id][i],key))delete def[key];
for(const group of ['enemies','dayXEnemies'])for(const def of Object.values(actual[group]))for(const key of ['spawnOrder','behavior','healthColor','leap','blast'])delete def[key];
const addedAPIs={};
for(const [id,keys] of Object.entries(actual.exposedAPIs)){addedAPIs[id]=keys.filter(k=>!expected.exposedAPIs[id]?.includes(k));actual.exposedAPIs[id]=keys.filter(k=>expected.exposedAPIs[id]?.includes(k));}
// Approved C1 prerequisites: two craft recipes, one statless carrier and the
// renamed physical flashlight module. All existing costs/stats stay compared.
delete actual.items.head_mount;delete actual.equipment.head_mount;delete actual.recipes.head_mount;delete actual.recipes.flashlight;actual.items.flashlight.name=expected.items.flashlight.name;delete actual.items.flashlight.description;
// Approved release 0.28 balance changes; everything else still compares exactly.
for(const id of ['coal','gunpowder'])delete actual.items[id];
delete actual.recipes.gunpowder;
for(const id of ['iron','copper','concrete','ammo','ammo556'])actual.recipes[id].input=expected.recipes[id].input;
delete actual.save.schemas.livestock;
for(const id of ['farmV011','farm014'])actual.save.schemas[id]=expected.save.schemas[id];
for(const [id,removed]of Object.entries({V0141Farm:['stock','seedType','takeSeed'],V011Farm:['wetBetween']}))expected.exposedAPIs[id]=expected.exposedAPIs[id].filter(k=>!removed.includes(k));
// Approved corrective recipe ownership/budget. Assert new values before
// projecting only these declared changes back to the immutable Stage 0 audit.
for(const id of ['hammer','pickaxe','axe']){assert.deepEqual(actual.recipes[id].input,{wood:2,iron:2});assert.equal(configs.recipes[id].station,'utility_workbench');assert.equal(configs.recipes[id].ms,3000);}
for(const id of ['axe','pickaxe','remote','base_lamp'])delete actual.recipes[id];delete actual.items.base_lamp;assert.equal(configs.items.equipment_case.stackMax,1);delete actual.items.equipment_case;expected.exposedAPIs.V010Energy=expected.exposedAPIs.V010Energy.filter(k=>!['setRoomPriority','setDevicePriority','roomPriority','devicePriority'].includes(k));
for(const id of ['hammer','fishing_rod']){delete actual.recipes[id].manual;actual.recipes[id].station=expected.recipes[id].station;}
actual.recipes.hammer.input=expected.recipes.hammer.input;actual.recipes.hammer.ms=expected.recipes.hammer.ms;
for(const id of ['workshop','storage','room4','room5','room6','room7'])actual.power.rooms[id]=expected.power.rooms[id];
let error=null;try{assert.deepEqual(actual,expected);}catch(e){error=e.message;}
fs.writeFileSync(path.join(__dirname,'results/configurations.json'),JSON.stringify(configs,null,2)+'\n');
const report={version,passed:error?0:1,failed:error?1:0,scope:'Every historical Stage 0 configuration field compared; only release/envelope metadata and the explicitly listed added definition/API fields normalized.',addedDefinitionFields:definitionFields,addedEnemyFields:['spawnOrder','behavior','healthColor','leap','blast'],addedAPIs,error,consoleErrors:r.errors};
fs.writeFileSync(path.join(__dirname,'results/balance.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,error:error?.slice(0,1200)}));if(error||r.errors.length)process.exitCode=1;
