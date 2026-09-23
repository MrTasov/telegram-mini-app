/* Stage A is a small onboarding chain, not the damaged Chapter 1 preset.
   Stable content IDs; no grants, prices, new technologies or station instances. */
window.CampaignDefinitions=(()=>{
  const definitions={revision:1,first:'base_check',facts:['generatorRunning','corePowered','mined'],
    chapters:[
      {id:'base_check',title:'campaign.chapter.check',description:'campaign.chapter.check.description',requires:[],next:'free_preparation',objectives:[
        {id:'power_once',title:'campaign.objective.power',description:'campaign.objective.power.description',required:true,semantics:'once',requires:[],condition:{fact:'generatorRunning',equals:true,reason:'campaign.reason.generator'}},
        {id:'ore_after',title:'campaign.objective.ore',description:'campaign.objective.ore.description',required:true,semantics:'after',requires:['power_once'],condition:{fact:'mined',atLeast:1,reason:'campaign.reason.ore'}},
        {id:'core_current',title:'campaign.objective.core',description:'campaign.objective.core.description',required:true,semantics:'current',requires:[],condition:{fact:'corePowered',equals:true,reason:'campaign.reason.power'}}
      ]},
      {id:'free_preparation',title:'campaign.chapter.free',description:'campaign.chapter.free.description',requires:['base_check'],next:null,objectives:[]}
    ]};
  function freeze(o){Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(o);}
  return freeze(definitions);
})();
