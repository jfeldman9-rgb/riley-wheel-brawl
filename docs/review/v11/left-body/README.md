# Painted Riley left-wall containment

## Result

The original 40-unit clamp clipped 294 of 2,142 decoded-pixel cases. The focused fix clips none, including an alpha > 0 check. The independent 38-frame/facing probe is reproduced: **10 failures before, zero after**. Worst painted left extent is 61.624454 world units (left-facing roundhouse), requiring a 62-unit margin. 1,848 matrix cases retain exactly the original 40-unit margin.

- 19 original frames, both facings
- Five walking exposure phases, using real `spriteFrame()` selection and stance shear
- Render scales 0.75, 1, 1.25, 1.5, 2, 2.5 and 3
- Arena/camera origins (0, 0), (720, 720), and (720, 740.125)
- 204 exact support checks against every occupied source row, with and without hit tint
- 30 recoil, state-order, camera, early-return and render-restoration cases

This is native Skia / decoded Canvas2D evidence, not a browser or physical-device claim. Source fireball paint is part of its authored frame. Added sword, rim glow, shadow and particles are excluded from body bounds.

## Implementation

`Riley.paintedBodyBounds()` evaluates a small precomputed convex support of the original alpha silhouette, using the unchanged body correction and lower-body shear. It never scans pixels at runtime. Nonwalking bounds use the verified two transparent border columns. The runtime and image-free balance harness therefore use the same geometry.

`containPaintedBody()` moves the whole actor x, preserving 40 units wherever adequate. Authoritative simulation uses only arena/camera world bounds; transient shake and punch never push gameplay physics. Containment runs after Riley physics, after late enemy/hazard state changes and camera follow, and for early-return paths.

Rendering has a separate saved snapshot check because a newly selected pose can be wider than an interpolated previous position. `Play.draw` explicitly saves/restores Riley and any grabbed actor x, including alpha=1, missing previous-tick data and paused rendering. The whole actor, shadow and sword remain aligned. A `finally` block restores draw-only changes before normal motion restoration. No sprite-only offset, clipping mask, source scaling or hidden limbs is introduced.

The coordinated clear-screen hint fix also requires `phase === 'play'` before showing the Stage 5 POWER prompt.

## Evidence

The complete JSON matrices, review PNG and logs are retained in the review archive. The additive tool regenerates them locally; only compact source-verification records are stored here.

- `left-body-containment.json`: final source hashes, all source art hashes, 2,142 measurements, support checks and 30 ordering/restoration scenarios
- `left-body-before-after.png`: all 38 original probe combinations, with red original / green fixed wall lines
- `baseline-left-body-containment.json`: same additive test against the pre-fix runtime snapshot
- `source-verification.json`: source hashes and byte-identical `spriteFrame`, `drawSprite`, and `drawCallandor` method checks
- `source-art-sha256.json`: all 19 unchanged source PNG hashes
- `victory-left-probe.json`: five actual decoded victory paintings, both facings, camera translation 0 and -12
- `combat-check.log`, `smoothness-check.log`, `offline-foot-check.log`: unchanged acceptance checks

All five victory paintings fit the retained margin: rendered widths are 55.39–78.39 units. No clipped victory-body pixels were measured; the smallest left edge was +1 logical pixel in the tested translated Stage 5 case. This probe uses the saved render-snapshot containment, while authoritative x stays unchanged.

The original `spriteFrame`, `drawSprite` and `drawCallandor` method bodies remain byte-identical. All 19 source PNGs, gait data and inherited test assertions/thresholds remain unchanged. The containment patch itself changes no difficulty coefficients; subsequent Hard recalibration is reported separately. Offline gait metrics remain maximum tear excess 2 render pixels, contact slip 15 and body offset 2.

## Checks and limits

- PASS: additive decoded-pixel and restoration regression
- PASS: 247 v1.1 combat checks
- PASS: 9 smoothness checks
- PASS: all 23 locked inherited acceptance tools unchanged
- PASS: unchanged offline gait metrics
- Full `tools/check.cjs` reached its browser phase after synchronous checks; the local browser launch was blocked by sandbox `socket() failed: Operation not permitted`. No browser pass is claimed here
- Full Normal/Hard 400-run balance verification and final browser acceptance remain separate integration gates. No difficulty calibration is included in this change

Run the additive regression with:

```sh
node tools/left-body-check-v11.cjs
```

For a saved before-runtime checkout that shares these unchanged assets:

```sh
node tools/left-body-check-v11.cjs --root=/path/to/before-runtime --art-root=/path/to/repo --out=/path/to/baseline-evidence --record-baseline
```
