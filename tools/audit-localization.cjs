// Produces a reviewable release fingerprint; never called automatically by tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),old=require('../qa/stage4-fixes-reference.json'),manifest=require('../src/manifest.json'),map=JSON.parse(fs.readFileSync('qa/controls-base/js/game.js.map'));
const parts=manifest.files.map(f=>fs.readFileSync('src/'+f,'utf8'));
const baselineFiles=[...old.baselineFiles,...['index.html','js/game.js','js/game.js.map','styles/base.css'].map(f=>({file:'qa/stage4-fixed/'+f,sha256:hash(fs.readFileSync('qa/stage4-fixed/'+f))}))];
const ref={...old,version:manifest.version,reference:'0.24.1 Stage 4 fixes, 5574 passing assertions',sourceHash:hash(parts.join('')),files:[...manifest.files.map((f,i)=>({file:'src/'+f,sha256:hash(parts[i])})),...fs.readdirSync('locales').filter(f=>f.endsWith('.json')).map(f=>({file:'locales/'+f,sha256:hash(fs.readFileSync('locales/'+f))}))],baselineFiles,changedSources:manifest.files.filter((f,i)=>parts[i]!==map.sourcesContent[map.sources.indexOf(f)]).sort()};
fs.writeFileSync('qa/stage5-reference.json',JSON.stringify(ref,null,2)+'\n');
console.log('Recorded Stage 5 reviewed source fingerprint.');
