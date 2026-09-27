# Riley Wheel Brawl — current status

Runtime stamp on this branch: `?v=20260927-scroll2`. Branch `rwb-scroll`, cut from `rwb-w2` at `a65e981`. Not merged. GitHub Pages still serves `rwb-w2` (PR #5, live). `main` is untouched at `3991948`. This branch does not change Pages.

## Scrolling stages (scroll2)

Before: a cleared wave added one to the wave index and dropped Riley back at the left of the next fight on the same plate. The stage was 3000 units and the picture did not travel. The first scroll pass crossfaded zoomed crops, so the street still felt still.

After: every stage is a 4240-unit street (6.625 screens at the 640-wide view). Six fight zones sit at 0, 720, 1440, 2160, 2880, and 3600. The last zone is the boss arena. Clearing a wave plays a chime, holds a flashing `GO →`, unlocks the camera, and Riley walks right. The camera only moves forward (the Whale Lance lock: `camX = max(camX, target)`, reused as `Camera.noForwardBacktrack`). Walking onto the next zone line locks the camera there and the next group walks in from off the left and right edges. Nothing teleports between waves. A save taken during the walk records the next zone. Continue starts at the saved zone.

The backdrop is the painted plates at full resolution. Far scrolls at 0.08× the floor, one plate, no crop. Mid is a strip of slices of that stage's own plate at 0.40× (stage 1 is 720 units wide, the others 700), with the far plate showing through the gaps. Near tiles at 1.15× along the bottom 26 units. The floor stays 1:1. Nothing is crossfaded. Stage 5's roof is a hard cut behind a 0.2s fade to black and a 0.2s fade back in, and the boss walks in after that. Paintings that would replace the slice pools are listed in `NEEDED_ART.md`.

Damage scales are `[1.60, 1.55, 0.76, 1.50, 1.00]`. The first try (`[1.60, 2.95, 0.78, 1.80, 1.35]`) overshot Stages 2 and 5; these are the values that land in the live damage band at 7–8 clears.

Mooks spawn past the screen and dash at 3× until they are fully on screen or within 90 units of Riley. Shadow bosses walk to a fixed mark during the intro, then stay clamped to the arena. The chieftain covers the gap to his mark during the short intro.

### scroll2 measurements on this machine

Software canvas, 1280×720, clock after stage enter and two frames, LITE off. 0 errors.

| Case | fps | p99 | frames >20ms | max | enter |
| --- | --- | --- | --- | --- | --- |
| Stage 1 wave 3 | 60 | 16.8 | 0 | 16.8 | 674.2ms |
| Stage 3 wave 3 | 60 | 16.8 | 0 | 16.8 | 381.1ms |
| Stage 5 wave 3 | 60 | 16.8 | 0 | 16.8 | 574.3ms |
| Stage 4 boss | 60 | 16.8 | 0 | 16.8 | 245.1ms |
| Stage 1 walking (33s) | 60 | 16.8 | 0 | 16.8 | 224.6ms |
| Stage 3 walking (33s) | 60 | 16.8 | 0 | 16.8 | 326.8ms |
| Stage 5 walking (33s) | 60 | 16.8 | 0 | 16.8 | 519.9ms |

Natural soak (3 lives, seeds 1–10, exit 1 because some seeds die): clears 8/8/7/8/8, every boss attack seen 10/10. Median damage 248.7, 253.5, 284.4, 199, 289.5 (live targets 250, 252, 271, 214, 296, all inside ±12%). Assisted soak: 10/10 on every stage, exit 0.

`node tools/check.cjs`: All checks passed (112), including the mid-walk save and the per-stage far-edge and mid-strip checks. Parallax max deviation 0.02px. Boot canvas memory 77.6 MB, 41 canvases. Mid-fight at render scale 2: Stage 1 105.3 MB, Stage 4 155.1 MB. `tools/review.cjs`: 77 loaded, 0 missing, 0 unstamped, fallback stage playable. Smoothness checks: 9.

SwiftShader was not re-run. It was not 60 fps on the grok3d measurement.

## grok3d (merged, historical)

Runtime stamp on the merged branch was `?v=20260926-grok3d`. PR #5 (`rwb-grok3` at `12ac675`) was merged into `rwb-w2` as `860119c` on 2026-09-26 at 10:23 PM PT. Jason approved the merge in chat right after the independent grok3d review came back GO. `rwb-w2` is the branch GitHub Pages serves. `main` is untouched at `3991948`. GitHub Pages settings are unchanged.

Natural soak at `12ac675` (3 lives, no HP top-up, seeds 1–10, with the new damage and knockback numbers in `js/data.js`): 7/8/8/8/8, every boss attack seen 10/10. Assisted soak: 10/10 on every stage (50/50).

## What this pass changes

Mid-fight time on a software canvas was per-enemy mesh skinning (about 8 ms each) plus, on Stage 1, a `ctx.restore()` that composited alpha plates (about 9 ms). This pass:

- Bakes one shared pose atlas per rig (12 walk frames, 6 kick frames, plus idle, hurt, cast, attack, air, and channel) and blits it. Hit tint uses `source-atop` only on that private copy, never on the main canvas.
- Reuses one opaque background view per camera pixel, with the stage soft-light grade and vignette baked in, so the live frame does not blend the framebuffer.
- Caches the HUD and the on-screen control diagram and redraws them only when the displayed values change.
- Batches sparks and glows under one blend-mode switch, and draws snow as one fill. No per-frame `filter` or `shadowBlur`.
- Warms the on-screen canvas during `prepareRendering` so the first texture upload is not inside the measured fight.
- Stronger heavy/boss hit-stop, punch, shake, knockback, slash, and debris. Light hit-stop stays 25 ms and super stays 140 ms.
- Natural damage scales are `[1.34, 2.66, 0.72, 1.52, 0.76]`. Boss health, move lists, and Riley's damage are unchanged.

Riley still draws only the muscular 16-year-old frames in `assets/art/riley16/`. Be'lal still uses his painted frames with the sword in hand. Plates are not mirrored. No new image assets, runtime dependencies, or build step.

## grok3b review fixes

Independent review of `935a6f2` confirmed the pace and balance numbers. This stamp fixes four regressions from that pass.

### Continue save

Before: `warmDisplay()` constructed four fights and `setSceneNow` entered each one. `spawnWave()` and `enter()` both write `localStorage['rwb-run']`. A page load replaced any Continue slot with Stage 4, wave 5 (Be'lal), 99 lives, boss HP 1100. A fresh profile was left with that save, so the title showed CONTINUE. Measured on a seeded Stage 2 string (`level: 1`, `wave: 2`): after load the stored JSON was the Be'lal checkpoint, not the seed.

After: warmup still draws those four scenes onto the game canvas, but it does not call `setSceneNow` / `enter()`, and it puts the exact `rwb-run` string back afterwards (or removes the key if there was none). The seeded Stage 2 string is byte-identical after the page loads, and a fresh profile has no `rwb-run` and no CONTINUE.

### Planted hooves

Before: each baked walk frame kept the stance foot at a fixed offset from the body, so the hoof skated forward at the walk speed. Sampling the baked blit (bottom opaque pixels, not the gait targets) while the body advanced at `stride * 2` per cycle, a Trolloc's ground contact moved 60px and 23px across the two halves of a step. Body travel in that same window was 22.4px.

After: the stance hoof is baked at the world position where that step began, so it moves backward in the frame as the body walks on. The same pixel measurement, on the interior of each stance, is 0px of drift for a Trolloc, chieftain, darkfriend, guard, Asha'man, and Taim. The worst rig is the cultist's trailing hem at 8px while the body travels 13.6px; Loial's late contact moves 6px against 18.7px of body travel. A body-locked hoof moves about as far as the body and fails the check.

### Dust and debris

Before: dust and chunks were `fillRect`s, so foot impacts read as small hard rectangles.

After: both draw the cached radial sprite from `RWB.effects.glow` (one canvas per color, no `filter`, no `shadowBlur`). A dust puff's corner alpha is 0 and its center alpha is 107; a debris puff is the same shape in the particle color.

### Background scroll

Before: the opaque stage cache was keyed and painted on whole camera pixels, then blitted at `x = 0` with smoothing off. Sprites use the raw camera, so the plate sat still for up to 1px and then jumped. A Stage 1 row at camera 100 and camera 100.4 was the same bitmap.

After: the cache is still one view per whole pixel. It is drawn at `round(camera) - camera` (smoothing on only for that fractional blit), and the uncovered sliver repeats the edge pixel. Camera 100.4 now differs from camera 100 on 607 of 640 pixels in the sampled row.

## Pacing

`tools/pace.cjs`, headless Chromium, 1280×720 viewport, real `requestAnimationFrame`, 10 s per case, LITE forced off (`runtimeLite=false`, `observe` replaced with a no-op). Cases are Stage 1/3/5 wave 3 and the Stage 4 boss. Canvas backing store is 1280×720.

The numbers below are from this VM. The starting point quoted for the task, measured elsewhere, was Stage 1 about 31–36 fps (p95 50 ms, 26–31 ms update+draw), Stage 3 about 31–33 fps (p95 33–50 ms, ~18 ms), Stage 5 about 40 fps (11–13 ms), and the Stage 4 boss at 60 fps under 1 ms.

### Software canvas (`--disable-gpu --disable-accelerated-2d-canvas`)

Before is `08c74ae`. After is grok3b on this branch (re-measured after the review fixes; `935a6f2` was 60 fps, p99 16.8 ms, and 0 frames over 33 ms on all four).

| Stage | Before fps | Before p95 / p99 | Before >33 / >50 | Before update+draw | After fps | After p95 / p99 | After >33 / >50 | After update+draw |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 wave 3 | 20.53 | 66.7 / 83.4 | 204 / 37 | 46.41 ms | 59.9 | 16.8 / 16.8 | 1 / 0 | 0.39 ms |
| 3 wave 3 | 23.28 | 50.1 / 50.1 | 228 / 22 | 30.01 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.37 ms |
| 5 wave 3 | 39.74 | 33.4 / 33.4 | 203 / 0 | 14.52 ms | 60 | 16.8 / 16.8 | 0 / 0 | 0.27 ms |
| 4 boss | 60 | 16.7 / 16.8 | 0 / 0 | 0.42 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.25 ms |

Software mode stays at ~60 fps, p99 16.8 ms, and 0 frames over 50 ms. Stage 1 had one frame between 33 and 50 ms. Update+draw is still under half a millisecond.

### SwiftShader / WebGL (`RWB_ACCELERATED=1`)

Same tool and cases. Update+draw on the after run is under half a millisecond; the gap is the SwiftShader present, not the simulation. A blank 1280×720 canvas on these flags holds about 56 fps, so a full fight does not reach 60 here.

| Stage | Before fps | Before p95 / p99 | Before >33 / >50 | Before update+draw | After fps | After p95 / p99 | After >33 / >50 | After update+draw |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 wave 3 | 4.24 | 483.3 / 533.2 | 21 / 21 | 2.22 ms | 30.45 | 66.7 / 100 | 142 / 37 | 0.36 ms |
| 3 wave 3 | 5.56 | 500 / 533.3 | 28 / 28 | 1.83 ms | 32.05 | 66.7 / 83.4 | 127 / 53 | 0.34 ms |
| 5 wave 3 | 5.98 | 500 / 516.6 | 29 / 29 | 1.13 ms | 33.65 | 66.7 / 100 | 128 / 34 | 0.30 ms |
| 4 boss | 7.59 | 316.6 / 416.7 | 37 / 37 | 0.63 ms | 49.04 | 33.4 / 83.3 | 63 / 15 | 0.21 ms |

The before SwiftShader run shared the machine with another Chromium. It is a floor, not a quieter baseline. The after run was alone. Neither meets 60 fps, p99 under 20 ms, or 0 frames over 50 ms.

## Difficulty

`node tools/soak.cjs --natural` (3 lives, no HP top-up, seeds 1–10). Before, on `08c74ae`, was 10/8/7/8/8. After:

| Stage | Clears | Seconds | Median damage | All boss attacks/seed |
| --- | --- | --- | --- | --- |
| 1 — Emond's Field | 7/10 | 69.7–95.1 | 249.58 | 10/10 |
| 2 — Caemlyn | 8/10 | 54.5–64.7 | 251.87 | 10/10 |
| 3 — Shadar Logoth | 8/10 | 107.1–137.8 | 270.56 | 10/10 |
| 4 — Tear | 8/10 | 63.2–84.9 | 214.44 | 10/10 |
| 5 — Black Tower | 8/10 | 73.2–95.2 | 296.06 | 10/10 |

Every boss attack is seen on every seed, including seeds that do not clear. Natural mode still exits nonzero when a seed fails. These are bot results, not playtests.

`node tools/soak.cjs` (assisted, 99 lives and HP top-up) is 50/50:

| Stage | Clears | Seconds | Median damage | All boss attacks/seed |
| --- | --- | --- | --- | --- |
| 1 | 10/10 | 76.1–98.8 | 311.55 | 10/10 |
| 2 | 10/10 | 56.4–71.4 | 329.84 | 10/10 |
| 3 | 10/10 | 105.4–155.3 | 273.24 | 10/10 |
| 4 | 10/10 | 62.6–88.1 | 253.84 | 10/10 |
| 5 | 10/10 | 68.1–98.5 | 298.96 | 10/10 |

## grok3c review fixes

Independent review of `cb2d0ed` confirmed the grok3b save, hoof, dust, and sub-pixel blit fixes. This stamp fixes three more before go-live.

### Exposed edges on a hit

Before: a live fight skipped the framebuffer clear. `camera.apply` then shifted the world by shake plus knockback (punch is 12–20px, and shake adds more). The strip that shift uncovers kept the previous frame. A 13px push left a stale band.

After: every fight frame fills a 48px black border on all four sides before the world is drawn. Menus still clear the whole buffer. After a heavy hit at the max push (punch 20 + shake 13, and the opposite signs), the exposed rows and columns contain no leftover marker pixels (`stale: 0` on both corners, 7496 samples each).

### Pause control

Before: the control chrome was cached full-frame but only the bottom 160 rows were blitted. The pause button sits at y=34, so the `II` never appeared during a touch fight, and the desktop `ESC` badge beside it was clipped too.

After: the cached layer is blitted whole. Mid-fight, drawing the controls raises the pause-button luminance from 177 to 457 on touch and the ESC-badge luminance from 166 to 405 on desktop. The HUD and the control cache also clear and reuse their buffer when the picture changes, instead of assigning `canvas.width` again.

### Pose-atlas memory

Before, on this machine at the title: **498.2 MB**, 577 live canvases. Boot pre-baked every rig at a fixed 384px pose height and a flash copy of each (the review's ~270 MB → ~520 MB, +484 canvases).

After, at the title, before any stage is entered: **227.0 MB**, 78 live canvases. Poses bake at the live render scale, capped at 3× (the AUTO desktop budget). Flash copies are created on the first hit. Only the rigs for the current stage are baked, on stage enter, and the previous stage's atlases are released. Stage enter on this software canvas costs about 180–540 ms of baking (Stage 1 537 ms, Stage 4 boss 178 ms); the mid-fight clock starts after that.

### Also

- Parallax groups blit at `k * (round(camera) - camera)`. On a 0.8px camera step the floor shifts one pixel and the distant mid layer stays on its sub-pixel offset (best shift 0, not 1).
- Crate debris passed a single colour string into `pick`. `chunks` now wraps a string as a one-colour list. Particles from `'#8a6039'` keep that colour.

## Pacing (grok3c)

Software canvas, same tool and cases as grok3b. LITE forced off. The sample starts after stage enter and two frames.

| Stage | grok3b fps | grok3b p95 / p99 | grok3b >33 / >50 | grok3b update+draw | grok3c fps | grok3c p95 / p99 | grok3c >33 / >50 | grok3c update+draw |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 wave 3 | 59.9 | 16.8 / 16.8 | 1 / 0 | 0.39 ms | 60 | 16.8 / 16.8 | 0 / 0 | 0.33 ms |
| 3 wave 3 | 60 | 16.7 / 16.8 | 0 / 0 | 0.37 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.34 ms |
| 5 wave 3 | 60 | 16.8 / 16.8 | 0 / 0 | 0.27 ms | 60 | 16.8 / 16.8 | 0 / 0 | 0.29 ms |
| 4 boss | 60 | 16.7 / 16.8 | 0 / 0 | 0.25 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.22 ms |

SwiftShader was not re-run. It is still not 60 fps. See the grok3b table above.

## Difficulty (unchanged)

Natural soak re-run: **7/8/8/8/8**, attacks 10/10, same medians as grok3b (249.58, 251.87, 270.56, 214.44, 296.06). Assisted: **50/50**, exit 0, same medians (311.55, 329.84, 273.24, 253.84, 298.96). Damage scales were not changed.

## Checks

- `node tools/check.cjs`: All checks passed. No previous check was weakened. New checks: exposed edges after max push have no stale pixels, the pause `II` is on screen mid-fight on touch, the desktop `ESC` badge is on screen, boot canvas memory is at or below 300 MB, each parallax layer keeps its own sub-pixel step, and crate debris accepts one colour string. Save, hooves, and soft dust still pass.
- `node tools/smoothness-check.cjs`: **9 passes**.
- `tools/review.cjs`: **77 loaded, 0 missing, 0 errors**, stamp `20260926-grok3c`.
- `tools/smoothness-browser.cjs`: mesh missing fraction 0, context loss still paints, no page errors.
- Natural soak: **7/8/8/8/8**. Assisted: **50/50**, exit 0.

## grok3d

`fa7da17` kept the edges, the pause pixels, and the 227 MB boot. Two bugs were still in that build, and in live `08c74ae`.

### Pause stays open

Before: `Play.update` set `paused` on the pause press, then `PauseMenu.update` saw that same press and returned `resume`. Tap `II`, click, and ESC never left the menu up.

After: the update that opens the menu does not feed that press into the menu. A later pause press, or choosing RESUME, closes it. The check covers ESC, a tap on `II` (pause plus the touch click), and a click on `II`: each opens, stays open on the next update, then resumes.

### Capped parallax

Before: cached layers shifted by the nominal factor, 0.10 and 0.42. `tiled()` caps the real factor at `(width - 640) / CAMERA_RANGE`. On these plates that is about 0.025 (far) and 0.034 (Stage 1 mid). The leftover was a sawtooth of about 0.35 device px. Live scroll of the same plates is about 0.03.

After: while a layer is painted, `tiled()` records the capped factor, and the blit uses that. Floor stays at 1. Sky and the screen wash stay at 0. Against a live paint of the same layer, at camera 100.5 and 100.8, the residual is 0 px on base, back (k 0.0254), mid (k 0.0339), floor, and screen. The check requires ≤ 0.1 px.

### Fade-in

The stage-enter bake ran inside the frame that flipped the fade from out to in. The next frame's dt is capped at 0.1 s, so the overlay fell from fully black to 40% dark in one step. The fade-in clock now starts when that bake returns.

## Pacing (grok3d)

Software canvas, same tool and cases. LITE forced off. The sample still starts after stage enter and two frames. 0 errors. Canvas 1280×720.

| Stage | fps | p95 / p99 | >33 / >50 | update+draw | enter | pose bake |
| --- | --- | --- | --- | --- | --- | --- |
| 1 wave 3 | 60 | 16.7 / 16.8 | 0 / 0 | 0.32 ms | 634 ms | 564 ms |
| 3 wave 3 | 60 | 16.7 / 16.8 | 0 / 0 | 0.41 ms | 351 ms | 304 ms |
| 5 wave 3 | 60 | 16.8 / 16.8 | 0 / 0 | 0.36 ms | 644 ms | 614 ms |
| 4 boss | 60 | 16.7 / 16.8 | 0 / 0 | 0.25 ms | 197 ms | 159 ms |

SwiftShader was not re-run. It is still not 60 fps.

## Difficulty (grok3d, unchanged scales)

Natural soak: **7/8/8/8/8**, attacks 10/10. Medians 249.58, 251.87, 270.56, 214.44, 296.06. Time ranges 69.7–95.1, 54.5–64.7, 107.1–137.8, 63.2–84.9, 73.2–95.2. Exit code is nonzero because some seeds fail. Assisted: **50/50**, exit 0. Medians 311.55, 329.84, 273.24, 253.84, 298.96. Ranges 76.1–98.8, 56.4–71.4, 105.4–155.3, 62.6–88.1, 68.1–98.5. Damage scales were not changed.

## Checks (grok3d)

- `node tools/check.cjs`: All checks passed. New checks: pause opens and stays open for ESC, tap `II`, and click, then resumes; every parallax layer stays within 0.1 px of the factor `tiled()` used. Save is byte-identical, hooves and soft dust still pass, edges stay clean, pause `II` luminance 189→493 and ESC badge 166→405.
- Boot canvas memory: **227.0 MB**, 78 canvases.
- `node tools/smoothness-check.cjs`: **9 passes**.
- `tools/review.cjs`: **77 loaded, 0 missing, 0 errors**, stamp `20260926-grok3d`.
- `tools/smoothness-browser.cjs`: mesh missing fraction 0, mean channel error ~0, context loss still paints, no page errors.

## Still weak / limits

- SwiftShader at 1280×720 does not hold 60 fps. The CPU-side frame is cheap; the present is not. This does not certify a phone GPU. AUTO can still lower the buffer when `observe` is left enabled; the pace run forces that off.
- Walk and kick poses are 12 and 6 baked frames. Inside one frame the hoof is fixed while the body keeps moving, so a step can drift by up to one twelfth of a cycle before the next frame. The live IK contact check is unchanged; the new check reads the baked pixels.
- The sky plate still gets the soft-light wash, and the vignette is still drawn. The scrolling plates are not re-graded on each camera step: doing that on every layer was a several-hundred-millisecond hitch. Fighters are not re-tinted every frame.
- Entering a stage bakes that stage's pose atlas on the CPU before the fade-in starts. On this software canvas the grok3d enter is 197–644 ms (Stage 5 pose bake 614 ms, Stage 1 564 ms). Mid-fight stays at 60 fps after the two-frame settle. The first presented frame is the start of the fade-in, not a frame that is already 40% dark.
- Ten natural seeds are a small deterministic sample. No gamepad, phone, or child playtest is claimed.
