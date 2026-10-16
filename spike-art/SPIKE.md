# RWB 2.0: style-lock spike report

*Fri Oct 2, 2026 (Phoenix time). Scope approved by Jason: the 4-day art-style test from `plan/PLAN.md` §10 Phase 0. Actual time used: about 1 working session (well inside the 4-day budget).*

## Verdict

| Spike checkpoint (PLAN.md §10, Phase 0) | Result |
|---|---|
| **Frame consistency (the stop/go condition)** | **PASS.** All 58 delivered frames read as the same Riley / the same Trolloc. Details in §3. |
| "≥ 70% of frames pass QA within 2 tries" | **64% strict (37 of 58 frames came from a sheet kept on try 1 or 2); 100% within 3 tries.** Most retries were Codex rejecting its own *layout* (figures crowding, a pose out of order), not identity drift. One sheet row was rejected by me for a direction error (see §3.3). Slightly under the bar as literally written. |
| Weapons rigid | **Mostly.** The Trolloc scimitar keeps its shape in 20 of 21 frames; in the one smear frame (chop, frame 4) the blade is drawn about 1.4× longer. Flagged, and fixable with a regeneration. |
| 60 fps on iPad | **Not measurable from here.** The box has no GPU (software WebGL), and Jason's MacBook was offline. The prototype shows live fps, p95 frame time and frames over 33 ms on screen, so Jason can read it on the iPad. |
| "Jason says it looks like a different game" | **Pending Jason.** Use the preview link and the side-by-sides below. |

**Recommendation:** consistency holds, so the art pipeline is fit to build Stage 1 on. Jason has approved going straight into the Stage 1 slice. His "different game" call and the iPad HUD numbers can come from the preview link in parallel.

## 1. Deliverables (all in `/workspace/rwb-2/spike/`)

| What | Path |
|---|---|
| **Locked house style** | `HOUSE_STYLE.txt` (+ `RILEY_SPEC.txt`) |
| **Riley character sheet** | `gen/riley/master-side.png` (locked design), `gen/riley/model-sheet.png` (front / ¾ / side / back) |
| **Trolloc master** | `gen/trolloc/master-side.png` |
| **Animation loops (GIF + MP4 + frame strip each)** | `loops/riley_idle`, `loops/riley_walk`, `loops/riley_combo` (3-hit combo, 12 frames), `loops/riley_hurt`, `loops/riley_knockdown_full` (knockdown + get-up), `loops/trolloc_walk`, `loops/trolloc_attack`, `loops/trolloc_hurt`, `loops/trolloc_knockdown`; all in one: `loops/all-animations-reel.mp4` |
| **Contact sheets** | `shots/contact-*.png` (every frame, in order, with hold times) |
| **Old 1.2 vs new: stills** | `shots/sbs-riley-old-vs-new.png`, `shots/sbs-trolloc-old-vs-new.png` |
| **Old 1.2 vs new: animated** | `loops/sbs-riley-combo.mp4/.gif`, `loops/sbs-riley-walk.mp4/.gif`, `loops/sbs-riley-knockdown.mp4/.gif` |
| **Lit Phaser 4 prototype** | `proto/` (also on branch `rwb-2-spike`, preview link below) |
| **Prototype screenshots** | `shots/still-lit.png`, `shots/still-unlit.png`, `shots/still-fireball-light.png`, `shots/still-impact-spark.png` (demo frame 100, combo impact spark during hit-stop), `shots/proto-demo-60fps-f*.png` |
| **Prototype screen capture** | `shots/proto-demo-60fps.mp4` (15.5 s scripted fight) |
| **Raw generations + exact prompts** | `gen/**/` (each folder has the sheet, `prompt*.md`, `prompts-*.json` with every attempt) |
| **Pipeline tools** | `tools/slice2.py` (cut sheets), `tools/build_anim.py` (register, normal maps, loops), `tools/pack.py` (atlas), `tools/contact.py`, `tools/consistency.py`, `tools/sbs*.py`, `tools/render_video.cjs`, `tools/stills.cjs` |
| **Ten-stage plan** | `/workspace/rwb-2/plan/LEVELS.md` |

**Preview** (branch `rwb-2-spike`, commit `603566c7fa0eec45445ef8e4fcc180e0ba4fd95a`):
- Play: https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/603566c7fa0eec45445ef8e4fcc180e0ba4fd95a/index.html
- Scripted fight: https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/603566c7fa0eec45445ef8e4fcc180e0ba4fd95a/index.html?demo=loop

raw.githack may show a one-time "One more step → Open the page" screen first. I verified the link loads in headless Chromium with no console errors. Textures load with CORS, which WebGL needs because githack redirects images to raw.githubusercontent.

## 2. What was made, and how

**Tools used:** ChatGPT image generation via Codex (`codex exec` + built-in image_gen, signed in to the ChatGPT Pro account) for every still. No Grok stills, no Seedance or Manus, no paid APIs.

**Not used:**
- **Gemini images:** there is no Gemini image access from the box without a browser session, and this run had no browser tool. Every image is ChatGPT.
- **Optional Grok Imagine / Gemini video clip:** skipped for the same reason. Both need a signed-in browser (the APIs would be paid usage).

**Pipeline actually run (Route B in PLAN.md §4.2: pose-sheet direct):**
1. **Style lock:** house style text + Riley master (try 2 of 3; try 1 had an open collar and a backdrop) + 4-view model sheet. Trolloc master (try 2; try 1 had hooves).
2. **Animation sheets:** one image_gen call per action, with the master attached. Codex inspected each and retried up to 3 times.
3. **`slice2.py`** cuts each sheet by figure count. Pixels are copied, never altered. No component had to be split.
4. **`build_anim.py` registers frames:**
   - one uniform scale per sheet (matched by standing height / head width to a common body size), plus one per-row factor where a sheet drew row 2 smaller;
   - translation to a torso anchor and the sheet's own ground line.
   - It then generates algorithmic normal maps and writes GIF/MP4 loops.
5. **`pack.py`** builds trimmed WebP atlases + normal-map atlases for Phaser.

**Honesty rules followed:**
- No frame was blurred, mirrored, recolored, warped, interpolated or invented.
- The only operations on art are cropping, uniform resizing (LANCZOS) and translation.
- Holding a frame for longer, and reusing a drawn frame in a gameplay segment (e.g. the jab's wind-up frame doubles as its recovery), are timing choices, and they are listed in `frames/*.json`.
- Bloom, vignette and lights in the prototype are real-time post effects on the whole scene, not edits to the art.

### Frame counts (delivered)

| Animation | 1.2 frames | 2.0 spike frames | Sheet kept on try |
|---|---|---|---|
| Riley idle | 1 | 6 | 3 |
| Riley walk | 8 | 8 | 2 |
| Riley 3-hit combo (jab → front kick → spinning hook kick, with wind-up and follow-through) | 2 (kick, roundhouse) | 12 | 3 |
| Riley hurt | 1 | 3 | 3 (row 1 of the hurt sheet) |
| Riley knockdown + get-up | 2 (lying, getup) | 8 | 1 (after I rejected the first knockdown row, see §3.3) |
| Trolloc walk | puppet (1 image) | 8 | 2 (re-generated at 2× resolution) |
| Trolloc overhead chop | puppet | 6 | 2 |
| Trolloc hurt | puppet | 2 | 2 |
| Trolloc knockdown | puppet | 5 | 2 |
| **Total** | | **58** | |

Source resolution: Riley's figures are about 480 px tall versus 229 px in 1.2. In-game, Riley stands about 30% of screen height (213 of 720 px) versus 19% in 1.2.

## 3. Consistency between frames: honest report

### 3.1 What holds

- **Identity:** face, short dark hair, thin blue rectangular glasses, very muscular 16-year-old build, sleeveless black Asha'man coat with the silver sword pin, fingerless gloves, boots. These hold in every Riley frame across 5 separate generations. He never reads as a kid. The glasses disappear only in the two back-turned spin frames, which is correct.
- **Trolloc:** boar face, ram horns, spiked pauldrons, red cloth, clawed feet and scimitar shape hold across 3 generations.
- **Measured color drift** (`consistency.json`, CIE ΔE against the master):
  - Riley skin averages ΔE 5.0 (max 6.8); coat ΔE 3.2 (max 4.4).
  - Trolloc hide ΔE 3.0 (max 5.5); red cloth ΔE 3.5 (max 7.8, the lying frame).
  - ΔE of about 2–3 is "just noticeable" side by side. At game size and in motion these drifts don't read, and the hurt sheet (ΔE 6.5) is the warmest.
- **Measured scale after registration:** Riley's head width is 61–71 px across all standing frames from 5 sheets (±7%). Before registration, the raw sheets differed by up to 1.5× in figure size, so registration is required, not optional.

### 3.2 What drifts or needs work

- **Between-sheet scale:** every sheet comes back at a different scale, and the combo sheet drew row 2 about 10% smaller than row 1. Both are fixed by uniform per-sheet / per-row scaling, but the scale reference has to be chosen by a person (or by head width) per sheet.
- **Guard pose varies slightly between sheets** (idle vs combo end vs get-up end): fists a little higher or lower. Transitions show a small pop at 1-frame scale. For Stage 1, generate the "return to guard" frames *with* the idle sheet attached as a reference (already done for idle; that worked best).
- **Rigid weapon:** the Trolloc smear frame stretches the blade (above). The other 20 frames keep the blade's length and curve.
- **Hurt frames 1–2** turn Riley's torso more toward the camera than his other frames. Readable, but slightly off-model.
- **Trolloc walk v1** came back small (about 345 px figures) because 8 frames were squeezed into one row. The 2-row version (about 400 px) is the one used. **Rule for Stage 1: at most 4–6 frames per row.**
- **Get-up to idle:** good with 8 frames. The Trolloc's get-up ends on one knee and then pops to walking (no rise frames were requested). Stage 1 needs 2 more frames.

### 3.3 One real failure, caught and fixed

The first Riley knockdown row (hurt sheet, row 2) had him **falling toward the attacker**: head on the right, feet on the left. Mirroring it would have been faking, so I regenerated with an explicit "head on the LEFT" instruction (`gen/riley/down/`). It came out correct on try 1. **Lesson:** direction-sensitive moves need the direction spelled out, and the QA judge must check it.

## 4. The lit Phaser 4 prototype

**Stack:** Phaser **4.2.1** (WebGL2), vendored, no build step. All prototype code is in `proto/main.js` (about 306 lines).

**What's in it:**
- **Backdrop:** a new house-style Stage 1 snow backdrop (3 generated layers: far sky/hills, mid village with burning cottages and the Winespring Inn, snowy street).
- **Lit sprites:** Riley and the Trolloc use **normal-mapped atlases** and react to the scene lights. Press **L** to see them flat.
- **Lights:**
  - a moon rim light;
  - 3 flickering fire lights placed on the burning cottages;
  - a hero key light on Riley;
  - a **fireball that is a moving point light** and lights faces, armor and snow as it flies;
  - an expanding explosion light on impact;
  - a short local light at every hit.
- **Hit-stop:** 4 / 6 / 9 / 14 frames (light / medium / heavy / finisher). Both fighters freeze and the victim shudders. The finisher adds 0.28 s of slow-mo.
- **Shake:** trauma-squared camera shake, plus a landing thump on knockdowns.
- **Particles:** 2 snow layers (behind and in front of the fighters), embers rising from the fires, hit sparks and sparks-with-gravity, landing dust, and a fireball ember trail.
- **Post effects:** threshold + blur bloom (**B** toggles it) and a vignette.
- **Controls:**
  - Keyboard: move with arrows/WASD; attack with J/Z (tap 3× for the combo); fireball with K/X; B / L / M (M = quarter-speed view to study frames).
  - iPad: touch buttons.
- **On-screen perf readout:** fps, p95 frame time, and frames over 33 ms in the last 1,800 frames.
- **URL options:** `?rs=1` forces 1× render scale, `?bloom=0` turns bloom off, `?demo=loop` plays the scripted fight forever.

**Screen capture:** `shots/proto-demo-60fps.mp4` was rendered offline by stepping the game exactly 1/60 s per frame in headless Chromium. It shows what the game looks like at 60 fps; it is **not** a device performance measurement.

**Performance:** NOT MEASURED on real hardware. The box renders with software WebGL (SwiftShader) at about 9–25 fps, which says nothing about an iPad. The design is light for a GPU: 2 sprites, 3 plates, a few hundred particles, 8 lights, 2 full-screen filters.

**Prototype limits** (on purpose; it's a spike):
- 1 enemy, no HP bars, no menus.
- Riley always faces right and the Trolloc left (flipping normal-mapped sprites needs a normal-map flip, a known Stage 1 engineering item).
- The fireball cast reuses the jab frames (Stage 1 needs dedicated cast frames).
- Hit boxes are hand-tuned numbers.

## 5. Risks found

1. **Retries for layout cost quota.** Most sheets took 2–3 tries. Two-row layouts with at most 6 frames per row fixed most crowding. Budget about 2.3 generations per sheet, not 1.8 (LEVELS.md assumed 1.8; that now looks optimistic, so the ten-stage plan needs about 25% more image generations).
2. **Scale normalization needs a reference per sheet.** Automate it with a head-width / torso-length measure plus a human glance at the contact sheet.
3. **Direction errors** (§3.3) and **weapon stretching on smear frames** need explicit prompt rules and an automated check (blade-length measurement on rigid props).
4. **Device performance is still unproven** until Jason opens the link on the iPad.
5. **Gemini and Grok/Gemini video were not exercised.** They need browser sessions that this agent didn't have. The ten-stage plan's cross-check (Gemini masters) and the cutscene plan remain untested.
6. **Normal maps are algorithmic** (alpha distance + luminance). They give believable rim/relief light, but not true sculpted form. Fine for 2D. Hand-tuned normals are not planned.

## 6. Next step (on approval)

Stage 1 vertical slice on branch `rwb-2` (branched from `rwb-2-spike`), per PLAN.md §10 Phase 1 and LEVELS.md. **First art batch:**
- Riley run, jump, air kick, back attack, cast (fire weave), grab set, and a 2-frame return-to-guard;
- Trolloc spear and hound masters;
- the Trolloc Chieftain master;
- a re-roll of the Trolloc chop with a rigid smear blade.
