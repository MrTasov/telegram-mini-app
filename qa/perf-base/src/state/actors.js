/* One live actor today. These views do not copy inventories or simulation state.
   Client selection is separate from the actor ID; adding remote actors and their
   combat/inventory runtimes belongs to the future multiplayer implementation. */
window.GameActors=(()=>{
  Object.defineProperties(player,{
    instanceId:{get:()=>GameIdentity.playerId},typeId:{value:'player'}
  });
  const local=Object.freeze({
    get id(){return player.instanceId;},typeId:'player',
    get entity(){return player;},get dead(){return playerDead;},get scene(){return scene;},
    get inventory(){return GameState.inventory;},get combat(){return GameState.combat;}
  });
  return Object.freeze({get local(){return local;},get localId(){return local.id;},
    get:id=>id===local.id?local:null,list:()=>[local]});
})();

