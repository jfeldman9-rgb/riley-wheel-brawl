# Bounded-window candidate: ecb36da (not release-ready)

Candidate: `ecb36da649796bffaacc1d698b0c824b63ce6fd7`.

- [1.1 acceptance run 36772295243](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36772295243)
- [Inherited quality run 36772295283](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36772295283)

## Measured results

The matched three-pair comparison completed on one GitHub runner with the same browser and profiler, using live `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc` as the baseline.

- Cold entry: candidate **30/30**, live **30/30**, all below 400ms
- Candidate cold ranges by Stage 1–5: 141–146.6, 286.4–303.1, 283.7–332.2, 306.6–361.1, 328.2–338.1ms
- Pacing: candidate **16/18**, live **18/18**. Run1 Stage 5/music-on had one 33.3ms interval; run3 Stage 3/music-off had one 83.4ms interval. Both fail the unchanged zero-over33ms gate
- The separate cold smoke sample passed **9/10**. Stage 5/music-off took 497.1ms, including 273.1ms rig preparation and 142.8ms backgrounds. Its music-on counterpart took 333.1ms, including 108.3ms rigs and 139.9ms backgrounds
- Native contracts: **24/26**. The two inherited acceptance conflicts remain failures; see CONTRACT_CONFLICTS.md
- Actual Chromium device emulation: **71 checks passed**. Audio mix: **15 passed**. Protected speech sequencing, inherited seams and painted-outcome browser checks passed
- Inherited regression failed its real one-argument `prepareStage(level)` source/API contract. The next candidate restores that API and gives scene-specific preparation a separate name
- Inherited pacing also failed: the release sample had 2/5/8 over33ms intervals in Stages 1/3/5; the audio sample also failed Stage 5 and music-overlay pacing. The full assisted campaign completed with two continues and no joint attack

These are cloud measurements. Jason's Mac and physical iPad/phone/controller tests remain unrun.

## Diagnostic limits and next candidate

The isolated 83.4ms interval cannot be attributed from aggregate timing maxima: its window reported scene.draw max 3.3ms, update max 0.9ms and bake max 0.1ms. It is not excused as host variance. The next paired run retains all measured frame-gap, component-cost, work and hitch arrays as hashed gzip payloads in free workflow logs, without changing any timing rule.

Decoded profiling found redundant identity-mesh rasterization in neutral first poses. The next candidate uses the exact processed/shaded texture only when all pose and bone transforms are provably identity. Every transformed pose retains the original mesh. Its dedicated comparison covers 1,380 transformed-pose/facing results, 30 identity textures and 120 contact-coordinate pairs.

All 23 browser review payloads were decoded and hash-verified (21 JPEG review screenshots and 2 JSON reports); the full checkpoint archive preserves them with their manifest. The screenshots are emulated/staged evidence, not physical-device tests.

## Art remains open

Ten distinct painted boss outcomes are integrated. Independent seam inspection still finds inherited Stage 1–3 join artifacts. Six newly painted connector candidates were reviewed, but boundary mismatches prevented acceptance; none was inserted. Original Stage 4/5 panoramas and all reviewed source art remain unchanged. This art item remains failed/pending review.
