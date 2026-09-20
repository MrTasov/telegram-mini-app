# LAST BASE 0.28.0 — World / Farm / Drone / Resources

Single-player patch on stable 0.27.1. See [Russian setup](README_RU.md) and the [current patch report](docs/WORLD_FARM_RESOURCES_RU.md).

Extract the ZIP and upload its contents with the directory structure intact. The ready-built game needs `index.html`, `js/`, `styles/`, and `assets/`. Keep the existing HTTP(S) origin to retain the five local save slots. Node.js is only required for development: `npm ci`, `npm run build`, `npm run check`, `npm test`.

This patch adds clustered resource placement, Coal → Gunpowder → Ammo, five walkable seed-free beds with independent irrigation, a 500 L farm tank, six fixed cow stalls, compact drone controls and autonomous return through automatic doors. Item Pin is retired; recipe pins and ordinary inventory quick slots remain.

Balance data: `src/config/gameplay.js`. Save format: version 3, migrating earlier saves through the existing owners. Legacy cattle beyond six remain in a recoverable reserve. Old water quantity and prepaid crafting orders are retained.

`npm run bench:world-farm` compares 0.27.1 and 0.28.0 in the native Canvas/VM harness. Automated PC/MOBILE profiles do not replace manual desktop/browser/phone testing.

`dev.html` remains the isolated in-memory Day X testing entry; omit it and `dev/` from ordinary public deployment. No network layer or multiplayer was added. Historical reports in `docs/` concern their named releases; current results are in `qa/results/summary.json`.
