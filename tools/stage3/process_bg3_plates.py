#!/usr/bin/env python3
"""Post-process the Stage 3 background plates from art-in/bg3/*.src.jpg into assets/bg3/.

Sources: 1280x720 hand-painted cel-style JPGs (Grok Bot image generation, 2026-10-07), kept verbatim in
art-in/bg3/ (file name = <plate>.src.jpg; the original sha256 is recorded in ART_STATUS.json).

  far  (far3_day, far3_night): 3:1 band (rows 90..517) of the source, native pixels, 1280x427.
  mid  (mid3a, mid3b): 3:1 band with the street / parapet on the bottom edge, flat magenta sky keyed to real
       alpha (big connected key regions only, soft alpha on a 4 px edge band, colour unmix + despill),
       premultiplied Lanczos to 2172x724 (plateScale and the torch coordinates in lights.json assume 2172).
       mid3b's left 240 px sink into a cool shadow (smoothstep, opaque) so the mid3a -> mid3b cut reads as a gap.
  floor (floor3a/b/c): horizontal light flattening, floor3a's vertical gutter cut out with a min-error seam,
       horizontal wrap made seamless with a min-error seam + tone ramp, then a periodic Lanczos resample
       to 1080x360.

Far and floor plates are below 2172x724 on purpose: tests/stage3-memory.test.mjs caps the Stage 3 resident
RGBA estimate at 110 MB and seven full-size plates would come to ~131 MB. Phaser sizes the far plate and the
floor tile scale from the texture itself, so the on-screen layout is unchanged.

Usage: python3 tools/stage3/process_bg3_plates.py   (needs numpy, opencv-python, Pillow)
"""
import io, json, os, sys
import numpy as np, cv2
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-in', 'bg3', '{}.src.jpg')
OUT = os.path.join(ROOT, 'assets', 'bg3')
W, H = 2172, 724
FAR_W, FAR_H = 1280, 427        # native source pixels (texture budget)
FLOOR_W, FLOOR_H = 1080, 360
TARGET_BYTES = 400_000          # Stage 2 plates are 270-410 KB

def load(k):
    return np.asarray(Image.open(SRC.format(k)).convert('RGB')).astype(np.float32)

def to_img(a, mode='RGB'):
    return Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), mode)

# ---------------- far plates ----------------
def far(k, top=90):
    a = load(k)
    band = a[top:top + FAR_H]
    assert band.shape[:2] == (FAR_H, FAR_W)
    return to_img(band)

# ---------------- mid plates (magenta key) ----------------
def key_mid(k, top, bottom):
    a = load(k)[top:bottom]
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    s = np.minimum(R, B) - G                     # magenta excess
    hard = (s > 110) & (G < 70)
    # sky = big components of the hard key (protects small interior purples)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard.astype(np.uint8), 8)
    sky = np.zeros_like(hard)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= 60:
            sky |= lab == i
    # edge band: within 4 px of sky
    band = cv2.dilate(sky.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    Kc = np.median(a[sky], axis=0)               # local key colour
    sK = float(np.minimum(Kc[0], Kc[2]) - Kc[1])
    lo = 18.0
    alpha = np.ones(s.shape, np.float32)
    est = 1.0 - np.clip((s - lo) / (sK - lo), 0, 1)
    alpha[band] = est[band]
    alpha[sky] = 0.0
    alpha = np.where(alpha < 0.05, 0, np.where(alpha > 0.95, 1, alpha))
    # light 1px soften on alpha only at the band to kill JPEG stair noise
    soft = cv2.GaussianBlur(alpha, (3, 3), 0.6)
    alpha = np.where(band, np.minimum(alpha, soft * 1.0 + 0.0), alpha)
    alpha[sky] = 0.0
    # unmix: F = (C - (1-a)K) / a
    am = np.maximum(alpha, 1e-3)[..., None]
    F = (a - (1 - alpha)[..., None] * Kc) / am
    F = np.clip(F, 0, 255)
    # despill on the edge band: cap min(R,B) at G + lo
    Fr, Fg, Fb = F[..., 0], F[..., 1], F[..., 2]
    m = np.minimum(Fr, Fb)
    ex = np.maximum(m - (Fg + lo), 0)
    dsp = band & (alpha > 0)
    Fr = np.where(dsp, Fr - ex, Fr); Fb = np.where(dsp, Fb - ex, Fb)
    F = np.stack([Fr, Fg, Fb], -1)
    F = np.where((alpha > 0)[..., None], F, a)
    # bleed colours into transparent area (for any non-premultiplied filtering)
    rgb = F.astype(np.uint8)
    mask = (alpha <= 0).astype(np.uint8)
    rgb = cv2.inpaint(rgb, mask, 3, cv2.INPAINT_TELEA) if mask.any() else rgb
    return rgb.astype(np.float32), alpha

def shade_left(im, width=240, floor=(0.30, 0.27, 0.36)):
    """ease the mid3a -> mid3b cut: the plate's left edge sinks into a cool dusk shadow (smoothstep over `width`
    px, still opaque) so the seam reads as a shadowed gap between the inn and the rooftops. A pure alpha feather
    showed the busy far plate through translucent roofs (double exposure)."""
    a = np.asarray(im).astype(np.float32)
    t = np.clip(np.arange(width) / (width - 1), 0, 1)
    ramp = (t * t * (3 - 2 * t))[None, :, None]
    k = np.array(floor, np.float32)[None, None, :]
    a[:, :width, :3] *= k + (1 - k) * ramp
    return Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), 'RGBA')

def mid(k, top, bottom):
    rgb, alpha = key_mid(k, top, bottom)
    rgba = np.dstack([rgb, alpha * 255])
    im = to_img(rgba, 'RGBA').convert('RGBa').resize((W, H), Image.LANCZOS).convert('RGBA')
    r, g, b, aa = im.split()
    rgb_im = Image.merge('RGB', (r, g, b)).filter(ImageFilter.UnsharpMask(radius=1.6, percent=45, threshold=2))
    out = Image.merge('RGBA', (*rgb_im.split(), aa))
    # snap near-0/near-1 alpha after resample ringing
    A = np.asarray(aa).astype(np.int16)
    A = np.where(A < 6, 0, np.where(A > 249, 255, A)).astype(np.uint8)
    out.putalpha(Image.fromarray(A))
    return out

# ---------------- floors ----------------
def flatten_light(a, sigma=140):
    """remove low-frequency horizontal light/colour drift per channel; keep the vertical gradient."""
    out = np.empty_like(a)
    for ch in range(3):
        blur = cv2.GaussianBlur(a[..., ch], (0, 0), sigmaX=sigma, sigmaY=sigma / 2, borderType=cv2.BORDER_REFLECT)
        target = blur.mean(1, keepdims=True)
        gain = np.clip(target / np.maximum(blur, 1), 0.7, 1.45)
        out[..., ch] = a[..., ch] * gain
    return out

def tone_ramp(a, left_cols, right_cols, R=260):
    """gradient-domain style fix for a join: left content (columns left_cols, ending the left side) meets right
    content (right_cols). Shift both sides' tone toward their mean with a linear ramp R px wide so no step shows."""
    A = a[:, left_cols].mean(1)
    B = a[:, right_cols].mean(1)
    d = cv2.GaussianBlur((A - B).astype(np.float32), (0, 0), sigmaX=0.1, sigmaY=24)
    if d.ndim == 2 and d.shape[1] != 3:
        d = d.reshape(-1, 3)
    return d

def mincut_vertical(err):
    """err: h x w cost; returns per-row cut column (min-cost top->bottom path)."""
    h, w = err.shape
    E = err.copy()
    back = np.zeros((h, w), np.int32)
    for y in range(1, h):
        prev = E[y - 1]
        l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        st = np.stack([l, prev, r])
        idx = st.argmin(0)
        E[y] += st[idx, np.arange(w)]
        back[y] = np.arange(w) + idx - 1
    path = np.zeros(h, np.int32)
    path[-1] = int(E[-1].argmin())
    for y in range(h - 1, 0, -1):
        path[y - 1] = back[y, path[y]]
    return path

def quilt_join(A, B, feather=3):
    """A, B same shape overlap blocks (left content A continues into right content B). Min-cut blend."""
    err = ((A - B) ** 2).sum(-1)
    err = cv2.GaussianBlur(err, (0, 0), 1.0)
    m = feather + 6                               # keep the cut (and its feather) off the block edges
    err[:, :m] = 1e9; err[:, -m:] = 1e9
    path = mincut_vertical(err)
    h, w = err.shape
    xs = np.arange(w)[None, :]
    d = xs - path[:, None]                       # <0 -> A side, >0 -> B side
    t = np.clip((d + feather) / (2 * feather), 0, 1)[..., None]
    return A * (1 - t) + B * t

def remove_gutter(a, g0, g1, O=40, search=40):
    """drop the gutter [g0, g1): overlap the left strip's last O columns with the right side's first O columns
    (starting at c in g1..g1+search, picked for the best brick-phase match) and min-cut blend them."""
    A = a[:, g0 - O:g0]
    best = None
    for c in range(g1, g1 + search):
        e = ((a[:, c:c + O] - A) ** 2).mean()
        if best is None or e < best[0]:
            best = (e, c)
    e, c = best
    a = a.copy()
    d = tone_ramp(a, slice(g0 - O, g0), slice(c, c + O))
    Rr = 260
    xl = np.arange(g0)
    wl = np.clip(1 - (g0 - 1 - xl) / Rr, 0, 1)[None, :, None]
    a[:, :g0] -= d[:, None, :] * 0.5 * wl
    xr = np.arange(c, a.shape[1])
    wr = np.clip(1 - (xr - c) / Rr, 0, 1)[None, :, None]
    a[:, c:] += d[:, None, :] * 0.5 * wr
    A = a[:, g0 - O:g0]
    blend = quilt_join(A, a[:, c:c + O])
    out = np.concatenate([a[:, :g0 - O], blend, a[:, c + O:]], 1)
    return out, (g0, c, float(e))

def make_wrap(a, O=64, search=40):
    """seamless horizontal wrap: tile = a[:, :w-O'] with the first O columns min-cut blended with the tail."""
    w = a.shape[1]
    # choose tail end t so that a[:, t-O:t] (wrapping into column 0) best matches a[:, 0:O] shifted
    # i.e. content a[:, t:] would be followed by a[:, 0:]: want a[:, t-O:t] ~ a[:, -O:0] (virtual) -> match start
    best = None
    for t in range(w - search, w + 1):
        e = ((a[:, t - O:t] - a[:, 0:O]) ** 2).mean()
        if best is None or e < best[0]:
            best = (e, t)
    e, t = best
    a = a.copy()
    d = tone_ramp(a, slice(t - O, t), slice(0, O))
    Rr = 300
    xl = np.arange(t)
    wl = np.clip(1 - (t - 1 - xl) / Rr, 0, 1)[None, :, None]
    xr = np.arange(t)
    wr = np.clip(1 - xr / Rr, 0, 1)[None, :, None]
    a[:, :t] += d[:, None, :] * 0.5 * wr - d[:, None, :] * 0.5 * wl
    head = quilt_join(a[:, t - O:t], a[:, 0:O])   # left of cut = tail content, right = head content
    tile = np.concatenate([head, a[:, O:t - O]], 1)
    return tile, (t, float(e))

def floor(k, rows='bottom', gutter=None, top=None):
    a = load(k)
    info = {}
    a = flatten_light(a)
    if gutter:
        a, info['gutter'] = remove_gutter(a, *gutter)
    a, info['wrap'] = make_wrap(a)
    w = a.shape[1]
    h = int(round(w / 3))
    if top is None:
        top = a.shape[0] - h if rows == 'bottom' else (a.shape[0] - h) // 2
    band = a[top:top + h]
    # exact wrap is preserved: resample three periods and keep the middle one (periodic boundary)
    ext = np.concatenate([band, band, band], 1)
    big = to_img(ext).resize((3 * FLOOR_W, FLOOR_H), Image.LANCZOS).crop((FLOOR_W, 0, 2 * FLOOR_W, FLOOR_H))
    info.update(width_before_scale=band.shape[1], height_before_scale=h, top=top)
    return big, info

def encode(im, name):
    """highest quality (<= 92) that fits TARGET_BYTES."""
    for q in range(92, 59, -2):
        b = io.BytesIO()
        if name.endswith('.jpg'):
            im.convert('RGB').save(b, 'JPEG', quality=q, optimize=True)
        else:
            im.convert('RGBA').save(b, 'WEBP', quality=q, method=6, alpha_quality=100)
        if b.tell() <= TARGET_BYTES:
            break
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(b.getvalue())
    return {'size': list(im.size), 'quality': q, 'bytes': b.tell()}

if __name__ == '__main__':
    log = {}
    log['bg3-far-day.jpg'] = encode(far('bg3-far-day'), 'bg3-far-day.jpg')
    log['bg3-far-night.jpg'] = encode(far('bg3-far-night'), 'bg3-far-night.jpg')
    log['bg3-mid.webp'] = encode(mid('bg3-mid', 277, 704), 'bg3-mid.webp')       # magenta strip below row 704
    log['bg3-mid2.webp'] = encode(shade_left(mid('bg3-mid2', 276, 703)), 'bg3-mid2.webp')   # follows mid3a
    im, info = floor('bg3-floor', gutter=(610, 670))                              # gutter at x ~615..668
    log['bg3-floor.jpg'] = {**encode(im, 'bg3-floor.jpg'), **info}
    im, info = floor('bg3-floor2', rows='middle')
    log['bg3-floor2.jpg'] = {**encode(im, 'bg3-floor2.jpg'), **info}
    im, info = floor('bg3-floor3', top=140)                                       # grass + curb at both edges
    log['bg3-floor3.jpg'] = {**encode(im, 'bg3-floor3.jpg'), **info}
    json.dump(log, sys.stdout, indent=1)
    print()
