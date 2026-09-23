/* Stage D authority. The registry owns presence/transform; manufacturing keeps
   every job/output/refund. A client ghost never reserves space or spends items. */
window.GamePlacement=(()=>{
  const rules=EquipmentInstances.placement,copy=v=>JSON.parse(JSON.stringify(v));
  const zones=Object.freeze(['workshop','reserve_l1']);let sequence=0,checks=0;
  const fail=reason=>({ok:false,reason});
  const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
  const footprint=r=>EquipmentInstances.aabb(r.transform,{x:0,y:0,...EquipmentInstances.definitions[r.typeId].footprint});
  function protectedArea(room){const r=BunkerLayout.rooms[room],d=BunkerLayout.door(room);return {x:d.x-108,y:d.y-24,w:d.w+216,h:d.h+48};}
  function centered(typeId,room,x,y,turn=0){
    const rotation=EquipmentInstances.turns[turn],b=EquipmentInstances.aabb({x:0,y:0,rotation},{x:0,y:0,...EquipmentInstances.definitions[typeId].footprint});
    return {x:Math.round((x-b.w/2-b.x)/10)*10,y:Math.round((y-b.h/2-b.y)/10)*10,rotation,scene:'bunker',room};
  }
  function blockedByWork(id,data){
    const q=data?.v010?.modules?.craft||V09Craft.craftQueue.capture(),job=data?data.v09.crafting.jobs[id]:V09Craft.craftQueue.getJob(id);
    return !!job||!!q.queues[id]?.length||Object.values(q.ready[id]||{}).some(n=>n>0)||Object.values(q.refunds[id]||{}).some(n=>n>0);
  }
  function roomBodies(room,records){
    const allIds=new Set(GameEquipment.ids.concat(records.map(r=>r.id))),bounds=BunkerLayout.rooms[room];
    return solidObjects('bunker').filter(o=>!allIds.has(o.id)&&!o.id.startsWith('build:')&&!o.id.startsWith('v09door_')&&o.id!=='robots014_dock_body'&&overlap(o,{x:bounds.left,y:bounds.top,w:bounds.right-bounds.left,h:bounds.bottom-bounds.top}))
      .concat(records.filter(r=>r.placement==='installed'&&r.transform.room===room).map(GameFootprints.forRecord));
  }
  // Bounded room grid (26 x 25); doors are tested as operable, including manual
  // opening without Power. Both player and drone use 18-unit clearance here.
  function reachable(room,records){
    const r=BunkerLayout.rooms[room],bodies=roomBodies(room,records),step=20,radius=18;
    const cols=Math.floor((r.right-r.left)/step),rows=Math.floor((r.bottom-r.top)/step),cells=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
    const pos=i=>({x:r.left+(i%cols+.5)*step,y:r.top+(Math.floor(i/cols)+.5)*step});
    for(let i=0;i<cells.length;i++){const p=pos(i);cells[i]=p.x<r.left+radius+9||p.x>r.right-radius-9||p.y<r.top+radius+9||p.y>r.bottom-radius-9||bodies.some(b=>rectHit(p.x,p.y,radius,b))?1:0;}
    const d=BunkerLayout.door(room),entry={x:r.side==='left'?r.right-40:r.left+40,y:d.y+d.h/2};let start=-1,best=Infinity;
    for(let i=0;i<cells.length;i++)if(!cells[i]){const p=pos(i),n=Math.hypot(p.x-entry.x,p.y-entry.y);if(n<best){best=n;start=i;}}
    if(start<0||best>45)return false;
    const queue=[start];seen[start]=1;
    for(let k=0;k<queue.length;k++){const i=queue[k],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||nx>=cols||ny<0||ny>=rows||cells[n]||seen[n])continue;seen[n]=1;queue.push(n);}}
    return records.filter(v=>v.placement==='installed'&&v.transform.room===room).every(v=>{
      const b=GameFootprints.forRecord(v),range=EquipmentInstances.definitions[v.typeId].range-4;
      return queue.some(i=>{const p=pos(i),q=contactPoint(b,p.x,p.y);return Math.hypot(p.x-q.x,p.y-q.y)<=range;});
    });
  }
  function checkRecord(record,records,occupants=true){
    checks++;const rule=Object.hasOwn(rules,record.typeId)?rules[record.typeId]:null,t=record.transform;
    if(!rule||!t||t.scene!=='bunker'||!rule.rooms.includes(t.room)||!EquipmentInstances.turns.includes(t.rotation)||![t.x,t.y].every(Number.isFinite))return fail('room');
    const r=BunkerLayout.rooms[t.room],f=footprint(record),body=GameFootprints.forRecord(record);
    if(f.x<r.left+18||f.y<r.top+18||f.x+f.w>r.right-18||f.y+f.h>r.bottom-18)return fail('bounds');
    if(overlap(f,protectedArea(t.room)))return fail('door');
    const others=records.filter(v=>v.id!==record.id),bodies=roomBodies(t.room,others);
    if(bodies.some(b=>overlap(body,b,8)))return fail('overlap');
    if(occupants&&BunkerLayout.occupants('bunker').some(a=>rectHit(a.x,a.y,(a.radius||14)+6,body)))return fail('occupied');
    if(!reachable(t.room,others.concat(record)))return fail('passage');
    return {ok:true,record:copy(record)};
  }
  function check(selection,transform,occupants=true){
    if(typeof selection!=='string'||!transform||Object.keys(transform).sort().join()!=='room,rotation,scene,x,y')return fail('invalid_command');
    const existing=GameEquipment.get(selection),typeId=existing?.typeId||selection.replace(/^catalog:/,''),rule=Object.hasOwn(rules,typeId)?rules[typeId]:null;
    if(!rule)return fail('type');
    if(existing&&existing.placement!=='packed')return fail('installed');
    if(!existing&&GameEquipment.capture().filter(r=>r.typeId===typeId).length>=rule.limit)return fail('limitReached');
    const record=existing?{...copy(existing),placement:'installed',transform:copy(transform)}:GameEquipment.create(typeId,transform);
    return checkRecord(record,GameEquipment.capture(),occupants);
  }
  function access(actor){return !actor.dead&&actor.scene==='bunker'&&(actor.entity.floor??1)===1&&GameCampaign.access(actor,BunkerLayout.core.id,false).available;}
  function perform(c){
    const p=c.payload||{};
    if(p.geometry!==geometryRevision)return fail('world_changed');
    if(c.action==='pack'){
      const r=GameEquipment.get(c.instanceId);if(!r||!rules[r.typeId])return fail('protected');
      if(r.placement!=='installed')return fail('packed');
      if(blockedByWork(r.id))return fail('busy');
      GameEquipment.change({...copy(r),placement:'packed'});V09Craft.syncInstances();invalidateGeometry();
      return {ok:true,instanceId:r.id,placement:'packed'};
    }
    if(c.action!=='place')return fail('action');
    const selection=c.instanceId;
    const preview=check(selection,p.transform);if(!preview.ok)return preview;
    const existing=GameEquipment.get(selection),cost=existing?{}:rules[selection.replace(/^catalog:/,'')].cost;
    // Validate every field and owner link before the single atomic debit.
    const next=GameEquipment.capture().filter(r=>r.id!==preview.record.id).concat(preview.record);GameEquipment.validate(next);
    if(!V010Inventory.consumeMaterials(cost,1))return fail('materials');
    GameEquipment.change(preview.record);V09Craft.syncInstances();invalidateGeometry();
    return {ok:true,instanceId:preview.record.id,placement:'installed'};
  }
  const commands=EquipmentCommands.create({get:id=>id.startsWith('catalog:')&&Object.hasOwn(rules,id.slice(8))?{id}:GameEquipment.get(id)},
    {actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access,perform,changed:()=>{queueGameSave();v09PowerChanged();}});
  function execute(c){return GameFlow.paused?{ok:false,reason:'world_paused',revision:commands.revision}:commands.execute(c);}
  function request(selection,action,transform){return execute({actorId:GameActors.localId,instanceId:selection.startsWith('catalog:')||GameEquipment.get(selection)?selection:'catalog:'+selection,action,payload:{geometry:geometryRevision,...(transform?{transform:copy(transform)}:{})},expectedRevision:commands.revision,requestId:'placement:'+commands.revision+':'+(++sequence)});}
  function migrate(d){
    const e=d.equipment032;if(!e||e.schema!==1)throw Error('Missing legacy equipment');
    // Validate the accepted fixed layout independently of the current live world.
    EquipmentInstances.createRegistry(EquipmentInstances.defaults).validate(e.instances,true);
    e.schema=2;for(const r of e.instances)r.placement='installed';d.placement035={schema:1,commands:{revision:0,receipts:[]}};
  }
  function validate(d){
    const s=d.placement035;if(!s||s.schema!==1||Object.keys(s).sort().join()!=='commands,schema')throw Error('Invalid placement state');commands.validate(s.commands);
    const records=d.equipment032.instances;GameEquipment.validate(records);
    for(const r of records){
      if(r.placement==='packed'){if(blockedByWork(r.id,d))throw Error('Packed station owns unfinished work');continue;}
      if(rules[r.typeId]){const seed=EquipmentInstances.defaults.find(v=>v.id===r.id);if(seed&&JSON.stringify(seed.transform)===JSON.stringify(r.transform))continue;
        if(!checkRecord(r,records,false).ok)throw Error('Invalid saved placement');}
    }
    return true;
  }
  const capture=()=>({schema:1,commands:commands.capture()});
  GameSave.extend('capture','equipment.placement',function(previous){const d=previous();d.placement035=capture();return d;});
  GameSave.extend('decode','equipment.placement',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','equipment.placement',function(previous,d){validate(d);const result=previous(d);commands.restore(d.placement035.commands);window.GamePlacementUI?.cancel();invalidateGeometry();return result;});
  GameState.register('placement',{capture},{source:'equipment/placement.js',saved:['placement035'],transient:['client preview','request sequence','validation counters']});
  return Object.freeze({rules,zones,footprint,protectedArea,centered,check,checkRecord,reachable,blockedByWork,access,execute,request,migrate,validate,capture,get revision(){return commands.revision;},metrics:()=>({checks})});
})();
