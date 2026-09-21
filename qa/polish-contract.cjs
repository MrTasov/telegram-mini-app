// Presentation-only owners changed by this patch. Gameplay is compared against
// the exact pre-polish build in polish.cjs, including projectile trajectories.
exports.sourceChanges=new Set(['assets/manifest.json','assets/audio/effects/README_RU.md','src/assets/manifest.js','src/core/runtime.js','src/core/loop-viewport.js','src/core/rendering.js','src/render/actors.js','src/combat/weapons-crafting.js','src/combat/monsters.js']);
exports.legacyIconPaths=s=>s.replaceAll('assets/icons/items/iron_ore_polish.png','assets/icons/items/iron_ore.png').replaceAll('assets/icons/items/copper_ore_polish.png','assets/icons/items/copper_ore.png');
