// ONLY the approved R3 room translation for historical equality oracles.
// Independent corrective gates assert the forward migration and new bodies.
exports.previousLayout=function(value){
 const d=JSON.parse(JSON.stringify(value));if(d?.bunker030?.layout!==3)return d;
 const move=p=>{if(p?.scene!=='bunker'||p.x<290||p.x>810)return;if(p.y>=-240&&p.y<260)p.y+=1000;else if(p.y>=760&&p.y<=1260)p.y-=1000;};
 move(d.player);move(d.robots014);move(d.robots014?.guard);for(const p of d.v010?.modules?.camera?.markers||[])move(p);move(d.v010?.modules?.camera?.goal);
 if(d.player?.scene==='bunker'&&d.v091?.fortress){d.v091.fortress.x=d.player.x;d.v091.fortress.y=d.player.y;}
 for(const r of d.equipment032?.instances||[])if(r.transform.room==='workshop')r.transform.y+=1000;
 d.bunker030.layout=2;return d;
};
exports.previousCampaign=function(d){
 if(d.campaign031?.contentRevision===3){for(const id of ['copper_after','medical_stock','drone_once','workshop_light'])delete d.campaign031.objectives[id];d.campaign031.contentRevision=2;d.campaign031.revision=Math.max(0,d.campaign031.revision-1);}
 return d;
};
exports.previousRooms=rooms=>{rooms=JSON.parse(JSON.stringify(rooms));[rooms.workshop,rooms.room6]=[rooms.room6,rooms.workshop];return rooms;};
