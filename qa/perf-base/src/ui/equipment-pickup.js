/* Gesture client. The authority issues the hold ticket and checks identity,
   elapsed time, reach, movement, safety and capacity again on confirmation. */
window.GamePickup=(()=>{
  const t=(k,p)=>I18n.t('build.'+k,p);let press=null,pending=null,sequence=0;
  const ring=document.createElement('div');ring.id='equipmentPickupProgress';ring.hidden=true;ring.setAttribute('role','progressbar');ring.setAttribute('aria-valuemin','0');ring.setAttribute('aria-valuemax','100');ring.setAttribute('aria-label',t('pickUp'));document.body.append(ring);
  const confirm=document.createElement('div');confirm.id='equipmentPickupConfirm';confirm.className='panel';confirm.hidden=true;confirm.setAttribute('role','dialog');confirm.setAttribute('aria-modal','false');
  const label=document.createElement('strong'),buttons=document.createElement('div'),take=document.createElement('button'),back=document.createElement('button');take.type=back.type='button';take.id='equipmentPickupTake';back.id='equipmentPickupCancel';buttons.append(take,back);confirm.append(label,buttons);document.body.append(confirm);
  const eligible=id=>{const r=GameEquipment.get(id);return !!r&&r.placement==='installed'&&!!GamePlacement.rules[r.typeId]&&GameEquipmentRuntime.access(GameActors.local,r);};
  function position(id,node,offset=0){const p=GameEquipment.center(id);if(!p)return;const q=worldToScreen(p.x,p.y),safe=Math.max(70,Number(window.Telegram?.WebApp?.contentSafeAreaInset?.top||0)+50),w=node===confirm?112:25,h=node===confirm?(node.offsetHeight||112):25,bottom=Math.max(safe+h,window.innerHeight-145);node.style.left=clamp(q.x,w+12,Math.max(w+12,window.innerWidth-w-12))+'px';node.style.top=clamp(q.y+offset,safe+h,bottom)+'px';}
  function clearUI(){ring.hidden=true;confirm.hidden=true;}
  function cancel(){press=pending=null;GamePlacement.cancelPickup();clearUI();}
  function begin(id,e){
    if(!eligible(id)||!GameActions.playable())return false;
    if(press||pending){cancel();return true;}
    cancel();ring.setAttribute('aria-label',t('pickUp'));const ticket=GamePlacement.beginPickup(id);press={id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),ticket,source:e.source||'world',cancelled:false};
    // A short tap still opens a busy station; its inability to move is only
    // reported once the player deliberately holds it.
    return true;
  }
  function beginInteraction(id){if(!eligible(id)){message(I18n.t('placement.out_of_reach'));return false;}message(t('pickupHint'));return true;}
  function move(e){if(press?.pointerId!==e.pointerId)return false;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>12){press.cancelled=true;GamePlacement.cancelPickup();clearUI();}return true;}
  function up(e,cancelled=false){
    if(press?.pointerId!==e.pointerId)return false;
    const p=press;press=null;ring.hidden=true;
    if(cancelled){cancel();return true;}
    if(!pending){GamePlacement.cancelPickup();if(!p.cancelled&&performance.now()-p.at<350&&GameActions.playable()){const target=interactionObjects().find(o=>o.id===p.id);if(target)GameActions.dispatch('INTERACT',{id:target.id,kind:target.kind});}}
    return true;
  }
  function tick(){
    const p=press||pending;if(!p)return;
    if(document.hidden||playerDead||window.MainMenu?.active||GameFlow.paused||menuOpen||!eligible(p.id)||movePower>JOY_DEAD||rightPointerId!==null){cancel();return;}
    const elapsed=performance.now()-p.at;
    if(p.cancelled)return;
    if(!p.ticket.ok){if(elapsed>=350){message(GamePlacementUI.reason(p.ticket.reason));p.cancelled=true;}return;}
    if(!GamePlacement.pollPickup(p.ticket.token)){cancel();message(t('pickupChanged'));return;}
    if(pending){position(p.id,confirm,-60);return;}
    if(elapsed<350)return;
    const ratio=Math.min(1,elapsed/3000);ring.hidden=false;ring.style.setProperty('--pickup-progress',(ratio*360)+'deg');ring.setAttribute('aria-valuenow',String(Math.floor(ratio*100)));position(p.id,ring);ring.textContent=Math.ceil((3000-elapsed)/1000)||'✓';
    if(elapsed>=3000){pending=p;ring.hidden=true;confirm.hidden=false;label.textContent=t('pickUpNamed',{name:GamePlacementUI.title(GameEquipment.get(p.id).typeId)});take.textContent=t('pickUp');back.textContent=I18n.t('placement.cancel');position(p.id,confirm,-60);}
  }
  const oldUpdate=update;update=function(...args){const out=oldUpdate(...args);tick();return out;};
  take.onclick=()=>{
    const p=pending;if(!p)return;const result=GamePlacement.execute({actorId:GameActors.localId,instanceId:p.id,action:'pack',payload:{geometry:geometryRevision,pickupToken:p.ticket.token},expectedRevision:p.ticket.revision,requestId:'pickup-confirm:'+p.ticket.revision+':'+(++sequence)});
    message(result.ok?t('pickedUp'):GamePlacementUI.reason(result.reason));cancel();renderBag();
  };
  back.onclick=cancel;
  window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(press||pending)){e.preventDefault();cancel();}},true);
  v09Style(`
#equipmentPickupProgress{position:fixed;z-index:9400;width:48px;height:48px;box-sizing:border-box;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;background:conic-gradient(#d4e9bb var(--pickup-progress),#112825bb 0);color:#f0f7dc;font:bold 15px Arial;text-shadow:0 1px 3px #000;box-shadow:inset 0 0 0 7px #213b2b88,0 2px 8px #0007;pointer-events:none}
#equipmentPickupConfirm{position:fixed;z-index:9600;transform:translate(-50%,-100%);width:224px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:10px;border:1px solid #95b897;border-radius:10px;background:#152c2ef5;color:#e3eed9;box-shadow:0 4px 15px #0007;font:12px Arial}
#equipmentPickupConfirm strong{display:block;font-size:12px;line-height:1.4;margin-bottom:7px}#equipmentPickupConfirm>div{display:flex;gap:7px}#equipmentPickupConfirm button{flex:1;min-height:42px;border:1px solid #6a927d;border-radius:6px;background:#385744;color:#f0f4dc;font:12px Arial;touch-action:manipulation}#equipmentPickupConfirm[hidden],#equipmentPickupProgress[hidden]{display:none!important}
`);
  return Object.freeze({begin,beginInteraction,move,up,tick,cancel,get active(){return !!press||!!pending;},get pointerId(){return press?.pointerId;},get confirming(){return !!pending;}});
})();
