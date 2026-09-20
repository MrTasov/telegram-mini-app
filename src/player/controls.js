/* Target fire button and incremental map routes. */
window.V014Controls=(()=>{
  'use strict';
  let route=null,pending=null,mapEnemy=null,lockedPress=null;
  const target=()=>window.V0105?.target||null;
  function contactTarget(){
    if(scene!=='surface'||window.V091Fortress?.isElevated?.())return null;
    return zombies.filter(z=>z.alive&&z.health>0&&Math.hypot(z.x-player.x,z.y-player.y)<=player.radius+z.radius+2&&lineClear(player.x,player.y,z.x,z.y,0,'surface')).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
  }
  const sneak=el('v010SneakButton'),bagButton=el('bagButton');
  const stop=document.createElement('button');stop.id='v014RouteStop';I18n.assign(stop,"textContent",'■ Остановиться');stop.type='button';document.body.append(stop);
  function stopRoute(){route=null;pending=null;cancelNavigation();stop.style.display='none';}
  stop.onclick=stopRoute;
  function beginStick(e,side){
    if(side==='left'){
      if(route||pending)stopRoute();return false;
    }
    if(side==='right'&&target()&&rightPointerId===null){
      objectPointer=null;rightPointerId=e.pointerId;lockedPress=e.pointerId;GameActions.dispatch('AIM',{x:player.aimX,y:player.aimY,power:1});centerJoystickKnob(aimStick);aimControl.classList.add('v014TargetFire');GameActions.dispatch('FIRE',{active:true,immediate:true});e.preventDefault();return true;
    }
    return false;
  }
  function moveStick014(e){
    if(e.pointerId===rightPointerId&&target()){
      lockedPress=e.pointerId;GameActions.dispatch('AIM',{x:player.aimX,y:player.aimY,power:1});GameActions.dispatch('FIRE',{active:true});centerJoystickKnob(aimStick);aimControl.classList.add('v014TargetFire');e.preventDefault();return true;
    }
    if(e.pointerId===lockedPress){lockedPress=null;aimControl.classList.remove('v014TargetFire');}
    return false;
  }
  function release(e){if(e.pointerId===lockedPress){lockedPress=null;aimControl.classList.remove('v014TargetFire');}}
  function releaseInput(){lockedPress=null;aimControl.classList.remove('v014TargetFire');}
  function openDoors(fn){const before=V09Power.pathfinding;V09Power.pathfinding=true;try{return fn();}finally{V09Power.pathfinding=before;}}
  function installPath(points,provisional=false){
    navigation={destination:route.destination,points,index:0,blockedMs:0,replans:0,scene,map014:true,provisional};
    const corners=[];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1],ab=distance(a.x,a.y,b.x,b.y),bc=distance(b.x,b.y,c.x,c.y),r=Math.min(14,ab/3,bc/3);
      if(r<1)continue;
      const from={x:b.x+(a.x-b.x)*r/ab,y:b.y+(a.y-b.y)*r/ab},to={x:b.x+(c.x-b.x)*r/bc,y:b.y+(c.y-b.y)*r/bc};
      let prev=from,clear=true;
      for(let k=1;k<=8;k++){const t=k/8,u=1-t,q={x:u*u*from.x+2*u*t*b.x+t*t*to.x,y:u*u*from.y+2*u*t*b.y+t*t*to.y};if(!openDoors(()=>lineClear(prev.x,prev.y,q.x,q.y,player.radius,scene))){clear=false;break;}prev=q;}
      if(clear)corners[i]={from,to};
    }
    navigation.corners=corners;
  }
  function beginPlan(fine=false){
    if(!route)return;
    const d=distance(player.x,player.y,route.destination.x,route.destination.y);
    const navCell=!fine&&d>700?36:12;
    const dest={...route.destination,navCell,navWeight:1.2};
    pending={generator:v092PathSearch(player.x,player.y,dest,scene,player.radius),start:{x:player.x,y:player.y},scene,revision:geometryRevision,navCell};
  }
  function immediatePrefix(){
    const dest=route.destination,angle=Math.atan2(dest.y-player.y,dest.x-player.x),limit=Math.min(200,distance(player.x,player.y,dest.x,dest.y));
    // Bounded local sweep: begin on a safe edge while the global search yields.
    // Collision checks include the player's radius, including narrow doorways.
    let best=null,score=-Infinity;
    for(const offset of [0,.45,-.45,.9,-.9,1.4,-1.4]){
      const a=angle+offset;let last=null;
      for(let n=8;n<=limit;n+=8){const p={x:player.x+Math.cos(a)*n,y:player.y+Math.sin(a)*n};
        if(!openDoors(()=>lineClear(player.x,player.y,p.x,p.y,player.radius,scene)))break;last=p;
      }
      if(last){const value=distance(player.x,player.y,dest.x,dest.y)-distance(last.x,last.y,dest.x,dest.y);if(value>score){score=value;best=last;}}
      if(offset===0&&best&&distance(player.x,player.y,best.x,best.y)>limit-10)break;
    }
    if(best&&score>1)installPath([best],true);
  }
  function goTo(p){
    if(!p||playerDead)return false;
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.scene&&p.scene!==scene)return false;
    stopRoute();stopControls();cancelChop();cancelSearch();V09World.stopMining();window.V012Fishing?.stop();
    if(openDoors(()=>worldCollision(p.x,p.y,player.radius,scene))){message('Нет доступного пути');return false;}
    const destination={id:'ground',kind:'ground',x:p.x,y:p.y,r:0,range:.55};
    route={destination,scene,revision:geometryRevision};V010Camera.setGoal(destination);
    if(openDoors(()=>lineClear(player.x,player.y,p.x,p.y,player.radius,scene)))installPath([{x:p.x,y:p.y}]);
    else {immediatePrefix();beginPlan();}
    stop.style.display=menuOpen?'none':'block';return true;
  }
  function tickPath(){
    if(!pending)return;
    if(playerDead||route?.scene!==scene){stopRoute();return;}
    if(pending.revision!==geometryRevision){beginPlan(pending.navCell===12);}
    const start=performance.now();let out;
    for(let i=0;i<40;i++){out=openDoors(()=>pending.generator.next());if(out.done||performance.now()-start>3)break;}
    if(!out.done)return;
    const coarse=pending.navCell!==12;pending=null;
    if(!out.value){if(coarse){beginPlan(true);return;}stopRoute();message('Нет доступного пути');return;}
    // Join ahead of the moving player, never snap back to the search origin.
    let join=-1;for(let i=out.value.length-1;i>=0;i--)if(openDoors(()=>lineClear(player.x,player.y,out.value[i].x,out.value[i].y,player.radius,scene))){join=i;break;}
    if(join<0){beginPlan(true);return;}
    installPath(out.value.slice(join));
  }
  function advanceRoute(){
    if(!route||route.scene!==scene||playerDead){stopRoute();return;}
    const nav=navigation;if(!nav)return;
    if(nav.blockedMs>250){nav.blockedMs=0;if(!pending)beginPlan(true);}
    let p=nav.points[nav.index];
    while(p&&distance(player.x,player.y,p.x,p.y)<(nav.index===nav.points.length-1?.4:3)){
      const next=nav.points[nav.index+1];if(next&&!openDoors(()=>lineClear(player.x,player.y,next.x,next.y,player.radius,scene)))break;
      nav.index++;p=nav.points[nav.index];
    }
    if(!p){moveX=moveY=movePower=0;
      if(pending){navigation=null;return;}
      if(distance(player.x,player.y,route.destination.x,route.destination.y)<1){stopRoute();return;}
      beginPlan(true);navigation=null;return;
    }
    const d=distance(player.x,player.y,p.x,p.y)||1;moveX=(p.x-player.x)/d;moveY=(p.y-player.y)/d;movePower=.84;
    if(!rightAimActive){player.aimX=moveX;player.aimY=moveY;}
  }
  const oldApproachPoint=approachPoint;approachPoint=function(...args){if(route||pending)stopRoute();return oldApproachPoint(...args);};
  const oldApproachObject=approachObject;approachObject=function(o,...args){
    if((route||pending)&&(!o||!canInteract(o,player.x,player.y)))stopRoute();
    return oldApproachObject(o,...args);
  };
  const oldStartFollow=startPointerFollow;startPointerFollow=function(...args){if(route||pending)stopRoute();return oldStartFollow(...args);};
  // UI may release controls without cancelling an explicitly requested map route.
  const oldStopControls=stopControls;stopControls=function(preserve=false,...args){const nav=preserve&&route?navigation:null,task=preserve?pending:null;const out=oldStopControls(preserve,...args);if(nav)navigation=nav;if(task)pending=task;return out;};
  const oldPlayer=updatePlayer;updatePlayer=function(...args){
    tickPath();
    // The world continues while a panel is open. Only the route resumes input here.
    const restoreMenu=menuOpen;try{if(route&&navigation&&!document.hidden)menuOpen=false;return oldPlayer(...args);}finally{menuOpen=restoreMenu;}
  };
  function drawRoute(c,scale){if(!route||route.scene!==scene||!navigation?.points)return;
    const nav=navigation;c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(player.x,player.y);
    for(let i=nav.index;i<nav.points.length;i++){const p=nav.points[i],corner=i>nav.index?nav.corners?.[i]:null;if(corner){c.lineTo(corner.from.x,corner.from.y);c.quadraticCurveTo(p.x,p.y,corner.to.x,corner.to.y);}else c.lineTo(p.x,p.y);}
    c.strokeStyle='rgba(178,205,183,.10)';c.lineWidth=5/scale;c.stroke();
    c.strokeStyle='rgba(207,220,183,.48)';c.lineWidth=2.4/scale;c.stroke();c.restore();
  }
  const oldNavDraw=drawNavigationTarget;drawNavigationTarget=function(...args){oldNavDraw(...args);drawRoute(ctx,V010Camera.zoom||1);};
  const goButton=v09Button('Идти сюда',()=>{if(GameActions.dispatch('MOVE',{...(V010Camera.selected||V010Camera.goal),kind:'route',from:'map'})){el('v010MapClose').click();}});goButton.id='v014MapGo';
  const droneButton=v09Button('Атаковать дроном',()=>{const z=mapSelectedTarget();if(z&&window.V014Robots?.attack(z))el('v010MapClose').click();});droneButton.id='v014MapAttack';droneButton.hidden=true;
  el('v010MapGoal').after(goButton);goButton.after(droneButton);
  const clearGoal=V010Camera.clearGoal;V010Camera.clearGoal=function(...args){stopRoute();return clearGoal(...args);};
  function mapSelectedTarget(){
    const p=V010Camera.selected;if(!p||scene!=='surface')return null;
    const cv=el('v010WorldMap'),b=V010Camera.mapBounds(),scale=Math.min(cv.width/b.w,cv.height/b.h)*V010Camera.mapViewport.zoom;
    return zombies.filter(z=>z.alive&&V010Camera.seen(z.x,z.y)&&(window.V0141Map?V0141Map.visible({...z,kind:'zombie'},false):Math.hypot(z.x-player.x,z.y-player.y)<720)&&lineClear(player.x,player.y,z.x,z.y,0,'surface')&&Math.hypot(z.x-p.x,z.y-p.y)<=Math.max(z.radius,7/scale)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||null;
  }
  function layout(){const g=fixedGeometry(),h=window.innerHeight;for(const [b,x]of [[sneak,g.leftX],[bagButton,g.rightX]]){b.style.left=x+'px';b.style.top=Math.max(55,Math.min(h-100,(b===sneak?g.leftY:g.rightY)-82))+'px';b.style.right=b.style.bottom='auto';b.style.transform='translate(-50%,-50%)';}}
  const oldPosition=positionFixedControls;positionFixedControls=function(...args){oldPosition(...args);layout();};
  const oldUpdate=update;update=function(...args){
    if(lockedPress!==null&&!target()){lockedPress=null;firing=false;aimPower=0;aimControl.classList.remove('v014TargetFire');centerJoystickKnob(aimStick);}
    const out=oldUpdate(...args);
    if(route&&!pending&&(!navigation||route.scene!==scene||playerDead)){route=null;}
    stop.style.display=!menuOpen&&!!route?'block':'none';
    if(el('v010MapOverlay').classList.contains('open')){mapEnemy=mapSelectedTarget();droneButton.hidden=!mapEnemy;}
    const hp=el('healthText');if(hp)I18n.assign(hp,"textContent",'❤️ '+Math.round(player.health)+'/'+Math.round(player.maxHealth));
    return out;
  };
  GameSave.extend('restore','player.controls',function(restore,d){route=pending=null;lockedPress=null;restore(d);layout();});
  v09Style(`
    #versionBadge,.versionBadge,#versionLabel{display:none!important}
    #v010Minimap{top:calc(var(--v011-game-top) + 70px)!important;transition:opacity .15s ease}
    #v010SneakButton,#bagButton{position:fixed;width:44px!important;height:44px!important;padding:7px!important;min-width:0!important;border:1px solid #aac9c277!important;border-radius:13px!important;background:#18302ccc!important;color:#bdd5cc;z-index:115;touch-action:none;box-sizing:border-box}
    #v010SneakButton svg,#bagButton svg{width:28px;height:28px;fill:none;stroke:#b9d1c6;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    #v010SneakButton svg circle{fill:#b9d1c6;stroke:none}
    #v010SneakButton.active{background:#537663dd!important;border-color:#c2d8ad!important}
    #aimControl.v014TargetFire .joystickBase{background:#48645355;border-color:#d6c688}#aimControl.v014TargetFire .joystickStick{background:#a5bd8655}
    #v014RouteStop{position:fixed;left:50%;transform:translateX(-50%);bottom:112px;z-index:116;border:1px solid #adbfaa77;border-radius:8px;background:#1e332bd9;color:#d5e4cf;font-size:11px;padding:7px 11px;display:none}
    #v014MapAttack[hidden]{display:none!important}
    @media(max-height:550px){#v010Minimap{top:calc(var(--v011-game-top) + 55px)!important}}
  `);
  window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);el('v010MapCorner').addEventListener('click',layout);layout();
  return {target,contactTarget,beginStick,moveStick:moveStick014,release,releaseInput,goTo,stopRoute,tickPath,advanceRoute,drawRoute,mapSelectedTarget,layout,get route(){return route;},get planning(){return !!pending;}};
})();

