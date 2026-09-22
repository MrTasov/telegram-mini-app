# LAST BASE 0.29.0 — Full Audio Pass Recovery 1

Restored Full Audio Pass on the supplied **LAST_BASE_0.29.0_HUD_Compact_1.zip**. Ready-built game, editable sources, 58 required audio clips, source credits and regression tests are included. See [Russian report](AUDIO_PASS_RECOVERY_RU.md), [setup](README_RU.md), and [audio coverage](AUDIO_AUDIT_RU.md).

Deploy `index.html`, `js/`, `styles/` and `assets/` together, preserving paths. No Node.js is needed to play. Keep the same HTTP(S) origin and browser storage to retain local save slots. Save format remains **3**. JavaScript cache tag: `0.29.0-audio-pass-recovery-1`. Audio starts after a real user gesture.

Development: Node.js 20+, `npm ci`, `npm run build`, `npm run check`, `npm test`. Audio checks: `npm run test:audio`. Paired performance measurement: `npm run bench:audio`, separately from tests. Optional concurrency: `LAST_BASE_TEST_JOBS=3 npm test`. Local server: `python -m http.server 8000`.

One AudioContext manages bounded voices, cached buffers and state-driven loops. Existing walk/work contact clocks and the old cow timer's gameplay RNG cadence are preserved. No image, actor scale, save schema, control system, resource balance or weapon statistics were changed. Audio files are local; no runtime requests to sound-source websites.

Sources and licenses: `assets/audio/CREDITS.md`, `tools/audio-sources.json`, `tools/audio-preparation.json`. Optional offline preparation: `tools/build-audio.py --source-dir <source-root>` with FFmpeg, numpy and scipy. Ready WAV files are included; preparation is unnecessary for deployment. Keep attribution for the chicken (CC BY 3.0) and adapted cow (CC BY-SA 3.0) recordings.

`character-preview.html` remains the shared-renderer visual review entry. `dev.html` retains isolated development saves. QA contains historical frozen fixtures and reports; the current aggregate is `qa/results/summary.json`. This patch has `qa/results/audio-pass.json` and `qa/results/audio-performance.json`. Native Canvas and modeled WebAudio tests do not replace physical phone/PC listening. No deployment or subsequent patch is included.
