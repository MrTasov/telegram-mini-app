// Technical atlas packing only; source artwork comes from image generation.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
(async()=>{const im=await loadImage(path.join(root,'docs/art-source/work-tool-views.png'));
 if(im.width!==1536||im.height!==1024)throw Error('Unexpected multiview source dimensions');
 const c=createCanvas(768,512);c.getContext('2d').drawImage(im,0,0,768,512);
 fs.writeFileSync(path.join(root,'assets/atlases/player/work-tool-views.png'),c.toBuffer('image/png'));
 console.log('Packed six working-tool perspectives into one 768 x 512 atlas.');
})().catch(e=>{console.error(e);process.exitCode=1;});
