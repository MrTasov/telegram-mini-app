/* Language is a device preference, deliberately outside GameState/save slots. */
(()=>{
 const box=document.createElement('div');box.id='languageSettings';box.className='settingBox';
 const label=document.createElement('label');label.className='settingTitle';label.setAttribute('for','languageSelect');I18n.bind(label,'settings.language');
 const select=document.createElement('select');select.id='languageSelect';select.setAttribute('aria-describedby','languageHelp');select.setAttribute('data-i18n-skip','');
 for(const language of I18n.languages){const option=document.createElement('option');option.value=language.id;option.textContent=language.name;select.append(option);}
 const help=document.createElement('p');help.id='languageHelp';I18n.bind(help,'settings.language.help');
 select.value=I18n.language;select.addEventListener('change',()=>I18n.setLanguage(select.value));I18n.onChange(()=>{select.value=I18n.language;});
 const status=document.createElement('p');status.id='languageStatus';status.setAttribute('role','status');status.hidden=true;I18n.onChange((_,{saved})=>{status.hidden=saved;I18n.assign(status,'textContent',saved?'':I18n.message('settings.language.unsaved'));});
 box.append(label,select,help,status);el('controlModeSettings').before(box);
 v09Style(`#languageSettings{display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center}#languageSettings .settingTitle{margin:0}#languageSelect{font:inherit;color:#e3eee7;background:#203630;border:1px solid #89a998;border-radius:6px;padding:7px 10px;min-width:106px;touch-action:manipulation}#languageHelp,#languageStatus{grid-column:1/-1;font-size:11px;line-height:1.5;color:#b6cfc2;margin:0}.settingBox label,.v09Title{overflow-wrap:break-word}`);
 I18n.mount();
})();
