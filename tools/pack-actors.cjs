// Offline sprite-sheet packing only. Artwork is generated with built-in ImageGen.
// Usage: node tools/pack-actors.cjs /absolute/path/to/generated_images
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),sources=require('./actor-sources.json');
async function main(){
 if(!process.argv[2])throw Error('Provide the original generated image directory. Runtime assets are already shipped.');
 const stats={};
 for(const [key,d]of Object.entries(sources)){
  const im=await loadImage(path.join(process.argv[2],d.file)),[w,h]=d.cell,c=createCanvas(w*d.cols,h*d.rows),ctx=c.getContext('2d'),sw=im.width/d.cols,sh=im.height/d.rows,s=Math.min(w/sw,h/sh);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  for(let i=0;i<d.cols*d.rows;i++){
   const x=i%d.cols,y=Math.floor(i/d.cols),[ox,oy]=d.offsets?.[i]||[0,0];
   ctx.save();ctx.beginPath();ctx.rect(x*w,y*h,w,h);ctx.clip();
   // Extract the intended cell region, excluding neighboring cel fragments.
   if(d.clips?.[i]){const [cx,cy,cw,ch]=d.clips[i];ctx.beginPath();ctx.rect(x*w+(w-sw*s)/2+ox+cx*s,y*h+(h-sh*s)/2+oy+cy*s,cw*s,ch*s);ctx.clip();}
   ctx.drawImage(im,x*sw,y*sh,sw,sh,x*w+(w-sw*s)/2+ox,y*h+(h-sh*s)/2+oy,sw*s,sh*s);ctx.restore();
  }
  const file=`assets/atlases/${d.enemy?'enemies':'player'}/${key}_029.webp`;fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
  fs.writeFileSync(path.join(root,file),await c.encode('webp',92));
  stats[key]={path:file,size:[c.width,c.height],atlas:{layout:'grid',columns:d.cols,rows:d.rows,frameSize:d.cell,frameCount:d.cols*d.rows},bytes:fs.statSync(path.join(root,file)).size};
 }
 fs.writeFileSync(path.join(root,'docs/CHARACTER_PACKED_ASSETS.json'),JSON.stringify(stats,null,2)+'\n');console.log(stats);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
