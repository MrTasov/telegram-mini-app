> Current patch: **audio-unlock-hotfix-1**. Fixes input-driven audio unlock/recovery and retries failed audio loads. See [AUDIO_HOTFIX_RU.md](AUDIO_HOTFIX_RU.md). Targeted validation: 515 PASS; the earlier full regression result belongs to Polish 1.

# LAST BASE 0.29.0 — Visual / Animation / Audio Polish 1

Visual integration on the current **0.29.0 MASTER UNARMED** build. See [Russian setup](README_RU.md) and the [integration report](EQUIPMENT_INTEGRATION_RU.md).

Upload the archive contents with the directory structure intact. The ready-built game uses `index.html`, `js/`, `styles/`, and `assets/`. Keep the existing HTTP(S) origin and existing browser storage to retain local save slots.

Seven carry states have twelve walk phases and a separate idle: AK, axe, pickaxe, hammer, remote, flashlight and fishing rod. The AK uses the approved underarm pose with fixed palms below the weapon. Three tools have twelve work phases and contact ripples. Fishing has a stationary wait and twelve-phase catch. Body and equipment remain separate. Unarmed, sleep and all five zombie types retain the previous approved assets.

Save format remains **3**. The existing M4 keeps its previous renderer. No new gameplay weapon or tool is registered.

For a visual review, open `character-preview.html` through the same HTTP server. It uses the shared actor renderer, not game saves. `qa/results/equipment-visuals/` contains native Canvas renders at PC/mobile viewport sizes. Native browser and phone checks are still required.

Development: `npm ci`, `npm run build`, `npm run check`, `npm test`. Current before/after performance: `node qa/polish-bench.cjs` (run separately from tests). Optional parallel test workers: `LAST_BASE_TEST_JOBS=2 npm test`. JavaScript cache tag: `0.29.0-audio-unlock-hotfix-1`. Runtime assets are included; `tools/pack-actors.cjs` is an optional offline packer requiring the original generated PNG files named in `tools/actor-sources.json`. Full ImageGen prompts are in `docs/CHARACTER_ASSET_PROMPTS.json`.

`dev.html` remains the isolated Day X testing entry. Omit development/QA material from public deployment if desired. Historical reports concern their named releases. No deployment or subsequent gameplay patch is included.
