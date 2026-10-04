#!/usr/bin/env python3
"""Write the clearly-labelled PLACEHOLDER files for Stage 3 art (see docs/stage3/PLAN.md §4).

These are not art: each is a flat card at the final pixel size and frame layout with the asset name, size and frame
numbers written on it, so painted files can replace them one-for-one without code changes. Re-run only to restore a
placeholder:  python3 tools/stage3/make_placeholders.py
"""
import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MANIFEST_PATH = REPO_ROOT / 'tools' / 'stage3' / 'art-manifest.json'
PLAN_PATH = REPO_ROOT / 'docs' / 'stage3' / 'PLAN.md'

if not MANIFEST_PATH.exists():
    sys.exit(f"Manifest missing: {MANIFEST_PATH}")

with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
    MANIFEST = json.load(f)

FONT_PATH = MANIFEST.get('font', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
if not os.path.exists(FONT_PATH):
    sys.exit(f"Font missing: {FONT_PATH}")

font = lambda n: ImageFont.truetype(FONT_PATH, n)

def R(v):
    return int(v + 0.5)

def dashed(d, box, col, w=2, dash=6):
    x0, y0, x1, y1 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
    for x in range(x0, x1, dash * 2):
        d.line([(x, y0), (min(x + dash, x1), y0)], fill=col, width=w)
        d.line([(x, y1), (min(x + dash, x1), y1)], fill=col, width=w)
    for y in range(y0, y1, dash * 2):
        d.line([(x0, y), (x0, min(y + dash, y1))], fill=col, width=w)
        d.line([(x1, y), (x1, min(y + dash, y1))], fill=col, width=w)

def centred(d, cx, cy, lines, sizes, col):
    hs = [font(s).getbbox(t)[3] - font(s).getbbox(t)[1] + max(2, s // 4) for t, s in zip(lines, sizes)]
    y = cy - sum(hs) / 2
    for t, s, h in zip(lines, sizes, hs):
        f = font(s)
        w = f.getlength(t)
        d.text((cx - w / 2, y), t, font=f, fill=col)
        y += h

def parse_prompts_from_plan():
    if not PLAN_PATH.exists():
        sys.exit(f"PLAN.md missing: {PLAN_PATH}")
    content = PLAN_PATH.read_text(encoding='utf-8')
    sec_match = re.search(r'### 4\.2 Ready-to-paste prompts\s*\n(.*?)\n---', content, re.DOTALL)
    if not sec_match:
        sys.exit("Could not locate §4.2 Ready-to-paste prompts in PLAN.md")
    sec_text = sec_match.group(1)

    pattern = re.compile(r'####\s+((?:`[^`]+`(?:\s*/\s*)?)+)[^\n]*\n\s*```[^\n]*\n(.*?)```', re.DOTALL)
    prompts_by_id = {}
    for ids_raw, block_text in pattern.findall(sec_text):
        ids = [i.strip('` ') for i in ids_raw.split('/')]
        if 'bg3-floor' in ids:
            lines = [l for l in block_text.splitlines() if l.strip()]
            common_lines = [l for l in lines if not l.startswith('[')]
            for fid in ['bg3-floor', 'bg3-floor2', 'bg3-floor3']:
                spec_line = [l[len(f"[{fid}]"):].strip() for l in lines if l.startswith(f"[{fid}]")]
                if not spec_line:
                    sys.exit(f"Missing specific floor line for [{fid}] in PLAN.md")
                full_lines = common_lines + spec_line
                prompts_by_id[fid] = '\n'.join(full_lines)
        else:
            prompt_text = block_text.strip()
            for pid in ids:
                prompts_by_id[pid] = prompt_text

    for pid in MANIFEST['prompts']:
        if pid not in prompts_by_id:
            sys.exit(f"Prompt id '{pid}' not found in PLAN.md §4.2")

    return prompts_by_id

def generate_placeholders(out_dir: Path):
    non_placeholder_entries = {}
    status_path = out_dir / 'assets' / 'stage3' / 'ART_STATUS.json'
    if out_dir.resolve() == REPO_ROOT.resolve() and status_path.exists():
        try:
            with open(status_path, 'r', encoding='utf-8') as f:
                prev_status = json.load(f)
            for entry in prev_status.get('entries', []):
                if not entry.get('placeholder', True):
                    non_placeholder_entries[entry['id']] = entry
        except Exception:
            pass

    gap = MANIFEST.get('gap', 2)
    prompts_text = parse_prompts_from_plan()

    # 1. Characters
    for c in MANIFEST['chars']:
        key = c['key']
        prefix = c['prefix']
        canvas = c['canvas']
        baseline = c['baseline']
        scale = c['scale']
        anchorX = c['anchorX']
        silhouette = c['silhouette']
        native = c['native']
        char_dir = out_dir / c['dir']
        char_dir.mkdir(parents=True, exist_ok=True)

        fw = R(canvas[0] * scale)
        fh = R(canvas[1] * scale)
        sw = R(silhouette[0] * scale)
        sh = R(silhouette[1] * scale)
        anchor_x = R(anchorX * fw)
        by = R(baseline * scale)

        pages_dict = {}
        for sheet in c['sheets']:
            p = sheet['page']
            if p not in pages_dict:
                pages_dict[p] = []
            pages_dict[p].append(sheet)

        unique_pages = sorted(pages_dict.keys())

        for p in unique_pages:
            page_name = f"{key}-{p}"
            page_webp = char_dir / f"{page_name}.webp"
            page_n_webp = char_dir / f"{page_name}_n.webp"
            page_nl_webp = char_dir / f"{page_name}_nl.webp"
            page_json_path = char_dir / f"{page_name}.json"

            sheets_on_page = pages_dict[p]
            skip_page = all(s['id'] in non_placeholder_entries for s in sheets_on_page)

            page_frames = []
            for sheet in sheets_on_page:
                for anim_name, holds, loop in sheet['anims']:
                    for frame_idx, hold in enumerate(holds):
                        page_frames.append({
                            'name': f"{key}_{anim_name}_{frame_idx:02d}",
                            'anim_name': anim_name,
                            'frame_idx': frame_idx,
                            'hold': hold,
                            'sheet_id': sheet['id'],
                        })

            n = len(page_frames)
            cols = min(n, (4096 + gap) // (fw + gap))
            rows = (n + cols - 1) // cols
            W = cols * (fw + gap) - gap
            H = rows * (fh + gap) - gap

            if not (W <= 4096 and H <= 4096):
                sys.exit(f"Atlas page {page_name} exceeded 4096: {W}x{H}")

            if not skip_page:
                im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                d = ImageDraw.Draw(im)

                frames_json = {}

                for i, finfo in enumerate(page_frames):
                    col = i % cols
                    row = i // cols
                    fx = col * (fw + gap)
                    fy = row * (fh + gap)

                    box_x0 = fx + anchor_x - sw // 2
                    box_x1 = box_x0 + sw
                    box_y1 = fy + by
                    box_y0 = box_y1 - sh

                    d.rectangle([box_x0, box_y0, box_x1, box_y1], fill=(110, 110, 124, 170))
                    dashed(d, (box_x0, box_y0, box_x1, box_y1), (235, 235, 245), w=2, dash=6)

                    d.line([(fx, fy + by), (fx + fw, fy + by)], fill=(255, 90, 90), width=2)
                    d.line([(fx + anchor_x, fy), (fx + anchor_x, fy + fh)], fill=(255, 90, 90), width=1)

                    arrow_y = fy + by - 14
                    ax = fx + anchor_x
                    if native == -1:
                        d.line([(ax - 20, arrow_y), (ax + 20, arrow_y)], fill=(255, 90, 90), width=2)
                        d.polygon([(ax - 25, arrow_y), (ax - 15, arrow_y - 5), (ax - 15, arrow_y + 5)], fill=(255, 90, 90))
                    else:
                        d.line([(ax - 20, arrow_y), (ax + 20, arrow_y)], fill=(255, 90, 90), width=2)
                        d.polygon([(ax + 25, arrow_y), (ax + 15, arrow_y - 5), (ax + 15, arrow_y + 5)], fill=(255, 90, 90))

                    lines = ["PLACEHOLDER", f"{key}_{finfo['anim_name']}", f"{finfo['frame_idx']:02d}  {finfo['hold']} ms"]
                    target_w = sw - 8
                    sz = 16
                    while sz > 8:
                        f_test = font(sz)
                        if max(f_test.getlength(l) for l in lines) <= target_w:
                            break
                        sz -= 1

                    cx = (box_x0 + box_x1) / 2
                    cy = (box_y0 + box_y1) / 2
                    centred(d, cx, cy, lines, [sz, sz, sz], col=(235, 235, 245))

                    frames_json[finfo['name']] = {
                        "frame": {"x": fx, "y": fy, "w": fw, "h": fh},
                        "rotated": False,
                        "trimmed": False,
                        "spriteSourceSize": {"x": 0, "y": 0, "w": fw, "h": fh},
                        "sourceSize": {"w": fw, "h": fh}
                    }

                im.save(page_webp, 'WEBP', lossless=True, quality=0, method=0)

                im_n = Image.new('RGB', (W, H), (128, 128, 255))
                im_n.save(page_n_webp, 'WEBP', lossless=True, quality=0, method=0)

                im_nl = Image.new('RGB', (W, H), (127, 128, 255))
                im_nl.save(page_nl_webp, 'WEBP', lossless=True, quality=0, method=0)

                page_data = {
                    "frames": frames_json,
                    "meta": {
                        "image": f"{page_name}.webp",
                        "size": {"w": W, "h": H},
                        "scale": 1
                    }
                }
                with open(page_json_path, 'w', encoding='utf-8') as f:
                    f.write(json.dumps(page_data, separators=(', ', ': ')) + '\n')

        # anims.json
        anims_list = []
        for sheet in c['sheets']:
            p_idx = sheet['page']
            for anim_name, holds, loop in sheet['anims']:
                full_anim_name = f"{prefix}{anim_name}"
                frame_names = [f"{key}_{anim_name}_{idx:02d}" for idx in range(len(holds))]
                page_indices = [p_idx] * len(holds)
                anims_list.append({
                    "name": full_anim_name,
                    "frames": frame_names,
                    "holds": holds,
                    "loop": loop,
                    "pages": page_indices
                })

        anims_data = {
            "key": key,
            "canvas": canvas,
            "baseline": baseline,
            "scale": scale,
            "pages": [f"{key}-{p}" for p in unique_pages],
            "placeholder": True,
            "dir": c['dir'],
            "anims": anims_list
        }
        anims_path = char_dir / f"{key}.anims.json"
        with open(anims_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(anims_data, indent=1, ensure_ascii=False) + '\n')

    # 2. Images
    for img in MANIFEST['images']:
        img_id = img['id']
        if img_id in non_placeholder_entries:
            continue

        kind = img['kind']
        w, h = img['size']
        file_path = out_dir / img['file']
        file_path.parent.mkdir(parents=True, exist_ok=True)

        if kind in ('far', 'panel'):
            im = Image.new('RGB', (w, h), (24, 26, 34))
            d = ImageDraw.Draw(im)
            dashed(d, (2, 2, w - 3, h - 3), (235, 235, 245), w=2, dash=6)
            caption = img.get('caption', img_id)
            lines = ["PLACEHOLDER PAINTING", f"{Path(img['file']).name}  {w}x{h}", caption]
            sizes = [44, 26, 24] if w >= 1200 else [24, 18, 16]
            centred(d, w / 2, h / 2, lines, sizes, (235, 235, 245))
            im.save(file_path, 'JPEG', quality=80, optimize=False)

        elif kind == 'mid':
            im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            d.rectangle([(0, 360), (w, h)], fill=(40, 44, 58, 255))
            for y in range(360, h, 12):
                d.line([(1086, y), (1086, min(y + 6, h))], fill=(235, 235, 245), width=2)
            halves = img['halves']
            cx_left = 1086 / 2
            cy = (360 + h) / 2
            centred(d, cx_left, cy, ["PLACEHOLDER", halves[0]], [24, 20], (235, 235, 245))
            cx_right = 1086 + (w - 1086) / 2
            centred(d, cx_right, cy, ["PLACEHOLDER", halves[1]], [24, 20], (235, 235, 245))
            im.save(file_path, 'WEBP', lossless=True, quality=0, method=0)

            normal_path = out_dir / img['normal']
            normal_path.parent.mkdir(parents=True, exist_ok=True)
            im_n = Image.new('RGB', (w, h), (128, 128, 255))
            im_n.save(normal_path, 'WEBP', lossless=True, quality=0, method=0)

        elif kind == 'floor':
            im = Image.new('RGB', (w, h), (40, 44, 58))
            d = ImageDraw.Draw(im)
            lines = ["PLACEHOLDER FLOOR", f"{Path(img['file']).name}  {w}x{h}"]
            centred(d, w / 2, h / 2, lines, [36, 26], (235, 235, 245))
            im.save(file_path, 'JPEG', quality=80, optimize=False)

            normal_path = out_dir / img['normal']
            normal_path.parent.mkdir(parents=True, exist_ok=True)
            im_n = Image.new('RGB', (w, h), (128, 128, 255))
            im_n.save(normal_path, 'WEBP', lossless=True, quality=0, method=0)

        elif kind == 'strip':
            im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            frames_cnt = img['frames']
            fw = w // frames_cnt
            fh = h
            for i in range(frames_cnt):
                x0 = i * fw
                y0 = 0
                d.rectangle([x0 + 2, y0 + 2, x0 + fw - 3, y0 + fh - 3], fill=(16, 18, 26, 150))
                dashed(d, (x0 + 2, y0 + 2, x0 + fw - 3, y0 + fh - 3), (235, 235, 245), w=max(1, min(fw, fh) // 40))
                lines = ["PLACEHOLDER", img_id, f"frame {i}"]
                centred(d, x0 + fw / 2, y0 + fh / 2, lines, [14, 12, 11], (235, 235, 245))
            im.save(file_path, 'WEBP', lossless=True, quality=0, method=0)

        elif kind == 'portrait':
            im = Image.new('RGB', (w, h), (40, 20, 48))
            d = ImageDraw.Draw(im)
            d.ellipse([10, 10, w - 11, h - 11], outline=(235, 235, 245), width=2)
            lines = ["PLACEHOLDER", img_id]
            centred(d, w / 2, h / 2, lines, [16, 14], (235, 235, 245))
            im.save(file_path, 'WEBP', lossless=True, quality=0, method=0)

    # 3. Prompts
    prompts_dir = out_dir / 'docs' / 'stage3' / 'prompts'
    prompts_dir.mkdir(parents=True, exist_ok=True)

    for pid, pmeta in MANIFEST['prompts'].items():
        if pid in non_placeholder_entries:
            continue
        p_data = {
            "id": pid,
            "tool": "chatgpt",
            "fallback": "gemini",
            "tries": 0,
            "attach": pmeta['attach'],
            "output": pmeta['output'],
            "prompts": [prompts_text[pid]]
        }
        p_path = prompts_dir / f"{pid}.json"
        with open(p_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(p_data, indent=1, ensure_ascii=False) + '\n')

    # 4. ART_STATUS.json
    def sha256_of(rel_p):
        p = out_dir / rel_p
        if not p.exists():
            sys.exit(f"File missing when computing sha256: {p}")
        return hashlib.sha256(p.read_bytes()).hexdigest()

    entries = []
    # Quick lookup for char sheets
    sheet_to_char = {}
    for c in MANIFEST['chars']:
        for s in c['sheets']:
            sheet_to_char[s['id']] = (c, s['page'])

    img_lookup = {img['id']: img for img in MANIFEST['images']}
    master_lookup = {m['id']: m for m in MANIFEST['masters']}

    for pid in MANIFEST['prompts']:
        if pid in non_placeholder_entries:
            entries.append(non_placeholder_entries[pid])
            continue

        if pid in master_lookup:
            entries.append({
                "id": pid,
                "files": [],
                "sha256": {},
                "sourceOnly": True,
                "placeholder": True,
                "prompt": f"docs/stage3/prompts/{pid}.json"
            })
        elif pid in sheet_to_char:
            c, p_idx = sheet_to_char[pid]
            page_name = f"{c['key']}-{p_idx}"
            files = [
                f"{c['dir']}/{page_name}.webp",
                f"{c['dir']}/{page_name}_n.webp",
                f"{c['dir']}/{page_name}_nl.webp",
                f"{c['dir']}/{page_name}.json",
                f"{c['dir']}/{c['key']}.anims.json"
            ]
            sha_map = {f_rel: sha256_of(f_rel) for f_rel in files}
            entries.append({
                "id": pid,
                "char": c['key'],
                "files": files,
                "sha256": sha_map,
                "placeholder": True,
                "prompt": f"docs/stage3/prompts/{pid}.json"
            })
        elif pid in img_lookup:
            img = img_lookup[pid]
            files = [img['file']]
            if 'normal' in img:
                files.append(img['normal'])
            sha_map = {f_rel: sha256_of(f_rel) for f_rel in files}
            entries.append({
                "id": pid,
                "files": files,
                "sha256": sha_map,
                "placeholder": True,
                "prompt": f"docs/stage3/prompts/{pid}.json"
            })
        else:
            sys.exit(f"Unknown prompt id in manifest: {pid}")

    status_data = {
        "version": 1,
        "facingFlips": [],
        "entries": entries
    }
    status_path.parent.mkdir(parents=True, exist_ok=True)
    with open(status_path, 'w', encoding='utf-8') as f:
        f.write(json.dumps(status_data, indent=1, ensure_ascii=False) + '\n')

def run_check():
    with tempfile.TemporaryDirectory() as d1, tempfile.TemporaryDirectory() as d2:
        p1 = Path(d1)
        p2 = Path(d2)

        generate_placeholders(p1)
        generate_placeholders(p2)

        # (a) both runs byte-identical
        f1_files = sorted([p.relative_to(p1) for p in p1.rglob('*') if p.is_file()])
        f2_files = sorted([p.relative_to(p2) for p in p2.rglob('*') if p.is_file()])

        if f1_files != f2_files:
            sys.exit(f"Check failed: file list differs between run 1 and run 2: {set(f1_files) ^ set(f2_files)}")

        for rel in f1_files:
            b1 = (p1 / rel).read_bytes()
            b2 = (p2 / rel).read_bytes()
            if b1 != b2:
                sys.exit(f"Check failed: run 1 and run 2 differ for {rel}")

        # (b) compare repo files
        repo_status_path = REPO_ROOT / 'assets' / 'stage3' / 'ART_STATUS.json'
        if not repo_status_path.exists():
            sys.exit(f"Check failed: {repo_status_path} does not exist in repo")

        with open(repo_status_path, 'r', encoding='utf-8') as f:
            repo_status = json.load(f)

        checked_count = 0
        for entry in repo_status.get('entries', []):
            if entry.get('placeholder', True):
                for rel in entry.get('files', []):
                    repo_file = REPO_ROOT / rel
                    temp_file = p1 / rel
                    if not repo_file.exists():
                        sys.exit(f"Check failed: repo file missing: {rel}")
                    repo_bytes = repo_file.read_bytes()
                    temp_bytes = temp_file.read_bytes()
                    if repo_bytes != temp_bytes:
                        sys.exit(f"Check failed: repo file bytes != temp copy: {rel}")
                    actual_sha = hashlib.sha256(repo_bytes).hexdigest()
                    if actual_sha != entry['sha256'].get(rel):
                        sys.exit(f"Check failed: sha256 mismatch for {rel} in ART_STATUS.json")
                    checked_count += 1

                # Check prompt file too
                prompt_rel = entry.get('prompt')
                if prompt_rel:
                    repo_prompt = REPO_ROOT / prompt_rel
                    temp_prompt = p1 / prompt_rel
                    if not repo_prompt.exists():
                        sys.exit(f"Check failed: repo prompt missing: {prompt_rel}")
                    if repo_prompt.read_bytes() != temp_prompt.read_bytes():
                        sys.exit(f"Check failed: prompt file bytes mismatch: {prompt_rel}")
                    checked_count += 1

        # Check ART_STATUS.json itself
        if repo_status_path.read_bytes() != (p1 / 'assets' / 'stage3' / 'ART_STATUS.json').read_bytes():
            sys.exit("Check failed: ART_STATUS.json in repo != generated temp copy")
        checked_count += 1

        # (c) every _n/_nl/normal image decodes to exactly one colour (128,128,255) / (127,128,255)
        for rel in f1_files:
            rel_str = str(rel)
            if rel_str.endswith('_nl.webp'):
                im = Image.open(p1 / rel)
                if im.mode != 'RGB':
                    sys.exit(f"Check failed: normal map {rel} mode is {im.mode}, expected RGB")
                colors = im.getcolors(maxcolors=2)
                if not (colors and len(colors) == 1 and colors[0][1] == (127, 128, 255)):
                    sys.exit(f"Check failed: normal map {rel} does not decode to uniform (127, 128, 255): {colors}")
            elif rel_str.endswith('_n.webp'):
                im = Image.open(p1 / rel)
                if im.mode != 'RGB':
                    sys.exit(f"Check failed: normal map {rel} mode is {im.mode}, expected RGB")
                colors = im.getcolors(maxcolors=2)
                if not (colors and len(colors) == 1 and colors[0][1] == (128, 128, 255)):
                    sys.exit(f"Check failed: normal map {rel} does not decode to uniform (128, 128, 255): {colors}")

        print(f"OK {len(f1_files)} files")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=REPO_ROOT, help='Output directory (default: repo root)')
    parser.add_argument('--check', action='store_true', help='Validate determinism, repo match, and normal flatness without writing')
    args = parser.parse_args()

    if args.check:
        run_check()
    else:
        generate_placeholders(args.out)
        print(f"Placeholders generated in {args.out}")

if __name__ == '__main__':
    main()
