"""Package the checked Survival tree, without rebuilding or changing gameplay."""
from pathlib import Path
import json,hashlib,zipfile,shutil
root=Path(__file__).resolve().parents[1];out=root.parent/'deliverables-survival-0420';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
runtime=sha((root/'js/game.js').read_bytes());summary=json.loads((root/'qa/results/summary.json').read_text());target=json.loads((root/'qa/results/survival.json').read_text())
assert summary['runtimeSha256']==runtime and summary['runtimeUnchanged'] and not summary['filtered'] and len(summary['runs'])==79
assert all(r['runtimeSha256']==runtime for r in summary['runs'])
assert target['runtimeSha256']==runtime and target['failed']==0
inherited=json.loads((root/'qa/results/survival-inherited-baseline.json').read_text());allowed={r['id']:set(r['failingChecks']) for r in inherited['runs']}
actualFailures={r['id'] for r in summary['runs'] if r['exitCode']}
assert actualFailures<=set(allowed),actualFailures-set(allowed)
for name in actualFailures:
 result=json.loads((root/f'qa/results/{name}.json').read_text());failures={r['id'] for r in result['checks'] if r.get('status')=='FAIL'}
 assert failures==allowed[name],(name,failures,allowed[name])
ref=json.loads((root/'qa/survival-source-reference.json').read_text())
for f,h in ref['files'].items():assert sha((root/f).read_bytes())==h['after'],f
for f,h in ref['protectedHero'].items():assert sha((root/f).read_bytes())==h,f
for f,h in ref['baselineFiles'].items():
 if f.startswith('assets/') and f!='assets/manifest.json':assert sha((root/f).read_bytes())==h,f
manifestNow=json.loads((root/'assets/manifest.json').read_text())
for k,d in ref['baselineManifest']['images'].items():assert manifestNow['images'][k]==d,k
assert manifestNow['actors']==ref['baselineManifest']['actors']
files=sorted(p for p in root.rglob('*') if p.is_file() and not any(x in {'.git','node_modules','__pycache__'} for x in p.relative_to(root).parts) and p!=root/'release_manifest.json' and p.suffix not in {'.pyc','.zip'} and p.name!='.DS_Store')
manifest={'version':'0.42.0','saveFormat':23,'runtimeSha256':runtime,'baselineSha256':ref['inputZIPsha256'],'completeHistoricalGroups':79,'greenGroups':sum(r['exitCode']==0 for r in summary['runs']),'knownInheritedFailingGroups':sorted(actualFailures),'survivalChecks':target['passed'],'files':{p.relative_to(root).as_posix():{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}for p in files}}
mp=root/'release_manifest.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');files.append(mp)
zpath=out/'LAST_BASE_0.42.0_Survival_Stage_GitHub.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(zpath) as z:
 assert z.testzip() is None
 assert set(z.namelist())==set(manifest['files'])|{'release_manifest.json'}
 for p in files:
  n=p.relative_to(root).as_posix();b=z.read(n);assert b==p.read_bytes(),n
  if n in manifest['files']:assert sha(b)==manifest['files'][n]['sha256'],n
report=out/'LAST_BASE_0.42.0_SURVIVAL_REPORT_RU.md';shutil.copyfile(root/report.name,report)
proof={'version':'0.42.0','zip':zpath.name,'zipBytes':zpath.stat().st_size,'zipSHA256':sha(zpath.read_bytes()),'crc':'PASS','manifestEntries':len(manifest['files']),'zipEntries':len(files),'manifestHashCheck':'PASS','zipVsWorkingTree':'all included bytes identical','runtimeSHA256':runtime,'sourceBuildCheck':'PASS','protectedHeroFiles':len(ref['protectedHero']),'fullHistoricalGroups':79,'greenGroups':manifest['greenGroups'],'overallHistoricalSuitePassed':summary['passed'],'inheritedFailedChecks':sum(len(v)for v in allowed.values()),'knownInheritedFailingGroups':sorted(actualFailures),'survivalChecks':target['passed'],'nativeBrowserQA':False,'nextStageStarted':False}
proofpath=out/'LAST_BASE_0.42.0_VERIFICATION.json';proofpath.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
(out/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.name+'\n'for p in [zpath,report,proofpath]))
print(json.dumps(proof,ensure_ascii=False,indent=2))
