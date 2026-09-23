/* Planning permissions never change collision or visible door state. */
window.GamePassages=(()=>{
  const entries=new Map();let permissions=null;
  function register(id,definition){entries.set(id,definition);}
  const available=d=>!!d&&!!d.canOpen();
  function plan(fn,which=null){
    const previous=permissions,before=V09Power.pathfinding;
    if(!permissions)permissions=new Map([...entries].map(([id,d])=>[id,(!which||d.scene===which)&&available(d)]));
    V09Power.pathfinding=true;try{return fn();}finally{permissions=previous;V09Power.pathfinding=before;}
  }
  function canPlanThrough(id){return V09Power.pathfinding&&!!(permissions?permissions.get(id):available(entries.get(id)));}
  function key(){return [...entries].map(([id,d])=>id+':'+Number(permissions?permissions.get(id):available(d))).join(',');}
  function crosses(a,b,o,radius=player.radius){let low=0,high=1;for(const [axis,size]of [['x','w'],['y','h']]){const delta=b[axis]-a[axis],min=o[axis]-radius,max=o[axis]+o[size]+radius;if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{let x=(min-a[axis])/delta,y=(max-a[axis])/delta;if(x>y)[x,y]=[y,x];low=Math.max(low,x);high=Math.min(high,y);if(low>high)return false;}}return true;}
  function approach(nav,actor=player,which=scene){
    const next=nav?.points?.[nav.index];if(!next)return;
    for(const d of entries.values()){
      if(!d.openNear||d.scene!==which||!d.canOpen())continue;
      const o=d.bounds(),p=contactPoint(o,actor.x,actor.y);
      if(distance(actor.x,actor.y,p.x,p.y)<90&&crosses(actor,next,o,actor.radius||10))d.openNear();
    }
  }
  for(const d of v09Doors.filter(d=>BunkerLayout.roomActive(d.room)))register(d.id,{scene:'bunker',bounds:()=>d,canOpen:()=>(window.V014Robots?.planningKey()?V014Robots.motion.doorPowered(d.room):devicePowered('door_'+d.room))||d.manual||!!window.V018Build?.isBroken(d.id)});
  // The old main gate has a binary manual actuator, no sliding animation.
  // Reuse it only when a player route actually reaches its proximity zone.
  register('gate',{scene:'surface',canOpen:()=>true,bounds:()=>gateRect,openNear:()=>{if(!gateOpen)toggleGate();}});
  // Planning clearance steers eligible actors to the safe center of a doorway.
  // Physical collision still uses its real panels. Starting actors can leave
  // their own small neighborhood before entering the centered corridor.
  function clearanceBlocked(x,y,r,which){
    if(!V09Power.pathfinding||!window.V014Robots?.planningKey())return false;
    const actor=V014Robots.state;if(distance(x,y,actor.x,actor.y)<30)return false;
    for(const [id,d] of entries){if(d.scene!==which||!d.bounds||!canPlanThrough(id))continue;
      const b=d.bounds(),horizontal=b.w>b.h,cx=b.x+b.w/2,cy=b.y+b.h/2;
      const along=horizontal?Math.abs(x-cx):Math.abs(y-cy),across=horizontal?Math.abs(y-cy):Math.abs(x-cx),half=(horizontal?b.w:b.h)/2;
      if(across<(horizontal?b.h:b.w)/2+r+14&&along<half+r&&along>Math.max(10,Math.min(24,half-r-8)))return true;
    }return false;
  }
  return Object.freeze({register,plan,canPlanThrough,key,approach,clearanceBlocked});
})();
