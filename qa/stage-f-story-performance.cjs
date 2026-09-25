// Isolated Stage F workload; run after the full regression and shared comparison.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
process.chdir(path.resolve(__dirname,'..'));process.env.LAST_BASE_ASSETS=process.cwd();process.env.LAST_BASE_TEST_LANGUAGE='ru';
const {setup}=require('./runtime.cjs'),r=setup('index.html',{}, {storyIntro:true}),E=s=>r.eval(s),stats=a=>{a.sort((a,b)=>a-b);return {samples:a.length,p50Ms:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)]};};
const rows=[],sample=(name,fn,n=600)=>{const times=[];for(let i=0;i<n+100;i++){const t=performance.now();fn(i);if(i>=100)times.push(performance.now()-t);}rows.push({name,...stats(times)});};
E("restoreGameProgress(GameNewGame.create());scene='bunker';player.x=1210;player.y=680;V09Power.running=true;V09Power.fuel=100;V010Energy.battery.charge=1;for(const d of Object.values(V09Power.devices))d.enabled=d.id===GameCampaign.powerId;");
sample('story_closed_tick',E('()=>StoryPlayer.tick(0)'));
const rafBefore=r.scheduler.rafRequests,intervalsBefore=r.scheduler.intervals.length;
E('StoryPlayer.startIntro();StoryPlayer.pause()');sample('intro_paused_tick',E('()=>StoryPlayer.tick(0)'));
E('StoryPlayer.pause()');sample('intro_playing_tick',E('n=>StoryPlayer.tick(n*10)'));
assert.equal(E('StoryPlayer.active'),true);E('StoryPlayer.skip()');
for(const [width,height]of [[1280,800],[390,844],[844,390]]){
 E(`innerWidth=${width};innerHeight=${height};CommandCoreUI.show('archive');CommandCoreUI.tick()`);
 const builds=E('GameArchiveUI.inspect().builds');sample('archive_idle_'+width+'x'+height,E('()=>CommandCoreUI.tick()'));
 assert.equal(E('GameArchiveUI.inspect().builds'),builds);
}
assert.equal(r.scheduler.rafRequests,rafBefore);assert.equal(r.scheduler.intervals.length,intervalsBefore);
const snapshot=E('JSON.stringify(captureGameProgress())'),story=E('JSON.stringify(GameStory.capture())');
sample('story_save_decode',E(`()=>decodeGameProgress(${JSON.stringify(snapshot)})`),60);
const report={version:'0.37.0',runtimeSha256:crypto.createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex'),rows,storyBytes:Buffer.byteLength(story),saveBytes:Buffer.byteLength(snapshot),additionalRafRequests:0,additionalIntervals:0,idleArchiveRebuilds:0,errors:r.errors,passed:!r.errors.length,limitations:['Modeled DOM; excludes native CSS layout, codecs and device GPU. No new media assets or decoders are shipped.']};fs.writeFileSync('qa/results/stage-f-story-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
