# LAST BASE 0.31.0 — Stage A

Complete built game on the manually accepted **0.30.1 Bunker Level 1 Rework R2**.
Adds campaign/objective foundations and the minimal Command Core panel. R2 geometry,
Core center (1210, 510), art and collision are unchanged.

Deploy the extracted `index.html`, `js/`, `styles/` and `assets/` together, keeping
relative paths. You may upload the entire project to the GitHub Pages branch root.
No Node.js is needed to play. Keep the same origin and browser storage to retain
existing slots. Saves migrate automatically to format **6**; older game versions
cannot read format 6. Local server: `python -m http.server 8000`.

Core has two tabs: Chapters and Base. Start the generator, mine new ore after that
objective activates, return to the powered Core and explicitly confirm the
transition. Moving existing ore does not count. No duplicate legacy rewards are
granted. Core consumes **0.05 kW** through the existing power grid. The objective
tracker stays readable without power. Research and achievements retain their
existing owners, unlocks and UI.

Stage B, Level 2, free placement, new research and damaged New Game are not started.
Agriculture remains paused as in R2. Day X, equipment, inventories, production,
drone and audio remain under their previous owners.

See [Russian report](STAGE_A_REPORT_RU.md), [setup](README_RU.md) and
[domain contracts](docs/STAGE_A_CONTRACT_RU.md).

Development: Node.js 20+, `npm ci`, `npm run build`, `npm run check`, `npm test`.
Focused contracts: `npm run test:campaign`. Optional suite concurrency:
`LAST_BASE_TEST_JOBS=3 npm test`. Paired CPU benchmark:
`node --expose-gc qa/campaign-performance.cjs`, separately from other tests.

Current gate: `qa/results/summary.json`; changes: `STAGE_A_CHANGESET.json`;
file inventory: `release_manifest.json`. Historical baseline fixtures remain intact.
Modeled DOM/WebAudio and native Canvas checks do not replace physical device review.

All 58 audio files and existing artwork are included unchanged. Keep attribution
in `assets/audio/CREDITS.md`. `dev.html` uses isolated development saves.

Stop for manual acceptance after this release. Do not start Stage B automatically.
