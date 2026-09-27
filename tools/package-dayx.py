"""Package verified Day X runtime without rebuilding or rerunning tests."""
import pathlib,json,hashlib,zipfile,shutil,datetime
root=pathlib.Path(__file__).resolve().parents[1];out=root.parent/'deliverables-dayx-0411';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda n:json.loads((root/'qa/results'/n).read_text())
runtime=sha((root/'js/game.js').read_bytes());baseline=json.loads((root/'qa/dayx-source-reference.json').read_text())
protected=json.loads((root/'qa/dayx-baseline-hashes.json').read_text())
for f,h in protected.items():assert sha((root/f).read_bytes())==h,f
for f,h in baseline['files'].items():assert sha((root/f).read_bytes())==h['after'],f
full=read('dayx-full-run.json');assert full['runtimeSha256']==runtime
assert abs(full['elapsedSimulationRealMs']-900000)<.001
assert full['phases'][0]['maxAlive']==100 and full['phases'][2]['maxAlive']==100 and full['phases'][5]['maxAlive']==120
assert full['end']['clock']=={'schema':1,'day':10,'minute':360}
groups=['dayx-corrective','dayx-save-dev','dayx-audio','dayx-hero-memory','stage-i1','stage-h','stage-c2','stage-e','stage-f','stage-f-final','state-saves','stage-e-audio-corrective','verification']
checks=[]
for name in groups:
 d=read(name+'.json');assert d.get('failed')==0,name
 if d.get('runtimeSha256'):assert d['runtimeSha256']==runtime,(name,d['runtimeSha256'])
 checks.append({'group':name,'passed':d['passed'],'failed':d['failed']})
qa={'version':'0.41.1','runtimeSha256':runtime,'groups':checks,'passed':sum(x['passed'] for x in checks),'failed':0,'fullDayX':{'simulationRealMs':full['elapsedSimulationRealMs'],'wallSeconds':full['wallSeconds'],'phases':full['phases']},'protectedFiles':len(protected),'nativeBrowser':False,'fullHistoricalSuite':False}
(root/'qa/results/dayx-release-summary.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
phase_table='\n'.join(f"| {i:02d}–{i+1:02d} | {p['target']} | {p['maxAlive']} | {p['spawned']} | {p['endAlive']} | {p['cap']} |" for i,p in enumerate(full['phases']))
qa_table='\n'.join(f"| `{x['group']}` | {x['passed']} | 0 |" for x in checks)
perf_sections=[]
for title,file in [('Итоговый последовательный замер','dayx-performance.json'),('Предыдущий замер при занятом host — сохранён полностью','dayx-performance-host-busy.json'),('Первый замер до кэша проходов — сохранён полностью','dayx-performance-before-path-cache.json')]:
 d=read(file);rows='\n'.join(f"| {'0.41.0 + hero patch' if r['version']=='before' else '0.41.1 corrective'} | {r['distance']} | {r['alive']} | {r['p50']:.3f} | {r['p95']:.3f} |" for r in d['rows'])
 perf_sections.append(f"### {title}\n\n| Runtime | Дистанция от базы | Живых после теста | Update p50, мс | Update p95, мс |\n|---|---:|---:|---:|---:|\n{rows}\n")
report=f'''# LAST BASE 0.41.1 — Day X Corrective

## Основа и границы

Единственная authoritative baseline: `LAST_BASE_0_41_0_hero_memory_PATCH.zip` — приложенная 0.41.0 I2 с последним hero-memory patch Claude. Предыдущая сборка ассистента не подставлялась. ZIP прошёл CRC до распаковки.

SHA-256 входного ZIP: `{baseline['baselineSha256']}`.
SHA-256 финального `js/game.js`: `{runtime}`.
Версия 0.41.1, Save Format **22**, безопасная миграция **21→22**, все прежние migrations сохранены. Новый формат нужен для шести отдельных бюджетов, receipts и итоговой статистики; owner и поле `signal041` остаются существующими.

Следующие Stage, Hunger/Thirst/Food/Medicine, Level 2, Farm/Animals expansion и Stage SIM не добавлялись.

## Игровые изменения

- Удалены постоянная кнопка/панель Signal/Threat и числовой показатель 0–100. Используется существующий номер дня: обычный цвет → мягкий красный за 24 часа → более заметный за 6 часов → насыщенный красный во время события. В 06:00 цвет возвращается к обычному. В карте/Core остаётся только доступная по запросу краткая информация без числового Threat.
- Предупреждения за 24 часа, за 6 часов и в начале — одна строка сверху по центру, 5 секунд, без окна. RU/EN; повтор после Save/Load блокируется сохранёнными receipts.
- Видимая кнопка «Спрыгнуть во двор» убрана. Существующие movement/touch descent и collision/landing logic сохранены.
- Дешёвая CSS radial-gradient vignette: отдельный слой над Canvas и под HUD, pointer-events:none, opacity-пульсация 12 секунд, без per-frame Canvas gradients/filter/blur. Центральная игровая область остаётся прозрачной; затемнение сосредоточено у края. HUD и окна не затрагиваются. Vignette применяется на Surface; подземные комнаты сохраняют своё освещение.
- Короткий синтезированный сигнал начала и очень тихий синусоидальный гул идут через существующий GameAudio master bus. Для далёкой орды используются существующие zombie/zombie2/zombie3/zombie_attack, изменение pitch/gain и low-pass. Новых audio/media файлов нет. На 06:00 гул и голоса орды прекращаются; mute/background/reset и смена зоны не создают второй audio owner.
- Скорость Day X Zombies — **120% обычной**, без дополнительного наложения прежнего ×1.5 speed. Существующие HP/damage/cooldown параметры I2 сохранены. Новые классы врагов не добавлялись.

## Календарь и time domains

Day X остаётся на днях 10/20/30… с 00:00 до 06:00. Только WorldClock в этом окне идёт в 3 раза медленнее. Переходы через полночь и 06:00 разделяются внутри clock advance, поэтому пограничный кадр не получает неправильную скорость.

**Фактически проведённая длительность полного события: {full['elapsedSimulationRealMs']/60000:.6f} минут real-time simulation ({full['elapsedSimulationRealMs']:.3f} мс).** Это сумма реальных dt существующего update-цикла, проведённых DEV-прогоном до точной цели 06:00; значение не переписано из definitions. Отдельная проверка обычного WorldClock без DEV также прошла ровно 900 секунд. При production ×1 это 15 минут; DEV может ускорять проведение этих dt. На расчёт полного прогона в данной среде ушло {full['wallSeconds']:.2f} секунд. Это не замер секундомером на реальном телефоне.

| Time domain | Основные системы | Поведение в Day X |
|---|---|---|
| WorldClock | День/ночь, календарный Day X, warnings, шесть фаз, календарные факты Chapter 1 | За весь Day X проходят ровно 6 игровых часов |
| Simulation real-time / GameActivity / performance clock | Player, Zombies, bullets, turret cadence/turning, reload, attacks, animations, collision | Скорость не замедляется |
| Simulation real-time dt | Power, Fuel, Battery и production/crafting queues в этой baseline | Сохранён существующий dt; за 15 минут работают 15 минут. Это уже real-time системы, расход не переводился на WorldClock |
| AgricultureTime | Существующие сельскохозяйственные timers | Time domain и пауза до будущего Level 2 не изменялись |
| Browser lifecycle / WebAudio | Master audio, transient voices, фоновое состояние, autosave debounce | Существующий owner/lifecycle; без глобального timeScale |

DEV `+1 час`, `+6 часов`, `+1 день`, переход к Day и ×10/×50/MAX сохранены. Расчёт последнего шага использует реальное количество dt до цели с учётом замедленного участка. Максимальное ускорение ограничено стоимостью настоящей симуляции; мгновенный переход при большой орде не обещается.

## Фазы, подкрепления и cap

Definitions централизованы в `src/world/signal-definitions.js`: targets **100 / 30 / 100 / 20 / 50 / 120**; бюджеты **180 / 54 / 180 / 36 / 90 / 216** (1.8× target); speed, slowdown, refill threshold 80%, интервал 2.5 секунды, группа до 6, ring 2300–2900 world units, reserve 16 и связанные настройки.

Подкрепления появляются вне видимости и не ближе 900 world units к Surface Player. Несколько групп используют четыре направления; профили/приоритет направлений меняются между фазами. Это реальные enemy instances с обычным движением и физическим collision. Существующий monster owner и I1 update-цикл продолжают бой и вне зоны Player.

Target — количество живых **участников подкреплений Day X**, а не команда удалить лишних врагов. Обычные враги, уже жившие до начала, остаются отдельной частью population. Бюджет конечный: потраченная часть не восстанавливается после загрузки. Живые враги не удаляются при смене фаз.

Временный cap = живые обычные враги на старте + 120 + запас 16, минимум 144. В измеренном сценарии на старте было 54 обычных врага, поэтому cap равен **190**. Защитный предел сохранения actor/corpse массива — 512, он **не** является обычным spawn target. После 06:00 spawn cap снова 144; живые сверх него остаются. Далёкие, невидимые и не участвующие в бою surplus actors постепенно выводятся обычным population manager; видимые и находящиеся у базы не исчезают.

### Фактический полный DEV-прогон

Использованы New Game, существующие DEV repair/power и выдача реальных buildable instances, затем validated placement одной Automatic и двух Heavy Turrets. Патроны заполнены до штатной ёмкости. Запущен настоящий DEV `+6 часов` от Day 10 00:00. Player находился в Bunker, на фазе 02–03 переходил на удалённый Surface, затем вернулся в Bunker. Нет подмены убийств, HP, spawn counters или отдельного combat loop.

| Фаза | Target alive | Max simultaneous alive | Total reinforcements | Alive at phase end | Actual population cap |
|---|---:|---:|---:|---:|---:|
{phase_table}

Здесь alive — участники Day X; обычные Zombies не включены в эти столбцы. Поэтому 85 против target 30 и 89 против target 20 — ожидаемые оставшиеся враги, а не скрытый пересчёт targets. Фаза 04–05 тоже не получила новых подкреплений: сохранилось 73 участника при target 50.

Итог: **419** новых участников, **304** зарегистрированных убийства, **115** оставшихся участников Day X плюс **32** обычных врага = **147** живых в мире после 06:00. Они пережили Save/Load; результат события остался единственным.

Реальные последствия прогона:

- Wall HP: **{full['end']['startWall']} → {full['end']['wallHP']}**.
- Fuel: **{full['end']['startFuel']:.3f} → {full['end']['fuel']:.3f}**.
- Ammo трёх турелей: **{full['end']['startAmmo']} → {full['end']['ammo']}**; израсходовано 1573 патрона.
- HP трёх тестовых Defense instances на финише: **{full['end']['defenseHP']}**.
- В 06:00 прекратились Day X reinforcements, специальный siege-режим и визуальная/звуковая атмосфера; cap стал 144. Нового replay волны или результата после загрузки не возникло.

## Save/Load и связанные исправления

Новый ledger хранит phase index, бюджеты/расход, admitted/killed IDs, очередной разрешённый момент reinforcement, refill state и статистику фаз. Старый save 21 во время атаки не получает неизвестный ранее потраченный бюджет повторно: предыдущие и текущая фазы отмечаются без доступного нового бюджета, будущие получают новые definitions. Исходные instances, inventory, equipment transforms, Research, Chapter/Archive и Base Control сохраняются.

Исправлены старые validators на 144 записи в базовом save, types и corpse indices: без этого корректный бой с обычными врагами плюс 120 участников нельзя было бы загрузить. Повреждённый ledger отклоняется до мутации runtime. Idempotency/revision/actor contracts, identity owner и I1 activity/cooldown state сохранены.

Поиск прохода через пролом получил transient cache на 500 мс с инвалидированием по geometry revision, смене цели и переходу внутрь периметра. Collision при каждом физическом движении сохранён. Дальние группы используют существующую coarse I1 cadence; до подхода к базе не сканируют все стены. Не добавлялась декоративная или параллельная симуляция.

## Сохранность Claude patch и performance hotfix

**{len(protected)} защищённых файлов побайтно совпадают с приложенным ZIP**, включая все assets, hero.js, packed layout/manifest, resource loader, actor rendering, movement/combat foundations, I1 activity owner, Defense, lighting и основные Power/production modules.

Hero check: **6/6 PASS**. Все 42 sheets packed; полный hero RGBA footprint **52.0 MiB**, базовые idle/walk/run **2.9 MiB**. Lazy loading, 60-секундное освобождение неактивных sheets, сохранение активного предмета и base fallback не изменены. Оценка «база + два крупнейших предмета» — 27.4 MiB; это не абсолютный предел при быстром переборе нескольких предметов за одну минуту. Полный набор остаётся 52 MiB, а не прежние ~147 MiB. Это pixel estimate, не process RSS.

Autosave coalescing 15 секунд и lifecycle/backup/recovery code после `queueGameSave` совпадают с baseline. Production DPR остаётся ≤2. Weapon tracers, sprites, animations, icons, lighting/searchlights не переписывались. Assets не перекодировались.

## Проверки

Проведён targeted regression pass, **не** полный исторический suite всех прошлых Stage. Завершённые группы:

| Группа | PASS | FAIL |
|---|---:|---:|
{qa_table}

Всего в этих группах: **{qa['passed']} PASS / 0 FAIL**, отдельно — полный Day X simulation с таблицей выше. Проверены warning boundaries, clock boundaries, все фазы, конечность бюджета, 200 живых врагов и Save/Load, отсутствие forced despawn, duplicate kill/request, миграция реального входного save 21, каждый phase roundtrip, I1 transitions/combat/cooldowns, Defense/Ammo/Power, Construction/Pick Up, Chapter 1, Research, Intro/Archive, backup/recovery, RU/EN и modeled portrait/landscape/desktop states.

Первый full-run упёрся в 30-секундный VM limit: прежний harness держал CPU clock фиксированным, из-за чего DEV выполнял 600 тяжёлых steps без срабатывания 12-мс CPU budget. Harness переведён на настоящий host CPU clock; финальный прогон завершён. Начальный лог сохранён. Агрегатор исторических F-проверок также остановлен по лимиту 120 секунд; необходимые компоненты завершены отдельно. Устаревшие byte-equality assertions на намеренно изменяемый audio runtime заменены проверкой declared changes и сохранности всех прежних cues/gains/assets. Исходные результаты не замалчивались.

## Производительность и ограничения

Короткий stress comparison использует 120 реальных actors одинаковых существующих типов на двух расстояниях, 10 warm-up + 60 измеренных update. Canvas draw не включён. Старый population manager успевает убрать часть surplus actors: фактическое количество после теста показано в таблицах. Это не строгий изолированный FPS benchmark телефона.

{''.join(perf_sections)}
В финальном последовательном замере ближний p95 **14.763 → 15.986 мс ухудшился**, хотя median ниже. Предыдущий занятый host также дал ухудшение дальнего p50/p95. Все эти результаты сохранены; targets не уменьшались. В полном плотном бою оценка времени update на один step: p50 **{full['meanUpdateP50']:.3f} мс**, p95 **{full['meanUpdateP95']:.3f} мс** (включая harness/DEV overhead, без draw). Поэтому **60 FPS при 120 врагах не заявляется**. Проверка реальной производительности телефона остаётся за ручным запуском.

Native Chromium/WebKit в среде отсутствует (Playwright не нашёл executable). Визуальная mobile/Telegram-проверка **не заявляется**. Проверены modeled размеры 390×844 / 844×390 / 1280×800, RU/EN, safe-area CSS, z-index и pointer-events. На телефоне/Telegram остаётся проверить фактические safe areas, читаемость Zombies в свете, силу vignette, слышимость тихого hum и микс орды.

## Комплект и остановка

GitHub-ready ZIP содержит исходники, пересобранные `js/game.js`/map/build-info, все неизменённые assets, migrations, новые QA scripts, фактические results, исходную baseline reference и этот отчёт. Root manifest содержит SHA-256 каждого файла; ZIP проверен по CRC, уникальности entries, manifest и побайтному соответствию рабочему дереву. SHA-256 ZIP вынесен в отдельный `.sha256`, чтобы избежать циклического хэша.

**Day X Corrective завершён. Следующий Stage не начат. Остановка для ручной проверки.**
'''
name='LAST_BASE_0.41.1_DAY_X_REPORT_RU.md';(root/name).write_text(report);(out/name).write_text(report)
files=sorted(p for p in root.rglob('*') if p.is_file() and not any(x in p.parts for x in ['node_modules','.git','__pycache__']) and p!=root/'release_manifest.json')
manifest={'version':'0.41.1','saveFormat':22,'runtimeSha256':runtime,'baselineSha256':baseline['baselineSha256'],'files':[{'file':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]}
(root/'release_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');files.append(root/'release_manifest.json')
zpath=out/'LAST_BASE_0.41.1_Day_X_Corrective_GitHub.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(zpath) as z:
 assert len(z.namelist())==len(set(z.namelist()))==len(files)
 assert z.testzip() is None
 for p in files:assert z.read(p.relative_to(root).as_posix())==p.read_bytes(),str(p)
 assert json.loads(z.read('release_manifest.json'))==manifest
h=sha(zpath.read_bytes());(out/(zpath.stem+'.sha256')).write_text(h+'  '+zpath.name+'\n')
proof={'version':'0.41.1','zip':zpath.name,'bytes':zpath.stat().st_size,'entries':len(files),'sha256':h,'runtimeSha256':runtime,'reportSha256':sha((root/name).read_bytes()),'crc':'PASS','manifest':'PASS','workingTreeMatch':True,'protectedFiles':len(protected),'qa':qa}
(out/'LAST_BASE_0.41.1_RELEASE_CHECK.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in proof.items() if k!='qa'}))
