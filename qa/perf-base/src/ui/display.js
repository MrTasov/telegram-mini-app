/* Read-only HUD presentation and device preferences. No GameState/save fields. */
window.GameHUD=(()=>{
  'use strict';
  const storageKey='last_base_display_v1';
  const defaults=Object.freeze({minimap:true,dayTime:true,fps:false,frameTime:false,equippedItem:true,objectives:true});
  const settings={...defaults};
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&typeof saved==='object')for(const key of Object.keys(defaults))if(typeof saved[key]==='boolean')settings[key]=saved[key];}catch(_){}
  const top=el('hud'),clock=el('v016WorldClock'),perf=el('hudPerformance'),equipped=el('heldItemName'),mini=el('v010Minimap');
  const day=el('hudDay'),time=el('hudTime'),fpsLabel=el('hudFPSLabel'),fps=el('hudFPS'),frameTime=el('hudFrameTime'),unit=el('hudFrameUnit');
  const name=el('equippedItemName'),ammo=el('ammoHud'),reserve=el('hudReserve');
  // Keep the same Text nodes for the lifetime of the HUD (including language changes).
  const text=new Map();
  for(const node of [day,time,fps,frameTime,name,ammo,reserve]){node.setAttribute('data-i18n-skip','');text.set(node,{node:node.childNodes[0],value:null});}
  function write(node,value){const entry=text.get(node);if(entry.value===value)return;entry.value=value;entry.node.nodeValue=String(value);}
  function show(node,visible){if(node.hidden!==!visible)node.hidden=!visible;}
  let lastDay=-1,lastMinute=-1,lastType=null,lastLanguage='',lastName='';
  function refreshClock(){
    if(!settings.dayTime)return;
    const d=WorldClock.day,m=Math.floor(WorldClock.minute);
    if(d!==lastDay){write(day,d);lastDay=d;const digits=String(d).length;day.style.fontSize=digits>3?(3/digits)+'em':'';}
    if(m!==lastMinute){write(time,String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));lastMinute=m;}
  }
  function refreshEquipped(item,gun,practiceRounds){
    if(!settings.equippedItem){show(equipped,false);return;}
    const type=heldItem();
    if(!type||!ITEM[type]){show(equipped,false);return;}
    if(item===undefined)item=V010Combat.currentWeapon();
    if(gun===undefined)gun=item&&V09Craft.weapons[item.type];
    const firearm=!!gun,source=firearm?gun.name:ITEM[type].name;
    if(type!==lastType||I18n.language!==lastLanguage||source!==lastName){
      write(name,I18n.text(source));lastType=type;lastLanguage=I18n.language;lastName=source;
    }
    if(equipped.dataset.firearm!==String(firearm))equipped.dataset.firearm=String(firearm);
    show(ammo,firearm);show(reserve,firearm);show(equipped,true);
    if(firearm){
      const capacity=V09Craft.magazineCapacity(item);
      write(ammo,(practiceRounds??item.rounds??0)+'/'+capacity);
      write(reserve,bagCount(gun.ammo));
    }
  }
  let lastFrame=null,elapsed=0,frames=0,smoothed=0;
  function resetMonitor(){lastFrame=null;elapsed=0;frames=0;smoothed=0;write(fps,'—');write(frameTime,'—');}
  function sample(timestamp){
    if(!settings.fps&&!settings.frameTime)return;
    if(document.hidden||window.MainMenu?.active){if(lastFrame!==null)resetMonitor();return;}
    if(lastFrame===null){lastFrame=timestamp;return;}
    const dt=timestamp-lastFrame;lastFrame=timestamp;
    if(!(dt>0)||!Number.isFinite(dt))return;
    elapsed+=dt;frames++;
    if(elapsed<250)return;
    const mean=elapsed/frames;smoothed=smoothed?smoothed*.5+mean*.5:mean;
    if(settings.fps)write(fps,Math.round(1000/smoothed));
    if(settings.frameTime)write(frameTime,smoothed.toFixed(1));
    elapsed=0;frames=0;
  }
  const box=document.createElement('section');box.id='displaySettings';box.className='settingBox';
  const title=document.createElement('h3');title.className='settingTitle';title.id='displaySettingsTitle';I18n.bind(title,'settings.display');
  box.setAttribute('aria-labelledby',title.id);box.append(title);
  const buttons={};
  for(const key of Object.keys(defaults)){
    const row=document.createElement('div');row.className='displaySetting';
    const label=document.createElement('span');label.id='displayLabel_'+key;I18n.bind(label,'settings.display.'+key);
    const button=document.createElement('button');button.id='display_'+key;button.type='button';button.setAttribute('role','switch');button.setAttribute('aria-labelledby',label.id);
    button.addEventListener('click',()=>set(key,!settings[key]));buttons[key]=button;row.append(label,button);box.append(row);
  }
  const status=document.createElement('p');status.id='displaySaveStatus';status.setAttribute('role','status');status.hidden=true;I18n.bind(status,'settings.display.unsaved');box.append(status);
  el('languageSettings').after(box);
  function refreshButtons(){for(const key of Object.keys(defaults)){const button=buttons[key];button.setAttribute('aria-checked',String(settings[key]));I18n.assign(button,'textContent',I18n.message(settings[key]?'settings.display.on':'settings.display.off'));}}
  function apply(){
    show(mini,settings.minimap);show(clock,settings.dayTime);show(perf,settings.fps||settings.frameTime);show(top,settings.dayTime||settings.fps||settings.frameTime);
    show(fpsLabel,settings.fps);show(fps,settings.fps);show(frameTime,settings.frameTime);show(unit,settings.frameTime);
    perf.dataset.fps=String(settings.fps);refreshButtons();refreshClock();updateAmmoHud();window.CommandCoreUI?.refreshTracker();
  }
  function set(key,value){
    if(!Object.hasOwn(defaults,key)||typeof value!=='boolean')return false;
    if(settings[key]===value)return true;
    settings[key]=value;if(key==='fps'||key==='frameTime')resetMonitor();
    try{localStorage.setItem(storageKey,JSON.stringify(settings));status.hidden=true;}catch(_){status.hidden=false;}
    apply();return true;
  }
  I18n.bind(el('hudDayLabel'),'hud.day');I18n.bind(fpsLabel,'hud.fps');I18n.bind(unit,'hud.ms');
  I18n.onChange(()=>{refreshButtons();updateAmmoHud();});
  document.addEventListener('visibilitychange',resetMonitor);
  apply();refreshEquipped();
  return Object.freeze({storageKey,defaults,get settings(){return {...settings};},set,refreshClock,refreshEquipped,sample});
})();
