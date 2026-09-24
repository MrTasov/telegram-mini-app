/* A Core client. No independent modal, remote entry, progress owner or tree.
   The section's existing session route and fixed scroll area own all UI state. */
window.GameResearchUI=(()=>{
  const d=GameResearch.definitions,t=(k,p)=>I18n.t(k,p),number=n=>I18n.number(n);
  const validPage=p=>p==='blueprints'||p.startsWith('category:')&&d.categories.includes(p.slice(9))||p.startsWith('project:')&&d.research.some(r=>r.id===p.slice(8));
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,fn)=>{const b=node('button',text,'researchButton');b.type='button';b.onclick=fn;return b;};
  let renders=0,updates=0;
  CommandCoreUI.registerSection('research','research.title',(scroll,route)=>{
    let signature='',sourcesExpanded=null;
    function run(action,payload,revision){const r=GameResearch.request(action,payload,revision);message(r.ok?t(action==='research'?'research.success.research':action==='submit'?'research.success.submit':'research.success.obtain'):t(r.reason.startsWith('research.')||r.reason.startsWith('campaign.')?r.reason:'research.error.'+r.reason));signature='';update();}
    function goto(page){route.setPage(page);signature='';update();}
    function icon(spec){const img=node('span',null,'researchIcon');if(spec.kind==='buildable')img.append(GamePlacementUI.icon(spec.id));else img.innerHTML=itemIconHTML(spec.id);for(const art of img.querySelectorAll('img'))art.alt='';img.setAttribute('aria-hidden','true');return img;}
    function update(){
      updates++;const state=GameResearch.capture(),facts=GameResearch.facts(),access=GameCampaign.access(GameActors.local,BunkerLayout.core.id,true),page=route.page;
      const next=JSON.stringify([GameResearch.epoch,state.commands.revision,I18n.language,page,facts,access]);if(next===signature)return;signature=next;renders++;
      const top=scroll.scrollTop;scroll.replaceChildren();
      const head=node('div',null,'researchHeader');head.append(node('h3',t('research.title')),node('strong',t('research.data',{count:number(state.data)}),'researchBalance'));scroll.append(head,node('p',t('research.intro'),'coreHint'));
      if(!access.available)scroll.append(node('p',t(access.reason),'campaignNotice'));
      const sources=node('details',null,'researchSources');sources.open=sourcesExpanded??(!state.data&&!state.completed.length);sources.ontoggle=()=>{sourcesExpanded=sources.open;};sources.append(node('summary',t('research.sources')));scroll.append(sources);
      sources.append(node('p',t('research.packetHint'),'coreHint'));
      for(const source of d.sources){
        const status=GameResearch.sourceAvailability(source.id,GameActors.localId,facts),row=node('section',null,'researchSource');row.dataset.researchSource=source.id;
        row.append(node('strong',t(source.title)),node('p',t(source.description),'coreHint'),node('small',t('research.data',{count:number(source.data)})+(source.blueprints.length?' · '+source.blueprints.map(id=>t(d.blueprints.find(b=>b.id===id).title)).join(', '):'')));
        const submitted=status.packet?.status==='submitted',held=status.packet?.status==='held'&&status.packet.actorId===GameActors.localId;
        const b=button(t(submitted?'research.submitted':held?'research.submit':'research.obtain'),()=>run(held?'submit':'obtain',{sourceId:source.id},state.commands.revision));b.dataset.researchAction=held?'submit':'obtain';b.disabled=!access.available||submitted||!status.available;row.append(b);
        if(!status.available&&!submitted)row.append(node('small',t(status.reason),'researchReason'));sources.append(row);
      }
      const nav=node('nav',null,'researchCategories');nav.setAttribute('aria-label',t('research.categories'));
      for(const [id,label]of [[null,t('research.all')],...d.categories.map(c=>['category:'+c,t('research.category.'+c)]),['blueprints',t('research.blueprints')]]){const b=button(label,()=>goto(id));b.classList.toggle('selected',page===id);b.setAttribute('aria-pressed',String(page===id));nav.append(b);}scroll.append(nav);
      if(page==='blueprints'){
        scroll.append(node('p',t('research.blueprintHint'),'coreHint'));
        for(const bp of d.blueprints){const known=state.blueprints.includes(bp.id),row=node('section',null,'researchBlueprint');row.dataset.blueprint=bp.id;row.append(node('strong',(known?'✓ ':'○ ')+t(bp.title)),node('p',t(known?'research.blueprintKnown':'research.blueprintMissing'),'coreHint'));
          if(!known)for(const source of d.sources.filter(s=>s.blueprints.includes(bp.id)))row.append(node('small',t('research.foundAt',{source:t(source.title)})));scroll.append(row);}
      }else{
        const selected=page?.startsWith('project:')?page.slice(8):null,category=page?.startsWith('category:')?page.slice(9):null;
        if(selected)scroll.append(button(t('research.back'),()=>goto(null)));
        for(const r of d.research.filter(r=>selected?r.id===selected:!category||r.category===category)){
          const a=GameResearch.availability(r.id,facts),card=node('section',null,'researchProject');card.dataset.researchId=r.id;
          const title=button('',()=>goto(selected?null:'project:'+r.id));title.classList.add('researchProjectTitle');title.append(icon(r.icon),node('strong',t(r.title)),node('small',t(a.completed?'research.completed':a.entitled?'research.legacyAvailable':a.available?'research.ready':'research.locked')));title.setAttribute('aria-expanded',String(!!selected));card.append(title);
          const details=node('div',null,'researchDetails');details.append(node('p',t(r.effect),'coreHint'));
          if(selected){details.append(node('p',t(r.description)));for(const id of r.blueprints)details.append(node('p',(state.blueprints.includes(id)?'✓ ':'○ ')+t(d.blueprints.find(b=>b.id===id).title),'coreHint'));}
          if(!a.completed&&!a.entitled){details.append(node('small',t('research.cost',{have:number(state.data),cost:number(r.cost)})));if(!a.available)details.append(node('small',t(a.reason),'researchReason'));
            const b=button(t('research.study'),()=>run('research',{researchId:r.id},state.commands.revision));b.dataset.researchAction='research';b.disabled=!access.available||!a.available;details.append(b);
          }else details.append(node('small',t('research.craftNext')));
          card.append(details);scroll.append(card);
        }
      }
      scroll.append(node('p',t('research.legacyHint'),'coreHint'));scroll.scrollTop=top;
    }
    return update;
  },()=>true,validPage);
  v09Style(`
  #coreSection_research .researchHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
  #coreSection_research h3{font-size:18px;margin:5px 0}.researchBalance{font-size:12px;font-variant-numeric:tabular-nums;color:#d4dba5}
  #coreSection_research .researchSources{border:1px solid #425957;border-radius:8px;padding:8px 10px;margin:10px 0}
  #coreSection_research summary{font-size:12px;cursor:pointer;min-height:32px;line-height:32px}
  #coreSection_research .researchSource{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;padding:9px 0;border-top:1px solid #ffffff16}
  #coreSection_research .researchSource strong{font-size:12px}#coreSection_research .researchSource p{grid-column:1/-1;margin:0}
  #coreSection_research small{font-size:11px;line-height:1.4;display:block;color:#aabfb7;overflow-wrap:anywhere}
  #coreSection_research .researchButton{min-height:40px;border:1px solid #577363;border-radius:7px;padding:7px 10px;background:#263c36;color:#e0eadb;font-size:12px;line-height:1.25;cursor:pointer;touch-action:manipulation}
  #coreSection_research .researchButton:disabled{opacity:.55;cursor:default}#coreSection_research .researchButton:focus-visible{outline:2px solid #c6d7a4;outline-offset:2px}
  #coreSection_research .researchCategories{display:flex;gap:5px;overflow-x:auto;padding:5px 0 10px;touch-action:pan-x;flex-wrap:nowrap}
  #coreSection_research .researchCategories button{flex:0 0 auto}.researchCategories .selected{background:#45604a!important}
  #coreSection_research .researchProject,#coreSection_research .researchBlueprint{border:1px solid #3d5758;background:#192c30;border-radius:8px;margin:6px 0;overflow:hidden}
  #coreSection_research .researchProjectTitle{display:flex;align-items:center;width:100%;gap:8px;text-align:left;background:none;border:0;padding:8px;min-height:48px}
  #coreSection_research .researchProjectTitle strong{flex:1;min-width:0;font-size:12px}.researchProjectTitle small{max-width:90px;text-align:right}
  #coreSection_research .researchIcon{flex:0 0 34px;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
  #coreSection_research .researchIcon img{max-width:34px!important;max-height:34px!important;object-fit:contain}
  #coreSection_research .researchDetails,#coreSection_research .researchBlueprint{padding:8px 10px}
  #coreSection_research .researchDetails p{font-size:12px;margin:0 0 7px}#coreSection_research .researchDetails button{margin-top:7px;width:100%}
  #coreSection_research .researchReason{color:#d5bd8c;margin-top:4px}
  #commandCoreOverlay .campaignTabs{overflow-x:auto;overflow-y:hidden;white-space:nowrap}
  @media(max-width:520px){#commandCoreOverlay .campaignTabs button{flex:0 0 auto;min-width:72px;padding:6px 10px;font-size:12px}}
  `);
  return Object.freeze({validPage,metrics:()=>({updates,renders})});
})();
