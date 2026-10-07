#!/usr/bin/env python3
"""Ship the approved Grok Bot Stage 3 story panels and record their provenance.

Sources: art-in/story3/story3_panel_{1,2,3}.src.jpg (1280x720). Each source is re-encoded at native size with
story_panel_1.jpg's own quantisation tables and 4:2:0 subsampling, so the Stage 3 panels match the Stage 2 panels'
format and quality. Writes assets/story/story3_panel_N.jpg, a contact sheet, the ART_STATUS entries and the prompt files.
Run from the repository root: python3 tools/stage3/process_story3_panels.py
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / 'assets/story/story_panel_1.jpg'
CONTACT = 'docs/stage3/shots/contact-story3-panels.jpg'
APPROVED = 'Jason F (owner), 2026-10-07, rwb-w2-s3-story'
SUBJECTS = {
    1: 'Riley from behind at the gates of Caemlyn',
    2: 'Basel Gill at the Queen\'s Blessing; Riley holds the blue ribbon',
    3: 'Sunset rooftops; the cloaked figure flees with the bundle',
}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    qt = Image.open(REF).quantization
    shipped = []
    for n in (1, 2, 3):
        src = ROOT / f'art-in/story3/story3_panel_{n}.src.jpg'
        out = ROOT / f'assets/story/story3_panel_{n}.jpg'
        im = Image.open(src).convert('RGB')
        assert im.size == (1280, 720), (src, im.size)
        im.save(out, 'JPEG', qtables=qt, subsampling=2, optimize=True)
        shipped.append((n, src, out))

    # contact sheet: three panels at half size with their file names
    sheet = Image.new('RGB', (640 * 3 + 40, 360 + 50), (18, 18, 24))
    d = ImageDraw.Draw(sheet)
    for i, (n, _, out) in enumerate(shipped):
        sheet.paste(Image.open(out).resize((640, 360), Image.LANCZOS), (10 + i * 650, 40))
        d.text((10 + i * 650, 12), f'story3_panel_{n}.jpg  {SUBJECTS[n]}', fill=(235, 225, 200))
    sheet.save(ROOT / CONTACT, 'JPEG', quality=85)

    status_path = ROOT / 'assets/stage3/ART_STATUS.json'
    S = json.loads(status_path.read_text())
    for n, src, out in shipped:
        rel_out, rel_src = str(out.relative_to(ROOT)), str(src.relative_to(ROOT))
        e = next(e for e in S['entries'] if e['id'] == f'story3-{n}')
        e['sha256'] = {rel_out: sha(out)}
        e['placeholder'] = False
        e['source'] = 'grokbot-image'
        e['contactSheet'] = CONTACT
        e['art'] = {
            'status': 'real painted story panel',
            'generator': 'Grok Bot image generation',
            'generated': '2026-10-07',
            'subject': SUBJECTS[n],
            'source': rel_src,
            'sourceSha256': sha(src),
            'sourceSize': [1280, 720],
            'shippedSize': [1280, 720],
            'postProcess': "tools/stage3/process_story3_panels.py: native size, re-encoded JPEG with story_panel_1.jpg's quantisation tables (about q86), 4:2:0",
            'approvedBy': APPROVED,
        }
        # keep key order readable: move prompt to the end like the bg3 entries
        e['prompt'] = e.pop('prompt')
        art = e.pop('art'); e['art'] = art
        p_path = ROOT / e['prompt']
        P = json.loads(p_path.read_text())
        P['tries'] = 1
        P['generatedWith'] = 'grokbot-image (Grok Bot image generation, 2026-10-07); prompts[0] is the brief, not the literal generation prompt'
        P.setdefault('rejections', [])
        p_path.write_text(json.dumps(P, indent=1, ensure_ascii=False) + '\n')
    status_path.write_text(json.dumps(S, indent=1, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
