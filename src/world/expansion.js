/* 0.12 — five times the surface area, existing coordinates and object identities intact. */
window.V012Expansion=(()=>{
  'use strict';
  const bounds={x:-2800,y:-2400,w:7200,h:12000};
  const previous={x:-1000,y:0,w:3600,h:4800};
  Object.assign(surface,{minX:bounds.x,maxX:bounds.x+bounds.w,minY:bounds.y,maxY:bounds.y+bounds.h,width:bounds.w,height:bounds.h});
  const road=(id,points,width=104)=>({id,points,width});
  const roads=[
    road('south-highway',[[800,4740],[800,9400]],284),
    road('west-link',[[-530,3060],[-1700,3060]],94),
    road('west-route',[[-1700,-700],[-1700,7500],[800,7500]],100),
    road('north-route',[[-1700,-700],[3050,-700]],114),
    road('east-route',[[2420,3500],[3050,3500],[3050,-700]],108),
    road('east-south',[[2490,4070],[3050,4070],[3050,6600],[800,6600]],108),
    road('forest-village',[[-2600,6000],[800,6000]],100),
    road('south-estate',[[800,6600],[4200,6600]],100),
    road('southern-village',[[-950,8800],[2400,8800]],112)
  ];
  const regions=[
    {id:'region12_north',name:'Северный квартал',x:800,y:-1400,r:1900},
    {id:'region12_west',name:'Западный лес',x:-2150,y:2350,r:1500},
    {id:'region12_east',name:'Восточный технопарк',x:3550,y:2600,r:1500},
    {id:'region12_southwest',name:'Лесной посёлок',x:-1650,y:5500,r:1350},
    {id:'region12_southeast',name:'Заречная промзона',x:3030,y:6080,r:1300},
    {id:'region12_south',name:'Южная станция',x:900,y:8260,r:1900}
  ];
  V010World.regions.push(...regions);
  const definitions=[
    ['north',0,'residence','Северный дом',-1120,-1700],['north',1,'pharmacy','Северная аптека',100,-1700],['north',2,'market','Северный магазин',1420,-1700],
    ['west',0,'mill','Лесная мастерская',-2490,900],['west',1,'residence','Дом лесника',-2490,2260],['west',2,'garage','Западный гараж',-2490,4160],
    ['east',0,'warehouse','Технический склад',3400,650],['east',1,'substation','Сервисный центр',3400,2190],['east',2,'garage','Восточный автосервис',3400,3860],
    ['southwest',0,'residence','Лесной дом',-2480,5400],['southwest',1,'market','Магазин у леса',-1330,5400],['southwest',2,'mill','Мастерская посёлка',-590,5400],
    ['southeast',0,'warehouse','Южный склад',1830,6000],['southeast',1,'fuel','Топливная станция',2520,6000],['southeast',2,'garage','Дорожный гараж',3570,6000],
    ['south',0,'pharmacy','Аптека у станции',-450,8200],['south',1,'residence','Дом смотрителя',1100,8200],['south',2,'warehouse','Склад станции',2010,8200]
  ];
  const places=definitions.map(([region,i,zone,name,x,y])=>({id:'ex12_'+region+'_'+i,zone,name,x,y,w:420,h:320,kind:'house',searched:false,searchedAt:null}));
  // Footpaths join every front door to a public road. Never place a resource here.
  function closestRoad(x,y){let best=null,d=Infinity;for(const r of roads)for(let i=1;i<r.points.length;i++){
    const[a,b]=[r.points[i-1],r.points[i]],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1),p=[a[0]+dx*t,a[1]+dy*t],n=Math.hypot(x-p[0],y-p[1]);if(n<d){best=p;d=n;}}
    return best;
  }
  for(const p of places){const start=[p.x+p.w/2,p.y+p.h+32],end=closestRoad(start[0],start[1]);roads.push(road('path_'+p.id,[start,[start[0],start[1]+80],[end[0],start[1]+80],end],36));}
  const cars=places.filter((_,i)=>i%2===0).map((p,i)=>({id:'car12_'+i,kind:'car',zone:i%3===0?'supply':'garage',name:'Припаркованная машина',x:p.x+p.w+55,y:p.y+p.h-100,w:130,h:64,searched:false,searchedAt:null}));
  scavenges.push(...places,...cars);V010World.places.push(...places);V010World.cars.push(...cars);
  for(const p of places)window.V011World?.registerBuilding?.(p);
  const outsideOld=(x,y)=>x<previous.x||x>previous.x+previous.w||y<previous.y||y>previous.y+previous.h;
  const inside=(x,y,pad=0)=>x>=bounds.x+pad&&x<=bounds.x+bounds.w-pad&&y>=bounds.y+pad&&y<=bounds.y+bounds.h-pad;
  function roadDistance(x,y){let min=Infinity;for(const r of roads)for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;if(!den)continue;const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/den,0,1);min=Math.min(min,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)-r.width/2);
  }return min;}
  const objectClear=(x,y,r)=>![...places,...cars].some(o=>rectHit(x,y,r,o));
  let seed=120013;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trees=[],ores=[];
  // Deterministic points require no generated coordinates in save data. Sparse
  // foreground rendering and the existing96px collision grid bound frame cost.
  for(let y=bounds.y+170;y<bounds.y+bounds.h-140;y+=340)for(let x=bounds.x+170;x<bounds.x+bounds.w-140;x+=380){
    const px=x+(random()-.5)*210,py=y+(random()-.5)*210,roll=random();
    if(!outsideOld(px,py)||!inside(px,py,100)||!objectClear(px,py,100)||roadDistance(px,py)<65)continue;
    if(roll<.58){const id='tree12_'+trees.length;trees.push({id,x:px,y:py,r:24,felled:false,wood:15,regrowMs:0});}
    else if(roll>.89){const type=px>1500||roll>.97?'copper_ore':'iron_ore',capacity=100+(Math.floor(random()*4)*25);ores.push({id:'ore12_'+ores.length,type,x:px,y:py,r:42,capacity,remaining:capacity,regrowMs:0});}
  }
  worldTrees.push(...trees);V09World.ores.push(...ores);
  const spawnPoints=[];
  for(const p of places){let x=p.x+p.w/2+115,y=p.y+p.h+160;if(inside(x,y,50)&&!worldCollision(x,y,25,'surface'))spawnPoints.push({x,y});}
  for(const [x,y] of [[-500,-650],[2350,-650],[-1700,7000],[1600,7400],[3650,7150],[550,9100]])if(!worldCollision(x,y,25,'surface'))spawnPoints.push({x,y});
  const originalSpawnCount=V010World.targetCount();
  V010World.registerSpawns(spawnPoints);
  
  GameSave.extend('capture','world.expansion',function(oldCapture){const d=oldCapture();d.expansion012={schema:1};return d;});
  function migrateData(d){
    if(d.expansion012!==undefined){if(!d.expansion012||d.expansion012.schema!==1)throw Error('Некорректные данные расширенного мира');return d;}
    // Existing enemies retain their positions, kills and health. Only the newly
    // opened districts receive additional encounters (global population cap64).
    if(Array.isArray(d.zombies)&&d.zombies.length<=64){
      const types=d.v010?.modules?.world?.types,setting=d.v010?.modules?.world?.settings?.enemyCount??1;
      // A brand-new slot starts from the original six-zombie template, while
      // its module template contains30 type entries; align that known template.
      if(d.zombies.length===6&&Array.isArray(types)&&types.length===originalSpawnCount)types.length=6;
      const target=Math.min(64,Math.round((originalSpawnCount+spawnPoints.length)*setting)),count=Math.max(0,target-d.zombies.length);
      for(let i=0;i<count;i++){const p=i<spawnPoints.length?spawnPoints[i]:V010World.spawnAt((i-spawnPoints.length+6)%originalSpawnCount);d.zombies.push({x:p.x,y:p.y,health:100,alive:true,state:'wander'});if(Array.isArray(types))types.push(i%7===0?'heavy':i%3===0?'fast':'normal');}
    }
    d.expansion012={schema:1};return d;
  }
  GameSave.extend('decode','world.expansion',function(oldDecode,raw){if(typeof raw!=='string'||raw.length>2*1024*1024)return oldDecode(raw);return oldDecode(JSON.stringify(migrateData(JSON.parse(raw))));});
  function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  function clipNew(){ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.rect(previous.x,previous.y,previous.w,previous.h);ctx.clip('evenodd');}
  function drawRoad(r){const v=V010Camera.view(),xs=r.points.map(p=>p[0]),ys=r.points.map(p=>p[1]),pad=r.width/2+30;if(Math.max(...xs)<camera.x-pad||Math.min(...xs)>camera.x+v.w+pad||Math.max(...ys)<camera.y-pad||Math.min(...ys)>camera.y+v.h+pad)return;const main=r.width>50;line(r.points,main?'#6f786c':'#56644c',r.width+(main?18:8));line(r.points,main?'#444f4f':'#898878',r.width);if(main){ctx.setLineDash([25,31]);line(r.points,'#d2cbae88',2);ctx.setLineDash([]);}}
  function drawTerrain(){
    ctx.save();clipNew();const v=V010Camera.view(),x=Math.max(bounds.x,camera.x),y=Math.max(bounds.y,camera.y),right=Math.min(bounds.x+bounds.w,camera.x+v.w),bottom=Math.min(bounds.y+bounds.h,camera.y+v.h);
    const ground=ctx.createLinearGradient(bounds.x,0,bounds.x+bounds.w,0);ground.addColorStop(0,'#304a3b');ground.addColorStop(.28,'#414e3d');ground.addColorStop(.7,'#414e3d');ground.addColorStop(1,'#4a5145');ctx.fillStyle=ground;ctx.fillRect(x,y,right-x,bottom-y);
    for(let gy=Math.floor(y/110)*110;gy<bottom+80;gy+=110)for(let gx=Math.floor(x/110)*110;gx<right+80;gx+=110){const n=Math.abs(Math.sin(gx*.129+gy*.19)),px=gx+n*55,py=gy+n*34;
      ctx.fillStyle='#20352825';ctx.beginPath();ctx.ellipse(px,py,16+n*12,7,0,0,Math.PI*2);ctx.fill();line([[px-4,py+2],[px-7,py-7],[px-2,py-3]],'#a5b58233',1.2);
    }
    ctx.lineJoin='round';if(!window.V013City)for(const r of roads)drawRoad(r);ctx.restore();
  }
  const oldSurface=drawSurface;drawSurface=function(...args){
    drawTerrain();const out=oldSurface(...args);
    // Only connector stubs cross the established map; preserve the rest of it.
    ctx.save();ctx.beginPath();ctx.rect(previous.x,previous.y,previous.w,previous.h);ctx.clip();if(!window.V013City)for(const r of roads.slice(0,6))drawRoad(r);ctx.restore();
    ctx.save();clipNew();drawWorldTrees('expansion12');drawParkedCars();ctx.restore();
    for(const r of regions)if(visibleOnScreen(r.x,r.y,450)){ctx.save();ctx.globalAlpha=.7;ctx.fillStyle='#d0d8c4';ctx.font='600 15px Arial';ctx.textAlign='center';ctx.fillText(r.name.toUpperCase(),r.x,r.y-250);ctx.restore();}
    return out;
  };
  invalidateGeometry();
  return {bounds,previous,roads,regions,places,cars,trees,ores,spawnPoints,migrateData,roadDistance};
})();

