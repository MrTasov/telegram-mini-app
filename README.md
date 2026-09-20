# LAST BASE 0.29.0 — Character / Zombie Visual & Animation

Visual patch on stable **0.28.0**. See [Russian setup](README_RU.md) and the [patch report](docs/CHARACTER_ANIMATION_REPORT_RU.md).

Upload the archive contents with the directory structure intact. The ready-built game uses `index.html`, `js/`, `styles/`, and `assets/`. Keep the existing HTTP(S) origin and existing browser storage to retain local save slots.

New survivor body atlases: unarmed walk, rifle-ready walk, shared tool carry/strike, idle poses and breathing sleep. AK, axe, pickaxe and hammer are separate equipment sprites. Five existing zombie types now have eight walking and four attack frames. Living/corpse images use the same 0.88 scale; collision radii and gameplay definitions remain unchanged.

Save format remains **3**. Existing M4, fishing rod, remote and flashlight keep their previous specialized renderer. No new gameplay weapon or tool is registered.

For a visual review, open `character-preview.html` through the same HTTP server. It uses the shared actor renderer, not game saves. `qa/results/character-visuals/` contains native Canvas renders at PC/mobile viewport sizes. Native browser and phone checks are still required.

Development: `npm ci`, `npm run build`, `npm run check`, `npm test`. Performance: `node qa/compare-character-performance.cjs`. Runtime assets are included; `tools/pack-actors.cjs` is an optional offline packer requiring the original generated PNG files named in `tools/actor-sources.json`. Full ImageGen prompts are in `docs/CHARACTER_ASSET_PROMPTS.json`.

`dev.html` remains the isolated Day X testing entry. Omit development/QA material from public deployment if desired. Historical reports concern their named releases. No deployment or subsequent gameplay patch is included.
