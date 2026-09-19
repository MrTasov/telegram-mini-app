/* 0.10 — persistent outer districts, voluntary events, shortcuts and bounded local AI. */
const V010World = (()=>{
  'use strict';
  const BASE_LOOT=scavenges.map(o=>o.id), BASE_TREES=worldTrees.map(o=>o.id), BASE_ORES=V09World.ores.map(o=>o.id);
  Object.assign(surface,{minX:-1000,maxX:2600,width:3600,height:4800});
  const defaults={enemyCount:1,enemyStrength:1,fuelRate:1,miningRate:1};
  const settings={...defaults};
  const regions=[
    {id:'woodland10',name:'Старый лес и лесопилка',x:-690,y:2320,r:650},
    {id:'industry10',name:'Восточная промзона',x:2290,y:2210,r:690},
    {id:'south10',name:'Южный посёлок',x:1180,y:3600,r:720},
    {id:'river10',name:'Речная тропа',x:-510,y:4160,r:510}
  ];
  const places=[
    ['mill10','mill','Лесопилка',-895,2080,265,190],
    ['woodgarage10','garage','Мастерская лесника',-845,2710,225,165],
    ['warehouse10','warehouse','Склад промзоны',2090,1450,335,230],
    ['garage10','garage','Автосервис',2120,2010,320,210],
    ['substation10','substation','Подстанция',2140,2600,285,190],
    ['pharmacy10','pharmacy','Аптека',1070,3190,280,210],
    ['market10','market','Продуктовый магазин',1490,3210,310,230],
    ['residence10a','residence','Дом садовника',1110,3660,260,210],
    ['residence10b','residence','Жилой дом',1540,3720,260,200],
    ['gasstation10','fuel','Заправка',1050,4280,310,190],
    ['lockedwarehouse10','warehouse','Запертый склад',2040,4320,340,240],
    ['supplywreck10','supply','Разбитый грузовик снабжения',405,3410,160,78]
  ].map(([id,zone,name,x,y,w,h])=>({id,zone,name,x,y,w,h,kind:zone==='supply'?'car':'house',searched:false,searchedAt:null}));
  const cars=[['car10a',1810,3100,130,64],['car10b',2070,2330,130,64],['car10c',1140,4550,130,64],['car10d',1730,4100,64,130],['car10e',-730,2940,130,64]].map(([id,x,y,w,h])=>({id,x,y,w,h,kind:'car',zone:'garage',name:'Брошенная машина',searched:false,searchedAt:null}));
  scavenges.push(...places,...cars);
  const newTrees=[];
  for(let row=0;row<14;row++)for(let col=0;col<3;col++){
    const x=-927+col*170+Math.sin(row*3.1+col)*28, y=1190+row*244+Math.cos(col+row)*29;
    if(places.some(o=>rectHit(x,y,80,o))||(Math.abs(x+530)<90&&y<3740)||(y>3130&&y<3240)||(y>3830&&y<4020))continue;
    newTrees.push({id:'tree10_'+row+'_'+col,x,y,r:24,felled:false,wood:15,regrowMs:0});
  }
  for(const [i,p] of [[-190,3270],[-90,3560],[220,3700],[380,4210],[75,4510],[1520,4610],[1840,4430],[1900,3630],[2420,3360],[2360,3820]].entries())newTrees.push({id:'tree10_south'+i,x:p[0],y:p[1],r:24,felled:false,wood:15,regrowMs:0});
  worldTrees.push(...newTrees);
  const newOres=[['iron10a','iron_ore',-820,1720,100],['iron10b','iron_ore',-680,2430,125],['iron10c','iron_ore',-750,4480,150],['copper10a','copper_ore',2400,1200,100],['copper10b','copper_ore',2410,3000,125],['copper10c','copper_ore',2350,4660,150]].map(([id,type,x,y,capacity])=>({id,type,x,y,r:46,capacity,remaining:capacity,regrowMs:0}));
  V09World.ores.push(...newOres);
  const caches=[{id:'cache10forest',name:'Укрытие лесника',icon:'🏕',x:-725,y:3480,items:[]},{id:'cache10south',name:'Дорожное укрытие',icon:'🏕',x:2190,y:3940,items:[]}];
  const shortcuts=[
    {id:'forestgate10',kind:'gate',name:'Лесная калитка',x:-525,y:3180,w:120,h:16,open:false,cost:{}},
    {id:'rubble10',kind:'rubble',name:'Завал у промзоны',x:2010,y:2860,w:120,h:65,open:false,cost:{}},
    {id:'bridge10',kind:'bridge',name:'Восстановить мост',x:-540,y:3880,w:130,h:110,open:false,cost:{wood:10,parts:2}}
  ];
  const barriers=[{id:'forestfence10a',x:-980,y:3180,w:455,h:12},{id:'forestfence10b',x:-405,y:3180,w:510,h:12},{id:'industrialfence10a',x:1965,y:2610,w:12,h:250},{id:'industrialfence10b',x:1965,y:2925,w:12,h:205}];
  // The eastern path always bypasses the river; the repairable bridge opens a shorter route.
  const river={x:-1000,y:3890,w:1550,h:86};
  const events={lockedwarehouse10:false,supplywreck10:false};
  let overlay=null,sneaking=false,walkingNoise=false,elapsed=0,shortcutWork=null;
  const emit=(event,data)=>{if(window.V010?.emit)V010.emit(event,data);};
  const log=(text)=>{if(window.V010?.log)V010.log(text);else message(text);};
  const oldSolids=solidObjects;
  solidObjects=function(which){const out=oldSolids(which);return which==='surface'?[...out,...barriers,...shortcuts.filter(s=>!s.open&&s.kind!=='bridge'),...caches.map(c=>({id:c.id,x:c.x-25,y:c.y-18,w:50,h:36}))]:out;};
  const oldCollision=worldCollision;
  worldCollision=function(x,y,r=15,which=scene,ignoreId=null){
    if(which==='surface'&&rectHit(x,y,r,river)){
      const b=shortcuts[2];if(!b.open||x-r<b.x||x+r>b.x+b.w)return true;
    }
    return oldCollision(x,y,r,which,ignoreId);
  };
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){const out=oldInteractions(which);if(which!=='surface')return out;
    for(const o of out){const p=places.find(p=>p.id===o.id);if(p){o.name=p.name+(hasSearchableLoot(p)?' · обыскать':' · пусто');if(p.id==='lockedwarehouse10'&&!events.lockedwarehouse10)o.name='Запертый склад · открыть за 4 детали';}}
    out.push(...shortcuts.filter(s=>!s.open).map(s=>({...s,kind:'shortcut10',ref:s,range:65})),...caches.map(c=>({id:c.id,kind:'shelter10',name:c.name,x:c.x-25,y:c.y-18,w:50,h:36,ref:c,range:52})));
    return out;
  };
  function lootFor(o){
    const rows=[],put=(type,min,max,chance=1)=>{if(Math.random()<chance)rows.push({type,qty:min+Math.floor(Math.random()*(max-min+1))});};
    switch(o.zone){
      case 'pharmacy':put('meds',6,14);put('medicinal_herbs',8,20);put('water',5,12,.8);break;
      case 'market':put('food',10,22);put('water',12,25);put('potato',6,14,.8);put('grain',10,18,.8);break;
      case 'fuel':put('fuel',18,30);put('parts',3,8);put('iron',4,10,.6);break;
      case 'mill':put('wood',22,40);put('parts',2,6,.8);put('iron',4,9,.8);break;
      case 'substation':put('copper',12,24);put('parts',5,10);if(ITEM.advanced_parts)put('advanced_parts',1,2,.5);put('fuel',4,10,.5);break;
      case 'warehouse':if(ITEM.advanced_parts)put('advanced_parts',1,3,o.id==='lockedwarehouse10'?1:.5);put('parts',7,15);put('iron',12,22);put('copper',7,14);put('vest2',1,1,.15);break;
      case 'supply':if(ITEM.advanced_parts)put('advanced_parts',1,2);put('meds',3,6);put('ammo',20,45);put('ammo556',20,45);put('parts',6,12);break;
      case 'garage':put('parts',3,10);put('iron',5,14);put('fuel',3,14,.5);break;
      default:put('food',4,10);put('water',5,12,.7);put('wood',5,12,.6);put('meds',1,4,.4);
    }
    if(window.V010Combat?.rollFoundItem)rows.forEach(s=>{if(ITEM[s.type]?.equip||ITEM[s.type]?.hand&&s.type.startsWith('rifle_'))V010Combat.rollFoundItem(s);});
    return rows;
  }
  const oldOpenLoot=openLoot;
  openLoot=function(o){
    const first=o.zone&&!o.searched;
    if(first){o.loot=lootFor(o);o.searched=true;o.searchedAt=Date.now();}
    oldOpenLoot(o);
    if(o.zone)el('lootTitle').textContent=o.name;
    if(first&&o.id==='supplywreck10'&&!events.supplywreck10){events.supplywreck10=true;window.V010Progression?.unlock('tools_upgrade');emit('worldevent',{id:o.id,kind:'supply'});log('Найдены припасы разбитого грузовика');queueGameSave();}
  };
  const oldExecute=executeInteraction;
  executeInteraction=function(target){
    if(!target||menuOpen||playerDead||!canInteract(target,player.x,player.y))return oldExecute(target);
    if(target.id==='lockedwarehouse10'&&!events.lockedwarehouse10){showUnlock(target);return;}
    if(target.kind==='shortcut10'){beginShortcut(target.ref);return;}
    if(target.kind==='shelter10'){stopControls(true);openCache(target.ref);return;}
    if(target.id==='supplywreck10'&&!target.ref.searched){oldExecute(target);if(searchState?.obj===target.ref)searchState.duration=2300;return;}
    return oldExecute(target);
  };
  function panel(title){if(!overlay)overlay=v09Overlay('v010WorldOverlay',title);overlay.querySelector('h2').textContent=title;const body=overlay.querySelector('.v09Body');body.innerHTML='';return body;}
  function showUnlock(target){stopControls(true);const body=panel('Запертый склад');const p=document.createElement('p');p.textContent='Восстановите механизм замка. Потребуется 4 детали. Внутри — материалы и редкая находка.';body.append(p);
    const b=v09Button('Открыть · 4 детали',()=>{if(bagCount('parts')<4||!canInteract(target,player.x,player.y))return;removeItem('parts',4);events.lockedwarehouse10=true;window.V010Progression?.unlock('precision_blueprint');closeOverlay(overlay);emit('worldevent',{id:target.id,kind:'warehouse'});log('Открыт склад промзоны');queueGameSave();startSearch(target.ref);});b.disabled=bagCount('parts')<4;body.append(b);openOverlay(overlay);
  }
  function beginShortcut(s){
    if(s.open)return;
    if(s.kind==='gate'&&player.y<s.y){message('Калитка открывается с южной стороны — обойдите по дороге');return;}
    if(s.kind==='rubble'&&bagCount('axe')<1){message('Для расчистки завала нужен топор в рюкзаке');return;}
    if(Object.entries(s.cost).some(([type,q])=>bagCount(type)<q)){message('Для моста нужно 10 древесины и 2 детали');return;}
    stopControls();cancelSearch();cancelChop();shortcutWork={id:s.id,elapsed:0,duration:s.kind==='gate'?600:3000};
  }
  function finishShortcut(s){
    if(Object.entries(s.cost).some(([t,q])=>bagCount(t)<q)){shortcutWork=null;return;}
    for(const [type,q] of Object.entries(s.cost))removeItem(type,q);
    s.open=true;shortcutWork=null;el('searchBarWrap').style.display='none';invalidateGeometry();queueGameSave();emit('shortcut',{id:s.id});log(s.kind==='bridge'?'Мост восстановлен — открыт короткий путь':s.kind==='gate'?'Лесная калитка открыта':'Завал расчищен');
  }
  function openCache(c){
    if(window.V010Inventory?.openExternalChest){V010Inventory.openExternalChest(c);return;}
    const body=panel(c.name);const p=document.createElement('p');p.textContent='Укрытие · 60 ячеек. Нажмите предмет, чтобы перенести стопку.';body.append(p);
    for(const [title,from,to,max] of [['В укрытии',c.items,bag,BAG_SLOTS],['В рюкзаке',bag,c.items,60]]){const h=document.createElement('h3');h.textContent=title;body.append(h);const grid=document.createElement('div');grid.className='v010CacheGrid';body.append(grid);from.forEach((s,i)=>{if(!s)return;const b=v09Button('',()=>{const count=s.qty,left=addToSlots(to,s.type,count,max,s),moved=count-left;if(moved){if(s.type==='fish')V014Fish.remove(s,moved);s.qty-=moved;if(!s.qty)from[i]=null;renderBag();queueGameSave();openCache(c);}else message('Нет свободного места');});b.innerHTML=itemIconHTML(s.type)+'<small>'+s.qty+'</small>';grid.append(b);});}
    openOverlay(overlay);
  }
  // Walk/run noise is distinct from a shot or pickaxe strike. Crouching never silences a gun.
  const oldNoise=createNoise;
  createNoise=function(x,y,radius){
    if(walkingNoise)radius=sneaking?28:(player.running?135:70);
    oldNoise(x,y,radius);noiseEvent.followPlayer=walkingNoise;emit('noise',{x,y,radius,time:performance.now()});
  };
  const oldPlayer=updatePlayer;
  updatePlayer=function(){const run=player.runSpeed,walk=player.walkSpeed;if(sneaking){player.runSpeed=run*.5;player.walkSpeed=walk*.5;}walkingNoise=true;try{return oldPlayer();}finally{walkingNoise=false;player.runSpeed=run;player.walkSpeed=walk;}};
  const sneakButton=document.createElement('button');sneakButton.id='v010SneakButton';sneakButton.textContent='Тихо';sneakButton.title='Тихое передвижение · C';sneakButton.setAttribute('aria-label','Тихое передвижение');sneakButton.setAttribute('aria-pressed','false');document.body.append(sneakButton);
  function setSneaking(value){sneaking=!!value;sneakButton.classList.toggle('active',sneaking);sneakButton.setAttribute('aria-pressed',String(sneaking));}
  sneakButton.addEventListener('click',e=>{e.stopPropagation();if(!menuOpen&&!playerDead)setSneaking(!sneaking);});
  document.addEventListener('keydown',e=>{if(!e.repeat&&e.code==='KeyC'&&!menuOpen&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();setSneaking(!sneaking);}});
  // Seed encounters in districts, never on the new roads or a fortification.
  const allSpawns=[...outsideSpawns.map(p=>({...p}))];
  for(const [x,y] of [[-480,1900],[-560,2360],[-510,2780],[2470,1670],[2000,1850],[2470,2300],[2180,2920],[1070,3480],[1470,3490],[1830,3540],[1010,3880],[1800,3930],[1060,4540],[1630,4540],[2110,4620],[-660,4180],[-320,4380],[480,3640],[2350,4100],[1920,4400],[50,3450],[310,4440],[1890,4650],[2270,3210]])allSpawns.push({x,y});
  const TYPES={normal:{name:'Обычный',speed:.65,chaseSpeed:1.45,damage:10,cooldown:950,color:'#637359',radius:17},fast:{name:'Быстрый',speed:.9,chaseSpeed:2.25,damage:8,cooldown:700,color:'#94705a',radius:15},heavy:{name:'Тяжёлый',speed:.45,chaseSpeed:1.08,damage:18,cooldown:1300,color:'#566a72',radius:21}};
  const typeAt=i=>i<3?'normal':i%5===0?'heavy':i%3===0?'fast':'normal';
  function configureZombie(z,i,type=typeAt(i)){z.type=type;z.worldId='z10_'+i;Object.assign(z,{speed:TYPES[type].speed,chaseSpeed:TYPES[type].chaseSpeed,radius:TYPES[type].radius});if(window.V017Monsters)V017Monsters.prepare(z);return z;}
  function targetCount(){return window.V017Monsters?V017Monsters.targetCount():Math.min(64,Math.round(allSpawns.length*settings.enemyCount));}
  function spawnAt(i){const p=allSpawns[i%allSpawns.length],angle=Math.floor(i/allSpawns.length)*2.3;let x=p.x+Math.sin(angle)*65,y=p.y+Math.cos(angle)*50;if(worldCollision(x,y,24,'surface')){x=p.x;y=p.y;}return configureZombie(makeZombie(x,y),i);}
  function adjustPopulation(){if(window.V017Monsters){V017Monsters.population(performance.now(),true);return;}const count=targetCount();if(zombies.length>count)zombies.length=count;while(zombies.length<count)zombies.push(spawnAt(zombies.length));zombies.forEach((z,i)=>configureZombie(z,i,z.type&&TYPES[z.type]?z.type:typeAt(i)));}
  resetZombies=function(){zombies=Array.from({length:targetCount()},(_,i)=>spawnAt(i));};
  adjustPopulation();
  function zombieDamage(z,amount){return amount/settings.enemyStrength;}
  // Local steering examines only a few nearby swept segments; there is no synchronous world A* per zombie.
  function steer(z,angle,step){
    const signs=z.turnSign||((Number(z.worldId?.split('_')[1])||0)%2?1:-1);
    for(const offset of [0,.48*signs,.95*signs,1.5*signs,-.6*signs,-1.25*signs,Math.PI]){
      const a=angle+offset,dx=Math.cos(a),dy=Math.sin(a),look=Math.max(step+2,16);
      if(!worldCollision(z.x+dx*look,z.y+dy*look,z.radius,'surface')&&!worldCollision(z.x+dx*step,z.y+dy*step,z.radius,'surface')){z.x+=dx*step;z.y+=dy*step;if(offset)z.turnSign=Math.sign(offset);return true;}
    }return false;
  }
  updateZombies=function(){
    if(scene!=='surface'||menuOpen||playerDead)return;
    const now=performance.now(),onWall=!!window.V091Fortress?.isElevated?.();
    for(const z of zombies){if(!z.alive)continue;const type=TYPES[z.type]||TYPES.normal,d=distance(player.x,player.y,z.x,z.y);if(d>950){z.state='wander';continue;}
      if(window.V015Base?.siege(z,type,now,frameScale,settings.enemyStrength))continue;
      const safeWall=onWall||(!window.V015Base&&!gateOpen&&!inFortress(z.x,z.y)&&inFortress(player.x,player.y));
      if(now>=(z.nextSenseAt||0)){z.nextSenseAt=now+170;z.seesPlayer=!safeWall&&d<(sneaking?135:270)&&lineClear(z.x,z.y,player.x,player.y,0,'surface');}
      const hears=now-noiseEvent.time<650&&noiseEvent.radius>0&&distance(z.x,z.y,noiseEvent.x,noiseEvent.y)<noiseEvent.radius;
      if(!safeWall&&(z.seesPlayer||hears)){z.state='chase';z.lastKnown={x:z.seesPlayer?player.x:noiseEvent.x,y:z.seesPlayer?player.y:noiseEvent.y};z.alertUntil=now+5500;}
      if(safeWall||now>(z.alertUntil||0)||d>680)z.state='wander';
      if(d<ZOMBIE_AUDIO_RADIUS&&visibleOnScreen(z.x,z.y,45)&&now>z.lastGrowl){playZombieBuffer(z);z.lastGrowl=now+3500+Math.random()*4500;}
      let angle=z.wanderAngle;
      if(z.state==='chase'){
        if(d<z.radius+player.radius+9&&lineClear(z.x,z.y,player.x,player.y,0,'surface')&&now-z.lastAttack>type.cooldown){z.lastAttack=now;damagePlayer(type.damage*settings.enemyStrength);}
        const target=z.seesPlayer?player:z.lastKnown;if(target){angle=Math.atan2(target.y-z.y,target.x-z.x);if(distance(z.x,z.y,target.x,target.y)<18&&!z.seesPlayer)z.state='wander';}
      }else if(now>z.nextWanderChange){z.wanderAngle=Math.random()*Math.PI*2;z.nextWanderChange=now+1800+Math.random()*3000;angle=z.wanderAngle;}
      const speed=(z.state==='chase'?type.chaseSpeed:type.speed)*.5*frameScale;if(!steer(z,angle,speed))z.nextWanderChange=0;
    }
  };
  const oldZombieDraw=drawZombie;
  drawZombie=function(z){if(!visibleOnScreen(z.x,z.y,60))return;if(!z.alive||!z.type||z.type==='normal')return oldZombieDraw(z);
    const t=TYPES[z.type],a=Math.atan2(player.y-z.y,player.x-z.x),hit=performance.now()-z.hitFlash<100;
    ctx.save();ctx.translate(z.x,z.y);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(3,7,t.radius+3,t.radius*.6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=hit?'#d8c5b2':t.color;ctx.fillRect(-t.radius*.6,-t.radius*.65,t.radius*1.2,t.radius*1.45);ctx.fillStyle=hit?'#ead9bd':'#a29c77';ctx.beginPath();ctx.arc(3,-t.radius,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle=t.color;ctx.lineWidth=z.type==='heavy'?9:4;ctx.beginPath();ctx.moveTo(3,-4);ctx.lineTo(24,-8);ctx.moveTo(3,8);ctx.lineTo(25,7);ctx.stroke();
    if(z.type==='heavy'){ctx.strokeStyle='#b99c68';ctx.lineWidth=3;ctx.strokeRect(-11,-10,22,27);}else{ctx.strokeStyle='#c3a286';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(6,11);ctx.stroke();}ctx.restore();
    if(distance(player.x,player.y,z.x,z.y)<220){ctx.fillStyle=z.type==='heavy'?'#d0b276':'#d6a18a';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText(t.name,z.x,z.y-t.radius-12);}
  };
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function line(points,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  function text(label,x,y,size=12,color='#e0dcc2'){ctx.fillStyle=color;ctx.font=`600 ${size}px Arial`;ctx.textAlign='center';ctx.fillText(label,x,y);}
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function visibleRect(o,pad=80){return visibleOnScreen(o.x+(o.w||0)/2,o.y+(o.h||0)/2,Math.max(o.w||0,o.h||0)/2+pad);}
  function drawRoad(points,width=94){line(points,'#74776b',width+22);line(points,'#414c4c',width);ctx.setLineDash([22,26]);line(points,'#b4af87',2);ctx.setLineDash([]);}
  function drawBuilding(p){if(p.v011Interior||!visibleRect(p))return;const {x,y,w,h}=p;
    if(p.zone==='supply'){rect(x-14,y-12,w+28,h+24,'#595b4d');rect(x+8,y+9,w,h,'#16272588');rect(x,y,w,h,'#7a7659');rect(x+5,y+4,w*.67,h-8,'#686d59');rect(x+w*.74,y+10,w*.18,h-20,'#2d4347');for(let a=15;a<w-30;a+=28)line([[x+a,y+5],[x+a,y+h-5]],'#97917c',2);for(const oy of [-6,h-2])for(const ox of [20,w-40])rect(x+ox,y+oy,25,10,'#232d2c');text('ГРУЗОВИК СНАБЖЕНИЯ',x+w/2,y-18,10);return;}
    rect(x-18,y-18,w+36,h+62,'#606658');rect(x+12,y+18,w,h,'#1a282655');rect(x,y,w,h,'#969381');rect(x,y+h-38,w,38,'#66665c');
    let color={pharmacy:'#5d7970',market:'#9b7655',fuel:'#8b6355',mill:'#847153',garage:'#65727a',substation:'#606f72',warehouse:'#6f7771',residence:'#7c7266'}[p.zone]||'#737970';
    rect(x-7,y-8,w+14,h-25,color);rect(x-7,y-8,w+14,12,'#c4c3a340');for(let a=22;a<w;a+=27)line([[x+a,y+5],[x+a,y+h-35]],'#23373430',2);
    rect(x+w*.42,y+h-38,w*.2,38,'#293d3d');rect(x+w*.52,y+h-17,4,4,'#d6c795');
    for(const ox of [18,w-62]){rect(x+ox-3,y+h-31,49,24,'#9da597');rect(x+ox,y+h-29,43,20,'#284c52');line([[x+ox+21,y+h-29],[x+ox+21,y+h-9]],'#849c90',2);}
    rect(x+w/2-94,y+h+8,188,26,'#172d2bdd');text(p.name.toUpperCase(),x+w/2,y+h+25,10);
    if(p.zone==='pharmacy'){rect(x+w/2-32,y+h*.35,64,64,'#e4dfcc');rect(x+w/2-8,y+h*.35+8,16,48,'#47765c');rect(x+w/2-24,y+h*.35+24,48,16,'#47765c');}
    if(p.zone==='market'){for(let i=0;i<9;i++)rect(x+i*w/9,y+h-46,w/9,15,i%2?'#c0a17e':'#754e39');}
    if(p.zone==='garage'||p.zone==='warehouse'){rect(x+25,y+h*.25,w-50,42,'#3d4b4b');for(let k=0;k<4;k++)line([[x+27,y+h*.25+5+k*9],[x+w-27,y+h*.25+5+k*9]],'#778b85',2);}
    if(p.zone==='mill'){for(let i=0;i<5;i++){line([[x+20,y+h+49+i*7],[x+112,y+h+49+i*7]],'#98764f',6);ellipse(x+20,y+h+49+i*7,4,4,'#c2a477');}}
    if(p.zone==='substation'){for(const ox of [60,145,230]){rect(x+ox-19,y+40,38,72,'#34494a');for(let a=0;a<4;a++)rect(x+ox-23,y+48+a*12,46,5,'#87978c');line([[x+ox,y+42],[x+ox,y+18]],'#c4b981',3);}line([[x+60,y+18],[x+230,y+18]],'#292f2d',3);}
    if(p.zone==='fuel'){for(const ox of [35,115,195]){rect(x+ox,y+h+52,38,54,'#464e47');rect(x+ox+4,y+h+57,30,17,'#a9b2a3');rect(x+ox+7,y+h+60,24,11,'#304846');line([[x+ox+39,y+h+59],[x+ox+47,y+h+84],[x+ox+39,y+h+100]],'#1d2c2b',4);}rect(x-12,y+h+40,w+24,9,'#a67656');}
    if(p.id==='lockedwarehouse10'&&!events.lockedwarehouse10){rect(x+w/2-9,y+h-24,18,18,'#d7b169');line([[x+w/2-6,y+h-24],[x+w/2-6,y+h-31],[x+w/2+6,y+h-31],[x+w/2+6,y+h-24]],'#d7b169',3);}
  }
  function drawNewOre(o){V09World.drawOre(o); }
  function drawOutskirts(){
    ctx.save();ctx.beginPath();ctx.rect(-1000,0,600,4800);ctx.rect(2000,0,600,4800);ctx.rect(-400,3000,2400,1800);ctx.clip();
    const forestTint=ctx.createLinearGradient(-1000,0,-400,0);forestTint.addColorStop(0,'#304633');forestTint.addColorStop(1,'#45513e');rect(-1000,0,600,4800,forestTint);const industrialTint=ctx.createLinearGradient(2000,0,2600,0);industrialTint.addColorStop(0,'#45513e');industrialTint.addColorStop(1,'#3e4940');rect(2000,0,600,4800,industrialTint);rect(-400,3000,2400,1800,'#45513e');
    // Bound texture work to visible coordinates even when the camera is far from home.
    const vw=typeof viewWidth==='function'?viewWidth():screenWidth,vh=typeof viewHeight==='function'?viewHeight():screenHeight,left=Math.max(-1000,Math.floor(camera.x/100)*100),right=Math.min(2600,camera.x+vw+150),top=Math.max(0,Math.floor(camera.y/100)*100),bottom=Math.min(4800,camera.y+vh+150);
    for(let y=top,step=(window.V010Camera?.zoom??1)<.4?240:100;y<bottom;y+=step)for(let x=left;x<right;x+=step){if(!visibleOnScreen(x,y,120))continue;const dx=Math.sin(x+y)*27;ellipse(x+dx,y,15,7,'#23372630');line([[x+dx,y],[x+dx-4,y-8]],'#a2ad772e',2);}
    if(!window.V013City)drawRoad([[800,2965],[800,4800]],284);
    if(!window.V013City)drawRoad([[800,3500],[2420,3500]],102);if(!window.V013City)drawRoad([[800,4070],[2490,4070]],102);
    if(!window.V013City)drawRoad([[1940,1658],[2250,1658],[2250,1940]],84);if(!window.V013City)drawRoad([[1940,2408],[2040,2408],[2040,3500],[800,3500]],84);
    if(!window.V013City)drawRoad([[800,3060],[-530,3060],[-530,3740]],78);
    ctx.lineCap='round';for(const p of [[[-530,3060],[-530,2330],[-560,1800]],[[800,4600],[-270,4600],[-475,4160],[-475,3980]],[[-475,3880],[-475,3670],[-690,3540]]]){line(p,'#69735a',34);line(p,'#929077',24);}ctx.lineCap='butt';
    rect(river.x,river.y-12,river.w,river.h+24,'#8b8967');rect(river.x,river.y,river.w,river.h,'#365c5d');for(let x=-960;x<530;x+=80){if(!visibleOnScreen(x,3930,100))continue;line([[x,3920],[x+32,3917],[x+55,3920]],'#96bfab66',2);line([[x+17,3950],[x+46,3947]],'#91b4a655',2);}
    ctx.restore();
    for(const b of barriers){if(!visibleRect(b))continue;rect(b.x,b.y,b.w,b.h,'#6e7864');if(b.w>b.h)for(let x=b.x;x<b.x+b.w;x+=35)rect(x,b.y-6,6,22,'#a4a48a');else for(let y=b.y;y<b.y+b.h;y+=35)rect(b.x-6,y,22,6,'#a4a48a');}
    for(const s of shortcuts){if(!visibleRect(s))continue;if(s.kind==='bridge'){const color=s.open?'#a58b60':'#544e3e';for(let y=s.y;y<s.y+s.h;y+=13){if(s.open||y<s.y+23||y>s.y+s.h-25)rect(s.x,y,s.w,10,color);}for(const x of [s.x,s.x+s.w-7])rect(x,s.y,7,s.h,'#61523d');text(s.open?'МОСТ':'ВОССТАНОВИТЬ МОСТ',s.x+s.w/2,s.y-20,10);}else if(s.kind==='gate'){rect(s.x,s.y,s.open?8:s.w,s.open?85:s.h,'#8b8d73');if(!s.open)text('КАЛИТКА · ОТКРЫВАЕТСЯ С ЮГА',s.x+s.w/2,s.y-17,9);}else if(!s.open){for(let i=0;i<5;i++)poly([[s.x+i*20,s.y+50],[s.x+i*20+8,s.y+10+(i%2)*14],[s.x+i*20+34,s.y+16],[s.x+i*20+36,s.y+60]],i%2?'#777c6c':'#5b655a');text('РАСЧИСТИТЬ',s.x+s.w/2,s.y-13,10);}}
    for(const p of places)drawBuilding(p);
    // New trees are outside the old world clip; reuse the established tree artwork there.
    ctx.save();ctx.beginPath();ctx.rect(-1000,0,600,4800);ctx.rect(2000,0,600,4800);ctx.rect(-400,3000,2400,1800);ctx.clip();drawWorldTrees('extension');drawParkedCars();ctx.restore();
    for(const o of newOres)drawNewOre(o);
    for(const c of caches){if(!visibleOnScreen(c.x,c.y,170))continue;rect(c.x-75,c.y-110,150,105,'#293c3455');poly([[c.x-72,c.y-115],[c.x,c.y-159],[c.x+72,c.y-115],[c.x+65,c.y-104],[c.x-65,c.y-104]],'#6c7863');for(const ox of [-62,57])rect(c.x+ox,c.y-113,7,125,'#877155');rect(c.x-25,c.y-18,50,36,'#7e6849');rect(c.x-25,c.y-7,50,5,'#ad9567');rect(c.x-3,c.y-4,7,11,'#d1ba7d');text(c.name.toUpperCase(),c.x,c.y+40,10,'#d6d3aa');}
    for(const r of regions)if(visibleOnScreen(r.x,r.y,450)){ctx.globalAlpha=.65;text(r.name.toUpperCase(),r.x,r.y-110,17,'#c6c8ab');ctx.globalAlpha=1;}
  }
  const oldDrawSurface=drawSurface;
  drawSurface=function(){oldDrawSurface();drawOutskirts();};
  function updateShortcut(dt){if(!shortcutWork)return;const s=shortcuts.find(o=>o.id===shortcutWork.id),target={...s,range:65};if(!s||scene!=='surface'||menuOpen||playerDead||movePower>JOY_DEAD||!canInteract(target,player.x,player.y)){shortcutWork=null;el('searchBarWrap').style.display='none';return;}
    shortcutWork.elapsed+=dt;const bar=el('searchBarWrap');bar.style.display='block';const p=(typeof worldToScreen==='function'?worldToScreen(player.x,player.y):{x:player.x-camera.x,y:player.y-camera.y});bar.style.left=(p.x-46)+'px';bar.style.top=(p.y-64)+'px';el('searchBarFill').style.width=Math.min(100,shortcutWork.elapsed/shortcutWork.duration*100)+'%';if(shortcutWork.elapsed>=shortcutWork.duration)finishShortcut(s);
  }
  const oldUpdate=update;
  update=function(){oldUpdate();if(!menuOpen&&!playerDead&&!document.hidden)updateShortcut(16.667*frameScale);else if(shortcutWork){shortcutWork=null;el('searchBarWrap').style.display='none';}elapsed+=frameScale;if(elapsed>=20){elapsed=0;sneakButton.style.display=menuOpen||playerDead?'none':'block';}};
  function setSetting(key,value){if(!Object.hasOwn(defaults,key)||![.5,1,1.5,2].includes(value))return false;settings[key]=value;if(key==='enemyCount')adjustPopulation();queueGameSave();return true;}
  function showDifficulty(){const body=panel('Сложность');const desc=document.createElement('p');desc.className='v09Muted';desc.textContent='Каждый параметр настраивается отдельно. Менять можно в любой момент.';body.append(desc);
    for(const [key,title] of [['enemyCount','Количество зомби'],['enemyStrength','Сила зомби'],['fuelRate','Расход топлива'],['miningRate','Скорость добычи']]){const label=document.createElement('label');label.className='v010Difficulty';const span=document.createElement('span');span.textContent=title;const select=document.createElement('select');select.setAttribute('aria-label',title);for(const value of [.5,1,1.5,2]){const option=document.createElement('option');option.value=String(value);option.textContent=value+'×';select.append(option);}select.value=String(settings[key]);select.addEventListener('change',()=>setSetting(key,Number(select.value)));label.append(span,select);body.append(label);}openOverlay(overlay);
  }
  const difficultyButton=v09Button('Сложность мира',showDifficulty);difficultyButton.id='v010DifficultyButton';el('settingsOverlay').querySelector('.panel').append(difficultyButton);
  function migrateEntries(entries,all,old,make){if(!Array.isArray(entries))throw new Error('Нет данных мира');const allowed=new Set(all.map(o=>o.id)),byId=new Map();for(const o of entries){if(!o||!allowed.has(o.id)||byId.has(o.id))throw new Error('Неверный объект мира');byId.set(o.id,o);}if(!old.every(id=>byId.has(id)))throw new Error('Неполные данные мира');return all.map(o=>byId.get(o.id)||make(o));}
  function migrateData(d){
    if(!d||!d.v09)return d;
    d.loot=migrateEntries(d.loot,scavenges,BASE_LOOT,o=>({id:o.id,searched:false,loot:[]}));
    d.trees=migrateEntries(d.trees,worldTrees,BASE_TREES,o=>({id:o.id,felled:false,wood:15,regrowMs:0}));
    if(d.v09.world)d.v09.world.ores=migrateEntries(d.v09.world.ores,V09World.ores,BASE_ORES,o=>({id:o.id,remaining:o.capacity,regrowMs:0}));
    if(d.v091?.loot)d.v091.loot.objects=migrateEntries(d.v091.loot.objects,scavenges,BASE_LOOT,o=>({id:o.id,searchedAt:null}));
    return d;
  }
  function validate(d){
    if(!d||d.schema!==1||!d.settings||!Object.keys(defaults).every(k=>[.5,1,1.5,2].includes(d.settings[k])))throw new Error('Неверные настройки мира');
    if(!d.events||!Object.keys(events).every(k=>typeof d.events[k]==='boolean')||!Array.isArray(d.shortcuts)||d.shortcuts.length!==shortcuts.length||!d.shortcuts.every((s,i)=>s?.id===shortcuts[i].id&&typeof s.open==='boolean'))throw new Error('Неверные события мира');
    if(!Array.isArray(d.types)||d.types.length>144||!d.types.every(t=>Object.hasOwn(TYPES,t)))throw new Error('Неверные типы противников');
    if(!Array.isArray(d.caches)||d.caches.length!==caches.length||!d.caches.every((c,i)=>c?.id===caches[i].id&&typeof c.name==='string'&&c.name.length<=64&&typeof c.icon==='string'&&c.icon.length<=64&&Array.isArray(c.items)&&c.items.length<=60&&c.items.every(s=>s===null||s&&Object.hasOwn(ITEM,s.type)&&Number.isInteger(s.qty)&&s.qty>0&&s.qty<=(['ammo','ammo556'].includes(s.type)?600:STACK_MAX)&&(!window.V010Combat||V010Combat.validateItem(s)!==false))))throw new Error('Неверные запасы укрытий');return true;
  }
  function capture(){return {schema:1,settings:{...settings},events:{...events},shortcuts:shortcuts.map(s=>({id:s.id,open:s.open})),types:zombies.map(z=>z.type||'normal'),caches:caches.map(c=>({id:c.id,name:c.name,icon:c.icon,items:clone(c.items)}))};}
  function restore(d){if(d)validate(d);Object.assign(settings,d?d.settings:defaults);for(const k of Object.keys(events))events[k]=d?d.events[k]:false;shortcuts.forEach((s,i)=>s.open=d?d.shortcuts[i].open:false);caches.forEach((c,i)=>{c.items=clone(d?d.caches[i].items:[]);if(d){c.name=d.caches[i].name;c.icon=d.caches[i].icon;}});zombies.forEach((z,i)=>configureZombie(z,i,d?.types[i]||typeAt(i)));if(!d)adjustPopulation();shortcutWork=null;setSneaking(false);invalidateGeometry();}
  v09Style('.v010CacheGrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}.v010CacheGrid .menuButton{padding:4px;min-width:0;margin:0}.v010CacheGrid .itemIcon{width:34px;height:34px}.v010CacheGrid small{display:block;font-weight:400}.v010Difficulty{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:14px 0;font-size:14px}.v010Difficulty select{padding:8px;border:1px solid #71897e;border-radius:7px;background:#1a2e30;color:#e2e9df;font-size:15px}#v010SneakButton{position:fixed;z-index:31;left:calc(env(safe-area-inset-left,0px) + 22px);bottom:calc(env(safe-area-inset-bottom,0px) + 205px);border:1px solid #a8c0ae66;background:#192c2bba;color:#c7d2c7;border-radius:8px;padding:8px 11px;font:11px Arial;touch-action:manipulation}#v010SneakButton.active{background:#648465;color:white;border-color:#b9c9a5}@media(max-height:500px){#v010SneakButton{bottom:calc(env(safe-area-inset-bottom,0px) + 165px);left:calc(env(safe-area-inset-left,0px) + 17px)}}');
  const api={regions,places,cars,caches,shortcuts,newOres,newTrees,settings,TYPES,registerSpawns(points){allSpawns.push(...points);adjustPopulation();},spawnAt,targetCount,migrateData,capture,restore,validate,setSetting,showDifficulty,zombieDamage,openCache,lootFor,get noise(){return {...noiseEvent,at:noiseEvent.time};},get sneaking(){return sneaking;},setSneaking};
  if(window.V010?.modules)V010.modules.world={capture,restore,validate};
  window.V010World=api;invalidateGeometry();return api;
})();

