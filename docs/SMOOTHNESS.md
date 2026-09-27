# Smoothness pass — twenty improvements

Base: `ae8022a421331ef99a6991f35d5e7ea33d8f4bc7` on `rwb-w2`.
All twenty items below are implemented. The evidence and limitations follow the list.

1. Run gameplay on a bounded 60 Hz simulation clock, independent of display refresh.
2. Interpolate actor, projectile and camera positions between simulation steps.
3. Retain button presses until a simulation step consumes them, exactly once.
4. Reset accumulated time and held inputs after hiding the page or losing focus.
5. Cap AUTO backing resolution to a practical desktop/phone pixel budget; retain SHARP.
6. Adapt AUTO resolution to measured frame cost with hysteresis and gradual recovery.
7. Coalesce resize/orientation/DPR events so they do not repeatedly rebuild the canvas.
8. Decode loaded images before declaring them ready for rendering.
9. Warm character rigs and stage plates incrementally before the first fight.
10. Precompute mesh skin weights and leg blend weights once per source image.
11. Batch indexed mesh triangles in one WebGL draw per actor; retain reusable vertex buffers and precomputed triangle transforms for Canvas fallback.
12. Replace oversized transparent character surfaces with tight pose bounds.
13. Bake character color grading and Riley’s rim/shadow filters into cached textures instead of applying them every frame.
14. Reuse an unchanged pose composite during idle holds and hit-stop.
15. Cull offscreen actors, projectiles and particles without skipping their simulation.
16. Cache appropriately sized stage plates and draw only visible floor tiles.
17. Cache static depth, ambient-light and vignette overlays.
18. Cache fireball, glow and mist textures instead of rebuilding radial gradients.
19. Shorten small-hit pauses and prevent repeated impacts from extending a freeze indefinitely.
20. Use frame-independent camera damping and smooth, fading shake.

The purpose is smooth motion with the painted artwork, readable combat tells and existing input paths retained. Timing changes require fresh natural/assisted soaks. Desktop headless measurements are not claims about physical-phone frame rates.

## Measurements and checks

Matched headless Chromium software-Canvas runs against the baseline and current
checkout (WebGL disabled in both) give these 95th-percentile draw submission
costs, in milliseconds. Each stage uses 90 warmup simulation ticks (10 draws)
and 30 measured draws. These are representative fights with the same bot/seed;
the shorter impact pauses intentionally change combat progression.

| Stage | Desktop before | Desktop after | DPR3 phone before | DPR3 phone after |
| --- | ---: | ---: | ---: | ---: |
| 1 | 177.3 | 53.1 | 568.1 | 59 |
| 2 | 138.4 | 79.3 | 453 | 85.1 |
| 3 | 141.1 | 72.4 | 432.5 | 84.6 |
| 4 | 147.3 | 62.6 | 513.4 | 63.8 |
| 5 | 142.4 | 75 | 489 | 76.5 |

Per-stage samples start at 1280×720 desktop. The phone baseline uses 2576×1449;
AUTO now starts at 1280×720. AUTO can adapt further during the separate native
RAF sample. SHARP can still request a larger backing buffer.

The current indexed WebGL path on SwiftShader submits each stage at **1.1–3.3ms p95**.
Submission time excludes deferred GPU completion. Even after 60 RAF warmup
frames, headless SwiftShader still has long compositor stalls (native RAF p95: 333.3ms
desktop, 316.7ms phone emulation). **This is not a sustained-60fps or physical-phone
claim.** CPU Canvas fallback also remains comparatively expensive in crowds.

Validation:

- 66 inherited/current checks and 9 new smoothness checks pass.
- Real main-loop keyboard tests travel exactly 128 units at 60, 120 and 144Hz;
  a press between ticks produces one attack. Blur pauses and releases movement.
- GPU versus Canvas mesh coverage differs at 4 of 21,376 opaque pixels in the
  tested walking pose (0.019%); mean opaque-channel difference is 0.34/255.
  Deliberately losing WebGL still renders the painted Canvas fallback.
- Browser audit: 77 resources, no missing/unstamped requests or page errors.
  Missing Stage 3 art retries once and remains playable.
- Rendered sole-contact tests remain at zero measured drift/contact error.
- Natural clears: **8, 5, 7, 5, 7 / 10**; assisted clears: **10/10 each**, all boss
  attacks used on every assisted seed. Complete tables: [STATUS](STATUS.md).

The twenty items map to `performance.js`/`main.js`/`input.js` (1–9),
`puppets.js`/`riley.js` (10–14), `scenes.js`/`fx.js`/`stages.js` (15–18), and
`camera.js` (19–20). Tests, raw measurements, current screenshots and reproduction
commands are listed in [review/README.md](review/README.md).
