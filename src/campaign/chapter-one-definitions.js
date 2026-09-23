/* C2 content. The released Stage A route remains frozen for existing worlds.
   No new Research/Blueprint/placement gate or second chapter is introduced. */
window.ChapterOneDefinitions=(()=>{
  const steps=[
    ['c1_tools','c1Tools',true],['c1_fuel','c1Fuel',true],['c1_tank','c1Tank',true],
    ['c1_power','c1Power',true],['c1_core','c1Core',true],
    ['c1_materials','c1Concrete',18],['c1_repairs','c1Repairs',3],['c1_night','c1Night',true]
  ];
  const objectives=steps.map(([id,fact,target],i)=>({id,title:'chapter1.'+id+'.title',description:'chapter1.'+id+'.description',required:true,semantics:'once',requires:i?[steps[i-1][0]]:[],condition:{fact,...(target===true?{equals:true}:{atLeast:target})}}));
  objectives.push(
    {id:'c1_mine',title:'chapter1.c1_mine.title',description:'chapter1.c1_mine.description',required:false,semantics:'once',requires:[],condition:{fact:'mined',atLeast:15}},
    {id:'c1_battery',title:'chapter1.c1_battery.title',description:'chapter1.c1_battery.description',required:false,semantics:'once',requires:[],condition:{fact:'batteryCharge',atLeast:.05}}
  );
  const d={revision:4,first:'chapter_1',facts:[...steps.map(s=>s[1]),'mined','batteryCharge'],chapters:[
    {id:'chapter_1',title:'chapter1.title',description:'chapter1.description',goal:'chapter1.goal',requires:[],next:'base_restored',objectives},
    {id:'base_restored',title:'chapter1.restored.title',description:'chapter1.restored.description',goal:'chapter1.restored.goal',requires:['chapter_1'],next:null,objectives:[]}
  ]};
  const freeze=o=>{Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(o);};return freeze(d);
})();

// Balance is explicit and reviewable; changes apply to future New Games only.
window.ChapterOnePreset=(()=>{
 const p={id:'last-base-chapter1-v1',
   damage:[{id:'v091wall020_N_0',hp:0},{id:'v091wall020_N_1',hp:6000},{id:'v091wall020_E_1',hp:0},{id:'gate',hp:4000},{id:'v09door_storage',hp:8000}],
   criticalRepairs:['v091wall020_N_0','gate','v09door_storage'],
   starterKit:[{type:'hammer',qty:1},{type:'pickaxe',qty:1},{type:'ammo',qty:60},{type:'meds',qty:3}],
   supplies:[{type:'fuel',qty:12},{type:'stone',qty:40}],
   enabledDevices:['light_corridor','command_core_l1','light_workshop','light_room5','light_storage','door_workshop','door_room5','door_storage','furnace','craft_bench'],
   concreteRequired:18,nightStart:1200,nightEnd:360};
 const freeze=o=>{Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(o);};return freeze(p);
})();
