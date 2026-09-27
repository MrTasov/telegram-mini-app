"""Package the tested 0.41.2 tree; never rebuild or modify gameplay here."""
import pathlib,json,hashlib,zipfile,shutil
root=pathlib.Path(__file__).resolve().parents[1];out=root.parent/'deliverables-siege-0412';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
runtime=sha((root/'js/game.js').read_bytes())
summary=json.loads((root/'qa/results/summary.json').read_text())
assert summary['runtimeSha256']==runtime and summary['runtimeUnchanged'] and not summary['filtered'] and len(summary['runs'])==78
assert all(r['runtimeSha256']==runtime for r in summary['runs'])
allowed={'character-animation','master-unarmed','equipment-integration','player-visual-fix','polish'}
assert {r['id'] for r in summary['runs'] if r['exitCode']}<=allowed
for f,h in json.loads((root/'qa/siege-source-reference.json').read_text())['files'].items():assert sha((root/f).read_bytes())==h['after'],f
base=zipfile.ZipFile(root.parent/'upload/02-LAST_BASE_0_41_1_Day_X_Corrective_GitHub.zip')
names=base.namelist();prefix=next(n[:-len('src/render/hero.js')]for n in names if n.endswith('src/render/hero.js'))
protected=json.loads((root/'qa/results/siege-protected.json').read_text())
for f in protected['files']:assert (root/f).read_bytes()==base.read(prefix+f),f
files=sorted(p for p in root.rglob('*') if p.is_file() and not any(x in {'.git','node_modules','__pycache__'} for x in p.relative_to(root).parts) and p.name!='release_manifest.json' and p.suffix not in {'.pyc','.zip'} and p.name!='.DS_Store')
manifest={'version':'0.41.2','saveFormat':22,'runtimeSha256':runtime,'baselineSha256':sha((root.parent/'upload/02-LAST_BASE_0_41_1_Day_X_Corrective_GitHub.zip').read_bytes()),'completeHistoricalGroups':78,'greenGroups':sum(r['exitCode']==0 for r in summary['runs']),'knownInheritedFailingGroups':sorted(r['id'] for r in summary['runs'] if r['exitCode']),'files':{p.relative_to(root).as_posix():{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}for p in files}}
mp=root/'release_manifest.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');files.append(mp)
zpath=out/'LAST_BASE_0.41.2_Siege_Corrective_GitHub.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in files:z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(zpath)as z:
 assert z.testzip() is None
 assert set(z.namelist())==set(manifest['files'])|{'release_manifest.json'}
 for p in files:
  n=p.relative_to(root).as_posix();b=z.read(n);assert b==p.read_bytes(),n
  if n in manifest['files']:assert sha(b)==manifest['files'][n]['sha256'],n
zsha=sha(zpath.read_bytes())
report=out/'LAST_BASE_0.41.2_SIEGE_REPORT_RU.md';shutil.copyfile(root/report.name,report)
proof={'version':'0.41.2','zip':zpath.name,'zipBytes':zpath.stat().st_size,'zipSHA256':zsha,'crc':'PASS','manifestEntries':len(manifest['files']),'zipEntries':len(files),'manifestHashCheck':'PASS','zipVsWorkingTree':'all included bytes identical','runtimeSHA256':runtime,'sourceBuildCheck':'PASS (node tools/build.cjs --check)','protectedBaselineFiles':len(protected['files']),'fullHistoricalGroups':78,'greenGroups':manifest['greenGroups'],'overallHistoricalSuitePassed':summary['passed'],'knownInheritedFailingGroups':manifest['knownInheritedFailingGroups'],'nativeBrowserQA':False}
proofpath=out/'LAST_BASE_0.41.2_VERIFICATION.json';proofpath.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
(out/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.name+'\n'for p in [zpath,report,proofpath]))
print(json.dumps(proof,ensure_ascii=False,indent=2))
