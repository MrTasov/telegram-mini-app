/* =====================================================
   WORLD
===================================================== */

let scene =
  "surface";

let menuOpen =
  false;

let playerDead =
  false;

const player = {

  x:800,
  y:860,

  radius:10,

  health:100,
  maxHealth:100,

  walkSpeed:3.15,
  runSpeed:5.25,

  aimX:0,
  aimY:-1,

  moving:false,
  running:false,

  lastFootstep:0,
  lastDamage:0,

  walkAnimation:0

};

const camera = {
  x:0,
  y:0
};

function visibleOnScreen(x,y,padding){

  padding =
    padding === undefined
    ? 80
    : padding;

  return (
    x >= camera.x-padding &&
    x <= camera.x+screenWidth+padding &&
    y >= camera.y-padding &&
    y <= camera.y+screenHeight+padding
  );

}

const surface = {

  width:1600,
  height:2200,

  outer:{
    left:170,
    top:130,
    right:1430,
    bottom:1070,
    thickness:45
  },

  inner:{
    left:610,
    top:420,
    right:990,
    bottom:760,
    thickness:28,
    gateX:750,
    gateWidth:100
  },

  hatch:{
    x:800,
    y:590
  }

};

const bunker = {

  width:1450,
  height:1450,

  // №1 — central corridor: 230 × 1500
  corridor:{
    left:610,
    right:840,
    top:-240,
    bottom:1260
  },

  entrance:{
    x:725,
    y:1180
  },

  // All six side rooms are exactly 520 × 500.
  // №2 — existing workshop
  workshop:{
    left:90,right:610,top:760,bottom:1260,doorTop:930,doorBottom:1090
  },

  // №3 — existing storage room with the same six functional chests
  storage:{
    left:840,right:1360,top:760,bottom:1260,doorTop:930,doorBottom:1090
  },

  // №4–7 — empty rooms for future systems
  room4:{left:90,right:610,top:260,bottom:760,doorTop:430,doorBottom:590},
  room5:{left:840,right:1360,top:260,bottom:760,doorTop:430,doorBottom:590},
  room6:{left:90,right:610,top:-240,bottom:260,doorTop:-70,doorBottom:90},
  room7:{left:840,right:1360,top:-240,bottom:260,doorTop:-70,doorBottom:90},

  // №8 — large farm, directly at the end of the corridor
  farm:{
    left:-150,right:1360,top:-940,bottom:-240,
    doorLeft:650,doorRight:800,
    cropLeft:90
  }

};


/* =====================================================
   0.5.0 INVENTORY / LOOT / AMMO
===================================================== */
// 0.8: one physical world for movement, navigation, light and projectiles.
let gateOpen=false;
let frameScale=1;
let navigation=null;
let objectPointer=null;
let chopState=null;
let interactionTarget=null;
const gateRect={id:'gate',x:730,y:1025,w:140,h:45};
const outsideSpawns=[{x:400,y:1650},{x:1280,y:1700},{x:1070,y:2110}];
const worldTrees=[
  [470,900],[1290,930],[180,1260],[575,1250],[1430,1280],
  [180,1700],[565,1740],[1400,1780],[1140,2080],[180,2090],[1370,2110]
].map((p,i)=>({id:'tree'+i,x:p[0],y:p[1],r:24,felled:false,wood:15,regrowMs:0}));

function rectHit(x,y,r,o){
  return Math.hypot(x-clamp(x,o.x,o.x+o.w),y-clamp(y,o.y,o.y+o.h))<r ||
    (x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h);
}
function surfaceWalls(){
  const o=surface.outer,i=surface.inner;
  return [
    {x:o.left,y:o.top,w:o.right-o.left,h:o.thickness},
    {x:o.left,y:o.top,w:o.thickness,h:o.bottom-o.top},
    {x:o.right-o.thickness,y:o.top,w:o.thickness,h:o.bottom-o.top},
    {x:o.left,y:o.bottom-o.thickness,w:730-o.left,h:o.thickness},
    {x:870,y:o.bottom-o.thickness,w:o.right-870,h:o.thickness},
    ...(!gateOpen?[gateRect]:[]),
    {x:i.left,y:i.top,w:i.right-i.left,h:i.thickness},
    {x:i.left,y:i.top,w:i.thickness,h:i.bottom-i.top},
    {x:i.right-i.thickness,y:i.top,w:i.thickness,h:i.bottom-i.top},
    {x:i.left,y:i.bottom-i.thickness,w:i.gateX-i.left,h:i.thickness},
    {x:i.gateX+i.gateWidth,y:i.bottom-i.thickness,w:i.right-i.gateX-i.gateWidth,h:i.thickness}
  ];
}
function solidObjects(which){
  if(which==='surface')return [
    ...scavenges,
    {id:'yard_generator',x:1080,y:310,w:125,h:90},
    ...[[200,160],[800,150],[1400,160],[200,1040],[1400,1040]].map((p,i)=>({id:'tower'+i,x:p[0]-25,y:p[1]-25,w:50,h:50})),
    // Trees remain visible and harvestable, but are not solid.
  ];
  const chests=getChestPositions();
  const fixtures=[
    ['furnace',154,794,130,195],['craft_bench',157,1061,260,173],
    ['medical_table',145,300,245,78],['medical_bed',145,650,225,58],['cabinet',110,430,58,130],['sink',455,315,100,58],
    ['medical_crate1',430,650,55,52],['medical_crate2',500,650,55,52],
    ['tank',885,315,125,185],['generator',1052,315,130,195],['battery',1235,300,105,215],
    ['kitchen',145,-205,330,92],['fridge',110,-75,72,165],['dining',225,135,190,70],['shelf',110,145,72,78],
    ['chair1',245,110,42,22],['chair2',352,110,42,22],['chair3',245,208,42,22],['chair4',352,208,42,22],
    ['wardrobe',885,-205,155,72],['nightstand',1080,-190,82,62],['bed',1240,-205,95,225],['dresser',1190,125,145,92],
    ['bath_wall1',916,61,208,8],['bath_wall2',1116,65,8,184],['toilet',930,130,62,105],['shower',1020,88,90,145]
  ].map(a=>({id:a[0],x:a[1],y:a[2],w:a[3],h:a[4]}));
  const feed=feedCraftStationPos();
  return [
    ...fixtures,
    {id:'livestock',x:(bunker.farm.cropLeft??90)-37,y:(bunker.farm.top+bunker.farm.bottom)/2-28,w:50,h:56},
    ...chests.flatMap((p,i)=>i===10||i===11?[]:[{id:'chest'+i,x:p.x-(i<10?34:30),y:p.y-(i<10?25:22),w:i<10?68:60,h:i<10?50:44}]),
    ...getFarmBeds().map((b,i)=>({...b,id:'bed'+i})),
    {id:'feed_craft',x:feed.x-28,y:feed.y-23,w:56,h:46}
  ];
}
// These short-lived caches are invalidated whenever the gate or trees change.
let geometryRevision=0;
let geometryCache={};
function invalidateGeometry(){geometryRevision++;geometryCache={};}
function geometryFor(which){
  if(!geometryCache[which]){
    const walls=which==='surface'?surfaceWalls():[],objects=solidObjects(which),grid=Object.create(null),cell=96;
    for(const o of [...walls,...objects]){
      const x=o.r!==undefined?o.x-o.r:o.x,y=o.r!==undefined?o.y-o.r:o.y;
      const w=o.r!==undefined?o.r*2:o.w,h=o.r!==undefined?o.r*2:o.h;
      for(let cy=Math.floor(y/cell);cy<=Math.floor((y+h)/cell);cy++)for(let cx=Math.floor(x/cell);cx<=Math.floor((x+w)/cell);cx++)(grid[cx+','+cy]??=[]).push(o);
    }
    geometryCache[which]={walls,objects,grid,cell};
  }
  return geometryCache[which];
}
function worldCollision(x,y,r=15,which=scene,ignoreId=null){
  if(which==='surface'){
    if(x<(surface.minX??0)+r||x>(surface.maxX??surface.width)-r||y<(surface.minY??0)+r||y>(surface.maxY??surface.height)-r)return true;
  }else if(bunkerGeometryBlocked(x,y,r))return true;
  const g=geometryFor(which);
  for(let cy=Math.floor((y-r)/g.cell);cy<=Math.floor((y+r)/g.cell);cy++)for(let cx=Math.floor((x-r)/g.cell);cx<=Math.floor((x+r)/g.cell);cx++){
    const nearby=g.grid[cx+','+cy];if(!nearby)continue;
    for(const o of nearby){
      if(o.id===ignoreId)continue;
      if(o.r!==undefined){if(distance(x,y,o.x,o.y)<=o.r+r)return true;}
      else if(rectHit(x,y,r,o))return true;
    }
  }
  return false;
}


function surfaceCollision(x,y){return worldCollision(x,y,player.radius,'surface');}
function bunkerCollision(x,y){return worldCollision(x,y,player.radius,'bunker');}
function lineClear(x1,y1,x2,y2,r=0,which=scene,ignoreId=null){
  const steps=Math.max(1,Math.ceil(distance(x1,y1,x2,y2)/6));
  for(let n=0;n<=steps;n++){
    const p=n/steps;
    if(worldCollision(x1+(x2-x1)*p,y1+(y2-y1)*p,r,which,ignoreId))return false;
  }
  return true;
}
function inFortress(x,y){const o=surface.outer;return x>o.left&&x<o.right&&y>o.top&&y<o.bottom;}
function toggleGate(){
  const drone=window.V014Robots?.state;
  if(gateOpen&&drone&&!drone.packed&&drone.scene==='surface'&&rectHit(drone.x,drone.y,15,gateRect)){message('Дрон занимает проход');return;}
  if(gateOpen){
    const occupants=[player,...zombies.filter(z=>z.alive)];
    if(occupants.some(p=>rectHit(p.x,p.y,p.radius+3,gateRect))){message('Отойдите от проёма, чтобы закрыть ворота');return;}
  }
  gateOpen=!gateOpen;invalidateGeometry();queueGameSave();
  message(gateOpen?'🔓 Ворота открыты':'🔒 Ворота закрыты');
}


const V092_ICONS={"copper_ore": "assets/v0190/icon_2a919b9e90b8.png", "copper": "assets/v0190/icon_5705522d2536.png", "wood": "assets/v0190/icon_085e0a30f9cc.png", "parts": "assets/v0190/icon_a9408115ccb7.png", "fuel": "assets/v0190/icon_797ee42cfe3e.png", "iron_ore": "assets/v0190/icon_1306e9c66771.png", "iron": "assets/v0190/icon_cd8057affcb5.png", "food": "assets/v0190/icon_042e63d04ccb.png", "carrot": "assets/v0190/icon_81cfc7450cd4.png", "potato": "assets/v0190/icon_0dc3a08a0683.png", "tomato": "assets/v0190/icon_5d7171863082.png", "corn": "assets/v0190/icon_b3e037c5a076.png", "grain": "assets/v0190/icon_03c5e250a605.png", "beans": "assets/v0190/icon_143ba3dae188.png", "onion": "assets/v0190/icon_ae40003c34c8.png", "berries": "assets/v0190/icon_953780b8e03d.png", "medicinal_herbs": "assets/v0190/icon_3fdeccbcc857.png", "technical_crop": "assets/v0190/icon_ebf787e7800d.png", "meds": "assets/v0190/icon_4ce05b3b10e6.png", "eggs": "assets/v0190/icon_5b88090a88ad.png", "milk": "assets/v0190/icon_7081460241c4.png", "animal_feed": "assets/v0190/icon_24d63bbf4d92.png", "beef": "assets/v0190/icon_5ef958008a36.png", "water": "assets/v0190/icon_7a1371a8bb4e.png", "chicken_meat": "assets/v0190/icon_107dfcc672a4.png", "rifle_m4": "assets/v0190/icon_dd6eb1e0b3e3.png", "ammo556": "assets/v0190/icon_57c55fb7bde7.png", "ammo": "assets/v0190/icon_2ec7c7d3745e.png", "rifle_ak74": "assets/v0190/icon_f10d2599b862.png", "axe": "assets/v0190/icon_3793b7e3f190.png", "pickaxe": "assets/v0190/icon_c138cd82d1dd.png", "remote": "assets/v0190/icon_5c31d5418c8c.png", "flashlight": "assets/v0190/icon_1502cc99b6fe.png", "backpack1": "assets/v0190/icon_d6d175efe58e.png", "backpack2": "assets/v0190/icon_1c3b4e4e1db8.png", "backpack3": "assets/v0190/icon_7c4c58a5f84a.png", "backpack4": "assets/v0190/icon_986f32292b56.png", "gloves1": "assets/v0190/icon_e70559db85da.png", "boots1": "assets/v0190/icon_ff3eb973d5d3.png", "pants1": "assets/v0190/icon_68244a54cd9d.png", "vest1": "assets/v0190/icon_2da81f96fbfc.png", "vest2": "assets/v0190/icon_ecb7a67f09f4.png", "vest3": "assets/v0190/icon_b7a7fcf0926e.png", "vest4": "assets/v0190/icon_407747ee90ee.png", "vest5": "assets/v0190/icon_c6be9836b2d1.png"};
const ITEM={
 hammer:{name:'Молот',icon:'🔨',hand:true,description:'Ремонт стен и дверей бетоном: 1000 HP/сек. Целые секции можно улучшить до уровня 5.'},
 stone:{name:'Камень',icon:'🪨',description:'Добывается киркой. В печи: 2 камня → 1 бетон.'},
 concrete:{name:'Бетон',icon:'▰',description:'Строительный блок. Ремонт: 1 бетон → 1000 HP. Нужен для улучшения стен и дверей.'},
 fishing_rod:{name:'Удочка',icon:'🎣',hand:true},
 fish:{name:'Свежая рыба',icon:'🐟'},
  rifle_ak74:{name:'АК-74',icon:'🔫',hand:true},
  axe:{name:'Топор',icon:'🪓',hand:true},
  flashlight:{name:'Фонарик',icon:'🔦',hand:true},
  wood:{name:"Дерево",icon:"🪵"},
  metal:{name:"Металл",icon:"🔩"},
  parts:{name:"Детали",icon:"⚙️"},
  food:{name:"Еда",icon:"🥫"},
  potato:{name:"Картофель",icon:"🥔"},
  carrot:{name:"Морковь",icon:"🥕"},
  tomato:{name:"Помидоры",icon:"🍅"},
  corn:{name:"Кукуруза",icon:"🌽"},
  grain:{name:"Зерно",icon:"🌾"},
  beans:{name:"Фасоль",icon:"🫘"},
  onion:{name:"Лук",icon:"🧅"},
  berries:{name:"Ягоды",icon:"🍓"},
  medicinal_herbs:{name:"Лекарственные растения",icon:"🌿"},
  technical_crop:{name:"Техническая культура",icon:"🌻"},
  backpack1:{name:"Рюкзак I",icon:"🎒",equip:"backpack",capacity:24},
  backpack2:{name:"Рюкзак II",icon:"🎒",equip:"backpack",capacity:16},
  backpack3:{name:"Рюкзак III",icon:"🎒",equip:"backpack",capacity:20},
  backpack4:{name:"Рюкзак IV",icon:"🎒",equip:"backpack",capacity:24},
  vest1:{name:"Бронежилет I",icon:"🦺",equip:"body",armor:15},
  vest2:{name:"Бронежилет II",icon:"🦺",equip:"body",armor:25},
  vest3:{name:"Бронежилет III",icon:"🦺",equip:"body",armor:40},
  vest4:{name:"Бронежилет IV",icon:"🛡️",equip:"body",armor:55},
  vest5:{name:"Бронежилет V",icon:"🛡️",equip:"body",armor:70},
  gloves1:{name:"Перчатки I",icon:"🧤"},
  pants1:{name:"Штаны I",icon:"👖",equip:"legs",level:1},
  boots1:{name:"Обувь I",icon:"👢",equip:"feet",level:1},
  meds:{name:"Медикаменты",icon:"💊"},
  fuel:{name:"Топливо",icon:"⛽"},
  ammo:{name:"Патроны",icon:"🔫"},
  eggs:{name:"Яйца",icon:"🥚"},
  milk:{name:"Молоко",icon:"🥛"},
  animal_feed:{name:"Корм для животных",icon:"🌾"},
  water:{name:"Вода",icon:"💧"},
  beef:{name:"Говядина",icon:"🥩"}
};
const STACK_MAX=100;
let BAG_SLOTS=24;
const equipment={
  head:null,
  body:null,
  legs:null,
  feet:null,
  backpack:{type:"backpack1",name:"Рюкзак I",icon:"🎒",capacity:24}
};
const EQUIP_LABELS={head:"Голова",body:"Тело",legs:"Ноги",feet:"Обувь",backpack:"Рюкзак"};
const EQUIP_ICONS={head:"🪖",body:"🦺",legs:"👖",feet:"👢",backpack:"🎒"};
let bag=[
  {type:"ammo",qty:60},
  {type:'grain',qty:100},
  {type:'rifle_ak74',qty:1},
  {type:'axe',qty:1},
  {type:'flashlight',qty:1}
];
let storageChests=[
  {name:"Топливо",icon:"⛽",items:[]},
  {name:"Оружие",icon:"🔫",items:[]},
  {name:"Металл",icon:"🔩",items:[]},
  {name:"Материалы",icon:"⚙️",items:[{type:"pants1",qty:1},{type:"boots1",qty:1}]},
  {name:"Еда",icon:"🥫",items:[]},
  {name:"Напитки",icon:"🥤",items:[]},
  {name:"Медицина",icon:"💊",items:[]},
  {name:"Разное",icon:"🧰",items:[{type:"backpack2",qty:1},{type:"backpack3",qty:1},{type:"backpack4",qty:1},{type:"vest1",qty:1},{type:"vest2",qty:1},{type:"vest3",qty:1},{type:"vest4",qty:1},{type:"vest5",qty:1}]},
  {name:"Урожай",icon:"🥔",items:[]},
  {name:"Растения",icon:"🌿",items:[]},
  {name:"Куры — яйца",icon:"🥚",items:[]},
  {name:"Корова — молоко",icon:"🥛",items:[]},
  {name:"Корм животных",icon:"🌾",items:[{type:"animal_feed",qty:100}]},
  {name:"Вода животных",icon:"💧",items:[{type:"water",qty:100}]}
];
let magazine=30, magazineMax=30;
let activeStorage=null, activeLoot=null, activeLootObject=null;
let searchState=null;

const scavenges=[
  {id:'car1',kind:'car',x:550,y:1420,w:64,h:130,searched:false},
  {id:'car2',kind:'car',x:1060,y:1628,w:130,h:64,searched:false},
  {id:'car3',kind:'car',x:975,y:1900,w:64,h:130,searched:false},
  {id:'house1',kind:'house',x:270,y:1300,w:250,h:210,searched:false},
  {id:'house2',kind:'house',x:1090,y:1290,w:270,h:220,searched:false},
  {id:'house3',kind:'house',x:260,y:1840,w:280,h:220,searched:false},
  {id:'yard_car',kind:'car',x:1100,y:790,w:160,h:75,searched:false}
];

const HAND_TYPES=['rifle_ak74','axe','flashlight','fishing_rod','hammer'];
let handSlots=['rifle_ak74','axe','flashlight',null,null];
let activeHandSlot=0;
let flashlightOn=true;
let assigningHandType=null;
let starterPending=[];
const handSvg={
  rifle_ak74:'<path fill="#ad7548" d="M4 26h20v10L6 43H2z"/><path fill="#202c2e" d="M22 24h40v13H22z"/><path fill="#ab7142" d="M49 21h21v14H49z"/><path stroke="#87989a" stroke-width="4" d="M67 25h28"/><path stroke="#192325" stroke-width="4" d="M66 31h28"/><path fill="#283335" d="M38 34h10q-1 17 12 24l-11 5q-15-11-11-29"/><path fill="#9c633a" d="M27 36h9l-2 14h-8z"/><path stroke="#89999b" stroke-width="3" d="M25 22h28"/><path fill="#182426" d="M77 18h5v9h-5z"/>',
  axe:'<path stroke="#bc8855" stroke-width="9" stroke-linecap="round" d="M28 57L66 13"/><path stroke="#6b4931" stroke-width="2" d="M28 59L68 13"/><path fill="#c3ced0" stroke="#63757a" stroke-width="2" d="M51 13L75 6l14 14-5 16-17-7-8-2z"/><path fill="#e5eeee" d="M84 13l5 7-5 16-6-4z"/>',
  flashlight:'<path fill="#253c45" stroke="#8c9c9f" stroke-width="2" d="M19 32l37-13 9 24-37 13z"/><path fill="#3c535c" stroke="#9eacad" stroke-width="2" d="M52 18L70 8l13 35-21 1z"/><path fill="#e9e4ba" d="M70 10l11 31 5-4-9-28z"/><path stroke="#6c8991" stroke-width="3" d="M28 34l7 18m3-22 7 18"/><path fill="#dec987" d="M78 9l18-3v32l-10-1z" opacity=".38"/>'
};
function itemIconHTML(type){const src=V092_ICONS[type==='metal'?'iron':type];return src?`<img class="itemIcon" src="${src}" alt="" draggable="false">`:ITEM[type]?.icon||'';}

function heldItem(){return Number.isInteger(activeHandSlot)?handSlots[activeHandSlot]||null:null;}
function canFire(){return heldItem()==='rifle_ak74'&&bagCount('rifle_ak74')>0;}
function reconcileHands(){
  handSlots=handSlots.map((type,i)=>type&&bagCount(type)>0&&handSlots.indexOf(type)===i?type:null);
  if(!Number.isInteger(activeHandSlot)||!handSlots[activeHandSlot]){activeHandSlot=null;firing=false;}
}
function grantStarterItems(){
  if(!starterPending.length)return;
  const before=starterPending.length;
  starterPending=starterPending.filter(type=>{
    if(addItem(type,1)>0)return true;
    const slot=HAND_TYPES.indexOf(type);
    if(slot>=0&&slot<4&&!handSlots[slot])handSlots[slot]=type;
    return false;
  });
  if(starterPending.length!==before){
    if(activeHandSlot===null){const i=handSlots.findIndex(Boolean);activeHandSlot=i<0?null:i;}
    renderQuickSlots();updateAmmoHud();
    if(el('inventoryOverlay').classList.contains('open'))renderBag();
    if(el('storageOverlay').classList.contains('open'))renderStorage();
    queueGameSave();
  }
}
function selectHandSlot(index){
  reconcileHands();
  if(!handSlots[index]){message('Назначьте предмет из рюкзака в этот слот');return;}
  const same=activeHandSlot===index;
  activeHandSlot=index;firing=false;
  if(heldItem()==='flashlight')flashlightOn=same?!flashlightOn:true;
  // Work is cancelled by movement, exhaustion, or loss of its tool.
  renderQuickSlots();updateAmmoHud();queueGameSave();
}
function assignHandSlot(index){
  if(!HAND_TYPES.includes(assigningHandType)||bagCount(assigningHandType)<1)return;
  handSlots=handSlots.map(type=>type===assigningHandType?null:type);
  handSlots[index]=assigningHandType;
  activeHandSlot=index;firing=false;
  if(heldItem()==='flashlight')flashlightOn=true;
  closeOverlay(el('handAssignOverlay'));renderBag();queueGameSave();
}
function openHandAssignment(type){
  assigningHandType=type;
  el('handAssignTitle').textContent=ITEM[type].name;
  el('handAssignArt').innerHTML=itemIconHTML(type);
  const holder=el('handAssignChoices');holder.innerHTML='';
  for(let i=0;i<5;i++){
    const button=document.createElement('button');button.className='menuButton';
    button.textContent=`Слот ${i+1} · ${handSlots[i]?ITEM[handSlots[i]].name:'Свободный'}`;
    button.addEventListener('click',()=>assignHandSlot(i));holder.appendChild(button);
  }
  openOverlay(el('handAssignOverlay'));
}
function renderQuickSlots(){
  reconcileHands();
  for(const name of ['hotbar','quickSlots']){
    const holder=el(name);holder.innerHTML='';
    handSlots.forEach((type,i)=>{
      const button=document.createElement('button');button.className='handSlot'+(activeHandSlot===i?' selected':'');
      button.setAttribute('aria-label',`Слот ${i+1}: ${type?ITEM[type].name:'свободный'}`);
      button.setAttribute('aria-pressed',String(activeHandSlot===i));
      button.innerHTML=`<span class="slotNumber">${i+1}</span><span class="slotArt">${type?itemIconHTML(type):'＋'}</span><span class="slotName">${type?ITEM[type].name:'Пусто'}</span>`;
      button.addEventListener('click',()=>{if(window.V010Inventory?.clickSuppressed())return;if(name==='quickSlots'&&window.V0162Quick)V0162Quick.open(i);else selectHandSlot(i);});holder.appendChild(button);
    });
  }
  el('heldItemName').textContent=heldItem()?ITEM[heldItem()].name+(heldItem()==='flashlight'&&!flashlightOn?' · выключен':''):'Руки свободны';
}
function cancelChop(){chopState=null;el('searchBarWrap').style.display='none';}
function useTree(tree){
  if(tree.wood<=0){message('Древесина уже собрана');return;}
  if(!tree.felled&&heldItem()!=='axe'){message('🪓 Выберите топор в быстром слоте');return;}
  if(freeItemSpace(bag,'wood',BAG_SLOTS)<=0){message('🎒 Освободите место для древесины');return;}
  if(tree.felled){collectTreeWood(tree);return;}
  if(chopState)return;
  chopState={id:tree.id,startedAt:Date.now(),duration:1800};
  player.aimX=tree.x-player.x;player.aimY=tree.y-player.y;
  const n=Math.hypot(player.aimX,player.aimY)||1;player.aimX/=n;player.aimY/=n;
}
function collectTreeWood(tree){
  const before=tree.wood;tree.wood=addItem('wood',before);
  message(`🪵 Древесина: +${before-tree.wood}`+(tree.wood?` · осталось ${tree.wood}`:''));
  if(tree.wood===0)message(`🪵 Древесина: +${before} · дерево вырастет через 10 минут игры`);
  queueGameSave();
}
function updateChop(){
  if(!chopState)return;
  const tree=worldTrees.find(t=>t.id===chopState.id);
  const target=interactionObjects('surface').find(o=>o.id===tree?.id);
  if(!tree||scene!=='surface'||playerDead||movePower>JOY_DEAD||bagCount('axe')<1||!canInteract(target,player.x,player.y)){cancelChop();return;}
  if(freeItemSpace(bag,'wood',BAG_SLOTS)<=0){cancelChop();message('Рюкзак заполнен');return;}
  const p=clamp((Date.now()-chopState.startedAt)/chopState.duration,0,1);
  const bar=el('searchBarWrap');bar.style.display=menuOpen?'none':'block';bar.style.left=(worldToScreen(player.x,player.y).x-46)+'px';bar.style.top=(worldToScreen(player.x,player.y).y-58)+'px';el('searchBarFill').style.width=(p*100)+'%';
  if(p>=1){tree.felled=true;tree.regrowMs=600000;invalidateGeometry();cancelChop();collectTreeWood(tree);}
}


function bagUsed(){return bag.length}
function addItem(type,qty){
  let left=qty;
  for(const s of bag){
    if(s.type===type && s.qty<STACK_MAX){
      const n=Math.min(left,STACK_MAX-s.qty); s.qty+=n; left-=n;
      if(left<=0) return 0;
    }
  }
  while(left>0 && bag.length<BAG_SLOTS){
    const n=Math.min(left,STACK_MAX); bag.push({type,qty:n}); left-=n;
  }
  return left;
}
function removeItem(type,qty){
  let left=qty;
  for(let i=bag.length-1;i>=0 && left>0;i--){
    const s=bag[i]; if(s.type!==type) continue;
    const n=Math.min(left,s.qty); s.qty-=n; left-=n;
    if(s.qty<=0) bag.splice(i,1);
  }
  return qty-left;
}
function bagCount(type){return bag.filter(s=>s?.type===type).reduce((a,s)=>a+s.qty,0)}
function freeItemSpace(slots,type,maxSlots){
  return Math.max(0,maxSlots-slots.length)*STACK_MAX+
    slots.reduce((n,s)=>n+(s.type===type?Math.max(0,STACK_MAX-s.qty):0),0);
}
function updateAmmoHud(){el("ammoHud").textContent=`🔫 ${magazine} / ${bagCount("ammo")}`;el("ammoHud").style.display=canFire()?"block":"none";}

function equippedArmor(){
  const body=equipment.body;
  return body && ITEM[body.type] ? (ITEM[body.type].armor||0) : 0;
}
function renderEquipment(){
  const box=el("equipmentSlots"); if(!box)return;
  box.innerHTML="";
  for(const key of ["head","body","legs","feet","backpack"]){
    const eq=equipment[key];
    const d=document.createElement("div");
    d.className="equipSlot"+(eq?" filled":"");
    d.dataset.equipSlot=key;
    const item=eq && eq.type && ITEM[eq.type] ? ITEM[eq.type] : eq;
    const name=item ? (item.name||"Экипировано") : "Пусто";
    d.innerHTML=`<div class="equipIcon">${item?.icon||EQUIP_ICONS[key]}</div><div class="equipText"><div class="equipLabel">${EQUIP_LABELS[key]}</div><b>${name}</b></div>`;
    box.appendChild(d);
  }
  el("characterStats").innerHTML=`❤️ HP: <b>${Math.round(player.health||100)}/${Math.round(player.maxHealth||100)}</b><br>🛡️ Защита тела: <b>${equippedArmor()}%</b><br>🎒 Вместимость: <b>${BAG_SLOTS}</b>`;
  el("bagCapacityText").textContent=`🎒 Рюкзак · ${bag.length}/${BAG_SLOTS}`;
}
function equipFromBag(index){
  const s=bag[index]; if(!s || !ITEM[s.type] || !ITEM[s.type].equip)return;
  const def=ITEM[s.type], slot=def.equip;
  const capacity=slot==="backpack"?def.capacity:BAG_SLOTS;
  const nextBag=clone(bag);
  nextBag[index].qty--;
  if(nextBag[index].qty===0)nextBag.splice(index,1);
  const old=equipment[slot];
  // Commit the swap only after both the remaining stack and old item fit.
  if(nextBag.length>capacity ||
     (old && addToSlots(nextBag,old.type,1,capacity)>0)){
    message("🎒 Освободите место для смены экипировки");
    return;
  }
  bag=nextBag;
  equipment[slot]={type:s.type};
  BAG_SLOTS=capacity;
  renderBag(); updateAmmoHud(); message(`${def.icon} Надето: ${def.name}`);
  queueGameSave();
}
function renderBag(){
  renderEquipment();
  renderQuickSlots();
  const g=el("inventoryGrid"); g.innerHTML="";
  for(let i=0;i<BAG_SLOTS;i++){
    const s=bag[i], d=document.createElement("div"); d.className="invSlot"; d.dataset.inventorySlot=i;
    d.innerHTML=s?`<div class="ico">${itemIconHTML(s.type)}</div><div>${ITEM[s.type].name}</div><div class="qty">${ITEM[s.type].hand?"В СЛОТ":ITEM[s.type].equip?"НАДЕТЬ"+(s.qty>1?" ×"+s.qty:""):"×"+s.qty}</div>`:`<div style="opacity:.28">ПУСТО</div>`;
    g.appendChild(d);
  }
}
function randomLoot(kind){
  const out=[];
  function put(type,min,max,chance=1){if(Math.random()<=chance)out.push({type,qty:min+Math.floor(Math.random()*(max-min+1))})}
  if(kind==="car"){put("fuel",3,14,.9);put("ammo",5,24,.72);put("metal",4,18,.82);put("parts",1,8,.58)}
  else{put("food",2,12,.92);put("meds",1,5,.68);put("ammo",3,16,.35);put("wood",3,12,.45)}
  return out.length?out:[{type:kind==="car"?"metal":"food",qty:2}];
}
function renderLoot(){
  const box=el("lootList"); box.innerHTML="";
  for(const s of activeLoot||[]){
    const r=document.createElement("div"); r.className="lootRow";
    r.innerHTML=`<span>${itemIconHTML(s.type)} ${ITEM[s.type].name}</span><b>×${s.qty}</b>`; box.appendChild(r);
  }
}
function openLoot(obj){
  if(!obj.searched){obj.loot=randomLoot(obj.kind);obj.searched=true;}
  if(!Array.isArray(obj.loot))obj.loot=[];
  activeLootObject=obj;
  activeLoot=obj.loot;
  el("lootTitle").textContent=obj.kind==="car"?"🚗 Машина":"🏚️ Здание";
  renderLoot(); openOverlay(el("lootOverlay"));
  queueGameSave();
}
function hasSearchableLoot(obj){
  return !obj.searched || (Array.isArray(obj.loot) && obj.loot.length>0);
}
function startSearch(obj){
  if(searchState)return;
  if(!hasSearchableLoot(obj)){message('Уже обыскано — здесь пусто');return;}
  if(obj.searched){openLoot(obj);return;}
  searchState={obj,start:performance.now(),duration:1000};
}
function cancelSearch(){searchState=null;el("searchBarWrap").style.display="none";el("searchBarFill").style.width="0%"}
function updateSearch(){
  if(!searchState)return;
  if(movePower>JOY_DEAD){cancelSearch();return}
  const p=clamp((performance.now()-searchState.start)/searchState.duration,0,1);
  const bar=el("searchBarWrap");
  bar.style.display="block";
  bar.style.left=(screenWidth/2-46)+"px";
  bar.style.top=(screenHeight/2-58)+"px";
  el("searchBarFill").style.width=(p*100)+"%";
  if(p>=1){const o=searchState.obj;cancelSearch();openLoot(o)}
}
function reloadWeapon(){
  if(magazine>=magazineMax)return;
  const need=magazineMax-magazine, got=removeItem("ammo",need); magazine+=got; updateAmmoHud();
  if(got>0)message("Перезарядка");
}
function nearestScavenge(){
  let best=null,bd=90;
  for(const o of scavenges){
    if(!hasSearchableLoot(o))continue;
    const cx=o.x+o.w/2,cy=o.y+o.h/2,d=distance(player.x,player.y,cx,cy);
    if(d<bd){bd=d;best=o}
  }
  return best;
}

