# LAST BASE 0.34.0 — Stage C2

GitHub-ready sources and built game based on accepted **0.33.0 Stage C1**.
Includes Axe/Pickaxe levels 0–5, Command Core session navigation and the first
complete Chapter 1 recovery cycle, applied **only to New Game**.

Extract the ZIP root unchanged. Deploy `index.html`, `js/`, `styles/` and `assets/`
together. Local preview: `python -m http.server 8000`. Keep the same site origin
for browser saves. Use New Game in a free slot to review Chapter 1; Continue keeps
existing worlds, progression, queues and unlocks.

Pickaxe yields 15/20/25/30/35/40 resources per successful hit at levels 0–5.
Axe yields 10 at every level. Both tools gain 10% real gathering speed per level.
Use the existing enhancement station. Physical tool levels/IDs and the strike
phase are saved; animation impact, tool sound and resource gain share one phase.

Command Core remembers its section, valid page and scrolling while the player
stays on Bunker Level 1. Leaving Level 1 or loading a save resets the UI to Base.
This state is not saved as gameplay progress. The frame retains fixed dimensions
and position; content scrolls inside it.

Chapter 1 starts in a damaged, unpowered LAST BASE. The existing Storage crate
contains guaranteed fuel and stone. Follow the objective tracker before the Core
is powered: supplies → tank → generator → Core → concrete → critical repairs →
survive a night → complete the chapter at Core. Early actions count. The initial
balance and objective list are documented for manual review in the report.

SaveFormat **10 → 11 → 12** retains every earlier migration and all five slots.
Existing worlds keep the Stage A campaign content at revision 3. New C2 worlds
use revision 4. Completed milestones, receipts and repairs are never replayed on
load. The existing Tactical Flashlight equipment module and legacy flashlight
migration remain intact. No sprite, animation atlas or audio asset was replaced.

Level 1 layout R3, permanent Core, Stage A contracts and eighteen fixed Stage B
instances remain intact. Recovery still uses existing HP, repair-credit, power,
inventory and station owners. Actor/instance/request IDs, expected revisions and
saved receipts remain in place; network multiplayer is not implemented.

Development (Node 20+):

```sh
npm ci
npm run build
npm test
npm run test:c2
npm run bench:c2
npm run package:c2
```

`bench:c2` compares the immutable accepted 0.33.0 executable in matching warmed
scenes with alternating AB/BA passes. QA uses modeled DOM/WebAudio and native
Canvas2D; it does not replace a browser, Telegram or phone review.

See `STAGE_C2_REPORT_RU.md`, `docs/STAGE_C2_CONTRACT_RU.md` and
`docs/COMMAND_CORE_UI_CONTRACT.md`. Earlier reports, the approved Master Roadmap
and all historical fixtures are retained as history.

**Development stops after C2 for manual review. Stage D has not started.**
Building/Placement, Level 2, new research/blueprint gates and later chapters are
not implemented. Farm/Animals remain paused until a future Level 2.
