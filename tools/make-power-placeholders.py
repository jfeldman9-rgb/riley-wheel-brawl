#!/usr/bin/env python3
"""Write the clearly-labelled PLACEHOLDER files for the angreal / ter'angreal art (see assets/powers/ART_LIST.md).

These are not art: each is a flat card at the final pixel size and frame layout with the asset name, size and frame
numbers written on it, so painted files can replace them one-for-one without code changes. Re-run only to restore a
placeholder:  python3 tools/make-power-placeholders.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'powers'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font = lambda n: ImageFont.truetype(FONT, n)

def dashed(d, box, col, w=2, dash=6):
    x0, y0, x1, y1 = box
    for x in range(x0, x1, dash * 2):
        d.line([(x, y0), (min(x + dash, x1), y0)], fill=col, width=w); d.line([(x, y1), (min(x + dash, x1), y1)], fill=col, width=w)
    for y in range(y0, y1, dash * 2):
        d.line([(x0, y), (x0, min(y + dash, y1))], fill=col, width=w); d.line([(x1, y), (x1, min(y + dash, y1))], fill=col, width=w)

def centred(d, cx, cy, lines, sizes, col):
    hs = [font(s).getbbox(t)[3] - font(s).getbbox(t)[1] + max(2, s // 4) for t, s in zip(lines, sizes)]
    y = cy - sum(hs) / 2
    for t, s, h in zip(lines, sizes, hs):
        f = font(s); w = f.getlength(t); d.text((cx - w / 2, y), t, font=f, fill=col); y += h

def card(path, w, h, col, lines, sizes, frames=1, cols=None, opaque=False, guides=None):
    cols = cols or frames; rows = (frames + cols - 1) // cols
    fw, fh = w // cols, h // rows
    im = Image.new('RGBA' if not opaque else 'RGB', (w, h), (0, 0, 0, 0) if not opaque else (24, 26, 34))
    d = ImageDraw.Draw(im)
    for i in range(frames):
        x0, y0 = (i % cols) * fw, (i // cols) * fh
        if not opaque: d.rectangle([x0 + 2, y0 + 2, x0 + fw - 3, y0 + fh - 3], fill=(16, 18, 26, 150))
        dashed(d, (x0 + 2, y0 + 2, x0 + fw - 3, y0 + fh - 3), col, w=max(1, min(fw, fh) // 40))
        if guides: guides(d, x0, y0, fw, fh)
        ls = list(lines) + ([f'frame {i}'] if frames > 1 else [])
        ss = list(sizes) + ([max(9, sizes[-1])] if frames > 1 else [])
        centred(d, x0 + fw / 2, y0 + fh / 2, ls, ss, col)
    if opaque: im.save(path, quality=80)
    else: im.save(path, optimize=True)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    gold, pale, blue, fire, air, choc = (255, 210, 122), (255, 243, 192), (159, 216, 255), (255, 171, 106), (230, 248, 255), (232, 184, 120)
    pick = {'angreal': ('ANGREAL', gold), 'saangreal': ("SA'ANGREAL", pale), 'lightning': ('LIGHTNING', blue),
            'fireshield': ('FIRE SHIELD', fire), 'airwhip': ('AIR WHIP', air), 'twix': ('TWIX', choc)}
    for k, (name, col) in pick.items():
        card(OUT / f'pu_{k}.png', 96, 96, col, ['PLACEHOLDER', name, '96x96'], [9, 11 if len(name) < 9 else 9, 9])
    short = {'angreal': 'ANG', 'saangreal': 'SA', 'lightning': 'LTN', 'fireshield': 'FIRE', 'airwhip': 'AIR'}
    for k, s in short.items(): card(OUT / f'hud_{k}.png', 48, 48, pick[k][1], ['TEMP', s], [8, 11])
    panels = ['Riley grabs the Twix; campfire snack truce (wide)', 'Trollocs complain about the Forsaken (close)', 'Riley and Trollocs, last Twix, Riley stands (wide)']
    for i, t in enumerate(panels, 1):
        card(OUT / f'twix_panel_{i}.jpg', 1280, 720, (232, 184, 120), ['PLACEHOLDER PAINTING', f'twix_panel_{i}.jpg  1280x720', t], [44, 26, 24], opaque=True)
    card(OUT / 'fx_lightning.png', 512, 192, blue, ['PLACEHOLDER fx_lightning', '512x64 per frame'], [16, 12], frames=3, cols=1)
    card(OUT / 'fx_fireshield.png', 384, 320, fire, ['PLACEHOLDER fx_fireshield', '384x160 per frame', 'frame 0 back half / 1 front half'], [14, 11, 11], frames=2, cols=1)
    card(OUT / 'fx_airwhip.png', 512, 48, air, ['PLACEHOLDER fx_airwhip 512x48'], [14])
    def riley_guides(d, x0, y0, fw, fh):   # feet baseline y=610 and the 0.45 anchor, as in assets/chars/riley.anims.json
        d.line([(x0, y0 + 610), (x0 + fw, y0 + 610)], fill=(255, 90, 90), width=2)
        d.line([(x0 + int(fw * 0.45), y0), (x0 + int(fw * 0.45), y0 + fh)], fill=(255, 90, 90), width=1)
    card(OUT / 'riley_lightning.png', 2880, 1280, blue, ['PLACEHOLDER riley_lightning', '960x640 per frame, 3x2 grid', 'feet on red baseline y=610, anchor x=432'], [40, 30, 26], frames=6, cols=3, guides=riley_guides)

if __name__ == '__main__':
    main()
