/* Shared, pure availability policy. Callers supply authoritative facts.
   No reads from UI, inventory, local player or mutable world state. */
window.GameConditions=(()=>{
  function validate(c,facts,depth=0){
    if(!c||typeof c!=='object'||Array.isArray(c)||depth>16)throw Error('Invalid condition');
    const branches=['all','any'].filter(k=>Object.hasOwn(c,k));
    if(branches.length){
      if(branches.length!==1||Object.keys(c).some(k=>k!==branches[0]&&k!=='reason'))throw Error('Ambiguous condition');
      const nodes=c[branches[0]];if(!Array.isArray(nodes)||!nodes.length||nodes.length>64)throw Error('Invalid condition branches');
      nodes.forEach(n=>validate(n,facts,depth+1));
    }else{
      if(!facts.includes(c.fact)||Object.hasOwn(c,'equals')===Object.hasOwn(c,'atLeast'))throw Error('Unknown condition fact or operator');
      if(Object.keys(c).some(k=>!['fact','equals','atLeast','reason'].includes(k)))throw Error('Unknown condition field');
      if(Object.hasOwn(c,'atLeast')&&(!Number.isFinite(c.atLeast)||c.atLeast<0))throw Error('Invalid threshold');
      if(Object.hasOwn(c,'equals')&&!['boolean','number','string'].includes(typeof c.equals))throw Error('Invalid comparison');
    }
    if(typeof c.reason!=='string'&&c.reason!==undefined)throw Error('Invalid reason');
    return true;
  }
  function evaluate(c,facts){
    if(c.all||c.any){const values=(c.all||c.any).map(n=>evaluate(n,facts));const available=c.all?values.every(v=>v.available):values.some(v=>v.available);return {available,reason:available?null:c.reason||values.find(v=>!v.available)?.reason||'campaign.reason.condition'};}
    const value=facts[c.fact],known=value!==undefined;
    const available=known&&(Object.hasOwn(c,'equals')?value===c.equals:typeof value==='number'&&Number.isFinite(value)&&value>=c.atLeast);
    return {available,reason:available?null:c.reason||'campaign.reason.condition'};
  }
  return Object.freeze({validate,evaluate});
})();
