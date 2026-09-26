/* Stage 2: one directory of state owners, never a second copy of game state.
   Legacy domain modules retain their mutable objects and their own commands.
   Live getters also cover containers replaced during restore/transfer. */
const GameState=(()=>{
  const owners=new Map();
  let sealed=false;
  const session={ready:false,blocked:false,timer:null,lastVerified:null,
    activeSlot:null,name:'',transaction:false,dirty:false};
  owners.set('session',Object.freeze({id:'session',source:'state/owners.js',saved:Object.freeze([]),
    transient:Object.freeze(['ready','blocked','timer','lastVerified','activeSlot','name','transaction','dirty'])}));
  const api={session,
    register(id,view,contract){
      if(sealed||owners.has(id)||Object.hasOwn(api,id))throw Error('Duplicate or late state owner: '+id);
      if(!/^[a-z][a-zA-Z]*$/.test(id)||!view||!contract?.source)throw Error('Invalid state owner');
      const record=Object.freeze({id,source:contract.source,
        saved:Object.freeze([...(contract.saved||[])]),transient:Object.freeze([...(contract.transient||[])])});
      owners.set(id,record);
      Object.defineProperty(api,id,{value:Object.freeze(view),enumerable:true});
      return view;
    },
    describe(){return [...owners.values()].map(v=>({...v,saved:[...v.saved],transient:[...v.transient]}));},
    seal(){sealed=true;Object.seal(session);Object.freeze(api);}
  };
  return api;
})();
window.GameState=GameState;

// Compatibility for existing diagnostic scripts. Production code uses the
// session owner directly; these aliases never keep separate state.
for(const [legacy,key] of Object.entries({gameSaveReady:'ready',gameSaveBlocked:'blocked',
  gameSaveTimer:'timer',lastVerifiedGameSave:'lastVerified',v09ActiveSlot:'activeSlot',
  v091SaveName:'name',v09SaveTransaction:'transaction'})){
  Object.defineProperty(window,legacy,{get:()=>GameState.session[key],
    set:value=>{GameState.session[key]=value;},configurable:false});
}
