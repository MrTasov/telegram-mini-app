// Flood the real collision geometry from outside the main gate, then connect
// each mining approach point to that reachable component by a swept segment.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');process.chdir(path.resolve(__dirname,'..'));
const {setup}=require('./runtime.cjs'),r=setup('index.html'),E=s=>r.eval(s),checks=[];
const report=E(`GamePassages.plan(()=>{
 const cell=48,b={x:surface.minX,y:surface.minY,w:surface.width,h:surface.height},cols=Math.ceil(b.w/cell),rows=Math.ceil(b.h/cell),visited=new Uint8Array(cols*rows),blocked=new Uint8Array(cols*rows),queue=[],point=i=>({x:b.x+(i%cols+.5)*cell,y:b.y+(Math.floor(i/cols)+.5)*cell});
 const walk=i=>{if(!blocked[i]){const p=point(i);blocked[i]=worldCollision(p.x,p.y,16,'surface')?2:1;}return blocked[i]===1;};
 const start=Math.floor((1200-b.y)/cell)*cols+Math.floor((800-b.x)/cell);visited[start]=1;queue.push(start);
 for(let n=0;n<queue.length;n++){const i=queue[n],a=point(i),x=i%cols,y=Math.floor(i/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*cols+xx;if(xx<0||xx>=cols||yy<0||yy>=rows||visited[j]||!walk(j))continue;const p=point(j);if(lineClear(a.x,a.y,p.x,p.y,16,'surface')){visited[j]=1;queue.push(j);}}}
 const access=WorldResourcePlacement.resources.map(o=>{
  let found=null;for(let k=0;k<16&&!found;k++){const a=k*Math.PI/8,dist=o.r+26,p={x:o.x+Math.cos(a)*dist,y:o.y+Math.sin(a)*dist};if(worldCollision(p.x,p.y,16,'surface'))continue;
   const cx=Math.floor((p.x-b.x)/cell),cy=Math.floor((p.y-b.y)/cell);for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-2;dx<=2&&!found;dx++){const x=cx+dx,y=cy+dy,i=y*cols+x;if(x<0||x>=cols||y<0||y>=rows||!visited[i])continue;const q=point(i);if(lineClear(p.x,p.y,q.x,q.y,16,'surface'))found=p;}}
  return {id:o.id,type:o.type||'tree',reachable:!!found,approach:found};});
 return {reachableCells:queue.length,access};
})`);
for(const o of report.access)checks.push({id:'access.'+o.id,status:o.reachable?'PASS':'FAIL',...(o.reachable?{}:{error:'No reachable safe mining approach'})});
checks.push({id:'console.noErrors',status:r.errors.length?'FAIL':'PASS'});
const result={version:require('../package.json').version,passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,reachableCells:report.reachableCells,checks,access:report.access};fs.writeFileSync('qa/results/resource-access.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(x=>x.status==='FAIL')}));if(result.failed)process.exitCode=1;
