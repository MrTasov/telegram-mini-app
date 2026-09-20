// Run sequentially after npm test; native Canvas timing, not browser or phone FPS.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
const result={reference:'0.27.1',candidate:require('../package.json').version,method:'Sequential VM/native Canvas, same seed, 60 warmup + 180 measured frames, 1280x800 DPR1, 5 planted beds spraying continuously in both versions; PC and MOBILE input profiles.',modes:{},limitations:['No browser layout/compositor, Telegram WebView or physical phone measurement.','Shared-host timing varies; resource coordinates intentionally differ; identical active irrigation is forced for the farm comparison.']};
for(const mode of ['PC','MOBILE']){
 const samples={};
 for(const [label,target]of [['before','qa/pre-world-farm/index.html'],['after','index.html']]){
  const file=`qa/results/performance-world-farm-${mode.toLowerCase()}-${label}.json`;
  const run=cp.spawnSync(process.execPath,['qa/performance.cjs',target,file],{encoding:'utf8',timeout:180000,env:{...process.env,LAST_BASE_TEST_LANGUAGE:'ru',LAST_BASE_ASSETS:root,LAST_BASE_CONTROL_MODE:mode,LAST_BASE_BENCH_SCENES:'surface_day,farm_growing'}});
  if(run.status!==0)throw Error(run.stderr||run.stdout||'Benchmark failed');samples[label]=JSON.parse(fs.readFileSync(file));
  if(samples[label].consoleErrors.length)throw Error('Benchmark console errors');console.log(mode,label,run.stdout.trim());
 }
 result.modes[mode]=samples.after.scenes.map(s=>{const b=samples.before.scenes.find(b=>b.id===s.id);return {id:s.id,beforeP50:b.combined.p50Ms,afterP50:s.combined.p50Ms,beforeP95:b.combined.p95Ms,afterP95:s.combined.p95Ms,deltaPercent:(s.combined.p50Ms/b.combined.p50Ms-1)*100};});
}
fs.writeFileSync('qa/results/performance-world-farm-comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
