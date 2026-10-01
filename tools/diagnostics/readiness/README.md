## Approved CI timing policy update

The absolute measurements below still execute unchanged. CI may now pass `--advisory-timing` to `--run-browser` with `CI=true`: a complete measured result keeps its absolute failures visible but does not block on those timing flags. Identity changes, missing data, browser/measurement errors and incomplete runs still fail. The separate matched live comparison enforces the approved three-run relative FPS/frame-count rule and cold medians. Direct execution without this explicit flag retains the original absolute blocking behavior. This changes reporting policy only, not rendering or timing measurement.

# Optional pose-readiness browser diagnostic

Status: prepared and pure-controlled-tested only. **No Chromium, browser, HTTP/socket, remote call or CI run was executed for this deliverable. Native/device verification is unrun.** This directory is additive; the runtime, `tools/performance-v11.cjs`, locked tests and old diagnostic results are unchanged.

## What is here

- `performance-readiness-v11.cjs`: an isolated copy of the existing profiler with optional `--readiness`
- `readiness-probe.cjs`: browser-serializable observer derived from the earlier controlled readiness probe
- `readiness-probe.test.cjs`: controlled, browser-free observer and profiler-contract tests
- `compare-readiness.cjs`: optional frozen-manifest driver; three serial alternating pairs
- `compare-readiness.test.cjs`: pure manifest-shape tests
- `source-provenance.json`: original profiler/probe hashes and reviewed control identity
- `profiler-from-source.diff`: exact additive-profiler review diff
- `validation.txt`: local syntax and controlled-test results

The reviewed control is exactly:

- Commit `fbcf1fe2b76dd63f26c4b7a00b4ff7ccbf676814`
- Tree `2a99d4bf6d621ef3bdaae0cc83334d90635ce199`

Do not use `fbcf` as a Git revision: that abbreviation resolves to an unrelated local commit in the preparation workspace. The 320-file historical map identifies source equivalence of documentation-later local `f7e4af53c1647f10ebbc14dd2d502193ffe06a35`, but the future comparison driver deliberately requires a checkout at the full reviewed control commit/tree. It neither fetches that checkout nor invents a candidate hash.

## Portable installation mapping

Copy these executable/test files together into the authorized candidate checkout:

```
readiness-browser-diagnostics/readiness-probe.cjs              -> tools/diagnostics/readiness/readiness-probe.cjs
readiness-browser-diagnostics/performance-readiness-v11.cjs   -> tools/diagnostics/readiness/performance-readiness-v11.cjs
readiness-browser-diagnostics/compare-readiness.cjs            -> tools/diagnostics/readiness/compare-readiness.cjs
readiness-browser-diagnostics/readiness-probe.test.cjs         -> tools/diagnostics/readiness/readiness-probe.test.cjs
readiness-browser-diagnostics/compare-readiness.test.cjs       -> tools/diagnostics/readiness/compare-readiness.test.cjs
```

Retain this README, provenance, diff and validation alongside them if useful. The scripts contain no preparation-workspace paths. The profiler requires explicit ROOT and OUTPUT arguments and resolves Playwright from the measured checkout or the diagnostic installation. Use the same installed Playwright/browser and host for every pair; `CHROMIUM_PATH` works as in the original profiler.

Commit the authorized candidate and its diagnostic/workflow changes before freezing its manifest. Do not change the original acceptance profiler, thresholds or locked tests. If integrating this into CI, replace only the specifically authorized completed diagnostic job, preserve the old diagnostic tool/results, and retain all acceptance jobs. This package does not modify or trigger a workflow.

## Browser-free checks

From a checkout after installation:

```
D=tools/diagnostics/readiness
node --check "$D/readiness-probe.cjs"
node --check "$D/performance-readiness-v11.cjs"
node --check "$D/compare-readiness.cjs"
node "$D/readiness-probe.test.cjs"
node "$D/compare-readiness.test.cjs"
```

Tests cover standalone browser-function serialization, install/restore including partial failure, inherited output-method restoration, unchanged priorities/returns/draw commands, repeated demand calls versus unique keys and attempts, cancellation without false completion, rig-unavailable calls, misses with no fallback blit, real readiness versus touched readiness, RAF cancellation, flush IDs and touch costs. Manifest/log tests verify exact raw-array gzip roundtrip, byte length, SHA-256 and the 16 MiB bound, and reject abbreviated/wrong control hashes, incomplete candidate identities, same-root/same-runtime comparisons, changed sampling configuration and unsafe paths. These are controlled contracts, not native pixel or performance validation.

## Future authorized run

Run only for a meaningful completed candidate, on the one authorized comparison run. Preparation/validation cannot launch a browser. The explicit final command below can launch Chromium and a localhost server and must only be used where that work is authorized.

Set these variables to real checkouts and writable output locations outside the frozen source scopes (for example under the runner temporary directory); the control checkout must be at the exact full commit above. No placeholder candidate revision is embedded in the scripts.

```
D="$CANDIDATE_ROOT/tools/diagnostics/readiness"
node "$D/compare-readiness.cjs" --prepare "$CONTROL_ROOT" "$CANDIDATE_ROOT" "$MANIFEST_JSON"
node "$D/compare-readiness.cjs" --validate-only "$MANIFEST_JSON"
node "$D/compare-readiness.cjs" --run-browser "$MANIFEST_JSON" "$NEW_OUTPUT_DIRECTORY"
```

The manifest is created exclusively (it will not overwrite an earlier one). It freezes actual full HEAD/tree identities, source file SHA-256 hashes, and the exact observer/profiler/driver hashes. Scope is `index.html`, `css/`, `js/`, `assets/`, `tools/`, and `.github/workflows/`, including exact on-disk versus Git-tracked inventory. These scopes must be clean. Documentation-only changes are not a meaningful candidate: at least one runtime/asset file must differ. The driver uses a new output directory, validates both trees/manifests before and after every subprocess, and stops on identity changes, incomplete reports or execution failures. It does not retry, fetch, push or trigger CI.

Order: control/candidate, candidate/control, control/candidate. Each uses `--immediate --readiness --report-only` to retain both passing and failing strict measurements. Gate failures are never hidden: all six individual raw JSON files are retained; any candidate strict-gate failure gives the comparison a nonzero exit status. Execution/identity failures are distinguished as `invalid-or-incomplete`. Verification state records cloud Chromium as unrun/running/completed or partial/failed-to-start; same-Mac and physical-device checks remain explicitly unrun. Reports must contain 10 cold rows, 6 fight rows, no browser errors, identical browser version, expected JavaScript hashes and raw timing/readiness arrays.

The driver retains each exact raw report in ordinary workflow logs with the existing `RWB_PERF_BEGIN` / `RWB_PERF_DATA` / `RWB_PERF_END` gzip+base64 framing, including byte length and SHA-256. Reports are bounded to 16 MiB uncompressed and are emitted before parse, identity or execution checks can throw, so existing partial/failing JSON is preserved too. It also retains the complete `comparison.json` in that framing and prints a compact `RWB_READINESS_REPORT` final summary. Keep the workflow logs: no paid artifact upload, cache storage or separate upload service is needed. Local raw files are also written, but are not the sole durable evidence on an ephemeral runner. Decode by joining DATA payloads, base64-decoding and gunzipping, then verify bytes and SHA-256 against BEGIN metadata.

For a specifically authorized single diagnostic rather than the matrix:

```
node "$D/performance-readiness-v11.cjs" "$CANDIDATE_ROOT" "$OUTPUT_JSON" --immediate --readiness --report-only
```

Omitting `--readiness` disables observer installation. `--profile-only` and `--cold-only` remain inherited partial scopes and cannot establish the full acceptance matrix. Do not use either for the comparison driver.

## Measurement boundaries and strict gates

Unchanged inherited gates:

- Each cold enter must be strictly below 400 ms
- Fight sampling must reach at least 59.5 FPS with zero RAF gaps above 33 ms
- Full matrix is 10 cold entries plus 6 ten-second fight windows
- Immediate fight sampling starts after the same two RAF waits
- Raw `gaps`, `rafTimes`, `frameWork`, cost arrays and inherited hitch/work data are retained

With `--readiness`, the observer is installed before constructing the new Play scene. It starts an independent RAF observer immediately, including the scene-entry/two-RAF interval that the fight acceptance window does not sample. It does not advance the simulation, demand any additional pose, reorder work, flush anything, alter priorities, or add a warmup. It is restored after the observation; queued observer RAF callbacks are canceled. Scene-construction and measurement exceptions also restore it.

Cold `initMs` and `enterMs` are captured before diagnostic-result serialization. The two inherited cold RAF waits are unchanged. Raw readiness samples keep `performance.now()` observation time and RAF timestamp separately, plus a snapshot of the latest runtime frame-work row. Initial/title work may appear in the `installed` sample; timestamps and phase labels make that explicit.

Fight readiness totals span the full observed scene interval, including scene entry and the two initial RAFs, rather than only the acceptance gap interval. Markers include scene entry, synchronous-entry end, acceptance-sampler setup, first acceptance RAF and last acceptance RAF. Each marker includes cumulative counters, so subtract first/last marker counters when evaluating only the acceptance interval; the raw samples remain available for startup analysis. Do not compare an inclusive readiness total to an acceptance-only frame denominator.

The original profiler's warmed default is retained for compatibility; omitting `--immediate` still waits 2000 ms and does **not** establish startup pacing. The comparison driver always supplies `--immediate`.

## Definitions and interpretation

- `demandPriority0Calls` counts real `wantPose(kind,key,0)` invocations. Only actual matching queued jobs create latency observations. `demandWithoutQueuedJobCalls` remains explicit; no latency is fabricated for already-cached/unknown calls
- `uniqueDemandedKeys` counts unique kind/key pairs. `demandAttempts` counts distinct job objects; retries after cancellation are separate attempts. `demandCalls` counts repeated requests for that attempt
- `readyMs` is the first sample at which the actual queued job's `rig.library.has(key)` is true. Removing/dropping a job alone is never completion. Unfinished latency stays null. Times have RAF-sampling granularity and are not exact completion timestamps
- `touchedMs` separately records the first sample with that library entry's `touched` flag. It does not prove physical presentation or pixel correctness
- `unavailableRigDrawCalls` counts `Puppet.draw` returning false, using the current renderer contract. It is separate from missing-key fallback calls and thrown calls
- `fallbackMissDrawCalls` records calls whose pose-miss counter increased, even if no fallback surface exists. `fallbackDrawCalls` requires both the increment and a successfully forwarded output `drawImage` during that same Puppet call
- `fallbackDrawFraction` is fallback calls divided by `renderedDrawCalls` (Puppet calls with at least one successful image blit). Flashing twice is still one fallback draw call. `fallbackPerCallFraction` additionally supplies the fraction of all Puppet calls. Both are null for zero denominators
- The actual-blit interpretation relies on the current Puppet renderer's output contract: image blits within its draw belong to the selected body/fallback. A future candidate that introduces unrelated image submissions in that method must re-audit this diagnostic
- Queue snapshots distinguish bake jobs, priorities, jobs already library-ready/touched, the logical pose queue, the deferred touch queue's untouched/already-touched/no-surface members, and observed libraries' ready/touched/not-touch-queued entries
- Observed libraries are those reachable from observed queued/demanded jobs; the observer cannot inspect the private global rig cache. Deferred-touch membership is not proof that an entry is still owned by a live rig. No stale-ownership claim is inferred
- `stageVisibleKinds` is entry-time membership, not live actor visibility. A queued or completed idle/walk pose may belong to an absent stage kind. Queue drain is not equivalent to demanded-pose readiness
- Every `touchEntry` invocation has raw original-call cost, prior/after touched state, surface presence, queued flag, actual queue membership, flush context/ID, return and thrown state. `flushTouchesTimings` provides each flush's own ID, duration and successful/count totals, allowing tests of whether one flush submits many touches
- The native flush shifts an entry and clears its queued flag before calling `touchEntry`, so `inTouchQueueBefore:false` or `queuedFlagBefore:false` inside a flush is expected

## Observer overhead and verification limits

Instrumentation adds method wrappers, temporary output drawImage interposition, timing reads, Maps/Sets, per-RAF scans/copies and allocation. Per-sample observer time and approximate wrapper bookkeeping envelopes are reported, but these are not a complete causal estimate of perturbation. Result/restore work and timer granularity are not fully captured. **Never subtract observer cost from strict gate timings or relax a threshold.** Instrumented and uninstrumented runs must remain clearly labeled.

Observed job, rig and entry references are strongly retained until restoration, including canceled/stale ones. This run is unsuitable for unqualified cache-lifetime, GC or native-memory conclusions. It observes image submissions and runtime flags, not compositor presentation or physical-device pixels.

No full-source manifest for a future candidate was prepared here because that candidate has not been frozen. No performance pass, browser run or native-device acceptance is claimed. Use this package to make the next authorized meaningful comparison informative; it is not a reason to trigger speculative repeated runs.
