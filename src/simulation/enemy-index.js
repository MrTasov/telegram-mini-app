/* Shared broad phase only. Real actors remain owned by the original zombie list.
   Call refresh at the existing projectile / turret boundaries, never simulate here. */
window.GameEnemyIndex=(()=>{
 const cells=new Map(),pool=[],order=new WeakMap(),cell=128;let largest=0;
 function refresh(){for(const a of cells.values()){a.length=0;pool.push(a);}cells.clear();largest=0;
  for(let i=0;i<zombies.length;i++){const z=zombies[i];if(!z.alive||z.health<=0)continue;order.set(z,i);largest=Math.max(largest,z.radius||16);const key=Math.floor(z.x/cell)+','+Math.floor(z.y/cell);let a=cells.get(key);if(!a){a=pool.pop()||[];cells.set(key,a);}a.push(z);}
 }
 function query(x,y,r,out=[]){out.length=0;for(let cy=Math.floor((y-r)/cell);cy<=Math.floor((y+r)/cell);cy++)for(let cx=Math.floor((x-r)/cell);cx<=Math.floor((x+r)/cell);cx++){const a=cells.get(cx+','+cy);if(a)for(const z of a)if(z.alive&&z.health>0)out.push(z);}return out;}
 const nearby=[];
 function hit(x,y,r){query(x,y,r+largest,nearby);let best=null,index=Infinity;for(const z of nearby){const n=order.get(z);if(n<index&&(z.x-x)**2+(z.y-y)**2<((z.radius||16)+r)**2){best=z;index=n;}}return best;}
 return Object.freeze({refresh,query,hit,order:z=>order.get(z)});
})();
