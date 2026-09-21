"""Original short procedural foley, offline only; stdlib PCM WAV, no runtime synthesis.
Rebuild: python tools/polish-audio.py. Deterministic private RNG never touches game RNG.
"""
from pathlib import Path
import array, math, random, wave

ROOT = Path(__file__).resolve().parent.parent
RATE = 44100

def sound(name, seconds, seed, kind):
    rng = random.Random(seed)
    samples = []
    low = 0.0
    for i in range(round(seconds * RATE)):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        low += .075 * (noise - low)
        edge = noise - low
        if kind == 'step':
            # A boot heel thud, short soil/grit crunch, then a quiet sole settling.
            heel = math.sin(2*math.pi*(105*t-80*t*t))*math.exp(-t*48)
            grit = edge*math.exp(-t*38)*(.22+.08*math.sin(t*680))
            settle = max(0,t-.032)
            value = .46*heel + grit + (low*1.5*math.exp(-settle*45) if t>.032 else 0)
        elif kind == 'wood':
            body = sum(a*math.sin(2*math.pi*f*t)*math.exp(-d*t) for f,a,d in [(168,.34,30),(438,.20,52),(911,.10,65)])
            crack = edge*.65*math.exp(-t*100)
            chips = low*.9*math.exp(-t*35)*(1+.25*math.sin(t*320))
            value = body + crack + chips
        else:
            metal = sum(a*math.sin(2*math.pi*f*t)*math.exp(-d*t) for f,a,d in [(1763,.16,38),(2741,.12,47),(4219,.07,66)])
            stone = .22*math.sin(2*math.pi*240*t)*math.exp(-t*58)+low*1.2*math.exp(-t*26)
            value = metal + stone + edge*.45*math.exp(-t*140)
        # Fast attack and a smooth tail avoid WAV boundary clicks.
        envelope = min(1,t/.0012)*min(1,(seconds-t)/.025)
        samples.append(value*envelope)
    scale = .78/max(abs(v) for v in samples)
    pcm = array.array('h',(round(max(-1,min(1,v*scale))*32767) for v in samples))
    import sys
    if sys.byteorder != 'little': pcm.byteswap()
    path = ROOT/'assets/audio/effects'/name
    with wave.open(str(path),'wb') as stream:
        stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(RATE);stream.writeframes(pcm.tobytes())
    print(path.relative_to(ROOT),len(samples),'samples')

sound('footstep_boot.wav', .16, 29011, 'step')
sound('chop_wood.wav', .20, 29012, 'wood')
sound('mine_rock.wav', .24, 29013, 'rock')
