// Sequential control/candidate runs avoid competition between the two runners.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'results');
for(const [id,target] of [['stage2-control','qa/stage2/index.html'],['stage3','index.html']]){
 const r=cp.spawnSync(process.execPath,['qa/performance.cjs',target,'qa/results/performance-'+id+'.json'],{cwd:root,env:{...process.env,LAST_BASE_ASSETS:root},encoding:'utf8',timeout:300000,maxBuffer:4e6});
 console.log(id+'\n'+r.stdout);if(r.stderr)console.error(r.stderr);if(r.status!==0)process.exit(r.status||1);
}
const reference=JSON.parse(fs.readFileSync(path.join(out,'performance-stage2-control.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'performance-stage3.json')));
assert.deepEqual(reference.consoleErrors,[]);assert.deepEqual(candidate.consoleErrors,[]);
const scenes=reference.scenes.map((s,i)=>{const c=candidate.scenes[i];assert.equal(c.id,s.id);assert.deepEqual(c.scenario,s.scenario);return{id:s.id,scenario:s.scenario,reference:{median:s.combined.p50Ms,p95:s.combined.p95Ms},candidate:{median:c.combined.p50Ms,p95:c.combined.p95Ms},medianChangePercent:(c.combined.p50Ms/s.combined.p50Ms-1)*100,p95ChangePercent:(c.combined.p95Ms/s.combined.p95Ms-1)*100};});
const report={reference:reference.gameVersion,candidate:candidate.gameVersion,scenariosMatch:true,scenes,limitations:candidate.limitations};fs.writeFileSync(path.join(out,'performance-stage3-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.scenes.map(({id,medianChangePercent,p95ChangePercent})=>({id,medianChangePercent,p95ChangePercent})),null,2));
