#!/usr/bin/env python3
"""Build the painted Stage 6 (Stone of Tear) art from ChatGPT collages. Spec: docs/stage6/ART.md.
Prompts: /workspace/stage6art/CHATGPT_PROMPTS.md. Sources are kept verbatim in art-in/stage6/.

Generic job kinds (reusable for later stages: copy JOBS, keep the functions):
  poses   chroma-keyed pose collage -> one trimmed Phaser JSON-hash atlas per character (frames "0".."n",
          sourceSize = the cell, feet at FOOT_Y = 0.96 of the cell) + optional HUD portrait cut from a head.
          One scale per character: the idle pose is painted at RES painted px per screen px for its target
          on-screen height (screen_h), so the actor draws the atlas at meta.drawScale = 1 / RES.
  props   chroma-keyed item collage -> one spritesheet (fixed cell, frames left to right) or image per key.
          One scale per key so every frame of a key keeps the same size.
  bands   horizontal bands separated by solid chroma bars -> one plate/tile per band (cover-crop, resize;
          optional sky key-out + top trim, edge feather for overlapping parallax plates, seamless wrap for tiles).
  image   one opaque image -> cover-crop + resize (the far plate).
  panels  2x2 grid separated by chroma gutters -> story panels in reading order.

Keying (from tools/stage5/process_bosses.py): excess s = min(R,B)-G for magenta, G-max(R,B) for green. Deep key
(7x7 erosion of s > 150) cleared; the edge band gets alpha from s and its colour unmixed from the measured key
colour; kept pixels are despilled. Per pixel, so enclosed key (between legs, inside a net) is keyed too.

Budgets: every output's decoded RGBA (w*h*4) is checked against BUDGET_MIB and the Stage 6 total against
TOTAL_MIB. Over budget fails (exit 2) unless --allow-over. Deterministic: same sources, byte-identical outputs.

Usage: python3 tools/stage6/process_art.py [--src art-in/stage6] [--out .] [--only belal,props,...] [--res 1.0]
                                           [--debug DIR] [--report FILE] [--allow-over] [--write-status]
       (needs numpy, opencv-python, Pillow, scipy)
"""
import hashlib, json, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LO, HI, EDGE, SPILL = 36.0, 225.0, 6.0, 34.0
BLEED_A, BLEED_R = 0.6, 5
PAGE_MAX, GUTTER, CELL_MAX, FOOT_Y = 2048, 2, 1024, 0.96
RES = 1.0  # painted px per on-screen px at rs=1 (1280x720)

# Decoded RGBA MiB per output key (docs/stage6/ART.md, "Memory budget").
BUDGET_MIB = {
    's6belal': 2.10, 's6gray': 0.80, 's6fade': 1.15, 's6rand': 0.75, 's6def': 0.30,
    'belalPortrait': 0.08, 'randPortrait': 0.08,
    's6ribbon': 0.02, 's6hatch': 0.10, 's6oil': 0.30, 's6lamp': 0.45, 's6net': 0.15, 's6streak': 0.10, 's6call': 0.40,
    'bg6far': 1.85, 'bg6mid': 1.40, 'bg6mid2': 1.40, 'bg6mid3': 1.85, 'bg6mid4': 1.85,
    'bg6floor': 0.55, 'bg6floor2': 0.55, 'bg6floor3': 0.90,
    'story6p1': 0.90, 'story6p2': 0.90, 'story6p3': 0.90,
}
TRANSIENT = {'story6p1', 'story6p2', 'story6p3'}  # freed at stage start, not resident at the boss peak
TOTAL_MIB = 17.0  # resident Stage 6 painted set at the boss peak

OUT = {'chars': 'assets/stage6/chars', 'ui': 'assets/stage6/ui', 'props': 'assets/stage6/props',
       'story': 'assets/stage6/story', 'bg': 'assets/bg6'}

JOBS = {
    'belal': dict(kind='poses', src='belal.src.png', chroma='magenta', rows=(4, 4), chars=[
        dict(key='s6belal', poses=list(range(8)), frames=list(range(8)), idle=0, screen_h=250,
             names=['idle', 'flurry1', 'flurry2', 'flurry3', 'lunge', 'channel', 'stagger', 'fall'],
             feet={1, 2, 3, 4}, body={7}, flip=set())],
        portraits=[dict(key='belalPortrait', char='s6belal', pose=0, sky=((28, 30, 44), (6, 6, 10)))]),
    'grayfade': dict(kind='poses', src='grayfade.src.png', chroma='magenta', rows=(5, 6), chars=[
        # s6gray frame 0 is never shown; it aliases idle so the atlas keeps the code-drawn frame numbers.
        dict(key='s6gray', poses=[0, 1, 2, 3, 4], frames=[0, 0, 1, 2, 3, 4], idle=0, screen_h=205,
             names=['idle', 'slash', 'lunge', 'reel', 'down'], feet={2}, body={4}, flip=set()),
        dict(key='s6fade', poses=[5, 6, 7, 8, 9, 10], frames=[0, 1, 2, 3, 4, 5], idle=0, screen_h=235,
             names=['idle', 'blink', 'cut1', 'cut2', 'cut3', 'down'], feet={2, 3, 4}, body={5}, flip=set())]),
    'randdef': dict(kind='poses', src='randdef.src.png', chroma='magenta', rows=(4, 3), chars=[
        # Pose 3's lightning carries a pink-violet glow that sits close to the magenta key: shift it to blue.
        dict(key='s6rand', poses=[0, 1, 2, 3], frames=[0, 1, 2, 3], idle=1, screen_h=215,
             names=['angreal', 'stand', 'fire', 'lightning'], feet=set(), body=set(), flip=set(),
             fix={3: ('violet', 1.0)}),
        # Defender pose 5 is almost face-on and flickers in the march loop; the loop uses the two side-view
        # strides (4, 6), feet-registered, as frames 0-1-0 (the code cycles frames 0..2).
        dict(key='s6def', poses=[4, 6], frames=[0, 1, 0], idle=0, screen_h=200,
             names=['stride', 'stride2'], feet={1}, body=set(), flip=set())],
        portraits=[dict(key='randPortrait', char='s6rand', pose=1, sky=((70, 18, 22), (14, 6, 8)))]),
    'props': dict(kind='props', src='props.src.png', chroma='green', rows=(4, 3, 2, 2), items=[
        # reading order -> (key, frame). cell = output frame size; anchor = where the scaled item sits in it.
        ('s6hatch', 0), ('s6hatch', 1), ('s6oil', 0), ('s6oil', 1),
        ('s6lamp', 0), ('s6lamp', 1), ('s6lamp', 2),
        ('s6net', 0), ('s6streak', 0), ('s6call', 0), ('s6call', 1)],
        # neutralize: the lantern glass/chain and net cord picked up a green-teal tint from the key.
        # flare: Callandor #11 is painted only a little brighter than #10, so frame 1 is brightened + haloed
        # (pad leaves room for the halo inside the cell).
        keys={'s6hatch': dict(cell=(120, 60), anchor='bottom'), 's6oil': dict(cell=(192, 192), anchor='center'),
              's6lamp': dict(cell=(192, 192), anchor='top', neutralize='green'),
              's6net': dict(cell=(512, 64), anchor='center', neutralize='green'),
              's6streak': dict(cell=(512, 48), anchor='center'),
              's6call': dict(cell=(160, 320), anchor='bottom', pad=12, flare={1: {}})}),
    'far': dict(kind='image', src='far.src.png', key='bg6far', size=(1024, 464), fmt='jpg'),
    'exterior': dict(kind='bands', src='plates-exterior.src.png', chroma='magenta', separator='black', bands=[
        # Fit to width (the painted bands are about 3.4:1; a 1024x460 cover crop would cut away half of each).
        # The sea gate's open gateway is flat magenta too: holes not connected to the sky are filled with a dark
        # passage so the storm sky does not show through the gate at ground level.
        dict(key='bg6mid', size=(1024, None), sky=True, max_h=340, feather=96, fmt='webp'),
        dict(key='bg6mid2', size=(1024, None), sky=True, max_h=340, feather=96, fmt='webp', fill_holes=True)]),
    'interior': dict(kind='bands', src='plates-interior.src.png', chroma='magenta', bands=[
        dict(key='bg6mid3', size=(1024, 464), sky=False, feather=96, fmt='webp'),
        dict(key='bg6mid4', size=(1024, 464), sky=False, feather=96, fmt='webp')]),
    'floors': dict(kind='bands', src='floors.src.png', chroma='magenta', bands=[
        # flatten: the painted floors carry repeated vertical reflection streaks that would repeat every tile;
        # 65 percent of the horizontal brightness swing at streak scale is divided out, and a 160 px wrap crossfade
        # keeps the ghosted grout at the seam faint.
        dict(key='bg6floor', size=(768, 180), seamless=160, flatten=0.65, fmt='jpg'),
        dict(key='bg6floor2', size=(768, 180), seamless=160, flatten=0.65, fmt='jpg'),
        # The Heart's floor has a ring inlay that cannot tile: one 1280 px image spans the boss zone exactly.
        dict(key='bg6floor3', size=(1280, 180), flatten=0.65, fmt='jpg')]),
    'story': dict(kind='panels', src='story.src.png', chroma='magenta', grid=(2, 2),
                  panels=[dict(key='story6p1'), dict(key='story6p2'), dict(key='story6p3')], size=(640, 360)),
    # Reuse: Twinkle Toes' painted ribbon at pickup size (the shared 256 px file would draw 180 px at the pickup's
    # 0.7 scale and cost 0.25 MiB; this is 48 px, 9 KiB). Source is a repo asset, not a collage.
    'ribbon': dict(kind='derive', src='../../assets/props/item-ribbon.webp', key='s6ribbon', box=48),
}
DIR_OF = {'poses': 'chars', 'props': 'props', 'image': 'bg', 'bands': 'bg', 'panels': 'story', 'derive': 'props'}


# ---------- keying ----------
def excess(a, chroma):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return np.minimum(R, B) - G if chroma == 'magenta' else G - np.maximum(R, B)


def key(a, chroma):
    s = excess(a, chroma)
    hard = s > 150
    if hard.sum() < 1000:
        raise SystemExit(f'no {chroma} background found')
    Kc = np.median(a[s > 200], axis=0)
    deep = cv2.erode(hard.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    near = cv2.dilate(hard.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    band = near & ~deep
    alpha = np.ones(s.shape, np.float32)
    est = 1.0 - np.clip((s - LO) / (HI - LO), 0, 1)
    alpha[band] = est[band]
    alpha[deep] = 0
    alpha = np.where(alpha < 0.04, 0, np.where(alpha > 0.97, 1, alpha)).astype(np.float32)
    F = np.clip((a - (1 - alpha)[..., None] * Kc) / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    e = excess(F, chroma)
    cap = np.where((alpha < 1) & (alpha > 0), np.minimum(e, EDGE), np.minimum(e, EDGE * 2))
    ex = np.maximum(e - cap, 0)
    if chroma == 'magenta':
        F = np.stack([F[..., 0] - ex, F[..., 1], F[..., 2] - ex * 0.85], -1)
    else:
        F = np.stack([F[..., 0], F[..., 1] - ex, F[..., 2]], -1)
    w = np.clip((excess(F, chroma) - SPILL) / 30, 0, 1)[..., None]
    F = F * (1 - w) + F.mean(-1, keepdims=True) * w
    # Over-correction guard: unmixing/despill must not swing an edge pixel to the opposite hue
    # (magenta key -> green fringe, green key -> magenta fringe).
    edge = (alpha < 1)[..., None]
    if chroma == 'magenta':
        F[..., 1] = np.where(edge[..., 0], np.minimum(F[..., 1], np.maximum(F[..., 0], F[..., 2]) + EDGE), F[..., 1])
    else:
        ex = np.where(edge[..., 0], np.maximum(np.minimum(F[..., 0], F[..., 2]) - F[..., 1] - EDGE, 0), 0)[..., None]
        F = F - ex * np.array([1.0, 0.0, 1.0], np.float32)
    # Edge colour bleed: unmixing is noisy at low alpha, so faint edge pixels take the colour of the nearby
    # solid art (alpha >= BLEED_A), weighted toward their own unmixed colour as alpha rises. Thin bright
    # strokes (Be'lal's white fire edges) are mostly alpha >= 0.6 cores and keep their own colour.
    solid = (alpha >= BLEED_A).astype(np.float32)
    num = cv2.blur(F * solid[..., None], (BLEED_R, BLEED_R))
    den = cv2.blur(solid, (BLEED_R, BLEED_R))[..., None]
    nb = np.where(den > 1e-3, num / np.maximum(den, 1e-3), F)
    t = np.clip(alpha / BLEED_A, 0, 1)[..., None]
    soft = ((alpha > 0) & (alpha < BLEED_A))[..., None]
    F = np.where(soft, nb * (1 - t) + F * t, F)
    return np.clip(F, 0, 255), alpha


def neutralize(rgba, hue, strength=1.0):
    """Hard per-key colour fix for painted-in key tints. hue='green': olive/green/teal pixels (G > 0.85 R) go to a
    warm grey of the same luminance (lantern glass, chain, net cord picked up the green key). hue='violet':
    pink-violet pixels (B >= 0.8 R, both above G) shift toward the blue-white of the lightning."""
    R, G, B = rgba[..., 0], rgba[..., 1], rgba[..., 2]
    if hue == 'green':
        w = np.clip((G - 0.85 * R - 2) / 16, 0, 1) * strength  # olive/green/teal; brass and flame (G << R) untouched
        L = 0.30 * R + 0.59 * G + 0.11 * B
        tgt = np.stack([L * 1.06, L, L * 0.86], -1)
    else:
        w = np.clip((np.minimum(R, B) - G - 8) / 30, 0, 1) * (B >= 0.8 * R) * strength
        tgt = np.stack([G + (R - G) * 0.35, G + (np.minimum(R, B) - G) * 0.25, B], -1)
    w = w[..., None]
    rgba[..., :3] = np.clip(rgba[..., :3] * (1 - w) + tgt * w, 0, 255)
    return rgba


def flare(rgba, gain=1.22, lift=16, glow=(170, 220, 255), glow_a=0.55, radius=7):
    """Brighten a frame and give it a soft outer glow (Callandor's flaring frame vs its dormant frame)."""
    out = rgba.copy()
    out[..., :3] = np.clip(out[..., :3] * gain + lift, 0, 255)
    a = out[..., 3] / 255.0
    halo = cv2.GaussianBlur(a, (0, 0), radius) * glow_a
    ha = np.clip(halo * (1 - a), 0, 1)
    na = a + ha
    col = (out[..., :3] * a[..., None] + np.array(glow, np.float32) * ha[..., None]) / np.maximum(na, 1e-3)[..., None]
    out[..., :3] = col; out[..., 3] = np.clip(na, 0, 1) * 255
    return out


def load(src_dir, name):
    p = os.path.join(src_dir, name)
    if not os.path.exists(p):
        raise FileNotFoundError(p)
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32), p


# ---------- blobs ----------
def blobs(alpha, rows):
    n = sum(rows)
    fg = alpha > 0
    lbl, count = ndi.label(fg, structure=np.ones((3, 3)))
    if count < n:
        raise SystemExit(f'expected {n} elements, found {count} blobs')
    sizes = ndi.sum(fg, lbl, range(1, count + 1))
    order = np.argsort(-sizes, kind='stable')
    big = [int(i) + 1 for i in order[:n]]
    if count > n and sizes[order[n]] > 0.25 * sizes[order[n - 1]]:
        raise SystemExit(f'blob {n + 1} is {int(sizes[order[n]])} px against {int(sizes[order[n - 1]])}: '
                         f'the collage does not hold exactly {n} separate elements')
    objs = ndi.find_objects(lbl)
    cy = {i: (objs[i - 1][0].start + objs[i - 1][0].stop) / 2 for i in big}
    by_y = sorted(big, key=lambda i: (cy[i], objs[i - 1][1].start))
    ordered, at = [], 0
    groups = []
    for r in rows:
        groups.append(by_y[at:at + r]); at += r
    for a, b in zip(groups, groups[1:]):
        if max(cy[i] for i in a) >= min(cy[i] for i in b):
            raise SystemExit('rows overlap in y: check the collage layout / row counts')
    for g in groups:
        ordered += sorted(g, key=lambda i: objs[i - 1][1].start)
    owner = np.full(lbl.shape, -1, np.int16)
    for k, i in enumerate(ordered):
        owner[lbl == i] = k
    dist = np.stack([ndi.distance_transform_edt(lbl != i) for i in ordered])
    for i in range(1, count + 1):
        if i in ordered or sizes[i - 1] < 4: continue
        m = lbl == i
        ys, xs = np.where(m)
        owner[m] = int(np.argmin(dist[:, ys, xs].mean(1)))
    return owner


def crop(F, alpha, owner, k):
    m = owner == k
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
    rgba[..., :3] = F[y0:y1, x0:x1]
    rgba[..., 3] = alpha[y0:y1, x0:x1] * m[y0:y1, x0:x1] * 255
    return rgba


def resize(rgba, k=None, size=None):
    h, w = rgba.shape[:2]
    nw, nh = size if size else (max(1, round(w * k)), max(1, round(h * k)))
    shrink = nw < w
    if rgba.shape[2] == 3:
        return np.clip(cv2.resize(rgba, (nw, nh), interpolation=cv2.INTER_AREA if shrink else cv2.INTER_LANCZOS4), 0, 255)
    al = rgba[..., 3:4] / 255.0
    pre = np.concatenate([rgba[..., :3] * al, al * 255], -1).astype(np.float32)
    r = np.clip(cv2.resize(pre, (nw, nh), interpolation=cv2.INTER_AREA if shrink else cv2.INTER_LANCZOS4), 0, 255)
    a2 = r[..., 3:4] / 255.0
    rgb = np.where(a2 > 1e-3, r[..., :3] / np.maximum(a2, 1e-3), 0)
    return np.concatenate([np.clip(rgb, 0, 255), r[..., 3:4]], -1)


def opaque_rows(p, t=128):
    return np.where((p[..., 3] > t).sum(1) >= 3)[0]


def height(p):
    r = opaque_rows(p)
    return int(r[-1] - r[0] + 1)


def torso_x(p):
    a = p[..., 3] > 200
    rows = np.where(a.any(1))[0]
    top, bot = rows[0], rows[-1]
    band = np.zeros(a.shape, bool)
    band[int(top + 0.4 * (bot - top)):int(top + 0.7 * (bot - top)) + 1] = True
    m = a & band
    return float(np.median(np.where(m)[1])) if m.sum() >= 20 else p.shape[1] / 2


def feet_x(p):
    a = p[..., 3] > 128
    rows = np.where(a.any(1))[0]
    top, bot = rows[0], rows[-1]
    return float(np.where(a[int(bot - 0.08 * (bot - top)):bot + 1])[1].mean())


def to_u8(p):
    out = np.clip(p + 0.5, 0, 255).astype(np.uint8)
    if out.shape[2] == 4: out[out[..., 3] == 0, :3] = 0
    return out


def save(arr, path, fmt):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if fmt == 'jpg':
        Image.fromarray(arr[..., :3], 'RGB').save(path, 'JPEG', quality=86, optimize=True, progressive=True)
    else:
        Image.fromarray(arr, 'RGBA' if arr.shape[2] == 4 else 'RGB').save(path, 'WEBP', quality=88, method=6, exact=False)


def pack(cells, path_img, app, meta_extra, frames_map):
    """Shelf-pack trimmed cells (deterministic, frame order) into one page; aliases reuse a packed rect."""
    x = y = shelf = 0
    spots = []
    for out, (x0, y0, x1, y1) in cells:
        w, h = x1 - x0, y1 - y0
        if x and x + w > PAGE_MAX:
            x, y, shelf = 0, y + shelf + GUTTER, 0
        spots.append((x, y)); x += w + GUTTER; shelf = max(shelf, h)
    PW = max(sx + (c[1][2] - c[1][0]) for (sx, _), c in zip(spots, cells))
    PH = y + shelf
    page = np.zeros((PH, PW, 4), np.uint8)
    H, W = cells[0][0].shape[:2]
    rects = []
    for (out, (x0, y0, x1, y1)), (sx, sy) in zip(cells, spots):
        w, h = x1 - x0, y1 - y0
        page[sy:sy + h, sx:sx + w] = out[y0:y1, x0:x1]
        rects.append({'frame': {'x': sx, 'y': sy, 'w': w, 'h': h}, 'rotated': False, 'trimmed': True,
                      'spriteSourceSize': {'x': x0, 'y': y0, 'w': w, 'h': h}, 'sourceSize': {'w': W, 'h': H}})
    atlas = {'frames': {str(f): rects[p] for f, p in enumerate(frames_map)},
             'meta': dict({'app': app, 'image': os.path.basename(path_img), 'size': {'w': PW, 'h': PH},
                           'scale': '1', 'format': 'RGBA8888'}, **meta_extra)}
    save(page, path_img, 'webp')
    with open(path_img[:-5] + '.json', 'w') as f:
        json.dump(atlas, f, indent=1, sort_keys=True); f.write('\n')
    return page


# ---------- job kinds ----------
def job_poses(name, job, src_dir, out_root, debug):
    a, path = load(src_dir, job['src'])
    F, alpha = key(a, job['chroma'])
    owner = blobs(alpha, job['rows'])
    raw = [crop(F, alpha, owner, k) for k in range(sum(job['rows']))]
    report, made = {}, {}
    for ch in job['chars']:
        poses = [raw[i].copy() for i in ch['poses']]
        for j, (hue, st) in ch.get('fix', {}).items():
            poses[j] = neutralize(poses[j], hue, st)
        poses = [np.ascontiguousarray(p[:, ::-1]) if j in ch['flip'] else p for j, p in enumerate(poses)]
        K = RES * ch['screen_h'] / height(poses[ch['idle']])
        bound = 'target'
        for j, p in enumerate(poses):
            if height(p) * K > CELL_MAX * FOOT_Y - 8:
                K, bound = (CELL_MAX * FOOT_Y - 8) / height(p), 'height of ' + ch['names'][j]
        K = round(K, 5)
        poses = [resize(p, K) for p in poses]
        ip = poses[ch['idle']]
        it, ifx = torso_x(ip), feet_x(ip)
        place = []
        for j, p in enumerate(poses):
            if j in ch['body']: dx, mode = -p.shape[1] / 2, 'body'
            elif j in ch['feet']: dx, mode = (ifx - it) - feet_x(p), 'feet'
            else: dx, mode = -torso_x(p), 'torso'
            place.append((int(round(dx)), mode))
        half = max(max(-dx, dx + p.shape[1]) for (dx, _), p in zip(place, poses)) + 4
        up = max(int(opaque_rows(p)[-1]) + 1 for p in poses) + 4
        W = int(-(-2 * half // 8) * 8)
        H = int(-(-(up / FOOT_Y) // 8) * 8)
        FOOT = round(H * FOOT_Y)
        while FOOT < up: H += 8; FOOT = round(H * FOOT_Y)
        cells, entries = [], []
        for j, p in enumerate(poses):
            h, w = p.shape[:2]
            fy = int(opaque_rows(p)[-1])
            dx = place[j][0] + W // 2
            dy = FOOT - fy
            cell = np.zeros((H, W, 4), np.float32)
            sy0, sx0 = max(0, -dy), max(0, -dx)
            sy1, sx1 = min(h, H - dy), min(w, W - dx)
            cell[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] = p[sy0:sy1, sx0:sx1]
            out = to_u8(cell)
            ys, xs = np.where(out[..., 3] > 0)
            cells.append((out, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)))
            entries.append({'pose': ch['names'][j], 'anchor': place[j][1], 'place': [int(dx), int(dy)]})
        img = os.path.join(out_root, OUT['chars'], ch['key'] + '.webp')
        page = pack(cells, img, 'tools/stage6/process_art.py',
                    {'drawScale': round(1 / RES, 5), 'origin': [0.5, FOOT_Y], 'screenH': ch['screen_h'], 'res': RES},
                    ch['frames'])
        made[ch['key']] = cells
        report[ch['key']] = {'source': os.path.relpath(path, ROOT), 'K': K, 'boundBy': bound, 'cell': [W, H],
                             'foot': FOOT, 'drawScale': round(1 / RES, 5), 'frames': ch['frames'], 'poses': entries,
                             'files': [img, img[:-5] + '.json'], 'size': [page.shape[1], page.shape[0]]}
        if debug: contact(debug, ch['key'], [c for c, _ in cells], FOOT)
    for pt in job.get('portraits', []):
        out, _ = made[pt['char']][pt['pose']]
        report[pt['key']] = portrait(out, pt, out_root, path)
    return report


def portrait(out, pt, out_root, path, side_out=136):
    a = out[..., 3] > 128
    rows = np.where(a.any(1))[0]
    top, bot = int(rows[0]), int(rows[-1])
    head = max(8, round(0.16 * (bot - top)))
    cx = float(np.where(a[top:top + head])[1].mean())
    side = round(2.6 * head)
    x0, y0 = int(round(cx - side / 2)), max(0, top - round(0.15 * head))
    bg = np.linspace(pt['sky'][0], pt['sky'][1], side)[:, None, :] * np.ones((side, side, 3))
    cut = np.zeros((side, side, 4), np.float32)
    H, W = out.shape[:2]
    sx0, sy0, sx1, sy1 = max(0, x0), y0, min(W, x0 + side), min(H, y0 + side)
    cut[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = out[sy0:sy1, sx0:sx1]
    al = cut[..., 3:4] / 255.0
    im = Image.fromarray((cut[..., :3] * al + bg * (1 - al)).astype(np.uint8)).resize((side_out, side_out), Image.LANCZOS)
    p = os.path.join(out_root, OUT['ui'], pt['key'] + '.webp')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, 'WEBP', quality=90, method=6)
    return {'source': os.path.relpath(path, ROOT), 'from': f"{pt['char']} pose {pt['pose']} head", 'files': [p],
            'size': [side_out, side_out]}


def job_props(name, job, src_dir, out_root, debug):
    a, path = load(src_dir, job['src'])
    F, alpha = key(a, job['chroma'])
    owner = blobs(alpha, job['rows'])
    if len(job['items']) != sum(job['rows']):
        raise SystemExit('props: item list does not match the row counts')
    by_key = {}
    for k, (kk, fr) in enumerate(job['items']):
        by_key.setdefault(kk, []).append((fr, crop(F, alpha, owner, k)))
    report = {}
    for kk, items in by_key.items():
        cw, ch = job['keys'][kk]['cell']
        spec = job['keys'][kk]
        anchor, pad = spec['anchor'], spec.get('pad', 2)
        items.sort(key=lambda t: t[0])
        if spec.get('neutralize'):
            items = [(fr, neutralize(p.copy(), spec['neutralize'])) for fr, p in items]
        s = min(min((cw - 2 * pad) / p.shape[1], (ch - 2 * pad) / p.shape[0]) for _, p in items)  # one scale per key
        strip = np.zeros((ch, cw * len(items), 4), np.float32)
        for i, (fr, p) in enumerate(items):
            q = resize(p, s)
            h, w = q.shape[:2]
            x = (cw - w) // 2
            y = {'bottom': ch - pad - h, 'top': pad, 'center': (ch - h) // 2}[anchor]
            cell = np.zeros((ch, cw, 4), np.float32)
            cell[y:y + h, x:x + w] = q
            if fr in spec.get('flare', {}):
                cell = flare(cell, **spec['flare'][fr])
            strip[:, i * cw:(i + 1) * cw] = cell
        out = to_u8(strip)
        img = os.path.join(out_root, OUT['props'], kk + '.webp')
        save(out, img, 'webp')
        report[kk] = {'source': os.path.relpath(path, ROOT), 'frames': len(items), 'frameWidth': cw, 'frameHeight': ch,
                      'scale': round(s, 5), 'anchor': anchor, 'files': [img], 'size': [out.shape[1], out.shape[0]]}
        if debug: contact(debug, kk, [out], None)
    return report


def bar_mask(a, chroma, frac=0.9, sep='chroma'):
    """Separator rows/columns: solid chroma (default) or solid black (sep='black', for plates whose sky is the key)."""
    s = (a.max(-1) < 16) if sep == 'black' else (excess(a, chroma) > 150)
    if sep == 'black': frac = max(frac, 0.97)
    return s.mean(1) >= frac, s.mean(0) >= frac


def runs(mask, min_len):
    out, start = [], None
    for i, v in enumerate(list(mask) + [True]):
        if not v and start is None: start = i
        if v and start is not None:
            if i - start >= min_len: out.append((start, i))
            start = None
    return out


def cover(img, size):
    h, w = img.shape[:2]
    tw, th = size
    if w / h > tw / th:
        nw = round(h * tw / th); x0 = (w - nw) // 2; img = img[:, x0:x0 + nw]
    else:
        nh = round(w * th / tw); y0 = (h - nh) // 2; img = img[y0:y0 + nh]
    return resize(img, size=size)


def seamless(img, o):
    """Horizontal wrap: the last o columns fade into the first o, then are cut off. Width shrinks by o; the
    caller over-sizes first."""
    w = img.shape[1]
    ramp = np.linspace(0, 1, o)[None, :, None]
    out = img[:, :w - o].copy()
    out[:, :o] = img[:, w - o:] * (1 - ramp) + img[:, :o] * ramp
    return out


def fit_width(img, w):
    return resize(img, size=(w, max(1, round(img.shape[0] * w / img.shape[1]))))


def flatten(img, amount, sigma=20):
    """Divide out part of the low-frequency horizontal brightness swing (reflection streaks) per row band."""
    L = img.mean(-1).astype(np.float32) + 1.0
    low = cv2.GaussianBlur(L, (0, 0), sigmaX=sigma, sigmaY=6)
    gain = (low.mean(1, keepdims=True) / low) ** amount
    return np.clip(img * gain[..., None], 0, 255)


def fill_holes(rgba, min_area=1500, below=0.45):
    """Transparent regions not connected to the top edge (a keyed gateway, not sky) become an opaque dark
    passage, darker at the top; the semi-transparent rim is composited over it. Small pockets (between rigging)
    and holes above `below` of the height stay transparent."""
    a = rgba[..., 3] / 255.0
    clear = a < 0.5
    lbl, n = ndi.label(clear)
    top = set(np.unique(lbl[0][lbl[0] > 0]).tolist())
    H = rgba.shape[0]
    mask = np.zeros(clear.shape, bool)
    for i, sl in enumerate(ndi.find_objects(lbl), 1):
        if i in top or sl is None: continue
        m = lbl[sl] == i
        if m.sum() < min_area or (sl[0].start + sl[0].stop) / 2 < below * H: continue
        mask[sl] |= m
    if not mask.any(): return rgba, 0
    # The portcullis grille above the opening leaves small enclosed holes: fill those too, inside the
    # opening's box extended upward by 60 percent of its height.
    ys, xs = np.where(mask)
    y0 = max(0, int(ys.min() - 0.6 * (ys.max() - ys.min()))); box = np.zeros_like(mask)
    box[y0:ys.max() + 1, xs.min():xs.max() + 1] = True
    for i, sl in enumerate(ndi.find_objects(lbl), 1):
        if i in top or sl is None: continue
        m = (lbl[sl] == i) & box[sl]
        if m.any() and m.sum() == (lbl[sl] == i).sum(): mask[sl] |= m
    grow = cv2.dilate(mask.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    ys = np.where(grow.any(1))[0]
    t = np.clip((np.arange(H) - ys[0]) / max(1, ys[-1] - ys[0]), 0, 1)[:, None, None]
    fill = np.array([14, 13, 18], np.float32) * (1 - t) + np.array([38, 32, 30], np.float32) * t
    fill = np.broadcast_to(fill, rgba[..., :3].shape)
    al = a[..., None]
    rgb = np.where(grow[..., None], rgba[..., :3] * al + fill * (1 - al), rgba[..., :3])
    rgba = rgba.copy(); rgba[..., :3] = rgb; rgba[..., 3] = np.where(grow, 255, rgba[..., 3])
    return rgba, int(mask.sum())


def feather(rgba, px):
    ramp = np.clip(np.arange(rgba.shape[1]) / px, 0, 1) * np.clip((rgba.shape[1] - 1 - np.arange(rgba.shape[1])) / px, 0, 1)
    rgba[..., 3] *= ramp[None, :]
    return rgba


def job_bands(name, job, src_dir, out_root, debug):
    a, path = load(src_dir, job['src'])
    rows_bar, _ = bar_mask(a, job['chroma'], sep=job.get('separator', 'chroma'))
    bands = runs(rows_bar, int(0.08 * a.shape[0]))
    if len(bands) != len(job['bands']):
        raise SystemExit(f'{name}: expected {len(job["bands"])} bands between chroma bars, found {len(bands)} {bands}')
    report = {}
    for (y0, y1), b in zip(bands, job['bands']):
        img = a[y0 + 4:y1 - 4]  # drop the anti-aliased rim of the separator bars
        side = (img.max(-1) < 16) if job.get('separator') == 'black' else (excess(img, job['chroma']) > 150)
        cols = np.where(side.mean(0) < 0.97)[0]  # drop side bars
        img = img[:, cols[0]:cols[-1] + 1]
        tw, th = b['size']
        holes = 0
        if b.get('seamless'):
            src = flatten(img, b['flatten']) if b.get('flatten') else img
            out = seamless(cover(src, (tw + b['seamless'], th)), b['seamless'])
        elif b.get('sky'):
            F, al = key(img, job['chroma'])
            # Thin rigging/bars against the keyed sky unmix to saturated blue-violet: semi-transparent pixels are
            # pulled 75 percent toward a cool grey of their own luminance, then any violet cast is neutralized.
            edge = ((al > 0) & (al < 1))[..., None]
            Lm = F.mean(-1, keepdims=True) * np.array([0.96, 1.0, 1.08], np.float32)
            F = np.where(edge, F * 0.25 + Lm * 0.75, F)
            rgba = neutralize(np.concatenate([F, al[..., None] * 255], -1), 'violet')
            if b.get('fill_holes'): rgba, holes = fill_holes(rgba)
            rgba = fit_width(rgba, tw) if th is None else cover(rgba, (tw, th))
            r = opaque_rows(rgba, 8)
            rgba = rgba[max(0, int(r[0]) - 2, rgba.shape[0] - b['max_h']):]
            out = feather(rgba, b['feather']) if b.get('feather') else rgba
        else:
            out = cover(flatten(img, b['flatten']) if b.get('flatten') else img, (tw, th))
            if b.get('feather'):
                out = feather(np.concatenate([out, np.full(out.shape[:2] + (1,), 255.0)], -1), b['feather'])
        u8 = to_u8(out)
        p = os.path.join(out_root, OUT['bg'], b['key'] + ('.jpg' if b['fmt'] == 'jpg' else '.webp'))
        save(u8, p, b['fmt'])
        report[b['key']] = {'source': os.path.relpath(path, ROOT), 'band': [int(y0), int(y1)], 'files': [p],
                            'size': [u8.shape[1], u8.shape[0]], 'alpha': u8.shape[2] == 4}
        if holes: report[b['key']]['filledHolePx'] = holes
        if debug: contact(debug, b['key'], [u8], None)
    return report


def job_image(name, job, src_dir, out_root, debug):
    a, path = load(src_dir, job['src'])
    u8 = to_u8(cover(a, job['size']))
    p = os.path.join(out_root, OUT['bg'], job['key'] + '.' + job['fmt'])
    save(u8, p, job['fmt'])
    return {job['key']: {'source': os.path.relpath(path, ROOT), 'files': [p], 'size': list(job['size'])}}


def job_panels(name, job, src_dir, out_root, debug):
    a, path = load(src_dir, job['src'])
    # Gutters can be thin (about 20 px) and anti-aliased: a row/column counts as gutter at 80 percent chroma,
    # and each panel loses a 4 px rim so no magenta fringe survives the cover crop.
    rows_bar, _ = bar_mask(a, job['chroma'], frac=0.8)
    panels, rim = [], 4
    for y0, y1 in runs(rows_bar, int(0.15 * a.shape[0])):
        band = a[y0:y1]
        _, cols_bar = bar_mask(band, job['chroma'], frac=0.8)
        panels += [band[rim:-rim, x0 + rim:x1 - rim] for x0, x1 in runs(cols_bar, int(0.15 * a.shape[1]))]
    if len(panels) < len(job['panels']):
        raise SystemExit(f'{name}: found {len(panels)} panels, need {len(job["panels"])}')
    report = {}
    for img, pn in zip(panels, job['panels']):
        u8 = to_u8(cover(img, job['size']))
        p = os.path.join(out_root, OUT['story'], pn['key'] + '.jpg')
        save(u8, p, 'jpg')
        report[pn['key']] = {'source': os.path.relpath(path, ROOT), 'files': [p], 'size': list(job['size'])}
    return report


def job_derive(name, job, src_dir, out_root, debug):
    p = os.path.normpath(os.path.join(src_dir, job['src']))
    if not os.path.exists(p): raise FileNotFoundError(p)
    im = Image.open(p).convert('RGBA')
    k = job['box'] / max(im.size)
    a = resize(np.asarray(im).astype(np.float32), k)
    u8 = to_u8(a)
    out = os.path.join(out_root, OUT['props'], job['key'] + '.webp')
    save(u8, out, 'webp')
    if debug: contact(debug, job['key'], [u8], None)
    return {job['key']: {'source': os.path.relpath(p, ROOT), 'files': [out], 'size': [u8.shape[1], u8.shape[0]]}}


KINDS = {'poses': job_poses, 'props': job_props, 'bands': job_bands, 'image': job_image, 'panels': job_panels,
         'derive': job_derive}


def manifest_rows():
    """Every painted Stage 6 key the tool can build, with its load shape; present = the file is in the repo."""
    rows = []
    for name, job in JOBS.items():
        k = job['kind']
        if k == 'poses':
            for ch in job['chars']:
                rows.append(dict(key=ch['key'], url=f"{OUT['chars']}/{ch['key']}.webp", atlas=f"{OUT['chars']}/{ch['key']}.json"))
            for pt in job.get('portraits', []):
                rows.append(dict(key=pt['key'], url=f"{OUT['ui']}/{pt['key']}.webp"))
        elif k == 'props':
            for kk, spec in job['keys'].items():
                rows.append(dict(key=kk, url=f"{OUT['props']}/{kk}.webp", frameWidth=spec['cell'][0], frameHeight=spec['cell'][1]))
        elif k == 'image':
            rows.append(dict(key=job['key'], url=f"{OUT['bg']}/{job['key']}.{job['fmt']}"))
        elif k == 'bands':
            for b in job['bands']:
                rows.append(dict(key=b['key'], url=f"{OUT['bg']}/{b['key']}.{'jpg' if b['fmt'] == 'jpg' else 'webp'}"))
        elif k == 'panels':
            for pn in job['panels']:
                rows.append(dict(key=pn['key'], url=f"{OUT['story']}/{pn['key']}.jpg"))
        elif k == 'derive':
            rows.append(dict(key=job['key'], url=f"{OUT['props']}/{job['key']}.webp"))
    return rows


def write_manifest(out_root):
    """src/stage6-painted.js: the painted rows Stage 6 queues (src/stage6-paint.js). A key whose file is not in the
    repo is present: false and stays code-drawn, so the backdrops light up on the next tool run after they land."""
    lines = ['// Generated by tools/stage6/process_art.py --write-status. Do not edit by hand (docs/stage6/ART.md).',
             '// present: false rows stay code-drawn by src/stage6-art.js.',
             'export const PAINTED6 = Object.freeze([']
    for r in manifest_rows():
        f = os.path.join(out_root, r['url'])
        ok = os.path.exists(f) and (not r.get('atlas') or os.path.exists(os.path.join(out_root, r['atlas'])))
        parts = [f"key: '{r['key']}'", f"url: '{r['url']}'"]
        if r.get('atlas'): parts.append(f"atlas: '{r['atlas']}'")
        if r.get('frameWidth'): parts += [f"frameWidth: {r['frameWidth']}", f"frameHeight: {r['frameHeight']}"]
        parts.append(f"present: {'true' if ok else 'false'}")
        lines.append('  Object.freeze({ ' + ', '.join(parts) + ' }),')
    lines.append(']);')
    p = os.path.join(out_root, 'src', 'stage6-painted.js')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as fh: fh.write('\n'.join(lines) + '\n')


def contact(debug, name, imgs, foot):
    os.makedirs(debug, exist_ok=True)
    H = max(i.shape[0] for i in imgs); W = sum(i.shape[1] for i in imgs) + 4 * len(imgs)
    sheet = np.zeros((H, W, 3), np.uint8) + np.array([48, 56, 72], np.uint8)
    x = 0
    for im in imgs:
        al = im[..., 3:4] / 255.0 if im.shape[2] == 4 else 1.0
        sheet[:im.shape[0], x:x + im.shape[1]] = (im[..., :3] * al + sheet[:im.shape[0], x:x + im.shape[1]] * (1 - al)).astype(np.uint8)
        if foot is not None: sheet[foot, x:x + im.shape[1]] = (0, 255, 0)
        x += im.shape[1] + 4
    Image.fromarray(sheet).save(os.path.join(debug, name + '-contact.png'))


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def budgets(report, allow_over):
    rows, total, bad = {}, 0.0, []
    for k, r in report.items():
        w, h = r['size']
        mib = round(w * h * 4 / 2 ** 20, 3)
        cap = BUDGET_MIB.get(k)
        rows[k] = {'rgbaMiB': mib, 'budgetMiB': cap, 'ok': cap is None or mib <= cap}
        if k not in TRANSIENT: total += mib
        if cap is not None and mib > cap: bad.append(f'{k} {mib} > {cap} MiB')
    if total > TOTAL_MIB: bad.append(f'resident total {total:.2f} > {TOTAL_MIB} MiB')
    if bad and not allow_over:
        print(json.dumps({'budget': rows, 'residentMiB': round(total, 3), 'over': bad}, indent=1))
        raise SystemExit(2)
    return rows, round(total, 3), bad


def write_status(report, out_root):
    """Refresh assets/stage6/ART_STATUS.json and assets/bg6/ART_STATUS.json for the keys built this run."""
    for path, kinds in ((os.path.join(out_root, 'assets/stage6/ART_STATUS.json'), ('chars', 'ui', 'props', 'story')),
                        (os.path.join(out_root, 'assets/bg6/ART_STATUS.json'), ('bg',))):
        st = json.load(open(path)) if os.path.exists(path) else {'version': 1, 'entries': []}
        ents = {e['key']: e for e in st.get('entries', [])}
        for k, r in report.items():
            if not any(OUT[d] in r['files'][0] for d in kinds): continue
            files = [os.path.relpath(f, out_root) for f in r['files']]
            ents[k] = {'id': k, 'key': k, 'files': files, 'placeholder': False,
                       'source': 'reused-painted' if r['source'].startswith('assets/') else 'chatgpt-image',
                       'sha256': {f: sha(os.path.join(out_root, f)) for f in files}, 'size': r['size'],
                       'art': {'sourceFile': r['source'], 'tool': 'tools/stage6/process_art.py',
                               'prompt': '/workspace/stage6art/CHATGPT_PROMPTS.md', 'review': 'pending'}}
        st['note'] = ('Painted Stone of Tear art from ChatGPT collages (tools/stage6/process_art.py, docs/stage6/ART.md). '
                      'Keys without files stay code-drawn by src/stage6-art.js. placeholder is false.')
        st['entries'] = [ents[k] for k in sorted(ents)]
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(st, f, indent=1); f.write('\n')


def main(argv):
    arg = lambda k, d: argv[argv.index(k) + 1] if k in argv else d
    global RES
    RES = float(arg('--res', RES))
    src_dir = os.path.abspath(arg('--src', os.path.join(ROOT, 'art-in', 'stage6')))
    out_root = os.path.abspath(arg('--out', ROOT))
    only = set(arg('--only', '').split(',')) - {''}
    debug = arg('--debug', None)
    report, skipped = {}, {}
    for name, job in JOBS.items():
        if only and name not in only: continue
        try:
            report.update(KINDS[job['kind']](name, job, src_dir, out_root, debug))
        except FileNotFoundError as e:
            skipped[name] = f'missing {os.path.relpath(str(e), ROOT)}'
    rows, total, over = budgets(report, '--allow-over' in argv)
    if '--write-status' in argv: write_status(report, out_root); write_manifest(out_root)
    for r in report.values():
        r['files'] = [os.path.relpath(f, out_root) for f in r['files']]
        r['bytes'] = {f: os.path.getsize(os.path.join(out_root, f)) for f in r['files']}
    out = {'res': RES, 'outputs': report, 'budget': rows, 'residentMiB': total, 'residentCapMiB': TOTAL_MIB,
           'over': over, 'skipped': skipped}
    text = json.dumps(out, indent=1, sort_keys=True)
    if arg('--report', None):
        with open(arg('--report', None), 'w') as f: f.write(text + '\n')
    print(text)


if __name__ == '__main__':
    main(sys.argv[1:])
