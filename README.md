# LAST BASE 0.39.0 — Stage H

Based on accepted **0.38.0 Stage G**. Surface Defense uses the existing
**Craft → Inventory → Place → Hold Pick Up → Inventory** workflow.
Automatic Turret, Heavy Turret and Searchlight share equipment identity,
placement, damage/repair, power and Base Control. No Research gate is added.
See [Russian release report](STAGE_H_REPORT_RU.md),
[contracts](docs/STAGE_H_CONTRACT_RU.md) and [Russian README](README_RU.md).
Previous reports describe their named builds, not the current test gate.

Objectives are narrower and more transparent; collapse is a session preference
that survives zone changes. Sector graphics are hidden on the normal map;
exploration, POIs, discovery and saved sectors remain intact.

Save Format **19**, migration **18→19** and every earlier migration retained.
Legacy HMGs become Heavy Turret equipment instances without losing IDs, ammo,
level, ON/OFF or installed position. Paid legacy production output remains
collectable. Stored legacy turret tokens move to the existing recovery inventory
if necessary; no duplicate physical item is created.

Serve `index.html`, `js/`, `styles/`, and `assets/` together, e.g.
`python -m http.server 8000`. Use HTTP rather than `file://` for media fetching.
Keep the same site origin to retain browser saves; update the whole release.
Node 20+ and `npm install` are needed only for rebuilding and QA.

The supplied official Intro MP4 is unchanged. New Game → Intro/Skip → existing
Chapter 1 revision 6; Continue does not replay Intro. Archive entries remain
readable after their NEW badge disappears and after Save/Load.
Research unlocks production rights; it never creates free equipment.

`npm run build`, `npm test`, `npm run test:h`, `npm run bench:h`,
`npm run package:h`. Full results and measured comparison with 0.38.0 are in
`qa/results/summary.json` and `qa/results/stage-h-performance.json`.
QA uses modeled DOM/HTMLVideoElement/WebAudio and native Canvas2D.
Mobile/Telegram browser layout, touch usability, native media playback and
physical audio require manual acceptance. Native Canvas timings are not FPS.

Stage I, Level 2, Farm/Animals, Signal/Threat and later stages are not started.
Stage H retains the existing scene-bound combat simulation; off-screen combat
is explicitly a future Stage I1 task.
