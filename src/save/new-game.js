/* Only an explicit New Game applies C2. Continue/import/migration never call
   this factory. The C1 feasibility fixture remains available to historical QA. */
window.GameNewGame=(()=>{
  function apply(preset){
    const d=GameSave.newGameData();
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
  function create(){
    const d=apply(ChapterOnePreset);
    d.storage[0].items=clone(ChapterOnePreset.supplies);
    d.campaign031=GameCampaign.freshChapterOne();d.chapter034=GameChapterOne.fresh(true);
    // Preserve the existing starting weapon/axe/remote and statless backpack.
    // C2 adds no flashlight entitlement, hidden recipe grants or extra instances.
    return d;
  }
  const previewBootstrap=()=>apply(CampaignBootstrap);
  return Object.freeze({create,previewBootstrap,preset:CampaignBootstrap});
})();
