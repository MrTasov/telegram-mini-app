# LAST BASE 0.37.1 — Stage F Final

Based on accepted **0.37.0 Stage F**. This focused update connects the supplied
**official Intro video** and makes every unlocked Archive card reopenable,
including after reading and Save/Load.
See [final Russian report](STAGE_F_FINAL_REPORT_RU.md),
[contracts](docs/STAGE_F_CONTRACT_RU.md), and [Russian README](README_RU.md).
Earlier reports and performance results describe their named historical builds.
**Stage G and Level 2 are not started.**

Serve `index.html`, `js/`, `styles/`, and `assets/` together, e.g.
`python -m http.server 8000`. Use HTTP rather than `file://` for media fetching.
Keep the same site origin to retain browser saves; update the whole release.
Node 20+ and `npm install` are needed only for rebuilding and QA.

The official Intro is the supplied MP4, copied without transcoding or editing:
`assets/video/last-base-intro.mp4`, 21.25 seconds, H.264/AAC.
It starts automatically only with **New Game**. Pause/Resume, Skip and Escape/Close
remain available. Native playback completion or Skip starts existing Chapter 1
revision 6. Continue and older saves do not automatically play the Intro.
Browser permission rejection shows Resume; media failure retains the text
fallback and Skip. Existing RU/EN subtitles are retained.

Archive is available at the physical powered Core. Its first Research Log
unlocks after one existing research project. The whole document card is a button;
NEW disappears after first reading, and read entries remain available after
Save/Load. The existing explicit Archive replay action is retained.
Reading costs nothing and grants no items or production rights.

**Research/Blueprint → production unlock → Craft → Inventory → Place/use.**

Save Format **17** and migration **16→17** are unchanged. Saves from 0.37.0
load without a new migration. All existing gameplay owners are retained.

`npm run build`, `npm run test:f:final`, `npm run package:f:final`.
The final targeted pass covers build/source verification, Stage F, official
video lifecycle/Archive rereading, saves, menu, Core navigation and Audio.
`npm test` remains the full regression command; that full pass and performance
benchmarks were not repeated for this two-change update.
The automated environment uses modeled DOM/HTMLVideoElement/WebAudio and native
Canvas2D. Native playback, mobile/Telegram layout and listening require manual QA.
