/* Pure campaign authority. Packets, data, completion and capability receipts
   have one owner. UI, bag capacity, clocks and render ticks cannot grant rights. */
const ResearchDomain=(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v)),MAX_DATA=1000000000;
  const ids=a=>a.map(v=>v.id),same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  function validateDefinitions(d){
    if(!d||d.revision!==1||!Array.isArray(d.categories)||!d.categories.length)throw Error('Invalid research definitions');
    const seen=new Set();for(const [kind,list]of [['blueprint',d.blueprints],['technology',d.technologies],['research',d.research],['source',d.sources]]){
      if(!Array.isArray(list)||list.length>256)throw Error('Invalid definition list');
      for(const v of list){if(!v||!new RegExp('^'+kind+'\\.[a-z][a-z0-9_]{0,63}$').test(v.id)||seen.has(v.id))throw Error('Duplicate or invalid definition ID');seen.add(v.id);}
    }
    const facts=[...d.facts,...seen],blueprints=ids(d.blueprints),technologies=ids(d.technologies),research=ids(d.research);
    const unique=(a,allowed)=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(id=>allowed.includes(id));
    if(!unique(d.legacyEntitlements,technologies))throw Error('Invalid legacy entitlement');
    const techOwner=new Map();
    for(const r of d.research){if(!d.categories.includes(r.category)||!Number.isSafeInteger(r.cost)||r.cost<1||r.cost>MAX_DATA||!unique(r.blueprints,blueprints)||!unique(r.technologies,technologies)||!r.technologies.length)throw Error('Invalid research requirements');GameConditions.validate(r.requires,facts);for(const id of r.technologies){if(techOwner.has(id))throw Error('Technology has two owners');techOwner.set(id,r.id);}}
    if(techOwner.size!==technologies.length)throw Error('Unreachable technology');
    for(const s of d.sources){if(!Number.isSafeInteger(s.data)||s.data<0||s.data>MAX_DATA||!unique(s.blueprints,blueprints)||!s.data&&!s.blueprints.length)throw Error('Invalid research source');GameConditions.validate(s.requires,facts);}
    if(d.sources.reduce((n,s)=>n+s.data,0)>MAX_DATA)throw Error('Research source budget overflow');
    for(const bp of blueprints)if(!d.sources.some(s=>s.blueprints.includes(bp)))throw Error('Unreachable blueprint');
    for(const group of Object.values(d.bindings))for(const c of Object.values(group))GameConditions.validate(c,facts);
    if(Object.values(d.legacyBindings).some(id=>!technologies.includes(id)))throw Error('Unknown legacy binding');
    const deps=c=>c.all||c.any?(c.all||c.any).flatMap(deps):[c.fact];
    const graph=new Map(d.research.map(r=>[r.id,[...deps(r.requires).map(id=>techOwner.get(id)||id).filter(id=>research.includes(id)),...r.blueprints.flatMap(bp=>d.sources.filter(s=>s.blueprints.includes(bp)).map(s=>s.id))]]));
    for(const s of d.sources)graph.set(s.id,deps(s.requires).map(id=>techOwner.get(id)||id).filter(id=>research.includes(id)||ids(d.sources).includes(id)));
    const active=new Set(),done=new Set();function visit(id){if(active.has(id))throw Error('Research dependency cycle');if(done.has(id))return;active.add(id);for(const next of graph.get(id)||[])visit(next);active.delete(id);done.add(id);}for(const id of graph.keys())visit(id);
    // All required research must be attainable from the supplied finite sources.
    // External facts are granted here only for structural reachability testing.
    const reachable=Object.fromEntries(d.facts.map(id=>[id,true]));for(const id of seen)reachable[id]=false;let changed=true;
    while(changed){changed=false;for(const s of d.sources)if(!reachable[s.id]&&GameConditions.evaluate(s.requires,reachable).available){reachable[s.id]=true;for(const bp of s.blueprints)reachable[bp]=true;changed=true;}for(const r of d.research)if(!reachable[r.id]&&r.blueprints.every(id=>reachable[id])&&GameConditions.evaluate(r.requires,reachable).available){reachable[r.id]=true;r.technologies.forEach(id=>reachable[id]=true);changed=true;}}
    if(research.some(id=>!reachable[id]))throw Error('Unreachable research');
    return true;
  }
  function create(d,ports){
    validateDefinitions(d);const byResearch=new Map(d.research.map(v=>[v.id,v])),bySource=new Map(d.sources.map(v=>[v.id,v]));
    let state,epoch=0;const listeners=new Set();
    function fresh(profile='new'){if(!['new','legacy'].includes(profile))throw Error('Invalid research profile');return {schema:1,contentRevision:d.revision,profile,data:0,completed:[],blueprints:[],technologies:[],legacyEntitlements:profile==='legacy'?[...d.legacyEntitlements]:[],packets:[],unlocks:unlocks(profile==='legacy'?d.legacyEntitlements:[]),commands:{revision:0,receipts:[]}};}
    function unlocks(techs){const all=d.technologies.filter(t=>techs.includes(t.id));return Object.fromEntries(['buildables','recipes','droneModules'].map(k=>[k,[...new Set(all.flatMap(t=>t[k]||[]))].sort()]));}
    function facts(external=ports.facts(),saved=state){
      const f={...external,'campaign.legacy_world':saved.profile==='legacy'};
      for(const r of d.research)f[r.id]=saved.completed.includes(r.id);
      for(const b of d.blueprints)f[b.id]=saved.blueprints.includes(b.id);
      for(const t of d.technologies)f[t.id]=saved.technologies.includes(t.id)||saved.legacyEntitlements.includes(t.id);
      for(const s of d.sources)f[s.id]=saved.packets.some(p=>p.sourceId===s.id&&p.status==='submitted');return f;
    }
    function availability(id,external){const r=byResearch.get(id);if(!r)return {available:false,reason:'research.error.unknown'};
      if(state.completed.includes(id))return {available:false,reason:'research.completed',completed:true};
      if(r.technologies.every(t=>state.legacyEntitlements.includes(t)))return {available:false,reason:'research.legacyAvailable',entitled:true};
      const f=facts(external),condition=GameConditions.evaluate(r.requires,f);if(!condition.available)return condition;
      const missing=r.blueprints.filter(bp=>!state.blueprints.includes(bp));if(missing.length)return {available:false,reason:'research.error.blueprint',missing};
      if(state.data<r.cost)return {available:false,reason:'research.error.data'};return {available:true,reason:null};
    }
    function sourceAvailability(id,actorId,external){const s=bySource.get(id);if(!s)return {available:false,reason:'research.error.unknown'};const p=state.packets.find(p=>p.sourceId===id);if(p)return {available:p.status==='held'&&p.actorId===actorId,reason:p.status==='submitted'?'research.submitted':p.actorId===actorId?'research.held':'research.error.packet_owner',packet:copy(p)};return GameConditions.evaluate(s.requires,facts(external));}
    function perform(c,actor){const p=c.payload;if(!p||typeof p!=='object'||Array.isArray(p))return {ok:false,reason:'research.error.command'};
      if(c.action==='obtain'||c.action==='submit'){
        if(Object.keys(p).join()!=='sourceId'||!bySource.has(p.sourceId))return {ok:false,reason:'research.error.command'};
        const source=bySource.get(p.sourceId),packet=state.packets.find(x=>x.sourceId===source.id);
        if(c.action==='obtain'){
          if(packet)return {ok:false,reason:'research.error.source_claimed'};const allowed=sourceAvailability(source.id,actor.id);if(!allowed.available)return {ok:false,reason:allowed.reason};
          state.packets.push({sourceId:source.id,actorId:actor.id,status:'held'});return {ok:true,sourceId:source.id,status:'held'};
        }
        if(!packet||packet.status!=='held'||packet.actorId!==actor.id)return {ok:false,reason:'research.error.packet_owner'};
        if(state.data+source.data>MAX_DATA)return {ok:false,reason:'research.error.data_limit'};
        packet.status='submitted';state.data+=source.data;for(const id of source.blueprints)if(!state.blueprints.includes(id))state.blueprints.push(id);
        return {ok:true,sourceId:source.id,data:source.data,blueprints:[...source.blueprints]};
      }
      if(c.action==='research'){
        if(Object.keys(p).join()!=='researchId')return {ok:false,reason:'research.error.command'};const allowed=availability(p.researchId);if(!allowed.available)return {ok:false,reason:allowed.reason};
        const r=byResearch.get(p.researchId);state.data-=r.cost;state.completed.push(r.id);state.technologies.push(...r.technologies);state.unlocks=unlocks([...state.technologies,...state.legacyEntitlements]);return {ok:true,researchId:r.id,technologies:[...r.technologies]};
      }
      return {ok:false,reason:'research.error.command'};
    }
    const commands=EquipmentCommands.create({get:id=>id===ports.coreId?{id}:null},{actor:ports.actor,authorized:ports.authorized,access:()=>true,perform(c,actor,instance){const access=ports.access(actor,instance.id);if(!access.available)return {ok:false,reason:access.reason};return perform(c,actor);},changed(){epoch++;ports.changed?.();for(const fn of listeners)fn();}});
    state=fresh(ports.initialProfile||'new');
    function validate(s,savedFacts=ports.facts()){
      const fail=()=>{throw Error('Invalid research save');},keys=['schema','contentRevision','profile','data','completed','blueprints','technologies','legacyEntitlements','packets','unlocks','commands'];
      if(!s||Object.keys(s).sort().join()!==keys.sort().join()||s.schema!==1||s.contentRevision!==d.revision||!['new','legacy'].includes(s.profile)||!Number.isSafeInteger(s.data)||s.data<0||s.data>MAX_DATA)fail();
      const list=(a,allowed)=>Array.isArray(a)&&a.length<=256&&new Set(a).size===a.length&&a.every(id=>typeof id==='string'&&allowed.includes(id));
      if(!list(s.completed,ids(d.research))||!list(s.blueprints,ids(d.blueprints))||!list(s.technologies,ids(d.technologies))||!list(s.legacyEntitlements,d.legacyEntitlements)||!same(s.legacyEntitlements,s.profile==='legacy'?d.legacyEntitlements:[]))fail();
      if(!Array.isArray(s.packets)||s.packets.length>d.sources.length||new Set(s.packets.map(p=>p?.sourceId)).size!==s.packets.length)fail();
      for(const p of s.packets)if(!p||Object.keys(p).sort().join()!=='actorId,sourceId,status'||!bySource.has(p.sourceId)||typeof p.actorId!=='string'||!p.actorId||p.actorId.length>100||!['held','submitted'].includes(p.status))fail();
      const accepted=s.packets.filter(p=>p.status==='submitted').map(p=>bySource.get(p.sourceId)),blueprints=[...new Set(accepted.flatMap(v=>v.blueprints))],completed=s.completed.map(id=>byResearch.get(id));
      if(s.data!==accepted.reduce((n,p)=>n+p.data,0)-completed.reduce((n,r)=>n+r.cost,0)||!same(s.blueprints,blueprints)||!same(s.technologies,completed.flatMap(r=>r.technologies))||completed.some(r=>r.blueprints.some(id=>!s.blueprints.includes(id))||r.technologies.every(id=>s.legacyEntitlements.includes(id))))fail();
      const expected=unlocks([...s.technologies,...s.legacyEntitlements]);if(!s.unlocks||Object.keys(s.unlocks).sort().join()!==Object.keys(expected).sort().join()||Object.keys(expected).some(k=>!list(s.unlocks[k],expected[k])||!same(s.unlocks[k],expected[k])))fail();
      const historical={...savedFacts};for(const id of d.facts)if(id.startsWith('base.'))historical[id]=true;
      const persistedFacts=facts(historical,s);
      if(completed.some(r=>!GameConditions.evaluate(r.requires,persistedFacts).available)||s.packets.some(p=>!GameConditions.evaluate(bySource.get(p.sourceId).requires,persistedFacts).available))fail();
      commands.validate(s.commands);if(Object.keys(s.commands).sort().join()!=='receipts,revision')fail();
      const operations=s.completed.length+s.packets.reduce((n,p)=>n+(p.status==='submitted'?2:1),0);
      if(s.commands.revision!==operations||s.commands.receipts.length!==Math.min(128,operations)||operations&&s.commands.receipts.at(-1).revision!==operations)fail();
      // Receipt results cannot claim an unlock/packet absent from the owner.
      for(const [index,receipt]of s.commands.receipts.entries()){let sig;try{sig=JSON.parse(receipt.signature);}catch{fail();}if(receipt.revision!==operations-s.commands.receipts.length+index+1||!Array.isArray(sig)||sig.length!==4||sig[0]!==ports.coreId||sig[3]!==receipt.revision-1||!['obtain','submit','research'].includes(sig[1]))fail();const p=sig[2],r=receipt.result;
        if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).join()!==(sig[1]==='research'?'researchId':'sourceId'))fail();
        if(sig[1]==='research'){if(!p||r.researchId!==p.researchId||!s.completed.includes(r.researchId)||!same(r.technologies||[],byResearch.get(r.researchId).technologies))fail();}
        else if(!p||r.sourceId!==p.sourceId||!s.packets.some(v=>v.sourceId===r.sourceId&&v.actorId===receipt.actorId&&(sig[1]!=='submit'||v.status==='submitted')))fail();
        else if(sig[1]==='obtain'?r.status!=='held':r.data!==bySource.get(r.sourceId).data||!Array.isArray(r.blueprints)||!same(r.blueprints,bySource.get(r.sourceId).blueprints))fail();
      }
      return true;
    }
    function capture(){return {...copy(state),commands:commands.capture()};}
    return Object.freeze({definitions:d,fresh,validate,capture,facts,availability,sourceAvailability,
      execute(c){const p=c?.payload,key=c?.action==='research'?'researchId':'sourceId';if(!c||!['obtain','submit','research'].includes(c.action)||!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).join()!==key||typeof p[key]!=='string'||p[key].length>100)return {ok:false,reason:'research.error.command',revision:commands.revision};return commands.execute(c);},restore(s){validate(s);state=copy(s);commands.restore(s.commands);epoch++;},
      hasTechnology:id=>state.technologies.includes(id)||state.legacyEntitlements.includes(id),get revision(){return commands.revision;},get epoch(){return epoch;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
  }
  return Object.freeze({create,validateDefinitions});
})();
