const V091Loot=(()=>{
  const DAY=24*60*60*1000;
  for(const o of scavenges)o.searchedAt=null;
  function refresh(now=Date.now()){
    let changed=false;
    for(const o of scavenges){
      if(o.kind==='car')continue;
      if(!o.searched){o.searchedAt=null;continue;}
      if(o.searchedAt===null){o.searchedAt=now;changed=true;}
      if(now-o.searchedAt<DAY||(o.loot&&o.loot.length)||activeLootObject===o&&el('lootOverlay').classList.contains('open')||searchState?.obj===o)continue;
      o.searched=false;o.loot=[];o.searchedAt=null;changed=true;
    }
    if(changed)queueGameSave();
  }
  randomLoot=function(kind){
    const out=[];
    function put(type,min,max,chance=1){if(Math.random()<chance)out.push({type,qty:min+Math.floor(Math.random()*(max-min+1))});}
    if(kind==='car'){put('fuel',3,14,.5);put('ammo',5,24,.72);put('iron',4,18,.82);put('parts',1,8,.58);put('ammo556',8,20,.5);}
    else{put('food',2,12,.92);put('meds',1,5,.68);put('ammo',3,16,.35);put('wood',3,12,.45);put('copper',2,6,.6);put('ammo556',8,20,.5);}
    return out.length?out:[{type:kind==='car'?'iron':'food',qty:2}];
  };
  const oldOpen=openLoot;
  openLoot=function(o){refresh();const fresh=!o.searched;oldOpen(o);if(fresh)o.searchedAt=Date.now();};
  const oldSearch=startSearch;
  startSearch=function(o){refresh();return oldSearch(o);};
  let elapsed=0;const oldUpdate=update;
  update=function(){oldUpdate();elapsed+=frameScale/60;if(elapsed>=1){elapsed=0;refresh();}};
  function validate(d){
    if(!d||!Array.isArray(d.objects)||d.objects.length!==scavenges.length)throw new Error('Неверные данные обновления добычи');
    d.objects.forEach((o,i)=>{if(!o||o.id!==scavenges[i].id||!(o.searchedAt===null||Number.isFinite(o.searchedAt)&&o.searchedAt>=0&&o.searchedAt<=Number.MAX_SAFE_INTEGER))throw new Error('Неверный таймер добычи');});return true;
  }
  return {dayMs:DAY,refresh,validate,capture:()=>({objects:scavenges.map(o=>({id:o.id,searchedAt:o.searchedAt}))}),
    restore(d){validate(d);d.objects.forEach((o,i)=>{scavenges[i].searchedAt=scavenges[i].searched?(o.searchedAt??Date.now()):null;});refresh();}};
})();
window.V091Loot=V091Loot;


/* 0.9.2 — an occluded flashlight reveals the world through a darkness mask.
   World artwork is drawn only once. Never copy/darken the game canvas itself. */
const V091Light = (()=>{
  const range=420,halfAngle=.8,rayCount=96;
  let mask=null,maskContext=null,lastKey='',cachedCone=null;

  function blocked(x,y,r=.35,which=scene){
    if(typeof V091Fortress!=='undefined'&&typeof V091Fortress.lightCollision==='function')
      return V091Fortress.lightCollision(x,y,r,which);
    return worldCollision(x,y,r,which);
  }
  function bunkerWalls(){return []; /* shared walls are indexed solids */}
  function obstacles(ox,oy,distanceLimit){
    let all;
    if(scene==='surface'&&typeof V091Fortress!=='undefined'&&typeof V091Fortress.lightObstacles==='function')all=V091Fortress.lightObstacles(scene);
    if(!all){
      const g=geometryFor(scene);
      all=scene==='bunker'?[...g.objects,...bunkerWalls(),...v09Doors.filter(d=>BunkerLayout.roomActive(d.room)).flatMap(v09DoorPanels)]:[...g.walls,...g.objects];
    }
    return all.filter(o=>o.r!==undefined?Math.hypot(o.x-ox,o.y-oy)<distanceLimit+o.r:
      o.x<ox+distanceLimit&&o.x+o.w>ox-distanceLimit&&o.y<oy+distanceLimit&&o.y+o.h>oy-distanceLimit);
  }
  function cast(ox,oy,angle,maxDistance=range,solids=obstacles(ox,oy,maxDistance)){
    const dx=Math.cos(angle),dy=Math.sin(angle),pad=.35;let reach=maxDistance,hit=false,body=null;
    for(const o of solids){
      let near,far;
      if(o.r!==undefined){
        const cx=ox-o.x,cy=oy-o.y,b=cx*dx+cy*dy,radius=o.r+pad,c=cx*cx+cy*cy-radius*radius;
        if(c<=0)near=0;
        else {const discriminant=b*b-c;if(discriminant<0)continue;near=-b-Math.sqrt(discriminant);if(near<0)continue;}
      }else{
        const left=o.x-pad,right=o.x+o.w+pad,top=o.y-pad,bottom=o.y+o.h+pad;
        if(Math.abs(dx)<1e-9){if(ox<left||ox>right)continue;near=-Infinity;far=Infinity;}
        else {const a=(left-ox)/dx,b=(right-ox)/dx;near=Math.min(a,b);far=Math.max(a,b);}
        if(Math.abs(dy)<1e-9){if(oy<top||oy>bottom)continue;}
        else {const a=(top-oy)/dy,b=(bottom-oy)/dy;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
        if(far<Math.max(0,near))continue;near=Math.max(0,near);
      }
      if(near<reach){reach=near;hit=true;body=o;}
    }
    // Include only the front subpixel of a solid, never the space behind it.
    if(hit)reach=Math.min(maxDistance,reach+.25);
    return {x:ox+dx*reach,y:oy+dy*reach,distance:reach,hit,body};
  }
  function cone(){
    if(!(window.GameHeadModules?GameHeadModules.available():heldItem()==='flashlight')||!flashlightOn||playerDead)return null;
    const angle=Math.atan2(player.aimY,player.aimX);
    const anchor=window.ActorVisuals?.lightPoint()||{x:player.x+Math.cos(angle)*29,y:player.y+Math.sin(angle)*29};
    // Doors move independently of the navigation geometry revision.
    const key=[scene,player.x,player.y,anchor.x,anchor.y,angle,geometryRevision,player.wallLevel||0,
      typeof V091Fortress!=='undefined'?V091Fortress.innerGateOpen:0,
      gateOpen,...v09Doors.map(d=>d.open),window.V011Living?.bathDoor.open].join('|');
    if(key===lastKey&&cachedCone)return cachedCone;
    const length=Math.hypot(anchor.x-player.x,anchor.y-player.y),direction=Math.atan2(anchor.y-player.y,anchor.x-player.x),solids=obstacles(player.x,player.y,range+length);
    const emitter=cast(player.x,player.y,direction,length,solids);
    const reach=Math.max(0,emitter.distance-(emitter.hit?2:0));
    const ox=player.x+Math.cos(direction)*reach,oy=player.y+Math.sin(direction)*reach;
    const points=[];
    for(let i=0;i<=rayCount;i++)points.push(cast(ox,oy,angle-halfAngle+2*halfAngle*i/rayCount,range,solids));
    const contact=points[rayCount/2];let bounce=null;
    if(contact.hit){
      const o=contact.body;let nx,ny;
      if(o.r!==undefined){const n=Math.hypot(contact.x-o.x,contact.y-o.y)||1;nx=(contact.x-o.x)/n;ny=(contact.y-o.y)/n;}
      else {const sides=[{d:Math.abs(contact.x-o.x),x:-1,y:0},{d:Math.abs(contact.x-o.x-o.w),x:1,y:0},{d:Math.abs(contact.y-o.y),x:0,y:-1},{d:Math.abs(contact.y-o.y-o.h),x:0,y:1}].sort((a,b)=>a.d-b.d);nx=sides[0].x;ny=sides[0].y;}
      const strength=1-contact.distance/range,radius=28+28*strength,x=contact.x+nx*2,y=contact.y+ny*2,normal=Math.atan2(ny,nx),fan=[];
      // One small front-facing fan, cached with the primary beam, never a GI pass.
      const nearby=solids.filter(o=>o.r!==undefined?Math.hypot(o.x-x,o.y-y)<radius+o.r:o.x<x+radius&&o.x+o.w>x-radius&&o.y<y+radius&&o.y+o.h>y-radius);
      for(let i=0;i<=12;i++)fan.push(cast(x,y,normal-Math.PI/2+Math.PI*i/12,radius,nearby));
      bounce={x,y,radius,nx,ny,contact,strength,points:fan};
    }
    lastKey=key;return cachedCone={ox,oy,anchor,angle,range,halfAngle,points,bounce};
  }
  function buffer(){
    if(!mask){
      mask=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas');
      maskContext=mask.getContext('2d');
    }
    // One logical pixel is enough for soft lighting and caps mobile memory use.
    const w=Math.max(1,Math.ceil(screenWidth)),h=Math.max(1,Math.ceil(screenHeight));
    if(mask.width!==w||mask.height!==h){mask.width=w;mask.height=h;}
    return maskContext;
  }
  function path(c,beam,inset=0,offsetX=0,offsetY=0){
    c.beginPath();c.moveTo(beam.ox-offsetX,beam.oy-offsetY);
    for(let i=inset;i<beam.points.length-inset;i++)c.lineTo(beam.points[i].x-offsetX,beam.points[i].y-offsetY);
    c.closePath();
  }
  function radial(c,beam,strength){
    const g=c.createRadialGradient(beam.ox-camera.x,beam.oy-camera.y,0,beam.ox-camera.x,beam.oy-camera.y,range);
    g.addColorStop(0,'rgba(255,255,255,'+strength+')');
    g.addColorStop(.18,'rgba(255,255,255,'+strength+')');
    g.addColorStop(.54,'rgba(255,255,255,'+(strength*.92)+')');
    g.addColorStop(.79,'rgba(255,255,255,'+(strength*.5)+')');
    g.addColorStop(1,'rgba(255,255,255,0)');
    return g;
  }
  function removeDarkness(c,beam){
    c.save();c.globalCompositeOperation='destination-out';
    // Gradually remove darkness across the entire angular width, not only its rim.
    c.globalAlpha=1;let previous=0;
    for(let inset=0;inset<rayCount/2;inset+=2){
      const t=(inset+2)/(rayCount/2),desired=.92*Math.sin(t*Math.PI/2)**2;
      c.fillStyle=radial(c,beam,(desired-previous)/(1-previous));previous=desired;
      path(c,beam,inset,camera.x,camera.y);c.fill();
    }
    c.restore();
  }
  function illuminate(){
    const beam=cone();
    if(scene==='bunker'){
      const c=buffer();c.setTransform(1,0,0,1,0,0);
      c.globalCompositeOperation='source-over';c.globalAlpha=1;c.clearRect(0,0,mask.width,mask.height);
      c.fillStyle='rgba(2,5,10,.61)';c.fillRect(0,0,mask.width,mask.height);
      const supplied=V09Power.allocation().served;
      for(const room of Object.keys(V09Power.rooms)){
        if(room==='yard'||!BunkerLayout.roomActive(room))continue;
        const r=bunker[room];if(!r)continue;
        const x=r.left+9-camera.x,y=r.top+9-camera.y,w=r.right-r.left-18,h=r.bottom-r.top-18;
        c.clearRect(x,y,w,h);c.fillStyle=supplied.has('light_'+room)?'rgba(2,5,10,.035)':'rgba(2,5,10,.76)';c.fillRect(x,y,w,h);
      }
      if(beam)removeDarkness(c,beam);
      c.setTransform(1,0,0,1,0,0);
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      // drawFlashlight is called with the existing camera translation in place.
      ctx.drawImage(mask,camera.x,camera.y,screenWidth,screenHeight);ctx.restore();
    }
    if(!beam)return;
    // Daylight reflection uses the same gradual edge, with no repeated bright wash.
    if(scene==='surface'){
      ctx.save();const glow=ctx.createRadialGradient(beam.ox,beam.oy,0,beam.ox,beam.oy,range);
      glow.addColorStop(0,'rgba(255,245,210,.07)');glow.addColorStop(.5,'rgba(255,245,210,.035)');glow.addColorStop(1,'rgba(255,245,210,0)');ctx.fillStyle=glow;
      for(let inset=0;inset<rayCount/2;inset+=2){ctx.globalAlpha=.04;path(ctx,beam,inset);ctx.fill();}ctx.restore();
    }
  }
  return {range,halfAngle,cone,cast,blocked,illuminate,invalidate(){lastKey='';cachedCone=null;}};
})();

// Ambient darkness must be composited after all world props have been drawn.
// Retain the original room lamps and the subtle glow of powered rooms.
v09DrawRoomLight=function(room){
  const r=bunker[room];if(!r)return;const lit=devicePowered('light_'+room);
  if(lit){
    ctx.save();ctx.beginPath();ctx.rect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);ctx.clip();
    for(const p of v09LightPoints(room)){
      const radius=room==='farm'?530:room==='corridor'?280:510;
      const gradient=ctx.createRadialGradient(p.x,p.y,5,p.x,p.y,radius);
      gradient.addColorStop(0,'rgba(250,241,191,.20)');gradient.addColorStop(.4,'rgba(220,225,184,.08)');gradient.addColorStop(1,'rgba(220,230,195,0)');
      ctx.fillStyle=gradient;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
    }
    ctx.restore();
  }
  for(const p of v09LightPoints(room)){
    ctx.save();ctx.fillStyle='#1c2b30';ctx.fillRect(p.x-35,p.y-5,70,10);ctx.fillStyle=lit?'#e8edce':'#626c66';
    ctx.shadowColor=lit?'#efe8af':'transparent';ctx.shadowBlur=lit?12:0;ctx.fillRect(p.x-28,p.y-2,56,4);ctx.restore();
  }
};
drawFlashlight=function(){V091Light.illuminate();};


/* 0.9.2 — distinct equipment state and four meaningful backpack sizes. */
for(const [type,capacity] of Object.entries({backpack1:24,backpack2:36,backpack3:48,backpack4:60}))ITEM[type].capacity=capacity;
BAG_SLOTS=ITEM[equipment.backpack.type].capacity;

const V091_EQUIP_SHAPES={
  head:'<path d="M8 24c0-12 5-18 16-18s16 6 16 18v8H8z"/><path d="M7 27h34M15 32v7h18v-7M24 7v18"/>',
  body:'<path d="m14 6 10 5 10-5 9 11-6 8-3-3v20H14V22l-3 3-6-8z"/><path d="M24 13v27M15 24h7v9h-7m11-9h7v9h-7M16 16h16"/>',
  legs:'<path d="M12 5h24l-1 37H25l-1-23-1 23H13z"/><path d="M13 12h22M18 5v7m12-7v7M14 26h7m6 0h7"/>',
  feet:'<path d="M7 8h13v20l3 8v6H4v-9l3-6zM28 8h13v19l4 6v9H26v-6l2-8z"/><path d="M5 36h17m5 0h17M10 17h7m-7 6h7m14-6h7m-7 6h7"/>',
  backpack:'<path d="M14 12V9a10 10 0 0 1 20 0v3M13 11h22a6 6 0 0 1 6 6v21a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5V17a6 6 0 0 1 6-6z"/><path d="M8 23h32M16 29h16v9H16zM12 12v9m24-9v9"/>'
};
function v091GearIcon(slot,filled){
  return '<svg viewBox="0 0 48 48" aria-hidden="true" class="v091GearIcon '+(filled?'isWorn':'isBlueprint')+'" stroke-linejoin="round" stroke-linecap="round">'+V091_EQUIP_SHAPES[slot]+'</svg>';
}
function v091Paperdoll(){
  const part=(key,shape)=>'<g class="v091DollPart '+(equipment[key]?'isWorn':'isBlueprint')+'" data-body-part="'+key+'">'+shape+'</g>';
  return '<svg viewBox="0 0 140 220" role="img" aria-label="Надетая экипировка" class="v091Paperdoll">'+
    '<g fill="none" stroke="#8aa6ab" stroke-opacity=".25" stroke-width="1.3" stroke-dasharray="3 4"><path d="M70 5v207M15 55h110M15 130h110"/><circle cx="70" cy="28" r="17"/><path d="M56 45 41 53 28 107 37 111 50 78v48l6 77h11l3-57 3 57h11l6-77V78l13 33 9-4-13-54-15-8M57 203l-7 9h18m5 0h19l-8-9"/></g>'+
    part('backpack','<path d="M89 56h18a8 8 0 0 1 8 8v50a7 7 0 0 1-7 7H91z"/><path d="M98 55v-6h9v7M98 88h14v23H98z"/>')+
    part('head','<path d="M52 28c0-14 6-21 18-21s18 7 18 21v6H52z"/><path d="M51 28h38M70 9v16"/>')+
    part('body','<path d="m52 48 18 9 18-9 12 15-9 13-4-4v55H53V72l-4 4-9-13z"/><path d="M70 60v61M55 80h11v18H55zM74 80h11v18H74zM55 109h30"/>')+
    part('legs','<path d="M53 129h34l-3 59H74l-4-41-4 41H56z"/><path d="M55 138h30M56 163h10m9 0h10"/>')+
    part('feet','<path d="M56 190h11v21H48v-8l8-6zM74 190h10v7l9 6v8H74z"/><path d="M49 207h17m9 0h17M57 196h6m15 0h5"/>')+'</svg>';
}
renderEquipment=function(){
  const box=el('equipmentSlots');if(!box)return;
  box.replaceChildren();
  for(const key of ['head','body','legs','feet','backpack']){
    const eq=equipment[key],def=eq&&ITEM[eq.type];
    const row=document.createElement('button');row.type='button';row.className='equipSlot'+(def?' filled':' empty');row.dataset.equipSlot=key;
    const icon=document.createElement('div');icon.className='equipIcon';I18n.assign(icon,"innerHTML",def?itemIconHTML(eq.type):v091GearIcon(key,false));
    const text=document.createElement('div');text.className='equipText';
    const label=document.createElement('div');label.className='equipLabel';I18n.assign(label,"textContent",EQUIP_LABELS[key]);
    const name=document.createElement('b');I18n.assign(name,"textContent",def?def.name:'Не надето');
    const hint=document.createElement('small');I18n.assign(hint,"textContent",def?(key==='backpack'?def.capacity+' мест · смена из рюкзака':'Характеристики и действия'):'Свободный слот');
    text.append(label,name,hint);row.append(icon,text);row.addEventListener('click',()=>window.V010Inventory?.details('equipment',key));box.append(row);
  }
  const figure=document.querySelector('.characterFigure');if(figure)I18n.assign(figure,"innerHTML",v091Paperdoll());
  I18n.assign(el('characterStats'),"innerHTML",'❤️ HP: <b>'+Math.round(player.health)+'/'+Math.round(player.maxHealth||100)+'</b><br>🛡️ Защита тела: <b>'+equippedArmor()+'%</b><br>🎒 Вместимость: <b>'+BAG_SLOTS+'</b>');
  I18n.assign(el('bagCapacityText'),"textContent",'🎒 Рюкзак · '+bag.length+'/'+BAG_SLOTS);
};
function v091Unequip(slot){
  const eq=equipment[slot];if(!eq)return false;
  if(slot==='backpack'){message('🎒 Чтобы сменить рюкзак, выберите другой в инвентаре.');return false;}
  const next=clone(bag);
  if(addToSlots(next,eq.type,1,BAG_SLOTS)>0){message('🎒 Освободите место для снятой экипировки.');return false;}
  bag=next;equipment[slot]=null;renderBag();queueGameSave();message('Снято: '+ITEM[eq.type].name);return true;
}
v09Style(`
  .characterInventory{grid-template-columns:minmax(140px,46%) minmax(0,1fr)}
  .equipSlot{width:100%;min-height:62px;text-align:left;color:#d5e5e3;cursor:pointer;font-family:inherit;transition:background .15s,border-color .15s}
  .equipSlot.empty{background:transparent;border:1px dashed #8bacb332;color:#91a9ae}
  .equipSlot.filled{background:linear-gradient(115deg,#263b32ee,#172627cc);border-color:#a2c89465}
  .equipSlot .equipIcon{width:37px;min-width:37px;line-height:1}.v091GearIcon{width:36px;height:36px;stroke-width:1.6}
  .isBlueprint{fill:none;stroke:#92b8c0;opacity:.38;stroke-width:1.3}
  .isWorn{fill:#667d50;stroke:#d3dea8;stroke-width:1.6}
  .equipSlot .equipLabel{opacity:.72;letter-spacing:.07em}.equipSlot b{font-size:11px;line-height:1.3;display:block}.equipSlot small{display:block;font-size:9px;opacity:.63;margin-top:3px}
  .characterFigure{font-size:initial;line-height:1;display:flex;justify-content:center;width:100%}.v091Paperdoll{width:140px;max-width:100%;height:210px}
  .v091DollPart[data-body-part="head"].isWorn{fill:#6b7350}.v091DollPart[data-body-part="legs"].isWorn{fill:#4d6256}.v091DollPart[data-body-part="feet"].isWorn{fill:#4a3f32;stroke:#a89371}.v091DollPart[data-body-part="backpack"].isWorn{fill:#9d7242;stroke:#e3bb82}
  @media(max-height:500px){.v091Paperdoll{height:175px}.equipSlot{min-height:55px}}
`);
window.V091Equipment={unequip:v091Unequip,render:renderEquipment};

