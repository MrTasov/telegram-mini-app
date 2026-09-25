/* 0.9 — room circuits, power controller, lights and automatic sliding doors. */
const V09Power = {
  rooms:{workshop:'Мастерская',storage:'Склад',room4:'Медблок',room5:'Энергоблок',room6:'Кухня',room7:'Жилая комната',farm:'Ферма',corridor:'Центральный зал',reserve_l1:'Резервная комната',yard:'Двор'},
  roomEnabled:{workshop:true,storage:true,room4:true,room5:true,room6:true,room7:true,farm:true,corridor:true,reserve_l1:true,yard:true},
  devices:{},running:false,fuel:10,capacity:100,supply:10,pathfinding:false,
  selectedRoom:'workshop',tab:'bunker',uiClock:0,load:0,demand:0,
  allocation(){
    let demand=0,load=0;const served=new Set();
    for(const d of Object.values(this.devices)){
      const wanted=(!d.present||d.present())&&BunkerLayout.roomActive(d.room)&&d.enabled;
      const active=wanted&&!!d.active();
      if(active)demand+=d.watts;
      if(!wanted||!this.running||this.fuel<=0)continue;
      if(!active){served.add(d.id);continue;}
      if(load+d.watts<=this.supply+0.000001){load+=d.watts;served.add(d.id);}
    }
    this.load=load;this.demand=demand;
    return {served,load,demand,supply:this.running&&this.fuel>0?this.supply:0};
  },
  snapshot(){return {running:this.running,fuel:this.fuel,roomEnabled:{...this.roomEnabled},deviceEnabled:Object.fromEntries(Object.values(this.devices).map(d=>[d.id,d.enabled])),doors:v09Doors.map(d=>({id:d.id,open:d.open,away:d.away,manual:d.manual}))};},
  validate(data){
    if(!data||typeof data!=='object'||typeof data.running!=='boolean'||!Number.isFinite(data.fuel)||data.fuel<0||data.fuel>100)throw new Error('Неверное сохранение энергоблока');
    for(const key of ['roomEnabled','deviceEnabled']){
      if(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key]))throw new Error('Неверное сохранение выключателей');
      if(Object.values(data[key]).some(v=>typeof v!=='boolean'))throw new Error('Неверное состояние выключателя');
      const expected=key==='roomEnabled'?Object.keys(this.rooms):equipmentPowerKeys();
      if(Object.keys(data[key]).length!==expected.length||expected.some(id=>!Object.hasOwn(data[key],id)))throw new Error('Неполное сохранение электрических контуров');
    }
    if(!Array.isArray(data.doors)||data.doors.length!==v09Doors.length||new Set(data.doors.map(d=>d?.id)).size!==v09Doors.length||data.doors.some(d=>!d||!v09Doors.some(door=>door.id===d.id)||!Number.isFinite(d.open)||d.open<0||d.open>1||!Number.isFinite(d.away)||d.away<0||d.away>4||typeof d.manual!=='boolean'))throw new Error('Неверное сохранение дверей');
    return true;
  },
  restore(data){
    if(!data){this.running=false;this.fuel=10;for(const r of Object.keys(this.rooms))this.roomEnabled[r]=true;for(const d of Object.values(this.devices))d.enabled=true;for(const d of v09Doors){d.open=0;d.away=0;d.manual=false;}return;}
    this.validate(data);this.running=data.running&&data.fuel>0;this.fuel=data.fuel;
    for(const r of Object.keys(this.rooms))this.roomEnabled[r]=data.roomEnabled[r]!==false;
    for(const d of Object.values(this.devices))d.enabled=data.deviceEnabled[d.id]!==false;
    for(const d of v09Doors){const s=(data.doors||[]).find(v=>v.id===d.id);d.open=s?s.open:0;d.away=s?s.away:0;d.manual=s?s.manual:false;}
    this.allocation();
  }
};
function registerPowerDevice(id,room,watts,isActiveCallback=()=>true,label){
  if(!Object.hasOwn(V09Power.rooms,room)||!Number.isFinite(watts)||watts<0)throw new Error('Unknown power circuit '+room);
  const previous=V09Power.devices[id];
  const names={furnace:'Плавильная печь',craft_bench:'Станок для крафта',feed_craft:'Кормодробилка'};
  return V09Power.devices[id]={id,room,watts,active:isActiveCallback,enabled:previous?previous.enabled:true,name:label||names[id]||id};
}
function equipmentPowerKeys(){return [...new Set([...Object.keys(V09Power.devices).filter(id=>!GameEquipment.get(id)?.refs.device),...GameEquipment.validationRecords.map(r=>r.refs.device).filter(Boolean)])];}
function devicePowered(id){return !!V09Power.devices[id]&&V09Power.allocation().served.has(id);}
function registerEquipmentPowerDevice(instanceId,active){
  const instance=GameEquipment.get(instanceId),def=GameEquipment.definition(instanceId);
  if(!instance?.refs.device||!Number.isFinite(def.powerKW))throw Error('Equipment has no power adapter');
  const device=registerPowerDevice(instance.refs.device,instance.transform.room,def.powerKW,active,def.name);Object.defineProperty(device,'room',{configurable:true,enumerable:true,get:()=>GameEquipment.get(instanceId)?.transform.room||instance.transform.room});device.present=()=>GameEquipment.present(instanceId)&&(!DefenseDefinitions.types[GameEquipment.get(instanceId)?.typeId]||(GameEquipment.get(instanceId).state.condition.hp>0&&!GameEquipment.get(instanceId).state.settings.fallen));return device;
}
V09Power.powered=devicePowered;
function v09PowerChanged(){V09Power.allocation();queueGameSave();v09RefreshPowerUI();}
function togglePowerDevice(id){
  const d=V09Power.devices[id];if(!d)return false;
  d.enabled=!d.enabled;
  const state=V09Power.allocation();
  if(d.enabled&&V09Power.running&&state.demand>V09Power.supply+.000001){d.enabled=false;message('Недостаточно мощности. Отключите другой прибор или комнату.');v09PowerChanged();return false;}
  v09PowerChanged();return d.enabled;
}
function v09ToggleRoom(room){
  if(!Object.hasOwn(V09Power.roomEnabled,room))return;
  V09Power.roomEnabled[room]=!V09Power.roomEnabled[room];
  const state=V09Power.allocation();
  if(V09Power.roomEnabled[room]&&V09Power.running&&state.demand>V09Power.supply+.000001){V09Power.roomEnabled[room]=false;message('Для этой комнаты не хватает мощности. Отключите лишние приборы.');}
  else message(V09Power.rooms[room]+(V09Power.roomEnabled[room]?' — питание включено':' — питание отключено'));
  v09PowerChanged();
}
function v09DeviceStatus(d){
  if(d.present&&!d.present())return I18n.t('placement.packed');
  if(GameEquipment.recipeStation(d.id)==='utility_workbench')return I18n.t('build.manual');
  if(!d.enabled)return 'Выключен';
  if(!V09Power.running||V09Power.fuel<=0)return 'Нет питания';
  if(!devicePowered(d.id))return 'Не хватает мощности';
  return d.active()?'Работает':'Готов к работе';
}
function renderDeviceSwitch(id){
  const d=V09Power.devices[id],row=document.createElement('div');row.className='v09DeviceRow';row.dataset.powerDevice=id;
  if(!d)return row;
  const text=document.createElement('div');I18n.assign(text,"innerHTML",'<strong></strong><small></small>');I18n.assign(text.querySelector('strong'),"textContent",d.name);row.appendChild(text);
  const button=v09Button('',()=>togglePowerDevice(id),'v09DeviceToggle');I18n.setAttr(button,'aria-label','Питание: '+d.name);row.appendChild(button);
  v09UpdateDeviceRow(row);return row;
}
function v09UpdateDeviceRow(row){
  const d=V09Power.devices[row.dataset.powerDevice];if(!d)return;
  I18n.assign(row.querySelector('small'),"textContent",v09DeviceStatus(d)+' · '+I18n.numeric(d.watts,{minimumFractionDigits:1,maximumFractionDigits:2,useGrouping:false})+' кВт');
  const b=row.querySelector('button');I18n.assign(b,"textContent",d.enabled?'Вкл.':'Выкл.');b.classList.toggle('on',d.enabled);b.setAttribute('aria-pressed',String(d.enabled));
}
for(const room of Object.keys(V09Power.rooms))if(room!=='yard')registerPowerDevice('light_'+room,room,room==='farm'?.24:room==='corridor'?.18:.12,()=>true,'Освещение');
const v09Doors=BunkerLayout.doorDefinitions.map(def=>{
  registerPowerDevice('door_'+def.room,def.room,.06,()=>true,'Раздвижная дверь');
  return {...def,open:0,away:0,manual:false};
});
const v09Spotlights=[{id:'spot_left',x:696,y:1010,angle:1.78},{id:'spot_right',x:904,y:1010,angle:1.36}];
for(const s of v09Spotlights)registerPowerDevice(s.id,'yard',.45,()=>true,s.id==='spot_left'?'Левый прожектор':'Правый прожектор');
const v09RoomSwitches=Object.keys(BunkerLayout.rooms).map(BunkerLayout.switchPoint).filter(Boolean);
function v09DoorPanels(d){
  if(window.V018Build?.isBroken(d.id))return [];
  const closed=1-d.open;
  if(closed<.005)return [];
  return d.horizontal?[{x:d.x,y:d.y,w:d.w*.5*closed,h:d.h},{x:d.x+d.w-d.w*.5*closed,y:d.y,w:d.w*.5*closed,h:d.h}]:[{x:d.x,y:d.y,w:d.w,h:d.h*.5*closed},{x:d.x,y:d.y+d.h-d.h*.5*closed,w:d.w,h:d.h*.5*closed}];
}
function powerTick(dt){
  if(document.hidden||playerDead)return;
  dt=clamp(Number(dt)||0,0,.1);
  if(V09Power.running){V09Power.fuel=Math.max(0,V09Power.fuel-dt/60);if(V09Power.fuel<=0){V09Power.running=false;message('Генератор остановился: закончилось топливо');queueGameSave();}}
  V09Power.allocation();
  const occupants=BunkerLayout.occupants('bunker');
  for(const d of v09Doors){
    if(!BunkerLayout.roomActive(d.room))continue;
    if(window.V018Build?.isBroken(d.id)){d.open=1;d.away=0;continue;}
    const near=occupants.some(a=>distance(a.x,a.y,d.x+d.w/2,d.y+d.h/2)<116.25);
    const occupied=d.open>.2&&occupants.some(a=>rectHit(a.x,a.y,(a.radius||10)+8,d));
    const powered=devicePowered('door_'+d.room);
    if(near||occupied)d.away=0;else d.away=Math.min(4,d.away+dt);
    if(d.away>=4)d.manual=false;
    const shouldOpen=occupied||(near&&powered)||d.manual||(d.open>0&&d.away<4);
    window.GameAudioWorld?.door(d,shouldOpen,'bunker',!!window.V018Build?.isBroken(d.id));d.open=clamp(d.open+(shouldOpen?1:-1)*dt*2.2,0,1);
  }
  V09Power.uiClock+=dt;
  if(V09Power.uiClock>.25){V09Power.uiClock=0;v09RefreshPowerUI();}
}
V09Power.tick=powerTick;
const v09PowerOldUpdate=update;
update=function(){powerTick(frameScale/60);v09PowerOldUpdate();};
const v09PowerOldCollision=worldCollision;
worldCollision=function(x,y,r=15,which=scene,ignoreId=null){
  if(v09PowerOldCollision(x,y,r,which,ignoreId))return true;
  if(which==='bunker')for(const d of v09Doors){if(!BunkerLayout.roomActive(d.room)||d.id===ignoreId||window.GamePassages?.canPlanThrough(d.id))continue;for(const panel of v09DoorPanels(d))if(rectHit(x,y,r,panel))return true;}
  return false;
};
const v09PowerOldPath=findWalkPath;
findWalkPath=function(...args){return GamePassages.plan(()=>v09PowerOldPath(...args));};
const v09PowerOldInteractions=interactionObjects;
interactionObjects=function(which=scene){
  const base=v09PowerOldInteractions(which);
  if(which==='surface')return [...base,...v09Spotlights.map(s=>({id:s.id,kind:'v09power_device',device:s.id,name:'Прожектор',x:s.x,y:s.y,r:19,range:58}))];
  return [...v09RoomSwitches.map(s=>({id:'switch_'+s.room,kind:'v09room_switch',room:s.room,name:I18n.t('control.roomLights',{room:V09Power.rooms[s.room]}),x:s.x,y:s.y,r:10,range:48})),...base,
    ...v09Doors.filter(d=>BunkerLayout.roomActive(d.room)).map(d=>({...d,kind:'v09door',name:devicePowered('door_'+d.room)?'Раздвижная дверь':'Открыть дверь вручную',range:68})),
    {id:'tank',kind:'v09fuel',name:'Топливный бак',...BunkerLayout.fixture('tank'),range:50},
    {id:'generator',kind:'v09generator',name:'Генератор',...BunkerLayout.fixture('generator'),range:50},
    {id:'battery',kind:'v09battery',name:'Резервная батарея',...BunkerLayout.fixture('battery'),range:50},
    ...Object.keys(V09Power.rooms).filter(room=>room!=='yard').flatMap(room=>v09LightPoints(room).map((p,i)=>({id:'lamp_'+room+'_'+i,kind:'v09power_device',device:'light_'+room,name:'Освещение: '+V09Power.rooms[room],x:p.x,y:p.y,r:20,range:65})))];
};
const v09PowerOldExecute=executeInteraction;
executeInteraction=function(target){
  if(!target||!target.kind.startsWith('v09'))return v09PowerOldExecute(target);
  if(!['v09room_switch','v09door','v09fuel','v09generator','v09battery','v09power_device'].includes(target.kind))return v09PowerOldExecute(target);
  if(menuOpen||playerDead||!canInteract(target,player.x,player.y))return;
  GameMovement.openUI();
  if(target.kind==='v09room_switch')v09ToggleRoom(target.room);
  if(target.kind==='v09door'){
    GameRecovery.request(target.id,'manualOpen');
  }
  if(target.kind==='v09fuel'||target.kind==='v09generator')v09OpenGenerator(target.kind==='v09fuel');
  if(target.kind==='v09battery')message('Резервная батарея — подключим в следующем обновлении');
  if(target.kind==='v09power_device')v09OpenDevice(target.device);
};
const v09PowerOldSelect=selectHandSlot;
selectHandSlot=function(index){v09PowerOldSelect(index);if(heldItem()==='remote')v09OpenPowerRemote();};
const v09PowerOldAssign=assignHandSlot;
assignHandSlot=function(index){v09PowerOldAssign(index);if(heldItem()==='remote')v09OpenPowerRemote();};

v09Style(`
.v09PowerStats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:0 0 13px}.v09PowerStat{padding:10px 7px;background:#12232b;border:1px solid #344f58;border-radius:10px;min-width:0}.v09PowerStat small{display:block;color:#9eb6bb;font-size:10px;letter-spacing:.07em;text-transform:uppercase}.v09PowerStat b{display:block;color:#e5f3eb;margin-top:5px;font-size:15px;font-variant-numeric:tabular-nums}.v09PowerMeter{height:5px;background:#142127;border-radius:4px;overflow:hidden;margin-top:7px}.v09PowerMeter i{display:block;height:100%;background:#81c79f;border-radius:4px}.v09PowerTabs{display:flex;gap:7px;margin-bottom:10px}.v09PowerTabs button{flex:1}.v09PowerTabs .selected{background:#335f5d!important;border-color:#81baac!important}.v09BaseMap{height:320px;position:relative;border:1px solid #354952;border-radius:14px;background:linear-gradient(135deg,#111e25,#17282e);overflow:hidden}.v09MapRoom{position:absolute;background:#29383b;border:1px solid #687275;color:#bec9ca;border-radius:5px;padding:4px;font:11px Arial;text-align:center;cursor:pointer}.v09MapRoom.powered{background:#214c42;border-color:#77b095;color:#d7efe1}.v09MapRoom.waiting{background:#4b4129;border-color:#bca65e;color:#f0db9c}.v09MapRoom.selected{outline:2px solid #e0e9db;outline-offset:2px}.v09MapRoom small{display:block;font-size:9px;opacity:.8;margin-top:4px}.v09MapLegend{display:flex;flex-wrap:wrap;gap:12px;color:#a5b9bd;font-size:10px;padding:10px 0}.v09MapLegend span:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#7aab92;margin-right:5px}.v09MapLegend span:nth-child(2):before{background:#727c7e}.v09MapLegend span:nth-child(3):before{background:#c2a55b}.v09Circuit{border-top:1px solid #35484e;padding-top:10px}.v09CircuitHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.v09CircuitHeader h3{font-size:16px;margin:0;color:#e6efeb}.v09CircuitHeader small{display:block;color:#a2b9bd;font-size:11px;margin-top:4px}.v09DeviceRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #2d4047}.v09DeviceRow strong{font-size:12px;color:#dfebe7;font-weight:500}.v09DeviceRow small{display:block;color:#91a9ad;font-size:11px;margin-top:4px}.v09DeviceToggle{min-width:70px!important;min-height:36px!important;padding:7px 10px!important;font-size:12px!important;background:#29393f!important}.v09DeviceToggle.on{background:#285345!important;color:#cfead8!important;border-color:#709e83!important}.v09PowerNote{font-size:12px;line-height:1.5;color:#a7babd;margin:12px 0}.v09PowerActions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.v09PowerWarning{color:#e6c17e;font-size:12px;margin:8px 0}.v09TankGauge{height:110px;border:2px solid #687d79;border-radius:12px;background:#142225;position:relative;overflow:hidden;margin:12px 0}.v09TankGauge i{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(0deg,#747140,#b0a76a);transition:height .2s}.v09TankGauge b{position:relative;height:100%;display:flex;align-items:center;justify-content:center;color:#f4f2d8;font-size:24px;text-shadow:0 1px 4px #000}.v09YardGate{position:absolute;left:43%;bottom:12%;width:14%;border-top:4px solid #b4b698;color:#bbc7bd;text-align:center;font-size:9px;padding-top:8px}.v09MapHatch{position:absolute;left:36%;top:36%;width:28%;height:24%;border:2px solid #779288;border-radius:7px;color:#b4cabe;display:flex;align-items:center;justify-content:center;font-size:11px}.v09MapBeam{position:absolute;width:1px;height:1px;bottom:11%;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:65px solid #dcd59430;transform:rotate(180deg)}
@media(max-height:680px){.v09BaseMap{height:255px}.v09PowerStats{margin-bottom:8px}.v09PowerStat{padding:7px}.v09PowerStat b{font-size:13px}}
`);
function v09PowerStats(){return '<div class="v09PowerStats"><div class="v09PowerStat"><small>Генератор</small><b data-power="running"></b></div><div class="v09PowerStat"><small>Топливо</small><b data-power="fuel"></b><div class="v09PowerMeter"><i data-power="fuelbar"></i></div></div><div class="v09PowerStat"><small>Нагрузка</small><b data-power="load"></b></div></div><div class="v09PowerWarning" data-power="warning"></div>';}
function v09OpenPowerRemote(){
  const overlay=v09Overlay('v09PowerOverlay','Пульт · управление базой'),body=overlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",v09PowerStats());
  const tabs=document.createElement('div');tabs.className='v09PowerTabs';
  for(const [key,title] of [['surface','Двор'],['bunker','Бункер']]){const b=v09Button(title,()=>{V09Power.tab=key;v09OpenPowerRemote();});b.classList.toggle('selected',V09Power.tab===key);tabs.appendChild(b);}body.appendChild(tabs);
  const map=document.createElement('div');map.className='v09BaseMap';I18n.setAttr(map,'aria-label','План базы: '+(V09Power.tab==='bunker'?'бункер':'двор'));body.appendChild(map);
  if(V09Power.tab==='bunker'){
    const b=BunkerLayout.bounds,positions=Object.fromEntries(BunkerLayout.roomData.map(r=>[r.id,[(r.x-b.x)/b.w*94+3,(r.y-b.y)/b.h*94+3,r.w/b.w*94,r.h/b.h*94]]));
    for(const [room,p] of Object.entries(positions)){const b=document.createElement('button');b.className='v09MapRoom';b.dataset.powerRoom=room;b.style.cssText=`left:${p[0]}%;top:${p[1]}%;width:${p[2]}%;height:${p[3]}%`;I18n.assign(b,"innerHTML",'<span></span><small></small>');I18n.assign(b.querySelector('span'),"textContent",room==='corridor'?'↕':V09Power.rooms[room]);I18n.setAttr(b,'aria-label',V09Power.rooms[room]);b.onclick=()=>{V09Power.selectedRoom=room;v09RenderCircuit();v09RefreshPowerUI();};map.appendChild(b);}
    if(V09Power.selectedRoom==='yard'||!BunkerLayout.roomActive(V09Power.selectedRoom))V09Power.selectedRoom='workshop';
  }else{
    V09Power.selectedRoom='yard';I18n.assign(map,"innerHTML",'<div style="position:absolute;inset:10% 13% 15%;border:6px solid #697b77;border-radius:8px"></div><div class="v09MapHatch">Бункер ↓</div><div class="v09YardGate">ВОРОТА</div>');
    for(let i=0;i<2;i++){const b=document.createElement('button');b.className='v09MapRoom';b.dataset.powerSpot=v09Spotlights[i].id;b.style.cssText=`left:${i?64:15}%;top:61%;width:21%;height:18%`;I18n.assign(b,"textContent",i?'Правый\nпрожектор':'Левый\nпрожектор');b.onclick=()=>v09OpenDevice(v09Spotlights[i].id);map.appendChild(b);}
  }
  const legend=document.createElement('div');legend.className='v09MapLegend';I18n.assign(legend,"innerHTML",'<span>Есть питание</span><span>Выключено</span><span>Нет энергии</span>');body.appendChild(legend);
  const circuit=document.createElement('div');circuit.className='v09Circuit';circuit.id='v09PowerCircuit';body.appendChild(circuit);v09RenderCircuit();
  const actions=document.createElement('div');actions.className='v09PowerActions';const generator=v09Button('',v09ToggleGenerator);generator.dataset.power='generatorToggle';actions.appendChild(generator);body.appendChild(actions);
  v09RefreshPowerUI();openOverlay(overlay);
}
function v09RenderCircuit(){
  const parent=el('v09PowerCircuit');if(!parent)return;I18n.assign(parent,"innerHTML",'');const room=V09Power.selectedRoom;
  const header=document.createElement('div');header.className='v09CircuitHeader';
  const title=document.createElement('div');I18n.assign(title,"innerHTML",'<h3></h3><small></small>');I18n.assign(title.querySelector('h3'),"textContent",V09Power.rooms[room]);title.querySelector('small').dataset.roomPowerStatus=room;header.appendChild(title);
  const toggle=v09Button('',()=>v09ToggleRoom(room),'v09DeviceToggle');toggle.dataset.roomPowerToggle=room;header.appendChild(toggle);parent.appendChild(header);
  for(const d of Object.values(V09Power.devices).filter(d=>d.room===room))parent.appendChild(renderDeviceSwitch(d.id));
  if(GameEquipment.get('generator')?.transform.room===room){const note=document.createElement('p');note.className='v09PowerNote';I18n.assign(note,"textContent",'Выключатель комнаты управляет её светом и дверью. Генератор запускается и останавливается отдельно.');parent.appendChild(note);}
}
function v09ToggleGenerator(){
  if(!GameEquipment.present('generator')||!GameEquipment.present('tank'))return false;
  if(V09Power.running)V09Power.running=false;
  else if(V09Power.fuel<=0){message('Сначала заправьте топливный бак в энергоблоке');return;}
  else V09Power.running=true;
  message(V09Power.running?'Генератор запущен · доступно 10 кВт':'Генератор остановлен');v09PowerChanged();
}
function v09OpenGenerator(refuel=false){
  const overlay=v09Overlay('v09GeneratorOverlay',refuel?'Энергоблок · топливный бак':'Энергоблок · генератор'),body=overlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",v09PowerStats());
  if(refuel){
    const gauge=document.createElement('div');gauge.className='v09TankGauge';I18n.assign(gauge,"innerHTML",'<i data-power="tankbar"></i><b data-power="tankvalue"></b>');body.appendChild(gauge);
    const note=document.createElement('p');note.className='v09PowerNote';note.dataset.power='bagfuel';body.appendChild(note);
    const buttons=document.createElement('div');buttons.className='v09PowerActions';for(const qty of [1,10,100])buttons.appendChild(v09Button(qty===100?'Заправить максимум':'Добавить '+qty,()=>v09Refuel(qty)));body.appendChild(buttons);
  }
  const toggle=v09Button('',v09ToggleGenerator);toggle.dataset.power='generatorToggle';body.appendChild(toggle);
  const note=document.createElement('p');note.className='v09PowerNote';I18n.assign(note,"textContent",'Мощность: 10 кВт. 1 единица топлива ≈ 1 минута работы. При остановке генератора производство сохраняет прогресс. Резервная батарея будет подключена позже.');body.appendChild(note);
  body.appendChild(renderDeviceSwitch('light_'+GameEquipment.get(refuel?'tank':'generator').transform.room));v09RefreshPowerUI();openOverlay(overlay);
}
function v09Refuel(amount){
  if(!GameEquipment.present('tank'))return false;
  const n=Math.min(amount,bagCount('fuel'),Math.ceil(V09Power.capacity-V09Power.fuel));
  if(n<=0){message(V09Power.fuel>=V09Power.capacity?'Бак уже заполнен':'В рюкзаке нет топлива');return;}
  // Do not consume a whole unit for a fractional gap at the top of the tank.
  const whole=Math.min(n,Math.floor(V09Power.capacity-V09Power.fuel));
  if(whole<=0){message('Бак почти полный');return;}
  removeFromSlots(bag,'fuel',whole);V09Power.fuel+=whole;GameAudio.play('refuel',{...GameEquipment.center('tank'),scene:'bunker',floor:1});message('Заправлено: '+whole+' топлива');renderBag();v09PowerChanged();
}
function v09OpenDevice(id){
  const d=V09Power.devices[id];if(!d)return;const overlay=v09Overlay('v09PowerDeviceOverlay',d.name),body=overlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",v09PowerStats());body.appendChild(renderDeviceSwitch(id));
  const note=document.createElement('p');note.className='v09PowerNote';I18n.assign(note,"textContent",I18n.t('control.deviceNote',{room:V09Power.rooms[d.room]}));body.appendChild(note);v09RefreshPowerUI();openOverlay(overlay);
}
function v09RefreshPowerUI(){
  const a=V09Power.allocation();
  document.querySelectorAll('[data-power]').forEach(node=>{
    const key=node.dataset.power;
    if(key==='running')I18n.assign(node,"textContent",V09Power.running?(a.load+a.chargeInput>0?'Работает':'Ожидание'):'Выключен');
    if(key==='fuel')I18n.assign(node,"textContent",I18n.numeric(V09Power.fuel,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' / 100');
    if(key==='load')I18n.assign(node,"textContent",I18n.numeric(a.load,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' / '+a.supply+' кВт');
    if(key==='fuelbar'||key==='tankbar')node.style[key==='tankbar'?'height':'width']=V09Power.fuel+'%';
    if(key==='tankvalue')I18n.assign(node,"textContent",I18n.numeric(V09Power.fuel,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' / 100');
    if(key==='bagfuel')I18n.assign(node,"textContent",'В рюкзаке: '+bagCount('fuel')+' топлива');
    if(key==='generatorToggle')I18n.assign(node,"textContent",V09Power.running?'Остановить генератор':'Запустить генератор');
    if(key==='warning')I18n.assign(node,"textContent",V09Power.running?(a.demand>V09Power.supply?'Запрошено '+I18n.numeric(a.demand,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' кВт. Приборы без мощности ждут — отключите лишние.':'Свободно '+I18n.numeric(V09Power.supply-a.load,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' кВт'):'Нет генерации. Запустите генератор, чтобы включить освещение и производство.');
  });
  document.querySelectorAll('[data-power-device]').forEach(v09UpdateDeviceRow);
  document.querySelectorAll('[data-room-power-toggle]').forEach(node=>{const enabled=V09Power.roomEnabled[node.dataset.roomPowerToggle];I18n.assign(node,"textContent",enabled?'Вкл.':'Выкл.');node.classList.toggle('on',enabled);node.setAttribute('aria-pressed',String(enabled));});
  document.querySelectorAll('[data-room-power-status]').forEach(node=>{const room=node.dataset.roomPowerStatus;const demand=Object.values(V09Power.devices).filter(d=>d.room===room&&d.enabled&&d.active()).reduce((n,d)=>n+d.watts,0);I18n.assign(node,"textContent",(V09Power.roomEnabled[room]?'Контур включён':'Контур отключён')+' · '+I18n.numeric(demand,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' кВт');});
  document.querySelectorAll('[data-power-room]').forEach(node=>{
    const room=node.dataset.powerRoom,enabled=V09Power.roomEnabled[room],devices=Object.values(V09Power.devices).filter(d=>d.room===room&&d.enabled&&d.active()),powered=enabled&&V09Power.running&&devices.every(d=>a.served.has(d.id));
    node.classList.toggle('powered',powered);node.classList.toggle('waiting',enabled&&!powered);node.classList.toggle('selected',room===V09Power.selectedRoom);
    I18n.assign(node.querySelector('small'),"textContent",room==='corridor'?'':!enabled?'Выкл.':!powered?'Нет энергии':I18n.numeric(devices.reduce((s,d)=>s+d.watts,0),{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' кВт');
  });
  document.querySelectorAll('[data-power-spot]').forEach(node=>{const d=V09Power.devices[node.dataset.powerSpot];node.classList.toggle('powered',a.served.has(d.id));node.classList.toggle('waiting',d.enabled&&V09Power.roomEnabled.yard&&!a.served.has(d.id));});
}

function v09DrawDoor(d){
  ctx.save();ctx.lineWidth=2;const powered=devicePowered('door_'+d.room),cx=d.x+d.w/2,cy=d.y+d.h/2;
  ctx.fillStyle='#1c292d';ctx.strokeStyle='#687b7e';ctx.fillRect(d.x-3,d.y-3,d.w+6,d.h+6);ctx.strokeRect(d.x-3,d.y-3,d.w+6,d.h+6);
  ctx.fillStyle='#333c3e';ctx.fillRect(d.x,d.y,d.w,d.h);
  for(const panel of v09DoorPanels(d)){
    const gradient=d.horizontal?ctx.createLinearGradient(0,panel.y,0,panel.y+panel.h):ctx.createLinearGradient(panel.x,0,panel.x+panel.w,0);
    gradient.addColorStop(0,'#56696a');gradient.addColorStop(.5,'#98a6a2');gradient.addColorStop(1,'#465d60');ctx.fillStyle=gradient;ctx.fillRect(panel.x,panel.y,panel.w,panel.h);ctx.strokeStyle='#c5cabe';ctx.lineWidth=1;ctx.strokeRect(panel.x+1,panel.y+1,Math.max(0,panel.w-2),Math.max(0,panel.h-2));
  }
  ctx.fillStyle=powered?'#8dc7aa':'#d2ad69';
  if(d.horizontal){ctx.fillRect(cx-13,d.y-6,26,3);ctx.fillRect(cx-13,d.y+d.h+3,26,3);}else{ctx.fillRect(d.x-6,cy-13,3,26);ctx.fillRect(d.x+d.w+3,cy-13,3,26);}
  if(!powered&&scene==='bunker'&&distance(player.x,player.y,cx,cy)<120&&d.open<.2){ctx.font='10px Arial';ctx.textAlign='center';ctx.fillStyle='#e0c48e';ctx.fillText(I18n.text('ОТКРЫТЬ ВРУЧНУЮ'),cx,cy-23);}
  ctx.restore();
}
function v09LightPoints(room){return BunkerLayout.lights(room);}
function v09DrawRoomLight(room){
  const r=bunker[room];if(!r)return;const lit=devicePowered('light_'+room);
  ctx.save();ctx.beginPath();ctx.rect(r.left+9,r.top+9,r.right-r.left-18,r.bottom-r.top-18);ctx.clip();
  ctx.fillStyle=lit?'rgba(4,12,18,.04)':'rgba(2,7,13,.67)';ctx.fillRect(r.left,r.top,r.right-r.left,r.bottom-r.top);
  if(lit){
    for(const p of v09LightPoints(room)){
      const radius=room==='farm'?530:room==='corridor'?280:510;const gradient=ctx.createRadialGradient(p.x,p.y,5,p.x,p.y,radius);
      gradient.addColorStop(0,'rgba(250,241,191,.20)');gradient.addColorStop(.4,'rgba(220,225,184,.08)');gradient.addColorStop(1,'rgba(220,230,195,0)');ctx.fillStyle=gradient;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
    }
  }
  ctx.restore();
  for(const p of v09LightPoints(room)){
    ctx.save();ctx.fillStyle='#1c2b30';ctx.fillRect(p.x-35,p.y-5,70,10);ctx.fillStyle=lit?'#e8edce':'#626c66';ctx.shadowColor=lit?'#efe8af':'transparent';ctx.shadowBlur=lit?12:0;ctx.fillRect(p.x-28,p.y-2,56,4);ctx.restore();
  }
}
function v09DrawRoomSwitch(room){
  const s=v09RoomSwitches.find(v=>v.room===room);if(!s)return;
  ctx.save();ctx.fillStyle='#223238';ctx.strokeStyle='#738984';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(s.x-7,s.y-11,14,22,2);ctx.fill();ctx.stroke();
  const enabled=V09Power.roomEnabled[room];ctx.fillStyle=enabled?'#87a699':'#56656a';ctx.fillRect(s.x-4,s.y+(enabled?-6:0),8,7);ctx.fillStyle=enabled&&V09Power.running?'#b1e0b5':enabled?'#d3ac63':'#65746f';ctx.fillRect(s.x-2,s.y-9,4,2);ctx.restore();
}
V09Power.drawRoom=function(room){v09DrawRoomLight(room);v09DrawRoomSwitch(room);const d=v09Doors.find(d=>d.room===room);if(d)v09DrawDoor(d);};
function v09DrawEnergyReadouts(){
  ctx.save();ctx.textAlign='center';ctx.fillStyle='#252d29';ctx.fillRect(905,392,85,72);ctx.fillStyle='#b7a361';ctx.fillRect(905,464-72*V09Power.fuel/100,85,72*V09Power.fuel/100);ctx.fillStyle='#ede5b9';ctx.font='12px Arial';ctx.fillText(I18n.text(I18n.numeric(V09Power.fuel,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' / 100'),947,430);ctx.font='9px Arial';ctx.fillText(I18n.text('ТОПЛИВО'),947,448);
  ctx.fillStyle='#232927';ctx.fillRect(1065,350,125,50);ctx.fillStyle=V09Power.running?'#98d8ab':'#63716b';ctx.fillRect(1080,365,16,16);ctx.fillStyle='#d8e7d8';ctx.font='10px Arial';ctx.fillText(I18n.text(V09Power.running?'ВКЛЮЧЁН':'ВЫКЛЮЧЕН'),1140,377);
  ctx.fillStyle='#46504b';ctx.fillRect(1050,431,154,48);ctx.fillStyle=V09Power.running?'#d8ecd4':'#b6c1b6';ctx.font='13px Arial';ctx.fillText(I18n.text(I18n.numeric(V09Power.load,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' / '+(V09Power.running?'10':'0')+' кВт'),1127,451);ctx.font='9px Arial';ctx.fillText(I18n.text(V09Power.running?'1 топливо / мин':'ОЖИДАЕТ ЗАПУСКА'),1127,469);
  ctx.fillStyle='#435352';ctx.fillRect(1253,340,69,105);ctx.strokeStyle='#62736b';ctx.lineWidth=2;ctx.strokeRect(1264,361,47,61);ctx.fillStyle='#b0bbb1';ctx.font='18px Arial';ctx.fillText(I18n.text('—'),1287,399);ctx.fillStyle='#39474c';ctx.fillRect(1239,479,97,27);ctx.fillStyle='#9fb1b5';ctx.font='9px Arial';ctx.fillText(I18n.text('НЕ ПОДКЛЮЧЕНА'),1287,493);ctx.restore();
}
const v09PowerOldDrawBunker=drawBunker;
drawBunker=function(){
  v09PowerOldDrawBunker();v09DrawEnergyReadouts();
  for(const room of Object.keys(V09Power.rooms))if(room!=='yard'&&BunkerLayout.roomActive(room))v09DrawRoomLight(room);
  for(const d of v09Doors)if(BunkerLayout.roomActive(d.room))v09DrawDoor(d);
  for(const room of Object.keys(V09Power.rooms))if(room!=='yard'&&BunkerLayout.roomActive(room))v09DrawRoomSwitch(room);
};
let v09SpotCacheRevision=-1,v09SpotCache={};
function v09SpotPolygon(s){
  if(v09SpotCacheRevision!==geometryRevision){v09SpotCacheRevision=geometryRevision;v09SpotCache={};}
  if(v09SpotCache[s.id])return v09SpotCache[s.id];
  const ox=s.x,oy=surface.outer.bottom+8,points=[];
  for(let i=0;i<=40;i++){const a=s.angle-.40+i*.80/40,dx=Math.cos(a),dy=Math.sin(a);let distance=8;for(;distance<610;distance+=7)if(worldCollision(ox+dx*distance,oy+dy*distance,1,'surface',s.id))break;points.push({x:ox+dx*Math.max(0,distance-7),y:oy+dy*Math.max(0,distance-7)});}
  return v09SpotCache[s.id]={ox,oy,points};
}
function v09DrawSpotlights(){if(window.V015Base)return;
  for(const s of v09Spotlights){
    const on=devicePowered(s.id);
    if(on){const poly=v09SpotPolygon(s);ctx.save();ctx.beginPath();ctx.moveTo(poly.ox,poly.oy);for(const p of poly.points)ctx.lineTo(p.x,p.y);ctx.closePath();ctx.clip();const g=ctx.createRadialGradient(poly.ox,poly.oy,0,poly.ox,poly.oy,610);g.addColorStop(0,'rgba(255,245,181,.38)');g.addColorStop(.5,'rgba(248,239,178,.16)');g.addColorStop(1,'rgba(248,239,178,0)');ctx.fillStyle=g;ctx.fillRect(poly.ox-610,poly.oy,1220,620);ctx.restore();}
    ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(7,12,23,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b5159';ctx.beginPath();ctx.roundRect(-13,-12,26,27,4);ctx.fill();ctx.strokeStyle='#8fa3a0';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#1b2b30';ctx.fillRect(-17,2,34,15);ctx.fillStyle=on?'#edf0ca':'#788984';ctx.shadowColor=on?'#fff1a3':'transparent';ctx.shadowBlur=on?15:0;ctx.fillRect(-13,9,26,5);ctx.restore();
  }
}
const v09PowerOldDrawSurface=drawSurface;
drawSurface=function(){v09PowerOldDrawSurface();v09DrawSpotlights();};

