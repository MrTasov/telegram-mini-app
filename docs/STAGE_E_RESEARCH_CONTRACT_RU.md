# LAST BASE 0.36.0 — контракт Research / Blueprints

Исходная версия — принятая **0.35.3 Stage D Corrective**. Save format 16; Research schema/content revision 1. Контракты оборудования, переносов, производства, главы и Base Control не заменены.

## Владение и идентичность

- `typeId` выбирает вид предмета/оборудования, `instanceId` — физическую сущность. Research использует собственные `research.*`, Blueprint — `blueprint.*`, capability — `technology.*`, источник — `source.*`.
- `research036` — единственный сохраняемый владелец Data, пакетов, Blueprint, completed research, technologies, compatibility entitlements, производных unlocks и receipts.
- Пакет до сдачи принадлежит actor. Один источник можно получить один раз на мир. После сдачи Data/Blueprint принадлежат базе; исследование другого разрешённого actor использует общий результат.
- Пакет не является уничтожаемым физическим предметом и не занимает Inventory slot. Это progression ledger, а не второй backpack. Полный bag не мешает получить или сдать пакет. Все физические buildables по-прежнему занимают реальные slots.

## Команды

`GameResearch.request(action, payload)` — local client adapter; `GameResearch.execute(command)` — вход authoritative owner. Команда содержит actorId, instanceId физического Core, requestId, expectedRevision, action и payload. Target Core остаётся instance ID; research/source передаются только в payload.

| Action | Payload | Атомарный результат |
| --- | --- | --- |
| `obtain` | `{sourceId}` | Eligibility проверяется; actor получает постоянную запись held |
| `submit` | `{sourceId}` | Проверяются владение и held; пакет становится submitted, начисляются Data и регистрируются Blueprint |
| `research` | `{researchId}` | Проверяются prerequisites, Blueprint и Data; один debit и запись capability |

Каждая успешная команда увеличивает общую revision один раз. Receipt содержит actor/request/signature/result. Идентичный повтор возвращает прежний результат; конфликт request/signature и stale revision отклоняются. После вытеснения receipt из окна 128 старую заявку останавливают revision и постоянное состояние source/completed. Ошибка не меняет Data, материалы или сущности.

Используется существующий `EquipmentCommands` и `GameConditions`, с отдельным состоянием Research. Physical Core access, power, actor permissions, pause/death/load проверяются перед мутацией. UI не записывает progression. Сетевой транспорт не добавлен. Local adapter разрешает local actor; чистый domain проверен с двумя actor через явный authorization port.

Eligibility источника проверяется при получении. Временно убранная после этого Drone Station не уничтожает held packet и не препятствует сдаче у работающего Core. Для самого Scout research установленная Station снова требуется.

## Общая availability policy

`GameAvailability` применяется одновременно в списках UI и в реальном выполнении Craft/Upgrade:

- Construction читает `bindings.buildables` перед расходом материалов и выделением instance.
- Workbench/Furnace читает recipe availability перед стартом платного job.
- Enhancement Cradle читает `bindings.droneModules` перед платным повышением модуля.
- Старые четыре TECH сохранены; `legacyBindings` подключает новые capability к прежним платным улучшениям.

Research никогда не вызывает `addItem`, создание equipment instance, placement или повышение level. Уже оплаченные jobs сохраняют прежние права завершения/выдачи; research не пересчитывает и не отнимает их.

## Данные и расширение

`src/research/definitions.js` содержит проекты, категории, Blueprint, технологии, источники, условия AND/OR, output bindings и отложенные hooks. RU/EN строки — в `locales/*.json`. UI генерирует карточки и причины недоступности из этих данных. Нет дерева навыков и пустых категорий.

При добавлении технологии нужны definition, переводы, существующая production destination и её binding. Новый источник добавляется definition + authoritative fact adapter для eligibility. Будущие Research Sites/Events должны предоставлять проверяемый owner fact; UI не может объявить находку от своего имени. Для неизвестного производственного эффекта потребуется отдельная реализация owner, а не код внутри Research UI.

Definition validation проверяет identity namespace/дубликаты, известные facts/Blueprint/technology, единственного владельца технологии, стоимость и суммарный бюджет, достижимость Blueprint и проектов, циклы зависимостей и binding targets. Действующий набор — четыре проекта, две Blueprint, три источника. Ammo Capacity, Sensor Range и Charging Speed оставлены только deferred hooks без unlock/effect/UI.

Существующие IDs, цены и размеры уже сданных источников — часть save contract. Append нового definition с новым ID не меняет старый ledger. Изменение прежней цены/награды или удаление ID требует явной content/save migration; нельзя молча пересчитать историю старого мира по новой экономике.

## Save и migration

Новая migration 15 → 16 добавляет `research036` с профилем `legacy`. New Game явно создаёт `new`. В формате 16 отсутствие/повреждение owner — ошибка, а не причина выдать всё unlocked или молча начать с нуля.

Legacy entitlements сохраняют только права, уже доступные в 0.35.3: дополнительные Furnace/Weapon Workbench, M4, существующие Scout body/battery/weapon upgrades. Они не считаются завершёнными исследованиями и не начисляют Data/Blueprint. Новая эффективность не выдаётся; старый TECH/купленный эффект сохраняется в прежнем owner.

Prerequisite на fabrication проверяет capability, включая сохранённое legacy право. Иначе старый save оказался бы заблокирован: повторно исследовать уже доступную технологию нельзя, а следующее исследование требовало бы её completed flag.

Валидация проверяет баланс `submitted Data − completed cost`, происхождение Blueprint, соответствие технологий завершённым проектам, производные unlocks, профиль, prerequisites, число действий/revision и receipts. Условия текущей физической установки/питания не применяются ретроактивно к уже выполненным действиям. Campaign/legacy prerequisites берутся из импортируемого save, а не текущего живого мира.

Capture/decode не меняют мир. Restore выполняется в существующей save pipeline после проверки, без повторных наград/событий. Все прежние migrations и import overflow механизмы Inventory остаются.

## UI и границы

Research — настоящий раздел физического Command Core в его фиксированной оболочке. Внутренний контент прокручивается, tabs на узком экране поддерживают горизонтальный scroll. Подробность проекта и категория используют общий session route; leave Level 1/load сбрасывают UI state. В gameplay save UI state не пишется.

Base Remote сохраняет только Base Control. Journal остаётся campaign-only. Нет Stage F Archive/видео, новых секторов, Level 2, Farm/Animals, Defense/Signal/endgame, новой Craft system или сетевого транспорта.
