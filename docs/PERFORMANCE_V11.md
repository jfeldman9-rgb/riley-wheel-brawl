# 1.1 rendering changes and verification

Baseline: live `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc` (`rwb-w2`).
No supplied painting, panorama, collision, gait or walk-tearing allowance was changed by this work.

## Follow-up after native CI on a557efd

The first implementation failed cold-entry acceptance: matched CI passed only 6/30 candidate cold entries versus 20/30 baseline entries. Non-pose initialization cost about 256–286ms on stages 2/3/5, with another 150–216ms until the visible frame. Its full-road background allocation and eager Stage 5 roof build were regressions. The matched fight matrix passed 17/18 candidate windows; acceptance is still strict and incomplete.

The follow-up removes that extra cold work. Only the actual visible 640-unit middle window is painted synchronously. Neighboring 768-unit windows are prepared by resumable queued jobs. Both source-plate rasterization and finished-window copies use16-pixel strips with a small readback per strip, so deferred Canvas work is paid within that slice, and reused as the camera moves. Edge matching reads back only the columns it modifies. Original source plates, independent parallax and a complete first frame are retained. Stage 5's existing wave-four roof preparation is restored. Only present enemy/boss rigs and the immediately available Loial assist are synchronously prepared; absent kinds use the existing incremental queue.

The follow-up passes the additive cache/first-frame-kind tests, nine inherited smoothness tests, and all16 unchanged-threshold pixel-preservation comparisons (including the queued-window path). It has **not yet passed fresh native cold/FPS acceptance**. The new browser report includes `entryTiming.rigMs` and `entryTiming.backgroundMs` so the next run can attribute cold costs directly. No timer boundary or inherited threshold was changed.

## Follow-up after native CI on ecb36da

The bounded-window candidate improved the fast cold sample to 9/10, but Stage 5 with music OFF still took 497.1ms. Its synchronous rig preparation cost 273.1ms versus 108.3ms in the later music-ON sample; backgrounds were stable at about 140ms. The aggregate alone does not identify the extra rig cost, so new native cold rows record construction, first-pose rasterization and first-blit timings for each present kind.

A decoded Skia diagnostic found avoidable work in every first neutral stance: Asha’man, Darkfriend and Loial rasterized 376, 450 and 460 identity triangles respectively, repeatedly resampling the entire processed texture. The follow-up draws that same shaded texture once when the pose values and every source/destination bone endpoint are exactly unchanged, and all final vertex coordinates agree within floating-point roundoff. Any actual deformation retains the original mesh path. Queued identity poses use bounded 16-row copies. This does not defer required first-frame art, change source paintings, or move the cold timer.

The old overlapping identity triangles raised alpha along some shared edges, so neutral-stance edge pixels can differ from the old mesh; the accelerated image is the exact processed texture. `tools/performance-idle-v11.cjs` checks every mesh rig, both facings and scales 1/2/3, records these differences, requires exact pixel equality for transformed poses and exact sole-contact coordinates, and includes a `Number.EPSILON` deformation negative control. The real legacy `prepareStage(level)` API remains available for callers that need all stage rigs; gameplay uses the scene-specific `prepareScene(level, scene)` API. Fresh native acceptance is still required.

The final working-tree report, `review/v11/identity-pose.json`, passes 30 identity-texture checks, 1,380 byte-identical transformed-pose/facing checks, 120 exact contact-coordinate checks, both tiny-deformation negative controls and queued/synchronous parity. Its source hash identifies the candidate; it is not an exact-commit browser result. Maximum mean neutral-stance RGBA delta against old overlapping triangles is 1.060/255 (Taim at 1×). The two `identity-pose-sheet*.png` files in the full checkpoint archive show all ten rigs at 2× in both facings; the reproducible diagnostic writes them again. In the warmed 2× Skia samples, the three Stage 5 kinds’ first-pose submission work totals 118.18ms before and 5.94ms after; those local CPU submission times are not native cold-entry measurements. The ten additive performance and nine inherited smoothness checks pass unchanged.

## First implementation (historical)

- Stage backgrounds are finished independently at their actual parallax factors. A stationary fight reuses one finished composite; camera motion selects source rectangles instead of repainting five viewport canvases.
- Two completed stage/roof variants are retained. Temporary plate/grade canvases are released after composition. Stage 1 prepares during ordinary loading; later backgrounds prepare before the fade starts. Stage 5's roof also prepares at entry.
- The original rounded-camera layer renderer remains a real allocation-failure fallback. Its `_views` diagnostic interface materializes lazily for inherited audits.
- Stage entry no longer renders five extra camera positions or forces an onscreen readback.
- The visible 26-pixel foreground strip is cached and reused.
- Bitmap enemies resize once per display density. Existing mesh-pose caches and their approved topology are unchanged.
- Sparks are capped at 96 and sword streaks at 12; particles, draw buckets and streak stamps are reused. Text still cannot be dropped by the effect cap.
- HUD cache keys represent displayed values, including backing-pixel bar lengths, denominator changes, remapped tutorial text and the actual GO blink. Hidden blink phases do not invalidate it.
- New music starts are released after the first visible frame's rendering opportunity, using the audio module's stale-scene-safe marker. Existing continuous music is retained.

## Valid local evidence for the first implementation

`review/v11/painted-stage3-before.json` and `painted-stage3-after.json` are matched **decoded-image** Skia Canvas2D profiles, 1280×720, 10 warmups and 80 samples per phase. Source hashes accompany both reports. The candidate is an explicitly labelled uncommitted working-tree snapshot: its base commit is not the implementation revision. Its exact render-source SHA256 values identify the measured code; final exact-commit browser evidence is authoritative. CPU profiles and PNGs are adjacent.

| Stage 3 background draw + readback | Live | 1.1 |
| --- | ---: | ---: |
| Stationary p50 | 24.34 ms | 1.17 ms |
| Stationary p95 | 43.01 ms | 2.55 ms |
| Scrolling p50 | 66.65 ms | 20.18 ms |
| Scrolling p95 | 106.90 ms | 47.99 ms |
| First background build | 330.78 ms | 388.42 ms |

These are background-only measurements, not native browser RAF, whole-fight frame rate, cold gameplay entry, Mac or physical-device results. In particular, the scrolling sample does **not** satisfy a 16.7ms budget. The larger first build is paid before a normal fade; native cold-entry gates still require browser verification.

An initial harness did not await image decoding and rendered gradients without the paintings. All such invalid artifacts were removed; none of the numbers above use them. The harness now explicitly awaits every image's `decode()` and excludes non-image asset manifests.

`background-pixel-comparison.json` covers stages 1/3/4/5 at start, fractional mid-road and end. All 12 comparisons pass the additional preservation check. Maximum mean channel delta is 1.90/255; the largest Stage 5 luminance change is -0.096/255. This supplements the unchanged inherited seam/detail checks. Actual Stage 4, Stage 5 and roof before/after PNGs are saved alongside it.

`performance-check.json` records seven semantic cache/cap/HUD checks. The nine inherited smoothness checks also pass. No walk-contact, walk-tearing, seam/detail, FPS, cold-entry or memory threshold was relaxed.

## Browser acceptance remains separate

The local shell cannot launch Chromium: its Unix-domain socket creation fails with EPERM, including after the supported escalation attempt. No local browser acceptance or device performance pass is claimed.

Run the following on the authorized browser-capable CI runner (adjust the baseline worktree path):

```sh
node tools/performance-check-v11.cjs
node tools/performance-visual-v11.cjs ../riley-live-1.0
node tools/smoothness-check.cjs
node tools/performance-v11.cjs ../riley-live-1.0 docs/review/v11/browser-before.json --baseline
node tools/performance-v11.cjs . docs/review/v11/browser-after.json
```

The browser tool measures fresh-context cold entry for all five stages and 10-second native-RAF mid-fights for stages 1/3/5, each with music OFF and ON. It holds full effects and AUTO quality=1, preserves seeded encounters and saves raw frame intervals, per-function costs, work/hitch records, boot/asset/preparation times and source hashes.

Strict candidate gates remain **every cold entry <400ms, >=59.5fps and zero intervals >33ms**, no page/network errors, and a complete sample matrix. Candidate failures exit nonzero. `--baseline`/`--report-only` allow evidence collection without treating a slow live baseline as a candidate pass. `--profile-only --report-only` separately records Stage 3's CPU profile; full acceptance windows do not run the CPU sampling profiler. Playwright's bundled Chromium is used unless `CHROMIUM_PATH` is explicitly supplied.

## Review image transport

The supplied painted-background review images are quality-90 JPEG display copies. The original lossless rendered PNGs and CPU profiles remain preserved in the review archive; numeric pixel comparisons were computed before JPEG encoding. Runtime backgrounds are untouched. See `review/v11/review-image-encoding.json` for sizes and source hashes.

For fast CI feedback, `--cold-only` runs the same ten fresh cold music OFF/ON contexts and unchanged <400ms gate, skips every fight, and explicitly reports pacing as unrun/null. It is not full acceptance. It cannot be combined with `--profile-only`.
