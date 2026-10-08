# Draghkar: stills needed for real art

The cultist sheet is now a reskin of the painted archer atlas (`tools/stage4/reskin_cultist.py`).
The Draghkar can't be done the same way. No painted atlas in the repo has wings or a gaunt, unarmed body.
Byar, the Fade and the zealot all carry a shield and sword across the silhouette, and wings would have to be drawn in code over a painted body.
So the Draghkar sheet (`s4drag`) and the HUD portrait (`draghkarPortrait`) stay code-drawn until these stills exist.

## What to generate

The same character in every image. Generate the master first and use it as the reference for the rest.

- **Character:** a tall, gaunt, pale humanoid, about 8.5 heads tall, with long thin limbs and long fingers ending in dark claws.
- **Skin:** bone-white to grey.
- **Face:** beautiful but wrong. Eyes completely black: no whites, no pupils, no glow.
- **Wings:** large, dark, membranous, bat-like wings (charcoal to black with a faint violet sheen) growing from the shoulder blades. Fully spread, the span is about 2× body height.
- **Clothes:** dark, close-fitting, tattered clothing (teen/adult tone: menacing, not sexualised, no gore).
- **Style:** the house style in `spike-art/HOUSE_STYLE.txt`: Streets of Rage 4-like hand-drawn HD sprite art, dark ink outlines, 2-3 cel tones, a soft key light from the upper left and a cool rim light on the right. Not pixel art, not 3D, not photoreal.
- **Facing:** RIGHT in every pose, side or slight 3/4 view. The game mirrors the sprite to turn.
- **Canvas:** 1024 × 1280 px for every pose. Keep the same character scale in every image: head to feet about 760 px when standing.
- **Ground line:** the lowest toe on the same bottom line, about 1220 px from the top, in every upright pose. The game anchors the sprite at the feet and lifts it for flight in code, so hover poses still put the feet near that line.
- **Framing:** the whole figure, wingtips included, inside the frame with margin.
- **Background:** flat pure magenta `#FF00FF` (or real transparency). No floor, no cast shadow, no glow, no text or labels. No magenta or pink anywhere on the character.

| # | Pose | Used for (game states) | Description |
|---|------|------------------------|-------------|
| 0 | hover, wings up | perch, takeoff, intro, swoop tell (alternates with #1 at about 3.5 Hz) | Airborne, body upright, legs hanging, wings raised high at the top of the upstroke, claws half open |
| 1 | hover, wings down | same as #0 | Exactly the same body position as #0, wings swept fully down. #0 and #1 must loop as a two-frame flap |
| 2 | swoop dive | swoop_dive | Body nearly horizontal, diving forward and down to the right, wings swept back, claws reaching forward |
| 3 | grounded stance | landed / default | Standing, slightly hunched and predatory, wings half folded behind, arms loose with claws visible |
| 4 | claw / buffet | claw, buffet | Grounded lunge: one clawed hand slashing forward, wings flared forward in a buffet |
| 5 | croon (song) | croon | Standing tall, head tilted back, mouth slightly open as if singing, arms opening outward, wings spread wide and still. Hypnotic. The game draws the song rings on top |
| 6 | kiss | kiss tell, lunge, hold | Lunging forward and down, both hands reaching to seize, face pushed forward, lips parted, wings curling forward to enclose. No gore |
| 7 | reel | reels, kiss recoil | Recoiling back to the LEFT, one arm thrown up to shield the face from light, wings flaring backward |
| 8 | down | counter_down, down, getup | Knocked to the ground on its back or side, wings crumpled under and around it |
| 9 | ash | defeated, ash | Collapsing to its knees, body flaking into grey ash from the wing edges and fingertips (the game fades it out). No gore |
| P | portrait | HUD boss bar (68 × 68 on screen) | 512 × 512, opaque. Head and shoulders, 3/4 view facing right, black eyes, pale gaunt face, wing tops showing behind the shoulders, dark moonlit blue-teal background |

The master (full body, standing, wings spread, 1024 × 1536, same background rules) is optional but helps consistency.

## What happens to them

- A reskin-style tool keys the background, trims, and registers every pose on one baseline.
- It packs the 10 poses into the same frame order as `dragFrame` (`src/stage4-art-cast.js`): 10 cells of about 360 × 500 px.
- The actor already scales a taller painted cell to the painter's footprint (`paint()` in `src/stage4-actors.js`), and it loads under `s4drag` with the painter as fallback. Hitboxes and timing stay in `draghkar.js` and are untouched.
- The tells are painted on top in the current colours: croon rings (yellow-green), kiss glow, and the light-reel flash.
- **Memory:** 10 cells at 360 × 500 is about 6.9 MiB, and the portrait at 136 × 136 is under 0.1 MiB. After dropping the 1.7 MiB code-drawn sheet, Stage 4 goes from 113.6 to about 118.8 MiB measured in WebKit, under the ~120 MiB guide.

## Status: done (2026-10-07)

- **Source:** ChatGPT image generation, approved by Jason F via Grok Bot. One 10-pose sheet on magenta (`art-in/draghkar/draghkar-sheet.src.png`, 1983 × 793, poses 0-9 in reading order, not on a grid) and the portrait (`art-in/draghkar/draghkar-portrait.src.png`, 1254 × 1254). Both are kept verbatim; the hashes are in `assets/bg4/ART_STATUS.json`.
- **Tool:** `tools/stage4/process_draghkar.py` handles keying (noisy magenta, unmix in the edge band, despill that keeps the violet wing sheen), blob grouping (pose 9's ash flakes stay with pose 9), one scale (0.94) and registration. The feet sit at 0.96 of the cell. The hover pair is aligned on the head and torso, so the flap doesn't move the body. The croon rings, kiss glow and light-reel flash are painted on top.
- **Output:** `assets/bg4/s4drag.webp`, 10 cells of **480 × 400**, not 360 × 500. The wings need the width: the croon and swoop poses are about 440-470 px wide at the scale where the standing pose matches the painter's height. `paint()` scales the 400 px cell to the painter's 250 px cell × 1.62, so a cell shows at 405 world px and the hitboxes are unchanged. `assets/bg4/draghkar-portrait.webp` is 136 × 136.
- **Memory (WebKit, all texture keys, Stage 4 boss arena):** 113.1 MiB before, 118.8 MiB at the start of the fight, and a peak of 118.9 MiB during it. That is under the ~120 MiB guide, but only about 1.1 MiB of headroom is left.
- **Fallback:** if a file fails in-session, the boot painter fills `s4drag` / `draghkarPortrait` (1800 × 250 canvas at scale 1.62), same as before. A failure while starting straight into Stage 4 stops startup, same as the cultist sheet and the plates do today.
