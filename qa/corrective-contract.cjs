// Explicit exceptions for historical equality oracles, all checked independently
// in corrective-performance.cjs. Never normalize existing inventory or ore amounts.
exports.resourceProjection=value=>{
 const d=JSON.parse(JSON.stringify(value));
 for(const t of d.trees||[])if(!t.felled&&t.wood===15)t.wood=10;
 if(d.v09?.world?.ores)d.v09.world.ores=d.v09.world.ores.filter(o=>!/^stone_corrective_\d+$/.test(o.id));
 return d;
};
exports.snapshot=value=>{value=JSON.parse(JSON.stringify(value));value.save=exports.resourceProjection(value.save);return value;};
exports.sourceChanges=new Set([
 ...require('./polish-contract.cjs').sourceChanges,
 'src/config/gameplay.js','src/core/world-inventory.js','src/core/loop-viewport.js',
 'src/core/input-combat.js','src/ui/context-map.js','src/save/legacy-progress.js',
 'src/simulation/flow.js','src/base/fortress-navigation.js','src/world/camera.js',
 'src/world/resource-placement.js','src/world/passages.js','src/player/controls.js',
 'src/drones/interface-power.js','src/drones/companion.js','src/input/actions.js',
 'src/input/router.js','src/combat/monsters.js','src/combat/weapons-crafting.js'
]);
