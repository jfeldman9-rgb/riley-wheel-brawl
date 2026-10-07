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
