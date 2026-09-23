# Stage D: equipment placement foundation

This release is recreated from the clean LAST BASE 0.34.0 Stage C2 artifact.
Approved scope is section **D — ограниченное размещение станций в комнатах** in
`LAST_BASE_Master_Implementation_Roadmap_RU.md`.

## Identity and ownership

`EquipmentInstances.definitions` describes types; `EquipmentInstances.placement`
contains cost, limits and allowed rooms. The world registry owns instance IDs,
owner references, quarter-turn transform and `placement: installed | packed`.
Eighteen authored IDs keep their spelling. The two bounded extra instances use
`build:furnace:1` and `build:craft_bench:1`. Packed instances count toward limits.
No furniture, Core, energy equipment or drone dock can be packed in this stage.

Manufacturing remains the single owner of jobs, queues, output, refunds and
pause state. Power retains the same device owner by instance reference; room
membership follows the transform. Packed devices are excluded from allocation,
including idle service. There are no dropped duplicated equipment inventory
items and no alternate job copies inside the placement owner.

## Commands

`GamePlacement.execute` accepts `actorId`, `instanceId`, `action`, `payload`,
`expectedRevision` and `requestId`. Build requests address `catalog:<type>`;
reinstallation/packing address the existing instance. The payload includes the
world geometry revision and, for place, the target transform.

The existing `EquipmentCommands` authority gate checks identity, authorization,
request signature, duplicate receipt and expected revision. The local adapter
requires physical Core access on Level 1; a configured remote actor is not
silently mapped to the local inventory. This is a local authoritative boundary,
not a network transport implementation.

Commit rechecks geometry, doorway reserves, room accessibility, occupancy,
per-type count and full material cost. Debit occurs once, only after validation.
Successful receipts are saved and bounded to 128. Evicted commands still fail
the old revision. Cancel and failed placement make no gameplay mutation.

## Geometry and presentation

Renderer, physical body, collision, interaction bounds, sound source and power
room read the same transform. AABBs are exact for the four permitted rotations.
A bounded 26×25 grid verifies access from the room doorway to every installed
station with 18-unit clearance. Door opening is considered available manually,
so a closed/unpowered door does not falsely invalidate an otherwise legal room.
Door approaches are reserved separately and cannot be occupied by equipment.
The corridor, Core and stairs are outside all placement zones.

The Core room plan is the preview surface. It uses actual equipment artwork,
physical layout and a valid/invalid footprint. It supports PC and touch through
one registered surface in the existing input router. Placement requires a
separate confirmation button. The preview is transient: closing Core, changing
section, leaving Level 1 or loading clears it. No world tick runs placement
validation while the editor is closed.

## Saves

SaveFormat 13 migrates schema-1 `equipment032` into schema 2 by adding installed
presence to each accepted authored instance. `placement035` owns command state.
Older migrations still execute in order, including R2→R3 and flashlight/tool
conversion. Incoming production and Power IDs are validated in a scoped pure
validation context. Restore swaps the validated registry and reconciles its
production/device adapters before the historical owners restore their data.

Invalid transforms, missing refs/owners, protected equipment changes, malformed
presence and packed stations with unfinished work are rejected before mutation.
Old/New Game slots never inherit extra live instances from another slot.

## Explicit limits

Only Furnace and Workbench; two instances of each including the originals and
packed equipment; Workshop and Reserve Room only. No free factory, room
construction, equipment HP/durability, research/blueprint unlocks, new recipes,
Level 2 or Farm/Animals activation. Pack Up requires empty job/queue/output/refund
pools; it is not a relocation of a working production line.
