// Behavioral oracle: execute the accepted 0.21.0 and the candidate with identical
// seeds, clocks and input. Compare complete persistent payloads, not test doubles.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),a=setup('qa/stage1/index.html'),b=setup('index.html'),checks=[];
const json=v=>JSON.parse(JSON.stringify(v));
const normalized=require('./world-farm-contract.cjs').project;
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.message.slice(0,4000)});}}
function both(code){const aa=a.eval(code),bb=b.eval(code);assert.deepEqual(json(bb??null),json(aa??null));}
function compare(options){assert.deepEqual(normalized(b.eval('captureGameProgress()'),options),normalized(a.eval('captureGameProgress()'),options));}
function restore(raw){both(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));`);}
check('freshGame.fullPayload',()=>compare({fresh:true}));
for(const stage of ['stage0','stage1']){
 const dir=path.join(__dirname,stage,'fixtures');
 for(const file of fs.readdirSync(dir).filter(n=>n.endsWith('.json')&&n!=='index.json')){
  const raw=require('./event-test-contract.cjs').raidFixture(fs.readFileSync(path.join(dir,file),'utf8'));
  check(stage+'.'+file+'.decodedPayload',()=>assert.deepEqual(normalized(b.eval(`decodeGameProgress(${JSON.stringify(raw)})`)),normalized(a.eval(`decodeGameProgress(${JSON.stringify(raw)})`))));
  check(stage+'.'+file+'.restoredPayload',()=>{restore(raw);compare();});
  check(stage+'.'+file+'.newRoundtrip',()=>{
   for(const r of [a,b])r.eval('restoreGameProgress(decodeGameProgress(JSON.stringify(captureGameProgress())));');compare();
  });
 }
}
const fixture=id=>require('./event-test-contract.cjs').raidFixture(fs.readFileSync(path.join(__dirname,'stage1/fixtures',id+'.json'),'utf8'));
const scenarios=[
 {id:'surfaceMovement',fixture:'fresh_game',start:"scene='surface';player.x=800;player.y=850;menuOpen=false;stopControls(true);moveX=.35;moveY=.9;movePower=.8;",frames:90},
 {id:'craftingProgress',fixture:'craft_in_progress',start:"menuOpen=false;stopControls(true);",frames:120},
 {id:'droneCharging',fixture:'drone_charging',start:"menuOpen=false;stopControls(true);",frames:120},
 {id:'emptyDrone',fixture:'drone_empty_far',start:"menuOpen=false;stopControls(true);",frames:90},
 {id:'droneFollowing',fixture:'fresh_game',start:"scene='bunker';player.x=1264;player.y=780;menuOpen=false;stopControls(true);V014Robots.follow();moveY=.6;movePower=.5;",frames:90},
 {id:'dayX',fixture:'day_x',start:"menuOpen=false;stopControls(true);",frames:120},
 {id:'growingCrop',fixture:'crop_3',start:"menuOpen=false;stopControls(true);",frames:120}
];
for(const s of scenarios)check('simulation.'+s.id,()=>{
 restore(fixture(s.fixture));both(s.start);
 for(let i=0;i<s.frames;i++){a.advance(16.667);b.advance(16.667);both('frameScale=1;update();');}
 compare({surveyClock:s.id==='surfaceMovement',droneMotion:s.id==='droneFollowing',growthClock:s.id==='growingCrop'});
});
check('transactions.inventoryTransferAndQuickSlots',()=>{
 restore(fixture('equipment_storage'));both('V010Inventory.transfer("bag",0,0,1)');compare();
 both('V013Inventory.returnItem(0)');compare();
});
check('transactions.magazineRemovalAndReload',()=>{
 restore(fixture('rifle_ak74_37_60'));both('V0162Magazines.remove(V013Inventory.items.find(s=>s?.type==="rifle_ak74"))');compare();
});
check('console.noErrors',()=>{assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);});
const result={reference:'0.21.0 manually accepted on desktop and phone',candidate:require('../package.json').version,ignoredFields:['gameVersion (release metadata)','saveVersion (new envelope version)'],passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status!=='PASS').length,checks};
fs.writeFileSync(path.join(__dirname,'results/differential.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status!=='PASS')}));if(result.failed)process.exitCode=1;
