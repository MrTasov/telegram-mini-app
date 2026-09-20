/* 0.14: one persistent companion, shared powered dock, atomic cargo transfers. */
window.V014Robots=(()=>{
  // The legacy singleton instance happens to share its spelling with the type.
  // Never infer an instance ID from a content ID.
  const TYPE='drone014',INSTANCE_ID='drone014';
  ITEM[TYPE]={name:'Дрон-компаньон',icon:'🛸',robot:true,description:'Заряд, улучшения и весь груз сохраняются внутри. Можно запустить рядом с собой.',drone:{
    instanceId:INSTANCE_ID,upgrades:V010Combat.upgradeRules.drone,
    modules:{body:'Корпус',battery:'Аккумулятор',cargo:'Контейнер',weapon:'Оружие',engine:'Двигатель'},
    combat:{ammoType:'ammo',capacity:600,damage:20,damagePerLevel:.2,intervalMs:155,range:270},
    repair:{material:'parts',durabilityPerUnit:25},
    body:{hp:100,hpPerLevel:25,armorPerLevel:6},cargo:{base:12,levelStride:2,perStride:6},
    battery:{factor:2.5,perLevel:.3,chargeSeconds:180,shotCost:.025,idleDrain:.08,lightDrain:.018,blockedDrain:.003},
    movement:{radius:10,followSpeed:490,travelSpeed:290,perLevel:18,minFollowSpeed:235,playerFactor:1.13,catchupDistance:90,catchupFactor:1.4,acceleration:850,brake:900,deceleration:1000}
  }};
  const definition=ITEM[TYPE].drone,copy=x=>JSON.parse(JSON.stringify(x)),labels=definition.modules,levels=Object.keys(labels);
  const ownsToken=s=>s?.type===TYPE&&s.robotId===INSTANCE_ID;
  // `carry` was the old label in early saves.  Keep it as a migration alias,
  // but show the clearer user-facing mode "Преследование".
  const modes={follow:'Следовать',carry:'Следовать',defense:'Защита',attack:'Атака'};
  const DOCK={id:'robots014_dock',kind:'robots014_dock',name:'Станция дрона',x:1190,y:650,w:148,h:86,range:65,detectionRadius:52,watts:1,returnThreshold:15};
  const combat=Object.freeze({get ammoType(){return definition.combat.ammoType;},get capacity(){return definition.combat.capacity;},get damage(){return Math.round(definition.combat.damage*(1+state.modules.weapon*definition.combat.damagePerLevel));},get intervalMs(){return definition.combat.intervalMs;},get range(){return definition.combat.range;}});
  function dockPosition(){return {x:DOCK.x+74,y:DOCK.y+45,scene:'bunker'};}
  function defaults(){return {schema:1,id:INSTANCE_ID,name:'Спутник',...dockPosition(),battery:100,hp:100,ammo:30,packed:false,mode:'defense',combatMode:'defense',resumeTask:null,task:'docked',modules:{body:0,battery:0,cargo:0,weapon:0,engine:0},cargo:[],light:false,autoCollect:true,economy:true,guard:null,targetIndex:null,lowWarn:false,autoReturn:true};}
  const state=defaults();
  let targetId=null;
  Object.defineProperties(state,{
    targetId:{get:()=>targetId,set:id=>{targetId=id;}},
    targetIndex:{enumerable:true,get(){const i=zombies.findIndex(z=>z.instanceId===targetId);return i<0?null:i;},set(i){targetId=Number.isInteger(i)?zombies[i]?.instanceId??null:null;}}
  });
  let shot=0,hurt=0,saveClock=0,uiClock=0,angle=0,flash=0,tracer=null,lootSelection=-1,observedTarget=null;
  const motion=V0141DroneMotion.create(state,definition.movement);
  // Station detection does not require drone power. The charging pad is flat;
  // only the raised control cabinet blocks movement and pathfinding.
  const solids=solidObjects;solidObjects=function(which=scene){const a=solids(which);return which==='bunker'?[...a,{id:DOCK.id+'_body',x:DOCK.x+7,y:DOCK.y+7,w:26,h:DOCK.h-14}]:a;};
  const home={age:0,sample:0,still:0,stale:0,retries:0,pause:0,blocked:false,point:null,best:Infinity,level:null};
  let undocking=false;
  function resetReturn(){Object.assign(home,{age:0,sample:0,still:0,stale:0,retries:0,pause:0,blocked:false,point:null,best:Infinity,level:null});}
  function batteryFactor(modules=state.modules){return definition.battery.factor*(1+modules.battery*definition.battery.perLevel);}
  function chargeRate(){return (100/definition.battery.chargeSeconds)/batteryFactor();}
  function stationInfo(){
    const docked=atDock(),charging=docked&&state.battery<100&&devicePowered('robot_drone_charge');
    const status=state.packed?'DRONE_UNAVAILABLE':state.task==='docking'?'DOCKING':docked?(state.battery>=100?'FULLY_CHARGED':charging?'CHARGING':'NO_POWER'):state.task==='return'?'RETURNING':'NOT_DOCKED';
    return {status,docked,charging,blocked:home.blocked,battery:state.battery,name:state.name,watts:charging?DOCK.watts:0,eta:charging?Math.ceil((100-state.battery)/chargeRate()):null,autoReturn:state.autoReturn,threshold:DOCK.returnThreshold};
  }
  function beginDocking(){state.task='docking';state.targetId=null;state.guard=null;primaryCommand();clearRoute();resetReturn();changed();}
  function detectDock(dt){
    if(state.packed||state.scene!=='bunker')return;
    const p=dockPosition(),d=distance(state.x,state.y,p.x,p.y);
    if(undocking){if(d>DOCK.detectionRadius+16)undocking=false;else if(state.battery>0&&state.hp>0)return;else undocking=false;}
    if(state.task==='docked'){
      if(d<=2)return;
      state.task='disabled';
    }
    // Passive flying companions do not get captured on every pass. A disabled
    // drone, a returning drone or an explicitly placed drone can dock.
    if(d>DOCK.detectionRadius||!lineClear(state.x,state.y,p.x,p.y,10,'bunker'))return;
    if(state.task!=='docking'&&(state.task==='return'||state.task==='disabled'||state.battery<=0||state.hp<=0))beginDocking();
    if(state.task!=='docking')return;
    const n=Math.min(d,42*dt);if(d>0){state.x+=(p.x-state.x)*n/d;state.y+=(p.y-state.y)*n/d;}
    if(d<=n+.001){Object.assign(state,p);state.task='docked';state.lowWarn=false;changed();}
  }
  function install(){
    if(!stationNear()){message('Подойдите к станции с дроном в рюкзаке');return false;}
    const token=bag.find(ownsToken);
    if(!state.packed||!token){message('Сначала заберите дрон в рюкзак');return false;}
    const p=dockPosition();if(!lineClear(player.x,player.y,p.x,p.y,0,'bunker')){message('Подойдите к площадке станции со стороны свободного прохода');return false;}
    if(worldCollision(p.x,p.y,10,'bunker')){message('Площадка станции занята');return false;}
    // Explicit physical placement: consume the existing token, never create a
    // second state or reset cargo, health, ammunition or battery.
    bag[bag.indexOf(token)]=null;Object.assign(state,p,{packed:false});undocking=false;beginDocking();renderBag();return true;
  }
  function returnStep(dt){
    const p=dockPosition(),target=state.scene==='bunker'?p:{x:800,y:690},d=distance(state.x,state.y,target.x,target.y);
    if(home.level!==state.scene){resetReturn();home.level=state.scene;home.best=d;home.point={x:state.x,y:state.y};}
    if(home.pause>0){home.pause=Math.max(0,home.pause-dt);return;}
    if(sceneTravel(p,dt)){beginDocking();return;}
    home.age+=dt;home.sample+=dt;home.stale+=dt;
    if(d<home.best-12){home.best=d;home.stale=0;home.retries=0;home.blocked=false;}
    if(home.sample>=1){const moved=distance(state.x,state.y,home.point.x,home.point.y);home.still=moved<6?home.still+home.sample:0;home.sample=0;home.point={x:state.x,y:state.y};}
    // A detour can initially go away from the station. Require either a real
    // standstill or a long absence of route progress, not one bad distance tick.
    if(home.still>=6||home.stale>=30){
      clearRoute();home.retries++;home.still=home.stale=0;home.best=d;
      const wasBlocked=home.blocked;home.blocked=home.retries>=2;home.pause=home.blocked?8:1;
      if(home.blocked&&!wasBlocked){message('Дрон: путь к станции закрыт. Откройте проход или нажмите «Забрать дрон».');changed();}
    }
  }
  function capacity(modules=state.modules){return definition.cargo.base+Math.floor(modules.cargo/definition.cargo.levelStride)*definition.cargo.perStride;}
  function maxHp(modules=state.modules){return definition.body.hp+(modules?.body||0)*definition.body.hpPerLevel;}
  function armor(){return state.modules.body*definition.body.armorPerLevel;}
  function near(){return !state.packed&&state.scene===scene&&distance(player.x,player.y,state.x,state.y)<=130;}
  function atDock(){const p=dockPosition('drone');return !state.packed&&state.scene==='bunker'&&distance(state.x,state.y,p.x,p.y)<12&&state.task==='docked';}
  function stationNear(){return scene==='bunker'&&distance(player.x,player.y,DOCK.x+DOCK.w/2,DOCK.y+DOCK.h/2)<210;}
  function clearRoute(){motion.reset();}
  function changed(){queueGameSave();updateHUD();}
  const combatEnabled=()=>state.mode==='defense'||state.mode==='attack';
  const selectedTarget=()=>window.V014Controls?.target?.()||V0105.target||null;
  function finishAttack(){
    if(state.task!=='attack')return;
    const task=state.resumeTask||'follow';
    state.task=task==='docked'?'return':task==='guard'&&!state.guard?'follow':task;
    state.resumeTask=null;state.targetId=null;clearRoute();changed();
  }
  function primaryCommand(){state.resumeTask=null;observedTarget=selectedTarget();}
  function validStack(s){return s===null||!!(s&&ITEM[s.type]&&!ITEM[s.type].robot&&Number.isInteger(s.qty)&&s.qty>0&&s.qty<=itemStackLimit(s.type)&&V010Combat.validateItem(s)!==false);}
  function portion(s,n){return s.type==='fish'&&window.V014Fish?V014Fish.portion(s,n):{...copy(s),qty:n};}
  function removePart(s,n){if(s.type==='fish'&&window.V014Fish)V014Fish.remove(s,n);s.qty-=n;}
  function transfer(source,i,destination,max,amount){
    const s=source?.[i];if(!s||source===destination||s.locked||ITEM[s.type]?.robot)return 0;
    const n=Math.min(s.qty,Math.max(0,Math.floor(amount??s.qty)));if(!n)return 0;
    const part=portion(s,n),left=addToSlots(destination,s.type,n,max,part),moved=n-left;
    if(moved){removePart(s,moved);if(!s.qty)source[i]=null;changed();renderBag();}return moved;
  }
  function store(i,n){if(!near()){message('Дрон должен быть рядом');return 0;}return transfer(bag,i,state.cargo,capacity(),n);}
  function take(i,n){if(!near()){message('Дрон должен быть рядом');return 0;}return transfer(state.cargo,i,bag,BAG_SLOTS,n);}
  function pack(){
    if(state.packed)return false;
    if(addItem(TYPE,1,{robotId:state.id})){message('Нужна свободная ячейка');return false;}
    state.packed=true;state.task='packed';state.targetId=null;state.guard=null;undocking=false;resetReturn();primaryCommand();clearRoute();changed();renderBag();return true;
  }
  function deploy(item){
    if(!state.packed||!ownsToken(item))return false;
    const index=bag.indexOf(item);if(index<0)return false;
    const dock=dockPosition();if(scene==='bunker'&&distance(player.x,player.y,dock.x,dock.y)<110&&lineClear(player.x,player.y,dock.x,dock.y,0,'bunker'))return install();
    let p=null;for(const radius of [46,62,32,80]){for(let i=0;i<16;i++){const a=i*Math.PI/8,x=player.x+Math.cos(a)*radius,y=player.y+Math.sin(a)*radius;
      if(!worldCollision(x,y,10,scene)&&lineClear(player.x,player.y,x,y,10,scene)){p={x,y,scene};break;}}if(p)break;}

    if(!p){message('Недостаточно места');return false;}
    bag[index]=null;Object.assign(state,p,{packed:false,task:state.hp>0&&state.battery>0?'follow':'disabled'});undocking=false;resetReturn();primaryCommand();clearRoute();changed();renderBag();return true;
  }
  function follow(){
    if(state.packed||state.hp<=0||state.battery<=0){message('Разместите, зарядите и отремонтируйте дрона');return false;}
    if(atDock()&&state.autoReturn&&state.battery<=DOCK.returnThreshold){message('Дождитесь заряда выше '+DOCK.returnThreshold+'% или отключите автовозврат');return false;}
    undocking=atDock()||state.task==='docking';resetReturn();state.task='follow';state.guard=null;state.targetId=null;primaryCommand();clearRoute();changed();return true;
  }
  function recall(){return follow();}
  function returnToDock(){if(state.packed||state.hp<=0||state.battery<=0)return false;if(atDock()||state.task==='docking')return true;undocking=false;resetReturn();state.task='return';state.targetId=null;state.guard=null;primaryCommand();clearRoute();changed();return true;}
  function attack(z,quiet=false){
    const fail=text=>{if(!quiet)message(text);return false;};
    if(!combatEnabled())return fail('Включите боевой режим');
    if(state.packed||state.hp<=0||state.battery<=0||scene!=='surface'||!z?.alive||z.health<=0||!zombies.includes(z))return fail('Дрон не готов к вылету');
    if(['return','docking','docked'].includes(state.task)||state.autoReturn&&state.battery<=DOCK.returnThreshold)return fail('Сначала заберите дрон со станции командой «Следовать» и зарядите его');
    if(!state.ammo)return fail('Загрузите патроны 5,45 в дрона');
    const id=z.instanceId;if(state.task==='attack'&&state.targetId===id)return true;
    if(state.task!=='attack')state.resumeTask=['follow','guard','return','docked'].includes(state.task)?state.task:'follow';
    state.mode=state.combatMode='attack';state.targetId=id;state.task='attack';clearRoute();changed();return true;
  }
  function guard(){if(!follow())return false;state.task='guard';state.guard={x:player.x,y:player.y,scene};changed();return true;}
  function mode(value){
    if(!modes[value])return false;state.mode=value==='carry'?'follow':value;
    if(combatEnabled())state.combatMode=state.mode;
    if(state.mode!=='attack')finishAttack();
    observedTarget=state.mode==='attack'?null:selectedTarget();changed();return true;
  }
  function setCombat(on){return mode(on?(state.combatMode||'defense'):'follow');}
  function availableAmmo(){return [bag,state.cargo].reduce((n,a)=>n+a.reduce((v,s)=>v+(s?.type===combat.ammoType&&!s.locked?s.qty:0),0),0);}
  function reload(){
    if(!near()){message('Дрон должен быть рядом');return false;}
    let need=Math.max(0,combat.capacity-state.ammo),used=0;
    // Reserved cargo is ammunition only after this explicit transfer. Preserve
    // cell positions, incompatible rounds, locked stacks and all other items.
    for(const source of [bag,state.cargo])for(let i=0;i<source.length&&need>0;i++){
      const s=source[i];if(s?.type!==combat.ammoType||s.locked)continue;
      const n=Math.min(need,s.qty);s.qty-=n;need-=n;used+=n;if(!s.qty)source[i]=null;
    }
    if(!used){message(state.ammo>=combat.capacity?'Боезапас полный':'Нужны патроны 5,45');return false;}
    state.ammo+=used;if(state.mode==='attack')observedTarget=null;changed();renderBag();return true;
  }
  function cost(key){if(window.V0161Upgrade)return V0161Upgrade.droneCost(key);const l=state.modules[key]??5;return {metal:8*(l+1),parts:3*(l+1),...(l>=3?{copper:5*(l-1)}:{})};}
  function upgrade(key){return window.V0161Upgrade?.upgradeDrone(key)||false;}
  function repairCost(){const rule=definition.repair;return {[rule.material]:Math.max(0,Math.ceil((maxHp()-state.hp)/rule.durabilityPerUnit))};}
  function canRepair(atStation=false){return state.hp<maxHp()&&(atStation?atDock()&&stationNear():state.hp>0&&near()&&!state.packed);}
  function repair(atStation=false){
    if(!canRepair(atStation)){message(atStation?'Доставьте дрона на станцию':'Для ремонта подойдите к исправному дрону. Сломанный дрон доставьте на станцию.');return false;}
    const price=repairCost();if(!V010Inventory.consumeMaterials(price,1)){message('Недостаточно материалов для ремонта');return false;}
    state.hp=maxHp();changed();renderBag();updateHUD();return true;
  }
  function moveTo(p,dt){const result=motion.move(p,dt);angle=motion.heading;return result;}
  function sceneTravel(p,dt){const result=motion.travel(p,dt);angle=motion.heading;return result;}
  function doorNear(d){return !state.packed&&state.scene==='bunker'&&state.hp>0&&state.battery>0&&state.task!=='docked'&&distance(state.x,state.y,d.x+d.w/2,d.y+d.h/2)<105;}
  function doorOccupies(d){return !state.packed&&state.scene==='bunker'&&rectHit(state.x,state.y,18,d);}
  function targetForDefense(){
    if(state.mode!=='defense'||state.scene!=='surface'||scene!=='surface')return null;
    const selected=window.V014Controls?.target?.()||V0105.target,anchor=state.task==='guard'&&state.guard?state.guard:player;
    if(selected?.alive&&distance(selected.x,selected.y,anchor.x,anchor.y)<=290)return selected;
    return zombies.filter(z=>z.alive&&distance(z.x,z.y,anchor.x,anchor.y)<250).sort((a,b)=>distance(a.x,a.y,anchor.x,anchor.y)-distance(b.x,b.y,anchor.x,anchor.y))[0]||null;
  }
  function shootAt(z){
    if(!combatEnabled()||!z?.alive||z.health<=0||shot>1e-9||state.ammo<=0||distance(state.x,state.y,z.x,z.y)>combat.range||!lineClear(state.x,state.y,z.x,z.y,2,'surface'))return false;
    state.ammo--;state.battery=Math.max(0,state.battery-definition.battery.shotCost/batteryFactor());shot+=combat.intervalMs/1000;angle=Math.atan2(z.y-state.y,z.x-state.x);flash=.07;tracer={x:z.x,y:z.y};hitZombie(z,combat.damage,{fixedDamage:true});createNoise(state.x,state.y,280);changed();return true;
  }
  function collectLoose(){
    if(!['follow','carry'].includes(state.mode)||!state.autoCollect||state.scene!==scene||state.economy&&state.battery<20)return;
    // Only opened world drops. Car and cupboard contents require explicit dispatch.
    const loose=[...(window.V014LooseLoot||[])];for(const o of loose){if(!o||o.scene&&o.scene!==state.scene||!Array.isArray(o.items)||distance(state.x,state.y,o.x,o.y)>42)continue;for(let i=0;i<o.items.length;i++)transfer(o.items,i,state.cargo,capacity());}
  }
  function tick(ms){
    const dt=clamp(Number(ms)||0,0,100)/1000;if(!dt||document.hidden||playerDead)return;
    // Keep the fractional remainder, so frame boundaries cannot slow the gun.
    // Idle time never accumulates into a burst of overdue shots.
    shot=Math.max(-dt,shot-dt);hurt=Math.max(0,hurt-dt);flash=Math.max(0,flash-dt);saveClock+=dt;uiClock+=dt;
    if(!state.packed&&(state.battery<=0||state.hp<=0)&&!['docked','docking','disabled'].includes(state.task)){state.task='disabled';state.targetId=null;primaryCommand();clearRoute();resetReturn();changed();}
    detectDock(dt);
    if(!state.packed&&state.hp>0&&state.battery>0&&state.battery<=DOCK.returnThreshold&&state.autoReturn&&!['return','docked','docking'].includes(state.task)){
      state.lowWarn=true;returnToDock();message('Дрон: низкий заряд, возвращаюсь на станцию');
    }
    const selected=selectedTarget();
    if(selected!==observedTarget){
      const previous=observedTarget;observedTarget=selected;
      if(state.mode==='attack'&&selected)attack(selected,true);
      else if(state.task==='attack'&&previous===GameIdentity.enemy(state.targetId))finishAttack();
    }
    if(!state.packed&&state.hp>0&&state.battery>0&&['follow','guard','attack','return'].includes(state.task)){
      const before={x:state.x,y:state.y};let z=null;
      if(state.task==='return')returnStep(dt);
      else if(state.task==='attack'){
        z=GameIdentity.enemy(state.targetId);if(!combatEnabled()||!z?.alive||z.health<=0||scene!=='surface'||!state.ammo){finishAttack();}
        else{if(state.scene!=='surface')sceneTravel({x:800,y:690,scene:'surface'},dt);else if(distance(state.x,state.y,z.x,z.y)>225||!lineClear(state.x,state.y,z.x,z.y,2,'surface')){
          let p=null;for(let i=0;i<12;i++){const a=Math.atan2(state.y-z.y,state.x-z.x)+i*Math.PI/6,q={x:z.x+Math.cos(a)*185,y:z.y+Math.sin(a)*185};if(!worldCollision(q.x,q.y,10,'surface')&&lineClear(q.x,q.y,z.x,z.y,2,'surface')){p=q;break;}}if(p)moveTo(p,dt);else{finishAttack();message('Дрон: нет позиции для атаки');}}
          if(state.task==='attack'&&state.scene==='surface')shootAt(z);
          if(!z.alive||!state.ammo)finishAttack();}
      }else{
        if(state.task==='guard'&&state.guard)sceneTravel(state.guard,dt);
        else {motion.follow(dt);angle=motion.heading;}
        z=targetForDefense();if(z&&state.scene==='surface')shootAt(z);collectLoose();
      }
      if(!['docked','docking'].includes(state.task))state.battery=Math.max(0,state.battery-dt*(home.blocked&&state.task==='return'?definition.battery.blockedDrain:definition.battery.idleDrain+(state.light&&!(state.economy&&state.battery<20)?definition.battery.lightDrain:0))/batteryFactor());
      if(state.scene==='surface'&&hurt<=0){const touch=zombies.find(q=>q.alive&&distance(q.x,q.y,state.x,state.y)<(q.radius||16)+16);if(touch){state.hp=Math.max(0,state.hp-12*(1-armor()/100));hurt=1;changed();}}
      if(state.hp<=0||state.battery<=0){state.task='disabled';state.targetId=null;primaryCommand();clearRoute();message(state.hp<=0?'Дрон повреждён — подберите его для ремонта':'Дрон разрядился — подберите его');}
    }
    if(V09Power.devices.robot_drone_charge.active()&&devicePowered('robot_drone_charge')){
      state.battery=Math.min(100,state.battery+dt*chargeRate());if(state.battery===100)state.lowWarn=false;
    }
    shot=Math.max(0,shot);
    if(saveClock>=5){saveClock=0;queueGameSave();}if(uiClock>.25){uiClock=0;updateHUD();}
  }
  registerPowerDevice('robot_drone_charge','room5',DOCK.watts,()=>atDock()&&state.battery<100,'Станция · дрон');

  function statusText(){return state.packed?'В рюкзаке':state.task==='docking'?'Стыковка':atDock()?(state.battery>=100?(state.hp<=0?'Требуется ремонт':'Заряжен · на станции'):stationInfo().charging?'Заряжается':'На станции · нет питания'):state.hp<=0?'Требуется ремонт':state.battery<=0?'Разряжен':({follow:'Сопровождает',attack:'Атакует',guard:'Охраняет точку',return:home.blocked?'Путь закрыт · ожидание':'Возвращается на станцию',disabled:'Остановлен'})[state.task]||'Ожидание';}
  function updateHUD(){window.V0141DroneUI?.refresh();window.V0151Station?.refresh();window.V0163Loot?.refresh();}
  function open(){window.V0141DroneUI.open();}
  function openStation(){window.V0151Station?.open();}
  function dispatchLoot(){if(!near()||!activeLootObject){message('Дрон должен быть рядом');return false;}let n=0;if(lootSelection>=0)n=transfer(activeLoot,lootSelection,state.cargo,capacity());else for(let i=0;i<activeLoot.length;i++)n+=transfer(activeLoot,i,state.cargo,capacity());activeLoot=activeLoot.filter(Boolean);activeLootObject.loot=activeLoot;lootSelection=-1;renderLoot();if(!n)message('Нет места в дроне');return n>0;}
  const renderOld=renderLoot;renderLoot=function(...a){const r=renderOld(...a);let b=el('v014DroneLoot');if(!b){b=v09Button('Забрать дроном',dispatchLoot);b.id='v014DroneLoot';el('lootList').after(b);}b.disabled=!near()||!activeLoot?.length;return r;};
  const detailsOld=V011UI.details;V011UI.details=function(where,i){detailsOld(where,i);const s=where==='bag'?bag[i]:Number.isInteger(where)?storageChests[where]?.items[i]:null;if(!s)return;const body=el('v010ItemDetails').querySelector('.v09Body');if(ownsToken(s)){body.append(v09Button('Запустить',()=>{if(where!=='bag'){message('Сначала переложите робота в рюкзак');return;}const ok=deploy(s);if(ok)closeOverlay(el('v010ItemDetails'));}));}else if(where==='bag')body.append(v09Button('В дрона',()=>{store(i);closeOverlay(el('v010ItemDetails'));}));};
  const remoteOld=v09OpenPowerRemote;v09OpenPowerRemote=function(...a){const r=remoteOld(...a);el('v09PowerOverlay').querySelector('.v09Body').append(v09Button('Дрон',openStation));return r;};
  function dronePose(){const flying=state.task!=='docked'&&state.hp>0&&state.battery>0;return {x:state.x,y:state.y-10+(flying?Math.sin(performance.now()/1000*3)*2:0),rotation:angle+Math.PI/2,flying};}
  const objectsOld=interactionObjects;interactionObjects=function(which=scene){const a=objectsOld(which);if(which==='bunker')a.push({...DOCK});if(!state.packed&&state.scene===which){const p=dronePose();a.push({id:state.id,kind:TYPE,name:state.hp<=0||!state.battery?'Подобрать дрона':'Дрон',x:state.x,y:state.y,r:20,range:60,pickPriority:1,pickBounds:{x:p.x-35,y:p.y-35,w:70,h:70,rotation:p.rotation}});}return a;};
  const executeOld=executeInteraction;executeInteraction=function(o,...args){if(['robots014_dock','drone014'].includes(o?.kind)){if(!menuOpen&&!playerDead&&canInteract(o,player.x,player.y)){if(o.kind==='robots014_dock')openStation();else open();}return;}return executeOld(o,...args);};
  function disk(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}}
  function drawDock(){
    if(scene!=='bunker')return;
    const x=DOCK.x,y=DOCK.y,w=DOCK.w,h=DOCK.h,p=dockPosition(),charging=atDock()&&devicePowered('robot_drone_charge')&&state.battery<100;
    ctx.save();ctx.fillStyle='#071c202b';ctx.beginPath();ctx.roundRect(x+5,y+7,w,h,10);ctx.fill();
    const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#56716c');g.addColorStop(1,'#304b4b');ctx.fillStyle=g;ctx.strokeStyle='#82978b';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='#1d3238';ctx.beginPath();ctx.roundRect(x+9,y+10,w-18,h-20,6);ctx.fill();
    disk(p.x,p.y,29,'#284547','#7eaaa1');ctx.strokeStyle='#b1c6b066';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();ctx.arc(p.x,p.y,34,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#7c9990';ctx.fillRect(p.x-13,p.y-4,26,8);ctx.fillStyle='#365356';ctx.fillRect(p.x-8,p.y-2,16,4);
    ctx.fillStyle='#71837a';ctx.beginPath();ctx.roundRect(x+7,y+7,26,h-14,4);ctx.fill();ctx.fillStyle='#142d34';ctx.fillRect(x+11,y+14,18,26);
    ctx.fillStyle=charging?'#8adbbb':'#58766d';ctx.fillRect(x+14,y+30-Math.round(state.battery*.13),12,Math.round(state.battery*.13)+4);
    for(let i=0;i<4;i++){ctx.fillStyle='#354a4a';ctx.fillRect(x+12,y+48+i*5,15,2);}
    const light=charging?.7+Math.sin(performance.now()/600)*.16:.3;ctx.globalAlpha=light;ctx.strokeStyle='#9adfc5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,29,-Math.PI/2,-Math.PI/2+Math.PI*2*state.battery/100);ctx.stroke();ctx.globalAlpha=1;
    for(const a of [[x+4,y+4],[x+w-4,y+4],[x+4,y+h-4],[x+w-4,y+h-4]])disk(a[0],a[1],1.5,'#a8b8a8');ctx.restore();
  }
  function drawDrone(){
    if(state.packed||state.scene!==scene)return;const t=performance.now()/1000,pose=dronePose(),flying=pose.flying;
    ctx.save();ctx.fillStyle='#061c2033';ctx.beginPath();ctx.ellipse(state.x+6,state.y+8,23,15,angle,0,Math.PI*2);ctx.fill();
    if(!window.V016Lighting&&state.light&&flying&&!(state.economy&&state.battery<20)){const g=ctx.createRadialGradient(state.x,state.y,4,state.x,state.y,150);g.addColorStop(0,'#e2fff248');g.addColorStop(.35,'#c9f6dd22');g.addColorStop(1,'#b5ead900');ctx.fillStyle=g;ctx.fillRect(state.x-150,state.y-150,300,300);}
    ctx.translate(pose.x,pose.y);ctx.rotate(pose.rotation);
    const sprite=window.V011Art?.draw('drone014',-35,-35,70,70);
    if(!sprite){ctx.strokeStyle='#536d6d';ctx.lineWidth=7;for(const x of [-20,20])for(const y of [-20,20]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(x,y);ctx.stroke();disk(x,y,11,'#233b3f','#abc0b0');}ctx.fillStyle='#698885';ctx.fillRect(-10,-15,20,30);}
    if(flying){for(const x of [-22,22])for(const y of [-20,20]){ctx.save();ctx.translate(x,y);ctx.rotate(t*45+(x+y));ctx.globalAlpha=.32;ctx.fillStyle='#bad8ca';ctx.fillRect(-9,-1.2,18,2.4);ctx.fillRect(-1.2,-9,2.4,18);ctx.restore();}}
    disk(0,8,1.9,state.hp<=0?'#c45949':state.battery<20?'#ddb663':'#a4e7ce');if(flash>0)disk(0,-34,5,'#ffdfa1');ctx.restore();
    if(flash>0&&tracer){ctx.save();ctx.strokeStyle='#f8d99199';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(state.x,state.y);ctx.lineTo(tracer.x,tracer.y);ctx.stroke();ctx.restore();}
  }
  const drawPlayerOld=drawPlayer;drawPlayer=function(...a){const r=drawPlayerOld(...a);if(scene!=='surface')drawDrone();return r;};const bunkerOld=drawBunker;drawBunker=function(...a){const r=bunkerOld(...a);drawDock();return r;};
  const updateOld=update;update=function(...a){const r=updateOld(...a);tick(16.667*frameScale);return r;};
  function validate(d){
    if(d?.mode==='carry')d.mode='follow';
    if(!d||d.schema!==1||d.id!==INSTANCE_ID||typeof d.name!=='string'||d.name.length>24||!['surface','bunker'].includes(d.scene)||![d.x,d.y].every(Number.isFinite)||Math.abs(d.x)>25000||Math.abs(d.y)>25000||!Number.isFinite(d.battery)||d.battery<0||d.battery>100||!Number.isFinite(d.hp)||d.hp<0||d.hp>maxHp(d.modules)||!Number.isInteger(d.ammo)||d.ammo<0||d.ammo>combat.capacity||typeof d.packed!=='boolean'||!Object.hasOwn(modes,d.mode)||!['packed','follow','return','docking','docked','disabled','guard','attack'].includes(d.task)||!d.modules||levels.some(k=>!Number.isInteger(d.modules[k])||d.modules[k]<0||d.modules[k]>definition.upgrades.maxLevel)||!Array.isArray(d.cargo)||d.cargo.length>capacity(d.modules)||!d.cargo.every(validStack)||['light','autoCollect','economy','lowWarn'].some(k=>typeof d[k]!=='boolean')||d.targetIndex!==null&&(!Number.isInteger(d.targetIndex)||d.targetIndex<0||d.targetIndex>1000)||d.guard!==null&&(!d.guard||!['surface','bunker'].includes(d.guard.scene)||![d.guard.x,d.guard.y].every(Number.isFinite)))throw Error('Некорректное состояние дрона');
    if(d.autoReturn!==undefined&&typeof d.autoReturn!=='boolean')throw Error('Некорректная настройка автовозврата');
    if(d.combatMode!==undefined&&!['defense','attack'].includes(d.combatMode)||d.resumeTask!==undefined&&d.resumeTask!==null&&!['follow','guard','return','docked'].includes(d.resumeTask))throw Error('Некорректная команда дрона');
    return true;
  }
  function tokenCheck(d){
    const records=[];function visit(value){if(!value||typeof value!=='object')return;if(value.type===TYPE){records.push(value);return;}for(const v of Object.values(value))visit(v);}visit(d);
    if(records.some(s=>s.qty!==1||!ownsToken(s))||records.length>1||records.length!==(d.robots014?.packed?1:0))throw Error('Повтор или потеря переносного дрона');
    if(d.robots014&&d.robots014.packed!==(d.robots014.task==='packed'))throw Error('Некорректное размещение дрона');
  }
  GameSave.extend('capture','drones.companion',function(captureOld){const d=captureOld();d.robots014=copy(state);return d;});
  GameSave.extend('decode','drones.companion',function(decodeOld,raw){const preliminary=JSON.parse(raw);if(preliminary.v09?.power?.deviceEnabled){for(const id of ['robot_drone_charge'])if(preliminary.v09.power.deviceEnabled[id]===undefined)preliminary.v09.power.deviceEnabled[id]=true;}const d=decodeOld(JSON.stringify(preliminary));if(d.robots014)validate(d.robots014);tokenCheck(d);return d;});
  GameSave.extend('restore','drones.companion',function(restoreOld,d){
    if(d.robots014)validate(d.robots014);restoreOld(d);Object.assign(state,defaults(),d.robots014?copy(d.robots014):{});
    if(!d.robots014?.combatMode)state.combatMode=state.mode==='attack'?'attack':'defense';
    clearRoute();resetReturn();undocking=false;shot=hurt=saveClock=0;observedTarget=selectedTarget();
    state.targetId=state.task==='attack'&&GameIdentity.enemy(state.targetId)?.alive?state.targetId:null;
    if(state.task==='attack'&&(state.targetId===null||!combatEnabled()))finishAttack();
    if(state.task==='docked'&&!state.packed)Object.assign(state,dockPosition());updateHUD();
  });
  v09Style('.v014DroneHUD{position:fixed;right:12px;top:calc(220px + env(safe-area-inset-top,0px));z-index:38;width:auto;min-height:28px!important;padding:5px 8px!important;border-radius:9px!important;font:11px Arial!important;background:#172c2cd9!important;color:#b7d5c8!important}.v014RobotActions{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.v014RobotActions .menuButton,#v014DronePanel details .menuButton{width:auto;min-height:30px!important;padding:6px 8px!important;font-size:11px!important;margin:0}.v014RobotActions .selected{background:#376351!important}.v014RobotGrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.v014RobotGrid .menuButton{position:relative;min-height:45px;padding:4px;margin:0}.v014RobotGrid img{max-height:34px;max-width:100%}.v014RobotGrid small{position:absolute;bottom:2px;right:4px;font-size:10px}.v014DroneHeader{display:flex;align-items:center;gap:10px;padding:6px 0 9px;border-bottom:1px solid #58716a55}.v014DroneHeader img{width:64px;height:48px;object-fit:contain;border-radius:8px;background:#1a3436}.v014DroneStats{font-size:11px;line-height:1.55;color:#c7ddd3}.v014DroneStats b{color:#f0d892;font-size:12px}#v014DronePanel .panel{width:min(500px,94vw);max-height:83dvh;overflow-y:auto;padding:12px;min-height:420px}#v014DronePanel p{font-size:11px;line-height:1.5;margin:9px 0}#v014DronePanel input,#v014DronePanel select{max-width:100%;background:#203b3c;color:#deece5;border:1px solid #648178;border-radius:7px;padding:7px}#v014DroneLoot{font-size:11px;min-height:28px;padding:6px 10px}@media(max-height:520px){.v014DroneHUD{top:calc(110px + env(safe-area-inset-top,0px));right:65px}}');
  invalidateGeometry();
  return {type:TYPE,instanceId:INSTANCE_ID,definition,ownsToken,state,stationInfo,install,stationNear,returnProgress:()=>({...home}),setAutoReturn(on){state.autoReturn=!!on;changed();},combat,combatEnabled,setCombat,availableAmmo,dockPosition,station:DOCK,status:()=>({...state,maxHp:maxHp(),capacity:capacity(),atDock:atDock()}),capacity,maxHp,near,atDock,open,openStation,follow,recall,returnToDock,attack,guard,mode,pack,deploy,store,take,reload,upgrade,repair,repairCost,canRepair,cost,transfer,validate,tick,doorNear,doorOccupies,planningKey:motion.key,motion,statusText,changed,draw:drawDrone,setLootSelection:i=>{lootSelection=i;},dispatchLoot};
})();

