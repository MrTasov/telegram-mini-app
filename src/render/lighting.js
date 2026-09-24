/* 0.16: one bounded darkness mask; existing power circuits and light geometry. */
window.V016Lighting=(()=>{
  const dayMs=WorldClock.dayMs,TAU=Math.PI*2;
  let saveElapsed=0,mask=null,maskContext=null;
  let fixturesCache=null,shadowRevision='',droneKey='',droneShape=null,droneLayer=null,droneSolidsKey='',droneSolids=[];
  const droneMetrics={updates:0,candidateScans:0,rayCasts:0,lastX:0,lastY:0};
  const shadowShapes=new Map(),roomMasks=new Map(),sprites=new Map();
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function daylight(){const minute=WorldClock.minute;return smooth((minute-300)/180)*(1-smooth((minute-1020)/180));}
  const capture=WorldClock.capture,validate=WorldClock.validate;
  function hud(){window.GameHUD?.refreshClock();}
  function restore(d){WorldClock.restore(d);saveElapsed=0;shadowShapes.clear();droneKey='';hud();}
  function tick(ms){if(document.hidden||playerDead)return;const dt=WorldClock.advance(ms);saveElapsed+=dt;if(saveElapsed>=15000){saveElapsed%=15000;queueGameSave();}hud();}
  WorldEvents.onChange(hud);
  // Existing left/right yard circuits retain their save IDs, priority, battery
  // fallback and switches. Each supplies ten wall lamps and four floods.
  for(const id of ['spot_left','spot_right']){const d=V09Power.devices[id];if(d){d.watts=.95;d.name=id==='spot_left'?'Освещение периметра · левая линия':'Освещение периметра · правая линия';d.active=()=>daylight()<.995;}}
  const supplied=()=>V09Power.allocation().served;
  function active(s,served=supplied()){return !!(s.wall?.hp>0&&served.has(s.device)&&daylight()<.995);}
  function fixtures(){
    if(fixturesCache)return fixturesCache;const a=[],base=window.V015Base;if(!base)return a;
    for(const side of ['N','E','S','W'])for(const [i,along]of (side==='N'||side==='S'?[370,650,950,1230]:[300,500,700,900]).entries()){
      const x=side==='W'?246:side==='E'?1354:along,y=side==='N'?206:side==='S'?994:along;
      const px=side==='W'?190:side==='E'?1410:x,py=side==='N'?150:side==='S'?1050:y;
      const wall=base.sections.find(o=>V020Walls.perimeter(o)&&px>=o.x&&px<=o.x+o.w&&py>=o.y&&py<=o.y+o.h);
      const nx=side==='W'?1:side==='E'?-1:0,ny=side==='N'?1:side==='S'?-1:0;
      a.push({id:'lamp020_'+side+'_'+i,kind:'wall',wall,x,y,height:3.8,angle:Math.atan2(ny,nx),range:330,device:x<800?'spot_left':'spot_right'});
    }
    for(const [id,x,y,angle]of [['v015commandNL',680,456,Math.PI/2],['v015commandNR',920,456,Math.PI/2],['v015commandSL',680,724,-Math.PI/2],['v015commandSR',920,724,-Math.PI/2]])a.push({id:'lamp016_'+id,kind:'wall',wall:base.byId.get(id),x,y,height:3.8,angle,range:290,device:x<800?'spot_left':'spot_right'});
    const corners=[['NW',190,94,-Math.PI/2,'v091wall020_corner_NW'],['NW',134,150,Math.PI,'v091wall020_corner_NW'],
      ['NE',1410,94,-Math.PI/2,'v091wall020_corner_NE'],['NE',1466,150,0,'v091wall020_corner_NE'],
      ['SW',190,1106,Math.PI/2,'v091wall020_corner_SW'],['SW',134,1050,Math.PI,'v091wall020_corner_SW'],
      ['SE',1410,1106,Math.PI/2,'v091wall020_corner_SE'],['SE',1466,1050,0,'v091wall020_corner_SE']];
    for(let i=0;i<corners.length;i++){const [corner,x,y,angle,id]=corners[i];a.push({id:'flood016_'+corner+'_'+i%2,kind:'flood',corner,wall:base.byId.get(id),x,y,angle,range:640,device:x<800?'spot_left':'spot_right'});}
    fixturesCache=a;return a;
  }
  function canvasOf(w,h){const v=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');v.width=w;v.height=h;return v;}
  function buffer(){const w=Math.max(1,Math.ceil(screenWidth)),h=Math.max(1,Math.ceil(screenHeight));if(!mask){mask=canvasOf(w,h);maskContext=mask.getContext('2d');}if(mask.width!==w)mask.width=w;if(mask.height!==h)mask.height=h;return maskContext;}
  function sprite(kind){
    if(sprites.has(kind))return sprites.get(kind);const v=canvasOf(256,256),c=v.getContext('2d');
    if(kind==='flashlight'){
      // Bake the angular and radial falloff once. A single clipped blit then
      // replaces sixteen full-radius blends per frame, with no extra buffer.
      const pixels=c.createImageData(256,256),half=V091Light.halfAngle;
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        const dx=x+.5-128,dy=y+.5-128,r=Math.hypot(dx,dy)/128,a=Math.abs(Math.atan2(dy,dx)),i=(y*256+x)*4;
        const radial=r<=.77?1:r<=.92?1-(r-.77)/.15*(1-189/255):Math.max(0,(1-r)/.08)*(189/255);
        const angular=a>=half?0:Math.cos(a/half*Math.PI/2)**2;
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(255*.997*radial*angular);
      }
      c.putImageData(pixels,0,0);sprites.set(kind,v);return v;
    }
    const g=c.createRadialGradient(128,128,0,128,128,128);
    const stops=kind==='warm'?[[0,'#ffe7b544'],[.2,'#ffe7b525'],[.65,'#ffe7b510'],[1,'#ffe7b500']]:kind==='drone'?[[0,'#ffffffff'],[.28,'#fffffffc'],[.6,'#ffffffce'],[.84,'#ffffff52'],[1,'#ffffff00']]:kind==='flood'?[[0,'#ffffffff'],[.3,'#ffffffff'],[.6,'#ffffffdf'],[.84,'#ffffff70'],[1,'#ffffff00']]:[[0,'#fffffffc'],[.15,'#fffffff0'],[.45,'#ffffffad'],[.76,'#ffffff42'],[1,'#ffffff00']];
    for(const [at,color]of stops)g.addColorStop(at,color);c.fillStyle=g;c.fillRect(0,0,256,256);sprites.set(kind,v);return v;
  }
  function disc(c,kind,x,y,radius){const m=c.getTransform();c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(sprite(kind),(x-radius)*m.a+m.e,(y-radius)*m.d+m.f,radius*2*m.a,radius*2*m.d);c.restore();}
  function nearSolids(x,y,range,which=scene){const g=geometryFor(which);let all=which==='surface'?[...g.walls,...g.objects]:[...g.objects,...V091Navigation.walls,...v09Doors.filter(d=>BunkerLayout.roomActive(d.room)).flatMap(v09DoorPanels)];
    return all.filter(o=>o.r!==undefined?Math.hypot(o.x-x,o.y-y)<range+o.r:o.x<x+range&&o.x+o.w>x-range&&o.y<y+range&&o.y+o.h>y-range);
  }
  function shape(s,dynamic=false){
    const revision=[scene,geometryRevision,gateOpen,V091Fortress.innerGateOpen,...v09Doors.map(d=>Math.round(d.open*20))].join('|');
    if(revision!==shadowRevision){shadowShapes.clear();shadowRevision=revision;droneKey='';}
    const key=dynamic?[revision,Math.round(s.x/2),Math.round(s.y/2),s.range].join(':'):s.id;
    if(dynamic&&key===droneKey)return droneShape;if(!dynamic&&shadowShapes.has(key))return shadowShapes.get(key);
    const solids=nearSolids(s.x,s.y,s.range).filter(o=>o.id!==s.instanceId&&!(scene==='surface'&&s.kind==='wall'&&(o.kind==='baseDecor015'||String(o.id).startsWith('v015prop_')||o.id==='well09'))),points=[],half=s.kind==='flood'?.85:Math.PI,n=s.kind==='flood'?40:64;
    for(let i=0;i<=n;i++){const angle=s.angle-half+2*half*i/n;points.push(V091Light.cast(s.x,s.y,angle,s.range,solids));}
    const result={x:s.x,y:s.y,points};if(dynamic){droneKey=key;droneShape=result;}else shadowShapes.set(key,result);return result;
  }
  function clipShape(c,s,dynamic=false){const p=shape(s,dynamic);c.beginPath();c.moveTo(p.x,p.y);for(const v of p.points)c.lineTo(v.x,v.y);c.closePath();c.clip();}
  // A moving radial light needs continuous body silhouettes, not quantized
  // angular samples. Each convex body and its projected far corners form one
  // shadow polygon. A bounded raster is reused; candidate geometry is cached
  // by spatial cell and invalidated for actual (unrounded) door movement.
  function hull(points){
    points.sort((a,b)=>a.x-b.x||a.y-b.y);const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),a=[],b=[];
    for(const p of points){while(a.length>1&&cross(a.at(-2),a.at(-1),p)<=0)a.pop();a.push(p);}
    for(let i=points.length-1;i>=0;i--){const p=points[i];while(b.length>1&&cross(b.at(-2),b.at(-1),p)<=0)b.pop();b.push(p);}
    a.pop();b.pop();return a.concat(b);
  }
  function droneField(s){
    const revision=[scene,geometryRevision,gateOpen,V091Fortress.innerGateOpen,...v09Doors.map(d=>d.open),V011Living.bathDoor.open].join('|');
    // Around 1.5 screen pixels per texel, bilinearly filtered. Zooming out must
    // not pay for a 512px texture that is displayed at only a few hundred pixels.
    const size=clamp(Math.ceil(s.range*2*V010Camera.zoom/96)*64,128,512);
    const key=[revision,s.x,s.y,s.range,size].join(':');if(droneLayer&&key===droneKey)return droneLayer;
    const cx=Math.floor(s.x/96)*96+48,cy=Math.floor(s.y/96)*96+48,nearKey=[revision,cx,cy,s.range].join(':');
    if(nearKey!==droneSolidsKey){droneSolids=nearSolids(cx,cy,s.range+70);droneSolidsKey=nearKey;droneMetrics.candidateScans++;}
    if(!droneLayer)droneLayer=canvasOf(size,size);else if(droneLayer.width!==size){droneLayer.width=size;droneLayer.height=size;}const c=droneLayer.getContext('2d'),scale=size/(s.range*2);
    c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.clearRect(0,0,size,size);c.drawImage(sprite('drone'),0,0,size,size);
    // All hulls have the same winding: one nonzero fill forms their union,
    // including overlapping shadows, without a separate blend for every body.
    c.globalCompositeOperation='destination-out';c.fillStyle='#fff';c.beginPath();
    for(const o of droneSolids){
      let points;
      if(o.r!==undefined){const dx=o.x-s.x,dy=o.y-s.y,d=Math.hypot(dx,dy);if(d<=o.r){c.clearRect(0,0,size,size);break;}const angle=Math.atan2(dy,dx),a=Math.acos(o.r/d);points=[angle-a,angle+a].map(q=>({x:o.x-o.r*Math.cos(q),y:o.y-o.r*Math.sin(q)}));}
      else {if(s.x>o.x&&s.x<o.x+o.w&&s.y>o.y&&s.y<o.y+o.h){c.clearRect(0,0,size,size);break;}points=[{x:o.x,y:o.y},{x:o.x+o.w,y:o.y},{x:o.x+o.w,y:o.y+o.h},{x:o.x,y:o.y+o.h}];}
      const projected=points.map(p=>{const dx=p.x-s.x,dy=p.y-s.y,k=1+s.range*3/Math.max(1,Math.hypot(dx,dy));return{x:s.x+dx*k,y:s.y+dy*k};}),polygon=hull(points.concat(projected));
      for(let i=0;i<polygon.length;i++){const p=polygon[i],x=size/2+(p.x-s.x)*scale,y=size/2+(p.y-s.y)*scale;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();
    }
    c.fill();c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';droneKey=key;droneShape={x:s.x,y:s.y};droneMetrics.updates++;droneMetrics.lastX=s.x;droneMetrics.lastY=s.y;return droneLayer;
  }
  function paintFixture(c,s,kind='white'){c.save();clipShape(c,s);if(s.kind==='flood'){
      // Both ovals fit wholly inside the cast sector: the broad wash has a
      // tangent half-angle of .819 < .85 and ends before the cast range.
      // Thus angular clipping cannot cut across a bright part of the wash.
      // Cardinal fixtures need no bitmap rotation. Project each oval into
      // pixels after the world-space clip; this also avoids runtimes that
      // crop a rotated image at negative local coordinates before mapping it.
      const nx=Math.round(Math.cos(s.angle)),ny=Math.round(Math.sin(s.angle)),m=c.getTransform();
      function oval(start,length,halfWidth){const cx=s.x+nx*(start+length/2)*s.range,cy=s.y+ny*(start+length/2)*s.range,w=(nx?length:halfWidth*2)*s.range,h=(nx?halfWidth*2:length)*s.range;c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(sprite(kind),(cx-w/2)*m.a+m.e,(cy-h/2)*m.d+m.f,w*m.a,h*m.d);c.restore();}
      oval(.08,.91,.30);oval(.012,.054,.018);
    }else c.drawImage(sprite(kind),s.x-s.range,s.y-s.range,s.range*2,s.range*2);c.restore();}
  function drawFixtures(hardware){if(scene!=='surface')return;const served=supplied(),night=1-daylight();for(const s of fixtures()){
    if(s.wall?.hp<=0||!visibleOnScreen(s.x,s.y,s.range+35))continue;const on=active(s,served);
    if(!hardware){if(on){ctx.save();ctx.globalAlpha=night*.85;paintFixture(ctx,s,'warm');ctx.restore();}continue;}
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);const big=s.kind==='flood';ctx.fillStyle='#101e2670';ctx.fillRect(-10,3,big?30:18,big?25:13);
    ctx.strokeStyle='#53676b';ctx.lineWidth=big?4:3;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(big?5:0,0);ctx.stroke();ctx.fillStyle='#34474e';ctx.strokeStyle='#97a7a6';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(big?-3:-7,big?-15:-9,big?24:14,big?30:18,3);ctx.fill();ctx.stroke();
    ctx.fillStyle=on?'#ffe7b0':'#86928a';ctx.fillRect(big?14:3,big?-11:-6,big?5:3,big?22:12);if(big){ctx.strokeStyle='#1b2b35';ctx.lineWidth=1;for(const y of [-7,0,7]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(11,y);ctx.stroke();}}
    ctx.restore();
  }}
  function roomMask(room,r,on){const key=room+':'+Number(on);if(roomMasks.has(key))return roomMasks.get(key);
    const scale=.5,w=Math.max(1,Math.ceil((r.right-r.left-18)*scale)),h=Math.max(1,Math.ceil((r.bottom-r.top-18)*scale)),v=canvasOf(w,h),c=v.getContext('2d');c.fillStyle=on?'rgba(3,10,18,.28)':'rgba(2,7,15,.82)';c.fillRect(0,0,w,h);
    if(on){c.globalCompositeOperation='destination-out';const radius=(room==='farm'?385:room==='corridor'?340:360)*scale;for(const p of V011Rooms.lights(room)){const x=(p.x-r.left-9)*scale,y=(p.y-r.top-9)*scale,g=c.createRadialGradient(x,y,0,x,y,radius);for(const [at,a]of [[0,.99],[.14,.94],[.4,.65],[.72,.24],[1,0]])g.addColorStop(at,'rgba(255,255,255,'+a+')');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);}}
    roomMasks.set(key,v);return v;
  }
  function bunkerMask(c,served){c.fillStyle='rgba(2,5,12,.63)';const view=V010Camera.view();c.fillRect(camera.x,camera.y,view.w,view.h);for(const room of Object.keys(V09Power.rooms)){const r=bunker[room];if(!BunkerLayout.roomActive(room)||!r||!visibleOnScreen((r.left+r.right)/2,(r.top+r.bottom)/2,Math.hypot(r.right-r.left,r.bottom-r.top)/2))continue;c.clearRect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);c.drawImage(roomMask(room,r,served.has('light_'+room)),r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);}
    for(const id of GameEquipment.productionIds)if(GameEquipment.present(id)&&GameEquipment.recipeStation(id)==='furnace'&&V09Craft.visualState(id).working){c.save();const r=bunker[GameEquipment.get(id).transform.room],center=GameEquipment.point(id,65,84),p={x:center.x-170,y:center.y-170};c.beginPath();c.rect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);c.clip();c.globalCompositeOperation='destination-out';c.globalAlpha=.9;c.drawImage(sprite('white'),p.x,p.y,340,340);c.restore();}}
  function doorLeaks(served=supplied()){
    if(scene!=='bunker')return [];const hall=served.has('light_corridor'),out=[];
    for(const d of v09Doors){const open=window.V018Build?.isBroken(d.id)?1:d.open;if(!BunkerLayout.roomActive(d.room)||open<=.001)continue;const lit=served.has('light_'+d.room);if(lit===hall)continue;
      const room=BunkerLayout.rooms[d.room],into=hall?1:-1,nx=d.horizontal?0:(room.side==='left'?-1:1)*into,ny=d.horizontal?into:0;
      out.push({id:d.id,x:d.x+d.w/2,y:d.y+d.h/2,nx,ny,opening:(d.horizontal?d.w:d.h)*open,alpha:.28*smooth(open),room:hall?room:BunkerLayout.rooms.corridor});
    }return out;
  }
  function portalLight(c,served){for(const p of doorLeaks(served)){
    const r=p.room,half=p.opening/2,depth=155,spread=half+32,tx=-p.ny,ty=p.nx;c.save();c.beginPath();c.rect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);c.clip();
    c.beginPath();c.moveTo(p.x-tx*half,p.y-ty*half);c.lineTo(p.x+tx*half,p.y+ty*half);c.lineTo(p.x+p.nx*depth+tx*spread,p.y+p.ny*depth+ty*spread);c.lineTo(p.x+p.nx*depth-tx*spread,p.y+p.ny*depth-ty*spread);c.closePath();c.clip();
    c.globalCompositeOperation='destination-out';c.globalAlpha=p.alpha;disc(c,'white',p.x,p.y,depth);c.restore();
  }}
  function localBounce(c,b){if(!b)return;c.save();c.globalCompositeOperation='destination-out';c.globalAlpha=.23*b.strength;c.beginPath();c.moveTo(b.x,b.y);for(const p of b.points)c.lineTo(p.x,p.y);c.closePath();c.clip();disc(c,'white',b.x,b.y,b.radius);c.restore();
    // A shallow highlight on the struck face; it cannot illuminate behind it.
    c.save();c.globalCompositeOperation='destination-out';c.globalAlpha=.58*b.strength;c.translate(b.contact.x,b.contact.y);c.rotate(Math.atan2(b.ny,b.nx));c.beginPath();c.ellipse(0,0,1.8,7+9*b.strength,0,0,TAU);c.fillStyle='#fff';c.fill();c.restore();
  }
  function droneActive(){const s=window.V014Robots?.state;return !!(s&&s.scene===scene&&!s.packed&&s.task!=='docked'&&s.hp>0&&s.battery>0&&s.light&&!(s.economy&&s.battery<20));}
  function flashlight(c,beam){if(!beam)return;c.save();c.globalCompositeOperation='destination-out';
    c.beginPath();c.moveTo(beam.ox,beam.oy);for(const p of beam.points)c.lineTo(p.x,p.y);c.closePath();c.clip();
    const m=c.getTransform(),co=Math.cos(beam.angle),si=Math.sin(beam.angle),r=beam.range;
    // Positive bitmap-local coordinates avoid native Canvas image culling
    // before the world-to-mask transform, including all diagonal aim angles.
    const scale=r/128;c.setTransform(m.a*co*scale,m.d*si*scale,-m.a*si*scale,m.d*co*scale,(beam.ox-r*co+r*si)*m.a+m.e,(beam.oy-r*si-r*co)*m.d+m.f);
    c.drawImage(sprite('flashlight'),0,0);c.restore();}
  function illuminate(){
    const c=buffer(),zoom=V010Camera.zoom,view=V010Camera.view(),served=supplied();c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.clearRect(0,0,mask.width,mask.height);c.setTransform(zoom,0,0,zoom,-camera.x*zoom,-camera.y*zoom);
    if(scene==='bunker'){bunkerMask(c,served);portalLight(c,served);c.save();c.globalCompositeOperation='destination-out';for(const r of GameEquipment.records)if(r.typeId==='base_lamp'&&r.placement==='installed'&&served.has(r.refs.device)){const p=GameEquipment.center(r.id);if(visibleOnScreen(p.x,p.y,190))paintFixture(c,{id:r.id,instanceId:r.id,...p,range:170,angle:0,kind:'radial'},'white');}c.restore();}else{const dark=(1-daylight())*.64;c.fillStyle='rgba(6,15,31,'+dark+')';c.fillRect(camera.x,camera.y,view.w,view.h);if(dark>.001){c.save();c.globalCompositeOperation='destination-out';for(const s of fixtures())if(active(s,served)&&visibleOnScreen(s.x,s.y,s.range+20))paintFixture(c,s,s.kind==='flood'?'flood':'white');c.restore();}}
    const beam=V091Light.cone();flashlight(c,beam);localBounce(c,beam?.bounce);if(droneActive()){const d=V014Robots.state,s={x:d.x,y:d.y,range:275,angle:0,kind:'drone'};c.save();c.globalCompositeOperation='destination-out';c.setTransform(1,0,0,1,0,0);c.drawImage(droneField(s),(s.x-s.range-camera.x)*zoom,(s.y-s.range-camera.y)*zoom,s.range*2*zoom,s.range*2*zoom);c.restore();}
    c.setTransform(1,0,0,1,0,0);ctx.save();try{ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(mask,camera.x,camera.y,view.w,view.h);}finally{ctx.restore();}
  }
  V091Light.illuminate=illuminate;
  const oldUpdate=update;update=function(...args){const result=oldUpdate(...args);tick(16.667*frameScale);return result;};
  GameSave.extend('capture','render.lighting',function(oldCapture){const d=oldCapture();d.lighting016=capture();return d;});
  GameSave.extend('decode','render.lighting',function(oldDecode,raw){const probe=JSON.parse(raw);validate(probe.lighting016);return oldDecode(raw);});
  GameSave.extend('restore','render.lighting',function(oldRestore,d){validate(d.lighting016);oldRestore(d);restore(d.lighting016);});
  hud();return{dayMs,capture,validate,restore,tick,daylight,fixtures,active,doorLeaks,droneActive,drawFixtures,illuminate,get day(){return WorldClock.day;},maskImage:()=>mask,droneMetrics:()=>({...droneMetrics}),cacheInfo:()=>({shadows:shadowShapes.size,shadowLimit:28,rooms:roomMasks.size,roomLimit:18,sprites:sprites.size,spriteLimit:5,droneShapes:droneShape?1:0,droneLimit:1,droneBytes:droneLayer?droneLayer.width*droneLayer.height*4:0,width:mask?.width||0,height:mask?.height||0})};
})();
