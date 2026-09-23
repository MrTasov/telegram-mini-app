# Stage B: оборудование, экземпляры и authority

База — 0.31.1. Условная приёмка A разрешает B, но не закрывает ручную проверку A.

## Идентичность и transform

EquipmentInstances.definitions содержит неизменяемые типы: footprint, прежний
recipe station type, мощность, interaction range; для Drone Station — body/dock
anchors. GameEquipment хранит id, typeId, transform {x,y,rotation,scene,room}, refs.
Исторические instance IDs сохранены. Совпадение написания типа и ID у печи —
совместимость, а не правило lookup. Рецепт проверяется по recipeStation(instanceId).

В обычном мире 18 записей: 3 производственных устройства, усиление,
Tank/Generator/Battery, Drone Station и 10 существующих сундуков. Feed Craft и
2 аграрных сундука dormant. Аграрные контейнеры продукции/воды остаются у прежних
owners, не становятся новыми станциями. Core остаётся permanent fixture Stage A.
Стены, двери, турель и сам Scout не получают новый HP/placement lifecycle.

Начальные transforms взяты из R2. BunkerLayout.fixture — совместимый read-through
для оборудования; прочий декор остаётся в layout. Renderer использует withArt;
collision/interaction — общий footprint; audio — center/transform; позиция и
корпус dock — anchors типа. Авторские sprite offsets сохранены: рисунок не обязан
совпадать с collision box. Фазы анимации производственных станков разделены по ID.

Нет add/move/remove/rotate/placement commands. В Stage B допустим прежний поворот 0.
Перемещённый или подменённый instance в save отклоняется. Factory поддерживает
другой фиксированный набор для изолированных QA-миров. Seed второй печи внедряется
только QA harness, не runtime-переключателем игры.

## Владельцы

| Данные | Owner / save path | Adapter |
| --- | --- | --- |
| Identity, transform, ссылки | equipment032.instances | GameEquipment |
| Active jobs, legacy feed | V09Craft / v09.crafting | job(instanceId).active |
| Queue, output, refund, pause | V09Craft.craftQueue / v010.modules.craft | job(instanceId) |
| Предмет усиления | V0161Upgrade / upgrade0161 | container(instanceId) |
| Содержимое сундука | storageChests / storage | container(instanceId) |
| Device toggle, allocation | V09Power / v09.power | power(instanceId) |
| Battery | V010Energy / v010.modules.energy | прежний energy owner |
| Command revision, receipts | equipment032.commands | EquipmentCommands |

Adapters возвращают актуальные ссылки после restore, заменяющего контейнеры.
В equipment032 нет предметов, paidInput, jobs, output или копии power.
Legacy APIs станков сохранены как доверенные внутрипроцессные owner APIs для
существующих подсистем/fixtures. Их нельзя экспортировать как сетевой endpoint.

## Команды и multiplayer-readiness

GameEquipmentRuntime.execute принимает actorId, instanceId, requestId,
expectedRevision, action, payload. Чистый EquipmentCommands.create получает явные
actor/permission/access/operation ports, не читает DOM. Проверяются actor, target,
повтор запроса, revision и физический доступ. Расход/выдача выполняются прежними
синхронными owners с проверкой ресурсов, места, unlock и питания. Начать заказ без
энергии по-прежнему можно; производство без выделенной мощности не продвигается.

Кнопки производства и усиления отправляют команды с instanceId и local actorId.
Локальный adapter обслуживает только текущего GameActors.local; неизвестный actor
не перенаправляется в местный bag. Два actor context проверены через чистый gate.
Нет remote actors, транспорта, host election или сетевых inventories. Старые
inventory drag/drop, power controls и операции Scout остаются существующими
локальными механизмами; полный перевод старых подсистем на co-op не входит в B.

Успешная команда увеличивает command revision и сохраняет receipt. Последние
128 receipts различают actor/request и payload. Повтор не выполняет операцию.
После вытеснения receipt старый expectedRevision отклоняется. Revision описывает
команды, а не каждый tick оставшегося времени. Локальное исполнение синхронно;
будущая authority должна обеспечить ту же сериализацию. Окна остаются клиентскими.

Это не транзакционная БД: legacy save pipeline не гарантирует rollback при
неожиданном исключении внутри restorer. Новый decode не меняет живой мир;
новый restorer присваивает уже проверенные command metadata.

## Питание и сохранения

Устройство с предметом в cradle запрашивает прежние 2 кВт при включённых device
и room circuit, независимо от .open у окна. Пустой cradle эту нагрузку не создаёт.
Для усиления нужна выделенная мощность и прежние материалы. Таймеров, новых цен,
Power bootstrap и C1-состояний не добавлено.

Envelope 7; payload schema 2 и старые owner schemas сохранены. Миграция 6→7
добавляет детерминированные records и пустую историю новых команд. Предыдущие
миграции идут в прежнем порядке. Сначала проверяются IDs/types/transforms,
затем owner references. Дубли, неизвестные IDs, движение, подмена ссылок и будущая
версия отклоняются до restore. Старый optional upgrade owner при отсутствии
означает пустой cradle; старый отсутствующий craft module использует свои defaults.

Сохранение 0.32.0 не читается 0.31.1. Для отката нужен экспорт до обновления.
New Game не повреждается, C1/C2 не реализованы.
