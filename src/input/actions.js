/* Shared input commands. Device adapters never implement combat, pathfinding,
   item transfers or interaction rules. Commands are transient, not save data. */
window.GameActions=(()=>{
  'use strict';
  const playable=()=>!GameFlow.paused&&!menuOpen&&!el('fade')?.classList.contains('show');
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  function dispatch(type,data={}){
    const command={actorId:GameActors.localId,type,payload:data};
    // Always release local held inputs when a modal or the menu opens.
    if(type==='FIRE'&&!data.active||type==='AIM'&&data.active===false||type==='MOVE'&&data.kind==='vector'&&data.power===0)return GameSimulation.execute(command);
    // An explicit map button may start a route while its own panel is open.
    // Other panels and all gameplay input retain the normal pause guard.
    if(window.MainMenu?.active)return false;
    const mapRoute=type==='MOVE'&&data.kind==='route'&&data.from==='map'&&el('v010MapOverlay')?.classList.contains('open')&&window.V0161UI?.topOverlay()===el('v010MapOverlay');
    const heldMove=type==='MOVE'&&data.kind==='vector'&&leftPointerId!==null&&!GameFlow.paused&&!el('fade')?.classList.contains('show');
    if(!playable()&&!heldMove&&!(mapRoute&&!playerDead&&!document.hidden&&!el('fade')?.classList.contains('show')))return false;
    switch(type){
      case 'WORLD_TARGET':return point(data)&&!!window.V0105?.tapWorld(data.x,data.y);
      case 'INVENTORY':renderBag();openOverlay(el('inventoryOverlay'));return true;
      case 'MAP':window.V010Camera?.showMap();return true;
      case 'FLASHLIGHT':return !!window.GameHeadModules?.request('toggle',{value:!flashlightOn}).ok;
      case 'SETTINGS':openOverlay(el('settingsOverlay'));return true;
      default:return GameSimulation.execute(command);
    }
  }
  // A secondary touch does not reliably produce a compatibility click. Activate
  // on its own release and consume any later click, without releasing the stick.
  function bindButton(button,activate){
    let press=null,handled=false;
    button.addEventListener('pointerdown',e=>{handled=false;if(e.button>0||button.disabled)return;if(e.pointerType==='touch'||e.pointerType==='pen')press={id:e.pointerId,x:e.clientX,y:e.clientY};e.stopPropagation();});
    button.addEventListener('pointerup',e=>{if(press?.id!==e.pointerId)return;const p=press;press=null;if(!button.disabled&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<12){handled=true;e.preventDefault();activate();}});
    button.addEventListener('pointercancel',()=>{press=null;});
    button.addEventListener('click',e=>{if(handled&&e.detail!==0){handled=false;e.preventDefault();return;}handled=false;activate();});
  }
  return Object.freeze({dispatch,playable,bindButton});
})();
