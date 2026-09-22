// Historical source guards still check every file. For an explicitly reviewed
// HUD edit, verify BOTH the historical input and the exact approved output.
// This is not a whole-file exemption or a rewrite of historical fixtures.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const changes=require('./hud-source-reference.json').changes;
exports.assertSource=(file,expected)=>{
 const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),change=changes[file];
 if(change){assert.equal(expected,change.before,file+' historical reference');require('./audio-contract.cjs').assertSource(file,change.after);}
 else require('./audio-contract.cjs').assertSource(file,expected);
};
