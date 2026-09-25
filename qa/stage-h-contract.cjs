/* Historical save comparison only. Reverse the explicit H equipment migration
   for legacy HMG IDs. Native defense/craft/damage uses unprojected Stage H tests. */
exports.project=value=>{
 const d=JSON.parse(JSON.stringify(value));if(!d?.defense039)return d;
 const records=d.equipment032.instances.filter(r=>['automatic_turret','heavy_turret','searchlight'].includes(r.typeId));
 const oldGun=r=>({id:r.id,ammo:r.state.settings.ammo,angle:r.state.settings.angle,enabled:d.v09.power.deviceEnabled[r.id],level:r.state.level});
 for(const r of records){
  if(/^hmg016_/.test(r.id)){
   const gun=oldGun(r);if(r.placement==='installed')d.turret016.guns.push({...gun,x:r.transform.x+60,y:r.transform.y+48,wallId:r.state.settings.mountWall||null,fallen:r.state.settings.fallen});
   else for(let i=0;i<d.bag.length;i++)if(d.bag[i]?.instanceId===r.id)d.bag[i]={type:'hmg016',qty:1,turretData:gun};
  }
  delete d.v09.power.deviceEnabled[r.id];
 }
 d.equipment032.instances=d.equipment032.instances.filter(r=>!records.includes(r));delete d.defense039;return d;
};
exports.manifest=value=>{
 const d=JSON.parse(JSON.stringify(value));for(const type of ['automatic_turret','heavy_turret','searchlight']){delete d.images['buildable/'+type];delete d.art[type];}return d;
};
exports.assetBytes=file=>file==='assets/manifest.json'?Buffer.from(JSON.stringify(exports.manifest(JSON.parse(require('node:fs').readFileSync(file))),null,2)+'\n'):require('node:fs').readFileSync(file);
