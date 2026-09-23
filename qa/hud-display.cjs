// Integration checks against real presentation, combat, clock and preference owners.
// DOM/event model + native Canvas; CSS browser layout is a separate manual gate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.chdir(path.resolve(__dirname,'..'));
const {setup}=require('./runtime.cjs'),checks=[],copy=x=>JSON.parse(JSON.stringify(x));
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
const r=setup('index.html',{}, {language:'en'}),E=s=>r.eval(s),node=id=>r.doc.getElementById(id),storageKey=E('GameHUD.storageKey');
const initial=E('JSON.stringify(captureGameProgress())');
function restore(){E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(initial)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);document.hidden=false;playerDead=false;`);}
function equip(type){E(`if(!bagCount('${type}'))addItem('${type}',1);V013Inventory.equip('${type}');updateAmmoHud();`);assert.equal(E('heldItem()'),type);}
check('defaults.normalHUDOnDiagnosticsOff',()=>assert.deepEqual(copy(E('GameHUD.settings')),{minimap:true,dayTime:true,fps:false,frameTime:false,equippedItem:true,objectives:true}));
check('structure.onlyClockAndPerformanceInTopNoImagesInEquipped',()=>{
 assert.deepEqual(node('hud').children.map(n=>n.id),['v016WorldClock','hudPerformance']);
 assert.equal(node('ammoHud').parentNode,node('heldItemName'));assert.equal(node('locationName').parentNode,node('game'));
 assert.equal(node('heldItemName').querySelectorAll('img,svg,canvas,i').length,0);
 assert.equal(r.doc.querySelectorAll('#ammoHud').length,1);
});
const valueNodes=['hudDay','hudTime','hudFPS','hudFrameTime','equippedItemName','ammoHud','hudReserve'].map(id=>node(id).childNodes[0]);
for(const language of ['ru','en'])for(const day of [1,9,10,99,100,999,1000,1000000])check(`clock.${language}.${day}`,()=>{
 E(`I18n.setLanguage('${language}');V016Lighting.restore({schema:1,day:${day},minute:759});`);
 assert.equal(node('hudDay').textContent,String(day));assert.equal(node('hudDayLabel').textContent,language==='ru'?'ДЕНЬ':'DAY');assert.equal(node('hudTime').textContent,'12:39');assert.equal(E('WorldClock.day'),day);
 assert.equal(node('hudDay').style.fontSize,day<=999?'':(3/String(day).length)+'em');
});
for(const [minute,expected]of [[0,'00:00'],[9,'00:09'],[599,'09:59'],[720,'12:00'],[1439,'23:59']])check('clock.time.'+expected,()=>{E(`V016Lighting.restore({schema:1,day:17,minute:${minute}})`);assert.equal(node('hudTime').textContent,expected);});
for(let mask=0;mask<32;mask++)check('display.independentCombination.'+mask,()=>{
 const keys=['minimap','dayTime','fps','frameTime','equippedItem'];keys.forEach((key,i)=>E(`GameHUD.set('${key}',${!!(mask&(1<<i))})`));
 const s=copy(E('GameHUD.settings'));assert.equal(node('v010Minimap').hidden,!s.minimap);assert.equal(node('v016WorldClock').hidden,!s.dayTime);assert.equal(node('hudPerformance').hidden,!(s.fps||s.frameTime));assert.equal(node('hud').hidden,!(s.dayTime||s.fps||s.frameTime));assert.equal(node('hudFPS').hidden,!s.fps);assert.equal(node('hudFrameTime').hidden,!s.frameTime);assert.equal(node('heldItemName').hidden,!s.equippedItem);
 for(const key of keys)assert.equal(node('display_'+key).getAttribute('aria-checked'),String(s[key]));
});
check('preferences.noGameSaveMutationAndSurviveBoot',()=>{
 const before=E('JSON.stringify(captureGameProgress())');r.emit('click',node('display_minimap'));r.emit('click',node('display_frameTime'));
 assert.equal(E('JSON.stringify(captureGameProgress())'),before);
 const again=setup('index.html',Object.fromEntries(r.storage),{mainMenu:true});assert.deepEqual(copy(again.eval('GameHUD.settings')),copy(E('GameHUD.settings')));assert.equal(again.scheduler.rafRequests,0);assert.ok(!Object.hasOwn(E('captureGameProgress()'),'display'));assert.deepEqual(again.errors,[]);
});
for(const saved of ['{broken','null','[]','false','{"fps":"yes","minimap":0,"frameTime":true}'])check('preferences.invalid.'+saved,()=>{
 const q=setup('index.html',{[storageKey]:saved},{mainMenu:true});const s=copy(q.eval('GameHUD.settings'));assert.equal(s.fps,false);assert.equal(s.minimap,true);assert.equal(s.frameTime,saved.includes('true'));assert.deepEqual(q.errors,[]);
});
check('preferences.deniedStorageNonfatal',()=>{
 E('window.hudSetItem=localStorage.setItem;localStorage.setItem=()=>{throw Error("denied")};GameHUD.set("fps",false);');assert.equal(node('displaySaveStatus').hidden,false);assert.equal(E('GameHUD.settings.fps'),false);
 E('localStorage.setItem=hudSetItem;GameHUD.set("fps",true);');assert.equal(node('displaySaveStatus').hidden,true);
});
check('menu.sameSettingsNodesBeforeAndAfterLaunch',()=>{
 const q=setup('index.html',{}, {mainMenu:true,language:'en'}),n=id=>q.doc.getElementById(id);q.emit('click',n('menuSettings'));const settings=n('displaySettings'),before=q.eval('JSON.stringify(captureGameProgress())');q.emit('click',n('display_fps'));assert.equal(q.eval('JSON.stringify(captureGameProgress())'),before);assert.equal(q.scheduler.rafRequests,0);q.emit('click',n('closeSettings'));q.emit('click',n('menuNew'));q.emit('click',n('mainMenuSlots').children[0]);q.emit('click',n('settingsButton'));assert.equal(n('displaySettings'),settings);assert.equal(q.eval('GameHUD.settings.fps'),true);assert.equal(n('display_fps').listeners.click.length,1);assert.deepEqual(q.errors,[]);
});
restore();E('GameHUD.set("equippedItem",true);GameHUD.set("dayTime",true);I18n.setLanguage("en");');
for(const weapon of ['rifle_ak74','rifle_m4'])for(const capacity of [0,30,60])for(const rounds of [0,1,21,capacity].filter((n,i,a)=>n<=capacity&&a.indexOf(n)===i))check(`weapon.${weapon}.${rounds}/${capacity}`,()=>{
 equip(weapon);E(`window.hudWeapon=V010Combat.currentWeapon();hudWeapon.magazineType=${capacity===60?'"magazine_module"':capacity===30?'"magazine_standard"':'null'};hudWeapon.rounds=${rounds};hudWeapon.level=5;updateAmmoHud();`);
 assert.equal(node('ammoHud').textContent,rounds+'/'+capacity);assert.equal(node('equippedItemName').textContent,weapon==='rifle_ak74'?'AK-74':'M4');assert.equal(E('hudWeapon.level'),5);assert.equal(node('ammoHud').hidden,false);assert.equal(node('hudReserve').textContent,String(E(`bagCount(V09Craft.weapons.${weapon}.ammo)`)));
});
for(const count of [0,9,120,999])check('weapon.reserve.'+count,()=>{
 equip('rifle_ak74');E(`removeItem('ammo',bagCount('ammo'));addItem('ammo',${count});updateAmmoHud();`);assert.equal(node('hudReserve').textContent,String(count));
});
for(const lang of ['ru','en'])for(const [type,en,ru]of [['axe','Axe','Топор'],['pickaxe','Pickaxe','Кирка'],['hammer','Hammer','Молот'],['remote','Base remote','Пульт базы'],['flashlight','Tactical Flashlight','Тактический фонарь'],['fishing_rod','Fishing rod','Удочка']])check(`tool.${lang}.${type}`,()=>{
 E(`I18n.setLanguage('${lang}')`);equip(type);assert.equal(node('equippedItemName').textContent,lang==='ru'?ru:en);assert.equal(node('heldItemName').hidden,false);assert.equal(node('ammoHud').hidden,true);assert.equal(node('hudReserve').hidden,true);assert.equal(node('heldItemName').dataset.firearm,'false');
});
check('equipped.emptyHandsHidden',()=>{E('activeHandSlot=null;renderQuickSlots();updateAmmoHud();');assert.equal(E('heldItem()'),null);assert.equal(node('heldItemName').hidden,true);});
check('equipped.hiddenStillAllowsActualReload',()=>{
 restore();equip('rifle_ak74');E('GameHUD.set("equippedItem",false);V010Combat.currentWeapon().rounds=1;addItem("ammo",70);updateAmmoHud();reloadWeapon();');assert.ok(E('V010Combat.reloading'));assert.equal(node('heldItemName').hidden,true);assert.equal(node('v010ReloadButton').disabled,true);
 E('V010Combat.tick(2500)');assert.equal(E('V010Combat.currentWeapon().rounds'),E('V09Craft.magazineCapacity(V010Combat.currentWeapon())'));assert.equal(E('V010Combat.reloading'),null);assert.equal(node('heldItemName').hidden,true);E('GameHUD.set("equippedItem",true)');assert.equal(node('ammoHud').textContent,'30/30');
});
check('render.readOnlyAllPreferencesAndLanguageSwitches',()=>{
 const before=E('JSON.stringify(captureGameProgress())');for(let i=0;i<20;i++)E(`I18n.setLanguage('${i%2?'ru':'en'}');GameHUD.set('fps',${!!(i%2)});GameHUD.refreshClock();updateAmmoHud();`);assert.equal(E('JSON.stringify(captureGameProgress())'),before);
 assert.deepEqual(['hudDay','hudTime','hudFPS','hudFrameTime','equippedItemName','ammoHud','hudReserve'].map(id=>node(id).childNodes[0]),valueNodes);
});
for(const rate of [9,30,60,120])check('monitor.rafCadence.'+rate,()=>{
 E(`GameHUD.set('fps',false);GameHUD.set('frameTime',false);GameHUD.set('fps',true);GameHUD.set('frameTime',true);for(let n=0;n<=${rate*3};n++)GameHUD.sample(n*1000/${rate});`);assert.equal(node('hudFPS').textContent,String(rate));assert.equal(node('hudFrameTime').textContent,(1000/rate).toFixed(1));
});
check('monitor.zeroNewNodesAtMostFourTextRefreshesPerSecond',()=>{
 let writes=0,created=0;const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node('hudFPS').childNodes[0]),'nodeValue');
 for(const id of ['hudFPS','hudFrameTime']){const t=node(id).childNodes[0];Object.defineProperty(t,'nodeValue',{configurable:true,get(){return d.get.call(this)},set(value){writes++;d.set.call(this,value)}});}
 E('GameHUD.set("fps",false);GameHUD.set("fps",true);');writes=0;
 const make=r.doc.createElement;r.doc.createElement=function(...args){created++;return make(...args)};
 E('for(let n=0,t=0;n<600;n++){t+=n%2?16:17;GameHUD.sample(t);}');r.doc.createElement=make;
 assert.equal(created,0);assert.ok(writes<=80,writes);assert.ok(writes>0);
 for(const id of ['hudFPS','hudFrameTime'])delete node(id).childNodes[0].nodeValue;
});
check('monitor.disabledDoesNotRequestFramesTimersOrWriteText',()=>{
 E('GameHUD.set("fps",false);GameHUD.set("frameTime",false);');const text=node('hudPerformance').textContent,raf=r.scheduler.rafRequests,timers=r.timers.size;
 E('for(let i=0;i<1000;i++)GameHUD.sample(i*16.667);');assert.equal(node('hudPerformance').textContent,text);assert.equal(r.scheduler.rafRequests,raf);assert.equal(r.timers.size,timers);
});
check('monitor.visibilityResetsHiddenGapAndMeasuresVisibleStalls',()=>{
 E('GameHUD.set("fps",true);GameHUD.set("frameTime",true);GameHUD.sample(0);GameHUD.sample(500);');assert.equal(node('hudFPS').textContent,'2');assert.equal(node('hudFrameTime').textContent,'500.0');
 r.doc.hidden=true;r.emit('visibilitychange',r.doc);E('GameHUD.sample(900000)');assert.equal(node('hudFPS').textContent,'—');r.doc.hidden=false;r.emit('visibilitychange',r.doc);
 E('for(let i=0;i<=90;i++)GameHUD.sample(900000+i*1000/60)');assert.equal(node('hudFPS').textContent,'60');assert.equal(node('hudFrameTime').textContent,'16.7');
});
check('monitor.hookedIntoOnlyExistingGameLoop',()=>{
 const code=fs.readFileSync('src/ui/display.js','utf8');assert.ok(!/requestAnimationFrame\(|setInterval\(|setTimeout\(|getBoundingClientRect\(/.test(code));assert.ok(fs.readFileSync('src/core/loop-viewport.js','utf8').includes('window.GameHUD?.sample(timestamp);'));
});
check('minimap.offSkipsCanvasDrawOnKeepsMapMechanics',()=>{
 restore();E('GameHUD.set("minimap",true)');const c=node('v010Minimap').getContext('2d'),clear=c.clearRect;let paints=0;c.clearRect=function(...a){paints++;return clear.apply(this,a)};
 E('draw()');assert.ok(paints>0);paints=0;const state=E('JSON.stringify(V010Camera.capture())');E('GameHUD.set("minimap",false);draw();');assert.equal(paints,0);assert.equal(E('JSON.stringify(V010Camera.capture())'),state);E('V010Camera.showMap()');assert.ok(node('v010MapOverlay').classList.contains('open'));E('closeOverlay(el("v010MapOverlay"));GameHUD.set("minimap",true);draw();');assert.ok(paints>0);c.clearRect=clear;
});
check('safeArea.telegramInsetsShareExistingEventOwner',()=>{
 const events={},app={platform:'ios',safeAreaInset:{top:44,bottom:34,left:20,right:0},contentSafeAreaInset:{top:32,bottom:5,left:0,right:12},onEvent:(name,fn)=>{(events[name]??=[]).push(fn)}};
 const q=setup('index.html',{}, {width:390,height:844,maxTouchPoints:5,beforeScripts:s=>{s.Telegram={WebApp:app}}}),style=q.doc.documentElement.style;
 assert.equal(style['--v011-hud-top'],'86px');assert.equal(style['--v011-safe-bottom'],'39px');assert.equal(style['--v011-safe-left'],'20px');assert.equal(style['--v011-safe-right'],'12px');
 app.safeAreaInset.bottom=21;for(const fn of events.safeAreaChanged)fn();assert.equal(style['--v011-safe-bottom'],'26px');assert.deepEqual(q.errors,[]);
});
check('layout.fixedColumnsTabularNumbersNoPanelsOrImages',()=>{
 const css=fs.readFileSync('styles/hud.css','utf8');assert.ok(css.includes('grid-template-columns:2.6em 3ch 5ch 2ch'));assert.ok(css.includes('grid-template-columns:minmax(0,1fr) 5ch 4ch'));assert.ok(css.includes('tabular-nums lining-nums'));assert.ok(css.includes('text-shadow:0 1px 2px #000,0 0 1px #000'));assert.ok(css.includes('background:none;border:0;border-radius:0;box-shadow:none;backdrop-filter:none'));assert.ok(!/url\(/.test(css));assert.ok(css.includes('#hud [hidden]'));assert.ok(css.includes('var(--hud-safe-bottom)'));assert.ok(css.includes('orientation:landscape'));assert.ok(css.includes('pointer-events:none'));
});
check('layout.defaultPortraitJoystickAndVerticalClearanceContract',()=>{
 const css=fs.readFileSync('styles/hud.css','utf8');
 const normal=css.match(/body #heldItemName\{\n  display:grid;[\s\S]*?\n\}/)[0];
 const itemBottom=Number(normal.match(/bottom:calc\((\d+)px/)[1]),lineHeight=Number(normal.match(/line-height:(\d+)px/)[1]);
 const vitalsBottom=Number(css.match(/body #v163Vitals\{bottom:calc\((\d+)px/)[1]);
 const vitalsHeight=Number(fs.readFileSync('src/ui/loot-vitals.js','utf8').match(/#v163Vitals\{[^\n]*?height:(\d+)px/)[1]);
 const stops=[...css.matchAll(/#v014RouteStop\{bottom:calc\((\d+)px/g)].map(m=>Number(m[1]));
 assert.ok(itemBottom-vitalsBottom-vitalsHeight>=6,'item line must clear the existing vitals');
 assert.ok(stops[0]-itemBottom-lineHeight>=6,'route stop must clear the one-line item HUD');
 assert.ok(stops[1]-itemBottom-lineHeight*2>=6,'route stop must clear the narrow two-line item HUD');
 const rule=css.match(/width:min\((\d+)px,calc\((\d+)vw - (\d+)px\)\)/);assert.ok(rule);
 for(const width of [320,360,390,430,768]){
  const hudWidth=Math.min(Number(rule[1]),width*Number(rule[2])/100-Number(rule[3])),left=(width-hudWidth)/2,right=left+hudWidth;
  assert.ok(left-(width*.18+46)>=3.99,'left default joystick '+width);assert.ok((width*.82-46)-right>=3.99,'right default joystick '+width);
 }
});
check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
const result={patch:'hud-compact-1',passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks,limitations:['Modeled DOM/Pointer Events, real Canvas. Browser CSS layout, physical phone and Telegram require manual review.']};fs.writeFileSync('qa/results/hud-display.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL')}));if(result.failed)process.exitCode=1;
