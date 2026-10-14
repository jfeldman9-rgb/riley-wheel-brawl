# Stage 7 implementation status

Stage 7 remains opt-in with `?stage=7&s7=1`. Stage 6 continues to it when enabled; Stage 7 continues to Stage 1. Moiraine and Lan are the only Stage 7 call-ins. The fallback story panels show Riley from behind and no unreviewed video is enabled.

Press **O** or tap/click the call portrait to cycle **Auto → Moiraine → Lan**. Auto retains the original
crowd/lane selection and boss duo; either solo helper can now be requested in the boss arena with
the same charge, phase gates and damage cap. Esc dismisses visible Asmodean dialogue before pausing.

For channel/throw testing, use `?stage=7&s7=1&skip=boss&story=0&s7debug=1` and start the game.
Once Asmodean has arrived, press **T** (or call `window.__stage.kit.debug.forceChannel()`).
This clears hazards, sets a vulnerable phase-3 channel, grounds Riley, and puts a hurt, grabbable
Trolloc immediately to his right. Walk right to grab, then press Jump to throw left into Asmodean.
For three-hit testing, press T again, move left to Asmodean, and attack in his depth lane.
The ordinary 1.8 s channel window and combat collision rules apply. The debug hook and T listener
are absent without `s7debug=1` and removed on stage exit; it does not enable god mode.

The combined #55 review fixes and per-finding evidence are recorded in [FIXES-S7.md](../../FIXES-S7.md). The new tests exercise scene behavior, animated throws, loader/video/audio failures, touch bracing, HUD state, bot helpers, lag campaigns and warning timing. `?call7=1` retains the boss-assist benchmark; `?call7=all` enables calls throughout the campaign and note/channel counter tactics.

The earlier statement that no existing test had been edited was incorrect: the input branch already changed `tests/stage6-loial-unchanged.test.mjs` to expect `moilan` for Stage 7. This fix commit additionally corrects the video-wait expectation in `tests/stage7-lifecycle.test.mjs`. No other existing test, protected control/HUD file, pinned Phaser file or entrypoint is edited by these fixes.

The pre-fight audit remains 24,948,685 / 25,000,000 bytes. [Static estimate](texture-estimate.json) now accounts for final painted decoded caps rather than labeling fallback canvases as painted assets. [Actual Chromium texture dump](texture-art.json) reaches clear with no page errors: 74.46 MiB source peak and 77.98 MiB GL peak, including normals and render targets. The conservative final painted/story projection is 102.85 MiB source, below the 105 MiB source gate; painted cast/props including Fade are 10.18 MiB, below 12 MiB. Physical iPhone/WebKit compliance is still unmeasured. Local WebKit cannot launch because its required runtime libraries are absent.

All 33 painted keys now ship in `assets/stage7/` and `assets/bg7/`; `assets/stage7/ART_STATUS.json` records their presence. The [asset inventory](../STAGE7-ASSETS-NEEDED.md) still tracks 26 missing voice recordings, two commissioned 96 BPM music loops, six reviewed call clips and optional intro. Captions, synthesized SFX and older music keep the stage playable. Voice/video/music and physical-device release gates remain open.

The prior fix suite counts and exact campaign results are in FIXES-S7.md; painted-art validation is recorded below. No push or merge is performed by this local fix task.

## Art wiring

Copied the 33 final painted images and six JSON files from the Stage 7 art handoff without modifying or reordering them. Regenerated the painted presence/status manifests with `python3 tools/stage7/process_art.py --write-status`; Asmodean now has 17 frames. `src/stage7-frames.js` maps the character JSON `state` labels to production fighter and helper states. Asmodean plays the harp during pending notes, Shaido tell/attack/hurt/yield/down poses use their correct cells, Moiraine raises then casts, and Lan runs, draws, slashes and points in the outro. The six 128×128 earth cells animate crack, grow1–3, full spike at the 0.65 s hit, then crumble. Procedural fighters keep their eight code frames and scale; procedural earth stays a single texture. Missing files, loader errors and the existing 1.5 s wall-clock deadline retain code-drawn fallbacks. Riley art is unchanged; visual inspection of all three supplied story panels confirms his rear view.

Boss/helpers/earth still load through `demand7`; later scenery keeps the existing zone streaming. Earlier-stage queues request no Stage 7 art. Pre-fight inventory remains **24,948,685 / 25,000,000 bytes** (51,315 bytes free); the painted files add no pre-fight bytes. Stage 7 art inventory including JSON/status is **1,761,874 / 6,000,000 bytes**. All individual encoded/decoded art caps pass.

`node tools/stage7/memory.mjs`: fallback/source upper bound **87,980,464 bytes** (83.90 MiB); conservative projected painted peak **107,843,481 / 110,100,480 bytes** (102.85 / 105 MiB); painted cast/props including reused Fade **10,675,817 / 12,582,912 bytes** (10.18 / 12 MiB); plate peak **8,812,032 bytes**; story panels **11,059,200 bytes**. No budget gate fails. These are static source-RGBA estimates; the earlier Chromium dump predates painted wiring, and this task does not establish a new measured GPU or physical-device result.

Validation: eight new behavior/asset tests; complete individual totals **1,487 passed, 0 failed, 2 skipped** across 203 test files. This sandbox rejects Node subprocess pipe capture with `EPERM`; an external `/tmp/s7-file-capture.cjs` preload captures real subprocess output through files instead, preserving every test assertion. The complete `node --test tests/*.test.mjs` rerun uses `NODE_OPTIONS=--require=/tmp/s7-file-capture.cjs` and finishes with **203 files passed, 0 failed** (164.84 s). No repository test runner or existing tests were changed. Local commit creation is blocked because this workspace mounts `.git` read-only (`git add` cannot create `.git/index.lock`). No push, merge or remote change was attempted.
