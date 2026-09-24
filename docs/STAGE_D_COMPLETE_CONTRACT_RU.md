# Stage D Corrective 0.35.3 — действующие контракты

Этот документ дополняет принятые A/B/C1/C2/D и заменяет правила переноса,
Inventory и Room Priority из отчёта 0.35.2. Геометрия R3 не меняется.

## Владельцы состояния

- `GameEquipment`: type → instance, ID, transform, placement, ownerId, condition,
  level, modules, settings. Состояние работы сохраняют прежние владельцы Power,
  Craft, Storage, Battery, Drone и Enhancement.
- `GameCarried`: один marker `{type:'equipment_case',qty:1,instanceId}` на реальный
  слот рюкзака. Marker не содержит копии оборудования. Он не переносится в quick,
  Storage, Drone cargo или upgrade slot. Перестановка внутри рюкзака разрешена.
- `GamePlacement`: Craft/Place/Pick Up/Rename через actor/request/revision,
  проверку geometry, принадлежности, доступности, ресурсов, footprint и маршрутов.
- `GameBaseControl`: descriptors реальных установленных объектов, команды
  Generator/Battery/consumer/door/gate/turret/drone; общие порты для Core и Remote.
  Приоритеты комнат/устройств не участвуют в расчёте питания.

## Pick Up

Удержание начинается рядом с установленным экземпляром. Authority выдаёт
временный ticket и фиксирует ID, время, положение игрока, revision и состояние.
После минимум 3000 мс клиент показывает подтверждение. Команда повторно проверяет
все условия и вместимость. До подтверждения объект остаётся в мире.

Короткий tap до 350 мс — прежняя интеракция. Более длительное неполное удержание
отменяется. Движение, второй указатель на объекте, joystick/aim, blur, скрытие
страницы, pause, открытие UI, изменение объекта или загрузка аннулируют удержание.
Ticket не сохраняется. Успешные command receipts сохраняются и предотвращают дубль.

## Placement

Большое оборудование размещается в семи комнатах. Storage и Floor Lamp допускают
коридор при сохранении центрального прохода, подходов ко всем дверям, лестницам,
Core и другим обязательным интеракциям. Physical footprint поворачивается на
четверть оборота; прозрачный PNG padding и тень не участвуют.

Drag preview объединяет pointermove в интервале 50 мс. Pointerup обрабатывает
последнюю точку. В idle полная проверка не запускается. Confirm всегда заново
проверяет authority, ownership, instance state, collision и связность маршрутов.

## UI и доступ

Core содержит только работающие разделы. Общий Base Control получает уровни/зоны
из данных и показывает их реальные controllable objects. Remote требует предмет
пульта; физический Core предоставляет тот же набор оперативных функций. Journal
из Tracker не содержит Core tabs, operational controls или перехода главы.

UI хранит временный route, не gameplay progress. При уходе с Level 1 и при загрузке
Core возвращается к default. Внешняя геометрия окон фиксирована в доступной области
экрана; содержимое прокручивается внутри.

## Save 15

`carry0353` хранит import-only `legacyOverflow`; `control0353` — receipts и режимы
дверей. Миграция 14→15 занимает свободные слоты старыми packed instances, сохраняя
остаток в escrow только для старого полного рюкзака. Новый Craft/Pick Up escrow
не создаёт. Одна ссылка на каждый packed instance обязательна; дубли/потерянные
ссылки/недопустимые контейнеры отклоняются до изменения мира.

Старые room/device priority сохраняются как неактивные legacy fields. Старый
room OFF переводится в individual OFF по transform импортируемого устройства.
Результат не зависит от расположения того же ID в открытом мире.

Campaign 3/4/5 продолжается без переписывания. Только новый New Game использует
revision 6 и обязательную добычу 15 stone реальным ударом. Учебный ремонт остаётся
`destroyed → functional` для пяти секций с сохранённым milestone/world-state
подтверждением. Farm/Animals и будущие Stage остаются закрыты.
