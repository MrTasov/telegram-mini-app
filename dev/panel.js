(()=>{
  if(window.LastBaseDeveloper?.isolated!==true)return;
  const panel=document.createElement('aside');panel.id='worldEventDebug';
  panel.style.cssText='position:fixed;z-index:50000;left:8px;right:8px;top:max(8px,env(safe-area-inset-top));padding:8px;background:#10232bf2;color:#fff;font:12px Arial;border:1px solid #8ab;visibility:visible!important;pointer-events:auto!important';
  const title=document.createElement('strong');title.textContent='DEVELOPER · TEST COPY / ТЕСТОВАЯ КОПИЯ';panel.append(title);
  const status=document.createElement('span');status.style.cssText='display:block;margin:5px 0';panel.append(status);
  const actions=[['START X EVENT',()=>WorldEvents.debugOverride('day_x',true)],['STOP X EVENT',()=>WorldEvents.debugOverride('day_x',false)],['CALENDAR / КАЛЕНДАРЬ',()=>WorldEvents.debugOverride('day_x',null)],['DAY 9 · 23:59',()=>{WorldEvents.debugOverride('day_x',null);V016Lighting.restore({schema:1,day:9,minute:1439});}],['DAY 10 · 05:59',()=>{WorldEvents.debugOverride('day_x',null);V016Lighting.restore({schema:1,day:10,minute:359});}]];
  for(const [label,fn]of actions){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:36px;margin:2px;padding:5px 8px;touch-action:manipulation';b.addEventListener('click',()=>{if(!GameState.session.ready||MainMenu.active)return;fn();refresh();});panel.append(b);}
  let last='';function refresh(){const text=(MainMenu.active?'Choose a save/New Game first · Сначала выбери сохранение/новую игру. ':WorldEvents.isActive('day_x')?'X ACTIVE · ':'X OFF · ')+WorldClock.day+' / '+String(Math.floor(WorldClock.minute/60)).padStart(2,'0')+':'+String(Math.floor(WorldClock.minute%60)).padStart(2,'0')+' · Original saves unchanged / Оригинальные saves не изменяются';if(text!==last){status.textContent=text;last=text;}}
  WorldClock.onChange(refresh);WorldEvents.onChange(refresh);document.body.append(panel);refresh();
})();

