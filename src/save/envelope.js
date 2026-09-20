/* One atomic save envelope for all 0.10 systems. Invalid imports never mutate the live game. */
(()=>{
  const order=GameSave.moduleOrder;
  const snapshot=()=>GameSave.snapshotModules();
  V010.initialModules=clone(snapshot());
  
  GameSave.extend('capture','save.envelope',function(oldCapture){const d=oldCapture();d.gameVersion='0.28.0';d.v010={schema:1,modules:snapshot()};return d;});
  GameSave.extend('decode','save.envelope',function(oldDecode,raw){
    let d=oldDecode(raw);
    if(d.v010!==undefined){
      if(!d.v010||d.v010.schema!==1||!d.v010.modules||Array.isArray(d.v010.modules))throw Error('Некорректные данные обновления');
      for(const name of order){const m=V010.modules[name];if(m&&(!Object.hasOwn(d.v010.modules,name)||m.validate(d.v010.modules[name])===false))throw Error('Некорректное сохранение: '+name);}
    }
    const checkItem=s=>{if(s&&window.V010Combat&&V010Combat.validateItem(s)===false)throw Error('Некорректные характеристики предмета');};
    d.bag.forEach(checkItem);d.storage.forEach(c=>c.items.forEach(checkItem));Object.values(d.equipment||{}).forEach(checkItem);
    d.gameVersion='0.28.0';return d;
  });
  GameSave.extend('restore','save.envelope',function(oldRestore,d){
    const was=GameState.session.transaction;GameState.session.transaction=true;
    try{oldRestore(d);for(const name of order)V010.modules[name]?.restore(d.v010?.modules?.[name]??null);if(window.V010Inventory)V010Inventory.render();V091Light.invalidate();}
    finally{GameState.session.transaction=was;}
  });
  const oldUpdate=update;update=function(){oldUpdate();if(!GameFlow.paused)V010.modules.progression?.tick(16.667*frameScale);};
  const oldMessage=message;message=function(text){oldMessage(text);V010.log(I18n.canonical(text));};
  const label=document.querySelector('#settingsOverlay .subtitle');if(label)I18n.assign(label,"textContent",I18n.message('game.subtitle',{version:'0.28.0'}));
  for(const el of document.querySelectorAll('#versionBadge,.versionBadge,#versionLabel'))I18n.assign(el,"textContent",'VERSION 0.28.0');
  const trackers=document.createElement('div');trackers.id='v010Trackers';document.body.append(trackers);
  for(const id of ['v010PinnedRecipe','v010PinnedGoal']){const item=el(id);if(item)trackers.append(item);}
  v09Style('#versionBadge{opacity:.45!important}#v010Trackers{position:fixed;left:max(12px,env(safe-area-inset-left));top:145px;display:flex;flex-direction:column;gap:6px;max-width:220px;z-index:36;pointer-events:none}#v010Trackers>#v010PinnedRecipe,#v010Trackers>#v010PinnedGoal{position:static;margin:0;max-width:100%;box-sizing:border-box;pointer-events:auto}@media(max-height:550px){#v010Trackers{top:100px;max-width:170px;max-height:135px;overflow:auto}}');
})();
