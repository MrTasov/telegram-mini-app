# LAST BASE 0.33.0 — Stage C1

GitHub-ready source and built game based on the accepted **0.32.1 Stage A/B
Corrective**. Includes local light through open doors, a brighter flashlight with
pose-based origin and local contact/bounce, a craftable Tactical Flashlight head
module, and the approved C1 recovery / power-bootstrap foundation.

Extract the ZIP root unchanged. Deploy `index.html`, `js/`, `styles/` and `assets/`
together. Local preview: `python -m http.server 8000`. Keep the same site origin
for browser saves; export an old save before switching builds if rollback matters.

SaveFormat **8 → 9 → 10** preserves earlier migration steps and all five slots.
Old worlds retain flashlight access through an installed module; a player without
head equipment receives a statless mount. New games craft the module and a head
mount or helmet at the existing workbench. Install/remove through the item/head
card. Toggle with **F** or **🔦**. Helmet/module artwork is not drawn on the actor;
existing sprites and animations are unchanged. There is no flashlight durability
or separate battery.

Normal New Game does **not** apply the damage preset. C1 provides an explicit,
inactive bootstrap preview factory for recovery testing. No C2 Chapter 1,
Building/Placement, Level 2, or Farm/Animals restart is included. The existing
Level 1 R3 layout, permanent Command Core, eleven test objectives, Stage A campaign
contracts and eighteen fixed Stage B instances remain intact.

The existing world owners still hold HP, repair credit, inventories, jobs, fuel
and battery state. Recovery and wearable actions use actor/instance/request IDs,
expected revisions and bounded saved receipts. This is preparation for multiple
players; network multiplayer is not implemented.

Development (Node 20+):

```sh
npm ci
npm run build
npm test
npm run test:c1
npm run bench:c1
npm run package:c1
```

`bench:c1` compares the immutable delivered 0.32.1 executable in matching warmed
scenes, including moving lights and open doors. QA uses modeled DOM/WebAudio and
native Canvas2D; it does not substitute for a browser, Telegram or phone review.

Read `STAGE_C1_REPORT_RU.md` for results, migration details, manual checks and the
explicit preview command. The approved Roadmap remains unchanged in `docs/`.
Earlier reports and immutable QA fixtures are retained as history.

**Development stops after C1. C2 has not started.**
