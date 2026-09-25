/* Local adapter: campaign-owned research over existing actors, physical Core,
   manufacturing, placement and enhancement. No second crafting implementation. */
window.GameResearch=(()=>{
  let sequence=0;
  function facts(){const result={'base.core_powered':devicePowered(GameCampaign.powerId),'base.drone_station':GameEquipment.records.some(r=>r.typeId==='drone_station'&&GameEquipment.present(r.id)),'campaign.chapter_one_complete':GameCampaign.view().completed.includes('chapter_1')};for(const id of Object.keys(V010Progression.TECH))result['legacy.'+id]=V010Progression.isLegacyUnlocked(id);for(const site of ExplorationDefinitions.sites)result['world.'+site.id]=window.GameExploration?.siteKnown(site.id)===true;return result;}
  const domain=ResearchDomain.create(ResearchDefinitions,{coreId:BunkerLayout.core.id,initialProfile:'legacy',facts,actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access:(a,id)=>GameCampaign.access(a,id,true),sourceAccess:(a,s)=>window.GameExploration?.sourceAccess(a,s)||{available:false,reason:'exploration.error.access'},changed(){queueGameSave();}});
  function execute(command){return GameFlow.paused||GameSave.restoring?{ok:false,reason:'research.error.paused',revision:domain.revision}:domain.execute(command);}
  function request(action,payload,revision=domain.revision){return execute({actorId:GameActors.localId,instanceId:action==='obtain'&&ResearchDefinitions.sources.find(s=>s.id===payload?.sourceId)?.kind==='exploration'?payload.sourceId:BunkerLayout.core.id,action,payload,expectedRevision:revision,requestId:'research:'+revision+':'+(++sequence)});}
  function migrate(d){if(d.research036)throw Error('Unexpected research owner in old save');d.research036=domain.fresh('legacy');}
  function validate(d){if(!d.research036)throw Error('Missing research owner');const f={'campaign.chapter_one_complete':d.campaign031?.completed?.includes('chapter_1')===true};for(const id of Object.keys(V010Progression.TECH))f['legacy.'+id]=d.v010?.modules?.progression?.unlocks?.includes(id)===true;for(const site of ExplorationDefinitions.sites)f['world.'+site.id]=d.sectors038?.sites?.includes(site.id)===true;return domain.validate(d.research036,f);}
  GameSave.extend('capture','research.foundation',function(previous){const d=previous();d.research036=domain.capture();return d;});
  GameSave.extend('decode','research.foundation',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','research.foundation',function(previous,d){validate(d);const out=previous(d);domain.restore(d.research036,{'campaign.chapter_one_complete':d.campaign031?.completed?.includes('chapter_1')===true,...Object.fromEntries(Object.keys(V010Progression.TECH).map(id=>['legacy.'+id,d.v010?.modules?.progression?.unlocks?.includes(id)===true])),...Object.fromEntries(ExplorationDefinitions.sites.map(site=>['world.'+site.id,d.sectors038.sites.includes(site.id)]))});return out;});
  GameState.register('research',{capture:domain.capture},{source:'research/runtime.js',saved:['research036'],transient:['request sequence','view subscribers']});
  return Object.freeze({definitions:ResearchDefinitions,capture:domain.capture,fresh:domain.fresh,validate,migrate,execute,request,facts:domain.facts,availability:domain.availability,sourceAvailability:domain.sourceAvailability,hasTechnology:domain.hasTechnology,subscribe:domain.subscribe,get revision(){return domain.revision;},get epoch(){return domain.epoch;}});
})();

window.GameAvailability=(()=>{
  const d=ResearchDefinitions;
  // These conditions are content data attached once. Recipe execution and UI
  // read exactly the same rule; queued paid jobs retain their prior contract.
  for(const [id,condition]of Object.entries(d.bindings.recipes)){if(!V09Craft.recipes[id])throw Error('Unknown gated recipe');V09Craft.recipes[id].availability=condition;}
  for(const t of d.technologies){for(const id of t.buildables)if(!EquipmentInstances.placement[id]?.craftable)throw Error('Unknown gated buildable');for(const id of t.recipes)if(!V09Craft.recipes[id])throw Error('Unknown technology recipe');for(const id of t.droneModules)if(!Object.hasOwn(V014Robots.definition.modules,id))throw Error('Unknown drone module');}
  const evaluate=c=>c?GameConditions.evaluate(c,GameResearch.facts()):{available:true,reason:null};
  const legacy=id=>V010Progression.isLegacyUnlocked(id)||!!d.legacyBindings[id]&&GameResearch.hasTechnology(d.legacyBindings[id]);
  function recipe(r){if(!r)return {available:false,reason:'research.error.unknown'};if(r.unlock&&!legacy(r.unlock))return {available:false,reason:'research.error.legacy'};return evaluate(r.availability);}
  return Object.freeze({recipe,legacy,buildable:id=>evaluate(d.bindings.buildables[id]),droneModule:key=>evaluate(d.bindings.droneModules[key])});
})();
