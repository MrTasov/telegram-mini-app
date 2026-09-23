# LAST BASE 0.32.0 — Stage B

Separate GitHub-ready release based on **0.31.1 Stage A Corrective**. Stage A is
conditionally accepted for development only; final manual review remains open.
Review A Corrective and B together. **Stop after B: no C1, Building/Placement,
damaged start or final Chapter 1.**

Deploy the extracted root `index.html`, `js/`, `styles/` and `assets/` together.
The game is already built. Local server: `python -m http.server 8000`.
Keep the same site origin to retain browser saves. Export a backup before testing.
SaveFormat migrates **6 → 7**; older builds cannot read the new format.

Equipment definitions, stable instances and transforms are separated. Existing
positions and recipes are preserved. Job/container/power references retain their
original owners. No duplicate inventories, production pools or devices.
Two same-type furnaces exist only in an isolated QA world, not in the actual game.

Equipment commands carry actor/instance/request IDs and expected revision;
bounded replay receipts survive reload. This is local authority readiness, not
networking. Unknown actors are rejected, never redirected to the local bag.
A loaded enhancement cradle requests 2 kW independently of its UI.

Level 1 R2, full stair hit area, fixed Command Core frame and 0.31.1 objectives
remain intact. No new assets or later-stage content.

Development: `npm run build`, `npm test`, `npm run test:equipment`,
`npm run bench:equipment`. See `STAGE_B_REPORT_RU.md` and
`docs/STAGE_B_EQUIPMENT_CONTRACT_RU.md`. Older Stage A reports are historical.
QA uses modeled DOM/WebAudio and native Canvas2D, not a physical phone or browser.
