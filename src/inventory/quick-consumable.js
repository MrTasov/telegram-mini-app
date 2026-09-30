/* 0.43 corrective: Quick Slot 6 — instant consumables (food, drinks, healing, buffs).
   State is the same Quick Slot owner (V013Inventory.quick013.consumable binds a type; the
   stock stays in the backpack). Pressing 6 / the sixth button applies one item at once:
   no inventory, no confirmation, no channel/progress bar, movement is never stopped.
   Loaded after every renderQuickSlots wrapper, so slots 1-5 keep their exact behaviour. */
window.GameQuickConsumable=(()=>{
  const SLOT=5,quick=V013Inventory,B=GameplayBalance.survival,t=(k,p)=>I18n.t('quick.consumable.'+k,p);
  const stacks=type=>bag.map((s,i)=>s?.type===type?i:-1).filter(i=>i>=0);
  const count=type=>stacks(type).reduce((n,i)=>n+bag[i].qty,0);
  const name=type=>I18n.text(ITEM[type]?.name||type);
  function flash(){for(const id of ['hotbar','quickSlots']){const b=el(id)?.querySelector('[data-quick-consumable]');if(b){b.classList.remove('v013Missing');void b.offsetWidth;b.classList.add('v013Missing');}}}
  function press(){
    const type=quick.consumable;
    if(!type){open();return false;}
    if(playerDead||GameFlow.paused)return false;
    const list=stacks(type);if(!list.length){message(t('none',{name:name(type)}));flash();return false;}
    if(!GameSurvival.useful(type)){message(I18n.t('survival.full'));flash();return false;}
    if(!GameSurvival.apply(type))return false;
    // Smallest stack first keeps full stacks intact; exactly one unit per press.
    const index=list.sort((a,b)=>bag[a].qty-bag[b].qty)[0],s=bag[index];s.qty--;if(!s.qty)bag[index]=null;
    GameAudio.play('quickslot');
    if(el('inventoryOverlay')?.classList.contains('open'))renderBag();
    renderQuickSlots();queueGameSave();return true;
  }
  function open(){
    const o=v09Overlay('v043ConsumablePicker',t('title')),body=o.querySelector('.v09Body');body.replaceChildren();
    const hint=document.createElement('p');hint.className='subtitle';I18n.assign(hint,'textContent',t('hint'));body.append(hint);
    const grid=document.createElement('div');grid.className='v162PickGrid';body.append(grid);
    const types=[...new Set(bag.filter(s=>s&&quick.consumableAllowed(s.type)).map(s=>s.type))];
    for(const type of types){
      const b=v09Button('',()=>{quick.bindConsumable(type);closeOverlay(o);});b.className='v162PickCell';b.dataset.consumableType=type;
      I18n.assign(b,'innerHTML','<span class="v162PickArt">'+itemIconHTML(type)+'</span>');
      const label=document.createElement('span');label.className='v162PickName';I18n.assign(label,'textContent',ITEM[type].name);
      const qty=document.createElement('small');I18n.assign(qty,'textContent','×'+count(type));b.append(label,qty);grid.append(b);
    }
    if(!types.length){const empty=document.createElement('p');I18n.assign(empty,'textContent',t('empty'));body.append(empty);}
    if(quick.consumable){const clear=v09Button(t('clear'),()=>{quick.bindConsumable(null);closeOverlay(o);});clear.dataset.consumableClear='1';body.append(clear);}
    openOverlay(o);return true;
  }
  function button(holder){
    const type=quick.consumable,n=type?count(type):0,b=document.createElement('button');
    b.className='handSlot v043Consumable'+(type&&!n?' v043Empty':'');b.type='button';b.dataset.quickConsumable='1';
    I18n.setAttr(b,'aria-label',I18n.message('quick.consumable.title'));
    I18n.assign(b,'innerHTML',`<span class="slotNumber">${SLOT+1}</span><span class="slotArt">${type?itemIconHTML(type):'＋'}</span><span class="slotName">${type?ITEM[type].name:I18n.message('quick.consumable.slot')}</span>${type?`<span class="v043Count">×${n}</span>`:''}`);
    b.addEventListener('click',e=>{e.stopPropagation();if(holder==='quickSlots')open();else GameActions.dispatch('SELECT_SLOT',{index:SLOT});});
    b.oncontextmenu=e=>{e.preventDefault();open();};
    return b;
  }
  const render=renderQuickSlots;renderQuickSlots=function(...a){const out=render(...a);for(const id of ['hotbar','quickSlots']){const h=el(id);if(!h)continue;h.querySelector('[data-quick-consumable]')?.remove();h.append(button(id));}return out;};
  // Counts follow the backpack (loot, crafting, storage transfers) without a new event bus.
  let signature='';const old=update;update=function(...a){const r=old(...a);const type=quick.consumable,sig=type?type+':'+count(type):'';if(sig!==signature){signature=sig;renderQuickSlots();}return r;};
  v09Style(`#hotbar{grid-template-columns:repeat(6,minmax(0,52px))!important;width:min(332px,94vw)!important}#quickSlots{grid-template-columns:repeat(6,minmax(0,1fr))!important}
    .v043Consumable{position:relative;border-color:#c9a86a88!important}.v043Consumable .slotNumber{color:#f0d79a}.v043Count{position:absolute;right:3px;bottom:2px;font-size:10px;font-weight:700;color:#f4ecd0;text-shadow:0 1px 2px #000}
    .v043Empty .slotArt{filter:grayscale(1);opacity:.45}#v043ConsumablePicker .v09Panel{width:min(350px,92vw);max-height:65dvh;padding:12px}#v043ConsumablePicker .v09Body{overflow-y:auto}`);
  renderQuickSlots();
  return Object.freeze({press,open,count,get type(){return quick.consumable;},slot:SLOT});
})();
