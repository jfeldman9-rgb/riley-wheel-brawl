# Approved CI timing policy

This policy is limited to the explicitly approved software-Canvas CI comparison. It does not approve a release or change real-Chrome/device acceptance. No existing locked test, expected grip value, parity baseline, Normal target, offscreen limit, walk tolerance or functional/audio assertion is edited by this policy change.

## Blocking measurements

The matched comparison uses verified live commit `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc` and the candidate on one runner/browser, in this exact serial order: live 1, candidate 1, candidate 2, live 2, live 3, candidate 3. It preserves immediate two-RAF sampling and every raw timing array.

For each Stage 1/3/5 and music-OFF/ON cell independently:

- Candidate median FPS across three runs must be at least live median minus 0.3
- Candidate total frames over 33 ms across those same three runs must not exceed live's total
- No runs, stages or music conditions are dropped or pooled to hide a failing cell

The existing audio suite's Stage 4/wave5/music-ON case is retained as an additional matched cell with the same rules. Its Stage 1/wave3 and Stage 5/wave3 music-ON coverage uses the corresponding matched cells. Existing audio playback, mute/resume, voice, loop and resource checks remain blocking.

For every Stage 1–5/music-OFF/ON cold-entry cell, the candidate median of three runs must be strictly below 400 ms. Every individual value, including an outlier such as 401 ms, stays in the report. A 400 ms median fails. Baseline cold measurements remain visible but do not waive the candidate limit.

## Absolute diagnostics and fail-closed behavior

The original release and audio browser scripts remain byte-identical and still execute. Their original absolute FPS/frame-gap and single-run cold PASS/FAIL lines are printed unchanged. An additive CI-only wrapper classifies only their exact known timing rows as advisory. Audio timing rows also contain a music-playing assertion; that functional requirement is still blocking.

The absolute 60 fps/zero-over 33 ms diagnostics remain in the profiler. Direct legacy scripts stay strict. The readiness A/B diagnostic has a separate explicit CI advisory flag; it cannot hide identity, execution or incomplete-data errors.

Missing or duplicate runs/cells, wrong source/browser/order, non-finite measurements, incomplete reports, crashes/signals, unexplained exit codes, unexpected assertion/output, resource errors and incorrect configured music conditions fail closed. Actual playback remains a blocking requirement in the unchanged audio functional tests; matched cold-boundary playback is recorded without requiring asynchronous startup to finish early or delaying the clock. A timing exception cannot turn any other error green. The pure regression suites include these negative controls and exact threshold/median boundaries.

## One automatic workflow

Only `v11-acceptance.yml` handles pull-request updates. It retains all unique tests formerly invoked by `release-quality.yml`, including the unmodified exact Normal comparison and assisted Hard coverage. `release-quality.yml` is now a reusable compatibility entry point calling that same workflow, with no separate pull-request trigger.

Both keep `contents: read`. No permissions, secrets, caches, paid artifact storage or deployment steps are added. All named non-timing gates remain blocking. The corrected policy is not a declaration that the candidate is green; its actual measured outcomes and unresolved gameplay assertions must still pass.

## Reproduction

- `node tools/ci-relative-policy-v11.test.cjs`
- `node tools/ci-browser-gates-v11.test.cjs`
- `node tools/ci-cold-diagnostic-v11.test.cjs`
- `node tools/ci-policy-integration-v11.test.cjs`
- `node tools/locked-tests-v11.cjs`
- On an authorized browser executor: `node tools/performance-compare-v11.cjs /path/to/verified-live --immediate --ci-relative`

A fresh output directory is required for the paired run. Absolute reports remain in the raw logs and structured output; the `ciPolicy` object separately records every median, total and blocking decision. New browser measurements have not yet been run for this local policy implementation.
