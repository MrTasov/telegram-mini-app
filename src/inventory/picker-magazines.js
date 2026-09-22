/* 0.16.2: only quick-slot picking and detachable AK/M4 magazines. */
window.V0162Quick=(()=>{
  const inv=V010Inventory,quick=V013Inventory;
  let target=0;
  function flash(cell){cell.classList.remove('v013Missing');void cell.offsetWidth;cell.classList.add('v013Missing');}
  function allowed(item,i=target){
    if(!item||!HAND_TYPES.includes(item.type)||item.qty!==1)return false;
    return true;
  }
  function assign(i,index,expected){
    const item=bag[index];if(!Number.isInteger(i)||i<0||i>4||!item||(expected&&item!==expected)||!allowed(item,i))return false;
    // A second copy of a weapon replaces the actual selected copy, not a type alias.
    // Keep the existing one-slot-per-type invariant without losing either item.
    const previous=quick.items[i],other=quick.items.findIndex((s,k)=>k!==i&&s?.type===item.type);
    if(other>=0){bag[index]=quick.items[other];quick.items[other]=previous||null;}
    else bag[index]=previous||null;
    quick.items[i]=item;V010Combat.cancelReload();firing=false;
    activeHandSlot=i;quick.sync();selectHandSlot(i);inv.render();
    closeOverlay(el('v0162QuickPicker'));return true;
  }
  function open(i){
    if(!Number.isInteger(i)||i<0||i>4)return false;target=i;
    const o=v09Overlay('v0162QuickPicker','Слот '+(i+1)+' · Рюкзак'),body=o.querySelector('.v09Body');body.replaceChildren();
    const grid=document.createElement('div');grid.className='v162PickGrid';body.append(grid);
    bag.forEach((item,index)=>{
      if(!item)return;const ok=allowed(item,i),b=v09Button('',()=>{
        if(bag[index]!==item){open(i);return;}
        if(!allowed(item,i)){flash(b);return;}
        if(!assign(i,index,item))flash(b);
      });
      b.className='v162PickCell'+(ok?'':' v162Unavailable');b.dataset.bagIndex=index;
      b.setAttribute('aria-disabled',String(!ok));I18n.setAttr(b,'aria-label',ITEM[item.type].name+(ok?'':' · недоступно для быстрого слота'));
      I18n.assign(b,"innerHTML",'<span class="v162PickArt">'+itemIconHTML(item.type)+'</span>');
      const name=document.createElement('span');name.className='v162PickName';I18n.assign(name,"textContent",ITEM[item.type].name);
      const qty=document.createElement('small');I18n.assign(qty,"textContent",'×'+item.qty+(item.level?' · +'+item.level:''));b.append(name,qty);grid.append(b);
    });
    if(!grid.children.length){const empty=document.createElement('p');I18n.assign(empty,"textContent",'Рюкзак пуст');body.append(empty);}
    openOverlay(o);return true;
  }
  const select=selectHandSlot;selectHandSlot=function(i){if(Number.isInteger(i)&&i>=0&&i<5&&!quick.items[i])return open(i);return select(i);};
  const render=renderQuickSlots;renderQuickSlots=function(){render();for(const id of ['hotbar','quickSlots'])for(const [i,b]of [...el(id).children].entries())b.oncontextmenu=e=>{e.preventDefault();open(i);};};
  const details=V011UI.details;V011UI.details=function(where,i){details(where,i);if(where==='quick'&&quick.items[i])el('v010ItemDetails').querySelector('.v09Body').append(v09Button('Выбрать предмет',()=>{closeOverlay(el('v010ItemDetails'));open(i);}));};
  v09Style(`
    #hotbar{transform:translateX(-50%) scale(.7);transform-origin:center bottom}
    #v0162QuickPicker .v09Panel,#v0162MagazinePicker .v09Panel{width:min(350px,92vw);max-height:65dvh;padding:12px}
    #v0162QuickPicker .v09Body,#v0162MagazinePicker .v09Body{overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
    .v162PickGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;align-content:start}
    .v162PickGrid .v162PickCell{width:100%;min-width:0;min-height:75px;margin:0;padding:5px 3px;border:1px solid #8fa99b33;border-radius:8px;background:#1b302f;color:#dce7e0;text-align:center;touch-action:pan-y}
    .v162PickArt{display:block;height:39px}.v162PickArt .itemIcon{width:39px;height:39px;object-fit:contain}
    .v162PickName{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;line-height:13px}
    .v162PickCell small{display:block;font-size:9px;color:#a1b6ac}
    .v162Unavailable .v162PickArt,.v162Unavailable .v162PickName,.v162Unavailable small{filter:grayscale(1);opacity:.4}
    .v162Unavailable{cursor:default}
  `);
  renderQuickSlots();return{open,assign,allowed,flash};
})();

window.V0162Magazines=(()=>{
  const inv=V010Inventory,combat=V010Combat,copy=x=>JSON.parse(JSON.stringify(x));
  const TYPES=V09Craft.magazineTypes;
  ITEM.magazine_standard={name:'Обычный магазин',icon:'▥',description:'Съёмный магазин АК / M4 · 30 патронов. В рюкзаке хранится пустым.'};
  ITEM.magazine_module.description='Съёмный магазин АК / M4 · 60 патронов. После установки зарядите подходящими патронами.';
  const oldIcon=itemIconHTML;itemIconHTML=function(type){return type==='magazine_standard'?oldIcon('magazine_module').replace('alt="Увеличенный магазин"','alt="Обычный магазин"'):oldIcon(type);};
  const rifle=s=>!!V09Craft.weapons[s?.type]?.magazineTypes;
  function owner(s){
    if(bag.includes(s)||V013Inventory.items.includes(s))return true;
    if(V0161Upgrade.slots.includes(s))return V0161Upgrade.near();
    if(V014Robots.state.cargo.includes(s))return V014Robots.near();
    return activeStorage!==null&&!!el('storageOverlay')?.classList.contains('open')&&!!storageChests[activeStorage]?.items.includes(s);
  }
  function change(s,index=null,expected=null){
    if(!rifle(s)||!owner(s))return false;combat.ensure(s);
    const incoming=index===null?null:bag[index];
    if(index!==null&&(!Number.isInteger(index)||!incoming||!V09Craft.acceptsMagazine(s.type,incoming.type)||!Number.isInteger(incoming.qty)||incoming.qty<1||(expected&&incoming!==expected)))return false;
    if(!s.magazineType&&!incoming)return false;
    if(combat.validateItem(s)===false)return false;
    const next=copy(bag),weaponIndex=bag.indexOf(s),newType=incoming?.type||null;
    if(incoming){next[index].qty--;if(!next[index].qty)next[index]=null;}
    // Run the existing fill-partial-stacks-first insertion on a private draft.
    // Neither the real inventory nor the weapon changes on any failed insertion.
    if(s.rounds&&addToSlots(next,V09Craft.weapons[s.type].ammo,s.rounds,BAG_SLOTS)>0||
       s.magazineType&&addToSlots(next,s.magazineType,1,BAG_SLOTS)>0){
      message('Нет места в рюкзаке');return false;
    }
    combat.cancelReload();firing=false;
    if(weaponIndex>=0)next[weaponIndex]=s;
    bag.splice(0,bag.length,...next);GameAudio.play(newType?'magazineLoad':'magazineUnload');s.magazineType=newType;s.rounds=0;delete s.modules.magazine;
    inv.render();updateAmmoHud();queueGameSave();return true;
  }
  const remove=s=>change(s);
  const install=(s,index,expected)=>change(s,index,expected);
  function installFirst(s,type){const i=bag.findIndex(x=>x?.type===type);return i>=0&&install(s,i);}
  function choose(s,after){
    if(!rifle(s)||!owner(s))return false;
    const o=v09Overlay('v0162MagazinePicker','Магазин · Рюкзак'),body=o.querySelector('.v09Body');body.replaceChildren();
    const grid=document.createElement('div');grid.className='v162PickGrid';body.append(grid);
    bag.forEach((m,i)=>{if(!m||!V09Craft.acceptsMagazine(s.type,m.type))return;
      const b=v09Button('',()=>{if(install(s,i,m)){closeOverlay(o);after?.();}else if(bag[i]!==m)choose(s,after);});
      b.className='v162PickCell';b.setAttribute('aria-disabled','false');b.dataset.magazineIndex=i;
      I18n.assign(b,"innerHTML",'<span class="v162PickArt">'+itemIconHTML(m.type)+'</span><span class="v162PickName">'+TYPES[m.type]+' патронов</span><small>Пустой · ×'+m.qty+'</small>');grid.append(b);
    });
    if(!grid.children.length){const note=document.createElement('p');I18n.assign(note,"textContent",'В рюкзаке нет свободного магазина');body.append(note);}
    openOverlay(o);return true;
  }
  function render(parent,s,after){
    if(!rifle(s))return;const view=combat.itemView(s);
    const section=document.createElement('section');section.className='v162Magazine';parent.append(section);
    const label=document.createElement('div');label.className='v162MagazineLabel';I18n.assign(label,"textContent",'Магазин');section.append(label);
    const row=document.createElement('div');row.className='v162MagazineRow';section.append(row);
    const slot=v09Button('',()=>choose(s,after),'v162MagazineSlot');slot.dataset.magazineAction='choose';I18n.setAttr(slot,'aria-label','Магазин · выбрать или заменить');
    I18n.assign(slot,"innerHTML",view.magazineType?itemIconHTML(view.magazineType):'＋');row.append(slot);
    const info=document.createElement('div');info.className='v162MagazineInfo';
    const name=document.createElement('span');I18n.assign(name,"textContent",view.magazineType?ITEM[view.magazineType].name:'Не установлен');
    const count=document.createElement('b');I18n.assign(count,"textContent",view.rounds+'/'+combat.gunSpec(s).mag);
    info.append(name,count);row.append(info);
    const actions=document.createElement('div');actions.className='v162MagazineActions';section.append(actions);
    const put=v09Button(view.magazineType?'Заменить':'Установить',()=>choose(s,after));put.dataset.magazineAction='install';put.disabled=!owner(s);slot.disabled=put.disabled;
    const take=v09Button('Снять',()=>{if(remove(s))after?.();});take.dataset.magazineAction='remove';take.disabled=!view.magazineType||!owner(s);actions.append(put,take);
  }
  const details=V011UI.details;V011UI.details=function(where,i){details(where,i);const s=inv.list(where)?.[i];if(!rifle(s))return;
    const body=el('v010ItemDetails').querySelector('.v09Body');render(body,s,()=>{if(inv.list(where)?.[i]===s)V011UI.details(where,i);else closeOverlay(el('v010ItemDetails'));});
  };
  // Historical saves have an implicit standard magazine or a Boolean extended
  // attachment. Add the physical component exactly once; retain all loaded rounds.
  function migrate(d){
    function visit(v){if(!v||typeof v!=='object')return;
      if(rifle(v)){
        if(!Object.hasOwn(v,'magazineType'))v.magazineType=v.modules?.magazine?V09Craft.weapons[v.type].extendedMagazine:V09Craft.weapons[v.type].defaultMagazine;
        if(v.modules)delete v.modules.magazine;
      }
      for(const x of Object.values(v))if(x&&typeof x==='object')visit(x);
    }visit(d);return d;
  }
  GameSave.extend('decode','inventory.picker-magazines',function(decode,raw){return decode(JSON.stringify(migrate(JSON.parse(raw))));});
  GameSave.extend('restore','inventory.picker-magazines',function(restore,d){return restore(migrate(copy(d)));});
  v09Style(`
    .v162Magazine{width:100%;box-sizing:border-box;border:1px solid #91ac9b38;border-radius:9px;padding:9px;margin-top:10px;background:#172d2b66}
    .v162MagazineLabel{font-size:11px;color:#a9bfb4;margin-bottom:6px}.v162MagazineRow{display:flex;gap:10px;align-items:center}
    .v162Magazine .v162MagazineSlot{width:52px!important;min-width:52px;height:52px;min-height:52px!important;padding:3px!important;margin:0!important;background:#233a35;border:1px solid #9ab29b66;border-radius:8px;font-size:26px}
    .v162MagazineSlot .itemIcon{width:44px;height:44px;object-fit:contain}.v162MagazineInfo{font-size:11px;line-height:1.5;color:#afc1b7}
    .v162MagazineInfo b{display:block;font-size:15px;color:#e3e9d9;font-weight:500;font-variant-numeric:tabular-nums}
    .v162MagazineActions{display:flex;gap:5px;margin-top:7px}.v162MagazineActions button{flex:1;width:auto!important;font-size:11px!important;min-height:30px!important;margin:0!important;padding:5px 8px!important}
  `);
  renderBag();return{TYPES,install,installFirst,remove,choose,render,migrate};
})();

