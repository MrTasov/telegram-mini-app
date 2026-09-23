// Compare the cached R2 floor with the unmodified historical drawing algorithm.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');process.chdir(path.resolve(__dirname,'..'));
const {setup}=require('./runtime.cjs'),old=setup('qa/bunker-base/index.html'),current=setup('index.html'),checks=[];
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack});}}
const rect={left:810,top:-240,right:1610,bottom:1260};
const metrics=[];
for(const zoom of [.65,1,1.4])check('floor.originalPatternAndPhase.'+zoom,()=>{
 const frames=[old,current].map(r=>{r.canvas.width=900;r.canvas.height=700;r.eval(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,900,700);ctx.setTransform(${zoom},0,0,${zoom},${-810*zoom},${240*zoom});V011Rooms.floor('corridor',${JSON.stringify(rect)});`);return Buffer.from(r.canvas.getContext('2d').getImageData(0,0,900,700).data);});
 let absolute=0,large=0;for(let i=0;i<frames[0].length;i++){const d=Math.abs(frames[0][i]-frames[1][i]);absolute+=d;if(d>32)large++;}
 const mean=absolute/frames[0].length,fraction=large/frames[0].length;metrics.push({zoom,meanChannelDelta:mean,channelsAbove32:fraction});assert.ok(mean<3,'pattern mean delta '+mean);assert.ok(fraction<.01,'visible pattern differences '+fraction);
});
check('cache.oneBufferNoNewImageOrGameplayState',()=>{const before=current.eval('JSON.stringify(captureGameProgress())'),requests=current.imageRequests.length;for(let i=0;i<20;i++)current.eval(`V011Rooms.floor('corridor',${JSON.stringify(rect)});`);assert.equal(current.eval('JSON.stringify(captureGameProgress())'),before);assert.equal(current.imageRequests.length,requests);assert.equal(current.eval('V011Rooms.floorCacheInfo().entries'),1);assert.equal(current.eval('V011Rooms.floorCacheInfo().bytes'),786*1486*4);assert.deepEqual(current.errors,[]);});
const report={passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,checks,metrics};fs.writeFileSync('qa/results/bunker-floor-cache.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
