/* Current world only. Content IDs never double as equipment instance IDs.
   Region geometry and existing buildings remain the authoritative geometry. */
const ExplorationDefinitions=(()=>{
  const yes=fact=>({fact,equals:true,reason:'exploration.locked'});
  const regions=[['woodland','woodland10',['west','river']],['industry','industry10',['east','south']],['south','south10',['southwest','southeast']],['river','river10',['southwest']],['north','region12_north',['west','east']],['west','region12_west',['north','southwest']],['east','region12_east',['north','southeast','annex']],['southwest','region12_southwest',['station']],['southeast','region12_southeast',['station']],['station','region12_south',[]]];
  const entries={industry:{x:2300,y:2340},woodland:{x:-530,y:2320},west:{x:-1700,y:2350}};
  const data={schema:1,revision:1,worldId:'world:surface',home:{x:800,y:690,scene:'surface'},
    facts:['world.open','expedition.field_notes'],
    sectors:[{id:'sector.home',title:'exploration.sector.home',shape:{x:-400,y:0,w:2400,h:1070},entry:{x:800,y:1150},requires:yes('world.open'),neighbors:['woodland','industry','south','river'].map(id=>'sector.'+id)},
      ...regions.map(([id,regionId,neighbors])=>({id:'sector.'+id,title:'exploration.sector.'+id,regionId,entry:entries[id],requires:yes('world.open'),neighbors:neighbors.map(id=>'sector.'+id)})),
      {id:'sector.annex',title:'exploration.sector.annex',buildingId:'ex12_east_1',requires:yes('expedition.field_notes'),neighbors:[],gate:true}],
    sites:[
      {id:'site.field_notes',sectorId:'sector.woodland',buildingId:'mill10',sourceId:'source.field_notes',title:'exploration.site.field_notes',description:'exploration.site.field_notes.desc',hint:{fact:'world.open',equals:true}},
      {id:'site.service_cache',sectorId:'sector.annex',buildingId:'ex12_east_1',sourceId:'source.service_cache',title:'exploration.site.service_cache',description:'exploration.site.service_cache.desc',hint:yes('expedition.field_notes')},
      {id:'site.station_records',sectorId:'sector.station',buildingId:'ex12_south_2',sourceId:'source.station_records',title:'exploration.site.station_records',description:'exploration.site.station_records.desc',hint:yes('expedition.field_notes')}],
    researchSources:[
      {id:'source.field_notes',kind:'exploration',siteId:'site.field_notes',title:'exploration.site.field_notes',description:'exploration.source.field_notes',data:8,blueprints:[],requires:yes('world.site.field_notes')},
      {id:'source.service_cache',kind:'exploration',siteId:'site.service_cache',title:'exploration.site.service_cache',description:'exploration.source.service_cache',data:12,blueprints:['blueprint.scout_service'],requires:yes('world.site.service_cache')},
      {id:'source.station_records',kind:'exploration',siteId:'site.station_records',title:'exploration.site.station_records',description:'exploration.source.station_records',data:16,blueprints:['blueprint.precision_weapons'],requires:yes('world.site.station_records')}],
    archiveEntries:[{id:'log.field_notes',category:'research',title:'story.field.title',summary:'story.field.summary',body:['story.field.1','story.field.2'],requires:{fact:'story.field_notes',equals:true},durationMs:0,subtitles:[],media:null}]
  };
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  return freeze(data);
})();
