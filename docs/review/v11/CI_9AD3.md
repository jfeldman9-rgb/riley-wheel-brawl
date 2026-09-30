# Identity-pose candidate: 9ad3e66 (not release-ready)

Candidate: `9ad3e66adca8e2bb097a723b423d19e1427725d7`.

- [1.1 acceptance run 36775624348](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36775624348)
- [Inherited quality run 36775624403](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36775624403)

Both workflows failed. Live remains `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`.

## Exact-code evidence

All 315 runtime, asset, tool and workflow Git blobs match local commit `8adc8aa568c42e00f8bc2e74eab281c06dcdff30`. The complete native suite ran again against that committed code: **24/26 gates passed**; only the preserved old Callandor pivot and historical exact Normal/RNG parity contracts failed. The same 24/26 result was reproduced on GitHub.

The new decoded identity comparison passed **30 exact processed-texture identities, 1,380 unchanged transformed-pose/facing comparisons, 120 exact contacts**, tiny-deformation negative controls, and queued/synchronous identity parity. These isolated comparisons do not prove correctness under arbitrary job preemption; a separate defect was found below.

## Cloud browser measurements

| Measurement | Candidate | Verified live baseline |
|---|---:|---:|
| Three paired runs, all five cold stages, music OFF/ON | 30/30 below 400ms; 134.2–383.5ms | 22/30 below 400ms |
| Three paired runs, warmed fight windows | 15/18 pass | 15/18 pass |
| Separate fast cold matrix | 10/10 below 400ms; 131.9–393.4ms | Not run in this job |

The three failed candidate paired fight windows were Stage 5/music-on in all three runs: **4 / 2 / 1 gaps over 33ms**, maxima **33.4 / 33.3 / 33.3ms**, and **59.60 / 59.80 / 59.90fps**. The zero-over 33ms rule remains failed; baseline failures do not waive it.

The paired profiler waited two seconds before each measured fight. These are **warmed-window measurements**, not proof of smooth initial gameplay. The locked immediate-start release test also failed all three stages: **58.60 / 57.11 / 58.90fps**, **12 / 24 / 10 gaps over 33ms**, worst **50.1ms**. A separate audio cold entry took **401.2ms** in Stage 5 and failed its unchanged limit; music-on pacing also failed. The next diagnostic measures immediate gameplay after two RAFs, retaining the same thresholds and full raw arrays.

Browser gate totals: **6/8 pass**. Inherited regression, protected speech, inherited seam arithmetic, audio mixing, device emulation and painted outcomes passed. Release pacing and inherited audio pacing failed. The inherited quality workflow's successful wrapper-step labels must not be read as test passes: its logs contain pacing failures and the preserved historical parity failure.

All six paired raw reports and all 23 screenshot/report payloads were decoded and verified against their recorded SHA256 and byte counts. The full review archive contains 21 JPEG review screenshots, two JSON reports, raw frame gaps/timestamps, per-frame work and component costs. Review JPEGs are not used for pixel acceptance.

## Additional failures found by independent review

1. At the legal Riley center x=40, decoded body-only pixels still cross the left screen boundary in 10 of 38 ordinary frame/facing cases. The widest case is the left-facing roundhouse, extending 22px offscreen. The next change must use the actual painted-body support, walking shear and update/interpolation order, without distorting the art.
2. Queued mesh-pose jobs share transformed vertex buffers. In a controlled preemption probe, pausing Asha'man w0 after eight faces, completing w6, then resuming w0 changed 55,263 RGBA channels versus uninterrupted w0 (mean 14.30/255). A focused job-owned-state fix and exact interrupted/uninterrupted regression are required before any raster-flush experiment.
3. Inherited Stage 1–3 background seams remain visible. Genuine connector paintings were generated and reviewed, but rejected because their boundaries did not match. No failed candidate was inserted, and Stage 4/5 source panoramas remain unchanged.

Jason's same-Mac three-run comparison, physical devices/controllers, voice pronunciation/naturalness listening and final art/gameplay approval remain separate outstanding gates. No merge or deployment is authorized by these results.
