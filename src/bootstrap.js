let gameplayStarted=false;
function startSelectedGame(){
if(gameplayStarted)return;
gameplayStarted=true;GameState.session.ready=true;
grantStarterItems();
renderQuickSlots();
if(starterPending.length)message('Освободите место в рюкзаке: предметы обновления ждут выдачи');
el("saveGameButton").addEventListener("click",()=>saveGameProgress(true));
// Capture complete UI transactions after all item transfers have finished.
document.addEventListener("click",queueGameSave);
window.addEventListener("pointerup",queueGameSave);
window.addEventListener("pagehide",()=>{stopControls(true);flushGameSave();});
window.addEventListener("beforeunload",()=>flushGameSave());
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){stopControls(true);flushGameSave();}else{V09World.tickMining();updateChop();queueGameSave();}
});
// Continuous world timers/position also become dirty; never serialize on this pulse.
setInterval(()=>{if(!document.hidden&&!GameFlow.paused)queueGameSave();},5000);
updateAmmoHud();

/* =====================================================
   START
===================================================== */

/*
  Всё важное уже создано ВЫШЕ.
  Только теперь запускается Canvas.
*/

resizeCanvas();

applyControls();

updateCamera();

console.log("0.8: equipment, interactions, navigation and safe base");

gameLoop();

// Fullscreen is requested by the start screen or the shared Settings button.
}

resizeCanvas();applyControls();
MainMenu.mount(startSelectedGame);


// 0.6.18: direct canvas farm taps removed; contextual action button is used instead.

// 0.6.22 — FARM MENU BUTTONS.
// Important: these handlers must live INSIDE the script tag.
window.activeFarmBed = null;

window.V0141Farm.bindMenu();

el("farmClose").addEventListener("click", function(e){
  e.preventDefault();
  e.stopPropagation();
  closeOverlay(el("farmOverlay"));
});
