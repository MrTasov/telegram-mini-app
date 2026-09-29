/* =====================================================
   ACTION
===================================================== */

let currentAction = null;
let currentActionObject = null;

const actionButton =
  el("actionButton");

function interactionObjects(which=scene){
  if(which==='surface')return [
    {...gateRect,kind:'gate',name:gateOpen?'Закрыть ворота':'Открыть ворота',range:58},
    {id:'hatch',kind:'bunker',name:'Спуститься',x:surface.hatch.x,y:surface.hatch.y,r:35,range:45},
    ...scavenges.map(o=>({...o,kind:'search',name:hasSearchableLoot(o)?'Обыскать':'Уже обыскано — пусто',ref:o,range:48})),
    ...worldTrees.filter(t=>t.wood>0).map(t=>({...t,kind:'tree',name:t.felled?'Забрать древесину':'Рубить дерево',ref:t,range:45}))
  ];
  const f=bunker.farm,feed=feedCraftStationPos();
  return [
    {id:'exit',kind:'surface',name:'На поверхность',x:bunker.entrance.x,y:bunker.entrance.y,r:28,range:48},
    ...getChestPositions().flatMap((p,i)=>i===13?[]:[{id:'chest'+i,kind:'storage',name:storageChests[i].name,ref:i,x:p.x-34,y:p.y-25,w:68,h:50,range:44}]),
    ...getFarmBeds().map((b,i)=>({...b,id:'bed'+i,kind:'farm',name:'Грядка '+(i+1),ref:i,range:45})),
    {id:'feed_craft',kind:'feed_craft',name:'Кормодробилка',x:feed.x-28,y:feed.y-23,w:56,h:46,range:44},
    ...solidObjects('bunker').filter(o=>['technical','ammunition','tools','workbench'].includes(o.id)).map(o=>({...o,kind:'workshop',name:'Мастерская',range:46}))
  ];
}
function contactPoint(o,x,y){
  if(o.r!==undefined){const d=distance(x,y,o.x,o.y)||1;return {x:o.x+(x-o.x)/d*o.r,y:o.y+(y-o.y)/d*o.r};}
  return {x:clamp(x,o.x,o.x+o.w),y:clamp(y,o.y,o.y+o.h)};
}
function canInteract(o,x,y){
  if(!o)return false;
  const p=contactPoint(o,x,y);
  return distance(x,y,p.x,p.y)<=o.range&&lineClear(x,y,p.x,p.y,0,scene,o.id);
}
function hitInteraction(x,y){
  let selected=null;
  for(const o of interactionObjects()){
    const b=o.pickBounds||o;let px=x,py=y;
    if(b.rotation){const cx=b.x+b.w/2,cy=b.y+b.h/2,dx=x-cx,dy=y-cy,c=Math.cos(b.rotation),s=Math.sin(b.rotation);px=cx+dx*c+dy*s;py=cy-dx*s+dy*c;}
    const hit=b.r!==undefined?distance(px,py,b.x,b.y)<=b.r+10:rectHit(px,py,7,b);
    // Preserve existing order for equal layers; foreground actors can be
    // selected over their dock without changing collision/reach geometry.
    if(hit&&(!selected||(o.pickPriority||0)>(selected.pickPriority||0)))selected=o;
  }
  return selected;
}
function executeInteraction(target){
  if(!target||menuOpen||playerDead||!canInteract(target,player.x,player.y))return;
  GameMovement.begin('INTERACT',target);
  if(target.kind==='gate')toggleGate();
  else if(target.kind==='bunker')enterBunker();
  else if(target.kind==='surface')leaveBunker();
  else if(target.kind==='storage')openStorage(target.ref);
  else if(target.kind==='farm')useFarmBed(target.ref);
  else if(target.kind==='tree')useTree(target.ref);
  else if(target.kind==='search')startSearch(target.ref);
  else if(target.kind==='workshop')openOverlay(el('workshopOverlay'));
  else if(target.kind==='feed_craft')openFeedCraftMenu();
}
function cancelNavigation(){navigation=null;movePower=0;moveX=0;moveY=0;}

// A* on a 24 px grid; each edge is swept with the actor's radius.
const v092PathCache=new Map();
function* v092PathSearch(startX,startY,target,which=scene,radius=player.radius,fullSearch=false){
  let bounds=which==='surface'?{x:surface.minX??0,y:surface.minY??0,w:surface.width,h:surface.height}:BunkerLayout.bounds;
  if(which==='surface'&&!fullSearch){const tx=target.x+(target.w||0)/2,ty=target.y+(target.h||0)/2,pad=600;
    const x=Math.max(bounds.x,Math.floor((Math.min(startX,tx)-pad)/12)*12),y=Math.max(bounds.y,Math.floor((Math.min(startY,ty)-pad)/12)*12),right=Math.min(bounds.x+bounds.w,Math.ceil((Math.max(startX,tx)+pad)/12)*12),bottom=Math.min(bounds.y+bounds.h,Math.ceil((Math.max(startY,ty)+pad)/12)*12);bounds={x,y,w:right-x,h:bottom-y};}

  if(target.navBounds)bounds=target.navBounds;
  const cell=target.navCell===36?36:12,cols=Math.ceil(bounds.w/cell),rows=Math.ceil(bounds.h/cell),size=cols*rows;
  const key=which+':'+radius+':'+cell+':'+geometryRevision+':'+[bounds.x,bounds.y,bounds.w,bounds.h].join(',')+':'+(window.V014Robots?.planningKey()||'')+':'+(window.GamePassages?.key()||'');let entry=v092PathCache.get(key);if(!entry){if(v092PathCache.size>5)v092PathCache.clear();entry={cells:new Uint8Array(size),edges:new Map()};v092PathCache.set(key,entry);}const cached=entry.cells,closed=new Uint8Array(size),cost=new Float64Array(size),parent=new Int32Array(size);cost.fill(Infinity);parent.fill(-1);
  const point=id=>({x:bounds.x+(id%cols+.5)*cell,y:bounds.y+(Math.floor(id/cols)+.5)*cell});
  const walkable=id=>{if(id<0||id>=size)return false;if(!cached[id]){const p=point(id);cached[id]=worldCollision(p.x,p.y,radius,which)?2:1;}return cached[id]===1;};
  const sx=Math.floor((startX-bounds.x)/cell),sy=Math.floor((startY-bounds.y)/cell);
  let start=-1,best=Infinity;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const x=sx+dx,y=sy+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
    const id=y*cols+x,p=point(id),d=distance(startX,startY,p.x,p.y);
    if(d<best&&walkable(id)&&lineClear(startX,startY,p.x,p.y,radius,which)){start=id;best=d;}
  }
  if(start<0)return null;
  const near=(p)=>{
    if(target.kind==='ground')return distance(p.x,p.y,target.x,target.y)<=Math.max(24,cell*1.5)&&lineClear(p.x,p.y,target.x,target.y,radius,which);
    const c=contactPoint(target,p.x,p.y);
    return distance(p.x,p.y,c.x,c.y)<=target.range&&lineClear(p.x,p.y,c.x,c.y,0,which,target.id);
  };
  const heuristic=id=>{const p=point(id),c=contactPoint(target,p.x,p.y);return Math.max(0,distance(p.x,p.y,c.x,c.y)-target.range)*(target.navWeight===1.2?1.2:1);};
  const heap=[];
  const push=(id,f)=>{let i=heap.length;heap.push({id,f});while(i>0){const p=(i-1)>>1;if(heap[p].f<=f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const out=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let j=i*2+1;if(j>=heap.length)break;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[i].f<=heap[j].f)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return out.id;};
  const edgeClear=(a,b,p,q)=>{const k=Math.min(a,b)*size+Math.max(a,b);if(!entry.edges.has(k))entry.edges.set(k,lineClear(p.x,p.y,q.x,q.y,radius,which));return entry.edges.get(k);};
  cost[start]=0;push(start,heuristic(start));
  let work=0;while(heap.length){if(++work%12===0)yield null;
    const id=pop();if(closed[id])continue;closed[id]=1;const p=point(id);
    if(near(p)){
      const result=[];for(let n=id;n!==-1;n=parent[n])result.push(point(n));result.reverse();
      // Remove unnecessary waypoints while preserving all obstacle checks.
      const smooth=[];let from={x:startX,y:startY},i=0;
      while(i<result.length){yield null;let far=i;for(let j=Math.min(i+16,result.length-1);j>i;j--)if(lineClear(from.x,from.y,result[j].x,result[j].y,radius,which)){far=j;break;}smooth.push(result[far]);from=result[far];i=far+1;}
      if(target.kind==='ground')smooth.push({x:target.x,y:target.y});
      return smooth;
    }
    const ix=id%cols,iy=Math.floor(id/cols);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;const x=ix+dx,y=iy+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
      const next=y*cols+x;if(closed[next]||!walkable(next))continue;
      const q=point(next),g=cost[id]+Math.hypot(dx,dy)*cell;if(g>=cost[next]||!edgeClear(id,next,p,q))continue;
      cost[next]=g;parent[next]=id;push(next,g+heuristic(next));
    }
  }
  if(which==='surface'&&!fullSearch)return yield* v092PathSearch(startX,startY,target,which,radius,true);
  return null;
}
function findWalkPath(...args){const g=v092PathSearch(...args);let out;do{out=g.next();}while(!out.done);return out.value;}

function approachObject(target){
  stopControls();cancelSearch();cancelChop();
  if(canInteract(target,player.x,player.y)){executeInteraction(target);return;}
  const tx=target.x+(target.w||0)/2,ty=target.y+(target.h||0)/2;
  if(scene==='surface'&&!gateOpen&&target.id!=='gate'&&inFortress(player.x,player.y)!==inFortress(tx,ty)){
    message('🔒 Сначала откройте ворота');return;
  }
  const points=findWalkPath(player.x,player.y,target);
  if(!points){message('К объекту нет свободного прохода');return;}
  navigation={targetId:target.id,points,index:0,blockedMs:0,scene};
}
function approachPoint(x,y,following=false){
  if(following)cancelNavigation();else stopControls();
  if(worldCollision(x,y,player.radius,scene)){if(!following)message('Здесь препятствие — выберите свободное место');return;}
  if(scene==='surface'&&!gateOpen&&inFortress(player.x,player.y)!==inFortress(x,y)){
    if(!following)message('🔒 Сначала откройте ворота');return;
  }
  if(distance(player.x,player.y,x,y)<.5)return;
  const destination={id:'ground',kind:'ground',x,y,r:0,range:.5};
  const points=lineClear(player.x,player.y,x,y,player.radius,scene)?[{x,y}]:findWalkPath(player.x,player.y,destination);
  if(!points){if(!following)message('К этой точке нет свободного прохода');return;}
  navigation={destination,points,index:0,blockedMs:0,scene};
}
function updateAutoWalk(){
  if(!navigation)return;
  const target=navigation.destination||interactionObjects().find(o=>o.id===navigation.targetId);
  if(!target||navigation.scene!==scene){cancelNavigation();return;}
  if(canInteract(target,player.x,player.y)){cancelNavigation();if(target.kind!=='ground')executeInteraction(target);return;}
  let p=navigation.points[navigation.index];
  while(p&&distance(player.x,player.y,p.x,p.y)<(navigation.index===navigation.points.length-1?.05:2)){navigation.index++;p=navigation.points[navigation.index];}
  if(!p){cancelNavigation();return;}
  const d=distance(player.x,player.y,p.x,p.y)||1;moveX=(p.x-player.x)/d;moveY=(p.y-player.y)/d;movePower=.84;
  if(!rightAimActive){player.aimX=moveX;player.aimY=moveY;}
}
function updateAction(){
  const icons={gate:gateOpen?'🔒':'🔓',bunker:'↧',surface:'↥',storage:'📦',farm:'🌱',tree:'🪓',search:'🔎',workshop:'🔧',livestock_chickens:'🐔',livestock_cows:'🐄',feed_craft:'🌾'};
  const near=interactionObjects().filter(o=>canInteract(o,player.x,player.y));
  near.sort((a,b)=>{const p=contactPoint(a,player.x,player.y),q=contactPoint(b,player.x,player.y);return distance(player.x,player.y,p.x,p.y)-distance(player.x,player.y,q.x,q.y);});
  interactionTarget=near[0]||null;currentAction=interactionTarget?.kind||null;currentActionObject=interactionTarget;
  I18n.assign(actionButton,"textContent",icons[currentAction]||'✋');actionButton.classList.toggle('available',!!currentAction);actionButton.classList.toggle('inactive',!currentAction);
  I18n.setAttr(actionButton,'aria-label',interactionTarget?.kind==='storage'?I18n.crateName(storageChests[interactionTarget.ref],interactionTarget.ref):interactionTarget?.name||'Действие');
}


function getChestPositions(){
  const s=bunker.storage;
  return [
    // ВЕРХНЯЯ стена комнаты — 4 технических сундука
    {x:s.left+85, y:s.top+58},
    {x:s.left+200,y:s.top+58},
    {x:s.left+320,y:s.top+58},
    {x:s.left+435,y:s.top+58},

    // НИЖНЯЯ противоположная стена — 4 бытовых/медицинских сундука
    {x:s.left+85, y:s.bottom-58},
    {x:s.left+200,y:s.bottom-58},
    {x:s.left+320,y:s.bottom-58},
    {x:s.left+435,y:s.bottom-58},
    {x:185, y:bunker.farm.bottom-30},
    {x:bunker.farm.right-95, y:bunker.farm.bottom-30},
    // 0.43 Pass B: #10 eggs, #11 milk and #12 animal feed are visible crates on the Pantry's bottom wall.
    {x:bunker.pantry.left+115, y:bunker.pantry.bottom-38},
    {x:bunker.pantry.left+310, y:bunker.pantry.bottom-38},
    {x:bunker.pantry.left+395, y:bunker.pantry.bottom-38},
    {x:-72, y:bunker.farm.top+350}     // #13: retired (no longer an animal-water source), not placed in the world
  ].map((p,i)=>GameEquipment.center('chest'+i)||p);
}

// =====================================================
// 0.43 Pass B: the legacy livestock owner (real-time eggs/milk, auto-breeding, starvation,
// wandering and cow audio) was replaced by farm/livestock.js (GameLivestock).
// The released cow-audio clock drew one Math.random() here at load; keep that draw so the shared
// gameplay RNG stream (weapon spread, loot, zombies) stays byte-identical to earlier releases.
const livestockLoadRandom=Math.random();
// =====================================================
function storageCount(index,type){
  const ch=storageChests[index];
  return ch ? ch.items.filter(s=>s?.type===type).reduce((a,s)=>a+s.qty,0) : 0;
}

function feedCraftStationPos(){
  return GameEquipment.center('feed_craft');
}
function nearFeedCraftStation(){
  if(scene!=="bunker") return false;
  const p=feedCraftStationPos();
  return distance(player.x,player.y,p.x,p.y)<=78;
}
let feedCraftBusy=false;
let pendingFeedCraft=null;
let feedCraftLoaded=0;

function showFeedCraftList(){
  if(feedCraftBusy)return;
  feedCraftLoaded=0;
  el("feedCraftList").style.display="";
  el("feedCraftRecipe").style.display="none";
  el("feedCraftProgress").style.display="none";
}
function showFeedGrainRecipe(){
  if(feedCraftBusy)return;
  feedCraftLoaded=0;
  el("feedCraftList").style.display="none";
  el("feedCraftRecipe").style.display="";
  el("feedCraftProgress").style.display="none";
  renderFeedCraftMenu();
}
function setFeedLoaded(n){
  if(feedCraftBusy)return;
  feedCraftLoaded=clamp(Math.floor(n),0,bagCount("grain"));
  renderFeedCraftMenu();
}
function renderFeedCraftMenu(){
  const available=bagCount("grain");
  if(feedCraftLoaded>available)feedCraftLoaded=available;
  const batches=Math.floor(feedCraftLoaded/10);
  const output=batches*20;
  I18n.assign(el("feedCraftAvailable"),"textContent",`В рюкзаке: ${available} зерна`);
  I18n.assign(el("feedCraftLoaded"),"textContent",`🌾 ${feedCraftLoaded}`);
  I18n.assign(el("feedCraftOutput"),"innerHTML",batches>0
      ? `Будет изготовлено: <b>🌾 ${output} корма</b> (${batches}×)`
      : `Для 1 крафта загрузите минимум <b>10 зерна</b>.`);
  const can=batches>0 && !feedCraftBusy;
  el("feedCraftBtn").disabled=!can;
  el("feedCraftBtn").style.opacity=can?"1":".45";
}
function openFeedCraftMenu(){
  feedCraftBusy=!!pendingFeedCraft;
  feedCraftLoaded=0;
  if(pendingFeedCraft)renderPendingFeedCraft();
  else showFeedCraftList();
  openOverlay(el("feedCraftOverlay"));
}

function renderPendingFeedCraft(){
  if(!pendingFeedCraft)return;
  const remaining=Math.max(0,pendingFeedCraft.readyAt-AgricultureTime.now());
  el("feedCraftList").style.display="none";
  el("feedCraftRecipe").style.display="none";
  el("feedCraftProgress").style.display="";
  el("feedCraftBar").style.width=(clamp(1-remaining/2500,0,1)*100).toFixed(0)+"%";
  I18n.assign(el("feedCraftProgressText"),"textContent",remaining>0
    ? "⚙️ Изготовление корма…"
    : `🌾 Готово: ${pendingFeedCraft.qty}. Освободите место в рюкзаке или хранилище корма.`);
}

function updateFeedCraft(){
  if(!AgricultureTime.animalsAvailable)return;
  if(!pendingFeedCraft)return;
  if(el("feedCraftOverlay").classList.contains("open"))renderPendingFeedCraft();
  if(AgricultureTime.now()<pendingFeedCraft.readyAt)return;
  const before=pendingFeedCraft.qty;
  let left=addItem("animal_feed",before);
  if(left>0)left=addToSlots(storageChests[12].items,"animal_feed",left,60);
  pendingFeedCraft.qty=left;
  if(left>0){
    if(left!==before)queueGameSave();
    return;
  }
  const total=pendingFeedCraft.total;
  pendingFeedCraft=null;
  feedCraftBusy=false;
  feedCraftLoaded=0;
  if(el("feedCraftOverlay").classList.contains("open")){
    el("feedCraftProgress").style.display="none";
    el("feedCraftRecipe").style.display="";
    renderFeedCraftMenu();
  }
  message(`🌾 Готово: ${total} корма`);
  queueGameSave();
}

function nearestStorageChest(){
  if(scene!=="bunker")return null;
  const ps=getChestPositions();

  // Visual chest is 68×50. Interaction follows that rectangle,
  // with a comfortable invisible border around all four sides.
  const halfW=34, halfH=25, margin=34;
  let best=null, bestD=Infinity;

  for(let i=0;i<ps.length;i++){
    if(i===13) continue; // 0.43 Pass B: #13 is retired
    const p=ps[i];
    if(
      player.x >= p.x-halfW-margin &&
      player.x <= p.x+halfW+margin &&
      player.y >= p.y-halfH-margin &&
      player.y <= p.y+halfH+margin
    ){
      const nx=clamp(player.x,p.x-halfW,p.x+halfW);
      const ny=clamp(player.y,p.y-halfH,p.y+halfH);
      const d=distance(player.x,player.y,nx,ny);
      if(d<bestD){bestD=d;best=i;}
    }
  }
  return best;
}
function addToSlots(slots,type,qty,maxSlots=60){
  let left=qty;
  for(const s of slots){
    if(s.type===type&&s.qty<STACK_MAX){
      const n=Math.min(left,STACK_MAX-s.qty);s.qty+=n;left-=n;if(left<=0)return 0;
    }
  }
  while(left>0&&slots.length<maxSlots){
    const n=Math.min(left,STACK_MAX);slots.push({type,qty:n});left-=n;
  }
  return left;
}
function removeFromSlots(slots,type,qty){
  let left=qty;
  for(let i=slots.length-1;i>=0&&left>0;i--){
    const s=slots[i];if(s.type!==type)continue;
    const n=Math.min(left,s.qty);s.qty-=n;left-=n;if(s.qty<=0)slots.splice(i,1);
  }
  return qty-left;
}
function openStorage(index){
  activeStorage=Number(index);window.GameChapterOne?.visitStorage(activeStorage);
  renderStorage();
  openOverlay(el("storageOverlay"));
}
function slotHTML(s){
  return s?`<div class="ico">${itemIconHTML(s.type)}</div><div>${ITEM[s.type].name}</div><div class="qty">×${s.qty}</div>`:`<div style="opacity:.28">ПУСТО</div>`;
}
function renderStorage(){
  renderQuickSlots();updateAmmoHud();
  const ch=storageChests[activeStorage];
  if(!ch)return;
  I18n.assign(el("storageTitle"),"textContent",`${ch.icon} ${I18n.crateName(ch,activeStorage)}`);
  const a=el("storageContents"),b=el("storageBag");I18n.assign(a,"innerHTML","");I18n.assign(b,"innerHTML","");
  for(let i=0;i<60;i++){
    const d=document.createElement("div");d.className="invSlot";d.dataset.chestSlot=i;
    I18n.assign(d,"innerHTML",slotHTML(ch.items[i]));a.appendChild(d);
  }
  for(let i=0;i<BAG_SLOTS;i++){
    const d=document.createElement("div");d.className="invSlot";d.dataset.bagSlot=i;
    I18n.assign(d,"innerHTML",slotHTML(bag[i]));b.appendChild(d);
  }
}
function openChestSettings(){
  const ch=storageChests[activeStorage];if(!ch)return;
  el("chestNameInput").value=ch.name;
  // Every icon used by an actual game item, plus the generic chest/tool icons.
  const icons=[...new Set([
    "📦","🥤","🧰","⭐","🔧","🎒",
    ...Object.values(ITEM).map(item=>item.icon)
  ])];
  const box=el("chestIconChoices");I18n.assign(box,"innerHTML","");
  for(const ico of icons){
    const bt=document.createElement("button");bt.className="smallBtn";I18n.assign(bt,"textContent",ico);
    bt.style.fontSize="24px";bt.dataset.icon=ico;box.appendChild(bt);
  }
  const settingsOverlay=el("chestSettingsOverlay");
  openOverlay(settingsOverlay);
  settingsOverlay.style.zIndex="10050";
}
