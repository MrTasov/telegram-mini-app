/* Physical drone station UI and shared, level-aware map marker. No timers. */
window.V0151Station=(()=>{
  const robot=V014Robots,s=robot.state,refs={},buttons={};let overlay=null;
  const statuses={CHARGING:'Заряжается',FULLY_CHARGED:'Полностью заряжен',NOT_DOCKED:'Не пристыкован',RETURNING:'Возвращается',NO_POWER:'Нет питания',DRONE_UNAVAILABLE:'Дрон в рюкзаке',DOCKING:'Стыковка'};
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)I18n.assign(n,"textContent",text);return n;};
  const set=(n,text)=>{if(n&&I18n.source(n)!==String(text))I18n.assign(n,"textContent",String(text));};
  function build(){
    overlay=v09Overlay('v0151Station','Станция дрона');const body=overlay.querySelector('.v09Body');
    const head=node('div','stationHead'),image=node('img');image.src=V011Art.sources.drone014;I18n.assign(image,"alt",'Дрон');head.append(image);
    const summary=node('div');refs.name=node('b');refs.status=node('div','stationStatus');refs.status.setAttribute('role','status');summary.append(refs.name,refs.status);head.append(summary);body.append(head);
    const rows=node('div','stationReadings');for(const [key,label]of [['battery',I18n.message('ux.drone_battery')],['durability','Прочность'],['power','Потребление'],['eta','До полного заряда']]){
      const row=node('div','stationReading');row.append(node('span','',label));refs[key]=node('b');row.append(refs[key]);rows.append(row);
    }body.append(rows);
    refs.meter=node('div','stationBattery');refs.fill=node('span');refs.meter.append(refs.fill);body.append(refs.meter);
    refs.auto=node('button','droneSwitch stationAuto');refs.auto.type='button';refs.auto.setAttribute('role','switch');I18n.setAttr(refs.auto,'aria-label','Автовозврат при низком заряде');
    const rail=node('span','droneSwitchRail');refs.autoValue=node('span','droneSwitchValue');rail.append(refs.autoValue);refs.auto.append(node('span','','Автовозврат · '+robot.station.returnThreshold+'%'),rail);
    refs.auto.addEventListener('click',()=>{robot.setAutoReturn(!s.autoReturn);refresh();});body.append(refs.auto);
    refs.hint=node('p','stationHint');body.append(refs.hint);
    const actions=node('div','stationActions');
    function command(id,text,action){const b=v09Button(text,()=>{action();refresh();});b.id='station_'+id;buttons[id]=b;actions.append(b);}
    command('install','Поставить из рюкзака',robot.install);
    command('repair','Починить дрон',()=>robot.repair(true));
    command('return','На станцию',robot.returnToDock);
    command('follow','Следовать',robot.follow);
    command('pack','Забрать дрон',robot.pack);
    command('manage','Управление дроном',()=>{closeOverlay(overlay);robot.open();});
    body.append(actions);
  }
  function refresh(){
    if(!overlay||!overlay.classList.contains('open'))return;
    const info=robot.stationInfo();set(refs.name,I18n.verbatim(s.name));set(refs.status,info.blocked&&s.task==='return'?'Путь закрыт · ожидание':statuses[info.status]);
    set(refs.durability,Math.round(s.hp)+' / '+robot.maxHp());
    buttons.repair.disabled=!robot.canRepair(true);
    set(buttons.repair,'Починить дрон · '+Object.entries(robot.repairCost()).map(([type,n])=>ITEM[type].name+' × '+n).join(', '));
    refs.status.dataset.state=info.status;set(refs.battery,Math.round(s.battery)+'%');set(refs.power,info.watts+' / '+robot.station.watts+' кВт');
    const eta=info.eta===null?'—':Math.floor(info.eta/60)+' мин '+info.eta%60+' сек';set(refs.eta,info.status==='FULLY_CHARGED'?'Готово':eta);
    refs.fill.style.width=s.battery+'%';I18n.setAttr(refs.meter,'aria-label','Заряд '+Math.round(s.battery)+'%');
    refs.auto.setAttribute('aria-checked',String(s.autoReturn));set(refs.autoValue,s.autoReturn?'ВКЛ':'ВЫКЛ');
    set(refs.hint,info.status==='NO_POWER'?'Зарядка продолжится, когда база сможет подать 1 кВт.':info.blocked?'Откройте проход или заберите дрон в рюкзак.':s.hp<=0?'Заберите сломанного дрона в рюкзак, установите на станцию и нажмите «Починить дрон».':'Разряженный дрон можно принести в рюкзаке и поставить на площадку.');
    buttons.install.disabled=!s.packed||!robot.stationNear()||!bag.some(robot.ownsToken);
    buttons.return.disabled=s.packed||s.hp<=0||s.battery<=0||['return','docked','docking'].includes(s.task);
    buttons.follow.disabled=s.packed||s.hp<=0||s.battery<=0||info.docked&&s.autoReturn&&s.battery<=info.threshold;
    buttons.pack.disabled=s.packed;
  }
  function open(){if(!overlay)build();openOverlay(overlay);refresh();}
  // The single persistent drone's scene is authoritative. Never project its
  // coordinates onto a different floor; use that floor's real hatch instead.
  function mapMarker(level=scene){
    if(s.packed)return null;
    const other=s.scene!==level,p=other?(level==='surface'?surface.hatch:bunker.entrance):s;
    return {x:p.x,y:p.y,level,other,off:s.battery<=0||s.hp<=0,name:s.name,
      label:I18n.verbatim(s.name)+(other?(s.scene==='bunker'?' · в бункере ↓':' · на поверхности ↑'):(s.battery<=0?' · разряжен':s.hp<=0?' · повреждён':' · '+Math.round(s.battery)+'%')),
      arrow:other?(s.scene==='bunker'?'↓':'↑'):''};
  }
  function drawMap(c,scale,mini,level=scene){
    const m=mapMarker(level);if(!m||!(scale>0))return;
    c.save();c.translate(m.x,m.y);c.scale(1/scale,1/scale);
    const r=mini?4:5,col=m.off?'#ecc583':'#7ae0d6';
    c.lineWidth=4;c.strokeStyle='#102124';c.beginPath();c.moveTo(-r,-r);c.lineTo(r,r);c.moveTo(r,-r);c.lineTo(-r,r);c.stroke();
    c.lineWidth=1.5;c.strokeStyle=col;c.stroke();
    for(const x of [-r,r])for(const y of [-r,r]){c.fillStyle='#183837';c.strokeStyle=col;c.beginPath();c.arc(x,y,mini?2:2.8,0,Math.PI*2);c.fill();c.stroke();}
    c.fillStyle=col;c.fillRect(-2,-2,4,4);
    if(m.other||!mini){c.font=(mini?'11':'10')+'px Arial';c.textAlign=mini?'left':'center';c.textBaseline='middle';const text=mini?m.arrow:m.label;
      c.lineWidth=3;c.strokeStyle='#102124';c.strokeText(I18n.text(text),mini?9:0,mini?0:17);c.fillStyle=col;c.fillText(I18n.text(text),mini?9:0,mini?0:17);}
    c.restore();
  }
  v09Style(`
    #v0151Station .panel{width:min(390px,92vw);max-height:80dvh;min-height:0;padding:14px;overflow-y:auto;overflow-x:hidden}
    #v0151Station .v09Header{margin-bottom:10px;padding-bottom:9px}#v0151Station .v09Title{font-size:17px}
    #v0151Station .v09Body{font-size:12px;line-height:1.4}.stationHead{display:flex;gap:12px;align-items:center;min-height:76px}
    .stationHead img{width:80px;height:70px;object-fit:contain}.stationHead b{font-size:14px}.stationStatus{color:#a8d5b6;min-height:34px;max-width:210px;font-size:12px}
    .stationStatus[data-state=NO_POWER]{color:#dfbf8b}.stationReadings{padding:7px 10px;border:1px solid #49605e;border-radius:8px;background:#17292b88}
    .stationReading{display:flex;justify-content:space-between;gap:8px;margin:6px 0}.stationReading span{color:#a8bfb9}.stationReading b{font-size:12px;font-weight:400;white-space:nowrap;font-variant-numeric:tabular-nums}
    .stationBattery{height:5px;background:#142628;border-radius:3px;margin:10px 0;overflow:hidden}.stationBattery span{display:block;height:100%;background:#94c4a6;transition:width .25s linear}
    #v0151Station .stationAuto{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;min-height:44px;padding:4px 0;border:0;background:none;color:#c9dcd3;font:12px Arial;touch-action:manipulation}
    .stationHint{font-size:11px;color:#a9bcb3;min-height:46px;margin:7px 0}.stationActions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    #v0151Station .stationActions .menuButton{width:100%;min-height:38px;font-size:11px;padding:7px 8px;margin:0}#station_manage{grid-column:1/-1}
  `);
  return {open,refresh,mapMarker,drawMap};
})();

