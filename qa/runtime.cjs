// Isolated gameplay harness: DOM model and real Canvas2D renderer, no browser storage touched.
const vm=require('vm'),fs=require('fs');
const canvasContract=require('./canvas-contract.cjs');
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const canvas=createCanvas(1280,800);
class Elem{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.nodeType=tag==='#text'?3:tag==='document'?9:1;this.childNodes=[];this.parentNode=null;this.attrs={};this.style={setProperty(k,v){this[k]=v}};this.listeners={};this.dataset=new Proxy({},{set:(o,k,v)=>{o[k]=String(v);this.attrs['data-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]=String(v);return true;}});this._text='';this._html='';this.value='';this.disabled=false;this.width=1280;this.height=800;}
 get children(){return this.childNodes.filter(n=>n.nodeType===1)}set children(v){this.childNodes=v}
 get nodeValue(){return this.nodeType===3?this._text:null}set nodeValue(v){if(this.nodeType===3)this._text=String(v)}
 get title(){return this.getAttribute('title')||''}set title(v){this.setAttribute('title',v)}
 get alt(){return this.getAttribute('alt')||''}set alt(v){this.setAttribute('alt',v)}
 get placeholder(){return this.getAttribute('placeholder')||''}set placeholder(v){this.setAttribute('placeholder',v)}
 get id(){return this.attrs.id||''}set id(v){this.attrs.id=v}
 get className(){return this.attrs.class||''}set className(v){this.attrs.class=v}
 get classList(){let self=this;return {contains(c){return self.className.split(/\s+/).includes(c)},add(...cs){self.className=[...new Set([...self.className.split(/\s+/),...cs])].join(' ').trim()},remove(...cs){self.className=self.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ')},toggle(c,b){let has=this.contains(c);let wanted=b===undefined?!has:b;if(wanted)this.add(c);else this.remove(c);return wanted;}}}
 setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);if(k==='value')this.value=v;}
 getAttribute(k){return this.attrs[k]??null}
 append(...nodes){for(let n of nodes){if(typeof n==='string'){let t=new Elem('#text');t._text=n;n=t;}if(n.parentNode)n.remove();this.childNodes.push(n);n.parentNode=this;}}
 appendChild(n){this.append(n);return n}replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 prepend(...nodes){this.childNodes.unshift(...nodes);for(let n of nodes)n.parentNode=this}
 after(n){const p=this.parentNode;if(p){p.childNodes.splice(p.childNodes.indexOf(this)+1,0,n);n.parentNode=p;}}
 before(n){const p=this.parentNode;if(p){p.childNodes.splice(p.childNodes.indexOf(this),0,n);n.parentNode=p;}}
 remove(){const p=this.parentNode;if(p)p.childNodes=p.childNodes.filter(n=>n!==this);this.parentNode=null}
 set textContent(t){this.childNodes=[];this._text='';this._html='';if(this.nodeType===3)this._text=String(t);else this.append(String(t))}get textContent(){return this._text+this.childNodes.map(c=>c.textContent).join('')}
 set innerHTML(s){this.children=[];this._text='';this._html=String(s);parse(String(s),this)}get innerHTML(){return this._html||this.textContent}
 matches(s){s=s.trim();if(!s)return false;if(s.includes(','))return s.split(',').some(x=>this.matches(x));if(s.includes(' ')){const a=s.split(/\s+/),last=a.pop();return this.matches(last)&&!!this.parentNode?.closest(a.join(' '));}
  const attr=[...s.matchAll(/\[([^\]=]+)(?:=['"]?([^\]'"]*)['"]?)?\]/g)];for(const m of attr)if(this.getAttribute(m[1])===null||(m[2]!==undefined&&this.getAttribute(m[1])!==m[2]))return false;s=s.replace(/\[[^\]]+\]/g,'');
  const id=s.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;const classes=[...s.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);if(classes.some(c=>!this.classList.contains(c)))return false;const tag=s.match(/^[\w-]+/)?.[0];return !tag||this.tagName===tag.toUpperCase();}
 querySelectorAll(s){let out=[];for(const c of this.children){if(c.matches(s))out.push(c);out.push(...c.querySelectorAll(s));}return out}querySelector(s){return this.querySelectorAll(s)[0]||null}
 closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null}
 addEventListener(k,f,opts){const capture=opts===true||opts?.capture;if(capture){this.captureListeners??={};(this.captureListeners[k]??=[]).push(f);}else(this.listeners[k]??=[]).push(f)}removeEventListener(){}
 dispatchEvent(e){e.target??=this;e.preventDefault??=()=>{};e.stopPropagation??=()=>{};for(const f of this.listeners[e.type]||[])f.call(this,e);if(this['on'+e.type])this['on'+e.type](e);return true}
 click(){if(!this.disabled)this.dispatchEvent({type:'click'})}
 getBoundingClientRect(){return {x:0,y:0,left:0,top:0,right:100,bottom:100,width:100,height:100}}
 get offsetWidth(){return 100}get offsetHeight(){return 100}get clientWidth(){return 100}get clientHeight(){return 100}
 setPointerCapture(){}releasePointerCapture(){}focus(){}scrollIntoView(){}insertAdjacentHTML(pos,h){let temp=new Elem();temp.innerHTML=h;this.append(...temp.children)}
 getContext(){if(this.id==='canvas')return canvas.getContext('2d');this._canvas??=createCanvas(this.width||300,this.height||150);if(this._canvas.width!==this.width)this._canvas.width=this.width;if(this._canvas.height!==this.height)this._canvas.height=this.height;return this._canvas.getContext('2d')}toDataURL(){return (this._canvas||canvas).toDataURL()}
 requestFullscreen(){return Promise.resolve()}
}
function parse(html,parent){const stack=[parent];for(const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g)||[]){if(token.startsWith('<!'))continue;if(token.startsWith('</')){const name=token.slice(2).match(/^[\w-]+/)?.[0].toUpperCase();while(stack.length>1){if(stack.pop().tagName===name)break;}continue;}if(token[0]==='<'){const name=token.slice(1).match(/^[\w-]+/)?.[0];if(!name)continue;const n=new Elem(name);for(const a of token.slice(name.length+1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))n.setAttribute(a[1],a[2]??a[3]??a[4]??'');stack.at(-1).append(n);if(!['meta','link','img','input','br','hr','source','path'].includes(name)&&!token.endsWith('/>'))stack.push(n);}else stack.at(-1).append(token.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'\"','&apos;':"'",'&nbsp;':'\u00a0'}[x])));}}
function setup(file,initialStorage={},options={}){
 const html=fs.readFileSync(file,'utf8');const doc=new Elem('document');parse(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,''),doc);
 doc.body=doc.querySelector('body');doc.head=doc.querySelector('head');doc.documentElement=doc.querySelector('html');doc.createElement=t=>new Elem(t);doc.createElementNS=(_,t)=>new Elem(t);doc.getElementById=id=>doc.querySelector('#'+id);doc.hidden=false;doc.visibilityState='visible';
 canvas.width=1280;canvas.height=800;canvasContract.reset(canvas.getContext('2d'));
 const mainCanvas=doc.getElementById('canvas');
 for(const key of ['width','height'])Object.defineProperty(mainCanvas,key,{get:()=>canvas[key],set:value=>{canvas[key]=value;canvasContract.reset(canvas.getContext('2d'));},configurable:true});
 const storage=new Map(Object.entries(initialStorage)),timers=new Map();let counter=0,clock=10000;
 const epoch=options.epoch??Date.UTC(2026,8,19,12),math=Object.create(Math);let seed=options.seed??20260919;
 math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 class ClockDate extends Date{constructor(...a){super(...(a.length?a:[epoch+clock-10000]));}static now(){return epoch+clock-10000;}}
 const storageAPI={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear(),key:n=>[...storage.keys()][n],get length(){return storage.size}};
 class Audio{constructor(src){this.src=src;this.volume=1;this.paused=true;}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}addEventListener(){}load(){}cloneNode(){return new Audio(this.src)}}
 // Only frozen reference runtimes may translate historical paths. The candidate
 // must resolve its own catalog paths without aliases that could hide a broken URL.
 const resourcePath=require('node:path'),resourceRoot=process.env.LAST_BASE_ASSETS||resourcePath.resolve(__dirname,'..');
 const version=JSON.parse(fs.readFileSync(resourcePath.join(resourceRoot,'package.json'),'utf8')).version;
 const referenceBuild=html.match(/<title>([\d.]+)/)?.[1]!==version;
 const migrationPath=resourcePath.join(resourceRoot,'qa/asset-migration.json');
 const oldPaths=referenceBuild&&fs.existsSync(migrationPath)?Object.fromEntries(JSON.parse(fs.readFileSync(migrationPath)).files.map(f=>[f.old,f.path])):{};
 const NativeImage=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas').Image;
 const testLanguage=Object.hasOwn(options,'language')?options.language:process.env.LAST_BASE_TEST_LANGUAGE;if(!referenceBuild&&!storage.has('last_base_language_v1')&&testLanguage)storage.set('last_base_language_v1',testLanguage);
 const imageRequests=[];
 class ResourceImage extends NativeImage{
  set src(value){imageRequests.push(value);const src=Object.hasOwn(options.imageOverrides||{},value)?options.imageOverrides[value]:oldPaths[value]||value;super.src=typeof src==='string'&&!src.startsWith('data:')?resourcePath.resolve(resourceRoot,src):src;}
  get src(){return super.src;}
 }
 const mediaLists=new Map();
 function matchMedia(q){if(!mediaLists.has(q))mediaLists.set(q,{matches:!!options.media?.[q],listeners:[],addEventListener(type,fn){if(type==='change')this.listeners.push(fn);}});return mediaLists.get(q);}
 const windowListeners={},windowCapture={};const errors=[];const sandbox={document:doc,localStorage:storageAPI,console:{log(){},warn:(...x)=>errors.push(x.join(' ')),error:(...x)=>errors.push(x.join(' '))},navigator:{userAgent:'test',maxTouchPoints:options.maxTouchPoints??0},innerWidth:options.width??1280,innerHeight:options.height??800,devicePixelRatio:1,screen:{orientation:{addEventListener(){}}},performance:{now:()=>clock},Audio,Image:ResourceImage,OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h)}},URL,Blob,Math,Date,JSON,Object,Array,Set,Map,Number,String,Boolean,Uint8Array,Float32Array,Float64Array,Int32Array,Promise,
 setTimeout:(f,ms)=>{const n=++counter;timers.set(n,{f,ms});return n},clearTimeout:n=>timers.delete(n),setInterval:()=>++counter,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(k,f,opts){((opts===true||opts?.capture?windowCapture:windowListeners)[k]??=[]).push(f)},removeEventListener(){},matchMedia,getComputedStyle:e=>({getPropertyValue:()=>'',...e.style}),fetch:()=>Promise.reject(Error('test audio disabled')),location:{href:'http://test.local/game',protocol:'http:'},alert(){},confirm:()=>true,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')};
 sandbox.Math=math;sandbox.Date=ClockDate;
 sandbox.setTimeout=(f,ms=0)=>{const id=++counter;timers.set(id,{f,ms,at:clock+ms});return id;};
 sandbox.window=sandbox;sandbox.self=sandbox;const context=vm.createContext(sandbox);
 const path=require('node:path'),loadedScripts=[];
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
   const src=m[1].match(/\bsrc=["']([^"']+)["']/)?.[1];
   if(src&&/^https?:\/\//.test(src))continue; // Telegram SDK stays mocked, as in Stage 0.
   const scriptFile=src?path.resolve(path.dirname(file),src.split(/[?#]/)[0]):file;
   const code=src?fs.readFileSync(scriptFile,'utf8'):m[2];
   vm.runInContext(code,context,{filename:scriptFile,timeout:20000});loadedScripts.push(scriptFile);
 }
 function emit(type,target,props={}){
   const e={type,target,button:0,pointerId:1,pointerType:'touch',clientX:50,clientY:50,...props,defaultPrevented:false,cancelBubble:false,immediate:false,
     preventDefault(){this.defaultPrevented=true},stopPropagation(){this.cancelBubble=true},stopImmediatePropagation(){this.cancelBubble=true;this.immediate=true}};
   const path=[];for(let n=target;n;n=n.parentNode)path.push(n);
   const call=(node,fs)=>{e.currentTarget=node;for(const f of fs||[]){f.call(node,e);if(e.immediate)break;}};
   call(sandbox,windowCapture[type]);
   for(const n of [...path].reverse()){if(e.cancelBubble)break;call(n,n.captureListeners?.[type]);}
   for(const n of path){if(e.cancelBubble)break;call(n,n.listeners[type]);if(!e.immediate&&n['on'+type])n['on'+type](e);}
   if(!e.cancelBubble)call(sandbox,windowListeners[type]);return e;
 }
 return {imageRequests,setCapabilities(media,maxTouchPoints){if(maxTouchPoints!==undefined)sandbox.navigator.maxTouchPoints=maxTouchPoints;for(const [q,m]of mediaLists){const changed=m.matches!==!!media[q];m.matches=!!media[q];if(changed)for(const fn of m.listeners)fn({matches:m.matches});}},listenerCounts(){const count=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.length]));return {window:count(windowListeners),capture:count(windowCapture),document:count(doc.listeners)};},emit,dispatch(type,e={}){e.type=type;e.target??=doc.querySelector('#canvas');e.preventDefault??=()=>{};e.stopPropagation??=()=>{};for(const f of windowListeners[type]||[])f(e);},eval:(s)=>vm.runInContext(s,context,{timeout:30000}),doc,storage,context,errors,canvas,advance(ms){clock+=ms},flushTimers(ms){const end=clock+ms;let count=0;for(;;){const next=[...timers.entries()].filter(([id,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>1000)throw Error('Timer loop in harness');clock=Math.max(clock,next[1].at);timers.delete(next[0]);next[1].f();}clock=end;},timers};
}
function source(file){const path=require('node:path'),html=fs.readFileSync(file,'utf8');return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>{const src=m[1].match(/\bsrc=["']([^"']+)["']/)?.[1];return src?(/^https?:/.test(src)?'':fs.readFileSync(path.resolve(path.dirname(file),src.split(/[?#]/)[0]),'utf8')):m[2];}).join('\n');}
module.exports={setup,canvas,source};
if(require.main===module){const r=setup(process.argv[2]);console.log(JSON.stringify({errors:r.errors,state:r.eval('({scene,handSlots,bag,gameSaveBlocked,gameSaveReady})')}));}
