#!/usr/bin/env python3
"""Record provenance for the reskinned Stage 3 character atlases (run after reskin_chars.py).

Updates assets/stage3/ART_STATUS.json (placeholder flag, sha256 of the shipped files, source sheet and
approval) and the matching docs/stage3/prompts/*.json (tries/generatedWith). Image generation was not
used for these entries; the PLAN prompts stay on file for a future painted pass.
"""
import hashlib, json

APPROVED = 'Grok Bot for Jason F (owner), 2026-10-07'
SRC = {
    'cutthroat': ('assets/chars/zealot', 'docs/stage3/shots/contact-cutthroat-reskin.jpg',
                  'palette/region recolour of the Whitecloak zealot sheet: charcoal hood and cloak, oxblood shirt (was mail), brown leather, copper fittings'),
    'fade': ('assets/chars/byar', 'docs/stage3/shots/contact-fade-reskin.jpg',
             'palette/region recolour of the Jaret Byar sheet: black cloak and armour, pale grey eyeless face (eyes and brows smoothed); blink frames sink into shadow'),
    'riley3': ('assets/chars/riley', 'docs/stage3/shots/contact-riley3.jpg',
               "Riley's own painted frames, unchanged: grabbed = hurt struggle loop, escape = back kick"),
    'fade-portrait': ('assets/ui/byar-portrait', 'docs/stage3/shots/contact-fade-reskin.jpg',
                      'the Jaret Byar HUD portrait with the same recolour; eyes and brows inpainted from the pale skin'),
}
OWNER = {'cutthroat-master': 'cutthroat', 'fade-master': 'fade', 'fade-portrait': 'fade-portrait'}


def sha(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def main():
    path = 'assets/stage3/ART_STATUS.json'
    with open(path) as f:
        S = json.load(f)
    for e in S['entries']:
        char = e.get('char') or OWNER.get(e['id'])
        if char not in SRC:
            continue
        sheet, contact, how = SRC[char]
        portrait = char == 'fade-portrait'
        page0 = None if portrait else json.load(open(f'{sheet}.anims.json'))['pages'][0]
        src_file = f'{sheet}.webp' if portrait else f'assets/chars/{page0}.webp'
        e['placeholder'] = False
        e['source'] = 'reskin'
        e['contactSheet'] = contact
        e['sha256'] = {f: sha(f) for f in e['files']}
        e['art'] = {
            'status': 'real painted portrait (reskin of an existing portrait)' if portrait else 'real painted frames (reskin of an existing sheet)',
            'source': src_file if portrait else f'{sheet}.anims.json',
            'sourcePage': src_file,
            'sourceSha256': sha(src_file),
            'method': how,
            'tool': 'tools/stage3/reskin_chars.py portrait' if portrait else 'tools/stage3/reskin_chars.py (frames copied 1:1 at the source pack scale, re-registered on the Stage 3 canvas, normals cut from the source _n/_nl at half resolution)',
            'approvedBy': APPROVED,
        }
        p = e['prompt']
        P = json.load(open(p))
        P['tries'] = 1
        P['generatedWith'] = f'reskin of {sheet} via tools/stage3/reskin_chars.py (no image generation)'
        P['rejections'] = []
        with open(p, 'w') as f:
            json.dump(P, f, indent=1)
            f.write('\n')
    with open(path, 'w') as f:
        json.dump(S, f, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
