/* One calendar observer and bounded attack ledger. Population/combat remain
   in V017Monsters; I1 owns ticking in every player zone. No reward issuer. */
window.GameSignal=(()=>{
 const defs=SignalDefinitions,copy=x=>JSON.parse(JSON.stringify(x));let epoch=0;
 const fresh=()=>({schema:1,resolvedDay:0,noticeDay:0,warningDay:0,imminentDay:0,observed:false,wave:null,history:[]});let state=fresh();
 const profile=day=>defs.profiles[(Math.floor(day/WorldEvents.dayX.intervalDays)-1)%defs.profiles.length];
 function health(){return V015Base.sections.reduce((n,w)=>n+w.hp,0)+GameDefense.records().reduce((n,r)=>n+r.state.condition.hp,0);}
 const absolute=()=>WorldClock.day*1440+WorldClock.minute;
 function view(detail=true){const day=WorldClock.day,minute=WorldClock.minute,active=WorldEvents.matches('day_x',day,minute),nextDay=active?day:(Math.floor(day/10)+1)*10,left=Math.max(0,nextDay*1440-absolute());
  const phase=active?'attack':left<=defs.imminentMinutes?'imminent':left<=defs.warningMinutes?'warning':left<=defs.noticeMinutes?'detected':'quiet';
  const threat=active?100:Math.round(Math.max(0,Math.min(85,(1-left/defs.noticeMinutes)*85)));
  return {phase,threat,nextDay,left,profile:profile(nextDay),wave:detail&&state.wave?copy(state.wave):null,last:detail&&state.history.length?copy(state.history.at(-1)):null,observed:state.observed};
 }
 function changed(){epoch++;queueGameSave();window.GameStory?.refresh();}
 function begin(day,legacy=false){if(state.resolvedDay>=day||state.wave?.day===day)return;
  const admitted=zombies.filter(z=>z.alive).map(z=>z.instanceId),limit=Math.max(admitted.length,V017Monsters.targetCount());
  state.wave={day,profile:profile(day).id,limit:Math.min(144,limit),admitted,killed:[],startHP:health(),legacy};state.observed=true;changed();
 }
 function finish(){const w=state.wave;if(!w)return;const lostHP=Math.max(0,Math.round(w.startHP-health())),alive=w.admitted.filter(id=>zombies.some(z=>z.instanceId===id&&z.alive)).length;
  const result={day:w.day,profile:w.profile,kills:w.killed.length,admitted:w.admitted.length,remaining:alive,lostHP,outcome:lostHP?'damaged':'held'};
  state.resolvedDay=Math.max(state.resolvedDay,w.day);state.history.push(result);state.history=state.history.slice(-defs.historyLimit);state.wave=null;changed();
  message(I18n.t('signal.result.'+result.outcome));
 }
 function observe(){if(GameSave.restoring||!GameState.session.ready)return;const v=view(false);
  if(state.wave&&(WorldClock.day>state.wave.day||WorldClock.day===state.wave.day&&WorldClock.minute>=WorldEvents.dayX.endMinute))finish();
  if(v.phase==='attack')begin(WorldClock.day);
  for(const [field,threshold,key]of [['noticeDay',defs.noticeMinutes,'detected'],['warningDay',defs.warningMinutes,'warning'],['imminentDay',defs.imminentMinutes,'imminent']]){
   if(v.phase!=='attack'&&v.left<=threshold&&state[field]<v.nextDay){state[field]=v.nextDay;state.observed=true;changed();message(I18n.t('signal.notice.'+key,{day:v.nextDay}));}
  }
 }
 const active=()=>!GameSave.restoring&&!!state.wave&&WorldEvents.matches('day_x',WorldClock.day,WorldClock.minute)&&state.wave.day===WorldClock.day;
 function spawnPlan(index){if(!active())return null;const w=state.wave,p=profile(w.day),i=w.admitted.length;return {allowed:i<w.limit,type:p.types[i%p.types.length],side:p.sides[Math.floor(i/3)%p.sides.length]};}
 function admitted(z){if(active()&&!state.wave.admitted.includes(z.instanceId)){state.wave.admitted.push(z.instanceId);changed();}}
 function killed(z){if(active()&&state.wave.admitted.includes(z.instanceId)&&!state.wave.killed.includes(z.instanceId)){state.wave.killed.push(z.instanceId);changed();}}
 function validate(data){const s=data.signal041,integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max,ids=a=>Array.isArray(a)&&a.length<=144&&new Set(a).size===a.length&&a.every(id=>/^enemy:\d+$/.test(id)),validProfile=id=>defs.profiles.some(p=>p.id===id);
  if(!s||Object.keys(s).sort().join()!=='history,imminentDay,noticeDay,observed,resolvedDay,schema,warningDay,wave'||s.schema!==1||!['resolvedDay','noticeDay','warningDay','imminentDay'].every(k=>integer(s[k])&&s[k]%10===0)||typeof s.observed!=='boolean'||!Array.isArray(s.history)||s.history.length>defs.historyLimit)throw Error('Invalid Signal state');
  const w=s.wave;if(w&&(Object.keys(w).sort().join()!=='admitted,day,killed,legacy,limit,profile,startHP'||!integer(w.day)||w.day<=s.resolvedDay||w.day%10||!validProfile(w.profile)||!integer(w.limit,144)||!ids(w.admitted)||w.admitted.length>w.limit||!ids(w.killed)||w.killed.some(id=>!w.admitted.includes(id))||!Number.isFinite(w.startHP)||w.startHP<0||typeof w.legacy!=='boolean'))throw Error('Invalid Signal attack');
  let prior=0;for(const r of s.history){if(Object.keys(r).sort().join()!=='admitted,day,kills,lostHP,outcome,profile,remaining'||!integer(r.day)||r.day%10||r.day<=prior||r.day>s.resolvedDay||!validProfile(r.profile)||!integer(r.kills,144)||!integer(r.admitted,144)||!integer(r.remaining,144)||r.kills+r.remaining>r.admitted||!integer(r.lostHP)||!['held','damaged'].includes(r.outcome))throw Error('Invalid Signal result');prior=r.day;}return true;
 }
 function migrate(d){d.signal041=fresh();const c=d.lighting016||{day:1,minute:480};d.signal041.resolvedDay=Math.floor((c.day-(c.day%10===0&&c.minute<360?1:0))/10)*10;}
 function completeMigration(d){const c=d.lighting016;if(c&&WorldEvents.matches('day_x',c.day,c.minute)){const ids=d.identity027.enemies.filter((_,i)=>d.zombies[i].alive);d.signal041.wave={day:c.day,profile:profile(c.day).id,limit:ids.length,admitted:ids,killed:[],startHP:d.base015.sections.reduce((n,w)=>n+w.hp,0)+d.equipment032.instances.filter(r=>DefenseDefinitions.types[r.typeId]).reduce((n,r)=>n+r.state.condition.hp,0),legacy:true};d.signal041.observed=true;}}
 GameSave.extend('capture','world.signal',function(previous){const d=previous();d.signal041=copy(state);return d;});
 GameSave.extend('restore','world.signal',function(previous,d){validate(d);const out=previous(d);state=copy(d.signal041);epoch++;return out;});
 GameState.register('signal',{capture:()=>copy(state)},{source:'world/signal.js',saved:['signal041'],transient:['UI epoch']});
 WorldClock.onChange(observe);
 return Object.freeze({fresh,view,observe,spawnPlan,admitted,killed,validate,migrate,completeMigration,capture:()=>copy(state),get epoch(){return epoch;}});
})();
