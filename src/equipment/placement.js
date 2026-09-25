/* Shared placement authority: craft -> carried instance -> installed -> carried.
   Inventory displays registry-owned instances; it never duplicates their state. */
window.GamePlacement=(()=>{
  const rules=EquipmentInstances.placement,copy=v=>JSON.parse(JSON.stringify(v)),zones=EquipmentInstances.rooms;
  const roomPresets=['workshop','storage','power','armory','medical','drone','living'];
  let sequence=0,checks=0,roomNames={};const pickups=new Map();let pickupSequence=0;
  const fail=reason=>({ok:false,reason});
  const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
  const footprint=r=>GameFootprints.forRecord(r);
  function protectedArea(room){if(room==='corridor'){const r=BunkerLayout.rooms.corridor;return {x:(r.left+r.right)/2-56,y:r.top,w:112,h:r.bottom-r.top};}const d=BunkerLayout.door(room);return d.horizontal?{x:d.x-24,y:d.y-62,w:d.w+48,h:d.h+124}:{x:d.x-62,y:d.y-24,w:d.w+124,h:d.h+48};}
  function protectedAreas(room){if(room==='yard')return GameSurfacePlacement.protectedAreas();if(room!=='corridor')return [protectedArea(room)];return [protectedArea(room),...zones.map(protectedArea),...[BunkerLayout.core,BunkerLayout.up,BunkerLayout.down,...BunkerLayout.stairs].map(b=>({x:b.x-45,y:b.y-45,w:b.w+90,h:b.h+90}))];}
  function centered(typeId,room,x,y,turn=0){const rotation=EquipmentInstances.turns[turn],b=footprint({typeId,transform:{x:0,y:0,rotation,room}});return {x:Math.round((x-b.w/2-b.x)/2)*2,y:Math.round((y-b.h/2-b.y)/2)*2,rotation,scene:room==='yard'?'surface':'bunker',room};}
  function blockedByWork(id,data){
    if(!EquipmentInstances.definitions[(data?.equipment032.instances||GameEquipment.capture()).find(r=>r.id===id)?.typeId]?.recipeStation)return false;
    const q=data?.v010?.modules?.craft||V09Craft.craftQueue.capture(),job=data?data.v09.crafting.jobs[id]:V09Craft.craftQueue.getJob(id);
    return !!job||!!q.queues[id]?.length||Object.values(q.ready[id]||{}).some(n=>n>0)||Object.values(q.refunds[id]||{}).some(n=>n>0);
  }
  const guards={
    production:(r,d)=>blockedByWork(r.id,d)?'busy':null,
    container:(r,d)=>{const index=r.refs.container,items=index==='upgrade'?(d?[d.upgrade0161?.item]:V0161Upgrade.slots):(d?.storage||storageChests)[Number(index.slice(8))]?.items;return items?.some(Boolean)?'emptyContainer':null;},
    generator:(r,d)=>(d?.v09.power||V09Power).running?'stopGenerator':null,
    tank:(r,d)=>(d?.v09.power||V09Power).running?'stopGenerator':null,
    battery:(r,d)=>(d?.v010.modules.energy.battery||V010Energy.battery).enabled?'disableBattery':null,
    drone:(r,d)=>!(d?.robots014||V014Robots.state).packed?'packDrone':null,
    empty:()=>null
  };
  function packReason(r,d){const rule=r&&rules[r.typeId];if(!rule||!BunkerLayout.roomActive(r.transform.room))return 'protected';return guards[rule.guard]?.(r,d)||null;}
  function roomBodies(room,records){const ids=new Set([...GameEquipment.ids,...records.map(r=>r.id),'robots014_dock_body']),b=BunkerLayout.rooms[room];return solidObjects('bunker').filter(o=>!ids.has(o.id)&&!o.id.startsWith('build:')&&!o.id.startsWith('v09door_')&&overlap(o,{x:b.left,y:b.top,w:b.right-b.left,h:b.bottom-b.top})).concat(records.filter(r=>r.placement==='installed'&&r.transform.room===room).map(footprint));}
  const authored=r=>{const s=EquipmentInstances.defaults.find(x=>x.id===r.id);return !!s&&['x','y','rotation','scene','room'].every(k=>s.transform[k]===r.transform[k]);};
  function reachable(room,records){
    const r=BunkerLayout.rooms[room],bodies=roomBodies(room,records),step=20,radius=18,cols=Math.floor((r.right-r.left)/step),rows=Math.floor((r.bottom-r.top)/step),cells=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
    const pos=i=>({x:r.left+(i%cols+.5)*step,y:r.top+(Math.floor(i/cols)+.5)*step});
    for(let i=0;i<cells.length;i++){const p=pos(i);cells[i]=p.x<r.left+radius+9||p.x>r.right-radius-9||p.y<r.top+radius+9||p.y>r.bottom-radius-9||bodies.some(b=>rectHit(p.x,p.y,radius,b))?1:0;}
    const d=BunkerLayout.door(room),entry=room==='corridor'?{x:(r.left+r.right)/2,y:r.top+40}:d.horizontal?{x:d.x+d.w/2,y:r.top+40}:{x:r.side==='left'?r.right-40:r.left+40,y:d.y+d.h/2};let start=-1,best=Infinity;
    for(let i=0;i<cells.length;i++)if(!cells[i]){const p=pos(i),n=Math.hypot(p.x-entry.x,p.y-entry.y);if(n<best){best=n;start=i;}}
    if(start<0||best>45)return false;const queue=[start];seen[start]=1;
    for(let k=0;k<queue.length;k++){const i=queue[k],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||nx>=cols||ny<0||ny>=rows||cells[n]||seen[n])continue;seen[n]=1;queue.push(n);}}
    if(room==='corridor'&&!zones.every(id=>{const door=BunkerLayout.door(id),side=BunkerLayout.rooms[id].side,p=door.horizontal?{x:door.x+door.w/2,y:door.y-35}:{x:door.x+(side==='left'?50:-35),y:door.y+door.h/2};return queue.some(i=>{const q=pos(i);return Math.hypot(q.x-p.x,q.y-p.y)<32;});}))return false;
    const accessible=(v,strict)=>{const b=footprint(v),f=GameFootprints.front(v),range=EquipmentInstances.definitions[v.typeId].range-4;return queue.some(i=>{const p=pos(i),q=contactPoint(b,p.x,p.y);return Math.hypot(p.x-q.x,p.y-q.y)<=range&&(!strict||Math.hypot(p.x-f.x,p.y-f.y)<28);});};
    if(!records.filter(v=>v.placement==='installed'&&v.transform.room===room).every(v=>{
      if(!accessible(v,!authored(v)))return false;
      const dock=EquipmentInstances.definitions[v.typeId].dock;if(!dock)return true;
      const p=EquipmentInstances.aabb(v.transform,{...dock,w:0,h:0});
      return p.x>r.left+24&&p.x<r.right-24&&p.y>r.top+24&&p.y<r.bottom-24&&!bodies.some(b=>rectHit(p.x,p.y,12,b))&&queue.some(i=>{const q=pos(i);return Math.hypot(p.x-q.x,p.y-q.y)<28;});
    }))return false;
    // Built-in medical/living fixtures remain reachable too; walls themselves
    // are not interaction targets. Their authored fronts are intentionally free.
    return interactionObjects('bunker').filter(o=>!GameEquipment.get(o.id)&&!records.some(v=>v.id===o.id)&&!o.id.startsWith('v09door_')&&!o.id.startsWith('switch_')&&!o.id.startsWith('lamp_')&&o.x>r.left+25&&o.x+(o.w||0)<r.right-25&&o.y>r.top+25&&o.y+(o.h||0)<r.bottom-25).every(o=>queue.some(i=>{const p=pos(i),q=contactPoint(o,p.x,p.y);return Math.hypot(p.x-q.x,p.y-q.y)<(o.range||50);}));
  }
  function checkRecord(record,records,occupants=true){
    checks++;if(record.transform?.scene==='surface')return GameSurfacePlacement.checkRecord(record,records,occupants);const rule=Object.hasOwn(rules,record.typeId)?rules[record.typeId]:null,t=record.transform;
    if(!rule||!t||t.scene!=='bunker'||!rule.rooms.includes(t.room)||!EquipmentInstances.turns.includes(t.rotation)||![t.x,t.y].every(Number.isFinite))return fail('room');
    const r=BunkerLayout.rooms[t.room],body=footprint(record);
    if(body.x<r.left+10||body.y<r.top+10||body.x+body.w>r.right-10||body.y+body.h>r.bottom-10)return fail('bounds');
    if(protectedAreas(t.room).some(area=>overlap(body,area)))return fail('door');
    const others=records.filter(v=>v.id!==record.id);if(roomBodies(t.room,others).some(b=>overlap(body,b,1)))return fail('overlap');
    if(occupants&&BunkerLayout.occupants('bunker').some(a=>rectHit(a.x,a.y,(a.radius||14)+2,body)))return fail('occupied');
    if(!reachable(t.room,others.concat(record)))return fail('passage');return {ok:true,record:copy(record)};
  }
  function check(selection,transform,occupants=true){
    if(typeof selection!=='string'||!transform||Object.keys(transform).sort().join()!=='room,rotation,scene,x,y')return fail('invalid_command');
    const r=GameEquipment.get(selection);if(!r||!rules[r.typeId])return fail('type');if(r.placement!=='packed')return fail('installed');
    const record={...copy(r),placement:'installed',ownerId:null,transform:copy(transform)};if(DefenseDefinitions.types[r.typeId]){record.state.settings.mountWall='';record.state.settings.fallen=false;}return checkRecord(record,GameEquipment.capture(),occupants);
  }
  function access(actor){return !actor.dead&&(actor.scene==='surface'&&!V013City.floor||actor.scene==='bunker'&&(actor.entity.floor??1)===1);}
  function coreAccess(actor){return GameCampaign.access(actor,BunkerLayout.core.id,false).available;}
  function make(typeId,actorId){const rule=rules[typeId];if(!rule?.craftable)return fail('type');if(GameEquipment.ids.length>=192||GameEquipment.capture().filter(r=>r.typeId===typeId).length>=rule.limit)return fail('limitReached');
    if(window.GameAvailability&&!GameAvailability.buildable(typeId).available)return fail('researchLocked');
    if(GameCarried.free()<0)return fail('inventoryFull');
    const record=GameEquipment.create(typeId,centered(typeId,rule.rooms.includes('reserve_l1')?'reserve_l1':rule.rooms[0],1900,480),actorId,typeId==='storage_crate'?storageChests.length:undefined),next=GameEquipment.capture().concat(record);GameEquipment.validate(next);
    if(Object.entries(rule.cost).some(([t,n])=>V010Inventory.materialCount(t)<n))return fail('materials');
    if(window.GameChapterOne&&!GameChapterOne.spendAllowed(rule.cost,1,typeId))return fail('bootstrapReserve');
    if(!V010Inventory.consumeMaterials(rule.cost,1,typeId))return fail('materials');
    if(typeId==='storage_crate')storageChests.push({name:'',icon:'📦',items:[]});GameEquipment.change(record);if(!GameCarried.add(record.id))throw Error('Carried slot changed during synchronous craft');V09Craft.syncInstances();window.GameMovable?.sync();window.GameChapterOne?.recordAction('crafted',record);return {ok:true,instanceId:record.id,placement:'packed'};
  }
  function perform(c,actor){const p=c.payload||{};if(p.geometry!==geometryRevision)return fail('world_changed');
    if(c.action==='craft'){if(!coreAccess(actor))return fail('out_of_reach');return make(c.instanceId.slice(8),actor.id);}
    if(c.action==='rename'){if(!coreAccess(actor))return fail('out_of_reach');const room=c.instanceId.slice(5),name=p.name;if(!validRoomName(name))return fail('roomName');roomNames[room]=copy(name);return {ok:true,room};}
    const r=GameEquipment.get(c.instanceId);if(!r||!rules[r.typeId])return fail('protected');
    if(c.action==='pack'){if(r.placement!=='installed')return fail('packed');if(!GameEquipmentRuntime.access(actor,r))return fail('out_of_reach');const reason=packReason(r);if(reason)return fail(reason);if(GameCarried.free()<0)return fail('inventoryFull');const hold=pickups.get(actor.id);if(!hold||hold.id!==r.id||hold.token!==p.pickupToken||performance.now()-hold.startedAt<3000)return fail('holdRequired');if(!pickupValid(actor,hold))return fail('pickupChanged');GameEquipment.change({...copy(r),placement:'packed',ownerId:actor.id});if(!GameCarried.add(r.id))throw Error('Carried slot changed during synchronous pickup');pickups.delete(actor.id);}
    else if(c.action==='place'){if(r.ownerId!==actor.id||!GameCarried.owns(r.id))return fail('actor_denied');if(p.transform?.scene!==actor.scene)return fail('room');const result=check(c.instanceId,p.transform);if(!result.ok)return result;if(DefenseDefinitions.types[r.typeId]){result.record.state.settings.mountWall='';result.record.state.settings.fallen=false;}GameEquipment.change(result.record);GameCarried.remove(r.id);window.GameChapterOne?.recordAction('placed',result.record);}
    else return fail('action');
    V09Craft.syncInstances();window.GameMovable?.sync();invalidateGeometry();return {ok:true,instanceId:r.id,placement:c.action==='pack'?'packed':'installed'};
  }
  const commands=EquipmentCommands.create({get:id=>id.startsWith('catalog:')&&Object.hasOwn(rules,id.slice(8))||id.startsWith('room:')&&zones.includes(id.slice(5))?{id}:GameEquipment.get(id)}, {actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access,perform,changed:()=>{queueGameSave();v09PowerChanged();window.GameBuildableInventory?.render();}});
  function execute(c){return GameFlow.paused?{ok:false,reason:'world_paused',revision:commands.revision}:commands.execute(c);}
  function request(selection,action,transform,pickupToken){if(typeof selection!=='string')return fail('invalid_command');const instanceId=action==='craft'?(selection.startsWith('catalog:')?selection:'catalog:'+selection):selection;return execute({actorId:GameActors.localId,instanceId,action,payload:{geometry:geometryRevision,...(pickupToken?{pickupToken}:{}),...(transform?{transform:copy(transform)}:{})},expectedRevision:commands.revision,requestId:'placement:'+commands.revision+':'+(++sequence)});}
  function pickupFingerprint(r){return JSON.stringify([r,r.refs.device?V09Power.devices[r.refs.device]?.enabled:null,r.refs.job?V09Craft.craftQueue.paused[r.id]:null,packReason(r)]);}
  function pickupValid(actor,h){const r=GameEquipment.get(h.id);return !!r&&r.placement==='installed'&&access(actor)&&!GameFlow.paused&&!menuOpen&&GameEquipmentRuntime.access(actor,r)&&Math.hypot(actor.entity.x-h.x,actor.entity.y-h.y)<=3&&h.fingerprint===pickupFingerprint(r)&&!packReason(r);}
  function beginPickup(id,actorId=GameActors.localId){const actor=GameActors.get(actorId),r=GameEquipment.get(id);if(!actor||actor.id!==GameActors.localId)return fail('actor_denied');if(!r||!rules[r.typeId])return fail('protected');if(GameFlow.paused||menuOpen)return fail('world_paused');if(r.placement!=='installed')return fail('packed');if(!access(actor)||!GameEquipmentRuntime.access(actor,r))return fail('out_of_reach');const reason=packReason(r);if(reason)return fail(reason);if(GameCarried.free()<0)return fail('inventoryFull');const h={id,token:'pickup:'+actor.id+':'+(++pickupSequence),startedAt:performance.now(),fingerprint:pickupFingerprint(r),x:actor.entity.x,y:actor.entity.y,revision:commands.revision,geometry:geometryRevision};pickups.set(actor.id,h);return {ok:true,...h};}
  function cancelPickup(actorId=GameActors.localId){pickups.delete(actorId);}
  function pollPickup(token,actorId=GameActors.localId){const h=pickups.get(actorId),a=GameActors.get(actorId);return !!h&&h.token===token&&!!a&&pickupValid(a,h);}
  function validRoomName(n){return !!n&&Object.keys(n).sort().join()==='custom,preset'&&(n.preset===null||roomPresets.includes(n.preset))&&typeof n.custom==='string'&&n.custom.length<=24&&!/[<>\u0000-\u001f\u007f]/.test(n.custom)&&(n.preset===null?!!n.custom.trim():n.custom==='');}
  function roomName(id){const n=roomNames[id];if(id==='yard')return I18n.t('control.surface');return n?(n.preset?I18n.t('build.room.'+n.preset):n.custom):I18n.t('core.room.'+id);}
  function rename(room,name){return execute({actorId:GameActors.localId,instanceId:'room:'+room,action:'rename',payload:{geometry:geometryRevision,name},expectedRevision:commands.revision,requestId:'room-name:'+commands.revision+':'+(++sequence)});}
  // Historical 12 -> 13 remains intact; 13 -> 14 adds carried ownership/state.
  function migrate(d){const e=d.equipment032;if(!e||e.schema!==1)throw Error('Missing legacy equipment');EquipmentInstances.createRegistry(EquipmentInstances.defaults).validate(e.instances,true);e.schema=2;for(const r of e.instances)r.placement='installed';d.placement035={schema:1,commands:{revision:0,receipts:[]}};}
  function migrateCorrective(d){if(d.equipment032?.schema!==2||d.placement035?.schema!==1)throw Error('Missing Stage D state');d.equipment032.schema=3;for(const r of d.equipment032.instances){r.ownerId=r.placement==='packed'?(d.identity027?.playerId||'player:1'):null;r.state=EquipmentInstances.state();}d.placement035.schema=2;d.placement035.roomNames={};window.GameProductionSplit?.migrate(d);GameChapterOne.migrateCorrective(d);}
  function validate(d){
    const s=d.placement035;if(!s||s.schema!==2||Object.keys(s).sort().join()!=='commands,roomNames,schema'||!s.roomNames||Array.isArray(s.roomNames)||Object.entries(s.roomNames).some(([id,n])=>!zones.includes(id)||!validRoomName(n)))throw Error('Invalid placement state');commands.validate(s.commands);const records=d.equipment032.instances;GameEquipment.validate(records);
    for(const r of records){if(r.placement==='packed'){if(r.ownerId!==(d.identity027?.playerId||'player:1')||packReason(r,d))throw Error('Unsafe packed equipment');continue;}if(rules[r.typeId]&&!authored(r)&&!checkRecord(r,records,false).ok)throw Error('Invalid saved placement');}
    const containers=records.filter(r=>r.refs.container?.startsWith('storage:')).map(r=>Number(r.refs.container.slice(8)));if(d.storage.length!==14+containers.filter(i=>i>=14).length||containers.some(i=>i>=d.storage.length))throw Error('Orphan storage container');return true;
  }
  const capture=()=>({schema:2,commands:commands.capture(),roomNames:copy(roomNames)});
  GameSave.extend('capture','equipment.placement',function(previous){const d=previous();d.placement035=capture();return d;});
  GameSave.extend('decode','equipment.placement',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','equipment.placement',function(previous,d){validate(d);const result=previous(d);commands.restore(d.placement035.commands);pickups.clear();window.GamePickup?.cancel();roomNames=copy(d.placement035.roomNames);window.GameMovable?.sync();window.GamePlacementUI?.cancel();invalidateGeometry();return result;});
  GameState.register('placement',{capture},{source:'equipment/placement.js',saved:['placement035'],transient:['client preview','request sequence','validation counters']});
  return Object.freeze({rules,zones,footprint,protectedArea,protectedAreas,centered,check,checkRecord,reachable,blockedByWork,packReason,access,execute,request,migrate,migrateCorrective,validate,capture,roomName,roomPresets,rename,beginPickup,cancelPickup,pollPickup,get revision(){return commands.revision;},metrics:()=>({checks})});
})();
