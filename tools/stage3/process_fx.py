#!/usr/bin/env python3
"""Build the painted Stage 3 prop/FX sheets from the two ChatGPT collages (approved by Jason F via Grok Bot, 2026-10-08).

Sources, kept verbatim:
  art-in/stage3fx/fx-collage-a.src.png  1536x1024, flat magenta (~#FC03FB): row 1 = 4 roof-tile clusters,
                                        row 2 = 4 frames of the far Fade running right with the blue-ribbon bundle
  art-in/stage3fx/fx-collage-b.src.png  1536x1024, flat green (~#04F902): row 1 = 4 shadow pools,
                                        rows 2-3 = the 6 shadow-burst frames (3 + 3, reading order)

Outputs (same files, keys, sizes and 256x256 frame grid as the placeholder cards they replace):
  assets/stage3/props/prop-rooftiles.webp   1024x256  4 frames
  assets/stage3/props/fx-shadowpool.webp    1024x256  4 frames
  assets/stage3/props/fx-shadowburst.webp   1536x256  6 frames
  assets/stage3/props/fx-fade-far.webp      1024x256  4 frames
  docs/stage3/shots/contact-stage3-fx.jpg   contact sheet (strips on a checker, game-scale previews on the plates)

Steps (deterministic: running it twice writes byte-identical files):
  1. key. A (magenta): excess s = min(R,B) - G. The background is every bright (mean > 140), magenta-ish (s > 30)
     region connected to the flat key (s > 200); a 3 px band around it catches anti-aliased outlines. Inside that
     soft area alpha = (sK - s) / sK and the colour is unmixed from the median key colour, then fully despilled
     (min(R,B) pulled down to G), so the pale-pink dust trails become see-through warm grey with no pink left.
     Enclosed purple-ish paint (tile undersides) stays opaque, its excess capped at CAP.
     B (green): the same with g = G - max(R,B), and G <= max(R,B) everywhere (the smoke palette has no green).
  2. frames: rows are the horizontal bands of painted pixels; within a row every blob goes to the slot (row width /
     frames) holding its centroid, so loose wisps and shards stay with their frame. Specks under 4 px are dropped.
  3. one scale per effect (premultiplied INTER_AREA), never per frame.
  4. registration in the 256x256 cell (the game draws every sheet with origin 0.5, 0.5):
       tiles: the opaque tile mass centred at (TILE_X, 128); dust trails right (the art travels left, flipX turns it)
       pool:  ellipse centred at (128, 128), the foot spot (wisps rise above it)
       burst: alpha centroid at (128, 128), 100 px above the actor's feet in game
       fade:  torso x locked at FADE_X; feet on FADE_FOOT for the grounded frames, the painted leap height kept
  5. checks: nothing in the outer 1 px of a cell; no pink (A) / green (B) pixel left; then lossless WebP (lossy 4:2:0
     chroma would smear pink/green back into the edges).

Usage: python3 tools/stage3/process_fx.py [--debug DIR]   (needs numpy, opencv-python, Pillow, scipy)
"""
import hashlib, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_A = os.path.join(ROOT, 'art-in', 'stage3fx', 'fx-collage-a.src.png')
SRC_B = os.path.join(ROOT, 'art-in', 'stage3fx', 'fx-collage-b.src.png')
OUT = os.path.join(ROOT, 'assets', 'stage3', 'props')
CONTACT = os.path.join(ROOT, 'docs', 'stage3', 'shots', 'contact-stage3-fx.jpg')
F = 256
CAP = 12.0                  # opaque paint keeps at most this much magenta excess (tile undersides read cool grey-violet)
TILE_K, POOL_K, BURST_K, FADE_K = 0.66, 0.72, 0.54, 0.45
TILE_X = 118                # opaque tile mass centre; the dust trail uses the room on the right
FADE_X, FADE_FOOT = 150, 196
# frame order out of the collage slots. Tile slot 4 repeats slot 1 almost exactly, so it goes between 2 and 3:
# 1,2,4,3 alternates the near-twin with the other two poses instead of holding one pose for two frames (a hitch).
TILE_ORDER = [0, 1, 3, 2]


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


def key(a, green):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    s = (G - np.maximum(R, B)) if green else (np.minimum(R, B) - G)
    K = np.median(a[s > 200], axis=0)
    sK = float(K[1] - max(K[0], K[2])) if green else float(min(K[0], K[2]) - K[1])
    cand = (s > 30) if green else ((s > 30) & (a.mean(-1) > 140))
    lbl, n = ndi.label(cand, structure=np.ones((3, 3)))
    hit = np.unique(lbl[(s > 200) & cand])
    bg = np.isin(lbl, hit[hit > 0])
    band = ndi.binary_dilation(bg, np.ones((3, 3)), iterations=3) & ~bg & (s > 8)
    soft = bg | band
    alpha = np.ones(s.shape, np.float32)
    alpha[soft] = np.clip((sK - s[soft]) / sK, 0, 1)
    alpha = np.where(alpha < 0.06, 0, np.where(alpha > 0.97, 1, alpha)).astype(np.float32)
    am = np.maximum(alpha, 1e-3)[..., None]
    Fc = np.clip((a - (1 - alpha)[..., None] * K) / am, 0, 255)
    Fc = np.where(soft[..., None], Fc, a)
    Fr, Fg, Fb = Fc[..., 0], Fc[..., 1], Fc[..., 2]
    if green:
        Fg = np.minimum(Fg, np.maximum(Fr, Fb))
    else:
        e = np.minimum(Fr, Fb) - Fg
        ex = np.where(soft, np.maximum(e, 0), np.maximum(e - CAP, 0))
        Fr, Fb = Fr - ex, Fb - ex
        # see-through paint (the dust trails and outline edges) becomes a neutral tan of the same lightness
        L = 0.3 * Fr + 0.59 * Fg + 0.11 * Fb
        Fr, Fg, Fb = (np.where(soft, L * k, c) for k, c in ((1.04, Fr), (0.98, Fg), (0.88, Fb)))
    rgb = np.stack([Fr, Fg, Fb], -1)
    # drop specks
    lb, m = ndi.label(alpha > 0, structure=np.ones((3, 3)))
    if m:
        sz = ndi.sum(np.ones_like(lb), lb, range(1, m + 1))
        small = np.isin(lb, 1 + np.nonzero(sz < 4)[0])
        alpha[small] = 0
    rgb[alpha == 0] = 0
    return rgb, alpha


def bands(alpha, min_h=40):
    rows = (alpha > 0).any(1)
    out, st = [], None
    for y, v in enumerate(list(rows) + [False]):
        if v and st is None: st = y
        if not v and st is not None:
            if y - st >= min_h: out.append((st, y))
            st = None
    return out


def slots(rgb, alpha, band, n):
    y0, y1 = band
    A = alpha[y0:y1]
    lbl, m = ndi.label(A > 0, structure=np.ones((3, 3)))
    cms = ndi.center_of_mass(A > 0, lbl, range(1, m + 1))
    W = alpha.shape[1]
    owner = np.zeros(m + 1, int) - 1
    for i, (cy, cx) in enumerate(cms):
        owner[i + 1] = min(n - 1, int(cx // (W / n)))
    frames = []
    for k in range(n):
        mask = np.isin(lbl, np.nonzero(owner == k)[0])
        assert mask.any(), f'slot {k} of band {band} is empty'
        ys, xs = np.nonzero(mask)
        bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        al = np.where(mask, A, 0)[by0:by1, bx0:bx1]
        c = rgb[y0 + by0:y0 + by1, bx0:bx1] * al[..., None]
        frames.append(np.dstack([c, al]))          # premultiplied RGBA float, tight crop
    return frames


def scale(pm, k):
    h, w = pm.shape[:2]
    return cv2.resize(pm, (max(1, round(w * k)), max(1, round(h * k))), interpolation=cv2.INTER_AREA)


def place(pm, x, y):
    """Paste a premultiplied crop with its top-left at integer (x, y) into an empty cell."""
    cell = np.zeros((F, F, 4), np.float32)
    h, w = pm.shape[:2]
    x, y = int(round(x)), int(round(y))
    assert x >= 1 and y >= 1 and x + w <= F - 1 and y + h <= F - 1, f'clipped: {w}x{h} at {x},{y}'
    cell[y:y + h, x:x + w] = pm
    return cell


def bbox(m):
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def tiles(frames):
    out = []
    for pm in frames:
        s = scale(pm, TILE_K)
        x0, y0, x1, y1 = bbox(s[..., 3] > 0.9)
        out.append(place(s, TILE_X - (x0 + x1) / 2, 128 - (y0 + y1) / 2))
    return [out[i] for i in TILE_ORDER]


def pools(frames):
    sc = [scale(pm, POOL_K) for pm in frames]
    hs = [bbox(s[..., 3] > 0.5)[3] - bbox(s[..., 3] > 0.5)[1] for s in sc[:3]]
    H = float(np.median(hs))
    out = []
    for s in sc:
        x0, y0, x1, y1 = bbox(s[..., 3] > 0.5)
        out.append(place(s, 128 - (x0 + x1) / 2, 128 + H / 2 - y1))
    return out


def bursts(frames):
    out = []
    for pm in frames:
        s = scale(pm, BURST_K)
        cy, cx = ndi.center_of_mass(s[..., 3])
        out.append(place(s, 128 - cx, 128 - cy))
    return out


def fades(frames):
    sc = [scale(pm, FADE_K) for pm in frames]
    # source bottoms decide the leap height: the frame whose feet sit lowest in the collage is on the ground
    out, base = [], max(FADE_BOTTOMS)
    for s, b in zip(sc, FADE_BOTTOMS):
        a = s[..., 3] > 0.5
        x0, y0, x1, y1 = bbox(a)
        h = y1 - y0
        # torso: rows 15-55 % of the figure, the right half (the cloak streams out to the left)
        band = a[y0 + int(h * 0.15):y0 + int(h * 0.55)]
        xs = np.nonzero(band)[1]
        xs = xs[xs >= np.median(xs)]
        tx = float(np.median(xs))
        foot = FADE_FOOT - (base - b) * FADE_K
        out.append(place(s, FADE_X - tx, foot - y1))
    return out


FADE_BOTTOMS = []          # filled by main(): where each far-Fade frame's lowest pixel sat in the collage


def to_u8(cell, green):
    a = np.clip(cell[..., 3], 0, 1)
    rgb = np.where(a[..., None] > 0, cell[..., :3] / np.maximum(a, 1e-6)[..., None], 0)
    # resampling can mix a red and a blue-ish neighbour into a purple one: despill once more after scaling
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if green:
        G = np.minimum(G, np.maximum(R, B))
    else:
        ex = np.maximum(np.minimum(R, B) - G - np.where(a >= 0.97, CAP, 0.0), 0)
        R, B = R - ex, B - ex
    rgb = np.stack([R, G, B], -1)
    a8 = np.round(a * 255).astype(np.uint8)
    rgb8 = np.where(a8[..., None] > 0, np.clip(np.round(rgb), 0, 255), 0).astype(np.uint8)
    return np.dstack([rgb8, a8])


def strip(cells, green):
    return np.concatenate([to_u8(c, green) for c in cells], 1)


def check(name, s, green):
    a = s[..., 3].astype(int)
    for i in range(s.shape[1] // F):
        c = a[:, i * F:(i + 1) * F]
        assert c[0].max() == 0 and c[-1].max() == 0 and c[:, 0].max() == 0 and c[:, -1].max() == 0, f'{name} frame {i} touches the cell edge'
    R, G, B = (s[..., j].astype(int) for j in range(3))
    vis = a > 8
    # pink/magenta = R and B both above G. Opaque paint may keep CAP (cool shading); see-through paint keeps none.
    bad = vis & ((G - np.maximum(R, B) > 2) if green else (np.minimum(R, B) - G > np.where(a >= 247, CAP + 2, 2)))
    assert not bad.any(), f'{name}: {int(bad.sum())} {"green" if green else "pink"} pixels left'
    return int(vis.sum())


def save_webp(arr, path):
    Image.fromarray(arr, 'RGBA').save(path, 'WEBP', lossless=True, quality=100, method=6, exact=False)


def checker(w, h, n=16):
    y, x = np.mgrid[0:h, 0:w]
    v = np.where(((x // n) + (y // n)) % 2, 150, 110).astype(np.uint8)
    return Image.fromarray(np.dstack([v, v, v + 10, np.full_like(v, 255)]), 'RGBA')


def contact(strips):
    W = 1536 + 40
    rows = []
    for name, arr in strips:
        im = Image.fromarray(arr, 'RGBA')
        bg = checker(im.width, im.height); bg.alpha_composite(im); rows.append(bg)
    # game-scale previews: far Fade on the day and night far plates (x1.37 like farImg), tiles at 0.5 on the rooftops
    prev = Image.new('RGBA', (W - 20, 300), (0, 0, 0, 255))
    fade = dict(strips)['fx-fade-far']
    for j, plate in enumerate(['bg3-far-day.jpg', 'bg3-far-night.jpg']):
        p = Image.open(os.path.join(ROOT, 'assets', 'bg3', plate)).convert('RGBA')
        p = p.resize((round(p.width * 1.37), round(p.height * 1.37)), Image.LANCZOS).crop((300, 56, 300 + 768, 56 + 300))
        for i in range(4):
            fr = Image.fromarray(np.ascontiguousarray(fade[:, i * F:(i + 1) * F]), 'RGBA')
            p.alpha_composite(fr, (i * 180 + 20, 184 - 56 - 128 + 20))
        prev.alpha_composite(p, (j * 778, 0))
    sheet = Image.new('RGB', (W, sum(r.height + 20 for r in rows) + 320), (24, 24, 30))
    y = 20
    for r in rows:
        sheet.paste(r.convert('RGB'), (20, y)); y += r.height + 20
    sheet.paste(prev.convert('RGB'), (20, y))
    return sheet


def main():
    dbg = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    rgbA, alA = key(load(SRC_A), False)
    rgbB, alB = key(load(SRC_B), True)
    bA, bB = bands(alA), bands(alB)
    assert len(bA) == 2 and len(bB) == 3, (bA, bB)
    t = slots(rgbA, alA, bA[0], 4)
    f = slots(rgbA, alA, bA[1], 4)
    p = slots(rgbB, alB, bB[0], 4)
    b = slots(rgbB, alB, bB[1], 3) + slots(rgbB, alB, bB[2], 3)
    # where each Fade crop's bottom sat in the collage (the leap height ChatGPT painted)
    y0, A, W = bA[1][0], alA[bA[1][0]:bA[1][1]], alA.shape[1]
    FADE_BOTTOMS[:] = [y0 + np.nonzero(A[:, int(k * W / 4):int((k + 1) * W / 4)].any(1))[0].max() + 1 for k in range(4)]
    sheets = [
        ('prop-rooftiles', strip(tiles(t), False), False),
        ('fx-shadowpool', strip(pools(p), True), True),
        ('fx-shadowburst', strip(bursts(b), True), True),
        ('fx-fade-far', strip(fades(f), False), False),
    ]
    os.makedirs(OUT, exist_ok=True)
    for name, arr, green in sheets:
        n = check(name, arr, green)
        path = os.path.join(OUT, name + '.webp')
        save_webp(arr, path)
        print(f'{name}: {arr.shape[1]}x{arr.shape[0]}, {n} visible px, {os.path.getsize(path)} B, sha256 {hashlib.sha256(open(path, "rb").read()).hexdigest()}')
        if dbg:
            os.makedirs(dbg, exist_ok=True)
            Image.fromarray(arr, 'RGBA').save(os.path.join(dbg, name + '.png'))
    contact([(n, a) for n, a, _ in sheets]).save(CONTACT, 'JPEG', quality=88)
    print('contact', os.path.relpath(CONTACT, ROOT))


if __name__ == '__main__':
    main()
