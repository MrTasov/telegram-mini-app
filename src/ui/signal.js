/* Read-only Day X presentation. No persistent Threat panel or numeric score. */
window.GameSignalUI=(()=>{
 const t=(k,p)=>I18n.t(k,p),node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const vignette=node('div');vignette.id='dayXVignette';vignette.setAttribute('aria-hidden','true');el('game').append(vignette);
 const alert=node('div');alert.id='dayXNotice';alert.setAttribute('role','status');alert.setAttribute('aria-live','polite');alert.setAttribute('data-i18n-skip','');document.body.append(alert);
 let until=0,noticeKey=null,noticeDay=0,lastPhase='';
 const key=()=>[GameSignal.epoch,WorldClock.day,Math.floor(WorldClock.minute),I18n.language].join('|');
 function mount(host){const v=GameSignal.view(),card=node('section');card.className='signalCard';card.append(node('h3',t('signal.title')));
  card.append(node('p',v.phase==='attack'?t('signal.until'):t('signal.countdown',{day:v.nextDay,h:Math.floor(v.left/60),m:Math.floor(v.left%60)})));
  card.append(node('p',t('signal.prepare')));
  if(v.last){card.append(node('h4',t('signal.last',{day:v.last.day})),node('p',t('signal.result.'+v.last.outcome)),node('p',t('signal.result.stats',{kills:v.last.kills,remaining:v.last.remaining,hp:v.last.lostHP})));}host.append(card);
 }
 function notice(k,day){noticeKey=k;noticeDay=day;until=performance.now()+SignalDefinitions.noticeMs;alert.textContent=t('dayx.notice.'+k,{day});alert.hidden=false;}
 function reset(){until=0;noticeKey=null;alert.hidden=true;refresh();}
 function refresh(){const v=GameSignal.view(false),running=GameState.session.ready&&!window.MainMenu?.active&&!window.StoryPlayer?.active;
  if(v.phase!==lastPhase){lastPhase=v.phase;el('hudDay').dataset.dayx=v.phase;el('hudDayLabel').dataset.dayx=v.phase;}
  vignette.hidden=!(running&&v.phase==='attack'&&scene==='surface');alert.hidden=!running||!noticeKey||performance.now()>=until;
 }
 const tick=update;update=function(...args){const result=tick(...args);refresh();return result;};I18n.onChange(()=>{if(noticeKey)alert.textContent=t('dayx.notice.'+noticeKey,{day:noticeDay});refresh();});
 v09Style(`
 #dayXVignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at center,transparent 40%,rgba(35,0,3,.35) 74%,rgba(49,0,4,.9) 100%);opacity:${SignalDefinitions.vignetteOpacity};animation:dayxPulse ${SignalDefinitions.vignettePulseSeconds}s ease-in-out infinite}
 #dayXVignette[hidden],#dayXNotice[hidden]{display:none!important}
 @keyframes dayxPulse{0%,100%{opacity:${SignalDefinitions.vignetteOpacity*.7}}50%{opacity:${SignalDefinitions.vignetteOpacity}}}
 [data-dayx=warning]{color:#e6aca5!important}[data-dayx=imminent]{color:#f2786f!important}[data-dayx=attack]{color:#ff4944!important}
 #dayXNotice{position:fixed;z-index:19;top:calc(3px + env(safe-area-inset-top) + var(--tg-content-safe-area-inset-top,0px));left:calc(130px + env(safe-area-inset-left));right:calc(12px + env(safe-area-inset-right));text-align:center;overflow:hidden;text-overflow:ellipsis;pointer-events:none;white-space:nowrap;color:#ff8d80;text-shadow:0 1px 3px #140000;font:300 clamp(10px,3vw,13px)/1.1 Arial;letter-spacing:.03em}
 @media(max-height:480px){#dayXNotice{font-size:12px}}
 @media(prefers-reduced-motion:reduce){#dayXVignette{animation:none}}
 .signalCard{padding:12px;margin:8px 0;background:#20332e;border:1px solid #677c68;border-radius:8px;color:#e3edda;line-height:1.5;overflow-wrap:anywhere}.signalCard p{font-size:13px;margin:8px 0}
 `);
 reset();return Object.freeze({mount,key,refresh,notice,reset});
})();
