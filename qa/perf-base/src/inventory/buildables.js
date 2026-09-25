/* A carried marker occupies one real backpack cell. It contains only the
   registry reference: identity, condition and operational state have one owner.
   Legacy overflow is import-only escrow, never a second source of new items. */
window.GameCarried=(()=>{
  const TYPE='equipment_case',copy=v=>JSON.parse(JSON.stringify(v));let legacyOverflow=[];
  ITEM[TYPE]={name:I18n.t('build.inventory'),icon:'📦',deployable:true,stackMax:1};
  const is=s=>s?.type===TYPE;
  const token=id=>({type:TYPE,qty:1,instanceId:id});
  const title=s=>I18n.t(GameEquipment.get(s.instanceId)?'build.type.'+GameEquipment.get(s.instanceId).typeId:'build.inventory');
  const html=s=>{const r=GameEquipment.get(s.instanceId),art=r&&AssetManifest.images['buildable/'+r.typeId];return art?'<div class="ico"><img class="itemIcon" src="'+art.path+'" alt="" draggable="false"></div>':'';};
  const free=()=>{for(let i=0;i<BAG_SLOTS;i++)if(!bag[i])return i;return -1;};
  const owns=id=>bag.some(s=>is(s)&&s.instanceId===id)||legacyOverflow.includes(id);
  function add(id){const at=free();if(at<0||owns(id))return false;bag[at]=token(id);return true;}
  function remove(id){const at=bag.findIndex(s=>is(s)&&s.instanceId===id);if(at>=0){bag[at]=null;return true;}const i=legacyOverflow.indexOf(id);if(i<0)return false;legacyOverflow.splice(i,1);return true;}
  function migrate(d){
    const overflow=[],capacity=ITEM[d.equipment.backpack.type].capacity;
    for(const r of d.equipment032.instances.filter(r=>r.placement==='packed')){
      let at=-1;for(let i=0;i<capacity;i++)if(!d.bag[i]){at=i;break;}
      if(at<0)overflow.push(r.id);else d.bag[at]=token(r.id);
    }
    d.carry0353={schema:1,legacyOverflow:overflow};
  }
  function validate(d){
    const state=d.carry0353,actor=d.identity027?.playerId||'player:1';
    if(!state||state.schema!==1||Object.keys(state).sort().join()!=='legacyOverflow,schema'||!Array.isArray(state.legacyOverflow)||state.legacyOverflow.length>192)throw Error('Invalid carried equipment state');
    const markers=[];const visit=(v,path)=>{if(!v||typeof v!=='object')return;if(is(v)){if(!/^bag\.\d+$/.test(path)||Object.keys(v).sort().join()!=='instanceId,qty,type'||v.qty!==1||typeof v.instanceId!=='string')throw Error('Invalid carried equipment marker');markers.push(v.instanceId);return;}for(const [k,c]of Object.entries(v))visit(c,path?path+'.'+k:k);};visit(d,'');
    const ids=markers.concat(state.legacyOverflow),records=d.equipment032.instances.filter(r=>r.placement==='packed');
    if(ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length||ids.length!==records.length||records.some(r=>r.ownerId!==actor||!ids.includes(r.id)))throw Error('Missing or duplicate carried instance');
    return true;
  }
  const capture=()=>({schema:1,legacyOverflow:copy(legacyOverflow)});
  GameSave.extend('capture','inventory.buildables',function(previous){const d=previous();d.carry0353=capture();return d;});
  GameSave.extend('decode','inventory.buildables',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','inventory.buildables',function(previous,d){validate(d);const out=previous(d);legacyOverflow=copy(d.carry0353.legacyOverflow);return out;});
  GameState.register('carried',{capture},{source:'inventory/buildables.js',saved:['carry0353'],transient:[]});
  return Object.freeze({TYPE,is,token,title,html,free,owns,add,remove,migrate,validate,capture,get overflow(){return [...legacyOverflow];}});
})();
