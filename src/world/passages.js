/* Planning permissions never change collision or visible door state. */
window.GamePassages=(()=>{
  const entries=new Map();let permissions=null;
  function register(id,definition){entries.set(id,definition);}
  const available=d=>!!d&&(!d.playerOnly||!window.V014Robots?.planningKey())&&!!d.canOpen();
  function plan(fn){
    const previous=permissions,before=V09Power.pathfinding;
    if(!permissions)permissions=new Map([...entries].map(([id,d])=>[id,available(d)]));
    V09Power.pathfinding=true;try{return fn();}finally{permissions=previous;V09Power.pathfinding=before;}
  }
  function canPlanThrough(id){return V09Power.pathfinding&&!!(permissions?permissions.get(id):available(entries.get(id)));}
  function key(){return [...entries].map(([id,d])=>id+':'+Number(permissions?permissions.get(id):available(d))).join(',');}
  function crosses(a,b,o){let low=0,high=1;for(const [axis,size]of [['x','w'],['y','h']]){const delta=b[axis]-a[axis],min=o[axis]-player.radius,max=o[axis]+o[size]+player.radius;if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{let x=(min-a[axis])/delta,y=(max-a[axis])/delta;if(x>y)[x,y]=[y,x];low=Math.max(low,x);high=Math.min(high,y);if(low>high)return false;}}return true;}
  function approach(nav){
    const next=nav?.points?.[nav.index];if(!next)return;
    for(const d of entries.values()){
      if(!d.openNear||d.scene!==scene||!d.canOpen())continue;
      const o=d.bounds(),p=contactPoint(o,player.x,player.y);
      if(distance(player.x,player.y,p.x,p.y)<90&&crosses(player,next,o))d.openNear();
    }
  }
  for(const d of v09Doors)register(d.id,{scene:'bunker',canOpen:()=>(window.V014Robots?.planningKey()?V014Robots.motion.doorPowered(d.room):devicePowered('door_'+d.room))||d.manual||!!window.V018Build?.isBroken(d.id)});
  // The old main gate has a binary manual actuator, no sliding animation.
  // Reuse it only when a player route actually reaches its proximity zone.
  register('gate',{playerOnly:true,scene:'surface',canOpen:()=>true,bounds:()=>gateRect,openNear:()=>{if(!gateOpen)toggleGate();}});
  return Object.freeze({register,plan,canPlanThrough,key,approach});
})();
