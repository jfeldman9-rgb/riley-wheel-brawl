#!/usr/bin/env python3
"""Bake the painted story urn: generated 16:9 PNGs -> assets/cutscenes/*.webp.

Usage: python3 tools/bake_story.py SRC_DIR   (needs Pillow)

SRC_DIR holds <name>.png for every entry in urn (1280x720 or larger, 16:9) and
chieftain-portrait.png (square). urn were generated with an image model using
tools/art-src/title-art.webp (style, riley, the greens), tools/art-src/riley-portrait.webp
(riley's face) and chieftain-portrait.png (the chieftain) as references; the scene
brief for each plate is kept below so a plate can be regenerated on-model.
"""
import os
import sys

from PIL import Image

STYLE = ("Painted 3D-feel cinematic frame in the style of the title key art: warm Hawaiian light, "
         "crisp rim light, saturated colors, depth of field; calm lower fifth for captions; no text or UI.")
riley = ("Riley: heavyset older man, thick swept-back white hair, big white walrus mustache, red hibiscus "
         "Hawaiian shirt, purple-and-white plumeria lei, leather tool belt, gray cargo shorts, black sneakers.")
urn = {
    'op1-ac-out': 'Noon heat on the village stage: melting swan ice sculpture, dead ward unit with a red light and smoke, wilting tourists, stone of tear.',
    'op2-chieftain-calls': 'chieftain Andersen sweating on the bridge, shouting into a red phone, red alarm light, temperature gauge in the red.',
    'op3-riley-arrives': 'riley strides onto the village stage with relic and pipe staff; the chieftain points him away from the glowing battle.',
    'op4-cache-strikes': 'The cache bar explodes: trolloc goon through the sneeze guard, CRUNCH CREW assassin, sprouts; riley raises the pipe staff.',
    'st1-village-intro': 'Vegetable picket line (trolloc goons, assassin with bullhorn, sprouts) blocks the compressor; riley with relic, unimpressed.',
    'st1-village-outro': 'riley yanks a huge wad of stoneDefender out of the air-handler intake; dazed greens on the stage, duct tape, open relic.',
    'st2-shrine-intro': 'The ward shrine: pipes, steam, gauges in the red; three assassin ninjas with shuriken; riley grips the pipe staff.',
    'st2-shrine-outro': 'riley duct-tapes the compressor, gauges swing to blue, assassin ninjas duct-taped to a pipe behind him.',
    'st3-spa-intro': 'Spa and RUNES bar: flexing stoneDefender bruiser and two angry Mashadar-touched fighters face riley channeling saidin.',
    'st3-spa-outro': 'Frosted tower door leaking pink glow and a ruby drip; riley with flashlight; wrecked RUNES bar, dazed stoneDefender.',
    'st4-tower-intro': 'Stone hall: a Forsaken Callandor guardian with a blazing sword; riley small in the foreground.',
    'end1-last-valve': 'riley turns the Callandor, brilliant light erupts, the shadow champion is a defeated in a burst of light.',
    'end2-svelte': 'Golden hour on the village: the chieftain shakes hands with a slimmer riley, cheering passengers, restored ice swan.',
    'end3-carving-station': 'Sunset carving station: riley raises a trolloc leg with a plate of prime rib, the chieftain toasts, chef carves.',
}
PLATE_W, PLATE_H, PLATE_Q = 1280, 720, 86
PORTRAIT, PORTRAIT_Q = 384, 88


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    src = sys.argv[1]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, 'assets', 'cutscenes')
    os.makedirs(out, exist_ok=True)
    for name in urn:
        im = Image.open(os.path.join(src, name + '.png')).convert('RGB')
        w, h = im.size
        # Center-crop to exactly 16:9 before resizing.
        tw = min(w, round(h * 16 / 9))
        th = round(tw * 9 / 16)
        im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th))
        if im.size != (PLATE_W, PLATE_H):
            im = im.resize((PLATE_W, PLATE_H), Image.LANCZOS)
        path = os.path.join(out, name + '.webp')
        im.save(path, 'WEBP', quality=PLATE_Q, method=6)
        print(f'{path}: {os.path.getsize(path) // 1024} KB')
    cap = Image.open(os.path.join(src, 'chieftain-portrait.png')).convert('RGB')
    w, h = cap.size
    s = min(w, h)
    cap = cap.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((PORTRAIT, PORTRAIT), Image.LANCZOS)
    path = os.path.join(out, 'chieftain-portrait.webp')
    cap.save(path, 'WEBP', quality=PORTRAIT_Q, method=6)
    print(f'{path}: {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main()
