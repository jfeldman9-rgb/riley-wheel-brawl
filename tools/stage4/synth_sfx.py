#!/usr/bin/env python3
"""Deterministic Stage 4 synth beds: fogGurgle, towerCrack, screech, croonChord.

Same cue names as src/stage4-sfx.js. This writes 22.05 kHz mono 16-bit WAVs with a
fixed seed so two runs match byte for byte. It does not touch assets/ and it is not a voice.

usage: python3 tools/stage4/synth_sfx.py OUT_DIR
"""
import math
import struct
import sys
import wave
from pathlib import Path

SR = 22050

def env(i, n, attack, release):
    a = int(attack * SR)
    r = int(release * SR)
    if i < a and a:
        return i / a
    if i > n - r and r:
        return max(0.0, (n - i) / r)
    return 1.0

def render(kind, seconds, f0, f1=None, vol=0.2):
    n = int(seconds * SR)
    out = []
    seed = 0x5A17
    phase = 0.0
    for i in range(n):
        u = i / max(1, n - 1)
        freq = f0 if f1 is None else f0 * (f1 / f0) ** u
        e = env(i, n, 0.02, 0.08)
        if kind == 'noise':
            seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
            sample = ((seed / 0xFFFFFFFF) * 2 - 1) * e
            # One-pole lowpass so the gurgle is not white hash.
            prev = out[-1] if out else 0.0
            sample = prev * 0.85 + sample * 0.15
        elif kind == 'saw':
            phase = (phase + freq / SR) % 1
            sample = (2 * phase - 1) * e
        else:
            phase += freq / SR
            sample = math.sin(2 * math.pi * phase) * e
        out.append(max(-1.0, min(1.0, sample * vol)))
    return out

CUES = {
    'fogGurgle': [('noise', 0.62, 220, 80, 0.55), ('sine', 0.58, 74, 52, 0.35)],
    'towerCrack': [('noise', 0.45, 400, 90, 0.7), ('sine', 0.48, 110, 36, 0.55)],
    'screech': [('saw', 0.48, 720, 1680, 0.28), ('sine', 0.42, 1440, 540, 0.18)],
    'croonChord': [('sine', 0.9, 196, None, 0.22), ('sine', 0.9, 247, None, 0.16), ('sine', 0.9, 294, None, 0.14)],
}

def mix(parts):
    n = max(len(render(*p)) for p in parts)
    acc = [0.0] * n
    for part in parts:
        buf = render(*part)
        for i, s in enumerate(buf):
            acc[i] += s
    peak = max(1e-9, max(abs(s) for s in acc))
    scale = 0.7 / peak
    return [max(-1.0, min(1.0, s * scale)) for s in acc]

def write_wav(path, samples):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b''.join(struct.pack('<h', int(max(-1, min(1, s)) * 32767)) for s in samples)
        w.writeframes(frames)

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: synth_sfx.py OUT_DIR')
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name, parts in CUES.items():
        write_wav(out / f'{name}.wav', mix(parts))
        print(name)

if __name__ == '__main__':
    main()
