"""Verify each generated music file loops seamlessly at its manifest loop points.
Decodes the MP3 like a browser would, then checks (1) the jump loopEnd -> loopStart is no bigger than the
track's normal sample-to-sample movement and (2) the audio right after loopEnd matches the audio right after
loopStart (the file carries 0.25 s of overlap on both sides, so any small decoder offset still loops cleanly)."""
import json, os, subprocess, sys
import numpy as np
SR = 44100
def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
def check(d):
    man = json.load(open(os.path.join(d, 'music-manifest.json'))); ok = True
    for k, m in man.items():
        x = decode(os.path.join(d, m['file'])); a = int(round(m['loopStart'] * SR)); b = int(round(m['loopEnd'] * SR))
        steps = np.abs(np.diff(x[a:b], axis=0)).max(axis=1); p99 = float(np.percentile(steps, 99.9))
        jump = float(np.abs(x[a] - x[b - 1]).max())
        N = int(0.2 * SR); u = x[b:b + N].ravel(); v = x[a:a + N].ravel()
        corr = float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))
        good = jump <= p99 and corr >= 0.98; ok &= good
        print(f"{k:7s} loop {m['loopSeconds']:.2f}s  seam jump {jump:.4f} (p99.9 step {p99:.4f})  overlap corr {corr:.4f}  {'OK' if good else 'FAIL'}")
    return ok
if __name__ == '__main__':
    sys.exit(0 if check(sys.argv[1]) else 1)
