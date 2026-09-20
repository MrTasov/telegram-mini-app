/* 0.9.2 — incremental manufacturing, stable production UI, powered machine animation. */
const V09Craft = (() => {
  const RECIPES = {
 hammer:{station:'craft_bench',category:'Инструменты',name:'Молот',input:{iron:8,wood:6,parts:2},output:'hammer',qty:1,ms:15000},
 concrete:{station:'furnace',category:'Строительство',name:'Бетон',input:{stone:GameplayBalance.processing.stone},output:'concrete',qty:1,ms:2000},
 fishing_rod:{station:'craft_bench',category:'Инструменты',name:'Удочка',input:{wood:10,parts:2},output:'fishing_rod',qty:1,ms:4000},
    feed: {station:'feed_craft',category:'Корм',name:'Корм для животных',input:{grain:10},output:'animal_feed',qty:20,ms:2500},
    iron: {station:'furnace',category:'Металлы',name:'Железо',input:{iron_ore:GameplayBalance.processing.ironOre},output:'iron',qty:1,ms:2000},
    copper: {station:'furnace',category:'Металлы',name:'Медь',input:{copper_ore:GameplayBalance.processing.copperOre},output:'copper',qty:1,ms:2000},
    gunpowder:{station:'furnace',category:'Материалы',name:'Порох',input:{coal:GameplayBalance.processing.coal},output:'gunpowder',qty:GameplayBalance.processing.gunpowder,ms:GameplayBalance.processing.gunpowderMs},
    ammo: {station:'craft_bench',category:'Патроны',name:'Патроны 5,45 × 39',input:{iron:2,copper:1,gunpowder:GameplayBalance.ammunition.ammo.gunpowder},output:'ammo',qty:30,ms:10000},
    ammo556: {station:'craft_bench',category:'Патроны',name:'Патроны 5.56 × 45',input:{iron:2,copper:1,gunpowder:GameplayBalance.ammunition.ammo556.gunpowder},output:'ammo556',qty:30,ms:10000},
    rifle_ak74: {station:'craft_bench',category:'Оружие',name:'АК-74',input:{iron:20,copper:10,parts:4,wood:4},output:'rifle_ak74',qty:1,ms:60000},
    rifle_m4: {station:'craft_bench',category:'Оружие',name:'M4',input:{iron:18,copper:12,parts:4,wood:4},output:'rifle_m4',qty:1,ms:60000}
  };
  const GUNS = {
    rifle_ak74:{name:'АК-74',ammo:'ammo',caliber:'5,45 × 39',damage:35,delay:155,spread:.045,recoil:.019,range:660,mag:30,category:'assault',reloadMs:2000,noise:550,heldStyle:'ak',visualRecoil:-2.4,recoilLabel:'выше',magazineTypes:['magazine_standard','magazine_module'],defaultMagazine:'magazine_standard',extendedMagazine:'magazine_module'},
    rifle_m4:{name:'M4',ammo:'ammo556',caliber:'5.56 × 45',damage:28,delay:115,spread:.021,recoil:.011,range:720,mag:30,category:'assault',reloadMs:1800,noise:550,heldStyle:'m4',visualRecoil:-1.3,recoilLabel:'ниже',magazineTypes:['magazine_standard','magazine_module'],defaultMagazine:'magazine_standard',extendedMagazine:'magazine_module'}
  };
  // Physical empty components, shared by combat, validation and the picker.
  const magazineTypes={magazine_standard:30,magazine_module:60};
  const weaponsForAmmo=type=>Object.keys(GUNS).filter(id=>GUNS[id].ammo===type);
  const acceptsMagazine=(weaponType,componentType)=>!!GUNS[weaponType]?.magazineTypes?.includes(componentType)&&Object.hasOwn(magazineTypes,componentType);
  function magazineCapacity(item){
    const g=GUNS[item?.type];if(!g)return 0;
    if(!g.magazineTypes)return g.mag;
    const type=Object.hasOwn(item,'magazineType')?item.magazineType:item.modules?.magazine?g.extendedMagazine:g.defaultMagazine;
    return acceptsMagazine(item.type,type)?magazineTypes[type]:0;
  }
  const STATIONS=['furnace','craft_bench','feed_craft'],MAX_BATCHES=6000;
  let jobs={furnace:null,craft_bench:null};
  let magazines={rifle_ak74:magazine,rifle_m4:0};
  let selected={furnace:'iron',craft_bench:'ammo',feed_craft:'feed'};
  let quantity={furnace:0,craft_bench:0,feed_craft:0};
  let activeStation=null,uiClock=0,burst=0,lastWeapon=null,benchPhase=0;
  let queueExtra={furnace:[],craft_bench:[],feed_craft:[]},readyExtra={furnace:{},craft_bench:{},feed_craft:{}},refundExtra={furnace:{},craft_bench:{},feed_craft:{}},pauseExtra={furnace:false,craft_bench:false,feed_craft:false},pinnedRecipe=null,craftUpgrades={workshop:false,tools:false};
  const craftEvent=(type,data)=>{if(typeof V010!=='undefined')V010.emit(type,data);};
  const materialCount=type=>typeof V010Inventory!=='undefined'?V010Inventory.materialCount(type):bagCount(type);
  const sumReady=id=>Object.values(readyExtra[id]).reduce((a,n)=>a+n,0)+(getJob(id)?.outputQty||0);
  const mix=(target,type,qty)=>{if(qty>0)target[type]=(target[type]||0)+qty;};
  const fixtures=[{id:'furnace',x:154,y:794,w:130,h:195},{id:'craft_bench',x:157,y:1061,w:260,h:173}];
  const labels={furnace:'Плавильная печь',craft_bench:'Универсальный станок',feed_craft:'Кормодробилка'};
  const deep=o=>JSON.parse(JSON.stringify(o));
  const powered=id=>devicePowered(id);
  const getJob=id=>id==='feed_craft'?pendingFeedCraft:jobs[id];
  function setJob(id,j){if(id==='feed_craft'){pendingFeedCraft=j;feedCraftBusy=!!j;}else jobs[id]=j;}
  const active=id=>!!getJob(id)&&getJob(id).remainingMs>0&&!pauseExtra[id];
  registerPowerDevice('furnace','workshop',6,()=>active('furnace'),'Плавильная печь');
  registerPowerDevice('craft_bench','workshop',2,()=>active('craft_bench'),'Универсальный станок');
  registerPowerDevice('feed_craft','farm',1,()=>active('feed_craft'),'Кормодробилка');
  for(const type of Object.keys(GUNS))if(!HAND_TYPES.includes(type))HAND_TYPES.push(type);
  handSvg.rifle_m4='<path fill="#465152" d="M3 25h21v13H4z"/><path fill="#1c292c" d="M22 21h48v18H22z"/><path fill="#657477" d="M48 23h27v11H48z"/><path stroke="#172528" stroke-width="4" d="M72 26h24m-23 6h23"/><path fill="#2c393d" d="M38 36h10l5 21-11 3zM25 37h9l-2 15h-8z"/><path stroke="#a0ada9" stroke-width="2" d="M25 20h46"/><path fill="#263333" d="M40 15h17v7H40zM84 17h5v10h-5z"/>';


  v09Style(`
    #v09CraftOverlay .v09Panel{box-sizing:border-box;width:min(570px,calc(100vw - 24px));height:min(720px,90vh);height:min(720px,90dvh);max-height:none;display:flex;flex-direction:column;overflow:hidden;padding:16px}
    #v09CraftOverlay .v09Header{flex:0 0 auto;margin:0 0 12px;padding-bottom:10px}
    #v09CraftOverlay .v09Title{font-size:19px;line-height:1.3}
    #v09CraftOverlay .v09Body{min-height:0;display:flex;flex:1;flex-direction:column;overflow:hidden}
    .v091CraftScroll{min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:thin;padding-right:4px}
    .v091CraftActions{flex:0 0 auto;padding-top:10px;border-top:1px solid #ffffff18}
    .v091CraftActions .menuButton{margin:0;width:100%;min-height:44px}
    .v09RecipeTabs{display:flex;gap:8px;margin:10px 0;height:42px}.v09RecipeTabs button{flex:1;margin:0}
    .v09RecipeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;min-height:78px}
    .v09RecipeCard{border:1px solid #455a5d;background:#202f34;color:#e7eeee;border-radius:10px;padding:8px 6px;font:inherit;cursor:pointer;min-height:78px}
    .v09RecipeCard.selected{border-color:#dcb36b;background:#344144}
    .v09CraftInfo{padding:12px;background:#18272c;border:1px solid #3a5156;border-radius:11px;line-height:1.65;margin:10px 0;box-sizing:border-box}
    .v091RecipeDetails{min-height:204px}.v09CraftMaterials{display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:12px;min-height:48px;margin:7px 0}
    .v09CraftShort{color:#efa496}.v09CraftReady{color:#a7d6aa}
    .v09CraftQuantity{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:9px 0}
    .v09CraftQuantity button{margin:0;min-height:44px;padding:8px 4px}
    .v091QuantityCount{font-size:17px;font-weight:700;text-align:center;padding-top:5px;color:#f0e0b8}
    .v09CraftProgress{height:10px;background:#0e1b1f;border-radius:9px;overflow:hidden;margin:13px 0}.v09CraftProgress>div{height:100%;background:linear-gradient(90deg,#a48047,#edc879);transition:width .2s}
    .v09GunStats{font-size:12px;color:#b5c9c7;line-height:1.6;min-height:58px}
    .v09CraftNote{font-size:12px;color:#9fb4b4;line-height:1.5;margin:8px 0}
    .v091CraftTotals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.v091CraftTotals>div{border:1px solid #53605a;border-radius:10px;padding:12px}.v091CraftTotals strong{display:block;font-size:25px;color:#e8ca84}.v091CraftTotals span{font-size:12px;color:#b6c8c4}
    @media(max-width:360px){#v09CraftOverlay .v09Panel{padding:12px}.v09CraftMaterials{grid-template-columns:1fr}.v09CraftQuantity{gap:4px}.v091QuantityCount{font-size:15px}}
    @media(max-height:500px){#v09CraftOverlay .v09Panel{height:96vh;height:96dvh;padding:10px}#v09CraftOverlay .v09Header{margin-bottom:5px;padding-bottom:5px}.v091CraftActions{padding-top:5px}}
  `);
  const overlay=v09Overlay('v09CraftOverlay','Мастерская');
  const body=overlay.querySelector('.v09Body');
  function gunStats(type){const g=GUNS[type];if(!g)return '';return `<div class="v09GunStats">Урон <b>${g.damage}</b> · ${Math.round(60000/g.delay)} выстр./мин · магазин ${g.mag}<br>Разброс ${I18n.numeric(g.spread*180/Math.PI,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})}° · дальность ${g.range} · отдача ${g.recoilLabel}<br>Патроны: ${g.caliber}</div>`;}
  function maximum(r){return Math.max(0,Math.min(MAX_BATCHES,...Object.entries(r.input).map(([type,n])=>Math.floor(materialCount(type)/n))));}
  const selectedBatches=id=>quantity[id];
  const maxSelection=id=>maximum(RECIPES[selected[id]]);
  function commitIngredients(input,batches){
    if(typeof V010Inventory!=='undefined')return V010Inventory.consumeMaterials(input,batches);
    if(!Object.entries(input).every(([type,n])=>bagCount(type)>=n*batches))return false;
    const next=deep(bag);
    for(const [type,n] of Object.entries(input))if(removeFromSlots(next,type,n*batches)!==n*batches)return false;
    bag=next;return true;
  }
  function makeJob(recipe,batches){const r=RECIPES[recipe];return {recipe,batches,paidInput:deep(r.input),totalMs:r.ms*batches,remainingMs:r.ms*batches,completedBatches:0,outputQty:0,collectedQty:0};}
  function syncFeed(j){if(j){j.total=RECIPES.feed.qty*j.batches;j.qty=j.total-j.collectedQty;j.readyAt=Date.now()+j.remainingMs;}feedCraftBusy=!!j;}
  function completedAt(j){if(j.remainingMs<=0)return j.batches;return Math.min(j.batches-1,Math.floor(((j.totalMs-j.remainingMs)*j.batches/j.totalMs)+1e-8));}
  function start(id,recipe=selected[id],batches=selectedBatches(id)){
    const r=RECIPES[recipe];
    if(!STATIONS.includes(id)||!r||r.station!==id||!availableRecipe(r)||!Number.isInteger(batches)||batches<1||batches>MAX_BATCHES||queueExtra[id].length>=30)return false;
    if(!commitIngredients(r.input,batches)){message('Не хватает доступных материалов в рюкзаке и на складе');render();return false;}
    const j=makeJob(recipe,batches);
    if(getJob(id))queueExtra[id].push(j);else setJob(id,j);
    if(id==='feed_craft'){syncFeed(getJob(id));feedCraftLoaded=0;}
    quantity[id]=0;render();renderQuickSlots();queueGameSave();return true;
  }
  function finishAndPromote(id){
    const j=getJob(id);
    if(j&&j.remainingMs===0){mix(readyExtra[id],RECIPES[j.recipe].output,j.outputQty);setJob(id,null);}
    if(!getJob(id)&&queueExtra[id].length)setJob(id,queueExtra[id].shift());
    if(id==='feed_craft')syncFeed(getJob(id));
  }
  function collect(id){
    if(!STATIONS.includes(id))return 0;
    let collected=0;
    const put=(type,qty)=>{let left=addItem(type,qty);if(id==='feed_craft'&&left>0)left=addToSlots(storageChests[12].items,type,left,60);collected+=qty-left;return left;};
    for(const type of Object.keys(readyExtra[id])){const left=put(type,readyExtra[id][type]);if(left)readyExtra[id][type]=left;else delete readyExtra[id][type];}
    const job=getJob(id);
    if(job?.outputQty){const before=job.outputQty;job.outputQty=put(RECIPES[job.recipe].output,before);job.collectedQty+=before-job.outputQty;}
    if(id==='feed_craft')syncFeed(job);
    if(job?.remainingMs===0)finishAndPromote(id);
    message(collected?`Забрано: ${collected} шт.`:'Освободите место в рюкзаке');
    render();renderQuickSlots();updateAmmoHud();queueGameSave();return collected;
  }
  // Keep output ownership in the existing save pools; selection never creates another copy.
  let readySelected={furnace:null,craft_bench:null,feed_craft:null};
  let readyOrder={furnace:[],craft_bench:[],feed_craft:[]};
  function readyItems(id){
    if(!STATIONS.includes(id))return {};
    const out={...readyExtra[id]},j=getJob(id);
    if(j?.outputQty)mix(out,RECIPES[j.recipe].output,j.outputQty);
    return out;
  }
  function collectType(id,type,limit){
    if(!STATIONS.includes(id)||!ITEM[type])return 0;
    const available=readyItems(id)[type]||0;
    const stack=itemStackLimit(type);
    const requested=Math.min(available,limit===undefined?stack:Math.max(0,Math.floor(limit)));
    if(!requested||!Number.isFinite(requested))return 0;
    const left=addItem(type,requested),taken=requested-left;
    if(taken){
      let debit=taken,n=Math.min(debit,readyExtra[id][type]||0);
      if(n){readyExtra[id][type]-=n;debit-=n;if(!readyExtra[id][type])delete readyExtra[id][type];}
      const j=getJob(id);
      if(debit&&j&&RECIPES[j.recipe].output===type){j.outputQty-=debit;j.collectedQty+=debit;}
      if(id==='feed_craft')syncFeed(j);
      if(j?.remainingMs===0)finishAndPromote(id);
      renderBag();renderQuickSlots();updateAmmoHud();queueGameSave();
    }
    message(taken?'Забрано: '+taken+' шт.':'Освободите место в рюкзаке');
    refreshProgress();return taken;
  }
  function refreshReadyView(id){
    const grid=el('v010ReadyList');if(!grid)return;
    const items=readyItems(id),order=readyOrder[id];
    for(const type of Object.keys(items))if(!order.includes(type))order.push(type);
    if(!grid._cells)grid._cells=[];
    const size=Math.max(6,order.length);
    while(grid._cells.length<size){
      const slot=v09Button('',()=>{if(!slot.dataset.output)return;readySelected[id]=slot.dataset.output;refreshReadyView(id);});
      slot.className='v011OutputCell';I18n.setAttr(slot,'aria-label','Пустая ячейка');grid.append(slot);grid._cells.push(slot);
    }
    grid._cells.forEach((slot,index)=>{
      const type=order[index]||'',qty=items[type]||0;
      if(slot.dataset.output!==type){slot.dataset.output=type;I18n.assign(slot,"innerHTML",type?itemIconHTML(type)+'<small></small>':'');}
      const count=slot.querySelector('small');if(count)I18n.assign(count,"textContent",qty?String(qty):'');
      slot.disabled=!qty;slot.classList.toggle('empty',!qty);slot.classList.toggle('selected',readySelected[id]===type&&!!qty);
      I18n.assign(slot,'title',qty?(ITEM[type]?.name||type)+' × '+qty:'Пустая ячейка');I18n.setAttr(slot,'aria-label',I18n.source(slot,'title'));
    });
    const type=readySelected[id],qty=items[type]||0,label=el('v011OutputLabel'),take=el('v011CollectSelected');
    if(label)I18n.assign(label,"textContent",qty?(ITEM[type]?.name||type)+' · '+qty:'Выберите готовую вещь');
    if(take){take.disabled=!qty;I18n.assign(take,"textContent",'Забрать стопку');}
    const total=el('v091CraftReady');if(total)I18n.assign(total,"textContent",String(sumReady(id)));
  }
  function collectRefund(id){
    if(!STATIONS.includes(id))return false;
    const before=Object.values(refundExtra[id]).reduce((a,n)=>a+n,0);
    if(typeof V010Inventory!=='undefined')refundExtra[id]=V010Inventory.putMaterials(refundExtra[id]);
    else for(const t of Object.keys(refundExtra[id])){const left=addItem(t,refundExtra[id][t]);if(left)refundExtra[id][t]=left;else delete refundExtra[id][t];}
    const left=Object.values(refundExtra[id]).reduce((a,n)=>a+n,0);
    if(before>left){renderQuickSlots();queueGameSave();}render();
    if(left)message('Материалы возврата ждут в устройстве: нет места');return before>left;
  }
  // Jobs retain what was actually prepaid, including orders from older saves.
  function jobInput(j){return j.paidInput||({iron:{iron_ore:1},copper:{copper_ore:1},ammo:{iron:2,copper:1},ammo556:{iron:2,copper:1}}[j.recipe]||RECIPES[j.recipe].input);}
  function validPaid(j){const p=j.paidInput;if(p===undefined)return true;return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length>0&&Object.entries(p).every(([t,n])=>ITEM[t]&&Number.isSafeInteger(n)&&n>0&&n<=10000);}
  function reserveRefund(id,r,batches){for(const [type,n] of Object.entries(r.input))mix(refundExtra[id],type,n*batches);}
  function cancelQueued(id,index){
    if(!STATIONS.includes(id)||!Number.isInteger(index)||index<0||index>=queueExtra[id].length)return false;
    const j=queueExtra[id].splice(index,1)[0];reserveRefund(id,{input:jobInput(j)},j.batches);collectRefund(id);queueGameSave();render();return true;
  }
  function cancelUnstarted(id){
    const j=getJob(id);if(!j)return 0;
    const unit=j.totalMs/j.batches,elapsed=j.totalMs-j.remainingMs;
    const keep=Math.min(j.batches,Math.max(j.completedBatches,Math.ceil(elapsed/unit-1e-9))),cancelled=j.batches-keep;
    if(!cancelled)return 0;reserveRefund(id,{input:jobInput(j)},cancelled);
    if(keep===0){mix(readyExtra[id],RECIPES[j.recipe].output,j.outputQty);setJob(id,null);}
    else{j.batches=keep;j.totalMs=keep*unit;j.remainingMs=Math.max(0,j.totalMs-elapsed);}
    finishAndPromote(id);collectRefund(id);render();queueGameSave();return cancelled;
  }
  function setPaused(id,value){if(!STATIONS.includes(id))return;pauseExtra[id]=!!value;render();queueGameSave();}

  function duration(ms){const sec=Math.ceil(ms/1000);return sec<60?`${sec} сек.`:sec<3600?`${Math.floor(sec/60)} мин. ${sec%60} сек.`:`${Math.floor(sec/3600)} ч. ${Math.floor(sec%3600/60)} мин.`;}
  let craftView=null;
  function availableRecipe(r){return !r.unlock||typeof V010Progression==='undefined'||V010Progression.isUnlocked(r.unlock);}
  function refreshProgress(){
    if(!activeStation)return;const id=activeStation,j=getJob(id),r=j?RECIPES[j.recipe]:null;
    const status=el('v091CraftStatus'),bar=el('v091CraftBar'),made=el('v091CraftMade'),ready=el('v091CraftReady'),time=el('v091CraftTime'),button=el('v091CraftCollect');
    if(status)I18n.assign(status,"textContent",pauseExtra[id]?'Пауза':!V09Power.devices[id].enabled?'Выключен':!powered(id)?'Нет питания':j?'Работает':sumReady(id)?'Готово':'Ожидание');
    const percent=j?clamp(100*(1-j.remainingMs/j.totalMs),0,100):0;
    if(bar)bar.style.width=percent+'%';if(made)I18n.assign(made,"textContent",j?`${j.completedBatches*r.qty} / ${j.batches*r.qty}`:'—');if(ready)I18n.assign(ready,"textContent",String(sumReady(id)));
    if(time){const key=j?r.output:'';if(time.dataset.output!==key){I18n.assign(time,"innerHTML",j?itemIconHTML(key)+'<span></span>':'<span></span>');time.dataset.output=key;}I18n.assign(time.querySelector('span'),"textContent",j?`Сейчас: ${r.name} · ${duration(j.remainingMs/(craftUpgrades.workshop?1.2:1))}`:'Выберите рецепт');}
    if(button){button.disabled=sumReady(id)===0;I18n.assign(button,"textContent",'Забрать всё');}
    refreshReadyView(id);
  }
  function render(){
    if(!activeStation)return;const id=activeStation,job=getJob(id);
    if(!RECIPES[selected[id]]||RECIPES[selected[id]].station!==id)selected[id]=Object.keys(RECIPES).find(k=>RECIPES[k].station===id);
    // Keep the recipe list mounted: replacing it drops scroll position, pointer capture and keyboard focus.
    const focus=document.activeElement,focusControl=focus?.dataset?.craftControl;
    I18n.setAttr(overlay.querySelector('.panel'),'aria-label',labels[id]);I18n.assign(overlay.querySelector('.v09Title'),"textContent",labels[id]);
    if(!craftView||craftView.id!==id||craftView.layout.parentNode!==body){
      body.replaceChildren();
      const device=renderDeviceSwitch(id);device.classList.add('v010CraftDevice');body.append(device);
      const layout=document.createElement('div');layout.className='v092CraftLayout';body.append(layout);
      const list=document.createElement('div');list.className='v092RecipeList';I18n.setAttr(list,'aria-label','Рецепты');layout.append(list);
      const scroll=document.createElement('div');scroll.className='v091CraftScroll';layout.append(scroll);
      const actions=document.createElement('div');actions.className='v091CraftActions';body.append(actions);
      craftView={id,device,layout,list,scroll,actions,recipeKeys:null,buttons:new Map(),detailRecipe:null};
    }
    const {device,list,scroll,actions}=craftView;
    const leftScroll=list.scrollTop||0,rightScroll=craftView.detailRecipe===selected[id]?(scroll.scrollTop||0):0;
    v09UpdateDeviceRow(device);
    const recipes=Object.entries(RECIPES).filter(([,r])=>r.station===id),recipeKeys=recipes.map(([key,r])=>key+':'+r.category).join('|');
    if(craftView.recipeKeys!==recipeKeys){
      list.replaceChildren();craftView.buttons.clear();let category='';
      for(const [key,r] of recipes){
        if(category!==r.category){category=r.category;const heading=document.createElement('div');heading.className='v092Category';I18n.assign(heading,"textContent",category);list.append(heading);}
        const b=v09Button('',()=>{if(selected[id]===key)return;selected[id]=key;quantity[id]=0;render();});b.className='v092Recipe';b.dataset.recipe=key;I18n.assign(b,"title",r.name);I18n.assign(b,"innerHTML",`${itemIconHTML(r.output)}<span>${r.name}<small></small></span>`);
        list.append(b);craftView.buttons.set(key,{button:b,detail:b.querySelector('small')});
      }
      craftView.recipeKeys=recipeKeys;
    }
    for(const [key,r] of recipes){
      const node=craftView.buttons.get(key),selectedHere=selected[id]===key;
      node.button.classList.toggle('selected',selectedHere);node.button.setAttribute('aria-pressed',String(selectedHere));
      const detail=availableRecipe(r)?'×'+r.qty+' · '+duration(r.ms):'🔒 Нужен чертёж';
      if(I18n.source(node.detail)!==detail)I18n.assign(node.detail,"textContent",detail);
    }
    scroll.replaceChildren();if(!craftView.output)actions.replaceChildren();craftView.detailRecipe=selected[id];
    quantity[id]=clamp(quantity[id],0,6000);const r=RECIPES[selected[id]],count=selectedBatches(id),watts=id==='furnace'?6:id==='craft_bench'?2:1;
    const info=document.createElement('div');info.className='v092RecipeDetails';scroll.append(info);
    const flow=document.createElement('div');flow.className='v011RecipeFlow';info.append(flow);
    const materials=document.createElement('div');materials.className='v092Materials';flow.append(materials);
    const help=document.createElement('div');help.className='v092MaterialHelp';I18n.assign(help,"textContent",'');
    for(const [type,n] of Object.entries(r.input)){
      const need=n*Math.max(1,count),have=materialCount(type),b=v09Button('',()=>{
        const recipe=Object.entries(RECIPES).find(([,v])=>v.output===type);
        I18n.assign(help,"textContent",recipe?`${ITEM[type].name}: ${labels[recipe[1].station]}. ${Object.entries(recipe[1].input).map(([t,q])=>q+' × '+ITEM[t].name).join(' + ')} → ${recipe[1].qty} шт.`:({iron_ore:'Добывайте киркой за крепостью.',copper_ore:'Добывайте киркой на каменистых участках.',wood:'Рубите деревья топором.',parts:'Обыскивайте гаражи, машины и дома.',grain:'Выращивайте на ферме.',advanced_parts:'Ищите на удалённых складах.'}[type]||'Ищите во время вылазок.'));
      });
      b.className='v092Ingredient'+(have<need?' v09CraftShort':'');I18n.assign(b,"title",ITEM[type]?.name||type);
      I18n.assign(b,"innerHTML",`${itemIconHTML(type)}<span>${ITEM[type]?.name||type}<strong>${have} / ${need}</strong></span>`);materials.append(b);
    }
    const arrow=document.createElement('div');arrow.className='v011RecipeArrow';I18n.assign(arrow,"textContent",'→');arrow.setAttribute('aria-hidden','true');flow.append(arrow);
    const result=document.createElement('div');result.className='v092RecipeHero';I18n.assign(result,"innerHTML",`${itemIconHTML(r.output)}<b>${r.name}</b><span class="v011Yield">× ${r.qty*Math.max(1,count)}</span>`);flow.append(result);
    const meta=document.createElement('div');meta.className='v011RecipeMeta';I18n.assign(meta,"textContent",duration(r.ms*Math.max(1,count)/(craftUpgrades.workshop?1.2:1))+' · '+watts+' кВт');info.append(meta);
    const gun=GUNS[r.output];
    if(gun){const detail=document.createElement('small');detail.className='v011RecipeWeapon';I18n.assign(detail,"textContent",'Урон '+gun.damage+' · Магазин '+gun.mag+' · '+gun.caliber);info.append(detail);}
    if(ITEM[r.output]?.ammo){const compatible=document.createElement('small');compatible.className='v011RecipeWeapon';I18n.assign(compatible,"textContent",'Для '+weaponsForAmmo(r.output).map(type=>GUNS[type].name).join(' / ')+' · '+ITEM[r.output].caliber);info.append(compatible);}
    info.append(help);
    const controls=document.createElement('div');controls.className='v011BatchControls';scroll.append(controls);
    const amount=document.createElement('div');amount.className='v091QuantityCount';I18n.assign(amount,"textContent",`Количество: ${r.qty*count}`);controls.append(amount);
    const q=document.createElement('div');q.className='v09CraftQuantity';for(const [label,value] of [['+1',quantity[id]+1],['+10',quantity[id]+10],['MAX',maxSelection(id)],['0',0]]){const b=v09Button(label,()=>{quantity[id]=clamp(value,0,6000);render();});b.dataset.craftControl='quantity-'+label;q.append(b);}controls.append(q);
    const make=v09Button((job?'В очередь':'Изготовить')+' · '+r.qty*count,()=>{const missing=Object.entries(r.input).filter(([t,n])=>materialCount(t)<n*Math.max(1,count));if(missing.length){for(const b of materials.children)if(missing.some(([t])=>I18n.source(b,'title')===ITEM[t].name)){b.classList.remove('v013Missing');void b.offsetWidth;b.classList.add('v013Missing');}return;}if(!count)quantity[id]=1;start(id);},'primary');make.classList.add('v011CraftMake');make.dataset.craftControl='make';make.disabled=!availableRecipe(r)||queueExtra[id].length>=30;scroll.append(make);
    const pin=v09Button(pinnedRecipe?.recipe===selected[id]?'Открепить рецепт':'Закрепить рецепт',()=>{pinnedRecipe=pinnedRecipe?.recipe===selected[id]?null:{recipe:selected[id],batches:Math.max(1,count)};render();queueGameSave();});pin.className='v010CraftSmall v011PinRecipe';pin.dataset.craftControl='pin';scroll.append(pin);
    const progress=document.createElement('div');progress.className='v092Production';I18n.assign(progress,"innerHTML",'<span id="v091CraftStatus"></span><div id="v091CraftTime"></div><div class="v09CraftProgress"><div id="v091CraftBar"></div></div><div class="v092ProductionCounts"><strong id="v091CraftMade"></strong> изготовлено</div>');scroll.append(progress);
    if(job){const jobControls=document.createElement('div');jobControls.className='v010CraftControls';const p=v09Button(pauseExtra[id]?'Продолжить':'Пауза',()=>setPaused(id,!pauseExtra[id]));p.className='v010CraftSmall';p.dataset.craftControl='pause';jobControls.append(p);const cancel=v09Button('Отменить остаток',()=>cancelUnstarted(id));cancel.className='v010CraftSmall';cancel.dataset.craftControl='cancel';I18n.assign(cancel,'title','Начатая партия сохранится, материалы следующих вернутся');jobControls.append(cancel);scroll.append(jobControls);}
    const queue=document.createElement('div');queue.className='v010CraftQueue';
    if(queueExtra[id].length){const h=document.createElement('div');h.className='v092Category';I18n.assign(h,"textContent",'Далее · '+queueExtra[id].length);queue.append(h);}
    queueExtra[id].forEach((j,index)=>{const line=document.createElement('div');line.className='v010QueueRow';I18n.assign(line,"innerHTML",`${itemIconHTML(RECIPES[j.recipe].output)}<span>${RECIPES[j.recipe].name}<small> × ${j.batches*RECIPES[j.recipe].qty}</small></span>`);const x=v09Button('×',()=>cancelQueued(id,index));I18n.assign(x,'title','Отменить заказ и вернуть материалы');I18n.setAttr(x,'aria-label',I18n.source(x,'title'));line.append(x);queue.append(line);});scroll.append(queue);
    const refunds=Object.values(refundExtra[id]).reduce((a,n)=>a+n,0);if(refunds){const b=v09Button('Вернуть материалы · '+refunds,()=>collectRefund(id));b.className='v010CraftSmall';scroll.append(b);}
    if(id==='craft_bench'){
      const extra=document.createElement('details');extra.className='v011CraftMore';const summary=document.createElement('summary');I18n.assign(summary,"textContent",'Мастерская · оборудование');extra.append(summary);
      const mods=document.createElement('div');mods.className='v010CraftExtras';extra.append(mods);
      if(typeof V010Combat!=='undefined'){const b=v09Button('Экипировка и модули',()=>V010Combat.openWorkshop());b.className='v010CraftSmall';mods.append(b);}
      for(const [key,name,cost] of [['workshop','Станки +20%',{iron:30,copper:10,parts:10}],['tools','Кирка +20%',{iron:15,copper:5,parts:4}]]){
        const unlock=key==='workshop'?'workshop_efficiency':'tools_upgrade',unlocked=typeof V010Progression!=='undefined'&&V010Progression.isUnlocked(unlock),wrap=document.createElement('div');wrap.className='v010CraftUpgrade';
        const b=v09Button(craftUpgrades[key]?name+' ✓':name+(unlocked?'':' 🔒'),()=>improve(key));b.className='v010CraftSmall';b.disabled=craftUpgrades[key]||!unlocked;wrap.append(b);
        const costLine=document.createElement('small');I18n.assign(costLine,"textContent",craftUpgrades[key]?'Установлено':Object.entries(cost).map(([t,n])=>ITEM[t].name+' '+n).join(' · '));wrap.append(costLine);mods.append(wrap);
      }scroll.append(extra);
    }
    // Keep the output cells mounted across recipe and queue updates.
    if(!craftView.output){
      const output=document.createElement('div');output.className='v011OutputInventory';
      const head=document.createElement('div');head.className='v011OutputHead';I18n.assign(head,"innerHTML",'<span>Готово</span><small id="v091CraftReady"></small>');output.append(head);
      const grid=document.createElement('div');grid.id='v010ReadyList';I18n.setAttr(grid,'aria-label','Готовые предметы станка');output.append(grid);
      const label=document.createElement('div');label.id='v011OutputLabel';output.append(label);
      const buttons=document.createElement('div');buttons.className='v011OutputActions';
      const selectedTake=v09Button('Забрать стопку',()=>collectType(id,readySelected[id]));selectedTake.id='v011CollectSelected';buttons.append(selectedTake);
      const take=v09Button('Забрать всё',()=>collect(id));take.id='v091CraftCollect';take.dataset.craftControl='collect';buttons.append(take);output.append(buttons);craftView.output=output;
    }
    if(craftView.output.parentNode!==actions)actions.append(craftView.output);refreshProgress();
    if(focusControl){const next=Array.from(body.querySelectorAll('[data-craft-control]')).find(b=>b.dataset.craftControl===focusControl);if(next&&!next.disabled)next.focus({preventScroll:true});}
    list.scrollTop=leftScroll;scroll.scrollTop=rightScroll;

  }

  function open(id){if(!STATIONS.includes(id))return;activeStation=id;render();openOverlay(overlay);}
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){return [...oldInteractions(which).filter(o=>o.kind!=='workshop'),...(which==='bunker'?fixtures.map(o=>({...o,kind:'v09craft',name:labels[o.id],range:48})):[])];};
  const oldExecute=executeInteraction;
  executeInteraction=function(target){
    if(target?.kind!=='v09craft')return oldExecute(target);
    if(menuOpen||playerDead||!canInteract(target,player.x,player.y))return;
    GameMovement.begin('INTERACT',target);open(target.id);
  };
  // All manufacturing uses the same panel dimensions and incremental queue model.
  openFeedCraftMenu=function(){feedCraftLoaded=0;open('feed_craft');};
  renderPendingFeedCraft=function(){if(activeStation==='feed_craft')refreshProgress();};
  function startFeed(){return start('feed_craft','feed',Math.floor(feedCraftLoaded/10));}
  function collectFeed(){return collect('feed_craft');}
  function tick(ms){
    if(document.hidden||playerDead)return;ms=clamp(ms,0,100);let changed=false;
    for(const id of STATIONS){
      if(getJob(id)?.remainingMs===0||(!getJob(id)&&queueExtra[id].length)){finishAndPromote(id);changed=true;}
      const job=getJob(id);if(!job||job.remainingMs<=0||pauseExtra[id]||!powered(id))continue;
      job.remainingMs=Math.max(0,job.remainingMs-ms*(craftUpgrades.workshop?1.2:1));const completed=completedAt(job);
      const newlyMade=completed-job.completedBatches;
      if(newlyMade>0){const r=RECIPES[job.recipe],qty=newlyMade*r.qty;job.outputQty+=qty;job.completedBatches=completed;craftEvent('produced',{type:r.output,qty,station:id});queueGameSave();}
      if(id==='feed_craft')syncFeed(job);if(id==='craft_bench')benchPhase+=ms/700;
      if(job.remainingMs===0){craftEvent('productionFinished',{station:id,recipe:job.recipe});if(typeof V010!=='undefined')V010.log(labels[id]+': готово — '+RECIPES[job.recipe].name,'craft');finishAndPromote(id);changed=true;queueGameSave();}
    }
    uiClock+=ms;const refreshDue=uiClock>=200;if(refreshDue)uiClock=0;
    if(overlay.classList.contains('open')){if(changed)render();else if(refreshDue)refreshProgress();}
  }

  updateFeedCraft=function(){tick(16.667*frameScale);};
  function state(id){const j=getJob(id);return pauseExtra[id]?'ПАУЗА':!active(id)&&sumReady(id)?'ГОТОВО':!powered(id)?'НЕТ ПИТАНИЯ':j?'РАБОТАЕТ':'ОЖИДАНИЕ';}
  function drawWorkshop(){
    ctx.save();
    ctx.fillStyle='#e4e8dc';ctx.font='15px Arial';ctx.textAlign='center';ctx.fillText(I18n.text('МАСТЕРСКАЯ'),450,795);
    // Fireproof plinth and vent sit against the upper wall; clear aisle to the right.
    ctx.fillStyle='#292d2d';ctx.fillRect(130,784,208,153);ctx.strokeStyle='#666d67';ctx.lineWidth=2;ctx.strokeRect(130,784,208,153);
    ctx.fillStyle='#697170';ctx.fillRect(205,768,48,43);ctx.fillStyle='#92958d';ctx.fillRect(190,795,78,13);
    ctx.fillStyle='#525c5c';ctx.fillRect(145,800,175,125);ctx.strokeStyle='#96a29b';ctx.lineWidth=3;ctx.strokeRect(145,800,175,125);
    ctx.fillStyle='#252c2c';ctx.fillRect(160,815,96,72);ctx.strokeStyle='#868c7e';ctx.lineWidth=4;ctx.strokeRect(160,815,96,72);
    const working=active('furnace')&&powered('furnace');
    if(working){const glow=ctx.createRadialGradient(209,855,3,209,855,46);glow.addColorStop(0,'#ffd68c');glow.addColorStop(.4,'#d67835');glow.addColorStop(1,'#492a1b');ctx.fillStyle=glow;ctx.fillRect(164,819,88,64);ctx.fillStyle='#ffe0a0';for(let i=0;i<4;i++)ctx.fillRect(177+i*16,856+Math.sin(performance.now()/150+i)*5,11,15);}
    else{ctx.fillStyle='#172020';ctx.fillRect(164,819,88,64);ctx.fillStyle='#5c6160';ctx.fillRect(175,862,63,8);}
    ctx.fillStyle=working?'#ecb967':state('furnace')==='ГОТОВО'?'#9fccad':'#7d8b84';ctx.fillRect(276,822,24,7);
    ctx.strokeStyle='#253332';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(270,845+i*7);ctx.lineTo(304,845+i*7);ctx.stroke();}
    ctx.fillStyle='#e3e7dc';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText(I18n.text('ПЛАВИЛЬНАЯ ПЕЧЬ'),231,905);ctx.font='9px Arial';ctx.fillStyle='#c5cbb8';ctx.fillText(I18n.text(state('furnace')),231,920);
    // Electric fabrication cell: screen, gantry, belt drive and receiving tray.
    const benchWorking=active('craft_bench')&&powered('craft_bench'),benchOn=powered('craft_bench');
    ctx.fillStyle='#202e34';ctx.fillRect(152,1126,282,99);ctx.strokeStyle='#657f89';ctx.lineWidth=3;ctx.strokeRect(160,1135,265,80);
    const casing=ctx.createLinearGradient(160,1135,160,1215);casing.addColorStop(0,'#607780');casing.addColorStop(.3,'#344e59');casing.addColorStop(1,'#20333d');ctx.fillStyle=casing;ctx.fillRect(162,1137,261,76);
    ctx.fillStyle='#132229';ctx.fillRect(177,1149,143,40);ctx.strokeStyle='#537887';ctx.lineWidth=1;ctx.strokeRect(177,1149,143,40);
    ctx.strokeStyle='#30525b';for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(181+i*20,1150);ctx.lineTo(181+i*20,1187);ctx.stroke();}
    // The animation phase advances only in tick while production actually receives power.
    const armX=216+Math.sin(benchPhase)*33;ctx.strokeStyle='#a9bec1';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(184,1150);ctx.lineTo(313,1150);ctx.moveTo(184,1185);ctx.lineTo(313,1185);ctx.stroke();
    ctx.fillStyle='#748f96';ctx.fillRect(armX,1147,14,42);ctx.fillStyle='#c3d5cc';ctx.fillRect(armX-3,1161,20,11);ctx.fillStyle=benchWorking?'#75ead2':'#35655e';ctx.fillRect(armX+4,1166,6,5);
    for(const x of [182,314]){ctx.save();ctx.translate(x,1196);ctx.rotate(benchPhase*3);ctx.strokeStyle='#9aaeb3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#12272e';ctx.fillRect(334,1144,60,29);ctx.strokeStyle='#6e9da7';ctx.lineWidth=2;ctx.strokeRect(334,1144,60,29);
    ctx.fillStyle=benchOn?'#91dfd3':'#33595f';ctx.font='7px monospace';ctx.fillText(I18n.text(benchWorking?'FAB / ACTIVE':state('craft_bench')==='ГОТОВО'?'READY':'FAB / IDLE'),364,1154);
    ctx.fillStyle='#283c42';ctx.fillRect(340,1160,47,5);ctx.fillStyle=benchOn?'#7acebe':'#385652';ctx.fillRect(340,1160,getJob('craft_bench')?47*(1-getJob('craft_bench').remainingMs/getJob('craft_bench').totalMs):4,5);
    ctx.fillStyle='#172a2c';ctx.fillRect(333,1179,66,24);ctx.strokeStyle='#718984';ctx.strokeRect(333,1179,66,24);
    if(getJob('craft_bench')?.outputQty>0){ctx.fillStyle='#d4bc79';ctx.fillRect(342,1186,17,9);ctx.fillRect(370,1186,17,9);}
    ctx.fillStyle=benchWorking?'#7ee8ce':state('craft_bench')==='ГОТОВО'?'#93cca2':'#47616a';ctx.beginPath();ctx.arc(411,1150,4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#202f38';ctx.lineWidth=2;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(405,1171+i*5);ctx.lineTo(418,1171+i*5);ctx.stroke();}
    ctx.fillStyle='#dce9e3';ctx.font='9px Arial';ctx.fillText(I18n.text('ЭЛЕКТРОСТАНОК · '+state('craft_bench')),290,1236);
    ctx.restore();
  }

  // Store ammunition per weapon. The legacy magazine field is kept compatible with old saves.
  canFire=function(){const type=heldItem();return !!GUNS[type]&&bagCount(type)>0;};
  function syncMagazine(){magazine=magazines[heldItem()]??magazines.rifle_ak74;magazineMax=30;}
  updateAmmoHud=function(){syncMagazine();const g=GUNS[heldItem()],hud=el('ammoHud');hud.style.display=canFire()?'block':'none';if(g)I18n.assign(hud,"textContent",`${g.name} · ${magazines[heldItem()]} / ${bagCount(g.ammo)} · ${g.caliber}`);};
  reloadWeapon=function(){
    const type=heldItem(),g=GUNS[type];if(!g||bagCount(type)<1)return;
    const got=removeItem(g.ammo,g.mag-magazines[type]);magazines[type]+=got;syncMagazine();updateAmmoHud();
    if(got>0){message(`${g.name}: перезаряжено`);queueGameSave();}else if(magazines[type]===0)message(`Нет патронов ${g.caliber}`);
  };
  shoot=function(){
    if(menuOpen||playerDead||!canFire()||document.hidden)return;
    const type=heldItem(),g=GUNS[type],now=performance.now();
    if(now-lastShot<g.delay)return;
    if(magazines[type]<=0){lastShot=now;reloadWeapon();return;}
    if(type!==lastWeapon||now-lastShot>420)burst=0;
    burst=Math.min(7,burst+1);lastWeapon=type;lastShot=now;magazines[type]--;updateAmmoHud();
    const base=Math.atan2(player.aimY,player.aimX),cone=g.spread+g.recoil*Math.max(0,burst-1),angle=base+(Math.random()*2-1)*cone;
    const dx=Math.cos(angle),dy=Math.sin(angle),x=player.x+dx*43,y=player.y+dy*43;
    if(lineClear(player.x,player.y,x,y,2,scene)){
      bullets.push({x,y,dx:dx*12,dy:dy*12,radius:3,life:g.range/12,damage:g.damage,weapon:type});muzzleFlash.time=now;muzzleFlash.x=x;muzzleFlash.y=y;
    }
    playGunshot();createNoise(player.x,player.y,550);queueGameSave();
  };
  function drawM4Held(recoil){
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(26+recoil,-1);ctx.moveTo(3,11);ctx.lineTo(13+recoil,3);ctx.stroke();
    ctx.save();ctx.translate(recoil,0);ctx.fillStyle='#4e5c5c';ctx.fillRect(-4,-5,13,10);ctx.fillStyle='#243334';ctx.fillRect(8,-4,22,8);ctx.fillStyle='#627572';ctx.fillRect(25,-4,12,7);
    ctx.fillStyle='#263437';ctx.fillRect(17,4,5,11);ctx.fillRect(10,4,4,7);ctx.fillStyle='#8a9b96';ctx.fillRect(37,-2,9,3);ctx.fillStyle='#1d292a';ctx.fillRect(41,-5,3,4);ctx.fillRect(13,-7,10,3);
    ctx.strokeStyle='#afbab0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,-4);ctx.lineTo(34,-4);ctx.stroke();ctx.restore();
  }
  const oldAssign=openHandAssignment;
  openHandAssignment=function(type){oldAssign(type);const old=el('v09HeldGunStats');if(old)old.remove();if(!GUNS[type])return;const box=document.createElement('div');box.id='v09HeldGunStats';box.className='v09CraftInfo';I18n.assign(box,"innerHTML",gunStats(type));el('handAssignChoices').before(box);};
  const oldPlayerDraw=drawPlayer;
  drawPlayer=function(){
    oldPlayerDraw();
    const g=GUNS[heldItem()];if(!g||!rightAimActive)return;
    const angle=Math.atan2(player.aimY,player.aimX),cone=g.spread+(performance.now()-lastShot<420?g.recoil*Math.max(0,burst-1):0);
    ctx.save();ctx.strokeStyle='rgba(235,220,162,.28)';ctx.lineWidth=1;ctx.beginPath();
    for(const a of [angle-cone,angle+cone]){ctx.moveTo(player.x+Math.cos(a)*47,player.y+Math.sin(a)*47);ctx.lineTo(player.x+Math.cos(a)*125,player.y+Math.sin(a)*125);}ctx.stroke();ctx.restore();
  };
  function capture(){
    const f=pendingFeedCraft?deep(pendingFeedCraft):null;if(f)delete f.readyAt;
    return {schema:2,jobs:deep(jobs),magazines:deep(magazines),feed:f};
  }
  function normalizeSave(data){
    const fail=()=>{throw new Error('Некорректное сохранение производства');};
    const num=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max,int=(v,min,max)=>Number.isInteger(v)&&num(v,min,max);
    if(!data||!data.jobs||!data.magazines||(data.schema!==undefined&&data.schema!==2))fail();
    const out={schema:2,jobs:{furnace:null,craft_bench:null},magazines:deep(data.magazines),feed:null};
    function normalJob(src,id,legacy){
      if(src===null)return null;const j=deep(src),r=j&&RECIPES[j.recipe];
      if(!r||!validPaid(j)||r.station!==id||!int(j.batches,1,legacy?100:MAX_BATCHES)||j.totalMs!==r.ms*j.batches||!num(j.remainingMs,0,j.totalMs))fail();
      if(legacy){
        if(!int(j.outputQty,1,r.qty*j.batches)||(j.remainingMs>0&&j.outputQty!==r.qty*j.batches))fail();
        j.completedBatches=completedAt(j);j.collectedQty=j.remainingMs===0?r.qty*j.batches-j.outputQty:0;j.outputQty=j.completedBatches*r.qty-j.collectedQty;
      }
      checkQueue(j,r);return j;
    }
    function checkQueue(j,r){
      if(!int(j.completedBatches,0,j.batches)||j.completedBatches!==completedAt(j)||!int(j.collectedQty,0,j.completedBatches*r.qty)||!int(j.outputQty,0,j.batches*r.qty)||j.outputQty+j.collectedQty!==j.completedBatches*r.qty||(j.remainingMs===0&&j.outputQty===0))fail();
    }
    for(const id of ['furnace','craft_bench'])out.jobs[id]=normalJob(data.jobs[id],id,data.schema!==2);
    if(!int(out.magazines.rifle_ak74,0,30)||!int(out.magazines.rifle_m4,0,30))fail();
    if(data.feed!==null){
      const f=deep(data.feed);if(!f)fail();
      if(f.recipe===undefined){
        // Before 0.9.2 the entire feed order took 2.5 seconds. Preserve that duration and elapsed work.
        if(!int(f.qty,1,100000)||!int(f.total,f.qty,100000)||f.total%20!==0||!num(f.remainingMs,0,2500)||(f.remainingMs>0&&f.qty!==f.total))fail();
        f.recipe='feed';f.batches=f.total/20;f.totalMs=2500;f.completedBatches=completedAt(f);f.collectedQty=f.total-f.qty;f.outputQty=f.completedBatches*20-f.collectedQty;
      }
      if(f.recipe!=='feed'||!int(f.batches,1,MAX_BATCHES)||f.total!==f.batches*20||!num(f.remainingMs,0,f.totalMs)||(f.totalMs!==2500&&f.totalMs!==f.batches*2500))fail();
      checkQueue(f,RECIPES.feed);if(f.qty!==f.total-f.collectedQty)fail();delete f.readyAt;out.feed=f;
    }
    return out;
  }
  function validate(data){normalizeSave(data);return true;}
  function restore(data){
    if(data){const d=normalizeSave(data);jobs=deep(d.jobs);magazines=deep(d.magazines);pendingFeedCraft=d.feed?deep(d.feed):null;}
    else{jobs={furnace:null,craft_bench:null};magazines={rifle_ak74:clamp(magazine,0,30),rifle_m4:0};if(pendingFeedCraft){const f={qty:pendingFeedCraft.qty,total:pendingFeedCraft.total,remainingMs:clamp(Number.isFinite(pendingFeedCraft.remainingMs)?pendingFeedCraft.remainingMs:pendingFeedCraft.readyAt-Date.now(),0,2500)};pendingFeedCraft=normalizeSave({jobs,magazines,feed:f}).feed;}}
    syncFeed(pendingFeedCraft);feedCraftLoaded=0;burst=0;lastWeapon=null;benchPhase=0;selected={furnace:'iron',craft_bench:'ammo',feed_craft:'feed'};quantity={furnace:0,craft_bench:0,feed_craft:0};syncMagazine();updateAmmoHud();
  }
  function queueCapture(){return {version:1,queues:deep(queueExtra),ready:deep(readyExtra),refunds:deep(refundExtra),paused:deep(pauseExtra),pin:deep(pinnedRecipe),upgrades:{...craftUpgrades}};}
  function queueValidate(data){
    if(data==null)return true;
    const fail=()=>{throw new Error('Некорректная очередь производства');};
    if(!data||data.version!==1||!data.queues||!data.ready||!data.refunds||!data.paused)fail();
    for(const id of STATIONS){
      const list=data.queues[id];if(!Array.isArray(list)||list.length>30||typeof data.paused[id]!=='boolean')fail();
      for(const j of list){const r=RECIPES[j?.recipe];if(!r||!validPaid(j)||r.station!==id||!Number.isInteger(j.batches)||j.batches<1||j.batches>MAX_BATCHES||j.totalMs!==r.ms*j.batches||j.remainingMs!==j.totalMs||j.completedBatches!==0||j.outputQty!==0||j.collectedQty!==0)fail();}
      for(const field of ['ready','refunds']){const pool=data[field][id];if(!pool||typeof pool!=='object'||Array.isArray(pool)||Object.keys(pool).length>200)fail();for(const [t,n] of Object.entries(pool))if(!ITEM[t]||!Number.isSafeInteger(n)||n<1||n>100000000)fail();}
    }
    if(data.pin!==null&&(!data.pin||!RECIPES[data.pin.recipe]||!Number.isInteger(data.pin.batches)||data.pin.batches<1||data.pin.batches>MAX_BATCHES))fail();
    if(data.upgrades&&(['workshop','tools'].some(k=>typeof data.upgrades[k]!=='boolean')))fail();return true;
  }
  function queueRestore(data){
    queueValidate(data);readySelected={furnace:null,craft_bench:null,feed_craft:null};readyOrder={furnace:[],craft_bench:[],feed_craft:[]};craftView=null;queueExtra={furnace:[],craft_bench:[],feed_craft:[]};readyExtra={furnace:{},craft_bench:{},feed_craft:{}};refundExtra={furnace:{},craft_bench:{},feed_craft:{}};pauseExtra={furnace:false,craft_bench:false,feed_craft:false};pinnedRecipe=null;craftUpgrades={workshop:false,tools:false};
    if(data){queueExtra=deep(data.queues);readyExtra=deep(data.ready);refundExtra=deep(data.refunds);pauseExtra=deep(data.paused);pinnedRecipe=deep(data.pin);craftUpgrades={...craftUpgrades,...data.upgrades};}activeStation=null;
  }
  function improve(key){
    if(!['workshop','tools'].includes(key)||craftUpgrades[key]||!powered('craft_bench'))return false;
    const unlock=key==='workshop'?'workshop_efficiency':'tools_upgrade';if(typeof V010Progression==='undefined'||!V010Progression.isUnlocked(unlock))return false;
    const input=key==='workshop'?{iron:30,copper:10,parts:10}:{iron:15,copper:5,parts:4};
    if(!commitIngredients(input,1)){message('Не хватает материалов для улучшения');return false;}
    craftUpgrades[key]=true;craftEvent('equipmentImproved',{kind:key});render();renderQuickSlots();queueGameSave();message(key==='workshop'?'Скорость производства увеличена на 20%':'Скорость добычи увеличена на 20%');return true;
  }
  const craftQueue={capture:queueCapture,validate:queueValidate,restore:queueRestore,cancelQueued,cancelUnstarted,setPaused,collectRefund,collectType,readyItems,improve,
    get queues(){return queueExtra;},get ready(){return readyExtra;},get refunds(){return refundExtra;},get paused(){return pauseExtra;},get pin(){return pinnedRecipe;},get upgrades(){return craftUpgrades;},
    setPin(recipe,batches=1){pinnedRecipe=recipe&&RECIPES[recipe]?{recipe,batches:Math.max(1,Math.min(MAX_BATCHES,Math.floor(batches)))}:null;queueGameSave();},render, getJob};

  return {visualState:id=>({working:active(id)&&powered(id),powered:powered(id),status:state(id),progress:getJob(id)?1-getJob(id).remainingMs/getJob(id).totalMs:0}),craftQueue,materialCount,capture,restore,validate,normalizeSave,open,start,collect,tick,startFeed,collectFeed,drawWorkshop,drawM4Held,recipes:RECIPES,weapons:GUNS,magazineTypes,weaponsForAmmo,acceptsMagazine,magazineCapacity,fixtures,gunStats,maximum};
})();


