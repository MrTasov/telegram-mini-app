// Browser lifecycle model, not a native decoder or browser layout test.
const {setup}=require('./runtime.cjs');
exports.boot=(storage={},options={})=>{
 const videos=[],mode=options.mode||'play';
 const h=setup('index.html',storage,{mainMenu:true,storyIntro:true,...options,beforeScripts:s=>{
  const original=s.document.createElement.bind(s.document);
  s.document.createElement=tag=>{const node=original(tag);if(tag!=='video')return node;
   node.currentTime=0;node.duration=21.25;node.paused=true;node.playCalls=0;node.pauseCalls=0;node.loadCalls=0;node.removed=false;node.pending=[];
   node.play=function(){this.playCalls++;if(mode==='blocked'&&this.playCalls===1){const e=Error('Gesture required');e.name='NotAllowedError';return Promise.reject(e);}if(mode==='error'){const e=Error('Codec failed');e.name='NotSupportedError';return Promise.reject(e);}this.paused=false;if(mode==='pending')return new Promise((resolve,reject)=>this.pending.push({resolve,reject}));this.dispatchEvent({type:'playing'});return Promise.resolve();};
   node.pause=function(){this.paused=true;this.pauseCalls++;};node.load=function(){this.loadCalls++;};
   node.removeAttribute=function(k){delete this.attrs[k];if(k==='src')this.src='';};
   node.removeEventListener=function(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(f=>f!==fn);};
   const remove=node.remove.bind(node);node.remove=function(){this.removed=true;remove();};videos.push(node);return node;
  };options.beforeScripts?.(s);
 }});
 return {...h,videos,E:s=>h.eval(s),J:s=>JSON.parse(h.eval('JSON.stringify('+s+')'))};
};
