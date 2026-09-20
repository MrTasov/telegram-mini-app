window.V013Inventory=(()=>{
  const items=Array(5).fill(null),copy=x=>JSON.parse(JSON.stringify(x));
  const baseCount=bagCount;bagCount=t=>baseCount(t)+(ITEM[t]?.hand?items.filter(s=>s?.type===t).reduce((n,s)=>n+s.qty,0):0);
  function sync(){handSlots=items.map(s=>s?.type||null);if(!items[activeHandSlot])activeHandSlot=null;V010Combat.syncAmmo();renderQuickSlots();updateAmmoHud();queueGameSave();}
  assignHandSlot=function(i){
    if(i<0||i>4||!HAND_TYPES.includes(assigningHandType))return false;
    const type=assigningHandType,old=items.findIndex(s=>s?.type===type);
    if(old>=0){[items[old],items[i]]=[items[i],items[old]];}else{
      const item=V010Inventory.selectedItem(type),index=bag.indexOf(item);if(index<0)return false;
      const previous=items[i];items[i]=item;bag[index]=previous||null;
    }
    activeHandSlot=i;closeOverlay(el('handAssignOverlay'));sync();selectHandSlot(i);renderBag();return true;
  };
  function returnItem(i){const item=items[i];if(!item)return false;if(V010Inventory.insertItem(item)){message('Нет места в рюкзаке');return false;}items[i]=null;sync();renderBag();return true;}
  const oldAssign=openHandAssignment;openHandAssignment=function(type){oldAssign(type);const i=items.findIndex(s=>s?.type===type);if(i>=0)el('handAssignChoices').append(v09Button('Убрать в рюкзак',()=>{if(returnItem(i))closeOverlay(el('handAssignOverlay'));}));};
  const oldRender=renderQuickSlots;renderQuickSlots=function(){oldRender();for(const id of ['hotbar','quickSlots'])for(const [i,b]of [...el(id).children].entries()){b.oncontextmenu=e=>{e.preventDefault();if(items[i])openHandAssignment(items[i].type);};}};
  const tools=el('inventoryGrid').previousElementSibling||el('inventoryGrid').parentNode;
  const manage=v09Button('Быстрые слоты',()=>{const o=v09Overlay('v013Hands','Быстрые слоты'),body=o.querySelector('.v09Body');body.replaceChildren();items.forEach((s,i)=>{const b=v09Button((i+1)+' · '+(s?ITEM[s.type].name:'Пусто'),()=>window.V0162Quick?V0162Quick.open(i):s&&openHandAssignment(s.type));body.append(b);});openOverlay(o);});tools.append(manage);
  ITEM.cooked_fish={name:'Жареная рыба',icon:'🍽️',description:'Порция из 0,5 кг рыбы.'};V092_ICONS.cooked_fish=V011Art.sources.fish;
  let reserve=0;
  function fishWeight(){return reserve+bag.reduce((n,s)=>n+(s?.type==='fish'?V014Fish.weight(s):0),0);}
  function cook(count,index=null){
    if(scene!=='bunker'){message('Приготовление доступно на базе');return false;}
    const selected=Number.isInteger(index)?bag[index]:null;if(Number.isInteger(index)&&selected?.type!=='fish')return false;
    const available=selected?(selected.locked?0:selected.qty):bag.reduce((n,s)=>n+(s?.type==='fish'&&!s.locked?s.qty:0),0);
    count=count===undefined?available:Math.floor(Number(count));if(!Number.isInteger(count)||count<1||count>available){message('Выберите количество доступной рыбы');return false;}
    const draft=copy(bag),taken=[];let left=count;
    for(let i=0;i<draft.length&&left;i++){const s=draft[i];if(s?.type!=='fish'||s.locked||selected&&i!==index)continue;const n=Math.min(left,s.qty);taken.push(...V014Fish.remove(s,n));s.qty-=n;left-=n;if(!s.qty)draft[i]=null;}
    const grams=reserve+taken.reduce((sum,f)=>sum+f.grams,0),portions=Math.floor(grams/500),remainder=grams%500;
    const original=bag;bag=draft;
    if(portions&&addItem('cooked_fish',portions)){bag=original;message('Нет места для готовой рыбы');return false;}
    reserve=remainder;renderBag();queueGameSave();message('Приготовлено порций: '+portions+(reserve?' · остаток '+reserve+' г':''));return true;
  }
  function equip(type){let i=items.findIndex(s=>s?.type===type);if(i<0){if(!bag.some(s=>s?.type===type)){message('Нужен предмет: '+ITEM[type]?.name);return false;}i=items.findIndex(s=>!s);if(i<0)i=Number.isInteger(activeHandSlot)?activeHandSlot:0;assigningHandType=type;assignHandSlot(i);}else selectHandSlot(i);return true;}
  const details=V011UI.details;V011UI.details=function(where,i){details(where,i);const s=where==='bag'?bag[i]:Number.isInteger(where)?storageChests[where]?.items[i]:null;if(s?.type==='fish'){
    const body=el('v010ItemDetails').querySelector('.v09Body'),panel=document.createElement('div');panel.className='v014FishCook';
    const info=document.createElement('p');I18n.assign(info,"textContent",s.qty+' рыб · '+I18n.numeric(V014Fish.weight(s)/1000,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' кг');panel.append(info);
    if(where==='bag'){
      const label=document.createElement('label');I18n.assign(label,"textContent",'Приготовить рыб: ');
      const input=document.createElement('input');input.type='number';input.min='1';input.max=String(s.qty);input.step='1';input.value='1';I18n.setAttr(input,'aria-label','Количество рыб для приготовления');input.id='v014FishCount';label.append(input);panel.append(label);
      const preview=document.createElement('small');
      const count=()=>Math.max(1,Math.min(s.qty,Math.floor(Number(input.value)||1)));
      function refresh(){const n=count(),grams=V014Fish.portion(s,n).fishGrams+reserve;I18n.assign(preview,"textContent",n+' рыб → '+Math.floor(grams/500)+' порций'+(grams%500?' · остаток '+(grams%500)+' г':''));}
      input.addEventListener('input',refresh);refresh();panel.append(preview);
      const make=v09Button('Приготовить',()=>{if(bag[i]!==s){message('Рыба перемещена — выберите её снова');closeOverlay(el('v010ItemDetails'));return;}if(cook(count(),i))closeOverlay(el('v010ItemDetails'));});make.disabled=!!s.locked||scene!=='bunker';panel.append(make);
      if(scene!=='bunker'){const note=document.createElement('small');I18n.assign(note,"textContent",'Приготовление доступно на базе');panel.append(note);}
    }body.append(panel);
  }};
  GameSave.extend('capture','inventory.physical-slots',function(cap){const d=cap();d.quick013={schema:1,items:copy(items),fishReserve:reserve};return d;});
  GameSave.extend('decode','inventory.physical-slots',function(decode,raw){const d=JSON.parse(raw);V014Fish.validateSave(d);if(d.handSlots?.length===4)d.handSlots.push(null);const q=d.quick013;if(q){if(q.schema!==1||!Array.isArray(q.items)||q.items.length!==5||!q.items.every(s=>s===null||s&&HAND_TYPES.includes(s.type)&&s.qty===1&&V010Combat.validateItem(s)!==false)||!Number.isInteger(q.fishReserve)||q.fishReserve<0||q.fishReserve>=500)throw Error('Неверные быстрые слоты');if(new Set(q.items.filter(Boolean).map(s=>s.type)).size!==q.items.filter(Boolean).length)throw Error('Повтор предмета');d.handSlots=q.items.map(s=>s?.type||null);}
    return decode(JSON.stringify(d));});
  GameSave.extend('restore','inventory.physical-slots',function(restore,d){d=V014Fish.migrate(copy(d));items.fill(null);if(d.quick013)items.splice(0,5,...copy(d.quick013.items));restore(d);if(!d.quick013){for(let i=0;i<5;i++){const t=d.handSlots[i],j=bag.findIndex(s=>s?.type===t);if(t&&j>=0){items[i]=bag[j];bag[j]=null;}}}reserve=d.quick013?.fishReserve||0;for(const a of [bag,...storageChests.map(c=>c.items)])for(const s of a)if(s?.type==='fish')V014Fish.normalize(s);activeHandSlot=d.activeHandSlot;sync();});
  // Move the initial starting hands exactly once before the first save is created.
  for(let i=0;i<5;i++){const j=bag.findIndex(s=>s?.type===handSlots[i]);if(j>=0){items[i]=bag[j];bag[j]=null;}}handSlots=items.map(s=>s?.type||null);
  v09Style(`.v014FishCook{padding:8px 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px}.v014FishCook p{width:100%;margin:0;font-size:13px}.v014FishCook label{font-size:12px}.v014FishCook input{width:58px;background:#18282b;color:#dfebe5;border:1px solid #56706b;border-radius:5px;padding:5px;font:inherit}.v014FishCook small{font-size:11px;color:#a5bcb1}.v014FishCook button{width:auto!important;padding:8px 12px!important;font-size:12px!important}@keyframes v013Short{0%,100%{box-shadow:none}30%{background:#78423e;border-color:#ee8b7e;box-shadow:0 0 0 2px #e9857466}}.v013Missing{animation:v013Short .7s ease-out}#quickSlots{grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}#hotbar{grid-template-columns:repeat(5,minmax(0,52px));gap:4px;width:min(276px,92vw)}.v011BatchControls button{font-size:11px!important;padding:5px 8px!important}@media(max-width:540px){#quickSlots{max-width:92vw}.slotArt{max-height:40px}}`);
  return {items,sync,returnItem,cook,fishWeight,equip};
})();

