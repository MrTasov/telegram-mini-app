// Resource regression: original bytes, catalog consumers, HTTP paths and failure handling.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {setup,source}=require('./runtime.cjs'),{validate,imageSize,generate}=require('../tools/assets.cjs');
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const catalog=JSON.parse(fs.readFileSync('assets/manifest.json')),migration=require('./asset-migration.json'),checks=[];
const plain=v=>JSON.parse(JSON.stringify(v)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function check(id,fn){try{await fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.message.slice(0,2500)});}}
const mutate=fn=>{const m=plain(catalog);fn(m);return m;};
async function main(){
 await check('catalog.valid',()=>assert.equal(validate(catalog).images,137));
 await check('catalog.generatedFresh',()=>generate(true));
 for(const f of migration.files)await check('migration.'+f.id,()=>{assert.equal(sha(fs.readFileSync(f.path)),f.sha256);assert.ok(!fs.existsSync(f.old));});
 await check('catalog.allShippedImagesRegistered',()=>{const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(d+'/'+x.name):[d+'/'+x.name]);assert.deepEqual(walk('assets').filter(f=>/\.(png|webp|gif)$/.test(f)).sort(),Object.values(catalog.images).map(d=>d.path).sort());});
 await check('catalog.historicalCropAndLayout',()=>{
  for(const [key,b]of Object.entries(migration.originalBounds))if(!key.startsWith('monster_'))assert.deepEqual(catalog.images[catalog.art[key]].crop,b);
  for(const [key,frames]of Object.entries(migration.originalFrames))assert.deepEqual(catalog.images[catalog.art[key]].atlas.crops,frames);
  for(const [level,old]of Object.entries(migration.originalWalls))assert.deepEqual(Object.fromEntries(Object.entries(catalog.images[catalog.walls[level]].atlas.frames).map(([k,b])=>[k,[b.x,b.y,b.w,b.h]])),old.frames);
 });
 for(const [id,fn]of [
  ['traversal',m=>m.images['art/bed'].path='assets/../bed.webp'],['absolute',m=>m.images['art/bed'].path='/assets/bed.webp'],['missing',m=>m.images['art/bed'].path='assets/images/no_such_file.webp'],
  ['reference',m=>m.icons.wood='bad'],['alias',m=>m.aliases.crate='bad'],['prefetch',m=>m.images['art/bed'].prefetch=['bad']],['duplicate',m=>m.images['art/bed'].path=m.images['art/car'].path],
  ['frameSize',m=>m.images['art/monster_walker017'].atlas.frameSize=[12,12]],['frameCount',m=>m.images['art/monster_walker017'].atlas.frameCount=7],
  ['dimensions',m=>m.images['art/monster_walker017'].size=[4096,2048]],['cropOutside',m=>m.images['art/bed'].crop.w=10000],
  ['cropCount',m=>m.images['art/corpse_walker019'].atlas.crops.pop()],['cropCell',m=>m.images['art/corpse_walker019'].atlas.crops[0].x=1000],
  ['packedCount',m=>m.images['wall/1'].atlas.frameCount=2],['packedRegion',m=>delete m.images['wall/1'].atlas.frames.stairs],['requiredAudio',m=>m.audio.gunshot.optional=false]
 ])await check('reject.'+id,()=>assert.throws(()=>validate(mutate(fn))));
 const r=setup('index.html'),initialRequests=[...r.imageRequests],E=s=>r.eval(s);
 await check('lazy.initialArtSubset',()=>{assert.ok(initialRequests.length<15);assert.ok(!initialRequests.includes(catalog.images['wall/5'].path));assert.ok(!initialRequests.includes(catalog.images['art/monster_walker017'].path));});
 await check('lazy.singleImageAndPromise',()=>{assert.equal(E('V011Art.image("crate")'),E('V011Art.image("chest")'));assert.equal(E('GameAssets.load("art/chest")'),E('GameAssets.load("art/chest")'));assert.equal(r.imageRequests.filter(p=>p===catalog.images['art/chest'].path).length,1);});
 await check('lazy.relatedCorpsePrefetch',()=>{E('V011Art.image("monster_walker017")');assert.ok(r.imageRequests.includes(catalog.images['art/corpse_walker019'].path));});
 await Promise.all(Object.keys(catalog.images).map(id=>E(`GameAssets.load(${JSON.stringify(id)})`)));
 for(const [id,d]of Object.entries(catalog.images))await check('decode.'+id,()=>{assert.equal(E(`GameAssets.ready(${JSON.stringify(id)})`),true);const im=E(`GameAssets.image(${JSON.stringify(id)})`);assert.deepEqual([im.naturalWidth,im.naturalHeight],imageSize(fs.readFileSync(d.path)));});
 await check('lazy.noDuplicateCanvasRequests',()=>{assert.equal(r.imageRequests.length,137);assert.equal(new Set(r.imageRequests).size,137);});
 await check('references.activeCodeHasNoOldPaths',()=>assert.ok(!/assets\/v0(?:190|200)\//.test(source('index.html'))));
 await check('references.literalArtConsumers',()=>{const code=source('index.html');for(const match of code.matchAll(/V011Art\.(?:image|draw|ready|drawStretch|bounds|fit)\(\s*['"]([\w]+)['"]\s*[,)]/g))assert.ok(catalog.art[match[1]]||catalog.aliases[match[1]],match[1]);for(const match of code.matchAll(/V011Art\.sources\.([\w]+)/g))assert.ok(catalog.art[match[1]],match[1]);});
 await check('references.runtimeIcons',()=>{for(const p of Object.values(plain(E('V092_ICONS'))))assert.ok(fs.existsSync(p),p);});
 await check('references.staticHTMLCSS',()=>{for(const f of ['index.html','styles/base.css']){const content=fs.readFileSync(f,'utf8');for(const m of content.matchAll(/(?:src|href)=["']([^"']+)|url\(['"]?([^\s)'";]+)['"]?\)/g)){const url=m[1]||m[2];if(/^(?:https?:|data:|#)/.test(url))continue;assert.ok(fs.existsSync(path.resolve(path.dirname(f),url.split(/[?#]/)[0])),url);}}});
 await check('audio.optionalMissingExplicit',()=>{assert.equal(validate(catalog).optionalMissing.length,6);assert.deepEqual(Object.keys(plain(E('AUDIO_FILES'))).sort(),['chopWood','footsteps','mineRock']);assert.ok(E('Object.entries(sounds).every(([key,a])=>(key==="footsteps"?!!a.src:!a.src)&&a.preload==="none")'));});
 await check('audio.noMissingRequestsOrDuplicateUnlock',async()=>{let calls=0;let decoded=0;E('audioCtx={state:"running",decodeAudioData:async d=>d}');r.context.fetch=async()=>{calls++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};};await E('preloadGameAudio()');await E('preloadGameAudio()');assert.equal(calls,3);
  E('audioLoadStarted=false;AUDIO_FILES.gunshot="assets/audio/effects/gunshot.mp3"');r.context.fetch=async(url,options)=>{calls++;assert.equal(options.cache,'no-cache');return{ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};};r.context.audioCtx=undefined;
  await E('preloadGameAudio()');await E('preloadGameAudio()');assert.equal(calls,7);assert.ok(E('!!audioBuffers.gunshot'));
  E('audioLoadStarted=false;delete audioBuffers.gunshot');r.context.fetch=async()=>({ok:false,arrayBuffer:async()=>{decoded++;return new ArrayBuffer(2);}});await E('preloadGameAudio()');assert.equal(decoded,0);assert.equal(E('!!audioBuffers.gunshot'),false);
 });
 const server=http.createServer((req,res)=>{const prefix='/project/last-base/';if(!req.url.startsWith(prefix)){res.writeHead(404).end();return;}const p=req.url.slice(prefix.length);if(p.includes('..')||!fs.existsSync(p)){res.writeHead(404).end();return;}res.end(fs.readFileSync(p));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(const f of migration.files)await check('http.projectPrefix.'+f.id,async()=>{const res=await fetch(`http://127.0.0.1:${server.address().port}/project/last-base/${f.path}`);assert.equal(res.status,200);assert.equal(sha(Buffer.from(await res.arrayBuffer())),f.sha256);});}finally{await new Promise(resolve=>server.close(resolve));}
 await check('replacement.normalImageSamePathNewResolution',async()=>{
  const d=catalog.images['art/chest'],canvas=createCanvas(d.size[0]*2,d.size[1]*2);canvas.getContext('2d').fillRect(0,0,canvas.width,canvas.height);
  const q=setup('index.html',{}, {imageOverrides:{[d.path]:canvas.toBuffer('image/png')}});await q.eval('GameAssets.load("art/chest")');assert.ok(q.eval('V011Art.ready("chest")'));assert.deepEqual(plain(q.eval('V011Art.bounds("chest")')),Object.fromEntries(Object.entries(d.crop).map(([k,v])=>[k,v*2])));
 });
 await check('replacement.invalidAtlasFallsBackWithoutRetryStorm',async()=>{
  const d=catalog.images['art/monster_walker017'],canvas=createCanvas(16,16),q=setup('index.html',{}, {imageOverrides:{[d.path]:canvas.toBuffer('image/png')}});
  await q.eval('GameAssets.load("art/monster_walker017")');assert.equal(q.eval('V011Art.ready("monster_walker017")'),false);
  q.eval('for(let i=0;i<40;i++)V011Art.image("monster_walker017")');assert.equal(q.imageRequests.filter(p=>p===d.path).length,1);assert.equal(q.eval('GameAssets.stats().entries.find(r=>r.id==="art/monster_walker017").status'),'error');
 });
 await check('failure.missingImageSettlesOnce',async()=>{
  const d=catalog.images['art/chest'],q=setup('index.html',{}, {imageOverrides:{[d.path]:'assets/missing-test.webp'}});await q.eval('GameAssets.load("art/chest")');assert.equal(q.eval('V011Art.ready("chest")'),false);q.eval('for(let i=0;i<40;i++)V011Art.image("chest")');assert.equal(q.imageRequests.filter(p=>p===d.path).length,1);
 });
 await check('save.noResourceState',()=>assert.ok(!/GameAssets|AssetManifest|assets\/(?:images|atlases|icons)/.test(E('JSON.stringify(captureGameProgress())'))));
 await check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
 const result={version:require('../package.json').version,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,initialCanvasRequests:initialRequests,optionalMissingAudio:validate(catalog).optionalMissing,checks};fs.writeFileSync('qa/results/assets.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL')}));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
