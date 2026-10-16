"""Pack accepted ChatGPT paintings; no new art is drawn here.

Only cropping, uniform downsampling and anchor registration are used.
Run from the repository root with python3 art-in/barn-fire/pack_barn_fire.py.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-in/barn-fire/generated'
DST = ROOT / 'assets/bg2'
SHOT = ROOT / 'docs/stage2/shots/barn-fire'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

original = Image.open(ROOT / 'assets/bg2/bg2-mid2.webp').convert('RGBA')
burn = Image.open(SRC / 'barn-burning-source.png').convert('RGBA')
assert burn.size == (1448, 1086)
burn = burn.resize((1024, 768), Image.Resampling.LANCZOS)
burn.save(DST / 'barn-burning-overlay.png')
metadata = {
    'source': 'ChatGPT built-in image_gen, 2026-10-03',
    'postprocessing': 'Crop, uniform downscale and anchor registration/packing only; generated alpha preserved.',
    'overlay': {'file': 'assets/bg2/barn-burning-overlay.png', 'width': 1024, 'height': 768,
        'plate': 'bg2-mid2', 'plateIndex': 1, 'plateOrigin': {'x': 1148, 'y': 0},
        'origin': {'x': 0, 'y': 0}, 'sourceCrop': [1148, 0, 2172, 724],
        'sourcePaddingBottom': 44, 'uniformScaleFromGenerated': 1024/1448,
        'blendMode': 'NORMAL', 'fadeInMilliseconds': 1500,
        'sourceSHA256': sha(SRC / 'barn-burning-source.png')},
    'strips': [],
    'suggestedPlacementsPlatePixels': [
        {'strip': 'roof', 'x': 1510, 'y': 266, 'scale': 0.43},
        {'strip': 'eave', 'x': 1885, 'y': 356, 'scale': 0.5},
        {'strip': 'door', 'x': 1675, 'y': 402, 'scale': 0.40}],
    'placementNote': 'Coordinates/scales are in plate pixels; multiply positions and strip scale by the mid plate scale. Same parallax as mid2b; NORMAL blend. Confirm final placement in game.'
}
review = Image.new('RGB', (1024, 1200), (58, 66, 83))
draw = ImageDraw.Draw(review)
draw.text((20, 10), 'B4 painted flame frames | actual alpha composited on slate | selected frames only', fill='white')
for row, (name, indices, fps) in enumerate([('roof', [0,1,2,3], 8), ('eave', [0,1,2], 7), ('door', [0,1,2,3], 9)]):
    source_path = SRC / f'flame-{name}-source.png'
    im = Image.open(source_path).convert('RGBA')
    assert im.size == (1536,1024)
    strip = Image.new('RGBA', (256*len(indices), 384))
    frames = []
    for out_index, source_index in enumerate(indices):
        cell = im.crop((source_index*384,0,(source_index+1)*384,1024))
        a = cell.getchannel('A')
        visible = a.point(lambda v: 255 if v >= 128 else 0).getbbox()
        bottom = visible[3] - 1
        xs = [x for y in range(bottom-5,bottom+1) for x in range(384) if a.getpixel((x,y)) >= 128]
        foot_x = sum(xs)/len(xs)
        # Use one common source crop and exactly 1/2 downscale for every frame.
        scaled = cell.crop((0,128,384,896)).resize((192,384),Image.Resampling.LANCZOS)
        offset_x = round(128 - foot_x*0.5)
        offset_y = round(350 - (bottom-128)*0.5)
        packed = Image.new('RGBA',(256,384))
        packed.alpha_composite(scaled,(offset_x,offset_y))
        strip.alpha_composite(packed,(out_index*256,0))
        review.paste(packed,(out_index*256,38+row*385),packed)
        draw.text((out_index*256+12,42+row*385),f'{name} {out_index+1} (source {source_index+1})',fill='white')
        frame = {'index': out_index, 'sourceCell': source_index+1,
            'sourceVisibleBoundsAlpha128': list(visible),
            'sourceFoot': {'x': round(foot_x,3), 'y': bottom},
            'packedOffset': {'x':offset_x,'y':offset_y},
            'frameSHA256': hashlib.sha256(packed.tobytes()).hexdigest()}
        frames.append(frame)
        packed.save(ROOT / f'art-in/barn-fire/{name}-{out_index+1:02}.png')
    strip.save(DST / f'barn-flame-{name}.png')
    metadata['strips'].append({'name':name,'file':f'assets/bg2/barn-flame-{name}.png',
        'frameWidth':256,'frameHeight':384,'frameCount':len(indices),
        'anchor':{'x':128,'y':350},'origin':{'x':0.5,'y':350/384},
        'frameRate':fps,'repeat':-1,'blendMode':'NORMAL',
        'sourceSHA256':sha(source_path),'frames':frames,
        'rejectedSourceCells':[4] if name=='eave' else [],
        'rejectionReason':'Source cell 4 too similar to cell 1; excluded rather than counting it as a new frame.' if name=='eave' else None})
review.save(SHOT / 'painted-flame-contact-sheet.jpg',quality=94)
(DST/'barn-fire.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps({'overlay':metadata['overlay'],'strips':[{k:s[k] for k in ['name','file','frameCount','frameWidth','frameHeight','anchor']} for s in metadata['strips']]},indent=2))
