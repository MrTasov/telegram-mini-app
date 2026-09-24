/* =====================================================
   NOISE SYSTEM
===================================================== */

let noiseEvent = {
  x:0,
  y:0,
  radius:0,
  time:0
};

function createNoise(x,y,radius){

  noiseEvent.x = x;
  noiseEvent.y = y;
  noiseEvent.radius = radius;
  noiseEvent.time = performance.now();

}

/* =====================================================
   ZOMBIES
===================================================== */

function makeZombie(x,y,instanceId){

  return GameIdentity.attachEnemy({

    x:x,
    y:y,

    spawnX:x,
    spawnY:y,

    radius:17,

    health:100,
    maxHealth:100,

    alive:true,

    state:"wander",

    speed:.65,
    chaseSpeed:1.45,

    wanderAngle:
      Math.random() *
      Math.PI * 2,

    nextWanderChange:
      performance.now() +
      1000 +
      Math.random()*2000,

    lastAttack:0,

    hitFlash:0,

    deathTime:0,

    lastGrowl:
      performance.now() +
      2000 +
      Math.random()*5000

  },instanceId);

}

let zombies = [];

function resetZombies(){zombies=outsideSpawns.map(p=>makeZombie(p.x,p.y));}

resetZombies();

/* =====================================================
   0.4.8 FIXED TWIN-STICK
   No floating bases. Each joystick stays in one fixed,
   symmetric position. Only the inner knob follows the finger.
===================================================== */

let moveX=0, moveY=0, movePower=0;
let rightAimActive=false, aimPower=0;
let leftPointerId=null, rightPointerId=null;

const JOY_RADIUS=46;
const JOY_DEAD=.14;
const RUN_THRESHOLD=.72;

const moveControl=el("moveControl");
const moveStick=el("moveStick");
const aimControl=el("aimControl");
const aimStick=el("aimStick");

function centerJoystickKnob(stick){
  stick.style.left="50%";
  stick.style.top="50%";
  stick.style.marginLeft="0";
  stick.style.marginTop="0";
  stick.style.transform="translate(-50%,-50%)";
}

function setFixedJoystick(control,x,y){
  control.style.left=(x-JOY_RADIUS)+"px";
  control.style.top=(y-JOY_RADIUS)+"px";
  control.style.right="auto";
  control.style.bottom="auto";
  control.style.transform="none";
  control.classList.remove("hiddenJoystick");
}

function fixedGeometry(){
  const w=window.innerWidth,h=window.innerHeight;
  const layout=layouts[orientation()]||defaults[orientation()];
  return {leftX:w*layout.move.x,leftY:h*layout.move.y,rightX:w*layout.aim.x,rightY:h*layout.aim.y,actionX:w*layout.action.x,actionY:h*layout.action.y};
}

function positionFixedControls(){
  const g=fixedGeometry();

  setFixedJoystick(moveControl,g.leftX,g.leftY);
  setFixedJoystick(aimControl,g.rightX,g.rightY);

  centerJoystickKnob(moveStick);
  centerJoystickKnob(aimStick);

  const action=el("actionButton");
  if(action){
    action.style.left=g.actionX+"px";
    action.style.top=g.actionY+"px";
    action.style.right="auto";
    action.style.bottom="auto";
    action.style.transform="translate(-50%,-50%)";
  }
}

function fixedVector(stick,cx,cy,x,y){
  const dx=x-cx;
  const dy=y-cy;
  const distance=Math.hypot(dx,dy);
  const maxDistance=30;

  let drawX=dx;
  let drawY=dy;

  if(distance>maxDistance){
    const k=maxDistance/distance;
    drawX*=k;
    drawY*=k;
  }

  stick.style.transform=
    `translate(calc(-50% + ${drawX}px),calc(-50% + ${drawY}px))`;

  const len=distance||1;

  return {
    x:dx/len,
    y:dy/len,
    power:Math.min(1,distance/maxDistance)
  };
}

function uiTouch(target){
  return !!(
    target && target.closest &&
    target.closest("button,.overlay,.panel,.menuCard,.workshopPanel")
  );
}

function joystickCenters(){
  const g=fixedGeometry();
  return {
    left:{x:g.leftX,y:g.leftY},
    right:{x:g.rightX,y:g.rightY}
  };
}

const JOY_TOUCH_RADIUS=JOY_RADIUS+10;
function joystickAt(x,y){
  if(window.GameInput&&!GameInput.isMobile)return null;
  const c=joystickCenters(),left=distance(x,y,c.left.x,c.left.y),right=distance(x,y,c.right.x,c.right.y);
  if(Math.min(left,right)>JOY_TOUCH_RADIUS)return null;
  return left<=right?'left':'right';
}
function beginJoystick(e){
  const side=joystickAt(e.clientX,e.clientY),centers=joystickCenters();
  if(window.V014Controls?.beginStick(e,side))return;
  if(side==='left'&&leftPointerId===null){
    objectPointer=null;
    leftPointerId=e.pointerId;
    const v=fixedVector(moveStick,centers.left.x,centers.left.y,e.clientX,e.clientY);
    GameActions.dispatch('MOVE',{kind:'vector',...v,begin:true});
  }else if(side==='right'&&rightPointerId===null){
    objectPointer=null;
    rightPointerId=e.pointerId;
    const v=fixedVector(aimStick,centers.right.x,centers.right.y,e.clientX,e.clientY);
    GameActions.dispatch('AIM',v);
    if(v.power>JOY_DEAD)GameActions.dispatch('FIRE',{active:true,immediate:true});
  }else return;
  try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}
  e.preventDefault();
}
function handleWorldPointerDown(e){
  if(!GameActions.playable()||uiTouch(e.target)||e.button>0)return;
  if(joystickAt(e.clientX,e.clientY)){beginJoystick(e);return;}
  const {x,y}=screenToWorld(e.clientX,e.clientY);
  const pickupTarget=hitInteraction(x,y);if(window.GamePickup?.begin(pickupTarget?.id,e)){e.preventDefault();return;}
  if(GameActions.dispatch('WORLD_TARGET',{x,y})){e.preventDefault();return;}
  if(objectPointer||leftPointerId!==null||rightPointerId!==null){
    const target=GameMovement.parallelTarget(x,y);
    if(target){GameActions.dispatch('INTERACT',{id:target.id,kind:target.kind});e.preventDefault();}
    return;
  }
  objectPointer={id:e.pointerId,x:e.clientX,y:e.clientY,target:hitInteraction(x,y),point:{x,y},screenX:e.clientX,screenY:e.clientY,startedAt:performance.now(),following:false,nextPathAt:0,scene,pc:!GameInput.isMobile};
  try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}
  e.preventDefault();
}
function handleWorldPointerMove(e){
  if(window.GamePickup?.move(e)){e.preventDefault();return;}
  if(objectPointer&&objectPointer.id===e.pointerId){
    objectPointer.screenX=e.clientX;objectPointer.screenY=e.clientY;
    if(distance(e.clientX,e.clientY,objectPointer.x,objectPointer.y)>10){
      if(objectPointer.pc&&objectPointer.target)objectPointer.cancelled=true;else startPointerFollow();
    }
    e.preventDefault();return;
  }
  if(window.V014Controls?.moveStick(e))return;
  const centers=joystickCenters();
  if(e.pointerId===leftPointerId){
    const v=fixedVector(moveStick,centers.left.x,centers.left.y,e.clientX,e.clientY);
    GameActions.dispatch('MOVE',{kind:'vector',...v});e.preventDefault();
  }
  if(e.pointerId===rightPointerId){
    const v=fixedVector(aimStick,centers.right.x,centers.right.y,e.clientX,e.clientY);
    GameActions.dispatch('AIM',v);GameActions.dispatch('FIRE',{active:v.power>JOY_DEAD});e.preventDefault();
  }
}
function handleWorldPointerUp(e){
  if(window.GamePickup?.up(e)){e.preventDefault();return;}
  if(objectPointer&&objectPointer.id===e.pointerId){
    const tap=objectPointer;objectPointer=null;
    if(!GameActions.playable()||tap.scene!==scene||tap.cancelled)return;
    if(tap.following){GameActions.dispatch('MOVE',{...screenToWorld(e.clientX,e.clientY),following:true});return;}
    if(uiTouch(e.target))return;
    if(tap.target){
      // Moving objects may have changed position since pointerdown. Keep the
      // selected identity, but use its current interaction geometry on release.
      GameActions.dispatch('INTERACT',{id:tap.target.id,kind:tap.target.kind});
    }else GameActions.dispatch('MOVE',tap.point);
  }
}
function cancelWorldPointer(e){
  if(window.GamePickup?.up(e,true))return;
  if(objectPointer?.id===e.pointerId){if(objectPointer.following)cancelNavigation();objectPointer=null;}
}
function startPointerFollow(){
  if(!objectPointer||objectPointer.following)return;
  objectPointer.following=true;objectPointer.target=null;
  cancelNavigation();cancelChop();cancelSearch();
}
function updatePointerFollow(){
  const p=objectPointer;if(!p||menuOpen||playerDead)return;
  if(!p.following&&!p.target&&performance.now()-p.startedAt>=180)startPointerFollow();
  if(!p.following)return;
  const {x,y}=screenToWorld(p.screenX,p.screenY),now=performance.now();
  const clear=lineClear(player.x,player.y,x,y,player.radius,scene);
  if(!clear&&now<p.nextPathAt)return;
  if(p.lastX!==undefined&&distance(x,y,p.lastX,p.lastY)<2&&navigation)return;
  p.nextPathAt=now+140;p.lastX=x;p.lastY=y;
  GameActions.dispatch('MOVE',{x,y,following:true});
}

function releaseFixedStick(e){
  if(e.pointerId===leftPointerId){
    leftPointerId=null;
    GameActions.dispatch('MOVE',{kind:'vector',power:0});
    stopFootsteps();
    centerJoystickKnob(moveStick);
  }

  if(e.pointerId===rightPointerId){
    rightPointerId=null;
    GameActions.dispatch('AIM',{active:false});
    GameActions.dispatch('FIRE',{active:false});
    centerJoystickKnob(aimStick);

    if(movePower>JOY_DEAD){
      player.aimX=moveX;
      player.aimY=moveY;
    }
  }
}

// Release/cancel listeners are owned by GameInput for both modes.

window.addEventListener("resize",positionFixedControls);

if(window.visualViewport){
  window.visualViewport.addEventListener("resize",positionFixedControls);
}

centerJoystickKnob(moveStick);
centerJoystickKnob(aimStick);
setTimeout(positionFixedControls,0);
setTimeout(positionFixedControls,250);

/* =====================================================
   BULLETS / SHOOTING
===================================================== */

const bullets = [];

let firing = false;
let lastShot = 0;

function shoot(){
  if(menuOpen||playerDead||!canFire()||document.hidden)return;
  if(magazine<=0){if(bagCount('ammo')>0)reloadWeapon();else message('Нет патронов');return;}
  const now=performance.now();if(now-lastShot<155)return;lastShot=now;magazine--;updateAmmoHud();
  const length=Math.hypot(player.aimX,player.aimY)||1,dx=player.aimX/length,dy=player.aimY/length;
  const x=player.x+dx*43,y=player.y+dy*43;
  if(lineClear(player.x,player.y,x,y,2,scene)){
    bullets.push({x,y,dx:dx*12,dy:dy*12,radius:3,life:80});
    muzzleFlash.time=now;muzzleFlash.x=x;muzzleFlash.y=y;
  }
  playGunshot();createNoise(player.x,player.y,550);
}


const muzzleFlash = {
  x:0,
  y:0,
  time:0
};

function hitZombie(zombie,damage=25){
  queueGameSave();

  zombie.health -= damage;

  zombie.hitFlash =
    performance.now();

  zombie.state =
    "chase";

  if(zombie.health>0)GameAudio.play('hit',{x:zombie.x,y:zombie.y,scene:'surface',owner:zombie});

  if(zombie.health <= 0){

    zombie.health = 0;

    zombie.alive = false;

    // A dead zombie must never keep growling.
    stopZombieAudio(zombie);
    GameAudio.play('zombieDeath',{x:zombie.x,y:zombie.y,scene:'surface',rate:zombie.type==='heavy'?.8:1});

    zombie.deathTime =
      performance.now();

  }

}

function updateBullets(){
  if(firing)shoot();
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i],vx=b.dx*frameScale,vy=b.dy*frameScale,steps=Math.max(1,Math.ceil(Math.hypot(vx,vy)/3));let removed=false;
    for(let n=0;n<steps;n++){
      const x=b.x+vx/steps,y=b.y+vy/steps;
      if(worldCollision(x,y,b.radius,scene)){GameAudio.play('impactStone',{x,y,scene});removed=true;break;}
      b.x=x;b.y=y;
      if(scene==='surface'){
        const hit=zombies.find(z=>z.alive&&distance(x,y,z.x,z.y)<z.radius+b.radius);
        if(hit){hitZombie(hit,b.damage??25);removed=true;break;}
      }
    }
    b.life-=frameScale;if(removed||b.life<=0)bullets.splice(i,1);
  }
}


function bunkerGeometryBlocked(x,y,r){return !BunkerLayout.containsFloor(x,y);}

/* =====================================================
   MOVEMENT / FOOTSTEPS
===================================================== */

function updatePlayer(){

  if(GameFlow.paused){
    return;
  }

  GamePassages.approach(navigation);
  updateAutoWalk();
  player.moving = movePower > JOY_DEAD;
  player.running = movePower >= RUN_THRESHOLD;

  if(!player.moving){
    return;
  }

  const length=Math.hypot(moveX,moveY)||1;
  const x=moveX/length;
  const y=moveY/length;

  // Fully analog movement:
  // just outside deadzone = 20% of max;
  // full joystick = 100%;
  // new maximum = half of the old maximum run speed.
  const newMaxSpeed=player.runSpeed*.60;
  const normalizedPower=clamp((movePower-JOY_DEAD)/(1-JOY_DEAD),0,1);
  let speed=newMaxSpeed*(.20+.80*normalizedPower)*frameScale;
  if(navigation){const p=navigation.points[navigation.index];if(p)speed=Math.min(speed,distance(player.x,player.y,p.x,p.y));}
  const oldX=player.x,oldY=player.y;

  const collision =
    scene === "surface"
    ? surfaceCollision
    : bunkerCollision;

  const newX =
    player.x +
    x*speed;

  const newY =
    player.y +
    y*speed;

  if(
    !collision(
      newX,
      player.y
    )
  ){
    player.x = newX;
  }

  if(
    !collision(
      player.x,
      newY
    )
  ){
    player.y = newY;
  }

  if(navigation&&!navigation._pointerFollow){
    navigation.blockedMs=distance(oldX,oldY,player.x,player.y)<.05?navigation.blockedMs+16.67*frameScale:0;
    if(navigation.blockedMs>600&&!navigation.map014){cancelNavigation();message('Проход занят. Выберите другой путь');}
  }
  player.walkAnimation += .21*frameScale;

  const now =
    performance.now();

  if(
    now -
    player.lastFootstep
    >
    430
  ){

    player.lastFootstep =
      now;

    /* footsteps handled by looped WebAudio */

    if(scene === "surface"){

      createNoise(
        player.x,
        player.y,
        120
      );

    }

  }

}

/* =====================================================
   PLAYER DAMAGE
===================================================== */

function damagePlayer(amount){
  queueGameSave();

  if(playerDead){
    return;
  }

  // 0.7.0: body armor reduces incoming damage. Durability is intentionally
  // not consumed yet; we first test the core equipment/armor loop.
  const armorPct=equippedArmor();
  const finalDamage=Math.max(1,Math.round(amount*(1-armorPct/100)));
  cancelChop();
  player.health -= finalDamage;

  if(player.health < 0){
    player.health = 0;
  }

  I18n.assign(el("healthText"),"textContent","❤️ " +
    Math.round(player.health) +
    "/" +
    Math.round(player.maxHealth));

  playSound(
    sounds.playerHit,
    .8
  );

  const flash =
    el("damageFlash");

  flash.classList.add(
    "show"
  );

  setTimeout(
    function(){

      flash.classList.remove(
        "show"
      );

    },
    120
  );

  if(player.health <= 0){
    killPlayer();
  }

}

function killPlayer(){

  playerDead = true;
  window.GameChapterOne?.onDeath();

  movePower = 0;
  firing = false;

  menuOpen = true;

  el("deathOverlay").classList.add(
    "open"
  );

}

function respawn(){
  stopControls();gateOpen=false;invalidateGeometry();
  queueGameSave();

  player.health =
    player.maxHealth;

  I18n.assign(el("healthText"),"textContent","❤️ "+Math.round(player.health)+"/"+Math.round(player.maxHealth));

  scene =
    "surface";
  window.CommandCoreUI?.syncLocation();

  player.x =
    800;

  player.y =
    860;

  player.aimX =
    0;

  player.aimY =
    -1;

  bullets.length =
    0;

  resetZombies();

  playerDead =
    false;

  menuOpen =
    false;

  I18n.assign(el("locationName"),"textContent","БАЗА");

  el("deathOverlay").classList.remove(
    "open"
  );

}

el("respawnButton").addEventListener(
  "click",
  respawn
);

/* =====================================================
   ZOMBIE AI
===================================================== */

function zombieCanMoveTo(x,y){return !worldCollision(x,y,17,'surface');}
function updateZombies(){
  if(scene!=='surface'||GameFlow.paused)return;
  const now=performance.now();
  for(const z of zombies){
    if(!z.alive)continue;
    const d=distance(player.x,player.y,z.x,z.y),visible=lineClear(z.x,z.y,player.x,player.y,0,'surface');
    const safeWall=!gateOpen&&!inFortress(z.x,z.y)&&inFortress(player.x,player.y);
    const hears=now-noiseEvent.time<650&&distance(z.x,z.y,noiseEvent.x,noiseEvent.y)<noiseEvent.radius;
    if(!safeWall&&((d<270&&visible)||hears))z.state='chase';
    if(safeWall||d>430)z.state='wander';
    if(d<ZOMBIE_AUDIO_RADIUS&&visibleOnScreen(z.x,z.y,35)&&now>z.lastGrowl){playZombieBuffer(z);z.lastGrowl=now+3500+Math.random()*4500;}
    let dx=0,dy=0;
    if(z.state==='chase'){
      if(d<34&&visible&&now-z.lastAttack>950){z.lastAttack=now;damagePlayer(10);}
      if(d>31){
        if(lineClear(z.x,z.y,player.x,player.y,z.radius,'surface')){dx=(player.x-z.x)/d;dy=(player.y-z.y)/d;z.path=null;}
        else{
          if(!z.nextPathAt||now>z.nextPathAt){z.nextPathAt=now+1200;z.path=findWalkPath(z.x,z.y,{id:'player',x:player.x,y:player.y,r:0,range:30},'surface',17);z.pathIndex=0;}
          let p=z.path?.[z.pathIndex];if(p&&distance(z.x,z.y,p.x,p.y)<4)p=z.path[++z.pathIndex];
          if(p){const n=distance(z.x,z.y,p.x,p.y)||1;dx=(p.x-z.x)/n;dy=(p.y-z.y)/n;}
        }
      }
    }else{
      if(now>z.nextWanderChange){z.wanderAngle=Math.random()*Math.PI*2;z.nextWanderChange=now+1800+Math.random()*3000;}
      dx=Math.cos(z.wanderAngle);dy=Math.sin(z.wanderAngle);
    }
    const speed=(z.state==='chase'?z.chaseSpeed:z.speed)*.5*frameScale;
    let moved=false;
    if(zombieCanMoveTo(z.x+dx*speed,z.y)){z.x+=dx*speed;moved=true;}
    if(zombieCanMoveTo(z.x,z.y+dy*speed)){z.y+=dy*speed;moved=true;}
    if(!moved&&z.state==='wander')z.nextWanderChange=0;
  }
}


function updateCamera(){
  const targetX=player.x-screenWidth/2;
  const targetY=player.y-screenHeight/2;

  if(scene==="bunker"){
    // The bunker is larger than one viewport and uses negative world coordinates.
    // Never clamp to the old bunker bounds: camera follows the player everywhere.
    camera.x += (targetX-camera.x)*0.16;
    camera.y += (targetY-camera.y)*0.16;
    return;
  }

  camera.x += (targetX-camera.x)*0.12;
  camera.y += (targetY-camera.y)*0.12;

  const minX=surface.minX??0;
  const maxX=Math.max(minX,(surface.maxX??surface.width)-screenWidth);
  const maxY=Math.max(0,surface.height-screenHeight);
  camera.x=clamp(camera.x,minX,maxX);
  camera.y=clamp(camera.y,0,maxY);
}


// =====================================================
// FARM ACTION HELPERS — 0.6.18
// Uses the same contextual hand button as hatch/storage/workshop.
// =====================================================
window.farmCrops = [
  {name:"Картофель",icon:"🥔",itemType:"potato"},
  {name:"Морковь",icon:"🥕",itemType:"carrot"},
  {name:"Помидоры",icon:"🍅",itemType:"tomato"},
  {name:"Кукуруза",icon:"🌽",itemType:"corn"},
  {name:"Зерно",icon:"🌾",itemType:"grain"},
  {name:"Фасоль",icon:"🫘",itemType:"beans"},
  {name:"Лук",icon:"🧅",itemType:"onion"},
  {name:"Ягоды",icon:"🍓",itemType:"berries"},
  {name:"Лекарственные",icon:"🌿",itemType:"medicinal_herbs"},
  {name:"Технические",icon:"🌻",itemType:"technical_crop"}
];
window.farmState = window.farmState || Array.from({length:5},()=>({crop:null,plantedAt:0}));
const FARM_GROW_TIME = 15*60000;
// Game balance, not a universal agricultural calendar; berries use established seedlings.
const FARM_CROP_MINUTES=[18,13,16,15,19,10,17,12.5,9.5,20];
function farmGrowMs(crop){return (FARM_CROP_MINUTES[crop]??15)*60000;}
function farmElapsed(st,d,now){const total=farmGrowMs(st.crop);const elapsed=d.farmClock===1?st.elapsedMs:Math.min(1,st.elapsedMs/45000)*total;return Math.min(total,elapsed+(AgricultureTime.available?Math.max(0,now-d.savedAt):0));}
function farmTimeLabel(ms){const sec=Math.max(0,Math.ceil(ms/1000));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}

function getFarmBeds(){
  const f=bunker.farm;
  const cropLeft=f.cropLeft ?? 90;
  return [
    {x:cropLeft+75,  y:f.top+55, w:205, h:535},
    {x:cropLeft+305, y:f.top+55, w:205, h:535},
    {x:cropLeft+535, y:f.top+55, w:205, h:535},
    {x:cropLeft+765, y:f.top+55, w:205, h:535},
    {x:cropLeft+995, y:f.top+55, w:205, h:535}
  ];
}

function nearestFarmBed(){
  if(scene!=="bunker") return null;
  const beds=getFarmBeds();
  const margin=20; // visible bed + small interaction border
  let best=null, bestD=Infinity;

  for(let i=0;i<beds.length;i++){
    const b=beds[i];

    // Player is on the bed or immediately beside its visible edge.
    if(
      player.x >= b.x-margin &&
      player.x <= b.x+b.w+margin &&
      player.y >= b.y-margin &&
      player.y <= b.y+b.h+margin
    ){
      const nx=clamp(player.x,b.x,b.x+b.w);
      const ny=clamp(player.y,b.y,b.y+b.h);
      const d=distance(player.x,player.y,nx,ny);
      if(d<bestD){bestD=d;best=i;}
    }
  }
  return best;
}

function useFarmBed(i){
  window.V011Farm?.settle();
  queueGameSave();
  const st=window.farmState[i];
  if(!st) return;

  if(st.crop!==null){
    const elapsed=Date.now()-st.plantedAt;
    if(elapsed>=farmGrowMs(st.crop)){
      const crop=window.farmCrops[st.crop];

      // Every crop is now its own real backpack object/resource.
      // Each new crop yields 50 units. Legacy partial harvests retain their exact remainder.
      // If the backpack was previously full, collect only the remaining amount.
      const harvestAmount=st.harvestLeft ?? 50;
      const itemType=crop.itemType;

      // addItem() returns the amount that DID NOT fit.
      const left=addItem(itemType,harvestAmount);
      const collected=harvestAmount-left;
      if(collected>0&&window.V010)V010.emit('harvested',{type:itemType,qty:collected});

      if(collected<=0){
        message("🎒 В рюкзаке нет места");
        return;
      }

      if(left>0){
        // Keep the remaining harvest on the bed so nothing disappears.
        window.farmState[i].harvestLeft=left;
        message(crop.icon+" Собрано: "+collected+" • осталось: "+left);
        return;
      }

      message(crop.icon+" Собрано: "+collected+" → рюкзак");
      window.farmState[i]={crop:null,plantedAt:0};
    }else{
      const left=Math.max(1,Math.ceil((farmGrowMs(st.crop)-elapsed)/(1000*(window.V011Farm?.state.water<=0?.35:1))));
      message("🌱 До урожая "+farmTimeLabel(left*1000)+(window.V011Farm?.state.water>0?" · автополив":" · без воды рост замедлен"));
    }
    return;
  }

  window.activeFarmBed=i;
  I18n.assign(el("farmTitle"),"textContent","🌱 Грядка "+(i+1));
  openOverlay(el("farmOverlay"));
}
