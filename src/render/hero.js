/* Hero 1: the 3D character (Tripo model, Mixamo motion) pre-rendered from above.
   Presentation only. ActorVisuals keeps pose, work timing, stance, impact and sound;
   this module draws a frame in place of the body when a sheet exists for the held
   item. Anything else (firearms, flashlight, remote, fishing rod) keeps the modular
   renderer, and so does any frame whose image has not loaded yet. */
window.HeroVisual=(()=>{
  const actors=AssetManifest.actors,cfg=actors.hero;if(!cfg)return null;
  const visualScale=actors.visualScale||1,TAU=Math.PI*2,F=cfg.frameSize,N=cfg.frames,COLS=cfg.columns;
  // Renderer-local gait tracking from the travelled distance, so the feet never slide
  // at any analog speed. It never writes player state.
  const gait={x:null,y:null,t:0,scene:null,speed:0,phase:0,run:false};
  function track(now){
    const place=typeof scene==='undefined'?null:scene,dt=now-gait.t;
    if(gait.x===null||place!==gait.scene||dt<=0||dt>500){gait.x=player.x;gait.y=player.y;gait.t=now;gait.scene=place;gait.speed=0;return gait;}
    const dx=player.x-gait.x,dy=player.y-gait.y,d=Math.hypot(dx,dy);
    if(d>60){gait.x=player.x;gait.y=player.y;gait.t=now;return gait;} // teleport, stairs, load
    const k=1-Math.exp(-dt/110);gait.speed+=(d/dt*1000-gait.speed)*k;
    if(!player.moving&&gait.speed<6)gait.speed=0;
    if(gait.speed>cfg.runSpeed.on)gait.run=true;else if(gait.speed<cfg.runSpeed.off)gait.run=false;
    const cycle=cfg.cycleUnits[gait.run?'run':'walk']*cfg.worldPerUnit*visualScale;
    const backward=dx*player.aimX+dy*player.aimY<-.01*d;
    if(d>.01)gait.phase+=(backward?-1:1)*d/cycle;
    gait.x=player.x;gait.y=player.y;gait.t=now;return gait;
  }
  const wrap=(v,n)=>((Math.floor(v)%n)+n)%n;
  function pick(item,p,now){
    // Items with their own modular artwork (firearms, flashlight, remote, rod) keep it;
    // anything else in the hands (resources, food) is drawn unarmed, as before.
    const tool=item&&cfg.tools[item]||'';if(item&&!tool&&(actors.modular.items[item]||window.V09Craft?.weapons?.[item]))return null;
    if(p?.working&&p.work){
      // Match the modular action: the game's impact moment lands on our contact frame.
      const a=actors.modular.items[item]?.action;if(!a)return null;
      const hit=a.durations.slice(0,a.impactFrame).reduce((s,v)=>s+v,0)/a.duration,u=Math.min(.9999,Math.max(0,(p.localTime||0)/a.duration)),c=cfg.strikeImpact/N;
      const f=u<hit?u/hit*c:c+(u-hit)/(1-hit)*(1-c);
      return {name:'strike_'+tool,frame:wrap(f*N,N)};
    }
    const g=track(now),moving=player.moving&&g.speed>6,suffix=tool?'_'+tool:'';
    if(moving)return {name:(g.run?'run':'walk')+suffix,frame:wrap(g.phase*N,N)};
    return {name:'idle'+suffix,frame:wrap(now/cfg.idleMs*N,N)};
  }
  function draw(p,item,aim){
    const now=performance.now(),choice=pick(item,p,now);if(!choice)return false;
    const id=cfg.sheets[choice.name];if(!id)return false;
    if(!GameAssets.ready(id)){void GameAssets.load(id);return false;}
    const im=GameAssets.image(id),col=choice.frame%COLS,row=Math.floor(choice.frame/COLS);
    // While working, the modular stance offset keeps the strike on the tree or stone.
    let ox=0,oy=0;if(p?.working){const w=ActorVisuals.worldPoint(p,actors.modular.pivot);ox=w.x-player.x;oy=w.y-player.y;}
    const s=cfg.units[choice.name]*cfg.worldPerUnit*visualScale/F;
    ctx.save();ctx.translate(player.x+ox,player.y+oy);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(visualScale,4*visualScale,17*visualScale,12*visualScale,0,0,TAU);ctx.fill();
    ctx.rotate(ActorVisuals.bodyAngle(p,aim));ctx.scale(s,s);
    ctx.drawImage(im,col*F,row*F,F,F,-F/2,-F/2,F,F);
    ctx.restore();return true;
  }
  // Startup requests only the sheet actually drawn; walk and run are prefetched once a
  // hero frame has been shown, and a tool's sheets the first time it is held. Until an
  // image is ready the modular renderer keeps drawing the player.
  let warmedBase=false,warmedTool=null;
  function warm(item,drawn){
    if(drawn&&!warmedBase){warmedBase=true;for(const n of ['idle','walk','run'])void GameAssets.load(cfg.sheets[n]);}
    const t=item&&cfg.tools[item];if(!t||t===warmedTool)return;warmedTool=t;for(const n of ['idle_','walk_','run_','strike_'])void GameAssets.load(cfg.sheets[n+t]);}
  return Object.freeze({draw:(p,item,aim)=>{const ok=draw(p,item,aim);warm(item,ok);return ok;},config:cfg});
})();
