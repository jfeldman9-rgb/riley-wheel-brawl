#!/usr/bin/env python3
"""Original music for Riley Wheel Brawl 2.0, written as code (no samples of existing recordings).

Each track is a short score below (notes typed by hand / generated from the chord plan here), written to
MIDI with midiutil and rendered offline with FluidSynth + FluidR3_GM.sf2 (Frank Wen, MIT licence).
Loop construction: the loop body is rendered three times in a row and the MIDDLE copy is kept, so its
start already carries the reverb/release tails of the previous pass and its end flows into the next.
A 40 ms equal-power seam fade (end of the loop into the audio just before it) removes any residual click.
Files ship as [last 0.25 s of loop] + loop + [first 0.25 s of loop] so the in-game loop points
(loopStart = 0.25 s, loopEnd = 0.25 s + loop length) stay seamless even if an MP3 decoder shifts the
start by a few milliseconds. Output: loudness-normalised MP3 + a manifest with exact loop points.

usage: compose.py OUT_DIR [track ...]      (needs fluidsynth, ffmpeg, /usr/share/sounds/sf2/FluidR3_GM.sf2)
"""
import sys, os, json, subprocess, math, random
import numpy as np
from midiutil import MIDIFile

SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 44100
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def n(s):
    """'C4' 'F#3' 'Bb2' -> midi number"""
    s = s.strip(); p = NOTE[s[0]]; i = 1
    while i < len(s) and s[i] in '#b': p += 1 if s[i] == '#' else -1; i += 1
    return 12 * (int(s[i:]) + 1) + p
# GM programs (0-based)
P = dict(harp=46, strings=48, slowstr=49, pizz=45, trem=44, cello=42, contrabass=43, violin=40, fiddle=110, flute=73,
         whistle=78, recorder=74, horn=60, trumpet=56, trombone=57, tuba=58, brass=61, choir=52, voice=53, timpani=47,
         nylon=24, steelgtr=25, oboe=68, clarinet=71, bassoon=70, celesta=8, glock=9, bagpipe=109, warmpad=89, harpsi=6)
# GM drum keys
K = dict(kick=36, kick2=35, snare=38, rim=37, side=37, clap=39, hat=42, ohat=46, crash=49, ride=51, tomL=41, tomM=45, tomH=48,
         tomF=43, tamb=54, cymroll=49, bongoL=61, bongoH=60, congaL=64, congaH=63, shaker=70, wood=76)

class Score:
    def __init__(self, bpm, bars, beats=4):
        self.bpm, self.bars, self.beats = bpm, bars, beats
        self.tracks = []          # (name, program, channel, notes[(beat, dur, pitch, vel)])
    def part(self, name, prog, ch=None, vol=100, pan=64, rev=40, cho=0):
        ch = len([t for t in self.tracks if t['ch'] != 9]) if ch is None else ch
        if ch == 9 and prog is not None: pass
        t = dict(name=name, prog=prog, ch=ch, notes=[], vol=vol, pan=pan, rev=rev, cho=cho); self.tracks.append(t); return t
    @property
    def length_beats(self): return self.bars * self.beats
    def midi(self, repeats):
        m = MIDIFile(len(self.tracks), deinterleave=False, adjust_origin=False)
        L = self.length_beats
        for ti, t in enumerate(self.tracks):
            m.addTempo(ti, 0, self.bpm)
            if t['ch'] != 9: m.addProgramChange(ti, t['ch'], 0, t['prog'])
            for cc, v in ((7, t['vol']), (10, t['pan']), (91, t['rev']), (93, t['cho'])): m.addControllerEvent(ti, t['ch'], 0, cc, v)
            for r in range(repeats):
                for (b, d, p, v) in t['notes']:
                    if 0 <= p <= 127: m.addNote(ti, t['ch'], int(p), r * L + b, max(0.02, d), int(max(1, min(127, v))))
        return m

def add(t, beat, dur, pitch, vel=90):
    if isinstance(pitch, str): pitch = n(pitch)
    t['notes'].append((beat, dur, pitch, vel))
def chord(t, beat, dur, pitches, vel=80, spread=0.0):
    for i, p in enumerate(pitches): add(t, beat + i * spread, dur, p, vel)
def seq(t, start, text, beat_len=0.5, vel=92, legato=0.95, transpose=0):
    """'D5 . F5 A5 - - G5' : each token = one step of beat_len; '-' extends the previous note, '.' is a rest."""
    toks = text.split(); i = 0; b = start
    while i < len(toks):
        tk = toks[i]; j = i + 1
        while j < len(toks) and toks[j] == '-': j += 1
        steps = j - i
        if tk not in ('.', '-'):
            v = vel
            if tk.endswith('!'): tk = tk[:-1]; v = min(127, vel + 18)
            add(t, b, steps * beat_len * legato, n(tk) + transpose, v)
        b += steps * beat_len; i = j
    return b
def humanize(t, timing=0.012, vel=6, seed=1):
    rnd = random.Random(seed); out = []
    for (b, d, p, v) in t['notes']:
        out.append((max(0, b + rnd.uniform(-timing, timing)) if b > 0 else b, d, p, v + rnd.randint(-vel, vel)))
    t['notes'] = out

# ------------------------------------------------------------------ tracks
def title():
    """"The Wheel Turns" - title / menu / story-card theme. D dorian, gentle and heroic. 16 bars @ 84 bpm."""
    s = Score(84, 16)
    harp = s.part('harp', P['harp'], vol=92, pan=50, rev=70)
    pad = s.part('strings', P['slowstr'], vol=78, pan=64, rev=80)
    cel = s.part('cello', P['cello'], vol=86, pan=80, rev=60)
    wh = s.part('whistle', P['whistle'], vol=88, pan=60, rev=75)
    fl = s.part('flute', P['flute'], vol=70, pan=40, rev=80)
    hn = s.part('horn', P['horn'], vol=72, pan=70, rev=75)
    dr = s.part('drums', None, ch=9, vol=70, rev=40)
    prog = [('D3', ['D4', 'F4', 'A4']), ('C3', ['C4', 'E4', 'G4']), ('Bb2', ['Bb3', 'D4', 'F4']), ('C3', ['C4', 'E4', 'G4']),
            ('D3', ['D4', 'F4', 'A4']), ('F3', ['F3', 'A3', 'C4']), ('G3', ['G3', 'B3', 'D4']), ('A2', ['A3', 'C#4', 'E4'])] * 2
    for bar, (root, tri) in enumerate(prog):
        b0 = bar * 4
        # harp: rolling 8th arpeggio up two octaves and back
        r = n(root) + 12; tones = [n(x) for x in tri]
        pat = [r, tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[0]]
        for k, p in enumerate(pat): add(harp, b0 + k * 0.5, 0.9, p, 74 if k % 4 else 86)
        chord(pad, b0, 3.95, tones, 58 if bar < 8 else 66)
        add(cel, b0, 1.9, n(root), 78); add(cel, b0 + 2, 1.9, n(root) + 7 if bar % 2 else n(root), 70)
        if bar >= 8: add(dr, b0, 0.4, K['tomL'], 52); add(dr, b0 + 2.5, 0.3, K['tomL'], 38); add(dr, b0 + 3, 0.3, K['tomM'], 44)
        if bar in (7, 15): add(dr, b0 + 3.5, 0.2, K['tomH'], 50)
    # whistle melody (bars 1-8), answered by horn + flute in bars 9-16
    m1 = ('A4 - - - D5 - E5 - F5 - - E5 D5 - C5 - '
          'D5 - - - - - . . A4 - C5 - D5 - E5 - '
          'F5 - - - G5 - F5 - E5 - D5 - C5 - A4 - '
          'D5 - - - - - - - . . . . E5 - C#5 - ')
    seq(wh, 0, m1, 0.5, 90)
    seq(wh, 16, m1.replace('E5 - C#5 -', 'E5 - - -'), 0.5, 96)
    m2 = 'D4 - - - - - - - C4 - - - - - - - Bb3 - - - - - - - C4 - - - E4 - - - D4 - - - - - - - F4 - - - - - - - G4 - - - - - - - A4 - - - - - - -'
    seq(hn, 32, m2, 0.5, 70)
    seq(fl, 32, ' '.join(t if t in '.-' else t[:-1] + str(int(t[-1]) + 1) for t in m1.split()), 0.5, 60)
    for t in (harp, wh, fl, hn): humanize(t, seed=hash(t['name']) % 99)
    return s

def boss1():
    """"Chieftain's Fury" - Stage 1 boss. E minor, driving war drums, low string ostinato, brass and choir. 24 bars @ 150 bpm."""
    s = Score(150, 24)
    ost = s.part('strings', P['strings'], vol=96, pan=58, rev=40)
    lo = s.part('contrabass', P['contrabass'], vol=104, pan=64, rev=30)
    br = s.part('brass', P['brass'], vol=96, pan=72, rev=50)
    tb = s.part('trombone', P['trombone'], vol=92, pan=40, rev=50)
    ch = s.part('choir', P['choir'], vol=80, pan=64, rev=80)
    tim = s.part('timpani', P['timpani'], vol=100, pan=64, rev=50)
    dr = s.part('drums', None, ch=9, vol=110, rev=35)
    roots = ['E2', 'E2', 'C2', 'D2', 'E2', 'E2', 'C2', 'B1'] * 3
    triads = {'E2': ['E4', 'G4', 'B4'], 'C2': ['E4', 'G4', 'C5'], 'D2': ['D4', 'F#4', 'A4'], 'B1': ['D#4', 'F#4', 'B4']}
    for bar, r in enumerate(roots):
        b0 = bar * 4; R = n(r)
        # spiccato ostinato: root-root-fifth-root ... 8ths, accent on 1 and the "and" of 2
        for k, off in enumerate([12, 12, 19, 12, 24, 12, 19, 22]): add(ost, b0 + k * 0.5, 0.42, R + off + 12, 100 if k in (0, 3, 6) else 74)
        add(lo, b0, 0.45, R, 110); add(lo, b0 + 1.5, 0.45, R, 96); add(lo, b0 + 3, 0.9, R + (7 if bar % 2 else 0), 100)
        # war drums: taiko-like low toms + kick, snare on 3, crash on phrase starts
        for bt, k, v in [(0, 'kick', 120), (0, 'tomF', 112), (1.5, 'tomL', 96), (2, 'snare', 104), (2.75, 'tomL', 84), (3, 'tomF', 108), (3.5, 'tomM', 92)]:
            add(dr, b0 + bt, 0.3, K[k], v)
        for e in range(8): add(dr, b0 + e * 0.5, 0.1, K['hat'], 50 if e % 2 else 66)
        if bar % 8 == 0: add(dr, b0, 1.5, K['crash'], 110)
        if bar % 4 == 3: [add(dr, b0 + 3 + i * 0.25, 0.2, K['snare'], 80 + i * 10) for i in range(4)]
        add(tim, b0, 0.6, R + 12, 110); add(tim, b0 + 2, 0.6, R + 19, 92)
        if bar >= 8: chord(ch, b0, 3.9, [n(x) - 12 for x in triads[r]], 72 if bar < 16 else 84)
    # brass theme: bars 8-23 (two phrases), trombones double an octave down
    th = ('E4! - - G4 F#4 - E4 - B4! - - - A4 G4 F#4 - '
          'G4! - - A4 B4 - C5 - B4! - - - - - . . '
          'E5! - - D5 C5 - B4 - A4! - - G4 F#4 - D#4 - '
          'E4! - - - - - - - . . B3 - D#4 - F#4 - ')
    seq(br, 32, th, 0.5, 100); seq(br, 64, th.replace('E4! - - - - - - - . . B3 - D#4 - F#4 -', 'E4! - - - - - - - - - - - . . . .'), 0.5, 108)
    seq(tb, 32, th, 0.5, 92, transpose=-12); seq(tb, 64, th, 0.5, 98, transpose=-12)
    # bars 0-7: stabs
    for bar in range(8):
        if bar % 2 == 0: chord(br, bar * 4 + 3.5, 0.45, [n('E3'), n('B3'), n('E4')], 104)
    humanize(br, 0.008, 5, 3); humanize(dr, 0.006, 6, 4)
    return s

def stage2():
    """"Baerlon in the Rain" - Stage 2. A minor, tense and wet: pizzicato ostinato, low cello, fiddle and oboe,
    muffled frame drum, tremolo swells. 28 bars @ 104 bpm."""
    s = Score(104, 28)
    pz = s.part('pizz', P['pizz'], vol=96, pan=44, rev=55)
    cel = s.part('cello', P['cello'], vol=92, pan=80, rev=55)
    cb = s.part('contrabass', P['contrabass'], vol=90, pan=64, rev=40)
    tr = s.part('tremolo', P['trem'], vol=76, pan=64, rev=80)
    fd = s.part('fiddle', P['fiddle'], vol=86, pan=40, rev=70)
    ob = s.part('oboe', P['oboe'], vol=80, pan=76, rev=70)
    hp = s.part('harp', P['harp'], vol=70, pan=30, rev=80)
    dr = s.part('drums', None, ch=9, vol=96, rev=40)
    plan = ['A2', 'A2', 'F2', 'E2', 'A2', 'A2', 'D2', 'E2', 'F2', 'G2', 'E2', 'A2', 'D2', 'Bb1'] * 2
    tri = {'A2': ['A3', 'C4', 'E4'], 'F2': ['F3', 'A3', 'C4'], 'E2': ['E3', 'G#3', 'B3'], 'D2': ['D3', 'F3', 'A3'], 'G2': ['G3', 'B3', 'D4'], 'Bb1': ['Bb3', 'D4', 'F4']}
    for bar, r in enumerate(plan):
        b0 = bar * 4; R = n(r); t3 = [n(x) for x in tri[r]]
        # pizzicato: 8ths, a sneaking up-down pattern
        for k, p in enumerate([t3[0], t3[2], t3[1] + 12, t3[2], t3[0] + 12, t3[2], t3[1] + 12, t3[2]]): add(pz, b0 + k * 0.5, 0.3, p, 84 if k % 2 else 96)
        add(cb, b0, 1.8, R, 88); add(cb, b0 + 2.5, 1.2, R, 76)
        add(cel, b0, 3.8, R + 12, 70)
        # frame drum (muffled toms) + rim click, like footsteps in mud
        for bt, k, v in [(0, 'tomL', 96), (1.5, 'tomL', 70), (2, 'rim', 70), (2.5, 'tomL', 64), (3.5, 'tomM', 60)]: add(dr, b0 + bt, 0.25, K[k], v)
        for e in range(4): add(dr, b0 + e + 0.5, 0.1, K['shaker'], 44)
        if bar % 7 == 6: chord(tr, b0, 4, [x + 12 for x in t3], 70)
        if bar % 14 == 13: add(dr, b0, 3, K['cymroll'], 50)
    # melody: fiddle (bars 4-11), oboe answer (bars 12-17), both (bars 18-27)
    mel = ('A4 - - - C5 - B4 - A4 - G#4 - A4 - - - '
           'E5 - - - D5 - C5 - B4 - - - . . . . '
           'C5 - - - D5 - E5 - F5 - E5 - D5 - C5 - '
           'B4 - - - G#4 - - - A4 - - - . . . . ')
    seq(fd, 16, mel, 0.5, 92); seq(fd, 32, mel.replace('A4 - - - . . . .', 'E5 - - - - - - -', 1)[:], 0.5, 88)
    seq(ob, 48, 'D5 - - - F5 - E5 - D5 - C5 - Bb4 - - - A4 - - - G#4 - - - A4 - - - - - - -', 0.5, 86)
    seq(ob, 72, mel, 0.5, 80, transpose=-12); seq(fd, 72, mel, 0.5, 96); seq(fd, 88, mel, 0.5, 100)
    for bar in range(28):
        if bar % 2 == 1: add(hp, bar * 4 + 3, 0.5, n('A5') if bar % 4 == 1 else n('E5'), 60)   # raindrop harp plinks
    for t in (fd, ob, pz): humanize(t, 0.01, 6, len(t['name']))
    return s

def boss2():
    """"Child of the Light" - Stage 2 boss (Jaret Byar). D minor, zealous and martial: military snare, minor fanfare,
    string tremolo, choir, timpani. 32 bars @ 138 bpm."""
    s = Score(138, 32)
    st = s.part('strings', P['trem'], vol=90, pan=56, rev=55)
    ost = s.part('ostinato', P['strings'], vol=94, pan=70, rev=40)
    lo = s.part('contrabass', P['contrabass'], vol=100, pan=64, rev=35)
    tp = s.part('trumpet', P['trumpet'], vol=92, pan=74, rev=55)
    hn = s.part('horns', P['horn'], vol=96, pan=50, rev=60)
    ch = s.part('choir', P['choir'], vol=86, pan=64, rev=85)
    tim = s.part('timpani', P['timpani'], vol=104, pan=64, rev=50)
    dr = s.part('drums', None, ch=9, vol=108, rev=40)
    plan = ['D2', 'D2', 'Bb1', 'C2', 'D2', 'D2', 'G1', 'A1'] * 4
    tri = {'D2': ['D4', 'F4', 'A4'], 'Bb1': ['D4', 'F4', 'Bb4'], 'C2': ['C4', 'E4', 'G4'], 'G1': ['D4', 'G4', 'Bb4'], 'A1': ['C#4', 'E4', 'A4']}
    for bar, r in enumerate(plan):
        b0 = bar * 4; R = n(r); t3 = [n(x) for x in tri[r]]
        chord(st, b0, 3.95, [x - 12 for x in t3], 76 if bar < 16 else 88)
        for k in range(8): add(ost, b0 + k * 0.5, 0.4, (R + 24) if k % 2 == 0 else (R + 31 if k % 4 == 1 else R + 27), 96 if k in (0, 3, 6) else 72)
        add(lo, b0, 0.9, R, 106); add(lo, b0 + 1.5, 0.45, R, 92); add(lo, b0 + 2, 0.9, R, 100); add(lo, b0 + 3.5, 0.45, R + 7, 90)
        # military snare: march pattern with drags
        for bt, v in [(0, 110), (0.75, 70), (1, 96), (1.5, 74), (1.75, 70), (2, 104), (2.75, 70), (3, 96), (3.25, 64), (3.5, 86), (3.75, 76)]: add(dr, b0 + bt, 0.12, K['snare'], v)
        add(dr, b0, 0.3, K['kick'], 112); add(dr, b0 + 2, 0.3, K['kick'], 100); add(dr, b0 + 2.5, 0.3, K['kick'], 84)
        if bar % 8 == 0: add(dr, b0, 1.5, K['crash'], 104)
        add(tim, b0, 0.5, R + 12, 108); add(tim, b0 + 3, 0.25, R + 12, 84); add(tim, b0 + 3.5, 0.25, R + 19, 96)
        if bar >= 16: chord(ch, b0, 3.9, t3, 78)
    fan = ('D5! - - A4 D5 - F5 - E5! - - D5 C5 - A4 - '
           'Bb4! - - A4 G4 - Bb4 - A4! - - - - - . . '
           'D5! - - E5 F5 - G5 - A5! - - G5 F5 - E5 - '
           'D5! - - C#5 D5 - E5 - D5! - - - - - . . ')
    seq(tp, 32, fan, 0.5, 100); seq(tp, 96, fan, 0.5, 108)
    seq(hn, 32, fan, 0.5, 90, transpose=-12); seq(hn, 96, fan, 0.5, 98, transpose=-12)
    # horns counter-line in bars 16-23
    seq(hn, 64, 'F4 - - - - - - - G4 - - - F4 - E4 - D4 - - - - - - - E4 - - - - - - - F4 - - - G4 - A4 - Bb4 - - - A4 - G4 - A4 - - - - - - - A4 - - - - - - -', 0.5, 92)
    humanize(tp, 0.008, 5, 7); humanize(hn, 0.01, 5, 8)
    return s

def stage3():
    """"Caemlyn at Dusk" - Stage 3. Warm city afternoon turning to dusk: nylon guitar, strings, flute and oboe,
    walking cello, light tambourine. 28 bars @ 104 bpm."""
    s = Score(104, 28)
    gtr = s.part('nylon', P['nylon'], vol=96, pan=40, rev=60)
    cel = s.part('cello', P['cello'], vol=90, pan=75, rev=50)
    pad = s.part('slowstr', P['slowstr'], vol=78, pan=64, rev=75)
    fl = s.part('flute', P['flute'], vol=84, pan=45, rev=70)
    ob = s.part('oboe', P['oboe'], vol=80, pan=70, rev=70)
    hp = s.part('harp', P['harp'], vol=74, pan=32, rev=80)
    dr = s.part('drums', None, ch=9, vol=88, rev=40)
    plan = ['G2', 'G2', 'D2', 'D2', 'E2', 'E2', 'C2', 'D2', 'G2', 'G2', 'B1', 'C2', 'A1', 'D2'] * 2
    tri = {
        'G2': ['G3', 'B3', 'D4'], 'D2': ['F#3', 'A3', 'D4'], 'E2': ['G3', 'B3', 'E4'],
        'C2': ['G3', 'C4', 'E4'], 'B1': ['F#3', 'B3', 'D4'], 'A1': ['E3', 'A3', 'C#4']
    }
    for bar, r in enumerate(plan):
        b0 = bar * 4; R = n(r); t3 = [n(x) for x in tri[r]]
        for k, p in enumerate([t3[0], t3[1], t3[2], t3[1], t3[2] + 12, t3[2], t3[1], t3[0]]):
            add(gtr, b0 + k * 0.5, 0.45, p, 88 if k in (0, 4) else 74)
        add(cel, b0, 1.8, R, 88); add(cel, b0 + 2, 1.8, R + 7 if bar % 2 else R, 80)
        chord(pad, b0, 3.95, t3, 56 if bar < 14 else 68)
        add(dr, b0, 0.3, K['kick'], 80); add(dr, b0 + 2, 0.3, K['rim'], 65)
        for e in range(4): add(dr, b0 + e + 0.5, 0.1, K['tamb'], 50 if e % 2 else 62)
        if bar % 7 == 6: chord(hp, b0, 3.8, [x + 12 for x in t3], 70)
        if bar % 14 == 13: add(dr, b0, 2.5, K['cymroll'], 45)
    m_fl = ('D5 - - - G5 - F#5 - E5 - D5 - E5 - - - '
            'B5 - - - A5 - G5 - F#5 - - - . . . . '
            'G5 - - - A5 - B5 - C6 - B5 - A5 - G5 - '
            'F#5 - - - D5 - - - G5 - - - . . . . ')
    seq(fl, 16, m_fl, 0.5, 92)
    seq(fl, 32, m_fl.replace('G5 - - - . . . .', 'B5 - - - - - - -', 1), 0.5, 88)
    seq(ob, 48, 'E5 - - - G5 - F#5 - E5 - D5 - C5 - - - B4 - - - A4 - - - G4 - - - - - - -', 0.5, 84)
    seq(ob, 72, m_fl, 0.5, 78, transpose=-12)
    seq(fl, 72, m_fl, 0.5, 94)
    seq(fl, 88, m_fl, 0.5, 98)
    for t in (gtr, fl, ob, cel): humanize(t, 0.01, 5, len(t['name']))
    return s

def boss3():
    """"Shadow in the Garden" - Stage 3 boss (The Myrddraal). D minor, cold, low strings and choir,
    sparse percussion. 28 bars @ 126 bpm."""
    s = Score(126, 28)
    st = s.part('tremolo', P['trem'], vol=92, pan=54, rev=75)
    cb = s.part('contrabass', P['contrabass'], vol=104, pan=64, rev=40)
    cel = s.part('cello', P['cello'], vol=94, pan=72, rev=50)
    ch = s.part('choir', P['choir'], vol=88, pan=64, rev=85)
    ob = s.part('oboe', P['oboe'], vol=84, pan=40, rev=70)
    tim = s.part('timpani', P['timpani'], vol=96, pan=60, rev=55)
    dr = s.part('drums', None, ch=9, vol=92, rev=45)
    plan = ['D2', 'D2', 'Bb1', 'A1', 'D2', 'D2', 'G1', 'C#2',
            'D2', 'D2', 'Bb1', 'A1', 'D2', 'F2', 'G1', 'A1',
            'D2', 'D2', 'Bb1', 'C2', 'D2', 'D2', 'G1', 'A1',
            'Bb1', 'A1', 'D2', 'D2']
    tri = {
        'D2': ['D4', 'F4', 'A4'], 'Bb1': ['D4', 'F4', 'Bb4'], 'A1': ['C#4', 'E4', 'A4'],
        'G1': ['D4', 'G4', 'Bb4'], 'C#2': ['C#4', 'E4', 'A#4'], 'F2': ['C4', 'F4', 'A4'],
        'C2': ['C4', 'E4', 'G4']
    }
    for bar, r in enumerate(plan):
        b0 = bar * 4; R = n(r); t3 = [n(x) for x in tri[r]]
        chord(st, b0, 3.95, [x - 12 for x in t3], 70 if bar < 16 else 84)
        add(cb, b0, 1.8, R, 102); add(cb, b0 + 2, 1.8, R, 92)
        add(cel, b0 + 1, 0.8, R + 12, 78); add(cel, b0 + 3, 0.8, R + 19 if bar % 2 else R + 12, 74)
        if bar >= 8: chord(ch, b0, 3.9, t3, 68 if bar < 16 else 82)
        if bar % 4 == 0: add(tim, b0, 1.2, R + 12, 106)
        if bar % 4 == 2: add(tim, b0 + 2, 0.8, R + 19, 88)
        if bar % 7 == 0: add(dr, b0, 3.0, K['cymroll'], 65)
        if bar % 2 == 1: add(dr, b0 + 2, 0.4, K['tomF'], 72)
    mel = ('D5 - - - F5 - E5 - D5 - C#5 - D5 - - - '
           'A5 - - - G5 - F5 - E5 - - - . . . . '
           'Bb5 - - - A5 - G5 - F5 - E5 - D5 - C#5 - '
           'D5! - - - - - - - . . . . . . . . ')
    seq(ob, 32, mel, 0.5, 90)
    seq(ob, 64, mel, 0.5, 96)
    humanize(st, 0.008, 5, 2); humanize(cb, 0.008, 5, 3); humanize(ob, 0.01, 6, 4)
    return s

TRACKS = {'title': (title, -17.0), 'boss1': (boss1, -15.2), 'stage2': (stage2, -16.0), 'boss2': (boss2, -15.2), 'stage3': (stage3, -16.0), 'boss3': (boss3, -15.2)}

def render(score, path_wav):
    mid = path_wav.replace('.wav', '.mid'); score.midi(3).writeFile(open(mid, 'wb'))
    subprocess.run(['fluidsynth', '-ni', '-g', '0.6', '-r', str(SR), '-F', path_wav, '-T', 'wav', SF2, mid], check=True, capture_output=True)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path_wav, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def lufs(x):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    t = p.stderr.decode(); I = float(t.split('I:')[-1].split('LUFS')[0]); pk = float(t.split('Peak:')[-1].split('dBFS')[0]); return I, pk

def limit(loop):
    """Peak-limit to 0.80 linear without breaking the loop: run ffmpeg alimiter over three back-to-back
    copies and keep the middle one, so the limiter state entering and leaving the kept copy is the same."""
    x3 = np.concatenate([loop, loop, loop]).astype(np.float32)
    y = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-af', 'alimiter=limit=0.80:attack=4:release=60:level=0', '-f', 'f32le', '-'],
                       input=x3.tobytes(), capture_output=True, check=True).stdout
    y = np.frombuffer(y, dtype=np.float32).reshape(-1, 2)
    L = len(loop); return y[L:2 * L].copy()

def build(name, out):
    fn, target = TRACKS[name]; s = fn()
    wav = os.path.join(out, name + '_render.wav'); x = render(s, wav)
    Lsec = s.length_beats * 60.0 / s.bpm; L = int(round(Lsec * SR))
    loop = x[L:2 * L].copy()
    f = int(0.04 * SR); w = np.linspace(0, 1, f)[:, None]
    loop[-f:] = loop[-f:] * np.cos(w * np.pi / 2) + x[L - f:L] * np.sin(w * np.pi / 2)
    I, pk = lufs(np.concatenate([loop, loop]))
    g = 10 ** ((target - I) / 20); loop *= g
    if np.abs(loop).max() > 0.84: loop = limit(loop)   # transparent peak limiting, loop-circular
    peak = np.abs(loop).max()
    if peak > 0.84: loop *= 0.84 / peak      # keep about -1.5 dBFS sample headroom before MP3 encoding
    pad = int(0.25 * SR); file = np.concatenate([loop[-pad:], loop, loop[:pad]])
    mp3 = os.path.join(out, f'music-{name}.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '112k', mp3],
                   input=file.astype(np.float32).tobytes(), check=True)
    I2, pk2 = lufs(np.concatenate([loop, loop]))
    meta = dict(file=os.path.basename(mp3), bpm=s.bpm, bars=s.bars, loopStart=pad / SR, loopEnd=(pad + L) / SR, loopSeconds=L / SR,
                lufs=round(I2, 1), peakDbfs=round(pk2, 1), bytes=os.path.getsize(mp3), doc=fn.__doc__.strip())
    os.remove(wav)
    return meta

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    names = sys.argv[2:] or list(TRACKS)
    man_path = os.path.join(out, 'music-manifest.json')
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for nm in names:
        man[nm] = build(nm, out); print(nm, json.dumps({k: v for k, v in man[nm].items() if k != 'doc'}))
    json.dump(man, open(man_path, 'w'), indent=1)
