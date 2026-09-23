/* One authoritative work phase for tool upgrades, animation, sound and yield.
   The existing tree/ore owners still own stock, capacity and regrowth. */
window.GameGathering=(()=>{
  let contact=null;
  const definition=type=>ITEM[type]?.gathering;
  const selected=type=>window.V010Inventory?.selectedItem(type)||null;
  function stats(item){const d=definition(item?.type);if(!d)return null;const s=V010Combat.getItemStats(item);return {yield:s.gatheringYield,speed:s.gatheringSpeed,duration:d.cycleMs/s.gatheringSpeed};}
  function phase(type){const a=AssetManifest.actors.modular.items[type].action;return a.durations.slice(0,a.impactFrame).reduce((n,v)=>n+v,0)/a.duration;}
  function start(type,id){const item=selected(type);if(!item||heldItem()!==type||GameFlow.paused)return null;V010Combat.ensure(item);contact=null;return {id,toolId:item.uid,actorId:GameActors.localId,elapsed:0,duration:stats(item).duration,at:Date.now(),impacted:false};}
  function valid(job,type){const item=selected(type);return !!(job&&item&&heldItem()===type&&job.actorId===GameActors.localId&&job.toolId===item.uid&&Math.abs(job.duration-stats(item).duration)<.001);}
  function sound(job,type,target){
    contact={job:{...job},type,target,x:player.x,y:player.y,scene,at:Date.now()};
    if(!GameSave.restoring&&!GameFlow.paused)playAnimationSound(type==='axe'?'chopWood':'mineRock','work',.52,1);
  }
  function advance(job,type,target,commit){
    const now=Date.now(),delta=Math.max(0,now-job.at);job.at=now;
    if(GameFlow.paused||GameSave.restoring)return;
    const rate=type==='pickaxe'?(V010World.settings.miningRate*(V09Craft.craftQueue.upgrades.tools?1.2:1)):1;
    let remaining=delta*rate,steps=0;
    while(remaining>0&&steps++<128){
      const boundary=job.impacted?job.duration:job.duration*phase(type),dt=Math.min(remaining,Math.max(0,boundary-job.elapsed));job.elapsed+=dt;remaining-=dt;
      if(job.elapsed+1e-7<boundary)break;
      if(!job.impacted){job.impacted=true;sound(job,type,target);if(commit(stats(selected(type)).yield)===false)return;}
      else {job.elapsed=0;job.impacted=false;}
    }
  }
  function visual(type){
    const job=type==='axe'?chopState:V09World.miningState();
    if(job)return {key:type+':'+job.id,elapsed:job.elapsed,duration:job.duration,cycleMs:job.duration,material:type==='axe'?'wood':'mineral',target:type==='axe'?worldTrees.find(t=>t.id===job.id):V09World.ores.find(o=>o.id===job.id)};
    if(!contact||contact.type!==type||contact.scene!==scene||heldItem()!==type||playerDead||Math.hypot(player.x-contact.x,player.y-contact.y)>.8)return null;
    const elapsed=contact.job.elapsed+Math.max(0,Date.now()-contact.at);if(elapsed>=contact.job.duration)return null;
    return {key:type+':'+contact.job.id,elapsed,duration:contact.job.duration,cycleMs:contact.job.duration,material:type==='axe'?'wood':'mineral',target:contact.target};
  }
  function validate(g){
    if(g===undefined)return true;const fail=()=>{throw Error('Invalid gathering state');};
    if(!g||g.schema!==2||(g.chop&&g.mining)||(g.hand!==null&&!HAND_TYPES.includes(g.hand)))fail();
    for(const [key,type]of [['chop','axe'],['mining','pickaxe']]){const j=g[key];if(!j)continue;
      if(!(type==='axe'?worldTrees:V09World.ores).some(o=>o.id===j.id)||typeof j.toolId!=='string'||!j.toolId||j.toolId.length>80||typeof j.actorId!=='string'||!j.actorId||j.actorId.length>100||!Number.isFinite(j.duration)||!Array.from({length:6},(_,l)=>definition(type).cycleMs/(1+l*.1)).some(n=>Math.abs(n-j.duration)<.001)||!Number.isFinite(j.elapsed)||j.elapsed<0||j.elapsed>=j.duration||typeof j.impacted!=='boolean'||j.impacted!==(j.elapsed+1e-7>=j.duration*phase(type))||!Number.isFinite(j.at)||j.at<=0||j.at>Date.now()+60000)fail();
    }return true;
  }
  function migrate(d){
    const g=d.gathering;if(!g)return;if(g.schema!==1){validate(g);return;}
    if(g.chop&&g.mining)throw Error('Invalid legacy gathering');
    if(g.chop&&(![1800,2300].includes(g.chop.duration)||!Number.isFinite(g.chop.startedAt)||g.chop.startedAt<=0||g.chop.startedAt>Date.now()+60000)||g.mining&&(g.mining.duration!==1800||!Number.isFinite(g.mining.elapsed)||g.mining.elapsed<0||g.mining.elapsed>=1800||!Number.isFinite(g.mining.at)||g.mining.at<=0||g.mining.at>Date.now()+60000))throw Error('Invalid legacy gathering');
    for(const [key,type]of [['chop','axe'],['mining','pickaxe']]){const old=g[key];if(!old)continue;
      const items=[...(d.quick013?.items||[]),...(d.bag||[])],item=items.find(s=>s?.type===type);
      if(!item){g[key]=null;continue;}item.uid??='legacy-tool-'+type;
      const duration=stats(item).duration,ratio=Math.min(.999999,Math.max(0,(type==='axe'?Date.now()-old.startedAt:old.elapsed)/old.duration));
      g[key]={id:old.id,toolId:item.uid,actorId:d.identity027?.playerId||'player:1',elapsed:ratio*duration*phase(type),duration,at:Date.now(),impacted:false};
    }g.schema=2;validate(g);
  }
  function resetTiming(){if(chopState)chopState.at=Date.now();const m=V09World.miningState();if(m)V09World.resumeMining({...m,at:Date.now()});}
  document.addEventListener('visibilitychange',resetTiming);
  return Object.freeze({resetTiming,definition,selected,stats,phase,start,valid,advance,visual,validate,migrate,reset(){contact=null;}});
})();
