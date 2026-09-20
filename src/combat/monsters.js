/* 0.19.0: quiet days, ten-day raids and persistent corpse poses.
   Keep existing damage, walls, navigation collision and inventory APIs. */
window.V017Monsters=(()=>{
  const specs=V010World.TYPES;
  Object.assign(specs,{
    normal:{name:'Заражённый',hp:120,radius:18,speed:.38,chaseSpeed:1.65,damage:12,cooldown:1050,art:'walker',size:76,color:'#937963',spawnOrder:0,behavior:'melee',healthColor:'#a6544d'},
    heavy:{name:'Громила',hp:420,radius:28,speed:.27,chaseSpeed:1.15,damage:34,cooldown:1450,art:'brute',size:116,color:'#826c5e',spawnOrder:1,behavior:'melee',healthColor:'#b57555'},
    fast:{name:'Ловчий',hp:65,radius:16,speed:.58,chaseSpeed:2.65,damage:7,cooldown:850,art:'runner',size:85,color:'#8b8074',spawnOrder:2,behavior:'melee',healthColor:'#a6544d'},
    leaper:{name:'Прыгун',hp:75,radius:17,speed:.44,chaseSpeed:1.9,damage:8,cooldown:1200,art:'leaper',size:86,color:'#9d9c77',spawnOrder:3,behavior:'leap',healthColor:'#a6544d',leap:{minRange:85,maxRange:195,cooldown:2700,speed:4,windup:255}},
    bloater:{name:'Взрывник',hp:240,radius:26,speed:.24,chaseSpeed:1.05,damage:0,cooldown:1800,art:'bloater',size:100,color:'#96925c',spawnOrder:4,behavior:'explosive',healthColor:'#aaa05e',blast:{playerRange:72,playerFraction:.15,playerVariation:.05,wallRange:78,wallDamage:320,triggerRange:58,fuseMs:650,wallFuseMs:850}}
  });
  const kinds=()=>Object.keys(specs).sort((a,b)=>(specs[a].spawnOrder??Infinity)-(specs[b].spawnOrder??Infinity));
  const typeAt=index=>{const ids=kinds();return ids[index%ids.length];};
  const SIDES=['N','E','S','W'],CORPSE_MS=90000;
  // Preserve the ACTUAL Day X contract, including cooldown and special attacks.
  const dayX=WorldEvents.dayX;
  function stats(z,raid){
    const s=specs[typeof z==='string'?z:z.type]||specs.normal;
    return WorldEvents.enemyStats(s,raid===undefined?WorldEvents.snapshot().modifiers:raid?WorldEvents.xModifiers:WorldEvents.none);
  }
  let runtime=new WeakMap(),serial=0,lastPopulation=0,effects=[],neighbors=new Map(),lastRaid=null;
  const night=()=>V016Lighting.daylight()<.28;
  const isDayX=(day,minute=WorldClock.minute)=>day===undefined?WorldEvents.isActive('day_x'):WorldEvents.matches('day_x',day,minute);
  const factor=()=>WorldEvents.value('enemy.mechanics');
  const targetCount=()=>Math.min(dayX.maxPopulation,Math.round((dayX.ordinaryPopulation*WorldEvents.value('spawn.intensity'))*V010World.settings.enemyCount));
  const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const angleOf=a=>((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  const insideOuter=z=>z.x>242&&z.x<1358&&z.y>202&&z.y<998;
  const insideInner=z=>z.x>642&&z.x<958&&z.y>452&&z.y<728;
  function nearestSide(z){const x=(z.x-800)/630,y=(z.y-600)/470;return Math.abs(x)>Math.abs(y)?x<0?'W':'E':y<0?'N':'S';}
  function prepare(z,legacy=false){
    if(!specs[z.type])z.type='normal';const raid=isDayX(),s=stats(z);
    const changed=z.raid019!==raid;
    if(!z.monster017){z.health=z.alive?Math.max(.001,clamp(z.health/(z.maxHealth||100),0,1)*s.hp):0;z.monster017=true;}
    else if(changed||z.maxHealth!==s.hp){const previous=z.maxHealth||stats(z,z.raid019===true).hp;z.health=z.alive?clamp(z.health/previous,0,1)*s.hp:0;}
    z.raid019=raid;
    z.maxHealth=s.hp;z.radius=s.radius;z.speed=s.speed;z.chaseSpeed=s.chaseSpeed;
    if(!runtime.has(z)){const id=++serial;runtime.set(z,{id,angle:z.wanderAngle||0,walk:0,nextSense:0,sees:false,target:null,retarget:0,attack:0,jump:null,fuse:0,exploded:false,deadAt:z.alive?0:performance.now(),stuck:0,side:nearestSide(z),variant:Math.floor(hash(id*23)*3),deathAngle:angleOf(z.wanderAngle||0),retired:false,pauseUntil:0});}
    const r=runtime.get(z);
    if(changed){r.side=nearestSide(z);r.target=null;r.retarget=0;r.nextSense=0;r.fuse=0;r.jump=null;r.sees=false;}
    return r;
  }
  const sameLevel=()=>scene==='surface'&&!V013City.floor;
  const point=(z,o)=>({x:clamp(z.x,o.x,o.x+o.w),y:clamp(z.y,o.y,o.y+o.h)});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function wallApproach(z,o){
    const p=point(z,o),cx=o.x+o.w/2,cy=o.y+o.h/2;
    if(o.w>o.h){p.x=clamp(z.x,o.x+Math.min(20,o.w/2),o.x+o.w-Math.min(20,o.w/2));p.y=z.y<cy?o.y-z.radius-2:o.y+o.h+z.radius+2;}
    else {p.y=clamp(z.y,o.y+Math.min(20,o.h/2),o.y+o.h-Math.min(20,o.h/2));p.x=z.x<cx?o.x-z.radius-2:o.x+o.w+z.radius+2;}
    return p;
  }
  function chooseWall(z,now){
    const r=prepare(z),inside=insideOuter(z);if(!isDayX()||insideInner(z)){r.target=null;return null;}
    const eligible=o=>(o.sides?o.sides.includes(r.side):o.side===r.side)&&(inside?o.group==='inner':['outer','gate'].includes(o.group)&&o.id!=='v091innerGate');
    if(r.target?.hp>0&&!V015Base.isOpen(r.target)&&eligible(r.target)&&now<r.retarget)return r.target;
    const candidates=V015Base.sections.filter(o=>o.hp>0&&!V015Base.isOpen(o)&&eligible(o));
    let best=null,cost=Infinity;
    for(let i=0;i<candidates.length;i++){
      const o=candidates[i],p=wallApproach(z,o),d=dist(z,p),ratio=o.hp/o.maxHp;
      // Only a minority seek damaged walls, and only after substantial damage.
      const weakness=r.id%3===0&&ratio<.7?Math.min(180,(.7-ratio)*300):0;
      const score=d+hash(r.id*37+i)*100-weakness;
      if(score<cost){cost=score;best=o;}
    }
    r.target=best;r.retarget=now+6500+hash(r.id)*5500;return best;
  }
  function passage(z,wall){
    const r=prepare(z),inner=insideOuter(z);if(insideInner(z))return null;
    let best=null,cost=Infinity;
    for(const o of V015Base.sections){
      if(!(o.sides?o.sides.includes(r.side):o.side===r.side)||(inner?o.group!=='inner':!['outer','gate'].includes(o.group)||o.id==='v091innerGate')||o.hp>0&&!V015Base.isOpen(o))continue;
            if(o.corner){
        const nx=o.corner.includes('W')?-1:1,ny=o.corner.includes('N')?-1:1,cx=o.x+o.w/2,cy=o.y+o.h/2,offset=o.w/2+z.radius+12;
        const outside={x:cx+nx*offset,y:cy+ny*offset},inside={x:cx-nx*(o.w/2+6),y:cy-ny*(o.h/2+6)},d=dist(z,outside);
        if(d<cost&&(!wall||d<dist(z,wallApproach(z,wall))+150)&&lineClear(outside.x,outside.y,inside.x,inside.y,z.radius,'surface')&&lineClear(z.x,z.y,outside.x,outside.y,z.radius,'surface')){best={wall:o,outside,inside};cost=d;}
        continue;
      }
      const vertical=r.side==='W'||r.side==='E',margin=Math.max(0,((vertical?o.h:o.w)-z.radius*2-8)/2),nx=r.side==='W'?-1:r.side==='E'?1:0,ny=r.side==='N'?-1:r.side==='S'?1:0;
      for(const lane of [0,margin,-margin]){
        const cx=o.x+o.w/2+(vertical?0:lane),cy=o.y+o.h/2+(vertical?lane:0),offset=(vertical?o.w:o.h)/2+z.radius+12;
        const outside={x:cx+nx*offset,y:cy+ny*offset},inside={x:cx-nx*offset,y:cy-ny*offset},d=dist(z,outside);
        if(d<cost&&(!wall||d<dist(z,wallApproach(z,wall))+150)&&lineClear(outside.x,outside.y,inside.x,inside.y,z.radius,'surface')&&lineClear(z.x,z.y,outside.x,outside.y,z.radius,'surface')){best={wall:o,outside,inside};cost=d;}
      }
    }
    return best;
  }
  function move(z,a,step,straight=false){
    const r=prepare(z),sign=r.id%2?1:-1;
    for(const offset of straight?[0]:[0,.45*sign,-.45*sign,.95*sign,-.95*sign,1.5*sign,-1.5*sign]){
      const angle=a+offset,dx=Math.cos(angle),dy=Math.sin(angle),n=Math.max(1,Math.ceil(step/3));let clear=true;
      for(let i=1;i<=n;i++)if(worldCollision(z.x+dx*step*i/n,z.y+dy*step*i/n,z.radius,'surface')){clear=false;break;}
      if(clear){z.x+=dx*step;z.y+=dy*step;r.angle=angle;r.walk+=step;return true;}
    }return false;
  }
  function canHurt(z,range){return sameLevel()&&!playerDead&&!V091Fortress.isElevated()&&dist(z,player)<=range&&lineClear(z.x,z.y,player.x,player.y,0,'surface');}
  function armFuse(r,now,ms){r.fuse=now+ms;r.fuseAt=now;r.fuseDuration=ms;}
  function explode(z){
    const r=prepare(z),boost=factor(),blast=stats(z,false).blast||specs.bloater.blast;if(r.exploded)return false;r.exploded=true;r.fuse=0;
    effects.push({x:z.x,y:z.y,at:performance.now(),seed:r.id,boost});if(effects.length>24)effects.shift();
    // A distant kill is harmless; a point-blank kill has the same contact blast.
    if(canHurt(z,blast.playerRange*boost)){
      const hp=Math.max(1,player.maxHealth||100),amount=hp*(blast.playerFraction+hash(r.id)*blast.playerVariation)*boost;
      // Compensate existing armor so the specified blast removes 15–20% max HP.
      damagePlayer(amount/Math.max(.01,1-equippedArmor()/100));
    }
    for(const o of isDayX()?[...V015Base.walls(),...(window.V018Build?.closedDoors()||[])]:[]){
      const p=point(z,o);if(dist(z,p)>blast.wallRange*boost)continue;
      const blocker=V015Base.blocker(z,{x:o.x+o.w/2,y:o.y+o.h/2});
      if((!blocker||blocker.wall?.id===o.id)&&lineClear(z.x,z.y,p.x,p.y,0,'surface',o.id)){if(window.V018Build)V018Build.damage(o,blast.wallDamage*boost);else V015Base.damage(o,blast.wallDamage*boost);}
    }
    return true;
  }
  const oldHit=hitZombie;hitZombie=function(z,...args){if(z)prepare(z);const alive=z?.alive,out=oldHit(z,...args);if(alive&&!z.alive){const r=prepare(z);r.deadAt=performance.now();r.deathAngle=angleOf(r.angle-Math.PI/2);r.jump=null;r.target=null;if(stats(z,false).behavior==='explosive')explode(z);}return out;};
  function detonate(z){explode(z);if(z.alive)hitZombie(z,z.health+1,{fixedDamage:true});}
  function sideCounts(){const out={N:0,E:0,S:0,W:0};for(const z of zombies)if(z.alive)out[prepare(z).side]++;return out;}
  function spawn(index,near=isDayX()||index%2===0,side=null){
    const type=typeAt(index),s=stats(type);let p=null;
    if(isDayX()&&!side){const counts=sideCounts();side=[...SIDES].sort((a,b)=>counts[a]-counts[b])[0];}
    for(let a=0;a<64&&!p;a++){
      let x,y;
      if(near){const front=side||SIDES[(index+a)%4],t=hash(index*71+a+serial),extra=Math.floor(a/8)*300;
        if(front==='W'){x=70-t*230-extra;y=60+hash(index+a*7)*1100;}else if(front==='E'){x=1530+t*260+extra;y=60+hash(index+a*7)*1100;}else if(front==='N'){x=80+t*1430;y=20-hash(index+a*7)*250-extra;}else{x=80+t*1430;y=1300+hash(index+a*7)*280+extra;}}
      else {const base=V010World.spawnAt(index+a);x=base.x;y=base.y;}
      if(!worldCollision(x,y,s.radius,'surface')&&(!sameLevel()||Math.hypot(x-player.x,y-player.y)>380)&&(!sameLevel()||!visibleOnScreen(x,y,110)))p={x,y};
    }
    if(!p)return null;
    const z=makeZombie(p.x,p.y);z.type=type;z.worldId='m19_'+(++serial);const r=prepare(z);if(side)r.side=side;return z;
  }
  function population(now,force=false){
    if(!force&&now-lastPopulation<1800)return;lastPopulation=now;
    const count=targetCount();let living=zombies.filter(z=>z.alive).length,added=0,removed=0;
    // Preserve the released population/corpse pool policy. Surplus actors retire only
    // out of sight, without fake kills, rewards, blood or death explosions.
    for(let i=zombies.length-1;i>=0&&living>count&&removed<4;i--){
      const z=zombies[i],r=prepare(z),drone=window.V014Robots?.state;
      if(!z.alive||r.sees||window.V0105?.target===z||drone?.task==='attack'&&drone.targetId===z.instanceId||sameLevel()&&(dist(z,player)<700||visibleOnScreen(z.x,z.y,130)))continue;
      z.alive=false;z.health=0;z.state='wander';z.corpseAt011=Date.now()-CORPSE_MS;r.retired=true;r.deadAt=now-CORPSE_MS;r.target=null;r.fuse=0;r.jump=null;stopZombieAudio(z);living--;removed++;
    }
    for(let i=0;i<zombies.length&&living<count&&added<4;i++){
      const z=zombies[i],r=prepare(z);if(z.alive||!r.retired&&now-r.deadAt<CORPSE_MS)continue;
      const next=spawn(i);if(next){zombies[i]=next;living++;added++;}
    }
    while(living<count&&zombies.length<144&&added<4){const z=spawn(zombies.length);if(!z)break;zombies.push(z);living++;added++;}
    if(added||removed)queueGameSave();
  }
  function syncEvent(){
    const raid=isDayX();
    if(lastRaid!==raid){if(lastRaid!==null)message(raid?'День X · монстры усилены на 50%':'День X закончился');lastRaid=raid;lastPopulation=-Infinity;for(const z of zombies)prepare(z);}
  }
  // Stats switch at the exact clock boundary. Keep the existing notification
  // timing in the simulation tick (restore/preview must not add journal rows).
  WorldEvents.onChange(()=>{if(!GameSave.restoring){lastPopulation=-Infinity;for(const z of zombies)prepare(z);}});
  function updateMonsters(){
    syncEvent();const raid=isDayX();
    if(GameFlow.paused)return;
    const now=performance.now(),boost=factor(),dt=Math.min(2,Math.max(0,frameScale));population(now);
    neighbors.clear();for(const z of zombies)if(z.alive){const key=Math.floor(z.x/80)+','+Math.floor(z.y/80);if(!neighbors.has(key))neighbors.set(key,[]);neighbors.get(key).push(z);}
    for(const z of zombies){
      const r=prepare(z);if(!z.alive)continue;const s=stats(z),d=dist(z,player);
      if(sameLevel()&&d<ZOMBIE_AUDIO_RADIUS&&visibleOnScreen(z.x,z.y,60)&&now>(z.lastGrowl||0)){playZombieBuffer(z);z.lastGrowl=now+3500+hash(r.id+Math.floor(now/1000))*4500;}
      if(now>=r.nextSense){r.nextSense=now+190+hash(r.id)*100;r.sees=sameLevel()&&!V091Fortress.isElevated()&&d<(V010World.sneaking?130:240)*boost&&lineClear(z.x,z.y,player.x,player.y,0,'surface');}
      if(r.jump){
        const j=r.jump,t=(now-j.start)/j.duration;
        if(now-j.start<(j.windup??255)){r.attack=now;continue;}
        if(t>=1||!move(z,j.angle,(j.speed||4)*dt,true)){r.jump=null;if(canHurt(z,z.radius+player.radius+14))damagePlayer(s.damage*V010World.settings.enemyStrength);z.lastAttack=now;}
        continue;
      }
      if(r.fuse){if(now>=r.fuse)detonate(z);continue;}
      if(r.sees){r.sawPlayerAt=now;r.lastSeen={x:player.x,y:player.y};}
      if(raid&&window.V018Build?.enemyDoorStep(z,s,r,now,dt,false))continue;
      let target=null,wall=null;
      // Until its own front is breached a raider keeps that front, even when
      // the player becomes visible through a distant opening on another side.
      const holdFront=raid&&!insideOuter(z)&&(scene==='bunker'||sameLevel()&&insideOuter(player));
      if(r.sees&&!holdFront){z.state='chase';target=player;r.target=null;
        if(s.behavior==='explosive'&&canHurt(z,s.blast.triggerRange*boost)){armFuse(r,now,s.blast.fuseMs/boost);continue;}
        if(s.behavior==='leap'&&d>s.leap.minRange&&d<s.leap.maxRange*boost&&now-z.lastAttack>s.leap.cooldown/boost){const speed=s.leap.speed*boost,windup=s.leap.windup/boost;r.jump={start:now,windup,duration:windup+Math.max(1,d-z.radius-player.radius)/speed/60*1000,speed,angle:Math.atan2(player.y-z.y,player.x-z.x)};z.lastAttack=now;continue;}
        if(s.behavior!=='explosive'&&canHurt(z,z.radius+player.radius+9)&&now-z.lastAttack>s.cooldown){
          z.lastAttack=now;r.attack=now+400;damagePlayer(s.damage*V010World.settings.enemyStrength);
        }
      }else if(raid){
        z.state='chase';wall=chooseWall(z,now);if(wall)target=wallApproach(z,wall);
        const gap=passage(z,wall);
        if(gap){target=lineClear(z.x,z.y,gap.inside.x,gap.inside.y,z.radius,'surface')?gap.inside:gap.outside;wall=null;}
        if(!target)target=r.sees?player:{x:800,y:590};
        // Airlock panels can block a southern squad's approach. Damage only
        // the first actual obstruction, never strike through it at another wall.
        const obstruction=V015Base.blocker(z,target,z.radius+2);
        if(obstruction&&obstruction.wall!==wall){wall=obstruction.wall;target=wallApproach(z,wall);}
        if(wall&&dist(z,point(z,wall))<z.radius+13){
          if(s.behavior==='explosive'){armFuse(r,now,s.blast.wallFuseMs/boost);continue;}
          if(now-z.lastAttack>s.cooldown){V015Base.damage(wall,s.damage*2*V010World.settings.enemyStrength);z.lastAttack=now;r.attack=now+400;}
          r.angle=Math.atan2(wall.y+wall.h/2-z.y,wall.x+wall.w/2-z.x);continue;
        }
      }else{z.state='wander';r.target=null;r.lastSeen=null;}
      let angle;
      if(target)angle=Math.atan2(target.y-z.y,target.x-z.x);
      else {if(now>z.nextWanderChange){const h=hash(r.id+Math.floor(now/1000));z.wanderAngle=h*Math.PI*2;z.nextWanderChange=now+4000+h*3000;r.pauseUntil=now+600+hash(r.id*11+Math.floor(now/1000))*1600;}if(now<r.pauseUntil)continue;angle=z.wanderAngle;}
      // Local separation softens crowds without a global all-pairs scan.
      let sx=0,sy=0;const gx=Math.floor(z.x/80),gy=Math.floor(z.y/80);
      for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)for(const other of neighbors.get((gx+ox)+','+(gy+oy))||[]){if(other===z)continue;const dx=z.x-other.x,dy=z.y-other.y,d2=dx*dx+dy*dy,min=z.radius+other.radius;if(d2>1&&d2<min*min){const d=Math.sqrt(d2);sx+=dx/d*(1-d/min);sy+=dy/d*(1-d/min);}}
      angle=Math.atan2(Math.sin(angle)+sy*.6,Math.cos(angle)+sx*.6);
      const moved=move(z,angle,(target?s.chaseSpeed:s.speed)*.5*dt);
      r.stuck=moved?0:r.stuck+dt*16.667;
      if(r.stuck>1800){r.retarget=0;r.target=null;z.nextWanderChange=0;r.stuck=0;}
    }
    effects=effects.filter(e=>now-e.at<700);
  }
  updateZombies=updateMonsters;
  function healthBar(z){
    if(!z.alive||!visibleOnScreen(z.x,z.y,100))return;
    const s=specs[z.type]||specs.normal,w=s.radius*1.5+10,y=z.y-s.size*.5-5;
    ctx.save();ctx.fillStyle='#0a1415dd';ctx.fillRect(z.x-w/2-1,y-1,w+2,5);ctx.fillStyle=s.healthColor||'#a6544d';ctx.fillRect(z.x-w/2,y,w*clamp(z.health/z.maxHealth,0,1),3);ctx.restore();
  }
  // Common presentation for every registered monster, not a list of types.
  function selectionRadius(z){
    const s=specs[z.type],body=Number.isFinite(z.visualSize)?z.visualSize:Number.isFinite(z.size)?z.size:s?.size;
    return Math.max(12,Number.isFinite(z.radius)?z.radius:0,Number.isFinite(body)?body/2:0)+6;
  }
  function drawTarget(){
    const z=window.V0105?.target;
    if(!z?.alive||!sameLevel()||playerDead||!zombies.includes(z))return;
    const radius=selectionRadius(z);if(!visibleOnScreen(z.x,z.y,radius+8))return;
    const zoom=Math.max(.1,V010Camera.zoom||1);
    ctx.save();ctx.globalAlpha*=.85;ctx.strokeStyle='#ff8275';ctx.lineWidth=2/zoom;
    ctx.beginPath();ctx.arc(z.x,z.y,radius,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function corpseOpacity(z,now=performance.now()){
    if(z.alive)return 1;
    const r=prepare(z);if(r.retired)return 0;
    return .6*clamp((CORPSE_MS-Math.max(0,now-r.deadAt))/15000,0,1);
  }
  function drawCorpse(z){
    const r=prepare(z),age=Math.max(0,performance.now()-r.deadAt);if(r.retired||age>=CORPSE_MS)return;
    const s=specs[z.type],key='corpse_'+s.art+'019',im=V011Art.image(key);if(!V011Art.ready(key))return;
    const b=V011Art.frame(key,r.variant);if(!b)return;
    const size=s.size*1.16*(AssetManifest.images[GameAssets.artId('monster_'+s.art+'017')].visualScale||1),scale=size/Math.max(b.w,b.h),w=b.w*scale,h=b.h*scale;
    ctx.save();ctx.translate(z.x,z.y);ctx.rotate(r.deathAngle);ctx.globalAlpha*=corpseOpacity(z);ctx.drawImage(im,b.x,b.y,b.w,b.h,-w/2,-h/2,w,h);ctx.restore();
  }
  drawZombie=function(z){
    if(!visibleOnScreen(z.x,z.y,120))return;if(!z.alive){drawCorpse(z);return;}const r=prepare(z),s=specs[z.type],now=performance.now();
    const key='monster_'+s.art+'017',visual=AssetManifest.images[GameAssets.artId(key)],anim=visual.animation,size=s.size*(visual.visualScale||1);
    const attack=r.attack>now||r.jump||r.fuse,progress=r.jump?(now-r.jump.start)/r.jump.duration:r.fuse?(now-(r.fuseAt??now))/(r.fuseDuration||850):1-(r.attack-now)/400;
    const frame=attack?anim.attack.start+Math.min(anim.attack.count-1,Math.max(0,Math.floor(progress*anim.attack.count))):anim.walk.start+Math.floor(r.walk/(anim.walk.distance/anim.walk.count))%anim.walk.count;
    const im=V011Art.image(key),jump=r.jump?Math.sin(clamp((now-r.jump.start-(r.jump.windup??255))/(r.jump.duration-(r.jump.windup??255)),0,1)*Math.PI)*24:0;
    ctx.save();ctx.translate(z.x,z.y);
    ctx.fillStyle='#07121155';ctx.beginPath();ctx.ellipse(3,7,s.radius*1.05,s.radius*.65,0,0,Math.PI*2);ctx.fill();ctx.translate(0,-jump);ctx.rotate(r.angle-Math.PI/2);
    if(V011Art.ready(key)){const b=V011Art.frame(key,frame);ctx.drawImage(im,b.x,b.y,b.w,b.h,-size*.375,-size*.5,size*.75,size);}
    else {ctx.fillStyle=s.color;ctx.beginPath();ctx.ellipse(0,0,s.radius,s.radius*1.2,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    if(r.fuse&&z.alive){ctx.save();ctx.strokeStyle='#e9b57b';ctx.globalAlpha=.3+.4*Math.sin(now/70)**2;ctx.lineWidth=2;ctx.beginPath();ctx.arc(z.x,z.y,z.radius+7,0,Math.PI*2);ctx.stroke();ctx.restore();}
  };
  const drawActors=V0141Trees.drawActors;V0141Trees.drawActors=function(){drawActors();if(scene!=='surface'||V013City.floor)return;drawTarget();for(const z of zombies)healthBar(z);
    for(const e of effects){const boost=e.boost||1;if(!visibleOnScreen(e.x,e.y,100*boost))continue;const t=clamp((performance.now()-e.at)/700,0,1);ctx.save();ctx.globalAlpha=(1-t)*.65;ctx.strokeStyle='#b2a274';ctx.lineWidth=8*(1-t)+1;ctx.beginPath();ctx.arc(e.x,e.y,(12+t*62)*boost,0,Math.PI*2);ctx.stroke();for(let i=0;i<9;i++){const a=i*2.4+e.seed;ctx.fillStyle='#7e8061';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*t*60*boost,e.y+Math.sin(a)*t*60*boost,(3+8*(1-t))*boost,0,Math.PI*2);ctx.fill();}ctx.restore();}
  };
  GameSave.extend('capture','combat.monsters',function(capture){
    const now=performance.now();zombies.forEach(z=>prepare(z));const d=capture();
    d.monsters017={schema:2,types:zombies.map(z=>z.type),actors:zombies.map(z=>{const r=prepare(z);return{raid:z.raid019,side:r.side,variant:r.variant,deathAngle:r.deathAngle,corpseMs:z.alive?0:clamp(now-r.deadAt,0,CORPSE_MS),retired:r.retired};})};return d;
  });
  function validate(d){
    if(!d)return;const m=d.monsters017;if(!m)return;
    if(![1,2].includes(m.schema)||!Array.isArray(d.zombies)||!Array.isArray(m.types)||m.types.length!==d.zombies.length||m.types.length>144)throw Error('Неверные данные монстров');
    if(m.schema===2&&(!Array.isArray(m.actors)||m.actors.length!==m.types.length||m.actors.some((p,i)=>!p||typeof p.raid!=='boolean'||!SIDES.includes(p.side)||!Number.isInteger(p.variant)||p.variant<0||p.variant>2||!Number.isFinite(p.deathAngle)||p.deathAngle<0||p.deathAngle>=Math.PI*2||!Number.isFinite(p.corpseMs)||p.corpseMs<0||p.corpseMs>CORPSE_MS||typeof p.retired!=='boolean'||p.retired&&d.zombies[i].alive||d.zombies[i].alive&&p.corpseMs!==0)))throw Error('Неверное состояние монстров');
    if(m.types.some((t,i)=>!specs[t]||d.zombies[i].health>stats(t,m.schema===2&&m.actors[i].raid).hp||d.v010?.modules?.world?.types?.[i]!==t))throw Error('Неверные данные монстров');
  }
  GameSave.extend('decode','combat.monsters',function(decode,raw){validate(JSON.parse(raw));return decode(raw);});
  GameSave.extend('restore','combat.monsters',function(restore,d){
    validate(d);restore(d);runtime=new WeakMap();effects=[];lastPopulation=performance.now();lastRaid=isDayX();
    zombies.forEach((z,i)=>{
      const saved=d.monsters017?.schema===2?d.monsters017.actors[i]:null;
      if(d.monsters017){z.type=d.monsters017.types[i];z.monster017=true;z.raid019=saved?.raid??false;z.health=d.zombies[i].health;z.maxHealth=stats(z,z.raid019).hp;}
      else {z.monster017=false;z.health=d.zombies[i].health;z.maxHealth=100;}
      const r=prepare(z);
      if(saved){r.side=saved.side;r.variant=saved.variant;r.deathAngle=saved.deathAngle;r.retired=saved.retired;r.deadAt=z.alive?0:performance.now()-saved.corpseMs;}
      else if(!z.alive)r.deadAt=performance.now()-clamp(Date.now()-(z.corpseAt011??Date.now()-CORPSE_MS),0,CORPSE_MS);
      if(!d.monsters017&&worldCollision(z.x,z.y,z.radius,'surface')){const p=V015Base.freePoint(z.x,z.y,z.radius);if(p){z.x=p.x;z.y=p.y;}}
    });
  });
  const reset=resetZombies;resetZombies=function(){reset();runtime=new WeakMap();effects=[];zombies.forEach((z,i)=>{z.type=typeAt(i);z.monster017=false;z.health=100;z.maxHealth=100;prepare(z);});};
  zombies.forEach((z,i)=>{z.type=typeAt(i);prepare(z);});
  return{specs,stats,dayX,typeAt,prepare,night,isDayX,factor,targetCount,spawn,population,sideCounts,move,chooseWall,passage,canHurt,explode,armFuse,update:updateMonsters,healthBar,drawCorpse,selectionRadius,drawTarget,corpseOpacity,validate,corpseMs:CORPSE_MS,get effects(){return effects;},state:z=>prepare(z)};
})();
