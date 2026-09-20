/* 0.12: saved map filters, traversable neighbourhood interiors and fading corpses. */
window.V011World=(()=>{
  'use strict';
  const defaults={zombies:true,trees:true,ore:true,buildings:true,interactives:false};
  const filters={...defaults};
  function mapEnabled(m){return filters[m.kind==='zombie'?'zombies':['tree','wood'].includes(m.kind)?'trees':['iron','copper','stone','coal'].includes(m.kind)?'ore':m.kind==='interactive'?'interactives':'buildings'];}
  const legend=el('v010MapOverlay').querySelector('.v010MapLegend');
  const categoryLabels={zombies:'Зомби',trees:'Деревья',ore:'Руда',buildings:'Постройки',interactives:'Оборудование'};
  const tools=el('v010MapOverlay').querySelector('.v010MapTools');
  const clearGoal=v09Button('Снять цель',()=>V010Camera.clearGoal());clearGoal.id='v011ClearMapGoal';tools.append(clearGoal);
  const filterButton=v09Button('Слои карты',()=>{options.hidden=!options.hidden;filterButton.setAttribute('aria-expanded',String(!options.hidden));});filterButton.id='v011MapFilters';filterButton.setAttribute('aria-expanded','false');tools.append(filterButton);
  const options=document.createElement('div');options.id='v011MapFilterOptions';options.className='v011MapFilterOptions';options.hidden=true;tools.after(options);
  const boxes={};
  for(const [key,label] of Object.entries(categoryLabels)){
    const row=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='checkbox';input.checked=filters[key];I18n.setAttr(input,'aria-label',label);I18n.assign(span,"textContent",label);row.append(input,span);options.append(row);boxes[key]=input;
    input.addEventListener('change',()=>setFilter(key,input.checked));
  }
  function updateLegend(){
    legend.replaceChildren();
    for(const [key,color,text] of [['player','#f1ead1','● Вы'],['zombies','#f04e52','● Зомби'],['trees','#75b57b','▲ Деревья'],['ore','#a8a0f4','◆ Руда'],['buildings','#d1ba85','■ Постройки'],['interactives','#82d3d5','+ Оборудование']]){
      if(key!=='player'&&!filters[key])continue;const span=document.createElement('span');span.style.color=color;I18n.assign(span,"textContent",text);legend.append(span);
    }
    for(const key of Object.keys(boxes))boxes[key].checked=filters[key];
  }
  function setFilter(key,value){if(!Object.hasOwn(filters,key))return false;filters[key]=!!value;updateLegend();queueGameSave();V010Camera.drawFull();return true;}
  v09Style(`.v010MapTools{align-items:center;gap:5px}.v010MapTools .menuButton{font-size:11px;padding:7px 9px;min-height:30px;border-color:#759c9338;background:#23343180}.v010MapTools input{font-size:11px;min-width:95px}.v010MapLegend{display:flex;flex-wrap:wrap;gap:6px 12px;line-height:1.4}.v011MapFilterOptions{display:flex;gap:8px 14px;flex-wrap:wrap;background:#142523;margin:8px 0;padding:10px;border-radius:8px}.v011MapFilterOptions[hidden]{display:none}.v011MapFilterOptions label{display:flex;align-items:center;gap:5px;font-size:11px;color:#bfd0c7}.v011MapFilterOptions input{accent-color:#8dbfaa;width:15px;height:15px}#v010MapHint{font-size:10px;line-height:1.4;margin:7px 0}`);
  updateLegend();

  const buildings=[];
  const byId=new Map();
  const containers=[];
  function inside(b,x,y,pad=12){return x>b.x+pad&&x<b.x+b.w-pad&&y>b.y+pad&&y<b.y+b.h-pad;}
  function doorRect(b){return {id:b.id+'_door',x:b.x+b.w/2-38,y:b.y+b.h-12,w:76,h:12};}
  function walls(b){
    const d=doorRect(b),out=[
      {id:b.id+'_north',x:b.x,y:b.y,w:b.w,h:12},
      {id:b.id+'_west',x:b.x,y:b.y,w:12,h:b.h},
      {id:b.id+'_east',x:b.x+b.w-12,y:b.y,w:12,h:b.h},
      {id:b.id+'_southW',x:b.x,y:d.y,w:d.x-b.x,h:12},
      {id:b.id+'_southE',x:d.x+d.w,y:d.y,w:b.x+b.w-d.x-d.w,h:12}
    ];
    if(b.doorProgress<.88)out.push(d);
    if(b.style==='home')out.push({id:b.id+'_partitionN',x:b.x+b.w*.6,y:b.y+12,w:9,h:72},{id:b.id+'_partitionS',x:b.x+b.w*.6,y:b.y+b.h-91,w:9,h:79});
    return out;
  }
  function addFurniture(b,key,dx,dy,w,h,name,lootKind,primary=false){
    const index=b.furniture.length,id=b.id+'_furniture_'+index;
    const f={id,key,x:b.x+dx,y:b.y+dy,w,h,name,lootKind};b.furniture.push(f);
    if(lootKind){f.ref=primary?b.source:{id,kind:'house',searched:false,searchedAt:null,loot:[]};containers.push(f);}
    return f;
  }
  function registerBuilding(source,overrides={}){
    if(!source||source.kind!=='house'||byId.has(source.id))return byId.get(source?.id)||null;
    const style=['garage','mill'].includes(source.zone)?'workshop':['warehouse','fuel'].includes(source.zone)?'warehouse':['market','pharmacy'].includes(source.zone)?'shop':'home';
    const b={id:source.id,title:source.name||'Жилой дом',style,x:source.x,y:source.y,w:Math.max(340,source.w),h:Math.max(300,source.h),...overrides,source,doorOpen:false,doorProgress:0,roof:1,furniture:[]};
    Object.assign(source,{x:b.x,y:b.y,w:b.w,h:b.h,v011Interior:true});
    buildings.push(b);byId.set(b.id,b);
    if(b.style==='home'){
      addFurniture(b,'kitchen',25,24,b.w*.44,47,'Кухонные шкафы','food',true);
      addFurniture(b,'fridge',b.w-92,24,62,64,'Холодильник','food');
      addFurniture(b,'wardrobe',26,b.h-99,76,68,'Шкаф с припасами','home');
      addFurniture(b,'bed',b.w-104,b.h-117,70,86,'Кровать');
      addFurniture(b,'desk',120,112,60,40,'Стол');
    }else if(b.style==='workshop'){
      addFurniture(b,'workbench',26,28,175,66,'Рабочий стол','tools',true);
      addFurniture(b,'wardrobe',b.w-92,27,62,70,'Шкаф инструментов','tools');
      addFurniture(b,'chest',27,b.h-97,70,54,'Ящик деталей','parts');
      addFurniture(b,'chest',b.w-100,b.h-88,68,52,'Запас материалов','parts');
    }else if(b.style==='shop'){
      const medical=source.zone==='pharmacy';
      addFurniture(b,'wardrobe',26,25,82,72,medical?'Шкаф с медикаментами':'Шкаф с продуктами',medical?'medicine':'food',true);
      addFurniture(b,'fridge',b.w-100,25,70,72,medical?'Медицинский холодильник':'Холодильник',medical?'medicine':'food');
      addFurniture(b,'shelf',27,b.h-99,84,62,'Полка с припасами',medical?'medicine':'food');
      addFurniture(b,'desk',b.w-129,b.h-98,98,56,'Прилавок','home');
    }else{
      addFurniture(b,'chest',26,26,85,62,'Основные запасы',source.zone==='fuel'?'fuel':'parts',true);
      addFurniture(b,'wardrobe',b.w-106,25,75,82,'Шкаф оборудования','tools');
      addFurniture(b,'chest',26,b.h-100,85,62,'Ящик материалов','parts');
      addFurniture(b,'chest',b.w-116,b.h-100,85,62,'Резервные припасы',source.zone==='fuel'?'fuel':'parts');
    }
    invalidateGeometry();return b;
  }
  // Preserve the two original interior IDs and container indices for old saves.
  const placements={house2:[1460,1180,380,330],garage10:[2090,1950,420,320],house1:[1070,1195,350,300],house3:[1060,2080,350,300],house09_4:[1450,1840,370,320],house09_5:[1370,2480,365,315],mill10:[-970,2020,380,290],woodgarage10:[-980,2640,350,250],warehouse10:[2090,1390,400,310],pharmacy10:[1040,3140,365,320],market10:[1490,3190,400,330],residence10a:[1060,3620,365,310],residence10b:[1530,3670,370,310],gasstation10:[1030,4170,400,300]};
  for(const [id,[x,y,w,h]]of Object.entries(placements))registerBuilding(scavenges.find(o=>o.id===id),{x,y,w,h,title:id==='garage10'?'Районная мастерская':id==='house1'?'Дом у дороги':id==='house09_4'?'Дом с кладовой':scavenges.find(o=>o.id===id)?.name||'Жилой дом'});
  function obsoleteFence(o){return o.id?.startsWith('fence09_')&&buildings.some(b=>o.x<b.x+b.w&&o.x+o.w>b.x&&o.y<b.y+b.h&&o.y+o.h>b.y);}
  const oldSolids=solidObjects;
  solidObjects=function(which){const out=oldSolids(which);return which==='surface'?[...out.filter(o=>!byId.has(o.id)&&!obsoleteFence(o)),...buildings.flatMap(b=>[...walls(b),...b.furniture.map(f=>({id:f.id,x:f.x,y:f.y,w:f.w,h:f.h}))])]:out;};
  invalidateGeometry();
  // A larger room replaces its former garden fence. Nearby resource identities
  // and remaining quantities stay intact while their nodes move beside the room.
  for(const o of [...V09World.ores,...worldTrees]){
    const b=buildings.find(b=>rectHit(o.x,o.y,(o.r||24)+15,b));if(!b)continue;
    const r=(o.r||24)+22,candidates=[[b.x-r-25,o.y],[b.x+b.w+r+25,o.y],[o.x,b.y-r-25],[o.x,b.y+b.h+r+85], [b.x-r-25,b.y-r-25],[b.x+b.w+r+25,b.y-r-25]];
    candidates.sort((a,c)=>Math.hypot(a[0]-o.x,a[1]-o.y)-Math.hypot(c[0]-o.x,c[1]-o.y));
    const p=candidates.find(([x,y])=>!buildings.some(v=>rectHit(x,y,r,v))&&!worldCollision(x,y,r,'surface',o.id)&&![...V09World.ores,...worldTrees].some(v=>v!==o&&Math.hypot(x-v.x,y-v.y)<r+(v.r||24)));
    if(p){o.x=p[0];o.y=p[1];invalidateGeometry();}
  }
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){
    const out=oldInteractions(which);if(which!=='surface')return out;
    const result=out.filter(o=>!byId.has(o.id));
    for(const b of buildings){result.push({...doorRect(b),kind:'interiorDoor011',ref:b,name:(b.doorOpen?'Закрыть дверь':'Открыть дверь')+' · '+b.title,range:65});
      if(!inside(b,player.x,player.y,0))result.push({id:b.id+'_enter',kind:'interiorEnter012',x:b.x+b.w/2,y:b.y+b.h+28,r:0,ref:b,name:'Войти · '+b.title,range:38});
      if(inside(b,player.x,player.y,0))for(const f of b.furniture)if(f.lootKind)result.push({id:f.id,x:f.x,y:f.y,w:f.w,h:f.h,kind:'interiorLoot011',ref:f.ref,name:f.name+(hasSearchableLoot(f.ref)?' · обыскать':' · пусто'),range:45});
    }
    return result;
  };
  const oldHitInteraction=hitInteraction;
  hitInteraction=function(x,y){
    if(scene==='surface')for(const b of buildings)if(!inside(b,player.x,player.y,0)&&inside(b,x,y,-8)){
      const d=doorRect(b);if(rectHit(x,y,7,d))break;
      return interactionObjects('surface').find(o=>o.id===b.id+'_enter');
    }
    return oldHitInteraction(x,y);
  };
  function toggleDoor(b){
    const d=doorRect(b);
    if(b.doorOpen&&[player,...zombies.filter(z=>z.alive)].some(p=>rectHit(p.x,p.y,p.radius+5,d))){message('Освободите дверной проём');return false;}
    b.doorOpen=!b.doorOpen;queueGameSave();return true;
  }
  const oldExecute=executeInteraction;
  executeInteraction=function(t,...args){
    if(t?.kind==='interiorDoor011'||t?.kind==='interiorLoot011'||t?.kind==='interiorEnter012'){
      if(menuOpen||playerDead||!canInteract(t,player.x,player.y))return;cancelNavigation();
      if(t.kind==='interiorDoor011')toggleDoor(t.ref);else if(t.kind==='interiorEnter012'){t.ref.doorOpen=true;t.ref.enterPending=true;queueGameSave();}else startSearch(t.ref);return;
    }
    return oldExecute(t,...args);
  };
  function freshLoot(f){
    const rows=f.lootKind==='food'?[['food',3,8],['water',2,5]]:f.lootKind==='medicine'?[['meds',2,5],['medicinal_herbs',3,8]]:f.lootKind==='fuel'?[['fuel',5,12],['parts',2,4]]:f.lootKind==='tools'?[['parts',3,7],['iron',3,9]]:f.lootKind==='parts'?[['iron',4,10],['copper',2,5]]:[['meds',1,3],['food',2,4]];
    return rows.map(([type,min,max])=>({type,qty:min+Math.floor(Math.random()*(max-min+1))}));
  }
  const oldOpenLoot=openLoot;
  openLoot=function(o){
    const f=containers.find(f=>f.ref===o);
    if(f&&!o.searched&&!o.zone){o.loot=freshLoot(f);o.searched=true;o.searchedAt=Date.now();}
    const result=oldOpenLoot(o);if(f)I18n.assign(el('lootTitle'),"textContent",f.name);return result;
  };
  function tick(dt=16.667*frameScale){
    const step=Math.max(0,Math.min(dt,100))/330;
    for(const b of buildings){
      if(window.V018Build?.isBroken(b.id+'_door')){b.doorOpen=true;b.doorProgress=1;}
      const was=b.doorProgress>=.88;b.doorProgress=clamp(b.doorProgress+(b.doorOpen?step:-step),0,1);if(was!==(b.doorProgress>=.88))invalidateGeometry();
      if(b.enterPending){if(scene!=='surface'||menuOpen||playerDead||movePower>JOY_DEAD)b.enterPending=false;else if(b.doorProgress>=.88){b.enterPending=false;approachPoint(b.x+b.w/2,b.y+b.h-66);}}
      const nearDoor=b.doorOpen&&Math.hypot(player.x-(b.x+b.w/2),player.y-(b.y+b.h))<85;
      const target=scene==='surface'&&(inside(b,player.x,player.y,0)||nearDoor)?0:1;
      b.roof+=Math.sign(target-b.roof)*Math.min(Math.abs(target-b.roof),step*.75);
    }
  }
  const oldUpdate=update;update=function(...args){const r=oldUpdate(...args);if(!document.hidden)tick();return r;};

  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function drawFurniture(f){
    ctx.save();ctx.shadowColor='#0008';ctx.shadowBlur=8;ctx.shadowOffsetX=3;ctx.shadowOffsetY=5;
    const drawn=window.V011Art?.draw?.(f.key,f.x,f.y,f.w,f.h);
    if(!drawn){const color=f.key==='fridge'?'#adbab6':f.key==='kitchen'?'#889a94':f.key==='bed'?'#82999a':'#506762';rect(f.x,f.y,f.w,f.h,color);ctx.shadowColor='transparent';ctx.strokeStyle='#bed0bf80';ctx.lineWidth=2;ctx.strokeRect(f.x+3,f.y+3,f.w-6,f.h-6);if(f.key==='kitchen')for(let i=1;i<4;i++)line(f.x+f.w*i/4,f.y+3,f.x+f.w*i/4,f.y+f.h-3,'#314741',2);}
    ctx.restore();
    if(f.lootKind&&Math.hypot(player.x-f.x-f.w/2,player.y-f.y-f.h/2)<100){ctx.save();ctx.strokeStyle=hasSearchableLoot(f.ref)?'#d3b98088':'#82988c55';ctx.lineWidth=1.4;ctx.strokeRect(f.x-3,f.y-3,f.w+6,f.h+6);ctx.restore();}
  }
  function drawInterior(b){
    if(!visibleOnScreen(b.x+b.w/2,b.y+b.h/2,Math.max(b.w,b.h)))return;
    ctx.save();rect(b.x+9,b.y+12,b.w+5,b.h+7,'#0e171864');
    const warm=b.style==='home';rect(b.x,b.y,b.w,b.h,warm?'#746f60':'#485a5b');
    ctx.save();ctx.beginPath();ctx.rect(b.x+10,b.y+10,b.w-20,b.h-20);ctx.clip();
    for(let y=b.y+12;y<b.y+b.h;y+=warm?22:44){line(b.x+12,y,b.x+b.w-12,y,warm?'#464e4352':'#1d34384d',1);for(let x=b.x+12+((y%2)*12);x<b.x+b.w;x+=warm?68:44)line(x,y,x,y+(warm?22:44),warm?'#464e433d':'#1d34384d',1);}
    ctx.restore();
    for(const f of b.furniture)drawFurniture(f);
    for(const w of walls(b)){if(w.id===b.id+'_door')continue;rect(w.x+3,w.y+4,w.w,w.h,'#14262944');rect(w.x,w.y,w.w,w.h,'#748b87');rect(w.x,w.y,w.w,3,'#b8c9ba');}
    const d=doorRect(b);rect(d.x-9,d.y+12,d.w+18,30,'#667770');line(d.x-8,d.y+40,d.x+d.w+8,d.y+40,'#a1bbb1',2);rect(d.x,d.y,d.w,d.h,'#516360');if(!window.V018Build?.isBroken(d.id)){ctx.save();ctx.translate(d.x,d.y+d.h/2);ctx.rotate(-b.doorProgress*Math.PI/2);rect(0,-4,d.w,8,'#607e79');rect(2,-4,d.w-4,2,'#bbd8c0');rect(d.w-12,-1,5,3,'#d3b47e');ctx.restore();}
    ctx.font='10px Arial';ctx.textAlign='center';ctx.fillStyle='#d1dfce';ctx.fillText(I18n.text(b.doorOpen?'ВХОД ОТКРЫТ':'ВХОД'),b.x+b.w/2,b.y+b.h+22);
    ctx.restore();
  }
  const oldSurface=drawSurface;drawSurface=function(...args){const r=oldSurface(...args);for(const b of buildings)drawInterior(b);return r;};
  function drawRoofs(){
    if(scene!=='surface')return;
    for(const b of buildings){if(b.roof<.005||!visibleOnScreen(b.x+b.w/2,b.y+b.h/2,Math.max(b.w,b.h)))continue;
      ctx.save();ctx.globalAlpha*=b.roof;const gradient=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);gradient.addColorStop(0,b.style==='home'?'#70817e':'#69838b');gradient.addColorStop(.5,b.style==='home'?'#536b68':'#4b656f');gradient.addColorStop(1,'#354c50');rect(b.x-4,b.y-5,b.w+8,b.h-23,gradient);line(b.x,b.y+b.h/2,b.x+b.w,b.y+b.h/2,'#9dafaa',5);for(let x=b.x+14;x<b.x+b.w;x+=27)line(x,b.y,x,b.y+b.h-29,'#becac222',2);ctx.strokeStyle='#a0b6ae';ctx.lineWidth=2;ctx.strokeRect(b.x-4,b.y-5,b.w+8,b.h-23);rect(b.x+b.w-73,b.y+28,44,58,'#284d5b');line(b.x+b.w-51,b.y+29,b.x+b.w-51,b.y+85,'#9cc2be80',2);line(b.x+b.w-73,b.y+57,b.x+b.w-29,b.y+57,'#9cc2be80',2);ctx.restore();
      ctx.save();ctx.font='11px Arial';ctx.textAlign='center';ctx.fillStyle='#cbdcd0';ctx.fillText(I18n.text(b.title),b.x+b.w/2,b.y-18);ctx.restore();
    }
  }

  const oldHit=hitZombie;
  hitZombie=function(z,...args){const was=z.alive,r=oldHit(z,...args);if(was&&!z.alive)z.corpseAt011=Date.now();return r;};
  function corpseAlpha(z,now=Date.now()){if(z.alive)return 1;const at=z.corpseAt011??(now-90000),age=Math.max(0,now-at);return clamp((90000-age)/15000,0,1);}
  const oldZombieDraw=drawZombie;
  drawZombie=function(z){if(z.alive)return oldZombieDraw(z);const alpha=corpseAlpha(z);if(alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;try{return oldZombieDraw(z);}finally{ctx.restore();}};

  const extraContainers=()=>containers.filter(f=>!buildings.some(b=>b.source===f.ref));
  function capture(){return {schema:2,filters:{...filters},doors:buildings.map(b=>({id:b.id,open:b.doorOpen})),containers:extraContainers().map(f=>({id:f.id,searched:!!f.ref.searched,loot:clone(f.ref.loot||[]),searchedAt:f.ref.searchedAt??null})),corpses:zombies.map((z,i)=>!z.alive?{i,at:z.corpseAt011??Date.now()-90000}:null).filter(Boolean)};}
  function validate(d){
    if(!d||![1,2].includes(d.schema)||!d.filters||Object.keys(defaults).some(k=>typeof d.filters[k]!=='boolean'))throw Error('Некорректные слои карты');
    if(!Array.isArray(d.doors)||d.doors.length>buildings.length||new Set(d.doors.map(v=>v?.id)).size!==d.doors.length||d.doors.some(v=>!v||!byId.has(v.id)||typeof v.open!=='boolean'))throw Error('Некорректные двери зданий');
    const expected=new Set(extraContainers().map(f=>f.id));
    if(!Array.isArray(d.containers)||d.containers.length>expected.size||new Set(d.containers.map(v=>v?.id)).size!==d.containers.length||d.containers.some(v=>!v||!expected.has(v.id)||typeof v.searched!=='boolean'||!Array.isArray(v.loot)||v.loot.length>12||!v.searched&&v.loot.length||v.loot.some(s=>!s||!Object.hasOwn(ITEM,s.type)||!Number.isInteger(s.qty)||s.qty<1||s.qty>STACK_MAX||window.V010Combat&&V010Combat.validateItem(s)===false)||v.searchedAt!==null&&(!Number.isFinite(v.searchedAt)||v.searchedAt<0||v.searchedAt>Number.MAX_SAFE_INTEGER)))throw Error('Некорректный лут комнат');
    if(!Array.isArray(d.corpses)||d.corpses.length>144||new Set(d.corpses.map(c=>c.i)).size!==d.corpses.length||d.corpses.some(c=>!Number.isInteger(c.i)||c.i<0||c.i>=144||!Number.isFinite(c.at)||c.at<0||c.at>Number.MAX_SAFE_INTEGER))throw Error('Некорректное время тел');return true;
  }
  
  GameSave.extend('capture','world.interiors',function(oldCapture){const d=oldCapture();d.world011=capture();return d;});
  GameSave.extend('decode','world.interiors',function(oldDecode,raw){const d=oldDecode(raw);if(d.world011!==undefined)validate(d.world011);return d;});
  GameSave.extend('restore','world.interiors',function(oldRestore,data){
    const d=data.world011;if(d)validate(d);Object.assign(filters,d?.filters||defaults);
    const doors=new Map((d?.doors||[]).map(v=>[v.id,v]));buildings.forEach(b=>{b.doorOpen=doors.get(b.id)?.open??false;b.doorProgress=b.doorOpen?1:0;b.roof=1;b.enterPending=false;});invalidateGeometry();
    // Enlarged footprints must not trap a character saved beside an older, smaller facade.
    let source=data;const p=data.player;
    if(p.scene==='surface'&&!data.v091?.fortress?.wallLevel)for(const b of buildings)if(inside(b,p.x,p.y,-15)&&[...walls(b),...b.furniture].some(o=>rectHit(p.x,p.y,player.radius,o))){
      const position={x:b.x+b.w/2,y:b.y+b.h+40};source={...data,player:{...p,...position},v091:{...data.v091,fortress:{...data.v091.fortress,...position,wallLevel:false}}};break;
    }
    oldRestore(source);
    const savedContainers=new Map((d?.containers||[]).map(v=>[v.id,v]));extraContainers().forEach(f=>Object.assign(f.ref,savedContainers.has(f.id)?clone(savedContainers.get(f.id)):{searched:false,loot:[],searchedAt:null}));
    const times=new Map((d?.corpses||[]).map(c=>[c.i,c.at]));zombies.forEach((z,i)=>{z.corpseAt011=z.alive?null:times.get(i)??Date.now()-90000;});
    for(const b of buildings)if(scene==='surface'&&inside(b,player.x,player.y,0))b.roof=0;
    updateLegend();invalidateGeometry();
  });
  return {filters,setFilter,mapEnabled,buildings,containers,inside,doorRect,walls,toggleDoor,tick,drawRoofs,corpseAlpha,capture,validate,registerBuilding,obsoleteFence};
})();

