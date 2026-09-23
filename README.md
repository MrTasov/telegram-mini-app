# LAST BASE 0.30.1 — Bunker Level 1 Rework R2

R2 revision on the delivered **LAST_BASE_0.30.0_Bunker_Level_1_Rework_R1.zip**. The complete built game, editable sources, local assets, licenses and regression suite are included. Read [Russian patch report](BUNKER_LEVEL1_REWORK_RU.md) and [setup instructions](README_RU.md).

Level 1 has an 800 × 1500 central hall, seven surrounding rooms and a permanent physical Command Core at its center. The upper stairs lead to the surface; the lower stairs remain sealed. Existing power equipment, storage, production and the Drone Station retain their gameplay owners. Farm/cows/chickens are preserved with their entire simulation paused while Level 2 is unavailable.

Deploy `index.html`, `js/`, `styles/` and `assets/` together, preserving paths. No Node.js is required to play. Keep the same HTTP(S) origin and browser storage to retain local save slots. Save format **5** automatically migrates R1 and earlier saves, projects invalid actor positions onto safe Level 1 floor and preserves dormant agriculture. Audio starts after a real user gesture. Local server: `python -m http.server 8000`.

Development: Node.js 20+, `npm ci`, `npm run build`, `npm run check`, `npm test`. Optional test process concurrency: `LAST_BASE_TEST_JOBS=3 npm test`. Focused Level 1 checks: `npm run test:bunker`; visuals: `node qa/bunker-visuals.cjs`; paired performance: `node qa/bunker-performance.cjs`, separately from the suite.

Current aggregate: `qa/results/summary.json`. Current reports: `qa/results/bunker-level1.json`, `qa/results/drone-return.json`, `qa/results/bunker-visuals.json`, `qa/results/bunker-performance.json`. Historical fixtures/source baselines remain immutable. Old comparison tests explicitly account for the approved layout, format and agriculture pause; those behaviors are tested directly in the Level 1 and R2 integration suites.

All 58 audio clips remain local and unchanged. Attribution: `assets/audio/CREDITS.md`; preparation records: `tools/audio-sources.json`, `tools/audio-preparation.json`. Keep the chicken CC BY 3.0 and adapted cow CC BY-SA 3.0 attribution. The additional Core sprite and its generation prompt are documented in `docs/BUNKER_COMMAND_CORE_R2_ASSET.md`.

`character-preview.html` remains the shared-renderer character preview; `dev.html` uses isolated development saves. Older reports describe their own historical patches. Native Canvas and modeled DOM/WebAudio tests do not replace physical phone/PC review. Stage A, Level 2 and the future Building/Placement System are not implemented in this release.

R2 geometry: `docs/LAST_BASE_Bunker_L1_Layout_R2.json`. Object mapping: `docs/LAST_BASE_Bunker_L1_R1_to_R2_Object_Mapping.csv`. R1 migration tests: `node qa/bunker-r2.cjs`. Both stairs are 140 × 200 with a 40-unit gap. The Core center and collision footprint remain unchanged.
