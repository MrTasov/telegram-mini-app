# LAST BASE 0.43.0 — Bunker L1 + L2 Pass A

Текущий отчёт: [PASS_A_REPORT_RU.md](PASS_A_REPORT_RU.md). База: приложенная 0.42.0 Claude. Pass B не реализован. Сохранения мигрируются в формат 24.

Запуск: любой HTTP static server из корня проекта, затем `index.html`. Build: `npm run build`. Целевые тесты: `npm run test:pass-a`. Исторические инструкции ниже относятся к предыдущим версиям; ограничения старых QA-fixtures перечислены в новом отчёте.

---

# LAST BASE 0.42.0 — Survival Stage

Authoritative input: uploaded `01-LAST_BASE_0.41.2_Siege_Corrective_GitHub.zip`, SHA-256 `9aec9a41654e66335798a740bb4b9c57887643b54f1535f612bdd31fb6465f91`.
Save Format 23; migration 22→23 and all existing migrations retained. Steel remains **3 Iron + 1 Coal → 1 Steel, 4000 ms**.

- Serve `index.html`, `js/`, `styles/`, `assets/` over HTTP(S).
- Build: `npm run build`; verify generated runtime: `node tools/build.cjs --check`.
- Survival checks: `npm run test:survival`; full historical suite: `npm test`.
- Frame comparison against this exact input: `npm run bench:survival` (native Canvas diagnostic, not phone FPS).
- Owners/balance, measured results and limitations: [RU report](LAST_BASE_0.42.0_SURVIVAL_REPORT_RU.md).
- Survival station art is temporary, as requested. Farm/Animals remain paused. No next Stage.

Earlier reports below retain their original provenance.

---

# LAST BASE 0.41.2 — Siege Corrective

Authoritative baseline: uploaded 0.41.1 with Claude patch already included. Save Format 22. Steel: **3 Iron + 1 Coal → 1 Steel, 4000 ms**.

- Ready runtime: serve `index.html`, `js/`, `styles/`, `assets/` over HTTP(S).
- Build: `npm run build`; verify: `node tools/build.cjs --check`.
- Targeted: `npm run test:siege`; full historical pass: `npm test`.
- 120-enemy frame diagnostic: `npm run bench:siege` (not phone FPS).
- Current results and limitations: [RU report](LAST_BASE_0.41.2_SIEGE_REPORT_RU.md).
- Historical reports and telemetry below are retained with their original provenance.

---

# LAST BASE 0.41.1 — Day X Corrective

Authoritative input: `LAST_BASE_0_41_0_hero_memory_PATCH.zip` (0.41.0 I2 + Claude packed hero memory patch).

Six bounded reinforcement phases, 15-minute production Day X, understated day HUD/notifications and shared-owner atmosphere. Save Format 22 migrates 21 and all earlier supported formats. Core gameplay and hero/media assets are preserved.

- Build: `npm run build` (generated `js/game.js`).
- Targeted checks: `npm run test:dayx`.
- Full real simulation + telemetry: `npm run qa:dayx:full` (bounded long test, no phone FPS claim).
- Short CPU comparison: `npm run bench:dayx`.
- RU release details: `LAST_BASE_0.41.1_DAY_X_REPORT_RU.md`.

The material below describes previous releases and is retained as history.

---

# LAST BASE 0.41.0 — Stage I2

Current baseline: the user-uploaded `LAST_BASE_0_40_3_new_character_v5.zip`, including Claude's character/animation/icon changes. Save Format 21. Ready runtime: `index.html` + `js/` + `styles/` + `assets/`, served over HTTP(S).

[Stage I2 report (RU)](LAST_BASE_0.41.0_REPORT_RU.md). `npm run test:i2` checks Signal/Threat/Day X, DEV time targets, migration and off-zone consequences. `npm run bench:i2` is a bounded update/capture diagnostic against the exact uploaded runtime, not phone FPS. `npm test` runs the inherited regression suites.

Day X remains every tenth day, 00:00–06:00. Signal warns 48/24/6 game hours ahead. DEV time jumps simulate toward a target; they are not instant. Background, explicit pause or death pauses the job. Next stages are not implemented.

The material below documents earlier releases; its version/status claims are historical.

---

# LAST BASE 0.40.2 — Performance & Gameplay Corrective

Текущий отчёт: [PERFORMANCE_GAMEPLAY_REPORT_RU.md](PERFORMANCE_GAMEPLAY_REPORT_RU.md). Открывайте `index.html` через HTTP(S); готовый runtime уже собран. Новые проверки: `npm run test:perf-corrective`; сравнение производительности: `npm run bench:perf-corrective`. Save Format 20, Stage I2 не начат.

---

# LAST BASE 0.40.1 — Developer / QA

In gameplay: Settings → tap the version six times → Create test copy. A free save slot is required; the original is preserved. [Russian QA report](DEV_QA_REPORT_RU.md). I1 is preserved; I2 is not started.

## Accepted 0.40.0 baseline

# LAST BASE 0.40.0 — H Corrective + Stage I1

Based on accepted **0.39.0 Stage H**. See the [Russian report](STAGE_I1_REPORT_RU.md),
[contracts](docs/STAGE_I1_CONTRACT_RU.md) and [Russian README](README_RU.md).
Earlier reports describe their named releases, not the current gate.

Inventory → Place now opens a ghost on the actual gameplay floor. Drag with
mouse/touch, rotate with the button or R, confirm with the button or Enter.
Escape cancels without losing the item. The existing placement authority still
checks the physical footprint, collision, rotation, door clearance and critical
routes. Hold Pick Up remains 3 seconds and preserves the same instance/state.

Ground turrets use physical line of sight through open gates and broken walls.
Wall-mounted Heavy Turrets can fire outward from their supporting slab.
Core/Remote share compact independent switches. Electrical doors expose
**Auto-open**, separate from power and from local manual operation.
New Game Intro fits the viewport without stretching, hides the HUD and native
video controls, and keeps a safe-area Skip button. The official MP4 is unchanged.

Stage I1 extends the existing monster/defense update: combat near the base,
actors, drones and defense remains active independently of the viewed scene.
Distant idle/travelling actors use a bounded 250 ms cadence, including raid
actors still on their way to the active base area. No second enemy loop,
network transport, offline catch-up or new Threat multipliers are introduced.
Power, battery/fuel and production retain their existing single owners.

Save Format **20** adds **19→20**, preserving earlier migrations. Pending enemy
attacks, leap/fuse timing and turret cooldowns are saved by stable instance ID;
HP, ammo, power and inventory stay in their existing owners. Continue never
replays Intro. Chapter 1 revision 6, Research, Archive and exploration remain.

Serve `index.html`, `js/`, `styles/`, and `assets/` together, e.g.
`python -m http.server 8000`. Use HTTP rather than `file://` for media fetching.
Keep the same site origin to retain browser saves; update the whole release.
Node 20+ and `npm install` are needed only for rebuilding and QA.

`npm run build`, `npm test`, `npm run test:i1`, `npm run bench:i1`,
`npm run package:i1`. Results: `qa/results/summary.json` and
`qa/results/stage-i1-performance.json`. QA uses modeled DOM, HTMLVideoElement,
WebAudio and native Canvas2D. Browser/Telegram layout, touch usability and
physical audio still require manual acceptance; Canvas timings are not FPS.

Stop after I1. I2 / Signal / Threat, Level 2 and Farm/Animals are not started.
