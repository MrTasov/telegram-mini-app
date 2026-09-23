// Link each changed source to the immutable, accepted R2 input and reviewed A output.
// Historical source fixtures and their hashes remain unchanged.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
exports.assertSource=(file,expected)=>{
 const refs=require('./campaign-source-reference.json'),change=refs.changes[file];
 const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 if(change){assert.equal(expected,change.before,file+' accepted R2 input');assert.equal(actual,change.after,file+' reviewed Stage A output');}
 else assert.equal(actual,expected,file);
};
