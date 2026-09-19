from pathlib import Path
import re
root=Path(__file__).resolve().parent
def original(name):return (root/(name+'_original.js')).read_text()
def replace(s,a,b,n=1):
    if n is not None:assert s.count(a)==n,(a[:150],s.count(a),n)
    return s.replace(a,b)
def region(s,a,b,new):
    i=s.index(a);j=s.index(b,i);return s[:i]+new+s[j:]
def save(name,s):(root/(name+'.js')).write_text(s)

# Retain the existing two-elevation movement and incremental navigation.
s=original('fortress')
s=region(s,'  const outer=surface.outer;','  let innerGateOpen=', '''  const outer=surface.outer;
  Object.assign(outer,V020Walls.bounds);
  Object.assign(gateRect,V020Walls.gate);
  const innerGate={id:'v091innerGate',x:730,y:1170,w:140,h:20}; // save compatibility only
  const vestibule=[];
  const corners=V020Walls.corners;
  const stairs=V020Walls.stairs;
  const towerSolids=corners.map(t=>({id:'v091tower_'+t.id,x:t.x-80,y:t.y-80,w:160,h:160}));
  const decks=[{x:138,y:98,w:1324,h:104},{x:138,y:98,w:104,h:1004},
    {x:1358,y:98,w:104,h:1004},{x:138,y:998,w:1324,h:104},...towerSolids];
''')
s=replace(s,'let innerGateOpen=false,','let innerGateOpen=true,')
s=replace(s,"const candidates=[t.foot];","if(!t||!V020Walls.usable(t))return null;\n    const candidates=[t.foot];")
s=replace(s,"Лестница занята — выберите другую башню","Лестница занята — выберите другую")
s=replace(s,'return corners.map(t=>({t,path:findPath(player.x,player.y,t),landing:landingFor(t)}))','return stairs.filter(V020Walls.usable).map(t=>({t,path:findPath(player.x,player.y,t),landing:landingFor(t)}))')
s=region(s,"      const inside=player.x>242",'      // A held pointer', '')
s=replace(s,'candidates:[...corners].sort','candidates:stairs.filter(V020Walls.usable).sort')
s=replace(s,'if(x<170||x>1430||y<130||y>1070)','if(x<138||x>1462||y<98||y>1102)')
s=replace(s,'function towerFor(target){return corners.find(t=>t.id===target?.tower);}','function towerFor(target){return stairs.find(t=>t.id===target?.tower);}')
s=replace(s,"name:'Подняться на башню'","name:'Подняться на стену'")
s=region(s,"    return [...base,{...innerGate,kind:'v091innerGate'",'  const oldCanInteract=', '''    return [...base.filter(o=>o.id!=='v091innerGate'&&o.kind!=='v091tower'&&o.kind!=='v091stairs'),
      ...stairs.filter(V020Walls.usable).map(t=>({id:'v091stairs_'+t.id,kind:'v091stairs',tower:t.id,
        name:isElevated()?'Спуститься во двор':'Подняться на стену',...(isElevated()?{x:t.x,y:t.y}:t.foot),r:15,range:21}))];
  };
''')
s=replace(s,'const t=towerFor(target);if(!t)return false;const point=','const t=towerFor(target);if(!t||!V020Walls.usable(t))return false;const point=')
s=region(s,'  function toggleInnerGate(){','  const oldExecute=', '  function toggleInnerGate(){return false;} // the retired airlock is not physical\n')
s=replace(s,"duration:kind==='jump'?360:480","duration:kind==='jump'?360:720")
s=replace(s,'const t=corners.find(t=>distance(player.x,player.y,t.foot.x,t.foot.y)<48','const t=stairs.find(t=>V020Walls.usable(t)&&distance(player.x,player.y,t.foot.x,t.foot.y)<38')
s=replace(s,'const t=corners.find(t=>distance(x,y,t.x,t.y)<110','const t=stairs.find(t=>V020Walls.usable(t)&&distance(x,y,t.x,t.y)<58')
s=replace(s,"!o.id?.startsWith('v091wall')&&o.id!=='gate'&&o.id!=='v015northGate'","o.group!=='outer'&&o.id!=='gate'&&o.id!=='v015northGate'")
s=replace(s,"}else oldDrawPlayer();","}else if(transition?.kind==='stairs'){const lift=Math.sin(Math.PI*transition.elapsed/transition.duration)*5;ctx.save();ctx.translate(0,-lift);oldDrawPlayer();ctx.restore();}else oldDrawPlayer();")
s=replace(s,"innerGateOpen=data?.innerGateOpen??false","innerGateOpen=true")
s=replace(s,'window.V091Fortress={corners,decks,','window.V091Fortress={corners,stairs,decks,')
save('fortress',s)

s=original('base')
s=region(s,'  // Eight panels','  Object.assign(surface.inner', '''  V020Walls.create(add);
  const legacyLayout=new Map(V020Walls.oldLayout().map(o=>[o.id,o]));
''')
s=replace(s,'  const props=[];',"  for(const o of sections)if(o.group==='inner')legacyLayout.set(o.id,{...o,legacyMaxHp:o.maxHp});\n  const props=[];")
s=region(s,'    // The old south gate','  function changed()', '''    return sections.some(o=>V020Walls.perimeter(o)&&hp(o)>0&&x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h);
  }
''')
s=replace(s,'player.wallLevel=false;V091Fortress.cancelRoute();settle(player);',"player.wallLevel=false;V091Fortress.cancelRoute();const landing=V020Walls.inwardSafePoint(player.x,player.y,player.radius);if(landing)Object.assign(player,landing);else settle(player);")
s=replace(s,"o.id!=='yard_generator'&&!o.id?.startsWith('v015prop_')", "o.id!=='yard_generator'&&o.id!=='v091innerGate'&&o.id!=='v015northGate'&&!o.id?.startsWith('v015prop_')")
s=region(s,'  function capture(){return{schema:3,','  const captureOld=',(root/'migration020.js').read_text())
s=replace(s,"const probe=JSON.parse(raw);validate(probe.base015);validating=true;let d;try{d=decodeOld(raw);}","const probe=migrateGame(JSON.parse(raw));validate(probe.base015);validating=true;let d;try{d=decodeOld(JSON.stringify(probe));}")
s=replace(s,'restoreGameProgress=function(d){restore(d.base015);restoreOld(d);', 'restoreGameProgress=function(d){d=migrateGame(d);restore(d.base015);restoreOld(d);')
s=replace(s,'siege,capture,validate,restore,freePoint,','siege,capture,validate,restore,migrateGame,normalizeSave,legacyLayout,freePoint,')
s=replace(s,"c.fillRect(170,130,1260,940)","c.fillRect(138,98,1324,1004)")
s=replace(s,"    gridFloor(ctx,730,1070,140,100,28,['#59625d','#606861']);\n",'')
s=replace(s,"if(o.gate)gateArt(o);else ctx.drawImage(wallSprite(o),o.x-3,o.y-3);","if(o.gate)gateArt(o);else if(o.group==='outer')V020Walls.drawWall(o);else ctx.drawImage(wallSprite(o),o.x-3,o.y-3);")
s=region(s,'    for(const t of V091Fortress.corners){if(!deckPresent', '    drawLights(true);', '    for(const t of V091Fortress.stairs)V020Walls.drawStairs(t);\n')
# Delete unused turret pedestal renderer. No invisible sockets remain.
s=region(s,'  function pad(x,y,r=32){','  function drawWalls()', '')
save('base',s)

s=original('lighting')
s=region(s,"    for(const o of base.sections)if(o.group==='outer'", "    for(const [id,x,y,angle]of", '''    for(const side of ['N','E','S','W'])for(const [i,along]of (side==='N'||side==='S'?[370,650,950,1230]:[300,500,700,900]).entries()){
      const x=side==='W'?246:side==='E'?1354:along,y=side==='N'?206:side==='S'?994:along;
      const px=side==='W'?190:side==='E'?1410:x,py=side==='N'?150:side==='S'?1050:y;
      const wall=base.sections.find(o=>V020Walls.perimeter(o)&&px>=o.x&&px<=o.x+o.w&&py>=o.y&&py<=o.y+o.h);
      const nx=side==='W'?1:side==='E'?-1:0,ny=side==='N'?1:side==='S'?-1:0;
      a.push({id:'lamp020_'+side+'_'+i,kind:'wall',wall,x,y,height:3.8,angle:Math.atan2(ny,nx),range:330,device:x<800?'spot_left':'spot_right'});
    }
''')
s=region(s,"    const corners=[['NW',194", '    for(let i=0;i<corners.length;', '''    const corners=[['NW',190,94,-Math.PI/2,'v091wall020_corner_NW'],['NW',134,150,Math.PI,'v091wall020_corner_NW'],
      ['NE',1410,94,-Math.PI/2,'v091wall020_corner_NE'],['NE',1466,150,0,'v091wall020_corner_NE'],
      ['SW',190,1106,Math.PI/2,'v091wall020_corner_SW'],['SW',134,1050,Math.PI,'v091wall020_corner_SW'],
      ['SE',1410,1106,Math.PI/2,'v091wall020_corner_SE'],['SE',1466,1050,0,'v091wall020_corner_SE']];
''')
save('lighting',s)

s=original('turret')
s=replace(s,"wallId:'v091wall015_SR_3'","wallId:'v091wall020_corner_SE'")
s=region(s,'  function fits(p,w){','  function snapshotObstacles()', '''  function fits(p,w){return !!w&&[p.x,p.y].every(Number.isFinite)&&distance(p.x,p.y,clamp(p.x,w.x,w.x+w.w),clamp(p.y,w.y,w.y+w.h))<17.99;}
  function support(t){
    if(t.fallen)return false;
    const current=V015Base.byId.get(t.wallId);if(eligible(current)&&fits(t,current))return true;
    const other=V015Base.sections.find(w=>eligible(w)&&fits(t,w));if(!other)return false;t.wallId=other.id;return true;
  }
''')
s=region(s,'  function candidate(x,y){','  function placementProblem(p)', '''  function candidate(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    let best=null,bestD=Infinity;
    for(const w of V015Base.sections){if(!eligible(w)||!fits({x,y},w))continue;
      const d=distance(x,y,clamp(x,w.x,w.x+w.w),clamp(y,w.y,w.y+w.h));if(d<bestD){best={x,y,wallId:w.id};bestD=d;}
    }return best;
  }
''')
s=replace(s,"if(o.id===t.wallId)continue;","if(o.id===t.wallId||eligible(o)&&fits(t,o))continue;",2)
s=replace(s,"V091Fortress.corners.some(c=>","V091Fortress.stairs.filter(V020Walls.usable).some(c=>")
s=replace(s,'restoreGameProgress=function(d){validate(d.turret016,d);restoreOld(d);','restoreGameProgress=function(d){d=V015Base.migrateGame(d);validate(d.turret016,d);restoreOld(d);')
save('turret',s)

s=original('building')
s=replace(s,"r.kind==='wall'?'Секция стены'","r.kind==='wall'?(r.object.corner?'Угол стены':'Секция стены')")
save('building',s)
