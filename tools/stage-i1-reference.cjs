const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),baseline=require('../qa/stage-i1-base/release_manifest.json');
if(hash(fs.readFileSync('qa/stage-i1-base/js/game.js'))!=='05deb52e31b631278e2f861da8e57b13a99cf9679a326c9f7db9b6dd429628b7')throw Error('Wrong 0.39.0 reference');
const old=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes={},added={};
function file(name){const after=hash(fs.readFileSync(name)),before=old.get(name);if(!before)added[name]={after};else if(before!==after)changes[name]={before,after};}
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,e.name);if(e.isDirectory())visit(name);else file(name);}}
for(const dir of ['src','styles','locales'])visit(dir);for(const name of ['index.html','dev.html','package.json'])file(name);
fs.writeFileSync('qa/stage-i1-source-reference.json',JSON.stringify({baseline:'0.39.0 Stage H',changes,added},null,2)+'\n');console.log('Stage I1 delta: '+Object.keys(changes).length+' changed, '+Object.keys(added).length+' added');
