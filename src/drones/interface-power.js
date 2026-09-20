/* Generation follows useful output: loads plus reserve battery charging. */
const V014Energy=(()=>{
  registerPowerDevice('irrigation014','farm',.5,()=>Number(window.V011Farm?.pumpDemand?.()||0)>0,'Насос автополива');
  const output=()=>{const a=V010Energy.allocation();return V09Power.running?Math.min(V09Power.supply,a.load+a.chargeInput):0;};
  const fuelRate=()=>output()/Math.max(.001,V09Power.supply)*(Number(V010World.settings.fuelRate)||1);
  const oldStats=v09PowerStats;
  v09PowerStats=function(){return oldStats()+'<div class="v014Generation" style="font-size:11px;line-height:1.5;color:#9db8b4;margin:7px 0" data-generation014></div>';};
  const refresh=v09RefreshPowerUI;
  v09RefreshPowerUI=function(){refresh();const kw=output(),rate=fuelRate();for(const node of document.querySelectorAll('[data-generation014]'))I18n.assign(node,"textContent",'Выработка '+I18n.numeric(kw,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' / '+V09Power.supply+' кВт · топливо '+I18n.numeric(rate,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})+' / мин');};
  window.V014Energy={output,fuelRate};return window.V014Energy;
})();

/* Stable mobile card: only values and changed inventory cells are patched. */
window.V0141DroneUI=(()=>{
  const robot=V014Robots,state=robot.state,refs={},buttons={},grids={};let overlay=null,selected=null,drag=null,suppressUntil=0;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)I18n.assign(e,"textContent",text);return e;};
  const set=(e,text)=>{text=String(text);if(e&&I18n.source(e)!==text)I18n.assign(e,"textContent",text);};
  function command(parent,id,text,fn){const b=v09Button(text,()=>{fn();refresh();});buttons[id]=b;parent.append(b);return b;}
  function section(parent,title){const s=node('section','droneCardSection');s.append(node('div','droneSectionTitle',title));parent.append(s);return s;}
  function stat(parent,key,label){const row=node('div','droneStatRow');row.append(node('span','',label));refs[key]=node('b');row.append(refs[key]);parent.append(row);}
  function build(){
    overlay=v09Overlay('v014DronePanel','Дрон');const body=overlay.querySelector('.v09Body');body.replaceChildren();body.classList.add('droneCardBody');
    const head=node('div','droneCardHead'),portrait=node('div','dronePortrait'),img=node('img');img.src=V011Art.sources.drone014;I18n.assign(img,"alt",'Дрон-компаньон');portrait.append(img);head.append(portrait);
    const stats=node('div','droneCardStats');refs.status=node('b','droneStatus');stats.append(refs.status);stat(stats,'battery',I18n.message('ux.drone_battery'));stat(stats,'hp','Прочность');stat(stats,'damage','Урон');stat(stats,'load','Груз');head.append(stats);
    const ammo=node('section','droneAmmo');const ammoHead=node('div','droneStatRow');ammoHead.append(node('span','','Боезапас'));refs.ammo=node('b');ammoHead.append(refs.ammo);ammo.append(ammoHead);
    const ammoIcon=node('div','droneAmmoIcon');I18n.assign(ammoIcon,"innerHTML",itemIconHTML('ammo'));ammoIcon.append(node('small','','АК · 5,45'));ammo.append(ammoIcon);command(ammo,'reload','Загрузить патроны',()=>robot.reload());
    for(const [key,label]of [['light','Фонарь'],['combat','Боевой режим']]){
      const toggle=node('button','droneSwitch'),rail=node('span','droneSwitchRail');toggle.type='button';toggle.setAttribute('role','switch');I18n.setAttr(toggle,'aria-label',label);rail.setAttribute('aria-hidden','true');
      refs[key]=toggle;refs[key+'Value']=node('span','droneSwitchValue');rail.append(refs[key+'Value']);toggle.append(node('span','',label),rail);
      toggle.addEventListener('click',()=>{if(key==='combat')robot.setCombat(!robot.combatEnabled());else{state.light=!state.light;robot.changed();}refresh();});ammo.append(toggle);
    }head.append(ammo);body.append(head);
    const commands=section(body,'Команды дрону'),row=node('div','droneCommandGrid');command(row,'follow','Следовать',robot.follow);command(row,'guard','Охранять здесь',robot.guard);command(row,'dock','На станцию',robot.returnToDock);commands.append(row);
    const combat=node('div','droneCombatGrid');command(combat,'defense','Защищать',()=>robot.mode('defense'));command(combat,'attack','Атаковать цель',()=>{robot.mode('attack');const t=V014Controls.target()||V0105.target;if(t)robot.attack(t);else message('Выберите противника на экране или карте');});commands.append(combat);
    const inv=section(body,'Инвентарь дрона');refs.cargoTitle=inv.children[0];grids.drone=node('div','droneItemGrid');inv.append(grids.drone);
    const cargoFooter=node('div','droneInventoryActions');refs.selection=node('span','droneTransferHint','Выберите предмет');cargoFooter.append(refs.selection);command(cargoFooter,'transfer','Переложить',transferSelected);inv.append(cargoFooter);
    const bagDetails=node('details','dronePlayerBag');bagDetails.open=true;const summary=node('summary');refs.bagTitle=node('span','','Мой рюкзак');summary.append(refs.bagTitle);bagDetails.append(summary);grids.bag=node('div','droneItemGrid');bagDetails.append(grids.bag);body.append(bagDetails);
    refs.range=node('p','droneTransferHint');body.append(refs.range);
    const rescue=node('div','droneRescue');command(rescue,'pack','Забрать дрон',()=>robot.pack());command(rescue,'launch','Запустить',()=>robot.deploy(bag.find(robot.ownsToken)));body.append(rescue);
    const more=node('details','droneMore');more.append(node('summary','','Обслуживание'));more.append(node('p','droneTransferHint','Усиление модулей — на станке усиления в мастерской. Заберите дрон в рюкзак.'));
    const rename=node('div','droneRename'),name=node('input');name.type='text';name.maxLength=24;name.value=state.name;I18n.setAttr(name,'aria-label','Имя дрона');refs.name=name;rename.append(name);command(rename,'rename','Сохранить имя',()=>{state.name=name.value.trim().slice(0,24)||'Спутник';robot.changed();});more.append(rename);
    for(const [key,label]of [['autoCollect','Собирать открытые предметы рядом'],['economy','Экономить заряд']]){const row=node('label','droneToggle',label),input=node('input');input.type='checkbox';refs[key]=input;input.addEventListener('change',()=>{state[key]=input.checked;robot.changed();});row.append(input);more.append(row);}
    command(more,'repair','Починить',()=>robot.repair());body.append(more);
    for(const [side,grid]of Object.entries(grids))grid.addEventListener('pointerdown',e=>beginDrag(e,side));
  }
  function slots(side){return side==='bag'?bag:state.cargo;}
  function size(side){return side==='bag'?BAG_SLOTS:robot.capacity();}
  function refreshGrid(side){const grid=grids[side],a=slots(side),count=size(side);
    while(grid.children.length>count)grid.lastChild.remove();
    while(grid.children.length<count){const i=grid.children.length,b=v09Button('',()=>{if(performance.now()<suppressUntil||window.V010Inventory?.clickSuppressed())return;selected={side,i};refresh();});b.dataset.v010Container=side==='bag'?'bag':'drone';b.dataset.v010Index=String(i);b.dataset.droneSide=side;b.dataset.droneIndex=String(i);b.className='menuButton droneItemCell';grid.append(b);}
    for(let i=0;i<count;i++){const b=grid.children[i],s=a[i],sig=s?JSON.stringify(s):'';if(b.dataset.signature!==sig){b.dataset.signature=sig;I18n.assign(b,"innerHTML",s?itemIconHTML(s.type)+'<small>'+s.qty+'</small>':'');I18n.setAttr(b,'aria-label',s?ITEM[s.type]?.name+' × '+s.qty:'Пустая ячейка');}b.classList.toggle('selected',selected?.side===side&&selected.i===i);}
  }
  function moveCell(from,i,to,j){
    const source=slots(from),dest=slots(to),s=source[i];if(!s||s.locked||ITEM[s.type]?.robot||!robot.near()||i===j&&source===dest)return false;
    if(j<0||j>=size(to))return false;const target=dest[j];if(target?.locked)return false;
    // The existing stack insertion validates metadata and preserves individual
    // fish weights. A one-slot view makes the drop land exactly where chosen.
    const one=[target||null],moved=robot.transfer(source,i,one,1);
    if(!moved)return false;dest[j]=one[0];robot.changed();renderBag();refresh();return true;
  }
  function transferSelected(){if(!selected)return;const {side,i}=selected;const n=side==='bag'?robot.store(i):robot.take(i);if(n)selected=null;refresh();}
  function beginDrag(e,side){if(window.V0161UI){const b=e.target.closest?.('[data-drone-index]');if(b)V010Inventory.startPointer(e,side==='bag'?'bag':'drone',Number(b.dataset.droneIndex),b);return;}
    if(e.button!==undefined&&e.button!==0)return;const b=e.target.closest?.('[data-drone-index]');if(!b)return;const i=Number(b.dataset.droneIndex),s=slots(side)[i];if(!s||s.locked||ITEM[s.type]?.robot)return;
    drag={id:e.pointerId,side,i,node:b,x:e.clientX,y:e.clientY,t:performance.now(),touch:e.pointerType==='touch',active:false};
    // Ordinary touch swipes remain native scrolling. A deliberate hold enables
    // dragging; the cell is never captured during a normal scroll gesture.
    if(drag.touch)drag.timer=setTimeout(()=>{if(!drag||drag.id!==e.pointerId)return;drag.active=true;drag.node.style.touchAction='none';try{drag.node.setPointerCapture(e.pointerId);}catch(_){}drag.node.classList.add('dragging');},380);
  }
  document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const d=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);if(drag.touch&&!drag.active&&d>7){clearTimeout(drag.timer);drag=null;suppressUntil=performance.now()+400;return;}if(!drag.touch&&d>7)drag.active=true;if(drag.active){e.preventDefault();drag.node.classList.add('dragging');}}, {passive:false});
  function endDrag(e,cancel=false){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearTimeout(d.timer);d.node.style.touchAction='';d.node.classList.remove('dragging');try{d.node.releasePointerCapture(e.pointerId);}catch(_){}
    if(!d.active)return;suppressUntil=performance.now()+450;if(cancel)return;const b=document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('[data-drone-index]');if(b&&!moveCell(d.side,d.i,b.dataset.droneSide,Number(b.dataset.droneIndex)))message('Выберите пустую ячейку или подходящую стопку');}
  document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));
  function refresh(force=false){if(!overlay||!force&&!overlay.classList.contains('open'))return;const active=!state.packed&&state.hp>0&&state.battery>0;
    set(refs.status,robot.statusText());set(refs.battery,Math.round(state.battery)+'%');set(refs.hp,Math.round(state.hp)+' / '+robot.maxHp());set(refs.damage,robot.combat.damage);set(refs.load,state.cargo.filter(Boolean).length+' / '+robot.capacity());set(refs.ammo,state.ammo+' / '+robot.combat.capacity);
    for(const key of ['autoCollect','economy'])refs[key].checked=state[key];
    for(const key of ['light','combat']){const on=key==='light'?state.light:robot.combatEnabled();refs[key].setAttribute('aria-checked',String(on));set(refs[key+'Value'],on?'ВКЛ':'ВЫКЛ');}
    for(const id of ['follow','guard','dock'])buttons[id].disabled=!active;
    for(const id of ['defense','attack'])buttons[id].disabled=!active||!robot.combatEnabled();
    buttons.follow.classList.toggle('selected',state.task==='follow');buttons.guard.classList.toggle('selected',state.task==='guard');buttons.dock.classList.toggle('selected',['return','docked'].includes(state.task));buttons.defense.classList.toggle('selected',state.mode==='defense');buttons.attack.classList.toggle('selected',state.mode==='attack');
    buttons.reload.disabled=!robot.near()||state.ammo>=robot.combat.capacity||robot.availableAmmo()<1;buttons.pack.disabled=state.packed;buttons.launch.disabled=!state.packed||!bag.some(robot.ownsToken);
    set(refs.cargoTitle,'Инвентарь дрона · '+state.cargo.filter(Boolean).length+' / '+robot.capacity());set(refs.bagTitle,'Мой рюкзак · '+bag.filter(Boolean).length+' / '+BAG_SLOTS);
    refreshGrid('drone');refreshGrid('bag');const s=selected&&slots(selected.side)[selected.i];set(refs.selection,s?ITEM[s.type].name+' × '+s.qty:'Выберите предмет');set(buttons.transfer,selected?.side==='bag'?'В дрона':'В рюкзак');buttons.transfer.disabled=!s||s.locked||ITEM[s.type]?.robot||!robot.near();
    set(refs.range,robot.near()?'Нажмите предмет или удерживайте для переноса.':'Для переноса предметов дрон должен быть рядом. Команды доступны удалённо.');
    buttons.repair.disabled=!robot.canRepair();
    set(buttons.repair,'Починить · '+Object.entries(robot.repairCost()).map(([type,n])=>ITEM[type].name+' × '+n).join(', '));
  }
  function open(){if(!overlay)build();openOverlay(overlay);refresh(true);}
  v09Style(`
    #v014DronePanel .panel{width:min(620px,94vw);max-height:84dvh;min-height:0!important;padding:12px;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable}
    #v014DronePanel .v09Body{font-size:12px;color:#d5e4dd;line-height:1.35}
    #v014DronePanel .menuButton{font-size:11px!important;min-height:32px!important;padding:6px 8px!important;margin:0!important}
    .droneCardHead{display:grid;grid-template-columns:1fr 1.1fr 1.25fr;gap:8px;align-items:stretch}
    .dronePortrait,.droneCardStats,.droneAmmo,.droneCardSection,.dronePlayerBag{border:1px solid #49605e;background:#17292b88;border-radius:9px;padding:9px;min-width:0}
    .dronePortrait{display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse,#42615744,#16282b)}.dronePortrait img{width:100%;height:120px;object-fit:contain}
    .droneStatus{display:block;color:#a7d7b4;font-size:12px;min-height:32px}.droneStatRow{display:flex;justify-content:space-between;gap:5px;margin:6px 0;font-size:11px}.droneStatRow span{color:#a8bfb9}.droneStatRow b{font-weight:400;white-space:nowrap;font-variant-numeric:tabular-nums}
    .droneAmmoIcon{display:flex;align-items:center;gap:8px;height:42px}.droneAmmoIcon .itemIcon{width:38px;height:38px}.droneAmmoIcon small{font-size:10px;color:#aac0b6}.droneAmmo>.menuButton{width:100%}
    .droneToggle{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;margin:7px 0}.droneToggle input{width:17px;height:17px;accent-color:#7dae91}
    #v014DronePanel .droneSwitch{display:flex;align-items:center;justify-content:flex-start;gap:7px;min-height:44px;width:max-content;max-width:100%;padding:2px 0;margin:0;background:none;border:0;color:#c9dcd3;font:11px Arial;text-align:left;cursor:pointer;touch-action:manipulation}
    .droneSwitchRail{box-sizing:border-box;display:block;flex:0 0 52px;height:25px;position:relative;border:1px solid #738c7d88;border-radius:14px;background:#283e40;transition:background .16s ease}
    .droneSwitchRail::after{content:'';position:absolute;left:3px;top:3px;width:17px;height:17px;border-radius:50%;background:#a6b6b0;transition:transform .16s ease,background .16s ease}
    .droneSwitchValue{position:absolute;right:4px;top:6px;font-size:8px;line-height:11px;color:#bbc8c1}
    .droneSwitch[aria-checked=true] .droneSwitchRail{background:#35674e;border-color:#7baf8a}.droneSwitch[aria-checked=true] .droneSwitchRail::after{transform:translateX(27px);background:#d1edc9}.droneSwitch[aria-checked=true] .droneSwitchValue{left:5px;right:auto;color:#e2f1df}
    .droneSwitch:focus-visible{outline:2px solid #ceb87d;outline-offset:2px;border-radius:6px}#v014DronePanel .droneCombatGrid button:disabled{opacity:.38;background:#263639;border-color:#405552;cursor:default}
    .droneCardSection,.dronePlayerBag{margin-top:9px}.droneSectionTitle,.dronePlayerBag summary{font-size:12px;color:#c5dacf;margin-bottom:7px}.droneCommandGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.droneCombatGrid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}
    #v014DronePanel .selected{border-color:#b8ce9c;background:#365b4c}
    #v014DronePanel .droneItemGrid{box-sizing:border-box;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:max-content;align-content:start;align-items:start;gap:5px;width:100%;min-width:0;padding:2px;touch-action:pan-y;overflow-y:auto;overflow-x:hidden;max-height:196px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-gutter:stable}
    #v014DronePanel .droneItemGrid>.droneItemCell{box-sizing:border-box;display:block;position:relative;width:100%;min-width:0;max-width:100%;height:auto!important;aspect-ratio:1/1;min-height:0!important;padding:0!important;margin:0!important;overflow:hidden;background:#15272c!important;border:1px solid #42595a;border-radius:7px;touch-action:pan-y;user-select:none;font-size:20px!important;line-height:1}
    #v014DronePanel .droneItemCell .itemIcon{position:absolute;left:7%;top:5%;width:86%;height:83%;min-width:0;min-height:0;max-width:86%;max-height:83%;object-fit:contain;pointer-events:none}.droneItemCell small{position:absolute;right:4px;bottom:2px;font:10px Arial;color:#e3e8d9;text-shadow:0 1px 3px #000;pointer-events:none}.droneItemCell.selected{outline:1px solid #d4bd82;outline-offset:-2px}.droneItemCell.dragging{opacity:.45}
    .droneInventoryActions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;min-height:33px}.droneTransferHint{font-size:10px!important;color:#a6b9b3!important;margin:7px 0!important;min-height:27px}.droneRescue{display:flex;gap:7px}.droneMore{margin-top:12px;font-size:11px}.droneMore summary{cursor:pointer;padding:7px 0;color:#adbfba}.droneUpgradeRow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;font-size:10px}.droneRename{display:flex;gap:6px}.droneRename input{width:55%;font-size:12px}
    @media(max-width:480px){.droneCardHead{grid-template-columns:minmax(0,1fr) minmax(0,1.25fr)}.droneAmmo{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:8px}.droneAmmo .droneStatRow{grid-column:2;grid-row:1}.droneAmmoIcon{grid-row:1/3;height:62px}.droneAmmoIcon .itemIcon{width:48px;height:48px}.droneAmmo>.menuButton{grid-column:2}.dronePortrait img{height:125px}#v014DronePanel .droneItemGrid{max-height:175px}.droneStatus{min-height:28px}}
    @media(max-width:380px){#v014DronePanel .droneItemGrid{grid-template-columns:repeat(5,minmax(0,1fr))}#v014DronePanel .droneSwitch{font-size:10px;gap:4px}.droneSwitchRail{flex-basis:48px}.droneSwitch[aria-checked=true] .droneSwitchRail::after{transform:translateX(23px)}}
  `);
  return {open,refresh,moveCell,transferSelected};
})();

