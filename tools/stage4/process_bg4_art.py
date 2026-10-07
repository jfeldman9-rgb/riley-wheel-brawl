#!/usr/bin/env python3
"""Post-process the Stage 4 painted backdrop and story panels from art-in/ into assets/.

Sources (Grok Bot image generation, 2026-10-07, approved by the owner), kept verbatim:
  art-in/bg4/<plate>.src.jpg      1280x720   bg4-far, bg4-mid, bg4-mid2, bg4-floor, bg4-floor2, bg4-floor3
  art-in/story4/story4_panel_N.src.jpg   1280x720

  far   (bg4far): rows 0..602 at native pixels -> 1280x602. Shown fixed (scroll 0) at 1:1, the same box the
        procedural far filled (VW x LANE_TOP+30). The rubble strip below row ~585 sits under the floor.
  mid   (bg4mid, bg4mid2): the magenta sky (and the arch opening) keyed to real alpha with the Stage 3 keyer
        (big connected key regions, soft 4 px edge band, colour unmix + despill), native pixels, cropped to the
        architecture: bg4-mid rows 170..672 (1280x502), bg4-mid2 rows 110..698 (1280x588; the magenta strip
        under its ground is dropped). bg4-mid's right 140 px fade out so it can overlap bg4-mid2 without a cut.
  floor (bg4floor/2/3): horizontal light flattening, seamless horizontal wrap (min-error seam + tone ramp),
        the bottom 3:1 band (largest stones), periodic Lanczos resample to 1080x360.
  story (story4p1..3): native 1280x720, re-encoded with story_panel_1.jpg's quantisation tables, 4:2:0.

No normal maps: the procedural textures these replace had none either, and Light2D lights them with the
default flat normal. Mid and floor plates stay below 2172x724 to keep Stage 4's decoded size down.

Usage: python3 tools/stage4/process_bg4_art.py   (needs numpy, opencv-python, Pillow)
"""
import importlib.util, io, json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
spec = importlib.util.spec_from_file_location('bg3', os.path.join(ROOT, 'tools', 'stage3', 'process_bg3_plates.py'))
bg3 = importlib.util.module_from_spec(spec); spec.loader.exec_module(bg3)
bg3.SRC = os.path.join(ROOT, 'art-in', 'bg4', '{}.src.jpg')
bg3.OUT = OUT = os.path.join(ROOT, 'assets', 'bg4')
FLOOR_W, FLOOR_H = bg3.FLOOR_W, bg3.FLOOR_H

def far(k, h=602):
    return bg3.to_img(bg3.load(k)[:h])

def key_all(k, top, bottom, min_area=3):
    """bg3.key_mid with a smaller component floor: Stage 4 has no painted magenta, so every pocket of key
    colour (windows, holes in the towers, gaps under the arch and round the fountain) is sky and goes clear."""
    cc = bg3.cv2.connectedComponentsWithStats
    def small_ok(img, conn):
        n, lab, stats, cen = cc(img, conn)
        stats = stats.copy()
        big = stats[:, bg3.cv2.CC_STAT_AREA] >= min_area
        stats[1:, bg3.cv2.CC_STAT_AREA] = np.where(big[1:], 60, 0)
        return n, lab, stats, cen
    bg3.cv2.connectedComponentsWithStats = small_ok
    try:
        return bg3.key_mid(k, top, bottom)
    finally:
        bg3.cv2.connectedComponentsWithStats = cc

def mid(k, top, bottom, fade_right=0):
    rgb, alpha = key_all(k, top, bottom)
    # leftover key tint inside windows and arches (no painted magenta here): pull strong magenta back to grey-blue
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    ex = np.maximum(np.minimum(R, B) - G - 45, 0)
    rgb = np.stack([R - ex, G, B - ex * 0.6], -1)
    if fade_right:
        t = np.clip(np.arange(fade_right)[::-1] / (fade_right - 1), 0, 1)      # 1 at the inner edge, 0 at the plate edge
        alpha[:, -fade_right:] *= (t * t * (3 - 2 * t))[None, :]
    return bg3.to_img(np.dstack([rgb, alpha * 255]), 'RGBA')

def floor(k):
    im, info = bg3.floor(k)
    return im, info

def story(n):
    qt = Image.open(os.path.join(ROOT, 'assets', 'story', 'story_panel_1.jpg')).quantization
    src = os.path.join(ROOT, 'art-in', 'story4', f'story4_panel_{n}.src.jpg')
    out = os.path.join(ROOT, 'assets', 'story', f'story4_panel_{n}.jpg')
    im = Image.open(src).convert('RGB'); assert im.size == (1280, 720)
    im.save(out, 'JPEG', qtables=qt, subsampling=2, optimize=True)
    return {'size': list(im.size), 'bytes': os.path.getsize(out)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    log = {}
    log['bg4-far.jpg'] = bg3.encode(far('bg4-far'), 'bg4-far.jpg')
    log['bg4-mid.webp'] = bg3.encode(mid('bg4-mid', 170, 672, fade_right=140), 'bg4-mid.webp')
    log['bg4-mid2.webp'] = bg3.encode(mid('bg4-mid2', 110, 698), 'bg4-mid2.webp')
    for n in ('', '2', '3'):
        im, info = floor(f'bg4-floor{n}')
        log[f'bg4-floor{n}.jpg'] = {**bg3.encode(im, f'bg4-floor{n}.jpg'), **info}
    for n in (1, 2, 3):
        log[f'story4_panel_{n}.jpg'] = story(n)
    json.dump(log, sys.stdout, indent=1)
    print()
