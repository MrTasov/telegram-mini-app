// Approved R1 differences for OLD equality oracles. Current geometry, every moved
// actor and exact farm preservation are asserted independently in bunker-level1.
const copy=v=>JSON.parse(JSON.stringify(v));
exports.project=value=>{
 const d=require('./stage-c1-contract.cjs').project(value);if(!d||typeof d!=='object')return d;
 delete d.equipment032;delete d.campaign031;if(d.v09?.power)delete d.v09.power.deviceEnabled.command_core_l1;delete d.bunker030;delete d.saveVersion;d.gameVersion='release-metadata';
 const doors=list=>list?.filter(o=>o.id!=='v09door_reserve_l1').sort((a,b)=>a.id.localeCompare(b.id));
 if(d.building018)d.building018.doors=doors(d.building018.doors);
 const power=d.v09?.power;if(power){delete power.roomEnabled.reserve_l1;delete power.deviceEnabled.light_reserve_l1;delete power.deviceEnabled.door_reserve_l1;power.doors=doors(power.doors);}
 // Physical relocation can alter proximity doors and energy demand. Installed
 // toggles, battery settings, door HP/levels and all equipment remain compared.
 if(power){delete power.fuel;for(const door of power.doors){delete door.open;delete door.away;delete door.manual;}}
 const energy=d.v010?.modules?.energy;if(energy?.battery)delete energy.battery.charge;
 // Dormant agriculture does not poll the old notification observer.
 if(energy){delete energy.harvestSeen;if(energy.warnings){delete energy.warnings.feed;delete energy.warnings.water;}}
 // Alive zombies have no displayed corpse angle; pausing animal motion changes
 // the shared idle-wander RNG draw order. Dead corpse orientation stays exact.
 for(const [i,a] of (d.monsters017?.actors||[]).entries())if(d.zombies?.[i]?.alive)delete a.deathAngle;
 if(d.player?.scene==='bunker'){delete d.player.x;delete d.player.y;if(d.v091?.fortress){delete d.v091.fortress.x;delete d.v091.fortress.y;}}
 if(d.robots014?.scene==='bunker'){delete d.robots014.x;delete d.robots014.y;}
 // Timers intentionally no longer advance. All livestock, crops, plant counts,
 // durations, output/storage/queues still compare, except elapsed time itself.
 if(d.livestock)for(const k of ['eggMs','milkMs','needMs','breedMs','emptyMs'])delete d.livestock[k];
 if(d.v09)delete d.v09.chickenBreedMs;
 for(const bed of d.farm||[])delete bed.elapsedMs;
 if(d.farmV011){delete d.farmV011.at;delete d.farmV011.grown;}
 if(d.farm014)for(const bed of d.farm014.beds||[])for(const p of bed||[])delete p.elapsed;
 return d;
};
exports.legacyProjection=value=>{const d=require('./stage-c1-contract.cjs').project(value);if(d.doors)d.doors.doors=d.doors.doors.filter(o=>o.id!=='v09door_reserve_l1').sort((a,b)=>a.id.localeCompare(b.id));if(d.drone?.scene==='bunker'){delete d.drone.x;delete d.drone.y;if(d.drone.guard?.scene==='bunker'){delete d.drone.guard.x;delete d.drone.guard.y;}}return d;};
exports.assertSource=(file,expected)=>{const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),ref=require('./bunker-source-reference.json'),change=ref.changes[file],actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(change){assert.equal(expected,change.before,file+' immutable Audio Pass input');require('./campaign-source-contract.cjs').assertSource(file,change.after);}else require('./campaign-source-contract.cjs').assertSource(file,expected);};
