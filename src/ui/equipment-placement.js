/* Core client: a room plan is the placement preview. It never moves the actor,
   consumes resources on pointer input, or serializes a ghost into gameplay. */
window.GamePlacementUI=(()=>{
  const t=(k,p)=>I18n.t('placement.'+k,p),clone=v=>JSON.parse(JSON.stringify(v));
  const core=el('commandCoreOverlay');let sectionRoute=null,preview=null,room='reserve_l1',statusKey='hint',renderView=()=>{},renderMap=()=>{},lastSignature='',requestSequence=0;
  const active=()=>core.classList.contains('open')&&!el('coreSection_construction')?.hidden;
  function cancel(){preview=null;statusKey='hint';lastSignature='';if(active())renderView();}
  function assess(){if(!preview)return;preview.result=GamePlacement.check(preview.selection,preview.transform);preview.revision=GamePlacement.revision;preview.geometry=geometryRevision;}
  function choose(selection){
    const r=GameEquipment.get(selection),typeId=r?.typeId||selection.replace(/^catalog:/,'');if(!GamePlacement.rules[typeId])return false;
    if(r?.placement==='installed')return false;
    const b=BunkerLayout.rooms[room];preview={selection,typeId,turn:0,transform:GamePlacement.centered(typeId,room,(b.left+b.right)/2,(b.top+b.bottom)/2)};assess();statusKey='preview';lastSignature='';renderView();return true;
  }
  function move(x,y){if(!preview)return;preview.transform=GamePlacement.centered(preview.typeId,room,x,y,preview.turn);assess();renderMap();renderView();}
  function rotate(){if(!preview)return;const f=GamePlacement.footprint({typeId:preview.typeId,transform:preview.transform});preview.turn=(preview.turn+1)%4;move(f.x+f.w/2,f.y+f.h/2);}
  function nudge(dx,dy){if(!preview)return;const f=GamePlacement.footprint({typeId:preview.typeId,transform:preview.transform});move(f.x+f.w/2+dx,f.y+f.h/2+dy);}
  function commit(){
    if(!preview)return false;
    const p=preview,result=GamePlacement.execute({actorId:GameActors.localId,instanceId:p.selection,action:'place',payload:{transform:clone(p.transform),geometry:p.geometry},expectedRevision:p.revision,requestId:'placement-preview:'+p.revision+':'+(++requestSequence)});
    if(result.ok){preview=null;statusKey='placed';lastSignature='';}else{statusKey=result.reason;preview.result=result;}
    renderView();return result;
  }
  function pack(id){const result=GamePlacement.request(id,'pack');statusKey=result.ok?'packed':result.reason;lastSignature='';renderView();return result;}
  function tick(){if(!active()){if(preview)cancel();return;}renderView();}
  CommandCoreUI.registerSection('construction','placement.title',(scroll,route)=>{
    sectionRoute=route;
    const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
    const button=(label,fn)=>{const b=node('button',label,'menuButton');b.type='button';b.onclick=fn;return b;};
    const heading=node('h3'),hint=node('p',null,'coreHint'),catalog=node('div',null,'placementCatalog'),controls=node('div',null,'placementRooms');
    const map=node('canvas',null,'placementPlan');map.id='placementPlan';map.width=520;map.height=500;map.tabIndex=0;map.setAttribute('role','application');
    const note=node('p',null,'placementStatus');note.id='placementStatus';note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    const actions=node('div',null,'placementActions'),rotateButton=button('',rotate),confirm=button('',commit),cancelButton=button('',cancel);confirm.id='placementConfirm';rotateButton.id='placementRotate';cancelButton.id='placementCancel';actions.append(rotateButton,confirm,cancelButton);
    const arrows=node('div',null,'placementNudge');for(const [label,dx,dy]of [['←',-10,0],['↑',0,-10],['↓',0,10],['→',10,0]]){const b=button(label,()=>nudge(dx,dy));b.dataset.nudge=label;arrows.append(b);}
    scroll.append(heading,hint,catalog,controls,map,arrows,note,actions);
    const roomButtons=GamePlacement.zones.map(id=>{const b=button('',()=>{route.setPage(id);room=id;if(preview)choose(preview.selection);lastSignature='';renderView();});controls.append(b);return {id,b};});
    function costText(type){return Object.entries(GamePlacement.rules[type].cost).map(([id,n])=>I18n.text(ITEM[id].name)+' '+I18n.number(n)+' / '+I18n.number(V010Inventory.materialCount(id))).join(' · ');}
    function paint(r,ghost=false){
      const c=map.getContext('2d'),b=BunkerLayout.rooms[room],def=EquipmentInstances.definitions[r.typeId],key=({furnace:'furnace',craft_bench:'workbench',enhancement_cradle:'upgrade_station0161'})[r.typeId];
      c.save();c.translate(r.transform.x-b.left,r.transform.y-b.top);c.rotate(r.transform.rotation);if(ghost)c.globalAlpha=.5;
      const asset=key&&GameAssets.artId(key),meta=AssetManifest.images[asset],im=asset&&GameAssets.image(asset);
      if(im&&GameAssets.ready(asset)){const crop=meta.crop||{x:0,y:0,w:meta.size[0],h:meta.size[1]},scale=Math.min(def.footprint.w/crop.w,def.footprint.h/crop.h);c.drawImage(im,crop.x,crop.y,crop.w,crop.h,(def.footprint.w-crop.w*scale)/2,(def.footprint.h-crop.h*scale)/2,crop.w*scale,crop.h*scale);}
      else{c.fillStyle='#728d87';c.fillRect(0,0,def.footprint.w,def.footprint.h);}
      c.restore();
    }
    renderMap=()=>{
      if(!active())return;const c=map.getContext('2d'),b=BunkerLayout.rooms[room];c.clearRect(0,0,520,500);c.fillStyle='#172b32';c.fillRect(0,0,520,500);
      c.strokeStyle='#2d454b';c.lineWidth=1;for(let n=20;n<520;n+=20){c.beginPath();c.moveTo(n,0);c.lineTo(n,500);c.stroke();}for(let n=20;n<500;n+=20){c.beginPath();c.moveTo(0,n);c.lineTo(520,n);c.stroke();}
      const keep=GamePlacement.protectedArea(room);c.fillStyle='#c39a5730';c.fillRect(keep.x-b.left,keep.y-b.top,keep.w,keep.h);
      c.strokeStyle='#799489';c.lineWidth=8;c.strokeRect(4,4,512,492);const door=BunkerLayout.door(room);c.fillStyle='#77b5a6';c.fillRect(door.x-b.left,door.y-b.top,door.w,door.h);
      for(const r of GameEquipment.capture())if(r.transform.room===room&&r.placement==='installed')paint(r);
      if(preview){const r={typeId:preview.typeId,transform:preview.transform},f=GamePlacement.footprint(r);paint(r,true);c.strokeStyle=preview.result?.ok?'#b9eb9d':'#f89c86';c.lineWidth=3;c.strokeRect(f.x-b.left,f.y-b.top,f.w,f.h);const p=EquipmentInstances.aabb(r.transform,{x:EquipmentInstances.definitions[r.typeId].footprint.w/2-5,y:EquipmentInstances.definitions[r.typeId].footprint.h-10,w:10,h:10});c.fillStyle=c.strokeStyle;c.fillRect(p.x-b.left,p.y-b.top,p.w,p.h);}
    };
    renderView=()=>{
      if(!active())return;room=route.page||'reserve_l1';heading.textContent=t('heading');hint.textContent=t('hint');map.setAttribute('aria-label',t('mapHint'));for(const {id,b}of roomButtons){b.textContent=I18n.t('core.room.'+id);b.classList.toggle('active',room===id);b.setAttribute('aria-pressed',String(room===id));}
      const signature=[I18n.language,GameEquipment.epoch,GamePlacement.revision,GameEquipment.productionIds.map(id=>Number(GamePlacement.blockedByWork(id))).join(),Object.keys(GamePlacement.rules).map(costText).join(),preview?.selection||''].join('|');
      if(signature!==lastSignature){lastSignature=signature;catalog.replaceChildren();
        for(const [type,rule]of Object.entries(GamePlacement.rules)){
          const card=node('section',null,'placementType'),records=GameEquipment.capture().filter(r=>r.typeId===type);card.append(node('strong',I18n.text(EquipmentInstances.definitions[type].name)),node('small',t('limit',{count:records.length,limit:rule.limit})),node('p',costText(type),'coreHint'));
          const build=button(t('build'),()=>choose('catalog:'+type));build.disabled=records.length>=rule.limit;build.dataset.buildType=type;card.append(build);
          for(const [i,r]of records.entries()){
            const line=node('div',null,'placementInstance');line.append(node('span',t(r.placement==='packed'?'packedLabel':'installedLabel',{number:i+1,room:I18n.t('core.room.'+r.transform.room)})));
            const busy=GamePlacement.blockedByWork(r.id),b=button(t(r.placement==='packed'?'place':'pack'),()=>r.placement==='packed'?choose(r.id):pack(r.id));b.dataset.instance=r.id;b.disabled=busy;line.append(b);card.append(line);if(busy)card.append(node('small',t('busy'),'coreHint'));
          }catalog.append(card);
        }
      }
      rotateButton.textContent=t('rotate');confirm.textContent=t('confirm');cancelButton.textContent=t('cancel');rotateButton.disabled=cancelButton.disabled=!preview;for(const b of arrows.children){b.disabled=!preview;b.setAttribute('aria-label',t('nudge')+' '+b.dataset.nudge);}
      const stale=preview&&(preview.revision!==GamePlacement.revision||preview.geometry!==geometryRevision),shortage=preview&&!GameEquipment.get(preview.selection)&&Object.entries(GamePlacement.rules[preview.typeId].cost).some(([id,n])=>V010Inventory.materialCount(id)<n);
      const reason=!GamePlacement.access(GameActors.local)?'out_of_reach':stale?'world_changed':shortage?'materials':preview?(preview.result?.ok?'valid':preview.result?.reason||'bounds'):statusKey;
      note.textContent=t(reason);note.dataset.valid=String(!!preview&&reason==='valid');confirm.disabled=!preview||reason!=='valid';renderMap();
    };
    let pointer=null;
    const point=e=>{const b=map.getBoundingClientRect(),r=BunkerLayout.rooms[room];return {x:r.left+(e.clientX-b.left)*520/b.width,y:r.top+(e.clientY-b.top)*500/b.height};};
    GameInput.registerSurface(map,{active,down(e){if(e.button>0||pointer!==null)return;pointer=e.pointerId;try{map.setPointerCapture?.(pointer);}catch(_){}const p=point(e);move(p.x,p.y);},move(e){if(pointer===e.pointerId){const p=point(e);move(p.x,p.y);}},up(e){if(pointer===e.pointerId){try{map.releasePointerCapture?.(pointer);}catch(_){}pointer=null;}},cancel(){pointer=null;},key(e){if(!preview)return false;if(e.key==='Escape'){cancel();return true;}if(e.repeat)return false;if(e.key.toLowerCase()==='r'){rotate();return true;}const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){nudge(...delta);return true;}return false;}});
    return renderView;
  },()=>true,id=>GamePlacement.zones.includes(id));
  v09Style(`
#commandCoreOverlay .placementCatalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
#commandCoreOverlay .placementType{min-width:0;padding:11px;border:1px solid #49635c;border-radius:9px;background:#1a3033}
#commandCoreOverlay .placementType>strong{display:block;font-size:13px}#commandCoreOverlay .placementType>small{font-size:10px;color:#b8c9b6}
#commandCoreOverlay .placementType button{min-height:38px;margin:4px 0;padding:6px 9px;font-size:12px}
#commandCoreOverlay .placementInstance{display:flex;align-items:center;gap:8px;font-size:11px;border-top:1px solid #ffffff12;margin-top:5px}#commandCoreOverlay .placementInstance span{flex:1;min-width:0;overflow-wrap:anywhere}
#commandCoreOverlay .placementRooms,#commandCoreOverlay .placementActions,#commandCoreOverlay .placementNudge{display:flex;gap:8px;margin:7px 0}
#commandCoreOverlay .placementRooms button,#commandCoreOverlay .placementActions button,#commandCoreOverlay .placementNudge button{flex:1;min-width:0;min-height:42px;margin:0;padding:7px;font-size:12px}
#commandCoreOverlay .placementRooms .active{border-color:#b5d499;background:#375244}
#commandCoreOverlay .placementPlan{display:block;width:min(100%,520px);height:auto;aspect-ratio:26/25;margin:10px auto;touch-action:none;border-radius:9px;outline-offset:3px}
#commandCoreOverlay .placementStatus{font-size:12px;min-height:40px;color:#e0b29b;margin:8px 0}#commandCoreOverlay .placementStatus[data-valid="true"]{color:#b5db9c}
#commandCoreOverlay .placementActions{position:sticky;bottom:-16px;background:#102127;padding:8px 0;margin-bottom:0;border-top:1px solid #4a655d}
@media(max-width:380px){#commandCoreOverlay #coreTab_construction{font-size:11px;padding:6px 3px}}
@media(max-width:480px){#commandCoreOverlay .placementCatalog{grid-template-columns:1fr}#commandCoreOverlay .placementActions{gap:5px}}
`);
  return Object.freeze({choose,pack,move,rotate,nudge,commit,cancel,tick,get preview(){return preview?clone(preview):null;},get room(){return sectionRoute?.page||'reserve_l1';}});
})();
