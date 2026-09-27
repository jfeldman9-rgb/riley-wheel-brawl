# Painted art the scroller still wants

No new images were generated for this pass. While Riley walks, the far plate scrolls at 0.08× the floor, the mid ground is a strip of slices of that stage's own mid plate at 0.40×, and the near plate tiles at 1.15×. Nothing is cropped up, crossfaded, or mirrored. Gaps between mid slices are 48 units or a recorded wider gap forced by the rule that one slice never appears twice inside a 640-unit window; the far plate shows through those gaps.

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

## What not to paint again

Riley stays the muscular 16-year-old `assets/art/riley16/` set. Be'lal stays the painted frames with the sword already in his hand. Floors stay the quilted loops. Do not mirror a plate to fake a second screen.
