/* Story content is independent of item/research/instance identity. The official Intro is supplied by the user unchanged; no generated media. */
const StoryDefinitions=(()=>{
  const data={schema:1,revision:1,introId:'log.arrival',categories:['context','research'],
    facts:['story.context','story.core_visited','story.research_count','story.chapter_one_complete'],
    entries:[
      {id:'log.arrival',category:'context',title:'story.arrival.title',summary:'story.arrival.summary',body:['story.arrival.1','story.arrival.2','story.arrival.3','story.arrival.4'],
        requires:{fact:'story.context',equals:true},durationMs:21250,
        subtitles:[{startMs:0,endMs:4500,text:'story.arrival.1'},{startMs:4500,endMs:9000,text:'story.arrival.2'},{startMs:9000,endMs:13500,text:'story.arrival.3'},{startMs:13500,endMs:21250,text:'story.arrival.4'}],media:{kind:'video',assetId:'story/intro',alt:'story.arrival.title'}},
      {id:'log.core_restart',category:'context',title:'story.core.title',summary:'story.core.summary',body:['story.core.1','story.core.2'],requires:{fact:'story.core_visited',equals:true},durationMs:0,subtitles:[],media:null},
      {id:'log.research_01',category:'research',title:'story.research01.title',summary:'story.research01.summary',body:['story.research01.1','story.research01.2','story.research01.3'],requires:{fact:'story.research_count',atLeast:1},durationMs:0,subtitles:[],media:null},
      {id:'log.base_recovered',category:'context',title:'story.recovered.title',summary:'story.recovered.summary',body:['story.recovered.1','story.recovered.2'],requires:{fact:'story.chapter_one_complete',equals:true},durationMs:0,subtitles:[],media:null}
    ]};
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  return freeze(data);
})();
