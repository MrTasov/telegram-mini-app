/* 0.10 — persistent equipment, weapon upgrades and timed reloading. */
window.V010Combat=(() => {
  'use strict';
  const emit=(name,data)=>window.V010?.emit?.(name,data);
  const copy=o=>JSON.parse(JSON.stringify(o));
  const BASE_SPEED={walk:3.15,run:5.25};
  const GUNS=V09Craft.weapons;
  // One rule per existing enhancement family. Definitions may override a rule;
  // all released limits and costs remain the original Level 0..5 values.
  const upgradeRules={
    weapon:{maxLevel:5,cost:{iron:32,copper:16,parts:10},rarePerLevel:3,stats:{damagePerLevel:.05,sturdyDamage:.02,minSpread:.006}},
    equipment:{maxLevel:5,cost:{iron:25,copper:12,parts:8},rarePerLevel:2},
    drone:{maxLevel:5,cost:{iron:30,copper:18,parts:12},rarePerLevel:4},
    turret:{maxLevel:5,cost:{iron:50,copper:25,parts:15},rarePerLevel:5}
  };
  function upgradeProfile(item){const d=ITEM[item?.type];return GUNS[item?.type]?.upgrades||d?.turret?.upgrades||d?.drone?.upgrades||d?.upgrades||(GUNS[item?.type]?upgradeRules.weapon:upgradeRules.equipment);}
  const maxUpgradeLevel=item=>upgradeProfile(item).maxLevel;
  const equipmentStats={
    body:{armor:{from:'armor',perLevel:2,variants:{sturdy:2},cap:80},hp:{base:15,perLevel:12,specializations:{vitality:2}}},
    feet:{hp:{base:5,perLevel:6,specializations:{vitality:2}},speed:{base:.02,perLevel:.02,variants:{light:.01},specializations:{speed:.01},cap:.2}},
    legs:{hp:{base:10,perLevel:9,variants:{sturdy:3},specializations:{vitality:2}}},
    head:{hp:{base:5,perLevel:6,specializations:{vitality:2}},accuracy:{base:.03,perLevel:.02,variants:{light:.01},cap:.18}}
  };
  function gearStat(rule,item,definition,level){
    const value=(rule.from?(definition[rule.from]||0):(rule.base||0))+level*(rule.perLevel||0)+(rule.variants?.[item.variant]||0)+level*(rule.specializations?.[item.specialization]||0);
    return rule.cap===undefined?value:Math.min(rule.cap,value);
  }
  const MODULES={magazine:{type:'magazine_module',label:'Магазин',unlock:null}};
  Object.assign(ITEM,{
    helmet1:{name:'Тактический шлем',icon:'🪖',equip:'head',level:1},
    advanced_parts:{name:'Редкие компоненты',icon:'🔧'},
    magazine_module:{name:'Увеличенный магазин',icon:'▥'}
  });
  Object.assign(V09Craft.recipes,{
    helmet1:{station:'craft_bench',category:'Экипировка',name:'Тактический шлем',input:{iron:12,copper:4,parts:2},output:'helmet1',qty:1,ms:22000},
    magazine_module:{station:'craft_bench',category:'Модули',name:'Увеличенный магазин',input:{iron:6,copper:2,parts:1},output:'magazine_module',qty:1,ms:15000},
  });
  const shapes={helmet1:'<path d="M15 36C13 10 50 10 49 35L55 42H11Z" fill="#7c8b60"/><path d="M17 34H47V43H17Z" fill="#8ad1ce" stroke="#263d43" stroke-width="3"/>',advanced_parts:'<path d="M13 15H47V49H13Z" fill="#487984"/><path d="M20 22H40V42H20Z" fill="#d1c28b"/><path d="M8 22H13M8 31H13M8 40H13M47 22H54M47 31H54M47 40H54" stroke="#d1c28b" stroke-width="4"/>',magazine_module:'<path d="M19 8H36Q32 33 48 46L35 54Q14 32 19 8Z" fill="#728a91"/><path d="M24 14Q22 32 37 47M29 14Q27 32 42 44" fill="none" stroke="#283e45" stroke-width="3"/>'};
  const oldIcon=itemIconHTML;
  itemIconHTML=function(type){return shapes[type]?'<svg class="itemIcon" viewBox="0 0 64 64" aria-hidden="true">'+shapes[type]+'</svg>':oldIcon(type);};
  let nextUid=1,reloading=null,burst=0,lastUid=null,practice=false,trainingRounds=30,practiceHits=0,practiceDamage=0,lastHud='',selectedWorkshopItem=null;
  const practiceTarget={id:'v010PracticeTarget',kind:'v010practice',name:'Тренировочная мишень',x:1110,y:734,w:20,h:32,range:95};
  function initializeFields(item){
    if(!item)return null;
    if(GUNS[item.type]||ITEM[item.type]?.equip){
      if(!Number.isInteger(item.level))item.level=0;
      if(!item.variant)item.variant='balanced';
      if(!item.specialization)item.specialization='balanced';
      if(GUNS[item.type]){item.modules??={};if(GUNS[item.type].magazineTypes&&!Object.hasOwn(item,'magazineType'))item.magazineType=item.modules.magazine?GUNS[item.type].extendedMagazine:GUNS[item.type].defaultMagazine;delete item.modules.magazine;if(!Number.isInteger(item.rounds))item.rounds=0;}
    }
    return item;
  }
  function ensure(item){
    if(item&&(GUNS[item.type]||ITEM[item.type]?.equip)&&!item.uid)item.uid='gear-'+nextUid++;
    return initializeFields(item);
  }
  function itemView(item){return item?initializeFields({...item,...(item.modules?{modules:{...item.modules}}:{})}):null;}
  function allItems(){return [...(window.V0161Upgrade?.slots||[]).filter(Boolean),...(window.V013Inventory?.items||[]).filter(Boolean),...bag.filter(Boolean),...Object.values(equipment).filter(Boolean),...storageChests.flatMap(c=>c.items.filter(Boolean))];}
  function migrateItems(legacy){
    const seen=new Set();let largest=nextUid;
    for(const item of allItems()){
      if(item.uid){const n=/^gear-(\d+)$/.exec(item.uid);if(n)largest=Math.max(largest,Number(n[1])+1);}
    }nextUid=largest;
    for(const item of allItems()){
      if(GUNS[item.type]){if(!Number.isInteger(item.rounds)&&legacy&&!seen.has(item.type))item.rounds=Math.min(GUNS[item.type].mag,Math.max(0,legacy[item.type]||0));seen.add(item.type);}
      ensure(item);
    }
  }
  function rollFoundItem(item){
    if(!item||(!GUNS[item.type]&&!['head','body','legs','feet'].includes(ITEM[item.type]?.equip)))return item;
    ensure(item);const roll=Math.random();item.variant=roll<.2?'sturdy':roll<.4?'light':'balanced';return item;
  }
  function currentWeapon(){const type=heldItem();if(!GUNS[type])return null;return window.V010Inventory?.selectedItem?.(type)||bag.find(s=>s?.type===type)||null;}
  function getItemStats(item){
    if(!item)return null;const d=ITEM[item.type];if(!d)return null;
    const level=clamp(Number(item.level)||0,0,maxUpgradeLevel(item));
    const stats={level,name:d.name,variant:item.variant||'balanced',specialization:item.specialization||'balanced'};
    if(GUNS[item.type])return {...stats,...gunSpec(item)};
    for(const [key,rule] of Object.entries(d.stats||equipmentStats[d.equip]||{}))stats[key]=gearStat(rule,item,d,level);
    if(d.equip==='backpack')stats.capacity=d.capacity;
    return stats;
  }
  function gunSpec(item){
    if(typeof item==='string')item=bag.find(s=>s?.type===item)||{type:item};
    const g=GUNS[item?.type];if(!g)return null;const m=item.modules||{},level=clamp(Number(item.level)||0,0,maxUpgradeLevel(item)),rules=upgradeProfile(item).stats||upgradeRules.weapon.stats,head=equipment.head?getItemStats(equipment.head).accuracy||0:0;
    return {...g,damage:Math.round(g.damage*(1+level*rules.damagePerLevel+(item.variant==='sturdy'?rules.sturdyDamage:0))),mag:V09Craft.magazineCapacity(item),reloadMs:g.reloadMs,spread:Math.max(rules.minSpread,g.spread*(1-head)),recoil:g.recoil,noise:g.noise,modules:copy(m)};
  }
  function equipmentSnapshot(){
    let hp=100,armor=0,speed=0,accuracy=0;
    for(const item of Object.values(equipment)){if(!item)continue;const s=getItemStats(item);hp+=s.hp||0;armor+=s.armor||0;speed+=s.speed||0;accuracy+=s.accuracy||0;}
    return {hp:Math.min(500,hp),armor:Math.min(80,armor),speed:Math.min(.2,speed),accuracy:Math.min(.18,accuracy)};
  }
  // Called by equipment mutations/restoration, never by a card or renderer.
  function refreshStats(){
    for(const item of Object.values(equipment))ensure(item);
    const s=equipmentSnapshot();player.maxHealth=s.hp;player.health=Math.min(player.health,s.hp);
    player.walkSpeed=BASE_SPEED.walk*(1+s.speed);player.runSpeed=BASE_SPEED.run*(1+s.speed);
    const h=el('healthText');if(h)I18n.assign(h,"textContent",'❤️ '+Math.round(player.health)+'/'+Math.round(player.maxHealth));
    return s;
  }
  function syncAmmo(){const item=ensure(currentWeapon()),g=item&&gunSpec(item);if(g){magazine=item.rounds;magazineMax=g.mag;}}
  equippedArmor=function(){return Math.min(80,getItemStats(equipment.body)?.armor||0);};
  const oldRenderEquipment=renderEquipment;
  renderEquipment=function(){oldRenderEquipment();const st=equipmentSnapshot(),node=el('characterStats');if(node)I18n.assign(node,"innerHTML",'HP <b>'+Math.round(player.health)+'/'+Math.round(st.hp)+'</b> · Защита <b>'+st.armor+'%</b><br>Скорость <b>+'+Math.round(st.speed*100)+'%</b> · Точность <b>+'+Math.round(st.accuracy*100)+'%</b><br>Рюкзак: '+BAG_SLOTS+' мест');};
  function cancelReload(){if(!reloading)return false;reloading=null;updateAmmoHud();return true;}
  function practiceAllowed(){return scene==='surface'&&player.x>=930&&player.x<=1280&&player.y>=650&&player.y<=790&&!window.V091Fortress?.isElevated?.();}
  function setPractice(on){if(on&&!practiceAllowed()){message('Подойдите к тренировочной площадке');return false;}cancelReload();practice=!!on;trainingRounds=30;practiceHits=0;practiceDamage=0;updateAmmoHud();return true;}
  canFire=function(){const s=currentWeapon();return !!s&&gunSpec(s).mag>0;};
  reloadWeapon=function(){
    const item=ensure(currentWeapon());if(!item||menuOpen||playerDead||document.hidden||reloading)return false;const g=gunSpec(item),rounds=practice?trainingRounds:item.rounds;
    if(!g.mag||rounds>=g.mag)return false;if(!practice&&bagCount(g.ammo)<=0){message('Нет патронов '+g.caliber);return false;}
    reloading={uid:item.uid,type:item.type,remainingMs:g.reloadMs,totalMs:g.reloadMs,practice};updateAmmoHud();return true;
  };
  updateAmmoHud=function(){
    const item=currentWeapon(),g=item&&gunSpec(item),hud=el('ammoHud'),b=el('v010ReloadButton');
    if(!g){if(hud)hud.style.display='none';if(b)b.style.display='none';return;}
    if(hud)hud.style.display='block';if(b){b.style.display=menuOpen?'none':'block';b.disabled=!!reloading;}
    const text=practice?`МИШЕНЬ · ${g.mag?Math.min(trainingRounds,g.mag):0}/${g.mag} · попадания ${practiceHits} · урон ${practiceDamage}`:`${g.name} +${item.level||0} · ${item.rounds||0}/${g.mag} · запас ${bagCount(g.ammo)}`;
    const progress=reloading?' · '+I18n.numeric(reloading.remainingMs/1000,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})+' с':'';
    if(hud&&text+progress!==lastHud){I18n.assign(hud,"textContent",text+progress);lastHud=text+progress;}
    if(b){I18n.assign(b,"textContent",reloading?'↻ '+I18n.numeric(reloading.remainingMs/1000,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false}):'↻');b.style.setProperty('--reload-progress',reloading?Math.round(100*(1-reloading.remainingMs/reloading.totalMs))+'%':'0%');}
    const stop=el('v010PracticeStop');if(stop)stop.style.display=practice&&!menuOpen?'block':'none';
  };
  function tick(ms){
    const item=ensure(currentWeapon());
    if(practice&&!practiceAllowed())setPractice(false);
    if(reloading&&(!item||item.uid!==reloading.uid||practice!==reloading.practice||playerDead))cancelReload();
    if(reloading&&!GameFlow.paused){
      reloading.remainingMs=Math.max(0,reloading.remainingMs-Math.max(0,ms));
      if(reloading.remainingMs===0){const g=gunSpec(item),need=Math.max(0,g.mag-(practice?trainingRounds:item.rounds));if(practice)trainingRounds=g.mag;else item.rounds+=removeItem(g.ammo,Math.min(need,bagCount(g.ammo)));reloading=null;queueGameSave();}
    }
    syncAmmo();updateAmmoHud();
  }
  function muzzleClear(ax,ay,bx,by,r=2){
    const fortress=window.V091Fortress;
    if(!fortress?.isElevated?.())return lineClear(ax,ay,bx,by,r,scene);
    const steps=Math.max(1,Math.ceil(distance(ax,ay,bx,by)/3));
    for(let i=0;i<=steps;i++)if(fortress.upperObstacleCollision(ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps,r,scene))return false;
    return true;
  }
  shoot=function(){
    if(menuOpen||playerDead||document.hidden||window.V091Fortress?.transitioning)return;const item=ensure(currentWeapon());if(!item||reloading)return;const g=gunSpec(item),now=performance.now();
    if(!g.mag||now-lastShot<g.delay)return;
    if((practice?trainingRounds:item.rounds)<=0){reloadWeapon();return;}
    if(lastUid!==item.uid||now-lastShot>420)burst=0;burst=Math.min(7,burst+1);lastUid=item.uid;lastShot=now;
    const base=Math.atan2(player.aimY,player.aimX),cone=g.spread+g.recoil*Math.max(0,burst-1),angle=base+(Math.random()*2-1)*cone;
    const dx=Math.cos(angle),dy=Math.sin(angle),x=player.x+dx*43,y=player.y+dy*43;let projectile=null;
    if(practice){
      trainingRounds--;const tx=practiceTarget.x+10-player.x,ty=practiceTarget.y+16-player.y,dist=Math.hypot(tx,ty),along=tx*dx+ty*dy,across=Math.abs(tx*dy-ty*dx);
      if(along>0&&dist<g.range&&across<18&&lineClear(player.x,player.y,practiceTarget.x+10,practiceTarget.y+16,2,'surface')){practiceHits++;practiceDamage=g.damage;}
    }else{
      item.rounds--;const contact=window.V014Controls?.contactTarget();if(contact)hitZombie(contact,g.damage);else if(muzzleClear(player.x,player.y,x,y,2))bullets.push(projectile={x,y,dx:dx*12,dy:dy*12,radius:3,life:g.range/12,damage:g.damage,weapon:item.type,wallLevel:!!window.V091Fortress?.isElevated?.()});
      createNoise(player.x,player.y,g.noise);emit('combatshot',{weapon:item.type});queueGameSave();
    }
    muzzleFlash.time=now;muzzleFlash.x=x;muzzleFlash.y=y;window.ActorVisuals?.weaponShot(projectile,base,now,item.type);playGunshot();syncAmmo();updateAmmoHud();
    if((practice?trainingRounds:item.rounds)===0)reloadWeapon();
  };
  const oldSelectHand=selectHandSlot;
  selectHandSlot=function(index){const prev=currentWeapon()?.uid;oldSelectHand(index);if(currentWeapon()?.uid!==prev)cancelReload();syncAmmo();updateAmmoHud();};
  const oldHit=hitZombie;
  hitZombie=function(z,damage=25,options){if(!z.alive||z.health<=0)return;const amount=options?.fixedDamage?damage:window.V010World?.zombieDamage?V010World.zombieDamage(z,damage):damage;oldHit(z,amount);if(!z.alive){emit('combatkill',{id:z.instanceId,type:z.type||'normal',weapon:heldItem(),amount:1});}};
  const oldUpdate=update;
  update=function(){tick(Math.max(0,frameScale)*1000/60);oldUpdate();};
  const reloadButton=document.createElement('button');reloadButton.id='v010ReloadButton';reloadButton.type='button';I18n.assign(reloadButton,'title','Перезарядка · R');I18n.setAttr(reloadButton,'aria-label','Перезарядить оружие');GameActions.bindButton(reloadButton,()=>GameActions.dispatch('RELOAD'));document.body.append(reloadButton);
  const stopButton=document.createElement('button');stopButton.id='v010PracticeStop';I18n.assign(stopButton,"textContent",'Завершить тренировку');stopButton.addEventListener('click',()=>setPractice(false));document.body.append(stopButton);
  v09Style(`#v010ReloadButton{position:fixed;right:max(22px,env(safe-area-inset-right));bottom:38%;z-index:115;width:48px;height:48px;border-radius:50%;border:1px solid #b5d1cc99;color:#e6f2eb;background:conic-gradient(#70a9a977 var(--reload-progress,0%),#172c30aa 0);font-size:21px;touch-action:none;display:none}#v010ReloadButton:disabled{opacity:.8;font-size:12px}#v010PracticeStop{position:fixed;left:50%;transform:translateX(-50%);top:86px;z-index:112;padding:7px 12px;border-radius:9px;background:#5a4d31;color:#fff;font-size:11px;display:none}.v010UpgradeList{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:6px;max-height:145px;overflow:auto}.v010UpgradeItem{display:flex;align-items:center;gap:6px;padding:5px!important;min-height:46px!important;text-align:left;font-size:11px!important}.v010UpgradeItem.selected{border-color:#e1bd76}.v010UpgradeItem .itemIcon{width:36px;height:36px}.v010UpgradeDetail{background:#152a2e;border-radius:10px;padding:12px;margin:10px 0;font-size:12px;line-height:1.7}.v010Modules{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v010Modules button{font-size:11px!important;min-height:36px!important;margin:0!important;padding:5px!important}#v010UpgradeOverlay .panel{max-width:620px}.v010Cost{color:#d6cba8}.v010UpgradeNote{font-size:11px;color:#acc1bd}`);
  const oldInteractions=interactionObjects;
  interactionObjects=function(which=scene){return [...oldInteractions(which),...(which==='surface'?[practiceTarget]:[])];};
  const oldExecute=executeInteraction;
  executeInteraction=function(o){if(o?.kind==='v010practice'){if(canInteract(o,player.x,player.y)){setPractice(!practice);message(practice?'Тренировка: прицельтесь в мишень. Боевые патроны не расходуются.':'Тренировка завершена');}return;}return oldExecute(o);};
  const oldDrawSurface=drawSurface;
  drawSurface=function(){oldDrawSurface();ctx.save();ctx.strokeStyle=practice?'#d6cb86':'#7b886e';ctx.lineWidth=2;ctx.setLineDash([7,7]);ctx.strokeRect(950,660,300,130);ctx.setLineDash([]);ctx.fillStyle='#665946';ctx.fillRect(1116,763,7,21);ctx.fillStyle='#c2bd9a';ctx.fillRect(1104,730,32,38);ctx.strokeStyle='#9b554c';for(const r of [12,7,2]){ctx.beginPath();ctx.arc(1120,749,r,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#d5dbbb';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.text('ТИР'),1120,787);ctx.restore();};
  function inWorkshop(){return scene==='bunker'&&player.x>=bunker.workshop.left&&player.x<=bunker.workshop.right&&player.y>=bunker.workshop.top&&player.y<=bunker.workshop.bottom;}
  function available(type){
    if(inWorkshop()&&window.V010Inventory?.materialCount)return V010Inventory.materialCount(type);
    return [bag,...(inWorkshop()?storageChests.map(c=>c.items):[])].reduce((total,a)=>total+a.reduce((n,s)=>n+(s?.type===type?s.qty:0),0),0);
  }
  function costs(item){if(window.V0161Upgrade)return V0161Upgrade.cost(item);const n=(item.level||0)+1;return {iron:4*n,copper:2*n,parts:Math.max(1,n-1),...(n>=4?{advanced_parts:n-3}:{})};}
  function spend(input){
    if(inWorkshop()&&window.V010Inventory?.consumeMaterials)return V010Inventory.consumeMaterials(input);
    if(!Object.entries(input).every(([t,q])=>ITEM[t]&&Number.isInteger(q)&&q>=0&&available(t)>=q))return false;
    const actual=[bag,...(inWorkshop()?storageChests.map(c=>c.items):[])],draft=actual.map(copy);
    for(const [type,qty] of Object.entries(input)){let left=qty;for(const a of draft)for(let i=0;i<a.length&&left;i++){const s=a[i];if(s?.type!==type)continue;const used=Math.min(left,s.qty);if(s.type==='fish')V014Fish.remove(s,used);left-=used;s.qty-=used;if(!s.qty)a[i]=null;}}
    actual.forEach((a,i)=>a.splice(0,a.length,...draft[i]));return true;
  }
  function ownedByUid(uid){return (window.V0161Upgrade?.slots||[]).find(s=>s?.uid===uid)||(window.V013Inventory?.items||[]).find(s=>s?.uid===uid)||bag.find(s=>s?.uid===uid)||Object.values(equipment).find(s=>s?.uid===uid);}
  function unlocked(id){return !id||!window.V010Progression?.isUnlocked||V010Progression.isUnlocked(id);}
  function owns(item){return (window.V0161Upgrade?.slots||[]).includes(item)||(window.V013Inventory?.items||[]).includes(item)||bag.includes(item)||Object.values(equipment).includes(item);}
  function upgrade(item){return window.V0161Upgrade?.upgrade(item)||false;}
  function insertItem(item){if(window.V010Inventory?.insertItem)return V010Inventory.insertItem(item);const at=bag.findIndex(x=>!x);if(at>=0){bag[at]=copy(item);return 0;}if(bag.length>=BAG_SLOTS)return item.qty;bag.push(copy(item));return 0;}
  function install(item,key){return key==='magazine'&&!!window.V0162Magazines?.installFirst(item,GUNS[item?.type]?.extendedMagazine);}
  function detach(item,key){return key==='magazine'&&!!window.V0162Magazines?.remove(item);}
  const upgradeOverlay=v09Overlay('v010UpgradeOverlay','Улучшения и модули');
  function textStats(s){if(s.damage)return `Урон ${s.damage} · магазин ${s.mag} · перезарядка ${I18n.numeric(s.reloadMs/1000,{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})} с<br>Разброс ${I18n.numeric(s.spread*180/Math.PI,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})}° · отдача ${I18n.numeric(s.recoil*180/Math.PI,{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})}°`;return [s.armor?'Защита '+s.armor+'%':'',s.hp?'HP +'+Math.round(s.hp):'',s.speed?'Скорость +'+Math.round(s.speed*100)+'%':'',s.accuracy?'Точность +'+Math.round(s.accuracy*100)+'%':''].filter(Boolean).join(' · ');}
  function renderWorkshop(){
    const body=upgradeOverlay.querySelector('.v09Body');body.replaceChildren();
    const items=[...bag.filter(Boolean),...Object.values(equipment).filter(Boolean)].filter(i=>GUNS[i.type]||['head','body','feet','legs'].includes(ITEM[i.type]?.equip));
    const list=document.createElement('div');list.className='v010UpgradeList';body.append(list);let selected=items.find(i=>i===selectedWorkshopItem)||items[0];selectedWorkshopItem=selected||null;
    for(const item of items){const b=v09Button('',()=>{selectedWorkshopItem=item;renderWorkshop();});b.className='v010UpgradeItem'+(item===selected?' selected':'');I18n.assign(b,"innerHTML",itemIconHTML(item.type)+'<span>'+ITEM[item.type].name+' +'+(item.level||0)+'</span>');list.append(b);}
    if(!selected){const note=document.createElement('p');I18n.assign(note,"textContent",'Принесите оружие или экипировку для улучшения.');body.append(note);return;}
    const detail=document.createElement('div');detail.className='v010UpgradeDetail';I18n.assign(detail,"innerHTML",window.V011UI?V011UI.cardHTML(selected):'<b>'+ITEM[selected.type].name+' +'+(selected.level||0)+'</b><br>'+textStats(getItemStats(selected)));body.append(detail);
    const cost=document.createElement('div');cost.className='v010Cost';I18n.assign(cost,"textContent",Object.entries(costs(selected)).map(([t,n])=>ITEM[t].name+': '+available(t)+'/'+n).join(' · '));if((selected.level||0)<maxUpgradeLevel(selected))body.append(cost);
    const b=v09Button(selected.level>=maxUpgradeLevel(selected)?'Максимум +'+maxUpgradeLevel(selected):'Улучшить до +'+((selected.level||0)+1),()=>{upgrade(selected);renderWorkshop();},'primary');b.disabled=selected.level>=maxUpgradeLevel(selected)||!devicePowered('craft_bench')||!Object.entries(costs(selected)).every(([t,n])=>available(t)>=n);body.append(b);
    if(!GUNS[selected.type]){const variants=document.createElement('div');variants.className='v010Modules';for(const [key,label]of [['balanced','Баланс'],['vitality','Живучесть'],...(ITEM[selected.type].equip==='feet'?[['speed','Скорость']]:[])]){const x=v09Button((selected.specialization===key?'✓ ':'')+label,()=>{selected.specialization=key;refreshStats();renderBag();queueGameSave();renderWorkshop();});variants.append(x);}body.append(variants);}
    else{const mods=document.createElement('div');mods.className='v010Modules';for(const [key,def]of Object.entries(MODULES)){const equipped=selected.modules?.[key],x=v09Button((equipped?'Снять: ':'Установить: ')+def.label+(!unlocked(def.unlock)?' · закрыто':''),()=>{const ok=equipped?detach(selected,key):install(selected,key);if(!ok)message('Проверьте чертёж, наличие модуля, питание и место в рюкзаке');renderWorkshop();});x.disabled=!equipped&&(!unlocked(def.unlock)||available(def.type)<1);mods.append(x);}body.append(mods);}
    const note=document.createElement('p');note.className='v010UpgradeNote';I18n.assign(note,"textContent",'Без случайных провалов. Материалы берутся из рюкзака и складов базы. Улучшение HP не восстанавливает здоровье.');body.append(note);
  }
  function openWorkshop(){if(window.V0161Upgrade)return V0161Upgrade.open();if(!inWorkshop()){message('Улучшения доступны в мастерской');return false;}renderWorkshop();openOverlay(upgradeOverlay);return true;}
  function validateItem(item){if(!item)return true;if(ITEM[item.type]?.turret&&window.V016Turret?.validItem(item)!==true)return false;if(ITEM[item.type]?.robot&&(item.qty!==1||item.robotId!==ITEM[item.type].drone?.instanceId||item.robotData!==undefined))return false;if(item.type==='fish'&&item.fishGrams!==undefined&&(!Number.isInteger(item.fishGrams)||item.fishGrams<item.qty||item.fishGrams>item.qty*2000))return false;const i=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;if(item.uid!==undefined&&(typeof item.uid!=='string'||item.uid.length>80))return false;if(item.level!==undefined&&!i(item.level,0,maxUpgradeLevel(item)))return false;if(item.variant!==undefined&&!['balanced','sturdy','light'].includes(item.variant))return false;if(item.specialization!==undefined&&!['balanced','speed','vitality'].includes(item.specialization))return false;if(item.modules!==undefined&&(!GUNS[item.type]||!item.modules||Array.isArray(item.modules)||Object.entries(item.modules).some(([k,v])=>!MODULES[k]||v!==true)))return false;if(item.magazineType!==undefined&&(!GUNS[item.type]?.magazineTypes||(item.magazineType!==null&&!V09Craft.acceptsMagazine(item.type,item.magazineType))))return false;if(item.rounds!==undefined&&(!GUNS[item.type]||!i(item.rounds,0,gunSpec(item).mag)))return false;return true;}
  function capture(){migrateItems(null);return {schema:1,nextUid};}
  function validate(d){if(!d||d.schema!==1||!Number.isInteger(d.nextUid)||d.nextUid<1||d.nextUid>100000000)throw Error('Некорректные данные экипировки');return true;}
  function restore(d){if(d){validate(d);nextUid=d.nextUid;}else nextUid=1;reloading=null;practice=false;lastUid=null;burst=0;lastHud='';const legacy=d?null:V09Craft.capture().magazines;migrateItems(legacy);refreshStats();syncAmmo();updateAmmoHud();}
  const api={upgradeRules,upgradeProfile,maxUpgradeLevel,equipmentStats,capture,restore,validate,validateItem,getItemStats,gunSpec,refreshStats,equipmentSnapshot,syncAmmo,ensure,itemView,rollFoundItem,currentWeapon,tick,cancelReload,upgrade,costs,install,detach,openWorkshop,renderWorkshop,practiceTarget,setPractice,practiceAllowed,modules:MODULES,get reloading(){return reloading?copy(reloading):null;},get practice(){return practice;}};
  if(window.V010?.modules)V010.register('combat',api);
  restore(null);return api;
})();

/* 0.10: persistent manufacturing orders, compact panels and recipe tracking. */
const V010Craft=(()=>{
  'use strict';
  const api=V09Craft.craftQueue;
  V010.register('craft',{capture:api.capture,restore:api.restore,validate:api.validate});
  v09Style(`
    #v09CraftOverlay .v09Panel{width:min(760px,calc(100vw - 18px));height:min(660px,94dvh);padding:12px}
    #v09CraftOverlay .v09Header{margin-bottom:5px;padding-bottom:6px}#v09CraftOverlay .v09Title{font-size:17px}
    #v09CraftOverlay .v092CraftLayout{grid-template-columns:160px minmax(0,1fr);grid-template-rows:minmax(0,1fr);align-items:stretch;gap:12px;margin-top:5px;overflow:hidden}
    #v09CraftOverlay .v092RecipeList{min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;overscroll-behavior:contain;overflow-anchor:none;scroll-behavior:auto}
    #v09CraftOverlay .v092Category{font-size:10px;letter-spacing:.25px;margin:6px 0}
    #v09CraftOverlay .v092Recipe{box-sizing:border-box;height:50px;min-height:50px;max-height:50px;flex:0 0 50px;padding:3px;margin:3px 0;gap:5px;flex-direction:row;align-items:center;overflow:hidden;transition:none}
    #v09CraftOverlay .v092Recipe .itemIcon{display:block;width:40px;min-width:40px;max-width:40px;height:40px;min-height:40px;max-height:40px;flex:0 0 40px;object-fit:contain}
    #v09CraftOverlay .v092Recipe span{min-width:0;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:1.25}#v09CraftOverlay .v092Recipe small{font-size:9px;margin-top:2px}
    #v09CraftOverlay .v092RecipeHero{min-height:60px;gap:8px}#v09CraftOverlay .v092RecipeHero>.itemIcon{width:60px;height:60px}
    #v09CraftOverlay .v092RecipeHero b{font-size:14px}#v09CraftOverlay .v09CraftNote{font-size:10px;margin:4px 0;line-height:1.4}
    #v09CraftOverlay .v09GunStats{min-height:48px;font-size:10px;line-height:1.5}
    #v09CraftOverlay .v092Materials{gap:4px;min-height:90px;grid-template-columns:1fr 1fr}
    #v09CraftOverlay .v092Ingredient{padding:3px;gap:5px;font-size:10px;min-height:40px}#v09CraftOverlay .v092Ingredient .itemIcon{width:32px;height:32px}
    #v09CraftOverlay .v092Ingredient strong{margin-top:2px;font-weight:500;font-variant-numeric:tabular-nums}
    #v09CraftOverlay .v092MaterialHelp{font-size:10px;min-height:30px;padding:5px 0}
    #v09CraftOverlay .v091QuantityCount{font-size:12px;font-weight:500;padding-top:2px;text-align:left}
    #v09CraftOverlay .v09CraftQuantity{display:flex;gap:5px;margin:6px 0}#v09CraftOverlay .v09CraftQuantity button{min-width:44px;min-height:32px;width:auto;padding:4px 10px;margin:0;font-size:12px;flex:0 0 auto}
    #v09CraftOverlay .v091CraftActions{height:172px;min-height:172px;max-height:172px;flex:0 0 172px;padding-top:7px;justify-content:flex-end;gap:3px;overflow:hidden}
    #v09CraftOverlay .v092Production{font-size:11px}#v09CraftOverlay #v091CraftTime{min-height:15px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#v09CraftOverlay .v092Production .v09CraftProgress{margin:5px 0;height:6px}
    .v010CraftControls,.v010CraftExtras{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:4px 0}
    #v09CraftOverlay .v010CraftSmall{min-height:30px;padding:4px 8px;width:auto;margin:0;font:11px Arial;background:#273c40;border:1px solid #526565;color:#d4e1da;border-radius:6px;cursor:pointer}
    #v09CraftOverlay .v010CraftSmall:disabled{opacity:.45;cursor:default}
    .v010CraftUpgrade{display:flex;flex-direction:column;gap:3px}.v010CraftUpgrade small{font:9px Arial;color:#bdc9b5}.v010CraftBottom{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v010CraftBottom .menuButton{font-size:12px}
    .v010QueueRow{display:flex;align-items:center;gap:5px;font-size:11px;border-bottom:1px solid #ffffff12;padding:3px 0}.v010QueueRow>.itemIcon{width:28px;height:28px}.v010QueueRow>span{flex:1}.v010QueueRow button{min-width:30px;min-height:30px;width:auto!important;margin:0;padding:2px 8px}
    #v010ReadyList{display:flex;flex-wrap:nowrap;gap:6px;font-size:10px;height:22px;min-height:22px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}#v010ReadyList>span{flex:0 0 auto;display:inline-flex;align-items:center;gap:2px}#v010ReadyList .itemIcon{width:21px;height:21px}
    .v09DeviceRow{gap:8px;padding:5px 0}.v09DeviceRow small{font-size:10px;margin-top:2px}.v09DeviceRow strong{font-size:11px}
    .v09DeviceRow .v09DeviceToggle{position:relative;min-width:44px!important;min-height:28px!important;width:44px!important;height:28px;padding:0!important;margin:0!important;font-size:0!important;border-radius:18px!important;background:#334347!important;border:1px solid #768380!important;color:transparent!important;flex:0 0 44px}
    .v09DeviceRow .v09DeviceToggle:after{content:'';position:absolute;left:4px;top:4px;width:18px;height:18px;background:#aab6b0;border-radius:50%;transition:transform .15s}
    .v09DeviceRow .v09DeviceToggle.on{background:#2d6a4c!important;border-color:#83bf96!important}.v09DeviceRow .v09DeviceToggle.on:after{transform:translateX(16px);background:#d9f4da}
    #v010PinnedRecipe{position:fixed;left:12px;top:140px;z-index:90;max-width:210px;padding:7px 26px 7px 8px;border:1px solid #71807755;border-radius:9px;background:#111e25bd;color:#dce6db;font:11px Arial;pointer-events:auto}
    #v010PinnedRecipe>button{position:absolute;right:3px;top:3px;padding:2px 5px;background:none;border:0;color:#c4d1c8;font-size:18px;cursor:pointer}#v010PinnedRecipe .itemIcon{width:21px;height:21px}#v010PinnedRecipe .v010PinResource{display:inline-flex;gap:3px;align-items:center;margin:2px 5px 0 0;font-variant-numeric:tabular-nums}#v010PinnedRecipe b{font-size:11px;font-weight:500;display:block;margin-bottom:3px}
    @media(max-width:540px){#v09CraftOverlay .v092CraftLayout{grid-template-columns:115px minmax(0,1fr);gap:7px}#v09CraftOverlay .v092RecipeList{padding-right:4px}#v09CraftOverlay .v092Recipe span{font-size:10px}#v09CraftOverlay .v092Recipe .itemIcon{width:32px;min-width:32px;max-width:32px;height:32px;min-height:32px;max-height:32px;flex-basis:32px}#v09CraftOverlay .v092RecipeHero>.itemIcon{width:45px;height:45px}#v09CraftOverlay .v092RecipeHero b{font-size:12px}#v09CraftOverlay .v092Materials{grid-template-columns:1fr;min-height:90px}#v09CraftOverlay .v09CraftQuantity{gap:3px}#v09CraftOverlay .v09CraftQuantity button{padding:4px 7px;min-width:37px}.v010CraftBottom .menuButton{font-size:11px}#v010PinnedRecipe{top:123px;max-width:155px;font-size:10px}}
    @media(max-height:500px){#v09CraftOverlay .v09Panel{height:96dvh;padding:8px}#v09CraftOverlay .v091CraftActions{height:142px;min-height:142px;max-height:142px;flex-basis:142px;gap:2px;padding-top:5px}#v09CraftOverlay .v010CraftControls{margin:1px 0}#v09CraftOverlay .v092ProductionCounts{display:none}#v010PinnedRecipe{top:90px;max-width:170px}}
  `);
  const pin=document.createElement('div');pin.id='v010PinnedRecipe';pin.style.display='none';document.body.append(pin);let pinClock=0,last='';
  function refreshPin(){
    const p=api.pin,r=p&&V09Craft.recipes[p.recipe];if(!r||menuOpen){pin.style.display='none';return;}pin.style.display='block';
    const rows=Object.entries(r.input).map(([t,n])=>{const have=V09Craft.materialCount(t),need=n*p.batches;return `<span class="v010PinResource${have<need?' v09CraftShort':''}" title="${ITEM[t]?.name||t}">${itemIconHTML(t)}${have}/${need}</span>`;}).join('');
    const html=`<b>${r.name} × ${r.qty*p.batches}</b>${rows}`;if(last!==html){I18n.assign(pin,"innerHTML",html);const x=v09Button('×',()=>{api.setPin(null);refreshPin();});I18n.assign(x,'title','Открепить рецепт');I18n.setAttr(x,'aria-label',I18n.source(x,'title'));pin.append(x);last=html;}
  }
  const oldUpdate=update;update=function(){oldUpdate();pinClock+=16.667*frameScale;if(pinClock>=250){pinClock=0;refreshPin();}};
  api.refreshPin=refreshPin;return api;
})();
