from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent.parent
read=lambda name:json.loads((root/'qa/results'/name).read_text())
summary=read('summary.json');perf=read('stage-e-corrective-performance.json');ui=read('stage-e-corrective-ui-performance.json');research=read('stage-e.json');checks=read('stage-e-corrective.json');audio=read('stage-e-audio-corrective.json')
hash=hashlib.sha256((root/'js/game.js').read_bytes()).hexdigest()
assert all(d['runtimeSha256']==hash for d in [summary,perf,ui,research,checks,audio])
assert summary['passed'] and len(summary['runs'])==58 and not summary['filtered'] and perf['passed'] and ui['passed']
assert checks['failed']==audio['failed']==research['failed']==0
results=f'''**Полный проход: 58 групп, {summary['automatedAssertions']:,} автоматических проверок, ошибок нет.**
Все группы относятся к одному окончательному runtime SHA-256:
`{hash}`.

| Блок | Результат |
| --- | --- |
| Stage E domain / полный Chapter 1 → Research → craft | {research['passed']} / {research['passed']} |
| Research/save границы | {len(research['boundaries'])} проверенных границ |
| Corrective UI/navigation/RU/EN/save/safe areas | {checks['passed']} / {checks['passed']} |
| Новые проверки Audio recovery | {audio['passed']} / {audio['passed']} |
| Остальные Stage A/B/C/D, регрессии ввода, inventory, power, rendering | Все соответствующие группы прошли |
| Build и source contracts | Пройдены; исторические baseline fixtures не заменены |

Проверены locked recipe, нехватка данных, отсутствие чертежа/станции,
повторное исследование, duplicate request, malformed payload, actor/revision
проверки, границы unlock/save/load и переполнение журнала receipts.
Проверены migration 0.35.3 (15→16), импорт 0.36.0 (16→16), сохранение данных,
чертежей, unlocks, equipment/placements, реальных slots, room names,
Base Control, tool levels и Chapter progress.

Исходные Stage E UI-тесты обновлены под фактическую навигацию через страницу
«Данные» и кнопку «Подробнее». Проверка снятого prerequisite заменена проверкой
действующего ограничения; дополнительно проверено самостоятельное исследование
эффективности. Старые domain/authority/save проверки сохранены. Source-reference
расширен отдельным слоем поверх 0.36.0, без подмены исторических хэшей.

Полные машиночитаемые результаты находятся в ZIP: `qa/results/summary.json`,
`stage-e.json`, `stage-e-corrective.json`, `stage-e-audio-corrective.json`.
'''.replace(f"{summary['automatedAssertions']:,}",f"{summary['automatedAssertions']:,}".replace(',',' '))
labels={'quiet_surface':'Поверхность, спокойная сцена','stress_surface':'Поверхность, нагрузочная сцена','bunker_hall':'Бункер, центральный зал','bunker_moving_lights':'Бункер, движущийся свет','night_combined_lights':'Ночь, комбинированный свет','bunker_door_spill':'Свет через двери'}
lines=['Измерения выполнены отдельно от regression suites. Сравниваются неизменённая','0.36.0 и окончательная 0.36.1, с одинаковыми игровыми сценами и ресурсами.','Для основных сцен — чередование AB/BA и 120 измеренных кадров на версию.','Это **CPU / native Canvas2D / модель DOM и WebAudio**, не реальные browser FPS,','GPU timings или производительность телефона.','','| Viewport | Сцена | p50 0.36.0, мс | p50 0.36.1, мс | Δ p50 | p95 0.36.0, мс | p95 0.36.1, мс |','| --- | --- | ---: | ---: | ---: | ---: | ---: |']
for row in perf['rows']:
 a,b=row['before'],row['after'];lines.append(f"| {row['viewport']} | {labels[row['scene']]} | {a['p50Ms']:.2f} | {b['p50Ms']:.2f} | {row['percent']:+.1f}% | {a['p95Ms']:.2f} | {b['p95Ms']:.2f} |")
lines+=['','Дополнительно выполнены проверки 42 instances с 8 включёнными лампами,','нескольких вновь установленных станций, реального MOVE с сопровождающим дроном,','маршрутов, проверки критического прохода, preview/drag Placement, сериализации','и Base Control. Обе версии загрузили 57 звуковых буферов. Закрытый preview','не запускает новые placement validations; idle Research не перестраивает DOM.','','Core UI проверен отдельно: 120 измеренных обновлений на версию/случай, AB/BA.','Ни один из случаев не перестроил idle Research. Стоимость CSS layout здесь','не измеряется.','','| Viewport | Раздел | p50 0.36.0, мс | p50 0.36.1, мс | p95 0.36.1, мс |','| --- | --- | ---: | ---: | ---: |']
sections={'construction':'Строительство','base':'База','chapters':'Главы','research':'Исследования'}
for row in ui['rows']:
 lines.append(f"| {row['viewport']} | {sections[row['section']]} | {row['before']['p50Ms']:.3f} | {row['after']['p50Ms']:.3f} | {row['after']['p95Ms']:.3f} |")
size=(root/'js/game.js').stat().st_size;base=(root/'qa/stage-e-corrective-base/js/game.js').stat().st_size
lines+=['',f'Runtime JS: {base:,} → {size:,} байт ({(size/base-1)*100:+.2f}%).'.replace(',',' '),'','<!-- FINAL_PERF_INTERPRETATION -->','','Полные данные: `qa/results/stage-e-corrective-performance.json` и','`qa/results/stage-e-corrective-ui-performance.json`. Никаких новых мировых','симуляций, сетевого транспорта или постоянного обхода Research graph при','закрытом интерфейсе не добавлено.']
p=root/'STAGE_E_CORRECTIVE_REPORT_RU.md';s=p.read_text();assert '<!-- FINAL_RESULTS -->' in s and '<!-- PERFORMANCE_ASSESSMENT -->' in s;s=s.replace('<!-- FINAL_RESULTS -->',results).replace('<!-- PERFORMANCE_ASSESSMENT -->','\n'.join(lines));p.write_text(s)
print('Final measurements inserted; review interpretation before packaging.')
