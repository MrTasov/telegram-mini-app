/* Hero 2: the 3D character (Tripo model, Mixamo motion) pre-rendered from above.
   Presentation only. ActorVisuals, V010Combat and V012Fishing keep pose, timing, stance,
   impacts, shots, reloads and sound; this module picks and draws a frame in place of the
   body. Items without hero sheets (the flashlight) keep the modular renderer, and so does
   any frame whose image has not loaded yet. */
window.HeroVisual=(()=>{
  const actors=AssetManifest.actors,cfg=actors.hero;if(!cfg)return null;
  const visualScale=actors.visualScale||1,TAU=Math.PI*2,N=cfg.frames,COLS=cfg.columns,extra=cfg.extra||{};
  const unit=cfg.worldPerUnit*visualScale,aimed=new Set(cfg.aimed||[]);
  const info=name=>extra[name]||{};
  const frameSize=name=>info(name).frameSize||cfg.frameSize;
  const cycleOf=name=>(info(name).cycleUnits||cfg.cycleUnits[/run/.test(name)?'run':'walk'])*unit;
  // Renderer-local gait: travelled distance and direction, never written to player state.
  const gait={x:null,y:null,t:0,scene:null,speed:0,d:0,dx:0,dy:0,run:false,phase:0,sheet:null};
  function track(now){
    const place=typeof scene==='undefined'?null:scene,dt=now-gait.t;gait.d=0;
    if(gait.x===null||place!==gait.scene||dt<=0||dt>500){gait.x=player.x;gait.y=player.y;gait.t=now;gait.scene=place;gait.speed=0;return gait;}
    const dx=player.x-gait.x,dy=player.y-gait.y,d=Math.hypot(dx,dy);
    if(d>60){gait.x=player.x;gait.y=player.y;gait.t=now;return gait;} // teleport, stairs, load
    const k=1-Math.exp(-dt/110);gait.speed+=(d/dt*1000-gait.speed)*k;
    if(d>.01){const w=Math.min(1,d/4);gait.dx+=(dx/d-gait.dx)*w;gait.dy+=(dy/d-gait.dy)*w;}
    if(!player.moving&&gait.speed<6)gait.speed=0;
    if(gait.speed>cfg.runSpeed.on)gait.run=true;else if(gait.speed<cfg.runSpeed.off)gait.run=false;
    gait.d=d;gait.x=player.x;gait.y=player.y;gait.t=now;return gait;
  }
  const wrap=(v,n)=>((Math.floor(v)%n)+n)%n,clamp01=v=>Math.min(.9999,Math.max(0,v));
  // Distance-driven phase for the chosen sheet; the fraction carries over between sheets.
  function stride(name,sign){gait.phase+=sign*gait.d/cycleOf(name);gait.sheet=name;return wrap(gait.phase*N,N);}
  const looped=(name,now)=>wrap(now/(info(name).durationMs||cfg.idleMs)*N,N),once=(p)=>Math.floor(clamp01(p)*N);
  function relative(){const ax=player.aimX,ay=player.aimY,l=Math.hypot(ax,ay)||1,fx=ax/l,fy=ay/l;return {fwd:gait.dx*fx+gait.dy*fy,side:gait.dx*-fy+gait.dy*fx};}
  function pickGun(k,now){
    const g=track(now),moving=player.moving&&g.speed>6,shooting=now-(typeof muzzleFlash!=='undefined'&&muzzleFlash.time||-1e9)<320,rel=relative();
    const reload=window.V010Combat?.reloading;
    if(reload&&reload.totalMs>0){const p=1-reload.remainingMs/reload.totalMs,s=moving?(g.run?'reload_run':'reload_walk'):'reload';return {name:k+'_'+s,frame:once(p)};}
    if(moving){
      if(Math.abs(rel.side)>Math.abs(rel.fwd)*1.2){const s=rel.side>0?'strafe_right':'strafe_left';return {name:k+'_'+s,frame:stride(k+'_'+s,1),aimed:true};}
      // Shooting on the move raises the rifle to the shoulder (the aimed run pose at walking pace).
      const s=g.run||shooting?'run':'walk';return {name:k+'_'+s,frame:stride(k+'_'+s,rel.fwd<-.2?-1:1),aimed:shooting};
    }
    if(shooting)return {name:k+'_fire',frame:looped(k+'_fire',now),aimed:true};
    return {name:k+'_idle',frame:looped(k+'_idle',now)};
  }
  let castAt=null;
  function pickRod(now){
    const ph=window.V012Fishing?.phase?.()||{kind:'idle'},vis=window.ActorVisuals?.fishingVisualPhase?.();
    if(vis?.kind==='reel')return {name:'fish_reel',frame:once(.35+.65*vis.p)};
    if(ph.kind==='cast')return {name:'fish_cast',frame:once(ph.p)};
    if(ph.kind==='reel')return {name:'fish_reel',frame:once(.35*ph.p)};
    if(ph.kind==='wait')return {name:'fish_wait',frame:looped('fish_wait',now)};
    return null;
  }
  function pick(item,p,now){
    const gun=cfg.guns?.[item];if(gun)return pickGun(gun,now);
    if(item==='fishing_rod'){const f=pickRod(now);if(f)return f;}
    const tool=item&&(item==='fishing_rod'?'rod':cfg.tools[item])||'';
    // Items with their own modular artwork and no hero sheets keep it; anything else in
    // the hands (resources, food) is drawn unarmed, as before.
    if(item&&!tool&&(actors.modular.items[item]||window.V09Craft?.weapons?.[item]))return null;
    if(p?.working&&p.work){
      const a=actors.modular.items[item]?.action;if(!a)return null;
      const hit=a.durations.slice(0,a.impactFrame).reduce((s,v)=>s+v,0)/a.duration,u=clamp01((p.localTime||0)/a.duration),c=cfg.strikeImpact/N;
      const f=u<hit?u/hit*c:c+(u-hit)/(1-hit)*(1-c);
      return {name:'strike_'+tool,frame:wrap(f*N,N)};
    }
    const g=track(now),moving=player.moving&&g.speed>6,suffix=tool?'_'+tool:'';
    if(moving){const name=(g.run?'run':'walk')+suffix,rel=relative();return {name,frame:stride(name,rel.fwd<-.2?-1:1)};}
    return {name:'idle'+suffix,frame:wrap(now/cfg.idleMs*N,N)};
  }
  // Hero sheets have their own small cache so that sheets of items no longer held can be
  // released (decoded RGBA is the real cost on phones, not the download size).
  const sheets=new Map(),BASE=new Set(['idle','walk','run']);
  function sheet(name){
    let r=sheets.get(name);if(r)return r;
    const id=cfg.sheets[name],d=AssetManifest.images[id];if(!d)return null;
    // Base sheets are never released: they live in the shared GameAssets cache, as does any
    // sheet something else has already requested there (one Image per resource).
    if(BASE.has(name)||GameAssets.stats().entries.some(e=>e.id===id)){
      r={shared:true,get ready(){return GameAssets.ready(id);},get im(){return GameAssets.image(id);},frames:d.atlas.frames};sheets.set(name,r);return r;
    }
    const im=new Image();r={im,ready:false,failed:false,frames:d.atlas.frames};sheets.set(name,r);
    im.decoding='async';
    im.onload=()=>{const done=()=>{if(sheets.get(name)===r)r.ready=!!im.naturalWidth;};typeof im.decode==='function'?im.decode().then(done,done):done();};
    im.onerror=()=>{r.failed=true;};im.src=d.path;return r;
  }
  const ready=name=>!!sheet(name)?.ready;
  function release(name){const r=sheets.get(name);if(!r)return;sheets.delete(name);if(r.shared)return;r.im.onload=null;r.im.onerror=null;if(typeof r.im.removeAttribute==='function')r.im.removeAttribute('src');}
  // Last drawn frame's attachment points in the world (muzzle for shots, rod tip for the line).
  let lastTip=null,lastTipAt=0;
  const used=new Map();
  // While an item sheet (re)loads, keep showing the hero from an already decoded base sheet.
  function fallback(choice,now){
    const g=gait,name=player.moving&&g.speed>6?(g.run?'run':'walk'):'idle';
    if(!ready(name))return null;
    return {name,frame:name==='idle'?wrap(now/cfg.idleMs*N,N):wrap(g.phase*N,N)};
  }
  function draw(p,item,aim){
    const now=performance.now();let choice=pick(item,p,now);if(!choice)return false;
    if(!cfg.sheets[choice.name])return false;
    if(!ready(choice.name)){choice=fallback(choice,now);if(!choice)return false;}
    used.set(choice.name,now);
    const r=sheet(choice.name),im=r.im,F=frameSize(choice.name),cell=r.frames[choice.frame],x=info(choice.name);
    if(!cell)return false;
    // While working, the modular stance offset keeps the strike on the tree or stone.
    let ox=0,oy=0;if(p?.working){const w=ActorVisuals.worldPoint(p,actors.modular.pivot);ox=w.x-player.x;oy=w.y-player.y;}
    // Aiming sheets turn back by the barrel's yaw so the muzzle points exactly at the aim.
    const angle=ActorVisuals.bodyAngle(p,aim)+(choice.aimed&&x.aimYaw?x.aimYaw:0);
    const s=cfg.units[choice.name]*unit/F,py=(x.pivotY??.5)*F;
    ctx.save();ctx.translate(player.x+ox,player.y+oy);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(visualScale,4*visualScale,17*visualScale,12*visualScale,0,0,TAU);ctx.fill();
    ctx.rotate(angle);ctx.scale(s,s);
    // Frames are trimmed and packed; ox/oy place the trimmed cel back inside its F×F cell.
    ctx.drawImage(im,cell.x,cell.y,cell.w,cell.h,-F/2+cell.ox,-py+cell.oy,cell.w,cell.h);
    ctx.restore();
    const t=x.tips?.[choice.frame];
    if(t){const c=Math.cos(angle),sn=Math.sin(angle),u=t[0]*unit,v=t[1]*unit;lastTip={x:player.x+ox+u*c-v*sn,y:player.y+oy+u*sn+v*c,item,scene:typeof scene==='undefined'?null:scene};lastTipAt=now;}else lastTip=null;
    return true;
  }
  function tipFor(item){return lastTip&&lastTip.item===item&&performance.now()-lastTipAt<250&&lastTip.scene===(typeof scene==='undefined'?null:scene)?{x:lastTip.x,y:lastTip.y}:null;}
  // Startup requests only the sheet actually drawn; walk and run are prefetched once a
  // hero frame has been shown, and an item's sheets the first time it is held.
  const itemSheets=item=>{
    const gun=cfg.guns?.[item],tool=item==='fishing_rod'?'rod':cfg.tools[item];
    return (gun?Object.keys(cfg.sheets).filter(n=>n.startsWith(gun+'_')):tool?['idle_','walk_','run_','strike_'].map(n=>n+tool).concat(tool==='rod'?['fish_cast','fish_wait','fish_reel']:[]):[]).filter(n=>cfg.sheets[n]);
  };
  let warmedBase=false,warmedItem=null;
  function warm(item,drawn){
    if(drawn&&!warmedBase){warmedBase=true;for(const n of BASE)sheet(n);}
    if(!drawn||!item||item===warmedItem)return;warmedItem=item;
    const now=performance.now();for(const n of itemSheets(item)){used.set(n,now);sheet(n);}
  }
  // Decoded sheets cost memory (RGBA), not download size. Sheets of items that are no longer
  // held are released after a minute; the base sheets and the held item's sheets stay.
  const RELEASE_MS=60000;let sweptAt=0;
  function sweep(item,now){
    if(now-sweptAt<5000)return;sweptAt=now;
    const keep=new Set(item?itemSheets(item):[]);
    for(const [n,t] of used)if(!BASE.has(n)&&!keep.has(n)&&now-t>RELEASE_MS){used.delete(n);release(n);}
    // Holding a released item again prefetches its sheets again.
    if(warmedItem&&warmedItem!==item)warmedItem=null;
  }
  return Object.freeze({loaded:()=>[...sheets].filter(([,r])=>r.ready).map(([n])=>n),draw:(p,item,aim)=>{const ok=draw(p,item,aim);warm(item,ok);sweep(item,performance.now());return ok;},muzzle:item=>cfg.guns?.[item]?tipFor(item):null,rodTip:()=>tipFor('fishing_rod'),config:cfg});
})();
