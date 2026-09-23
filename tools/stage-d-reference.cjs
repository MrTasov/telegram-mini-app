// Record the fresh delta from the accepted C2 manifest. Frozen fixtures are immutable.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');const root=path.resolve(__dirname,'..');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const baseline=require('../qa/stage-d-base/release_manifest.json'),changes={};
for(const f of baseline.files){if(f.file.startsWith('qa/')&&/\/(?:stage\d|.*-base|.*-initial)\//.test(f.file)){if(hash(f.file)!==f.sha256)throw Error('Frozen fixture changed: '+f.file);continue;}if(fs.existsSync(path.join(root,f.file))){const after=hash(f.file);if(after!==f.sha256)changes[f.file]={before:f.sha256,after};}}
const report={baselineArchive:'LAST_BASE_0.34.0_Stage_C2_GitHub.zip',baselineArchiveSha256:'11a1742cf3887b29036f7a9d3168942bf86829db9c1fdee9c32bbb1a49cb2b60',baselineBundleSha256:baseline.files.find(r=>r.file==='js/game.js').sha256,changes};fs.writeFileSync(path.join(root,'qa/stage-d-source-reference.json'),JSON.stringify(report,null,2)+'\n');
