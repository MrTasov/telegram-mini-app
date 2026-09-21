/* Fishing uses real world interactions, normal inventory and the existing lake collision. */
window.V012Fishing=(()=>{
  for(const type of ['fish','fishing_rod'])V092_ICONS[type]=V011Art.sources[type];
  const spots=[
    {id:'fish_north',x:210,y:1535,waterX:210,waterY:1660},
    {id:'fish_west',x:-110,y:1750,waterX:25,waterY:1750},
    {id:'fish_south',x:185,y:2125,waterX:185,waterY:2000}
  ].map(s=>({...s,kind:'fishing0121',name:'Рыбалка · удочка · 6–15 сек.',r:17,range:35}));
  const boats=[{x:310,y:1760,a:.2},{x:80,y:1945,a:-.4}];
  const shoreRocks=[[-48,1660,21],[-61,1694,14],[347,1638,27],[377,1660,18],[300,2040,25],[330,2019,16]];
  let state=null,shoreCache=null;
  function shoreTarget(force=false){
    if(scene!=='surface'||!window.V013Lake||V013Lake.wet(player.x,player.y))return null;
    const now=performance.now();if(!force&&shoreCache&&Math.hypot(player.x-shoreCache.x,player.y-shoreCache.y)<4&&now-shoreCache.at<150)return shoreCache.target;
    const poly=V09World.lake,candidates=[];
    if(player.x>=-225&&player.x<=555&&player.y>=1410&&player.y<=2235){
      for(let i=0;i<poly.length;i++){
        const [ax,ay]=poly[i],[bx,by]=poly[(i+1)%poly.length],dx=bx-ax,dy=by-ay,t=clamp(((player.x-ax)*dx+(player.y-ay)*dy)/(dx*dx+dy*dy),0,1),sx=ax+dx*t,sy=ay+dy*t;
        const len=Math.hypot(160-sx,1820-sy)||1,wx=sx+(160-sx)/len*45,wy=sy+(1820-sy)/len*45,dist=Math.hypot(wx-player.x,wy-player.y);
        if(dist<45||dist>155||!V013Lake.wet(wx,wy)||boats.some(b=>Math.hypot(wx-b.x,wy-b.y)<45))continue;
        let entered=false,clear=true;
        for(let j=1;j<=24;j++){const f=j/24,x=player.x+(wx-player.x)*f,y=player.y+(wy-player.y)*f,wet=V013Lake.wet(x,y);if(wet)entered=true;else if(entered||worldCollision(x,y,0,'surface')){clear=false;break;}if(shoreRocks.some(([rx,ry,r])=>Math.hypot(x-rx,y-ry)<r*.8)){clear=false;break;}}
        if(clear)candidates.push({waterX:wx,waterY:wy,dist});
      }
    }
    const best=candidates.sort((a,b)=>a.dist-b.dist)[0];
    const target=best?{id:'fish_shore014',kind:'fishing0121',name:'Рыбалка · 6–15 сек.',x:player.x,y:player.y,r:1,range:6,waterX:best.waterX,waterY:best.waterY}:null;
    shoreCache={x:player.x,y:player.y,at:now,target};return target;
  }
  function stop(){window.V013Lake?.release();state=null;window.ActorVisuals?.cancelFishing();}
  function delay(){return 6000+Math.floor((Math.random()+Math.random())/2*9001);}
  function cycle(spot){const fish=window.V013Lake?.choose(spot);if(window.V013Lake&&!fish){stop();message('Рыба пока не подходит к этому месту');return false;}state={spot,started:performance.now(),duration:fish?.duration||delay(),fishId:fish?.id,x:player.x,y:player.y};return true;}
  function start(target){
    const spot=target?.id==='fish_shore014'?shoreTarget(true):spots.find(s=>s.id===target?.id);
    if(!spot||scene!=='surface'||menuOpen||playerDead||!canInteract(spot,player.x,player.y))return false;
    if(bagCount('fishing_rod')<1){message('Изготовьте удочку на станке: 10 дерева + 2 детали');return false;}
    if(!space()){message('В рюкзаке нет места для рыбы');return false;}
    if(state?.spot.id===spot.id){stop();message('Рыбалка остановлена');return true;}
    cancelNavigation();cancelChop();cancelSearch();V09World.stopMining();
    V0105.equip('fishing_rod');firing=false;if(!cycle(spot))return false;face();return true;
  }
  function space(){return freeItemSpace(bag,'fish',BAG_SLOTS)>0;}
  function face(){if(!state)return;const dx=state.spot.waterX-player.x,dy=state.spot.waterY-player.y,n=Math.hypot(dx,dy)||1;player.aimX=dx/n;player.aimY=dy/n;}
  function tick(){
    if(!state)return;
    if(scene!=='surface'||playerDead||heldItem()!=='fishing_rod'||bagCount('fishing_rod')<1||movePower>.05||navigation||Math.hypot(player.x-state.x,player.y-state.y)>2){stop();return;}
    face();
    if(document.hidden)return;
    if(performance.now()-state.started<state.duration)return;
    const grams=100*Math.round(3+Math.pow(Math.random(),2)*17);
    if(!space()||addItem('fish',1,{fishGrams:grams})>0){stop();message('Рюкзак заполнен · рыбалка остановлена');return;}
    window.V013Lake?.caught();
    const spot=state.spot;message('🐟 Рыба · '+I18n.numeric(grams/1000,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' кг');queueGameSave();
    if(menuOpen)V010Inventory.render();
    // At most one catch per frame: returning from background never yields a burst of offline loot.
    if(space())cycle(spot);else stop();
    // Presentation notification only: catch timing, inventory and RNG above
    // remain authoritative, including the final catch into a full backpack.
    window.ActorVisuals?.fishCaught(spot);
  }
  function phase(){
    if(!state)return {kind:'idle',p:0};
    const t=performance.now()-state.started;
    if(t<600)return {kind:'cast',p:clamp(t/600,0,1)};
    if(t>state.duration-700)return {kind:'reel',p:clamp((t-state.duration+700)/700,0,1)};
    return {kind:'wait',p:(t-600)/(state.duration-1300)};
  }
  function rodTip(){const ph=phase();return {x:ph.kind==='cast'?22+42*ph.p:ph.kind==='reel'?64-18*ph.p:64,y:ph.kind==='cast'?-40*Math.sin(ph.p*Math.PI):-7};}
  function drawHeld(){
    const tip=rodTip(),ph=phase(),spin=ph.kind==='reel'?Math.sin(performance.now()/35)*3:0;
    ctx.strokeStyle='#c9a47f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(20,0);ctx.moveTo(3,11);ctx.lineTo(16,7+spin);ctx.stroke();
    ctx.strokeStyle='#bc955f';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(11,4);ctx.lineTo(26,1);ctx.stroke();
    ctx.strokeStyle='#263a3d';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(26,1);ctx.quadraticCurveTo(45,-9,tip.x,tip.y);ctx.stroke();
    ctx.strokeStyle='#b1c9c4';ctx.lineWidth=.8;ctx.stroke();
    ctx.fillStyle='#c19854';ctx.beginPath();ctx.arc(21,6,4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#273e40';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(21,6);ctx.lineTo(24,9+spin);ctx.stroke();
  }
  function floatPoint(){
    const ph=phase(),s=state.spot;
    const f=ph.kind==='cast'?ph.p:ph.kind==='reel'?1-ph.p:1;
    return {x:player.x+(s.waterX-player.x)*f,y:player.y+(s.waterY-player.y)*f-((ph.kind==='cast'||ph.kind==='reel')?Math.sin(f*Math.PI)*36:Math.sin(performance.now()/230)*1.5)};
  }
  function drawLine(){
    if(window.ActorVisuals?.drawFishingLine())return;
    if(!state||scene!=='surface')return;face();
    const tip=rodTip(),a=Math.atan2(player.aimY,player.aimX),p=floatPoint(),ph=phase();
    const tx=player.x+tip.x*Math.cos(a)-tip.y*Math.sin(a),ty=player.y+tip.x*Math.sin(a)+tip.y*Math.cos(a);
    ctx.save();ctx.lineWidth=.85;ctx.strokeStyle='rgba(223,235,218,.8)';ctx.beginPath();ctx.moveTo(tx,ty);ctx.quadraticCurveTo((tx+p.x)/2,(ty+p.y)/2+9,p.x,p.y);ctx.stroke();
    if(ph.kind==='reel'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(performance.now()/40)*.3);V011Art.draw('fish',-13,-8,26,16);ctx.restore();}
    else {ctx.fillStyle='#eee4c3';ctx.beginPath();ctx.ellipse(p.x,p.y,2.5,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dc765e';ctx.fillRect(p.x-2,p.y-5,4,4);}
    ctx.restore();
  }
  function drawWater(){
    const now=performance.now();
    window.V013Lake?.draw();
    ctx.save();
    for(const b of boats){
      ctx.save();ctx.translate(b.x,b.y+Math.sin(now/1200+b.x)*1.2);ctx.rotate(b.a+Math.sin(now/2000)*.015);
      ctx.strokeStyle='rgba(151,204,208,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,26,51,0,0,Math.PI*2);ctx.stroke();
      V011Art.draw('fishing_boat',-30,-48,60,96);ctx.restore();
    }
    for(const s of spots){
      ctx.fillStyle='#92785a';ctx.strokeStyle='#c2aa7a';ctx.lineWidth=1;
      // Small shore-side timber pad; remains on walkable land.
      for(let j=-1;j<=1;j++){ctx.fillRect(s.x-16,s.y+j*9-4,32,8);ctx.strokeRect(s.x-16,s.y+j*9-4,32,8);}
      if(Math.hypot(player.x-s.x,player.y-s.y)<210){ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e3e9ce';ctx.fillText(I18n.text('🎣 Рыбалка'),s.x,s.y-22);}
    }
    if(state){
      const ph=window.ActorVisuals?.fishingVisualPhase()||phase(),s=state.spot;
      if(ph.kind!=='cast'||ph.p>.8){
        for(let i=0;i<3;i++){const p=((now/1100+i/3)%1);ctx.strokeStyle=`rgba(194,230,226,${(1-p)*.5})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(s.waterX,s.waterY,3+p*17,2+p*10,0,0,Math.PI*2);ctx.stroke();}
        if(ph.kind==='reel'||(ph.kind==='cast'&&ph.p>.8))for(let i=0;i<7;i++){const p=(now/270+i*.17)%1,a=i*2.4;ctx.fillStyle=`rgba(206,241,239,${1-p})`;ctx.beginPath();ctx.arc(s.waterX+Math.cos(a)*p*19,s.waterY+Math.sin(a)*p*10-Math.sin(p*Math.PI)*17,1.6,0,Math.PI*2);ctx.fill();}
      }
    }
    ctx.restore();
  }
  const interactions=interactionObjects;interactionObjects=function(which=scene){const out=interactions(which);if(which!=='surface')return out;const shore=heldItem()==='fishing_rod'?shoreTarget():null;return [...out,...spots,...(shore?[shore]:[])];};
  const execute=executeInteraction;executeInteraction=function(o,...args){if(o?.kind==='fishing0121')return start(o);if(o&&!menuOpen)stop();return execute(o,...args);};
  const approach=approachObject;approachObject=function(o,...args){stop();return approach(o,...args);};
  const ground=approachPoint;approachPoint=function(...args){stop();return ground(...args);};
  const select=selectHandSlot;selectHandSlot=function(...args){const out=select(...args);if(heldItem()!=='fishing_rod')stop();return out;};
  const playerUpdate=updatePlayer;updatePlayer=function(...args){const out=playerUpdate(...args);tick();return out;};
  const updateOld=update;update=function(...args){const out=updateOld(...args);tick();return out;};
  const surfaceOld=drawSurface;drawSurface=function(...args){const out=surfaceOld(...args);drawWater();return out;};
  const drawOld=drawPlayer;drawPlayer=function(...args){drawLine();return drawOld(...args);};
  const actionOld=updateAction;updateAction=function(...args){const out=actionOld(...args);if(scene==='surface'&&heldItem()==='fishing_rod'){const shore=state?.spot||shoreTarget();if(shore){interactionTarget=shore;currentActionObject=shore;currentAction='fishing0121';actionButton.classList.add('available');actionButton.classList.remove('inactive');}}if(currentAction==='fishing0121'){I18n.assign(actionButton,"textContent",state?'■':'🎣');I18n.setAttr(actionButton,'aria-label',state?'Остановить рыбалку':'Ловить рыбу');}return out;};
  GameSave.extend('restore','world.fishing',function(restoreOld,...args){stop();return restoreOld(...args);});
  return {spots,boats,start,stop,tick,phase,drawHeld,drawWater,delay,shoreTarget,get state(){return state?{...state,spot:{...state.spot}}:null;}};
})();

/* A fish stack is an ordered collection of immutable fish identities, not an average weight. */
window.V014Fish=(()=>{
  let serial=0;const prefix='fish_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9)+'_';
  const copy=x=>JSON.parse(JSON.stringify(x)),valid=f=>f&&typeof f.id==='string'&&f.id.length>0&&f.id.length<=100&&Number.isInteger(f.grams)&&f.grams>=1&&f.grams<=2000;
  function normalize(s){
    if(s?.type!=='fish')return s;
    if(Array.isArray(s.fishEntries)){if(s.fishEntries.length!==s.qty||!s.fishEntries.every(valid)||new Set(s.fishEntries.map(f=>f.id)).size!==s.qty)throw Error('Некорректная стопка рыбы');}
    else {const total=Number.isInteger(s.fishGrams)?s.fishGrams:s.qty*500;if(total<s.qty||total>s.qty*2000)throw Error('Некорректный вес рыбы');const each=Math.floor(total/s.qty),extra=total%s.qty;s.fishEntries=Array.from({length:s.qty},(_,i)=>({id:prefix+(++serial),grams:each+(i<extra?1:0)}));}
    s.fishGrams=s.fishEntries.reduce((n,f)=>n+f.grams,0);return s;
  }
  function portion(s,n,offset=0){normalize(s);const entries=copy(s.fishEntries.slice(offset,offset+n));return {...copy(s),qty:entries.length,fishEntries:entries,fishGrams:entries.reduce((n,f)=>n+f.grams,0)};}
  function append(target,source,n,offset=0){normalize(target);normalize(source);target.fishEntries.push(...copy(source.fishEntries.slice(offset,offset+n)));target.fishGrams=target.fishEntries.reduce((sum,f)=>sum+f.grams,0);}
  function remove(s,n){normalize(s);const removed=s.fishEntries.splice(0,n);s.fishGrams=s.fishEntries.reduce((sum,f)=>sum+f.grams,0);return removed;}
  function walk(value,fn,visited=new Set()){if(!value||typeof value!=='object'||visited.has(value))return;visited.add(value);if(value.type==='fish'&&Number.isInteger(value.qty)){fn(value);return;}for(const x of Object.values(value))walk(x,fn,visited);}
  function validateSave(d){const ids=new Set();walk(d,s=>{if(!Number.isInteger(s.qty)||s.qty<1||s.qty>100)throw Error('Некорректное количество рыбы');if(s.fishEntries!==undefined){if(!Array.isArray(s.fishEntries)||s.fishEntries.length!==s.qty||!s.fishEntries.every(valid))throw Error('Некорректные данные рыбы');if(s.fishGrams!==s.fishEntries.reduce((n,f)=>n+f.grams,0))throw Error('Не совпадает вес рыбы');for(const f of s.fishEntries){if(ids.has(f.id))throw Error('Повтор рыбы в сохранении');ids.add(f.id);}}else if(s.fishGrams!==undefined&&(!Number.isInteger(s.fishGrams)||s.fishGrams<s.qty||s.fishGrams>s.qty*2000))throw Error('Некорректный вес рыбы');});return true;}
  function migrate(d){walk(d,normalize);return d;}
  function weight(s){return normalize(s).fishGrams;}
  return {normalize,portion,append,remove,walk,validateSave,migrate,weight};
})();
