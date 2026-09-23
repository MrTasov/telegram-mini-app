/* Local adapter, not multiplayer transport. Only this port bridges the current
   single actor's legacy inventories. Unknown/remote actors are denied, never
   silently redirected to the local bag. Pure command gate accepts other ports. */
window.GameEquipmentRuntime=(()=>{
  let sequence=0;
  function container(instanceId){
    const ref=GameEquipment.get(instanceId)?.refs.container;if(!ref)return null;
    const where=ref.startsWith('storage:')?Number(ref.slice(8)):ref;
    return Object.freeze({id:ref,instanceId,where,get slots(){return V010Inventory.list(where);}});
  }
  function job(instanceId){
    const refs=GameEquipment.get(instanceId)?.refs;if(!refs?.job)return null;
    const q=V09Craft.craftQueue;
    return Object.freeze({instanceId,get active(){return q.getJob(refs.job);},get queued(){return q.queues[refs.queue];},get output(){return q.readyItems(refs.output);},get refunds(){return q.refunds[refs.refund];},get paused(){return q.paused[refs.job];}});
  }
  function power(instanceId){const r=GameEquipment.get(instanceId);return r?.refs.device?Object.freeze({instanceId,id:r.refs.device,get device(){return V09Power.devices[r.refs.device];},get powered(){return devicePowered(r.refs.device);}}):null;}
  function access(actor,instance){
    if(actor.dead||actor.scene!==instance.transform.scene||!BunkerLayout.roomActive(instance.transform.room))return false;
    const p=actor.entity,target={...GameFootprints.body(instance.id),range:GameEquipment.definition(instance.id).range};
    const contact=contactPoint(target,p.x,p.y);
    return distance(p.x,p.y,contact.x,contact.y)<=target.range&&lineClear(p.x,p.y,contact.x,contact.y,0,actor.scene,instance.id);
  }
  function perform(c,actor,instance){
    const id=instance.id,p=c.payload||{},q=V09Craft.craftQueue,type=GameEquipment.recipeStation(id);let value=false;
    if(type)switch(c.action){
      case 'start':if(typeof p.recipe==='string'&&Number.isInteger(p.batches))value=V09Craft.start(id,p.recipe,p.batches);break;
      case 'collect':value=V09Craft.collect(id);break;
      case 'collectType':if(typeof p.type==='string'&&(p.limit===undefined||Number.isInteger(p.limit)&&p.limit>0))value=q.collectType(id,p.type,p.limit);break;
      case 'collectRefund':value=q.collectRefund(id);break;
      case 'pause':if(typeof p.value==='boolean')value=q.setPaused(id,p.value);break;
      case 'cancelQueued':value=q.cancelQueued(id,p.index);break;
      case 'cancelUnstarted':value=q.cancelUnstarted(id);break;
      case 'improve':if(type==='craft_bench')value=q.improve(p.key,id);break;
    }
    else if(instance.typeId==='enhancement_cradle')switch(c.action){
      case 'deposit':value=V0161Upgrade.deposit(p.from,p.index);break;
      case 'depositEquipment':value=V0161Upgrade.depositEquipment(p.key);break;
      case 'take':value=V0161Upgrade.take();break;
      case 'upgrade':value=V0161Upgrade.upgrade(V0161Upgrade.slots[0],p.key);break;
    }
    return value?{ok:true,value}:{ok:false,reason:'operation_denied'};
  }
  const commands=EquipmentCommands.create(GameEquipment,{actor:id=>GameActors.get(id),authorized:actor=>actor.id===GameActors.localId,access,perform,changed:()=>queueGameSave()});
  function execute(c){return GameFlow.paused?{ok:false,reason:'world_paused',revision:commands.revision}:commands.execute(c);}
  function request(instanceId,action,payload){
    const result=execute({instanceId,actorId:GameActors.localId,action,payload,expectedRevision:commands.revision,requestId:'equipment-ui:'+commands.revision+':'+(++sequence)});
    if(!result.ok&&result.reason==='out_of_reach')message('Подойдите ближе или нажмите на объект');return result;
  }
  function fresh(){return {schema:1,instances:GameEquipment.capture(),commands:{revision:0,receipts:[]}};}
  function migrate(d){
    if(d.equipment032)return;
    d.equipment032=fresh();
    // Stage A saves enter 6 -> 7 while still using R2 coordinates. The next
    // migration validates that old seed and moves it once with its room.
    if(d.bunker030?.layout===2)for(const r of d.equipment032.instances)if(r.transform.room==='workshop')r.transform.y+=1000;
  }
  function migrateLayout(d){
    if(!d.equipment032)return;
    const previous=GameEquipment.capture();
    for(const r of previous)if(r.transform.room==='workshop')r.transform.y+=1000;
    EquipmentInstances.createRegistry(previous).validate(d.equipment032.instances);
    for(const r of d.equipment032.instances)if(r.transform.room==='workshop')r.transform.y-=1000;
  }
  function validate(data){
    const e=data.equipment032;if(!e||e.schema!==1||Object.keys(e).sort().join()!=='commands,instances,schema')throw Error('Missing equipment state');
    GameEquipment.validate(e.instances);commands.validate(e.commands);
    for(const r of e.instances){const refs=r.refs;
      if(refs.device&&!Object.hasOwn(data.v09.power.deviceEnabled,refs.device))throw Error('Missing equipment power reference');
      if(refs.job){if(refs.job!=='feed_craft'&&!Object.hasOwn(data.v09.crafting.jobs,refs.job))throw Error('Missing equipment job reference');
        const savedQueue=data.v010?.modules?.craft||V010.initialModules.craft;
        for(const [role,field]of [['queue','queues'],['output','ready'],['refund','refunds']])if(!Object.hasOwn(savedQueue[field],refs[role]))throw Error('Missing equipment production reference');}
      // Historical upgrade0161 is optional: absence means its empty cradle.
      if(refs.container?.startsWith('storage:')&&!data.storage[Number(refs.container.slice(8))])throw Error('Missing equipment storage reference');
    }return true;
  }
  const capture=()=>({schema:1,instances:GameEquipment.capture(),commands:commands.capture()});
  GameSave.extend('capture','equipment.instances',function(previous){const d=previous();d.equipment032=capture();return d;});
  GameSave.extend('decode','equipment.instances',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','equipment.instances',function(previous,d){validate(d);const result=previous(d);commands.restore(d.equipment032.commands);return result;});
  GameState.register('equipment',{capture,instances:GameEquipment,job,container,power},{source:'equipment/runtime.js',saved:['equipment032'],transient:['local request sequence','adapter views']});
  return Object.freeze({job,container,power,access,execute,request,capture,migrate,migrateLayout,validate,get revision(){return commands.revision;}});
})();
