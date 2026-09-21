"""Original soft shoe-on-floor contact, offline PCM WAV. No runtime synthesis.

Rebuild: python tools/soft-footstep.py
Low-pass sole friction and a rounded contact; no gravel crackle or metallic edge.
"""
from pathlib import Path
import array
import math
import random
import sys
import wave

RATE = 44100
DURATION = .14
rng = random.Random(29022)
low = smooth = bass = 0.0
samples = []
alpha = 1 - math.exp(-2 * math.pi * 900 / RATE)
bass_alpha = 1 - math.exp(-2 * math.pi * 85 / RATE)
for i in range(round(RATE * DURATION)):
    t = i / RATE
    low += alpha * (rng.uniform(-1, 1) - low)
    smooth += alpha * (low - smooth)
    bass += bass_alpha * (smooth - bass)
    # The contact rolls on over 6 ms, then decays as the sole takes the weight.
    onset = (1 - math.exp(-t / .006)) ** 2
    envelope = onset * math.exp(-t / .027)
    sole = (smooth - bass) * 3.4
    floor = .07 * math.sin(2 * math.pi * 185 * t) * math.exp(-t / .018)
    tail = min(1, (DURATION - 1 / RATE - t) / .025)
    samples.append((sole * envelope + floor * onset) * max(0, tail))

scale = .55 / max(abs(x) for x in samples)
pcm = array.array('h', (round(x * scale * 32767) for x in samples))
if sys.byteorder != 'little':
    pcm.byteswap()
target = Path(__file__).resolve().parent.parent / 'assets/audio/effects/footstep_soft_floor.wav'
with wave.open(str(target), 'wb') as sound:
    sound.setnchannels(1)
    sound.setsampwidth(2)
    sound.setframerate(RATE)
    sound.writeframes(pcm.tobytes())
print(target.name, len(samples), 'samples')
