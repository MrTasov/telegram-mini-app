// Stage 5 integration checks: real UI builders, save owners and Canvas output.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.chdir(path.resolve(__dirname,'..'));const {setup}=require('./runtime.cjs'),checks=[],coverage=[];
const copy=v=>JSON.parse(JSON.stringify(v)),clean=require('./world-farm-contract.cjs').project;
function check(id,fn){try{fn();checks.push({id,status:'PASS'});}catch(e){checks.push({id,status:'FAIL',error:e.stack?.slice(0,2500)});}}
const r=setup('index.html',{}, {language:'en'}),E=s=>r.eval(s),fresh=E('JSON.stringify(captureGameProgress())');
const catalog=require('../tools/locales.cjs').validate();
check('boot.htmlCommentsPreserved',()=>{const nodes=[];const walk=n=>{if(n.nodeType===8)nodes.push(n);for(const c of n.childNodes||[])walk(c);};walk(r.doc);assert.ok(nodes.length>=5);assert.equal(typeof nodes[0].getAttribute,'undefined');assert.ok(E('GameState.session.ready'));assert.ok(r.canvas.width>0);});
check('dom.commentDocumentFragmentAndLanguageSwitch',()=>{const comment=r.doc.createComment('Камень');const box=r.doc.createElement('div');box.append(comment,'Камень');r.doc.body.append(box);for(const lang of ['ru','en','ru','en']){E(`I18n.setLanguage('${lang}')`);assert.equal(comment.nodeValue,'Камень');assert.equal(box.textContent,lang==='ru'?'Камень':'Stone');}E('I18n.localize(document);I18n.localize({nodeType:10});I18n.localize({nodeType:11,childNodes:[{nodeType:8,nodeValue:"comment"}]});draw();');box.remove();});

check('catalog.validAndPaired',()=>assert.deepEqual(catalog.manifest.locales.map(l=>l.id),['en','ru']));
for(const lang of ['en','ru']){
 E(`I18n.setLanguage('${lang}')`);
 for(const key of Object.keys(catalog.catalogs.en))check(`catalog.${lang}.${key}`,()=>{const value=E(`I18n.t(${JSON.stringify(key)},{count:5,name:'Player',time:'12:00',version:'0.25.0',value:'Sample'})`);assert.ok(value&&value!==key);assert.ok(!/[\uE000-\uE005]/.test(value));if(lang==='en')assert.ok(!/[А-Яа-яЁё]/.test(value),value);});
}
function reset(lang='en'){E(`restoreGameProgress(decodeGameProgress(${JSON.stringify(fresh)}));for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);el('fade').classList.remove('show');playerDead=false;document.hidden=false;scene='bunker';player.x=1264;player.y=740;stopControls(true);I18n.setLanguage('${lang}');`);}
function scan(node,out=[]){
 if(node.nodeType===1&&(/^(SCRIPT|STYLE|TEXTAREA)$/.test(node.tagName)||node.getAttribute('data-i18n-skip')!==null))return out;
 if(node.nodeType===3){const value=node.nodeValue;
  // Save names and the drone name are player data, including historical defaults.
  const parent=node.parentNode;if(/[А-Яа-яЁё]/.test(value)&&!/^Сохранение \d+$/.test(value)&&value!=='Спутник'&&!parent?.closest('#saveStatus'))out.push({text:value,id:parent?.id});
  if(/[\uE000-\uE005]/.test(value))out.push({token:value});
 }
 if(node.nodeType===1)for(const name of ['title','placeholder','aria-label','alt']){const value=node.getAttribute(name);if(value&&/[А-Яа-яЁё]|[\uE000-\uE005]/.test(value))out.push({attribute:name,text:value,id:node.id});}
 for(const child of node.childNodes||[])scan(child,out);return out;
}
function englishUI(id,code){check('ui.en.'+id,()=>{reset();E(code);const missing=scan(r.doc);assert.deepEqual(missing,[]);coverage.push(id);});}
englishUI('startup','');
for(const mode of ['PC','MOBILE'])englishUI('settings.'+mode,`GameInput.setMode('${mode}');openOverlay(el('settingsOverlay'));`);
englishUI('inventory','renderBag();openOverlay(el("inventoryOverlay"));');
englishUI('quickPicker','V0162Quick.open(4);');
englishUI('equipment','V091Equipment.render();');
englishUI('map','V010Camera.showMap();V012Map.setOptions(true);');
englishUI('history','V0105.showHistory();');
englishUI('difficulty','V010World.showDifficulty();');
englishUI('drone','V014Robots.open();');
englishUI('droneStation','V0151Station.open();');
englishUI('powerRemote','v09OpenPowerRemote();');
englishUI('generator','v09OpenGenerator();');
englishUI('fuelTank','v09OpenGenerator(true);');
englishUI('battery','V010Energy.open();');
englishUI('watering','V011Farm.openWater();');
englishUI('animals','openCowMenu();');
englishUI('feed','openFeedCraftMenu();showFeedGrainRecipe();');
englishUI('upgradeStation','V0161Upgrade.open();');
englishUI('saveSlots','V09Saves.open();');
for(let i=0;i<14;i++)englishUI('storage.'+i,`openStorage(${i});`);
for(let i=0;i<10;i++)englishUI('farm.'+i,`player.x=getFarmBeds()[0].x+20;player.y=getFarmBeds()[0].y+20;V0141Farm.use(0);document.querySelector('[data-crop="${i}"]').click();`);
for(const tab of ['achievements','stats','research','orders','journal'])englishUI('progression.'+tab,`V010Progression.show('${tab}');`);
for(const station of ['furnace','craft_bench','feed_craft']){
 englishUI('craft.'+station,`V09Craft.open('${station}');`);
 const recipes=E(`Object.entries(V09Craft.recipes).filter(([,r])=>r.station==='${station}'&&!r.retiredBuildable).map(([id])=>id)`);
 for(const id of recipes)englishUI('recipe.'+id,`V09Craft.open('${station}');document.querySelector('[data-recipe="${id}"]').click();`);
}
for(const type of E('Object.keys(ITEM)'))check('ui.en.item.'+type,()=>{reset();const node=r.doc.createElement('div');r.doc.body.append(node);r.context.itemCard=node;E(`I18n.assign(itemCard,'innerHTML',V011UI.cardHTML({type:${JSON.stringify(type)},qty:1,level:0}));`);assert.deepEqual(scan(node),[]);node.remove();});
check('ui.hotSwitch.preservesNodesInputsListenersAndPayload',()=>{
 reset();E('openOverlay(el("inventoryOverlay"));V0162Quick.open(4);openOverlay(el("settingsOverlay"));');
 const picker=r.doc.getElementById('v0162QuickPicker'),select=r.doc.getElementById('languageSelect'),input=r.doc.getElementById('v010MarkerName');input.value='Моя база';
 const before=E('JSON.stringify(captureGameProgress())'),listeners=r.listenerCounts(),options=select.children.slice(),buttons=r.doc.querySelectorAll('button');
 for(let i=0;i<30;i++){select.value=i%2?'en':'ru';r.emit('change',select);assert.equal(E('I18n.language'),select.value);assert.equal(input.value,'Моя база');assert.equal(r.doc.getElementById('v0162QuickPicker'),picker);assert.deepEqual(select.children,options);assert.deepEqual(r.doc.querySelectorAll('button'),buttons);}
 assert.equal(E('JSON.stringify(captureGameProgress())'),before);assert.deepEqual(r.listenerCounts(),listeners);assert.equal(r.storage.get('last_base_language_v1'),'en');assert.deepEqual(scan(r.doc),[]);
});
check('language.savedOutsideGameplay',()=>{reset();const before=E('JSON.stringify(captureGameProgress())');E('I18n.setLanguage("ru")');assert.equal(E('JSON.stringify(captureGameProgress())'),before);const again=setup('index.html',Object.fromEntries(r.storage));assert.equal(again.eval('I18n.language'),'ru');assert.ok(!Object.hasOwn(E('captureGameProgress()'),'language'));});
check('language.defaultAndInvalid',()=>{assert.equal(setup('index.html',{}, {language:null}).eval('I18n.language'),'en');for(const value of ['en','invalid','__proto__']){const x=setup('index.html',{'last_base_language_v1':value});assert.equal(x.eval('I18n.language'),'en');assert.equal(x.eval('I18n.setLanguage("invalid")'),false);}});
check('language.storageDeniedNonfatal',()=>{reset();const before=E('JSON.stringify(captureGameProgress())');E('window.savedSetItem=localStorage.setItem;localStorage.setItem=()=>{throw Error("denied")};I18n.setLanguage("ru");');assert.equal(E('I18n.language'),'ru');assert.equal(E('JSON.stringify(captureGameProgress())'),before);E('localStorage.setItem=savedSetItem;I18n.setLanguage("en");');});
check('keys.fallbackAndParamsAreVerbatim',()=>{E('I18n.setLanguage("ru");window.savedTranslation=LocaleCatalog.catalogs.ru["settings.language"];delete LocaleCatalog.catalogs.ru["settings.language"];');assert.equal(E('I18n.t("settings.language")'),'LANGUAGE');E('LocaleCatalog.catalogs.ru["settings.language"]=savedTranslation;I18n.setLanguage("en")');assert.equal(E('I18n.t("missing.future.key")'),'missing.future.key');assert.equal(E('I18n.text(I18n.message("save.success",{name:"Камень"}))'),'💾 Saved: Камень.');assert.equal(E('I18n.text(I18n.verbatim("Fire Камень"))'),'Fire Камень');});
check('keys.pluralsNumbersAndLiveNumberUpdate',()=>{const n=r.doc.createElement('span');r.doc.body.append(n);r.context.numberNode=n;E('I18n.setLanguage("en");I18n.assign(numberNode,"textContent",I18n.numeric(1.5,{minimumFractionDigits:1}));');assert.equal(n.textContent,'1.5');assert.equal(E('I18n.t("items.count",{count:1})'),'1 item');assert.equal(E('I18n.t("items.count",{count:5})'),'5 items');E('I18n.setLanguage("ru")');assert.equal(n.textContent,'1,5');for(const [v,w]of [[1,'предмет'],[2,'предмета'],[5,'предметов']])assert.equal(E(`I18n.t('items.count',{count:${v}})`),v+' '+w);n.remove();E('I18n.setLanguage("en")');});
check('keys.technicalNamesStable',()=>{for(const lang of ['en','ru']){E(`I18n.setLanguage('${lang}')`);assert.equal(E('I18n.text("АК-74")'),'AK-74');for(const name of ['LAST BASE','M4','Glock 17','Desert Eagle','MP5','UMP45','AKM','SKS','Win94','SCAR-H','M14','XM1014','9×19mm','.50 AE','.45 ACP','5.56×45mm'])assert.equal(E(`I18n.text(${JSON.stringify(name)})`),name);}});
check('names.crateSaveMarkerDroneArePreserved',()=>{reset();E('storageChests[0].name="Камень";V014Robots.state.name="Камень";GameState.session.name="Камень";openStorage(0);V09Saves.open();V0151Station.open();V010Camera.restore({...V010Camera.capture(),markers:[{scene:"surface",x:800,y:850,name:"Камень"}]});');for(const lang of ['ru','en']){E(`I18n.setLanguage('${lang}');saveGameProgress(true);`);assert.ok(r.doc.getElementById('storageTitle').textContent.includes('Камень'));assert.equal(E('captureGameProgress().saveName'),'Камень');assert.equal(E('V010Camera.capture().markers[0].name'),'Камень');assert.equal(E('V014Robots.state.name'),'Камень');assert.ok(!/[\uE000-\uE005]/.test(E('JSON.stringify(captureGameProgress())')));}});
check('cache.bounded',()=>{for(let i=0;i<1300;i++)E(`I18n.text('Рюкзак · ${i}')`);assert.ok(E('I18n.cacheSize')<=1024);});
// Full serialized payload comparisons against the fixed Stage 4 runtime.
const base=setup('qa/stage4-fixed/index.html'),candidate=setup('index.html',{}, {language:'en'});
check('payload.freshGame',()=>assert.deepEqual(clean(candidate.eval('captureGameProgress()'),{fresh:true}),clean(base.eval('captureGameProgress()'),{fresh:true})));
for(const stage of ['stage0','stage1','stage2'])for(const file of fs.readdirSync('qa/'+stage+'/fixtures').filter(f=>f.endsWith('.json')&&f!=='index.json')){
 const raw=require('./event-test-contract.cjs').raidFixture(fs.readFileSync('qa/'+stage+'/fixtures/'+file,'utf8'));
 for(const language of ['en','ru'])check(`payload.${language}.${stage}.${file}`,()=>{candidate.eval(`I18n.setLanguage('${language}')`);for(const x of [base,candidate])x.eval(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}))`);assert.deepEqual(clean(candidate.eval('captureGameProgress()')),clean(base.eval('captureGameProgress()')));const round=candidate.eval('JSON.stringify(captureGameProgress())');candidate.eval(`restoreGameProgress(decodeGameProgress(${JSON.stringify(round)}))`);assert.deepEqual(clean(candidate.eval('captureGameProgress()')),clean(base.eval('captureGameProgress()')));});
}
check('console.noErrors',()=>{assert.deepEqual(r.errors,[]);assert.deepEqual(base.errors,[]);assert.deepEqual(candidate.errors,[]);});
const result={version:require('../package.json').version,reference:'0.24.1 fixed Stage 4',languages:['en','ru'],catalogKeys:Object.keys(catalog.catalogs.en).length,uiCoverage:coverage,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,checks,limitations:['Modeled DOM and native Canvas2D; physical phone/browser layout needs manual review.']};fs.writeFileSync('qa/results/localization.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,failures:checks.filter(c=>c.status==='FAIL')}));if(result.failed)process.exitCode=1;
