/* Wearable instance attachments reuse item UIDs and the Stage B command gate.
   Socket transforms are relative to their parent, never world placements. The
   parent item is the sole saved owner; unequipping moves the complete assembly. */
window.GameHeadModules=(()=>{
  const copy=clone,slot='flashlight';let sequence=0;
  const supported=item=>!!ITEM[item?.type]?.moduleSlots?.includes(slot);
  const available=()=>supported(equipment.head)&&equipment.head.attachments?.flashlight?.type==='flashlight';
  function instance(id){const head=equipment.head;if(!supported(head)||head.uid!==id)return null;return {id:head.uid,typeId:head.type,transform:{parentId:GameActors.localId,slot:'head'},item:head};}
  function attachment(){const item=equipment.head?.attachments?.flashlight;return available()?{id:item.uid,typeId:item.type,transform:{parentId:equipment.head.uid,slot},item}:null;}
  function loose(){return [...bag,...V013Inventory.items].find(i=>i?.type==='flashlight')||null;}
  function perform(command,actor,target){
    const head=target.item,p=command.payload||{};
    if(command.action==='toggle'){if(!available()||typeof p.value!=='boolean')return {ok:false,reason:'missing_module'};flashlightOn=p.value;return {ok:true};}
    if(command.action==='install'){
      if(head.attachments?.flashlight||typeof p.moduleId!=='string')return {ok:false,reason:'slot_occupied'};
      const owner=[bag,V013Inventory.items].find(a=>a.some(i=>i?.uid===p.moduleId&&i.type==='flashlight'&&i.qty===1));
      if(!owner)return {ok:false,reason:'missing_module'};
      const index=owner.findIndex(i=>i?.uid===p.moduleId),item=owner[index];
      if(item.attachments!==undefined)return {ok:false,reason:'invalid_module'};
      owner[index]=null;head.attachments={flashlight:item};flashlightOn=true;return {ok:true};
    }
    if(command.action==='remove'){
      const item=head.attachments?.flashlight;if(!item)return {ok:false,reason:'missing_module'};
      // insertItem first checks capacity; a one-item module has no partial path.
      if(V010Inventory.insertItem(copy(item)))return {ok:false,reason:'bag_full'};
      delete head.attachments;flashlightOn=false;return {ok:true};
    }
    return {ok:false,reason:'unknown_action'};
  }
  function changed(){V010Inventory.render();V091Light.invalidate();refresh();queueGameSave();}
  const commands=EquipmentCommands.create({get:instance},{actor:id=>GameActors.get(id),authorized:a=>a.id===GameActors.localId,access:a=>!a.dead,perform,changed});
  function execute(c){return GameFlow.paused?{ok:false,reason:'world_paused',revision:commands.revision}:commands.execute(c);}
  function request(action,payload){
    if(equipment.head)V010Combat.ensure(equipment.head);
    return execute({actorId:GameActors.localId,instanceId:equipment.head?.uid||'',action,payload,expectedRevision:commands.revision,requestId:'head-ui:'+commands.revision+':'+(++sequence)});
  }
  const fresh=()=>({schema:1,commands:{revision:0,receipts:[]}});
  function migrate(d){
    if(d.headModules033)return;
    const ids=new Set();function collect(v){if(!v||typeof v!=='object')return;if(v.uid)ids.add(v.uid);for(const x of Object.values(v))if(x&&typeof x==='object')collect(x);}collect(d);
    const uid=base=>{let id=base,n=1;while(ids.has(id))id=base+'-'+n++;ids.add(id);return id;};
    const lit=d.flashlightOn!==false&&d.handSlots?.[d.activeHandSlot]==='flashlight';
    let module=null;
    for(const list of [d.quick013?.items,d.bag]){if(!list)continue;const i=list.findIndex(s=>s?.type==='flashlight');if(i<0)continue;module={...list[i],qty:1};if(list[i].qty>1){list[i].qty--;delete module.uid;}else list[i]=null;if(list===d.quick013?.items||!d.quick013){if(d.handSlots?.[i]==='flashlight')d.handSlots[i]=null;if(list===d.quick013?.items&&d.activeHandSlot===i)d.activeHandSlot=null;}break;}
    module={type:'flashlight',qty:1,uid:module?.uid||uid('module-legacy-light')};
    d.equipment.head??={type:'head_mount',qty:1,uid:uid('gear-legacy-head'),level:0,variant:'balanced',specialization:'balanced'};
    d.equipment.head.uid??=uid('gear-legacy-head');d.equipment.head.attachments={flashlight:module};
    if(d.quick013)d.handSlots=d.quick013.items.map(i=>i?.type||null);
    else if(!d.bag.some(i=>i?.type==='flashlight'))d.handSlots=d.handSlots?.map(t=>t==='flashlight'?null:t);
    if(d.activeHandSlot!==null&&!d.handSlots?.[d.activeHandSlot])d.activeHandSlot=null;
    d.flashlightOn=lit;d.starterPending=d.starterPending?.filter(t=>t!=='flashlight')||[];d.headModules033=fresh();
  }
  function validateItem(item){
    if(item.attachments===undefined)return true;
    const a=item.attachments,m=a?.flashlight;
    return supported(item)&&typeof item.uid==='string'&&!!item.uid&&a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).join()==='flashlight'&&m?.type==='flashlight'&&m.qty===1&&typeof m.uid==='string'&&m.uid.length>0&&m.uid.length<=80&&m.uid!==item.uid&&Object.keys(m).every(k=>['type','qty','uid'].includes(k));
  }
  function validate(d){
    const s=d.headModules033;if(!s||s.schema!==1||Object.keys(s).sort().join()!=='commands,schema')throw Error('Missing head module state');commands.validate(s.commands);
    // Check attachment identity across every saved owner, including storage,
    // cradle, dropped loot and drone cargo. No duplicate module backing store.
    const items=[];function walk(v){if(!v||typeof v!=='object')return;if(typeof v.type==='string'&&Object.hasOwn(ITEM,v.type))items.push(v);for(const x of Object.values(v))if(x&&typeof x==='object')walk(x);}walk(d);
    const attached=new Set();for(const item of items){if(!validateItem(item))throw Error('Invalid head module attachment');const m=item.attachments?.flashlight;if(m){if(attached.has(m.uid))throw Error('Duplicate module instance');attached.add(m.uid);}}
    for(const id of attached)if(items.filter(i=>i.uid===id).length!==1)throw Error('Duplicate module instance');
    return true;
  }
  const capture=()=>({schema:1,commands:commands.capture()});
  GameSave.extend('capture','inventory.head-modules',function(previous){V010Combat.ensure(equipment.head);const d=previous();d.headModules033=capture();return d;});
  GameSave.extend('decode','inventory.head-modules',function(previous,raw){const d=previous(raw);validate(d);return d;});
  GameSave.extend('restore','inventory.head-modules',function(previous,d){validate(d);const result=previous(d);commands.restore(d.headModules033.commands);refresh();return result;});
  GameState.register('headModules',{capture,attachment,available},{source:'inventory/head-modules.js',saved:['headModules033','equipment.head.attachments'],transient:['request sequence','HUD']});
  const button=document.createElement('button');button.id='v033LightToggle';button.type='button';button.textContent='🔦';document.body.append(button);GameActions.bindButton(button,()=>GameActions.dispatch('FLASHLIGHT'));
  let hudKey='';
  function refresh(){const key=[available(),menuOpen,GameFlow.paused,flashlightOn,I18n.language].join('|');if(key===hudKey)return;hudKey=key;button.style.display=available()&&!menuOpen&&!GameFlow.paused?'grid':'none';button.classList.toggle('on',available()&&flashlightOn);button.setAttribute('aria-pressed',String(available()&&flashlightOn));I18n.setAttr(button,'aria-label',flashlightOn?'Выключить фонарь':'Включить фонарь');I18n.assign(button,'title',I18n.text('Тактический фонарь')+' · F');}
  const oldHud=updateAmmoHud;updateAmmoHud=function(...args){const r=oldHud(...args);refresh();return r;};I18n.onChange(refresh);
  const oldDetails=V011UI.details;V011UI.details=function(where,index){
    oldDetails(where,index);const item=where==='equipment'?equipment[index]:V010Inventory.list(where)?.[index];if(!item||!supported(item)&&item.type!=='flashlight')return;
    const body=el('v010ItemDetails')?.querySelector('.v09Body');if(!body)return;
    const panel=document.createElement('div');panel.className='v033Module';const p=document.createElement('p');
    I18n.assign(p,'textContent',supported(item)?item.attachments?.flashlight?'Слот фонаря: Тактический фонарь':'Слот фонаря: пусто':'Установите модуль в надетое головное снаряжение.');panel.append(p);
    const add=(label,action,payload,disabled)=>{const b=v09Button(label,()=>{if(action==='install'){if(GameFlow.paused||!candidate||![...bag,...V013Inventory.items].includes(candidate)||!supported(equipment.head)||available())return;V010Combat.ensure(candidate);}const result=request(action,payload());if(result.ok)closeOverlay(el('v010ItemDetails'));else message(result.reason==='bag_full'?'Нет места в рюкзаке':'Наденьте головное снаряжение со свободным слотом фонаря');});b.disabled=disabled;panel.append(b);};
    const worn=where==='equipment'&&index==='head',candidate=item.type==='flashlight'?item:loose();
    // Opening a card is read-only. Identity is committed by the install action.
    if(item.type==='flashlight'||worn&&!item.attachments?.flashlight)add('Установить фонарь', 'install',()=>({moduleId:candidate?.uid}),!candidate||!supported(equipment.head)||available()||item.type==='flashlight'&&!['bag','quick'].includes(where));
    if(worn&&item.attachments?.flashlight){add('Снять модуль','remove',()=>({}),false);add(flashlightOn?'Выключить фонарь':'Включить фонарь','toggle',()=>({value:!flashlightOn}),false);}
    body.append(panel);
  };
  v09Style('#v033LightToggle{position:fixed;right:calc(60px + var(--v011-safe-right,0px));top:calc(var(--v011-game-top,0px) + 44px);width:38px;height:38px;display:none;place-items:center;z-index:31;border:1px solid #789b8d;border-radius:12px;background:#152726e8;color:#eff4cf;font-size:20px;touch-action:none}#v033LightToggle.on{border-color:#e9d894;background:#566348}.v033Module{border-top:1px solid #56706b;margin-top:10px;padding-top:8px;font-size:13px}.v033Module button{margin:4px 8px 0 0}');
  refresh();
  return Object.freeze({available,attachment,execute,request,capture,migrate,validate,validateItem,refresh,get revision(){return commands.revision;}});
})();
