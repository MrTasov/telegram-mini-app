/* One physical enhancement cradle. The item is either here or in an inventory. */
window.V0161Upgrade=(()=>{
  const slots=[null],station={id:'upgrade0161',kind:'upgrade0161',name:'Станок усиления',x:443,y:794,w:139,h:110,range:70};
  const inv=V010Inventory,combat=V010Combat,robot=V014Robots,copy=x=>JSON.parse(JSON.stringify(x));
  const labels={body:'Корпус',battery:'Аккумулятор',cargo:'Контейнер',weapon:'Оружие',engine:'Двигатель'};
  let overlay=null,refs={},selectedModule='body',pulseUntil=0,lastSignature='';
  const eligibleGear=s=>!!s&&(!!V09Craft.weapons[s.type]||['head','body','legs','feet'].includes(ITEM[s.type]?.equip));
  const accepts=s=>!!s&&(eligibleGear(s)||s.type==='hmg016'&&V016Turret.validItem(s)||s.type==='drone014'&&s.robotId===robot.state.id&&robot.state.packed);
  function near(){return scene==='bunker'&&!playerDead&&canInteract(station,player.x,player.y);}
  function level(s=slots[0],key=selectedModule){return s?.type==='drone014'?robot.state.modules[key]||0:s?.type==='hmg016'?s.turretData.level||0:s?.level||0;}
  function cost(s=slots[0],key=selectedModule){
    if(!s)return {};const n=level(s,key)+1,heavy=s.type==='hmg016',drone=s.type==='drone014',weapon=!!V09Craft.weapons[s.type];
    return {iron:n*(heavy?50:drone?30:weapon?32:25),copper:n*(heavy?25:drone?18:weapon?16:12),parts:n*(heavy?15:drone?12:weapon?10:8),...(n>=4?{advanced_parts:(n-3)*(heavy?5:drone?4:weapon?3:2)}:{})};
  }
  const droneCost=key=>cost({type:'drone014'},key);
  function changed(){lastSignature='';inv.render();queueGameSave();refresh(true);}
  function deposit(from,index){if(!near()||slots[0])return false;const s=inv.list(from)?.[index];if(!accepts(s)||s.locked){message('Выберите доступное оружие, экипировку или упакованный дрон');return false;}combat.cancelReload();const ok=inv.move(from,index,'upgrade',0);if(ok)changed();return ok;}
  function depositEquipment(key){const s=equipment[key];if(!near()||slots[0]||!accepts(s)||s.locked)return false;slots[0]=s;equipment[key]=null;combat.refreshStats();changed();return true;}
  function take(){if(!near()||!slots[0])return false;const moved=inv.transfer('upgrade',0,'bag');if(!moved)message('Освободите ячейку в рюкзаке');else changed();return !!moved;}
  function upgrade(s=slots[0],key=selectedModule){
    if(!near()||!s||s!==slots[0]||!accepts(s)){message('Положите предмет на станок усиления');return false;}
    if(s.locked){message('Сначала открепите предмет');return false;}
    if(s.type==='drone014'&&!Object.hasOwn(labels,key))return false;
    if(level(s,key)>=5){message('Максимальное усиление +5');return false;}
    if(!devicePowered(station.id)){message('Станку нужно питание · 2 кВт');return false;}
    const input=cost(s,key);if(!inv.consumeMaterials(input)){for(const b of overlay?.querySelectorAll('[data-upgrade-material]')||[])if(inv.materialCount(b.dataset.upgradeMaterial)<input[b.dataset.upgradeMaterial]){b.classList.remove('v013Missing');void b.offsetWidth;b.classList.add('v013Missing');}message('Не хватает материалов для усиления');return false;}
    if(s.type==='drone014')robot.state.modules[key]++;else if(s.type==='hmg016')s.turretData.level=level(s)+1;else{combat.ensure(s);s.level++;}
    pulseUntil=performance.now()+1000;V010.emit('equipmentupgrade',{type:s.type,level:level(s,key)});combat.refreshStats();robot.changed();changed();message((s.type==='drone014'?labels[key]:ITEM[s.type].name)+' · усилено до +'+level(s,key));return true;
  }
  function upgradeDrone(key){return slots[0]?.type==='drone014'&&upgrade(slots[0],key);}
  function text(parent,tag,cls,value){const e=document.createElement(tag);e.className=cls;if(value!==undefined)e.textContent=value;parent.append(e);return e;}
  function build(){
    overlay=v09Overlay('v0161UpgradePanel','Станок усиления');const body=overlay.querySelector('.v09Body');body.replaceChildren();
    const header=text(body,'div','v161StationHero');header.innerHTML='<img src="'+V011Art.sources.upgrade_station0161+'" alt="Станок усиления"><div><b>Усиление снаряжения</b><p>Оружие · экипировка · пулемёт · дрон</p><small id="v161UpgradePower"></small></div>';
    refs.power=el('v161UpgradePower');const area=text(body,'div','v161UpgradeWork');refs.cradle=text(area,'div','v161Cradle');refs.card=text(area,'div','v161UpgradeCard');
    refs.modules=text(body,'div','v161UpgradeModules');refs.materials=text(body,'div','v161UpgradeMaterials');
    const actions=text(body,'div','v161UpgradeActions');refs.upgrade=v09Button('Усилить',()=>upgrade());refs.upgrade.id='v161UpgradeButton';refs.take=v09Button('Забрать предмет',take);refs.take.id='v161UpgradeTake';actions.append(refs.upgrade,refs.take);
    text(body,'p','v161UpgradeHint','Удерживайте предмет и перенесите в ячейку станка или выберите его ниже. Материалы берутся из рюкзака и складов базы. Предмет останется на станке после закрытия окна.');
    refs.pick=text(body,'div','v161UpgradePick');refs.quick=text(body,'div','v161UpgradeQuick');refs.bag=text(body,'div','inventoryGrid');refs.bag.id='v161UpgradeBag';
  }
  function chooseModule(key){if(!Object.hasOwn(labels,key))return false;selectedModule=key;lastSignature='';refresh(true);return true;}
  function refresh(force=false){
    if(!overlay||!overlay.classList.contains('open'))return;
    const s=slots[0],on=devicePowered(station.id),signature=JSON.stringify([s,robot.state.modules,robot.state.hp,robot.state.battery,bag,quickItems(),equipment,selectedModule,on,near(),Object.entries(cost(s)).map(([t])=>inv.materialCount(t))]);
    if(!force&&lastSignature===signature)return;lastSignature=signature;
    refs.power.textContent=on?'Питание включено · 2 кВт':'Нет питания · требуется 2 кВт';refs.power.className=on?'powered':'missing';
    refs.cradle.replaceChildren();const cell=inv.cell('upgrade',0,s);cell.id='v161UpgradeSlot';cell.setAttribute('aria-label',s?ITEM[s.type].name:'Ячейка станка усиления');if(!s){const hint=document.createElement('span');hint.textContent='＋';cell.append(hint);}refs.cradle.append(cell);
    refs.card.replaceChildren();text(refs.card,'b','',s?ITEM[s.type].name:'Выберите предмет');text(refs.card,'div','v161Level',s?'Усиление +'+level(s)+' / 5':'Перенесите предмет сюда');
    if(s?.type==='drone014'){text(refs.card,'p','',robot.state.name+' · '+Math.round(robot.state.battery)+'%');text(refs.card,'p','','Здоровье '+Math.round(robot.state.hp)+' / '+robot.maxHp()+' · урон '+robot.combat.damage);}
    else if(s?.type==='hmg016'){text(refs.card,'p','','Урон '+V016Turret.damage(s.turretData)+' · патроны '+s.turretData.ammo+' / 600');text(refs.card,'p','','Дальность 850 · поворот 360°');}
    else if(s){const stats=document.createElement('div');stats.innerHTML=V011UI.statsHTML(s);refs.card.append(stats);}
    refs.modules.replaceChildren();if(s?.type==='drone014')for(const [key,label]of Object.entries(labels)){const b=v09Button(label+' +'+robot.state.modules[key],()=>chooseModule(key),selectedModule===key?'selected':'');b.dataset.upgradeModule=key;refs.modules.append(b);}
    refs.materials.replaceChildren();if(s&&level(s)<5)for(const [t,n]of Object.entries(cost(s))){const have=inv.materialCount(t),row=text(refs.materials,'div','v161Material'+(have<n?' missing':''));row.dataset.upgradeMaterial=t;row.innerHTML=itemIconHTML(t)+'<span>'+ITEM[t].name+'<small>'+have+' / '+n+'</small></span>';}
    refs.upgrade.textContent=!s?'Усилить':level(s)>=5?'Максимум +5':'Усилить до +'+(level(s)+1);refs.upgrade.disabled=!s||!on||!near()||level(s)>=5||!!s.locked;refs.take.disabled=!s||!near();
    refs.pick.replaceChildren();for(const [key,item]of Object.entries(equipment))if(accepts(item)){const b=v09Button(ITEM[item.type].name+' · снять со снаряжения',()=>depositEquipment(key));b.disabled=!!s;refs.pick.append(b);}
    refs.quick.replaceChildren();quickItems().forEach((item,i)=>{const cell=inv.cell('quick',i,item);cell.onclick=e=>{e.stopPropagation();if(!inv.clickSuppressed()&&item)deposit('quick',i);};refs.quick.append(cell);});
    refs.bag.replaceChildren();for(let i=0;i<BAG_SLOTS;i++){const item=bag[i],cell=inv.cell('bag',i,item);cell.onclick=e=>{e.stopPropagation();if(!inv.clickSuppressed()&&item)deposit('bag',i);};if(item&&!accepts(item))cell.classList.add('v161Unavailable');refs.bag.append(cell);}
    // Retain magazine installation and existing specialization without a second
    // cheap enhancement route. Components still consume the correct module.
    if(s&&V09Craft.weapons[s.type])window.V0162Magazines?.render(refs.pick,s,changed);
    else if(s&&eligibleGear(s))for(const [key,label]of [['balanced','Баланс'],['vitality','Живучесть'],...(ITEM[s.type].equip==='feet'?[['speed','Скорость']]:[])]){const b=v09Button((s.specialization===key?'✓ ':'')+label,()=>{s.specialization=key;combat.refreshStats();changed();});b.disabled=!!s.locked;refs.pick.append(b);}
  }
  function quickItems(){return V013Inventory.items;}
  function open(){if(!near()){message('Подойдите к станку усиления в углу мастерской');return false;}if(!overlay)build();openOverlay(overlay);refresh(true);return true;}
  registerPowerDevice(station.id,'workshop',2,()=>!!slots[0]&&!!overlay?.classList.contains('open'),'Станок усиления');
  let lastRefresh=0;const updateBefore=update;update=function(...args){const r=updateBefore(...args);if(overlay?.classList.contains('open')&&performance.now()-lastRefresh>=250){lastRefresh=performance.now();refresh();}return r;};
  const solids=solidObjects;solidObjects=function(which=scene){const a=solids(which);return which==='bunker'?[...a,{...station}]:a;};
  const objects=interactionObjects;interactionObjects=function(which=scene){const a=objects(which);return which==='bunker'?[...a,{...station}]:a;};
  const execute=executeInteraction;executeInteraction=function(o,...args){if(o?.kind===station.kind)return open();return execute(o,...args);};
  const drawB=drawBunker;drawBunker=function(...a){const r=drawB(...a);ctx.save();V011Rooms.shadow(station.x,station.y,station.w,station.h,11,'workshop');V011Art.draw('upgrade_station0161',station.x,station.y,station.w,station.h);if(performance.now()<pulseUntil){const y=station.y+35+(performance.now()%850)/850*45;ctx.strokeStyle='#85e7caaa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(station.x+34,y);ctx.lineTo(station.x+108,y);ctx.stroke();}ctx.fillStyle='#bbd5c2';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText('УСИЛЕНИЕ',station.x+station.w/2,station.y+station.h+14);ctx.restore();return r;};
  const cap=captureGameProgress;captureGameProgress=function(){const d=cap();d.upgrade0161={schema:1,item:copy(slots[0])};return d;};
  function validate(d){const u=d.upgrade0161;if(u===undefined)return true;if(!u||u.schema!==1||!Object.hasOwn(u,'item'))throw Error('Некорректный станок усиления');const s=u.item;if(s===null)return true;
    if(!s||s.qty!==1||!ITEM[s.type]||!(eligibleGear(s)||s.type==='hmg016'||s.type==='drone014')||combat.validateItem(s)===false)throw Error('Некорректный предмет на станке');
    if(s.type==='drone014'&&(!d.robots014?.packed||s.robotId!=='drone014'))throw Error('Некорректный дрон на станке');
    if(s.uid){let count=0;function visit(v){if(!v||typeof v!=='object')return;if(v.type&&v.uid===s.uid)count++;for(const x of Object.values(v))visit(x);}visit(d);if(count!==1)throw Error('Повтор предмета на станке');}return true;
  }
  const decode=decodeGameProgress;decodeGameProgress=function(raw){const probe=JSON.parse(raw);if(probe.v09?.power?.deviceEnabled&&probe.v09.power.deviceEnabled.upgrade0161===undefined)probe.v09.power.deviceEnabled.upgrade0161=true;const d=decode(JSON.stringify(probe));validate(d);return d;};
  const restore=restoreGameProgress;restoreGameProgress=function(d){validate(d);slots[0]=copy(d.upgrade0161?.item||null);restore(d);lastSignature='';pulseUntil=0;refresh(true);};
  v09Style(`
    #v0161UpgradePanel .panel{width:min(480px,94vw);max-height:82dvh;overflow-y:auto;padding:13px}
    .v161StationHero{display:flex;align-items:center;gap:12px;padding-bottom:9px;border-bottom:1px solid #69867a44}.v161StationHero img{width:86px;height:72px;object-fit:contain}.v161StationHero b{font-size:13px}.v161StationHero p{font-size:10px;color:#acc1b7;margin:5px 0}.v161StationHero small{font-size:10px;color:#a5ccac}
    .v161UpgradeWork{display:grid;grid-template-columns:104px minmax(0,1fr);gap:12px;margin:13px 0;align-items:center}.v161Cradle .v010Slot{width:104px;height:104px!important;border:1px dashed #c1b382!important;background:radial-gradient(ellipse,#48715b44,#132725)!important}.v161Cradle .v010Slot .ico{height:93px!important}.v161Cradle .v010Slot .ico .itemIcon{width:94px!important;height:94px!important}.v161Cradle .v010Slot>span{font-size:29px;color:#779a87}
    .v161UpgradeCard b{font-size:13px}.v161UpgradeCard p{font-size:11px;color:#b7ccc1;margin:6px 0}.v161Level{font-size:12px;color:#dcc68f;margin:5px 0}.v161UpgradeCard .v011ItemStats{margin:3px 0;padding:2px 0}.v161UpgradeCard .v011StatRow{font-size:10px;padding:2px 0}
    .v161UpgradeModules{display:flex;gap:4px;flex-wrap:wrap}.v161UpgradeModules button{font-size:10px!important;width:auto!important;min-height:30px!important;margin:0!important}.v161UpgradeModules .selected{border-color:#d6c28d;background:#345647}
    .v161UpgradeMaterials{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:10px 0}.v161Material{display:flex;gap:7px;align-items:center;border:1px solid #78908444;border-radius:7px;padding:5px;font-size:11px;background:#1b302d}.v161Material .itemIcon{width:36px;height:36px}.v161Material small{display:block;font-size:11px;color:#cad8c8}.missing,.missing small{color:#e3a093!important}
    .v161UpgradeActions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v161UpgradeActions button{margin:0!important;font-size:12px!important}.v161UpgradeActions button:first-child{background:#365f4b}.v161UpgradeActions button:disabled{opacity:.45}
    .v161UpgradeHint{font-size:10px!important;color:#a4b9b0;line-height:1.5}.v161UpgradePick{display:flex;flex-wrap:wrap;gap:4px}.v161UpgradePick button{width:auto!important;font-size:10px!important;min-height:28px!important;padding:5px!important;margin:0!important}
    .v161UpgradeQuick{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:10px 0}.v161Unavailable{opacity:.45}
    #v161UpgradeBag{max-height:176px;overflow-y:auto;touch-action:pan-y;overscroll-behavior:contain}.v161UpgradeQuick .v010Slot,#v161UpgradeBag .v010Slot{min-width:0!important}
  `);
  invalidateGeometry();return{slots,station,near,level,accepts,cost,droneCost,deposit,depositEquipment,take,upgrade,upgradeDrone,chooseModule,open,refresh,validate};
})();
// Real asset icons replace generated SVG stand-ins everywhere (craft, details,
// inventories and quick slots) while retaining existing item IDs and saves.
(()=>{
  const icons={helmet1:'helmet0161',magazine_module:'magazine0161',drone014:'drone014'};
  const oldIcon=itemIconHTML;itemIconHTML=function(type){const key=icons[type];return key&&V011Art.sources[key]?'<img class="itemIcon" src="'+V011Art.sources[key]+'" alt="'+ITEM[type].name+'" draggable="false">':oldIcon(type);};
  for(const [type,key]of Object.entries(icons))V092_ICONS[type]=V011Art.sources[key];
  renderBag();V0161UI.refreshQuick();
})();

