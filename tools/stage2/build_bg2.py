#!/usr/bin/env python3
"""Stage 2 (Baerlon) backdrop + props: copy the painted plates (ChatGPT image gen via Codex, see
assets/bg2/ART_PROVENANCE.md) into game formats, make algorithmic normal maps (stage1/tools/nmap.py recipe),
and write plates.json + lights.json. Pixels are only resized/encoded; the floors get a narrow wrap blend of
their own edge pixels so the tiled street has no hard seam. Nothing is redrawn.
usage: python3 tools/stage2/build_bg2.py /workspace/rwb-2/stage2/gen"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
G = sys.argv[1]; OUT = 'assets/bg2'; PROPS = 'assets/props'; os.makedirs(OUT, exist_ok=True)
NMAP = '/workspace/rwb-2/stage1/tools/nmap.py'
def nmap(src_img, dst, *args):
    tmp = '/tmp/_nm_src.png'; src_img.save(tmp); subprocess.run(['python3', NMAP, tmp, '/tmp/_nm.png', *map(str, args)], check=True, capture_output=True)
    Image.open('/tmp/_nm.png').convert('RGB').save(dst, 'WEBP', quality=80)
def wrap_blend(im, w=64):
    a = np.asarray(im.convert('RGB')).astype(np.float32); W = a.shape[1]
    k = np.linspace(0, 1, w)[None, :, None]
    left = a[:, :w].copy(); right = a[:, W - w:].copy()
    # the last w columns fade into a copy of the first w columns, so column W-1 meets column 0 smoothly
    a[:, W - w:] = right * (1 - k) + left * k * 0.5 + right * k * 0.5
    a[:, :w] = left * (0.5 + 0.5 * k) + right * (0.5 - 0.5 * k)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))
P = G + '/bg-plates/'
far = Image.open(P + 'bg2-far.png').convert('RGB'); far.save(f'{OUT}/bg2-far.jpg', quality=84)
for k in ['bg2-mid', 'bg2-mid2']:
    im = Image.open(P + k + '.png').convert('RGBA'); im.save(f'{OUT}/{k}.webp', 'WEBP', quality=86)
    nmap(im, f'{OUT}/{k}_n.webp', 18, 6, 0.6)
for k in ['bg2-floor', 'bg2-floor2']:
    im = wrap_blend(Image.open(P + k + '.png')); im.save(f'{OUT}/{k}.jpg', quality=84)
    nmap(im.convert('RGBA'), f'{OUT}/{k}_n.webp', 0, 5, 0.9)
# props: crate (breakable), crate planks atlas, falling stable beam, arrow, torch, Twinkle Toes' ribbon
def trim(im, maxw):
    im = im.crop(im.getbbox()); s = min(1, maxw / im.width); return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS) if s < 1 else im
Q = G + '/props-fx/'
crate = trim(Image.open(Q + 'prop-crate.png').convert('RGBA'), 490); crate.save(f'{PROPS}/prop-crate.webp', 'WEBP', quality=86); nmap(crate, f'{PROPS}/prop-crate_n.webp', 14, 6, 0.6)
beam = trim(Image.open(Q + 'prop-beam.png').convert('RGBA'), 1100); beam.save(f'{PROPS}/prop-beam.webp', 'WEBP', quality=86); nmap(beam, f'{PROPS}/prop-beam_n.webp', 10, 6, 0.6)
for k, w in [('fx-arrow', 600), ('fx-torch', 700), ('item-ribbon', 256)]:
    trim(Image.open(Q + k + '.png').convert('RGBA'), w).save(f'{PROPS}/{k}.webp', 'WEBP', quality=88)
# planks atlas from the painted broken-crate sheet: one frame per separate piece (pixels copied, not altered)
from scipy import ndimage as ndi
br = Image.open(Q + 'prop-crate-broken.png').convert('RGBA'); A = np.asarray(br)[:, :, 3] > 24
lab, n = ndi.label(A); objs = [(sl, (lab[sl] == i + 1).sum()) for i, sl in enumerate(ndi.find_objects(lab))]
objs = [o for o in objs if o[1] > 2000]; objs.sort(key=lambda o: o[0][1].start)
pieces = []; frames = {}; x = 0
for i, (sl, _) in enumerate(objs):
    ys, xs = sl; c = np.asarray(br)[ys, xs].copy(); c[lab[ys, xs] != objs.index((sl, _)) + 1 if False else ~(lab[ys, xs] > 0)] = 0
    pieces.append(Image.fromarray(c))
H = max(p.height for p in pieces); atlas = Image.new('RGBA', (sum(p.width + 4 for p in pieces), H))
for i, p in enumerate(pieces):
    atlas.paste(p, (x, 0)); frames[f'plank{i}'] = {'frame': {'x': x, 'y': 0, 'w': p.width, 'h': p.height}, 'rotated': False, 'trimmed': False, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': p.width, 'h': p.height}, 'sourceSize': {'w': p.width, 'h': p.height}}; x += p.width + 4
atlas.save(f'{PROPS}/planks.webp', 'WEBP', quality=86)
json.dump({'frames': frames, 'meta': {'image': 'planks.webp', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1'}}, open(f'{PROPS}/planks.json', 'w'))
print('planks', len(pieces))
# plates.json: the barn (plate 2) sits in the boss arena; the stable yard floor starts at floorSplit
json.dump({'overlap': 0, 'floorSplit': 2700, 'midScale': 0.76, 'midParallax': 0.5, 'midX0': -60}, open(f'{OUT}/plates.json', 'w'))
# lights.json: wall lanterns measured on the mid plates (plate px), rain + ambient settings
lights = {
  'note': 'Stage 2 world lights. lanterns: [plateIndex, x, y, intensity, radius] in plate pixels (measured on bg2-mid / bg2-mid2). Lanterns ride the mid plates (parallax midParallax) as world-space lights, at most capOnScreen at once.',
  'ambient': '0x34405a', 'ambientUnlit': '0x58627e', 'lanternColor': '0xffb45e', 'capOnScreen': 4, 'flicker': 0.12,
  'lanterns': [[0, 75, 566, 1.5, 460], [0, 472, 567, 1.5, 460], [0, 708, 512, 0.9, 300], [0, 1028, 578, 1.6, 480], [0, 1234, 576, 1.6, 480], [0, 1716, 568, 1.5, 460], [0, 2101, 569, 1.5, 460],
               [1, 220, 538, 1.4, 460], [1, 530, 532, 1.4, 460], [1, 789, 532, 1.4, 460], [1, 1035, 533, 1.4, 460], [1, 1424, 536, 1.7, 520], [1, 1916, 529, 1.7, 520]],
  'barnFire': [[1, 1520, 300, 2.6, 760], [1, 1700, 420, 2.4, 700], [1, 1880, 330, 2.2, 640]],
  'rain': {'front': {'frequency': 14, 'speedY': [1050, 1350], 'speedX': [-260, -200], 'alpha': [0.25, 0.5]}, 'back': {'frequency': 10, 'speedY': [700, 850], 'speedX': [-150, -120], 'alpha': [0.12, 0.25]}},
  'lightning': {'every': [11, 19], 'ambientFlash': '0x8a9ac0'},
}
json.dump(lights, open(f'{OUT}/lights.json', 'w'), indent=1)
for f in sorted(os.listdir(OUT)) + ['../props/' + p for p in sorted(os.listdir(PROPS))]:
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
