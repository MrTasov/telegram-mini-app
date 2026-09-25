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
  const stage=node('div',null,'coreSections'),links=node('div',null,'campaignLinks');const navigation=node('nav',null,'coreNavigation'),backButton=button('core.back',()=>back(),'coreBack'),pathLabel=node('span');navigation.setAttribute('aria-label',t('core.navigation'));backButton.id='coreBack';navigation.append(backButton,pathLabel);body.append(tabs,navigation,stage,links);
  const tracker=node('section');tracker.id='campaignTracker';el('v010Trackers').prepend(tracker);
  const trackerToggle=button(null,()=>{trackerExpanded=!trackerExpanded;renderTracker();},'trackerChip');trackerToggle.id='campaignTrackerToggle';
  const trackerMark=node('span',null,'trackerMark'),trackerTitle=node('b','campaign.tracker.title'),trackerChevron=node('span');trackerToggle.append(trackerMark,trackerTitle,trackerChevron);
  const trackerPanel=node('div',null,'trackerPanel');trackerPanel.id='campaignTrackerList';
  const trackerItems=node('div',null,'trackerItems'),trackerOpen=button('campaign.tracker.open',()=>showJournal(),'trackerOpen');trackerPanel.append(trackerItems,trackerOpen);
  const feedback=node('div',null,'trackerFeedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  tracker.append(trackerToggle,trackerPanel,feedback);trackerToggle.setAttribute('aria-controls',trackerPanel.id);
  // Session preference: scene/Core resets never change the tracker disclosure.
  let trackerExpanded=true,previousObjectives=null,feedbackUntil=0,viewEpoch=0;const celebrated=new Set(),objectiveExpanded=new Set();
  const legacyLinks=[['campaign.achievements','achievements']].map(([key,legacy])=>{
    const b=button(key,()=>{closeOverlay(overlay);V010Progression.show(legacy);});links.append(b);return {b,key};
  });
  // Reserved routes describe the extension boundary, not visible placeholders.
  // Register a route only when its real owner and complete view are available.
  const routeOrder=['construction','base','chapters','research','blueprints','archive','map-signals'],routes=new Set(routeOrder);
  const sections=new Map();let tab='base',sequence=0,dirty=true,lastTracker='',lastLanguage='';
  let scope=null;const sectionHistory=[];
  const location=()=>GameActors.local.scene==='bunker'&&(GameActors.local.entity.floor??1)===1?'bunker:1':null;
  function syncLocation(){const next=location();if(scope!==next){reset();scope=next;}return next;}
  function registerSection(id,title,mount,available=()=>true,validPage=()=>true){
    if(!routes.has(id)||sections.has(id)||typeof mount!=='function')throw Error('Invalid Core section');
    const scroll=node('section',null,'coreScroll');scroll.id='coreSection_'+id;scroll.hidden=true;scroll.setAttribute('role','tabpanel');scroll.setAttribute('aria-labelledby','coreTab_'+id);
    let page=null;const history=[];
    const legal=value=>value===null||typeof value==='string'&&value.length<=100&&validPage(value);
    const route=Object.freeze({
      get page(){if(!legal(page)){page=null;history.length=0;}return page;},
      setPage(value,options={}){if(!legal(value))return false;if(value!==page){if(!options.replace){history.push({page,top:scroll.scrollTop||0});if(history.length>32)history.shift();}page=value;scroll.scrollTop=0;}return true;},
      get canBack(){return history.some(entry=>legal(entry.page))||page!==null;},
      back(){while(history.length){const entry=history.pop();if(legal(entry.page)){page=entry.page;scroll.scrollTop=entry.top;return true;}}if(page!==null){page=null;scroll.scrollTop=0;return true;}return false;},
      reset(){page=null;history.length=0;}
    });
    const update=mount(scroll,route);if(typeof update!=='function')throw Error('Core section needs an update client');
    const b=button(title,()=>{sectionHistory.length=0;select(id);});b.id='coreTab_'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',scroll.id);
    b.onkeydown=e=>{const ids=[...sections.keys()].filter(key=>sections.get(key).available()),i=ids.indexOf(id);let target;if(e.key==='ArrowRight')target=ids[(i+1)%ids.length];if(e.key==='ArrowLeft')target=ids[(i+ids.length-1)%ids.length];if(e.key==='Home')target=ids[0];if(e.key==='End')target=ids.at(-1);if(target){e.preventDefault();select(target);sections.get(target).b.focus();}};
    sections.set(id,{title,b,scroll,update,available,route});for(const key of routeOrder)if(sections.has(key))tabs.append(sections.get(key).b);tabs.style.setProperty('--core-tab-columns',String([...sections.values()].filter(s=>s.available()).length));stage.append(scroll);return true;
  }
  function select(id){if(!sections.has(id)||!sections.get(id).available())return false;tab=id;for(const [key,s]of sections){const active=key===tab;s.scroll.hidden=!active;s.b.classList.toggle('active',active);s.b.setAttribute('aria-selected',String(active));s.b.setAttribute('aria-pressed',String(active));s.b.tabIndex=active?0:-1;}dirty=true;render();return true;}
  function navigate(id){if(!sections.get(id)?.available()||id===tab)return false;sectionHistory.push(tab);if(sectionHistory.length>16)sectionHistory.shift();return select(id);}
  function back(){const current=sections.get(tab);if(current?.route.back()){render();return true;}while(sectionHistory.length){const id=sectionHistory.pop();if(sections.get(id)?.available())return select(id);}return false;}
  function chapter(v=GameCampaign.view()){return GameCampaign.definitions.chapters.find(c=>c.id===v.chapter);}
  function status(){return GameCampaign.access(GameActors.local,BunkerLayout.core.id);}
  function renderTracker(){
    const v=GameCampaign.view(),c=chapter(v),visible=GameHUD.settings.objectives,now=performance.now();tracker.hidden=!visible;
    if(previousObjectives&&!GameSave.restoring)for(const o of c.objectives){if(v.objectives[o.id].done&&!previousObjectives[o.id]?.done&&!celebrated.has(o.id)){
      celebrated.add(o.id);if(visible){feedbackUntil=now+2300;put(feedback,'✓ '+t(o.title));}
    }}
    previousObjectives=v.objectives;
    feedback.hidden=!visible||now>=feedbackUntil;tracker.classList.toggle('completed',!feedback.hidden);
    const primary=c.objectives.find(o=>o.required&&v.objectives[o.id].active&&!v.objectives[o.id].done);
    put(trackerMark,feedback.hidden?'◎':'✓');put(trackerTitle,primary?t(primary.hud||primary.title):t(window.GameChapterOne?.active?'chapter1.tracker':'campaign.tracker.title'));put(trackerChevron,trackerExpanded?'⌃':'⌄');
    trackerPanel.hidden=!trackerExpanded;trackerToggle.setAttribute('aria-expanded',String(trackerExpanded));put(trackerOpen,t('campaign.tracker.open'));
    if(!visible||!trackerExpanded)return;
    const signature=[v.revision,JSON.stringify(GameCampaign.facts()),I18n.language].join('|');if(signature===lastTracker)return;lastTracker=signature;
    trackerItems.replaceChildren();const pending=c.objectives.filter(o=>v.objectives[o.id].active&&!v.objectives[o.id].done).sort((a,b)=>Number(b.required)-Number(a.required));
    for(const o of pending){const row=node('div',null,'trackerObjective');row.append(node('span',o.hud||o.title));const p=node('small');put(p,progress(o,v.objectives[o.id],GameCampaign.facts()));row.append(p);trackerItems.append(row);if(window.GameChapterOne?.active&&o===pending.find(x=>x.required))trackerItems.append(node('p',o.description,'trackerInstruction'));}
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
  function mountChapters(scroll,route,readOnly=false){
    let built='',cards=[],notice,heading,description,summary,advance,ready,completed,bar;const chapterButtons=new Map();
    const expanded=objectiveExpanded;
    return ({v,c,a,f})=>{
      c=GameCampaign.definitions.chapters.find(ch=>ch.id===route.page)||chapter(v);
      const key=c.id+'|'+v.chapter+'|'+I18n.language+'|'+viewEpoch;
      if(key!==built){
        const top=scroll.scrollTop||0;built=key;scroll.replaceChildren();cards=[];
        chapterButtons.clear();const strip=node('nav',null,'coreChapterStrip');strip.setAttribute('aria-label',t('campaign.tab.chapters'));
        GameCampaign.definitions.chapters.forEach((ch,i)=>{if(ch.id==='base_restored'&&ch.id!==v.chapter)return;const b=button(null,()=>{route.setPage(ch.id);scroll.scrollTop=0;if(readOnly)renderJournal();else render();},'coreChapterSelect');const label=node('small');put(label,ch.id==='base_restored'?t('core.chapter.complete'):t('core.chapter.number',{number:num(i+1)}));b.append(label,node('strong',ch.title));chapterButtons.set(ch.id,b);strip.append(b);});scroll.append(strip);
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
            const details=node('div',null,'coreObjectiveDetails');details.id=scroll.id+'_objective_'+o.id;details.hidden=!expanded.has(o.id);details.append(node('p',o.description));
            toggle.setAttribute('aria-expanded',String(!details.hidden));toggle.setAttribute('aria-controls',details.id);
            card.append(toggle,details);list.append(card);cards.push({o,card,mark,state});
          }
        }
        ready=node('p',null,'campaignNotice');scroll.append(ready);
        advance=button('campaign.advance',()=>{
          const revision=Number(advance.dataset.revision),chapterId=advance.dataset.chapter;
          const result=GameCampaign.execute({type:'ADVANCE_CHAPTER',actorId:GameActors.localId,targetId:BunkerLayout.core.id,chapterId,expectedRevision:revision,requestId:'core:'+revision+':'+(++sequence)});
          if(!result.ok)message(t(result.reason));dirty=true;render();renderTracker();
        });if(!readOnly){advance.id='campaignAdvance';scroll.append(advance);}
        completed=node('p',null,'coreHint');scroll.append(completed);scroll.scrollTop=top;
      }
      for(const [id,b]of chapterButtons){b.disabled=id!==v.chapter&&!v.completed.includes(id);b.classList.toggle('selected',id===c.id);b.setAttribute('aria-current',id===c.id?'page':'false');b.dataset.state=b.disabled?'locked':v.completed.includes(id)?'done':'current';}
      const done=c.objectives.filter(o=>v.objectives[o.id]?.done).length,past=v.completed.includes(c.id);
      put(summary,!c.objectives.length?t('core.chapter.complete'):t('core.chapter.progress',{done:num(done),total:num(c.objectives.length)}));bar.style.width=(c.objectives.length?done/c.objectives.length*100:100)+'%';
      const notes=[];if(readOnly)notes.push(t('campaign.remote'));if(!a.available)notes.push(t(a.reason));notice.hidden=!notes.length;put(notice,notes.join(' '));
      for(const {o,card,mark,state}of cards){const s=v.objectives[o.id];card.dataset.state=s.done?'done':s.active?'active':'locked';put(mark,s.done?'✓':s.active?'○':'–');put(state,progress(o,s,f));}
      ready.hidden=!v.ready||past;put(ready,t('campaign.ready'));advance.hidden=v.terminal||past;advance.disabled=readOnly||!a.available||!v.ready;advance.dataset.revision=v.revision;advance.dataset.chapter=v.chapter;
      completed.hidden=!v.completed.length;put(completed,t('campaign.completed',{count:num(v.completed.length)}));
    };
  }
  registerSection('chapters','campaign.tab.chapters',mountChapters,()=>true,id=>{const v=GameCampaign.view();return id===v.chapter||v.completed.includes(id);});
  const journal=v09Overlay('campaignJournalOverlay',t('campaign.tab.chapters')),journalBody=journal.querySelector('.v09Body'),journalScroll=node('section',null,'coreScroll');journalScroll.id='campaignJournalContent';const journalStage=node('div',null,'coreSections');journalStage.append(journalScroll);journalBody.append(journalStage);let journalPage=null;const journalRoute={get page(){const v=GameCampaign.view();return journalPage===v.chapter||v.completed.includes(journalPage)?journalPage:null;},setPage(v){journalPage=v;return true;}};const journalUpdate=mountChapters(journalScroll,journalRoute,true);
  function renderJournal(){if(!journal.classList.contains('open'))return;put(journal.querySelector('.v09Title'),t('campaign.tab.chapters'));const v=GameCampaign.view();journalUpdate({v,c:chapter(v),a:status(),f:GameCampaign.facts()});}
  function showJournal(){if(!GameState.session.ready||playerDead||window.MainMenu?.active)return false;closeOverlay(overlay);GameMovement.openUI();GameCampaign.refresh(true);openOverlay(journal);renderJournal();return true;}
  registerSection('base','campaign.tab.base',(container,route)=>{
    const views=node('nav',null,'coreBaseViews'),scroll=node('div'),control=node('div');const overview=button('control.overview',()=>{route.setPage('overview');render();}),controlButton=button('control.title',()=>{route.setPage('control|bunker:1|workshop');render();});const construction=button('placement.title',()=>navigate('construction'));views.append(overview,controlButton,construction);container.append(views,scroll,control);let controlUpdate=null;
    const cards=new Map();let locale='';
    const renderOverview=()=>{
      const groups=GameBaseOverview.snapshot();
      const shape=I18n.language+'|'+GameEquipment.ids.join();if(locale!==shape){locale=shape;const top=scroll.scrollTop||0;scroll.replaceChildren();cards.clear();
        const intro=node('div',null,'coreBaseIntro');intro.append(node('h3','core.base.title'),node('p','core.base.description'));scroll.append(intro);
        if(window.GamePlacement){
          const editor=node('div',null,'coreRoomEditor'),room=node('select'),preset=node('select'),custom=node('input'),result=node('small');
          room.setAttribute('aria-label',t('build.room'));preset.setAttribute('aria-label',t('build.roomPreset'));custom.setAttribute('aria-label',t('build.customName'));custom.maxLength=24;custom.placeholder=t('build.customName');
          for(const id of GamePlacement.zones){const o=node('option');o.value=id;o.textContent=GamePlacement.roomName(id);room.append(o);}
          for(const id of ['custom',...GamePlacement.roomPresets]){const o=node('option');o.value=id;o.textContent=t('build.room.'+id);preset.append(o);}
          preset.onchange=()=>{custom.hidden=preset.value!=='custom';};
          const save=button('build.rename',()=>{const r=GamePlacement.rename(room.value,{preset:preset.value==='custom'?null:preset.value,custom:preset.value==='custom'?custom.value.trim():''});result.textContent=t(r.ok?'build.renamed':'build.'+r.reason);if(r.ok)for(const o of room.children)o.textContent=GamePlacement.roomName(o.value);});
          editor.append(node('h4','build.roomNames'),room,preset,custom,save,result);scroll.append(editor);
        }
        for(const g of groups){const section=node('section',null,'coreBaseGroup');section.append(node('h4',null,'coreGroupTitle'));put(section.firstChild||section.children[0],g.title);const grid=node('div',null,'campaignBaseGrid');section.append(grid);scroll.append(section);
          for(const row of g.rows){const card=node('div',null,'coreSystem');card.dataset.system=row.id;const title=node('h5'),value=node('strong'),detail=node('p');card.append(title,value,detail);grid.append(card);cards.set(g.id+'/'+row.id,{title,value,detail});}
        }scroll.scrollTop=top;
      }
      for(const g of groups)for(const row of g.rows){const r=cards.get(g.id+'/'+row.id);put(r.title,row.title);put(r.value,row.value);put(r.detail,row.detail);}
    };
    return context=>{const showControl=route.page?.startsWith('control|');scroll.hidden=!!showControl;control.hidden=!showControl;put(overview,t('control.overview'));put(controlButton,t('control.title'));put(construction,t('placement.title'));overview.classList.toggle('selected',!showControl);controlButton.classList.toggle('selected',!!showControl);if(showControl){if(!controlUpdate&&window.GameBaseControlUI)controlUpdate=GameBaseControlUI.mount(control,route,()=>overlay.classList.contains('open')&&tab==='base'&&!control.hidden);controlUpdate?.();}else renderOverview(context);};
  },()=>true,page=>page==='overview'||page.startsWith('control|')&&!!window.GameBaseControl?.levels.some(l=>page.split('|')[1]===l.id&&l.zones.includes(page.split('|')[2])));
  function render(){
    if(!overlay.classList.contains('open'))return;dirty=false;
    put(overlay.querySelector('.v09Title'),t('bunker.core.name'));panel.setAttribute('aria-label',t('bunker.core.name'));tabs.setAttribute('aria-label',t('core.sections'));
    for(const s of sections.values()){put(s.b,t(s.title));s.b.hidden=!s.available();}for(const {b,key}of legacyLinks)put(b,t(key));
    const v=GameCampaign.view();
    if(!sections.get(tab)?.available()){const fallback=[...sections.keys()].find(id=>sections.get(id).available());if(fallback)select(fallback);}
    const context={v,c:chapter(v),a:status(),f:GameCampaign.facts()};
    if(lastLanguage!==I18n.language){lastLanguage=I18n.language;for(const s of sections.values())s.update(context);}else sections.get(tab).update(context);
    put(backButton,t('core.back'));backButton.disabled=!(sections.get(tab)?.route.canBack||sectionHistory.length);put(pathLabel,t(sections.get(tab).title));navigation.setAttribute('aria-label',t('core.navigation'));
  }
  function show(which,readOnly=false){
    if(readOnly)return showJournal();
    if(!GameState.session.ready||playerDead||window.MainMenu?.active)return false;
    if(!readOnly){const a=GameCampaign.access(GameActors.local,BunkerLayout.core.id,false);if(!a.available){message(t(a.reason));return false;}}
    syncLocation();window.GameChapterOne?.visit(GameActors.localId,BunkerLayout.core.id);GameCampaign.refresh(true);GameMovement.openUI();openOverlay(overlay);select(sections.has(which)?which:sections.get(tab)?.available()?tab:'base');return true;
  }
  function tick(){window.GameBaseControlUI?.tick();window.GamePlacementUI?.tick();syncLocation();renderTracker();renderJournal();if(overlay.classList.contains('open'))render();}
  function reset(){window.GamePlacementUI?.cancel();closeOverlay(overlay);closeOverlay(journal);journalPage=null;dirty=true;lastTracker='';tab='base';sectionHistory.length=0;previousObjectives=GameCampaign.view().objectives;feedbackUntil=0;celebrated.clear();objectiveExpanded.clear();viewEpoch++;for(const s of sections.values()){s.route.reset();s.scroll.scrollTop=0;}renderTracker();}
  GameCampaign.subscribe(()=>{dirty=true;renderTracker();});
  I18n.onChange(()=>{lastTracker='';dirty=true;V09Power.devices[GameCampaign.powerId].name=t('bunker.core.name');renderTracker();render();renderJournal();});
  v09Style(`
:is(#commandCoreOverlay,#campaignJournalOverlay){position:fixed;inset:0;padding:0;overflow:hidden;--core-top:max(28px,calc(var(--v011-game-top,10px) + 18px),calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px) + 12px));--core-bottom:calc(12px + max(env(safe-area-inset-bottom,0px),var(--v011-safe-bottom,0px)));--core-left:calc(12px + max(env(safe-area-inset-left,0px),var(--v011-safe-left,0px)));--core-right:calc(12px + max(env(safe-area-inset-right,0px),var(--v011-safe-right,0px)))}
:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Panel{position:absolute;left:calc(var(--core-left) + (100vw - var(--core-left) - var(--core-right))/2);top:calc(var(--core-top) + (100dvh - var(--core-top) - var(--core-bottom) - min(760px,100dvh - var(--core-top) - var(--core-bottom)))/2);transform:translateX(-50%);margin:0;width:min(720px,calc(100vw - var(--core-left) - var(--core-right)));height:min(760px,calc(100vh - var(--core-top) - var(--core-bottom)));height:min(760px,calc(100dvh - var(--core-top) - var(--core-bottom)));max-height:none;min-height:0;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;text-align:left;background:linear-gradient(145deg,#142b30,#101e26);border:1px solid #66827a66;border-radius:14px;box-shadow:0 20px 60px #0009}
:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Header{height:48px;flex:0 0 48px;box-sizing:border-box;padding:0 0 10px;margin:0}
:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Title{font-size:19px;line-height:1.2;margin:0}
:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
:is(#commandCoreOverlay,#campaignJournalOverlay) [hidden]{display:none!important}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignTabs{display:grid;grid-template-columns:repeat(var(--core-tab-columns,4),minmax(0,1fr));gap:4px;flex:0 0 48px;align-items:center;overflow:visible;white-space:normal}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignTabs button{flex:1;min-width:0;margin:0;height:44px;min-height:44px;padding:4px;font-size:12px;line-height:1.15;white-space:normal;overflow-wrap:anywhere}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignTabs .active{border-color:#95b7a2;background:#304b42;color:#eef4d9}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreSections{flex:1;min-height:0;position:relative;overflow:hidden}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreScroll{position:absolute;inset:0;box-sizing:border-box;overflow-x:hidden;overflow-y:scroll;overscroll-behavior:contain;scrollbar-gutter:stable;overflow-anchor:none;padding:4px 8px 16px 0;touch-action:pan-y}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignLinks{display:flex;gap:8px;align-items:center;flex:0 0 48px;border-top:1px solid #ffffff18}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignLinks button{flex:1;min-width:0;margin:0;padding:6px 8px;min-height:36px;font-size:12px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterHero{background:linear-gradient(130deg,#29403e,#172a30);border:1px solid #657b693d;border-radius:10px;padding:16px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreEyebrow{color:#b7c990;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
:is(#commandCoreOverlay,#campaignJournalOverlay) h3{font-size:21px;line-height:1.2;margin:7px 0 9px;color:#edf1df}
:is(#commandCoreOverlay,#campaignJournalOverlay) p{line-height:1.5;overflow-wrap:anywhere}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterHero p,:is(#commandCoreOverlay,#campaignJournalOverlay) .coreBaseIntro p{font-size:13px;color:#b1c4bf;margin:0}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterProgress{font-size:12px;font-variant-numeric:tabular-nums;color:#d3dfbb;margin-top:12px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreGroupTitle{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#b5c6bf;margin:18px 0 8px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreHint{font-size:11px;color:#9cb1ad;margin:5px 0 9px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveList{display:flex;flex-direction:column;gap:5px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignObjective{border:1px solid #3d5758;border-radius:8px;background:#192c30;overflow:hidden}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveToggle{display:flex;align-items:center;gap:8px;width:100%;min-height:43px;text-align:left;padding:7px 10px;background:none;border:0;color:#e4ece4;font:inherit;cursor:pointer}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveToggle:focus-visible{outline:2px solid #c5dca5;outline-offset:-3px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveText{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveText strong{font-size:12px;line-height:1.3;display:block;flex:1}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignStatus{font-size:10px;line-height:1.3;color:#9ab5ad;display:block;font-variant-numeric:tabular-nums;text-align:right;max-width:90px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveMark{width:18px;flex:0 0 18px;font-size:18px;color:#aec7b4}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignObjective[data-state="done"]{border-color:#557b63;background:#20352f}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignObjective[data-state="locked"]{background:#18272c;color:#9dadac}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChevron{color:#9dadac;font-size:18px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveToggle[aria-expanded="true"] .coreChevron{transform:rotate(180deg)}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveDetails{border-top:1px solid #ffffff10;padding:10px 12px 12px 39px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreObjectiveDetails p{font-size:12px;color:#bbcdc5;margin:0}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignNotice{font-size:12px;padding:10px 12px;border-left:3px solid #bbad78;background:#bbad7810;color:#d9cfae;margin:10px 0}
:is(#commandCoreOverlay,#campaignJournalOverlay) #campaignAdvance{width:100%;margin:12px 0 0;min-height:44px;font-size:13px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignBaseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreSystem{padding:12px;border:1px solid #395153;border-radius:9px;background:#192b2f;min-width:0}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreSystem h5{font-size:12px;font-weight:400;color:#acbfb9;margin:0 0 7px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreSystem strong{display:block;font-size:14px;line-height:1.4;color:#e1ecd7;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreSystem p{font-size:11px;color:#9bb1ad;margin:6px 0 0}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterStrip{display:flex;gap:8px;margin:0 0 12px;overflow-x:auto;flex-wrap:nowrap}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect{flex:1;min-width:120px;min-height:54px;padding:8px 10px;text-align:left;color:#b0c7bd;background:#192e33;border:1px solid #405c5b;border-radius:8px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect small{display:block;font-size:9px;letter-spacing:.08em;margin-bottom:5px}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect strong{font-size:11px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect.selected{border-color:#a4bd94;background:#30493e;color:#edf0d9}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect:disabled{opacity:.45}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect[data-state="locked"] small:after{content:' · 🔒'}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterSelect[data-state="done"] small:after{content:' · ✓'}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterHero .coreMainGoal{color:#dbe6ce;margin-top:12px;font-size:12px;border-left:2px solid #a0b783;padding-left:10px}
:is(#commandCoreOverlay,#campaignJournalOverlay) .coreProgressTrack{height:4px;background:#091a21;border-radius:2px;margin-top:8px;overflow:hidden}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreProgressFill{height:100%;background:#a3bf88}
body #v010Trackers{overflow:visible;max-height:none;top:calc(var(--v011-game-top,10px) + 24px)}
#campaignTracker{position:relative;pointer-events:auto;color:#e4e9dc;text-align:left;height:25px;width:150px;max-width:calc(100vw - 150px);font-size:11px}
#campaignTracker[hidden],#campaignTracker [hidden]{display:none!important}
#campaignTracker .trackerChip{height:25px;width:100%;display:flex;align-items:center;gap:5px;padding:3px 6px;border:1px solid #82948055;border-radius:7px;background:#10212766;color:#dbe6d2;text-align:left;font:inherit;touch-action:manipulation}
#campaignTracker .trackerChip b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;font-size:10px;text-shadow:0 1px 2px #000}#campaignTracker .trackerMark{font-size:16px;width:16px;color:#bdd5a5}
#campaignTracker .trackerPanel{position:absolute;top:29px;left:0;width:170px;max-width:calc(100vw - 150px);height:162px;display:flex;flex-direction:column;box-sizing:border-box;padding:6px;border:1px solid #72866d66;border-radius:8px;background:#10212766;box-shadow:0 6px 20px #0005}
#campaignTracker .trackerItems{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
#campaignTracker .trackerInstruction{font-size:10px;line-height:1.3;color:#f0f2df;margin:5px 2px 10px;overflow-wrap:anywhere}
#campaignTracker .trackerObjective{display:flex;gap:6px;padding:4px 2px;border-bottom:1px solid #ffffff10;font-size:11px;line-height:1.3}#campaignTracker .trackerObjective span{flex:1}#campaignTracker .trackerObjective small{color:#afc49d;font-size:9px;max-width:65px;text-align:right;font-variant-numeric:tabular-nums}
#campaignTracker .trackerOpen{height:32px;flex:0 0 32px;border:0;background:#ffffff08;color:#c9dabc;font:inherit;margin-top:5px;border-radius:5px}
#campaignTracker .trackerFeedback{position:absolute;top:0;left:calc(100% + 7px);width:150px;min-height:34px;box-sizing:border-box;padding:6px 8px;border:1px solid #a7d58d88;border-radius:7px;background:#284636ed;font-size:11px;line-height:1.3;pointer-events:none;animation:objectiveConfirm .25s ease-out}
#campaignTracker.completed .trackerChip{border-color:#bddda8;background:#294934e8}@keyframes objectiveConfirm{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
body.v0161Modal #campaignTracker,body:has(.overlay.open) #campaignTracker{display:none!important}
@media(max-width:480px){:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Panel{padding:12px}:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Title{font-size:17px}:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignBaseGrid{grid-template-columns:1fr}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterHero{padding:12px}}
@media(max-width:480px){#campaignTracker{width:140px}#campaignTracker .trackerPanel{width:170px;max-width:calc(100vw - 120px)}#campaignTracker .trackerFeedback{width:130px}:is(#commandCoreOverlay,#campaignJournalOverlay) .coreChapterHero{padding:11px}:is(#commandCoreOverlay,#campaignJournalOverlay) h3{font-size:19px}}
@media(prefers-reduced-motion:reduce){#campaignTracker .trackerFeedback{animation:none}}
@media(max-height:500px){:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Panel{padding:10px}:is(#commandCoreOverlay,#campaignJournalOverlay) .v09Header{height:38px;flex-basis:38px}:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignTabs{flex-basis:44px}:is(#commandCoreOverlay,#campaignJournalOverlay) .campaignLinks{flex-basis:40px}}
`);
  v09Style('.coreRoomEditor{display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #486254;border-radius:9px;padding:10px;margin:10px 0}.coreRoomEditor h4,.coreRoomEditor small{grid-column:1/-1;margin:0;font-size:12px}.coreRoomEditor select,.coreRoomEditor input{min-width:0;background:#193036;color:#e3ebdd;border:1px solid #597268;border-radius:5px;padding:8px}.coreRoomEditor button{margin:0!important;min-height:36px}.trackerPanel{color:#f0f2e6;text-shadow:0 1px 2px #000}');
  v09Style(`#commandCoreOverlay .coreNavigation{display:flex;align-items:center;gap:10px;flex:0 0 42px;min-height:42px;border-bottom:1px solid #ffffff18;margin-bottom:4px}#commandCoreOverlay .coreNavigation span{font-size:12px;color:#b7cabc}#commandCoreOverlay .coreBack{min-height:36px;min-width:84px;margin:0;padding:6px 10px;font:inherit;font-size:12px;border:1px solid #536d64;border-radius:6px;background:#233d36;color:#e4ebdf;touch-action:manipulation}#commandCoreOverlay .coreBack:disabled{opacity:.35}#commandCoreOverlay .coreBack:focus-visible{outline:2px solid #c5dca5}.coreBaseViews{flex-wrap:wrap}.coreBaseViews button{min-width:85px!important}@media(max-height:500px){#commandCoreOverlay .coreNavigation{flex-basis:38px;min-height:38px}#commandCoreOverlay .campaignLinks{flex-basis:36px}}`);
  // On a short viewport the Back action shares the header instead of taking
  // another content row. Only the redundant section label is hidden; every
  // navigation action stays available in the same component.
  v09Style(`@media(max-height:500px){#commandCoreOverlay .coreNavigation{position:absolute;top:10px;left:10px;min-height:36px;height:36px;margin:0;border:0;z-index:2}#commandCoreOverlay .coreNavigation span{display:none}#commandCoreOverlay .coreScroll{padding-bottom:8px}#commandCoreOverlay .v09Title{margin-left:94px;font-size:16px}#commandCoreOverlay .coreBack{min-width:84px}}`);
  v09Style('@media(max-width:360px){#commandCoreOverlay .campaignTabs{grid-template-columns:repeat(3,minmax(0,1fr));flex-basis:96px;align-content:start}}');
  select('base');renderTracker();return Object.freeze({show,showJournal,tick,reset,syncLocation,registerSection,navigate,back,refreshTracker:renderTracker});
})();
