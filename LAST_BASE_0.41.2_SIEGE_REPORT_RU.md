# LAST BASE 0.41.2 — Siege Corrective

Основа: приложенный `LAST_BASE_0_41_1_Day_X_Corrective_GitHub.zip`, SHA-256 `1d1daf374026f9fda76bba4cea4f0d979c471064de1330bf850f3ef1964ab92a`. Проверено: патч Claude уже включён в этот ZIP (кэш проломов, оптимизация предыдущего save, hero memory и позиция предупреждения). Более ранняя сборка вместо него не использовалась. Следующий Stage не начат.

## Итоговый баланс и размещение параметров

| Параметр | Значение | Источник |
|---|---|---|
| Automatic | damage 30; 190 мс; ≈157.9 DPS; range 300; ammo 400 | `src/defense/definitions.js` |
| Heavy | damage 45; 190 мс; ≈236.8 DPS; range 340; ammo 600 | тот же файл |
| Уровни турелей | бонусы/действие/кнопка убраны; сохранённое level читается для совместимости | definitions, `src/defense/runtime.js`, `src/ui/defense.js`, `src/base/turrets.js` |
| Steel | **3 Iron + 1 Coal → 1 Steel за 4000 мс** по последнему уточнению | `src/config/gameplay.js`, `src/crafting/manufacturing.js`, RU/EN locales |
| Automatic craft | 60 Iron + 25 Copper + 14 Parts + 1 Advanced Parts | `src/defense/definitions.js`, проекция в `src/equipment/instances.js` |
| Heavy transform | packed Automatic + 30 Steel + 30 Copper + 20 Parts + 2 Advanced Parts | `src/defense/definitions.js`, `src/equipment/placement.js` |
| Радиус турелей | OFF по умолчанию; device preference, вне gameplay save; preview всегда показывает радиус | `src/ui/display.js`, `src/defense/art.js`, `src/ui/equipment-placement.js` |
| Осада HP/Damage | min(2.0, 1.2 + 0.1 × (floor(day/10) − 1)), округление до сотых | `src/world/signal-definitions.js`, `src/world/events.js` |
| Осада speed | ×1.6; cooldown/mechanics остаются ×1.5 | те же definitions/events |
| Оружие Player | +10% damage/Lv, максимум Lv.5; цены прежние | `src/combat/weapons-crafting.js` |
| Drone | +12% damage/Lv, максимум +60%; цены прежние | `src/drones/companion.js` |

Сталь — обычный stackable material с временным emoji, производится существующей печью. Уровни стен и upgrade0161 не менялись. Loot, mining, Ammo recipe, drops и количество Advanced Parts не компенсировались: 5 Automatic + 1 Heavy всё ещё требуют 8 Advanced Parts суммарно.

## Поведение и небольшие исправления

Heavy нельзя изготовить напрямую или превратить из установленной Automatic. Через Core превращается только реальный packed instance из рюкзака. Лимит 8, доступ к Core, owner, Research availability и Chapter reserve проверяются до списания. Создаётся новый Heavy ID, старый удаляется; сохраняются тот же слот, патроны, доля HP и настройка питания. Слот переиспользуется даже при полном рюкзаке. Перестраиваются Power refs; packed consumer не потребляет электричество. Сохранение доли HP предотвращает бесплатный ремонт через превращение.

Receipt проверяется до поиска уже израсходованного source ID: повторный запрос (включая после Save/Load) возвращает прежний результат без повторной оплаты. Actor/revision guards остаются. Format **22** сохранён. При загрузке старой Осады фиксированный множитель 1.5 переводится в новый с сохранением доли HP. Расчёт использует день загружаемого save, а не открытой сессии. Старый предел 630 HP расширен до фактического максимума типов ×2 (840 для Heavy zombie): поздние Осады теперь корректно декодируются. Повторная загрузка 0.41.2 не масштабирует HP снова.

Застревание проверяется по сокращению расстояния к цели: менее 10 px за 600 мс, в дальней и ближней ветках. Существующий `v092PathSearch` работает по шагам на сетке 36, к промежуточной точке около 600 px; не более 2 новых поисков и 8 ограниченных срезов генератора за кадр. Waypoints живут около 3 с. Если промежуточная точка попала в дом, выбирается доступная точка рядом по направлению. Spawn проверяет открытый выход около 300 px. Телепортов, отключения collision и второй симуляции нет. Кэш проломов Claude сохранён.

Возвращён `day_x.wav` через существующий GameAudio, включая приглушение в Bunker. Hum: triangle 55 Hz, low-pass 500 Hz, LFO 0.6 Hz, gain 0.065; далёкая орда использует прежние файлы и low-pass 1350 Hz, чаще в тяжёлых фазах. Mute/master и cleanup общие. Новых audio assets нет. DOM vignette: край rgb(150,12,18), opacity 0.35–0.40, прозрачный центр 55%, цикл 8 с; отдельное затемнение сцены 10%. HUD выше слоя, pointer-events отсутствуют. Player-facing название — «Осада» / Siege, предупреждение в Archive исправлено на 24 часа.

Сохранены шесть фаз 100/30/100/20/50/120, budgets, дальнее кольцо, 00:00–06:00 и slowdown WorldClock ×3. Clock-only slowdown не меняет движение, combat, reload, animations и audio. Power/production продолжают использовать свои прежние домены времени. В этом corrective длительность и таблица фаз заново не измерялись: исторический `dayx-full-run.json` относится к предыдущему runtime и не выдаётся за новый результат.

## Полный regression pass

Выполнены **все 78 групп** на одном финальном runtime; после исправления ожидаемых балансных assertions повторялись только неуспешные группы. Завершено 73/78 групп без ошибок, агрегатор насчитал **13759 успешных assertions**. Общий статус suite остаётся **FAIL**, поскольку сохранены 8 ранее существовавших ошибок в пяти исторических группах. Все они отдельно воспроизведены на точном исходном ZIP; доказательство — `qa/results/siege-inherited-failures.json`. Они не скрывались и не исправлялись откатом героя.

| Группа | Сохранившееся историческое ожидание |
|---|---|
| `character-animation` | `simulation.exact028.MOBILE` |
| `character-animation` | `cache.noRepeatedLoadsOnPoseChanges` |
| `character-animation` | `memory.characterAtlasesWithin40MiB` |
| `master-unarmed` | `cache.noRepeatedRequestsAfterMovementRestAndEquipmentChanges` |
| `equipment-integration` | `cache.lazyStartupAndNoRepeatedRequests` |
| `player-visual-fix` | `cache.sharedViewsLoadedOnceNoPerFrameImages` |
| `player-visual-fix` | `fallback.M4ScaleAndMuzzleRemainAligned` |
| `polish` | `assets.noDuplicateImages` |

Эти проверки относятся к старому mobile snapshot, eager-cache/load counts, прежнему лимиту RGBA 40 MiB и fallback M4. Их наличие не означает подтверждённый новый дефект текущего героя; и автоматическую визуальную приёмку они не заменяют. Новые проверки `siege-corrective`: **12/12**, `siege-navigation`: **2/2**. Проверены Furnace input/timer/output с Save/Load, превращение при полном рюкзаке, отсутствие ресурсов, установленный source, удалённый доступ, cap, stale/foreign/duplicate request, HP миграция, scaling всех типов, wall damage, локализация и настройки. Day X lifecycle/save/DEV/audio, I1, Defense, Chapter 1, Research, Construction, Inventory, Pick Up и старые migration suites завершены.

### Изменённые ожидания тестов

| Файлы QA | Что и почему изменено |
|---|---|
| stage-h, stage-h-corrective, stage-h-visuals | Heavy создаётся через Automatic→transform; новые damage/cost/DPS; level проверяется только в saved registry; upgrade отклоняется; LOS цель помещена в новый range 300; материалы подготовлены в storage без переполнения bag |
| stage-i1 | 120 HP требуют 4×30 damage и 4 патрона; cooldown теперь 190 мс |
| systems, balance | динамические HP/Damage ×1.2…2 и speed ×1.6; фиксированный turret damage, новый weapon curve, Steel 4000; остальные oracle-поля прежние |
| hud-display | новое device default turretRanges:false |
| stage-i2, stage-i2-combat | Format22, 24h warning, конечные phase budgets вместо старого single-wave cap; профили различаются по фазам; minimal notice/vignette вместо удалённого Signal HUD |
| dev-qa | сравнение обычного gameplay с приложенной 0.41.1; living/corpse pool проверяется раздельно с dynamic cap |
| perf-equivalence | authoritative baseline 0.41.1; реальные off-zone combat/walls/ammo/instances; byte-identical damage не ожидается при новом балансе; timers flush |
| dayx-corrective | из strict unchanged guard исключены только явно изменяемые defense/runtime и crafting/manufacturing |
| dayx-full-run | добавлена balance metadata для будущего прогона; старый результат не переименован в новый |
| campaign-source-contract, stage-f | принятый source hash reference обновлён на объявленные Siege изменения; assets остаются строгими |
| audio-pass | boundary cleanup учитывает ×3 Clock; config guard допускает добавление Steel через source reference |
| world-events | timing boundary с slowdown; isolated owner получает SignalDefinitions; HP ratios старого save проверяются с исходным ×1.5 |
| stage-i2-contract, differential, stage3/4-differential, controls-differential | историческая projection сравнивает HP ratios с ×1.5, clock с ×3 и отделяет новых reinforcements; real save тесты используют непроецированные значения; +10% оружия проверяется отдельно по формуле, остальные поля точны. Бой Day10 против древнего runtime проверяет новые clock/health/wall invariants; обычные дни сравниваются полностью |
| localization | используется та же явно ограниченная historical projection; Steel и Siege проверяются в обоих языках |
| run-regressions | замены только в disposable копиях Stage0: HP504 вместо630 на Day10, level из registry; реальный Craft→transform→Place→Hold Pick Up вместо удалённого прямого Heavy craft. Frozen Stage0 файлы не менялись |
| run | подключены семь ранее отдельных Siege/DayX/I2 групп; checkpoint/retry сохраняет фактические результаты одного runtime |

Не менялись `stage-c1-recovery`, `stage-e`, `stage-c2-prerequisites`, `perf-upgrade`, `stage-d-complete`: их wall/Workbench/bunker contracts сохранены.

## Время кадра: 120 зомби у стен

Отдельный последовательный замер без параллельных regression процессов: одинаковые позиции и 120 реальных normal/fast/heavy/leaper, 15 warmup + 75 измеренных кадров, update + native Canvas2D draw. Requested DPR3, production render DPR2, viewport390×844; timers выполняются. Bloater не выбран, чтобы самоподрыв не уменьшал population во время короткого замера. Это x86 harness с modeled DOM, **не FPS телефона**.

| Runtime | Alive в конце | update p50, ms | update p95 | draw p50 | draw p95 | frame p50 | frame p95 | max frame |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline 0.41.1 | 120 | 5.322 | 9.429 | 13.143 | 14.777 | 18.588 | 22.353 | 29.464 |
| 0.41.2 | 120 | 5.270 | 9.097 | 9.703 | 12.979 | 15.009 | 20.237 | 23.124 |

Все значения, включая ухудшения, сохранены в `qa/results/siege-performance.json`. Короткий замер не доказывает 60 FPS на телефоне; targets не уменьшались. На реальном телефоне нужно проверить плотную финальную фазу, навигацию через город, читаемость светящихся целей, vignette, звук и настройку радиусов. Chromium/WebKit недоступен: browser/mobile/Telegram visual QA **не заявляется**; modeled layout и native Canvas проверки не заменяют его.

## Сохранность baseline и доставка

**265 защищённых файлов побайтно совпадают с исходным ZIP** (`qa/results/siege-protected.json`): hero.js, packed atlases, manifests, actors, assets и production DPR owner. Hero lazy load/unload, movement/animations/icons не изменялись. Autosave coalescing15s, lifecycle flush, verified-previous-save cache, tracers, I1 и кэш проходов сохранены. Список разрешённых source изменений — `qa/siege-source-reference.json`.

Runtime SHA-256: `5082c6a15ff058512ed8658421b6512cda0337c78bab94f5f0bd7ddef55e97bb`. `node tools/build.cjs --check` подтверждает соответствие исходникам. Финальный ZIP содержит source, assets, готовый js/game.js, QA и отчёт. Manifest перечисляет размер и SHA-256 каждого включённого файла (кроме самого manifest); отдельный verification JSON подтверждает CRC, manifest и соответствие рабочему дереву. Старые release reports/results в архиве — исторические, текущий статус определяется этим отчётом и `qa/results/summary.json`.

После этой сборки работа остановлена для проверки Claude и ручной проверки владельца. Новые Stage и Economy Balance Pass не начинались.
