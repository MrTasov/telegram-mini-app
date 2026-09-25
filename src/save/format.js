/* Storage keys and the existing schema:2 payload deliberately stay unchanged.
   saveVersion describes the envelope, independently of a release number and
   of per-owner schemas. All historical migrations still run in their order. */
const SaveFormat=(()=>{
  const VERSION=16,MAX_BYTES=2*1024*1024;
  const migrations=[{from:0,to:1,id:'explicit-envelope-version',apply(d){d.saveVersion=1;return d;}},{from:1,to:2,id:'stable-actor-and-enemy-identities',apply(d){d.saveVersion=2;return d;},complete(d){GameIdentity.migrate(d);}},{from:2,to:3,id:'world-farm-resources',apply(d){GameLivestock.migrate(d);d.saveVersion=3;return d;}},{from:3,to:4,id:'bunker-level1-r2',apply(d){BunkerState.migrate(d);d.saveVersion=4;return d;}},{from:4,to:5,id:'bunker-level1-r2',apply(d){if(!d.bunker030)throw Error('Missing Bunker Level 1 state');BunkerState.migrate(d);d.saveVersion=5;return d;}},{from:5,to:6,id:'campaign-foundation',apply(d){GameCampaign.migrate(d);d.saveVersion=6;return d;}},{from:6,to:7,id:'fixed-equipment-instances',apply(d){GameEquipmentRuntime.migrate(d);d.saveVersion=7;return d;}},{from:7,to:8,id:'bunker-room-swap-r3',apply(d){if(!d.bunker030)throw Error('Missing Bunker Level 1 state');BunkerState.migrate(d);d.saveVersion=8;return d;}},{from:8,to:9,id:'head-flashlight-module',apply(d){GameHeadModules.migrate(d);d.saveVersion=9;return d;},complete(d){d.starterPending=d.starterPending.filter(t=>t!=='flashlight');}},{from:9,to:10,id:'base-recovery-commands',apply(d){GameRecovery.migrate(d);d.saveVersion=10;return d;}},{from:10,to:11,id:'tool-impact-cycles',apply(d){GameGathering.migrate(d);d.saveVersion=11;return d;}},{from:11,to:12,id:'chapter-one-new-game-profile',apply(d){GameChapterOne.migrate(d);d.saveVersion=12;return d;}},{from:12,to:13,id:'equipment-placement',apply(d){GamePlacement.migrate(d);d.saveVersion=13;return d;}},{from:13,to:14,id:'movable-equipment-inventory',apply(d){GamePlacement.migrateCorrective(d);d.saveVersion=14;return d;}},{from:14,to:15,id:'individual-carried-slots-and-base-control',apply(d){GameCarried.migrate(d);GameBaseControl.migrate(d);d.saveVersion=15;return d;}},{from:15,to:16,id:'research-and-blueprint-foundation',apply(d){GameResearch.migrate(d);d.saveVersion=16;return d;}}];
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
  function stamp(data){data.saveVersion=VERSION;data.gameVersion='0.36.1';return data;}
  return Object.freeze({version:VERSION,prepare,stamp,
    complete(data,sourceVersion){for(const m of migrations)if(m.from>=sourceVersion)m.complete?.(data);},
    migrations:()=>migrations.map(({from,to,id})=>({from,to,id}))});
})();
