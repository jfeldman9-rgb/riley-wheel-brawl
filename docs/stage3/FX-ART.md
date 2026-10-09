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

- **Source:** ChatGPT image generation, approved by Jason F via Grok Bot on 2026-10-08: two collages (first try)
  and a re-roll of the tile row. All three are kept verbatim; the hashes are in `assets/stage3/ART_STATUS.json`,
  and the prompts are `prompts[1]` (collages) and `prompts[2]` (tile re-roll) in `docs/stage3/prompts/*.json`.
  - `art-in/stage3fx/fx-collage-a.src.png`: magenta key. Row 2 has the 4 far-Fade run frames. Row 1 (the v1 tiles,
    shipped in PR #40) is superseded by the re-roll and no longer read.
  - `art-in/stage3fx/fx-tiles-v2.src.png`: one row of 4 bright red-orange three-tile clusters, no dust, on a
    magenta backdrop with a faint texture and gradient (not flat).
  - `art-in/stage3fx/fx-collage-b.src.png`: green key. Row 1 has the 4 pools; rows 2–3 have the 6 burst frames.
    Green because the shadow FX are violet, and violet can't be keyed off magenta.
- **Tool:** `tools/stage3/process_fx.py`. Running it twice writes byte-identical files.
  - **Key:** the background is the key-hue region connected to the flat key, plus a 3 px edge band. Alpha comes from
    the key excess and the colour is unmixed from the key. See-through paint is fully despilled; in collage A it
    becomes a neutral tan, so no pink pixel is left (the tool checks this).
    The tile re-roll's backdrop is not flat, so `key_local()` keys it against a smooth local key colour (a
    normalised Gaussian of clean backdrop pixels) and solves alpha only in a 3 px band around the paint; the rest of
    the backdrop is fully clear whatever its texture. Every visible tile pixel is despilled to min(R,B) ≤ G (no cap).
  - **Frames:** split by slot. Every blob goes to the slot that holds its centroid, so loose shards and wisps stay
    with their frame.
  - **Scale and registration:** one scale per effect.
    - Tiles: scale 0.76, the alpha centroid on the cell centre (the pivot a spin turns about). In game the cluster
      is about 80–95 px wide and 95–110 px tall (v1's tile mass was about 80×70), still inside the 120 px the hit
      test covers (`hitDx` 60).
    - Pool: scale 0.72, the ellipse centred on the cell (the foot spot).
    - Burst: scale 0.54, the alpha centroid centred on the cell.
    - Fade: scale 0.45, body about 130 px, torso x locked at 150, feet on 196, the painted leap height kept.
  - **Encoding:** lossless WebP. Lossy 4:2:0 chroma smeared pink and green back into the edges.
- **Tile order 1, 2, 3, 4 (the painted order):** the art travels left and turns anticlockwise; `flipX` makes it
  turn clockwise for tiles flying right, which is the right way to roll. To choose the order, each pair of frames
  was rotation-matched (silhouette overlap plus shading correlation, about the alpha centroid):
  - Best quarter-turn matches for 1→2→3→4→1 are about +122°, +84°, +116° and +38° anticlockwise, one full turn per
    loop. No other order turns anticlockwise all the way round.
  - The cluster is nearly three-fold symmetric, so a 90° step also looks like a 30° step the other way. On the
    nearest-match reading (what the eye picks at 8 fps), 1, 2, 3, 4 steps +12°, +6°, −14°, +36°: a net anticlockwise
    turn with one small backward tick at 3→4. Every other order nets clockwise or has a step near 180° with no
    direction.
  - v1 (PR #40, order 1, 2, 4, 3) read +32°, −32°, −34°, +34°: back and forth with no net turn, the rattle Jason saw.
  So v2 reads as a turning cluster rather than a rattle, but it is not a clean rigid roll. A cleaner tumble would
  need frames that are true rigid rotations, or a cluster that is not three-fold symmetric.
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
