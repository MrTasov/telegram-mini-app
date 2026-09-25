const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),baseline=require('../qa/stage-f-final-base/release_manifest.json');
if(hash(fs.readFileSync('qa/stage-f-final-base/js/game.js'))!=='201bbd5da6ac2cb7f33528b804f95477ecffe8ea68a7e201204b3d37cbe95a4d')throw Error('Wrong 0.37.0 reference');
const old=new Map(baseline.files.map(f=>[f.file,f.sha256])),changes={},added={};
function file(name){const after=hash(fs.readFileSync(name)),before=old.get(name);if(!before)added[name]={after};else if(before!==after)changes[name]={before,after};}
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,e.name);if(e.isDirectory())visit(name);else file(name);}}
for(const dir of ['src','styles','locales'])visit(dir);for(const name of ['index.html','dev.html','package.json'])file(name);
fs.writeFileSync('qa/stage-f-final-source-reference.json',JSON.stringify({baseline:'0.37.0 Stage F',changes,added},null,2)+'\n');console.log('Stage F Final delta: '+Object.keys(changes).length+' changed, '+Object.keys(added).length+' added');
