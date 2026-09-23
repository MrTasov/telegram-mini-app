/* Bunker Level 1 R2: static world ownership, dormant agriculture and save migration.
   The Core and sealed lower stair are not damageable/buildable records. */
window.BunkerState=(()=>{
  const layout=BunkerLayout,copy=v=>JSON.parse(JSON.stringify(v));
  let dormantMarkers=[];
  const oldSolids=solidObjects;
  solidObjects=function(which){const list=oldSolids(which);return which==='bunker'?list.filter(o=>!layout.agricultureId(o.id)).concat(layout.solids):list;};
  const oldObjects=interactionObjects;
  interactionObjects=function(which=scene){const list=oldObjects(which);if(which!=='bunker')return list;return list.filter(o=>!layout.agricultureId(o.id)).map(o=>o.id==='exit'?{
    ...o,...layout.stairs[0],id:o.id,kind:o.kind,r:undefined,pickBounds:layout.stairs[0]
  }:o).concat(
    {...layout.core,name:I18n.t('bunker.core.name')},
    {...layout.down,pickBounds:layout.stairs[1],name:I18n.t('bunker.down.locked')}
  );};
  const oldExecute=executeInteraction;
  executeInteraction=function(target){
    if(target&&layout.agricultureId(target.id)&&scene==='bunker')return;
    if(target?.id===layout.core.id||target?.id===layout.down.id){
      if(!menuOpen&&!playerDead&&scene==='bunker'&&canInteract(target,player.x,player.y)){if(target.id===layout.core.id)window.CommandCoreUI?.show();else message(I18n.t('bunker.down.locked'));}
      return;
    }
    return oldExecute(target);
  };
  function authoredRoom(p){return Object.entries(layout.authoredRooms).find(([id,r])=>id!=='corridor'&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom)?.[0]||'corridor';}
  function moveLegacy(p){
    if(!p||p.scene!=='bunker'||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const room=authoredRoom(p);
    if(room==='farm')return; // closest valid Level 1 floor is chosen after all owners restore
    if(room==='corridor'){const old=layout.authoredRooms.corridor,r=layout.rooms.corridor;p.x=r.left+(p.x-old.left)/(old.right-old.left)*(r.right-r.left);}
    else Object.assign(p,layout.point(room,p.x,p.y));
  }
  // Revision 1 coordinates are migration input only. Runtime owners use layout.
  function moveR1(p){
    if(!p||p.scene!=='bunker'||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const oldStairs=[{x:980,y:-480,w:180,h:240},{x:1260,y:-480,w:180,h:240}];
    for(let i=0;i<oldStairs.length;i++){const s=oldStairs[i],n=layout.stairs[i];if(p.x>=s.x&&p.x<=s.x+s.w&&p.y>=s.y&&p.y<=s.y+s.h){p.x=n.x+(p.x-s.x)/s.w*n.w;p.y=n.y+(p.y-s.y)/s.h*n.h;return;}}
    for(const r of layout.roomData){
      if(r.id==='corridor')continue;
      const dx=r.side==='left'?200:r.side==='right'?-200:0,left=r.x-dx;
      if(p.x>=left&&p.x<=left+r.w&&p.y>=r.y&&p.y<=r.y+r.h){p.x+=dx;return;}
    }
    if(p.x>=610&&p.x<=1810&&p.y>=-240&&p.y<=1260)p.x=layout.rooms.corridor.left+(p.x-610)*800/1200;
  }
  function moveActorsAndMap(d,move){
    move(d.player);move(d.robots014);move(d.robots014?.guard);
    if(d.player?.scene==='bunker'&&d.v091?.fortress){d.v091.fortress.x=d.player.x;d.v091.fortress.y=d.player.y;d.v091.fortress.wallLevel=false;}
    const map=d.v010?.modules?.camera;
    if(Array.isArray(map?.markers))map.markers.forEach(move);
    move(map?.goal);
  }
  function migrate(d){
    if(d.bunker030){
      if(d.bunker030.schema!==1)throw Error('Unsupported bunker schema');
      if(d.bunker030.layout===layout.revision)return; // no double translation
      if(d.bunker030.layout!==1)throw Error('Unsupported bunker layout');
      moveActorsAndMap(d,moveR1);d.bunker030.layout=layout.revision;return;
    }
    const held=Number.isFinite(d.savedAt)?d.savedAt:Date.now();
    d.bunker030={schema:1,layout:layout.revision,agricultureAt:held,dormantMarkers:[]};
    const power=d.v09?.power;
    if(power){
      if(power.roomEnabled)power.roomEnabled.reserve_l1=true;
      if(power.deviceEnabled){power.deviceEnabled.light_reserve_l1=true;power.deviceEnabled.door_reserve_l1=true;}
      if(Array.isArray(power.doors)&&!power.doors.some(o=>o?.id==='v09door_reserve_l1'))power.doors.push({id:'v09door_reserve_l1',open:0,away:0,manual:false});
    }
    if(Array.isArray(d.building018?.doors)&&!d.building018.doors.some(o=>o?.id==='v09door_reserve_l1'))d.building018.doors.push({id:'v09door_reserve_l1',level:1,hp:V015Base.health.definition('automatic').levels[1]});
    moveLegacy(d.player);
    if(d.player?.scene==='bunker'&&d.v091?.fortress){d.v091.fortress.x=d.player.x;d.v091.fortress.y=d.player.y;d.v091.fortress.wallLevel=false;}
    moveLegacy(d.robots014);moveLegacy(d.robots014?.guard);
    const map=d.v010?.modules?.camera;
    if(map){
      if(Array.isArray(map.markers))map.markers=map.markers.filter(p=>{if(p.scene==='bunker'&&authoredRoom(p)==='farm'){d.bunker030.dormantMarkers.push(copy(p));return false;}moveLegacy(p);return true;});
      if(map.goal?.scene==='bunker'&&authoredRoom(map.goal)==='farm'){d.bunker030.dormantMarkers.push({...copy(map.goal),goal:true});map.goal=null;}else moveLegacy(map.goal);
    }
  }
  function validate(d){
    const s=d.bunker030;
    if(!s||s.schema!==1||s.layout!==layout.revision||!Number.isFinite(s.agricultureAt)||s.agricultureAt<0||s.agricultureAt>Date.now()+60000||!Array.isArray(s.dormantMarkers)||s.dormantMarkers.length>41||s.dormantMarkers.some(m=>!m||m.scene!=='bunker'||!Number.isFinite(m.x)||!Number.isFinite(m.y)||Math.abs(m.x)>25000||Math.abs(m.y)>25000||(m.name!==undefined&&(typeof m.name!=='string'||m.name.length>36))))throw Error('Invalid Bunker Level 1 state');
  }
  function safePosition(source,radius=10,occupied=[]){
    const good=(x,y)=>layout.containsFloor(x,y)&&!worldCollision(x,y,radius,'bunker')&&occupied.every(a=>Math.hypot(x-a.x,y-a.y)>radius+(a.radius||10)+3);
    if(good(source.x,source.y))return{x:source.x,y:source.y};
    // Deterministic nearest projection, bounded by the small Level 1 footprint.
    // Candidate rings are ordered by distance; no random draw or gameplay timer.
    const b=layout.bounds,sx=clamp(source.x,b.x+radius,b.x+b.w-radius),sy=clamp(source.y,b.y+radius,b.y+b.h-radius);
    for(let r=4;r<=Math.hypot(b.w,b.h);r+=12){
      const count=Math.min(128,Math.max(16,Math.ceil(r/6)));
      for(let i=0;i<count;i++){const a=i*Math.PI*2/count,x=sx+Math.cos(a)*r,y=sy+Math.sin(a)*r;if(good(x,y))return{x,y};}
    }
    return {...layout.arrivals[0]};
  }
  function restorePositions(data){
    invalidateGeometry();const occupied=[];
    for(const a of GameActors.list()){
      if(a.scene!=='bunker')continue;const entity=a.entity,source=a.id===GameActors.localId?data.player:entity;
      Object.assign(entity,safePosition(source,entity.radius||10,occupied));entity.wallLevel=false;occupied.push(entity);
    }
    const d=V014Robots.state;
    if(!d.packed&&d.scene==='bunker'){
      const point=d.task==='docked'?V014Robots.dockPosition():safePosition(d,V014Robots.definition.movement.radius,occupied);Object.assign(d,point);
      if(d.guard?.scene==='bunker')Object.assign(d.guard,safePosition(d.guard,V014Robots.definition.movement.radius));
    }
    V014Robots.motion.reset();cancelNavigation();window.V014Controls?.stopRoute();
    if(scene==='bunker'){const view=V010Camera.view();camera.x=player.x-view.w/2;camera.y=player.y-view.h/2;updateCamera();}
    V091Light.invalidate();updateAction();
  }
  GameSave.extend('capture','bunker.level1',function(capture){const d=capture();d.bunker030={schema:1,layout:layout.revision,agricultureAt:AgricultureTime.now(),dormantMarkers:copy(dormantMarkers)};return d;});
  GameSave.extend('decode','bunker.level1',function(decode,raw){const d=decode(raw);validate(d);return d;});
  GameSave.extend('restore','bunker.level1',function(restore,d){validate(d);AgricultureTime.restore(d.bunker030.agricultureAt);dormantMarkers=copy(d.bunker030.dormantMarkers);const result=restore(d);restorePositions(d);return result;});
  function draw(){
    ctx.save();
    for(const s of layout.stairs){
      const {x,y,w,h}=s,up=s.id==='up',bottom=y+h;
      ctx.fillStyle='#15242a';ctx.fillRect(x+10,y+10,w-20,h-18);
      const step=(h-50)/9;
      for(let n=0;n<9;n++){const sy=y+22+n*step;ctx.fillStyle=n%2?'#566363':'#465454';ctx.fillRect(x+18,sy,w-36,step-5);ctx.fillStyle='#9baba080';ctx.fillRect(x+18,sy,w-36,2);}
      ctx.strokeStyle=up?'#92c3b1':'#b69b69';ctx.lineWidth=3;ctx.strokeRect(x+13,y+13,w-26,h-21);
      if(!up){ctx.fillStyle='#293b3c';ctx.fillRect(x+9,bottom-41,w-18,30);ctx.strokeStyle='#b4a477';ctx.lineWidth=4;for(let n=0;n<5;n++){ctx.beginPath();ctx.moveTo(x+17+n*21,bottom-16);ctx.lineTo(x+32+n*21,bottom-38);ctx.stroke();}}
      ctx.fillStyle=up?'#cee5da':'#d8c69e';ctx.textAlign='center';ctx.font='12px Arial';ctx.fillText(I18n.t(up?'bunker.up.label':'bunker.down.label'),x+w/2,bottom+27,w+24);ctx.font='10px Arial';ctx.fillText(I18n.t(up?'bunker.up.destination':'bunker.down.locked'),x+w/2,bottom+46,w+24);
    }
    const c=layout.core;V011Rooms.shadow(c.x+12,c.y+15,c.w-24,c.h-28,15,'corridor');
    if(!V011Art.draw('command_core',c.x,c.y,c.w,c.h)){
      ctx.fillStyle='#293f46';ctx.strokeStyle='#90aaa9';ctx.lineWidth=4;ctx.fillRect(c.x+12,c.y+14,c.w-24,c.h-28);ctx.strokeRect(c.x+12,c.y+14,c.w-24,c.h-28);
      ctx.fillStyle='#124b60';ctx.fillRect(c.x+46,c.y+45,c.w-92,c.h-90);ctx.strokeStyle='#61c2cd';ctx.lineWidth=1;for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(c.x+46+i*(c.w-92)/6,c.y+45);ctx.lineTo(c.x+46+i*(c.w-92)/6,c.y+c.h-45);ctx.stroke();}
    }
    ctx.fillStyle='#b7d5d3';ctx.font='13px Arial';ctx.textAlign='center';ctx.fillText(I18n.t('bunker.core.name'),c.x+c.w/2,c.y+c.h+25);
    ctx.restore();
  }
  invalidateGeometry();
  return Object.freeze({layout,migrate,validate,safePosition,restorePositions,draw});
})();
