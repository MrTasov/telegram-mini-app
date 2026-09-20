/* 0.11 — living garden and livestock; all rates use a real-time clock. */
window.V011Farm=(()=>{
  const config=GameplayBalance.farm,CAPACITY=config.waterCapacity,SPRAY=config.irrigationMs,DRY_RATE=config.dryGrowth;
  const state={water:CAPACITY,at:Date.now(),schema:2,powered:true};
  const grownKey='_v011Growth';
  let lastAnimalAt=performance.now(),lastMenuPaint=0;
  const pose=new WeakMap();
  const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const cropTotal=st=>farmGrowMs(st.crop);
  function plants(st){
    if(st.crop===null)return [];
    if(!Array.isArray(st.plants014)){
      const elapsed=Number.isFinite(st[grownKey])?st[grownKey]:Math.max(0,state.at-st.plantedAt),count=st.harvestLeft??50;
      st.plants014=Array.from({length:50},(_,i)=>({elapsed:Math.min(cropTotal(st),elapsed),duration:cropTotal(st),planted:true,harvested:i>=count,qty:i===0&&count>50?count-49:1}));
    }
    return st.plants014;
  }
  function growth(st){
    if(st.crop===null)return 0;
    const a=plants(st).filter(p=>!p.harvested);
    const ratio=a.length?Math.min(...a.map(p=>p.planted?clamp(p.elapsed/p.duration,0,1):0)):1;
    return st[grownKey]=ratio*cropTotal(st);
  }
  function powered(){return typeof devicePowered==='function'?!!devicePowered('irrigation014'):state.powered;}
  // Only fully planted, growing beds take part in irrigation.
  function growing(){return window.farmState.filter(st=>st.crop!==null&&plants(st).length>0&&plants(st).every(p=>p.harvested||p.planted)&&plants(st).some(p=>p.planted&&!p.harvested&&p.elapsed<p.duration));}
  const timerRandom=q=>{q.rng=(Math.imul(q.rng,1664525)+1013904223)>>>0;return q.rng/4294967296;};
  const newTimer=(index=0)=>{const q={phase:'wait',rng:(0x28fa031+index*104729+(Date.now()%4294967296))>>>0,remainingMs:0};q.remainingMs=config.firstMinMs+timerRandom(q)*(config.firstMaxMs-config.firstMinMs);return q;};
  const timer=st=>st.irrigation028||(st.irrigation028=newTimer(window.farmState.indexOf(st)));
  const resetTimer=q=>{q.phase='wait';q.remainingMs=config.intervalMinMs+timerRandom(q)*(config.intervalMaxMs-config.intervalMinMs);};
  function pumpDemand(){return state.water>=config.waterPerCycle&&growing().some(st=>{const q=timer(st);return q.phase==='spray'||q.remainingMs<=0;})?.5:0;}
  function settle(now=Date.now()){
    now=Math.max(state.at,now);let left=now-state.at;
    const running=!GameFlow.paused&&!document.hidden&&!playerDead;
    window.farmState.forEach(st=>{if(st.crop!==null)plants(st);});
    let iterations=0;
    while(left>0&&iterations++<12000){
      const live=growing();if(!live.length)break;
      const wet=state.water>=config.waterPerCycle&&powered(),rate=wet?1:DRY_RATE;
      // Reserve water for active sprays without debiting it until completion.
      let reserved=live.filter(st=>timer(st).phase==='spray').length*config.waterPerCycle;
      if(running&&wet)for(const st of live){const q=timer(st);if(q.phase==='wait'&&q.remainingMs<=0&&state.water-reserved>=config.waterPerCycle){q.phase='spray';q.remainingMs=SPRAY;reserved+=config.waterPerCycle;}}
      let step=left;
      for(const st of live){const q=timer(st);if(running&&(q.phase==='wait'?q.remainingMs>0:wet))step=Math.min(step,q.remainingMs);
        const remaining=Math.max(...plants(st).filter(p=>p.planted&&!p.harvested).map(p=>p.duration-p.elapsed));step=Math.min(step,remaining/rate);}
      if(step<=0)step=Math.min(left,.001);
      for(const st of live){
        const q=timer(st);plants(st).forEach(p=>{if(p.planted&&!p.harvested)p.elapsed=Math.min(p.duration,p.elapsed+step*rate);});
        if(running&&(q.phase==='wait'||wet))q.remainingMs=Math.max(0,q.remainingMs-step);
        // Readiness cancels a partial spray; only completed growing cycles cost water.
        if(plants(st).every(p=>p.harvested||p.planted&&p.elapsed>=p.duration)){delete st.irrigation028;continue;}
        if(running&&wet&&q.phase==='spray'&&q.remainingMs<=.00001){state.water=Math.max(0,state.water-config.waterPerCycle);resetTimer(q);}
      }
      left-=step;
    }
    state.at=now;
    for(const st of window.farmState)if(st.crop!==null){st.plantedAt=now-growth(st);if(ready(window.farmState.indexOf(st)))delete st.irrigation028;}
    if(el('v011Irrigation')?.style.display==='flex'&&performance.now()-lastMenuPaint>500){lastMenuPaint=performance.now();renderWater();}
    return state;
  }
  function beginBed(index,crop){
    if(!Number.isInteger(index)||index<0||index>=5||!window.farmCrops[crop]||window.farmState[index].crop!==null)return false;
    window.farmState[index]={crop,plantedAt:Date.now(),[grownKey]:0,plants014:Array.from({length:50},()=>({planted:false,harvested:false,elapsed:0,duration:0,qty:1}))};return true;
  }
  function plantOne(index,n,now=Date.now()){
    settle(now);const st=window.farmState[index],p=plants(st)[n];if(!p||p.planted)return false;
    Object.assign(p,{planted:true,elapsed:0,duration:Math.round(cropTotal(st)*(.9+Math.random()*.2))});if(plants(st).every(p=>p.planted||p.harvested))timer(st);return true;
  }
  function harvestOne(index,n){const st=window.farmState[index],p=plants(st)[n];if(!p||!p.planted||p.harvested||p.elapsed<p.duration)return 0;p.harvested=true;const qty=p.qty||1;if(plants(st).every(p=>p.harvested||!p.planted))window.farmState[index]={crop:null,plantedAt:0};return qty;}
  function plant(index,crop){return window.V0141Farm?.plant(index,crop)||false;}
  function progress(index){settle();const st=window.farmState[index];return !st||st.crop===null?0:clamp(growth(st)/cropTotal(st),0,1);}
  function ready(index){const st=window.farmState[index];return st?.crop!==null&&plants(st).every(p=>p.harvested||p.planted&&p.elapsed>=p.duration);}
  function spraying(index){return state.water>=config.waterPerCycle&&powered()&&growing().some(st=>(index===undefined||farmState[index]===st)&&timer(st).phase==='spray');}
  function tankRect(){const f=bunker.farm;return {x:(f.cropLeft??90)+13,y:f.top+51,w:45,h:76};}
  function habitat(){const f=bunker.farm,l=f.left+18,r=(f.cropLeft??90)-12,t=f.top+42,b=f.bottom-42,m=(t+b)/2;return {l,r,t,b,m};}
  function troughs(){const p=habitat(),mid=(p.l+p.r)/2;return {
    cow:{x:mid-10,y:p.t+14,w:20,h:(p.m-p.t-44)*.62},
    cowWater:{x:mid-10,y:p.t+23+(p.m-p.t-44)*.62,w:20,h:(p.m-p.t-44)*.3},
    chicken:{x:p.l+10,y:p.b-148,w:24,h:108},
    chickenWater:{x:p.l+10,y:p.b-218,w:24,h:54}
  };}
  function cowStalls(){
    const p=habitat(),step=(p.m-p.t-42)/3,mid=(p.l+p.r)/2;
    return Array.from({length:COW_MAX},(_,i)=>({id:'cow_slot_'+(i+1),x:mid+(i%2?1:-1)*44,y:p.t+17+(Math.floor(i/2)+.5)*step,angle:i%2?-Math.PI/2:Math.PI/2,w:37,h:60,step,mid}));
  }
  function drawStalls(){
    const p=habitat(),stalls=cowStalls(),mid=(p.l+p.r)/2;
    const feed=storageCount(12,'animal_feed');
    drawTrough(troughs().cow,'cow',feed);drawTrough(troughs().cowWater,'water',storageCount(13,'water'));
    for(const st of stalls){
      const left=st.x-st.h/2-5,right=st.x+st.h/2+5,top=st.y-st.step/2+2;
      ctx.fillStyle='#8a805331';round(left,top,right-left,st.step-4,3);ctx.fill();
      for(let k=0;k<9;k++){const x=left+4+(k*13%(right-left-8)),y=top+4+(k*7%Math.max(1,st.step-12));pipe([[x,y],[x+4,y+2]],'#c7b97950',1);}
      pipe([[left,top],[right,top]],'#223b3655',5);
      pipe([[left,top-1],[right,top-1]],'#a3b3a0',2);
      ellipse(left,top-1,2.5,2.5,'#738c80');ellipse(right,top-1,2.5,2.5,'#738c80');
    }
  }
  function refill(amount=100){
    settle();const wanted=Math.min(Math.max(0,Math.floor(amount)),Math.floor(CAPACITY-state.water),bagCount('water'));
    if(wanted<=0){message(state.water>CAPACITY-1?'Бачок почти заполнен':'В рюкзаке нет воды');return 0;}
    removeItem('water',wanted);state.water=Math.min(CAPACITY,state.water+wanted);renderWater();queueGameSave();return wanted;
  }
  function renderWater(){
    const box=el('v011WaterStatus');if(!box)return;
    const growing=window.farmState.filter(st=>st.crop!==null&&growth(st,state.at)<cropTotal(st)).length;
    I18n.assign(box,"textContent",I18n.message('farm.water',{amount:Math.floor(state.water),capacity:CAPACITY})+' · '+(state.water<=0||!powered()?'Рост замедлен':spraying()?'Автоматический полив':growing?'Автополив включён':'Нет растущих культур'));
    const meter=el('v011WaterFill');if(meter)meter.style.width=(state.water/CAPACITY*100)+'%';
    const btn=el('v011WaterRefill');if(btn)btn.disabled=state.water>CAPACITY-1||bagCount('water')<=0;
  }
  function openWater(){
    settle();let overlay=el('v011Irrigation');
    if(!overlay){
      overlay=v09Overlay('v011Irrigation','Полив огорода');
      const body=overlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",'<div class="v011FarmTankIcon">'+itemIconHTML('water')+'</div><div id="v011WaterStatus"></div><div class="v011FarmMeter"><i id="v011WaterFill"></i></div><p class="v011FarmHint">Бак автоматического полива. Снабжает грядки водой через электрический насос.<br>Насос · 0,5 кВт во время полива. Без воды или питания рост замедляется.</p><button id="v011WaterRefill" class="menuButton">Пополнить воду</button>');
      el('v011WaterRefill').addEventListener('click',()=>refill());
    }
    renderWater();openOverlay(overlay);
  }
  v09Style('.v011FarmTankIcon .itemIcon{width:64px;height:64px}.v011FarmTankIcon{text-align:center;margin:6px}.v011FarmMeter{height:8px;background:#17282c;border-radius:8px;overflow:hidden;margin:12px 0}.v011FarmMeter i{display:block;height:100%;background:#69b4b9;border-radius:8px}.v011FarmHint{font-size:12px;line-height:1.5;color:#a5b7b8}#v011WaterStatus{font-size:15px}#v011WaterRefill{font-size:13px;padding:10px}');
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){
    const objects=oldInteractions(which);if(which!=='bunker')return objects;
    const ts=troughs();return objects.filter(o=>o.id!=='chest12'&&o.id!=='chest13').concat([
      {...tankRect(),id:'garden_tank',kind:'garden_water',name:'Полив огорода',range:50},
      ...Object.entries(ts).map(([k,rect])=>({...rect,id:'animal_'+k,kind:'livestock_manager',name:k.endsWith('Water')?'Общая поилка':'Кормушка',range:55}))
    ]);
  };
  const oldSolids=solidObjects;
  solidObjects=function(which){const objects=oldSolids(which);return which==='bunker'?objects.filter(o=>o.id!=='chest12'&&o.id!=='chest13').concat({...tankRect(),id:'garden_tank'},...Object.entries(troughs()).map(([key,r])=>({...r,id:'animal_'+key}))):objects;};
  const oldExecute=executeInteraction;
  executeInteraction=function(target){if(target?.kind==='garden_water'){if(!menuOpen&&!playerDead&&canInteract(target,player.x,player.y))openWater();return;}oldExecute(target);};
  const oldUpdate=update;update=function(){settle();oldUpdate();};
  const oldUse=useFarmBed;useFarmBed=function(i){settle();return oldUse(i);};
  
  function validateSave(d){
    const a=d.farmV011;if(a===undefined)return;
    if(!a||![1,2].includes(a.schema)||!valid(a.water,0,a.schema===1?100:CAPACITY)||!valid(a.at,0,Date.now()+60000)||!Array.isArray(a.grown)||a.grown.length!==5||a.grown.some((v,i)=>!valid(v,0,d.farm[i].crop===null?0:farmGrowMs(d.farm[i].crop))))throw Error('Некорректные данные полива');
  }
  GameSave.extend('capture','farm.growth',function(oldCapture){settle();const d=oldCapture();d.farmV011={schema:2,water:state.water,at:state.at,grown:window.farmState.map(st=>st.crop===null?0:growth(st))};d.farm014={schema:2,beds:window.farmState.map(st=>st.crop===null?null:JSON.parse(JSON.stringify(plants(st)))),irrigation:window.farmState.map(st=>st.irrigation028?{...st.irrigation028}:null)};return d;});
  function validate014(d){const x=d.farm014;if(!x)return;
    if(![1,2].includes(x.schema)||x.schema===1&&(!valid(x.next,0,Number.MAX_SAFE_INTEGER)||!valid(x.end,0,Number.MAX_SAFE_INTEGER))||!Array.isArray(x.beds)||x.beds.length!==5)throw Error('Некорректные грядки');
    if(x.schema===2&&(!Array.isArray(x.irrigation)||x.irrigation.length!==5||x.irrigation.some((q,i)=>q!==null&&(!q||d.farm[i].crop===null||!['wait','spray'].includes(q.phase)||q.rng!==undefined&&(!Number.isInteger(q.rng)||q.rng<0||q.rng>4294967295)||!valid(q.remainingMs,0,q.phase==='spray'?SPRAY:config.intervalMaxMs)))))throw Error('Invalid irrigation clocks');
    x.beds.forEach((a,i)=>{if(a===null){if(d.farm[i].crop!==null)throw Error('Пропущена грядка');return;}if(d.farm[i].crop===null||!Array.isArray(a)||a.length!==50||a.some(p=>!p||typeof p.planted!=='boolean'||typeof p.harvested!=='boolean'||!valid(p.elapsed,0,p.duration)||!valid(p.duration,0,farmGrowMs(d.farm[i].crop)*1.101)||!Number.isInteger(p.qty)||p.qty<1||p.qty>160||p.planted&&p.duration<farmGrowMs(d.farm[i].crop)*.899))throw Error('Некорректные растения');});
    if(x.schema===2){const reserved=x.irrigation.filter(q=>q?.phase==='spray').length*config.waterPerCycle;if(reserved>(d.farmV011?.water??0))throw Error('Unfunded irrigation cycles');}
  }
  GameSave.extend('decode','farm.growth',function(oldDecode,raw){const d=oldDecode(raw);validateSave(d);validate014(d);return d;});
  GameSave.extend('restore','farm.growth',function(oldRestore,d){
    validateSave(d);validate014(d);oldRestore(d);const saved=d.farmV011,now=Date.now();
    state.water=saved?saved.water:100;state.at=now;
    window.farmState.forEach((st,i)=>{st[grownKey]=st.crop===null?0:saved?saved.grown[i]:clamp(now-st.plantedAt,0,cropTotal(st));if(d.farm014?.beds[i])st.plants014=JSON.parse(JSON.stringify(d.farm014.beds[i]));
      if(st.crop!==null){const offline=saved?Math.max(0,now-saved.at):0,rate=state.water>=config.waterPerCycle&&powered()?1:DRY_RATE;
        plants(st).forEach(p=>{if(p.planted&&!p.harvested)p.elapsed=Math.min(p.duration,p.elapsed+offline*rate);});
        const q=d.farm014?.schema===2?d.farm014.irrigation[i]:null;if(!ready(i))st.irrigation028=q?{...q}:newTimer(i);}
    });
    settle(now);lastAnimalAt=performance.now();renderWater();invalidateGeometry();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle();});
  // Animals keep existing nutrition/production/breeding mechanics. Only their physical
  // presentation and autonomous, frame-rate independent movement are replaced.
  updateLivestockAnimals=function(){
    const now=performance.now(),dt=clamp((now-lastAnimalAt)/1000,0,.12);lastAnimalAt=now;
    if(scene!=='bunker'||!livestockAlive||GameFlow.paused)return;
    const p=habitat(),feed=storageCount(12,'animal_feed')>0,water=storageCount(13,'water')>0;
    const stalls=cowStalls();
    livestockAnimals.forEach((a,i)=>{
      const cow=a.kind==='cow',extent=cow?30:14,top=cow?p.t+20:p.m+12,bottom=cow?p.m-9:p.b-9;
      let q=pose.get(a);
      if(!q){q={angle:0,target:null,mode:'walk',until:0,stride:i*1.3,nextGesture:now+5000+Math.random()*30000,gestureAt:-10000};pose.set(a,q);}
      if(now>=q.nextGesture){q.gestureAt=now;q.nextGesture=now+5000+Math.random()*30000;}
      if(cow){const st=stalls.find(st=>st.id===a.stallId);if(!st)return;a.x=st.x;a.y=st.y;a.vx=a.vy=0;q.angle=st.angle;q.moving=false;q.mode=feed?'eat':'idle';q.stall=st;return;}
      a.x=clamp(a.x,p.l+43,p.r-extent-6);a.y=clamp(a.y,top+extent,bottom-extent);
      if(!q.target||now>=q.until){
        const cycle=Math.floor(now/12000+i*1.73)%5;
        if(cycle===0&&water){q.mode='drink';q.target={x:p.l+51,y:troughs().chickenWater.y+12+(i%3)*12};}
        else if(cycle===1&&feed){q.mode='eat';q.target={x:p.l+53,y:cow?p.t+70+(i%3)*24:p.b-112+(i%4)*17};}
        else{q.mode='walk';q.target={x:p.l+57+((i*67+Math.floor(now/7000)*31)%95),y:top+extent+((i*41+Math.floor(now/8000)*37)%Math.max(1,bottom-top-extent*2))};}
        q.until=now+9000+(i%4)*1700;
      }
      const dx=q.target.x-a.x,dy=q.target.y-a.y,d=Math.hypot(dx,dy),moving=d>3;
      const targetAngle=moving?Math.atan2(dy,dx)+Math.PI/2:q.mode==='drink'?(cow?Math.PI:0):q.mode==='eat'?-Math.PI/2:q.angle;
      let difference=((targetAngle-q.angle+Math.PI*3)%(Math.PI*2))-Math.PI;q.angle+=difference*Math.min(1,dt*4);
      const speed=cow?8:11,step=Math.min(d,speed*dt);
      if(moving){a.x+=dx/d*step;a.y+=dy/d*step;q.stride+=step*.16;a.vx=dx/d*.1;a.vy=dy/d*.1;}else{a.vx=0;a.vy=0;}
      q.moving=moving;
    });
  };
  function round(x,y,w,h,r=4){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function ellipse(x,y,rx,ry,color,angle=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();}
  function pipe(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  function articulatedAnimal(key,w,h,stride){
    const art=window.V011Art,im=art?.image?.(key);
    if(!im||!art.ready(key))return false;
    // The new silhouettes have their own anatomy; do not reuse old photographic
    // limb crop coordinates. A gentle gait rocks the tucked wings and body.
    ctx.save();ctx.translate(0,stride*.10);ctx.scale(1+Math.abs(stride)*.003,1-Math.abs(stride)*.002);
    ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();return true;
  }

  function drawAnimal(a,i){
    const cow=a.kind==='cow',q=pose.get(a)||{angle:0,stride:i,moving:false,mode:'walk'},now=performance.now(),w=cow?(q.stall?.w||37):19,h=cow?(q.stall?.h||60):26;
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(q.angle);ellipse(1,3,w*(cow?.31:.38),h*.39,'#07110b45');
    const stride=q.moving?Math.sin(q.stride)*3.6:0;
    const sway=q.moving?Math.sin(q.stride)*.015:Math.sin(now/1100+i)*.007;ctx.rotate(sway);
    if(cow){const breath=Math.sin(now/950+i)*.009;ctx.scale(1+breath,1);if(q.mode==='eat')ctx.translate(0,Math.sin(now/240+i)*.65);}
    const drawn=articulatedAnimal(cow?'cow':'chicken',w,h,stride);
    if(!drawn){
      if(cow){for(const sign of [-1,1])for(const end of [-1,1]){ctx.fillStyle='#8e9587';round(sign*w*.39-1.5,end*h*.23+stride*sign*end*.5,3,8,1.5);ctx.fill();ctx.fillStyle='#303c32';ctx.fillRect(sign*w*.39-1.5,end*h*.23+6+stride*sign*end*.5,3,2);}}
      else{pipe([[-4,7],[-5,12+stride*.3]],'#ac895a',1.3);pipe([[4,7],[5,12-stride*.3]],'#ac895a',1.3);}
      if(cow){ellipse(0,0,15,23,'#deded0');ellipse(-5,-7,7,9,'#414b43',-.2);ellipse(5,10,7,7,'#39473e',.2);ellipse(0,-25,8,9,'#d6d4c4');ellipse(-10,-22,5,3,'#aeb3a2',-.4);ellipse(10,-22,5,3,'#aeb3a2',.4);ellipse(0,-31,6,3,'#b2a28e');pipe([[0,23],[3,31]],'#b7bcaa',2);}
      else{ellipse(0,0,9,11,'#d9ccad');ellipse(-4,1,4,7,'#bca880',.2);ellipse(4,1,4,7,'#f0e1bf',-.2);ellipse(0,-11,4,5,'#e7d8b6');ellipse(0,-14,2,3,'#a04b3c');ctx.fillStyle='#d7a259';ctx.beginPath();ctx.moveTo(-2,-14);ctx.lineTo(0,-18);ctx.lineTo(2,-14);ctx.fill();}
    }
    const gesture=(now-(q.gestureAt??-10000))/1100;
    if(gesture>=0&&gesture<1){const wave=Math.sin(gesture*Math.PI)*Math.sin(gesture*Math.PI*5);if(cow){pipe([[0,h*.34],[wave*w*.20,h*.47],[wave*w*.32,h*.57]],'#b7c3a4',2);ellipse(wave*w*.32,h*.57,2.2,3.3,'#465747');}else{for(const sign of [-1,1]){ctx.save();ctx.translate(sign*w*.3,0);ctx.rotate(sign*(.2+wave*.8));ellipse(sign*w*.15,0,w*.25,h*.25,'#d2c09a');pipe([[0,-h*.12],[sign*w*.25,h*.15]],'#96805b',.8);ctx.restore();}}}
    if(!q.moving&&(q.mode==='eat' ||q.mode==='drink')){const bob=Math.sin(now/170+i)*1.8;ellipse(0,-h*.40+bob,cow?4:2,cow?2.2:1.1,q.mode==='drink'?'#83c4ca50':'#dfc98650');}
    ctx.restore();
  }
  function drawTrough(rect,kind,amount){
    const {x,y,w,h}=rect;ctx.fillStyle='#0d171854';round(x+3,y+5,w,h,5);ctx.fill();
    const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#98a9a5');g.addColorStop(.35,'#526964');g.addColorStop(1,'#344a45');ctx.fillStyle=g;round(x,y,w,h,5);ctx.fill();
    ctx.fillStyle='#172c2b';round(x+4,y+4,w-8,h-8,3);ctx.fill();
    if(amount>0){
      ctx.save();round(x+5,y+5,w-10,h-10,2);ctx.clip();
      if(kind==='water'){ctx.globalAlpha=.55+amount*.004;ctx.fillStyle='#4b9ba5';ctx.fillRect(x+5,y+5,w-10,h-10);ctx.strokeStyle='#b3dee063';ctx.lineWidth=1;for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(x+24+k*27,y+h/2,9+Math.sin(performance.now()/850+k)*2,2.5,0,0,Math.PI*2);ctx.stroke();}}
      else{ctx.fillStyle=kind==='cow'?'#7f8050':'#c8ab68';ctx.fillRect(x+5,y+h-5-(h-10)*Math.min(1,amount/100),w-10,(h-10)*Math.min(1,amount/100));for(let k=0;k<45;k++){const xx=x+6+(k*11%Math.max(1,w-12)),yy=y+h-6-(k*23%Math.max(1,Math.round((h-12)*amount/100)));if(kind==='cow')pipe([[xx,yy],[xx+4,yy-5]],k%2?'#b8ad65':'#697444',1);else ellipse(xx,yy,1.4,1,'#e5c782',k);}}
      ctx.restore();
    }
    ctx.strokeStyle='#bbcebf45';ctx.lineWidth=1;round(x+1,y+1,w-2,h-2,4);ctx.stroke();
  }
  const plantCache=new Map(),soilCache=new Map();
  const cropArt={0:'crop_potato',1:'crop_carrot',2:'crop_tomato',4:'crop_grain',7:'crop_berries'};
  function plantSprite(crop,stage){
    // Tiny early seedlings stay procedural; recognizable mature foliage/fruit uses
    // dedicated botanical art. Each stage is cached once after its bitmap loads.
    const artKey=cropArt[crop],image=stage>=3&&artKey&&window.V011Art?.ready(artKey)?V011Art.image(artKey):null;
    const key=crop+':'+stage+':'+(image?'art':'native');if(plantCache.has(key))return plantCache.get(key);
    const can=typeof OffscreenCanvas==='function'?new OffscreenCanvas(64,64):document.createElement('canvas');can.width=64;can.height=64;const c=can.getContext('2d');c.translate(32,32);const size=[.27,.47,.7,.87,1][stage],green=['#577d45','#608e49','#5b8842','#497c3c','#528744'][crop%5];c.scale(size,size);
    c.fillStyle='#121e1259';c.beginPath();c.ellipse(1,4,18,13,0,0,Math.PI*2);c.fill();
    if(image){c.drawImage(image,-32,-32,64,64);plantCache.set(key,can);return can;}
    function leaf(x,y,l,angle,color=green){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.ellipse(0,-l/2,l*.24,l*.57,0,0,Math.PI*2);c.fill();c.strokeStyle='#adc58560';c.lineWidth=.7;c.beginPath();c.moveTo(0,0);c.lineTo(0,-l);c.stroke();c.restore();}
    if(crop===1||crop===6){for(let j=0;j<[2,4,7,9,9][stage];j++)leaf(0,0,17+(j%3)*4,j*2.4,crop===6?'#71955c':green);if(crop===1&&stage===4){c.fillStyle='#c98342';c.beginPath();c.ellipse(0,2,3,4,0,0,Math.PI*2);c.fill();}}
    else if(crop===3||crop===4){for(let j=0;j<[2,3,5,7,7][stage];j++){const a=j*2.4;leaf(Math.sin(a)*4,Math.cos(a)*4,20,a,crop===4&&stage>=3?'#b5aa62':green);}if(stage>=3){for(let j=0;j<4;j++){c.fillStyle=crop===3?'#d4bc59':'#c7b579';c.save();c.rotate(j*1.6);c.fillRect(-2,-21,4,9);c.restore();}}}
    else{for(let j=0;j<[2,4,7,10,10][stage];j++){const a=j*2.4;leaf(Math.cos(a)*5,Math.sin(a)*5,14+(j%3)*3,a, j%3===0?'#79a35c':green);}if(stage>=3){for(let j=0;j<(stage===4?5:2);j++){const a=j*2.4,x=Math.cos(a)*11,y=Math.sin(a)*9;if(crop===2||crop===7){c.fillStyle=crop===2?'#cc674d':'#be4d4c';c.beginPath();c.arc(x,y,crop===2?3.9:2.6,0,Math.PI*2);c.fill();c.fillStyle='#f2a37a';c.beginPath();c.arc(x-1,y-1,1,0,Math.PI*2);c.fill();}else if(crop===0||crop===5||crop===8){c.fillStyle=crop===0?'#d3c7e7':'#d3ddac';c.beginPath();c.arc(x,y,1.8,0,Math.PI*2);c.fill();}else if(crop===9){c.fillStyle='#d3ad4b';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.fillStyle='#534935';c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}}}}
    plantCache.set(key,can);return can;
  }
  function soil(wet){
    const key=wet?'wet':'dry';if(soilCache.has(key))return soilCache.get(key);
    const can=typeof OffscreenCanvas==='function'?new OffscreenCanvas(128,128):document.createElement('canvas');can.width=can.height=128;const c=can.getContext('2d');c.fillStyle=wet?'#393027':'#493b2d';c.fillRect(0,0,128,128);
    // Fine earth grains, tiny clods and diffuse variations, without frame-time noise.
    for(let n=0;n<500;n++){const x=(n*47+n*n*3)%128,y=(n*79+n*n*7)%128;c.fillStyle=n%3===0?'#b8966240':n%3===1?'#16171340':'#81644524';c.beginPath();c.ellipse(x,y,.4+(n%5)*.31,.4+(n%3)*.3,n,0,Math.PI*2);c.fill();}
    for(let n=0;n<15;n++){const x=(n*61)%128,y=(n*97)%128,g=c.createRadialGradient(x,y,0,x,y,8+n%7);g.addColorStop(0,wet?'#1d201726':'#b2946515');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-16,y-16,32,32);}
    const texture=ctx.createPattern(can,'repeat');soilCache.set(key,texture);return texture;
  }
  const sprayFrames=[];
  function drawSpray(x,y,seed){
    // Pre-render the small water effect once; hundreds of emitters then need only
    // one bitmap draw each, instead of thousands of paths on every mobile frame.
    if(!sprayFrames.length){
      for(let frame=0;frame<32;frame++){
        const can=typeof OffscreenCanvas==='function'?new OffscreenCanvas(64,64):document.createElement('canvas');can.width=can.height=64;
        const c=can.getContext('2d'),phase=frame/32,g=c.createRadialGradient(31,31,2,31,31,23);
        g.addColorStop(0,'#d0f4f64e');g.addColorStop(.45,'#a4dfe62b');g.addColorStop(1,'#b4e9ef00');c.fillStyle=g;c.fillRect(0,0,64,64);
        for(let k=0;k<7;k++){
          const f=(phase+k*.143)%1,spread=(k-3)*.25;
          const xx=32+Math.sin(spread)*f*24,yy=21+f*22-Math.sin(f*Math.PI)*8;
          c.globalAlpha=Math.sin(f*Math.PI)*.8;c.fillStyle='#c8f1f5';c.beginPath();c.ellipse(xx,yy,1.1+f*.45,1.7,-spread,0,Math.PI*2);c.fill();
          if(f>.82){c.strokeStyle='#aee3e78c';c.lineWidth=.7;c.beginPath();c.ellipse(xx,42,2+(f-.82)*12,1+(f-.82)*5,0,0,Math.PI*2);c.stroke();}
        }
        c.globalAlpha=1;c.fillStyle='#7fbbb8';c.beginPath();c.arc(32,21,1.8,0,Math.PI*2);c.fill();sprayFrames.push(can);
      }
    }
    const phase=(performance.now()/1000*1.3+seed*.17)%1;
    ctx.drawImage(sprayFrames[Math.floor(phase*32)],x-28,y-32,64,64);
  }
  function drawBeds(){
    const beds=getFarmBeds(),mainY=beds[0].y-23;
    pipe([[tankRect().x+23,mainY],[beds.at(-1).x+beds.at(-1).w/2,mainY]],'#243d38',8);pipe([[tankRect().x+23,mainY],[beds.at(-1).x+beds.at(-1).w/2,mainY]],'#7eaaa0',3);
    beds.forEach((b,i)=>{
      const spray=spraying(i),st=window.farmState[i],p=st.crop===null?0:clamp(growth(st,state.at)/cropTotal(st),0,1),wet=state.water>0&&st.crop!==null&&p<1;
      ctx.fillStyle='#111c1855';round(b.x-6,b.y-3,b.w+16,b.h+14,5);ctx.fill();
      const rim=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y);rim.addColorStop(0,'#7c8975');rim.addColorStop(.5,'#a7ac8c');rim.addColorStop(1,'#586b5e');ctx.fillStyle=rim;round(b.x-6,b.y-6,b.w+12,b.h+12,4);ctx.fill();
      ctx.fillStyle=soil(wet);ctx.fillRect(b.x,b.y,b.w,b.h);
      for(let c=0;c<5;c++){const x=b.x+24+c*(b.w-48)/4;pipe([[x,b.y+32],[x,b.y+b.h-30]],wet?'#211f18':'#30261e',9);pipe([[x+5,b.y+32],[x+5,b.y+b.h-30]],'#80644555',2);}
      const cx=b.x+b.w/2;pipe([[cx,mainY],[cx,b.y+10],[b.x+11,b.y+10]],'#233a34',4);
      for(let c=0;c<5;c++){
        const x=b.x+24+c*(b.w-48)/4;pipe([[x,b.y+10],[x,b.y+b.h-33]],'#1c2924',2);
        for(let r=0;r<10;r++){
          const y=b.y+52+r*(b.h-94)/9;
          const individual=st.crop===null?null:plants(st)[c*10+r];if(individual?.planted&&!individual.harvested){const pp=clamp(individual.elapsed/individual.duration,0,1),sprite=plantSprite(st.crop,Math.min(4,Math.floor(pp*5))),size=26+(r*7+c*3)%3;ctx.save();ctx.translate(x,y);ctx.rotate(((r*17+c*11+i*5)%13-6)*.075);ctx.drawImage(sprite,-size/2,-size/2,size,size);ctx.restore();}
          if(spray&&wet)drawSpray(x,y,i*50+c*10+r);
        }
      }
      ctx.fillStyle='#bcc9a7';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.text(st.crop===null?'ГРЯДКА '+(i+1):window.farmCrops[st.crop].name),b.x+b.w/2,b.y+21);
      if(st.crop!==null){ctx.fillStyle=p>=1?'#d4dea0':'#a8baa0';ctx.font='10px Arial';ctx.fillText(I18n.text(p>=1?'ГОТОВО':farmTimeLabel((cropTotal(st)-st[grownKey])/(state.water>0?1:DRY_RATE))),b.x+b.w/2,b.y+b.h-10);}
    });
    const b=tankRect();ctx.fillStyle='#10212366';round(b.x+4,b.y+5,b.w,b.h,8);ctx.fill();const g=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y);g.addColorStop(0,'#486c68');g.addColorStop(.5,'#96b4a4');g.addColorStop(1,'#456b67');ctx.fillStyle=g;round(b.x,b.y,b.w,b.h,9);ctx.fill();
    ctx.fillStyle='#173535';round(b.x+28,b.y+12,9,51,3);ctx.fill();ctx.fillStyle='#78c8d2';ctx.fillRect(b.x+30,b.y+61-state.water/CAPACITY*47,5,state.water/CAPACITY*47);ctx.fillStyle='#cadaaf';ctx.fillRect(b.x+29,b.y+14,1,46);
    ellipse(b.x+17,b.y+17,8,8,'#36574f');ellipse(b.x+17,b.y+17,5,5,'#8ea69a');pipe([[b.x+22,b.y],[b.x+22,mainY]],'#769e91',4);
    ctx.textAlign='center';ctx.fillStyle='#d1ddd0';ctx.font='9px Arial';ctx.fillText(I18n.text(Math.ceil(state.water)+' л'),b.x+b.w/2,b.y+b.h+15);
  }
  let floorPattern=null;
  function floor(){
    if(!floorPattern){const can=typeof OffscreenCanvas==='function'?new OffscreenCanvas(96,96):document.createElement('canvas');can.width=can.height=96;const c=can.getContext('2d');c.fillStyle='#3b4840';c.fillRect(0,0,96,96);c.fillStyle='#4c5849';c.fillRect(2,2,92,92);c.strokeStyle='#233d32';c.lineWidth=2;c.strokeRect(1,1,94,94);c.strokeStyle='#aeb89315';c.lineWidth=1;c.beginPath();c.moveTo(4,4);c.lineTo(92,4);c.lineTo(92,92);c.stroke();for(let k=0;k<70;k++){c.fillStyle=k%2?'#d7d7ae08':'#0a20100c';c.fillRect(k*37%92+2,k*23%92+2,1,1);}floorPattern=ctx.createPattern(can,'repeat');}
    const f=bunker.farm;ctx.save();ctx.fillStyle=floorPattern;ctx.fillRect(f.left+8,f.top+8,f.right-f.left-16,f.bottom-f.top-16);ctx.restore();
  }
  function draw(){
    const p=habitat(),f=bunker.farm,ts=troughs();ctx.save();ctx.lineCap='round';
    // The farm's original outer wall/door remain authoritative for collision.
    ctx.fillStyle='#34423a';ctx.fillRect(p.l,p.t,p.r-p.l,p.b-p.t);
    for(let k=0;k<18;k++){const x=p.l+13+(k*71%(p.r-p.l-26)),y=p.t+15+(k*137%(p.b-p.t-30));ellipse(x,y,8+k%9,3+k%4,'#1b291c22',k*.4);ellipse(x+5,y+5,1.5,3,'#15221725',k);}
    for(let k=0;k<120;k++){const x=p.l+8+(k*47%(p.r-p.l-16)),y=p.t+8+(k*79%(p.b-p.t-16));pipe([[x,y],[x+4,y+2]],'#92926122',1);}
    ctx.strokeStyle='#65766a';ctx.lineWidth=6;ctx.strokeRect(p.l,p.t,p.r-p.l,p.b-p.t);pipe([[p.l,p.m],[p.r,p.m]],'#73877a',6);
    ctx.fillStyle='#34423a';ctx.fillRect(p.r-6,p.t+112,14,70);ctx.fillRect(p.r-6,p.m+105,14,70);
    drawStalls();drawTrough(ts.chicken,'chicken',storageCount(12,'animal_feed'));drawTrough(ts.chickenWater,'water',storageCount(13,'water'));
    ctx.fillStyle='#233b38';round(p.r-21,p.m-26,44,52,5);ctx.fill();ctx.strokeStyle='#8ca99a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#5eab95';round(p.r-15,p.m-18,30,23,3);ctx.fill();ctx.fillStyle='#b8e2c5';ctx.fillRect(p.r-11,p.m-13,17,2);ctx.fillRect(p.r-11,p.m-7,23,2);ellipse(p.r,p.m+15,4,4,'#a2c5a8');
    if(livestockAlive)livestockAnimals.forEach(drawAnimal);
    const feed=feedCraftStationPos();ctx.fillStyle='#476058';round(feed.x-27,feed.y-22,54,44,5);ctx.fill();ellipse(feed.x-7,feed.y,13,15,'#7c9180');ellipse(feed.x-7,feed.y,8,10,'#bcc1a0');ctx.fillStyle='#adc591';ctx.fillRect(feed.x+11,feed.y-12,7,6);
    for(const i of [8,9]){const pos=getChestPositions()[i];if(window.V011Rooms?.chest){V011Rooms.chest(i,pos,storageChests[i]);continue;}if(!window.V011Art?.draw('chest',pos.x-34,pos.y-25,68,50)){ctx.fillStyle='#65776a';round(pos.x-34,pos.y-25,68,50,4);ctx.fill();ctx.strokeStyle='#9bac8d';ctx.lineWidth=2;ctx.stroke();pipe([[pos.x-25,pos.y-23],[pos.x-25,pos.y+23]],'#c0c9a4',4);pipe([[pos.x+25,pos.y-23],[pos.x+25,pos.y+23]],'#c0c9a4',4);}}
    drawBeds();ctx.restore();
  }
  invalidateGeometry();
  return {state,settle,plant,beginBed,plantOne,harvestOne,plants,ready,pumpDemand,setPowered:v=>{state.powered=!!v;},progress,spraying,refill,openWater,draw,floor,drawAnimal,tankRect,troughs,cowStalls,validateSave,constants:{CAPACITY,SPRAY,DRY_RATE},config};
})();

