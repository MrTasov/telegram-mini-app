/* Shared physical bodies. Art/hit bounds may include padding or a floor shadow;
   they never define a navigation obstacle. Metadata is available before images
   load, so streaming an image cannot change collision or invalidate a route. */
window.GameFootprints=(()=>{
  const cache=new Map();
  const art={furnace:['furnace',0,0,130,195],craft_bench:['workbench',0,0,260,173],
    fuel_tank:['tank',-5,-11,140,208],generator:['generator',0,0,130,195],
    enhancement_cradle:['upgrade_station0161',0,0,139,110]};
  function fit(f,spec){
    const [key,dx,dy,w,h]=spec,b=GameAssets.bounds(GameAssets.artId(key)),scale=Math.min(w/b.w,h/b.h);
    return {id:f.id,x:f.x+dx+(w-b.w*scale)/2,y:f.y+dy+(h-b.h*scale)/2,w:b.w*scale,h:b.h*scale,room:f.room};
  }
  function body(id){
    if(cache.has(id))return cache.get(id);
    const r=GameEquipment.get(id),f=id===BunkerLayout.core.id?BunkerLayout.core:BunkerLayout.fixture(id);
    if(!f)return null;
    let b;
    if(id===BunkerLayout.core.id)b=fit(f,['command_core',0,0,f.w,f.h]);
    else if(r&&art[r.typeId])b=fit(f,art[r.typeId]);
    else if(r?.typeId==='reserve_battery')b={...f,x:f.x+2,y:f.y+2,w:101,h:212};
    else if(r?.typeId==='storage_crate')b={...f,x:f.x-6,y:f.y-3,w:80,h:56};
    else if(r?.typeId==='drone_station')b=GameEquipment.fixture('robots014_dock_body');
    else b={...f}; // Vector furniture and dock column already describe the body.
    b=Object.freeze(b);cache.set(id,b);return b;
  }
  return Object.freeze({body});
})();
