/* 0.11 — quiet UI, readable equipment, native inventory scrolling and Telegram-safe HUD. */
window.V011UI=(()=>{
  'use strict';
  const inv=V010Inventory,combat=V010Combat;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const purposes={
    fishing_rod:'Назначьте в быстрый слот. Подойдите к подходящему берегу: один улов за 6–15 секунд. Движение останавливает ловлю.',fish:'Свежая озёрная рыба. Выход при приготовлении зависит от веса выбранных рыб.',
    vest1:'Лёгкая защита корпуса для первых вылазок.',vest2:'Усиленная защита корпуса для исследования мира.',vest3:'Защитный жилет для опасных участков.',vest4:'Тяжёлая броня для продолжительного боя.',vest5:'Максимальная защита корпуса для самых опасных вылазок.',
    helmet1:'Защита головы и более устойчивое прицеливание.',pants1:'Прочная полевая одежда. Повышает запас здоровья.',boots1:'Походная обувь. Повышает скорость передвижения.',
    rifle_ak74:'АК-74 · использует патроны 5,45.',rifle_m4:'M4 · использует патроны 5,56.',axe:'Инструмент для заготовки древесины.',pickaxe:'Инструмент для добычи железной и медной руды.',flashlight:'Освещает путь и ближайшие объекты.',remote:'Управление оборудованием и электричеством базы.',
    iron_ore:'Переплавляется в железные слитки.',copper_ore:'Переплавляется в медные слитки.',iron:'Для оружия, патронов, оборудования и улучшений.',copper:'Для электрического оборудования и модулей.',ammo:'Для АК-74 · калибр 5,45.',ammo556:'Для M4 · калибр 5,56.',fuel:'Запас топлива для генератора.',meds:'Медицинские припасы для восстановления здоровья.',water:'Для питья и хозяйства базы.',animal_feed:'Корм для животных.',wood:'Строительный материал и сырьё для производства.'
  };
  const names={hp:'Здоровье',armor:'Защита',speed:'Скорость',accuracy:'Точность',damage:'Урон',mag:'Магазин',reloadMs:'Перезарядка',spread:'Разброс',recoil:'Отдача',capacity:'Вместимость'};
  const number=n=>I18n.numeric(n,{maximumFractionDigits:2,useGrouping:false});
  function format(key,n,bonus=false){
    const sign=n>0&&(bonus||['hp','speed','accuracy'].includes(key))?'+':'';
    if(['speed','accuracy'].includes(key))return sign+number(Math.round(n*100))+'%';
    if(key==='hp')return sign+String(Math.round(n));
    if(key==='armor')return sign+number(n)+'%';
    if(key==='reloadMs')return sign+number(n/1000)+' с';
    if(['spread','recoil'].includes(key))return sign+number(n*180/Math.PI)+'°';
    return sign+number(n)+(key==='capacity'?' мест':'');
  }
  function statsHTML(item){
    const current=combat.getItemStats(item),base=combat.getItemStats({...item,level:0});
    if(!current)return '';
    return '<div class="v011ItemStats">'+Object.entries(names).filter(([k])=>Number.isFinite(current[k])&&current[k]!==0).map(([k,label])=>{
      const diff=Number.isFinite(base?.[k])?current[k]-base[k]:0;
      return '<div class="v011StatRow"><span>'+label+'</span><span><b>'+format(k,current[k])+'</b>'+(Math.abs(diff)>.000001?'<small class="v011Bonus">('+format(k,diff,true)+')</small>':'')+'</span></div>';
    }).join('')+'</div>';
  }
  function cardHTML(item){
    const def=ITEM[item.type],gear=!!(def.equip&&def.equip!=='backpack'&&combat.maxUpgradeLevel(item)>0||V09Craft.weapons[item.type]);
    return '<div class="v011ItemHero"><div class="v011ItemArt">'+itemIconHTML(item.type)+'</div><div class="v011ItemInfo"><div class="v011ItemKicker">'+esc(def.equip?EQUIP_LABELS[def.equip]:def.hand?'Снаряжение':'Предмет')+'</div><b class="v011ItemName">'+esc(def.name)+'</b><div class="v011ItemMeta">'+(gear?'Улучшение <strong>+'+(item.level||0)+' / '+V010Combat.maxUpgradeLevel(item)+'</strong>':'Количество <strong>'+(item.qty||1)+'</strong>')+'</div><p class="v011ItemDescription">'+esc(def.description||purposes[item.type]||(def.equip==='backpack'?'Расширяет место для предметов и запасов.':'Материал для производства и развития базы.'))+'</p></div></div>'+statsHTML(item);
  }
  const locationItems=where=>inv.list(where);
  function details(where,index){
    const item=where==='equipment'?equipment[index]:locationItems(where)?.[index];if(!item)return;
    const def=ITEM[item.type],overlay=v09Overlay('v010ItemDetails',def.name),body=overlay.querySelector('.v09Body');
    I18n.assign(body,"innerHTML",cardHTML(item));
    const actions=document.createElement('div');actions.className='v011ItemActions';
    function button(label,fn,disabled=false,secondary=false){const b=v09Button(label,fn,secondary?'v011Secondary':'');b.disabled=disabled;actions.append(b);return b;}
    if(def.equip){
      const worn=where==='equipment';
      button('Надеть',()=>{if(inv.equip(index))closeOverlay(overlay);},worn||where!=='bag');
      const remove=button('Снять',()=>{if(inv.unequip(index))closeOverlay(overlay);},!worn);
      if(worn&&def.equip==='backpack'){I18n.assign(remove,'title','Чтобы сменить рюкзак, наденьте другой из инвентаря');}
    }
    if(def.hand&&where==='bag')button('В быстрый слот',()=>{combat.ensure(item);inv.selectUid(item.type,item.uid);closeOverlay(overlay);openHandAssignment(item.type);});
    if(where!=='equipment'){
      if(['bag'].includes(where)||Number.isInteger(where))if(activeStorage!==null&&el('storageOverlay').classList.contains('open'))button(where==='bag'?'В ящик':'В рюкзак',()=>{inv.transfer(where,index,where==='bag'?activeStorage:'bag');closeOverlay(overlay);},false,true);
      if(item.qty>1){const input=document.createElement('input');input.type='number';input.min='1';input.max=item.qty-1;input.value=Math.floor(item.qty/2);I18n.setAttr(input,'aria-label','Количество для разделения');actions.append(input);button('Разделить',()=>{if(inv.split(where,index,Math.floor(Number(input.value))))closeOverlay(overlay);else message('Нужна свободная ячейка');},false,true);}
      if(!def.robot)button('Уничтожить',()=>{if(confirm(I18n.text('Уничтожить «'+def.name+'»'+(item.level?' +'+item.level:'')+'? Предмет будет потерян.'))){locationItems(where)[index]=null;inv.render();closeOverlay(overlay);}},false,true);
    }
    body.append(actions);
    if((item.level||0)>0){const note=document.createElement('p');note.className='v011ItemFootnote';I18n.assign(note,"textContent",'В скобках — прибавка от улучшения, уже учтённая в характеристике.');body.append(note);}
    openOverlay(overlay);
  }
  const oldEquipment=renderEquipment;
  renderEquipment=function(){oldEquipment();const s=combat.equipmentSnapshot(),node=el('characterStats');if(!node)return;
    I18n.assign(node,"innerHTML",[['Здоровье',Math.round(player.health)+' / '+Math.round(s.hp)],['Защита',s.armor+'%'],['Скорость','+'+Math.round(s.speed*100)+'%'],['Точность','+'+Math.round(s.accuracy*100)+'%']].map(([label,value])=>'<div class="v011StatRow"><span>'+label+'</span><b>'+value+'</b></div>').join(''));
  };
  // Re-rendering after a deliberate transfer does not shift the inventory scroll position.
  for(const [key,fn] of [['bag',renderBag],['storage',renderStorage]]){
    const wrapped=function(...args){const panels=[...document.querySelectorAll('#inventoryOverlay .panel,#storageOverlay .panel')],scroll=panels.map(p=>p.scrollTop||0);const result=fn.apply(this,args);panels.forEach((p,i)=>p.scrollTop=scroll[i]);return result;};
    if(key==='bag')renderBag=wrapped;else renderStorage=wrapped;
  }
  const person=el('bagButton');I18n.assign(person,"innerHTML",'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="14" r="8"/><path d="M10 42v-8c0-8 6-12 14-12s14 4 14 12v8M18 25v12m12-12v12"/></svg>');I18n.assign(person,'title','Персонаж и инвентарь');I18n.setAttr(person,'aria-label','Персонаж и инвентарь');
  function safeArea(){
    const app=window.Telegram?.WebApp;
    const top=app?Math.max(56,Number(app.safeAreaInset?.top||0)+Number(app.contentSafeAreaInset?.top||0))+10:10;
    document.documentElement.style.setProperty('--v011-hud-top',top+'px');
    document.documentElement.style.setProperty('--v011-tg-extra',app?'56px':'0px');
    for(const side of ['left','right','bottom'])document.documentElement.style.setProperty('--v011-safe-'+side,Math.max(0,Number(app?.safeAreaInset?.[side]||0)+Number(app?.contentSafeAreaInset?.[side]||0))+'px');
  }
  safeArea();window.addEventListener('resize',safeArea);
  try{for(const event of ['safeAreaChanged','contentSafeAreaChanged','viewportChanged','fullscreenChanged'])window.Telegram?.WebApp?.onEvent?.(event,safeArea);}catch(_){}
  v09Style(`
    :root{--v011-hud-top:10px;--v011-tg-extra:0px;--v011-game-top:max(var(--v011-hud-top),calc(env(safe-area-inset-top,0px) + var(--v011-tg-extra) + 10px));--v011-border:#aec3bd22;--v011-muted:#98b0aa}
    #hud{top:var(--v011-game-top)!important}
    #settingsButton{top:calc(var(--v011-game-top) + 44px)!important}
    #ammoHud{top:calc(var(--v011-game-top) + 39px)!important;font-size:10px;padding:5px 7px}
    #versionBadge{top:calc(var(--v011-game-top) + 68px)!important;font-size:8px;opacity:.4}
    #v010Minimap{top:calc(var(--v011-game-top) + 100px)!important}
    #v010PinnedGoal{top:calc(var(--v011-game-top) + 106px)!important}
    #bagButton svg{width:31px;height:31px;fill:#afc9c2;stroke:#233d3b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .panel,.v09Panel{border-radius:13px;border-color:var(--v011-border);scrollbar-width:thin;scrollbar-color:#799c9166 transparent}
    .panel h2,.v09Title{font-size:17px;letter-spacing:.01em}.v09Header{margin-bottom:10px;padding-bottom:8px}
    .v09Header .v09Close{width:36px;min-width:36px;min-height:36px;height:36px;font-size:23px;padding:0;margin:0}
    .v09Body{font-size:12px;line-height:1.45}.v09Body .menuButton{font-size:12px;padding:7px 10px;min-height:36px;border-radius:8px}
    .v010Slot,.equipSlot{touch-action:pan-y!important;-webkit-touch-callout:none;user-select:none}
    .v010Slot.v011DragArmed,.equipSlot.v011DragArmed{border-color:#d5c38b;box-shadow:inset 0 0 0 1px #d5c38b55}
    #inventoryOverlay .panel,#storageOverlay .panel{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scroll-behavior:auto;overflow-anchor:none}
    #inventoryOverlay .panel{padding:13px;width:min(520px,95vw)}.characterInventory{gap:9px;margin:7px 0}
    .characterCard{min-height:230px;padding:8px;box-sizing:border-box;background:linear-gradient(155deg,#2a42403b,#12242755)}
    .characterStats{width:100%;font-size:11px;line-height:1.35;margin-top:6px;text-align:left}
    #characterStats .v011StatRow{padding:4px 0;gap:6px;align-items:baseline}
    .equipSlot{min-height:57px;padding:5px;gap:6px}.equipSlot b{font-size:10px}.equipSlot small{font-size:9px;color:var(--v011-muted)}
    .v010InvToolbar{gap:5px}.v010InvToolbar .v010SmallAction{font-size:10px;min-height:32px;padding:4px 7px}
    #bagCapacityText{font-size:11px;color:#b4c7bf;margin:7px 0}
    #v010ItemDetails .v09Panel{box-sizing:border-box;width:min(430px,94vw);padding:13px;max-height:88dvh}
    #v010ItemDetails .v09Title{font-size:15px}.v011ItemHero{display:grid;grid-template-columns:100px minmax(0,1fr);gap:13px;align-items:center;margin:4px 0 13px}
    .v011ItemArt{height:114px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:radial-gradient(ellipse,#668b6d30,transparent 72%)}
    .v011ItemArt .itemIcon{width:98px;height:98px;max-width:100%;object-fit:contain;filter:drop-shadow(0 6px 5px #0006)}
    .v011ItemKicker{font-size:9px;color:#99b7aa;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
    .v011ItemName{font-size:16px;line-height:1.3;font-weight:600;display:block}.v011ItemMeta{font-size:11px;color:#a8bbb4;margin-top:5px}.v011ItemMeta strong{color:#dcc893;font-weight:500}
    .v011ItemDescription{font-size:11px;line-height:1.5;color:#a4b8b1;margin:7px 0 0}
    .v011ItemStats{border-top:1px solid var(--v011-border);border-bottom:1px solid var(--v011-border);padding:5px 0;margin:8px 0 12px}
    .v011StatRow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:5px 1px;font-size:12px;color:#a7bcb3}
    .v011StatRow>span:last-child{white-space:nowrap}.v011StatRow b{color:#e2ebe5;font-weight:500;font-variant-numeric:tabular-nums}
    .v011Bonus{font-size:.94em;font-weight:400;color:#86a694;margin-left:6px;vertical-align:baseline}
    .v011ItemActions{display:flex;flex-wrap:wrap;gap:6px}.v011ItemActions .menuButton{width:auto;flex:1 1 auto;min-width:85px;min-height:36px;padding:7px 11px;margin:0;font-size:11px;background:#315447;border-color:#749a7844}
    .v011ItemActions .menuButton.v011Secondary{background:#223330;color:#b7cac1;border-color:#63837822}.v011ItemActions .menuButton:disabled{background:#25302e;color:#83938e;opacity:.45}
    .v011ItemActions input{width:63px;min-width:50px;padding:5px;font-size:12px}
    .v011ItemFootnote{font-size:10px;line-height:1.4;color:#8da99b;margin:10px 0 0}
    .v010UpgradeDetail{padding:9px 11px;margin:8px 0}.v010UpgradeDetail .v011ItemHero{margin:0 0 7px}.v010UpgradeDetail .v011ItemArt{height:95px}.v010UpgradeDetail .v011ItemStats{margin-bottom:0}
    #lootOverlay .panel{width:min(350px,94vw);max-height:86dvh;padding:13px;overflow-anchor:none}
    #lootList{max-height:36dvh;overflow-y:auto;overflow-anchor:none;scrollbar-gutter:stable}
    #v104LootDetails{height:83px;min-height:83px;max-height:83px;box-sizing:border-box;margin:8px 0 2px;overflow:hidden}
    .v104LootLabel{height:30px;min-height:30px;line-height:15px;font-size:12px;margin:0;overflow:hidden;display:flex;align-items:center}
    .v104LootActions .menuButton{height:38px;min-height:38px;margin:4px 0 0;font-size:11px;padding:7px}
    .v104LootCell .itemIcon{width:49px;height:49px}.v104LootCell{height:61px;border-color:#adc7b92b;background:#1c302de0}
    @media(max-width:390px){.v011ItemHero{grid-template-columns:86px minmax(0,1fr);gap:9px}.v011ItemArt .itemIcon{width:84px;height:84px}.v011ItemName{font-size:14px}.v011StatRow{font-size:11px}}
    @media(max-height:550px){#v010Minimap{top:calc(var(--v011-game-top) + 55px)!important;right:100px!important}#v010ItemDetails .v09Panel{max-height:93dvh}.v011ItemHero{grid-template-columns:78px minmax(0,1fr);margin-bottom:6px}.v011ItemArt{height:78px}.v011ItemArt .itemIcon{width:76px;height:76px}}
  `);
  return {details,cardHTML,statsHTML,safeArea};
})();

/* 0.11.0: common manufacturing layout, ammunition compatibility and fuel controls. */
window.V011CraftUI=(()=>{
  const baseIcon=itemIconHTML;
  itemIconHTML=function(type){
    const compatible=V09Craft.weaponsForAmmo(type),weapon=compatible[0];if(!weapon||!V092_ICONS[type]||!V092_ICONS[weapon])return baseIcon(type);
    return `<i class="itemIcon v011AmmoIcon" title="${'Для '+compatible.map(id=>V09Craft.weapons[id].name).join(' / ')}"><img class="v011AmmoBase" src="${V092_ICONS[type]}" alt="" draggable="false"><img class="v011AmmoGun" src="${V092_ICONS[weapon]}" alt="${V09Craft.weapons[weapon].name}" draggable="false"></i>`;
  };
  v09Style(`
    .itemIcon.v011AmmoIcon{position:relative;display:inline-block;vertical-align:middle;font-style:normal;overflow:visible;flex-shrink:0;line-height:1}
    .itemIcon.v011AmmoIcon>.v011AmmoBase{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain;pointer-events:none}
    .itemIcon.v011AmmoIcon>.v011AmmoGun{position:absolute!important;right:-1px!important;top:0!important;width:46%!important;height:35%!important;max-width:none!important;max-height:none!important;object-fit:contain;background:#17272ddb;border:1px solid #7b999777;border-radius:3px;box-sizing:border-box;pointer-events:none}
    #v09CraftOverlay .v09Panel{width:min(780px,calc(100vw - 20px));height:min(740px,88dvh);max-height:88dvh;padding:12px;border-radius:15px;background:#17282beF}
    #v09CraftOverlay .v09Title{font-size:16px;font-weight:600}#v09CraftOverlay .v09Header{margin-bottom:5px}
    #v09CraftOverlay .v092CraftLayout{grid-template-columns:144px minmax(0,1fr);gap:12px;min-height:0;flex:1;margin-top:5px}
    #v09CraftOverlay .v092Recipe{height:48px;min-height:48px;max-height:48px;flex-basis:48px;border:1px solid transparent;border-radius:8px;background:transparent;padding:2px;margin:1px 0;gap:5px;touch-action:pan-y}
    #v09CraftOverlay .v092Recipe.selected{background:#a0b5a61b;border-color:#c8b67c8c}
    #v09CraftOverlay .v092Recipe>.itemIcon{width:40px;min-width:40px;max-width:40px;height:40px;min-height:40px;max-height:40px;flex-basis:40px}
    #v09CraftOverlay .v092Recipe>span{font-size:10px;white-space:normal;line-height:1.25}#v09CraftOverlay .v092Recipe small{font-size:9px;color:#94aaa5}
    #v09CraftOverlay .v092Category{font-size:9px;color:#8fa9a3;margin:5px 0 2px;letter-spacing:.1px;line-height:1.2}
    #v09CraftOverlay .v092RecipeList{padding-right:5px;touch-action:pan-y;-webkit-overflow-scrolling:touch}
    #v09CraftOverlay .v091CraftScroll{padding:0 4px 8px 0;overflow-anchor:none;scrollbar-width:thin;touch-action:pan-y}
    #v09CraftOverlay .v092RecipeDetails{padding:6px;margin:0;min-height:0;background:#101e2280;border:1px solid #8fa69c24;border-radius:9px}
    #v09CraftOverlay .v011RecipeFlow{display:grid;grid-template-columns:minmax(0,1fr) 17px minmax(0,1.12fr);gap:4px;align-items:center;min-height:104px}
    #v09CraftOverlay .v092Materials{display:flex;flex-direction:column;gap:0;min-height:0;margin:0;opacity:.88}
    #v09CraftOverlay .v092Ingredient{display:flex;align-items:center;gap:4px;padding:2px 0;margin:0;min-height:34px;flex:0 0 auto;border:0;background:transparent;border-radius:5px;font-size:9px;width:100%;text-align:left;color:#c1d0c9;box-sizing:border-box;touch-action:pan-y}
    #v09CraftOverlay .v092Ingredient>.itemIcon{width:29px;height:29px;min-width:29px;flex:0 0 29px;object-fit:contain}
    #v09CraftOverlay .v092Ingredient>span{min-width:0;line-height:1.15;overflow-wrap:anywhere}#v09CraftOverlay .v092Ingredient strong{display:block;font-size:9px;margin-top:1px;font-weight:400;font-variant-numeric:tabular-nums}
    #v09CraftOverlay .v092Ingredient.v09CraftShort{color:#e2a08e}
    #v09CraftOverlay .v011RecipeArrow{color:#9bb6a9;font-size:23px;text-align:center;font-weight:300}
    #v09CraftOverlay .v092RecipeHero{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:104px;gap:1px;text-align:center}
    #v09CraftOverlay .v092RecipeHero>.itemIcon{width:96px;height:96px;max-width:100%;object-fit:contain;flex:0 0 auto}
    #v09CraftOverlay .v092RecipeHero>b{font-size:10px;font-weight:500;line-height:1.15;color:#edf0df}
    #v09CraftOverlay .v011Yield{font-size:8px;line-height:1.2;font-weight:400;color:#bdad89;font-variant-numeric:tabular-nums}
    #v09CraftOverlay .v011RecipeMeta{color:#9ab2a8;font-size:9px;line-height:1.2;text-align:center;margin-top:4px}
    #v09CraftOverlay .v011RecipeWeapon{display:block;text-align:center;color:#a9bdb0;font-size:9px;line-height:1.25;margin-top:3px}
    #v09CraftOverlay .v092MaterialHelp{color:#9eb5a9;font-size:10px;min-height:0;margin:0;padding:0;line-height:1.35}#v09CraftOverlay .v092MaterialHelp:not(:empty){margin-top:6px}
    #v09CraftOverlay .v011BatchControls{display:flex;align-items:center;justify-content:space-between;gap:3px;margin:3px 0 2px;flex-wrap:wrap}
    #v09CraftOverlay .v091QuantityCount{font-size:9px;color:#a5baad;font-weight:400;margin:0;padding:0}
    #v09CraftOverlay .v09CraftQuantity{display:flex;gap:2px;margin:0}
    #v09CraftOverlay .v09CraftQuantity button{position:relative;min-width:34px;min-height:34px;height:34px;flex:0 0 34px;width:34px;border:0;border-radius:0;padding:0;margin:0;color:#a7b9af;font-size:9px;background:linear-gradient(transparent 6px,#8da69a0c 6px,#8da69a0c calc(100% - 6px),transparent calc(100% - 6px));box-shadow:none}
    #v09CraftOverlay .v09CraftQuantity button:hover{color:#eef1df;background-color:#8da69a12}
    #v09CraftOverlay .v011CraftMake{min-height:36px;font-size:11px;padding:6px 8px;margin:0 0 3px;border-radius:8px;background:#346250;border:1px solid #88af8170;box-shadow:none}
    #v09CraftOverlay .v010CraftSmall{min-height:34px;font-size:10px;padding:5px 7px;border-color:#728b7e33;background:#93ac9a09;color:#adc1b5;border-radius:6px}
    #v09CraftOverlay .v011PinRecipe{font-size:9px;min-height:30px;border:0;background:none;padding:2px 0;color:#8da69a}
    #v09CraftOverlay .v092Production{margin-top:9px;padding-top:7px;border-top:1px solid #6d897e2b;font-size:10px}
    #v09CraftOverlay #v091CraftTime{min-height:32px;font-size:11px;line-height:1.3;gap:5px}#v09CraftOverlay #v091CraftTime>.itemIcon{width:32px;height:32px;flex:0 0 32px}
    #v09CraftOverlay #v091CraftStatus{font-size:9px;float:right;color:#91b9a1}
    #v09CraftOverlay .v092ProductionCounts{font-size:9px;color:#9eb6a6;margin:3px 0}
    #v09CraftOverlay .v09CraftProgress{height:5px;margin:4px 0;border-radius:3px}
    #v09CraftOverlay .v010CraftControls{gap:4px;margin:3px 0}
    #v09CraftOverlay .v010CraftQueue{margin:6px 0}#v09CraftOverlay .v010QueueRow{background:#8ba89208;border:0;border-bottom:1px solid #718a7f20;border-radius:0;padding:2px 0;margin:2px 0;font-size:10px;gap:5px}
    #v09CraftOverlay .v010QueueRow>.itemIcon{width:32px;height:32px;flex:0 0 32px}#v09CraftOverlay .v010QueueRow small{font-size:10px;color:#9eafa3}
    #v09CraftOverlay .v010QueueRow button{min-width:34px;min-height:34px;font-size:17px;padding:0;border:0;background:none;color:#a4b4aa}
    #v09CraftOverlay .v011CraftMore{margin:8px 0;color:#8fa99c;font-size:10px}#v09CraftOverlay .v011CraftMore summary{padding:8px 0;cursor:pointer}
    #v09CraftOverlay .v010CraftExtras{align-items:flex-start;gap:7px}#v09CraftOverlay .v010CraftUpgrade small{font-size:9px;color:#839d90}
    #v09CraftOverlay .v091CraftActions{display:block;height:158px;min-height:158px;max-height:158px;flex:0 0 158px;overflow:hidden;padding-top:6px;border-top:1px solid #8ba39333;margin-top:5px}
    #v09CraftOverlay .v011OutputHead{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#c6d8c8;margin-bottom:5px;line-height:16px}
    #v09CraftOverlay .v011OutputHead small{font-size:10px;color:#8fae97}
    #v09CraftOverlay #v010ReadyList{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:59px;height:59px;min-height:59px;max-height:59px;overflow-y:auto;overflow-x:hidden;gap:5px;padding:0 2px 0 0;scrollbar-width:thin;touch-action:pan-y}
    #v09CraftOverlay #v010ReadyList>.v011OutputCell{position:relative;margin:0;box-sizing:border-box;width:100%;min-width:0;min-height:59px;height:59px;padding:3px;border:1px solid #668c704d;border-radius:8px;background:#132820;color:#dbe6d9;display:flex;align-items:center;justify-content:center;cursor:pointer}
    #v09CraftOverlay #v010ReadyList>.v011OutputCell.selected{border-color:#dfc289;background:#8ca1682d}
    #v09CraftOverlay #v010ReadyList>.v011OutputCell.empty{opacity:.32;cursor:default}#v09CraftOverlay #v010ReadyList>.v011OutputCell.empty>.itemIcon{visibility:hidden}
    #v09CraftOverlay #v010ReadyList>.v011OutputCell>.itemIcon{width:45px;height:45px;max-width:100%;object-fit:contain}
    #v09CraftOverlay #v010ReadyList>.v011OutputCell>small{position:absolute;bottom:3px;right:5px;font-size:10px;font-weight:400;color:#e4eee2;text-shadow:0 1px 3px #071813;line-height:1}
    #v09CraftOverlay #v011OutputLabel{font-size:10px;color:#95b39b;height:17px;line-height:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
    #v09CraftOverlay .v011OutputActions{display:flex;justify-content:flex-end;gap:6px;margin-top:3px}
    #v09CraftOverlay .v011OutputActions .menuButton{width:auto;min-width:100px;min-height:35px;padding:6px 10px;font-size:10px;border-radius:7px;border:1px solid #7b9f8645;background:#8dad8e0e;margin:0;color:#c0d5be}
    #v09CraftOverlay .v011OutputActions .menuButton:disabled{opacity:.35}
    #v09GeneratorOverlay .v09Panel{width:min(420px,94vw);padding:14px;border-radius:14px}#v09GeneratorOverlay .v09Title{font-size:16px}
    #v09GeneratorOverlay .v09PowerStats{gap:6px;margin:4px 0}#v09GeneratorOverlay .v09PowerStat{padding:7px;font-size:12px}#v09GeneratorOverlay .v09PowerStat small{font-size:10px}
    #v09GeneratorOverlay .v09PowerNote{font-size:11px;color:#9fb7a7;line-height:1.4;margin:7px 0}
    #v09GeneratorOverlay .v09PowerActions{display:flex;gap:6px;justify-content:center}
    #v09GeneratorOverlay .v09PowerActions .menuButton{width:auto;min-height:38px;padding:7px 10px;font-size:11px;border:1px solid #799c813c;background:#83a18a10;margin:0;border-radius:7px}
    #v09GeneratorOverlay .v011FuelHero{position:relative;width:140px;height:180px;margin:8px auto 14px;border:2px solid #719094;border-radius:22px;background:linear-gradient(90deg,#2a454c,#688187 42%,#334c54);box-shadow:inset 6px 0 12px #ffffff09,0 9px 16px #07141755}
    #v09GeneratorOverlay .v011FuelHero:before{content:'';position:absolute;top:14px;left:11px;right:11px;height:8px;background:#152b33;border-radius:5px}
    #v09GeneratorOverlay .v011FuelHero:after{content:'FUEL';position:absolute;left:17px;top:76px;color:#c9d6c4;font-size:12px;letter-spacing:2px}
    #v09GeneratorOverlay .v09TankGauge{position:absolute;right:15px;top:32px;width:25px;height:117px;margin:0;border:2px solid #a9bdb1;border-radius:5px;overflow:hidden;background:linear-gradient(90deg,#152b35,#203940);box-shadow:inset 0 0 5px #040b10}
    #v09GeneratorOverlay .v09TankGauge i{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(90deg,#947138,#ebc77b 65%,#d4aa5c);transition:height .3s}
    #v09GeneratorOverlay .v011TankValue{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-size:12px;color:#e3ead9;font-weight:500;font-variant-numeric:tabular-nums}
    #v09GeneratorOverlay .v011GeneratorSwitch{display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px;font-size:13px;padding:10px;border:1px solid #668b7555;background:#6d9b7310;border-radius:9px;gap:12px}
    #v09GeneratorOverlay .v011GeneratorSwitch button{min-height:34px;min-width:100px;width:auto;font-size:11px;margin:0;padding:5px 12px;background:#2e5747;border:1px solid #83ac8b77;border-radius:20px}
    #v09GeneratorOverlay .v011GeneratorArt{display:block;width:140px;height:110px;object-fit:contain;margin:5px auto}
    @media(max-width:540px){
      #v09CraftOverlay .v09Panel{padding:9px}
      #v09CraftOverlay .v092CraftLayout{grid-template-columns:76px minmax(0,1fr);gap:6px}
      #v09CraftOverlay .v092RecipeList{padding-right:3px}
      #v09CraftOverlay .v092Recipe{height:60px;min-height:60px;max-height:60px;flex-basis:60px;flex-direction:column;gap:0;padding:1px;margin:1px 0}
      #v09CraftOverlay .v092Recipe>.itemIcon{width:36px;min-width:36px;max-width:36px;height:36px;min-height:36px;max-height:36px;flex-basis:36px}
      #v09CraftOverlay .v092Recipe>span{font-size:8px;text-align:center;line-height:1.15;white-space:nowrap;max-width:100%}
      #v09CraftOverlay .v092Recipe small{font-size:7.5px;margin-top:1px}
      #v09CraftOverlay .v011RecipeFlow{grid-template-columns:minmax(0,1fr) 12px minmax(0,1fr);gap:2px}
      #v09CraftOverlay .v092RecipeDetails{padding:5px 3px}
      #v09CraftOverlay .v092RecipeHero>.itemIcon{width:80px;height:80px}
      #v09CraftOverlay .v092RecipeHero>b{font-size:9px}
      #v09CraftOverlay .v092Ingredient{font-size:8px;min-height:34px;gap:3px}
      #v09CraftOverlay .v092Ingredient>.itemIcon{width:26px;height:26px;min-width:26px;flex-basis:26px}
      #v09CraftOverlay .v092Ingredient strong{font-size:9px}
      #v09CraftOverlay .v011RecipeArrow{font-size:16px}
      #v09CraftOverlay .v011BatchControls{gap:1px}
      #v09CraftOverlay .v091QuantityCount{font-size:9px}
      #v09CraftOverlay .v09CraftQuantity button{min-width:31px;flex-basis:31px;width:31px}
      #v09CraftOverlay #v010ReadyList{gap:4px}
      #v09CraftOverlay #v010ReadyList>.v011OutputCell>.itemIcon{width:40px;height:40px}
    }
    @media(max-width:350px){
      #v09CraftOverlay .v092CraftLayout{grid-template-columns:66px minmax(0,1fr);gap:4px}
      #v09CraftOverlay .v011RecipeFlow{grid-template-columns:minmax(0,1fr) 10px minmax(0,1fr)}
      #v09CraftOverlay .v092Ingredient>.itemIcon{width:23px;height:23px;min-width:23px;flex-basis:23px}
      #v09CraftOverlay .v011BatchControls{justify-content:flex-end}
      #v09CraftOverlay .v091QuantityCount{margin-right:auto}
    }
    @media(max-height:500px){#v09CraftOverlay .v09Panel{height:94dvh;max-height:94dvh;padding:8px}#v09CraftOverlay .v091CraftActions{height:126px;min-height:126px;max-height:126px;flex-basis:126px;padding-top:3px}#v09CraftOverlay #v010ReadyList{height:45px;min-height:45px;max-height:45px;grid-auto-rows:45px}#v09CraftOverlay #v010ReadyList>.v011OutputCell{min-height:45px;height:45px}#v09CraftOverlay #v010ReadyList>.v011OutputCell>.itemIcon{width:35px;height:35px}#v09CraftOverlay .v011OutputHead{margin-bottom:3px;line-height:13px}#v09CraftOverlay .v011OutputActions .menuButton{min-height:32px}#v09CraftOverlay #v011OutputLabel{height:14px;line-height:14px}}
  `);
  v09OpenGenerator=function(refuel=false){
    const overlay=v09Overlay('v09GeneratorOverlay',refuel?'Топливный бак':'Генератор'),body=overlay.querySelector('.v09Body');body.replaceChildren();
    if(refuel){
      const hero=document.createElement('div');hero.className='v011FuelHero';I18n.assign(hero,"innerHTML",'<div class="v09TankGauge"><i data-power="tankbar"></i></div><b class="v011TankValue" data-power="tankvalue"></b>');body.append(hero);
      const note=document.createElement('p');note.className='v09PowerNote';note.dataset.power='bagfuel';body.append(note);
      const actions=document.createElement('div');actions.className='v09PowerActions';
      for(const n of [10,100]){const b=v09Button(n===10?'Добавить 10':'Заправить до максимума',()=>v09Refuel(n));b.dataset.refuel=String(n);actions.append(b);}body.append(actions);
    }else{
      const sources=window.V011Art?.sources;
      if(sources?.generator){const img=document.createElement('img');img.className='v011GeneratorArt';img.src=sources.generator;I18n.assign(img,"alt",'Генератор');body.append(img);}
      const stats=document.createElement('div');I18n.assign(stats,"innerHTML",v09PowerStats());body.append(stats);
      const row=document.createElement('div');row.className='v011GeneratorSwitch';const status=document.createElement('span');status.dataset.power='running';row.append(status);
      const toggle=v09Button('',v09ToggleGenerator);toggle.dataset.power='generatorToggle';toggle.setAttribute('role','switch');row.append(toggle);body.append(row);
      const note=document.createElement('p');note.className='v09PowerNote';I18n.assign(note,"textContent",'Свободная мощность заряжает батарею. Производство сохраняет прогресс при остановке.');body.append(note);
    }
    v09RefreshPowerUI();openOverlay(overlay);
  };
  const refresh=v09RefreshPowerUI;
  v09RefreshPowerUI=function(){
    refresh();const o=el('v09GeneratorOverlay');if(!o)return;
    const toggle=o.querySelector('[data-power="generatorToggle"]');if(toggle){I18n.assign(toggle,"textContent",V09Power.running?'Остановить':'Включить');toggle.setAttribute('aria-checked',String(V09Power.running));toggle.classList.toggle('on',V09Power.running);}
    for(const b of o.querySelectorAll('[data-refuel]'))b.disabled=bagCount('fuel')<=0||Math.floor(V09Power.capacity-V09Power.fuel)<=0;
  };
  return {get ammunition(){return Object.fromEntries(Object.keys(ITEM).filter(type=>ITEM[type].ammo).map(type=>[type,V09Craft.weaponsForAmmo(type)[0]]));}};
})();

