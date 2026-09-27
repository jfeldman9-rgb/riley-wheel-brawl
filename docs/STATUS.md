# Riley Wheel Brawl — current status

Branch `rwb-grok3`; draft PR targets `rwb-w2` at `08c74ae`. Runtime stamp: `?v=20260926-grok3`.
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

- `node tools/check.cjs`: **69 passes**, All checks passed. No check was weakened.
- `node tools/smoothness-check.cjs`: **9 passes**, including the light hit-stop cooldown and the super hit-stop.

## Still weak / limits

- SwiftShader at 1280×720 does not hold 60 fps. The CPU-side frame is cheap; the present is not. This does not certify a phone GPU. AUTO can still lower the buffer when `observe` is left enabled; the pace run forces that off.
- Walk and kick poses are 12 and 6 baked frames. Feet in the contact metric still come from the live IK pose, not from the blit.
- The background grade is baked into the opaque view, so fighters are not re-tinted with soft-light every frame.
- Ten natural seeds are a small deterministic sample. No gamepad, phone, or child playtest is claimed.
