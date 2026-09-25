/* I1 is a scheduling/context port for the existing world update, not another
   enemy loop. Rendering and the locally selected scene never own combat. */
window.GameActivity=(()=>{
 const policy=Object.freeze({idleIntervalMs:250,base:{x:800,y:600,radius:1900},actorRadius:1150,droneRadius:900});
 let pausedAt=performance.now(),clockOffset=0;
 function clockPaused(paused){const raw=performance.now();if(paused&&pausedAt===null)pausedAt=raw;else if(!paused&&pausedAt!==null){clockOffset+=raw-pausedAt;pausedAt=null;}}
 function now(){clockPaused(GameFlow.paused);return (pausedAt===null?performance.now():pausedAt)-clockOffset;}
 document.addEventListener('visibilitychange',()=>now());
 let groundDepth=0,areas=[],steps=new WeakMap(),dt=0;const metrics={frames:0,full:0,coarse:0,skipped:0};
 function ground(fn){groundDepth++;try{return fn();}finally{groundDepth--;}}
 const collision=(x,y,r=15,ignore=null)=>ground(()=>worldCollision(x,y,r,'surface',ignore));
 const clear=(ax,ay,bx,by,r=0,ignore=null)=>ground(()=>lineClear(ax,ay,bx,by,r,'surface',ignore));
 function obstacles(ax,ay,bx,by,margin=1){return ground(()=>{const g=geometryFor('surface'),found=new Set();for(let y=Math.floor((Math.min(ay,by)-margin)/g.cell);y<=Math.floor((Math.max(ay,by)+margin)/g.cell);y++)for(let x=Math.floor((Math.min(ax,bx)-margin)/g.cell);x<=Math.floor((Math.max(ax,bx)+margin)/g.cell);x++)for(const o of g.grid[x+','+y]||[])found.add(o);return found;});}
 function contexts(){const a=[{...policy.base,kind:'base'}];
  for(const actor of GameActors.list())if(!actor.dead&&actor.scene==='surface'&&!(actor.id===GameActors.localId&&V013City.floor))a.push({x:actor.entity.x,y:actor.entity.y,radius:policy.actorRadius,kind:'actor',id:actor.id});
  const d=window.V014Robots?.state;if(d&&!d.packed&&d.hp>0&&d.scene==='surface')a.push({x:d.x,y:d.y,radius:policy.droneRadius,kind:'drone',id:d.id});
  for(const r of window.GameDefense?.records()||[])if(GameDefense.operational(r)&&r.transform.scene==='surface')a.push({...GameDefense.pivot(r),radius:(DefenseDefinitions.types[r.typeId].range||300)+150,kind:'equipment',id:r.id});
  return a;
 }
 function begin(ms){dt=clamp(Number(ms)||0,0,100);areas=contexts();metrics.frames++;}
 function engaged(z,r){return !!(r?.sees||r?.jump||r?.fuse||areas.some(a=>(z.x-a.x)**2+(z.y-a.y)**2<=a.radius*a.radius));}
 function state(z){if(!steps.has(z))steps.set(z,{pending:(Number(z.instanceId?.split(':')[1])%15)*policy.idleIntervalMs/15});return steps.get(z);}
 function step(z,r){const v=state(z);v.pending=Math.min(policy.idleIntervalMs+100,v.pending+dt);if(engaged(z,r)){v.pending=0;metrics.full++;return dt/16.667;}
  if(v.pending<policy.idleIntervalMs){metrics.skipped++;return 0;}const elapsed=v.pending;v.pending=0;metrics.coarse++;return elapsed/16.667;
 }
 function reset(){steps=new WeakMap();areas=[];dt=0;}
 function restorePhase(z,ms){steps.set(z,{pending:ms});}
 return Object.freeze({now,clockPaused,policy,begin,step,engaged,contexts,ground,collision,clear,obstacles,reset,restorePhase,phase:z=>state(z).pending,metrics:()=>({...metrics}),get groundQuery(){return groundDepth>0;}});
})();
