/* 0.16.1: synchronous modal visibility, shared slot dragging, save migration. */
window.V0161UI=(()=>{
  const inv=V010Inventory,robot=V014Robots,quick=V013Inventory;
  const controls=['v010Minimap','moveControl','aimControl','actionButton','bagButton','settingsButton','hotbar','v010SneakButton','v010ReloadButton','v014DroneHUD','v091JumpInward','v014RouteStop','v010PracticeStop','v010PinnedRecipe','v010PinnedGoal','searchBarWrap','v016Placement','v163Vitals','heldItemName'];
  let serial=15000,dismissGesture=null,pointerGesture=null;
  function sync(){const open=!!document.querySelector('.overlay.open');menuOpen=open||playerDead||!!window.MainMenu?.active;if(document.body.classList.contains('v0161Modal')!==menuOpen)document.body.classList.toggle('v0161Modal',menuOpen);}
  function opened(o){
    if(pointerGesture)pointerGesture.opened=true;
    o.style.zIndex=String(++serial);const panel=o.querySelector('.panel');
    if(panel&&!o.querySelector('.v09Close,.v012InventoryClose,.v0161Close,#v010MapClose,#closeLoot')){
      const b=v09Button('×',()=>closeOverlay(o),'v0161Close');I18n.assign(b,"title",'Закрыть');I18n.setAttr(b,'aria-label','Закрыть');panel.prepend(b);
    }
    if(o.id==='v014DronePanel'||o.id==='storageOverlay')refreshQuick();sync();
  }
  function closed(o){if(o.id==='v010MapOverlay')V010Camera.closeMap();sync();}
  const topOverlay=()=>[...document.querySelectorAll('.overlay.open')].sort((a,b)=>Number(b.style.zIndex||getComputedStyle(b).zIndex||0)-Number(a.style.zIndex||getComputedStyle(a).zIndex||0))[0];
  const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
  const inside=(o,node)=>node?.closest?.('.overlay')===o&&!!node?.closest?.('.panel');
  // Consume the whole dismissal gesture, including the compatibility click after
  // pointerup. A fresh pointerdown unlocks the next tap without a time delay.
  window.addEventListener('pointerdown',e=>{
    if(dismissGesture&&!dismissGesture.released){dismissGesture.ids.add(e.pointerId);consume(e);return;}
    dismissGesture=null;
    pointerGesture={id:e.pointerId,opened:false};
    const o=topOverlay();if(!o||inside(o,e.target))return;
    dismissGesture={ids:new Set([e.pointerId]),released:false};consume(e);closeOverlay(o);
  },true);
  for(const type of ['pointermove','pointerup','pointercancel'])window.addEventListener(type,e=>{
    if(type==='pointercancel'&&pointerGesture?.id===e.pointerId)pointerGesture=null;
    if(!dismissGesture?.ids.has(e.pointerId))return;consume(e);
    if(type!=='pointermove'){dismissGesture.ids.delete(e.pointerId);dismissGesture.released=!dismissGesture.ids.size;}
  },true);
  window.addEventListener('click',e=>{
    // A panel opened during this pointer gesture owns its compatibility click.
    // It must not be treated as a second, outside-panel dismissal or reach UI
    // underneath. A fresh pointerdown always starts a new gesture (no timeout).
    const openedByPointer=pointerGesture?.opened&&e.detail!==0&&(e.pointerId===undefined||e.pointerId===pointerGesture.id);
    pointerGesture=null;
    if(openedByPointer){consume(e);return;}
    if(dismissGesture){consume(e);if(dismissGesture.released)dismissGesture=null;return;}
    const o=topOverlay();if(o&&!inside(o,e.target)){consume(e);closeOverlay(o);}
  },true);
  window.addEventListener('contextmenu',e=>{if(dismissGesture)consume(e);},true);
  window.addEventListener('blur',()=>{pointerGesture=null;dismissGesture=null;});
  // Covers legacy direct class changes (death, load, layout editor). :has below
  // hides controls in the same style update, before the observer callback.
  if(typeof MutationObserver==='function')new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  function allowMove(from,i,to,j){
    const a=inv.list(from),s=a?.[i];if(!s)return false;
    if(s.locked&&from!==to)return false;
    if((from==='drone'||to==='drone')&&(!robot.near()||ITEM[s.type]?.robot))return false;
    if(from==='upgrade'||to==='upgrade'){if(!window.V0161Upgrade?.near())return false;if(to==='upgrade'&&!V0161Upgrade.accepts(s))return false;}
    if(to==='quick'){
      if(!HAND_TYPES.includes(s.type)||s.qty!==1)return false;
      if(quick.items.some((x,k)=>x?.type===s.type&&k!==j&&!(from==='quick'&&i===k)))return false;
    }
    return true;
  }
  function refreshQuick(){
    for(const id of ['storageOverlay','v014DronePanel']){
      const o=el(id),p=o?.querySelector('.v09Body')||o?.querySelector('.panel');if(!p)continue;
      let wrap=o.querySelector('.v0161QuickWrap');if(!wrap){wrap=document.createElement('section');wrap.className='v0161QuickWrap';const title=document.createElement('div');I18n.assign(title,"textContent",'Быстрые слоты · удерживайте для переноса');title.className='v0161QuickTitle';const grid=document.createElement('div');grid.className='v0161QuickGrid';wrap.append(title,grid);p.append(wrap);}
      const grid=wrap.querySelector('.v0161QuickGrid');for(let i=0;i<5;i++){
        const sig=JSON.stringify(quick.items[i]||null),old=grid.children[i];if(old?.dataset.signature===sig)continue;
        const cell=inv.cell('quick',i,quick.items[i]);cell.dataset.signature=sig;I18n.assign(cell,'title',(i+1)+' · '+(ITEM[quick.items[i]?.type]?.name||'Пусто'));const n=document.createElement('span');n.className='v010QuickMark';I18n.assign(n,"textContent",i+1);cell.append(n);if(old){old.before(cell);old.remove();}else grid.append(cell);
      }
    }
  }
  const oldQuick=renderQuickSlots;renderQuickSlots=function(){oldQuick();for(const id of ['hotbar','quickSlots'])for(const [i,b]of [...el(id).children].entries()){
    b.dataset.v010Container='quick';b.dataset.v010Index=String(i);b.addEventListener('pointerdown',e=>inv.startPointer(e,'quick',i,b));
    b.addEventListener('click',e=>{if(inv.clickSuppressed()){e.preventDefault();e.stopImmediatePropagation();}},true);
  }refreshQuick();};
  const oldItemDetails=V011UI.details;V011UI.details=function(where,i){oldItemDetails(where,i);if(!['quick','drone','upgrade'].includes(where))return;const s=inv.list(where)?.[i],body=el('v010ItemDetails')?.querySelector('.v09Body');if(!s||!body)return;
    const b=v09Button('В рюкзак',()=>{if(inv.transfer(where,i,'bag'))closeOverlay(el('v010ItemDetails'));else message('Нужна свободная ячейка в рюкзаке');});b.disabled=!!s.locked;body.append(b);
  };
  const sneak=el('v010SneakButton');I18n.assign(sneak,'title','Тихий шаг · C');I18n.setAttr(sneak,'aria-label','Тихий шаг');
  I18n.assign(sneak,"innerHTML",'<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="boot161" x2="0" y2="1"><stop stop-color="#dee4d6"/><stop offset="1" stop-color="#8ea699"/></linearGradient></defs><path d="M13 5h13l-1 15 8 6c3 2 4 5 2 7H8c-3-5-1-9 1-12l3-4Z" fill="url(#boot161)" stroke="#dce9df" stroke-width="1.1"/><path d="M10 28h24M15 12l8 1m-8 4 7 1m-7 4 9 1M9 34h24" fill="none" stroke="#425d54" stroke-width="2"/><path d="M3 17v5m34-7v6" stroke="#b8cbbd" stroke-width="1.5"/></svg>');
  v09Style(`
    #v010Minimap{width:120px!important;height:120px!important;top:calc(var(--v011-game-top) + 100px)!important;transform:none!important;z-index:35!important}
    @media(max-width:500px){#v010Minimap{width:106px!important;height:106px!important}}
    @media(max-height:550px){#v010Minimap{width:98px!important;height:98px!important}}
    body.v0161Modal :is(${controls.map(id=>'#'+id).join(',')}),body:has(.overlay.open) :is(${controls.map(id=>'#'+id).join(',')}){display:none!important;pointer-events:none!important}
    :is(#actionButton,#bagButton,#settingsButton,#v010SneakButton,#v010ReloadButton,#v091JumpInward,#v014DroneHUD,#v014RouteStop,#v010PracticeStop){opacity:.8!important;background-color:rgba(22,40,40,.2)!important;box-shadow:none!important}
    #v010SneakButton svg{fill:none;stroke:none;width:28px;height:28px}
    #moveControl,#aimControl{opacity:.8!important}
    .v0161Close{position:sticky;top:0;float:right;width:32px!important;min-width:32px!important;height:32px;min-height:32px!important;padding:0!important;margin:0 0 4px 7px!important;z-index:8;background:#233d3a!important;font-size:23px!important;border-radius:8px}
    .v0161QuickWrap{border-top:1px solid #7e9c8d44;padding-top:8px;margin-top:9px}.v0161QuickTitle{color:#9fb8ad;font-size:10px;margin-bottom:6px}
    .v0161QuickGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.v0161QuickGrid .v010Slot{min-width:0!important}
    #quickSlots>button,#hotbar>button{touch-action:pan-y!important;user-select:none;-webkit-touch-callout:none}
  `);
  sync();renderQuickSlots();return{sync,opened,closed,allowMove,refreshQuick,controls,topOverlay};
})();

// Save migration is ordered before all historical validators. Never reset a
// save because a retired attachment or a slower smelting job is present.
window.V0161Migration=(()=>{
  const removed=new Set(['scope_module','grip_module','suppressor_module']);
  const recipes={scope_module:{iron:4,copper:3,parts:2},grip_module:{iron:4,wood:4,parts:2},suppressor_module:{iron:8,copper:4,parts:3}};
  function migrate(d){
    const legacy=d.gameVersion!=='0.16.1';if(!legacy)return d;
    const craft=d.v010?.modules?.craft;
    function refund(j){if(!j||!craft?.refunds?.craft_bench)return;const n=Math.max(0,(j.batches||0)-(j.completedBatches||0));for(const [t,q]of Object.entries(recipes[j.recipe]||{}))craft.refunds.craft_bench[t]=(craft.refunds.craft_bench[t]||0)+q*n;}
    const jobs=d.v09?.crafting?.jobs;if(jobs)for(const id of Object.keys(jobs)){const j=jobs[id];if(removed.has(j?.recipe)){refund(j);jobs[id]=null;}}
    if(craft){for(const key of Object.keys(craft.queues||{}))craft.queues[key]=craft.queues[key].filter(j=>{if(removed.has(j.recipe)){refund(j);return false;}return true;});if(removed.has(craft.pin?.recipe))craft.pin=null;}
    function visit(v,key=''){
      if(!v||typeof v!=='object')return v;
      if(removed.has(v.type))return undefined;
      if(v.modules&&v.type&&V09Craft.weapons[v.type])for(const t of ['scope','grip','suppressor'])delete v.modules[t];
      if(['iron','copper'].includes(v.recipe)&&Number.isInteger(v.batches)&&v.totalMs===4000*v.batches&&Number.isFinite(v.remainingMs)){v.totalMs/=2;v.remainingMs/=2;}
      if(Array.isArray(v)){const out=v.map(x=>visit(x,key));return ['bag','storage','items','cargo'].includes(key)?out.map(x=>x===undefined?null:x):out.filter(x=>x!==undefined);}
      for(const k of Object.keys(v)){if(removed.has(k)){delete v[k];continue;}const x=visit(v[k],k);if(x===undefined)delete v[k];else v[k]=x;}return v;
    }
    d=visit(d);delete d.controls014;
    const prog=d.v010?.modules?.progression;if(prog){for(const k of ['unlocks','announced'])if(Array.isArray(prog[k]))prog[k]=prog[k].filter(x=>x!=='sight_advanced');if(prog.pin==='sight_advanced')prog.pin=null;}
    return d;
  }
  GameSave.extend('decode','ui.modal-dragging',function(decode,raw){return decode(JSON.stringify(migrate(JSON.parse(raw))));});
  return{migrate,removed};
})();

