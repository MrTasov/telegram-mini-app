/* Mode-specific presentation only; the existing touch layout editor is intact. */
(()=>{
  const box=document.createElement('div');box.className='settingBox';box.id='controlModeSettings';
  const label=document.createElement('label');label.className='settingTitle';label.textContent='CONTROL MODE';label.setAttribute('for','controlModeSelect');
  const select=document.createElement('select');select.id='controlModeSelect';select.setAttribute('aria-describedby','controlModeStatus');
  for(const value of ['AUTO','PC','MOBILE']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}
  const status=document.createElement('div');status.id='controlModeStatus';status.setAttribute('role','status');
  const help=document.createElement('div');help.id='controlModeHelp';
  box.append(label,select,status,help);
  const panel=el('settingsOverlay').querySelector('.panel');panel.querySelector('.settingBox').before(box);
  select.addEventListener('change',()=>GameInput.setMode(select.value));
  v09Style(`
    #controlModeSettings{display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px 12px}
    #controlModeSettings .settingTitle{margin:0}#controlModeSelect{font:inherit;color:#e3eee7;background:#203630;border:1px solid #89a998;border-radius:6px;padding:7px 10px;min-width:106px;touch-action:manipulation}
    #controlModeStatus,#controlModeHelp{grid-column:1/-1;font-size:11px;line-height:1.5;color:#b6cfc2}#controlModeHelp{color:#d4dfd5}
    body[data-control-mode="PC"] #moveControl,body[data-control-mode="PC"] #aimControl,body[data-control-mode="PC"] #actionButton{display:none!important;pointer-events:none!important}
    body[data-control-mode="PC"] #canvas{cursor:crosshair}
    body[data-control-mode="PC"] #bagButton,body[data-control-mode="PC"] #v010SneakButton{top:auto!important;bottom:14px!important;transform:none!important}
    body[data-control-mode="PC"] #bagButton{left:calc(50% + 153px)!important;right:auto!important}
    body[data-control-mode="PC"] #v010SneakButton{left:calc(50% - 197px)!important;right:auto!important}
    body[data-control-mode="PC"] #v010ReloadButton{top:auto;bottom:14px;right:calc(50% - 251px);width:44px;height:44px;font-size:18px}
    body[data-control-mode="PC"] #v014RouteStop{bottom:102px}
    body[data-control-mode="PC"] #settingsOverlay .panel{width:min(440px,94vw)}
    @media(min-width:900px){body[data-control-mode="PC"] #inventoryOverlay .panel{max-width:850px}body[data-control-mode="PC"] #storageOverlay .panel{max-width:980px}}
    @media(max-width:540px){body[data-control-mode="PC"] #v010ReloadButton{right:12px;bottom:76px}body[data-control-mode="PC"] #bagButton{left:auto!important;right:8px!important}body[data-control-mode="PC"] #v010SneakButton{left:8px!important}}
  `);
  GameInput.mount((preference,mode)=>{
    select.value=preference;
    status.textContent=(preference==='AUTO'?'AUTO → ':'Активен: ')+mode+(preference==='AUTO'?' · по возможностям устройства и последнему вводу':'');
    help.textContent=mode==='PC'
      ?'ЛКМ — идти / объект / выбрать врага. Удержание ЛКМ — следовать за указателем. ПКМ — прицел и огонь: по выбранной цели, без цели — к курсору. R — перезарядка · I — инвентарь · 1–5 — слоты · M — карта · C — тихий ход · Esc — закрыть окно / настройки.'
      :'Левый джойстик — движение. Правый — прицел / огонь, с выбранной целью — Fire. ✋ — действие · ↻ — перезарядка. Касание мира — идти / взаимодействовать / выбрать врага. Два пальца — масштаб. Расположение кнопок меняется в редакторе ниже.';
    for(const id of ['moveControl','aimControl','actionButton'])el(id).setAttribute('aria-hidden',String(mode==='PC'));
    el('bagButton').title='Персонаж и инвентарь'+(mode==='PC'?' · I':'');
    el('settingsButton').title='Настройки'+(mode==='PC'?' · Esc':'');
    el('v010Minimap').title=mode==='PC'?'Карта · M · удержание 1,5 с: прозрачность':'Касание: большая карта · удержание 1,5 с: 100% → 60% → 30%';
  });
})();

