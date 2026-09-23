# Command Core presentation contract — 0.32.1

The Core shell owns only transient presentation state: selected section, scrolling,
expanded objective descriptions and command request sequence. It is never a save,
research, inventory, station or campaign authority.

`CommandCoreUI.registerSection(id, titleKey, mount, available)` accepts a ready section. The
mount receives its persistent scroll element and returns an update function.
Only complete sections are registered; there is no placeholder registration.
The optional availability callback reads the corresponding domain owner; it
does not grant access. Priority is `construction`, `base`, `chapters`, `research`,
`blueprints`, `archive`, `map-signals`. The shipped implementation registers only
`base` and `chapters`, with Base selected initially. Future construction handles
base buildables; item recipes remain with their existing stations. No placeholder
categories, blueprint inventory or placement workflow is implemented.
The existing Research and Achievements links open their established owner/UI.

The shell has a viewport-sized, content-independent frame. Header, tabs and footer
sit outside each section's scroll area. Section updates must preserve DOM controls,
focus, disclosure state and scroll position; do not rebuild a view when a numeric
value or objective progress changes. Localizing or switching chapters can rebuild
section content while retaining the shell. IDs may be used as DOM attributes, but
never as player-facing names or fallback values.

`GameBaseOverview.snapshot()` reads existing power, manufacturing, storage, drone,
defense and room owners. It introduces no instances, saves, commands or gameplay
side effects. Values are localized at the presentation boundary with
`I18n.number`; `I18n.numeric` is a deferred token and must not be assigned directly
to DOM text. Key-based text uses `I18n.t`.

Gameplay actions in future sections must call their owning command boundary with
explicit actor, target, request ID and expected state revision where appropriate.
The owner rechecks permissions, target, proximity, resource and power conditions.
A hidden or disabled button is never an authority or security gate. Summary rows
in this patch are read-only.

The frame is at most 720 × 760 CSS pixels, constrained by viewport and safe top /
bottom insets. Header, tabs and footer keep fixed heights. Only content scrolls.
The Objectives HUD defaults to a collapsed chip. Its independent device-level
HUD preference hides all tracker UI, without suspending campaign progress.

SaveFormat is 8 (room-swap migration); campaign schema 1 has contentRevision 3.
Older content revisions are first validated against their objective definitions, then
receive new optional objective records. New `after` objectives begin at the saved
world counter when activated. Previously completed chapters are not reopened;
new optional records in those chapters remain inactive. Old transitions and
receipts survive unchanged. Decode does not mutate the live world, grant rewards,
advance a chapter, or consume supplies.
