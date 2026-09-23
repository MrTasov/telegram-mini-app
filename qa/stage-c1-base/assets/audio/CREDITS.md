# LAST BASE — Audio Pass sources

All game-ready WAVs are included. The game makes no requests to the source sites.
Exact source archive URLs and SHA-256: `tools/audio-sources.json`.
Per-clip provenance, cut points, format, loudness and hashes: `tools/audio-preparation.json`.
Original audio pass: `tools/build-audio.py` (offline FFmpeg, numpy, scipy).
Apply `tools/corrective-audio.py` afterwards for the current 0.32.1 mix.

In 0.32.1, `ui_click`, `ui_confirm`, `ui_error`, `loot_close`, `menu`, `pickup`,
`machine`, `generator`, `rotor`, `bunker`, `water` and `liquid` are replaced with
original offline sound designs prepared for LAST BASE. They use no sampled
recordings. Current per-clip provenance, RMS, peak and SHA-256 are recorded in
`tools/audio-corrective-preparation.json`; the older preparation list is historical
for these twelve clips. Normal `day.wav` is removed. `day_x.wav` is unchanged.

| Source | Creator / uploader | License | Used for |
| --- | --- | --- | --- |
| [Fantozzi's Footsteps (Grass/Sand & Stone)](https://opengameart.org/content/fantozzis-footsteps-grasssand-stone) | Fantozzi / qubodup | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Four Sand L1/R1/L2/R2 recordings, softened and shortened |
| [The Free Firearm Sound Library](https://opengameart.org/content/the-free-firearm-sound-library) | Ben Jaszczak and contributors / bart | CC0 1.0 | AK-family and AR-family recordings for AK-74/M4; different cuts/filters for drone and HMG |
| [Zombie noises and moans](https://opengameart.org/content/zombie-noises-and-moans) | ianzazz | CC0 1.0 | Groans, aggression, attacks, death and ability sounds |
| [100 CC0 SFX #2](https://opengameart.org/content/100-cc0-sfx-2) | rubberduck | CC0 1.0 | Doors, reload foley, impacts, inventory, machines, water and wind |
| [Chicken Sound Effect](https://opengameart.org/content/chicken-sound-effect) | IMadeIt | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | `full/chicken.wav` |
| [Crickets Ambient Noise — loopable](https://opengameart.org/content/crickets-ambient-noise-loopable) | Ted Kerr / Wolfgang_ | CC0 1.0 | Night ambience |
| [Farm animals](https://opengameart.org/content/farm-animals) | Secretlondon / qubodup | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | `full/cow.wav`, from Mudchute_cow_1.ogg |

The chicken and cow recordings were trimmed, converted to 32 kHz mono PCM,
filtered, normalized and faded. **The adapted cow.wav remains CC BY-SA 3.0.**
Keep this attribution with distributions; this designation applies to that sound
and does not claim to relicense the entire game. No creator endorses LAST BASE.

`ui_click`, `ui_confirm`, `ui_error`, `complete`, `day_x` and `rotor` are original
offline sound designs prepared for LAST BASE. The two existing mining sounds
(`effects/chop_wood.wav`, `effects/mine_rock.wav`) and their existing timing are
retained. Historical unused sounds are kept solely for frozen regression fixtures.

No newly added sound is encoded as JavaScript base64 or synthesized at runtime.
