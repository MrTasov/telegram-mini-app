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
