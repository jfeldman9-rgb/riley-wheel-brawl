# Stage 3 plates still needed

The files in `assets/bg3/` are labelled half-resolution stand-in cards (1086×362). The campaign loads those exact relative paths. While a plate's source is that size, `src/stage3-art.js` paints a deterministic Caemlyn stand-in into the same texture so Stage 3 is playable. The paint keeps the placeholder dimensions, so `plateScale` (double scale when `width * 2 === 2172`), floor tiling, parallax, and light positions stay aligned.

These stand-ins are not the production paintings. Replace the bytes below with the prompted 2172×724 plates (see `docs/stage3/prompts/`). A wider source skips the procedural paint and uses the file as-is. Do not flip `placeholder` in `assets/stage3/ART_STATUS.json` until the usual provenance (source, tries, contact sheet) is filled in.

| Texture key | File the game loads | Prompt | What the painting is |
| --- | --- | --- | --- |
| `far3_day` | `assets/bg3/bg3-far-day.jpg` | `docs/stage3/prompts/bg3-far-day.json` | Caemlyn from far off in golden afternoon: palace hill, outer wall, New City roofs. Opaque, 2172×724. |
| `far3_night` | `assets/bg3/bg3-far-night.jpg` | `docs/stage3/prompts/bg3-far-night.json` | The same skyline at night: indigo sky, torch-lit domes, cool moon rims. Opaque, 2172×724. |
| `mid3a` | `assets/bg3/bg3-mid.webp` | `docs/stage3/prompts/bg3-mid.json` | Left: New City market street. Right: the Queen's Blessing inn. Transparent sky, 2172×724. |
| `mid3b` | `assets/bg3/bg3-mid2.webp` | `docs/stage3/prompts/bg3-mid2.json` | Left: rooftops at sunset. Right: the royal palace garden at night. Transparent sky, 2172×724. |
| `floor3a` | `assets/bg3/bg3-floor.jpg` | `docs/stage3/prompts/bg3-floor.json` | Pale cobbles, seamless horizontally, 2172×724. |
| `floor3b` | `assets/bg3/bg3-floor2.jpg` | `docs/stage3/prompts/bg3-floor2.json` | Lead rooftop walkway at sunset, seamless horizontally, 2172×724. |
| `floor3c` | `assets/bg3/bg3-floor3.jpg` | `docs/stage3/prompts/bg3-floor3.json` | Moonlit garden gravel path, seamless horizontally, 2172×724. |

Normal maps (`*_n.webp`) stay the flat cards shipped with the placeholders. They are not replaced by the procedural stand-in.

Character sheets under `assets/stage3/chars/` are still marked `placeholder: true`. The yellow `PLACEHOLDER ART` tag is hidden only while a Stage 3 scene has `stage3Painted` set, because the backdrop was generated in memory. Shipping the real plates and clearing those character flags is what removes the stand-in for good.

## Status 2026-10-07: painted plates shipped (branch `rwb-w2-s3-plates`)

All seven plates are now painted, cel-style backgrounds (Grok Bot image generation, 1280×720 sources kept verbatim in `art-in/bg3/*.src.jpg`), post-processed by `tools/stage3/process_bg3_plates.py`. None of them is 1086×362 any more, so `ensureStage3Plates` returns early and the procedural stand-in no longer paints.

| Texture key | Shipped size | Processing |
| --- | --- | --- |
| `far3_day`, `far3_night` | 1280×427 | 3:1 band, rows 90–517 of the source at native resolution (the skyline sits around 47% of the height). |
| `mid3a`, `mid3b` | 2172×724 | 3:1 band with the street or parapet on the bottom edge. The flat magenta sky is keyed to real alpha with a soft edge, colour unmix and despill, then a premultiplied Lanczos upscale. |
| `floor3a`, `floor3b`, `floor3c` | 1080×360 | Horizontal light flattening and a min-error-seam horizontal wrap, so each plate tiles seamlessly. `floor3a`'s centre gutter is cut out. Periodic Lanczos resample. |

The far and floor plates are below 2172×724 on purpose. `tests/stage3-memory.test.mjs` caps the Stage 3 resident RGBA estimate at 110 MB, and seven full-size plates would come to about 131 MB. `farImg` sizes the far plate from the texture, and the floor tile scale is `fh / height`, so the on-screen layout is unchanged. The mid plates stay at 2172×724 because `plateScale` and the torch coordinates in `lights.json` assume that width. `tools/stage3/art-manifest.json` records the shipped sizes, and its `normalSize` field records the untouched 1086×362 flat normal cards.

**Approved 2026-10-07.** Jason approved these seven stills, so their `ART_STATUS.json` entries are `placeholder: false` with `source: "grokbot-image"`, `contactSheet`, and an `art` provenance block (`approvedBy`, source sha256, post-process). `tests/stage3-assets.test.mjs` allows that source only for these seven ids (`APPROVED_STILLS`). The prompt JSONs record `tries: 1` and `generatedWith`. `assets/bg3/plates.json` now carries `placeholder: false`.

The in-game `PLACEHOLDER ART` tag still shows in Stage 3, because `placeholderArt` (`src/hud.js`) also counts the character sheets. `cutthroat`, `fade` and `riley3` are still `placeholder: true` in their `anims.json`.

Follow-ups in the same PR:
- **Floor hand-offs** (world x 2540 and 3880): the next floor now fades in over 280 px with corner alphas `setAlpha(0, 1, 0, 1)`. It used to be a 200 px strip at 0.5 alpha.
- **mid3a → mid3b cut:** mid3b's left 240 px ease into a cool shadow. A pure alpha feather showed the far plate through translucent roofs.
- **Torches** (`lights.json`): they now sit on the painted lanterns. On mid3a that is the inn door pair at (1615,424) and (1835,422). On mid3b it is the rooftop street lamp (308,493) and the garden lanterns (1228,577), (1410,384), (1908,387) for the pair, (1914,547) and (2045,580).
