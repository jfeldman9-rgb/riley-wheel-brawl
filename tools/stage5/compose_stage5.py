#!/usr/bin/env python3
"""Render music-stage5 and music-boss5 by calling tools/music/compose.py.

Same pattern as tools/stage4/compose_stage4.py. Does not edit compose.py. Needs fluidsynth, ffmpeg,
/usr/share/sounds/sf2/FluidR3_GM.sf2, and midiutil. Loop lengths match MUSIC in src/audio.js:
stage5 0.25-40.25 s (16 bars @ 96 bpm), boss5 0.25-32 s (16 bars @ 3840/31.75 bpm = 31.75 s).

usage: python3 tools/stage5/compose_stage5.py OUT_DIR
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
        sys.exit(f'Stage 5 music not rendered: {err}. No music files were written.')
    if not shutil.which('fluidsynth') or not os.path.exists(module.SF2):
        sys.exit('Stage 5 music not rendered: fluidsynth or FluidR3_GM.sf2 is missing. No music files were written.')
    return module

def stage5(c):
    """"The Blight" - Stage 5. D minor/phrygian brass drone, war drums, tremolo strings. 16 bars @ 96 bpm."""
    s = c.Score(96, 16)
    tuba = s.part('tuba', c.P['tuba'], vol=92, pan=64, rev=55)
    bone = s.part('trombone', c.P['trombone'], vol=80, pan=52, rev=65)
    trem = s.part('trem', c.P['trem'], vol=74, pan=76, rev=70)
    cb = s.part('contrabass', c.P['contrabass'], vol=84, pan=70, rev=50)
    horn = s.part('horn', c.P['horn'], vol=70, pan=44, rev=80)
    dr = s.part('drums', None, ch=9, vol=104, rev=45)
    roots = ['D2', 'D2', 'Eb2', 'D2', 'D2', 'C2', 'Eb2', 'D2'] * 2
    for bar, root in enumerate(roots):
        b0 = bar * 4
        c.add(tuba, b0, 3.9, root, 88)
        c.add(cb, b0, 3.9, c.n(root) + 12, 70)
        c.chord(bone, b0, 3.8, [c.n(root) + 12, c.n(root) + 19], 64 + (bar % 4) * 4)
        # distorted-feeling strings: minor second rub, tremolo
        c.chord(trem, b0, 1.9, [c.n(root) + 26, c.n(root) + 27], 58)
        c.chord(trem, b0 + 2, 1.9, [c.n(root) + 24, c.n(root) + 25], 62)
        # even war-drum bed on the off-beats, so the loop seam (beat 0) is never a hit
        for k in range(8):
            c.add(dr, b0 + k * 0.5 + 0.25, 0.15, c.K['tomF'] if k % 2 else c.K['tomL'], 78 if k % 4 == 1 else 64)
        c.add(dr, b0 + 1.0, 0.3, c.K['kick2'], 96)
        c.add(dr, b0 + 3.0, 0.3, c.K['kick2'], 90)
    c.seq(horn, 16, 'D4 - - - - - Eb4 - D4 - - - C4 - - - A3 - - - - - - - . . . . . . . .', 0.5, 70)
    c.seq(horn, 48, 'F4 - - - Eb4 - D4 - - - - - Eb4 - - - D4 - - - - - - - . . . . . . . .', 0.5, 74)
    c.humanize(dr, seed=5)
    return s

def boss5(c):
    """"The Eye" - Stage 5 boss. Choir swell for the Eye over a heartbeat; the pulse doubles in bars 9-16 (phase 3). 16 bars @ ~120.9 bpm."""
    s = c.Score(3840 / 31.75, 16)
    choir = s.part('choir', c.P['choir'], vol=92, pan=64, rev=90)
    voice = s.part('voice', c.P['voice'], vol=74, pan=50, rev=90)
    st = s.part('strings', c.P['strings'], vol=84, pan=74, rev=60)
    cb = s.part('contrabass', c.P['contrabass'], vol=90, pan=64, rev=45)
    dr = s.part('drums', None, ch=9, vol=110, rev=30)
    prog = [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['E3', 'G#3', 'B3']] * 4
    for bar, ch in enumerate(prog):
        b0 = bar * 4
        swell = 56 + (bar % 4) * 8 + (10 if bar >= 8 else 0)
        c.chord(choir, b0, 3.9, ch, swell)
        c.add(voice, b0, 3.9, c.n(ch[2]) + 12, swell - 6)
        c.add(cb, b0, 3.9, c.n(ch[0]) - 12, 86)
        if bar < 8:   # slow heartbeat: lub-dub once per two beats
            for b in (0.5, 2.5):
                c.add(dr, b0 + b, 0.2, c.K['kick'], 108); c.add(dr, b0 + b + 0.35, 0.2, c.K['kick2'], 84)
            c.chord(st, b0, 1.9, [c.n(ch[0]), c.n(ch[1])], 56); c.chord(st, b0 + 2, 1.9, [c.n(ch[0]), c.n(ch[1])], 56)
        else:         # Aginor taking it: pulse doubles, strings drive eighths
            for b in (0.5, 1.5, 2.5, 3.5):
                c.add(dr, b0 + b, 0.18, c.K['kick'], 114); c.add(dr, b0 + b + 0.3, 0.18, c.K['kick2'], 92)
            for k in range(8):
                c.add(st, b0 + k * 0.5, 0.42, c.n(ch[0]) + (12 if k % 2 else 0), 78)
    return s

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: compose_stage5.py OUT_DIR')
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    c = load_compose()
    c.TRACKS['stage5'] = (lambda: stage5(c), -16.0)
    c.TRACKS['boss5'] = (lambda: boss5(c), -15.2)
    c.TRACKS['stage5'][0].__doc__ = stage5.__doc__
    c.TRACKS['boss5'][0].__doc__ = boss5.__doc__
    man = {name: c.build(name, out) for name in ('stage5', 'boss5')}
    json.dump(man, open(os.path.join(out, 'music-manifest.json'), 'w'), indent=1)
    print('rendered', ', '.join(man))

if __name__ == '__main__':
    main()
