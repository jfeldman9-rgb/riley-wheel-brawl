"""Stage 5-only lighting maps; colour/atlas/animation files remain byte-identical.
Run from the worktree: python3 tools/stage5/compact_normals.py
Normals are smooth lighting fields. A third of the original normal resolution
keeps both facing directions while reserving space for Phaser's render targets.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/stage5/normals'
OUT.mkdir(parents=True, exist_ok=True)
for key in ['riley', 'riley3', 'grunt', 'spear', 'hound', 'loial']:
    directory = 'assets/stage3/chars' if key == 'riley3' else 'assets/chars'
    meta = json.loads((ROOT / directory / (key + '.anims.json')).read_text())
    for page in meta['pages']:
        for suffix in ['_n', '_nl']:
            name = page + suffix + '.webp'
            with Image.open(ROOT / directory / name) as image:
                size = tuple((n + 2) // 3 for n in image.size)
                image.convert('RGBA').resize(size, Image.Resampling.LANCZOS).save(OUT / name, lossless=True, method=6)
                print(name, image.size, '->', size)
