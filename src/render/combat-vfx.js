/* 0.43 corrective: shared, pooled shot visuals (muzzle flash + tracer streak).
   Visual only: damage, hit order and ammo stay with each shooter's authoritative code
   (hitscan for turrets/drone, projectile for the player). No shot, no visual: callers only
   report real, ammo-spending shots. Fixed pools, no per-shot allocation. */
window.CombatVfx=(()=>{
  const TRACERS=160,FLASHES=48,FLASH_MS=60,SPEED=2.8,STREAK=38,MIN_MS=45,MAX_MS=150;
  const tracers=Array.from({length:TRACERS},()=>({at:-1e9,ms:0,scene:'',x0:0,y0:0,x1:0,y1:0,len:0,w:1.3,color:''}));
  const flashes=Array.from({length:FLASHES},()=>({at:-1e9,scene:'',x:0,y:0,angle:0,size:1}));
  let ti=0,fi=0,shots=0;
  const COLORS={player:'#fff1b0',drone:'#bff2df',turret:'#ffe0a0',heavy:'#ffd18a'};
  function tracer(scene,x0,y0,x1,y1,kind='player'){
    const len=Math.hypot(x1-x0,y1-y0);if(!(len>1))return;
    const t=tracers[ti];ti=(ti+1)%TRACERS;t.at=performance.now();t.scene=scene;t.x0=x0;t.y0=y0;t.x1=x1;t.y1=y1;t.len=len;
    t.ms=Math.max(MIN_MS,Math.min(MAX_MS,len/SPEED));t.w=kind==='heavy'?1.9:kind==='drone'?1.1:1.3;t.color=COLORS[kind]||COLORS.player;
  }
  function flash(scene,x,y,angle,size=1){const f=flashes[fi];fi=(fi+1)%FLASHES;f.at=performance.now();f.scene=scene;f.x=x;f.y=y;f.angle=angle;f.size=size;}
  // One real shot: muzzle flash (unless the shooter already paints its own) + tracer to the hit/range point.
  function shot(o){shots++;if(o.flash!==false)flash(o.scene,o.x0,o.y0,Math.atan2(o.y1-o.y0,o.x1-o.x0),o.size||1);tracer(o.scene,o.x0,o.y0,o.x1,o.y1,o.kind);}
  function draw(){
    const now=performance.now();let drawn=0;
    ctx.save();ctx.lineCap='round';
    for(const t of tracers){const age=now-t.at;if(age<0||age>=t.ms||t.scene!==scene)continue;
      if(!visibleOnScreen((t.x0+t.x1)/2,(t.y0+t.y1)/2,t.len/2+60))continue;
      const p=age/t.ms,head=Math.min(1,p*1.15),tail=Math.max(0,head-STREAK/t.len),dx=t.x1-t.x0,dy=t.y1-t.y0;
      ctx.globalAlpha=.9*(1-p*.55);ctx.strokeStyle=t.color;ctx.lineWidth=t.w;ctx.beginPath();ctx.moveTo(t.x0+dx*tail,t.y0+dy*tail);ctx.lineTo(t.x0+dx*head,t.y0+dy*head);ctx.stroke();drawn++;}
    for(const f of flashes){const age=now-f.at;if(age<0||age>=FLASH_MS||f.scene!==scene)continue;
      const k=1-age/FLASH_MS,L=11*f.size*(.75+.25*k),W=4*f.size;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.globalAlpha=k;
      ctx.fillStyle='#f1953c';ctx.beginPath();ctx.moveTo(0,-W*.45);ctx.lineTo(L*.55,-W*.85);ctx.lineTo(L*.4,-W*.2);ctx.lineTo(L,0);ctx.lineTo(L*.45,W*.25);ctx.lineTo(L*.6,W*.75);ctx.lineTo(0,W*.45);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff3c2';ctx.beginPath();ctx.moveTo(-.3,-W*.25);ctx.lineTo(L*.72,0);ctx.lineTo(-.3,W*.25);ctx.closePath();ctx.fill();ctx.restore();drawn++;}
    ctx.restore();return drawn;
  }
  // Where a player's projectile will visibly stop (wall/zombie/range); visual only.
  function reach(x,y,dx,dy,range,which=scene){
    let end=range;for(let d=8;d<range;d+=8)if(worldCollision(x+dx*d,y+dy*d,2,which)){end=d;break;}
    if(which==='surface')for(const z of zombies){if(!z.alive)continue;const ux=z.x-x,uy=z.y-y,along=ux*dx+uy*dy;if(along<=0||along>=end)continue;if(Math.abs(ux*dy-uy*dx)<(z.radius||14)+3)end=along;}
    return {x:x+dx*end,y:y+dy*end};
  }
  function active(){const now=performance.now();let n=0;for(const t of tracers)if(now-t.at<t.ms)n++;for(const f of flashes)if(now-f.at<FLASH_MS)n++;return n;}
  return Object.freeze({shot,tracer,flash,draw,reach,active,get shots(){return shots;},constants:Object.freeze({TRACERS,FLASHES,FLASH_MS})});
})();
