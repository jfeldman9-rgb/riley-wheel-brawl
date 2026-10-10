#!/usr/bin/env python3
"""Stage 6 music: cut ElevenLabs Music v2.5 takes into seamless game loops.

The raw takes (tools/stage6/music-manifest.json "source") are not shipped. Each track is cut at a beat
(start), runs a whole number of bars, and its last `xfade` seconds are equal-power crossfaded into the audio
just before `start`, so loopEnd flows back into loopStart. The exact loop length is refined (+/- 8 ms)
to the lag where the music after the cut best matches the music after the start, which keeps the drums on
the grid across the seam. Level, peak limiting and the file layout ([last 0.25 s of loop] + loop +
[first 0.25 s of loop], libmp3lame 112k, 44.1 kHz stereo) are the same as tools/music/compose.py.

usage: python3 tools/stage6/loop_music.py RAW_DIR OUT_DIR [stage6|boss6 ...]
RAW_DIR holds the downloaded takes named in TRACKS. Check the result with
  python3 tools/music/check_loops.py OUT_DIR
"""
import json, os, subprocess, sys
import numpy as np
SR = 44100
TRACKS = {
    'stage6': dict(raw='stage6_raw.mp3', start=5.01, bpm=120, bars=36, xfade=0.35, target=-16.0, gain=1,
                   title='The Stone of Tear',
                   doc='Stage 6 fortress infiltration. Martial snare and taiko ostinato, low staccato strings, brass stabs and a tolling harbor bell. Tense and driving, steady from the first bar to the last.'),
    'boss6': dict(raw='boss6_raw.mp3', start=None, bpm=None, bars=None, xfade=0.35, target=-15.2, gain=0.94,
                  title='The Netweaver',
                  doc="Stage 6 boss duel with Be'lal. Dark wordless choir, low string ostinato, war drums and heavy brass. Epic and ominous at full intensity the whole loop."),
}

def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def lufs(x):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    t = p.stderr.decode(); return float(t.split('I:')[-1].split('LUFS')[0]), float(t.split('Peak:')[-1].split('dBFS')[0])

def limit(loop):
    x3 = np.concatenate([loop, loop, loop]).astype(np.float32)
    y = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-af', 'alimiter=limit=0.80:attack=4:release=60:level=0', '-f', 'f32le', '-'],
                       input=x3.tobytes(), capture_output=True, check=True).stdout
    y = np.frombuffer(y, dtype=np.float32).reshape(-1, 2); L = len(loop); return y[L:2 * L].copy()

def refine(x, s0, L, search=0.008, win=1.5):
    m = x.mean(axis=1); W = int(win * SR); a = m[s0:s0 + W]; best = (-2, L)
    for d in range(-int(search * SR), int(search * SR) + 1, 4):
        b = m[s0 + L + d:s0 + L + d + W]
        if len(b) < W: continue
        c = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
        if c > best[0]: best = (c, L + d)
    return best

def build(name, raw_dir, out):
    t = TRACKS[name]; x = decode(os.path.join(raw_dir, t['raw']))
    s0 = int(round(t['start'] * SR)); nominal = int(round(t['bars'] * 4 * 60.0 / t['bpm'] * SR))
    corr, L = refine(x, s0, nominal)
    loop = x[s0:s0 + L].copy(); f = int(t['xfade'] * SR); w = np.linspace(0, 1, f)[:, None]
    loop[-f:] = loop[-f:] * np.cos(w * np.pi / 2) + x[s0 - f:s0] * np.sin(w * np.pi / 2)
    I, _ = lufs(np.concatenate([loop, loop])); loop *= 10 ** ((t['target'] - I) / 20)
    if np.abs(loop).max() > 0.84: loop = limit(loop)
    peak = np.abs(loop).max()
    if peak > 0.84: loop *= 0.84 / peak
    pad = int(0.25 * SR); file = np.concatenate([loop[-pad:], loop, loop[:pad]])
    mp3 = os.path.join(out, f'music-{name}.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '112k', mp3],
                   input=file.astype(np.float32).tobytes(), check=True)
    I2, pk2 = lufs(np.concatenate([loop, loop]))
    return dict(file=os.path.basename(mp3), title=t['title'], target=f'assets/audio/music-{name}.mp3', loopStart=pad / SR,
                loopEnd=round((pad + L) / SR, 6), gain=t['gain'], doc=t['doc'], bpm=t['bpm'], bars=t['bars'],
                loopSeconds=round(L / SR, 6), cutStart=t['start'], seamMatch=round(corr, 3), lufs=round(I2, 1),
                peakDbfs=round(pk2, 1), bytes=os.path.getsize(mp3))

if __name__ == '__main__':
    raw_dir, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    man_path = os.path.join(out, 'music-manifest.json')
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for nm in sys.argv[3:] or list(TRACKS):
        man[nm] = build(nm, raw_dir, out); print(nm, json.dumps({k: v for k, v in man[nm].items() if k != 'doc'}))
    json.dump(man, open(man_path, 'w'), indent=1)
