/* Manual commands reuse the existing individual growth and irrigation clocks. */
window.V0141Farm=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x)),cropTypes=new Set(farmCrops.map(c=>c.itemType));
  let selected=0,recovery=[],plantingStock=false,bound=false;
  // All crops use their configured planting material. Existing crops use one
  // produce unit; an explicit seedType can be used without per-crop branches.
  const seedType=crop=>farmCrops[crop]?.seedType||farmCrops[crop]?.itemType;
  const count=(items,type)=>items.reduce((n,s)=>n+(s?.type===type&&!s.locked?s.qty:0),0);
  const stock=crop=>({bag:count(bag,seedType(crop)),farm:[8,9].reduce((n,i)=>n+count(storageChests[i]?.items||[],seedType(crop)),0)});
  function closeEnough(index){const b=getFarmBeds()[index];return scene==='bunker'&&b&&rectHit(player.x,player.y,75,b);}
  function plant(index,crop){
    if(!Number.isInteger(index)||!Number.isInteger(crop)||!farmCrops[crop]||!closeEnough(index)||farmState[index]?.crop!==null)return false;
    const type=seedType(crop),seed=bag.findIndex(s=>s?.type===type&&!s.locked&&s.qty>0);
    if(seed<0){message('В рюкзаке нет посадочного материала: '+ITEM[type].name+' × 1'+(stock(crop).farm?' · возьмите из ящика фермы':''));refresh();return false;}
    // One existing crop unit supplies planting material for one bed.
    if(!V011Farm.beginBed(index,crop))return false;
    if(--bag[seed].qty===0)bag[seed]=null;const now=Date.now();for(let i=0;i<50;i++)V011Farm.plantOne(index,i,now);
    queueGameSave();renderBag();closeOverlay(el('farmOverlay'));message('Посажено: '+farmCrops[crop].name);return true;
  }
  function harvest(index){
    V011Farm.settle();if(!closeEnough(index)||!V011Farm.ready(index))return 0;
    const st=farmState[index],type=farmCrops[st.crop].itemType;
    const plants=V011Farm.plants(st),total=plants.reduce((n,p)=>n+(p.planted&&!p.harvested?p.qty:0),0);
    const left=addItem(type,total),moved=total-left;let remaining=moved;
    for(const p of plants){if(!remaining)break;if(p.planted&&!p.harvested){const n=Math.min(remaining,p.qty);remaining-=n;if(n===p.qty)p.harvested=true;else p.qty-=n;}}
    if(!left)farmState[index]={crop:null,plantedAt:0};else st.harvestLeft=left;
    if(moved){V010.emit('harvested',{type,qty:moved});queueGameSave();renderBag();message('Собрано: '+ITEM[type].name+' × '+moved+(left?' · осталось '+left:''));}else message('В рюкзаке нет места');return moved;
  }
  function refresh(){for(const b of document.querySelectorAll('.farmCropBtn')){const n=Number(b.dataset.crop),available=stock(n);b.classList.toggle('selected',n===selected);b.classList.toggle('noPlantingMaterial',!available.bag);const badge=b.querySelector('small');if(badge)badge.textContent=available.bag?'В рюкзаке: '+available.bag:available.farm?'В ящике: '+available.farm:'Нет материала';b.setAttribute('aria-pressed',String(n===selected));}
    const crop=farmCrops[selected],available=stock(selected),info=el('farmPlantInfo');if(info)info.textContent=crop.name+' · '+farmTimeLabel(farmGrowMs(selected))+'\nДля грядки: '+ITEM[seedType(selected)].name+' × 1 · в рюкзаке '+available.bag;
    const p=el('farmPlantConfirm');if(p)p.disabled=farmState[window.activeFarmBed]?.crop!==null;
    const take=el('farmSeedTake');if(take){take.hidden=available.bag>0||available.farm===0;take.disabled=!available.farm;take.textContent='Взять '+ITEM[seedType(selected)].name.toLowerCase()+' × 1 из ящика';}
    const r=el('farmRecovery');if(r){r.hidden=!recovery.length;r.textContent='Забрать оставшийся урожай · '+recovery.reduce((n,s)=>n+s.qty,0);}}
  function use(index){if(!closeEnough(index))return;V011Farm.settle();const st=farmState[index];if(!st)return;
    if(st.crop!==null){if(V011Farm.ready(index))harvest(index);else{const wait=Math.max(...V011Farm.plants(st).filter(p=>p.planted&&!p.harvested).map(p=>p.duration-p.elapsed),0);message('До урожая '+farmTimeLabel(wait/(V011Farm.state.water>0&&devicePowered('irrigation014')?1:.35)));}return;}
    window.activeFarmBed=index;el('farmTitle').textContent='Грядка '+(index+1);refresh();openOverlay(el('farmOverlay'));
  }
  function recover(){for(const s of recovery)s.qty=addItem(s.type,s.qty);recovery=recovery.filter(s=>s.qty);refresh();renderBag();queueGameSave();if(recovery.length)message('Освободите место в рюкзаке');}
  function takeSeed(){
    if(!closeEnough(window.activeFarmBed))return false;
    const type=seedType(selected);
    for(const i of [8,9]){const items=storageChests[i]?.items;if(!items)continue;const j=items.findIndex(s=>s?.type===type&&!s.locked&&s.qty>0);if(j<0)continue;
      const s=items[j];if(addItem(type,1,{...s,qty:1})){message('Освободите ячейку в рюкзаке');return false;}
      if(--s.qty===0)items[j]=null;queueGameSave();renderBag();refresh();return true;
    }message('В ящиках фермы нет: '+ITEM[type].name);refresh();return false;
  }
  function bindMenu(){
    if(bound){refresh();return;}
    if(!plantingStock){const d=captureGameProgress();provideStock(d);recovery=d.farmRecovery0141;plantingStock=true;deliverRecovery();}
    const subtitle=el('farmOverlay').querySelector('.subtitle');if(subtitle)subtitle.textContent='Выберите культуру. На грядку нужен один посадочный материал из рюкзака.';
    const buttons=[...document.querySelectorAll('.farmCropBtn')];
    for(const b of buttons){const n=Number(b.dataset.crop),c=farmCrops[n];b.innerHTML=itemIconHTML(c.itemType)+'<span>'+c.name+'</span><small></small>';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selected=n;refresh();});}
    const grid=document.createElement('div');grid.className='farmPlantGrid';if(!buttons.length)return;buttons[0].before(grid);for(const b of buttons)grid.append(b);const end=grid;const info=document.createElement('p');info.id='farmPlantInfo';end.after(info);
    const take=v09Button('Взять из ящика',takeSeed);take.id='farmSeedTake';info.after(take);
    const confirm=v09Button('Посадить',()=>plant(window.activeFarmBed,selected));confirm.id='farmPlantConfirm';take.after(confirm);
    const r=v09Button('Забрать оставшийся урожай',recover);r.id='farmRecovery';confirm.after(r);bound=true;refresh();
  }
  useFarmBed=use;
  function validateRecovery(a){if(!Array.isArray(a)||a.length>32||a.some(s=>!s||!cropTypes.has(s.type)||!Number.isInteger(s.qty)||s.qty<1||s.qty>100))throw Error('Некорректный остаток урожая');}
  function provideStock(d){
    if(d.farmPlantingStock0141)return;
    const have=[...(d.bag||[]),...(d.storage||[]).flatMap(c=>c.items||[]),...(d.farmRecovery0141||[])];
    d.farmRecovery0141=d.farmRecovery0141||[];
    farmCrops.forEach((c,index)=>{if(!have.some(s=>s?.type===c.itemType)&&(d.farm||[]).every(s=>s.crop!==index))d.farmRecovery0141.push({type:c.itemType,qty:1});});
    d.farmPlantingStock0141=true;
  }
  function deliverRecovery(){for(const s of recovery)for(const i of [8,9])if(s.qty&&storageChests[i])s.qty=addToSlots(storageChests[i].items,s.type,s.qty,60);recovery=recovery.filter(s=>s.qty);}
  function migrate(d){
    if(d.tractor014){
      const cargo=d.tractor014.cargo||[];validateRecovery(cargo.filter(Boolean));
      d.farmRecovery0141=[...(d.farmRecovery0141||[]),...cargo.filter(Boolean).map(s=>({type:s.type,qty:s.qty}))];
      // Keep already planted plants. Unplanted cells from an interrupted job
      // become empty; they cannot permanently block ripening or irrigation.
      if(d.farm014?.beds)for(let i=0;i<d.farm014.beds.length;i++){const a=d.farm014.beds[i];if(!a)continue;for(const p of a)if(!p.planted)p.harvested=true;
        if(!a.some(p=>p.planted&&!p.harvested)){d.farm[i]={crop:null,plantedAt:0};d.farm014.beds[i]=null;if(d.farmV011)d.farmV011.grown[i]=0;}}
      delete d.tractor014;
    }
    // Remove the legacy token wherever it was stored, without touching others.
    function strip(value){if(!value||typeof value!=='object')return;for(const k of Object.keys(value)){if(value[k]?.type==='tractor014')value[k]=null;else strip(value[k]);}}
    strip(d);if(d.v09?.power?.deviceEnabled)delete d.v09.power.deviceEnabled.robot_tractor_charge;
    if(d.v010?.modules?.energy?.devicePriority)delete d.v010.modules.energy.devicePriority.robot_tractor_charge;
    provideStock(d);if(d.farmRecovery0141)validateRecovery(d.farmRecovery0141);return d;
  }
  GameSave.extend('capture','farm.manual',function(capture){const d=capture();d.farmRecovery0141=copy(recovery);d.farmPlantingStock0141=plantingStock;return d;});
  GameSave.extend('decode','farm.manual',function(decode,raw){return decode(JSON.stringify(migrate(JSON.parse(raw))));});
  GameSave.extend('restore','farm.manual',function(restore,data){const d=migrate(copy(data));restore(d);recovery=copy(d.farmRecovery0141||[]);plantingStock=true;deliverRecovery();});
  v09Style('#farmOverlay .panel{width:min(430px,94vw);max-height:80dvh}#farmOverlay .farmPlantGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}#farmOverlay .farmCropBtn{display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0!important;min-height:68px!important;font-size:11px!important;padding:6px!important}#farmOverlay .farmCropBtn .itemIcon{width:36px!important;height:36px!important}#farmOverlay .farmCropBtn.selected{border-color:#c7ae6d;background:#344c43}#farmPlantInfo{font-size:11px;color:#abc0b5;line-height:1.5;grid-column:1/-1;margin:8px 0}#farmPlantConfirm,#farmRecovery{grid-column:1/-1;font-size:12px;min-height:34px;padding:7px}');
  v09Style('#farmPlantInfo{white-space:pre-line}#farmOverlay .farmCropBtn small{font-size:10px;color:#aac5b2;line-height:1.3}#farmOverlay .farmCropBtn.noPlantingMaterial small{color:#c9b58c}#farmSeedTake{font-size:11px;min-height:34px;padding:6px 9px;margin:4px 0}#farmSeedTake[hidden]{display:none}');
  return {plant,harvest,use,bindMenu,migrate,recover,stock,seedType,takeSeed,get recovery(){return recovery;}};
})();

