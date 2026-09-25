# LAST BASE 0.36.1 — Stage E Corrective

Based on the delivered **0.36.0 Stage E**, retaining accepted 0.35.3 contracts.
This corrective updates the shared Research presentation, Core back navigation,
RU localization and audio recovery. Save Format 16 remains unchanged.
See [STAGE_E_CORRECTIVE_REPORT_RU.md](STAGE_E_CORRECTIVE_REPORT_RU.md) and
[corrective contracts](docs/STAGE_E_CORRECTIVE_CONTRACT_RU.md).
Earlier reports are historical. **Stage F and Level 2 are not started.**

Serve `index.html`, `js/`, `styles/`, and `assets/` together, for example with
`python -m http.server 8000`. Opening `index.html` through `file://` can block audio
fetches. Keep the same site origin to retain browser saves. Update the complete
release, including the versioned JS and CSS, rather than mixing old files.
Node 20+ and the declared dev dependency are only needed for rebuilding and QA.

## Research and blueprints

Approach the physical powered **Command Core → Research**.
The same Research / Data / Blueprints navigation is used on PC and mobile.
Use the fixed Back button (or Escape on PC) to return from nested pages. Obtain a one-time
packet from **Data**, then submit it. Packets belong to the actor
until submission and do not use backpack slots. Submitted Data, permanent
Blueprints and technology rights belong to the base.

Research consumes Data once. It grants no items, materials, equipment levels or
placements. Manufacture the unlocked result through existing stations or Core
Construction. Sources are finite and guaranteed; no exploration/world expansion
is included. Confirm Chapter 1 at the Core to receive its research reward.

| Research | Data | Blueprint / prerequisite | Existing production destination |
| --- | ---: | --- | --- |
| Station fabrication | 12 | Powered Core | Core Construction: extra Furnace / Weapon Workbench |
| Precision weapons | 18 | Precision blueprint | Weapon Workbench: M4 |
| Scout servicing | 15 | Scout service blueprint + installed Drone Station | Enhancement Cradle: existing body / battery / weapon upgrades |
| Production efficiency | 15 | Research Data (no prior research) | Existing paid workshop improvement (+20% production speed) |

The three one-time sources provide 20 + 20 + 25 Data. All four projects cost 60.
Basic Utility Workbench, Hammer, Pickaxe, Axe, repairs and power remain ungated.
Four legacy TECH routes and their existing effects remain available.

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

Save format **16** adds an independently validated Research owner. Migration from
0.35.3 / format 15 preserves all existing owners and previously open production
rights. It grants no Data, Blueprints or completed projects. Research UI clearly
marks inherited rights; further prerequisites accept those rights. It also retains older worlds and campaign revisions 3/4/5. New games
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
LAST_BASE_TEST_JOBS=1 npm test
npm run bench:e
node --expose-gc qa/stage-e-tail-performance.cjs
node --expose-gc qa/stage-e-dense-performance.cjs
npm run package:e
```

`npm test` runs 56 groups. Performance comparisons run separately against frozen
0.35.3 code, with the same assets/audio. Reports use modeled DOM/WebAudio and
native Canvas2D; they do not claim browser/WebView/phone FPS or physical touch
acceptance. The release ZIP contains source, runtime, tests, fixtures, assets,
reports, and a SHA-256 file manifest. Manual acceptance is pending.

Farm/Animals remain paused until future Level 2. No Research/Blueprint progression,
Level 2, new chapter or later Stage is added.
