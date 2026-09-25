// Same source/runtime pair, modeled DOM timing only. Not CSS layout or mobile FPS.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
process.chdir(path.resolve(__dirname,'..'));process.env.LAST_BASE_ASSETS=process.cwd();const {setup}=require('./runtime.cjs');
const pair=[setup('qa/stage-f-base/index.html'),setup('index.html')];
const stats=a=>{const s=a.sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)]};};
const rows=[];
for(const [width,height]of [[1280,800],[390,844],[844,390]])for(const section of ['construction','base','chapters','research']){
 for(const r of pair)r.eval(`restoreGameProgress(GameNewGame.create());scene='bunker';player.x=1210;player.y=680;innerWidth=${width};innerHeight=${height};V09Power.running=true;V09Power.fuel=100;V010Energy.battery.charge=1;for(const d of Object.values(V09Power.devices))d.enabled=d.id===GameCampaign.powerId;I18n.setLanguage('ru');CommandCoreUI.show('${section}');`);
 const poll=pair.map(r=>r.eval('()=>CommandCoreUI.tick()')),times=[[],[]];
 const rendered=pair.map(r=>r.eval('GameResearchUI.metrics().renders'));
 for(let pass=0;pass<4;pass++)for(const i of pass%2?[1,0]:[0,1])for(let n=0;n<40;n++){const t=performance.now();poll[i]();if(n>=10)times[i].push(performance.now()-t);}
 const idleRenders=pair.map((r,i)=>r.eval('GameResearchUI.metrics().renders')-rendered[i]);assert.deepEqual(idleRenders,[0,0]);
 const before=stats(times[0]),after=stats(times[1]);rows.push({viewport:width+'x'+height,section,before,after,p50Percent:(after.p50Ms/before.p50Ms-1)*100,idleResearchRenders:idleRenders});
}
const report={version:require('../package.json').version,baseline:'immutable 0.36.1 Stage F',runtimeSha256:crypto.createHash('sha256').update(fs.readFileSync('js/game.js')).digest('hex'),rows,errors:pair.flatMap(r=>r.errors),limitations:['Modeled DOM timing; no actual CSS layout, browser GPU or phone FPS measured.','120 measured polls per version/case, warmed interleaved AB/BA on shared host.']};report.passed=!report.errors.length&&rows.length===12;fs.writeFileSync('qa/results/stage-f-ui-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
