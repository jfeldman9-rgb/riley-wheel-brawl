## Fixes in this round (`w3b`)

- Draws every cropped far, mid, and near plate at a minimum width of 896px (1.4x the 640px view), bottom anchored with top overflow. Measured `LOOP_CROPS`, narrow cross-fades, mist columns, non-mirrored painting, and floor feathers remain.
- Runtime-bakes Riley from the native top-middle side panel of `riley-sheet.jpeg`, soft-keys its grey background, ends the adult coat at the hip, continues trouser texture beneath the short tunic, enlarges/rounds the head, and uses shorter child proportions at 64 units. `rig-riley.png` is fallback only.
- Clears the offscreen skin on every draw and emits it once with source-over, removing both bounding-box tint and the prior ghosted shadow copy.
- Keeps Be'lal's sword in the animated front-hand bone for every SWORD FLURRY frame and removes the dot-like pommel/pivot marker.
- Captures oversized comparison, seam, walk, and closeup canvases through an offscreen canvas data URL instead of viewport-larger element screenshots. Each seam board instantiates its requested level, and all review JPEGs use quality 85.
- Bumps the complete runtime/cache audit stamp to `?v=20260926-w3b`.

`node tools/check.cjs` passes and `node tools/soak.cjs` clears 50/50 assisted runs. This is a text-only diff, as requested. Playwright is not installed in this checkout, so the JPEGs could not be regenerated or visually signed off here; run `node tools/review.cjs` in the documented Playwright environment.

## Headless-render defect follow-up

- Re-crops Riley at the measured `(780, 40, 320, 1140)` source rectangle and flood-keys only edge-connected grey with a soft 28-40 distance ramp. The head, short-jacket trouser fill, joints, and sole contacts now use the keyed crop and measured side-view coordinates.
- Attaches Be'lal's sword to front wrist `bones[3]`, draws its complete hilt and blade in one wrist-local transform after the body, and swings that whole object during SWORD FLURRY. A blurred-luminance crimson ramp smooths the coat re-grade.
- Adds a regression assertion for the front-wrist attachment. `node tools/check.cjs` passes and `node tools/soak.cjs` remains 50/50 assisted.

## Final integration and verification

- Riley's side view overlaps his legs, so the far (kicking) leg is now split into its own texture layer and skinned only by its own bones. This removes the black wedge that the single mesh smeared across the standing leg during kicks.
- Be'lal's front arm, not the rear arm, extends during attacks, and the sword follows the painted fist as rendered by the skin mesh.
- All review JPEGs in this directory were regenerated from this commit with `node tools/review.cjs` in headless Chromium (Playwright). `node tools/check.cjs`: all 62 checks pass. `node tools/soak.cjs`: 50/50 assisted clears.

Known remaining weaknesses: during SWORD FLURRY the hilt can sit a few pixels past Be'lal's fist; his crimson coat re-grade still shows some striping; Riley is baked from the supplied model sheet at runtime. He reads as a boy in a short jacket, but his face is the sheet's face scaled up, not new child art.

## w3c follow-up

- Zoomed stages 1-5 back to natural skyline scale (222-260px), using a non-mirrored two-tile continuation only where needed and capping parallax across the arena to keep at most one feathered join visible.
- Be'lal's sword grip now comes from the same barycentrically skinned wrist position as the painted fist, with unrestricted sword-arm skin displacement. The check samples eleven SWORD FLURRY times and enforces a sub-1.5-source-pixel attachment.
- Be'lal's coat now uses blurred luminance and a continuous dark-crimson/mid-crimson/highlight ramp with a 70% grade / 30% original blend, smooth skin protection, and retained silver/hair handling.
- The Be'lal review board now contains idle, walk, and SWORD FLURRY at `t=.2`, `.5`, and `.8`. All runtime resources and audits use `?v=20260926-w3c`. No binary review files changed in this text-only round.
- Local limitation: `node tools/review.cjs` cannot regenerate the boards in this checkout because `playwright` is not installed; run it in the documented browser-review environment for visual sign-off.
