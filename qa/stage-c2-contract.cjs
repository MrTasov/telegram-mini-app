// Historical equality only: level-zero tools acquired physical identity in
// 0.33.1. Remove those added fields and rebase the old gear counter/IDs by the
// intervening tool allocations. Real UID/level conservation, gathering phase
// migration and duplicate-hit rejection are tested in stage-c2-prerequisites.
exports.project=value=>{
 const d=JSON.parse(JSON.stringify(value)),tools=[];
 if(d.chapter034?.preset===null)delete d.chapter034;
 const walk=(v,fn)=>{if(!v||typeof v!=='object')return;fn(v);for(const x of Object.values(v))walk(x,fn);};
 walk(d,v=>{if(['axe','pickaxe'].includes(v.type)&&(!v.level||v.level===0)){
   const n=/^gear-(\d+)$/.exec(v.uid||'');if(n)tools.push(Number(n[1]));
   delete v.uid;delete v.level;delete v.variant;delete v.specialization;
 }});
 const allocated=[...new Set(tools)];
 walk(d,v=>{if(typeof v.uid==='string'){const n=/^gear-(\d+)$/.exec(v.uid);if(n)v.uid='gear-'+(Number(n[1])-allocated.filter(t=>t<Number(n[1])).length);}});
 if(d.v010?.modules?.combat)d.v010.modules.combat.nextUid-=allocated.length;
 if(d.gathering&&!d.gathering.chop&&!d.gathering.mining)d.gathering.schema=1;
 return d;
};
