/* World-scoped identity. IDs never use display names, array positions, wall time
   or gameplay RNG. Existing content type keys and gear/robot/turret IDs remain.
   The only positional mapping is the one-time migration of historical saves. */
window.GameIdentity=(()=>{
  let nextEnemy=1,playerId='player:1';
  const enemyNumber=id=>typeof id==='string'&&/^enemy:[1-9][0-9]*$/.test(id)?Number(id.slice(6)):NaN;
  function createEnemyId(){
    if(!Number.isSafeInteger(nextEnemy)||nextEnemy>=Number.MAX_SAFE_INTEGER)throw Error('Enemy identity limit');
    return 'enemy:'+nextEnemy++;
  }
  function attachEnemy(entity,id=createEnemyId()){
    Object.defineProperties(entity,{
      instanceId:{value:id},typeId:{get:()=>entity.type||'normal'}
    });return entity;
  }
  function migrate(data){
    const enemies=data.zombies.map((_,i)=>'enemy:'+(i+1));
    data.identity027={schema:1,playerId:'player:1',nextEnemy:enemies.length+1,enemies,
      droneTargetId:data.robots014?.task==='attack'?enemies[data.robots014.targetIndex]??null:null};
  }
  function validate(data){
    const m=data.identity027;
    // Legacy actor payloads contain gameplay fields only. Conflicting identity
    // copies would reach Object.assign on read-only runtime IDs during restore.
    // Reject them here, before any owner is allowed to mutate the live world.
    const shadowsId=o=>o&&(Object.hasOwn(o,'instanceId')||Object.hasOwn(o,'typeId'));
    if(shadowsId(data.player)||data.zombies.some(shadowsId)||data.robots014&&Object.hasOwn(data.robots014,'targetId'))throw Error('Ambiguous entity identities');
    if(!m||m.schema!==1||typeof m.playerId!=='string'||!/^player:[1-9][0-9]*$/.test(m.playerId)||m.playerId.length>64||
      !Number.isSafeInteger(m.nextEnemy)||m.nextEnemy<1||!Array.isArray(m.enemies)||m.enemies.length!==data.zombies.length||
      m.enemies.some(id=>!Number.isSafeInteger(enemyNumber(id))||enemyNumber(id)>=m.nextEnemy)||
      new Set(m.enemies).size!==m.enemies.length||
      m.droneTargetId!==null&&(!m.enemies.includes(m.droneTargetId)||data.robots014?.task!=='attack'||m.enemies[data.robots014.targetIndex]!==m.droneTargetId))throw Error('Invalid entity identities');
    if(m.droneTargetId===null&&data.robots014?.task==='attack'&&m.enemies[data.robots014.targetIndex])throw Error('Missing drone target identity');
    return true;
  }
  function capture(){
    const enemies=zombies.map(z=>z.instanceId),target=window.V014Robots?.state.targetId;
    return {schema:1,playerId,nextEnemy,enemies,droneTargetId:enemies.includes(target)?target:null};
  }
  function restore(data){playerId=data.identity027.playerId;nextEnemy=data.identity027.nextEnemy;}
  const enemy=id=>typeof id==='string'?zombies.find(z=>z.instanceId===id)||null:null;
  return Object.freeze({createEnemyId,attachEnemy,migrate,validate,capture,restore,enemy,get playerId(){return playerId;}});
})();
