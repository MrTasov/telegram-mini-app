// Keep the existing art API; paths, crops and atlas layout come from the catalog.
window.V011Art=(()=>{
  const sources=GameAssets.artSources(),id=GameAssets.artId;
  const image=key=>GameAssets.image(id(key)),ready=key=>GameAssets.ready(id(key)),bounds=key=>GameAssets.bounds(id(key));
  function fit(key,x,y,w,h){const b=bounds(key),scale=Math.min(w/b.w,h/b.h),dw=b.w*scale,dh=b.h*scale;return{x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh};}
  return{sources,ready,bounds,fit,frames:key=>GameAssets.frames(id(key)),image,frame:(key,index)=>GameAssets.frame(id(key),index),
    draw(key,x,y,w,h){if(!ready(key))return false;const b=bounds(key),d=fit(key,x,y,w,h);ctx.drawImage(image(key),b.x,b.y,b.w,b.h,d.x,d.y,d.w,d.h);return true;},
    drawStretch(key,x,y,w,h){if(!ready(key))return false;ctx.drawImage(image(key),x,y,w,h);return true;}
  };
})();

