/* Presentation only. No simulation references, save fields, timers or input handlers.
   New UI uses t(key, params); legacy output is mapped to the same catalogs here. */
window.I18n=(()=>{
  'use strict';
  const {manifest,catalogs,legacy}=LocaleCatalog,storageKey='last_base_language_v1';
  let language=manifest.default,lastPersisted=true;
  try{const saved=localStorage.getItem(storageKey);if(Object.hasOwn(catalogs,saved))language=saved;}catch(_){}
  const bindings=new WeakMap(),attributes=new WeakMap(),setValues=new WeakMap(),cache=new Map(),formats=new Map();
  const listeners=new Set(),trie=new Map(),rawTrie=new Map();
  const letter=c=>!!c&&/[A-Za-zА-Яа-яЁё]/.test(c),skipped=n=>/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName)||n.getAttribute?.('data-i18n-skip')!=null;
  // Compact prefix buckets avoid a node/object for every character of the
  // catalog. Longest matching phrases win; boundary checks protect substrings.
  function insert(index,source,value){index.set(source,{source,...value});}
  for(const [source,key]of Object.entries(legacy)){
    for(const [variant,kind]of [[source.toUpperCase(),'upper'],[source.toLowerCase(),'lower']])if(variant!==source){insert(trie,variant,{key,[kind]:true});if(catalogs.ru?.[key]!==source)insert(rawTrie,variant,{key,[kind]:true});}
  }
  for(const [source,key]of Object.entries(legacy)){insert(trie,source,{key});if(catalogs.ru?.[key]!==source)insert(rawTrie,source,{key});}
  function buckets(index){const out=new Map();for(const entry of index.values()){const prefix=entry.source.slice(0,3);if(!out.has(prefix))out.set(prefix,[]);out.get(prefix).push(entry);}for(const entries of out.values())entries.sort((a,b)=>b.source.length-a.source.length);index.clear();return out;}
  const translatedIndex=buckets(trie),russianIndex=buckets(rawTrie);
  const info=()=>manifest.locales.find(l=>l.id===language);
  function formatter(type,options={}){const id=type+':'+language+':'+JSON.stringify(options);if(!formats.has(id)){if(formats.size>=64)formats.clear();formats.set(id,type==='number'?new Intl.NumberFormat(info().intl,options):type==='date'?new Intl.DateTimeFormat(info().intl,options):type==='plural'?new Intl.PluralRules(info().intl):new Intl.Collator(info().intl,options));}return formats.get(id);}
  const number=(value,options={})=>formatter('number',options).format(value);
  const numeric=(value,options={})=>'\uE004'+JSON.stringify({value:Number(value),options})+'\uE005';
  function template(key,params={}){let value=Object.hasOwn(catalogs[language],key)?catalogs[language][key]:Object.hasOwn(catalogs[manifest.default],key)?catalogs[manifest.default][key]:undefined;if(value===undefined)return key;
    if(typeof value==='object')value=value[formatter('plural').select(Number(params.count))]??value.other;
    return value;
  }
  function parameter(value){return value&&typeof value==='object'&&value.format==='date'?formatter('date',value.options).format(value.value):String(value);}
  function t(key,params={}){return template(key,params).replace(/\{([a-zA-Z][\w]*)\}/g,(token,name)=>Object.hasOwn(params,name)?parameter(params[name]):token);}
  const dateParam=(value,options)=>({format:'date',value:Number(value),options});
  const dateText=(value,options)=>message('format.value',{value:dateParam(value,options)});
  // Protected fragments keep player-entered names verbatim, even if a name equals
  // a catalog label. Tokens are transient and never enter game/save data.
  const defaultCrates=['Топливо','Оружие','Железо','Материалы','Еда','Напитки','Медицина','Разное','Урожай','Растения','Куры — яйца','Корова — молоко','Корм животных','Вода животных'];
  const crateName=(crate,index)=>crate?.name===defaultCrates[index]?crate.name:verbatim(crate?.name||'');
  const verbatim=value=>'\uE000'+String(value).replace(/[\uE000\uE001]/g,'')+'\uE001';
  function message(key,params={}){return '\uE002'+JSON.stringify({key,params})+'\uE003';}
  function translate(raw){
    const index=language==='ru'?russianIndex:translatedIndex;let result='';
    for(let i=0;i<raw.length;){
      if(raw[i]==='\uE004'){const end=raw.indexOf('\uE005',i+1);if(end>=0){try{const m=JSON.parse(raw.slice(i+1,end));result+=number(m.value,m.options);i=end+1;continue;}catch(_){}}}
      if(raw[i]==='\uE002'){const end=raw.indexOf('\uE003',i+1);if(end>=0){try{const m=JSON.parse(raw.slice(i+1,end));result+=t(m.key,m.params);i=end+1;continue;}catch(_){}}}
      if(raw[i]==='\uE000'){const end=raw.indexOf('\uE001',i+1);if(end>=0){result+=raw.slice(i+1,end);i=end+1;continue;}}
      let best=null,end=i;
      for(const length of [3,2,1]){const entries=index.get(raw.slice(i,i+length));if(!entries)continue;
        for(const entry of entries){const j=i+entry.source.length;if(raw.startsWith(entry.source,i)&&(!letter(raw[i])||!letter(raw[i-1]))&&(!letter(raw[j-1])||!letter(raw[j]))){best=entry;end=j;break;}}
        if(best)break;
      }
      if(best){const s=t(best.key);result+=best.upper?s.toUpperCase():best.lower?s.toLowerCase():s;i=end;}else result+=raw[i++];
    }
    return result;
  }
  function text(value){const raw=String(value??'');if(cache.has(raw))return cache.get(raw);
    const save=raw.match(/^💾 Сохранено: ([\s\S]*)\.$/),rename=raw.match(/^💾 Название сохранения: ([\s\S]*)$/);
    const result=save?t('save.success',{name:save[1]}):rename?t('save.renamed',{name:rename[1]}):translate(raw);if(cache.size>=1024)cache.delete(cache.keys().next().value);cache.set(raw,result);return result;
  }
  // Logs retain their historical canonical text. Presentation markers must
  // never become save data, regardless of the current display language.
  function canonical(value){return String(value).replace(/\uE002([\s\S]*?)\uE003/g,(raw,payload)=>{try{const {key,params}=JSON.parse(payload),form=catalogs.ru[key]??catalogs[manifest.default][key]??key;return String(form).replace(/\{([a-zA-Z][\w]*)\}/g,(token,name)=>Object.hasOwn(params,name)?String(params[name]):token);}catch(_){return raw;}}).replace(/\uE004([\s\S]*?)\uE005/g,(raw,payload)=>{try{const {value,options}=JSON.parse(payload);return options.minimumFractionDigits===options.maximumFractionDigits?Number(value).toFixed(options.maximumFractionDigits):new Intl.NumberFormat('en-US',options).format(value);}catch(_){return raw;}}).replace(/[\uE000\uE001]/g,'');}
  function bindText(node){const value=node.nodeValue??'',previous=bindings.get(node),raw=previous&&previous.rendered===value?previous.raw:value,rendered=text(raw);
    bindings.set(node,{raw,rendered});if(value!==rendered)node.nodeValue=rendered;
  }
  function bindAttr(node,name,raw){const value=raw??node.getAttribute(name);if(value===null)return;
    let map=attributes.get(node);if(!map)attributes.set(node,map={});
    const old=map[name];raw=raw??(old&&old.rendered===value?old.raw:value);
    const rendered=text(raw);map[name]={raw,rendered};if(node.getAttribute(name)!==rendered)node.setAttribute(name,rendered);
  }
  function localize(node){if(!node)return;if(node.nodeType===3){bindText(node);return;}
    // Comments/doctype have no attribute API. Documents and fragments only
    // contain children; only Elements can carry translatable attributes.
    if(node.nodeType===1){if(skipped(node))return;for(const name of ['title','placeholder','aria-label','alt'])bindAttr(node,name);}
    else if(node.nodeType!==9&&node.nodeType!==11)return;
    for(const child of node.childNodes||[])localize(child);
  }
  function assign(node,property,value){
    if(['title','placeholder','alt'].includes(property)){bindAttr(node,property,String(value));return value;}
    let state=setValues.get(node);if(!state)setValues.set(node,state={});
    const raw=String(value);if(property==='textContent'&&state[property]===raw&&node.textContent===text(raw))return value;
    node[property]=value;state[property]=raw;if(!skipped(node))localize(node);return value;
  }
  function setAttr(node,name,value){if(['title','placeholder','aria-label','alt'].includes(name)){bindAttr(node,name,String(value));return;}node.setAttribute(name,value);}
  function source(node,property='textContent'){if(['title','placeholder','aria-label','alt'].includes(property))return attributes.get(node)?.[property]?.raw??node.getAttribute(property);return setValues.get(node)?.[property]??node[property];}
  function setLanguage(next){if(!Object.hasOwn(catalogs,next))return false;let saved=true;
    try{localStorage.setItem(storageKey,next);}catch(_){saved=false;}
    language=next;cache.clear();formats.clear();document.documentElement.lang=next;localize(document.documentElement);
    lastPersisted=saved;for(const fn of listeners)fn(next,{saved});return true;
  }
  function mount(){document.documentElement.lang=language;localize(document.documentElement);}
  function bind(node,key,params={}){const update=()=>assign(node,'textContent',message(key,typeof params==='function'?params():params));listeners.add(update);update();return()=>listeners.delete(update);}
  return Object.freeze({t,text,message,canonical,verbatim,crateName,assign,setAttr,source,localize,mount,bind,setLanguage,number,numeric,dateText,dateParam,
    date:(value,options)=>formatter('date',options).format(value),compare:(a,b)=>formatter('compare').compare(text(a),text(b)),
    get language(){return language;},get lastPersisted(){return lastPersisted;},get locale(){return info().intl;},get cacheSize(){return cache.size;},storageKey,
    languages:manifest.locales.map(l=>({id:l.id,name:l.name})),onChange:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}});
})();
