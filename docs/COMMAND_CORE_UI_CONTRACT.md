# Command Core presentation contract — 0.31.1

The Core shell owns only transient presentation state: selected section, scrolling,
expanded objective descriptions and command request sequence. It is never a save,
research, inventory, station or campaign authority.

`CommandCoreUI.registerSection(id, titleKey, mount)` accepts a ready section. The
mount receives its persistent scroll element and returns an update function.
Only complete sections are registered; there is no placeholder registration.
Reserved routes are `chapters`, `base`, `research`, `blueprints`, `construction`,
`archive`, `map-signals`. The shipped implementation registers only the first two.
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

SaveFormat 6 remains unchanged. Campaign schema 1 now has contentRevision 2.
Revision-1 saves are first validated against original objective definitions, then
receive new optional objective records. New `after` objectives begin at the saved
world counter when activated. Previously completed chapters are not reopened;
new optional records in those chapters remain inactive. Old transitions and
receipts survive unchanged. Decode does not mutate the live world, grant rewards,
advance a chapter, or consume supplies.
