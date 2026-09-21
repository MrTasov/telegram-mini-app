// Canonical resource catalog -> classic-script data. No network or build dependency.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function imageSize(b){
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return[b.readUInt32BE(16),b.readUInt32BE(20)];
 if(b.length>=10&&/^GIF8[79]a$/.test(b.toString('ascii',0,6)))return[b.readUInt16LE(6),b.readUInt16LE(8)];
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  for(let o=12;o+8<=b.length;){const type=b.toString('ascii',o,o+4),n=b.readUInt32LE(o+4),p=o+8;if(p+n>b.length)throw Error('Truncated WebP');
   if(type==='VP8X'&&n>=10)return[1+b.readUIntLE(p+4,3),1+b.readUIntLE(p+7,3)];
   if(type==='VP8L'&&n>=5&&b[p]===47){const v=b.readUInt32LE(p+1);return[1+(v&16383),1+((v>>>14)&16383)];}
   if(type==='VP8 '&&n>=10&&b[p+3]===157&&b[p+4]===1&&b[p+5]===42)return[b.readUInt16LE(p+6)&16383,b.readUInt16LE(p+8)&16383];
   o=p+n+(n&1);
  }
 }
 throw Error('Unsupported or invalid image header');
}
function validate(m,base=root){
 const errors=[],optionalMissing=[],paths=new Set(),sizes={};
 const problem=(id,s)=>errors.push(id+': '+s);
 const positive=n=>Number.isInteger(n)&&n>0;
 function resourcePath(id,p,ext){if(typeof p!=='string'||!/^assets\/[a-z0-9_./-]+$/.test(p)||p.split('/').some(x=>!x||x==='.'||x==='..')||!ext.test(p)){problem(id,'invalid stable path');return false;}if(paths.has(p))problem(id,'duplicate path');paths.add(p);return true;}
 function rect(id,r,w,h,cell){if(!r||![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>w||r.y+r.h>h)problem(id,'crop outside image');else if(cell&&(r.x<cell.x||r.y<cell.y||r.x+r.w>cell.x+cell.w||r.y+r.h>cell.y+cell.h))problem(id,'crop outside frame');}
 if(m.schema!==1||!m.images||!m.art||!m.icons||!m.walls||!m.aliases||!m.audio)throw Error('Invalid resource manifest schema');
 for(const [id,d]of Object.entries(m.images)){
  if(!resourcePath(id,d.path,/\.(png|webp|gif)$/))continue;
  if(!Array.isArray(d.size)||d.size.length!==2||!d.size.every(positive)){problem(id,'invalid reference size');continue;}
  const [w,h]=d.size;let actual;
  try{actual=imageSize(fs.readFileSync(path.join(base,d.path)));sizes[id]=actual;}catch(e){problem(id,'missing or invalid image: '+e.message);}
  if(d.crop)rect(id,d.crop,w,h);
  const a=d.atlas;
  if(a){
   if(actual&&(actual[0]!==w||actual[1]!==h))problem(id,'atlas size differs from metadata');
   if(!positive(a.frameCount))problem(id,'invalid frame count');
   if(a.layout==='grid'){
    if(!positive(a.columns)||!positive(a.rows)||!Array.isArray(a.frameSize)||a.frameSize.length!==2||!a.frameSize.every(positive)||a.columns*a.frameSize[0]!==w||a.rows*a.frameSize[1]!==h||a.frameCount>a.columns*a.rows)problem(id,'invalid grid/frame size');
    if(a.crops){if(a.crops.length!==a.frameCount)problem(id,'crop count differs from frame count');else a.crops.forEach((r,i)=>rect(id+'.'+i,r,w,h,{x:(i%a.columns)*a.frameSize[0],y:Math.floor(i/a.columns)*a.frameSize[1],w:a.frameSize[0],h:a.frameSize[1]}));}
   }else if(a.layout==='packed'){
    if(!a.frames||Object.keys(a.frames).length!==a.frameCount)problem(id,'packed frame count differs');
    for(const [key,r]of Object.entries(a.frames||{}))rect(id+'.'+key,r,w,h);
   }else problem(id,'unknown atlas layout');
  }
  for(const next of d.prefetch||[])if(!m.images[next]||next===id)problem(id,'invalid prefetch reference');
 }
 for(const group of ['art','icons','walls'])for(const [key,id]of Object.entries(m[group]))if(!m.images[id])problem(group+'.'+key,'unknown resource');
 // Frame groups are explicit; gameplay timing remains in the existing owners.
 for(const [key,id]of Object.entries(m.art)){
  const d=m.images[id],a=d?.atlas;
  if(key.startsWith('corpse_')&&(a?.layout!=='grid'||a.frameCount!==3))problem(key,'corpse variants must remain 3');
  if(key.startsWith('monster_')){
   const walk=d.animation?.walk,attack=d.animation?.attack;
   if(a?.layout!=='grid'||walk?.start!==0||walk?.count!==8||walk?.distance!==36||attack?.start!==8||attack?.count!==4||a.frameCount!==12)problem(key,'invalid walk/attack frame groups');
   if(!(d.visualScale>0&&d.visualScale<=1))problem(key,'invalid visual scale');
  }
 }
 if(m.actors){
  if(m.actors.visualScale!==undefined&&!(m.actors.visualScale>0&&m.actors.visualScale<=3))problem('actors.visualScale','invalid presentation scale');
  if(m.actors.unarmed?.walkScale!==undefined&&!(m.actors.unarmed.walkScale>0&&m.actors.unarmed.walkScale<=1))problem('actors.unarmed.walkScale','invalid movement correction');
  if(m.actors.unarmed?.contactPhases?.some(p=>!Number.isFinite(p)||p<0||p>=1))problem('actors.unarmed.contactPhases','invalid contact phase');
  if(m.actors.gathering&&!(m.actors.gathering.playbackRate>0&&m.actors.gathering.playbackRate<=4))problem('actors.gathering','invalid visual playback rate');
  if(m.actors.corpseScaleFromPrevious!==undefined&&!(m.actors.corpseScaleFromPrevious>0))problem('actors.corpseScaleFromPrevious','invalid corpse scale');
  if(m.actors.weaponVfx){
   const v=m.actors.weaponVfx;
   for(const [id,entry]of Object.entries(v.weapons)){
    const d={...v.defaults,...entry};
    if(!Array.isArray(d.muzzleOffset)||d.muzzleOffset.length!==2||!d.muzzleOffset.every(Number.isFinite)||['flashMs','flashLength','flashWidth','tracerLength','tracerWidth','joinDistance'].some(key=>!(d[key]>0&&Number.isFinite(d[key]))))problem('weaponVfx.'+id,'invalid muzzle/tracer definition');
   }
  }
  for(const [name,id]of Object.entries(m.actors.body))if(!m.images[id]?.atlas)problem('actor.'+name,'missing body atlas');
  for(const [name,item]of Object.entries(m.actors.items)){
   if(!m.actors.body[item.body]||!Number.isInteger(item.frame)||item.frame<0||item.frame>=m.images[m.actors.equipment]?.atlas?.frameCount||!item.grip?.every(Number.isFinite)||!(item.scale>0))problem('actor.'+name,'invalid equipment anchor');
  }
  for(const [key,count]of [['rifleHands',8],['toolHands',16]])if(m.actors[key]?.length!==count||m.actors[key].some(pair=>pair.length!==2||pair.some(p=>p.length!==2||!p.every(Number.isFinite))))problem(key,'invalid hand anchors');
  const mod=m.actors.modular;
  if(mod){
   if(mod.walkScale&&Object.values(mod.walkScale).some(s=>!(s>0&&s<=1)))problem('actors.modular.walkScale','invalid movement correction');
   const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
   const layer=(key,l)=>{if(!l||!m.images[l.id]?.atlas?.frames?.[l.key]||!point(l.offset)||!point(l.size)||l.size.some(v=>v<=0))problem(key,'invalid modular layer');};
   if(mod.walkCount!==12||!point(mod.pivot)||mod.scale!==.125)problem('actors.modular','invalid master scale/anchor');
   for(const [name,item]of Object.entries(mod.items)){
    if(item.walk.length!==12)problem(name,'walk must have twelve phases');
    for(const rec of [item.idle,...item.walk,...(item.action?.frames||[])]){
     layer(name,rec.body);for(const key of ['equipment','cap'])if(rec[key])layer(name,rec[key]);
     if(rec.gear){const g=rec.gear;if(!point(g.position)||!point(g.grip)||!Number.isFinite(g.angle)||!(g.scale>0))problem(name,'invalid mount');if(g.axisScale&&(!point(g.axisScale)||g.axisScale.some(v=>v<=0)))problem(name,'invalid projected tool scale');if(g.splitY!==undefined&&!(g.splitY>0&&g.splitY<512))problem(name,'invalid shaft split');for(const key of ['rear','front'])if(g[key])layer(name,g[key]);}
     if(rec.hands&&(!rec.hands.every(point)||rec.hands.length!==2))problem(name,'invalid work palm anchors');
    }
    if(item.action&&(item.action.frames.length!==12||item.action.durations.length!==12||item.action.durations.some(v=>!(v>0))||item.action.duration!==item.action.durations.reduce((s,v)=>s+v,0)))problem(name,'invalid work timing');
    for(const id of item.preload)if(!m.images[id])problem(name,'missing equipment prefetch');
   }
   for(const [material,frames]of Object.entries(mod.effects)){if(frames.length!==6)problem(material,'invalid contact effect count');frames.forEach(l=>layer(material,l));}
   layer('fishing',mod.fish);
   if(mod.fishWorldSize&&(!point(mod.fishWorldSize)||mod.fishWorldSize.some(v=>v<=0)))problem('fishing','invalid fish display size');
  }
 }
 for(const id of Object.values(m.walls))for(const part of ['wall','corner','stairs'])if(!m.images[id]?.atlas?.frames?.[part])problem(id,'missing wall region '+part);
 for(const [key,target]of Object.entries(m.aliases))if(m.art[key]||!m.art[target])problem('alias.'+key,'invalid art alias');
 for(const [key,d]of Object.entries(m.audio))if(resourcePath('audio.'+key,d.path,/\.(mp3|ogg|wav)$/)&&!fs.existsSync(path.join(base,d.path))){if(d.optional===true)optionalMissing.push(d.path);else problem(key,'required audio missing');}
 if(errors.length)throw Error(errors.join('\n'));
 return{images:Object.keys(m.images).length,optionalMissing,sizes};
}
function generate(check=false){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'))),report=validate(manifest);
 for(const d of Object.values(manifest.audio))d.available=fs.existsSync(path.join(root,d.path));
 const source='// Generated by tools/assets.cjs from assets/manifest.json. Edit the JSON catalog.\nconst AssetManifest='+JSON.stringify(manifest)+';\n';
 const file=path.join(root,'src/assets/manifest.js');
 if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==source)throw Error('Generated asset catalog is stale');}else fs.writeFileSync(file,source);
 return report;
}
module.exports={imageSize,validate,generate};
if(require.main===module){const r=generate(process.argv.includes('--check'));console.log(JSON.stringify({images:r.images,optionalMissing:r.optionalMissing}));}
