/* One operational control authority shared by the physical Core and Remote.
   Descriptors are views over installed instances and their existing owners. */
window.GameBaseControl=(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v)),t=(k,p)=>I18n.t('control.'+k,p);let sequence=0,doorModes={};
  const levels=Object.freeze([{id:'surface',title:'control.surface',zones:['yard']},{id:'bunker:1',title:'control.level1',zones:BunkerLayout.roomData.map(r=>r.id)}]);
  const zoneAt=(x,y)=>BunkerLayout.roomData.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)?.id||'corridor';
  const location=r=>({level:r.transform.scene==='bunker'?'bunker:1':'surface',zone:r.transform.room});
  function list(){
    const out=[],devices=new Set();
    for(const r of GameEquipment.records){if(r.placement!=='installed'||!BunkerLayout.roomActive(r.transform.room))continue;
      const def=EquipmentInstances.definitions[r.typeId],base={id:r.id,instanceId:r.id,...location(r),name:I18n.t('build.type.'+r.typeId),typeId:r.typeId};
      if(r.typeId==='generator')out.push({...base,kind:'generator',action:'generator',on:V09Power.running});
      else if(r.typeId==='reserve_battery')out.push({...base,kind:'battery',action:'battery',on:V010Energy.battery.enabled});
      else if(r.refs.device){devices.add(r.refs.device);const d=V09Power.devices[r.refs.device];if(d&&def.powerKW>0)out.push({...base,kind:r.typeId==='base_lamp'?'lamp':'consumer',action:'power',deviceId:d.id,on:d.enabled,watts:d.watts});}
    }
    for(const d of Object.values(V09Power.devices)){
      if(devices.has(d.id)||GameEquipment.get(d.id)||d.id===GameCampaign.powerId||d.id.startsWith('door_')||d.watts<=0||!BunkerLayout.roomActive(d.room)||d.present&&!d.present())continue;
      out.push({id:'device:'+d.id,deviceId:d.id,kind:d.id.startsWith('light_')?'light':'searchlight',action:'power',name:d.id.startsWith('light_')?t('roomLights',{room:GamePlacement.roomName(d.room)}):I18n.text(d.name),level:d.room==='yard'?'surface':'bunker:1',zone:d.room,on:d.enabled,watts:d.watts});
    }
    for(const d of v09Doors.filter(d=>BunkerLayout.roomActive(d.room)))out.push({id:d.id,kind:'door',action:'door',name:t('door',{room:GamePlacement.roomName(d.room)}),level:'bunker:1',zone:d.room,on:doorModes[d.id]==='open'||doorModes[d.id]!=='closed'&&(d.manual||d.open>.5),mode:doorModes[d.id]||'auto',broken:V018Build.isBroken(d.id),deviceId:'door_'+d.room});
    for(const g of V015Base.sections.filter(g=>g.gate&&g.gate!=='airlock'))out.push({id:g.id,kind:'gate',action:'gate',name:t('gate.'+g.gate),level:'surface',zone:'yard',on:V015Base.isOpen(g),broken:g.hp<=0});
    for(const g of V016Turret.guns.filter(g=>!g.fallen))out.push({id:g.id,kind:'turret',action:'active',name:I18n.text(ITEM[V016Turret.typeOf(g)].name),level:'surface',zone:'yard',on:g.enabled,ammo:g.ammo});
    const drone=V014Robots.state;if(!drone.packed)out.push({id:drone.id,kind:'drone',action:'droneCombat',name:drone.name||t('drone'),level:drone.scene==='bunker'?'bunker:1':'surface',zone:drone.scene==='bunker'?zoneAt(drone.x,drone.y):'yard',on:V014Robots.combatEnabled(),light:drone.light,task:drone.task,broken:drone.hp<=0});
    return out;
  }
  const get=id=>list().find(d=>d.id===id);
  function remote(actor){return actor.id===GameActors.localId&&bagCount('remote')>0;}
  function physical(actor,d){
    if(d.instanceId)return GameEquipmentRuntime.access(actor,GameEquipment.get(d.instanceId));
    if(d.kind==='drone')return V014Robots.near();
    if(d.kind==='turret')return V016Turret.reachable(V016Turret.guns.find(g=>g.id===d.id));
    return interactionObjects(actor.scene).some(o=>(o.id===d.id||o.ref===d.id||o.device===d.deviceId)&&canInteract(o,actor.entity.x,actor.entity.y));
  }
  function access(actor,d){return !actor.dead&&!!d&&(GameCampaign.access(actor,BunkerLayout.core.id,false).available||remote(actor)||physical(actor,d));}
  function occupiedDoor(d){return BunkerLayout.occupants('bunker').some(a=>rectHit(a.x,a.y,(a.radius||14)+8,d));}
  function perform(c,actor,d){
    const p=c.payload||{};if(typeof p.value!=='boolean'&&c.action!=='doorAuto'&&c.action!=='droneTask')return {ok:false,reason:'invalid_command'};
    if(p.previous!==undefined&&p.previous!==d.on)return {ok:false,reason:'world_changed'};
    if(c.action===d.action&&d.kind==='generator'||c.action===d.action&&d.kind==='battery')return GameRecovery.execute({actorId:actor.id,instanceId:d.id,action:d.action,payload:{value:p.value},expectedRevision:GameRecovery.revision,requestId:'base-control:'+commands.revision});
    if(c.action==='power'&&d.action==='power'){const device=V09Power.devices[d.deviceId];if(!device||device.present&&!device.present())return {ok:false,reason:'missing_instance'};device.enabled=p.value;v09PowerChanged();invalidateGeometry();return {ok:true};}
    if((c.action==='door'||c.action==='doorAuto')&&d.kind==='door'){
      const door=v09Doors.find(v=>v.id===d.id);if(d.broken)return {ok:false,reason:'damaged'};
      if(p.manual&&(!p.value||!physical(actor,d)))return {ok:false,reason:'out_of_reach'};
      if(c.action!=='doorAuto'&&!p.manual&&!devicePowered(d.deviceId))return {ok:false,reason:'noPower'};
      if(c.action==='door'&&!p.value&&occupiedDoor(door))return {ok:false,reason:'occupied'};
      if(c.action==='doorAuto'||p.manual)delete doorModes[d.id];else doorModes[d.id]=p.value?'open':'closed';
      door.manual=!!p.value;door.away=0;invalidateGeometry();return {ok:true};
    }
    if(c.action==='gate'&&d.kind==='gate'){if(d.broken)return {ok:false,reason:'damaged'};const gate=V015Base.byId.get(d.id);if(V015Base.isOpen(gate)!==p.value)V015Base.toggle(gate);return {ok:V015Base.isOpen(gate)===p.value,reason:'occupied'};}
    if(c.action==='active'&&d.kind==='turret')return {ok:V016Turret.applyEnabled(d.id,p.value)};
    if(d.kind==='drone'){
      if(d.broken)return {ok:false,reason:'damaged'};
      if(c.action==='droneCombat')return {ok:V014Robots.setCombat(p.value)!==false};
      if(c.action==='droneLight'){V014Robots.state.light=p.value;V014Robots.changed();return {ok:true};}
      if(c.action==='droneTask'&&['follow','guard','return'].includes(p.task)){const fn={follow:V014Robots.follow,guard:V014Robots.guard,return:V014Robots.returnToDock}[p.task];return {ok:fn()!==false};}
    }
    return {ok:false,reason:'unknown_action'};
  }
  const commands=EquipmentCommands.create({get},{actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access,perform,changed:()=>{queueGameSave();window.GameBaseControlUI?.refresh();}});
  function execute(c){return GameFlow.paused?{ok:false,reason:'world_paused',revision:commands.revision}:commands.execute(c);}
  function request(id,action,payload={},revision=commands.revision){const result=execute({actorId:GameActors.localId,instanceId:id,action,payload,expectedRevision:revision,requestId:'base-control:'+revision+':'+(++sequence)});if(!result.ok)message(t('error.'+result.reason));return result;}
  function toggleDevice(id){const d=list().find(d=>d.deviceId===id&&d.action==='power');return !!d&&request(d.id,'power',{value:!d.on,previous:d.on}).ok;}
  function migrate(d){
    const power=d.v09.power,equipmentDevices=new Set(d.equipment032.instances.map(r=>r.refs.device).filter(Boolean));for(const r of d.equipment032.instances){if(r.refs.device&&power.roomEnabled[r.transform.room]===false)power.deviceEnabled[r.refs.device]=false;}
    // Dynamic device location must come from the imported record, never from
    // an unrelated world currently open in this tab.
    for(const id of Object.keys(power.deviceEnabled)){const device=V09Power.devices[id];if(!equipmentDevices.has(id)&&device&&power.roomEnabled[device.room]===false)power.deviceEnabled[id]=false;}
    for(const room of Object.keys(power.roomEnabled))power.roomEnabled[room]=true;
    d.control0353={schema:1,commands:{revision:0,receipts:[]},doorModes:{}};
  }
  function validate(d){const s=d.control0353;if(!s||s.schema!==1||Object.keys(s).sort().join()!=='commands,doorModes,schema'||!s.doorModes||Array.isArray(s.doorModes)||Object.entries(s.doorModes).some(([id,mode])=>!v09Doors.some(v=>v.id===id&&BunkerLayout.roomActive(v.room))||!['open','closed'].includes(mode)))throw Error('Invalid base control state');commands.validate(s.commands);return true;}
  const capture=()=>({schema:1,commands:commands.capture(),doorModes:copy(doorModes)});
  GameSave.extend('capture','base.control',function(previous){const d=previous();d.control0353=capture();return d;});
  GameSave.extend('decode','base.control',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','base.control',function(previous,d){validate(d);const out=previous(d);commands.restore(d.control0353.commands);doorModes=copy(d.control0353.doorModes);window.GameBaseControlUI?.reset();return out;});
  GameState.register('baseControl',{capture,list},{source:'base/control.js',saved:['control0353'],transient:['request sequence','UI area selection']});
  return Object.freeze({levels,list,get,access,remote,execute,request,toggleDevice,migrate,validate,capture,doorMode:id=>doorModes[id]||'auto',get revision(){return commands.revision;}});
})();
