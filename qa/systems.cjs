// Stage 3 extension contracts: real runtime, test-only content, isolated storage.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),r=setup('index.html'),E=s=>r.eval(s),json=v=>JSON.parse(JSON.stringify(v)),checks=[];
const phase=Number(process.argv[2]||4);
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack.slice(0,3500)});}}
function ok(id,code){check(id,()=>assert.equal(E(code),true));}
const saved=E('JSON.stringify(captureGameProgress())');
function reset(){E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saved)}));menuOpen=false;`);}
check('items.originalStackLimits',()=>assert.deepEqual(json(E("['ammo','ammo556','fish','wood','rifle_ak74','drone014','hmg016'].map(t=>itemStackLimit(t))")),[600,600,20,100,1,1,1]));
ok('magazines.sharedDefinitionIdentity','V0162Magazines.TYPES===V09Craft.magazineTypes');
check('weapons.compatibilityFromDefinitions',()=>assert.deepEqual(json(E("V09Craft.weaponsForAmmo('ammo')")),['rifle_ak74']));
// Two new weapon definitions share an arbitrary ammo ID. No production content
// or new saves are shipped; this exercises the actual extension path.
E(`ITEM.qa_round={name:'Test round',ammo:true,stackMax:73,caliber:'TEST'};
ITEM.qa_mag={name:'Test component'};V09Craft.magazineTypes.qa_mag=17;
for(const type of ['qa_gun_a','qa_gun_b']){ITEM[type]={name:type,hand:true};HAND_TYPES.push(type);V09Craft.weapons[type]={...V09Craft.weapons.rifle_m4,name:type,ammo:'qa_round',magazineTypes:['qa_mag'],defaultMagazine:'qa_mag',extendedMagazine:'qa_mag',mag:17,reloadMs:1234};}`);
check('weapons.sharedAmmo',()=>assert.deepEqual(json(E("V09Craft.weaponsForAmmo('qa_round')")),['qa_gun_a','qa_gun_b']));
check('items.arbitraryAmmoStack',()=>{E("bag=[];addItem('qa_round',148)");assert.deepEqual(json(E('bag.map(s=>s.qty)')),[73,73,2]);});
ok('magazines.incompatibleComponentRejected',`(()=>{bag=[];addItem('qa_gun_a',1);addItem('magazine_standard',1);window.qaGun=V010Combat.ensure(bag[0]);const before=JSON.stringify(bag);return !V0162Magazines.install(qaGun,1)&&JSON.stringify(bag)===before;})()`);
ok('magazines.definitionCapacity','V010Combat.gunSpec(qaGun).mag===17&&V010Combat.gunSpec(qaGun).reloadMs===1234');
ok('magazines.definitionValidation',"V010Combat.validateItem({...qaGun,magazineType:'magazine_standard'})===false&&V010Combat.validateItem({...qaGun,rounds:18})===false&&V010Combat.validateItem({...qaGun,rounds:17})===true");
ok('magazines.removalReturnsOwnAmmo',`(()=>{qaGun.rounds=13;const uid=qaGun.uid;return V0162Magazines.remove(qaGun)&&qaGun.uid===uid&&qaGun.magazineType===null&&qaGun.rounds===0&&bagCount('qa_round')===13&&bagCount('qa_mag')===1;})()`);
ok('magazines.reinstallEmptyComponent',"V0162Magazines.installFirst(qaGun,'qa_mag')&&qaGun.rounds===0&&qaGun.magazineType==='qa_mag'");
ok('weapons.twoInstancesDifferentUID',`(()=>{addItem('qa_gun_a',1);window.qaOther=V010Combat.ensure(bag.find(s=>s?.type==='qa_gun_a'&&s!==qaGun));qaOther.rounds=5;return qaOther.uid!==qaGun.uid;})()`);
ok('weapons.reloadActualSelectedInstance',`(()=>{V010Inventory.selectUid('qa_gun_a',qaGun.uid);V013Inventory.equip('qa_gun_a');const started=reloadWeapon();V010Combat.tick(1234);return started&&qaGun.rounds===13&&qaOther.rounds===5&&bagCount('qa_round')===0;})()`);
ok('weapons.fireArbitraryDefinition',`(()=>{scene='surface';player.x=800;player.y=850;lastShot=-10000;shoot();return qaGun.rounds===12&&qaOther.rounds===5;})()`);
ok('magazines.fullBagAtomic',`(()=>{bag=Array.from({length:BAG_SLOTS},()=>({type:'wood',qty:100}));const before=JSON.stringify([bag,qaGun]);return !V0162Magazines.remove(qaGun)&&JSON.stringify([bag,qaGun])===before;})()`);
ok('magazines.migrationUsesDefinition',`(()=>{const s={type:'qa_gun_a',qty:1,modules:{magazine:true},rounds:16};V0162Magazines.migrate(s);return s.magazineType==='qa_mag'&&!Object.hasOwn(s.modules,'magazine')&&s.rounds===16;})()`);
reset();
ok('inventory.instanceSurvivesStorage',`(()=>{const s=V013Inventory.items.find(s=>s?.type==='rifle_ak74');s.level=3;s.rounds=11;const uid=s.uid;const i=V013Inventory.items.indexOf(s);V013Inventory.returnItem(i);const b=bag.findIndex(s=>s?.uid===uid);const moved=V010Inventory.transfer('bag',b,0,1);return moved===1&&storageChests[0].items.some(s=>s?.uid===uid&&s.level===3&&s.rounds===11);})()`);
if(phase>=2){
 reset();
 ok('enemies.singleExistingRegistry','V017Monsters.specs===V010World.TYPES');
 check('enemies.originalSpawnOrder',()=>assert.deepEqual(json(E('Array.from({length:10},(_,i)=>V017Monsters.typeAt(i))')),['normal','heavy','fast','leaper','bloater','normal','heavy','fast','leaper','bloater']));
 for(const type of ['normal','heavy','fast','leaper','bloater'])ok('dayX.'+type,`(()=>{const a=V017Monsters.stats('${type}',false),b=V017Monsters.stats('${type}',true);return b.hp===a.hp*1.5&&b.damage===a.damage*1.5&&b.speed===a.speed*1.5&&b.chaseSpeed===a.chaseSpeed*1.5&&b.cooldown===a.cooldown/1.5;})()`);
 ok('enemies.newTypeSharedWithSaveValidator',`(()=>{V017Monsters.specs.qa_enemy={...V017Monsters.specs.normal,spawnOrder:5,hp:160,damage:15};const s=V017Monsters.stats('qa_enemy',true);return V010World.TYPES.qa_enemy===V017Monsters.specs.qa_enemy&&s.hp===240&&s.damage===22.5&&V017Monsters.typeAt(5)==='qa_enemy';})()`);
 ok('enemies.changedDefinitionInvalidatesRaidStats',`(()=>{V017Monsters.specs.qa_enemy.hp=180;return V017Monsters.stats('qa_enemy',true).hp===270;})()`);
 ok('enemies.typeIsNotInstanceIdentity',`(()=>{const a=makeZombie(2000,2000),b=makeZombie(2100,2000);a.type=b.type='qa_enemy';return V017Monsters.prepare(a).id!==V017Monsters.prepare(b).id&&a.type===b.type;})()`);
 ok('enemies.behaviorInheritedWithoutIDBranch',`(()=>{V017Monsters.specs.qa_leaper={...V017Monsters.specs.leaper};V017Monsters.specs.qa_blast={...V017Monsters.specs.bloater};return V017Monsters.stats('qa_leaper',true).leap.speed===4&&V017Monsters.stats('qa_blast',true).blast.wallDamage===320;})()`);
 E('delete V017Monsters.specs.qa_enemy;delete V017Monsters.specs.qa_leaper;delete V017Monsters.specs.qa_blast;');
}
if(phase>=3){
 reset();
 ok('drone.definitionIsOwnedByItem','V014Robots.definition===ITEM[V014Robots.type].drone');
 ok('drone.tokenUsesInstanceID',`V014Robots.ownsToken({type:V014Robots.type,robotId:V014Robots.instanceId})&&!V014Robots.ownsToken({type:V014Robots.type,robotId:'different-instance'})`);
 ok('items.robotTypeMayDifferFromInstanceID',`(()=>{ITEM.qa_robot={robot:true,drone:{instanceId:'one-physical-robot'}};return V010Combat.validateItem({type:'qa_robot',qty:1,robotId:'one-physical-robot'})&&!V010Combat.validateItem({type:'qa_robot',qty:1,robotId:'qa_robot'});})()`);
 for(let level=0;level<=5;level++)check('drone.originalStatsLevel'+level,()=>assert.deepEqual(json(E(`(()=>{const m={body:${level},cargo:${level}};return [V014Robots.maxHp(m),V014Robots.capacity(m)];})()`)),[100+25*level,12+Math.floor(level/2)*6]));
 ok('drone.ammoFromDefinitionIncludingRetiredPin',`(()=>{const d=V014Robots;d.definition.combat.ammoType='qa_round';scene=d.state.scene;player.x=d.state.x;player.y=d.state.y;d.state.ammo=0;bag=[{type:'ammo',qty:30},{type:'qa_round',qty:7},{type:'qa_round',qty:6,locked:true}];const done=d.reload();d.definition.combat.ammoType='ammo';return done&&d.state.ammo===13&&bag[0].qty===30&&bag[2]===null;})()`);
 ok('drone.independentFireInterval',`(()=>{const old=V09Craft.weapons.rifle_ak74.delay;V09Craft.weapons.rifle_ak74.delay=987;const unchanged=V014Robots.combat.intervalMs===155;V09Craft.weapons.rifle_ak74.delay=old;return unchanged;})()`);
 reset();
 E(`ITEM.qa_turret={name:'QA turret',deployable:true,turret:{...V016Turret.definition,idPrefix:'qa_mount_',combat:{...V016Turret.combat,ammoType:'qa_round',damage:7,capacity:10,range:220,intervalMs:50}}};bag=[];addItem('qa_turret',2);window.qaTurretItems=bag.filter(Boolean);`);
 ok('turrets.newTypeUsesExistingEngine','qaTurretItems.length===2&&qaTurretItems.every(V016Turret.validItem)');
 ok('turrets.typeAndInstanceAreSeparate',`qaTurretItems[0].type==='qa_turret'&&qaTurretItems[0].turretData.type==='qa_turret'&&qaTurretItems[0].turretData.id!==qaTurretItems[1].turretData.id&&qaTurretItems[0].turretData.id.startsWith('qa_mount_')`);
 ok('turrets.mismatchedTypeRejected',`!V016Turret.validItem({...qaTurretItems[0],type:'hmg016'})`);
 ok('turrets.definitionDamageAndCapacity',`V016Turret.damage({...qaTurretItems[0].turretData,level:5})===11&&!V016Turret.validItem({...qaTurretItems[0],turretData:{...qaTurretItems[0].turretData,ammo:11}})`);
 ok('turrets.packExistingPhysicalInstance',`(()=>{scene='surface';const t=V016Turret.guns[0];player.x=t.x;player.y=t.y;window.qaPlacementPoint={x:t.x,y:t.y};const id=t.id;return V016Turret.pack(t)&&bag.some(s=>s?.turretData?.id===id);})()`);
 ok('turrets.placeNewType',`V016Turret.startPlacement(qaTurretItems[0])&&V016Turret.selectPoint(qaPlacementPoint.x,qaPlacementPoint.y)&&V016Turret.place()`);
 ok('turrets.reloadOwnAmmoOnly',`(()=>{window.qaPlaced=V016Turret.guns.find(t=>t.type==='qa_turret');addItem('qa_round',15);addItem('ammo',20);return V016Turret.reload(qaPlaced)===10&&qaPlaced.ammo===10&&bagCount('qa_round')===5&&bagCount('ammo')===20;})()`);
 ok('turrets.roundtripNewTypeAndID',`(()=>{const id=qaPlaced.id;restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())));window.qaPlaced=V016Turret.guns.find(t=>t.id===id);return qaPlaced?.type==='qa_turret'&&qaPlaced.ammo===10;})()`);
 ok('turrets.duplicateInstanceRejected',`(()=>{const d=captureGameProgress();d.turret016.guns.push({...d.turret016.guns[0]});try{decodeGameProgress(JSON.stringify(d));return false;}catch{return true;}})()`);
 ok('turrets.unloadAndRepackIdentity',`(()=>{const id=qaPlaced.id;player.x=qaPlaced.x;player.y=qaPlaced.y;return V016Turret.unload(qaPlaced)===10&&V016Turret.pack(qaPlaced)&&bag.some(s=>s?.type==='qa_turret'&&s.turretData.id===id&&s.turretData.ammo===0);})()`);
 reset();E('delete ITEM.qa_turret;delete ITEM.qa_robot;');
}
if(phase>=4){
 reset();
 ok('destructibles.oneHealthDefinition','V018Build.health===V015Base.health&&V018Build.LEVELS===V015Base.health.levels&&V018Build.COSTS===V015Base.health.costs');
 check('destructibles.originalDamageStages',()=>assert.deepEqual(json(E('[100,90,50,20,0].map(hp=>V015Base.stage({hp,maxHp:100}))')),[0,1,2,3,4]));
 ok('destructibles.openGateStillImmune',`(()=>{const g=V015Base.sections.find(o=>o.gate==='commandS');const hp=g.hp;return V015Base.isOpen(g)&&!V015Base.damage(g,20)&&g.hp===hp;})()`);
 ok('destructibles.dataDrivenArmorAndResistance',`(()=>{const h=V015Base.health;h.types.qa_object={...h.types.wall,armor:10,resistances:{physical:.5}};const object={id:'qa_structure',x:500,y:800,w:20,h:20,hp:200,maxHp:200,level:1};V018Build.structures.set(object.id,{id:object.id,scene:'bunker',kind:'qa_object',object});return V018Build.damage(object.id,30)&&object.hp===190;})()`);
 ok('destructibles.destroyAndRepairSameObject',`(()=>{const r=V018Build.record('qa_structure'),h=V015Base.health;const destroyed=V018Build.damage(r.id,1000)&&V018Build.isBroken(r.id);const n=h.restoreHP(r.object,700);return destroyed&&n===200&&r.object.hp===200&&!V018Build.isBroken(r.id);})()`);
 ok('destructibles.invalidDamageIsAtomic',`(()=>{const r=V018Build.record('qa_structure'),before=JSON.stringify(r.object);return !V018Build.damage(r.id,NaN)&&!V018Build.damage(r.id,-1)&&JSON.stringify(r.object)===before;})()`);
 E("V018Build.structures.delete('qa_structure');delete V015Base.health.types.qa_object;");
 ok('upgrades.sharedExistingRules','V014Robots.definition.upgrades===V010Combat.upgradeRules.drone&&V016Turret.definition.upgrades===V010Combat.upgradeRules.turret');
 for(const type of ['rifle_ak74','rifle_m4','helmet1','vest5','boots1','pants1'])ok('upgrades.originalCap.'+type,`V010Combat.maxUpgradeLevel({type:'${type}'})===5&&!V010Combat.validateItem({type:'${type}',qty:1,level:6})`);
 ok('upgrades.customDefinitionLevelAndCost',`(()=>{V09Craft.weapons.qa_gun_a.upgrades={...V010Combat.upgradeRules.weapon,maxLevel:7,cost:{iron:1},rarePerLevel:0};return V010Combat.maxUpgradeLevel({type:'qa_gun_a'})===7&&V0161Upgrade.cost({type:'qa_gun_a',level:6}).iron===7&&V010Combat.validateItem({type:'qa_gun_a',qty:1,level:7})&&!V010Combat.validateItem({type:'qa_gun_a',qty:1,level:8});})()`);
 ok('upgrades.realCradleUsesDefinition',`(()=>{const u=V0161Upgrade;scene='bunker';player.x=u.station.x+u.station.w/2;player.y=u.station.y+u.station.h+25;V09Power.running=true;V09Power.fuel=80;bag=[];addItem('qa_gun_a',1,{level:6});addItem('iron',7);const s=V010Combat.ensure(bag[0]),id=s.uid;return u.deposit('bag',0)&&u.upgrade()&&u.slots[0].uid===id&&u.slots[0].level===7&&bagCount('iron')===0&&!u.upgrade();})()`);
 reset();
}
// More subsystem contracts are added after each sequential refactor below.
check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
const result={phase,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status!=='PASS').length,checks};
fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});fs.writeFileSync(path.join(__dirname,'results/systems.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({phase,passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status!=='PASS')}));if(result.failed)process.exitCode=1;
