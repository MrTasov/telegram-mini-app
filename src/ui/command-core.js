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
  const tracker=button(null,()=>show('chapters',true));tracker.id='campaignTracker';el('v010Trackers').append(tracker);
  const trackerTitle=node('b','campaign.tracker.title'),trackerText=node('span');tracker.append(trackerTitle,trackerText);
  const legacyLinks=[['campaign.research','research'],['campaign.achievements','achievements']].map(([key,legacy])=>{
    const b=button(key,()=>{closeOverlay(overlay);V010Progression.show(legacy);});links.append(b);return {b,key};
  });
  // Reserved routes describe the extension boundary, not visible placeholders.
  // Register a route only when its real owner and complete view are available.
  const routes=new Set(['chapters','base','research','blueprints','construction','archive','map-signals']);
  const sections=new Map();let tab='chapters',remote=false,sequence=0,dirty=true,lastTracker='',lastLanguage='';
  function registerSection(id,title,mount){
    if(!routes.has(id)||sections.has(id)||typeof mount!=='function')throw Error('Invalid Core section');
    const scroll=node('section',null,'coreScroll');scroll.id='coreSection_'+id;scroll.hidden=true;scroll.setAttribute('role','tabpanel');scroll.setAttribute('aria-labelledby','coreTab_'+id);
    const update=mount(scroll);if(typeof update!=='function')throw Error('Core section needs an update client');
    const b=button(title,()=>select(id));b.id='coreTab_'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',scroll.id);
    b.onkeydown=e=>{const ids=[...sections.keys()],i=ids.indexOf(id);let target;if(e.key==='ArrowRight')target=ids[(i+1)%ids.length];if(e.key==='ArrowLeft')target=ids[(i+ids.length-1)%ids.length];if(e.key==='Home')target=ids[0];if(e.key==='End')target=ids.at(-1);if(target){e.preventDefault();select(target);sections.get(target).b.focus();}};
    sections.set(id,{title,b,scroll,update});tabs.append(b);stage.append(scroll);return true;
  }
  function select(id){if(!sections.has(id))return false;tab=id;for(const [key,s]of sections){const active=key===tab;s.scroll.hidden=!active;s.b.classList.toggle('active',active);s.b.setAttribute('aria-selected',String(active));s.b.setAttribute('aria-pressed',String(active));s.b.tabIndex=active?0:-1;}dirty=true;render();return true;}
  function chapter(v=GameCampaign.view()){return GameCampaign.definitions.chapters.find(c=>c.id===v.chapter);}
  function status(){return GameCampaign.access(GameActors.local,BunkerLayout.core.id);}
  function renderTracker(){
    const v=GameCampaign.view(),c=chapter(v),next=c.objectives.find(o=>o.required&&v.objectives[o.id].active&&!v.objectives[o.id].done);
    const key=v.ready?'campaign.tracker.ready':next?next.title:c.title;
    const signature=[key,I18n.language].join('|');if(signature===lastTracker)return;lastTracker=signature;
    put(trackerTitle,t('campaign.tracker.title'));put(trackerText,t(key));tracker.setAttribute('aria-label',t('campaign.tracker.open'));
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
  registerSection('chapters','campaign.tab.chapters',scroll=>{
    let built='',cards=[],notice,heading,description,summary,advance,ready,completed;
    const expanded=new Set();
    return ({v,c,a,f})=>{
      const key=c.id+'|'+I18n.language;
      if(key!==built){
        const top=scroll.scrollTop||0;built=key;scroll.replaceChildren();cards=[];
        const hero=node('div',null,'coreChapterHero');hero.append(node('small','core.campaign','coreEyebrow'));
        heading=node('h3',c.title);description=node('p',c.description);summary=node('div',null,'coreChapterProgress');hero.append(heading,description,summary);scroll.append(hero);
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
      const req=c.objectives.filter(o=>o.required),done=req.filter(o=>v.objectives[o.id].done).length;
      put(summary,v.terminal?t('core.chapter.complete'):t('core.chapter.progress',{done:num(done),total:num(req.length)}));
      const notes=[];if(remote)notes.push(t('campaign.remote'));if(!a.available)notes.push(t(a.reason));notice.hidden=!notes.length;put(notice,notes.join(' '));
      for(const {o,card,mark,state}of cards){const s=v.objectives[o.id];card.dataset.state=s.done?'done':s.active?'active':'locked';put(mark,s.done?'✓':s.active?'○':'–');put(state,progress(o,s,f));}
      ready.hidden=!v.ready;put(ready,t('campaign.ready'));advance.hidden=v.terminal;advance.disabled=remote||!a.available||!v.ready;advance.dataset.revision=v.revision;advance.dataset.chapter=v.chapter;
      completed.hidden=!v.completed.length;put(completed,t('campaign.completed',{count:num(v.completed.length)}));
    };
  });
  registerSection('base','campaign.tab.base',scroll=>{
    const cards=new Map();let locale='';
    return ()=>{
      const groups=GameBaseOverview.snapshot();
      if(locale!==I18n.language){locale=I18n.language;const top=scroll.scrollTop||0;scroll.replaceChildren();cards.clear();
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
    for(const s of sections.values())put(s.b,t(s.title));for(const {b,key}of legacyLinks)put(b,t(key));
    const v=GameCampaign.view(),context={v,c:chapter(v),a:status(),f:GameCampaign.facts()};
    if(lastLanguage!==I18n.language){lastLanguage=I18n.language;for(const s of sections.values())s.update(context);}else sections.get(tab).update(context);
  }
  function show(which='chapters',readOnly=false){
    if(!GameState.session.ready||playerDead||window.MainMenu?.active)return false;
    if(!readOnly){const a=GameCampaign.access(GameActors.local,BunkerLayout.core.id,false);if(!a.available){message(t(a.reason));return false;}}
    remote=readOnly;GameCampaign.refresh(true);GameMovement.openUI();openOverlay(overlay);select(sections.has(which)?which:'chapters');return true;
  }
  function tick(){renderTracker();if(overlay.classList.contains('open'))render();}
  function reset(){closeOverlay(overlay);remote=false;dirty=true;lastTracker='';for(const s of sections.values())s.scroll.scrollTop=0;renderTracker();}
  GameCampaign.subscribe(()=>{dirty=true;renderTracker();});
  I18n.onChange(()=>{lastTracker='';dirty=true;V09Power.devices[GameCampaign.powerId].name=t('bunker.core.name');renderTracker();render();});
  v09Style(`
#commandCoreOverlay{position:fixed;inset:0;padding:0;overflow:hidden}
#commandCoreOverlay .v09Panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;width:min(720px,calc(100vw - 24px));height:min(760px,calc(100vh - 24px));height:min(760px,calc(100dvh - 24px));max-height:none;min-height:0;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;text-align:left}
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
#commandCoreOverlay .coreObjectiveToggle{display:flex;align-items:center;gap:10px;width:100%;min-height:54px;text-align:left;padding:9px 11px;background:none;border:0;color:#e4ece4;font:inherit;cursor:pointer}
#commandCoreOverlay .coreObjectiveToggle:focus-visible{outline:2px solid #c5dca5;outline-offset:-3px}
#commandCoreOverlay .coreObjectiveText{flex:1;min-width:0}
#commandCoreOverlay .coreObjectiveText strong{font-size:13px;line-height:1.3;display:block}
#commandCoreOverlay .campaignStatus{font-size:11px;line-height:1.35;color:#9ab5ad;display:block;font-variant-numeric:tabular-nums;margin-top:3px}
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
#campaignTracker{pointer-events:auto;color:#e4e9dc;text-align:left;padding:7px 10px;border:1px solid #64715c;border-radius:8px;background:rgba(14,25,30,.82);font-size:11px;min-height:44px;max-width:100%}
#campaignTracker b,#campaignTracker span{display:block}#campaignTracker span{margin-top:3px;color:#c9d6b4}
@media(max-width:480px){#commandCoreOverlay .v09Panel{padding:12px}#commandCoreOverlay .v09Title{font-size:17px}#commandCoreOverlay .campaignBaseGrid{grid-template-columns:1fr}#commandCoreOverlay .coreChapterHero{padding:12px}}
@media(max-height:500px){#commandCoreOverlay .v09Panel{height:calc(100dvh - 16px);padding:10px}#commandCoreOverlay .v09Header{height:38px;flex-basis:38px}#commandCoreOverlay .campaignTabs{flex-basis:44px}#commandCoreOverlay .campaignLinks{flex-basis:40px}}
`);
  select('chapters');renderTracker();return Object.freeze({show,tick,reset,registerSection});
})();
