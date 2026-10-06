#!/usr/bin/env python3
"""Write tools/stage4/art-manifest.json and docs/stage4/prompts/*.json.

Stage 4 art prep only. Does not paint assets and does not touch assets/.
Formats follow the Stage 4 outline (Stage 3 §4): sheets 1536×1024 / 8 cells,
masters 1024×1536, plates 2172×724, story panels 1280×720, normals via nmap.py.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOUSE = (ROOT / 'spike-art' / 'HOUSE_STYLE.txt').read_text().strip()
RILEY_RULE = (
    '16, very muscular, short dark hair, thin blue-framed glasses, sleeveless black '
    "Asha'man coat; never a kid. Attach the Riley master + riley.jpg."
)
RILEY_ATTACH = [
    'spike/gen/riley/master-side.png',
    'riley.jpg',
    'spike-art/RILEY_SPEC.txt',
    'spike-art/HOUSE_STYLE.txt',
]
HOUSE_ATTACH = ['spike-art/HOUSE_STYLE.txt']

def item(**kw):
    kw.setdefault('opaque', False)
    kw.setdefault('normal', False)
    kw.setdefault('riley', False)
    kw.setdefault('tileable', False)
    kw.setdefault('cols', 1)
    kw.setdefault('rows', 1)
    kw.setdefault('poses', [])
    kw.setdefault('derivedFrom', None)
    return kw

def plate(id_, blurb, opaque=False, tileable=False, riley=False):
    return item(id=id_, file=f'{id_}.png', group='backdrop', kind='plate',
                width=2172, height=724, frames=1, opaque=opaque, tileable=tileable,
                riley=riley, blurb=blurb)

def normal_of(src):
    return item(id=src['id'] + '_n', file=src['file'].replace('.png', '_n.png'),
                group='backdrop', kind='normal', width=src['width'], height=src['height'],
                frames=1, opaque=True, normal=True, derivedFrom=src['file'],
                blurb=f"Normal map of {src['file']}. Do not paint this. Build it with spike-art/tools/nmap.py from the colour plate.")

def sheet8(id_, group, blurb, poses, riley=False):
    return item(id=id_, file=f'{id_}.png', group=group, kind='sheet',
                width=1536, height=1024, frames=8, cols=4, rows=2,
                riley=riley, blurb=blurb, poses=poses)

def sheet6(id_, group, blurb, poses):
    return item(id=id_, file=f'{id_}.png', group=group, kind='sheet',
                width=1536, height=1024, frames=6, cols=3, rows=2, blurb=blurb, poses=poses)

def master(id_, group, blurb):
    return item(id=id_, file=f'{id_}.png', group=group, kind='master',
                width=1024, height=1536, frames=1, blurb=blurb)

ITEMS = []

far = plate('bg4-far',
    'Opaque moonlit ruined skyline of Shadar Logoth at moonrise. Dead city, broken towers, a faint green Mashadar haze low in the streets. No people, no creatures, no readable writing. Horizon sits so the plate can scroll behind the gate and the court.',
    opaque=True)
ITEMS.append(far)

mid = plate('bg4-mid',
    'Transparent-sky mid plate, two places side by side. LEFT: the Gate of Aridhol, a broken black-stone arch and dead trees. RIGHT: the plaza of a dry fountain, fog-wrapped statue base, cracked flagstones. Sky and gaps are real alpha. No ground strip below the architecture baseline. No people.')
ITEMS += [mid, normal_of(mid)]

mid2 = plate('bg4-mid2',
    "Transparent-sky mid plate. LEFT: Tower Row, three tall ruined towers with gaps a moonshaft could fall through. RIGHT: Mordeth's court, a roofless black hall under a full moon, fog glow in the doorways. Real alpha sky. No people, no readable inscriptions.")
ITEMS += [mid2, normal_of(mid2)]

floors = [
    plate('bg4-floor', 'Opaque tileable ground plate: cracked Aridhol flagstones, pale mortar, a little moon sheen. No horizon, no props, edges meet so it can repeat horizontally.', opaque=True, tileable=True),
    plate('bg4-floor2', 'Opaque tileable ground plate: the same flagstones broken by pale dead roots. No horizon. Left and right edges tile.', opaque=True, tileable=True),
    plate('bg4-floor3', 'Opaque tileable ground plate: flagstones stained with dull green fog, still readable as stone. No horizon. Left and right edges tile.', opaque=True, tileable=True),
]
for f in floors:
    ITEMS += [f, normal_of(f)]

ITEMS += [
    sheet6('prop-tower-a', 'prop',
           'Tower prop variant A, topple-across (falls toward the camera). Six frames of ONE ruined black tower: standing, dust at the crown, leaning, falling forward, impact, settled. Footprint reads as a wide band, not a single lane.',
           ['standing', 'dust tell', 'leaning toward camera', 'falling forward', 'impact', 'settled']),
    sheet6('prop-tower-b', 'prop',
           'Tower prop variant B, topple-along (falls down the street). Six frames of ONE ruined tower: standing, dust tell, tipping along the street, falling through one lane band, impact, settled beam. The dangerous band must read clearly.',
           ['standing', 'dust tell', 'tipping down the street', 'falling along one band', 'impact', 'settled']),
    sheet6('prop-tower-c', 'prop',
           'Tower prop variant C, the far-plane teaching collapse. Six frames, smaller in the frame, clearly distant: standing, dust, slow lean, fall in the far plane, dust cloud, gone to a low stump. Harmless show, not a gameplay footprint.',
           ['far standing', 'far dust', 'far lean', 'far fall', 'dust cloud', 'stump']),
    item(id='prop-rubble', file='prop-rubble.png', group='prop', kind='sheet',
         width=768, height=512, frames=2, cols=2, rows=1,
         blurb='Breakable rubble, two states side by side in 384×512 cells. Frame 1: a cracked black-stone block still in one piece (crate-like, three hits). Frame 2: the same block broken open, no gore, a gap where a pickup could sit. One lane wide, not a wall.',
         poses=['cracked block', 'broken open']),
    item(id='fx-vent', file='fx-vent.png', group='fx', kind='sheet',
         width=1024, height=256, frames=4, cols=4, rows=1,
         blurb='Mashadar vent in a flagstone crack. Four frames of a green glow pulse, left to right, from a dim crack to a bright ready vent. The tell is the glow. Transparent background.',
         poses=['dim crack', 'green glimmer', 'bright vent', 'peak glow']),
    item(id='fx-tendril-seg', file='fx-tendril-seg.png', group='fx', kind='sheet',
         width=512, height=256, frames=2, cols=2, rows=1,
         blurb='Tendril segment, two tileable curls of green-black fog tube on transparent background. Used in a chain of at most eight. No face, no teeth, no gore.',
         poses=['curl A', 'curl B']),
    item(id='fx-tendril-tip', file='fx-tendril-tip.png', group='fx', kind='sheet',
         width=512, height=512, frames=4, cols=2, rows=2,
         blurb='Tendril tip, four frames. The tip is the brightest part of the fog, a clear readable point, not a monster mouth. Transparent background.',
         poses=['tip narrow', 'tip bright', 'tip wide', 'tip peak']),
    item(id='fx-fog-bank', file='fx-fog-bank.png', group='fx', kind='fx',
         width=2048, height=256, frames=1, tileable=True, opaque=False,
         blurb='Tileable horizontal Mashadar bank, 2048×256. Soft green-grey fog that repeats on the left and right edges. Transparent enough that stone still reads through it. No creatures.'),
    item(id='fx-fogwall', file='fx-fogwall.png', group='fx', kind='sheet',
         width=2048, height=1024, frames=4, cols=4, rows=1,
         blurb='Vertical Mashadar wall, four frames in a row. Each cell is a tall fog curtain (512×1024), brighter at the inner edge, with a bulge hint on the last frame. Transparent outside the fog.',
         poses=['wall thin', 'wall thick', 'wall bright edge', 'wall bulge']),
    item(id='fx-moonshaft', file='fx-moonshaft.png', group='fx', kind='fx',
         width=512, height=512, frames=1,
         blurb='One moonshaft: a pale vertical column of moonlight pooling on flagstones. This is the readable safe floor. Soft edges, real alpha, no rune text.'),
    item(id='fx-fogbolt', file='fx-fogbolt.png', group='fx', kind='sheet',
         width=512, height=512, frames=4, cols=2, rows=2,
         blurb='Slow green fog orb, four frames of a cultist bolt. Readable circle, soft glow, no skull, no gore. Transparent background.',
         poses=['orb dim', 'orb core', 'orb bright', 'orb pulse']),
    sheet6('fx-ash', 'fx',
           'Shared Shadowspawn dissolve. Six frames of a body turning to grey ash and blowing apart. No blood, no viscera, no bones left behind. Transparent background. Used for Trollocs, the Draghkar, and any other Shadowspawn.',
           ['solid', 'cracking to ash', 'ash sheets', 'breaking up', 'drifting', 'gone']),
]

ITEMS.append(master('cultist-master', 'cultist',
    'Cultist master, full body, faces LEFT. Human Darkfriend, adult, ragged hooded robe, green-glowing charm at the throat, short staff. Low and sly, not a monster. Transparent background. This master locks every cultist sheet.'))

cult_sheets = [
    ('cultist-walk', 'Walk and hurt. Top row four walk frames, bottom row four hurt flinches. Faces LEFT. Hood, robe, and green charm stay consistent with the cultist master.',
     ['walk contact', 'walk passing', 'walk contact opposite', 'walk passing opposite', 'hurt light', 'hurt back', 'hurt heavy', 'hurt recover']),
    ('cultist-bolt', 'Fog bolt and knockdown. Top row: hand glow through the 0.6 s bolt tell. Bottom row: knocked down, no blood.',
     ['hand dim', 'hand glow', 'chant sting', 'release', 'knocked back', 'falling', 'down', 'still']),
    ('cultist-chant', 'Call-the-fog chant, dazed, getup. Kneel and chant, then a dazed stagger, then rising. Faces LEFT.',
     ['kneel start', 'kneel chant', 'ring pose', 'chant peak', 'dazed', 'dazed sway', 'getup knee', 'getup stand']),
    ('cultist-shove', 'Ward shove and flee. Top row: staff shove. Bottom row: fleeing, looking back, kid-safe panic, no gore.',
     ['shove windup', 'shove', 'shove extend', 'backstep', 'flee 1', 'flee 2', 'flee 3', 'flee 4']),
    ('cultist-idle', 'Idle and stalk. Top row idle breath, bottom row a cautious stalk. Faces LEFT. Charm glows faintly.',
     ['idle', 'idle shift', 'idle', 'idle charm', 'stalk 1', 'stalk 2', 'stalk 3', 'stalk 4']),
]
for id_, blurb, poses in cult_sheets:
    ITEMS.append(sheet8(id_, 'cultist', blurb, poses))

ITEMS.append(master('draghkar-master', 'draghkar',
    'Draghkar master, full body, faces LEFT. Pale, gaunt, bat-winged, beautiful-wrong face, no gore. Wings fit in the frame with margin. Transparent background. This master locks every Draghkar sheet. Large silhouette, still the house ink-and-cel style, not a photoreal creature.'))

drag_sheets = [
    ('draghkar-perch', 'Perch and intro. Top row perched on a skyline edge, untargetable read. Bottom row intro, wings opening.',
     ['perch still', 'perch lean', 'perch wings in', 'perch look', 'intro rise', 'wings half', 'wings wide', 'intro hold']),
    ('draghkar-swoop', 'Swoop and dive. Top row the shadow-swoop pose in the air. Bottom row the dive across a lane. Wings readable, no motion-blur smear.',
     ['swoop bank', 'swoop level', 'swoop opposite', 'swoop recover', 'dive start', 'dive', 'dive low', 'dive exit']),
    ('draghkar-land', 'Land and claw. Top row landing. Bottom row a two-hit claw. Faces LEFT.',
     ['land approach', 'land touch', 'land crouch', 'land ready', 'claw 1', 'claw 1 recover', 'claw 2', 'claw 2 recover']),
    ('draghkar-buffet', 'Wing buffet and hurt. Top row a wing shove. Bottom row hurt flinches. No blood.',
     ['buffet windup', 'buffet', 'buffet wide', 'buffet back', 'hurt 1', 'hurt 2', 'hurt 3', 'hurt 4']),
    ('draghkar-croon', 'Croon and kiss-lunge. Top row the gold-green croon. Bottom row the kiss lunge, wings flared, eyes glinting. The tell must read before the lunge.',
     ['croon start', 'croon rings', 'croon open', 'croon peak', 'lunge tell', 'lunge', 'lunge extend', 'lunge recover']),
    ('draghkar-kiss', 'Kiss hold and reels. Top row holding Riley\'s space empty (the Draghkar alone, frontal hold pose). Bottom row reeling back after the headbutt.',
     ['hold reach', 'hold', 'hold tight', 'hold peak', 'reels 1', 'reels 2', 'reels 3', 'reels 4']),
    ('draghkar-down', 'Downed and getup. Top row knocked out of the air onto the stones. Bottom row getting up. No gore.',
     ['downed fall', 'downed land', 'downed still', 'downed stir', 'getup 1', 'getup 2', 'getup 3', 'getup stand']),
    ('draghkar-defeat', 'Shriek and defeat. Top row the shriek. Bottom row dissolving to ash into the fog. No blood, no corpse left behind.',
     ['shriek inhale', 'shriek', 'shriek wings', 'shriek peak', 'ash start', 'ash mid', 'ash thin', 'ash gone']),
]
for id_, blurb, poses in drag_sheets:
    ITEMS.append(sheet8(id_, 'draghkar', blurb, poses))

ITEMS.append(item(id='draghkar-portrait', file='draghkar-portrait.png', group='draghkar', kind='portrait',
                  width=256, height=256, frames=1, opaque=True,
                  blurb='Square bust portrait of the Draghkar for the boss bar. Pale beautiful-wrong face, wings suggested at the edges, no gore, no text. Opaque dark background is fine.'))

ITEMS.append(sheet8('riley-s4a', 'riley',
    'Riley Stage 4 sheet riley-s4a for the new riley4 atlas. Faces RIGHT. Top row four kissed frames (frontal hold, awake, not a child). Bottom row four break frames (headbutt shove that frees him). Whole figure in each 384×512 cell.',
    ['kissed held', 'kissed slump', 'kissed strain', 'kissed awake', 'break windup', 'break headbutt', 'break shove', 'break free'],
    riley=True))

stories = [
    ('story4_panel_1', False, 'Story panel, night road east of Caemlyn. A ribbon-faint trail runs toward a dead city on the horizon. No Riley in this panel. Moonrise, green haze far away. Opaque painting, 1280×720.'),
    ('story4_panel_2', True, 'Story panel. Riley stands at the Gate of Aridhol, ribbon clenched in his fist, looking in. He is on-model. The broken arch frames him. Opaque painting, 1280×720.'),
    ('story4_panel_3', False, 'Story panel. Fog curling through the arch. Mordeth is unseen: no face, no body, only the welcome of the fog. Opaque painting, 1280×720.'),
]
for id_, riley, blurb in stories:
    ITEMS.append(item(id=id_, file=f'{id_}.png', group='story', kind='story',
                      width=1280, height=720, frames=1, opaque=True, riley=riley, blurb=blurb))

def frame_line(it):
    if it['frames'] <= 1:
        return 'Single image, not a sprite sheet.'
    cell_w, cell_h = it['width'] // it['cols'], it['height'] // it['rows']
    poses = ''
    if it['poses']:
        lines = [f'{i + 1}. {p}' for i, p in enumerate(it['poses'])]
        poses = ' Frames, in reading order: ' + ' '.join(lines) + '.'
    return (f"Exactly {it['frames']} frames in a {it['cols']}×{it['rows']} grid. "
            f"Each cell is {cell_w}×{cell_h}. Clear gaps, no overlap, no borders.{poses}")

def prompt_text(it):
    if it['normal']:
        return (
            f"Do not paint {it['file']}. Build the normal map by running spike-art/tools/nmap.py "
            f"on the colour plate {it['derivedFrom']} and save {it['file']} at {it['width']}×{it['height']}. "
            f"{it['blurb']}"
        )
    face = ''
    if it['group'] in ('cultist', 'draghkar') and it['kind'] in ('sheet', 'master'):
        face = ' Native facing is LEFT, matching Stage 2 enemies; the game mirrors the sprite to turn.'
    if it['riley'] and it['kind'] == 'sheet':
        face = ' Faces RIGHT, as specified for the riley4 atlas.'
    alpha = 'Fully opaque.' if it['opaque'] else 'Genuinely transparent background, real alpha. No painted backdrop, floor shadow, or checkerboard.'
    tile = ' Left and right edges must tile.' if it['tileable'] else ''
    riley = ''
    if it['riley']:
        riley = (
            f" ON-MODEL RILEY: Riley is {RILEY_RULE} Follow spike-art/RILEY_SPEC.txt. "
            'Attach the Riley master (spike/gen/riley/master-side.png) and riley.jpg.'
        )
    return (
        f"Use case: stylized-concept. Production art for Riley Wheel Brawl 2.0, Stage 4, Shadar Logoth. "
        f"Asset {it['file']}. Canvas exactly {it['width']}×{it['height']}. {frame_line(it)} {alpha}{tile}{face} "
        f"HOUSE STYLE, identical to spike-art/HOUSE_STYLE.txt: {HOUSE} "
        f"{it['blurb']}{riley} "
        'No text, letters, numbers, watermarks, frame labels, or borders in the finished image. '
        'No gore: Shadowspawn become ash; human cultists are knocked out or flee.'
    )

def main():
    assert len({it['id'] for it in ITEMS}) == len(ITEMS)
    for it in ITEMS:
        assert it['width'] % it['cols'] == 0 and it['height'] % it['rows'] == 0
        assert it['cols'] * it['rows'] >= it['frames']
        if it['poses']:
            assert len(it['poses']) == it['frames'], it['id']
    cult = sum(it['frames'] for it in ITEMS if it['group'] == 'cultist' and it['kind'] == 'sheet')
    drag = sum(it['frames'] for it in ITEMS if it['group'] == 'draghkar' and it['kind'] == 'sheet')
    riley = sum(it['frames'] for it in ITEMS if it['group'] == 'riley' and it['kind'] == 'sheet')
    assert (cult, drag, riley, cult + drag + riley) == (40, 64, 8, 112), (cult, drag, riley)
    manifest = {
        'version': 1,
        'stage': 4,
        'source': 'docs/stage4/PLAN-OUTLINE.md §7',
        'formats': {
            'sheet': {'width': 1536, 'height': 1024, 'cells': 8, 'cols': 4, 'rows': 2, 'cell': [384, 512]},
            'sheet6': {'width': 1536, 'height': 1024, 'frames': 6, 'cols': 3, 'rows': 2, 'cell': [512, 512]},
            'master': {'width': 1024, 'height': 1536},
            'plate': {'width': 2172, 'height': 724},
            'story': {'width': 1280, 'height': 720},
            'portrait': {'width': 256, 'height': 256},
            'fogBank': {'width': 2048, 'height': 256},
            'normalMaps': 'spike-art/tools/nmap.py',
        },
        'houseStyle': 'spike-art/HOUSE_STYLE.txt',
        'rileyRule': RILEY_RULE,
        'rileyAttach': RILEY_ATTACH,
        'characterFrames': {'cultist': cult, 'draghkar': drag, 'riley': riley, 'total': cult + drag + riley},
        'items': [{k: v for k, v in it.items() if k != 'poses'} | {'poses': it['poses']} for it in ITEMS],
    }
    man_path = ROOT / 'tools' / 'stage4' / 'art-manifest.json'
    man_path.write_text(json.dumps(manifest, indent=2) + '\n')
    prompt_dir = ROOT / 'docs' / 'stage4' / 'prompts'
    prompt_dir.mkdir(parents=True, exist_ok=True)
    for old in prompt_dir.glob('*.json'):
        old.unlink()
    for it in ITEMS:
        attach = list(RILEY_ATTACH if it['riley'] else HOUSE_ATTACH)
        if it['normal']:
            attach = ['spike-art/tools/nmap.py', it['derivedFrom']]
        doc = {
            'id': it['id'],
            'file': it['file'],
            'tool': 'image-generation',
            'backupTool': 'gemini',
            'size': [it['width'], it['height']],
            'frames': it['frames'],
            'cols': it['cols'],
            'rows': it['rows'],
            'opaque': it['opaque'],
            'riley': it['riley'],
            'normal': it['normal'],
            'houseStyle': 'spike-art/HOUSE_STYLE.txt',
            'attach': attach,
            'prompt': prompt_text(it),
        }
        (prompt_dir / f"{it['id']}.json").write_text(json.dumps(doc, indent=2) + '\n')
    print(f'{len(ITEMS)} items, cultist {cult} + draghkar {drag} + riley {riley} = {cult + drag + riley}')

if __name__ == '__main__':
    main()
