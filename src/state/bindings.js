/* State ownership map, not a new simulation. Getters are intentionally live:
   bag, storage, enemies, farm beds and several subsystem states can be replaced
   by an existing restore or inventory transaction. No snapshot is retained. */
GameState.register('player',{
  get entity(){return player;},get id(){return GameActors.localId;},get actors(){return GameActors;},get dead(){return playerDead;},
  get scene(){return scene;}
},{source:'core/world-inventory.js',saved:['player'],transient:['movement','aim input','last damage/step clocks']});

GameState.register('inventory',{
  get bag(){return bag;},get equipment(){return equipment;},get storage(){return storageChests;},
  get capacity(){return BAG_SLOTS;},get quick(){return window.V013Inventory?.items;},
  get activeSlot(){return activeHandSlot;},get upgrade(){return window.V0161Upgrade?.slots;},
  get system(){return window.V010Inventory;}
},{source:'inventory/registry-slots.js',saved:['bag','equipment','storage','handSlots','activeHandSlot','starterPending','quick013','upgrade0161','v010.modules.inventory'],transient:['drag','selection','UI scroll']});

GameState.register('combat',{
  get projectiles(){return bullets;},get system(){return window.V010Combat;},
  get magazine(){return magazine;},get magazineMax(){return magazineMax;}
},{source:'combat/weapons-crafting.js',saved:['magazine','flashlightOn','v010.modules.combat'],transient:['projectiles','reload','muzzle flash','practice']});

GameState.register('enemies',{
  get actors(){return zombies;},get system(){return window.V017Monsters;}
},{source:'combat/monsters.js',saved:['zombies','monsters017'],transient:['AI routes','nearby grid','attack/jump/fuse timers','audio']});

GameState.register('world',{
  get clock(){return WorldClock;},get events(){return WorldEvents;},get identity(){return GameIdentity;},get trees(){return worldTrees;},get ores(){return window.V09World?.ores;},
  get loot(){return scavenges;},get system(){return window.V010World;},get city(){return window.V013City;}
},{source:'world/districts.js',saved:['lighting016','identity027','trees','loot','v09.world','v010.modules.world','world011','expansion012','city013','gathering'],transient:['navigation','fishing cast','geometry cache','resource animation']});

GameState.register('base',{
  get sections(){return window.V015Base?.sections;},get doors(){return v09Doors;},
  get system(){return window.V015Base;},get construction(){return window.V018Build;},
  get fortress(){return window.V091Fortress;}
},{source:'base/structures.js',saved:['gateOpen','v091','base015','building018','living011'],transient:['geometry revision','door interpolation','room patterns','rest/shower action']});

GameState.register('drones',{
  get companion(){return window.V014Robots?.state;},get system(){return window.V014Robots;}
},{source:'drones/companion.js',saved:['robots014'],transient:['route','motion','return progress','UI selection','combat clocks']});

GameState.register('turrets',{
  get guns(){return window.V016Turret?.guns;},get system(){return window.V016Turret;}
},{source:'base/turrets.js',saved:['turret016'],transient:['placement','target','obstacle cache','muzzle flash']});

GameState.register('power',{
  get generator(){return V09Power;},get battery(){return window.V010Energy?.battery;},
  get system(){return window.V010Energy;}
},{source:'base/battery.js',saved:['v09.power','v010.modules.energy'],transient:['allocation','flow','UI timers']});

GameState.register('crafting',{
  get system(){return V09Craft;},get queue(){return window.V010?.modules.craft;}
},{source:'crafting/manufacturing.js',saved:['feedCraft','v09.crafting','v010.modules.craft'],transient:['selected recipe','quantity controls','render signature']});

GameState.register('farm',{
  get beds(){return window.farmState;},get water(){return window.V011Farm?.state;},
  get animals(){return livestockAnimals;},get system(){return window.V0141Farm;}
},{source:'farm/growth.js',saved:['farmClock','farm','livestock','v09.chickenBreedMs','farmV011','farm014','farmRecovery0141','farmPlantingStock0141'],transient:['animal poses','visual watering','UI selection']});

GameState.register('progression',{
  get system(){return window.V010Progression;}
},{source:'ui/progression.js',saved:['v010.modules.progression'],transient:['seen log','render signature','evaluation clock']});

GameState.register('render',{
  get scene(){return scene;},get camera(){return camera;},get map(){return window.V010Camera;},get lighting(){return window.V016Lighting;}
},{source:'render/lighting.js',saved:['v010.modules.camera'],transient:['light masks','image caches','viewport','frameScale']});

GameState.register('ui',{
  get menuOpen(){return menuOpen;},get storage(){return activeStorage;},
  get loot(){return activeLootObject;},get interaction(){return interactionTarget;}
},{source:'ui/modal-dragging.js',saved:[],transient:['open windows','pointer gesture','click dismissal','selected object','DOM nodes']});
