# Stage F — Intro и Archive, 0.37.0

Authoritative input: **0.36.1 Stage E Corrective**. Runtime baseline SHA-256:
`016d446011c4dfe3b6939fde050e2d1b27dc0614dea6316b8dff250edb86f3f4`.

## Разделение ответственности

- `src/story/definitions.js`: записи, категории, условия открытия, ключи RU/EN, временные интервалы субтитров, необязательная ссылка на media.
- `src/story/domain.js`: чистый authoritative owner открытий и персональных отметок. Без DOM, производства, инвентаря, медиадекодеров или паузы мира.
- `src/story/runtime.js`: текущие факты Chapter/Research, локальная авторизация, команды, save adapter.
- `src/story/player.js`: одна локальная поверхность просмотра; управление Play/Pause/Skip/Close и жизненным циклом будущего media adapter.
- `src/ui/archive.js`: клиент существующего Command Core с общими routes, Back, session state и внутренней прокруткой.

`log.*` — отдельное пространство идентификаторов. Оно не является research ID,
blueprint ID, item type или equipment instance ID. UI получает только
локализованные названия и содержимое. Закрытые записи не перечисляются.

## Открытие и чтение

| Запись | Условие |
|---|---|
| Последний рубеж / The last refuge | Контекст сохранения; текст Intro доступен для повторного чтения |
| Журнал перезапуска | Существующий milestone посещения Core |
| Журнал исследований 01 | Завершено хотя бы одно настоящее Research |
| База восстановлена | Подтверждено завершение Chapter 1 |

Условия проверяются через общий GameConditions. Факты берутся из существующих
сохранённых milestones; разовое событие не является единственным доказательством.
Открытие общее для мира, чтение и просмотр привязаны к actor ID. Поздний участник
не наследует отметки другого игрока. Текущий transport остаётся локальным.

Archive не тратит Research Data, не разблокирует рецепты и не выдаёт предметы.
Research сохраняет цикл **unlock → Craft → Inventory → Placement/use**.
Чтение не нужно для выполнения Chapter 1 и не открывает следующий Stage.

## Команды и сохранение

Save Format **17**, migration **16 → 17**, owner `story037`, adapter `story.archive`
после `research.foundation` во всех фазах. Старые migrations сохранены.

Сохраняются schema/content revision, список открытых записей, массив персональных
`intro/read/watched`, revision и ограниченное окно receipts. UI вызывает
`GameStory.request`, а не меняет owner. Общий EquipmentCommands проверяет actor,
request ID, revision и конфликт повторной заявки. Действия read/watch дополнительно
требуют физического доступа к запитанному Core. Повтор не добавляет отметку дважды.

Не сохраняются playback position, DOM, decoder, media bytes или pause reason.
Некорректные ссылки, schema, отметки и receipts отклоняются до restore.
Окно receipts — 128, максимум 16 записей игроков, до 256 определений документов;
это ограничения foundation, не обещание готового multiplayer transport.

New Game создаёт `pending`, только успешное начало новой сессии открывает Intro.
Skip/Close/Escape → `skipped`; окончание → `completed`.
Continue незаконченного Intro → `interrupted`, без автоматического повторения.
Для старого сохранения → `legacy`, без запуска Intro и без выдуманного просмотра.
Из старых фактов могут открыться уже заслуженные документы, но не весь сюжет.

## Presentation и будущие медиа

Сейчас Intro — 18 секунд, четыре текстовых кадра RU/EN, Pause/Resume и Skip;
пропуск сразу возвращает существующее начало Chapter 1. Изображения, озвучка и
видео не поставляются и не генерируются. Текст записи всегда читается в Archive.

Media descriptor хранит kind/assetId/alt. Изображения используют существующий
Asset Manifest/GameAssets. Audio/video предусмотрены через registerMediaAdapter;
реальный нативный adapter и настоящие media будут отдельной поставкой. Их отсутствие
или ошибка возвращают текстовый fallback и не блокируют выход.

Один активный handle; переключение/закрытие/restore освобождают его. Контракт
передаёт master volume и visibility/manual pause, требует dispose. Синхронная
ошибка во время создания не оставляет handle жить после fallback. Поздний callback
проверяет generation. Новые AudioContext и постоянные timers/RAF не создаются.

В текущем single-player используется явная причина `story:local`. Закрытие
освобождает только её. При будущем сетевом transport этот локальный presentation
adapter необходимо заменить политикой локального ввода: domain не запрашивает
глобальную остановку общего мира.

## Адаптация Roadmap

**Roadmap intent preserved / implementation adapted to current accepted architecture.**

Цель Intro/первого Log/Archive/субтитров/персонального просмотра сохранена. Старое
указание об обязательном внешнем видео заменено актуальным решением пользователя:
текст и документы сейчас, настоящие media позже, без обязательного AI-видео для
каждой главы. Сценарный текст входит в Stage F для ручной приёмки; генерации assets
нет. Research и Construction из 0.36.1 не заменяются.

Stage G, Level 2, Farm/Animals и дальнейшее сюжетное раскрытие не реализованы.
