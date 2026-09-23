/* Pure synchronous authority gate. Client UI is not an authority or a clock.
   Bounded receipts survive reload; evicted requests still fail their old revision.
   The local runtime supplies explicit actor/access/operation ports below. */
const EquipmentCommands=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x)),MAX_RECEIPTS=128;
  function create(registry,ports){
    let revision=0,receipts=[];
    const capture=()=>({revision,receipts:copy(receipts)});
    function validate(data){
      if(!data||!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.receipts)||data.receipts.length>MAX_RECEIPTS)throw Error('Invalid equipment command state');
      const keys=new Set();let previous=0;
      for(const r of data.receipts){const key=r?.actorId+'\0'+r?.requestId;if(!r||typeof r.actorId!=='string'||!r.actorId||r.actorId.length>100||typeof r.requestId!=='string'||!r.requestId||r.requestId.length>100||typeof r.signature!=='string'||r.signature.length>4096||keys.has(key)||!Number.isSafeInteger(r.revision)||r.revision<=previous||r.revision>data.revision||r.result?.ok!==true||r.result.revision!==r.revision)throw Error('Invalid equipment receipt');keys.add(key);previous=r.revision;}
      return true;
    }
    function execute(command){
      const fail=reason=>({ok:false,reason,revision});
      if(!command||typeof command.actorId!=='string'||typeof command.instanceId!=='string'||typeof command.requestId!=='string'||!command.requestId||command.requestId.length>100||!Number.isSafeInteger(command.expectedRevision)||typeof command.action!=='string')return fail('invalid_command');
      const actor=ports.actor(command.actorId);if(!actor||!ports.authorized(actor))return fail('actor_denied');
      const instance=registry.get(command.instanceId);if(!instance)return fail('missing_instance');
      const signature=JSON.stringify([command.instanceId,command.action,command.payload??null,command.expectedRevision]);if(signature.length>4096)return fail('invalid_command');
      const old=receipts.find(r=>r.actorId===command.actorId&&r.requestId===command.requestId);
      if(old)return old.signature===signature?{...copy(old.result),replayed:true}:fail('request_conflict');
      if(command.expectedRevision!==revision)return fail('stale_revision');
      if(revision===Number.MAX_SAFE_INTEGER)return fail('revision_limit');
      if(!ports.access(actor,instance))return fail('out_of_reach');
      const result=ports.perform(command,actor,instance);if(!result?.ok)return fail(result?.reason||'operation_denied');
      revision++;const out={...result,revision};receipts.push({actorId:command.actorId,requestId:command.requestId,signature,revision,result:copy(out)});if(receipts.length>MAX_RECEIPTS)receipts.shift();ports.changed?.();return out;
    }
    return Object.freeze({execute,capture,validate,restore(data){validate(data);revision=data.revision;receipts=copy(data.receipts);},get revision(){return revision;}});
  }
  return Object.freeze({create});
})();
