/* The minimap keeps its size and scale; only full-map live detection expands. */
window.V0141Map=(()=>{
  function radius(){const m=el('v010Minimap');return Math.min(m.width,m.height)/2/(scene==='surface'?.105:.13);}
  function visible(m,mini=false){
    // Buildings and parked cars are static landmarks. Their discovery rules
    // remain in the existing map system; resource/enemy state is local only.
    if(mini||['building','car'].includes(m.kind))return true;
    return distance(player.x,player.y,m.x,m.y)<=radius()*1.5;
  }
  function drawRange(c,scale){c.save();c.strokeStyle='#b8d9cc80';c.lineWidth=1/scale;c.beginPath();c.arc(player.x,player.y,radius()*1.5,0,Math.PI*2);c.stroke();c.restore();}
  return {radius,visible,drawRange};
})();

/* Cached organic canopies. World collision and resource amounts are unchanged. */
window.V0141Trees=(()=>{
  const sprites=new Map(),extraActors=new Set();
  function seed(id){let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
  function variant(t){return seed(t.id)%12;}
  function size(t){return [31,41,52][variant(t)%3];}
  function baseY(t){return t.y+size(t)*.46;}
  function sprite(t){
    const key=variant(t);if(sprites.has(key))return sprites.get(key);
    const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(256,256):document.createElement('canvas');canvas.width=256;canvas.height=256;
    const c=canvas.getContext('2d');c.scale(2,2);c.translate(64,65);
    let n=seed('canopy'+key);const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    const r=size(t),form=Math.floor(key/3),width=[.97,.77,1.06,.91][form]+rnd()*.05,height=[.89,1.02,.75,.94][form]+rnd()*.04;
    c.fillStyle='#594d34';c.beginPath();c.moveTo(-4,r*.12);c.lineTo(-3,r*.48);c.lineTo(4,r*.48);c.lineTo(5,r*.08);c.fill();
    c.strokeStyle='#8f7950';c.lineWidth=1.6;c.beginPath();c.moveTo(-1,r*.44);c.lineTo(0,r*.08);c.stroke();
    c.save();c.scale(width,height);
    // Uneven connected lobes produce a coherent crown instead of flat circles.
    const lobes=[];for(let i=0;i<11;i++){const a=i*Math.PI*2/11;lobes.push({x:Math.cos(a)*r*(.42+rnd()*.13),y:Math.sin(a)*r*(.4+rnd()*.15)-5,r:r*(.38+rnd()*.10)});}
    c.fillStyle='#253e2c';c.beginPath();c.arc(0,-5,r*.58,0,Math.PI*2);for(const p of lobes){c.moveTo(p.x+p.r,p.y);c.arc(p.x,p.y,p.r,0,Math.PI*2);}c.fill();
    c.save();c.clip();
    const shade=c.createRadialGradient(-r*.3,-r*.4,1,0,0,r*1.1);shade.addColorStop(0,['#7b915b','#718657','#84915b'][key%3]);shade.addColorStop(.65,'#4f7047');shade.addColorStop(1,'#294a34');c.fillStyle=shade;c.fillRect(-64,-64,128,128);
    for(let i=0;i<32;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*r*.78,x=Math.cos(a)*d,y=Math.sin(a)*d-5,cr=r*(.12+rnd()*.22),g=c.createRadialGradient(x-cr*.2,y-cr*.25,1,x,y,cr);g.addColorStop(0,i%3?'#adc27650':'#183f343b');g.addColorStop(1,i%3?'#adc27600':'#183f3400');c.fillStyle=g;c.beginPath();c.arc(x,y,cr,0,Math.PI*2);c.fill();}
    for(let i=0;i<170;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*r*.95,x=Math.cos(a)*d,y=Math.sin(a)*d-5;c.fillStyle=i%3?'#b0c28232':'#12372938';c.beginPath();c.ellipse(x,y,1.2+rnd()*3,1+rnd()*1.8,a,0,Math.PI*2);c.fill();}
    c.restore();
    c.restore();sprites.set(key,canvas);return canvas;
  }
  function inLayer(t,layer){
    if(layer==='all')return true;
    const outer=t.x<-1000||t.x>2600||t.y<0||t.y>4800;
    if(layer==='expansion12')return outer;
    if(outer)return false;
    if(layer==='fortress')return inFortress(t.x,t.y);
    const extension=t.x<-400||t.x>2000||t.y>3000;
    if(layer==='extension')return extension;
    return !inFortress(t.x,t.y)&&!extension;
  }
  function ground(layer){for(const t of worldTrees){if(!inLayer(t,layer)||!visibleOnScreen(t.x,t.y,95))continue;
    ctx.save();const r=size(t);ctx.fillStyle='#091c1528';ctx.beginPath();ctx.ellipse(t.x+8,t.y+14,t.felled?14:r*.87,t.felled?8:r*.57,.18,0,Math.PI*2);ctx.fill();
    if(t.felled){ctx.fillStyle='#806d4c';ctx.beginPath();ctx.ellipse(t.x,t.y,9,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b8a078';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(t.x,t.y,5.5,4,0,0,Math.PI*2);ctx.stroke();if(t.wood>0){ctx.lineCap='round';ctx.strokeStyle='#967149';ctx.lineWidth=7;for(let j=0;j<2;j++){ctx.beginPath();ctx.moveTo(t.x-13,t.y+14+j*8);ctx.lineTo(t.x+16,t.y+6+j*8);ctx.stroke();}}else if(t.regrowMs<300000){ctx.strokeStyle='#6d9459';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x,t.y-11);ctx.stroke();ctx.fillStyle='#73935a';ctx.beginPath();ctx.ellipse(t.x+4,t.y-9,6,3,-.5,0,Math.PI*2);ctx.fill();}}
    ctx.restore();}}
  function drawTree(t){ctx.drawImage(sprite(t),t.x-64,t.y-65,128,128);}
  function actors(){
    const entries=[];for(const t of worldTrees)if(!t.felled&&visibleOnScreen(t.x,t.y,100))entries.push({id:t.id,y:baseY(t),draw:()=>drawTree(t)});
    for(let i=0;i<zombies.length;i++){const z=zombies[i];if(z.alive&&visibleOnScreen(z.x,z.y,80))entries.push({id:'zombie_'+i,y:z.y,draw:()=>drawZombie(z)});}
    entries.push({id:'player',y:player.y,draw:()=>drawPlayer()});
    const drone=window.V014Robots?.state;if(drone&&!drone.packed&&drone.scene===scene)entries.push({id:'drone',y:drone.y,draw:()=>V014Robots.draw()});
    for(const provider of extraActors)for(const a of provider()||[])entries.push(a);
    entries.sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));return entries;
  }
  function drawActors(){for(const z of zombies)if(!z.alive&&visibleOnScreen(z.x,z.y,120))drawZombie(z);for(const a of actors())a.draw();}
  return {ground,drawActors,actors,size,baseY,variant,registerActors:fn=>extraActors.add(fn)};
})();

/* Compact circular minimap below the settings button in either orientation. */
v09Style(`
  #v010Minimap{
    top:calc(var(--v011-game-top) + 94px)!important;
    width:136px;height:136px;box-sizing:border-box;
    border-radius:50%;clip-path:circle(50%);overflow:hidden;
    transition:opacity .22s ease;touch-action:none;
    user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
  }
  @media(max-width:500px){#v010Minimap{width:120px;height:120px}}
  @media(max-height:550px){#v010Minimap{width:112px;height:112px}}
`);

