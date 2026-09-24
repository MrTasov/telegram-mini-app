# LAST BASE 0.35.3 — Stage D Corrective

This release completes the 57-point corrective request on the unchanged delivered
**0.35.2 Stage D Corrective** baseline. No later roadmap stage is started.
See [STAGE_D_COMPLETE_REPORT_RU.md](STAGE_D_COMPLETE_REPORT_RU.md) for the current
Russian report and [docs/STAGE_D_COMPLETE_CONTRACT_RU.md](docs/STAGE_D_COMPLETE_CONTRACT_RU.md)
for the current contracts. Older stage reports are historical.

Serve `index.html`, `js/`, `styles/`, and `assets/` together, for example with
`python -m http.server 8000`. Keep the same site origin to retain browser saves.
Node 20+ and the declared dev dependency are only needed for rebuilding and QA.

## Building and moving equipment

**Resources → physical Core / Construction / Craft → Inventory slot → Place →
installed instance → hold interaction for 3 seconds → Pick Up → Inventory → Place.**

Each stateful buildable occupies one real backpack slot. Select its icon and
choose **Place**. Crafting never installs the object automatically. Position it
freely in an allowed room, rotate with R/the button, then confirm. Arrow controls
adjust position. Escape cancels. Floor lamps and small storage also support
validated corridor positions; large equipment stays in rooms.

To move installed equipment, approach and hold on it (or hold the Action button).
A circular indicator leads to a small **Pick Up / Cancel** confirmation. Short
clicks/taps retain the ordinary interaction. Early release or movement cancels.
Full inventory, production, pending output/refunds, nonempty storage, a running
generator, enabled battery, or an unpacked drone prevent unsafe pickup.

The same instance ID, condition, level, modules, settings and owner state survive
pickup and placement. Placement is free; pickup never refunds materials. Packed
objects have no collision, world interactions or power consumption.

| Buildable | Total limit | Recipe |
| --- | ---: | --- |
| Utility Workbench | 4 | Core: 6 wood + 4 iron |
| Weapon Workbench | 4 | Core: 12 wood + 16 iron + 4 parts |
| Furnace | 4 | Core: 20 iron + 6 parts + 8 concrete |
| Storage | 16 | Core: 6 wood + 2 iron |
| Floor Lamp | 8 | Utility: 2 iron + 1 copper + 1 part |

Authored generator, fuel tank, battery, drone dock and enhancement cradle also
use the movable contract. Extra recipes for these types are not unlocked.
Infrastructure and Command Core stay fixed. Room display names can be changed
under **Core → Base** without changing room identities or electrical behavior.

## Base Control and objectives

**Core → Base → Base Control** and **Base Remote** share operational controls.
Choose Surface/Yard or Bunker Level 1, then a zone. Controls follow real installed
instances and their current location. Lights and production have independent
switches. Storage and hand tools have no artificial ON/OFF control.

Room/device priority gameplay is retired. When enabled demand exceeds available
power, electrical loads pause together; reduce demand or restore supply. Enabled
settings are retained. The Core remains physically accessible for recovery.

Tracker **Details** opens a campaign-only journal. The Remote provides operational
controls; it does not open Construction, Chapters, Research or Archive. The Core
retains its fixed shell and remembers its valid section/page only while the
player remains on Level 1.

## New Game and saves

New games start without a hammer, pickaxe or axe. The physical emergency storage
contains **12 wood, 10 iron, 10 stone and 6 fuel**. The manual workbench and basic
tools do not need power; each tool costs 2 wood + 2 iron. Reserved first-tool
materials are protected from unrelated crafting.

Chapter 1 includes a real successful stone-mining hit after crafting the pickaxe.
The electric furnace still needs power before making concrete. Five concrete
restore the five required destroyed sections to functional state; full HP is not
required. The original ten stone are a guaranteed repair reserve. Further full
repairs require gathering and concrete production. Survive the night and confirm
completion at the physical Core.

Save format **15** retains older worlds and campaign revisions 3/4/5. New games
use revision 6. Old priority fields are retained only as compatibility data.
Previously disabled room circuits migrate to individually disabled consumers.
Old packed equipment fills available bag slots; import-only overflow remains
available for placement if the old backpack was full. New pickup/craft always
requires a free slot. No migration grants new resources or duplicates instances.

## Development and verification

```sh
npm install
npm run build
npm run check
npm test
npm run bench:d:complete
npm run package:d:complete
```

`npm test` runs 55 groups. Performance comparisons run separately against frozen
0.35.2 code, with the same assets/audio. Reports use modeled DOM/WebAudio and
native Canvas2D; they do not claim browser/WebView/phone FPS or physical touch
acceptance. The release ZIP contains source, runtime, tests, fixtures, assets,
reports, and a SHA-256 file manifest. Manual acceptance is pending.

Farm/Animals remain paused until future Level 2. No Research/Blueprint progression,
Level 2, new chapter or later Stage is added.
