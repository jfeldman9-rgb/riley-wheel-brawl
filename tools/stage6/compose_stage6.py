#!/usr/bin/env python3
"""Render music-boss6 by calling tools/music/compose.py (same pattern as tools/stage5/compose_stage5.py).

music-stage6 is an ElevenLabs Music v2.5 take cut into a loop by tools/stage6/loop_music.py. The boss take
could not be generated (the ElevenLabs workspace ran out of credits), so boss6 is composed here with the
Stage 1-5 fluidsynth pipeline. Does not edit compose.py. Needs fluidsynth, ffmpeg,
/usr/share/sounds/sf2/FluidR3_GM.sf2 and midiutil. Loop: 0.25 s to 0.25 + 40 bars @ 132 bpm (72.727 s).

usage: python3 tools/stage6/compose_stage6.py OUT_DIR
Writes music-boss6.mp3 and merges its entry into OUT_DIR/music-manifest.json.
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
        sys.exit(f'Stage 6 music not rendered: {err}. No music files were written.')
    if not shutil.which('fluidsynth') or not os.path.exists(module.SF2):
        sys.exit('Stage 6 music not rendered: fluidsynth or FluidR3_GM.sf2 is missing. No music files were written.')
    return module

def boss6(c):
    """"The Netweaver" - Stage 6 boss duel with Be'lal. C minor. Dark choir, low string ostinato, war drums, taiko-style toms, timpani and heavy brass. 40 bars @ 132 bpm."""
    s = c.Score(132, 40)
    choir = s.part('choir', c.P['choir'], vol=96, pan=64, rev=90)
    voice = s.part('voice', c.P['voice'], vol=72, pan=48, rev=90)
    ost = s.part('ostinato', c.P['strings'], vol=98, pan=72, rev=40)
    cb = s.part('contrabass', c.P['contrabass'], vol=100, pan=60, rev=35)
    bone = s.part('trombone', c.P['trombone'], vol=92, pan=52, rev=60)
    horn = s.part('horns', c.P['horn'], vol=94, pan=40, rev=70)
    tuba = s.part('tuba', c.P['tuba'], vol=90, pan=64, rev=50)
    tim = s.part('timpani', c.P['timpani'], vol=104, pan=64, rev=50)
    dr = s.part('drums', None, ch=9, vol=112, rev=40)
    plan = (['C2', 'C2', 'Ab1', 'Ab1', 'F1', 'G1', 'C2', 'G1'] * 5)
    tri = {'C2': ['C4', 'Eb4', 'G4'], 'Ab1': ['C4', 'Eb4', 'Ab4'], 'F1': ['C4', 'F4', 'Ab4'], 'G1': ['B3', 'D4', 'G4']}
    for bar, r in enumerate(plan):
        b0 = bar * 4; R = c.n(r); t3 = [c.n(x) for x in tri[r]]
        part = 0 if bar < 8 else (1 if bar < 24 else 2)
        # low string ostinato: sixteenth-feel eighths, root / minor sixth / fifth
        for k in range(8):
            p = R + 24 + (0, 0, 8, 0, 7, 0, 8, 7)[k]
            c.add(ost, b0 + k * 0.5, 0.42, p, 100 if k in (0, 3, 6) else 76)
        c.add(cb, b0, 1.9, R + 12, 100); c.add(cb, b0 + 2, 1.9, R + 12, 94)
        # choir: sustained minor triads; gets louder and adds a high voice in the later sections
        c.chord(choir, b0, 3.95, t3, 70 + part * 10)
        if part >= 1: c.add(voice, b0, 3.95, t3[2] + 12, 66 + part * 6)
        # war drums: kicks and low toms, never a hard hit exactly on the loop seam
        for bt, k, v in [(0.02, 'kick', 116), (0.75, 'tomL', 84), (1.5, 'tomF', 96), (2, 'kick', 108), (2.5, 'tomL', 88),
                         (3, 'tomF', 92), (3.5, 'tomM', 80), (3.75, 'tomM', 72)]:
            c.add(dr, b0 + bt, 0.2, c.K[k], v + part * 4)
        if part >= 1:
            for bt in (1, 3): c.add(dr, b0 + bt, 0.15, c.K['snare'], 92)
        c.add(tim, b0, 0.5, R + 12, 108); c.add(tim, b0 + 2.5, 0.25, R + 12, 90); c.add(tim, b0 + 3.5, 0.25, R + 19, 96)
        if bar % 8 == 4 and part >= 1: c.add(dr, b0, 1.5, c.K['crash'], 96)
        # heavy brass hits
        c.chord(bone, b0, 0.9, [R + 12, R + 19], 96); c.chord(bone, b0 + 1.5, 0.45, [R + 12, R + 19], 84)
        c.add(tuba, b0, 1.8, R, 92)
    theme = ('C4! - - - - - Eb4 - G4 - - - F4 - Eb4 - '
             'Ab4! - - - G4 - F4 - Eb4 - - - - - . . '
             'F4! - - - Eb4 - D4 - C4 - - - D4 - Eb4 - '
             'D4! - - - - - - - G3 - - - - - . . ')
    c.seq(horn, 32, theme, 0.5, 96); c.seq(horn, 64, theme, 0.5, 104)
    c.seq(bone, 64, theme, 0.5, 90, transpose=-12)
    c.seq(horn, 96, theme, 0.5, 112); c.seq(voice, 96, theme, 0.5, 84, transpose=12)
    c.seq(horn, 128, 'C5! - - - - - - - Bb4 - - - Ab4 - - - G4! - - - - - - - G4 - Ab4 - B4 - D5 - '
                     'C5! - - - - - - - Eb5 - - - D5 - - - C5 - - - B4 - - - G4 - - - . . . . ', 0.5, 108)
    for t, seed in ((horn, 3), (voice, 4), (dr, 5), (ost, 6)): c.humanize(t, 0.008, 5, seed)
    return s

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: compose_stage6.py OUT_DIR')
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    c = load_compose()
    c.TRACKS['boss6'] = (lambda: boss6(c), -15.2)
    c.TRACKS['boss6'][0].__doc__ = boss6.__doc__
    man_path = os.path.join(out, 'music-manifest.json')
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    man['boss6'] = c.build('boss6', out)
    json.dump(man, open(man_path, 'w'), indent=1)
    print('rendered boss6', json.dumps({k: v for k, v in man['boss6'].items() if k != 'doc'}))

if __name__ == '__main__':
    main()
