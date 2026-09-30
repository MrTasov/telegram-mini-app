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

// timing is optional: the surface <-> bunker hatch keeps its 400/260 ms; bunker floors use a
// shorter 300/200 ms hold, about 0.85 s in total with the 0.35 s CSS fade.
function transition(title,callback,timing={hold:400,after:260}){

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
      window.CommandCoreUI?.syncLocation();

      setTimeout(
        function(){

          fade.classList.remove(
            "show"
          );

        },
        timing.after
      );

    },
    timing.hold
  );

}

function enterBunker(){
  GameAudio.play('hatchOpen');

  transition(
    "ПОДЗЕМНАЯ БАЗА",
    function(){

      scene =
        "bunker";

      Object.assign(player,BunkerLayout.arrival(player));

      bullets.length =
        0;

      I18n.assign(el("locationName"),"textContent","БУНКЕР");
      queueGameSave();

    }
  );

}

function leaveBunker(){
  GameAudio.play('hatchOpen');

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
  if(window.GamePickup?.begin(interactionTarget?.id,{pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY,source:'action'}))return;
  GameActions.dispatch('INTERACT',{nearest:true});
});


/* =====================================================
   DRAW SURFACE
===================================================== */

function drawSurface(){window.V015Base?.drawGround();}

// 0.43 Phase 0: simple code-drawn furniture for the L2 kitchen and medical room (visual only; the
// footprints are the existing layout fixtures, so collision and drawing are the same objects).
function drawL2Furniture(){
 const box=(x,y,w,h,fill,stroke,r=4)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}};
 const k=BunkerLayout.fixture('kitchen'),fr=BunkerLayout.fixture('fridge'),d=BunkerLayout.fixture('dining'),m=BunkerLayout.fixture('medical_table');
 for(const f of [k,fr,d,m])V011Rooms.shadow(f.x,f.y,f.w,f.h,10,f.room);
 // Kitchen counter: worktop, sink, cutting board and a row of drawer fronts. It stops short of the
 // ceiling lamp's service point at x 4300, so the lamp stays reachable.
 box(k.x,k.y,k.w,k.h,'#4f5e59','#7d8f86',5);box(k.x+5,k.y+5,k.w-10,k.h-26,'#a4aea3',null,3);
 box(k.x+20,k.y+14,70,40,'#6f8a8f','#c9d6d2',6);box(k.x+30,k.y+22,50,24,'#3d5358',null,5);
 box(k.x+104,k.y+18,60,34,'#8a6a47','#b89569',3);box(k.x+178,k.y+16,58,36,'#c9ccc2','#e4e6dc',3);
 for(let x=k.x+10;x<k.x+k.w-40;x+=54){box(x,k.y+k.h-18,46,12,'#3e4b47',null,2);box(x+18,k.y+k.h-14,10,3,'#c3b58e',null,1);}
 // Fridge: two doors and handles.
 box(fr.x,fr.y,fr.w,fr.h,'#b8c2bd','#e2e8e2',6);ctx.fillStyle='#7b8a85';ctx.fillRect(fr.x+4,fr.y+58,fr.w-8,3);box(fr.x+fr.w-14,fr.y+18,5,30,'#5d6b67',null,2);box(fr.x+fr.w-14,fr.y+72,5,60,'#5d6b67',null,2);
 // Dining table with four chairs (the chairs sit inside the table's footprint).
 for(const [cx,cy] of [[d.x+38,d.y],[d.x+d.w-80,d.y],[d.x+38,d.y+d.h-22],[d.x+d.w-80,d.y+d.h-22]])box(cx,cy,42,22,'#5b4a3a','#8a7156',4);
 box(d.x,d.y+24,d.w,d.h-48,'#7a5e43','#a8845d',6);for(const [px,py] of [[d.x+58,d.y+44],[d.x+d.w-58,d.y+44],[d.x+58,d.y+d.h-44],[d.x+d.w-58,d.y+d.h-44]]){ctx.fillStyle='#d9ddd3';ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.fill();}
 // Medical work surface: steel top, first-aid box, instrument tray and bottles.
 box(m.x,m.y,m.w,m.h,'#6d7b7a','#a9b8b6',5);box(m.x+5,m.y+5,m.w-10,m.h-10,'#b7c3c1',null,3);
 box(m.x+18,m.y+14,54,42,'#e8ece6','#b44a42',4);ctx.fillStyle='#c0433b';ctx.fillRect(m.x+40,m.y+22,10,26);ctx.fillRect(m.x+32,m.y+30,26,10);
 box(m.x+92,m.y+20,72,30,'#8d9c9b','#d2dbd8',3);for(let i=0;i<4;i++){ctx.fillStyle='#eef2ee';ctx.fillRect(m.x+100+i*16,m.y+26,3,18);}
 for(let i=0;i<3;i++){ctx.fillStyle=['#6b9fb0','#c9a04a','#8fb58a'][i];ctx.beginPath();ctx.arc(m.x+190+i*16,m.y+m.h/2,6,0,Math.PI*2);ctx.fill();}
}
/* 0.43 corrective: Water Room machines (visual only; footprints are BunkerPassA.fixtures). */
function drawBoreholePump(o){
 const cx=o.x+o.w/2,cy=o.y+o.h/2+3;ctx.save();
 ctx.fillStyle='#0b141655';ctx.beginPath();ctx.ellipse(cx+2,cy+3,o.w/2,o.h/2-2,0,0,Math.PI*2);ctx.fill();
 // Concrete well casing with the dark bore, a steel head plate and the vertical pump motor.
 ctx.fillStyle='#7f8a84';ctx.beginPath();ctx.arc(cx,cy,19,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4b5552';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#1c2426';ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#8fa2a6';ctx.fillRect(cx-12,cy-4,24,8);ctx.fillStyle='#4f6f86';ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b8cbd3';ctx.lineWidth=1.2;ctx.stroke();
 ctx.fillStyle='#dfe7e3';ctx.beginPath();ctx.arc(cx,cy,2.6,0,Math.PI*2);ctx.fill();
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){ctx.fillStyle='#39413f';ctx.beginPath();ctx.arc(cx+Math.cos(a)*16,cy+Math.sin(a)*16,1.8,0,Math.PI*2);ctx.fill();}
 // Discharge pipe to the purifier along the wall, with a gauge.
 ctx.strokeStyle='#8d9b98';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx+8,cy);ctx.lineTo(o.x+o.w+4,cy);ctx.stroke();ctx.strokeStyle='#5b6a68';ctx.lineWidth=1;ctx.stroke();
 ctx.fillStyle='#e8e2c8';ctx.beginPath();ctx.arc(cx+17,cy-7,3.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#3a4240';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.moveTo(cx+17,cy-7);ctx.lineTo(cx+19,cy-9);ctx.stroke();
 ctx.restore();
}
function drawFiltrationUnit(o){
 ctx.save();ctx.fillStyle='#0b141655';ctx.fillRect(o.x+3,o.y+4,o.w,o.h);
 // Skid frame, two filter canisters (top view), a control box with status light and the clean-water outlet.
 ctx.fillStyle='#46595a';ctx.beginPath();ctx.roundRect(o.x,o.y+2,o.w,o.h-4,5);ctx.fill();ctx.strokeStyle='#8fa39d';ctx.lineWidth=2;ctx.stroke();
 for(const [k,col] of [[0,'#9fb7c2'],[1,'#8fb0a4']]){const x=o.x+13+k*17,y=o.y+16;ctx.fillStyle='#2a3a3e';ctx.beginPath();ctx.arc(x,y,8.5,0,Math.PI*2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#dbe7e6';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,4.2,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#34474b';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#7f8f8b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x+13,o.y+27);ctx.lineTo(o.x+13,o.y+34);ctx.lineTo(o.x+30,o.y+34);ctx.lineTo(o.x+30,o.y+27);ctx.stroke();
 ctx.fillStyle='#2b3538';ctx.fillRect(o.x+o.w-15,o.y+8,10,16);ctx.fillStyle=BunkerPassA.water.clean<GameplayBalance.farm.cleanCapacity&&devicePowered('water_system')?'#7fe0a2':'#c9b36b';ctx.fillRect(o.x+o.w-12,o.y+11,4,4);
 ctx.fillStyle='#4b9ba5';ctx.fillRect(o.x+o.w-14,o.y+o.h-13,8,6);ctx.restore();
}
/* 0.43 corrective (P9): Feed Mill reads as a grain crusher — hopper, crusher drum, spout and a feed sack. */
function drawFeedMill(f){
 ctx.save();ctx.fillStyle='#0a141555';ctx.fillRect(f.x+3,f.y+4,f.w,f.h);
 ctx.fillStyle='#4f635c';ctx.beginPath();ctx.roundRect(f.x,f.y,f.w,f.h,5);ctx.fill();ctx.strokeStyle='#8fa194';ctx.lineWidth=2;ctx.stroke();
 const hx=f.x+6,hy=f.y+6,hw=Math.min(34,f.w*.55),hh=Math.min(30,f.h*.4);
 ctx.fillStyle='#7c8a7d';ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+hw,hy);ctx.lineTo(hx+hw*.72,hy+hh);ctx.lineTo(hx+hw*.28,hy+hh);ctx.closePath();ctx.fill();ctx.strokeStyle='#b7c3b1';ctx.lineWidth=1.2;ctx.stroke();
 ctx.fillStyle='#c9a85e';ctx.beginPath();ctx.ellipse(hx+hw/2,hy+hh*.35,hw*.36,hh*.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e0c983';for(let k=0;k<7;k++){ctx.fillRect(hx+hw*.25+(k*5.3)%(hw*.5),hy+hh*.25+(k*3.7)%(hh*.2),1.6,1.2);}
 const dx=hx+hw/2,dy=hy+hh+9;ctx.fillStyle='#3a4a48';ctx.beginPath();ctx.arc(dx,dy,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a9b7ae';ctx.lineWidth=1.5;ctx.stroke();
 ctx.strokeStyle='#c8d2c4';ctx.lineWidth=1.2;for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;ctx.beginPath();ctx.moveTo(dx,dy);ctx.lineTo(dx+Math.cos(a)*7,dy+Math.sin(a)*7);ctx.stroke();}
 ctx.fillStyle='#7d8b85';ctx.fillRect(dx+8,dy-3,Math.max(8,f.w-(dx-f.x)-22),6);
 const sx=f.x+f.w-15,sy=Math.min(f.y+f.h-14,dy+2);ctx.fillStyle='#b99c68';ctx.beginPath();ctx.roundRect(sx-8,sy-10,16,20,4);ctx.fill();ctx.strokeStyle='#6f5b37';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#8d7447';ctx.fillRect(sx-5,sy-12,10,3);
 ctx.restore();
}
function drawBunker(){
 const floor=BunkerLayout.floorAt(player.x,player.y),bounds=BunkerLayout.floorBounds[floor];ctx.fillStyle='#101417';ctx.fillRect(bounds.x-150,bounds.y-150,bounds.w+300,bounds.h+300);
 for(const r of BunkerLayout.roomData)if(r.floor===floor){V011Rooms.floor(r.id,bunker[r.id]);window.GameLivestock?.drawFloor?.(r.id);ctx.fillStyle='#bdccc7';ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(GamePlacement.roomName(r.id),r.x+r.w/2,r.y+(r.id==='corridor'?150:r.id==='storage'?150:r.id==='pantry'?150:r.id==='water_room'?200:r.id==='chicken_farm'?300:r.id==='cow_farm'?300:48));}/* 0.43 Phase 0: Pantry and Water Room names sit below their top-wall furniture */
 V09Craft.drawWorkshop();window.GameMovable?.draw();
 // 0.43 Phase 0: the L1 hall keeps no props (its cabinet is now the Medical room's medicine cabinet).
 // The bed lies along the bedroom's bottom wall, pillow toward the bath; kitchen/medical furniture below.
 const props=floor===1?[]:[['bed','bed'],['shower','shower'],['toilet','toilet'],['living_sink','sink'],['cabinet','wardrobe']];
 for(const [id,art]of props){const f=BunkerLayout.fixture(id);V011Rooms.shadow(f.x,f.y,f.w,f.h,12,f.room);ctx.save();if(id==='bed'&&f.w>f.h){ctx.translate(f.x,f.y+f.h);ctx.rotate(-Math.PI/2);V011Art.draw(art,0,0,f.h,f.w);}else if(!V011Art.draw(art,f.x,f.y,f.w,f.h)){ctx.fillStyle='#718780';ctx.fillRect(f.x,f.y,f.w,f.h);}ctx.restore();}
 if(floor===2)drawL2Furniture();
 if(floor===2){V011Farm.drawBeds();const f=GameEquipment.fixture('feed_craft');if(GameEquipment.present('feed_craft')){drawFeedMill(f);ctx.fillStyle='#d5e0d0';ctx.font='10px Arial';ctx.fillText(I18n.text('Кормодробилка'),f.x+28,f.y+65);}
  for(const [i,o]of BunkerPassA.fixtures.entries()){if(!i){ctx.fillStyle='#516863';ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle='#a0b4a5';ctx.lineWidth=3;ctx.strokeRect(o.x+4,o.y+4,o.w-8,o.h-8);V011Art.draw('tank',o.x,o.y,o.w,o.h);ctx.fillStyle='#69bdc0';ctx.fillRect(o.x+o.w-12,o.y+12,5,(o.h-24)*BunkerPassA.water.clean/100);}else if(i===1)drawBoreholePump(o);else drawFiltrationUnit(o);ctx.fillStyle='#d5e0d0';ctx.font='10px Arial';{const text=I18n.t(['farm.cleanTank','farm.pump','farm.purifier'][i]),q=BunkerLayout.rooms.water_room,half=ctx.measureText(text).width/2+30;/* 0.43 Phase 0: keep the caption inside the narrow Water Room */ctx.fillText(text,Math.max(q.left+half,Math.min(q.right-half,o.x+o.w/2)),i?o.y-7:o.y+o.h+15);}}
  const bd=V011Living.bathDoor;ctx.fillStyle='#667b78';ctx.fillRect(bd.x,bd.y,bd.w,bd.h*(1-V011Living.state().doorProgress));
  window.GameLivestock?.draw();/* 0.43 Pass B: stalls, nest, feeders/drinkers, Pantry #10–#12 and the animals */
  const up=BunkerPassA.up;ctx.fillStyle='#263a3e';ctx.fillRect(up.x,up.y,up.w,up.h);for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#6f837c':'#53665f';ctx.fillRect(up.x+12,up.y+12+i*17,106,12);}ctx.fillStyle='#d8e6d9';ctx.fillText(I18n.t('bunker.l2.up'),4700,-185);
 }
 for(const w of BunkerLayout.wallSegments)if(BunkerLayout.floorAt(w.x1,w.y1)===floor)V011Rooms.wall(w.x1,w.y1,w.x2,w.y2);if(floor===1)BunkerState.draw();
}

/* =====================================================
   DRAW PLAYER
===================================================== */

function drawPlayer(){
  const angle=Math.atan2(player.aimY,player.aimX),item=heldItem();
  const bob=player.moving?Math.sin(player.walkAnimation)*3:0;
  const recoil=canFire()&&performance.now()-muzzleFlash.time<95?(typeof V09Craft!=='undefined'?(V09Craft.weapons[item]?.visualRecoil??-2.4):-2.4):0;
  if(!window.ActorVisuals?.drawPlayer(angle,item,recoil)){
  ctx.save();ctx.translate(player.x,player.y);ctx.rotate(angle);ctx.scale(AssetManifest.actors.visualScale||1,AssetManifest.actors.visualScale||1);
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
  ctx.fillStyle='#cca784';ctx.beginPath();ctx.arc(1,0,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#483c30';ctx.beginPath();ctx.arc(-1,0,7,Math.PI*.5,Math.PI*1.5);ctx.fill();
  ctx.restore();
  }
  // 0.43 corrective: the early aim reach circle was removed with the spread-cone lines.
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
  window.ActorVisuals?.drawMuzzle();window.CombatVfx?.draw();
}
