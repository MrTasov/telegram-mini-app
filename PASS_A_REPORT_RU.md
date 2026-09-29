# LAST BASE 0.43.0 — Bunker L1 + L2 Pass A

## Статус и исходная сборка

Реализован только Pass A по FINAL V2. Pass B и следующая Stage не начинались. Результат передаётся для проверки Claude и владельца.

Работа начата заново из приложенного ZIP Claude; файлы и частичные результаты отменённого запуска не использовались. SHA-256 исходного ZIP: `6d397ac3d6b67984c4fb5efae7f30e99683a82399ef3f622abea6de4b4113988`. ТЗ находится в `docs/PASS_A_FINAL_V2_RU.md`, обе исходные картинки — в `docs/pass-a/`. Исходный ZIP прошёл CRC, 2562 записи. Финальный `js/game.js`: `a67551c9dec868f78e2e21f94efa5adaa77b664f141b6cbad1b687624453429e`.

## Планировка и доступ

- **L1:** зал шириной 800, высотой 1000; Core в центре; мастерская сверху слева, энергосектор сверху справа, Storage снизу справа. Восемь прежних ящиков с прежними ID; Emergency Container — первый у верхней стены. Шкафчик экстренной медицины у лестницы. Две нижние комнаты пусты, имеют обычный пол, открытые проходы и собственное освещение. Свет зависит от существующего Power, бесплатный источник энергии не добавлен.
- **L2:** отдельная физическая зона той же `bunker` scene. Kitchen, Medical, Bedroom слева; санузел доступен только через Bedroom. Pantry с прежними farm-ящиками и Feed Mill, Water Room, Chicken Farm, Cow Farm с шестью местами, свободный боковой коридор и ровно пять грядок справа. Дополнительных помещений нет.
- Переход L1 ↔ L2 — лестницы, без второй scene. Сбрасываются незавершённые локальные маршруты/preview; следующий за Player Drone переносится вместе с ним. Сохраняются координаты и явный floor; Continue на L2 возвращает на L2. Карта, камера, звуки и Base Control учитывают этаж.
- Kitchen Stove разрешена в Kitchen L2, Medical Lab — в Medical L2, Feed Mill — только Pantry. Rest и Shower используют прежние механики. Existing craft/Inventory/Placement и same-instance перенос сохранены.
- Kitchen Stove и Medical Lab не выдаются бесплатно при New Game: сохраняется существующее производство/Research. Ранее созданные станции мигрируются в Inventory и размещаются игроком на L2. Это трактовка пунктов о placement и переносе, без изменения принятого unlock/craft цикла.

## Farm, вода и время

`AgricultureTime` — удерживаемые логические миллисекунды; движение происходит только по прошедшим активным игровым минутам `WorldClock`. Закрытая игра, hidden tab, pause и смерть Player не дают Farm/Water прогресса. Siege slowdown ×3 влияет на Farm; DEV +час/+день двигает Farm вместе с WorldClock. Farm UI показывает игровые часы. Offline catch-up и чтение Date.now в росте/уведомлениях/ручном взаимодействии убраны.

Production jobs станций остаются в прежнем active real-time domain. Combat, movement, reload, audio, Power/Fuel/Battery не переводились на новые часы. Вода, рост, полив и READY spoil используют AgricultureTime. Farm/Animals старые тестовые таймеры не создают продукцию: Animals inactive, нет еды/воды/роста/размножения. Добавлены только зоны и consumer `animal_system` 0,4 kW, его gameplay-активность выключена.

| Культура / ID | Игровых дней | Урожай |
|---|---:|---:|
| Морковь / carrot | 1 | 10 |
| Лук / onion | 1 | 8 |
| Фасоль / beans | 1,25 | 10 |
| Картофель / potato | 1,25 | 10 |
| Зерно / grain | 1,25 | 12 |
| Кукуруза / corn | 1,5 | 12 |
| Помидоры / tomato | 1,5 | 9 |
| Ягоды / berries | 1,75 | 8 |
| Лекарственные / medicinal_herbs | 2 | 8 |
| Технические / technical_crop | 2 | 6 |

Сохранена вариация длительности растений ±10%. В save по-прежнему 50 records на грядку; активны первые N, остальные корректно закрыты. Рендерит только N крупных растений в две колонки. Seeds не добавлены.

READY начинается после последнего активного растения, затем даёт ровно два игровых дня. Partial harvest не сбрасывает срок; предупреждение за 0,5 дня. READY портится и при выключенном Power. ROTTEN блокирует новую посадку до очистки. Очистка даёт `ceil(оставшиеся растения / 4)` Plant Waste. При полном Backpack грядка остаётся испорченной. У отходов есть локальная команда «Выбросить» с подтверждением, проверкой актуального stack и receipt; глобальной Drop-system нет. Backpack/Storage урожай не портится.

Вода: 28 единиц/игровой день при питании; Clean Tank 100, irrigation buffer 40. Чистая вода автоматически пополняет buffer по трубам. Отбор 1/5/10 даёт обычный water в соотношении 1:1 с проверкой места. New Game Clean Tank пуст. Полив одной грядки — 4 единицы/день, пяти — 20; интервал 290000 + визуальная фаза 10000 логических ms. Воды хватает на паузу без смерти растений; отсутствие питания/полива останавливает GROWING, но не READY spoil.

Баланс централизован в `src/config/gameplay.js`, `GameplayBalance.farm`. Интерпретация water_system: один consumer 1 kW управляет цепочкой Pump → Purifier → Tank. Room lights независимы от water/irrigation.

## Save и migration

Save Format 24, миграция 23→24 через существующий pipeline. `bunker030.layout` остаётся 3, старые layouts проходят прежние migration шаги. Новый `bunker043` хранит floor, clean water, rot timestamps, command revision/receipts и уведомление о восстановленных instances. Owner зарегистрирован в GameState и GameSave.

- До exact-key validation добавляются недостающие rooms/devices/doors с enabled=true; сохранённые preferences/HP существующих дверей сохраняются.
- Displaced installed instances возвращаются в реальные Inventory slots, а при полном Backpack — в существующий legacy overflow. ID, condition, settings, job, paid inputs, queues/ready output не пересоздаются. При загрузке одно сообщение. Packed jobs стоят, после placement продолжаются и завершаются один раз.
- Существующие ящики не перенумеровываются; меняется transform/визуальное место. Unrelated item IDs и содержимое сохраняются.
- Старые 50 растений → первые N несобранных; duration/progress пересчитываются пропорционально до validation. Старые READY получают полные два дня.
- Старые 500 water → максимум 40 buffer + максимум 100 Clean Tank. Остаток сверх общей новой ёмкости не сохраняется и не дублируется.
- Проверены повторные Save/Load, full Backpack recovery, receipts, неверный floor до restore, возврат на нужный этаж. Backup/recovery сохранены.

## Power — фактический результат, без скрытого ребаланса

Тест: Generator работает, 100 fuel, Battery отключена; consumers включены, Furnace производит Iron. `qa/results/pass-a-power.json` содержит все устройства и allocation.

| Нагрузка | kW |
|---|---:|
| Furnace | 6,00 |
| Water system | 1,00 |
| Освещение L1 | 0,78 |
| Освещение L2 | 1,44 |
| Активные электрические двери | 0,72 |
| Command Core | 0,05 |
| Существующая турель hmg016_1 | 0,70 |
| **Всего demand** | **10,69** |
| **Generator supply** | **10,00** |

Фактически `served=[]`, `load=0`: существующая система при перегрузе отключает всю электрическую шину, включая Furnace, Water и свет. Не сохраняется питание «более важных» приборов. Irrigation 0,8 kW добавляет нагрузку, когда растут грядки; в указанном измерении грядки пустые. Animal system зарегистрирован, но inactive и нагрузку не добавляет. Это ограничение существующей энергетики оставлено намеренно по ТЗ; player может отключать независимые consumers через Core/Remote. Архитектура и номинал Generator не изменены.

## QA — фактические результаты

Новый runtime проверялся адресно после локальных исправлений. Результаты в `qa/results/`, сводка — `pass-a-release-summary.json`.

| Группа | PASS | FAIL |
|---|---:|---:|
| `pass-a` | 21 | 0 |
| `pass-a-jobs` | 1 | 0 |
| `pass-a-chapter` | 3 | 0 |
| `survival` | 27 | 0 |
| `siege-corrective` | 12 | 0 |
| `dayx-corrective` | 10 | 0 |
| `stage-i1` | 27 | 1 |
| `stage-e-corrective` | 19 | 1 |
| `stage-f-final` | 21 | 1 |
| `state-saves` | 58 | 0 |

Pass A охватывает новые clocks, crops/water/spoil, переходы и пути L2, сохранение пола, migration старой настоящей save с jobs, полный Backpack, exact keys, RU/EN, mobile-sized Canvas, Zombie contact всех существующих типов и открытые комнаты. Jobs отдельным тестом доведены до готового результата после re-placement и Save/Load, без повторного output.

Chapter test проходит настоящую цепочку New Game → Emergency Container → Craft/Inventory/Placement → первые инструменты → mining impact → Fuel/Generator → Concrete → обязательные repairs → ночь → подтверждение главы, с сохранениями на границах. Отдельно проверен ранний ремонт до активации Objective.

**Полный исторический suite был выполнен один раз: 79 групп, 28 exit=0, 51 exit≠0; legacy runner сообщил 12724 успешные проверки. Полный suite НЕ зелёный.** Он выполнен на runtime `23630179065de3382ef6baa59758efe00f69aa1a33b3d9470b379da669ccc697` до небольших финальных UI/owner/open-passage исправлений. Исходные JSON и checkpoint сохранены в `qa/results/pass-a-historical/`; исходные логи — в QA results и `docs/pass-a/regression.log`.

Большая часть каскадных отказов вызвана старыми координатами Core (y=680 вместо y=440), прежними room bounds, ожиданием Farm unavailable/L2 sealed, старого Save Format, побайтовой неизменности расширяемых migration blocks и замороженного crop balance. В актуализированных адресных проверках I1 все 27 игровых сценариев прошли; оставшийся тест требует полной неизменности v09 после migration, несовместимой с новыми ключами. Research — 19 игровых/UI проверок прошли, один старый тест ожидает прежние координаты Player внутри изменившейся геометрии. Archive/Intro — 21 проверка прошла, один старый migration snapshot ожидает отсутствие новых Power keys. Эти три старых ожидания не выданы за PASS. Остальной исторический набор не был полностью переписан под Pass A, что остаётся ограничением QA.

В промежуточных тестах исправлены неверный ожидаемый yield (12 вместо 10) и язык запуска проверки русского текста backup-status; последний тест state/saves прошёл 58/58 при явном RU. Бесконечных повторов или полного перезапуска разработки не было. Финальная поправка открытых проходов проверена новым тестом и повтором Chapter/save сценариев. Хэши отдельных прогонов позволяют видеть, какие проверки предшествуют этой поправке.

## Performance

Native Canvas2D + modeled DOM, 390×844, requested DPR 3, реальный production DPR 2. 20 кадров прогрева и 80 измеряемых кадров, flushTimers. Последовательно, без конкурентных QA в период измерения. Это короткая диагностика стоимости update/render, **не FPS телефона/Telegram и не длительный soak test**.

| Runtime / сцена | Живых enemies | Update p50 / p95, ms | Draw p50 / p95, ms | Frame p50 / p95, ms |
|---|---:|---:|---:|---:|
| attached 0.42.0 / l1 | 0 | 3.49 / 7.55 | 9.02 / 10.81 | 12.65 / 17.03 |
| Pass A / l1 | 0 | 5.19 / 9.07 | 7.96 / 10.07 | 13.16 / 17.58 |
| attached 0.42.0 / siege120 | 120 | 4.91 / 9.08 | 10.80 / 13.09 | 15.86 / 20.74 |
| Pass A / siege120 | 120 | 6.30 / 10.02 | 10.98 / 12.05 | 17.17 / 20.69 |
| Pass A / l2farm | 0 | 5.32 / 8.70 | 10.19 / 12.74 | 15.71 / 20.91 |

120 участников действительно присутствуют в обоих Siege прогонах. Все пять измерений завершились в пределах лимита, runtime errors отсутствуют. Первая серия также сохранена в `qa/results/pass-a-perf-first/`; невыгодные значения не удалялись. В первой серии L1 frame p50 вырос 11,91→13,46 ms, Siege 17,04→18,31 ms; update p50 L1 3,37→5,31 ms. Дополнительные комнаты/Power/вода увеличивают update cost; нельзя обещать сохранение 60 FPS на физическом телефоне по этому harness. Targets и combat не урезались ради результата.

## Сохранность Claude и локальные corrective

Все файлы `assets/`, включая packed hero atlases, исходные иконки и 3D-zombies, совпадают с baseline побайтно. `src/render/hero.js`, `src/render/zombies.js`, `src/render/actors.js`, `src/assets/manifest.js` не изменены. Доказательство пофайловыми SHA-256 — `qa/results/pass-a-preservation.json`. Packed/lazy/unload hero architecture не заменялась. Реальная память на телефоне в этом запуске отдельно не измерялась.

Сохранены production DPR≤2, pooled tracers, autosave coalescing 15 s и lifecycle save, I1/I2 owners, Siege, Defense, Research/Archive/Intro, tool levels, Base Remote, Inventory instances, Chapter 1 revision 6, Survival. Zombie corrective ограничен контактной дистанцией radiusZombie+radiusPlayer, без переписывания AI/pathfinding/Siege.

Локально исправлены: floor-aware Base Control map, floor-aware звук перенесённого оборудования, registration нового save owner, проверка bad floor, доступность busy instance только при migration recovery, закрывающая анимация у постоянных открытых проходов. Новых крупных systems не добавлено.

## Ограничения и ручная проверка

- Chromium/WebKit не доступны. Схемы этажей просмотрены через настоящий Canvas2D, файлы `qa/results/pass-a-L1.png` и `pass-a-L2.png`; PC browser, настоящий телефон/Telegram, safe areas и touch требуют проверки владельцем. Modeled DOM не заменяет эту проверку.
- Полный исторический suite имеет отказы, описанные выше; результат не следует трактовать как 79/79 PASS. Перед дальнейшей стадией полезно актуализировать старые fixtures отдельно, без изменения gameplay.
- Не проводился длительный мобильный memory/performance soak. Power overload 10,69>10 kW оставлен как требовалось.
- Water fixtures используют существующую art и простую Canvas-геометрию. Новые art assets не генерировались. Kitchen/Medical станции сохраняют существующий craft/unlock workflow; не устанавливаются бесплатно.
- Проверить на реальном save: перенос станций/jobs при полном Backpack; L1→L2→Save→Continue; Farm→Pantry→Kitchen; душ из Bedroom; READY partial harvest→Power OFF→ROTTEN; Waste при полном Backpack; переключатели воды/полива отдельно от света; Siege на Surface при Player на L2.

Других осознанных отклонений от FINAL V2 не вводилось. Pass B — только после отдельного принятия и нового ТЗ.

## Изменённые source/data файлы

Полный список baseline→output hashes — `PASS_A_CHANGESET.json`. Помимо source/data, обновлены version/README, добавлены QA, ТЗ/референсы и release manifest.

- `locales/ru.json`
- `locales/en.json`
- `locales/legacy.json`
- `src/manifest.json`
- `src/config/gameplay.js`
- `src/world/camera.js`
- `src/inventory/upgrades.js`
- `src/equipment/placement.js`
- `src/equipment/instances.js`
- `src/equipment/runtime.js`
- `src/crafting/manufacturing.js`
- `src/render/lighting.js`
- `src/i18n/catalogs.js`
- `src/audio/world.js`
- `src/audio/runtime.js`
- `src/ui/base-control.js`
- `src/ui/command-core.js`
- `src/combat/monsters.js`
- `src/drones/interface-power.js`
- `src/save/new-game.js`
- `src/save/envelope.js`
- `src/save/finalize.js`
- `src/save/format.js`
- `src/save/slots.js`
- `src/save/legacy-progress.js`
- `src/farm/manual.js`
- `src/farm/growth.js`
- `src/core/rendering.js`
- `src/core/input-combat.js`
- `src/core/interactions-farm-storage.js`
- `src/base/rooms.js`
- `src/base/battery.js`
- `src/base/control.js`
- `src/base/power.js`
- `src/base/layout.js`
- `src/base/level1.js`
- `src/survival/items.js`
- `src/base/pass-a.js`
