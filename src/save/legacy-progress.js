/* =====================================================
   0.7.1 — LOCAL GAME PROGRESS
   Elapsed durations are stored instead of offline deadlines.
   Loading resumes timers without consuming supplies while away.+===================================================== */
const GAME_SAVE_KEY="survival_base_progress_v1";
const GAME_SAVE_BACKUP_KEY="survival_base_progress_backup_v1";
const MAX_SAVE_ELAPSED=7*24*60*60*1000;
// Save bookkeeping is owned by GameState.session.
// Save bookkeeping is owned by GameState.session.
// Save bookkeeping is owned by GameState.session.
// Save bookkeeping is owned by GameState.session.

function saveElapsed(now,then){
  return clamp(now-then,0,MAX_SAVE_ELAPSED);
}

function captureGameProgressBase(){
  reconcileHands();
  const now=Date.now();
  return {
    schema:2,gameVersion:'0.8.4',savedAt:now,
    gateOpen,handSlots:clone(handSlots),activeHandSlot,flashlightOn,starterPending:clone(starterPending),
    trees:worldTrees.map(t=>({id:t.id,felled:t.felled,wood:t.wood,regrowMs:t.regrowMs})),
    player:{scene,x:player.x,y:player.y,health:player.health,
      aimX:player.aimX,aimY:player.aimY,dead:playerDead},
    magazine,bag:clone(GameState.inventory.bag),equipment:clone(GameState.inventory.equipment),
    storage:clone(GameState.inventory.storage),
    farmClock:1,
    farm:GameState.farm.beds.map(st=>({
      crop:st.crop,
      elapsedMs:st.crop===null?0:saveElapsed(now,st.plantedAt),
      harvestLeft:st.harvestLeft??null
    })),
    loot:scavenges.map(o=>({id:o.id,searched:o.searched,loot:clone(o.loot||[])})),
    zombies:GameState.enemies.actors.map(z=>({x:z.x,y:z.y,health:z.health,alive:z.alive,state:z.state})),
    livestock:{
      animals:clone(livestockAnimals),alive:livestockAlive,
      warned:livestockWarned,
      emptyMs:livestockEmptySince===null?null:saveElapsed(now,livestockEmptySince),
      eggMs:saveElapsed(now,lastEggProduction),milkMs:saveElapsed(now,lastMilkProduction),
      needMs:saveElapsed(now,lastLivestockNeed),breedMs:saveElapsed(now,lastCowBreed)
    },
    feedCraft:pendingFeedCraft?{
      qty:pendingFeedCraft.qty,total:pendingFeedCraft.total,
      remainingMs:clamp(pendingFeedCraft.readyAt-now,0,2500)
    }:null
  };
}

function upgradeGameProgress(d){
  if(d.schema===2)return d;
  const legacyHands=d.equipment.hands;
  if(legacyHands!==null&&legacyHands!==undefined&&legacyHands.type!=='gloves1')throw new Error('Invalid legacy equipment');
  delete d.equipment.hands;
  d.schema=2;d.gameVersion='0.8';
  d.gateOpen=false;
  d.handSlots=['rifle_ak74','axe','flashlight',null];d.activeHandSlot=0;d.flashlightOn=true;
  d.starterPending=['rifle_ak74','axe','flashlight'].filter(type=>!d.bag.some(s=>s?.type===type));
  if(legacyHands)d.starterPending.push('gloves1');
  d.trees=worldTrees.map(t=>({id:t.id,felled:false,wood:15}));
  // Keep health / kills from the old save, but move surviving zombies off the base.
  d.zombies=d.zombies.map((z,i)=>({...z,...outsideSpawns[i%outsideSpawns.length],state:'wander'}));
  return d;
}


function decodeGameProgressBase(raw){
  const d=JSON.parse(raw);
  const number=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const integer=(n,min,max)=>Number.isInteger(n)&&number(n,min,max);
  const duration=n=>number(n,0,MAX_SAVE_ELAPSED);
  const position=o=>o&&number(o.x,-2800,4400)&&number(o.y,-2400,9600);
  const slots=(a,max)=>Array.isArray(a)&&a.length<=max&&a.every(s=>
    s===null||(s&&Object.hasOwn(ITEM,s.type)&&integer(s.qty,1,itemStackLimit(s.type,true))));
  const fail=()=>{throw new Error("Invalid or unsupported game save");};
  if(!d||![1,2].includes(d.schema)||!number(d.savedAt,0,Number.MAX_SAFE_INTEGER))fail();
  const p=d.player;
  if(!position(p)||!['surface','bunker'].includes(p.scene)||
     !number(p.health,0,500)||typeof p.dead!=="boolean"||
     p.dead!==(p.health===0)||!number(p.aimX,-1,1)||!number(p.aimY,-1,1))fail();
  if(!d.equipment||!Object.keys(equipment).every(slot=>{
    const item=d.equipment[slot];
    return Object.hasOwn(d.equipment,slot)&&(item===null||
      (Object.hasOwn(ITEM,item?.type)&&ITEM[item.type].equip===slot));
  }))fail();
  if(!d.equipment.backpack)fail();
  const capacity=ITEM[d.equipment.backpack.type].capacity;
  if(!slots(d.bag,capacity)||!integer(d.magazine,0,60))fail();
  if(!Array.isArray(d.storage)||d.storage.length!==storageChests.length||
    !d.storage.every(c=>c&&typeof c.name==="string"&&c.name.length<=64&&
      typeof c.icon==="string"&&c.icon.length<=64&&slots(c.items,60)))fail();
  if(!Array.isArray(d.farm)||d.farm.length!==5||!d.farm.every(st=>
    st&&(st.crop===null||integer(st.crop,0,window.farmCrops.length-1))&&
    duration(st.elapsedMs)&&(st.harvestLeft===null||integer(st.harvestLeft,1,160))))fail();
  if(['0.7.1','0.8'].includes(d.gameVersion)&&Array.isArray(d.loot)&&d.loot.length===6&&d.loot.every((o,i)=>o?.id===scavenges[i].id))
    d.loot.push({id:'yard_car',searched:false,loot:[]});
  if(!Array.isArray(d.loot)||d.loot.length!==scavenges.length||
    !d.loot.every((o,i)=>o&&o.id===scavenges[i].id&&typeof o.searched==="boolean"&&
      slots(o.loot,12)&&(o.searched||o.loot.length===0)))fail();
  if(!Array.isArray(d.zombies)||d.zombies.length>144||!d.zombies.every(z=>
    position(z)&&number(z.health,0,630)&&typeof z.alive==="boolean"&&
    z.alive===(z.health>0)&&['wander','chase'].includes(z.state)))fail();
  const l=d.livestock;
  if(!l||typeof l.alive!=="boolean"||typeof l.warned!=="boolean"||
    !Array.isArray(l.animals)||l.animals.length>71||!l.animals.every(a=>
      position(a)&&['cow','chicken'].includes(a.kind)&&
      number(a.vx,-1,1)&&number(a.vy,-1,1)&&number(a.size,1,100))||
    l.animals.filter(a=>a.kind==="cow").length>COW_MAX||
    !['eggMs','milkMs','needMs','breedMs'].every(k=>duration(l[k]))||
    !(l.emptyMs===null||duration(l.emptyMs)))fail();
  if(d.feedCraft!==null){
    const c=d.feedCraft;
    if(!c||!integer(c.qty,1,100000)||!integer(c.total,c.qty,100000)||
      !number(c.remainingMs,0,2500))fail();
  }
  upgradeGameProgress(d);
  if(Array.isArray(d.trees))for(const t of d.trees){
    if(t&&t.regrowMs===undefined)t.regrowMs=t.felled?600000:0;
    if(!t||!number(t.regrowMs,0,600000))fail();
  }
  if(typeof d.gateOpen!=='boolean'||typeof d.flashlightOn!=='boolean'||
     !Array.isArray(d.handSlots)||d.handSlots.length!==5||
     !d.handSlots.every((t,i)=>t===null||(HAND_TYPES.includes(t)&&d.handSlots.indexOf(t)===i))||
     !(d.activeHandSlot===null||integer(d.activeHandSlot,0,4))||
     !Array.isArray(d.starterPending)||d.starterPending.length>8||
     !d.starterPending.every((t,i)=>[...HAND_TYPES,'gloves1'].includes(t)&&d.starterPending.indexOf(t)===i)||
     !Array.isArray(d.trees)||d.trees.length!==worldTrees.length||
     !d.trees.every((t,i)=>t&&t.id===worldTrees[i].id&&typeof t.felled==='boolean'&&integer(t.wood,0,15)&&(t.felled||t.wood===15)))fail();
  return d;
}

function restoreGameProgressBase(d){
  GameIdentity.restore(d);
  const now=Date.now();
  bag=clone(d.bag);
  for(const slot of Object.keys(equipment)){
    equipment[slot]=d.equipment[slot]?clone(d.equipment[slot]):null;
  }
  BAG_SLOTS=ITEM[equipment.backpack.type].capacity;
  magazine=d.magazine;
  gateOpen=d.gateOpen;handSlots=clone(d.handSlots);activeHandSlot=d.activeHandSlot;
  flashlightOn=d.flashlightOn;starterPending=clone(d.starterPending);
  d.trees.forEach((t,i)=>Object.assign(worldTrees[i],t));
  storageChests=clone(d.storage);
  invalidateGeometry();
  scene=d.player.scene;
  Object.assign(player,{x:d.player.x,y:d.player.y,health:d.player.health,
    aimX:d.player.aimX,aimY:d.player.aimY,lastFootstep:0,lastDamage:0});
  // A stale position cannot leave the player trapped inside a wall.
  const collision=scene==="surface"?surfaceCollision:bunkerCollision;
  if(collision(player.x,player.y)){
    player.x=scene==="surface"?800:bunker.entrance.x;
    player.y=scene==="surface"?860:bunker.entrance.y-70;
  }
  playerDead=d.player.dead;
  window.farmState=d.farm.map(st=>({crop:st.crop,
    plantedAt:st.crop===null?0:now-farmElapsed(st,d,now),
    ...(st.harvestLeft===null?{}:{harvestLeft:st.harvestLeft})}));
  d.loot.forEach((o,i)=>{
    scavenges[i].searched=o.searched;
    scavenges[i].loot=clone(o.loot);
  });
  zombies=d.zombies.map((z,i)=>{
    const restored=Object.assign(makeZombie(z.x,z.y,d.identity027.enemies[i]),z);
    if(worldCollision(z.x,z.y,17,'surface'))Object.assign(restored,outsideSpawns[i%outsideSpawns.length],{state:'wander'});
    return restored;
  });
  const l=d.livestock;
  livestockAnimals.splice(0,livestockAnimals.length,...l.animals.map(a=>
    ({...a,icon:a.kind==="cow"?"🐄":"🐔"})));
  livestockAlive=l.alive;
  livestockWarned=l.warned;
  livestockEmptySince=l.emptyMs===null?null:now-l.emptyMs;
  lastEggProduction=now-l.eggMs;
  lastMilkProduction=now-l.milkMs;
  lastLivestockNeed=now-l.needMs;
  lastCowBreed=now-l.breedMs;
  pendingFeedCraft=d.feedCraft?{qty:d.feedCraft.qty,total:d.feedCraft.total,
    readyAt:now+d.feedCraft.remainingMs}:null;
  feedCraftBusy=!!pendingFeedCraft;
  feedCraftLoaded=0;
  activeLoot=null;activeLootObject=null;
  searchState=null;
  bullets.length=0;
  stopControls();
  menuOpen=playerDead;
  el("deathOverlay").classList.toggle("open",playerDead);
  I18n.assign(el("locationName"),"textContent",scene==="bunker"?"БУНКЕР":"БАЗА");
  I18n.assign(el("healthText"),"textContent",`❤️ ${Math.round(player.health)}/${Math.round(player.maxHealth)}`);
  camera.x=player.x-window.innerWidth/2;
  camera.y=player.y-window.innerHeight/2;
}

function updateSaveStatus(text){
  I18n.assign(el("saveStatus"),"textContent",text);
}

function loadGameProgress(){
  let candidates;
  try{
    candidates=[localStorage.getItem(GAME_SAVE_KEY),localStorage.getItem(GAME_SAVE_BACKUP_KEY)];
  }catch(error){
    updateSaveStatus("Хранилище недоступно — прогресс пока не сохраняется.");
    return false;
  }
  for(let i=0;i<candidates.length;i++){
    const raw=candidates[i];
    if(!raw)continue;
    try{
      const data=decodeGameProgress(raw);
      restoreGameProgress(data);
      GameState.session.lastVerified=raw;
      updateSaveStatus(i===0?"💾 Прогресс восстановлен. Автосохранение включено.":
        "💾 Прогресс восстановлен из резервного сохранения.");
      return true;
    }catch(error){
      console.warn("Game save could not be loaded:",error.message);
    }
  }
  if(candidates.some(raw=>raw!==null)){
    // Never overwrite an unreadable save with a fresh game's empty state.
    GameState.session.blocked=true;
    updateSaveStatus("Сохранение не удалось прочитать. Оно сохранено без изменений; автосохранение приостановлено.");
  }else{
    updateSaveStatus("💾 Автосохранение каждые 5 секунд и после действий.");
  }
  return false;
}

function saveGameProgress(manual=false){
  if(!GameState.session.ready||GameState.session.blocked){
    if(manual)message("Сохранение недоступно: прежний прогресс не перезаписан.");
    return false;
  }
  try{
    const raw=JSON.stringify(captureGameProgress());
    decodeGameProgress(raw);
    if(GameState.session.lastVerified){
      try{localStorage.setItem(GAME_SAVE_BACKUP_KEY,GameState.session.lastVerified);}catch(error){}
    }
    localStorage.setItem(GAME_SAVE_KEY,raw);
    GameState.session.lastVerified=raw;
    const now=new Date();
    updateSaveStatus(`💾 Сохранено в ${now.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}`);
    if(manual)message("💾 Игра сохранена");
    return true;
  }catch(error){
    updateSaveStatus("Не удалось сохранить прогресс. Проверьте доступность хранилища браузера.");
    if(manual)message("Не удалось сохранить игру");
    console.warn("Game save failed:",error.message);
    return false;
  }
}

function queueGameSave(){
  if(!GameState.session.ready||GameState.session.blocked||GameState.session.timer!==null)return;
  GameState.session.timer=setTimeout(()=>{
    GameState.session.timer=null;
    saveGameProgress();
  },100);
}

function flushGameSave(){
  if(GameState.session.timer!==null){clearTimeout(GameState.session.timer);GameState.session.timer=null;}
  saveGameProgress();
}


GameSave.setBase('capture',captureGameProgressBase);
GameSave.setBase('decode',decodeGameProgressBase);
GameSave.setBase('restore',restoreGameProgressBase);
