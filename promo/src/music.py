# Original 120 BPM track for the promo. 1 bar = 2s; cuts land on bar lines.
import numpy as np, wave, sys

SR = 44100
DUR = 26.0
N = int(SR * DUR)
out = np.zeros((N, 2))
rng = np.random.default_rng(3)
BEAT = 0.5

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    out[i:i + len(sig), 0] += sig * (1 - max(0, pan))
    out[i:i + len(sig), 1] += sig * (1 + min(0, pan))

def tt(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)

def kick():
    t = tt(0.45); f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)

def hat(d=0.05):
    t = tt(d); n = np.diff(rng.standard_normal(len(t) + 1))
    return n * np.exp(-t * 90) * 0.25

def clap():
    t = tt(0.25); n = rng.standard_normal(len(t))
    env = np.exp(-t * 18) + 0.6 * np.exp(-((t - 0.012) ** 2) / 1e-5)
    return np.diff(np.concatenate([[0], n])) * env * 0.35

def pad(notes, d):
    t = tt(d); s = np.zeros_like(t)
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            f = hz(m + det)
            for h, a in ((1, 1), (2, .35), (3, .15), (4, .07)):
                s += a * np.sin(2 * np.pi * f * h * t + rng.random() * 6)
    env = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.3)
    return s * env / (len(notes) * 4)

def pluck(m, d=0.35):
    t = tt(d); f = hz(m)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 11)

def bass(m, d):
    t = tt(d); f = hz(m)
    s = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)
    return s * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)

def riser(d):
    t = tt(d); n = np.diff(rng.standard_normal(len(t) + 1))
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1800 * (t / d) ** 2) / SR)
    return (n * 0.15 + sweep * 0.12) * (t / d) ** 2

def impact():
    t = tt(1.8)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    crash = np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t * 3) * 0.25
    return boom + crash

# Am - F - C - G (MIDI), one chord per bar
CH = [[57, 60, 64], [53, 57, 60], [48, 55, 60, 64], [55, 59, 62]]
ROOT = [45, 41, 48, 43]

for bar in range(13):
    t0 = bar * 2.0
    ch = CH[bar % 4]
    pg = 0.5 if bar == 0 else 0.35
    add(pad([n + 12 for n in ch], 2.05), t0, pg)
    # drums & bass only once the story starts (t>=2), drop out for the end card tail
    if 1 <= bar <= 9:
        for b in range(4):
            add(kick(), t0 + b * BEAT, 0.9)
        add(bass(ROOT[bar % 4], 2.0), t0, 0.32)
    if 3 <= bar <= 9:
        for b in range(8):
            if b % 2: add(hat(), t0 + b * BEAT / 2, 0.8, pan=0.3)
    if 5 <= bar <= 8:
        add(clap(), t0 + 0.5, 0.9); add(clap(), t0 + 1.5, 0.9)
    if bar >= 5:
        arp = ch + [ch[1] + 12]
        for s in range(16):
            add(pluck(arp[s % len(arp)] + 12), t0 + s * BEAT / 4, 0.16 if bar < 10 else 0.1, pan=-0.4 if s % 2 else 0.4)

add(riser(1.0), 17.0, 0.8)           # build into the word-slam
for k, tk in enumerate((18.0, 18.5, 19.0)):
    add(kick(), tk, 1.0); add(impact()[: int(0.5 * SR)], tk, 0.5)
add(impact(), 20.0, 0.9)              # end card lands
for b in range(4): add(kick(), 20 + b * BEAT, 0.5)

# sidechain-ish duck under kicks (bars 1-9)
t = np.arange(N) / SR
ph = (t % BEAT) / BEAT
duck = np.where((t >= 2) & (t < 20), 0.55 + 0.45 * np.minimum(1, ph * 3), 1.0)
out *= duck[:, None] ** 0.6

fade = np.minimum(1, (DUR - t) / 3.0)[:, None]
out *= fade * np.minimum(1, t / 0.05)[:, None]
out = np.tanh(out * 1.4)
out /= np.abs(out).max() / 0.89
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
