#!/usr/bin/env python3
"""Bake optional Wheel of Time story stills into assets/cutscenes/*.webp.

Usage: python3 tools/bake_story.py SOURCE_DIRECTORY
SOURCE_DIRECTORY contains 16:9 PNG files named for each entry below. Missing
runtime WebP files are expected and use the game's procedural scene instead.
"""
from pathlib import Path
import sys
from PIL import Image

SCENES = {
    'opening-01-winters-night': "Twinkle Toes completes a blue-costumed dance as a strange storm gathers.",
    'opening-02-capture': "Shadow agents surround the brave young dancer; adventurous, never frightening.",
    'opening-03-taim-order': "Mazrim Taim gives an order inside the severe Black Tower.",
    'opening-04-riley-vow': "Moiraine warns Riley as he fastens his black Asha'man coat.",
    'stage1-emonds-field': "Riley and Moiraine overlook a moonlit Winternight Trolloc attack.",
    'stage2-caemlyn': "An eyeless Myrddraal turns beneath a bright Caemlyn arch.",
    'stage3-shadar-logoth': "Riley crosses silver-fogged ruins while a Draghkar circles overhead.",
    'stage4-callandor-reveal': "Callandor shines as Twinkle Toes answers with a small lightning arc.",
    'stage5-black-tower-finale': "Riley and Twinkle Toes combine balefire and lightning against Taim.",
    'stage5-homecoming': "Riley, Twinkle Toes, Moiraine, and Loial celebrate safely together.",
}
SIZE = (1280, 720)

def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source = Path(sys.argv[1])
    target = Path(__file__).resolve().parents[1] / 'assets' / 'cutscenes'
    target.mkdir(parents=True, exist_ok=True)
    for name in SCENES:
        image = Image.open(source / f'{name}.png').convert('RGB')
        w, h = image.size
        crop_w = min(w, round(h * 16 / 9)); crop_h = round(crop_w * 9 / 16)
        image = image.crop(((w-crop_w)//2, (h-crop_h)//2, (w+crop_w)//2, (h+crop_h)//2))
        image.resize(SIZE, Image.Resampling.LANCZOS).save(target / f'{name}.webp', 'WEBP', quality=86, method=6)
        print(f'baked {name}: {SCENES[name]}')

if __name__ == '__main__':
    main()
