/* Team-owned historical milestones; no duplicated HP, power or production.
   Observed independently of Core UI so early actions survive ordering/reload.
   Only the New Game factory opts a world into this content profile. */
window.GameChapterOne=(()=>{
 const copy=v=>JSON.parse(JSON.stringify(v)),keys=['tools','fuel','tank','power','core','storage','supplies','workbenchCrafted','workbenchPlaced','hammer','pickaxe','axe'];
 function fresh(enabled=false){return {schema:2,recovered:{wood:0,iron:0,stone:0},preset:enabled?ChapterOnePreset.id:null,seen:Object.fromEntries(keys.map(k=>[k,false])),repaired:[],nightStartDay:null,nightSurvived:false};}
 let state=fresh(),previousTime=null;
 const active=()=>[ChapterOnePreset.id,PreviousChapterOnePreset.id,LegacyChapterOnePreset.id].includes(state.preset);
 const preset=()=>state.preset===LegacyChapterOnePreset.id?LegacyChapterOnePreset:ChapterOnePreset;
 const time=()=>WorldClock.day*1440+WorldClock.minute;
 function mark(key){if(!active()||state.seen[key])return false;state.seen[key]=true;queueGameSave();return true;}
 function observe(){
   if(!active()||GameSave.restoring||GameFlow.paused)return;
   const owned=type=>[...bag,...V013Inventory.items,...storageChests.slice(0,8).flatMap(c=>c.items)].some(s=>s?.type===type&&s.qty>0);
   if(['axe','pickaxe','hammer'].every(owned))mark('tools');
   for(const key of ['hammer','pickaxe','axe'])if(owned(key)||(V010Progression.state.byResource.produced[key]||0)>0)mark(key);
   for(const r of GameEquipment.capture())if(r.typeId==='utility_workbench'){mark('workbenchCrafted');if(r.placement==='installed')mark('workbenchPlaced');}
   if(Object.entries({wood:12,iron:10,stone:10}).every(([k,n])=>state.recovered[k]>=n))mark('supplies');
   if(bagCount('fuel')>0)mark('fuel');
   if(V09Power.fuel>0){mark('fuel');mark('tank');}
   if(V09Power.running&&V09Power.fuel>0&&devicePowered(GameCampaign.powerId))mark('power');
   reconcileRepairs();
 }
 // Keep only the minimum bootstrap budget available. Extra resources remain
 // freely spendable; paid jobs count, so batching/cancel/refund cannot bypass it.
 function spendAllowed(input,batches=1,output){
   if(![ChapterOnePreset.id,PreviousChapterOnePreset.id].includes(state.preset))return true;
   const q=V09Craft.craftQueue.capture(),jobs=Object.values(V09Craft.capture().jobs).filter(Boolean).concat(Object.values(q.queues).flat());
   const has=type=>(V010Progression.state.byResource.produced[type]||0)>0||[...bag,...V013Inventory.items,...storageChests.flatMap(c=>c.items)].some(s=>s?.type===type)||jobs.some(j=>V09Craft.recipes[j.recipe]?.output===type);
   const missing=['hammer','pickaxe','axe'].filter(type=>!has(type)&&type!==output).length;
   const needBench=output!=='utility_workbench'&&!GameEquipment.records.some(r=>r.typeId==='utility_workbench');
   return ['wood','iron'].every(type=>!(input[type]>0)||V010Inventory.materialCount(type)-(input[type]||0)*batches>=missing*2+(needBench?(type==='wood'?6:4):0));
 }
 function confirmRepair(id){
   if(!active()||!preset().criticalRepairs.includes(id)||state.repaired.includes(id))return false;
   const o=V018Build.record(id)?.object;if(!o||(state.preset===LegacyChapterOnePreset.id?o.hp<o.maxHp:V018Build.isBroken(id)))return false;
   state.repaired.push(id);queueGameSave();return true;
 }
 function reconcileRepairs(){if(!active()||GameSave.restoring)return;for(const id of preset().criticalRepairs)confirmRepair(id);}
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
 function recordAction(action,r){if(!active())return;if(r?.typeId==='utility_workbench'){mark('storage');mark('supplies');mark(action==='placed'?'workbenchPlaced':'workbenchCrafted');}}
 function visitStorage(index){if(!active()||index!==0||!GameEquipmentRuntime.access(GameActors.local,GameEquipment.get('chest0')))return false;return mark('storage');}
 function transferStorage(from,to,type,qty){if(!active()||from!==0||to!=='bag'||!Object.hasOwn(state.recovered,type))return;state.recovered[type]=Math.min(1000,state.recovered[type]+Math.max(0,qty));mark('storage');observe();queueGameSave();}
 function facts(){reconcileRepairs();return {c1Storage:state.seen.storage,c1Supplies:state.seen.supplies,c1WorkbenchCrafted:state.seen.workbenchCrafted,c1WorkbenchPlaced:state.seen.workbenchPlaced,c1Hammer:state.seen.hammer,c1Pickaxe:state.seen.pickaxe,c1Axe:state.seen.axe,c1Tools:state.seen.tools,c1Fuel:state.seen.fuel,c1Tank:state.seen.tank,c1Power:state.seen.power,c1Core:state.seen.core,c1Concrete:V010Progression.state.byResource.produced.concrete||0,c1Repairs:state.repaired.length,c1Night:state.nightSurvived};}
 function validate(d){
   const s=d.chapter034,fail=()=>{throw Error('Invalid Chapter 1 state');};
   if(!s||Object.keys(s).sort().join()!=='nightStartDay,nightSurvived,preset,recovered,repaired,schema,seen'||s.schema!==2||![null,ChapterOnePreset.id,PreviousChapterOnePreset.id,LegacyChapterOnePreset.id].includes(s.preset)||!s.seen||Object.keys(s.seen).sort().join()!==keys.slice().sort().join()||keys.some(k=>typeof s.seen[k]!=='boolean')||!Array.isArray(s.repaired)||new Set(s.repaired).size!==s.repaired.length||s.repaired.some(id=>!(s.preset===LegacyChapterOnePreset.id?LegacyChapterOnePreset:ChapterOnePreset).criticalRepairs.includes(id))||typeof s.nightSurvived!=='boolean'||s.nightStartDay!==null&&(!Number.isSafeInteger(s.nightStartDay)||s.nightStartDay<1||s.nightStartDay>d.lighting016.day))fail();
   if(!s.recovered||Object.keys(s.recovered).sort().join()!=='iron,stone,wood'||Object.values(s.recovered).some(n=>!Number.isInteger(n)||n<0||n>1000))fail();
   if(s.preset===ChapterOnePreset.id?d.campaign031?.contentRevision!==6:s.preset===PreviousChapterOnePreset.id?d.campaign031?.contentRevision!==5:s.preset===LegacyChapterOnePreset.id?d.campaign031?.contentRevision!==4:[4,5,6].includes(d.campaign031?.contentRevision))fail();
   if(s.preset===null&&(keys.some(k=>s.seen[k])||s.repaired.length||s.nightStartDay!==null||s.nightSurvived))fail();
   if(s.nightStartDay!==null&&d.lighting016.day*1440+d.lighting016.minute<s.nightStartDay*1440+ChapterOnePreset.nightStart)fail();
   if(s.nightSurvived&&(s.nightStartDay===null||d.lighting016.day*1440+d.lighting016.minute<(s.nightStartDay+1)*1440+ChapterOnePreset.nightEnd))fail();return true;
 }
 function migrate(d){const s=fresh(false);s.schema=1;delete s.recovered;for(const k of keys.slice(5))delete s.seen[k];d.chapter034=s;}
 function migrateCorrective(d){const s=d.chapter034;if(!s||s.schema!==1)throw Error('Missing Chapter state');s.schema=2;s.recovered={wood:0,iron:0,stone:0};for(const k of keys)s.seen[k]??=false;}
 GameSave.extend('capture','campaign.chapter-one',function(previous){reconcileRepairs();const d=previous();d.chapter034=copy(state);return d;});
 GameSave.extend('decode','campaign.chapter-one',function(previous,raw){const d=previous(raw);validate(d);return d;});
 GameSave.extend('restore','campaign.chapter-one',function(previous,d){validate(d);const result=previous(d);state=copy(d.chapter034);previousTime=time();window.CommandCoreUI?.reset();return result;});
 GameState.register('chapterOne',{capture:()=>copy(state)},{source:'campaign/chapter-one.js',saved:['chapter034'],transient:['previous clock sample']});
 return Object.freeze({fresh,migrate,migrateCorrective,validate,observe,visit,facts,onDeath,recordAction,visitStorage,transferStorage,spendAllowed,confirmRepair,reconcileRepairs,get active(){return active();}});
})();
