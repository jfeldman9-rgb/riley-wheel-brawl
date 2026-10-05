Stage 3 hardening was performed on `rwb-2-stage3-ag`, starting at `8d8d17b`.
No art, existing tests, existing test helpers, Stage 1/2 registry data, or other branches were changed.

| Fix | Commit | Regression coverage |
| --- | --- | --- |
| Keep a copy's punish lunge armed through boss recovery | `fa30a9a` | `stage3-punish-recovery.test.mjs` |
| Cancel the queued phase-three split when parrying; prevent premature and orphaned copies | `aa7cdfb` | `stage3-split-race.test.mjs` |
| Enforce exclusive hold ownership; release synchronously on death, down, respawn, continue and destruction | `f64ba1c` | `stage3-grab-lifecycle.test.mjs` |
| Dispose inherited hazards, Stage 3 lights and emitters, grabs and boss abilities; restore the vignette to exactly 0.35 | `e2f8955` | `stage3-kit-cleanup.test.mjs` |
| Detach atlas callbacks on completion, errors, shutdown and requeue | `da81646` | `stage3-loader-cleanup.test.mjs` |
| Use the current seeded random source for boss decisions and copy attack order | `d19079c` | `stage3-seeded-boss.test.mjs` |
| Reuse lighting, direction and boss hit data; avoid snapshots of empty hazard collections | `83cb0b3` | `stage3-update-allocation.test.mjs` |

Additional coverage in `stage3-boundary-hardening.test.mjs` checks hold timing at
30/60/120 Hz, pausing and resuming an escape, leaving active grabs and boss abilities
for each stage, input listener counts, and lethal hits in eight boss states.
No frame-based timer defect was found in the Stage 3 hold or boss timers.

Verification:

- **532/532 tests pass**, including the original 496; no failures, skips,
  cancellations or TODOs. Each new regression file also fails against the original
  `8d8d17b` sources, independently checked in a scratch copy.
- Stage 1's full-stage simulation matches
  `docs/stage1/evidence/full-stage-simulation.json` with only `sourceSha256` and
  `baseGitCommit` excluded. Those metadata fields were refreshed as required.
- The supplied Stage 2 fingerprint script matches `/tmp/s2.base.json` from
  `8d8d17b`, printing **SAME**. The baseline was never overwritten.
- `node tools/audit-stage1.mjs` passes. Final byte counts are **11433** for
  `stage3.js`, **9058** for `darkfriends.js`, and **14336** for `myrddraal.js`.
- `git diff 8d8d17b -- tests/ | grep '^-[^-]'` prints nothing.

This sandbox has Node 20.19.2. Captured child-process pipes return `EPERM`, including
the baseline Stage 2 query probes and the simulation runner's `git rev-parse` call.
A scratch preload, `/tmp/rwb-spawn-transport.cjs`, captures child output through
temporary files instead. Checks ran with
`NODE_OPTIONS=--require=/tmp/rwb-spawn-transport.cjs`; no assertions or repository
test helpers were changed. The full `node --test tests/*.test.mjs` command passed
all 56 test files. Each file was also executed directly to verify the 532 individual
tests, since this Node/sandbox combination reports only file totals in the
isolated runner.

Rendering, GPU resources and physical iPad Safari acceptance remain unmeasured by
the headless harness. No network access or push was attempted.

## Cycle 2 (T7–T11), starting at `6992c75`

Each fix has a new regression file; existing tests and helpers remain intact.
The frozen Stage 2 capture for this pass is `baselines-6992c75/s2.base.json`.
The sandbox still rejects captured child-process pipes with `EPERM`; verification
uses the existing `/tmp/rwb-spawn-transport.cjs` transport described above.

- Retire story objects and clear their completion callback on scene shutdown.
  A retained story cannot advance captions or finish a new run, and its callback
  cannot leak into a later Stage 1 Twix scene. Coverage:
  `stage3-story-restart-hardening.test.mjs` (four tests, all three restart targets).
- Freeze story input as well as its clock during report/graphics suspension;
  resuming a manual pause preserves the current story instead of skipping it.
  Coverage: `stage3-story-pause-hardening.test.mjs` (three tests).
- Start tile movement only with the part of delta after the warning boundary.
  This removes an extra frame of travel (different at 30/60/120 Hz). Coverage:
  `stage3-tile-clock-hardening.test.mjs` (seven tests, both directions and pause).
- Scope the plates watermark to the active stage. Cached Stage 3 JSON survives
  texture release and must not mark Stage 1/2 as placeholder art, including with
  `s3` off. Coverage: `stage3-watermark-flow-hardening.test.mjs` (three tests).
- Reuse meter fill storage in the HUD frame loop, including inactive meters,
  while preserving fresh snapshots for callers of the exported helpers.
  Coverage: `stage3-meter-allocation-hardening.test.mjs` (five tests, including
  stage changes mid-mash and a runtime check of storage passed at draw sites).
- Retry a selected decoded music track after temporary fetch/decode failure on
  the next unlocked gesture or visible-tab recovery, respecting music-off and
  newer selections. Coverage: `stage3-music-retry-hardening.test.mjs` (five tests).
- Honor explicit music restart even when the requested track is already playing
  or still fading out. Stop/disconnect its old source, cancel obsolete cleanup,
  and reuse its buffer; ordinary resume stays uninterrupted. Coverage:
  `stage3-music-restart-hardening.test.mjs` (four tests, also covering streams).

| Fix | Commit |
| --- | --- |
| Retire story callbacks on restart | `51f4d7d` |
| Freeze story input during secondary pauses | `0549cc1` |
| Exclude tile warning time from sweep movement | `0ca4a00` |
| Scope cached plates watermark to the active stage | `65b4967` |
| Reuse HUD meter fill storage | `ceff316` |
| Retry selected music after fetch/decode failure | `a87f285` |
| Restart active or fading music sources correctly | `46445d6` |

Cycle 2 verification:

- **605/605 tests pass**, including all original 574 and 31 new tests; no skips,
  TODOs, cancellations or failures. The full `node --test tests/*.test.mjs` run
  passes all 68 files. Each file also ran directly to count the individual tests
  under this sandbox's Node 20 runner. Every fix's new regression file fails
  against untouched `6992c75` source files in a scratch checkout.
- Checks A–E ran before each fix commit. Stage 1's full-stage simulation remains
  identical with `sourceSha256` and `baseGitCommit` excluded; only those metadata
  fields were refreshed. Stage 2's fingerprint remains byte-identical to the
  supplied `baselines-6992c75/s2.base.json`, printing **SAME**. Neither frozen
  baseline directory was modified.
- Pre-fight inventory: **24,982,182 / 25,000,000 bytes**, **PASS**. Stage 3 audio:
  **813,463 / 3,686,400 voice bytes** (18 lines) and
  **1,667,012 / 2,400,000 music bytes**, both **PASS**. All existing passing audit
  statuses remain passing. The raw audit already reports Stage 1 art-density
  **FAIL** for Riley, grunt, spear and hound at `6992c75`; these are unchanged.
  The baseline claim that every raw audit status was PASS was inaccurate.
- Final capped sizes: `stage3.js` **11,797 < 12,288**, `stage3-hazards.js`
  **8,169 ≤ 8,192**, `darkfriends.js` **9,058 ≤ 9,216**, `myrddraal.js`
  **14,336 ≤ 14,336**. No cap changed, and the latter two files are untouched.
- `git diff 6992c75 -- tests/ | grep '^-[^-]'` prints nothing. No existing test
  or helper, art asset, audit rule, stage registry entry or other branch changed.
  No push was attempted.

The shipped Phaser InputPlugin, Loader and TweenManager already remove their
scene-owned listeners/tweens on shutdown. TweenData also completes when its
target is destroyed, so an initially suspected title-pulse leak needed no fix;
that speculative change was removed from the final commit history. The existing
title-select/campaign tests remain intact, and the new restart/mash tests assert
one live gameplay press/key listener and no retired story or meter state.
Physical rendering and device audio remain outside the headless evidence.
