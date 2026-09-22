// Exact reviewed delta on top of immutable HUD Compact 1, not a blanket exemption.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const changes=require('./audio-source-reference.json').changes;
exports.assertSource=(file,expected)=>{
 const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),change=changes[file];
 if(change){assert.equal(expected,change.before,file+' stable input');assert.equal(actual,change.after,file+' reviewed audio delta');}
 else assert.equal(actual,expected,file);
};
