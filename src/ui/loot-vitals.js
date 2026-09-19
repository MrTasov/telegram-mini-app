/* 0.16.3 — compact loot actions and bottom vitals. */
// An in-range interaction that opens UI is not a movement command. Some older
// object handlers release input before opening their panel; preserve work only
// for that UI transition, never for movement, damage or a new gathering target.
(()=>{
  const execute=executeInteraction;
  executeInteraction=function(...args){
    const opened=new Set(document.querySelectorAll('.overlay.open'));
    const before={chop:chopState,mining:V09World.miningState(),nav:navigation,x:player.x,y:player.y,hp:player.health,scene};
    const out=execute(...args);
    if(!playerDead&&player.health===before.hp&&scene===before.scene&&player.x===before.x&&player.y===before.y&&[...document.querySelectorAll('.overlay.open')].some(o=>!opened.has(o))){
      if(before.chop&&!chopState)chopState=before.chop;
      if(before.mining&&!V09World.miningState())V09World.resumeMining(before.mining);
      if(before.nav?.map014&&V014Controls.route)navigation=before.nav;
    }
    return out;
  };
})();
window.V0163Loot=(()=>{
  let selected=-1,source=null,capacity=6;
  const open=openLoot;openLoot=function(...args){selected=-1;capacity=6;return open(...args);};
  const panel=el('lootOverlay').querySelector('.panel'),list=el('lootList');
  const actions=document.createElement('div');actions.className='v163LootActions';
  const takeButton=el('takeAllLoot'),closeButton=el('closeLoot');
  el('v014DroneLoot')?.remove();panel.querySelector('.v0161Close')?.remove();
  const droneButton=v09Button('Забрать дроном',()=>take('drone'));droneButton.id='v014DroneLoot';
  takeButton.textContent='Забрать';actions.append(takeButton,droneButton,closeButton);panel.append(actions);
  function render(){
    if(source!==activeLootObject){source=activeLootObject;selected=-1;capacity=6;}
    if(!activeLoot?.[selected])selected=-1;
    list.className='v163LootGrid';list.replaceChildren();
    // Loot is selected, never transferred on the first tap.
    capacity=Math.max(capacity,activeLoot?.length||0);
    for(let i=0;i<capacity;i++){
      const s=activeLoot?.[i],cell=document.createElement('div');cell.className='v010Slot v163LootCell';
      if(s){cell.dataset.lootIndex=i;cell.setAttribute('role','button');cell.tabIndex=0;
        cell.innerHTML='<span class="ico">'+itemIconHTML(s.type)+'</span><span class="qty">'+s.qty+'</span>';
        cell.title=ITEM[s.type]?.name||s.type;
        const choose=()=>{selected=selected===i?-1:i;refreshSelection();};
        cell.addEventListener('click',choose);cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
      }
      list.append(cell);
    }
    refreshSelection();
  }
  function refreshSelection(){
    for(const cell of list.children){const yes=cell.dataset.lootIndex!==undefined&&Number(cell.dataset.lootIndex)===selected;cell.classList.toggle('selected',yes);if(cell.dataset.lootIndex!==undefined)cell.setAttribute('aria-pressed',String(yes));}
    refreshAvailability();
  }
  function refreshAvailability(){
    const empty=!activeLoot?.some(Boolean);takeButton.disabled=empty;droneButton.disabled=empty||!V014Robots.near();
  }
  function take(where){
    if(!activeLootObject||!activeLoot?.some(Boolean))return false;
    const drone=where==='drone';if(drone&&!V014Robots.near()){message('Дрон должен быть рядом');return false;}
    const destination=drone?V014Robots.state.cargo:bag,max=drone?V014Robots.capacity():BAG_SLOTS;
    const indices=selected>=0?[selected]:activeLoot.map((_,i)=>i);let moved=0,left=0;
    for(const i of indices){const s=activeLoot[i];if(!s)continue;
      if(drone&&ITEM[s.type]?.robot){left+=s.qty;continue;}
      // Shared slot insertion and fish helpers preserve IDs, weights and weapon
      // metadata. Remove exactly the accepted quantity from the source stack.
      const count=s.qty,part=s.type==='fish'?V014Fish.portion(s,count):JSON.parse(JSON.stringify(s));
      const remain=addToSlots(destination,s.type,count,max,part),n=count-remain;
      if(n){if(s.type==='fish')V014Fish.remove(s,n);s.qty-=n;if(!s.qty)activeLoot[i]=null;moved+=n;}left+=remain;
    }
    activeLoot=activeLoot.filter(Boolean);activeLootObject.loot=activeLoot;selected=-1;
    render();renderBag();updateAmmoHud();V014Robots.changed();queueGameSave();
    if(left)message(drone?'Недостаточно места в дроне':'Рюкзак заполнен');
    return moved>0;
  }
  renderLoot=render;
  V014Robots.dispatchLoot=()=>take('drone');
  return{take,render,refresh(){if(el('lootOverlay').classList.contains('open'))refreshAvailability();},get selected(){return selected;}};
})();

window.V0163Vitals=(()=>{
  const health=el('healthText'),oldBox=health.closest('.hudBox'),bar=document.createElement('div');
  bar.id='v163Vitals';bar.innerHTML='<div class="v163Health" role="meter" aria-label="Здоровье"><span class="v163HealthFill"></span></div><div class="v163Hunger" title="Сытость"><span class="v163HungerFill"></span><span class="v163HungerLabel">🍖 <span id="v163HungerValue">100</span></span></div>';
  bar.querySelector('.v163Health').append(health);document.body.append(bar);oldBox?.remove();
  let signature='';
  function refresh(){
    // Hunger was 100 in the existing HUD. Read the current value if present;
    // this release does not introduce a new hunger mechanic.
    const hp=Math.max(0,Math.round(player.health)),max=Math.max(1,Math.round(player.maxHealth)),hunger=Math.round(player.hunger??100),key=[hp,max,hunger].join('/');
    if(key===signature)return;signature=key;
    health.textContent='❤️ '+hp+' / '+max;const meter=bar.querySelector('.v163Health');
    meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(max));meter.setAttribute('aria-valuenow',String(hp));
    bar.style.setProperty('--hunger',clamp(hunger,0,100)+'%');bar.style.setProperty('--hp',Math.min(100,hp/max*100)+'%');bar.classList.toggle('low',hp/max<.3);el('v163HungerValue').textContent=hunger;
  }
  const old=update;update=function(...args){const out=old(...args);refresh();return out;};
  v09Style(`
    #v163Vitals{position:fixed;left:50%;bottom:calc(60px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(266px,64vw);height:26px;display:flex;flex-direction:column-reverse;gap:3px;align-items:stretch;z-index:115;pointer-events:none;color:#d7e3d9;font-size:10px;font-variant-numeric:tabular-nums}
    .v163Health{position:relative;flex:none;height:13px;overflow:hidden;border:1px solid #acc3b65c;border-radius:6px;background:#132522d9;box-shadow:0 2px 6px #0003}
    .v163HealthFill{position:absolute;inset:0 auto 0 0;width:var(--hp,100%);background:linear-gradient(90deg,#38594c,#658967);transition:width .18s ease}
    #v163Vitals.low .v163HealthFill{background:linear-gradient(90deg,#6f463c,#ac7054)}
    #v163Vitals #healthText{position:relative;display:block;line-height:13px;text-align:center;font-size:9px;font-weight:500;text-shadow:0 1px 2px #102a22}
    .v163Hunger{position:relative;height:9px;overflow:hidden;background:#132522ba;border:1px solid #acc3b62c;border-radius:5px;text-align:center;font-size:8px;line-height:9px}.v163HungerFill{position:absolute;inset:0 auto 0 0;width:var(--hunger,100%);background:linear-gradient(90deg,#6b6146,#a39761);transition:width .2s}.v163HungerLabel{position:relative;text-shadow:0 1px 2px #000}
    #heldItemName{bottom:calc(94px + env(safe-area-inset-bottom,0px))!important;font-size:10px!important}
    #v014RouteStop{bottom:calc(114px + env(safe-area-inset-bottom,0px))}
    #lootOverlay .panel{width:min(350px,calc(100vw - 36px));max-height:76dvh;padding:12px;box-sizing:border-box}
    #lootOverlay h2{font-size:16px;margin:0 0 10px}
    .v163LootGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-height:48dvh;overflow-y:auto;touch-action:pan-y}
    #lootList .v163LootCell{height:62px;min-height:62px;min-width:0;position:relative;box-sizing:border-box;touch-action:pan-y}
    #lootList .ico{height:54px;display:flex;align-items:center;justify-content:center}#lootList .itemIcon{width:49px;height:49px}
    #lootList .qty{position:absolute;right:5px;bottom:3px;font-size:11px;color:#dde7db}
    #lootList .selected{border-color:#ceba7b;background:#75634538;box-shadow:inset 0 0 0 1px #ceba7b88}
    .v163LootActions{display:grid;grid-template-columns:1fr 1.45fr 1fr;gap:5px;margin-top:10px}
    .v163LootActions button{min-width:0!important;min-height:36px!important;font-size:11px!important;padding:6px 5px!important;margin:0!important;border-radius:8px!important}
  `);
  refresh();return{refresh};
})();

