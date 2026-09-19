from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
reports=[json.loads((root/'qa'/name).read_text()) for name in ['perimeter_0.20.0.json','wall_behaviors_0.20.0.json','target_regression_0.20.0.json']]
assert all(not r['consoleErrors'] for r in reports)
manifest={'version':'0.20.0','basedOn':'0.19.1','checksPassed':sum(r['passed'] for r in reports),'environment':'Local JavaScript game runtime and Canvas2D; no physical Telegram device.','changedRuntimeFiles':['index.html','assets/v0200/fortification_level_1.webp','assets/v0200/fortification_level_2.webp','assets/v0200/fortification_level_3.webp','assets/v0200/fortification_level_4.webp','assets/v0200/fortification_level_5.webp'],'files':{}}
runtime=[root/'index.html',*sorted((root/'assets').rglob('*.*'))]
assert len(runtime)==100,len(runtime)
for p in runtime:
 b=p.read_bytes();assert len(b)<25*1024**2,p
 manifest['files'][str(p.relative_to(root))]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(root/'release_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
archive=root.parent/'survival_base_0.20.0_GitHub.zip'
extras=[root/'README_RU.txt',root/'release_manifest.json']
extras += [p for p in sorted((root/'source').iterdir()) if p.suffix in {'.js','.py','.json','.html'}]
extras += [p for p in sorted((root/'qa').iterdir()) if p.suffix in {'.cjs','.json','.png','.gif'}]
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in runtime+extras:z.write(p,str(p.relative_to(root)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert z.read('index.html')==(root/'index.html').read_bytes()
 assert len(z.namelist())==len(set(z.namelist()))
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'runtimeFiles':len(runtime),'maxRuntimeFileBytes':max(p.stat().st_size for p in runtime),'checksPassed':manifest['checksPassed'],'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
