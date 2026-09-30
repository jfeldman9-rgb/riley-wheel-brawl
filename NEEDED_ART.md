# Painted art the scroller still wants

Scroll9 adds the two delivered transition paintings described below; no Riley art was changed. While Riley walks, the far plate scrolls at 0.08× the floor, the mid ground is a strip of slices of that stage's own mid plate at 0.40×, and the near plate tiles at 1.15×. Nothing is cropped up, crossfaded, or mirrored. Gaps between mid slices are 48 units or a recorded wider gap forced by the rule that one slice never appears twice inside a 640-unit window; the far plate shows through those gaps.

Each stage's slice pool is the same three ways (`MID_STRIPS[n].pools`). A new side-on street-front mid plate can replace one pool without changing the layout code. Two new plates per stage are what would replace the slice pools below. Stage 5's second plate is a roof mid.

## Emond's Field (stage 1)

Existing: `stage1-far`, `stage1-mid`, `stage1-near`, `floor1-loop`. Slices of `stage1-mid` (1672px): A 0–550, B 550–903, C 903–1672.

- Village street, side-on — cottages and the road out, one continuous frontage to replace pool 0.
- Winespring Inn and the Green, side-on — the inn front and the green, to replace pool 1. Pool 2 can stay the village street until a third plate exists.

## Caemlyn (stage 2)

Existing: `stage2-far`, `stage2-mid`, `stage2-near`, `floor2-loop`. Slices of `stage2-mid` (1774px): A 0–352, B 352–762, C 762–1398, D 1398–1774.

- The gates, side-on — wall and gatehouse as a street front, replacing pool 0.
- Inner-city shops, side-on — the streets toward the palace, replacing pool 1.

## Shadar Logoth (stage 3)

Existing: `stage3-far`, `stage3-mid`, `stage3-near`, `floor3-loop`. Slices of `stage3-mid` (1774px): A 0–422, B 422–1065, C 1065–1774.

- The ruins, side-on — broken stone frontage, replacing pool 0.
- Mashadar street, side-on — the fog-lit street as a painting, replacing pool 1. The hazard itself stays gameplay, not a stand-in plate.

## Stone of Tear (stage 4)

Existing: `stage4-far`, `stage4-mid`, `stage4-near`, `floor4-loop`. Slices of `stage4-mid` (2172px): A 0–697, B 697–1460, C 1460–2172.

- Stone halls, side-on — the first corridors as a continuous wall, replacing pool 0.
- Inner Stone, side-on — the deeper hall, replacing pool 1.

## The Black Tower (stage 5)

Existing: `stage5-far`, `stage5-mid`, `stage5-near`, `floor5-loop`, and for the locked roof arena `stage5-roof-far` plus `floor-roof`. The roof swap is a hard cut under a 0.2s black fade. There is no roof mid. Slices of `stage5-mid` (2172px): A 0–546, B 546–1344, C 1344–2172.

- Tower grounds, side-on — the yard frontage, replacing pool 0.
- The roof, side-on — a roof mid plate (the second plate) to sit with `stage5-roof-far` and `floor-roof`. There is still no roof near plate; the ground near strip stays until one exists.

## Riley's walk

Riley stays the muscular 16-year-old `assets/art/riley16/` set until the redraw. The four current walk frames are the same wide stance: the boots sit about 53 units apart, with no contact phase and no passing phase. A sub-pose shift inside ±4 units cannot reach a 30 u/s slip target, and it brings back the hop that was removed. The redraw is the sleeveless black Asha'man coat, and it needs at least 8 walk frames: contact, down, passing, and up for each leg. A step is about 55 units (110 units per cycle). `frames.json` should give a planted-sole x for every frame so the sole can stay down while the body tracks the hitbox.

## Joins the current plates cannot close

The S4 and S5 min-error seams are a per-pixel pick from the plates that already exist. They do not blur, average, or regrade. The ±40 unit window is still above 4×, so these joins stay a fail until new paintings exist:

- Stage 4 needs a blue-to-red hall bay whose floor line matches plate c. Plate b's wall base sits near 0.84 of the plate height and plate c's near 0.70, so a seam in the existing bays still steps the floor and can leave a pillar or brazier cut in the ±40 unit window.
- Stage 5 needs a bridge-to-camp gate. Plate a is the stone bridge and plate b is the wooden palisade. No quiet column on either plate hides that change, and a hard seam through the overlap still slices stone into wood.

Measured on this branch (check.cjs, one run): S4 b winMax 5.709 (fadeMax 5.217), S4 c winMax 6.568 (fadeMax 2.794), S5 b winMax 9.651 (fadeMax 8.546), S5 second copy winMax 7.956 (fadeMax 4.407). Scroll7's crossfades were S4 5.321 / 6.537 and S5 6.014 / 4.026. The hard seam did not bring either stage under 4×.

## What not to paint again

Riley stays the muscular 16-year-old `assets/art/riley16/` set until that redraw. Be'lal stays the painted frames with the sword already in his hand. Floors stay the quilted loops. Do not mirror a plate to fake a second screen.

## scroll9 transition delivery

The two delivered raw paintings are now runtime plates:

- `stage4-transition-bc.webp` is 2172×724, quality 90. It follows the blue-pillar `stage4-mid-b` and precedes `stage4-mid-c`.
- `stage5-transition-ab.webp` is 2300×724, quality 90. It follows the original bridge `stage5-mid` and precedes `stage5-mid-b`.

Both were uniformly scaled and top-cropped with the existing plate convention. The detected floor landmark lands at row 574 on the S4 transition (the source has only enough pixels below it for row 574, four pixels above the row-570 target) and row 520 on the S5 transition. Runtime joins are hard vertical cuts through overlapping whole plates. There is no crossfade, blur, edge recolour, mirror, per-column correction, or pixel averaging at a join. The old scroll8 S4/S5 min-error and edge-colour work is not applied to either transition plate.

The scroll9 container did not include Playwright or a Chromium executable, and npm package download returned HTTP 403. `node tools/joinscan.cjs` was therefore attempted but could not execute; no join number is claimed for the new edges. Visually and geometrically, S4 retains a four-pixel floor-row offset at the transition crop and must be treated as an open art mismatch rather than hidden. The S5 transition is on the row-520 target.

The scroll8 cold-entry regression was the synchronous all-pose atlas build in `prepareStage`: it moved idle, walk, hurt, attack, cast, air, and channel rasterization for every current-stage rig onto entry. Scroll9 synchronously prepares only the idle poses needed by frame one and puts every other pose back onto the bounded, resumable bake queue. Walks are priority 2; boss rigs are priority 1. Unlike scroll7's one-whole-rig prefetch, every queued job retains scroll8's vertex/face slicing, so a clear-screen or fade-in pump cannot intentionally run a full rig in one step.

Mashadar's visible callout is HUD-space text at y=122, or y=134 while another warning is active. Riley's world hurt lane begins around y=224 (lane center 246 minus the hazard's 22-unit half-depth), so the closest configuration retains a 90-unit vertical separation. The callout is not projected into world space and cannot move with the lane or camera.

## scroll10 continuous panorama delivery

Stages 4 and 5 now use one uninterrupted mid-ground painting apiece. `stage4-mid-cont.webp` is 3667×724 and `stage5-mid-cont.webp` is 4169×724; both use quality 90 and alpha quality 100. They were uniformly scaled with the same 1.061× (S4) and 1.123× (S5) plate conventions and bottom-limited top crops. Stage 5 retains its source alpha channel. No blur, average, recolour, darkening, mirror, feather, cross-fade, repeat, or second plate is applied. The old S4/S5 street slices and transition plates remain in the repository for provenance but are absent from the runtime manifest and are not requested. The S4 boss arena and S5 roof art are unchanged.

At the 4240-unit level length, camera travel is 3600 units and the 0.40× layer requires 2080.00 world units. At the established 2172 px / 700 world-unit density, S4 supplies 1181.81 units (3667 px), short by 898.19 units (2786.94 panorama px); S5 supplies 1343.60 units (4169 px), short by 736.40 units (2284.94 panorama px). Each panorama therefore scrolls at exactly 0.40× until its right edge reaches the viewport, then clamps there. It is never tiled, repeated, mirrored, stitched, or replaced during the walkable street. The S5 roof still makes its existing hard cut under the existing black fade and does not use the street panorama.

The scroll10 join assertions treat S4 and S5 as continuous layers: exactly one mid piece and zero joins for each stage. `joinscan.cjs` reports those counts rather than inventing a seam score where no seam exists. The performance, brightness, memory, natural-clear, and save measurements belong in the scroll10 check output; they are not inferred from the source images.

## scroll11 Black Tower dusk correction

The 1376×768 `stage5-far.jpeg` is the far asset drawn throughout the street; the 1376×688 `stage5-roof-far.jpeg` is selected only after the roof transition. At street cameras 150, 1990, 3030, and 3430 the far plate is drawn at 928×518.51 logical units, y = -194.96, and x = -12, -159.2, -242.4, and -274.4 respectively. It therefore covers the viewport at every camera. There was no missing load, fallback, roof-plate mix-up, or exhausted far plate. The exposed pixels are the far plate seen through `stage5-mid-cont.webp`'s transparent sky.

The fault was the old whole-plate `saturate(0.80) brightness(1.90) contrast(1.14)` far grade. It was written for the earlier mid treatment and clipped the late-camera daylight sky to RGB 255/255/255. At camera 3430, all 121 transparent sample pixels read luminance 255 in the browser measurement (mid 39.9, ratio 6.391). Scroll11 replaces that filter with a whole-plate `saturate(0.20) brightness(0.03) contrast(0.70)` Black Tower dusk grade. Every pixel of the rendered far plate receives the same transform; there is no position, camera, sample-window, alpha, or strip special case, and no blur. Neither source art nor any Riley asset changed.

`tools/check.cjs` now measures all four required street cameras (150, 1990, 3030, and 3430) rather than only camera 3430. The source images, dimensions, panorama clamp, camera factors, and sample rectangle are unchanged.

## sol61 Riley/Callandor delivery

The runtime Riley set now has eight registered walk cadence slots (`walk1`–`walk8`) and explicit hand anchors for every frame. The existing supplied muscular teen paintings already carry the sleeveless black high-collar Asha'man silhouette, black trousers/boots and glasses; no background plate was edited. Callandor is deliberately code-rendered into a cached 24×92 transparent canvas so its facets remain crisp and its orientation can follow each pose. A future bespoke painting pass could replace the four cadence-derived in-between PNGs with unique painted down/passing poses without changing the atlas contract.

## sol61 r3 resolved

The Riley redraw is no longer needed: all 19 supplied `assets/art/riley16-v2/` paintings are wired directly, including the genuine eight-pose contact/down/pass/up walk and five additional action/recovery poses. The prior stamped-coat generator and baked frame set were retired. Future art requests should preserve the current 96-unit scale, transparent pixels, pelvis anchors, and sole baseline; do not mirror, stamp, or composite over these paintings.

## sol61 r5 status

No new Riley art is requested. Round 5 changes only the measured foot/hand anchor tables and runtime code; every painted `riley16-v2` PNG remains untouched. The stored foot table is walk1 `[15.1,0,front,4]`, walk2 `[8.8,0,front,4]`, walk3 `[1.7,0,front,4]`, walk4 `[-11.7,-1.3,rear,4]`, walk5 `[17.6,0,front,4]`, walk6 `[9.6,0,front,4]`, walk7 `[0,0,front,4]`, and walk8 `[-13.4,0,rear,4]`, in actor units relative to each frame anchor.
