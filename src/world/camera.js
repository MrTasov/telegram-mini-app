/* Uniform world scale, smooth centered zoom; building facades provide depth without stretching geometry. */
const V010Camera=(()=>{
  let zoom=.8,targetZoom=.8,tilt=1,opacity=0,corner='right',mapOpen=false,clock=0,selected=null;
  let discovered=new Set(),known=new Set(),markers=[],goal=null,mapZoom=1,mapPan={x:800,y:3600};
  const MIN_ZOOM=.6,MAX_ZOOM=1.4,CELL=160,OPACITY=[1,.6,.3],touches=new Map();let pinch=null,suppressTouchUntil=0,wheelDirection=0;
  const mini=document.createElement('canvas');mini.id='v010Minimap';mini.width=136;mini.height=136;I18n.assign(mini,"title",'Касание: прозрачность · удержание: карта');I18n.setAttr(mini,'aria-label','Мини-карта');document.body.append(mini);
  const mc=mini.getContext('2d');
  const overlay=document.createElement('div');overlay.className='overlay';overlay.id='v010MapOverlay';
  I18n.assign(overlay,"innerHTML",'<div class="panel v010MapPanel"><div class="v010MapHead"><b>Карта местности</b><button id="v010MapClose" class="menuButton">Закрыть</button></div><canvas id="v010WorldMap"></canvas><div class="v010MapTools"><input id="v010MarkerName" maxlength="36" placeholder="Название метки"><button id="v010MapMark" class="menuButton">Поставить метку</button><button id="v010MapGoal" class="menuButton">Цель</button><button id="v010MapDelete" class="menuButton">Убрать метку</button></div><div id="v010MapHint" class="subtitle">Нажмите на карту. Колесо мыши или два пальца — масштаб.</div><div class="v010MapLegend">● вы · 🔴 зомби · зелёный △ дерево · ◆ руда · ■ постройка · голубой + объект</div></div>');
  document.body.append(overlay);const full=el('v010WorldMap'),fc=full.getContext('2d');
  const camBox=document.createElement('div');camBox.className='settingBox';I18n.assign(camBox,"innerHTML",'<div class="settingTitle">Камера и мини-карта</div><div class="v010CameraControls"><label>Масштаб <input id="v010Zoom" type="range" min="60" max="140" value="80"></label><button id="v010ViewMode" class="menuButton">Наклонный вид</button><button id="v010MapCorner" class="menuButton">Карта справа</button><button id="v010OpenMap" class="menuButton">Открыть карту</button></div>');
  el('settingsOverlay').querySelector('.panel').append(camBox);
  v09Style(`html,body{margin:0!important;padding:0!important;width:100%;height:100%;min-height:100dvh;overflow:hidden!important;background:#111915!important;border-radius:0!important}#canvas{position:fixed!important;inset:0!important;display:block!important;touch-action:none;border:0;border-radius:0!important}#v010Minimap{position:fixed;right:16px;top:150px;width:158px;height:122px;border:1px solid #b2c5a858;border-radius:12px;background:#14231d;z-index:35;touch-action:none;box-shadow:0 4px 20px #0006}#v010MapOverlay{z-index:14000}.v010MapPanel{width:min(860px,96vw);max-height:96dvh;padding:13px}.v010MapHead{display:flex;align-items:center;justify-content:space-between;gap:12px}.v010MapHead .menuButton{width:auto;margin:0;padding:6px 12px}#v010WorldMap{display:block;width:100%;height:min(65dvh,540px);margin:10px 0;background:#101c19;border-radius:8px;touch-action:none}.v010MapTools{display:flex;gap:6px;flex-wrap:wrap}.v010MapTools .menuButton{width:auto;margin:0;padding:6px 10px;font-size:11px}.v010MapTools input{min-width:100px;flex:1;background:#15262a;color:#e2eada;border:1px solid #637c6d;border-radius:5px;padding:7px}.v010MapLegend{font-size:10px;color:#a2b7a8;margin-top:7px}.v010CameraControls{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.v010CameraControls .menuButton{font-size:11px;width:auto;padding:7px;margin:0}.v010CameraControls label{font-size:12px}.v010CameraControls input{width:120px}@media(max-height:550px){#v010Minimap{top:95px;right:105px;width:132px;height:102px}.v010MapPanel{padding:8px}#v010WorldMap{height:55dvh}.v010MapLegend{display:none}}@media(max-width:500px){#v010Minimap{right:12px;top:155px;width:120px;height:93px}}`);
  function updateSettings(){mini.style.opacity=String(OPACITY[opacity]);mini.style.setProperty('left',corner==='left'?'14px':'auto','important');mini.style.setProperty('right',corner==='left'?'auto':'14px','important');el('v010Zoom').value=Math.round(targetZoom*100);I18n.assign(el('v010ViewMode'),"textContent",tilt===1?'Вид сверху':'Наклонный вид');I18n.assign(el('v010MapCorner'),"textContent",corner==='left'?'Карта слева':'Карта справа');}
  function setZoom(z){if(!Number.isFinite(z))return;targetZoom=clamp(z,MIN_ZOOM,MAX_ZOOM);updateSettings();}
  el('v010Zoom').addEventListener('input',e=>setZoom(Number(e.target.value)/100));el('v010Zoom').addEventListener('change',queueGameSave);
  el('v010ViewMode').onclick=()=>{tilt=tilt===1?.76:1;updateSettings();queueGameSave();};
  el('v010MapCorner').onclick=()=>{corner=corner==='left'?'right':'left';updateSettings();queueGameSave();};
  el('v010OpenMap').onclick=()=>showMap();el('v010MapClose').onclick=()=>{mapOpen=false;closeOverlay(overlay);};
  function showMap(){mapOpen=true;selected=null;mapPan=scene==='surface'?{x:800,y:3600}:{x:600,y:170};mapZoom=1;openOverlay(overlay);drawFull();}
  let miniDown=null,miniTimer=null;
  const MINI_HOLD_MS=1500;
  function cycleMiniOpacity(){
    if(!miniDown||miniDown.held)return;
    miniDown.held=true;opacity=(opacity+1)%OPACITY.length;
    mini.style.opacity=String(OPACITY[opacity]);queueGameSave();
  }
  function cancelMiniHold(){
    clearTimeout(miniTimer);miniTimer=null;
    const id=miniDown?.id;miniDown=null;
    if(id!==undefined){try{mini.releasePointerCapture?.(id);}catch(_){}}
  }
  function endMini(e,cancel=false){
    if(!miniDown||miniDown.id!==e.pointerId)return;
    e.preventDefault?.();e.stopPropagation?.();
    // A delayed browser timer must not turn an already completed hold into a tap.
    if(!cancel&&performance.now()-miniDown.started>=MINI_HOLD_MS)cycleMiniOpacity();
    const held=miniDown.held;cancelMiniHold();
    if(!cancel&&!held)(window.V010Camera?.showMap||showMap)();
  }
  I18n.assign(mini,"title",'Касание: большая карта · удержание 1,5 с: 100% → 60% → 30%');
  mini.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();if(miniDown)return;
    miniDown={id:e.pointerId,held:false,started:performance.now()};
    try{mini.setPointerCapture?.(e.pointerId);}catch(_){}
    miniTimer=setTimeout(()=>{if(miniDown&&!document.hidden)cycleMiniOpacity();},MINI_HOLD_MS);
  });
  mini.addEventListener('pointerup',e=>endMini(e));
  mini.addEventListener('pointercancel',e=>endMini(e,true));
  mini.addEventListener('lostpointercapture',e=>endMini(e,true));
  mini.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('blur',cancelMiniHold);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMiniHold();});
  function worldInput(e){return e.target===canvas;}
  window.addEventListener('wheel',e=>{if(!worldInput(e)||menuOpen)return;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?screenHeight:1;const delta=clamp(e.deltaY*unit,-400,400),direction=Math.sign(delta);if(direction&&wheelDirection&&direction!==wheelDirection)targetZoom=zoom;if(direction)wheelDirection=direction;setZoom(targetZoom*Math.exp(-delta*.0012));queueGameSave();},{passive:false,capture:true});
  // Joysticks are transparent overlays, so their touches also target canvas.
  // Reserve those contacts for controls before considering a map pinch.
  window.addEventListener('pointerdown',e=>{if(!GameInput.isMobile||e.pointerType!=='touch'||!worldInput(e)||menuOpen)return;if(joystickAt(e.clientX,e.clientY)||leftPointerId!==null||rightPointerId!==null)return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};stopControls(true);e.preventDefault();e.stopImmediatePropagation();}},{passive:false,capture:true});
  window.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&touches.size>=2){const [a,b]=[...touches.values()];setZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance));e.preventDefault();e.stopImmediatePropagation();}},{passive:false,capture:true});
  function endTouch(e){if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);if(pinch||performance.now()<suppressTouchUntil){e.preventDefault();e.stopImmediatePropagation();objectPointer=null;cancelNavigation();moveX=moveY=movePower=0;suppressTouchUntil=performance.now()+250;if(!touches.size){pinch=null;queueGameSave();}}}
  window.addEventListener('pointerup',endTouch,{passive:false,capture:true});window.addEventListener('pointercancel',endTouch,{passive:false,capture:true});
  function bounds(){return scene==='surface'?{x:-2800,y:-2400,w:7200,h:12000}:{x:-220,y:-1000,w:1660,h:2350};}
  const point=(x,y)=>({x:(x-camera.x)*zoom,y:(y-camera.y)*zoom});
  const inverse=(x,y)=>({x:x/zoom+camera.x,y:y/zoom+camera.y});
  function view(){return {w:screenWidth/zoom,h:screenHeight/zoom};}
  updateCamera=function(){
    const dt=clamp(16.667*frameScale,0,50),ease=1-Math.exp(-dt/95);
    if(Math.abs(targetZoom-zoom)>.000001){
      const centerX=camera.x+screenWidth/(2*zoom),centerY=camera.y+screenHeight/(2*zoom);
      zoom+= (targetZoom-zoom)*ease;if(Math.abs(targetZoom-zoom)<.00001)zoom=targetZoom;
      camera.x=centerX-screenWidth/(2*zoom);camera.y=centerY-screenHeight/(2*zoom);
    }
    const v=view(),follow=1-Math.exp(-dt/96),tx=player.x-v.w/2,ty=player.y-v.h/2;
    camera.x+=(tx-camera.x)*follow;camera.y+=(ty-camera.y)*follow;
    if(scene==='surface'){const b=bounds();camera.x=v.w>=b.w?b.x+(b.w-v.w)/2:clamp(camera.x,b.x,b.x+b.w-v.w);camera.y=v.h>=b.h?b.y+(b.h-v.h)/2:clamp(camera.y,b.y,b.y+b.h-v.h);}
  };
  visibleOnScreen=function(x,y,padding=80){const v=view();return x>=camera.x-padding&&x<=camera.x+v.w+padding&&y>=camera.y-padding&&y<=camera.y+v.h+padding;};
  function reveal(){if(scene!=='surface')return;const cx=Math.floor((player.x+1000)/CELL),cy=Math.floor(player.y/CELL);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const x=cx+dx,y=cy+dy;if(dx*dx+dy*dy<=6&&x>=-12&&x<=33&&y>=-15&&y<60)discovered.add(x+','+y);}
    const places=window.V010World?.places||[];for(const p of places){if(known.has(p.id)||Math.hypot(p.x+p.w/2-player.x,p.y+p.h/2-player.y)>350)continue;known.add(p.id);V010.emit('discover',{id:p.id,kind:p.zone||'place'});}
    for(const p of V09World.ores)if(!known.has(p.id)&&Math.hypot(p.x-player.x,p.y-player.y)<380){known.add(p.id);V010.emit('discover',{id:p.id,kind:'ore'});}
    for(const r of window.V010World?.regions||[])if(!known.has(r.id)&&Math.hypot(r.x-player.x,r.y-player.y)<r.r*.5){known.add(r.id);V010.emit('discover',{id:r.id,kind:'region'});}
  }
  function seen(x,y){return discovered.has(Math.floor((x+1000)/CELL)+','+Math.floor(y/CELL));}
  function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  function mapDraw(c,w,h,miniMode){
    c.clearRect(0,0,w,h);c.save();if(miniMode){c.beginPath();c.arc(w/2,h/2,Math.min(w,h)/2,0,Math.PI*2);c.clip();}c.fillStyle='#13221d';c.fillRect(0,0,w,h);const b=bounds();
    const scale=miniMode?(scene==='surface'?.105:.13):Math.min(w/b.w,h/b.h)*mapZoom;
    const center=miniMode?player:mapPan,ox=w/2-center.x*scale,oy=h/2-center.y*scale;
    c.save();c.translate(ox,oy);c.scale(scale,scale);
    c.fillStyle='#344536';c.fillRect(b.x,b.y,b.w,b.h);if(scene==='surface')window.V012Map?.drawRoads(c);
    if(scene==='surface'){
      c.fillStyle='#657167';c.fillRect(660,1060,285,3740);window.V015Base?.drawMap(c);
      c.fillStyle='#37656c';c.beginPath();V09World.lake.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
      for(const o of scavenges){if(!seen(o.x,o.y)||window.V011World&&!V011World.filters.buildings)continue;c.fillStyle=o.kind==='car'?'#8e9e97':'#a6997e';c.fillRect(o.x,o.y,o.w,o.h);}
      // Resource and threat markers are drawn together below for both map modes.
      const n=window.V010World?.noise;if(n&&performance.now()-n.at<1800){c.strokeStyle='#e9c08880';c.lineWidth=1/scale;c.beginPath();c.globalAlpha=Math.min(1,(1800-(performance.now()-n.at))/500);c.arc(n.followPlayer?player.x:n.x,n.followPlayer?player.y:n.y,n.radius,0,Math.PI*2);c.globalAlpha=1;c.stroke();}
    }else for(const [id,r] of Object.entries(bunker)){if(!r?.left)continue;c.fillStyle=!V09Power.roomEnabled[id]?'#2d3937':V09Power.allocation().served.has('light_'+id)?'#607566':'#746f48';c.fillRect(r.left,r.top,r.right-r.left,r.bottom-r.top);c.strokeStyle='#a0b9a8';c.lineWidth=8;c.strokeRect(r.left,r.top,r.right-r.left,r.bottom-r.top);}
    if(!miniMode)window.V0141Map?.drawRange(c,scale);window.V0105?.drawMapMarkers(c,scale,miniMode,{x:-ox/scale,y:-oy/scale,w:w/scale,h:h/scale});
    window.V014Controls?.drawRoute(c,scale);
    for(const m of markers){if(m.scene!==scene)continue;circle(c,m.x,m.y,Math.max(22,3/scale),'#ddb979');if(!miniMode){c.fillStyle='#e6dbba';c.font=`${11/scale}px Arial`;c.textAlign='center';c.fillText(m.name,m.x,m.y-30);}}
    if(goal?.scene===scene){c.strokeStyle='#e9c981';c.lineWidth=2/scale;c.beginPath();c.arc(goal.x,goal.y,Math.max(45,6/scale),0,Math.PI*2);c.stroke();}
    circle(c,player.x,player.y,Math.max(26,3.6/scale),'#f1ead1');c.strokeStyle='#f1ead1';c.lineWidth=Math.max(14,1.6/scale);c.beginPath();c.moveTo(player.x,player.y);const aimLength=Math.max(65,9/scale);c.lineTo(player.x+player.aimX*aimLength,player.y+player.aimY*aimLength);c.stroke();
    window.V0151Station?.drawMap(c,scale,miniMode);
    if(selected&&!miniMode){c.strokeStyle='#f1de9d';c.lineWidth=1/scale;const size=Math.max(35,5/scale);c.strokeRect(selected.x-size,selected.y-size,size*2,size*2);}c.restore();
    if(miniMode){c.fillStyle='#d6e2d6';c.font='9px Arial';c.textAlign='center';c.fillText(I18n.text(scene==='surface'?'N ↑':'Бункер'),w/2,15);if(goal?.scene===scene){const dx=(goal.x-player.x)*scale,dy=(goal.y-player.y)*scale,d=Math.hypot(dx,dy),k=Math.min(1,(Math.min(w,h)/2-16)/Math.max(1,d));if(k<1){const x=w/2+dx*k,y=h/2+dy*k,a=Math.atan2(dy,dx);c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#ebc87a';c.beginPath();c.moveTo(7,0);c.lineTo(-4,-4);c.lineTo(-4,4);c.closePath();c.fill();c.restore();}c.textAlign='center';c.fillText(I18n.text(Math.round(d/scale)+' м'),w/2,h-11);}}
    c.restore();return {scale,ox,oy};
  }
  function drawFull(){if(!overlay.classList.contains('open'))return;const r=full.getBoundingClientRect();const nw=Math.max(320,Math.round(r.width||700)),nh=Math.max(180,Math.round(r.height||400));if(full.width!==nw)full.width=nw;if(full.height!==nh)full.height=nh;mapDraw(fc,full.width,full.height,false);}
  function mapPoint(e){const r=full.getBoundingClientRect(),b=bounds(),s=Math.min(full.width/b.w,full.height/b.h)*mapZoom;return {x:((e.clientX-r.left)*full.width/Math.max(1,r.width)-full.width/2)/s+mapPan.x,y:((e.clientY-r.top)*full.height/Math.max(1,r.height)-full.height/2)/s+mapPan.y};}
  let mapDrag=null;const mapTouches=new Map();let mapPinch=null;
  full.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();full.setPointerCapture?.(e.pointerId);mapTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(mapTouches.size===2){const [a,b]=[...mapTouches.values()];mapPinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:mapZoom};mapDrag=null;}else mapDrag={x:e.clientX,y:e.clientY,pan:{...mapPan},moved:false};});
  full.addEventListener('pointermove',e=>{if(!mapTouches.has(e.pointerId))return;mapTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(mapPinch&&mapTouches.size===2){const[a,b]=[...mapTouches.values()];mapZoom=clamp(mapPinch.z*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,mapPinch.d),1,6);drawFull();return;}if(!mapDrag)return;const dx=e.clientX-mapDrag.x,dy=e.clientY-mapDrag.y;if(Math.hypot(dx,dy)>7)mapDrag.moved=true;if(mapDrag.moved){const b=bounds(),s=Math.min(full.width/b.w,full.height/b.h)*mapZoom;const rect=full.getBoundingClientRect();mapPan={x:mapDrag.pan.x-dx*full.width/Math.max(1,rect.width)/s,y:mapDrag.pan.y-dy*full.height/Math.max(1,rect.height)/s};drawFull();}});
  full.addEventListener('pointerup',e=>{mapTouches.delete(e.pointerId);if(!mapPinch&&mapDrag&&!mapDrag.moved){window.V014Controls?.stopRoute();selected=mapPoint(e);const b=bounds();selected.x=clamp(selected.x,b.x,b.x+b.w);selected.y=clamp(selected.y,b.y,b.y+b.h);I18n.assign(el('v010MapHint'),"textContent",'Выбрано место · '+Math.round(selected.x)+', '+Math.round(selected.y));}if(!mapTouches.size){mapPinch=null;mapDrag=null;}drawFull();});
  full.addEventListener('pointercancel',()=>{mapTouches.clear();mapPinch=null;mapDrag=null;});
  full.addEventListener('wheel',e=>{e.preventDefault();mapZoom=clamp(mapZoom*Math.exp(-e.deltaY*.001),1,6);drawFull();},{passive:false});
  el('v010MapMark').onclick=()=>{if(!selected)return;if(markers.length>=40){message('Можно поставить до 40 меток');return;}markers.push({...selected,scene,name:(el('v010MarkerName').value.trim()||'Метка').slice(0,36)});queueGameSave();drawFull();};
  el('v010MapGoal').onclick=()=>{goal=selected?{...selected,scene}:null;queueGameSave();drawFull();};
  el('v010MapDelete').onclick=()=>{if(!selected)return;let best=-1,d=200;markers.forEach((m,i)=>{const n=Math.hypot(m.x-selected.x,m.y-selected.y);if(m.scene===scene&&n<d){best=i;d=n;}});if(best>=0)markers.splice(best,1);queueGameSave();drawFull();};
  function building(o,front=false){if(o.kind!=='house'||!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)+90))return;const height=tilt===1?0:44,behind=player.x>o.x-12&&player.x<o.x+o.w+12&&player.y>o.y-height-25&&player.y<o.y+o.h-height;
    if(front&&!behind)return;ctx.save();ctx.globalAlpha=behind?.38:1;
    ctx.fillStyle='#292f2a';ctx.fillRect(o.x+7,o.y+o.h-height,o.w-14,height);ctx.fillStyle='#798173';ctx.fillRect(o.x+7,o.y+o.h-height,o.w-14,height-8);
    for(let x=o.x+24;x<o.x+o.w-22;x+=54){ctx.fillStyle='#263f41';ctx.fillRect(x,o.y+o.h-height+9,26,18);ctx.strokeStyle='#a0a38c';ctx.lineWidth=2;ctx.strokeRect(x,o.y+o.h-height+9,26,18);}
    const roofs=['#6f7b70','#707e83','#827464','#617b73'];ctx.fillStyle=o.zone==='pharmacy'?'#597e6b':o.zone==='warehouse'?'#6e7874':roofs[[...o.id].reduce((n,c)=>n+c.charCodeAt(0),0)%4];ctx.fillRect(o.x,o.y-height,o.w,o.h-5);ctx.strokeStyle='#a0a188';ctx.lineWidth=4;ctx.strokeRect(o.x,o.y-height,o.w,o.h-5);ctx.strokeStyle='#4c5d50';ctx.lineWidth=2;
    for(let y=o.y-height+15;y<o.y+o.h-height-7;y+=(zoom<.4?50:20)){ctx.beginPath();ctx.moveTo(o.x+5,y);ctx.lineTo(o.x+o.w-5,y);ctx.stroke();}
    ctx.fillStyle='#c1b99c';ctx.fillRect(o.x+o.w*.48,o.y-height+5,9,o.h-15);ctx.fillStyle='#4b5148';ctx.fillRect(o.x+o.w-52,o.y-height+25,25,32);
    if(o.zone==='pharmacy'){ctx.fillStyle='#d8e5cf';ctx.fillRect(o.x+20,o.y-height+24,40,40);ctx.fillStyle='#b76455';ctx.fillRect(o.x+36,o.y-height+29,8,30);ctx.fillRect(o.x+25,o.y-height+40,30,8);}
    if(o.zone==='substation'){for(let i=0;i<3;i++){ctx.fillStyle='#45565b';ctx.fillRect(o.x+35+i*55,o.y-height+30,36,48);ctx.strokeStyle='#bcb18a';ctx.lineWidth=4;for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(o.x+39+i*55,o.y-height+35+j*11);ctx.lineTo(o.x+67+i*55,o.y-height+35+j*11);ctx.stroke();}}}
    if(o.zone==='mill'){ctx.fillStyle='#b79a70';for(let i=0;i<3;i++){ctx.fillRect(o.x+25,o.y-height+25+i*16,90,11);}}
    if(o.zone==='fuel'){ctx.fillStyle='#bd9470';ctx.fillRect(o.x+25,o.y-height+25,55,42);ctx.fillStyle='#344d50';ctx.fillRect(o.x+32,o.y-height+32,40,18);}
    ctx.fillStyle='#e0dfc8';ctx.font='11px Arial';ctx.textAlign='center';if(o.name)ctx.fillText(I18n.text(o.name),o.x+o.w/2,o.y+o.h*.6-height);ctx.restore();
  }
  const oldDraw=draw;draw=function(){const density=canvas.width/Math.max(1,screenWidth);ctx.setTransform(density,0,0,density,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,screenWidth,screenHeight);ctx.save();try{ctx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);if(scene==='surface'){ctx.fillStyle='#27372d';const v=view();ctx.fillRect(camera.x,camera.y,v.w,v.h);drawSurface();if(tilt!==1)for(const o of scavenges)building(o);}else drawBunker();drawNavigationTarget();drawBullets();if(scene==='surface'&&window.V0141Trees)V0141Trees.drawActors();else{drawPlayer();if(scene==='surface')for(const z of zombies)drawZombie(z);}if(scene==='surface')window.V011World?.drawRoofs();if(scene==='surface'&&tilt!==1)for(const o of scavenges)building(o,true);drawFlashlight();}catch(error){canvas.width=canvas.width;throw error;}finally{ctx.restore();ctx.setTransform(density,0,0,density,0,0);}clock+=16.667*frameScale;if(clock>=160){clock=0;if(!GameFlow.paused)reveal();}if(!menuOpen)mapDraw(mc,mini.width,mini.height,true);else if(overlay.classList.contains('open'))drawFull();mini.style.display=menuOpen?'none':'block';const workBar=el('searchBarWrap');if(workBar.style.display==='block')positionWorkProgress(workBar,Number(workBar.dataset.workOffset)||58);};
  // Reproject the dark mask in screen pixels so far zoom never allocates a world-sized canvas.
  let mask=null,maskContext=null;
  V091Light.illuminate=function(){const beam=V091Light.cone();if(scene==='bunker'){
    if(!mask){mask=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas');maskContext=mask.getContext('2d');}if(mask.width!==Math.ceil(screenWidth)||mask.height!==Math.ceil(screenHeight)){mask.width=Math.ceil(screenWidth);mask.height=Math.ceil(screenHeight);}const c=maskContext;c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.clearRect(0,0,mask.width,mask.height);c.fillStyle='rgba(2,5,10,.61)';c.fillRect(0,0,mask.width,mask.height);c.setTransform(zoom,0,0,zoom,-camera.x*zoom,-camera.y*zoom);
    const supplied=V09Power.allocation().served;for(const room of Object.keys(V09Power.rooms)){const r=bunker[room];if(!r)continue;V011Rooms.paintDarkness(c,room,r,supplied.has('light_'+room));}
    if(beam){c.globalCompositeOperation='destination-out';let previous=0;for(let inset=0;inset<48;inset+=2){const desired=.99*Math.sin((inset+2)/48*Math.PI/2)**2,strength=(desired-previous)/(1-previous);previous=desired;const g=c.createRadialGradient(beam.ox,beam.oy,0,beam.ox,beam.oy,beam.range);g.addColorStop(0,`rgba(255,255,255,${strength})`);g.addColorStop(.3,`rgba(255,255,255,${strength})`);g.addColorStop(.65,`rgba(255,255,255,${strength*.96})`);g.addColorStop(.86,`rgba(255,255,255,${strength*.5})`);g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(beam.ox,beam.oy);for(let i=inset;i<beam.points.length-inset;i++)c.lineTo(beam.points[i].x,beam.points[i].y);c.closePath();c.fill();}}
    c.setTransform(1,0,0,1,0,0);ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;const v=view();ctx.drawImage(mask,camera.x,camera.y,v.w,v.h);ctx.restore();
  }else if(beam){ctx.save();const g=ctx.createRadialGradient(beam.ox,beam.oy,0,beam.ox,beam.oy,beam.range);g.addColorStop(0,'rgba(255,245,210,.10)');g.addColorStop(.65,'rgba(255,245,210,.055)');g.addColorStop(1,'rgba(255,245,210,0)');ctx.fillStyle=g;for(let i=0;i<48;i+=2){ctx.globalAlpha=.08;ctx.beginPath();ctx.moveTo(beam.ox,beam.oy);for(let j=i;j<beam.points.length-i;j++)ctx.lineTo(beam.points[j].x,beam.points[j].y);ctx.closePath();ctx.fill();}ctx.restore();}};
  window.visualViewport?.addEventListener('resize',resizeCanvas);window.addEventListener('orientationchange',()=>setTimeout(resizeCanvas,150));
  function capture(){return {schema:1,zoom:targetZoom,tilt,opacity,corner,discovered:[...discovered],known:[...known],markers:clone(markers),goal:goal?{...goal}:null};}
  function validate(s){if(!s||s.schema!==1||!Number.isFinite(s.zoom)||s.zoom<.25||s.zoom>2.8||![.76,1].includes(s.tilt)||![0,1,2].includes(s.opacity)||!['left','right'].includes(s.corner)||!Array.isArray(s.discovered)||s.discovered.length>3450||s.discovered.some(k=>typeof k!=='string'||!/^(-?\d{1,2}),(-?\d{1,2})$/.test(k)||!((p=>p[0]>=-12&&p[0]<=33&&p[1]>=-15&&p[1]<60)(k.split(',').map(Number))))||!Array.isArray(s.known)||s.known.length>1500||s.known.some(k=>typeof k!=='string'||k.length>80))throw Error('Некорректная карта');const valid=p=>p&&['surface','bunker'].includes(p.scene)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.scene==='surface'?p.x>=-2800&&p.x<=4400&&p.y>=-2400&&p.y<=9600:p.x>=-1500&&p.x<=3000&&p.y>=-1500&&p.y<=5000);if(!Array.isArray(s.markers)||s.markers.length>40||s.markers.some(m=>!valid(m)||typeof m.name!=='string'||m.name.length>36)||(s.goal!==null&&!valid(s.goal)))throw Error('Некорректные метки');return true;}
  function restore(s){if(s)validate(s);zoom=targetZoom=clamp(s?.zoom??.8,MIN_ZOOM,MAX_ZOOM);tilt=1;opacity=s?.opacity??0;corner=s?.corner??'right';discovered=new Set(s?.discovered||[]);known=new Set(s?.known||[]);markers=clone(s?.markers||[]);goal=s?.goal?{...s.goal}:null;mapOpen=false;touches.clear();pinch=null;wheelDirection=0;updateSettings();const v=view();camera.x=player.x-v.w/2;camera.y=player.y-v.h/2;updateCamera();reveal();mapDraw(mc,mini.width,mini.height,true);}
  const api={resetTouch(){touches.clear();pinch=null;suppressTouchUntil=0;cancelMiniHold();},get touchActive(){return touches.size>0;},point,inverse,view,setZoom,capture,restore,validate,showMap,mapDraw,drawFull,closeMap(){mapOpen=false;cancelMiniHold();},clearGoal(){goal=null;queueGameSave();drawFull();},get goal(){return goal;},get selected(){return selected?{...selected}:null;},setSelected(p){selected=p?{x:p.x,y:p.y}:null;drawFull();},setGoal(p){goal=p?{x:p.x,y:p.y,scene}:null;queueGameSave();drawFull();},mapBounds:bounds,get mapViewport(){return {zoom:mapZoom,pan:{...mapPan}};},get zoom(){return zoom;},get targetZoom(){return targetZoom;},get tilt(){return tilt;},reveal,seen};V010.register('camera',api);updateSettings();return api;
})();
window.V010Camera=V010Camera;
function worldToScreen(x,y){return V010Camera.point(x,y);}
function screenToWorld(x,y){return V010Camera.inverse(x,y);}
function viewWidth(){return V010Camera.view().w;}
function viewHeight(){return V010Camera.view().h;}

