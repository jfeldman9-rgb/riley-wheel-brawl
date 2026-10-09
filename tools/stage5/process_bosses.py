#!/usr/bin/env python3
"""Build the painted Stage 5 Forsaken: assets/stage5/s5agin.{webp,json}, s5balt.{webp,json}, aginor-portrait.webp.

Sources: one ChatGPT collage per boss on flat magenta (prompts: /workspace/stage5art/CHATGPT_PROMPT.md), kept
verbatim in art-in/stage5/:
  aginor-sheet.src.png      7 poses, 4 over 3, reading order = aginFrame (src/stage5-art-cast.js)
  balthamel-sheet.src.png   9 poses, 5 over 4, reading order = baltFrame (8 = standing recoil)
  aginor-portrait.src.png   optional, square head-and-shoulders; without it the portrait is cut from Aginor's idle head

Deterministic: no randomness, fixed resampling, stable JSON; the same sources give byte-identical outputs.

Per boss:
  1. key: the magenta excess s = min(R,B) - G. Deep background (7x7 erosion of s > 150) is cleared; the edge band gets
     alpha from s and its colour unmixed from the measured key colour; every kept pixel is despilled (neither boss has
     violet, pink or magenta: the prompts forbid it). Enclosed magenta (inside Balthamel's hug, between Aginor and his
     staff) is keyed the same way because keying is per pixel, not a flood fill.
  2. figures: the N largest blobs; smaller blobs (hair tufts, fungus, a detached staff end) join the nearest figure by
     true distance; specks under 4 px go. Reading order: blobs sorted by centre y, cut into the prompt's row counts
     (checked: the rows must not overlap in y), then by x. A wrong blob count fails loudly.
  3. one scale K for every pose: the idle pose's height maps to PX times the code-drawn idle height (PX = painted
     pixels per code-drawn pixel), so painted and code-drawn bosses stand the same size on screen. K is lowered only
     if a pose would need a cell taller than CELL_MAX (reported as 'boundBy'). FLIP mirrors a pose (Aginor's
     backstep is painted leaning in; mirrored it leans away from Riley, the way the blink goes).
  4. the cell is sized to fit every anchored pose (multiples of 8; frames are trimmed, so empty cell costs nothing).
     Feet on FOOT = round(0.96 * cell height), the actor origin. The foot row ignores bone-white staff pixels.
     PAINTED.baseH in src/stage5-art.js must be cell height / PX (the report prints it as baseH).
  5. registration: every standing pose puts its torso (median x of dark robe/leather pixels between 40 % and 70 % of
     its height) on the cell centre; poses that lunge or step (FEET) put their feet centre where idle's feet are; lying
     poses (BODY) centre the whole figure. DX holds hand nudges in cell px.
  6. pack: each cell is trimmed to its opaque box and shelf-packed into one page (2 px gutters, max 2048 wide), written
     as a Phaser JSON-hash atlas: frames "0".."N-1", trimmed=true, sourceSize = the cell, so origin (0.5, 0.96) and
     the actor's scaleFor (src/stage5-art.js) see the full cell.
  7. Aginor's tether frame (3) carries "palm": [dx, dy] in cell px from the feet anchor (centre x, FOOT): the
     centroid of its pale green-white palm glow, else the forward-most opaque pixel at chest height. stage5-hud.js
     starts the tether line there.

Usage: python3 tools/stage5/process_bosses.py [--src DIR] [--out DIR] [--debug DIR] [--only aginor|balthamel] [--px 1.5]
       (needs numpy, opencv-python, Pillow, scipy)
"""
import hashlib, json, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LO, HI, EDGE, PINK = 36.0, 225.0, 6.0, 34.0
PAGE_MAX, GUTTER, CELL_MAX = 2048, 2, 1024
PX = 1.5

BOSSES = {
    'aginor': dict(
        src='aginor-sheet.src.png', key='s5agin', n=7, rows=(4, 3), idle_h=161, idle=0,
        names=['idle', 'hurt', 'staff', 'tether', 'step', 'staggered', 'burn'],
        feet={4}, body=set(), staff=True, palm=3, dx={}, flip={4}, steel=False),
    'balthamel': dict(
        src='balthamel-sheet.src.png', key='s5balt', n=9, rows=(5, 4), idle_h=149, idle=1,
        names=['drop', 'idle', 'flail', 'step', 'lunge', 'holding', 'down', 'vines', 'recoil'],
        feet={2, 4, 8}, body={6}, staff=False, palm=None, dx={}, flip=set(), steel=True),
}
PORTRAIT = 136


def key(a, steel=False):
    """RGB float -> (unmixed rgb, alpha) with the magenta keyed out and despilled. steel: every violet cast on an
    opaque pixel (R and B both above G) turns steel-blue (R pulled to G, B kept a little cooler) instead of keying
    out, so Balthamel's purple-tinged coat hems stay solid."""
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    s = np.minimum(R, B) - G
    hard = s > 150
    if hard.sum() < 1000:
        raise SystemExit('no magenta background found (is this the #FF00FF collage?)')
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
    Fr, Fg, Fb = F[..., 0], F[..., 1], F[..., 2]
    e = np.minimum(Fr, Fb) - Fg
    cap = np.where((alpha < 1) & (alpha > 0), np.minimum(e, EDGE), np.minimum(e, EDGE * 2))
    ex = np.maximum(e - cap, 0)
    F = np.stack([Fr - ex, Fg, Fb - ex * 0.85], -1)
    w = np.clip((e - PINK) / 30, 0, 1)[..., None]
    F = F * (1 - w) + F.mean(-1, keepdims=True) * w
    if steel:
        Fr, Fg, Fb = F[..., 0], F[..., 1], F[..., 2]
        v = np.clip(np.minimum(Fr, Fb) - Fg, 0, None)
        F = np.stack([Fr - v, Fg, Fg + (Fb - Fg) * np.where(v > 0, 0.7, 1.0)], -1)
    return np.clip(F, 0, 255), alpha


def figures(alpha, n, rows):
    fg = alpha > 0
    lbl, count = ndi.label(fg, structure=np.ones((3, 3)))
    if count < n:
        raise SystemExit(f'expected {n} figures, found {count} blobs')
    sizes = ndi.sum(fg, lbl, range(1, count + 1))
    order = np.argsort(-sizes, kind='stable')
    big = [int(i) + 1 for i in order[:n]]
    if count > n and sizes[order[n]] > 0.25 * sizes[order[n - 1]]:
        raise SystemExit(f'blob {n + 1} is {int(sizes[order[n]])} px against {int(sizes[order[n - 1]])}: '
                         f'the collage does not hold exactly {n} separate figures')
    objs = ndi.find_objects(lbl)
    cy = {i: (objs[i - 1][0].start + objs[i - 1][0].stop) / 2 for i in big}
    by_y = sorted(big, key=lambda i: (cy[i], objs[i - 1][1].start))
    top, bot = by_y[:rows[0]], by_y[rows[0]:]
    if bot and max(objs[i - 1][0].start for i in bot) < min(objs[i - 1][0].start for i in top):
        raise SystemExit('rows are not separable')
    if bot and max(cy[i] for i in top) >= min(cy[i] for i in bot):
        raise SystemExit('rows overlap in y: check the collage layout')
    ordered = sorted(top, key=lambda i: objs[i - 1][1].start) + sorted(bot, key=lambda i: objs[i - 1][1].start)
    owner = np.full(lbl.shape, -1, np.int16)
    for k, i in enumerate(ordered):
        owner[lbl == i] = k
    dist = np.stack([ndi.distance_transform_edt(lbl != i) for i in ordered])
    dropped = joined = 0
    for i in range(1, count + 1):
        if i in ordered: continue
        if sizes[i - 1] < 4:
            dropped += 1; continue
        m = lbl == i
        ys, xs = np.where(m)
        owner[m] = int(np.argmin(dist[:, ys, xs].mean(1)))
        joined += 1
    return owner, dropped, joined


def crop(F, alpha, owner, k):
    m = owner == k
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
    rgba[..., :3] = F[y0:y1, x0:x1]
    rgba[..., 3] = alpha[y0:y1, x0:x1] * m[y0:y1, x0:x1] * 255
    return rgba, (int(x0), int(y0))


def resize(rgba, k):
    h, w = rgba.shape[:2]
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    al = rgba[..., 3:4] / 255.0
    pre = np.concatenate([rgba[..., :3] * al, al * 255], -1).astype(np.float32)
    r = np.clip(cv2.resize(pre, (nw, nh), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_LANCZOS4), 0, 255)
    a2 = r[..., 3:4] / 255.0
    rgb = np.where(a2 > 1e-3, r[..., :3] / np.maximum(a2, 1e-3), 0)
    return np.concatenate([np.clip(rgb, 0, 255), r[..., 3:4]], -1)


def lum_chroma(p):
    return p[..., :3].mean(-1), p[..., :3].max(-1) - p[..., :3].min(-1)


def bone(p):
    L, C = lum_chroma(p)
    return (p[..., 3] > 128) & (L > 150) & (C < 48)


def foot_row(p, staff):
    a = p[..., 3] > 128
    if staff:
        b = a & ~bone(p)
        if b.any(): a = b
    rows = np.where(a.sum(1) >= 3)[0]
    return int(rows[-1]) if len(rows) else p.shape[0] - 1


def torso_x(p, staff):
    a = p[..., 3] > 200
    rows = np.where(a.any(1))[0]
    top, bot = rows[0], rows[-1]
    L, _ = lum_chroma(p)
    band = np.zeros(a.shape, bool)
    band[int(top + 0.4 * (bot - top)):int(top + 0.7 * (bot - top)) + 1] = True
    m = a & band & (L < 110)
    if staff: m &= ~bone(p)
    if m.sum() < 20: m = a & band
    return float(np.median(np.where(m)[1]))


def feet_x(p, staff):
    a = p[..., 3] > 128
    if staff:
        b = a & ~bone(p)
        if b.any(): a = b
    rows = np.where(a.any(1))[0]
    top, bot = rows[0], rows[-1]
    xs = np.where(a[int(bot - 0.08 * (bot - top)):bot + 1])[1]
    return float(xs.mean())


def palm_of(cell, foot, W):
    """Tether palm in cell px: the pale green-white glow, else the forward-most opaque pixel at chest height."""
    r, g, b, a = cell[..., 0], cell[..., 1], cell[..., 2], cell[..., 3]
    glow = (a > 128) & (g > 170) & (g - r > 8) & (g - b > 4)
    if glow.sum() >= 12:
        lbl, n = ndi.label(glow)
        sizes = ndi.sum(glow, lbl, range(1, n + 1))
        ys, xs = np.where(lbl == int(np.argmax(sizes)) + 1)
        px, py, how = float(xs.mean()), float(ys.mean()), 'glow'
    else:
        op = a > 128
        rows = np.where(op.any(1))[0]
        top = rows[0]
        y0, y1 = int(top + 0.25 * (foot - top)), int(top + 0.45 * (foot - top))
        cols = np.where(op[y0:y1 + 1].any(0))[0]
        px = float(cols.max())
        py = float(np.where(op[y0:y1 + 1, int(px)])[0].mean() + y0)
        how = 'reach'
    return [round(px - W / 2), round(foot - py)], how


def build(name, cfg, src_dir, out_dir, debug):
    N = cfg['n']
    path = os.path.join(src_dir, cfg['src'])
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    F, alpha = key(a, cfg['steel'])
    owner, dropped, joined = figures(alpha, N, cfg['rows'])
    raw = [crop(F, alpha, owner, k)[0] for k in range(N)]
    raw = [np.ascontiguousarray(p[:, ::-1]) if i in cfg['flip'] else p for i, p in enumerate(raw)]
    tall = lambda p: foot_row(p, cfg['staff']) + 1 - int(np.where((p[..., 3] > 128).any(1))[0][0])
    K, bound = PX * cfg['idle_h'] / tall(raw[cfg['idle']]), 'target'
    for i, p in enumerate(raw):
        if tall(p) * K > CELL_MAX * 0.96 - 8:
            K, bound = (CELL_MAX * 0.96 - 8) / tall(p), f'height of {cfg["names"][i]}'
    K = round(K, 5)
    poses = [resize(p, K) for p in raw]
    ip = poses[cfg['idle']]
    idle_torso, idle_feet = torso_x(ip, cfg['staff']), feet_x(ip, cfg['staff'])
    place = []  # (dx from the cell centre, mode); the cell is sized after every pose is anchored
    for i, p in enumerate(poses):
        w = p.shape[1]
        if i in cfg['body']: dx, mode = -w / 2, 'body'
        elif i in cfg['feet']: dx, mode = (idle_feet - idle_torso) - feet_x(p, cfg['staff']), 'feet'
        else: dx, mode = -torso_x(p, cfg['staff']), 'torso'
        place.append((int(round(dx)) + cfg['dx'].get(i, 0), mode))
    half = max(max(-dx, dx + p.shape[1]) for (dx, _), p in zip(place, poses)) + 4
    up = max(foot_row(p, cfg['staff']) + 1 for p in poses) + 4
    W = int(-(-2 * half // 8) * 8)
    H = int(-(-(up / 0.96) // 8) * 8)
    FOOT = round(H * 0.96)
    while FOOT < up: H += 8; FOOT = round(H * 0.96)
    report = {'source': os.path.relpath(path, ROOT) if path.startswith(ROOT) else path, 'K': K, 'boundBy': bound,
              'PX': PX, 'cell': [W, H], 'baseH': round(H / PX, 3), 'foot': FOOT, 'flipped': sorted(cfg['flip']),
              'specksDropped': dropped, 'crumbsJoined': joined, 'poses': []}
    cells, frames = [], {}
    for i, p in enumerate(poses):
        h, w = p.shape[:2]
        fy = foot_row(p, cfg['staff'])
        dx, mode = place[i]
        dx += W // 2
        dy = FOOT - fy
        cell = np.zeros((H, W, 4), np.float32)
        sy0, sx0 = max(0, -dy), max(0, -dx)
        sy1, sx1 = min(h, H - dy), min(w, W - dx)
        cell[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] = p[sy0:sy1, sx0:sx1]
        lost = int((p[..., 3] > 40).sum() - (cell[..., 3] > 40).sum())
        if lost > 0: print(f'warning: {name} pose {i} {cfg["names"][i]} clipped {lost} px', file=sys.stderr)
        out = np.clip(cell + 0.5, 0, 255).astype(np.uint8)
        out[out[..., 3] == 0, :3] = 0
        ys, xs = np.where(out[..., 3] > 0)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        cells.append((out, box))
        entry = {'i': i, 'name': cfg['names'][i], 'anchor': mode, 'place': [int(dx), int(dy)], 'trim': list(box), 'clipped': lost}
        if i in cfg['flip']: entry['mirrored'] = True
        if cfg['palm'] == i:
            palm, how = palm_of(out.astype(np.float32), FOOT, W)
            frames[str(i)] = {'palm': palm}
            entry['palm'] = palm; entry['palmFrom'] = how
        report['poses'].append(entry)
    # shelf pack in frame order (deterministic)
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
    atlas = {'frames': {}, 'meta': {'app': 'tools/stage5/process_bosses.py', 'image': cfg['key'] + '.webp',
                                    'size': {'w': PW, 'h': PH}, 'scale': '1', 'format': 'RGBA8888',
                                    'px': PX, 'baseH': round(H / PX, 3)}}
    for i, ((out, (x0, y0, x1, y1)), (sx, sy)) in enumerate(zip(cells, spots)):
        w, h = x1 - x0, y1 - y0
        page[sy:sy + h, sx:sx + w] = out[y0:y1, x0:x1]
        fr = {'frame': {'x': sx, 'y': sy, 'w': w, 'h': h}, 'rotated': False, 'trimmed': True,
              'spriteSourceSize': {'x': x0, 'y': y0, 'w': w, 'h': h}, 'sourceSize': {'w': W, 'h': H}}
        fr.update(frames.get(str(i), {}))
        atlas['frames'][str(i)] = fr
    rgb = page[..., :3].astype(int)
    report['pinkPx'] = int(((page[..., 3] > 25) & ((np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]) > 50)).sum())
    os.makedirs(out_dir, exist_ok=True)
    img_p, json_p = os.path.join(out_dir, cfg['key'] + '.webp'), os.path.join(out_dir, cfg['key'] + '.json')
    Image.fromarray(page, 'RGBA').save(img_p, 'WEBP', quality=90, method=6, exact=False)
    with open(json_p, 'w') as f:
        json.dump(atlas, f, indent=1, sort_keys=True); f.write('\n')
    report['page'] = [PW, PH]
    report['rgbaMiB'] = round(PW * PH * 4 / 2 ** 20, 3)
    report['gridMiB'] = round(N * W * H * 4 / 2 ** 20, 3)
    report['files'] = {os.path.basename(p): os.path.getsize(p) for p in (img_p, json_p)}
    if debug:
        os.makedirs(debug, exist_ok=True)
        sheet = np.zeros((H, W * N, 3), np.uint8) + np.array([48, 56, 72], np.uint8)
        ghost = np.zeros((H, W), np.float32)
        for i, (out, box) in enumerate(cells):
            al = out[..., 3:4] / 255.0
            sheet[:, i * W:(i + 1) * W] = (out[..., :3] * al + sheet[:, i * W:(i + 1) * W] * (1 - al)).astype(np.uint8)
            ghost = np.maximum(ghost, out[..., 3] / 255.0 * 0.3 * (i != cfg['idle']))
            cv2.rectangle(sheet, (i * W + box[0], box[1]), (i * W + box[2] - 1, box[3] - 1), (90, 90, 140), 1)
            if i: sheet[:, i * W] = (255, 255, 0)
            sheet[:, i * W + W // 2] = (255, 80, 80)
        sheet[FOOT] = (0, 255, 0)
        o = cells[cfg['idle']][0]
        reg = (np.array([48, 56, 72]) * (1 - ghost[..., None]) + 220 * ghost[..., None]).astype(np.uint8)
        al = o[..., 3:4] / 255.0
        reg = (o[..., :3] * al + reg * (1 - al)).astype(np.uint8); reg[FOOT] = (0, 255, 0); reg[:, W // 2] = (255, 80, 80)
        Image.fromarray(sheet).save(os.path.join(debug, f'{name}-cells.png'))
        Image.fromarray(reg).save(os.path.join(debug, f'{name}-registration.png'))
    return report, cells


def portrait(src_dir, out_dir, agin_cells):
    out_p = os.path.join(out_dir, 'aginor-portrait.webp')
    src = os.path.join(src_dir, 'aginor-portrait.src.png')
    if os.path.exists(src):
        im = Image.open(src).convert('RGB')
        s = min(im.size)
        x0, y0 = (im.size[0] - s) // 2, (im.size[1] - s) // 2
        im = im.crop((x0, y0, x0 + s, y0 + s)).resize((PORTRAIT, PORTRAIT), Image.LANCZOS)
        how = 'aginor-portrait.src.png, centre square'
    else:
        out, _ = agin_cells[0]
        a = out[..., 3] > 128
        rows = np.where(a.any(1))[0]
        top = int(rows[0])
        cx = float(np.where(a[top:top + 40])[1].mean())
        side = 150
        x0, y0 = int(round(cx - side / 2)), max(0, top - 12)
        bg = np.zeros((side, side, 3), np.float32)
        bg[:] = np.linspace([58, 22, 18], [16, 8, 10], side)[:, None, :]
        cut = np.zeros((side, side, 4), np.float32)
        H, W = out.shape[:2]
        sx0, sy0, sx1, sy1 = max(0, x0), y0, min(W, x0 + side), min(H, y0 + side)
        cut[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = out[sy0:sy1, sx0:sx1]
        al = cut[..., 3:4] / 255.0
        im = Image.fromarray((cut[..., :3] * al + bg * (1 - al)).astype(np.uint8)).resize((PORTRAIT, PORTRAIT), Image.LANCZOS)
        how = 'cut from the idle pose head on a rust sky'
    im.save(out_p, 'WEBP', quality=90, method=6)
    return {'file': os.path.basename(out_p), 'bytes': os.path.getsize(out_p), 'from': how}


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def main(argv):
    arg = lambda k, d: argv[argv.index(k) + 1] if k in argv else d
    src_dir = os.path.abspath(arg('--src', os.path.join(ROOT, 'art-in', 'stage5')))
    out_dir = os.path.abspath(arg('--out', os.path.join(ROOT, 'assets', 'stage5')))
    debug = arg('--debug', None)
    only = arg('--only', None)
    global PX
    PX = float(arg('--px', PX))
    rep, cells = {}, {}
    for name, cfg in BOSSES.items():
        if only and only != name: continue
        rep[name], cells[name] = build(name, cfg, src_dir, out_dir, debug)
    if 'aginor' in cells:
        rep['portrait'] = portrait(src_dir, out_dir, cells['aginor'])
    rep['sha256'] = {}
    for f in sorted(os.listdir(out_dir)):
        if f.startswith(('s5agin.', 's5balt.', 'aginor-portrait.')): rep['sha256']['out/' + f] = sha(os.path.join(out_dir, f))
    for f in sorted(os.listdir(src_dir)):
        if f.endswith('.src.png'): rep['sha256']['src/' + f] = sha(os.path.join(src_dir, f))
    print(json.dumps(rep, indent=1))


if __name__ == '__main__':
    main(sys.argv[1:])
