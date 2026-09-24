/* 0.10 — optional goals, verifiable lifetime statistics, research and base journal. */
window.V010Progression=(()=>{
  const KEYS=['kills','mined','harvested','produced','discovered'];
  const NAMES={kills:'Зомби побеждено',mined:'Руды добыто',harvested:'Урожая собрано',produced:'Предметов произведено',discovered:'Мест исследовано'};
  const LIMIT=1000000000;
  const TECH={
    precision_blueprint:{name:'Точное оружие',description:'Достижение опытного стрелка',paths:[['kills',500],['harvested',800]]},
    elite_weapon:{name:'Опытный оружейник',description:'Достижение мастера оружия',paths:[['kills',1000],['discovered',16]]},
    workshop_efficiency:{name:'Эффективная мастерская',description:'Можно изготовить ускоритель производства',paths:[['produced',500],['harvested',1600],['discovered',10]]},
    tools_upgrade:{name:'Улучшенная кирка',description:'Можно изготовить улучшение скорости добычи',paths:[['mined',500],['discovered',8]]}
  };
  const ACH=[];
  for(const [metric,thresholds] of Object.entries({kills:[100,500,1000],mined:[100,500,2000],harvested:[160,800,1600],produced:[100,500,2000],discovered:[3,8,16]})){
    thresholds.forEach((target,tier)=>ACH.push({id:metric+'_'+target,metric,target,title:NAMES[metric]+' · '+target,rewards:[{type:'iron',qty:5*(tier+1)},{type:'copper',qty:3*(tier+1)}]}));
  }
  const ORDERS=[
    {id:'road_watch',title:'Безопасная дорога',metric:'kills',target:35,description:'Победите 35 зомби там, где сами выберете.',reward:{type:'iron',qty:10}},
    {id:'ore_supply',title:'Запас для мастерской',metric:'mined',target:100,description:'Добудьте 100 единиц любой руды.',reward:{type:'parts',qty:2}},
    {id:'harvest_supply',title:'Урожай в запас',metric:'harvested',target:320,description:'Соберите 320 единиц любых культур.',reward:{type:'copper',qty:6}},
    {id:'workshop_shift',title:'Рабочая смена',metric:'produced',target:150,description:'Произведите 150 единиц любых предметов.',reward:{type:'iron',qty:10}},
    {id:'new_paths',title:'Новые маршруты',metric:'discovered',target:4,description:'Откройте четыре незнакомых места или района.',reward:{type:'parts',qty:3}}
  ];
  const GOALS=[
    {id:'base_power',title:'Энергия для базы',description:'Запустите генератор. Уже работающий генератор тоже учитывается.',test:()=>!!V09Power.running,reward:{type:'fuel',qty:2}},
    {id:'base_arms',title:'Готовность к вылазке',description:'Получите АК или M4 любым способом.',test:()=>owned('rifle_ak74')+owned('rifle_m4')>0,reward:{type:'ammo',qty:30}},
    {id:'base_battery',title:'Резервное питание',description:'Накопите первый заряд батареи — не менее 0,05 кВт·ч.',test:()=>!!window.V010Energy&&V010Energy.battery.charge>=0.05,reward:{type:'parts',qty:2}},
    {id:'base_water',title:'Запас воды',description:'Держите на базе или при себе 10 единиц воды.',test:()=>owned('water')>=10,reward:{type:'animal_feed',qty:10}}
  ];
  function fresh(){return {schema:1,startedAt:Date.now(),counts:Object.fromEntries(KEYS.map(k=>[k,0])),byResource:{mined:{},harvested:{},produced:{}},discoveries:[],unlocks:[],claimed:[],announced:[],pending:[],orders:{},completedGoals:[],pin:null,journal:[]};}
  let state=fresh(),elapsed=0,dirty=true,tab='achievements';
  const seenLog=new Map();
  function changed(){dirty=true;if(typeof queueGameSave==='function')queueGameSave();}
  function owned(type){let n=0;for(const s of bag||[])if(s?.type===type)n+=s.qty;for(const c of storageChests||[])for(const s of c?.items||[])if(s?.type===type)n+=s.qty;return n;}
  function appendLog(value,kind='base'){
    const raw=typeof value==='string'?value:value?.text??value?.message;
    if(typeof raw!=='string'||!raw.trim())return;
    const text=raw.trim().slice(0,300),now=Date.now();
    if(seenLog.has(text)&&now-seenLog.get(text)<30000)return;
    seenLog.set(text,now);if(seenLog.size>150)seenLog.delete(seenLog.keys().next().value);
    state.journal.unshift({text,kind:String(kind).slice(0,24),at:now});state.journal.length=Math.min(state.journal.length,100);changed();
  }
  function report(text,kind='progress'){
    appendLog(text,kind);
    if(typeof message==='function')message(text);
  }
  function unlock(id,silent=false){
    if(typeof id!=='string'||!Object.hasOwn(TECH,id)||state.unlocks.includes(id))return false;
    state.unlocks.push(id);changed();
    if(!silent)report('Изучено: '+TECH[id].name+'. Чертёж доступен на станке.','research');
    if(window.V010)V010.emit('research',{id});return true;
  }
  function isUnlocked(id){return window.GameAvailability?GameAvailability.legacy(id):state.unlocks.includes(id);}
  function evaluate(silent=false){
    for(const [id,t] of Object.entries(TECH))if(t.paths.some(([k,n])=>state.counts[k]>=n))unlock(id,silent);
    for(const a of ACH)if(state.counts[a.metric]>=a.target&&!state.announced.includes(a.id)){
      state.announced.push(a.id);changed();if(!silent)report('Достижение: '+a.title+'. Выберите награду в статистике.');
    }
    for(const g of GOALS)if(!state.completedGoals.includes(g.id)&&g.test()){
      state.completedGoals.push(g.id);changed();if(!silent)appendLog('Цель выполнена: '+g.title+'. Награда ждёт в разделе целей.','goal');
    }
  }
  function record(metric,qty=1,type){
    if(!KEYS.includes(metric)||!Number.isSafeInteger(qty)||qty<=0)return false;
    const actual=Math.min(qty,LIMIT-state.counts[metric]);if(!actual)return false;
    state.counts[metric]+=actual;
    if(type&&state.byResource[metric]&&Object.hasOwn(ITEM,type))state.byResource[metric][type]=Math.min(LIMIT,(state.byResource[metric][type]||0)+actual);
    changed();evaluate();return true;
  }
  function discover(payload){
    const id=payload?.id;if(typeof id!=='string'||!id||id.length>120||state.discoveries.length>=5000||state.discoveries.includes(id))return false;
    state.discoveries.push(id);return record('discovered',1);
  }
  function achievement(id){return ACH.find(a=>a.id===id);}
  function order(id){return ORDERS.find(o=>o.id===id);}
  function orderProgress(o){const saved=state.orders[o.id];return !saved?0:Math.max(0,state.counts[o.metric]-saved.start);}
  function startOrder(id){
    const o=order(id);if(!o||state.orders[id])return false;
    state.orders[id]={start:state.counts[o.metric]};changed();report('Выбран заказ: '+o.title+'. Срока выполнения нет.');return true;
  }
  function award(id,reward){
    if(state.claimed.includes(id)||!reward||!ITEM[reward.type])return false;
    // Commit once, then deliver what fits. A full inventory never destroys a reward.
    state.claimed.push(id);state.pending.push({id,type:reward.type,qty:reward.qty});changed();collectPending(id);return true;
  }
  function collectPending(id){
    const p=state.pending.find(x=>x.id===id);if(!p)return false;
    const before=p.qty,left=addItem(p.type,before),delivered=before-left;
    if(delivered<=0){message('Награда сохранена. Освободите место в рюкзаке.');return false;}
    p.qty=left;if(!left)state.pending=state.pending.filter(x=>x!==p);
    changed();appendLog('Получена награда: '+ITEM[p.type].name+' × '+delivered,'reward');
    if(typeof renderInventory==='function')renderInventory();return true;
  }
  function claim(id,choice=0){
    const a=achievement(id);
    if(a){if(state.counts[a.metric]<a.target||!Number.isInteger(choice)||!a.rewards[choice])return false;return award(id,a.rewards[choice]);}
    const o=order(id);if(o){if(!state.orders[id]||orderProgress(o)<o.target)return false;return award(id,o.reward);}
    const g=GOALS.find(g=>g.id===id);if(g){evaluate(true);if(!state.completedGoals.includes(id))return false;return award(id,g.reward);}
    return false;
  }
  function pin(id){
    if(id!==null&&!achievement(id)&&!order(id)&&!GOALS.some(g=>g.id===id))return false;
    state.pin=state.pin===id?null:id;changed();renderPin();return true;
  }
  function progressFor(id){
    const a=achievement(id);if(a)return {title:a.title,value:Math.min(state.counts[a.metric],a.target),max:a.target};
    const o=order(id);if(o)return {title:o.title,value:Math.min(orderProgress(o),o.target),max:o.target};
    const g=GOALS.find(g=>g.id===id);if(g)return {title:g.title,value:state.completedGoals.includes(id)?1:0,max:1};
    return null;
  }
  const css=document.createElement('style');I18n.assign(css,"textContent",`
  #v010ProgressPanel{width:min(850px,94vw);max-height:88dvh;display:flex;flex-direction:column;text-align:left;padding:18px;gap:10px}
  #v010ProgressPanel h2{margin:0;font-size:20px}#v010ProgressPanel .v010Muted{font-size:12px;color:#a4b7b9;line-height:1.5}
  #v010ProgressBody{overflow:auto;min-height:0;flex:1;overscroll-behavior:contain}.v010ProgressTabs{display:flex;flex-wrap:wrap;gap:6px}
  #v010ProgressPanel button{cursor:pointer}.v010ProgressTabs button,.v010ProgressSmall{border:1px solid #465961;color:#dce8e6;background:#24343b;border-radius:7px;padding:8px 10px;min-height:34px;font-size:12px}
  .v010ProgressTabs button.active{border-color:#d8b86c;background:#415146}.v010ProgressCard{border:1px solid #3a4b51;border-radius:9px;padding:11px;margin-bottom:8px;background:#18272e}
  .v010ProgressCard strong{font-size:14px}.v010ProgressCard .v010ProgressRow{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .v010ProgressBar{height:5px;border-radius:3px;background:#34454a;margin:8px 0;overflow:hidden}.v010ProgressBar i{height:100%;display:block;background:#a4be83}
  .v010ProgressRewards{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.v010ProgressSmall img{width:24px;height:24px;object-fit:contain;vertical-align:middle}
  .v010StatsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v010StatValue{font-size:25px;color:#e7d197;padding-top:5px}
  #v010PinnedGoal{position:fixed;left:max(14px,env(safe-area-inset-left));top:145px;z-index:14;max-width:220px;padding:7px 10px;background:rgba(14,25,30,.73);border:1px solid #64715c;border-radius:8px;text-align:left;color:#e4e9dc;font-size:11px;pointer-events:auto;cursor:pointer;display:none}
  #v010PinnedGoal b{display:block;font-size:12px;font-weight:500}#v010PinnedGoal span{display:block;margin-top:3px;color:#c9d6b4}
  @media(max-height:500px){#v010ProgressPanel{max-height:94dvh;padding:12px}#v010PinnedGoal{top:105px;max-width:180px;font-size:10px}}
  `);document.head.appendChild(css);
  const overlay=document.createElement('div');overlay.id='v010ProgressOverlay';overlay.className='overlay';
  I18n.assign(overlay,"innerHTML",'<div id="v010ProgressPanel" class="panel"><div class="v010ProgressRow"><h2>Статистика и достижения</h2></div><div class="v010Muted">Развивайтесь в своём стиле. Награды и исследования не требуют ежедневного входа.</div><div id="v010ProgressTabs" class="v010ProgressTabs"></div><div id="v010ProgressBody"></div><button id="v010ProgressClose" class="menuButton">Закрыть</button></div>');
  document.body.appendChild(overlay);
  el('v010ProgressClose').onclick=()=>closeOverlay(overlay);
  const goalHUD=document.createElement('button');goalHUD.id='v010PinnedGoal';I18n.setAttr(goalHUD,'aria-label','Открыть закреплённую цель');goalHUD.onclick=()=>show('achievements');document.body.appendChild(goalHUD);
  const settingsButton=document.createElement('button');settingsButton.className='menuButton';settingsButton.id='v010OpenProgress';I18n.assign(settingsButton,"textContent",'Статистика, достижения и журнал');settingsButton.onclick=()=>{closeOverlay(el('settingsOverlay'));show();};el('closeSettings').before(settingsButton);
  function node(tag,text,cls){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)I18n.assign(e,"textContent",text);return e;}
  function button(text,fn,disabled=false){const b=node('button',text,'v010ProgressSmall');b.disabled=disabled;b.onclick=()=>{fn();render();};return b;}
  function addBar(card,value,max){const bar=node('div',undefined,'v010ProgressBar'),fill=node('i');fill.style.width=Math.min(100,value/max*100)+'%';bar.appendChild(fill);card.appendChild(bar);}
  function addRewards(card,id,rewards,eligible){
    const row=node('div',undefined,'v010ProgressRewards'),pending=state.pending.find(p=>p.id===id);
    if(pending){row.appendChild(button('Забрать '+ITEM[pending.type].name+' × '+pending.qty,()=>collectPending(id)));}
    else if(state.claimed.includes(id))row.appendChild(node('span','Награда получена','v010Muted'));
    else rewards.forEach((reward,i)=>row.appendChild(button((rewards.length>1?'Выбрать: ':'Забрать: ')+ITEM[reward.type].name+' × '+reward.qty,()=>claim(id,i),!eligible)));
    card.appendChild(row);
  }
  function progressCard(title,id,value,max){const card=node('div',undefined,'v010ProgressCard'),row=node('div',undefined,'v010ProgressRow');row.appendChild(node('strong',title));const pinButton=button(state.pin===id?'★':'☆',()=>pin(id));I18n.setAttr(pinButton,'aria-label',state.pin===id?'Открепить цель':'Закрепить цель');I18n.assign(pinButton,'title',I18n.source(pinButton,'aria-label'));row.appendChild(pinButton);card.appendChild(row);card.appendChild(node('div',Math.min(value,max)+' / '+max,'v010Muted'));addBar(card,value,max);return card;}
  function renderPin(){const p=progressFor(state.pin);goalHUD.style.display=p?'block':'none';goalHUD.replaceChildren();if(p){goalHUD.appendChild(node('b',p.title));goalHUD.appendChild(node('span',p.value+' / '+p.max+(p.value>=p.max?' · Готово':'')));}goalHUD.classList.toggle('complete',!!p&&p.value>=p.max);}
  function render(){
    dirty=false;renderPin();const tabs=el('v010ProgressTabs');tabs.replaceChildren();
    for(const [id,title] of [['achievements','Достижения'],['stats','Статистика'],['research','Исследования'],['orders','Заказы и цели'],['journal','Журнал']]){const b=button(title,()=>{tab=id;});b.classList.toggle('active',tab===id);tabs.appendChild(b);}
    const body=el('v010ProgressBody');body.replaceChildren();
    if(tab==='achievements'){
      body.appendChild(node('p','Чертежи открываются автоматически. Для материальной награды выберите один вариант.','v010Muted'));
      for(const a of ACH){const c=progressCard(a.title,a.id,state.counts[a.metric],a.target);addRewards(c,a.id,a.rewards,state.counts[a.metric]>=a.target);body.appendChild(c);}
    }else if(tab==='stats'){
      body.appendChild(node('p','Счётчики ведутся с перехода на 0.10. Старые действия задним числом не выдумываются. Перекладывание предметов не учитывается.','v010Muted'));
      const grid=node('div',undefined,'v010StatsGrid');for(const k of KEYS){const c=node('div',undefined,'v010ProgressCard');c.appendChild(node('strong',NAMES[k]));c.appendChild(node('div',state.counts[k].toLocaleString(I18n.locale),'v010StatValue'));grid.appendChild(c);}body.appendChild(grid);
      for(const metric of ['mined','harvested','produced']){const rows=Object.entries(state.byResource[metric]);if(!rows.length)continue;const c=node('div',undefined,'v010ProgressCard');c.appendChild(node('strong',NAMES[metric]));for(const [type,n] of rows)c.appendChild(node('div',ITEM[type].name+' — '+n,'v010Muted'));body.appendChild(c);}
    }else if(tab==='research'){
      body.appendChild(node('p','Для каждого чертежа достаточно одного из указанных путей. Открытие чертежа не выдаёт готовое оборудование: его нужно изготовить.','v010Muted'));
      for(const [id,t] of Object.entries(TECH)){const c=node('div',undefined,'v010ProgressCard');c.appendChild(node('strong',(isUnlocked(id)?'✓ ':'')+t.name));c.appendChild(node('div',t.description,'v010Muted'));for(const [k,n] of t.paths)c.appendChild(node('div',NAMES[k]+': '+Math.min(state.counts[k],n)+' / '+n,'v010Muted'));c.appendChild(node('div',isUnlocked(id)?'Чертёж изучен':'Выполните любой один путь','v010Muted'));body.appendChild(c);}
    }else if(tab==='orders'){
      body.appendChild(node('p','Цели базы учитывают уже достигнутое. Добровольные заказы считают новые действия после выбора; срока и штрафа за пропуск нет.','v010Muted'));
      for(const g of GOALS){const done=state.completedGoals.includes(g.id),c=progressCard(g.title,g.id,done?1:0,1);c.appendChild(node('div',g.description,'v010Muted'));addRewards(c,g.id,[g.reward],done);body.appendChild(c);}
      for(const o of ORDERS){const c=progressCard(o.title,o.id,orderProgress(o),o.target);c.appendChild(node('div',o.description,'v010Muted'));if(!state.orders[o.id])c.appendChild(button('Выбрать заказ',()=>startOrder(o.id)));else addRewards(c,o.id,[o.reward],orderProgress(o)>=o.target);body.appendChild(c);}
    }else{
      if(!state.journal.length)body.appendChild(node('p','Здесь появятся события базы, исследования и награды.','v010Muted'));
      for(const j of state.journal){const c=node('div',undefined,'v010ProgressCard');c.appendChild(node('div',j.text));c.appendChild(node('div',I18n.dateText(j.at,{dateStyle:'short',timeStyle:'medium'}),'v010Muted'));body.appendChild(c);}
    }
  }
  function show(which='achievements'){tab=['achievements','stats','research','orders','journal'].includes(which)?which:'achievements';evaluate(true);render();openOverlay(overlay);}
  function tick(dt=16){
    elapsed+=Number.isFinite(dt)?Math.max(0,dt):16;if(elapsed<1000)return;elapsed%=1000;
    evaluate();
    if(dirty){renderPin();if(overlay.classList.contains('open'))render();}
  }
  function capture(){return JSON.parse(JSON.stringify(state));}
  function validate(d){
    if(d===null||d===undefined)return true;
    const fail=()=>{throw new Error('Неверные данные статистики и достижений');};
    const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=LIMIT;
    if(!obj(d)||d.schema!==1||!Number.isSafeInteger(d.startedAt)||d.startedAt<0||!obj(d.counts)||KEYS.some(k=>!integer(d.counts[k])))fail();
    if(!obj(d.byResource))fail();for(const k of ['mined','harvested','produced'])if(!obj(d.byResource[k])||Object.entries(d.byResource[k]).some(([type,n])=>!Object.hasOwn(ITEM,type)||!integer(n)))fail();
    const ids=(xs,max,test)=>Array.isArray(xs)&&xs.length<=max&&new Set(xs).size===xs.length&&xs.every(test);
    const validId=id=>!!achievement(id)||!!order(id)||GOALS.some(g=>g.id===id);
    if(!ids(d.discoveries,5000,id=>typeof id==='string'&&id.length>0&&id.length<=120)||d.counts.discovered!==d.discoveries.length)fail();
    if(!ids(d.unlocks,Object.keys(TECH).length,id=>Object.hasOwn(TECH,id))||!ids(d.claimed,50,validId)||!ids(d.announced,ACH.length,id=>!!achievement(id))||!ids(d.completedGoals,GOALS.length,id=>GOALS.some(g=>g.id===id)))fail();
    if(!obj(d.orders)||Object.entries(d.orders).some(([id,o])=>!order(id)||!obj(o)||!integer(o.start)||o.start>d.counts[order(id).metric]))fail();
    if(d.pin!==null&&!validId(d.pin))fail();
    if(!Array.isArray(d.pending)||d.pending.length>50||new Set(d.pending.map(p=>p?.id)).size!==d.pending.length||d.pending.some(p=>!obj(p)||!d.claimed.includes(p.id)||!Object.hasOwn(ITEM,p.type)||!integer(p.qty)||p.qty<1))fail();
    for(const p of d.pending){const a=achievement(p.id),o=order(p.id),g=GOALS.find(g=>g.id===p.id),rewards=a?a.rewards:o?[o.reward]:g?[g.reward]:[];if(!rewards.some(r=>r.type===p.type&&p.qty<=r.qty))fail();}
    if(!Array.isArray(d.journal)||d.journal.length>100||d.journal.some(j=>!obj(j)||typeof j.text!=='string'||j.text.length>300||typeof j.kind!=='string'||j.kind.length>24||!Number.isSafeInteger(j.at)||j.at<0))fail();
    return true;
  }
  function restore(d){validate(d);state=d?JSON.parse(JSON.stringify(d)):fresh();elapsed=0;dirty=true;seenLog.clear();evaluate(true);renderPin();}
  const api={TECH,ACH,ORDERS,GOALS,count:metric=>state.counts[metric],record,discover,isUnlocked,isLegacyUnlocked:id=>state.unlocks.includes(id),unlock,claim,collectPending,startOrder,pin,show,log:appendLog,tick,capture,restore,validate,get state(){return capture();}};
  V010.on('combatkill',()=>record('kills',1));
  V010.on('mined',p=>{if(Number.isSafeInteger(p?.qty))record('mined',p.qty,p.type);});
  V010.on('harvested',p=>{if(Number.isSafeInteger(p?.qty))record('harvested',p.qty,p.type);});
  V010.on('produced',p=>{if(Number.isSafeInteger(p?.qty))record('produced',p.qty,p.type);});
  V010.on('discover',discover);V010.on('log',p=>appendLog(p,p?.kind||'base'));
  V010.register('progression',api);return api;
})();
