// Historical equality for untouched authored equipment only. Real D transforms,
// owner state and migrations are asserted without projection in stage-d-corrective.cjs.
exports.project=value=>{
 const d=require('./stage-h-contract.cjs').project(value);delete d.placement035;delete d.research036;delete d.story037;delete d.sectors038;delete d.carry0353;delete d.control0353;
 if(d.equipment032){d.equipment032.schema=1;for(const r of d.equipment032.instances){delete r.placement;delete r.ownerId;delete r.state;}}
 for(const job of [...Object.values(d.v09?.crafting?.jobs||{}),...Object.values(d.v010?.modules?.craft?.queues||{}).flat()])if(job)delete job.legacy0351;
 return d;
};
