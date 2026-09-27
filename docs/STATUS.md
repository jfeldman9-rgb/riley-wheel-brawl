# Riley Wheel Brawl — current status

Branch `rwb-grok3`; draft PR targets `rwb-w2` at `08c74ae`. Runtime stamp: `?v=20260926-grok3b`.
No changes or merges to `main`. GitHub Pages settings are unchanged. Nothing was merged.

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

Before is `08c74ae`. After is this branch.

| Stage | Before fps | Before p95 / p99 | Before >33 / >50 | Before update+draw | After fps | After p95 / p99 | After >33 / >50 | After update+draw |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 wave 3 | 20.53 | 66.7 / 83.4 | 204 / 37 | 46.41 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.32 ms |
| 3 wave 3 | 23.28 | 50.1 / 50.1 | 228 / 22 | 30.01 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.31 ms |
| 5 wave 3 | 39.74 | 33.4 / 33.4 | 203 / 0 | 14.52 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.31 ms |
| 4 boss | 60 | 16.7 / 16.8 | 0 / 0 | 0.42 ms | 60 | 16.7 / 16.8 | 0 / 0 | 0.22 ms |

Software mode meets ~60 fps, p99 under 20 ms, and 0 frames over 50 ms on every measured stage.

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

## Checks

- `node tools/check.cjs`: All checks passed. No previous check was weakened. New checks: a seeded Stage 2 save is byte-identical after a real page load, a fresh profile has no CONTINUE, baked walk frames keep the planted hoof within 8px (and under 70% of body travel) in world space, dust and debris pixels are soft rounds, and a fractional camera moves the cached background.
- `node tools/smoothness-check.cjs`: **9 passes**, including the light hit-stop cooldown and the super hit-stop.

## Still weak / limits

- SwiftShader at 1280×720 does not hold 60 fps. The CPU-side frame is cheap; the present is not. This does not certify a phone GPU. AUTO can still lower the buffer when `observe` is left enabled; the pace run forces that off.
- Walk and kick poses are 12 and 6 baked frames. Inside one frame the hoof is fixed while the body keeps moving, so a step can drift by up to one twelfth of a cycle before the next frame. The live IK contact check is unchanged; the new check reads the baked pixels.
- The background grade is baked into the opaque view, so fighters are not re-tinted with soft-light every frame.
- Ten natural seeds are a small deterministic sample. No gamepad, phone, or child playtest is claimed.
