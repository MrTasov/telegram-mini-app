// Exercise registered input handlers from a locked AudioContext. The previous
// polish test intentionally checked timing, but started WebAudio as running.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
process.env.LAST_BASE_ASSETS=root;
const {setup}=require('./runtime.cjs'),checks=[];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot(config={}){
 const meter={active:false,contexts:0,resumes:0,requests:[],decodes:0,starts:0,rejects:config.rejects||0,failed:false};
 const r=setup(path.join(root,'index.html'),config.storage||{},{mainMenu:true,width:390,height:844,maxTouchPoints:5,beforeScripts:s=>{
  const register=s.addEventListener;
  s.addEventListener=(type,fn,options)=>{let used=false;register(type,e=>{if(options?.once&&used)return;used=true;fn(e);},options);};
  s.fetch=async url=>{
   meter.requests.push(url);
   if(config.networkFailure&&!meter.failed&&url.includes('chop_wood')){meter.failed=true;return {ok:false};}
   const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
  };
  s.AudioContext=class{
   state='suspended';destination={};currentTime=0;
   constructor(){meter.contexts++;}
   resume(){meter.resumes++;if(!meter.active||meter.rejects-->0)return Promise.reject(Error('NotAllowedError'));this.state='running';return Promise.resolve();}
   async decodeAudioData(data){
    meter.decodes++;
    if(config.decodeFailure&&!meter.failed){meter.failed=true;throw Error('Decode failed');}
    const view=new DataView(data);assert.equal(view.getUint32(0,false),0x52494646);assert.equal(view.getUint32(8,false),0x57415645);
    let peak=0;for(let i=44;i<view.byteLength;i+=2)peak=Math.max(peak,Math.abs(view.getInt16(i,true)));
    assert.ok(peak>1000,'WAV must contain audible PCM');return {duration:(data.byteLength-44)/88200};
   }
   createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
   createBufferSource(){return {buffer:null,playbackRate:{value:1},connect(){},disconnect(){},start(){meter.starts++;},stop(){this.onended?.();}};}
  };
 }});
 const E=code=>r.eval(code);
 function input(type,target='menuNew',extra={}){
  const props={pointerType:'touch',isTrusted:true,...extra};
  meter.active=props.isTrusted&&(type==='pointerup'||type==='touchend'||type==='click'||type==='keydown'||type==='pointerdown'&&props.pointerType==='mouse');
  try{return r.emit(type,r.doc.getElementById(target),props);}finally{meter.active=false;}
 }
 return {r,E,input,meter};
}
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(error){checks.push({id,status:'FAIL',error:error.message});}await settle();global.gc?.();}
(async()=>{
 await check('touch.releaseUnlocksAfterUnactivatedPress',async()=>{
  const {E,input}=boot();input('pointerdown');await settle();input('pointerup');input('touchend');await settle();
  assert.equal(E('audioCtx?.state'),'running');assert.equal(E('Object.keys(audioBuffers).length'),3);
  for(const [name,channel]of [['footsteps','step'],['chopWood','work'],['mineRock','work']])assert.equal(E(`playAnimationSound('${name}','${channel}')`),true);
 });
 await check('ui.stoppedBubblingStillUnlocks',async()=>{
  const {E,input}=boot();input('pointerdown','v010ReloadButton',{pointerType:'mouse'});await settle();
  assert.equal(E('audioCtx?.state'),'running');assert.equal(E("playAnimationSound('footsteps','step')"),true);
 });
 await check('keyboard.startsAudioWithoutPointer',async()=>{
  const {E,input}=boot();input('keydown','menuNew',{key:'Enter',code:'Enter'});await settle();assert.equal(E('audioCtx?.state'),'running');
 });
 await check('click.startsAudioForMenuActivation',async()=>{
  const {E,input}=boot();input('click');await settle();assert.equal(E('audioCtx?.state'),'running');
 });
 await check('resume.rejectedFirstGestureCanRecover',async()=>{
  const {E,input}=boot({rejects:1});input('pointerdown','menuNew',{pointerType:'mouse'});await settle();
  assert.equal(E('audioCtx.state'),'suspended');input('pointerdown','menuNew',{pointerType:'mouse'});await settle();assert.equal(E('audioCtx.state'),'running');
 });
 await check('mobile.interruptionAndSuspensionRecoverWithoutReloadingBuffers',async()=>{
  const {E,input,meter}=boot();input('pointerdown','menuNew',{pointerType:'mouse'});await settle();
  for(const state of ['interrupted','suspended']){E(`audioCtx.state='${state}';document.hidden=true`);input('pointerup');assert.equal(E('audioCtx.state'),state);E('document.hidden=false');input('pointerup');await settle();assert.equal(E('audioCtx.state'),'running');}
  assert.equal(meter.contexts,1);assert.equal(meter.requests.length,3);assert.equal(meter.decodes,3);
 });
 await check('assets.failedRequestRetriesOnlyMissingBuffer',async()=>{
  const {r,E,input,meter}=boot({networkFailure:true});input('pointerdown','menuNew',{pointerType:'mouse'});await settle();
  assert.equal(E('Object.keys(audioBuffers).length'),2);for(let i=0;i<20;i++)input('click');await settle();assert.equal(meter.requests.length,3);
  r.advance(1001);input('click');await settle();assert.equal(E('Object.keys(audioBuffers).length'),3);assert.equal(meter.requests.length,4);
 });
 await check('assets.failedDecodeCanRetry',async()=>{
  const {r,E,input,meter}=boot({decodeFailure:true});input('pointerdown','menuNew',{pointerType:'mouse'});await settle();
  assert.equal(E('Object.keys(audioBuffers).length'),2);r.advance(1001);input('click');await settle();assert.equal(E('Object.keys(audioBuffers).length'),3);assert.equal(meter.requests.length,4);
 });
 await check('assets.concurrentGesturesDeduplicateLoadsAndRunningContext',async()=>{
  const {E,input,meter}=boot();for(let i=0;i<100;i++)input('pointerdown','menuNew',{pointerType:'mouse'});await settle();
  for(let i=0;i<100;i++)input('click');await settle();assert.equal(meter.requests.length,3);assert.equal(meter.decodes,3);assert.equal(meter.contexts,1);assert.equal(meter.resumes,1);assert.equal(E('Object.keys(audioBuffers).length'),3);
 });
 await check('preferences.savedMuteIsRespected',async()=>{
  const {E,input,meter}=boot({storage:{base_sound:'0'}});input('pointerdown','menuNew',{pointerType:'mouse'});await settle();
  assert.equal(E('masterVolume'),0);assert.equal(E("playAnimationSound('footsteps','step')"),false);assert.equal(meter.starts,0);
 });
 const result={patch:'audio-unlock-hotfix-1',testedRoot:root,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks,limitations:['Modeled browser user activation and WebAudio; no physical device audio output.']};
 if(process.argv[3])fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
