# Stage 3 handoff

Branch `rwb-2-stage3-ag`. The build below, including the softlock fixes, is
`e7a224d1eb72a9616c6f426f96c6000e3ffbaea7`. This handoff file is the next commit
on the same branch. The frame-time record is still `7eadef3088dd77e7e6178cbf9f1bc738a5ae2dfb`
and was not re-measured. Play it here:

https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/e7a224d1eb72a9616c6f426f96c6000e3ffbaea7/index.html?stage=3&s3=1

Do not merge PR #20. It stays a draft into `rwb-w2`. `main` and `rwb-w2` were not touched.
T14 (real art) and T17 (Stage 3 in the campaign) were not started. Stage 3 still requires `s3=1`.

## Smoothness first

Software rendering on this VM, not a device and not an iPad. Headless Chrome 148.0.7778.96,
1280×720, SwiftShader (ANGLE, Vulkan 1.3.0, SwiftShader Device Subzero). The governor starts
software at quality 4 and these runs ended at quality 5, because frame time stayed over 21 ms.
Demo bot, `&story=0`. `over33` is frames longer than 33.4 ms. The fps figures are the mean of
each rep's last 120 frames, the same fields as `docs/stage2/perf.json`. Do not compare them to
that file. It was a different machine. Stage 1 and Stage 2 were not re-timed here.

| Scenario | Avg fps | Fight fps | Fight frames over 33.4 ms | All frames over 33.4 ms | Fight frames |
| --- | --- | --- | --- | --- | --- |
| S3-B stage start (45 s) | 19.86 | 19.63 | 85.50% | 83.27% | 626.67 |
| S3-R rooftops (30 s after zone 2 locks) | 20.88 | 19.89 | 85.03% | 85.00% | 491.33 |
| S3-A boss arena (30 s, `&skip=boss`) | 20.83 | 20.83 | 84.93% | 85.70% | 438 |

About one frame in six is at or under 33.4 ms. The other five are slower. That is the software
renderer. It is not a claim about an iPad.

Rooftop rep 2 had walked into zone 3 by the end of its 30 s window. Reps 1 and 3 were still on
the roofs. Per-rep lines are in `docs/stage3/perf-runs.log`.

**iPad: UNMEASURED, for Jason.** Open the githack link with `?stage=3&s3=1`, play to the boss,
and note stutter and the `PLACEHOLDER ART` tag.

Headless Chrome does not focus Phaser, so that capture dispatched one `window` focus event.
At the time, `game.hasFocus` stayed false until that event (SL-1). The softlock fix below
seeds the pause from `document.hasFocus()` instead. The frame times were not re-run after it.

## Tests

`node --test tests/*.test.mjs`: **731 pass, 0 fail** (731 tests). At `d2d7008`, before the
softlock pass, the same command was **722/722**. At `150ae6e`, before T15/T16, it was **716/716**.
The nine new tests are in `tests/stage3-softlock-hardening.test.mjs`. The six before that are the
five in `tests/stage3-memory.test.mjs` and the one in `tests/stage3-voice-release.test.mjs`. No
existing test was loosened, skipped or deleted.

Stage 3 campaign: **9/9 seeds** clear (`Stage 3 campaign bot clears Caemlyn`, seeds 1, 2, 3, 4,
5, 10, 20, 100, 97).

## Stage 1 and Stage 2

Stage 1 golden sim: identical. `node tests/helpers/run-full-stage-simulations.mjs` diffed against
`docs/stage1/evidence/full-stage-simulation.json` with `sourceSha256` and `baseGitCommit` removed
prints nothing. The evidence file's hashes for `src/stage1.js` and `src/audio.js` were refreshed
so the identity test matches the bytes. The combat records were not regenerated.

`node tools/audit-stage1.mjs` runs. Pre-fight inventory **PASS, 24,991,870 / 25,000,000** bytes.
That is 1,968 bytes above the T15/T16 figure. The increase is the source added in the softlock
pass and nothing else.
Stage 3 voices PASS (813,463 / 3,686,400). Stage 3 music PASS (1,667,012). Player attack density
PASS. Character art-density **FAIL** for Riley (104/150), grunt (23/40), spear (16/40) and hound
(16/40). That failure is the pre-existing Stage 1 result. Chief and Loial stay
`NO_SLICE_COUNT_SPECIFIED`.

Stage 2 fingerprint: identical. sha256 of the prescribed `/tmp/s2.json` is
`516270d17880cb263a1a88608272e38aff987ab37513bd5acc51f78541df4115`.

## Softlocks

`docs/stage3/SOFTLOCK-AUDIT.md` is the read-only review from `74b2675` on
`docs-stage3-softlock-audit`, written against `a749402`. That branch was not merged. The file
is copied as written, including its old line numbers. Regressions are in
`tests/stage3-softlock-hardening.test.mjs`. Teen/adult difficulty is unchanged: no scene-wide
grab lock, `hurt` stays grabbable, and the fear numbers are the same.

| ID | Fix |
| --- | --- |
| SL-1 | Blur is seeded from `document.hasFocus()` when that function exists, otherwise from `game.hasFocus !== false`. Any press clears `window-blur` before the story and pause branches. A focus-only Start does not also toggle manual. The test does not pre-set `hasFocus = true`. |
| SL-2 | The next roof warning does not count down while a cutthroat holds Riley. A tile already in the air, including one started with `startTile()`, can still break the hold. |
| SL-3 | Each marked band gets its own rooftile sprite. A marked band with no sprite cannot hit. `k.img` is still the first sprite. |
| SL-4 | When the escape animation finishes, Riley gets 0.45 s of i-frames, the length of the cutthroat lunge window. A coil already traveling cannot chain-grab. A new coil is still a full tell. |
| SL-5 | `updateZones` and the tile countdown wait while `gameOver` is set. Fade copies do not lunge at a dead Riley. |
| SL-6 | `inv > 0` counts as calm, so the fear meter decays during i-frames and does not shake the frame they end. |
| SL-7 | A dead Riley stays down, including on the clear screen. A living knockdown still gets up after 0.9 s. |
| SL-8 | A hit that interrupts the escape clears `lastGrabber`. |
| SL-9 | `fadePortrait` is released with `arrow` and `ribbon` when the destination does not list it. It is not in `STAGE_TEXTURES[3]`. |

## T1–T17

| Task | Status |
| --- | --- |
| T1 stage registry and `s3=1` | done |
| T2 labelled placeholders and manifests | done |
| T3 backdrop, floors, time of day | done |
| T4 cutthroat AI | done |
| T5 Riley grabbed / escape | done |
| T6 Myrddraal | done |
| T7 hazards and set pieces | done |
| T8 music, voices, SFX | done |
| T9 HUD (mash ring, magenta fear arc, watermark) | done |
| T10 title select, only when `s3=1` | done |
| T11 story beat, only when `s3=1` | done |
| T12 campaign bot | done (9/9) |
| T13 asset and provenance tests | done |
| T14 real-art swap-in | **not done**, on purpose. No Jason approval this pass. |
| T15 perf and memory | done. Leaks below. Software frame times above. iPad not measured. |
| T16 docs and this handoff | done. Screenshots were not captured. The browser was used for frame timing only. |
| T17 Stage 3 in the campaign | **not done**, on purpose. Stays behind `s3=1` until Jason says otherwise. |

`?stage=3` without `s3` is still Stage 1. A Stage 2 clear still returns to Stage 1 unless the
flag is set. Those frozen assertions were not edited.

## Leaks found and fixed

Counts that grew, and the fix:

- Decoded Stage 2 and Stage 3 voice clips stayed in `clips` after a switch. `releaseStage` now
  drops `STAGE2_VOICES` when the destination is not Stage 2, and `STAGE3_VOICES` when it is not
  Stage 3. Regression: `tests/stage3-voice-release.test.mjs`.
- `arrow` and `ribbon` are queued for Stage 3 but are not in `STAGE_TEXTURES[3]`, so they survived
  a return to Stage 1. They are removed when the destination does not list them.
- Stage 2/3 procedural canvases `raindrop`, `lanemark`, `guardmark`, `landing` and `ring` stayed
  resident on a return to Stage 1. They are removed when the destination is Stage 1.
  Regression for both texture cases: the switch test in `tests/stage3-memory.test.mjs`.
- `budgetStage3Lights` and `threats()` allocated a new array, set and record every frame.
  They now reuse `kit._budgetLights`, `kit._budgetSeen`, `kit.lightBudget` and `kit._threats`.
  Regression: the reuse test in `tests/stage3-memory.test.mjs`. Stage 2's `threats()` and
  `applyLightBudget` were not touched. `placeFires` still allocates on the shared Stage 1/2 path.

Already clean, and locked with a test: `installStage3Suspension` removes its four game listeners
on shutdown (six cycles return to zero). Three restarts, a continue, and at least two zone changes
return harness visuals, lights, timers, tweens, input listeners and scene shutdown listeners to
the post-start baseline.

Resident Stage 3 GPU estimate, RGBA8 base level, colour + `_n` + `_nl` for every Stage 3 page,
plus the plates: **99.18 MB**, under 110 MB. Switching 1→3→2→3→1 leaves only the destination
stage's art. Boot portraits stay loaded. The Fade portrait is queued for Stage 3 and released
on the way out (SL-9).

Fear tuning was not changed. Brave 1.2 s, fill 1.6 s, radius 220, magenta arc `0xff00ff` at
alpha 0.85, and a lunging copy counts as calm.

Sizes after the softlock fixes: `src/myrddraal.js` 15,434 / 16,384, `src/stage3-hazards.js` 7,991 / 8,192,
`src/darkfriends.js` 9,120 / 9,216, `src/stage3.js` 12,185 / 12,288. The helper is
`src/stage3-lights.js` (3,036, uncapped). It now also draws one roof sprite per marked band.

## Art list

Every Stage 3 entry in `assets/stage3/ART_STATUS.json` is `placeholder: true`. Nothing has real
art, a source, or a contact sheet. Prompts are in `docs/stage3/prompts/` and are still untried.
The prompt text in PLAN §4.2 is unchanged and still asks for 2172×724 plates.

What is on disk, so the 110 MB cap holds:

- Character pages are silhouette-trimmed. `sourceSize` is still the design canvas, so the sprite
  draws at the same size.
- The seven `assets/bg3` plates are 1086×362. `plateScale` draws them at the 2172 design width
  only when the file is exactly half of 2172.
- Strips, the Fade portrait and the three story panels are at the design sizes.
- Normal maps are flat placeholder cards.

The HUD shows `PLACEHOLDER ART` until a later T14 pass flips `placeholder` off.

## Files in the Stage 3 effort

`git diff --name-only ae700b1..7eadef3` is 221 paths. Commit `5effd73` merged `origin/rwb-w2`
and brought the Stage 2 barn-fire art and the Yetti review. Those paths are listed as the merge.
Shared sources also contain Stage 3 edits made after that merge.

**Stage 3 code**

- `src/stage3.js`: backdrop, time of day, torch ramp, half-res plate scale.
- `src/stage3-hazards.js`: roof tiles, shadow pools, glimpse, drop markers. `threats()` delegates.
- `src/stage3-lights.js`: reused light budget, `plateScale`, reused threat record.
- `src/stage3-suspension.js`: pause the clock on hidden and blur.
- `src/myrddraal.js`: boss. Fear numbers are the Nemotron tuning above.
- `src/darkfriends.js`: cutthroat grab, mash, throw, drop-in.
- `src/stages.js`: Stage 3 zones, drops, flag, registry.
- `src/stage1.js`: registry-driven flow, `releaseStage` for the other stage's art, clips and kit canvases.
- `src/audio.js`: `releaseClips` for the stage being left.
- `src/riley.js`: grabbed and escape.
- `src/hud.js`: mash ring, magenta fear arc, placeholder tag, three-stage select when flagged.
- `src/bot.js`: Stage 3 demo threats, gated on stage 3.
- `src/main.js`: software quality start, used by the governor the perf run hit.
- `src/music.js`: Stage 3 loops.
- `src/assets.js`: Stage 3 queue and release.
- `src/whitecloaks.js`, `src/powers.js`, `src/stage2.js`: shared hooks the Stage 3 kit extends
  (knee, ribbon, lights). Stage 2 combat output is unchanged. The w2 merge also edited these.

**Stage 3 tests.** Every `tests/stage3-*.test.mjs` file, plus `tests/riley-grab-safety.test.mjs`
(Stage 1 and 2 never enter `grabbed`) and the Stage 3 cases in `tests/hud-input.test.mjs` and
`tests/stage-registry.test.mjs`. Helpers under `tests/helpers/` grew the Stage 3 harness only.
Stage 2 test edits in the list are from the w2 merge, not from a Stage 3 combat change.

**Stage 3 art and audio.** `assets/stage3/**`, `assets/bg3/**`, `assets/story/story3_panel_*.jpg`,
`assets/props/prop-rooftiles.webp`, `fx-shadowpool.webp`, `fx-shadowburst.webp`, `fx-fade-far.webp`,
`assets/ui/fade-portrait.webp`, `assets/audio/music-stage3.mp3`, `music-boss3.mp3`, and the Stage 3
voice mp3s named in `assets/audio/VOICE_PROVENANCE.md`.

**Tools.** `tools/stage3/make_placeholders.py`, `art-manifest.json`, `frame-hashes.py`,
`tools/tts-stage3-lines.py`, `tools/stt-check-stage3.py`, `tools/music/compose.py`,
`tools/music/music-manifest.json`. `tools/audit-stage1.mjs` reports Stage 3 voice and music
budgets separately so they do not consume the Stage 1 25 MB gate.

**Docs.** `docs/stage3/**` (plan, builds, prompts, hardening, frame hashes, the softlock audit,
this README, the perf record, this handoff). `docs/stage1/evidence/full-stage-simulation.json`
hash refresh for `src/stage1.js` and `src/audio.js` in T15, and for `src/stage1.js` and
`src/riley.js` after the softlock fixes. The sim body was not regenerated either time.

**From the rwb-w2 merge, not a Stage 3 mechanic.** Everything under `art-in/barn-fire/`,
`assets/bg2/barn-*`, and `docs/stage2/` review-pass, barn-fire prompts and shots. Kept so this
branch contains the Stage 2 fixes already on `rwb-w2`.

## Known risks

- Real T14 plates at 2172×724, plus untrimmed character pages, will pass 110 MB. The prompts still
  request that size. Repacking has to be part of the art swap, or the memory test fails.
- Half-res placeholder plates are scaled back up by `plateScale`. They are flat colour, so the
  scale does not resample painted detail. Real art at 1086×362 would look soft unless the pack
  size changes with the art.
- Silhouette trim drops the full-canvas crosshair outside the body. `sourceSize` is unchanged, so
  combat positions do not move.
- `placeFires` still builds a ranked array every frame. It is the shared Stage 1/2 path and was
  left alone so those fingerprints stay put.
- Voice clips for a stage reload the next time that stage starts. Boot portraits stay resident.
  `fadePortrait` is released with the other Stage 3 leftovers when the destination does not list it.
- ElevenLabs takes for Gill, the cutthroat and the Myrddraal are not loudness-matched to the
  Kokoro −16 LUFS lines.
- The fear vignette and the software frame times have not been looked at on a device.

## Open questions for Jason

| # | Question | Where it stands |
| --- | --- | --- |
| Q1 | A real parry button, or is counter-hitting the real Myrddraal enough? | Counter-hit only. No new button. |
| Q2 | May T17 put Stage 3 in the campaign? That rewrites the four Stage 2 ending assertions. | Not started. Stays behind `s3=1`. |
| Q3 | Do score and lives carry from Stage 2 into Stage 3? | They reset, as today. |
| Q4 | Is Basel Gill's Kokoro voice all right? The shipped Gill lines are ElevenLabs Grandfather Joe, not Kokoro `bm_george`. | Needs a listening pass. |
| Q5 | Are the returning zealot and archer in Caemlyn all right? | They are in the zones. |
| iPad | Does Stage 3 hold a steady frame on the iPad, and does `PLACEHOLDER ART` stay readable? | Unmeasured. Link above. |
