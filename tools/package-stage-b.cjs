// Reproducible file inventory and GitHub-ready archive (no outer project folder).
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'..','deliverables'));
process.chdir(root);fs.mkdirSync(out,{recursive:true});
const summary=require('../qa/results/summary.json'),full=require('../qa/results/stage-b-full-run.json'),perf=require('../qa/results/stage-b-performance.json');
if(!summary.passed||!full.passed||perf.errors.length)throw Error('Release checks are not green');
const report='STAGE_B_REPORT_RU.md';if(!fs.existsSync(report))throw Error('Missing Stage B report');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function walk(dir=''){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(['node_modules','.git','.DS_Store','__pycache__'].includes(e.name))return [];const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+rel);return e.isDirectory()?walk(rel):[rel];});}
const baseline=require('../qa/stage-b-base/release_manifest.json'),before=new Map(baseline.files.map(f=>[f.file,f.sha256])),names=walk();
const changes=[],added=[];for(const name of names){if(['release_manifest.json','STAGE_B_CHANGESET.json'].includes(name))continue;const hash=sha(fs.readFileSync(name));if(!before.has(name))added.push({file:name,sha256:hash});else if(hash!==before.get(name))changes.push({file:name,before:before.get(name),after:hash});}
const removed=[...before.keys()].filter(f=>!fs.existsSync(f));if(removed.length)throw Error('Unexpected removals: '+removed.join(','));
fs.writeFileSync('STAGE_B_CHANGESET.json',JSON.stringify({version:'0.32.0',baseline:'0.31.1',changes,added,removed},null,2)+'\n');
const files=walk().filter(f=>f!=='release_manifest.json').map(file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};});
const manifest={version:'0.32.0',patch:'stage-b',reference:'LAST_BASE_0.31.1_Stage_A_Corrective_GitHub.zip',referenceSha256:'5463aeae664c3804eefb6ad2e94b2432deb30f7c8131c09df945fefc63212430',builtAt:new Date().toISOString(),saveVersion:7,layout:'R2',stageAStatus:'conditionally accepted for development; manual acceptance remains open',stageBImplemented:true,stageC1Started:false,buildingPlacementImplemented:false,finalChapter1Implemented:false,level2Implemented:false,manualAcceptance:'Stage A Corrective + Stage B pending joint user review',automatedGatePassed:true,automatedAssertions:summary.automatedAssertions,fullRegressionGroups:full.runs.length,fullRegressionPassed:full.passed,stageBChecks:require('../qa/results/stage-b.json').passed,performanceComparison:'qa/results/stage-b-performance.json',validationReport:'qa/results/summary.json',report,intentionalBehaviorChanges:['Loaded enhancement cradle requests 2 kW independently of local UI visibility.'],files};
fs.writeFileSync('release_manifest.json',JSON.stringify(manifest,null,2)+'\n');
const zip=path.join(out,'LAST_BASE_0.32.0_Stage_B_GitHub.zip');if(fs.existsSync(zip))throw Error('Refusing to overwrite an existing release archive');
cp.execFileSync('zip',['-q','-9',zip,'-@'],{cwd:root,input:walk().join('\n')+'\n',maxBuffer:1024*1024});
cp.execFileSync('unzip',['-tq',zip],{maxBuffer:1024*1024});
const result={zip,bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),files:files.length+1,report:path.join(out,'LAST_BASE_0.32.0_Stage_B_Report_RU.md')};
fs.copyFileSync(report,result.report);fs.writeFileSync(path.join(out,'LAST_BASE_0.32.0_Stage_B_ZIP_Check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
