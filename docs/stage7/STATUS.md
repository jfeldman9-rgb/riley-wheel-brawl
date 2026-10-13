# Stage 7 implementation status

Play the main game with `?stage=7&s7=1`. Stage 6 advances to Stage 7 when `s7=1`; Stage 7 returns to Stage 1. The stage stays opt-in until the plan's device/playtest signoff. No changes were made to Waygate Gauntlet, TDOG, protected controls/HUD/Phaser/entrypoint, or existing tests. No commit or push was made.

## Built

- Four specified zones, exact enemy-wave tables, power drops, ribbon, baskets, boss entry and Cairhien story handoff.
- Shaido dancer flanking/cartwheel attack and shared-window archery; both yield instead of dying. Existing grunt, spear and Fade lieutenant reused.
- Alternating sandstorm, brace push reduction, safe silhouette arrivals, waking-street shards, fog curtain and streamed scenery.
- Asmodean's 600 HP, guarded 66%/33% gates, 96 BPM note phrases with a free band, reflected sour notes, harp bash, resonating columns/adds, interruptible key channel, jumpable shockwave and bound defeat.
- Moiraine/Lan automatic selection and duo boss strikes, shared charge/recharge/max-call/phase rules, nonlethal human effects, freeze/thaw, hold release, restored scene hooks, HUD portrait/help and two seconds of post-strike protection.
- Independent persistent clip bags, one predicted-helper blob, bounded/skippable playback and damage resolution independent of video readiness. Missing clips use the live strike immediately.
- All 26 scripted caption IDs (the plan's “24” is a counting error), synthesized SFX, source/art/audio/video audit categories, painted-art conversion/status tooling and clip encoding helper.
- Bot support for Stage 7 with 250 ms delayed actor/hazard observations; existing engine seam predicates preserve earlier stages.

The engine extraction remains separate: this follows the current kit/actor/prototype-hook architecture. It does not introduce a second engine or alter earlier-stage gameplay.

## Placeholders and release gates

[The complete asset inventory](../STAGE7-ASSETS-NEEDED.md) lists every missing export and its fallback: 33 new painted image/sheet keys (plus cast atlas metadata), 26 recordings, two 96 BPM music loops, six call-in clips/posters and optional intro clip/poster. All gameplay works with those missing. The Fade and three atlas fighters are existing finished assets. The music currently reuses Stage 5 stage music and Stage 6 boss music; it does not match the note clock. SFX are functional synthesized cues.

Story panels show Riley only from behind. No video is enabled without review. [Fallback art gallery](evidence/fallback-art.png) was rendered and inspected through a local canvas implementation; it is not a browser screenshot.

The engine has no block input. Holding Run while stationary provides the storm's 50% brace effect without changing protected controls; the wind prompt explains this. The abstract `block` state is also supported. Dancer/archer recovery is 2.2/3.0 seconds; their specified speed, tells, range and shared firing window are unchanged.

Browser socket creation and Chromium launch were denied by this environment. Consequently no physical iPhone/WebKit texture, FPS/p95, video likeness, 10-hit visual-tell sample or five-run browser acceptance is claimed. `tools/stage7/browser-hardening.mjs` is supplied for browser runs. Final painted/recorded assets also require their art, loudness/transcript and loop review. These are the outstanding T12–T15 content/device gates; default enablement still requires the user's playtest signoff.

## Memory and download budget

- Pre-fight inventory: **24,948,685 / 25,000,000 bytes**, only **+28 bytes** against the plan baseline. Stage 7 source and assets are separately budgeted. See [audit.json](audit.json).
- Conservative fallback source-texture estimate: **87,980,464 bytes / 83.90 MiB**, including all fallback scenery and story panels together, reused Fade, compact normals and an 8 MiB allowance for shared assets. This is below the 105 MiB source gate and ~120 MiB guide, but is **not measured GPU memory**. Painted cast/props including Fade are 2,485,120 bytes, below 12 MiB. See [texture-estimate.json](texture-estimate.json).
- Stream keeps current/next zone plates, disposes previous plates, releases story/portal/storm textures early and removes Stage 7 keys on exit. Shared Fade may remain for Stage 6. Blob revocation and texture release are unit-tested.

## Verification

`node --test tests/*.test.mjs` completed: **190 passing files, 9 failing files, 199 total** on Node 20.19.2 (Node 22 was unavailable). Eight failures also occurred before any implementation: stage2-flow, stage3-flow, stage4-audio, stage4-placeholders, stage6-protected, stage6-rand-clips, stage6-registry and stage6-size-caps. Each fails on `spawnSync … EPERM` because the sandbox rejects subprocess pipes. All eight pass when their real subprocess output is captured through temporary files instead; no assertions are changed or skipped. The full suite rerun with that environment-only output adapter completed at **198/199 passing**, with only the obsolete Stage 7 Rand expectation failing.

The additional failure is `tests/stage6-loial-unchanged.test.mjs:12`, which asserts `callInFor(7) === 'rand'`. Stage 7 correctly returns `moilan`, as expressly required. The plan forbids modifying existing tests; additionally, `stage6-protected` verifies that every existing test remains identical to HEAD. Neither test has been edited. Permission was requested for the obsolete expectation; the raw suite cannot be fully green with both conflicting assertions left intact.

All seven new test files pass, including:

- 9/9 unassisted, 9/9 assisted and 9/9 250 ms lag campaign runs; no Z1 deaths in the unassisted sample. Assisted boss times are 79.6–101.6% of unassisted times. [Per-seed times](campaign-results.json).
- Golden observations for all **54 earlier-stage/seed combinations are unchanged**, including spawn/death times, completion frame, HP, lives and score. Fixture was captured before the wiring changes.
- 1,000 large boss damage hits respect gates; phrase free-band/tell invariants, reflections, channel interrupts, human yield, shared archery spacing, storm bounds/brace/grab deferral, street latches and shockwave jump avoidance.
- Missing/playing/stalled video all resolve strike damage at the same moment; death/continue/destroy thaw clocks and release holds; helper bags and in-flight blob cancellation; all own scene hooks restored.
- Earlier-stage queues request no Stage 7 media; streaming geometry is unchanged for Stage 6; Stage 7 releases textures; byte and source-memory gates pass.

Stage 1 simulation evidence was regenerated for the two generic freeze-predicate wiring changes. Every combat record and aggregate result is identical; only source hashes and the recorded base commit changed. JavaScript syntax, Python/shell syntax and `git diff --check` pass.

Reproduce:

```sh
node --test tests/*.test.mjs
node --test tests/stage7-*.test.mjs tests/moilan-call.test.mjs
node tools/audit-stage1.mjs
node tools/stage7/memory.mjs
python3 tools/stage7/process_art.py --write-status
# After installing Playwright/WebKit and serving the repository:
RWB_URL=http://127.0.0.1:8765/ node tools/stage7/browser-hardening.mjs
```
