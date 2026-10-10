# Stage 6 painted art pass (A1–A4): spec

This is the plan for replacing the code-drawn Stone of Tear art in `src/stage6-art.js` with painted ChatGPT art. It uses the Stage 3/4/5 pipeline. ChatGPT paints one image per group on a flat chroma background. `tools/stage6/process_art.py` keys, splits, aligns, packs and budget-checks the images into game files. The game loads those files under the existing texture keys, and the code painter stays as the fallback.

- Prompts: `/workspace/stage6art/CHATGPT_PROMPTS.md`. There are 8 prompts plus an optional 9th, with the style references to attach.
- Sources: kept verbatim in `art-in/stage6/*.src.png`.
- Outputs:
  - `assets/stage6/chars/` (atlases)
  - `assets/stage6/ui/` (portraits)
  - `assets/stage6/props/` (hazard sheets)
  - `assets/stage6/story/`
  - `assets/bg6/` (plates and floors)
- Never write into `assets/ui/` or `assets/chars/` (CONTRACT, art seams).

Status (Oct 10): **all nine images painted, processed and wired** (section 6 has the results). Missing or failed
files still fall back to the code painter key by key.

## 1. What the player sees today (code-drawn, `src/stage6-art.js`, branch `rwb-2-stage6` @ 198b3e1)

All of these are canvases made at boot by `paintStage6Art`. Together they decode to 0.69 MiB.

| Key | Code cell × frames | Where / how it is drawn | On screen now | Code RGBA | Painted plan |
|---|---|---|---|---|---|
| `bg6far` | 320×180 ×1 | `stage6-view` `buildBackdrop`: screen-fixed, `setDisplaySize(1280, 580)`, depth −100 | 1280×580 | 225 KiB | **Prompt 5** → 1024×464 jpg |
| `bg6mid`, `bg6mid2` | 160×96 ×1 each | tiles every 520 world px, origin (0,1) at `LANE_TOP+6`, scrollFactor 0.4, 560×150, lit | 560×150 tiles | 60 KiB each | **Prompt 6** → exterior plates 1024×≤340 webp (alpha sky) |
| *(new)* `bg6mid3`, `bg6mid4` | none yet | none yet: zones 2 and 3 have no plate of their own | none | none | **Prompt 7** → interior plates 1024×464 webp |
| `bg6floor`, `bg6floor2`, `bg6floor3` | 64×32 ×1 each | tileSprites at x = 0/1800/3600, 1900 wide, from `LANE_TOP−16`, 178 tall, native texel size, lit | tiled | 8 KiB each | **Prompt 8** → 768×180 seamless jpg tiles |
| `s6belal` | 40×64 ×8 | `belal.js`: origin (0.5, 0.96), `setScale(3.1)`. Frames: 0 idle/walk, 1–3 flurry hits 1/2/3 (hit 4 reuses 3), 4 tell+lunge, 5 channel, 6 stagger, 7 erase/dead | about 124×198 cell, figure about 179 px | 80 KiB | **Prompt 1** → atlas, 8 frames |
| `belalPortrait` | 32×32 | boss bar (`STAGE6.boss.portrait`) | about 68×68 | 4 KiB | cut from Be'lal idle head → 136×136 |
| `s6gray` | 32×48 ×6 | `grayman.js`: origin (0.5, 0.96), `setScale(3.4)`. Frames: 1 idle/walk, 2 attack, 3 lunge, 4 hurt, 5 down/ash; **0 is never shown** | figure about 148 px | 36 KiB | **Prompt 2** row 1 → atlas, 5 poses, frame 0 aliases idle |
| `s6fade` (Fadelt) | 36×56 ×6 | `fadelt.js`: origin (0.5, 0.96), `setScale(3.2)`. Frames: 0 idle, 1 blink, 2–4 attack hits, 5 down/dead | figure about 165 px | 47 KiB | **Prompt 2** row 2 → atlas, 6 frames |
| `s6rand` | 32×48 ×6 | strike sprite (`stage6-lifecycle` `startStrike`, frame 0, `setScale(3.4)`, origin (0.5, 0.96), depth 1500); gallery glimpse (`view.glimpse`, frame 0, `setScale(1.2)`, scrollFactor 0); `view.randSprite` (frame 1, `setScale(1.4)`). Frames 2–5 are unused | figure about 148 px | 36 KiB | **Prompt 3** row 1 → atlas, 4 frames (0 angreal raised, 1 stand, 2 fire, 3 lightning) |
| `randPortrait` | 32×32 | HUD call label (`stage6-hud`, `setDisplaySize(30, 30)`) | 30×30 | 4 KiB | cut from Rand's stand head → 136×136 |
| `s6def` (Defenders) | 32×40 ×3 | 4 sprites at x = 1500 + 70i, y = 640, origin (0.5, 0.96), `setScale(3.2)`, depth 980, alpha 0.85. Frame = ⌊t/180 ms + i⌋ mod 3 (a looping cycle), shown in zone 1 | about 118 px | 15 KiB | **Prompt 3** row 2 → atlas, 3-frame march loop |
| `s6call` (Callandor) | 32×48 ×2 | `buildBackdrop`: x 4560, y 620, origin (0.5, 0.96), `setScale(3.4)`, ADD blend, visible in the boss zone, alpha pulses 0.55–0.9. Only frame 0 is used | 109×163 | 12 KiB | **Prompt 4** items 10–11 → 160×320 cells ×2 |
| `s6net` | 48×24 | `stage6-tells`: centred on the net, `setDisplaySize(400, band height ≈ 39)`, alpha 0.65 (tell) / 0.9 | 400×39 | 4.5 KiB | **Prompt 4** item 8 → 512×64 |
| `s6lamp` | 24×28 ×3 | `stage6-tells`: `setDisplaySize(160, 160)`, frame 0 while swinging, frame 2 otherwise; **1 is unused** | 160×160 | 7.9 KiB | **Prompt 4** items 5–7 → 192×192 cells ×3 |
| `s6oil` | 32×32 ×2 | `stage6-tells`: `setDisplaySize(160, 160)`, frame 1 (burning); 0 is unused | 160×160 | 8 KiB | **Prompt 4** items 3–4 → 192×192 cells ×2 |
| `s6streak` | 32×8 | Netweaver line (`stage6-tells`, spans the zone, about 1280 × 39) and Be'lal's flurry tell (`belal.js`, scale 1.4×0.35 or 0.6×0.35) | very wide strip | 1 KiB | **Prompt 4** item 9 → 512×48 |
| `s6hatch` | 32×28 ×2 | trapdoor spawn (`stage6-lifecycle` `hatch`), origin (0.5, 0.96), **no scale** (32×28 on screen), frame 0 closed → 1 open | 32×28 | 7 KiB | **Prompt 4** items 1–2 → 120×60 cells ×2 (decision: drawn at 1:1, so it gets bigger on screen) |
| `s6crate` | 24×24 | `STAGE6.crateProp` → `stage1.addBarrel`, `setScale(0.19)` (sized for the 490 px painted barrel/crate) | **about 5 px: effectively invisible** | 2.2 KiB | **reuse** the painted shared `crate` (`assets/props/prop-crate.webp`, 0.9 MiB, no `_n`) |
| `s6planks` | 16×8 ×2 | `STAGE6.cratePlanks` crate debris | tiny | 1 KiB | keep code-drawn (the shared `planks` atlas is 2.48 MiB, too dear) |
| `s6ribbon` | 16×16 | Twinkle Toes' ribbon pickup (`stage6.dropRibbon`), `setScale(0.7·pop)` | about 11 px | 1 KiB | **reuse** the painted `item-ribbon.webp` (256×258, 0.25 MiB) under `s6ribbon` |
| `s6storm` | 64×32 ×3 | full-screen rain tileSprite, ADD blend, alpha 0.18 | overlay | 24 KiB | keep code-drawn (additive rain) |
| `s6ray` | 16×64 | Callandor light rays in the boss zone (`view.sync`) | gradient | 4 KiB | keep code-drawn (additive gradient) |
| `story6p1–3` | 80×45 ×1 each | intro story cutscene (`STORY6_PANELS`), then `freeStory6` | full screen | 14 KiB each | **Prompt 9 (optional)** → 640×360 jpg, freed at start like Stage 5 |

Other Stage 6 fighters (`riley`, `grunt`, `spear`, `hound`, `cutthroat`) are already painted shared atlases and are out of scope.

## 2. Images → keys (`JOBS` in `tools/stage6/process_art.py`)

| # | Source file (`art-in/stage6/`) | Key colour | Layout (reading order) | Output keys |
|---|---|---|---|---|
| 1 | `belal.src.png` | magenta | 4 + 4 poses | `s6belal` frames 0–7 = idle, thrust, sweep, rising, lunge, weaving (channel), off-balance (stagger), exhausted (erase). `belalPortrait` from frame 0's head |
| 2 | `grayfade.src.png` | magenta | 5 Gray Man + 6 Fadelt | `s6gray`: frames 0 and 1 = idle (0 is an alias), 2 swipe, 3 dart, 4 recoil, 5 down. `s6fade`: 0 idle, 1 shadow-step, 2 high cut, 3 sweep, 4 thrust, 5 down |
| 3 | `randdef.src.png` | magenta | 4 Rand + 3 Defender | `s6rand`: 0 angreal raised, 1 stand, 2 fireball, 3 lightning. `s6def`: 3-frame march loop. `randPortrait` from frame 1's head |
| 4 | `props.src.png` | **green** (the ribbon/crimson/flame colours stay safe) | 4 + 3 + 2 + 2 | `s6hatch` [closed, open], `s6oil` [dark, burning], `s6lamp` [swing, hang dim, hang lit], `s6net`, `s6streak`, `s6call` [dormant, flaring] |
| 5 | `far.src.png` | none (opaque) | one scene | `bg6far` (centre cover-crop to 1024×464) |
| 6 | `plates-exterior.src.png` | magenta sky, **black** separator bars | 2 panels | `bg6mid` (docks), `bg6mid2` (sea gate): sky keyed out, trimmed to ≤ 340 px, 96 px edge feather |
| 7 | `plates-interior.src.png` | magenta bars | 2 panels | `bg6mid3` (Great Hall), `bg6mid4` (Heart of the Stone): opaque, 96 px edge feather |
| 8 | `floors.src.png` | magenta bars | 3 strips | `bg6floor` (quay), `bg6floor2` (hall), `bg6floor3` (Heart): 768×180 jpg, made seamless with a 64 px wrap crossfade |
| 9 | `story.src.png` (optional) | magenta gutters | 2×2 grid, first 3 | `story6p1`–`story6p3`, 640×360 jpg |

Images 1–4 are the collages. Images 5–9 are single-scene backdrops, which the brief allows. Image 6 uses black separator bars because its sky is the magenta key.

### Tool behaviour

- **Keying:** same maths as `tools/stage5/process_bosses.py` (deep key cleared, edge band alpha-unmixed, despill), generalised to magenta or green.
- **Blobs:** exactly N elements are expected, grouped into rows by centre y and then sorted by x. A wrong count or overlapping rows fails loudly. Crumbs join the nearest element and specks are dropped.
- **Poses:** one scale per character. The idle pose's head-to-feet height is painted at `RES × screen_h` px (`RES` = 1.0 painted px per screen px at 1280×720; `--res 1.25` gives crisper retina art at about 1.56× the memory). Cells are multiples of 8, with the feet at 0.96 of the cell (the actor origin).
  - Registration: torso on the centre, or feet on idle's feet for poses that step or lunge, or the whole figure centred for lying poses.
  - Packing: trimmed cells are shelf-packed into a Phaser JSON-hash atlas (`frames "0".."n"`, `sourceSize` = the cell), with `meta.drawScale = 1/RES` and `meta.origin = [0.5, 0.96]`. Aliased frames reuse a rect, so they cost nothing.
- **Target on-screen idle heights:** Be'lal 250 px (taller than Riley, about 220 px), Gray Man 205, Fadelt 235, Rand 215, Defender 200. The code-drawn figures are 179/148/165/148/118 px, so the painted ones read bigger. Hitboxes are code distances in `belal.js`/`grayman.js`/`fadelt.js` and do not change. Tune with `screen_h` in `JOBS`.
- **Props:** one scale per key, so all frames match, written as a horizontal spritesheet with a fixed `frameWidth/frameHeight`, anchored bottom (hatch, Callandor), top (lamp) or centre.
- **Bands:** split on the separator rows, side bars dropped, cover-crop and resize, then optional sky key and trim, edge feather or seamless wrap.
- **Budgets:** each key is checked against `BUDGET_MIB`, and the resident total against `TOTAL_MIB` (17.0). Over budget exits 2 unless `--allow-over`.
- **Flags:** `--write-status` refreshes `assets/stage6/ART_STATUS.json` and `assets/bg6/ART_STATUS.json` (sha256, source, `placeholder: false`). `--debug DIR` writes contact sheets with the foot line. `--report FILE` saves the JSON report.

```
python3 tools/stage6/process_art.py --debug /tmp/s6dbg --report /tmp/s6art.json           # all present sources
python3 tools/stage6/process_art.py --only belal,grayfade --debug /tmp/s6dbg               # just some jobs
python3 tools/stage6/process_art.py --write-status                                         # final run before commit
```

Missing sources are reported under `skipped`, and the run carries on, so the art can land image by image.

## 3. Memory budget

The live WebKit boss-fight source peak today is **94.81 MiB**. The guide is 120 MiB. The painted Stage 6 set must stay inside **17.0 MiB** of decoded RGBA, and the target after the pass is a boss peak of **≤ 112 MiB** measured with `tools/stage5/texture-dump.mjs` (`RWB_STAGES=6`).

| Key | Output (w×h) | Budget MiB (decoded RGBA) | Actual MiB |
|---|---|---:|---:|
| `s6belal` | 1871×283 atlas, 8 frames | 2.10 | 2.020 |
| `s6gray` | 903×206 atlas, 5 poses (6 frames) | 0.80 | 0.710 |
| `s6fade` | 1120×257 atlas, 6 frames | 1.15 | 1.098 |
| `s6rand` | 680×264 atlas, 4 frames | 0.75 | 0.685 |
| `s6def` | 240×203 atlas, 2 strides (3 frames) | 0.30 | 0.186 |
| `belalPortrait`, `randPortrait` | 136×136 each | 0.08 each | 0.071 each |
| `s6hatch` | 2 × 120×60 | 0.10 | 0.055 |
| `s6oil` | 2 × 192×192 | 0.30 | 0.281 |
| `s6lamp` | 3 × 192×192 | 0.45 | 0.422 |
| `s6net` | 512×64 | 0.15 | 0.125 |
| `s6streak` | 512×48 | 0.10 | 0.094 |
| `s6call` | 2 × 160×320 | 0.40 | 0.391 |
| `s6ribbon` | 48×48 (reused ribbon art) | 0.02 | 0.009 |
| `bg6far` | 1024×464 | 1.85 | 1.812 |
| `bg6mid`, `bg6mid2` | 1024×274, 1024×297 | 1.40 each | 1.070, 1.160 |
| `bg6mid3`, `bg6mid4` | 1024×464 | 1.85 each | 1.812 each |
| `bg6floor`, `bg6floor2` | 768×180 | 0.55 each | 0.527 each |
| `bg6floor3` | 1280×180 | 0.90 | 0.879 |
| **Painted resident total** |  | **cap 17.0** | **15.82** |
| reused `crate` (no `_n`) | 490×482 | 0.90 | 0.90 |
| `story6p1–3` (transient, freed at start) | 3 × 640×360 | 0.90 each | 0.879 each |

Measured with everything in (WebKit, `docs/stage6/texture-art.json`): the boss source peak is **110.90 MiB**, up
from 94.81 MiB and under the 120 guide.

Worst case at the boss peak is 94.81 − 0.69 (code canvases dropped) + 16.61 + 1.15 ≈ **111.9 MiB**, with no normal maps. The plates and floors use the scene's flat lighting, as the code art does now, so there are no `_n` pages. If the measured peak comes in over 112 MiB, the first cuts are:

1. `bg6far` to 896×406 (−0.42 MiB)
2. interior plates to 896×406 (−0.84 MiB)
3. drop the crate reuse (−0.9 MiB)

## 4. Wiring needed after the art lands (not done yet; do it in the same PR as the files)

1. **Load queue:** add a `PAINTED6` table in a new sibling module (e.g. `src/stage6-load.js`, so `stage6-art.js` stays under its size cap). Follow `queuePainted` in `src/stage5-art.js`: `L.atlas` for the chars, `L.spritesheet` with the report's `frameWidth/frameHeight` for the props, `L.image` for plates, floors, portraits and story. Use optional keys, so a failed file drops its key and the painter fills it. Queue it from `queueStage6` in `src/stage6.js`. `paintStage6Art` already skips keys that exist.
2. **Actors:** where a painted atlas is present, draw at `meta.drawScale` instead of the code scale. This applies to Be'lal 3.1, the Gray Man 3.4, Fadelt `FADELT.scale` 3.2, the strike and glimpse Rand 3.4/1.2/1.4, and the Defenders 3.2. A helper like Stage 5's `scaleFor` is fine: `painted ? 1/RES (× the glimpse/randSprite ratio) : codeScale`. Frame numbers stay the same, because the atlases keep the code-drawn frame order.
3. **Plates:** `buildBackdrop` gives each zone its own plate (`bg6mid` docks, `bg6mid2` sea gate, `bg6mid3` Great Hall, `bg6mid4` Heart) instead of the 520 px alternating tiles.
   - Each plate has origin (0, 1) at `LANE_TOP+8` and scrollFactor 0.4, placed so it is centred when the camera sits at `zone.l`: `x = 0.4·zone.l + 640 − displayW/2`.
   - Display widths are at least 1280. Exterior plates scale 1.25 (1280 wide). Interior plates scale 580/464 = 1.25, so they reach the top of the screen.
   - Neighbours overlap and the 96 px edge feathers blend them.
   - Hide or darken `bg6far` in zones 2–3 (indoors).
   - Add `bg6mid3` and `bg6mid4` to `STAGE6_TEXTURES` (the release inventory) and to `STAGE6_CANVASES` and `paintStage6Art` (fallback).
4. **Floors:** keep the three tileSprites. Optionally move their boundaries to the zone edges (2560 / 3920) so the quay meets the hall at the gate and the Heart starts at the boss zone.
5. **Props:**
   - `s6hatch` is drawn 1:1 from 120×60 cells.
   - `s6oil` and `s6lamp` keep `setDisplaySize(160, 160)` (192 → 160).
   - `s6net` keeps 400 × band height.
   - `s6streak` keeps its stretch.
   - Draw `s6call` in NORMAL blend with its pulse (the ADD blend suited the code stub, not painted crystal), scaled so the sword is about 200 px tall.
6. **Reuse:** set `STAGE6.crateProp = 'crate'` and load `crate` (no normal map) and `item-ribbon.webp` under `s6ribbon`. Leaving Stage 6 must drop them unless the next stage shares them (`SHARED_TEXTURES` already has `crate`).
7. **ART_STATUS:** run `process_art.py --write-status`. Keep `placeholder: false` and never write the string `placeholder` into `src/`.
8. **Tests to add:**
   - a painted-asset presence/size test (the budgets from §3)
   - a loader-failure fallback test (as Stage 5)
   - `STAGE6_TEXTURES` covers `bg6mid3`/`bg6mid4`
   - the Stage 6 memory test updated with the painted pages
   - re-run `texture-dump.mjs` and record the new peak in `docs/stage6/`
9. **Unchanged:** the pre-fight audit stays under 25,000,000 bytes. Stage 6 assets are not in the pre-fight gate (`tests/stage6-size-caps.test.mjs`), and `src/input.js`, `src/hud.js`, `lib/` and `index.html` stay byte-identical.

## 5. Acceptance

- Every source passes the eye checklist at the end of `CHATGPT_PROMPTS.md`, and the tool runs with no budget failure and no "clipped" warnings.
- In the debug contact sheets the feet sit on the green line, idle and the other poses register without jumping, and there is no magenta or green fringe.
- In-game screenshots of each zone and the boss fight, with and without a Rand call, look right. The texture-dump boss peak is ≤ 112 MiB (hard limit 120).
- Full suite, audit, Stage 3/4/5/6 bots 9/9 (Stage 6 with and without Rand, plus the 250 ms bot) and the Stage 1 golden replay all unchanged.

## 6. Pass results (Oct 10, 2026)

All nine sources are in `art-in/stage6/`. Outputs are under `assets/stage6/` and `assets/bg6/`, and
`src/stage6-painted.js` is generated by `process_art.py --write-status`, so all 25 rows are present.

### Processing fixes made on the real art
- **Keying**
  - An over-correction guard stops the despill from swinging edges to the opposite hue (there were green
    fringes on the magenta key).
  - Edge colour bleed: pixels below alpha 0.6 take the colour of nearby solid art. Be'lal's thin white fire
    edges are mostly alpha ≥ 0.6 cores and survive; this was checked at 3–4× zoom on dark, grey and white.
- **Rand pose 4:** the pink-violet glow is shifted to the lightning's blue-white (`fix={3: ('violet', 1.0)}`).
  His three-quarter and front views are accepted.
- **Defenders:** pose 5 is nearly face-on and flickered in the loop. The march uses the two side-view strides
  (poses 4 and 6, registered on the feet) as frames 0-1-0.
- **Fadelt:** the forward-facing poses and the head-left down pose are accepted. The painted sheet drops the code
  stand-in's red tint (the tint stays for the code fallback).
- **Props (green key)**
  - The lantern glass, chain and net cord had an olive/green-teal tint; they are neutralized to warm grey
    (`G > 0.85 R`). Brass and flame are untouched.
  - The teal fill inside the lamp ring is gone.
  - The thread strip's stray sparks join the strip (nearest-owner crumbs).
- **Callandor:** frame 1 is brightened (×1.22 +16) with a soft blue halo, with a 12 px cell pad for the halo.
  It is drawn in NORMAL blend, at 0.68 scale (about 200 px tall), and shows frame 1 from Be'lal's phase 3
  ("CALLANDOR FLARES").
- **Exterior plates**
  - Fitted to width (1024×274 and 1024×297), because a 1024×460 cover crop cut half of each band.
  - The sea gate's keyed gateway and the portcullis grille holes are filled with a dark passage
    (`fill_holes`), so no sky shows at ground level.
  - Thin rigging and bars against the keyed sky are pulled toward a cool grey and violet-neutralized.
  - Fixed a top-trim bug that cut a plate to 2 px when the band was shorter than `max_h`.
- **Floors**
  - 65 % of the streak-scale horizontal brightness swing is divided out (the reflection streaks).
  - A 160 px wrap crossfade is used for the quay and the hall.
  - The Heart floor's ring inlay cannot tile, so `bg6floor3` is one 1280×180 image spanning the boss zone
    exactly (budget 0.90).
  - The 4 px anti-aliased rim of the bars is dropped.
- **Story:** gutters are about 20 px, so the splitter now accepts 80 % chroma rows/columns and trims a 4 px rim.
- **Interior and far plates:** the painterly style is accepted as is. They are lit by the scene lights like the
  code plates, and in the screenshots Riley, Be'lal and the enemies read clearly against them, so no extra
  darkening was applied.

### Wiring (done)
- `src/stage6-paint.js`
  - Queues the present rows, plus the shared crate without its normal map (reused when Stage 5 left it
    resident).
  - Keys are optional, and a failed file is removed so `paintStage6Art` repaints it.
  - `isPainted` / `s6Scale` give painted keys their painted scale.
- **Actors:** Be'lal, the Gray Man (glint offset ×1.38), Fadelt, Rand (strike, glimpse and call sprite), the
  Defenders and the hatch use the painted scale. Be'lal's flurry streak uses a display size when painted.
- **Plates:** the view places one world-locked plate per zone (`plateRect`, with 48 px overlaps so the 96 px
  feathers cross-blend). Zones without a painted plate keep the code tiles. Painted floors meet at the zone edges.
- **Crate and ribbon:** `crateProp` is `'crate'`, with a 120 px code fallback. `s6ribbon` is the painted ribbon
  at 48 px (pickup scale 0.7, so about 34 px).
- **Release:** `bg6mid3`, `bg6mid4` and `crate` are in `STAGE6_TEXTURES`.
- **Tests:** `tests/stage6-painted-art.test.mjs` covers the manifest vs files, budgets, atlas frames/meta,
  ART_STATUS hashes, the queue and its fallback, scales, plates, floors, Callandor and the Fadelt tint, plus a
  boss-peak RGBA sum that includes the painted files and the crate (< 120 MiB). The existing
  `stage6-memory.test.mjs` is unchanged (`stage6-protected.test.mjs` forbids edits to existing tests).

### Measurements (head of this commit)
- Resident painted set 15.82 MiB of the 17.0 cap (story panels 3 × 0.88 MiB are transient). Re-running
  `process_art.py` gives byte-identical files (ART_STATUS hashes unchanged).
- Live WebKit `texture-dump.mjs` (`RWB_STAGES=6`, `docs/stage6/texture-art.json`): boss-fight source peak
  **110.91 MiB** (phase 3, clear shown), run source peak 113.46 MiB (title, before the story panels are freed),
  GL wrappers 124.00 MiB. Was 94.81 / 94.87 / 105.41 on code-drawn art. No page errors, clear reached.
- Full suite 1339 tests, 1337 pass, 0 fail, 2 existing skips. Stage 6 campaign 9/9 without Rand, 9/9 with one
  Rand call, 9/9 with the 250 ms delayed bot. Audit: Stage 6 source, voices, music and art PASS; pre-fight
  24,904,870 of 25,000,000 bytes.
- Headless art pass (`tools/stage6/art-shots.mjs`, Chromium + SwiftShader): every painted key loads as a file
  (none fell back to a canvas), `music-stage6` starts in the docks and `music-boss6` at the Heart (looping
  Web Audio buffers of 72.5 s and 73.2 s were started), and the run reaches the clear with no page errors.
