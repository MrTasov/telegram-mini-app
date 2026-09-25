/* Surface fortress: stable structural IDs, migrated decorative partitions. */
window.V015Base=(()=>{
  const sections=[],byId=new Map(),OUTER_HP=6000,INNER_HP=3000,ROOM_HP=1800;
  const health=(()=>{
    const levels=Object.freeze([0,10000,20000,40000,60000,100000]);
    const costs=Object.freeze({2:{concrete:20,iron:5},3:{concrete:40,iron:10},4:{concrete:60,iron:15},5:{concrete:100,iron:25}});
    const repair=Object.freeze({material:'concrete',hpPerUnit:1000,hpPerMs:1,maxTickMs:100});
    // Independent immutable definitions: changing a door rule can never change
    // a wall. Released levels 1–5, costs and repair conversion remain exact.
    const profile=(typeId,family)=>Object.freeze({typeId,family,recovery:'recoverable',levels:Object.freeze([...levels]),costs:Object.freeze(Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,Object.freeze({...v})]))),repair:Object.freeze({...repair}),armor:0,resistances:Object.freeze({}),stages:Object.freeze([0,.2,.5,.9])});
    // The registry remains extensible for definition-driven content/test ports.
    const types={wall:profile('wall_section','wall'),gate:profile('perimeter_gate','door'),automatic:profile('bunker_sliding_door','door'),house:profile('house_door','door'),bath:profile('bathroom_door','door')};
    const definition=type=>types[type];
    function stage(o,type='wall'){const thresholds=definition(type).stages,p=o.hp/o.maxHp;for(let i=0;i<thresholds.length;i++)if(p<=thresholds[i])return thresholds.length-i;return 0;}
    function damage(o,amount,type='wall',damageType='physical'){
      const def=definition(type);if(!o||!def||!Number.isFinite(amount)||amount<=0||o.hp<=0)return false;
      const received=Math.max(0,amount-def.armor)*(1-clamp(def.resistances[damageType]||0,0,1));
      if(!received)return false;o.hp=Math.max(0,o.hp-received);o.hitAt=performance.now();return true;
    }
    function restoreHP(o,amount){if(!o||!Number.isFinite(amount)||amount<=0)return 0;const n=Math.max(0,Math.min(amount,o.maxHp-o.hp));o.hp+=n;return n;}
    return {levels,costs,repair,types,definition,stage,damage,restoreHP};
  })();
  let northOpen=false,commandNorthOpen=false,commandSouthOpen=true,validating=false,revision=0;
  const legacyRooms=[
    {id:'storage',name:'СКЛАД',x:285,y:263,w:280,h:132,entry:'S'},
    {id:'fuel',name:'ТОПЛИВО',x:1035,y:263,w:280,h:132,entry:'S'},
    {id:'workshop',name:'МАСТЕРСКАЯ',x:285,y:453,w:280,h:308,entry:'E'},
    {id:'power',name:'ЭНЕРГОБЛОК',x:285,y:830,w:340,h:125,entry:'E'},
    {id:'medbay',name:'МЕДПУНКТ',x:1035,y:830,w:280,h:125,entry:'W'}
  ];
  const rooms=[],retiredSections=new Map();
  function add(id,x,y,w,h,hp,group,side,gate=null){const o={id,x,y,w,h,maxHp:hp,hp,group,side,gate,hitAt:-1e6};sections.push(o);byId.set(id,o);return o;}
  function span(id,x,y,w,h,count,hp,group,side){for(let i=0;i<count;i++)add(id+'_'+i,x+(w>h?w*i/count:0),y+(h>=w?h*i/count:0),w>h?w/count:w,h>=w?h/count:h,hp,group,side);}
  V020Walls.create(add);
  const legacyLayout=new Map(V020Walls.oldLayout().map(o=>[o.id,o]));
  Object.assign(surface.inner,{thickness:32});
  for(const [side,y] of [['N',420],['S',728]]){
    add('v015command'+side+'L',610,y,140,32,INNER_HP,'inner',side);
    add('v015command'+side+'R',850,y,140,32,INNER_HP,'inner',side);
    add('v015commandGate'+side,750,y,100,32,INNER_HP,'inner',side,'command'+side);
  }
  span('v015commandW',610,452,32,276,3,INNER_HP,'inner','W');
  span('v015commandE',958,452,32,276,3,INNER_HP,'inner','E');
  // The five small surface enclosures are removed. Recognize their exact old
  // IDs only when importing 0.15 saves; never keep invisible retired colliders.
  for(const r of legacyRooms)for(const side of ['N','S','W','E']){
    if(side===r.entry)for(const part of ['a','b'])retiredSections.set('v015room_'+r.id+side+part+'_0',ROOM_HP);
    else for(let i=0;i<3;i++)retiredSections.set('v015room_'+r.id+side+'_'+i,ROOM_HP);
  }
  for(const o of sections)if(o.group==='inner')legacyLayout.set(o.id,{...o,legacyMaxHp:o.maxHp});
  const props=[];
  function prop(id,x,y,w,h,art,variant=0){const p={id:'v015prop_'+id,kind:'baseDecor015',x,y,w,h,art,variant};props.push(p);return p;}
  prop('coveredPallet',455,213,92,64,'tarp',0);prop('cases',565,215,62,43,'cases',1);
  prop('pipeRack',1010,214,156,57,'pipes');prop('barrels',1210,217,38,78,'barrels');
  prop('spares',251,478,47,58,'cases',2);
  prop('pallet',457,943,77,46,'pallet');prop('cableReel',569,946,43,43,'reel');
  prop('coveredTrailer',1020,945,87,42,'tarp',1);prop('cart',1190,924,52,65,'cart');
  prop('caseInner',650,641,62,37,'cases',0);prop('palletInner',880,640,65,38,'pallet');
  Object.assign(V09World.well,{x:690,y:901});
  // The former courtyard car overlaps the southeast bay. Retain its ID,
  // loot and renewal state, and park it immediately east of the fortress.
  for(const o of sections){o.legacyMaxHp=o.maxHp;o.level=1;o.maxHp=health.levels[1];o.hp=o.maxHp;}
  const yardCar=scavenges.find(o=>o.id==='yard_car');if(yardCar)Object.assign(yardCar,{x:1510,y:910});
  // Keep every resource ID/quantity intact, moving the handful of courtyard
  // trees onto the northern verge instead of leaving trees through new rooms.
  let treeIndex=0;for(const t of worldTrees)if(inFortress(t.x,t.y)){t.x=280+(treeIndex%7)*155;t.y=25-Math.floor(treeIndex/7)*95;treeIndex++;}
  function isOpen(o){return o.gate==='south'?gateOpen:o.gate==='airlock'?V091Fortress.innerGateOpen:o.gate==='north'?northOpen:o.gate==='commandN'?commandNorthOpen:o.gate==='commandS'?commandSouthOpen:false;}
  const alive=o=>o.hp>0;
  function walls(){return sections.filter(o=>alive(o)&&!isOpen(o));}
  surfaceWalls=walls;
  const previousSolids=solidObjects;
  solidObjects=function(which){const a=previousSolids(which);return which==='surface'?[...a.filter(o=>o.id!=='yard_generator'&&!o.id?.startsWith('v091tower')&&!/^tower\d+$/.test(o.id||'')),...props]:a;};
  function stage(o){return health.stage(o,o.gate?'gate':'wall');}
  function deckPresent(x,y,snapshot){
    const hp=o=>snapshot?snapshot.get(o.id):o.hp;
    return sections.some(o=>V020Walls.perimeter(o)&&hp(o)>0&&x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h);
  }
  function changed(){revision++;invalidateGeometry();queueGameSave();}
  function damage(id,amount,damageType='physical'){
    const o=typeof id==='string'?byId.get(id):id;if(!o||!byId.has(o.id)||!Number.isFinite(amount)||amount<=0||o.hp<=0||isOpen(o))return false;
    if(!health.damage(o,amount,o.gate?'gate':'wall',damageType))return false;GameAudio.play(o.hp?'constructionHit':'constructionBreak',{x:o.x,y:o.y,scene:'surface',dayXLeak:o.group==='outer'});
    if(o.hp===0){changed();if(scene==='surface'&&player.wallLevel&&!V091Fortress.transitioning&&V091Fortress.elevatedCollision(player.x,player.y,player.radius)){player.wallLevel=false;V091Fortress.cancelRoute();const landing=V020Walls.inwardSafePoint(player.x,player.y,player.radius);if(landing)Object.assign(player,landing);else settle(player);}
      if(scene==='surface'&&distance(player.x,player.y,o.x+o.w/2,o.y+o.h/2)<800)message('Пролом в '+(o.group==='outer'?'периметре':o.group==='room'?'стене помещения':'укреплении'));
    }else queueGameSave();return true;
  }
  function toggle(o){if(!o?.gate||o.hp<=0)return false;if(o.gate==='south'){toggleGate();return true;}if(o.gate==='airlock'){V091Fortress.toggleInnerGate();return true;}
    if(isOpen(o)&&((scene==='surface'&&rectHit(player.x,player.y,player.radius+3,o))||zombies.some(z=>z.alive&&rectHit(z.x,z.y,z.radius+3,o))||(!V014Robots.state.packed&&V014Robots.state.scene==='surface'&&rectHit(V014Robots.state.x,V014Robots.state.y,14,o)))){message('Проход занят');return false;}
    if(o.gate==='north')northOpen=!northOpen;else if(o.gate==='commandN')commandNorthOpen=!commandNorthOpen;else commandSouthOpen=!commandSouthOpen;GameAudio.play(isOpen(o)?'gateOpen':'gateClose',{x:o.x,y:o.y,scene:'surface'});changed();updateAction();return true;
  }
  // Bound the new AI to nearby surface walls. The existing distant-world AI,
  // enemy movement speeds, damage and attack cooldowns are retained.
  function rayEntry(a,b,o,pad=0){let lo=0,hi=1;for(const [axis,size] of [['x','w'],['y','h']]){const d=b[axis]-a[axis],low=o[axis]-pad,high=o[axis]+o[size]+pad;if(Math.abs(d)<1e-8){if(a[axis]<low||a[axis]>high)return null;}else{let t=(low-a[axis])/d,u=(high-a[axis])/d;if(t>u)[t,u]=[u,t];lo=Math.max(lo,t);hi=Math.min(hi,u);if(lo>hi)return null;}}return lo;}
  function blocker(a,b,pad=0){let best=null,t=Infinity;for(const o of walls()){const n=rayEntry(a,b,o,pad);if(n!==null&&n<t){t=n;best=o;}}return best?{wall:best,t}:null;}
  function contactDistance(a,o){return Math.hypot(a.x-clamp(a.x,o.x,o.x+o.w),a.y-clamp(a.y,o.y,o.y+o.h));}
  function moveZombie(z,p,step){
    const d=distance(z.x,z.y,p.x,p.y);if(d<1)return true;const angle=Math.atan2(p.y-z.y,p.x-z.x),sign=z.turnSign||1;
    for(const offset of [0,.4*sign,-.4*sign,.85*sign,-.85*sign,1.3*sign,-1.3*sign]){const dx=Math.cos(angle+offset),dy=Math.sin(angle+offset),length=Math.min(step,d);let ok=true;
      for(let t=Math.min(2,length);t<=length+1.99;t+=2){const n=Math.min(t,length);if(worldCollision(z.x+dx*n,z.y+dy*n,z.radius,'surface')){ok=false;break;}}
      if(ok){z.x+=dx*length;z.y+=dy*length;if(offset)z.turnSign=Math.sign(offset);return true;}}
    return false;
  }
  function breachRoute(o,z){const nx=o.side==='W'?-1:o.side==='E'?1:0,ny=o.side==='N'?-1:o.side==='S'?1:0,cx=o.x+o.w/2,cy=o.y+o.h/2,half=nx?o.w/2:o.h/2,r=z.radius+9;
    let outside={x:cx+nx*(half+r),y:cy+ny*(half+r)},inside={x:cx-nx*(half+r+20),y:cy-ny*(half+r+20)};
    if(distance(z.x,z.y,inside.x,inside.y)<distance(z.x,z.y,outside.x,outside.y))[outside,inside]=[inside,outside];return [outside,inside];
  }
  function siege(z,type,now,scale,strength){
    if(window.V017Monsters&&!V017Monsters.isDayX())return false;
    const d=distance(z.x,z.y,player.x,player.y);if(d>950)return false;
    const noise=V010World.noise,heard=now-noise.at<650&&distance(z.x,z.y,noise.x,noise.y)<noise.radius;
    const active=z.state==='chase'||z._baseUntil>now||heard||(inFortress(player.x,player.y)&&d<950);
    if(!active)return false;
    const speed=type.chaseSpeed*.5*Math.min(3,Math.max(0,scale));
    if(z._baseRoute?.length){const p=z._baseRoute[0];if(distance(z.x,z.y,p.x,p.y)<6)z._baseRoute.shift();else if(!moveZombie(z,p,speed)){z._baseStall=(z._baseStall||0)+scale;if(z._baseStall>120){z._baseRoute=null;z._baseStall=0;}}else z._baseStall=0;
      z.state='chase';z.lastKnown={x:player.x,y:player.y};z.alertUntil=now+5500;z._baseUntil=now+5500;return true;}
    const hit=blocker(z,player,z.radius+1);if(!hit)return false;const o=hit.wall;
    if(contactDistance(z,o)>380&&!heard&&z.state!=='chase')return false;
    z.state='chase';z.lastKnown={x:player.x,y:player.y};z.alertUntil=now+5500;z._baseUntil=now+5500;
    // Reuse a nearby existing breach instead of attacking another intact panel.
    if(!inFortress(z.x,z.y)&&inFortress(player.x,player.y)&&now>(z._baseSearchAt||0)){
      z._baseSearchAt=now+1000;
      let choice=null,cost=contactDistance(z,o)+125;
      for(const b of sections)if((b.group==='outer'||b.gate==='north'||b.gate==='south')&&(b.hp===0||isOpen(b))){const route=breachRoute(b,z),dist=distance(z.x,z.y,route[0].x,route[0].y);if(dist<cost&&!worldCollision(route[0].x,route[0].y,z.radius,'surface')&&lineClear(z.x,z.y,route[0].x,route[0].y,z.radius,'surface')){cost=dist;choice=route;}}
      if(choice){z._baseRoute=choice;return true;}
    }
    if(contactDistance(z,o)<=z.radius+14){if(now-(z.lastAttack||0)>=type.cooldown){z.lastAttack=now;damage(o,type.damage*strength);if(!o.hp)z._baseRoute=breachRoute(o,z);}return true;}
    // Stop just before the first wall intersecting the route. This keeps the
    // attack point on this zombie's side, including internal partitions.
    const t=Math.max(0,hit.t-3/Math.max(1,d)),p={x:z.x+(player.x-z.x)*t,y:z.y+(player.y-z.y)*t};moveZombie(z,p,speed);return true;
  }
  function freePoint(x,y,r){if(!worldCollision(x,y,r,'surface'))return{x,y};for(let d=8;d<=640;d+=8)for(let i=0;i<32;i++){const a=i*Math.PI/16,p={x:x+Math.cos(a)*d,y:y+Math.sin(a)*d};if(!worldCollision(p.x,p.y,r+1,'surface'))return p;}return null;}
  function settle(actor,r=actor.radius||12){const p=freePoint(actor.x,actor.y,r);if(p)Object.assign(actor,p);}
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){const old=oldInteractions(which);if(which!=='surface')return old;
    return [...old.filter(o=>o.id!=='yard_generator'&&o.id!=='v091innerGate'&&o.id!=='v015northGate'&&!o.id?.startsWith('v015prop_')&&!(byId.has(o.id)&&byId.get(o.id).hp===0)),...sections.filter(o=>o.gate&&!['south','airlock'].includes(o.gate)&&o.hp>0).map(o=>({...o,kind:'baseGate015',name:isOpen(o)?'Закрыть ворота':'Открыть ворота',ref:o.id,range:64}))];};
  const oldExecute=executeInteraction;
  executeInteraction=function(o){if(o?.kind==='baseGate015'){if(canInteract(o,player.x,player.y))toggle(byId.get(o.ref));return;}
    if(o?.id?.startsWith('v015prop_'))return;
    return oldExecute(o);};
  const HP_LEVELS=health.levels;
  function capture(){return{schema:4,northOpen:false,commandNorthOpen,commandSouthOpen,sections:sections.map(o=>({id:o.id,hp:o.hp,level:o.level}))};}
  function validate(d){
    if(d===undefined||d===null)return true;
    const current=d.schema===4,legacy=d.schema===1;
    const layout=current?byId:legacyLayout,expected=layout.size+(legacy?retiredSections.size:0);
    if(![1,2,3,4].includes(d.schema)||!['northOpen','commandNorthOpen','commandSouthOpen'].every(k=>typeof d[k]==='boolean')||!Array.isArray(d.sections)||d.sections.length!==expected)throw Error('Некорректное состояние укреплений');
    const seen=new Set();for(const p of d.sections){
      const section=layout.get(p?.id),maxHp=d.schema>=3?(section&&Number.isInteger(p.level)&&p.level>=1&&p.level<HP_LEVELS.length?HP_LEVELS[p.level]:undefined):(section?.legacyMaxHp??(legacy?retiredSections.get(p?.id):undefined));
      if(maxHp===undefined||seen.has(p.id)||!Number.isFinite(p.hp)||p.hp<0||p.hp>maxHp)throw Error('Некорректная прочность секции');seen.add(p.id);
    }return true;
  }
  function normalizeSave(d){
    validate(d);if(!d||d.schema===4)return d;
    const values=new Map(d.sections.map(p=>[p.id,p]));
    function properties(old){const p=values.get(old.id),level=d.schema>=3?p.level:1,max=d.schema>=3?HP_LEVELS[level]:old.legacyMaxHp;return {level,ratio:clamp(p.hp/max,0,1)};}
    const merged=sections.map(o=>{
      let contributors=[];
      if(o.group==='inner'||o.id==='gate')contributors=[{old:legacyLayout.get(o.id),weight:1}];
      else for(const old of legacyLayout.values()){
        if(old.id==='v091innerGate'||old.id.startsWith('v015airlock')||old.id.startsWith('v015command'))continue;
        const weight=V020Walls.overlap(o,old);if(weight>0)contributors.push({old,weight});
      }
      const level=Math.max(1,...contributors.map(({old})=>properties(old).level));let hp=HP_LEVELS[level];
      if(contributors.length){const total=contributors.reduce((n,c)=>n+c.weight,0);hp=Math.round(HP_LEVELS[level]*contributors.reduce((n,c)=>n+properties(c.old).ratio*c.weight,0)/total);}
      return {id:o.id,level,hp};
    });
    return {schema:4,northOpen:false,commandNorthOpen:d.commandNorthOpen,commandSouthOpen:d.commandSouthOpen,sections:merged};
  }
  function migrateGame(d){
    if(!d?.base015||d.base015.schema===4)return d;
    const out={...d,base015:normalizeSave(d.base015)};
    if(d.v091?.fortress)out.v091={...d.v091,fortress:{...d.v091.fortress,innerGateOpen:true}};
    if(d.turret016)out.turret016={...d.turret016,guns:d.turret016.guns.map(t=>{
      if(t.fallen||!legacyLayout.has(t.wallId))return {...t};
      const eligible=sections.filter(o=>!o.gate&&['outer','inner'].includes(o.group));
      const p=eligible.find(o=>Math.hypot(t.x-clamp(t.x,o.x,o.x+o.w),t.y-clamp(t.y,o.y,o.y+o.h))<17.99);
      if(p)return {...t,wallId:p.id};
      // A removed gatehouse mount becomes a recoverable item on the ground.
      const landing=V020Walls.inwardSafePoint(t.x,t.y,12)||{x:800,y:960};
      return {...t,...landing,wallId:null,fallen:true};
    })};
    return out;
  }
  function restore(d){
    d=normalizeSave(d);const values=new Map(d?.sections.map(o=>[o.id,o]));
    for(const o of sections){const p=values.get(o.id);o.level=p?.level||1;o.maxHp=HP_LEVELS[o.level];o.hp=p?p.hp:o.maxHp;o.hitAt=-1e6;}
    northOpen=false;commandNorthOpen=d?.commandNorthOpen??false;commandSouthOpen=d?.commandSouthOpen??true;revision++;invalidateGeometry();
  }
  GameSave.extend('capture','base.structures',function(captureOld){const d=captureOld();d.base015=capture();return d;});
  GameSave.extend('decode','base.structures',function(decodeOld,raw){const probe=migrateGame(JSON.parse(raw));validate(probe.base015);validating=true;let d;try{d=decodeOld(JSON.stringify(probe));}finally{validating=false;}
    if(d.v091?.fortress?.wallLevel){const f=d.v091.fortress,hp=new Map((d.base015?.sections||sections).map(o=>[o.id,d.base015?o.hp:o.maxHp]));
      const fits=(p,contains)=>{for(let i=-1;i<24;i++){const r=i<0?0:player.radius+3,a=i*Math.PI/12;if(!contains(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r))return false;}return true;};
      if(!fits(f,(x,y)=>deckPresent(x,y,hp))){
        // Old corner platforms were wider. Move an existing valid tower save
        // to that same tower's new center, without rejecting an older game.
        const oldValid=!d.base015&&fits(f,(x,y)=>V091Fortress.decks.some(o=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h));
        const tower=oldValid?[...V091Fortress.corners].sort((a,b)=>distance(f.x,f.y,a.x,a.y)-distance(f.x,f.y,b.x,b.y))[0]:null;
        if(!tower||distance(f.x,f.y,tower.x,tower.y)>100)throw Error('Сохранение: разрушенный участок стены');
        f.x=tower.x;f.y=tower.y;d.player.x=f.x;d.player.y=f.y;
      }
    }
    return d;});
  GameSave.extend('restore','base.structures',function(restoreOld,d){d=migrateGame(d);restore(d.base015);restoreOld(d);
    if(scene==='surface'&&!player.wallLevel)settle(player);const drone=window.V014Robots?.state;if(drone&&!drone.packed&&drone.scene==='surface')settle(drone,12);
    for(const z of zombies){delete z._baseRoute;delete z._baseUntil;if(z.alive)settle(z,z.radius);}invalidateGeometry();});
  invalidateGeometry();
  // Rendering is supplied below; geometry and damage do not depend on images.
  const wallSprites=new Map(),lightShapes=new Map(),materials=new Map();let groundCache=null;
  const api={health,sections,rooms,props,byId,walls,isOpen,stage,damage,changed,toggle,deckPresent,rayEntry,blocker,siege,capture,validate,restore,migrateGame,normalizeSave,legacyLayout,freePoint,drawGround,drawFortifications,drawMap,inWorkshop:()=>false,get revision(){return revision;},get validating(){return validating;}};
  return api;

  function drawGround(){drawBaseFloor();drawProps();}
  function drawFortifications(){drawWalls();}
  function drawMap(c){c.fillStyle='#4d5956';c.fillRect(138,98,1324,1004);for(const r of rooms){c.fillStyle='#778276';c.fillRect(r.x,r.y,r.w,r.h);}for(const o of walls()){c.fillStyle=o.hp/o.maxHp>.5?'#c0c7b1':'#bb8d62';c.fillRect(o.x,o.y,o.w,o.h);}c.fillStyle='#182a2a';c.fillRect(765,555,70,70);}
  function canvasOf(w,h){const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(Math.ceil(w),Math.ceil(h)):document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
  function rect(c,x,y,w,h,fill,stroke=null,r=0){if(!w||!h)return;c.fillStyle=fill;c.beginPath();const radius=Math.max(0,Math.min(r,Math.abs(w)/2,Math.abs(h)/2));if(radius)c.roundRect(x,y,w,h,radius);else c.rect(x,y,w,h);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  function disk(c,x,y,r,color,stroke=null){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function label(c,text,x,y,size=12,color='#bcc5ba'){c.font=`600 ${size}px Arial`;c.textAlign='center';c.fillStyle=color;c.fillText(I18n.text(text),x,y);}
  function metal(c,x,y,w,h,dark=false){const g=c.createLinearGradient(x,y,x+w*.2,y+h);g.addColorStop(0,dark?'#515d5e':'#94a09b');g.addColorStop(.12,dark?'#3c494c':'#727d79');g.addColorStop(.85,dark?'#303b3e':'#596561');g.addColorStop(1,dark?'#263034':'#3b4848');rect(c,x,y,w,h,g,'#202b2f',2);line(c,[[x+2,y+2],[x+w-3,y+2]],'#c1cbb359',1);}
  function bolts(c,x,y,w,h){for(const px of [x+5,x+w-5])for(const py of [y+5,y+h-5]){disk(c,px,py,1.8,'#19262a');disk(c,px-.4,py-.5,1,'#bac3af');}}
  function material(kind){
    if(materials.has(kind))return materials.get(kind);
    const v=canvasOf(256,256),c=v.getContext('2d'),im=c.createImageData(256,256);
    const base=kind==='concrete'?[107,112,109]:kind==='slab'?[80,87,87]:[59,67,68];let seed=104729;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const grain=((seed>>>16)/65535-.5)*(kind==='concrete'?13:10)+Math.sin(x*.06+y*.013)*1.5+Math.cos(y*.11-x*.018);
      const i=(y*256+x)*4;im.data[i]=base[0]+grain;im.data[i+1]=base[1]+grain;im.data[i+2]=base[2]+grain;im.data[i+3]=255;
    }c.putImageData(im,0,0);
    // Fine aggregate, faint curing marks and occasional pinholes; no rust or
    // alternating checkerboard. All texture generation happens once.
    for(let i=0;i<220;i++){const x=(i*73+i*i*3)%256,y=(i*151+i*i*7)%256;rect(c,x,y,i%7===0?1.4:.65,.65,i%3?'#18272513':'#d9dcd31a');}
    materials.set(kind,v);return v;
  }
  function gridFloor(c,x,y,w,h,tile=160){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();rect(c,x,y,w,h,c.createPattern(material('paving'),'repeat'));
    const stepX=Math.max(105,tile),stepY=stepX*.72;
    for(let yy=y;yy<y+h;yy+=stepY)for(let xx=x;xx<x+w;xx+=stepX){
      const ww=Math.min(stepX,x+w-xx),hh=Math.min(stepY,y+h-yy),tone=((Math.round(xx)*13+Math.round(yy)*7)%7)/600;
      rect(c,xx+1,yy+1,Math.max(0,ww-2),Math.max(0,hh-2),'rgba(216,221,206,'+tone+')');
      line(c,[[xx,yy+hh],[xx,yy],[xx+ww,yy]],'#1829265c',1.1);line(c,[[xx+1,yy+hh-1],[xx+1,yy+1],[xx+ww-1,yy+1]],'#ced5c01c',.8);
    }c.restore();
  }
  function floorCache(){
    if(groundCache)return groundCache;const c=canvasOf(1340,1100),p=c.getContext('2d');p.translate(-130,-90);
    rect(p,156,116,1288,968,'#243330',null,5);gridFloor(p,170,130,1260,940,182);
    // Quiet cast-concrete access lanes and inset perimeter drains.
    for(const [x,y,w,h]of [[730,202,140,218],[730,760,140,410]]){
      rect(p,x,y,w,h,p.createPattern(material('slab'),'repeat'));
      for(let yy=y+126;yy<y+h;yy+=126){line(p,[[x,yy],[x+w,yy]],'#22322e52',1);line(p,[[x,yy+1],[x+w,yy+1]],'#d7decc26');}
      line(p,[[x+8,y+8],[x+8,y+h-8]],'#ccd1b34d',2);line(p,[[x+w-8,y+8],[x+w-8,y+h-8]],'#ccd1b34d',2);
    }
    for(const r of rooms){
      rect(p,r.x+8,r.y+8,r.w-16,r.h-16,p.createPattern(material('slab'),'repeat'));
      for(let yy=r.y+120;yy<r.y+r.h-10;yy+=120)line(p,[[r.x+10,yy],[r.x+r.w-10,yy]],'#22322e40',1);
      for(let xx=r.x+135;xx<r.x+r.w-12;xx+=135)line(p,[[xx,r.y+9],[xx,r.y+r.h-9]],'#25332d40',1);
      const edge=p.createLinearGradient(r.x,r.y,r.x,r.y+20);edge.addColorStop(0,'#0a1a214d');edge.addColorStop(1,'#0a1a2100');rect(p,r.x+12,r.y+12,r.w-24,19,edge);
    }
    gridFloor(p,642,452,316,276,140);
    // Central access hatch keeps its original world coordinates and interaction.
    rect(p,751,541,98,98,'#19282b','#8c9c8c',3);metal(p,760,550,80,80,true);rect(p,770,560,60,60,'#111e23','#758778');
    for(let y=565;y<620;y+=9){line(p,[[775,y],[825,y]],'#4e5f5b',3);line(p,[[775,y-1],[825,y-1]],'#a8aa8255');}
    for(const [x,y] of [[755,545],[833,545],[755,623],[833,623]]){rect(p,x,y,12,12,'#8e8a66','#1b2e30');disk(p,x+6,y+6,2,'#223637');}
    label(p,'Б У Н К Е Р',800,651,9,'#bbc2b3');
    // Recessed service covers sit flush with the open yard; no parking cages.
    for(const [x,y]of [[438,590],[1148,436]]){rect(p,x,y,57,44,'#354247','#66767277',2);for(let i=7;i<53;i+=8)line(p,[[x+i,y+7],[x+i,y+37]],'#17272e99',2);bolts(p,x,y,57,44);}
    for(const y of [225,975])for(let x=301;x<1300;x+=22){rect(p,x,y,18,7,'#20302ed9');line(p,[[x,y],[x+18,y]],'#a7b4a450');for(let j=3;j<17;j+=4)line(p,[[x+j,y+2],[x+j,y+6]],'#6e7f7180');}
    for(const [x,y] of [[676,793],[918,790],[657,229],[920,236]]){metal(p,x,y,25,31,true);for(let j=0;j<5;j++)line(p,[[x+5,y+6+j*4],[x+20,y+6+j*4]],'#899a8155');}
    groundCache=c;return c;
  }
  function drawBaseFloor(){ctx.drawImage(floorCache(),130,90);}
  function drawDecoration(p){
    const {x,y,w,h}=p;
    if(p.art.startsWith('car013_')){
      // Vehicle artwork faces up. Rotate horizontal parking slots, then fit
      // uniformly; the vehicle and its shadow always share the same footprint.
      ctx.save();ctx.translate(x+w/2,y+h/2);const horizontal=w>h;
      if(horizontal)ctx.rotate(Math.PI/2);
      const dw=horizontal?h:w,dh=horizontal?w:h,d=V011Art.fit(p.art,-dw/2,-dh/2,dw,dh);
      const sx=horizontal?7:4,sy=horizontal?-4:7;
      rect(ctx,d.x+d.w*.08+sx,d.y+d.h*.07+sy,d.w*.84,d.h*.87,'#101e2561',null,Math.min(13,d.w*.22));
      V011Art.draw(p.art,-dw/2,-dh/2,dw,dh);ctx.restore();
      return;
    }
    if(p.art==='pallet'||p.art==='tarp'){
      rect(ctx,x,y+3,w,h-3,'#383d31','#202c2a');
      for(let yy=5;yy<h-3;yy+=9){const g=ctx.createLinearGradient(x,y+yy,x,y+yy+7);g.addColorStop(0,'#968b6d');g.addColorStop(1,'#69694f');rect(ctx,x+2,y+yy,w-4,7,g);line(ctx,[[x+7,y+yy+2],[x+w-7,y+yy+3]],'#bdb19335');}
      if(p.art==='tarp'){
        ctx.save();ctx.beginPath();ctx.roundRect(x+3,y,w-6,h-7,4);ctx.clip();
        const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,p.variant?'#89988e':'#7f8d7c');g.addColorStop(.18,p.variant?'#65796f':'#616f58');g.addColorStop(.8,p.variant?'#53665e':'#4d5b48');g.addColorStop(1,'#37473e');rect(ctx,x+3,y,w-6,h-7,g);
        for(let i=0;i<7;i++){const xx=x+8+i*(w-16)/6;ctx.strokeStyle='#c8d4b923';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y+2);ctx.quadraticCurveTo(xx-4,y+h*.42,xx+(i%2?4:-5),y+h-7);ctx.stroke();}
        for(const f of [.22,.77]){rect(ctx,x+w*f,y,4,h-7,'#243d37ac');line(ctx,[[x+w*f+1,y+1],[x+w*f+1,y+h-8]],'#a2b5a644');metal(ctx,x+w*f-1,y+h*.5,7,7,true);}
        line(ctx,[[x+4,y+4],[x+w-6,y+4]],'#dbe0c739');ctx.restore();
      }return;
    }
    if(p.art==='cases'){
      const cols=p.variant===1?2:1,rows=p.variant===2?2:1,cw=w/cols-3,ch=h/rows-3;
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const xx=x+i*(cw+3),yy=y+j*(ch+3);metal(ctx,xx,yy,cw,ch,true);rect(ctx,xx+5,yy+5,cw-10,ch-10,'#586661','#96a69755',2);
        for(const k of [.2,.8]){rect(ctx,xx+cw*k-1,yy+1,3,ch-2,'#a2aaa066');rect(ctx,xx+cw*k-2,yy+ch*.55,5,5,'#273934','#aab5a06b');}rect(ctx,xx+cw*.4,yy+ch*.4,cw*.2,3,'#233933');}
      return;
    }
    if(p.art==='pipes'){
      metal(ctx,x,y+4,w,h-8,true);
      for(let yy=y+8;yy<y+h-5;yy+=10){const g=ctx.createLinearGradient(x,yy,x,yy+8);g.addColorStop(0,'#3a4b4a');g.addColorStop(.34,'#c2cac3');g.addColorStop(.6,'#7e918a');g.addColorStop(1,'#364c47');rect(ctx,x+4,yy,w-8,8,g);disk(ctx,x+w-5,yy+4,3,'#354643','#97aba0');}
      for(const xx of [x+22,x+w-27]){rect(ctx,xx,y,5,h,'#394c468f');line(ctx,[[xx+1,y+1],[xx+1,y+h-1]],'#bec6b991');}return;
    }
    if(p.art==='barrels'){
      for(let i=0;i<2;i++){const xx=x+w/2,yy=y+18+i*38;disk(ctx,xx+3,yy+4,17,'#182b2a66');disk(ctx,xx,yy,17,'#576e68','#a7b8a4');disk(ctx,xx,yy,13,'#6d8275','#374c46');disk(ctx,xx-7,yy-5,3,'#2b433e','#a0af96');line(ctx,[[xx-8,yy+9],[xx+7,yy+9]],'#b3baa547');}return;
    }
    if(p.art==='reel'){
      disk(ctx,x+w/2+3,y+h/2+4,w*.49,'#0d212252');disk(ctx,x+w/2,y+h/2,w*.48,'#777c65','#bbc1a2');
      for(let r=w*.35;r>5;r-=2.3){ctx.strokeStyle=r%4>2?'#374a43':'#233a37';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w/2,y+h/2,r,0,Math.PI*2);ctx.stroke();}disk(ctx,x+w/2,y+h/2,5,'#a5ab87','#343f38');return;
    }
    if(p.art==='cart'){
      for(const xx of [x+3,x+w-8])for(const yy of [y+8,y+h-17])rect(ctx,xx,yy,6,12,'#172d2a',null,2);
      metal(ctx,x+6,y+6,w-12,h-14,true);rect(ctx,x+11,y+11,w-22,h-24,'#6f7e73','#a8b5a350');line(ctx,[[x+9,y+10],[x+9,y],[x+w-9,y],[x+w-9,y+10]],'#a5b4a0',3);
    }
  }
  function drawProps(){
    ctx.save();
    for(const p of props){if(!visibleOnScreen(p.x+p.w/2,p.y+p.h/2,120))continue;
      // A contact shadow and one offset cast shadow, never a black frame.
      if(!p.art.startsWith('car013_'))rect(ctx,p.x+6,p.y+9,p.w*.95,p.h*.88,'#0b19234d',null,5);
      drawDecoration(p);
    }
    // Top-down stainless well housing, with the same water collection action.
    const w=V09World.well;rect(ctx,w.x-24+7,w.y-25+10,48,50,'#081e284d',null,8);metal(ctx,w.x-24,w.y-25,48,50);disk(ctx,w.x,w.y,17,'#293d42','#afc3b4');disk(ctx,w.x,w.y,12,'#4f8190');disk(ctx,w.x-4,w.y-4,4,'#b2e4dc80');line(ctx,[[w.x,w.y-18],[w.x,w.y-28],[w.x+22,w.y-28]],'#a5b6ac',5);label(ctx,'ВОДА',w.x,w.y+39,8);
    drawLights(false);ctx.restore();
  }
  function wallSprite(o){
    const level=stage(o),vertical=o.h>o.w,key=[o.w,o.h,level,o.group,vertical].join(':');if(wallSprites.has(key))return wallSprites.get(key);
    const v=canvasOf(o.w+28,o.h+28),c=v.getContext('2d');c.translate(3,3);
    if(level===4){
      // Low broken fragments remain a visual trace; they have no collision.
      for(let i=0;i<7;i++){const x=6+(i*37)%(Math.max(12,o.w-12)),y=4+(i*19)%(Math.max(8,o.h-8));c.fillStyle=i%2?'#7f897a':'#46544e';c.beginPath();c.moveTo(x,y);c.lineTo(x+6,y-3);c.lineTo(x+11,y+4);c.lineTo(x+2,y+7);c.closePath();c.fill();}wallSprites.set(key,v);return v;
    }
    const thickness=Math.min(o.w,o.h),slim=thickness<24,inset=Math.min(12,thickness*.21);
    // Section detail scales with real thickness: a 32-unit inner wall never
    // receives the former fixed 36-unit inset (negative rectangle/radius).
    rect(c,8,11,o.w,o.h,'#07172238',null,1);rect(c,3,5,o.w,o.h,'#15242140',null,1);
    rect(c,0,0,o.w,o.h,c.createPattern(material('concrete'),'repeat'),'#3d4c45',1);
    const bevel=c.createLinearGradient(0,0,o.w*.23,o.h);bevel.addColorStop(0,'#edf0d729');bevel.addColorStop(.35,'#d7e0ce05');bevel.addColorStop(1,'#152d2648');rect(c,1,1,o.w-2,o.h-2,bevel);
    line(c,[[.5,o.h-1],[.5,.5],[o.w-1,.5]],'#d1d7c38a',1.2);
    rect(c,0,o.h-3,o.w,3,'#475b4e');rect(c,o.w-3,3,3,o.h-3,'#556458');
    if(slim){line(c,vertical?[[o.w*.44,3],[o.w*.44,o.h-3]]:[[3,o.h*.44],[o.w-3,o.h*.44]],'#e3e6d345',1);}
    else{
      rect(c,inset,inset,o.w-inset*2,o.h-inset*2,'#66766b','#45584e',1);
      const edge=Math.min(4,inset*.4);
      if(vertical){rect(c,inset+edge,inset+2,Math.max(1,o.w-inset*2-edge*2),o.h-inset*2-4,c.createPattern(material('slab'),'repeat'));
        for(let yy=24;yy<o.h-12;yy+=35)line(c,[[inset+3,yy],[o.w-inset-3,yy]],'#233b3030',.7);
      }else{rect(c,inset+2,inset+edge,o.w-inset*2-4,Math.max(1,o.h-inset*2-edge*2),c.createPattern(material('slab'),'repeat'));
        for(let xx=24;xx<o.w-12;xx+=35)line(c,[[xx,inset+3],[xx,o.h-inset-3]],'#233b3030',.7);}
      for(const at of [4,(vertical?o.h:o.w)-8]){if(vertical)metal(c,2,at,o.w-4,4,true);else metal(c,at,2,4,o.h-4,true);}
      bolts(c,2,2,o.w-4,o.h-4);
    }
    if(level){c.save();c.beginPath();c.rect(1,1,o.w-2,o.h-2);c.clip();
      for(let i=0;i<level+1;i++){const along=(i+1)/(level+2),x=vertical?o.w*.2:o.w*along,y=vertical?o.h*along:o.h*.18,pts=vertical?[[x,y],[o.w*.42,y-3],[o.w*.56,y+7],[o.w*.78,y+3],[o.w*.97,y+9]]:[[x,y],[x-4,o.h*.38],[x+6,o.h*.56],[x-3,o.h*.74],[x+8,o.h*.98]];
        line(c,pts.map(([a,b])=>[a+1,b+1]),'#c7b995aa',level+1);line(c,pts,'#14212a',level*1.05+.6);line(c,[pts[1],[pts[1][0]+12,pts[1][1]-10]],'#203132',1.2);}
      if(level===3){c.fillStyle='#192a32';for(let i=0;i<5;i++){const x=4+(i*41)%(o.w-8),y=4+(i*17)%(o.h-8);c.fillRect(x,y,5,3);}}c.restore();
    }
    wallSprites.set(key,v);return v;
  }
  function gateArt(o){
    if(o.hp<=0){ctx.drawImage(wallSprite(o),o.x-3,o.y-3);return;}
    rect(ctx,o.x,o.y,o.w,o.h,'#263b3e','#91a19655');for(let y=o.y+5;y<o.y+o.h-2;y+=8)line(ctx,[[o.x+5,y],[o.x+o.w-5,y]],'#73847455');
    const open=isOpen(o),half=open?10:o.w/2-2;
    metal(ctx,o.x,o.y,half,o.h,true);metal(ctx,o.x+o.w-half,o.y,half,o.h,true);
    for(const x of [o.x+4,o.x+o.w-8]){rect(ctx,x,o.y+4,4,Math.max(2,o.h-8),'#808d79');disk(ctx,x+2,o.y+o.h/2,2,open?'#a2dbbe':'#d7af71');}
    if(!open){line(ctx,[[o.x+o.w/2,o.y+3],[o.x+o.w/2,o.y+o.h-3]],'#0f242a',3);for(const x of [o.x+20,o.x+o.w-28]){rect(ctx,x,o.y+5,8,o.h-10,'#a69a6b');for(let y=o.y+7;y<o.y+o.h-5;y+=10)line(ctx,[[x,y],[x+8,y+5]],'#303e3c',3);}
      if(stage(o)>0){line(ctx,[[o.x+o.w*.24,o.y],[o.x+o.w*.4,o.y+o.h*.42],[o.x+o.w*.32,o.y+o.h]],'#12272d',stage(o)+1);if(stage(o)>1)line(ctx,[[o.x+o.w*.75,o.y],[o.x+o.w*.63,o.y+o.h*.61],[o.x+o.w*.88,o.y+o.h]],'#12272d',stage(o)+1);}}
  }
  function drawWalls(){ctx.save();
    for(const o of sections){if(!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)+35))continue;if(o.gate)gateArt(o);else if(o.group==='outer')V020Walls.drawWall(o);else ctx.drawImage(wallSprite(o),o.x-3,o.y-3);}
    for(const t of V091Fortress.stairs)V020Walls.drawStairs(t);
    drawLights(true);
    for(const o of sections){if(heldItem()==='hammer'||o.hp<=0||o.hp>=o.maxHp||!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,160))continue;const near=distance(player.x,player.y,o.x+o.w/2,o.y+o.h/2)<125,recent=performance.now()-o.hitAt<1900;if(!near&&!recent)continue;const x=o.x+o.w/2,y=o.y-14,w=52;rect(ctx,x-w/2,y,w,4,'#172b30dd',null,2);rect(ctx,x-w/2,y,w*o.hp/o.maxHp,4,o.hp/o.maxHp<=.2?'#d1886b':'#d5bb87',null,2);label(ctx,Math.ceil(o.hp)+' / '+o.maxHp,x,y-4,8,'#d7dfd1');}
    ctx.restore();
  }
  function fixtures(){const result=[];
    for(const o of sections){if(o.group==='outer'&&Number(o.id.split('_').at(-1))%2===1){const nx=o.side==='W'?1:o.side==='E'?-1:0,ny=o.side==='N'?1:o.side==='S'?-1:0;result.push({id:o.id,wall:o,x:o.x+o.w/2+nx*(o.w/2+3),y:o.y+o.h/2+ny*(o.h/2+3),angle:Math.atan2(ny,nx),range:180,device:o.x<800?'spot_left':'spot_right'});}}
    for(const r of rooms){const o=byId.get('v015room_'+r.id+'N_1');result.push({id:r.id,wall:o,x:r.x+r.w/2,y:r.y+16,angle:Math.PI/2,range:120,device:r.x<800?'spot_left':'spot_right'});}
    return result;
  }
  function lightPolygon(s){const key=s.id+':'+geometryRevision;if(lightShapes.has(key))return lightShapes.get(key);if(lightShapes.size>180)lightShapes.clear();const points=[];
    for(let i=0;i<=18;i++){const a=s.angle-.69+i*1.38/18,dx=Math.cos(a),dy=Math.sin(a);let d=3;for(;d<s.range;d+=8)if(worldCollision(s.x+dx*d,s.y+dy*d,1,'surface',s.wall.id))break;points.push([s.x+dx*Math.min(s.range,d),s.y+dy*Math.min(s.range,d)]);}
    lightShapes.set(key,points);return points;
  }
  function drawLights(hardware){if(window.V016Lighting)return V016Lighting.drawFixtures(hardware);for(const s of fixtures()){if(s.wall.hp<=0||!visibleOnScreen(s.x,s.y,s.range+20))continue;const on=devicePowered(s.device);
    if(!hardware&&on){ctx.save();ctx.beginPath();ctx.moveTo(s.x,s.y);for(const [x,y] of lightPolygon(s))ctx.lineTo(x,y);ctx.closePath();ctx.clip();const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.range);g.addColorStop(0,'#ffe7a961');g.addColorStop(.35,'#ffe5a126');g.addColorStop(1,'#ffe7ad00');rect(ctx,s.x-s.range,s.y-s.range,s.range*2,s.range*2,g);ctx.restore();}
    if(hardware){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle-Math.PI/2);rect(ctx,-8,-9,16,13,'#233b40','#8faaa2',2);rect(ctx,-6,1,12,3,on?'#ffe4a7':'#688781',null,1);if(on){const g=ctx.createRadialGradient(0,4,0,0,4,12);g.addColorStop(0,'#ffe3a950');g.addColorStop(1,'#ffe3a900');rect(ctx,-12,-8,24,24,g);}ctx.restore();}}
  }
})();

