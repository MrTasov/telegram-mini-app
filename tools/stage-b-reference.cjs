// Record a reviewable link from immutable 0.31.1 sources to this patch.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),baseline=require('../qa/stage-b-base/release_manifest.json'),changes={};
for(const f of baseline.files){if(!/^(src\/|styles\/|tools\/|js\/|assets\/|index.html$|package)/.test(f.file)||!fs.existsSync(f.file))continue;const after=sha(fs.readFileSync(f.file));if(after!==f.sha256)changes[f.file]={before:f.sha256,after};}
const result={baseline:'immutable 0.31.1 Stage A Corrective',baselineArchiveSha256:'5463aeae664c3804eefb6ad2e94b2432deb30f7c8131c09df945fefc63212430',baselineBundleSha256:sha(fs.readFileSync('qa/stage-b-base/js/game.js')),changes};
fs.writeFileSync('qa/stage-b-source-reference.json',JSON.stringify(result,null,2)+'\n');console.log('Recorded '+Object.keys(changes).length+' changed baseline source files.');
