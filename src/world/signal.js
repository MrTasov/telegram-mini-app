/* One I2 calendar ledger. V017Monsters remains the only spawn/combat owner. */
window.GameSignal=(()=>{
 const defs=SignalDefinitions,copy=x=>JSON.parse(JSON.stringify(x));let epoch=0,memberIds=new Set();
 const fresh=()=>({schema:2,resolvedDay:0,noticeDay:0,warningDay:0,imminentDay:0,observed:false,wave:null,history:[]});let state=fresh();
 const absolute=()=>WorldClock.day*1440+WorldClock.minute;
 const phaseIndex=()=>Math.min(5,Math.floor(WorldClock.minute/60));
 const profile=day=>defs.profiles[(Math.floor(day/defs.intervalDays)-1)%defs.profiles.length];
 const active=()=>!GameSave.restoring&&!!state.wave&&WorldEvents.matches('day_x',WorldClock.day,WorldClock.minute)&&state.wave.day===WorldClock.day;
 const alive=()=>zombies.reduce((n,z)=>n+(z.alive&&memberIds.has(z.instanceId)?1:0),0);
 const cap=()=>active()?state.wave.cap:defs.ordinaryCap;
 function health(){return V015Base.sections.reduce((n,w)=>n+w.hp,0)+GameDefense.records().reduce((n,r)=>n+r.state.condition.hp,0);}
 function rows(){return defs.phases.map(p=>({target:p.target,budget:p.budget,spawned:0,maxAlive:0,endAlive:0,cap:0,closed:false}));}
 function view(detail=true){const day=WorldClock.day,minute=WorldClock.minute,attack=WorldEvents.matches('day_x',day,minute),nextDay=attack?day:(Math.floor(day/10)+1)*10,left=Math.max(0,nextDay*1440-absolute());
  const phase=attack?'attack':left<=defs.imminentMinutes?'imminent':left<=defs.warningMinutes?'warning':'quiet';
  return {phase,threat:attack?100:Math.round(Math.max(0,Math.min(85,(1-left/defs.noticeMinutes)*85))),nextDay,left,profile:attack?defs.profiles[defs.phases[phaseIndex()].profile]:profile(nextDay),wave:detail&&state.wave?copy(state.wave):null,last:detail&&state.history.length?copy(state.history.at(-1)):null,observed:state.observed};
 }
 function changed(){epoch++;queueGameSave();window.GameStory?.refresh();}
 function notice(key,day){window.GameSignalUI?.notice(key,day);}
 function begin(day){if(state.resolvedDay>=day||state.wave?.day===day)return;
  const ordinary=zombies.filter(z=>z.alive).length;
  state.wave={day,profile:profile(day).id,limit:defs.phases.reduce((n,p)=>n+p.budget,0),admitted:[],killed:[],startHP:health(),legacy:false,cap:Math.min(defs.actorSaveLimit,Math.max(defs.ordinaryCap,ordinary+defs.maxParticipants+defs.populationReserve)),phase:phaseIndex(),phases:rows(),nextAt:absolute(),refilling:true};
  memberIds.clear();state.observed=true;changed();notice('start',day);window.GameAudio?.dayXStart();
 }
 function sample(){if(!active())return;const w=state.wave,n=alive(),i=phaseIndex();
  if(i!==w.phase){w.phases[w.phase].endAlive=n;w.phases[w.phase].closed=true;w.phase=i;w.refilling=true;changed();}
  const r=w.phases[i];r.cap=w.cap;if(n>r.maxAlive){r.maxAlive=n;queueGameSave();}r.endAlive=n;
 }
 function finish(){const w=state.wave;if(!w)return;const n=alive();w.phases[w.phase].endAlive=n;w.phases[w.phase].closed=true;
  const lostHP=Math.max(0,Math.round(w.startHP-health()));state.history.push({day:w.day,profile:w.profile,kills:w.killed.length,admitted:w.admitted.length,remaining:n,lostHP,outcome:lostHP?'damaged':'held',phases:copy(w.phases)});
  state.resolvedDay=Math.max(state.resolvedDay,w.day);state.history=state.history.slice(-defs.historyLimit);state.wave=null;memberIds.clear();changed();
 }
 function observe(){if(GameSave.restoring||!GameState.session.ready)return;
  if(state.wave&&(WorldClock.day>state.wave.day||WorldClock.day===state.wave.day&&WorldClock.minute>=defs.endMinute))finish();
  const v=view(false);if(v.phase==='attack')begin(WorldClock.day);sample();
  // Persistent receipts: loading within a warning window cannot replay it.
  for(const [field,threshold,key]of [['warningDay',defs.warningMinutes,'warning'],['imminentDay',defs.imminentMinutes,'imminent']])if(v.phase!=='attack'&&v.left<=threshold&&state[field]<v.nextDay){state[field]=v.nextDay;state.noticeDay=v.nextDay;state.observed=true;changed();notice(key,v.nextDay);}
 }
 function spawnPlan(){if(!active())return null;sample();const w=state.wave,p=defs.phases[w.phase],r=w.phases[w.phase],n=alive(),all=zombies.reduce((a,z)=>a+!!z.alive,0);
  if(n<=Math.floor(p.target*defs.refillThreshold))w.refilling=true;if(n>=p.target)w.refilling=false;
  const profile=defs.profiles[p.profile],i=r.spawned;
  return {allowed:w.refilling&&n<p.target&&all<w.cap&&r.spawned<r.budget&&absolute()+1e-8>=w.nextAt,type:profile.types[i%profile.types.length],side:profile.sides[Math.floor(i/defs.groupSize)%profile.sides.length],far:true};
 }
 function batchComplete(added){if(active()&&added){state.wave.nextAt=absolute()+defs.reinforcementIntervalMs/WorldClock.dayMs*1440/defs.clockSlowdown;sample();changed();}}
 function admitted(z){if(active()&&!memberIds.has(z.instanceId)){memberIds.add(z.instanceId);state.wave.admitted.push(z.instanceId);state.wave.phases[state.wave.phase].spawned++;changed();}}
 function killed(z){if(active()&&memberIds.has(z.instanceId)&&!state.wave.killed.includes(z.instanceId)){state.wave.killed.push(z.instanceId);changed();}}
 function validate(data){const s=data.signal041,int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max,ids=a=>Array.isArray(a)&&a.length<=defs.receiptLimit&&new Set(a).size===a.length&&a.every(id=>/^enemy:\d+$/.test(id)),profileOK=id=>defs.profiles.some(p=>p.id===id);
  const phaseRows=a=>Array.isArray(a)&&a.length===6&&a.every((r,i)=>r&&r.target===defs.phases[i].target&&int(r.budget,defs.receiptLimit)&&int(r.spawned,r.budget)&&int(r.maxAlive,defs.actorSaveLimit)&&int(r.endAlive,defs.actorSaveLimit)&&int(r.cap,defs.actorSaveLimit)&&typeof r.closed==='boolean');
  if(!s||s.schema!==2||!['resolvedDay','noticeDay','warningDay','imminentDay'].every(k=>int(s[k])&&s[k]%10===0)||typeof s.observed!=='boolean'||!Array.isArray(s.history)||s.history.length>defs.historyLimit)throw Error('Invalid Signal state');
  const w=s.wave;if(w&&(!int(w.day)||w.day<=s.resolvedDay||w.day%10||!profileOK(w.profile)||!ids(w.admitted)||!ids(w.killed)||w.killed.some(id=>!w.admitted.includes(id))||!int(w.limit,defs.receiptLimit)||w.admitted.length>w.limit||!Number.isFinite(w.startHP)||w.startHP<0||typeof w.legacy!=='boolean'||!int(w.cap,defs.actorSaveLimit)||w.cap<defs.ordinaryCap||!int(w.phase,5)||!phaseRows(w.phases)||!Number.isFinite(w.nextAt)||w.nextAt<w.day*1440||w.nextAt>w.day*1440+defs.endMinute+10||typeof w.refilling!=='boolean'||w.phases.reduce((n,r)=>n+r.spawned,0)>w.admitted.length))throw Error('Invalid Signal attack');
  let prior=0;for(const r of s.history){if(!int(r.day)||r.day%10||r.day<=prior||r.day>s.resolvedDay||!profileOK(r.profile)||!int(r.kills,defs.receiptLimit)||!int(r.admitted,defs.receiptLimit)||!int(r.remaining,defs.actorSaveLimit)||r.kills+r.remaining>r.admitted||!int(r.lostHP)||!['held','damaged'].includes(r.outcome)||r.phases!==null&&!phaseRows(r.phases))throw Error('Invalid Signal result');prior=r.day;}return true;
 }
 function migrate(d){d.signal041={...fresh(),schema:1};const c=d.lighting016||{day:1,minute:480};d.signal041.resolvedDay=Math.floor((c.day-(c.day%10===0&&c.minute<360?1:0))/10)*10;}
 function completeMigration(d){const c=d.lighting016;if(c&&WorldEvents.matches('day_x',c.day,c.minute)){const ids=d.identity027.enemies.filter((_,i)=>d.zombies[i].alive);d.signal041.wave={day:c.day,profile:profile(c.day).id,limit:ids.length,admitted:ids,killed:[],startHP:d.base015.sections.reduce((n,w)=>n+w.hp,0)+d.equipment032.instances.filter(r=>DefenseDefinitions.types[r.typeId]).reduce((n,r)=>n+r.state.condition.hp,0),legacy:true};d.signal041.observed=true;}}
 function migrateCorrective(d){const s=d.signal041;if(s.schema===2)return;s.schema=2;for(const h of s.history)h.phases=null;
  if(s.wave){const w=s.wave,i=Math.min(5,Math.floor(d.lighting016.minute/60));Object.assign(w,{cap:Math.min(defs.actorSaveLimit,Math.max(defs.ordinaryCap,d.zombies.filter(z=>z.alive).length+defs.maxParticipants+defs.populationReserve)),phase:i,phases:rows(),nextAt:d.lighting016.day*1440+d.lighting016.minute,refilling:false,legacy:true});
   // An old raid has no per-phase receipts: spend all previous/current budgets.
   // Future phases are available; migration never reissues an unknown spent budget.
   for(let n=0;n<=i;n++){w.phases[n].budget=0;w.phases[n].closed=n<i;}w.limit=w.admitted.length+w.phases.reduce((n,r)=>n+r.budget,0);
  }
 }
 GameSave.extend('capture','world.signal',function(previous){const d=previous();d.signal041=copy(state);return d;});
 GameSave.extend('restore','world.signal',function(previous,d){validate(d);const out=previous(d);state=copy(d.signal041);memberIds=new Set(state.wave?.admitted||[]);epoch++;window.GameSignalUI?.reset();return out;});
 GameState.register('signal',{capture:()=>copy(state)},{source:'world/signal.js',saved:['signal041'],transient:['UI epoch','member ID lookup']});
 WorldClock.onChange(observe);
 return Object.freeze({fresh,view,observe,spawnPlan,admitted,killed,validate,migrate,completeMigration,migrateCorrective,active,alive,cap,sample,batchComplete,capture:()=>copy(state),get epoch(){return epoch;}});
})();
