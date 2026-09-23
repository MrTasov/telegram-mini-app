/* Persistent Core shell. Sections are UI clients; progression mutations still
   go through the actor-addressed campaign authority and physical Core access. */
window.CommandCoreUI=(()=>{
  const overlay=v09Overlay('commandCoreOverlay',I18n.t('bunker.core.name'));
  const panel=overlay.querySelector('.v09Panel'),body=overlay.querySelector('.v09Body');
  const t=(key,params)=>I18n.t(key,params),num=(n,d=0)=>I18n.number(n,{maximumFractionDigits:d});
  function node(tag,key,cls){const n=document.createElement(tag);if(cls)n.className=cls;if(key)n.textContent=t(key);return n;}
  function put(n,value){if(n.textContent!==value)n.textContent=value;}
  function button(key,fn,cls='menuButton'){const b=node('button',key,cls);b.type='button';b.onclick=fn;return b;}
  const tabs=node('div',null,'campaignTabs');tabs.setAttribute('role','tablist');
  const stage=node('div',null,'coreSections'),links=node('div',null,'campaignLinks');body.append(tabs,stage,links);
  const tracker=node('section');tracker.id='campaignTracker';el('v010Trackers').append(tracker);
  const trackerToggle=button(null,()=>{trackerExpanded=!trackerExpanded;renderTracker();},'trackerChip');trackerToggle.id='campaignTrackerToggle';
  const trackerMark=node('span',null,'trackerMark'),trackerTitle=node('b','campaign.tracker.title'),trackerChevron=node('span');trackerToggle.append(trackerMark,trackerTitle,trackerChevron);
  const trackerPanel=node('div',null,'trackerPanel');trackerPanel.id='campaignTrackerList';
  const trackerItems=node('div',null,'trackerItems'),trackerOpen=button('campaign.tracker.open',()=>show('chapters',true),'trackerOpen');trackerPanel.append(trackerItems,trackerOpen);
  const feedback=node('div',null,'trackerFeedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  tracker.append(trackerToggle,trackerPanel,feedback);trackerToggle.setAttribute('aria-controls',trackerPanel.id);
  let trackerExpanded=false,previousObjectives=null,feedbackUntil=0,viewEpoch=0;const celebrated=new Set(),objectiveExpanded=new Set();
  const legacyLinks=[['campaign.research','research'],['campaign.achievements','achievements']].map(([key,legacy])=>{
    const b=button(key,()=>{closeOverlay(overlay);V010Progression.show(legacy);});links.append(b);return {b,key};
  });
  // Reserved routes describe the extension boundary, not visible placeholders.
  // Register a route only when its real owner and complete view are available.
  const routeOrder=['construction','base','chapters','research','blueprints','archive','map-signals'],routes=new Set(routeOrder);
  const sections=new Map();let tab='base',remote=false,sequence=0,dirty=true,lastTracker='',lastLanguage='';
  let scope=null;
  const location=()=>GameActors.local.scene==='bunker'&&(GameActors.local.entity.floor??1)===1?'bunker:1':null;
  function syncLocation(){const next=location();if(scope!==next){reset();scope=next;}return next;}
  function registerSection(id,title,mount,available=()=>true,validPage=()=>true){
    if(!routes.has(id)||sections.has(id)||typeof mount!=='function')throw Error('Invalid Core section');
    const scroll=node('section',null,'coreScroll');scroll.id='coreSection_'+id;scroll.hidden=true;scroll.setAttribute('role','tabpanel');scroll.setAttribute('aria-labelledby','coreTab_'+id);
    let page=null;const route=Object.freeze({get page(){if(page!==null&&!validPage(page))page=null;return page;},setPage(value){if(value!==null&&(typeof value!=='string'||value.length>100||!validPage(value)))return false;page=value;return true;},reset(){page=null;}});
    const update=mount(scroll,route);if(typeof update!=='function')throw Error('Core section needs an update client');
    const b=button(title,()=>select(id));b.id='coreTab_'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',scroll.id);
    b.onkeydown=e=>{const ids=[...sections.keys()].filter(key=>sections.get(key).available()),i=ids.indexOf(id);let target;if(e.key==='ArrowRight')target=ids[(i+1)%ids.length];if(e.key==='ArrowLeft')target=ids[(i+ids.length-1)%ids.length];if(e.key==='Home')target=ids[0];if(e.key==='End')target=ids.at(-1);if(target){e.preventDefault();select(target);sections.get(target).b.focus();}};
    sections.set(id,{title,b,scroll,update,available,route});for(const key of routeOrder)if(sections.has(key))tabs.append(sections.get(key).b);stage.append(scroll);return true;
  }
  function select(id){if(!sections.has(id)||!sections.get(id).available())return false;tab=id;for(const [key,s]of sections){const active=key===tab;s.scroll.hidden=!active;s.b.classList.toggle('active',active);s.b.setAttribute('aria-selected',String(active));s.b.setAttribute('aria-pressed',String(active));s.b.tabIndex=active?0:-1;}dirty=true;render();return true;}
  function chapter(v=GameCampaign.view()){return GameCampaign.definitions.chapters.find(c=>c.id===v.chapter);}
  function status(){return GameCampaign.access(GameActors.local,BunkerLayout.core.id);}
  function renderTracker(){
    const v=GameCampaign.view(),c=chapter(v),visible=GameHUD.settings.objectives,now=performance.now();tracker.hidden=!visible;
    if(previousObjectives&&!GameSave.restoring)for(const o of c.objectives){if(v.objectives[o.id].done&&!previousObjectives[o.id]?.done&&!celebrated.has(o.id)){
      celebrated.add(o.id);if(visible){feedbackUntil=now+2300;put(feedback,'✓ '+t(o.title));}
    }}
    previousObjectives=v.objectives;
    feedback.hidden=!visible||now>=feedbackUntil;tracker.classList.toggle('completed',!feedback.hidden);
    put(trackerMark,feedback.hidden?'◎':'✓');put(trackerTitle,t(window.GameChapterOne?.active?'chapter1.tracker':'campaign.tracker.title'));put(trackerChevron,trackerExpanded?'⌃':'⌄');
    trackerPanel.hidden=!trackerExpanded;trackerToggle.setAttribute('aria-expanded',String(trackerExpanded));put(trackerOpen,t('campaign.tracker.open'));
    if(!visible||!trackerExpanded)return;
    const signature=[v.revision,JSON.stringify(GameCampaign.facts()),I18n.language].join('|');if(signature===lastTracker)return;lastTracker=signature;
    trackerItems.replaceChildren();const pending=c.objectives.filter(o=>v.objectives[o.id].active&&!v.objectives[o.id].done).sort((a,b)=>Number(b.required)-Number(a.required));
    for(const o of pending){const row=node('div',null,'trackerObjective');row.append(node('span',o.title));const p=node('small');put(p,progress(o,v.objectives[o.id],GameCampaign.facts()));row.append(p);trackerItems.append(row);if(window.GameChapterOne?.active&&o===pending.find(x=>x.required))trackerItems.append(node('p',o.description,'trackerInstruction'));}
    if(!pending.length)trackerItems.append(node('p',v.ready?'campaign.tracker.ready':c.title));
  }
  function progress(o,s,f){
    if(!s.active)return t('campaign.status.locked');
    if(s.done)return t('campaign.status.done');
    const target=o.condition.atLeast;if(target===undefined)return t('campaign.status.active');
    const value=Math.max(0,(f[o.condition.fact]||0)-(o.semantics==='after'?s.baseline:0));
    if(o.condition.fact==='batteryCharge')return num(Math.min(value,target),2)+' / '+num(target,2)+' '+t('campaign.kwh');
    if(o.condition.fact==='perimeterCondition')return num(value*100)+'% / '+num(target*100)+'%';
    return t('core.objective.count',{value:num(Math.min(value,target)),target:num(target)});
  }
  registerSection('chapters','campaign.tab.chapters',(scroll,route)=>{
    let built='',cards=[],notice,heading,description,summary,advance,ready,completed,bar;const chapterButtons=new Map();
    const expanded=objectiveExpanded;
    return ({v,c,a,f})=>{
      c=GameCampaign.definitions.chapters.find(ch=>ch.id===route.page)||chapter(v);
      const key=c.id+'|'+v.chapter+'|'+I18n.language+'|'+viewEpoch;
      if(key!==built){
        const top=scroll.scrollTop||0;built=key;scroll.replaceChildren();cards=[];
        chapterButtons.clear();const strip=node('nav',null,'coreChapterStrip');strip.setAttribute('aria-label',t('campaign.tab.chapters'));
        GameCampaign.definitions.chapters.forEach((ch,i)=>{if(ch.id==='base_restored'&&ch.id!==v.chapter)return;const b=button(null,()=>{route.setPage(ch.id);scroll.scrollTop=0;render();},'coreChapterSelect');const label=node('small');put(label,ch.id==='base_restored'?t('core.chapter.complete'):t('core.chapter.number',{number:num(i+1)}));b.append(label,node('strong',ch.title));chapterButtons.set(ch.id,b);strip.append(b);});scroll.append(strip);
        const hero=node('div',null,'coreChapterHero');hero.append(node('small','core.campaign','coreEyebrow'));
        heading=node('h3',c.title);description=node('p',c.description);summary=node('div',null,'coreChapterProgress');hero.append(heading,description,node('p',c.goal,'coreMainGoal'),summary);bar=node('div',null,'coreProgressFill');const track=node('div',null,'coreProgressTrack');track.append(bar);hero.append(track);scroll.append(hero);
        notice=node('p',null,'campaignNotice');scroll.append(notice);
        for(const required of [true,false]){
          const objectives=c.objectives.filter(o=>o.required===required);if(!objectives.length)continue;
          scroll.append(node('h4',required?'core.objectives.required':'core.objectives.optional','coreGroupTitle'));
          if(!required)scroll.append(node('p','core.objectives.optionalHint','coreHint'));
          const list=node('div',null,'coreObjectiveList');scroll.append(list);
          for(const o of objectives){
            const card=node('section',null,'campaignObjective');card.dataset.objective=o.id;
            const toggle=button(null,()=>{const open=!expanded.has(o.id);if(open)expanded.add(o.id);else expanded.delete(o.id);details.hidden=!open;toggle.setAttribute('aria-expanded',String(open));},'coreObjectiveToggle');
            const mark=node('span',null,'coreObjectiveMark'),label=node('strong',o.title),state=node('small',null,'campaignStatus'),chevron=node('span',null,'coreChevron');chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');
            const main=node('span',null,'coreObjectiveText');main.append(label,state);toggle.append(mark,main,chevron);
            const details=node('div',null,'coreObjectiveDetails');details.id='coreObjective_'+o.id;details.hidden=!expanded.has(o.id);details.append(node('p',o.description));
            toggle.setAttribute('aria-expanded',String(!details.hidden));toggle.setAttribute('aria-controls',details.id);
            card.append(toggle,details);list.append(card);cards.push({o,card,mark,state});
          }
        }
        ready=node('p',null,'campaignNotice');scroll.append(ready);
        advance=button('campaign.advance',()=>{
          const revision=Number(advance.dataset.revision),chapterId=advance.dataset.chapter;
          const result=GameCampaign.execute({type:'ADVANCE_CHAPTER',actorId:GameActors.localId,targetId:BunkerLayout.core.id,chapterId,expectedRevision:revision,requestId:'core:'+revision+':'+(++sequence)});
          if(!result.ok)message(t(result.reason));dirty=true;render();renderTracker();
        });advance.id='campaignAdvance';scroll.append(advance);
        completed=node('p',null,'coreHint');scroll.append(completed);scroll.scrollTop=top;
      }
      for(const [id,b]of chapterButtons){b.disabled=id!==v.chapter&&!v.completed.includes(id);b.classList.toggle('selected',id===c.id);b.setAttribute('aria-current',id===c.id?'page':'false');b.dataset.state=b.disabled?'locked':v.completed.includes(id)?'done':'current';}
      const done=c.objectives.filter(o=>v.objectives[o.id]?.done).length,past=v.completed.includes(c.id);
      put(summary,!c.objectives.length?t('core.chapter.complete'):t('core.chapter.progress',{done:num(done),total:num(c.objectives.length)}));bar.style.width=(c.objectives.length?done/c.objectives.length*100:100)+'%';
      const notes=[];if(remote)notes.push(t('campaign.remote'));if(!a.available)notes.push(t(a.reason));notice.hidden=!notes.length;put(notice,notes.join(' '));
      for(const {o,card,mark,state}of cards){const s=v.objectives[o.id];card.dataset.state=s.done?'done':s.active?'active':'locked';put(mark,s.done?'✓':s.active?'○':'–');put(state,progress(o,s,f));}
      ready.hidden=!v.ready||past;put(ready,t('campaign.ready'));advance.hidden=v.terminal||past;advance.disabled=remote||!a.available||!v.ready;advance.dataset.revision=v.revision;advance.dataset.chapter=v.chapter;
      completed.hidden=!v.completed.length;put(completed,t('campaign.completed',{count:num(v.completed.length)}));
    };
  },()=>true,id=>{const v=GameCampaign.view();return id===v.chapter||v.completed.includes(id);});
  registerSection('base','campaign.tab.base',scroll=>{
    const cards=new Map();let locale='';
    return ()=>{
      const groups=GameBaseOverview.snapshot();
      const shape=I18n.language+'|'+GameEquipment.ids.join();if(locale!==shape){locale=shape;const top=scroll.scrollTop||0;scroll.replaceChildren();cards.clear();
        const intro=node('div',null,'coreBaseIntro');intro.append(node('h3','core.base.title'),node('p','core.base.description'));scroll.append(intro);
        for(const g of groups){const section=node('section',null,'coreBaseGroup');section.append(node('h4',null,'coreGroupTitle'));put(section.firstChild||section.children[0],g.title);const grid=node('div',null,'campaignBaseGrid');section.append(grid);scroll.append(section);
          for(const row of g.rows){const card=node('div',null,'coreSystem');card.dataset.system=row.id;const title=node('h5'),value=node('strong'),detail=node('p');card.append(title,value,detail);grid.append(card);cards.set(g.id+'/'+row.id,{title,value,detail});}
        }scroll.scrollTop=top;
      }
      for(const g of groups)for(const row of g.rows){const r=cards.get(g.id+'/'+row.id);put(r.title,row.title);put(r.value,row.value);put(r.detail,row.detail);}
    };
  });
  function render(){
    if(!overlay.classList.contains('open'))return;dirty=false;
    put(overlay.querySelector('.v09Title'),t('bunker.core.name'));panel.setAttribute('aria-label',t('bunker.core.name'));tabs.setAttribute('aria-label',t('core.sections'));
    for(const s of sections.values()){put(s.b,t(s.title));s.b.hidden=!s.available();}for(const {b,key}of legacyLinks)put(b,t(key));
    const v=GameCampaign.view();
    if(!sections.get(tab)?.available()){const fallback=[...sections.keys()].find(id=>sections.get(id).available());if(fallback)select(fallback);}
    const context={v,c:chapter(v),a:status(),f:GameCampaign.facts()};
    if(lastLanguage!==I18n.language){lastLanguage=I18n.language;for(const s of sections.values())s.update(context);}else sections.get(tab).update(context);
  }
  function show(which,readOnly=false){
    if(!GameState.session.ready||playerDead||window.MainMenu?.active)return false;
    if(!readOnly){const a=GameCampaign.access(GameActors.local,BunkerLayout.core.id,false);if(!a.available){message(t(a.reason));return false;}}
    syncLocation();remote=readOnly;if(!remote)window.GameChapterOne?.visit(GameActors.localId,BunkerLayout.core.id);GameCampaign.refresh(true);GameMovement.openUI();openOverlay(overlay);select(sections.has(which)?which:sections.get(tab)?.available()?tab:'base');return true;
  }
  function tick(){window.GamePlacementUI?.tick();syncLocation();renderTracker();if(overlay.classList.contains('open'))render();}
  function reset(){window.GamePlacementUI?.cancel();closeOverlay(overlay);remote=false;dirty=true;lastTracker='';trackerExpanded=!!window.GameChapterOne?.active&&GameCampaign.view().chapter==='chapter_1';tab='base';previousObjectives=GameCampaign.view().objectives;feedbackUntil=0;celebrated.clear();objectiveExpanded.clear();viewEpoch++;for(const s of sections.values()){s.route.reset();s.scroll.scrollTop=0;}renderTracker();}
  GameCampaign.subscribe(()=>{dirty=true;renderTracker();});
  I18n.onChange(()=>{lastTracker='';dirty=true;V09Power.devices[GameCampaign.powerId].name=t('bunker.core.name');renderTracker();render();});
  v09Style(`
#commandCoreOverlay{position:fixed;inset:0;padding:0;overflow:hidden;--core-top:max(28px,calc(var(--v011-game-top,10px) + 18px),calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px) + 12px));--core-bottom:max(12px,env(safe-area-inset-bottom,0px))}
#commandCoreOverlay .v09Panel{position:absolute;left:50%;top:calc(var(--core-top) + (100dvh - var(--core-top) - var(--core-bottom) - min(760px,100dvh - var(--core-top) - var(--core-bottom)))/2);transform:translateX(-50%);margin:0;width:min(720px,calc(100vw - 24px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)));height:min(760px,calc(100vh - var(--core-top) - var(--core-bottom)));height:min(760px,calc(100dvh - var(--core-top) - var(--core-bottom)));max-height:none;min-height:0;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;text-align:left;background:linear-gradient(145deg,#142b30,#101e26);border:1px solid #66827a66;border-radius:14px;box-shadow:0 20px 60px #0009}
#commandCoreOverlay .v09Header{height:48px;flex:0 0 48px;box-sizing:border-box;padding:0 0 10px;margin:0}
#commandCoreOverlay .v09Title{font-size:19px;line-height:1.2;margin:0}
#commandCoreOverlay .v09Body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
#commandCoreOverlay [hidden]{display:none!important}
#commandCoreOverlay .campaignTabs{display:flex;gap:8px;flex:0 0 48px;align-items:center}
#commandCoreOverlay .campaignTabs button{flex:1;min-width:0;margin:0;height:38px;min-height:38px;padding:6px;font-size:13px}
#commandCoreOverlay .campaignTabs .active{border-color:#95b7a2;background:#304b42;color:#eef4d9}
#commandCoreOverlay .coreSections{flex:1;min-height:0;position:relative;overflow:hidden}
#commandCoreOverlay .coreScroll{position:absolute;inset:0;box-sizing:border-box;overflow-x:hidden;overflow-y:scroll;overscroll-behavior:contain;scrollbar-gutter:stable;overflow-anchor:none;padding:4px 8px 16px 0;touch-action:pan-y}
#commandCoreOverlay .campaignLinks{display:flex;gap:8px;align-items:center;flex:0 0 48px;border-top:1px solid #ffffff18}
#commandCoreOverlay .campaignLinks button{flex:1;min-width:0;margin:0;padding:6px 8px;min-height:36px;font-size:12px}
#commandCoreOverlay .coreChapterHero{background:linear-gradient(130deg,#29403e,#172a30);border:1px solid #657b693d;border-radius:10px;padding:16px}
#commandCoreOverlay .coreEyebrow{color:#b7c990;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
#commandCoreOverlay h3{font-size:21px;line-height:1.2;margin:7px 0 9px;color:#edf1df}
#commandCoreOverlay p{line-height:1.5;overflow-wrap:anywhere}
#commandCoreOverlay .coreChapterHero p,#commandCoreOverlay .coreBaseIntro p{font-size:13px;color:#b1c4bf;margin:0}
#commandCoreOverlay .coreChapterProgress{font-size:12px;font-variant-numeric:tabular-nums;color:#d3dfbb;margin-top:12px}
#commandCoreOverlay .coreGroupTitle{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#b5c6bf;margin:18px 0 8px}
#commandCoreOverlay .coreHint{font-size:11px;color:#9cb1ad;margin:5px 0 9px}
#commandCoreOverlay .coreObjectiveList{display:flex;flex-direction:column;gap:5px}
#commandCoreOverlay .campaignObjective{border:1px solid #3d5758;border-radius:8px;background:#192c30;overflow:hidden}
#commandCoreOverlay .coreObjectiveToggle{display:flex;align-items:center;gap:8px;width:100%;min-height:43px;text-align:left;padding:7px 10px;background:none;border:0;color:#e4ece4;font:inherit;cursor:pointer}
#commandCoreOverlay .coreObjectiveToggle:focus-visible{outline:2px solid #c5dca5;outline-offset:-3px}
#commandCoreOverlay .coreObjectiveText{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
#commandCoreOverlay .coreObjectiveText strong{font-size:12px;line-height:1.3;display:block;flex:1}
#commandCoreOverlay .campaignStatus{font-size:10px;line-height:1.3;color:#9ab5ad;display:block;font-variant-numeric:tabular-nums;text-align:right;max-width:90px}
#commandCoreOverlay .coreObjectiveMark{width:18px;flex:0 0 18px;font-size:18px;color:#aec7b4}
#commandCoreOverlay .campaignObjective[data-state="done"]{border-color:#557b63;background:#20352f}
#commandCoreOverlay .campaignObjective[data-state="locked"]{background:#18272c;color:#9dadac}
#commandCoreOverlay .coreChevron{color:#9dadac;font-size:18px}
#commandCoreOverlay .coreObjectiveToggle[aria-expanded="true"] .coreChevron{transform:rotate(180deg)}
#commandCoreOverlay .coreObjectiveDetails{border-top:1px solid #ffffff10;padding:10px 12px 12px 39px}
#commandCoreOverlay .coreObjectiveDetails p{font-size:12px;color:#bbcdc5;margin:0}
#commandCoreOverlay .campaignNotice{font-size:12px;padding:10px 12px;border-left:3px solid #bbad78;background:#bbad7810;color:#d9cfae;margin:10px 0}
#commandCoreOverlay #campaignAdvance{width:100%;margin:12px 0 0;min-height:44px;font-size:13px}
#commandCoreOverlay .campaignBaseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#commandCoreOverlay .coreSystem{padding:12px;border:1px solid #395153;border-radius:9px;background:#192b2f;min-width:0}
#commandCoreOverlay .coreSystem h5{font-size:12px;font-weight:400;color:#acbfb9;margin:0 0 7px}
#commandCoreOverlay .coreSystem strong{display:block;font-size:14px;line-height:1.4;color:#e1ecd7;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#commandCoreOverlay .coreSystem p{font-size:11px;color:#9bb1ad;margin:6px 0 0}
#commandCoreOverlay .coreChapterStrip{display:flex;gap:8px;margin:0 0 12px;overflow-x:auto;flex-wrap:nowrap}
#commandCoreOverlay .coreChapterSelect{flex:1;min-width:120px;min-height:54px;padding:8px 10px;text-align:left;color:#b0c7bd;background:#192e33;border:1px solid #405c5b;border-radius:8px}
#commandCoreOverlay .coreChapterSelect small{display:block;font-size:9px;letter-spacing:.08em;margin-bottom:5px}#commandCoreOverlay .coreChapterSelect strong{font-size:11px}
#commandCoreOverlay .coreChapterSelect.selected{border-color:#a4bd94;background:#30493e;color:#edf0d9}#commandCoreOverlay .coreChapterSelect:disabled{opacity:.45}#commandCoreOverlay .coreChapterSelect[data-state="locked"] small:after{content:' · 🔒'}#commandCoreOverlay .coreChapterSelect[data-state="done"] small:after{content:' · ✓'}
#commandCoreOverlay .coreChapterHero .coreMainGoal{color:#dbe6ce;margin-top:12px;font-size:12px;border-left:2px solid #a0b783;padding-left:10px}
#commandCoreOverlay .coreProgressTrack{height:4px;background:#091a21;border-radius:2px;margin-top:8px;overflow:hidden}#commandCoreOverlay .coreProgressFill{height:100%;background:#a3bf88}
body #v010Trackers{overflow:visible;max-height:none;top:calc(var(--v011-game-top,10px) + 108px)}
#campaignTracker{position:relative;pointer-events:auto;color:#e4e9dc;text-align:left;height:34px;width:224px;max-width:calc(100vw - 150px);font-size:11px}
#campaignTracker[hidden],#campaignTracker [hidden]{display:none!important}
#campaignTracker .trackerChip{height:34px;width:100%;display:flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid #82948055;border-radius:7px;background:#102127bb;color:#dbe6d2;text-align:left;font:inherit;touch-action:manipulation}
#campaignTracker .trackerChip b{flex:1;font-weight:500}#campaignTracker .trackerMark{font-size:16px;width:16px;color:#bdd5a5}
#campaignTracker .trackerPanel{position:absolute;top:40px;left:0;width:224px;max-width:calc(100vw - 150px);height:192px;display:flex;flex-direction:column;box-sizing:border-box;padding:8px;border:1px solid #72866d66;border-radius:8px;background:#102127ee;box-shadow:0 6px 20px #0005}
#campaignTracker .trackerItems{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
#campaignTracker .trackerInstruction{font-size:11px;line-height:1.5;color:#c1d1c8;margin:5px 2px 10px;overflow-wrap:anywhere}
#campaignTracker .trackerObjective{display:flex;gap:8px;padding:7px 2px;border-bottom:1px solid #ffffff10;font-size:11px;line-height:1.3}#campaignTracker .trackerObjective span{flex:1}#campaignTracker .trackerObjective small{color:#afc49d;font-size:9px;max-width:65px;text-align:right;font-variant-numeric:tabular-nums}
#campaignTracker .trackerOpen{height:32px;flex:0 0 32px;border:0;background:#ffffff08;color:#c9dabc;font:inherit;margin-top:5px;border-radius:5px}
#campaignTracker .trackerFeedback{position:absolute;top:0;left:calc(100% + 7px);width:150px;min-height:34px;box-sizing:border-box;padding:6px 8px;border:1px solid #a7d58d88;border-radius:7px;background:#284636ed;font-size:11px;line-height:1.3;pointer-events:none;animation:objectiveConfirm .25s ease-out}
#campaignTracker.completed .trackerChip{border-color:#bddda8;background:#294934e8}@keyframes objectiveConfirm{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
body.v0161Modal #campaignTracker,body:has(.overlay.open) #campaignTracker{display:none!important}
@media(max-width:480px){#commandCoreOverlay .v09Panel{padding:12px}#commandCoreOverlay .v09Title{font-size:17px}#commandCoreOverlay .campaignBaseGrid{grid-template-columns:1fr}#commandCoreOverlay .coreChapterHero{padding:12px}}
@media(max-width:480px){#campaignTracker{width:150px}#campaignTracker .trackerPanel{width:205px;max-width:calc(100vw - 120px)}#campaignTracker .trackerFeedback{width:130px}#commandCoreOverlay .coreChapterHero{padding:11px}#commandCoreOverlay h3{font-size:19px}}
@media(prefers-reduced-motion:reduce){#campaignTracker .trackerFeedback{animation:none}}
@media(max-height:500px){#commandCoreOverlay .v09Panel{padding:10px}#commandCoreOverlay .v09Header{height:38px;flex-basis:38px}#commandCoreOverlay .campaignTabs{flex-basis:44px}#commandCoreOverlay .campaignLinks{flex-basis:40px}}
`);
  select('base');renderTracker();return Object.freeze({show,tick,reset,syncLocation,registerSection,refreshTracker:renderTracker});
})();
