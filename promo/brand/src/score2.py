# Original trailer-style score, 75 BPM (beat = 0.8s), locked to the picture cuts.
# photo 0-4 | card 4-7.2 | photos 7.2-13.6 | card 13.6-16.8 | photos 16.8-24 | statement (braam) 24 | details 27.2 | logo 33.6
import numpy as np, wave, sys

SR = 44100
DUR = 44.0
N = int(SR * DUR)
dry = np.zeros((N, 2))
wet = np.zeros((N, 2))  # reverb send
rng = np.random.default_rng(9)
BEAT = 0.8

def tt(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)

def put(buf, sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i] * g
    buf[i:i + len(sig), 0] += sig * (1 - max(0, pan))
    buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))

def add(sig, t0, g=1.0, pan=0.0, send=0.3):
    put(dry, sig, t0, g, pan); put(wet, sig, t0, g * send, pan)

def saw(f, t, nh=30, bright=1.0):
    s = np.zeros_like(t)
    for h in range(1, nh + 1):
        if f * h > 9000: break
        s += np.sin(2 * np.pi * f * h * t) / h ** (1.0 + 0.6 / bright)
    return s

def piano(m, d=4.0):
    t = tt(d); f = hz(m); s = np.zeros_like(t)
    for h, a, k in ((1, 1, 1.2), (2, .5, 2.0), (3, .25, 3.0), (4, .12, 4.0), (5, .06, 5.5)):
        s += a * np.sin(2 * np.pi * f * h * 1.0007 ** h * t) * np.exp(-t * k)
    return s * np.minimum(1, t / 0.004) * 0.6

def drone(m, d):
    t = tt(d); s = np.zeros_like(t)
    for det in (-0.06, 0, 0.07):
        s += np.sin(2 * np.pi * hz(m + det) * t) + 0.35 * np.sin(2 * np.pi * hz(m + 12 + det) * t)
    return s / 3 * np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 0.6)

def pulse(m, d):  # short muted low-string 8th
    t = tt(d); return saw(hz(m), t, 14, 0.5) * np.exp(-t * 9) * np.minimum(1, t / 0.008)

def tick():
    t = tt(0.04); return np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t * 160) * 0.3

def taiko():
    t = tt(1.2); f = 60 + 70 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    skin = rng.standard_normal(len(t)) * np.exp(-t * 40) * 0.25
    return body + skin

def whoosh(d=1.0, peak=0.6):
    t = tt(d); n = rng.standard_normal(len(t))
    # crude band-shaping: blend of smoothed and raw noise with a swelling envelope
    k = np.ones(40) / 40; lo = np.convolve(n, k, "same")
    env = np.exp(-((t / d - peak) ** 2) / 0.03)
    return (lo * 3 + np.diff(np.concatenate([[0], n])) * 0.15) * env * 0.5

def riser(d):
    t = tt(d); n = np.diff(rng.standard_normal(len(t) + 1))
    sw = np.sin(2 * np.pi * np.cumsum(120 + 1500 * (t / d) ** 2.2) / SR)
    return (n * 0.25 + sw * 0.18) * (t / d) ** 2.5

def braam(d=4.6):
    t = tt(d); s = np.zeros_like(t)
    bright = 0.6 + 2.5 * np.exp(-t * 1.4)
    for m in (33, 45, 52, 57, 60):  # A1 A2 E3 A3 C4
        for det in (-0.09, 0.0, 0.1):
            f = hz(m + det); ph = 2 * np.pi * f * t
            for h in range(1, 26):
                if f * h > 6000: break
                s += np.sin(ph * h + h) / h ** (1.0 + 0.7 / bright)
    growl = 1 + 0.25 * np.sin(2 * np.pi * 28 * t) * np.exp(-t * 1.2)
    env = np.minimum(1, t / 0.03) * np.exp(-t * 0.75)
    return s * growl * env / 12

# ---- opening on her: drone + sparse piano, room to breathe
add(drone(33, 30.9), 0.0, 0.35, send=0.2)
for tm, m in ((0.4, 69), (1.6, 76), (2.8, 72), (4.0, 74), (5.6, 69), (7.2, 76), (8.8, 72)):
    add(piano(m), tm, 0.3, pan=-0.2 if m > 70 else 0.2, send=0.9)
# ---- pulse from the invitation, building to the statement
for i in range(int((30.8 - 7.2) / (BEAT / 2))):
    tm = 7.2 + i * BEAT / 2
    m = [33, 33, 33, 36][int((tm - 7.2) / 3.2) % 4]
    add(pulse(m, 0.35), tm, 0.12 + 0.36 * (tm - 7.2) / 23.6, send=0.15)
for tm, m in ((11.6, 76), (13.2, 74), (15.6, 72), (18.0, 69)):
    add(piano(m), tm, 0.2, pan=0.3, send=1.0)
for i in range(int((30.8 - 17.6) / (BEAT / 4))):
    add(tick(), 17.6 + i * BEAT / 4, 0.45 if i % 2 else 0.7, pan=0.35 if i % 2 else -0.35, send=0.05)
for i in range(int((30.8 - 20.8) / BEAT)):
    add(taiko(), 20.8 + i * BEAT, 0.42 if i % 2 == 0 else 0.22, send=0.35)
for tm, ch in ((24.0, (53, 57, 60, 65)), (25.6, (55, 59, 62, 67)), (27.2, (57, 60, 64, 69)), (28.8, (55, 59, 62, 67))):
    t = tt(1.7); s = sum(saw(hz(m), t, 12, 0.4) for m in ch) / len(ch)
    add(s * np.minimum(1, t / 0.6) * np.minimum(1, (1.7 - t) / 0.2), tm, 0.35, send=0.6)
for b in (7.2, 11.2, 20.8, 24.0):
    add(whoosh(1.0, 0.6), b - 0.6, 0.55, send=0.3)
add(riser(1.5), 29.5, 0.9, send=0.3)
# ---- statement: silence, then BRAAM + impact
add(braam(), 31.2, 1.0, send=0.5)
t = tt(3.0); add(np.sin(2 * np.pi * np.cumsum(28 + 70 * np.exp(-t * 7)) / SR) * np.exp(-t * 1.6), 31.2, 1.0, send=0.3)
add(taiko(), 31.2, 0.8, send=0.5)
for tm, m in ((32.8, 81), (33.6, 76)):
    add(piano(m), tm, 0.2, send=1.0)
# ---- details + logo: warm resolve (F - C), piano motif, soft final hit
for tm, ch, d in ((34.4, (41, 53, 57, 60, 65), 4.0), (38.4, (36, 48, 55, 64, 67), 5.6)):
    t = tt(d); s = sum(np.sin(2 * np.pi * hz(m) * t) + .3 * np.sin(4 * np.pi * hz(m) * t) for m in ch) / len(ch)
    add(s * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 0.8), tm, 0.35, send=0.7)
for i, m in enumerate((69, 72, 76, 74, 72, 67, 69, 72)):
    add(piano(m, 3.0), 34.8 + i * 0.8, 0.22, pan=(-0.3, 0.3)[i % 2], send=0.9)
add(taiko(), 40.8, 0.5, send=0.6)

# ---- reverb: FFT convolution with a decaying stereo noise impulse (hall-ish)
ir_t = tt(3.2)
out = dry.copy()
L = N + len(ir_t)
nfft = 1 << (L - 1).bit_length()
for ch in range(2):
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.75)
    ir = np.convolve(ir, np.ones(6) / 6, "same")  # soften the highs
    ir /= np.sqrt((ir ** 2).sum())
    rev = np.fft.irfft(np.fft.rfft(wet[:, ch], nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
    out[:, ch] += rev * 0.9

tl = np.arange(N) / SR
# hard trailer silence before the braam
gate = np.ones(N); gate[(tl >= 30.95) & (tl < 31.2)] = 0.0
gate = np.convolve(gate, np.ones(300) / 300, "same")
out *= gate[:, None]
out *= np.minimum(1, (DUR - tl) / 1.2)[:, None]
out = np.tanh(out * 1.6) / np.tanh(1.6)
out /= np.abs(out).max() / 0.9
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
