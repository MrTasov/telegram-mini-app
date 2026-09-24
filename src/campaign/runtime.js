/* Existing owners remain authoritative. Core uses the existing power allocator;
   the campaign adds no second Research system and never gates old recipes. */
window.GameCampaign=(()=>{
  const core={...BunkerLayout.core,...GameFootprints.body(BunkerLayout.core.id)},powerId='command_core_l1';
  registerPowerDevice(powerId,'corridor',.05,()=>true,I18n.t('bunker.core.name'));
  function facts(){return {generatorRunning:V09Power.running&&V09Power.fuel>0,corePowered:devicePowered(powerId),mined:V010Progression.count('mined'),
    woodStored:storageChests.slice(0,8).reduce((n,c)=>n+c.items.reduce((q,s)=>q+(s?.type==='wood'?s.qty:0),0),0),
    ironProduced:V010Progression.state.byResource.produced.iron||0,batteryCharge:V010Energy.battery.charge,
    copperProduced:V010Progression.state.byResource.produced.copper||0,
    medicalStored:storageChests.slice(0,8).reduce((n,c)=>n+c.items.reduce((q,s)=>q+(s?.type==='meds'?s.qty:0),0),0),
    droneReady:!V014Robots.state.packed&&V014Robots.state.hp>0&&V014Robots.state.battery>=20,
    workshopLit:devicePowered('light_workshop'),
    perimeterCondition:Math.min(1,...V015Base.sections.filter(s=>['outer','inner'].includes(s.group)).map(s=>s.hp/s.maxHp)),...window.GameChapterOne?.facts()};}
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
  const ports={facts,actor:id=>GameActors.get(id),permission:actor=>!!GameActors.get(actor.id),access,
    changed(){queueGameSave();for(const fn of listeners)fn();},emit:event=>V010.emit('campaign',event)};
  const legacyDomain=GameCampaignDomain.create(CampaignDefinitions,ports),chapterOneDomain=GameCampaignDomain.create(ChapterOneDefinitions,ports),previousChapterOneDomain=GameCampaignDomain.create(LegacyChapterOneDefinitions,ports);
  let domain=legacyDomain;
  const owner=s=>s?.contentRevision===ChapterOneDefinitions.revision?chapterOneDomain:s?.contentRevision===LegacyChapterOneDefinitions.revision?previousChapterOneDomain:legacyDomain;
  function refresh(force=false){
    window.GameChapterOne?.observe();
    const f=facts(),signature=Object.values(f).join('|');
    if(force||signature!==lastFacts){lastFacts=signature;domain.refresh(f);for(const fn of listeners)fn();}
    return domain.view();
  }
  function tick(dt){
    if(GameFlow.paused)return;
    elapsed+=Math.max(0,Number(dt)||0);if(elapsed<250)return;elapsed%=250;refresh();
    window.CommandCoreUI?.tick();
  }
  V010.on('mined',()=>{if(!GameSave.restoring&&!GameFlow.paused)refresh();});
  V010.on('produced',()=>{if(!GameSave.restoring&&!GameFlow.paused)refresh();});
  const oldPowerChanged=v09PowerChanged;
  v09PowerChanged=function(){oldPowerChanged();if(!GameSave.restoring&&!GameFlow.paused)refresh();};
  const oldUpdate=update;
  update=function(){oldUpdate();tick(16.667*frameScale);};
  function migrate(d){
    if(!d.campaign031)d.campaign031=legacyDomain.fresh('legacy',{mined:d.v010?.modules?.progression?.counts?.mined||0});
    if(d.v09?.power?.deviceEnabled&&!Object.hasOwn(d.v09.power.deviceEnabled,powerId))d.v09.power.deviceEnabled[powerId]=true;
  }
  GameSave.extend('capture','campaign.foundation',function(capture){const d=capture();d.campaign031=domain.capture();return d;});
  function contentMigration(d){if(d.campaign031?.contentRevision<CampaignDefinitions.revision)d.campaign031=legacyDomain.migrate(d.campaign031,{mined:d.v010?.modules?.progression?.counts?.mined||0,ironProduced:d.v010?.modules?.progression?.byResource?.produced?.iron||0,copperProduced:d.v010?.modules?.progression?.byResource?.produced?.copper||0});owner(d.campaign031).validate(d.campaign031);return d;}
  GameSave.extend('decode','campaign.foundation',function(decode,raw){return contentMigration(decode(raw));});
  GameSave.extend('restore','campaign.foundation',function(restore,d){owner(d.campaign031).validate(d.campaign031);const result=restore(d);domain=owner(d.campaign031);domain.restore(d.campaign031);lastFacts='';elapsed=0;window.CommandCoreUI?.reset();return result;});
  GameState.register('campaign',{capture:()=>domain.capture(),get status(){return domain.view();}}, {source:'campaign/runtime.js',saved:['campaign031'],transient:['fact signature','UI listeners']});
  return Object.freeze({get definitions(){return domain.definitions;},freshChapterOne:()=>chapterOneDomain.fresh(),capture:()=>domain.capture(),validate:s=>owner(s).validate(s),view:()=>domain.view(),execute:command=>GameFlow.paused?{ok:false,reason:'campaign.reason.paused'}:domain.execute(command),refresh,tick,migrate,access,powerId,
    facts,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    baseSummary(){const a=V09Power.allocation();return {running:V09Power.running&&V09Power.fuel>0,fuel:V09Power.fuel,battery:V010Energy.battery.charge,capacity:V010Energy.battery.capacity,load:a.load,supply:a.supply,corePowered:a.served.has(powerId),day:WorldClock.day};}});
})();
