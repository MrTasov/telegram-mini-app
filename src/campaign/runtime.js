/* Existing owners remain authoritative. Core uses the existing power allocator;
   the campaign adds no second Research system and never gates old recipes. */
window.GameCampaign=(()=>{
  const core=BunkerLayout.core,powerId='command_core_l1';
  registerPowerDevice(powerId,'corridor',.05,()=>true,I18n.t('bunker.core.name'));
  function facts(){return {generatorRunning:V09Power.running&&V09Power.fuel>0,corePowered:devicePowered(powerId),mined:V010Progression.count('mined')};}
  function access(actor,targetId,requirePower=true){
    if(targetId!==core.id||!interactionObjects('bunker').some(o=>o.id===targetId&&o.kind==='command_core'))return {available:false,reason:'campaign.reason.target'};
    const p=actor?.entity;
    if(!p||actor.dead)return {available:false,reason:'campaign.reason.actor'};
    const contact=contactPoint(core,p.x,p.y);
    if(actor.scene!=='bunker'||distance(p.x,p.y,contact.x,contact.y)>core.range||!lineClear(p.x,p.y,contact.x,contact.y,0,actor.scene,core.id))return {available:false,reason:'campaign.reason.distance'};
    if(requirePower&&!devicePowered(powerId))return {available:false,reason:'campaign.reason.power'};
    return {available:true,reason:null};
  }
  const listeners=new Set();let lastFacts='',elapsed=0;
  const domain=GameCampaignDomain.create(CampaignDefinitions,{facts,actor:id=>GameActors.get(id),permission:actor=>!!GameActors.get(actor.id),access,
    changed(){queueGameSave();for(const fn of listeners)fn();},emit:event=>V010.emit('campaign',event)});
  function refresh(force=false){
    const f=facts(),signature=[f.generatorRunning,f.corePowered,f.mined].join('|');
    if(force||signature!==lastFacts){lastFacts=signature;domain.refresh(f);for(const fn of listeners)fn();}
    return domain.view();
  }
  function tick(dt){
    if(GameFlow.paused)return;
    elapsed+=Math.max(0,Number(dt)||0);if(elapsed<250)return;elapsed%=250;refresh();
    window.CommandCoreUI?.tick();
  }
  V010.on('mined',()=>{if(!GameSave.restoring&&!GameFlow.paused)refresh();});
  const oldPowerChanged=v09PowerChanged;
  v09PowerChanged=function(){oldPowerChanged();if(!GameSave.restoring&&!GameFlow.paused)refresh();};
  const oldUpdate=update;
  update=function(){oldUpdate();tick(16.667*frameScale);};
  function migrate(d){
    if(!d.campaign031)d.campaign031=domain.fresh('legacy',{mined:d.v010?.modules?.progression?.counts?.mined||0});
    if(d.v09?.power?.deviceEnabled&&!Object.hasOwn(d.v09.power.deviceEnabled,powerId))d.v09.power.deviceEnabled[powerId]=true;
  }
  GameSave.extend('capture','campaign.foundation',function(capture){const d=capture();d.campaign031=domain.capture();return d;});
  GameSave.extend('decode','campaign.foundation',function(decode,raw){const d=decode(raw);domain.validate(d.campaign031);return d;});
  GameSave.extend('restore','campaign.foundation',function(restore,d){domain.validate(d.campaign031);const result=restore(d);domain.restore(d.campaign031);lastFacts='';elapsed=0;window.CommandCoreUI?.reset();return result;});
  GameState.register('campaign',{capture:()=>domain.capture(),get status(){return domain.view();}}, {source:'campaign/runtime.js',saved:['campaign031'],transient:['fact signature','UI listeners']});
  return Object.freeze({definitions:CampaignDefinitions,capture:domain.capture,validate:domain.validate,view:domain.view,execute:command=>GameFlow.paused?{ok:false,reason:'campaign.reason.paused'}:domain.execute(command),refresh,tick,migrate,access,powerId,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    baseSummary(){const a=V09Power.allocation();return {running:V09Power.running&&V09Power.fuel>0,fuel:V09Power.fuel,battery:V010Energy.battery.charge,capacity:V010Energy.battery.capacity,load:a.load,supply:a.supply,corePowered:a.served.has(powerId),day:WorldClock.day};}});
})();
