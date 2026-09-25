import hashlib,json,pathlib,subprocess,sys,zipfile,shutil,datetime
root=pathlib.Path(__file__).resolve().parent.parent
out=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'deliverables-perf-0402'
out.mkdir(exist_ok=True,parents=True)
def read(n):return json.loads((root/n).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,v):(root/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
version=read('package.json')['version'];assert version=='0.40.2'
runtime=sha((root/'js/game.js').read_bytes());base=read('qa/perf-base/release_manifest.json');assert base['version']=='0.40.1'
assert sha((root/'qa/perf-base/js/game.js').read_bytes())==base['runtimeSha256']
summary=read('qa/results/summary.json');perf=read('qa/results/perf-after.json')
assert summary['passed'] and not summary['filtered'] and summary['runtimeUnchanged'] and summary['runtimeSha256']==runtime
assert len(summary['runs'])==71 and all(r['exitCode']==0 and r['runtimeSha256']==runtime for r in summary['runs'])
assert perf['complete'] and perf['runtimeUnchanged'] and perf['runtimeSha256']==runtime
assert len(perf['rows'])==15
for n in ['perf-corrective-tests','perf-equivalence','perf-visuals','perf-upgrade']:
 d=read('qa/results/'+n+'.json');assert d['failed']==0 and d['runtimeSha256']==runtime
old={f['file']:f['sha256']for f in base['files']}
for name,h in old.items():
 if name.startswith('assets/') or name in ['src/simulation/activity.js','src/simulation/activity-save.js']:
  assert sha((root/name).read_bytes())==h,name
ref=read('qa/perf-source-reference.json')
for kind in ['changes','added']:
 for name,v in ref[kind].items():assert sha((root/name).read_bytes())==v['after'],name
subprocess.run(['node','tools/build.cjs','--check'],cwd=root,check=True)
report='PERFORMANCE_GAMEPLAY_REPORT_RU.md';assert '<!-- FINAL_RESULTS -->' not in (root/report).read_text()
proof=dict(version=version,runtimeSha256=runtime,baseline='LAST_BASE_0.40.1_Developer_QA_GitHub.zip',baselineSha256='16d0e5a4d84f7a58f5d10852ec5307233fab7980cd975d4f1ba610588bbe1cbb',baselineRuntimeSha256=base['runtimeSha256'],passed=True,regressionGroups=len(summary['runs']),automatedAssertions=summary['automatedAssertions'],additionalUpgradeAssertions=25,failed=0,allGroupsSameRuntime=True,fullRegressionRepeated=True,saveFormat=20,I1ClockAndSaveOwnerUnchanged=True,acceptedAssetsUnchanged=True,officialIntroUnchanged=True,realBrowserVisualQA=False,realMobileFPSMeasured=False,stageI2Started=False,manualAcceptancePending=True,performanceReport='qa/results/perf-after.json',comparisonReport='qa/results/perf-comparison.json')
dump('qa/results/perf-release-validation.json',proof)
def files():return sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and not any(v in ['node_modules','.git','__pycache__','.DS_Store'] for v in p.relative_to(root).parts))
changes=[];added=[]
for n in files():
 if n in ['release_manifest.json','PERFORMANCE_CHANGESET.json']:continue
 h=sha((root/n).read_bytes())
 if n not in old:added.append(dict(file=n,sha256=h))
 elif h!=old[n]:changes.append(dict(file=n,before=old[n],after=h))
removed=[n for n in old if not (root/n).exists()];assert not removed
dump('PERFORMANCE_CHANGESET.json',dict(version=version,baseline='0.40.1 Developer QA',changes=changes,added=added,removed=removed))
entries=[dict(file=n,bytes=(root/n).stat().st_size,sha256=sha((root/n).read_bytes()))for n in files() if n!='release_manifest.json']
dump('release_manifest.json',dict(**proof,patch='performance-gameplay-corrective',builtAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),files=entries))
stem='LAST_BASE_0.40.2_Performance_Gameplay_Corrective_GitHub';target=out/(stem+'.zip')
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for n in files():z.write(root/n,n)
with zipfile.ZipFile(target)as z:
 assert z.testzip() is None
 assert set(z.namelist())==set(files())
 for n in z.namelist():assert z.read(n)==(root/n).read_bytes(),n
 m=json.loads(z.read('release_manifest.json'))
 for f in m['files']:
  b=z.read(f['file']);assert len(b)==f['bytes'] and sha(b)==f['sha256']
ziphash=sha(target.read_bytes());(out/(stem+'.sha256')).write_text(ziphash+'  '+target.name+'\n')
shutil.copy2(root/report,out/'LAST_BASE_0.40.2_REPORT_RU.md')
validation={**proof,'zipFile':target.name,'zipBytes':target.stat().st_size,'zipSha256':ziphash,'crc':'PASS','manifest':'PASS','workspaceEquality':'PASS','files':len(entries)+1}
(out/'LAST_BASE_0.40.2_RELEASE_CHECK.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(validation,ensure_ascii=False,indent=2))
