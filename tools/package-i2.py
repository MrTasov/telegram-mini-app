"""Package the reviewed I2 runtime without rebuilding or rerunning tests."""
from pathlib import Path
import hashlib,json,zipfile,sys,shutil
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'deliverables-i2-0410'
out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
runtime=sha((root/'js/game.js').read_bytes())
read=lambda f:json.loads((root/f).read_text())
reg=read('qa/results/summary.json');i2=read('qa/results/stage-i2.json');combat=read('qa/results/stage-i2-combat.json');perf=read('qa/results/stage-i2-performance.json')
assert reg['runtimeUnchanged'] and reg['runtimeSha256']==runtime
known={'character-animation','player-visual-fix'}
failed=[r['id'] for r in reg['runs'] if r['exitCode']!=0]
assert set(failed)<=known,failed
limitations=[]
for group in failed:
 current=read('qa/results/'+group+'.json');baseline=read('qa/results/uploaded-baseline-'+group+'.json')
 previous={c['id'] for c in baseline['checks'] if c['status']=='FAIL'}
 for c in current['checks']:
  if c['status']=='FAIL':
   assert c['id'] in previous,c['id']
   limitations.append({'group':group,'id':c['id'],'reproducedInUploadedBaseline':True})
assert i2['failed']==0 and i2['runtimeSha256']==runtime and combat['failed']==0
assert perf['runtimeSha256']==runtime
reference=read('qa/stage-i2-source-reference.json')
for f in reference['files']:assert sha((root/f['file']).read_bytes())==f['sha256'],f['file']
note=root/'LAST_BASE_0.41.0_REPORT_RU.md'
text=note.read_text().split('\n## Результаты выпуска\n')[0]
text+='\n## Результаты выпуска\n\n'
text+=f"Runtime SHA-256: `{runtime}`.\n\n"
text+=f"Общий regression: {len(reg['runs'])} групп, {len(reg['runs'])-len(failed)} PASS; {len(limitations)} прежних failing checks в {len(failed)} группах воспроизведены на неизменённой приложенной baseline. Новых необъяснённых failures нет. Targeted I2: {i2['passed']} проверок; off-zone/UI: {combat['passed']}; все PASS.\n\n"
if limitations:
 text+='Исходные ограничения не скрыты: 2 проверки старого бюджета 40 MiB и проверка старого fallback M4. Оценка RGBA всех актуальных enemy/player атласов — 192 753 664 байт (183,82 MiB), не реальный RSS и не новая память I2. Эти файлы не менялись. Требуется отдельная оценка памяти/загрузки на телефоне; графику Claude в этом этапе не перерабатывали.\n\n'
 for item in limitations:text+=f"- `{item['group']}` / `{item['id']}` — воспроизведено на baseline.\n"
 text+='\n'
text+=f"Побайтно сохранены {len(reference['files'])} файлов assets и модулей персонажа из приложенной baseline.\n\n"
text+='Performance: 50 врагов, 390×844, устройство DPR 3 / production Canvas DPR 2. Измерены update и capture; рендер/FPS не измерялись.\n\n'
text+='| Сцена | Версия | Update p50 / p95, мс | Capture p50 / p95, мс | Save, байт |\n|---|---|---:|---:|---:|\n'
for row in perf['rows']:
 if row.get('limitation'):text+=f"| {row['scene']} | {row['which']} | limitation: {row['limitation'][:200]} | — | — |\n"
 else:text+=f"| {row['scene']} | {row['which']} | {row['updateMs']['p50']:.3f} / {row['updateMs']['p95']:.3f} | {row['captureMs']['p50']:.3f} / {row['captureMs']['p95']:.3f} | {row['saveBytes']} |\n"
text+='\nBefore — приложенный ZIP, after — I2. Неблагоприятные значения не исключены. Короткие CPU-замеры чувствительны к шуму хоста и не доказывают улучшение FPS.\n'
note.write_text(text)
files=sorted(p for p in root.rglob('*') if p.is_file() and not any(s in p.parts for s in ('node_modules','.git','__pycache__')) and p!=root/'release_manifest.json')
manifest={'version':'0.41.0','saveFormat':21,'runtimeSha256':runtime,'baseline':read('qa/results/stage-i2-baseline-integrity.json'),'files':[{'file':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]}
(root/'release_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
target=out/'LAST_BASE_0.41.0_Stage_I2_GitHub.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files+[root/'release_manifest.json']:z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(target) as z:
 assert len(z.namelist())==len(set(z.namelist()))
 for name in z.namelist():assert z.read(name)==(root/name).read_bytes(),name
digest=sha(target.read_bytes());(out/(target.stem+'.sha256')).write_text(digest+'  '+target.name+'\n')
shutil.copy2(note,out/note.name)
proof={'zip':target.name,'bytes':target.stat().st_size,'sha256':digest,'entries':len(files)+1,'CRC_manifest_tree_match':True,'runtimeSha256':runtime,'baselineLimitations':limitations}
(out/'LAST_BASE_0.41.0_RELEASE_CHECK.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
