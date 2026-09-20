/* Storage keys and the existing schema:2 payload deliberately stay unchanged.
   saveVersion describes the envelope, independently of a release number and
   of per-owner schemas. All historical migrations still run in their order. */
const SaveFormat=(()=>{
  const VERSION=1,MAX_BYTES=2*1024*1024;
  const migrations=[{from:0,to:1,id:'explicit-envelope-version',apply(d){d.saveVersion=1;return d;}}];
  function prepare(raw){
    if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('Save file is too large');
    let data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid save');
    let version=Object.hasOwn(data,'saveVersion')?data.saveVersion:0;
    if(!Number.isInteger(version)||version<0||version>VERSION)throw Error('Unsupported save format version');
    while(version<VERSION){
      const migration=migrations.find(m=>m.from===version);
      if(!migration)throw Error('Missing save migration');
      data=migration.apply(data);version=migration.to;
    }
    return JSON.stringify(data);
  }
  function stamp(data){data.saveVersion=VERSION;data.gameVersion='0.25.1';return data;}
  return Object.freeze({version:VERSION,prepare,stamp,
    migrations:()=>migrations.map(({from,to,id})=>({from,to,id}))});
})();

