/* Recipe ownership is type data. Existing paid orders retain their historical
   owner, duration and refund ledger until collected; no materials are re-priced. */
window.GameProductionSplit=(()=>{
  const r=V09Craft.recipes,old={};
  for(const id of ['hammer','fishing_rod','flashlight','head_mount']){old[id]={...r[id],input:{...r[id].input}};r[id].station='utility_workbench';r[id].manual=true;}
  Object.assign(r.hammer,{input:{wood:2,iron:2},ms:3000});
  for(const [id,name]of [['pickaxe','Кирка'],['axe','Топор']])r[id]={station:'utility_workbench',category:'Инструменты',name,input:{wood:2,iron:2},output:id,qty:1,ms:3000,manual:true};
  r.remote={station:'utility_workbench',category:'Инструменты',name:'Пульт базы',input:{iron:2,copper:1,parts:1},output:'remote',qty:1,ms:8000,manual:true};
  ITEM.base_lamp={name:'Напольная лампа',icon:'💡',deployable:true,stackMax:1};
  r.base_lamp={station:'utility_workbench',category:'Оборудование',name:'Напольная лампа',input:{iron:2,copper:1,parts:1},output:'base_lamp',qty:1,ms:6000,manual:true};
  V092_ICONS.base_lamp=AssetManifest.images['buildable/base_lamp'].path;
  const compatible=(j,type)=>j?.legacy0351===true&&type==='craft_bench'&&!!old[j.recipe];
  function recipe(j,type){if(compatible(j,type))return old[j.recipe];return r[j?.recipe];}
  function migrate(d){const q=d.v010?.modules?.craft;for(const record of d.equipment032.instances){if(record.typeId!=='craft_bench')continue;for(const job of [d.v09?.crafting?.jobs?.[record.id],...(q?.queues?.[record.id]||[])])if(job&&old[job.recipe])job.legacy0351=true;}}
  return Object.freeze({compatible,recipe,migrate,legacyRecipes:Object.freeze(old)});
})();
