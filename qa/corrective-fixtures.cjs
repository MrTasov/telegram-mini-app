// Create the historical world with the immutable delivered runtime, then use
// the current decoder. Current New Game is tested in stage-d-corrective.cjs.
const {setup}=require('./runtime.cjs');let legacy;
exports.legacyC2=r=>{if(!legacy){const old=setup('qa/stage-d-corrective-base/index.html');legacy=old.eval('JSON.stringify(GameNewGame.create())');}r.context.legacyC2Raw=legacy;return r.eval('restoreGameProgress(decodeGameProgress(legacyC2Raw))');};
exports.utility=r=>{r.eval("scene='bunker';player.x=1210;player.y=675;for(const t of ['wood','iron'])addItem(t,6);window.utilityResult=GamePlacement.request('utility_workbench','craft');");if(!r.eval('utilityResult.ok'))throw Error('Fixture craft failed');const id=r.eval('utilityResult.instanceId');r.context.utilityId=id;if(!r.eval("GamePlacement.request(utilityId,'place',GamePlacement.centered('utility_workbench','reserve_l1',1870,450)).ok"))throw Error('Fixture place failed');return id;};
