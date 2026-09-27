/* World modifiers are derived, never multiplied into their own previous value.
   Numeric channels multiply; boolean channels enable capabilities. Lighting,
   atmosphere, environment and audio can later consume their own channel names.
   No atmospheric effects/assets or networking are installed by this registry. */
window.WorldEvents=(()=>{
  const definitions=new Map(),overrides=new Map(),listeners=new Set(),cache=new WeakMap();
  const none=Object.freeze({});
  const siegeMultiplier=(day=WorldClock.day)=>Math.round(Math.min(SignalDefinitions.siegeCap,SignalDefinitions.siegeBase+SignalDefinitions.siegeStep*Math.max(0,Math.floor(day/SignalDefinitions.intervalDays)-1))*100)/100;
  const dayX=Object.freeze({intervalDays:SignalDefinitions.intervalDays,startMinute:0,endMinute:SignalDefinitions.endMinute,get hp(){return siegeMultiplier();},get damage(){return siegeMultiplier();},speed:SignalDefinitions.zombieSpeed,chaseSpeed:SignalDefinitions.zombieSpeed,cooldownRate:1.5,mechanics:1.5,population:96,ordinaryPopulation:48,maxPopulation:144});
  const xModifiers=Object.freeze({'enemy.hp':dayX.hp,'enemy.damage':dayX.damage,'enemy.speed':dayX.speed,'enemy.chaseSpeed':dayX.chaseSpeed,'enemy.cooldownRate':dayX.cooldownRate,'enemy.mechanics':dayX.mechanics,'spawn.intensity':2,'spawn.siege':true});
  let modifierDay=-1,scaledModifiers;function siegeModifiers(){if(modifierDay!==WorldClock.day){modifierDay=WorldClock.day;scaledModifiers=Object.freeze({...xModifiers,'enemy.hp':siegeMultiplier(),'enemy.damage':siegeMultiplier()});}return scaledModifiers;}
  let current=Object.freeze({revision:0,ids:Object.freeze([]),modifiers:none}),signature='';
  function matches(id,day,minute){const def=definitions.get(id);return !!(def&&Number.isSafeInteger(day)&&day>0&&Number.isFinite(minute)&&minute>=0&&minute<1440&&def.schedule({day,minute}));}
  function refresh(){
    const ids=[];for(const [id]of definitions)if(overrides.has(id)?overrides.get(id):matches(id,WorldClock.day,WorldClock.minute))ids.push(id);
    const next=ids.join('|')+(ids.includes('day_x')?':'+siegeMultiplier():'');if(next===signature)return current;
    const modifiers={};for(const id of ids)for(const [key,value]of Object.entries(id==='day_x'?siegeModifiers():definitions.get(id).modifiers))modifiers[key]=typeof value==='boolean'?!!modifiers[key]||value:(modifiers[key]??1)*value;
    signature=next;current=Object.freeze({revision:current.revision+1,ids:Object.freeze(ids),modifiers:Object.freeze(modifiers)});
    for(const fn of listeners)fn(current);return current;
  }
  function register(def){
    if(!def||!/^[a-z][a-z0-9_]*$/.test(def.id)||definitions.has(def.id)||typeof def.schedule!=='function')throw Error('Invalid world event');
    for(const [key,value]of Object.entries(def.modifiers||{}))if(!/^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/.test(key)||typeof value!=='boolean'&&(!Number.isFinite(value)||value<=0))throw Error('Invalid world modifier');
    definitions.set(def.id,Object.freeze({...def,modifiers:Object.freeze({...def.modifiers})}));refresh();
  }
  function enemyStats(base,modifiers=current.modifiers){
    if(!['hp','damage','speed','chaseSpeed','cooldownRate'].some(k=>(modifiers['enemy.'+k]??1)!==1))return base;
    let byModifier=cache.get(base);if(!byModifier){byModifier=new WeakMap();cache.set(base,byModifier);}
    let entry=byModifier.get(modifiers);const keys=['hp','speed','chaseSpeed','damage','cooldown'];
    if(!entry||keys.some(k=>entry.source[k]!==base[k])){
      const value={...base};for(const k of keys)value[k]=k==='cooldown'?base[k]/(modifiers['enemy.cooldownRate']??1):base[k]*(modifiers['enemy.'+k]??1);
      entry={source:Object.fromEntries(keys.map(k=>[k,base[k]])),value};byModifier.set(modifiers,entry);
    }return entry.value;
  }
  register({id:'day_x',schedule:({day,minute})=>day%dayX.intervalDays===0&&minute>=dayX.startMinute&&minute<dayX.endMinute,modifiers:xModifiers});
  WorldClock.onChange(refresh);
  const api={dayX,none,get xModifiers(){return siegeModifiers();},siegeMultiplier,register,matches,enemyStats,
    isActive:id=>current.ids.includes(id),value:(key,fallback=1)=>current.modifiers[key]??fallback,
    setQAEvent(id,value){if(!window.GameDevQA?.authorized()||!definitions.has(id)||![null,true,false].includes(value))return false;if(value===null)overrides.delete(id);else overrides.set(id,value);refresh();return true;},
    snapshot:()=>current,definitions:()=>[...definitions.values()].map(d=>({id:d.id,modifiers:d.modifiers})),
    onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
  // Absent from the production API. The separate developer entry installs an
  // isolated storage namespace BEFORE this script can ever run.
  if(window.LastBaseDeveloper?.isolated===true)api.debugOverride=(id,value)=>{
    if(!definitions.has(id)||![null,true,false].includes(value))return false;
    if(value===null)overrides.delete(id);else overrides.set(id,value);refresh();return true;
  };
  return Object.freeze(api);
})();

