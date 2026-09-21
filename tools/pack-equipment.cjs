// Offline packing of approved pixels, never an animation or art generator.
// node tools/pack-equipment.cjs <revision-4-directory> <v1-equipment-system.json> <generated-images-directory>
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]),legacy=JSON.parse(fs.readFileSync(process.argv[3]));
const approved=JSON.parse(fs.readFileSync(path.join(source,'prototype.json'))),catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json')));
const registration=JSON.parse(fs.readFileSync(path.join(source,'provenance/frame-registration.json')));
const out=path.join(root,'assets/atlases/player/equipment-v4');fs.mkdirSync(out,{recursive:true});
const sources={},images=new Map(),groups=new Map(),ratio=.5;
async function image(file){if(!images.has(file)){const bytes=fs.readFileSync(path.join(source,file));sources[file]=crypto.createHash('sha256').update(bytes).digest('hex');images.set(file,await loadImage(bytes));}return images.get(file);}
function blank(w=896,h=w){return createCanvas(w,h);}
function trim(c){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=-1,b=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return r<0?[0,0,2,2]:[Math.max(0,l-2),Math.max(0,t-2),Math.min(c.width,r+3)-Math.max(0,l-2),Math.min(c.height,b+3)-Math.max(0,t-2)];}
async function layer(group,key,file,offset=[0,0],segment=null,caps=null){
 if(!groups.has(group))groups.set(group,new Map());const g=groups.get(group);if(g.has(key))return g.get(key).ref;
 const im=await image(file),c=blank(im.width,im.height),x=c.getContext('2d');
 if(caps){x.beginPath();for(const h of caps){x.moveTo(h[0]+11,h[1]);x.arc(h[0],h[1],11,0,Math.PI*2);}x.clip();}
 if(segment)x.drawImage(im,...segment,...segment);else x.drawImage(im,0,0);
 const small=blank(Math.ceil(c.width*ratio),Math.ceil(c.height*ratio));small.getContext('2d').drawImage(c,0,0,small.width,small.height);
 const box=trim(small),cut=blank(box[2],box[3]);cut.getContext('2d').drawImage(small,...box,0,0,box[2],box[3]);
 const ref={id:'actor/v4/'+group,key,offset:[offset[0]+box[0]/ratio,offset[1]+box[1]/ratio],size:[box[2]/ratio,box[3]/ratio]};g.set(key,{c:cut,ref});return ref;
}
async function body(group,key,file){return layer('body-'+group,key,file,[256,256]);}
async function actionBody(name,i,record){
 // The prototype's review composites contain the complete limbs. Its 384px
 // body-only exports clip some raised hands/boots, so recover that same full
 // registered layer from the original approved body sheet, without repainting.
 const file=registration.actions[name].body,key='registered/'+name+'/'+i;
 const bytes=fs.readFileSync(path.join(path.resolve(process.argv[4]),file));sources['generated/'+file]=crypto.createHash('sha256').update(bytes).digest('hex');
 const im=await loadImage(path.join(path.resolve(process.argv[4]),file)),w=im.width/4,h=im.height/3,raw=blank(Math.ceil(w),Math.ceil(h));raw.getContext('2d').drawImage(im,i%4*w,Math.floor(i/4)*h,w,h,0,0,w,h);
 const c=blank(),x=c.getContext('2d'),r=record.registration;x.translate(r.targetFeet[0]-r.scale*r.sourceFeet[0],r.targetFeet[1]-r.scale*r.sourceFeet[1]);x.scale(r.scale,r.scale);x.drawImage(raw,0,0);images.set(key,c);
 return layer('body-'+name+'-work',String(i),key);
}
async function carry(name,frame,record){
 const old=legacy.items[name],isAK=name==='ak',file=record.body;
 const b=await body(old.body,String(frame),file);
 const hands=isAK?record.hands:frame<0?old.idleHands:old.frames[frame].hands;
 const angle=hands.length>1?Math.atan2(hands[1][1]-hands[0][1],hands[1][0]-hands[0][0])-Math.PI/2:old.angle||0;
 const mount=isAK?record.item:{position:hands[0].map(v=>v+256),angle,scale:old.scale,sourceGrip:old.grip,flipX:name==='axe'||old.flipX};
 const gear={position:mount.position,angle:mount.angle,scale:mount.scale,grip:mount.sourceGrip,flipX:!!mount.flipX};
 if(isAK){gear.rear=await layer('items','ak-rear','equipment/ak.png',[0,0],mount.rearSegment);gear.front=await layer('items','ak-front','equipment/ak.png',[0,0],mount.frontSegment);gear.muzzle=mount.muzzle;}
 else gear.front=await layer('items',name,old.equipment);
 const cap=isAK?null:await layer('caps-'+old.body,String(frame),file,[256,256],null,hands);
 return {body:b,gear,cap};
}
(async()=>{
 const m={revision:4,pivot:[448,448],scale:.125,walkCount:12,cycleDistance:catalog.actors.unarmed.cycleDistance,items:{},effects:{},sourceRatio:ratio};
 for(const name of Object.keys(legacy.items)){
  const old=legacy.items[name],bm=JSON.parse(fs.readFileSync(path.join(source,'body/'+old.body+'/body.json')));
  const idleRecord=name==='ak'?approved.akIdle:{body:'body/'+old.body+'/'+bm.idle};
  const entry={body:old.body,idle:await carry(name,-1,idleRecord),walk:[]};
  for(let i=0;i<12;i++)entry.walk.push(await carry(name,i,approved.sequences[name+'_walk'].frames[i]));
  if(['axe','pickaxe','hammer','fishing_rod'].includes(name)){
   const actionName=name==='fishing_rod'?'fishing':name,s=approved.sequences[actionName+'_action'];
   entry.action={duration:s.durations.reduce((a,b)=>a+b,0),durations:s.durations,impactFrame:s.impactFrame? s.impactFrame-1:null,impactPoint:s.impactPoint,frames:[]};
   for(let i=0;i<12;i++){
    const f=s.frames[i],rec={body:await actionBody(actionName,i,f),equipment:await layer(actionName+'-work',String(i),f.equipment),equipmentInFront:f.equipmentInFront,tip:f.tip};
    if(f.equipmentInFront)rec.cap=await layer(actionName+'-caps',String(i),f.handMask);
    if(f.fishing)rec.fishing={...f.fishing,effects:undefined};
    entry.action.frames.push(rec);
   }
  }
  m.items[name==='ak'?'rifle_ak74':name]=entry;
 }
 for(const material of ['wood','mineral','metal'])m.effects[material]=await Promise.all(Array.from({length:6},(_,i)=>layer('contact',material+i,'effects/contact/'+material+'/'+String(i+1).padStart(2,'0')+'.png',[-48,-48])));
 m.fish=await layer('items','fish','equipment/fish.png');
 // Empty source canvases never reach the runtime. Pack trimmed cels with a
 // transparent gutter and retain their original coordinates in the manifest.
 for(const [name,g]of groups){
  let x=2,y=2,h=0;const width=1024,placed=[];for(const [key,v]of g){if(x+v.c.width+2>width){x=2;y+=h+4;h=0;}placed.push({key,...v,x,y});x+=v.c.width+4;h=Math.max(h,v.c.height);}
  const height=y+h+2;if(height>2048)throw Error('Atlas exceeds mobile limit: '+name);
  const atlas=blank(width,height),ax=atlas.getContext('2d'),frames={};for(const v of placed){ax.drawImage(v.c,v.x,v.y);frames[v.key]={x:v.x,y:v.y,w:v.c.width,h:v.c.height};}
  const rel='assets/atlases/player/equipment-v4/'+name+'.png';fs.writeFileSync(path.join(root,rel),atlas.toBuffer('image/png'));
  catalog.images['actor/v4/'+name]={path:rel,size:[width,height],atlas:{layout:'packed',frameCount:g.size,frames}};
 }
 // Old files remain available to frozen regression fixtures, but no warmup
 // requests them. All new states use the one existing GameAssets cache.
 for(const id of ['actor/rifle','actor/tools','actor/equipment','actor/idle']){catalog.images[id].historical=true;delete catalog.images[id].prefetch;}
 m.preload=[...groups.keys()].map(k=>'actor/v4/'+k);
 const collect=(node,ids=new Set())=>{if(node&&typeof node==='object'){if(node.id?.startsWith('actor/v4/'))ids.add(node.id);for(const value of Object.values(node))collect(value,ids);}return ids;};
 for(const entry of Object.values(m.items))entry.preload=[...collect(entry),...(entry.action?['actor/v4/contact']:[])];
 catalog.images['actor/unarmed_idle'].prefetch=['actor/unarmed','actor/sleep'];
 catalog.actors.modular=m;
 fs.writeFileSync(path.join(root,'assets/manifest.json'),JSON.stringify(catalog,null,2)+'\n');
 fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs/EQUIPMENT_APPROVED_SOURCES.json'),JSON.stringify({revision:4,ratio,sources},null,2)+'\n');
 const entries=m.preload.map(id=>catalog.images[id]);console.log(JSON.stringify({atlases:entries.length,frames:[...groups.values()].reduce((s,g)=>s+g.size,0),pngBytes:entries.reduce((s,d)=>s+fs.statSync(path.join(root,d.path)).size,0),rgbaBytes:entries.reduce((s,d)=>s+d.size[0]*d.size[1]*4,0)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
