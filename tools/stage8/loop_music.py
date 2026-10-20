#!/usr/bin/env python3
"""Stage 8 music: cut Jason's Suno v6 Pro takes (A1 stage, B1 boss) into seamless game loops.

Copied from tools/stage6/loop_music.py; only TRACKS, the loop-length source and the peak ceiling differ.

The raw takes (tools/stage8/music-manifest.json "source") are not shipped. Each track is cut at a beat
(start), runs a whole number of bars, and its last `xfade` seconds are equal-power crossfaded into the audio
just before `start`, so loopEnd flows back into loopStart. The exact loop length is refined (+/- 8 ms)
to the lag where the music after the cut best matches the music after the start, which keeps the drums on
the grid across the seam. Level, peak limiting and the file layout ([last 0.25 s of loop] + loop +
[first 0.25 s of loop], libmp3lame 112k, 44.1 kHz stereo) are the same as tools/music/compose.py.

usage: python3 tools/stage8/loop_music.py RAW_DIR OUT_DIR [stage8|boss8 ...]
RAW_DIR holds the downloaded takes named in TRACKS. Check the result with
  python3 tools/music/check_loops.py OUT_DIR
"""
import json, os, subprocess, sys
import numpy as np
SR = 44100
TRACKS = {
    # Suno v6 Pro takes picked by Jason (A1 / B1). Tempo and downbeats were measured on the takes (onset
    # autocorrelation + librosa beat grid, see tools/stage8/music-brief.md), because Suno did not hold the
    # requested 120 / 140 BPM: the stage take runs at ~124.9 BPM (4/4) and the boss take runs at 184 BPM
    # in 3/4. Each window is a whole number of bars that starts on a downbeat and was picked for the smoothest seam
    # (lowest mel-spectrum novelty across loopEnd -> loopStart).
    'stage8': dict(raw='stage8_raw.mp3', start=33.07, bpm=124.9, bars=32, beats_per_bar=4, loop=61.49, frame_align=True, xfade=0.35,
                   target=-16.0, gain=0.90, peak_db=-2.1,
                   title="Asha'man, Kill! (Dumai's Wells)",
                   doc="Stage 8 Dumai's Wells. Nordic folk metal war chant: deep male choir, gang shouts, frame drums and taiko, hurdy-gurdy drone. The loop runs verse -> pre-chorus -> 'Asha'man, kill!' chorus (about 12 s in) -> kulning post-chorus -> bridge -> chorus (39 s) -> bridge -> final chorus (60 s), then the last 'kill!' falls back into the verse."),
    'boss8': dict(raw='boss8_raw.mp3', start=20.70, bpm=184, bars=68, beats_per_bar=3, loop=66.525, xfade=0.35,
                  target=-15.2, gain=0.94, peak_db=-2.1,
                  title='Queen of Love and Beauty',
                  doc="Stage 8 boss duel with Lanfear. Instrumental dark symphonic folk metal in 3/4: soaring wordless soprano, nordic male choir, ostinato, war drums and brass. No lyrics, so nothing fights Lanfear's lines."),
}

def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def lufs(x):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    t = p.stderr.decode(); return float(t.split('I:')[-1].split('LUFS')[0]), float(t.split('Peak:')[-1].split('dBFS')[0])

def limit(loop, ceiling=0.80):
    x3 = np.concatenate([loop, loop, loop]).astype(np.float32)
    y = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-af', f'alimiter=limit={ceiling:.3f}:attack=4:release=60:level=0', '-f', 'f32le', '-'],
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
    s0 = int(round(t['start'] * SR)); nominal = int(round(t['loop'] * SR))  # measured whole-bar length (bars x beats_per_bar beats on the take's own grid)
    corr, L = refine(x, s0, nominal)
    if t.get('frame_align'):  # snap to whole 1152-sample MP3 frames so the encoded overlap pads match the loop edges
        L = int(round(L / 1152)) * 1152
    loop = x[s0:s0 + L].copy(); f = int(t['xfade'] * SR); w = np.linspace(0, 1, f)[:, None]
    loop[-f:] = loop[-f:] * np.cos(w * np.pi / 2) + x[s0 - f:s0] * np.sin(w * np.pi / 2)
    I, _ = lufs(np.concatenate([loop, loop])); loop *= 10 ** ((t['target'] - I) / 20)
    cap = 10 ** (t['peak_db'] / 20)
    if np.abs(loop).max() > cap: loop = limit(loop, cap * 0.95)
    peak = np.abs(loop).max()
    if peak > cap: loop *= cap / peak
    pad = int(0.25 * SR); file = np.concatenate([loop[-pad:], loop, loop[:pad]])
    mp3 = os.path.join(out, f'music-{name}.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '112k', mp3],
                   input=file.astype(np.float32).tobytes(), check=True)
    I2, pk2 = lufs(np.concatenate([loop, loop]))
    return dict(file=os.path.basename(mp3), title=t['title'], target=f'assets/audio/music-{name}.mp3', loopStart=pad / SR,
                loopEnd=round((pad + L) / SR, 6), gain=t['gain'], doc=t['doc'], bpm=t['bpm'], bars=t['bars'], beatsPerBar=t['beats_per_bar'],
                loopSeconds=round(L / SR, 6), cutStart=t['start'], seamMatch=round(corr, 3), lufs=round(I2, 1),
                peakDbfs=round(pk2, 1), bytes=os.path.getsize(mp3))

if __name__ == '__main__':
    raw_dir, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    man_path = os.path.join(out, 'music-manifest.json')
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for nm in sys.argv[3:] or list(TRACKS):
        man[nm] = build(nm, raw_dir, out); print(nm, json.dumps({k: v for k, v in man[nm].items() if k != 'doc'}))
    json.dump(man, open(man_path, 'w'), indent=1)
