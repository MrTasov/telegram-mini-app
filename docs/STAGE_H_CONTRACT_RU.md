# Stage H — contracts 0.39.0

## Область изменения

Принятая 0.38.0 — неизменяемая база сравнения. Новый контент: только
Automatic Turret, Heavy Turret и Searchlight. Дополнение пользователя расширяет
ранний Roadmap «один тип», но сохраняет его цель: fixed-perimeter surface
placement и восстановление после прорыва. Roadmap intent preserved /
implementation adapted to current accepted architecture.

## Владельцы состояния

| Состояние | Единственный владелец |
|---|---|
| type ID, instance ID, transform, placement, owner | EquipmentInstances / GameEquipment |
| HP/maxHP, ammo, level, angle, legacy support/fallen | state того же equipment instance |
| ON/OFF и выделение Power | существующий V09Power |
| Материальный носитель в рюкзаке | один equipment_case с instanceId |
| Командные receipts/revision | defense039.commands; прежние placement/control receipts |
| Target, cooldown, muzzle flash, временный поворот | transient runtime; не второй save owner |

DefenseDefinitions — данные стоимости, корпуса без PNG padding, HP, Power,
DPS, range и пределов. ResearchDefinitions.bindings.buildables остаётся общей
точкой будущих gates; в H новых gates нет. Buildable не выдаётся за Research.

## Placement и lifecycle

Core → Craft → настоящая ячейка Inventory → существующий Placement authority.
Turrets: разрешённые площадки внутри поверхностного периметра. Searchlight:
те же площадки и действующие помещения Level 1. Поворот корпуса дискретный,
направление головки прожектора независимое и сохраняется после подтверждения.

Validation использует физический корпус, стены, ворота, лестницы, защищённые
полосы и связность сетки проходов. Уничтоженные стены продолжают резервировать
площадь для восстановления. Проверка подходит ли игрок к объекту принимает
координаты кандидата пути; не подменяет их текущей позицией игрока.

HP=0: объект остаётся восстанавливаемым instance, не стреляет/светит/потребляет
Power, не оставляет физический solid. Rebuild проверяет свободное место,
проходы, молот и стоимость; тот же ID, ammo и level сохраняются. Потеря
старой wall mount опоры переводит HMG в fallen, затем Hold Pick Up → Place
восстанавливает нормальную установку. Не создаются бесплатные дубликаты.

Pack: прежний 3-second hold, один instance token. Нет collision, interaction
или Power у упакованного объекта. Восстановление не создаёт новый тип/ID.

## Команды и multiplayer-readiness

UI вызывает GamePlacement, GameDefense или GameBaseControl. GameDefense
использует EquipmentCommands: actor authorization, local reach, revision,
request identity и persisted idempotency receipts. Снимок state в команде
защищает от расхода по устаревшему состоянию после боевого урона. Combat damage
остаётся simulation port; пользовательский UI не получает arbitrary damage.
Full network transport и off-screen battle не добавлены.

## Save Format 19

Миграция 18→19 переносит turret016.guns в equipment032 с прежними hmg016 IDs,
ammo/level/angle/enabled/transform. Старый allocator остаётся для уже оплаченных
заказов. turret016.guns после миграции пуст: нет двойного runtime owner.

Старые HMG tokens в рюкзаке становятся equipment_case в той же ячейке.
HMG из других пулов попадает в существующую carry0353.legacyOverflow с тем же ID
и состоянием; старый token удаляется. Это import-only recovery, а не новое
хранилище для создания оборудования. Сбор готового старого заказа идёт через
существующий manufacturing output с дебетом ровно выданного количества.
Новые заказы старого рецепта закрыты, новый craft выполняется через Construction.

Данные Research/Story/Sectors/Chapter/Base Control, room names, инструменты,
свет/аудио и предыдущие owners не заменяются. Все прежние миграции остаются.

## Проверки и пределы

Новые сценарии проверяют реальные команды, save round-trips, replay/conflict,
материалы, HP, боезапас, LOS, питание, движение, repair/rebuild, старые заказы,
полный рюкзак и старые сейвы. Исторические frozen fixtures не редактируются;
для старых сравнений используется явная обратная проекция нового владельца HMG.
Новые H-тесты сравнивают непроецированное текущее состояние.

Свет использует существующие cached clipped Canvas lights, 56 лучей формы,
ограниченные caches и local screen wash; GI/ray tracing не добавлены. Target
scan ограничен 8 LOS-кандидатами на турель за 200 ms. Боевой tick сохраняет
прежнюю зависимость от текущей Surface scene; I1 не реализован.
