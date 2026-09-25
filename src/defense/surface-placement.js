/* Surface extension of the existing placement authority. Fixed perimeter,
   no world building grid, no sector unlocks and no new spawn rules. */
window.GameSurfacePlacement=(()=>{
 const box=DefenseDefinitions.yard,overlap=(a,b,p=0)=>a.x<b.x+b.w+p&&a.x+a.w>b.x-p&&a.y<b.y+b.h+p&&a.y+a.h>b.y-p;
 function protectedAreas(){return [{x:744,y:214,w:112,h:772},{x:254,y:544,w:1092,h:112},...V091Fortress.stairs.flatMap(s=>[s,s.foot].filter(Boolean).map(p=>({x:p.x-54,y:p.y-54,w:108,h:108})))];}
 let fixedRevision=-1,fixedBodies=[];
 function fixed(){if(fixedRevision===geometryRevision)return fixedBodies;fixedRevision=geometryRevision;fixedBodies=[...V015Base.sections.filter(s=>!s.gate),...solidObjects('surface').filter(s=>!GameEquipment.get(s.id)&&!String(s.id).startsWith('build:'))].filter(o=>overlap(body(o),{x:box.left-65,y:box.top-65,w:box.right-box.left+130,h:box.bottom-box.top+130}));return fixedBodies;}
 const body=o=>o.r!==undefined?{x:o.x-o.r,y:o.y-o.r,w:o.r*2,h:o.r*2}:o;
 function routes(records){
  const step=24,radius=17,cols=Math.ceil((box.right-box.left)/step),rows=Math.ceil((box.bottom-box.top)/step),objects=fixed().map(body).concat(records.filter(r=>r.placement==='installed'&&r.transform.scene==='surface'&&!r.state.settings.mountWall&&r.state.condition.hp>0).map(GameFootprints.forRecord)),blocked=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
  const pos=i=>({x:box.left+(i%cols+.5)*step,y:box.top+(Math.floor(i/cols)+.5)*step});
  for(let i=0;i<blocked.length;i++){const p=pos(i);blocked[i]=p.x>box.right-radius||p.y>box.bottom-radius||objects.some(o=>rectHit(p.x,p.y,radius,o))?1:0;}
  function nearest(p,max=65){let at=-1,best=max;for(let i=0;i<blocked.length;i++)if(!blocked[i]){const q=pos(i),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<best){best=d;at=i;}}return at;}
  const start=nearest({x:800,y:914});if(start<0)return false;const queue=[start];seen[start]=1;
  for(let k=0;k<queue.length;k++){const i=queue[k],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*cols+nx;if(nx>=0&&ny>=0&&nx<cols&&ny<rows&&!blocked[j]&&!seen[j]){seen[j]=1;queue.push(j);}}}
  for(const p of [{x:800,y:266},{x:306,y:600},{x:1294,y:600},{x:800,y:746}]){const at=nearest(p);if(at<0||!seen[at])return false;}
  return records.filter(r=>r.placement==='installed'&&r.transform.scene==='surface'&&!r.state.settings.mountWall).every(r=>{const b=GameFootprints.forRecord(r);return queue.some(i=>{const p=pos(i),q=contactPoint(b,p.x,p.y);return Math.hypot(p.x-q.x,p.y-q.y)<58;});});
 }
 function checkRecord(record,records,occupants=true){
  const fail=reason=>({ok:false,reason}),t=record.transform,d=DefenseDefinitions.types[record.typeId];
  if(!d||t.scene!=='surface'||t.room!=='yard'||!EquipmentInstances.turns.includes(t.rotation)||![t.x,t.y].every(Number.isFinite))return fail('room');
  // Wall mounting and ground placement use the same real instance / transform.
  if(record.state.settings.mountWall){
   const wall=V015Base.byId.get(record.state.settings.mountWall),p=GameEquipmentPoint(record),legacy=/^hmg016_/.test(record.id);
   if(!d.ammoType||!wall||wall.gate||(!legacy&&wall.group!=='outer')||Math.hypot(p.x-clamp(p.x,wall.x,wall.x+wall.w),p.y-clamp(p.y,wall.y,wall.y+wall.h))>=17.99)return fail('bounds');
   if(!legacy){const b=GameFootprints.forRecord(record);
    if(protectedAreas().some(a=>overlap(b,a)))return fail('door');
    if(records.some(r=>r.id!==record.id&&r.placement==='installed'&&r.transform.scene==='surface'&&overlap(b,GameFootprints.forRecord(r),8)))return fail('overlap');
    if(occupants&&BunkerLayout.occupants('surface').some(a=>a.wallLevel&&rectHit(a.x,a.y,(a.radius||16)+2,b)))return fail('occupied');
   }
   return {ok:true,record:JSON.parse(JSON.stringify(record))};
  }
  if(record.state.settings.fallen)return {ok:true,record:JSON.parse(JSON.stringify(record))};
  const b=GameFootprints.forRecord(record);if(b.x<box.left||b.y<box.top||b.x+b.w>box.right||b.y+b.h>box.bottom)return fail('bounds');
  if(protectedAreas().some(p=>overlap(b,p)))return fail('door');
  if(fixed().map(body).some(p=>overlap(b,p,1))||records.some(r=>r.id!==record.id&&r.placement==='installed'&&r.transform.scene==='surface'&&!r.state.settings.mountWall&&r.state.condition.hp>0&&overlap(b,GameFootprints.forRecord(r),1)))return fail('overlap');
  if(occupants&&[...BunkerLayout.occupants('surface'),...zombies.filter(z=>z.alive)].some(a=>rectHit(a.x,a.y,(a.radius||16)+2,b)))return fail('occupied');
  if(!routes(records.filter(r=>r.id!==record.id).concat(record)))return fail('passage');return {ok:true,record:JSON.parse(JSON.stringify(record))};
 }
 function GameEquipmentPoint(r){const p=DefenseDefinitions.types[r.typeId].pivot;return EquipmentInstances.aabb(r.transform,{...p,w:0,h:0});}
 function mountFor(record){if(!DefenseDefinitions.types[record.typeId]?.ammoType)return '';
  const p=GameEquipmentPoint(record);let wall=null,best=17.99;for(const w of V015Base.sections){if(w.group!=='outer'||w.gate||w.hp<=0)continue;const d=Math.hypot(p.x-clamp(p.x,w.x,w.x+w.w),p.y-clamp(p.y,w.y,w.y+w.h));if(d<best){best=d;wall=w;}}return wall?.id||'';
 }
 return Object.freeze({box,protectedAreas,checkRecord,routes,mountFor});
})();
