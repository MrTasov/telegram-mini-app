/* Local companion movement adapter. Paths yield between small work batches. */
window.V0141DroneMotion={create(state){
  const R=10;
  let path=null,search=null,goal=null,retry=0,searchAge=0,speed=0,heading=0,planning=false,planningDoors=null,navKey='',blockedTime=0;
  let followGoal=null,chooseIn=0,delay=0,chasing=false,lastPlayer={x:player.x,y:player.y,scene},dir={x:0,y:1},playerSpeed=0;
  const metrics={searches:0,failed:0,maxSliceMs:0};
  function clear(){path=search=goal=null;retry=0;searchAge=0;blockedTime=0;}
  function reset(){clear();speed=0;followGoal=null;chooseIn=delay=0;chasing=false;lastPlayer={x:player.x,y:player.y,scene};}
  function plan(fn){const before=V09Power.pathfinding;planningDoors=V09Power.allocation().served;planning=true;V09Power.pathfinding=true;try{return fn();}finally{V09Power.pathfinding=before;planning=false;planningDoors=null;}}
  // Thousands of path probes share one power snapshot per search slice. Actual
  // movement still uses the current physical door panels, never this snapshot.
  function doorPowered(room){return !!planningDoors?.has('door_'+room);}
  function key(){return planning?navKey:'';}
  function brake(dt){speed=Math.max(0,speed-900*dt);}
  function pathBounds(to){
    if(state.scene==='bunker')return {x:-150,y:-940,w:1510,h:2200};
    const b={x:surface.minX??0,y:surface.minY??0,w:surface.width,h:surface.height},pad=300;
    const x=Math.max(b.x,Math.floor((Math.min(state.x,to.x)-pad)/128)*128),y=Math.max(b.y,Math.floor((Math.min(state.y,to.y)-pad)/128)*128);
    const right=Math.min(b.x+b.w,Math.ceil((Math.max(state.x,to.x)+pad)/128)*128),bottom=Math.min(b.y+b.h,Math.ceil((Math.max(state.y,to.y)+pad)/128)*128);
    return {x,y,w:right-x,h:bottom-y};
  }
  function startSearch(destination){
    let to={...destination};const dist=distance(state.x,state.y,to.x,to.y);
    // Long return trips use bounded legs, avoiding arrays for the entire map.
    if(state.scene==='surface'&&dist>1300){const a=Math.atan2(to.y-state.y,to.x-state.x);let found=null;
      for(const delta of [0,.3,-.3,.6,-.6,1,-1]){const q={x:state.x+Math.cos(a+delta)*850,y:state.y+Math.sin(a+delta)*850};if(!worldCollision(q.x,q.y,R,state.scene)){found=q;break;}}if(found)to={...to,...found};}
    const bounds=pathBounds(to);navKey='drone:'+Object.values(bounds).join(',')+':'+v09Doors.map(d=>devicePowered('door_'+d.room)?1:d.open>.95?2:0).join('');
    search=v092PathSearch(state.x,state.y,{...to,kind:'ground',id:'drone_goal',range:7,r:0,navBounds:bounds},state.scene,R);
    goal={...destination};searchAge=0;path=null;retry=.7;metrics.searches++;
  }
  function move(destination,dt){
    retry=Math.max(0,retry-dt);const d=distance(state.x,state.y,destination.x,destination.y);
    if(d<3){clear();brake(dt);return true;}
    let waypoint=null;
    // A long line is checked only while choosing a leg; every actual step is
    // still swept against current geometry, including moving door panels.
    if(d<1300&&lineClear(state.x,state.y,destination.x,destination.y,R,state.scene)){clear();waypoint=destination;}
    else{
      if(!search&&retry<=0&&(!path?.length||!goal||distance(goal.x,goal.y,destination.x,destination.y)>85))startSearch(destination);
      if(search){const started=performance.now();searchAge+=dt;
        for(let i=0;i<4;i++){const result=plan(()=>search.next());if(result.done){path=result.value;search=null;if(!path?.length){metrics.failed++;retry=2;}break;}if(performance.now()-started>1.5)break;}
        metrics.maxSliceMs=Math.max(metrics.maxSliceMs,performance.now()-started);
        if(searchAge>5){search=null;retry=2;metrics.failed++;}
      }
      while(path?.length&&distance(state.x,state.y,path[0].x,path[0].y)<3)path.shift();
      if(path?.length)waypoint=path[0];
    }
    if(!waypoint){brake(dt);return false;}
    const dx=waypoint.x-state.x,dy=waypoint.y-state.y,dist=Math.hypot(dx,dy),nextHeading=Math.atan2(dy,dx);
    const gap=state.scene===scene?distance(state.x,state.y,player.x,player.y):300;
    const top=state.task==='follow'?Math.min(490+state.modules.engine*18,Math.max(235,playerSpeed*1.13)+Math.max(0,gap-90)*1.4):290+state.modules.engine*18;
    const turn=Math.abs(Math.atan2(Math.sin(nextHeading-heading),Math.cos(nextHeading-heading))),acceleration=850;
    const lead=state.task==='follow'?Math.min(65,playerSpeed*.28):0;
    const desired=Math.min(top,Math.sqrt(2*acceleration*Math.max(1,(path?.length>1?dist+20:dist)+lead)))*(turn>1.3?.6:1);
    speed+=clamp(desired-speed,-1000*dt,acceleration*dt);
    const n=Math.min(dist,speed*dt),x=state.x+dx/(dist||1)*n,y=state.y+dy/(dist||1)*n;
    if(lineClear(state.x,state.y,x,y,R,state.scene)){state.x=x;state.y=y;heading+=Math.atan2(Math.sin(nextHeading-heading),Math.cos(nextHeading-heading))*Math.min(1,dt*10);blockedTime=0;}
    else{brake(dt);blockedTime+=dt;
      // Keep the path while a powered automatic door is opening. Never issue a
      // manual door action. Other obstructions trigger a delayed path rebuild.
      const waitingDoor=state.scene==='bunker'&&v09Doors.some(q=>devicePowered('door_'+q.room)&&rectHit(x,y,R+8,q));
      if(blockedTime>(waitingDoor?2.5:.6)){path=null;search=null;retry=Math.max(retry,.45);blockedTime=0;}}
    return distance(state.x,state.y,destination.x,destination.y)<3;
  }
  function travel(destination,dt){
    if(state.scene===destination.scene)return move(destination,dt);
    const entry=state.scene==='surface'?{x:800,y:690}:{x:bunker.entrance.x,y:bunker.entrance.y-70};
    if(move(entry,dt)){state.scene=destination.scene;const p=state.scene==='bunker'?{x:bunker.entrance.x,y:bunker.entrance.y-70}:{x:800,y:690};state.x=p.x;state.y=p.y;clear();speed=0;}
    return false;
  }
  function observe(dt){
    const dx=player.x-lastPlayer.x,dy=player.y-lastPlayer.y,d=Math.hypot(dx,dy);
    if(scene===lastPlayer.scene&&d>.2&&d<60){const a=1-Math.exp(-dt*7),l=d||1;dir.x+=(dx/l-dir.x)*a;dir.y+=(dy/l-dir.y)*a;const norm=Math.hypot(dir.x,dir.y)||1;dir.x/=norm;dir.y/=norm;playerSpeed+=(Math.min(550,d/dt)-playerSpeed)*a;}
    else playerSpeed*=Math.exp(-dt*6);
    lastPlayer={x:player.x,y:player.y,scene};
  }
  function choose(){
    const behind=Math.atan2(-dir.y,-dir.x),candidates=[];
    for(const r of [68,92,45]){for(const offset of [0,.55,-.55,1.1,-1.1,1.8,-1.8,Math.PI]){
      const q={x:player.x+Math.cos(behind+offset)*r,y:player.y+Math.sin(behind+offset)*r,scene};
      if(worldCollision(q.x,q.y,R,scene)||!lineClear(player.x,player.y,q.x,q.y,R,scene))continue;
      const continuity=followGoal?.scene===scene?distance(q.x,q.y,followGoal.x,followGoal.y)*.5:0;
      const direct=state.scene===scene&&lineClear(state.x,state.y,q.x,q.y,R,scene);
      candidates.push({q,score:Math.abs(offset)*20+Math.abs(r-68)*.3+continuity+distance(state.x,state.y,q.x,q.y)*.16+(direct?0:50)});
    }
      if(candidates.length)break;
    }
    candidates.sort((a,b)=>a.score-b.score);
    return candidates[0]?.q||(!worldCollision(player.x,player.y,R,scene)?{x:player.x,y:player.y,scene}:null);
  }
  function follow(dt){
    observe(dt);chooseIn-=dt;
    const gap=state.scene===scene?distance(state.x,state.y,player.x,player.y):Infinity;
    const obstruction=state.scene===scene&&!lineClear(state.x,state.y,player.x,player.y,R,scene);
    if(!chasing){if(gap>112||obstruction){delay+=dt;if(delay>=.22)chasing=true;}else delay=0;}
    if(!chasing){brake(dt);return;}
    if(!followGoal||followGoal.scene!==scene||chooseIn<=0&&(distance(player.x,player.y,followGoal.x,followGoal.y)>(playerSpeed>40?88:106)||worldCollision(followGoal.x,followGoal.y,R,scene))){followGoal=choose();chooseIn=playerSpeed>40?.16:.35;}
    if(!followGoal){brake(dt);return;}
    const arrived=travel(followGoal,dt);
    if(arrived&&gap<=112&&!obstruction&&playerSpeed<35){chasing=false;delay=0;clear();speed=0;}
    else if(arrived){followGoal=null;}
  }
  return {move,travel,follow,reset,clear,key,doorPowered,metrics,get heading(){return heading;},get speed(){return speed;},get pending(){return !!search;}};
}};

