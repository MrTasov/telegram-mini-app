# LAST BASE 0.27.0

Single-player release: Stage 6 World Events and Stage 7 co-op architecture readiness. No multiplayer/networking implementation.

See [the Russian setup and testing guide](README_RU.md), [release report](docs/STAGES_6_7_REPORT_RU.md), and [Multiplayer Readiness Report](docs/MULTIPLAYER_READINESS_RU.md).

The ready-to-host game is `index.html` with `js/`, `styles/`, and `assets/`. Keep the existing origin to retain local saves. `dev.html` is a separate, disposable in-memory test entry for Day X; omit it and `dev/` from ordinary production deployment.

Development requires Node.js 20+: `npm ci`, `npm run build`, `npm run check`, `npm test`. Run `npm run bench:stages` separately from tests. Five save slots and old saves remain supported through a versioned identity migration. Benchmarks use modeled DOM and native Canvas, not a physical phone or browser compositor.
