/* 0.11 shared top-down room architecture and animated props. */
window.V011Rooms=(()=>{
  const patterns=new Map(),lidState=new Map();
  const palette={corridor:['#3b494c','#4b595c','#263539'],workshop:['#424b4c','#4b5455','#303a3c'],storage:['#454e4b','#4c5653','#333f3c'],room4:['#56635f','#606e69','#3c4d49'],room5:['#36464c','#405258','#25363e'],room6:['#615e51','#6d695b','#454b44'],room7:['#635d50','#6e6758','#47483f']};
  let frameAt=performance.now(),frameMs=16,phase=0,generatorPhase=0,furnacePhase=0,benchPhase=0;
  const art=(key,x,y,w,h)=>!!window.V011Art?.draw(key,x,y,w,h);
  const rect=(x,y,w,h,fill,stroke=null,r=4)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke();}};
  const line=(x1,y1,x2,y2,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  function tile(key){
    if(patterns.has(key))return patterns.get(key);
    const colors=palette[key]||palette.storage,wood=key==='room7',metal=key==='room5',size=wood?96:64;
    const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):document.createElement('canvas');c.width=c.height=size;const p=c.getContext('2d');
    p.fillStyle=colors[0];p.fillRect(0,0,size,size);p.fillStyle=colors[1];p.fillRect(1,1,size-2,wood?22:size-2);
    p.strokeStyle=colors[2];p.lineWidth=1;p.strokeRect(.5,.5,size-1,size-1);
    if(wood){for(let y=24;y<96;y+=24){p.fillStyle=y===48?colors[0]:colors[1];p.fillRect(1,y+1,94,22);p.strokeStyle=colors[2];p.beginPath();p.moveTo(0,y);p.lineTo(96,y);p.stroke();p.beginPath();p.moveTo(y===48?30:70,y);p.lineTo(y===48?30:70,y+24);p.stroke();}p.strokeStyle='#bfb08e12';for(let i=0;i<16;i++){p.beginPath();p.moveTo((i*17)%50,5+i*5);p.lineTo(90,6+i*5);p.stroke();}}
    else{p.strokeStyle='#eaf5e509';p.beginPath();p.moveTo(3,3);p.lineTo(size-3,3);p.moveTo(3,3);p.lineTo(3,size-3);p.stroke();if(metal){p.fillStyle='#9dafae35';for(const x of [5,59])for(const y of [5,59]){p.beginPath();p.arc(x,y,1.1,0,Math.PI*2);p.fill();}p.strokeStyle='#bdcaca0a';for(let i=12;i<55;i+=7){p.beginPath();p.moveTo(i,16);p.lineTo(i+5,21);p.stroke();}}}
    const pattern=ctx.createPattern(c,'repeat');patterns.set(key,pattern);return pattern;
  }
  function floor(key,r){
    ctx.save();ctx.fillStyle=tile(key);ctx.fillRect(r.left+7,r.top+7,r.right-r.left-14,r.bottom-r.top-14);
    ctx.strokeStyle='#0d1b1c3d';ctx.lineWidth=9;ctx.strokeRect(r.left+14,r.top+14,r.right-r.left-28,r.bottom-r.top-28);
    if(key==='corridor'){line(r.left+22,r.top,r.left+22,r.bottom,'#a4b8ae28',2);line(r.right-22,r.top,r.right-22,r.bottom,'#a4b8ae28',2);for(let y=r.top+100;y<r.bottom;y+=180){rect(708,y,34,6,'#9cac9e2b',null,2);}}
    if(key==='room7'){ctx.fillStyle=tile('room4');ctx.fillRect(900,95,235,150);}
    if(key==='workshop'){ctx.strokeStyle='#c8b37a55';ctx.lineWidth=2;ctx.setLineDash([10,7]);ctx.strokeRect(142,782,154,219);ctx.strokeRect(145,1049,284,197);ctx.setLineDash([]);}
    if(key==='storage'){for(const y of [r.top+96,r.bottom-96])line(r.left+35,y,r.right-35,y,'#aab2a22b',2);}
    ctx.restore();
  }
  function wall(x1,y1,x2,y2){
    ctx.save();line(x1+4,y1+5,x2+4,y2+5,'#07141666',19);line(x1,y1,x2,y2,'#344547',18);line(x1,y1,x2,y2,'#72827e',12);line(x1-3,y1-3,x2-3,y2-3,'#b6c4b566',2);
    const d=Math.hypot(x2-x1,y2-y1);for(let n=58;n<d;n+=90){const t=n/d,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;if(x1===x2)line(x-6,y,x+6,y,'#384f4c',1.2);else line(x,y-6,x,y+6,'#384f4c',1.2);}
    ctx.restore();
  }
  function walls(r,side){wall(r.left,r.top,r.right,r.top);wall(r.left,r.bottom,r.right,r.bottom);const outer=side==='left'?r.left:r.right,inner=side==='left'?r.right:r.left;wall(outer,r.top,outer,r.bottom);wall(inner,r.top,inner,r.doorTop);wall(inner,r.doorBottom,inner,r.bottom);}
  function corridorWalls(r,left,right){for(const [x,doors] of [[r.left,left],[r.right,right]]){let from=r.top;for(const d of doors){if(d[0]>from)wall(x,from,x,d[0]);from=d[1];}if(from<r.bottom)wall(x,from,x,r.bottom);}wall(r.left,r.bottom,r.right,r.bottom);}
  function shadow(x,y,w,h,height=22,room='storage'){
    const points=v09LightPoints(room),cx=x+w/2,cy=y+h/2;
    const p=points.reduce((a,b)=>Math.hypot(b.x-cx,b.y-cy)<Math.hypot(a.x-cx,a.y-cy)?b:a,points[0]||{x:cx-120,y:cy-160});
    const dx=cx-p.x,dy=cy-p.y,d=Math.hypot(dx,dy)||1,sx=dx/d*height,sy=dy/d*height;
    // Tight contact shadow and feathered displacement away from the lamp,
    // rather than the old expanded dark frame around the entire object.
    ctx.save();const on=typeof devicePowered!=='function'||devicePowered('light_'+room);
    for(let i=5;i>=1;i--){const t=i/5;rect(x+sx*t+2,y+sy*t+2,Math.max(1,w-4),Math.max(1,h-4),on?'rgba(4,14,17,.035)':'rgba(4,14,17,.02)',null,Math.min(10,w/4,h/4));}
    rect(x+3,y+3,Math.max(1,w-6),Math.max(1,h-6),'rgba(3,12,14,.12)',null,Math.min(8,w/4,h/4));ctx.restore();
  }
  function beginFrame(){const now=performance.now();frameMs=clamp(now-frameAt,0,60);frameAt=now;phase+=frameMs/1000;if(V09Power.running&&V09Power.fuel>0)generatorPhase+=frameMs/130;if(V09Craft.visualState('furnace').working)furnacePhase+=frameMs/150;if(V09Craft.visualState('craft_bench').working)benchPhase+=frameMs/600;}
  const oldBunker=drawBunker;drawBunker=function(){beginFrame();oldBunker();};
  function chest(id,p,ch){
    const target=activeStorage===id&&el('storageOverlay')?.classList.contains('open')?1:0,previous=lidState.get(id)||0,opening=clamp(previous+Math.sign(target-previous)*Math.min(Math.abs(target-previous),frameMs/420),0,1);lidState.set(id,opening);const e=opening*opening*(3-2*opening),x=p.x-40,y=p.y-28,w=80,h=56;
    shadow(x,y,w,h,17,id<8?'storage':'farm');ctx.save();rect(x,y,w,h,'#304a4d','#81928a',5);
    const hasArt=art('chest',x-7,y-7,w+14,h+14),im=window.V011Art?.image?.('chest');
    if(hasArt&&im){
      if(e>0){
        ctx.save();ctx.globalAlpha=Math.min(1,e*5);rect(x+7,y+9,w-14,h-20,'#102123','#718579',3);if((ch?.items||[]).filter(Boolean).length){rect(x+17,y+27,20,15,'#859686',null,2);rect(x+43,y+23,21,22,'#a99c75',null,2);}ctx.restore();
        const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,lh=36*(1-e)+7,ly=y+7-19*e;
        ctx.save();ctx.fillStyle='#07171755';ctx.fillRect(x+7,ly+lh,w-14,3+e*4);ctx.drawImage(im,iw*.145,ih*.20,iw*.71,ih*.51,x+6,ly,w-12,lh);line(x+5,ly+lh,x+w-5,ly+lh,'#adc0a96b',1);ctx.restore();
      }
    }else{
      rect(x+5,y+5,w-10,h-10,'#0d2026','#667e7c',3);const count=(ch?.items||[]).filter(Boolean).length;if(count){rect(x+13,y+22,22,18,'#81978b',null,2);rect(x+43,y+19,22,25,'#aa9a71',null,2);}
      const lh=49*(1-e)+9,ly=y-14*e;const gradient=ctx.createLinearGradient(x,ly,x,ly+lh);gradient.addColorStop(0,'#839b95');gradient.addColorStop(.3,'#526c69');gradient.addColorStop(1,'#2e4949');rect(x-1,ly,w+2,lh,gradient,'#a3b5a6',4);
      line(x+9,ly+lh*.28,x+w-9,ly+lh*.28,'#a8c0b258',1.4);for(const xx of [x+14,x+w-18])rect(xx,ly+1,4,Math.max(2,lh-2),'#263e40');rect(p.x-10,ly+lh-9,20,6,'#172d33','#829991',2);
    }
    ctx.fillStyle='#cad8c9';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText(ch?.name||'Ящик',p.x,p.y+41);ctx.restore();
  }
  function storage(){const r=bunker.storage;ctx.save();for(const y of [r.top+24,r.bottom-91]){shadow(r.left+28,y,r.right-r.left-56,67,12,'storage');rect(r.left+28,y,r.right-r.left-56,67,'#273d40','#697f7b',3);for(const x of [r.left+29,r.right-36])rect(x,y,7,67,'#81918a');}const positions=getChestPositions();for(let i=0;i<8;i++)chest(i,positions[i],storageChests[i]);ctx.restore();}
  function fan(x,y,r,angle,on){
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#101c22';ctx.beginPath();ctx.arc(0,0,r+1,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.rotate(angle);const blade=ctx.createLinearGradient(-r,-r,r,r);blade.addColorStop(0,'#83918a');blade.addColorStop(.5,'#526560');blade.addColorStop(1,'#293d3c');ctx.fillStyle=blade;
    for(let i=0;i<7;i++){ctx.rotate(Math.PI*2/7);ctx.beginPath();ctx.moveTo(1,0);ctx.quadraticCurveTo(r*.72,-r*.48,r*.91,-r*.13);ctx.quadraticCurveTo(r*.56,r*.41,1,0);ctx.fill();}ctx.restore();
    ctx.strokeStyle='#9faea159';ctx.lineWidth=.7;for(let ring=3;ring<r;ring+=3){ctx.beginPath();ctx.arc(0,0,ring,0,Math.PI*2);ctx.stroke();}for(let i=0;i<4;i++){const a=i*Math.PI/2;line(Math.cos(a)*r*.22,Math.sin(a)*r*.22,Math.cos(a)*r,Math.sin(a)*r,'#9aaaa077',1);}
    ctx.fillStyle='#6b7a72';ctx.beginPath();ctx.arc(0,0,r*.23,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b0b9a777';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function imagePart(key,sx,sy,sw,sh,x,y,w,h){const im=window.V011Art?.image?.(key);if(!im||!window.V011Art.ready(key))return false;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;ctx.drawImage(im,sx/340*iw,sy/510*ih,sw/340*iw,sh/510*ih,x,y,w,h);return true;}
  function workshop(){
    ctx.save();const f=V09Craft.visualState('furnace'),b=V09Craft.visualState('craft_bench');shadow(154,794,130,195,24,'workshop');
    if(!art('furnace',154,794,130,195)){const g=ctx.createLinearGradient(154,794,284,989);g.addColorStop(0,'#78877d');g.addColorStop(.5,'#3e5455');g.addColorStop(1,'#233943');rect(154,794,130,195,g,'#9caba0',9);rect(185,806,69,24,'#142a2e','#748e84',3);rect(181,929,76,35,'#193137','#81968d',3);}
    // Cover the artwork's hot aperture so an idle furnace never contains painted fire.
    const cx=219,cy=878,r=24;const fire=ctx.createRadialGradient(cx,cy+4,1,cx,cy,r);fire.addColorStop(0,f.working?'#ffecc1':'#293735');fire.addColorStop(.5,f.working?'#ed943a':'#1d2e2d');fire.addColorStop(1,f.working?'#793d22':'#111f24');ctx.fillStyle=fire;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
    if(f.working){ctx.globalAlpha=.3+.15*Math.sin(furnacePhase);ctx.fillStyle='#ffedb4';ctx.beginPath();ctx.ellipse(cx+Math.sin(furnacePhase)*4,cy+4,13,8,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    // Motor-driven extraction fan occupies the vent already present in the sprite.
    rect(197,805,44,26,'#16292c',null,2);fan(219,818,11,furnacePhase*2,f.working);for(let i=0;i<5;i++)line(198,809+i*4,240,809+i*4,'#87958c66',.7);rect(235,939,3,9,f.working?'#a6d78b':f.powered?'#648b67':'#354b43',null,1);
    shadow(163,1085,248,126,12,'workshop');
    if(!art('workbench',157,1061,260,173)){rect(157,1061,260,173,'#5a706f','#9eaca1',8);rect(200,1120,120,62,'#2a4043','#788f87',3);}
    // Horizontal rail follows the new mostly-overhead artwork. Motor phase freezes
    // on pause or power loss, so the mechanism only travels while crafting.
    const armX=217+(Math.sin(benchPhase)*.5+.5)*96;
    rect(armX+3,1095,25,45,'#081c2555',null,4);
    const metal=ctx.createLinearGradient(armX,0,armX+25,0);metal.addColorStop(0,'#b2c2b5');metal.addColorStop(.45,'#748d87');metal.addColorStop(1,'#3e5757');
    rect(armX,1092,25,35,metal,'#aebeb4',3);
    for(const xx of [armX+3,armX+22])for(const yy of [1095,1123]){rect(xx-1,yy-1,2,2,'#223c40',null,1);line(xx-.6,yy-.4,xx+.6,yy-.4,'#bdcabd',.5);}
    for(let k=0;k<5;k++)line(armX+5,1109+k*2.1,armX+20,1109+k*2.1,'#2c4549',1);
    rect(armX+7,1126,11,18,metal,'#7e928e',2);for(let k=0;k<4;k++)line(armX+8,1130+k*3,armX+17,1130+k*3,'#304a4e',1);
    rect(armX+11,1142,3,8,'#c3cfbf',null,1);rect(armX+5,1101,15,3,b.working?'#71dbd5':'#345f67',null,1);
    if(b.working){ctx.globalAlpha=.35+.2*Math.sin(benchPhase*3);rect(armX+9,1150,7,2,'#a6eee8',null,1);ctx.globalAlpha=1;}
    ctx.fillStyle='#d9e3d4';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText('ПЛАВИЛЬНАЯ ПЕЧЬ',219,1008);ctx.fillText('ЭЛЕКТРОСТАНОК',287,1250);ctx.restore();
  }
  function energy(){
    ctx.save();const running=V09Power.running&&V09Power.fuel>0;shadow(887,316,123,181,24,'room5');shadow(1052,315,130,195,23,'room5');shadow(1237,302,101,212,20,'room5');
    line(994,441,1055,441,'#1a2e34',12);line(994,439,1055,439,'#81918a',6);line(1172,426,1250,426,'#132c37',10);line(1172,425,1250,425,'#618388',4);
    if(!art('tank',880,304,140,208)){const g=ctx.createLinearGradient(885,0,1010,0);g.addColorStop(0,'#56686b');g.addColorStop(.24,'#aab5a8');g.addColorStop(.7,'#617978');g.addColorStop(1,'#30494e');rect(889,316,120,182,g,'#9eafa1',18);for(const y of [342,473])rect(887,y,124,8,'#3a5355','#879b93',2);rect(933,307,32,17,'#354d52','#a0b1a4',3);}
    const glass={x:977,y:364,w:7,h:67},fill=clamp(V09Power.fuel/V09Power.capacity,0,1);rect(glass.x-4,glass.y-4,glass.w+8,glass.h+8,'#1a2d33','#a1b9ae',4);rect(glass.x,glass.y,glass.w,glass.h,'#10303e',null,2);ctx.fillStyle='#c7ad65';ctx.fillRect(glass.x+1,glass.y+glass.h*(1-fill),glass.w-2,glass.h*fill);ctx.fillStyle='#eff8e459';ctx.fillRect(glass.x+3,glass.y,3,glass.h);for(let i=0;i<=4;i++)line(glass.x-5,glass.y+i*glass.h/4,glass.x+2,glass.y+i*glass.h/4,'#dce3cc',1);
    const vibration=running?Math.sin(generatorPhase*5)*.25:0;ctx.save();ctx.translate(vibration,0);if(!art('generator',1052,315,130,195)){const g=ctx.createLinearGradient(1052,315,1182,510);g.addColorStop(0,'#8b9e93');g.addColorStop(.4,'#405f61');g.addColorStop(1,'#263f49');rect(1052,315,130,195,g,'#9fb2a5',8);rect(1083,405,60,69,'#364e46','#859687',4);rect(1077,480,79,18,'#1b343a','#71887d',3);}
    // This rotor precisely covers the single fan in the generated top-down sprite.
    fan(1117,365,30,generatorPhase,running);rect(1110,492,16,3,running?'#8bded5':'#355b5e',null,1);ctx.restore();
    if(running){for(let i=0;i<4;i++){const t=(phase*.6+i*.25)%1;ctx.fillStyle=`rgba(181,202,196,${.09*(1-t)})`;ctx.beginPath();ctx.ellipse(1149+Math.sin(t*5+i)*3,406-t*21,2+t*6,2+t*4,0,0,Math.PI*2);ctx.fill();}}
    const charge=clamp(V010Energy.battery.charge/V010Energy.battery.capacity,0,1);const bg=ctx.createLinearGradient(1235,0,1340,0);bg.addColorStop(0,'#58797b');bg.addColorStop(.5,'#36565f');bg.addColorStop(1,'#203b47');rect(1237,302,101,212,bg,'#90aaa3',7);rect(1255,331,65,105,'#1b3440','#698c8d',4);for(let i=0;i<7;i++)rect(1264,418-i*12,46,7,charge>(i+.5)/7?(V010Energy.battery.enabled?'#8cc7a5':'#829792'):'#36545b',null,1);rect(1252,466,72,23,'#203943','#627f83',3);
    ctx.textAlign='center';ctx.font='10px Arial';ctx.fillStyle='#d4dfcc';ctx.fillText(Math.round(V09Power.fuel)+' / '+V09Power.capacity,942,479);ctx.fillText('ТОПЛИВО',947,532);ctx.fillText('ГЕНЕРАТОР',1117,532);ctx.fillText(Math.round(charge*100)+'%',1287,482);ctx.fillText('РЕЗЕРВ',1287,534);ctx.restore();
  }
  function lights(room){const r=bunker[room];if(!r)return[];if(room==='corridor')return[-100,220,560,900,1200].map(y=>({x:725,y}));if(room==='farm')return[{x:430,y:r.top+22},{x:1040,y:r.top+22},{x:430,y:r.bottom-22},{x:1040,y:r.bottom-22}];if(room==='storage')return[{x:1020,y:r.top+17},{x:1240,y:r.top+17},{x:1020,y:r.bottom-17},{x:1240,y:r.bottom-17}];if(room==='room7')return[{x:1100,y:r.top+18},{x:1200,y:r.bottom-25}];return[{x:(r.left+r.right)/2,y:r.top+18},{x:(r.left+r.right)/2,y:r.bottom-18}];}
  v09LightPoints=lights;
  function lightRadius(room){return room==='farm'?440:room==='corridor'?250:350;}
  function paintDarkness(c,room,r,on){
    c.save();c.beginPath();c.rect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);c.clip();c.clearRect(r.left,r.top,r.right-r.left,r.bottom-r.top);c.fillStyle=on?'rgba(3,13,19,.46)':'rgba(2,7,15,.79)';c.fillRect(r.left,r.top,r.right-r.left,r.bottom-r.top);
    if(on){c.globalCompositeOperation='destination-out';for(const p of lights(room)){const radius=lightRadius(room),g=c.createRadialGradient(p.x,p.y,5,p.x,p.y,radius);g.addColorStop(0,'rgba(255,255,255,.96)');g.addColorStop(.25,'rgba(255,255,255,.81)');g.addColorStop(.65,'rgba(255,255,255,.40)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}}
    if(room==='workshop'&&V09Craft.visualState('furnace').working){c.globalCompositeOperation='destination-out';const g=c.createRadialGradient(219,878,0,219,878,180);g.addColorStop(0,'#ffffffff');g.addColorStop(.4,'#ffffff66');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(39,698,360,360);}c.restore();
  }
  v09DrawRoomLight=function(room){const r=bunker[room];if(!r)return;const on=devicePowered('light_'+room);ctx.save();ctx.beginPath();ctx.rect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);ctx.clip();if(on)for(const p of lights(room)){const radius=lightRadius(room),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,'#ffefd224');g.addColorStop(.45,'#f6edc810');g.addColorStop(1,'#f4e9c800');ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}ctx.restore();for(const p of lights(room)){ctx.save();ctx.globalAlpha=on?1:.55;if(!art('lamp',p.x-33,p.y-9,66,18)){rect(p.x-35,p.y-6,70,12,'#253f46','#799791',3);rect(p.x-27,p.y-2,54,4,on?'#f3e8c3':'#647a79',null,1);}if(on){ctx.fillStyle='#fff4da';ctx.fillRect(p.x-21,p.y-1,42,2);}ctx.restore();}};
  v09DrawDoor=function(d){ctx.save();const on=devicePowered('door_'+d.room),cx=d.x+d.w/2,cy=d.y+d.h/2;rect(d.x-5,d.y-5,d.w+10,d.h+10,'#142c34','#78918c',3);rect(d.x,d.y,d.w,d.h,'#32484b',null,1);for(const panel of v09DoorPanels(d)){if(panel.w<.1||panel.h<.1)continue;const g=d.horizontal?ctx.createLinearGradient(0,panel.y,0,panel.y+panel.h):ctx.createLinearGradient(panel.x,0,panel.x+panel.w,0);g.addColorStop(0,'#506c70');g.addColorStop(.4,'#a4b5aa');g.addColorStop(1,'#405e66');rect(panel.x,panel.y,panel.w,panel.h,g,'#b5c5b7',1);if(d.horizontal){line(panel.x+3,panel.y+panel.h*.5,panel.x+panel.w-3,panel.y+panel.h*.5,'#2b4b53',1.6);}else line(panel.x+panel.w*.5,panel.y+3,panel.x+panel.w*.5,panel.y+panel.h-3,'#2b4b53',1.6);}
    if(d.horizontal){line(d.x,d.y-5,d.x+d.w,d.y-5,'#bfd0be',1);line(cx-15,d.y-8,cx+15,d.y-8,on?'#97d8bc':'#c3a66e',3);}else{line(d.x-5,d.y,d.x-5,d.y+d.h,'#b6c6b8',1);line(d.x-8,cy-15,d.x-8,cy+15,on?'#97d8bc':'#c3a66e',3);}ctx.restore();};
  V09Craft.drawWorkshop=workshop;v09DrawEnergyReadouts=function(){};
  function safeRestoredPosition(source){
    if(scene!=='bunker'||!source||!Number.isFinite(source.x)||!Number.isFinite(source.y))return;
    const radius=player.radius,free=(x,y)=>!worldCollision(x,y,radius,'bunker');
    let point=free(source.x,source.y)?source:null;
    if(!point){
      // Room interiors stay independent: a search may not teleport through an adjacent wall.
      const room=Object.values(bunker).find(r=>Number.isFinite(r?.left)&&source.x>=r.left&&source.x<=r.right&&source.y>=r.top&&source.y<=r.bottom);
      for(let distance=4;distance<=320&&!point;distance+=4){
        for(let i=0;i<64;i++){
          const a=i*Math.PI/32,x=source.x+Math.cos(a)*distance,y=source.y+Math.sin(a)*distance;
          if(room&&(x<room.left+radius||x>room.right-radius||y<room.top+radius||y>room.bottom-radius))continue;
          if(free(x,y)){point={x,y};break;}
        }
      }
    }
    // The original loader retains its safe entrance fallback if no nearby free point exists.
    if(!point)return;
    if(Math.abs(player.x-point.x)<.00001&&Math.abs(player.y-point.y)<.00001)return;
    player.x=point.x;player.y=point.y;player.wallLevel=false;cancelNavigation();
    const view=V010Camera.view();camera.x=player.x-view.w/2;camera.y=player.y-view.h/2;updateCamera();updateAction();
    V091Light.invalidate();
    // Fortress snapshots derive their canonical coordinates from player; no stale copy remains.
  }
  const oldRestore=restoreGameProgress;restoreGameProgress=function(data){
    const source=data?.player?.scene==='bunker'?{x:data.player.x,y:data.player.y}:null;
    lidState.clear();frameAt=performance.now();const result=oldRestore(data);safeRestoredPosition(source);return result;
  };
  return{floor,walls,corridorWalls,wall,shadow,storage,chest,energy,workshop,paintDarkness,lights,fan,lidState,safeRestoredPosition,animation:()=>({generator:generatorPhase,furnace:furnacePhase,bench:benchPhase}),cacheSize:()=>patterns.size};
})();

/* 0.11: living room, active rest, shower and bounded cosmetic combat dirt. */
window.V011Living=(()=>{
  const BED={id:'bed',kind:'living_bed',name:'Отдыхать',x:1232,y:-205,w:99,h:198,range:46};
  const SHOWER={id:'shower',kind:'living_shower',name:'Принять душ',x:916,y:156,w:74,h:82,range:34};
  const BATH_DOOR={id:'living_bath_door',kind:'living_bath_door',name:'Дверь санузла',x:990,y:100,w:78,h:5,range:70};
  const fixtures=[{id:'wardrobe',x:885,y:-205,w:155,h:64},{id:'nightstand',x:1110,y:-195,w:58,h:58},{...BED},{id:'living_desk',x:1190,y:116,w:145,h:105},{id:'living_chair',x:1240,y:224,w:45,h:25},{id:'bath_wall1',x:898,y:99,w:92,h:6},{id:'bath_wall3',x:1068,y:99,w:69,h:6},{id:'bath_wall2',x:1131,y:99,w:6,h:148},{id:'bath_wall4',x:898,y:99,w:6,h:148},{id:'toilet',x:1075,y:163,w:35,h:70},{id:'living_sink',x:1083,y:117,w:36,h:29},{id:'shower_rim_n',x:916,y:156,w:74,h:4},{id:'shower_rim_w',x:916,y:160,w:4,h:78},{id:'shower_rim_s',x:916,y:234,w:74,h:4}];
  let dirt=0,mode=null,anchor=null,elapsed=0,lastSave=0,doorProgress=0,doorManual=false;
  const care=document.createElement('div');care.id='v011Care';
  const careText=document.createElement('span'),careStop=v09Button('Встать',()=>stop());
  care.append(careText,careStop);document.body.append(care);
  v09Style('#v011Care{position:fixed;left:50%;bottom:calc(134px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:39;display:none;align-items:center;gap:12px;border:1px solid #8cafa15c;border-radius:12px;background:#172a2ce8;color:#e1eae2;padding:8px 10px;max-width:78vw;box-shadow:0 5px 22px #0005;font:12px Arial}#v011Care .menuButton{width:auto;min-height:36px;margin:0;padding:6px 12px;font-size:12px;border-radius:8px;white-space:nowrap}#v011Care span{min-width:100px;line-height:1.4}');
  function refresh(){
    care.style.display=mode&&!menuOpen&&!document.hidden?'flex':'none';
    careText.textContent=mode==='rest'?'Отдых · '+Math.round(player.health)+' / '+Math.round(player.maxHealth)+' HP':dirt>.01?'Душ · очищение одежды':'Душ · чисто';
    careStop.textContent=mode==='rest'?'Встать':'Выключить';
  }
  function stop(){
    if(!mode)return;
    mode=null;anchor=null;elapsed=0;player.moving=false;refresh();queueGameSave();
  }
  function start(kind){
    if(playerDead||scene!=='bunker'||!['rest','shower'].includes(kind))return false;
    const fixture=kind==='rest'?BED:SHOWER;
    if(!canInteract(fixture,player.x,player.y))return false;
    if(mode===kind){stop();return true;}
    stopControls();cancelChop();cancelSearch();
    if(kind==='shower'){
      // Enter through the open southern edge; actual position stays collision-safe.
      if(!worldCollision(955,195,player.radius,'bunker')){player.x=955;player.y=195;}
    }
    mode=kind;anchor={x:player.x,y:player.y};elapsed=0;lastSave=0;
    player.moving=false;player.running=false;firing=false;
    refresh();queueGameSave();return true;
  }
  function tick(ms){
    const near=scene==='bunker'&&Math.hypot(player.x-1029,player.y-104)<105;
    const broken=window.V018Build?.isBroken(BATH_DOOR.id);if(broken)doorProgress=1;
    const open=broken||doorManual||near,was=doorProgress>.9;
    doorProgress=clamp(doorProgress+(open?1:-1)*clamp(Number(ms)||0,0,100)/360,0,1);
    if(was!==(doorProgress>.9))invalidateGeometry();
    if(!mode){refresh();return;}
    if(playerDead||scene!=='bunker'||document.hidden||movePower>JOY_DEAD||navigation||!anchor||distance(player.x,player.y,anchor.x,anchor.y)>.6){stop();return;}
    // Only simulated foreground time counts; suspend/reload never grants free HP.
    const dt=clamp(Number(ms)||0,0,100)/1000;elapsed+=dt;lastSave+=dt;
    if(mode==='rest'){
      player.health=Math.min(player.maxHealth,player.health+dt);
      const h=el('healthText');if(h)h.textContent='❤️ '+Math.round(player.health)+'/'+Math.round(player.maxHealth);
    }else{
      dirt=Math.max(0,dirt-dt*.05);
      if(dirt===0&&elapsed>=4){stop();message('Одежда чистая');return;}
    }
    if(lastSave>=3){lastSave=0;queueGameSave();}
    refresh();
  }
  const oldSolid=solidObjects;
  solidObjects=function(which){
    const list=oldSolid(which);if(which!=='bunker')return list;
    const removed=new Set(['wardrobe','nightstand','bed','dresser','bath_wall1','bath_wall2','toilet','shower']);
    return list.filter(o=>!removed.has(o.id)).concat(fixtures,doorProgress>.9?[]:[BATH_DOOR]);
  };
  invalidateGeometry();
  const oldObjects=interactionObjects;
  interactionObjects=function(which=scene){const list=oldObjects(which);return which==='bunker'?list.concat([{...BED,name:mode==='rest'?'Встать':'Отдыхать'},{...SHOWER,name:mode==='shower'?'Выключить душ':'Принять душ'},{...BATH_DOOR,name:doorManual?'Закрыть дверь санузла':'Открыть дверь санузла'}]):list;};
  const oldExecute=executeInteraction;
  executeInteraction=function(target){
    if(target?.kind==='living_bath_door'){if(!menuOpen&&!playerDead&&canInteract(target,player.x,player.y))doorManual=!doorManual;return;}
    if(target?.kind==='living_bed'||target?.kind==='living_shower'){
      if(!menuOpen&&!playerDead&&canInteract(target,player.x,player.y))start(target.kind==='living_bed'?'rest':'shower');return;
    }
    if(mode)stop();return oldExecute(target);
  };
  const oldApproach=approachPoint;approachPoint=function(...args){stop();return oldApproach(...args);};
  const oldApproachObject=approachObject;approachObject=function(...args){stop();return oldApproachObject(...args);};
  const oldJoystick=beginJoystick;beginJoystick=function(e){if(mode&&joystickAt(e.clientX,e.clientY)==='left')stop();return oldJoystick(e);};
  const oldShoot=shoot;shoot=function(...args){if(mode)stop();return oldShoot(...args);};
  const oldDamage=damagePlayer;damagePlayer=function(...args){
    const hp=player.health;stop();const result=oldDamage(...args);
    if(player.health<hp){dirt=clamp(dirt+.075+(hp-player.health)*.004,0,1);queueGameSave();}return result;
  };
  const oldUpdate=update;update=function(){oldUpdate();tick(16.667*frameScale);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);window.addEventListener('blur',stop);
  const oldCapture=captureGameProgress,oldDecode=decodeGameProgress,oldRestore=restoreGameProgress;
  captureGameProgress=function(){const d=oldCapture();d.living011={schema:1,dirt};return d;};
  decodeGameProgress=function(raw){const d=oldDecode(raw),l=d.living011;if(l!==undefined&&(!l||l.schema!==1||!Number.isFinite(l.dirt)||l.dirt<0||l.dirt>1))throw Error('Некорректное состояние жилой комнаты');return d;};
  restoreGameProgress=function(d){mode=null;anchor=null;elapsed=0;dirt=clamp(d.living011?.dirt??0,0,1);oldRestore(d);refresh();};
  const oldRespawn=respawn;respawn=function(...args){stop();dirt=0;return oldRespawn(...args);};
  function box(x,y,w,h,color,r=4,stroke){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke();}}
  function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
  function shadow(x,y,w,h){if(window.V011Rooms?.shadow){V011Rooms.shadow(x,y,w,h,14,'room7');return;}box(x+6,y+7,w,h,'rgba(0,0,0,.23)',7);}
  function art(key,x,y,w,h){return !!window.V011Art?.draw?.(key,x,y,w,h);}
  function drawRoom(){
    ctx.save();
    // Furnishings are top-down and share their existing physical footprints.
    box(1000,-95,183,100,'#817969',6);box(1006,-89,171,88,'#a59b8350',4);
    for(let y=-83;y<-2;y+=9)line([[1012,y],[1171,y]],'#d3c7a51b',1);
    shadow(885,-205,155,64);
    // Code-native overhead wardrobe replaces the incompatible front-view icon.
    {const g=ctx.createLinearGradient(885,-205,1040,-141);g.addColorStop(0,'#9ba89d');g.addColorStop(.3,'#71837c');g.addColorStop(1,'#3b5353');box(885,-205,155,64,g,5,'#afbbb0');
      box(891,-199,143,48,'#6f8278',3,'#a4b4a0');line([[895,-147],[1030,-147]],'#293d3c',3);line([[962,-151],[962,-141]],'#2e4641',2);
      for(const x of [945,973])box(x,-147,12,3,'#d2cbb2',1);for(const x of [897,1027])box(x,-195,3,3,'#c4c9b7',1);line([[892,-198],[1032,-198]],'#d4dac180',1.5);
    }
    ctx.save();ctx.translate(1110,-195);ctx.scale(58/82,58/62);ctx.translate(-1080,190);
    shadow(1080,-190,82,62);box(1080,-190,82,62,'#726349',5,'#bba98a');box(1086,-184,70,46,'#9b8763',3);box(1110,-142,23,3,'#d4c5a6',1);
    // Folded book and a small clean bedside clock.
    box(1091,-175,26,33,'#425e5c',2);line([[1095,-175],[1095,-142]],'#76988d',1);box(1125,-175,26,17,'#233437',3,'#728f87');box(1131,-170,14,5,'#94c6ac',1);
    ctx.restore();shadow(BED.x,BED.y,BED.w,BED.h);
    if(!art('bed',BED.x,BED.y,BED.w,BED.h)){
      ctx.save();ctx.translate(BED.x,BED.y);ctx.scale(BED.w/95,BED.h/225);ctx.translate(-1240,205);
      box(1240,-205,95,225,'#43524e',7,'#8d9a8f');box(1247,-198,81,206,'#c0c9ba',7);
      box(1253,-192,69,49,'#e5e8dc',9,'#f6f6e8');box(1257,-188,61,40,'#d8ded0',8);
      const duvet=ctx.createLinearGradient(1250,-136,1324,0);duvet.addColorStop(0,'#6e9990');duvet.addColorStop(.5,'#47766e');duvet.addColorStop(1,'#2e5753');box(1250,-133,75,133,duvet,6,'#8bb0a0');
      for(let y=-117;y<-8;y+=28)line([[1256,y],[1319,y+3]],'#aed2ba28',1.8);line([[1255,-126],[1319,-126]],'#adccba',3);
      box(1242,-205,91,10,'#4e655d',3);box(1244,7,87,10,'#384d47',3);ctx.restore();
    }
    // Small bathroom is below the entry axis, with an unobstructed north door.
    for(const pts of [[[901,245],[901,102],[990,102]],[[1068,102],[1134,102],[1134,245]]]){line(pts,'#35474a',7);line(pts,'#9aaea6',3);}
    if(!window.V018Build?.isBroken(BATH_DOOR.id)){box(990,97,78,10,'#324a4a',1);ctx.save();ctx.beginPath();ctx.rect(901,97,167,10);ctx.clip();box(990-78*doorProgress,100,78,4,'#a1bab0',1,'#d1dfcb');box(1052-78*doorProgress,100,7,3,'#cbb482',1);ctx.restore();}
    shadow(1075,163,35,70);
    if(!art('toilet',1075,163,35,70)){
      ctx.save();ctx.translate(1075,163);ctx.scale(35/62,70/105);ctx.translate(-930,-130);
      box(939,134,44,31,'#d7e4dc',7,'#edf1e6');box(953,144,17,6,'#94aaa5',2);
      ctx.fillStyle='#dce8de';ctx.beginPath();ctx.ellipse(961,186,24,35,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#839b96';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#657f7d';ctx.beginPath();ctx.ellipse(961,184,16,23,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#abc7c0';ctx.beginPath();ctx.ellipse(961,186,11,17,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    if(!art('shower',SHOWER.x,SHOWER.y,SHOWER.w,SHOWER.h)){
      ctx.save();ctx.translate(SHOWER.x,SHOWER.y);ctx.scale(SHOWER.w/74,SHOWER.h/130);ctx.translate(-1028,-92);
      box(1028,92,74,130,'#b9cbc5',4,'#e3eae0');box(1034,99,62,117,'#7d9995',2);
      for(let y=100;y<214;y+=23)line([[1035,y],[1095,y]],'#d7e3d64a',1);
      for(let x=1035;x<1095;x+=20)line([[x,100],[x,214]],'#d7e3d64a',1);
      box(1058,199,15,11,'#566e6c',2,'#b2c7c1');for(let x=1061;x<1071;x+=3)line([[x,201],[x,208]],'#d8e5de',1);
      line([[1030,197],[1030,95],[1100,95],[1100,220]],'#c2e0d49c',3);
      box(1050,99,31,13,'#506c6a',4,'#d9e7de');box(1061,112,9,10,'#91b5ad',2);ctx.restore();
    }
    // Wall towel rail, folded linen and small mirror occupy no walking space.
    line([[920,117],[968,117]],'#c4d2be',2);box(928,116,17,23,'#c5d8c7',2);box(950,116,12,19,'#779d91',2);
    shadow(1083,117,36,29);box(1083,117,36,29,'#afc0b9',4,'#e1e8df');box(1087,122,28,19,'#e5e9dc',6);box(1091,125,20,13,'#8ca9a5',5);box(1098,119,6,10,'#4e7070',2,'#d6e3d5');ctx.fillStyle='#d8eee7';ctx.beginPath();ctx.arc(1101,132,2,0,Math.PI*2);ctx.fill();
    shadow(1190,116,145,105);
    const deskArt=art('desk',1190,116,145,105);
    if(!deskArt){
      box(1190,125,145,92,'#4b514a',6,'#9ea48e');const wood=ctx.createLinearGradient(1196,131,1329,211);wood.addColorStop(0,'#a59b7c');wood.addColorStop(1,'#726f58');box(1196,131,133,78,wood,4);
      for(let y=136;y<209;y+=10)line([[1200,y],[1324,y+1]],'#d3c8a529',1);
    }
    // The generated desk already includes its laptop, mug, notebook and lamp.
    // Native accessories belong only to the loading/fallback rendering.
    if(!deskArt){
    box(1223,139,68,35,'#23393c',4,'#9dac9d');box(1228,144,58,25,'#36656b',2);
    line([[1233,163],[1243,154],[1251,159],[1263,149],[1280,151]],'#8fcac4',1.3);
    box(1221,175,72,29,'#899e97',3,'#d6ded0');for(let y=180;y<191;y+=5)for(let x=1226;x<1288;x+=6)box(x,y,4,3,'#405b58',.5);box(1248,193,18,8,'#597970',1);
    box(1300,164,18,24,'#ced5bd',2);line([[1304,166],[1304,185]],'#879e89',1);ctx.fillStyle='#c0d5bb';ctx.beginPath();ctx.arc(1308,197,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b7569';ctx.beginPath();ctx.arc(1308,197,4,0,Math.PI*2);ctx.fill();
    const lampX=1310,lampY=143;
    ctx.fillStyle='#384e4d';ctx.beginPath();ctx.arc(lampX,lampY,10,0,Math.PI*2);ctx.fill();line([[lampX,lampY],[lampX-13,lampY-13]],'#92a79a',4);box(lampX-23,lampY-19,21,12,'#c9ccac',4,'#e9e5c4');
    }
    // A separate chair, with a shaped seat, backrest and metal side supports.
    shadow(1240,224,45,25);box(1244,224,37,21,'#4c6b64',6,'#95aea0');box(1240,242,45,7,'#324f4c',3,'#9aae9f');line([[1243,229],[1243,242]],'#bcc6b4',2);line([[1282,229],[1282,242]],'#bcc6b4',2);
    const lampX=deskArt?1235:1297,lampY=deskArt?159:149;
    ctx.save();if(deskArt){ctx.beginPath();ctx.rect(1195,148,135,51);ctx.clip();}
    const glow=ctx.createRadialGradient(lampX,lampY,2,lampX,lampY,45);glow.addColorStop(0,'rgba(255,222,151,.08)');glow.addColorStop(1,'rgba(255,222,151,0)');ctx.fillStyle=glow;ctx.fillRect(1190,125,145,92);ctx.restore();
    ctx.restore();
  }
  function stains(){
    if(dirt<=.015)return;
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(Math.atan2(player.aimY,player.aimX));ctx.globalAlpha=Math.min(.8,dirt*.82);
    ctx.fillStyle='#733d32';for(const [x,y,r] of [[-5,-8,3],[8,9,2.3],[-11,4,2.7],[3,-11,1.6],[-4,10,2]]){ctx.beginPath();ctx.ellipse(x,y,r,r*.65,.35,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function drawRest(){
    ctx.save();ctx.translate(BED.x,BED.y);ctx.scale(BED.w/95,BED.h/225);ctx.translate(-1240,205);const breath=Math.sin(performance.now()/1150)*.45;
    ctx.fillStyle='#273e38';ctx.beginPath();ctx.ellipse(1287,-88,22+breath,43,0,0,Math.PI*2);ctx.fill();
    box(1269,-57,14,45,'#354f43',5);box(1290,-57,14,45,'#354f43',5);ctx.fillStyle='#bf9e7c';ctx.beginPath();ctx.arc(1287,-142,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#484337';ctx.beginPath();ctx.arc(1287,-146,11,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(171,207,192,.08)';ctx.beginPath();ctx.ellipse(1287,-62,35,52,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function showerDrops(){
    if(mode!=='shower'||scene!=='bunker')return;
    ctx.save();ctx.translate(SHOWER.x,SHOWER.y);ctx.scale(SHOWER.w/74,SHOWER.h/130);ctx.translate(-1028,-92);ctx.beginPath();ctx.rect(1035,105,60,109);ctx.clip();
    const now=performance.now()/1000;
    for(let i=0;i<22;i++){
      const phase=(now*1.4+i*.137)%1,x=1040+(i*17%49),y=112+phase*90;
      ctx.globalAlpha=.18+Math.sin(phase*Math.PI)*.55;line([[1065+(x-1065)*.3,115],[x,y]],'#bfe9e5',.8);
      ctx.fillStyle='#e0fff2';ctx.beginPath();ctx.ellipse(x,y,1,2.5,0,0,Math.PI*2);ctx.fill();
      if(phase>.75){ctx.globalAlpha=(1-phase)*1.4;ctx.strokeStyle='#b4e7db';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x,y,(phase-.75)*17,(phase-.75)*8,0,0,Math.PI*2);ctx.stroke();}
    }
    ctx.restore();
  }
  const oldDrawPlayer=drawPlayer;drawPlayer=function(){if(mode==='rest'&&scene==='bunker')drawRest();else{oldDrawPlayer();stains();}showerDrops();};
  return {drawRoom,start,stop,tick,state:()=>({dirt,mode,elapsed,doorProgress}),bed:BED,shower:SHOWER,fixtures,bathDoor:BATH_DOOR};
})();

