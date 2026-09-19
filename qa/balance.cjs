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
assert.equal(E('captureGameProgress().saveVersion'),1);
actual.save.topKeys=actual.save.topKeys.filter(k=>k!=='saveVersion');
const definitionFields={items:['ammo','stackMax','caliber','drone','turret'],weapons:['category','reloadMs','noise','heldStyle','visualRecoil','recoilLabel','magazineTypes','defaultMagazine','extendedMagazine']};
for(const [group,keys] of Object.entries(definitionFields))for(const [id,def] of Object.entries(actual[group]))for(const key of keys)if(!Object.hasOwn(expected[group][id]||{},key))delete def[key];
for(const [id,levels] of Object.entries(actual.effectiveWeapons))for(const [i,def] of levels.entries())for(const key of definitionFields.weapons)if(!Object.hasOwn(expected.effectiveWeapons[id][i],key))delete def[key];
for(const group of ['enemies','dayXEnemies'])for(const def of Object.values(actual[group]))for(const key of ['spawnOrder','behavior','healthColor','leap','blast'])delete def[key];
const addedAPIs={};
for(const [id,keys] of Object.entries(actual.exposedAPIs)){addedAPIs[id]=keys.filter(k=>!expected.exposedAPIs[id]?.includes(k));actual.exposedAPIs[id]=keys.filter(k=>expected.exposedAPIs[id]?.includes(k));}
let error=null;try{assert.deepEqual(actual,expected);}catch(e){error=e.message;}
fs.writeFileSync(path.join(__dirname,'results/configurations.json'),JSON.stringify(configs,null,2)+'\n');
const report={version,passed:error?0:1,failed:error?1:0,scope:'Every historical Stage 0 configuration field compared; only release/envelope metadata and the explicitly listed added definition/API fields normalized.',addedDefinitionFields:definitionFields,addedEnemyFields:['spawnOrder','behavior','healthColor','leap','blast'],addedAPIs,error,consoleErrors:r.errors};
fs.writeFileSync(path.join(__dirname,'results/balance.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,error:error?.slice(0,1200)}));if(error||r.errors.length)process.exitCode=1;
