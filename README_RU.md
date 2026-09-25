# LAST BASE 0.37.0 — Stage F

Основа: принятая **0.36.1 Stage E Corrective**. Добавлены вступление New Game с
пропуском и **Command Core → Архив**. Подробности и результаты проверок:
[STAGE_F_REPORT_RU.md](STAGE_F_REPORT_RU.md),
[контракты Stage F](docs/STAGE_F_CONTRACT_RU.md).
Ранние отчёты описывают исторические сборки. После Stage F разработка остановлена
для ручной проверки; Stage G и Level 2 не начаты.

## Запуск и обновление

Загрузите содержимое ZIP на GitHub с прежней структурой папок. Игра уже собрана;
`index.html`, `js/`, `styles/`, `assets/` должны поставляться вместе.
Локально: `python -m http.server 8000`, затем `http://localhost:8000/`.
HTTP необходим для корректной загрузки аудио; `file://` может блокировать fetch.
Для сохранения слотов используйте прежний origin сайта и данные браузера.

Save Format **17** добавляет owner Archive через migration **16 → 17**.
Существующие equipment/inventory/placements/Research/Chapter/Base Control не
переносятся в новую систему. Старые saves не запускают Intro. Для возврата к
0.36.1 нужен экспорт старого слота: предыдущая версия не читает формат 17.

## Что проверить

1. New Game: 18-секундное текстовое Intro, Pause/Resume, Skip, Escape/× на PC.
   После него начинается существующий Chapter 1 revision 6.
2. Continue старого слота: сразу игра, без Intro. Continue прерванного Intro
   тоже не воспроизводит его автоматически.
3. Запитанный физический Core → Архив: документы, категории, Back, повторный
   просмотр вступления. Первый исследовательский журнал появляется после Research.
4. RU/EN, portrait/landscape, safe areas Telegram, читаемость и управление на
   реальном телефоне. Нативная визуальная проверка этой среды не заменяет устройство.

Настоящих сюжетных изображений, видео или озвучки в этой версии нет. Текст и
субтитры доступны; media adapter подготовлен к отдельной поставке контента.

## Сохранённый игровой цикл

**Resources → Core/Construction → Craft → Inventory → Place → Installed Instance
→ Hold Pick Up 3 sec → Inventory → Place**. Research открывает право изготовления;
Archive не выдаёт предметов и не меняет этот цикл. Utility/Weapon Workbench,
Head Equipment/Flashlight Module, инструменты Lv.0–5, room names и общий
Base Control для Core/Remote сохранены. Farm/Animals остаются на паузе до Level 2.

## Разработка и QA

Node 20+, `npm install`, `npm run build`. `npm test` запускает полный набор;
`npm run test:f` — проверки Intro/Archive. Исторические gameplay suites проходят
реальную кнопку Skip через тестовый adapter; новые Stage F cases проверяют
непропущенное Intro отдельно. Performance запускается отдельно от regression:
`npm run bench:f`, `node qa/stage-f-ui-performance.cjs`,
`node qa/stage-f-story-performance.cjs`.

Network transport не добавлен. Авторизация, request/revision/idempotency и
разделение общих открытий/личного просмотра сохраняют multiplayer-readiness.
