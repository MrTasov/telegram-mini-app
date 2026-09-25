window.V013Lake=(()=>{
 const poly=V09World.lake,fish=Array.from({length:18},(_,i)=>({id:i,x:160+Math.cos(i*2.4)*110,y:1820+Math.sin(i*2.4)*160,a:i*2.4,speed:7+i%5,burst:0,hidden:0}));
 let chosen=null,last=performance.now();
 function wet(x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function choose(s){release();const f=fish.filter(f=>!f.hidden&&Array.from({length:20},(_,i)=>{const t=i/19,x=f.x+(s.waterX-f.x)*t,y=f.y+(s.waterY-f.y)*t;return wet(x,y)&&!V012Fishing.boats.some(b=>Math.hypot(x-b.x,y-b.y)<39);}).every(Boolean)).sort((a,b)=>Math.hypot(a.x-s.waterX,a.y-s.waterY)-Math.hypot(b.x-s.waterX,b.y-s.waterY))[0];if(!f)return null;chosen=f;f.goal={x:s.waterX,y:s.waterY};const dist=Math.hypot(f.x-s.waterX,f.y-s.waterY);f.duration=clamp(6000+dist*40+Math.random()*1400,6000,15000);f.until=performance.now()+f.duration-700;return {id:f.id,duration:f.duration};}
 function release(){if(chosen){chosen.goal=null;chosen.burst=1.2;chosen=null;}}
 function caught(){if(chosen){chosen.hidden=20;chosen.goal=null;chosen=null;}}
 function tick(){const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  for(const f of fish){if(f.hidden>0){f.hidden=Math.max(0,f.hidden-dt);continue;}f.burst=Math.max(0,f.burst-dt);let nx,ny;
   if(f.goal){const dx=f.goal.x-f.x,dy=f.goal.y-f.y,d=Math.hypot(dx,dy);f.a=Math.atan2(dy,dx);const remaining=Math.max(.05,(f.until-now)/1000),step=Math.min(d,d/remaining*dt);nx=f.x+Math.cos(f.a)*step;ny=f.y+Math.sin(f.a)*step;}
   else {f.a+=Math.sin(now/2200+f.id)*dt*.35;if(Math.sin(now/1300+f.id*4)>.999)f.burst=.5;const speed=f.speed*(f.burst?3.5:1);nx=f.x+Math.cos(f.a)*speed*dt;ny=f.y+Math.sin(f.a)*speed*dt;}
   if(wet(nx,ny)&&!V012Fishing.boats.some(b=>Math.hypot(nx-b.x,ny-b.y)<38)){f.x=nx;f.y=ny;}else f.a+=Math.PI*.7;
  }
 }
 function path(){ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
 function draw(){if(!visibleOnScreen(160,1820,420))return;const now=performance.now();ctx.save();path();ctx.fillStyle='#b9b79b';ctx.fill();ctx.strokeStyle='#c3b995';ctx.lineWidth=12;ctx.stroke();ctx.save();path();ctx.clip();
  const depth=ctx.createRadialGradient(170,1815,25,160,1810,285);depth.addColorStop(0,'#153c52');depth.addColorStop(.42,'#205969');depth.addColorStop(.72,'#528f8e');depth.addColorStop(.9,'#94b7a5');depth.addColorStop(1,'#bdc1a2');ctx.fillStyle=depth;ctx.fillRect(-90,1550,520,560);
  for(let i=0;i<75;i++){const a=i*2.4,x=160+Math.cos(a)*(160+i%5*8),y=1810+Math.sin(a)*(210+i%3*8);ctx.fillStyle=i%2?'#747e6844':'#d4c5a45c';ctx.beginPath();ctx.ellipse(x,y,3+i%5,2+i%3,a,0,Math.PI*2);ctx.fill();}
  for(const f of fish){if(f.hidden||f===chosen&&V012Fishing.phase().kind==='reel')continue;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.globalAlpha=.20+Math.min(.15,Math.hypot(f.x-160,f.y-1820)/900);ctx.fillStyle='#132d31';ctx.beginPath();ctx.ellipse(0,0,10,3.2,0,0,Math.PI*2);ctx.fill();const sway=Math.sin(now/(f.burst?55:160)+f.id)*3;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-15,5+sway);ctx.lineTo(-15,-5+sway);ctx.closePath();ctx.fill();ctx.restore();}
  for(let i=0;i<32;i++){const x=-30+(i*79)%410,y=1600+(i*113)%460,phase=now/1800+i;ctx.strokeStyle='rgba(214,240,222,'+(.035+.035*Math.sin(phase))+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+12,y-3*Math.sin(phase),x+25,y);ctx.stroke();}
  path();ctx.strokeStyle='#d9e1c342';ctx.lineWidth=4+Math.sin(now/1100)*2;ctx.stroke();ctx.restore();
  for(const [x,y,r]of [[-48,1660,21],[-61,1694,14],[347,1638,27],[377,1660,18],[300,2040,25],[330,2019,16]]){ctx.fillStyle='#172a2744';ctx.beginPath();ctx.ellipse(x+5,y+6,r,r*.65,0,0,Math.PI*2);ctx.fill();const g=ctx.createLinearGradient(x-r,y-r,x+r,y+r);g.addColorStop(0,'#b5bbb0');g.addColorStop(.5,'#7d8d83');g.addColorStop(1,'#4b625c');ctx.fillStyle=g;ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/7,rr=r*(.85+.12*Math.sin(i*4+x));i?ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8):ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8);}ctx.closePath();ctx.fill();}
  ctx.restore();
 }
 const updateOld=update;update=function(...args){tick();return updateOld(...args);};
 return {fish,choose,release,caught,tick,draw,wet,get chosen(){return chosen;}};
})();

window.V013City=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 const types=['sedan','estate','suv','minibus','van'],names=['Седан','Универсал','Внедорожник','Микроавтобус','Фургон'];
 const cars=scavenges.filter(o=>o.kind==='car');
 cars.forEach((o,i)=>{const truck=o.zone==='supply';o.model013=truck?'truck':types[i%5];o.damaged013=!truck&&Math.floor(i/5)%2===1;o.name=truck?'Грузовик снабжения':names[i%5]+(o.damaged013?' · повреждённый':'');o.open013=o.searched?1:0;const cx=o.x+o.w/2,cy=o.y+o.h/2,wide=o.w>o.h,length=truck?210:[125,142,146,175,164][i%5],width=truck?89:[63,67,72,80,79][i%5];o.w=wide?length:width;o.h=wide?width:length;o.x=cx-o.w/2;o.y=cy-o.h/2;});
 let clock=0,floor=0,last=performance.now();const DAY=20*60*1000;
 const gas=[];
 for(const [i,x,y]of [[0,-2250,-500],[1,3430,4600],[2,-1250,7000],[3,1350,8900]]){
  const p={id:'gas013_'+i,kind:'house',zone:'fuel',name:'Заправка '+(i+1),x,y,w:370,h:300,searched:false,searchedAt:null};scavenges.push(p);V010World.places.push(p);const b=V011World.registerBuilding(p,{style:'shop',title:p.name});
  b.furniture[0].lootKind='fuel';b.furniture[0].name='Запас топлива';b.furniture[1].lootKind='food';
  const f=b.furniture[2];f.lootKind='fuel';f.name='Канистры';gas.push({p,b});
 }
 const mallSource={id:'mall013',kind:'house',zone:'market',name:'Торговый центр «Горизонт»',x:1100,y:-1200,w:1080,h:420,searched:false,searchedAt:null};
 scavenges.push(mallSource);V010World.places.push(mallSource);const mall=V011World.registerBuilding(mallSource,{style:'shop',title:mallSource.name});
 // One physical footprint, two persistent furniture sets. Ground facade never duplicates upstairs.
 const discarded=new Set(mall.furniture.map(f=>f.id));for(let i=V011World.containers.length-1;i>=0;i--)if(discarded.has(V011World.containers[i].id))V011World.containers.splice(i,1);
 const shops=[['Продукты','food','fridge'],['Аптека','medicine','wardrobe'],['Одежда','clothes','wardrobe'],['Инструменты','tools','workbench'],['Электроника','electronics','shelf'],['Склад продуктов','food','chest'],['Медицинский склад','medicine','wardrobe'],['Одежда · запас','clothes','wardrobe'],['Детали','parts','chest'],['Техника · склад','electronics','shelf']];
 const floors=[[],[]];
 shops.forEach(([name,lootKind,key],i)=>{const level=Math.floor(i/5),col=i%5;for(let j=0;j<2;j++){const id='mall013_f'+level+'_'+col+'_'+j;const f={id,key,x:mall.x+col*208+30+j*82,y:mall.y+35,w:65,h:60,name,lootKind,ref:{id,kind:'house',searched:false,searchedAt:null,loot:[]}};floors[level].push(f);V011World.containers.push(f);}});mall.furniture=floors[0];
 const stair={id:'mall013_stairs',kind:'stairs013',name:'На второй этаж',x:mall.x+mall.w-125,y:mall.y+mall.h-112,w:70,h:65,range:42};
 const partitions=()=>Array.from({length:4},(_,i)=>({id:'mall013_wall'+i,x:mall.x+(i+1)*208,y:mall.y+12,w:8,h:190}));
 function setFloor(n){floor=n;mall.furniture=floors[n];mall.title=mallSource.name+' · '+(n+1)+' этаж';stair.name=n?'На первый этаж':'На второй этаж';invalidateGeometry();}
 function stairs(){if(!canInteract(stair,player.x,player.y)||menuOpen)return;cancelNavigation();cancelChop();cancelSearch();V012Fishing.stop();setFloor(floor?0:1);player.x=stair.x-35;player.y=stair.y+32;queueGameSave();message((floor+1)+' этаж');}
 const interactions=interactionObjects;interactionObjects=function(which=scene){const out=interactions(which);if(which==='surface'&&V011World.inside(mall,player.x,player.y,0))out.push(stair);return floor&&which==='surface'?out.filter(o=>o.id.startsWith('mall013')):out;};
 const execute=executeInteraction;executeInteraction=function(o,...args){if(o?.kind==='stairs013')return stairs();return execute(o,...args);};
 const solids=solidObjects;solidObjects=function(which){const out=solids(which);if(which==='surface')out.push(...partitions(),...(floor&&!window.GameActivity?.groundQuery?[{...V011World.doorRect(mall),id:'mall013_upwall'}]:[]));return out;};
 const oldZombies=updateZombies;updateZombies=function(...args){if(!floor)return oldZombies(...args);};
 const oldOpen=openLoot;openLoot=function(o){
  const f=V011World.containers.find(f=>f.ref===o);if(!o.searched&&f&&['fuel','clothes','electronics'].includes(f.lootKind)){
   const pool=f.lootKind==='fuel'?[{type:'fuel',qty:25+Math.floor(Math.random()*36)}]:f.lootKind==='clothes'?[{type:'boots1',qty:1},{type:'pants1',qty:1}]:[{type:'parts',qty:6},{type:'copper',qty:12},{type:'advanced_parts',qty:1}];o.loot=pool;o.searched=true;o.searchedAt=Date.now();
  }
  return oldOpen(o);
 };
 function tick(){const now=performance.now(),dt=Math.max(0,Math.min(100,now-last));last=now;if(!document.hidden&&!playerDead)clock+=dt;
  for(const c of cars){c.open013=clamp(c.open013+(c.searched?1:-1)*dt/650,0,1);
   if(c.searched&&!(c.loot||[]).some(s=>s?.qty>0)){if(!c.due013)c.due013=clock+DAY*(1+Math.floor(Math.random()*3));
    if(clock>=c.due013&&!(activeLootObject===c&&el('lootOverlay').classList.contains('open'))){c.searched=false;c.loot=[];c.searchedAt=null;c.due013=null;queueGameSave();}}
   else if(!c.searched)c.due013=null;
  }
  if(floor&&(scene!=='surface'||!V011World.inside(mall,player.x,player.y,-25)))setFloor(0);
 }
 function drawCar(o){if(!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,160))return;const idx=types.indexOf(o.model013),w=Math.min(o.w,o.h),h=Math.max(o.w,o.h);ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);if(o.w>o.h)ctx.rotate(Math.PI/2);const p=o.open013||0;
  // The source is tightly alpha-cropped and scaled uniformly. Footprints use
  // those same proportions; sunlight adds one soft offset shadow, no frame.
  const shadow=ctx.createRadialGradient(6,8,Math.min(w,h)*.12,6,8,h*.55);shadow.addColorStop(0,'#0a191b40');shadow.addColorStop(1,'#0a191b00');ctx.save();ctx.translate(6,8);ctx.scale(w/h,1);ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,0,h*.55,h*.51,0,0,Math.PI*2);ctx.fill();ctx.restore();
  const truck=o.model013==='truck';
  if(truck){
   const metal=ctx.createLinearGradient(-w/2,0,w/2,0);metal.addColorStop(0,'#62776c');metal.addColorStop(.5,'#9b9e7c');metal.addColorStop(1,'#43594e');
   ctx.fillStyle='#142426';for(const yy of [-h*.35,h*.24,h*.36])for(const xx of [-w*.49,w*.37]){ctx.beginPath();ctx.roundRect(xx,yy,w*.13,22,3);ctx.fill();}
   ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(-w*.43,-h*.48,w*.86,h*.32,9);ctx.fill();ctx.strokeStyle='#b6b69b';ctx.lineWidth=1.4;ctx.stroke();
   ctx.fillStyle='#294b54';ctx.beginPath();ctx.roundRect(-w*.34,-h*.40,w*.68,h*.08,3);ctx.fill();ctx.fillStyle='#bec4a9';ctx.fillRect(-w*.39,-h*.47,w*.78,3);
   ctx.fillStyle='#3b514b';ctx.beginPath();ctx.roundRect(-w*.45,-h*.13,w*.90,h*.59,4);ctx.fill();ctx.strokeStyle='#a3ae99';ctx.stroke();
   ctx.fillStyle='#6d7b66';ctx.fillRect(-w*.39,-h*.10,w*.78,h*.52);ctx.strokeStyle='#a2af963d';for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(-w*.38,-h*.07+i*13);ctx.lineTo(w*.38,-h*.07+i*13);ctx.stroke();}
   ctx.fillStyle='#e2d2a3';ctx.fillRect(-w*.37,-h*.47,12,5);ctx.fillRect(w*.24,-h*.47,12,5);
  }else V011Art.draw('car013_'+o.model013+(o.damaged013?'_damaged':''),-w/2,-h/2,w,h);
  if(p>.01){const color=['#8ea7b3','#6f846f','#ae9271','#c4c9c2','#a16057'][idx]||'#a9b3aa';
   const doorLength=h*(truck?.15:.21),doorWidth=3+Math.sin(p*1.08)*w*.13;
   ctx.save();ctx.translate(-w*.405,-h*(truck?.31:.21));ctx.rotate(p*1.08);ctx.fillStyle='#0d212742';ctx.fillRect(-doorWidth-1,2,doorWidth+3,doorLength);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-doorWidth,0,doorWidth,doorLength,2);ctx.fill();ctx.strokeStyle='#bed0bba6';ctx.lineWidth=.7;ctx.stroke();ctx.fillStyle='#284955';ctx.fillRect(-doorWidth+1,2,Math.max(1,doorWidth-2),doorLength*.48);ctx.fillStyle='#d7d6bd';ctx.fillRect(-doorWidth+1,doorLength*.73,2,4);ctx.restore();
   const hinge=h*(truck?.405:.29),panelH=h*(truck?.065:.15),raised=panelH*Math.cos(p*1.28);
   ctx.fillStyle='#132727';ctx.beginPath();ctx.roundRect(-w*.30,hinge,w*.60,panelH,2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-w*.33,hinge,w*.66,Math.max(3,raised),2);ctx.fill();ctx.strokeStyle='#b4c5b18f';ctx.lineWidth=.8;ctx.stroke();ctx.fillStyle='#d0ccb3';ctx.fillRect(-4,hinge+Math.max(1,raised-4),8,2);
  }ctx.restore();
 }
 drawParkedCars=function(){for(const c of cars)drawCar(c);};
 // Unified road widths and shared junction surfaces, then markings inset from junctions.
 const roads=V012Expansion.roads.filter(r=>!r.id.startsWith('path_')).map(r=>({...r,width:r.width>200?284:112}));
 roads.push({id:'spine',points:[[800,1070],[800,9400]],width:284},{id:'res1',points:[[800,1658],[2250,1658],[2250,1940]],width:112},{id:'res2',points:[[800,2408],[2040,2408],[2040,3500]],width:112},{id:'central',points:[[-1700,3060],[800,3060]],width:112},{id:'cross1',points:[[800,3500],[3050,3500]],width:112},{id:'cross2',points:[[800,4070],[3050,4070]],width:112});
 const main=roads.slice();function nearRoad(x,y){let best=null,d=Infinity;for(const r of main)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1),p=[a[0]+t*dx,a[1]+t*dy],n=Math.hypot(p[0]-x,p[1]-y);if(n<d){d=n;best=p;}}return best;}
 function driveway(b,start,end){
  const blocks=V011World.buildings.filter(o=>o!==b),clear=(a,c)=>!blocks.some(o=>Math.max(a[0],c[0])>o.x-32&&Math.min(a[0],c[0])<o.x+o.w+32&&Math.max(a[1],c[1])>o.y-32&&Math.min(a[1],c[1])<o.y+o.h+32);
  const options=[[start,[start[0],end[1]],end],[start,[end[0],start[1]],end]];
  for(const o of blocks)for(const x of [o.x-60,o.x+o.w+60])options.push([start,[x,start[1]],[x,end[1]],end]);
  const length=p=>p.slice(1).reduce((n,q,i)=>n+Math.hypot(q[0]-p[i][0],q[1]-p[i][1]),0);
  return options.filter(p=>p.slice(1).every((q,i)=>clear(p[i],q))).sort((a,c)=>length(a)-length(c))[0]||options[0];
 }
 for(const b of V011World.buildings){const start=[b.x+b.w/2,b.y+b.h+31],p=nearRoad(...start);if(p)roads.push({id:'drive_'+b.id,points:driveway(b,start,p),width:48});}
 function line(r,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();r.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
 function drawRoads(){ctx.save();ctx.beginPath();ctx.rect(-2800,-2400,7200,12000);ctx.rect(-400,0,2400,1070);ctx.clip('evenodd');
  // Intersect each exclusion separately: overlapping houses/steps must never
  // cancel each other's holes as they would in one even-odd path.
  for(const b of V011World.buildings){ctx.beginPath();ctx.rect(-2800,-2400,7200,12000);ctx.rect(b.x-8,b.y-10,b.w+16,b.h+40);ctx.clip('evenodd');}
  ctx.lineJoin='round';ctx.lineCap='butt';
  const visible=roads.filter(r=>r.points.some(p=>visibleOnScreen(p[0],p[1],Math.max(...r.points.map(q=>Math.hypot(q[0]-p[0],q[1]-p[1])))+200)));
  for(const r of visible)line(r,'#777d70',r.width+14);for(const r of visible)line(r,'#464e50',r.width);
  for(const r of visible.filter(r=>r.width>70)){ctx.setLineDash([22,30]);line(r,'#d8d4b96a',2);ctx.setLineDash([]);}
  // Clear crossing centers over all markings; same asphalt prevents narrow-road seams.
  for(let a=0;a<main.length;a++)for(let b=a+1;b<main.length;b++)for(let i=1;i<main[a].points.length;i++)for(let j=1;j<main[b].points.length;j++){
   const p=main[a].points[i-1],q=main[a].points[i],u=main[b].points[j-1],v=main[b].points[j];const av=p[0]===q[0],bv=u[0]===v[0];if(av===bv)continue;const x=av?p[0]:u[0],y=av?u[1]:p[1];if(x>=Math.min(p[0],q[0])&&x<=Math.max(p[0],q[0])&&y>=Math.min(p[1],q[1])&&y<=Math.max(p[1],q[1])&&x>=Math.min(u[0],v[0])&&x<=Math.max(u[0],v[0])&&y>=Math.min(u[1],v[1])&&y<=Math.max(u[1],v[1])){ctx.fillStyle='#464e50';ctx.fillRect(x-(av?main[a].width:main[b].width)/2,y-(av?main[b].width:main[a].width)/2,av?main[a].width:main[b].width,av?main[b].width:main[a].width);}}
  for(const r of visible)for(const [x,y]of r.points){ctx.strokeStyle='#24333566';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+15,y+14);ctx.lineTo(x+21,y+30);ctx.lineTo(x+17,y+36);ctx.stroke();}ctx.restore();
 }
 function drawPlaces(){
  for(const {b}of gas){if(!visibleOnScreen(b.x,b.y,650))continue;const x=b.x,y=b.y+b.h+85;ctx.fillStyle='#68736b';ctx.fillRect(x-30,y-30,b.w+60,180);for(let i=0;i<3;i++){ctx.fillStyle='#c5ccc0';ctx.fillRect(x+35+i*110,y,40,60);ctx.fillStyle='#3d7e83';ctx.fillRect(x+39+i*110,y+5,32,30);ctx.fillStyle='#8ce0d1';ctx.fillRect(x+46+i*110,y+10,18,9);ctx.strokeStyle='#213c3c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+76+i*110,y+33,12,-1.5,1.5);ctx.stroke();}ctx.fillStyle='#a7bcb2';ctx.fillRect(x-10,y-42,b.w+20,15);ctx.fillStyle='#bce0d1';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(I18n.text('ТОПЛИВО'),x+b.w/2,y-52);}
  if(V011World.inside(mall,player.x,player.y,0)){ctx.save();if(floor){ctx.beginPath();ctx.rect(camera.x,camera.y,V010Camera.view().w,V010Camera.view().h);ctx.rect(mall.x,mall.y,mall.w,mall.h);ctx.clip('evenodd');ctx.fillStyle='#101e26ed';ctx.fillRect(camera.x,camera.y,V010Camera.view().w,V010Camera.view().h);ctx.restore();ctx.save();}
   for(const w of partitions()){ctx.fillStyle='#aec0b7';ctx.fillRect(w.x,w.y,w.w,w.h);}ctx.fillStyle='#adc3b6';ctx.font='13px sans-serif';ctx.textAlign='center';for(let i=0;i<5;i++)ctx.fillText(I18n.text(shops[floor*5+i][0]),mall.x+i*208+100,mall.y+150);ctx.fillStyle='#6a827b';ctx.fillRect(stair.x,stair.y,stair.w,stair.h);ctx.strokeStyle='#cfdbcf';for(let j=0;j<7;j++){ctx.beginPath();ctx.moveTo(stair.x,stair.y+j*9);ctx.lineTo(stair.x+stair.w,stair.y+j*9);ctx.stroke();}ctx.fillStyle='#eff4db';ctx.fillText(I18n.text(floor?'↓ 1 этаж':'↑ 2 этаж'),stair.x+35,stair.y-12);ctx.restore();}
 }
 const draw=drawSurface;drawSurface=function(...args){const out=draw(...args);drawPlaces();return out;};
 const oldUpdate=update;update=function(...args){const out=oldUpdate(...args);tick();return out;};
 GameSave.extend('capture','world.lake-city',function(capture){const d=capture();d.city013={schema:1,clock,floor,cars:cars.map(c=>({id:c.id,due:c.due013||null}))};return d;});
 GameSave.extend('decode','world.lake-city',function(decode,raw){const d=decode(raw),c=d.city013;if(c&&(!c||c.schema!==1||!Number.isFinite(c.clock)||c.clock<0||![0,1].includes(c.floor)||!Array.isArray(c.cars)||c.cars.length!==cars.length||c.cars.some((v,i)=>v.id!==cars[i].id||v.due!==null&&(!Number.isFinite(v.due)||v.due<0))))throw Error('Неверное состояние города');return d;});
 GameSave.extend('restore','world.lake-city',function(restore,d){setFloor(d.city013?.floor||0);restore(d);clock=d.city013?.clock||0;cars.forEach((c,i)=>{c.due013=d.city013?.cars[i]?.due||null;c.open013=c.searched?1:0;});last=performance.now();});
 for(const o of [...worldTrees,...V09World.ores])if([...gas.map(g=>g.b),mall].some(b=>rectHit(o.x,o.y,80,b))){o.x=-2650;o.y=300+Math.abs(o.y)%8500;}
 invalidateGeometry();
 return {cars,gas,mall,floors,stair,roads,drawCar,drawRoads,tick,setFloor,get floor(){return floor;},get clock(){return clock;},dayMs:DAY};
})();

