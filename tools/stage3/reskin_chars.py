#!/usr/bin/env python3
"""Build the Stage 3 cutthroat, Fade and riley3 atlases from existing painted sheets.

  cutthroat <- assets/chars/zealot  (palette/region recolour: charcoal hood and cloak, oxblood shirt, brown leather)
  fade      <- assets/chars/byar    (black cloak and armour, pale grey eyeless face; blink frames sink into shadow)
  riley3    <- assets/chars/riley   (Riley's own painted frames, copied unchanged)
  fade-portrait <- assets/ui/byar-portrait.webp (same recolour, eyes painted out)

Frames are copied 1:1 (no resampling) at the source pack density, re-registered on the Stage 3 canvas
(anchor and baseline stay on the same pixel), repacked tightly, and identical frames share one rect.
Normal maps come from the source sheet's own _n/_nl pages, cut with the same rects, at half
resolution like every shared character atlas. Run from the repo root:

    python3 tools/stage3/reskin_chars.py [cutthroat fade riley3 portrait]
"""
import json, os, sys, zlib
import numpy as np
import cv2
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reskin_lib as RL

SRC = 'assets/chars'
DST = 'assets/stage3/chars'
PAD = 2

# target anim -> list of (source frame, effect). Holds/loop/page come from the existing anims.json
# unless HOLDS overrides them (the manifest carries the same numbers).
W0, W1, W2, W3 = 'walk_00', 'walk_01', 'walk_02', 'walk_03'
CHARS = {
    'cutthroat': dict(src='zealot', recolor='recolor_cutthroat', anims={
        # zealot walks a 4-pose cycle; 6 slots: contact poses doubled, passing poses held longer
        'walk': [W0, W0, W1, W2, W2, W3],
        'hurt': ['hurt_00', 'hurt_01'],
        'slash': ['slash_00', 'slash_01', 'slash_02', 'slash_03', 'slash_04'],
        'knockdown': ['knockdown_00', 'knockdown_01', 'knockdown_02'],
        'lunge': ['chargeup_00', 'charge_00', 'charge_01', 'charge_02', 'slam_01'],
        'getup': ['getup_00', 'getup_01'],
        'dazed': ['dazed_00'],
        'hold': ['block_00', 'guard_00', 'chargeup_00', 'guardbreak_00'],
        'grabthrow': ['slam_00', 'slam_01'],
        'shoved': ['hurt_00', 'guardbreak_00'],
        'stalk': [W0, W1, W2, W3],
        'flee': ['flee_00', 'flee_01', 'flee_02', 'flee_03'],
    }, holds={'walk': [90, 90, 130, 90, 90, 130]}),
    'fade': dict(src='byar', recolor='recolor_fade', anims={
        'walk': [W0, W1, W2, W3],
        'intro': ['getup_00', 'getup_01', 'rushend_01', 'command_00'],
        'slash': ['combo_00', 'combo_01', 'combo_02', 'combo_04', 'combo_05', 'riposte_04'],
        'hurt': ['hurt_00', 'hurt_01'],
        'lunge': ['rushup_00', 'rush_00', 'rush_01', 'rush_02', 'rushend_00'],
        'knockdown': ['knockdown_00', 'knockdown_01', 'knockdown_02'],
        'blinkout': ['parry_00', ('parry_00', 'sink', 0.3), ('parry_00', 'sink', 0.6), ('parry_00', 'sink', 0.86)],
        'blinkin': [('riposte_00', 'sink', 0.7), ('riposte_00', 'sink', 0.35), 'riposte_00', 'combo_00'],
        'fear': ['volley_04', 'volley_01', 'volley_02', 'accuse_00', 'rage_02'],
        'stagger': ['hurt_00', 'hurt_01', 'retreat_00'],
        'split': ['rage_00', 'rage_01', 'volley_03', 'torch_03', 'command_00'],
        'getup': ['getup_00', 'getup_01'],
        'point': ['accuse_00'],
        'idle': ['parry_00', 'parry_00', 'riposte_03', 'riposte_03'],
        'defeated': ['hurt_00', 'hurt_01', 'getup_00', 'defeated_00'],
    }, holds={}),
    'riley3': dict(src='riley', recolor=None, prefix='riley_', anims={
        # held from behind: Riley's own hurt frames as a struggle loop; escape is his back kick (hit on frame 1)
        'grabbed': ['hurt_00', 'hurt_01', 'hurt_02', 'hurt_01'],
        'escape': ['back_01', 'back_03', 'back_04', 'idle_00'],
    }, holds={}),
}


def load_json(p):
    with open(p) as f:
        return json.load(f)


def rgba(p):
    return np.asarray(Image.open(p).convert('RGBA'))


def up2(n, shape):
    return cv2.resize(n, (shape[1], shape[0]), interpolation=cv2.INTER_LINEAR)


class Source:
    def __init__(self, key):
        self.key = key
        self.meta = load_json(f'{SRC}/{key}.anims.json')
        self.pages = {}
        self.frames = {}
        for p in self.meta['pages']:
            col = rgba(f'{SRC}/{p}.webp')
            n = np.asarray(Image.open(f'{SRC}/{p}_n.webp').convert('RGB'))
            nl = np.asarray(Image.open(f'{SRC}/{p}_nl.webp').convert('RGB'))
            self.pages[p] = (col, up2(n, col.shape), up2(nl, col.shape))
            for name, d in load_json(f'{SRC}/{p}.json')['frames'].items():
                self.frames[name] = (p, d)

    def get(self, name):
        p, d = self.frames[f'{self.key}_{name}']
        col, n, nl = self.pages[p]
        f = d['frame']
        sl = (slice(f['y'], f['y'] + f['h']), slice(f['x'], f['x'] + f['w']))
        return col[sl].copy(), n[sl].copy(), nl[sl].copy(), dict(d['spriteSourceSize'])


def sink(col, n, nl, ss, depth, seed):
    """Fade melting into its shadow pool: the figure drops below the floor line, the part still above
    darkens from the feet up and its lower edge frays into smoke."""
    h, w = col.shape[:2]
    drop = int(round(h * depth))
    keep = h - drop
    if keep < 8:
        keep = 8; drop = h - keep
    c = col[:keep].copy(); nn = n[:keep].copy(); nnl = nl[:keep].copy()
    rng = np.random.RandomState(seed)
    yy = np.arange(keep, dtype=np.float32)[:, None]
    band = max(10.0, 0.22 * keep)
    t = np.clip((yy - (keep - band)) / band, 0, 1)            # 0 above the band, 1 at the floor line
    noise = cv2.GaussianBlur(rng.rand(keep, w).astype(np.float32), (0, 0), 2.2)
    noise = (noise - noise.min()) / max(1e-6, float(np.ptp(noise)))
    a = c[..., 3].astype(np.float32) / 255.0
    fray = np.clip(1.25 - t * (0.85 + 0.9 * noise) - 0.25 * depth * t, 0, 1)
    a = a * fray
    dark = 1 - np.clip(t * 1.4 + depth * 0.35, 0, 0.92)
    c[..., :3] = (c[..., :3].astype(np.float32) * dark[..., None]).astype(np.uint8)
    c[..., 3] = (a * 255).astype(np.uint8)
    ss = dict(ss); ss['y'] += drop; ss['h'] = keep
    return c, nn, nnl, ss


def trim(col, n, nl, ss):
    ys, xs = np.where(col[..., 3] > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    ss = dict(x=ss['x'] + int(x0), y=ss['y'] + int(y0), w=int(x1 - x0), h=int(y1 - y0))
    s = (slice(y0, y1), slice(x0, x1))
    return col[s], n[s], nl[s], ss


def skyline_pack(sizes, width):
    """Bottom-left skyline packing. sizes: list of (w, h) already padded. Returns positions and height."""
    sky = [(0, 0, width)]  # segments (x, y, w)
    pos = [None] * len(sizes)
    order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0]))
    for i in order:
        w, h = sizes[i]
        best = None
        for si in range(len(sky)):
            x = sky[si][0]
            if x + w > width: break
            y = 0; wl = w; sj = si
            while wl > 0:
                y = max(y, sky[sj][1]); wl -= sky[sj][2]; sj += 1
                if sj >= len(sky) and wl > 0: y = None; break
            if y is None: continue
            if best is None or y + h < best[1] + sizes[i][1] or (y + h == best[1] + sizes[i][1] and x < best[0]):
                best = (x, y)
        x, y = best
        pos[i] = (x, y)
        # update skyline
        new = []
        for (sx, sy, sw) in sky:
            ex = sx + sw
            if ex <= x or sx >= x + w:
                new.append((sx, sy, sw)); continue
            if sx < x: new.append((sx, sy, x - sx))
            if ex > x + w: new.append((x + w, sy, ex - (x + w)))
        new.append((x, y + h, w))
        new.sort()
        merged = []
        for s in new:
            if merged and merged[-1][1] == s[1] and merged[-1][0] + merged[-1][2] == s[0]:
                merged[-1] = (merged[-1][0], s[1], merged[-1][2] + s[2])
            else:
                merged.append(s)
        sky = merged
    height = max(y + sizes[i][1] for i, (x, y) in enumerate(pos))
    return pos, height


def best_pack(sizes):
    best = None
    for width in range(512, 4097, 16):
        if max(s[0] for s in sizes) > width: continue
        pos, h = skyline_pack(sizes, width)
        h += h % 2
        if h > 4096: continue
        area = width * h
        if best is None or area < best[0]:
            best = (area, width, h, pos)
    return best[1:]


def build(key):
    cfg = CHARS[key]
    src = Source(cfg['src'])
    meta = load_json(f'{DST}/{key}.anims.json')
    prefix = cfg.get('prefix', key + '_')
    fn = getattr(RL, cfg['recolor']) if cfg['recolor'] else None
    sm = src.meta
    # same anchor pixel and baseline pixel on both canvases (canvas units * pack scale)
    assert abs(sm['scale'] - meta['scale']) < 1e-9, 'frames are copied 1:1, pack scales must match'
    s = meta['scale']
    ax_src = (src.meta.get('anchorX') or 0.5)
    dx = int(round((meta['canvas'][0] * 0.5 - sm['canvas'][0] * 0.5) * s))
    dy = int(round((meta['baseline'] - sm['baseline']) * s))
    sw, sh = round(meta['canvas'][0] * s), round(meta['canvas'][1] * s)
    cache = {}

    def frame(spec):
        if spec in cache: return cache[spec]
        name, eff = (spec, None) if isinstance(spec, str) else (spec[0], spec[1:])
        col, n, nl, ss = src.get(name)
        if fn: col = fn(col)
        if eff and eff[0] == 'sink':
            col, n, nl, ss = sink(col, n, nl, ss, eff[1], seed=zlib.crc32(repr(spec).encode()) & 0xffff)
            col, n, nl, ss = trim(col, n, nl, ss)
        ss = dict(x=ss['x'] + dx, y=ss['y'] + dy, w=ss['w'], h=ss['h'])
        assert ss['x'] >= 0 and ss['y'] >= 0 and ss['x'] + ss['w'] <= sw and ss['y'] + ss['h'] <= sh, (key, spec, ss)
        cache[spec] = (col, n, nl, ss)
        return cache[spec]

    # collect per page: unique specs and frame-name -> spec
    pages = {i: {'specs': [], 'names': {}} for i in range(len(meta['pages']))}
    new_anims = []
    for a in meta['anims']:
        short = a['name'][len(prefix):]
        specs = cfg['anims'][short]
        assert len(specs) == len(a['frames']), (a['name'], len(specs), len(a['frames']))
        holds = cfg['holds'].get(short, a['holds'])
        for fname, spec, pg in zip(a['frames'], specs, a['pages']):
            P = pages[pg]
            if spec not in P['specs']: P['specs'].append(spec)
            P['names'][fname] = spec
        new_anims.append(dict(a, holds=holds))

    report = []
    for pi, P in pages.items():
        page = meta['pages'][pi]
        imgs = [frame(sp) for sp in P['specs']]
        sizes = [(im[0].shape[1] + PAD + (im[0].shape[1] + PAD) % 2, im[0].shape[0] + PAD + (im[0].shape[0] + PAD) % 2) for im in imgs]
        W, H, pos = best_pack(sizes)
        col = np.zeros((H, W, 4), np.uint8)
        n = np.zeros((H, W, 3), np.uint8); n[:] = (128, 127, 255)
        nl = n.copy()
        rects = {}
        for sp, (c, nn, nnl, ss), (x, y) in zip(P['specs'], imgs, pos):
            h, w = c.shape[:2]
            col[y:y + h, x:x + w] = c
            m = c[..., 3:] > 0
            n[y:y + h, x:x + w] = np.where(m, nn, n[y:y + h, x:x + w])
            nl[y:y + h, x:x + w] = np.where(m, nnl, nl[y:y + h, x:x + w])
            rects[sp] = (dict(x=x, y=y, w=w, h=h), ss)
        frames = {}
        for fname, sp in sorted(P['names'].items()):
            r, ss = rects[sp]
            frames[fname] = dict(frame=r, rotated=False, trimmed=True, spriteSourceSize=ss, sourceSize=dict(w=sw, h=sh))
        Image.fromarray(col).save(f'{DST}/{page}.webp', 'WEBP', quality=90, method=6, alpha_quality=100)
        half = (W // 2, H // 2)
        Image.fromarray(cv2.resize(n, half, interpolation=cv2.INTER_AREA)).save(f'{DST}/{page}_n.webp', 'WEBP', quality=92, method=6)
        Image.fromarray(cv2.resize(nl, half, interpolation=cv2.INTER_AREA)).save(f'{DST}/{page}_nl.webp', 'WEBP', quality=92, method=6)
        with open(f'{DST}/{page}.json', 'w') as f:
            json.dump(dict(frames=frames, meta=dict(image=f'{page}.webp', size=dict(w=W, h=H), scale=1)), f)
        report.append(f'{page}: {W}x{H} ({len(P["specs"])} unique / {len(P["names"])} frames)')
    meta['anims'] = new_anims
    meta['placeholder'] = False
    meta['normalScale'] = 0.5
    meta['source'] = {'sheet': f'{SRC}/{cfg["src"]}', 'tool': 'tools/stage3/reskin_chars.py', 'recolor': cfg['recolor']}
    with open(f'{DST}/{key}.anims.json', 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    print(key, '; '.join(report))


def portrait():
    """Boss HUD portrait: the Byar portrait recoloured as the Myrddraal (eyes and brows painted out)."""
    im = rgba('assets/ui/byar-portrait.webp')
    out = RL.recolor_fade_portrait(im)
    Image.fromarray(out[..., :3]).save('assets/stage3/ui/fade-portrait.webp', 'WEBP', quality=90, method=6)
    print('fade-portrait: assets/stage3/ui/fade-portrait.webp', out.shape[1], 'x', out.shape[0])


if __name__ == '__main__':
    for k in (sys.argv[1:] or list(CHARS) + ['portrait']):
        portrait() if k == 'portrait' else build(k)
