const fs=require('node:fs'),path=require('node:path');
const {setup}=require('./runtime.cjs');
exports.boot=function(root=path.resolve(__dirname,'..'),options={}){
 const meter={contexts:0,resumes:0,requests:[],decodes:0,sources:0,gains:0,active:new Set(),peak:0,starts:[],gesture:true};let box;
 const r=setup(path.join(root,'index.html'),options.storage||{}, {width:390,height:844,maxTouchPoints:5,transformScript:options.transformScript,mainMenu:options.mainMenu??false,beforeScripts:s=>{
  box=s;
  s.fetch=async url=>{meter.requests.push(url);const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
  function param(value=1){return {value,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}};}
  s.AudioContext=class{
   state='running';destination={};listeners={};get currentTime(){return s.performance.now()/1000;}
   constructor(){meter.contexts++;}
   addEventListener(k,fn){this.listeners[k]=fn;}
   resume(){meter.resumes++;if(!meter.gesture)return Promise.reject(Error('NotAllowedError'));this.state='running';this.listeners.statechange?.();return Promise.resolve();}
   async decodeAudioData(b){meter.decodes++;const d=new DataView(b);if(d.getUint32(0,false)!==0x52494646)throw Error('Not WAV');return {duration:(b.byteLength-44)/(d.getUint32(24,true)*2),sampleRate:d.getUint32(24,true),numberOfChannels:1,length:(b.byteLength-44)/2};}
   createGain(){meter.gains++;return {gain:param(),connect(){},disconnect(){}};}
   createBiquadFilter(){return {type:'lowpass',frequency:param(),Q:param(),connect(){},disconnect(){}};}
   createDynamicsCompressor(){return {threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){}};}
   createBufferSource(){meter.sources++;const ctx=this;return {buffer:null,loop:false,playbackRate:param(),connect(){},disconnect(){},start(){this.end=this.loop?Infinity:ctx.currentTime+this.buffer.duration/this.playbackRate.value;meter.active.add(this);meter.peak=Math.max(meter.peak,meter.active.size);meter.starts.push({at:ctx.currentTime,buffer:this.buffer,loop:this.loop,rate:this.playbackRate.value});},stop(at=0){if(at>ctx.currentTime){this.end=at;return;}meter.active.delete(this);this.onended?.();}};}
  };
  options.beforeScripts?.(s);
 }});
 const E=s=>r.eval(s),J=s=>JSON.parse(JSON.stringify(E(s)));
 function advance(ms,code=''){r.advance(ms);for(const source of [...meter.active])if(source.end<=box.performance.now()/1000){meter.active.delete(source);source.onended?.();}if(code)E(code);}
 async function load(){await E('preloadGameAudio()');}
 return {r,E,J,advance,load,meter};
};
