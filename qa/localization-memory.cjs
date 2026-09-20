// Retained JS heap comparison, separate cold processes with explicit GC.
// This is VM/DOM-model memory, not browser/phone memory.
const fs=require('node:fs'),path=require('node:path');process.chdir(path.resolve(__dirname,'..'));const {setup}=require('./runtime.cjs');
async function main(){if(!global.gc)throw Error('Run node --expose-gc qa/localization-memory.cjs target report');global.gc();const before=process.memoryUsage();
 const r=setup(process.argv[2]||'index.html',{}, {width:390,height:844,language:'en',maxTouchPoints:1,media:{'(pointer: coarse)':true}});
 await Promise.all(r.eval('GameAssets.stats().entries.map(r=>GameAssets.load(r.id))'));
 r.canvas.getContext('2d').getImageData(0,0,1,1);for(let i=0;i<3;i++)global.gc();const after=process.memoryUsage();
 const report={version:r.eval('captureGameProgress().gameVersion'),before,after,heapGrowthBytes:after.heapUsed-before.heapUsed,rssGrowthBytes:after.rss-before.rss,consoleErrors:r.errors,limitations:['Explicit V8 GC, modeled DOM and native Canvas. No physical device/browser memory measurement.']};
 fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:report.version,retainedHeapGrowthBytes:report.heapGrowthBytes,rssGrowthBytes:report.rssGrowthBytes}));if(r.errors.length)process.exitCode=1;
}main().catch(e=>{console.error(e.stack);process.exitCode=1;});
