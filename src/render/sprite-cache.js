/* Bounded presentation cache. Original assets, layers, poses and shadows stay intact.
   Raster density is above the displayed size; no actor timing or collision state here. */
window.GameSpriteRaster=(()=>{
 const cache=new Map(),limit=12*1024*1024;let bytes=0,hits=0,misses=0;
 function get(key,w,h,paint){w=Math.max(1,Math.ceil(w/16)*16);h=Math.max(1,Math.ceil(h/16)*16);const old=cache.get(key);if(old&&old.w===w&&old.h===h){hits++;cache.delete(key);cache.set(key,old);return old.canvas;}
  if(old){bytes-=old.bytes;cache.delete(key);}const size=w*h*4;if(size>limit)return null;
  while(cache.size&&(bytes+size>limit||cache.size>=96)){const first=cache.keys().next().value;bytes-=cache.get(first).bytes;cache.delete(first);}
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'),w,h);cache.set(key,{canvas,w,h,bytes:size});bytes+=size;misses++;return canvas;
 }
 return Object.freeze({get,density:()=>Math.max(.25,(canvas.width/Math.max(1,screenWidth))*(window.V010Camera?.zoom||1))*1.5,metrics:()=>({bytes,limit,entries:cache.size,hits,misses})});
})();
