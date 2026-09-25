/* One sector journal mounted in Core and in the existing map. Selection,
   map projection and Back are presentation state, never unlock conditions. */
window.GameExplorationUI=(()=>{
  const game=GameExploration,t=(key,p)=>I18n.t(key,p),map=el('v010MapOverlay'),panel=map.querySelector('.v010MapPanel'),head=map.querySelector('.v012MapActions');
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn,cls='explorationButton')=>{const b=node('button',text,cls);b.type='button';b.onclick=fn;return b;};
  let page=null,renders=0,drawerOpen=false;
  const drawer=node('section',null,'explorationDrawer'),bar=node('nav',null,'explorationNav'),back=button('',()=>{page=null;refresh(true);}),toMap=button('',()=>setDrawer(false)),body=node('div',null,'explorationScroll');drawer.id='explorationDrawer';bar.append(back,toMap);drawer.append(bar,body);panel.append(drawer);
  const toggle=button('',()=>setDrawer(!drawerOpen),'menuButton');toggle.id='explorationMapSectors';toggle.setAttribute('aria-controls',drawer.id);head.prepend(toggle);
  const home=button('',()=>mark(ExplorationDefinitions.home),'menuButton');home.id='explorationMapHome';head.prepend(home);
  function setDrawer(open){drawerOpen=!!open;drawer.hidden=!drawerOpen;toggle.setAttribute('aria-expanded',String(drawerOpen));if(open){V012Map.setOptions(false);refresh(true);back.focus();}else V010Camera.drawFull();}
  function mark(p){V010Camera.setGoal({...p,scene:'surface'});if(V010Camera.mapScene!=='surface')V010Camera.showMap('surface');V010Camera.setSelected(p);V010Camera.setView({...p,zoom:2});setDrawer(false);message(t('exploration.marked'));}
  function showSite(id){const s=game.sites.find(s=>s.id===id);if(!s||!game.siteHint(id))return false;V010Camera.showMap('surface');mark(s.approach);return true;}
  function validPage(id){return game.sectors.some(s=>s.id===id&&game.known(id));}
  function distance(p){const from=scene==='surface'?player:ExplorationDefinitions.home,dx=p.x-from.x,dy=p.y-from.y,dirs=['east','southeast','south','southwest','west','northwest','north','northeast'],index=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;return t('exploration.direction',{direction:t('exploration.direction.'+dirs[index]),distance:I18n.number(Math.round(Math.hypot(dx,dy))) });}
  function render(host,selected,goto){
    const known=game.sectors.filter(s=>game.known(s.id)),sector=selected?known.find(s=>s.id===selected):null;
    host.replaceChildren();renders++;host.append(node('h3',t(sector?.title||'exploration.title')),node('p',t('exploration.description'),'coreHint'));
    const navigation=node('div',null,'explorationActions');navigation.append(button(t('exploration.home'),()=>{V010Camera.showMap('surface');mark(ExplorationDefinitions.home);}),button(t('exploration.map'),()=>{V010Camera.showMap('surface');setDrawer(false);}));host.append(navigation);
    if(!sector){host.append(node('p',t('exploration.progress',{known:I18n.number(known.length),visited:I18n.number(game.sectors.filter(s=>game.visited(s.id)).length)}),'coreHint'));
      for(const s of known){const b=button('',()=>goto(s.id),'explorationCard');b.dataset.sector=s.id;b.append(node('strong',t(s.title)),node('span',t(game.visited(s.id)?'exploration.visited':'exploration.known')),node('small',t(game.allowed(s.id)?'exploration.access.open':'exploration.access.locked')));host.append(b);}
      host.append(node('p',t('exploration.unknownHint'),'coreHint'));
    }else{
      host.append(node('p',t(game.allowed(sector.id)?'exploration.access.open':'exploration.locked'),'explorationStatus'),node('p',distance(sector.entry),'coreHint'));
      const b=button(t('exploration.show'),()=>{V010Camera.showMap('surface');mark(sector.entry);});b.dataset.sectorLocate=sector.id;host.append(b);
      if(sector.id==='sector.river')host.append(node('p',t('exploration.riverHint'),'coreHint'));
    }
    const visible=game.sites.filter(s=>game.siteHint(s.id)&&(!sector||s.sectorId===sector.id));
    if(visible.length)host.append(node('h4',t('exploration.sites')));
    for(const site of visible){const card=node('section',null,'explorationSite');card.dataset.explorationSite=site.id;card.append(node('strong',t(site.title)),node('p',t(site.description),'coreHint'),node('small',distance(site.approach)));
      if(game.claimed(site.id))card.append(node('p',t('exploration.collected'),'explorationStatus'),node('small',t('exploration.submitHint')));
      else card.append(node('p',t(game.siteKnown(site.id)?'exploration.found':'exploration.lead'),'explorationStatus'));
      const b=button(t('exploration.show'),()=>showSite(site.id));b.dataset.siteLocate=site.id;card.append(b);host.append(card);
    }
  }
  let signature='';
  function refresh(force=false){toggle.textContent=t('exploration.sectors');toggle.setAttribute('aria-label',t('exploration.sectors'));home.textContent=t('exploration.home');back.textContent=t('core.back');back.disabled=!page;toMap.textContent=t('exploration.map');bar.setAttribute('aria-label',t('exploration.navigation'));drawer.setAttribute('aria-label',t('exploration.title'));
    if(!drawerOpen)return;if(page&&!validPage(page))page=null;const key=[game.epoch,GameResearch.epoch,I18n.language,page].join('|');if(!force&&key===signature)return;signature=key;const top=body.scrollTop;render(body,page,id=>{page=id;body.scrollTop=0;refresh(true);});body.scrollTop=top;
  }
  function drawMap(c,scale,mini){
    // Sector geometry remains authoritative for exploration; the player map
    // shows destinations and POIs, without technical sector borders or labels.
    c.save();const origin=ExplorationDefinitions.home;c.fillStyle='#9ed5a4';c.strokeStyle='#102f27';c.lineWidth=1/scale;c.beginPath();c.rect(origin.x-4/scale,origin.y-4/scale,8/scale,8/scale);c.fill();c.stroke();
    for(const s of game.sites){if(!game.siteHint(s.id)||game.claimed(s.id)||mini&&!game.siteKnown(s.id))continue;const p=game.siteKnown(s.id)?s:s.approach,r=(mini?3:4)/scale;c.fillStyle=game.siteKnown(s.id)?'#b0e5d5':'#d6ba83';c.beginPath();c.moveTo(p.x,p.y-r);c.lineTo(p.x+r,p.y);c.lineTo(p.x,p.y+r);c.lineTo(p.x-r,p.y);c.closePath();c.fill();c.stroke();}c.restore();
  }
  CommandCoreUI.registerSection('map-signals','exploration.map',(host,route)=>{let key='';return ()=>{const next=[game.epoch,GameResearch.epoch,route.page,I18n.language].join('|');if(next===key)return;key=next;const top=host.scrollTop;render(host,route.page,id=>{route.setPage(id);key='';CommandCoreUI.tick();});host.scrollTop=top;};},()=>true,validPage);
  I18n.onChange(()=>refresh(true));game.subscribe(()=>refresh());GameResearch.subscribe(()=>refresh());
  const oldShow=V010Camera.showMap;V010Camera.showMap=function(...args){page=null;setDrawer(false);const out=oldShow(...args);refresh();return out;};
  el('v010MapClose').addEventListener('click',()=>setDrawer(false));
  v09Style(`.explorationActions{display:flex;gap:8px;flex-wrap:wrap}.explorationButton{min-height:44px;padding:9px 12px;margin:6px 0;border:1px solid #59766b;border-radius:7px;background:#29463d;color:#e4eee0;font:inherit;font-size:12px;touch-action:manipulation}.explorationCard{display:block;width:100%;padding:12px;margin:8px 0;text-align:left;border:1px solid #506b60;border-radius:9px;background:#1d3330;color:#e1ecd9;font:inherit;touch-action:manipulation}.explorationCard strong,.explorationCard span,.explorationCard small{display:block;line-height:1.5}.explorationCard span,.explorationCard small{font-size:12px;color:#b9cbbb}.explorationSite{border:1px solid #486d66;border-radius:8px;padding:12px;margin:10px 0;background:#183431}.explorationSite strong{font-size:14px}.explorationSite small{font-size:12px;color:#b5c9bc}.explorationStatus{font-size:12px;color:#cce7a9}.explorationButton:focus-visible,.explorationCard:focus-visible{outline:2px solid #d6e6ac;outline-offset:2px}#v010MapOverlay .explorationDrawer{position:absolute;inset:55px 10px 10px;z-index:2;display:flex;flex-direction:column;min-height:0;background:#142824;border:1px solid #708776;border-radius:8px;padding:10px;box-sizing:border-box}#v010MapOverlay .explorationDrawer[hidden]{display:none!important}.explorationNav{display:flex;gap:8px;justify-content:space-between;flex:0 0 48px}.explorationNav button{margin:0}.explorationScroll{flex:1;overflow-y:auto;min-height:0;overscroll-behavior:contain;touch-action:pan-y;padding:0 4px 10px}.explorationScroll .coreHint{font-size:12px;line-height:1.5;color:#b9ccbe}#v010MapOverlay .v012MapActions{flex-wrap:wrap}#v010MapOverlay #explorationMapHome,#v010MapOverlay #explorationMapSectors{min-height:36px;font-size:11px;padding:6px}#v010MapOverlay .v010MapHead>b{max-width:120px}@media(max-width:540px){#commandCoreOverlay .campaignTabs{grid-template-columns:repeat(3,minmax(0,1fr));flex-basis:96px}#v010MapOverlay .v010MapHead{display:grid;grid-template-columns:1fr;align-items:start}#v010MapOverlay .v012MapActions{width:100%;max-width:100%;justify-content:space-between;gap:4px;flex-wrap:nowrap}#v010MapOverlay .explorationDrawer{top:94px}#v010MapOverlay .v010MapHead>b{max-width:none}}@media(max-height:500px){#commandCoreOverlay .campaignTabs{display:flex;flex-wrap:nowrap;overflow-x:auto;flex-basis:44px}#commandCoreOverlay .campaignTabs button{flex:0 0 100px}#v010MapOverlay .explorationDrawer{top:49px}#v010MapOverlay .v012MapActions{max-width:none;flex-wrap:nowrap}}@media(max-width:540px) and (max-height:500px){#v010MapOverlay .explorationDrawer{top:88px}}`);
  setDrawer(false);refresh();
  return Object.freeze({showSite,drawMap,tick:()=>{if(map.classList.contains('open'))refresh();},reset(){page=null;signature='';setDrawer(false);},metrics:()=>({renders,drawerOpen,page})});
})();
