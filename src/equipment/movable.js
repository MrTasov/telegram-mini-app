/* Shared runtime adapters for movable equipment. Persistent production, energy
   and containers keep their original owners; this file owns no saved copies. */
window.GameMovable=(()=>{
  const active=r=>r.transform.scene==='bunker'&&r.placement==='installed'&&BunkerLayout.roomActive(r.transform.room);
  const kinds={fuel_tank:'v09fuel',generator:'v09generator',reserve_battery:'v09battery',drone_station:'robots014_dock',enhancement_cradle:'upgrade0161',storage_crate:'storage',base_lamp:'base_lamp'};
  const solids=solidObjects;solidObjects=function(which=scene){const old=solids(which);if(which!=='bunker')return old;return old.filter(o=>!GameEquipment.get(o.id)&&o.id!=='robots014_dock_body').concat(GameEquipment.records.filter(active).map(r=>GameFootprints.body(r.typeId==='drone_station'?r.id+'_body':r.id)));};
  const objects=interactionObjects;interactionObjects=function(which=scene){const old=objects(which);if(which!=='bunker')return old;return old.filter(o=>!GameEquipment.get(o.id)&&o.id!=='robots014_dock_body').concat(GameEquipment.records.filter(active).map(r=>{
    const d=EquipmentInstances.definitions[r.typeId],b=r.typeId==='drone_station'?GameEquipment.fixture(r.id):GameFootprints.body(r.id);return {...b,kind:DefenseDefinitions.types[r.typeId]?'defense039':kinds[r.typeId]||'v09craft',name:I18n.text(d.name),range:d.range,ref:r.typeId==='storage_crate'?Number(r.refs.container.slice(8)):r.id,pickBounds:b};
  }));};
  const interact=executeInteraction;executeInteraction=function(o,...args){if(o?.kind==='base_lamp'){if(canInteract(o,player.x,player.y))togglePowerDevice(GameEquipment.get(o.id).refs.device);return;}return interact(o,...args);};
  function sync(){
    for(const d of Object.values(V09Power.devices))if((d.id.startsWith('build:')||d.id.startsWith('hmg016_'))&&!GameEquipment.get(d.id))delete V09Power.devices[d.id];
    for(const r of GameEquipment.records){
      if(r.typeId==='base_lamp'||DefenseDefinitions.types[r.typeId])registerEquipmentPowerDevice(r.id,()=>r.typeId==='base_lamp'||(GameEquipment.get(r.id)?.state.condition.hp>0&&!GameEquipment.get(r.id)?.state.settings.fallen));
      else if(r.refs.device){const d=V09Power.devices[r.refs.device];if(d){Object.defineProperty(d,'room',{configurable:true,enumerable:true,get:()=>GameEquipment.get(r.id)?.transform.room||r.transform.room});d.present=()=>GameEquipment.present(r.id);}}
    }
    for(const [id,target]of [['upgrade0161',V0161Upgrade.station],['robots014_dock',V014Robots.station]])for(const k of ['x','y','w','h','room'])Object.defineProperty(target,k,{enumerable:true,configurable:true,get:()=>GameEquipment.fixture(id)[k]});
    for(const room of GamePlacement.zones)Object.defineProperty(V09Power.rooms,room,{enumerable:true,configurable:true,get:()=>GamePlacement.roomName(room)});
    invalidateGeometry();
  }
  function drawSimple(r){const d=EquipmentInstances.definitions[r.typeId],b=GameFootprints.forRecord(r);V011Rooms.shadow(b.x,b.y,b.w,b.h,10,b.room);ctx.save();ctx.translate(r.transform.x,r.transform.y);ctx.rotate(r.transform.rotation);
    const key=EquipmentInstances.placement[r.typeId].art;
    if(!V011Art.draw(key,0,0,d.footprint.w,d.footprint.h)){ctx.fillStyle='#455a4b';ctx.fillRect(3,12,d.footprint.w-6,d.footprint.h-24);}
    ctx.restore();
  }
  function draw(){
    for(const r of GameEquipment.records.filter(active)){
      if(r.typeId==='storage_crate'){const f=BunkerLayout.authored(r.id)||{x:0,y:0,w:68,h:50},index=Number(r.refs.container.slice(8));ctx.save();ctx.translate(r.transform.x,r.transform.y);ctx.rotate(r.transform.rotation);V011Rooms.chest(index,{x:34,y:25},storageChests[index]);ctx.restore();}
      if(['utility_workbench','base_lamp'].includes(r.typeId))drawSimple(r);
    }
    V011Rooms.energy();
  }
  function drawUpgrade(pulseUntil){const r=GameEquipment.get('upgrade0161');if(!active(r))return;const f=EquipmentInstances.definitions[r.typeId],b=GameFootprints.forRecord(r);V011Rooms.shadow(b.x,b.y,b.w,b.h,11,b.room);ctx.save();ctx.translate(r.transform.x,r.transform.y);ctx.rotate(r.transform.rotation);V011Art.draw('upgrade_station0161',0,0,f.footprint.w,f.footprint.h);if(performance.now()<pulseUntil){ctx.strokeStyle='#85e7caaa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(34,35+(performance.now()%850)/850*45);ctx.lineTo(108,35+(performance.now()%850)/850*45);ctx.stroke();}ctx.restore();}
  function receive(type,qty){if(type!=='base_lamp')return qty;let left=qty;while(left>0&&GameCarried.free()>=0&&GameEquipment.capture().filter(r=>r.typeId===type).length<EquipmentInstances.placement[type].limit&&GameEquipment.ids.length<48){const r=GameEquipment.create(type,GamePlacement.centered(type,'reserve_l1',1870,510),GameActors.localId);GameEquipment.change(r);GameCarried.add(r.id);left--;}sync();return left;}
  sync();return Object.freeze({sync,draw,drawUpgrade,receive});
})();
