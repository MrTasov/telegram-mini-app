// Current authoritative source is the user-uploaded Claude ZIP. Historical
// Stage F/G snapshots predate its accepted character/animation/icon changes.
exports.verify=()=>{
 const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
 for(const f of require('./stage-i2-source-reference.json').files)require('./campaign-source-contract.cjs').assertSource(f.file,f.sha256);
};
