/* Shared discoveries, actor-owned reading/intro receipts. No DOM, media,
   clock, inventory mutations or global pause in the authoritative owner. */
const StoryDomain=(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v)),actorId=id=>typeof id==='string'&&/^player:[1-9][0-9]*$/.test(id)&&id.length<=64;
  function validateDefinitions(d){
    if(d?.schema!==1||d.revision!==1||!Array.isArray(d.entries)||!d.entries.length||d.entries.length>256||!Array.isArray(d.categories)||new Set(d.categories).size!==d.categories.length)throw Error('Invalid story definitions');
    const seen=new Set();
    for(const e of d.entries){
      if(!/^log\.[a-z][a-z0-9_]{0,63}$/.test(e.id)||seen.has(e.id)||!d.categories.includes(e.category)||!e.title||!e.summary||!Array.isArray(e.body)||!e.body.length||e.body.length>64||e.body.some(k=>typeof k!=='string'||!k.startsWith('story.'))||!Number.isSafeInteger(e.durationMs)||e.durationMs<0||e.durationMs>3600000||!Array.isArray(e.subtitles))throw Error('Invalid story entry');
      seen.add(e.id);GameConditions.validate(e.requires,d.facts);
      let end=0;for(const cue of e.subtitles){if(!Number.isSafeInteger(cue.startMs)||!Number.isSafeInteger(cue.endMs)||cue.startMs<end||cue.endMs<=cue.startMs||cue.endMs>e.durationMs||typeof cue.text!=='string')throw Error('Invalid story subtitles');end=cue.endMs;}
      // Images use the existing asset catalog. Audio is a reserved optional
      // adapter reference, never a requirement to read or finish an entry.
      if(e.media!==null&&(!e.media||!['image','audio','video'].includes(e.media.kind)||typeof e.media.assetId!=='string'||!e.media.assetId||typeof e.media.alt!=='string'))throw Error('Invalid story media descriptor');
    }
    if(!seen.has(d.introId)||!d.entries.find(e=>e.id===d.introId).durationMs)throw Error('Missing intro');return true;
  }
  function create(d,ports){
    validateDefinitions(d);const entries=new Map(d.entries.map(e=>[e.id,e]));let state,epoch=0;const listeners=new Set();
    const personal=(id,intro='legacy')=>({actorId:id,intro,read:[],watched:[]});
    function eligible(f){return d.entries.filter(e=>GameConditions.evaluate(e.requires,f).available).map(e=>e.id);}
    function fresh(profile='legacy',id='player:1',facts={'story.context':true}){if(!['new','legacy'].includes(profile)||!actorId(id))throw Error('Invalid story profile');return {schema:1,contentRevision:d.revision,unlocked:eligible(facts),players:[personal(id,profile==='new'?'pending':'legacy')],commands:{revision:0,receipts:[]}};}
    function changed(){epoch++;ports.changed?.();for(const fn of listeners)fn();}
    function refresh(facts=ports.facts()){let dirty=false;for(const id of eligible(facts))if(!state.unlocked.includes(id)){state.unlocked.push(id);dirty=true;}if(dirty)changed();return dirty;}
    function payload(c){const p=c?.payload;if(!p||typeof p!=='object'||Array.isArray(p))return false;
      if(c.action==='finish_intro')return Object.keys(p).sort().join()==='outcome'&&['completed','skipped','interrupted'].includes(p.outcome);
      return ['read','watch'].includes(c.action)&&Object.keys(p).sort().join()==='entryId'&&entries.has(p.entryId);
    }
    const commands=EquipmentCommands.create({get:id=>id===ports.coreId?{id}:null},{actor:ports.actor,authorized:ports.authorized,access:()=>true,
      perform(c,a){
        if(!actorId(a.id)||!payload(c))return {ok:false,reason:'story.error.command'};
        let p=state.players.find(p=>p.actorId===a.id);
        if(c.action==='finish_intro'){
          if(!p||p.intro!=='pending')return {ok:false,reason:'story.error.handled'};
          p.intro=c.payload.outcome;return {ok:true,outcome:p.intro};
        }
        const access=ports.access(a,ports.coreId);if(!access.available)return {ok:false,reason:access.reason};
        const id=c.payload.entryId;if(!state.unlocked.includes(id))return {ok:false,reason:'story.error.locked'};
        const e=entries.get(id);if(c.action==='watch'&&!e.durationMs&&!['audio','video'].includes(e.media?.kind))return {ok:false,reason:'story.error.command'};
        if(!p){if(state.players.length>=16)return {ok:false,reason:'story.error.players'};p=personal(a.id);state.players.push(p);}
        const list=p[c.action==='read'?'read':'watched'];if(list.includes(id))return {ok:false,reason:'story.error.handled'};
        list.push(id);return {ok:true,entryId:id,action:c.action};
      },changed});
    state=fresh('legacy',ports.initialActorId||'player:1');
    function validate(s,facts=ports.facts()){
      const fail=()=>{throw Error('Invalid story save');};
      if(!s||Object.keys(s).sort().join()!=='commands,contentRevision,players,schema,unlocked'||s.schema!==1||s.contentRevision!==d.revision)fail();
      const list=a=>Array.isArray(a)&&a.length<=entries.size&&new Set(a).size===a.length&&a.every(id=>entries.has(id));
      if(!list(s.unlocked)||s.unlocked.some(id=>!GameConditions.evaluate(entries.get(id).requires,facts).available)||!Array.isArray(s.players)||!s.players.length||s.players.length>16||new Set(s.players.map(p=>p?.actorId)).size!==s.players.length)fail();
      for(const p of s.players){if(!p||Object.keys(p).sort().join()!=='actorId,intro,read,watched'||!actorId(p.actorId)||!['pending','completed','skipped','interrupted','legacy'].includes(p.intro)||!list(p.read)||!list(p.watched)||[...p.read,...p.watched].some(id=>!s.unlocked.includes(id))||p.watched.some(id=>!entries.get(id).durationMs&&!['audio','video'].includes(entries.get(id).media?.kind)))fail();}
      commands.validate(s.commands);if(Object.keys(s.commands).sort().join()!=='receipts,revision')fail();
      const count=s.players.reduce((n,p)=>n+p.read.length+p.watched.length+Number(['completed','skipped','interrupted'].includes(p.intro)),0);
      if(s.commands.revision!==count||s.commands.receipts.length!==Math.min(128,count))fail();
      for(const [i,r]of s.commands.receipts.entries()){
        let sig;try{sig=JSON.parse(r.signature);}catch{fail();}const p=s.players.find(p=>p.actorId===r.actorId);
        if(!p||r.revision!==count-s.commands.receipts.length+i+1||!Array.isArray(sig)||sig.length!==4||sig[0]!==ports.coreId||sig[3]!==r.revision-1||!payload({action:sig[1],payload:sig[2]}))fail();
        if(sig[1]==='finish_intro'){if(r.result.outcome!==sig[2].outcome||p.intro!==r.result.outcome)fail();}
        else if(r.result.entryId!==sig[2].entryId||r.result.action!==sig[1]||!p[sig[1]==='read'?'read':'watched'].includes(sig[2].entryId))fail();
      }return true;
    }
    function view(id){const p=state.players.find(p=>p.actorId===id)||personal(id);return {unlocked:[...state.unlocked],...copy(p),revision:commands.revision,epoch};}
    return Object.freeze({fresh,validate,refresh,view,capture:()=>({...copy(state),commands:commands.capture()}),
      execute(c){if(!payload(c))return {ok:false,reason:'story.error.command',revision:commands.revision};return commands.execute(c);},
      restore(s,facts){validate(s,facts);state=copy(s);commands.restore(s.commands);epoch++;},get revision(){return commands.revision;},get epoch(){return epoch;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
  }
  return Object.freeze({create,validateDefinitions});
})();
