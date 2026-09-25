/* Shared view component. Core/Remote differ in entry access, never in device
   capabilities. Area routes are data; future floors register their own owner. */
window.GameBaseControlUI=(()=>{
  const t=(k,p)=>I18n.t('control.'+k,p),num=n=>I18n.number(n,{maximumFractionDigits:2}),clients=[];
  const node=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
  const put=(n,text)=>{if(n.textContent!==text)n.textContent=text;};
  function mount(host,route,active){
    const root=node('section','baseControl'),stats=node('div','baseControlStats'),warning=node('p','baseControlWarning'),levels=node('div','baseControlLevels'),map=node('div','baseControlMap'),heading=node('h4'),rows=node('div','baseControlObjects'),drone=node('button','menuButton');
    root.append(stats,warning,levels,map,heading,rows,drone);host.append(root);drone.type='button';drone.onclick=()=>V014Robots.openStation();
    let built='',area='bunker:1',zone='workshop',cards=new Map();
    const set=(level,room)=>{area=level;zone=room;route?.setPage('control|'+area+'|'+zone,{replace:true});built='';refresh();};
    function refresh(){
      if(!active())return;
      const saved=route?.page?.split('|');if(saved?.[0]==='control'&&GameBaseControl.levels.some(l=>l.id===saved[1]&&l.zones.includes(saved[2]))){area=saved[1];zone=saved[2];}
      const all=GameBaseControl.list(),a=V09Power.allocation(),devices=all.filter(d=>d.level===area&&d.zone===zone);
      const sig=[I18n.language,area,zone,JSON.stringify(GamePlacement.capture().roomNames),all.map(d=>d.id+':'+d.level+':'+d.zone+':'+d.kind).join()].join('|');
      if(sig!==built){built=sig;cards.clear();levels.replaceChildren();map.replaceChildren();rows.replaceChildren();
        for(const l of GameBaseControl.levels){const b=node('button','menuButton');b.type='button';b.textContent=I18n.t(l.title);b.dataset.controlLevel=l.id;b.classList.toggle('selected',l.id===area);b.setAttribute('aria-pressed',String(l.id===area));b.onclick=()=>set(l.id,l.zones[0]);levels.append(b);}
        map.setAttribute('aria-label',t('map'));map.classList.toggle('surface',area==='surface');
        const level=GameBaseControl.levels.find(l=>l.id===area);
        for(const id of level.zones){const b=node('button','controlZone');b.type='button';b.dataset.controlZone=id;b.textContent=id==='yard'?t('yard'):GamePlacement.roomName(id);b.classList.toggle('selected',id===zone);b.setAttribute('aria-pressed',String(id===zone));
          if(area==='bunker:1'){const r=BunkerLayout.roomData.find(r=>r.id===id),bounds=BunkerLayout.bounds;b.style.cssText=`left:${(r.x-bounds.x)/bounds.w*96+2}%;top:${(r.y-bounds.y)/bounds.h*96+2}%;width:${r.w/bounds.w*96}%;height:${r.h/bounds.h*96}%`;}
          b.onclick=()=>set(area,id);map.append(b);
        }
        put(heading,zone==='yard'?t('yard'):GamePlacement.roomName(zone));
        if(!devices.length){const n=node('p','coreHint');n.textContent=t('empty');rows.append(n);}
        const counts=new Map();for(const d of devices){counts.set(d.name,(counts.get(d.name)||0)+1);const row=node('section','controlObject'),text=node('div','controlObjectText'),name=node('strong'),status=node('small'),actions=node('div','controlObjectActions');row.dataset.controlInstance=d.id;name.textContent=d.name+(devices.filter(x=>x.name===d.name).length>1?' · '+counts.get(d.name):'');text.append(name,status);row.append(text,actions);rows.append(row);
          const make=(key,fn)=>{const b=node('button','menuButton');b.type='button';b.dataset.controlAction=key;b.onclick=fn;actions.append(b);return b;};
          const main=make(d.action,()=>{const row=GameBaseControl.get(d.id);if(!row)return;GameBaseControl.request(d.id,d.action,{value:!row.on,previous:row.on},Number(main.dataset.revision));refresh();});
          let auto=null,light=null;if(d.kind==='door')auto=make('doorAuto',()=>{GameBaseControl.request(d.id,'doorAuto',{},Number(auto.dataset.revision));refresh();});
          if(d.kind==='drone'){light=make('droneLight',()=>{const r=GameBaseControl.get(d.id);GameBaseControl.request(d.id,'droneLight',{value:!r.light},Number(light.dataset.revision));refresh();});for(const task of ['follow','guard','return']){const b=make('droneTask',()=>{GameBaseControl.request(d.id,'droneTask',{task},Number(b.dataset.revision));refresh();});b.textContent=t('droneTask.'+task);}}
          cards.set(d.id,{row,status,main,auto,light,actions});
        }
      }
      put(stats,t('supply',{load:num(a.load),demand:num(a.demand),supply:num(a.supply)})+' · '+t('fuel',{value:num(V09Power.fuel)}));put(warning,a.shed.length?t('shortage',{count:a.shed.length}):a.supply<=0?t('noPower'):t('independent'));warning.classList.toggle('warning',a.shed.length>0);
      for(const d of devices){const c=cards.get(d.id);if(!c)continue;const powered=d.deviceId?a.served.has(d.deviceId):true,key=d.broken?'damaged':!d.on?'off':d.kind==='door'?d.mode==='auto'?'automatic':'opened':d.kind==='gate'?'opened':!powered?'noPower':'on';
        put(c.status,t(key)+(d.watts!==undefined?' · '+num(d.watts)+' '+t('kw'):'')+(d.ammo!==undefined?' · '+t('ammo',{value:d.ammo}):''));
        const label=d.kind==='generator'?(d.on?'stop':'start'):['door','gate'].includes(d.kind)?(d.on?'close':'open'):d.kind==='turret'?(d.on?'deactivate':'activate'):d.kind==='drone'?(d.on?'combatOff':'combatOn'):(d.on?'turnOff':'turnOn');put(c.main,t(label));c.main.setAttribute('aria-pressed',String(d.on));
        for(const b of c.actions.children){b.dataset.revision=String(GameBaseControl.revision);b.disabled=!!d.broken||!GameBaseControl.access(GameActors.local,d);}
        if(c.auto){put(c.auto,t('auto'));c.auto.classList.toggle('selected',d.mode==='auto');}if(c.light)put(c.light,t(d.light?'droneLightOff':'droneLightOn'));
      }
      drone.hidden=!all.some(d=>d.kind==='drone'||d.typeId==='drone_station');put(drone,t('dronePanel'));
    }
    const client={refresh,reset(){area='bunker:1';zone='workshop';built='';},active};clients.push(client);return refresh;
  }
  const overlay=v09Overlay('v09PowerOverlay',t('remote')),body=overlay.querySelector('.v09Body');body.replaceChildren();let page=null;
  const remoteRoute={get page(){return page;},setPage(v){page=v;return true;}},remoteUpdate=mount(body,remoteRoute,()=>overlay.classList.contains('open'));
  function show(){if(GameFlow.paused||!GameBaseControl.remote(GameActors.local)){message(t('remoteRequired'));return false;}for(const o of document.querySelectorAll('.overlay.open'))closeOverlay(o);GameMovement.openUI();overlay.querySelector('.v09Title').textContent=t('remote');openOverlay(overlay);remoteUpdate();return true;}
  v09OpenPowerRemote=show;
  function refresh(){for(const c of clients)if(c.active())c.refresh();}
  function tick(){if(overlay.classList.contains('open')&&!GameBaseControl.remote(GameActors.local))closeOverlay(overlay);if(overlay.classList.contains('open'))remoteUpdate();}
  function reset(){page=null;closeOverlay(overlay);for(const c of clients)c.reset();}
  I18n.onChange(()=>{overlay.querySelector('.v09Title').textContent=t('remote');refresh();});
  v09Style(`
.baseControlStats{font-size:12px;line-height:1.6;font-variant-numeric:tabular-nums;color:#dceace}.baseControlWarning{font-size:11px!important;line-height:1.4!important;color:#afc7ba;margin:7px 0!important}.baseControlWarning.warning{color:#f2c88f}.baseControlLevels{display:flex;gap:7px;margin-bottom:8px}.baseControlLevels button{flex:1;min-height:40px;margin:0;padding:7px;font-size:12px}.baseControlLevels .selected,.controlZone.selected{border-color:#d2dcaa!important;background:#385545!important}.baseControlMap{height:225px;position:relative;background:#13272b;border:1px solid #58685d;border-radius:8px;margin-bottom:8px}.controlZone{position:absolute;min-width:0;padding:2px;border:1px solid #718678;background:#243b3d;color:#dce6d4;border-radius:4px;font:10px Arial;overflow-wrap:anywhere;touch-action:manipulation}.baseControlMap.surface{height:100px}.baseControlMap.surface .controlZone{inset:12px;position:absolute}.baseControl h4{font-size:13px;margin:9px 0}.controlObject{display:flex;align-items:center;gap:9px;flex-wrap:wrap;border-bottom:1px solid #63826744;padding:9px 0}.controlObjectText{flex:1;min-width:130px}.controlObject strong{display:block;font-size:12px}.controlObject small{display:block;font-size:10px;color:#adc4b5;margin-top:4px}.controlObjectActions{display:flex;flex-wrap:wrap;gap:5px;max-width:100%}.controlObjectActions button{width:auto!important;min-height:40px!important;min-width:55px;margin:0!important;padding:6px 9px!important;font-size:11px!important}.baseControl>.menuButton{font-size:12px;min-height:40px}.coreBaseViews{display:flex;gap:7px;margin:3px 0 9px}.coreBaseViews button{flex:1;min-height:38px;font-size:12px;margin:0}.coreBaseViews .selected{background:#385545;border-color:#ccdca8}
#v09PowerOverlay{position:fixed;inset:0;padding:0;overflow:hidden;--build-top:max(28px,calc(var(--v011-game-top,10px) + 18px),calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px) + 12px));--build-bottom:max(12px,env(safe-area-inset-bottom,0px))}#v09PowerOverlay .v09Panel{position:absolute;left:50%;top:calc(var(--build-top) + (100dvh - var(--build-top) - var(--build-bottom) - min(750px,100dvh - var(--build-top) - var(--build-bottom)))/2);transform:translateX(-50%);width:min(620px,calc(100vw - 24px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)));height:min(750px,calc(100dvh - var(--build-top) - var(--build-bottom)));box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;margin:0;padding:14px}#v09PowerOverlay .v09Header{flex:0 0 42px;margin:0}#v09PowerOverlay .v09Body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}.baseControl [hidden]{display:none!important}
@media(max-height:500px){.baseControlMap{height:180px}}`);
  return Object.freeze({mount,show,refresh,tick,reset});
})();
