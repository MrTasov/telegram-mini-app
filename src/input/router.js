/* One Pointer Events router for both interfaces. Installed once, before camera
   pinch listeners; switching modes changes state, never listener registration. */
window.GameInput=(()=>{
  'use strict';
  const KEY='last_base_control_mode_v1',MODES=['AUTO','PC','MOBILE'];
  const queries=['(pointer: fine)','(hover: hover)','(pointer: coarse)','(any-pointer: fine)','(any-hover: hover)'].map(q=>window.matchMedia?.(q));
  let preference='AUTO',observed=null,pcPress=null,mounted=false,onModeChange=null,shownMode=null,shownPreference=null;
  try{const value=localStorage.getItem(KEY);if(MODES.includes(value))preference=value;}catch(_){}
  function detect(){
    if(queries[0]?.matches&&queries[1]?.matches)return 'PC';
    if(queries[2]?.matches)return 'MOBILE';
    if(queries[3]?.matches&&queries[4]?.matches)return 'PC';
    return navigator.maxTouchPoints>0?'MOBILE':'PC';
  }
  let mode=preference==='AUTO'?detect():preference;
  const active=()=>pcPress!==null||objectPointer!==null||leftPointerId!==null||rightPointerId!==null||!!window.V010Camera?.touchActive;
  function release(){
    const press=pcPress;pcPress=null;
    if(press){try{canvas.releasePointerCapture?.(press.id);}catch(_){} }
    window.V014Controls?.releaseInput();
  }
  function apply(){
    const next=preference==='AUTO'?(observed||detect()):preference;
    if(next!==mode&&mounted){stopControls(true);window.V010Camera?.resetTouch();}
    mode=next;
    if(mounted&&(shownMode!==mode||shownPreference!==preference)){
      shownMode=mode;shownPreference=preference;
      document.body.dataset.controlMode=mode;document.body.dataset.controlPreference=preference;onModeChange?.(preference,mode);
    }
  }
  function setMode(value){
    if(!MODES.includes(value))return false;
    preference=value;observed=null;apply();
    try{localStorage.setItem(KEY,value);}catch(_){message('Режим изменён. Браузер не разрешил сохранить настройку.');}
    return true;
  }
  function observe(e){
    if(preference!=='AUTO'||active())return;
    const next=e.pointerType==='touch'||e.pointerType==='pen'?'MOBILE':e.pointerType==='mouse'?'PC':null;
    if(next){observed=next;apply();}
  }
  // No width or user-agent guesses. A hybrid can use either actual input.
  window.addEventListener('pointerdown',observe,true);
  function capabilitiesChanged(){if(preference!=='AUTO')return;observed=null;if(!active())apply();}
  for(const q of queries){if(q?.addEventListener)q.addEventListener('change',capabilitiesChanged);else q?.addListener?.(capabilitiesChanged);}
  const world=e=>e.target===canvas;
  function aim(){
    if(!pcPress)return;
    if(mode!=='PC'||pcPress.scene!==scene||!GameActions.playable()){stopPC();return;}
    const target=window.V0105?.target,p=target||screenToWorld(pcPress.x,pcPress.y);
    GameActions.dispatch('AIM',{kind:'world',x:p.x,y:p.y});
  }
  function stopPC(){
    if(!pcPress)return;
    release();GameActions.dispatch('FIRE',{active:false});GameActions.dispatch('AIM',{active:false});
    if(movePower>JOY_DEAD){player.aimX=moveX;player.aimY=moveY;}
  }
  function down(e){
    if(!GameActions.playable()||!world(e)||uiTouch(e.target))return;
    if(mode==='PC'){
      if(e.button===2&&e.pointerType==='mouse'){
        e.preventDefault();if(active())return;
        pcPress={id:e.pointerId,x:e.clientX,y:e.clientY,scene};
        try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}
        aim();GameActions.dispatch('FIRE',{active:true,immediate:true});return;
      }
      if(pcPress||e.button>0)return;
    }
    handleWorldPointerDown(e);
  }
  function move(e){
    if(pcPress){
      if(e.pointerId===pcPress.id){
        // With mouse chords, releasing RMB may be pointermove, not pointerup.
        if(typeof e.buttons==='number'&&!(e.buttons&2)){stopPC();return;}
        pcPress.x=e.clientX;pcPress.y=e.clientY;aim();e.preventDefault();
      }
      return;
    }
    if(objectPointer||leftPointerId!==null||rightPointerId!==null)handleWorldPointerMove(e);
  }
  function up(e){
    if(pcPress?.id===e.pointerId){stopPC();e.preventDefault();return;}
    handleWorldPointerUp(e);releaseFixedStick(e);window.V014Controls?.release(e);
  }
  function cancel(e){
    if(pcPress?.id===e.pointerId)stopPC();
    cancelWorldPointer(e);releaseFixedStick(e);window.V014Controls?.release(e);
  }
  window.addEventListener('pointerdown',down,{passive:false});
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',up,{passive:false});
  window.addEventListener('pointercancel',cancel,{passive:false});
  window.addEventListener('lostpointercapture',cancel,true);
  window.addEventListener('blur',()=>{stopControls(true);window.V010Camera?.resetTouch();});
  window.addEventListener('contextmenu',e=>{if(mode==='PC'&&world(e))e.preventDefault();});
  function editable(node){return !!node?.closest?.('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]');}
  function topOverlay(){return [...document.querySelectorAll('.overlay.open')].sort((a,b)=>Number(b.style.zIndex||getComputedStyle(b).zIndex||0)-Number(a.style.zIndex||getComputedStyle(a).zIndex||0))[0];}
  function escape(){
    if(window.MainMenu?.active&&!topOverlay()){MainMenu.back();return;}
    const top=topOverlay();
    if(top){
      if(top.id==='deathOverlay')return;
      if(top.id==='v010MapOverlay'&&!el('v011MapFilterOptions')?.hidden){V012Map.setOptions(false);el('v011MapFilters').focus();return;}
      closeOverlay(top);return;
    }
    if(window.V016Turret?.placement){V016Turret.cancelPlacement();return;}
    GameActions.dispatch('SETTINGS');
  }
  function keydown(e){
    if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='Escape'){
      if(!e.repeat){e.preventDefault();escape();}return;
    }
    if(editable(e.target)||editable(document.activeElement))return;
    const key=e.code||({r:'KeyR',i:'KeyI',m:'KeyM',c:'KeyC'}[e.key?.toLowerCase()]||(/^[1-5]$/.test(e.key)?'Digit'+e.key:''));
    const command={KeyR:'RELOAD',KeyI:'INVENTORY',KeyM:'MAP',KeyC:'SNEAK'}[key];
    const slot=/^Digit[1-5]$/.test(key)?Number(key.slice(-1))-1:null;
    if(!command&&slot===null)return;
    if(e.repeat){e.preventDefault();return;}
    if(preference==='AUTO'&&!active()){observed='PC';apply();}
    if(mode!=='PC')return;
    const top=topOverlay(),toggle=command==='INVENTORY'?'inventoryOverlay':command==='MAP'?'v010MapOverlay':null;
    if(top){if(top.id===toggle){e.preventDefault();closeOverlay(top);}return;}
    if(!GameActions.playable())return;
    e.preventDefault();GameActions.dispatch(command||'SELECT_SLOT',slot===null?{}:{index:slot});
  }
  // Bubble phase lets focused fields consume Escape (e.g. save-slot rename).
  document.addEventListener('keydown',keydown);
  return Object.freeze({setMode,release,refreshAim:aim,
    mount(fn){if(mounted)return;mounted=true;onModeChange=fn;apply();},
    get preference(){return preference;},get mode(){return mode;},get isMobile(){return mode==='MOBILE';},
    get pcFiring(){return pcPress!==null;},get storageKey(){return KEY;}});
})();
