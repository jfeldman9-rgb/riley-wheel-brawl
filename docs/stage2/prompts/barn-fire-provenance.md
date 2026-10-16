# Stage 2 B4: painted burning barn

Generated with ChatGPT image generation on 2026-10-03. Four generation calls produced one architectural burning edit and three independent flame-animation paintings. No fallback generator, paid API, recolouring, blur, deformation, mirroring, tween-generated frames or procedural replacement artwork was used.

## Sources and processing

- Edit reference: `art-in/barn-fire/barn-edit-reference.png`, a crop of existing `assets/bg2/bg2-mid2.webp` at `[1148,0,2172,724]`, padded below with 44 transparent pixels to make 1024×768
- Original generated barn: `art-in/barn-fire/generated/barn-burning-source.png`, 1448×1086, genuine alpha
- Generated flame sources: `art-in/barn-fire/generated/flame-{roof,eave,door}-source.png`, each 1536×1024 with genuine alpha and four separately painted cells
- Exact prompts: `docs/stage2/prompts/barn-fire.json`
- Repeatable crop, uniform half-scale frame packing and anchor registration: `art-in/barn-fire/pack_barn_fire.py`
- Generated barn was uniformly downscaled by 1024/1448 to 1024×768; no aspect-ratio distortion
- Original alpha is preserved. The apparent orange backgrounds in the raw generation previews are transparent RGB values, not opaque halos; the review contact sheets composite actual alpha on slate to verify this

## Accepted final assets

| File | Geometry | Anchor | Notes |
|---|---|---|---|
| `assets/bg2/barn-burning-overlay.png` | 1024×768 | top-left at mid2b plate (1148,0) | Same plate scale and parallax; NORMAL blend; fade in over 1500 ms |
| `assets/bg2/barn-flame-roof.png` | 4 × 256×384 | (128,350) in every cell | Source cells 1–4; suggested 8 fps loop |
| `assets/bg2/barn-flame-eave.png` | 3 × 256×384 | (128,350) in every cell | Source cells 1–3; suggested 7 fps loop |
| `assets/bg2/barn-flame-door.png` | 4 × 256×384 | (128,350) in every cell | Source cells 1–4; suggested 9 fps loop |

`assets/bg2/barn-fire.json` contains source hashes, per-frame crop bounds, source feet, packing offsets, common anchors and suggested plate-pixel placements. Alpha remains unchanged except normal resampling at the stated uniform downscale. A fixed transparent canvas is used for each packed frame; anchors do not drift with changing flame height.

## Visual review

- All 12 generated flame cells were viewed individually within their full-resolution source contact strips; all 11 accepted packed cells were checked again on `docs/stage2/shots/barn-fire/painted-flame-contact-sheet.jpg`
- Eave source cell 4 was rejected because it looks too similar to cell 1. It is preserved in the source sheet for provenance but is absent from the packed animation
- Roof cells show left curl, tall central lick, right curl and lowered left curl; all four differ in silhouette and internal painted shapes
- Eave cells show three differently shaped and weighted clusters, each with a stable foot
- Door cells show two flaring tongues, a triple-tongue cluster, central fork and hooked right tongue; all four differ visibly
- Flame silhouettes are crisp and transparent outside their painted forms; no soft particle blobs are used as replacement artwork
- `docs/stage2/shots/barn-fire/barn-before-after.jpg` compares the exact original reference and the painted overlay composited over it. Roof pitch, apex, doorposts, open door shape, barrels and fences remain closely registered. This is a genuine repaint, so it is not claimed to preserve every architectural pixel exactly
- The 1024×768 crop and plate origin are exact. The upper 60 pixels are empty of visible fire, preserving banner space
- No Riley or other character assets were edited
- In-game animation, depth, banner readability and the 1.5-second transition still require an authorized running game view. Static asset review does not count as that check

## Suggested integration

Use NORMAL alpha compositing, not ADD. Put the overlay above the barn plate and below game actors. The backdrop has top-left `(mid2b.x, MID_Y - mid2b.height * midScale)`. Add `(1148 * midScale, 0)` for the overlay top-left. Its 44 transparent bottom pixels must not change the plate baseline.

Suggested animation feet in original plate pixels: roof `(1510,266)`, eave `(1885,356)`, hayloft `(1675,402)`. Suggested local scales before multiplying by `midScale`: 0.43, 0.50, 0.40. These are starting values for in-game visual review. Use each strip's fixed origin `(0.5,350/384)` and the barn plate's scroll factor. Keep ember particles small and smoke grey/non-additive in the integration.
