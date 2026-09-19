const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./runtime.cjs');
async function main(){
 const packed=path.resolve(__dirname,'../index.html'),file=fs.existsSync(packed)?packed:path.resolve(__dirname,'../../github_0.19.1/index.html');
 process.chdir(path.dirname(file));
 const r=setup(file),E=s=>r.eval(s),checks=[];
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
 await Promise.all(E('Object.keys(V011Art.sources).map(k=>V011Art.image(k).decode())'));
 E("window.M=V017Monsters;window.baseline=JSON.stringify(captureGameProgress());");
 function fresh(type){E(`restoreGameProgress(decodeGameProgress(baseline));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false;scene='surface';V013City.setFloor(0);playerDead=false;player.x=800;player.y=800;camera.x=0;camera.y=0;zombies=[];window.z=makeZombie(350,350);z.type='${type}';M.prepare(z);zombies.push(z);V0105.tapWorld(z.x,z.y);`);}
 check('release version 0.20.0',E("captureGameProgress().gameVersion==='0.20.0'"));
 E('window.arcs=[];window.oldArc=ctx.arc.bind(ctx);ctx.arc=function(...a){arcs.push(a);return oldArc(...a);};');
 for(const type of ['normal','heavy','fast','leaper','bloater']){
  fresh(type);check(type+' actual tap selects target',E('V0105.target===z'));
  E('arcs=[];M.drawTarget();');check(type+' one circle surrounds selected monster',E('arcs.length===1&&arcs[0][0]===z.x&&arcs[0][1]===z.y&&arcs[0][2]===M.selectionRadius(z)'));
  E('z.x+=32;z.y+=19;arcs=[];M.drawTarget();');check(type+' circle follows real position',E('arcs[0][0]===z.x&&arcs[0][1]===z.y'));
  E('arcs=[];V0105.tapWorld(20,20);M.drawTarget();');check(type+' empty tap removes circle',E('arcs.length===0&&!V0105.target'));
  E('V0105.tapWorld(z.x,z.y);hitZombie(z,10000,{fixedDamage:true});arcs=[];M.drawTarget();');
  check(type+' death clears selection and circle',E('!z.alive&&!V0105.target&&arcs.length===0'));
  check(type+' corpse starts 60% opaque',Math.abs(E('M.corpseOpacity(z)')-.6)<1e-9);
  E('window.oldImage=ctx.drawImage.bind(ctx);window.alphas=[];ctx.drawImage=function(...a){alphas.push(ctx.globalAlpha);return oldImage(...a);};M.drawCorpse(z);ctx.drawImage=oldImage;');
  check(type+' actual image draw uses opacity and restores canvas alpha',E('alphas.length===1&&Math.abs(alphas[0]-.6)<.005&&ctx.globalAlpha===1'));
  r.advance(17000);E('window.deadSave=JSON.stringify(captureGameProgress());restoreGameProgress(decodeGameProgress(deadSave));window.z=zombies[0];');
  check(type+' save/load preserves death age and opacity',E('performance.now()-M.state(z).deadAt===17000&&M.corpseOpacity(z)===.6'));
  r.advance(58000);check(type+' still .6 at 75 seconds',Math.abs(E('M.corpseOpacity(z)')-.6)<1e-9);
  r.advance(7500);check(type+' fades to .3 halfway through final fade',Math.abs(E('M.corpseOpacity(z)')-.3)<1e-9);
  r.advance(7500);check(type+' disappears at 90 seconds',E('M.corpseOpacity(z)===0'));
 }
 fresh('normal');const small=E('M.selectionRadius(z)');fresh('heavy');check('large monster gets larger circle',E('M.selectionRadius(z)')>small);
 E("window.z2=makeZombie(500,350);z2.type='fast';M.prepare(z2);zombies.push(z2);V0105.tapWorld(z2.x,z2.y);arcs=[];M.drawTarget();");check('switching target moves single circle to new enemy',E('V0105.target===z2&&arcs.length===1&&arcs[0][0]===500'));
 E("scene='bunker';arcs=[];M.drawTarget();");check('no circle on wrong world level',E('arcs.length===0'));
 fresh('normal');E('V013City.setFloor(1);arcs=[];M.drawTarget();');check('no circle on another building floor',E('arcs.length===0'));
 fresh('normal');E('playerDead=true;arcs=[];M.drawTarget();');check('no selection circle after player death',E('arcs.length===0'));
 fresh('normal');E("M.specs.future_test={...M.specs.normal,name:'Future',radius:45,size:180};z.type='future_test';z.monster017=false;z.maxHealth=100;z.health=100;M.prepare(z);arcs=[];M.drawTarget();");
 check('new registered type automatically gets proportional circle',E('arcs.length===1&&arcs[0][2]===96'));
 E('hitZombie(z,10000,{fixedDamage:true});');check('new type automatically gets corpse opacity',E('M.corpseOpacity(z)===.6'));r.advance(90000);check('new type automatically expires',E('M.corpseOpacity(z)===0'));
 E('delete M.specs.future_test;ctx.arc=oldArc;');fresh('normal');
 E('window.oldSave=JSON.parse(baseline);oldSave.gameVersion="0.19.0";restoreGameProgress(decodeGameProgress(JSON.stringify(oldSave)));');check('previous 0.19.0 save version accepted',E('!gameSaveBlocked'));
 E("for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);menuOpen=false;scene='surface';playerDead=false;update();draw();");
 check('full scene renders without console errors',r.errors.length===0);
 check('corpse timeout remains 90 seconds',E('M.corpseMs===90000'));
 check('day-X base stats unchanged',E("M.specs.heavy.hp===420&&M.stats('heavy',true).hp===630"));
 check('no timers or listeners added',!fs.readFileSync(file,'utf8').split('function selectionRadius(z)')[1].split('function drawCorpse(z)')[0].match(/setTimeout|setInterval|addEventListener/));
 // Visual comparison made by the actual target/corpse drawing functions.
 E("ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#354039';ctx.fillRect(0,0,1280,800);camera.x=0;camera.y=0;zombies=[];player.x=1000;player.y=750;['normal','heavy'].forEach((type,i)=>{const q=makeZombie(300+i*550,220);q.type=type;M.prepare(q);zombies.push(q);V0105.tapWorld(q.x,q.y);drawZombie(q);M.drawTarget();M.healthBar(q);hitZombie(q,10000,{fixedDamage:true});q.y=520;M.drawCorpse(q);});");
 fs.writeFileSync(path.join(__dirname,'target_preview.png'),r.canvas.toBuffer('image/png'));
 const report={version:'0.20.0',passed:checks.length,checks,consoleErrors:r.errors,environment:'Actual HTML JavaScript, DOM model, real Canvas2D; not physical Telegram/iPhone.'};
 fs.writeFileSync(path.join(__dirname,'target_regression_0.20.0.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
