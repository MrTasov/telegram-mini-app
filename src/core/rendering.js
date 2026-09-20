/* =====================================================
   MESSAGE
===================================================== */

let messageTimer = null;

function message(text){

  const box =
    el("message");

  I18n.assign(box,"textContent",text);

  box.classList.add(
    "show"
  );

  clearTimeout(
    messageTimer
  );

  messageTimer =
    setTimeout(
      function(){

        box.classList.remove(
          "show"
        );

      },
      2300
    );

}

/* =====================================================
   TRANSITIONS
===================================================== */

function transition(title,callback){

  const fade =
    el("fade");

  I18n.assign(fade,"textContent",title);

  fade.classList.add(
    "show"
  );

  stopControls(true);

  setTimeout(
    function(){

      callback();

      setTimeout(
        function(){

          fade.classList.remove(
            "show"
          );

        },
        260
      );

    },
    400
  );

}

function enterBunker(){

  transition(
    "ПОДЗЕМНАЯ БАЗА",
    function(){

      scene =
        "bunker";

      player.x =
        bunker.entrance.x;

      player.y =
        bunker.entrance.y -
        70;

      bullets.length =
        0;

      I18n.assign(el("locationName"),"textContent","БУНКЕР");
      queueGameSave();

    }
  );

}

function leaveBunker(){

  transition(
    "ПОВЕРХНОСТЬ",
    function(){

      scene =
        "surface";

      player.x =
        800;

      player.y =
        690;

      bullets.length =
        0;

      I18n.assign(el("locationName"),"textContent","БАЗА");
      queueGameSave();

    }
  );

}

actionButton.addEventListener('pointerdown',function(e){
  e.preventDefault();e.stopPropagation();
  if(!GameInput.isMobile)return;
  GameActions.dispatch('INTERACT',{nearest:true});
});


/* =====================================================
   DRAW SURFACE
===================================================== */

function drawSurface(){window.V015Base?.drawGround();}

function drawBunker(){

  ctx.fillStyle="#101417";
  ctx.fillRect(-300,-1100,2050,2600);

  const c=bunker.corridor;

  // №1 CORRIDOR
  ctx.fillStyle="#3b4042";
  ctx.fillRect(c.left,c.top,c.right-c.left,c.bottom-c.top);

  V011Rooms.floor("corridor",c);

  // subtle corridor floor seams
  ctx.strokeStyle="rgba(255,255,255,.05)";
  ctx.lineWidth=1;
  for(let y=c.top+60;y<c.bottom;y+=70){
    ctx.beginPath();
    ctx.moveTo(c.left,y);
    ctx.lineTo(c.right,y);
    ctx.stroke();
  }

  function drawSideRoom(o,side,label,fill="#303638"){
    ctx.fillStyle=fill;
    ctx.fillRect(o.left,o.top,o.right-o.left,o.bottom-o.top);
    V011Rooms.floor(Object.keys(bunker).find(k=>bunker[k]===o)||"storage",o);

    ctx.strokeStyle="#747878";
    ctx.lineWidth=16;
    ctx.strokeRect(o.left,o.top,o.right-o.left,o.bottom-o.top);

    // Open doorway toward corridor
    ctx.fillStyle=fill;
    if(side==="left"){
      ctx.fillRect(o.right-18,o.doorTop,40,o.doorBottom-o.doorTop);
    }else{
      ctx.fillRect(o.left-22,o.doorTop,40,o.doorBottom-o.doorTop);
    }

    V011Rooms.walls(o,side);
    ctx.fillStyle="rgba(255,255,255,.64)";
    ctx.font="12px Arial";
    ctx.textAlign="center";
    ctx.fillText(I18n.text(label),(o.left+o.right)/2,o.top+34);
  }

  // №2 — WORKSHOP (visual redesign; existing interaction preserved)
  drawSideRoom(bunker.workshop,"left","","#343a3c");

  V09Craft.drawWorkshop();

  // №3 — STORAGE: 8 independent functional chests, 4 on top wall + 4 on bottom wall
  drawSideRoom(bunker.storage,"right","СКЛАД","#303638");

  V011Rooms.storage();

  // №4–7 — equal-size empty rooms
  // №4 — MEDICAL ROOM
  drawSideRoom(bunker.room4,"left","МЕДБЛОК","#343b3c");

  // Main medical crafting station — placed on the far/top wall, away from doorway
  ctx.fillStyle="#46575a";
  ctx.fillRect(145,300,245,78);
  ctx.strokeStyle="#83999d"; ctx.lineWidth=3; ctx.strokeRect(145,300,245,78);
  ctx.fillStyle="#dce8e9"; ctx.font="12px Arial"; ctx.textAlign="center";
  ctx.fillText(I18n.text("МЕДИЦИНСКИЙ СТОЛ"),267,330);
  ctx.font="19px Arial";
  ctx.fillText(I18n.text("💊  🧪  🩹"),267,359);

  // Decorative examination bed along the lower wall
  ctx.fillStyle="#596568";
  ctx.fillRect(145,650,225,58);
  ctx.strokeStyle="#879699"; ctx.lineWidth=3; ctx.strokeRect(145,650,225,58);
  ctx.fillStyle="#cbd5d7";
  ctx.fillRect(160,658,55,42);
  ctx.fillStyle="#e8eeee"; ctx.font="10px Arial";
  ctx.fillText(I18n.text("МЕДИЦИНСКАЯ КУШЕТКА"),257,728);

  // Medicine cabinet on the left wall
  ctx.fillStyle="#e1e7e8";
  ctx.fillRect(110,430,58,130);
  ctx.strokeStyle="#8da0a3"; ctx.lineWidth=3; ctx.strokeRect(110,430,58,130);
  ctx.strokeStyle="#aebabc"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(139,430); ctx.lineTo(139,560); ctx.stroke();
  ctx.fillStyle="#d64f4f"; ctx.fillRect(128,472,22,8); ctx.fillRect(135,465,8,22);

  // Small sink / sanitation corner, decorative
  ctx.fillStyle="#4c595c";
  ctx.fillRect(455,315,100,58);
  ctx.strokeStyle="#819194"; ctx.strokeRect(455,315,100,58);
  ctx.fillStyle="#b7c5c7";
  ctx.beginPath(); ctx.ellipse(505,342,26,12,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#dce4e5"; ctx.font="9px Arial";
  ctx.fillText(I18n.text("МОЙКА"),505,366);

  // Two compact supply crates beside the examination bed
  ctx.fillStyle="#59694f";
  ctx.fillRect(430,650,55,52);
  ctx.fillRect(500,650,55,52);
  ctx.strokeStyle="#829174";
  ctx.strokeRect(430,650,55,52); ctx.strokeRect(500,650,55,52);
  ctx.fillStyle="#fff"; ctx.font="9px Arial";
  ctx.fillText(I18n.text("БИНТЫ"),457,681);
  ctx.fillText(I18n.text("МЕД."),527,681);

  // Door side and the central approach remain clear for movement.
  // №5 — POWER ROOM: FUEL -> GENERATOR -> BATTERY
  drawSideRoom(bunker.room5,"right","ЭНЕРГОБЛОК","#303739");

  V011Rooms.energy();

  // The room center and the corridor/door side intentionally remain empty.
  // №6 — KITCHEN / FOOD BLOCK
  drawSideRoom(bunker.room6,"left","КУХНЯ","#3a3732");

  // TOP WALL — long main kitchen counter, the future functional cooking point
  ctx.fillStyle="#66513d";
  ctx.fillRect(145,-205,330,92);
  ctx.strokeStyle="#9a7b59"; ctx.lineWidth=4; ctx.strokeRect(145,-205,330,92);

  // Worktop
  ctx.fillStyle="#3d4443";
  ctx.fillRect(158,-192,304,24);

  // Stove
  ctx.fillStyle="#252a29";
  ctx.fillRect(180,-160,100,35);
  ctx.strokeStyle="#747c79"; ctx.lineWidth=2; ctx.strokeRect(180,-160,100,35);
  ctx.fillStyle="#b36f54";
  ctx.beginPath(); ctx.arc(205,-143,9,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(253,-143,9,0,Math.PI*2); ctx.fill();

  // Sink
  ctx.fillStyle="#9aa6a4";
  ctx.fillRect(335,-160,92,34);
  ctx.fillStyle="#505a58";
  ctx.fillRect(348,-153,66,20);

  ctx.fillStyle="#eee8dc"; ctx.font="11px Arial"; ctx.textAlign="center";
  ctx.fillText(I18n.text("КУХНЯ • ГОТОВКА"),310,-180);

  // LEFT WALL — refrigerator
  ctx.fillStyle="#596466";
  ctx.fillRect(110,-75,72,165);
  ctx.strokeStyle="#879496"; ctx.lineWidth=3; ctx.strokeRect(110,-75,72,165);
  ctx.strokeStyle="#778285"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(110,0); ctx.lineTo(182,0); ctx.stroke();
  ctx.fillStyle="#dfe6e6"; ctx.font="10px Arial";
  ctx.fillText(I18n.text("ХОЛОДИЛЬНИК"),146,112);

  // BOTTOM WALL — dining table
  ctx.fillStyle="#624c37";
  ctx.fillRect(225,135,190,70);
  ctx.strokeStyle="#8e704e"; ctx.lineWidth=3; ctx.strokeRect(225,135,190,70);
  // chairs
  ctx.fillStyle="#4c4033";
  ctx.fillRect(245,110,42,22);
  ctx.fillRect(352,110,42,22);
  ctx.fillRect(245,208,42,22);
  ctx.fillRect(352,208,42,22);

  // Decorative shelves / food supplies in the lower-left corner
  ctx.fillStyle="#4d4438";
  ctx.fillRect(110,145,72,78);
  ctx.strokeStyle="#786b57"; ctx.strokeRect(110,145,72,78);
  ctx.fillStyle="#d7c8a7"; ctx.font="14px Arial";
  ctx.fillText(I18n.text("🥫"),128,175);
  ctx.fillText(I18n.text("🍞"),161,175);
  ctx.fillText(I18n.text("🥣"),145,207);

  // Door side and central approach remain unobstructed.
  // №7 — LIVING ROOM, matched to the latest approved screenshot
  drawSideRoom(bunker.room7,"right","ЖИЛАЯ КОМНАТА","#393837");

  window.V011Living?.drawRoom();


  // Corridor side walls, drawn in separate segments so every doorway stays open.
  const wall="#747878";
  ctx.strokeStyle=wall;
  ctx.lineWidth=18;

  const leftDoors=[
    [bunker.room6.doorTop,bunker.room6.doorBottom],
    [bunker.room4.doorTop,bunker.room4.doorBottom],
    [bunker.workshop.doorTop,bunker.workshop.doorBottom]
  ];
  const rightDoors=[
    [bunker.room7.doorTop,bunker.room7.doorBottom],
    [bunker.room5.doorTop,bunker.room5.doorBottom],
    [bunker.storage.doorTop,bunker.storage.doorBottom]
  ];

  function drawWallWithDoors(x,doors){
    let y=c.top;
    for(const d of doors){
      if(d[0]>y){
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,d[0]);ctx.stroke();
      }
      y=d[1];
    }
    if(y<c.bottom){
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,c.bottom);ctx.stroke();
    }
  }
  drawWallWithDoors(c.left,leftDoors);
  drawWallWithDoors(c.right,rightDoors);
  V011Rooms.corridorWalls(c,leftDoors,rightDoors);

  // №8 — LARGE UNDERGROUND FARM, directly connected to corridor end
  const f=bunker.farm;
  ctx.fillStyle="#29352c";
  ctx.fillRect(f.left,f.top,f.right-f.left,f.bottom-f.top);
  window.V011Farm?.floor();
  ctx.strokeStyle="#68766b";
  ctx.lineWidth=18;
  ctx.strokeRect(f.left,f.top,f.right-f.left,f.bottom-f.top);

  // Wide doorway from corridor into farm
  ctx.fillStyle="#29352c";
  ctx.fillRect(f.doorLeft,f.bottom-22,f.doorRight-f.doorLeft,44);

  if(window.V011Farm)window.V011Farm.draw();

  ctx.fillStyle="#fff";
  ctx.font="20px Arial";
  ctx.textAlign="center";
  ctx.fillText(I18n.text("ПОДЗЕМНАЯ ФЕРМА"),(f.left+f.right)/2,f.top+22);

  // Rear wall and exit/hatch
  ctx.strokeStyle="#747878";
  ctx.lineWidth=18;
  ctx.beginPath();
  ctx.moveTo(c.left,c.bottom);
  ctx.lineTo(c.right,c.bottom);
  ctx.stroke();

  ctx.fillStyle="#17191a";
  ctx.fillRect(690,1145,70,70);
  ctx.strokeStyle="#aaaaaa";
  ctx.lineWidth=4;
  ctx.strokeRect(690,1145,70,70);
  ctx.fillStyle="white";
  ctx.font="12px Arial";
  ctx.textAlign="center";
  ctx.fillText(I18n.text("ВЫХОД"),725,1187);
}

/* =====================================================
   DRAW PLAYER
===================================================== */

function drawPlayer(){
  const angle=Math.atan2(player.aimY,player.aimX),item=heldItem();
  const bob=player.moving?Math.sin(player.walkAnimation)*3:0;
  const recoil=canFire()&&performance.now()-muzzleFlash.time<95?(typeof V09Craft!=='undefined'?(V09Craft.weapons[item]?.visualRecoil??-2.4):-2.4):0;
  if(!window.ActorVisuals?.drawPlayer(angle,item,recoil)){
  ctx.save();ctx.translate(player.x,player.y);ctx.rotate(angle);
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(-2,3,20,17,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#222c2c';ctx.lineWidth=8;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(-12+bob,-9);ctx.moveTo(-4,8);ctx.lineTo(-12-bob,9);ctx.stroke();
  ctx.fillStyle=equipment.body?'#586849':'#3d5865';ctx.beginPath();ctx.roundRect(-12,-13,25,26,7);ctx.fill();
  ctx.fillStyle='#303d31';ctx.fillRect(-17,-9,8,18);
  ctx.strokeStyle='#8a9277';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,-11);ctx.lineTo(-7,11);ctx.stroke();
  ctx.strokeStyle='#c9a47f';ctx.lineWidth=5;
  if(item==='rifle_ak74'||typeof V09Craft!=='undefined'&&V09Craft.weapons[item]?.heldStyle==='ak'){
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(25+recoil,-1);ctx.moveTo(3,11);ctx.lineTo(13+recoil,3);ctx.stroke();
    ctx.save();ctx.translate(recoil,0);
    ctx.fillStyle='#b47b4b';ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(10,-3);ctx.lineTo(10,4);ctx.lineTo(-4,8);ctx.closePath();ctx.fill();
    ctx.fillStyle='#202b2c';ctx.fillRect(9,-4,20,8);
    ctx.fillStyle='#a8693c';ctx.fillRect(24,-4,10,7);ctx.fillRect(13,4,4,7);
    ctx.strokeStyle='#242f30';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(21,4);ctx.quadraticCurveTo(19,13,28,16);ctx.stroke();
    ctx.fillStyle='#526064';ctx.fillRect(33,-2,11,3);ctx.fillStyle='#1c2425';ctx.fillRect(40,-5,3,4);
    ctx.strokeStyle='#8b9896';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,-3);ctx.lineTo(29,-3);ctx.stroke();ctx.restore();
  }else if(item==='rifle_m4'||typeof V09Craft!=='undefined'&&V09Craft.weapons[item]?.heldStyle==='m4'){
    V09Craft.drawM4Held(recoil);
  }else if(item==='axe'){
    const swing=chopState?Math.sin((performance.now()-chopState.startedAt)/110)*.75:-.22;
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(17,-5);ctx.moveTo(3,11);ctx.lineTo(14,6);ctx.stroke();
    ctx.save();ctx.translate(15,3);ctx.rotate(swing);
    ctx.strokeStyle='#b98451';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-5,7);ctx.lineTo(16,-15);ctx.stroke();
    ctx.fillStyle='#9cafb3';ctx.beginPath();ctx.moveTo(8,-16);ctx.lineTo(21,-21);ctx.lineTo(30,-13);ctx.lineTo(26,-4);ctx.lineTo(17,-8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#e0e9e9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(28,-16);ctx.lineTo(30,-13);ctx.lineTo(26,-4);ctx.stroke();ctx.restore();
  }else if(item==='pickaxe'){
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(18,-5);ctx.moveTo(3,11);ctx.lineTo(15,6);ctx.stroke();
    ctx.save();ctx.translate(16,3);ctx.rotate(window.V012Effects?.pickaxeSwing()??-.3);
    ctx.strokeStyle='#bc8f58';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-6,10);ctx.lineTo(17,-19);ctx.stroke();
    ctx.fillStyle='#b8c8c8';ctx.beginPath();ctx.moveTo(0,-20);ctx.quadraticCurveTo(18,-33,35,-9);ctx.lineTo(17,-19);ctx.closePath();ctx.fill();ctx.restore();
  }else if(item==='hammer'){
 window.V018Build?.drawHeld();
 }else if(item==='fishing_rod'){
 window.V012Fishing?.drawHeld();
 }else if(item==='remote'){
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(17,-5);ctx.moveTo(3,11);ctx.lineTo(17,5);ctx.stroke();
    ctx.fillStyle='#293e43';ctx.fillRect(13,-9,16,18);ctx.strokeStyle='#819c9e';ctx.lineWidth=1;ctx.strokeRect(13,-9,16,18);ctx.fillStyle='#69ba9a';ctx.fillRect(17,-6,8,10);
  }else if(item==='flashlight'){
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(17,-2);ctx.moveTo(3,11);ctx.lineTo(8,15);ctx.stroke();
    ctx.fillStyle='#253a42';ctx.fillRect(13,-4,15,7);ctx.fillStyle='#5d747d';ctx.fillRect(25,-6,7,11);ctx.fillStyle=flashlightOn?'#fff1b4':'#8c9b98';ctx.fillRect(32,-5,2,9);
  }else{
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(11,-13-bob);ctx.moveTo(3,11);ctx.lineTo(11,13+bob);ctx.stroke();
  }
  ctx.fillStyle=equipment.head?'#637258':'#cca784';ctx.beginPath();ctx.arc(1,0,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=equipment.head?'#414d3d':'#483c30';ctx.beginPath();ctx.arc(-1,0,7,Math.PI*.5,Math.PI*1.5);ctx.fill();
  ctx.restore();
  }
  if(canFire()&&rightAimActive){
    const dx=Math.cos(angle),dy=Math.sin(angle);let reach=88;
    for(let t=18;t<88;t+=3)if(worldCollision(player.x+dx*t,player.y+dy*t,1,scene)){reach=t;break;}
    ctx.strokeStyle='rgba(255,226,150,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(player.x+dx*reach,player.y+dy*reach,4,0,Math.PI*2);ctx.stroke();
  }
}
function drawFlashlight(){
  if(heldItem()!=='flashlight'||!flashlightOn||playerDead)return;
  const angle=Math.atan2(player.aimY,player.aimX),range=310;
  const ox=player.x+Math.cos(angle)*29,oy=player.y+Math.sin(angle)*29;
  if(!lineClear(player.x,player.y,ox,oy,1,scene))return;
  ctx.save();ctx.beginPath();ctx.moveTo(ox,oy);
  for(let i=0;i<=36;i++){
    const a=angle-.43+.86*i/36,dx=Math.cos(a),dy=Math.sin(a);let d=4;
    for(;d<range;d+=5)if(worldCollision(ox+dx*d,oy+dy*d,1,scene))break;
    ctx.lineTo(ox+dx*Math.max(0,d-5),oy+dy*Math.max(0,d-5));
  }
  ctx.closePath();ctx.clip();
  const light=ctx.createRadialGradient(ox,oy,4,ox,oy,range);
  light.addColorStop(0,'rgba(255,246,185,.42)');light.addColorStop(.55,'rgba(255,242,173,.23)');light.addColorStop(1,'rgba(255,242,173,0)');
  ctx.fillStyle=light;ctx.fillRect(ox-range,oy-range,range*2,range*2);ctx.restore();
}
function drawWorldTrees(layer='all'){if(window.V0141Trees)return V0141Trees.ground(layer);
  for(const t of worldTrees){
    if(layer==='expansion12'&&!t.id.startsWith('tree12_')||layer!=='expansion12'&&t.id.startsWith('tree12_')||layer==='fortress'&&!inFortress(t.x,t.y)||layer==='legacy'&&(inFortress(t.x,t.y)||t.id.startsWith('tree10_')||t.id.startsWith('tree10_south'))||layer==='extension'&&!t.id.startsWith('tree10_')&&!t.id.startsWith('tree10_south'))continue;
    if(!visibleOnScreen(t.x,t.y,45))continue;
    ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(t.x+5,t.y+8,t.felled?15:29,t.felled?9:25,0,0,Math.PI*2);ctx.fill();
    if(t.felled){
      ctx.fillStyle='#876547';ctx.beginPath();ctx.arc(t.x,t.y,10,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#bd9467';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,6,0,Math.PI*2);ctx.stroke();
      if(t.wood===0&&t.regrowMs<300000){
        ctx.strokeStyle='#85a16b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x,t.y-15);ctx.stroke();
        ctx.fillStyle='#709456';ctx.beginPath();ctx.ellipse(t.x-5,t.y-12,7,3,.5,0,Math.PI*2);ctx.ellipse(t.x+5,t.y-17,7,3,-.5,0,Math.PI*2);ctx.fill();
      }
      if(t.wood>0){ctx.strokeStyle='#9c744c';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(t.x-14,t.y+16);ctx.lineTo(t.x+15,t.y+8);ctx.moveTo(t.x-13,t.y+23);ctx.lineTo(t.x+16,t.y+15);ctx.stroke();}
    }else{
      ctx.fillStyle='#664b31';ctx.fillRect(t.x-6,t.y+2,12,27);
      ctx.fillStyle='#274830';ctx.beginPath();ctx.arc(t.x,t.y,24,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#385b3d';ctx.beginPath();ctx.arc(t.x-7,t.y-7,16,0,Math.PI*2);ctx.arc(t.x+11,t.y-3,13,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(128,155,87,.17)';ctx.beginPath();ctx.arc(t.x-10,t.y-13,8,0,Math.PI*2);ctx.fill();
    }
  }
}
function drawGate(){
  const {x,y,w,h}=gateRect;
  ctx.fillStyle='#555957';ctx.fillRect(x,y,w,h);
  const leaves=gateOpen?[[x,y,10,h],[x+w-10,y,10,h]]:[[x,y,w/2-2,h],[x+w/2+2,y,w/2-2,h]];
  for(const a of leaves){ctx.fillStyle='#38484a';ctx.fillRect(...a);ctx.strokeStyle='#89948b';ctx.lineWidth=2;ctx.strokeRect(...a);}
  if(!gateOpen){
    ctx.strokeStyle='#c5a36a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+8,y+10);ctx.lineTo(x+w/2-9,y+h-10);ctx.moveTo(x+w/2+9,y+h-10);ctx.lineTo(x+w-8,y+10);ctx.stroke();
    ctx.fillStyle='#d7b475';ctx.fillRect(x+w/2-6,y+h/2-5,12,10);
  }
  ctx.fillStyle=gateOpen?'#c5d4be':'#dec18c';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.text(gateOpen?'ВОРОТА ОТКРЫТЫ':'ВОРОТА ЗАКРЫТЫ'),x+w/2,y-13);
}
function drawParkedCars(){
  for(const o of scavenges){
    if(o.kind!=='car'||!visibleOnScreen(o.x+o.w/2,o.y+o.h/2,150))continue;
    ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);if(o.h>o.w)ctx.rotate(Math.PI/2);ctx.scale(Math.max(o.w,o.h)/130,Math.min(o.w,o.h)/64);
    ctx.fillStyle='#151b1d';for(const x of [-42,32])for(const y of [-35,27])ctx.fillRect(x,y,20,8);
    ctx.fillStyle=hasSearchableLoot(o)?'#665c50':'#3c4444';ctx.beginPath();ctx.roundRect(-65,-32,130,64,9);ctx.fill();
    ctx.fillStyle='#273a40';ctx.fillRect(-25,-25,12,50);ctx.fillRect(20,-25,16,50);
    ctx.strokeStyle='#8e897a';ctx.lineWidth=1;ctx.strokeRect(-10,-26,26,52);ctx.beginPath();ctx.moveTo(-53,-22);ctx.lineTo(-32,-22);ctx.moveTo(-53,22);ctx.lineTo(-32,22);ctx.stroke();
    ctx.fillStyle='#bdaf79';ctx.fillRect(59,-24,5,12);ctx.fillRect(59,12,5,12);ctx.fillStyle='#793b32';ctx.fillRect(-65,-24,4,10);ctx.fillRect(-65,14,4,10);ctx.restore();
    ctx.fillStyle='#eee1bc';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(I18n.text(hasSearchableLoot(o)?'ОБЫСКАТЬ':'ПУСТО'),o.x+o.w/2,o.y-10);
  }
}
function drawNavigationTarget(){
  const live=objectPointer?.following?screenToWorld(objectPointer.screenX,objectPointer.screenY):null;
  if(!navigation&&!live)return;
  if(live||navigation.destination){
    const p=live||navigation.destination;
    ctx.save();ctx.strokeStyle='#e0b36a';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.moveTo(p.x-13,p.y);ctx.lineTo(p.x+13,p.y);ctx.moveTo(p.x,p.y-13);ctx.lineTo(p.x,p.y+13);ctx.stroke();ctx.restore();return;
  }
  const o=interactionObjects().find(t=>t.id===navigation.targetId);if(!o)return;
  ctx.save();ctx.strokeStyle='#e0b36a';ctx.lineWidth=2;ctx.setLineDash([6,5]);
  if(o.r!==undefined){ctx.beginPath();ctx.arc(o.x,o.y,o.r+7,0,Math.PI*2);ctx.stroke();}
  else ctx.strokeRect(o.x-6,o.y-6,o.w+12,o.h+12);
  ctx.setLineDash([]);ctx.font='12px Arial';ctx.textAlign='center';ctx.fillStyle='#f0d2a2';ctx.fillText(I18n.text(o.kind==='storage'?I18n.crateName(storageChests[o.ref],o.ref):o.name),o.x+(o.w||0)/2,o.y-(o.r||0)-16);ctx.restore();
}


function drawZombie(zombie){

  if(!zombie.alive){

    /*
      Тело остаётся на земле.
    */

    ctx.save();

    ctx.translate(
      zombie.x,
      zombie.y
    );

    ctx.rotate(.9);

    ctx.fillStyle =
      "rgba(70,83,64,.70)";

    ctx.fillRect(
      -15,
      -7,
      30,
      14
    );

    ctx.fillStyle =
      "rgba(118,130,101,.65)";

    ctx.beginPath();

    ctx.arc(
      17,
      0,
      7,
      0,
      Math.PI*2
    );

    ctx.fill();

    ctx.restore();

    return;
  }

  const angle =
    Math.atan2(
      player.y-zombie.y,
      player.x-zombie.x
    );

  const hit =
    performance.now() -
    zombie.hitFlash
    <
    100;

  ctx.save();

  ctx.translate(
    zombie.x,
    zombie.y
  );

  ctx.rotate(angle);

  /* SHADOW */

  ctx.fillStyle =
    "rgba(0,0,0,.28)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    12,
    17,
    9,
    0,
    0,
    Math.PI*2
  );

  ctx.fill();

  /* BODY */

  ctx.fillStyle =
    hit
    ? "#b9b5a5"
    : "#59634f";

  ctx.fillRect(
    -10,
    -8,
    20,
    29
  );

  /* HEAD */

  ctx.fillStyle =
    hit
    ? "#d3cbb5"
    : "#87917a";

  ctx.beginPath();

  ctx.arc(
    3,
    -15,
    8,
    0,
    Math.PI*2
  );

  ctx.fill();

  /* ARMS */

  ctx.strokeStyle =
    "#747e68";

  ctx.lineWidth =
    5;

  ctx.beginPath();

  ctx.moveTo(
    5,
    -2
  );

  ctx.lineTo(
    22,
    -5
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(
    5,
    6
  );

  ctx.lineTo(
    22,
    8
  );

  ctx.stroke();

  ctx.restore();

  /* HEALTH */

  if(
    zombie.health <
    zombie.maxHealth
  ){

    const width = 34;

    ctx.fillStyle =
      "rgba(0,0,0,.65)";

    ctx.fillRect(
      zombie.x-width/2,
      zombie.y-36,
      width,
      4
    );

    ctx.fillStyle =
      "#b94d4d";

    ctx.fillRect(
      zombie.x-width/2,
      zombie.y-36,
      width *
      (
        zombie.health /
        zombie.maxHealth
      ),
      4
    );

  }

}

/* =====================================================
   DRAW BULLETS / MUZZLE
===================================================== */

function drawBullets(){

  for(const bullet of bullets){

    if(!visibleOnScreen(bullet.x,bullet.y,30)){
      continue;
    }

    ctx.fillStyle =
      "rgba(255,215,120,.25)";

    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      8,
      0,
      Math.PI*2
    );

    ctx.fill();

    ctx.fillStyle =
      "#ffd778";

    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      3.5,
      0,
      Math.PI*2
    );

    ctx.fill();

  }

  if(
    performance.now() -
    muzzleFlash.time
    <
    65
  ){

    ctx.fillStyle =
      "rgba(255,220,100,.85)";

    ctx.beginPath();

    ctx.arc(
      (window.ActorVisuals?.muzzlePoint()||muzzleFlash).x,
      (window.ActorVisuals?.muzzlePoint()||muzzleFlash).y,
      10,
      0,
      Math.PI*2
    );

    ctx.fill();

  }

}

