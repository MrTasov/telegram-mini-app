/* Official media is lazy and byte-preserved. One HTMLVideoElement, no extra
   AudioContext/RAF. Browser permission rejection waits for another user gesture. */
StoryPlayer.registerMediaAdapter('video',({definition,host,volume,onError,onEnded,onBlocked})=>{
  const asset=AssetManifest.videos?.[definition.assetId];if(!asset)throw Error('Missing story video');
  const video=document.createElement('video');let disposed=false,paused=true,attempt=0,timer=null;
  video.preload='metadata';video.playsInline=true;video.controls=false;video.loop=false;video.disablePictureInPicture=true;
  video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('aria-label',I18n.t(definition.alt));
  const clear=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
  const fail=()=>{if(disposed)return;clear();onError();};
  const playing=()=>{clear();if(disposed||paused)video.pause();};
  const ended=()=>{if(!disposed&&!paused){clear();onEnded();}};
  const listeners=[['error',fail],['playing',playing],['ended',ended]];
  for(const [name,fn]of listeners)video.addEventListener(name,fn);
  const languageOff=I18n.onChange(()=>video.setAttribute('aria-label',I18n.t(definition.alt)));
  function setVolume(value){video.volume=clamp(value,0,1);video.muted=value<=0;}
  setVolume(volume);host.append(video);video.src=asset.path;
  return {
    timeMs:()=>Number.isFinite(video.currentTime)?Math.max(0,video.currentTime*1000):0,
    setVolume,
    setPaused(value){
      if(disposed)return;paused=!!value;const ticket=++attempt;clear();
      if(paused){video.pause();return;}
      // A broken/unreachable source cannot trap New Game. A slow stream can
      // always be skipped; the first-play watchdog releases a failed decoder.
      timer=setTimeout(fail,15000);
      try{Promise.resolve(video.play()).then(()=>{if(disposed||paused)video.pause();else if(ticket===attempt)clear();}).catch(error=>{
        if(disposed||paused||ticket!==attempt)return;clear();
        if(error?.name==='NotAllowedError'){paused=true;video.pause();onBlocked();}else fail();
      });}catch(error){clear();if(error?.name==='NotAllowedError'){paused=true;onBlocked();}else fail();}
    },
    dispose(){if(disposed)return;disposed=true;attempt++;clear();languageOff();for(const [name,fn]of listeners)video.removeEventListener(name,fn);video.pause();video.removeAttribute('src');video.load();video.remove();}
  };
});
