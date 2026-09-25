/* One responsive Core client. Navigation is session-only; all progression
   actions still cross the existing actor/request/revision authority. */
window.GameResearchUI=(()=>{
  const d=GameResearch.definitions,t=(k,p)=>I18n.t(k,p),number=n=>I18n.number(n);
  const validPage=p=>['sources','blueprints'].includes(p)||p.startsWith('category:')&&d.categories.includes(p.slice(9))||p.startsWith('project:')&&d.research.some(r=>r.id===p.slice(8))||p.startsWith('blueprint:')&&d.blueprints.some(b=>b.id===p.slice(10));
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,fn)=>{const b=node('button',text,'researchButton');b.type='button';b.onclick=fn;return b;};
  let renders=0,updates=0;
  CommandCoreUI.registerSection('research','research.title',(scroll,route)=>{
    let signature='';
    // Keep the same toolbar nodes across mutations so focus and touch targets do
    // not disappear under a finger after a successful obtain/submit/research.
    const toolbar=node('div',null,'researchToolbar'),balance=node('strong',null,'researchBalance'),nav=node('nav',null,'researchNavigation'),content=node('div',null,'researchContent');
    balance.setAttribute('role','status');balance.setAttribute('aria-live','polite');toolbar.append(balance,nav);scroll.append(toolbar,content);
    const links=[[null,'research.projects'],['sources','research.sources'],['blueprints','research.blueprints']].map(([page,key])=>{const b=button('',()=>goto(page));b.dataset.researchPage=page||'projects';nav.append(b);return {page,key,b};});
    function run(action,payload,revision){const r=GameResearch.request(action,payload,revision);const key=r.ok?'research.success.'+action:r.reason?.startsWith('research.')||r.reason?.startsWith('campaign.')?r.reason:'research.error.'+r.reason;message(t(key));signature='';update();CommandCoreUI.tick();}
    function goto(page){route.setPage(page);signature='';scroll.scrollTop=0;update();CommandCoreUI.tick();}
    function icon(spec){const img=node('span',null,'researchIcon');if(spec.kind==='buildable')img.append(GamePlacementUI.icon(spec.id));else img.innerHTML=itemIconHTML(spec.id);for(const art of img.querySelectorAll('img'))art.alt='';img.setAttribute('aria-hidden','true');return img;}
    function requirements(project,state,facts){
      const detail=node('details',null,'researchRequirements');detail.append(node('summary',t('research.requirements')));
      const list=node('ul');
      const line=(ok,text)=>{const li=node('li',(ok?'✓ ':'○ ')+text);li.dataset.met=String(ok);list.append(li);};
      line(state.data>=project.cost,t('research.cost',{have:number(state.data),cost:number(project.cost)}));
      for(const id of project.blueprints){const bp=d.blueprints.find(b=>b.id===id),li=node('li');li.append(node('span',(state.blueprints.includes(id)?'✓ ':'○ ')),button(t(bp.title),()=>goto('blueprint:'+id)));list.append(li);}
      line(GameConditions.evaluate(project.requires,facts).available,t(project.requirementLabel||'research.require.previous'));
      detail.append(list);return detail;
    }
    function renderSources(state,facts,access){
      content.append(node('h3',t('research.sources')),node('p',t('research.packetHint'),'coreHint'));
      for(const source of d.sources){
        const status=GameResearch.sourceAvailability(source.id,GameActors.localId,facts),row=node('section',null,'researchSource');row.dataset.researchSource=source.id;
        row.append(node('h4',t(source.title)),node('p',t(source.description),'coreHint'),node('strong','+ '+t('research.data',{count:number(source.data)}),'researchReward'));
        for(const id of source.blueprints)row.append(node('small',t(d.blueprints.find(b=>b.id===id).title)));
        const submitted=status.packet?.status==='submitted',held=status.packet?.status==='held'&&status.packet.actorId===GameActors.localId;
        const b=button(t(submitted?'research.submitted':held?'research.submit':'research.obtain'),()=>run(held?'submit':'obtain',{sourceId:source.id},state.commands.revision));b.dataset.researchAction=held?'submit':'obtain';b.disabled=!access.available||submitted||!status.available;row.append(b);
        if(!status.available&&!submitted)row.append(node('small',t(status.reason),'researchReason'));content.append(row);
      }
    }
    function renderBlueprints(state,selected){
      content.append(node('h3',t('research.blueprints')),node('p',t('research.blueprintHint'),'coreHint'));
      for(const bp of d.blueprints.filter(b=>!selected||b.id===selected)){
        const known=state.blueprints.includes(bp.id),row=node('section',null,'researchBlueprint');row.dataset.blueprint=bp.id;
        row.append(selected?node('h4',t(bp.title)):button(t(bp.title),()=>goto('blueprint:'+bp.id)),node('p',t(known?'research.blueprintKnown':'research.blueprintMissing'),'coreHint'));
        for(const source of d.sources.filter(s=>s.blueprints.includes(bp.id)))row.append(node('small',t('research.foundAt',{source:t(source.title)})));
        if(selected){for(const r of d.research.filter(r=>r.blueprints.includes(bp.id)))row.append(button(t(r.title),()=>goto('project:'+r.id)));if(!known)row.append(button(t('research.sources'),()=>goto('sources')));}
        content.append(row);
      }
    }
    function update(){
      updates++;const state=GameResearch.capture(),facts=GameResearch.facts(),access=GameCampaign.access(GameActors.local,BunkerLayout.core.id,true),page=route.page;
      const next=JSON.stringify([GameResearch.epoch,state.commands.revision,I18n.language,page,facts,access]);if(next===signature)return;signature=next;renders++;
      balance.textContent=t('research.data',{count:number(state.data)});nav.setAttribute('aria-label',t('research.navigation'));
      for(const {page:dest,key,b}of links){b.textContent=t(key);const active=dest===null?!page||page.startsWith('category:')||page.startsWith('project:'):dest==='blueprints'?page==='blueprints'||page?.startsWith('blueprint:'):page===dest;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
      const top=scroll.scrollTop;content.replaceChildren();
      if(!access.available)content.append(node('p',t(access.reason),'campaignNotice'));
      if(page==='sources')renderSources(state,facts,access);
      else if(page==='blueprints'||page?.startsWith('blueprint:'))renderBlueprints(state,page?.startsWith('blueprint:')?page.slice(10):null);
      else{
        const selected=page?.startsWith('project:')?page.slice(8):null,category=page?.startsWith('category:')?page.slice(9):null;
        if(!selected){
          const filter=node('label',null,'researchFilter'),select=node('select');select.setAttribute('aria-label',t('research.categories'));filter.append(node('span',t('research.categories')),select);
          for(const [id,label]of [['',t('research.all')],...d.categories.map(c=>[c,t('research.category.'+c)])]){const o=node('option',label);o.value=id;select.append(o);}select.value=category||'';select.onchange=()=>goto(select.value?'category:'+select.value:null);content.append(filter);
        }
        for(const r of d.research.filter(r=>selected?r.id===selected:!category||r.category===category)){
          const a=GameResearch.availability(r.id,facts),card=node('section',null,'researchProject');card.dataset.researchId=r.id;
          const title=node('div',null,'researchProjectTitle');title.append(icon(r.icon),node('h4',t(r.title)));card.append(title,node('p',t(r.effect),'researchEffect'));
          const status=node('small',t(a.completed?'research.completed':a.entitled?'research.legacyAvailable':a.available?'research.ready':'research.locked'),'researchState');card.append(status);
          if(!a.completed&&!a.entitled){
            const actions=node('div',null,'researchActions');actions.append(node('strong',t('research.price',{cost:number(r.cost)}),'researchPrice'));
            const b=button(t('research.study'),()=>run('research',{researchId:r.id},state.commands.revision));b.dataset.researchAction='research';b.disabled=!access.available||!a.available;b.setAttribute('aria-label',t('research.studyNamed',{name:t(r.title)}));actions.append(b);card.append(actions);
            if(!a.available)card.append(node('small',t(a.reason),'researchReason'));
          }else card.append(node('p',t('research.craftNext'),'coreHint'));
          if(selected){card.append(node('p',t(r.description),'researchDescription'),requirements(r,state,facts));}
          else{const more=button(t('research.details'),()=>goto('project:'+r.id));more.classList.add('researchDetailsButton');more.setAttribute('aria-label',t('research.detailsNamed',{name:t(r.title)}));card.append(more);}
          content.append(card);
        }
      }
      scroll.scrollTop=top;
    }
    return update;
  },()=>true,validPage);
  v09Style(`
  #coreSection_research .researchToolbar{position:sticky;top:-4px;z-index:2;background:#14292e;padding:7px 0 8px;border-bottom:1px solid #496258;margin-bottom:10px}
  #coreSection_research .researchBalance{display:block;font-size:13px;line-height:1.4;font-variant-numeric:tabular-nums;color:#d4dba5;margin-bottom:7px}
  #coreSection_research .researchNavigation{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
  #coreSection_research .researchButton{min-height:44px;min-width:0;border:1px solid #577363;border-radius:7px;padding:7px 10px;margin:0;background:#263c36;color:#e0eadb;font-size:13px;line-height:1.25;white-space:normal;overflow-wrap:anywhere;cursor:pointer;touch-action:manipulation}
  #coreSection_research .researchNavigation .researchButton{padding:5px;font-size:12px}
  #coreSection_research .researchButton:disabled{opacity:.5;cursor:default}#coreSection_research .researchButton:focus-visible,#coreSection_research summary:focus-visible{outline:2px solid #c6d7a4;outline-offset:2px}
  #coreSection_research .researchNavigation .selected{background:#405a43;border-color:#9dae82}
  #coreSection_research .researchFilter{display:flex;align-items:center;gap:8px;justify-content:space-between;margin:4px 0 10px;font-size:12px}
  #coreSection_research .researchFilter select{min-width:0;min-height:44px;max-width:64%;font-size:13px}
  #coreSection_research .researchProject,#coreSection_research .researchBlueprint,#coreSection_research .researchSource{border:1px solid #3d5758;background:#192c30;border-radius:9px;margin:8px 0;padding:12px;min-width:0}
  #coreSection_research h3{font-size:17px;margin:6px 0}#coreSection_research h4{font-size:14px;line-height:1.3;margin:0;color:#e8eddf}
  #coreSection_research .researchProjectTitle{display:flex;align-items:center;gap:9px;margin-bottom:6px}
  #coreSection_research .researchIcon{flex:0 0 30px;width:30px;height:30px;display:flex;align-items:center;justify-content:center}
  #coreSection_research .researchIcon img{max-width:30px!important;max-height:30px!important;object-fit:contain}
  #coreSection_research p.researchEffect{font-size:13px;color:#cadacb;margin:4px 0 7px;line-height:1.4}
  #coreSection_research small{display:block;font-size:12px;line-height:1.4;color:#acbfb5;overflow-wrap:anywhere}
  #coreSection_research .researchActions{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-top:8px}
  #coreSection_research .researchActions button{flex:0 0 auto}#coreSection_research .researchPrice{font-size:13px;font-variant-numeric:tabular-nums;color:#d5dfb4}
  #coreSection_research .researchReason{color:#dfc58e;margin-top:6px}#coreSection_research .researchDetailsButton{width:100%;margin-top:9px;min-height:36px;background:transparent;font-size:12px}
  #coreSection_research .researchSource>button,#coreSection_research .researchBlueprint>button{display:block;width:100%;margin-top:9px}
  #coreSection_research .researchReward{display:block;font-size:13px;margin:8px 0;color:#d5dfb4}
  #coreSection_research .researchDescription{font-size:13px;margin:12px 0;line-height:1.5}
  #coreSection_research .researchRequirements{border-top:1px solid #496052;margin-top:10px;font-size:12px}
  #coreSection_research summary{cursor:pointer;min-height:44px;display:list-item;line-height:1.4;padding:12px 0;box-sizing:border-box}
  #coreSection_research ul{list-style:none;padding:0;margin:0}#coreSection_research li{margin:7px 0;color:#b6cabd}#coreSection_research li button{display:inline;min-height:36px;font-size:12px}
  @media(max-height:500px){#coreSection_research .researchToolbar{position:static;display:flex;align-items:center;gap:8px;padding-top:3px;padding-bottom:5px;margin-bottom:6px}#coreSection_research .researchBalance{flex:0 1 35%;min-width:0;margin:0;font-size:12px}#coreSection_research .researchNavigation{flex:1;min-width:0}#coreSection_research .researchNavigation button{min-height:36px}}
  `);
  return Object.freeze({validPage,metrics:()=>({updates,renders})});
})();
