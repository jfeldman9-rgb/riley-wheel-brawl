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

## Fear-aura fairness (B1), Oct 5 2026

Jason raised the `src/myrddraal.js` cap from 14336 to **16384**. `022ce79` re-indents the
Myrddraal and FadeCopy class bodies only (whitespace; no behaviour change). This fix
then changes fear:

- While Riley's state is in `NO_FEAR`, the meter decays at `-dt / fear.fill` and never fills.
- `'cast'` is in `NO_FEAR`, so a paid fireball or power cast is not cancelled. `'balefire'`
  was already listed and now also stops the meter filling.
- A shake sets `braveT = fear.brave` (2.5 s). The meter decays for that window, so the
  fastest repeat is `brave + fill` = 3.9 s and the stun duty cycle is about 18%.

Not changed: aura radius versus `TYPES.fade.pref`, the phase-3 aura during copy lunges,
`hurtMs`, `fill`, and `dispel`. No art, tile, or grab changes.

Final size: **14,919 ≤ 16,384**. The pin is check D in `docs/stage3/BUILD-T12-T16.md`.
Four regression tests live in `tests/stage3-fade.test.mjs`. Older cycle notes above keep
the 14336 figure they recorded at the time.

Verification on this commit: `stage3-fade` 17/17, the boss suites
(`stage3-seeded-boss`, `stage3-campaign`, `stage3-hud`, `stage3-split-race`,
`stage3-punish-recovery`, `stage3-boundary-hardening`) plus `full-stage-evidence`
47/47, `full-stage-simulation` and the Stage 2 campaign/flow files 63/63.
Stage 1's golden sim matches `docs/stage1/evidence/full-stage-simulation.json`
with `sourceSha256` and `baseGitCommit` excluded. The frozen Stage 2 fingerprint
at `/workspace/ag/baselines-8d8d17b/` is not on this machine, so that `cmp` was
not run. No seeded-boss count changed.

## B1 robustness cycle, Oct 5 2026, starting at `e9e56c9`

| Fix | Commit | New regression file |
| --- | --- | --- |
| Release Riley's held enemy before a fear shake; prevent a frozen, orphaned hold | `f996546` | `stage3-fear-grab-hardening.test.mjs` (4 tests) |
| Count only the unprotected fraction of brave/dispel expiry frames; clamp brave to zero | `9a6bd92` | `stage3-fear-clock-hardening.test.mjs` (7 tests) |
| Activate and dispel the aura in the same tick, including light expiring that frame | `47b5e5a` | `stage3-aura-dispel-race.test.mjs` (4 tests) |

All 15 fix regressions fail against untouched `e9e56c9`. Another 20 tests in
`stage3-fear-lifecycle-hardening.test.mjs` cover nested pause/resume, brave cleanup
and restart into all stages, cast/death ordering, grabbed/escape/down/getup, and
20-second duty cycles at 30/60/120 Hz. These paths needed no further source fix.

Verification: **673/673 tests pass**, across 74 files, with no failures, skips,
cancellations or TODOs. Existing tests/helpers remain untouched. Stage 1 matches
the golden simulation excluding only `sourceSha256`/`baseGitCommit`; Stage 2 is
byte-identical to `/workspace/ag/baselines-e9e56c9/s2.base.json`, also verified at
HEAD before edits and after each fix. The existing scratch spawn transport above
was used for sandbox `EPERM` on captured child processes. Audit output is unchanged,
including the previously documented art-density failures. Final `myrddraal.js`:
**15,305 ≤ 16,384**; the other capped sources are unchanged. Brave remains **2.5 s**;
radius, fill, dispel and hurtMs remain unchanged. No art or network/push activity.

The supplied checkout's `.git` is read-only. Commits therefore live on
`rwb-2-stage3-ag` in `/workspace/ag/riley-wheel-brawl-hardening`; final file edits
are also mirrored into the supplied checkout. Neither main nor rwb-w2 was changed.

## Nemotron fear tweaks, Oct 5 2026

Jason chose these over the 2.5 s brave window. `fear.brave` is **1.2 s**. Aura radius is **220** (Fade pref is 210). The fear arc fill is bright magenta `0xff00ff` at alpha **0.85**. A living copy in `lunge` counts as calm, so a phase-3 copy lunge does not fill the meter.

Brave 1.2 plus fill 1.4 and a 0.7 s stun is about 27%. `fear.fill` is **1.6** so the steady cycle is 2.8 s and the stun duty is 0.7 / 2.8 = **25%**. `shaken` stays 0.7. Cast remains in `NO_FEAR`, and the meter still decays while calm. `myrddraal.js` is **15,395 ≤ 16,384**.

## Stage 3 hardening pass (Sol), starting at `190d87b`, Oct 5 2026

Three confirmed bugs were reproduced before their source fixes:

| Fix | Commit | New regressions |
| --- | --- | --- |
| Include the sun in Stage 3's light budget and honor the renderer cap; prevent Balefire from causing Phaser to cull Riley's light | `16bb813` | `stage3-light-budget-hardening.test.mjs` (2) |
| Pause scene clocks on hidden/blur events, independently of manual pause; detach callbacks on shutdown and inherit background state on restart | `cab9ebd` | `stage3-background-clock-hardening.test.mjs` (4) |
| Delegate held Cutthroat hits to the existing holder-only knee check; restore knee damage and lethal-knee wave completion | `75eb2e8` | `stage3-held-knee-hardening.test.mjs` (2) |

All eight fix regressions fail against untouched `190d87b`. The light regressions
execute the shipped Phaser light selector (including its distance-sort fallback),
and the background regressions execute its hidden/blur handlers. Small Stage 3
helpers keep the capped files within their limits; Stage 1/2 behavior is unchanged.

Another 34 tests in `stage3-terminal-transition-review.test.mjs` pass on both
`190d87b` and the fixed sources. Camera movement with Riley holding/being held,
cast interruption before/after release through knockdown, death, respawn and
continue, and boss death during active Balefire in seven states needed no further
fix. Live grabs already prevent zone completion; their timeouts release input.
Casts reject cutthroat grabs; Balefire normally rejects damage during its existing
invulnerability. The interruption tests also stress exhausted invulnerability.
A sunk Fade is intentionally unhittable; a beam still active on emergence kills
normally. Victory fires once, and beam, pool, copies, fear, timers and tweens retire.

Verification: **716/716 tests pass** (original 674 plus 42), with no failures,
skips, cancellations or TODOs. The full `node --test tests/*.test.mjs` passes all
78 files; each file also ran directly to count individual tests under this Node 20
sandbox. The existing `/tmp/rwb-spawn-transport.cjs` preload was used for captured
child-process `EPERM`, without changing tests or helpers. Stage 1's prescribed diff
prints nothing excluding only `sourceSha256`/`baseGitCommit`; Stage 2 is byte-identical
to `/workspace/ag/baselines-190d87b/s2.base.json`. `node tools/audit-stage1.mjs`
runs successfully: all statuses match baseline, including its existing art-density
failures. Inventory remains PASS at **24,988,168 / 25,000,000 bytes**.

Final sizes: `myrddraal.js` **15,395 / 16,384**, `stage3-hazards.js`
**8,169 / 8,192**, `darkfriends.js` **9,120 / 9,216**, `stage3.js`
**12,057 / 12,288** bytes. Nemotron's brave **1.2 s**, fill **1.6 s**, radius
**220**, magenta arc **0xff00ff / 0.85**, and calm/copy-lunge wording are untouched.
No existing tests were modified, no art or campaign availability changed, and no
network/push occurred. Rendering/device behavior remains outside headless evidence.

The supplied workdir's `.git` is read-only. Commits are on `rwb-2-stage3-ag` in
`/workspace/ag/rwb-s3-sol`; edited files are mirrored into the supplied workdir.
Neither `main` nor `rwb-w2` was changed.

Pushed SHAs for this cycle, corrected from the pre-push hashes: sun budget
`16bb813` (was `109e1c7`), hidden/blur clocks `cab9ebd` (was `4d0cd31`),
holder-only knee `75eb2e8` (was `5d524e4`). The evidence note for the cycle
is `150ae6e` (was `4385397`).
