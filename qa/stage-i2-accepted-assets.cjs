// Current authoritative source is the user-uploaded Claude ZIP. Historical
// Stage F/G snapshots predate its accepted character/animation/icon changes.
exports.verify=()=>{
 const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
 for(const f of require('./stage-i2-source-reference.json').files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f.file)).digest('hex'),f.sha256,f.file);
};
