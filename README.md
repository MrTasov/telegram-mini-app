# LAST BASE 0.37.0 — Stage F

Built on accepted **0.36.1 Stage E Corrective**. Adds a skippable New Game intro
and **Command Core → Archive**, with shared discoveries, personal read/watched
flags and RU/EN text/subtitles. See [Russian report](STAGE_F_REPORT_RU.md),
[contracts](docs/STAGE_F_CONTRACT_RU.md), and [Russian README](README_RU.md).
Older reports are historical. **Stage G and Level 2 are not started.**

Serve `index.html`, `js/`, `styles/`, and `assets/` together, e.g.
`python -m http.server 8000`. Use HTTP rather than `file://` for audio fetching.
Keep the same site origin to retain browser saves; update the whole release.
Node 20+ and `npm install` are needed only for rebuilding and QA.

The intro currently uses four timed text cues over 18 seconds, with Pause/Resume,
Skip and Escape/Close. No placeholder images, video or voice-over were generated.
Existing saves and Continue do not automatically launch it. The existing
Chapter 1 revision 6 begins after New Game intro completion or skipping.

Archive is available at the physical powered Core. Its first Research Log
unlocks after one existing research project. Reading costs nothing and grants
no items or production rights. The accepted workflow remains:

**Research/Blueprint → production unlock → Craft → Inventory → Place/use.**

Save Format 17 adds `story037` through migration 16→17. Previous migrations and
accepted save owners are retained. Export an old save before upgrading if you
need to return to 0.36.1, which does not read format 17.

`npm run build`, `npm test`, `npm run test:f`.
Run performance separately: `npm run bench:f`,
`node qa/stage-f-ui-performance.cjs`, `node qa/stage-f-story-performance.cjs`.
The automated environment uses modeled DOM/WebAudio and native Canvas2D;
real mobile/Telegram layout and physical listening remain manual checks.
