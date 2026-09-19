// Stage 0 only. Reads the frozen release; writes audit artifacts, never game files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),baseline=path.join(root,'baseline_0.20.0');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const write=(p,o)=>fs.writeFileSync(path.join(root,p),JSON.stringify(o,null,2)+'\n');
const text=fs.readFileSync(path.join(baseline,'index.html'),'utf8'),lines=text.split('\n');
const files=walk(baseline).map(p=>({path:path.relative(baseline,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:hash(fs.readFileSync(p))}));
const manifest=JSON.parse(fs.readFileSync(path.join(baseline,'release_manifest.json')));
const discrepancies=Object.entries(manifest.files).filter(([p,m])=>!files.some(f=>f.path===p&&f.bytes===m.bytes&&f.sha256===m.sha256)).map(([p])=>p);
write('audit/source_fingerprint.json',{gameVersion:'0.20.0',stage:'0-baseline',htmlLines:lines.length-1,htmlBytes:Buffer.byteLength(text),releaseManifestMismatch:discrepancies,files});
if(discrepancies.length)throw Error('Original release differs from manifest: '+discrepancies.join(', '));
// Conservative source-reference inventory, not a compiler call graph.
const modules=[];
for(let i=0;i<lines.length;i++){
 const m=lines[i].match(/^(?:window\.)?(?:(?:const|let)\s+)?(V\w+)\s*=\s*\(\s*\(\)\s*=>\s*\{/);
 if(m)modules.push({name:m[1],line:i+1});
}
for(let i=0;i<modules.length;i++){
 const m=modules[i],end=(modules[i+1]?.line||lines.length)-1,chunk=lines.slice(m.line-1,end).join('\n');m.scanEndLine=end;
 m.references=[...new Set([...chunk.matchAll(/\b(V\d\w*)\b/g)].map(x=>x[1]).filter(n=>n!==m.name))].sort();
 m.writes=[...new Set([...chunk.matchAll(/\b(update|draw|shoot|damagePlayer|captureGameProgress|restoreGameProgress|decodeGameProgress|worldCollision|solidObjects|executeInteraction|openOverlay|closeOverlay)\s*=\s*function/g)].map(x=>x[1]))];
}
const hooks={};for(let i=0;i<lines.length;i++)for(const m of lines[i].matchAll(/\b(update|draw|shoot|damagePlayer|captureGameProgress|restoreGameProgress|decodeGameProgress|worldCollision|solidObjects|executeInteraction|openOverlay|closeOverlay)\s*=\s*function/g))(hooks[m[1]]??=[]).push({line:i+1,excerpt:lines[i].trim().slice(0,260)});
const exportedModules=lines.flatMap((s,i)=>[...s.matchAll(/window\.(V\w+)\s*=/g)].map(m=>({name:m[1],line:i+1})));
write('audit/dependencies.json',{method:'Conservative text references within successive top-level module starts; boundaries may include intervening patches. Not a complete semantic graph. Export locations additionally include modules built inside anonymous patches, e.g. V091Fortress and V09World.',modules,exports:exportedModules,hookInstallOrder:hooks,bootstrap:lines.map((s,i)=>({line:i+1,text:s})).filter(x=>/loadGameProgress\(\);gameSaveReady=true|^gameLoop\(\);|^resizeCanvas\(\);|^applyControls\(\);/.test(x.text)),externalScripts:[...text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1])});
const refs=[...new Set([...text.matchAll(/["'`]((?:assets\/)[\w/.-]+\.(?:png|webp|gif)|[\w/.-]+\.(?:mp3|ogg|wav))["'`]/g)].map(m=>m[1]))];
write('audit/assets.json',{runtimeFiles:Object.keys(manifest.files).length,images:files.filter(f=>/^assets\//.test(f.path)).length,referenced:refs.map(p=>({path:p,exists:fs.existsSync(path.join(baseline,p))})),missing:refs.filter(p=>!fs.existsSync(path.join(baseline,p))),notes:['Wall atlas paths are formed dynamically; all files in the release manifest are independently hashed.','Missing audio means absent from this release package; hosted deployment was not inspected.']});
process.chdir(baseline);const {setup}=require('./runtime.cjs'),r=setup('index.html'),E=s=>r.eval(s);
const configs=E(`({version:captureGameProgress().gameVersion,items:ITEM,recipes:V09Craft.recipes,weapons:V09Craft.weapons,
 effectiveWeapons:Object.fromEntries(Object.keys(V09Craft.weapons).map(type=>[type,Array.from({length:6},(_,level)=>V010Combat.gunSpec({type,level,variant:'balanced',modules:{},magazineType:'magazine_standard',rounds:0}))])),
 magazines:V0162Magazines.TYPES,enemies:V017Monsters.specs,dayXEnemies:Object.fromEntries(Object.keys(V017Monsters.specs).map(t=>[t,V017Monsters.stats(t,true)])),
 equipment:Object.fromEntries(Object.entries(ITEM).filter(([t,d])=>d.equip).map(([type])=>[type,Array.from({length:6},(_,level)=>V010Combat.getItemStats({type,level,variant:'balanced',specialization:'balanced'}))])),
 upgradeCosts:Object.fromEntries(['rifle_ak74','rifle_m4','vest5','drone014','hmg016'].map(type=>[type,Array.from({length:5},(_,level)=>V0161Upgrade.cost({type,level,turretData:{level}},'body'))])),
 drone:{defaults:JSON.parse(JSON.stringify(V014Robots.state)),station:V014Robots.station,combat:{...V014Robots.combat},maxHP:V014Robots.maxHp(),cargoCapacity:V014Robots.capacity()},
 turret:{...V016Turret.combat},power:{supply:V09Power.supply,capacity:V09Power.capacity,rooms:V09Power.rooms,devices:Object.values(V09Power.devices).map(d=>({id:d.id,room:d.room,watts:d.watts,enabled:d.enabled})),battery:{...V010Energy.battery}},wallHP:V018Build.LEVELS,wallCosts:V018Build.COSTS,wallLayout:V015Base.sections.map(o=>({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,group:o.group,level:o.level,hp:o.hp,maxHp:o.maxHp})),
 player:{...player},farm: farmCrops.map((c,i)=>({...c,index:i,growMs:farmGrowMs(i)})),farmBeds:getFarmBeds(),
 save:{topKeys:Object.keys(captureGameProgress()),schemas:Object.fromEntries(Object.entries(captureGameProgress()).filter(([k,v])=>v&&typeof v==='object'&&'schema'in v).map(([k,v])=>[k,v.schema])),registeredModules:Object.keys(V010.modules)},
 exposedAPIs:Object.fromEntries(Object.keys(window).filter(k=>/^V\\d/.test(k)&&window[k]&&typeof window[k]==='object').map(k=>[k,Object.keys(window[k])]))})`);
// Costs that depend on live singleton modules must be sampled with each level.
configs.upgradeCosts.drone014=E(`Array.from({length:5},(_,level)=>{const old=V014Robots.state.modules.body;V014Robots.state.modules.body=level;const cost=V0161Upgrade.droneCost('body');V014Robots.state.modules.body=old;return cost;})`);
configs.environmentAssumptions={equipment:'starter gear; balanced variant and specialization',drone:'base modules unless explicit level sample',time:'seeded fixture clock, no offline interval',source:'actual runtime APIs, no reimplemented balance formulas'};
write('audit/configurations.json',configs);
write('audit/initial_save.json',E('captureGameProgress()'));
write('audit/runtime_inventory.json',{consoleErrors:r.errors,saveStorageKeys:[...r.storage.keys()],cachedImages:E('Object.keys(V011Art.sources).length'),entityCounts:E('({zombies:zombies.length,trees:worldTrees.length,ores:V09World.ores.length,walls:V015Base.sections.length,doors:V018Build.doorRecords.length})')});
console.log(JSON.stringify({files:files.length,runtimeFiles:Object.keys(manifest.files).length,modules:modules.length,missing:refs.filter(p=>!fs.existsSync(path.join(baseline,p))),errors:r.errors}));
