/* Storage keys and the existing schema:2 payload deliberately stay unchanged.
   saveVersion describes the envelope, independently of a release number and
   of per-owner schemas. All historical migrations still run in their order. */
const SaveFormat=(()=>{
  const VERSION=4,MAX_BYTES=2*1024*1024;
  const migrations=[{from:0,to:1,id:'explicit-envelope-version',apply(d){d.saveVersion=1;return d;}},{from:1,to:2,id:'stable-actor-and-enemy-identities',apply(d){d.saveVersion=2;return d;},complete(d){GameIdentity.migrate(d);}},{from:2,to:3,id:'world-farm-resources',apply(d){GameLivestock.migrate(d);d.saveVersion=3;return d;}},{from:3,to:4,id:'bunker-level1-r1',apply(d){BunkerState.migrate(d);d.saveVersion=4;return d;}}];
  function prepare(raw,context){
    if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('Save file is too large');
    let data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid save');
    let version=Object.hasOwn(data,'saveVersion')?data.saveVersion:0;
    if(!Number.isInteger(version)||version<0||version>VERSION)throw Error('Unsupported save format version');
    if(context)context.sourceVersion=version;
    while(version<VERSION){
      const migration=migrations.find(m=>m.from===version);
      if(!migration)throw Error('Missing save migration');
      data=migration.apply(data);version=migration.to;
    }
    // Pin was UI-only metadata. Ignore it in any imported version and container.
    function unpin(value){if(!value||typeof value!=='object')return;if(typeof value.type==='string')delete value.locked;for(const v of Object.values(value))if(v&&typeof v==='object')unpin(v);}
    unpin(data);return JSON.stringify(data);
  }
  function stamp(data){data.saveVersion=VERSION;data.gameVersion='0.30.0';return data;}
  return Object.freeze({version:VERSION,prepare,stamp,
    complete(data,sourceVersion){for(const m of migrations)if(m.from>=sourceVersion)m.complete?.(data);},
    migrations:()=>migrations.map(({from,to,id})=>({from,to,id}))});
})();

