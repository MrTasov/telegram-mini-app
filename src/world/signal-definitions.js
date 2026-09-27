/* I2 changes composition and warning, never stacks combat multipliers. */
const SignalDefinitions=Object.freeze({schema:1,maxThreat:100,noticeMinutes:2880,warningMinutes:1440,imminentMinutes:360,historyLimit:8,
 profiles:Object.freeze([
  Object.freeze({id:'pressure',title:'signal.profile.pressure',sides:['N','E'],types:['normal','normal','fast','heavy','normal','leaper','bloater']}),
  Object.freeze({id:'flanking',title:'signal.profile.flanking',sides:['S','W'],types:['fast','normal','leaper','normal','heavy','fast','bloater']}),
  Object.freeze({id:'siege',title:'signal.profile.siege',sides:['W','E','N'],types:['normal','heavy','normal','bloater','normal','fast','leaper']})
 ])});
