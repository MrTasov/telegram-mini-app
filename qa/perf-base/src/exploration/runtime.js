/* Authority adapter over existing regions, fog, interior geometry and Research.
   No duplicate map, loot table, crafting path, global clock or network transport. */
window.GameExploration=(()=>{
  const d=ExplorationDefinitions,regions=new Map(V010World.regions.map(r=>[r.id,r])),buildings=new Map(V011World.buildings.map(b=>[b.id,b]));
  const sectors=d.sectors.map(s=>{const b=s.buildingId?buildings.get(s.buildingId):null,r=s.regionId?regions.get(s.regionId):null;if(s.buildingId&&!b||s.regionId&&!r)throw Error('Missing sector geometry');return {...s,shape:b?{x:b.x,y:b.y,w:b.w,h:b.h}:r?{x:r.x,y:r.y,r:r.r}:s.shape,entry:s.entry||(b?{x:b.x+b.w/2,y:b.y+b.h+60}:{x:r.x,y:r.y})};});
  const sites=d.sites.map(s=>{const b=buildings.get(s.buildingId);if(!b)throw Error('Missing site building');return {...s,x:b.x+b.w/2,y:b.y+b.h-65,r:13,range:62,approach:{x:b.x+b.w/2,y:b.y+b.h+60}};});
  const gates=sectors.filter(s=>s.gate);
  const bySite=new Map(sites.map(s=>[s.id,s])),sourceSite=new Map(sites.map(s=>[s.sourceId,s]));
  let sequence=0,elapsed=0,lastResearchEpoch=-1,packetIds=new Set(),geometryKey='',polls=0;
  function packets(){if(GameResearch.epoch!==lastResearchEpoch){lastResearchEpoch=GameResearch.epoch;packetIds=new Set(GameResearch.capture().packets.map(p=>p.sourceId));}return packetIds;}
  const savedFacts=data=>({'world.open':true,'expedition.field_notes':data.research036?.packets?.some(p=>p.sourceId==='source.field_notes')===true});
  const facts=()=>({'world.open':true,'expedition.field_notes':packets().has('source.field_notes')});
  function contains(s,x,y,pad=0){const b=s.shape;return b.r?Math.hypot(x-b.x,y-b.y)<=b.r+pad:x>=b.x-pad&&x<=b.x+b.w+pad&&y>=b.y-pad&&y<=b.y+b.h+pad;}
  function observe(a){if(!a||a.dead||!a.entity||!['surface','bunker'].includes(a.scene))return null;
    const out={known:[],visited:[],sites:[]};if(a.scene!=='surface')return out;const p=a.entity;
    for(const s of sectors){if(contains(s,p.x,p.y,s.shape.r?0:90))out.known.push(s.id);if(contains(s,p.x,p.y,s.shape.r?-s.shape.r*.5:0))out.visited.push(s.id);}
    for(const site of sites)if(Math.hypot(site.x-p.x,site.y-p.y)<=140)out.sites.push(site.id);
    // Existing known IDs and grid are shared discovery evidence, not access.
    for(const s of sectors)if(s.regionId&&V010Camera.knows(s.regionId)||V010Camera.seen(s.entry.x,s.entry.y))out.known.push(s.id);
    return out;
  }
  const domain=ExplorationDomain.create(d,{initialProfile:'legacy',facts,actor:id=>GameActors.get(id),authorized:a=>GameActors.list().some(v=>v.id===a.id),observe,changed(){syncGeometry();queueGameSave();}});
  function syncGeometry(){const key=gates.filter(s=>!domain.allowed(s.id)).map(s=>s.id).join();if(key!==geometryKey){geometryKey=key;invalidateGeometry();}}
  function execute(c){if(GameSave.restoring||GameFlow.paused)return {ok:false,reason:'exploration.error.paused',revision:domain.revision};return domain.execute(c);}
  function survey(actorId=GameActors.localId){return execute({actorId,instanceId:d.worldId,action:'survey',payload:{},expectedRevision:domain.revision,requestId:'survey:'+domain.revision+':'+(++sequence)});}
  function tick(dt=16.667*frameScale){if(GameSave.restoring||GameFlow.paused)return;elapsed+=Math.max(0,Math.min(250,dt));if(elapsed<250)return;elapsed=0;polls++;
    for(const a of GameActors.list()){if(a.dead)continue;V010Camera.reveal(a);survey(a.id);}window.GameExplorationUI?.tick();
  }
  function sourceAccess(a,source){const s=sourceSite.get(source?.id);if(!s||!a||a.dead||a.scene!=='surface')return {available:false,reason:'exploration.error.surface'};
    if(!domain.allowed(s.sectorId))return {available:false,reason:'exploration.locked'};const p=a.entity,dist=Math.hypot(s.x-p.x,s.y-p.y);
    if(dist>s.range+(p.radius||15))return {available:false,reason:'exploration.error.distance'};
    const count=Math.max(1,Math.ceil(dist/8));for(let i=1;i<count;i++)if(worldCollision(p.x+(s.x-p.x)*i/count,p.y+(s.y-p.y)*i/count,2,'surface'))return {available:false,reason:'exploration.error.path'};
    return {available:true,reason:null};
  }
  function collect(id){const s=bySite.get(id);if(!s)return {ok:false,reason:'exploration.error.command'};const a=sourceAccess(GameActors.local,{id:s.sourceId});if(!a.available)return {ok:false,reason:a.reason};survey();return GameResearch.request('obtain',{sourceId:s.sourceId});}
  function migrate(data){if(data.sectors038)throw Error('Unexpected exploration owner');const known=data.v010?.modules?.camera?.known||[],p=data.player,seed={known:[],visited:[]};
    for(const s of sectors){if(s.regionId&&known.includes(s.regionId)){seed.known.push(s.id);seed.visited.push(s.id);}if(p?.scene==='surface'&&contains(s,p.x,p.y))seed.known.push(s.id);}
    data.sectors038=domain.fresh('legacy',seed);
  }
  function validate(data){if(!data.sectors038)throw Error('Missing exploration owner');domain.validate(data.sectors038,savedFacts(data));for(const packet of data.research036?.packets||[]){const site=sourceSite.get(packet.sourceId);if(site&&!data.sectors038.sites.includes(site.id))throw Error('Research packet without explored source');}return true;}
  GameSave.extend('capture','world.exploration',function(previous){const data=previous();data.sectors038=domain.capture();return data;});
  GameSave.extend('decode','world.exploration',function(previous,raw){const data=previous(raw);validate(data);return data;});
  GameSave.extend('restore','world.exploration',function(previous,data){validate(data);const out=previous(data);domain.restore(data.sectors038,savedFacts(data));lastResearchEpoch=-1;elapsed=0;syncGeometry();window.GameExplorationUI?.reset();return out;});
  GameState.register('exploration',{capture:domain.capture},{source:'exploration/runtime.js',saved:['sectors038'],transient:['sector geometry index','request sequence','poll budget']});
  const oldSolids=solidObjects;solidObjects=function(which=scene){const out=oldSolids(which);if(which!=='surface'||!geometryKey)return out;const extended=[...out];for(const s of gates)if(!domain.allowed(s.id))extended.push({id:'exploration_gate:'+s.id,...s.shape});return extended;};
  const oldCollision=worldCollision;worldCollision=function(x,y,r=15,which=scene,...args){if(which==='surface'&&geometryKey)for(const s of gates)if(!domain.allowed(s.id)&&rectHit(x,y,r,s.shape))return true;return oldCollision(x,y,r,which,...args);};
  const oldInteractions=interactionObjects;interactionObjects=function(which=scene){const out=oldInteractions(which);if(which==='surface')for(const s of sites){if(Math.hypot(s.x-player.x,s.y-player.y)>420)continue;out.push({...s,kind:'explorationSite',name:I18n.t(packets().has(s.sourceId)?'exploration.collected':s.title),ref:s});}return out;};
  const oldExecute=executeInteraction;executeInteraction=function(target,...args){if(target?.kind==='explorationSite'){const r=collect(target.id);message(I18n.t(r.ok?'exploration.collect.success':r.reason?.startsWith('exploration.')||r.reason?.startsWith('research.')?r.reason:'exploration.error.command'));return;}
    if(target?.ref?.id){const gate=sectors.find(s=>s.gate&&s.buildingId===target.ref.id&&!domain.allowed(s.id));if(gate){message(I18n.t('exploration.locked'));return;}}
    return oldExecute(target,...args);
  };
  const oldDraw=drawSurface;drawSurface=function(...args){const out=oldDraw(...args);for(const s of sites)if(domain.allowed(s.sectorId)&&!packets().has(s.sourceId)&&visibleOnScreen(s.x,s.y,100)&&Math.hypot(s.x-player.x,s.y-player.y)<240){ctx.save();ctx.fillStyle='#b5dfcf';ctx.strokeStyle='#244d49';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(s.x-10,s.y-13,20,26,3);ctx.fill();ctx.stroke();ctx.fillStyle='#355750';ctx.fillRect(s.x-5,s.y-5,10,2);ctx.fillRect(s.x-5,s.y,10,2);ctx.restore();}
    for(const s of sectors)if(s.gate&&!domain.allowed(s.id)&&visibleOnScreen(s.entry.x,s.entry.y,240)){const b=s.shape;ctx.save();ctx.fillStyle='#a58c64';ctx.fillRect(b.x+b.w/2-38,b.y+b.h-12,76,12);ctx.strokeStyle='#272b29';ctx.lineWidth=3;for(let x=0;x<76;x+=14){ctx.beginPath();ctx.moveTo(b.x+b.w/2-38+x,b.y+b.h);ctx.lineTo(b.x+b.w/2-30+x,b.y+b.h-12);ctx.stroke();}ctx.restore();}return out;};
  const oldUpdate=update;update=function(...args){const out=oldUpdate(...args);tick();return out;};
  GameResearch.subscribe(()=>{if(!GameSave.restoring&&!GameFlow.paused)survey();});
  return Object.freeze({definitions:d,sectors,sites,contains,facts,savedFacts,sourceAccess,collect,survey,execute,tick,migrate,validate,fresh:domain.fresh,capture:domain.capture,known:domain.known,visited:domain.visited,allowed:domain.allowed,siteKnown:domain.siteKnown,subscribe:domain.subscribe,
    siteHint:id=>{const s=bySite.get(id);return !!s&&(domain.siteKnown(id)||GameConditions.evaluate(s.hint,facts()).available);},
    claimed:id=>packets().has(bySite.get(id)?.sourceId),get epoch(){return domain.epoch;},get revision(){return domain.revision;},metrics:()=>({polls,sectors:sectors.length,sites:sites.length})});
})();
