/* One deterministic placement pass for all natural resources. IDs and depletion
   stay in their original owners; this module only supplies coordinates. */
window.WorldResourcePlacement=(()=>{
  const config=GameplayBalance.resources;
  const coalZones=[{id:'coal_east',x:2490,y:750,w:650,h:460},{id:'coal_south',x:2110,y:5060,w:760,h:510},{id:'coal_west',x:-1820,y:4620,w:640,h:530},{id:'coal_far_south',x:-100,y:7460,w:760,h:530}];
  const oreZones=[{x:-1150,y:1080,w:680,h:700},{x:2210,y:1610,w:680,h:650},{x:-700,y:2630,w:630,h:760},{x:2440,y:4420,w:700,h:750},{x:-1820,y:7040,w:690,h:690},{x:3540,y:7560,w:700,h:830},{x:-470,y:-960,w:740,h:640}];
  const stoneZones=[{x:-530,y:1120,w:710,h:700},{x:1950,y:910,w:780,h:850},{x:540,y:2420,w:730,h:600},{x:-640,y:3670,w:900,h:850},{x:2320,y:4450,w:850,h:800},{x:-1500,y:6940,w:900,h:850}];
  const treeZones=[{x:-470,y:600,w:800,h:1100},{x:1880,y:780,w:760,h:1150},{x:-1500,y:2030,w:900,h:2000},{x:1800,y:3470,w:2000,h:1100},{x:-1800,y:6200,w:1500,h:1400},{x:3330,y:7600,w:1000,h:1400}];
  const coal=[];
  for(const zone of coalZones)for(let i=0;i<config.coalNodesPerZone;i++)coal.push({id:zone.id+'_'+i,type:'coal',x:zone.x,y:zone.y,r:37+i%3*3,capacity:config.coalNodeCapacity,remaining:config.coalNodeCapacity,regrowMs:0,zoneId:zone.id});
  V09World.ores.push(...coal);
  const resources=[...V09World.ores,...worldTrees],ids=new Set(resources.map(o=>o.id)),placed=[];
  let seed=280031;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const radius=o=>o.type?o.r:Math.max(o.r,V0141Trees.size(o));
  const bounds={x:surface.minX,y:surface.minY,w:surface.width,h:surface.height};
  // Reserve building footprints and their approach apron, not just thin walls.
  const excluded=[...surfaceWalls(),...solidObjects('surface').filter(o=>!ids.has(o.id)),...scavenges.filter(o=>o.kind==='house').map(o=>({x:o.x-45,y:o.y-45,w:o.w+90,h:o.h+120}))];
  function staticClear(x,y,r){
    if(x<bounds.x+r+24||x>bounds.x+bounds.w-r-24||y<bounds.y+r+24||y>bounds.y+bounds.h-r-24||rectHit(x,y,r+80,{x:surface.outer.left,y:surface.outer.top,w:surface.outer.right-surface.outer.left,h:surface.outer.bottom-surface.outer.top}))return false;
    if(V013Lake.wet(x,y)||Array.from({length:12},(_,i)=>V013Lake.wet(x+Math.cos(i*Math.PI/6)*r,y+Math.sin(i*Math.PI/6)*r)).some(Boolean))return false;
    return !excluded.some(o=>o.r!==undefined?distance(x,y,o.x,o.y)<r+o.r:rectHit(x,y,r,o));
  }
  function clear(x,y,r){return staticClear(x,y,r+22)&&!placed.some(p=>distance(x,y,p.x,p.y)<r+radius(p)+config.spacing);}
  const nearZone=z=>{const lobe=random()<.7?-.18:.22;return {x:z.x+(random()-.5+lobe)*z.w,y:z.y+(random()-.5)*z.h+(random()-.5)*z.h*.35};};
  function locate(o,zones,index){
    const r=radius(o);let point=null;
    for(let n=0;n<1600&&!point;n++){
      const fixed=o.zoneId&&coalZones.find(z=>z.id===o.zoneId),zone=fixed||zones[(index+Math.floor(n/140))%zones.length];
      const q=nearZone(zone);
      if(!o.type&&random()<.38){q.x=bounds.x+80+random()*(bounds.w-160);q.y=bounds.y+80+random()*(bounds.h-160);}
      if(clear(q.x,q.y,r))point=q;
    }
    if(!point)throw Error('No accessible resource placement: '+o.id);
    Object.assign(o,point);placed.push(o);
  }
  coal.forEach((o,i)=>locate(o,coalZones,i));
  const ores=V09World.ores.filter(o=>o.type!=='coal'&&o.type!=='stone');
  ores.forEach((o,i)=>locate(o,oreZones,i%7));
  V09World.ores.filter(o=>o.type==='stone').forEach((o,i)=>locate(o,stoneZones,Math.floor(i/3)));
  worldTrees.forEach((o,i)=>locate(o,treeZones,Math.floor(i/8)));
  for(const tree of worldTrees)if(!tree.felled)tree.wood=config.treeWood;
  // Append after the complete original pass: tree/ore/coal positions and RNG
  // consumption are preserved. Existing ID-based save migration adds only new IDs.
  const stones=V09World.ores.filter(o=>o.type==='stone'),extraCount=Math.round(stones.length*(config.stoneDensity-1));
  for(let i=0;i<extraCount;i++){
    const original=stones[i%stones.length],o={id:'stone_corrective_'+i,type:'stone',x:0,y:0,r:original.r,capacity:original.capacity,remaining:original.capacity,regrowMs:0};
    locate(o,stoneZones,Math.floor(i/3));V09World.ores.push(o);V018Build.stoneNodes.push(o);resources.push(o);
  }
  invalidateGeometry();
  return {coalZones,oreZones,stoneZones,treeZones,resources,staticClear,radius,config};
})();
