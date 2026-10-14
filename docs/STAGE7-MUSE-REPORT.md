# Stage 7 (Rhuidean) — Muse completion report

Continuation of the quota-cut run. The earlier run had already written most Stage 7
modules; this run reviewed them against `docs/STAGE7-PLAN.md`, fixed the failures they
caused, added the missing tools/docs, and wrote the Stage 7 test suite. No git or
network operations were performed (git is broken on this machine — see Known gaps).

## What was already there (verified, kept)

- T1 generalisations: kit `freezesRiley`/`freezesWorld` predicates in `src/riley.js`
  and `src/stage1.js`; `MAX_STAGE` + `stageEnabled(7)` behind `?s7=1`; Stage 6 → 7
  `next` behind the flag; `callInFor` 3-way (`moilan` from 7); Stage 6 HUD guards at
  `=== 6`; `bot-stage4` dispatch to `stage7Bot`; `STREAMS[n].bleed`; compact normals
  for 7; `wrapStart(7, 7)`.
- Gameplay: `stage7-def.js` zones/waves/drops; `shaido.js` (dancer flanker with
  cartwheel-lunge, veiled archer with 0.6 s volley spacing, both yield);
  `stage7-storm.js` (14 s cycle, 2.5 s tell, 4 s gust, silhouettes);
  `stage7-street.js` (9 s ring, latch, hits enemies); `asmodean.js` +
  `stage7-notes.js` (96 BPM phrases, free band by construction, gold reflect, harp
  bash, gates at 66/33%, 1.8 s channel with 3-hit/throw interrupt) +
  `stage7-arena.js` (column resonance, shockwave); boss ends bound, not killed.
- Call-ins: `moilan-call.js` (`CALL7`, `pickHelper` — duo on boss, Moiraine at 3+
  spawn, Lan on elite/human), `stage7-lifecycle.js` hooks with restore-on-destroy,
  freeze, `stage7-hud.js` live predicted-helper label/portrait, helper lines,
  `call7-cutscene.js` per-helper bags + single-blob prefetch (missing clip → strike
  still runs).
- Presentation: code-drawn art for every key (`stage7-art.js`), streamed bg7 plates
  with deferred sheets (`stage7-load.js`), voice lines as captions
  (`stage7-voice.js`, 26 ids), synth SFX, bot (`bot-stage7.js`), audit lines for
  source/voices/music/art/callIns7/stage7 clips, `tools/stage7/process_art.py`,
  `tests/helpers/stage7-harness.mjs`.

## What this run fixed (existing tests that Stage 7 broke)

1. **Stage selection from URL** (`tests/stage-registry`, `tests/stage2-flow`):
   `stageFromQuery`/`resolveStage` accepted `?stage=2.5` and returned 2.5. Both now
   require `Number.isInteger(n)` in `src/stages.js`. No test was edited.
2. **25 MB pre-fight budget** (`tests/ios-hotfix`): the gate needs ≥50 KiB headroom;
   Stage 7's counted edits had left 51,046 bytes — 154 short. Trimmed comment bytes
   in `src/stages.js`; final gate 24,948,767 / 25,000,000 with **51,233 bytes spare**
   (33 bytes over the test floor — do not add counted bytes casually).
3. **Shipped clips** (`tests/cutscene`): `STAGE_CLIPS[7]` listed a clip that does not
   exist, and the shipped-clips test requires real files with provenance. Removed the
   entry (the intro is optional per plan); `wrapStart(7, 7)` stays and no-ops. What
   to add when the clip ships is in `docs/STAGE7-ASSETS-NEEDED.md`.
4. **Music files** (`tests/stage2-assets`): `MUSIC.stage7/boss7` pointed at mp3s that
   do not exist. They now reuse Stage 6's loops with Stage 6's exact loop points
   until the 96 BPM Stage 7 loops are composed (documented at the site and in the
   assets doc).
5. **Rand on Stage 7**: no test expected Rand — `tests/stage6-loial-unchanged`
   already asserted `callInFor(7) === 'moilan'`, and the new
   `tests/stage7-loial-rand-unchanged` pins kit identity in live sims.

## What this run added

- `tools/cutscenes/encode_callins.sh` (T11: folder-ised encode for `call7` + intro).
- `tools/stage7/voice-render.json` (T12 render plan: cast, hints, 26 line ids).
- `tools/stage7/browser-hardening.mjs` (T15 tooling, adapted from Stage 6; not run —
  needs Playwright + a static server, unavailable here).
- `docs/stage7/STATUS.md`, `docs/STAGE7-ASSETS-NEEDED.md`, this report.
- **59 new tests in 13 files**: `stage7-generalise`, `stage7-registry`,
  `stage7-size-caps`, `moilan-call`, `stage7-shaido`, `stage7-storm`, `stage7-street`,
  `stage7-asmodean` (phrase free-band invariant, gate fuzz, channel, shockwave,
  resonance), `stage7-call` (live strike + hook restore + HUD), `stage7-cutscene`
  (bags, one-blob prefetch, declines cleanly with no clip), `stage7-memory`
  (≤105 MiB gate, painted ≤12 MiB, compact normals), `stage7-no-placeholder`,
  `stage7-campaign`, `stage7-loial-rand-unchanged`.

## Test results

`node --test tests/*.test.mjs`: **1479 tests, 1466 pass, 11 fail, 2 skipped**
(was 1420 tests / 16 fail before this run; +59 new tests, all passing).
`node --check` passes on every `src/*.js`, `tools/**/*.mjs`, `tests/**/*.mjs`.
`node tools/audit-stage1.mjs`: every line PASS, including all six new Stage 7 lines
(source 132,118 / 196,608; voices 0 / 4,915,200; music 0 / 2,400,000; art 0 /
6,000,000; callIns7 0 / 9,000,000; stage7 clips 0 / 2,000,000; cutscene source
16,091 / 20,480).

Campaign (`tests/stage7-campaign`, 9 seeds `FULL_STAGE_SEEDS`): clears **9/9** with
the call-in off and on; lag-250 ms bot **9/9** (gate ≥8/9). Aggregate boss time
388.4 s on / 428.2 s off = **0.907** (gate 0.70–1.02). Per-seed ratios: 0.738–1.157;
seeds 2 and 5 run slower with the call on (the spent charge changes the early fight),
so the test asserts the aggregate, matching the plan's wording.

Texture estimate (`tests/stage7-memory` + probe): atlas colour + compact normals
69.39 MiB + present painted (reused Stage 6 sheets) 1.19 MiB + code-drawn canvases
0.97 MiB ≈ **71.6 MiB** boss peak, against the 105 MiB gate and the ~120 MiB iPhone
guide. With the full painted set at plan caps it should land near the plan's ≈89 MiB.

The 11 remaining failures are all this machine's broken Xcode command-line tools:
`/usr/bin/git` and `/usr/bin/python3` both abort with "You have not agreed to the
Xcode license agreements" (19 occurrences in the suite log). They are: 3 git-diff
protected-file tests, 7 python tool tests (TTS/music/synth/placeholders), and the
full-stage evidence test (next item). None touches Stage 7 code paths.

## Known gaps

- **Evidence regeneration blocked.** `tests/full-stage-evidence` fails because
  `src/stage1.js` changed (the T1 predicate) after
  `docs/stage1/evidence/full-stage-simulation.json` was generated. The sanctioned
  writer (`node tests/helpers/run-full-stage-simulations.mjs`) shells out to
  `git rev-parse HEAD`, which fails here, so the file was left byte-identical rather
  than hand-edited. On a machine with working git, run:
  `node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json`
  and confirm the counters (not just hashes) are unchanged before committing.
- **No real-browser verification.** The sandbox forbids listening sockets and no
  Chromium/Playwright is installed, so Stage 7 was verified through the headless
  harness (real engine code, stubbed Phaser) only. Run
  `tools/stage7/browser-hardening.mjs` and the texture dump before the enable flip.
- **No painted art, voice audio, Stage 7 music, or clips yet** — full list with
  specs in `docs/STAGE7-ASSETS-NEEDED.md`. `assets/stage7/ART_STATUS.json` will be
  created by `process_art.py` when the first art is processed.
- **Stage 7 is still behind `?s7=1`** and Stage 6 only flows into it with that flag.
  Flipping the default is plan T15 and needs Jason's playtest sign-off.
- **Plan deviations already in the shipped code** (kept, they're documented at the
  sites): bracing in a gust means pushing into the wind (the engine has no block
  verb); painted pose counts are the reduced sets in `process_art.py` JOBS, not the
  larger §5.2 sketches; the bot reserves its call for the boss (duo), so call-on/off
  boss times stay comparable; the voice list is 26 ids where the plan text says 24
  (the byte cap is unchanged).
- Freeze-frame tell review (§9) and the sandstorm death-share bot metric (§2.3) are
  not asserted by tests; tells are unit-checked (≥0.55 s bash, one-beat note tells,
  1.0 s column hum, 1.1 s ring tell) but not sampled from live hits.

## Try it

Serve the repo root over HTTP (any static server on port 8765 matches the hardening
tools; `python3 -m http.server 8765` once the Xcode license is accepted), then open
`http://127.0.0.1:8765/?stage=7&s7=1` in a browser. Add `&story=0` to skip the story
panels, `&demo=1` for the bot.
