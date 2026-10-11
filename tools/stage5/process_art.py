#!/usr/bin/env python3
"""Build the painted Stage 5 (Blight) art from ChatGPT collages. Spec: docs/stage5/ART.md
(the painted-art pass). Sources stay verbatim in art-in/stage5/. Boss sheets are not rebuilt.

Adapts tools/stage6/process_art.py. Magenta key is the measured background, tolerated around
the nominal (246, 2, 248). Edges are despilled and defringed. A pale-green glow is kept when
the solid paint next to it is itself green (the drain beam and the wither ring); a green rim
on brown or black art is still treated as key fringe.

Job kinds, on top of the Stage 6 ones:
  items   loose slots (detached puffs and sparks stay with their cell) -> a trimmed named atlas,
          one scale per item, bottom-centre pivot.
  panel   one opaque picture, centre 16:9 crop to 1280x720.
  poses   `code` frames keep the current atlas numbers; `extra` frames are appended after them.

Usage: python3 tools/stage5/process_art.py [--src art-in/stage5] [--out .] [--only far,floors,...]
                                           [--debug DIR] [--report FILE] [--allow-over] [--write-status]
"""
import hashlib, importlib.util, json, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
_spec = importlib.util.spec_from_file_location('stage6_process_art', os.path.join(ROOT, 'tools', 'stage6', 'process_art.py'))
s6 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(s6)

# Nominal ChatGPT magenta. The measured key of these collages sits on it (about 251, 3, 250).
NOMINAL = np.array([246.0, 2.0, 248.0], np.float32)
TOL = 36.0  # chebyshev distance from the measured key

OUT = {'chars': 'assets/stage5/chars', 'props': 'assets/stage5/props',
       'story': 'assets/stage5/story', 'bg': 'assets/bg5'}
s6.OUT = OUT

BUDGET_MIB = {
    'bg5far': 1.85,
    'bg5mid': 1.40, 'bg5mid2': 1.65, 'bg5mid3': 1.40, 'bg5mid4': 1.65,
    'bg5floor': 1.55, 'bg5floor2': 1.55, 'bg5floor3': 1.55,
    's5tree': 1.70, 's5deco': 2.10, 's5garden': 0.70,
    's5stalk': 1.55, 's5pod': 0.90, 's5green': 2.45,
    's5thorn': 0.32, 's5seep': 0.60, 's5spore': 0.05, 's5cloud': 0.35,
    's5tether': 0.12, 's5hand': 0.32, 's5ring': 0.12,
    'story5p1': 3.60, 'story5p2': 3.60, 'story5p3': 3.60,
}
TRANSIENT = {'story5p1', 'story5p2', 'story5p3'}
# Painted MiB that can be decoded together. Zone 2 also holds the prefetched zone-3 sheets.
# This is the art-set cap, not the 120 MiB runtime cap (that one is the WebKit dump).
ZONE_MIB = 18.0
ZONES = {
    'z0': ['bg5far', 'bg5mid', 'bg5mid2', 'bg5floor', 's5tree', 's5deco', 's5stalk', 's5pod', 's5thorn', 's5spore', 's5cloud'],
    'z1': ['bg5far', 'bg5mid2', 'bg5mid3', 'bg5floor', 'bg5floor2', 's5tree', 's5deco', 's5stalk', 's5pod', 's5thorn', 's5seep', 's5spore', 's5cloud'],
    'z2': ['bg5far', 'bg5mid3', 'bg5mid4', 'bg5floor2', 'bg5floor3', 's5deco', 's5stalk', 's5pod', 's5thorn', 's5seep', 's5spore', 's5cloud',
           's5garden', 's5green', 's5tether', 's5hand', 's5ring'],
    'z3': ['bg5far', 'bg5mid4', 'bg5floor3', 's5garden', 's5green', 's5tether', 's5hand', 's5ring'],
}

FLOOR = (1080, 360)  # tier A. Drop to (810, 270) only if a zone dump crosses 120 MiB.

JOBS = {
    'far': dict(kind='image', src='far.src.png', key='bg5far', size=(1024, 464), fmt='jpg'),
    'plates-a': dict(kind='bands', src='plates-a.src.png', chroma='magenta', separator='black', bands=[
        dict(key='bg5mid', size=(1024, None), sky=True, max_h=340, feather=96, fmt='webp'),
        dict(key='bg5mid2', size=(1024, None), sky=True, max_h=400, feather=96, fmt='webp')]),
    'plates-b': dict(kind='bands', src='plates-b.src.png', chroma='magenta', separator='black', bands=[
        dict(key='bg5mid3', size=(1024, None), sky=True, max_h=340, feather=96, fmt='webp'),
        dict(key='bg5mid4', size=(1024, None), sky=True, max_h=400, feather=96, fmt='webp')]),
    'floors': dict(kind='bands', src='floors.src.png', chroma='magenta', bands=[
        dict(key='bg5floor', size=FLOOR, seamless=160, flatten=0.65, fmt='jpg'),
        dict(key='bg5floor2', size=FLOOR, seamless=160, flatten=0.65, fmt='jpg'),
        dict(key='bg5floor3', size=FLOOR, seamless=160, flatten=0.65, fmt='jpg')]),
    'props': dict(kind='split', src='props.src.png', chroma='magenta', rows=(3, 4, 4, 2), parts=[
        dict(kind='sheet', indices=(0, 3), key='s5tree', cell=(320, 448), anchor='bottom'),
        dict(kind='items', indices=(3, 11), key='s5deco', names=['bones', 'banner', 'stones', 'lurk', 'thornbush', 'boulder', 'log', 'cauldron'],
             height={'bones': 64, 'banner': 180, 'stones': 160, 'lurk': 52, 'thornbush': 90, 'boulder': 110, 'log': 64, 'cauldron': 88}, max_w=260),
        dict(kind='items', indices=(11, 13), key='s5garden', names=['arch', 'bloom'],
             height={'arch': 220, 'bloom': 150}, max_w=280)]),
    'stalker': dict(kind='poses', src='stalker.src.png', chroma='magenta', rows=(3, 3, 3), chars=[
        dict(key='s5stalk', poses=list(range(9)), idle=1, screen_h=120,
             code=[0, 1, 4, 6, 7, 8], extra=[2, 3, 5],
             names=['lurk', 'prowlA', 'prowlB', 'crouch', 'leap', 'landing', 'recoil', 'knocked', 'withered'],
             feet={0, 1, 2, 3, 5, 6}, body={7, 8}, air={4}, flip=set())]),
    'sporepod': dict(kind='poses', src='sporepod.src.png', chroma='magenta', rows=(4, 3), chars=[
        dict(key='s5pod', poses=list(range(7)), idle=1, screen_h=135,
             code=[0, 1, 4, 5, 6], extra=[2, 3],
             names=['emerge', 'rest', 'breathe', 'swell', 'launch', 'recoil', 'wilted'],
             feet={0, 1, 2, 3, 4, 5, 6}, body=set(), air=set(), flip=set())]),
    'greenman': dict(kind='poses', src='greenman.src.png', chroma='magenta', rows=(3, 3), chars=[
        dict(key='s5green', poses=list(range(6)), idle=0, screen_h=380,
             code=[0, 2, 4, 5], extra=[1, 3],
             names=['arrive', 'stand', 'reach', 'staggered', 'kneel', 'tree'],
             feet={0, 1, 2, 3, 4, 5}, body=set(), air=set(), flip=set())]),
    'fx': dict(kind='split', src='fx.src.png', chroma='magenta', rows=(3, 3, 3, 4), parts=[
        dict(kind='sheet', indices=(0, 3), key='s5thorn', cell=(256, 96), anchor='bottom'),
        dict(kind='sheet', indices=(3, 6), key='s5seep', cell=(192, 256), anchor='bottom'),
        dict(kind='sheet', indices=(6, 7), key='s5spore', cell=(64, 64), anchor='center'),
        dict(kind='sheet', indices=(7, 9), key='s5cloud', cell=(256, 160), anchor='center'),
        dict(kind='sheet', indices=(9, 10), key='s5tether', cell=(512, 48), anchor='center'),
        dict(kind='sheet', indices=(10, 12), key='s5hand', cell=(192, 192), anchor='bottom'),
        dict(kind='sheet', indices=(12, 13), key='s5ring', cell=(256, 96), anchor='center')]),
    'story1': dict(kind='panel', src='story1.src.png', key='story5p1'),
    'story2': dict(kind='panel', src='story2.src.png', key='story5p2'),
    'story3': dict(kind='panel', src='story3.src.png', key='story5p3'),
}
DIR_OF = {'poses': 'chars', 'split': 'props', 'image': 'bg', 'bands': 'bg', 'panel': 'story'}
CODE_SCALE = {'s5stalk': 1.15, 's5pod': 1.1, 's5green': 2.75}
PAINTED_SCALE = {}


def key(a, chroma):
    """Stage 6 key, plus a tolerance ball around the measured magenta and a glow exception."""
    if chroma != 'magenta':
        return s6.key(a, chroma)
    s = s6.excess(a, chroma)
    strong = s > 180
    if strong.sum() < 1000:
        raise SystemExit('no magenta background found')
    Kc = np.median(a[strong], axis=0)
    dist = np.max(np.abs(a - Kc), axis=-1)
    # Compressed key pixels sit near the nominal (246, 2, 248) even when excess dips.
    hard = (s > 140) | ((dist <= TOL) & (s > 20))
    deep = cv2.erode(hard.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    near = cv2.dilate(hard.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    band = near & ~deep
    alpha = np.ones(s.shape, np.float32)
    est = 1.0 - np.clip((s - s6.LO) / (s6.HI - s6.LO), 0, 1)
    alpha[band] = est[band]
    alpha[deep] = 0
    alpha = np.where(alpha < 0.04, 0, np.where(alpha > 0.97, 1, alpha)).astype(np.float32)
    F = np.clip((a - (1 - alpha)[..., None] * Kc) / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    e = s6.excess(F, chroma)
    cap = np.where((alpha < 1) & (alpha > 0), np.minimum(e, s6.EDGE), np.minimum(e, s6.EDGE * 2))
    ex = np.maximum(e - cap, 0)
    F = np.stack([F[..., 0] - ex, F[..., 1], F[..., 2] - ex * 0.85], -1)
    w = np.clip((s6.excess(F, chroma) - s6.SPILL) / 30, 0, 1)[..., None]
    F = F * (1 - w) + F.mean(-1, keepdims=True) * w
    # Green fringe from the magenta key is clamped. A pale-green glow is not: the beam and the
    # ring are green in their solid cores, so an edge next to that core keeps its green.
    edge1 = alpha < 1
    solid_m = (alpha >= 0.55).astype(np.float32)
    dom = np.maximum(F[..., 1] - np.maximum(F[..., 0], F[..., 2]), 0) * solid_m
    gn = cv2.blur(dom, (11, 11))
    gd = cv2.blur(solid_m, (11, 11))
    glow = (gd > 0.04) & (gn / np.maximum(gd, 1e-3) > 10)
    clamp = edge1 & ~glow
    F[..., 1] = np.where(clamp, np.minimum(F[..., 1], np.maximum(F[..., 0], F[..., 2]) + s6.EDGE), F[..., 1])
    solid = (alpha >= s6.BLEED_A).astype(np.float32)
    num = cv2.blur(F * solid[..., None], (s6.BLEED_R, s6.BLEED_R))
    den = cv2.blur(solid, (s6.BLEED_R, s6.BLEED_R))[..., None]
    nb = np.where(den > 1e-3, num / np.maximum(den, 1e-3), F)
    t = np.clip(alpha / s6.BLEED_A, 0, 1)[..., None]
    soft = ((alpha > 0) & (alpha < s6.BLEED_A))[..., None]
    F = np.where(soft, nb * (1 - t) + F * t, F)
    key.last_kc = [round(float(c), 1) for c in Kc]
    key.nominal = NOMINAL.tolist()
    return np.clip(F, 0, 255), alpha


s6.key = key


def loose_owner(alpha, rows, large=1500, dust=40):
    """Group a collage into len(rows) rows and rows[i] slots. Pieces of one item (a cloud broken
    into puffs, sparks off a beam) share a slot. Reading order is row then left to right."""
    fg = alpha > 0.02
    lbl, count = ndi.label(fg)
    sizes = ndi.sum(fg, lbl, range(1, count + 1))
    objs = ndi.find_objects(lbl)
    big, small = [], []
    for i, sl in enumerate(objs, 1):
        if sl is None: continue
        sz = float(sizes[i - 1])
        if sz < dust: continue
        box = dict(i=i, sz=sz, x0=sl[1].start, x1=sl[1].stop, y0=sl[0].start, y1=sl[0].stop)
        box['cx'] = (box['x0'] + box['x1']) / 2
        box['cy'] = (box['y0'] + box['y1']) / 2
        (big if sz >= large else small).append(box)
    nrows = len(rows)
    if len(big) < nrows:
        raise SystemExit(f'loose: {len(big)} large blobs, need at least {nrows} rows')
    big.sort(key=lambda b: b['cy'])
    gaps = sorted(((big[i + 1]['cy'] - big[i]['cy'], i) for i in range(len(big) - 1)), reverse=True)
    cuts = sorted(i for _, i in gaps[:nrows - 1])
    groups, start = [], 0
    for c in cuts + [len(big) - 1]:
        groups.append(big[start:c + 1]); start = c + 1
    if len(groups) != nrows:
        raise SystemExit(f'loose: split into {len(groups)} rows, expected {nrows}')
    slots = []
    for g, ncol in zip(groups, rows):
        g = sorted(g, key=lambda b: b['cx'])
        if len(g) < ncol:
            raise SystemExit(f'loose: a row has {len(g)} blobs, need {ncol}')
        clusters = [[b] for b in g]
        while len(clusters) > ncol:
            best, bi = 1e18, 0
            for i in range(len(clusters) - 1):
                gap = clusters[i + 1][0]['cx'] - clusters[i][-1]['cx']
                if gap < best: best, bi = gap, i
            clusters[bi] = clusters[bi] + clusters[bi + 1]
            del clusters[bi + 1]
        slots += clusters
    owner = np.full(lbl.shape, -1, np.int16)
    for k, cl in enumerate(slots):
        for b in cl: owner[lbl == b['i']] = k

    def slot_box(k):
        m = owner == k
        ys, xs = np.where(m)
        return xs.min(), ys.min(), xs.max(), ys.max()

    boxes = [slot_box(k) for k in range(len(slots))]
    for b in small:
        m = lbl == b['i']
        cx, cy = b['cx'], b['cy']
        best, bk = 1e18, 0
        for k, (x0, y0, x1, y1) in enumerate(boxes):
            dx = 0 if x0 <= cx <= x1 else min(abs(cx - x0), abs(cx - x1))
            dy = 0 if y0 <= cy <= y1 else min(abs(cy - y0), abs(cy - y1))
            d = dx * dx + dy * dy
            if d < best: best, bk = d, k
        owner[m] = bk
    return owner


def frames_of(ch):
    if 'frames' in ch: return list(ch['frames'])
    return list(ch['code']) + list(ch.get('extra', []))


def row_span(index, rows):
    at = 0
    for n in rows:
        if index < at + n: return list(range(at, at + n))
        at += n
    return [index]


def job_poses(name, job, src_dir, out_root, debug):
    a, path = s6.load(src_dir, job['src'])
    F, alpha = key(a, job['chroma'])
    owner = s6.blobs(alpha, job['rows'])
    raw = [s6.crop(F, alpha, owner, k) for k in range(sum(job['rows']))]
    report = {}
    for ch in job['chars']:
        poses = [raw[i].copy() for i in ch['poses']]
        for j, (hue, st) in ch.get('fix', {}).items():
            poses[j] = s6.neutralize(poses[j], hue, st)
        poses = [np.ascontiguousarray(p[:, ::-1]) if j in ch['flip'] else p for j, p in enumerate(poses)]
        idle = ch['idle']
        K = s6.RES * ch['screen_h'] / s6.height(poses[idle])
        bound = 'target'
        for j, p in enumerate(poses):
            if s6.height(p) * K > s6.CELL_MAX * s6.FOOT_Y - 8:
                K, bound = (s6.CELL_MAX * s6.FOOT_Y - 8) / s6.height(p), 'height of ' + ch['names'][j]
        K = round(K, 5)
        # Air poses (the leap) keep the gap between their lowest pixel and the row's ground line.
        gaps = []
        for j in range(len(poses)):
            if j not in ch.get('air', ()): gaps.append(0); continue
            src_i = ch['poses'][j]
            mates = [k for k in row_span(src_i, job['rows']) if k not in ch.get('air', ())]
            bot = int(np.where(owner == src_i)[0].max())
            ground = max(int(np.where(owner == k)[0].max()) for k in mates)
            gaps.append(max(0, ground - bot))
        src_poses = poses
        budget = BUDGET_MIB[ch['key']]
        img = os.path.join(out_root, OUT['chars'], ch['key'] + '.webp')
        fmap = frames_of(ch)
        page = cells = entries = None
        W = H = FOOT = 0
        game_scale = 1.0
        for attempt in range(5):
            scaled = [s6.resize(p, K) for p in src_poses]
            ip = scaled[idle]
            it, ifx = s6.torso_x(ip), s6.feet_x(ip)
            place = []
            for j, p in enumerate(scaled):
                if j in ch['body']: dx, mode = -p.shape[1] / 2, 'body'
                elif j in ch['feet']: dx, mode = (ifx - it) - s6.feet_x(p), 'feet'
                else: dx, mode = -s6.torso_x(p), 'torso'
                place.append((int(round(dx)), mode))
            half = max(max(-dx, dx + p.shape[1]) for (dx, _), p in zip(place, scaled)) + 4
            up = max(int(s6.opaque_rows(p)[-1]) + 1 + int(round(g * K)) for p, g in zip(scaled, gaps)) + 4
            W = int(-(-2 * half // 8) * 8)
            H = int(-(-(up / s6.FOOT_Y) // 8) * 8)
            FOOT = round(H * s6.FOOT_Y)
            while FOOT < up: H += 8; FOOT = round(H * s6.FOOT_Y)
            cells, entries = [], []
            for j, p in enumerate(scaled):
                h, w = p.shape[:2]
                fy = int(s6.opaque_rows(p)[-1])
                dx = place[j][0] + W // 2
                dy = FOOT - fy - int(round(gaps[j] * K))
                cell = np.zeros((H, W, 4), np.float32)
                sy0, sx0 = max(0, -dy), max(0, -dx)
                sy1, sx1 = min(h, H - dy), min(w, W - dx)
                cell[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] = p[sy0:sy1, sx0:sx1]
                out = s6.to_u8(cell)
                ys, xs = np.where(out[..., 3] > 0)
                cells.append((out, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)))
                entries.append({'pose': ch['names'][j], 'anchor': place[j][1], 'place': [int(dx), int(dy)], 'air': gaps[j]})
            mib_guess = None
            # Pack once to measure. A page over the budget is rebuilt smaller; the actor then
            # scales it back up to screen_h (meta.drawScale).
            page = s6.pack(cells, img, 'tools/stage5/process_art.py',
                           {'drawScale': 1, 'origin': [0.5, s6.FOOT_Y], 'screenH': ch['screen_h'], 'res': s6.RES},
                           fmap)
            mib_guess = page.shape[1] * page.shape[0] * 4 / 2 ** 20
            idle_h = max(1, s6.height(scaled[idle]))
            if mib_guess <= budget or attempt == 4:
                game_scale = round(ch['screen_h'] / idle_h, 4)
                break
            K = round(K * (budget / mib_guess) ** 0.5 * 0.985, 5)
            bound = 'atlas budget'
        # Rewrite meta.drawScale now that the fit is known. pack already wrote the json.
        meta_path = img[:-5] + '.json'
        meta = json.load(open(meta_path))
        meta['meta']['drawScale'] = game_scale
        with open(meta_path, 'w') as fh:
            json.dump(meta, fh, indent=1, sort_keys=True); fh.write('\n')
        PAINTED_SCALE[ch['key']] = game_scale
        report[ch['key']] = {'source': os.path.relpath(path, ROOT), 'K': K, 'boundBy': bound, 'cell': [W, H],
                             'foot': FOOT, 'drawScale': game_scale, 'frames': fmap, 'poses': entries,
                             'files': [img, meta_path], 'size': [page.shape[1], page.shape[0]],
                             'keyColour': getattr(key, 'last_kc', None)}
        if debug: s6.contact(debug, ch['key'], [c for c, _ in cells], FOOT)
    return report


def fit_into(p, cell, anchor, pad=2):
    cw, ch = cell
    s = min((cw - 2 * pad) / p.shape[1], (ch - 2 * pad) / p.shape[0])
    q = s6.resize(p, s)
    h, w = q.shape[:2]
    x = (cw - w) // 2
    y = {'bottom': ch - pad - h, 'top': pad, 'center': (ch - h) // 2}[anchor]
    canvas = np.zeros((ch, cw, 4), np.float32)
    canvas[y:y + h, x:x + w] = q
    return canvas, round(s, 5)


def pack_named(cells, names, path_img):
    """Shelf-pack cells that do not share a source size. Frame names are the item names."""
    x = y = shelf = 0
    spots = []
    for out in cells:
        h, w = out.shape[:2]
        if x and x + w > s6.PAGE_MAX:
            x, y, shelf = 0, y + shelf + s6.GUTTER, 0
        spots.append((x, y)); x += w + s6.GUTTER; shelf = max(shelf, h)
    PW = max(sx + c.shape[1] for (sx, _), c in zip(spots, cells))
    PH = y + shelf
    page = np.zeros((PH, PW, 4), np.uint8)
    frames = {}
    for out, name, (sx, sy) in zip(cells, names, spots):
        h, w = out.shape[:2]
        page[sy:sy + h, sx:sx + w] = out
        ys, xs = np.where(out[..., 3] > 0)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        # Repack trimmed: rewrite below after a second pass. Keep the full cell so the bottom pivot
        # stays the cell's bottom centre (origin 0.5, 1).
        frames[name] = {'frame': {'x': sx, 'y': sy, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
                        'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}}
    # Trim each frame inside its cell and shrink the page. Re-shelf the trimmed rects.
    trimmed = []
    for out in cells:
        ys, xs = np.where(out[..., 3] > 8)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        trimmed.append((out[y0:y1, x0:x1], x0, y0, out.shape[1], out.shape[0]))
    x = y = shelf = 0
    spots = []
    for crop, *_ in trimmed:
        h, w = crop.shape[:2]
        if x and x + w > s6.PAGE_MAX:
            x, y, shelf = 0, y + shelf + s6.GUTTER, 0
        spots.append((x, y)); x += w + s6.GUTTER; shelf = max(shelf, h)
    PW = max(sx + c.shape[1] for (sx, _), (c, *_) in zip(spots, trimmed))
    PH = y + shelf
    page = np.zeros((PH, PW, 4), np.uint8)
    frames = {}
    for (crop, x0, y0, cw, ch), name, (sx, sy) in zip(trimmed, names, spots):
        h, w = crop.shape[:2]
        page[sy:sy + h, sx:sx + w] = crop
        frames[name] = {'frame': {'x': sx, 'y': sy, 'w': w, 'h': h}, 'rotated': False, 'trimmed': True,
                        'spriteSourceSize': {'x': x0, 'y': y0, 'w': w, 'h': h}, 'sourceSize': {'w': cw, 'h': ch}}
    atlas = {'frames': frames, 'meta': {'app': 'tools/stage5/process_art.py', 'image': os.path.basename(path_img),
             'size': {'w': int(PW), 'h': int(PH)}, 'scale': '1', 'format': 'RGBA8888',
             'origin': [0.5, 1], 'drawScale': 1}}
    s6.save(page, path_img, 'webp')
    with open(path_img[:-5] + '.json', 'w') as f:
        json.dump(atlas, f, indent=1, sort_keys=True); f.write('\n')
    return page


def sheet_from(crops, spec, path, src):
    cw, ch = spec['cell']
    anchor = spec['anchor']
    strip = np.zeros((ch, cw * len(crops), 4), np.float32)
    scales = []
    for i, p in enumerate(crops):
        cell, s = fit_into(p, (cw, ch), anchor)
        strip[:, i * cw:(i + 1) * cw] = cell
        scales.append(s)
    out = s6.to_u8(strip)
    s6.save(out, path, 'webp')
    return {'source': os.path.relpath(src, ROOT), 'frames': len(crops), 'frameWidth': cw, 'frameHeight': ch,
            'scale': scales, 'anchor': anchor, 'files': [path], 'size': [out.shape[1], out.shape[0]]}


def items_from(crops, spec, path, src):
    names = spec['names']
    cells = []
    scales = []
    for p, name in zip(crops, names):
        th = spec['height'][name]
        tw = spec.get('max_w', 260)
        op = s6.opaque_rows(p) if p.shape[2] == 4 else None
        h = s6.height(p)
        w = p.shape[1]
        s = min(th / max(h, 1), tw / max(w, 1))
        q = s6.resize(p, s)
        pad = 4
        canvas = np.zeros((q.shape[0] + pad, q.shape[1] + pad, 4), np.float32)
        canvas[0:q.shape[0], 2:2 + q.shape[1]] = q  # bottom pad so origin (0.5, 1) sits under the feet
        cells.append(s6.to_u8(canvas))
        scales.append(round(s, 5))
    page = pack_named(cells, names, path)
    return {'source': os.path.relpath(src, ROOT), 'frames': names, 'scale': scales, 'anchor': 'bottom',
            'files': [path, path[:-5] + '.json'], 'size': [page.shape[1], page.shape[0]]}


def job_split(name, job, src_dir, out_root, debug):
    a, path = s6.load(src_dir, job['src'])
    F, alpha = key(a, job['chroma'])
    owner = loose_owner(alpha, job['rows'])
    n = sum(job['rows'])
    crops = [s6.crop(F, alpha, owner, k) for k in range(n)]
    if debug: s6.contact(debug, name + '-slots', crops, None)
    report = {}
    folder = OUT['props'] if name != 'props' else OUT['props']
    for part in job['parts']:
        i0, i1 = part['indices']
        group = crops[i0:i1]
        img = os.path.join(out_root, folder, part['key'] + '.webp')
        if part['kind'] == 'sheet':
            report[part['key']] = sheet_from(group, part, img, path)
        else:
            report[part['key']] = items_from(group, part, img, path)
        report[part['key']]['keyColour'] = getattr(key, 'last_kc', None)
        if debug: s6.contact(debug, part['key'], [s6.to_u8(c) if c.dtype != np.uint8 else c for c in group], None)
    return report


def center_16_9(img):
    h, w = img.shape[:2]
    th = int(round(w * 9 / 16))
    if th <= h:
        y0 = (h - th) // 2
        return img[y0:y0 + th]
    tw = int(round(h * 16 / 9))
    x0 = (w - tw) // 2
    return img[:, x0:x0 + tw]


def save_jpg(arr, path, quality):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr[..., :3], 'RGB').save(path, 'JPEG', quality=quality, optimize=True, progressive=True)


def job_panel(name, job, src_dir, out_root, debug):
    a, path = s6.load(src_dir, job['src'])
    u8 = s6.to_u8(s6.resize(center_16_9(a), size=(1280, 720)))
    p = os.path.join(out_root, OUT['story'], job['key'] + '.jpg')
    save_jpg(u8, p, 88)
    if debug: s6.contact(debug, job['key'], [u8], None)
    return {job['key']: {'source': os.path.relpath(path, ROOT), 'files': [p], 'size': [1280, 720]}}


def job_image(name, job, src_dir, out_root, debug):
    return s6.job_image(name, job, src_dir, out_root, debug)


def job_bands(name, job, src_dir, out_root, debug):
    return s6.job_bands(name, job, src_dir, out_root, debug)


KINDS = {'poses': job_poses, 'split': job_split, 'bands': job_bands, 'image': job_image, 'panel': job_panel}


def manifest_rows():
    rows = []
    for job in JOBS.values():
        k = job['kind']
        if k == 'poses':
            for ch in job['chars']:
                rows.append(dict(key=ch['key'], url=f"{OUT['chars']}/{ch['key']}.webp", atlas=f"{OUT['chars']}/{ch['key']}.json"))
        elif k == 'split':
            for part in job['parts']:
                row = dict(key=part['key'], url=f"{OUT['props']}/{part['key']}.webp")
                if part['kind'] == 'sheet':
                    # One frame is an image. A strip is a spritesheet.
                    n = part['indices'][1] - part['indices'][0]
                    if n > 1:
                        row['frameWidth'], row['frameHeight'] = part['cell']
                else:
                    row['atlas'] = f"{OUT['props']}/{part['key']}.json"
                rows.append(row)
        elif k == 'image':
            rows.append(dict(key=job['key'], url=f"{OUT['bg']}/{job['key']}.{job['fmt']}"))
        elif k == 'bands':
            for b in job['bands']:
                rows.append(dict(key=b['key'], url=f"{OUT['bg']}/{b['key']}.{'jpg' if b['fmt'] == 'jpg' else 'webp'}"))
        elif k == 'panel':
            rows.append(dict(key=job['key'], url=f"{OUT['story']}/{job['key']}.jpg"))
    return rows


def write_manifest(out_root):
    lines = ['// Generated by tools/stage5/process_art.py --write-status. Do not edit by hand.',
             '// present: false rows stay code-drawn. Boss sheets stay in src/stage5-art.js PAINTED.',
             'export const PAINTED5 = Object.freeze([']
    for r in manifest_rows():
        f = os.path.join(out_root, r['url'])
        ok = os.path.exists(f) and (not r.get('atlas') or os.path.exists(os.path.join(out_root, r['atlas'])))
        parts = [f"key: '{r['key']}'", f"url: '{r['url']}'"]
        if r.get('atlas'): parts.append(f"atlas: '{r['atlas']}'")
        if r.get('frameWidth'): parts += [f"frameWidth: {r['frameWidth']}", f"frameHeight: {r['frameHeight']}"]
        parts.append(f"present: {'true' if ok else 'false'}")
        lines.append('  Object.freeze({ ' + ', '.join(parts) + ' }),')
    lines.append(']);')
    lines.append('// [code scale, painted scale]. Painted scale restores screen_h when the atlas was shrunk to its budget.')
    lines.append('export const SCALE5 = Object.freeze({')
    for key, code in CODE_SCALE.items():
        painted = PAINTED_SCALE.get(key, 1)
        lines.append(f'  {key}: [{code}, {painted}],')
    lines.append('});')
    p = os.path.join(out_root, 'src', 'stage5-painted.js')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as fh: fh.write('\n'.join(lines) + '\n')


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def budgets(report, allow_over):
    rows, zones, bad = {}, {}, []
    for k, r in report.items():
        w, h = r['size']
        mib = round(w * h * 4 / 2 ** 20, 3)
        cap = BUDGET_MIB.get(k)
        rows[k] = {'rgbaMiB': mib, 'budgetMiB': cap, 'ok': cap is None or mib <= cap}
        if cap is not None and mib > cap: bad.append(f'{k} {mib} > {cap} MiB')
    for name, keys in ZONES.items():
        total = round(sum(rows[k]['rgbaMiB'] for k in keys if k in rows), 3)
        missing = [k for k in keys if k not in rows]
        zones[name] = {'rgbaMiB': total, 'missing': missing}
        if not missing and total > ZONE_MIB: bad.append(f'{name} {total} > {ZONE_MIB} MiB')
    peak = max((z['rgbaMiB'] for z in zones.values()), default=0)
    if bad and not allow_over:
        print(json.dumps({'budget': rows, 'zones': zones, 'over': bad}, indent=1))
        raise SystemExit(2)
    return rows, zones, round(peak, 3), bad


def write_status(report, out_root):
    path = os.path.join(out_root, 'assets/stage5/ART_STATUS.json')
    st = json.load(open(path)) if os.path.exists(path) else {'version': 1, 'entries': []}
    ents = {e['key']: e for e in st.get('entries', [])}
    for k, r in report.items():
        files = [os.path.relpath(f, out_root) for f in r['files']]
        prev = ents.get(k, {})
        ents[k] = {'id': k, 'key': k, 'files': files, 'placeholder': False, 'source': 'chatgpt-image',
                   'sha256': {f: sha(os.path.join(out_root, f)) for f in files}, 'size': r['size'],
                   'art': {'sourceFile': r['source'], 'tool': 'tools/stage5/process_art.py',
                           'prompt': 'stage5art/CHATGPT_PROMPTS.md', 'review': 'pending',
                           'keyColour': r.get('keyColour')}}
        if prev.get('art', {}).get('tool') == 'tools/stage5/process_bosses.py':
            ents[k] = prev  # bosses are not this tool's
    note = st.get('note', '')
    if 'Painted Blight' not in note:
        st['note'] = (note + ' Painted Blight plates, floors, cast, props and story panels are chatgpt-image via tools/stage5/process_art.py.').strip()
    st['entries'] = [ents[k] for k in sorted(ents, key=lambda i: (0 if i in ('s5agin', 's5balt', 'aginorPortrait') else 1, i))]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(st, f, indent=1); f.write('\n')


def contact_sheet(out_root, rows):
    thumbs = []
    for r in rows:
        p = os.path.join(out_root, r['url'])
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGBA')
        im.thumbnail((280, 160))
        thumbs.append((r['key'], im))
    if not thumbs: return
    cols = 6
    tw, th = 280, 176
    rows_n = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows_n * th), (32, 28, 36))
    for i, (name, im) in enumerate(thumbs):
        bg = Image.new('RGBA', im.size, (32, 28, 36, 255))
        bg.alpha_composite(im)
        sheet.paste(bg.convert('RGB'), ((i % cols) * tw + 4, (i // cols) * th + 4))
    dest = os.path.join(out_root, 'docs/stage5/shots/contact-painted.jpg')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    sheet.save(dest, 'JPEG', quality=80, optimize=True, progressive=True)


def sample_lights(out_root):
    """Tar-crack and cave-mouth glows, in world pixels, for the two-light pool."""
    zones = [0, 1240, 2560, 3920, 5200]
    lights = []
    for i, key in enumerate(['bg5mid', 'bg5mid2', 'bg5mid3', 'bg5mid4']):
        path = os.path.join(out_root, OUT['bg'], key + '.webp')
        if not os.path.exists(path): continue
        im = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
        H, W = im.shape[:2]
        rgb, a = im[..., :3], im[..., 3]
        R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        if i == 2:
            hot = (a > 200) & (R > 150) & (R > G + 30) & (G > 50) & (B < 90)
            color, radius, inten = '0xff7040', 220, 0.9
        elif i == 3:
            hot = (a > 180) & (G > 120) & (G > B) & (R > 90) & (G + 15 > R) & (np.arange(W)[None, :] > W * 0.55)
            color, radius, inten = '0xd8e080', 340, 1.15
        else:
            continue
        if hot.sum() < 40: continue
        lbl, n = ndi.label(hot)
        sizes = ndi.sum(hot, lbl, range(1, n + 1))
        order = np.argsort(-sizes)
        l = zones[i]
        last = i == 3
        r = 5200 if last else zones[i + 1]
        bleedL = 128 if i == 0 else (0 if i == 2 else 48)
        bleedR = 128 if last else (0 if i + 1 == 2 else 48)
        rx = (l if i else 0) - bleedL
        rw = r + bleedR - rx
        scale = rw / W
        taken = []
        for j in order[:8]:
            if sizes[j] < 25: continue
            ys, xs = np.where(lbl == j + 1)
            px, py = float(xs.mean()), float(ys.mean())
            wx = rx + px * scale
            wy = 580 - (H - py) * scale
            if not (240 <= wy <= 560): continue
            if any(abs(wx - p) < 180 for p in taken): continue
            taken.append(wx)
            lights.append({'plate': i, 'x': round(wx), 'y': round(wy), 'color': color, 'r': radius, 'i': inten})
            if len(taken) == 4: break
    doc = {'note': 'Tar cracks (plate 2) and the cave mouth (plate 3). The view shows the nearest two.',
           'capOnScreen': 2, 'lights': lights}
    p = os.path.join(out_root, OUT['bg'], 'lights.json')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(doc, f, indent=1); f.write('\n')
    return doc


def main(argv):
    arg = lambda k, d: argv[argv.index(k) + 1] if k in argv else d
    s6.RES = float(arg('--res', s6.RES))
    src_dir = os.path.abspath(arg('--src', os.path.join(ROOT, 'art-in', 'stage5')))
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
    rows, zones, peak, over = budgets(report, '--allow-over' in argv)
    if '--write-status' in argv:
        write_status(report, out_root)
        write_manifest(out_root)
        contact_sheet(out_root, manifest_rows())
        if not only or {'plates-a', 'plates-b'} <= set(JOBS) and (not only or 'plates-b' in only):
            sample_lights(out_root)
    for r in report.values():
        r['files'] = [os.path.relpath(f, out_root) for f in r['files']]
        r['bytes'] = {f: os.path.getsize(os.path.join(out_root, f)) for f in r['files']}
    out = {'res': s6.RES, 'floor': list(FLOOR), 'keyNominal': NOMINAL.tolist(), 'outputs': report,
           'budget': rows, 'zones': zones, 'peakPaintedMiB': peak, 'zoneCapMiB': ZONE_MIB,
           'over': over, 'skipped': skipped}
    text = json.dumps(out, indent=1, sort_keys=True)
    rp = arg('--report', None)
    if rp:
        with open(rp, 'w') as f: f.write(text + '\n')
    print(text)


if __name__ == '__main__':
    main(sys.argv[1:])
