"""Reproducible first-pose extraction from the supplied model sheets; no generated art.
Only edge-connected neutral background is removed, preserving eye/glasses whites.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation
ROOT = Path(__file__).resolve().parents[1]
for who, box in [('riley', (0.035, .012, .306, .515)), ('twinkle', (.045, .015, .322, .505))]:
    src = Image.open(ROOT / f'assets/art/{who.split("-")[0]}-sheet.jpeg').convert('RGB')
    im = src.crop(tuple(round(v * (src.width if i % 2 == 0 else src.height)) for i,v in enumerate(box)))
    a = np.asarray(im).astype(float)
    neutral = (a.max(2)-a.min(2) < 27) & (a.mean(2) > 115)
    seed = np.zeros(neutral.shape, bool); seed[[0,-1],:] = neutral[[0,-1],:]; seed[:,[0,-1]] = neutral[:,[0,-1]]
    bg = binary_propagation(seed, mask=neutral)
    alpha = np.where(bg, 0, 255).astype('uint8')
    out=Image.fromarray(np.dstack((np.asarray(im),alpha)), 'RGBA')
    out=out.crop(out.getbbox());out.save(ROOT / f'assets/art/rig-{who}.png')
