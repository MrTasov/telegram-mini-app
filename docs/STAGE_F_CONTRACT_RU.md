# Stage F — Intro и Archive, 0.37.1 Final

Stage F основан на 0.36.1; финальные два изменения — на принятой **0.37.0 Stage F**.
Runtime непосредственной основы SHA-256:
`201bbd5da6ac2cb7f33528b804f95477ecffe8ea68a7e201204b3d37cbe95a4d`.

## Разделение ответственности

- `src/story/definitions.js`: записи, категории, условия открытия, ключи RU/EN, временные интервалы субтитров, необязательная ссылка на media.
- `src/story/domain.js`: чистый authoritative owner открытий и персональных отметок. Без DOM, производства, инвентаря, медиадекодеров или паузы мира.
- `src/story/runtime.js`: текущие факты Chapter/Research, локальная авторизация, команды, save adapter.
- `src/story/player.js`: одна локальная поверхность просмотра; управление Play/Pause/Skip/Close и жизненным циклом media adapter.
- `src/story/video.js`: ленивый нативный HTMLVideoElement, локальный media clock, browser policy, громкость и освобождение источника.
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

В 0.37.1 подключён официальный ролик пользователя: `assets/video/last-base-intro.mp4`,
21,25 секунды, без изменения байтов. Автоматический показ — только New Game.
Окончание определяется событием `ended`; субтитры — по `currentTime`. Прежний
таймер текстового Intro не может обрезать видео. Continue не запускает показ.
Прежнее явное действие повторного просмотра в Archive сохранено.

Media descriptor хранит kind/assetId/alt. MP4 зарегистрирован в optional-разделе
`videos` Asset Manifest; загрузка начинается только при открытии плеера.
Изображения используют GameAssets; audio adapter остаётся будущим расширением.
Ошибка видео возвращает текстовый fallback и Skip. Запрет autoplay показывает
«Продолжить» и ожидает жест пользователя; обход политики браузера не применяется.

Один активный handle; закрытие/restore освобождают видео, события и источник.
Контракт передаёт master volume и visibility/manual pause, требует dispose,
поддерживает `timeMs`, `onEnded`, `onBlocked`, `onError`. Поздние callbacks
проверяют generation/attempt. Дополнительного AudioContext/RAF нет. Единственный
15-секундный watchdog ожидания начала воспроизведения очищается при playing,
pause, ошибке или dispose; в обычном gameplay он не работает.

Карточка Archive — единая нативная кнопка. Отметка read меняет подпись, но не
доступность документа; повторное чтение не отправляет лишнюю команду. Формат
состояния Archive, actor/request/revision/idempotency и migrations не меняются.

В текущем single-player используется явная причина `story:local`. Закрытие
освобождает только её. При будущем сетевом transport этот локальный presentation
adapter необходимо заменить политикой локального ввода: domain не запрашивает
глобальную остановку общего мира.

## Адаптация Roadmap

**Roadmap intent preserved / implementation adapted to current accepted architecture.**

Цель Intro/первого Log/Archive/субтитров/персонального просмотра сохранена.
Обязательные AI-видео для каждой главы не добавлены. По финальному запросу
пользователя добавлен только предоставленный официальный Intro; дальнейшие
записи остаются текстовыми. Новые изображения/озвучка не генерировались.
Research и Construction из принятой архитектуры не заменяются.

Stage G, Level 2, Farm/Animals и дальнейшее сюжетное раскрытие не реализованы.
