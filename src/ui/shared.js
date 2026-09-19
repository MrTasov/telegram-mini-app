// 0.9 shared UI and item definitions. Loaded before progress restoration.
Object.assign(ITEM, {
  iron:{name:'Железо',icon:'🔩'}, copper:{name:'Медь',icon:'🟠'},
  iron_ore:{name:'Железная руда',icon:'🪨'}, copper_ore:{name:'Медная руда',icon:'🟤'},
  pickaxe:{name:'Кирка',icon:'⛏️',hand:true}, remote:{name:'Пульт базы',icon:'📟',hand:true},
  rifle_m4:{name:'M4',icon:'🔫',hand:true}, ammo556:{name:'Патроны 5,56',icon:'▰'},
  chicken_meat:{name:'Куриное мясо',icon:'🍗'}
});
ITEM.metal.name='Железо'; ITEM.ammo.name='Патроны 5,45';
['remote','pickaxe','rifle_m4'].forEach(type=>{if(!HAND_TYPES.includes(type))HAND_TYPES.push(type);});
bag.push({type:'remote',qty:1},{type:'pickaxe',qty:1},{type:'fuel',qty:10});
handSlots[3]='remote';
if(storageChests[2].name==='Металл')storageChests[2].name='Железо';
handSvg.remote='<rect x="26" y="5" width="47" height="59" rx="7" fill="#273e43" stroke="#91adb2" stroke-width="3"/><rect x="33" y="13" width="33" height="29" rx="3" fill="#122a2c"/><path d="M38 35V20h10v15m6 0V20h8v15" fill="none" stroke="#7bcdb0" stroke-width="3"/><circle cx="50" cy="52" r="5" fill="#a9d8ba"/>';
handSvg.pickaxe='<path d="M28 60L64 14" stroke="#6b472b" stroke-width="10" stroke-linecap="round"/><path d="M28 58L63 14" stroke="#bf945b" stroke-width="6" stroke-linecap="round"/><path d="M27 18Q62 -2 86 28L62 18 50 18Z" fill="#b6c7cb" stroke="#526b74" stroke-width="2"/>';
function v09Style(css){const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);return style;}
function v09Button(label,fn,className=''){
  const button=document.createElement('button');button.type='button';button.className='menuButton '+className;button.textContent=label;
  if(fn)button.addEventListener('click',fn);return button;
}
function v09Overlay(id,title){
  if(el(id)){const existing=el(id);existing.querySelector('.v09Title').textContent=title;existing.querySelector('.panel').setAttribute('aria-label',title);return existing;}
  const overlay=document.createElement('div');overlay.id=id;overlay.className='overlay v09Overlay';
  const panel=document.createElement('section');panel.className='panel v09Panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
  const header=document.createElement('div');header.className='v09Header';
  const heading=document.createElement('h2');heading.textContent=title;heading.className='v09Title';
  const close=v09Button('×',()=>closeOverlay(overlay),'v09Close');close.setAttribute('aria-label','Закрыть');
  header.append(heading,close);const body=document.createElement('div');body.className='v09Body';panel.append(header,body);overlay.append(panel);el('game').append(overlay);
  overlay.addEventListener('pointerdown',e=>{if(e.target===overlay){e.preventDefault();e.stopPropagation();closeOverlay(overlay);}});
  return overlay;
}
v09Style(`
 .v09Overlay{z-index:11000;background:rgba(5,10,12,.78);backdrop-filter:blur(4px)}
 .v09Panel{width:min(570px,96vw);padding:18px;background:linear-gradient(145deg,#202c30,#131e22);border-color:#46565b;border-radius:16px;box-shadow:0 20px 90px #0009;scrollbar-width:thin}
 .v09Header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;border-bottom:1px solid #ffffff15;padding-bottom:12px}
 .v09Title{font-size:20px;letter-spacing:.2px}
 .v09Close{width:38px;min-width:38px;height:38px;padding:0;margin:0;font-size:26px;background:#ffffff09}
 .v09Body{font-size:13px;line-height:1.5;color:#e4eeeb}
 .v09Body .menuButton{min-height:42px;font-size:13px;background:#2c3d42;border-color:#68818045}
 .v09Body .menuButton.primary{background:#376a57;border-color:#81b89a66}
 .v09Body .menuButton:disabled{opacity:.4;cursor:default}
 .v09Body button:focus-visible{outline:2px solid #e1c28b;outline-offset:2px}
 .v09Muted{color:#a4b5b6;font-size:12px}.v09Row{display:flex;align-items:center;justify-content:space-between;gap:10px}
 .v09Card{padding:12px;border:1px solid #ffffff15;border-radius:10px;background:#0002;margin:10px 0}
 .v09Body input,.v09Body select{max-width:100%;padding:8px;border-radius:7px;background:#142126;color:#e8f1ee;border:1px solid #607777;font:inherit;user-select:text;touch-action:manipulation}
 @media(max-height:500px){.v09Overlay{padding:8px}.v09Panel{max-height:96vh;padding:12px}.v09Header{margin-bottom:8px;padding-bottom:6px}}
`);
const v09OriginalLoot=randomLoot;
randomLoot=function(kind){
  const loot=v09OriginalLoot(kind).map(s=>({...s,type:s.type==='metal'?'iron':s.type}));
  if(kind==='house'&&Math.random()<.6)loot.push({type:'copper',qty:2+Math.floor(Math.random()*5)});
  if(Math.random()<.5)loot.push({type:'ammo556',qty:8+Math.floor(Math.random()*13)});
  return loot;
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const overlays=[...document.querySelectorAll('.overlay.open')];const last=overlays.at(-1);
    if(last&&last.id!=='deathOverlay')closeOverlay(last);
  }
});


