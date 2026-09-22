"""Offline audio preparation; requires FFmpeg, numpy, scipy. No synthesis in game.
Run with --source-dir pointing to the unpacked archives in audio-sources.json.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess,wave,re
import numpy as np
from scipy.signal import butter,sosfilt,resample_poly

parser=argparse.ArgumentParser();parser.add_argument('--source-dir',required=True)
S=Path(parser.parse_args().source_dir);R=Path(__file__).resolve().parents[1];OUT=R/'assets/audio/full';OUT.mkdir(parents=True,exist_ok=True)
RATE=32000;records=[];manifest=json.loads((R/'assets/manifest.json').read_text());audio={k:v for k,v in manifest['audio'].items() if k in ['chopWood','mineRock']}
def decode(p):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ac','1','-ar',str(RATE),'-f','f32le','-']),dtype='<f4').astype(np.float64)
def write(key,a,source,loop=False,peak=.70,rms=.13,low=None,high=45):
 a=np.asarray(a,dtype=np.float64).copy();a-=np.mean(a)
 if high:a=sosfilt(butter(2,high,fs=RATE,btype='highpass',output='sos'),a)
 if low:a=sosfilt(butter(3,low,fs=RATE,output='sos'),a)
 if loop:
  n=min(int(RATE*.12),len(a)//5);a=np.r_[a[n:-n],a[-n:]*np.linspace(1,0,n)+a[:n]*np.linspace(0,1,n)]
 else:
  n=min(int(RATE*(.012 if key.startswith('foot') else .002)),len(a)//4);tail=min(int(RATE*.045),len(a)//4)
  a[:n]*=np.linspace(0,1,n);a[-tail:]*=np.linspace(1,0,tail)
 gain=min(peak/(np.max(np.abs(a))+1e-12),rms/(np.sqrt(np.mean(a*a))+1e-12));a*=gain
 if not loop:a[0]=a[-1]=0
 pcm=np.rint(a*32767).astype('<i2');path=OUT/(re.sub(r'(?<!^)([A-Z])',r'_\1',key).lower()+'.wav')
 with wave.open(str(path),'wb') as f:f.setparams((1,2,RATE,len(a),'NONE','not compressed'));f.writeframes(pcm.tobytes())
 audio[key]={'path':path.relative_to(R).as_posix(),'optional':False,**({'volumeScale':.5} if key.startswith('foot') else {})}
 records.append({'key':key,'path':str(path.relative_to(R)),'source':source,'rate':RATE,'channels':1,'seconds':round(len(a)/RATE,5),'loop':loop,'peak':round(float(np.max(np.abs(a))),5),'rms':round(float(np.sqrt(np.mean(a*a))),5),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
def clip(key,path,seconds,start=0,loop=False,**kw):
 p=S/path;a=decode(p);a=a[int(start*RATE):int((start+seconds)*RATE)]
 if len(a)<RATE*.03:raise ValueError((key,'empty clip'))
 write(key,a,{'file':path,'start':start,'requestedSeconds':seconds,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},loop,**kw)
def foley(key,n,seconds=.5,**kw):clip(key,'foley/sfx100v2_'+n+'.ogg',seconds,**kw)
for key,side in zip(['footsteps','footstep2','footstep3','footstep4'],['L1','R1','L2','R2']):
 clip(key,'steps/Fantozzi-footsteps/flac/Fantozzi-Sand'+side+'.flac',.24,peak=.36,rms=.07,low=1050,high=65)
for key,path,start,low in [('gunshot','AK-47/C_28P.wav',.585,6800),('shotM4','AR-15/D_32P.wav',.68,7800),('turretFire','AK-47/C_28P.wav',3.225,4600),('droneFire','AR-15/D_32P.wav',5.62,4900)]:
 clip(key,'firearms/Prepared SFX Library/'+path,.43,start,peak=.8,rms=.18,low=low)
foley('dryFire','switch_02',.13,peak=.5,low=5200)
for key,n,d in [('reloadOut','metal_02',.28),('reloadIn','metal_03',.30),('reloadBolt','metal_04',.28),('impactMetal','metal_hit_01',.24),('hit','hit_02',.19),('playerHit','hit_01',.30),('impactStone','stones_01',.27),('treeBreak','wood_02',.8),('rockBreak','stones_02',.65),('doorOpen','door_01',.68),('doorClose','door_02',.55),('pickup','items_01',.22),('cloth','footstep_01',.17),('lootOpen','lock_open_01',.34),('lootClose','items_02',.24),('metalPlace','metal_05',.37),('switch','switch_01',.14),('liquid','loop_water_01',.46),('plant','footstep_02',.18),('fishCast','footstep_wet_01',.33),('fishCatch','footstep_wet_02',.42),('powerStart','loop_machine_01',.65),('powerStop','loop_machine_02',.65)]:
 foley(key,n,d,low=3500 if key in ['cloth','hit','playerHit','plant'] else 7500)
for key,n,d,start in [('zombie','zombienoise1.ogg',1.5,.2),('zombie2','zombienoise2.ogg',1.35,.2),('zombie3','zombienoise3.ogg',.64,0),('zombieAttack','fastzombie1.ogg',.34,0),('zombieDeath','zombienoise2.ogg',.95,.3),('leaperJump','fastzombie1.ogg',.34,0),('bloaterFuse','zombienoise1.ogg',.6,.7)]:
 clip(key,'zombies/'+n,d,start,low=3600,peak=.65,rms=.13)
foley('explosion','thunder_01',1.1,low=3300,peak=.78,rms=.15)
clip('chicken','chicken/Chicken Sound Effect.ogg',1.10,low=5200,rms=.1)
clip('cow','farm/MudchuteAnimals/Mudchute_cow_1.ogg',1.65,low=3200,rms=.12)
foley('slaughter','hit_02',.30,low=2200,rms=.10)
foley('day','air_01',3.2,loop=True,low=3400,rms=.10)
clip('night','crickets.mp3',4,2,loop=True,high=500,low=7100,rms=.09)
foley('bunker','loop_machine_04',2.8,loop=True,low=1400,rms=.12)
foley('generator','loop_machine_01',2.8,loop=True,low=2600,rms=.14)
foley('machine','loop_machine_03',2.8,loop=True,low=4200,rms=.13)
foley('water','loop_water_02',2.5,loop=True,low=5300,rms=.12)
foley('menu','air_03',3,loop=True,low=1900,rms=.10)
def tone(key,seconds,frequencies,loop=False):
 t=np.arange(round(seconds*RATE))/RATE
 a=sum(amp*np.sin(2*np.pi*f*t) for f,amp in frequencies)
 if not loop:a*=np.exp(-t*12)
 write(key,a,{'original':'LAST BASE offline tonal sound design','frequencies':frequencies},loop,peak=.5,rms=.10,high=20)
tone('uiClick',.085,[(620,.6),(980,.15)])
tone('uiConfirm',.21,[(520,.4),(780,.3),(1040,.14)])
tone('complete',.28,[(520,.3),(650,.3),(780,.3)])
tone('uiError',.22,[(185,.4),(277,.25)])
tone('dayX',4,[(43,.5),(65,.3),(87,.2),(129,.08)],True)
t=np.arange(RATE*2)/RATE;rotor=(np.sin(2*np.pi*92*t)*.5+np.sin(2*np.pi*184*t)*.2+np.sin(2*np.pi*368*t)*.1)*(1+.22*np.sin(2*np.pi*28*t))
write('rotor',rotor,{'original':'LAST BASE offline rotor synthesis, 92/184/368 Hz with blade modulation'},True,peak=.5,rms=.13,high=50)
manifest['audio']=audio;(R/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'tools/audio-preparation.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'newClips':len(records),'allClips':len(audio),'bytes':sum((R/x['path']).stat().st_size for x in audio.values()),'seconds':sum(x['seconds'] for x in records)}))
