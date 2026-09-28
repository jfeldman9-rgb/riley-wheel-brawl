#!/usr/bin/env python3
"""Build assets/audio/music-main.{mp3,ogg} from Jason's Suno track so it loops seamlessly.

  python3 tools/make-music-loop.py path/to/suno.m4a

Loop points were picked with librosa (143.5 BPM beat grid; beat-synchronous chroma+MFCC
similarity over the 16 beats before each candidate, 16-beat phrase aligned) and then
refined to the sample by waveform correlation:
  loopStart = 1371650 samples (31.103 s), loopEnd = 7016442 samples (159.103 s) at 44.1 kHz,
  a 128.0 s / 76-bar loop. The Suno ending (hard stop at ~164.4 s) is trimmed off.
The last 2 bars before loopEnd are equal-power crossfaded into the 2 bars that lead into
loopStart, so jumping loopEnd -> loopStart continues the music with no seam. The game plays
the intro once, then loops [loopStart, loopEnd) sample-exactly with an AudioBufferSourceNode.
"""
import subprocess, sys
import numpy as np

SR, S, E = 44100, 1371650, 7016442
X = int(round(8 * 0.41796 * SR))  # 2 bars at ~143.5 BPM

src = sys.argv[1]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
out = x[:E].copy()
t = np.linspace(0, 1, X, endpoint=False)
out[E - X:E] = x[E - X:E] * np.cos(t * np.pi / 2)[:, None] + x[S - X:S] * np.sin(t * np.pi / 2)[:, None]
pcm = out.astype(np.float32).tobytes()
for dst, codec in (('assets/audio/music-main.mp3', ['-c:a', 'libmp3lame', '-b:a', '128k']),
                   ('assets/audio/music-main.ogg', ['-c:a', 'libvorbis', '-q:a', '3'])):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-'] + codec + [dst],
                   input=pcm, check=True)
    print('wrote', dst)
