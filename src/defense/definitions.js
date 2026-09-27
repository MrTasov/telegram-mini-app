/* Stage H content, separate type IDs from registry IDs and future unlock IDs. */
const DefenseDefinitions=(()=>{
 const types={
  automatic_turret:{footprint:{w:90,h:72},body:{x:27,y:18,w:36,h:36},pivot:{x:45,y:36},powerKW:.35,hp:1800,cost:{iron:60,copper:25,parts:14,advanced_parts:1},limit:8,damage:30,intervalMs:190,range:300,capacity:400,turnRate:4.5,ammoType:'ammo',name:'Автоматическая турель',art:'automatic_turret'},
  heavy_turret:{footprint:{w:120,h:96},body:{x:32,y:20,w:56,h:56},pivot:{x:60,y:48},powerKW:.7,hp:3600,cost:{steel:30,copper:30,parts:20,advanced_parts:2},transformFrom:'automatic_turret',craftable:false,limit:8,damage:45,intervalMs:190,range:340,capacity:600,turnRate:3.8,ammoType:'ammo',name:'Тяжёлая турель',art:'heavy_turret'},
  searchlight:{footprint:{w:64,h:96},body:{x:18,y:44,w:28,h:34},pivot:{x:32,y:30},powerKW:.45,hp:1200,cost:{iron:18,copper:8,parts:6},limit:8,range:1100,halfAngle:.48,name:'Прожектор',art:'searchlight'}
 };
 const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);};
 return freeze({types,yard:{left:254,right:1346,top:214,bottom:986},repairHPPerIron:300});
})();
