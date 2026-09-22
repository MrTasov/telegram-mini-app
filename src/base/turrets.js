/* 0.16: passable wall-mounted heavy machine guns; one persistent item per gun. */
window.V016Turret=(()=>{
  'use strict';
  const TYPE='hmg016',combat=Object.freeze({damage:65,range:850,capacity:600,ammoType:'ammo',intervalMs:190,turnRate:3.8});
  const definition={idPrefix:'hmg016_',upgrades:V010Combat.upgradeRules.turret,damagePerLevel:.1,combat};
  const isType=type=>!!ITEM[type]?.turret,typeOf=t=>t?.type||TYPE;
  const definitionFor=t=>ITEM[typeOf(t)]?.turret,combatFor=t=>definitionFor(t).combat;
  const copy=x=>JSON.parse(JSON.stringify(x)),guns=[],runtime=new Map();
  let nextId=2,placement=null,selected=null,obstacleRevision=-1,obstacles=[],clock=0;
  ITEM[TYPE]={name:'Тяжёлый пулемёт',icon:'▰',deployable:true,turret:definition,description:'Автоматический пулемёт на стене. Урон 65 · дальность 850 · круговой обстрел. Патроны 5,45 × 39: до 600. Заберите в рюкзак, чтобы переставить.'};
  V09Craft.recipes[TYPE]={station:'craft_bench',category:'Оборона базы',name:'Тяжёлый пулемёт',input:{iron:45,copper:18,parts:12},output:TYPE,qty:1,ms:90000};
  const starter=()=>({id:'hmg016_1',ammo:150,angle:-Math.PI*3/4,enabled:true,x:1410,y:1050,wallId:'v091wall020_corner_SE',fallen:false});
  guns.push(starter());
  const gunData=t=>({...typeTag(typeOf(t)),id:t.id,ammo:t.ammo,angle:t.angle,enabled:t.enabled,level:t.level||0});
  // Old payloads keep their implicit hmg type byte-for-byte. A different type
  // carries its explicit content ID independently of its instance ID.
  const typeTag=type=>type===TYPE?{}:{type};
  const damage=t=>Math.round(combatFor(t).damage*(1+definitionFor(t).damagePerLevel*(t?.level||0)));
  function validData(t,expectedType=typeOf(t)){const def=definitionFor(t);return !!t&&!!def&&typeOf(t)===expectedType&&typeof t.id==='string'&&t.id.startsWith(def.idPrefix)&&/^[1-9]\d{0,7}$/.test(t.id.slice(def.idPrefix.length))&&Number.isInteger(t.ammo)&&t.ammo>=0&&t.ammo<=def.combat.capacity&&Number.isFinite(t.angle)&&Math.abs(t.angle)<=Math.PI+1e-8&&typeof t.enabled==='boolean'&&(t.level===undefined||Number.isInteger(t.level)&&t.level>=0&&t.level<=def.upgrades.maxLevel);}
  function validItem(s){return !!s&&isType(s.type)&&s.qty===1&&validData(s.turretData,s.type);}
  function newData(type=TYPE){return {...typeTag(type),id:ITEM[type].turret.idPrefix+nextId++,ammo:0,angle:-Math.PI/2,enabled:true};}
  const addSlotsOld=addToSlots;
  addToSlots=function(slots,type,qty,max=60,metadata){
    if(!isType(type))return addSlotsOld(slots,type,qty,max,metadata);
    if(!Number.isInteger(qty)||qty<1)return qty;
    if(metadata?.turretData){if(qty!==1||!validData(metadata.turretData,type))return qty;return addSlotsOld(slots,type,1,max,metadata);}
    let left=qty;
    // Allocate IDs only for objects actually collected; a full bag consumes none.
    for(let i=0;i<max&&left;i++)if(!slots[i]){slots[i]={type,qty:1,turretData:newData(type)};left--;}
    return left;
  };
  function changed(){queueGameSave();renderBag();refresh();}
  function eligible(w){return !!w&&w.hp>0&&!w.gate&&['outer','inner'].includes(w.group);}
  function fits(p,w){return !!w&&[p.x,p.y].every(Number.isFinite)&&distance(p.x,p.y,clamp(p.x,w.x,w.x+w.w),clamp(p.y,w.y,w.y+w.h))<17.99;}
  function support(t){
    if(t.fallen)return false;
    const current=V015Base.byId.get(t.wallId);if(eligible(current)&&fits(t,current))return true;
    const other=V015Base.sections.find(w=>eligible(w)&&fits(t,w));if(!other)return false;t.wallId=other.id;return true;
  }
  function snapshotObstacles(){
    if(obstacleRevision===geometryRevision)return obstacles;
    // Match the fortress upper floor: perimeter slabs/bridges are below the
    // muzzle. The central enclosure and tall world objects still stop bullets.
    obstacles=[...surfaceWalls().filter(o=>o.group!=='outer'&&!(o.group==='gate'&&['north','south'].includes(o.gate))),...solidObjects('surface')];
    obstacleRevision=geometryRevision;return obstacles;
  }
  function ray(a,b,o,pad=1){
    if(o.r!==undefined){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;if(!d)return null;const px=a.x-o.x,py=a.y-o.y,r=o.r+pad,B=2*(px*dx+py*dy),C=px*px+py*py-r*r,disc=B*B-4*d*C;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*d);return t>=0&&t<=1?t:C<=0?0:null;}
    return V015Base.rayEntry(a,b,o,pad);
  }
  function clear(t,z){
    const minX=Math.min(t.x,z.x)-2,maxX=Math.max(t.x,z.x)+2,minY=Math.min(t.y,z.y)-2,maxY=Math.max(t.y,z.y)+2;
    for(const o of snapshotObstacles()){
      if(o.id===t.wallId||eligible(o)&&fits(t,o))continue;
      const x=o.r!==undefined?o.x-o.r:o.x,y=o.r!==undefined?o.y-o.r:o.y,w=o.r!==undefined?o.r*2:o.w,h=o.r!==undefined?o.r*2:o.h;
      if(x>maxX||x+w<minX||y>maxY||y+h<minY)continue;
      const hit=ray(t,z,o,1);if(hit!==null&&hit<.9999)return false;
    }return true;
  }
  function reachable(t){
    if(scene!=='surface'||playerDead||distance(player.x,player.y,t.x,t.y)>132)return false;
    // Wall controls are reachable from the adjacent ground or deck. Only the
    // supporting corner slabs are exempt; intervening walls/objects still block.
    for(const o of [...surfaceWalls(),...solidObjects('surface')]){
      if(o.id===t.wallId||eligible(o)&&fits(t,o))continue;
      if(o.group==='outer'&&distance(t.x,t.y,clamp(t.x,o.x,o.x+o.w),clamp(t.y,o.y,o.y+o.h))<35)continue;
      const hit=ray(player,t,o,0);if(hit!==null&&hit<.98)return false;
    }return true;
  }
  function candidate(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    let best=null,bestD=Infinity;
    for(const w of V015Base.sections){if(!eligible(w)||!fits({x,y},w))continue;
      const d=distance(x,y,clamp(x,w.x,w.x+w.w),clamp(y,w.y,w.y+w.h));if(d<bestD){best={x,y,wallId:w.id};bestD=d;}
    }return best;
  }
  function placementProblem(p){
    if(scene!=='surface')return 'Установка доступна на поверхности';
    if(!p||!eligible(V015Base.byId.get(p.wallId))||!fits(p,V015Base.byId.get(p.wallId)))return 'Выберите целую внешнюю или внутреннюю стену';
    if(!reachable(p))return 'Подойдите к выбранному месту на стене';
    if(guns.some(t=>!t.fallen&&distance(t.x,t.y,p.x,p.y)<64))return 'Рядом уже установлен пулемёт';
    return '';
  }
  function selectPoint(x,y){if(!placement)return false;placement.point=candidate(x,y);updatePlacement();return true;}
  function startPlacement(item){
    if(!validItem(item)||!bag.includes(item)){message('Пулемёт должен быть в рюкзаке');return false;}
    if(scene!=='surface'){message('Поднимитесь на поверхность, чтобы установить пулемёт');return false;}
    if(playerDead)return false;
    for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);
    stopControls(true);cancelNavigation();placement={item,point:candidate(player.x,player.y)};selected=null;updatePlacement();return true;
  }
  function cancelPlacement(){placement=null;bar.style.display='none';return true;}
  function place(){
    if(!placement)return false;
    const {item,point}=placement,index=bag.indexOf(item),problem=placementProblem(point);
    if(index<0||!validItem(item)){cancelPlacement();return false;}
    if(problem){message(problem);return false;}
    if(guns.some(t=>t.id===item.turretData.id))return false;
    GameAudio.play('turretPlace');guns.push({...copy(item.turretData),...point,fallen:false});bag[index]=null;cancelPlacement();changed();message('Пулемёт установлен · '+guns.at(-1).ammo+' патронов');return true;
  }
  function pack(t){
    if(!guns.includes(t)||!reachable(t))return false;
    if(addItem(typeOf(t),1,{turretData:gunData(t)})){message('Нужна свободная ячейка в рюкзаке');return false;}
    GameAudio.play('turretPack');guns.splice(guns.indexOf(t),1);runtime.delete(t.id);selected=null;const panel=el('v016TurretPanel');if(panel)closeOverlay(panel);changed();return true;
  }
  function ammoAvailable(t){return bag.reduce((n,s)=>n+(s?.type===combatFor(t).ammoType?s.qty:0),0);}
  function reload(t,amount=combatFor(t).capacity){
    if(!guns.includes(t)||!reachable(t))return 0;
    let need=Math.min(Math.max(0,Math.floor(amount)),combatFor(t).capacity-t.ammo),used=0;
    for(let i=0;i<bag.length&&need;i++){const s=bag[i];if(s?.type!==combatFor(t).ammoType)continue;const n=Math.min(s.qty,need);s.qty-=n;need-=n;used+=n;if(!s.qty)bag[i]=null;}
    t.ammo+=used;if(used){GameAudio.play('magazineLoad');changed();}else message('В рюкзаке нет свободных патронов 5,45');return used;
  }
  function unload(t){if(!guns.includes(t)||!reachable(t)||!t.ammo)return 0;const left=addItem(combatFor(t).ammoType,t.ammo),moved=t.ammo-left;t.ammo=left;if(moved){GameAudio.play('magazineUnload');changed();}else message('Нет места для патронов');return moved;}
  function setEnabled(t,on){if(!guns.includes(t)||!reachable(t))return false;t.enabled=!!on;changed();return true;}
  function settleUnsupported(){for(const t of guns)if(!t.fallen&&!support(t)){
    const a=Math.atan2(600-t.y,800-t.x),p=V015Base.freePoint(t.x+Math.cos(a)*72,t.y+Math.sin(a)*72,10);
    if(p)Object.assign(t,p);GameAudio.play('constructionBreak',{x:t.x,y:t.y,scene:'surface'});t.fallen=true;t.wallId=null;runtime.delete(t.id);queueGameSave();
  }}
  function stateFor(t){if(!runtime.has(t.id))runtime.set(t.id,{target:null,search:0,cursor:0,shot:0,flash:0,tracer:null});return runtime.get(t.id);}
  const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function acquire(t){
    const s=stateFor(t),prior=s.target;
    if(prior?.alive&&prior.health>0&&distance(t.x,t.y,prior.x,prior.y)<=combatFor(t).range&&clear(t,prior))return prior;
    const candidates=[];for(const z of zombies)if(z.alive&&z.health>0){const d=(z.x-t.x)**2+(z.y-t.y)**2;if(d<=combatFor(t).range**2)candidates.push({z,d});}
    candidates.sort((a,b)=>a.d-b.d);
    // Rotate the bounded scan so a crowd behind cover cannot starve a farther
    // visible enemy. Keep an acquired target while its actual line stays clear.
    const count=candidates.length,start=count?s.cursor%count:0;
    for(let i=0;i<Math.min(8,count);i++){const at=(start+i)%count;s.cursor=(at+1)%count;const z=candidates[at].z;if(clear(t,z))return z;}return null;
  }
  function shootAt(t,z){
    const s=stateFor(t);if(!t.enabled||!support(t)||t.ammo<=0||!z?.alive||z.health<=0||distance(t.x,t.y,z.x,z.y)>combatFor(t).range||!clear(t,z))return false;
    let first=z,at=1;for(const q of zombies)if(q.alive&&q.health>0){const n=ray(t,z,{x:q.x,y:q.y,r:q.radius||16},1);if(n!==null&&n<at){at=n;first=q;}}
    GameAudio.play('turretFire',{x:t.x,y:t.y,scene:'surface',radius:660});t.ammo--;s.shot+=combatFor(t).intervalMs/1000;s.flash=.08;s.tracer={x:t.x+(z.x-t.x)*at,y:t.y+(z.y-t.y)*at};
    hitZombie(first,damage(t),{fixedDamage:true});createNoise(t.x,t.y,600);queueGameSave();return true;
  }
  function tick(ms){
    settleUnsupported();
    if(placement&&(!bag.includes(placement.item)||scene!=='surface'||playerDead))cancelPlacement();
    if(scene!=='surface'||GameFlow.paused)return;
    const dt=clamp(Number(ms)||0,0,100)/1000;clock+=dt;
    for(const t of guns){const s=stateFor(t);s.flash=Math.max(0,s.flash-dt);s.shot=Math.max(-dt,s.shot-dt);s.search-=dt;
      if(t.fallen||!t.enabled||!t.ammo){s.target=null;s.shot=0;continue;}
      if(s.search<=0){s.search=.2;s.target=acquire(t);}
      const z=s.target;if(!z?.alive||z.health<=0){s.target=null;s.shot=0;continue;}
      const aim=Math.atan2(z.y-t.y,z.x-t.x),delta=wrapAngle(aim-t.angle);t.angle=wrapAngle(t.angle+clamp(delta,-combatFor(t).turnRate*dt,combatFor(t).turnRate*dt));
      if(Math.abs(wrapAngle(aim-t.angle))<.055&&s.shot<=1e-9)shootAt(t,z);
      s.shot=Math.max(0,s.shot);
    }
    if(clock>=.25){clock=0;if(placement)updatePlacement();refresh();}
  }
  function status(t){return t.fallen?'Опора разрушена · заберите в рюкзак':!t.enabled?'Автоогонь выключен':!t.ammo?'Нет патронов 5,45':'Автоогонь · поворот 360°';}
  function open(t){if(!guns.includes(t)||!reachable(t)){message('Подойдите к пулемёту');return false;}selected=t;GameMovement.openUI();
    const o=v09Overlay('v016TurretPanel','Тяжёлый пулемёт'),body=o.querySelector('.v09Body');body.replaceChildren();
    const hero=document.createElement('div');hero.className='v016GunHero';I18n.assign(hero,"innerHTML",itemIconHTML(typeOf(t))+'<div><b>'+damage(t)+' урона · +'+(t.level||0)+' · '+combatFor(t).range+' дальность</b><small>Патроны '+(V09Craft.weaponsForAmmo(combatFor(t).ammoType).map(id=>V09Craft.weapons[id].caliber)[0]||ITEM[combatFor(t).ammoType].caliber)+' · ёмкость '+combatFor(t).capacity+'</small></div>');body.append(hero);
    const stats=document.createElement('p');stats.id='v016GunStatus';body.append(stats);
    const actions=document.createElement('div');actions.className='v016GunActions';
    const defs=[['load','Загрузить 100',()=>reload(t,100)],['max','Загрузить максимум',()=>reload(t)],['unload','Выгрузить патроны',()=>unload(t)],['power','Автоогонь',()=>setEnabled(t,!t.enabled)],['range','Показать радиус',()=>{closeOverlay(o);previewUntil=performance.now()+6000;}],['pack','Забрать в рюкзак',()=>pack(t)]];
    for(const [id,label,fn] of defs){const b=v09Button(label,fn);b.dataset.turretAction=id;actions.append(b);}body.append(actions);
    const note=document.createElement('p');note.className='v016GunNote';I18n.assign(note,"textContent",'Установка в рюкзаке → выбрать стену → сдвинуть → установить. Пулемёт не перекрывает проход.');body.append(note);openOverlay(o);refresh();return true;
  }
  function refresh(){const o=el('v016TurretPanel');if(!o?.classList.contains('open')||!selected)return;const t=selected,near=reachable(t);I18n.assign(el('v016GunStatus'),"textContent",status(t)+' · '+t.ammo+' / '+combatFor(t).capacity);
    for(const b of o.querySelectorAll('[data-turret-action]')){const k=b.dataset.turretAction;b.disabled=!near||(k==='unload'&&!t.ammo)||(['load','max'].includes(k)&&(!ammoAvailable(t)||t.ammo===combatFor(t).capacity));if(k==='power')I18n.assign(b,"textContent",t.enabled?'Автоогонь: вкл.':'Автоогонь: выкл.');}
  }
  const bar=document.createElement('div');bar.id='v016Placement';bar.style.display='none';
  const tip=document.createElement('div');bar.append(tip);const controls=document.createElement('div');controls.className='v016PlacementActions';bar.append(controls);
  for(const [label,dx,dy] of [['←',-8,0],['↑',0,-8],['↓',0,8],['→',8,0]]){const b=v09Button(label,()=>{const p=placement?.point;if(p)selectPoint(p.x+dx,p.y+dy);});I18n.setAttr(b,'aria-label','Сдвинуть пулемёт '+label);controls.append(b);}
  const confirm=v09Button('Установить',place);confirm.id='v016PlaceConfirm';controls.append(confirm,v09Button('Отмена',cancelPlacement));document.body.append(bar);
  function updatePlacement(){if(!placement){bar.style.display='none';return;}bar.style.display='block';const problem=placementProblem(placement.point);I18n.assign(tip,"textContent",problem||'Место подходит · касание стены / стрелки для сдвига');confirm.disabled=!!problem;}
  const detailsOld=V011UI.details;V011UI.details=function(where,i){detailsOld(where,i);const s=where==='bag'?bag[i]:Number.isInteger(where)?storageChests[where]?.items[i]:null;if(!isType(s?.type))return;
    const body=el('v010ItemDetails').querySelector('.v09Body'),p=document.createElement('p');I18n.assign(p,"textContent",'В ленте: '+(s.turretData?.ammo||0)+' / '+combatFor(s.turretData).capacity+' · урон '+damage(s.turretData)+' · улучшение +'+(s.turretData?.level||0)+' · радиус '+combatFor(s.turretData).range);body.append(p);
    const b=v09Button('Установить на стену',()=>{if(where==='bag')startPlacement(s);else message('Сначала переложите пулемёт в рюкзак');});body.prepend(b);
  };
  const interactionsOld=interactionObjects;interactionObjects=function(which=scene){const a=interactionsOld(which);if(which==='surface')return [...a.filter(o=>o.kind==='v091stairs'),...guns.map(t=>({id:t.id,kind:TYPE,name:t.fallen?'Подобрать пулемёт':'Тяжёлый пулемёт',x:t.x,y:t.y,r:22,range:100})),...a.filter(o=>o.kind!=='v091stairs')];return a;};
  const canOld=canInteract;canInteract=function(o,x,y){return o?.kind===TYPE?reachable(guns.find(t=>t.id===o.id)||{x:Infinity,y:Infinity}):canOld(o,x,y);};
  const executeOld=executeInteraction;executeInteraction=function(o,...a){if(o?.kind===TYPE){if(!menuOpen&&!playerDead)open(guns.find(t=>t.id===o.id));return;}return executeOld(o,...a);};
  const approachOld=approachObject;approachObject=function(o,...a){if(o?.kind===TYPE){const t=guns.find(t=>t.id===o.id);if(t&&reachable(t))open(t);else if(t){message('Подойдите к пулемёту у стены');if(player.wallLevel)approachPoint(t.x,t.y);}return;}return approachOld(o,...a);};
  const tapOld=V0105.tapWorld;V0105.tapWorld=function(x,y){if(placement)return selectPoint(x,y);if(scene==='surface'&&V091Fortress.stairs.filter(V020Walls.usable).some(c=>{const p=player.wallLevel?c:c.foot;return distance(x,y,p.x,p.y)<=13;}))return false;const t=scene==='surface'&&guns.find(t=>distance(x,y,t.x,t.y)<28);if(t){GameActions.dispatch('INTERACT',{id:t.id,kind:TYPE});return true;}return tapOld(x,y);};
  const updateOld=update;update=function(...a){const r=updateOld(...a);tick(16.667*frameScale);return r;};
  let previewUntil=0;
  function disk(c,x,y,r,color,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.2;c.stroke();}}
  function metal(c,x,y,w,h,fill,stroke='#182124'){c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=1.1;c.strokeRect(x,y,w,h);}}
  function paint(c,x,y,angle,flash=0,ghost=false){
    c.save();c.translate(x,y);if(ghost)c.globalAlpha=.72;
    c.fillStyle='#07111465';c.beginPath();c.ellipse(7,10,32,24,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#18282a';c.lineWidth=8;for(const a of [-.4,1.7,3.8]){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*25,Math.sin(a)*25);c.stroke();disk(c,Math.cos(a)*25,Math.sin(a)*25,4,'#899283','#253436');}
    disk(c,0,0,18,'#2a3639','#b2bba8');disk(c,0,0,12,'#59665e','#132327');
    c.rotate(angle);const recoil=flash>0?2:0;c.translate(-recoil,0);
    metal(c,-23,-13,39,26,'#333f42');metal(c,-17,-10,30,20,'#66736a');metal(c,-12,-7,23,14,'#3e4b4c');
    metal(c,-13,13,23,15,'#59604b');metal(c,-10,15,17,9,'#404832');
    c.strokeStyle='#c7af69';c.lineWidth=5;c.beginPath();c.moveTo(-5,14);c.lineTo(9,13);c.lineTo(14,5);c.stroke();
    c.strokeStyle='#534a2c';c.lineWidth=1.2;for(let i=0;i<6;i++){c.beginPath();c.moveTo(-6+i*3,11);c.lineTo(-6+i*3,16);c.stroke();}
    metal(c,12,-7,29,14,'#273438');metal(c,17,-5,23,3,'#84928b');
    for(let x=17;x<38;x+=5)metal(c,x,-7,2,14,'#141f23',null);
    metal(c,39,-4,20,8,'#566665');metal(c,56,-6,10,12,'#263238');metal(c,62,-4,5,8,'#111d22');
    metal(c,-31,-9,9,18,'#454c43');metal(c,-35,-13,6,9,'#1f2c30');metal(c,-35,4,6,9,'#1f2c30');
    metal(c,3,-13,6,5,'#101e23');disk(c,6,-11,1.6,'#b6533f');
    for(const [xx,yy] of [[-18,-9],[-18,9],[10,-9],[10,9]])disk(c,xx,yy,1.7,'#b4baaa');
    if(flash>0){c.fillStyle='#ffe3a8';c.beginPath();c.moveTo(66,-4);c.lineTo(82,-9);c.lineTo(77,0);c.lineTo(86,6);c.lineTo(66,4);c.closePath();c.fill();}
    c.restore();
  }
  // Inventory uses the same drawn machinery, with no external sprite dependency.
  const icon=document.createElement('canvas');icon.width=128;icon.height=100;const ic=icon.getContext('2d');ic.translate(43,50);ic.scale(1.13,1.13);paint(ic,0,0,-.35);
  const iconURL=icon.toDataURL('image/png'),iconOld=itemIconHTML;
  itemIconHTML=function(type){return type===TYPE?'<img class="itemIcon" src="'+iconURL+'" alt="Тяжёлый пулемёт" draggable="false">':iconOld(type);};
  function range(p,color='#d4d497'){const spec=combatFor(placement?placement.item.turretData:p);ctx.save();ctx.strokeStyle=color;ctx.fillStyle='#cad89109';ctx.lineWidth=1.3/(V010Camera.zoom||1);ctx.setLineDash([10,9]);ctx.beginPath();ctx.arc(p.x,p.y,spec.range,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(I18n.text(spec.range+' · ОБСТРЕЛ 360°'),p.x,p.y-48);ctx.restore();}
  function draw(){if(scene!=='surface')return;
    if(placement){for(const w of V015Base.sections)if(eligible(w)&&visibleOnScreen(w.x+w.w/2,w.y+w.h/2,Math.max(w.w,w.h))){ctx.save();ctx.strokeStyle='#d9d88b9c';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.strokeRect(w.x+7,w.y+7,Math.max(1,w.w-14),Math.max(1,w.h-14));ctx.restore();}if(placement.point){range(placement.point,placementProblem(placement.point)?'#e29378':'#c4df9e');paint(ctx,placement.point.x,placement.point.y,placement.item.turretData.angle,0,true);}}
    else if(selected&&performance.now()<previewUntil)range(selected);
    for(const t of guns){if(!visibleOnScreen(t.x,t.y,100))continue;const s=stateFor(t);paint(ctx,t.x,t.y,t.angle,s.flash);if(t.fallen){ctx.save();ctx.fillStyle='#e8b68b';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText(I18n.text('ПОДОБРАТЬ'),t.x,t.y+40);ctx.restore();}if(s.flash>0&&s.tracer){ctx.save();ctx.strokeStyle='#f9dda29c';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(t.x+Math.cos(t.angle)*65,t.y+Math.sin(t.angle)*65);ctx.lineTo(s.tracer.x,s.tracer.y);ctx.stroke();ctx.restore();}}
  }
  const playerDrawOld=drawPlayer;drawPlayer=function(...a){draw();return playerDrawOld(...a);};
  function capture(){settleUnsupported();return{schema:1,nextId,guns:guns.map(t=>({...gunData(t),x:t.x,y:t.y,wallId:t.wallId,fallen:t.fallen}))};}
  function validate(d,whole){
    if(!d)return true;
    if(d.schema!==1||!Number.isInteger(d.nextId)||d.nextId<2||d.nextId>99999999||!Array.isArray(d.guns)||d.guns.length>128)throw Error('Некорректные пулемёты');
    const records=[];function visit(v){if(!v||typeof v!=='object')return;if(isType(v.type)&&Object.hasOwn(v,'qty')){if(!validItem(v))throw Error('Некорректный переносной пулемёт');records.push(v.turretData);return;}for(const q of Object.values(v))visit(q);}
    if(whole)visit(whole);const ids=new Set();
    for(const t of d.guns){if(!validData(t)||![t.x,t.y].every(Number.isFinite)||Math.abs(t.x)>25000||Math.abs(t.y)>25000||typeof t.fallen!=='boolean'||(t.fallen?t.wallId!==null:!fits(t,V015Base.byId.get(t.wallId))||!['outer','inner'].includes(V015Base.byId.get(t.wallId)?.group)||V015Base.byId.get(t.wallId)?.gate))throw Error('Некорректная позиция пулемёта');records.push(t);}
    for(const t of records){if(ids.has(t.id)||Number(t.id.slice(definitionFor(t).idPrefix.length))>=d.nextId)throw Error('Повтор пулемёта');ids.add(t.id);}
    return true;
  }
  GameSave.extend('capture','base.turrets',function(captureOld){const d=captureOld();d.turret016=capture();return d;});
  GameSave.extend('decode','base.turrets',function(decodeOld,raw){const d=decodeOld(raw);validate(d.turret016,d);if(!d.turret016){const tokens=[];const walk=v=>{if(!v||typeof v!=='object')return;if(isType(v.type)&&Object.hasOwn(v,'qty'))tokens.push(v);else for(const q of Object.values(v))walk(q);};walk(d);if(tokens.length)throw Error('Отсутствует состояние пулемётов');}return d;});
  GameSave.extend('restore','base.turrets',function(restoreOld,d){d=V015Base.migrateGame(d);validate(d.turret016,d);restoreOld(d);guns.splice(0,guns.length,...copy(d.turret016?.guns||[starter()]));nextId=d.turret016?.nextId||2;runtime.clear();selected=null;cancelPlacement();obstacleRevision=-1;settleUnsupported();});
  v09Style('#v016TurretPanel .v09Panel{width:min(410px,94vw);padding:14px;border-radius:13px}#v016TurretPanel p{font-size:12px;line-height:1.5;margin:10px 0}.v016GunHero{display:flex;align-items:center;gap:10px}.v016GunHero>.itemIcon{width:105px;height:82px;object-fit:contain}.v016GunHero b{font-size:12px}.v016GunHero small{display:block;font-size:10px;color:#9caf9f;margin-top:5px}.v016GunActions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v016GunActions .menuButton{font-size:11px;min-height:40px;margin:0;padding:7px}.v016GunNote{color:#9fb1a4}#v016Placement{position:fixed;z-index:9500;left:50%;top:calc(var(--v011-hud-top,10px) + 42px);transform:translateX(-50%);width:min(460px,calc(100vw - 24px));box-sizing:border-box;background:#182a2af2;border:1px solid #9ba784;border-radius:10px;padding:9px;text-align:center;color:#e0e7cc;font:11px Arial}.v016PlacementActions{display:flex;justify-content:center;gap:4px;margin-top:7px}.v016PlacementActions .menuButton{margin:0;font-size:11px;padding:5px 8px;min-height:36px;width:auto;min-width:32px}#v016PlaceConfirm{background:#476344}');
  return {type:TYPE,definition,isType,typeOf,definitionFor,combatFor,damage,combat,guns,validItem,capture,validate,candidate,placementProblem,startPlacement,selectPoint,place,cancelPlacement,pack,reload,unload,setEnabled,reachable,clear,support,settleUnsupported,tick,shootAt,open,draw,paint,get placement(){return placement;},get nextId(){return nextId;}};
})();

