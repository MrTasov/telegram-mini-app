/* Exact world renderer -> transparent inventory assets; deterministic native
   Canvas, not a generic symbol or substitute illustration. */
const fs=require('node:fs'),path=require('node:path');process.chdir(path.resolve(__dirname,'..'));process.env.LAST_BASE_ASSETS=process.cwd();const r=require('../qa/runtime.cjs').setup('index.html');if(r.errors.length)throw Error(JSON.stringify(r.errors));
for(const [type,scale]of [['automatic_turret',2.4],['heavy_turret',1.9],['searchlight',2.55]]){r.eval(`window.ic=document.createElement('canvas');ic.width=256;ic.height=256;window.ix=ic.getContext('2d');ix.translate(${type==='heavy_turret'?105:118},128);ix.scale(${scale},${scale});GameDefenseArt.paint(ix,'${type}',0,0,-.35,0,false,false);`);fs.writeFileSync('assets/images/defense/'+type+'.png',r.eval('ic._canvas.toBuffer("image/png")'));}
console.log('Generated 3 transparent icons from production world art');
