/* Team-owned historical milestones; no duplicated HP, power or production.
   Observed independently of Core UI so early actions survive ordering/reload.
   Only the New Game factory opts a world into this content profile. */
window.GameChapterOne=(()=>{
 const copy=v=>JSON.parse(JSON.stringify(v)),keys=['tools','fuel','tank','power','core'];
 function fresh(enabled=false){return {schema:1,preset:enabled?ChapterOnePreset.id:null,seen:Object.fromEntries(keys.map(k=>[k,false])),repaired:[],nightStartDay:null,nightSurvived:false};}
 let state=fresh(),previousTime=null;
 const active=()=>state.preset===ChapterOnePreset.id;
 const time=()=>WorldClock.day*1440+WorldClock.minute;
 function mark(key){if(!active()||state.seen[key])return false;state.seen[key]=true;queueGameSave();return true;}
 function observe(){
   if(!active()||GameSave.restoring||GameFlow.paused)return;
   const owned=type=>[...bag,...V013Inventory.items,...storageChests.slice(0,8).flatMap(c=>c.items)].some(s=>s?.type===type&&s.qty>0);
   if(['axe','pickaxe','hammer'].every(owned))mark('tools');
   if(bagCount('fuel')>0)mark('fuel');
   if(V09Power.fuel>0){mark('fuel');mark('tank');}
   if(V09Power.running&&V09Power.fuel>0&&devicePowered(GameCampaign.powerId))mark('power');
   for(const id of ChapterOnePreset.criticalRepairs){const r=V018Build.record(id)?.object;if(r?.hp>=r?.maxHp&&!state.repaired.includes(id)){state.repaired.push(id);queueGameSave();}}
 }
 function visit(actorId,targetId){
   if(!active()||GameFlow.paused||GameSave.restoring)return false;
   const actor=GameActors.get(actorId);if(actorId!==GameActors.localId||!GameCampaign.access(actor,targetId).available)return false;
   observe();const changed=mark('core');if(changed)GameCampaign.refresh(true);return true;
 }
 function onDeath(){if(active()&&state.nightStartDay!==null&&!state.nightSurvived){state.nightStartDay=null;queueGameSave();}}
 WorldClock.onChange(()=>{
   const now=time(),before=previousTime;previousTime=now;
   if(!active()||GameSave.restoring||GameFlow.paused||state.nightSurvived)return;
   if(playerDead||player.health<=0){onDeath();return;}
   // Clock restore/jumps are not survival. Legitimate simulation is capped to
   // one second per WorldClock.advance; hidden/offline time cannot skip a night.
   if(before===null||now<before||now-before>1.200001){onDeath();return;}
   const sunset=WorldClock.day*1440+ChapterOnePreset.nightStart;
   if(state.nightStartDay===null&&before<sunset&&now>=sunset){state.nightStartDay=WorldClock.day;queueGameSave();}
   if(state.nightStartDay!==null&&now>=(state.nightStartDay+1)*1440+ChapterOnePreset.nightEnd){state.nightSurvived=true;queueGameSave();GameCampaign.refresh(true);}
 });
 function facts(){return {c1Tools:state.seen.tools,c1Fuel:state.seen.fuel,c1Tank:state.seen.tank,c1Power:state.seen.power,c1Core:state.seen.core,c1Concrete:V010Progression.state.byResource.produced.concrete||0,c1Repairs:state.repaired.length,c1Night:state.nightSurvived};}
 function validate(d){
   const s=d.chapter034,fail=()=>{throw Error('Invalid Chapter 1 state');};
   if(!s||Object.keys(s).sort().join()!=='nightStartDay,nightSurvived,preset,repaired,schema,seen'||s.schema!==1||![null,ChapterOnePreset.id].includes(s.preset)||!s.seen||Object.keys(s.seen).sort().join()!==keys.slice().sort().join()||keys.some(k=>typeof s.seen[k]!=='boolean')||!Array.isArray(s.repaired)||new Set(s.repaired).size!==s.repaired.length||s.repaired.some(id=>!ChapterOnePreset.criticalRepairs.includes(id))||typeof s.nightSurvived!=='boolean'||s.nightStartDay!==null&&(!Number.isSafeInteger(s.nightStartDay)||s.nightStartDay<1||s.nightStartDay>d.lighting016.day))fail();
   if((s.preset!==null)!==(d.campaign031?.contentRevision===ChapterOneDefinitions.revision))fail();
   if(s.preset===null&&(keys.some(k=>s.seen[k])||s.repaired.length||s.nightStartDay!==null||s.nightSurvived))fail();
   if(s.nightStartDay!==null&&d.lighting016.day*1440+d.lighting016.minute<s.nightStartDay*1440+ChapterOnePreset.nightStart)fail();
   if(s.nightSurvived&&(s.nightStartDay===null||d.lighting016.day*1440+d.lighting016.minute<(s.nightStartDay+1)*1440+ChapterOnePreset.nightEnd))fail();return true;
 }
 function migrate(d){d.chapter034=fresh(false);}
 GameSave.extend('capture','campaign.chapter-one',function(previous){const d=previous();d.chapter034=copy(state);return d;});
 GameSave.extend('decode','campaign.chapter-one',function(previous,raw){const d=previous(raw);validate(d);return d;});
 GameSave.extend('restore','campaign.chapter-one',function(previous,d){validate(d);const result=previous(d);state=copy(d.chapter034);previousTime=time();window.CommandCoreUI?.reset();return result;});
 GameState.register('chapterOne',{capture:()=>copy(state)},{source:'campaign/chapter-one.js',saved:['chapter034'],transient:['previous clock sample']});
 return Object.freeze({fresh,migrate,validate,observe,visit,facts,onDeath,get active(){return active();}});
})();
