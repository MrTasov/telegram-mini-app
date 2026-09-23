// Link each changed source to the immutable, accepted R2 input and reviewed A output.
// Historical source fixtures and their hashes remain unchanged.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
exports.assertSource=(file,expected)=>{
 const refs=require('./campaign-source-reference.json'),change=refs.changes[file];
 const current=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const corrective=require('./stage-ab-source-reference.json').changes[file];
 if(corrective)assert.equal(current,corrective.after,file+' A/B corrective output');
 const actual=corrective?corrective.before:current;
 const stageB=require('./stage-b-source-reference.json').changes[file];
 if(stageB)assert.equal(actual,stageB.after,file+' Stage B output');
 const correctiveOutput=stageB?stageB.before:actual;
 const correction=require('./stage-a-corrective-source-reference.json').changes[file];
 if(correction)assert.equal(correctiveOutput,correction.after,file+' corrective output');
 const stageA=correction?correction.before:correctiveOutput;
 if(change){assert.equal(expected,change.before,file+' accepted R2 input');assert.equal(stageA,change.after,file+' delivered Stage A input');}
 else assert.equal(stageA,expected,file);
};
