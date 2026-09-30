/* Pass A adds floor/save/water/spoil state; existing farm and command owners stay authoritative. */
window.BunkerPassA=(()=>{
 const B=GameplayBalance.farm,copy=x=>JSON.parse(JSON.stringify(x)),tr=(k,p)=>I18n.t('farm.'+k,p),fresh=()=>({readyAt:null,rotten:false,warned:false});
 const water={clean:0,produced:0};let rot=Array.from({length:5},fresh),at=AgricultureTime.now(),seq=0,recovered=[];
 const tank={id:'clean_water_tank',kind:'clean_water',x:4861,y:-88,w:104,h:105,range:58},fixtures=[tank,{id:'water_pump',x:4814,y:184,w:42,h:44},{id:'water_purifier',x:4912,y:184,w:52,h:44}];
 function readyAt(i,n){if(rot[i].readyAt===null)rot[i].readyAt=n;}
 const rotten=i=>rot[i]?.rotten===true,remaining=i=>rot[i].readyAt===null?null:Math.max(0,rot[i].readyAt+B.spoilDays*WorldClock.dayMs-AgricultureTime.now());
 function tick(){const now=AgricultureTime.now(),dt=Math.max(0,now-at);at=now;if(GameSave.restoring||GameFlow.paused||document.hidden||playerDead)return;
  if(dt&&L2Systems.water&&devicePowered('water_system')){const n=Math.min(B.cleanCapacity-water.clean,dt/WorldClock.dayMs*B.waterPerDay);water.clean+=n;water.produced+=n;}
  // Stored clean water reaches the irrigation buffer by gravity pipes; only Pump/Purifier need power.
  {const n=Math.min(water.clean,B.waterCapacity-V011Farm.state.water);water.clean-=n;V011Farm.state.water+=n;}
  V011Farm.settle(now);for(let i=0;i<5;i++){if(farmState[i].crop===null){rot[i]=fresh();continue;}if(!V011Farm.ready(i))continue;readyAt(i,now);const left=remaining(i);if(left<=0)rot[i].rotten=true;else if(left<=B.warnDays*WorldClock.dayMs&&!rot[i].warned){rot[i].warned=true;V010.log(tr('spoilWarning',{n:i+1}));}}
 }
 function roomFor(type,n){let free=0;for(let i=0;i<BAG_SLOTS;i++){const s=bag[i];free+=!s?itemStackLimit(type,true):s.type===type?itemStackLimit(type,true)-s.qty:0;}return free>=n;}
 const commands=EquipmentCommands.create({get:id=>id==='water'||/^bed[0-4]$/.test(id)?{id}:null},{actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access(a,r){if(a.dead)return false;const b=r.id==='water'?tank:getFarmBeds()[Number(r.id.slice(3))];return a.scene==='bunker'&&b&&rectHit(a.entity.x,a.entity.y,75,b);},perform(c){tick();
  if(c.action==='collect'&&c.instanceId==='water'){const n=Math.min(Math.floor(water.clean),Math.max(1,Math.min(100,Math.floor(c.payload?.amount||1))));if(!n)return {ok:false,reason:'empty'};if(!roomFor('water',n))return {ok:false,reason:'space'};addItem('water',n);water.clean-=n;return {ok:true,amount:n};}
  if(c.action==='clear'&&/^bed[0-4]$/.test(c.instanceId)){const i=Number(c.instanceId.slice(3));if(!rotten(i))return {ok:false,reason:'state'};const n=Math.ceil(V011Farm.plants(farmState[i]).filter(p=>p.planted&&!p.harvested).length/4);if(!roomFor('plant_waste',n))return {ok:false,reason:'space'};addItem('plant_waste',n);farmState[i]={crop:null,plantedAt:0};rot[i]=fresh();return {ok:true,amount:n};}
  return {ok:false,reason:'state'};
 },changed(){queueGameSave();renderBag();}});
 function request(id,action,payload={}){if(GameFlow.paused)return {ok:false,reason:'paused'};const r=commands.execute({actorId:GameActors.localId,instanceId:id,action,payload,expectedRevision:commands.revision,requestId:'bunker-a:'+commands.revision+':'+(++seq)});if(!r.ok)message(tr(r.reason==='space'?'space':r.reason==='empty'?'tankEmpty':'unavailable'));return r;}
 function openTank(){tick();const o=v09Overlay('cleanWater043',tr('cleanTank')),b=o.querySelector('.v09Body');b.innerHTML='';const p=document.createElement('p');p.textContent=tr('tankStatus',{n:Math.floor(water.clean),buffer:Math.floor(V011Farm.state.water)});b.append(p);for(const n of [1,5,10])b.append(v09Button(tr('collect',{n}),()=>{request('water','collect',{amount:n});openTank();}));openOverlay(o);}
 const up={id:'stairs_l2_up',kind:'bunker_floor',x:4635,y:-385,w:130,h:175,range:75};
 function go(floor){if(scene!=='bunker'||GameFlow.paused||playerDead||![1,2].includes(floor))return false;const from=BunkerLayout.floorAt(player.x,player.y);if(from===floor||!rectHit(player.x,player.y,75,from===1?BunkerLayout.stairs[1]:up))return false;stopControls();cancelNavigation();V014Controls.stopRoute();V011Living.stop();window.GamePlacementUI?.cancel();Object.assign(player,floor===2?{x:4700,y:-160}:{x:1300,y:-170});player.floor=floor;player.wallLevel=false;const d=V014Robots.state;if(!d.packed&&d.scene==='bunker'&&d.task==='follow'){d.x=player.x+38;d.y=player.y+38;V014Robots.motion.reset();}CommandCoreUI.syncLocation();const v=V010Camera.view();camera.x=player.x-v.w/2;camera.y=player.y-v.h/2;invalidateGeometry();V091Light.invalidate();queueGameSave();return true;}
 // 0.43 Phase 0: player floor travel goes through the shared fade (black -> move -> fade in).
 // go() stays the synchronous move; travel() validates, locks re-entry and runs go() under the fade.
 let travelling=false,travelToken=0;
 function travel(floor){if(travelling||scene!=='bunker'||GameFlow.paused||playerDead||![1,2].includes(floor))return false;const from=BunkerLayout.floorAt(player.x,player.y);if(from===floor||!rectHit(player.x,player.y,75,from===1?BunkerLayout.stairs[1]:up))return false;travelling=true;const token=++travelToken;
  transition(I18n.message(floor===2?'bunker.floor.l2':'bunker.floor.l1'),()=>{if(token!==travelToken)return;travelling=false;if(scene!=='bunker'||playerDead)return;const at=from===1?BunkerLayout.stairs[1]:up;if(!rectHit(player.x,player.y,75,at))Object.assign(player,from===1?{x:at.x+at.w/2,y:at.y+at.h-30}:{x:at.x+at.w/2,y:at.y+at.h});go(floor);},{hold:300,after:200});return true;}
 const oldObjects=interactionObjects;interactionObjects=function(s=scene){const a=oldObjects(s);return s==='bunker'?a.filter(o=>!BunkerLayout.removed(o.id)).concat({...tank,name:tr('cleanTank')},{...up,name:I18n.t('bunker.l2.up')}):a;};
 const oldSolids=solidObjects;solidObjects=function(s){const a=oldSolids(s);return s==='bunker'?a.filter(o=>!BunkerLayout.removed(o.id)).concat(fixtures):a;};
 const oldExecute=executeInteraction;executeInteraction=function(o){if(o?.id===up.id){if(canInteract(o,player.x,player.y))travel(1);return;}if(o?.id===tank.id){if(canInteract(o,player.x,player.y))openTank();return;}return oldExecute(o);};
 function capture(){return {schema:1,floor:scene==='bunker'?BunkerLayout.floorAt(player.x,player.y):1,water:copy(water),rot:copy(rot),recovered:copy(recovered),commands:commands.capture()};}
 function validate(d){const s=d.bunker043;if(!s||s.schema!==1||![1,2].includes(s.floor)||!s.water||!Number.isFinite(s.water.clean)||s.water.clean<0||s.water.clean>B.cleanCapacity+1e-6||!Number.isFinite(s.water.produced)||s.water.produced<0||!Array.isArray(s.rot)||s.rot.length!==5||!Array.isArray(s.recovered)||s.recovered.length>192||s.recovered.some(id=>!d.equipment032.instances.some(r=>r.id===id)))throw Error('Invalid Pass A');if(d.player.scene==='bunker'&&s.floor!==BunkerLayout.floorAt(d.player.x,d.player.y))throw Error('Invalid floor');for(const r of s.rot)if(!r||typeof r.rotten!=='boolean'||typeof r.warned!=='boolean'||r.readyAt!==null&&(!Number.isFinite(r.readyAt)||r.readyAt<0||r.readyAt>d.bunker030.agricultureAt)||r.rotten&&r.readyAt===null)throw Error('Invalid spoil clock');commands.validate(s.commands);}
 function migrate(d){if(d.bunker043)return;const clock=d.bunker030.agricultureAt,s=d.bunker043={schema:1,floor:1,water:{clean:0,produced:0},rot:Array.from({length:5},fresh),recovered:[],commands:{revision:0,receipts:[]}};
  if(d.farmV011){const n=d.farmV011.water;d.farmV011.water=Math.min(B.waterCapacity,n);s.water.clean=Math.min(B.cleanCapacity,Math.max(0,n-B.waterCapacity));d.farmV011.at=clock;}
  for(let i=0;i<5;i++){const f=d.farm[i];if(f.crop===null)continue;const old=FARM_CROP_MINUTES[f.crop]*60000,total=farmGrowMs(f.crop),n=B.crops[farmCrops[f.crop].itemType].yield;f.elapsedMs=Math.min(total,Math.max(0,f.elapsedMs/old*total));if(d.farmV011)d.farmV011.grown[i]=Math.min(total,d.farmV011.grown[i]/old*total);const a=d.farm014?.beds[i];if(a){const keep=a.filter(p=>p.planted&&!p.harvested).slice(0,n);for(const p of keep){const ratio=p.elapsed/p.duration,v=Math.max(.9,Math.min(1.1,p.duration/old));p.duration=Math.round(total*v);p.elapsed=p.duration*ratio;p.qty=1;}d.farm014.beds[i]=Array.from({length:50},(_,j)=>keep[j]||{planted:false,harvested:true,elapsed:0,duration:0,qty:1});if(keep.length&&keep.every(p=>p.elapsed>=p.duration))s.rot[i].readyAt=clock;if(d.farm014.irrigation)d.farm014.irrigation[i]=null;}}
  const p=d.v09.power;for(const id of Object.keys(V09Power.rooms))if(!Object.hasOwn(p.roomEnabled,id))p.roomEnabled[id]=true;
  const keys=new Set([...Object.keys(V09Power.devices).filter(id=>!GameEquipment.get(id)?.refs.device),...d.equipment032.instances.map(r=>r.refs.device).filter(Boolean)]);for(const id of keys)if(!Object.hasOwn(p.deviceEnabled,id))p.deviceEnabled[id]=true;
  for(const x of v09Doors)if(!p.doors.some(v=>v.id===x.id))p.doors.push({id:x.id,open:0,away:0,manual:false});for(const x of V018Build.doorRecords)if(!d.building018.doors.some(v=>v.id===x.id))d.building018.doors.push({id:x.id,level:1,hp:V018Build.definition(x).levels[1]});
  const seeds=new Map(EquipmentInstances.defaults.map(r=>[r.id,r]));
  for(const r of d.equipment032.instances){const seed=seeds.get(r.id),old=EquipmentInstances.legacyDefaults.find(v=>v.id===r.id),authored=old&&['x','y','room'].every(k=>r.transform[k]===old.transform[k]);
   if(authored&&seed&&(/^chest[0-9]$/.test(r.id)||r.id==='feed_craft')){r.transform=copy(seed.transform);continue;}
   const room=r.transform.room,displaced=['room4','room6','room7','reserve_l1','storage','farm'].includes(room)||room==='corridor'&&(r.transform.y>750||r.transform.x<1390&&r.transform.x+EquipmentInstances.definitions[r.typeId].footprint.w>1030&&r.transform.y<410&&r.transform.y+EquipmentInstances.definitions[r.typeId].footprint.h>130);
   if(r.placement==='installed'&&displaced){r.placement='packed';r.ownerId=d.identity027?.playerId||'player:1';r.state.settings.layoutRecovery=true;s.recovered.push(r.id);}const rule=EquipmentInstances.placement[r.typeId];if(rule&&!rule.rooms.includes(r.transform.room))r.transform.room=rule.rooms[0];
  }
  const slots=ITEM[d.equipment.backpack.type].capacity;for(const id of s.recovered){if(d.bag.some(v=>v?.instanceId===id)||d.carry0353.legacyOverflow.includes(id))continue;let i=0;while(i<slots&&d.bag[i])i++;if(i<slots)d.bag[i]=GameCarried.token(id);else d.carry0353.legacyOverflow.push(id);}
  if(d.player.scene==='bunker'&&(d.player.x>=3500||d.player.y>750||d.player.x<810&&d.player.y>260||d.player.x>1610&&d.player.y>260))Object.assign(d.player,BunkerLayout.arrivals[0]);if(d.player.scene==='bunker'){d.v091.fortress.x=d.player.x;d.v091.fortress.y=d.player.y;}
 }
 // 0.43 Phase 0: a format-24 save written before Phase 0 keeps the old Pantry crate/feed-mill spots and
 // may hold equipment where the new kitchen/medical furniture, the horizontal bed or the moved doors now
 // are. Move the three authored Pantry objects with the layout; pack anything else that no longer fits
 // (same recovery path as Pass A: backpack token + one message), so current saves keep loading.
 function phase0Layout(d){const list=d.equipment032?.instances;if(!Array.isArray(list)||!d.bunker043)return;
  const seeds=new Map(EquipmentInstances.defaults.map(r=>[r.id,r])),before={chest8:[4830,-208],chest9:[5135,-208],feed_craft:[5000,-202]};
  for(const r of list){const o=before[r.id],seed=seeds.get(r.id);if(o&&seed&&r.placement==='installed'&&r.transform?.scene==='bunker'&&r.transform.x===o[0]&&r.transform.y===o[1])r.transform=copy(seed.transform);}
  const packed=[];
  // Only what Phase 0 itself displaced: the bedroom (no longer a placement room) and anything under the new
  // kitchen/medical furniture. Authored objects are never packed; any other invalid record is still rejected.
  const furniture=['kitchen','fridge','dining','medical_table','cabinet'].map(id=>BunkerLayout.fixture(id)),hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  for(const r of list){if(r.placement!=='installed'||r.transform?.scene!=='bunker'||!GamePlacement.rules[r.typeId]||seeds.has(r.id))continue;
   if(r.transform.room!=='room7'&&!(['room6','room4'].includes(r.transform.room)&&furniture.some(f=>hit(GamePlacement.footprint(r),f))))continue;
   if(GamePlacement.checkRecord(r,list.filter(v=>!packed.includes(v)),false).ok)continue;
   r.placement='packed';r.ownerId=d.identity027?.playerId||'player:1';r.state.settings.layoutRecovery=true;packed.push(r);if(!d.bunker043.recovered.includes(r.id))d.bunker043.recovered.push(r.id);const rule=EquipmentInstances.placement[r.typeId];if(rule&&!rule.rooms.includes(r.transform.room))r.transform.room=rule.rooms[0];}
  const slots=ITEM[d.equipment.backpack.type].capacity;for(const r of packed){if(d.bag.some(v=>v?.instanceId===r.id)||d.carry0353.legacyOverflow.includes(r.id))continue;let i=0;while(i<slots&&d.bag[i])i++;if(i<slots)d.bag[i]=GameCarried.token(r.id);else d.carry0353.legacyOverflow.push(r.id);}
 }
 GameState.register('bunkerPassA',{capture},{source:'base/pass-a.js',saved:['bunker043'],transient:['local request sequence','water tick cursor']});
 GameSave.extend('capture','bunker.pass-a',function(previous){tick();const d=previous();d.bunker043=capture();return d;});
 GameSave.extend('decode','bunker.pass-a',function(previous,raw){const d=previous(raw);validate(d);return d;});
 GameSave.extend('restore','bunker.pass-a',function(previous,d){validate(d);if(travelling)el('fade')?.classList.remove('show');travelToken++;travelling=false;/* a load or new game cancels a floor fade in flight */Object.assign(water,d.bunker043.water);rot=copy(d.bunker043.rot);recovered=copy(d.bunker043.recovered);AgricultureTime.restore(d.bunker030.agricultureAt);at=AgricultureTime.now();const result=previous(d);player.floor=d.bunker043.floor;commands.restore(d.bunker043.commands);if(recovered.length){message(tr('recovered',{n:recovered.length}));recovered=[];}return result;});
 return Object.freeze({water,fixtures,tank,up,tick,readyAt,rotten,remaining,request,commands,capture,validate,migrate,phase0Layout,go,travel,travelling:()=>travelling,clear:i=>request('bed'+i,'clear')});
})();
