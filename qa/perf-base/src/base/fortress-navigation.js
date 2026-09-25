/* 0.9.2: four watchtowers, a continuous protected wall walk and two metal gates. */
(() => {
  'use strict';
  const outer=surface.outer;
  Object.assign(outer,V020Walls.bounds);
  Object.assign(gateRect,V020Walls.gate);
  const innerGate={id:'v091innerGate',x:730,y:1170,w:140,h:20}; // save compatibility only
  const vestibule=[];
  const corners=V020Walls.corners;
  const stairs=V020Walls.stairs;
  const towerSolids=corners.map(t=>({id:'v091tower_'+t.id,x:t.x-80,y:t.y-80,w:160,h:160}));
  const decks=[{x:138,y:98,w:1324,h:104},{x:138,y:98,w:104,h:1004},
    {x:1358,y:98,w:104,h:1004},{x:138,y:998,w:1324,h:104},...towerSolids];
  let innerGateOpen=true,transition=null,stairsCooldown=0,groundAfter=null,wallRequest=null;
  player.wallLevel=false;

  const oldWalls=surfaceWalls;
  surfaceWalls=function(){
    const i=surface.inner;
    return [
      {id:'v091wallN',x:170,y:130,w:1260,h:72},
      {id:'v091wallW',x:170,y:130,w:72,h:940},
      {id:'v091wallE',x:1358,y:130,w:72,h:940},
      {id:'v091wallSW',x:170,y:998,w:560,h:72},
      {id:'v091wallSE',x:870,y:998,w:560,h:72},
      ...(!gateOpen?[gateRect]:[]),...vestibule,...(!innerGateOpen?[innerGate]:[]),
      {x:i.left,y:i.top,w:i.right-i.left,h:i.thickness},
      {x:i.left,y:i.top,w:i.thickness,h:i.bottom-i.top},
      {x:i.right-i.thickness,y:i.top,w:i.thickness,h:i.bottom-i.top},
      {x:i.left,y:i.bottom-i.thickness,w:i.gateX-i.left,h:i.thickness},
      {x:i.gateX+i.gateWidth,y:i.bottom-i.thickness,w:i.right-i.gateX-i.gateWidth,h:i.thickness}
    ];
  };
  const oldSolids=solidObjects;
  solidObjects=function(which){
    const out=oldSolids(which);
    return which==='surface'?[...out.filter(o=>!/^tower\d+$/.test(o.id||'')),...towerSolids]:out;
  };
  function isElevated(){return scene==='surface'&&player.wallLevel===true;}
  function pointOnDeck(x,y){if(window.V015Base&&!V015Base.deckPresent(x,y))return false;return decks.some(o=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h);}
  function elevatedCollision(x,y,r=player.radius){
    if(!Number.isFinite(x)||!Number.isFinite(y)||!pointOnDeck(x,y))return true;
    // The circular actor must fit on the union of floors; both edges are guarded.
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12;
      if(!pointOnDeck(x+Math.cos(a)*(r+3),y+Math.sin(a)*(r+3)))return true;
    }
    return false;
  }
  function elevatedClear(ax,ay,bx,by,r=player.radius){
    const steps=Math.max(1,Math.ceil(distance(ax,ay,bx,by)/5));
    for(let n=0;n<=steps;n++)if(elevatedCollision(ax+(bx-ax)*n/steps,ay+(by-ay)*n/steps,r))return false;
    return true;
  }
  // Only the player's feet use the upper layer. Ground enemies still hit the walls.
  const oldSurfaceCollision=surfaceCollision;
  surfaceCollision=function(x,y){return isElevated()?elevatedCollision(x,y):oldSurfaceCollision(x,y);};
  function findPath(ax,ay,target,r=player.radius){
    const bx=target.x,by=target.y;
    if(elevatedCollision(ax,ay,r)||elevatedCollision(bx,by,r))return null;
    if(elevatedClear(ax,ay,bx,by,r))return [{x:bx,y:by}];
    const points=[{x:ax,y:ay},{x:bx,y:by},...corners.map(t=>({x:t.x,y:t.y}))];
    const costs=points.map(()=>Infinity),parents=points.map(()=>-1),visited=new Set();costs[0]=0;
    for(let step=0;step<points.length;step++){
      let u=-1;for(let i=0;i<points.length;i++)if(!visited.has(i)&&(u<0||costs[i]<costs[u]))u=i;
      if(u<0||costs[u]===Infinity)break;if(u===1)break;visited.add(u);
      for(let v=0;v<points.length;v++)if(v!==u&&!visited.has(v)&&elevatedClear(points[u].x,points[u].y,points[v].x,points[v].y,r)){
        const value=costs[u]+distance(points[u].x,points[u].y,points[v].x,points[v].y);
        if(value<costs[v]){costs[v]=value;parents[v]=u;}
      }
    }
    if(!Number.isFinite(costs[1]))return null;
    const path=[];for(let n=1;n>0;n=parents[n])path.push({...points[n]});
    return path.reverse();
  }
  function routeLength(path){let x=player.x,y=player.y,length=0;for(const p of path){length+=distance(x,y,p.x,p.y);x=p.x;y=p.y;}return length;}
  function cancelRoute(){if(navigation?._v091Fortress){navigation=null;moveX=moveY=movePower=0;}}
  function routeTo(x,y,after=null){
    const points=findPath(player.x,player.y,{x,y});
    if(!points){message('На стене нет безопасного прохода');return false;}
    cancelNavigation();cancelChop();cancelSearch();
    navigation={_v091Fortress:true,destination:{id:'ground',kind:'ground',x,y,r:0,range:.5},points,index:0,blockedMs:0,scene,after};
    return true;
  }
  function landingFor(t){
    if(!t||!V020Walls.usable(t))return null;
    const candidates=[t.foot];
    for(let radius=12;radius<=48;radius+=12)for(let a=0;a<8;a++)candidates.push({x:t.foot.x+Math.cos(a*Math.PI/4)*radius,y:t.foot.y+Math.sin(a*Math.PI/4)*radius});
    return candidates.find(p=>p.x>242+player.radius&&p.x<1358-player.radius&&p.y>202+player.radius&&p.y<998-player.radius&&!worldCollision(p.x,p.y,player.radius,'surface'))||null;
  }
  function beginTransition(point,toUpper,kind='stairs',after=null){
    if(transition||scene!=='surface'||menuOpen||playerDead)return false;
    if(toUpper?elevatedCollision(point.x,point.y):worldCollision(point.x,point.y,player.radius,'surface'))return false;
    const source={x:player.x,y:player.y,wallLevel:isElevated()};
    const heldPointer=objectPointer?.following?objectPointer:null;
    const heldStick=leftPointerId!==null?{id:leftPointerId,x:moveX,y:moveY,power:movePower}:null;
    stopControls();if(heldPointer)objectPointer=heldPointer;if(heldStick){leftPointerId=heldStick.id;moveX=heldStick.x;moveY=heldStick.y;movePower=heldStick.power;}cancelSearch();cancelChop();
    transition={source,target:{...point},toUpper,elapsed:0,duration:kind==='jump'?360:720,kind,after};
    return true;
  }
  function descend(t,after=null){const point=landingFor(t);if(!point){message('Лестница занята — выберите другую');return false;}return beginTransition(point,false,'stairs',after);}
  function nearestStair(destination){
    return stairs.filter(V020Walls.usable).map(t=>({t,path:findPath(player.x,player.y,t),landing:landingFor(t)}))
      .filter(a=>a.path&&a.landing).sort((a,b)=>routeLength(a.path)+distance(a.landing.x,a.landing.y,destination.x,destination.y)-routeLength(b.path)-distance(b.landing.x,b.landing.y,destination.x,destination.y))[0]?.t;
  }
  function cancelGroundRequest(){if(wallRequest?.stairId&&navigation?.targetId===wallRequest.stairId)cancelNavigation();wallRequest=null;groundAfter=null;}
  const oldStopControls=stopControls;
  stopControls=function(...args){cancelGroundRequest();return oldStopControls(...args);};
  function handlePoint(x,y,following=false){
    if(transition)return true;
    if(!isElevated()){
      if(scene!=='surface'||elevatedCollision(x,y))return false;
      // A held pointer may hit the wall many times. Keep one incremental search,
      // update only its final deck destination, and never run A* in the input event.
      const n=V091Navigation;
      if(wallRequest&&wallRequest.scene===scene&&wallRequest.revision===geometryRevision){
        if(n.isPending(wallRequest.task)){wallRequest.x=x;wallRequest.y=y;return true;}
        if(navigation?.targetId===wallRequest.stairId){wallRequest.x=x;wallRequest.y=y;return true;}
        if(wallRequest.failed&&distance(player.x,player.y,wallRequest.fromX,wallRequest.fromY)<24)return true;
      }
      cancelNavigation();cancelSearch();cancelChop();groundAfter=null;
      const request={x,y,scene,revision:geometryRevision,fromX:player.x,fromY:player.y,index:0,
        candidates:stairs.filter(V020Walls.usable).sort((a,b)=>distance(player.x,player.y,a.foot.x,a.foot.y)-distance(player.x,player.y,b.foot.x,b.foot.y))};
      wallRequest=request;
      function nextStair(){
        if(wallRequest!==request)return;
        const t=request.candidates[request.index++];
        if(!t){request.failed=true;if(!following)message('К лестнице нет прохода. Откройте вход в крепость.');return;}
        const target={id:'v091stairs_'+t.id,kind:'v091stairs',tower:t.id,...t.foot,r:12,range:21};
        request.task=n.requestPath(target,points=>{
          if(wallRequest!==request)return;
          if(!points){nextStair();return;}
          request.stairId=target.id;
          groundAfter=()=>{wallRequest=null;routeTo(request.x,request.y);};
          navigation={targetId:target.id,points,index:0,blockedMs:0,replans:0,scene};
        });
      }
      nextStair();return true;
    }
    if(x>242&&x<1358&&y>202&&y<998){const p=inwardLanding();if(p){beginTransition(p,false,'jump',()=>approachPoint(x,y,following));return true;}}
    if(x<138||x>1462||y<98||y>1102){if(!following)message('Спрыгнуть можно только внутрь двора');return true;}
    if(!elevatedCollision(x,y)){routeTo(x,y);return true;}
    if(following){
      // A dragged pointer outside the wall follows its nearest safe deck point;
      // it never silently turns a continuous movement gesture into a descent.
      const positions=[];
      for(const d of decks){const p={x:clamp(x,d.x+player.radius+4,d.x+d.w-player.radius-4),y:clamp(y,d.y+player.radius+4,d.y+d.h-player.radius-4)};if(!elevatedCollision(p.x,p.y))positions.push(p);}
      positions.sort((a,b)=>distance(x,y,a.x,a.y)-distance(x,y,b.x,b.y));if(positions[0])routeTo(positions[0].x,positions[0].y);return true;
    }
    const stair=nearestStair({x,y});if(!stair){message('Нет свободной лестницы для спуска');return true;}
    routeTo(stair.x,stair.y,()=>descend(stair,()=>approachPoint(x,y)));return true;
  }
  function towerFor(target){return stairs.find(t=>t.id===target?.tower);}
  function handleObject(target){
    if(transition)return true;if(scene!=='surface'||!target)return false;
    if(target.kind==='v091tower'){
      const t=towerFor(target);if(!t)return true;
      if(isElevated()){routeTo(t.x,t.y,()=>descend(t));return true;}
      const foot={id:'v091stairs_'+t.id,kind:'v091stairs',name:'Подняться на стену',tower:t.id,...t.foot,r:12,range:21};
      if(canInteract(foot,player.x,player.y)){executeInteraction(foot);return true;}
      // Dispatch to the normal ground navigator with the actual stair foot.
      approachObject(foot);return true;
    }
    if(isElevated()){
      if(target.kind==='v091stairs'){const t=towerFor(target);if(t)routeTo(t.x,t.y,()=>descend(t));return true;}
      const destination={x:target.x+(target.w||0)/2,y:target.y+(target.h||0)/2},stair=nearestStair(destination);
      if(stair)routeTo(stair.x,stair.y,()=>descend(stair,()=>approachObject(interactionObjects().find(o=>o.id===target.id)||target)));
      return true;
    }
    return false;
  }
  function handleAutoWalk(){
    if(transition){movePower=moveX=moveY=0;return true;}
    if(!navigation?._v091Fortress)return false;
    if(!isElevated()||navigation.scene!==scene){cancelNavigation();return true;}
    let p=navigation.points[navigation.index];
    while(p&&distance(player.x,player.y,p.x,p.y)<.15){navigation.index++;p=navigation.points[navigation.index];}
    if(!p){const after=navigation.after;cancelNavigation();if(after)after();return true;}
    const d=distance(player.x,player.y,p.x,p.y)||1;moveX=(p.x-player.x)/d;moveY=(p.y-player.y)/d;movePower=.84;
    if(!rightAimActive){player.aimX=moveX;player.aimY=moveY;}return true;
  }
  const oldApproachPoint=approachPoint,oldApproachObject=approachObject,oldAutoWalk=updateAutoWalk;
  approachPoint=function(x,y,following=false){if(!handlePoint(x,y,following))return oldApproachPoint(x,y,following);};
  approachObject=function(target){if(!handleObject(target))return oldApproachObject(target);};
  updateAutoWalk=function(){if(!handleAutoWalk())return oldAutoWalk();};

  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){
    const base=oldInteractions(which);if(which!=='surface')return base;
    return [...base.filter(o=>o.id!=='v091innerGate'&&o.kind!=='v091tower'&&o.kind!=='v091stairs'),
      ...stairs.filter(V020Walls.usable).map(t=>({id:'v091stairs_'+t.id,kind:'v091stairs',tower:t.id,
        name:isElevated()?'Спуститься во двор':'Подняться на стену',...(isElevated()?{x:t.x,y:t.y}:t.foot),r:15,range:21}))];
  };
  const oldCanInteract=canInteract;
  canInteract=function(target,x,y){
    if(scene==='surface'){
      if(target?.kind==='v091tower')return false; // Tower body clicks route to stairs.
      if(target?.kind==='v091stairs'){
        const t=towerFor(target);if(!t||!V020Walls.usable(t))return false;const point=isElevated()?t:t.foot;
        return distance(x,y,point.x,point.y)<=28&&(isElevated()?elevatedClear(x,y,point.x,point.y):lineClear(x,y,point.x,point.y,0,'surface'));
      }
      if(isElevated()&&target?.kind!=='ground')return false;
      if(isElevated()&&target?.kind==='ground')return distance(x,y,target.x,target.y)<.2;
    }
    return oldCanInteract(target,x,y);
  };
  function toggleInnerGate(){return false;} // the retired airlock is not physical
  const oldExecute=executeInteraction;
  executeInteraction=function(target){
    if(target?.kind==='v091stairs'||target?.kind==='v091innerGate'){
      if(menuOpen||playerDead||transition||!canInteract(target,player.x,player.y))return;
      cancelNavigation();
      if(target.kind==='v091innerGate')toggleInnerGate();
      else{const t=towerFor(target);if(isElevated())descend(t);else{const after=groundAfter;groundAfter=null;beginTransition({x:t.x,y:t.y},true,'stairs',after);}}
      return;
    }
    if(target?.kind==='v091tower')return handleObject(target);
    if(isElevated())return;
    return oldExecute(target);
  };
  function inwardLanding(){
    if(!isElevated())return null;
    const x=player.x,y=player.y,possibilities=[];
    if(y<=270)possibilities.push({x:clamp(x,300,1300),y:270});
    if(y>=930)possibilities.push({x:clamp(x,300,1300),y:930});
    if(x<=310)possibilities.push({x:310,y:clamp(y,270,930)});
    if(x>=1290)possibilities.push({x:1290,y:clamp(y,270,930)});
    possibilities.sort((a,b)=>distance(x,y,a.x,a.y)-distance(x,y,b.x,b.y));
    return possibilities.find(p=>distance(x,y,p.x,p.y)<=170&&!worldCollision(p.x,p.y,player.radius+4,'surface'))||null;
  }
  function jumpInward(){const point=inwardLanding();if(!point){message('Во дворе нет свободного места для приземления');return false;}return beginTransition(point,false,'jump');}
  const jumpButton=document.createElement('button');jumpButton.id='v091JumpInward';jumpButton.type='button';jumpButton.className='v091WallButton';I18n.assign(jumpButton,"textContent",'↘ Спрыгнуть во двор');I18n.setAttr(jumpButton,'aria-label','Спрыгнуть со стены внутрь двора');
  jumpButton.addEventListener('pointerdown',e=>e.stopPropagation());jumpButton.addEventListener('click',e=>{e.stopPropagation();jumpInward();});document.body.appendChild(jumpButton);
  const oldPlayerUpdate=updatePlayer;
  updatePlayer=function(){
    if(transition){
      if(GameFlow.paused)return;
      const t=transition;
      if(t.toUpper&&elevatedCollision(t.target.x,t.target.y,player.radius)){
        const safe=window.V015Base?.freePoint(t.source.x,t.source.y,player.radius)||t.source;
        transition=null;groundAfter=null;wallRequest=null;cancelNavigation();
        player.wallLevel=false;player.x=safe.x;player.y=safe.y;player.moving=false;
        moveX=moveY=movePower=0;stairsCooldown=performance.now()+300;
        queueGameSave();message('Лестница повреждена — подъём отменён');return;
      }
      t.elapsed=Math.min(t.duration,t.elapsed+16.667*frameScale);
      const p=t.elapsed/t.duration,s=p*p*(3-2*p);
      player.x=t.source.x+(t.target.x-t.source.x)*s;player.y=t.source.y+(t.target.y-t.source.y)*s;player.moving=true;player.walkAnimation+=.21*frameScale;
      if(p>=1){stairsCooldown=performance.now()+300;player.wallLevel=t.toUpper;transition=null;player.moving=false;if(leftPointerId===null)movePower=moveX=moveY=0;queueGameSave();if(t.after)t.after();}
      return;
    }
    if(!GameFlow.paused&&scene==='surface'&&movePower>JOY_DEAD&&performance.now()>stairsCooldown){
      if(!isElevated()){
        const t=stairs.find(t=>V020Walls.usable(t)&&distance(player.x,player.y,t.foot.x,t.foot.y)<38&&((t.x-player.x)*moveX+(t.y-player.y)*moveY)>distance(player.x,player.y,t.x,t.y)*.4);
        if(t){const after=groundAfter;groundAfter=null;beginTransition({x:t.x,y:t.y},true,'stairs',after);return;}
      }else if(!navigation||navigation._pointerFollow){
        const x=player.x,y=player.y,r=player.radius;
        const next={x:x+moveX*(r+10),y:y+moveY*(r+10)};
        const inward=next.x>242&&next.x<1358&&next.y>202&&next.y<998&&elevatedCollision(next.x,next.y);
        if(inward){
          const t=stairs.find(t=>V020Walls.usable(t)&&distance(x,y,t.x,t.y)<58&&((t.foot.x-x)*moveX+(t.foot.y-y)*moveY)>distance(x,y,t.foot.x,t.foot.y)*.9);
          if(t&&descend(t))return;
          if(jumpInward())return;
        }
      }
    }
    return oldPlayerUpdate();
  };
  const oldAction=updateAction;
  updateAction=function(){
    oldAction();
    if(currentAction==='v091stairs')I18n.assign(actionButton,"textContent",isElevated()?'↧':'↥');
    if(currentAction==='v091innerGate')I18n.assign(actionButton,"textContent",innerGateOpen?'🔒':'🔓');
    const show=isElevated()&&!menuOpen&&!playerDead&&!transition;
    jumpButton.style.display=show?'block':'none';if(show)jumpButton.disabled=!inwardLanding();
  };

  // Floor slabs must not intercept a muzzle or light already on their upper side.
  function upperObstacles(rails=false){
    const obstacles=[...surfaceWalls().filter(o=>o.group!=='outer'&&o.id!=='gate'&&o.id!=='v015northGate'),...solidObjects('surface').filter(o=>!o.id?.startsWith('v091tower'))];
    if(rails&&!window.V015Base)obstacles.push({x:170,y:130,w:1260,h:6},{x:170,y:130,w:6,h:940},{x:1424,y:130,w:6,h:940},{x:170,y:1064,w:1260,h:6});
    return obstacles;
  }
  function upperObstacleCollision(x,y,r=1,which=scene,rails=false){
    if(which!=='surface')return worldCollision(x,y,r,which);
    if(x<(surface.minX??0)+r||x>(surface.maxX??surface.width)-r||y<(surface.minY??0)+r||y>(surface.maxY??surface.height)-r)return true;
    for(const o of upperObstacles(rails)){
      if(o.r!==undefined?distance(x,y,o.x,o.y)<=o.r+r:rectHit(x,y,r,o))return true;
    }
    return false;
  }
  function lightCollision(x,y,r=1,which=scene){return isElevated()?upperObstacleCollision(x,y,r,which,true):worldCollision(x,y,r,which);}
  function lightObstacles(which=scene){return which==='surface'&&isElevated()?upperObstacles(true):null;}
  const oldShoot=shoot;
  shoot=function(){
    if(transition)return;if(!isElevated())return oldShoot();
    const previousLine=lineClear,first=bullets.length;
    lineClear=function(ax,ay,bx,by,r=0,which=scene,ignoreId=null){
      if(which!=='surface')return previousLine(ax,ay,bx,by,r,which,ignoreId);
      const n=Math.max(1,Math.ceil(distance(ax,ay,bx,by)/3));for(let i=0;i<=n;i++)if(upperObstacleCollision(ax+(bx-ax)*i/n,ay+(by-ay)*i/n,r,which))return false;return true;
    };
    try{oldShoot();for(let i=first;i<bullets.length;i++)bullets[i].wallLevel=true;}finally{lineClear=previousLine;}
  };
  updateBullets=function(){
    if(firing)shoot();
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i],vx=b.dx*frameScale,vy=b.dy*frameScale,steps=Math.max(1,Math.ceil(Math.hypot(vx,vy)/3));let removed=false;
      for(let n=0;n<steps;n++){
        const x=b.x+vx/steps,y=b.y+vy/steps;
        if((b.wallLevel?upperObstacleCollision:worldCollision)(x,y,b.radius,scene)){removed=true;break;}
        b.x=x;b.y=y;
        if(scene==='surface'){const hit=zombies.find(z=>z.alive&&distance(x,y,z.x,z.y)<z.radius+b.radius);if(hit){hitZombie(hit,b.damage??25);removed=true;break;}}
      }
      b.life-=frameScale;if(removed||b.life<=0)bullets.splice(i,1);
    }
  };
  const oldZombieUpdate=updateZombies;
  updateZombies=function(){
    if(!isElevated()&&!transition)return oldZombieUpdate();
    const damage=damagePlayer,path=findWalkPath;
    damagePlayer=function(){};findWalkPath=function(ax,ay,target,...rest){return target?.id==='player'?null:path(ax,ay,target,...rest);};
    try{return oldZombieUpdate();}finally{damagePlayer=damage;findWalkPath=path;}
  };

  function rect(x,y,w,h,fill,stroke=null,width=1){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.strokeRect(x,y,w,h);}}
  function line(ax,ay,bx,by,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();}
  function label(text,x,y,size=10,color='#c9d1c6'){ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`600 ${size}px Arial`;ctx.fillText(I18n.text(text),x,y);}
  function wallDeck(o,vertical=false){
    // Offset foundations and multiple ledges make the top-down wall read as tall.
    rect(o.x+11,o.y+18,o.w,o.h,'rgba(8,15,17,.38)');rect(o.x,o.y,o.w,o.h,'#303b3c','#1c282b',3);
    rect(o.x+5,o.y+5,o.w-10,o.h-10,'#566360');
    const g=vertical?ctx.createLinearGradient(o.x,0,o.x+o.w,0):ctx.createLinearGradient(0,o.y,0,o.y+o.h);
    g.addColorStop(0,'#718079');g.addColorStop(.17,'#839086');g.addColorStop(.2,'#57665e');g.addColorStop(.76,'#546158');g.addColorStop(1,'#354641');
    rect(o.x+8,o.y+8,o.w-16,o.h-16,g);
    if(vertical){for(let y=o.y+24;y<o.y+o.h-8;y+=48){line(o.x+9,y,o.x+o.w-9,y,'#3e4c47',2);rect(o.x+10,y+2,5,3,'#9ba995');rect(o.x+o.w-15,y+2,5,3,'#9ba995');}}
    else for(let x=o.x+24;x<o.x+o.w-8;x+=48){line(x,o.y+9,x,o.y+o.h-9,'#3e4c47',2);rect(x+2,o.y+10,3,5,'#9ba995');rect(x+2,o.y+o.h-15,3,5,'#9ba995');}
  }
  function rail(x,y,w,h){
    rect(x,y,w,h,'#2a3938','#a8b5a3',1);
    if(w>h)for(let px=x+12;px<x+w;px+=40)rect(px,y-2,7,h+4,'#849382','#253c34',1);
    else for(let py=y+12;py<y+h;py+=40)rect(x-2,py,w+4,7,'#849382','#253c34',1);
  }
  function metalDoor(o,open,title){
    rect(o.x-5,o.y-4,o.w+10,o.h+8,'#263236','#7f918e',2);
    rect(o.x,o.y,o.w,o.h,'#181f23');
    const leaf=open?13:o.w/2-2;
    for(const side of [0,1]){
      const x=side?o.x+o.w-leaf:o.x;
      const g=ctx.createLinearGradient(x,o.y,x+leaf,o.y+o.h);g.addColorStop(0,'#718487');g.addColorStop(.38,'#445b62');g.addColorStop(1,'#263942');
      rect(x,o.y,leaf,o.h,g,'#b1beb4',2);
      if(!open){rect(x+6,o.y+6,leaf-12,o.h-12,'#334b54','#61777a',1);line(x+10,o.y+8,x+leaf-10,o.y+o.h-8,'#899a93',4);}
      for(const dy of [5,o.h-5])for(const dx of [4,leaf-4])rect(x+dx-1,o.y+dy-1,2,2,'#d3d8c3');
    }
    if(!open)rect(o.x+o.w/2-9,o.y+o.h/2-5,18,10,'#d2b970','#564d33',1);
    label(title+' · '+(open?'ОТКРЫТО':'ЗАКРЫТО'),o.x+o.w/2,o.y-13,9,open?'#a5dab6':'#e4c287');
  }
  drawGate=function(){metalDoor(gateRect,gateOpen,'СТАЛЬНЫЕ ВОРОТА');};
  function drawStairs(t){
    const dx=t.foot.x-t.x,dy=t.foot.y-t.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(angle);
    rect(37,-30,len-24,60,'rgba(0,0,0,.22)');rect(32,-25,len-24,50,'#3a484b','#82938a',2);
    for(let x=38;x<len+10;x+=8){rect(x,-23,5,46,'#8b9585');line(x,-23,x,23,'#c1c3aa',1);}
    line(33,-30,len+10,-30,'#9ea990',3);line(33,30,len+10,30,'#9ea990',3);
    ctx.restore();
    ctx.beginPath();ctx.arc(t.foot.x,t.foot.y,23,0,Math.PI*2);ctx.fillStyle='rgba(49,74,67,.83)';ctx.fill();ctx.strokeStyle='#a9b99b';ctx.lineWidth=1;ctx.stroke();label('↥',t.foot.x,t.foot.y+5,17,'#d0dfbb');
  }
  function drawTower(t,index){
    const x=t.x-64,y=t.y-64;
    rect(x+12,y+21,133,128,'rgba(8,14,15,.37)');rect(x,y,128,128,'#28373b','#1c282b',3);
    rect(x+5,y+5,118,118,'#809087','#b2b9a6',2);rect(x+13,y+13,102,102,'#55675f','#2c433b',2);
    for(let i=20;i<113;i+=16)line(x+14,y+i,x+114,y+i,'rgba(184,197,165,.12)',1);
    for(const [px,py] of [[x+3,y+3],[x+110,y+3],[x+3,y+110],[x+110,y+110]]){rect(px,py,15,15,'#465b5c','#a3b49d',2);rect(px+5,py+5,5,5,'#d0c699');}
    // Low rail sections leave the two wall connections and inward stairs open.
    if(index<2)rail(x+20,y+3,88,5);else rail(x+20,y+120,88,5);
    if(index===0||index===3)rail(x+3,y+20,5,88);else rail(x+120,y+20,5,88);
    label('0'+(index+1),t.x,t.y-11,15,'#ccd5b8');label('БАШНЯ',t.x,t.y+4,8,'#a2b6a5');
    rect(t.x-12,t.y+15,24,18,'#273c43','#8da492',1);label('↧',t.x,t.y+29,15,'#cee0b8');
  }
  const oldSurfaceDraw=drawSurface;
  drawSurface=function(){oldSurfaceDraw();window.V015Base?.drawFortifications();};
  const oldDrawPlayer=drawPlayer;
  drawPlayer=function(){
    if(transition?.kind==='jump'){
      const lift=Math.sin(Math.PI*transition.elapsed/transition.duration)*22;ctx.save();ctx.translate(0,-lift);oldDrawPlayer();ctx.restore();
    }else if(transition?.kind==='stairs'){const lift=Math.sin(Math.PI*transition.elapsed/transition.duration)*5;ctx.save();ctx.translate(0,-lift);oldDrawPlayer();ctx.restore();}else oldDrawPlayer();
    if(isElevated()&&!transition){label('НА СТЕНЕ',player.x,player.y-34,8,'#d5dfb8');}
  };
  function canonicalPosition(){return transition?{x:transition.source.x,y:transition.source.y,wallLevel:transition.source.wallLevel}:{x:player.x,y:player.y,wallLevel:isElevated()};}
  function capture(){return {...canonicalPosition(),innerGateOpen};}
  function validate(data){
    if(!data||typeof data.wallLevel!=='boolean'||typeof data.innerGateOpen!=='boolean'||!Number.isFinite(data.x)||!Number.isFinite(data.y)||Math.abs(data.x)>10000||Math.abs(data.y)>10000)throw new Error('Invalid fortress state');
    if(data.wallLevel&&!window.V015Base?.validating&&elevatedCollision(data.x,data.y,player.radius))throw new Error('Unsafe wall position');return true;
  }
  function restore(data){
    if(data)validate(data);transition=null;groundAfter=null;wallRequest=null;stairsCooldown=0;cancelRoute();innerGateOpen=true;player.wallLevel=!!data?.wallLevel&&scene==='surface';invalidateGeometry();
    if(data&&scene==='surface'){
      if(player.wallLevel||!worldCollision(data.x,data.y,player.radius,'surface')){player.x=data.x;player.y=data.y;}else{let found=false;for(let r=4;r<=96&&!found;r+=4)for(let i=0;i<24;i++){const x=data.x+Math.cos(i*Math.PI/12)*r,y=data.y+Math.sin(i*Math.PI/12)*r;if(!worldCollision(x,y,player.radius+1,'surface')){player.x=x;player.y=y;found=true;break;}}}
    }
    updateAction();
  }
  window.V091Fortress={corners,stairs,decks,innerGate,vestibule,cancelGroundRequest,isElevated,elevatedCollision,elevatedClear,findPath,handlePoint,handleObject,handleAutoWalk,cancelRoute,lightCollision,lightObstacles,upperObstacleCollision,canonicalPosition,capture,validate,restore,jumpInward,inwardLanding,toggleInnerGate,landingFor,get transitioning(){return !!transition;},get innerGateOpen(){return innerGateOpen;}};
  v09Style('.v091WallButton{position:fixed;z-index:32;left:50%;top:calc(env(safe-area-inset-top,0px) + 67px);transform:translateX(-50%);display:none;padding:10px 16px;min-height:42px;border:1px solid #a2b994;border-radius:9px;background:rgba(31,53,49,.95);color:#e3ebd4;font:600 12px Arial;box-shadow:0 3px 14px #0007;touch-action:manipulation}.v091WallButton:disabled{opacity:.5}');
  invalidateGeometry();
})();


// 0.9.2: swept room geometry and continuous, obstacle-aware point following.
const V091Navigation=(()=>{
  // R1 walls are already indexed by geometryFor; lighting uses the same solids.
  const walls=[];
  const fortress=()=>typeof V091Fortress==='object'?V091Fortress:null;
  function withOpenDoors(fn){return GamePassages.plan(fn,scene);}
  let pending=null;
  function queuePath(destination){
    if(pending&&!pending.onResult){pending.latest=destination;return;}
    pending={destination,latest:destination,scene,revision:geometryRevision,g:v092PathSearch(player.x,player.y,destination,scene,player.radius+1)};
  }
  // External route requests (for example stairs) share the same per-frame budget.
  function requestPath(destination,onResult){
    pending={destination,latest:destination,scene,revision:geometryRevision,onResult,g:v092PathSearch(player.x,player.y,destination,scene,player.radius+1)};
    return pending;
  }
  function tickPath(){
    if(!pending)return;
    if(GameFlow.paused||pending.scene!==scene||leftPointerId!==null){pending=null;return;}
    if(pending.revision!==geometryRevision){pending.revision=geometryRevision;pending.g=v092PathSearch(player.x,player.y,pending.destination,scene,player.radius+1);}
    const task=pending,start=performance.now();let out,steps=0;
    withOpenDoors(()=>{do{out=task.g.next();if(out.done)break;}while(++steps<8&&performance.now()-start<1.5);});
    if(!out.done)return;
    pending=null;
    if(task.onResult){task.onResult(out.value);return;}
    if(out.value){
      const points=out.value;let first=-1;
      for(let i=Math.min(points.length-1,3);i>=0;i--)if(withOpenDoors(()=>lineClear(player.x,player.y,points[i].x,points[i].y,player.radius+1,scene))){first=i;break;}
      if(first>=0)navigation={destination:task.destination,points:points.slice(first),index:0,blockedMs:0,replans:0,scene,following:true};
    }
    if(distance(task.latest.x,task.latest.y,task.destination.x,task.destination.y)>16)queuePath(task.latest);
  }
  const oldCancel=cancelNavigation;
  cancelNavigation=function(){pending=null;return oldCancel();};
  const oldStopControls=stopControls;
  stopControls=function(...args){pending=null;return oldStopControls(...args);};
  function finishMovement(){const task=pending;oldCancel();pending=task;}
  function plan(target){
    return withOpenDoors(()=>{
      if(target.kind==='ground'&&lineClear(player.x,player.y,target.x,target.y,player.radius+1,scene))return [{x:target.x,y:target.y}];
      return findWalkPath(player.x,player.y,target,scene,player.radius+1)||findWalkPath(player.x,player.y,target,scene,player.radius);
    });
  }
  function immediatePrefix(destination){
    const angle=Math.atan2(destination.y-player.y,destination.x-player.x),distanceToGoal=distance(player.x,player.y,destination.x,destination.y),limit=Math.min(200,distanceToGoal);
    return withOpenDoors(()=>{
      let best=null,score=-Infinity;
      for(const offset of [0,.45,-.45,.9,-.9,1.4,-1.4]){
        const a=angle+offset;let last={x:player.x,y:player.y};
        // Check each new edge once, not the whole growing segment on every step.
        for(let n=8;n<=limit;n+=8){const p={x:player.x+Math.cos(a)*n,y:player.y+Math.sin(a)*n};
          if(!lineClear(last.x,last.y,p.x,p.y,player.radius,scene))break;last=p;
        }
        const gain=distanceToGoal-distance(last.x,last.y,destination.x,destination.y);
        if(gain>score){score=gain;best=last;}
        if(offset===0&&best&&distance(player.x,player.y,best.x,best.y)>limit-10)break;
      }
      return best&&score>1?best:null;
    });
  }
  // Player requests use the same cancellable job as held-pointer release and
  // stairs. Never drain a generator inside pointerup or a blocked movement tick.
  function requestMove(destination,following=false,targetId=null,replans=0){
    const startX=player.x,startY=player.y;
    const task=requestPath(destination,points=>{
      if(!points){if(!following)message('К этой точке нет свободного прохода');return;}
      let join=-1;for(let i=Math.min(points.length-1,3);i>=0;i--)if(withOpenDoors(()=>lineClear(player.x,player.y,points[i].x,points[i].y,player.radius,scene))){join=i;break;}
      if(join<0){if(replans<4)requestMove(destination,following,targetId,replans+1);else cancelNavigation();return;}
      navigation={...(targetId?{targetId}:{destination}),points:points.slice(join),index:0,blockedMs:0,replans,scene,following};
    });
    // Retain the established radius fallback for narrow passages.
    task.g=(function*(){return (yield* v092PathSearch(startX,startY,destination,scene,player.radius+1))||(yield* v092PathSearch(startX,startY,destination,scene,player.radius));})();
    const prefix=immediatePrefix(destination);
    if(prefix)navigation={...(targetId?{targetId}:{destination}),points:[prefix],index:0,blockedMs:0,replans,scene,following,provisional:true};
  }
  function clippedPoint(x,y){
    const dx=x-player.x,dy=y-player.y,length=Math.hypot(dx,dy);
    if(length<.2)return null;
    const count=Math.ceil(length/3);let last={x:player.x,y:player.y};
    // Ignore automatic leaves while choosing a route, but still respect walls/objects.
    return withOpenDoors(()=>{
      for(let i=1;i<=count;i++){
        const p={x:player.x+dx*i/count,y:player.y+dy*i/count};
        if(worldCollision(p.x,p.y,player.radius+1,scene))break;last=p;
      }
      return distance(last.x,last.y,player.x,player.y)>.5?last:null;
    });
  }
  approachObject=function(target){
    if(fortress()?.handleObject?.(target))return;
    if(!target)return;
    if(canInteract(target,player.x,player.y)){executeInteraction(target);return;}
    stopControls();cancelSearch();cancelChop();
    requestMove(target,false,target.id);
  };
  approachPoint=function(x,y,following=false){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(navigation?._pointerFollow&&!objectPointer?.following)cancelNavigation();
    if(fortress()?.handlePoint?.(x,y,following))return;
    fortress()?.cancelGroundRequest?.();
    if(!following)stopControls();
    let goal={x,y};
    if(withOpenDoors(()=>worldCollision(x,y,player.radius,scene))){
      if(!following){message('Здесь препятствие — выберите свободное место');return;}
      goal=clippedPoint(x,y);
      if(!goal){cancelNavigation();return;}
    }
    if(distance(player.x,player.y,goal.x,goal.y)<.5){cancelNavigation();return;}
    const destination={id:'ground',kind:'ground',x:goal.x,y:goal.y,r:0,range:.55};
    if(following){
      if(withOpenDoors(()=>lineClear(player.x,player.y,destination.x,destination.y,player.radius+1,scene))){pending=null;navigation={destination,points:[{x:destination.x,y:destination.y}],index:0,blockedMs:0,replans:0,scene,following};return;}
      queuePath(destination);return;
    }
    if(withOpenDoors(()=>lineClear(player.x,player.y,destination.x,destination.y,player.radius+1,scene)))
      navigation={destination,points:[goal],index:0,blockedMs:0,replans:0,scene,following};
    else requestMove(destination,following);
  };
  function steerHeldPointer(){
      const target=navigation.destination,dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);
      if(d<.5){moveX=moveY=movePower=0;return;}
      moveX=dx/d;moveY=dy/d;movePower=.84;
      if(!rightAimActive){player.aimX=moveX;player.aimY=moveY;}
  }
  updatePointerFollow=function(){
    const p=objectPointer;if(!p||GameFlow.paused||playerDead||menuOpen&&!p.following)return;
    if(!p.following&&!p.target&&performance.now()-p.startedAt>=180)startPointerFollow();
    if(!p.following||fortress()?.transitioning)return;
    // A held gesture is direct steering, sampled once per rendered frame.
    // Only a released point/tap requests a route; moving the cursor never runs A*.
    const {x,y}=screenToWorld(p.screenX,p.screenY);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    pending=null;fortress()?.cancelGroundRequest?.();
    if(!navigation?._pointerFollow){
      oldCancel();const destination={id:'ground',kind:'ground',x,y,r:0,range:.55};
      navigation={_pointerFollow:true,destination,points:[destination],index:0,blockedMs:0,scene};
    }else{navigation.destination.x=x;navigation.destination.y=y;}
    steerHeldPointer();
  };
  updateAutoWalk=function(){
    if(navigation?.map014&&window.V014Controls)return V014Controls.advanceRoute();
    if(navigation?._pointerFollow){
      if(!objectPointer?.following||navigation.scene!==scene){cancelNavigation();return;}
      steerHeldPointer();
      return;
    }
    tickPath();
    if(fortress()?.handleAutoWalk?.())return;
    if(!navigation)return;
    const nav=navigation,target=nav.destination||interactionObjects().find(o=>o.id===nav.targetId);
    if(!target||nav.scene!==scene){cancelNavigation();return;}
    if(canInteract(target,player.x,player.y)){
      finishMovement();if(target.kind!=='ground')executeInteraction(target);return;
    }
    if(nav.blockedMs>180){
      if(nav.provisional&&pending){navigation=null;moveX=moveY=movePower=0;return;}
      if(nav.following){queuePath(target);nav.blockedMs=0;return;}
      const replans=(nav.replans||0)+1;cancelNavigation();
      if(replans<=4)requestMove(target,false,nav.targetId,replans);
      else message('Проход закрыт. Откройте дверь или выберите другой путь');
      return;
    }
    let p=nav.points[nav.index];
    while(p&&distance(player.x,player.y,p.x,p.y)<(nav.index===nav.points.length-1?.35:3)){
      // Only skip a near intermediate waypoint when the next edge is currently clear.
      const next=nav.points[nav.index+1];
      if(next&&!lineClear(player.x,player.y,next.x,next.y,player.radius,scene))break;
      nav.index++;p=nav.points[nav.index];
    }
    if(!p){finishMovement();return;}
    const d=distance(player.x,player.y,p.x,p.y)||1;
    moveX=(p.x-player.x)/d;moveY=(p.y-player.y)/d;movePower=.84;
    if(!rightAimActive){player.aimX=moveX;player.aimY=moveY;}
  };
  invalidateGeometry();
  return {walls,clippedPoint,plan,tickPath,requestPath,immediatePrefix,isPending:task=>pending===task,get pending(){return !!pending;}};
})();


// 0.9.2: per-container daily replenishment, persistent and safe for uncollected items.
