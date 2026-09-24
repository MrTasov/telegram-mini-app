/* Content identities are separate from item types and world instance IDs.
   Future sources add definitions + an authoritative eligibility fact adapter;
   no Research Site, archive, sector, network transport or skill tree lives here. */
const ResearchDefinitions=(()=>{
  const yes=(fact,reason='research.error.prerequisite')=>({fact,equals:true,reason});
  const data={revision:1,categories:['production','weapons','drones'],
    facts:['base.core_powered','base.drone_station','campaign.chapter_one_complete','campaign.legacy_world','legacy.precision_blueprint','legacy.elite_weapon','legacy.workshop_efficiency','legacy.tools_upgrade'],
    blueprints:[
      {id:'blueprint.precision_weapons',title:'research.blueprint.precision'},
      {id:'blueprint.scout_service',title:'research.blueprint.scout'}
    ],
    technologies:[
      {id:'technology.station_fabrication',buildables:['furnace','craft_bench'],recipes:[],droneModules:[]},
      {id:'technology.precision_weapons',buildables:[],recipes:['rifle_m4'],droneModules:[]},
      {id:'technology.scout_service',buildables:[],recipes:[],droneModules:['body','battery','weapon']},
      {id:'technology.workshop_efficiency',buildables:[],recipes:[],droneModules:[]}
    ],
    research:[
      {id:'research.station_fabrication',category:'production',title:'research.project.fabrication',description:'research.description.fabrication',effect:'research.effect.fabrication',cost:12,blueprints:[],requires:yes('base.core_powered'),technologies:['technology.station_fabrication'],icon:{kind:'buildable',id:'craft_bench'}},
      {id:'research.precision_weapons',category:'weapons',title:'research.project.precision',description:'research.description.precision',effect:'research.effect.precision',cost:18,blueprints:['blueprint.precision_weapons'],requires:{any:[yes('technology.station_fabrication'),yes('legacy.precision_blueprint')],reason:'research.error.fabrication'},technologies:['technology.precision_weapons'],icon:{kind:'item',id:'rifle_m4'}},
      {id:'research.scout_service',category:'drones',title:'research.project.scout',description:'research.description.scout',effect:'research.effect.scout',cost:15,blueprints:['blueprint.scout_service'],requires:yes('base.drone_station','research.error.drone_station'),technologies:['technology.scout_service'],icon:{kind:'item',id:'drone014'}},
      {id:'research.workshop_efficiency',category:'production',title:'research.project.efficiency',description:'research.description.efficiency',effect:'research.effect.efficiency',cost:15,blueprints:[],requires:yes('technology.station_fabrication','research.error.fabrication'),technologies:['technology.workshop_efficiency'],icon:{kind:'buildable',id:'utility_workbench'}}
    ],
    // A small guaranteed local supply, not new exploration content. Packets are
    // actor-owned until submitted; each source is claimable once per world.
    sources:[
      {id:'source.core_diagnostics',kind:'base_diagnostics',title:'research.source.core',description:'research.source.coreDescription',data:20,blueprints:[],requires:yes('base.core_powered')},
      {id:'source.scout_service',kind:'equipment_documentation',title:'research.source.scout',description:'research.source.scoutDescription',data:20,blueprints:['blueprint.scout_service'],requires:yes('base.drone_station','research.error.drone_station')},
      {id:'source.recovery_report',kind:'chapter_reward',title:'research.source.recovery',description:'research.source.recoveryDescription',data:25,blueprints:['blueprint.precision_weapons'],requires:{any:[yes('campaign.chapter_one_complete'),yes('campaign.legacy_world')],reason:'research.error.chapter_one'}}
    ],
    legacyEntitlements:['technology.station_fabrication','technology.precision_weapons','technology.scout_service'],
    legacyBindings:{precision_blueprint:'technology.precision_weapons',workshop_efficiency:'technology.workshop_efficiency'},
    bindings:{
      buildables:{furnace:yes('technology.station_fabrication','research.error.fabrication'),craft_bench:yes('technology.station_fabrication','research.error.fabrication')},
      recipes:{rifle_m4:{any:[yes('technology.precision_weapons'),yes('legacy.precision_blueprint')],reason:'research.error.precision'}},
      droneModules:Object.fromEntries(['body','battery','weapon'].map(k=>[k,yes('technology.scout_service','research.error.scout')]))
    },
    futureHooks:[
      {id:'technology.scout_ammo_capacity',category:'drones',status:'deferred'},
      {id:'technology.scout_sensor_range',category:'drones',status:'deferred'},
      {id:'technology.scout_charging_speed',category:'drones',status:'deferred'}
    ]
  };
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  return freeze(data);
})();
