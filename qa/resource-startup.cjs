// Cold process, local bytes: isolate eager resource work from warm frame timing.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup}=require('./runtime.cjs'),{imageSize}=require('../tools/assets.cjs'),migration=require('./asset-migration.json');
const oldPaths=Object.fromEntries(migration.files.map(f=>[f.old,f.path]));
async function main(){
 const target=path.resolve(process.argv[2]||'index.html'),out=process.argv[3]||'qa/results/loading-stage4.json';
 const before=process.memoryUsage(),start=performance.now(),r=setup(target,{}, {width:390,height:844,maxTouchPoints:1,media:{'(pointer: coarse)':true,'(hover: none)':true}}),bootMs=performance.now()-start;
 r.eval('window.GameInput?.setMode("MOBILE")');
 const initialRequests=[...r.imageRequests],beginDecode=performance.now();
 if(r.eval('!!window.GameAssets'))await Promise.all(r.eval('GameAssets.stats().entries.map(r=>GameAssets.load(r.id))'));
 else await Promise.all([...r.eval('Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode())'),...r.eval('[V020Walls.image(1).decode()]')]);
 const remainingDecodeMs=performance.now()-beginDecode,images=initialRequests.map(p=>{const f=oldPaths[p]||p,b=fs.readFileSync(f),[w,h]=imageSize(b);return{path:f,bytes:b.length,width:w,height:h,decodedRGBABytes:w*h*4};});
 const domSources=[...new Set(r.doc.querySelectorAll('img').map(el=>el.src||el.getAttribute('src')).filter(Boolean).map(p=>oldPaths[p]||p))];
 const all=[...new Set([...images.map(i=>i.path),...domSources])];
 const result={version:r.eval('captureGameProgress().gameVersion'),controlMode:r.eval('GameInput.mode'),viewport:{width:390,height:844,dpr:1},javascriptAndModeledDOMMs:bootMs,remainingInitialDecodeMs:remainingDecodeMs,totalLocalBootAndDecodeMs:bootMs+remainingDecodeMs,canvas:{requested:images.length,compressedBytes:images.reduce((n,i)=>n+i.bytes,0),estimatedRGBABytes:images.reduce((n,i)=>n+i.decodedRGBABytes,0),images},domImageSources:domSources,uniqueCanvasAndDOMResources:all.length,uniqueCanvasAndDOMCompressedBytes:all.reduce((n,p)=>n+fs.statSync(p).size,0),memoryBefore:before,memoryAfter:process.memoryUsage(),consoleErrors:r.errors,limitations:['Local filesystem Image decoding with modeled DOM; not a mobile network/browser startup measurement.','DOM img URLs are counted; this harness does not decode/layout DOM images.','RGBA is a width*height*4 estimate for requested Canvas images, not measured browser/GPU memory.','RSS includes native Canvas/VM/harness and is noisy; phone/WebView memory must be checked manually.']};
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({version:result.version,bootMs:result.totalLocalBootAndDecodeMs,requested:result.canvas.requested,compressedBytes:result.canvas.compressedBytes,estimatedRGBABytes:result.canvas.estimatedRGBABytes,consoleErrors:r.errors}));if(r.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
