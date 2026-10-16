#!/usr/bin/env python3
"""Build the Stage 4 Darkfriend cultist sheet (assets/bg4/s4cult.webp) from the painted Whitecloak archer atlas.

Same approach as tools/stage3/reskin_chars.py: existing painted frames, recoloured region by region, so the
figure keeps its painted folds, rims and proportions. Per frame:
  1. the bow and bowstring are cut out (thin structures removed by a 5 px opening, grown along the bow wood),
     pixels inside the body silhouette are inpainted from the surrounding paint, the rest become transparent;
  2. recolour: black hood, dark oxblood robe whose shadows fall to black, near-black leathers,
     the Whitecloak sun badge becomes the cultist's sickly green charm, the face sinks into the hood shadow;
  3. the gameplay tells the procedural sheet carried are painted on top in the same colours:
     charm glow (every standing pose), rune rings at the feet (chant), glowing hand and orb (bolt).

Output keeps the procedural frame order (cultFrame in src/stage4-art-cast.js):
  0 walk A, 1 walk B, 2 chant (kneel), 3 bolt, 4 shove, 5 hurt, 6 down, 7 flee
on a uniform CELL_W x CELL_H grid; the actor scales it so the cell height maps to the old 190 px cell.
Run from the repo root:  python3 tools/stage4/reskin_cultist.py
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'stage3'))
import reskin_lib as RL

SRC = 'assets/chars'
OUT = 'assets/bg4/s4cult.webp'
CELL_W, CELL_H = 340, 338
BASE_Y = 327            # archer baseline in its 558x347 source canvas
FOOT = round(CELL_H * 0.96)
# (source frame, mirror). The archer faces left; the cultist sheet faces right like the procedural one.
# Flee runs away from the player while the actor keeps facing him, so that one stays unmirrored.
POSES = [('walk_00', 1), ('walk_02', 1), ('getup_00', 1), ('shoot_02', 1), ('shoot_04', 1), ('hurt_00', 1), ('knockdown_02', 1), ('flee_01', 0)]
# Hand-placed clean-up in the (mirrored) source canvas, measured on 3x zooms:
#  ERASE  quiver fletching that sticks out above the shoulder (box x0,y0,x1,y1 -> transparent)
#  STROKE bow wood that crosses the body where the thin-structure pass can't see it (polyline, width -> inpaint)
ERASE = {
    'walk_00': [(222, 86, 250, 112)], 'walk_02': [(218, 86, 247, 110)], 'getup_00': [(266, 170, 292, 190)],
    'shoot_02': [(212, 96, 236, 118)], 'shoot_04': [(212, 124, 236, 138)], 'flee_01': [(265, 128, 290, 146)],
    'knockdown_02': [(232, 319, 304, 340)],
}
STROKE = {
    'getup_00': [([(236, 212), (232, 230), (233, 250), (238, 270), (246, 293)], 9)],
}


def load_frames():
    anims = json.load(open(f'{SRC}/archer.anims.json'))
    out = {}
    for p in anims['pages']:
        d = json.load(open(f'{SRC}/{p}.json'))
        im = np.asarray(Image.open(f'{SRC}/{p}.webp').convert('RGBA'))
        for name, f in d['frames'].items():
            r, ss, S = f['frame'], f['spriteSourceSize'], f['sourceSize']
            c = np.zeros((S['h'], S['w'], 4), np.uint8)
            c[ss['y']:ss['y'] + r['h'], ss['x']:ss['x'] + r['w']] = im[r['y']:r['y'] + r['h'], r['x']:r['x'] + r['w']]
            out[name] = c
    return out


def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def debow(a, name=''):
    """Remove the bow and string. Returns (rgba, removed_mask)."""
    a = a.copy()
    for x0, y0, x1, y1 in ERASE.get(name, []):
        a[y0:y1, x0:x1, 3] = 0
    lab, L, A, B, C, h, tex = RL.features(a)
    al = a[..., 3] > 96
    body = cv2.morphologyEx(al.astype(np.uint8), cv2.MORPH_OPEN, disk(5)) > 0
    thin = al & ~body
    # cloak tatters and pale fingers are thin too: keep low-chroma light pixels and skin
    bowish = (C > 12) | (L < 28)
    seed = thin & bowish
    lbl, n = ndi.label(seed, structure=np.ones((3, 3)))
    sizes = ndi.sum(seed, lbl, range(1, n + 1))
    seed = np.isin(lbl, 1 + np.where(sizes >= 60)[0])
    # grow along the wood where it crosses the body (bow-coloured or outline pixels only)
    wood = al & (((C > 20) & (h > 38) & (h < 66) & (L > 22) & (L < 68)) | (L < 18))
    grow = seed.copy()
    for _ in range(9):
        grow = ndi.binary_dilation(grow, structure=np.ones((3, 3))) & (wood | seed)
    grow |= ndi.binary_dilation(seed, iterations=1) & al
    for pts, wdt in STROKE.get(name, []):
        m = np.zeros(al.shape, np.uint8)
        cv2.polylines(m, [np.array(pts, np.int32)], False, 1, wdt)
        grow |= (m > 0) & al
    res = a.copy()
    inside = grow & ndi.binary_dilation(body, iterations=1)

    outside = grow & ~inside
    res[outside, 3] = 0
    if inside.any():
        bgr = cv2.cvtColor(res[..., :3], cv2.COLOR_RGB2BGR)
        fix = cv2.inpaint(bgr, ndi.binary_dilation(inside, iterations=1).astype(np.uint8), 5, cv2.INPAINT_TELEA)
        res[..., :3] = cv2.cvtColor(fix, cv2.COLOR_BGR2RGB)
    # drop strays no longer attached to the figure
    al2 = res[..., 3] > 40
    lbl, n = ndi.label(al2, structure=np.ones((3, 3)))
    if n > 1:
        sizes = ndi.sum(al2, lbl, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        small = (lbl > 0) & (lbl != keep) & np.isin(lbl, 1 + np.where(sizes < 400)[0])
        res[small, 3] = 0
    # soften the cut edge a touch
    cut = ndi.binary_dilation(outside, iterations=1) & (res[..., 3] > 0)
    res[cut, 3] = (res[cut, 3] * 0.6).astype(np.uint8)
    return res, grow


def recolor(a):
    k = RL.classes(a)
    L = k['L']
    hood = RL.hood_mask(k['face'], a[..., 3])
    for n in ('cloth', 'mail', 'leather', 'gold'):
        k[n] = k[n] * (1 - hood)
    # only the badge and clasp on the chest turn into the charm; olive cloth lower down stays leather-dark
    ys = np.where(a[..., 3].max(1) > 60)[0]
    if len(ys):
        cut = int(ys[0] + 0.42 * (ys[-1] - ys[0]))
        g = k['gold'] > 0.4; g[cut:] = False
        lbl, n = ndi.label(g)
        near = np.zeros_like(g)
        if n:
            sizes = ndi.sum(g, lbl, range(1, n + 1))
            near = ndi.binary_dilation(lbl == 1 + int(np.argmax(sizes)), iterations=14)
        nf = cv2.GaussianBlur(near.astype(np.float32), (0, 0), 1.5)
        low = k['gold'] * (1 - nf)
        k['gold'] = k['gold'] - low; k['leather'] = k['leather'] + low
    # robe: the white cloak's lights become dark oxblood, its folds fall to black
    t = np.clip((L - 30) / 65, 0, 1)
    cloth = RL.lab_color(RL.tone(L, 20, 99, 4, 28, 1.25), 22, 2 + 25 * t ** 1.5)
    mail = RL.lab_color(RL.tone(L, 10, 75, 3, 18), 20, 6)
    leather = np.stack([RL.tone(L, 0, 80, 2, 24), k['a'] * 0.45 + 2, k['b'] * 0.3], -1)
    gold = RL.lab_color(RL.tone(L, 30, 95, 70, 96), 118, 62)        # sun badge -> green charm (#c6ff6a family)
    skin = np.stack([k['L'] * 0.72, k['a'] * 0.75, k['b'] * 0.7], -1)
    hoodc = RL.lab_color(RL.tone(L, 10, 99, 3, 20, 1.1), 20, 4)
    out = RL.blend([(k['cloth'], cloth), (k['mail'], mail), (k['leather'], leather), (k['gold'], gold), (k['skin'], skin), (hood, hoodc)])
    res = a.copy(); res[..., :3] = RL.from_lab(out)
    return res, k


def add_glow(img, cx, cy, r, inner, outer_alpha=0.0, strength=1.0):
    """Additive radial glow (premultiplied over straight alpha): brightens paint and adds a halo."""
    H, W = img.shape[:2]
    yy, xx = np.mgrid[:H, :W]
    d = np.hypot(xx - cx, yy - cy) / r
    w = np.clip(1 - d, 0, 1) ** 1.6 * strength
    rgb = img[..., :3].astype(np.float32); al = img[..., 3:4].astype(np.float32) / 255
    col = np.array(inner, np.float32)
    pre = rgb * al + col * w[..., None]
    na = np.clip(al[..., 0] + w * 0.85, 0, 1)
    img[..., :3] = np.clip(pre / np.maximum(na[..., None], 1e-3), 0, 255).astype(np.uint8)
    img[..., 3] = (na * 255).astype(np.uint8)


def ring(img, cx, cy, rx, ry, col, width):
    layer = np.zeros(img.shape[:2], np.uint8)
    cv2.ellipse(layer, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 255, width, cv2.LINE_AA)
    glow = cv2.GaussianBlur(layer, (0, 0), 3)
    over(img, np.maximum(layer, (glow * 0.8).astype(np.uint8)), col)


def over(img, mask, col):
    m = mask.astype(np.float32)[..., None] / 255
    al = img[..., 3:4].astype(np.float32) / 255
    rgb = img[..., :3].astype(np.float32)
    na = m + al * (1 - m)
    out = (np.array(col, np.float32) * m + rgb * al * (1 - m)) / np.maximum(na, 1e-3)
    img[..., :3] = np.clip(out, 0, 255).astype(np.uint8); img[..., 3] = (na[..., 0] * 255).astype(np.uint8)


def badge_center(k):
    g = (k['gold'] > 0.4)
    lbl, n = ndi.label(g)
    if not n: return None
    sizes = ndi.sum(g, lbl, range(1, n + 1))
    i = 1 + int(np.argmax(sizes))
    if sizes[i - 1] < 15: return None
    ys, xs = np.where(lbl == i)
    return xs.mean(), ys.mean()


def extreme_hand(a, k, side):
    """Front-most skin pixel (the casting hand) in the upper body."""
    sk = (k['C'] > 26) & (k['h'] < 62) & (k['L'] > 38) & (a[..., 3] > 128)
    H = a.shape[0]
    sk[int(H * 0.62):] = False
    ys, xs = np.where(sk)
    if not len(xs): return None
    i = np.argmax(xs) if side > 0 else np.argmin(xs)
    sel = np.abs(xs - xs[i]) < 10
    return xs[sel].mean(), ys[sel].mean()


def build(debug=None):
    fr = load_frames()
    sheet = np.zeros((CELL_H, CELL_W * len(POSES), 4), np.uint8)
    dbg = []
    for i, (name, mir) in enumerate(POSES):
        a = fr['archer_' + name]
        if mir: a = a[:, ::-1].copy()
        a, grown = debow(a, name)
        a, k = recolor(a)
        bc = badge_center(k)
        if i != 6 and bc:
            add_glow(a, bc[0], bc[1], 17, (150, 255, 90), strength=0.75)
        if i == 2:   # chant: rune rings on the ground in front of the knees (procedural: 28x9 and 16x5 at foot-6)
            ys = np.where(a[..., 3].max(1) > 60)[0]; xs = np.where(a[..., 3].max(0) > 60)[0]
            cx = (xs[0] + xs[-1]) / 2
            ring(a, cx, BASE_Y - 9, 66, 15, (180, 255, 120), 3)
            ring(a, cx, BASE_Y - 9, 38, 9, (200, 255, 150), 2)
        if i == 3:   # bolt: glowing casting hand and orb (procedural '#d8ff8a' hands + orb)
            hp = extreme_hand(a, k, 1)
            if hp:
                add_glow(a, hp[0] + 8, hp[1], 44, (170, 255, 110), strength=0.9)
                add_glow(a, hp[0] + 8, hp[1], 22, (240, 255, 200), strength=1.0)
                add_glow(a, hp[0] + 8, hp[1], 10, (255, 255, 240), strength=1.0)
        H, W = a.shape[:2]
        dx = CELL_W // 2 - W // 2
        dy = FOOT - BASE_Y
        cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
        sy0, sx0 = max(0, -dy), max(0, -dx)
        sy1, sx1 = min(H, CELL_H - dy), min(W, CELL_W - dx)
        cell[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] = a[sy0:sy1, sx0:sx1]
        lost = int((a[..., 3] > 40).sum() - (cell[..., 3] > 40).sum())
        if lost > 0: print(f'warning: {name} clipped {lost} px', file=sys.stderr)
        sheet[:, i * CELL_W:(i + 1) * CELL_W] = cell
    Image.fromarray(sheet).save(OUT, 'WEBP', quality=90, method=6, exact=False)
    print(OUT, sheet.shape, os.path.getsize(OUT))
    return sheet


if __name__ == '__main__':
    build()
