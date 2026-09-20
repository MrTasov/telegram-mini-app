const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.chdir(path.resolve(__dirname,'..'));const {setup}=require('./runtime.cjs'),checks=[],captured=new Set();
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack?.slice(0,2000)});}}
async function main(){
 const r=setup('index.html',{}, {language:'en'}),E=s=>r.eval(s);
 await Promise.all(E('Object.values(AssetManifest.art).concat(Object.values(AssetManifest.walls)).map(id=>GameAssets.load(id))'));
 E(`window.paintTexts=[];window.localeFill=ctx.fillText;ctx.fillText=function(text,...args){paintTexts.push(String(text));return localeFill.call(this,text,...args)};`);
 const scenes=[['surfaceBase','surface',800,850],['bunkerFarm','bunker',1180,2000],['bunkerWorkshop','bunker',280,1020],['bunkerEnergy','bunker',1120,500],['bunkerLiving','bunker',1360,-280],['bunkerKitchen','bunker',280,-200],...E('V012Expansion.regions.map(r=>[r.id||r.name,"surface",r.x,r.y])')];
 for(const lang of ['en','ru'])for(const [w,h]of [[390,844],[844,390],[1280,800]])for(const [id,scene,x,y]of scenes){check(`canvas.${lang}.${w}x${h}.${id}`,()=>{
  E(`for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);I18n.setLanguage('${lang}');innerWidth=${w};innerHeight=${h};refreshViewport();scene='${scene}';player.x=${x};player.y=${y};V010Camera.restore({...V010Camera.capture(),zoom:1});V09Power.running=true;V09Power.fuel=80;paintTexts.length=0;updateCamera();draw();`);
  r.canvas.getContext('2d').getImageData(0,0,1,1);const text=E('paintTexts');assert.ok(text.length>0);for(const t of text){assert.ok(!/[\uE000-\uE005]/.test(t),t);if(lang==='en')assert.ok(!/[А-Яа-яЁё]/.test(t)||t.includes('Спутник'),t);captured.add(t);}
 });}
 check('map.customMarkerNotTranslated',()=>{E(`scene='surface';I18n.setLanguage('en');V010Camera.restore({...V010Camera.capture(),markers:[{name:'Камень',scene:'surface',x:800,y:850}]});V010Camera.showMap();window.mapText=[];window.mapCanvas=el('v010WorldMap').getContext('2d');window.mapFill=mapCanvas.fillText;mapCanvas.fillText=function(text,...a){mapText.push(String(text));return mapFill.call(this,text,...a)};V010Camera.drawFull();`);assert.ok(E('mapText.includes("Камень")'));assert.ok(!E('mapText.includes("Stone")'));});
 check('console.noErrors',()=>assert.deepEqual(r.errors,[]));
 const result={version:require('../package.json').version,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks,capturedText:[...captured].sort(),limitations:['Native Canvas rasterization at three modeled viewports, not browser screenshots.']};
 fs.writeFileSync('qa/results/localization-rendering.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL')}));if(result.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
