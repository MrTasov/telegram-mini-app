/* Ordered save adapters. next() preserves each existing pre/post operation,
   including finally blocks and the historical migration order. Gameplay tick
   and draw chains are intentionally outside the scope of this migration. */
const GameSave=(()=>{
  const phases={capture:[],decode:[],restore:[]};
  const roots={},chains={};
  const modules={};
  const moduleOrder=Object.freeze(['world','inventory','craft','combat','energy','progression','camera']);
  const validated=new WeakMap();
  let sealed=false,restoring=false,newGameTemplate=null;
  function setBase(phase,fn){
    if(sealed||!phases[phase]||roots[phase]||typeof fn!=='function')throw Error('Invalid save root: '+phase);
    roots[phase]=chains[phase]=fn;
  }
  function extend(phase,id,fn){
    const steps=phases[phase];
    if(sealed||!steps||!chains[phase]||steps.some(s=>s.id===id)||typeof fn!=='function')throw Error('Duplicate or late save adapter: '+phase+'/'+id);
    const previous=chains[phase];
    steps.push({id,fn});
    chains[phase]=(...args)=>fn(previous,...args);
  }
  function capture(){const data=chains.capture();data.identity027=GameIdentity.capture();return SaveFormat.stamp(data);}
  function decode(raw){
    const migration={};
    const prepared=SaveFormat.prepare(raw,migration),incoming=JSON.parse(prepared).equipment032;
    const data=GameEquipment.withValidation(incoming.instances,()=>SaveFormat.stamp(chains.decode(prepared)));
    // Identity migration follows historical owner migrations, which can expand
    // the enemy array. Validation is still complete before touching live state.
    SaveFormat.complete(data,migration.sourceVersion);GameIdentity.validate(data);window.GameActivitySave?.validate(data);
    validated.set(data,JSON.stringify(data));return data;
  }
  function registerModule(id,system){
    if(sealed||!moduleOrder.includes(id)||Object.hasOwn(modules,id)||
      !['capture','validate','restore'].every(k=>typeof system?.[k]==='function'))throw Error('Invalid save subsystem: '+id);
    modules[id]=system;return system;
  }
  function snapshotModules(){return Object.fromEntries(moduleOrder.filter(id=>modules[id]).map(id=>[id,modules[id].capture()]));}
  function newGameData(){
    if(!newGameTemplate)throw Error('New-game template is not ready');
    const data=JSON.parse(JSON.stringify(newGameTemplate));
    data.savedAt=Date.now();data.saveName='';return data;
  }
  function restore(data){
    if(restoring)throw Error('Reentrant game restore');
    // Validate a private copy before any restorer changes the live world. The
    // caller's object is never a mutable backing store for the loaded game.
    const raw=JSON.stringify(data);
    // decode -> restore is the common path. Reuse validation only for the
    // identical object with identical serialized contents; any edit revalidates.
    // Weak keys do not retain slot previews or imports after callers release them.
    const prepared=validated.get(data)===raw?JSON.parse(raw):decode(raw);
    const was=GameState.session.transaction;
    window.GameAudio?.reset();
    restoring=true;GameState.session.transaction=true;
    try{return chains.restore(prepared);}
    finally{GameState.session.transaction=was;restoring=false;}
  }
  function describe(){return Object.fromEntries(Object.entries(phases).map(([phase,steps])=>[phase,steps.map(s=>s.id)]));}
  function seal(expected){
    if(sealed)throw Error('Save registry is already sealed');
    if(!Object.keys(phases).every(phase=>roots[phase]&&JSON.stringify(describe()[phase])===JSON.stringify(expected[phase])))throw Error('Save adapter order changed');
    if(!moduleOrder.every(id=>Object.hasOwn(modules,id)))throw Error('Missing save subsystem');
    // Capture once, after all owners/devices exist and before loading any slot.
    // The old partial template remains solely for historical migrations.
    newGameTemplate=JSON.parse(JSON.stringify(capture()));
    sealed=true;
    for(const steps of Object.values(phases))Object.freeze(steps);
    Object.freeze(modules);
    Object.freeze(api);
  }
  const api={setBase,extend,capture,decode,restore,describe,seal,modules,moduleOrder,registerModule,snapshotModules,newGameData,get restoring(){return restoring;}};
  return api;
})();
window.GameSave=GameSave;

// Stable compatibility entry points for existing UI and gameplay callers.
function captureGameProgress(){return GameSave.capture();}
function decodeGameProgress(raw){return GameSave.decode(raw);}
function restoreGameProgress(data){return GameSave.restore(data);}
