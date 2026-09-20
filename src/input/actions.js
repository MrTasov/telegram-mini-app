/* Shared input commands. Device adapters never implement combat, pathfinding,
   item transfers or interaction rules. Commands are transient, not save data. */
window.GameActions=(()=>{
  'use strict';
  const playable=()=>!window.MainMenu?.active&&!menuOpen&&!playerDead&&!document.hidden&&!el('fade')?.classList.contains('show');
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  function dispatch(type,data={}){
    // Releases are always allowed, including while a menu is opening.
    if(type==='FIRE'&&!data.active){firing=false;return true;}
    if(type==='AIM'&&data.active===false){rightAimActive=false;aimPower=0;return true;}
    if(type==='MOVE'&&data.kind==='vector'&&data.power===0){moveX=moveY=movePower=0;return true;}
    // An explicit map button may start a route while its own panel is open.
    // Other panels and all gameplay input retain the normal pause guard.
    if(window.MainMenu?.active)return false;
    const mapRoute=type==='MOVE'&&data.kind==='route'&&data.from==='map'&&el('v010MapOverlay')?.classList.contains('open')&&window.V0161UI?.topOverlay()===el('v010MapOverlay');
    if(!playable()&&!(mapRoute&&!playerDead&&!document.hidden&&!el('fade')?.classList.contains('show')))return false;
    switch(type){
      case 'MOVE':
        if(data.kind==='vector'){
          if(!point(data)||!Number.isFinite(data.power))return false;
          if(data.begin){cancelNavigation();cancelChop();cancelSearch();}
          moveX=data.x;moveY=data.y;movePower=clamp(data.power,0,1);
          if(movePower>JOY_DEAD&&!rightAimActive){player.aimX=moveX;player.aimY=moveY;}
          return true;
        }
        if(!point(data))return false;
        if(data.kind==='route')return !!window.V014Controls?.goTo(data);
        approachPoint(data.x,data.y,!!data.following);return true;
      case 'INTERACT': {
        if(data.nearest){
          updateAction();
          if(interactionTarget)executeInteraction(interactionTarget);
          else message('Подойдите ближе или нажмите на объект');
          return true;
        }
        // Re-resolve type AND instance identity at execution time (moving drone).
        const target=interactionObjects().find(o=>o.id===data.id&&o.kind===data.kind);
        if(!target)return false;
        approachObject(target);return true;
      }
      case 'WORLD_TARGET':
        return point(data)&&!!window.V0105?.tapWorld(data.x,data.y);
      case 'AIM': {
        if(!point(data))return false;
        rightAimActive=true;aimPower=clamp(data.power??1,0,1);
        if(aimPower>JOY_DEAD){
          const x=data.kind==='world'?data.x-player.x:data.x,y=data.kind==='world'?data.y-player.y:data.y;
          const n=data.kind==='world'?Math.hypot(x,y):1;if(n>0){player.aimX=x/n;player.aimY=y/n;}
        }
        return true;
      }
      case 'FIRE':
        firing=!!data.active&&canFire();if(firing&&data.immediate)shoot();return firing;
      case 'RELOAD':return reloadWeapon();
      case 'SELECT_SLOT':
        if(!Number.isInteger(data.index)||data.index<0||data.index>=handSlots.length)return false;
        selectHandSlot(data.index);return true;
      case 'INVENTORY':renderBag();openOverlay(el('inventoryOverlay'));return true;
      case 'MAP':window.V010Camera?.showMap();return true;
      case 'SETTINGS':openOverlay(el('settingsOverlay'));return true;
      case 'SNEAK':window.V010World?.setSneaking(!V010World.sneaking);return true;
      default:return false;
    }
  }
  return Object.freeze({dispatch,playable});
})();

