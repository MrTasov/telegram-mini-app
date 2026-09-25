/* C1 local authority adapter. Health, paid repair credit, inventories, fuel and
   battery still belong to their existing owners. No HP copies or UI clocks. */
window.GameRecovery=(()=>{
  let sequence=0;
  const protectedIds=new Set([BunkerLayout.core.id,BunkerLayout.up.id,BunkerLayout.down.id,...BunkerLayout.stairs.map(s=>s.id),...BunkerLayout.solids.map(s=>s.id),...GameEquipment.ids,'bunker','bunker_hatch']);
  function classify(id){
    if(protectedIds.has(id)||GameEquipment.get(id))return {mode:'protected',reason:'critical_base_fixture'};
    const r=V018Build.record(id);return r?{mode:'recoverable',typeId:V018Build.definition(r).typeId,family:V018Build.definition(r).family}:null;
  }
  function status(id){const policy=classify(id);if(!policy)return null;const o=V018Build.record(id)?.object;return {...policy,...(o?{hp:o.hp,maxHp:o.maxHp,level:o.level}:{} )};}
  function instance(id){
    const equipment=GameEquipment.get(id);if(equipment)return equipment;
    const r=V018Build.record(id);return r?{id:r.id,typeId:V018Build.definition(r).typeId,transform:{scene:r.scene,x:r.object.x,y:r.object.y,rotation:0},refs:{health:r.id}}:null;
  }
  function access(actor,target){
    if(actor.dead||GameEquipment.get(target.id)&&!GameEquipment.present(target.id))return false;
    const id=target.id;
    if(['generator','battery'].includes(id)){
      // Preserve the existing remote controller and energy-room control panels.
      if(bagCount('remote')>0||window.GameCampaign?.access(actor,BunkerLayout.core.id,false).available)return true;
      return ['tank','generator','battery'].some(key=>GameEquipmentRuntime.access(actor,GameEquipment.get(key)));
    }
    if(id==='tank')return GameEquipmentRuntime.access(actor,target);
    const r=V018Build.record(id);if(r?.kind==='automatic')return actor.scene===r.scene&&canInteract({...r.object,kind:'v09door',range:68},actor.entity.x,actor.entity.y);return !!r&&V018Build.near(r);
  }
  const rawGenerator=v09ToggleGenerator,rawRefuel=v09Refuel;
  function perform(c,actor,target){
    const p=c.payload||{},id=target.id,record=V018Build.record(id);
    if(c.action==='repair'||c.action==='upgrade'){
      if(classify(id)?.mode!=='recoverable')return {ok:false,reason:'protected'};
      const ok=c.action==='repair'?V018Build.applyRepair(id,actor.id):V018Build.applyUpgrade(id,actor.id);return {ok:!!ok};
    }
    if(c.action==='stopRepair'){
      if(V018Build.job?.actorId!==actor.id||V018Build.job.id!==id)return {ok:false,reason:'missing_job'};
      V018Build.stop();return {ok:true};
    }
    if(c.action==='manualOpen'){
      if(record?.kind!=='automatic'||!BunkerLayout.roomActive(record.object.room))return {ok:false,reason:'invalid_door'};
      if(window.GameBaseControl){const result=GameBaseControl.request(id,'door',{value:true,manual:true});if(result.ok)message(devicePowered('door_'+record.object.room)?'Дверь открывается':'Дверь открыта вручную');return result;}record.object.manual=true;record.object.away=0;message(devicePowered('door_'+record.object.room)?'Дверь открывается':'Дверь открыта вручную');return {ok:true};
    }
    if(c.action==='generator'&&id==='generator'){
      if(typeof p.value!=='boolean'||p.value&&V09Power.fuel<=0)return {ok:false,reason:'no_fuel'};
      if(V09Power.running!==p.value)rawGenerator();return {ok:V09Power.running===p.value};
    }
    if(c.action==='refuel'&&id==='tank'){
      if(!Number.isSafeInteger(p.units)||p.units<1||p.units>100)return {ok:false,reason:'invalid_amount'};
      const before=V09Power.fuel;rawRefuel(p.units);return V09Power.fuel>before?{ok:true,units:V09Power.fuel-before}:{ok:false,reason:'no_fuel_or_capacity'};
    }
    if(c.action==='battery'&&id==='battery'&&typeof p.value==='boolean'){V010Energy.battery.enabled=p.value;v09PowerChanged();return {ok:true};}
    return {ok:false,reason:'unknown_action'};
  }
  const commands=EquipmentCommands.create({get:instance},{actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access,perform,changed:()=>queueGameSave()});
  function execute(c){return GameFlow.paused?{ok:false,reason:'world_paused',revision:commands.revision}:commands.execute(c);}
  function request(instanceId,action,payload){
    const result=execute({actorId:GameActors.localId,instanceId,action,payload,expectedRevision:commands.revision,requestId:'recovery-ui:'+commands.revision+':'+(++sequence)});
    if(!result.ok){if(result.reason==='out_of_reach')message('Подойдите ближе или используйте пульт базы');if(result.reason==='no_fuel')message('Сначала заправьте топливный бак в энергоблоке');}return result;
  }
  v09ToggleGenerator=()=>request('generator','generator',{value:!V09Power.running}).ok;
  v09Refuel=units=>request('tank','refuel',{units}).ok;
  function fresh(){return {schema:1,commands:{revision:0,receipts:[]}};}
  function migrate(d){d.recovery033??=fresh();}
  function validate(d){const s=d.recovery033;if(!s||s.schema!==1||Object.keys(s).sort().join()!=='commands,schema')throw Error('Invalid base recovery state');commands.validate(s.commands);return true;}
  const capture=()=>({schema:1,commands:commands.capture()});
  GameSave.extend('capture','base.recovery',function(previous){const d=previous();d.recovery033=capture();return d;});
  GameSave.extend('decode','base.recovery',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','base.recovery',function(previous,d){validate(d);const result=previous(d);commands.restore(d.recovery033.commands);return result;});
  GameState.register('recovery',{capture,status},{source:'base/recovery.js',saved:['recovery033'],transient:['request sequence','actor-addressed repair job (V018Build)']});
  return Object.freeze({classify,status,instance,access,execute,request,capture,migrate,validate,get revision(){return commands.revision;}});
})();
