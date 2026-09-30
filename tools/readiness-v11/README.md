# Portable readiness correctness suite

This serial Node runner checks a candidate against four exact-hash frozen control sources. It copies no runtime into the candidate and edits no existing test. All generated files go under the selected output directory; source/harness files are protected from writes.

## Run

With an existing control checkout:

```
node tools/readiness-v11/run.cjs --candidate-root=. --control-root=../control
```

With the full control commit available in the candidate repository's local Git objects:

```
node tools/readiness-v11/run.cjs --candidate-root=. --control-ref=fbcf1fe2b76dd63f26c4b7a00b4ff7ccbf676814
```

The output directory must not already exist. The default is `<candidate-root>/docs/review/v11/readiness`; choose a fresh `--out=<path>` or `RWB_READINESS_OUT` for another run. Existing output paths are rejected before writes, and a fresh directory is created atomically. All relative command-line paths resolve from the working directory. `--validate-only` prints source selection and exact hash validation without writing outputs or running tests. No fetch, package installation, browser, server, or remote action is performed.

Use the repository's existing Node dependencies, including `@napi-rs/canvas`. Run decoded render suites serially; avoid overlapping another large Skia matrix.

## Control identity

`control.json` freezes the full expected control reference and SHA-256 values of performance, puppets, stages and scenes. An alternative local checkout/ref is accepted only when all four file hashes match exactly. For example, local `f7e4af53c1647f10ebbc14dd2d502193ffe06a35` matches these source hashes but is always reported as that actual reference, separately from expected `fbcf1fe2b76dd63f26c4b7a00b4ff7ccbf676814`. No HEAD is relabeled.

The runner materializes validated controls under output/control-runtime. Candidate sources are read directly from candidate-root. Each child records actual source paths and hashes; a mismatched runtime read fails immediately. Before/after integrity covers candidate runtime/assets, the unchanged soak/preemption tools and this harness directory. Unrelated docs, workflows and diagnostics can be prepared concurrently but are not part of this suite's integrity claim.

## Unchanged checks

Eight suites run serially, with complete case reports and logs:

- 33 queue/dependency checks
- Four bitmap close-exactly-once cases
- 1,440 pool pixel comparisons, 120 sole contacts and two tiny-deformation controls
- Full pool lifecycle matrix: 24 nested, 24 cancellation, 24 thrown, 12 drop/rebuild and 36 two-layer cases
- Existing unchanged 216-case pose-preemption tool
- 15 background lifecycle cases
- 252 background exact-pixel comparisons, including 18 cancellation/return paths
- 1,440 scheduler-driven paired RGBA hashes

`adaptation-provenance.json` records that each test-bearing harness is byte-identical to its previously passing combined-readiness version. Portability is confined to the shared runtime loader and serial runner. The combined queue harness retains its established lifecycle assertions: abandoned bitmaps close once with the combined close-once patch. No further assertions or thresholds were relaxed.

`execution.json` preserves every process exit/signal; the runner stops after a failed or interrupted suite. `config.json`, per-suite source-read reports, `source-integrity.json` and `SUMMARY.json` provide source mapping, immutable hashes and exact count validation. Each started run first marks SUMMARY.json allPassed=false; a failed child keeps it false and prints assertion context plus a bounded log tail to the workflow console. Candidate/control hashes print before the suites, and the final passing summary prints all counts and hashes. Every independent snapshot requires a fresh output directory; prior evidence is never overwritten.

These are offline deterministic/decoded correctness checks. They do not establish browser performance, FPS, frame gaps, memory budgets, GC causes or latency. The inherited native roster and final 400-play balance run remain separate.

## Reporting wrapper validation

The completed full matrix predates the final reporting-only wrapper enhancement. `reporting-wrapper.patch` and `reporting-update-provenance.json` record that exact difference; all test-bearing files, the runtime loader and verifier remain identical to the completed run. `node tools/readiness-v11/report.cjs` tests failure-log formatting without rendering. No additional full-matrix pass is claimed for a reporting-only code change.
