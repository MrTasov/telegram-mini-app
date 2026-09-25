/* Stage B identity extended by Stage D placement. Existing spellings remain
   stable instance IDs; recipe/presentation capabilities belong to typeId.
   The registry owns identity and transforms ONLY. Jobs, items and energy retain
   their historical owners and are referenced, never copied into this table. */
const EquipmentInstances=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const freeze=x=>{for(const v of Object.values(x))if(v&&typeof v==='object')freeze(v);return Object.freeze(x);};
  const rooms=BunkerLayout.roomData.filter(r=>r.id!=='corridor').map(r=>r.id);
  const definitions=freeze({
    ...Object.fromEntries(Object.entries(DefenseDefinitions.types).map(([id,d])=>[id,{...d,range:64}])) ,
    furnace:{footprint:{w:130,h:195},recipeStation:'furnace',powerKW:6,name:'Плавильная печь',range:48},
    craft_bench:{footprint:{w:260,h:173},recipeStation:'craft_bench',powerKW:2,name:'Оружейный станок',range:48},
    utility_workbench:{footprint:{w:134,h:88},body:{x:5,y:5,w:124,h:78},recipeStation:'utility_workbench',powerKW:0,name:'Рабочий верстак',range:48,art:'utility_workbench'},
    base_lamp:{footprint:{w:44,h:44},body:{x:10,y:10,w:24,h:24},powerKW:.03,name:'Напольная лампа',range:48,art:'base_lamp'},
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
  // Room display names confer no placement permissions. Singular energy
  // owners keep their identity; future adapters reuse this same capability port.
  const placement=freeze({
    ...Object.fromEntries(Object.entries(DefenseDefinitions.types).map(([id,d])=>[id,{limit:d.limit,cost:d.cost,rooms:id==='searchlight'?['yard',...rooms,'corridor']:['yard'],craftable:true,guard:'empty',art:d.art}])) ,
    furnace:{limit:4,cost:{iron:20,parts:6,concrete:8},rooms,craftable:true,guard:'production',art:'furnace'},
    utility_workbench:{limit:4,cost:{iron:4,wood:6},rooms,craftable:true,guard:'production',art:'utility_workbench'},
    craft_bench:{limit:4,cost:{iron:16,wood:12,parts:4},rooms,craftable:true,guard:'production',art:'workbench'},
    storage_crate:{limit:16,cost:{wood:6,iron:2},rooms:[...rooms,'corridor'],craftable:true,guard:'container',art:'chest'},
    generator:{limit:1,rooms,guard:'generator',art:'generator'},
    fuel_tank:{limit:1,rooms,guard:'tank',art:'tank'},
    reserve_battery:{limit:1,rooms,guard:'battery',art:'battery0352'},
    drone_station:{limit:1,rooms,guard:'drone',art:'drone_station0352'},
    enhancement_cradle:{limit:1,rooms,guard:'container',art:'upgrade_station0161'},
    base_lamp:{limit:8,cost:{iron:2,copper:1,parts:1},rooms:[...rooms,'corridor'],craftable:false,guard:'empty',art:'base_lamp'}
  });
  const state=()=>({level:0,condition:{hp:100,maxHp:100},modules:[],settings:{}});
  const turns=Object.freeze([0,Math.PI/2,Math.PI,Math.PI*1.5]);
  function aabb(t,b){
    const c=Math.round(Math.cos(t.rotation)),s=Math.round(Math.sin(t.rotation));
    const points=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(([x,y])=>({x:t.x+x*c-y*s,y:t.y+x*s+y*c}));
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};
  }
  const equalFields=(a,b)=>!!a&&!!b&&Object.keys(a).sort().join()===Object.keys(b).sort().join()&&Object.keys(b).every(k=>a[k]===b[k]);
  function createRegistry(records){
    const seeds=copy(records),seedIndex=new Map(seeds.map(r=>[r.id,r]));let index=new Map(),validation=null,epoch=0;
    const refsFor=(type,id,storageIndex)=>{
      const def=definitions[type];if(def.recipeStation)return {job:id,queue:id,output:id,refund:id,device:id};
      if(type==='storage_crate')return {container:'storage:'+storageIndex};
      if(type==='base_lamp'||DefenseDefinitions.types[type])return {device:id};return {};
    };
    function validate(list,legacy=false){
      if(!Array.isArray(list)||list.length<seeds.length||list.length>192||new Set(list.map(r=>r?.id)).size!==list.length)throw Error('Invalid equipment IDs');
      const incoming=new Map(list.map(r=>[r?.id,r]));
      if(seeds.some(r=>!incoming.has(r.id)))throw Error('Missing authored equipment');
      for(const r of list){
        const seed=seedIndex.get(r.id),def=definitions[r.typeId],rule=placement[r.typeId],t=r.transform;
        if(!def||!/^\w[\w:-]{0,79}$/.test(r.id)||!r.refs||!t||![t.x,t.y].every(Number.isFinite)||Math.abs(t.x)>10000||Math.abs(t.y)>10000||!turns.includes(t.rotation)||!['bunker','surface'].includes(t.scene)||((t.scene==='surface')!==(t.room==='yard'))||Object.keys(t).sort().join()!=='room,rotation,scene,x,y')throw Error('Invalid equipment transform');
        if(legacy){if(!seed||Object.keys(r).sort().join()!=='id,refs,transform,typeId'||r.typeId!==seed.typeId||!equalFields(r.transform,seed.transform)||!equalFields(r.refs,seed.refs))throw Error('Invalid legacy equipment');continue;}
        if(Object.keys(r).sort().join()!=='id,ownerId,placement,refs,state,transform,typeId'||!['installed','packed'].includes(r.placement))throw Error('Invalid equipment presence');
        if(r.placement==='installed'?r.ownerId!==null:typeof r.ownerId!=='string'||!/^player:[\w:-]{1,72}$/.test(r.ownerId))throw Error('Invalid equipment owner');
        const v=r.state;if(!v||Object.keys(v).sort().join()!=='condition,level,modules,settings'||!Number.isInteger(v.level)||v.level<0||v.level>5||!v.condition||Object.keys(v.condition).sort().join()!=='hp,maxHp'||!Number.isFinite(v.condition.hp)||!Number.isFinite(v.condition.maxHp)||v.condition.maxHp<=0||v.condition.maxHp>1e6||v.condition.hp<0||v.condition.hp>v.condition.maxHp||!Array.isArray(v.modules)||v.modules.length>8||v.modules.some(x=>typeof x!=='string'||!/^[a-z0-9_:-]{1,60}$/.test(x))||!v.settings||Array.isArray(v.settings)||Object.keys(v.settings).length>16||Object.entries(v.settings).some(([k,n])=>!/^[a-zA-Z][\w]{0,39}$/.test(k)||!['boolean','number','string'].includes(typeof n)||typeof n==='number'&&!Number.isFinite(n)||typeof n==='string'&&n.length>80))throw Error('Invalid equipment persistent state');
        const index=r.typeId==='storage_crate'?Number(r.refs.container?.slice(8)):undefined;
        if(!seed&&r.typeId==='storage_crate'&&(!Number.isInteger(index)||index<14||index>29))throw Error('Invalid storage index');
        const refs=seed?.refs||refsFor(r.typeId,r.id,index);
        if(seed?r.typeId!==seed.typeId:!rule||!(new RegExp('^build:'+r.typeId+':[1-9][0-9]?$').test(r.id)||r.typeId==='heavy_turret'&&/^hmg016_[1-9]\d{0,7}$/.test(r.id)))throw Error('Invalid equipment type');
        if(Object.keys(refs).sort().join()!==Object.keys(r.refs).sort().join()||Object.keys(refs).some(k=>r.refs[k]!==refs[k]))throw Error('Invalid equipment references');
        if(!rule){if(!seed||!equalFields(t,seed.transform)||r.placement!=='installed')throw Error('Protected equipment');}
        else if(!(seed&&seed.transform.room==='farm')&&!rule.rooms.includes(t.room))throw Error('Invalid placement room');
      }
      if(!legacy)for(const [type,rule]of Object.entries(placement))if(list.filter(r=>r.typeId===type&&!/^hmg016_/.test(r.id)).length>Math.max(rule.limit,seeds.filter(r=>r.typeId===type).length))throw Error('Equipment limit');
      for(const role of ['job','queue','output','refund','container','device']){const refs=list.map(r=>r.refs[role]).filter(v=>v!==undefined);if(refs.some(v=>typeof v!=='string'||!v)||new Set(refs).size!==refs.length)throw Error('Duplicate equipment '+role+' reference');}
      return true;
    }
    function restore(list){validate(list);index=new Map(list.map(r=>[r.id,freeze(copy(r))]));epoch++;}
    restore(records.map(r=>({...r,placement:r.placement||'installed',ownerId:r.ownerId??null,state:r.state||state()})));
    const ids=()=>[...index.keys()],productionIds=()=>ids().filter(id=>definitions[index.get(id).typeId].recipeStation);
    function fixture(id){
      if(id==='robots014_dock_body'){const r=index.get('robots014_dock');if(!r)return undefined;return {id,...aabb(r.transform,definitions[r.typeId].body),room:r.transform.room};}
      const r=index.get(id);if(!r)return undefined;return {id,...aabb(r.transform,{x:0,y:0,...definitions[r.typeId].footprint}),room:r.transform.room};
    }
    function point(id,x,y){const t=index.get(id)?.transform;if(!t)return null;const c=Math.round(Math.cos(t.rotation)),s=Math.round(Math.sin(t.rotation));return {x:t.x+x*c-y*s,y:t.y+x*s+y*c};}
    function center(id){const def=definitions[index.get(id)?.typeId];return def?point(id,def.footprint.w/2,def.footprint.h/2):null;}
    function withArt(id,fn){const r=index.get(id),authored=BunkerLayout.authored(id)||BunkerLayout.authored(definitions[r?.typeId]?.recipeStation);if(!r||!authored)throw Error('Unknown equipment art');if(r.placement==='packed')return;const p=BunkerLayout.artPoint(r.transform);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(r.transform.rotation);ctx.translate(-authored.x,-authored.y);try{return fn();}finally{ctx.restore();}}
    const capture=()=>copy([...index.values()]);
    function change(record){
      const next=[...index.values()],i=next.findIndex(r=>r.id===record.id);if(i<0)next.push(record);else next[i]=record;
      // Full domain validation remains atomic, but only the changed immutable record is cloned.
      validate(next);index.set(record.id,freeze(copy(record)));epoch++;
    }
    function withValidation(list,fn){validate(list);const was=validation;validation=new Map(list.map(r=>[r.id,r]));try{return fn();}finally{validation=was;}}
    return Object.freeze({get:id=>index.get(id),definition:id=>definitions[index.get(id)?.typeId],recipeStation:id=>definitions[index.get(id)?.typeId]?.recipeStation,
      get ids(){return ids();},get records(){return [...index.values()];},get productionIds(){return productionIds();},get epoch(){return epoch;},
      present:id=>!index.has(id)||index.get(id).placement==='installed',fixture,point,center,withArt,capture,validate,restore,change,withValidation,
      get validationRecords(){return [...(validation||index).values()];},get validationProductionIds(){return [...(validation||index).values()].filter(r=>definitions[r.typeId].recipeStation).map(r=>r.id);},
      validationType:id=>definitions[(validation||index).get(id)?.typeId]?.recipeStation,
      create(typeId,transform,ownerId=null,storageIndex){let n=1;while(index.has('build:'+typeId+':'+n))n++;const id='build:'+typeId+':'+n;return {id,typeId,transform:copy(transform),refs:refsFor(typeId,id,storageIndex),placement:ownerId?'packed':'installed',ownerId,state:DefenseDefinitions.types[typeId]?{...state(),condition:{hp:DefenseDefinitions.types[typeId].hp,maxHp:DefenseDefinitions.types[typeId].hp},settings:{angle:0,ammo:0,mountWall:'',fallen:false}}:state()};},
      inventory:actorId=>capture().filter(r=>r.placement==='packed'&&r.ownerId===actorId)
    });
  }
  return Object.freeze({definitions,defaults,placement,turns,aabb,createRegistry,state,rooms});
})();
const GameEquipment=EquipmentInstances.createRegistry(EquipmentInstances.defaults);
window.GameEquipment=GameEquipment;
