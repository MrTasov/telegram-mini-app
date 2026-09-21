/* =====================================================
   RESIZE
===================================================== */

function refreshViewport(){
  resizeCanvas();
  applyControls();
  updateCamera();
}

window.addEventListener("resize",refreshViewport);

window.addEventListener("orientationchange",function(){
  refreshViewport();
  setTimeout(refreshViewport,80);
  setTimeout(refreshViewport,180);

  setTimeout(function(){
    fullscreen();
    refreshViewport();
  },420);

  setTimeout(refreshViewport,750);
});

if(window.visualViewport){
  window.visualViewport.addEventListener("resize",refreshViewport);
}

try{
  if(tg && tg.onEvent){
    tg.onEvent("viewportChanged",refreshViewport);
    tg.onEvent("safeAreaChanged",refreshViewport);
    tg.onEvent("contentSafeAreaChanged",refreshViewport);
  }
}catch(e){}


/* =====================================================
   PREVENT TELEGRAM SWIPE
===================================================== */

document.addEventListener(
  "touchmove",
  function(e){

    if(
      !e.target.closest(
        ".panel"
      )
    ){

      e.preventDefault();

    }

  },
  {
    passive:false
  }
);

/* =====================================================
   UPDATE
===================================================== */

function updateTrees(){
  if(GameFlow.paused)return;
  for(const t of worldTrees){
    if(!t.felled||t.wood>0)continue;
    t.regrowMs=Math.max(0,t.regrowMs-16.667*frameScale);
    if(t.regrowMs>0)continue;
    const occupants=[...(scene==='surface'?[player]:[]),...zombies.filter(z=>z.alive)];
    if(occupants.some(p=>distance(p.x,p.y,t.x,t.y)<t.r+p.radius+4))continue;
    t.felled=false;t.wood=GameplayBalance.resources.treeWood;invalidateGeometry();queueGameSave();
  }
}
function update(){
  updatePointerFollow();
  updateTrees();
  grantStarterItems();
  updatePlayer();
  updateChop();
  updateFeedCraft();
  updateLivestockProduction();
  updateLivestockAnimals();
  updateLivestockAudio();
  stopInvalidZombieAudio();

  updateBullets();

  updateZombies();

  updateAction();

  updateSearch();

  updateCamera();

}

/* =====================================================
   DRAW
===================================================== */

function draw(){

  ctx.clearRect(
    0,
    0,
    screenWidth,
    screenHeight
  );

  ctx.save();

  ctx.translate(
    -camera.x,
    -camera.y
  );

  if(scene === "surface"){

    drawSurface();

  }else{

    drawBunker();

  }

  if(scene === "surface"){

    for(const zombie of zombies){
      drawZombie(zombie);
    }

  }

  drawFlashlight();
  drawNavigationTarget();
  drawBullets();
  drawPlayer();

  ctx.restore();

}

/* =====================================================
   GAME LOOP
===================================================== */

let lastFrameAt=0;
function gameLoop(timestamp=performance.now()){
  frameScale=lastFrameAt?clamp((timestamp-lastFrameAt)/16.667,.1,3):1;
  lastFrameAt=timestamp;
  window.GameInput?.refreshAim();
  updateFootstepsAudio();


  if(rightAimActive && aimPower>JOY_DEAD && firing && !menuOpen && !playerDead){
    shoot();
  }


  if(document.hidden){
    requestAnimationFrame(gameLoop);
    return;
  }


  try{

    if(!GameFlow.paused)update();
    draw();

  }catch(error){

    console.error(
      "Game loop error:",
      error
    );

  }

  requestAnimationFrame(
    gameLoop
  );

}
