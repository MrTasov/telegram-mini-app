/* Stage A is a small onboarding chain, not the damaged Chapter 1 preset.
   Stable content IDs; no grants, prices, new technologies or station instances. */
window.CampaignDefinitions=(()=>{
  const definitions={revision:2,first:'base_check',facts:['generatorRunning','corePowered','mined','woodStored','ironProduced','batteryCharge','perimeterCondition'],
    chapters:[
      {id:'base_check',title:'campaign.chapter.check',description:'campaign.chapter.check.description',requires:[],next:'free_preparation',objectives:[
        {id:'power_once',title:'campaign.objective.power',description:'campaign.objective.power.description',required:true,semantics:'once',requires:[],condition:{fact:'generatorRunning',equals:true,reason:'campaign.reason.generator'}},
        {id:'ore_after',title:'campaign.objective.ore',description:'campaign.objective.ore.description',required:true,semantics:'after',requires:['power_once'],condition:{fact:'mined',atLeast:1,reason:'campaign.reason.ore'}},
        {id:'core_current',title:'campaign.objective.core',description:'campaign.objective.core.description',required:true,semantics:'current',requires:[],condition:{fact:'corePowered',equals:true,reason:'campaign.reason.power'}},
        {id:'wood_stock',since:2,title:'campaign.objective.wood',description:'campaign.objective.wood.description',required:false,semantics:'current',requires:[],condition:{fact:'woodStored',atLeast:12}},
        {id:'iron_after',since:2,title:'campaign.objective.iron',description:'campaign.objective.iron.description',required:false,semantics:'after',requires:['ore_after'],condition:{fact:'ironProduced',atLeast:1}},
        {id:'battery_once',since:2,title:'campaign.objective.battery',description:'campaign.objective.battery.description',required:false,semantics:'once',requires:['power_once'],condition:{fact:'batteryCharge',atLeast:.05}},
        {id:'perimeter_current',since:2,title:'campaign.objective.perimeter',description:'campaign.objective.perimeter.description',required:false,semantics:'current',requires:[],condition:{fact:'perimeterCondition',atLeast:.75}}
      ]},
      {id:'free_preparation',title:'campaign.chapter.free',description:'campaign.chapter.free.description',requires:['base_check'],next:null,objectives:[]}
    ]};
  function freeze(o){Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(o);}
  return freeze(definitions);
})();
