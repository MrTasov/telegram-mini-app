/* =====================================================
   OVERLAYS
===================================================== */

function stopControls(preserveGather=false){
  window.GameInput?.release();
  navigation=null;objectPointer=null;if(!preserveGather)cancelChop();cancelSearch();
  moveX=0; moveY=0; movePower=0;
  firing=false; aimPower=0; rightAimActive=false;
  leftPointerId=null; rightPointerId=null;
  player.moving=false; player.running=false;
  centerJoystickKnob(moveStick);
  centerJoystickKnob(aimStick);
  stopFootsteps();
}

function openOverlay(overlay){

  stopControls(true);

  menuOpen = true;

  overlay.classList.add(
    "open"
  );
  window.V0161UI?.opened(overlay);

}

function closeOverlay(overlay){
  if(!overlay)return;

  overlay.classList.remove(
    "open"
  );

  menuOpen =
    document.querySelector(
      ".overlay.open"
    ) !== null;
  window.V0161UI?.closed(overlay);

}

// Tap/click the dark area outside a menu panel to close it.
// This works for backpack, storage, livestock management, farm, settings, loot, etc.
document.querySelectorAll(".overlay").forEach(function(overlay){
  overlay.addEventListener("pointerdown",function(e){
    if(e.target !== overlay) return;
    e.preventDefault();
    e.stopPropagation();
    closeOverlay(overlay);
  });
});

el("settingsButton").addEventListener(
  "click",
  function(){

    openOverlay(
      el("settingsOverlay")
    );

  }
);

el("closeSettings").addEventListener(
  "click",
  function(){

    closeOverlay(
      el("settingsOverlay")
    );

  }
);

el("fullscreenButton").addEventListener(
  "click",
  fullscreen
);

el("closeWorkshop").addEventListener(
  "click",
  function(){

    closeOverlay(
      el("workshopOverlay")
    );

  }
);

// Temporary farm feed-crafting station — reusable crafting UI prototype
el("feedCraftClose").addEventListener("click",function(){
  closeOverlay(el("feedCraftOverlay"));
});
el("feedRecipeGrain").addEventListener("click",showFeedGrainRecipe);
el("feedCraftBack").addEventListener("click",showFeedCraftList);
el("feedMinusOne").addEventListener("click",()=>setFeedLoaded(feedCraftLoaded-1));
el("feedPlusOne").addEventListener("click",()=>setFeedLoaded(feedCraftLoaded+1));
el("feedMinusTen").addEventListener("click",()=>setFeedLoaded(feedCraftLoaded-10));
el("feedPlusTen").addEventListener("click",()=>setFeedLoaded(feedCraftLoaded+10));
el("feedAll").addEventListener("click",()=>setFeedLoaded(bagCount("grain")));
el("feedClear").addEventListener("click",()=>setFeedLoaded(0));

el("feedCraftBtn").addEventListener("click",()=>V09Craft.startFeed());

// Cow management controls
el("cowClose").addEventListener("click",function(){
  closeOverlay(el("cowOverlay"));
});

el("cowMilkBtn").addEventListener("click",function(){
  const qty=storageCount(11,"milk");
  if(qty<=0){ message("🥛 Молока пока нет."); return; }
  const left=addItem("milk",qty);
  const taken=qty-left;
  if(taken>0) removeFromSlots(storageChests[11].items,"milk",taken);
  message(taken>0 ? `🥛 Забрано молока: ${taken}` : "🎒 В рюкзаке нет места.");
  renderCowMenu();
});

el("animalEggBtn").addEventListener("click",function(){
  const qty=storageCount(10,"eggs");
  if(qty<=0){ message("🥚 Яиц пока нет."); return; }
  const left=addItem("eggs",qty);
  const taken=qty-left;
  if(taken>0) removeFromSlots(storageChests[10].items,"eggs",taken);
  message(taken>0 ? `🥚 Забрано яиц: ${taken}` : "🎒 В рюкзаке нет места.");
  renderCowMenu();
});

function refillLivestockNeed(storageIndex,type,label,icon){
  const current=storageCount(storageIndex,type);
  const capacity=100;
  const need=Math.max(0,capacity-current);
  if(need<=0){
    message(`${icon} ${label} уже заполнен.`);
    return;
  }
  const available=bagCount(type);
  if(available<=0){
    message(`${icon} В рюкзаке нет ресурса: ${label.toLowerCase()}.`);
    return;
  }
  const wanted=Math.min(need,available);
  const left=addToSlots(storageChests[storageIndex].items,type,wanted,60);
  const added=wanted-left;
  if(added>0) removeItem(type,added);
  message(`${icon} Добавлено: ${added}. Теперь ${storageCount(storageIndex,type)} / ${capacity}.`);
  renderCowMenu();
}

el("animalFeedBtn").addEventListener("click",function(){
  refillLivestockNeed(12,"animal_feed","Корм","🌾");
});

el("animalWaterBtn").addEventListener("click",function(){
  refillLivestockNeed(13,"water","Вода","💧");
});

el("cowSlaughterBtn").addEventListener("click",function(){
  const cows=livestockAnimals.filter(a=>a.kind==="cow");
  if(cows.length<=2){
    message("🐄 Нельзя: нужно оставить минимум 2 коровы для размножения.");
    renderCowMenu();
    return;
  }
  const victim=cows[cows.length-1];
  const meat=20; // test yield
  if(freeItemSpace(bag,"beef",BAG_SLOTS)+freeItemSpace(storageChests[4].items,"beef",60)<meat){
    message("🎒 Освободите место для 20 мяса в рюкзаке или ящике еды.");
    return;
  }
  const idx=livestockAnimals.indexOf(victim);
  if(idx>=0) livestockAnimals.splice(idx,1);
  const left=addItem("beef",meat);
  if(left>0) addToSlots(storageChests[4].items,"beef",left,60);
  message("🥩 Корова переработана. Получено мяса: "+meat);
  renderCowMenu();
});

/* =====================================================
   SOUND SETTING
===================================================== */

const soundSlider =
  el("soundVolume");

const soundValue =
  el("soundValue");

try{

  const savedSound =
    localStorage.getItem(
      "base_sound"
    );

  if(savedSound !== null){

    soundSlider.value =
      savedSound;

  }

}catch(e){}

masterVolume =
  Number(
    soundSlider.value
  ) / 100;

I18n.assign(soundValue,"textContent",soundSlider.value +
  "%");

soundSlider.addEventListener(
  "input",
  function(){

    masterVolume =
      Number(
        soundSlider.value
      ) / 100;

    I18n.assign(soundValue,"textContent",soundSlider.value +
      "%");

    try{

      localStorage.setItem(
        "base_sound",
        soundSlider.value
      );

    }catch(e){}

  }
);

/* =====================================================
   CONTROL EDITOR
===================================================== */

let editingMode =
  "portrait";

let editingLayout =
  clone(
    layouts.portrait
  );

const stage =
  el("editorStage");

const previews = {

  aim:
    el("previewAim"),

  action:
    el("previewAction"),

  move:
    el("previewMove"),

};

function previewPosition(element,position){

  element.style.left =
    position.x*100 +
    "%";

  element.style.top =
    position.y*100 +
    "%";

}

function renderEditor(){

  for(const key of Object.keys(previews)){

    previewPosition(
      previews[key],
      editingLayout[key]
    );

  }

}

function switchEditor(mode){

  /*
    Сохраняем временное положение текущей вкладки
    в памяти, чтобы переключение portrait/landscape
    не теряло изменения.
  */

  layouts[editingMode] =
    clone(
      editingLayout
    );

  editingMode =
    mode;

  editingLayout =
    clone(
      layouts[mode]
    );

  stage.className =
    mode;

  el("portraitTab").classList.toggle(
    "active",
    mode === "portrait"
  );

  el("landscapeTab").classList.toggle(
    "active",
    mode === "landscape"
  );

  renderEditor();

}

el("portraitTab").addEventListener(
  "click",
  function(){

    switchEditor(
      "portrait"
    );

  }
);

el("landscapeTab").addEventListener(
  "click",
  function(){

    switchEditor(
      "landscape"
    );

  }
);

function draggable(element,key){

  let pointer = null;

  function update(e){

    const rect =
      stage.getBoundingClientRect();

    let x =
      (
        e.clientX -
        rect.left
      ) /
      rect.width;

    let y =
      (
        e.clientY -
        rect.top
      ) /
      rect.height;

    const margin =
      (key === "aim" || key === "move")
      ? .09
      : .06;

    x =
      clamp(
        x,
        margin,
        1-margin
      );

    y =
      clamp(
        y,
        margin,
        1-margin
      );

    editingLayout[key] = {
      x:x,
      y:y
    };

    previewPosition(
      element,
      editingLayout[key]
    );

  }

  element.addEventListener(
    "pointerdown",
    function(e){

      e.preventDefault();

      pointer =
        e.pointerId;

      element.classList.add(
        "dragging"
      );

      try{

        element.setPointerCapture(
          e.pointerId
        );

      }catch(error){}

      update(e);

    }
  );

  element.addEventListener(
    "pointermove",
    function(e){

      if(e.pointerId !== pointer){
        return;
      }

      e.preventDefault();

      update(e);

    }
  );

  function stop(){

    pointer = null;

    element.classList.remove(
      "dragging"
    );

  }

  element.addEventListener(
    "pointerup",
    stop
  );

  element.addEventListener(
    "pointercancel",
    stop
  );

}

for(const key of Object.keys(previews)){

  draggable(
    previews[key],
    key
  );

}

el("openControlSettings").addEventListener(
  "click",
  function(){

    closeOverlay(
      el("settingsOverlay")
    );

    editingMode =
      orientation();

    editingLayout =
      clone(
        layouts[editingMode]
      );

    stage.className =
      editingMode;

    el("portraitTab").classList.toggle(
      "active",
      editingMode === "portrait"
    );

    el("landscapeTab").classList.toggle(
      "active",
      editingMode === "landscape"
    );

    renderEditor();

    openOverlay(
      el("controlOverlay")
    );

  }
);

el("saveControls").addEventListener(
  "click",
  function(){

    layouts[editingMode] =
      clone(
        editingLayout
      );

    layouts =
      sanitizeLayouts(
        layouts
      );

    saveLayouts();

    applyControls();

    message(
      "Управление сохранено"
    );

  }
);

el("resetControls").addEventListener(
  "click",
  function(){

    editingLayout =
      clone(
        defaults[editingMode]
      );

    layouts[editingMode] =
      clone(
        editingLayout
      );

    saveLayouts();

    renderEditor();

    applyControls();

    message(
      "Раскладка сброшена"
    );

  }
);

el("backControls").addEventListener(
  "click",
  function(){

    layouts =
      loadLayouts();

    closeOverlay(
      el("controlOverlay")
    );

    openOverlay(
      el("settingsOverlay")
    );

    applyControls();

  }
);


/* 0.5.0 UI */
el("bagButton").addEventListener("click",()=>GameActions.dispatch('INVENTORY'));
el('handAssignClose').addEventListener('click',()=>closeOverlay(el('handAssignOverlay')));
el("closeInventory").addEventListener("click",()=>closeOverlay(el("inventoryOverlay")));
/* Inventory interactions are installed by V010Inventory. */
el("closeLoot").addEventListener("click",()=>closeOverlay(el("lootOverlay")));
el("takeAllLoot").addEventListener("click",()=>window.V0163Loot?.take('bag'));
el("closeStorage").addEventListener("click",()=>closeOverlay(el("storageOverlay")));
/* Storage interactions are installed by V010Inventory. */
el("storageSettings").addEventListener("click",openChestSettings);
el("closeChestSettings").addEventListener("click",()=>closeOverlay(el("chestSettingsOverlay")));
el("chestIconChoices").addEventListener("click",e=>{
  const b=e.target.closest("[data-icon]");if(!b)return;
  el("chestIconChoices").querySelectorAll("button").forEach(x=>x.style.outline="");
  b.style.outline="2px solid white";el("chestSettingsOverlay").dataset.icon=b.dataset.icon;
});
el("saveChestSettings").addEventListener("click",()=>{
  const ch=storageChests[activeStorage];if(!ch)return;
  const name=el("chestNameInput").value.trim();
  if(name)ch.name=name;
  const ico=el("chestSettingsOverlay").dataset.icon;if(ico)ch.icon=ico;
  closeOverlay(el("chestSettingsOverlay"));renderStorage();message("Ящик настроен");
});

