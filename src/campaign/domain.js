/* Campaign authority. Explicit ports keep local actor selection and DOM outside
   the domain. Captures are pure; restoration never grants or emits anything. */
window.GameCampaignDomain=(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v)),object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
  const validActor=id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(id);
  function validateDefinitions(d){
    if(!d||!integer(d.revision)||!d.revision||!Array.isArray(d.facts)||!Array.isArray(d.chapters)||!d.chapters.length)throw Error('Invalid campaign definitions');
    const chapters=new Map(),objectives=new Map();
    for(const c of d.chapters){
      if(!c.id||chapters.has(c.id)||!Array.isArray(c.objectives)||!Array.isArray(c.requires)||!c.title||!c.description)throw Error('Invalid chapter ID');chapters.set(c.id,c);
      for(const o of c.objectives){if(!o.id||objectives.has(o.id)||!['current','once','after'].includes(o.semantics)||typeof o.required!=='boolean'||!Array.isArray(o.requires)||!o.title||!o.description)throw Error('Invalid objective ID');objectives.set(o.id,o);GameConditions.validate(o.condition,d.facts);if(o.semantics==='after'&&(!o.condition.fact||!Object.hasOwn(o.condition,'atLeast')))throw Error('After objective needs monotonic counter');}
    }
    if(!chapters.has(d.first))throw Error('Unknown first chapter');
    function acyclic(map,edges){const done=new Set(),visiting=new Set();function visit(id){if(!map.has(id))throw Error('Unknown dependency: '+id);if(visiting.has(id))throw Error('Campaign cycle');if(done.has(id))return;visiting.add(id);edges(map.get(id)).forEach(visit);visiting.delete(id);done.add(id);}for(const id of map.keys())visit(id);}
    acyclic(chapters,c=>c.requires);acyclic(chapters,c=>c.next?[c.next]:[]);
    const reached=new Set();let at=d.first;while(at){if(reached.has(at)||!chapters.has(at))throw Error('Invalid chapter route');reached.add(at);const c=chapters.get(at);if(c.requires.some(id=>!reached.has(id)||id===at))throw Error('Unreachable chapter requirement');at=c.next;}
    if(reached.size!==chapters.size)throw Error('Unreachable chapter');
    for(const c of d.chapters){const local=new Map(c.objectives.map(o=>[o.id,o]));acyclic(local,o=>o.requires);for(const o of c.objectives)if(o.requires.some(id=>local.get(id).semantics==='current'))throw Error('Transient prerequisite is not a milestone');}
    return true;
  }
  function create(definitions,ports){
    validateDefinitions(definitions);
    const chapters=new Map(definitions.chapters.map(c=>[c.id,c])),all=new Map(definitions.chapters.flatMap(c=>c.objectives.map(o=>[o.id,o])));
    function fresh(profile='new',facts={}){
      const first=chapters.get(definitions.first),objectives={};
      for(const o of first.objectives)objectives[o.id]={active:o.requires.length===0,done:false,baseline:o.semantics==='after'?(facts[o.condition.fact]||0):null};
      return {schema:1,contentRevision:definitions.revision,profile,revision:0,activeChapter:first.id,completed:[],objectives,transitions:[],receipts:[]};
    }
    let state=fresh();
    function changed(event){state.revision++;ports.changed?.();if(event)ports.emit?.(event);}
    function refresh(facts=ports.facts()){
      const c=chapters.get(state.activeChapter);let dirty=false;
      // Small dependency-ordered fixed point only when facts change, never a frame-wide graph scan.
      for(let pass=0;pass<=c.objectives.length;pass++){
        let progress=false;
        for(const o of c.objectives){const s=state.objectives[o.id];
          if(!s.active&&o.requires.every(id=>state.objectives[id].done)){s.active=true;if(o.semantics==='after')s.baseline=facts[o.condition.fact]||0;progress=dirty=true;}
          if(!s.active)continue;
          const input=o.semantics==='after'?{...facts,[o.condition.fact]:Math.max(0,(facts[o.condition.fact]||0)-s.baseline)}:facts;
          const done=GameConditions.evaluate(o.condition,input).available;
          if((o.semantics==='current'||!s.done)&&s.done!==done){s.done=done;progress=dirty=true;}
        }
        if(!progress)break;
      }
      if(dirty)changed();return dirty;
    }
    function view(){const c=chapters.get(state.activeChapter);return {chapter:c.id,revision:state.revision,ready:!!c.next&&c.objectives.filter(o=>o.required).every(o=>state.objectives[o.id].done),terminal:!c.next,objectives:copy(state.objectives),completed:[...state.completed]};}
    function execute(command){
      const fail=reason=>({ok:false,reason});
      if(!object(command)||command.type!=='ADVANCE_CHAPTER'||!validActor(command.actorId)||typeof command.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(command.requestId)||!integer(command.expectedRevision)||typeof command.chapterId!=='string')return fail('campaign.reason.request');
      const actor=ports.actor(command.actorId);if(!actor||actor.id!==command.actorId||actor.dead)return fail('campaign.reason.actor');
      if(!ports.permission(actor,'advance'))return fail('campaign.reason.permission');
      const signature=JSON.stringify([command.type,command.chapterId,command.targetId,command.expectedRevision]);
      const old=state.receipts.find(r=>r.actorId===command.actorId&&r.requestId===command.requestId);
      if(old)return old.signature===signature?{ok:true,replayed:true,chapter:old.chapter}:fail('campaign.reason.request');
      const access=ports.access(actor,command.targetId);if(!access.available)return fail(access.reason);
      refresh();
      if(command.expectedRevision!==state.revision||command.chapterId!==state.activeChapter)return fail('campaign.reason.stale');
      const c=chapters.get(state.activeChapter);if(!view().ready)return fail('campaign.reason.objectives');
      const next=chapters.get(c.next);if(!next||next.requires.some(id=>id!==c.id&&!state.completed.includes(id)))return fail('campaign.reason.condition');
      const facts=ports.facts();
      state.completed.push(c.id);state.transitions.push({from:c.id,to:next.id,actorId:actor.id});state.activeChapter=next.id;
      for(const o of next.objectives)state.objectives[o.id]={active:o.requires.length===0,done:false,baseline:o.semantics==='after'?(facts[o.condition.fact]||0):null};
      state.receipts.push({actorId:actor.id,requestId:command.requestId,signature,chapter:next.id});if(state.receipts.length>64)state.receipts.shift();
      changed({type:'chapterTransition',from:c.id,to:next.id,actorId:actor.id,requestId:command.requestId});
      return {ok:true,replayed:false,chapter:next.id};
    }
    function validate(s){
      const fail=()=>{throw Error('Invalid campaign save');};
      if(!object(s)||s.schema!==1||s.contentRevision!==definitions.revision||!['new','legacy'].includes(s.profile)||!integer(s.revision)||!chapters.has(s.activeChapter)||!Array.isArray(s.completed)||!object(s.objectives)||!Array.isArray(s.transitions)||!Array.isArray(s.receipts)||s.receipts.length>64)fail();
      let at=definitions.first;const seen=[],expected=[];
      while(at!==s.activeChapter){const c=chapters.get(at);if(!c||!c.next||seen.includes(at))fail();seen.push(at);expected.push(...c.objectives);at=c.next;}
      if(JSON.stringify(seen)!==JSON.stringify(s.completed)||s.transitions.length!==seen.length)fail();
      expected.push(...chapters.get(at).objectives);
      if(Object.keys(s.objectives).length!==expected.length)fail();
      for(const o of expected){const x=s.objectives[o.id];if(!object(x)||typeof x.active!=='boolean'||typeof x.done!=='boolean'||(!x.active&&x.done)||(o.semantics==='after'?!integer(x.baseline):x.baseline!==null))fail();if(x.active&&o.requires.some(id=>!s.objectives[id]?.done))fail();if(seen.some(id=>chapters.get(id).objectives.includes(o))&&o.required&&!x.done)fail();}
      for(let i=0;i<seen.length;i++){const t=s.transitions[i],c=chapters.get(seen[i]);if(!object(t)||t.from!==c.id||t.to!==c.next||!validActor(t.actorId))fail();}
      const ids=new Set();for(const r of s.receipts){if(!object(r)||!validActor(r.actorId)||typeof r.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(r.requestId)||typeof r.signature!=='string'||r.signature.length>400||!s.transitions.some(t=>t.to===r.chapter&&t.actorId===r.actorId)||ids.has(r.actorId+'|'+r.requestId))fail();let sig;try{sig=JSON.parse(r.signature);}catch{fail();}if(!Array.isArray(sig)||sig.length!==4||sig[0]!=='ADVANCE_CHAPTER'||!s.completed.includes(sig[1])||!integer(sig[3]))fail();ids.add(r.actorId+'|'+r.requestId);}
      return true;
    }
    function migrate(s,facts={}){
      if(s?.contentRevision===definitions.revision){validate(s);return copy(s);}
      if(s?.contentRevision!==1||definitions.revision!==2)throw Error('Unsupported campaign content');
      // Validate against the original content before adding optional objectives.
      // Completed chapters and command receipts are never replayed or revoked.
      const previous=copy(definitions);previous.revision=1;
      previous.chapters.forEach(c=>{c.objectives=c.objectives.filter(o=>!o.since);});
      create(previous,ports).validate(s);
      const next=copy(s);
      for(const id of [...next.completed,next.activeChapter])for(const o of chapters.get(id).objectives){
        if(next.objectives[o.id])continue;
        const active=id===next.activeChapter&&o.requires.every(key=>next.objectives[key]?.done);
        next.objectives[o.id]={active,done:false,baseline:o.semantics==='after'?(active?facts[o.condition.fact]||0:0):null};
      }
      next.contentRevision=definitions.revision;next.revision=Math.min(1000000000,next.revision+1);validate(next);return next;
    }
    return Object.freeze({fresh,refresh,view,execute,validate,migrate,capture:()=>copy(state),restore(s){validate(s);state=copy(s);},definitions});
  }
  return Object.freeze({create,validateDefinitions});
})();
