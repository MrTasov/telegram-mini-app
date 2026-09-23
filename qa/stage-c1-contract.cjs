// Only the explicit wearable conversion is projected for historical equality.
// Migration identity, conservation, availability, duplicate rejection and all
// other item fields are separately asserted by stage-c1-light-modules.cjs.
exports.project=value=>{
 const d=require('./stage-c2-contract.cjs').project(value);delete d.headModules033;delete d.recovery033;
 if(d.equipment?.head?.uid?.startsWith('gear-legacy-head')&&d.equipment.head.type==='head_mount')d.equipment.head=null;
 else if(d.equipment?.head?.attachments)delete d.equipment.head.attachments;
 for(const list of [d.bag,d.quick013?.items,d.quick?.items])if(list)for(let i=0;i<list.length;i++)if(list[i]?.type==='flashlight')list[i]=null;
 if(d.handSlots?.[d.activeHandSlot]==='flashlight')d.activeHandSlot=null;
 if(d.handSlots)d.handSlots=d.handSlots.map(t=>t==='flashlight'?null:t);
 if(d.starterPending)d.starterPending=d.starterPending.filter(t=>t!=='flashlight');
 delete d.flashlightOn;return d;
};
