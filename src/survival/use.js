/* A channelled inventory transaction. A cancelled/interrupted channel never
   spends its item. Accepted request receipts use the shared authority gate. */
window.SurvivalUse=(()=>{
 const B=GameplayBalance.survival;let job=null,sequence=0;
 const scope=()=>GameActors.localId+':survival';
 function cancel(){job=null;}
 function perform(c){
  if(c.action!=='use'||job)return {ok:false,reason:'busy'};
  const p=c.payload,index=p?.index,item=bag[index];if(!Number.isInteger(index)||index<0||!item||item.type!==p.type||item.qty!==p.qty||!B.uses[item.type])return {ok:false,reason:'item_changed'};
  if(!GameSurvival.useful(item.type))return {ok:false,reason:'full'};
  V010Combat.cancelReload();cancelChop();window.V09World?.cancelMining?.();window.V011Living?.stop();firing=false;
  job={index,item,type:item.type,qty:item.qty,scene,remaining:B.useMs,action:B.uses[item.type].action};return {ok:true,action:job.action};
 }
 const commands=EquipmentCommands.create({get:id=>id===scope()?{id}:null},{actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId&&!playerDead&&!GameFlow.paused,access:()=>true,perform,changed:queueGameSave});
 function request(index){const item=bag[index];if(!item)return {ok:false,reason:'item_changed'};return commands.execute({actorId:GameActors.localId,instanceId:scope(),requestId:'survival:'+commands.revision+':'+(++sequence),expectedRevision:commands.revision,action:'use',payload:{index,type:item.type,qty:item.qty}});}
 function tick(ms){if(!job)return;if(playerDead||scene!==job.scene||bag[job.index]!==job.item||job.item.qty!==job.qty){cancel();return;}job.remaining=Math.max(0,job.remaining-ms);if(job.remaining>0)return;const done=job;job=null;if(!GameSurvival.apply(done.type))return;done.item.qty--;if(done.item.qty===0)bag[done.index]=null;renderBag();queueGameSave();}
 function draw(){if(!job||playerDead)return;ctx.save();ctx.strokeStyle='#f1e5bc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y-35,9,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-job.remaining/B.useMs));ctx.stroke();ctx.restore();}
 const oldDraw=drawPlayer;drawPlayer=function(...args){const r=oldDraw(...args);draw();return r;};
 return Object.freeze({request,execute:commands.execute,capture:commands.capture,validate:commands.validate,restore(d){cancel();commands.restore(d);},tick,cancel,get revision(){return commands.revision;},get active(){return !!job;},get action(){return job?.action||null;},get progress(){return job?1-job.remaining/B.useMs:0;}});
})();
