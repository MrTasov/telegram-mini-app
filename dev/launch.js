(()=>{
  if(window.LastBaseDeveloper?.isolated!==true){document.body.textContent='Developer mode stopped: save isolation unavailable. Open index.html for the normal game.';return;}
  const game=document.createElement('script');game.src='js/game.js';
  game.onload=()=>{const panel=document.createElement('script');panel.src='dev/panel.js';document.body.append(panel);};
  game.onerror=()=>{document.body.textContent='Developer game could not load. Reload dev.html.';};
  document.body.append(game);
})();

