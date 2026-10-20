# Stage 8 final art (built, not in repo; review pending Jason)

Paths mirror the repo root (copy `assets/` into jfeldman9-rgb/riley-wheel-brawl). Built by `/workspace/stage8-art/build_final.py` (stock keyer `tools/stage6/process_art.py` + `slicer8.py` gap slicer for pose sheets). Sources: `/tmp/s8src/` (mirror `/workspace/stage8-art/src/`), picked from `drafts/` (v1 everywhere except lanfear_v2 and story8p1_v2). Contact sheet: `preview.png`. QA: `/workspace/stage8-art/qa/qa8.json`.

**Scale:** cast at `--res 1.0` (drawScale 1), not the plan's 1.25 — at 1.25 the cast blew the plan's own caps by 1.3–2.3× and the Z2 set hit ~39 MiB. Perrin, Loial and the wolves are light back-lane art (smaller screenH, res 1.0). Mat is the call-in at cast scale. Atlas page width 2560.

| File | Key | Pixels | Frames | Bytes | Decoded MiB | Plan cap | Source draft |
|---|---|---|---|---|---|---|---|
| `assets/bg8/bg8far.jpg` | `bg8far` | 1280×580 |  | 159,617 | 2.83 |  | far8_v1.png |
| `assets/bg8/bg8fg.webp` | `bg8fg` | 1280×160 |  | 57,608 | 0.78 |  | fg8_v1.png strip 1 (+ code-painted pole finial, flag top fade) |
| `assets/bg8/bg8fg2.webp` | `bg8fg2` | 1280×160 |  | 52,238 | 0.78 |  | fg8_v1.png strip 2 |
| `assets/bg8/bg8floor.jpg` | `bg8floor` | 1280×360 |  | 150,030 | 1.76 |  | floors8_v1.png strip 1 |
| `assets/bg8/bg8floor2.jpg` | `bg8floor2` | 1280×360 |  | 121,679 | 1.76 |  | floors8_v1.png strip 2 |
| `assets/bg8/bg8floor3.jpg` | `bg8floor3` | 1280×360 |  | 146,768 | 1.76 |  | floors8_v1.png strip 3 |
| `assets/bg8/bg8mid.webp` | `bg8mid` | 1280×346 |  | 88,562 | 1.69 |  | plates-hills_v1.png top |
| `assets/bg8/bg8mid2.webp` | `bg8mid2` | 1280×355 |  | 80,582 | 1.73 |  | plates-hills_v1.png bottom |
| `assets/bg8/bg8mid3.webp` | `bg8mid3` | 1280×387 |  | 148,654 | 1.89 |  | plates-wells_v1.png top |
| `assets/bg8/bg8mid4.webp` | `bg8mid4` | 1280×323 |  | 72,198 | 1.58 |  | plates-wells_v1.png bottom |
| `assets/bg8/bg8smoke.webp` | `bg8smoke` | 1024×256 |  | 44,272 | 1.00 |  | fg8_v1.png strip 3 (luminance alpha, wrapped) |
| `assets/stage8/chars/s8allies.webp` | `s8allies` | 1672×170 | 9 | 79,294 | 1.08 | 1.38 | allies_v1.png |
| `assets/stage8/chars/s8ashaman.webp` | `s8ashaman` | 1654×220 | 12 | 119,296 | 1.39 | 1.69 | ashaman_v1.png |
| `assets/stage8/chars/s8duo.webp` | `s8duo` | 725×159 | 6 | 34,354 | 0.44 | 0.75 | duo_v1.png |
| `assets/stage8/chars/s8lanfear.webp` | `s8lanfear` | 2488×443 | 23 | 342,634 | 4.20 ⚠ | 3.52 | lanfear_v2.png (frames 0-13) + lanfear2_v1.png x0.76 (frames 14-22) |
| `assets/stage8/chars/s8lews.webp` | `s8lews` | 512×640 |  | 119,794 | 1.25 | 1.25 | lews_v1.png (luminance alpha) |
| `assets/stage8/chars/s8loial.webp` | `s8loial` | 1221×214 | 8 | 78,488 | 1.00 | 1.0 | loial8_v1.png |
| `assets/stage8/chars/s8mat.webp` | `s8mat` | 2112×213 | 8 | 118,978 | 1.72 ⚠ | 1.56 | mat_v1.png |
| `assets/stage8/chars/s8perrin.webp` | `s8perrin` | 1291×157 | 8 | 61,792 | 0.77 | 0.8 | perrin_v1.png |
| `assets/stage8/chars/s8sister.webp` | `s8sister` | 1999×210 | 16 | 108,470 | 1.60 | 2.5 | sister_v1.png |
| `assets/stage8/chars/s8stonedog.webp` | `s8stonedog` | 1826×197 | 12 | 111,838 | 1.37 | 1.88 | spear8_v1.png (11 poses; frame 9 hurt = alias of 8) |
| `assets/stage8/chars/s8taim.webp` | `s8taim` | 957×271 | 6 | 67,632 | 0.99 | 1.17 | taim_extra_v2.png ×0.44 (frames 0 arms_crossed, 3 gate_step) + taim_v1.png cells 3,5,4 (frames 1,2,4); frame 5 = alias of 0 |
| `assets/stage8/chars/s8twink.webp` | `s8twink` | 1971×159 | 18 | 102,008 | 1.20 | 2.11 | twink_v1.png |
| `assets/stage8/chars/s8wise.webp` | `s8wise` | 1368×193 | 11 | 95,256 | 1.01 | 1.72 | wise_v1.png |
| `assets/stage8/chars/s8wolflead.webp` | `s8wolflead` | 680×96 | 8 | 27,634 | 0.25 | 0.5 | wolves_v1.png row 2 |
| `assets/stage8/chars/s8wolfpack.webp` | `s8wolfpack` | 625×70 | 6 | 28,624 | 0.17 | 0.5 | wolves_v1.png row 1 |
| `assets/stage8/props/s8banner.webp` | `s8banner` | 256×128 |  | 5,040 | 0.12 |  | banner_v1.png |
| `assets/stage8/props/s8bolt.webp` | `s8bolt` | 576×192 | 3 (sheet) | 19,192 | 0.42 |  | fx-circle_v1.png row 1 |
| `assets/stage8/props/s8callfx.webp` | `s8callfx` | 1152×384 | 3 (sheet) | 52,596 | 1.69 |  | fx-circle_v1.png row 4 |
| `assets/stage8/props/s8chest.webp` | `s8chest` | 768×192 | 3 (sheet) | 44,482 | 0.56 |  | props-door_v1.png row 2 |
| `assets/stage8/props/s8clash.webp` | `s8clash` | 1024×128 | 1 (sheet) | 46,380 | 0.50 |  | fx-boss_v1.png row 2 |
| `assets/stage8/props/s8dome.webp` | `s8dome` | 2048×384 | 4 (sheet) | 188,074 | 3.00 |  | fx-circle_v1.png row 3 |
| `assets/stage8/props/s8door.webp` | `s8door` | 1152×512 | 4 (sheet) | 100,644 | 2.25 |  | props-door_v1.png row 1 |
| `assets/stage8/props/s8earth.webp` | `s8earth` | 1536×192 | 6 (sheet) | 78,638 | 1.12 |  | fx-volley_v1.png row 1 |
| `assets/stage8/props/s8fire.webp` | `s8fire` | 1024×128 | 4 (sheet) | 39,570 | 0.50 |  | fx-volley_v1.png row 2 |
| `assets/stage8/props/s8fireball.webp` | `s8fireball` | 1152×192 | 6 (sheet) | 78,872 | 0.84 |  | fx-boss_v1.png row 1 |
| `assets/stage8/props/s8link.webp` | `s8link` | 1024×96 | 1 (sheet) | 31,696 | 0.38 |  | fx-boss_v1.png row 4 left |
| `assets/stage8/props/s8linkaura.webp` | `s8linkaura` | 256×256 | 1 (sheet) | 18,208 | 0.25 |  | fx-boss_v1.png row 4 right |
| `assets/stage8/props/s8star.webp` | `s8star` | 384×192 | 2 (sheet) | 10,736 | 0.28 |  | fx-boss_v1.png row 3 |
| `assets/stage8/props/s8tell.webp` | `s8tell` | 1024×64 | 2 (sheet) | 19,546 | 0.25 |  | fx-volley_v1.png row 3 |
| `assets/stage8/props/s8weave.webp` | `s8weave` | 768×256 | 3 (sheet) | 21,732 | 0.75 |  | fx-circle_v1.png row 2 |
| `assets/stage8/story/s8credits.jpg` | `s8credits` | 1280×720 |  | 241,182 | 3.52 |  | story-g1_v1.png BR |
| `assets/stage8/story/story8c1.jpg` | `story8c1` | 1280×720 |  | 155,703 | 3.52 |  | story-g2_v1.png TR |
| `assets/stage8/story/story8c2.jpg` | `story8c2` | 1280×720 |  | 207,273 | 3.52 |  | story-g2_v1.png BL |
| `assets/stage8/story/story8f1.jpg` | `story8f1` | 1280×720 |  | 225,452 | 3.52 |  | story-g2_v1.png BR |
| `assets/stage8/story/story8f2.jpg` | `story8f2` | 1280×720 |  | 208,255 | 3.52 |  | story-g3_v1.png TL |
| `assets/stage8/story/story8f3.jpg` | `story8f3` | 1280×720 |  | 201,018 | 3.52 |  | story-g3_v1.png TR |
| `assets/stage8/story/story8f4.jpg` | `story8f4` | 1280×720 |  | 252,046 | 3.52 |  | story-g3_v1.png BL |
| `assets/stage8/story/story8m1.jpg` | `story8m1` | 1280×720 |  | 212,279 | 3.52 |  | story-g2_v1.png TL |
| `assets/stage8/story/story8p1.jpg` | `story8p1` | 1280×720 |  | 237,152 | 3.52 |  | story-g1_v1.png TL |
| `assets/stage8/story/story8p2.jpg` | `story8p2` | 1280×720 |  | 175,029 | 3.52 |  | story8p1_v2.png cropped y48-912 (16:9) |
| `assets/stage8/story/story8p3.jpg` | `story8p3` | 1280×720 |  | 128,888 | 3.52 |  | story-g1_v1.png TR |
| `assets/stage8/story/story8p4.jpg` | `story8p4` | 1280×720 |  | 225,347 | 3.52 |  | story-g1_v1.png BL |
| `assets/stage8/ui/lanfearPortrait.webp` | `lanfearPortrait` | 136×136 |  | 4,968 | 0.07 |  | lanfear_v2.png cell 15 |
| `assets/stage8/ui/matPortrait.webp` | `matPortrait` | 136×136 |  | 4,144 | 0.07 |  | mat_v1.png cell 9 |
| `assets/stage8/ui/perrinPortrait.webp` | `perrinPortrait` | 136×136 |  | 6,030 | 0.07 |  | perrin_v1.png cell 9 |
| `assets/stage8/ui/taimPortrait.webp` | `taimPortrait` | 136×136 |  | 4,822 | 0.07 |  | taim_v1.png cell 9 |
| `assets/stage8/ui/twinkPortrait.webp` | `twinkPortrait` | 136×136 |  | 4,092 | 0.07 |  | twink_v1.png cell 19 (from behind) |

**Totals:** 58 image files + 14 atlas JSONs, 5.87 MB on disk (stage8.art line 9.0 MB). Story panels (12 × 3.52 MiB) are transient, at most 4 at once.

## Residency budget (decoded RGBA, Jason's zone plan: Lanfear set after C6, s8duo + s8link at C6)

Gate: painted sprites/FX/UI ≤ 26 MiB resident; whole stage ≤ 105 MiB source (≈120 MiB iPhone). Reused shipped keys (s7dancer, s7veiled, s6rand, s6call, …) add 3.61 MiB from Z2. Fixed cost outside this table: Riley atlas 34.30 MiB + engine allowance 8 MiB.

| Phase | Sprites/FX/UI | Plates | Painted total | + Riley 34.30 + 8 |
|---|---|---|---|---|
| Z0 hills | 6.84 | 12.33 | 19.17 | 61.5 |
| Z1 battle slope | 16.27 | 10.78 | 27.04 | 69.3 |
| Z2 wells + circle, up to C5 (peak) | 24.92 | 12.38 | 37.30 | 79.6 |
| C6 link: helpers released after C5, circle set released, s8duo + s8link load | 13.48 | 12.38 | 25.86 | 68.2 |
| Z3 boss: Lanfear set loads after C6 | 21.56 | 8.73 | 30.29 | 72.6 |

## QA (qa/qa8.py → qa/qa8.json)
- Key fringe: 0 keyed files with magenta/green on >0.2% of edge pixels. Post-fixes: violet/indigo smoke on bg8mid–mid4/fg strips neutralized to grey; faint green cast on Twinkle/duo glows pushed to white-gold, sisters' to white-blue.
- Frame counts: s8lanfear 23, s8twink 18, s8duo 6, s8stonedog 12 (frame 9 = alias of 8), s8wise 11, s8sister 16, s8ashaman 12, s8taim 6 (plan count: arms_crossed, fist_shout, channel, gate_step, point, portrait_pose = alias of 0), s8allies 9, s8mat 8, s8perrin 8, s8loial 8, s8wolfpack 6, s8wolflead 8.
- Slicing: pose sheets re-sliced on the real figure gaps (`slicer8.py`). Touching pairs (Lanfear 4/9, sisters 12/13, Mat 4/5) are cut at the thinnest contact; Lanfear's crown fireball is pinned to its owner with a hint (cut y=328).
- Lanfear 14–22: lanfear2_v1 scaled ×0.76, not ×0.73. At 0.73 the standing P9b poses came out about 4% short; at 0.76 frames 19/20 are 210/211 px vs 211/211 px for frames 0/1.
- bg8fg: the banner pole ran off the top of the 160 px strip with a flat cut. The pole now ends 6 px below the top under a rounded, shaded bronze finial with a dark iron collar, blurred 1.1 px to match the painted depth blur. The torn flag fades over its top 16 px. Same 1280×160 (0.78 MiB).
- s8taim: taim_extra_v2 poses replace the stand-ins (arms_crossed was the hand-on-hip stand, gate_step was walk 1). Scaled ×0.44 (727 → 320 px, same as taim_v1's standing cell), so one scale covers the sheet: arms_crossed 216 px vs 219 px fist_shout; gate_step 271 px tall including the doorway. Magenta fringe: rose/salmon rims on the doorway glow and sparks pushed to white-gold (edge and bright pixels only, R ≥ 0.85·B, so blue/violet is never touched). Blue lining: the keyer keeps 100% of it; WebP chroma averaging was the loss, so blue-dominant pixels are pre-emphasised per frame and the sheet is encoded once from the lossless page (blue px after encode vs lossless: 9.6/10.1%, 16.2/16.5, 11.0/11.6, 1.2/1.45, 7.1/7.7). Page 957×271 = 0.99 MiB (was 954×221, 0.80; cap 1.17).
- `preview.jpg` (1100 px wide) is the light copy of `preview.png`.
