# Rendering readiness follow-up

This is a draft performance-correctness candidate. It does not approve a release, change the inherited numerical gates, or replace Jason's same-Mac and physical-device checks.

## Reviewed control

The immutable control is `fbcf1fe2b76dd63f26c4b7a00b4ff7ccbf676814`, tree `2a99d4bf6d621ef3bdaae0cc83334d90635ce199`. Live 1.0 remains `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`.

That reviewed control passed 30/30 matched cold entries, with a worst 386.1 ms, but failed all 18 immediate fight windows: 308 RAF gaps over 33 ms and a minimum 56.508 FPS. Of those gaps, 302 began within the first two seconds. Their association with pending bake work is evidence to investigate, not proof of one cause. The inherited release test independently failed pacing. Cloud results never substitute for the same-Mac requirement.

## Five narrowly scoped changes

1. **Dependency-aware bake selection.** A pose waiting for its asynchronous bitmap no longer blocks unrelated runnable work. Runnable priority/FIFO, deadlines and the 64-invocation guard remain. Explicit readiness wakes on resolution, rejection, source removal or rig replacement. This is cooperative scheduling; an indivisible operation can still exceed its requested budget.
2. **Bounded vertex reuse.** Completed transformed-vertex snapshots return to a per-rig free pool capped at three. Active jobs own distinct snapshots. Canceled/throwing jobs are not pooled, and a dropped rig cannot resurrect its pool. In the fixed 720-pose allocation workload, new vertex objects fell from 306,000 to 12,750; this is an allocation count, not a browser heap or GC measurement.
3. **Cancel unfinished backgrounds from inactive stages.** Gameplay activation drops only inactive pending middle-layer work, releases owned partial canvases and resets pending flags. Completed paintings remain cached. A retained view returning at the same camera can requeue its missing neighbor without repainting the completed composite. Existing resize/third-cache eviction and roof behavior remain.
4. **Close detached decoded bitmaps.** A bitmap arriving after its building state was removed/replaced is closed once; dropping an already-resolved pending state also closes it. The absence of an explicit close in the prior code did not alone prove a permanent leak.
5. **Bound speculative texture uploads.** A flush submits at most one successful warm blit within the existing time limit. Dropping a rig removes only its queued pose entries. Direct demanded draws bypass that queue. Decoded controls reproduced eight warm blits in one old flush versus one, and six dropped-rig warm draws versus zero while retaining live Loial entries. These are operation/lifetime checks, not elapsed-time improvements.

No painting, mesh geometry, face order, animation, combat coefficient, controller input, save format or accepted walk tolerance is changed by this follow-up.

## Reproducible correctness checks

The additive suite in `tools/readiness-v11/` retains two independent 1,440-output exact RGBA matrices, 216 interrupted-pose cases, 33 dependency-queue checks, four bitmap close-once cases, the complete vertex-pool lifecycle matrix, 252 decoded background comparisons and 15 background lifecycle checks. Its control loader validates the four frozen source hashes; it records the actual local reference separately from the expected remote reference rather than relabeling a checkout.

`tools/warm-touch-check-v11.cjs` independently checks bounded speculative work, dropped-rig cleanup and immediate demanded-pose output. Its default assertions reject the old control. `tools/diagnostics/readiness/` has browser-free observer and manifest/log-transport tests.

The unchanged native aggregate and all 23 inherited test locks still run. The two unresolved legacy assertions remain visible failures: the old Callandor pivot expectation and exact historical Normal/RNG equality. Only Jason's explicit decision can change those contracts. No numerical threshold is relaxed here.

## Final local source identity

The final combined runtime aggregate (index.html plus sorted runtime JS) is `ac21893d2fa7fc6acf68135d39624bc820fced9b8bcb2f044cde560e51c712d9`. All eight portable correctness suites passed on that source, and the separate three-case warm-touch regression passed. `readiness-local.json` and `warm-touch-local.json` retain counts and source hashes. The final loader/runner then gained reporting-only failure-log and fresh-output protections; test-bearing harnesses and runtime assertions were unchanged.

Those local correctness results do not establish a native pacing improvement. The unchanged 28-tool aggregate, new GitHub checks and actual browser comparisons remain independently reported at their measured revisions.

## Native comparison design

All pre-existing browser, cold-smoke, matched live/candidate and quality checks remain. Only the completed eight-face-flush diagnostic job is replaced with a new question: three alternating serial pairs of the frozen reviewed control and this candidate on one GitHub runner, using the same browser and immediate two-RAF boundary.

The new diagnostic records actual demanded-pose readiness, misses versus actual fallback blits, unavailable rigs, warm-touch counts, per-flush IDs, raw RAF/frame-work arrays and observer costs. It preserves complete raw reports as SHA-256-verified gzip/base64 in ordinary workflow logs, including partial/failing reports. The observer retains references and adds work, so its results have instrumentation overhead and cannot certify total heap/GC behavior. Uninstrumented acceptance gates remain separate and unchanged.

Thresholds remain: every cold entry strictly below 400 ms, each fight window at least 59.5 FPS, and zero gaps over 33 ms. Control failures do not excuse candidate failures. Passing a diagnostic would not authorize merging or publishing.

## Retained rejected experiments

The old `tools/performance-experiment-v11.cjs` and `tools/experiments/pose-flush8.patch` remain in history and the repository. Their complete raw evidence is in the already delivered review archive and [acceptance run 36780432175](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36780432175).

- Eight-face flush: control 268 long gaps/0 of 18 passing windows; variant 12 gaps/11 of 18. Both passed 30 cold entries. Fallback call counts increased 933→2,097; true median queue-clear time increased 1.600→3.900 seconds. Rejected because strict pacing still failed and readiness worsened
- Larger 16/32-face flush batches: exact pixels held, but offline CPU totals remained above control and chunk tails did not improve. No native adoption
- Safe source cropping: 1,342 of 1,440 outputs differed, despite small average differences, and the local raster experiment was slower. Rejected without changing exactness
- Conservative transparent-face culling: zero skips in 310,776 face submissions across 690 transformed poses; added 4,547,620 bytes of occupancy tables. Rejected before a needless full raster matrix

Those experiments remain clearly separated from this candidate. Stage 1–3 art seams, voice listening, exact Hard Stage 4 gameplay review, Mac/device acceptance and final release approval remain open.
