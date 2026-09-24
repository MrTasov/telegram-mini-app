/* Read-only presentation adapter over existing world owners. No new save owner,
   station registry, interaction commands or equipment instances are introduced. */
window.GameBaseOverview=(()=>{
  const t=(k,p)=>I18n.t('core.'+k,p),num=(n,d=0)=>I18n.number(n,{maximumFractionDigits:d});
  const pct=(n,total=1)=>num(Math.max(0,Math.min(100,n/Math.max(total,.000001)*100)))+'%';
  function snapshot(){
    const a=V09Power.allocation(),battery=V010Energy.battery,robot=V014Robots.state;
    const rows=[],group=(id)=>{const g={id,title:t('group.'+id),rows:[]};rows.push(g);return g;};
    const add=(g,id,title,value,detail='')=>g.rows.push({id,title,value,detail});
    const deviceStatus=id=>{if(V09Power.devices[id]?.present&&!V09Power.devices[id].present())return 'packed';if(GameEquipment.recipeStation(id)==='utility_workbench'&&GameEquipment.present(id))return V09Craft.visualState(id).working?'working':'standby';const d=V09Power.devices[id];return !d||!d.enabled?'off':!V09Power.roomEnabled[d.room]?'circuitOff':!a.served.has(id)?(a.supply>0?'waitingPower':'noPower'):d.active()?'working':'standby';};
    let g=group('energy');
    add(g,'generator',t('generator'),GameEquipment.present('generator')?t(V09Power.running&&V09Power.fuel>0?'working':'off'):t('packed'),t('generator.capacity',{power:num(V09Power.supply,2)}));
    add(g,'fuel',t('tank'),GameEquipment.present('tank')?t('tank.amount',{amount:num(V09Power.fuel,1)}):t('packed'),t('tank.detail',{amount:num(V09Power.fuel,1),capacity:num(V09Power.capacity)}));
    const flow=!GameEquipment.present('battery')?'packed':!battery.enabled?'off':a.batteryOutput>0?'discharging':a.chargeInput>0?'charging':battery.charge>0?'reserve':'empty';
    add(g,'battery',t('battery'),pct(battery.charge,battery.capacity)+' · '+t(flow),t('battery.detail',{charge:num(battery.charge,2),capacity:num(battery.capacity,2)})+(a.batteryOutput>0?' · '+t('battery.remaining',{minutes:num(Math.ceil(battery.charge/a.batteryOutput*60))}):''));
    add(g,'grid',t('grid'),t('grid.load',{load:num(a.load,2),supply:num(a.supply,2)}),t('grid.demand',{demand:num(a.demand,2),waiting:num(a.shed.length)}));
    add(g,'core',I18n.t('bunker.core.name'),t(deviceStatus(GameCampaign.powerId)),t('core.demand'));
    g=group('workshop');
    for(const id of GameEquipment.productionIds.filter(id=>['furnace','craft_bench','utility_workbench'].includes(GameEquipment.recipeStation(id)))){
      const key=GameEquipment.recipeStation(id)==='furnace'?'furnace':'bench';
      const q=V09Craft.craftQueue,j=q.getJob(id),ready=Object.values(q.readyItems(id)).reduce((n,v)=>n+v,0),queued=q.queues[id].length;
      const status=q.paused[id]?'paused':deviceStatus(id)==='working'?'working':j?deviceStatus(id):ready?'outputReady':deviceStatus(id);
      const progress=j&&j.totalMs>0?pct(j.totalMs-j.remainingMs,j.totalMs):'';
      add(g,id,I18n.text(GameEquipment.definition(id).name),(GameEquipment.present(id)?t(status):I18n.t('placement.packed'))+(j?' · '+progress:''),(j?I18n.text(V09Craft.recipes[j.recipe].name)+' · ':'')+t('production.detail',{queued:num(queued),ready:num(ready)}));
    }
    add(g,'upgrade',t('upgrade'),t(deviceStatus('upgrade0161')),t('upgrade.detail'));
    g=group('support');
    const chests=GameEquipment.capture().filter(r=>r.typeId==='storage_crate'&&r.placement==='installed'&&r.transform.room!=='farm').map(r=>storageChests[Number(r.refs.container.slice(8))]),used=chests.reduce((n,c)=>n+c.items.filter(Boolean).length,0);
    add(g,'storage',t('storage'),t('storage.value',{chests:num(chests.length),stacks:num(used)}),t('storage.detail'));
    add(g,'drone',t('drone'),robot.packed?t('packed'):robot.hp<=0?t('damaged'):t('drone.task.'+robot.task),t('drone.detail',{charge:pct(robot.battery,100),health:pct(robot.hp,V014Robots.maxHp()),ammo:num(robot.ammo)})+' · '+t(robot.packed?'packed':robot.scene==='bunker'?'inBunker':'onSurface'));
    add(g,'dock',t('dock'),t(deviceStatus('robot_drone_charge')),t(V014Robots.atDock()&&!robot.packed?'dock.occupied':'dock.empty'));
    g=group('defense');
    for(const id of ['outer','inner']){
      const sections=V015Base.sections.filter(s=>s.group===id),hp=sections.reduce((n,s)=>n+s.hp,0),max=sections.reduce((n,s)=>n+s.maxHp,0);
      add(g,id,t('perimeter.'+id),pct(hp,max),t('perimeter.detail',{damaged:num(sections.filter(s=>s.hp>0&&s.hp<s.maxHp).length),broken:num(sections.filter(s=>s.hp<=0).length)}));
    }
    const gates=V015Base.sections.filter(s=>s.gate),open=gates.filter(s=>V015Base.isOpen(s)).length;
    add(g,'gates',t('gates'),t('gates.detail',{open:num(open),total:num(gates.length)}));
    const guns=V016Turret.guns;
    add(g,'turrets',t('turrets'),t('turrets.value',{ready:num(guns.filter(s=>s.enabled&&!s.fallen&&s.ammo>0).length),total:num(guns.length)}),t('turrets.detail',{ammo:num(guns.reduce((n,s)=>n+s.ammo,0)),fallen:num(guns.filter(s=>s.fallen).length)}));
    const lights=Object.values(V09Power.devices).filter(d=>d.room==='yard');
    add(g,'surfaceLights',t('surfaceLights'),t('devices.served',{on:num(lights.filter(d=>a.served.has(d.id)).length),total:num(lights.length)}));
    g=group('rooms');
    for(const room of BunkerLayout.roomData){
      const devices=Object.values(V09Power.devices).filter(d=>d.room===room.id),enabled=V09Power.roomEnabled[room.id],served=devices.filter(d=>a.served.has(d.id)).length;
      const door=v09Doors.find(d=>d.room===room.id),broken=door&&V018Build.isBroken(door.id);
      add(g,room.id,window.GamePlacement?GamePlacement.roomName(room.id):t('room.'+room.id),t(!enabled?'circuitOff':a.supply<=0?'noPower':devices.some(d=>d.enabled&&d.active()&&!a.served.has(d.id))?'waitingPower':'powered'),t(a.served.has('light_'+room.id)?'light.on':'light.off')+(door?' · '+t(broken?'door.broken':a.served.has('door_'+room.id)?'door.auto':'door.manual'):''));
    }
    g=group('agriculture');
    add(g,'agriculture',t('agriculture'),t('paused'),t('agriculture.detail'));
    return rows;
  }
  return Object.freeze({snapshot});
})();
