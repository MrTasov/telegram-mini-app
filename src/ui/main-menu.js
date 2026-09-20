/* Start screen owns presentation and launch selection, never simulation or save data.
   Background implementation is isolated from menu actions: animated WebP works
   through <picture>; future video is configured here without changing save/UI logic. */
const MenuBackground=(()=>{
  const config={type:'image',video:{portrait:'',landscape:''}};
  let video=null,query=null,listener=null;
  function mount(){
    if(config.type!=='video')return;
    const host=el('mainMenuMedia');query=window.matchMedia('(orientation: portrait)');
    video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.setAttribute('aria-hidden','true');
    const poster=host.querySelector('img');if(poster)video.poster=poster.currentSrc||poster.src;
    listener=()=>{const src=config.video[query.matches?'portrait':'landscape'];if(!src)return;video.src=src;video.play()?.catch(()=>{});};
    host.replaceChildren(video);query.addEventListener?.('change',listener);listener();
  }
  function release(){if(video){video.pause();video.removeAttribute('src');video.load();}query?.removeEventListener?.('change',listener);el('mainMenuMedia').replaceChildren();video=query=listener=null;}
  return {config,mount,release};
})();
window.MainMenu=(()=>{
  let active=true,mounted=false,busy=false,start=null,screen='home',pending=null,fullscreenGestureUsed=false;
  const root=()=>el('mainMenu');
  const put=(node,key,params={})=>I18n.assign(node,'textContent',I18n.message('menu.'+key,params));
  function status(key){const node=el('mainMenuStatus');if(key)put(node,key);else I18n.assign(node,'textContent','');}
  // Read-only preview, with the same decoder and independent backup fallback as gameplay.
  function inspect(){
    try{
      const slots=Array.from({length:V09_SLOT_COUNT},(_,i)=>v09ReadSlot(i+1));
      const current=Number(localStorage.getItem(V09_ACTIVE_KEY));
      const valid=slots.filter(s=>s&&!s.invalid).sort((a,b)=>b.data.savedAt-a.data.savedAt||Number(b.id===current)-Number(a.id===current)||a.id-b.id);
      let legacy=null;
      if(!valid.length&&localStorage.getItem('survival_base_slots_deleted')!=='1')for(const key of [GAME_SAVE_KEY,GAME_SAVE_BACKUP_KEY]){
        const raw=localStorage.getItem(key);if(raw===null)continue;try{legacy={data:decodeGameProgress(raw)};break;}catch(_){}
      }
      return {slots,latest:valid[0]||null,legacy,error:false};
    }catch(_){return {slots:[],latest:null,legacy:null,error:true};}
  }
  function refresh(){
    if(!active)return;const data=inspect();el('menuContinue').disabled=data.error||(!data.latest&&!data.legacy);
    el('menuNew').disabled=data.error;el('menuLoad').disabled=data.error;
    if(data.error)status('storage');
    if(screen==='new'||screen==='load')renderSlots(data);
  }
  function closePanels(){for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);}
  function sessionSelected(){
    if(!active||!start||!GameState.session.activeSlot||GameState.session.blocked)return false;
    active=false;busy=false;pending=null;closePanels();root().hidden=true;document.body.classList.remove('main-menu-active');MenuBackground.release();
    V0161UI.sync();start();canvas.focus?.();return true;
  }
  function run(fn){
    if(!active||busy)return false;busy=true;status(null);
    try{if(!fn()){status('failed');refresh();return false;}return true;}
    catch(_){status('storage');return false;}
    finally{busy=false;}
  }
  function continueGame(){return run(()=>{const data=inspect();if(data.error)return false;if(data.latest)return V09Saves.load(data.latest.id);
    if(data.legacy){if(!loadGameProgress(false))return false;return sessionSelected();}return false;});}
  function chooseNew(id){
    if(!active||busy)return;const data=inspect();if(data.error){status('storage');return;}const entry=data.slots[id-1];
    if(!entry){run(()=>V09Saves.newGame(id));return;}
    try{pending={id,primary:localStorage.getItem(v09SlotKey(id)),backup:localStorage.getItem(v09BackupKey(id))};}
    catch(_){status('storage');return;}
    el('mainMenuSlots').hidden=true;el('mainMenuConfirm').hidden=false;
    put(el('mainMenuConfirmText'),'confirm',{slot:id,name:entry.invalid?I18n.t('menu.slot',{slot:id}):entry.data.saveName});el('mainMenuCancel').focus();
  }
  function replace(){
    if(!pending||!active||busy)return false;
    const p=pending;
    try{if(p.primary!==localStorage.getItem(v09SlotKey(p.id))||p.backup!==localStorage.getItem(v09BackupKey(p.id))){pending=null;show('new');status('changed');return false;}}
    catch(_){status('storage');return false;}
    return run(()=>V09Saves.newGame(p.id,p));
  }
  function renderSlots(data=inspect()){
    const list=el('mainMenuSlots');list.replaceChildren();
    for(let id=1;id<=V09_SLOT_COUNT;id++){
      const entry=data.slots[id-1],button=document.createElement('button');button.type='button';button.className='mainMenuSlot';button.dataset.slot=String(id);
      const title=document.createElement('strong');put(title,'slot',{slot:id});button.append(title);
      const name=document.createElement('span');
      if(!entry)put(name,'empty');else if(entry.invalid)put(name,'invalid');else I18n.assign(name,'textContent',I18n.verbatim(entry.data.saveName));button.append(name);
      if(entry&&!entry.invalid){const meta=document.createElement('small');I18n.assign(meta,'textContent',I18n.dateText(entry.data.savedAt,{dateStyle:'short',timeStyle:'short'})+' · '+I18n.message('menu.'+(entry.data.player.scene==='bunker'?'bunker':'surface'))+(entry.recovered?' · '+I18n.message('menu.backup'):''));button.append(meta);}
      button.disabled=screen==='load'&&(!entry||entry.invalid);button.addEventListener('click',()=>screen==='new'?chooseNew(id):run(()=>V09Saves.load(id)));list.append(button);
    }
    if(screen==='load'&&data.legacy){const b=document.createElement('button');b.type='button';put(b,'legacy');b.onclick=continueGame;list.append(b);}
  }
  function show(next){
    if(!active)return;screen=next;pending=null;status(null);el('mainMenuButtons').hidden=next!=='home';el('mainMenuPanel').hidden=next==='home';el('mainMenuConfirm').hidden=true;el('mainMenuSlots').hidden=false;
    if(next!=='home'){put(el('mainMenuTitle'),next);put(el('mainMenuDescription'),next+'.help');renderSlots();el('mainMenuBack').focus();}else refresh();
  }
  function back(){if(!active)return;if(pending){pending=null;show('new');}else show('home');}
  function exit(){
    if(!active)return;
    try{const app=window.Telegram?.WebApp;if(app&&(app.initData||(app.platform&&app.platform!=='unknown'))&&typeof app.close==='function'){app.close();return;}}catch(_){}
    // Ordinary browser tabs cannot reliably be closed by script. Keep the menu
    // usable and explain the native close action instead of calling window.close.
    status('exit.help');
  }
  function mount(onStart){
    if(mounted)return;mounted=true;start=onStart;menuOpen=true;GameState.session.ready=false;
    // Native Telegram can enter fullscreen immediately. Browsers need a tap;
    // capture click keeps user activation and still lets the selected action run.
    if(mobileFullscreenDevice())fullscreen({allowBrowser:false,automatic:true});
    root().addEventListener('click',e=>{
      if(!active||fullscreenGestureUsed||e.target.closest?.('#menuExit'))return;
      if(e.pointerType!=='touch'&&!mobileFullscreenDevice())return;
      fullscreenGestureUsed=true;fullscreen({automatic:true});
    },true);
    for(const [id,key,fn]of [['menuContinue','continue',continueGame],['menuNew','new',()=>show('new')],['menuLoad','load',()=>show('load')],['menuSettings','settings',()=>{status(null);openOverlay(el('settingsOverlay'));}],['menuExit','exit',exit],['mainMenuBack','back',()=>show('home')],['mainMenuReplace','replace',replace],['mainMenuCancel','cancel',()=>show('new')]]){
      const b=el(id);I18n.bind(b,'menu.'+key);b.addEventListener('click',fn);b.disabled=false;
    }
    // Only preferences and controls belong to Settings before a game is selected.
    for(const n of el('settingsOverlay').querySelector('.panel').children){
      if(n.tagName==='BUTTON'&&!['fullscreenButton','openControlSettings','closeSettings'].includes(n.id))n.classList.add('requires-game');
      if(n.querySelector?.('#saveGameButton'))n.classList.add('requires-game');
    }
    I18n.onChange(()=>{if(active){I18n.setAttr(el('mainMenuButtons'),'aria-label',I18n.t('menu.nav'));if(screen!=='home'){put(el('mainMenuTitle'),screen);put(el('mainMenuDescription'),screen+'.help');renderSlots();}}});
    window.addEventListener('storage',()=>{if(active){pending=null;el('mainMenuConfirm').hidden=true;el('mainMenuSlots').hidden=false;refresh();}});
    I18n.setAttr(el('mainMenuButtons'),'aria-label',I18n.t('menu.nav'));
    MenuBackground.mount();refresh();V0161UI.sync();
  }
  return {mount,inspect,continueGame,show,back,chooseNew,replace,exit,sessionSelected,refresh,get active(){return active;}};
})();
