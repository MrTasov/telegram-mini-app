// Reuse all accepted controls/interactions assertions in the English interface.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),root=path.resolve(__dirname,'..');process.chdir(root);
const specs=[['controls','qa/controls.cjs',['qa/results/controls-en.json']],['map-workbar','qa/map-workbar.cjs',['qa/results/map-workbar-en.json']],['interactions','qa/interactions.cjs',['index.html','qa/results/interactions-en.json']]],runs=[],checks=[];
for(const [id,file,args]of specs){const result=cp.spawnSync(process.execPath,[file,...args],{cwd:root,env:{...process.env,LAST_BASE_TEST_LANGUAGE:'en'},encoding:'utf8',timeout:180000,maxBuffer:4e6});
 fs.writeFileSync('qa/results/'+id+'-en.log',result.stdout+'\n'+result.stderr);
 const report=JSON.parse(fs.readFileSync('qa/results/'+id+'-en.json'));runs.push({id,exitCode:result.status,passed:report.passed,failed:report.failed});for(const check of report.checks)checks.push({...check,id:id+'.en.'+check.id});
}
const result={version:require('../package.json').version,passed:runs.reduce((n,r)=>n+r.passed,0),failed:runs.reduce((n,r)=>n+r.failed+(r.exitCode&&!r.failed?1:0),0),runs,checks};fs.writeFileSync('qa/results/localization-controls.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed,runs}));if(result.failed)process.exitCode=1;
