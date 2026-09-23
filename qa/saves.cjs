const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {setup}=require('./runtime.cjs'),root=path.resolve(__dirname,'..');process.chdir(root);
const fixtureDir=path.join(__dirname,'stage0/fixtures'),index=JSON.parse(fs.readFileSync(path.join(fixtureDir,'index.json')));
const r=setup('index.html'),E=s=>r.eval(s),checks=[];
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.message.slice(0,1800)});}}
const json=v=>JSON.parse(JSON.stringify(v));
function projection(){return json(E(`(()=>{const d=captureGameProgress();return {player:{scene:d.player.scene,health:d.player.health},bag:d.bag,equipment:d.equipment,quick:d.quick013,storage:d.storage,drone:d.robots014,walls:d.base015,doors:d.building018,turrets:d.turret016,farm:d.farm.map(s=>({crop:s.crop,harvestLeft:s.harvestLeft})),plantDurations:d.farm014.beds.map(a=>a?.map(p=>({duration:p.duration,planted:p.planted,harvested:p.harvested,qty:p.qty}))??null),jobs:d.v09.crafting,craft:d.v010.modules.craft};})()`));}
for(const fixture of index.fixtures){
 const raw=fs.readFileSync(path.join(fixtureDir,fixture.id+'.json'),'utf8');
 check(fixture.id+'.oldSaveLoads',()=>{assert.ok(E(`decodeGameProgress(${JSON.stringify(raw)})`));E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));`);});
 check(fixture.id+'.oldInventoryAndStatePreserved',()=>assert.deepEqual(require('./bunker-contract.cjs').legacyProjection(projection()),require('./bunker-contract.cjs').legacyProjection(fixture.expected)));
 check(fixture.id+'.newSaveRoundtrip',()=>{const before=projection(),saved=E('JSON.stringify(captureGameProgress())');E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saved)}));`);assert.deepEqual(projection(),before);});
}
check('legacy.0.19.1.migration',()=>{
 const raw=fs.readFileSync(path.join(fixtureDir,'legacy_0.19.1.json'),'utf8');E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));`);
 assert.equal(E('V015Base.sections.length'),28);assert.equal(E('captureGameProgress().base015.schema'),4);
});
check('localStorage.continueExisting0.20.0',()=>{
 const raw=fs.readFileSync(path.join(fixtureDir,'rifle_ak74_37_60.json'),'utf8');
 const saved=setup('index.html',{'survival_base_v09_active_slot':'1','survival_base_v09_slot_1':raw});
 assert.equal(saved.eval('gameSaveReady&&!gameSaveBlocked'),true);
 assert.equal(saved.eval("V013Inventory.items.find(s=>s?.type==='rifle_ak74').rounds"),37);
 assert.equal(saved.eval("V013Inventory.items.find(s=>s?.type==='rifle_ak74').magazineType"),'magazine_module');
 assert.equal(saved.errors.length,0);
});
check('console.noErrors',()=>assert.equal(r.errors.length,0));
const result={version:E('captureGameProgress().gameVersion'),fixtures:index.fixtures.length+1,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status!=='PASS').length,checks,consoleErrors:r.errors};
fs.writeFileSync(path.join(__dirname,'results/saves.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status!=='PASS')}));if(result.failed)process.exitCode=1;
