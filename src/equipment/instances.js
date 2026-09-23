/* Stage B: fixed equipment, not a placement system. Existing spellings remain
   stable instance IDs; recipe/presentation capabilities belong to typeId.
   The registry owns identity and transforms ONLY. Jobs, items and energy retain
   their historical owners and are referenced, never copied into this table. */
const EquipmentInstances=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const freeze=x=>{for(const v of Object.values(x))if(v&&typeof v==='object')freeze(v);return Object.freeze(x);};
  const definitions=freeze({
    furnace:{footprint:{w:130,h:195},recipeStation:'furnace',powerKW:6,name:'Плавильная печь',range:48},
    craft_bench:{footprint:{w:260,h:173},recipeStation:'craft_bench',powerKW:2,name:'Универсальный станок',range:48},
    feed_craft:{footprint:{w:56,h:46},recipeStation:'feed_craft',powerKW:1,name:'Кормодробилка',range:44},
    enhancement_cradle:{footprint:{w:139,h:110},powerKW:2,name:'Станок усиления',range:70},
    fuel_tank:{footprint:{w:125,h:185},name:'Топливный бак',range:50},
    generator:{footprint:{w:130,h:195},name:'Генератор',range:50},
    reserve_battery:{footprint:{w:105,h:215},name:'Резервная батарея',range:50},
    drone_station:{footprint:{w:148,h:86},powerKW:1,name:'Станция дрона',range:65,body:{x:7,y:7,w:26,h:72},dock:{x:74,y:45}},
    storage_crate:{footprint:{w:68,h:50},name:'Ящик',range:44}
  });
  const mapping=[['furnace','furnace'],['craft_bench','craft_bench'],['feed_craft','feed_craft'],['upgrade0161','enhancement_cradle'],['tank','fuel_tank'],['generator','generator'],['battery','reserve_battery'],['robots014_dock','drone_station'],...Array.from({length:10},(_,i)=>['chest'+i,'storage_crate'])];
  const defaults=freeze(mapping.map(([id,typeId])=>{
    const f=BunkerLayout.fixture(id),def=definitions[typeId],refs={};
    if(def.recipeStation)Object.assign(refs,{job:id,queue:id,output:id,refund:id,device:id});
    if(typeId==='enhancement_cradle')Object.assign(refs,{container:'upgrade',device:id});
    if(typeId==='drone_station')Object.assign(refs,{device:'robot_drone_charge',drone:'drone014'});
    if(typeId==='storage_crate')refs.container='storage:'+id.slice(5);
    if(typeId==='fuel_tank'||typeId==='generator')refs.energy='v09.power';
    if(typeId==='reserve_battery')refs.energy='v010.energy.battery';
    return {id,typeId,transform:{x:f.x,y:f.y,rotation:0,scene:'bunker',room:f.room},refs};
  }));
  function createRegistry(records){
    // A world factory also supports isolated test worlds. The live registry has
    // no add/remove/move API and accepts only its fixed authored transforms.
    const expected=copy(records),index=new Map(),bounds=new Map();
    for(const source of expected){
      const def=definitions[source.typeId],t=source.transform;
      if(!def||!/^\w[\w:-]{0,79}$/.test(source.id)||index.has(source.id)||!t||![t.x,t.y].every(Number.isFinite)||t.rotation!==0||t.scene!=='bunker'||!BunkerLayout.authoredRooms[t.room]&&!BunkerLayout.rooms[t.room])throw Error('Invalid equipment instance');
      const r=freeze(copy(source));index.set(r.id,r);bounds.set(r.id,Object.freeze({id:r.id,x:t.x,y:t.y,...def.footprint,room:t.room}));
    }
    const ids=Object.freeze([...index.keys()]),productionIds=Object.freeze(ids.filter(id=>definitions[index.get(id).typeId].recipeStation));
    for(const role of ['job','queue','output','refund','container','device']){const refs=ids.map(id=>index.get(id).refs[role]).filter(v=>v!==undefined);if(refs.some(v=>typeof v!=='string'||!v)||new Set(refs).size!==refs.length)throw Error('Duplicate equipment '+role+' reference');}
    function fixture(id){
      if(id==='robots014_dock_body'){const r=index.get('robots014_dock');if(!r)return undefined;const b=definitions[r.typeId].body;return {id,x:r.transform.x+b.x,y:r.transform.y+b.y,w:b.w,h:b.h,room:r.transform.room};}
      return bounds.get(id);
    }
    function point(id,x,y){const t=index.get(id)?.transform;if(!t)return null;const c=Math.cos(t.rotation),s=Math.sin(t.rotation);return {x:t.x+x*c-y*s,y:t.y+x*s+y*c};}
    function center(id){const def=definitions[index.get(id)?.typeId];return def?point(id,def.footprint.w/2,def.footprint.h/2):null;}
    function withArt(id,fn){const r=index.get(id),authored=BunkerLayout.authored(id)||BunkerLayout.authored(definitions[r?.typeId]?.recipeStation);if(!r||!authored)throw Error('Unknown equipment art');const p=BunkerLayout.artPoint(r.transform);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(r.transform.rotation);ctx.translate(-authored.x,-authored.y);try{return fn();}finally{ctx.restore();}}
    function validate(records){
      if(!Array.isArray(records)||records.length!==ids.length||new Set(records.map(r=>r?.id)).size!==ids.length)throw Error('Invalid equipment IDs');
      // First establish identities; then validate transforms and owner links.
      const incoming=new Map(records.map(r=>[r.id,r]));
      for(const id of ids){const got=incoming.get(id),want=index.get(id);if(!got||got.typeId!==want.typeId||Object.keys(got).sort().join()!=='id,refs,transform,typeId')throw Error('Invalid equipment type');
        for(const field of ['transform','refs']){const a=got[field],b=want[field];if(!a||Object.keys(a).sort().join()!==Object.keys(b).sort().join()||Object.keys(b).some(k=>a[k]!==b[k]))throw Error('Invalid equipment '+field);}}
      return true;
    }
    return Object.freeze({ids,productionIds,definitions,get:id=>index.get(id),fixture,point,center,withArt,definition:id=>definitions[index.get(id)?.typeId],recipeStation:id=>definitions[index.get(id)?.typeId]?.recipeStation,capture:()=>copy(expected),validate});
  }
  return Object.freeze({definitions,defaults,createRegistry});
})();
const GameEquipment=EquipmentInstances.createRegistry(EquipmentInstances.defaults);
window.GameEquipment=GameEquipment;
