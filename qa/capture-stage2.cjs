// Produce control saves by executing the preserved, manually accepted 0.22.0.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);const {setup}=require('./runtime.cjs');
const r=setup('qa/stage2/index.html'),dir=path.join(__dirname,'stage2/fixtures');fs.mkdirSync(dir,{recursive:true});
const entries=[];
for(const file of fs.readdirSync('qa/stage1/fixtures').filter(n=>n.endsWith('.json')&&n!=='index.json')){
 const raw=fs.readFileSync('qa/stage1/fixtures/'+file,'utf8');r.eval(`restoreGameProgress(decodeGameProgress(${JSON.stringify(raw)}));`);
 const save=r.eval('JSON.stringify(captureGameProgress(),null,2)')+'\n';fs.writeFileSync(path.join(dir,file),save);entries.push({file,sha256:crypto.createHash('sha256').update(save).digest('hex')});
}
fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({reference:'0.22.0',fixtures:entries},null,2)+'\n');console.log(entries.length+' accepted Stage 2 saves captured');
