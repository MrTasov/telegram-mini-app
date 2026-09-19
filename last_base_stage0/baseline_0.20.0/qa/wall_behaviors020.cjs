const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./runtime.cjs');
async function main(){
 process.chdir(path.resolve(__dirname,'..'));const r=setup('index.html'),E=s=>r.eval(s),checks=[];
 const check=(name,v)=>{assert.ok(v,name);checks.push(name);};
 await Promise.all(E('[1,2,3,4,5].map(n=>V020Walls.image(n).decode())'));
 E('window.clean020=JSON.stringify(captureGameProgress());');
 function fresh(){E("restoreGameProgress(decodeGameProgress(clean020));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false;playerDead=false;scene='surface';V013City.setFloor(0);player.wallLevel=false;frameScale=1;movePower=moveX=moveY=0;cancelNavigation();zombies=[];");}
 const contract=require('./canvas-contract.cjs');
 for(const corner of ['NW','NE','SE','SW']){
  fresh();E(`window.w=V015Base.byId.get('v091wall020_corner_${corner}');window.nx=w.corner.includes('W')?-1:1;window.ny=w.corner.includes('N')?-1:1;window.cx=w.x+w.w/2;window.cy=w.y+w.h/2;`);
  check(corner+' initially blocks diagonal approach',E("!lineClear(cx+nx*130,cy+ny*130,cx-nx*86,cy-ny*86,28,'surface')"));
  E("V015Base.damage(w,w.maxHp);V016Lighting.restore({schema:1,day:10,minute:480});window.z=makeZombie(cx+nx*130,cy+ny*130);z.type='heavy';V017Monsters.prepare(z);zombies=[z];");
  check(corner+' destruction opens real passage for largest monster',E("lineClear(cx+nx*130,cy+ny*130,cx-nx*86,cy-ny*86,28,'surface')&&V020Walls.inside(cx-nx*86,cy-ny*86)"));
  for(const side of corner.split('')){E(`V017Monsters.state(z).side='${side}';`);check(corner+' raid squad '+side+' finds corner breach',E('V017Monsters.passage(z,null)?.wall.id===w.id'));}
  check(corner+' repair record exists independently',E('V018Build.record(w).object===w'));
 }
 fresh();E("V013Inventory.items[0]={type:'hammer',qty:1};V013Inventory.sync();activeHandSlot=0;bag.fill(null);bag[0]={type:'concrete',qty:100};bag[1]={type:'concrete',qty:100};bag[2]={type:'concrete',qty:100};bag[3]={type:'iron',qty:100};player.x=420;player.y=230;window.w=V015Base.byId.get('v091wall020_N_0');V015Base.damage(w,10000);");
 check('hammer starts reconstruction',E('V018Build.start(w)'));
 for(let i=0;i<50;i++){r.advance(100);E('V018Build.repairStep(100);');}
 check('5000 HP restored in five seconds using five concrete',E("w.hp===5000&&V018Build.count('concrete')===295"));
 check('repaired wall regains ground collision',E("worldCollision(420,150,17,'surface')"));
 for(let i=0;i<50;i++){r.advance(100);E('V018Build.repairStep(100);');}
 check('full 10000 HP restored in ten seconds',E("w.hp===10000&&!V018Build.job&&V018Build.count('concrete')===290"));
 check('repairs remove damage cracks',E('V020Walls.stage(w)===0'));
 for(const [level,hp]of [[2,20000],[3,40000],[4,60000],[5,100000]]){
  check('upgrade to level '+level,E('V018Build.upgrade(w)'));
  check('level '+level+' has correct HP and art',E(`w.level===${level}&&w.maxHp===${hp}&&w.hp===${hp}&&V020Walls.ready(w.level)`));
 }
 check('all four upgrades consume real materials',E("V018Build.count('concrete')===70&&V018Build.count('iron')===45"));
 check('level six cannot be purchased',E('!V018Build.upgrade(w)&&w.level===5'));
 E('window.upgraded020=JSON.stringify(captureGameProgress());restoreGameProgress(decodeGameProgress(upgraded020));w=V015Base.byId.get("v091wall020_N_0");');
 check('level five survives save/load',E('w.level===5&&w.hp===100000'));
 // Refuse to rebuild through actors and never spend material on failed repairs.
 fresh();E("V013Inventory.items[0]={type:'hammer',qty:1};V013Inventory.sync();activeHandSlot=0;bag[0]={type:'concrete',qty:100};w=V015Base.byId.get('v091wall020_N_0');V015Base.damage(w,10000);player.x=420;player.y=150;window.beforeConcrete=V018Build.count('concrete');");
 check('reconstruction refuses occupied breach',E('!V018Build.start(w)&&V018Build.count("concrete")===beforeConcrete'));
 // Real inventory -> seam mount -> save/load -> pack, with exact ID/ammo preservation.
 fresh();E("player.x=V015Base.byId.get('v091wall020_N_0').x+V015Base.byId.get('v091wall020_N_0').w;player.y=232;bag.fill(null);addItem('hmg016',1);window.item=bag.find(s=>s?.type==='hmg016');item.turretData.ammo=43;item.turretData.level=3;window.gunId=item.turretData.id;");
 check('start placement from real inventory',E('V016Turret.startPlacement(item)'));
 E('V016Turret.selectPoint(player.x,180);');
 check('place exactly across seam',E('V016Turret.place()'));
 check('placing consumes item, does not duplicate gun',E('!bag.includes(item)&&V016Turret.guns.filter(t=>t.id===gunId).length===1'));
 E('window.mounted020=JSON.stringify(captureGameProgress());restoreGameProgress(decodeGameProgress(mounted020));window.t=V016Turret.guns.find(t=>t.id===gunId);');
 check('seam mount saves ammo, upgrade and support',E('V016Turret.support(t)&&t.ammo===43&&t.level===3'));
 check('gun packs back to inventory',E('V016Turret.pack(t)'));
 check('packing preserves one physical gun with contents',E("!V016Turret.guns.some(t=>t.id===gunId)&&bag.filter(s=>s?.type==='hmg016'&&s.turretData.id===gunId).length===1&&bag.find(s=>s?.turretData?.id===gunId).turretData.ammo===43"));
 // Elevated movement routes across all four corner platforms.
 fresh();E('player.x=V091Fortress.corners[0].x;player.y=V091Fortress.corners[0].y;player.wallLevel=true;');
 for(const c of ['ne','se','sw'])check('continuous wall-top path to '+c,E(`V091Fortress.findPath(player.x,player.y,V091Fortress.corners.find(c=>c.id==='${c}'))?.length>0`));
 check('upper bullets are not blocked by the new perimeter',E("!V091Fortress.upperObstacleCollision(218,120,2,'surface')"));
 // A new destination uses the existing incremental navigator to find a stair.
 fresh();E('player.x=450;player.y=320;approachPoint(420,165);');
 for(let i=0;i<800;i++){r.advance(16.667);E('V091Navigation.tickPath();updatePlayer();');if(E('player.wallLevel&&!V091Fortress.transitioning&&Math.hypot(player.x-420,player.y-165)<1'))break;}
 check('ground tap reaches wall through an actual ladder',E('player.wallLevel&&Math.hypot(player.x-420,player.y-165)<2'));
 // Visual contact sheet from the same renderer, including every damage state.
 fresh();E("ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#24312d';ctx.fillRect(0,0,1280,800);camera.x=0;camera.y=0;");
 for(let level=1;level<=5;level++)for(let st=0;st<4;st++){
  E(`window.artWall={id:'preview',x:${20+st*315},y:${35+(level-1)*148},w:290,h:104,side:'N',group:'outer',level:${level},maxHp:10000,hp:${[10000,7000,3500,1000][st]}};V020Walls.drawWall(artWall);ctx.font='12px Arial';ctx.textAlign='left';ctx.fillStyle='#c6d5c2';ctx.fillText('Уровень ${level} · ${[100,70,35,10][st]}% HP',artWall.x,artWall.y-10);`);
  check('level '+level+' damage '+st+' renders with balanced canvas state',contract.state(r.canvas.getContext('2d')).depth===0);
 }
 fs.writeFileSync(path.join(__dirname,'wall_levels_damage.png'),r.canvas.toBuffer('image/png'));
 check('no console errors',r.errors.length===0);
 const report={version:'0.20.0',passed:checks.length,checks,consoleErrors:r.errors};fs.writeFileSync(path.join(__dirname,'wall_behaviors_0.20.0.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
