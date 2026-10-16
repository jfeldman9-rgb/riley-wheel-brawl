#!/usr/bin/env python3
"""Write clearly labelled Stage 4 placeholder PNGs from tools/stage4/art-manifest.json.

These are not art. Each file is a flat card at the final pixel size. Multi-frame sheets
draw one labelled cell per frame. The same pixels, and therefore the same bytes, are
written on every run. Default output is a directory you pass in; nothing under assets/
is touched.

usage: python3 tools/stage4/make_placeholders.py OUT_DIR
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'tools' / 'stage4' / 'art-manifest.json'
FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

GROUP_COLOR = {
    'backdrop': (186, 196, 168),
    'prop': (196, 176, 140),
    'fx': (120, 210, 150),
    'cultist': (210, 150, 120),
    'draghkar': (186, 170, 214),
    'riley': (140, 176, 220),
    'story': (210, 206, 186),
}

def font(size):
    return ImageFont.truetype(FONT_PATH, size)

def wrap(draw, text, fnt, width):
    words = text.split()
    lines, cur = [], ''
    for word in words:
        trial = word if not cur else cur + ' ' + word
        if draw.textlength(trial, font=fnt) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines

def draw_cell(draw, box, lines, color):
    x0, y0, x1, y1 = box
    draw.rectangle([x0 + 2, y0 + 2, x1 - 3, y1 - 3], outline=color, width=max(2, min(x1 - x0, y1 - y0) // 48))
    # A short dashed cross so a cell is obvious even at a glance.
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    draw.line([(x0 + 8, cy), (x1 - 8, cy)], fill=color, width=1)
    draw.line([(cx, y0 + 8), (cx, y1 - 8)], fill=color, width=1)
    size = max(11, min(x1 - x0, y1 - y0) // 11)
    while size >= 11:
        fnt = font(size)
        wrapped = []
        for line in lines:
            wrapped.extend(wrap(draw, line, fnt, (x1 - x0) - 16))
        heights = [fnt.getbbox(t)[3] - fnt.getbbox(t)[1] + 3 for t in wrapped]
        if sum(heights) <= (y1 - y0) - 16:
            break
        size -= 2
    fnt = font(size)
    wrapped = []
    for line in lines:
        wrapped.extend(wrap(draw, line, fnt, (x1 - x0) - 16))
    heights = [fnt.getbbox(t)[3] - fnt.getbbox(t)[1] + 3 for t in wrapped]
    y = y0 + ((y1 - y0) - sum(heights)) / 2
    for text, h in zip(wrapped, heights):
        w = draw.textlength(text, font=fnt)
        draw.text((x0 + (x1 - x0 - w) / 2, y), text, font=fnt, fill=color)
        y += h

def placeholder(it, out_dir):
    w, h = it['width'], it['height']
    cols, rows = it['cols'], it['rows']
    frames = it['frames']
    color = (150, 170, 230) if it['normal'] else GROUP_COLOR.get(it['group'], (200, 200, 200))
    mode = 'RGB' if it['opaque'] or it['normal'] else 'RGBA'
    bg = (28, 30, 36) if mode == 'RGB' else (0, 0, 0, 0)
    image = Image.new(mode, (w, h), bg)
    draw = ImageDraw.Draw(image)
    fw, fh = w // cols, h // rows
    ink = color if mode == 'RGB' else color + (255,)
    for i in range(frames):
        x0 = (i % cols) * fw
        y0 = (i // cols) * fh
        if mode == 'RGBA':
            draw.rectangle([x0, y0, x0 + fw - 1, y0 + fh - 1], fill=(18, 22, 28, 180))
        label = [
            'PLACEHOLDER',
            it['id'],
            f"{w}x{h}",
            f'frame {i + 1}/{frames}' if frames > 1 else '1 frame',
        ]
        if it['normal']:
            label.insert(1, 'NORMAL MAP')
        if it.get('poses') and i < len(it['poses']):
            label.append(it['poses'][i])
        draw_cell(draw, (x0, y0, x0 + fw - 1, y0 + fh - 1), label, ink)
    path = Path(out_dir) / it['file']
    image.save(path, 'PNG', optimize=False, compress_level=9)
    return path

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: make_placeholders.py OUT_DIR')
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    for it in manifest['items']:
        placeholder(it, out)
    print(len(manifest['items']), 'placeholders')

if __name__ == '__main__':
    main()
