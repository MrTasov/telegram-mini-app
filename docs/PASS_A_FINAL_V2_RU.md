# LAST BASE --- Bunker L1 + L2 --- PASS A --- финальное ТЗ для Astra

## 0. Основа и порядок

Authoritative baseline: LAST BASE 0.42.0 Survival + последний принятый
Claude Survival/UI patch + последний Claude Zombies Patch v2. Последние
L1.png и L2.png владельца --- authoritative visual reference. На L2
ровно 5 грядок.

Это один Bunker Stage, разделённый на два прохода. Сейчас реализовать
ТОЛЬКО Pass A. Pass B (новые правила животных) не начинать. После Pass A
--- отдельный ZIP, RU-отчёт, проверка Claude и владельца.

Не откатывать Survival 0.42.0, hero-memory optimization, новые 3D-зомби,
Siege, Defense, Research, Base Control, Construction/Placement, Power и
Save/Load contracts.

## 1. Level 1 --- «Фронт»

Следовать L1.png: - центральный зал: Command Core, лестница Surface и
лестница L2; - мастерская слева вверху: Furnace, Weapon Workbench,
Workbench; - энергосектор справа вверху: Fuel Tank, Generator, Battery,
Drone Station; - Storage справа внизу: 8 подписанных ящиков ---
Аварийный контейнер, Оружие, Железо, Материалы, Еда, Напитки, Медицина,
Разное; - Аварийный контейнер остаётся первым ящиком у верхней стены,
чтобы Chapter 1 contract не ломался; - две нижние комнаты пустые,
открытые, освещённые, обычный пол; ничего временного туда не ставить; -
шкафчик экстренной медицины у лестницы; - зал не увеличивать; - обновить
Power/light mapping под новые комнаты.

## 2. Level 2 --- «Тыл»

Следовать L2.png, новых помещений не добавлять: - главный вертикальный
коридор, вход сверху; - Kitchen слева вверху: Kitchen Stove; - Medical
Room слева посередине: Medical Lab + medical bed; - Bedroom слева внизу:
существующий Rest; - Shower/Toilet слева от Bedroom, вход только через
Bedroom; - Pantry справа вверху: farm/food storage + Feed Mill
(`feed_craft`); - Water Room: Pump + Purifier + Clean Water Tank; -
Chicken Farm и Cow Farm (6 stalls) --- физические зоны, gameplay
животных пока inactive; - Side Corridor свободный; - Crop Area: ровно 5
beds + irrigation buffer.

Маршрут: Farm → Pantry → Corridor → Kitchen.

### Критический архитектурный контракт L2

**L2 НЕ делать отдельной game scene.** Текущий bunker остаётся одной
сценой. L2 реализовать как отдельную физическую **зону той же bunker
scene**, с переходом по лестнице L1 ↔ L2, по тому же принципу, по
которому существующая выключенная Farm уже живёт внутри bunker
architecture.

Не переписывать \~существующие scene-level contracts ради L2. Surface ↔
Bunker остаётся существующим переходом; внутри Bunker добавляется
zone/floor transition L1 ↔ L2.

Save/Load обязан сохранять не только координаты Player, но и его текущий
floor/zone. Save, сделанный на L2, после Continue должен восстановить
Player именно на L2, а не на L1.

**Не поднимать/не менять layout version так, чтобы old saves перестали
проходить validation.** Если нужен новый layout marker, мигрировать
старое значение до validation по существующим правилам проекта.

## 3. Перенос систем / placed instances

Kitchen Stove разрешён только в Kitchen L2. Medical Lab --- только
Medical Room L2. Bed/Shower переезжают на L2 с прежней механикой.

Установленные на L1 instances, чьё допустимое место исчезло, при
migration вернуть в Inventory без потери и дублирования, с одним
понятным сообщением.

L2 безопасен во время Siege. Cargo Lift/shared storage не добавлять.

## 4. Farm time --- только активное игровое время

Никакого offline progression.

`AgricultureTime` хранить как существующие удерживаемые логические часы
и двигать синхронно с активным `WorldClock` (по прошедшим игровым
минутам, сохраняя совместимость существующих ms-duration contracts): -
стоит при закрытой игре, hidden tab, pause, смерти Player; - Siege
slowdown ×3 влияет на Farm; - DEV time advance двигает Farm.

Убрать Farm-зависимости от `Date.now()` в найденных Claude местах
(`farm/manual.js`, `useFarmBed`, crop-ready notification,
legacy/farmElapsed) и убрать offline catch-up/savedAt growth logic.

UI farm timers показывать в игровых часах.

## 5. Power L2

Через существующую Power architecture зарегистрировать уже в Pass A: -
`water_system` ≈ 1.0 kW; - `irrigation014` ≈ 0.8 kW, название Farm
irrigation + grow lights; - `animal_system` ≈ 0.4 kW.

Room lights отдельно.

Power OFF: - Water production pause; - GROWING crops pause; - future
Animals systems pause; - никто не умирает; - READY crop spoil timer НЕ
останавливается.

Критично: `V09Power.validate` требует точные
`roomEnabled/deviceEnabled`. Мигрировать old saves, добавить новые
room/device keys, missing new keys default=enabled.

## 6. Crop balance

Все числа централизованно по ID, например
`GameplayBalance.farm.crops[id] = {days,yield}`.

  Crop            ID                    Days   Yield
  --------------- ------------------- ------ -------
  Морковь         `carrot`               1.0      10
  Лук             `onion`                1.0       8
  Фасоль          `beans`               1.25      10
  Картофель       `potato`              1.25      10
  Зерно           `grain`               1.25      12
  Кукуруза        `corn`                 1.5      12
  Помидоры        `tomato`               1.5       9
  Ягоды           `berries`             1.75       8
  Лекарственные   `medicinal_herbs`      2.0       8
  Технические     `technical_crop`       2.0       6

±10% variation можно сохранить. Seeds не добавлять.

### Меньше растений визуально, save compatibility сохранить

Save-array `plants014` оставить длиной 50. При новой посадке активны
только первые N records согласно yield; остальные сразу валидно
inactive/harvested. Визуально рисовать только N активных растений
компактно по центру bed (ориентир 2 columns × 3--6 rows), крупнее
старых.

Old saves: сохранить первые N несобранных, остальные корректно закрыть.
Старые duration/progress пересчитать пропорционально ДО validation.

## 7. Созревание и гниение

States: `GROWING → READY → ROTTEN`.

-   READY --- когда готово последнее активное растение bed.
-   После READY: ровно 2 игровых дня на Harvest.
-   UI: remaining game hours.
-   За \~0.5 day --- тихое base notification.
-   Partial harvest не сбрасывает timer.
-   Портится только урожай на bed; Backpack/Storage не портятся.
-   READY→ROTTEN идёт даже при Power OFF.
-   ROTTEN нельзя засадить до очистки.
-   Ready beds из old saves получают полные 2 дня.
-   Rot state хранить отдельным совместимым save block.

## 8. Plant Waste

Добавить `plant_waste`, RU «Растительные отходы», EN `Plant Waste`,
stackable, `discardable:true`.

Количество: 1 Waste на каждые 4 сгнивших растения, округление вверх.

Очистка ROTTEN bed кладёт Waste в Backpack. Если места нет --- bed
остаётся ROTTEN и сообщение «Освободите место в рюкзаке».

Только для `discardable:true`: Item Details → «Выбросить» → confirmation
→ удалить stack. Не создавать глобальную Drop-system.

Никакого Compost/Fertilizer в Pass A.

## 9. Water System

Цепочка: Pump → Purifier → Clean Water Tank. Только при Power ON.
Offline production отсутствует.

Финально: - **Clean Water Tank capacity = 100**; - irrigation buffer
capacity = **40** (вместо 500); - Purifier output = **28 water / game
day**; - ориентир consumption: crops \~20/day, future max animals
\~9/day, Player+cooking \~4/day, total \~33/day.

Все числа в balance settings.

При migration старого irrigation tank: - максимум 40 оставить в
irrigation buffer; - surplus перелить в Clean Water Tank до cap 100; -
не дублировать воду.

Clean Tank новой игры пустой. Irrigation buffer получает воду по трубам.
В будущем drinkers тоже. Player может набирать обычный `water`.
Loot-water остаётся полезной.

### Полив и единицы воды

Новый баланс Farm должен реально давать около **20 water / game day для
5 beds**, а не сохранять старый интервал, рассчитанный под 50 растений.

Цель: **4 water / bed / game day**. Пересчитать irrigation interval в
AgricultureTime-domain (ориентир Claude: примерно **250--350 секунд
эквивалента farm-clock между поливами**, вместо старых 60--120 с; точное
значение централизовать в balance settings), сохранив существующую
\~10-секундную фазу визуального полива, если она не конфликтует с новой
моделью.

**1 единица Clean Water = 1 обычный item/bottle `water`**, когда Player
набирает воду из Clean Water Tank. Никаких скрытых коэффициентов.

## 10. Feed Mill

Existing `feed_craft`. Placement rule: только Pantry L2. Не ставить в
Side Corridor. Existing feed recipes сохранить.

## 11. Animals в Pass A --- только инфраструктура

Pass B НЕ реализовывать.

Уже в Pass A зарегистрировать `animal_system` Power device и физические
animal zones. Gameplay flag Animals = unavailable/inactive.

В Pass A Animals: - не производят Eggs/Milk; - не едят/пьют; - не
растут; - не размножаются; - legacy test timers не работают.

Не делать brooding/calves/stages/new trough capacities/animal
behaviour/visual hook --- это Pass B.

## 12. Zombie contact corrective

Zombie не входит центром в Player. Минимальная дистанция контакта =
zombie collision/contact radius + player radius. AI/pathfinding/Siege
navigation не переписывать. Проверить крупные новые 3D-zombies.

## 13. Save/Load migration checklist

Обязательно покрыть: 1. Power exact-key migration для rooms/devices **и
door keys/count/state**. 2. Old placed Kitchen Stove/Medical
Lab/displaced instances → Inventory без потерь/дубликатов. 3. Old crop
durations/progress → proportional conversion before validation. 4. Old
50-active beds → N-active compatible layout. 5. Irrigation tank 500 →
buffer 40 + surplus Clean Tank ≤100. 6. Remove offline catch-up without
breaking `agricultureAt`. 7. READY/ROTTEN save block. 8. `plant_waste` +
RU/EN. 9. Chapter 1 Emergency Container contract. 10. Existing box IDs,
включая используемые Farm/production IDs, и unrelated item IDs не
менять; переезд ящиков --- только layout/visual placement. 11. Survival
0.42.0 + Claude patches + Zombies v2 сохранить.

Old saves должны загружаться без ошибок.

### Power-load behavior --- не скрывать

Существующая энергетическая архитектура/приоритеты не менять самовольно
ради L2. По текущей базе Generator ≈ **10 kW**, одна Furnace ≈ **6 kW**;
при одновременной высокой нагрузке L2 может быть отключён существующей
системой приоритетов/перегруза.

В RU-отчёте Astra обязана показать фактический power budget после Pass A
и сценарий перегруза (например Furnace + L2): какие consumers остаются
включены/отключаются и почему. Если фактические цифры baseline
отличаются, указать реальные значения, не подгонять их скрытно.

## 14. Performance / QA

Не добавлять per-frame inventory searches или тяжёлые render effects.
Farm/Water tick дешёвый. Проверить mobile-sized runtime и Siege 120
participants, не ломать hero-memory packed/lazy/unload.

Новый QA Pass A минимум: - L1/L2 transition/layout/doors/placement; - 5
beds; - crop days/yields; - N active/visible while save array=50; - DEV
time; - hidden/pause/death no AgricultureTime; - no offline catch-up; -
Siege slowdown affects Farm; - Power OFF pauses GROWING, не READY
spoil; - READY→ROTTEN 2 days; - partial harvest; - Waste/discard/full
Backpack; - Water 28/day, Clean Tank cap100, irrigation cap40; -
old-water migration; - Power exact-key migration rooms/devices/doors; -
old crop save migration; - placed station recovery; - Feed Mill only
Pantry; - Animals inactive; - Zombie contact; - Chapter 1 Emergency
Container; - RU/EN; - Save/Load round-trip; - full regression suite.

## 15. Deliverable / STOP

После Pass A: 1. GitHub-ready ZIP; 2. подробный RU report; 3. changed
files, migrations, balance locations, QA, performance; 4. явно
перечислить отклонения от ТЗ; 5. остановиться.

**Pass B не начинать. Следующую Stage не начинать.**

Pass A сначала проверяет Claude, затем владелец. Только после принятия
Pass A будет отдельное ТЗ Animals Pass B.
