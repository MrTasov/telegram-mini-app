/* UI capture is not simulation pause. Explicit pause reasons are transient. */
window.GameFlow=(()=>{
  const reasons=new Set();
  return Object.freeze({
    get paused(){return reasons.size>0||!GameState.session.ready||!!window.MainMenu?.active||playerDead||document.hidden;},
    pause(reason='explicit'){reasons.add(reason);window.GameGathering?.resetTiming();stopControls(true);},
    resume(reason='explicit'){reasons.delete(reason);window.GameGathering?.resetTiming();},
    get reasons(){return [...reasons];}
  });
})();
/* Actions own movement compatibility, not windows or individual input devices. */
window.GameMovement=(()=>{
  const stationary=new Set(['tree','ore09','search','bunker','surface','living_bed','living_shower','fishing0121','repair018','shortcut10']);
  const policy=Object.freeze({MOVE:false,INTERACT:true,AIM:true,FIRE:true,RELOAD:true,SELECT_SLOT:true,WORLD_TARGET:true,INVENTORY:true,MAP:true,SETTINGS:true,SNEAK:true});
  const canMoveWhileActive=(type,target)=>type==='INTERACT'?(target?.kind==='search'&&target.ref?.searched||!stationary.has(target?.kind)):policy[type]!==false;
  function begin(type,target){if(!canMoveWhileActive(type,target)){
    window.V014Controls?.stopRoute();cancelNavigation();
    // Stop the movement gesture without restarting an already active channel.
    objectPointer=null;leftPointerId=null;player.moving=player.running=false;
    centerJoystickKnob(moveStick);stopFootsteps();window.V010Camera?.resetTouch();
  }}
  function openUI(){
    // Release combat capture, but retain both commanded routes and a held left
    // stick. Pointer-up still releases that stick even over a modal.
    window.GameInput?.release();firing=false;rightAimActive=false;aimPower=0;rightPointerId=null;centerJoystickKnob(aimStick);
  }
  function parallelTarget(x,y){const target=hitInteraction(x,y);return target&&canMoveWhileActive('INTERACT',target)&&canInteract(target,player.x,player.y)?target:null;}
  return Object.freeze({policy,canMoveWhileActive,begin,openUI,parallelTarget});
})();
