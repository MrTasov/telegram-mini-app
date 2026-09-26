// One-off mechanical release metadata and future benchmark harness update.
const fs=require('fs');
for(const f of ['package.json','package-lock.json','index.html','src/manifest.json','src/save/envelope.js','src/save/format.js','src/dev/ui.js']){
 fs.writeFileSync(f,fs.readFileSync(f,'utf8').replaceAll('0.40.2','0.40.3'));
}
let f='src/save/slots.js',s=fs.readFileSync(f,'utf8').replace('40\\.[012]','40\\.[0123]').replace('автосохранение каждые 5 секунд','автосохранение примерно каждые 15 секунд');fs.writeFileSync(f,s);
f='qa/perf-corrective.cjs';s=fs.readFileSync(f,'utf8');
s=s.replace("const detailed=!!process.env.PERF_DETAIL;", "const deviceDpr=Number(process.env.PERF_DEVICE_DPR||3),renderDpr=Number(process.env.PERF_RENDER_DPR||2);if(![1,2,3].includes(deviceDpr)||![1,2,3].includes(renderDpr))throw Error('DPR must be 1, 2 or 3'); const detailed=!!process.env.PERF_DETAIL;");
s=s.replace("const separation=(code)=>{", "const separation=(code)=>{code=code.replace('const MAX_CANVAS_DPR = 2;',`const MAX_CANVAS_DPR = ${renderDpr};`);");
s=s.replace('beforeScripts:s=>{s.__profileNow', 'beforeScripts:s=>{s.devicePixelRatio=deviceDpr;s.__profileNow');
s=s.replace('for(let n=0;n<180;n++){', 'const intervalDue=new Map();let elapsed=0;for(let n=0;n<180;n++){');
s=s.replace('h.advance(16.667);const t=performance.now();fn();', "const nextElapsed=Math.round((n+1)*1000/60),step=nextElapsed-elapsed;elapsed=nextElapsed;const t=performance.now();h.r.flushTimers(step);for(const job of h.r.scheduler.intervals){let due=intervalDue.get(job)??job.ms;while(due<=elapsed){job.fn();due+=job.ms;}intervalDue.set(job,due);}h.r.flushTimers(0);h.advance(0);fn();");
s=s.replace('return {id:c.id,which,n:c.n', 'return {id:c.id,which,deviceDpr,renderDpr,actualCanvasDpr:h.E("canvas.width/screenWidth"),timersFlushed:true,n:c.n');
fs.writeFileSync(f,s);
