// NAPI accepts a negative roundRect radius that browsers reject. Match the
// browser contract explicitly, including offscreen textures created at startup.
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const proto=Object.getPrototypeOf(createCanvas(1,1).getContext('2d'));
const states=new WeakMap();
const state=c=>{if(!states.has(c))states.set(c,{depth:0,calls:0});return states.get(c);};
const original={roundRect:proto.roundRect,save:proto.save,restore:proto.restore};
proto.roundRect=function(x,y,w,h,radii=0){
  const values=Array.isArray(radii)?radii:[radii];
  if(!values.length||values.length>4)throw new RangeError('Invalid roundRect radii count');
  for(const v of values){
    if(typeof v==='number'?v<0:(v?.x<0||v?.y<0))throw new RangeError('roundRect radius must be nonnegative');
  }
  state(this).calls++;return original.roundRect.call(this,x,y,w,h,radii);
};
proto.save=function(){const result=original.save.call(this);state(this).depth++;return result;};
proto.restore=function(){const result=original.restore.call(this);state(this).depth=Math.max(0,state(this).depth-1);return result;};
module.exports={state,reset(c){state(c).depth=0;}};
