/* 0.10.5 — top-down usability, farm irrigation and save management. */
const V0104=(()=>{
  // Keep small world labels legible at distant zoom without scaling the HUD.
  const baseFillText=ctx.fillText.bind(ctx);
  ctx.fillText=function(text,x,y,...args){
    const font=this.font,m=font.match(/([\d.]+)px/),t=this.getTransform();
    const density=canvas.width/Math.max(1,screenWidth),scale=Math.hypot(t.a,t.b)/density;
    if(m&&+m[1]>=9&&+m[1]<=22&&scale>.1&&scale<1&&+m[1]*scale<9.5)this.font=font.replace(m[0],(9.5/scale).toFixed(2)+'px');
    try{return baseFillText(text,x,y,...args);}finally{this.font=font;}
  };
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';

  let selectedLoot=-1,lootCapacity=8;
  const oldOpenLoot=openLoot;
  openLoot=function(obj){selectedLoot=-1;lootCapacity=8;oldOpenLoot(obj);};
  function takeLoot(index,amount){
    const s=activeLoot?.[index];if(!s||!activeLootObject)return false;
    const count=Math.min(s.qty,Math.max(1,Math.floor(amount))),left=addItem(s.type,count,s),taken=count-left;
    if(!taken){message('Рюкзак заполнен');return false;}
    if(s.type==='fish')V014Fish.remove(s,taken);s.qty-=taken;if(!s.qty){activeLoot.splice(index,1);selectedLoot=-1;}
    activeLootObject.loot=activeLoot;renderLoot();renderQuickSlots();updateAmmoHud();queueGameSave();return true;
  }
  renderLoot=function(){
    const box=el('lootList');box.className='v104LootGrid';
    lootCapacity=Math.max(lootCapacity,Math.ceil((activeLoot?.length||0)/4)*4,8);
    while(box.children.length>lootCapacity)box.children[box.children.length-1].remove();
    while(box.children.length<lootCapacity){const cell=document.createElement('button');cell.type='button';box.append(cell);}
    for(let i=0;i<lootCapacity;i++){
      const s=activeLoot?.[i],cell=box.children[i],signature=s?s.type+':'+s.qty+':'+(s.level||0):'';
      cell.className='v104LootCell'+(i===selectedLoot?' selected':'');
      if(cell.dataset.signature!==signature){I18n.assign(cell,"innerHTML",s?itemIconHTML(s.type)+'<small>'+s.qty+'</small>':'');cell.dataset.signature=signature;}
      cell.disabled=!s;I18n.setAttr(cell,'aria-label',s?ITEM[s.type].name+' × '+s.qty:'Пусто');cell.onclick=()=>{selectedLoot=i;renderLoot();};
    }
    let details=el('v104LootDetails');if(!details){
      details=document.createElement('div');details.id='v104LootDetails';box.after(details);
      const label=document.createElement('div');label.className='v104LootLabel';label.id='v011LootLabel';
      const controls=document.createElement('div');controls.className='v104LootActions';
      const one=v09Button('Взять 1',()=>takeLoot(selectedLoot,1));one.id='v011LootOne';
      const stack=v09Button('Взять стопку',()=>takeLoot(selectedLoot,activeLoot?.[selectedLoot]?.qty||0));stack.id='v011LootStack';
      controls.append(one,stack);details.append(label,controls);
    }
    const s=activeLoot?.[selectedLoot];I18n.assign(el('v011LootLabel'),"textContent",s?ITEM[s.type].name+' · '+s.qty:'Выберите предмет');
    el('v011LootOne').disabled=el('v011LootStack').disabled=!s;
    el('takeAllLoot').disabled=!activeLoot?.length;
  };

  function deleteSlot(id){
    if(!Number.isInteger(id)||id<1||id>V09_SLOT_COUNT)return false;
    try{
      if(!v09OccupiedSlots().includes(id))return false;
      if(id===GameState.session.activeSlot){v09CancelPendingSave();GameState.session.activeSlot=null;GameState.session.blocked=true;GameState.session.lastVerified=null;localStorage.removeItem(V09_ACTIVE_KEY);stopControls();}
      localStorage.setItem('survival_base_slots_deleted','1');
      localStorage.removeItem(v09SlotKey(id));localStorage.removeItem(v09BackupKey(id));
      updateSaveStatus(GameState.session.activeSlot?'Слот '+id+' удалён.':'Выберите сохранение или создайте новую игру.');v09RenderSaveSlots();return true;
    }catch(error){message('Не удалось удалить сохранение');return false;}
  }
  function requestDelete(id){
    const entry=v09ReadSlot(id);if(!entry)return;
    const o=v09Overlay('v104DeleteSave','Удалить сохранение?'),body=o.querySelector('.v09Body');body.replaceChildren();
    const label=document.createElement('p');I18n.assign(label,"textContent",I18n.message('save.delete',{name:entry.invalid?I18n.text('Слот '+id):entry.data.saveName}));body.append(label);
    const actions=document.createElement('div');actions.className='v104LootActions';
    actions.append(v09Button('Отмена',()=>{closeOverlay(o);openOverlay(v09SaveOverlay);}),v09Button('Удалить',()=>{if(deleteSlot(id)){closeOverlay(o);openOverlay(v09SaveOverlay);message('Слот '+id+' освобождён');}}));body.append(actions);openOverlay(o);
  }
  V09Saves.deleteSlot=requestDelete;
  // Move the long control explanation into an optional disclosure.
  const settings=el('settingsOverlay').querySelector('.panel'),paragraphs=settings.querySelectorAll('.subtitle');
  if(paragraphs[1]){const help=document.createElement('details'),summary=document.createElement('summary');I18n.assign(summary,"textContent",'Как управлять');paragraphs[1].before(help);help.append(summary,paragraphs[1]);}
  settings.append(el('closeSettings'));
  v09Style(`
    .v010Slot,.equipSlot{touch-action:none!important;-webkit-touch-callout:none;user-select:none}
    #inventoryOverlay .panel,#storageOverlay .panel{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    #settingsOverlay .panel{box-sizing:border-box;width:min(390px,94vw);max-height:86dvh;padding:12px;border-radius:12px;font-size:11px}
    #settingsOverlay h2{font-size:17px;margin:0 0 6px}#settingsOverlay .subtitle{font-size:10px;line-height:1.4;margin:4px 0 7px!important}
    #settingsOverlay .menuButton{font-size:11px;padding:7px 10px;min-height:34px;margin-top:5px;border-radius:8px}
    #settingsOverlay .settingBox{padding:8px;margin:7px 0}#settingsOverlay .settingTitle{font-size:11px;margin-bottom:5px}
    #settingsOverlay #saveStatus{font-size:10px!important}#settingsOverlay details{margin:6px 0;color:#afc2bd}#settingsOverlay summary{padding:5px;cursor:pointer}
    #settingsOverlay .v010CameraControls{gap:4px}#settingsOverlay .v010CameraControls .menuButton{font-size:10px}#settingsOverlay input[type=range]{height:24px}
    #lootOverlay .panel{width:min(340px,92vw);box-sizing:border-box;padding:13px}#lootOverlay h2{font-size:17px}
    #lootOverlay .subtitle{font-size:11px;margin-bottom:8px}.v104LootGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
    .v104LootCell{position:relative;height:60px;padding:3px;border:1px solid #526866;border-radius:8px;background:#16262b;touch-action:pan-y;color:#e2ede6}
    .v104LootCell.selected{border-color:#e2bd73;background:#32413b}.v104LootCell:disabled{opacity:.35}.v104LootCell .itemIcon{width:46px;height:46px}.v104LootCell small{position:absolute;right:4px;bottom:3px;font-size:11px}
    .v104LootLabel{font-size:12px;min-height:18px;margin-top:10px}.v104LootActions{display:flex;gap:6px}.v104LootActions .menuButton{font-size:12px;padding:9px;margin-top:5px}
    #lootOverlay>.panel>.menuButton{font-size:12px;padding:9px;min-height:36px}.v104Delete{color:#ffc0ad!important;border-color:#9c6559!important}
    #v104DeleteSave{z-index:15000}.farmCropBtn small{display:block;font-size:10px;color:#9dc7b7;margin-top:3px}
    #v09CraftOverlay .v09Panel{height:min(690px,88dvh);max-height:88dvh;padding:10px;box-sizing:border-box}
    #v09CraftOverlay .v09Header{flex:0 0 auto}#v09CraftOverlay .v09Title{font-size:16px}
    #v09CraftOverlay .v092CraftLayout{grid-template-columns:140px minmax(0,1fr);gap:8px}
    #v09CraftOverlay .v092Recipe{height:48px;min-height:48px;max-height:48px;flex-basis:48px;padding:1px;margin:2px 0;border-radius:6px;gap:4px}
    #v09CraftOverlay .v092Recipe .itemIcon{width:44px;min-width:44px;max-width:44px;height:44px;min-height:44px;max-height:44px;flex-basis:44px}
    #v09CraftOverlay .v092Recipe span{font-size:10px}#v09CraftOverlay .v092Recipe small{font-size:9px}
    #v09CraftOverlay .v092RecipeHero{min-height:48px}#v09CraftOverlay .v092RecipeHero>.itemIcon{width:44px;height:44px}#v09CraftOverlay .v092RecipeHero b{font-size:12px}
    #v09CraftOverlay .v092Materials{min-height:0;grid-template-columns:1fr;margin:5px 0}#v09CraftOverlay .v092MaterialHelp{min-height:0;padding:0;margin:3px 0;font-size:10px}
    #v09CraftOverlay .v092Ingredient{min-height:40px;box-sizing:border-box;font-size:10px;margin:0;align-items:center}
    #v09CraftOverlay .v092Ingredient strong{font-size:12px;color:inherit}#v09CraftOverlay .v092Ingredient .itemIcon{width:36px;height:36px}
    #v09CraftOverlay .v010CraftSmall{min-height:30px;font-size:10px;padding:3px 6px}
    #v09CraftOverlay .v091CraftScroll{display:block;overflow-y:auto;touch-action:pan-y;min-height:0}
    #v09CraftOverlay .v010CraftQueue{margin-top:9px}#v09CraftOverlay .v010QueueRow{background:#213137;border:1px solid #3f5556;border-radius:7px;margin:4px 0;padding:3px;font-size:10px}
    #v09CraftOverlay .v010QueueRow>.itemIcon{width:36px;height:36px;flex-shrink:0}
    #v09CraftOverlay .v091CraftActions{height:auto;min-height:0;max-height:42%;flex:0 0 auto;overflow-y:auto;padding-top:7px;gap:5px}
    #v09CraftOverlay #v091CraftTime{display:flex;align-items:center;gap:5px;min-height:36px;height:auto;white-space:normal;line-height:1.3;font-size:11px}
    #v09CraftOverlay #v091CraftTime .itemIcon{width:36px;height:36px;flex-shrink:0}#v09CraftOverlay #v091CraftStatus{float:right;font-size:10px;color:#b4d9bc}
    #v09CraftOverlay .v092ProductionCounts{font-size:10px;margin:4px 0}#v09CraftOverlay .v092ProductionCounts strong{font-weight:500}
    #v09CraftOverlay #v010ReadyList{height:auto;min-height:0;max-height:78px;overflow:auto;flex-wrap:wrap;font-size:10px;gap:4px}
    #v09CraftOverlay #v010ReadyList>span{border:1px solid #50795c;background:#22392e;border-radius:6px;padding:3px;gap:3px}#v09CraftOverlay #v010ReadyList .itemIcon{width:30px;height:30px}
    #v09CraftOverlay .v010CraftBottom .menuButton{min-height:36px;padding:7px 4px;font-size:11px;border-radius:8px}
    #v09CraftOverlay .v09DeviceRow{padding:3px 0}#v09CraftOverlay .v09DeviceRow strong{display:none}
    @media(max-width:540px){#v09CraftOverlay .v092CraftLayout{grid-template-columns:106px minmax(0,1fr);gap:6px}#v09CraftOverlay .v092Recipe .itemIcon{width:40px;min-width:40px;max-width:40px;height:40px;min-height:40px;max-height:40px;flex-basis:40px}#v09CraftOverlay .v092Recipe{height:46px;min-height:46px;max-height:46px;flex-basis:46px}#v09CraftOverlay .v09CraftQuantity{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px}#v09CraftOverlay .v09CraftQuantity button{min-width:0;font-size:10px;padding:4px 2px}}
    @media(max-height:500px){#v09CraftOverlay .v09Panel{height:94dvh;max-height:94dvh}#v09CraftOverlay .v091CraftActions{max-height:44%;padding-top:3px}#v09CraftOverlay .v092ProductionCounts{display:none}#v09CraftOverlay #v091CraftTime{min-height:24px}#v09CraftOverlay #v091CraftTime .itemIcon{width:24px;height:24px}}
  `);
  invalidateGeometry();
  return {deleteSlot,requestDelete,takeLoot,farmGrowMs};
})();

/* 0.10.5: shared map markers, contextual hands, target lock and resumable work. */
window.V0105=(()=>{
  let target=null,contextHand=null,lastGun='rifle_ak74';
  const guns=()=>Object.keys(V09Craft.weapons),isGun=type=>Object.hasOwn(V09Craft.weapons,type);
  const oldHeld=heldItem,oldSelect=selectHandSlot,oldReconcile=reconcileHands,oldRender=renderQuickSlots;
  heldItem=function(){if(contextHand&&bagCount(contextHand)>0)return contextHand;contextHand=null;return oldHeld();};
  reconcileHands=function(){const shooting=firing;oldReconcile();if(contextHand&&bagCount(contextHand)>0)firing=shooting;else contextHand=null;};
  renderQuickSlots=function(){oldRender();if(contextHand){for(const id of ['hotbar','quickSlots'])for(const b of el(id).children){b.classList.remove('selected');b.setAttribute('aria-pressed','false');}window.GameHUD?.refreshEquipped();}};
  selectHandSlot=function(i){contextHand=null;const result=oldSelect(i);if(isGun(heldItem()))lastGun=heldItem();else target=null;return result;};
  const oldAssign=assignHandSlot;assignHandSlot=function(i){contextHand=null;target=null;return oldAssign(i);};
  function equip(type){
    if(window.V013Inventory)return V013Inventory.equip(type);
    if(bagCount(type)<1){message('Нужен предмет: '+(ITEM[type]?.name||type));return false;}
    if(heldItem()===type)return true;
    const i=handSlots.indexOf(type);contextHand=null;
    if(i>=0)oldSelect(i);else {contextHand=type;firing=false;renderQuickSlots();updateAmmoHud();queueGameSave();}
    if(isGun(type))lastGun=type;return true;
  }
  function liveTarget(){if(target&&(scene!=='surface'||playerDead||!target.alive||!zombies.includes(target)))target=null;return target;}
  function aim(){const z=liveTarget();if(!z||!isGun(heldItem()))return;const dx=z.x-player.x,dy=z.y-player.y,n=Math.hypot(dx,dy)||1;player.aimX=dx/n;player.aimY=dy/n;}
  function hitTarget(x,y){
    const zoom=V010Camera.zoom||1;
    let closest=null,best=Infinity;if(scene!=='surface')return null;
    for(const z of zombies){if(!z.alive||z.health<=0)continue;const d=Math.hypot(z.x-x,z.y-y);if(d<best&&d<=Math.max(z.radius+8,18/zoom)){closest=z;best=d;}}
    return closest;
  }
  function tapWorld(x,y){
    const z=hitTarget(x,y);
    if(!z){target=null;return false;}
    const gun=[heldItem(),lastGun,...guns()].find(t=>isGun(t)&&bagCount(t)>0);
    if(!gun){message('В рюкзаке нет оружия');return true;}
    if(!equip(gun))return true;target=z;aim();return true;
  }
  function selectTarget(z){if(!z?.alive||z.health<=0||!zombies.includes(z))return false;target=z;aim();return true;}
  const oldShoot=shoot;shoot=function(...args){aim();return oldShoot(...args);};
  const oldPlayer=updatePlayer;updatePlayer=function(...args){const out=oldPlayer(...args);aim();return out;};
  const oldDrawPlayer=drawPlayer;drawPlayer=function(...args){aim();return oldDrawPlayer(...args);};
  const oldZombie=drawZombie;drawZombie=function(z){oldZombie(z);if(z!==liveTarget())return;ctx.save();ctx.strokeStyle='#ff625e';ctx.lineWidth=2/(V010Camera.zoom||1);ctx.beginPath();ctx.arc(z.x,z.y,z.radius+9,0,Math.PI*2);ctx.stroke();ctx.restore();};
  function contextTool(o){if(o?.kind==='tree'){target=null;return equip('axe');}if(o?.kind==='ore09'){target=null;return equip('pickaxe');}return true;}
  const oldApproach=approachObject;approachObject=function(o,...args){if(!contextTool(o))return;return oldApproach(o,...args);};
  const oldExecute=executeInteraction;executeInteraction=function(o,...args){if(!contextTool(o))return;return oldExecute(o,...args);};
  const oldTree=useTree;useTree=function(t){if(!equip('axe'))return;V09World.stopMining();return oldTree(t);};
  const oldPoint=approachPoint;approachPoint=function(...args){cancelChop();return oldPoint(...args);};

  function markers(includeInteractive=true){
    const out=[],ids=new Set();
    const add=m=>{if(!Number.isFinite(m.x)||!Number.isFinite(m.y)||ids.has(m.id))return;ids.add(m.id);out.push(m);};
    if(scene==='surface'){
      for(const t of worldTrees)if(t.wood>0)add({id:t.id,x:t.x,y:t.y,kind:t.felled?'wood':'tree'});
      for(const o of V09World.ores)if(o.remaining>0)add({id:o.id,x:o.x,y:o.y,kind:o.type==='coal'?'coal':o.type==='stone'?'stone':o.type==='copper_ore'?'copper':'iron'});
      for(const o of scavenges)add({id:o.id,x:o.x+o.w/2,y:o.y+o.h/2,kind:o.kind==='car'?'car':'building'});
    }
    for(const o of includeInteractive?interactionObjects(scene):[]){
      if(['tree','ore09'].includes(o.kind))continue;
      add({id:o.id,x:o.x+(o.w||0)/2,y:o.y+(o.h||0)/2,kind:'interactive'});
    }
    // Threats last, so their red silhouettes remain readable above scenery.
    if(scene==='surface')for(const z of zombies)if(z.alive)add({id:z.instanceId,x:z.x,y:z.y,kind:'zombie',radius:z.radius,type:z.type,selected:z===liveTarget()});
    return out;
  }
  function drawMapMarkers(c,scale,mini,bounds){
    for(const m of markers(!window.V011World||V011World.filters.interactives)){if(window.V0141Map&&!V0141Map.visible(m,mini))continue;
      if(window.V011World&&!V011World.mapEnabled(m))continue;
      if(m.x<bounds.x-80||m.y<bounds.y-80||m.x>bounds.x+bounds.w+80||m.y>bounds.y+bounds.h+80)continue;
      const r=(m.kind==='zombie'?Math.max(2.3,Math.min(6,(m.radius||16)/7)):mini?2.3:2.8)/scale;
      c.save();c.translate(m.x,m.y);c.lineWidth=1/scale;c.strokeStyle='#14231d';c.beginPath();
      if(m.kind==='zombie'){
        c.fillStyle='#f04e52';c.arc(0,0,r,0,Math.PI*2);c.fill();c.lineWidth=(m.type==='heavy'?1.8:1)/scale;c.strokeStyle='#b71f30';c.stroke();
        if(m.selected){c.beginPath();c.strokeStyle='#ffe5ab';c.lineWidth=1/scale;c.arc(0,0,r+2/scale,0,Math.PI*2);c.stroke();}
      }else if(m.kind==='tree'){c.fillStyle='#75b57b';c.moveTo(0,-r);c.lineTo(r,r);c.lineTo(-r,r);c.closePath();c.fill();}
      else if(m.kind==='coal'||m.kind==='stone'||m.kind==='iron'||m.kind==='copper'){c.fillStyle=m.kind==='coal'?'#65747c':m.kind==='stone'?'#d2d2bd':m.kind==='iron'?'#a8a0f4':'#719bf1';c.moveTo(0,-r*1.3);c.lineTo(r,0);c.lineTo(0,r*1.3);c.lineTo(-r,0);c.closePath();c.fill();c.stroke();}
      else if(m.kind==='interactive'){c.strokeStyle='#82d3d5';c.lineWidth=1.4/scale;c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.lineTo(0,r);c.stroke();}
      else{c.fillStyle=m.kind==='building'?'#d1ba85':m.kind==='wood'?'#b6986c':'#99aeb6';c.fillRect(-r,-r*.7,r*2,r*1.4);}
      c.restore();
    }
  }

  
  GameSave.extend('capture','ui.context-map',function(oldCapture){V09World.tickMining();updateChop();const d=oldCapture();d.gathering={schema:1,chop:chopState?{...chopState}:null,mining:V09World.miningState(),hand:contextHand};return d;});
  GameSave.extend('decode','ui.context-map',function(oldDecode,raw){
    const d=oldDecode(raw),g=d.gathering;
    if(g!==undefined){
      const time=t=>Number.isFinite(t)&&t>0&&t<=Date.now()+60000;
      if(!g||g.schema!==1||(g.chop&&g.mining)||(g.hand!==null&&!['axe','pickaxe','fishing_rod','hammer',...guns].includes(g.hand)))throw Error('Некорректное сохранение добычи');
      if(g.chop&&(!worldTrees.some(t=>t.id===g.chop.id)||![1800,1800+GameplayBalance.resources.treeChopExtraMs].includes(g.chop.duration)||!time(g.chop.startedAt)))throw Error('Некорректная рубка');
      if(g.mining&&(!V09World.ores.some(o=>o.id===g.mining.id)||g.mining.duration!==1800||!time(g.mining.at)||!Number.isFinite(g.mining.elapsed)||g.mining.elapsed<0||g.mining.elapsed>=1800))throw Error('Некорректная добыча');
    }
    return d;
  });
  GameSave.extend('restore','ui.context-map',function(oldRestore,d){
    target=null;contextHand=null;cancelChop();oldRestore(d);
    const g=d.gathering;if(g){contextHand=g.hand&&bagCount(g.hand)>0?g.hand:null;chopState=g.chop?{...g.chop}:null;V09World.resumeMining(g.mining);V09World.tickMining();updateChop();}
    renderQuickSlots();updateAmmoHud();
  });
  const history=[
    ['0.22.0',{'Улучшения':['Этап 2: явные владельцы состояния и упорядоченная цепочка сохранения.','Совместимость старых saves и проверка формата до загрузки. Игровой баланс сохранён.'],'Исправления':['Новая игра получает полный начальный шаблон после создания всех систем базы.']}],
    ['0.21.0',{'Исправления':['Открывающий клик больше не закрывает окно объекта.','Дрон выбирается по видимому корпусу, в том числе на станции.','Движущаяся цель взаимодействия проверяется по актуальной позиции.'],'Улучшения':['Этап 1: исходники разделены по областям игры с сохранением порядка запуска. Баланс и формат сохранений сохранены.']}],
    ['0.20.0',{'Новое':['Периметр: 4 угла, 11 стен и одни южные ворота.','16 лестниц с плавным подъёмом. Со стены можно спрыгнуть только во двор.','Пять обликов укреплений и три стадии трещин.'],'Улучшения':['Пулемёт устанавливается в любой точке стены, включая стыки.','Сохранены уровни укреплений, повреждения и установленные пулемёты из предыдущей версии.']}], ['0.19.1',{'Улучшения':['Круг выбранной цели масштабируется под размер монстра.','Тела сразу полупрозрачны: 60% видимости, плавное исчезновение через 75–90 секунд.']}], ['0.19.0',{'Новое':['Три отдельные позы смерти каждого из пяти монстров.','День X каждые десять игровых дней: усиление на 50% и осада с четырёх сторон.'],'Баланс':['В обычные дни меньше монстров: спокойное блуждание, атака только при обнаружении игрока.','Стены и двери атакуются монстрами только в день X; ночь сама по себе больше не запускает осаду.'],'Исправления':['Отряды удерживают свою сторону базы, не сбегаясь в один пролом.','Усиление и состояние тел корректно сохраняются без повторного умножения характеристик.']}], ['0.18.0',{'Новое':['Молот для ремонта стен, ворот и дверей.','Камень добывается киркой; бетон изготавливается в печи.','Пять уровней укреплений: 10, 20, 40, 60 и 100 тысяч HP.'],'Улучшения':['Восстановление проломов с проверкой свободного места.','Ремонт 1000 HP/сек.; остаток ремонтной смеси сохраняется.']}], ['0.17.0',{'Новое':['Пять типов монстров: громила, заражённый, ловчий, прыгун и взрывник.','Ночные атаки базы, распределение противников по стенам, постоянные полоски здоровья.'],'Улучшения':['Отдельные анимированные изображения движения и атак.','Тонкая шкала здоровья и шкала сытости над ней.'],'Баланс':['Больше противников ночью; прыжки с дистанции и опасный ближний взрыв.']}], ['0.16.3',{'Улучшения':['Маршрут начинается с безопасного участка сразу; дальнейший путь рассчитывается по кадрам.','Мягкая полупрозрачная линия маршрута; здоровье и сытость над быстрыми слотами.','Рюкзак и хранилище: непрозрачность 100%, 70% или 40%.','Добыча: три действия, выбор одной стопки или выдача всего в рюкзак либо дрон.'],'Исправления':['Пустые быстрые слоты открывают выбор предмета и при касании пальцем.','Нажатие за окном закрывает только верхнюю карточку и не проходит под неё.','Открытие интерфейса сохраняет автопуть и добычу; получение урона останавливает добычу.','Убран отдельный индикатор заряда дрона поверх игрового мира.']}], ['0.16.2',{'Улучшения':['Пять быстрых слотов уменьшены на 30%; компактный выбор из всего рюкзака.','Недоступные для быстрого слота предметы приглушены и подсвечиваются красным при нажатии.'],'Новое':['Съёмные магазины АК и M4 на 30 и 60 патронов.','Без магазина оружие не стреляет; снятие возвращает пустой магазин и весь боезапас в рюкзак.'],'Исправления':['Атомарные операции с магазинами, заполнение стаков до 600 и сохранение точного боезапаса.']}], ['0.16.1',{'Новое':['Физический станок усиления в углу мастерской: оружие, экипировка, пулемёт и модули дрона до +5.','Новые иконки шлема, увеличенного магазина, дрона и станка.','Перенос предметов удержанием между быстрыми слотами, рюкзаком, ящиками и дроном.'],'Улучшения':['Мини-карта немного меньше и сохраняет правильное положение до и после масштабирования.','Окна сразу скрывают игровые кнопки и мини-карту, закрываются крестиком и нажатием на фон.','Поднятые лампы освещают двор поверх низких декораций; вещи расположены ближе к стенам.','Единая прозрачность игровых кнопок и новая иконка тихого шага.'],'Баланс':['Ёмкость батареи дрона увеличена в 2,5 раза.','Добыча руды: 10 за цикл; переплавка железа и меди: 2 секунды за слиток.','Удалены прицел, рукоятка, глушитель и положение на колене.'],'Исправления':['Улучшенные предметы сохраняются на станке без дублирования.','Старые сохранения переносятся с сохранением прогресса плавки; материалы незавершённых удалённых рецептов возвращаются.','Все лестницы остаются доступны после перестановки декораций.']}], ['0.16.0',{'Новое':['Сутки за 20 минут активной игры: плавный рассвет, вечер и ночь; время сохраняется.','Съёмный тяжёлый пулемёт: урон 65, поворот 360°, изготовление и размещение на стенах.'],'Улучшения':['Мягкое локальное освещение бункера, усиленный фонарик и свет дрона.','Лампы на стенах и восемь наружных прожекторов по углам базы.','Открытый двор без машин и лишних перегородок; более тёмный бетон.'],'Исправления':['Перенос прежних сохранений сохраняет прочность внешних и внутренних укреплений.','Проходы и лестницы остаются свободными при установленном пулемёте.','Ворота не закрываются на дроне; разрушение стены во время подъёма не портит положение персонажа.','Северный мост больше не перекрывает верхнюю линию выстрела и света.']}], ['0.15.2',{'Исправления':['Исправлена ошибка рисования узких стен, из-за которой изображение повторялось и игра не показывала мир.','Кадр восстанавливает состояние Canvas при сбое отрисовки.'],'Улучшения':['Наземные отделения содержат декорации: припаркованные машины, палеты, кейсы, трубы и тележку.','С поверхности убраны дубли склада, мастерской, генераторов и других подземных служб.','Более естественный бетон стен, крупные плиты пола, сдержанные швы и тени.']}], ['0.15.1',{'Исправления':['Станция распознаёт и заряжает принесённый дрон даже при нулевой батарее.','Контроль застревания при возврате, повторный поиск пути и экономия заряда при закрытом проходе.','Посадка всех десяти культур: точный расход выбранного материала из рюкзака и получение из ящиков фермы.'],'Улучшения':['Отдельное окно станции: заряд, питание, время и переключатель автовозврата при 15%.','Дрон на обеих картах; на другом уровне — индикатор у люка.']}], ['0.15.0',{'Новое':['Новая наземная база: склад, мастерская, топливный блок, энергоблок, медпункт и центральный двор.','Вышки с пустыми площадками и прожекторы на стенах.','Отдельная прочность секций всех стен базы, трещины и настоящие проломы.','Зомби атакуют препятствующие им секции и проходят после разрушения.'],'Улучшения':['Состояние укреплений сохраняется; повреждения видны на обеих картах.','Круглая мини-карта ниже настроек; удержание 1,5 секунды: 100%, 60%, 30%.']}], ['0.14.3',{'Улучшения':['Круглая мини-карта расположена ниже кнопки настроек.','Удержание 1,5 секунды переключает непрозрачность: 100%, 60%, 30%.','Выбранная непрозрачность сохраняется после отпускания и повторного входа.','Короткое нажатие по-прежнему открывает карту местности.']}], ['0.14.2',{'Улучшения':['Компактные переключатели фонаря и боевого режима дрона.','Ровная сетка рюкзака внутри карточки дрона и перемещённая станция.','В режиме атаки дрон реагирует на выбранного игроком противника и затем возвращается к основной команде.'],'Баланс':['Боезапас дрона — 600; загрузка из рюкзака и груза дрона.','Каждое попадание дрона наносит 20 HP; темп огня соответствует АК.'],'Исправления':['Точное списание патронов и прекращение огня при выключении боевого режима.','Сохранение команды охраны после боя и совместимость предыдущих сохранений.']}], ['0.14.1',{'Улучшения':['Новая карточка и станция дрона, аварийный возврат в рюкзак.','Плавное сопровождение с обходом препятствий и автоматическими дверями.','Три размера деревьев и перекрытие объектов по глубине.','Обнаружение на большой карте на 50% шире мини-карты.'],'Исправления':['Трактор удалён; восстановлены ручная посадка и сбор урожая.','Сохранения переносят растения и оставшийся груз трактора.']}], ['0.14.0',{'Новое':['Дрон-компаньон: переноска, защита, атака, зарядка и улучшения до +5.','Мини-трактор сажает и собирает грядки, перевозит урожай; общая станция роботов.','Стойка на колене и движение к точке карты.'],'Улучшения':['Компактное производство с крупной иконкой результата.','Полив по циклам и индивидуальное время роста растений.','Расход топлива по нагрузке, включая зарядку.','Пропорции объектов, тени и обстановка жилой комнаты.'],'Исправления':['Попадания в упор, кнопка огня при захвате цели и целые значения HP.','Рыбалка с берега; отдельный вес каждой рыбы и приготовление выбранного количества.','Мини-карта: касание открывает карту, удержание временно меняет прозрачность.','Пороги и дороги, изображения и открывание машин.']}], ['0.13.0',{'Новое':['Пять самостоятельных быстрых слотов, патроны по 600 и рыба с весом.','Обновлённое озеро, живые рыбы и ловля за 6–15 секунд.','Десять вариантов машин, открывающиеся двери и багажники.','Заправки и двухэтажный торговый центр.'],'Улучшения':['Согласованные дороги и подъезды.','Подсветка недостающих материалов при изготовлении.']}], ['0.12.1',{'Новое':['Рыбалка у озера: удочка, рыба, заброс и улов каждые 3–15 секунд.','Удочка создаётся на универсальном станке и назначается в любой быстрый слот.','Три места для рыбалки и две лодки у берега.']}], ['0.12.0',{'Новое':['Внешний мир увеличен в пять раз по площади.','Настройки видимости объектов на обеих картах.'],'Улучшения':['Увеличенные здания с доступными интерьерами и добычей в мебели.','Новые машины с постоянным цветом.','Компактные окна рюкзака и хранилищ с настройкой прозрачности.','Плавные уведомления и анимация добычи руды.']}], ['0.11.1',{'Улучшения':['Мягкое распыление воды и заметные капли над грядками.','Коровы попарно в стойлах у кормушек; новые стилизованные изображения коров и кур.','Электростанок преимущественно сверху, с лёгким наклоном и движущимся рабочим узлом.']}], ['0.11.0',{
 'Новое':['Мини-инвентарь готовой продукции каждого станка: выбор стопки и выдача всего.','Общий бачок полива: 100 л, 10 секунд полива после 45 секунд паузы.','Отдых на кровати восстанавливает здоровье; душ смывает загрязнение после боя.','Дом и автосервис с открывающимися дверями, скрываемой крышей и добычей внутри.','Новые изображения оборудования и животных, механическая анимация станков и открывания ящиков.'],
 'Улучшения':['Единый компактный стиль карточек и производства: материалы → результат.','Прибавки улучшений после итоговых характеристик; четыре строки параметров персонажа.','Настройки слоёв обеих карт и отдельная кнопка снятия цели.','Новые покрытия комнат, двери, лампы, мягкий свет и тени.','Отдельные кормушки и общая поилка, движения и поведение животных.','Метки АК и M4 на патронах; компактная заправка по 10 или до максимума.'],
 'Баланс':['Полный сбалансированный комплект +5 даёт около 300 максимального HP.','Новый урожай — 50 единиц с грядки; старые остатки урожая сохраняются.','Без воды культуры растут со скоростью 35% и не погибают.','Тела зомби плавно исчезают через 75–90 секунд.'],
 'Исправления':['Нативная прокрутка по ячейкам инвентаря и ящиков.','Стабильное окно добычи без скачков при выборе предмета.','Плавное обновление мини-карты; расположение HUD учитывает элементы Telegram.']
 }],
 ['0.10.5',{'Новое':['Общие метки объектов на мини-карте и большой карте.','Выбор зомби касанием и удержание прицела.','Автоматический выбор топора, кирки и оружия.','История обновлений в настройках.'],'Улучшения':['Размер красной метки отражает размер противника.','Правый джойстик стреляет по выбранной цели.'],'Исправления':['Интерфейс не отменяет добычу. После возвращения из фона рассчитывается прошедшее время.','Команда движения сразу останавливает добычу.']}],
    ['0.10.4',{'Новое':['Автополив грядок и разное время роста культур.','Выбор отдельных предметов из найденной добычи.','Удаление слотов сохранения.'],'Улучшения':['Прокрутка инвентаря пальцем, компактные настройки и окно печи.','Чёткость изображения на экранах с высокой плотностью пикселей.'],'Баланс':['Лимит коров увеличен на 15. АК — 2 сек., M4 — 1,8 сек. на перезарядку.','Деревья пропускают персонажа и пули.']}],
    ['0.10.0',{'Новое':['Большой мир, карты, очередь крафта, улучшения снаряжения, батарея и статистика.'],'Улучшения':['Текущая ветка сохраняет вид сверху.','Плавный масштаб, сохранение прокрутки рецептов.']}],
    ['0.9.2',{'Улучшения':['Новые иконки предметов и интерфейса.']}]
  ];
  function showHistory(){
    const o=v09Overlay('v105Changes','Обновления'),body=o.querySelector('.v09Body');body.replaceChildren();
    history.forEach(([version,groups],i)=>{const d=document.createElement('details');d.open=i===0;const s=document.createElement('summary');I18n.assign(s,"textContent",version+(i===0?' — текущее':''));d.append(s);for(const [title,items] of Object.entries(groups)){const h=document.createElement('h3');I18n.assign(h,"textContent",title);const ul=document.createElement('ul');for(const text of items){const li=document.createElement('li');I18n.assign(li,"textContent",text);ul.append(li);}d.append(h,ul);}body.append(d);});openOverlay(o);
  }
  const changes=v09Button('Что нового? · Version 0.21.0',showHistory);changes.id='v105ChangesButton';el('closeSettings').before(changes);
  v09Style('#v105Changes .panel{width:min(480px,94vw);padding:14px;font-size:12px;max-height:85dvh}#v105Changes details{border-bottom:1px solid #405452;padding:8px 0}#v105Changes summary{font-size:14px;cursor:pointer;color:#e2c58d}#v105Changes h3{font-size:12px;margin:12px 0 4px;color:#97cab5}#v105Changes ul{padding-left:18px;margin:4px 0;line-height:1.5}#v105Changes li{margin:5px 0}');
  return {tapWorld,hitTarget,selectTarget,equip,markers,drawMapMarkers,showHistory,history,get target(){return liveTarget();},get contextHand(){return contextHand;}};
})();
