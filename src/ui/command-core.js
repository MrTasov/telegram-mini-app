/* UI is a client of the campaign authority. The offline tracker stays readable;
   chapter transition can only be committed at the physical, powered Core. */
window.CommandCoreUI=(()=>{
  const overlay=v09Overlay('commandCoreOverlay',I18n.t('bunker.core.name'));
  const body=overlay.querySelector('.v09Body');
  const tracker=document.createElement('button');tracker.id='campaignTracker';tracker.type='button';tracker.onclick=()=>show('chapters',true);el('v010Trackers').append(tracker);
  let tab='chapters',remote=false,dirty=true,lastView='',lastBase='',sequence=0,shownRevision=0;
  const t=(key,params)=>I18n.t(key,params);
  function node(tag,key,cls){const n=document.createElement(tag);if(cls)n.className=cls;if(key)n.textContent=t(key);return n;}
  function button(key,fn,disabled=false){const b=node('button',key,'menuButton');b.type='button';b.disabled=disabled;b.onclick=fn;return b;}
  function text(parent,key,cls='v09Muted',params){const p=node('p',null,cls);p.textContent=t(key,params);parent.append(p);return p;}
  function chapter(){return GameCampaign.definitions.chapters.find(c=>c.id===GameCampaign.view().chapter);}
  function status(){return GameCampaign.access(GameActors.local,BunkerLayout.core.id);}
  function renderTracker(){
    const v=GameCampaign.view(),c=chapter();const next=c.objectives.find(o=>v.objectives[o.id].active&&!v.objectives[o.id].done);
    const key=v.ready?'campaign.tracker.ready':next?next.title:c.title;
    const summary=[v.chapter,v.ready,key,I18n.language].join('|');if(summary===lastView)return;lastView=summary;
    tracker.replaceChildren(node('b','campaign.tracker.title'),node('span',key));tracker.setAttribute('aria-label',t('campaign.tracker.open'));
  }
  function render(){
    if(!overlay.classList.contains('open'))return;
    dirty=false;const v=GameCampaign.view(),c=chapter(),a=status();shownRevision=v.revision;
    overlay.querySelector('.v09Title').textContent=t('bunker.core.name');body.replaceChildren();
    const tabs=node('div',null,'campaignTabs');
    for(const [id,key]of [['chapters','campaign.tab.chapters'],['base','campaign.tab.base']]){const b=button(key,()=>{tab=id;dirty=true;render();});b.classList.toggle('active',tab===id);b.setAttribute('aria-pressed',String(tab===id));tabs.append(b);}body.append(tabs);
    if(remote)text(body,'campaign.remote');
    if(!a.available)text(body,a.reason,'campaignNotice');
    if(tab==='chapters'){
      body.append(node('h3',c.title));text(body,c.description);
      for(const o of c.objectives){const state=v.objectives[o.id],card=node('section',null,'v09Card campaignObjective');card.dataset.objective=o.id;card.dataset.state=state.done?'done':state.active?'active':'locked';
        card.append(node('strong',o.title));text(card,o.description);
        text(card,state.done?'campaign.status.done':state.active?'campaign.status.active':'campaign.status.locked','campaignStatus');
        text(card,'campaign.semantics.'+o.semantics,'campaignSemantics');body.append(card);
      }
      if(v.ready)text(body,'campaign.ready','campaignNotice');
      if(!v.terminal){const advance=button('campaign.advance',()=>{
        const result=GameCampaign.execute({type:'ADVANCE_CHAPTER',actorId:GameActors.localId,targetId:BunkerLayout.core.id,chapterId:v.chapter,expectedRevision:shownRevision,requestId:'core:'+GameCampaign.capture().revision+':'+(++sequence)});
        if(!result.ok)message(t(result.reason));dirty=true;render();renderTracker();
      },remote||!a.available||!v.ready);advance.id='campaignAdvance';body.append(advance);}
      if(v.completed.length)text(body,'campaign.completed','v09Muted',{count:v.completed.length});
    }else{
      const b=GameCampaign.baseSummary(),grid=node('div',null,'campaignBaseGrid');
      for(const [key,value]of [['campaign.base.generator',t(b.running?'campaign.on':'campaign.off')],['campaign.base.fuel',I18n.numeric(b.fuel,{maximumFractionDigits:1})],['campaign.base.battery',I18n.numeric(b.battery,{maximumFractionDigits:2})+' / '+b.capacity+' '+t('campaign.kwh')],['campaign.base.load',I18n.numeric(b.load,{maximumFractionDigits:2})+' / '+I18n.numeric(b.supply,{maximumFractionDigits:2})+' '+t('campaign.kw')],['bunker.core.name',t(b.corePowered?'campaign.on':'campaign.off')]]){const card=node('div',null,'v09Card');card.append(node('small',key));const val=node('strong');val.textContent=value;card.append(val);grid.append(card);}body.append(grid);
      text(body,'campaign.base.coreDemand');
    }
    const links=node('div',null,'campaignLinks');
    for(const [key,legacy]of [['campaign.research','research'],['campaign.achievements','achievements']])links.append(button(key,()=>{closeOverlay(overlay);V010Progression.show(legacy);}));body.append(links);
  }
  function show(which='chapters',readOnly=false){
    if(!GameState.session.ready||playerDead||window.MainMenu?.active)return false;
    if(!readOnly){const a=GameCampaign.access(GameActors.local,BunkerLayout.core.id,false);if(!a.available){message(t(a.reason));return false;}}
    remote=readOnly;tab=which==='base'?'base':'chapters';GameCampaign.refresh(true);GameMovement.openUI();openOverlay(overlay);dirty=true;render();return true;
  }
  function tick(){renderTracker();if(!overlay.classList.contains('open'))return;const b=GameCampaign.baseSummary();const s=JSON.stringify([GameCampaign.view().revision,status().reason,Math.floor(b.fuel*10),Math.floor(b.battery*100),b.corePowered,b.load,b.supply]);if(s!==lastBase){lastBase=s;dirty=true;}if(dirty)render();}
  function reset(){closeOverlay(overlay);remote=false;dirty=true;lastView='';lastBase='';renderTracker();}
  GameCampaign.subscribe(()=>{dirty=true;renderTracker();});
  I18n.onChange(()=>{lastView='';dirty=true;V09Power.devices[GameCampaign.powerId].name=t('bunker.core.name');renderTracker();render();});
  v09Style('#commandCoreOverlay .v09Panel{width:min(650px,96vw);max-height:90dvh;display:flex;flex-direction:column;box-sizing:border-box}#commandCoreOverlay .v09Body{overflow:auto;min-height:0;overscroll-behavior:contain}.campaignTabs,.campaignLinks{display:flex;gap:8px}.campaignTabs button,.campaignLinks button{flex:1;min-width:0}.campaignTabs .active{border-color:#b5c592;background:#3b5141}.campaignNotice{padding:10px;border-left:3px solid #c5b279;background:#c5b27912;color:#e0d4b2}.campaignObjective strong{font-size:14px}.campaignObjective p{margin:6px 0}.campaignObjective[data-state="done"]{border-color:#729b73}.campaignObjective[data-state="locked"]{opacity:.65}.campaignStatus{color:#c9d8b5}.campaignSemantics{font-size:11px;color:#8ba3a4}.campaignBaseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.campaignBaseGrid .v09Card{margin:4px 0}.campaignBaseGrid strong{display:block;margin-top:5px}#campaignTracker{pointer-events:auto;color:#e4e9dc;text-align:left;padding:7px 10px;border:1px solid #64715c;border-radius:8px;background:rgba(14,25,30,.82);font-size:11px;min-height:44px;max-width:100%}#campaignTracker b,#campaignTracker span{display:block}#campaignTracker span{margin-top:3px;color:#c9d6b4}@media(max-height:500px){#commandCoreOverlay .v09Panel{max-height:94dvh}.campaignObjective{padding:8px}}');
  renderTracker();return Object.freeze({show,tick,reset});
})();
