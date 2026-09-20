const fs=require('fs'),path=require('path');process.chdir(path.resolve(__dirname,'..'));
const {setup}=require('./runtime.cjs');
async function main(){
 const r=setup('index.html');await r.eval('Promise.all(Object.keys(AssetManifest.images).filter(id=>!id.startsWith("historical/")).map(id=>GameAssets.load(id)))');
 const E=s=>r.eval(s);E('ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#263631";ctx.fillRect(0,0,1280,800);equipment.body=null;equipment.head=null;');
 const rows=[['unarmed',null],['rifle','rifle_ak74'],['tool','axe'],['tool','pickaxe'],['tool','hammer']];
 for(let row=0;row<rows.length;row++)for(let i=0;i<8;i++){
  const [kind,item]=rows[row];E(`{const c=ActorVisuals.config;ctx.save();ctx.translate(${115+i*135},${70+row*130});ctx.scale(1.6,1.6);ActorVisuals.renderPose({kind:${JSON.stringify(kind)},item:${JSON.stringify(item)},id:c.body[${JSON.stringify(kind)}],frame:${i},hands:${kind==='unarmed'?'null':`c.${kind}Hands[${i}]`}},0,0,Math.PI/2);ctx.restore();}`);
 }
 fs.mkdirSync('qa/results/character-visuals',{recursive:true});fs.writeFileSync('qa/results/character-visuals/player-gaits.png',r.canvas.toBuffer('image/png'));
 E('ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#263631";ctx.fillRect(0,0,1280,800)');
 for(let row=0;row<3;row++)for(let i=0;i<8;i++){const item=['axe','pickaxe','hammer'][row];E(`{const c=ActorVisuals.config;ctx.save();ctx.translate(${110+i*140},${130+row*200});ctx.scale(1.8,1.8);ActorVisuals.renderPose({kind:'tool',item:'${item}',id:c.body.tool,frame:${8+i},hands:c.toolHands[${8+i}]},0,0,Math.PI/2);ctx.restore();}`);}
 fs.writeFileSync('qa/results/character-visuals/tool-strikes.png',r.canvas.toBuffer('image/png'));
 E('ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#263631";ctx.fillRect(0,0,1280,800);scene="surface";player.x=800;player.y=850;updateCamera();');
 for(let row=0;row<5;row++)for(let i=0;i<8;i++){const type=['normal','heavy','fast','leaper','bloater'][row];E(`{const z=makeZombie(800,850);z.type='${type}';const s=V017Monsters.prepare(z);s.angle=Math.PI/2;s.walk=${i*4.5};ctx.save();ctx.translate(${100+i*145}-800,${80+row*140}-850);drawZombie(z);ctx.restore();}`);}
 fs.writeFileSync('qa/results/character-visuals/zombie-gaits.png',r.canvas.toBuffer('image/png'));console.log(r.errors);
}
main().catch(e=>{console.error(e);process.exitCode=1});
