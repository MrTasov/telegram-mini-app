/* Presentation-only observer. It reads existing states at 10 Hz; no new RAF/timer. */
window.GameAudioWorld=(()=>{
  let next=0,lastPlace=null,lastPower=null,lastDrone=null,lastChicken=-Infinity;
  const doors=new WeakMap();
  function reset(){next=0;lastPlace=null;lastPower=null;lastDrone=null;lastChicken=-Infinity;}
  function door(object,opening,which='bunker',broken=false){
    if(broken){doors.delete(object);return;}
    const prev=doors.has(object)?doors.get(object):object.open>.5;doors.set(object,opening);
    if(prev!==undefined&&prev!==opening)GameAudio.play(opening?'doorOpen':'doorClose',{x:object.x+(object.w||0)/2,y:object.y+(object.h||0)/2,scene:which,radius:340,cooldownKey:object.id});
  }
  function tick(force=false){
    if(!GameAudio.sync())return;
    const now=performance.now();if(!force&&now<next)return;next=now+100;
    if(window.MainMenu?.active){GameAudio.loop('ambience','menu');for(const key of ['rotor','generator','machine','water','shower'])GameAudio.loop(key,null);lastPlace='menu';return;}
    if(playerDead){GameAudio.reset();return;}
    const place=scene==='bunker'?'bunker':window.V013City?.floor?'interior':'surface';
    const ambience=place==='bunker'||place==='interior'?'bunker':WorldEvents.isActive('day_x')?'dayX':WorldClock.minute>=360&&WorldClock.minute<1200?'day':'night';
    if(lastPlace!==null&&lastPlace!==place){GameAudio.reset();}lastPlace=place;
    GameAudio.loop('ambience',ambience);
    const gen=BunkerLayout.fixture('generator'),shower=V011Living.shower;
    const power=!!(V09Power.running&&V09Power.fuel>0);
    if(lastPower!==null&&lastPower!==power)GameAudio.play(power?'powerStart':'powerStop',{x:gen.x+gen.w/2,y:gen.y+gen.h/2,scene:'bunker',radius:480});lastPower=power;
    GameAudio.loop('generator',power?'generator':null,{x:gen.x+gen.w/2,y:gen.y+gen.h/2,scene:'bunker',radius:430});
    let machine=null,closest=Infinity;
    if(scene==='bunker'&&!GameFlow.paused)for(const id of ['furnace','craft_bench','feed_craft']){
      const q=V09Craft.craftQueue,j=q.getJob(id);if(!j||j.remainingMs<=0||q.paused[id]||!devicePowered(id))continue;
      const p=id==='feed_craft'?feedCraftStationPos():V09Craft.fixtures.find(o=>o.id===id);if(!p)continue;
      const x=p.x+(p.w||0)/2,y=p.y+(p.h||0)/2,d=(x-player.x)**2+(y-player.y)**2;
      if(d<closest){closest=d;machine={x,y,scene:'bunker',radius:260};}
    }
    GameAudio.loop('machine',machine?'machine':null,machine||{});
    // Read the irrigation state directly: do not invoke mutating farm getters.
    const farm=V011Farm.state;let farmPoint=null,farmDistance=Infinity;
    if(AgricultureTime.available&&!GameFlow.paused&&scene==='bunker'&&farm.water>=V011Farm.config.waterPerCycle&&devicePowered('irrigation014')){
      const beds=getFarmBeds();for(let i=0;i<farmState.length;i++)if(farmState[i].crop!==null&&farmState[i].irrigation028?.phase==='spray'){
        const b=beds[i],x=b.x+b.w/2,y=b.y+b.h/2,d=(x-player.x)**2+(y-player.y)**2;
        if(d<farmDistance){farmDistance=d;farmPoint={x,y,scene:'bunker',radius:360};}
      }
    }
    GameAudio.loop('water',farmPoint?'water':null,farmPoint||{});
    const living=V011Living.state();GameAudio.loop('shower',living.mode==='shower'?'shower':null,{x:shower.x+shower.w/2,y:shower.y+shower.h/2,scene:'bunker',radius:240});
    if(AgricultureTime.available&&scene==='bunker'&&livestockAlive&&now-lastChicken>=17000){const p=livestockAudioCenter('chicken');if(GameAudio.play('chicken',{...p,scene:'bunker',radius:285}))lastChicken=now;}
    const d=V014Robots.state,flight=!d.packed&&d.hp>0&&d.battery>0&&!['docked','docking','disabled'].includes(d.task);
    GameAudio.loop('rotor',flight?'rotor':null,{x:d.x,y:d.y,scene:d.scene,radius:360});
    if(lastDrone){
      if(lastDrone.hp>d.hp)GameAudio.play('droneHit',{x:d.x,y:d.y,scene:d.scene});
      if(lastDrone.task!==d.task){const cue=d.task==='disabled'?'droneDisabled':d.task==='docked'?'droneLand':d.task==='return'&&d.lowWarn?'droneLow':null;if(cue)GameAudio.play(cue,{x:d.x,y:d.y,scene:d.scene});}
      const charging=!d.packed&&d.task==='docked'&&d.battery>lastDrone.battery;
      if(charging&&!lastDrone.charging)GameAudio.play('droneCharge',{x:d.x,y:d.y,scene:d.scene});
      lastDrone.charging=charging;
    }
    lastDrone={hp:d.hp,task:d.task,battery:d.battery,charging:lastDrone?.charging||false};
  }
  WorldEvents.onChange(()=>{if(!GameSave.restoring)tick(true);});
  // Generic UI feedback is limited to real button activation. Specific event
  // handlers emit their own cue before this bubbling listener, suppressing it.
  document.addEventListener('click',event=>{
    if(event.isTrusted===false)return;const button=event.target?.closest?.('button');
    if(!button||button.disabled||button.getAttribute?.('aria-disabled')==='true')return;
    GameAudio.play('uiClick');
  });
  const open= openOverlay,close=closeOverlay;
  openOverlay=function(node,...args){const was=node?.classList.contains('open');const out=open(node,...args);if(!was&&node?.classList.contains('open')&&['lootOverlay','storageOverlay'].includes(node.id))GameAudio.play('lootOpen');return out;};
  closeOverlay=function(node,...args){const was=node?.classList.contains('open');const out=close(node,...args);if(was&&!node?.classList.contains('open')&&['lootOverlay','storageOverlay'].includes(node.id))GameAudio.play('lootClose');return out;};
  const select=selectHandSlot;
  selectHandSlot=function(index,...args){const before=activeHandSlot,out=select(index,...args);if(before!==activeHandSlot)GameAudio.play('quickslot');return out;};
  const notice=message;
  message=function(text,...args){const out=notice(text,...args);if(/не хватает|недостаточно|нет места|освободите место|нужн[аыо]|not enough|no space|inventory full/i.test(String(text)))GameAudio.play('uiError');return out;};
  const volume=el('soundVolume');volume?.addEventListener('input',()=>GameAudio.sync());
  return {tick,reset,door};
})();
