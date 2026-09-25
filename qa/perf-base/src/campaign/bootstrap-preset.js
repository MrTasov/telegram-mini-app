/* C1 test draft, NOT Chapter 1. Counts are a recovery feasibility fixture,
   not approved C2 balance. No rewards, chapter objectives, unlocks or placement. */
const CampaignBootstrap=Object.freeze({
  id:'power-recovery-c1-draft',enabledByDefault:false,
  damage:Object.freeze([{id:'v091wall020_N_0',hp:0},{id:'v09door_room4',hp:8000}].map(Object.freeze)),
  starterKit:Object.freeze([{type:'hammer',qty:1},{type:'fuel',qty:1},{type:'stone',qty:24}].map(Object.freeze)),
  enabledDevices:Object.freeze(['light_corridor','command_core_l1','light_workshop','door_workshop','door_room5','furnace','craft_bench']),
  criticalTargets:Object.freeze(['exit','tank','generator','battery','command_core_l1','furnace','craft_bench','upgrade0161','robots014_dock','chest0'])
});
