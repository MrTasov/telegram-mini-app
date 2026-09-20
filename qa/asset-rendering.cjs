// Pixel oracle uses the accepted executable renderer and original resource bytes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),checks=[];
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.message.slice(0,1500)});}}
async function main(){
 const a=setup('qa/controls-base/index.html'),b=setup('index.html');
 await Promise.all([...a.eval('Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode())'),...a.eval('[1,2,3,4,5].map(n=>V020Walls.image(n).decode())'),...b.eval('[...Object.values(AssetManifest.art),...Object.values(AssetManifest.walls)].map(id=>GameAssets.load(id))')]);
 const shot=(r,code)=>{r.eval('ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,1280,800);'+code);return Buffer.from(r.canvas.getContext('2d').getImageData(0,0,320,320).data);};
 const compare=code=>{const before=shot(a,code),after=shot(b,code);assert.ok(before.equals(after),'Rendered pixels differ');assert.ok(before.some(x=>x),'Empty comparison image');};
 for(const key of a.eval('Object.keys(V011Art.sources)'))check('art.'+key,()=>compare(`V011Art.draw(${JSON.stringify(key)},16,16,128,192);V011Art.drawStretch(${JSON.stringify(key)},160,16,128,192);`));
 for(const type of ['normal','heavy','fast','leaper','bloater'])for(let frame=0;frame<11;frame++)check('enemy.'+type+'.'+(frame<8?'frame':'corpse')+frame,()=>compare(`
  scene='surface';V013City.floor=null;player.x=800;player.y=850;updateCamera();
  {const z=makeZombie(800,850);z.type=${JSON.stringify(type)};const state=V017Monsters.prepare(z);state.angle=.9;state.walk=${frame}*9;state.jump=null;state.fuse=0;state.attack=${frame>=4&&frame<8?'performance.now()+400-('+frame+'-4+.25)*100':'0'};
   ${frame>=8?`z.alive=false;state.deadAt=performance.now();state.variant=${frame-8};state.deathAngle=.9;state.retired=false;`:''}
   ctx.save();ctx.translate(-680,-720);drawZombie(z);ctx.restore();}
 `));
 for(let level=1;level<=5;level++)for(const part of ['wall','corner','stairs'])check(`wall.${level}.${part}`,()=>compare(`{const im=V020Walls.image(${level}),[x,y,w,h]=V020Walls.atlas[${level}].frames[${JSON.stringify(part)}];ctx.drawImage(im,x,y,w,h,16,16,288,220);}`));
 check('console.noErrors',()=>{assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);});
 const result={reference:'0.23.1 manually accepted',version:require('../package.json').version,renderer:'@napi-rs/canvas pixel equality, not browser screenshots',passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,checks};fs.writeFileSync('qa/results/asset-rendering.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(x=>x.status==='FAIL')}));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
