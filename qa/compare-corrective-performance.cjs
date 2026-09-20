// Small sequential comparison; do not run alongside the regression suite.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
const results={reference:'0.27.0',candidate:require('../package.json').version,method:'Sequential native Canvas/VM, 60 warmup + 180 measured frames per scene; 1280x800 DPR1. Not physical device FPS.',modes:{},limitations:['Inventory now intentionally continues world simulation; before/after UI work differs.','Shared-host CPU and Canvas raster timings; no browser/phone/compositor/network measurement.']};
for(const mode of ['MOBILE','PC']){
 const samples={};
 for(const [label,target]of [['before','qa/pre-corrective/index.html'],['after','index.html']]){
  const file=`qa/results/performance-ux-${mode.toLowerCase()}-${label}.json`;
  if(label==='before'&&process.argv.includes('--reuse-before')){samples[label]=JSON.parse(fs.readFileSync(file));if(samples[label].gameVersion!=='0.27.0')throw Error('Wrong cached reference');continue;}
  const run=cp.spawnSync(process.execPath,['qa/performance.cjs',target,file],{encoding:'utf8',timeout:120000,env:{...process.env,LAST_BASE_TEST_LANGUAGE:'ru',LAST_BASE_ASSETS:root,LAST_BASE_CONTROL_MODE:mode,LAST_BASE_BENCH_SCENES:'surface_day,inventory_open'}});
  if(run.status!==0)throw Error(run.stderr||run.stdout||'Benchmark failed');
  samples[label]=JSON.parse(fs.readFileSync(file));if(samples[label].consoleErrors.length)throw Error('Benchmark console errors');
  console.log(mode,label,run.stdout.trim());
 }
 results.modes[mode]={scenes:samples.after.scenes.map((s,i)=>({id:s.id,beforeP50:samples.before.scenes[i].combined.p50Ms,afterP50:s.combined.p50Ms,deltaPercent:(s.combined.p50Ms/samples.before.scenes[i].combined.p50Ms-1)*100,beforeP95:samples.before.scenes[i].combined.p95Ms,afterP95:s.combined.p95Ms})),saveP50:[samples.before.save.p50Ms,samples.after.save.p50Ms],loadP50:[samples.before.load.p50Ms,samples.after.load.p50Ms]};
}
fs.writeFileSync('qa/results/performance-corrective-comparison.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
