#!/usr/bin/env python3
"""Render music-stage4 and music-boss4 by calling tools/music/compose.py.

Does not edit compose.py. Registers two scores on its TRACKS table and uses compose.build,
which needs fluidsynth, ffmpeg, /usr/share/sounds/sf2/FluidR3_GM.sf2, and midiutil.
If those are missing this exits before writing audio. It does not invent a loop.

usage: python3 tools/stage4/compose_stage4.py OUT_DIR
"""
import importlib.util
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def load_compose():
    path = ROOT / 'tools' / 'music' / 'compose.py'
    spec = importlib.util.spec_from_file_location('rwb_compose', path)
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except ModuleNotFoundError as err:
        sys.exit(f'Stage 4 music not rendered: {err}. No music files were written.')
    if not shutil.which('fluidsynth') or not os.path.exists(module.SF2):
        sys.exit('Stage 4 music not rendered: fluidsynth or FluidR3_GM.sf2 is missing. No music files were written.')
    return module

def stage4(compose):
    """"Shadar Logoth" - Stage 4. E phrygian, hollow and slow. 16 bars @ 96 bpm."""
    s = compose.Score(96, 16)
    pad = s.part('strings', compose.P['slowstr'], vol=78, pan=60, rev=80)
    harp = s.part('harp', compose.P['harp'], vol=70, pan=48, rev=70)
    lo = s.part('cello', compose.P['cello'], vol=90, pan=78, rev=50)
    fl = s.part('flute', compose.P['flute'], vol=64, pan=58, rev=75)
    roots = ['E2', 'F2', 'E2', 'D2'] * 4
    for bar, root in enumerate(roots):
        b0 = bar * 4
        compose.add(lo, b0, 3.6, root, 84)
        compose.chord(pad, b0, 3.8, [root, 'B3', 'E4'], 52)
        for k, step in enumerate((0, 7, 12, 15, 12, 7, 3, 0)):
            compose.add(harp, b0 + k * 0.5, 0.7, compose.n(root) + 12 + step, 60 if k % 2 else 74)
    compose.seq(fl, 16, 'B4 - - - C5 - B4 - A4 - G4 - E4 - - - B4 - - - A4 - G4 - E4 - - - - - - -', 0.5, 78)
    compose.humanize(harp, seed=4)
    return s

def boss4(compose):
    """"The Draghkar's Croon" - Stage 4 boss. A minor pulse under a high line. 16 bars @ 126 bpm."""
    s = compose.Score(126, 16)
    pulse = s.part('strings', compose.P['strings'], vol=96, pan=64, rev=40)
    choir = s.part('choir', compose.P['choir'], vol=80, pan=64, rev=85)
    croon = s.part('flute', compose.P['flute'], vol=86, pan=70, rev=78)
    dr = s.part('drums', None, ch=9, vol=100, rev=35)
    for bar in range(16):
        b0 = bar * 4
        root = 'A2' if bar % 4 < 3 else 'F2'
        compose.add(pulse, b0, 0.45, root, 100)
        compose.add(pulse, b0 + 2, 0.45, root, 88)
        compose.chord(choir, b0, 3.6, ['A3', 'C4', 'E4'], 60 if bar < 8 else 74)
        compose.add(dr, b0, 0.2, compose.K['kick'], 110)
        compose.add(dr, b0 + 1.5, 0.12, compose.K['snare'], 70)
        compose.add(dr, b0 + 2, 0.2, compose.K['kick'], 96)
        compose.add(dr, b0 + 3, 0.12, compose.K['hat'], 60)
    compose.seq(croon, 0, 'E5 - - - D5 - C5 - B4 - - - A4 - - - C5 - D5 - E5 - - - - - - -', 0.5, 90)
    compose.seq(croon, 32, 'A5 - - - G5 - E5 - D5 - C5 - B4 - - - A4 - - - - - - -', 0.5, 96)
    return s

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: compose_stage4.py OUT_DIR')
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    compose = load_compose()
    # Bind the scores without editing compose.py. build() looks them up on TRACKS.
    compose.TRACKS['stage4'] = (lambda: stage4(compose), -16.0)
    compose.TRACKS['boss4'] = (lambda: boss4(compose), -15.2)
    compose.TRACKS['stage4'][0].__doc__ = stage4.__doc__
    compose.TRACKS['boss4'][0].__doc__ = boss4.__doc__
    man = {name: compose.build(name, out) for name in ('stage4', 'boss4')}
    json.dump(man, open(os.path.join(out, 'music-manifest.json'), 'w'), indent=1)
    print('rendered', ', '.join(man))

if __name__ == '__main__':
    main()
