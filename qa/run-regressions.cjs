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
for(const name of ['perimeter020.cjs','wall_behaviors020.cjs','target0191.cjs']){
 let code=fs.readFileSync(path.join(baseline,'baseline_0.20.0/qa',name),'utf8');
 code=code.replaceAll("captureGameProgress().gameVersion==='0.20.0'",`captureGameProgress().gameVersion==='${version}'`);
 code=code.replace("fs.readFileSync(file,'utf8').split('function selectionRadius(z)')","require('./runtime.cjs').source(file).split('function selectionRadius(z)')");
 fs.writeFileSync(path.join(game,'qa',name),code);
}
let character=fs.readFileSync(path.join(baseline,'tools/behavior.cjs'),'utf8');
character=character.replace("check('launch.version',\"captureGameProgress().gameVersion\",'0.20.0');",`check('launch.version',"captureGameProgress().gameVersion",'${version}');`);
fs.writeFileSync(path.join(work,'tools/behavior.cjs'),character);
const results=[];
for(const [name,script,report]of [
 ['perimeter','baseline_0.20.0/qa/perimeter020.cjs','baseline_0.20.0/qa/perimeter_0.20.0.json'],
 ['wall_behaviors','baseline_0.20.0/qa/wall_behaviors020.cjs','baseline_0.20.0/qa/wall_behaviors_0.20.0.json'],
 ['targets','baseline_0.20.0/qa/target0191.cjs','baseline_0.20.0/qa/target_regression_0.20.0.json'],
 ['characterization','tools/behavior.cjs','reports/behavior.json']]){
 const out=cp.spawnSync(process.execPath,[path.join(work,script)],{encoding:'utf8',timeout:240000,maxBuffer:8e6,env:{...process.env,NODE_PATH:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,path.join(home,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)}});
 fs.writeFileSync(path.join(resultDir,name+'.log'),out.stdout+'\n'+out.stderr);
 const data=fs.existsSync(path.join(work,report))?JSON.parse(fs.readFileSync(path.join(work,report))):null;
 if(data){data.suiteBaselineVersion='0.20.0';data.testedVersion=version;fs.writeFileSync(path.join(resultDir,name+'.json'),JSON.stringify(data,null,2)+'\n');}
 const failed=out.status!==0||!data||data.summary?.observedFailures||data.summary?.errors||data.consoleErrors?.length;
 const row={suite:name,passed:data?.passed??data?.summary?.passed??0,failed:!!failed,exitCode:out.status,error:out.error?.message};results.push(row);console.log(JSON.stringify(row));
}
const final={version,work,results,passed:results.reduce((n,r)=>n+r.passed,0),failed:results.some(r=>r.failed),expectedStage0Assertions:477};
fs.writeFileSync(path.join(resultDir,'summary.json'),JSON.stringify(final,null,2)+'\n');if(final.failed)process.exitCode=1;
