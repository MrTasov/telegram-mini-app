/* Equipment revision 4: presentation only. Existing aim, locomotion, work and rest owners remain
   authoritative. All images share GameAssets; no actor-local textures or saves. */
window.ActorVisuals=(()=>{
  const cfg=AssetManifest.actors,mod=cfg.modular,TAU=Math.PI*2,toolStarts=new WeakMap(),warmed=new Set();
  let catchVisual=null,repairVisual=null,impact=null;
  let sleepCanvas=null,sleepContext=null;
  // Renderer-only sampling: the existing locomotion stamp is authoritative.
  // Actual travelled distance handles analog input, sneak, blocked walls and
  // stairs without writing player state or starting a second movement clock.
  const walk={stamp:null,x:0,y:0,scene:null,phase:0,moving:false};
  const loop=(value,count)=>((Math.floor(value)%count)+count)%count;
  function unarmedMotion(){
    const stamp=player.walkAnimation,place=typeof scene==='undefined'?null:scene;
    if(stamp!==walk.stamp||place!==walk.scene){
      const delta=stamp-walk.stamp,dx=player.x-walk.x,dy=player.y-walk.y,d=Math.hypot(dx,dy);
      const limit=Math.max(20,(player.runSpeed||5.25)*.6*(delta/.21)*2);
      const continuous=walk.stamp!==null&&place===walk.scene&&delta>0&&d<=limit;
      walk.moving=!!player.moving&&continuous&&d>.01;
      if(walk.moving)walk.phase+=d/cfg.unarmed.cycleDistance*(dx*player.aimX+dy*player.aimY<-.01?-1:1);
      walk.stamp=stamp;walk.x=player.x;walk.y=player.y;walk.scene=place;
    }
    if(!player.moving)walk.moving=false;
    return walk;
  }
  function workState(item,now){
    if(playerDead||document.hidden)return null;
    if(item==='axe'&&chopState&&scene==='surface')return {key:chopState,elapsed:Math.max(0,Date.now()-chopState.startedAt),duration:chopState.duration,material:'wood',target:worldTrees.find(t=>t.id===chopState.id)};
    if(item==='pickaxe'&&scene==='surface'){
      const m=window.V09World?.miningState();
      if(m)return {key:m.id,elapsed:m.elapsed,duration:m.duration,material:'mineral',target:V09World.ores.find(o=>o.id===m.id)};
    }
    if(item==='hammer'){
      const job=window.V018Build?.job;
      if(job&&repairVisual?.job!==job)beginRepair(job,V018Build.record(job.id)?.object);
      const r=repairVisual;
      if(r&&heldItem()==='hammer'&&scene===r.scene&&movePower<=JOY_DEAD&&!navigation&&Math.hypot(player.x-r.x,player.y-r.y)<=.8&&(job===r.job||r.until&&now<r.until)){
        return {key:r.job,elapsed:now-r.at,duration:mod.items.hammer.action.duration,material:'metal',target:r.target};
      }
      repairVisual=null;
    }
    return null;
  }
  function beginRepair(job,target){const at=performance.now();toolStarts.set(job,at);repairVisual={job,target,at,scene:job.scene,x:job.x,y:job.y,until:null};}
  function finishRepair(job,completed){
    if(!repairVisual||repairVisual.job!==job)return;
    if(!completed){repairVisual=null;return;}
    const duration=mod.items.hammer.action.duration,r=repairVisual;
    // Small repairs can finish in one simulation tick. Complete the visible
    // stroke once, without postponing HP, consumption, saving or input.
    r.until=r.at+Math.max(1,Math.ceil((performance.now()-r.at)/duration))*duration;
  }
  function cancelRepair(){repairVisual=null;}
  function timedFrame(action,time){
    let elapsed=0;for(let i=0;i<action.durations.length;i++){elapsed+=action.durations[i];if(time<elapsed)return i;}return action.frames.length-1;
  }
  function framePose(item,mode,index=0){
    const entry=mod.items[item];if(!entry)return null;
    const rec=mode==='work'||mode==='catch'||mode==='wait'?entry.action?.frames[index]:mode==='walk'?entry.walk[index]:entry.idle;
    return rec?{kind:entry.body,id:rec.body.id,frame:index,item,modular:true,mode,record:rec,working:mode==='work'}:null;
  }
  function catchState(now){
    if(catchVisual&&(now-catchVisual.at>=mod.items.fishing_rod.action.duration||heldItem()!=='fishing_rod'||scene!==catchVisual.scene||playerDead||player.moving||Math.hypot(player.x-catchVisual.x,player.y-catchVisual.y)>2))catchVisual=null;
    return catchVisual;
  }
  function pose(item,now=performance.now()){
    const motion=unarmedMotion();
    const entry=mod.items[item];
    if(item==='rifle_m4')return null; // Existing M4 renderer, no new weapon art.
    if(!entry)return {kind:'unarmed',id:motion.moving?cfg.body.unarmed:cfg.unarmed.idle,frame:motion.moving?loop(motion.phase*cfg.unarmed.walkCount,cfg.unarmed.walkCount):0,item,hands:null,working:false};
    if(!warmed.has(item)){warmed.add(item);for(const id of entry.preload)void GameAssets.load(id);}
    if(item==='fishing_rod'){
      const caught=catchState(now);
      if(caught)return framePose(item,'catch',timedFrame(entry.action,now-caught.at));
      if(window.V012Fishing?.state)return framePose(item,'wait',0);
    }
    const work=workState(item,now);
    if(work){const elapsed=(work.elapsed%work.duration+work.duration)%work.duration,local=elapsed/work.duration*entry.action.duration;
      return {...framePose(item,'work',timedFrame(entry.action,local)),work,localTime:local};}
    return framePose(item,motion.moving?'walk':'idle',motion.moving?loop(motion.phase*mod.walkCount,mod.walkCount):0);
  }
  const bodyAngle=(p,aim)=>aim-Math.PI/2;
  function layersReady(rec){return [rec.body,rec.equipment,rec.cap,rec.gear?.rear,rec.gear?.front].filter(Boolean).map(l=>GameAssets.ready(l.id)).every(Boolean);}
  function drawLayer(layer){
    if(!layer)return;const b=GameAssets.frame(layer.id,layer.key);if(!b)return;
    ctx.drawImage(GameAssets.image(layer.id),b.x,b.y,b.w,b.h,...layer.offset,...layer.size);
  }
  function drawGear(gear,part){if(!gear?.[part])return;ctx.save();ctx.translate(...gear.position);ctx.rotate(gear.angle);ctx.scale(gear.flipX?-gear.scale:gear.scale,gear.scale);ctx.translate(-gear.grip[0],-gear.grip[1]);drawLayer(gear[part]);ctx.restore();}
  function workOffset(p,aim){
    if(!p.working||!p.work?.target)return {x:0,y:0};
    const a=mod.items[p.item].action,t=p.localTime/a.duration;
    const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);},weight=ease(t/.20)*ease((1-t)/.20);
    const point=contactPoint(p.work.target,player.x,player.y),angle=aim-Math.PI/2,ix=(a.impactPoint[0]-mod.pivot[0])*mod.scale,iy=(a.impactPoint[1]-mod.pivot[1])*mod.scale;
    // A presentation-only step/weight transfer into the existing interaction
    // reach. Never reposition the physical player or extend the tool/arms.
    return {x:(point.x-player.x-ix*Math.cos(angle)+iy*Math.sin(angle))*weight,y:(point.y-player.y-ix*Math.sin(angle)-iy*Math.cos(angle))*weight};
  }
  function worldPoint(p,point,x=player.x,y=player.y,aim=Math.atan2(player.aimY,player.aimX),recoil=0){
    const turn=bodyAngle(p,aim),dx=(point[0]-mod.pivot[0])*mod.scale,dy=(point[1]-mod.pivot[1])*mod.scale+recoil;
    const offset=workOffset(p,aim);
    return {x:x+offset.x+dx*Math.cos(turn)-dy*Math.sin(turn),y:y+offset.y+dx*Math.sin(turn)+dy*Math.cos(turn)};
  }
  function renderModular(p,x,y,aim,recoil){
    const r=p.record;if(!layersReady(r))return false;
    const offset=workOffset(p,aim);
    ctx.save();ctx.translate(x+offset.x,y+offset.y);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(1,4,17,12,0,0,TAU);ctx.fill();
    ctx.rotate(bodyAngle(p,aim));if(p.item==='rifle_ak74')ctx.translate(0,recoil);
    ctx.scale(mod.scale,mod.scale);ctx.translate(-mod.pivot[0],-mod.pivot[1]);
    drawGear(r.gear,'rear');if(!r.equipmentInFront)drawLayer(r.equipment);
    drawLayer(r.body);if(r.equipmentInFront)drawLayer(r.equipment);
    drawGear(r.gear,'front');drawLayer(r.cap);
    // The AK body includes both underhand palms. There is deliberately no
    // foreground hand cap: rear weapon -> body/palms -> front weapon.
    if(p.mode==='idle'||p.mode==='walk')drawProtection(256,256);
    ctx.restore();return true;
  }
  function drawProtection(ox=0,oy=0){
    if(equipment.body){ctx.strokeStyle='#748065';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(ox+137,oy+151);ctx.lineTo(ox+143,oy+218);ctx.moveTo(ox+247,oy+151);ctx.lineTo(ox+241,oy+218);ctx.stroke();}
    if(equipment.head){ctx.fillStyle='#485541';ctx.beginPath();ctx.ellipse(ox+192,oy+194,44,51,0,0,TAU);ctx.fill();ctx.strokeStyle='#768069';ctx.lineWidth=4;ctx.stroke();}
  }
  function renderPose(p,x,y,aim,recoil=0){
    if(p.modular)return renderModular(p,x,y,aim,recoil);
    if(!GameAssets.ready(p.id))return false;
    const im=GameAssets.image(p.id),b=GameAssets.frame(p.id,p.frame);if(!b)return false;
    const visual=cfg.unarmed;
    const angle=bodyAngle(p,aim),s=visual.bodyScale,[px,py]=visual.pivot;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(1,4,17,12,0,0,TAU);ctx.fill();
    ctx.rotate(angle);
    ctx.scale(s,s);ctx.translate(-px,-py);
    const body=()=>ctx.drawImage(im,b.x,b.y,b.w,b.h,0,0,b.w,b.h);
    body();
    drawProtection();
    ctx.restore();return true;
  }
  function impactSample(p){
    if(!p?.working||!p.work?.target)return null;
    const a=mod.items[p.item].action,start=a.durations.slice(0,a.impactFrame).reduce((s,v)=>s+v,0),age=(p.localTime-start)/a.duration*p.work.duration;
    return age>=0&&age<240?{age,frame:Math.min(5,Math.floor(age/40)),point:worldPoint(p,a.impactPoint),material:p.work.material,key:p.work.key}:null;
  }
  function drawContact(p){
    const hit=impactSample(p);if(!hit){impact=null;return;}
    // Freeze each ripple at the world contact; camera/aim/pose changes never
    // drag an already emitted ripple along with the hands.
    if(!impact||impact.key!==hit.key||hit.age<impact.age)impact={...hit,scene};
    impact.age=hit.age;if(impact.scene!==scene)return;
    const layer=mod.effects[hit.material][hit.frame];if(!GameAssets.ready(layer.id))return;
    ctx.save();ctx.translate(impact.point.x,impact.point.y);ctx.scale(.25,.25);drawLayer(layer);ctx.restore();
  }
  function drawPlayer(aim,item,recoil){const p=pose(item),ok=!!p&&renderPose(p,player.x,player.y,aim,recoil);if(ok)drawContact(p);return ok;}
  function muzzlePoint(){
    const p=pose(heldItem()),m=p?.record?.gear?.muzzle;if(!m)return null;
    const recoil=canFire()&&performance.now()-muzzleFlash.time<95?(V09Craft.weapons[p.item]?.visualRecoil??-2.4):0;
    return worldPoint(p,m,player.x,player.y,Math.atan2(player.aimY,player.aimX),recoil);
  }
  function fishCaught(spot){catchVisual={at:performance.now(),scene,x:player.x,y:player.y,spot:{waterX:spot.waterX,waterY:spot.waterY}};}
  function cancelFishing(){catchVisual=null;}
  function fishingVisualPhase(){const c=catchState(performance.now());return c?{kind:'reel',p:(performance.now()-c.at)/mod.items.fishing_rod.action.duration}:window.V012Fishing?.state?{kind:'wait',p:0}:null;}
  function drawFishingLine(){
    if(heldItem()!=='fishing_rod'||scene!=='surface'||playerDead)return false;
    const caught=catchState(performance.now()),state=window.V012Fishing?.state,spot=caught?.spot||state?.spot;
    if(!spot)return false;const p=pose('fishing_rod');if(!p?.record?.fishing||!layersReady(p.record))return false;
    const f=p.record.fishing,from=worldPoint(p,f.lineFrom),wait=mod.items.fishing_rod.action.frames[0].fishing;
    const pull=clamp((wait.lineTo[1]-f.lineTo[1])/145,0,1),near=worldPoint(p,f.lineTo),to={x:spot.waterX+(near.x-spot.waterX)*pull,y:spot.waterY+(near.y-spot.waterY)*pull};
    ctx.save();ctx.lineWidth=.85;ctx.strokeStyle='rgba(223,235,218,.8)';ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+to.x)/2,(from.y+to.y)/2+5,to.x,to.y);ctx.stroke();
    if(caught&&f.fishVisible&&GameAssets.ready(mod.fish.id)){
      ctx.save();ctx.translate(to.x,to.y);ctx.rotate(f.fishAngle+bodyAngle(p,Math.atan2(player.aimY,player.aimX)));ctx.scale(7/128,9/128);ctx.translate(-64,-64);drawLayer(mod.fish);ctx.restore();
    }else if(!caught||p.frame<4){ctx.fillStyle='#eee4c3';ctx.beginPath();ctx.ellipse(to.x,to.y,2,3.5,0,0,TAU);ctx.fill();ctx.fillStyle='#dc765e';ctx.fillRect(to.x-1.5,to.y-3,3,3);}
    ctx.restore();return true;
  }
  function drawSleep(bed,ms){
    const id=cfg.body.sleep;if(!GameAssets.ready(id))return false;
    const anim=cfg.sleep,t=(ms%anim.cycleMs)/anim.cycleMs*anim.count,index=loop(t,anim.count),fraction=t-Math.floor(t),im=GameAssets.image(id);
    const b=GameAssets.frame(id,index),s=anim.worldHeight/b.h,x=bed.x+(bed.w-b.w*s)/2+(anim.xOffset||0),y=bed.y+(bed.h-anim.worldHeight)/2+(anim.yOffset||0);
    // Blend premultiplied pixels offscreen so breathing never makes the body
    // translucent against the mattress. One reusable 192x288 canvas, allocated
    // only on the first sleep draw; no Image or canvas allocation per frame.
    if(!sleepCanvas){sleepCanvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(b.w,b.h):document.createElement('canvas');sleepCanvas.width=b.w;sleepCanvas.height=b.h;sleepContext=sleepCanvas.getContext('2d');}
    const c=sleepContext,next=GameAssets.frame(id,(index+1)%anim.count);
    c.globalCompositeOperation='copy';c.globalAlpha=1-fraction;c.drawImage(im,b.x,b.y,b.w,b.h,0,0,b.w,b.h);
    c.globalCompositeOperation='lighter';c.globalAlpha=fraction;c.drawImage(im,next.x,next.y,next.w,next.h,0,0,next.w,next.h);
    c.globalAlpha=1;c.globalCompositeOperation='source-over';ctx.drawImage(sleepCanvas,x,y,b.w*s,b.h*s);return true;
  }
  // Initial warmup is small; selecting an item warms only its shared carry/work
  // atlases. GameAssets owns every Image and settled promise, including errors.
  void GameAssets.load(cfg.unarmed.idle);
  return Object.freeze({pose,framePose,renderPose,drawPlayer,drawSleep,muzzlePoint,bodyAngle,worldPoint,impactSample,beginRepair,finishRepair,cancelRepair,fishCaught,cancelFishing,fishingVisualPhase,drawFishingLine,config:cfg});
})();
