# LAST BASE 0.36.0 — Stage E: Research + Blueprints

**Основа:** принятая LAST BASE 0.35.3 — Stage D Corrective. Stage E добавляет Research progression поверх её производственного цикла. Stage F, Level 2 и следующие этапы не начаты. Сборка предназначена для повторной ручной проверки.

## 1. Что реализовано

В физическом **Command Core → Research** появился законченный цикл:

**Получить пакет данных → сдать у Core → зарегистрировать Data / Blueprint → исследовать → получить право производства → обычный Craft → Inventory → Place / использование → Save → Load.**

Исследование — мгновенная authoritative транзакция с prerequisites и расходом Research Data. Оно не выдаёт предмет, материалы, установленную станцию или уровень улучшения. Для изготовления остаются обязательными прежние материалы, станция, питание и место в Inventory. Blueprint постоянный, не расходуется исследованием и не может быть случайно уничтожен как вещь.

### Доступные исследования

| Проект | Research Data | Дополнительное требование | Результат |
| --- | ---: | --- | --- |
| Изготовление станций / Station fabrication | 12 | Работающий физический Core | Доступ к рецептам дополнительных Furnace и Weapon Workbench в Core → Construction |
| Точное оружие / Precision weapons | 18 | Precision blueprint; право Station fabrication либо прежний Precision TECH | Рецепт M4 на существующем Weapon Workbench |
| Обслуживание Scout / Scout servicing | 15 | Scout service blueprint и установленная Drone Station | Разрешение на существующие платные улучшения корпуса, батареи и оружия в Enhancement Cradle |
| Эффективное производство / Production efficiency | 15 | Право Station fabrication | Доступ к прежнему платному улучшению скорости производства +20%; само улучшение ещё нужно купить за материалы |

Для нового мира общая стоимость — **60 Data**. Четыре старых TECH и их прежние пути/эффекты сохранены. Поэтому прежний Precision TECH остаётся альтернативным разрешением M4; Stage E не отменяет уже действовавшую progression.

### Гарантированные источники

Все три контролируемых источника показаны в блоке получения данных Research. Это конечный набор foundation, а не реализация Research Sites / exploration / World Events.

| Источник | Условие получения | Data | Blueprint |
| --- | --- | ---: | --- |
| Резерв диагностики базы | Работающий Core | 20 | — |
| Документация станции Scout | Установленная Drone Station | 20 | Scout service |
| Отчёт о восстановлении | Подтверждённое завершение Chapter 1; для импортированного старого мира — без повторного прохождения главы | 25 | Precision weapons |

**Всего 65 Data**, после всех четырёх новых исследований остаётся 5. Повторно фармить эти источники нельзя. Порядок трат не создаёт нехватку общего бюджета. Данные не добавлены в стартовые ресурсы и не изменяют стоимость ремонта.

Пакет до сдачи принадлежит actor. Получение пакета ещё не повышает доступный командный баланс. После сдачи Data, Blueprint и результат исследования принадлежат базе. Held packet хранится в progression ledger и не занимает backpack slot: полный bag не теряет награду и не создаёт второй Inventory. Удалить/продать/выбросить критический unlock нельзя.

## 2. Command Core и UX

Research встроен в существующую фиксированную оболочку Core. Header, tabs, размер и положение окна сохраняют прежний контракт; длинные карточки и список источников прокручиваются внутри выделенной области. На узком экране ряд tabs прокручивается горизонтально.

Есть компактные категории **Production / Weapons / Drones**, общий список, страница Blueprint и раскрываемая страница отдельного проекта. Пустых Base/Power/Defense категорий ради количества нет. Каждая карточка показывает человеческое название, конкретный результат, стоимость и причину недоступности. Состояния completed и право, сохранённое из старой версии, различаются. В RU/EN интерфейсе нет внутренних research/source/type/instance IDs.

Общая route-memory Core сохраняет Research, выбранную категорию или допустимую страницу проекта до выхода с Bunker Level 1. Leave Level 1 и load сбрасывают session UI state. В gameplay save это состояние не записывается. При бездействии Research не пересоздаёт DOM каждый tick.

Base Remote не получил Research/Construction/Chapters. Он по-прежнему использует общий Base Control. Tracker открывает отдельный Chapter/Objectives journal. Четыре старых TECH остаются в прежнем экране progression; дублирующая ссылка «Research» из footer Core заменена полноценной вкладкой, ссылка достижений сохранена.

## 3. Сохранённые contracts 0.35.3

- `type → instance`, реальные Inventory slots, оплаченный Craft в Inventory и отдельное Placement. Research добавляет только availability check к существующему Craft.
- Same-instance Pick Up / re-placement, Hold 3000 ms, запреты переноса занятой станции, сохранение condition/level/modules/settings. Упакованные объекты не имеют физических interactions/collision и не потребляют Power.
- Физические transform/rotation, footprint без PNG padding/shadow, wall-tight placement, critical-route validation, corridor restrictions, существующие лимиты экземпляров.
- Utility / Weapon recipe ownership, Furnace/Smelter, Storage, Generator/Fuel Tank/Battery/Drone Station и movable architecture. Дополнительные рецепты Generator и других инфраструктурных типов не введены.
- Общий Base Control для Core/Remote, независимые lighting/equipment switches, постоянные имена комнат. Room Priority gameplay не возвращён.
- Chapter 1 revision 6, Emergency Storage, отсутствие бесплатных Hammer/Pickaxe/Axe, craft первых инструментов, настоящий mining impact, functional repair Objective и продолжение progression.
- Pickaxe/Axe Lv.0–5, Tactical Flashlight, прежние lighting/audio/collision/navigation fixes.
- Все прежние migrations, actor/request/revision/idempotency contracts. Farm/Animals остаются на паузе до будущего Level 2.

New Game Chapter 1 проходится без единого исследования. Utility Workbench, Hammer, Pickaxe, Axe, базовый concrete/repair loop, Fuel, существующий Generator, Power и Core не gated. Имеющийся Furnace продолжает производить бетон: исследование ограничивает только Craft дополнительных станций.

## 4. Архитектура

`src/research/definitions.js` — data-driven категории, Research, Blueprint, технологии, источники, зависимости AND/OR, costs, output bindings и deferred hooks. `domain.js` — чистый owner без DOM/Inventory/renderer. `runtime.js` связывает его с Core, actors, campaign, save и общей `GameAvailability`. `src/ui/research.js` — клиент команд и отображение. Подробный контракт: `docs/STAGE_E_RESEARCH_CONTRACT_RU.md`.

Идентификаторы research, blueprint, technology, source отделены от type ID и instance ID. Recipe/buildable/upgrade references валидируются при запуске. Definition validation отвергает дубликаты, неизвестные зависимости, циклы, недостижимые Blueprint/Research, неправильные costs и binding targets.

`GameAvailability` применяется в UI и фактическом выполнении Construction Craft, Workbench Start и Scout Upgrade. Закрытый рецепт нельзя запустить прямым вызовом команды в обход disabled button. Материалы не списываются при отказе. Уже оплаченные production jobs не отменяются и завершаются по сохранённому контракту.

Новые источники в будущем добавляются definitions и authoritative eligibility facts от соответствующего owner. UI не может сам сообщить, что исследовательский объект найден. Новые игровые эффекты требуют отдельной реализации владельца эффекта; Research system не становится вторым Craft или универсальным движком будущего контента.

## 5. Save format 16 и миграция

Добавлена единственная migration **15 → 16**. Остальные migrations не заменены. Сохраняемый `research036` содержит баланс Data, completed research, discovered Blueprint, capabilities, compatibility entitlements, held/submitted packets, производные unlocked recipes/buildables/module paths и progression receipts. Research schema/content revision — 1.

### Существующий save 0.35.3

Все прежние владельцы сохраняются: ресурсы, Inventory/equipment instances, transform/placement, jobs/queues, Chapter state, room names, Base Control, tool levels и остальное состояние. Проверка миграции использует настоящий сохранённый мир из неизменённого runtime 0.35.3 и сравнивает каждый прежний корневой owner, а не только количество вещей.

Чтобы не отнять прежние права, migration сохраняет в отдельных legacy entitlements доступ к дополнительным Furnace/Weapon Workbench, M4 и существующим Scout body/battery/weapon upgrades. **Data = 0; Blueprint = []; completed research = []**. Эти права не отображаются как выполненное Research и не дают наград. Новая Workshop efficiency не выдаётся автоматически; ранее заработанный TECH/купленный эффект остаётся в старом owner.

Требование следующего исследования проверяет fabrication capability, включая сохранённое старое право. Это устраняет migration softlock: старому миру не приходится повторно исследовать уже доступную технологию, чтобы продолжить Research.

В новом мире legacy entitlements пусты. Уже находившиеся в мире/Inventory станции не исчезают из-за нового gate, а placements и повторные размещения не требуют повторного исследования.

### Валидация и повторная загрузка

Проверяются происхождение Blueprint, `submitted Data − research costs`, completed/capabilities, derived unlocks, profile, prerequisites из входящего save, число действий/revision, сигнатуры и результаты receipts. Повреждённый текущий owner отвергается до изменения мира. Capture/decode остаются чистыми; restore не выдаёт награды второй раз.

Текущее отсутствие питания или временно упакованная станция не отменяют ранее законное Research/получение пакета. При этом новая попытка исследования снова проверяет актуальные условия. Владение пакетом не теряется после save/load.

## 6. Multiplayer-readiness и небольшие исправления

Research использует существующий `EquipmentCommands` с отдельной revision/receipts, разрешённым actor и physical Core target. `obtain`, `submit`, `research` выполняются синхронно и атомарно. Сдача пакета проверяет владельца; другой actor не может сдать чужой пакет, но может пользоваться общим результатом после законной сдачи.

Идентичный duplicate request возвращает receipt без повторного debit/grant. Конфликтующая подпись, stale revision, wrong actor/target, недоступность Core, power/death/pause отклоняются. Окно receipts ограничено 128; после его вытеснения старый request блокируется revision и постоянной записью источника/исследования. Полноценный network transport не добавлен.

В процессе проверки минимально закрыты следующие края:

1. Зависимость от уже сохранённого права старой версии проверяется по capability, а не только новому completed flag.
2. Сданный Blueprint постоянен, полный bag не теряет пакет, перенос Drone Station после получения не уничтожает его.
3. Gate стоит перед реальным debit Craft/Upgrade, включая прямые вызовы.
4. Некорректные/cyclic payload отклоняются до сериализации команд. Receipt result и последовательность revision валидируются при load, включая попытку подменить количество Data.

## 7. Roadmap и принятая архитектура

**Roadmap intent preserved / implementation adapted to current accepted architecture.**

| Деталь старого Roadmap | Реализация Stage E |
| --- | --- |
| Unlock и ранняя схема станций | Общая availability policy поверх принятого Utility/Weapon/Furnace разделения; Universal Workbench не возвращён |
| Разблокировка оборудования | Только право существующего Craft → Inventory → Placement; без автоматического создания/установки |
| Носитель данных до сдачи | Actor-owned постоянная запись пакета; физический уничтожаемый предмет не введён, full bag не создаёт softlock |
| Scout Battery/Durability/Combat | Исследование разрешает уже существующие платные module upgrades на принятом Enhancement Cradle; Drone Station остаётся prerequisite |
| Scout Ammo Capacity | В 0.35.3 ёмкость ammunition фиксирована на 600, отдельного работающего capacity upgrade нет. Cargo module увеличивает груз, а не ammunition. Оставлен deferred hook; новый эффект в Stage E не выдуман |
| Sensor Range / Charging Speed | Только deferred hooks без карточек, unlock или gameplay |
| Физический Core | Research доступен в Core; Base Remote остаётся операционным интерфейсом |

Не добавлены Research Sites, сектора/exploration, Archive/story/video, Level 2, Farm/Animals, Defense expansion, Signal/Threat, endgame, новое дерево навыков или параллельная производственная система.

## 8. Проверки и performance

**Финальный полный regression pass: 56/56 групп, 12677 успешных автоматизированных проверок, 0 failed.** Все группы выполнены на одном неизменённом runtime. Отдельное сравнение performance запущено после regression, без одновременной нагрузки от тестов.

Runtime SHA-256: `7e147c04ddb67e03a4c62f7de554c1813987101a0ba59937132e2a51312b486a`.

| Основные группы | PASS | FAIL |
| --- | ---: | ---: |
| stage-e | 40 | 0 |
| stage-d-complete | 51 | 0 |
| stage-d-corrective | 87 | 0 |
| stage-d | 16 | 0 |
| stage-d-repair | 7 | 0 |
| stage-c2 | 33 | 0 |
| stage-c2-prerequisites | 25 | 0 |
| stage-c1-light-modules | 30 | 0 |
| stage-c1-recovery | 47 | 0 |
| stage-ab-corrective | 34 | 0 |
| stage-ab-light-audio | 12 | 0 |
| stage-b | 58 | 0 |
| campaign | 51 | 0 |
| state-saves | 58 | 0 |

Stage E: **40 сценариев**, **27 save/load boundaries**. Проверены настоящий New Game → Chapter 1 → ремонт → продолжение progression, Research Data/Blueprint, locked recipe и direct-command отказ, нехватка Data/Blueprint, owner/power/distance/pause, duplicate/conflict/stale requests, два actor в чистом owner, вытеснение окна 128 receipts, полный bag, пакеты и перенос Drone Station, unlock без бесплатной вещи, оплаченные upgrades/Craft, Inventory/Place/3-second Pick Up/same instance, M4 production/equip, save validation и миграция 0.35.3 с сохранением каждого старого owner. RU/EN проверены и для текста, и для accessibility attributes; исправлен старый русский alt у декоративной иконки Scout внутри нового экрана.

Прежние suites дополнены только учётом нового save owner/версии, четвёртой вкладки и законного Research setup перед Craft gated станций. Исторические fixtures не переписаны, старые source hashes сохранены через дополнительный слой Stage E source reference. Все 215 baseline asset files побайтно сохранены.

### Сравнение с 0.35.3

Исходный runtime 0.35.3 неизменён, обе версии используют одинаковые assets и все 57 audio buffers. Native Canvas2D, modeled DOM/WebAudio, DPR 1, zoom 0,65; 120 измеряемых кадров на сцену/версию после прогрева, чередование AB/BA. Измеряется CPU update/audio/draw с принудительным Canvas readback. Значения ниже — измерения данного shared host, **не FPS телефона/браузера**.

| Viewport / сцена | 0.35.3 p50 / p95, ms | 0.36.0 p50 / p95, ms | Δ p50 |
| --- | ---: | ---: | ---: |
| 390x844 / quiet_surface | 19,501 / 30,287 | 19,600 / 27,321 | +0,5% |
| 390x844 / stress_surface | 32,449 / 45,567 | 32,818 / 46,991 | +1,1% |
| 390x844 / bunker_hall | 21,545 / 32,816 | 22,466 / 36,363 | +4,3% |
| 390x844 / bunker_moving_lights | 27,033 / 73,933 | 23,449 / 38,355 | -13,3% |
| 390x844 / night_combined_lights | 31,482 / 51,029 | 31,015 / 45,036 | -1,5% |
| 390x844 / bunker_door_spill | 22,899 / 49,026 | 22,173 / 51,351 | -3,2% |
| 1280x800 / quiet_surface | 40,953 / 62,416 | 39,958 / 66,748 | -2,4% |
| 1280x800 / stress_surface | 62,046 / 149,360 | 60,811 / 235,107 | -2,0% |
| 1280x800 / bunker_hall | 49,057 / 82,063 | 49,229 / 72,587 | +0,4% |
| 1280x800 / bunker_moving_lights | 48,518 / 87,994 | 48,868 / 106,262 | +0,7% |
| 1280x800 / night_combined_lights | 60,798 / 79,662 | 59,541 / 90,408 | -2,1% |
| 1280x800 / bunker_door_spill | 47,878 / 67,871 | 46,918 / 107,949 | -2,0% |

| Нагрузка | Viewport | 0.35.3 p50 / p95, ms | 0.36.0 p50 / p95, ms |
| --- | --- | ---: | ---: |
| 3 новые станции | 390x844 | 22,726 / 49,018 | 23,903 / 34,395 |
| 3 новые станции | 1280x800 | 58,542 / 128,820 | 57,658 / 153,055 |
| 42 instances, 8 powered lamps | 390x844 | 27,182 / 40,375 | 37,596 / 132,166 |
| 42 instances, 8 powered lamps | 1280x800 | 36,120 / 48,877 | 43,626 / 138,263 |
| Реальный MOVE + следование Drone + свет | 390x844 | 27,955 / 54,091 | 26,044 / 39,487 |
| Реальный MOVE + следование Drone + свет | 1280x800 | 46,990 / 71,297 | 45,863 / 62,788 |

- Navigation: обе версии подтвердили 80/80 маршрутов; p50 10,212 → 14,875 ms.
- Base Control refresh: p50 3,966 → 5,103 ms.
- Room placement validation: p50 7,929 → 7,514 ms. Corridor validation остаётся отдельной дорогой геометрической проверкой: текущие p50/p95 93,039/113,448 ms. Закрытый placement не выполняет validation: 0 idle checks.
- Research/Core poll: закрытый p50 0,045 ms, открытый p50/p95 2,143/4,378 ms. В обоих idle случаях **0 повторных DOM renders**. Шесть реальных команд с обновлением UI: диапазон 3,748–4,664 ms; это одиночные действия, не усреднённый throughput benchmark.
- Save snapshot: 72000 → 72408 bytes; p50 1,545 → 1,266 ms. С 42 instances: 94041 → 94446 bytes, p50 1,539 → 1,563 ms.
- После двух Research и двух сданных источников Research owner занимает 2154 bytes; полный snapshot 71314 bytes. Decode p50/p95 18,411/28,276 ms.
- Runtime: 1856289 → 1902674 bytes (+46385; 2.50%). Новых image/audio assets нет, closed Research не добавляет самостоятельный game-loop tick.
- Lighting cache и отсутствие Drone ray-cast regression, 42 equipment instances, восемь powered lamps и реальное перемещение проверены. Runtime console errors в сравнении: 0.

### Перепроверка разброса и оценка

Первый последовательный замер 42 instances показал +38,3% / +20,8% p50 и крупные p95 выбросы. Он сохранён выше и в JSON. Для проверки выполнен отдельный прогретый повтор с чередованием AB/BA, 8 проходами и 240 измерениями на версию/viewport; физические instance records, transform и state двух миров дополнительно сравнивались на равенство.

| Повтор (240 кадров/версию) | 0.35.3 p50 / p95, ms | 0.36.0 p50 / p95, ms |
| --- | ---: | ---: |
| 390x844 / bunker_hall | 21,264 / 33,920 | 20,481 / 29,777 |
| 1280x800 / bunker_moving_lights | 45,105 / 66,311 | 46,088 / 96,369 |
| 1280x800 / bunker_door_spill | 44,307 / 56,176 | 45,108 / 69,690 |
| 390x844 / 42 instances, 8 lamps | 29,010 / 50,258 | 28,717 / 48,485 |
| 1280x800 / 42 instances, 8 lamps | 37,347 / 52,735 | 36,454 / 58,179 |

Крупное замедление dense-сцен **не воспроизвелось**: mobile p50 −1,0%, PC p50 −2,4%. При 120 последующих кадрах закрытый Research сделал **0 вызовов facts**. Повтор Base Control: p50 3,775 → 3,892 ms (+3,1%), p95 7,037 → 7,396 ms. Это отделяет первоначальный последовательный выброс от устойчивого роста средней стоимости игрового цикла.

При этом в отдельных PC lighting-сценах повышенный p95 сохранился: moving lights 66,311 → 96,369 ms, door spill 56,176 → 69,690 ms. В том же повторе p50 вырос примерно на 2,2% и 1,8%; mobile hall p50/p95 стали ниже. В dense PC p95 вырос 52,735 → 58,179 ms. **Полное отсутствие просадок не заявляется.** Причину этих верхних хвостов по shared-host CPU harness установить нельзя; это остаётся ограничением и пунктом ручной проверки/профилирования в настоящем браузере/WebView. Замеры не превращены в обещание телефонного FPS. Переоптимизация lighting/collision вне Stage E не выполнялась.

Полный автоматический функциональный/save gate и технический performance coverage gate пройдены, runtime errors нет. В архиве сохранены все три набора: `qa/results/stage-e-performance.json`, `stage-e-tail-performance.json`, `stage-e-dense-performance.json`; первый результат не заменён более удачным повтором.


### Ограничения автоматической проверки

В среде нет нативного Chromium/Firefox/WebKit и физического Telegram WebView/телефона. Mobile/PC режимы, RU/EN, handlers, route reset, fixed-shell CSS contract и сохранение DOM nodes проверены в модели; pixel layout, keyboard/touch feel, safe-area в реальном Telegram и субъективный звук требуют ручной проверки. Performance не измеряет GPU, реальную input latency или память устройства. Эти ограничения не подменены утверждением о пройденной ручной приёмке.


## 9. Что проверить вручную

1. **Новый мир:** пройти Chapter 1 revision 6 без Research — Emergency Storage, Utility Workbench, три инструмента, добыча камня, Fuel/Power, Concrete, обязательные функциональные ремонты, ночь и подтверждение главы у Core.
2. **Первый Research:** у работающего Core открыть Research, получить/сдать диагностический пакет. Убедиться, что held packet не даёт Data до сдачи. Изучить Station fabrication за 12 из 20 Data.
3. **Оборудование:** увидеть доступный рецепт Furnace/Weapon Workbench в Construction. Исследование само ничего не выдало. Craft за материалы занимает slot; Place отдельно, rotation/wall-tight/route checks. Hold Pick Up 3 секунды → тот же instance → повторное Placement.
4. **Blueprint:** получить/сдать Scout packet; Blueprint остаётся в списке после Research/save/load. Улучшение Scout требует прежних материалов и Enhancement Cradle; Research не повышает уровень сразу. До установки станции research недоступен.
5. **После главы:** получить Recovery report, исследовать Precision weapons, произвести M4 на Weapon Workbench, проверить отдельные материал/питание/job/collect/use этапы.
6. **Отказы:** недостаточно Data, нет Blueprint, нет питания Core, повторный click. Ни отрицательного баланса, ни двойного списания/выдачи. При полном Inventory данные не пропадают.
7. **Старый save 0.35.3:** проверить вещи, размещения, room names, Base Control, очереди и Tool levels. У старых открытых прав соответствующая отметка; новых Data/Blueprint/completed Research нет. Workshop efficiency можно исследовать через сохранённое fabrication право.
8. **RU/EN и телефон/Telegram:** вкладки, категория/детали, Blueprint список, читаемость и touch targets, portrait/landscape, безопасные отступы. Закрыть/открыть Core и проверить страницу; выйти на Surface и вернуться — default section. При переключениях header/tabs и внешнее окно не должны прыгать.
9. **Сохранение:** held packet, submitted packet, completed research, crafted Inventory instance, installed instance, picked-up instance, paid production job. После Load состояние и права совпадают, повторных наград нет.

## 10. Передача

GitHub-ready ZIP содержит актуальные source/runtime/assets, все прежние fixtures/migrations, новый frozen runtime baseline 0.35.3 для сравнения, regression и performance scripts/results, контракты, этот отчёт и SHA-256 manifest. Развернуть статические `index.html`, `js`, `styles`, `assets` вместе; для сохранения browser saves оставить прежний origin. Обратная загрузка save format 16 в старую 0.35.3 не поддерживается — сохраните старый export для возврата.

Текущие команды: `npm run test:e`, `LAST_BASE_TEST_JOBS=1 npm test`, `npm run bench:e`, затем `node --expose-gc qa/stage-e-tail-performance.cjs` и `node --expose-gc qa/stage-e-dense-performance.cjs`, `npm run package:e`. Старые отчёты/packaging scripts в архиве — исторические, текущая release manifest указывает Stage E.

**После Stage E работа остановлена для ручной проверки. Stage F и Level 2 не начаты.**
