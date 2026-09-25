

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

/* Shared persistent volume; playback is owned by src/audio/runtime.js. */
let masterVolume = 0.70;

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
