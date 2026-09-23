// Historical equality for untouched authored equipment only. Real D transforms,
// owner state and migrations are asserted without projection in stage-d.cjs.
exports.project=value=>{
 const d=JSON.parse(JSON.stringify(value));delete d.placement035;
 if(d.equipment032){d.equipment032.schema=1;for(const r of d.equipment032.instances)delete r.placement;}
 return d;
};
