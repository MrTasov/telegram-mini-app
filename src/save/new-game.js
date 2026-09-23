/* C1 keeps the normal new-game template intact. Only this explicit preview
   factory applies the draft, always to a fresh private copy, never an old slot. */
window.GameNewGame=(()=>{
  const create=()=>GameSave.newGameData();
  function previewBootstrap(){
    const d=create(),preset=CampaignBootstrap;
    for(const change of preset.damage){
      if(GameRecovery.classify(change.id)?.mode!=='recoverable')throw Error('Protected bootstrap target');
      const saved=d.base015.sections.find(s=>s.id===change.id)||d.building018.doors.find(s=>s.id===change.id);
      if(!saved)throw Error('Missing bootstrap target');saved.hp=change.hp;
    }
    // Guaranteed tool, fuel and raw stone break the hammer/furnace/repair cycle.
    // Farm and animal state remains dormant and unchanged even in this draft.
    d.bag=clone(preset.starterKit);for(let i=0;i<8;i++)d.storage[i].items=[];
    d.v09.power.running=false;d.v09.power.fuel=0;d.v010.modules.energy.battery.charge=0;d.v010.modules.energy.battery.enabled=true;
    for(const id of Object.keys(d.v09.power.deviceEnabled))d.v09.power.deviceEnabled[id]=preset.enabledDevices.includes(id);
    for(const id of Object.keys(d.v09.power.roomEnabled))d.v09.power.roomEnabled[id]=true;
    for(const door of d.v09.power.doors){door.open=0;door.manual=false;door.away=0;}
    d.player.scene='bunker';Object.assign(d.player,BunkerLayout.arrivals[0]);
    d.v091.fortress.wallLevel=false;d.v091.fortress.x=d.player.x;d.v091.fortress.y=d.player.y;
    return d;
  }
  return Object.freeze({create,previewBootstrap,preset:CampaignBootstrap});
})();
