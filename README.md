# LAST BASE 0.27.1 — Gameplay / UX corrective patch

Single-player release on the existing Stage 6/7 architecture. See [Russian setup](README_RU.md) and [patch report](docs/CORRECTIVE_PATCH_RU.md).

Host the extracted `index.html`, `js/`, `styles/`, and `assets/` on the existing HTTP(S) origin to retain the five local save slots. The ready-built bundle is included. Node.js is only needed for development: `npm ci`, `npm run build`, `npm run check`, `npm test`.

Ordinary panels no longer pause simulation. Automatic passages support a single movement command. Empty loot closes after a successful transfer; ordinary actions retain movement. The outer wall has four ladders. Drone field/station repair uses configurable material costs.

`dev.html` remains the isolated in-memory Day X testing entry; omit it and `dev/` from ordinary public deployment. No networking or multiplayer was added. Historical Stage 6/7 reports and test evidence remain in `docs/` and `qa/`; current patch results are identified by version 0.27.1.
