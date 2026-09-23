// Append the approved 0.32.1 correction to the historical source hash chain.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),base=require('../qa/stage-ab-base/release_manifest.json'),changes={};
for(const f of base.files){if(!/^(src\/|styles\/|tools\/|js\/|assets\/|locales\/|index.html$|package)/.test(f.file))continue;const after=fs.existsSync(f.file)?sha(fs.readFileSync(f.file)):null;if(after!==f.sha256)changes[f.file]={before:f.sha256,after};}
fs.writeFileSync('qa/stage-ab-source-reference.json',JSON.stringify({baseline:'immutable delivered 0.32.0 Stage B',baselineArchiveSha256:'02571f47a11d32c0f31b8411de83a0e78993b28bfacbff9a81484fa6ffe19b11',baselineBundleSha256:sha(fs.readFileSync('qa/stage-ab-base/js/game.js')),changes},null,2)+'\n');
console.log('Recorded '+Object.keys(changes).length+' corrective source changes.');
