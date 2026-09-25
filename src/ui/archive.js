/* One responsive Archive view, mounted in the accepted Core shell/history. */
window.GameArchiveUI=(()=>{
  const t=key=>I18n.t(key),entries=StoryDefinitions.entries;let builds=0;
  function node(tag,key,cls){const n=document.createElement(tag);if(key)n.textContent=t(key);if(cls)n.className=cls;return n;}
  function button(key,fn){const n=node('button',key,'menuButton');n.type='button';n.onclick=fn;return n;}
  CommandCoreUI.registerSection('archive','story.archive',(host,route)=>{
    let signature='';
    function open(id){const view=GameStory.view();if(!view.unlocked.includes(id))return;if(!view.read.includes(id)){const r=GameStory.request('read',{entryId:id});if(!r.ok){message(t(r.reason.startsWith('story.')||r.reason.startsWith('campaign.')?r.reason:'story.error.command'));return;}}route.setPage(id);render();}
    function render(){
      const view=GameStory.view(),key=[view.epoch,view.revision,route.page,I18n.language].join('|');if(key===signature)return;signature=key;builds++;
      const top=host.scrollTop||0;host.replaceChildren();const current=entries.find(e=>e.id===route.page&&view.unlocked.includes(e.id));
      if(current){
        const article=node('article',null,'archiveDocument');article.dataset.archiveEntry=current.id;article.append(node('small','story.category.'+current.category,'coreEyebrow'),node('h3',current.title));
        for(const key of current.body)article.append(node('p',key));
        const watched=view.watched.includes(current.id)||current.id===StoryDefinitions.introId&&view.intro==='completed';
        if(current.durationMs||['audio','video'].includes(current.media?.kind)){const play=button('story.replay',()=>{if(!StoryPlayer.open(current.id))message(t('story.error.access'));});play.dataset.archivePlay=current.id;article.append(play,node('small',watched?'story.watched':'story.unwatched','archiveReadState'));}
        if(current.media?.kind==='image'){
          const token=key;GameAssets.load(current.media.assetId).then(image=>{if(signature!==token)return;if(image&&GameAssets.ready(current.media.assetId)){const img=node('img');img.src=AssetManifest.images[current.media.assetId].path;img.alt=t(current.media.alt);article.append(img);}else article.append(node('p','story.fallback','coreHint'));});
        }
        host.append(article);host.scrollTop=top;return;
      }
      const header=node('div',null,'archiveHeading');header.append(node('h3','story.archive'),node('p','story.archive.description','coreHint'));const summary=node('p',null,'coreHint');summary.textContent=I18n.t('story.count',{count:I18n.number(view.unlocked.length),unread:I18n.number(view.unlocked.filter(id=>!view.read.includes(id)).length)});header.append(summary);host.append(header);
      const label=node('label','story.filter','archiveFilter'),select=node('select');select.setAttribute('aria-label',t('story.filter'));for(const id of ['all',...StoryDefinitions.categories]){const o=node('option','story.category.'+id);o.value=id;select.append(o);}select.value=route.page?.startsWith('category|')?route.page.split('|')[1]:'all';select.onchange=()=>{route.setPage(select.value==='all'?null:'category|'+select.value);render();};label.append(select);host.append(label);
      const visible=entries.filter(e=>view.unlocked.includes(e.id)&&(select.value==='all'||select.value===e.category));
      if(!visible.length)host.append(node('p','story.empty','coreHint'));
      for(const e of visible){const card=button(null,()=>open(e.id));card.className='archiveCard';card.dataset.archiveEntry=e.id;card.dataset.archiveOpen=e.id;card.setAttribute('aria-label',t('story.open')+': '+t(e.title));const title=node('span',e.title,'archiveCardTitle'),summary=node('span',e.summary,'archiveSummary'),read=node('small',view.read.includes(e.id)?'story.read':'story.unread','archiveReadState'),action=node('span','story.open','archiveOpenLabel');card.append(title,summary,read,action);host.append(card);}
      host.scrollTop=top;
    }
    return render;
  },()=>true,page=>page.startsWith('category|')?StoryDefinitions.categories.includes(page.split('|')[1]):GameStory.view().unlocked.includes(page));
  v09Style(`#coreSection_archive .archiveFilter{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 14px;font-size:12px}#coreSection_archive .archiveFilter select{flex:1;min-height:44px;min-width:130px}#coreSection_archive .archiveCard{display:block;width:100%;text-align:left;color:inherit;cursor:pointer;touch-action:manipulation;border:1px solid #45625b;border-radius:9px;padding:12px;margin:8px 0;background:#192e31}#coreSection_archive .archiveCardTitle{display:block;font-size:15px;margin:0 0 6px;color:#e5eddc}#coreSection_archive .archiveSummary{display:block;font-size:12px;color:#bbcec3;margin:0 0 8px}#coreSection_archive .archiveOpenLabel{display:block;width:100%;margin:8px 0 0;color:#e4edd6;font-size:12px}#coreSection_archive .archiveCard:focus-visible{outline:2px solid #a8c49b;outline-offset:2px}#coreSection_archive .archiveReadState{display:block;color:#b6c7ab;font-size:11px;margin:6px 0}#coreSection_archive .archiveDocument p{font-size:15px;line-height:1.65;white-space:pre-line;color:#d6e2d8}#coreSection_archive .archiveDocument img{max-width:100%;height:auto;border-radius:8px}#coreSection_archive .archiveDocument button{min-height:44px}`);
  return Object.freeze({inspect:()=>({builds})});
})();
