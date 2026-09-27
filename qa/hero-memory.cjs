// Hero 2 atlases: decoded (RGBA) memory budget and packed-frame integrity.
// Sheets are lazy: the base sheets stay, an item's sheets load while it is held and are
// released a minute after it is put away (own sheet cache in src/render/hero.js).
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8')),h=m.actors.hero;
const checks=[];const check=(id,fn)=>{try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:String(e.message||e)});}};
const MiB=2**20,bytes=n=>{const d=m.images[h.sheets[n]];return d.size[0]*d.size[1]*4;};
const names=Object.keys(h.sheets),base=['idle','walk','run'];
const groups={ak:names.filter(n=>n.startsWith('ak_')),m4:names.filter(n=>n.startsWith('m4_')),rod:['idle_rod','walk_rod','run_rod','fish_cast','fish_wait','fish_reel'],remote:['idle_remote','walk_remote','run_remote']};
for(const t of ['pickaxe','axe','sledge'])groups[t]=['idle_','walk_','run_','strike_'].map(x=>x+t);
const sum=l=>l.reduce((s,n)=>s+bytes(n),0),sizes=Object.values(groups).map(sum).sort((a,b)=>b-a);
const other=Object.entries(m.images).filter(([id,d])=>!d.historical&&(id.startsWith('art/monster_')||id.startsWith('actor/'))&&!id.startsWith('actor/hero/')).reduce((s,[,d])=>s+d.size[0]*d.size[1]*4,0);
check('packed.allSheets24FramesInsideCells',()=>{for(const n of names){const d=m.images[h.sheets[n]],a=d.atlas,F=h.extra[n]?.frameSize||h.frameSize;assert.equal(a.layout,'packed',n);assert.equal(Object.keys(a.frames).length,24,n);
  for(const [k,r] of Object.entries(a.frames)){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=d.size[0]&&r.y+r.h<=d.size[1],n+'.'+k);assert.ok(r.ox>=0&&r.oy>=0&&r.ox+r.w<=F&&r.oy+r.h<=F,n+'.'+k+' cell');}}});
check('packed.everyGroupCovered',()=>{const covered=new Set([...base,...Object.values(groups).flat()]);assert.deepEqual(names.filter(n=>!covered.has(n)),[]);});
check('memory.allHeroSheetsWithin56MiB',()=>assert.ok(sum(names)<=56*MiB,(sum(names)/MiB).toFixed(1)));
check('memory.residentHeroWithin28MiB',()=>assert.ok(sum(base)+sizes[0]+sizes[1]<=28*MiB,((sum(base)+sizes[0]+sizes[1])/MiB).toFixed(1)));
check('memory.residentActorsWithin72MiB',()=>assert.ok(other+sum(base)+sizes[0]+sizes[1]<=72*MiB,((other+sum(base)+sizes[0]+sizes[1])/MiB).toFixed(1)));
const hero=fs.readFileSync(path.join(root,'src/render/hero.js'),'utf8');
check('release.policyPresent',()=>{assert.match(hero,/function release\(name\)/);assert.match(hero,/RELEASE_MS=60000/);assert.match(hero,/removeAttribute\('src'\)/);});
const r={passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,
 memory:{allHeroMiB:+(sum(names)/MiB).toFixed(1),baseMiB:+(sum(base)/MiB).toFixed(1),largestItemMiB:+(sizes[0]/MiB).toFixed(1),residentHeroWorstMiB:+((sum(base)+sizes[0]+sizes[1])/MiB).toFixed(1),otherActorsMiB:+(other/MiB).toFixed(1),scope:'RGBA pixel estimate, not process RSS; worst case = base + held item + previous item within its release minute'},checks};
console.log(JSON.stringify(r,null,1));process.exitCode=r.failed?1:0;
