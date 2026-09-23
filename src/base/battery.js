/* 0.10 — reserve battery, automatic priority allocation and quiet base alerts. */
const V010Energy=(()=>{
  const battery={charge:0,capacity:1.5,enabled:true,maxCharge:3,maxDischarge:6};
  let roomPriority={},devicePriority={},warnings={},harvestSeen={},clock=0,lastFlow={charge:0,discharge:0};
  const defaultRoom=id=>['corridor','room4'].includes(id)?3:2;
  const defaultDevice=id=>id.startsWith('light_')||id.startsWith('door_')?3:id==='furnace'?1:2;
  const priorityName=n=>['','Низкий','Обычный','Высокий'][n];
  const roomRank=id=>roomPriority[id]??defaultRoom(id);
  const deviceRank=id=>devicePriority[id]??defaultDevice(id);
  const log=text=>{if(typeof V010!=='undefined'&&typeof V010.log==='function')V010.log(text);};
  function edge(key,value,text){if(value&&!warnings[key]){log(text);GameAudio.play('warning');}warnings[key]=!!value;}
  const fmt=n=>I18n.numeric(n,{maximumFractionDigits:2,useGrouping:false});
  function remainingTime(a=V09Power.allocation()){
    const kw=a.batteryOutput;
    if(!battery.enabled)return 'Отключена';
    if(battery.charge<=0)return 'Разряжена';
    if(kw<=.000001)return a.chargeInput>0?'Заряжается':'Резерв';
    const seconds=Math.ceil(battery.charge/kw*3600);
    return seconds>=3600?`≈ ${Math.floor(seconds/3600)} ч ${Math.floor(seconds%3600/60)} мин`:seconds>=60?`≈ ${Math.ceil(seconds/60)} мин`:`≈ ${seconds} сек`;
  }
  function allocation(dt=1/60){
    dt=Math.max(.001,Math.min(.1,Number(dt)||1/60));
    const generator=V09Power.running&&V09Power.fuel>0?V09Power.supply:0;
    const batterySupply=battery.enabled&&battery.charge>0?Math.min(battery.maxDischarge,battery.charge*3600/dt):0;
    const supply=generator+batterySupply,served=new Set(),shed=[];
    let demand=0,load=0;
    const devices=Object.values(V09Power.devices).filter(d=>BunkerLayout.roomActive(d.room)).map((d,i)=>({d,i,active:!!d.active()}));
    devices.sort((a,b)=>roomRank(b.d.room)-roomRank(a.d.room)||deviceRank(b.d.id)-deviceRank(a.d.id)||a.i-b.i);
    for(const {d,active} of devices){
      if(!d.enabled||!V09Power.roomEnabled[d.room])continue;
      if(active)demand+=d.watts;
      if(!active){if(supply>0)served.add(d.id);continue;}
      if(load+d.watts<=supply+.000001){load+=d.watts;served.add(d.id);}else shed.push(d.id);
    }
    const batteryOutput=Math.max(0,load-generator);
    const chargeInput=battery.enabled&&generator>0&&batteryOutput<.000001?Math.min(battery.maxCharge,Math.max(0,generator-load),Math.max(0,battery.capacity-battery.charge)*3600/dt):0;
    V09Power.load=load;V09Power.demand=demand;
    return {served,load,demand,supply,generator,batterySupply,batteryOutput,chargeInput,shed};
  }
  V09Power.allocation=allocation;
  function setRoomPriority(id,value){
    if(!Object.hasOwn(V09Power.rooms,id)||![1,2,3].includes(+value))return false;
    roomPriority[id]=+value;v09PowerChanged();return true;
  }
  function setDevicePriority(id,value){
    if(!V09Power.devices[id]||![1,2,3].includes(+value))return false;
    devicePriority[id]=+value;v09PowerChanged();return true;
  }
  togglePowerDevice=function(id){const d=V09Power.devices[id];if(!d)return false;d.enabled=!d.enabled;v09PowerChanged();return d.enabled;};
  v09ToggleRoom=function(id){
    if(!Object.hasOwn(V09Power.roomEnabled,id))return;
    V09Power.roomEnabled[id]=!V09Power.roomEnabled[id];
    message(V09Power.rooms[id]+(V09Power.roomEnabled[id]?' — питание включено':' — питание отключено'));v09PowerChanged();
  };
  v09DeviceStatus=function(d){
    if(!d.enabled)return 'Выключен';
    if(!V09Power.roomEnabled[d.room])return 'Комната обесточена';
    const a=allocation();
    if(!a.served.has(d.id))return a.supply>0?'Ожидает мощности · приоритет '+priorityName(deviceRank(d.id)).toLowerCase():'Нет питания';
    return d.active()?'Работает':'Готов к работе';
  };
  function switchState(b,on,label){
    if(!b)return;I18n.assign(b,"textContent",'');b.classList.toggle('on',on);b.setAttribute('role','switch');b.setAttribute('aria-checked',String(on));b.setAttribute('aria-pressed',String(on));I18n.setAttr(b,'aria-label',label+': '+(on?'включено':'выключено'));I18n.assign(b,"title",label+': '+(on?'включено':'выключено'));
  }
  v09UpdateDeviceRow=function(row){
    const d=V09Power.devices[row.dataset.powerDevice];if(!d)return;
    const small=row.querySelector('small');if(small)I18n.assign(small,"textContent",v09DeviceStatus(d)+' · '+fmt(d.watts)+' кВт');
    switchState(row.querySelector('button'),d.enabled,'Питание: '+d.name);
  };
  function prioritySelect(value,label,callback){
    const select=document.createElement('select');select.className='v010Priority';I18n.setAttr(select,'aria-label',label);I18n.assign(select,'title',label);
    for(const n of [3,2,1]){const opt=document.createElement('option');opt.value=String(n);I18n.assign(opt,"textContent",priorityName(n));select.appendChild(opt);}select.value=String(value);select.onchange=()=>callback(+select.value);return select;
  }
  const originalCircuit=v09RenderCircuit;
  v09RenderCircuit=function(){
    originalCircuit();const parent=el('v09PowerCircuit');if(!parent)return;const room=V09Power.selectedRoom;
    const header=parent.querySelector('.v09CircuitHeader');if(header){const wrap=document.createElement('label');wrap.className='v010PriorityLabel';I18n.assign(wrap,"textContent",'Приоритет комнаты');wrap.appendChild(prioritySelect(roomRank(room),'Приоритет: '+V09Power.rooms[room],n=>setRoomPriority(room,n)));header.appendChild(wrap);}
    for(const row of parent.querySelectorAll('[data-power-device]')){const d=V09Power.devices[row.dataset.powerDevice];if(d)row.appendChild(prioritySelect(deviceRank(d.id),'Приоритет: '+d.name,n=>setDevicePriority(d.id,n)));}
    const note=document.createElement('p');note.className='v09PowerNote';I18n.assign(note,"textContent",'Сначала питаются комнаты с высоким приоритетом, затем приборы внутри них. Если энергии не хватает, остальные ждут и возобновляют работу автоматически.');parent.appendChild(note);
  };
  v09PowerStats=function(){return '<div class="v09PowerStats"><div class="v09PowerStat"><small>Генератор</small><b data-power="running"></b></div><div class="v09PowerStat"><small>Топливо</small><b data-power="fuel"></b><div class="v09PowerMeter"><i data-power="fuelbar"></i></div></div><div class="v09PowerStat"><small>Нагрузка / доступно</small><b data-power="load"></b></div><div class="v09PowerStat"><small>Батарея</small><b data-power="battery"></b><small data-power="reserve"></small><div class="v09PowerMeter"><i data-power="batterybar"></i></div></div></div><div class="v09PowerWarning" data-power="warning"></div>';};
  v09RefreshPowerUI=function(){
    const a=allocation();
    document.querySelectorAll('[data-power]').forEach(node=>{
      const key=node.dataset.power;
      if(key==='running')I18n.assign(node,"textContent",V09Power.running?(a.load+a.chargeInput>0?'Работает':'Ожидание'):'Выключен');
      if(key==='fuel')I18n.assign(node,"textContent",I18n.numeric(V09Power.fuel,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' / '+V09Power.capacity);
      if(key==='load')I18n.assign(node,"textContent",fmt(a.load)+' / '+fmt(a.supply)+' кВт');
      if(key==='fuelbar'||key==='tankbar')node.style[key==='tankbar'?'height':'width']=V09Power.fuel/V09Power.capacity*100+'%';
      if(key==='tankvalue')I18n.assign(node,"textContent",I18n.numeric(V09Power.fuel,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' / '+V09Power.capacity);
      if(key==='bagfuel')I18n.assign(node,"textContent",'В рюкзаке: '+bagCount('fuel')+' топлива');
      if(key==='generatorToggle')I18n.assign(node,"textContent",V09Power.running?'Остановить генератор':'Запустить генератор');
      if(key==='battery')I18n.assign(node,"textContent",Math.round(battery.charge/battery.capacity*100)+'% · '+fmt(battery.charge)+' кВт·ч');
      if(key==='batterybar')node.style.width=battery.charge/battery.capacity*100+'%';
      if(key==='reserve')I18n.assign(node,"textContent",remainingTime(a));
      if(key==='battery-flow')I18n.assign(node,"textContent",a.chargeInput>0?'Зарядка: '+fmt(a.chargeInput)+' кВт':a.batteryOutput>0?'Питание базы: '+fmt(a.batteryOutput)+' кВт':remainingTime(a));
      if(key==='battery-toggle')switchState(node,battery.enabled,'Резервная батарея');
      if(key==='warning')I18n.assign(node,"textContent",a.shed.length?'Приборов ожидают мощности: '+a.shed.length+'. Высокие приоритеты получают питание первыми.':a.supply<=0?'Нет энергии. Запустите генератор или подключите заряженную батарею.':a.batteryOutput>0?'Батарея питает базу · '+remainingTime(a):a.chargeInput>0?'Свободная мощность заряжает батарею: '+fmt(a.chargeInput)+' кВт':'Свободно '+fmt(a.supply-a.load)+' кВт');
    });
    document.querySelectorAll('[data-power-device]').forEach(v09UpdateDeviceRow);
    document.querySelectorAll('[data-room-power-toggle]').forEach(node=>switchState(node,V09Power.roomEnabled[node.dataset.roomPowerToggle],'Питание: '+V09Power.rooms[node.dataset.roomPowerToggle]));
    document.querySelectorAll('[data-room-power-status]').forEach(node=>{const room=node.dataset.roomPowerStatus;const devices=Object.values(V09Power.devices).filter(d=>d.room===room&&d.enabled&&d.active());const demand=devices.reduce((n,d)=>n+d.watts,0),load=devices.filter(d=>a.served.has(d.id)).reduce((n,d)=>n+d.watts,0);I18n.assign(node,"textContent",(V09Power.roomEnabled[room]?'Контур включён':'Контур отключён')+' · '+fmt(load)+' / '+fmt(demand)+' кВт');});
    document.querySelectorAll('[data-power-room]').forEach(node=>{
      const room=node.dataset.powerRoom,enabled=V09Power.roomEnabled[room],devices=Object.values(V09Power.devices).filter(d=>d.room===room&&d.enabled&&d.active()),powered=enabled&&a.supply>0&&devices.every(d=>a.served.has(d.id));
      node.classList.toggle('powered',powered);node.classList.toggle('waiting',enabled&&!powered);node.classList.toggle('selected',room===V09Power.selectedRoom);
      const small=node.querySelector('small');if(small)I18n.assign(small,"textContent",room==='corridor'?'':!enabled?'Выкл.':!powered?'Ожидание':fmt(devices.reduce((s,d)=>s+d.watts,0))+' кВт');
    });
    document.querySelectorAll('[data-power-spot]').forEach(node=>{const d=V09Power.devices[node.dataset.powerSpot];node.classList.toggle('powered',a.served.has(d.id));node.classList.toggle('waiting',d.enabled&&V09Power.roomEnabled.yard&&!a.served.has(d.id));});
  };
  function openBattery(){
    const overlay=v09Overlay('v010BatteryOverlay','Энергоблок · резервная батарея'),body=overlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",v09PowerStats());
    const row=document.createElement('div');row.className='v09DeviceRow';const text=document.createElement('div');I18n.assign(text,"innerHTML",'<strong>Резервное питание</strong><small data-power="battery-flow"></small>');row.appendChild(text);const button=v09Button('',()=>GameRecovery.request('battery','battery',{value:!battery.enabled}),'v09DeviceToggle');button.dataset.power='battery-toggle';row.appendChild(button);body.appendChild(row);
    const note=document.createElement('p');note.className='v09PowerNote';I18n.assign(note,"textContent",'Ёмкость: 1,5 кВт·ч. Зарядка до 3 кВт от свободной мощности генератора, отдача до 6 кВт. Батарея поддерживает базу при остановке генератора и помогает при большой нагрузке. Выключатель энергоблока не отключает резерв.');body.appendChild(note);
    const remote=v09Button('Открыть пульт базы',v09OpenPowerRemote);body.appendChild(remote);v09RefreshPowerUI();openOverlay(overlay);
  }
  const originalRemote=v09OpenPowerRemote;
  v09OpenPowerRemote=function(){originalRemote();const body=el('v09PowerOverlay')?.querySelector('.v09Body');if(body){const actions=body.querySelector('.v09PowerActions');(actions||body).appendChild(v09Button('Батарея',openBattery));}};
  const originalToggleGenerator=v09ToggleGenerator;
  v09ToggleGenerator=function(){const before=V09Power.running;originalToggleGenerator();if(V09Power.running!==before)log(V09Power.running?'Генератор запущен.':'Генератор остановлен.');};
  const originalGenerator=v09OpenGenerator;
  v09OpenGenerator=function(refuel=false){originalGenerator(refuel);const body=el('v09GeneratorOverlay')?.querySelector('.v09Body');if(!body)return;const note=[...body.querySelectorAll('.v09PowerNote')].find(n=>I18n.source(n).includes('Мощность:'));if(note)I18n.assign(note,"textContent",'Мощность генератора: '+fmt(V09Power.supply)+' кВт. Расход топлива зависит от выбранной сложности. Свободная мощность заряжает батарею; готовые изделия и прогресс сохраняются при остановке.');body.appendChild(v09Button('Резервная батарея',openBattery));};
  const originalExecute=executeInteraction;
  executeInteraction=function(target){if(target?.kind!=='v09battery')return originalExecute(target);if(menuOpen||playerDead||!canInteract(target,player.x,player.y))return;GameMovement.openUI();openBattery();};
  function monitor(a){
    edge('fuelLow',V09Power.running&&V09Power.fuel>0&&V09Power.fuel<=2,'Топливо заканчивается: заправьте генератор.');
    edge('batteryLow',a.batteryOutput>0&&battery.charge/battery.capacity<=.1,'Низкий заряд резервной батареи.');
    edge('shed',a.shed.length>0&&a.supply>0,'Не хватает мощности: часть приборов ожидает питания по приоритету.');
    if(AgricultureTime.available&&typeof livestockAlive!=='undefined'&&livestockAlive){
      const count=(i,type)=>(storageChests[i]?.items||[]).reduce((n,s)=>n+(s?.type===type?s.qty:0),0);
      edge('feed',count(12,'animal_feed')===0,'Ферма: у животных закончился корм.');
      edge('water',count(13,'water')===0,'Ферма: у животных закончилась вода.');
    }
    if(AgricultureTime.available&&Array.isArray(window.farmState))window.farmState.forEach((s,i)=>{const ready=s?.crop!==null&&s?.crop!==undefined&&Date.now()-s.plantedAt>=farmGrowMs(s.crop);if(ready&&!harvestSeen[i])log('Ферма: урожай на грядке '+(i+1)+' созрел.');harvestSeen[i]=ready;});
  }
  powerTick=function(dt){
    if(document.hidden||playerDead)return;dt=clamp(Number(dt)||0,0,.1);if(!dt)return;
    const multiplier=typeof V010World!=='undefined'?Number(V010World.settings?.fuelRate)||1:1;
    if(V09Power.running){
      const fuelAllocation=allocation(dt);const generatedKW=Math.min(V09Power.supply,Math.max(0,fuelAllocation.load+fuelAllocation.chargeInput));V09Power.fuel=Math.max(0,V09Power.fuel-dt/60*multiplier*generatedKW/Math.max(.001,V09Power.supply));
      if(V09Power.fuel<=0){V09Power.running=false;message('Генератор остановился: закончилось топливо');log('Генератор остановился: закончилось топливо.');queueGameSave();}
    }
    const a=allocation(dt),before=battery.charge;lastFlow={charge:a.chargeInput,discharge:a.batteryOutput};
    battery.charge=clamp(battery.charge+(a.chargeInput-a.batteryOutput)*dt/3600,0,battery.capacity);
    if(before>0&&battery.charge<=.000000001&&a.batteryOutput>0){battery.charge=0;log('Резервная батарея разряжена.');queueGameSave();}
    const occupants=BunkerLayout.occupants('bunker');
    for(const d of v09Doors){
      if(!BunkerLayout.roomActive(d.room))continue;
      const near=occupants.some(a=>distance(a.x,a.y,d.x+d.w/2,d.y+d.h/2)<116.25);
      const occupied=d.open>.2&&occupants.some(a=>rectHit(a.x,a.y,(a.radius||10)+8,d));
      const powered=a.served.has('door_'+d.room);
      if(near||occupied)d.away=0;else d.away=Math.min(4,d.away+dt);
      if(d.away>=4)d.manual=false;
      const shouldOpen=occupied||(near&&powered)||d.manual||(d.open>0&&d.away<4);
      window.GameAudioWorld?.door(d,shouldOpen,'bunker',!!window.V018Build?.isBroken(d.id));d.open=clamp(d.open+(shouldOpen?1:-1)*dt*2.2,0,1);
    }
    clock+=dt;if(clock>=2){clock=0;monitor(a);}
    V09Power.uiClock+=dt;if(V09Power.uiClock>.25){V09Power.uiClock=0;v09RefreshPowerUI();}
  };
  V09Power.tick=powerTick;
  v09DrawRoomSwitch=function(room){
    const s=v09RoomSwitches.find(v=>v.room===room);if(!s)return;const enabled=V09Power.roomEnabled[room],powered=devicePowered('light_'+room);
    ctx.save();ctx.fillStyle='#223238';ctx.strokeStyle='#738984';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(s.x-7,s.y-11,14,22,2);ctx.fill();ctx.stroke();ctx.fillStyle=enabled?'#87a699':'#56656a';ctx.fillRect(s.x-4,s.y+(enabled?-6:0),8,7);ctx.fillStyle=enabled&&powered?'#b1e0b5':enabled?'#d3ac63':'#65746f';ctx.fillRect(s.x-2,s.y-9,4,2);ctx.restore();
  };
  const originalReadouts=v09DrawEnergyReadouts;
  v09DrawEnergyReadouts=function(){
    originalReadouts();const a=allocation();ctx.save();ctx.textAlign='center';ctx.fillStyle='#46504b';ctx.fillRect(1050,431,154,48);ctx.fillStyle='#d8ecd4';ctx.font='12px Arial';ctx.fillText(I18n.text(fmt(a.load)+' / '+fmt(a.supply)+' кВт'),1127,450);ctx.font='8px Arial';ctx.fillText(I18n.text(a.batteryOutput>0?'СЕТЬ + РЕЗЕРВ':a.chargeInput>0?'СЕТЬ · ЗАРЯДКА':'ПИТАНИЕ БАЗЫ'),1127,468);ctx.fillStyle='#263a3c';ctx.fillRect(1253,340,69,105);ctx.strokeStyle='#8eada8';ctx.lineWidth=2;ctx.strokeRect(1264,361,47,61);ctx.fillStyle=battery.enabled?'#75b99b':'#667775';const fill=clamp(battery.charge/battery.capacity,0,1);ctx.fillRect(1268,418-53*fill,39,53*fill);ctx.fillStyle='#e1f0e8';ctx.font='12px Arial';ctx.fillText(I18n.text(Math.round(fill*100)+'%'),1287,351);ctx.fillStyle='#24383c';ctx.fillRect(1239,479,97,27);ctx.fillStyle='#b5d4c8';ctx.font='9px Arial';ctx.fillText(I18n.text(!battery.enabled?'ОТКЛЮЧЕНА':a.batteryOutput>0?'ПИТАЕТ БАЗУ':a.chargeInput>0?'ЗАРЯЖАЕТСЯ':fill>0?'РЕЗЕРВ':'РАЗРЯЖЕНА'),1287,493);ctx.restore();
  };
  v09Style(`
.v09DeviceRow{padding:5px 0;gap:8px;min-height:35px}.v09DeviceRow>div:first-child{flex:1;min-width:0}.v09DeviceRow strong{font-size:11px}.v09DeviceRow small{font-size:10px;margin-top:2px;line-height:1.3}.v09DeviceToggle{position:relative;box-sizing:border-box;flex:0 0 42px;width:42px!important;min-width:42px!important;max-width:42px!important;height:25px!important;min-height:25px!important;padding:0!important;border-radius:15px!important;border:1px solid #586b70!important;background:#2b3b42!important;box-shadow:none!important;font-size:0!important;overflow:visible!important}.v09DeviceToggle:before{content:'';position:absolute;inset:-9px -1px}.v09DeviceToggle:after{content:'';position:absolute;width:17px;height:17px;left:3px;top:3px;border-radius:50%;background:#a6b3b7;transition:transform .12s,background .12s}.v09DeviceToggle.on{background:#315f50!important;border-color:#8abda1!important}.v09DeviceToggle.on:after{transform:translateX(17px);background:#d8f1df}.v09DeviceToggle:focus-visible{outline:2px solid #e4d5a2;outline-offset:3px}.v09PowerStats{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.v09PowerStat{padding:8px 6px}.v09PowerStat b{font-size:12px}.v09PowerStat small{font-size:9px}.v09PowerStat [data-power="reserve"]{margin-top:5px;letter-spacing:0;text-transform:none}.v010Priority{font:10px Arial;color:#d6e6df;background:#21373d;border:1px solid #476066;border-radius:5px;min-height:28px;max-width:100px;padding:3px}.v010PriorityLabel{font-size:9px;color:#9db8b8;display:flex;flex-direction:column;gap:3px;align-items:flex-start}.v09CircuitHeader{flex-wrap:wrap}.v09CircuitHeader>div:first-child{flex:1}.v09CircuitHeader .v010PriorityLabel{margin-left:2px}.v09PowerWarning{line-height:1.4}.v09PowerActions button{min-height:34px;font-size:11px;padding:6px 10px}@media(max-width:480px){.v09PowerStats{grid-template-columns:repeat(2,minmax(0,1fr))}.v09DeviceRow{gap:6px}.v010Priority{max-width:85px;font-size:9px}}`);
  function capture(){return {schema:1,battery:{charge:battery.charge,enabled:battery.enabled},roomPriority:{...roomPriority},devicePriority:{...devicePriority},warnings:{...warnings},harvestSeen:{...harvestSeen}};}
  function validate(s){
    if(!s||s.schema!==1||!s.battery||!Number.isFinite(s.battery.charge)||s.battery.charge<0||s.battery.charge>battery.capacity||typeof s.battery.enabled!=='boolean')throw Error('Неверное сохранение резервной батареи');
    for(const [key,known] of [['roomPriority',V09Power.rooms],['devicePriority',V09Power.devices]])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key])||Object.entries(s[key]).some(([id,n])=>!Object.hasOwn(known,id)||![1,2,3].includes(n)))throw Error('Неверное сохранение приоритетов питания');
    for(const key of ['warnings','harvestSeen'])if(s[key]!==undefined&&(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key])||Object.keys(s[key]).length>32||Object.values(s[key]).some(v=>typeof v!=='boolean')))throw Error('Неверное сохранение уведомлений');
    return true;
  }
  function restore(s){
    if(s)validate(s);battery.charge=s?.battery.charge??0;battery.enabled=s?.battery.enabled??true;roomPriority={...(s?.roomPriority||{})};devicePriority={...(s?.devicePriority||{})};warnings={...(s?.warnings||{})};harvestSeen={...(s?.harvestSeen||{})};clock=0;lastFlow={charge:0,discharge:0};allocation();v09RefreshPowerUI();
  }
  const api={battery,allocation,capture,snapshot:capture,restore,validate,setRoomPriority,setDevicePriority,roomPriority:roomRank,devicePriority:deviceRank,open:openBattery,remainingTime,get flow(){return {...lastFlow};}};
  window.V010Energy=api;
  if(typeof V010!=='undefined'&&V010.modules)V010.register('energy',api);
  return api;
})();
