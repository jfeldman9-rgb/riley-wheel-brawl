# v1.1 combat, bounds, and balance evidence

The rendering-only follow-up is documented in [Rendering readiness](RENDERING_READINESS.md). The combat measurements below identify their exact reviewed source and are not relabeled as a newer commit.

## Reviewed source and status

Reviewed remote commit: `fbcf1fe2b76dd63f26c4b7a00b4ff7ccbf676814`. Local clean-source test commit: `1f9e33db9ce29f43770024abab14c4990ca50308`; subsequent local evidence commit: `f7e4af53c1647f10ebbc14dd2d502193ffe06a35`. All 320 runtime/asset/tool/workflow blobs were verified equal between the reviewed remote and final local source. Runtime aggregate SHA-256: `4fc6ff472aebd51e947d233b7e8cb33d26b4631242eaf355863f604795e26d0e`.

The native aggregate passed **26/28** gates, and GitHub reproduced those results. The two unchanged legacy contracts remain failures awaiting explicit review: old Callandor pivot and exact historical Normal/RNG parity. No performance, test or release waiver is implied.

This document describes that reviewed build. Later isolated rendering experiments have their own source hashes and do not replace these results. The prior mixed calibration narrative is retained separately for provenance; its earlier rates and coefficients are not current acceptance evidence.

## Measurement contract

Pristine live reference: `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`. Each mode has 40 seeded **stage trials per stage**, seeds 1001–1040, exactly three lives, no HP refill or injected enemy damage, using the unchanged inherited `tools/soak.cjs` input controller. The 400 total simulations are deterministic independent stage trials, not 80 end-to-end campaigns or human playtests.

The controller presses Kick every 10 frames, Jump every 173, spin every 211, FIRE every 89, Loial every 401, and full-meter POWER on every 31st frame. It pursues the nearest enemy and walks right between waves. These are ordinary controller inputs, not assisted HP/lives overrides.

## Current final simulation results

| Mode | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 |
|---|---:|---:|---:|---:|---:|
| Verified live Normal |39/40 (97.5%)|30/40 (75%)|27/40 (67.5%)|23/40 (57.5%)|23/40 (57.5%)|
| Candidate Normal |40/40 (100%)|32/40 (80%)|27/40 (67.5%)|24/40 (60%)|23/40 (57.5%)|
| Normal delta |+2.5pp|+5pp|0pp|+2.5pp|0pp|
| Verified live Hard |40/40 (100%)|29/40 (72.5%)|16/40 (40%)|4/40 (10%)|0/40 (0%)|
| Candidate Hard |40/40 (100%)|30/40 (75%)|20/40 (50%)|12/40 (30%)|10/40 (25%)|
| Requested late Hard aim |—|—|50%|35%|25%|

Every candidate Normal stage passes both verified-live ±5 percentage points and unchanged inherited Normal bands. Stage 2 sits at the new gate's upper boundary. Hard Stage 4 remains 30% against the 35% aim: it is not an exact-target pass. The additive ±5-point diagnostic window does not turn that aim into a user-approved 30% target.

All 400 candidate trials have zero enemy offscreen intervals longer than 2 seconds; the maximum observed interval is 0.683 seconds. Fresh-live offscreen failures remain diagnostic evidence of the original bug. Reports: `normal-40.json`, `hard-40.json`, `live-normal-40.json`, `live-hard-40.json`, `combat-final-summary.json`. Every final trial uses the source aggregate above. JSON transport compaction removes whitespace only, never measurements.

The inherited assisted coverage run remains separately labeled: 99 lives and a below-28-HP refill are not part of these 400 balance trials.

## Other current acceptance evidence

- Painted body containment: 2,142 decoded cases; 294 pre-fix clips become 0; 204 row-support and 30 update/render-state checks pass
- Pose preemption: 216 exact output comparisons pass
- Approved walk tear thresholds and all 23 inherited test locks pass, except the explicitly approved version-label literal allowance
- Chromium emulation: 71 device/menu checks and 13 presentation checks pass; physical phones, iPad and controllers are untested
- Three matched immediate cloud-browser runs: candidate cold entries 30/30 under 400 ms, worst 386.1 ms; pacing 0/18 passes, 308 gaps above 33 ms, minimum 56.508 fps. Live control also fails pacing. This is a real failed gate, not excused by control failures
- Jason's Mac remains untested, so cloud measurements cannot satisfy the same-Mac gate

The browser results are terminal for GitHub acceptance run 36780432175 and quality run 36780432136. Their source is the exact reviewed remote above. No merge or release is approved.

## Bounds fixes

The inherited entry routine stopped when an enemy was within 90 units of Riley, even when its centre was still outside the view. After entry, the broad arena ±120-unit knockback leash and pack separation could also leave a live attacker beyond the left wall. Candidate actors must finish their visible entry and subsequently clamp after physics **and** separation. Hurt, knockdown, thrown, recovery, and corpse paths also cannot remain hidden outside the arena. Boss introduction walk-ins remain intact.

Riley uses the larger of a 40-unit minimum and the actual painted left extent of the current pose/facing, with walk shear included. The largest tested margin is 62 units. Source pixels and hurtboxes are unchanged. Transient camera shake is excluded from permanent physics; draw-only interpolation containment restores the authoritative actor position after rendering. Get-up exits have an explicit 0.24-second minimum controllable recovery shield; the existing longer knockdown/respawn grace is retained.

`v11-offscreen-watch.cjs` observes every present enemy after each scene update, using its centre against the actual viewport. More than two continuous simulated seconds offscreen fails acceptance. It does not average actors, ignore initial spawns, require the actor to be the last enemy, or exempt deaths/hitstop. Only a deliberately paused scene is not advanced. A negative-control regression puts the fourth actor off either side while three remain visible and proves that the suite fails at 121 frames. Re-entry resets only that actor’s dwell.

## Balance approach

Visible entry/boundaries change collision outcomes substantially, so preserving the old damage coefficients alone does not preserve difficulty. The candidate changes only incoming damage coefficients per stage/mode, with a separate coefficient for named boss attacks where whole-stage damage crosses a sharp breakpoint; it does not pad enemy/boss HP, change the controller, change seeds, alter inherited thresholds, or claim statistical human clear rates. Exact old RNG/result parity is not expected across the requested collision change.

Normal acceptance is the intersection of freshly verified live ±5 percentage points and the untouched inherited `normal-balance.cjs` bands: Stage 1 92.5–100%, Stage 2 70–80%, Stage 3 62.5–72.5%, Stage 4 57.5–62.5%, Stage 5 52.5–57.5%. Hard Stage 3/4/5 aim at 50/35/25%; the new automated acceptance window is ±5 points, with the exact observed counts reported. Intermediate calibration runs are retained under `candidate-*` and `tune-grid-*`, explicitly separated from final results.

Runtime coefficients (multiplying the inherited level/source damage rules):

- Incoming Normal: `[1, 1.25, 1.08, 0.97, 0.84]`
- Incoming Hard: `[1, 1.2, 1.16, 1.7, 0.94]`
- Named boss attacks Normal: `[1, 1, 1, 1, 1.12]`
- Named boss attacks Hard: `[1, 1, 1, 1.02, 1.10]`

The distinct boss coefficient is deliberate: Normal Stage 5's uniform coefficient jumps from 62.5% at 0.841 to 27.5% at 0.842. Retaining ordinary-wave breakpoints and tuning only Taim's named techniques reaches the original live rate without changing the acceptance band. Hard Stage 4 likewise has a sharp whole-stage breakpoint. After painted-body containment, Hard Stage 2 measures 75%, compared with live 72.5% and candidate Normal 80%. The Hard-only late-stage recalibration is documented separately in `HARD_RECALIBRATION.md`.

The final acceptance runner requires all five unique stages, 40 unique seeds in each, finite complete measurements, a Normal baseline matching the exact verified live revision, and a consistent SHA-256 of index.html plus all runtime JS across every stage. It rejects malformed evidence before simulation and labels subset/override runs diagnostic.

## Readability and resource usefulness

All 15 major boss techniques have a filled lane/area warning plus a high-contrast dark-backed gold outline. The beam now marks the actual snapshotted full-width damaging floor lane, rather than only a thin hand-height line. Existing tell durations, locked facing/targets, collision dimensions, and move repertoire are retained.

Hard Loial visibly steers to the next reachable enemy lane; he deals 60 to ordinary enemies and 65 to a grounded boss, once per enemy, with the same once-per-stage call. Hard Loial/POWER hits open a 0.7/1.0-second grounded-boss counterattack window. Draghkar still accepts only jump/fireball, and Taim still requires the joint finish. Normal Loial and boss resource behavior are unchanged.

## Painted Callandor grip and shadows

A full-pose review exposed inherited collar anchoring and stale hand coordinates. The sword’s wrapped grip is centred at stamp (12,83); old non-idle poses anchored at y=76, leaving seven units of offset. All poses now use y=83. Source-frame glove points have been re-authored against the actual painted fist, including the formerly misplaced walk5, kick, fireball, hurt, roundhouse and channel grips. Walking grips inherit the same small body translation/vertical correction as the planted body; attack rotation pivots around that hand. Idle’s approved hand location and behind-body layer remain unchanged.

The new offline Canvas suite checks both facings for every pose, exact zero-offset grip-to-hand alignment, opaque source-palm pixels, idle painted-fist preservation at scales 1/2/3, all boss warning footprints, and altitude-preserving stage-aware fighter shadows. PNG contact sheets accompany it. Static assistant inspection is not human gameplay certification. The approved walk-leg tear caps are untouched: walk3 ≤8px, walk4 ≤4px, walk8 ≤9px, every other frame ≤2px; the leg renderer and its inherited thresholds were not relaxed by this combat work.

### Preserved inherited conflict

`tools/callandor-check.cjs:32` remains byte-for-byte unchanged and expects `frame === 'idle' ? -83 : -76`. It therefore fails deliberately at walk1 (`actual -83`, `expected -76`) after correcting the real grip. This is an unresolved review conflict, **not a waived pass**. The exact failure is in `callandor-inherited-conflict.log`; the new strict zero-offset regression supplements rather than edits the old test. This conflict is retained for explicit Jason/Grok review.

## Reproduction

Run the unchanged aggregate with `node tools/ci-v11.cjs unit /path/to/riley-old-parity /path/to/riley-live-1.0`. The first reference must retain historical parity commit `7f3f94b`; the second must retain verified live commit `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`. Run final balance with `RWB_BALANCE_MODE=normal node tools/v11-balance.cjs` and `RWB_BALANCE_MODE=hard node tools/v11-balance.cjs`; preserve the verified-live Normal baseline file. Run `node tools/pose-preemption-v11.cjs` and `node tools/left-body-check-v11.cjs` for the additive rendering/bounds checks.

An immutable re-baseline may use `RWB_TEST_ROOT=/path/to/live RWB_BALANCE_MODE=normal RWB_BALANCE_OUT=/path/to/live-normal-40.json node tools/v11-balance.cjs --diagnostic`, repeated for Hard. `v11-tune-diagnostic.cjs` is non-acceptance tooling; coefficient overrides must never be reported as the shipped final result.

The full-pose contact-sheet WebP is lossless and RGBA-identical to its retained PNG. Static art inspection and decoded software renders do not establish native-browser pacing or human/device acceptance.
