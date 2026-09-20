/* 0.9.2 — named independent saves, portable backups and chickens. */
const V09_SAVE_PREFIX='survival_base_v09_slot_';
const V09_ACTIVE_KEY='survival_base_v09_active_slot';
const V09_SLOT_COUNT=5;
const V09_CHICKEN_MAX=50;
const V09_CHICKEN_BREED_MS=300000;
// Save bookkeeping is owned by GameState.session.
// Save bookkeeping is owned by GameState.session.
const V091_SAVE_NAME_MAX=48;
function v091CleanSaveName(value){
  if(value===undefined)return '';
  if(typeof value!=='string')throw new Error('Invalid save name');
  return value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,V091_SAVE_NAME_MAX);
}
function v091DefaultName(id){return 'Сохранение '+(id||1);}
// Save bookkeeping is owned by GameState.session.
let v09ChickenBreedMs=0;
let v09ChickenClock=performance.now();




function v09ChickenCount(){return livestockAnimals.filter(a=>a.kind==='chicken').length;}
function v09AddChicken(){
  if(v09ChickenCount()>=V09_CHICKEN_MAX)return false;
  const f=bunker.farm;
  const mid=(f.top+f.bottom)/2;
  livestockAnimals.push({kind:'chicken',icon:'🐔',x:f.left+55+Math.random()*100,
    y:mid+65+Math.random()*Math.max(10,f.bottom-mid-145),
    vx:Math.random()>.5?.07:-.07,vy:Math.random()>.5?.05:-.05,size:24});
  return true;
}
const v09OriginalProduction=updateLivestockProduction;
updateLivestockProduction=function(){
  v09OriginalProduction();
  const now=performance.now();
  const dt=Math.max(0,Math.min(now-v09ChickenClock,1000));
  v09ChickenClock=now;
  if(!livestockAlive||v09ChickenCount()<2||v09ChickenCount()>=V09_CHICKEN_MAX||
    storageCount(12,'animal_feed')<=0||storageCount(13,'water')<=0)return;
  v09ChickenBreedMs+=dt;
  if(v09ChickenBreedMs>=V09_CHICKEN_BREED_MS){
    v09ChickenBreedMs=0;
    if(v09AddChicken()){
      message('🐔 В курятнике появилась новая курица.');
      if(el('cowOverlay').classList.contains('open'))renderCowMenu();
      queueGameSave();
    }
  }
};
const v09OriginalCowMenu=renderCowMenu;
renderCowMenu=function(){
  v09OriginalCowMenu();
  const n=v09ChickenCount();
  const status=el('cowStatus');
  I18n.assign(status,"innerHTML",status.innerHTML.replace(/🐔 Куры: \d+/,`🐔 Куры: ${n} / ${V09_CHICKEN_MAX}`));
  const hint=document.createElement('div');
  hint.className='subtitle';
  hint.style.margin='8px 0 0';
  I18n.assign(hint,"textContent",n>=V09_CHICKEN_MAX?'Курятник заполнен.':
    'Куры размножаются при наличии корма и воды: одна за 5 минут игры.');
  status.append(hint);
  const btn=el('v09ChickenSlaughter');
  if(btn){btn.disabled=n<=2||!livestockAlive;btn.style.opacity=btn.disabled?'.45':'1';}
};
const v09ChickenSlaughter=v09Button('🍗 Зарезать курицу · 5 мяса',()=>{
  const chickens=livestockAnimals.filter(a=>a.kind==='chicken');
  if(!livestockAlive||chickens.length<=2){message('🐔 Нужно оставить минимум 2 живые курицы.');return;}
  const food=storageChests[4].items;
  if(freeItemSpace(bag,'chicken_meat',BAG_SLOTS)+freeItemSpace(food,'chicken_meat',60)<5){
    message('🎒 Освободите место для 5 куриного мяса в рюкзаке или ящике еды.');return;
  }
  const victim=chickens[chickens.length-1];
  livestockAnimals.splice(livestockAnimals.indexOf(victim),1);
  const left=addItem('chicken_meat',5);
  if(left)addToSlots(food,'chicken_meat',left,60);
  message('🍗 Получено куриного мяса: 5.');renderCowMenu();queueGameSave();
});
v09ChickenSlaughter.id='v09ChickenSlaughter';
el('cowSlaughterBtn').after(v09ChickenSlaughter);

GameSave.extend('capture','save.slots',function(v09OriginalCapture){
  const d=v09OriginalCapture();
  d.gameVersion='0.9.2';
  d.saveName=GameState.session.name;
  d.v09={schema:1,power:V09Power.snapshot(),world:V09World.capture(),
    crafting:V09Craft.capture(),chickenBreedMs:v09ChickenBreedMs};
  d.v091={schema:1,
    fortress:window.V091Fortress?V091Fortress.capture():{wallLevel:false,innerGateOpen:false},
    loot:window.V091Loot?V091Loot.capture():{objects:scavenges.map(o=>({id:o.id,searchedAt:null}))}};
  if(window.V091Fortress&&typeof V091Fortress.canonicalPosition==='function'){
    const p=V091Fortress.canonicalPosition();if(p){d.player.x=p.x;d.player.y=p.y;}
  }
  return d;
});
// Historical migration defaults. Complete New Game defaults are captured by
// GameSave only after all systems are initialized, before the first slot load.
const v09NewGameTemplate=clone(captureGameProgress());

function v09MigrateItems(d){
  const migrate=slots=>{if(Array.isArray(slots))for(const s of slots)if(s&&s.type==='metal')s.type='iron';};
  migrate(d.bag);
  if(Array.isArray(d.storage))for(const c of d.storage){
    migrate(c&&c.items);if(c&&c.name==='Металл')c.name='Железо';
  }
  if(Array.isArray(d.loot))for(const l of d.loot)migrate(l&&l.loot);
}
function v09MergeLegacyEntries(entries,all,required,make){
  if(!Array.isArray(entries))throw new Error('Missing legacy world data');
  const ids=new Set();
  for(const entry of entries){
    if(!entry||typeof entry.id!=='string'||ids.has(entry.id)||!all.some(o=>o.id===entry.id))
      throw new Error('Invalid legacy world IDs');
    ids.add(entry.id);
  }
  if(!required.every(id=>ids.has(id)))throw new Error('Incomplete legacy world data');
  const byId=new Map(entries.map(o=>[o.id,o]));
  return all.map(o=>byId.has(o.id)?byId.get(o.id):make(o));
}
GameSave.extend('decode','save.slots',function(v09OriginalDecode,raw){
  if(typeof raw!=='string'||raw.length>2*1024*1024)throw new Error('Save file is too large');
  let d=JSON.parse(raw);
  if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('Invalid save');
  if(window.V010World)V010World.migrateData(d);
  d.saveName=v091CleanSaveName(d.saveName);
  const legacy=d.v09===undefined;
  const legacySchema=d.schema;
  if(!legacy&&(d.schema!==2||!/^0\.(?:9(?:\.\d+)?|(?:10\.[012345]|11\.[01]|12\.[01]|13\.0|14\.[0123]|15\.[012]|16\.[0123]|17\.0|18\.0|(?:19\.[01]|20\.0|21\.0|22\.0|23\.[01]|24\.[01]|25\.[01])))$/.test(d.gameVersion||'')))
    throw new Error('Unsupported current save version');
  if(legacy){
    if(![1,2].includes(d.schema)||!/^0\.(7(?:\.1)?|8(?:\.\d+)?)$/.test(d.gameVersion||''))
      throw new Error('Unsupported save version');
    v09MigrateItems(d);
    const oldLoot=['car1','car2','car3','house1','house2','house3'];
    if(!['0.7.1','0.7','0.8'].includes(d.gameVersion))oldLoot.push('yard_car');
    d.loot=v09MergeLegacyEntries(d.loot,scavenges,oldLoot,o=>({id:o.id,searched:false,loot:[]}));
    if(d.schema===2)d.trees=v09MergeLegacyEntries(d.trees,worldTrees,
      Array.from({length:11},(_,i)=>'tree'+i),o=>({id:o.id,felled:false,wood:15,regrowMs:0}));
  }
  d=v09OriginalDecode(JSON.stringify(d));
  if(d.livestock.animals.filter(a=>a.kind==='chicken').length>V09_CHICKEN_MAX)
    throw new Error('Too many chickens');
  if(legacy){
    if(legacySchema===1)d.starterPending=d.starterPending.filter(type=>type!=='rifle_m4');
    d.v09=clone(v09NewGameTemplate.v09);
    d.v09.crafting.magazines.rifle_ak74=d.magazine;
    d.v09.crafting.magazines.rifle_m4=0;
    d.v09.crafting.feed=d.feedCraft?clone(d.feedCraft):null;
    for(const type of ['remote','pickaxe']){
      const owned=d.bag.some(s=>s?.type===type)||d.storage.some(c=>c.items.some(s=>s?.type===type));
      if(!owned&&!d.starterPending.includes(type))d.starterPending.push(type);
    }
    if(!d.handSlots[3]&&d.bag.some(s=>s?.type==='remote'))d.handSlots[3]='remote';
    d.gameVersion='0.9.2';
  }
  const s=d.v09;
  if(!s||s.schema!==1||!Number.isFinite(s.chickenBreedMs)||s.chickenBreedMs<0||
    s.chickenBreedMs>V09_CHICKEN_BREED_MS)throw new Error('Invalid 0.9 state');
  if(!s.power||!s.world||!s.crafting)throw new Error('Incomplete 0.9 state');
  if(typeof V09Craft.normalizeSave==='function')s.crafting=V09Craft.normalizeSave(s.crafting)||s.crafting;
  if(V09Power.validate(s.power)===false||V09World.validate(s.world)===false||
    V09Craft.validate(s.crafting)===false)throw new Error('Invalid subsystem state');
  if(d.v091===undefined){
    d.v091=clone(v09NewGameTemplate.v091);
    // Ground-level saves keep their own position when gaining the new fortress state.
    d.v091.fortress.x=d.player.x;d.v091.fortress.y=d.player.y;
    // Old searched objects start their renewal clock on migration. Never erase their contents.
    d.v091.loot.objects=d.loot.map(o=>({id:o.id,searchedAt:o.searched?Date.now():null}));
  }
  if(!d.v091||d.v091.schema!==1||!d.v091.fortress||!d.v091.loot)
    throw new Error('Invalid 0.9.2 state');
  if(d.v091.fortress.wallLevel&&d.player.scene!=='surface')throw new Error('Invalid elevation');
  if(window.V091Fortress&&V091Fortress.validate(d.v091.fortress)===false)
    throw new Error('Invalid fortress');
  if(window.V091Loot&&V091Loot.validate(d.v091.loot)===false)throw new Error('Invalid loot clocks');
  d.gameVersion='0.9.2';
  return d;
});
function v09CancelPendingSave(){
  if(GameState.session.timer!==null){clearTimeout(GameState.session.timer);GameState.session.timer=null;}
}
GameSave.extend('restore','save.slots',function(v09OriginalRestore,d){
  const wasTransaction=GameState.session.transaction;
  GameState.session.transaction=true;v09CancelPendingSave();
  try{
    document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));
    v09OriginalRestore(d);
    V09Power.restore(d.v09.power);V09World.restore(d.v09.world);V09Craft.restore(d.v09.crafting);
    // Fortress restore supplies its saved upper-level coordinates after the legacy ground collision check.
    if(window.V091Fortress)V091Fortress.restore(d.v091.fortress);
    if(window.V091Loot)V091Loot.restore(d.v091.loot);
    GameState.session.name=v091CleanSaveName(d.saveName);
    v09ChickenBreedMs=d.v09.chickenBreedMs;v09ChickenClock=performance.now();
    activeStorage=null;assigningHandType=null;
    grantStarterItems();renderQuickSlots();updateAmmoHud();
  }finally{GameState.session.transaction=wasTransaction;}
});
function v09SlotKey(id){return V09_SAVE_PREFIX+id;}
function v09BackupKey(id){return v09SlotKey(id)+'_backup';}
function v09OccupiedSlots(){
  return Array.from({length:V09_SLOT_COUNT},(_,i)=>i+1).filter(id=>
    localStorage.getItem(v09SlotKey(id))!==null||localStorage.getItem(v09BackupKey(id))!==null);
}
function v09FreeSlot(){const used=v09OccupiedSlots();return [1,2,3,4,5].find(id=>!used.includes(id))||null;}
function v09ReadSlot(id){
  let found=false;
  for(const [key,recovered] of [[v09SlotKey(id),false],[v09BackupKey(id),true]]){
    const raw=localStorage.getItem(key);if(raw===null)continue;found=true;
    try{const data=decodeGameProgress(raw);data.saveName=data.saveName||v091DefaultName(id);return {id,raw,data,recovered};}catch(error){/* Try the independent backup. */}
  }
  return found?{id,invalid:true}:null;
}
function v09WriteNewSlot(id,data){
  if(localStorage.getItem(v09SlotKey(id))!==null||localStorage.getItem(v09BackupKey(id))!==null)
    throw new Error('Slot is already occupied');
  data.saveName=v091CleanSaveName(data.saveName)||v091DefaultName(id);
  data=decodeGameProgress(JSON.stringify(data));
  const raw=JSON.stringify(data);
  localStorage.setItem(v09SlotKey(id),raw);
  // Slot data is already durable if updating the active pointer fails.
  localStorage.setItem(V09_ACTIVE_KEY,String(id));
  return raw;
}
function v09ReportStorageFailure(manual=false){
  updateSaveStatus('Не удалось сохранить: хранилище браузера недоступно или заполнено. Скачайте резервную копию.');
  if(manual)message('Не удалось сохранить игру. Можно скачать сохранение файлом.');
}
loadGameProgress=function(){
  try{
    const occupied=v09OccupiedSlots();
    const savedActive=Number(localStorage.getItem(V09_ACTIVE_KEY));
    const order=occupied.includes(savedActive)?[savedActive,...occupied.filter(id=>id!==savedActive)]:occupied;
    for(const id of order){
      const entry=v09ReadSlot(id);if(!entry||entry.invalid)continue;
      localStorage.setItem(V09_ACTIVE_KEY,String(id));
      restoreGameProgress(entry.data);GameState.session.activeSlot=id;GameState.session.blocked=false;
      GameState.session.lastVerified=JSON.stringify(entry.data);
      updateSaveStatus(`💾 Слот ${id}: ${entry.recovered?'восстановлен из резервной копии':'прогресс восстановлен'}.`);
      return true;
    }
    const legacy=localStorage.getItem('survival_base_slots_deleted')==='1'?[]:[localStorage.getItem(GAME_SAVE_KEY),localStorage.getItem(GAME_SAVE_BACKUP_KEY)];
    for(const raw of legacy){
      if(raw===null)continue;
      let data;try{data=decodeGameProgress(raw);}catch(error){continue;}
      const id=v09FreeSlot();
      if(!id){GameState.session.blocked=true;updateSaveStatus('Все слоты заняты. Откройте «Сохранения».');return false;}
      const migratedRaw=v09WriteNewSlot(id,data);
      restoreGameProgress(data);GameState.session.activeSlot=id;GameState.session.blocked=false;GameState.session.lastVerified=migratedRaw;
      updateSaveStatus(`💾 Прогресс перенесён в слот ${id}. Исходное сохранение сохранено отдельно.`);
      return true;
    }
    if(occupied.length||legacy.some(raw=>raw!==null)){
      GameState.session.blocked=true;
      updateSaveStatus('Сохранение не удалось прочитать. Оно не изменено. Доступны импорт и новая игра в свободном слоте.');
      return false;
    }
    const id=v09FreeSlot();const raw=v09WriteNewSlot(id,captureGameProgress());
    GameState.session.name=JSON.parse(raw).saveName;
    GameState.session.activeSlot=id;GameState.session.lastVerified=raw;GameState.session.blocked=false;
    updateSaveStatus(`💾 Слот ${id} · автосохранение каждые 5 секунд.`);
    return false;
  }catch(error){GameState.session.blocked=true;v09ReportStorageFailure();return false;}
};
saveGameProgress=function(manual=false){
  if(GameState.session.transaction)return false;
  if(!GameState.session.ready||GameState.session.blocked||!GameState.session.activeSlot){
    if(manual)message('Откройте «Сохранения»: выберите игру или создайте свободный слот.');return false;
  }
  try{
    const raw=JSON.stringify(captureGameProgress());decodeGameProgress(raw);
    if(GameState.session.lastVerified){
      decodeGameProgress(GameState.session.lastVerified);
      localStorage.setItem(v09BackupKey(GameState.session.activeSlot),GameState.session.lastVerified);
    }
    localStorage.setItem(v09SlotKey(GameState.session.activeSlot),raw);
    GameState.session.lastVerified=raw;
    updateSaveStatus(I18n.message('save.status',{name:GameState.session.name||v091DefaultName(GameState.session.activeSlot),time:I18n.dateParam(Date.now(),{hour:'2-digit',minute:'2-digit'})}));
    if(manual)message(I18n.message('save.success',{name:GameState.session.name||v091DefaultName(GameState.session.activeSlot)}));
    return true;
  }catch(error){v09ReportStorageFailure(manual);return false;}
};
queueGameSave=function(){
  if(!GameState.session.ready||GameState.session.blocked||GameState.session.transaction||GameState.session.timer!==null)return;
  const slot=GameState.session.activeSlot;
  GameState.session.timer=setTimeout(()=>{GameState.session.timer=null;if(slot===GameState.session.activeSlot)saveGameProgress();},100);
};
flushGameSave=function(){v09CancelPendingSave();return saveGameProgress();};
function v09BeforeSwitch(){
  v09CancelPendingSave();
  if(GameState.session.activeSlot&&!GameState.session.blocked&&!saveGameProgress()){
    message('Не удалось сохранить текущую игру. Скачайте копию перед переключением.');return false;
  }
  return true;
}
function v09ChooseSlot(id){
  try{
    const entry=v09ReadSlot(id);
    if(!entry||entry.invalid){message('Сохранение повреждено. Текущая игра не изменена.');return false;}
    if(!v09BeforeSwitch())return false;
    // Refresh if selecting the current slot: the flush just saved the latest progress.
    const next=id===GameState.session.activeSlot?v09ReadSlot(id):entry;
    if(!next||next.invalid)throw new Error('Save not available');
    localStorage.setItem(V09_ACTIVE_KEY,String(id));
    restoreGameProgress(next.data);
    GameState.session.activeSlot=id;GameState.session.blocked=false;GameState.session.lastVerified=JSON.stringify(next.data);
    updateSaveStatus(`💾 Слот ${id} · игра загружена.`);message(`Продолжаем игру из слота ${id}.`);return true;
  }catch(error){message('Не удалось загрузить игру. Сохранения не удалены.');return false;}
}
function v09NewGame(){
  try{
    const id=v09FreeSlot();
    if(!id){message('Все 5 слотов заняты. Новая игра не создана; прежний прогресс сохранён.');return false;}
    let data=GameSave.newGameData();
    data=decodeGameProgress(JSON.stringify(data));
    if(!v09BeforeSwitch())return false;
    const raw=v09WriteNewSlot(id,data);
    restoreGameProgress(data);GameState.session.activeSlot=id;GameState.session.blocked=false;GameState.session.lastVerified=raw;
    updateSaveStatus(`💾 Новая игра · слот ${id}.`);message(`Новая игра в слоте ${id}. Другие сохранения остались на месте.`);return true;
  }catch(error){v09ReportStorageFailure(true);return false;}
}
function v09ImportSave(raw){
  // Validate everything before autosaving, allocating a slot, or touching live state.
  let data;try{data=decodeGameProgress(raw);}catch(error){message('Файл сохранения повреждён или несовместим. Игра не изменена.');return false;}
  try{
    const id=v09FreeSlot();if(!id){message('Нет свободного слота для импорта. Сохранения не изменены.');return false;}
    if(!v09BeforeSwitch())return false;
    const importedRaw=v09WriteNewSlot(id,data);
    restoreGameProgress(data);GameState.session.activeSlot=id;GameState.session.blocked=false;GameState.session.lastVerified=importedRaw;
    updateSaveStatus(`💾 Импортировано в слот ${id}.`);message(`Сохранение загружено в отдельный слот ${id}.`);return true;
  }catch(error){v09ReportStorageFailure(true);return false;}
}
function v09DownloadSave(){
  try{
    const raw=JSON.stringify(captureGameProgress(),null,2);decodeGameProgress(raw);
    const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;
    const filename=(GameState.session.name||v091DefaultName(GameState.session.activeSlot)).replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,48)||'save';
    a.download=`survival-base-0.25.1-${filename}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    message('💾 Файл сохранения подготовлен для скачивания.');
  }catch(error){message('Не удалось подготовить сохранение.');}
}
function v091RenameSave(id,value){
  if(!Number.isInteger(id)||id<1||id>V09_SLOT_COUNT)return false;
  let next;try{next=v091CleanSaveName(value)||v091DefaultName(id);}catch(error){return false;}
  if(id===GameState.session.activeSlot){
    const previous=GameState.session.name;GameState.session.name=next;
    if(!saveGameProgress()){GameState.session.name=previous;return false;}
  }else{
    try{
      const entry=v09ReadSlot(id);if(!entry||entry.invalid)return false;
      const previous=JSON.stringify(entry.data);entry.data.saveName=next;
      const updated=JSON.stringify(entry.data);decodeGameProgress(updated);
      localStorage.setItem(v09BackupKey(id),previous);
      localStorage.setItem(v09SlotKey(id),updated);
    }catch(error){v09ReportStorageFailure(true);return false;}
  }
  message(I18n.message('save.renamed',{name:next}));return true;
}
const v09SaveOverlay=v09Overlay('v09SaveOverlay','💾 Сохранения');
function v091EditSaveName(id,row,currentName){
  row.replaceChildren();
  const label=document.createElement('label');label.className='v091SaveNameLabel';I18n.assign(label,"textContent",'Название игры · слот '+id);
  const input=document.createElement('input');input.type='text';input.maxLength=V091_SAVE_NAME_MAX;input.value=currentName;
  input.className='v091SaveNameInput';I18n.setAttr(input,'aria-label','Название сохранения');input.autocomplete='off';
  const controls=document.createElement('div');controls.className='v091SaveActions';
  const apply=()=>{if(v091RenameSave(id,input.value))v09RenderSaveSlots();};
  controls.append(v09Button('Сохранить имя',apply),v09Button('Отмена',v09RenderSaveSlots));
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}if(e.key==='Escape'){e.preventDefault();v09RenderSaveSlots();}});
  label.append(input);row.append(label,controls);input.focus();
}
function v09RenderSaveSlots(){
  const body=v09SaveOverlay.querySelector('.v09Body');body.replaceChildren();
  const intro=document.createElement('p');intro.className='subtitle';
  I18n.assign(intro,"textContent",'5 независимых слотов. Новая игра и импорт используют свободный слот. Для переноса на другой телефон или компьютер скачайте файл.');body.append(intro);
  try{
    for(let id=1;id<=V09_SLOT_COUNT;id++){
      const entry=v09ReadSlot(id);const row=document.createElement('div');row.className='v09SaveRow';
      const label=document.createElement('div');const name=document.createElement('b');
      I18n.assign(name,"textContent",entry&&!entry.invalid?I18n.verbatim(entry.data.saveName):`Слот ${id}`);label.append(name);
      const meta=document.createElement('div');meta.className='subtitle';meta.style.margin='4px 0 0';
      I18n.assign(meta,"textContent",!entry?'Свободен':entry.invalid?'Не удалось прочитать. Данные сохранены.':
        `Слот ${id}${id===GameState.session.activeSlot?' · текущий':''} · ${I18n.dateText(entry.data.savedAt,{dateStyle:'short',timeStyle:'medium'})} · ${entry.data.player.scene==='bunker'?'Бункер':'Поверхность'}${entry.recovered?' · резервная копия':''}`);
      label.append(meta);row.append(label);
      if(entry&&!entry.invalid){
        const actions=document.createElement('div');actions.className='v091SaveActions';
        actions.append(v09Button(id===GameState.session.activeSlot?'Продолжить':'Загрузить',()=>v09ChooseSlot(id)),
          v09Button('Переименовать',()=>v091EditSaveName(id,row,entry.data.saveName)));row.append(actions);
      }
      if(entry){const del=v09Button('Удалить',()=>V0104.requestDelete(id));del.classList.add('v104Delete');row.append(del);}
      body.append(row);
    }
  }catch(error){const warning=document.createElement('p');I18n.assign(warning,"textContent",'Хранилище браузера недоступно. Скачайте текущий прогресс файлом.');body.append(warning);}
  body.append(v09Button('＋ Новая игра в свободном слоте',()=>{if(!v09NewGame())v09RenderSaveSlots();}),
    v09Button('⬇ Скачать сохранение',v09DownloadSave),v09Button('⬆ Загрузить из файла',()=>v09ImportInput.click()));
}
const v09ImportInput=document.createElement('input');
v09ImportInput.type='file';v09ImportInput.accept='.json,application/json';v09ImportInput.hidden=true;
v09ImportInput.addEventListener('change',async()=>{
  const file=v09ImportInput.files&&v09ImportInput.files[0];v09ImportInput.value='';if(!file)return;
  if(file.size>2*1024*1024){message('Файл слишком большой для сохранения игры.');return;}
  try{const raw=await file.text();if(!v09ImportSave(raw))v09RenderSaveSlots();}
  catch(error){message('Не удалось прочитать выбранный файл.');}
});document.body.append(v09ImportInput);
el('saveGameButton').after(v09Button('📂 Продолжить / загрузить / новая игра',()=>{v09RenderSaveSlots();openOverlay(v09SaveOverlay);}));
v09Style('.v09SaveRow{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #ffffff20;flex-wrap:wrap}.v09SaveRow>div{min-width:0}.v09SaveRow b{overflow-wrap:anywhere}.v09SaveRow .menuButton{width:auto;flex-shrink:0;margin:0;padding:10px 12px;font-size:12px}.v09SaveRow .subtitle{line-height:1.45}.v091SaveActions{display:flex;gap:6px;flex-wrap:wrap}.v091SaveNameLabel{display:block;flex:1;min-width:180px;color:#a9bebf;font-size:12px}.v091SaveNameInput{display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid #8ca88e;border-radius:7px;background:#101b1f;color:#fff;font:inherit;font-size:16px}.v091SaveNameInput:focus{outline:2px solid #b9d699;outline-offset:2px}');
window.V09Saves={open(){v09RenderSaveSlots();openOverlay(v09SaveOverlay);},newGame:v09NewGame,
  load:v09ChooseSlot,importRaw:v09ImportSave,download:v09DownloadSave,rename:v091RenameSave,
  get name(){return GameState.session.name;},
  get activeSlot(){return GameState.session.activeSlot;},get chickenBreedMs(){return v09ChickenBreedMs;}};


v09Style(".itemIcon{width:44px;height:44px;object-fit:contain;vertical-align:middle;pointer-events:none}.slotArt .itemIcon{width:100%;height:100%}.equipIcon .itemIcon{width:37px;height:37px}.inventoryGrid{grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}.invSlot{box-sizing:border-box;min-height:66px;height:66px;padding:3px;position:relative;overflow:hidden}.invSlot .ico{height:37px;line-height:37px}.invSlot .ico .itemIcon{width:38px;height:38px}.invSlot>div:nth-child(2){font-size:9px;line-height:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.invSlot .qty{font-size:10px;line-height:12px;margin:0}.invSlot>div:only-child{font-size:9px}.v092CraftLayout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:16px;min-height:0;flex:1;margin-top:10px}.v092RecipeList{overflow-y:auto;border-right:1px solid #ffffff16;padding-right:10px}.v092Category{font-size:11px;letter-spacing:.5px;color:#afc1bc;margin:10px 0}.v092Recipe{display:flex;align-items:center;gap:6px;width:100%;padding:7px 4px;margin:4px 0;border:1px solid transparent;border-radius:8px;background:#1c2a30;color:#e3ece8;text-align:left;cursor:pointer;min-height:58px}.v092Recipe.selected{border-color:#c9ac70;background:#34413f}.v092Recipe span{font-size:12px}.v092Recipe small{display:block;color:#a5b7b3;font-size:10px;margin-top:4px}.v092Recipe .itemIcon{width:42px;height:42px;flex-shrink:0}.v092RecipeHero{display:flex;align-items:center;gap:14px;min-height:90px}.v092RecipeHero>.itemIcon{width:85px;height:85px}.v092Materials{display:grid;grid-template-columns:1fr 1fr;gap:6px;min-height:112px;align-content:start}.v092Ingredient{display:flex;align-items:center;gap:6px;background:#1b2b30;border:1px solid #3b5054;border-radius:7px;color:#dce9e4;padding:5px;text-align:left;cursor:pointer;font-size:11px}.v092Ingredient strong{display:block;margin-top:4px}.v092Ingredient .itemIcon{width:34px;height:34px}.v092MaterialHelp{font-size:11px;line-height:1.4;min-height:46px;color:#afc1b9;padding:8px 0}.v092Production{font-size:12px}.v092Production>span{float:right;color:#b3d5be}.v092Production .v09CraftProgress{margin:8px 0}.v092ProductionCounts{margin-top:5px}.v091CraftActions{min-height:160px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end}.v091CraftActions .v09CraftNote{margin:6px 0}#v09CraftOverlay .v09Panel{width:min(820px,calc(100vw - 20px));height:min(710px,94dvh)}.v091QuantityCount{font-size:13px}.v09CraftQuantity{gap:5px}.v09CraftQuantity button{font-size:12px}.v09CraftShort{color:#efa496}.v09GunStats{min-height:58px}\n@media(max-width:540px){.v092CraftLayout{grid-template-columns:116px minmax(0,1fr);gap:8px}.v092Recipe{flex-direction:column;align-items:flex-start}.v092Recipe .itemIcon{width:38px;height:38px}.v092RecipeList{padding-right:5px}.v092RecipeHero{gap:5px}.v092RecipeHero>.itemIcon{width:48px;height:48px}.v092RecipeHero b{font-size:13px}.v092Materials{grid-template-columns:1fr;min-height:112px}.v092Ingredient{min-height:38px}.v092Production>span{float:none;display:block}.invSlot{height:62px;min-height:62px}.inventoryGrid{gap:3px}.v091CraftActions{min-height:160px}#v09CraftOverlay .v09Panel{padding:10px}.v09CraftQuantity{grid-template-columns:1fr 1fr}}\n@media(max-height:500px){.v091CraftActions{min-height:100px}.v092Production .v09CraftNote{display:none}#v09CraftOverlay .v09Panel{height:96dvh}}\n");
