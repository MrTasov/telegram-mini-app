/* Read-only presentation over the world authority. Same content in HUD,
   world map and the existing Map / Signals Core route. */
window.GameSignalUI=(()=>{
 const t=(k,p)=>I18n.t(k,p),node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const chip=node('button');chip.id='signalChip';chip.type='button';chip.setAttribute('data-i18n-skip','');el('v010Trackers').append(chip);
 const overlay=v09Overlay('signalOverlay',t('signal.title')),body=overlay.querySelector('.v09Body');let signature='';
 const key=()=>[GameSignal.epoch,WorldClock.day,Math.floor(WorldClock.minute),I18n.language].join('|');
 function summary(v){return t('signal.phase.'+v.phase)+' · '+t('signal.threat',{n:v.threat});}
 function mount(host){const v=GameSignal.view(),card=node('section');card.className='signalCard';card.append(node('h3',t('signal.title')),node('strong',summary(v)));
  card.append(node('p',v.phase==='attack'?t('signal.until'):t('signal.countdown',{day:v.nextDay,h:Math.floor(v.left/60),m:Math.floor(v.left%60)})));
  if(v.phase!=='quiet'){card.append(node('p',t(v.profile.title)),node('p',t('signal.directions',{sides:v.profile.sides.map(s=>t('signal.side.'+s)).join(', ')})));}
  card.append(node('p',t('signal.prepare')),node('small',t('signal.explain')));
  if(v.wave)card.append(node('p',t('signal.wave',{n:v.wave.admitted.length,max:v.wave.limit,kills:v.wave.killed.length})));
  if(v.last){card.append(node('h4',t('signal.last',{day:v.last.day})),node('p',t('signal.result.'+v.last.outcome)),node('p',t('signal.result.stats',{kills:v.last.kills,remaining:v.last.remaining,hp:v.last.lostHP})),node('small',t('signal.recovery')));}
  host.append(card);
 }
 function refresh(){const k=key();if(signature===k)return;signature=k;const v=GameSignal.view();chip.textContent=summary(v);chip.dataset.phase=v.phase;chip.setAttribute('aria-label',t('signal.title')+' · '+summary(v));
  if(overlay.classList.contains('open')){overlay.querySelector('.v09Title').textContent=t('signal.title');const top=body.scrollTop;body.replaceChildren();mount(body);body.scrollTop=top;}
 }
 chip.onclick=()=>{openOverlay(overlay);signature='';refresh();};
 const tick=update;update=function(...args){const result=tick(...args);refresh();return result;};I18n.onChange(()=>{signature='';refresh();});
 v09Style(`#signalChip{display:block;width:min(210px,42vw);margin-top:5px;padding:7px 9px;min-height:36px;border:1px solid #718b76;border-radius:6px;background:#15281bb3;color:#dbe9c4;font:11px/1.3 Arial;text-align:left;touch-action:manipulation}#signalChip[data-phase=warning],#signalChip[data-phase=imminent]{border-color:#d6ac5f;color:#ffdd99}#signalChip[data-phase=attack]{border-color:#df7664;color:#ffb3a6}.signalCard{padding:12px;margin:8px 0;background:#20332e;border:1px solid #677c68;border-radius:8px;color:#e3edda;line-height:1.5;overflow-wrap:anywhere}.signalCard p{font-size:13px;margin:8px 0}.signalCard small{font-size:11px;color:#c0cabc}#signalOverlay .v09Panel{box-sizing:border-box;width:min(560px,calc(100vw - 20px));height:min(620px,calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom) - var(--tg-content-safe-area-inset-top,0px)));display:flex;flex-direction:column;overflow:hidden}#signalOverlay .v09Header{flex:none}#signalOverlay .v09Body{min-height:0;overflow:auto;overscroll-behavior:contain;touch-action:pan-y}`);
 refresh();return Object.freeze({mount,key,refresh});
})();
