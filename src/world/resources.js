/* 0.9: an expanded, navigable world; finite ore deposits and a manual well. */
(() => {
  'use strict';
  Object.assign(surface, {width:2400,height:3000,minX:-400,maxX:2000});

  // Preserve existing loot identities and contents while moving the neighbourhood east.
  const placements={
    car1:[1080,1510,130,64],car2:[1580,1680,64,130],car3:[1075,2440,130,64],
    house1:[1090,1280,250,210],house2:[1450,1280,270,220],house3:[1100,2120,280,220]
  };
  for(const o of scavenges)if(placements[o.id]){
    const [x,y,w,h]=placements[o.id];Object.assign(o,{x,y,w,h});
  }
  const extraLoot=[
    ['house09_4','house',1450,1820,260,220],
    ['house09_5','house',1430,2460,280,215],
    ['car09_4','car',1075,1840,130,64],
    ['car09_5','car',1460,2240,130,64],
    ['car09_6','car',1770,2520,64,130]
  ];
  for(const [id,kind,x,y,w,h] of extraLoot)scavenges.push({id,kind,x,y,w,h,searched:false});

  const movedTrees={tree2:[-200,1270],tree3:[490,1290],tree4:[1510,1140],
    tree5:[-200,1840],tree6:[480,2120],tree7:[1610,2140],
    tree8:[1140,2740],tree9:[-190,2700],tree10:[1650,2910]};
  for(const t of worldTrees)if(movedTrees[t.id]){[t.x,t.y]=movedTrees[t.id];}
  const treePoints=[[-305,1480],[-140,1490],[65,1245],[305,1300],[520,1510],
    [-290,2080],[-115,2190],[85,2260],[295,2220],[520,2350],
    [-300,2660],[-65,2850],[185,2880],[470,2770],[505,2525],
    [-185,390],[-205,675],[-180,975],[10,1070],[1510,760],[1660,1010],
    [1780,1120],[1850,1610],[1840,1840],[1790,2340],[1280,2740],
    [1510,2790],[1790,2900],[-315,2340],[-25,2570],[310,2410],
    [470,1840],[510,1680],[160,1470]];
  treePoints.forEach(([x,y],i)=>worldTrees.push({id:'tree09_'+i,x,y,r:24,felled:false,wood:15,regrowMs:0}));

  const ores=[
    {id:'ore09_iron1',type:'iron_ore',x:10,y:1390,r:39,capacity:45},
    {id:'ore09_iron2',type:'iron_ore',x:-225,y:2460,r:48,capacity:75},
    {id:'ore09_iron3',type:'iron_ore',x:315,y:2700,r:43,capacity:75},
    {id:'ore09_copper1',type:'copper_ore',x:1810,y:1370,r:39,capacity:45},
    {id:'ore09_copper2',type:'copper_ore',x:1840,y:2110,r:46,capacity:75},
    {id:'ore09_copper3',type:'copper_ore',x:1810,y:2760,r:46,capacity:75}
  ].map(o=>({...o,remaining:o.capacity,regrowMs:0}));
  const well={id:'well09',kind:'well09',name:'Колодец — набрать воду',x:320,y:925,r:40,range:48};
  // One polygon drives both the shoreline and water collision.
  const lake=[[-25,1635],[55,1585],[150,1570],[245,1590],[325,1620],[382,1680],
    [395,1775],[365,1860],[320,1915],[315,1990],[250,2060],[150,2075],
    [80,2045],[35,1985],[15,1900],[-35,1840],[-65,1750],[-55,1685]];
  const benches=[{id:'bench09_1',x:435,y:1890,w:72,h:20},
    {id:'bench09_2',x:90,y:2165,w:72,h:20},
    {id:'bench09_3',x:-140,y:1580,w:20,h:72}];
  const fences=[
    {id:'fence09_1',x:1060,y:1240,w:300,h:7},{id:'fence09_2',x:1060,y:1240,w:7,h:215},
    {id:'fence09_3',x:1420,y:1240,w:320,h:7},{id:'fence09_4',x:1733,y:1240,w:7,h:250},
    {id:'fence09_5',x:1420,y:1780,w:320,h:7},{id:'fence09_6',x:1733,y:1780,w:7,h:260},
    {id:'fence09_7',x:1060,y:2080,w:340,h:7},{id:'fence09_8',x:1060,y:2080,w:7,h:235},
    {id:'fence09_9',x:1400,y:2420,w:340,h:7}
  ];
  const staticSolids=[well,...benches,...fences];
  const oldSolids=solidObjects;
  solidObjects=function(which){
    const out=oldSolids(which);
    return which==='surface'?[...out,...staticSolids,...ores]:out;
  };
  function lakeContains(x,y,r=0){
    if(x<-65-r||x>395+r||y<1570-r||y>2075+r)return false;
    let inside=false;
    for(let i=0,j=lake.length-1;i<lake.length;j=i++){
      const [ax,ay]=lake[j],[bx,by]=lake[i];
      if(((ay>y)!==(by>y))&&(x<(bx-ax)*(y-ay)/(by-ay)+ax))inside=!inside;
      const dx=bx-ax,dy=by-ay;
      const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
      if(Math.hypot(x-ax-t*dx,y-ay-t*dy)<=r)return true;
    }
    return inside;
  }
  const oldCollision=worldCollision;
  worldCollision=function(x,y,r=15,which=scene,ignoreId=null){
    return (which==='surface'&&lakeContains(x,y,r))||oldCollision(x,y,r,which,ignoreId);
  };
  invalidateGeometry();

  // Encounters stay beyond the first, quiet exit from the fortress.
  const newSpawns=[{x:550,y:2240},{x:1230,y:1955},{x:1790,y:2250},
    {x:-150,y:2340},{x:990,y:2750},{x:475,y:2630}];
  outsideSpawns.splice(0,outsideSpawns.length,...newSpawns);
  resetZombies();

  let mining=null;
  const previousInteractions=interactionObjects;
  interactionObjects=function(which=scene){
    const out=previousInteractions(which);
    if(which==='surface')out.push(well,...ores.map(o=>({...o,kind:'ore09',
      name:(o.type==='stone'?'Камень':o.type==='iron_ore'?'Железная руда':'Медная руда')+(o.remaining?` · ${o.remaining}`:' · восстанавливается'),
      range:47,ref:o})));
    return out;
  };
  function stopMining(){if(mining){mining=null;el('searchBarWrap').style.display='none';}}
  function beginMining(o){
    if(!o.remaining){message(`Месторождение восстанавливается: ${Math.ceil(o.regrowMs/60000)} мин.`);return;}
    if(heldItem()!=='pickaxe'||bagCount('pickaxe')<1){message('⛏ Выберите кирку в быстром слоте');return;}
    if(freeItemSpace(bag,o.type,BAG_SLOTS)<1){message('🎒 Освободите место для руды');return;}
    cancelSearch();cancelChop();mining={id:o.id,elapsed:0,duration:1800,at:Date.now()};
    const dx=o.x-player.x,dy=o.y-player.y,n=Math.hypot(dx,dy)||1;
    player.aimX=dx/n;player.aimY=dy/n;
  }
  let wellOverlay;
  function renderWell(){
    if(!wellOverlay)wellOverlay=v09Overlay('v09Well','Колодец');
    const body=wellOverlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",'');
    const p=document.createElement('p');p.className='v09Muted';
    I18n.assign(p,"textContent",`Ручной колодец работает без электричества. В рюкзаке: ${bagCount('water')} воды.`);
    body.appendChild(p);
    const art=document.createElement('div');art.className='v09WellArt';
    I18n.assign(art,"innerHTML",'<span>💧</span><b>Вода для фермы</b><small>Наберите воду и пополните запас животных в бункере.</small>');
    body.appendChild(art);
    for(const qty of [10,25,50]){
      const b=v09Button(`Набрать ${qty} воды`,()=>{
        const target=interactionObjects('surface').find(o=>o.id===well.id);
        if(scene!=='surface'||!canInteract(target,player.x,player.y)){closeOverlay(wellOverlay);return;}
        const amount=Math.min(qty,freeItemSpace(bag,'water',BAG_SLOTS));
        if(!amount){message('🎒 Освободите место для воды');return;}
        const received=amount-addItem('water',amount);
        message(`💧 Вода: +${received}`);queueGameSave();renderWell();
      });
      b.disabled=freeItemSpace(bag,'water',BAG_SLOTS)<1;body.appendChild(b);
    }
    if(freeItemSpace(bag,'water',BAG_SLOTS)<1){const p=document.createElement('p');I18n.assign(p,"textContent",'Рюкзак заполнен — освободите место.');body.appendChild(p);}
  }
  const oldExecute=executeInteraction;
  executeInteraction=function(target){
    if(!target||!['ore09','well09'].includes(target.kind))return oldExecute(target);
    if(menuOpen||playerDead||!canInteract(target,player.x,player.y))return;
    GameMovement.begin('INTERACT',target);
    if(target.kind==='ore09')beginMining(target.ref);
    else {stopMining();renderWell();openOverlay(wellOverlay);}
  };
  const oldCancel=cancelChop;
  cancelChop=function(){stopMining();return oldCancel();};
  const oldUpdate=update;
  update=function(){
    oldUpdate();
    if(!GameFlow.paused){
      const dt=16.667*frameScale;
      for(const o of ores)if(!o.remaining){
        o.regrowMs=Math.max(0,o.regrowMs-dt);
        if(!o.regrowMs){o.remaining=o.capacity;queueGameSave();}
      }
    }
    tickMining();
  };
  function tickMining(){
    if(!mining)return;
    const o=ores.find(v=>v.id===mining.id),target=interactionObjects('surface').find(v=>v.id===mining.id);
    if(scene!=='surface'||playerDead||movePower>JOY_DEAD||bagCount('pickaxe')<1||!o||!canInteract(target,player.x,player.y)){stopMining();return;}
    const now=Date.now(),elapsed=Math.max(0,now-mining.at);mining.at=now;
    mining.elapsed+=elapsed*(typeof V010World!=='undefined'?V010World.settings.miningRate:1)*(V09Craft.craftQueue.upgrades.tools?1.2:1);
    // This loop is bounded by deposit capacity and backpack space, including offline catch-up.
    while(mining&&mining.elapsed>=mining.duration){
      mining.elapsed-=mining.duration;
      const amount=Math.min(10,o.remaining,freeItemSpace(bag,o.type,BAG_SLOTS));
      const received=amount-addItem(o.type,amount);o.remaining-=received;
      if(!o.remaining)o.regrowMs=600000;
      if(received>0&&typeof V010!=='undefined')V010.emit('mined',{type:o.type,qty:received});
      if(!received||!o.remaining||freeItemSpace(bag,o.type,BAG_SLOTS)<1){stopMining();message(!o.remaining?'Месторождение исчерпано · восстановление через 10 минут игры':'🎒 Рюкзак заполнен');}
      if(!document.hidden)createNoise(o.x,o.y,230);queueGameSave();
    }
    const bar=el('searchBarWrap');
    if(mining){bar.style.display=menuOpen?'none':'block';positionWorkProgress(bar,62);el('searchBarFill').style.width=(100*mining.elapsed/mining.duration)+'%';}
  }
  const oldAction=updateAction;
  updateAction=function(){oldAction();if(currentAction==='ore09')I18n.assign(actionButton,"textContent",'⛏');if(currentAction==='well09')I18n.assign(actionButton,"textContent",'💧');};

  // Every static landmark is code-native canvas artwork, drawn in world coordinates.
  function polygon(points,fill,stroke,width=1){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function line(points,color,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function label(text,x,y,color='#bac8b6',size=11){ctx.fillStyle=color;ctx.font=`600 ${size}px Arial`;ctx.textAlign='center';ctx.fillText(I18n.text(text),x,y);}
  function ellipse(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function sign(x,y,title,subtitle){
    ctx.fillStyle='#535749';ctx.fillRect(x-34,y+9,7,30);ctx.fillRect(x+27,y+9,7,30);
    ctx.fillStyle='#293e35';ctx.fillRect(x-72,y-16,144,40);ctx.strokeStyle='#7b8b6b';ctx.lineWidth=2;ctx.strokeRect(x-72,y-16,144,40);
    label(title,x,y,'#dbdbc0',11);label(subtitle,x,y+15,'#9fae94',9);
  }
  function drawTerrain(){
    ctx.fillStyle='#343f34';ctx.fillRect(-400,0,2400,3000);
    // Richer woodland surrounds the park, with quiet texture rather than a flat grid.
    const left=ctx.createLinearGradient(-400,0,650,0);left.addColorStop(0,'#253b2d');left.addColorStop(.65,'#3c5038');left.addColorStop(1,'#4a5140');
    ctx.fillStyle=left;ctx.fillRect(-400,1090,1060,1910);
    const right=ctx.createLinearGradient(970,0,2000,0);right.addColorStop(0,'#434a41');right.addColorStop(1,'#343b34');
    ctx.fillStyle=right;ctx.fillRect(950,1090,1050,1910);
    // Deterministic, culled grass tufts have no simulation or save cost.
    const terrainStep=(window.V010Camera?.zoom??1)<.4?210:70;
    const loX=Math.max(-400,Math.floor((camera.x-70)/terrainStep)*terrainStep),hiX=Math.min(2000,camera.x+viewWidth()+70);
    const loY=Math.max(0,Math.floor((camera.y-70)/terrainStep)*terrainStep),hiY=Math.min(3000,camera.y+viewHeight()+70);
    for(let x=loX;x<hiX;x+=terrainStep)for(let y=loY;y<hiY;y+=terrainStep){
      const seed=Math.abs(Math.sin(x*12.32+y*5.14)),px=x+seed*49,py=y+Math.abs(Math.sin(x+y))*44;
      if(inFortress(px,py))continue;
      ellipse(px,py,12+seed*9,5,'rgba(10,23,16,.08)');
      line([[px-4,py+2],[px-6,py-4]],'rgba(153,166,114,.17)',1);
      line([[px,py+2],[px+1,py-6]],'rgba(153,166,114,.17)',1);
    }
if(!window.V013City){
    // Broad north-south road, sidewalks and two eastward residential streets.
    ctx.fillStyle='#686d64';ctx.fillRect(630,1070,28,1930);ctx.fillRect(942,1070,28,1930);
    ctx.fillStyle='#41494a';ctx.fillRect(658,1070,284,1930);
    ctx.fillStyle='#363e3f';ctx.fillRect(676,1070,8,1930);ctx.fillRect(916,1070,8,1930);
    for(const y of [1600,2350]){
      ctx.fillStyle='#72736b';ctx.fillRect(950,y-16,990,148);
      ctx.fillStyle='#464c4c';ctx.fillRect(950,y,990,116);
      line([[960,y+58],[1930,y+58]],'rgba(211,199,158,.32)',2);
    }
    ctx.setLineDash([24,28]);line([[800,1120],[800,2980]],'rgba(224,208,157,.48)',3);ctx.setLineDash([]);
    for(let y=1150;y<3000;y+=75){line([[633,y],[654,y]],'#565d56',1);line([[946,y],[967,y]],'#565d56',1);}
    for(const y of [1550,2300])for(let x=690;x<920;x+=35){ctx.fillStyle='rgba(214,215,194,.33)';ctx.fillRect(x,y,20,36);}
    for(const [x,y] of [[780,1470],[835,2200],[740,2770]]){line([[x-13,y-28],[x-2,y],[x+10,y+7],[x+5,y+26]],'rgba(18,25,26,.45)',2);}
}
    // Gravel footpaths fork toward the near iron seam, circle the lake, then rejoin.
    const trails=[[[645,1235],[380,1235],[155,1320],[10,1390]],
      [[635,1530],[440,1530],[390,1450],[150,1450],[-135,1520],[-155,1790],[-120,2070],[30,2195],[265,2220],[445,2105],[490,1840],[470,1610],[440,1530]],
      [[290,2220],[200,2410],[70,2485],[-225,2460]],[[200,2410],[340,2525],[315,2700]],
      [[440,2105],[580,2180],[635,2180]],[[1735,1535],[1830,1515],[1810,1370]],
      [[1730,2170],[1840,2170],[1840,2110]],[[1730,2690],[1810,2760]]];
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const p of trails){line(p,'#58604b',40);line(p,'#767763',27);line(p,'rgba(167,158,124,.14)',21);}
    ctx.lineCap='butt';ctx.lineJoin='miter';
    // Shore and water use exactly the same perimeter as movement collision.
    polygon(lake,'#4c6862','#a39470',24);
    polygon(lake,'#315c60','#608077',7);
    ctx.save();polygon(lake);ctx.clip();
    const water=ctx.createLinearGradient(0,1570,300,2075);water.addColorStop(0,'#46716d');water.addColorStop(.5,'#294d57');water.addColorStop(1,'#3f6864');
    ctx.fillStyle=water;ctx.fillRect(-80,1550,510,560);
    for(let y=1610;y<2060;y+=32)for(let x=-45;x<385;x+=66){
      const shift=Math.sin(y*.022+performance.now()*.00045)*6;
      line([[x+shift,y],[x+17+shift,y-2],[x+33+shift,y]],'rgba(166,205,190,.14)',1.5);
    }
    ctx.restore();
    for(const [x,y] of [[30,1600],[333,1650],[341,1930],[94,2050],[-46,1805]]){
      line([[x,y+7],[x-3,y-12]],'#819260',3);line([[x+6,y+10],[x+8,y-8]],'#7d9259',2);ellipse(x-3,y-12,2,6,'#8b784e');
    }
    sign(380,1170,'ПАРК «БЕРЕГОВОЙ»','ЖЕЛЕЗНАЯ РУДА  ←');
    sign(1240,1170,'ЖИЛОЙ КВАРТАЛ','МЕДНАЯ РУДА  →');
    label('БЕРЕГОВОЕ ОЗЕРО',170,1810,'rgba(211,232,222,.54)',12);
    // Decorative small shrubs stay off roads and interactable objects.
    for(const [x,y] of [[-260,1390],[370,1360],[540,1950],[-80,2320],[395,2830],
      [1350,1700],[1760,1950],[1230,2590],[1910,2820],[1510,2340]]){
      ellipse(x+4,y+6,25,15,'rgba(0,0,0,.18)');ellipse(x-10,y,17,15,'#385440');ellipse(x+10,y-3,17,17,'#476548');ellipse(x,y-10,14,11,'#54714c');
    }
  }
  function drawBench(b){
    ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(b.x+4,b.y+6,b.w,b.h);
    ctx.save();ctx.translate(b.x,b.y);if(b.h>b.w){ctx.translate(b.w,0);ctx.rotate(Math.PI/2);}
    for(const x of [10,56]){ctx.fillStyle='#303b38';ctx.fillRect(x,-5,6,32);}
    for(let y=0;y<20;y+=7){ctx.fillStyle=y===0?'#a28e68':'#827454';ctx.fillRect(0,y,72,5);}
    ctx.restore();
  }
  function drawHouse(o,index){
    if(o.v011Interior)return;
    if(!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,220))return;
    const x=o.x,y=o.y,w=o.w,h=o.h;
    ctx.fillStyle='#67695e';ctx.fillRect(x-16,y-15,w+32,h+45);
    ctx.fillStyle='#8b8672';ctx.fillRect(x+w/2-26,y+h+24,52,42);
    ctx.fillStyle='rgba(10,17,17,.3)';ctx.fillRect(x+13,y+14,w+8,h+12);
    ctx.fillStyle='#958e79';ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#625a4e';ctx.fillRect(x+4,y+h-31,w-8,27);
    const roofA=index%2?'#6e6860':'#667478',roofB=index%2?'#59544e':'#525f64';
    polygon([[x-6,y-5],[x+w+6,y-5],[x+w+6,y+h/2-4],[x-6,y+h/2-4]],roofA,'#353e3e',2);
    polygon([[x-6,y+h/2-4],[x+w+6,y+h/2-4],[x+w+6,y+h-34],[x-6,y+h-34]],roofB,'#333b3c',2);
    line([[x-5,y+h/2-4],[x+w+5,y+h/2-4]],'#92958a',5);
    for(let k=14;k<w;k+=25)line([[x+k,y],[x+k,y+h-35]],'rgba(24,31,31,.19)',1);
    ctx.fillStyle='#443e35';ctx.fillRect(x+w/2-20,y+h-32,40,32);
    ctx.fillStyle='#9d8e66';ctx.fillRect(x+w/2-2,y+h-15,3,3);
    for(const wx of [x+24,x+w-66]){
      ctx.fillStyle='#b2ab91';ctx.fillRect(wx-3,y+h-29,45,23);ctx.fillStyle='#263e43';ctx.fillRect(wx,y+h-27,39,18);
      line([[wx+19,y+h-27],[wx+19,y+h-9]],'#798882',2);
    }
    ctx.fillStyle='#8e7760';ctx.fillRect(x+w-52,y+23,23,34);ctx.fillStyle='#514e43';ctx.fillRect(x+w-48,y+24,15,12);
    const name=hasSearchableLoot(o)?'ОБЫСКАТЬ ДОМ':'ОБЫСКАНО';
    ctx.fillStyle='rgba(19,30,30,.78)';ctx.fillRect(x+w/2-68,y+h+5,136,21);
    label(name,x+w/2,y+h+20,hasSearchableLoot(o)?'#e1d7af':'#a4b1a3',10);
    // Small street number makes houses individual landmarks.
    label(String(12+index*2),x+15,y+h-11,'#d4cdb4',9);
  }
  function drawOre(o){
    if(o.type==='stone'&&window.V018Build)return V018Build.drawStone(o);
    if(!visibleOnScreen(o.x,o.y,90))return;
    ctx.save();ctx.translate(o.x,o.y);
    if(mining?.id===o.id)window.V012Effects?.oreImpactTransform(mining);
    ellipse(4,12,o.r+7,o.r*.7,'rgba(10,17,16,.25)');
    const copper=o.type==='copper_ore';
    polygon([[-o.r+2,7],[-o.r*.8,-o.r*.52],[-14,-o.r],[18,-o.r*.85],[o.r,-12],[o.r-2,22],[7,o.r*.65],[-23,o.r*.6]],
      o.remaining?'#69706c':'#484f4b','#363e3b',3);
    polygon([[-o.r*.8,-o.r*.52],[-14,-o.r],[8,-7],[-8,15],[-o.r+2,7]],o.remaining?'#848a80':'#535b53');
    polygon([[8,-7],[18,-o.r*.85],[o.r,-12],[o.r-2,22]],'#535d59');
    if(o.remaining){
      const color=copper?'#c88450':'#b5bdc0';
      for(const [x,y,k] of [[-21,-10,1],[4,-21,.8],[17,9,1.1],[-9,14,.65]]){
        polygon([[x-6*k,y],[x,y-8*k],[x+9*k,y-3*k],[x+6*k,y+6*k],[x-5*k,y+5*k]],color,copper?'#e1aa69':'#dce0cf',1);
      }
    }
    label(copper?'МЕДНАЯ РУДА':'ЖЕЛЕЗНАЯ РУДА',0,-o.r-15,copper?'#e3b180':'#c4d2cd',10);
    if(!o.remaining)label(`${Math.ceil(o.regrowMs/60000)} мин. до восстановления`,0,o.r+20,'#b3bdac',9);
    else if(distance(player.x,player.y,o.x,o.y)<160)label(`⛏ ${o.remaining} / ${o.capacity}`,0,o.r+19,'#d3d6b9',10);
    if(mining?.id===o.id)window.V012Effects?.drawOreImpact(o,mining);
    ctx.restore();
  }
  function drawWell(){if(window.V015Base)return;
    const x=well.x,y=well.y;ctx.save();ctx.translate(x,y);
    ellipse(5,15,54,35,'rgba(7,17,15,.28)');
    ellipse(0,0,43,34,'#999b87');ellipse(0,0,33,25,'#3b4742');ellipse(0,1,26,19,'#28474b');
    ctx.strokeStyle='#616e62';ctx.lineWidth=2;
    for(let i=0;i<10;i++){const a=i*Math.PI/5;line([[Math.cos(a)*33,Math.sin(a)*25],[Math.cos(a)*43,Math.sin(a)*34]],'#687163',2);}
    ctx.fillStyle='#795b39';ctx.fillRect(-38,-29,9,55);ctx.fillRect(29,-29,9,55);
    line([[-34,-21],[34,-21]],'#b49b70',7);line([[8,-20],[8,6]],'#baae89',2);
    ctx.fillStyle='#838d84';ctx.fillRect(2,-1,15,16);ctx.strokeStyle='#c2c4ac';ctx.strokeRect(2,-1,15,16);
    polygon([[-55,-36],[0,-62],[55,-36],[48,-19],[0,-41],[-48,-19]],'#7e684d','#443f32',2);
    for(let x=-36;x<=36;x+=12)line([[x,-36-Math.abs(x)*-.22],[x,-23-Math.abs(x)*-.08]],'#a38a62',1);
    label('КОЛОДЕЦ',0,57,'#d9d3ae',10);ctx.restore();
  }
  const oldDrawSurface=drawSurface;
  drawSurface=function(){
    ctx.save();drawTerrain();
    // Keep the established fortress artwork at precisely the same coordinates.
    ctx.save();ctx.beginPath();ctx.rect(160,110,1280,982);ctx.clip();oldDrawSurface();ctx.restore();
    let index=0;for(const o of scavenges)if(o.kind==='house')drawHouse(o,index++);
    for(const f of fences){if(window.V011World?.obsoleteFence(f))continue;ctx.fillStyle='#596354';ctx.fillRect(f.x,f.y,f.w,f.h);ctx.fillStyle='#939681';
      if(f.w>f.h)for(let x=f.x;x<f.x+f.w;x+=28)ctx.fillRect(x,f.y-3,5,13);
      else for(let y=f.y;y<f.y+f.h;y+=28)ctx.fillRect(f.x-3,y,13,5);}
    for(const b of benches)drawBench(b);
    ctx.save();ctx.beginPath();ctx.rect(-400,0,2400,3000);ctx.rect(160,110,1280,982);ctx.clip('evenodd');
    drawParkedCars();drawWorldTrees('legacy');ctx.restore();
    for(const o of ores)drawOre(o);drawWell();ctx.restore();
  };

  function validate(data){
    if(!data||!Array.isArray(data.ores)||data.ores.length!==ores.length)throw new Error('Invalid ore save');
    for(let i=0;i<ores.length;i++){
      const a=data.ores[i],o=ores[i];
      if(!a||a.id!==o.id||!Number.isInteger(a.remaining)||a.remaining<0||a.remaining>o.capacity||
        !Number.isFinite(a.regrowMs)||a.regrowMs<0||a.regrowMs>600000||
        (a.remaining>0&&a.regrowMs!==0))throw new Error('Invalid ore state');
    }
    return true;
  }
  window.V09World={
    ores,well,lake,drawOre,tickMining,stopMining,
    miningState:()=>mining?{...mining}:null,
    resumeMining:data=>{mining=data?{...data}:null;},
    capture:()=>({ores:ores.map(o=>({id:o.id,remaining:o.remaining,regrowMs:o.regrowMs}))}),
    validate,
    restore(data){
      stopMining();if(data)validate(data);
      ores.forEach((o,i)=>Object.assign(o,data?data.ores[i]:{remaining:o.capacity,regrowMs:0}));
      invalidateGeometry();
    }
  };
  v09Style('.v09WellArt{display:flex;flex-direction:column;align-items:center;gap:9px;padding:22px;margin:12px 0 18px;border:1px solid #4e6864;border-radius:12px;background:linear-gradient(145deg,#263f40,#1a292b);text-align:center}.v09WellArt span{font-size:36px}.v09WellArt small{color:#a4b7b3;line-height:1.5}');
})();


