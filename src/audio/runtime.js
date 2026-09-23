/* Full Audio Pass: one owner, bounded voices, no gameplay RNG or independent clock. */
let audioCtx=null;
const audioBuffers={},audioLoads=new Map(),audioRetryAt=new Map(),animationVoices=new Map();
const AUDIO_FILES=GameAssets.audioSources();
const sounds=Object.fromEntries(['gunshot','zombie','hit','playerHit','footsteps','chicken','cow'].map(name=>[name,{name}]));
const ZOMBIE_AUDIO_RADIUS=285;
const GameAudio=window.GameAudio=(()=>{
  const limits=Object.freeze({oneShots:16,loops:6,animation:2,tails:2,combat:8,enemy:3,groan:2,animal:1,world:4,ui:2});
  const voices=new Set(),loops=new Map(),tails=new Set(),cooldowns=new Map(),lastVariant=new Map();
  let bus=null,compressor=null,randomState=0x71c94ab3,preloading=null,muted=false,lastFeedback=-Infinity,reloads=new WeakMap();
  const stats={peakOneShots:0,peakLoops:0,requests:0,decodes:0,dropped:0,stolen:0,activeLoads:0,peakLoads:0};
  const cues={};
  function define(names,clips,gain=.4,family='world',cooldown=90,priority=2){for(const name of names.split(' '))cues[name]={clips:clips.split(' '),gain,family,cooldown,priority};}
  define('gunshot shotAK','gunshot',.62,'combat',0,5);define('shotM4','shotM4',.57,'combat',0,5);
  define('turretFire','turretFire',.46,'combat',40,4);define('droneFire','droneFire',.36,'combat',60,4);
  define('dryFire','dryFire',.32,'combat',300,4);
  define('reloadOut magazineUnload','reloadOut',.40,'combat',90,4);define('reloadIn magazineLoad','reloadIn',.43,'combat',90,4);define('reloadBolt','reloadBolt',.36,'combat',90,4);
  define('hit','hit',.36,'enemy',65,3);define('playerHit','playerHit',.45,'combat',180,5);
  define('zombie','zombie zombie2 zombie3',.33,'groan',1800,1);
  define('zombieAggro','zombie2 zombie3',.32,'enemy',500,2);define('zombieAttack','zombieAttack',.38,'enemy',160,3);define('zombieDeath','zombieDeath',.37,'enemy',140,3);
  define('leaperJump','leaperJump',.38,'enemy',300,3);define('bloaterFuse','bloaterFuse',.42,'enemy',200,4);define('explosion','explosion',.62,'combat',180,5);
  define('impactStone','impactStone',.33);define('impactMetal hammer constructionHit','impactMetal',.35);define('treeBreak','treeBreak',.48,'world',400,3);define('rockBreak constructionBreak','rockBreak',.45,'world',250,3);
  define('doorOpen gateOpen hatchOpen','doorOpen',.32,'world',140);define('doorClose gateClose hatchClose','doorClose',.31,'world',140);
  define('pickup collect lootTake farmHarvest eggs milk feed waterRefill','pickup',.28,'world',160);
  define('inventoryMove equip unequip quickslot','cloth',.20,'ui',100);define('lootOpen','lootOpen',.26,'ui',180);define('lootClose','lootClose',.23,'ui',180);
  define('craftStart buildPlace turretPlace droneDeploy','metalPlace',.35,'world',180,3);define('craftFinish craftCollect upgrade repair turretPack dronePack','complete',.27,'world',220,3);
  define('switch','switch',.22,'ui',100);define('refuel','liquid',.33,'world',200);define('plant','plant',.25,'world',180);
  define('fishCast','fishCast',.31,'world',250);define('fishCatch','fishCatch',.36,'world',250,3);
  define('chicken','chicken',.17,'animal',15000,1);define('cow','cow',.25,'animal',20000,1);define('slaughter','slaughter',.32,'animal',500,2);
  define('uiClick','uiClick',.15,'ui',70);define('menu','menu',.15,'ui',180);define('uiConfirm','uiConfirm',.19,'ui',140);define('uiError warning droneLow','uiError',.17,'ui',900,3);
  define('droneCharge droneLand sleep wake','uiConfirm',.17,'world',500);
  define('droneHit','impactMetal',.32,'combat',220,3);define('droneDisabled','powerStop',.36,'world',600,4);
  define('powerStart','powerStart',.35,'world',300);define('powerStop','powerStop',.29,'world',300);
  const loopDefs={night:['night',.10],bunker:['bunker',.065],dayX:['dayX',.12],rotor:['rotor',.10],generator:['generator',.11],machine:['machine',.09],water:['water',.085],shower:['water',.095]};
  const transmissionCues=new Set(['dayX','zombie','zombieAggro','explosion','constructionHit','constructionBreak']);
  const now=()=>performance.now();
  function random(){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return (randomState>>>0)/4294967296;}
  function set(param,value,seconds=.04){if(!param)return;if(param.setTargetAtTime)param.setTargetAtTime(value,audioCtx.currentTime,seconds);else param.value=value;}
  function output(){
    if(!audioCtx)return null;if(bus)return bus;
    bus=audioCtx.createGain();bus.gain.value=masterVolume;
    if(audioCtx.createDynamicsCompressor){compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.006;compressor.release.value=.18;bus.connect(compressor);compressor.connect(audioCtx.destination);}else bus.connect(audioCtx.destination);
    return bus;
  }
  function listenerZone(){return {scene,floor:scene==='bunker'?1:window.V013City?.floor||0};}
  function sourceZone(opts={}){
    const local=listenerZone(),source=opts.scene||local.scene;
    const floor=opts.floor??(typeof opts.level==='number'?opts.level:undefined)??(opts.scene?(source==='bunker'?1:0):local.floor);
    return {scene:source,floor};
  }
  function sameZone(opts){const a=listenerZone(),b=sourceZone(opts);return a.scene===b.scene&&a.floor===b.floor;}
  function positional(opts={}){
    if(!sameZone(opts))return 0;
    if(typeof opts.level==='boolean'&&opts.level!==!!player.wallLevel)return 0;
    if(!Number.isFinite(opts.x)||!Number.isFinite(opts.y))return 1;
    const n=1-Math.hypot(opts.x-player.x,opts.y-player.y)/(opts.radius||420);return n>0?n*n:0;
  }
  function spatial(name,opts={}){
    if(sameZone(opts))return {gain:positional(opts),lowpass:0};
    const listener=listenerZone(),source=sourceZone(opts);
    if(!opts.dayXLeak||!transmissionCues.has(name)||!window.WorldEvents?.isActive('day_x')||source.scene!=='surface'||source.floor!==0||listener.scene!=='bunker')return {gain:0,lowpass:0};
    // Sources outside are measured from the surface entrance, not coordinates
    // in the unrelated underground map. Concrete removes highs and most gain.
    const d=Number.isFinite(opts.x)&&Number.isFinite(opts.y)?Math.hypot(opts.x-800,opts.y-650):0;
    return {gain:.065*Math.max(0,1-d/1800)**2/Math.max(1,Number(listener.floor)||1),lowpass:420};
  }
  function cleanup(v){
    if(v.done)return;v.done=true;voices.delete(v);tails.delete(v);
    if(v.channel&&loops.get(v.channel)===v)loops.delete(v.channel);
    try{v.source.disconnect();v.filter?.disconnect();v.gain.disconnect();}catch(_){}
  }
  function stop(v){if(!v||v.done)return;cleanup(v);try{v.source.stop(0);}catch(_){};}
  function ready(){return !document.hidden&&masterVolume>0&&audioCtx?.state==='running';}
  function create(clip,volume,rate=1,loop=false,lowpass=0){
    const buffer=audioBuffers[clip];if(!ready()||!buffer)return null;
    try{const source=audioCtx.createBufferSource(),gain=audioCtx.createGain(),filter=lowpass&&audioCtx.createBiquadFilter?audioCtx.createBiquadFilter():null;source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;gain.gain.value=volume;if(filter){filter.type='lowpass';filter.frequency.value=lowpass;filter.Q.value=.5;source.connect(filter);filter.connect(gain);}else source.connect(gain);gain.connect(output());const v={source,gain,filter,lowpass,clip,done:false,started:now()};source.onended=()=>cleanup(v);source.start(0);return v;}catch(_){return null;}
  }
  function play(name,opts={}){
    const def=cues[name];if(!def||!ready())return false;
    const space=spatial(name,opts),distance=space.gain;if(distance<.002)return false;
    const key=name+(opts.cooldownKey?':'+opts.cooldownKey:''),time=now();if(time<(cooldowns.get(key)||0)||name==='uiClick'&&time-lastFeedback<60)return false;
    const clips=def.clips.filter(c=>audioBuffers[c]);if(!clips.length)return false;
    const same=[...voices].filter(v=>v.family===def.family),cap=limits[def.family]||4;
    if(same.length>=cap||voices.size>=limits.oneShots){
      const pool=(same.length>=cap?same:[...voices]).filter(v=>v.priority<def.priority).sort((a,b)=>a.priority-b.priority||a.started-b.started);
      if(!pool.length){stats.dropped++;return false;}stop(pool[0]);stats.stolen++;
    }
    let index=Math.floor(random()*clips.length);if(clips.length>1&&index===lastVariant.get(name))index=(index+1)%clips.length;
    const v=create(clips[index],def.gain*(opts.volume??1)*distance,opts.rate??(name.startsWith('shot')||name==='gunshot'?1:.97+random()*.06),false,space.lowpass);if(!v)return false;
    Object.assign(v,{family:def.family,priority:def.priority,owner:opts.owner,name,opts:{...opts},zone:listenerZone()});voices.add(v);lastVariant.set(name,index);cooldowns.set(key,time+def.cooldown);stats.peakOneShots=Math.max(stats.peakOneShots,voices.size);lastFeedback=time;
    if(cooldowns.size>256)for(const [k,t]of cooldowns)if(t<=time)cooldowns.delete(k);
    return true;
  }
  function loop(channel,name,opts={}){
    const def=loopDefs[name],space=spatial(name,opts),volume=def?def[1]*(opts.volume??1)*space.gain:0;
    let old=loops.get(channel);
    if(!ready()||!def||volume<.0002||!audioBuffers[def[0]]){if(old)stop(old);return false;}
    if(old&&old.clip===def[0]&&old.lowpass===space.lowpass){set(old.gain.gain,volume,.08);return true;}
    if(old){
      loops.delete(channel);
      if(tails.size<limits.tails&&old.gain.gain.linearRampToValueAtTime){tails.add(old);old.gain.gain.cancelScheduledValues?.(audioCtx.currentTime);old.gain.gain.setValueAtTime?.(old.gain.gain.value,audioCtx.currentTime);old.gain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+.25);try{old.source.stop(audioCtx.currentTime+.26);}catch(_){stop(old);}}else stop(old);
    }
    if(loops.size>=limits.loops)return false;
    const v=create(def[0],volume,1,true,space.lowpass);if(!v)return false;v.channel=channel;v.zone=listenerZone();loops.set(channel,v);stats.peakLoops=Math.max(stats.peakLoops,loops.size);return true;
  }
  function stopOwner(owner){for(const v of voices)if(v.owner===owner)stop(v);}
  function reset(){for(const v of [...voices,...loops.values(),...tails])stop(v);for(const key of animationVoices.keys())stopAnimationSound(key);cooldowns.clear();lastVariant.clear();reloads=new WeakMap();window.GameAudioWorld?.reset();}
  function reload(job,start=false){
    if(!job)return;const progress=1-job.remainingMs/job.totalMs,previous=reloads.get(job);
    if(start)play('reloadOut',{owner:job});
    if(previous!==undefined){if(previous<.52&&progress>=.52)play('reloadIn',{owner:job});if(previous<.88&&progress>=.88)play('reloadBolt',{owner:job});}
    reloads.set(job,progress);
  }
  function sync(){
    if(!audioCtx)return false;
    if(bus)set(bus.gain,clamp(masterVolume,0,1),.02);
    if(document.hidden||masterVolume<=0||audioCtx&&audioCtx.state!=='running'){if(!muted){reset();muted=true;}return false;}
    const here=listenerZone();for(const v of voices)if(v.owner?.alive===false||v.zone.scene!==here.scene||v.zone.floor!==here.floor||v.family==='groan'&&v.owner&&spatial(v.name,{...v.opts,x:v.owner.x,y:v.owner.y}).gain<.002)stop(v);
    for(const v of loops.values())if(v.zone.scene!==here.scene||v.zone.floor!==here.floor)stop(v);
    muted=false;return true;
  }
  async function preload(){
    const ctx=ensureAudioContext();if(!ctx)return;if(preloading)return preloading;
    const tasks=Object.entries(AUDIO_FILES).filter(([key])=>!audioBuffers[key]&&now()>=(audioRetryAt.get(key)||0));let cursor=0;
    preloading=(async()=>{await Promise.all(Array.from({length:Math.min(2,tasks.length)},async()=>{
      while(cursor<tasks.length){const [name,url]=tasks[cursor++];if(audioBuffers[name])continue;if(audioLoads.has(name)){await audioLoads.get(name);continue;}
        const p=(async()=>{stats.activeLoads++;stats.peakLoads=Math.max(stats.peakLoads,stats.activeLoads);try{stats.requests++;const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw Error('Audio request failed');const data=await response.arrayBuffer();audioBuffers[name]=await ctx.decodeAudioData(data);stats.decodes++;audioRetryAt.delete(name);}catch(_){audioRetryAt.set(name,now()+1000);}finally{stats.activeLoads--;}})();audioLoads.set(name,p);await p;audioLoads.delete(name);
      }
    }));})().finally(()=>{preloading=null;});return preloading;
  }
  function inspect(){return {...stats,oneShots:voices.size,loops:loops.size,tails:tails.size,animation:[...animationVoices.values()].filter(v=>v.source).length,buffers:Object.keys(audioBuffers).length,families:Object.fromEntries(['combat','enemy','groan','animal','world','ui'].map(k=>[k,[...voices].filter(v=>v.family===k).length])),loopKeys:[...loops.keys()],context:audioCtx?.state||'locked'};}
  return {play,loop,reset,sync,preload,stopOwner,positional,spatial,listenerZone,sourceZone,output,random,limits,cues,inspect,reload};
})();
function ensureAudioContext(){
  if(audioCtx)return audioCtx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{audioCtx=new AC();audioCtx.addEventListener?.('statechange',()=>{GameAudio.sync();});}catch(_){audioCtx=null;}return audioCtx;
}
function preloadGameAudio(){return GameAudio.preload();}
function unlockGameAudio(event){
  if(document.hidden||event?.isTrusted===false)return;const ctx=ensureAudioContext();
  if(ctx&&(ctx.state==='suspended'||ctx.state==='interrupted'))try{Promise.resolve(ctx.resume()).then(()=>{GameAudio.sync();window.GameAudioWorld?.tick(true);}).catch(()=>{});}catch(_){}
  preloadGameAudio().then(()=>{GameAudio.sync();window.GameAudioWorld?.tick(true);}).catch(()=>{});
}
for(const type of ['pointerdown','pointerup','touchend','click','keydown'])window.addEventListener(type,unlockGameAudio,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)GameAudio.reset();});
function playBuffer(name,volume=1){return GameAudio.play(name,{volume});}
function playSound(sound,volume=1,options={}){return GameAudio.play(sound?.name,{...options,volume});}
function playGunshot(){return GameAudio.play(heldItem()==='rifle_m4'?'shotM4':'shotAK');}
function stopFootsteps(){stopAnimationSound('step');}
function startFootsteps(){} // ActorVisuals remains the sole contact clock.
function stopAnimationSound(channel){const v=animationVoices.get(channel);if(!v?.source)return;const s=v.source;v.source=null;try{s.stop(0);s.disconnect();}catch(_){};}
function playAnimationSound(name,channel,volume=1,rate=1){
  if(!['step','work'].includes(channel)||masterVolume<=0||document.hidden||!audioCtx||audioCtx.state!=='running')return false;
  if(name==='footsteps'){const list=['footsteps','footstep2','footstep3','footstep4'];const count=animationVoices.get(channel)?.count||0;name=list[count%list.length];}
  const buffer=audioBuffers[name];if(!buffer)return false;
  try{let v=animationVoices.get(channel);if(!v){const gain=audioCtx.createGain();gain.connect(GameAudio.output());v={gain,source:null,count:0};animationVoices.set(channel,v);}stopAnimationSound(channel);const source=audioCtx.createBufferSource();source.buffer=buffer;source.loop=false;source.playbackRate.value=rate;v.gain.gain.value=volume*(AssetManifest.audio[name]?.volumeScale??1);source.connect(v.gain);v.source=source;v.count++;source.onended=()=>{if(v.source===source)v.source=null;try{source.disconnect();}catch(_){}};source.start(0);return true;}catch(_){return false;}
}
function updateFootstepsAudio(){GameAudio.sync();window.ActorVisuals?.updateAudio();if(masterVolume<=0||document.hidden){stopFootsteps();stopAnimationSound('work');}}
function zombieDistanceVolume(z){return z?.alive&&scene==='surface'?GameAudio.positional({x:z.x,y:z.y,radius:ZOMBIE_AUDIO_RADIUS,scene:'surface',level:false}):0;}
function stopZombieAudio(z){GameAudio.stopOwner(z);}
function stopInvalidZombieAudio(){GameAudio.sync();}
function playZombieBuffer(z){if(zombieDistanceVolume(z)>.002)GameAudio.play('zombie',{x:z.x,y:z.y,radius:ZOMBIE_AUDIO_RADIUS,scene:'surface',level:false,owner:z,rate:z.type==='heavy'?.76:z.type==='fast'?1.12:1});}
