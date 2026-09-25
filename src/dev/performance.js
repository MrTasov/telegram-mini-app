/* Opt-in QA counters around the existing owners. No timers / saved state.
   Fine-grained hot-loop sampling lives in the external CPU profiler. */
window.GamePerf=(()=>{
 const now=()=>window.GameDevQA?.rawNow()??performance.now();const values={aiMs:0,pathMs:0,renderMs:0,projectileMs:0,offzoneMs:0,updateMs:0};
 const measure=(key,fn,ctx,args)=>{const at=now();try{return fn.apply(ctx,args);}finally{values[key]=now()-at;}};
 const u=update;update=function(...a){if(!window.GameDevQA?.enabled)return u(...a);values.pathMs=0;return measure('updateMs',u,this,a);};
 const e=updateZombies;updateZombies=function(...a){if(!window.GameDevQA?.enabled)return e(...a);try{return measure('aiMs',e,this,a);}finally{values.offzoneMs=scene==='surface'?0:values.aiMs;}};
 const p=updateBullets;updateBullets=function(...a){return window.GameDevQA?.enabled?measure('projectileMs',p,this,a):p(...a);};
 const d=draw;draw=function(...a){return window.GameDevQA?.enabled?measure('renderMs',d,this,a):d(...a);};
 const path=findWalkPath;findWalkPath=function(...a){if(!window.GameDevQA?.enabled)return path(...a);const at=now();try{return path(...a);}finally{values.pathMs+=now()-at;}};
 return Object.freeze({metrics:()=>({...values,projectiles:bullets.length,effects:window.V017Monsters?.effects.length||0,zombiesOffzone:scene==='surface'?0:zombies.reduce((n,z)=>n+(z.alive?1:0),0),rasters:GameSpriteRaster.metrics()})});
})();
