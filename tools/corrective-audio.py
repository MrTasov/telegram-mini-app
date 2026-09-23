"""Reproducible original quiet sound design for 0.32.1. No runtime synthesis.
Requires numpy; writes mono PCM WAV. Does not read or modify Day X or combat.
"""
from pathlib import Path
import json, hashlib, wave, re
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 32000
rng = np.random.default_rng(321)
manifest = json.loads((ROOT / 'assets/manifest.json').read_text())
records = []

def noise(n, low, high):
    # Periodic, spectrally bounded noise; no transient source attacks.
    f = np.fft.rfftfreq(n, 1 / RATE)
    spectrum = np.fft.rfft(rng.normal(size=n))
    shape = np.exp(-(f / high)**4) * (1 - np.exp(-(f / low)**4))
    a = np.fft.irfft(spectrum * shape, n)
    return a / max(np.std(a), 1e-12)

def save(key, a, rms, loop=False):
    a -= np.mean(a)
    if loop:
        n = int(.3 * RATE)
        a = np.r_[a[n:-n], a[-n:] * np.linspace(1, 0, n) + a[:n] * np.linspace(0, 1, n)]
    else:
        n = min(int(.004 * RATE), len(a)//4)
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
        a[0] = a[-1] = 0
    a *= min(rms / max(np.std(a), 1e-12), .22 / max(np.max(np.abs(a)), 1e-12))
    path = ROOT / manifest['audio'][key]['path']
    with wave.open(str(path), 'wb') as f:
        f.setparams((1, 2, RATE, len(a), 'NONE', 'not compressed'))
        f.writeframes(np.rint(a * 32767).astype('<i2').tobytes())
    records.append(dict(key=key, path=path.relative_to(ROOT).as_posix(), loop=loop,
                        seconds=len(a)/RATE, rms=float(np.std(a)), peak=float(np.max(np.abs(a))),
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                        source='Original LAST BASE 0.32.1 offline sound design'))

for key, seconds, freq, rms in [('uiClick',.045,1850,.038),('menu',.06,1560,.036),
                              ('uiConfirm',.11,1320,.043),('uiError',.14,720,.036),
                              ('lootClose',.085,1160,.039),('pickup',.07,2050,.032)]:
    t = np.arange(round(seconds * RATE)) / RATE
    sign = -1 if key=='uiError' else 1
    a = .27*noise(len(t),750,4200)*np.exp(-t/ .007)
    a += np.sin(2*np.pi*(freq*t+sign*240*t*t))*np.exp(-t/(seconds/5))
    if key=='uiConfirm': a += .36*np.sin(2*np.pi*1980*t)*np.exp(-((t-.037)/.018)**2)
    save(key, a, rms)

for key, rms in [('generator',.038),('machine',.032),('rotor',.029),('bunker',.028)]:
    t = np.arange(RATE * 8) / RATE
    hz = {'generator':75,'machine':110,'rotor':180,'bunker':50}[key]
    a = .5*np.sin(2*np.pi*hz*t)+.16*np.sin(2*np.pi*hz*2*t)+.04*np.sin(2*np.pi*hz*3*t)
    a *= 1 + .035*np.sin(2*np.pi*2*t)
    a += noise(len(t),55,650)*(.20 if key=='bunker' else .065)
    save(key, a, rms, True)

for key, seconds, rms, loop in [('water',8,.039,True),('liquid',.68,.048,False)]:
    t = np.arange(round(RATE * seconds))/RATE
    a = .65*noise(len(t),180,2400) + .22*noise(len(t),500,3900)
    a *= .75+.15*np.sin(2*np.pi*.7*t)+.09*np.sin(2*np.pi*2.3*t)
    # Soft small resonances in a continuous stream, not impact/splash pulses.
    a += .055*np.sin(2*np.pi*(830*t+90*np.sin(2*np.pi*.6*t)))
    if not loop: a *= np.sin(np.pi*t/seconds)**1.3
    save(key, a, rms, loop)

# Normal day changes have no event sound and no synthetic "air impact" loop.
day = manifest['audio'].pop('day', None)
if day: (ROOT / day['path']).unlink(missing_ok=True)
(ROOT/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'tools/audio-corrective-preparation.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'replaced':len(records),'removed':['day'],'seconds':sum(r['seconds'] for r in records)}))
