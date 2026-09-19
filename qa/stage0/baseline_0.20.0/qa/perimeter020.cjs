const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./runtime.cjs');
async function main(){
  const dir=path.resolve(__dirname,'..');process.chdir(dir);
  const old=setup('source/baseline_0.19.1.html');
  old.eval("V015Base.sections.forEach((o,i)=>{o.level=1+i%5;o.maxHp=[0,10000,20000,40000,60000,100000][o.level];o.hp=Math.round(o.maxHp*(.4+(i%4)*.15));});V016Turret.guns[0].ammo=137;V016Turret.guns[0].level=4;");
  const legacy=old.eval('captureGameProgress()');
  legacy.turret016.nextId=3;legacy.turret016.guns.push({id:'hmg016_2',ammo:82,angle:0,enabled:true,level:2,x:700,y:1035,wallId:'v091wall015_SL_3',fallen:false});
  const oldInner=legacy.base015.sections.filter(o=>o.id.startsWith('v015command')).map(o=>[o.id,o.hp,o.level]);
  old.eval('decodeGameProgress('+JSON.stringify(JSON.stringify(legacy))+')');
  old.eval('saveGameProgress();');const oldStorage=Object.fromEntries(old.storage);
  const r=setup('index.html'),E=s=>r.eval(s),checks=[];
  const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
  await Promise.all([...E('Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode())'),...E('[1,2,3,4,5].map(n=>V020Walls.image(n).decode())')]);
  E('window.baseline020=JSON.stringify(captureGameProgress());');
  function fresh(){E("restoreGameProgress(decodeGameProgress(baseline020));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false;scene='surface';V013City.setFloor(0);playerDead=false;movePower=moveX=moveY=0;frameScale=1;cancelNavigation();zombies=[];");}
  function step(n=46){for(let i=0;i<n;i++){r.advance(16.667);E('updatePlayer();');}}
  check('version 0.20.0',E("captureGameProgress().gameVersion==='0.20.0'"));
  check('exactly 16 perimeter objects',E('V015Base.sections.filter(V020Walls.perimeter).length===16'));
  check('4 corners and 11 solid wall sections',E("V015Base.sections.filter(o=>o.corner).length===4&&V015Base.sections.filter(o=>o.group==='outer'&&!o.corner).length===11"));
  check('one outer gate, on south side',E("V015Base.sections.filter(o=>o.group==='gate').length===1&&V015Base.byId.get('gate').side==='S'"));
  check('north gate and airlock gone from physical geometry and interactions',E("!surfaceWalls().some(o=>o.id==='v015northGate'||o.id==='v091innerGate'||o.id.startsWith('v015airlock'))&&!interactionObjects().some(o=>o.id==='v091innerGate'||o.id==='v015northGate')"));
  check('old airlock passage unobstructed',E("[1130,1180,1220].every(y=>!worldCollision(800,y,17,'surface'))"));
  check('inner perimeter unchanged: 12 objects',E("V015Base.sections.filter(o=>o.group==='inner').length===12"));
  check('new wall width 104, wider than 72',E("V015Base.sections.filter(o=>o.group==='outer'&&!o.corner).every(o=>Math.min(o.w,o.h)===104)"));
  for(const side of ['N','E','S','W'])check(side+' has three spans and four ladders',E(`V015Base.sections.filter(o=>!o.corner&&V020Walls.perimeter(o)&&o.side==='${side}').length===3&&V091Fortress.stairs.filter(t=>t.side==='${side}').length===4`));
  E('gateOpen=false;invalidateGeometry();');
  check('continuous closed perimeter: no collider gaps',E("(()=>{for(let x=150;x<1450;x+=5)if(!worldCollision(x,150,0,'surface')||!worldCollision(x,1050,0,'surface'))return false;for(let y=110;y<1090;y+=5)if(!worldCollision(190,y,0,'surface')||!worldCollision(1410,y,0,'surface'))return false;return true;})()"));
  E('toggleGate();');check('south gate opens full passage',E("gateOpen&&!worldCollision(800,1050,17,'surface')&&worldCollision(800,150,17,'surface')"));
  check('gate bridge remains walkable while gate open',E('V015Base.deckPresent(800,1050)&&!V091Fortress.elevatedCollision(800,1050,17)'));
  for(let i=0;i<16;i++){
    fresh();E(`window.st=V091Fortress.stairs[${i}];player.x=st.foot.x;player.y=st.foot.y;player.wallLevel=false;`);
    const name=E('st.id');check(name+' has clear ground landing and wall landing',E("!worldCollision(st.foot.x,st.foot.y,player.radius,'surface')&&!V091Fortress.elevatedCollision(st.x,st.y,player.radius)"));
    E("window.action=interactionObjects().find(o=>o.id==='v091stairs_'+st.id);executeInteraction(action);");
    check(name+' starts climb by interaction',E('V091Fortress.transitioning'));
    const start=E('({x:player.x,y:player.y})');step(20);
    check(name+' intermediate smooth movement',E('V091Fortress.transitioning&&!player.wallLevel')&&Math.hypot(E('player.x')-start.x,E('player.y')-start.y)>2&&E('Math.hypot(player.x-st.x,player.y-st.y)>2'));
    step(26);check(name+' completes climb',E('player.wallLevel&&!V091Fortress.transitioning&&Math.hypot(player.x-st.x,player.y-st.y)<.01'));
    E("action=interactionObjects().find(o=>o.id==='v091stairs_'+st.id);executeInteraction(action);updateAutoWalk();");step(46);
    check(name+' descends to courtyard',E('!player.wallLevel&&!V091Fortress.transitioning&&V020Walls.inside(player.x,player.y)'));
  }
  for(const [side,x,y,dx,dy]of [['N',800,155,0,-1],['E',1408,600,1,0],['S',800,1045,0,1],['W',192,600,-1,0]]){
    fresh();E(`player.x=${x};player.y=${y};player.wallLevel=true;moveX=${dx};moveY=${dy};movePower=1;`);step(70);
    check(side+' outward stick cannot leave wall',E('player.wallLevel&&!V091Fortress.transitioning&&!V091Fortress.elevatedCollision(player.x,player.y)'));
    E(`movePower=0;moveX=moveY=0;V091Fortress.handlePoint(${x+dx*250},${y+dy*250});`);check(side+' outward tap cannot jump',E('player.wallLevel&&!V091Fortress.transitioning'));
    E(`player.x=${x};player.y=${y};`);check(side+' inward jump starts',E('V091Fortress.jumpInward()'));step(24);check(side+' inward jump lands safely',E("!player.wallLevel&&V020Walls.inside(player.x,player.y)&&!worldCollision(player.x,player.y,player.radius,'surface')"));
  }
  fresh();E("window.w=V015Base.byId.get('v091wall020_N_0');w.hp=0;V015Base.changed();");
  check('destroyed wall creates real traversable breach',E("!worldCollision(420,150,17,'surface')&&!V015Base.deckPresent(420,150)"));
  check('ladder on destroyed section becomes unavailable',E("!interactionObjects().some(o=>o.id==='v091stairs_n_0')&&!V020Walls.usable(V091Fortress.stairs[0])"));
  check('destroyed deck blocks upper path',E('V091Fortress.elevatedCollision(420,150)'));
  fresh();E("window.w=V015Base.byId.get('v091wall020_N_0');player.x=420;player.y=155;player.wallLevel=true;V015Base.damage(w,10000);");
  check('player on collapsing wall is placed in safe courtyard',E("!player.wallLevel&&V020Walls.inside(player.x,player.y)&&!worldCollision(player.x,player.y,player.radius,'surface')"));
  fresh();E("window.w=V015Base.byId.get('v091wall020_N_0');");
  for(const [hp,s]of [[10000,0],[9001,0],[9000,1],[5001,1],[5000,2],[2001,2],[2000,3],[1,3],[0,4]]){E(`w.hp=${hp};`);check('damage stage at '+hp+' HP',E(`V020Walls.stage(w)===${s}&&V015Base.stage(w)===${s}`));}
  fresh();E("window.w=V015Base.byId.get('v091wall020_N_0');window.seam=w.x+w.w;window.p=V016Turret.candidate(seam,153);");
  check('turret can straddle wall seam without snap',E('p&&p.x===seam&&p.y===153'));
  check('partial turret base overlap accepted',E('V016Turret.candidate(420,207)!==null'));
  check('barrel-only overlap rejected',E('V016Turret.candidate(420,227)===null'));
  E("window.t={id:'hmg016_99',x:seam,y:153,wallId:'v091wall020_N_0',fallen:false,ammo:92,level:4,enabled:true,angle:0};V016Turret.guns.push(t);w.hp=0;V015Base.changed();V016Turret.settleUnsupported();");
  check('seam gun retains adjacent intact support',E("!t.fallen&&t.wallId==='v091wall020_N_1'&&t.ammo===92&&t.level===4"));
  E("V015Base.byId.get('v091wall020_N_1').hp=0;V015Base.changed();V016Turret.settleUnsupported();");
  check('unsupported gun becomes recoverable without ammo or upgrade loss',E('t.fallen&&t.wallId===null&&t.ammo===92&&t.level===4'));
  fresh();
  E('window.legacy020='+JSON.stringify(JSON.stringify(legacy))+';window.migrated020=decodeGameProgress(legacy020);restoreGameProgress(migrated020);');
  check('0.19.1 save migrates to 28 sections/schema 4',E('migrated020.base015.schema===4&&migrated020.base015.sections.length===28'));
  check('inner wall HP/levels preserved exactly',E("JSON.stringify(migrated020.base015.sections.filter(o=>o.id.startsWith('v015command')).map(o=>[o.id,o.hp,o.level]))")===JSON.stringify(oldInner));
  E('window.uniform020=JSON.parse(legacy020);uniform020.base015.sections.forEach(o=>{o.level=3;o.hp=16000;});window.uniformResult=V015Base.normalizeSave(uniform020.base015);');
  check('merged sections preserve level and 40% health proportion',E('uniformResult.sections.every(o=>o.level===3&&o.hp===16000)'));
  E('uniform020.player.x=206;uniform020.player.y=166;uniform020.v091.fortress.x=206;uniform020.v091.fortress.y=166;uniform020.v091.fortress.wallLevel=true;window.elevated020=decodeGameProgress(JSON.stringify(uniform020));');
  check('old upper-wall save remains valid',E('elevated020.v091.fortress.wallLevel&&elevated020.player.x===206&&elevated020.player.y===166'));
  check('existing gun ammo/upgrades preserved',E("V016Turret.guns[0].ammo===137&&V016Turret.guns[0].level===4&&V016Turret.guns[0].wallId==='v091wall020_corner_SE'"));
  check('obsolete mount yields recoverable gun with contents intact',E("V016Turret.guns[1].fallen&&V016Turret.guns[1].ammo===82&&V016Turret.guns[1].level===2"));
  const raw=E('captureGameProgress()');
  check('inventory unchanged by perimeter migration',JSON.stringify(raw.bag)===JSON.stringify(legacy.bag));
  check('drone state unchanged by perimeter migration',!!raw.robots014&&JSON.stringify(raw.robots014)===JSON.stringify(legacy.robots014));
  E('window.again020=JSON.stringify(captureGameProgress());restoreGameProgress(decodeGameProgress(again020));');
  check('save/load preserves all new wall HP and upgrades',E('JSON.stringify(captureGameProgress().base015)===JSON.stringify(JSON.parse(again020).base015)'));
  check('save/load preserves turret positions and contents',E('JSON.stringify(captureGameProgress().turret016)===JSON.stringify(JSON.parse(again020).turret016)'));
  check('fixtures all reference existing walls',E('V016Lighting.fixtures().every(f=>f.wall&&V015Base.byId.has(f.wall.id))'));
  check('eight outward corner floodlights retained',E("V016Lighting.fixtures().filter(f=>f.kind==='flood').length===8"));
  fresh();E("ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#29342d';ctx.fillRect(0,0,1280,800);camera.x=0;camera.y=0;ctx.save();ctx.translate(80,0);ctx.scale(.70,.70);drawSurface();drawPlayer();ctx.restore();");
  fs.writeFileSync(path.join(__dirname,'perimeter_day.png'),r.canvas.toBuffer('image/png'));
  E("V010Camera.restore({...V010Camera.capture(),zoom:.6});player.x=800;player.y=600;camera.x=800-screenWidth/(2*.6);camera.y=600-screenHeight/(2*.6);V09Power.running=true;V09Power.fuel=80;V016Lighting.restore({schema:1,day:1,minute:1380});draw();");
  fs.writeFileSync(path.join(__dirname,'perimeter_night.png'),r.canvas.toBuffer('image/png'));
  check('actual full render without canvas errors',r.errors.length===0);
  const booted=setup('index.html',oldStorage);
  check('automatic startup reads previous-version browser save',booted.eval('!gameSaveBlocked&&V015Base.sections.length===28&&V016Turret.guns[0].ammo===137'));
  check('automatic startup has no console errors',booted.errors.length===0);
  const report={version:'0.20.0',passed:checks.length,checks,consoleErrors:r.errors,environment:'Actual game JavaScript and Canvas2D, modeled DOM; not a physical Telegram/iPhone.'};
  fs.writeFileSync(path.join(__dirname,'perimeter_0.20.0.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
