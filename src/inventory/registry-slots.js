/* Shared, synchronous event and save registry. Gameplay modules are initialized before loading a slot. */
const V010=(()=>{
  const listeners=new Map(),modules={},recent=new Map();
  const api={modules,on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);return fn;},
    emit(name,data){for(const fn of listeners.get(name)||[])fn(data);},
    register(name,mod){modules[name]=mod;return mod;},
    log(text,kind='base'){text=String(text?.text??text).slice(0,300);const now=Date.now();if(now-(recent.get(text)||0)<2000)return;recent.set(text,now);if(recent.size>150)recent.delete(recent.keys().next().value);api.emit('log',{text,kind,at:now});}
  };window.V010=api;return api;
})();

/* 0.10 — stable item positions, touch dragging and deliberate storage actions. */
window.V010Inventory=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const selectedUid={};
  let preset={ammo:90,ammo556:90,meds:2,water:5},drag=null,suppressClick=0,batchDepth=0;
  const stackMax=type=>(ITEM[type]?.deployable||ITEM[type]?.robot||ITEM[type]?.equip||ITEM[type]?.hand)?1:['ammo','ammo556'].includes(type)?600:type==='fish'?20:STACK_MAX;
  const list=where=>where==='bag'?bag:where==='quick'?window.V013Inventory?.items:where==='drone'?window.V014Robots?.state.cargo:where==='upgrade'?window.V0161Upgrade?.slots:Number.isInteger(where)&&storageChests[where]?storageChests[where].items:null;
  const capacity=where=>where==='bag'?BAG_SLOTS:where==='quick'?5:where==='drone'?V014Robots.capacity():where==='upgrade'?1:60;
  const occupied=slots=>slots.filter(Boolean).length;
  const signature=s=>JSON.stringify(Object.keys(s).filter(k=>k!=='qty'&&k!=='locked'&&k!=='fishGrams'&&k!=='fishEntries').sort().map(k=>[k,s[k]]));
  const matches=(a,b)=>a&&b&&a.type===b.type&&stackMax(a.type)>1&&signature(a)===signature(b);
  function notifyChange(){
    if(batchDepth)return;
    window.V013Inventory?.sync();window.V0161Upgrade?.refresh();window.V0161UI?.refreshQuick();window.V0141DroneUI?.refresh();
    renderBag();if(activeStorage!==null)renderStorage();updateAmmoHud();
    window.V010Combat?.refreshStats?.();queueGameSave();
  }
  function insert(slots,item,max,allowLocked=false){
    if(!item||!ITEM[item.type]||!Number.isInteger(item.qty)||item.qty<1)return item?.qty||0;
    if(item.type==='fish')window.V014Fish?.normalize(item);
    let left=item.qty;
    for(let i=0;i<Math.min(slots.length,max);i++){
      const s=slots[i];if(!s||(!allowLocked&&s.locked)||!matches(s,item))continue;
      const n=Math.min(left,stackMax(item.type)-s.qty);if(n>0){if(item.type==='fish')V014Fish.append(s,item,n,item.qty-left);s.qty+=n;left-=n;}if(!left)return 0;
    }
    for(let i=0;i<max&&left>0;i++)if(!slots[i]){const n=Math.min(left,stackMax(item.type));slots[i]=item.type==='fish'?V014Fish.portion(item,n,item.qty-left):{...copy(item),qty:n};left-=n;}
    return left;
  }
  addToSlots=function(slots,type,qty,max=60,metadata){const item={...(metadata?copy(metadata):{}),type,qty};if(type==='fish'&&metadata?.fishEntries){item.fishEntries=copy(metadata.fishEntries.slice(0,qty));item.fishGrams=item.fishEntries.reduce((n,f)=>n+f.grams,0);}return insert(slots,item,max);};
  addItem=function(type,qty,metadata){return addToSlots(bag,type,qty,BAG_SLOTS,metadata);};
  removeFromSlots=function(slots,type,qty){let left=qty;for(let i=slots.length-1;i>=0&&left>0;i--){const s=slots[i];if(s?.type!==type)continue;const n=Math.min(s.qty,left);if(s.type==='fish')V014Fish.remove(s,n);left-=n;s.qty-=n;if(!s.qty)slots[i]=null;}return qty-left;};
  removeItem=(type,qty)=>removeFromSlots(bag,type,qty);
  bagUsed=()=>occupied(bag);
  bagCount=type=>bag.reduce((n,s)=>n+(s?.type===type?s.qty:0),0);
  freeItemSpace=function(slots,type,max){let n=0;for(let i=0;i<max;i++){const s=slots[i];if(!s)n+=stackMax(type);else if(!s.locked&&matches(s,{type,qty:1}))n+=Math.max(0,stackMax(type)-s.qty);}return n;};
  function selectedItem(type){const quick=window.V013Inventory?.items.find(s=>s?.type===type);if(quick)return quick;return bag.find(s=>s?.type===type&&s.uid===selectedUid[type])||bag.find(s=>s?.type===type)||null;}
  function selectUid(type,uid){if(typeof uid==='string')selectedUid[type]=uid;}
  function transfer(from,index,to,amount){
    const a=list(from),b=list(to),s=a?.[index];if(!s||!b||a===b||s.locked)return 0;
    if(window.V0161UI&&!V0161UI.allowMove(from,index,to))return 0;
    const wanted=Math.max(0,Math.min(s.qty,Math.floor(amount??s.qty)));
    if(!wanted)return 0;
    const moved=wanted-insert(b,s.type==='fish'?V014Fish.portion(s,wanted):{...copy(s),qty:wanted},capacity(to));
    if(moved){if(s.type==='fish')V014Fish.remove(s,moved);s.qty-=moved;if(!s.qty)a[index]=null;notifyChange();}return moved;
  }
  function move(from,index,to,targetIndex,amount){
    const a=list(from),b=list(to),s=a?.[index];
    if(!s||!b||!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=capacity(to))return false;
    if(a===b&&index===targetIndex)return true;
    if(window.V0161UI&&!V0161UI.allowMove(from,index,to,targetIndex))return false;
    const target=b[targetIndex];if(target?.locked)return false;
    const wanted=Math.max(0,Math.min(s.qty,Math.floor(amount??s.qty)));if(!wanted)return false;
    if(target&&!matches(s,target)){if(amount!==undefined||!window.V0161UI?.allowMove(to,targetIndex,from,index))return false;a[index]=target;b[targetIndex]=s;notifyChange();return true;}
    const n=Math.min(wanted,stackMax(s.type)-(target?.qty||0));if(n<=0)return false;
    if(target){if(s.type==='fish')V014Fish.append(target,s,n);target.qty+=n;}else b[targetIndex]=s.type==='fish'?V014Fish.portion(s,n):{...copy(s),qty:n};if(s.type==='fish')V014Fish.remove(s,n);
    s.qty-=n;if(!s.qty)a[index]=null;notifyChange();return true;
  }
  function split(where,index,n){
    const a=list(where),s=a?.[index];if(!s||s.locked||!Number.isInteger(n)||n<1||n>=s.qty)return false;
    for(let i=0;i<capacity(where);i++)if(!a[i])return move(where,index,where,i,n);return false;
  }
  function sort(where){
    const a=list(where);if(!a)return false;
    const loose=a.filter(s=>s&&!s.locked).map(copy).sort((a,b)=>(ITEM[a.type].name.localeCompare(ITEM[b.type].name,'ru')||signature(a).localeCompare(signature(b))));
    const result=Array.from({length:capacity(where)},(_,i)=>a[i]?.locked?copy(a[i]):null);
    for(const s of loose)if(insert(result,s,capacity(where)))return false;
    a.splice(0,a.length,...result);notifyChange();return true;
  }
  function equip(index,target){
    const s=bag[index],def=s&&ITEM[s.type];if(!def?.equip||target&&def.equip!==target)return false;
    const slot=def.equip,next=copy(bag),newCapacity=slot==='backpack'?def.capacity:BAG_SLOTS;
    const wearing={...copy(s),qty:1};delete wearing.locked;
    next[index].qty--;if(!next[index].qty)next[index]=null;
    // A smaller bag retains all positions that still exist; overflow moves only into free capacity.
    const overflow=next.slice(newCapacity).filter(Boolean);next.length=Math.min(next.length,newCapacity);
    for(const item of overflow)if(insert(next,item,newCapacity)>0){message('Освободите место перед сменой рюкзака');return false;}
    if(equipment[slot]&&insert(next,{...copy(equipment[slot]),qty:1},newCapacity)>0){message('Нет места для снятой экипировки');return false;}
    bag=next;equipment[slot]=wearing;BAG_SLOTS=newCapacity;notifyChange();message('Надето: '+def.name);return true;
  }
  equipFromBag=index=>equip(index);
  function unequip(slot){
    const item=equipment[slot];if(!item)return false;
    if(slot==='backpack'){message('Выберите другой рюкзак для замены');return false;}
    const next=copy(bag);if(insert(next,{...copy(item),qty:1},BAG_SLOTS)>0){message('Освободите место в рюкзаке');return false;}
    bag=next;equipment[slot]=null;notifyChange();return true;
  }
  v091Unequip=unequip;
  if(window.V091Equipment)V091Equipment.unequip=unequip;
  const oldEquipRender=renderEquipment;
  renderEquipment=function(){oldEquipRender();el('bagCapacityText').textContent='Рюкзак · '+occupied(bag)+' / '+BAG_SLOTS;
    el('equipmentSlots').querySelectorAll('[data-equip-slot]').forEach(row=>{
      row.addEventListener('click',e=>{if(performance.now()<suppressClick){e.preventDefault();e.stopImmediatePropagation?.();}},true);
      const key=row.dataset.equipSlot;row.oncontextmenu=e=>{e.preventDefault();details('equipment',key);};
      row.addEventListener('pointerdown',e=>startPointer(e,'equipment',key,row));
    });
  };
  function slotContent(s){
    if(!s)return '';
    const quick=handSlots.indexOf(s.type);
    return `<div class="ico">${itemIconHTML(s.type)}</div><span class="qty">${s.qty}</span>${quick>=0?'<span class="v010QuickMark">'+(quick+1)+'</span>':''}${s.locked?'<span class="v010LockMark">⌑</span>':''}${s.level?'<span class="v010Level">+'+Number(s.level)+'</span>':''}`;
  }
  slotHTML=slotContent;
  function cell(where,i,s){
    const d=document.createElement('button');d.type='button';d.className='invSlot v010Slot'+(s?' hasItem':'')+(s&&handSlots.includes(s.type)?' quickAssigned':'')+(s?.locked?' locked':'');
    d.dataset.v010Container=where;d.dataset.v010Index=i;
    d.innerHTML=slotContent(s);d.title=s?ITEM[s.type].name+' · '+s.qty:'Пустая ячейка';d.setAttribute('aria-label',d.title);
    d.onclick=e=>{e.stopPropagation();if(performance.now()<suppressClick)return;tap(where,i);};
    d.oncontextmenu=e=>{e.preventDefault();details(where,i);};
    d.addEventListener('pointerdown',e=>startPointer(e,where,i,d));return d;
  }
  function renderGrid(id,where){const g=el(id),a=list(where);if(!g||!a)return;g.replaceChildren();for(let i=0;i<capacity(where);i++)g.append(cell(where,i,a[i]));}
  renderBag=function(){renderEquipment();renderQuickSlots();renderGrid('inventoryGrid','bag');};
  renderStorage=function(){renderQuickSlots();updateAmmoHud();const ch=storageChests[activeStorage];if(!ch)return;el('storageTitle').textContent=ch.icon+' '+ch.name;renderGrid('storageContents',activeStorage);renderGrid('storageBag','bag');};
  function tap(where,i){
    const s=list(where)?.[i];if(!s)return;
    if(['quick','drone','upgrade'].includes(where)){details(where,i);return;}
    if(where==='bag'&&el('inventoryOverlay').classList.contains('open')){
      if(ITEM[s.type].equip||ITEM[s.type].hand){details(where,i);return;}
      details(where,i);return;
    }
    const moved=transfer(where,i,where==='bag'?activeStorage:'bag');if(!moved)message(s.locked?'Предмет закреплён':'Нет места для предмета');
  }
  function button(text,fn,title){const b=document.createElement('button');b.type='button';b.className='v010SmallAction';b.textContent=text;b.onclick=fn;if(title){b.title=title;b.setAttribute('aria-label',title);}return b;}
  function toolbar(id,where,storage=false){
    const target=el(id);if(!target)return;
    const bar=document.createElement('div');bar.className='v010InvToolbar';bar.dataset.forGrid=id;
    bar.append(button('⇅',()=>sort(typeof where==='function'?where():where),'Сортировать'));
    if(storage){bar.append(button('⇩',()=>bulk('take'),'Забрать всё'),button('⇧',()=>bulk('matching'),'Пополнить ящик совпадающими ресурсами'));}
    else if(id==='inventoryGrid'){bar.append(button('✓',()=>refill(),'Пополнить комплект для вылазки'),button('⚙',()=>showPreset(),'Настроить комплект для вылазки'));}
    target.before(bar);
  }
  function bulk(mode){
    const ch=storageChests[activeStorage];if(!ch)return 0;
    const types=new Set(ch.items.filter(Boolean).map(s=>s.type));let n=0;batchDepth++;
    if(mode==='take'){for(let i=0;i<ch.items.length;i++)n+=transfer(activeStorage,i,'bag');}
    else for(let i=0;i<bag.length;i++)if(types.has(bag[i]?.type))n+=transfer('bag',i,activeStorage);
    batchDepth--;notifyChange();message(n?'Переложено: '+n:'Нет подходящих предметов или свободного места');return n;
  }
  function sources(){return [bag,...(scene==='bunker'?storageChests.map(c=>c.items):[])];}
  function materialCount(type){return sources().reduce((total,a)=>total+a.reduce((n,s)=>n+(s?.type===type&&!s.locked?s.qty:0),0),0);}
  function consumeMaterials(input,batches=1){
    if(!Number.isInteger(batches)||batches<1||!Object.entries(input).every(([type,n])=>ITEM[type]&&Number.isFinite(n)&&n>=0&&Number.isInteger(n*batches)&&materialCount(type)>=n*batches))return false;
    const actual=sources(),draft=actual.map(copy);
    for(const [type,n] of Object.entries(input)){let left=n*batches;for(const a of draft)for(let i=0;i<a.length&&left;i++){const s=a[i];if(s?.type!==type||s.locked)continue;const used=Math.min(left,s.qty);if(s.type==='fish')V014Fish.remove(s,used);left-=used;s.qty-=used;if(!s.qty)a[i]=null;}}
    actual.forEach((a,i)=>a.splice(0,a.length,...draft[i]));return true;
  }
  function putMaterials(input,batches=1,atomic=false){
    const actual=sources(),draft=actual.map(copy),leftovers={};
    for(const [type,n] of Object.entries(input)){let left=n*batches;if(!Number.isInteger(left)||left<0||!ITEM[type]){if(atomic)return false;leftovers[type]=left;continue;}for(let i=0;i<draft.length&&left;i++)left=insert(draft[i],{type,qty:left},i===0?BAG_SLOTS:60);if(left)leftovers[type]=left;}
    if(atomic&&Object.keys(leftovers).length)return false;
    actual.forEach((a,i)=>a.splice(0,a.length,...draft[i]));return atomic?true:leftovers;
  }
  function refill(){
    if(scene!=='bunker'){message('Пополнение комплекта доступно на базе, рядом с хранилищами');return 0;}
    let total=0;batchDepth++;
    for(const [type,wanted] of Object.entries(preset)){let left=Math.max(0,wanted-bagCount(type));for(let c=0;c<storageChests.length&&left;c++){const a=storageChests[c].items;for(let i=0;i<a.length&&left;i++)if(a[i]?.type===type){const n=transfer(c,i,'bag',left);left-=n;total+=n;}}}
    batchDepth--;notifyChange();message(total?'Комплект пополнен: '+total+' предметов':'Нет недостающих запасов или свободного места');return total;
  }
  function showPreset(){
    const o=v09Overlay('v010Preset','Комплект для вылазки'),body=o.querySelector('.v09Body');body.replaceChildren();
    const desc=document.createElement('p');desc.textContent='На базе пополняются только недостающие запасы. Закреплённые предметы из ящиков остаются на месте.';body.append(desc);
    const inputs={};for(const type of ['ammo','ammo556','meds','water','food','fuel']){
      const row=document.createElement('label');row.className='v010PresetRow';const text=document.createElement('span');text.textContent=ITEM[type].name;
      const input=document.createElement('input');input.type='number';input.min='0';input.max='500';input.value=preset[type]||0;inputs[type]=input;row.append(text,input);body.append(row);
    }
    body.append(v09Button('Сохранить комплект',()=>{preset={};for(const [type,input] of Object.entries(inputs))preset[type]=Math.max(0,Math.min(500,Math.floor(Number(input.value)||0)));queueGameSave();closeOverlay(o);}));openOverlay(o);
  }
  function details(where,index){
    if(window.V011UI)return V011UI.details(where,index);
    const s=where==='equipment'?equipment[index]:list(where)?.[index];if(!s)return;
    const def=ITEM[s.type],o=v09Overlay('v010ItemDetails',def.name),body=o.querySelector('.v09Body');body.replaceChildren();
    const art=document.createElement('div');art.className='v010DetailArt';art.innerHTML=itemIconHTML(s.type);body.append(art);
    const text=document.createElement('p');text.textContent='Количество: '+(s.qty||1)+(s.level?' · Улучшение +'+s.level:'');body.append(text);
    const purpose=document.createElement('p');purpose.textContent=def.description||(def.equip?'Экипировка для слота «'+EQUIP_LABELS[def.equip]+'».':def.hand?'Можно назначить в быстрый слот.':({iron_ore:'Переплавляется в железо в печи.',copper_ore:'Переплавляется в медь в печи.',iron:'Используется для изготовления оружия, патронов и улучшений.',copper:'Металл для производства и электрического оборудования.',ammo:'Боеприпасы для АК-74.',ammo556:'Боеприпасы для M4.',fuel:'Топливо для генератора.',meds:'Медицинские припасы.',water:'Вода для хозяйства и вылазок.',animal_feed:'Корм для животных.'}[s.type]||'Ресурс для производства или развития базы.'));body.append(purpose);
    const equipped=def.equip?equipment[def.equip]:def.hand?selectedItem(heldItem()):null;
    const current=window.V010Combat?.getItemStats?.(s),old=equipped&&window.V010Combat?.getItemStats?.(equipped);
    const fallback={armor:def.armor,capacity:def.capacity};const stats=current||fallback;
    const names={armor:'Защита',hp:'HP',health:'HP',maxHealth:'Макс. HP',speed:'Скорость',damage:'Урон',spread:'Разброс',accuracy:'Точность',magazine:'Магазин',capacity:'Мест',mag:'Магазин',reloadMs:'Перезарядка',recoil:'Отдача',delay:'Интервал выстрела'};
    const formatStat=(key,n)=>['speed','accuracy'].includes(key)?Math.round(n*100)+'%':['spread','recoil'].includes(key)?(n*180/Math.PI).toFixed(2)+'°':key==='reloadMs'?(n/1000).toFixed(1)+' с':(Math.round(n*100)/100)+(key==='armor'?'%':'');
    if(stats){const box=document.createElement('div');box.className='v010ItemStats';for(const [key,value] of Object.entries(stats)){if(!names[key]||!Number.isFinite(value))continue;const row=document.createElement('div'),baseline=old?.[key]??(equipped&&ITEM[equipped.type]?.[key]);row.textContent=names[key]+': '+formatStat(key,value)+(Number.isFinite(baseline)&&equipped!==s?' · надето '+formatStat(key,baseline):'');box.append(row);}body.append(box);}
    const actions=document.createElement('div');actions.className='v010DetailActions';
    if(where==='equipment')actions.append(button('Снять',()=>{if(unequip(index))closeOverlay(o);}));
    else{
      actions.append(button(s.locked?'Открепить':'Закрепить',()=>{s.locked=!s.locked;notifyChange();details(where,index);}));
      if(where==='bag'&&def.equip)actions.append(button('Надеть',()=>{if(equip(index))closeOverlay(o);}));
      if(where==='bag'&&def.hand)actions.append(button('Быстрый слот',()=>{window.V010Combat?.ensure?.(s);selectUid(s.type,s.uid);closeOverlay(o);openHandAssignment(s.type);}));
      if(activeStorage!==null&&el('storageOverlay').classList.contains('open'))actions.append(button(where==='bag'?'В ящик':'В рюкзак',()=>{transfer(where,index,where==='bag'?activeStorage:'bag');closeOverlay(o);}));
      if(s.qty>1){const input=document.createElement('input');input.type='number';input.min='1';input.max=s.qty-1;input.value=Math.floor(s.qty/2);input.setAttribute('aria-label','Количество для разделения');actions.append(input,button('Разделить',()=>{if(split(where,index,Math.floor(Number(input.value))))closeOverlay(o);else message('Для разделения нужна пустая ячейка');}));}
      actions.append(button('Уничтожить',()=>{if(confirm('Уничтожить «'+def.name+'»'+(s.level?' +'+s.level:'')+'? Предмет будет потерян.')){list(where)[index]=null;notifyChange();closeOverlay(o);}}));
    }
    body.append(actions);openOverlay(o);
  }
  function startPointer(e,where,index,node){
    if(e.button!==undefined&&e.button!==0)return;
    const item=where==='equipment'?equipment[index]:list(where)?.[index];if(!item&&(where==='quick'||e.pointerType!=='touch'))return;
    if(drag){clearTimeout(drag.holdTimer);drag.node.classList.remove('v011DragArmed');}
    e.stopPropagation();drag={where,index,node,item,x:e.clientX,y:e.clientY,id:e.pointerId,start:performance.now(),active:false,ghost:null,target:null,touch:e.pointerType==='touch',scrolling:false,armed:false};
    const current=drag;
    if(current.touch&&item)current.holdTimer=setTimeout(()=>{if(drag===current&&!current.scrolling){current.armed=true;current.node.classList.add('v011DragArmed');}},380);
    if(!current.touch)try{node.setPointerCapture(e.pointerId);}catch(_){}
  }
  function targetAt(x,y){const target=document.elementFromPoint?.(x,y);return target?.closest?.('[data-v010-container],[data-equip-slot],[data-body-part]')||null;}
  function pointerMove(e){
    if(!drag||drag.id!==e.pointerId)return;
    const d=drag,dist=Math.hypot(e.clientX-d.x,e.clientY-d.y);
    if(d.touch&&!d.active){
      if(dist<7)return;
      if(d.scrolling||!d.item||!d.armed){
        d.scrolling=true;clearTimeout(d.holdTimer);d.node.classList.remove('v011DragArmed');
        suppressClick=performance.now()+500;return;
      }
    }
    if(!d.active&&dist<7)return;
    if(!d.active){d.active=true;d.ghost=document.createElement('div');d.ghost.className='v010DragGhost';d.ghost.innerHTML=itemIconHTML(d.item.type);document.body.append(d.ghost);d.node.classList.add('dragging');}
    e.preventDefault();d.ghost.style.left=(e.clientX-27)+'px';d.ghost.style.top=(e.clientY-27)+'px';
    d.target?.classList.remove('v010DropTarget');d.target=targetAt(e.clientX,e.clientY);d.target?.classList.add('v010DropTarget');
    // Scroll only the panel under the pointer; this permits moving to the end of a large chest.
    const hovered=document.elementFromPoint?.(e.clientX,e.clientY),panel=hovered?.closest?.('.panel');
    if(panel){const r=panel.getBoundingClientRect();if(e.clientY<r.top+55)panel.scrollTop-=18;else if(e.clientY>r.bottom-55)panel.scrollTop+=18;}
  }
  function pointerEnd(e,cancelled=false){
    if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearTimeout(d.holdTimer);d.ghost?.remove();d.target?.classList.remove('v010DropTarget');d.node.classList.remove('dragging','v011DragArmed');
    try{d.node.releasePointerCapture(e.pointerId);}catch(_){}
    if(cancelled||d.scrolling||!d.item){suppressClick=performance.now()+400;return;}
    if(!d.active){if(d.armed||performance.now()-d.start>450){suppressClick=performance.now()+400;details(d.where,d.index);}return;}
    suppressClick=performance.now()+400;e.preventDefault();
    const target=targetAt(e.clientX,e.clientY)||d.target;if(!target)return;
    const eq=target.dataset.equipSlot||target.dataset.bodyPart;
    if(eq){if(d.where==='bag')equip(d.index,eq);return;}
    const container=target.dataset.v010Container,where=['bag','quick','drone','upgrade'].includes(container)?container:Number(container),index=Number(target.dataset.v010Index);
    if(d.where==='equipment'){
      if(where==='upgrade'){window.V0161Upgrade?.depositEquipment(d.index);return;}
      if(where!=='bag'||d.index==='backpack'||bag[index])return;
      bag[index]={...copy(d.item),qty:1};equipment[d.index]=null;notifyChange();return;
    }
    if(!move(d.where,d.index,where,index))message(d.item.locked?'Сначала открепите предмет':'Выберите пустую ячейку или такую же стопку');
  }
  // Cancel native touch panning only after an intentional hold. All ordinary
  // touch swipes stay passive and keep browser inertia, even when begun on an icon.
  document.addEventListener('touchmove',e=>{
    if(!drag?.touch||drag.scrolling||!drag.armed||!drag.item||e.touches.length!==1)return;
    const t=e.touches[0];if(Math.hypot(t.clientX-drag.x,t.clientY-drag.y)<7&&!drag.active)return;
    e.preventDefault();pointerMove({pointerId:drag.id,clientX:t.clientX,clientY:t.clientY,preventDefault(){}});
  },{passive:false,capture:true});
  document.addEventListener('pointermove',pointerMove,{passive:false});document.addEventListener('pointerup',e=>pointerEnd(e));document.addEventListener('pointercancel',e=>pointerEnd(e,true));
  toolbar('inventoryGrid','bag');toolbar('storageContents',()=>activeStorage,true);toolbar('storageBag','bag');
  el('storageSettings').textContent='⚙';el('storageSettings').title='Название и значок ящика';el('storageSettings').setAttribute('aria-label','Настроить ящик');
  v09Style(`
    .v010Slot{min-height:57px!important;height:57px!important;padding:3px!important;touch-action:none;background:#162428;border:1px solid #415454;color:#e5ece8;cursor:pointer;position:relative;border-radius:8px}
    .v010Slot .ico{height:47px!important;display:flex;align-items:center;justify-content:center}.v010Slot .ico .itemIcon{width:46px!important;height:46px!important;object-fit:contain}
    .v010Slot .qty{position:absolute;right:5px;bottom:3px;font-size:11px!important;font-weight:400;line-height:13px;text-shadow:0 1px 3px #000,0 0 5px #000;margin:0}
    .v010Slot.quickAssigned{border-color:#d4b96c;box-shadow:inset 0 0 0 1px #d4b96c42}.v010QuickMark{position:absolute;left:5px;top:2px;font-size:10px;color:#ead6a4}.v010LockMark{position:absolute;right:5px;top:2px;font-size:11px;color:#adcfca}.v010Level{position:absolute;bottom:3px;left:4px;font-size:9px;color:#bfdda9}
    .v010Slot.locked{background:#213438}.v010Slot.dragging{opacity:.3}.v010DropTarget{outline:2px solid #e4c67d!important;outline-offset:-2px}.v010DragGhost{position:fixed;pointer-events:none;z-index:50000;width:54px;height:54px;border:1px solid #e6c479;border-radius:9px;background:#1d3037e8;box-shadow:0 5px 20px #0008}.v010DragGhost .itemIcon{width:52px;height:52px}
    .v010InvToolbar{display:flex;justify-content:flex-end;gap:5px;margin:3px 0 -5px}.v010SmallAction{min-width:32px;min-height:32px;margin:0;padding:4px 9px;border:1px solid #56706a;border-radius:7px;background:#25383a;color:#dce9e2;font:inherit;font-size:12px;cursor:pointer}.v010InvToolbar .v010SmallAction{font-size:18px}
    .v010DetailArt{text-align:center}.v010DetailArt .itemIcon{width:110px;height:110px}.v010DetailActions{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.v010DetailActions input{width:65px;background:#15242a;color:#e7eee8;border:1px solid #607572;border-radius:6px;padding:6px}.v010ItemStats{padding:10px;background:#132327;border-radius:8px;line-height:1.8}.v010PresetRow{display:flex;justify-content:space-between;gap:15px;align-items:center;margin:10px 0}.v010PresetRow input{width:80px;padding:6px;background:#15262d;color:#e3eee8;border:1px solid #5e7778;border-radius:6px}
    #v010ItemDetails,#v010Preset{z-index:13000}.equipSlot{touch-action:none}#storageSettings{min-width:32px;min-height:32px;padding:3px 9px}.inventoryGrid{grid-template-columns:repeat(6,minmax(0,1fr))!important}
    @media(max-width:400px){.v010Slot{height:49px!important;min-height:49px!important}.v010Slot .ico{height:40px!important}.v010Slot .ico .itemIcon{width:39px!important;height:39px!important}}
  `);
  function validate(data){return !!data&&data.schema===1&&data.preset&&Object.entries(data.preset).every(([t,n])=>ITEM[t]&&Number.isInteger(n)&&n>=0&&n<=500)&&(!data.selectedUid||Object.entries(data.selectedUid).every(([t,id])=>ITEM[t]&&typeof id==='string'&&id.length<120));}
  function capture(){return {schema:1,preset:copy(preset),selectedUid:copy(selectedUid)};}
  function restore(data){preset={ammo:90,ammo556:90,meds:2,water:5};for(const key of Object.keys(selectedUid))delete selectedUid[key];if(data&&validate(data)){preset=copy(data.preset);Object.assign(selectedUid,data.selectedUid||{});}drag=null;}
  const api={cell,startPointer,list,capacity,clickSuppressed:()=>performance.now()<suppressClick,capture,restore,validate,openExternalChest:cache=>{if(!cache||!Array.isArray(cache.items)||cache.items.length>60)return false;storageChests[-1]=cache;openStorage(-1);return true;},move,transfer,split,sort,equip,unequip,selectedItem,selectUid,materialCount,consumeMaterials,putMaterials:(input,batches=1)=>putMaterials(input,batches),putMaterialsAtomic:(input,batches=1)=>putMaterials(input,batches,true),insertItem:item=>insert(bag,item,BAG_SLOTS),render:notifyChange,details,bulk,refill,setPreset:p=>{if(validate({schema:1,preset:p})){preset=copy(p);queueGameSave();return true;}return false;}};
  if(window.V010)V010.modules.inventory=api;return api;
})();

