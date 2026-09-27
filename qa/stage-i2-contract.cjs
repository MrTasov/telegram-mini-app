// Historical combat oracle: compare the original controlled actors, including
// their HP and damage. I2 reinforcement composition/budget is tested separately.
// Never apply this projection to saves/migrations or the real I2 scenarios.
exports.project=(value,options={})=>{
 const d=require('./world-farm-contract.cjs').project(value,options),limit=options.enemyLimit;
 if(Number.isInteger(limit)){
  d.zombies=d.zombies.slice(0,limit);
  if(d.monsters017){d.monsters017.types=d.monsters017.types.slice(0,limit);d.monsters017.actors=d.monsters017.actors.slice(0,limit);for(const a of d.monsters017.actors)delete a.variant;}
  if(d.v010?.modules?.world)d.v010.modules.world.types=d.v010.modules.world.types.slice(0,limit);
  for(const owner of Object.values(d))if(owner&&Array.isArray(owner.corpses))owner.corpses=owner.corpses.filter(c=>c.i<limit);
 }
 if(options.signalJournal){const messages=new Set(['en','ru'].flatMap(lang=>Object.entries(require('../locales/'+lang+'.json')).filter(([k])=>k.startsWith('signal.result.')).map(([,v])=>v)));
  if(d.v010?.modules?.progression?.journal)d.v010.modules.progression.journal=d.v010.modules.progression.journal.filter(row=>!messages.has(row.text));}
 return d;
};
