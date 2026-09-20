// Regressions for the reported hidden Settings, smaller menu, and early fullscreen.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.chdir(path.resolve(__dirname,'..'));
const {setup}=require('./runtime.cjs'),checks=[];
const boot=(options={},storage={})=>setup('index.html',storage,{mainMenu:true,language:'en',...options});
const phone={maxTouchPoints:5,media:{'(pointer: coarse)':true},width:390,height:844};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const node=(r,id)=>r.doc.getElementById(id);
function tap(r,id,type='touch'){const n=typeof id==='string'?node(r,id):id;for(const event of ['pointerdown','pointerup','click'])r.emit(event,n,{pointerType:type,detail:1});}
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
async function main(){
 await check('settings.stackingContext.menuAndBothSharedPanelsAreSiblings',()=>{
  const r=boot(),menu=node(r,'mainMenu'),css=fs.readFileSync('styles/main-menu.css','utf8');
  // Fixed #game creates a stacking context even without an explicit z-index.
  // Comparing child z-index values alone missed the original reported bug.
  assert.equal(menu.parentNode,node(r,'game'));
  for(const id of ['settingsOverlay','controlOverlay'])assert.equal(node(r,id).parentNode,menu.parentNode);
  const menuZ=Number(css.match(/#mainMenu\{[^}]*z-index:(\d+)/)[1]);
  tap(r,'menuSettings');assert.ok(Number(node(r,'settingsOverlay').style.zIndex)>menuZ);
  tap(r,'openControlSettings');assert.ok(Number(node(r,'controlOverlay').style.zIndex)>menuZ);
  assert.ok(css.includes('#game>:not(.overlay):not(#mainMenu)'));
 });
 await check('settings.sameNodePreferencesAndListenersAcrossMenuAndGame',()=>{
  const r=boot(),settings=node(r,'settingsOverlay');tap(r,'menuSettings');
  const language=node(r,'languageSelect');language.value='ru';language.dispatchEvent({type:'change'});
  const mode=node(r,'controlModeSelect');mode.value='MOBILE';mode.dispatchEvent({type:'change'});
  const volume=node(r,'soundVolume');volume.value='31';volume.dispatchEvent({type:'input'});
  const listeners=[language.listeners.change.length,mode.listeners.change.length,volume.listeners.input.length];
  tap(r,'closeSettings');assert.equal(r.scheduler.rafRequests,0);
  tap(r,'menuNew');tap(r,node(r,'mainMenuSlots').children[0]);tap(r,'settingsButton');
  assert.equal(node(r,'settingsOverlay'),settings);assert.ok(settings.classList.contains('open'));
  assert.equal(r.doc.querySelectorAll('#settingsOverlay').length,1);
  assert.equal(language.value,'ru');assert.equal(mode.value,'MOBILE');assert.equal(volume.value,'31');
  assert.equal(r.eval('masterVolume'),.31);assert.equal(r.storage.get('base_sound'),'31');
  assert.deepEqual([language.listeners.change.length,mode.listeners.change.length,volume.listeners.input.length],listeners);
  tap(r,'closeSettings');assert.equal(r.eval('menuOpen'),false);assert.equal(r.scheduler.rafRequests,1);
  const reopened=boot({},Object.fromEntries(r.storage));tap(reopened,'menuSettings');
  assert.equal(node(reopened,'languageSelect').value,'ru');assert.equal(node(reopened,'controlModeSelect').value,'MOBILE');
  assert.equal(node(reopened,'soundVolume').value,'31');assert.equal(reopened.scheduler.rafRequests,0);
 });
 await check('settings.controlEditorWorksBeforeLaunchAndReturnsToSameSettings',()=>{
  const r=boot(phone);tap(r,'menuSettings');assert.ok(!node(r,'openControlSettings').classList.contains('requires-game'));
  tap(r,'openControlSettings');assert.ok(node(r,'controlOverlay').classList.contains('open'));
  assert.ok(!node(r,'settingsOverlay').classList.contains('open'));
  r.eval("editingLayout.move={x:.27,y:.72}");tap(r,'saveControls');
  const stored=r.storage.get('base_controls_068');assert.ok(stored);tap(r,'backControls');
  assert.ok(node(r,'settingsOverlay').classList.contains('open'));tap(r,'closeSettings');
  assert.ok(r.eval('MainMenu.active&&menuOpen'));assert.equal(r.scheduler.rafRequests,0);
  assert.equal([...r.storage.keys()].filter(k=>k.startsWith('survival_base_v09_slot_')).length,0);
  tap(r,'menuNew');tap(r,node(r,'mainMenuSlots').children[0]);assert.equal(r.storage.get('base_controls_068'),stored);
 });
 await check('fullscreen.telegramPhoneStartsAtMenuOnlyOnce',()=>{
  let calls=0;const app={platform:'android',isVersionAtLeast:()=>true,requestFullscreen(){calls++}};
  const r=boot({...phone,beforeScripts:s=>{s.Telegram={WebApp:app}}});
  assert.equal(calls,1);assert.equal(r.scheduler.rafRequests,0);tap(r,'menuSettings');tap(r,'closeSettings');
  tap(r,'menuNew');tap(r,node(r,'mainMenuSlots').children[0]);r.flushTimers(1000);assert.equal(calls,1);
  tap(r,'settingsButton');tap(r,'fullscreenButton');assert.equal(calls,2);
 });
 await check('fullscreen.telegramAlreadyFullscreenDoesNotRequestAgain',()=>{
  let calls=0;const r=boot({...phone,beforeScripts:s=>{s.Telegram={WebApp:{platform:'ios',isFullscreen:true,requestFullscreen(){calls++}}}}});
  tap(r,'menuSettings');tap(r,'fullscreenButton');assert.equal(calls,0);
 });
 await check('fullscreen.browserWaitsForFirstTapNoDoubleCommand',async()=>{
  let calls=0,receiver=null;const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=function(){receiver=this;calls++;return Promise.resolve()}}});
  assert.equal(calls,0);tap(r,'menuSettings');assert.equal(calls,1);assert.equal(receiver,r.doc.documentElement);
  assert.ok(node(r,'settingsOverlay').classList.contains('open'));await tick();tap(r,'closeSettings');tap(r,'menuNew');
  assert.equal(calls,1);assert.equal(node(r,'mainMenuSlots').children.length,5);assert.equal(r.scheduler.rafRequests,0);
 });
 await check('fullscreen.pendingRequestDeduplicatedAndDenialCanBeRetriedManually',async()=>{
  let calls=0,reject;const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=()=>{calls++;return new Promise((_,bad)=>{reject=bad})}}});
  tap(r,'menuSettings');tap(r,'fullscreenButton');assert.equal(calls,1);
  reject(Error('Permission denied'));await tick();assert.deepEqual(r.errors,[]);assert.ok(r.eval('MainMenu.active'));
  r.doc.documentElement.requestFullscreen=()=>{calls++;return Promise.resolve()};tap(r,'fullscreenButton');await tick();assert.equal(calls,2);
 });
 await check('fullscreen.syncFailureDoesNotBlockNewGame',()=>{
  const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=()=>{throw Error('denied')}}});
  tap(r,'menuNew');tap(r,node(r,'mainMenuSlots').children[0]);assert.equal(r.scheduler.rafRequests,1);assert.deepEqual(r.errors,[]);
 });
 await check('fullscreen.unsupportedPhoneKeepsMenuAndSettingsUsable',()=>{
  const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=undefined}});
  tap(r,'menuSettings');tap(r,'fullscreenButton');assert.ok(node(r,'settingsOverlay').classList.contains('open'));
  tap(r,'closeSettings');tap(r,'menuLoad');assert.equal(node(r,'mainMenuSlots').children.length,5);assert.deepEqual(r.errors,[]);
 });
 await check('fullscreen.browserSDKDoesNotMasqueradeAsTelegram',()=>{
  let native=0,browser=0;const r=boot({...phone,beforeScripts:s=>{s.Telegram={WebApp:{platform:'unknown',initData:'',requestFullscreen(){native++}}};s.document.documentElement.requestFullscreen=()=>{browser++;return Promise.resolve()}}});
  assert.equal(native,0);tap(r,'menuSettings');assert.equal(native,0);assert.equal(browser,1);
 });
 await check('fullscreen.oldTelegramFallsBackToBrowserOnTap',()=>{
  let native=0,browser=0;const r=boot({...phone,beforeScripts:s=>{s.Telegram={WebApp:{platform:'android',isVersionAtLeast:()=>false,requestFullscreen(){native++}}};s.document.documentElement.requestFullscreen=()=>{browser++;return Promise.resolve()}}});
  assert.equal(browser,0);assert.equal(native,0);tap(r,'menuSettings');assert.equal(browser,1);assert.equal(native,0);
 });
 await check('fullscreen.desktopSmallViewportIsNotAReasonToForceFullscreen',()=>{
  let calls=0;const r=boot({width:360,height:640,beforeScripts:s=>{s.document.documentElement.requestFullscreen=()=>{calls++;return Promise.resolve()}}});
  tap(r,'menuSettings','mouse');assert.equal(calls,0);tap(r,'fullscreenButton','mouse');assert.equal(calls,1);
 });
 await check('fullscreen.touchscreenLaptopMouseDoesNotAutomaticallyEnter',()=>{
  let calls=0;const r=boot({maxTouchPoints:10,media:{'(pointer: fine)':true},beforeScripts:s=>{s.document.documentElement.requestFullscreen=()=>{calls++;return Promise.resolve()}}});
  tap(r,'menuSettings','mouse');assert.equal(calls,0);
 });
 await check('fullscreen.exitNeverTriggersBrowserFullscreen',()=>{
  let calls=0;const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=()=>{calls++;return Promise.resolve()}}});
  tap(r,'menuExit');assert.equal(calls,0);assert.ok(r.eval('MainMenu.active'));
 });
 await check('fullscreen.webkitAndPolicyDisabledHandled',async()=>{
  let calls=0;const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=undefined;s.document.documentElement.webkitRequestFullscreen=()=>{calls++;return Promise.resolve()}}});
  tap(r,'menuSettings');await tick();assert.equal(calls,1);r.doc.fullscreenEnabled=false;tap(r,'fullscreenButton');assert.equal(calls,1);
 });
 await check('fullscreen.phoneManualPCModeStillUsesDeviceCapabilities',()=>{
  let calls=0;const r=boot({...phone,beforeScripts:s=>{s.document.documentElement.requestFullscreen=()=>{calls++;return Promise.resolve()}}});
  r.eval("GameInput.setMode('PC')");tap(r,'menuSettings','mouse');assert.equal(calls,1);
 });
 await check('layout.halfAreaWithoutShrinkingSlotAndSettingsControls',()=>{
  const css=fs.readFileSync('styles/main-menu.css','utf8'),root=css.match(/:root\{([^}]+)\}/)[1],portrait=css.match(/@media\(orientation:portrait\)\{:root\{([^}]+)\}/)[1];
  const value=(s,key)=>Number(s.match(new RegExp('--'+key+':([\\d.]+)'))[1]);
  const pcArea=(value(root,'menu-ui-width')-48)/5*value(root,'menu-home-button-height');
  const mobileRatio=value(portrait,'menu-ui-width')/58*value(portrait,'menu-home-button-height')/44;
  assert.ok(pcArea/((900-48)/5*48)>.45&&pcArea/((900-48)/5*48)<.55);
  assert.ok(mobileRatio>.45&&mobileRatio<.55);
  assert.equal(value(root,'menu-button-height'),48);assert.equal(value(portrait,'menu-button-height'),44);
  assert.ok(css.includes('#mainMenuButtons>button::after'));assert.ok(css.includes('inset:-6px 0'));
  assert.ok(value(portrait,'menu-home-button-height')+12>=44);assert.ok(value(portrait,'menu-button-gap')>=12);
 });
 const result={version:require('../package.json').version,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks,limitations:['DOM topology and CSS contract checks; no browser compositor or physical phone measurement. Fullscreen APIs are mocked.']};
 fs.writeFileSync('qa/results/menu-preferences.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
