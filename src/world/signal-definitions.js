/* All Day X balance lives here. WorldClock alone changes speed; combat stays real-time. */
const SignalDefinitions=Object.freeze({schema:2,maxThreat:100,noticeMinutes:1440,warningMinutes:1440,imminentMinutes:360,historyLimit:8,
 intervalDays:10,endMinute:360,clockSlowdown:3,zombieSpeed:1.6,siegeBase:1.2,siegeStep:.1,siegeCap:2,
 pathProgressMs:600,pathProgressPx:10,pathTTL:3000,pathDistance:600,pathCell:36,pathStartsPerFrame:2,pathSlicesPerFrame:8,pathSpawnExit:300,pathPadding:360,pathGoalAngles:[0,.35,-.35,.7,-.7],
 ordinaryCap:144,populationReserve:16,maxParticipants:120,actorSaveLimit:512,receiptLimit:1024,
 ordinaryPopulationIntervalMs:1800,passageRefreshMs:500,reinforcementIntervalMs:2500,groupSize:6,refillThreshold:.8,ringMin:2300,ringMax:2900,playerSpawnDistance:900,
 retirementIntervalMs:4000,retirementBatch:2,retirementDistance:1900,
 noticeMs:5000,vignetteOpacity:.4,vignettePulseSeconds:8,sceneDim:.10,humGain:.065,humHz:55,humLowpass:500,humLfoHz:.6,hordeIntervalMs:9000,hordeHeavyIntervalMs:4000,hordeLowpass:1350,hordeGain:.16,
 phases:Object.freeze([100,30,100,20,50,120].map((target,i)=>Object.freeze({target,budget:Math.ceil(target*1.8),profile:[0,1,2,1,0,2][i]}))),
 profiles:Object.freeze([
  Object.freeze({id:'pressure',title:'signal.profile.pressure',sides:['N','E','S','W'],types:['normal','normal','fast','heavy','normal','leaper','bloater']}),
  Object.freeze({id:'flanking',title:'signal.profile.flanking',sides:['S','W','N','E'],types:['fast','normal','leaper','normal','heavy','fast','bloater']}),
  Object.freeze({id:'siege',title:'signal.profile.siege',sides:['W','E','N','S'],types:['normal','heavy','heavy','bloater','normal','fast','leaper']})
 ])});
