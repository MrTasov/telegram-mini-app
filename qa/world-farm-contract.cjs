// Explicit 0.28 differences only. Frozen fixtures and gameplay files are untouched.
// New behaviors are asserted directly by world-farm.cjs and drone-return.cjs.
exports.project=(d,{fresh=false,droneMotion=false,growthClock=false,surveyClock=false}={})=>{
 d=require('./bunker-contract.cjs').project(d);
 // Stage G surveys during simulation; historic oracles revealed only on draw.
 // Compare all old map settings/pins; isolate only fog evidence in movement.
 if(surveyClock&&d.v010?.modules?.camera){delete d.v010.modules.camera.discovered;delete d.v010.modules.camera.known;}
 delete d.identity027;delete d.saveVersion;d.gameVersion='release-metadata';
 if(d.farm014){delete d.farm014.schema;delete d.farm014.next;delete d.farm014.end;delete d.farm014.irrigation;}
 if(d.farmV011){delete d.farmV011.schema;delete d.farmV011.at;if(fresh&&d.farmV011.water===500)d.farmV011.water=100;}
 if(d.livestock){if(d.livestock.reserve?.length)throw Error('Overflow reserve must be checked by the explicit migration suite');delete d.livestock.schema;delete d.livestock.nextCow;delete d.livestock.reserve;
   for(const a of d.livestock.animals){for(const k of ['instanceId','typeId','stallId','x','y','vx','vy'])delete a[k];}}
 // Resource relocation changes surface collision and enemy routes, not AI stats.
 if(d.zombies)for(const z of d.zombies){delete z.x;delete z.y;}
 // Beds are now walkable; the old loader displaced actors off planted soil.
 if(d.player?.scene==='bunker'&&d.player.y<-250){delete d.player.x;delete d.player.y;if(d.v091?.fortress){delete d.v091.fortress.x;delete d.v091.fortress.y;}}
 if(growthClock){if(d.v09?.power)delete d.v09.power.fuel;for(const st of d.farm||[])delete st.elapsedMs;if(d.farmV011)delete d.farmV011.grown;for(const bed of d.farm014?.beds||[])for(const p of bed||[])delete p.elapsed;}
 if(d.v09?.world?.ores)d.v09.world.ores=d.v09.world.ores.filter(o=>!/^coal_(east|west|south|far_south)_\d+$/.test(o.id));
 // Corrective patch's explicit resource changes. Legacy standing trees map to
 // the new 10-unit yield; felled remainders, all inventory and old nodes still compare.
 for(const t of d.trees||[])if(!t.felled&&t.wood===15)t.wood=10;
 if(d.v09?.world?.ores)d.v09.world.ores=d.v09.world.ores.filter(o=>!/^stone_corrective_\d+$/.test(o.id));
 // Retired item Pin is intentionally ignored; recipe/goal pins remain compared.
 const walk=v=>{if(!v||typeof v!=='object')return;if(typeof v.type==='string')delete v.locked;for(const x of Object.values(v))walk(x);};walk(d);
 if(droneMotion&&d.robots014){delete d.robots014.x;delete d.robots014.y;}
 return d;
};
