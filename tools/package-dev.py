import hashlib,json,pathlib,subprocess,sys,zipfile,shutil,datetime
root=pathlib.Path(__file__).resolve().parent.parent
out=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'deliverables-dev-qa'
out.mkdir(exist_ok=True,parents=True)
def read(n):return json.loads((root/n).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,v):(root/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
version=read('package.json')['version'];assert version=='0.40.1'
runtime=sha((root/'js/game.js').read_bytes())
base=read('qa/dev-base/release_manifest.json');assert base['version']=='0.40.0'
assert sha((root/'qa/dev-base/js/game.js').read_bytes())==base['runtimeSha256']
summary=read('qa/results/dev-targeted.json');perf=read('qa/results/dev-performance.json')
assert summary['passed'] and summary['complete'] and not summary['filtered'] and summary['runtimeUnchanged']
assert summary['groups']==13 and summary['failed']==0 and summary['runtimeSha256']==runtime
assert all(r['exitCode']==0 and r['runtimeSha256']==runtime for r in summary['runs'])
assert read('qa/results/dev-qa.json')['failed']==0
assert perf['runtimeSha256']==runtime and not perf.get('errors')
old={f['file']:f['sha256'] for f in base['files']}
for name,h in old.items():
 if name.startswith('assets/') or name in ['src/simulation/activity.js','src/simulation/activity-save.js','src/combat/monsters.js','src/defense/runtime.js']:
  assert sha((root/name).read_bytes())==h,name
ref=read('qa/dev-source-reference.json')
for kind in ['changes','added']:
 for name,v in ref[kind].items():assert sha((root/name).read_bytes())==v['after'],name
subprocess.run(['node','tools/build.cjs','--check'],cwd=root,check=True)
report='DEV_QA_REPORT_RU.md';assert '<!-- FINAL_RESULTS -->' not in (root/report).read_text()
# Current summary is explicitly a targeted pass. The accepted full pass is retained under dev-base.
dump('qa/results/summary.json',summary)
dump('qa/results/run-checkpoint.json',dict(runtimeSha256=runtime,runs=summary['runs'],complete=True,scope=summary['scope']))
dump('qa/results/dev-targeted-checkpoint.json',dict(runtimeSha256=runtime,runs=summary['runs'],complete=True))
proof=dict(version=version,runtimeSha256=runtime,baseline='LAST_BASE_0.40.0_Stage_I1_GitHub.zip',baselineSha256='ebe1ef9a022ee25b84e06dff866b77507e957eebe4648c1be944016ac12eba1e',baselineRuntimeSha256=base['runtimeSha256'],passed=True,scope=summary['scope'],regressionGroups=summary['groups'],automatedAssertions=summary['checks'],failed=0,allGroupsSameRuntime=True,fullRegressionRepeated=False,saveFormat=20,I1CoreUnchanged=True,acceptedAssetsUnchanged=True,realBrowserVisualQA=False,stageI2Started=False,manualAcceptancePending=True,performanceReport='qa/results/dev-performance.json',performance=perf)
dump('qa/results/dev-release-validation.json',proof)
def files():
 return sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and not any(v in ['node_modules','.git','__pycache__','.DS_Store'] for v in p.relative_to(root).parts))
changes=[];added=[]
for n in files():
 if n in ['release_manifest.json','DEV_QA_CHANGESET.json']:continue
 h=sha((root/n).read_bytes())
 if n not in old:added.append(dict(file=n,sha256=h))
 elif h!=old[n]:changes.append(dict(file=n,before=old[n],after=h))
removed=[n for n in old if not (root/n).exists()];assert not removed
dump('DEV_QA_CHANGESET.json',dict(version=version,baseline='0.40.0 Stage I1',changes=changes,added=added,removed=removed))
entries=[dict(file=n,bytes=(root/n).stat().st_size,sha256=sha((root/n).read_bytes())) for n in files() if n!='release_manifest.json']
dump('release_manifest.json',dict(**proof,patch='developer-qa',builtAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),files=entries))
stem='LAST_BASE_0.40.1_Developer_QA';archive=out/(stem+'_GitHub.zip');assert not archive.exists(),'Refusing to overwrite release'
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n in files():z.write(root/n,n)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 names=z.namelist();assert len(names)==len(set(names))==len(entries)+1
 assert set(names)=={f['file'] for f in entries}|{'release_manifest.json'}
 for f in entries:
  b=z.read(f['file']);assert len(b)==f['bytes'] and sha(b)==f['sha256'] and b==(root/f['file']).read_bytes(),f['file']
 assert z.read('release_manifest.json')==(root/'release_manifest.json').read_bytes()
result=dict(file=archive.name,bytes=archive.stat().st_size,sha256=sha(archive.read_bytes()),files=len(entries)+1,crcPassed=True,allManifestHashesPassed=True,sourceTreeEqualityPassed=True,runtimeSha256=runtime)
shutil.copyfile(root/report,out/(stem+'_Report_RU.md'))
(out/(stem+'_Verification.json')).write_text(json.dumps(dict(**proof,archive=result),ensure_ascii=False,indent=2)+'\n')
(out/(stem+'_SHA256.txt')).write_text(result['sha256']+'  '+archive.name+'\n')
print(json.dumps(result))
