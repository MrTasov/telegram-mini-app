// Stage 2 contracts through real game entry points, with isolated browser storage.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),checks=[],r=setup('index.html'),E=s=>r.eval(s);
const copy=v=>JSON.parse(JSON.stringify(v)),rawFixture=id=>fs.readFileSync(path.join(__dirname,'stage1/fixtures',id+'.json'),'utf8');
const snap=()=>copy(E('captureGameProgress()'));
const storage=runtime=>Object.fromEntries(runtime.storage);
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack.slice(0,2200)});}}
const restore=d=>E(`restoreGameProgress(${JSON.stringify(d)})`);
const frozen=rawFixture('rifle_ak74_37_60'),fixture=JSON.parse(frozen);
check('owners.oneReferencePerLiveContainer',()=>assert.equal(E(`GameState.player.entity===player&&GameState.inventory.bag===bag&&GameState.inventory.storage===storageChests&&GameState.inventory.equipment===equipment&&GameState.inventory.quick===V013Inventory.items&&GameState.enemies.actors===zombies&&GameState.farm.beds===farmState&&GameState.drones.companion===V014Robots.state&&GameState.turrets.system===GameDefense&&GameState.turrets.guns.every(g=>GameEquipment.get(g.id).state.settings.ammo===g.ammo)&&GameState.power.battery===V010Energy.battery`),true));
check('owners.replacementDoesNotLeaveStaleReferences',()=>{
 E('window.__oldBag=bag;window.__oldZombies=zombies;window.__oldFarm=farmState;window.__oldStorage=storageChests;');restore(fixture);
 assert.equal(E(`bag!==__oldBag&&zombies!==__oldZombies&&farmState!==__oldFarm&&storageChests!==__oldStorage&&GameState.inventory.bag===bag&&GameState.inventory.storage===storageChests&&GameState.enemies.actors===zombies&&GameState.farm.beds===farmState`),true);
});
check('owners.allSavedFieldsHaveAnOwner',()=>{
 const d=snap(),roots=new Set(['schema','gameVersion','savedAt','saveName','saveVersion']);
 for(const owner of copy(E('GameState.describe()')))for(const key of owner.saved)roots.add(key.split('.')[0]);
 assert.deepEqual(Object.keys(d).filter(k=>!roots.has(k)),[]);
});
check('owners.sessionIsSingleSourceOfTruth',()=>{
 assert.equal(E('gameSaveReady===GameState.session.ready&&v09ActiveSlot===GameState.session.activeSlot&&lastVerifiedGameSave===GameState.session.lastVerified'),true);
 E('v091SaveName="compatibility probe"');assert.equal(E('GameState.session.name'),'compatibility probe');E('GameState.session.name="owner probe"');assert.equal(E('v091SaveName'),'owner probe');
});
check('owners.noLateRegistration',()=>assert.throws(()=>E(`GameState.register('extra',{}, {source:'test'})`)));
check('owners.sealedViews',()=>assert.equal(E('Object.isFrozen(GameState)&&Object.isFrozen(GameState.inventory)&&Object.isSealed(GameState.session)'),true));
check('registry.historicalOrderIsExplicit',()=>assert.deepEqual(copy(E('GameSave.describe()')),Object.fromEntries(Object.entries(require('./save-adapters.json').order).map(([k,v])=>[k,[...v,'bunker.level1','campaign.foundation','equipment.instances','inventory.head-modules','base.recovery','campaign.chapter-one','equipment.placement','inventory.buildables','base.control','research.foundation','world.exploration','story.archive','defense.foundation']]))));
check('registry.singleSharedModuleRegistry',()=>assert.equal(E('V010.modules===GameSave.modules&&Object.isFrozen(V010.modules)'),true));
check('registry.moduleRestoreOrder',()=>assert.deepEqual(copy(E('GameSave.moduleOrder')),['world','inventory','craft','combat','energy','progression','camera']));
check('registry.rejectDuplicateOrLateHooks',()=>assert.throws(()=>E(`GameSave.extend('capture','save.slots',next=>next())`)));
check('registry.rejectDuplicateOrLateModules',()=>assert.throws(()=>E(`V010.register('inventory',V010Inventory)`)));
check('format.explicitVersion',()=>assert.equal(snap().saveVersion,r.eval('SaveFormat.version')));
check('format.versionSeparatedFromPayloadSchemas',()=>{const d=snap();assert.equal(d.schema,2);assert.equal(d.base015.schema,4);assert.equal(d.gameVersion,require('../package.json').version);});
check('format.legacyMigratesWithoutChangingInput',()=>{const before=JSON.stringify(fixture);restore(fixture);assert.equal(JSON.stringify(fixture),before);assert.equal(snap().saveVersion,r.eval('SaveFormat.version'));});
check('format.migrationIsIdempotent',()=>{
 const once=E(`decodeGameProgress(${JSON.stringify(frozen)})`),twice=E(`decodeGameProgress(${JSON.stringify(JSON.stringify(once))})`);assert.deepEqual(copy(twice),copy(once));
});
check('format.decodeDoesNotMutateLiveStateOrStorage',()=>{const before=snap(),stored=storage(r);E(`decodeGameProgress(${JSON.stringify(rawFixture('drone_empty_far'))})`);assert.deepEqual(snap(),before);assert.deepEqual(storage(r),stored);});
check('restore.changedValidatedObjectIsRechecked',()=>{
 const before=snap(),stored=storage(r);
 E(`window.__validated=decodeGameProgress(${JSON.stringify(frozen)});__validated.quick013.items[0].rounds=900;`);
 assert.throws(()=>E('restoreGameProgress(__validated)'));assert.deepEqual(snap(),before);assert.deepEqual(storage(r),stored);
});
check('restore.validEditOfDecodedObjectIsPreserved',()=>{
 E(`window.__validated=decodeGameProgress(${JSON.stringify(frozen)});__validated.robots014.battery=37;restoreGameProgress(__validated);`);
 assert.equal(E('V014Robots.state.battery'),37);restore(fixture);
});
const badSaves=[
 ['future',d=>{d.saveVersion=r.eval('SaveFormat.version')+1;}],['negative',d=>{d.saveVersion=-1;}],['fractional',d=>{d.saveVersion=1.5;}],['stringVersion',d=>{d.saveVersion='1';}],['nullVersion',d=>{d.saveVersion=null;}],
 ['unknownRelease',d=>{d.gameVersion='0.99.0';}],['unknownSchema',d=>{d.schema=99;}],['unknownItem',d=>{d.bag[0].type='unknown_item';}],['oversizedAmmoStack',d=>{d.bag[0]={type:'ammo',qty:601};}],
 ['overfilledMagazine',d=>{d.quick013.items[0].rounds=61;}],['missingMagazineWithRounds',d=>{d.quick013.items[0].magazineType=null;}],
 ['invalidDroneBattery',d=>{d.robots014.battery=-1;}],['packedDroneWithoutToken',d=>{d.robots014.packed=true;d.robots014.task='packed';}],
 ['duplicateDroneToken',d=>{d.bag[2]={type:'drone014',qty:1,robotId:'drone014'};}],['invalidWallHP',d=>{d.base015.sections[0].hp=-1;}],
 ['missingSubsystem',d=>{delete d.v010.modules.energy;}],['invalidFarmCrop',d=>{d.farm[0].crop=900;}],['invalidPlayerHP',d=>{d.player.health='100';}]
];
for(const [id,mutate]of badSaves)check('reject.'+id+'.beforeRestoreMutation',()=>{
 const before=snap(),stored=storage(r),d=copy(fixture);mutate(d);
 assert.throws(()=>E(`decodeGameProgress(${JSON.stringify(JSON.stringify(d))})`));assert.throws(()=>restore(d));
 assert.deepEqual(snap(),before);assert.deepEqual(storage(r),stored);assert.equal(E('GameState.session.transaction||GameSave.restoring'),false);
});
for(const [id,raw]of [['null','null'],['array','[]'],['invalidJSON','{broken'],['oversized',' '.repeat(2*1024*1024+1)]])check('reject.'+id+'.decodeWithoutMutation',()=>{
 const before=snap();assert.throws(()=>E(`decodeGameProgress(${JSON.stringify(raw)})`));assert.deepEqual(snap(),before);
});
check('restore.privateObjectsDoNotAliasSave',()=>{
 E(`window.__input=${frozen};restoreGameProgress(__input);__input.player.health=1;__input.bag[0].qty=1;__input.robots014.battery=1;`);
 assert.notEqual(E('player.health'),1);assert.notEqual(E('bag[0].qty'),1);assert.notEqual(E('V014Robots.state.battery'),1);
});
check('restore.cancelsPendingSaveAndCleansTransaction',()=>{
 E('queueGameSave()');assert.ok(E('GameState.session.timer!==null'));restore(fixture);
 assert.equal(E('GameState.session.timer'),null);assert.equal(E('GameState.session.transaction||GameSave.restoring'),false);
});
check('restore.subsequentAutosaveWorksOnce',()=>{
 let writes=0;const write=r.context.localStorage.setItem;
 r.context.localStorage.setItem=(k,v)=>{if(k==='survival_base_v09_slot_1')writes++;return write(k,v);};
 E('queueGameSave();queueGameSave();queueGameSave()');r.flushTimers(100);r.context.localStorage.setItem=write;
 assert.equal(writes,1);assert.equal(JSON.parse(r.storage.get('survival_base_v09_slot_1')).saveVersion,r.eval('SaveFormat.version'));
});
check('slots.continueAcceptedStage1',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'2','survival_base_v09_slot_2':frozen});
 assert.equal(s.eval('v09ActiveSlot'),2);assert.equal(s.eval("V013Inventory.items[0].rounds"),37);assert.equal(s.eval('gameSaveBlocked'),false);assert.deepEqual(s.errors,[]);
});
check('slots.corruptPrimaryUsesIndependentBackup',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'2','survival_base_v09_slot_2':'{bad','survival_base_v09_slot_2_backup':frozen});
 assert.equal(s.eval('v09ActiveSlot'),2);assert.equal(s.eval("V013Inventory.items[0].rounds"),37);assert.equal(s.storage.get('survival_base_v09_slot_2'),'{bad');
 assert.ok(s.doc.getElementById('saveStatus').textContent.includes('резервной'));assert.equal(s.eval('gameSaveBlocked'),false);
});
check('slots.unreadableAndFutureSaveNeverOverwritten',()=>{
 const future=copy(fixture);future.saveVersion=r.eval('SaveFormat.version')+1;
 for(const raw of ['{bad',JSON.stringify(future)]){
  const s=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':raw});const before=storage(s);
  assert.equal(s.eval('gameSaveBlocked'),true);assert.equal(s.eval('saveGameProgress()'),false);s.flushTimers(250);assert.deepEqual(storage(s),before);
 }
});
check('slots.failedWritePreservesPrimaryAndProgress',()=>{
 const before=r.storage.get('survival_base_v09_slot_1'),d=snap(),write=r.context.localStorage.setItem;
 r.context.localStorage.setItem=(k,v)=>{if(k==='survival_base_v09_slot_1')throw Error('quota');return write(k,v);};
 assert.equal(E('saveGameProgress()'),false);r.context.localStorage.setItem=write;
 assert.equal(r.storage.get('survival_base_v09_slot_1'),before);assert.deepEqual(snap(),d);assert.ok(r.storage.has('survival_base_v09_slot_1_backup'));
});
check('slots.AtoBtoAAndNoPendingTimerWritesWrongSlot',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':frozen,'survival_base_v09_slot_2':rawFixture('rifle_m4_37_60')});
 s.eval('queueGameSave()');assert.equal(s.eval('V09Saves.load(2)'),true);s.flushTimers(150);
 assert.equal(s.eval('v09ActiveSlot'),2);assert.ok(s.eval("V013Inventory.items.some(s=>s?.type==='rifle_m4'&&s.rounds===37)"));
 assert.equal(s.eval('V09Saves.load(1)'),true);assert.ok(s.eval("V013Inventory.items.some(s=>s?.type==='rifle_ak74'&&s.rounds===37)"));
 assert.equal(JSON.parse(s.storage.get('survival_base_v09_slot_1')).quick013.items[0].type,'rifle_ak74');assert.deepEqual(s.errors,[]);
});
check('slots.importAllocatesFreeSlotAndRetainsSource',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':frozen});
 assert.equal(s.eval(`V09Saves.importRaw(${JSON.stringify(rawFixture('drone_packed'))})`),true);
 assert.equal(s.eval('v09ActiveSlot'),2);assert.equal(s.eval('V014Robots.state.packed'),true);assert.ok(s.storage.has('survival_base_v09_slot_1'));assert.equal(JSON.parse(s.storage.get('survival_base_v09_slot_2')).saveVersion,r.eval('SaveFormat.version'));
});
check('slots.invalidImportDoesNotAllocateOrOverwrite',()=>{
 const before=storage(r);assert.equal(E(`V09Saves.importRaw('invalid')`),false);assert.deepEqual(storage(r),before);
});
check('slots.newGameDoesNotClonePreviousProgress',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':rawFixture('damaged_base_turret')});
 const old=s.storage.get('survival_base_v09_slot_1');assert.equal(s.eval('V09Saves.newGame()'),true);assert.equal(s.eval('v09ActiveSlot'),2);
 assert.equal(s.eval('V015Base.sections.every(s=>s.level===1&&s.hp===(ChapterOnePreset.damage.find(d=>d.id===s.id)?.hp??s.maxHp))'),true);assert.equal(s.eval('GameCampaign.view().chapter'),'chapter_1');assert.equal(s.eval('player.health'),100);assert.ok(s.storage.has('survival_base_v09_slot_1'));assert.equal(JSON.parse(old).gameVersion,'0.21.0');
});
check('newGame.templateCannotBeReplacedAfterLoad',()=>assert.throws(()=>E('GameSave.seal(GameSave.describe())')));
check('newGame.templateIsPrivateAndDetached',()=>{
 const data=copy(E('GameSave.newGameData()'));data.bag=[];data.robots014.battery=0;
 E('const __new=GameSave.newGameData();__new.bag.length=0;__new.robots014.battery=0;');
 assert.equal(E('GameSave.newGameData().robots014.battery'),100);assert.ok(E('GameSave.newGameData().bag.length>0'));
});
check('newGame.completePowerAndSavePayload',()=>{
 const data=copy(E('GameSave.newGameData()'));
 assert.deepEqual(Object.keys(data.v09.power.deviceEnabled).sort(),copy(E('Object.keys(V09Power.devices)')).sort());
 assert.deepEqual(Object.keys(data.v010.modules).sort(),copy(E('GameSave.moduleOrder')).sort());
 assert.equal(E(`!!decodeGameProgress(${JSON.stringify(JSON.stringify(data))})`),true);
});
check('newGame.noInheritedFarmDroneOrEvent',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':rawFixture('day_x')});
 s.eval('V014Robots.state.battery=3;V014Robots.state.cargo=[{type:"iron",qty:7}];V014Robots.state.modules.body=4;');
 assert.equal(s.eval('V09Saves.newGame()'),true);assert.equal(s.eval('V016Lighting.day'),1);
 assert.equal(s.eval('V014Robots.state.battery'),100);assert.equal(s.eval('V014Robots.state.cargo.length'),0);
 assert.equal(s.eval('V014Robots.state.modules.body'),0);assert.equal(s.eval('farmState.every(s=>s.crop===null)'),true);
});
check('slots.fullSlotsPreserved',()=>{
 const input={'survival_base_v09_active_slot':'1'};for(let i=1;i<=5;i++)input['survival_base_v09_slot_'+i]=frozen;
 const s=setup('index.html',input),before=storage(s);assert.equal(s.eval('V09Saves.newGame()'),false);
 assert.equal(s.eval(`V09Saves.importRaw(${JSON.stringify(frozen)})`),false);assert.deepEqual(storage(s),before);
});
check('slots.currentFormatSurvivesFullRestart',()=>{
 const s=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':frozen});assert.equal(s.eval('saveGameProgress()'),true);
 const raw=s.storage.get('survival_base_v09_slot_1');assert.equal(JSON.parse(raw).saveVersion,r.eval('SaveFormat.version'));
 const again=setup('index.html',storage(s));assert.equal(again.eval('gameSaveBlocked'),false);
 assert.equal(again.eval('V013Inventory.items[0].rounds'),37);assert.equal(again.eval('V013Inventory.items[0].magazineType'),'magazine_module');
 assert.equal(again.eval('V013Inventory.items[0].uid'),s.eval('V013Inventory.items[0].uid'));assert.deepEqual(again.errors,[]);
});
check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
const result={version:E('captureGameProgress().gameVersion'),passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status!=='PASS').length,checks};
fs.writeFileSync(path.join(__dirname,'results/state-saves.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status!=='PASS')}));if(result.failed)process.exitCode=1;
