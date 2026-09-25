/* Local authority adapter. Unlocks observe existing monotonic milestones;
   archives never spend research data or issue items, recipes or chapters. */
window.GameStory=(()=>{
  let sequence=0,lastSignature='',researchEpoch=-1,researchCount=0;
  function savedFacts(d){return {'story.context':true,'story.field_notes':d.research036?.packets?.some(p=>p.sourceId==='source.field_notes')===true,'story.core_visited':d.chapter034?.seen?.core===true,'story.research_count':d.research036?.completed?.length||0,'story.chapter_one_complete':d.campaign031?.completed?.includes('chapter_1')===true};}
  function facts(){if(researchEpoch!==GameResearch.epoch){researchEpoch=GameResearch.epoch;researchCount=GameResearch.capture().completed.length;}return {'story.context':true,'story.field_notes':GameExploration.facts()['expedition.field_notes'],'story.core_visited':GameChapterOne.facts().c1Core===true,'story.research_count':researchCount,'story.chapter_one_complete':GameCampaign.view().completed.includes('chapter_1')};}
  const domain=StoryDomain.create(StoryDefinitions,{coreId:BunkerLayout.core.id,initialActorId:GameActors.localId,facts,actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access:(a,id)=>GameCampaign.access(a,id,true),changed(){queueGameSave();}});
  function refresh(){if(GameSave.restoring)return false;const f=facts(),s=JSON.stringify(f);if(s===lastSignature)return false;lastSignature=s;return domain.refresh(f);}
  function execute(c){if(GameSave.restoring)return {ok:false,reason:'story.error.paused'};if(c?.action!=='finish_intro'&&GameFlow.paused&&!GameFlow.reasons.includes('story:local'))return {ok:false,reason:'story.error.paused'};return domain.execute(c);}
  function request(action,payload,revision=domain.revision){return execute({actorId:GameActors.localId,instanceId:BunkerLayout.core.id,action,payload,expectedRevision:revision,requestId:'story:'+revision+':'+(++sequence)});}
  function migrate(d){if(d.story037)throw Error('Unexpected story state in old save');d.story037=domain.fresh('legacy',d.identity027?.playerId||'player:1',savedFacts(d));}
  function validate(d){if(!d.story037)throw Error('Missing story owner');return domain.validate(d.story037,savedFacts(d));}
  GameSave.extend('capture','story.archive',function(previous){const d=previous();d.story037=domain.capture();return d;});
  GameSave.extend('decode','story.archive',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','story.archive',function(previous,d){validate(d);window.StoryPlayer?.cancel();const out=previous(d);domain.restore(d.story037,savedFacts(d));lastSignature='';return out;});
  GameState.register('story',{capture:domain.capture},{source:'story/runtime.js',saved:['story037'],transient:['presentation','request sequence','subscribers']});
  GameResearch.subscribe(refresh);GameCampaign.subscribe(refresh);
  return Object.freeze({definitions:StoryDefinitions,fresh:domain.fresh,capture:domain.capture,validate,migrate,refresh,execute,request,subscribe:domain.subscribe,view:(id=GameActors.localId)=>domain.view(id),get epoch(){return domain.epoch;},get revision(){return domain.revision;}});
})();
