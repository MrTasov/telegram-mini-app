const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),baseline=require('../qa/stage-g-base/release_manifest.json');
if(hash(fs.readFileSync('qa/stage-g-base/js/game.js'))!=='f150417f1d5fa1899eb91fd2a2575d180848cd0322bcc41676f8306b27aee952')throw Error('Wrong 0.37.1 reference');
const old=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes={},added={};
function file(name){const after=hash(fs.readFileSync(name)),before=old.get(name);if(!before)added[name]={after};else if(before!==after)changes[name]={before,after};}
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,e.name);if(e.isDirectory())visit(name);else file(name);}}
for(const dir of ['src','styles','locales'])visit(dir);for(const name of ['index.html','dev.html','package.json'])file(name);
fs.writeFileSync('qa/stage-g-source-reference.json',JSON.stringify({baseline:'0.37.1 Stage F Final',changes,added},null,2)+'\n');console.log('Stage G delta: '+Object.keys(changes).length+' changed, '+Object.keys(added).length+' added');
