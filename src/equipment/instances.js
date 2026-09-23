/* Stage B identity extended by Stage D placement. Existing spellings remain
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
  const placement=freeze({
    furnace:{limit:2,cost:{iron:20,parts:6,concrete:8},rooms:['workshop','reserve_l1']},
    craft_bench:{limit:2,cost:{iron:16,wood:12,parts:4},rooms:['workshop','reserve_l1']}
  });
  const turns=Object.freeze([0,Math.PI/2,Math.PI,Math.PI*1.5]);
  function aabb(t,b){
    const c=Math.round(Math.cos(t.rotation)),s=Math.round(Math.sin(t.rotation));
    const points=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(([x,y])=>({x:t.x+x*c-y*s,y:t.y+x*s+y*c}));
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};
  }
  const equalFields=(a,b)=>!!a&&!!b&&Object.keys(a).sort().join()===Object.keys(b).sort().join()&&Object.keys(b).every(k=>a[k]===b[k]);
  function createRegistry(records){
    const seeds=copy(records),seedIndex=new Map(seeds.map(r=>[r.id,r]));let index=new Map(),validation=null,epoch=0;
    const productionRefs=id=>({job:id,queue:id,output:id,refund:id,device:id});
    function validate(list,legacy=false){
      if(!Array.isArray(list)||list.length<seeds.length||list.length>seeds.length+2||new Set(list.map(r=>r?.id)).size!==list.length)throw Error('Invalid equipment IDs');
      const incoming=new Map(list.map(r=>[r?.id,r]));
      if(seeds.some(r=>!incoming.has(r.id)))throw Error('Missing authored equipment');
      for(const r of list){
        const seed=seedIndex.get(r.id),def=definitions[r.typeId],rule=placement[r.typeId],t=r.transform;
        if(!def||!/^\w[\w:-]{0,79}$/.test(r.id)||!r.refs||!t||![t.x,t.y].every(Number.isFinite)||Math.abs(t.x)>10000||Math.abs(t.y)>10000||!turns.includes(t.rotation)||t.scene!=='bunker'||Object.keys(t).sort().join()!=='room,rotation,scene,x,y')throw Error('Invalid equipment transform');
        if(legacy){if(!seed||Object.keys(r).sort().join()!=='id,refs,transform,typeId'||r.typeId!==seed.typeId||!equalFields(r.transform,seed.transform)||!equalFields(r.refs,seed.refs))throw Error('Invalid legacy equipment');continue;}
        if(Object.keys(r).sort().join()!=='id,placement,refs,transform,typeId'||!['installed','packed'].includes(r.placement))throw Error('Invalid equipment presence');
        const refs=seed?.refs||productionRefs(r.id);
        if(seed?r.typeId!==seed.typeId:!rule||r.id!=='build:'+r.typeId+':1')throw Error('Invalid equipment type');
        if(Object.keys(refs).sort().join()!==Object.keys(r.refs).sort().join()||Object.keys(refs).some(k=>r.refs[k]!==refs[k]))throw Error('Invalid equipment references');
        if(!rule){if(!seed||!equalFields(t,seed.transform)||r.placement!=='installed')throw Error('Protected equipment');}
        else if(!rule.rooms.includes(t.room))throw Error('Invalid placement room');
      }
      if(!legacy)for(const [type,rule]of Object.entries(placement))if(list.filter(r=>r.typeId===type).length>Math.max(rule.limit,seeds.filter(r=>r.typeId===type).length))throw Error('Equipment limit');
      for(const role of ['job','queue','output','refund','container','device']){const refs=list.map(r=>r.refs[role]).filter(v=>v!==undefined);if(refs.some(v=>typeof v!=='string'||!v)||new Set(refs).size!==refs.length)throw Error('Duplicate equipment '+role+' reference');}
      return true;
    }
    function restore(list){validate(list);index=new Map(list.map(r=>[r.id,freeze(copy(r))]));epoch++;}
    restore(records.map(r=>({...r,placement:r.placement||'installed'})));
    const ids=()=>[...index.keys()],productionIds=()=>ids().filter(id=>definitions[index.get(id).typeId].recipeStation);
    function fixture(id){
      if(id==='robots014_dock_body'){const r=index.get('robots014_dock');if(!r)return undefined;return {id,...aabb(r.transform,definitions[r.typeId].body),room:r.transform.room};}
      const r=index.get(id);if(!r)return undefined;return {id,...aabb(r.transform,{x:0,y:0,...definitions[r.typeId].footprint}),room:r.transform.room};
    }
    function point(id,x,y){const t=index.get(id)?.transform;if(!t)return null;const c=Math.round(Math.cos(t.rotation)),s=Math.round(Math.sin(t.rotation));return {x:t.x+x*c-y*s,y:t.y+x*s+y*c};}
    function center(id){const def=definitions[index.get(id)?.typeId];return def?point(id,def.footprint.w/2,def.footprint.h/2):null;}
    function withArt(id,fn){const r=index.get(id),authored=BunkerLayout.authored(id)||BunkerLayout.authored(definitions[r?.typeId]?.recipeStation);if(!r||!authored)throw Error('Unknown equipment art');if(r.placement==='packed')return;const p=BunkerLayout.artPoint(r.transform);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(r.transform.rotation);ctx.translate(-authored.x,-authored.y);try{return fn();}finally{ctx.restore();}}
    const capture=()=>copy([...index.values()]);
    function change(record){const next=capture(),i=next.findIndex(r=>r.id===record.id);if(i<0)next.push(record);else next[i]=record;restore(next);}
    function withValidation(list,fn){validate(list);const was=validation;validation=new Map(list.map(r=>[r.id,r]));try{return fn();}finally{validation=was;}}
    return Object.freeze({get:id=>index.get(id),definition:id=>definitions[index.get(id)?.typeId],recipeStation:id=>definitions[index.get(id)?.typeId]?.recipeStation,
      get ids(){return ids();},get productionIds(){return productionIds();},get epoch(){return epoch;},
      present:id=>!index.has(id)||index.get(id).placement==='installed',fixture,point,center,withArt,capture,validate,restore,change,withValidation,
      get validationRecords(){return [...(validation||index).values()];},get validationProductionIds(){return [...(validation||index).values()].filter(r=>definitions[r.typeId].recipeStation).map(r=>r.id);},
      validationType:id=>definitions[(validation||index).get(id)?.typeId]?.recipeStation,
      create(typeId,transform){const id='build:'+typeId+':1';return {id,typeId,transform:copy(transform),refs:productionRefs(id),placement:'installed'};}
    });
  }
  return Object.freeze({definitions,defaults,placement,turns,aabb,createRegistry});
})();
const GameEquipment=EquipmentInstances.createRegistry(EquipmentInstances.defaults);
window.GameEquipment=GameEquipment;
