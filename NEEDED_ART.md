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
