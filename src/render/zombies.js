/* Visual pass 1 (Claude): 3D zombies (Tripo model, Mixamo motion) pre-rendered from above
   like the hero. Presentation only: walker, brute and runner draw from packed atlases; the
   leaper and bloater keep the previous sprites. Simulation, timing, damage and saves stay
   with V017Monsters; this module only reads them. Per-zombie visual marks live in a WeakMap. */
window.ZombieVisual=(()=>{
  const cfg=AssetManifest.zombies042,M=window.V017Monsters;if(!cfg||!M)return null;
  const actors=AssetManifest.actors,unit=(actors.hero?.worldPerUnit||.75)*(actors.visualScale||1);
  // World size relative to the hero, the part of the death clip used as a hit flinch, and the
  // travelled speed (world px/s) above which the run sheet replaces the walk sheet.
  const TYPE={walker:{scale:.8,hit:4,run:60},runner:{scale:.78,hit:4,run:50},brute:{scale:.88,hit:6,run:70}};
  const RATE_MIN=.6,RATE_MAX=1.6;
  const HIT_MS=280,HIT_GAP=400,IDLE_BELOW=4,TAU=Math.PI*2;
  const marks=new WeakMap();
  function mark(z){let v=marks.get(z);if(!v){v={hitAt:-1e9,walk:null,t:0,speed:0,phase:Math.random(),run:false,seed:Math.random()*4000};marks.set(z,v);}return v;}
  const typeOf=z=>{const art=M.specs[z.type]?.art;return cfg.types[art]&&TYPE[art]?art:null;};
  function cell(art,name,i){
    const t=cfg.types[art],a=t.anims[name],id=t.images[a.image];if(!GameAssets.ready(id))return null;
    const f=GameAssets.frame(id,name+'_'+i);return f?{im:GameAssets.image(id),f,size:a.cell}:null;
  }
  let groundShadow=null;
  function shadow(w,h){
    if(!groundShadow){groundShadow=document.createElement('canvas');groundShadow.width=groundShadow.height=64;const c=groundShadow.getContext('2d'),g=c.createRadialGradient(32,32,5,32,32,32);g.addColorStop(0,'rgba(7,18,17,.48)');g.addColorStop(.55,'rgba(7,18,17,.28)');g.addColorStop(1,'rgba(7,18,17,0)');c.fillStyle=g;c.fillRect(0,0,64,64);}
    ctx.drawImage(groundShadow,-w/2,-h/2,w,h);
  }
  // Measured travel speed picks idle/walk/run; the clip plays at its own tempo scaled by the
  // speed ratio within RATE_MIN..RATE_MAX (game speeds differ from the Mixamo strides).
  function track(v,r,perf){
    if(v.walk===null||perf-v.t>500||r.walk<v.walk){v.walk=r.walk;v.t=perf;v.speed=0;return 0;}
    const d=r.walk-v.walk,dt=perf-v.t;v.walk=r.walk;v.t=perf;
    if(dt>0){const k=1-Math.exp(-dt/140);v.speed+=(d/dt*1000-v.speed)*k;}
    return dt;
  }
  function pick(z,art,v,r,perf,now){
    const T=TYPE[art],A=cfg.types[art].anims,dt=track(v,r,perf);
    const hit=perf-v.hitAt;
    if(hit<HIT_MS){const p=hit/HIT_MS,k=T.hit-1,x=p<.5?p*2*k:(1-p)*2*k;return {name:'hit',i:Math.round(x),flash:1-p};}
    // Attacks are clocked by the owner's cooldown: the lunge frame lands on the damage tick,
    // recovery and wind-up fill the gap to the next tick.
    const s=M.stats(z),cd=Math.max(300,s.cooldown||1000),since=now-(z.lastAttack||-1e9);
    if(since>=0&&since<cd*1.15&&(r.attack>now-cd*1.15)){const a=A.attack,i=(a.impact+Math.floor(since/cd*a.n))%a.n;return {name:'attack',i};}
    if(v.speed<IDLE_BELOW){const a=A.idle;return {name:'idle',i:Math.floor((perf+v.seed)/a.durationMs*a.n)%a.n};}
    if(v.speed>T.run*1.08)v.run=true;else if(v.speed<T.run*.92)v.run=false;
    const name=v.run?'run':'walk',a=A[name],natural=Math.max(8,a.cycle*unit*T.scale)/a.durationMs*1000,rate=Math.min(RATE_MAX,Math.max(RATE_MIN,v.speed/natural));
    v.phase=(v.phase+dt/a.durationMs*rate)%1;return {name,i:Math.floor(v.phase*a.n)%a.n};
  }
  function draw(c,sc,flash){
    const f=c.f,x=-c.size/2+f.ox,y=-c.size/2+f.oy;
    ctx.save();ctx.scale(sc,sc);ctx.drawImage(c.im,f.x,f.y,f.w,f.h,x,y,f.w,f.h);
    if(flash>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.4*flash;ctx.drawImage(c.im,f.x,f.y,f.w,f.h,x,y,f.w,f.h);}
    ctx.restore();
  }
  function drawDead(z,art){
    const r=M.state(z),age=performance.now()-r.deadAt;if(r.retired||age>=M.corpseMs)return true;
    const a=cfg.types[art].anims.death,ms=a.durationMs*.85,i=age<ms?Math.min(a.n-1,Math.floor(age/ms*a.n)):a.n-1,c=cell(art,'death',i);
    if(!c)return false;const T=TYPE[art],sc=unit*T.scale/cfg.pxPerUnit;
    ctx.save();ctx.translate(z.x,z.y);ctx.globalAlpha*=M.corpseOpacity(z);
    if(i===a.n-1){ctx.save();ctx.translate(2,3);ctx.globalAlpha*=.7;shadow(z.radius*3.2,z.radius*2.3);ctx.restore();}
    ctx.rotate(r.deathAngle);draw(c,sc,0);ctx.restore();return true;
  }
  const oldDraw=drawZombie;
  drawZombie=function(z){
    const art=typeOf(z);if(!art)return oldDraw(z);
    if(!visibleOnScreen(z.x,z.y,140))return;
    if(!z.alive){if(!drawDead(z,art))return oldDraw(z);return;}
    const r=M.state(z),v=mark(z),perf=performance.now(),now=GameActivity.now(),T=TYPE[art],p=pick(z,art,v,r,perf,now),c=cell(art,p.name,p.i);
    ctx.save();ctx.translate(z.x,z.y);
    ctx.save();ctx.translate(3,6);shadow(z.radius*2.7,z.radius*1.9);ctx.restore();
    if(p.flash){const dx=z.x-player.x,dy=z.y-player.y,l=Math.hypot(dx,dy)||1,k=5*p.flash;ctx.translate(dx/l*k,dy/l*k);}
    ctx.rotate(r.angle-Math.PI/2);
    if(c)draw(c,unit*T.scale/cfg.pxPerUnit,p.flash||0);
    else {ctx.fillStyle=M.specs[z.type].color;ctx.beginPath();ctx.ellipse(0,0,z.radius,z.radius*1.2,0,0,TAU);ctx.fill();}
    ctx.restore();
  };
  // Every source of zombie damage (guns, turrets, drone, blasts) passes through hitZombie.
  const oldHit=hitZombie;
  hitZombie=function(z,...args){const was=!!z?.alive,out=oldHit(z,...args);if(was&&z.alive&&typeOf(z)){const v=mark(z),p=performance.now();if(p-v.hitAt>HIT_GAP)v.hitAt=p;}return out;};
  return Object.freeze({types:Object.keys(TYPE),state:z=>marks.get(z)||null,pick:(z,now=GameActivity.now())=>{const art=typeOf(z);return art?pick(z,art,mark(z),M.state(z),performance.now(),now):null;}});
})();
