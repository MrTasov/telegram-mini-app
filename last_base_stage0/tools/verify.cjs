const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'baseline_0.20.0');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fingerprint=JSON.parse(fs.readFileSync(path.join(root,'audit/source_fingerprint.json'))),failures=[];
for(const f of fingerprint.files){const p=path.join(base,f.path);if(!fs.existsSync(p)||hash(p)!==f.sha256)failures.push('Frozen source changed: '+f.path);}
const originalArg=process.argv.indexOf('--original'),original=originalArg>=0?path.resolve(process.argv[originalArg+1]):null;
if(original)for(const f of fingerprint.files){const p=path.join(original,f.path);if(!fs.existsSync(p)||hash(p)!==f.sha256)failures.push('Original source changed: '+f.path);}
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'fixtures/index.json')));for(const f of fixtures.fixtures)if(hash(path.join(root,f.file))!==f.sha256)failures.push('Fixture mismatch: '+f.file);
const behavior=JSON.parse(fs.readFileSync(path.join(root,'reports/behavior.json'))),regressions=JSON.parse(fs.readFileSync(path.join(root,'reports/regressions.json'))),performance=JSON.parse(fs.readFileSync(path.join(root,'reports/performance.json')));
if(behavior.summary.errors||behavior.summary.observedFailures||behavior.consoleErrors.length)failures.push('Behavior checks require review');
if(regressions.results.some(r=>r.exitCode!==0||r.consoleErrors.length))failures.push('Original suites require review');
if(performance.consoleErrors.length||performance.scenes.some(s=>s.consoleErrors.length))failures.push('Benchmark runtime errors');
const result={gameVersion:'0.20.0',stage:'0',originalChecked:!!original,frozenFiles:fingerprint.files.length,runtimeFiles:100,fixtures:behavior.summary.fixtures,automatedAssertions:behavior.summary.passed+regressions.totalPassed,performanceScenes:performance.scenes.length,failures,stage1Started:false};
fs.writeFileSync(path.join(root,'reports/integrity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(failures.length)process.exitCode=1;
