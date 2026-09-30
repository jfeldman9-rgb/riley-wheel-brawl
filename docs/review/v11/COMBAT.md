# v1.1 combat, bounds, and balance evidence

## Latest integrated source

Exact local tested commit: `1f9e33db9ce29f43770024abab14c4990ca50308`, clean source/test tree. Runtime SHA256: `4fc6ff472aebd51e947d233b7e8cb33d26b4631242eaf355863f604795e26d0e`. The complete aggregate passed 26/28 native gates; only the two retained legacy acceptance conflicts fail.

All 400 no-override stage-seed runs are complete: **Normal 100/80/67.5/60/57.5%; Hard 100/75/50/30/25%**. Normal deltas from fresh live are +2.5/+5/0/+2.5/0 percentage points, within both the new live±5 gate and unchanged inherited bands. There are zero >2-second offscreen enemy violations, with maximum 0.683s. Raw final reports are `normal-40.json` and `hard-40.json`; `combat-final-summary.json` identifies the measured source. JSON reports use compact transport formatting; no measurements are removed.

The painted-body fix passes 2,142 decoded cases and keeps transient camera shake out of permanent physics. The queued-pose fix passes 216 interruption cases. See [body containment](left-body/README.md) and [Hard-only recalibration](HARD_RECALIBRATION.md). Hard Stage 4 is 30% against a 35% aim and remains subject to gameplay review. Browser/performance acceptance for this integrated runtime is still pending; these simulation results are not a Mac or human-play pass.

## Earlier calibration record (historical)

## Measurement contract

Pristine live reference: `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`, separately checked out at `riley-live-1.0`. The fresh reference was measured before candidate tuning. Every accepted stage/mode result uses 40 automated playthroughs, seeds 1001–1040, exactly three lives, no HP refill, no injected enemy damage, and the exact inherited `tools/soak.cjs` input controller. These are deterministic bot simulations, not human playtests. No Mac playtest or native-Mac performance claim is made here.

The controller itself presses Kick every 10 frames, Jump every 173, spin every 211, FIRE every 89, Loial every 401, and full-meter POWER on every 31st frame. It pursues the nearest enemy and walks right between waves. Calling these gameplay abilities is ordinary controller input, not the inherited assisted-soak HP/lives override. Source is unchanged from live.

Fresh live rates:

| Mode | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 |
|---|---:|---:|---:|---:|---:|
| Normal | 39/40 (97.5%) | 30/40 (75%) | 27/40 (67.5%) | 23/40 (57.5%) | 23/40 (57.5%) |
| Hard | 40/40 (100%) | 29/40 (72.5%) | 16/40 (40%) | 4/40 (10%) | 0/40 (0%) |

The baseline reports are `live-normal-40.json` and `live-hard-40.json`. Their failures of the new offscreen guard are diagnostic findings, not a claim that inherited 1.0 passed 1.1 requirements.

## Final accepted simulation results

All 400 final unassisted stage-seed runs used the same runtime SHA-256, also matched against the final local tree: `5ea1241f4114830eb1619a3b3b7bff82a23db1b5ba25f44b58e8246815602c40` (index.html plus all JS files, sorted). Data: `normal-40.json`, `hard-40.json`, and `combat-final-summary.json`.

| Mode | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 |
|---|---:|---:|---:|---:|---:|
| Normal | 40/40 (100%) | 31/40 (77.5%) | 26/40 (65%) | 23/40 (57.5%) | 23/40 (57.5%) |
| Delta from fresh live | +2.5 pts | +2.5 pts | −2.5 pts | 0 pts | 0 pts |
| Hard | 40/40 (100%) | 29/40 (72.5%) | 21/40 (52.5%) | 12/40 (30%) | 9/40 (22.5%) |
| Hard late-stage aim | — | — | 50% | 35% | 25% |

Every Normal stage passes both required bands. Hard Stage 3–5 are +2.5/−5/−2.5 points from their aims, within the new ±5-point test window. Stage 4 remains at that window’s lower edge, not exactly 35%. Hard Stage 2 matches its live 72.5% and is below candidate Normal’s 77.5%.

There are **zero >2-second offscreen violations** in all 400 final runs; maximum observed continuous offscreen time is **0.683 seconds**, during entry. The unchanged inherited Normal runner separately repeated all 200 runs and passed every original target band with the same counts (`inherited-normal-40.json`).

Separately, `hard-check.cjs --soak` passes 63 assertions including **50/50 assisted stages**, every boss technique on every seed, and **zero simultaneous active attackers**. That inherited coverage harness uses 99 lives and its below-28-HP refill. It is explicitly assisted coverage, not additional unassisted balance evidence.

## Bounds fixes

The inherited entry routine stopped when an enemy was within 90 units of Riley, even when its centre was still outside the view. After entry, the broad arena ±120-unit knockback leash and pack separation could also leave a live attacker beyond the left wall. Candidate actors must finish their visible entry and subsequently clamp after physics **and** separation. Hurt, knockdown, thrown, recovery, and corpse paths also cannot remain hidden outside the arena. Boss introduction walk-ins remain intact.

Riley now stays 40 units inside the visible left boundary instead of 18, retaining the original hurtbox. The 40-unit centre margin protects the painted body during walking, recoil, knockdown, and get-up. Get-up exits have an explicit 0.24-second minimum controllable recovery shield; the existing longer knockdown/respawn grace is retained.

`v11-offscreen-watch.cjs` observes every present enemy after each scene update, using its centre against the actual viewport. More than two continuous simulated seconds offscreen fails acceptance. It does not average actors, ignore initial spawns, require the actor to be the last enemy, or exempt deaths/hitstop. Only a deliberately paused scene is not advanced. A negative-control regression puts the fourth actor off either side while three remain visible and proves that the suite fails at 121 frames. Re-entry resets only that actor’s dwell.

## Balance approach

Visible entry/boundaries change collision outcomes substantially, so preserving the old damage coefficients alone does not preserve difficulty. The candidate changes only incoming damage coefficients per stage/mode, with a separate coefficient for named boss attacks where whole-stage damage crosses a sharp breakpoint; it does not pad enemy/boss HP, change the controller, change seeds, alter inherited thresholds, or claim statistical human clear rates. Exact old RNG/result parity is not expected across the requested collision change.

Normal acceptance is the intersection of freshly verified live ±5 percentage points and the untouched inherited `normal-balance.cjs` bands: Stage 1 92.5–100%, Stage 2 70–80%, Stage 3 62.5–72.5%, Stage 4 57.5–62.5%, Stage 5 52.5–57.5%. Hard Stage 3/4/5 aim at 50/35/25%; the new automated acceptance window is ±5 points, with the exact observed counts reported. Intermediate calibration runs are retained under `candidate-*` and `tune-grid-*`, explicitly separated from final results.

Runtime coefficients (multiplying the inherited level/source damage rules):

- Incoming Normal: `[1, 1.25, 1.08, 0.97, 0.84]`
- Incoming Hard: `[1, 1.2, 1.18, 1.7, 0.75]`
- Named boss attacks Normal: `[1, 1, 1, 1, 1.12]`
- Named boss attacks Hard: `[1, 1, 1, 1.02, 1]`

The distinct boss coefficient is deliberate: Normal Stage 5's uniform coefficient jumps from 62.5% at 0.841 to 27.5% at 0.842. Retaining ordinary-wave breakpoints and tuning only Taim's named techniques reaches the original live rate without changing the acceptance band. Hard Stage 4 likewise has a sharp whole-stage breakpoint. Hard Stage 2 is separately restored to its measured live 72.5% so the early Hard setting does not become easier than candidate Normal.

The final acceptance runner requires all five unique stages, 40 unique seeds in each, finite complete measurements, a Normal baseline matching the exact verified live revision, and a consistent SHA-256 of index.html plus all runtime JS across every stage. It rejects malformed evidence before simulation and labels subset/override runs diagnostic.

## Readability and resource usefulness

All 15 major boss techniques have a filled lane/area warning plus a high-contrast dark-backed gold outline. The beam now marks the actual snapshotted full-width damaging floor lane, rather than only a thin hand-height line. Existing tell durations, locked facing/targets, collision dimensions, and move repertoire are retained.

Hard Loial visibly steers to the next reachable enemy lane; he deals 60 to ordinary enemies and 65 to a grounded boss, once per enemy, with the same once-per-stage call. Hard Loial/POWER hits open a 0.7/1.0-second grounded-boss counterattack window. Draghkar still accepts only jump/fireball, and Taim still requires the joint finish. Normal Loial and boss resource behavior are unchanged.

## Painted Callandor grip and shadows

A full-pose review exposed inherited collar anchoring and stale hand coordinates. The sword’s wrapped grip is centred at stamp (12,83); old non-idle poses anchored at y=76, leaving seven units of offset. All poses now use y=83. Source-frame glove points have been re-authored against the actual painted fist, including the formerly misplaced walk5, kick, fireball, hurt, roundhouse and channel grips. Walking grips inherit the same small body translation/vertical correction as the planted body; attack rotation pivots around that hand. Idle’s approved hand location and behind-body layer remain unchanged.

The new offline Canvas suite checks both facings for every pose, exact zero-offset grip-to-hand alignment, opaque source-palm pixels, idle painted-fist preservation at scales 1/2/3, all boss warning footprints, and altitude-preserving stage-aware fighter shadows. PNG contact sheets accompany it. Static assistant inspection is not human gameplay certification. The approved walk-leg tear caps are untouched: walk3 ≤8px, walk4 ≤4px, walk8 ≤9px, every other frame ≤2px; the leg renderer and its inherited thresholds were not relaxed by this combat work.

### Preserved inherited conflict

`tools/callandor-check.cjs:32` remains byte-for-byte unchanged and expects `frame === 'idle' ? -83 : -76`. It therefore fails deliberately at walk1 (`actual -83`, `expected -76`) after correcting the real grip. This is an unresolved review conflict, **not a waived pass**. The exact failure is in `callandor-inherited-conflict.log`; the new strict zero-offset regression supplements rather than edits the old test. This conflict is retained for explicit Jason/Grok review.

## Current focused checks

- `v11-combat-check.cjs`: 247 assertions passed
- `v11-combat-render-check.cjs`: 333 assertions passed; 38 pose/facing views, 15 boss tells, five stage shadow pairs
- `v11-evidence-check.cjs`: 15 malformed/missing/subset acceptance attempts correctly rejected before simulation
- Inherited `hard-check.cjs`: 57 assertions passed; `--soak` raises this to 63 assertions including the separately labeled 50 assisted stages
- Inherited `check.cjs`: 113 non-browser assertions passed; browser section did not run because the default Playwright executable was absent in this local invocation. Separate browser/CI/Mac evidence remains required

## Reproduction

- `node tools/v11-combat-check.cjs`
- `node tools/v11-combat-render-check.cjs`
- `RWB_BALANCE_MODE=normal node tools/v11-balance.cjs`
- `RWB_BALANCE_MODE=hard node tools/v11-balance.cjs`
- `node tools/normal-balance.cjs`
- `node tools/hard-check.cjs`
- `node tools/callandor-check.cjs` (the preserved pivot assertion conflict above)

Re-baseline an immutable checkout with `RWB_TEST_ROOT=/path/to/live RWB_BALANCE_MODE=normal RWB_BALANCE_OUT=/path/to/live-normal-40.json node tools/v11-balance.cjs --diagnostic`, then repeat for Hard. `v11-tune-diagnostic.cjs` is expressly non-acceptance tooling: it reports any temporary coefficient override; final acceptance always uses the checked-in runtime coefficients.

The all-pose contact-sheet display copy is lossless WebP, verified RGBA-byte-identical to its original PNG; the original is retained in the review archive.
