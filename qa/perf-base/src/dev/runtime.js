/* Local QA authority over the released owners. Never a second simulation.
   Opening is read-only; activation forks a separate, permanently marked slot. */
window.GameDevQA=(()=>{
 const copy=v=>JSON.parse(JSON.stringify(v)),rawNow=performance.now.bind(performance),STEP=16.667;
 let enabled=false,restoring=false,state=null,serial=0,rate=1,target=null,stepMs=0,installedClock=false,virtual=0,offset=0;
 let stats={updateMs:0,steps:0,simulatedMs:0,actualRate:1},lastFrameRaw=rawNow();
 const fresh=()=>({schema:1,label:'DEV/TEST',sourceSlot:GameState.session.activeSlot||null,commands:{revision:0,receipts:[]},enemies:[],events:{}});
 const authorized=()=>!!state&&(enabled||restoring);
 function startClock(){if(!installedClock){Object.defineProperty(performance,'now',{configurable:true,value:()=>enabled?virtual:rawNow()+offset});installedClock=true;}virtual=rawNow()+offset;lastFrameRaw=rawNow();}
 function stopClock(){if(installedClock)offset=virtual-rawNow();rate=1;target=null;stepMs=0;}
 function disable(){if(enabled)stopClock();enabled=false;window.GameDevUI?.refresh();}
 const catalog={resources:()=>Object.keys(ITEM).filter(t=>!ITEM[t].deployable&&t!==GameCarried.TYPE&&!['drone014','base_lamp'].includes(t)&&!EquipmentInstances.definitions[t]),buildables:()=>Object.keys(GamePlacement.rules)};
 function validate(s){if(s===undefined)return true;
  if(!s||Object.keys(s).sort().join()!=='commands,enemies,events,label,schema,sourceSlot'||s.schema!==1||s.label!=='DEV/TEST'||s.sourceSlot!==null&&(!Number.isInteger(s.sourceSlot)||s.sourceSlot<1||s.sourceSlot>5)||!Array.isArray(s.enemies)||s.enemies.length>144||new Set(s.enemies).size!==s.enemies.length||s.enemies.some(id=>typeof id!=='string'||!/^enemy:\d+$/.test(id))||!s.events||Array.isArray(s.events)||Object.entries(s.events).some(([id,v])=>!WorldEvents.definitions().some(d=>d.id===id)||typeof v!=='boolean'))throw Error('Invalid DEV/TEST save');
  commands.validate(s.commands);return true;
 }
 const capture=()=>state?{...copy(state),enemies:state.enemies.filter(id=>zombies.some(z=>z.instanceId===id)),commands:commands.capture()}:undefined;
 function enable(){
  if(!GameState.session.ready||MainMenu.active||GameFlow.paused||GameSave.restoring)return {ok:false,reason:'session'};
  if(!state){
   if(!v09FreeSlot())return {ok:false,reason:'slots'};
   const d=captureGameProgress();d.devQA0401=fresh();d.saveName=('DEV/TEST · '+(d.saveName||'LAST BASE')).slice(0,V091_SAVE_NAME_MAX);
   // Import allocates a free slot and validates before touching the original.
   if(!v09ImportSave(JSON.stringify(d)))return {ok:false,reason:'copy'};
  }
  try{startClock();enabled=true;}catch(_){return {ok:false,reason:'clock'};}
  window.GameDevUI?.refresh();return {ok:true,slot:GameState.session.activeSlot};
 }
 function commitSnapshot(d){
  d.devQA0401=capture();const valid=decodeGameProgress(JSON.stringify(d)),was=enabled;
  restoreGameProgress(valid);if(was){startClock();enabled=true;}return true;
 }
 function chapter(d,id){
  const defs=GameCampaign.definitions;if(!defs.chapters.some(c=>c.id===id))throw Error('chapter');
  if(d.campaign031.activeChapter===id)return;
  if(d.campaign031.completed.includes(id))throw Error('backward');
  const facts={};for(const c of defs.chapters)for(const o of c.objectives){const k=o.condition;facts[k.fact]=k.equals??Math.max(k.atLeast||0,1000000);}
  const actor=GameActors.local,domain=GameCampaignDomain.create(defs,{facts:()=>facts,actor:()=>actor,permission:()=>true,access:()=>({available:true})});domain.restore(d.campaign031);
  for(let i=0;i<defs.chapters.length&&domain.view().chapter!==id;i++){
   for(let pass=0;pass<=defs.chapters.find(c=>c.id===domain.view().chapter).objectives.length;pass++){domain.refresh();const view=domain.view();for(const o of defs.chapters.find(c=>c.id===view.chapter).objectives)if(o.semantics==='after'&&view.objectives[o.id]?.active&&!view.objectives[o.id].done)facts[o.condition.fact]=Math.max(facts[o.condition.fact]||0,view.objectives[o.id].baseline+(o.condition.atLeast||1));}domain.refresh();const v=domain.view(),r=domain.execute({type:'ADVANCE_CHAPTER',actorId:actor.id,targetId:BunkerLayout.core.id,chapterId:v.chapter,expectedRevision:v.revision,requestId:'qa-chapter:'+v.revision+':'+(++serial)});if(!r.ok)throw Error('chapter');
  }
  d.campaign031=domain.capture();
 }
 function research(action,id){
  const d=captureGameProgress(),actor=GameActors.local;
  if(action==='blueprint'&&!ResearchDefinitions.blueprints.some(b=>b.id===id)||action==='research'&&!ResearchDefinitions.research.some(b=>b.id===id))return {ok:false,reason:'selection'};
  let domain;const facts=()=>({...GameResearch.facts(),...Object.fromEntries(ResearchDefinitions.facts.filter(k=>k.startsWith('base.')).map(k=>[k,true])),'campaign.chapter_one_complete':d.campaign031.completed.includes('chapter_1')});
  domain=ResearchDomain.create(ResearchDefinitions,{coreId:BunkerLayout.core.id,facts,actor:()=>actor,authorized:()=>true,access:()=>({available:true}),sourceAccess:()=>({available:true})});domain.restore(d.research036,facts());
  const exec=(a,p)=>{const r=domain.execute({actorId:actor.id,instanceId:BunkerLayout.core.id,action:a,payload:p,expectedRevision:domain.revision,requestId:'qa-research:'+domain.revision+':'+(++serial)});if(!r.ok)throw Error(r.reason);};
  function submit(source){
   if(source.kind==='exploration')throw Error('source');
   if(!GameConditions.evaluate(source.requires,domain.facts(facts())).available){chapter(d,'base_restored');}
   const p=domain.capture().packets.find(p=>p.sourceId===source.id);if(p?.status==='submitted')return;
   if(!p)exec('obtain',{sourceId:source.id});exec('submit',{sourceId:source.id});
  }
  function blueprint(bp){if(domain.capture().blueprints.includes(bp))return;const s=ResearchDefinitions.sources.find(s=>s.kind!=='exploration'&&s.blueprints.includes(bp));if(!s)throw Error('source');submit(s);}
  try{
   if(action==='blueprint')blueprint(id);
   else {const r=ResearchDefinitions.research.find(r=>r.id===id),a=domain.availability(id);if(!a.completed&&!a.entitled){r.blueprints.forEach(blueprint);for(const s of ResearchDefinitions.sources.filter(s=>s.kind!=='exploration')){if(domain.capture().data>=r.cost)break;submit(s);}exec('research',{researchId:id});}}
   d.research036=domain.capture();commitSnapshot(d);return {ok:true};
  }catch(_){return {ok:false,reason:'prerequisite'};}
 }
 function grant(type){const rule=GamePlacement.rules[type];if(!rule)return {ok:false,reason:'selection'};
  if(GameCarried.free()<0)return {ok:false,reason:'inventory'};
  if(GameEquipment.ids.length>=192||GameEquipment.records.filter(r=>r.typeId===type).length>=rule.limit)return {ok:false,reason:'limit'};
  const r=GameEquipment.create(type,GamePlacement.centered(type,rule.rooms[0],1900,480),GameActors.localId,type==='storage_crate'?storageChests.length:undefined);
  GameEquipment.validate(GameEquipment.capture().concat(r));if(type==='storage_crate')storageChests.push({name:'',icon:'📦',items:[]});GameEquipment.change(r);if(!GameCarried.add(r.id))throw Error('QA carried slot');V09Craft.syncInstances();GameMovable.sync();return {ok:true,instanceId:r.id};
 }
 const spawnCapacity=()=>144-zombies.filter(z=>z.alive).length;
 function spawn(n,type='mixed'){
  const kinds=Object.keys(V017Monsters.specs).sort((a,b)=>V017Monsters.specs[a].spawnOrder-V017Monsters.specs[b].spawnOrder);
  if(![1,10,25,50,80].includes(n)||type!=='mixed'&&!kinds.includes(type))return {ok:false,reason:'selection'};
  if(spawnCapacity()<n)return {ok:false,reason:'limit'};
  state.enemies=state.enemies.filter(id=>zombies.some(z=>z.instanceId===id));let added=0;for(let i=0;i<n;i++){const index=type==='mixed'?serial++:kinds.indexOf(type)+kinds.length*(++serial);const z=GameActivity.ground(()=>V017Monsters.spawn(index,true));if(!z)continue;if(zombies.length<144)zombies.push(z);else{const at=zombies.findIndex(old=>!old.alive);if(at<0)break;stopZombieAudio(zombies[at]);zombies[at]=z;}state.enemies.push(z.instanceId);added++;}
  return added?{ok:true,count:added}:{ok:false,reason:'space'};
 }
 function event(id,value){if(!WorldEvents.setQAEvent(id,value))return {ok:false,reason:'selection'};if(value===null)delete state.events[id];else state.events[id]=value;return {ok:true};}
 function power(){V09Power.fuel=V09Power.capacity;V010Energy.battery.charge=V010Energy.battery.capacity;V010Energy.battery.enabled=true;V09Power.running=GameEquipment.present('generator')&&GameEquipment.present('tank');v09PowerChanged();}
 function repair(){let done=0,skipped=0;for(const r of V018Build.structures.values()){
  if(r.scene!=='surface'&&!BunkerLayout.roomActive(r.object.room||'corridor'))continue;
  if(r.object.hp>=r.object.maxHp)continue;if(!r.object.hp&&V018Build.occupied(r)){skipped++;continue;}
  V015Base.health.restoreHP(r.object,r.object.maxHp);GameChapterOne.confirmRepair(r.id);done++;
 }for(const record of GameDefense.records()){if(record.placement!=='installed'||record.state.condition.hp>=record.state.condition.maxHp)continue;if(record.state.settings.fallen){skipped++;continue;}const next=copy(record);next.state.condition.hp=next.state.condition.maxHp;if(!GamePlacement.checkRecord(next,GameEquipment.capture()).ok){skipped++;continue;}GameEquipment.change(next);done++;}V015Base.changed();invalidateGeometry();GameCampaign.refresh(true);return {ok:true,count:done,skipped};}
 function stress(){
  if(scene!=='surface'||V013City.floor||player.wallLevel)return {ok:false,reason:'surface'};
  if(spawnCapacity()<50||GameCarried.free()<0)return {ok:false,reason:'limit'};
  const made=[];
  for(const type of ['automatic_turret','automatic_turret','heavy_turret']){
   const q=grant(type);if(!q.ok)continue;let placed=false;
   for(let y=280;y<980&&!placed;y+=100)for(let x=320;x<1320&&!placed;x+=100){const tr=GamePlacement.centered(type,'yard',x,y);if(!GamePlacement.check(q.instanceId,tr).ok)continue;placed=GamePlacement.request(q.instanceId,'place',tr).ok;}
   if(placed){const r=copy(GameEquipment.get(q.instanceId));r.state.settings.ammo=DefenseDefinitions.types[type].capacity;GameEquipment.change(r);V09Power.devices[r.refs.device].enabled=true;made.push(r.id);}
  }
  if(!made.length)return {ok:true,count:0,notice:'space'};
  power();event('day_x',true);const wave=spawn(50,'mixed');return {ok:true,count:wave.count||0,turrets:made.length};
 }
 function perform(c){const p=c.payload||{};
  switch(c.action){
   case 'resource': {if(!catalog.resources().includes(p.id)||![10,100,1000].includes(p.amount))return {ok:false,reason:'selection'};const left=addItem(p.id,p.amount);renderBag();renderQuickSlots();return left===p.amount?{ok:false,reason:'inventory'}:{ok:true,count:p.amount-left};}
   case 'buildable':return grant(p.id);
   case 'spawn':return spawn(p.count,p.type);
   case 'clear': {const tagged=new Set(state.enemies),before=zombies.length;for(const z of zombies)if(tagged.has(z.instanceId))stopZombieAudio(z);zombies=zombies.filter(z=>!tagged.has(z.instanceId));state.enemies=[];return {ok:true,count:before-zombies.length};}
   case 'attack': {if(!['normal','heavy'].includes(p.kind)||spawnCapacity()<(p.kind==='heavy'?50:25))return {ok:false,reason:'limit'};event('day_x',true);return spawn(p.kind==='heavy'?50:25,p.kind==='heavy'?'heavy':'mixed');}
   case 'event':return event(p.id,p.value);
   case 'heal':player.health=player.maxHealth||100;playerDead=false;closeOverlay(el('deathOverlay'));I18n.assign(el("healthText"),"textContent","❤️ "+Math.round(player.health)+"/"+Math.round(player.maxHealth||100));return {ok:true};
   case 'fuel':V09Power.fuel=V09Power.capacity;v09PowerChanged();return {ok:true};
   case 'battery':V010Energy.battery.charge=V010Energy.battery.capacity;v09PowerChanged();return {ok:true};
   case 'power':power();return {ok:true};
   case 'repair':return repair();
   case 'wall': {const r=V018Build.record(p.id);if(!r||r.kind!=='wall'||![.5,1].includes(p.fraction))return {ok:false,reason:'selection'};V018Build.damage(r.id,r.object.maxHp*p.fraction);return {ok:true};}
   case 'chapter': {const d=captureGameProgress();try{chapter(d,p.id);commitSnapshot(d);return {ok:true};}catch(_){return {ok:false,reason:'backward'};}}
   case 'research':case 'blueprint':return research(c.action,p.id);
   case 'speed':if(![1,10,50,'MAX'].includes(p.value))return {ok:false,reason:'selection'};rate=p.value;target=null;return {ok:true};
   case 'stop':rate=1;target=null;return {ok:true};
   case 'time': {const now=WorldClock.day*1440+WorldClock.minute;let to;
    if([60,360,1440].includes(p.minutes))to=now+p.minutes;
    else if(p.night===true)to=WorldClock.day*1440+1200+(WorldClock.minute>=1200?1440:0);
    else if(p.dayX===true)to=(Math.floor(WorldClock.day/WorldEvents.dayX.intervalDays)+1)*WorldEvents.dayX.intervalDays*1440;
    else if(Number.isInteger(p.day)&&p.day>=1&&p.day<=10000)to=p.day*1440;
    if(!Number.isFinite(to)||to<=now)return {ok:false,reason:'backward'};
    for(const id of Object.keys(state.events))event(id,null);target=to;rate='MAX';stopControls(true);return {ok:true,target:to};}
   case 'stress':return stress();
   default:return {ok:false,reason:'selection'};
  }
 }
 const commands=EquipmentCommands.create({get:id=>id==='qa'?{id}:null},{actor:id=>GameActors.get(id),authorized:a=>enabled&&!!state&&a.id===GameActors.localId,access:()=>GameState.session.ready&&!MainMenu.active&&!GameSave.restoring&&!document.hidden,perform,changed(){queueGameSave();window.GameDevUI?.refresh();}});
 function execute(c){if(!enabled||!state)return {ok:false,reason:'disabled'};if(GameFlow.paused&&!['heal','stop'].includes(c?.action))return {ok:false,reason:'paused'};return commands.execute(c);}
 const request=(action,payload={})=>execute({actorId:GameActors.localId,instanceId:'qa',requestId:'qa:'+commands.revision+':'+(++serial),expectedRevision:commands.revision,action,payload});
 const remainingMinutes=()=>target===null?0:(Math.floor(target/1440)-WorldClock.day)*1440+(target%1440-WorldClock.minute);
 function runFrame(tick){
  if(!enabled){tick();return;}if(GameFlow.paused)return;
  const start=rawNow(),realDelta=Math.max(1,start-lastFrameRaw);lastFrameRaw=start;
  const originalScale=frameScale,desired=rate==='MAX'?STEP*240:clamp(originalScale*STEP,1,50)*rate;let elapsed=0,steps=0;
  try{while(elapsed+1e-7<desired&&steps<240&&(steps===0||rawNow()-start<12)&&!GameFlow.paused){
   let ms=Math.min(STEP,desired-elapsed);if(target!==null){const left=remainingMinutes()*WorldClock.dayMs/1440;if(left<=.0001){if(left>0)WorldClock.advance(left+1e-7);target=null;rate=1;break;}ms=Math.min(ms,left);}
   virtual+=ms;stepMs=ms;frameScale=ms/STEP;
   if(firing&&rightAimActive&&!menuOpen&&!playerDead)shoot();tick();elapsed+=ms;steps++;
   if(target!==null&&WorldClock.day*1440+WorldClock.minute>=target-1e-7){const rest=remainingMinutes()*WorldClock.dayMs/1440;if(rest>0)WorldClock.advance(rest+1e-7);target=null;rate=1;break;}
  }}finally{const extra=Math.max(0,elapsed-realDelta);if(extra>0){for(const o of scavenges)if(o.searched&&o.searchedAt!==null)o.searchedAt=Math.max(0,o.searchedAt-extra);V091Loot.refresh();}stepMs=0;frameScale=originalScale;stats={updateMs:rawNow()-start,steps,simulatedMs:elapsed,actualRate:elapsed/realDelta};}
 }
 function metrics(){const living=zombies.filter(z=>z.alive),turrets=GameDefense.records().filter(r=>DefenseDefinitions.types[r.typeId].ammoType&&GameDefense.operational(r)&&devicePowered(r.refs.device));
  const off=z=>scene!=='surface'||!!V013City.floor||Math.hypot(z.x-player.x,z.y-player.y)>GameActivity.policy.actorRadius;
  return {...stats,enemies:living.length,activeEnemies:living.filter(z=>GameActivity.engaged(z,V017Monsters.state(z))).length,offZone:living.filter(off).length+turrets.filter(r=>off(GameDefense.pivot(r))).length,activeTurrets:turrets.length,rate,target};
 }
 GameSave.extend('capture','dev.qa',function(previous){const d=previous(),s=capture();if(s)d.devQA0401=s;return d;});
 GameSave.extend('decode','dev.qa',function(previous,raw){validate(JSON.parse(raw).devQA0401);const d=previous(raw);return d;});
 GameSave.extend('restore','dev.qa',function(previous,d){validate(d.devQA0401);disable();restoring=true;const old=state;try{
   for(const id of Object.keys(old?.events||{}))WorldEvents.setQAEvent(id,null);
   state=d.devQA0401?copy(d.devQA0401):null;commands.restore(state?.commands||{revision:0,receipts:[]});
   for(const [id,v]of Object.entries(state?.events||{}))WorldEvents.setQAEvent(id,v);
   const out=previous(d);window.GameDevUI?.refresh();return out;
  }finally{restoring=false;}});
 GameState.register('devQA',{capture},{source:'dev/runtime.js',saved:['devQA0401'],transient:['panel','enabled','speed','target time','performance metrics']});
 return Object.freeze({enable,disable,execute,request,authorized,capture,validate,catalog,runFrame,metrics,rawNow,get enabled(){return enabled;},get marked(){return !!state;},get revision(){return commands.revision;},get stepMs(){return stepMs;}});
})();
