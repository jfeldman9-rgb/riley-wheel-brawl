"""Palette/region recolour helpers for the Stage 3 character reskins (see reskin_chars.py).

Every transform works on straight-alpha RGBA uint8 arrays and keeps the painted luminance
structure (folds, rims, specular) of the source frame; only hue/chroma and the tone range
of each material class change. Classes are soft weights so material edges blend.
"""
import numpy as np
import cv2
from scipy import ndimage as ndi


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def to_lab(rgb):
    return cv2.cvtColor(rgb.astype(np.float32) / 255.0, cv2.COLOR_RGB2LAB)


def from_lab(lab):
    return np.clip(cv2.cvtColor(lab.astype(np.float32), cv2.COLOR_LAB2RGB) * 255.0 + 0.5, 0, 255).astype(np.uint8)


def features(rgba):
    lab = to_lab(rgba[..., :3])
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    h = (np.degrees(np.arctan2(b, a)) + 360) % 360
    # fine texture (chain mail): high-pass magnitude of L, pooled
    hp = np.abs(L - cv2.GaussianBlur(L, (0, 0), 1.2))
    tex = cv2.GaussianBlur(hp, (0, 0), 2.5)
    return lab, L, a, b, C, h, tex


def classes(rgba):
    """Soft material weights measured on the Whitecloak sheets (CIE Lab, L 0-100):
    cream cloth C 8-17 h 65-83; plate steel C 6-11 h 33-66; mail L<40 C<7 with a fine checker;
    leather L<50 C 9-29 h 44-65; dirty hems C 18-32; gold C 20-56 h 69-84; skin C 38-53 h 48-56."""
    lab, L, a, b, C, h, tex = features(rgba)
    alpha = rgba[..., 3]
    yellow = smooth(h, 62, 68)
    gold = smooth(C, 20, 26) * yellow * smooth(L, 42, 50)
    skin_like = smooth(C, 30, 36) * (1 - smooth(h, 58, 64)) * smooth(L, 36, 44)
    face = face_mask(skin_like, alpha).astype(np.float32)
    face = np.clip(cv2.GaussianBlur(face, (0, 0), 0.8) * 1.4, 0, 1)
    brown = smooth(C, 10, 15) * (1 - yellow) + smooth(C, 19, 24) * yellow
    leather = np.clip(brown - gold - face, 0, 1)
    neutral = np.clip(1 - brown, 0, 1) * (1 - face)
    # chain mail: a dark neutral patch with a fine checker. Open the raw mask so outlines and plate seams drop out.
    inner = ndi.distance_transform_edt(alpha > 128) > 3
    raw = (neutral > 0.5) & (tex > 3.0) & (L < 44) & (C < 9) & inner
    raw = ndi.binary_opening(raw, structure=np.ones((3, 3)), iterations=1)
    raw = ndi.binary_closing(raw, structure=np.ones((3, 3)), iterations=2) & inner
    raw = ndi.binary_opening(raw, structure=np.ones((5, 5)), iterations=1)
    mail = np.minimum(cv2.GaussianBlur(raw.astype(np.float32), (0, 0), 1.0), neutral)
    cloth = np.clip(neutral - mail, 0, 1)
    return dict(lab=lab, L=L, a=a, b=b, C=C, h=h, tex=tex, gold=gold, skin=face, face=face, leather=leather, cloth=cloth, mail=mail)


def tone(L, lo_in, hi_in, lo_out, hi_out, gamma=1.0):
    t = np.clip((L - lo_in) / (hi_in - lo_in), 0, 1) ** gamma
    return lo_out + t * (hi_out - lo_out)


def lab_color(Lnew, hue_deg, chroma):
    r = np.radians(hue_deg)
    return np.stack([Lnew, chroma * np.cos(r) * np.ones_like(Lnew), chroma * np.sin(r) * np.ones_like(Lnew)], -1)


def blend(parts):
    out = None; wsum = None
    for w, lab in parts:
        w3 = w[..., None]
        out = lab * w3 if out is None else out + lab * w3
        wsum = w if wsum is None else wsum + w
    return out / np.maximum(wsum, 1e-6)[..., None]


def hood_mask(face, alpha):
    """Helmet/coif pixels: everything around and above the face blob (the zealot's helmet becomes a hood)."""
    ys, xs = np.where(face > 0.5)
    if len(ys) < 20:
        return np.zeros(face.shape, np.float32)
    cy, cx = ys.mean(), xs.mean()
    s = max(np.ptp(ys), np.ptp(xs), 12)
    yy, xx = np.mgrid[:face.shape[0], :face.shape[1]]
    d = np.hypot((yy - cy) / 1.0, (xx - cx) / 1.15)
    m = (d < 1.25 * s) & (yy < ys.max() + 0.15 * s) & (alpha > 0)
    m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.5)
    return np.clip(m - face, 0, 1)


def recolor_cutthroat(rgba):
    k = classes(rgba)
    L = k['L']
    hood = hood_mask(k['face'], rgba[..., 3])
    for n in ('cloth', 'mail', 'leather', 'gold'):
        k[n] = k[n] * (1 - hood)
    # charcoal hooded cloak / hood / leggings (white cloth and plate both read as cloth after the remap)
    cloth = lab_color(tone(L, 18, 99, 6, 38, 1.15), 60, 2.5)
    # oxblood shirt where the source had chain mail sleeves
    mail = lab_color(tone(L, 10, 70, 10, 40), 28, 26)
    # brown jerkin leather (belts, gloves, boots): warmer and a touch darker
    leather = np.stack([tone(L, 0, 80, 2, 62), k['a'] * 1.05 + 1.5, k['b'] * 0.95], -1)
    # tarnished copper buttons/emblems instead of Whitecloak gold
    gold = lab_color(tone(L, 30, 95, 18, 52), 50, 20)
    skin = k['lab']
    hoodc = lab_color(tone(L, 10, 99, 6, 34, 1.0), 60, 2.0)
    out = blend([(k['cloth'], cloth), (k['mail'], mail), (k['leather'], leather), (k['gold'], gold), (k['skin'], skin), (hood, hoodc)])
    res = rgba.copy(); res[..., :3] = from_lab(out)
    return res


def face_mask(skin_w, alpha, frac=0.42):
    """The face is the largest skin blob in the top part of the figure; eyes/brows are its holes."""
    m = (skin_w > 0.5) & (alpha > 128)
    ys = np.where(alpha.max(1) > 128)[0]
    if not len(ys):
        return np.zeros_like(m)
    top, bot = ys[0], ys[-1]
    lab, n = ndi.label(m)
    best, bi = 0, 0
    for i in range(1, n + 1):
        yy, xx = np.where(lab == i)
        if len(yy) < 40: continue
        cy = yy.mean()
        if cy - top > frac * (bot - top) and n > 1: continue
        if len(yy) > best: best, bi = len(yy), i
    if not bi:
        return np.zeros_like(m)
    face = lab == bi
    closed = ndi.binary_closing(face, structure=np.ones((5, 5)), iterations=2)
    filled = ndi.binary_fill_holes(closed)
    return filled & (alpha > 128)


def recolor_fade(rgba, k=None):
    k = k or classes(rgba)
    L = k['L']; face = k['face']
    # long black cloak and black armour: everything neutral collapses to a cool black, specular stays as a dull sheen
    cloth = lab_color(tone(L, 15, 99, 3, 30, 1.25), 255, 3.5)
    mail = lab_color(tone(L, 10, 75, 3, 22), 255, 2.5)
    leather = lab_color(tone(L, 0, 80, 2, 16), 40, 2.0)
    gold = lab_color(tone(L, 30, 95, 6, 26), 250, 2.0)
    # pale, bloodless grey skin; the face is smoothed so it reads eyeless
    Ls = cv2.GaussianBlur(L, (0, 0), 2.2)
    pale = lab_color(tone(L, 25, 90, 52, 86), 150, 3.0)
    pale_face = lab_color(tone(0.5 * L + 0.5 * np.maximum(Ls, L), 25, 90, 60, 86), 150, 3.0)
    skin = pale
    out = blend([(k['cloth'], cloth), (k['mail'], mail), (k['leather'], leather), (k['gold'], gold), (k['skin'], skin)])
    out = out * (1 - face[..., None]) + pale_face * face[..., None]
    res = rgba.copy(); res[..., :3] = from_lab(out)
    return res


def recolor_fade_portrait(rgba):
    """The Byar HUD portrait as the Myrddraal: the sprite recolour plus, at portrait scale, the eyes and
    brows painted out of the pale face (inpainted from the surrounding skin) and a softer face edge."""
    k = classes(rgba)
    L = k['L']
    face = ndi.binary_closing(k['face'] > 0.5, structure=np.ones((9, 9)), iterations=3)
    face = ndi.binary_fill_holes(face)
    ys, xs = np.where(face)
    if len(ys) < 50:
        return recolor_fade(rgba, k)
    fs = np.clip(cv2.GaussianBlur(face.astype(np.float32), (0, 0), 2.5) * 1.3, 0, 1)
    k['leather'] = np.clip(k['leather'] * (1 - fs), 0, 1); k['cloth'] = k['cloth'] * (1 - fs); k['mail'] = k['mail'] * (1 - fs)
    k['face'] = k['skin'] = fs
    out = recolor_fade(rgba, k)
    y0, y1 = ys.min(), ys.max()
    Ls = cv2.GaussianBlur(L, (0, 0), 6)
    band = np.zeros_like(face); band[y0 + int(0.12 * (y1 - y0)): y0 + int(0.5 * (y1 - y0))] = True
    holes = face & band & (L < Ls - 6)
    holes = ndi.binary_dilation(holes, iterations=3) & face
    rgb = np.ascontiguousarray(out[..., :3])
    rgb = cv2.inpaint(rgb, holes.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
    soft = cv2.GaussianBlur(rgb, (0, 0), 2.0)
    inner = cv2.GaussianBlur(ndi.binary_erosion(face, iterations=4).astype(np.float32), (0, 0), 3)[..., None] * 0.6
    res = out.copy()
    res[..., :3] = np.clip(rgb * (1 - inner) + soft * inner, 0, 255).astype(np.uint8)
    return res
