# LAST BASE 0.38.0 — Stage G

Based on accepted **0.37.1 Stage F Final**. Existing world map + 12 sectors,
progressive discovery and 3 physical document sources, using the existing
Research and Archive contracts. No second crafting system or free equipment.
See [Russian report](STAGE_G_REPORT_RU.md), [contracts](docs/STAGE_G_CONTRACT_RU.md)
and [Russian README](README_RU.md). Previous reports describe their named builds.
**Stage H and Level 2 are not started.**

Save Format **18**, migration **17→18**. Existing saves retain all former route
access and every old save owner. New Game's optional service-centre route opens
with the field journal. Map access and discovery are separate.

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

Save Format **18** adds the sector owner through migration **17→18**. All
prior migrations and gameplay owners are retained; Continue does not replay Intro.

`npm run build`, `npm test`, `npm run test:g`, `npm run bench:g`,
`npm run package:g`. Release results are recorded in the Russian report and
`qa/results/summary.json`; historical reports are not current pass evidence.
QA uses modeled DOM/HTMLVideoElement/WebAudio and native Canvas2D.
Native playback, mobile/Telegram layout and listening require manual QA.
