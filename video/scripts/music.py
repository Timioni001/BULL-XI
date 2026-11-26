"""
Original score for the BULL-XI film, synthesised from scratch (no samples, no
paid APIs), then mixed with the narration with gentle ducking.

    python3 scripts/music.py   ->  public/audio/music.wav, public/audio/mix.wav

Structure follows src/timeline.json:
  open, question   felt piano + warm pad + air        (cream / dark intro)
  title            low boom + shimmer swell            (logo)
  squad..record    pulse: kick, sub, hats, pluck arps  (product)
  everyone, close  drums drop out, wide pad swell, final chord
Whooshes lead into every scene change.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
rng = np.random.default_rng(7)

tl = json.loads((ROOT / "src/timeline.json").read_text())
FPS = tl["fps"]
DUR = tl["seconds"] + 2.0
N = int(DUR * SR)
scene = {s["id"]: (s["start"] / FPS, s["frames"] / FPS) for s in tl["scenes"]}

BPM = 84
BEAT = 60 / BPM

left = np.zeros(N)
right = np.zeros(N)


def note_hz(n):  # midi -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def env(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, sustain, na)
    nr = max(1, int(r * SR))
    if nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    left[i : i + len(sig)] += sig * gain * l
    right[i : i + len(sig)] += sig * gain * r


# ------------------------------------------------------------------ voices

def piano(midi, length=3.5, vel=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = note_hz(midi)
    out = np.zeros(n)
    for k, amp in enumerate([1.0, 0.45, 0.22, 0.12, 0.06, 0.03], start=1):
        fk = f * k * (1 + 0.0004 * k * k)  # slight inharmonicity
        out += amp * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.2 + 0.9 * k))
    out *= np.minimum(1, t / 0.004)  # soft hammer
    felt = lp(rng.standard_normal(n) * np.exp(-t * 60), 2500) * 0.05
    return (out + felt) * vel * 0.32


def pad(midis, length, bright=900, attack=1.8, release=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in midis:
        for det in (-0.08, 0.0, 0.07):
            f = note_hz(m) * 2 ** (det / 12)
            ph = rng.uniform(0, 1)
            saw = 2 * ((f * t + ph) % 1) - 1
            out += saw
    out = lp(out / (3 * len(midis)), bright, 4)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.23 * t)
    return out * env(n, attack, release) * trem * 0.5


def sub(midi, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = note_hz(midi)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * env(n, 0.01, 0.12) * np.exp(-t * 0.6) * 0.45


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = lp(rng.standard_normal(n) * np.exp(-t * 300), 3000) * 0.25
    return (body + click) * 0.85


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7000, 4) * np.exp(-t * (14 if open_ else 70))
    return s * 0.12


def pluck(midi, vel=1.0):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = note_hz(midi)
    s = (2 * ((f * t) % 1) - 1) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
    s = lp(s * np.exp(-t * 9), 2400, 2)
    return s * vel * 0.16


def whoosh(length=1.0, up=True):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # sweep a band-pass by filtering in chunks
    out = np.zeros(n)
    chunks = 24
    for c in range(chunks):
        a, b = c * n // chunks, (c + 1) * n // chunks
        k = c / (chunks - 1)
        fc = 300 * (20 ** (k if up else 1 - k))
        out[a:b] = sosfilt(butter(2, [fc * 0.6, min(fc * 1.6, 18000)], "band", fs=SR, output="sos"), x[a:b])
    shape = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 2
    return out * shape * 0.16


def boom():
    n = int(4.0 * SR)
    t = np.arange(n) / SR
    f = 38 + 40 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    s += lp(rng.standard_normal(n) * np.exp(-t * 3), 400) * 0.25
    return s * 0.9


def shimmer(midis, length=4.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in midis:
        out += np.sin(2 * np.pi * note_hz(m) * t + rng.uniform(0, 6)) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(3, 6) * t))
    return out / len(midis) * env(n, 1.2, 2.0) * 0.12


# ------------------------------------------------------------------ harmony
# D minor: Dm - Bb - F - C  (i  VI  III  VII), one chord per bar of 4 beats
CHORDS = [
    (50, [62, 65, 69, 74]),  # Dm
    (46, [58, 62, 65, 70]),  # Bb
    (41, [57, 60, 65, 69]),  # F
    (48, [55, 60, 64, 67]),  # C
]
BAR = 4 * BEAT

# Intro: open + question (piano + pad + air)
intro_end = scene["title"][0]
t = 0.3
bar = 0
while t < intro_end - 0.5:
    root, ch = CHORDS[bar % 4]
    add(pad([m - 12 for m in ch[:3]], BAR + 2.5, bright=700, attack=2.2), t, 0.55)
    # sparse piano: a broken chord, a little rubato
    for k, m in enumerate([ch[0], ch[2], ch[1] + 12, ch[3]]):
        add(piano(m, 4.0, vel=0.9 - 0.12 * k), t + k * BEAT * 0.98 + rng.uniform(0, 0.03), pan=-0.3 + 0.2 * k)
    t += BAR
    bar += 1
air = hp(rng.standard_normal(int(intro_end * SR)), 5000) * 0.012
add(air * env(len(air), 2, 2), 0)

# Title: boom + shimmer swell
t_title = scene["title"][0]
add(whoosh(1.4, up=True), t_title - 1.3, 1.0)
add(boom(), t_title, 0.9)
add(shimmer([74, 77, 81, 86], 5.0), t_title, 1.0)
add(pad([50, 57, 62, 65], scene["title"][1] + 1.5, bright=1400, attack=0.4), t_title, 0.5)

# Product section: groove from squad to record
g0 = scene["squad"][0]
g1 = scene["everyone"][0]
t = g0
bar = 0
while t < g1 - 0.01:
    root, ch = CHORDS[bar % 4]
    build = min(1.0, (t - g0) / 12)  # drums fade in over the first scenes
    add(pad(ch, BAR + 1.5, bright=1100 + 500 * build, attack=0.8, release=1.5), t, 0.42)
    for b in range(4):
        tb = t + b * BEAT
        if tb >= g1:
            break
        add(kick(), tb, 0.55 + 0.3 * build)
        add(sub(root - 12, BEAT * 0.95), tb, 0.6)
        add(hat(), tb + BEAT / 2, 0.6 + 0.5 * build, pan=0.3)
        if b == 3:
            add(hat(True), tb + BEAT * 0.75, 0.4 * build, pan=-0.3)
        # 16th pluck arpeggio, quiet, ping-pong
        for s16 in range(4):
            m = ch[(b * 4 + s16) % 4] + 12
            add(pluck(m, vel=0.55 + 0.35 * build * (s16 % 2 == 0)), tb + s16 * BEAT / 4, pan=0.5 if s16 % 2 else -0.5)
    t += BAR
    bar += 1

# Whooshes into each product scene change
for sid in ["squad", "pick", "seal", "points", "golden", "hourly", "record", "everyone", "close"]:
    add(whoosh(0.9, up=True), scene[sid][0] - 0.8, 0.9)

# Outro: drums drop, wide swell, final chord
o0 = scene["everyone"][0]
add(boom(), o0, 0.6)
add(pad([38, 50, 57, 62, 65, 69], DUR - o0, bright=1800, attack=1.5, release=3.5), o0, 0.6)
add(shimmer([74, 77, 81, 86, 89], DUR - o0), o0, 1.2)
c0 = scene["close"][0]
for k, m in enumerate([50, 57, 62, 65, 69, 74]):
    add(piano(m, 6.0, vel=0.8), c0 + 0.6 + k * 0.05)

# ------------------------------------------------------------------ space + master
def reverb(x, secs=2.6, mix=0.22):
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 3.0 / secs * 2.3)
    ir = lp(ir, 6000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return x * (1 - mix) + wet * mix * np.max(np.abs(x))


left = reverb(left)
right = reverb(right)
music = np.stack([left, right], axis=1)
music /= np.max(np.abs(music)) + 1e-9
music *= 0.8
fade = int(2.0 * SR)
music[-fade:] *= np.linspace(1, 0, fade)[:, None]


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    data = (x * 32767).astype(np.int16)
    import wave

    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


audio = ROOT / "public/audio"
write_wav(audio / "music.wav", music)

# ------------------------------------------------------------------ narration + ducking
voice = np.zeros(N)
for s in tl["scenes"]:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(audio / "vo" / f"{s['voice']}.mp3"), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
        capture_output=True,
        check=True,
    ).stdout
    v = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32767
    i = int(s["voiceAt"] / FPS * SR)
    voice[i : i + len(v)] += v[: max(0, N - i)]

# warm the voice a little and normalise
voice = hp(voice, 70)
voice /= np.max(np.abs(voice)) + 1e-9
voice *= 0.92

# sidechain: music down ~8 dB under speech, smooth attack/release
level = np.abs(voice)
win = int(0.12 * SR)
level = np.convolve(level, np.ones(win) / win, mode="same")
duck = 1 - 0.6 * np.clip(level / 0.05, 0, 1)
duck = np.convolve(duck, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
mix = music * duck[:, None] * 0.9 + voice[:, None] * np.array([[0.98, 0.98]])
mix /= max(1.0, np.max(np.abs(mix)) / 0.97)
write_wav(audio / "mix.wav", mix)
print("music", round(DUR, 1), "s -> music.wav, mix.wav")
