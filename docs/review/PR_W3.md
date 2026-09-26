## Fixes in this round (`w3b`)

- Draws every cropped far, mid, and near plate at a minimum width of 896px (1.4x the 640px view), bottom anchored with top overflow. Measured `LOOP_CROPS`, narrow cross-fades, mist columns, non-mirrored painting, and floor feathers remain.
- Runtime-bakes Riley from the native top-middle side panel of `riley-sheet.jpeg`, soft-keys its grey background, ends the adult coat at the hip, continues trouser texture beneath the short tunic, enlarges/rounds the head, and uses shorter child proportions at 64 units. `rig-riley.png` is fallback only.
- Clears the offscreen skin on every draw and emits it once with source-over, removing both bounding-box tint and the prior ghosted shadow copy.
- Keeps Be'lal's sword in the animated front-hand bone for every SWORD FLURRY frame and removes the dot-like pommel/pivot marker.
- Captures oversized comparison, seam, walk, and closeup canvases through an offscreen canvas data URL instead of viewport-larger element screenshots. Each seam board instantiates its requested level, and all review JPEGs use quality 85.
- Bumps the complete runtime/cache audit stamp to `?v=20260926-w3b`.

`node tools/check.cjs` passes and `node tools/soak.cjs` clears 50/50 assisted runs. This is a text-only diff, as requested. Playwright is not installed in this checkout, so the JPEGs could not be regenerated or visually signed off here; run `node tools/review.cjs` in the documented Playwright environment.
