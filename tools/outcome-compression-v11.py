#!/usr/bin/env python3
"""Audit full-size outcome WebP against archived generated PNG masters.

Requires Pillow and NumPy. Does not modify artwork or weaken runtime acceptance
checks. Original masters deliberately live outside the published runtime tree.

python tools/outcome-compression-v11.py --masters ../riley-v11-original-outcomes \
  --render-dir /tmp/riley-outcome-compression --report /tmp/compression-check.json

The render directory contains lossless, native-pixel detail comparisons and
dark/light/checkerboard full-sprite compositions for actual visual inspection.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, features

ROOT = Path(__file__).resolve().parents[1]
CROPS = {
    'riley-victory-chieftain': [
        ('Blue glasses and face', (420, 35, 705, 295)),
        ('Raised fist and glove', (710, 155, 980, 420)),
        ('Lower hand and glove', (240, 555, 520, 830)),
        ('Coat and boot edge', (90, 1160, 430, 1450)),
    ],
    'riley-victory-draghkar': [
        ('Blue glasses and face', (460, 180, 735, 440)),
        ('Raised left fist', (235, 10, 475, 270)),
        ('Raised right fist', (790, 60, 1040, 325)),
        ('Boot contact edges', (440, 1210, 780, 1470)),
    ],
    'riley-victory-fade': [
        ('Glasses and adjusting fingers', (400, 20, 760, 310)),
        ('Resting hand and glove', (500, 365, 795, 620)),
        ('Coat-tail edge', (140, 700, 460, 990)),
        ('Boot contact edges', (685, 1200, 1035, 1470)),
    ],
    'riley-victory-forsaken': [
        ('Blue glasses and face', (380, 25, 690, 310)),
        ('Left hand on hip', (305, 510, 590, 800)),
        ('Right hand on hip', (595, 510, 880, 800)),
        ('Coat-tail edge', (140, 720, 470, 1010)),
    ],
    'riley-victory-taim': [
        ('Blue glasses and face', (480, 415, 765, 700)),
        ('Callandor grip and closed fingers', (150, 335, 440, 630)),
        ('Relaxed hand and fingers', (730, 855, 1010, 1145)),
        ('Callandor blade and alpha edge', (285, 0, 575, 295)),
    ],
    'boss-defeat-chieftain': [
        ('Face and helmet', (315, 185, 670, 485)),
        ('Left hand and axe collar', (55, 590, 405, 890)),
        ('Right hand and glove', (740, 555, 1090, 855)),
        ('Axe blade engraving and edge', (60, 730, 415, 1024)),
    ],
    'boss-defeat-draghkar': [
        ('Face and pointed ear', (130, 330, 480, 630)),
        ('Front claws', (275, 490, 625, 790)),
        ('Rear claws and wing joint', (795, 440, 1150, 740)),
        ('Fine wing membrane and tip', (1470, 485, 1825, 785)),
    ],
    'boss-defeat-fade': [
        ('Hood, face and left glove', (35, 350, 390, 650)),
        ('Right glove and fingers', (515, 395, 870, 695)),
        ('Released sword hilt', (150, 540, 505, 840)),
        ('Released sword tip and alpha', (770, 585, 1125, 885)),
    ],
    'boss-defeat-forsaken': [
        ('Face and beard', (485, 65, 840, 365)),
        ('Braced palm and coat edge', (20, 505, 375, 805)),
        ('Resting hand and fingers', (670, 420, 1025, 720)),
        ('Released sword hilt and blade', (395, 715, 750, 1015)),
    ],
    'boss-defeat-taim': [
        ('Face and hair detail', (265, 50, 620, 350)),
        ('Braced palm and fingers', (25, 680, 380, 980)),
        ('Resting hand and fingers', (710, 535, 1065, 835)),
        ('Fine gold embroidery and edge', (740, 55, 1095, 355)),
    ],
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def background(size, kind):
    if kind != 'checker':
        return Image.new('RGBA', size, kind)
    im = Image.new('RGBA', size, '#cdd2d5')
    draw = ImageDraw.Draw(im)
    for y in range(0, size[1], 18):
        for x in range(0, size[0], 18):
            if (x // 18 + y // 18) % 2:
                draw.rectangle((x, y, x + 17, y + 17), fill='#879198')
    return im


def composite(im, kind):
    bg = background(im.size, kind)
    bg.alpha_composite(im)
    return bg.convert('RGB')


def render(key, source, runtime, out):
    paths = []
    # Full-silhouette sheets preserve every part of the source rectangle.
    sheet = Image.new('RGB', (840, 1080), '#17242d')
    draw = ImageDraw.Draw(sheet)
    for row, bg in enumerate(['#142834', '#f4f4f1', 'checker']):
        for col, (label, im) in enumerate([('PNG master', source), ('WebP runtime', runtime)]):
            panel = composite(im, bg)
            panel.thumbnail((405, 325), Image.Resampling.LANCZOS)
            x = col * 420 + (420 - panel.width) // 2
            y = row * 360 + 28
            sheet.paste(panel, (x, y))
            draw.text((col * 420 + 8, row * 360 + 7), f'{key} | {label}', fill='white')
    path = out / f'{key}-surfaces.png'
    sheet.save(path)
    paths.append(path)
    # Native 1:1 crop pixels, with no resampling or added lossy compression.
    sheet = Image.new('RGB', (840, 4 * 335), '#17242d')
    draw = ImageDraw.Draw(sheet)
    for row, (label, box) in enumerate(CROPS[key]):
        for col, (version, im) in enumerate([('PNG master', source), ('WebP runtime', runtime)]):
            panel = composite(im.crop(box), 'checker')
            assert panel.width <= 405 and panel.height <= 305
            sheet.paste(panel, (col * 420 + 10, row * 335 + 28))
            draw.text((col * 420 + 8, row * 335 + 7), f'{label} | {version}', fill='white')
    path = out / f'{key}-details.png'
    sheet.save(path)
    paths.append(path)
    return [{'filename': p.name, 'sha256': digest(p)} for p in paths]


def audit(masters, render_dir=None):
    frames = json.loads((ROOT / 'assets/art/outcomes-v11/frames.json').read_text())
    assert len(frames) == 10
    records = []
    runtime_hashes, master_hashes = set(), set()
    for key, frame in frames.items():
        master_path = masters / f'{key}.png'
        runtime_path = ROOT / frame['file']
        assert digest(master_path) == frame['master']['sha256'], (key, 'master hash')
        assert master_path.stat().st_size == frame['master']['bytes'], (key, 'master bytes')
        assert digest(runtime_path) == frame['sha256'] == frame['runtime']['sha256'], (key, 'runtime hash')
        assert runtime_path.stat().st_size == frame['bytes'] == frame['runtime']['bytes'], (key, 'runtime bytes')
        assert frame['bytes'] < 330000, (key, 'runtime transport budget')
        source_image = Image.open(master_path)
        runtime_image = Image.open(runtime_path)
        assert source_image.format == 'PNG' and runtime_image.format == 'WEBP'
        assert source_image.mode == runtime_image.mode == 'RGBA'
        source, runtime = source_image.convert('RGBA'), runtime_image.convert('RGBA')
        assert list(source.size) == list(runtime.size) == frame['pixels'], (key, 'dimensions')
        a, b = np.asarray(source), np.asarray(runtime)
        assert np.array_equal(a[:, :, 3], b[:, :, 3]), (key, 'every alpha sample must match')
        alpha = a[:, :, 3]
        assert np.any(alpha == 0) and np.any(alpha > 0)
        nonzero_bbox = source.getchannel('A').getbbox()
        visible_bbox = source.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
        assert list(nonzero_bbox) == frame['alphaBoundsNonzero'], (key, 'nonzero bounds')
        x0, y0, x1, y1 = visible_bbox
        assert [x0, y0, x1 - x0, y1 - y0] == frame['visibleBoundsAlpha16'], (key, 'visible bounds')
        visible = alpha >= 16
        edge = (alpha > 0) & (alpha < 252)
        # RGB differences under fully transparent pixels are invisible and are
        # intentionally excluded. Alpha equality covers them independently.
        delta = (a[:, :, :3].astype(np.float64) - b[:, :, :3]) * (alpha[:, :, None] / 255.0)
        diff = np.abs(delta)
        mse = float(np.mean(delta[visible] ** 2))
        record = {
            'key': key,
            'masterBytes': master_path.stat().st_size,
            'runtimeBytes': runtime_path.stat().st_size,
            'base64Bytes': 4 * math.ceil(runtime_path.stat().st_size / 3),
            'masterSha256': digest(master_path),
            'runtimeSha256': digest(runtime_path),
            'pixels': list(source.size),
            'runtimeQuality': frame['runtime']['quality'],
            'alphaPixelsCompared': int(alpha.size),
            'alphaMismatchPixels': 0,
            'partiallyTransparentPixelsCompared': int(np.count_nonzero((alpha > 0) & (alpha < 255))),
            'alphaBoundsUnchanged': True,
            'visibleBoundsUnchanged': True,
            'visibleCompositedRGBMeanAbsoluteError255': round(float(np.mean(diff[visible])), 5),
            'visibleCompositedRGB99PercentileError255': round(float(np.percentile(diff[visible], 99)), 5),
            'visibleCompositedRGBPSNRdB': round(10 * math.log10(255 ** 2 / mse), 5),
            'edgeCompositedRGBMeanAbsoluteError255': round(float(np.mean(diff[edge])), 5),
            'edgeCompositedRGB99PercentileError255': round(float(np.percentile(diff[edge], 99)), 5),
            'detailCropsNativePixels': [{'label': label, 'boxLTRB': list(box)} for label, box in CROPS[key]],
        }
        if render_dir:
            record['renderedComparisons'] = render(key, source, runtime, render_dir)
        runtime_hashes.add(record['runtimeSha256'])
        master_hashes.add(record['masterSha256'])
        records.append(record)
    assert len(runtime_hashes) == len(master_hashes) == 10, 'All authored poses must remain unique'
    preserved = json.loads((ROOT / 'docs/review/v11/outcome-art-check.json').read_text())['preservedBackgrounds']
    for row in preserved:
        assert digest(ROOT / row['file']) == row['sha256'], ('legacy background changed', row['file'])
    return {
        'dateUTC': '2026-09-30',
        'kind': 'Full-dimension lossy RGB / lossless exact alpha transport audit',
        'encoder': {'pillow': Image.__version__, 'libwebp': features.version_module('webp')},
        'masterBytes': sum(r['masterBytes'] for r in records),
        'runtimeBytes': sum(r['runtimeBytes'] for r in records),
        'maxRuntimeBytes': max(r['runtimeBytes'] for r in records),
        'maxBase64Bytes': max(r['base64Bytes'] for r in records),
        'alphaPixelsCompared': sum(r['alphaPixelsCompared'] for r in records),
        'alphaMismatchPixels': 0,
        'legacyBackgroundHashChecksPassed': True,
        'visualInspection': 'Generated comparisons require actual inspection; numerical audit does not claim visual approval',
        'images': records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--masters', type=Path, required=True)
    parser.add_argument('--render-dir', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.render_dir:
        args.render_dir.mkdir(parents=True, exist_ok=True)
    result = audit(args.masters, args.render_dir)
    if args.report:
        args.report.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'images'}, indent=2))


if __name__ == '__main__':
    main()
