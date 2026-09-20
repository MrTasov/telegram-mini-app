/* Presentation resources only. This cache never owns simulation or save state.
   One Image and one settled promise per resource; normal HTTP caching applies. */
const GameAssets=(()=>{
  const records=new Map(),art=AssetManifest.art;
  const artId=key=>art[AssetManifest.aliases[key]||key];
  const sourceMap=group=>Object.fromEntries(Object.entries(group).map(([key,id])=>[key,AssetManifest.images[id].path]));
  function request(id){
    const d=AssetManifest.images[id];if(!d)return null;
    if(records.has(id))return records.get(id);
    const im=new Image(),r={image:im,status:'loading',error:null,bounds:d.crop||{x:0,y:0,w:d.size[0],h:d.size[1]},frames:null};
    let settle;r.promise=new Promise(resolve=>{settle=resolve;});records.set(id,r);
    function fail(reason){im.onload=undefined;im.onerror=undefined;r.status='error';r.error=String(reason);settle(null);}
    async function loaded(){
      if(r.status!=='loading')return;r.status='decoding';im.onload=undefined;im.onerror=undefined;
      try{
        if(typeof im.decode==='function')await im.decode();
        const w=im.naturalWidth,h=im.naturalHeight;if(!w||!h)throw Error('Empty image');
        if(d.atlas&&(w!==d.size[0]||h!==d.size[1]))throw Error('Atlas dimensions differ from metadata');
        const b=r.bounds;r.bounds={x:b.x*w/d.size[0],y:b.y*h/d.size[1],w:b.w*w/d.size[0],h:b.h*h/d.size[1]};
        const a=d.atlas;
        if(a?.layout==='grid')r.frames=a.crops||Array.from({length:a.frameCount},(_,i)=>({x:(i%a.columns)*a.frameSize[0],y:Math.floor(i/a.columns)*a.frameSize[1],w:a.frameSize[0],h:a.frameSize[1]}));
        else if(a?.layout==='packed')r.frames=a.frames;
        r.status='ready';settle(im);
      }catch(e){fail(e.message||'Image decode failed');}
    }
    im.decoding='async';im.onload=()=>{void loaded();};im.onerror=()=>fail('Image request failed');
    try{im.src=d.path;if(im.complete&&im.naturalWidth)void loaded();}catch(e){fail(e.message);}
    // Death art belongs to the same visible actor; avoid a separate cold request at death.
    for(const next of d.prefetch||[])request(next);
    return r;
  }
  function bounds(id){return request(id)?.bounds||{x:0,y:0,w:1,h:1};}
  function frames(id){const r=request(id);return r?.status==='ready'?r.frames:null;}
  return Object.freeze({
    artId,artSources:()=>sourceMap(art),iconSources:()=>sourceMap(AssetManifest.icons),
    audioSources:()=>Object.fromEntries(Object.entries(AssetManifest.audio).filter(([,d])=>d.available).map(([key,d])=>[key,d.path])),
    wallAtlases:()=>Object.fromEntries(Object.entries(AssetManifest.walls).map(([level,id])=>{const d=AssetManifest.images[id];return[level,{file:d.path,frames:Object.fromEntries(Object.entries(d.atlas.frames).map(([part,b])=>[part,[b.x,b.y,b.w,b.h]]))}];})),
    image:id=>request(id)?.image,ready:id=>request(id)?.status==='ready',
    load:id=>request(id)?.promise||Promise.resolve(null),bounds,frames,
    frame:(id,index)=>frames(id)?.[index]||null,
    stats:()=>({requested:records.size,ready:[...records.values()].filter(r=>r.status==='ready').length,entries:[...records].map(([id,r])=>({id,status:r.status,error:r.error}))})
  });
})();
window.GameAssets=GameAssets;

