/* Defense runtime ports. Equipment owns identity, transform, HP, ammo and aim;
   existing power owns ON/OFF. Commands own bounded persisted receipts only. */
window.GameDefense=(()=>{
 const defs=DefenseDefinitions.types,copy=o=>JSON.parse(JSON.stringify(o)),fail=reason=>({ok:false,reason}),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const is=r=>!!defs[r?.typeId],records=()=>GameEquipment.records.filter(is),pivot=r=>GameEquipment.point(r.id,defs[r.typeId].pivot.x,defs[r.typeId].pivot.y);
 let sequence=0,tickClock=0;const runtime=new Map();const metrics={scans:0,shots:0,attacks:0};
 const transient=id=>{if(!runtime.has(id))runtime.set(id,{shot:0,scan:0,target:null,angle:null,flash:0,cursor:0,tracer:null});return runtime.get(id);};
 const operational=r=>r.placement==='installed'&&r.state.condition.hp>0&&!r.state.settings.fallen;
 function reachable(actor,r){if(!r||actor.dead||actor.scene!==r.transform.scene||r.placement!=='installed'||actor.scene==='surface'&&V013City.floor)return false;const p=actor.entity,b=GameFootprints.forRecord(r),q=contactPoint(b,p.x,p.y);if(Math.hypot(q.x-p.x,q.y-p.y)>64)return false;if(r.state.settings.mountWall||r.state.settings.fallen)return V016Turret.reachable({...pivot(r),wallId:r.state.settings.mountWall},actor);return lineClear(p.x,p.y,q.x,q.y,0,actor.scene,r.id);}
 function change(r,{geometry=false}={}){GameEquipment.change(r);if(geometry)invalidateGeometry();queueGameSave();}
 function repairCost(r){return {iron:Math.ceil((r.state.condition.maxHp-r.state.condition.hp)/DefenseDefinitions.repairHPPerIron)};}
 function perform(c,actor,r){
  if(!is(r)||r.placement!=='installed')return fail('missing_instance');const p=c.payload||{},d=defs[r.typeId],next=copy(r);
  // State fingerprint prevents commands planned before combat damage/other
  // operations from spending against a different state, beyond UI revision.
  if(p.state!==JSON.stringify(r.state))return fail('world_changed');
  if(c.action==='aim'){if(r.typeId!=='searchlight'||!Number.isFinite(p.angle)||Math.abs(p.angle)>Math.PI)return fail('invalid_command');next.state.settings.angle=wrap(p.angle);change(next);return {ok:true};}
  if(c.action==='repair'){
   if(r.state.condition.hp>=r.state.condition.maxHp)return fail('already_full');if(heldItem()!=='hammer'||bagCount('hammer')<1)return fail('hammer');
   if(r.state.settings.fallen)return fail('fallen');
   if(r.state.condition.hp===0){const result=GamePlacement.checkRecord({...next,state:{...next.state,condition:{...next.state.condition,hp:1}}},GameEquipment.capture());if(!result.ok)return result;}
   const cost=repairCost(r);if(!V010Inventory.consumeMaterials(cost,1,'defense:repair'))return fail('materials');next.state.condition.hp=next.state.condition.maxHp;change(next,{geometry:true});GameAudio.play('repair');return {ok:true,cost};
  }
  if(!d.ammoType)return fail('unknown_action');
  if(c.action==='load'){
   if(!Number.isSafeInteger(p.units)||p.units<1||p.units>d.capacity)return fail('invalid_command');const units=Math.min(p.units,d.capacity-r.state.settings.ammo,bagCount(d.ammoType));if(!units)return fail('ammo');if(removeItem(d.ammoType,units)!==units)return fail('ammo');next.state.settings.ammo+=units;change(next);GameAudio.play('reload');return {ok:true,units};
  }
  if(c.action==='unload'){
   if(!r.state.settings.ammo)return fail('ammo');const left=addItem(d.ammoType,r.state.settings.ammo),units=r.state.settings.ammo-left;if(!units)return fail('inventoryFull');next.state.settings.ammo=left;change(next);return {ok:true,units};
  }
  if(c.action==='upgrade'){
   if(r.state.level>=DefenseDefinitions.maxLevel)return fail('max_level');if(r.state.condition.hp<r.state.condition.maxHp)return fail('repair_first');const level=r.state.level+1,cost={...Object.fromEntries(Object.entries(DefenseDefinitions.upgrade).map(([k,v])=>[k,v*level])),...(level>=4?{advanced_parts:(level-3)*5}:{})};if(!V010Inventory.consumeMaterials(cost,1,'defense:upgrade'))return fail('materials');next.state.level++;change(next);GameAudio.play('upgrade');return {ok:true,cost};
  }
  return fail('unknown_action');
 }
 const commands=EquipmentCommands.create(GameEquipment,{actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access:reachable,perform,changed:()=>{queueGameSave();renderBag();window.GameDefenseUI?.refresh();}});
 function execute(c){return GameFlow.paused?{...fail('world_paused'),revision:commands.revision}:commands.execute(c);}
 function request(id,action,p={}){const r=GameEquipment.get(id);return execute({actorId:GameActors.localId,instanceId:id,action,payload:{...p,state:JSON.stringify(r?.state)},expectedRevision:commands.revision,requestId:'defense:'+commands.revision+':'+(++sequence)});}
 // Simulation damage port; no player-facing arbitrary damage command.
 function damage(id,amount){const r=GameEquipment.get(id);if(!is(r)||r.placement!=='installed'||r.state.condition.hp<=0||!Number.isFinite(amount)||amount<=0||GameFlow.paused)return false;const n=copy(r);n.state.condition.hp=Math.max(0,n.state.condition.hp-amount);change(n,{geometry:n.state.condition.hp===0});const p=pivot(r);GameAudio.play(n.state.condition.hp?'constructionHit':'constructionBreak',{...p,scene:r.transform.scene});return true;}
 function clear(r,z){const p=pivot(r),wallId=r.state.settings.mountWall;if(wallId)return V016Turret.clear({...p,wallId},z);return lineClear(p.x,p.y,z.x,z.y,0,'surface',r.id);}
 function shoot(r,z){const d=defs[r.typeId],p=pivot(r);if(!d.ammoType||!operational(r)||scene!==r.transform.scene||GameFlow.paused||!devicePowered(r.refs.device)||r.state.settings.ammo<=0||!z?.alive||z.health<=0||Math.hypot(z.x-p.x,z.y-p.y)>d.range||!clear(r,z))return false;
  let first=z,at=1;const dx=z.x-p.x,dy=z.y-p.y,len=dx*dx+dy*dy;for(const q of zombies)if(q.alive&&q.health>0&&len){const u=clamp(((q.x-p.x)*dx+(q.y-p.y)*dy)/len,0,1);if(u<at&&Math.hypot(p.x+u*dx-q.x,p.y+u*dy-q.y)<(q.radius||16)){at=u;first=q;}}
  const n=copy(r);n.state.settings.ammo--;const v=transient(r.id);n.state.settings.angle=v.angle??r.state.settings.angle;change(n);v.shot=d.intervalMs/1000;v.flash=.07;v.tracer={x:first.x,y:first.y};hitZombie(first,Math.round(d.damage*(1+DefenseDefinitions.damagePerLevel*r.state.level)),{fixedDamage:true});GameAudio.play('turretFire',{...p,scene:'surface',radius:660});createNoise(p.x,p.y,600);metrics.shots++;return true;
 }
 function acquire(r,v){const p=pivot(r),d=defs[r.typeId];if(v.target?.alive&&v.target.health>0&&Math.hypot(v.target.x-p.x,v.target.y-p.y)<=d.range&&clear(r,v.target))return v.target;const a=zombies.filter(z=>z.alive&&z.health>0&&(z.x-p.x)**2+(z.y-p.y)**2<=d.range*d.range).sort((a,b)=>(a.x-p.x)**2+(a.y-p.y)**2-(b.x-p.x)**2-(b.y-p.y)**2);for(let i=0;i<Math.min(8,a.length);i++){const z=a[v.cursor++%a.length];metrics.scans++;if(clear(r,z))return z;}return null;}
 function settle(){for(const r of records())if(r.placement==='installed'&&r.state.settings.mountWall&&V015Base.byId.get(r.state.settings.mountWall)?.hp<=0){const n=copy(r),p=pivot(r),a=Math.atan2(600-p.y,800-p.x),q=V015Base.freePoint(p.x+Math.cos(a)*72,p.y+Math.sin(a)*72,10);if(q){n.transform.x+=q.x-p.x;n.transform.y+=q.y-p.y;}n.state.settings.mountWall='';n.state.settings.fallen=true;change(n,{geometry:true});}}
 function tick(ms){if(GameFlow.paused)return;const dt=clamp(Number(ms)||0,0,100)/1000;tickClock+=dt;if(tickClock>=.25){tickClock=0;settle();}if(scene!=='surface'||V013City.floor)return;
  const served=V09Power.allocation().served;for(const r of records()){const d=defs[r.typeId];if(!d.ammoType)continue;const v=transient(r.id);v.flash=Math.max(0,v.flash-dt);v.shot=Math.max(0,v.shot-dt);v.scan-=dt;if(!operational(r)||!served.has(r.refs.device)||!r.state.settings.ammo){v.target=null;continue;}if(v.scan<=0){v.scan=.2;v.target=acquire(r,v);}const z=v.target;if(!z?.alive)continue;const p=pivot(r),a=Math.atan2(z.y-p.y,z.x-p.x);v.angle=wrap((v.angle??r.state.settings.angle)+clamp(wrap(a-(v.angle??r.state.settings.angle)),-d.turnRate*dt,d.turnRate*dt));if(Math.abs(wrap(a-v.angle))<.055&&v.shot<=0)shoot(r,z);}
 }
 // Existing monster simulation calls this port only after reaching the yard.
 function breachTarget(z,now,stats){if(scene!=='surface'||V013City.floor||z.x<254||z.x>1346||z.y<214||z.y>986)return null;let best=null,bestDistance=260;
  for(const r of records()){if(!operational(r)||r.transform.scene!=='surface'||r.state.settings.mountWall)continue;const b=GameFootprints.forRecord(r),q=contactPoint(b,z.x,z.y),dist=Math.hypot(q.x-z.x,q.y-z.y);if(dist<bestDistance&&lineClear(z.x,z.y,q.x,q.y,0,'surface',r.id)){best={r,q,dist};bestDistance=dist;}}
  if(!best)return null;if(best.dist<(z.radius||16)+16&&now-z.lastAttack>stats.cooldown){z.lastAttack=now;damage(best.r.id,stats.damage*2*V010World.settings.enemyStrength);metrics.attacks++;GameAudio.play('zombieAttack',{x:z.x,y:z.y,scene:'surface',owner:z});}return best.q;
 }
 function blast(z,range,amount){if(scene!=='surface')return;for(const r of records()){if(!operational(r)||r.transform.scene!=='surface')continue;const p=pivot(r);if(Math.hypot(p.x-z.x,p.y-z.y)<=range&&lineClear(z.x,z.y,p.x,p.y,0,'surface',r.id))damage(r.id,amount);}}
 function receiveLegacy(qty){let left=qty;while(left>0&&GameCarried.free()>=0&&GameEquipment.ids.length<192){const r=legacyRecord(V016Turret.newData(),GameActors.localId,true);GameEquipment.change(r);GameCarried.add(r.id);left--;}GameMovable.sync();return left;}
 function guns(){return records().filter(r=>defs[r.typeId].ammoType&&r.placement==='installed').map(r=>({id:r.id,type:r.typeId,...pivot(r),ammo:r.state.settings.ammo,angle:r.state.settings.angle,level:r.state.level,enabled:operational(r)&&devicePowered(r.refs.device),fallen:r.state.settings.fallen||r.state.condition.hp===0,wallId:r.state.settings.mountWall||null}));}
 function fresh(){return {schema:1,commands:{revision:0,receipts:[]}};}
 function legacyRecord(g,actor,packed=false){const d=defs.heavy_turret;return {id:g.id,typeId:'heavy_turret',transform:{x:(g.x??500)-60,y:(g.y??400)-48,rotation:0,scene:'surface',room:'yard'},refs:{device:g.id},placement:packed?'packed':'installed',ownerId:packed?actor:null,state:{level:g.level||0,condition:{hp:d.hp,maxHp:d.hp},modules:[],settings:{ammo:g.ammo,angle:g.angle,mountWall:packed?'':g.wallId||'',fallen:!packed&&!!g.fallen}}};}
 function migrate(data){
  if(!data.turret016)data.turret016={schema:1,nextId:2,guns:[V016Turret.starter()]};
  Object.assign(data,V015Base.migrateGame(data));
  V016Turret.validate(data.turret016,data);const actor=data.identity027?.playerId||'player:1',add=(g,packed)=>{const r=legacyRecord(g,actor,packed);data.equipment032.instances.push(r);data.v09.power.deviceEnabled[r.id]=g.enabled;return r;};
  for(const g of data.turret016?.guns||[])add(g,false);
  function walk(v,path=''){if(!v||typeof v!=='object')return;for(const [key,item]of Object.entries(v)){if(item?.type==='hmg016'&&item.turretData){const r=add(item.turretData,true);if(path==='bag')v[key]=GameCarried.token(r.id);else{v[key]=null;data.carry0353.legacyOverflow.push(r.id);}}else if(item&&typeof item==='object')walk(item,path?path+'.'+key:key);}}
  walk(data);if(data.turret016)data.turret016.guns=[];data.defense039=fresh();
 }
 function validate(data){const s=data.defense039;if(!s||s.schema!==1||Object.keys(s).sort().join()!=='commands,schema')throw Error('Invalid defense state');commands.validate(s.commands);if(!data.turret016||data.turret016.guns.length)throw Error('Legacy turret must migrate into equipment');
  for(const r of data.equipment032.instances.filter(is)){const d=defs[r.typeId],v=r.state.settings;if(/^hmg016_/.test(r.id)&&Number(r.id.slice(7))>=data.turret016.nextId)throw Error('Invalid legacy defense allocation');if(Object.keys(v).sort().join()!=='ammo,angle,fallen,mountWall'||!Number.isInteger(v.ammo)||v.ammo<0||v.ammo>(d.capacity||0)||!Number.isFinite(v.angle)||Math.abs(v.angle)>Math.PI||typeof v.fallen!=='boolean'||typeof v.mountWall!=='string'||v.mountWall&&(!/^hmg016_/.test(r.id)||!V015Base.byId.has(v.mountWall))||r.state.condition.maxHp!==d.hp)throw Error('Invalid defense instance state');}
  return true;
 }
 const capture=()=>({schema:1,commands:commands.capture()});
 GameSave.extend('capture','defense.foundation',function(previous){const data=previous();data.defense039=capture();return data;});
 GameSave.extend('decode','defense.foundation',function(previous,raw){const data=previous(raw);validate(data);return data;});
 GameSave.extend('restore','defense.foundation',function(previous,data){validate(data);const out=previous(data);commands.restore(data.defense039.commands);runtime.clear();tickClock=0;window.GameDefenseUI?.reset();return out;});
 const solids=solidObjects;solidObjects=function(which=scene){return solids(which).filter(o=>!is(GameEquipment.get(o.id))||GameEquipment.get(o.id).state.condition.hp>0).concat(which==='surface'?records().filter(r=>r.transform.scene==='surface'&&operational(r)&&!r.state.settings.mountWall).map(GameFootprints.forRecord):[]);};
 const objects=interactionObjects;interactionObjects=function(which=scene){return objects(which).concat(which==='surface'?records().filter(r=>r.transform.scene==='surface'&&r.placement==='installed').map(r=>({...GameFootprints.forRecord(r),kind:'defense039',name:I18n.t('build.type.'+r.typeId),range:64,ref:r.id})):[]);};
 const interact=executeInteraction;executeInteraction=function(o,...args){if(o?.kind==='defense039'){if(reachable(GameActors.local,GameEquipment.get(o.id)))GameDefenseUI.open(o.id);return;}return interact(o,...args);};
 const approach=approachObject;approachObject=function(o,...args){const r=o?.kind==='defense039'&&GameEquipment.get(o.id);if(r?.state?.settings?.mountWall){if(reachable(GameActors.local,r))GameDefenseUI.open(r.id);else{message(I18n.t('defense.error.out_of_reach'));if(player.wallLevel){const p=pivot(r);approachPoint(p.x,p.y);}}return;}return approach(o,...args);};
 const can=canInteract;canInteract=function(o,x,y){return o?.kind==='defense039'?reachable({...GameActors.local,entity:{...GameActors.local.entity,x,y}},GameEquipment.get(o.id)):can(o,x,y);};
 const updateOld=update;update=function(...args){const out=updateOld(...args);tick(16.667*frameScale);return out;};
 // Adopt the authored gun once before the New Game template is sealed.
 for(const gun of V016Turret.guns){const r=legacyRecord(gun,GameActors.localId);GameEquipment.change(r);}V016Turret.guns.splice(0);GameMovable.sync();
 V09Craft.recipes.hmg016.retiredBuildable='heavy_turret';ITEM.hmg016.name='Тяжёлая турель';
 GameState.register('defense',{capture},{source:'defense/runtime.js',saved:['defense039'],transient:['target acquisition','cooldowns','render aim','metrics']});
 return Object.freeze({is,records,pivot,operational,reachable,guns,receiveLegacy,repairCost,damage,shoot,tick,settle,breachTarget,blast,request,execute,capture,migrate,validate,fresh,transient,get revision(){return commands.revision;},metrics:()=>({...metrics})});
})();
