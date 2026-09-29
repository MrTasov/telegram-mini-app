/* 0.43 Pass B — the one authoritative Animals owner (chickens + cows on L2).
   Replaces the 0.9–0.42 livestock owners (real-time egg/milk timers, auto-breeding up to 50,
   starvation death, #13 water chest). Everything gameplay runs on AgricultureTime in fixed
   15-game-minute steps: no wall-clock time, no offline catch-up, and pause/hidden/death/siege slowdown/
   DEV time behave exactly like the Pass A farm. Poses are presentation only (never saved). */
window.GameLivestock=(()=>{
  'use strict';
  const B=GameplayBalance.animals,copy=v=>JSON.parse(JSON.stringify(v));
  const DAY=WorldClock.dayMs,STEPS=96,STEP=DAY/STEPS,U=384;// ration ticks: 1/384 unit, so 0.25/day = 1 tick per step
  const tick=perDay=>Math.round(perDay*U/STEPS);
  const CH_TICK=tick(B.chickenFeedPerDay),COW_TICK=[tick(B.calfFeedPerDay),tick(B.calfFeedPerDay),tick(B.cowFeedPerDay)];
  const CAP={chicken:{feed:B.chickenFeederCapacity*U,water:B.chickenDrinkerCapacity*U},cow:{feed:B.cowFeederCapacity*U,water:B.cowDrinkerCapacity*U}};
  const MAX_STEPS=STEPS*30;
  const room=id=>BunkerLayout.rooms[id];
  // ---- Geometry (L2 Chicken Farm / Cow Farm) --------------------------------------------------
  const CH=room('chicken_farm'),CW=room('cow_farm');
  const fx={
    nest:{id:'l2_nest',x:CH.left+14,y:CH.top+12,w:62,h:46},
    chickenFeeder:{id:'l2_chicken_feeder',x:CH.left+92,y:CH.top+14,w:78,h:22},
    chickenDrinker:{id:'l2_chicken_drinker',x:CH.left+186,y:CH.top+14,w:62,h:22},
    cowFeeder:{id:'l2_cow_feeder',x:CW.left+18,y:CW.top+130,w:262,h:18},
    cowDrinker:{id:'l2_cow_drinker',x:CW.left+290,y:CW.top+130,w:142,h:18},
    stalls:{id:'l2_cow_stalls',x:CW.left+9,y:CW.top+9,w:CW.right-CW.left-18,h:121}
  };
  const roam={l:CH.left+22,r:CH.right-22,t:CH.top+78,b:CH.bottom-26};
  const stallCenter=i=>({x:CW.left+50+i*70,y:CW.top+72});
  const nestSeat={x:fx.nest.x+fx.nest.w/2,y:fx.nest.y+fx.nest.h/2+2};
  // ---- Deterministic gameplay RNG (saved), overridable for QA ----------------------------------
  let override=null;
  function rand(){if(override)return override();state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;return state.rng/4294967296;}
  // ---- State ------------------------------------------------------------------------------------
  let state=null;
  const stageOf=a=>a.kind==='chicken'?(a.ageMs<B.chickStageDays[0]*DAY?0:a.ageMs<(B.chickStageDays[0]+B.chickStageDays[1])*DAY?1:2):(a.ageMs<B.cowStageDays[0]*DAY?0:a.ageMs<B.cowStageDays[1]*DAY?1:2);
  const list=kind=>state.animals.filter(a=>a.kind===kind);
  const adults=kind=>state.animals.filter(a=>a.kind===kind&&a.stage===2);
  function newAnimal(kind,ageMs,extra={}){
    const a={id:kind+':'+state.nextId++,kind,stage:0,ageMs,...extra};a.stage=stageOf(a);
    if(kind==='chicken'){a.eggMs=Math.floor(rand()*DAY);a.brood=null;}else{a.milkMs=Math.floor(rand()*DAY);}
    return a;
  }
  const calfInterval=()=>Math.round((B.calfMinDays+rand()*(B.calfMaxDays-B.calfMinDays))*DAY);
  function freeStall(){const used=new Set(list('cow').map(a=>a.stall));for(let i=0;i<B.cowMax;i++)if(!used.has(i))return i;return -1;}
  // Owner decision (Pass B §3): legacy herds are not migrated; every save without this block starts here.
  function startHerd(seed=0x5eed043){
    state={schema:1,rng:seed>>>0,nextId:1,acc:0,at:AgricultureTime.now(),animals:[],
      chicken:{feed:CAP.chicken.feed,water:CAP.chicken.water},cow:{feed:CAP.cow.feed,water:CAP.cow.water},
      calfMs:0,pending:{eggs:0,milk:0}};
    for(let i=0;i<B.startChickens;i++)state.animals.push(newAnimal('chicken',(B.chickStageDays[0]+B.chickStageDays[1])*DAY));
    for(let i=0;i<B.startCows;i++)state.animals.push(newAnimal('cow',B.cowStageDays[1]*DAY,{stall:i}));
    state.calfMs=calfInterval();poses.clear();return state;
  }
  // ---- Transient presentation / notification state -------------------------------------------
  const poses=new Map();let last={},notified={},panelPaint=0,nextMoo=performance.now()+3000+livestockLoadRandom*12000;
  const available=()=>AgricultureTime.animalsAvailable;
  const active=()=>available()&&!!state&&state.animals.length>0;
  const powered=()=>typeof devicePowered==='function'&&devicePowered('animal_system');
  const units=t=>t/U;
  const fed=kind=>{const need=kind==='chicken'?list('chicken').length*CH_TICK:list('cow').reduce((n,a)=>n+COW_TICK[a.stage],0),s=state[kind];return {ok:need>0&&s.feed>=need&&s.water>=need,need,feed:s.feed>=need,water:s.water>=need};};
  // ---- Items ------------------------------------------------------------------------------------
  function flush(){
    if(state.pending.eggs>0)state.pending.eggs=addToSlots(storageChests[B.eggStorage].items,'eggs',state.pending.eggs,60);
    if(state.pending.milk>0)state.pending.milk=addToSlots(storageChests[B.milkStorage].items,'milk',state.pending.milk,60);
  }
  // Clean water already produced reaches the drinkers by pipe; no power needed for distribution.
  function refillDrinkers(){
    if(!window.BunkerPassA||!window.L2Systems?.water)return false;const w=BunkerPassA.water;let changed=false;
    for(const kind of ['chicken','cow']){const s=state[kind],room=CAP[kind].water-s.water,have=Math.floor(w.clean*U+1e-9);const t=Math.min(room,have);if(t>0){s.water+=t;w.clean=Math.max(0,w.clean-t/U);changed=true;}}
    return changed;
  }
  // ---- One 15-game-minute step ------------------------------------------------------------------
  function step(){
    refillDrinkers();
    if(!available())return;
    const on=powered();last.power=on;
    const c=fed('chicken'),w=fed('cow');last.chicken=c;last.cow=w;
    if(!on)return;
    if(c.ok){
      state.chicken.feed-=c.need;state.chicken.water-=c.need;
      for(const a of list('chicken')){
        a.ageMs+=STEP;a.stage=stageOf(a);
        if(a.brood){a.brood.progressMs=Math.min(B.incubationDays*DAY,a.brood.progressMs+STEP);if(a.brood.progressMs>=B.incubationDays*DAY)hatch(a);}
        else if(a.stage===2){a.eggMs+=STEP;if(a.eggMs>=DAY/B.eggsPerDay){a.eggMs-=DAY/B.eggsPerDay;state.pending.eggs++;}}
      }
    }
    if(w.ok){
      state.cow.feed-=w.need;state.cow.water-=w.need;
      for(const a of list('cow')){
        a.ageMs+=STEP;a.stage=stageOf(a);
        if(a.stage===2){a.milkMs+=STEP;if(a.milkMs>=DAY){a.milkMs-=DAY;state.pending.milk+=B.milkBase+(rand()<B.milkBonusChance?1:0);}}
      }
      state.calfMs=Math.max(0,state.calfMs-STEP);
      if(state.calfMs<=0&&adults('cow').length>=2&&freeStall()>=0){const s=freeStall();state.animals.push(newAnimal('cow',0,{stall:s}));state.calfMs=calfInterval();note('calf',true,true);}
    }
    flush();
  }
  function hatch(hen){
    const eggs=hen.brood.eggs;let born=0;hen.brood=null;
    for(let i=0;i<eggs;i++){if(rand()<B.hatchChance&&list('chicken').length<B.chickenMax){state.animals.push(newAnimal('chicken',0));born++;}}
    note('hatch',true,true,{born,eggs});
  }
  function settle(now=AgricultureTime.now()){
    if(!state)return;
    if(now<state.at){state.at=now;return;}
    state.acc+=now-state.at;state.at=now;let n=0;
    while(state.acc>=STEP&&n<MAX_STEPS){state.acc-=STEP;step();n++;}
    if(n>=MAX_STEPS)state.acc=Math.min(state.acc,STEP-1);
    if(n)notifications();
  }
  // ---- Notifications: only on a state change, with a cooldown ----------------------------------
  function note(key,on,always=false,params={}){
    const was=!!notified[key];notified[key]=on;if(!on||was&&!always)return;
    const t=performance.now();if(!always&&t-(notified[key+':at']||-1e9)<B.notifyCooldownMs)return;notified[key+':at']=t;
    const text={power:'animals.note.power',chickenFeed:'animals.note.chickenFeed',chickenWater:'animals.note.chickenWater',cowFeed:'animals.note.cowFeed',cowWater:'animals.note.cowWater',calf:'animals.note.calf',hatch:'animals.note.hatch'}[key];
    if(text&&typeof message==='function')message(I18n.message(text,params));
  }
  function notifications(){
    if(!available())return;note('power',last.power===false);
    if(last.power===false)return;
    note('chickenFeed',!!last.chicken&&!last.chicken.feed);note('chickenWater',!!last.chicken&&!last.chicken.water);
    note('cowFeed',!!last.cow&&!last.cow.feed);note('cowWater',!!last.cow&&!last.cow.water);
  }
  // ---- Player actions ---------------------------------------------------------------------------
  function loadFeed(kind){
    settle();if(!available()||!['chicken','cow'].includes(kind))return 0;
    const s=state[kind],space=Math.floor((CAP[kind].feed-s.feed)/U),n=Math.min(space,bagCount('animal_feed'));
    if(n<=0){message(I18n.message(space<=0?'animals.feederFull':'animals.noFeed'));return 0;}
    removeItem('animal_feed',n);s.feed+=n*U;try{GameAudio.play('feed');}catch(_){}
    refresh();queueGameSave();return n;
  }
  const freeChickenSlots=()=>Math.max(0,B.chickenMax-list('chicken').length);
  const eggsStored=()=>storageCount(B.eggStorage,'eggs');
  const brooding=()=>list('chicken').find(a=>a.brood)||null;
  function broodLimit(){return brooding()?0:Math.min(B.broodMax,freeChickenSlots(),eggsStored());}
  function brood(eggs){
    settle();if(!available())return {ok:false,reason:'unavailable'};
    if(brooding())return {ok:false,reason:'nestBusy'};
    const hen=adults('chicken').find(a=>!a.brood);if(!hen)return {ok:false,reason:'noHen'};
    const n=Number(eggs);
    if(!Number.isInteger(n)||n<1||n>B.broodMax)return {ok:false,reason:'count'};
    if(n>freeChickenSlots())return {ok:false,reason:'slots'};
    if(n>eggsStored())return {ok:false,reason:'eggs'};
    if(removeFromSlots(storageChests[B.eggStorage].items,'eggs',n)!==n)return {ok:false,reason:'eggs'};
    hen.brood={eggs:n,progressMs:0};poses.delete(hen.id);refresh();queueGameSave();return {ok:true,hen:hen.id};
  }
  function slaughter(kind){
    settle();if(!available())return {ok:false,reason:'unavailable'};
    const pool=adults(kind).filter(a=>!a.brood);
    if(adults(kind).length<=B[kind==='chicken'?'chickenMin':'cowMin']||!pool.length){message(I18n.message('animals.minimumAdults',{count:B[kind==='chicken'?'chickenMin':'cowMin']}));return {ok:false,reason:'minimum'};}
    const item=kind==='chicken'?'chicken_meat':'beef',qty=kind==='chicken'?B.chickenMeat:B.cowMeat,food=storageChests[4].items;
    if(freeItemSpace(bag,item,BAG_SLOTS)+freeItemSpace(food,item,60)<qty){message(I18n.message('animals.meatSpace',{qty}));return {ok:false,reason:'space'};}
    const victim=pool[pool.length-1];state.animals.splice(state.animals.indexOf(victim),1);poses.delete(victim.id);
    const left=addItem(item,qty);if(left>0)addToSlots(food,item,left,60);
    try{GameAudio.play('slaughter');}catch(_){}
    message(I18n.message('animals.slaughtered',{qty}));refresh();queueGameSave();return {ok:true,id:victim.id};
  }
  // ---- Save --------------------------------------------------------------------------------------
  const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b,num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
  function validate(s){
    const bad=m=>{throw Error('Invalid livestock: '+m);};
    if(!s||s.schema!==1||!int(s.rng,0,4294967295)||!int(s.nextId,1,1e9)||!num(s.acc,0,STEP)||!num(s.at,0,Number.MAX_SAFE_INTEGER)||!Array.isArray(s.animals))bad('header');
    for(const k of ['chicken','cow'])if(!s[k]||!int(s[k].feed,0,CAP[k].feed)||!int(s[k].water,0,CAP[k].water))bad(k+' troughs');
    if(!num(s.calfMs,0,B.calfMaxDays*DAY)||!s.pending||!int(s.pending.eggs,0,1e6)||!int(s.pending.milk,0,1e6))bad('herd');
    const ids=new Set(),stalls=new Set();let broods=0;
    for(const a of s.animals){
      if(!a||!['chicken','cow'].includes(a.kind)||typeof a.id!=='string'||!new RegExp('^'+a.kind+':[1-9][0-9]*$').test(a.id)||Number(a.id.split(':')[1])>=s.nextId||ids.has(a.id))bad('id');ids.add(a.id);
      if(!num(a.ageMs,0,1e12)||a.stage!==stageOf(a))bad('stage');
      if(a.kind==='chicken'){if(!num(a.eggMs,0,DAY)||!(a.brood===null||a.brood&&int(a.brood.eggs,1,B.broodMax)&&num(a.brood.progressMs,0,B.incubationDays*DAY)&&a.stage===2))bad('hen');if(a.brood)broods++;}
      else{if(!int(a.stall,0,B.cowMax-1)||stalls.has(a.stall)||!num(a.milkMs,0,DAY))bad('cow');stalls.add(a.stall);}
    }
    const ch=s.animals.filter(a=>a.kind==='chicken'),cw=s.animals.filter(a=>a.kind==='cow');
    if(ch.length>B.chickenMax||cw.length>B.cowMax||broods>1||ch.filter(a=>a.stage===2).length<B.chickenMin||cw.filter(a=>a.stage===2).length<B.cowMin)bad('population');
    return true;
  }
  function capture(){settle();const s=copy(state);return s;}
  function restore(s){state=s?copy(s):startHerd();state.at=AgricultureTime.now();poses.clear();last={};notified={};refresh();}
  // ---- Behaviour (presentation only; cheap, stable, not saved) -------------------------------
  // Presentation randomness has its own tiny PRNG so animal poses never consume the shared gameplay Math.random stream.
  let visualSeed=0x9e3779b9;const vr=()=>{visualSeed=(Math.imul(visualSeed,1664525)+1013904223)>>>0;return visualSeed/4294967296;};
  function allowedTop(x){return x<fx.nest.x+fx.nest.w+8?fx.nest.y+fx.nest.h+8:fx.chickenFeeder.y+fx.chickenFeeder.h+8;}
  function spawn(a,i){
    if(a.kind==='cow'){const c=stallCenter(a.stall);return {x:c.x,y:c.y,angle:Math.PI,mode:'idle',moving:false,speed:0,stride:0,gestureAt:-1e9,gesture:null,nextGesture:performance.now()+5000+vr()*10000,until:0};}
    const cols=5,cell=i%25,x=roam.l+((cell%cols)+.5)*(roam.r-roam.l)/cols,y=roam.t+(Math.floor(cell/cols)+.5)*(roam.b-roam.t)/5;
    return {x,y,angle:vr()*Math.PI*2,mode:'idle',moving:false,speed:0,stride:i,gestureAt:-1e9,gesture:null,nextGesture:performance.now()+3000+vr()*9000,until:0,target:null,cell};
  }
  function pose(a,i=0){let p=poses.get(a.id);if(!p){p=spawn(a,i);poses.set(a.id,p);}return p;}
  function decide(a,p,i,now,flock){
    const s=state.chicken,feeder=fx.chickenFeeder,drinker=fx.chickenDrinker;
    const hungry=s.feed>0,thirsty=s.water>0,r=vr();p.speed=B.chickenWalkSpeed;
    if(a.stage===0){const mother=flock.find(b=>b.brood)||flock.find(b=>b.stage===2);const m=mother?pose(mother):null;if(m&&r<.7){p.mode='walk';p.target={x:m.x+(vr()-.5)*44,y:m.y+14+vr()*26};p.until=now+2500+vr()*2500;return;}}
    if(r<.16&&hungry){p.mode='eat';p.target={x:feeder.x+10+vr()*(feeder.w-20),y:feeder.y+feeder.h+12};p.until=now+4000+vr()*3000;return;}
    if(r<.26&&thirsty){p.mode='drink';p.target={x:drinker.x+10+vr()*(drinker.w-20),y:drinker.y+drinker.h+12};p.until=now+3000+vr()*2500;return;}
    if(r<.38){p.mode='idle';p.target=null;p.until=now+1500+vr()*2500;return;}
    // Walk (or run) to a free cell of a 5×5 grid; distinct targets keep the flock spread out.
    const taken=new Set(flock.map(b=>poses.get(b.id)?.cell).filter(v=>v!==undefined&&v!==p.cell));let cell=Math.floor(vr()*25);for(let k=0;k<25&&taken.has(cell);k++)cell=(cell+7)%25;p.cell=cell;
    const cw=(roam.r-roam.l)/5,chh=(roam.b-roam.t)/5;p.target={x:roam.l+(cell%5+.2+vr()*.6)*cw,y:roam.t+(Math.floor(cell/5)+.2+vr()*.6)*chh};
    if(vr()<B.chickenRunChance){p.mode='run';p.speed=B.chickenWalkSpeed*B.chickenRunFactor;p.until=now+1000+vr()*1000;}else{p.mode='walk';p.until=now+6000;}
  }
  function behave(dt,now){
    const flock=list('chicken');
    flock.forEach((a,i)=>{
      const p=pose(a,i);
      if(a.brood){p.x=nestSeat.x;p.y=nestSeat.y;p.mode='brood';p.moving=false;p.speed=0;p.angle=0;p.target=null;return;}
      if(now>=p.nextGesture){p.gestureAt=now;p.gesture=p.mode==='idle'||p.mode==='eat'?'peck':vr()<.5?'flap':'peck';p.nextGesture=now+4000+vr()*14000;}
      if(now>=p.until)decide(a,p,i,now,flock);
      if(p.target){const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy);
        if(d>2){const s=Math.min(d,p.speed*dt);p.x+=dx/d*s;p.y+=dy/d*s;p.moving=true;p.stride+=s*.35;const want=Math.atan2(dy,dx)+Math.PI/2,diff=((want-p.angle+Math.PI*3)%(Math.PI*2))-Math.PI;p.angle+=diff*Math.min(1,dt*6);}
        else{p.moving=false;if(p.mode==='walk'||p.mode==='run'){p.mode='idle';p.target=null;p.until=now+800+vr()*2200;}else{p.angle+=((0-p.angle+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*5);}}}
      else p.moving=false;
      if((p.mode==='eat'&&state.chicken.feed<=0)||(p.mode==='drink'&&state.chicken.water<=0)){p.mode='idle';p.target=null;}
    });
    // Cheap separation: n ≤ 12, one pass of pair checks; the brooding hen never moves.
    for(let i=0;i<flock.length;i++)for(let j=i+1;j<flock.length;j++){
      const a=flock[i],b=flock[j];if(a.brood&&b.brood)continue;const p=poses.get(a.id),q=poses.get(b.id);if(!p||!q)continue;
      const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||.01,min=B.chickenSpacing*(a.stage===0||b.stage===0?.6:1);
      if(d<min){const push=(min-d)/2,ux=dx/d,uy=dy/d;if(a.brood){q.x+=ux*push*2;q.y+=uy*push*2;}else if(b.brood){p.x-=ux*push*2;p.y-=uy*push*2;}else{p.x-=ux*push;p.y-=uy*push;q.x+=ux*push;q.y+=uy*push;}}
    }
    for(const a of flock){if(a.brood)continue;const p=poses.get(a.id);p.x=clamp(p.x,roam.l,roam.r);p.y=clamp(p.y,allowedTop(p.x),roam.b);}
    // Cows stay in their stalls: idle / eat (head down) / drink, with head, ear and tail gestures.
    for(const a of list('cow')){
      const p=pose(a),c=stallCenter(a.stall);p.x=c.x;p.y=c.y;p.angle=Math.PI;p.moving=false;p.speed=0;
      if(now>=p.until){const r=vr();p.mode=r<.55&&state.cow.feed>0?'eat':r<.7&&state.cow.water>0?'drink':'idle';p.until=now+4000+vr()*6000;}
      if(now>=p.nextGesture){const r=vr();p.gesture=r<.6?'tail':r<.85?'ear':'head';p.gestureAt=now;p.nextGesture=now+B.cowGestureMinMs+vr()*(B.cowGestureMaxMs-B.cowGestureMinMs);}
    }
  }
  let lastFrame=performance.now();
  function update(){
    const now=performance.now(),dt=clamp((now-lastFrame)/1000,0,.1);lastFrame=now;
    settle();
    if(!available()||GameFlow.paused||scene!=='bunker')return;
    if(BunkerLayout.floorAt(player.x,player.y)===2){behave(dt,now);audio(now);}
    if(now-panelPaint>500&&(panels.chicken?.classList.contains('open')||panels.cow?.classList.contains('open'))){panelPaint=now;refresh();}
  }
  function audio(now){
    const centre=kind=>kind==='cow'?{x:(CW.left+CW.right)/2,y:CW.top+80}:{x:(CH.left+CH.right)/2,y:(CH.top+CH.bottom)/2};
    if(list('cow').length&&now>=nextMoo){try{GameAudio.play('cow',{...centre('cow'),scene:'bunker',radius:310});}catch(_){}nextMoo=now+3000+vr()*12000;}
    // Chicken ambience lives in audio/world.js and reads this owner (GameLivestock.list / audioCenter).
  }
  // ---- Visual hook -------------------------------------------------------------------------------
  function view(a){
    const p=pose(a,Math.max(0,state.animals.indexOf(a)));
    return {kind:a.kind,stage:a.stage,angle:p.angle,mode:p.mode,moving:!!p.moving,speed:p.moving?p.speed:0,gestureAt:p.gestureAt,gesture:p.gesture,x:p.x,y:p.y,scale:B.stageScale[a.kind][a.stage],stride:p.stride};
  }
  const MODES=Object.freeze(['idle','walk','run','eat','drink','brood']);
  function drawStatus(){
    if(!available())return;const off=last.power===false,need={chicken:fed('chicken'),cow:fed('cow')};
    const icon=kind=>off?'⚡':!need[kind].feed?'🌾':!need[kind].water?'💧':null;
    ctx.save();ctx.font='11px Arial';ctx.textAlign='center';
    for(const a of state.animals){const i=icon(a.kind);if(!i)continue;const p=pose(a);ctx.fillText(i,p.x,p.y-(a.kind==='cow'?38:16));}
    ctx.restore();
  }
  function drawFixtures(){
    const bar=(r,frac,color)=>{ctx.fillStyle='#172c2b';ctx.fillRect(r.x+4,r.y+4,r.w-8,r.h-8);ctx.fillStyle=color;ctx.fillRect(r.x+4,r.y+4,(r.w-8)*clamp(frac,0,1),r.h-8);};
    const box=(r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,4);ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();};
    ctx.save();
    for(let i=0;i<B.cowMax;i++){const x=CW.left+15+i*70;ctx.fillStyle='#8a805324';ctx.fillRect(x,CW.top+10,70,120);ctx.strokeStyle='#8d9b83';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,CW.top+10);ctx.lineTo(x,CW.top+126);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(CW.left+15+B.cowMax*70,CW.top+10);ctx.lineTo(CW.left+15+B.cowMax*70,CW.top+126);ctx.stroke();
    for(const [r,kind,cap] of [[fx.cowFeeder,'feed',CAP.cow.feed],[fx.cowDrinker,'water',CAP.cow.water],[fx.chickenFeeder,'feed',CAP.chicken.feed],[fx.chickenDrinker,'water',CAP.chicken.water]]){const s=r===fx.cowFeeder||r===fx.cowDrinker?state.cow:state.chicken;box(r,'#526964','#98a9a5');bar(r,s[kind]/cap,kind==='water'?'#4b9ba5':'#c8ab68');}
    box(fx.nest,'#6d5a3c','#b09a6c');ctx.fillStyle='#c9b27a';ctx.beginPath();ctx.ellipse(nestSeat.x,nestSeat.y,22,14,0,0,Math.PI*2);ctx.fill();
    const hen=brooding();if(!hen){const n=Math.min(6,eggsStored());for(let k=0;k<Math.min(3,n);k++){ctx.fillStyle='#efe6cf';ctx.beginPath();ctx.ellipse(nestSeat.x-10+k*10,nestSeat.y,4,5,0,0,Math.PI*2);ctx.fill();}}
    ctx.fillStyle='#d5e0d0';ctx.font='10px Arial';ctx.textAlign='center';
    ctx.fillText(I18n.t('animals.nest'),nestSeat.x,fx.nest.y+fx.nest.h+12);
    ctx.fillText(I18n.t('animals.feeder'),fx.chickenFeeder.x+fx.chickenFeeder.w/2,fx.chickenFeeder.y+fx.chickenFeeder.h+12);
    ctx.fillText(I18n.t('animals.drinker'),fx.chickenDrinker.x+fx.chickenDrinker.w/2,fx.chickenDrinker.y+fx.chickenDrinker.h+12);
    ctx.fillText(I18n.t('animals.feeder')+' '+units(state.cow.feed).toFixed(1)+' / '+B.cowFeederCapacity,fx.cowFeeder.x+fx.cowFeeder.w/2,fx.cowFeeder.y+fx.cowFeeder.h+13);
    ctx.fillText(I18n.t('animals.drinker')+' '+units(state.cow.water).toFixed(1)+' / '+B.cowDrinkerCapacity,fx.cowDrinker.x+fx.cowDrinker.w/2,fx.cowDrinker.y+fx.cowDrinker.h+13);
    ctx.restore();
    // Pantry storages #10 eggs, #11 milk, #12 animal feed are real, visible crates.
    for(const i of [B.eggStorage,B.milkStorage,B.feedStorage]){const p=getChestPositions()[i];if(window.V011Rooms?.chest)V011Rooms.chest(i,p,storageChests[i]);ctx.save();ctx.fillStyle='#d5e0d0';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.t(i===B.eggStorage?'animals.crate.eggs':i===B.milkStorage?'animals.crate.milk':'animals.crate.feed'),p.x,p.y-31);ctx.restore();}
  }
  function draw(){
    if(!state||!available())return;
    drawFixtures();
    state.animals.forEach((a,i)=>window.drawLivestockAnimal(a,i));
    drawStatus();
  }
  // ---- UI ----------------------------------------------------------------------------------------
  let broodCount=1;const panels={chicken:null,cow:null};/* cached: no per-frame DOM lookups */
  const T=(k,p)=>I18n.t('animals.'+k,p);
  function row(parent,cls){const d=document.createElement('div');d.className=cls||'livestockRow';parent.append(d);return d;}
  function chickensPanel(){
    const o=panels.chicken=v09Overlay('livestockChickens',T('chickens.title')),b=o.querySelector('.v09Body');
    if(!b.dataset.built){b.dataset.built='1';b.innerHTML='';
      row(b,'livestockStatus');const controls=row(b,'livestockControls');
      controls.append(v09Button(T('loadFeed'),()=>loadFeed('chicken')));
      const broodBox=row(controls,'livestockBrood');const minus=v09Button('−',()=>{broodCount=Math.max(1,broodCount-1);refresh();}),plus=v09Button('+',()=>{broodCount=Math.min(Math.max(1,broodLimit()),broodCount+1);refresh();});
      const count=document.createElement('span');count.className='livestockBroodCount';const start=v09Button(T('brood'),()=>{const r=brood(broodCount);if(!r.ok)message(I18n.message('animals.broodFail.'+r.reason));});start.dataset.brood='1';
      minus.dataset.broodMinus='1';plus.dataset.broodPlus='1';broodBox.append(minus,count,plus,start);
      const kill=v09Button(T('slaughterChicken',{qty:B.chickenMeat}),()=>slaughter('chicken'));kill.dataset.slaughter='1';controls.append(kill);
    }
    return o;
  }
  function cowsPanel(){
    const o=panels.cow=v09Overlay('livestockCows',T('cows.title')),b=o.querySelector('.v09Body');
    if(!b.dataset.built){b.dataset.built='1';b.innerHTML='';row(b,'livestockStatus');const controls=row(b,'livestockControls');
      controls.append(v09Button(T('loadFeed'),()=>loadFeed('cow')));const kill=v09Button(T('slaughterCow',{qty:B.cowMeat}),()=>slaughter('cow'));kill.dataset.slaughter='1';controls.append(kill);}
    return o;
  }
  const days=ms=>I18n.text(I18n.numeric(ms/DAY,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false}));
  function stateLine(kind){if(!available())return '';if(!powered())return T('status.power');const f=fed(kind);if(!f.feed)return T('status.feed');if(!f.water)return T('status.water');return T('status.ok');}/* live, not the last step's snapshot */
  function refresh(){
    if(!state)return;
    const oc=panels.chicken,ow=panels.cow;
    if(oc){const ch=list('chicken'),st=[0,1,2].map(s=>ch.filter(a=>a.stage===s).length),hen=brooding(),lim=broodLimit();broodCount=clamp(broodCount,1,Math.max(1,lim));
      const lines=[T('chickens.count',{total:ch.length,max:B.chickenMax,adults:st[2],juveniles:st[1],chicks:st[0]}),T('troughs',{feed:units(state.chicken.feed).toFixed(2),feedMax:B.chickenFeederCapacity,water:units(state.chicken.water).toFixed(2),waterMax:B.chickenDrinkerCapacity}),T('chickens.eggs',{eggs:eggsStored()}),hen?T('chickens.brooding',{eggs:hen.brood.eggs,percent:Math.floor(hen.brood.progressMs/(B.incubationDays*DAY)*100),days:days(B.incubationDays*DAY-hen.brood.progressMs)}):T('chickens.nestFree',{limit:lim}),stateLine('chicken')];
      I18n.assign(oc.querySelector('.livestockStatus'),'textContent','');oc.querySelector('.livestockStatus').innerHTML='';for(const l of lines){const p=document.createElement('p');p.textContent=l;oc.querySelector('.livestockStatus').append(p);}
      const count=oc.querySelector('.livestockBroodCount');if(count)count.textContent=String(lim?broodCount:0);
      const start=oc.querySelector('[data-brood]');if(start){start.disabled=!lim;I18n.assign(start,'textContent',T('brood')+' · '+(lim?broodCount:0));}
      const kill=oc.querySelector('[data-slaughter]');if(kill)kill.disabled=adults('chicken').length<=B.chickenMin||!adults('chicken').some(a=>!a.brood);}
    if(ow){const cw=list('cow'),st=[0,1,2].map(s=>cw.filter(a=>a.stage===s).length);
      const lines=[T('cows.count',{total:cw.length,max:B.cowMax,adults:st[2],juveniles:st[1],calves:st[0]}),T('troughs',{feed:units(state.cow.feed).toFixed(2),feedMax:B.cowFeederCapacity,water:units(state.cow.water).toFixed(2),waterMax:B.cowDrinkerCapacity}),T('cows.milk',{milk:storageCount(B.milkStorage,'milk')}),freeStall()<0?T('cows.calfFull'):state.calfMs>0?T('cows.calfIn',{days:days(state.calfMs)}):T('cows.calfWaiting'),stateLine('cow')];
      const box=ow.querySelector('.livestockStatus');box.innerHTML='';for(const l of lines){const p=document.createElement('p');p.textContent=l;box.append(p);}
      const kill=ow.querySelector('[data-slaughter]');if(kill)kill.disabled=adults('cow').length<=B.cowMin;}
  }
  function open(kind){settle();if(!available())return false;const o=kind==='cow'?cowsPanel():chickensPanel();refresh();openOverlay(o);return true;}
  v09Style('.livestockStatus p{margin:4px 0;font-size:13px;line-height:1.45}.livestockControls{display:flex;flex-direction:column;gap:8px;margin-top:10px}.livestockBrood{display:flex;align-items:center;gap:6px}.livestockBrood .menuButton{margin:0}.livestockBrood .menuButton:not([data-brood]){width:44px;flex:0 0 44px}.livestockBroodCount{min-width:22px;text-align:center;font-weight:700}');
  // ---- World integration -----------------------------------------------------------------------
  const interactives=()=>[
    {...fx.nest,kind:'livestock_chickens',name:I18n.t('animals.nest'),range:56},
    {...fx.chickenFeeder,kind:'livestock_chickens',name:I18n.t('animals.feeder'),range:56},
    {...fx.chickenDrinker,kind:'livestock_chickens',name:I18n.t('animals.drinker'),range:56},
    {...fx.cowFeeder,kind:'livestock_cows',name:I18n.t('animals.feeder'),range:56},
    {...fx.cowDrinker,kind:'livestock_cows',name:I18n.t('animals.drinker'),range:56}
  ];
  const oldObjects=interactionObjects;interactionObjects=function(which=scene){const a=oldObjects(which);return which==='bunker'&&available()?a.concat(interactives()):a;};
  const oldSolids=solidObjects;solidObjects=function(which){const a=oldSolids(which);return which==='bunker'?a.concat([fx.nest,fx.chickenFeeder,fx.chickenDrinker,fx.stalls,fx.cowFeeder,fx.cowDrinker].map(r=>({id:r.id,x:r.x,y:r.y,w:r.w,h:r.h}))):a;};
  const oldExecute=executeInteraction;executeInteraction=function(o){if(o?.kind==='livestock_chickens'||o?.kind==='livestock_cows'){if(!menuOpen&&!playerDead&&canInteract(o,player.x,player.y)){GameMovement.begin('INTERACT',o);open(o.kind==='livestock_cows'?'cow':'chicken');}return;}return oldExecute(o);};
  GameSave.extend('capture','farm.livestock',function(previous){const d=previous();d.livestock043=capture();return d;});
  GameSave.extend('decode','farm.livestock',function(previous,raw){const d=previous(raw);if(d.livestock043!==undefined)validate(d.livestock043);return d;});
  GameSave.extend('restore','farm.livestock',function(previous,d){if(d.livestock043!==undefined)validate(d.livestock043);const out=previous(d);restore(d.livestock043);return out;});
  GameState.register('livestock',{get animals(){return state.animals;},get state(){return state;}},{source:'farm/livestock.js',saved:['livestock043'],transient:['animal poses','notification edges','panel refresh']});
  startHerd();invalidateGeometry();
  const api={update,settle,draw,view,open,refresh,loadFeed,brood,slaughter,capture,validate,restore,startHerd,active,powered,available,
    setRandom(fn){override=typeof fn==='function'?fn:null;},
    get state(){return state;},get animals(){return state.animals;},list,adults,fixtures:fx,roam,stallCenter,nestSeat,modes:MODES,broodLimit,freeChickenSlots,
    constants:Object.freeze({DAY,STEP,STEPS,U,CH_TICK,COW_TICK,CAP}),poses,units,
    audioCenter:kind=>kind==='cow'?{x:(CW.left+CW.right)/2,y:CW.top+80}:{x:(CH.left+CH.right)/2,y:(CH.top+CH.bottom)/2}};
  return api;
})();
/* Visual hook for the Animals art patch: one global draw function fed only by GameLivestock.view(a). */
window.drawLivestockAnimal=function(a,i){
  const v=GameLivestock.view(a),cow=v.kind==='cow',w=(cow?37:19)*v.scale,h=(cow?60:26)*v.scale,now=performance.now();
  ctx.save();ctx.translate(v.x,v.y);ctx.rotate(v.angle);
  ctx.fillStyle='#07110b45';ctx.beginPath();ctx.ellipse(1,3,w*(cow?.31:.38),h*.39,0,0,Math.PI*2);ctx.fill();
  const stride=v.moving?Math.sin(v.stride)*3.6*v.scale:0;ctx.rotate(v.moving?Math.sin(v.stride)*.015:Math.sin(now/1100+i)*.007);
  if(cow&&v.mode==='eat')ctx.translate(0,Math.sin(now/240+i)*.65+2);
  if(v.mode==='brood')ctx.scale(1.08,.94);
  const art=window.V011Art,key=cow?'cow':'chicken',im=art?.image?.(key);
  if(im&&art.ready(key)){ctx.save();ctx.translate(0,stride*.1);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
  else if(cow){const e=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x*v.scale,y*v.scale,rx*v.scale,ry*v.scale,0,0,Math.PI*2);ctx.fill();};e(0,0,15,23,'#deded0');e(-5,-7,7,9,'#414b43');e(5,10,7,7,'#39473e');e(0,-25,8,9,'#d6d4c4');}
  else{const e=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x*v.scale,y*v.scale,rx*v.scale,ry*v.scale,0,0,Math.PI*2);ctx.fill();};e(0,0,9,11,'#d9ccad');e(0,-11,4,5,'#e7d8b6');e(0,-14,2,3,'#a04b3c');}
  const g=(now-v.gestureAt)/1100;
  if(g>=0&&g<1){const wave=Math.sin(g*Math.PI)*Math.sin(g*Math.PI*5);ctx.strokeStyle=cow?'#b7c3a4':'#96805b';ctx.lineWidth=cow?2:1;ctx.beginPath();
    if(cow&&v.gesture==='tail'){ctx.moveTo(0,h*.34);ctx.lineTo(wave*w*.2,h*.47);ctx.lineTo(wave*w*.32,h*.57);}
    else if(cow&&v.gesture==='ear'){ctx.moveTo(-w*.3,-h*.36);ctx.lineTo(-w*.45-wave*3,-h*.4);}
    else if(cow){ctx.moveTo(0,-h*.42);ctx.lineTo(0,-h*.5-Math.abs(wave)*4);}
    else if(v.gesture==='flap'){for(const s of [-1,1]){ctx.moveTo(s*w*.3,0);ctx.lineTo(s*w*(.55+Math.abs(wave)*.3),-h*.1);}}
    else{ctx.moveTo(0,-h*.45);ctx.lineTo(0,-h*.45-Math.abs(wave)*3);}
    ctx.stroke();}
  ctx.restore();
};
