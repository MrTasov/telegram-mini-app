// Paired frozen scenes: native Canvas + modeled WebAudio. Not phone FPS.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');process.chdir(root);process.env.LAST_BASE_ASSETS=root;
const {boot}=require('./audio-harness.cjs');
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:s.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((n,v)=>n+v,0)/s.length};};
(async()=>{
 const before=boot(path.join(__dirname,'pre-audio')),after=boot(root),pair=[before,after];
 // Reference paths are physically in the candidate asset tree, byte-identical.
 before.r.context.fetch=async url=>{before.meter.requests.push(url);const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 for(const h of pair){await h.load();await h.E('Promise.all(Object.entries(AssetManifest.images).filter(([,d])=>!d.historical).map(([id])=>GameAssets.load(id)))');h.E("scene='surface';menuOpen=false;playerDead=false;stopControls(true);player.x=800;player.y=850;V010Camera.restore({...V010Camera.capture(),zoom:.8});V016Lighting.restore({schema:1,day:17,minute:759});V013Inventory.equip('rifle_ak74');zombies=[];frameScale=1;updateCamera();");}
 const saved=pair.map(h=>h.E('JSON.stringify(captureGameProgress())'));
 const scenes=[];
 for(const name of ['quiet_surface','100_zombies_100_corpses','working_bunker']){
  for(const [i,h]of pair.entries()){
   h.E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(saved[i])}));frameScale=1;`);
   if(name==='100_zombies_100_corpses')h.E("zombies=[];for(let i=0;i<200;i++){const z=makeZombie(560+i%16*30,620+Math.floor(i/16)*26);z.type=['normal','fast','heavy','leaper','bloater'][i%5];V017Monsters.prepare(z);if(i>=100){z.alive=false;z.health=0;z.deathTime=performance.now()-2000;z.corpseAt011=Date.now()-2000;}zombies.push(z);}");
   if(name==='working_bunker')h.E("scene='bunker';player.x=600;player.y=780;V09Power.running=true;V09Power.fuel=100;addItem('stone',100);V09Craft.start('furnace','concrete',10);Object.assign(V014Robots.state,{scene:'bunker',x:580,y:780,packed:false,hp:100,battery:100,task:'follow'});");
   h.E('updateCamera();');
  }
  const measures=[[],[]],draws=pair.map(h=>h.E('()=>{window.GameAudioWorld?.tick();draw();}'));
  for(let pass=0;pass<6;pass++)for(const index of (pass%2?[1,0]:[0,1])){
   const h=pair[index];for(let i=0;i<50;i++){h.advance(16.667);const start=performance.now();draws[index]();h.r.canvas.getContext('2d').getImageData(0,0,1,1);if(i>=20)measures[index].push(performance.now()-start);}
  }
  const b=stats(measures[0]),a=stats(measures[1]);scenes.push({name,before:b,after:a,medianDeltaMs:a.p50Ms-b.p50Ms});
 }
 const observation=[];for(let i=0;i<400;i++){after.advance(101);const start=performance.now();after.E('GameAudioWorld.tick()');observation.push(performance.now()-start);}
 const audio=require('../assets/manifest.json').audio;
 const pcm=(catalog)=>Object.values(catalog).reduce((n,d)=>{const b=fs.readFileSync(d.path);return n+(b.length-44)/2/b.readUInt32LE(24)*48000*4;},0);
 const oldAudio={footsteps:{path:'assets/audio/effects/footstep_soft_floor.wav'},chopWood:{path:'assets/audio/effects/chop_wood.wav'},mineRock:{path:'assets/audio/effects/mine_rock.wav'}};
 const report={patch:'audio-pass-recovered-1',environment:{node:process.version,cpu:os.cpus()[0]?.model,viewport:{width:390,height:844,dpr:1,zoom:.8},mode:'Alternating paired warmed native Canvas; modeled DOM and WebAudio'},scenes,observer:stats(observation),audio:{clips:Object.keys(audio).length,bytes:Object.values(audio).reduce((n,d)=>n+fs.statSync(d.path).size,0),estimatedDecodedBytes48kBefore:pcm(oldAudio),estimatedDecodedBytes48kAfter:pcm(audio),meter:after.J('GameAudio.inspect()')},errors:pair.flatMap(h=>h.r.errors),limitations:['Not real device FPS; WebAudio decoder/mixer CPU is not measured. Shared-host p95 includes scheduling variance.','Simulation frozen identically to isolate rendering and audio observer overhead. Real phone/PC listening remains manual.']};
 fs.writeFileSync('qa/results/audio-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
