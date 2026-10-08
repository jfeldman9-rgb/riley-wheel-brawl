# Stage 3 prop/FX sheets: painted art

The four Stage 3 prop/FX sheets used to be labelled "PLACEHOLDER" cards (hidden behind `?debug` since PR #38, with
code-drawn stand-ins for players). They are now painted ChatGPT art and load for everyone. The stand-ins in
`src/stage3-fx-art.js` only fill a key whose file failed to load (`Stage3Kit.build()` calls `paintStage3Fx`).

| key / file | sheet | frames | in game |
|---|---|---|---|
| `rooftiles` / `assets/stage3/props/prop-rooftiles.webp` | 1024×256 | 4 | Tumbling tiles that sweep a marked lane. Drawn at 0.5 (128 px), lit, 8 fps loop, 900 px/s. The art travels left; `flipX` turns it. |
| `shadowpool` / `fx-shadowpool.webp` | 1024×256 | 4 | Where the Fade will rise. Ground decal centred on the foot spot; scale 0.4→1 and alpha 0.4→1 over 0.6 s; 0.15 s per frame. Unlit. |
| `shadowburst` / `fx-shadowburst.webp` | 1536×256 | 6 | A shadow copy popping when hit, and the Fade's defeat melt. Centred 100 px above the feet, 12 fps one-shot (0.5 s). Unlit. |
| `fade_far` / `fx-fade-far.webp` | 1024×256 | 4 | One-time glimpse when zone 2 clears: the Fade bounding right across the rooftops with the blue-ribbon bundle. 10 fps loop, +700 px/s, screen y 184, scroll factor 0.3. Unlit. |

All four are drawn with origin (0.5, 0.5) and normal blend, as one row of 256×256 frames.

## Source and processing

- **Source:** ChatGPT image generation, two collages, first try, approved by Jason F via Grok Bot on 2026-10-08.
  Both are kept verbatim; the hashes are in `assets/stage3/ART_STATUS.json`, and the literal prompts are
  `prompts[1]` in `docs/stage3/prompts/*.json`.
  - `art-in/stage3fx/fx-collage-a.src.png`: magenta key. Row 1 has the 4 tile clusters, row 2 the 4 far-Fade run frames.
  - `art-in/stage3fx/fx-collage-b.src.png`: green key. Row 1 has the 4 pools; rows 2–3 have the 6 burst frames.
    Green because the shadow FX are violet, and violet can't be keyed off magenta.
- **Tool:** `tools/stage3/process_fx.py`. Running it twice writes byte-identical files.
  - **Key:** the background is the key-hue region connected to the flat key, plus a 3 px edge band. Alpha comes from
    the key excess and the colour is unmixed from the key. See-through paint is fully despilled; in collage A it
    becomes a neutral tan. So the pale-pink tile dust is grey dust, and no pink pixel is left (the tool checks this).
  - **Frames:** split by slot. Every blob goes to the slot that holds its centroid, so loose shards and wisps stay
    with their frame.
  - **Scale and registration:** one scale per effect.
    - Tiles: scale 0.66, the tile mass centred at (118, 128).
    - Pool: scale 0.72, the ellipse centred on the cell (the foot spot).
    - Burst: scale 0.54, the alpha centroid centred on the cell.
    - Fade: scale 0.45, body about 130 px, torso x locked at 150, feet on 196, the painted leap height kept.
  - **Encoding:** lossless WebP. Lossy 4:2:0 chroma smeared pink and green back into the edges.
- **Tile order 1, 2, 4, 3:** collage slot 4 nearly repeats slot 1. Played in collage order, the same pose would
  hold for two of the four frames (a hitch at 8 fps). Between 2 and 3 it alternates with the other two poses
  instead. It is still not a smooth quarter-turn rotation; a re-roll would fix that.
- **Contact sheet:** `docs/stage3/shots/contact-stage3-fx.jpg`.

## Related changes

- The code-drawn pool stand-in now sits on the foot spot (it was drawn 72 px low).
- The far-Fade glimpse now draws at depth −46 instead of −60, in front of the mid house plates and behind the
  floor. The painted mid plates (PR #30) cover the whole sky band, so at −60 the glimpse was hidden behind them
  while Riley says "There! On the far roof!".

## Budgets

- The sheets live in `assets/stage3/props/`, which the Stage 1 pre-fight sum does not count (a test keeps them there).
  The counted source shrank (`src/stage3.js` lost the `?debug` card branch).
- **GPU textures:** 4.5 MiB RGBA, the same dimensions as the canvases the stand-ins allocated, so no change.
- **Download:** about 390 KB on Stage 3 entry.
