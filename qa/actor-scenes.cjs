const fs=require('fs'),path=require('path');process.chdir(path.resolve(__dirname,'..'));const {setup}=require('./runtime.cjs');
async function main(){for(const mode of ['PC','MOBILE']){
 const r=setup('index.html',{},mode==='MOBILE'?{width:390,height:844,maxTouchPoints:5}:{}),E=s=>r.eval(s);
 await E('Promise.all(Object.keys(AssetManifest.images).filter(id=>!id.startsWith("historical/")).map(id=>GameAssets.load(id)))');
 E(`GameInput.setMode('${mode}');scene='surface';player.x=800;player.y=850;menuOpen=false;playerDead=false;handSlots=['rifle_ak74',null,null,null];activeHandSlot=0;contextHand=null;player.moving=true;player.walkAnimation=2;player.aimX=1;player.aimY=.2;V016Lighting.restore({schema:1,day:1,minute:840});V010Camera.restore({...V010Camera.capture(),zoom:.8});draw();`);
 fs.writeFileSync(`qa/results/character-visuals/game-${mode.toLowerCase()}.png`,r.canvas.toBuffer('image/png'));
 E(`scene='bunker';player.x=1210;player.y=-115;movePower=0;navigation=null;V014Controls.stopRoute();V011Living.start('rest');V09Power.running=true;V09Power.fuel=80;V010Camera.restore({...V010Camera.capture(),zoom:1.1});draw();`);
 fs.writeFileSync(`qa/results/character-visuals/sleep-${mode.toLowerCase()}.png`,r.canvas.toBuffer('image/png'));console.log(mode,r.errors);
 }}main().catch(e=>{console.error(e);process.exitCode=1});
