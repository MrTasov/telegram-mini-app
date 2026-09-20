/* 0.12 — map settings stay visible in the header, with shared saved map layers. */
window.V012Map=(()=>{
  'use strict';
  const overlay=el('v010MapOverlay'),panel=overlay.querySelector('.v010MapPanel');
  const head=overlay.querySelector('.v010MapHead'),previousButton=el('v011MapFilters');
  const button=v09Button('Настройки карты');button.id=previousButton.id;previousButton.remove();
  const options=el('v011MapFilterOptions'),close=el('v010MapClose');
  const headActions=document.createElement('div');headActions.className='v012MapActions';
  button.textContent='⚙ Настройки карты';button.setAttribute('aria-controls',options.id);
  button.setAttribute('aria-label','Настройки карты: какие объекты показывать');
  close.textContent='×';close.setAttribute('aria-label','Закрыть карту');close.title='Закрыть карту';
  headActions.append(button,close);head.append(headActions);head.after(options);
  options.setAttribute('role','group');options.setAttribute('aria-label','Объекты на обеих картах');
  const description=document.createElement('div');description.className='v012MapFilterHint';
  description.textContent='На мини-карте и карте местности';options.prepend(description);
  const labels={zombies:['●','Зомби','#ef626a'],trees:['▲','Деревья','#79bd83'],ore:['◆','Руда','#b0a6f2'],buildings:['■','Постройки и машины','#d4bd8e'],interactives:['+','Другие объекты','#82d3d5']};
  const inputs={};
  for(const [i,row] of [...options.querySelectorAll('label')].entries()){
    const key=Object.keys(labels)[i],[symbol,text,color]=labels[key],input=row.querySelector('input');
    const title=row.querySelector('span');title.textContent=text;
    const icon=document.createElement('span');icon.className='v012MapKey';icon.style.color=color;icon.textContent=symbol;icon.setAttribute('aria-hidden','true');
    row.prepend(icon);row.append(input);input.id='v012MapLayer_'+key;input.setAttribute('role','switch');input.setAttribute('aria-label',text);inputs[key]=input;
  }
  function setOptions(open){options.hidden=!open;button.setAttribute('aria-expanded',String(open));button.classList.toggle('v012Active',open);}
  // Replace the legacy handler: the same saved checkboxes now live above the map canvas.
  button.onclick=()=>setOptions(options.hidden);
  overlay.addEventListener('pointerdown',e=>{if(!options.hidden&&!options.contains?.(e.target)&&!e.target.closest?.('#v011MapFilterOptions,#v011MapFilters'))setOptions(false);});
  close.addEventListener('click',()=>setOptions(false));
  const oldShow=V010Camera.showMap;
  V010Camera.showMap=function(...args){setOptions(false);return oldShow(...args);};
  // Settings has a closure-bound map opener in older versions; point it at the public opener.
  el('v010OpenMap').onclick=()=>V010Camera.showMap();
  el('v010MapMark').textContent='Добавить метку';el('v010MapGoal').textContent='Выбрать цель';
  el('v010MapDelete').textContent='Удалить метку';el('v011ClearMapGoal').textContent='Снять цель';
  v09Style(`
    #v010MapOverlay{position:fixed;box-sizing:border-box;padding:max(8px,var(--v011-game-top,10px)) max(8px,env(safe-area-inset-right,0px)) max(10px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));}
    #v010MapOverlay .v010MapPanel{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:min(900px,100%);height:100%;max-height:780px;overflow:hidden;padding:11px;border-radius:13px;background:#152423f5;}
    #v010MapOverlay .v010MapHead{flex:0 0 auto;min-height:38px;gap:8px;}
    #v010MapOverlay .v010MapHead>b{font-size:14px;line-height:1.2;}
    #v010MapOverlay .v012MapActions{display:flex;align-items:center;gap:6px;flex:0 0 auto;}
    #v010MapOverlay .v010MapHead .menuButton{margin:0;width:auto;min-height:36px;font-size:12px;padding:6px 9px;border-radius:8px;}
    #v010MapOverlay #v011MapFilters{color:#daebe2;background:#2c4540;border-color:#91baa066;white-space:nowrap;}
    #v010MapOverlay #v011MapFilters.v012Active{background:#47675a;border-color:#b8d4ad;}
    #v010MapOverlay #v010MapClose{width:36px;padding:0;font-size:24px;line-height:1;}
    #v010MapOverlay #v011MapFilterOptions{position:absolute;z-index:3;top:56px;right:11px;width:min(285px,calc(100% - 22px));max-height:calc(100% - 72px);overflow-y:auto;box-sizing:border-box;margin:0;padding:10px;display:flex;flex-direction:column;gap:2px;border:1px solid #a9c3ad55;border-radius:10px;background:#1c302efc;box-shadow:0 7px 26px #0007;touch-action:pan-y;overscroll-behavior:contain;}
    #v010MapOverlay #v011MapFilterOptions[hidden]{display:none;}
    #v010MapOverlay .v012MapFilterHint{font-size:10px;line-height:1.35;color:#a6bdb3;padding:2px 4px 7px;}
    #v010MapOverlay #v011MapFilterOptions label{display:flex;gap:9px;min-height:38px;padding:1px 5px;font-size:12px;line-height:1.25;border-radius:6px;cursor:pointer;}
    #v010MapOverlay #v011MapFilterOptions label:hover{background:#a8c6b111;}
    #v010MapOverlay .v012MapKey{width:15px;text-align:center;flex:0 0 15px;font-size:14px;}
    #v010MapOverlay #v011MapFilterOptions input{margin-left:auto;width:19px;height:19px;min-width:19px;accent-color:#9bc29f;cursor:pointer;}
    #v010MapOverlay #v010WorldMap{width:100%;height:auto!important;min-height:100px;flex:1 1 0;max-height:none;margin:8px 0;}
    #v010MapOverlay .v010MapTools{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:5px;}
    #v010MapOverlay .v010MapTools input{height:34px;box-sizing:border-box;min-width:110px;font-size:11px;}
    #v010MapOverlay .v010MapTools .menuButton{min-height:34px;padding:5px 8px;font-size:11px;}
    #v010MapOverlay #v010MapHint{flex:0 0 auto;margin:7px 0 0;font-size:10px;}
    #v010MapOverlay .v010MapLegend{flex:0 0 auto;font-size:10px;margin-top:6px;gap:4px 9px;}
    @media(max-width:540px){#v010MapOverlay .v010MapHead>b{font-size:12px;max-width:110px;}#v010MapOverlay .v010MapHead .menuButton{font-size:11px;padding:5px 7px;}#v010MapOverlay .v010MapTools{display:grid;grid-template-columns:1fr 1fr;}#v010MapOverlay .v010MapTools input{grid-column:1/-1;width:100%;}#v010MapOverlay .v010MapTools .menuButton{width:100%;}}
    @media(max-height:480px){#v010MapOverlay .v010MapPanel{padding:7px;}#v010MapOverlay .v010MapHead{min-height:32px;}#v010MapOverlay .v010MapHead .menuButton{min-height:32px;}#v010MapOverlay #v010WorldMap{min-height:70px;margin:5px 0;}#v010MapOverlay #v010MapHint,#v010MapOverlay .v010MapLegend{display:none;}#v010MapOverlay #v011MapFilterOptions{top:44px;right:7px;max-height:calc(100% - 51px);}#v010MapOverlay .v010MapTools{display:flex;}#v010MapOverlay .v010MapTools input{max-width:140px;}#v010MapOverlay .v010MapTools .menuButton{min-height:30px;font-size:10px;}}
  `);
  function drawRoads(c){
    const roads=window.V012Expansion?.roads||[];
    c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle='#657167';
    for(const road of roads){if(!road.points?.length)continue;c.lineWidth=road.width;c.beginPath();road.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
    c.restore();
  }
  return {setOptions,inputs,drawRoads};
})();

/* 0.12 — smaller inventory windows; shared background opacity, native scrolling. */
window.V012Windows=(()=>{
  'use strict';
  const KEY='survival_base_window_opacity_v012',levels=[100,70,40],buttons=[];
  let opacity=100;
  try{const saved=Number(localStorage.getItem(KEY));if(levels.includes(saved))opacity=saved;}catch(_){}
  function apply(){
    document.documentElement.style.setProperty('--v012-window-alpha',String(opacity/100));
    for(const button of buttons){
      button.textContent='◐ '+opacity+'%';
      const label='Непрозрачность фона: '+opacity+'%. Нажмите, чтобы изменить';
      button.title=label;button.setAttribute('aria-label',label);
    }
  }
  function setOpacity(value){
    value=Number(value);if(!levels.includes(value))return false;
    opacity=value;apply();
    try{localStorage.setItem(KEY,String(opacity));}catch(_){}
    return true;
  }
  function cycle(){setOpacity(levels[(levels.indexOf(opacity)+1)%levels.length]);}
  for(const id of ['inventoryGrid','storageContents','storageBag']){
    const bar=document.querySelector('[data-for-grid="'+id+'"]');if(!bar)continue;
    const button=document.createElement('button');button.type='button';
    button.id='v012Opacity_'+id;button.className='v010SmallAction v012OpacityControl';
    button.addEventListener('click',cycle);
    bar.children[0].after(button);buttons.push(button);
  }
  // Move the existing close buttons with their handlers intact. They stay reachable
  // while scrolling a long backpack or chest; no frame polling or grid rebuilds.
  for(const [id,closeId] of [['inventoryOverlay','closeInventory'],['storageOverlay','closeStorage']]){
    const panel=el(id)?.querySelector('.panel'),close=el(closeId),title=panel?.querySelector('h2');
    if(!panel||!close||!title)continue;
    const header=document.createElement('div');header.className='v012InventoryHeader';
    title.before(header);header.append(title,close);
    close.textContent='×';close.classList.add('v012InventoryClose');
    close.title='Закрыть';close.setAttribute('aria-label','Закрыть');
  }
  apply();
  v09Style(`
    :root{--v012-window-alpha:.9}
    #inventoryOverlay,#storageOverlay{
      position:fixed;box-sizing:border-box;
      padding:calc(max(env(safe-area-inset-top,0px),var(--v011-hud-top,10px)) + 12px)
        calc(env(safe-area-inset-right,0px) + 20px)
        calc(env(safe-area-inset-bottom,0px) + 20px)
        calc(env(safe-area-inset-left,0px) + 20px);
      background:rgba(0,0,0,.19);backdrop-filter:none;-webkit-backdrop-filter:none;
    }
    #inventoryOverlay .panel,#storageOverlay .panel{
      box-sizing:border-box;width:min(480px,100%);max-width:480px;
      max-height:min(660px,76vh,100%);max-height:min(660px,76dvh,100%);
      padding:11px 12px 13px;overflow-y:auto;overflow-x:hidden;
      background:rgba(17,29,33,var(--v012-window-alpha));
      border:1px solid #b9d0c64d;box-shadow:0 12px 35px #0005;
      border-radius:14px;overscroll-behavior:contain;touch-action:pan-y;
      -webkit-overflow-scrolling:touch;overflow-anchor:none;scrollbar-width:thin;
    }
    #storageOverlay .panel{width:min(440px,100%);max-width:440px}
    .v012InventoryHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;
      position:sticky;top:-11px;z-index:3;margin:-1px 0 3px;padding:0 0 3px;
      background:rgba(17,29,33,var(--v012-window-alpha));border-bottom:1px solid #adc5bd22}
    .v012InventoryHeader h2{font-size:16px!important;line-height:1.3;margin:0!important;min-width:0;overflow-wrap:anywhere}
    .v012InventoryHeader .v012InventoryClose{width:40px;height:40px;min-width:40px;min-height:40px;
      margin:0;padding:0;font-size:26px;line-height:1;border:0;border-radius:8px;background:transparent;color:#c8d9d2}
    #inventoryOverlay .subtitle,#storageOverlay .subtitle{font-size:10px;line-height:1.45;margin-bottom:8px}
    #inventoryOverlay .sectionTitle,#storageOverlay .sectionTitle{font-size:11px;font-weight:500;margin-top:8px}
    #inventoryOverlay .characterInventory{grid-template-columns:minmax(0,1fr) minmax(114px,.92fr);gap:8px;margin:6px 0}
    #inventoryOverlay .equipColumn{gap:4px}
    #inventoryOverlay .equipSlot{box-sizing:border-box;min-height:46px;padding:4px 5px;border-radius:7px}
    #inventoryOverlay .equipIcon{width:32px;flex-shrink:0}
    #inventoryOverlay .equipIcon .itemIcon{width:31px;height:31px}
    #inventoryOverlay .equipSlot b{font-size:10px;font-weight:500}
    #inventoryOverlay .equipSlot small{font-size:9px}
    #inventoryOverlay .characterCard{min-height:0;padding:7px;background:rgba(25,44,44,.26);border-radius:9px}
    #inventoryOverlay .characterFigure{font-size:48px}
    #inventoryOverlay #characterStats .v011StatRow{font-size:10px;gap:4px;padding:4px 0}
    #inventoryOverlay .quickSlots{gap:5px;margin:6px 0 7px}
    #inventoryOverlay .quickSlot{height:44px;min-height:44px;border-radius:7px;font-size:10px}
    #inventoryOverlay .quickSlot .itemIcon{width:34px;height:34px}
    #inventoryOverlay .inventoryGrid,#storageOverlay .inventoryGrid{
      grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:5px;margin:6px 0 10px;
    }
    #inventoryOverlay .v010Slot,#storageOverlay .v010Slot{height:52px!important;min-height:52px!important;min-width:44px;
      background:rgba(18,35,38,.48);border-color:#9bb6ad55;touch-action:pan-y!important}
    #inventoryOverlay .v010Slot.locked,#storageOverlay .v010Slot.locked{background:rgba(39,61,60,.60)}
    #inventoryOverlay .v010Slot.quickAssigned,#storageOverlay .v010Slot.quickAssigned{border-color:#d4b96c}
    #inventoryOverlay .v010Slot .ico,#storageOverlay .v010Slot .ico{height:44px!important}
    #inventoryOverlay .v010Slot .ico .itemIcon,#storageOverlay .v010Slot .ico .itemIcon{width:43px!important;height:43px!important}
    #inventoryOverlay .v010InvToolbar,#storageOverlay .v010InvToolbar{gap:4px;margin:2px 0;align-items:center;flex-wrap:wrap}
    #inventoryOverlay .v010SmallAction,#storageOverlay .v010SmallAction{min-height:36px;min-width:36px;
      font-size:13px;padding:4px 8px;background:rgba(40,61,62,.6);border-color:#9eb8ad33;border-radius:7px}
    #inventoryOverlay .v012OpacityControl,#storageOverlay .v012OpacityControl{font-size:11px;min-width:65px;white-space:nowrap;color:#b9d0c7}
    #storageSettings{font-size:14px;color:#d0ddd7;background:rgba(40,61,62,.6);border:1px solid #9eb8ad33}
    @media(max-width:450px){
      #inventoryOverlay .inventoryGrid,#storageOverlay .inventoryGrid{grid-template-columns:repeat(5,minmax(0,1fr))!important}
    }
    @media(max-width:330px){
      #inventoryOverlay .inventoryGrid,#storageOverlay .inventoryGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      #inventoryOverlay .characterInventory{grid-template-columns:minmax(0,1fr) minmax(100px,.9fr);gap:5px}
      #inventoryOverlay #characterStats .v011StatRow{font-size:9px}
    }
    @media(max-height:500px){
      #inventoryOverlay .panel,#storageOverlay .panel{max-height:calc(100dvh - max(env(safe-area-inset-top,0px),var(--v011-hud-top,10px)) - env(safe-area-inset-bottom,0px) - 40px)}
    }
  `);
  return {setOpacity,cycle,get opacity(){return opacity;},storageKey:KEY,levels:levels.slice()};
})();

/* 0.12: consistent car bodywork, softer notices and actual mining-driven motion. */
window.V012Effects=(()=>{
  v09Style(`#message{max-width:min(390px,84vw);box-sizing:border-box;text-align:center;font-size:12px;line-height:1.45;padding:8px 12px;background:rgba(18,35,37,.64);border:1px solid #acc4b22b;color:#e6eee7;border-radius:11px;transform:translate(-50%,7px);transition:opacity .48s ease,transform .48s ease;will-change:opacity,transform}#message.show{opacity:.94;transform:translate(-50%,0)}@media(prefers-reduced-motion:reduce){#message{transition:opacity .15s;transform:translateX(-50%)}}`);
  V09World.isMining=()=>!!V09World.miningState();
  function phase(m){return (m.elapsed%450)/450;}
  function pickaxeSwing(){
    const m=V09World.miningState();if(!m)return -.3;
    const p=phase(m);
    // Slow backswing, quick strike, soft recovery; repeats four times per batch.
    if(p<.52)return -.7-p/.52*.65;
    if(p<.70)return -1.35+(p-.52)/.18*2.15;
    return .8-(p-.70)/.30*1.5;
  }
  function oreImpactTransform(m){const p=phase(m),force=p>=.7?Math.max(0,1-(p-.7)/.2):0;ctx.translate(Math.sin(p*95)*force*1.8,Math.cos(p*73)*force);}
  function drawOreImpact(o,m){
    const p=phase(m);if(p<.7)return;const t=(p-.7)/.3;
    // Local deposit coordinates; fragments stay small and fade before next blow.
    const angle=Math.atan2(player.y-o.y,player.x-o.x),ox=Math.cos(angle)*o.r*.7,oy=Math.sin(angle)*o.r*.7;
    ctx.save();ctx.globalAlpha*=1-t;
    for(let k=0;k<7;k++){const a=angle+(k-3)*.32,d=4+t*(12+k%3*5),x=ox+Math.cos(a)*d,y=oy+Math.sin(a)*d-Math.sin(t*Math.PI)*9;
      ctx.save();ctx.translate(x,y);ctx.rotate(k+t*4);ctx.fillStyle=k%3===0?(o.type==='copper_ore'?'#cc935d':'#d3dcda'):'#92998b';ctx.fillRect(-1.3,-1,2.6+(k%2),2);ctx.restore();}
    ctx.strokeStyle='#d1d3b77a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ox,oy,3+t*7,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function drawCar(o){
    if(!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,150))return;
    ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);
    if(o.w>o.h)ctx.rotate(Math.PI/2);
    const w=Math.min(o.w,o.h),h=Math.max(o.w,o.h);
    ctx.fillStyle='#101a2155';ctx.beginPath();ctx.roundRect(-w*.43+3,-h*.46+5,w*.86,h*.92,8);ctx.fill();
    if(!window.V011Art?.draw('car',-w*.675,-h/2,w*1.35,h)){
      const g=ctx.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,'#51463a');g.addColorStop(.45,'#97806a');g.addColorStop(1,'#564b3e');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-w*.45,-h*.48,w*.90,h*.96,11);ctx.fill();ctx.fillStyle='#263c45';ctx.fillRect(-w*.33,-h*.20,w*.66,h*.46);
    }
    ctx.restore();
    if(Math.hypot(player.x-o.x-o.w/2,player.y-o.y-o.h/2)<180){ctx.fillStyle='#dfdbc2';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(hasSearchableLoot(o)?'ОБЫСКАТЬ':'ПУСТО',o.x+o.w/2,o.y-10);}
  }
  drawParkedCars=function(){for(const o of scavenges)if(o.kind==='car')drawCar(o);};
  return{pickaxeSwing,oreImpactTransform,drawOreImpact,drawCar};
})();

