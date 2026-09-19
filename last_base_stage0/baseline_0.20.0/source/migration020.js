  const HP_LEVELS=[0,10000,20000,40000,60000,100000];
  function capture(){return{schema:4,northOpen:false,commandNorthOpen,commandSouthOpen,sections:sections.map(o=>({id:o.id,hp:o.hp,level:o.level}))};}
  function validate(d){
    if(d===undefined||d===null)return true;
    const current=d.schema===4,legacy=d.schema===1;
    const layout=current?byId:legacyLayout,expected=layout.size+(legacy?retiredSections.size:0);
    if(![1,2,3,4].includes(d.schema)||!['northOpen','commandNorthOpen','commandSouthOpen'].every(k=>typeof d[k]==='boolean')||!Array.isArray(d.sections)||d.sections.length!==expected)throw Error('Некорректное состояние укреплений');
    const seen=new Set();for(const p of d.sections){
      const section=layout.get(p?.id),maxHp=d.schema>=3?(section&&Number.isInteger(p.level)&&p.level>=1&&p.level<=5?HP_LEVELS[p.level]:undefined):(section?.legacyMaxHp??(legacy?retiredSections.get(p?.id):undefined));
      if(maxHp===undefined||seen.has(p.id)||!Number.isFinite(p.hp)||p.hp<0||p.hp>maxHp)throw Error('Некорректная прочность секции');seen.add(p.id);
    }return true;
  }
  function normalizeSave(d){
    validate(d);if(!d||d.schema===4)return d;
    const values=new Map(d.sections.map(p=>[p.id,p]));
    function properties(old){const p=values.get(old.id),level=d.schema>=3?p.level:1,max=d.schema>=3?HP_LEVELS[level]:old.legacyMaxHp;return {level,ratio:clamp(p.hp/max,0,1)};}
    const merged=sections.map(o=>{
      let contributors=[];
      if(o.group==='inner'||o.id==='gate')contributors=[{old:legacyLayout.get(o.id),weight:1}];
      else for(const old of legacyLayout.values()){
        if(old.id==='v091innerGate'||old.id.startsWith('v015airlock')||old.id.startsWith('v015command'))continue;
        const weight=V020Walls.overlap(o,old);if(weight>0)contributors.push({old,weight});
      }
      const level=Math.max(1,...contributors.map(({old})=>properties(old).level));let hp=HP_LEVELS[level];
      if(contributors.length){const total=contributors.reduce((n,c)=>n+c.weight,0);hp=Math.round(HP_LEVELS[level]*contributors.reduce((n,c)=>n+properties(c.old).ratio*c.weight,0)/total);}
      return {id:o.id,level,hp};
    });
    return {schema:4,northOpen:false,commandNorthOpen:d.commandNorthOpen,commandSouthOpen:d.commandSouthOpen,sections:merged};
  }
  function migrateGame(d){
    if(!d?.base015||d.base015.schema===4)return d;
    const out={...d,base015:normalizeSave(d.base015)};
    if(d.v091?.fortress)out.v091={...d.v091,fortress:{...d.v091.fortress,innerGateOpen:true}};
    if(d.turret016)out.turret016={...d.turret016,guns:d.turret016.guns.map(t=>{
      if(t.fallen||!legacyLayout.has(t.wallId))return {...t};
      const eligible=sections.filter(o=>!o.gate&&['outer','inner'].includes(o.group));
      const p=eligible.find(o=>Math.hypot(t.x-clamp(t.x,o.x,o.x+o.w),t.y-clamp(t.y,o.y,o.y+o.h))<17.99);
      if(p)return {...t,wallId:p.id};
      // A removed gatehouse mount becomes a recoverable item on the ground.
      const landing=V020Walls.inwardSafePoint(t.x,t.y,12)||{x:800,y:960};
      return {...t,...landing,wallId:null,fallen:true};
    })};
    return out;
  }
  function restore(d){
    d=normalizeSave(d);const values=new Map(d?.sections.map(o=>[o.id,o]));
    for(const o of sections){const p=values.get(o.id);o.level=p?.level||1;o.maxHp=HP_LEVELS[o.level];o.hp=p?p.hp:o.maxHp;o.hitAt=-1e6;}
    northOpen=false;commandNorthOpen=d?.commandNorthOpen??false;commandSouthOpen=d?.commandSouthOpen??true;revision++;invalidateGeometry();
  }
