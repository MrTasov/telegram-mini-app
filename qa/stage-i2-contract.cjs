// Historical combat oracle: compare the original controlled actors, including
// their HP and damage. I2 reinforcement composition/budget is tested separately.
// Never apply this projection to saves/migrations or the real I2 scenarios.
exports.project=(value,options={})=>{
 const d=require('./world-farm-contract.cjs').project(value,options),limit=options.enemyLimit??((options.historicalPopulation||options.fresh)?48:undefined);
 // Compare HP ratios to the historical 1.5 balance ONLY in this old oracle.
 // Direct save/Siege tests verify unprojected values, migrations and all actors.
 const current=/^0\.41\.[2-9]$/.test(value.gameVersion||'');
 if(current&&value.monsters017?.schema===2){const n=Math.floor((value.lighting016?.day||1)/10),scale=Math.round(Math.min(2,1.2+.1*Math.max(0,n-1))*100)/100;for(let i=0;i<d.zombies.length;i++)if(value.monsters017.actors[i]?.raid)d.zombies[i].health=d.zombies[i].health/scale*1.5;}
 for(const z of d.zombies||[])z.health=Math.round(z.health*1e8)/1e8;
 if(options.siegeClockStart!==undefined&&value.signal041?.schema===2)d.lighting016.minute=options.siegeClockStart+(d.lighting016.minute-options.siegeClockStart)*3;
 if(options.siegeClockStart!==undefined)d.lighting016.minute=Math.round(d.lighting016.minute*1e7)/1e7;
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
