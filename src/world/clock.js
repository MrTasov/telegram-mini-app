/* Authoritative in-process world clock. No DOM, camera, input, or wall clock.
   lighting016 remains the on-disk field for compatibility with every old slot. */
window.WorldClock=(()=>{
  const dayMs=20*60*1000,listeners=new Set();
  let day=1,minute=480;
  function capture(){return {schema:1,day,minute};}
  function validate(d){if(d===undefined)return true;if(!d||d.schema!==1||!Number.isSafeInteger(d.day)||d.day<1||!Number.isFinite(d.minute)||d.minute<0||d.minute>=1440)throw Error('Некорректное время суток');return true;}
  function notify(){for(const fn of listeners)fn(day,minute);}
  function restore(d){validate(d);day=d?.day??1;minute=d?.minute??480;notify();}
  function advance(ms){
    if(!Number.isFinite(ms)||ms<=0)return 0;
    const dt=Math.min(ms,1000);minute+=dt/dayMs*1440;
    if(minute>=1440){day=Math.min(Number.MAX_SAFE_INTEGER,day+Math.floor(minute/1440));minute%=1440;}
    notify();return dt;
  }
  return Object.freeze({dayMs,capture,validate,restore,advance,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},get day(){return day;},get minute(){return minute;}});
})();

