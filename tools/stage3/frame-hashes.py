#!/usr/bin/env python3
"""
Precompute frame hashes and horizontally flipped frame hashes for character atlas frames.

This tool reads animation metadata and atlas files from assets/chars/ (Stages 1 and 2)
and assets/stage3/chars/ (Stage 3), extracts each packed sprite frame, and computes:
  1. sha256 of the frame's raw RGBA bytes
  2. sha256 of the frame's raw RGBA bytes after horizontal flipping (FLIP_LEFT_RIGHT)
It also records the sha256 hash of each color atlas page WebP.

IMPORTANT: This tool strictly reads art and atlas files; it never writes or modifies art.
Outputs JSON to stdout:
{
  "pages": { "<path>": "<sha256>" },
  "frames": [{ "char": str, "stage": 1|2|3, "page": str, "name": str, "hash": str, "flip": str }]
}
"""

import glob
import hashlib
import json
import os
import sys
from PIL import Image

STAGE_MAP = {
    'chief': 1,
    'grunt': 1,
    'hound': 1,
    'loial': 1,
    'riley': 1,
    'spear': 1,
    'archer': 2,
    'byar': 2,
    'zealot': 2,
    'cutthroat': 3,
    'fade': 3,
    'riley3': 3,
}

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    
    anims_patterns = [
        os.path.join(repo_root, 'assets', 'chars', '*.anims.json'),
        os.path.join(repo_root, 'assets', 'stage3', 'chars', '*.anims.json'),
    ]

    anims_files = []
    for pattern in anims_patterns:
        anims_files.extend(sorted(glob.glob(pattern)))

    pages = {}
    frames = []

    for anims_path in anims_files:
        with open(anims_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        char_key = meta.get('key') or os.path.basename(anims_path).replace('.anims.json', '')
        if char_key not in STAGE_MAP:
            sys.stderr.write(f"Error: unknown character {char_key} in {anims_path}\n")
            sys.exit(1)

        stage = STAGE_MAP[char_key]
        char_dir_rel = meta.get('dir') or 'assets/chars'
        char_dir_abs = os.path.join(repo_root, char_dir_rel)

        for page in meta.get('pages', []):
            page_webp_rel = f"{char_dir_rel}/{page}.webp"
            page_webp_abs = os.path.join(repo_root, page_webp_rel)
            page_json_rel = f"{char_dir_rel}/{page}.json"
            page_json_abs = os.path.join(repo_root, page_json_rel)

            with open(page_webp_abs, 'rb') as f:
                webp_bytes = f.read()
            pages[page_webp_rel] = hashlib.sha256(webp_bytes).hexdigest()

            with open(page_json_abs, 'r', encoding='utf-8') as f:
                atlas = json.load(f)

            with Image.open(page_webp_abs) as raw_img:
                img = raw_img.convert('RGBA')

                for frame_name, frame_entry in atlas.get('frames', {}).items():
                    if frame_entry.get('rotated', False):
                        sys.stderr.write(f"Error: frame {frame_name} on page {page} has rotated: true\n")
                        sys.exit(1)

                    rect = frame_entry['frame']
                    x, y, w, h = rect['x'], rect['y'], rect['w'], rect['h']
                    crop = img.crop((x, y, x + w, y + h))

                    rgba_bytes = crop.tobytes()
                    h_hash = hashlib.sha256(rgba_bytes).hexdigest()

                    flipped = crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                    flip_hash = hashlib.sha256(flipped.tobytes()).hexdigest()

                    frames.append({
                        'char': char_key,
                        'stage': stage,
                        'page': page,
                        'name': frame_name,
                        'hash': h_hash,
                        'flip': flip_hash,
                    })

    # Sort pages and frames stably
    sorted_pages = {k: pages[k] for k in sorted(pages.keys())}
    sorted_frames = sorted(frames, key=lambda f: (f['stage'], f['char'], f['page'], f['name']))

    output = {
        'pages': sorted_pages,
        'frames': sorted_frames,
    }

    json.dump(output, sys.stdout, indent=2)
    sys.stdout.write('\n')

if __name__ == '__main__':
    main()
