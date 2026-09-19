/* 0.20.0: perimeter geometry and cached art. Existing repair/combat own HP. */
window.V020Walls=(()=>{
  'use strict';
  const bounds=Object.freeze({left:138,top:98,right:1462,bottom:1102,thickness:104});
  const courtyard=Object.freeze({left:242,top:202,right:1358,bottom:998});
  const cornerSize=160;
  const gate={x:298+1004/3,y:998,w:1004/3,h:104};
  const corners=[
    {id:'nw',corner:'NW',side:'N',sides:['N','W'],x:218,y:178},
    {id:'ne',corner:'NE',side:'N',sides:['N','E'],x:1382,y:178},
    {id:'se',corner:'SE',side:'S',sides:['S','E'],x:1382,y:1022},
    {id:'sw',corner:'SW',side:'S',sides:['S','W'],x:218,y:1022}
  ];
  const stairs=[];
  for(const side of ['N','E','S','W'])for(let i=0;i<4;i++){
    const along=(side==='N'?[340,680,930,1270]:side==='S'?[340,640,960,1270]:[300,560,740,900])[i];
    const x=side==='W'?210:side==='E'?1390:along,y=side==='N'?170:side==='S'?1030:along;
    const nx=side==='W'?1:side==='E'?-1:0,ny=side==='N'?1:side==='S'?-1:0;
    stairs.push({id:side.toLowerCase()+'_'+i,side,name:'Лестница',x,y,foot:{x:x+nx*110,y:y+ny*110},angle:Math.atan2(ny,nx)-Math.PI/2});
  }
  function create(add){
    for(const c of corners)Object.assign(add('v091wall020_corner_'+c.corner,c.x-80,c.y-80,160,160,6000,'outer',c.side),{corner:c.corner,sides:c.sides});
    for(const side of ['N','S'])for(let i=0;i<3;i++){
      const x=298+i*1004/3,y=side==='N'?98:998;
      if(side==='S'&&i===1)add('gate',x,y,1004/3,104,6000,'gate','S','south');
      else add('v091wall020_'+side+'_'+i,x,y,1004/3,104,6000,'outer',side);
    }
    for(const side of ['W','E'])for(let i=0;i<3;i++)add('v091wall020_'+side+'_'+i,side==='W'?138:1358,258+i*228,104,228,6000,'outer',side);
  }
  const perimeter=o=>o?.group==='outer'||o?.gate==='south';
  const inside=(x,y,pad=0)=>x>courtyard.left+pad&&x<courtyard.right-pad&&y>courtyard.top+pad&&y<courtyard.bottom-pad;
  function supportAt(x,y){return window.V015Base?.sections.find(o=>perimeter(o)&&o.hp>0&&x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h)||null;}
  const usable=t=>!!supportAt(t.x,t.y);
  function overlap(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));}
  function oldLayout(){
    const a=[];const add=(id,x,y,w,h,hp)=>a.push({id,x,y,w,h,legacyMaxHp:hp});
    for(const side of ['N','S'])for(const [part,start]of [['L',170],['R',870]])for(let i=0;i<4;i++)add('v091wall015_'+side+part+'_'+i,start+140*i,side==='N'?130:998,140,72,6000);
    for(const side of ['W','E'])for(let i=0;i<8;i++)add('v091wall015_'+side+'_'+i,side==='W'?170:1358,202+99.5*i,72,99.5,6000);
    add('gate',730,1025,140,45,6000);add('v015northGate',730,130,140,72,6000);add('v091innerGate',730,1170,140,20,3000);
    for(const side of ['W','E'])for(let i=0;i<3;i++)add('v015airlock'+side+'_'+i,side==='W'?714:870,1070+i*100/3,16,100/3,3000);
    return a;
  }
  // Atlas frames are generated art; positions are physical footprints, not images.
  const atlas=__ART_FRAMES_020__;
  const images=new Map(),cache=new Map();
  function image(level){level=clamp(level||1,1,5);if(!images.has(level)){const im=new Image();im.src=atlas[level].file;images.set(level,im);}return images.get(level);}
  image(1); // Higher upgrade atlases are requested only when first visible.
  const frame=(level,part)=>atlas[clamp(level||1,1,5)].frames[part];
  const ready=level=>{const im=image(level);return im.complete&&im.naturalWidth>0;};
  const stage=o=>o.hp<=0?4:o.hp/o.maxHp<=.2?3:o.hp/o.maxHp<=.5?2:o.hp/o.maxHp<=.9?1:0;
  function drawFrame(c,level,part,x,y,w,h){
    if(!ready(level))return false;let [sx,sy,sw,sh]=frame(level,part);
    // Cut the flush wall ends to its required length instead of stretching detail.
    if(part==='wall'){const wanted=sh*w/h;if(wanted<sw){sx+=(sw-wanted)/2;sw=wanted;}}
    c.drawImage(image(level),sx,sy,sw,sh,x,y,w,h);return true;
  }
  function cracks(c,w,h,s,seed=0){
    if(s<1||s>3)return;
    c.save();c.beginPath();c.rect(1,1,w-2,h-2);c.clip();
    const count=s===1?2:s===2?4:6;
    for(let i=0;i<count;i++){
      const x=[.23,.71,.46,.89,.09,.59][i]*w,points=[];
      // Fixed paths grow longer and branch as damage worsens; old cracks never move.
      for(let j=0;j<(s===1?6:s===2?9:12);j++)points.push([x+Math.sin(seed*1.7+i*5+j*2.3)*(4+j*.6)+Math.sin(j+i)*3,1+j*h/11]);
      const stroke=(dx,dy,color,width)=>{c.beginPath();for(let j=0;j<points.length;j++){const [px,py]=points[j];j?c.lineTo(px+dx,py+dy):c.moveTo(px+dx,py+dy);}c.strokeStyle=color;c.lineWidth=width;c.stroke();};
      stroke(.7,.7,'#b7b39785',s*.6+.8);stroke(0,0,'#111b1ee0',s*.6+.25);
      for(let branch=2;branch<points.length-1;branch+=3){const [px,py]=points[branch],sign=(branch+i)%2?1:-1;c.beginPath();c.moveTo(px,py);c.lineTo(px+sign*7,py-6);c.lineTo(px+sign*13,py-9);if(s>1)c.lineTo(px+sign*18,py-8);c.strokeStyle='#1a2625c7';c.lineWidth=.4+s*.25;c.stroke();}
    }
    if(s===3)for(let i=0;i<9;i++){const x=7+(i*61+seed*17)%(w-16),y=5+(i*29)%(h-10);c.fillStyle=i%2?'#adb09a':'#162428';c.beginPath();c.moveTo(x,y);c.lineTo(x+9,y+1);c.lineTo(x+5,y+7);c.closePath();c.fill();}
    c.restore();
  }
  function rubble(c,w,h){
    for(let i=0;i<Math.max(7,Math.ceil(w/20));i++){
      const x=4+(i*53)%(w-16),y=4+(i*31)%(h-14),r=3+i%5;
      c.fillStyle=i%3?'#626d66b8':'#9c9d8988';c.beginPath();c.moveTo(x,y);c.lineTo(x+r+5,y-2);c.lineTo(x+r+7,y+5);c.lineTo(x+2,y+r);c.closePath();c.fill();
    }
  }
  function wallSprite(o){
    const w=Math.max(o.w,o.h),h=Math.min(o.w,o.h),level=o.level||1,s=stage(o),loaded=ready(level);
    const key=[w.toFixed(3),h,o.corner?'corner':'wall',level,s,loaded].join(':');if(cache.has(key))return cache.get(key);
    const v=typeof OffscreenCanvas==='function'?new OffscreenCanvas(Math.ceil(w)+12,Math.ceil(h)+12):document.createElement('canvas');v.width=Math.ceil(w)+12;v.height=Math.ceil(h)+12;const c=v.getContext('2d');
    if(s===4)rubble(c,w,h);else{
      c.fillStyle='#07131832';c.fillRect(5,7,w,h);
      if(!drawFrame(c,level,o.corner?'corner':'wall',0,0,w,h)){c.fillStyle='#5e6862';c.fillRect(0,0,w,h);c.fillStyle='#929689';c.fillRect(0,0,w,22);if(o.corner)c.fillRect(0,0,22,h);c.fillStyle='#313e3b';c.fillRect(o.corner?23:1,23,w-(o.corner?24:2),h-28);}
      cracks(c,w,h,s,level);
    }
    if(cache.size>128)cache.clear();cache.set(key,v);return v;
  }
  function drawWall(o){
    const a=o.corner?{NW:0,NE:Math.PI/2,SE:Math.PI,SW:-Math.PI/2}[o.corner]:{N:0,E:Math.PI/2,S:Math.PI,W:-Math.PI/2}[o.side];
    const w=Math.max(o.w,o.h),h=Math.min(o.w,o.h);
    ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate(a||0);ctx.drawImage(wallSprite(o),-w/2,-h/2);ctx.restore();
  }
  function drawStairs(t){
    const wall=supportAt(t.x,t.y);if(!wall)return;
    if(!visibleOnScreen((t.x+t.foot.x)/2,(t.y+t.foot.y)/2,110))return;
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);
    if(!drawFrame(ctx,wall.level,'stairs',-19,7,38,103)){ctx.fillStyle='#283a3a';ctx.fillRect(-19,7,38,103);for(let y=10;y<106;y+=12){ctx.fillStyle='#9ca89b';ctx.fillRect(-16,y,32,3);}ctx.strokeStyle='#a8b7ab';ctx.lineWidth=2;ctx.strokeRect(-19,7,38,103);}
    if(distance(player.x,player.y,t.foot.x,t.foot.y)<90&&!player.wallLevel){ctx.fillStyle='#bbceb67a';ctx.beginPath();ctx.moveTo(0,116);ctx.lineTo(-4,122);ctx.lineTo(4,122);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  function inwardSafePoint(x,y,r=17){
    const p={x:clamp(x,courtyard.left+r+6,courtyard.right-r-6),y:clamp(y,courtyard.top+r+6,courtyard.bottom-r-6)};
    for(let d=0;d<=320;d+=12)for(let i=0;i<(d?24:1);i++){const a=i*Math.PI/12,q={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d};if(inside(q.x,q.y,r+2)&&!worldCollision(q.x,q.y,r,'surface'))return q;}
    return null;
  }
  return {bounds,courtyard,cornerSize,gate,corners,stairs,create,perimeter,inside,supportAt,usable,overlap,oldLayout,atlas,image,ready,stage,cracks,drawWall,drawStairs,inwardSafePoint};
})();
