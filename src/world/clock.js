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
    const dt=Math.min(ms,1000);let remaining=dt;
    // Split at midnight/06:00 so a boundary frame never receives the wrong rate.
    while(remaining>1e-8){const slow=day%SignalDefinitions.intervalDays===0&&minute<SignalDefinitions.endMinute;
      const boundary=slow?SignalDefinitions.endMinute:1440,rate=1440/dayMs/(slow?SignalDefinitions.clockSlowdown:1);
      const part=Math.min(remaining,(boundary-minute)/rate);minute+=part*rate;remaining-=part;
      if(minute>=boundary-1e-9){minute=boundary;if(minute===1440){day++;minute=0;}}
      notify();
    }return dt;
  }
  function realMsForMinutes(minutes){let d=day,m=minute,left=Math.max(0,minutes),ms=0;
    while(left>1e-9){const slow=d%SignalDefinitions.intervalDays===0&&m<SignalDefinitions.endMinute,boundary=slow?SignalDefinitions.endMinute:1440,part=Math.min(left,boundary-m);
      ms+=part*dayMs/1440*(slow?SignalDefinitions.clockSlowdown:1);left-=part;m+=part;if(m>=1440){d++;m=0;}
    }return ms;
  }
  return Object.freeze({dayMs,realMsForMinutes,capture,validate,restore,advance,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},get day(){return day;},get minute(){return minute;}});
})();

