#!/usr/bin/env python3
"""Contact sheets for the reskinned Stage 3 characters: one row per anim, frames on the canvas with the
baseline (brown) and anchor (red) marked, hold in ms under each frame. Run from the repo root."""
import json
from PIL import Image, ImageDraw

R = 'assets/stage3/chars/'
OUT = {'cutthroat': 'docs/stage3/shots/contact-cutthroat-reskin.jpg', 'fade': 'docs/stage3/shots/contact-fade-reskin.jpg', 'riley3': 'docs/stage3/shots/contact-riley3.jpg'}


def sheet(k, cell):
    m = json.load(open(f'{R}{k}.anims.json'))
    pages = {p: (Image.open(f'{R}{p}.webp').convert('RGBA'), json.load(open(f'{R}{p}.json'))['frames']) for p in m['pages']}
    mx = max(len(a['frames']) for a in m['anims'])
    sw, sh = round(m['canvas'][0] * m['scale']), round(m['canvas'][1] * m['scale'])
    s = cell / sh; cw = int(sw * s)
    img = Image.new('RGB', (110 + mx * cw, len(m['anims']) * cell), (70, 62, 76)); d = ImageDraw.Draw(img)
    by = int(m['baseline'] * m['scale'] * s)
    for r, a in enumerate(m['anims']):
        d.text((4, r * cell + 4), a['name'].split('_', 1)[1], fill=(255, 230, 120))
        for i, (f, p, h) in enumerate(zip(a['frames'], a['pages'], a['holds'])):
            im, A = pages[m['pages'][p]]; e = A[f]; fr = e['frame']; ss = e['spriteSourceSize']
            c = Image.new('RGBA', (sw, sh), (70, 62, 76, 255))
            c.alpha_composite(im.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (ss['x'], ss['y']))
            x = 110 + i * cw; img.paste(c.convert('RGB').resize((cw, cell), Image.LANCZOS), (x, r * cell))
            d.line([(x, r * cell + by), (x + cw, r * cell + by)], fill=(120, 100, 60))
            d.line([(x + cw // 2, r * cell + by - 6), (x + cw // 2, r * cell + by + 3)], fill=(200, 80, 80))
            d.text((x + 3, r * cell + cell - 12), f'{f[-2:]} {h}', fill=(200, 200, 200))
    return img


for k, out in OUT.items():
    img = sheet(k, 200 if k == 'riley3' else 150)
    if k == 'fade':
        p = Image.open('assets/stage3/ui/fade-portrait.webp').convert('RGB').resize((150, 150), Image.LANCZOS)
        img.paste(p, (img.width - 154, 4))
    img.save(out, quality=80, optimize=True)
    print(out, img.size)
