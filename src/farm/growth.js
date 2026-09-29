/* 0.11 — living garden (0.43: AgricultureTime). 0.43 Pass B moved all animals to farm/livestock.js. */
window.V011Farm=(()=>{
  const config=GameplayBalance.farm,CAPACITY=config.waterCapacity,SPRAY=config.irrigationMs,DRY_RATE=config.dryGrowth;
  const state={water:0,at:AgricultureTime.now(),schema:2,powered:true};
  const grownKey='_v011Growth';
  let lastMenuPaint=0;
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
  const newTimer=(index=0)=>{const q={phase:'wait',rng:(0x28fa031+index*104729+(AgricultureTime.now()%4294967296))>>>0,remainingMs:0};q.remainingMs=config.firstMinMs+timerRandom(q)*(config.firstMaxMs-config.firstMinMs);return q;};
  const timer=st=>st.irrigation028||(st.irrigation028=newTimer(window.farmState.indexOf(st)));
  const resetTimer=q=>{q.phase='wait';q.remainingMs=config.intervalMinMs+timerRandom(q)*(config.intervalMaxMs-config.intervalMinMs);};
  function pumpDemand(){if(!AgricultureTime.available)return 0;return state.water>=config.waterPerCycle&&growing().some(st=>{const q=timer(st);return q.phase==='spray'||q.remainingMs<=0;})?.5:0;}
  function settle(now=AgricultureTime.now()){
    if(!AgricultureTime.available)return state;
    now=Math.max(state.at,now);let left=now-state.at;
    const running=!GameFlow.paused&&!document.hidden&&!playerDead;
    window.farmState.forEach(st=>{if(st.crop!==null)plants(st);});
    let iterations=0;
    while(left>0&&iterations++<12000){
      const live=growing();if(!live.length||!running||!powered())break;
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
        if(plants(st).every(p=>p.harvested||p.planted&&p.elapsed>=p.duration)){window.BunkerPassA?.readyAt(window.farmState.indexOf(st),now-left+step);delete st.irrigation028;continue;}
        if(running&&wet&&q.phase==='spray'&&q.remainingMs<=.00001){state.water=Math.max(0,state.water-config.waterPerCycle);resetTimer(q);}
      }
      left-=step;
    }
    state.at=now;
    for(const st of window.farmState)if(st.crop!==null){st.plantedAt=now-growth(st);if(ready(window.farmState.indexOf(st)))delete st.irrigation028;}
    if(el('v011Irrigation')?.style.display==='flex'&&performance.now()-lastMenuPaint>500){lastMenuPaint=performance.now();renderWater();}
    return state;
  }
  function beginBed(index,crop){if(!AgricultureTime.available)return false;
    if(!Number.isInteger(index)||index<0||index>=5||!window.farmCrops[crop]||window.farmState[index].crop!==null)return false;
    window.farmState[index]={crop,plantedAt:AgricultureTime.now(),[grownKey]:0,plants014:Array.from({length:50},(_,n)=>({planted:false,harvested:n>=config.crops[farmCrops[crop].itemType].yield,elapsed:0,duration:0,qty:1}))};return true;
  }
  function plantOne(index,n,now=AgricultureTime.now()){if(!AgricultureTime.available)return false;
    settle(now);const st=window.farmState[index],p=plants(st)[n];if(!p||p.planted||p.harvested)return false;
    Object.assign(p,{planted:true,elapsed:0,duration:Math.round(cropTotal(st)*(.9+Math.random()*.2))});if(plants(st).every(p=>p.planted||p.harvested))timer(st);return true;
  }
  function harvestOne(index,n){if(!AgricultureTime.available)return false;const st=window.farmState[index],p=plants(st)[n];if(!p||!p.planted||p.harvested||p.elapsed<p.duration)return 0;p.harvested=true;const qty=p.qty||1;if(plants(st).every(p=>p.harvested||!p.planted))window.farmState[index]={crop:null,plantedAt:0};return qty;}
  function plant(index,crop){return window.V0141Farm?.plant(index,crop)||false;}
  function progress(index){settle();const st=window.farmState[index];return !st||st.crop===null?0:clamp(growth(st)/cropTotal(st),0,1);}
  function ready(index){const st=window.farmState[index];return st?.crop!==null&&plants(st).every(p=>p.harvested||p.planted&&p.elapsed>=p.duration);}
  function spraying(index){if(!AgricultureTime.available)return false;return state.water>=config.waterPerCycle&&powered()&&growing().some(st=>(index===undefined||farmState[index]===st)&&timer(st).phase==='spray');}
  function tankRect(){const f=bunker.farm;return {x:(f.cropLeft??90)+13,y:f.top+51,w:45,h:76};}
  function refill(amount=100){if(!AgricultureTime.available)return 0;
    settle();const wanted=Math.min(Math.max(0,Math.floor(amount)),Math.floor(CAPACITY-state.water),bagCount('water'));
    if(wanted<=0){message(state.water>CAPACITY-1?'Бачок почти заполнен':'В рюкзаке нет воды');return 0;}
    GameAudio.play('waterRefill');removeItem('water',wanted);state.water=Math.min(CAPACITY,state.water+wanted);renderWater();queueGameSave();return wanted;
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
      const body=overlay.querySelector('.v09Body');I18n.assign(body,"innerHTML",'<div class="v011FarmTankIcon">'+itemIconHTML('water')+'</div><div id="v011WaterStatus"></div><div class="v011FarmMeter"><i id="v011WaterFill"></i></div><p class="v011FarmHint">Бак автоматического полива. Снабжает грядки водой через электрический насос.<br>Полив и фитосвет · 0,8 кВт. Без питания рост остановлен. Без воды рост замедляется.</p><button id="v011WaterRefill" class="menuButton">Пополнить воду</button>');
      el('v011WaterRefill').addEventListener('click',()=>refill());
    }
    renderWater();openOverlay(overlay);
  }
  v09Style('.v011FarmTankIcon .itemIcon{width:64px;height:64px}.v011FarmTankIcon{text-align:center;margin:6px}.v011FarmMeter{height:8px;background:#17282c;border-radius:8px;overflow:hidden;margin:12px 0}.v011FarmMeter i{display:block;height:100%;background:#69b4b9;border-radius:8px}.v011FarmHint{font-size:12px;line-height:1.5;color:#a5b7b8}#v011WaterStatus{font-size:15px}#v011WaterRefill{font-size:13px;padding:10px}');
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){
    const objects=oldInteractions(which);if(which!=='bunker')return objects;
    return objects.filter(o=>o.id!=='chest13').concat([
      {...tankRect(),id:'garden_tank',kind:'garden_water',name:'Полив огорода',range:50}
    ]);
  };
  const oldSolids=solidObjects;
  solidObjects=function(which){const objects=oldSolids(which);return which==='bunker'?objects.filter(o=>o.id!=='chest13').concat({...tankRect(),id:'garden_tank'}):objects;};
  const oldExecute=executeInteraction;
  executeInteraction=function(target){if(target?.kind==='garden_water'){if(!menuOpen&&!playerDead&&canInteract(target,player.x,player.y))openWater();return;}oldExecute(target);};
  const oldUpdate=update;update=function(){settle();oldUpdate();};
  const oldUse=useFarmBed;useFarmBed=function(i){settle();return oldUse(i);};
  
  function validateSave(d){
    const a=d.farmV011;if(a===undefined)return;
    if(!a||![1,2].includes(a.schema)||!valid(a.water,0,a.schema===1?100:CAPACITY)||!valid(a.at,0,Number.MAX_SAFE_INTEGER)||!Array.isArray(a.grown)||a.grown.length!==5||a.grown.some((v,i)=>!valid(v,0,d.farm[i].crop===null?0:farmGrowMs(d.farm[i].crop))))throw Error('Некорректные данные полива');
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
    validateSave(d);validate014(d);oldRestore(d);const saved=d.farmV011,now=AgricultureTime.now();
    state.water=saved?saved.water:100;state.at=now;
    window.farmState.forEach((st,i)=>{st[grownKey]=st.crop===null?0:saved?saved.grown[i]:clamp(now-st.plantedAt,0,cropTotal(st));if(d.farm014?.beds[i])st.plants014=JSON.parse(JSON.stringify(d.farm014.beds[i]));
      if(st.crop!==null){const offline=0,rate=state.water>=config.waterPerCycle&&powered()?1:DRY_RATE;
        plants(st).forEach(p=>{if(p.planted&&!p.harvested)p.elapsed=Math.min(p.duration,p.elapsed+offline*rate);});
        const q=d.farm014?.schema===2?d.farm014.irrigation[i]:null;if(q)st.irrigation028={...q};else if(AgricultureTime.available&&!ready(i))st.irrigation028=newTimer(i);}
    });
    settle(now);renderWater();invalidateGeometry();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle();});
  function round(x,y,w,h,r=4){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function ellipse(x,y,rx,ry,color,angle=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();}
  function pipe(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
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
      const count=st.crop===null?0:config.crops[farmCrops[st.crop].itemType].yield,rows=Math.ceil(count/2);
      for(let n=0;n<count;n++){const p=plants(st)[n],x=b.x+b.w/2+(n%2?28:-28),y=b.y+50+Math.floor(n/2)*(b.h-94)/Math.max(1,rows-1);if(p?.planted&&!p.harvested){const sprite=plantSprite(st.crop,Math.min(4,Math.floor(p.elapsed/p.duration*5)));ctx.save();ctx.globalAlpha=window.BunkerPassA?.rotten(i)?.55:1;ctx.drawImage(sprite,x-22,y-22,44,44);ctx.restore();if(window.BunkerPassA?.rotten(i)){ctx.fillStyle='#76573599';ctx.fillRect(x-15,y-5,30,8);}}if(spray&&wet)drawSpray(x,y,n);}
      // A spoiled bed reads at a glance: its plants and soil turn a dull, dark brown.
      if(window.BunkerPassA?.rotten(i)){ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle='#a07a50';ctx.fillRect(b.x,b.y+28,b.w,b.h-44);ctx.globalCompositeOperation='source-over';ctx.fillStyle='#2a1a0c30';ctx.fillRect(b.x,b.y+28,b.w,b.h-44);ctx.restore();}
      ctx.fillStyle='#bcc9a7';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.text(st.crop===null?'ГРЯДКА '+(i+1):window.farmCrops[st.crop].name),b.x+b.w/2,b.y+21);
      if(st.crop!==null){ctx.fillStyle=window.BunkerPassA?.rotten(i)?'#d8a27a':p>=1?'#d4dea0':'#a8baa0';ctx.font='10px Arial';ctx.fillText(I18n.text(p>=1?(window.BunkerPassA?.rotten(i)?I18n.t('farm.rotten'):I18n.t('farm.ready')+' '+farmTimeLabel(window.BunkerPassA?.remaining(i)||0)):farmTimeLabel((cropTotal(st)-st[grownKey])/(state.water>0?1:DRY_RATE))),b.x+b.w/2,b.y+b.h-10);}
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
  invalidateGeometry();
  return {state,settle,plant,beginBed,plantOne,harvestOne,plants,ready,pumpDemand,setPowered:v=>{state.powered=!!v;},progress,spraying,refill,openWater,drawBeds,floor,tankRect,validateSave,constants:{CAPACITY,SPRAY,DRY_RATE},config};
})();

