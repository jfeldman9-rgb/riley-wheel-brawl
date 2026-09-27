# Current review evidence — smoothness pass

All current screenshots and `*-smoothness.txt` logs were regenerated from the
smoothness changes on `rwb-w2`. PR #4 targets `rwb-w1`.

## Reproduce

```sh
node tools/check.cjs
node tools/smoothness-check.cjs
node tools/soak.cjs
node tools/soak.cjs --natural
CHROMIUM_PATH=/path/to/chromium node tools/review.cjs
CHROMIUM_PATH=/path/to/chromium node tools/smoothness-browser.cjs
CHROMIUM_PATH=/path/to/chromium node tools/performance.cjs . docs/review/performance-after.json
RWB_ACCELERATED=1 CHROMIUM_PATH=/path/to/chromium node tools/performance.cjs . docs/review/performance-accelerated-after.json
```

Browser tools require Playwright. `CHROMIUM_PATH` is optional for the review and
performance tools when Playwright’s Chromium is installed. The input test also
uses Playwright’s installed browser if no path is provided. Tools serve the
checkout locally. Natural mode intentionally returns a failing exit code when
individual seeds fail; consult its table. Assisted mode must clear every seed.

## Current evidence

- `stage1-midfight.jpeg` … `stage5-midfight.jpeg`: live painted fights.
- `stage1-boss.jpeg` … `stage5-boss.jpeg`: bosses, including the separate Taim roof.
- `character-closeups.jpeg`, `riley-closeup.jpeg`, `belal-closeup.jpeg`: runtime art.
- `walk-riley.jpeg`: eight steps using Riley’s four distance-driven painted frames.
- `walk-trolloc.jpeg`, `walk-darkfriend.jpeg`, `walk-cultist.jpeg`: eight mesh phases.
- `rig-poses.jpeg`, `joints-closeup.jpeg`: runtime articulation diagnostics.
- `rendered-foot-contacts.json`: eleven bind definitions (Be’lal’s legacy bind is
  fallback-only); mesh-interpolated soles in both directions, diagonal travel,
  changing speed and 30/60/120Hz steps. Maximum permitted error: 0.15 world pixels.
- `cutscene-callandor.jpeg`, `title.jpeg`: painted reveal, portrait, key art and logo.
- `stageN-vs-lido.jpeg`: labelled equal-height comparisons. `seams-stageN.jpeg`:
  four-camera stage boards. These boards are composed by the browser from actual
  runtime drawings, not retouched images.
- `lido-reference.png`: inherited headless capture of Buffet Brawl level 0, commit
  `34fbd7c3728cf74f33988b99a39058717a38ecc9`.
- `check-smoothness.txt`, `smoothness-check.txt`: current checks.
- `natural-smoothness.txt`, `assisted-smoothness.txt`: complete current seed outputs.
- `browser-audit.json`: 77-resource load, cache stamps, missing-art retry/fallback.
- `smoothness-browser.json`: actual DOM keyboard/main-loop tests; GPU/Canvas mask
  comparison and successful fallback after deliberately losing the WebGL context.
- `performance-before.json`, `performance-after.json`: matched software-Canvas
  benchmark, before at `ae8022a421331ef99a6991f35d5e7ea33d8f4bc7` and current after.
  The same current benchmark script is used against both checkout roots; WebGL
  skinning is disabled in these two runs to exercise the slower Canvas fallback.
- `performance-accelerated-after.json`: current indexed WebGL path on SwiftShader.

Fight captures use deterministic normal input, without injecting damage, a pose
or a projectile. Intro cards, expired captions and tutorial text are cleared for
inspection. Closeups and walk strips are explicitly diagnostic drawings. All
JPEGs are native browser/canvas exports at quality 85.

The performance tool samples five fights after 90 simulation warmup frames,
including ten rendered warmup frames, then 30 timed update/draw submissions per
stage. It separately measures 180 native RAF intervals after 60 RAF warmup frames.
The benchmark alone restores HP to keep each sample alive; difficulty comes from
the separate soak. Submitted draw cost is not GPU completion latency. Headless
software/SwiftShader intervals include driver/compositor stalls and are not
physical-phone FPS. Final canvas size may reflect AUTO’s adaptation during the
RAF sample; per-stage draw samples start at the initial AUTO resolution.

`check.txt`, `soak-natural.txt`, `soak-assisted.txt` and `PR_W3.md` are historical
artifacts. Use the current files above and [STATUS](../STATUS.md), which supersede
older statements that browser evidence was unavailable.
