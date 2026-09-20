// Sequential child processes avoid retaining the other release's decoded images.
const fs=require('fs'),path=require('path'),cp=require('child_process');const root=path.resolve(__dirname,'..');process.chdir(root);
const result={reference:'0.28.0',candidate:require('../package.json').version,method:'Same native Canvas harness, seed and 60 warmup + 180 measured frames; sequential releases, PC/MOBILE input profiles. No phone FPS claim.',modes:{}};
for(const mode of ['PC','MOBILE']){const samples={};for(const [label,target]of [['before','qa/pre-character/index.html'],['after','index.html']]){
 const file=`qa/results/performance-character-${mode.toLowerCase()}-${label}.json`;
 const r=cp.spawnSync(process.execPath,['qa/performance.cjs',target,file],{encoding:'utf8',timeout:180000,env:{...process.env,LAST_BASE_TEST_LANGUAGE:'ru',LAST_BASE_ASSETS:root,LAST_BASE_CONTROL_MODE:mode,LAST_BASE_BENCH_SCENES:'surface_day,surface_zoom_out'}});
 if(r.status!==0)throw Error(r.stderr||r.stdout);samples[label]=JSON.parse(fs.readFileSync(file));if(samples[label].consoleErrors.length)throw Error('Console errors');console.log(mode,label,r.stdout.trim());
 }result.modes[mode]=samples.after.scenes.map(s=>{const b=samples.before.scenes.find(b=>b.id===s.id);return{id:s.id,beforeP50:b.combined.p50Ms,afterP50:s.combined.p50Ms,beforeP95:b.combined.p95Ms,afterP95:s.combined.p95Ms,deltaPercent:(s.combined.p50Ms/b.combined.p50Ms-1)*100};});}
fs.writeFileSync('qa/results/performance-character-comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
