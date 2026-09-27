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

## w3c Riley 16 sprite and Stage 1 repeat follow-up

- Replaced the Riley puppet path with the ten anchored `riley16` runtime frames. All frames use one 96-world-unit idle scale, face right in source, mirror around the authored body/foot anchor, and map walk, hand attack, kick, channel, hurt, airborne, and lying states without puppet deformation. Walk frames advance from travelled distance and stop with movement.
- Riley's HUD and dialogue portrait now use `riley16/portrait.png`. The old Riley rig and sheet remain committed but unused. Riley is 96 units against the regular Trolloc's 112 units; all other painted puppet heights were increased by approximately 1.12 without gameplay geometry changes, while Riley's hurtbox alone was raised to 92.
- Stage 1 mid and near paintings render as one 720-unit-wide, bottom-anchored plate, preventing a repeated inn inside the 640-unit view. Far skies render as a single 700-unit plate with capped parallax, avoiding the vertical tone seam without mirroring.
- `check.cjs` now gates all ten Riley frames plus portrait, the four-frame distance walk, 90-100 unit idle height, and the 0.80-0.90 Riley/Trolloc ratio. `review.cjs` now composes every Riley frame through `Riley.drawSprite`, includes an eight-step runtime walk strip and a same-scale Trolloc, and retains Be'lal, Lido, seam, and character boards.
- `node tools/check.cjs` passes. `node tools/soak.cjs` clears 50/50 assisted seeds in under six seconds locally. The cache/resource stamp remains `?v=20260926-w3c`.
- Not achieved locally: the text-only request leaves all committed JPEGs unchanged, and `node tools/review.cjs` cannot regenerate them because this checkout does not contain the `playwright` module. The updated review generator is ready for the documented browser environment.

### w3c integration notes

- Be'lal's sword arm keeps its painted fist during SWORD FLURRY. The blade swings about the fist, and a shorter grip puts the crossguard at the knuckles, so the hilt never separates from the hand.
- The Riley frames in `assets/art/riley16/` were sliced from the supplied 16-year-old sheet. All frames share one scale, a common foot baseline and a body-centred anchor; the fireball frame is anchored on his body, not the flame. The HUD portrait is a crop of the idle face.
- All review JPEGs were regenerated from this commit in headless Chromium.

### w3d

- The tan box with an X was the procedural breakable crate/barrel (`BreakableProp`), not a missing asset. It never had painted art, so it no longer spawns. Its reward (angreal, then heal/spark) now appears directly as a glowing pickup at the same spot.
- Riley has a thin warm rim and contact shadow. When a nearer actor covers him (depth is sorted by foot y), a faint ghost of him is drawn on top so he is never lost in a pack.
- Stage 3's Mashadar fog is now drifting ground mist with soft animated lane seams, replacing the dashed debug rectangle.
- Review fight captures use the first natural frame where Riley is on screen, not hurt or invulnerable, and not covered by a nearer enemy. `riley-closeup` is wider and shows Riley idle beside a full Trolloc at the same world scale.
- Stamp `?v=20260926-w3d`.

### w3e

- Be'lal now uses frames from the supplied painted sheet (`assets/art/belal/`). There are ten frames: idle, walk1-4, windup, slash, lunge, hurt and cast. They share one scale, one foot baseline and a body anchor. The sheet faces left and is mirrored when he faces right. The sword is part of the painting, so it can never separate from his hand.
  - SWORD FLURRY: the tell uses the windup frame. The active window goes windup → slash → lunge.
  - BALEFIRE and WEAVE SNARE use the cast frame.
  - Hurt, knockdown and death use the hurt frame (rotated when he is down, and fading on death).
  - Walk steps through four frames by distance travelled.
  - His dialogue portrait is a crop of the idle face. The composited rig sword is no longer drawn for him.
  - `belal-closeup.jpeg` renders every state through the runtime `RWB.drawBelal`.
- Floors: each floor painting is pre-quilted offline into a seamless loop (`floorN-loop.jpeg`). The loop is cut along a minimum-error path through a 260px overlap, so the join follows cracks and snow edges instead of a straight vertical line. Each loop spans 1100 units (over 1.7 screens), so no floor landmark repeats inside one view. The original non-looping floor files were removed.
- Mid, near and far plates on stages 2-5, including the Black Tower roof sky, are drawn once at full source width (700 units), so no building or ruin appears twice on screen. The old loop dissolve was removed because no plate wraps inside the camera range anymore.
- `seams-stage*.jpeg` now shows the full 640-unit view at four camera positions. Stage 5 shows both the interior (wave 3) and the roof (wave 5).
- `check.txt` prints the cache stamp. Stamp `?v=20260926-w3e`.

### w3f

- The HUD stage banner used to append "CALLANDOR" whenever Riley carried the sword, so Stage 5 (the Black Tower) was titled CALLANDOR. The banner now shows `STAGE N` above the stage's own title: EMOND'S FIELD, CAEMLYN, SHADAR LOGOTH, TEAR - CALLANDOR, THE BLACK TOWER. Gameplay is unchanged; Riley still visibly wields Callandor in Stage 5.
- Stamp `?v=20260926-w3f`, because hud.js and campaign.js changed.
