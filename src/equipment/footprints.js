/* Physical bodies are authored independently of sprite padding and shadows.
   Every quarter-turn rotates the same body for placement, collision and light. */
window.GameFootprints=(()=>{
  const cache=new Map();let epoch=-1;
  const bodies=Object.freeze({
    furnace:{x:7,y:9,w:116,h:177},craft_bench:{x:4,y:30,w:252,h:112},
    utility_workbench:{x:3,y:13,w:128,h:62},fuel_tank:{x:13,y:-1,w:95,h:186},
    generator:{x:13,y:3,w:104,h:185},reserve_battery:{x:2,y:2,w:101,h:212},
    storage_crate:{x:-6,y:-3,w:80,h:56},enhancement_cradle:{x:4,y:12,w:131,h:87}
  });
  const local=r=>bodies[r.typeId]||EquipmentInstances.definitions[r.typeId].body||{x:0,y:0,...EquipmentInstances.definitions[r.typeId].footprint};
  function forRecord(r){return {id:r.id,room:r.transform.room,...EquipmentInstances.aabb(r.transform,local(r))};}
  function front(r){const b=local(r),p=EquipmentInstances.aabb(r.transform,{x:b.x+b.w/2,y:b.y+b.h+24,w:0,h:0});return{x:p.x,y:p.y};}
  function body(id){
    if(epoch!==GameEquipment.epoch){cache.clear();epoch=GameEquipment.epoch;}
    if(cache.has(id))return cache.get(id);
    const r=GameEquipment.get(id);let b;
    if(r)b=forRecord(r);
    else if(id===BunkerLayout.core.id){const f=BunkerLayout.core,meta=AssetManifest.images[GameAssets.artId('command_core')],crop=meta.crop||{w:meta.size[0],h:meta.size[1]},s=Math.min(f.w/crop.w,f.h/crop.h);b={...f,x:f.x+(f.w-crop.w*s)/2,y:f.y+(f.h-crop.h*s)/2,w:crop.w*s,h:crop.h*s};}
    else {const f=GameEquipment.fixture(id)||BunkerLayout.fixture(id);if(!f)return null;b={...f};}
    b=Object.freeze(b);cache.set(id,b);return b;
  }
  return Object.freeze({body,forRecord,front,local});
})();
