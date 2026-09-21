const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),beforeRoot=path.resolve(process.argv[2]||path.join(root,'qa/pre-corrective-performance'));
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const kinds=['normal','heavy','fast','leaper','bloater'],out=createCanvas(1000,780),c=out.getContext('2d'),checks=[];
const runtimes=[],results=[];
async function main(){
 for(const dir of [beforeRoot,root]){
  process.env.LAST_BASE_ASSETS=root;const r=require(path.join(root,'qa/runtime.cjs')).setup(path.join(dir,'index.html')),E=s=>r.eval(s);runtimes.push(r);
  await E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');
  E(`scene='surface';camera.x=600;camera.y=650;window.artCalls=[];window.realDraw=ctx.drawImage;ctx.drawImage=function(im,...a){if(a.length===8)artCalls.push(a);return realDraw.call(this,im,...a);};`);
  const measurements=[];
  for(let i=0;i<5;i++)for(let dead=0;dead<2;dead++){
   E(`ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ctx.save();ctx.translate(-650,-700);window.z=makeZombie(800,850);z.type='${kinds[i]}';window.pose=V017Monsters.prepare(z);pose.angle=Math.PI;pose.deathAngle=.35;pose.variant=0;z.alive=${!dead};z.health=${dead?0:120};artCalls.length=0;drawZombie(z);ctx.restore();`);
   const a=E('artCalls[artCalls.length-1]');measurements.push({type:kinds[i],dead:!!dead,width:a[6],height:a[7]});
   const col=dir===root?1:0,x=col*500+i*100,y=dead?460:110;
   c.drawImage(r.canvas,80,80,140,140,x,y,100,100);
  }
  results.push(measurements);
 }
 c.globalCompositeOperation='destination-over';c.fillStyle='#46513f';c.fillRect(0,0,1000,780);c.globalCompositeOperation='source-over';c.fillStyle='#eceddd';c.font='22px sans-serif';c.fillText('BEFORE',20,35);c.fillText('AFTER',520,35);c.font='16px sans-serif';
 c.fillText('Living zombies — unchanged body scale',20,85);c.fillText('Corpses — 50% linear scale + soft shadow',20,435);
 for(let col=0;col<2;col++)for(let i=0;i<5;i++){c.fillText(kinds[i],col*500+i*100+8,225);c.fillText(kinds[i],col*500+i*100+8,575);}
 c.fillStyle='#c9cbbd';c.fillText('Same camera, sprite poses and canvas scale. Native Canvas2D review.',20,730);
 for(let i=0;i<results[0].length;i++){const a=results[0][i],b=results[1][i],factor=a.dead?.5:1;const ok=Math.abs(b.width/a.width-factor)<1e-9&&Math.abs(b.height/a.height-factor)<1e-9;checks.push({id:(a.dead?'corpse50.':'livingUnchanged.')+a.type,status:ok?'PASS':'FAIL',before:a,after:b});}
 for(const r of runtimes)assert.deepEqual(r.errors,[]);
 fs.mkdirSync(path.join(root,'qa/results'),{recursive:true});fs.writeFileSync(path.join(root,'qa/results/corrective-zombies.png'),out.toBuffer('image/png'));
 const report={passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks};fs.writeFileSync(path.join(root,'qa/results/corrective-visuals.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
