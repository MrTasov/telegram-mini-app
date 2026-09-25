# Контракты 0.40.0 — H Corrective / I1

Авторитетная основа: 0.39.0 Stage H. Цель Roadmap I1 сохранена; реализация
адаптирована к принятым A–H contracts. Следующие стадии не включены.

## Единственный цикл симуляции

`update → updateZombies → V017Monsters.update` остаётся единственным обходом
врагов. `GameActivity` задаёт контекст поверхности и частоту внутри этого
обхода, но не владеет вторым списком врагов или RAF. Старый `GameDefense.tick`
вызывается одним прежним wrapper `update`, теперь независимо от локальной
scene. Power/production/fuel/battery не получают дополнительных ticks.

Активные области: база (радиус 1900), присутствующие surface actors (1150),
работающий surface drone (900), установленные исправные defensive instances
(дальность + 150). Actor contexts читаются из `GameActors.list`; сетевой
transport и искусственные remote players не добавлены. Непосредственный бой, fuse и прыжок остаются активными. Дальние враги,
в том числе идущие к базе участники Day X, получают
один шаг примерно раз в 250 ms с ограниченным накопленным dt. Movement
по-прежнему проверяет коллизии короткими шагами; глобального catch-up нет.
Существующий предел пула 144 и постепенное пополнение сохранены.

GameFlow различает UI capture и явную pause. Inventory/Core/смена scene
не останавливают бой. Принятая single-player pause Intro/Archive, Main Menu,
hidden/death остаётся; просмотр истории не создаёт будущую сетевую pause.

## Геометрия и бой

Ground-query context переключает только запрос геометрии; он не подменяет
Player, camera или scene. Используется прежняя геометрия/коллизии мира, включая
реки, озеро и запертые exploration regions. Ground cache отделён от геометрии
видимого верхнего этажа магазина. Это существующий объект Surface, не Level 2.

Турели проверяют тела препятствий через spatial grid при выборе цели и при
выстреле. Supporting wall slab разрешён только для установленной на стене
турели; другие целые стены продолжают блокировать огонь. Hitscan расходует
один патрон и применяет один hit. Damage стен и defensive equipment остаётся
в старых damage ports. Story-critical bunker equipment не превращается в
новые уязвимые цели. Разрушенные defensive instances доступны ремонту по H.

## Сохранения и authority

Save Format 20; migration 19→20 не выдаёт ресурсы, предметы или unlocks.
`control0353` schema 2 содержит `autoOpen: {doorInstanceId: boolean}` и прежние
command receipts. Старое closed → false, auto/open → true; отсутствующее
переопределение означает true. Прежний forced-open mode больше не поддерживается.
Текущее физическое open/manual состояние импортируется прежним Power owner.

`activity040` schema 1 содержит bounded относительные длительности и
стабильные IDs. Для врагов: attack age, sense/retarget, текущая стена, fuse,
прыжок, wandering/pause, последняя увиденная точка, cadence. Для турелей:
shot cooldown, scan delay, runtime aim. Target references и VFX не сохраняются.
HP/ammo/ON/OFF/resources/rewards остаются у equipment/power/старых владельцев.
При migration старые отсутствовавшие таймеры инициализируются безопасно;
время между закрытием игры и загрузкой не симулируется. Combat clock
останавливается вместе с GameFlow при явной pause/Main Menu/hidden; pending
fuse/leap не истекают в меню. Это часы внутри прежнего loop, не второй tick.

Валидация `activity040` выполняется после legacy identity migrations и до
изменения живого мира. Restore восстанавливает relative deadlines на текущих
часах и сбрасывает временные target references. Повторная загрузка не выдаёт
награды и не добавляет живых экземпляров. User-facing команды Auto-open,
Placement, Craft/Research и Pick Up проходят existing actor/request/revision/
idempotency guards. UI не изменяет inventory/door preference напрямую.

## H Corrective presentation

Placement HUD — клиент existing `GamePlacement.check/execute`. Рисует ghost
поверх настоящего canvas; не содержит отдельной карты/комнаты/второго
placement authority. Проверка preview ограничена 20 Hz; commit повторно
проверяет геометрию, revision и занятость. Отмена/blur/смена сцены сохраняет token.

Core и Remote используют один BaseControl component. Electrical doors дают
Auto-open switch без смешения с наличием питания. Ручное открытие остаётся
локальным действием; occupancy safety не позволяет закрыть дверь на actor.

Официальный MP4 неизменен. Intro использует `object-fit: contain`, full viewport,
скрытый HUD, compact Skip; RU/EN subtitles сохранены. При browser autoplay block
нажатие на видео повторяет play по разрешённому user gesture, либо доступен Skip.
Archive остаётся прежним. Skip/end проходят existing idempotent story command.
