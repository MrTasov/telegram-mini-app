/* 0.18.0 — construction on top of existing wall, inventory, mining and craft APIs. */
window.V018Build=(()=>{
  const health=V015Base.health,LEVELS=health.levels,COSTS=health.costs;
  const definition=r=>health.definition(r.kind),maxLevel=r=>definition(r).levels.length-1;
  const structures=new Map(),doorRecords=[],stoneNodes=[];
  let job=null,credit=0,selected=null,refs=null,uiElapsed=0;
  const iconKeys={hammer:'hammer018',stone:'stone018',concrete:'concrete018'};
  for(const [type,key] of Object.entries(iconKeys))V092_ICONS[type]=V011Art.sources[key];
  for(const o of V015Base.sections)structures.set(o.id,{id:o.id,scene:'surface',kind:o.gate?'gate':'wall',object:o});
  function addDoor(object,which,kind,owner=null){
    object.level=1;object.maxHp=health.definition(kind).levels[1];object.hp=object.maxHp;
    const r={id:object.id,scene:which,kind,object,owner};structures.set(r.id,r);doorRecords.push(r);
  }
  for(const d of v09Doors)addDoor(d,'bunker','automatic');
  for(const b of V011World.buildings)addDoor(V011World.doorRect(b),'surface','house',b);
  addDoor(V011Living.bathDoor,'bunker','bath');
  const record=value=>typeof value==='string'?structures.get(value):structures.get(value?.id);
  const isBroken=id=>record(id)?.object.hp===0;
  const title=r=>r.kind==='wall'?(r.object.corner?'Угол стены':'Секция стены'):r.kind==='gate'?'Ворота':r.kind==='automatic'?'Раздвижная дверь':r.kind==='bath'?'Дверь санузла':'Дверь';
  const held=()=>heldItem()==='hammer'&&bagCount('hammer')>0;
  const count=type=>bag.reduce((n,s)=>n+(s?.type===type?s.qty:0),0);
  function consume(input){
    if(!Object.entries(input).every(([t,n])=>Number.isInteger(n)&&n>=0&&count(t)>=n))return false;
    for(const [type,n] of Object.entries(input)){let left=n;for(let i=0;i<bag.length&&left;i++){const s=bag[i];if(s?.type!==type)continue;const take=Math.min(s.qty,left);s.qty-=take;left-=take;if(!s.qty)bag[i]=null;}}
    renderBag();queueGameSave();return true;
  }
  function target(r){const o=r.object;return {id:r.id,kind:'repair018',name:title(r)+' · '+Math.ceil(o.hp)+' / '+o.maxHp+' HP',x:o.x,y:o.y,w:o.w,h:o.h,range:64,ref:r.id};}
  function near(r){return !!r&&r.scene===scene&&(r.scene!=='surface'||!V013City.floor)&&!playerDead&&canInteract(target(r),player.x,player.y);}
  function occupied(r){
    const o=r.object,actors=[];
    if(scene===r.scene&&!player.wallLevel&&(scene!=='surface'||!V013City.floor))actors.push(player);
    if(r.scene==='surface')actors.push(...zombies.filter(z=>z.alive));
    const drone=V014Robots.state;if(!drone.packed&&drone.scene===r.scene)actors.push({...drone,radius:14});
    return actors.some(a=>rectHit(a.x,a.y,(a.radius||16)+3,o));
  }
  function changed(r,geometry=false){
    if(geometry){if(V015Base.byId.has(r.id))V015Base.changed();else invalidateGeometry();}
    queueGameSave();
  }
  function damage(value,amount,damageType='physical'){
    const r=record(value);if(!r||!Number.isFinite(amount)||amount<=0)return false;
    if(V015Base.byId.has(r.id))return V015Base.damage(r.id,amount,damageType);
    const o=r.object;if(o.hp<=0)return false;
    if(!health.damage(o,amount,r.kind,damageType))return false;
    if(!o.hp){if(r.kind==='automatic'){o.open=1;o.away=0;}if(r.owner){r.owner.doorOpen=true;r.owner.doorProgress=1;}}
    GameAudio.play(o.hp?'constructionHit':'constructionBreak',{x:o.x,y:o.y,scene:r.scene});changed(r,!o.hp);return true;
  }
  function closedDoors(){return doorRecords.filter(r=>r.scene==='surface'&&r.object.hp>0&&r.kind==='house'&&r.owner.doorProgress<.88).map(r=>r.object);}
  function stop(notice=''){if(notice==='Ремонт завершён')GameAudio.play('repair');window.ActorVisuals?.finishRepair(job,notice==='Ремонт завершён');job=null;hud.style.display='none';if(notice)message(notice);refresh();}
  function start(value,actorId=GameActors.localId){
    if(actorId!==GameActors.localId||!GameActors.get(actorId)||GameFlow.paused)return false;
    const r=record(value);if(!near(r)||!held())return false;
    if(r.object.hp>=r.object.maxHp){open(r.id);return false;}
    if(job?.id===r.id)return true;
    if(!r.object.hp&&occupied(r)){message('Освободите место для восстановления');return false;}
    if(credit<=0&&count(definition(r).repair.material)<1){message('Нужен бетон в рюкзаке · 2 камня → 1 бетон в печи');return false;}
    V014Controls.stopRoute();cancelNavigation();cancelChop();cancelSearch();V012Fishing.stop();firing=false;
    job={id:r.id,actorId,x:player.x,y:player.y,scene,ms:0};
    window.ActorVisuals?.beginRepair(job,r.object);
    if(el('v018Structure')?.classList.contains('open'))closeOverlay(el('v018Structure'));
    refresh();return true;
  }
  function repairStep(ms){
    if(!job||GameFlow.paused)return;const r=record(job.id);
    if(job.actorId!==GameActors.localId||!GameActors.get(job.actorId)){stop();return;}
    if(!held()||!near(r)||scene!==job.scene||movePower>JOY_DEAD||navigation||Math.hypot(player.x-job.x,player.y-job.y)>.8){stop();return;}
    if(document.hidden)return;
    if(r.object.hp>=r.object.maxHp){window.GameChapterOne?.confirmRepair(r.id);stop('Ремонт завершён');return;}
    if(!r.object.hp&&occupied(r)){stop('Проход занят · ремонт остановлен');return;}
    const p=contactPoint(r.object,player.x,player.y),dx=p.x-player.x,dy=p.y-player.y,n=Math.hypot(dx,dy)||1;player.aimX=dx/n;player.aimY=dy/n;
    const repair=definition(r).repair;job.ms+=Math.max(0,Math.min(repair.maxTickMs,Number(ms)||0))*repair.hpPerMs;let amount=Math.floor(job.ms);job.ms-=amount;
    while(amount>0&&job){
      if(credit===0){if(!consume({[repair.material]:1})){stop('Бетон закончился · выполненный ремонт сохранён');break;}credit=repair.hpPerUnit;}
      const o=r.object,wasBroken=o.hp===0,n=health.restoreHP(o,Math.min(amount,credit));credit-=n;amount-=n;changed(r,wasBroken);
      window.GameChapterOne?.confirmRepair(r.id);if(wasBroken)window.GameCampaign?.refresh(true);
      if(o.hp>=o.maxHp){window.GameChapterOne?.confirmRepair(r.id);window.GameCampaign?.refresh(true);stop('Ремонт завершён');break;}
    }
  }
  function upgrade(value,actorId=GameActors.localId){
    if(actorId!==GameActors.localId||!GameActors.get(actorId)||GameFlow.paused)return false;
    const r=record(value);if(!near(r)||!held())return false;const o=r.object;
    if(o.hp<o.maxHp){message('Сначала полностью отремонтируйте секцию');return false;}
    if(o.level>=maxLevel(r))return false;
    const input=definition(r).costs[o.level+1];
    if(!consume(input)){
      for(const cell of el('v018Structure')?.querySelectorAll('[data-build-material]')||[])if(count(cell.dataset.buildMaterial)<input[cell.dataset.buildMaterial])V0162Quick.flash(cell);
      message('Не хватает бетона или железа в рюкзаке');return false;
    }
    GameAudio.play('upgrade');o.level++;o.maxHp=definition(r).levels[o.level];o.hp=o.maxHp;changed(r,true);refresh(true);message(title(r)+' · уровень '+o.level);return true;
  }
  const hud=document.createElement('div');hud.id='v018RepairHUD';const hudText=document.createElement('span'),hudStop=v09Button('Стоп',()=>job&&GameRecovery.request(job.id,'stopRepair'));hud.append(hudText,hudStop);document.body.append(hud);
  function open(value){
    const r=record(value);if(!near(r)||!held())return false;selected=r.id;
    const overlay=v09Overlay('v018Structure',title(r)),body=overlay.querySelector('.v09Body');body.replaceChildren();
    const hero=document.createElement('div');hero.className='v018BuildHero';I18n.assign(hero,"innerHTML",itemIconHTML('hammer')+'<div><b id="v018Level"></b><span id="v018HP"></span></div>');body.append(hero);
    const meter=document.createElement('div');meter.className='v018BuildMeter';I18n.assign(meter,"innerHTML",'<i id="v018HPFill"></i>');body.append(meter);
    const costs=document.createElement('div');costs.className='v018BuildCosts';body.append(costs);
    const button=v09Button('',()=>{const q=record(selected);if(!q)return;if(q.object.hp<q.object.maxHp)GameRecovery.request(q.id,'repair');else GameRecovery.request(q.id,'upgrade');});button.id='v018BuildButton';body.append(button);
    const note=document.createElement('p');note.className='v018BuildNote';body.append(note);
    refs={overlay,level:el('v018Level'),hp:el('v018HP'),fill:el('v018HPFill'),costs,button,note,signature:''};openOverlay(overlay);refresh(true);return true;
  }
  function refresh(force=false){
    hud.style.display=job&&!menuOpen&&!document.hidden?'flex':'none';
    if(job){const o=record(job.id)?.object;if(o)I18n.assign(hudText,"textContent",'Ремонт · '+Math.floor(o.hp).toLocaleString(I18n.locale)+' / '+o.maxHp.toLocaleString(I18n.locale));}
    if(!refs?.overlay.classList.contains('open'))return;
    const r=record(selected);if(!r)return;const o=r.object,full=o.hp>=o.maxHp,key=[o.level,full,count('concrete'),count('iron'),credit,near(r),held()].join('/');
    I18n.assign(refs.level,"textContent",title(r)+' · '+o.level+' / '+maxLevel(r));I18n.assign(refs.hp,"textContent",Math.ceil(o.hp).toLocaleString(I18n.locale)+' / '+o.maxHp.toLocaleString(I18n.locale)+' HP');refs.fill.style.width=100*o.hp/o.maxHp+'%';
    if(!force&&key===refs.signature)return;refs.signature=key;refs.costs.replaceChildren();
    const inputs=!full?{[definition(r).repair.material]:Math.ceil(Math.max(0,o.maxHp-o.hp-credit)/definition(r).repair.hpPerUnit)}:definition(r).costs[o.level+1]||{};
    for(const [t,n] of Object.entries(inputs)){const cell=document.createElement('div');cell.className='v018BuildMaterial'+(count(t)<n?' missing':'');cell.dataset.buildMaterial=t;I18n.assign(cell,"innerHTML",itemIconHTML(t)+'<span>'+ITEM[t].name+'<small>'+count(t)+' / '+n+'</small></span>');refs.costs.append(cell);}
    I18n.assign(refs.button,"textContent",!full?'Ремонтировать':o.level>=maxLevel(r)?'Максимальный уровень':'Улучшить до '+(o.level+1)+' · '+definition(r).levels[o.level+1].toLocaleString(I18n.locale)+' HP');refs.button.disabled=!near(r)||!held()||(full&&o.level>=maxLevel(r));
    I18n.assign(refs.note,"textContent",!full?'1000 HP/сек. · 1 бетон = 1000 HP. Остаток смеси сохраняется.':o.level>=maxLevel(r)?'Укрепление полностью улучшено.':'Материалы из рюкзака. После улучшения прочность будет полной.');
  }
  const interactions=interactionObjects;interactionObjects=function(which=scene){const out=interactions(which);if(!held()||(which==='surface'&&V013City.floor))return out;const available=[...structures.values()].filter(r=>r.scene===which);const ids=new Set(available.map(r=>r.id));return [...out.filter(o=>!ids.has(o.id)),...available.map(target)];};
  const hit=hitInteraction;hitInteraction=function(x,y){if(held()&&(scene!=='surface'||!V013City.floor)){const r=[...structures.values()].find(r=>r.scene===scene&&rectHit(x,y,7,r.object));if(r)return target(r);}return hit(x,y);};
  const execute=executeInteraction;executeInteraction=function(o,...args){if(o?.kind==='repair018'){const r=record(o.ref);if(!r)return;if(r.object.hp<r.object.maxHp)GameRecovery.request(r.id,'repair');else open(r.id);return;}
    if(o&&isBroken(o.id)&&!V015Base.byId.has(o.id)){message('Дверь разрушена · восстановите её молотом');return;}return execute(o,...args);};
  const approach=approachObject;approachObject=function(o,...args){if(o?.kind==='repair018'&&near(record(o.ref)))return executeInteraction(o);return approach(o,...args);};
  const action=updateAction;updateAction=function(...args){const out=action(...args);if(held()){const candidates=[...structures.values()].filter(near);candidates.sort((a,b)=>{const p=contactPoint(a.object,player.x,player.y),q=contactPoint(b.object,player.x,player.y);return Math.hypot(player.x-p.x,player.y-p.y)-Math.hypot(player.x-q.x,player.y-q.y);});if(candidates.length){const r=candidates[0];interactionTarget=currentActionObject=target(r);currentAction='repair018';I18n.assign(actionButton,"innerHTML",itemIconHTML('hammer'));actionButton.classList.add('available');actionButton.classList.remove('inactive');I18n.setAttr(actionButton,'aria-label',interactionTarget.name);}}return out;};
  const hurt=damagePlayer;damagePlayer=function(...args){const hp=player.health,out=hurt(...args);if(player.health<hp)stop();return out;};
  const solids=solidObjects;solidObjects=function(which=scene){return solids(which).filter(o=>!isBroken(o.id));};
  const oldDoorDraw=v09DrawDoor;v09DrawDoor=function(d){if(!isBroken(d.id))oldDoorDraw(d);else{ctx.save();ctx.strokeStyle='#7d898466';ctx.lineWidth=2;ctx.strokeRect(d.x,d.y,d.w,d.h);ctx.restore();}};
  function drawStructures(){
    if(scene==='surface'&&V013City.floor)return;
    const holding=held();
    for(const r of structures.values()){
      if(r.scene!==scene)continue;const o=r.object,cx=o.x+o.w/2,cy=o.y+o.h/2;if(!visibleOnScreen(cx,cy,Math.max(o.w,o.h)+50))continue;
      if(!V015Base.byId.has(r.id)&&o.hp>0&&o.hp<o.maxHp){ctx.save();ctx.strokeStyle='#172325aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx-8,cy-4);ctx.lineTo(cx+3,cy+3);ctx.lineTo(cx-3,cy+6);ctx.lineTo(cx+11,cy+9);ctx.stroke();ctx.restore();}
      const distance=Math.hypot(cx-player.x,cy-player.y);
      if(!holding){
        if(!V015Base.byId.has(r.id)&&o.hp>0&&o.hp<o.maxHp&&(distance<125||performance.now()-(o.hitAt||0)<1900)){
          ctx.save();ctx.fillStyle='#172b30dd';ctx.fillRect(cx-26,o.y-14,52,4);ctx.fillStyle='#d5bb87';ctx.fillRect(cx-26,o.y-14,52*o.hp/o.maxHp,4);ctx.font='8px Arial';ctx.textAlign='center';ctx.fillStyle='#d7dfd1';ctx.fillText(I18n.text(Math.ceil(o.hp)+' / '+o.maxHp),cx,o.y-18);ctx.restore();
        }
        continue;
      }
      if(distance>210)continue;
      ctx.save();const active=job?.id===r.id;ctx.strokeStyle=active?'#c7ce9fbb':'#b5c6b477';ctx.lineWidth=1;ctx.setLineDash(o.hp?[]:[5,4]);ctx.strokeRect(o.x-1,o.y-1,o.w+2,o.h+2);ctx.setLineDash([]);
      ctx.fillStyle='#132421df';ctx.fillRect(cx-34,cy-15,68,25);ctx.fillStyle='#b9cbbf';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText(I18n.text('Ур. '+o.level+' · '+Math.round(o.hp).toLocaleString(I18n.locale)),cx,cy-4);ctx.fillStyle='#42514b';ctx.fillRect(cx-28,cy+2,56,3);ctx.fillStyle='#9abb93';ctx.fillRect(cx-28,cy+2,56*o.hp/o.maxHp,3);ctx.restore();
    }
    if(job&&!AssetManifest.actors.modular){const r=record(job.id);if(!r||r.scene!==scene)return;const p=contactPoint(r.object,player.x,player.y),t=performance.now()/70;ctx.save();ctx.fillStyle='#d0c5a699';for(let i=0;i<3;i++){const a=t+i*2;ctx.fillRect(p.x+Math.sin(a)*7,p.y+Math.cos(a)*5,2,2);}ctx.restore();}
  }
  const surfaceDraw=drawSurface;drawSurface=function(...args){const out=surfaceDraw(...args);drawStructures();return out;};
  const bunkerDraw=drawBunker;drawBunker=function(...args){const out=bunkerDraw(...args);drawStructures();return out;};
  function drawHeld(){
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(17,-5);ctx.moveTo(3,11);ctx.lineTo(14,6);ctx.stroke();ctx.save();ctx.translate(16,3);ctx.rotate(job?Math.sin(performance.now()/95)*.6:-.25);ctx.strokeStyle='#777b66';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-5,8);ctx.lineTo(15,-15);ctx.stroke();ctx.fillStyle='#657576';ctx.fillRect(7,-24,23,13);ctx.strokeStyle='#b8c1b4';ctx.lineWidth=1.5;ctx.strokeRect(7,-24,23,13);ctx.fillStyle='#bca979';ctx.fillRect(7,-23,4,11);ctx.restore();
  }
  // Append deposits after the existing migration's BASE_ORES snapshot. Its ID-
  // based merger then adds new nodes to older saves without losing old resources.
  const locations=[[-370,440],[-420,930],[-210,1210],[1420,20],[1720,570],[1910,980],[-610,1500],[500,2490],[1940,3080],[-740,3700],[2280,3900],[550,-800],[-1450,-650],[2890,-1150],[-1750,5100],[3590,5600],[-1400,7600],[2950,8400]];
  for(const [i,[x,y]] of locations.entries()){
    let p=null;for(let n=0;n<64&&!p;n++){const a=n*2.4,r=n?30+Math.floor(n/8)*40:0,q={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r};if(!worldCollision(q.x,q.y,50,'surface')&&!inFortress(q.x,q.y)&&!V09World.ores.some(o=>Math.hypot(o.x-q.x,o.y-q.y)<o.r+60))p=q;}
    if(!p)continue;const o={id:'stone018_'+i,type:'stone',...p,r:35+i%3*4,capacity:150,remaining:150,regrowMs:0};V09World.ores.push(o);stoneNodes.push(o);
  }
  function drawStone(o){if(!visibleOnScreen(o.x,o.y,100))return;ctx.save();ctx.translate(o.x,o.y);const mining=V09World.miningState();if(mining?.id===o.id)V012Effects.oreImpactTransform(mining);
    ctx.fillStyle='#15221d44';ctx.beginPath();ctx.ellipse(4,11,o.r,o.r*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=o.remaining?1:.4;V011Art.draw('stone018',-o.r,-o.r,o.r*2,o.r*2);ctx.globalAlpha=1;ctx.fillStyle='#d2d5c6';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.text('КАМЕНЬ'),0,-o.r-10);if(Math.hypot(player.x-o.x,player.y-o.y)<160){ctx.font='9px Arial';ctx.fillText(I18n.text(o.remaining?o.remaining+' / '+o.capacity:Math.ceil(o.regrowMs/60000)+' мин.'),0,o.r+14);}if(mining?.id===o.id)V012Effects.drawOreImpact(o,mining);ctx.restore();
  }
  function enemyDoorStep(z,s,r,now,dt,dark){
    if(!window.V017Monsters?.isDayX())return false;
    if(r.sees||!r.lastSeen||now-(r.sawPlayerAt||0)>5500)return false;
    let target=null,best=Infinity;
    for(const o of closedDoors()){const t=V015Base.rayEntry(z,r.lastSeen,o);if(t!==null&&t<best&&lineClear(z.x,z.y,r.lastSeen.x,r.lastSeen.y,0,'surface',o.id)){target=o;best=t;}}
    if(!target)return false;
    const p=contactPoint(target,z.x,z.y),d=Math.hypot(p.x-z.x,p.y-z.y);r.angle=Math.atan2(p.y-z.y,p.x-z.x);z.state='chase';
    if(d<=z.radius+12){if(s.behavior==='explosive'){V017Monsters.armFuse(r,now,s.blast.wallFuseMs/V017Monsters.factor());return true;}if(now-z.lastAttack>s.cooldown*(dark?.8:1)){damage(target,s.damage*2*V010World.settings.enemyStrength);z.lastAttack=now;r.attack=now+400;}return true;}
    V017Monsters.move(z,r.angle,s.chaseSpeed*.5*dt);return true;
  }
  const updateOld=update;update=function(...args){const out=updateOld(...args);repairStep(16.667*frameScale);uiElapsed+=16.667*frameScale;if(uiElapsed>=150){uiElapsed=0;refresh();}return out;};
  function capture(){return {schema:1,credit,doors:doorRecords.map(r=>({id:r.id,hp:r.object.hp,level:r.object.level}))};}
  function validate(d){if(d===undefined)return true;if(!d||d.schema!==1||!Number.isFinite(d.credit)||d.credit<0||d.credit>health.repair.hpPerUnit||!Array.isArray(d.doors)||d.doors.length!==doorRecords.length)throw Error('Некорректные данные строительства');const seen=new Set();for(const p of d.doors){if(!doorRecords.some(r=>r.id===p.id)||seen.has(p.id)||!Number.isInteger(p.level)||p.level<1||p.level>maxLevel(record(p.id))||!Number.isFinite(p.hp)||p.hp<0||p.hp>definition(record(p.id)).levels[p.level])throw Error('Некорректная прочность двери');seen.add(p.id);}return true;}
  function restore(data){validate(data);job=null;window.ActorVisuals?.cancelRepair();credit=data?.credit||0;selected=null;const map=new Map((data?.doors||[]).map(o=>[o.id,o]));for(const r of doorRecords){const p=map.get(r.id),o=r.object;o.level=p?.level||1;o.maxHp=definition(r).levels[o.level];o.hp=p?p.hp:o.maxHp;if(!o.hp){if(r.kind==='automatic')o.open=1;if(r.owner){r.owner.doorOpen=true;r.owner.doorProgress=1;}}}invalidateGeometry();refresh();}
  GameSave.extend('capture','base.construction',function(oldCapture){const d=oldCapture();d.building018=capture();return d;});
  GameSave.extend('decode','base.construction',function(oldDecode,raw){const d=JSON.parse(raw);validate(d.building018);return oldDecode(raw);});
  GameSave.extend('restore','base.construction',function(oldRestore,d){validate(d.building018);restore(d.building018);oldRestore(d);restore(d.building018);});
  v09Style(`
    #v018Structure .v09Panel{width:min(340px,92vw);padding:14px;max-height:75dvh}#v018Structure .v09Body{font-size:11px}
    .v018BuildHero{display:flex;align-items:center;gap:12px}.v018BuildHero>.itemIcon{width:70px;height:70px}.v018BuildHero b,.v018BuildHero span{display:block;line-height:1.7}.v018BuildHero b{font-size:13px}.v018BuildHero span{font-size:12px;color:#bdcec1;font-variant-numeric:tabular-nums}
    .v018BuildMeter{height:5px;margin:10px 0 14px;border-radius:4px;background:#101d1b;overflow:hidden}.v018BuildMeter i{display:block;height:100%;background:#86aa88}
    .v018BuildCosts{display:flex;gap:6px;margin:10px 0}.v018BuildMaterial{flex:1;display:flex;align-items:center;gap:6px;border:1px solid #819b8533;border-radius:8px;padding:7px;background:#1b2d29}.v018BuildMaterial .itemIcon{width:36px;height:36px}.v018BuildMaterial small{display:block;margin-top:3px;color:#acc0b0}.v018BuildMaterial.missing small{color:#d99b87}
    #v018BuildButton{font-size:12px;min-height:34px;padding:8px;width:100%;margin:4px 0}.v018BuildNote{font-size:10px;color:#99afa2;line-height:1.5}
    #v018RepairHUD{display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(115px + env(safe-area-inset-bottom,0px));gap:8px;align-items:center;background:#172b27d9;border:1px solid #9cb79755;border-radius:7px;padding:5px 8px;color:#dae4d7;z-index:38;font:10px Arial;white-space:nowrap;pointer-events:none}
    #v018RepairHUD button{pointer-events:auto;min-height:24px;min-width:35px;padding:3px 7px;font-size:10px;margin:0;width:auto}#actionButton .itemIcon{width:28px;height:28px}
  `);
  invalidateGeometry();renderQuickSlots();renderBag();
  return{health,definition,maxLevel,LEVELS,COSTS,structures,stoneNodes,doorRecords,record,isBroken,closedDoors,damage,applyRepair:start,applyUpgrade:upgrade,start:(value)=>window.GameRecovery?GameRecovery.request(typeof value==='string'?value:value?.id,'repair').ok:start(value),stop,repairStep,upgrade:(value)=>window.GameRecovery?GameRecovery.request(typeof value==='string'?value:value?.id,'upgrade').ok:upgrade(value),open,near,occupied,consume,count,capture,restore,validate,drawHeld,drawStone,enemyDoorStep,refresh,get job(){return job;},get credit(){return credit;}};
})();
