

/* =====================================================
   HELPERS
===================================================== */

function el(id){
  return document.getElementById(id);
}

function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}

function distance(x1,y1,x2,y2){
  return Math.hypot(x1-x2,y1-y2);
}

/* =====================================================
   TELEGRAM
===================================================== */

const tg =
  window.Telegram &&
  window.Telegram.WebApp
  ? window.Telegram.WebApp
  : null;

if(tg){

  try{
    tg.ready();
  }catch(e){}

  try{
    tg.expand();
  }catch(e){}

  try{

    if(typeof tg.disableVerticalSwipes === "function"){
      tg.disableVerticalSwipes();
    }

  }catch(e){}

}

// Shared by the start screen and Settings. A browser request must happen in
// the original user gesture; a denial must never interrupt menu/game actions.
let browserFullscreenPending=false,telegramFullscreenAttempted=false;
function mobileFullscreenDevice(){
  const platform=window.Telegram?.WebApp?.platform;
  return platform==='android'||platform==='ios'||
    (navigator.maxTouchPoints>0&&window.matchMedia('(pointer: coarse)').matches);
}
function fullscreen({allowBrowser=true,automatic=false}={}){
  const app=window.Telegram?.WebApp;
  if(app&&(app.initData||(app.platform&&app.platform!=='unknown'))){
    if(app.isFullscreen)return true;
    try{app.expand?.();}catch(_){}
    try{
      if(typeof app.requestFullscreen==='function'&&(!app.isVersionAtLeast||app.isVersionAtLeast('8.0'))){
        if(automatic&&telegramFullscreenAttempted)return true;
        const result=app.requestFullscreen();telegramFullscreenAttempted=true;
        result?.catch?.(()=>{telegramFullscreenAttempted=false;});return true;
      }
    }catch(_){}
  }
  if(!allowBrowser||browserFullscreenPending||document.fullscreenElement||document.webkitFullscreenElement)return false;
  const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
  if(typeof request!=='function'||document.fullscreenEnabled===false)return false;
  try{
    browserFullscreenPending=true;
    Promise.resolve(request.call(root)).then(()=>{browserFullscreenPending=false;},()=>{browserFullscreenPending=false;});
    return true;
  }catch(_){browserFullscreenPending=false;return false;}
}

/* Audio paths and optional availability are defined in assets/manifest.json. */
let masterVolume = 0.70;

function createSound(key){
  const audio = new Audio();
  audio.preload = "none";
  const source=GameAssets.audioSources()[key];if(source)audio.src=source;
  return audio;
}

const sounds = {
  gunshot:createSound("gunshot"),
  zombie:createSound("zombie"),
  hit:createSound("hit"),
  playerHit:createSound("playerHit"),
  footsteps:createSound("footsteps"),
  chicken:createSound("chicken"),
  cow:createSound("cow")
};

/* =====================================================
   MOBILE AUDIO ENGINE 0.4.5
===================================================== */
let audioCtx=null;
const audioBuffers={};
let audioLoadStarted=false;
const animationVoices=new Map();
let lastZombieBufferAt=0;

const AUDIO_FILES=GameAssets.audioSources();

function ensureAudioContext(){
  if(audioCtx) return audioCtx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return null;
  try{audioCtx=new AC();}catch(e){audioCtx=null;}
  return audioCtx;
}

async function preloadGameAudio(){
  if(audioLoadStarted) return;
  const ctx=ensureAudioContext();
  if(!ctx) return;
  audioLoadStarted=true;

  await Promise.all(
    Object.entries(AUDIO_FILES).map(async function([name,url]){
      try{
        const r=await fetch(url,{cache:"no-cache"});
        if(!r.ok)throw Error("Audio request failed");
        const data=await r.arrayBuffer();
        audioBuffers[name]=await ctx.decodeAudioData(data);
      }catch(e){}
    })
  );
}

function unlockGameAudio(){
  const ctx=ensureAudioContext();
  if(ctx && ctx.state==="suspended"){
    ctx.resume().catch(function(){});
  }
  preloadGameAudio().catch(function(){});
}

window.addEventListener("pointerdown",unlockGameAudio,{once:true,passive:true});
window.addEventListener("touchstart",unlockGameAudio,{once:true,passive:true});

function playBuffer(name,volume=1){
  // 0.4.11: only short decoded WebAudio effects are allowed.
  if(name!=="gunshot" && name!=="hit" && name!=="footsteps" && name!=="zombie" && name!=="playerHit") return;
  if(masterVolume<=0) return;

  const ctx=ensureAudioContext();
  const buffer=audioBuffers[name];

  if(!ctx || !buffer || ctx.state!=="running") return;

  try{
    const source=ctx.createBufferSource();
    const gain=ctx.createGain();

    source.buffer=buffer;
    gain.gain.value=clamp(volume*masterVolume,0,1);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);

    source.onended=function(){
      try{
        source.disconnect();
        gain.disconnect();
      }catch(e){}
    };
  }catch(e){}
}

function stopFootsteps(){
  stopAnimationSound('step');
}

function startFootsteps(){
  // Contacts are emitted by the shared visual locomotion phase.
  return;
}

function stopAnimationSound(channel){
  const voice=animationVoices.get(channel);if(!voice?.source)return;
  const source=voice.source;voice.source=null;
  try{source.stop(0);}catch(e){}try{source.disconnect();}catch(e){}
}

function playAnimationSound(name,channel,volume=1,rate=1){
  // Only two bounded channels and two reusable GainNodes. BufferSource nodes
  // are one-shot WebAudio objects: create on contact, disconnect on completion.
  if(!['step','work'].includes(channel)||masterVolume<=0)return false;
  const ctx=audioCtx,buffer=audioBuffers[name];
  if(!ctx||!buffer||ctx.state!=='running')return false;
  try{
    let voice=animationVoices.get(channel);
    if(!voice){const gain=ctx.createGain();gain.connect(ctx.destination);voice={gain,source:null};animationVoices.set(channel,voice);}
    stopAnimationSound(channel);
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=false;source.playbackRate.value=rate;
    voice.gain.gain.value=clamp(volume*masterVolume,0,1);source.connect(voice.gain);voice.source=source;
    source.onended=()=>{if(voice.source===source)voice.source=null;try{source.disconnect();}catch(e){}};
    source.start(0);return true;
  }catch(e){return false;}
}

function updateFootstepsAudio(){
  window.ActorVisuals?.updateAudio();
  if(masterVolume<=0){stopAnimationSound('step');stopAnimationSound('work');}
}

const ZOMBIE_AUDIO_RADIUS=285;
const activeZombieAudio=new Map();
let lastZombieAudioAt=0;

function zombieDistanceVolume(zombie){
  if(!zombie || !zombie.alive || scene!=="surface") return 0;
  if(!visibleOnScreen(zombie.x,zombie.y,35)) return 0;
  const d=Math.hypot(zombie.x-player.x,zombie.y-player.y);
  if(d>=ZOMBIE_AUDIO_RADIUS) return 0;
  const n=1-d/ZOMBIE_AUDIO_RADIUS;
  return .30*n*n; // same fast positional falloff idea as the chickens
}

function stopZombieAudio(zombie){
  const node=activeZombieAudio.get(zombie);
  if(!node)return;
  try{node.source.stop();}catch(e){}
  try{node.source.disconnect();node.gain.disconnect();}catch(e){}
  activeZombieAudio.delete(zombie);
}

function stopInvalidZombieAudio(){
  for(const [z,node] of activeZombieAudio){
    const v=zombieDistanceVolume(z);
    if(v<=0.001){
      stopZombieAudio(z);
    }else if(audioCtx){
      node.gain.gain.setTargetAtTime(v*masterVolume,audioCtx.currentTime,.04);
    }
  }
}

function playZombieBuffer(zombie){
  if(!zombie || !zombie.alive || masterVolume<=0 || !audioCtx || !audioBuffers.zombie) return;
  const volume=zombieDistanceVolume(zombie);
  if(volume<=0.001)return;

  const now=performance.now();
  if(now-lastZombieAudioAt<1800)return;
  lastZombieAudioAt=now;

  // One track belongs to the zombie that produced it, so killing/leaving it
  // can stop that exact growl immediately.
  stopZombieAudio(zombie);
  const source=audioCtx.createBufferSource();
  const gain=audioCtx.createGain();
  source.buffer=audioBuffers.zombie;
  gain.gain.value=volume*masterVolume;
  source.connect(gain);
  gain.connect(audioCtx.destination);
  activeZombieAudio.set(zombie,{source,gain});
  source.onended=()=>{
    const cur=activeZombieAudio.get(zombie);
    if(cur && cur.source===source)activeZombieAudio.delete(zombie);
    try{source.disconnect();gain.disconnect();}catch(e){}
  };
  source.start(0);
}



function playSound(sound,volume){
  // HTMLAudio playback stays disabled during audio diagnostics.
  return;
}

/*
  Для выстрелов создаём отдельный экземпляр,
  чтобы быстрые выстрелы не обрывали друг друга.
*/

const gunshotPool = [
  createSound("gunshot"),
  createSound("gunshot"),
  createSound("gunshot"),
  createSound("gunshot")
];

let gunshotPoolIndex = 0;

function playGunshot(){
  playBuffer("gunshot",.30);
}


/* =====================================================
   CONTROL LAYOUTS
===================================================== */

const defaults = {

  portrait:{
    move:{x:.18,y:.82},
    aim:{x:.82,y:.82},
    action:{x:.72,y:.68}
  },

  landscape:{
    move:{x:.14,y:.78},
    aim:{x:.86,y:.78},
    action:{x:.76,y:.62}
  }

};

function validPoint(point,fallback){

  if(
    !point ||
    typeof point.x !== "number" ||
    typeof point.y !== "number"
  ){
    return clone(fallback);
  }

  return {
    x:clamp(point.x,.05,.95),
    y:clamp(point.y,.08,.94)
  };

}

function sanitizeLayouts(saved){

  const result =
    clone(defaults);

  for(const mode of ["portrait","landscape"]){

    if(!saved || !saved[mode]){
      continue;
    }

    for(const key of ["move","aim","action"]){

      result[mode][key] =
        validPoint(
          saved[mode][key],
          defaults[mode][key]
        );

    }

  }

  return result;
}

function loadLayouts(){

  try{

    const saved =
      localStorage.getItem(
        "base_controls_068"
      );

    if(!saved){
      return clone(defaults);
    }

    return sanitizeLayouts(
      JSON.parse(saved)
    );

  }catch(e){

    return clone(defaults);

  }

}

let layouts =
  loadLayouts();

function saveLayouts(){

  try{

    localStorage.setItem(
      "base_controls_068",
      JSON.stringify(layouts)
    );

  }catch(e){}

}

function orientation(){

  return window.innerWidth >
         window.innerHeight
         ? "landscape"
         : "portrait";

}

function positionControl(element,data){

  if(!element || !data){
    return;
  }

  element.style.left =
    (data.x * 100) + "%";

  element.style.top =
    (data.y * 100) + "%";

}

function applyControls(){

  const mode = orientation();
  const layout = layouts[mode] || defaults[mode];

  if(typeof positionFixedControls==="function"){
    positionFixedControls();
  }

}

/* =====================================================
   CANVAS
===================================================== */

const canvas =
  el("canvas");

const ctx =
  canvas.getContext("2d");

let screenWidth = 1;
let screenHeight = 1;

function resizeCanvas(){

  screenWidth =
    Math.max(
      1,
      window.innerWidth
    );

  screenHeight =
    Math.max(
      1,
      window.innerHeight
    );

  const ratio = Math.max(1,Math.min(window.devicePixelRatio||1,3,Math.sqrt(8000000/(screenWidth*screenHeight))));

  canvas.width =
    Math.floor(
      screenWidth * ratio
    );

  canvas.height =
    Math.floor(
      screenHeight * ratio
    );

  canvas.style.width =
    screenWidth + "px";

  canvas.style.height =
    screenHeight + "px";

  ctx.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );

}
