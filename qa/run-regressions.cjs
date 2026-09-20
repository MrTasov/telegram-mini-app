// Run the complete frozen Stage 0 suite against a chosen runtime in disposable
// directories. Its source, fixtures and reports are never overwritten.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const home=path.resolve(__dirname,'..'),baseline=path.resolve(process.env.LAST_BASE_BASELINE||path.join(__dirname,'stage0'));
const file=path.resolve(process.argv[2]||path.join(home,'index.html'));
const resultDir=path.resolve(process.argv[3]||path.join(__dirname,'results/regression'));
const assets=path.resolve(process.env.LAST_BASE_ASSETS||home);
const work=fs.mkdtempSync(path.join(os.tmpdir(),'last-base-regression-')),game=path.join(work,'baseline_0.20.0');
for(const p of [game,path.join(work,'tools'),path.join(work,'reports'),path.join(work,'fixtures'),resultDir])fs.mkdirSync(p,{recursive:true});
fs.copyFileSync(file,path.join(game,'index.html'));fs.cpSync(path.join(assets,'assets'),path.join(game,'assets'),{recursive:true});
const html=fs.readFileSync(file,'utf8'),version=html.match(/<title>([\d.]+)/)[1];
for(const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g)){
 const relative=match[1].split(/[?#]/)[0];if(/^https?:/.test(relative))continue;
 const dest=path.join(game,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.resolve(path.dirname(file),relative),dest);
}
fs.mkdirSync(path.join(game,'source'));fs.copyFileSync(path.join(baseline,'baseline_0.20.0/source/baseline_0.19.1.html'),path.join(game,'source/baseline_0.19.1.html'));
fs.mkdirSync(path.join(game,'qa'));
for(const dir of [path.join(game,'qa'),path.join(work,'tools')])for(const name of ['runtime.cjs','canvas-contract.cjs'])fs.copyFileSync(path.join(__dirname,name),path.join(dir,name));
// Await the resource owner's decode/validation, without changing any baseline assertion.
// Stage 6 explicitly changes the Day X window. Exercise historical raid checks
// at 03:00, inside both contracts; frozen inputs/assertions remain on disk.
function adaptAssetWaits(code){return code.replace(/day:10,minute:(?:1380|480)/g,'day:10,minute:180').replaceAll('Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode())','(window.GameAssets?Object.values(AssetManifest.art).map(id=>GameAssets.load(id)):Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode()))').replaceAll('[1,2,3,4,5].map(n=>V020Walls.image(n).decode())','(window.GameAssets?Object.values(AssetManifest.walls).map(id=>GameAssets.load(id)):[1,2,3,4,5].map(n=>V020Walls.image(n).decode()))');}
for(const name of ['perimeter020.cjs','wall_behaviors020.cjs','target0191.cjs']){
 let code=fs.readFileSync(path.join(baseline,'baseline_0.20.0/qa',name),'utf8');
 code=code.replaceAll("captureGameProgress().gameVersion==='0.20.0'",`captureGameProgress().gameVersion==='${version}'`);
 code=code.replace("fs.readFileSync(file,'utf8').split('function selectionRadius(z)')","require('./runtime.cjs').source(file).split('function selectionRadius(z)')");
 // UX patch intentionally replaces 16 ladders with 4. Frozen files stay intact.
 if(name==='perimeter020.cjs')code=code.replace('three spans and four ladders','three spans and one ladder').replace("stairs.filter(t=>t.side==='${side}').length===4","stairs.filter(t=>t.side==='${side}').length===1").replace('for(let i=0;i<16;i++)','for(let i=0;i<4;i++)').replace('ladder on destroyed section becomes unavailable','removed ladder remains absent on destroyed section').replace('!V020Walls.usable(V091Fortress.stairs[0])',"!V091Fortress.stairs.some(t=>t.id==='n_0')");
 fs.writeFileSync(path.join(game,'qa',name),adaptAssetWaits(code));
}
let character=fs.readFileSync(path.join(baseline,'tools/behavior.cjs'),'utf8');
character=character.replace("check('launch.version',\"captureGameProgress().gameVersion\",'0.20.0');",`check('launch.version',"captureGameProgress().gameVersion",'${version}');`);
// Explicitly replace only the retired planting-material contract in the copied runner.
character=character.replace(/V0141Farm\.seedType\(([^)]+)\)/g,'farmCrops[$1].itemType')
 .replace("'.seedConsumed','bagCount(seedType)',1", "'.produceNotConsumed','bagCount(seedType)',2")
 .replace("'farm.noSeedRefuses','!V0141Farm.plant(0,2)&&farmState[0].crop===null'", "'farm.noSeedRequired','V0141Farm.plant(0,2)&&farmState[0].crop===2'");
fs.writeFileSync(path.join(work,'tools/behavior.cjs'),adaptAssetWaits(character));
const results=[];
for(const [name,script,report]of [
 ['perimeter','baseline_0.20.0/qa/perimeter020.cjs','baseline_0.20.0/qa/perimeter_0.20.0.json'],
 ['wall_behaviors','baseline_0.20.0/qa/wall_behaviors020.cjs','baseline_0.20.0/qa/wall_behaviors_0.20.0.json'],
 ['targets','baseline_0.20.0/qa/target0191.cjs','baseline_0.20.0/qa/target_regression_0.20.0.json'],
 ['characterization','tools/behavior.cjs','reports/behavior.json']]){
 const out=cp.spawnSync(process.execPath,[path.join(work,script)],{encoding:'utf8',timeout:240000,maxBuffer:8e6,env:{...process.env,LAST_BASE_ASSETS:assets,NODE_PATH:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,path.join(home,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)}});
 fs.writeFileSync(path.join(resultDir,name+'.log'),out.stdout+'\n'+out.stderr);
 const data=fs.existsSync(path.join(work,report))?JSON.parse(fs.readFileSync(path.join(work,report))):null;
 if(data){data.suiteBaselineVersion='0.20.0';data.testedVersion=version;fs.writeFileSync(path.join(resultDir,name+'.json'),JSON.stringify(data,null,2)+'\n');}
 const failed=out.status!==0||!data||data.summary?.observedFailures||data.summary?.errors||data.consoleErrors?.length;
 const row={suite:name,passed:data?.passed??data?.summary?.passed??0,failed:!!failed,exitCode:out.status,error:out.error?.message};results.push(row);console.log(JSON.stringify(row));
}
const final={version,work,results,passed:results.reduce((n,r)=>n+r.passed,0),failed:results.some(r=>r.failed),expectedStage0Assertions:477};
fs.writeFileSync(path.join(resultDir,'summary.json'),JSON.stringify(final,null,2)+'\n');if(final.failed)process.exitCode=1;
