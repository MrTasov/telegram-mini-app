/* Shared input commands. Device adapters never implement combat, pathfinding,
   item transfers or interaction rules. Commands are transient, not save data. */
window.GameActions=(()=>{
  'use strict';
  const playable=()=>!window.MainMenu?.active&&!menuOpen&&!playerDead&&!document.hidden&&!el('fade')?.classList.contains('show');
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  function dispatch(type,data={}){
    const command={actorId:GameActors.localId,type,payload:data};
    // Always release local held inputs when a modal or the menu opens.
    if(type==='FIRE'&&!data.active||type==='AIM'&&data.active===false||type==='MOVE'&&data.kind==='vector'&&data.power===0)return GameSimulation.execute(command);
    // An explicit map button may start a route while its own panel is open.
    // Other panels and all gameplay input retain the normal pause guard.
    if(window.MainMenu?.active)return false;
    const mapRoute=type==='MOVE'&&data.kind==='route'&&data.from==='map'&&el('v010MapOverlay')?.classList.contains('open')&&window.V0161UI?.topOverlay()===el('v010MapOverlay');
    if(!playable()&&!(mapRoute&&!playerDead&&!document.hidden&&!el('fade')?.classList.contains('show')))return false;
    switch(type){
      case 'WORLD_TARGET':return point(data)&&!!window.V0105?.tapWorld(data.x,data.y);
      case 'INVENTORY':renderBag();openOverlay(el('inventoryOverlay'));return true;
      case 'MAP':window.V010Camera?.showMap();return true;
      case 'SETTINGS':openOverlay(el('settingsOverlay'));return true;
      default:return GameSimulation.execute(command);
    }
  }
  return Object.freeze({dispatch,playable});
})();
