/* Team discoveries/access; camera, pins and media remain client-owned.
   Survey coordinates come from the authority's actor port, never a payload. */
const ExplorationDomain=(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  function validateDefinitions(d){
    if(d?.schema!==1||d.revision!==1||!Array.isArray(d.sectors)||!d.sectors.length||d.sectors.length>128||!Array.isArray(d.sites)||d.sites.length>256)throw Error('Invalid exploration definitions');
    const ids=new Set();for(const [prefix,list]of [['sector',d.sectors],['site',d.sites]])for(const v of list){if(!new RegExp('^'+prefix+'\\.[a-z][a-z0-9_]{0,63}$').test(v.id)||ids.has(v.id))throw Error('Invalid exploration ID');ids.add(v.id);}
    for(const s of d.sectors){GameConditions.validate(s.requires,d.facts);if(!s.title||!Array.isArray(s.neighbors)||new Set(s.neighbors).size!==s.neighbors.length||s.neighbors.some(id=>!d.sectors.some(s=>s.id===id)))throw Error('Invalid sector links');}
    for(const s of d.sites){if(!d.sectors.some(v=>v.id===s.sectorId)||!s.sourceId||!s.title||!s.buildingId)throw Error('Invalid exploration site');GameConditions.validate(s.hint,d.facts);}
    if(!ids.has('sector.home'))throw Error('Missing home');return true;
  }
  function create(d,ports){
    validateDefinitions(d);const sectors=d.sectors.map(s=>s.id),sites=d.sites.map(s=>s.id),listeners=new Set();let state,epoch=0;
    const access=f=>d.sectors.filter(s=>GameConditions.evaluate(s.requires,f).available).map(s=>s.id);
    function fresh(profile='new',seed={}){if(!['new','legacy'].includes(profile))throw Error('Invalid exploration profile');const known=['sector.home',...d.sectors[0].neighbors,...(seed.known||[])];return {schema:1,contentRevision:d.revision,profile,known:[...new Set(known)],visited:[...new Set(seed.visited||[])],sites:[],access:profile==='legacy'?[...sectors]:access({'world.open':true}),commands:{revision:0,receipts:[]}};}
    const changed=()=>{epoch++;ports.changed?.();for(const fn of listeners)fn();};
    function allowed(id){return state.access.includes(id);}
    const commands=EquipmentCommands.create({get:id=>id===d.worldId?{id}:null},{actor:ports.actor,authorized:ports.authorized,access:()=>true,
      perform(c,a){if(c.action!=='survey'||!c.payload||Object.keys(c.payload).length)return {ok:false,reason:'exploration.error.command'};
        const observation=ports.observe(a);if(!observation)return {ok:false,reason:'exploration.error.access'};
        const known=new Set(state.known),visited=new Set(state.visited),found=new Set(state.sites),opened=new Set(state.access);
        for(const id of access(ports.facts()))opened.add(id);
        for(const id of observation.known||[])if(sectors.includes(id))known.add(id);
        for(const id of observation.visited||[])if(sectors.includes(id)&&opened.has(id)){known.add(id);visited.add(id);for(const neighbor of d.sectors.find(s=>s.id===id).neighbors)known.add(neighbor);}
        for(const id of observation.sites||[]){const site=d.sites.find(s=>s.id===id);if(site&&opened.has(site.sectorId)){found.add(id);known.add(site.sectorId);}}
        const delta={known:[...known].filter(id=>!state.known.includes(id)),visited:[...visited].filter(id=>!state.visited.includes(id)),sites:[...found].filter(id=>!state.sites.includes(id)),access:[...opened].filter(id=>!state.access.includes(id))};
        if(Object.values(delta).every(v=>!v.length))return {ok:false,reason:'exploration.no_change'};
        Object.assign(state,{known:[...known],visited:[...visited],sites:[...found],access:[...opened]});return {ok:true,...delta};
      },changed});state=fresh(ports.initialProfile||'legacy');
    function validate(s,facts=ports.facts()){
      const fail=()=>{throw Error('Invalid exploration save');};
      if(!s||Object.keys(s).sort().join()!=='access,commands,contentRevision,known,profile,schema,sites,visited'||s.schema!==1||s.contentRevision!==d.revision||!['new','legacy'].includes(s.profile))fail();
      const list=(a,ids)=>Array.isArray(a)&&a.length<=ids.length&&new Set(a).size===a.length&&a.every(id=>ids.includes(id));
      if(!list(s.known,sectors)||!list(s.visited,sectors)||!list(s.sites,sites)||!list(s.access,sectors)||!s.known.includes('sector.home')||s.visited.some(id=>!s.known.includes(id)||!s.access.includes(id))||s.sites.some(id=>!s.known.includes(d.sites.find(p=>p.id===id).sectorId)||!s.access.includes(d.sites.find(p=>p.id===id).sectorId)))fail();
      if(s.profile==='legacy'?!same(s.access,sectors):s.access.some(id=>!access(facts).includes(id)))fail();
      commands.validate(s.commands);if(Object.keys(s.commands).sort().join()!=='receipts,revision'||s.commands.receipts.length!==Math.min(128,s.commands.revision))fail();
      const receiptIds={known:new Set(),visited:new Set(),sites:new Set(),access:new Set()};
      for(const r of s.commands.receipts){let sig;try{sig=JSON.parse(r.signature);}catch{fail();}if(!Array.isArray(sig)||sig[0]!==d.worldId||sig[1]!=='survey'||!sig[2]||Object.keys(sig[2]).length||sig[3]!==r.revision-1||!['known','visited','sites','access'].some(key=>r.result[key]?.length))fail();for(const [key,ids]of [['known',sectors],['visited',sectors],['sites',sites],['access',sectors]]){if(!list(r.result[key],ids)||r.result[key].some(id=>!s[key].includes(id)||receiptIds[key].has(id)))fail();for(const id of r.result[key])receiptIds[key].add(id);}}
      return true;
    }
    return Object.freeze({fresh,validate,execute:commands.execute,capture:()=>({...copy(state),commands:commands.capture()}),
      restore(s,facts){validate(s,facts);state=copy(s);commands.restore(s.commands);epoch++;},
      known:id=>state.known.includes(id),visited:id=>state.visited.includes(id),siteKnown:id=>state.sites.includes(id),allowed,
      get epoch(){return epoch;},get revision(){return commands.revision;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
  }
  return Object.freeze({create,validateDefinitions});
})();
