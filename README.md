# LAST BASE 0.32.1 — Stage A/B Corrective

Separate GitHub-ready patch based on delivered **0.32.0 Stage B**. Implements the
user's manual-review corrections: compact Objectives HUD, Command Core, room
swap, shared physical bodies, quieter audio and improved lighting. Awaiting
repeat manual acceptance. Development stops here; C1 and later stages are closed.

Deploy the extracted root `index.html`, `js/`, `styles/` and `assets/` together.
The game is already built. Local server: `python -m http.server 8000`.
Keep the same site origin to retain browser saves. SaveFormat migrates **7 → 8**,
and the existing migration chain supports earlier saves. Older builds cannot read
format 8. Exporting the old save before opening the new build allows rollback.

Level 1 R3 moves Workshop to the upper-left room and Kitchen to the lower-left.
Semantic room/equipment identities, queue owners, storage, power and replay
receipts remain intact. Saved player, drone, guard and map positions in the two
rooms move once. The outer Level 1 shell, stairs and Core artwork stay in place.

Stage A campaign and Stage B type → instance / transform contracts are preserved.
Explicit actor/instance/request IDs and expected revisions remain authoritative;
the UI owns no unlocks or inventories. Multiplayer readiness remains local
authority preparation, without network transport. No Building/Placement, damaged
start, Level 2 or final Chapter 1 is added. Eleven presentation-test objectives
extend the existing two-chapter fixture; no new mandatory gate or reward.

Development: `npm ci`, `npm run build`, `npm test`, `npm run test:corrective`,
`npm run bench:corrective`. The last command compares the immutable delivered
0.32.0 fixture, including its original audio. Native Canvas QA uses Node 20+
and the locked `@napi-rs/canvas` dependency. Audio reproduction requires numpy:
apply `tools/corrective-audio.py` after any original audio preparation.

See `STAGE_AB_CORRECTIVE_REPORT_RU.md`,
`docs/STAGE_AB_CORRECTIVE_CONTRACT_RU.md` and
`docs/COMMAND_CORE_UI_CONTRACT.md`. Earlier reports, source references and
baseline fixtures are historical and remain included. Current validation is
`qa/results/summary.json`; current performance is
`qa/results/stage-ab-performance.json`.

QA uses modeled DOM/WebAudio and native Canvas2D. It does not certify native
browser/Telegram layout, physical touch response or subjective audio quality.
Those checks remain part of the user's repeat manual review.
