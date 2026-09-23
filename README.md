# LAST BASE 0.35.1 — Stage D

Fresh implementation from the accepted **0.34.0 Stage C2** archive. The canceled
Stage D worktree and release were not used. The original archive SHA-256 is
`11a1742cf3887b29036f7a9d3168942bf86829db9c1fdee9c32bbb1a49cb2b60`.

Deploy `index.html`, `js/`, `styles/` and `assets/` together. Local preview:
`python -m http.server 8000`. Keep the site origin unchanged to retain browser
save slots. Node 20+ is needed only to rebuild and run QA.

At the physical **Command Core → Construction**, choose a new or packed furnace
or workbench. Select Workshop or Reserve Room, tap/drag the room plan, rotate,
and press **Place**. Arrow keys/buttons adjust by one grid step; R rotates;
Escape cancels the preview. Tapping or holding the plan never installs anything.
The existing fixed Core frame and internal scrolling remain in use.

| Equipment | Total limit, including packed | New installation cost |
| --- | ---: | --- |
| Furnace | 2 | 20 iron, 6 parts, 8 concrete |
| Workbench | 2 | 16 iron, 12 wood, 4 parts |

Existing stations count toward these limits. Placement checks room bounds,
physical bodies, doorway approaches, other stations' accessibility, actors and
drone clearance. Commit rechecks the world revision, cost and geometry.

**Pack Up** removes a station's art, collisions, interactions and Power demand.
Its instance ID, transform, switches, priorities and production owner remain.
Reinstalling the same instance is free. Finish production and collect output and
refunded materials before packing. Preview/cancel never debit materials or
change installed equipment. Core, stairs, energy equipment, storage, upgrade
station and drone dock remain fixed.

SaveFormat **12 → 13** adds installed/packed state and bounded command receipts.
Old worlds keep their authored equipment and all historical migrations. Decoding
validates incoming instance references before touching live state. New Game and
slot switching remove extra stations from the outgoing world correctly.

Chapter 1, R3 Level 1 layout, Stage A/B/C1 contracts, Tactical Flashlight, tool
levels 0–5 and lighting/audio/collision behavior are retained. Repair milestones
are confirmed at the actual full-health repair and reconciled from world state;
completed milestones survive later damage. Mandatory initial repairs cost 18
concrete; all initial damage costs 32. The Objective identifies the required
structures and explains mining extra stone and making more concrete when needed.
Starter resources are unchanged.

Farm/Animals remain paused. No Research/Blueprint progression, Level 2 or next
Roadmap stage is implemented. Commands remain actor/instance addressed with
revision checks and saved receipts; network multiplayer itself is future work.

```sh
npm ci
npm run build
npm test
npm run bench:d
npm run package:d
```

See `STAGE_D_REPORT_RU.md`, `docs/STAGE_D_CONTRACT.md` and `qa/results/` for the
scope, checks, measurements and manual acceptance instructions. Automated UI
checks use a modeled DOM, and rendering uses native Canvas2D; they do not replace
browser/Telegram/phone review.
