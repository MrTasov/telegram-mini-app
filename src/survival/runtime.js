/* One survival owner. World minutes drain needs; active real milliseconds run
   effects. No clock, inventory scan, or alternate simulation is introduced. */
window.GameSurvival=(()=>{
 const B=GameplayBalance.survival,keys=['tea','regen','energy','vitality','adrenaline','oil'];
 const effects={tea:0,regen:0,energy:0,vitality:0,adrenaline:0,oil:0};
 let hungerZero=0,thirstZero=0,regenMs=0,harmMs=0,teaMs=0,healMs=0;
 for(const [id,d]of Object.entries(B.uses))ITEM[id].category=d.category;
 player.hunger=B.max;player.thirst=B.max;
 const active=id=>effects[id]>0;
 function heal(n){if(!playerDead)player.health=Math.min(player.maxHealth,player.health+n);}
 function clear(){for(const k of keys)effects[k]=0;hungerZero=thirstZero=regenMs=harmMs=teaMs=healMs=0;window.SurvivalUse?.cancel();V010Combat.refreshStats();}
 function effect(id){effects[id]=B.effects[id].durationMs??B.effects[id].shots;if(id==='tea')teaMs=0;if(id==='regen')healMs=0;if(id==='vitality'||id==='adrenaline')V010Combat.refreshStats();}
 function useful(type){const d=B.uses[type];return !!d&&!!((d.hunger&&player.hunger<B.max)||(d.thirst&&player.thirst<B.max)||(d.hp&&player.health<player.maxHealth)||(d.effect&&effects[d.effect]<(B.effects[d.effect].durationMs??B.effects[d.effect].shots)));}
 function apply(type){const d=B.uses[type];if(!d||!useful(type))return false;player.hunger=Math.min(B.max,player.hunger+(d.hunger||0));player.thirst=Math.min(B.max,player.thirst+(d.thirst||0));if(player.hunger>0)hungerZero=0;if(player.thirst>0)thirstZero=0;if(d.effect)effect(d.effect);heal(d.hp||0);queueGameSave();return true;}
 function tick(ms,minutes){
  if(GameFlow.paused||document.hidden||playerDead||!(ms>0))return;
  const h=player.hunger,t=player.thirst;player.hunger=Math.max(0,h-Math.max(0,minutes)*B.max/B.hungerMinutes);player.thirst=Math.max(0,t-Math.max(0,minutes)*B.max/B.thirstMinutes);
  if(h>B.low&&player.hunger<=B.low)message(I18n.t('survival.lowHunger'));if(t>B.low&&player.thirst<=B.low)message(I18n.t('survival.lowThirst'));
  const oldH=hungerZero,oldT=thirstZero;
  hungerZero=player.hunger===0?Math.min(B.zeroGraceMs,hungerZero+ms):0;thirstZero=player.thirst===0?Math.min(B.zeroGraceMs,thirstZero+ms):0;
  const harmful=Math.max(player.hunger===0?Math.max(0,ms-Math.max(0,B.zeroGraceMs-oldH)):0,player.thirst===0?Math.max(0,ms-Math.max(0,B.zeroGraceMs-oldT)):0);
  if(harmful){harmMs+=harmful;const interval=player.hunger===0&&player.thirst===0?B.bothHarmMs:B.harmMs;if(harmMs>=interval){const hits=Math.floor(harmMs/interval);harmMs%=interval;window.SurvivalUse?.cancel();player.health=Math.max(0,player.health-hits*B.harmHP);if(player.health===0){killPlayer();return;}}}else if(player.hunger>0&&player.thirst>0)harmMs=0;
  if(player.hunger>B.wellFed&&player.thirst>B.wellFed){regenMs+=ms;if(regenMs>=B.regenMs){heal(Math.floor(regenMs/B.regenMs)*B.regenHP);regenMs%=B.regenMs;}}else regenMs=0;
  if(effects.tea>0){teaMs+=Math.min(ms,effects.tea);if(teaMs>=1000){heal(Math.floor(teaMs/1000)*B.effects.tea.healPerSecond);teaMs%=1000;}}
  if(effects.regen>0){healMs+=Math.min(ms,effects.regen);if(healMs>=1000){heal(Math.floor(healMs/1000)*B.effects.regen.healPerSecond);healMs%=1000;}}
  let stats=false;for(let i=0;i<5;i++){const k=keys[i];if(effects[k]>0){effects[k]=Math.max(0,effects[k]-ms);if(effects[k]===0&&(k==='vitality'||k==='adrenaline'))stats=true;}}
  if(stats)V010Combat.refreshStats();window.SurvivalUse?.tick(ms);GameState.session.dirty=true;
 }
 function capture(){return {schema:1,hunger:player.hunger,thirst:player.thirst,zeroMs:{hunger:hungerZero,thirst:thirstZero},regenMs,harmMs,teaMs,healMs,effects:{tea:{remainingMs:effects.tea},regen:{remainingMs:effects.regen},energy:{remainingMs:effects.energy},vitality:{remainingMs:effects.vitality},adrenaline:{remainingMs:effects.adrenaline},oil:{shots:effects.oil}},commands:window.SurvivalUse?.capture()||{revision:0,receipts:[]}};}
 function validate(s){
  if(s===undefined)return true;const fail=()=>{throw Error('Invalid survival state');},n=(x,max)=>Number.isFinite(x)&&x>=0&&x<=max,shape=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===k.split(',').sort().join();
  if(!shape(s,'schema,hunger,thirst,zeroMs,regenMs,harmMs,teaMs,healMs,effects,commands')||s.schema!==1||!n(s.hunger,B.max)||!n(s.thirst,B.max)||!shape(s.zeroMs,'hunger,thirst')||!n(s.zeroMs.hunger,B.zeroGraceMs)||!n(s.zeroMs.thirst,B.zeroGraceMs)||!n(s.regenMs,B.regenMs-1e-8)||!n(s.harmMs,B.harmMs-1e-8)||!n(s.teaMs,1000-1e-8)||!n(s.healMs,1000-1e-8)||!shape(s.effects,keys.join(',')))fail();
  for(const k of keys){const field=k==='oil'?'shots':'remainingMs',max=B.effects[k].shots??B.effects[k].durationMs;if(!shape(s.effects[k],field)||!n(s.effects[k][field],max)||k==='oil'&&!Number.isInteger(s.effects[k].shots))fail();}window.SurvivalUse?.validate(s.commands);return true;
 }
 function restore(s){validate(s);player.hunger=s?.hunger??B.max;player.thirst=s?.thirst??B.max;for(const k of keys)effects[k]=s?.effects[k][k==='oil'?'shots':'remainingMs']??0;hungerZero=s?.zeroMs.hunger??0;thirstZero=s?.zeroMs.thirst??0;regenMs=s?.regenMs??0;harmMs=s?.harmMs??0;teaMs=s?.teaMs??0;healMs=s?.healMs??0;window.SurvivalUse?.restore(s?.commands||{revision:0,receipts:[]});}
 function kitchenNearby(){return scene==='bunker'&&GameEquipment.productionIds.some(id=>GameEquipment.recipeStation(id)==='kitchen'&&GameEquipment.present(id)&&GameEquipment.get(id).state.condition.hp>0&&GameEquipmentRuntime.access(GameActors.local,GameEquipment.get(id))&&devicePowered(GameEquipment.get(id).refs.device));}
 GameState.register('survival',{capture},{source:'survival/runtime.js',saved:['survival042'],transient:['active item use channel','HUD signature']});
 GameSave.extend('capture','player.survival',old=>{const d=old();d.survival042=capture();return d;});
 GameSave.extend('decode','player.survival',(old,raw)=>{const incoming=JSON.parse(raw);validate(incoming.survival042);if(incoming.player?.health>500&&!(incoming.survival042?.effects.vitality.remainingMs>0))throw Error('Invalid survival health');return old(raw);});
 GameSave.extend('restore','player.survival',(old,d)=>{restore(d.survival042);const out=old(d);V010Combat.refreshStats();return out;});
 const oldRespawn=respawn;respawn=function(...a){clear();player.hunger=player.thirst=B.respawn;const out=oldRespawn(...a);queueGameSave();return out;};
 return Object.freeze({tick,active,apply,useful,capture,validate,kitchenNearby,onDeath:clear,remaining:id=>effects[id]||0,shot(){if(effects.oil>0)effects.oil--;},moveFactor:()=> (player.hunger===0?B.hungerMove:1)*(window.SurvivalUse?.active?B.useMove:1),gatheringRate:()=> (active('energy')?B.effects.energy.gatheringRate:1)/(player.hunger===0?B.hungerCycle:1)});
})();
