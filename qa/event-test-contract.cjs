// The approved Stage 6 schedule is 00:00–06:00. Historical Day X fixtures
// happened at 23:00. For old-vs-new BALANCE oracles, give BOTH runtimes the same
// 03:00 input; never mask HP/damage or modify the frozen fixture files. Exact
// original clocks, including old 23:00 saves, are tested in world-events.cjs.
exports.raidFixture=raw=>{const d=JSON.parse(raw);if(d.lighting016?.day%10===0&&d.lighting016.minute>=360){d.lighting016.minute=180;return JSON.stringify(d);}return raw;};
