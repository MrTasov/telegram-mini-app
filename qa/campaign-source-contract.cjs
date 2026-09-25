// Link each changed source to the immutable, accepted R2 input and reviewed A output.
// Historical source fixtures and their hashes remain unchanged.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
exports.assertSource=(file,expected)=>{
 const refs=require('./campaign-source-reference.json'),change=refs.changes[file];
 let current=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const stageF=require('./stage-f-source-reference.json').changes[file];if(stageF){assert.equal(current,stageF.after,file+' Stage F output');current=stageF.before;}
 const correctionE=require('./stage-e-corrective-source-reference.json').changes[file];if(correctionE){assert.equal(current,correctionE.after,file+' Stage E corrective output');current=correctionE.before;}
 const stageE=require('./stage-e-source-reference.json').changes[file];if(stageE){assert.equal(current,stageE.after,file+' Stage E output');current=stageE.before;}
 const completeD=require('./stage-d-complete-source-reference.json').changes[file];if(completeD){assert.equal(current,completeD.after,file+' Stage D complete corrective output');current=completeD.before;}
 const correctiveD=require('./stage-d-corrective-source-reference.json').changes[file];if(correctiveD){assert.equal(current,correctiveD.after,file+' Stage D corrective output');current=correctiveD.before;}
 const stageD=require('./stage-d-source-reference.json').changes[file];if(stageD){assert.equal(current,stageD.after,file+' fresh Stage D output');current=stageD.before;}
 const c2=require('./stage-c2-source-reference.json').changes[file];if(c2){assert.equal(current,c2.after,file+' C2 output');current=c2.before;}
 const c1=require('./stage-c1-source-reference.json').changes[file];if(c1){assert.equal(current,c1.after,file+' C1 output');current=c1.before;}
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
