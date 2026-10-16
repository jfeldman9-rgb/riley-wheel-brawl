#!/usr/bin/env python3
"""Build the painted Stage 4 Draghkar sheet (assets/bg4/s4drag.webp) and HUD portrait (assets/bg4/draghkar-portrait.webp).

Sources (ChatGPT image generation, approved by Jason F via Grok Bot, 2026-10-07), kept verbatim:
  art-in/draghkar/draghkar-sheet.src.png     1983x793  the 10 poses of docs/stage4/DRAGHKAR_STILLS_REQUEST.md on flat
                                             magenta, 5 x 2 in reading order (not on a grid: figures are found by blobs)
  art-in/draghkar/draghkar-portrait.src.png  1254x1254 head and shoulders on a moonlit blue-teal sky

Sheet, per the stills request:
  1. key: the magenta is noisy (about #FB03FA, +-7). Deep background (3 px inside the hard key) is cleared; the
     3 px edge band gets alpha from the magenta excess min(R,B)-G and the colour is unmixed from the key colour;
     every kept pixel is then despilled (the wings have a violet sheen at an excess of about 5-25, so it is compressed above 10 toward 20, not removed; an excess past 34 is see-through magenta
     and is greyed;
     light paint (skin, ash) is capped at 3 because its mauve is magenta showing through the flakes;
     the soft edge band is capped at 8). Detached crumbs and ash flakes are greyed: they are mostly fringe.
     Enclosed magenta holes in the tattered wings are keyed the same way.
  2. figures: the 10 largest blobs in reading order; every smaller blob (ash flakes, wingtip crumbs) joins the
     figure it is nearest to by true pixel distance, so pose 9's flakes stay with pose 9. Specks under 4 px go.
  3. scale: one factor K for every pose (the source draws them at one scale), resampled premultiplied.
  4. registration, feet anchored at FOOT = 0.96 x CELL_H like the actor's origin:
       grounded poses (3..9): the lowest painted row sits on FOOT; x anchor = the centre of the bottom 8 % of the
       figure (the feet), so the body does not jump sideways between stance, claw, croon, kiss and reel;
       hover 0/1: aligned on the head and torso (template match on pose 0's torso, wings excluded) so the
       two frames loop as a flap with the body still; pose 0's toes sit on FOOT;
       swoop 2 and down 8: x anchor = the body (pale skin pixels), y on FOOT.
     Hand offsets (DX) nudge a pose when the automatic anchor reads wrong; none may clip (checked).
  5. tells painted on top in the procedural colours: croon rings round the head (#e8ff6a, #f0d878), a soft
     yellow-green kiss glow at the parted lips, a pale light-reel flash at the shielding hand.
Output keeps dragFrame order (src/stage4-art-cast.js) on a uniform CELL_W x CELL_H grid; the actor scales the
cell height to the painter's 250 px cell (paint() in src/stage4-actors.js), so hitboxes and timing are untouched.

Portrait: square crop centred on the head (860 px of 1254), Lanczos to 136 x 136 (drawn at 68 x 68 by the HUD), opaque WebP.

Usage: python3 tools/stage4/process_draghkar.py [--debug DIR]   (needs numpy, opencv-python, Pillow, scipy)
"""
import hashlib, json, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-in', 'draghkar', 'draghkar-sheet.src.png')
SRC_P = os.path.join(ROOT, 'art-in', 'draghkar', 'draghkar-portrait.src.png')
OUT = os.path.join(ROOT, 'assets', 'bg4', 's4drag.webp')
OUT_P = os.path.join(ROOT, 'assets', 'bg4', 'draghkar-portrait.webp')

CELL_W, CELL_H = 480, 400
FOOT = round(CELL_H * 0.96)
K = 0.94                # source px -> cell px (cell px -> world px is 405 / CELL_H, see paint())
PORTRAIT = 136
N = 10
NAMES = ['hover-up', 'hover-down', 'swoop', 'stance', 'claw', 'croon', 'kiss', 'reel', 'down', 'ash']
DX = {5: -14}           # hand nudges in cell px (croon: its right wing reaches 13 px past the cell)
LO, HI = 36.0, 225.0    # magenta excess: <= LO is paint, >= HI is key (edge band only)
SHEEN, SHEEN_MAX, EDGE, PINK = 10.0, 20.0, 8.0, 34.0


def key(a):
    """RGB float image -> (rgb, alpha) with the magenta keyed out and despilled."""
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    s = np.minimum(R, B) - G
    hard = s > 150
    Kc = np.median(a[s > 200], axis=0)
    deep = cv2.erode(hard.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    near = cv2.dilate(hard.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    band = near & ~deep
    alpha = np.ones(s.shape, np.float32)
    est = 1.0 - np.clip((s - LO) / (HI - LO), 0, 1)
    alpha[band] = est[band]
    alpha[deep] = 0
    alpha = np.where(alpha < 0.04, 0, np.where(alpha > 0.97, 1, alpha)).astype(np.float32)
    am = np.maximum(alpha, 1e-3)[..., None]
    F = np.clip((a - (1 - alpha)[..., None] * Kc) / am, 0, 255)
    # despill everywhere (no pink is painted on the character). The wings' violet sheen sits at an excess of
    # about 5-25; above SHEEN it is compressed toward SHEEN_MAX, and the soft edge band is capped at EDGE.
    Fr, Fg, Fb = F[..., 0], F[..., 1], F[..., 2]
    e = np.minimum(Fr, Fb) - Fg
    cap = np.where(e > SHEEN, np.minimum(SHEEN + (e - SHEEN) * 0.4, SHEEN_MAX), e)
    cap = np.where((alpha < 1) & (alpha > 0), np.minimum(cap, EDGE), cap)
    # light paint (skin, ash, wing highlights) carries no sheen: mauve there is magenta showing through flakes
    lit = np.clip((F.mean(-1) - 70) / 15, 0, 1)
    cap = cap * (1 - lit) + np.minimum(cap, 3) * lit
    ex = np.maximum(e - cap, 0)
    F = np.stack([Fr - ex, Fg, Fb - ex * 0.85], -1)
    # strong pink (excess past PINK: magenta seen through flakes and torn membrane, never paint) goes to grey
    w = np.clip((e - PINK) / 30, 0, 1)[..., None]
    F = F * (1 - w) + F.mean(-1, keepdims=True) * np.array([1.0, 0.98, 1.02]) * w
    return F, alpha, hard


def figures(alpha):
    fg = alpha > 0
    lbl, n = ndi.label(fg, structure=np.ones((3, 3)))
    sizes = ndi.sum(fg, lbl, range(1, n + 1))
    big = list(1 + np.argsort(-sizes)[:N])
    objs = ndi.find_objects(lbl)
    # reading order: row (top or bottom half of the sheet), then x
    H = alpha.shape[0]
    big.sort(key=lambda i: ((objs[i - 1][0].start + objs[i - 1][0].stop) / 2 > H / 2, objs[i - 1][1].start))
    dist = np.stack([ndi.distance_transform_edt(lbl != i) for i in big])
    crumbs = np.zeros(lbl.shape, bool)
    owner = np.zeros(lbl.shape, np.int16) - 1
    for k, i in enumerate(big):
        owner[lbl == i] = k
    dropped = 0
    for i in range(1, n + 1):
        if i in big: continue
        m = lbl == i
        if sizes[i - 1] < 4:
            dropped += 1; continue
        ys, xs = np.where(m)
        d = dist[:, ys, xs].mean(1)
        owner[m] = int(np.argmin(d))
        crumbs[m] = True
    return owner, dropped, crumbs


def premul_resize(rgba, k):
    h, w = rgba.shape[:2]
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    al = rgba[..., 3:4] / 255.0
    pre = np.concatenate([rgba[..., :3] * al, al * 255], -1).astype(np.float32)
    r = cv2.resize(pre, (nw, nh), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_LANCZOS4)
    r = np.clip(r, 0, 255)
    a2 = r[..., 3:4] / 255.0
    rgb = np.where(a2 > 1e-3, r[..., :3] / np.maximum(a2, 1e-3), 0)
    return np.concatenate([np.clip(rgb, 0, 255), r[..., 3:4]], -1)


def crop_pose(F, alpha, owner, k):
    m = owner == k
    m = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    m &= (owner == k) | (owner < 0)
    ys, xs = np.where(m & (alpha > 0))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
    rgba[..., :3] = F[y0:y1, x0:x1]
    rgba[..., 3] = alpha[y0:y1, x0:x1] * m[y0:y1, x0:x1] * 255
    return rgba, (x0, y0)


def skin(rgba):
    """Pale skin pixels (bone-white to grey): bright and low chroma."""
    r, g, b, a = rgba[..., 0], rgba[..., 1], rgba[..., 2], rgba[..., 3]
    L = (r + g + b) / 3
    C = rgba[..., :3].max(-1) - rgba[..., :3].min(-1)
    return (a > 200) & (L > 120) & (C < 40)


def bottom(rgba, thresh=128, min_px=3):
    rows = np.where((rgba[..., 3] > thresh).sum(1) >= min_px)[0]
    return int(rows[-1])


def feet_x(rgba):
    a = rgba[..., 3] > 128
    rows = np.where(a.any(1))[0]
    top, bot = rows[0], rows[-1]
    band = a[int(bot - 0.08 * (bot - top)):bot + 1]
    xs = np.where(band)[1]
    return float(xs.mean())


def body_x(rgba):
    ys, xs = np.where(skin(rgba))
    return float((np.percentile(xs, 10) + np.percentile(xs, 90)) / 2)


def flap_offset(p0, p1):
    """Translation that puts pose 1's head and torso on pose 0's (alpha-weighted luminance, wings excluded)."""
    def lum(rgba):
        a = rgba[..., 3:4] / 255
        return (rgba[..., :3].mean(-1, keepdims=True) * a + 128 * (1 - a))[..., 0].astype(np.float32)
    L0, L1 = lum(p0), lum(p1)
    sk = skin(p0)
    ys, xs = np.where(sk)
    # head + torso: the skin box's central column, from the head down to the hips (55 % of the figure)
    cx = int(np.median(xs[ys < np.percentile(ys, 40)]))
    top = int(ys.min())
    h = int(0.42 * (bottom(p0) - top))
    x0, x1 = max(0, cx - 34), min(p0.shape[1], cx + 34)
    tpl = L0[top:top + h, x0:x1]
    res = cv2.matchTemplate(L1, tpl, cv2.TM_CCOEFF_NORMED)
    _, score, _, loc = cv2.minMaxLoc(res)
    return (loc[0] - x0, loc[1] - top), float(score), (x0, top, x1, top + h)


def over(img, mask, col):
    m = (mask.astype(np.float32) / 255)[..., None]
    al = img[..., 3:4] / 255
    na = m + al * (1 - m)
    out = (np.array(col, np.float32) * m + img[..., :3] * al * (1 - m)) / np.maximum(na, 1e-3)
    img[..., :3] = np.clip(out, 0, 255); img[..., 3] = na[..., 0] * 255


def add_glow(img, cx, cy, r, col, strength=1.0):
    H, W = img.shape[:2]
    yy, xx = np.mgrid[:H, :W]
    w = np.clip(1 - np.hypot(xx - cx, yy - cy) / r, 0, 1) ** 1.6 * strength
    al = img[..., 3:4] / 255
    pre = img[..., :3] * al + np.array(col, np.float32) * w[..., None]
    na = np.clip(al[..., 0] + w * 0.85, 0, 1)
    img[..., :3] = np.clip(pre / np.maximum(na[..., None], 1e-3), 0, 255); img[..., 3] = na * 255


def arc(img, cx, cy, r, a0, a1, col, width, alpha=1.0):
    layer = np.zeros(img.shape[:2], np.uint8)
    cv2.ellipse(layer, (int(cx), int(cy)), (int(r), int(r)), 0, a0, a1, 255, width, cv2.LINE_AA)
    glow = cv2.GaussianBlur(layer, (0, 0), 2.5)
    over(img, (np.maximum(layer, glow * 0.7) * alpha).astype(np.uint8), col)


def head_box(rgba):
    """Top-most skin blob (the face) in a cell: returns its centre."""
    sk = skin(rgba)
    lbl, n = ndi.label(sk)
    if not n: return None
    best = None
    for i, sl in enumerate(ndi.find_objects(lbl)):
        area = (lbl[sl] == i + 1).sum()
        if area < 60: continue
        cy = (sl[0].start + sl[0].stop) / 2
        if best is None or cy < best[0]:
            best = (cy, (sl[1].start + sl[1].stop) / 2, sl)
    return best


# Tells in cell coordinates relative to the face centre found by head_box (hand-checked on the debug sheet).
TELLS = {
    5: ('croon', ),
    6: ('kiss', ),
    7: ('reel', ),
}


def paint_tells(i, cell, face):
    if face is None: return
    fy, fx = face[0], face[1]
    if i == 5:   # croon: the procedural rings, scaled 2x (painter arcs r26 and r40 round the head)
        arc(cell, fx, fy, 50, 0, 360, (232, 255, 106), 3, 0.9)
        arc(cell, fx, fy, 78, 23, 137, (240, 210, 120), 3, 0.75)
    elif i == 6:  # kiss: a soft yellow-green glow at the parted lips (the procedural eye/soul glow colour)
        add_glow(cell, fx + 12, fy + 10, 34, (180, 230, 100), 0.55)
        add_glow(cell, fx + 12, fy + 10, 14, (230, 255, 160), 0.6)
    elif i == 7:  # reel: the light that burns it, a pale warm flash at the face and shielding hand
        add_glow(cell, fx + 20, fy - 2, 60, (255, 240, 200), 0.45)
        add_glow(cell, fx + 20, fy - 2, 24, (255, 252, 235), 0.7)


def build(debug=None):
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    F, alpha, hard = key(a)
    owner, dropped, crumbs = figures(alpha)
    # detached flakes: ash grey (their own colour is mostly magenta fringe)
    lum = F[crumbs].mean(-1, keepdims=True)
    F[crumbs] = np.clip(lum * np.array([0.95, 0.95, 0.93]) + 16, 0, 200)
    poses = []
    for k in range(N):
        rgba, org = crop_pose(F, alpha, owner, k)
        poses.append((premul_resize(rgba, K), org, rgba.shape[:2]))
    sheet = np.zeros((CELL_H, CELL_W * N, 4), np.float32)
    # hover pair: pose 1 placed relative to pose 0 by the torso match (in source px, then scaled)
    (ox, oy), score, tbox = flap_offset(poses[0][0], poses[1][0])
    report = {'K': K, 'cell': [CELL_W, CELL_H], 'foot': FOOT, 'specksDropped': dropped, 'flapMatch': round(score, 3), 'flapOffset': [ox, oy], 'poses': []}
    place = {}
    for i, (p, org, _) in enumerate(poses):
        h, w = p.shape[:2]
        if i in (0, 1):
            p0 = poses[0][0]
            ax = body_x(p0); by = bottom(p0)
            if i == 1: ax += ox; by += oy
        elif i in (2, 8):
            ax, by = w / 2, bottom(p)       # airborne dive / lying flat: centre the whole figure
        else:
            ax, by = feet_x(p), bottom(p)
        dx = round(CELL_W / 2 - ax) + DX.get(i, 0)
        dy = FOOT - by
        place[i] = (dx, dy)
    for i, (p, org, srcshape) in enumerate(poses):
        h, w = p.shape[:2]
        dx, dy = place[i]
        cell = np.zeros((CELL_H, CELL_W, 4), np.float32)
        sy0, sx0 = max(0, -dy), max(0, -dx)
        sy1, sx1 = min(h, CELL_H - dy), min(w, CELL_W - dx)
        cell[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] = p[sy0:sy1, sx0:sx1]
        lost = float((p[..., 3] > 40).sum() - (cell[..., 3] > 40).sum())
        face = head_box(cell)
        paint_tells(i, cell, face)
        sheet[:, i * CELL_W:(i + 1) * CELL_W] = cell
        ys, xs = np.where(cell[..., 3] > 40)
        report['poses'].append({'i': i, 'name': NAMES[i], 'src': [int(org[0]), int(org[1]), int(srcshape[1]), int(srcshape[0])],
                                'place': [int(dx), int(dy)], 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                                'clipped': int(lost), 'face': None if face is None else [round(face[1]), round(face[0])]})
        if lost > 0: print(f'warning: pose {i} {NAMES[i]} clipped {int(lost)} px', file=sys.stderr)
    out = np.clip(sheet + 0.5, 0, 255).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    # fringe check: kept pixels that still read as magenta/pink
    rgbk = out[..., :3].astype(int)
    pink = (out[..., 3] > 25) & ((np.minimum(rgbk[..., 0], rgbk[..., 2]) - rgbk[..., 1]) > 50)
    report['pinkPx'] = int(pink.sum()); report['opaquePx'] = int((out[..., 3] > 25).sum())
    Image.fromarray(out, 'RGBA').save(OUT, 'WEBP', quality=88, method=6, exact=False)
    report['sheet'] = [os.path.relpath(OUT, ROOT), list(out.shape[1::-1]), os.path.getsize(OUT)]
    if debug:
        os.makedirs(debug, exist_ok=True)
        bg = np.zeros_like(out[..., :3]) + np.array([48, 56, 72], np.uint8)
        al = out[..., 3:4] / 255.0
        comp = (out[..., :3] * al + bg * (1 - al)).astype(np.uint8)
        for i in range(1, N): comp[:, i * CELL_W] = (255, 255, 0)
        comp[FOOT] = (0, 255, 0)
        comp[:, [i * CELL_W + CELL_W // 2 for i in range(N)]] = (255, 80, 80)
        Image.fromarray(comp).save(os.path.join(debug, 'sheet-debug.png'))
        Image.fromarray((np.dstack([out[..., 3]] * 3))).save(os.path.join(debug, 'sheet-alpha.png'))
    return report


def portrait():
    im = Image.open(SRC_P).convert('RGB')
    W, H = im.size
    # the face sits right of centre (about 804, 498 in the 1254 source): centre the crop on the head so it reads in
    # the 68 px HUD ring like the other boss portraits; the right wing top and the shoulders stay in
    side = int(W * 0.686)
    x0, y0 = int(W * 0.247), int(H * 0.072)
    im = im.crop((x0, y0, x0 + side, y0 + side)).resize((PORTRAIT, PORTRAIT), Image.LANCZOS)
    im.save(OUT_P, 'WEBP', quality=90, method=6)
    return [os.path.relpath(OUT_P, ROOT), [PORTRAIT, PORTRAIT], os.path.getsize(OUT_P)]


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


if __name__ == '__main__':
    dbg = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    rep = build(dbg)
    rep['portrait'] = portrait()
    rep['sha256'] = {os.path.relpath(p, ROOT): sha(p) for p in (OUT, OUT_P, SRC, SRC_P)}
    print(json.dumps(rep, indent=1))
