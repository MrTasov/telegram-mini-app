#!/usr/bin/env python3
"""Package current reviewed tree; no rebuild, mutation of runtime or QA reruns."""
import hashlib,json,pathlib,sys,zipfile,shutil
root=pathlib.Path(__file__).resolve().parent.parent
out=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'pass_a_release_0.43.0'
out.mkdir(parents=True,exist_ok=True)
name='LAST_BASE_0.43.0_Bunker_L1_L2_Pass_A';prefix=name+'/'
excluded={'.git','node_modules','__pycache__','.pytest_cache'}
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
files=sorted(p for p in root.rglob('*') if p.is_file() and not any(x in excluded for x in p.relative_to(root).parts) and p.name!='.DS_Store' and p!=root/'release_manifest.json')
manifest={'version':'0.43.0','stage':'Bunker L1 + L2 Pass A','baselineZipSha256':'6d397ac3d6b67984c4fb5efae7f30e99683a82399ef3f622abea6de4b4113988','runtimeSha256':sha(root/'js/game.js'),'note':'Manifest covers every packaged file except itself. All archived bytes, including this manifest, are verified against the work tree. Historical QA failures are retained, not reported as PASS.','files':[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]}
(root/'release_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
files.append(root/'release_manifest.json')
archive=out/(name+'_GitHub.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,prefix+str(p.relative_to(root)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None,'CRC failure'
 expected={prefix+str(p.relative_to(root)):p for p in files}
 assert len(z.namelist())==len(expected) and set(z.namelist())==set(expected)
 for entry,p in expected.items():assert hashlib.sha256(z.read(entry)).hexdigest()==sha(p),entry
 embedded=json.loads(z.read(prefix+'release_manifest.json'))
 for record in embedded['files']:
  b=z.read(prefix+record['path']);assert len(b)==record['bytes'] and hashlib.sha256(b).hexdigest()==record['sha256'],record['path']
digest=sha(archive)
report=out/(name+'_REPORT_RU.md');shutil.copy2(root/'PASS_A_REPORT_RU.md',report)
shutil.copy2(root/'qa/results/pass-a-release-summary.json',out/(name+'_QA.json'))
verification={'zip':archive.name,'zipBytes':archive.stat().st_size,'zipSha256':digest,'entries':len(files),'crc':'PASS','manifest':'PASS','archivedBytesMatchWorkingTree':'PASS','runtimeSha256':manifest['runtimeSha256'],'reportSha256':sha(report),'passBStarted':False}
(out/(name+'_VERIFICATION.json')).write_text(json.dumps(verification,indent=2)+'\n')
(out/(name+'_SHA256.txt')).write_text(digest+'  '+archive.name+'\n')
print(json.dumps(verification,indent=2),flush=True)
