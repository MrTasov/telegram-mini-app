/* 0.29: presentation only. Existing aim, locomotion, work and rest owners remain
   authoritative. All images share GameAssets; no actor-local textures or saves. */
window.ActorVisuals=(()=>{
  const cfg=AssetManifest.actors,TAU=Math.PI*2,toolStarts=new WeakMap();
  let sleepCanvas=null,sleepContext=null;
  const loop=(value,count)=>((Math.floor(value)%count)+count)%count;
  function workPhase(item,now){
    if(item==='axe'&&chopState)return Math.max(0,Date.now()-chopState.startedAt)/cfg.toolStrike.cycleMs;
    if(item==='pickaxe'){
      const m=window.V09World?.miningState();
      if(m)return m.elapsed/(m.duration/2);
    }
    if(item==='hammer'&&window.V018Build?.job){
      const job=V018Build.job;if(!toolStarts.has(job))toolStarts.set(job,now);
      return (now-toolStarts.get(job))/cfg.toolStrike.cycleMs;
    }
    return null;
  }
  function pose(item,now=performance.now()){
    const gear=cfg.items[item],kind=gear?.body||'unarmed';
    // These pre-existing specialty items keep their established renderer.
    if(!gear&&['rifle_m4','fishing_rod','remote','flashlight'].includes(item))return null;
    const work=kind==='tool'?workPhase(item,now):null;
    const gait=loop(player.walkAnimation/TAU*cfg.walkCount,cfg.walkCount);
    const backwards=typeof moveX!=='undefined'&&moveX*player.aimX+moveY*player.aimY<-.15;
    const frame=work!==null?cfg.toolStrike.start+loop(work*cfg.toolStrike.count,cfg.toolStrike.count):backwards?(cfg.walkCount-gait)%cfg.walkCount:gait;
    const idle=!player.moving&&work===null,id=idle?cfg.body.idle:cfg.body[kind];
    return {kind,id,frame:idle?cfg.idle.frames[kind]:frame,item,hands:kind==='unarmed'?null:idle?cfg.idle[kind+'Hands']:cfg[kind+'Hands'][frame],working:work!==null};
  }
  const handAngle=p=>p.hands?Math.atan2(p.hands[1][1]-p.hands[0][1],p.hands[1][0]-p.hands[0][0]):Math.PI/2;
  const bodyAngle=(p,aim)=>aim-(p.kind==='rifle'?handAngle(p):Math.PI/2);
  function renderPose(p,x,y,aim,recoil=0){
    const gear=cfg.items[p.item];
    if(!GameAssets.ready(p.id)||gear&&!GameAssets.ready(cfg.equipment))return false;
    const im=GameAssets.image(p.id),b=GameAssets.frame(p.id,p.frame);if(!b)return false;
    const angle=bodyAngle(p,aim),s=cfg.bodyScale,[px,py]=cfg.pivot;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(1,4,17,12,0,0,TAU);ctx.fill();
    ctx.rotate(angle);
    if(recoil&&gear?.body==='rifle'){const a=handAngle(p);ctx.translate(Math.cos(a)*recoil,Math.sin(a)*recoil);}
    ctx.scale(s,s);ctx.translate(-px,-py);
    const body=()=>ctx.drawImage(im,b.x,b.y,b.w,b.h,0,0,b.w,b.h);
    body();
    if(gear){
      const frame=GameAssets.frame(cfg.equipment,gear.frame),scale=gear.scale/s,hand=p.hands[0];
      ctx.save();ctx.translate(hand[0],hand[1]);ctx.rotate(handAngle(p)-Math.PI/2);
      ctx.drawImage(GameAssets.image(cfg.equipment),frame.x,frame.y,frame.w,frame.h,-gear.grip[0]*scale,-gear.grip[1]*scale,frame.w*scale,frame.h*scale);ctx.restore();
      // Restore just the fingers above the shaft/receiver; both grips share pose
      // anchors. The tool can slide between hands without changing its length.
      ctx.save();ctx.beginPath();for(const h of p.hands){ctx.moveTo(h[0]+7,h[1]);ctx.arc(h[0],h[1],7,0,TAU);}ctx.clip();body();ctx.restore();
    }
    // Equipped protection stays visible; inventory/armor stats remain untouched.
    if(equipment.body){ctx.strokeStyle='#748065';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(75,68);ctx.lineTo(79,103);ctx.moveTo(117,68);ctx.lineTo(113,103);ctx.stroke();}
    if(equipment.head){ctx.fillStyle='#485541';ctx.beginPath();ctx.ellipse(96,45,22,24,0,0,TAU);ctx.fill();ctx.strokeStyle='#768069';ctx.lineWidth=2;ctx.stroke();}
    ctx.restore();return true;
  }
  function drawPlayer(aim,item,recoil){const p=pose(item);return !!p&&renderPose(p,player.x,player.y,aim,recoil);}
  function muzzlePoint(){
    const p=pose(heldItem()),gear=p&&cfg.items[p.item];if(!gear?.muzzle)return null;
    const a=handAngle(p),turn=bodyAngle(p,Math.atan2(player.aimY,player.aimX)),h=p.hands[0],s=cfg.bodyScale;
    const dx=(gear.muzzle[0]-gear.grip[0])*gear.scale,dy=(gear.muzzle[1]-gear.grip[1])*gear.scale,r=a-Math.PI/2;
    const x=(h[0]-cfg.pivot[0])*s+dx*Math.cos(r)-dy*Math.sin(r),y=(h[1]-cfg.pivot[1])*s+dx*Math.sin(r)+dy*Math.cos(r);
    return {x:player.x+x*Math.cos(turn)-y*Math.sin(turn),y:player.y+x*Math.sin(turn)+y*Math.cos(turn)};
  }
  function drawSleep(bed,ms){
    const id=cfg.body.sleep;if(!GameAssets.ready(id))return false;
    const anim=cfg.sleep,t=(ms%anim.cycleMs)/anim.cycleMs*anim.count,index=loop(t,anim.count),fraction=t-Math.floor(t),im=GameAssets.image(id);
    const b=GameAssets.frame(id,index),s=anim.worldHeight/b.h,x=bed.x+(bed.w-b.w*s)/2,y=bed.y+(bed.h-anim.worldHeight)/2;
    // Blend premultiplied pixels offscreen so breathing never makes the body
    // translucent against the mattress. One reusable 192x288 canvas, allocated
    // only on the first sleep draw; no Image or canvas allocation per frame.
    if(!sleepCanvas){sleepCanvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(b.w,b.h):document.createElement('canvas');sleepCanvas.width=b.w;sleepCanvas.height=b.h;sleepContext=sleepCanvas.getContext('2d');}
    const c=sleepContext,next=GameAssets.frame(id,(index+1)%anim.count);
    c.globalCompositeOperation='copy';c.globalAlpha=1-fraction;c.drawImage(im,b.x,b.y,b.w,b.h,0,0,b.w,b.h);
    c.globalCompositeOperation='lighter';c.globalAlpha=fraction;c.drawImage(im,next.x,next.y,next.w,next.h,0,0,next.w,next.h);
    c.globalAlpha=1;c.globalCompositeOperation='source-over';ctx.drawImage(sleepCanvas,x,y,b.w*s,b.h*s);return true;
  }
  // A single shared warmup prepares all player states before equipment changes.
  void GameAssets.load(cfg.body.idle);
  return Object.freeze({pose,renderPose,drawPlayer,drawSleep,muzzlePoint,bodyAngle,config:cfg});
})();
