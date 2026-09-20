/* Developer entry only. All game/settings writes are disposable; never use
   this file from index.html. Reads seed an in-memory copy of the current slots. */
(()=>{
  'use strict';
  const values=new Map();
  try{const original=window.localStorage;for(let i=0;i<original.length;i++){const key=original.key(i);values.set(key,original.getItem(key));}}catch(_){}
  const memory={getItem:key=>values.get(String(key))??null,setItem:(key,value)=>{values.set(String(key),String(value));},removeItem:key=>{values.delete(String(key));},clear:()=>values.clear(),key:i=>[...values.keys()][i]??null,get length(){return values.size;}};
  try{
    Object.defineProperty(window,'localStorage',{value:memory,configurable:true});
    if(window.localStorage!==memory)throw Error('Storage isolation failed');
    Object.defineProperty(window,'LastBaseDeveloper',{value:Object.freeze({isolated:true}),configurable:false});
  }catch(_){window.LastBaseDeveloperError=true;}
})();

