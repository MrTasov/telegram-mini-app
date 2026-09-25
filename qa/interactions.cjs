// Real game handlers in the Stage 0 DOM/Canvas harness. Native browser layout
// and pointer retargeting still require the documented desktop/phone check.
const fs=require('node:fs'),path=require('node:path');
const {setup}=require('./runtime.cjs');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const report=path.resolve(process.argv[3]||path.join(__dirname,'results/interactions.json'));
process.chdir(process.env.LAST_BASE_ASSETS||path.dirname(file));
const r=setup(file),E=s=>r.eval(s),canvas=r.doc.getElementById('canvas'),checks=[];
const baseline=E('JSON.stringify(captureGameProgress())');
const check=(id,value)=>checks.push({id,status:value?'PASS':'FAIL'});
const openIds=()=>E('[...document.querySelectorAll(".overlay.open")].map(o=>o.id)');
function fresh(which='bunker'){
 E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(baseline)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);stopControls(true);scene=${JSON.stringify(which)};player.wallLevel=false;playerDead=false;document.hidden=false;frameScale=1;V013City.setFloor(0);zombies=[];`);
}
function place(id){
 E(`window.testObject=interactionObjects().find(o=>o.id===${JSON.stringify(id)});if(!testObject)throw Error('Missing interaction '+${JSON.stringify(id)});window.testPosition=false;
 if(testObject.kind==='hmg016'||GameEquipment.get(testObject.id)?.state.settings.mountWall){player.wallLevel=true;player.x=testObject.x;player.y=testObject.y+22;testPosition=true;}else{
 outer:for(let dy=-100;dy<=(testObject.h||0)+100;dy+=5)for(let dx=-100;dx<=(testObject.w||0)+100;dx+=5){const x=testObject.x+dx,y=testObject.y+dy;if(!worldCollision(x,y,player.radius,scene)&&canInteract(testObject,x,y)){player.x=x;player.y=y;testPosition=true;break outer;}}}
 // Teleporting a test fixture must settle the following camera before a tap.
 // Otherwise the stale view can put the world object underneath a fixed stick.
 for(let n=0;n<60;n++)updateCamera();`);
 if(!E('testPosition'))throw Error('No reachable test point: '+id);
 return E('({x:testObject.x+(testObject.w||0)/2,y:testObject.y+(testObject.h||0)/2})');
}
function gesture(point,pointerType='mouse',options={}){
 const p=E(`worldToScreen(${point.x},${point.y})`),props={pointerType,pointerId:pointerType==='mouse'?1:8,clientX:p.x,clientY:p.y,detail:1};
 r.emit('pointerdown',canvas,props);
 if(options.between)options.between();
 r.emit('pointerup',options.upTarget||canvas,props);
 if(!options.noClick)r.emit('click',options.clickTarget||canvas,props);
}
function outside(pointerType='mouse'){
 gesture(E('({x:player.x+240,y:player.y-180})'),pointerType);
}
try{
 const cases=[['craft_bench','v09CraftOverlay'],['furnace','v09CraftOverlay'],...Array.from({length:8},(_,i)=>['chest'+i,'storageOverlay']),['generator','v09GeneratorOverlay'],['tank','v09GeneratorOverlay'],['battery','v010BatteryOverlay'],['robots014_dock','v0151Station'],['upgrade0161','v0161UpgradePanel'],['hmg016_1','defenseOverlay']];
 for(const pointerType of ['mouse','touch'])for(const [id,expected]of cases){
  fresh(id==='hmg016_1'?'surface':'bunker');
  // Test the station's uncovered pad; the drone itself has its own panel.
  if(id==='robots014_dock')E('V014Robots.state.packed=true;');
  const point=place(id);
  check(pointerType+'.'+id+'.hit',E(`hitInteraction(${point.x},${point.y})?.id===${JSON.stringify(id)}`));
  for(let n=0;n<3;n++){
   gesture(point,pointerType);
   check(pointerType+'.'+id+'.open.'+n,openIds().includes(expected));
   if(id.startsWith('chest'))check(pointerType+'.'+id+'.selection.'+n,E('activeStorage')===Number(id.slice(5)));
   for(let t=0;t<4;t++){r.advance(16.667);E('update();');}
   check(pointerType+'.'+id+'.staysOpen.'+n,openIds().includes(expected));
   const before=E('JSON.stringify({navigation,point:objectPointer})');outside(pointerType);
   check(pointerType+'.'+id+'.outsideClosesOnly.'+n,openIds().length===0&&E('JSON.stringify({navigation,point:objectPointer})')===before);
  }
 }
 // A -> B -> A, including consecutive quick gestures without a debounce delay.
 fresh();
 for(const id of ['chest6','chest5','chest6','craft_bench','furnace','craft_bench']){
  const p=place(id);gesture(p);check('switch.'+id+'.'+checks.length,openIds().length===1);outside();
 }
 // Cover all remaining bunker interactions, including commands without panels:
 // light controls, circuit switches, every door/bed and the living-room props.
 fresh();const covered=new Set(cases.map(c=>c[0]));covered.add('drone014');covered.add('exit');
 const remaining=E('interactionObjects().map(o=>({id:o.id,kind:o.kind}))').filter(o=>!covered.has(o.id));
 E('window.executedInteractions=[];window.recordedExecute=executeInteraction;executeInteraction=function(o,...a){executedInteractions.push(o?.id);return recordedExecute(o,...a);};');
 for(const object of remaining)for(const pointerType of ['mouse','touch']){
  fresh();place(object.id);
  const point=E(`(()=>{const o=testObject;for(const fx of [.5,.1,.9,0,1])for(const fy of [.5,.1,.9,0,1]){const x=o.r!==undefined?o.x+(fx-.5)*o.r*2:o.x+o.w*fx,y=o.r!==undefined?o.y+(fy-.5)*o.r*2:o.y+o.h*fy;if(hitInteraction(x,y)?.id===o.id)return {x,y};}return null;})()`);
  check('base.'+object.id+'.'+pointerType+'.selectable',!!point);if(!point)continue;
  E('executedInteractions=[];');gesture(point,pointerType);
  check('base.'+object.id+'.'+pointerType+'.oneAction',E(`executedInteractions.filter(id=>id===${JSON.stringify(object.id)}).length===1`));
  if(object.kind==='v09power_device')check('base.'+object.id+'.'+pointerType+'.panel',openIds().includes('v09PowerDeviceOverlay'));
  if(object.kind==='farm')check('base.'+object.id+'.'+pointerType+'.panel',openIds().includes('farmOverlay'));
  if(openIds().length)outside(pointerType);
 }
 E('executeInteraction=recordedExecute;');
 for(const task of ['guard','follow','disabled','docked'])for(const pointerType of ['mouse','touch']){
  fresh();E(`Object.assign(V014Robots.state,{x:1120,y:650,scene:'bunker',packed:false,task:${JSON.stringify(task)},battery:${task==='disabled'?0:100}});`);
  place('drone014');
  for(const offset of [[0,-10],[-24,-24],[24,-24],[0,-38],[25,5]]){
   const p=E(`({x:V014Robots.state.x+${offset[0]},y:V014Robots.state.y+${offset[1]}})`);
   check('drone.'+task+'.'+pointerType+'.visualHit.'+offset,E(`hitInteraction(${p.x},${p.y})?.id==='drone014'`));
   gesture(p,pointerType);check('drone.'+task+'.'+pointerType+'.open.'+offset,openIds().includes('v014DronePanel'));outside(pointerType);
  }
 }
 fresh();place('drone014');gesture(E('({x:V014Robots.state.x,y:V014Robots.state.y-10})'));
 check('drone.dockForeground',openIds().includes('v014DronePanel')&&!openIds().includes('v0151Station'));outside();
 fresh();E("Object.assign(V014Robots.state,{x:1120,y:650,scene:'bunker',task:'guard',packed:false});");place('drone014');
 E('window.observedDroneTarget=null;window.beforeApproach=approachObject;approachObject=function(o,...a){if(o?.id===\'drone014\')observedDroneTarget={x:o.x,y:o.y};return beforeApproach(o,...a);};');
 const p=E('({x:V014Robots.state.x,y:V014Robots.state.y-10})');
 gesture(p,'mouse',{between:()=>E('V014Robots.state.x+=18;')});
 check('drone.movingUsesCurrentGeometry',E('observedDroneTarget?.x===V014Robots.state.x'));outside();E('approachObject=beforeApproach;');
 // Nested window dismissal must still consume the entire gesture.
 fresh();E("openOverlay(el('inventoryOverlay'));V0162Quick.open(4);window.underlyingClicks=0;el('inventoryGrid').addEventListener('click',()=>underlyingClicks++);");
 for(const type of ['pointerdown','pointerup','click'])r.emit(type,r.doc.getElementById('inventoryGrid'),{detail:1});
 check('modal.nestedDismissDoesNotClickThrough',E("!el('v0162QuickPicker').classList.contains('open')&&el('inventoryOverlay').classList.contains('open')&&underlyingClicks===0"));
 for(const type of ['pointerdown','pointerup','click'])r.emit(type,r.doc.getElementById('inventoryGrid'),{detail:1});
 check('modal.nextGestureIsImmediate',E('underlyingClicks===1'));
 // Pointer retargeted to the new overlay by the browser is still the opener.
 fresh();const turret=placeAfterSurface();
 const pt=E(`worldToScreen(${turret.x},${turret.y})`),ev={pointerType:'mouse',pointerId:1,detail:1,clientX:pt.x,clientY:pt.y};
 r.emit('pointerdown',canvas,ev);const overlay=r.doc.getElementById('defenseOverlay');r.emit('pointerup',overlay,ev);r.emit('click',overlay,ev);
 check('modal.retargetedOpenerStaysOpen',openIds().includes('defenseOverlay'));
 r.emit('keydown',r.doc,{key:'Escape'});check('modal.escapeCloses',openIds().length===0);
 // Native no-click pointer sequences must not swallow the next fresh gesture.
 gesture(turret,'touch',{noClick:true});check('modal.touchNoCompatibilityClick',openIds().includes('defenseOverlay'));outside('touch');check('modal.touchNextDismiss',openIds().length===0);
 // Click-only keyboard/accessibility activation keeps working.
 r.emit('click',r.doc.getElementById('settingsButton'),{detail:0});check('modal.keyboardSettings',openIds().includes('settingsOverlay'));
 r.emit('click',r.doc.getElementById('closeSettings'),{detail:0});check('modal.keyboardClose',openIds().length===0);
 fresh();const q=place('craft_bench'),s=E(`worldToScreen(${q.x},${q.y})`);
 for(const type of ['pointerdown','pointercancel'])r.emit(type,canvas,{pointerId:4,pointerType:'touch',clientX:s.x,clientY:s.y});
 check('pointer.cancelDoesNotOpen',openIds().length===0);gesture(q);check('pointer.afterCancelWorks',openIds().includes('v09CraftOverlay'));
 check('console.noErrors',r.errors.length===0);
}catch(error){checks.push({id:'suite.exception',status:'ERROR',error:error.stack});}
function placeAfterSurface(){fresh('surface');return place('hmg016_1');}
const result={file,environment:'Stage 0 modeled DOM, native Canvas2D; not a browser',passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status!=='PASS').length,checks,consoleErrors:r.errors};
fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status!=='PASS')}));if(result.failed)process.exitCode=1;
