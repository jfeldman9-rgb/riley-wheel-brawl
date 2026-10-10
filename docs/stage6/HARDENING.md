# Stage 6 hardening

## Hardening cycle 1 (Codex Sol 6.1)

Started at `be3d520`, branch `rwb-2-stage6`. Stage 6 remains gated by `?s6=1`.
No commits, stashes, pushes, merges, other-branch edits, asset changes, or changes to existing tests/helpers.
`CONTRACT.md` wins where `PLAN.md` describes superseded values (38 HP / 6% boss hit, 900 ms skip guard).
Controls, HUD, touch layout, damage, tell durations, charge/recharge/phase limits and combat constants are unchanged.

Each confirmed defect has a regression in a new test file. Red-test extracts are in
[hardening-reproductions.txt](hardening-reproductions.txt). Some early extracts also contain synthetic-fixture
failures; these were corrected in the new fixtures, with no changes to production for those failures.
The final tests exercise the completed behavior, including the conservative per-hit flurry protection
rather than restarting the attack clock. No existing test was loosened, skipped, removed or edited.

| Suspicion | Verdict / evidence | Fix and covering new test |
|---|---|---|
| Be'lal locks Riley into uninterrupted hurt or pins him against either wall | **NOT REAL.** Existing 60-second mirrored wall tests pass. New tests pin all four connected hits at 6/6/8/14, only hit four downs, hits 1–3 reset hurt streak without putting Riley in hurt/down, exact tells 0.55/0.48/0.48/0.6, and no walk/lunge toward either wall. | `stage6-hardening-combat.test.mjs`; existing `stage6-boss.test.mjs` unchanged. |
| A flurry already in progress connects after a snare/getup cooldown starts or Riley moves into a live line | **REAL.** Starting each protection just before the active hit still removed HP. The original guard covered only selection of the next flurry. | `belal.js` checks the protections at each connection, preserving the attack/tell clock. `stage6-hardening-combat.test.mjs`. |
| Attacks bypass story/pause/getup invulnerability | **NOT REAL for HP outside Rand.** Existing shared damage rules already reject these states. **REAL during a Rand strike** if an attack is invoked in the CALL frame/direct path; the shared Stage 5 damage predicate knows only its own arena freeze. | Stage 6 actors/arena import the new `stage6-hurt.js`, which adds the local strike guard. `stage6-hardening-combat.test.mjs`. |
| Net/line snare applies despite getup invulnerability | **REAL.** HP stayed 100 but `stone.snare` became positive after a rejected hit. | `stage6-arena.js` applies the snare only after an accepted strike. `stage6-hardening-combat.test.mjs`. |
| Hazard and boss telegraphs are readable | **REAL missing visuals.** Active net/lamp/oil/line footprints generated no world images, and every flurry tell hid Be'lal's streak. | New `stage6-tells.js` renders the existing keys at the actual 400 px net width, 80 px lamp/oil radius and line lane/bounds; `stage6-view.js` owns/disposes them. `belal.js` shows the existing streak during all four tells. `stage6-hardening-combat.test.mjs`. |
| A cleared hall can restart hazards during the walk to the exit | **REAL.** `clearZone(1)` followed by two seconds of steps created a fresh lamp/pool. | `stage6-arena.js` remembers cleared zones and stops their scheduling. `stage6-hardening-combat.test.mjs`. |
| CALL freezes the whole frame and all gameplay clocks | **REAL.** CALL from `Riley.update` was followed by enemy damage, Riley physics and projectile updates in the same frame. Scene Clock, animation and tween clocks also remained live for the strike. | One Stage-6-only early return each in `riley.js` and `stage1.js`; `stage6-freeze.js` saves/restores Phaser clock scales without altering the two-second strike clock. `stage6-lifecycle.js` uses it. `stage6-hardening-lifecycle.test.mjs`. |
| Death / disposal mid-strike leaks lights/visuals; disposal mid-video leaves the call busy | **REAL.** Death discarded the strike with two lights still resident; video teardown retained `rand.on = true`. | `stage6-lifecycle.js` runs owned cleanup on death without granting invulnerability, thaws clocks on disposal, and clears busy state. New lifecycle tests cover death, quit, restart, continue and stage switch. |
| Skip input leaks, double CALL spends twice, strike i-frames start too early, recharge runs on wall time | **NOT REAL.** Skip flushes on exit and before the first resumed update, even when the DOM edge is buffered again after the skip handler. A second same-frame CALL is refused. Invulnerability is exactly two seconds at strike end. Pause, story and strike consume no recharge time; ten KOs plus 45 seconds of game updates recharge. | `stage6-hardening-lifecycle.test.mjs`; existing Rand rules/30–60–120 Hz/watchdog tests unchanged. Floating-point accumulation can need the next frame at the 45-second boundary; this is not wall-clock recharge. |
| Rand staggers inherit an old attack/channel clock | **REAL.** A boss with `st = 1.3` entered Rand's stagger with an already expired state clock, misleading consumers of `st`. | `rand-call.js` enters stagger at zero with its counter latch set. Duration remains one second. `stage6-hardening-rand.test.mjs`. |
| A ray-empowered cast downgrades an active sa'angreal or leaves a temporary boost after an exception | **REAL.** The hook replaced the stronger active boost with angreal; a thrown spawn retained the temporary power. | `stage6-lifecycle.js` preserves sa'angreal and restores boost in `finally`. No power values changed. `stage6-hardening-rand.test.mjs`. |
| Prefetch recreates a blob after teardown, or overlapping requests lose a live URL | **REAL.** A deferred response succeeded after `dropBlob`; two responses each allocated a URL, and the older one overwrote the newer one. | `rand-call-cutscene.js` invalidates pending generations and admits only the newest response. New video tests pin zero post-disposal blobs and one allocated/revoked URL under reversed completions. |
| The second video retains its iOS gesture blessing and never replaces the main player | **REAL.** The capture gesture created/blessed one element, then CALL constructed another. Completion also discarded the element, losing the per-element blessing on every call. | `rand-call-cutscene.js` reuses the second player until abort/teardown, independently of the main player; root changes create a fresh owner. New video tests count two total objects, main plus Rand, over repeated calls and verify src clearing, pause, inline attributes, detach and muted retry. |
| Successful videos accumulate shutdown listeners or resume an unrelated pause | **REAL.** Each completion left one shutdown listener; finishing while visibility/manual pause remained called `scene.resume()` anyway. | `rand-call-cutscene.js` unregisters the shutdown listener on every completion/abort and uses the existing pause-reason owner without an unconditional resume. `stage6-hardening-video.test.mjs`. |
| Video construction failure freezes the game; decoding continues with Phaser rendering under the video | **REAL.** A throwing `createElement` left the cutscene pause and duck intact; the Rand path did not own a game-render pause. | `rand-call-cutscene.js` falls back to the immediate strike after cleanup on construction failure and pauses/resumes only the game pause it acquired. New video tests cover construction and synchronous playback failure, existing game pause ownership and timer/listener release. Live WebKit records one inline element and game pause during CALL. |
| Missing files, 404, decode errors, refused play, muted fallback, stall, no-start timeout, disabled clips, rotation 1–5, 900 ms guard or watchdog softlock the call | **NOT REAL beyond lifecycle bugs above.** All fallback callbacks run once, release timers/overlay/src/music/input, and land the strike. The actual zero-file directory advances in live WebKit. Bags visit every id per refill and restore without repeats for N=2–5; N=1 may repeat. | `stage6-hardening-video.test.mjs` plus unchanged `rand-call-cutscene.test.mjs`/`rand-clip-sizes.test.mjs`; `browser-hardening.json`. No clip asset is generated by this pass. |
| A hatch/glimpse callback outlives its kit/view | **REAL.** A pending hatch spawned after hook teardown; view teardown did not cancel the gallery timer. | `stage6-lifecycle.js` owns hatch removal/timer cancellation; `stage6-view.js` owns/cancels glimpse timers. New lifecycle/combat tests. Phaser scene shutdown already cancels its native clock, but direct kit/view disposal also needs ownership. |
| Gray Man / Fadelt stay invisible or unhittable; Defenders block gates or fail to retire | **NOT REAL.** Transient down/blink states recover, dead bodies retire, Gray Man's proximity/light/five-second reveal and cap remain pinned. Defenders are view sprites, not combat/collision entities. All zone/campaign invariants and six-stage boss loops pass. | New combat/assets tests, unchanged Gray Man/Fadelt/hazards/campaign tests, live scene transitions. |
| Compact texture swaps work on the actual Phaser loader | **REAL.** Live images use `blob:` URLs; the directory-string heuristic kept compact normals in Stages 1–4 and evicted/reloaded them for 5/6. Synthetic old tests supplied asset URLs and missed it. | `texture-pages.js` tracks queued variants per TextureManager with a WeakMap. Six blob-backed switch regressions in `stage6-hardening-assets.test.mjs`; live 6→1/2/3/4 restores Riley width 2040, 6→5 retains width 680, with no missing animation keys/warnings or page exceptions. |
| Stage 6 leaves owned textures behind | **REAL, small.** The live transition retained `s6planks` (1024 decoded bytes), which was omitted from the release list. | `stage6-def.js` includes it in `STAGE6_TEXTURES`; new canvas-inventory regression and live transitions show zero Stage 6 keys in all five destinations. |
| The bot can safely escape conflicting hazards and use Rand's stagger | **REAL controller defects.** A line-margin dodge pointed back into a flurry with no horizontal escape. The delayed bot pressed attack while running, committing to a long runkick inside the reaction window. It could also spend the one-second Rand stagger while Riley was busy. | `bot-stage6.js` waits for actionable Riley, and the delayed controller stops running before melee; new `stage6-bot-escape.js` retreats horizontally when the line escape points into a sampled attack. New bot tests. All decisions use existing actor windows/values and the existing delayed samples. |
| Safari 15 encounters forbidden APIs/syntax | **NOT REAL in this head.** The scan of every `src/*.js` finds no `.at`, findLast, structuredClone, Object.hasOwn, static blocks, lookbehind, immutable-array copy APIs, or unguarded video-frame callback. | `stage6-protected.test.mjs`. This is a syntax/API check, not physical-device acceptance. |

### C1–C4 coverage

New files (86 assertions/tests in total):

- `stage6-protected.test.mjs` (3): protected bytes against **HEAD**, existing test/helper preservation, Safari scan and no new Stage 6 source marker text.
- `stage6-hardening-combat.test.mjs` (17): C1 exact damage/tells/fourth knockdown/mirrored wall movement, dynamic flurry protections, damage eligibility, snare acceptance, tell rendering/disposal, zone clear and transient actor retirement.
- `stage6-hardening-lifecycle.test.mjs` (12): C2 skip reflush, double spend, recharge/game time, end-of-strike i-frames, whole-CALL-frame and clock freeze, owned strike/hatch cleanup and five mid-video exit paths.
- `stage6-hardening-video.test.mjs` (22): C2 bags N=1–5/session restore, zero-file/error/play/stall/timeout/skip/pad paths, muted retry, listener/pause/video ownership, construction/synchronous failure and prefetch races.
- `stage6-hardening-rand.test.mjs` (2): fresh one-second stagger clock and safe ray/boost hook.
- `stage6-hardening-bot.test.mjs` (3): conflicting line/flurry escape, actionable CALL and delayed melee commitment.
- `stage6-hardening-assets.test.mjs` (27): C3 inventory under 25,000,000 bytes and every Stage 6 sibling excluded/counted; C4 complete release inventory, URL-backed and blob-backed 6→1–6 swaps; queue and boss/HUD no-marker loops over all six stages; no-power seed 1 clear.
- `stage6-hardening-fixtures.mjs`: a new standalone DOM/video/clock fixture; existing helpers are unchanged.

The existing boss, Rand, size-cap, memory and idle/fuzz tests remain unchanged. Their missing runtime assertions
are added above. `tools/audit-stage1.mjs` counts all four new source siblings inside Stage 6's existing budget;
no cap is raised. The large escape helper is a sibling to keep `bot-stage6.js` below 12288 bytes without
minification or comment removal.

### Live memory and transitions

Serve: `python3 -m http.server 8765 --bind 127.0.0.1`.
Measure: `NODE_PATH=$(npm root -g) RWB_STAGES=5,6 RWB_ENGINES=webkit
RWB_TEXTURE_OUTPUT=docs/stage6/texture-hardening-final.json node tools/stage5/texture-dump.mjs`.
Playwright global version is 1.63.0. Same renderer, viewport 1280×720, render/device scale 1, god-mode full campaign,
real Phaser headless ticks, render at samples, both Texture.source and Texture.dataSource RGBA base levels.
Renderer wrappers are reported separately, never added to the source sum.

| WebKit MiB | Stage 5 | Stage 6 |
|---|---:|---:|
| Boss source peak | 106.34 | **94.82** |
| Entire-run source peak | 108.96 | **94.87** |
| GL wrapper peak, including render targets | 119.51 | **105.42** |

Both reach clear with zero page exceptions. [texture-hardening-final.json](texture-hardening-final.json) holds the
final dump; [texture-hardening.json](texture-hardening.json) is the before-fix comparison (Stage 6 boss 94.79).
The builder's 94.81 MiB is confirmed within text/sample variation; the Stage 5 108.96 MiB number is a whole-run
peak, not its 106.34 MiB boss peak. Under the approximately 120 MiB source budget, with no new bitmap assets.

`tools/stage6/browser-hardening.mjs` saves [browser-hardening.json](browser-hardening.json): live 6→1–5 swaps,
actual dimensions, animation references, missing-texture warnings, scene/page exceptions and video teardown.
Stages 1–4 regain original pages; Stage 5 keeps compact pages. No Stage 6 keys remain, including planks.
Boot-owned `bossPortrait`, `loialPortrait` and `byarPortrait` still reside during Stage 6 despite its replacement
portraits: **0.75 MiB total**. They belong to the shared HUD/title path; removing them would require broader
ownership changes, so they remain. No Loial/Fade fighter atlases, cutthroat normals, Twix or Riley lightning
sheet stays resident in the Stage 6 peak.

### Validation and limits

Final full suite: **1299 tests: 1297 pass, 0 fail, 2 skip** (existing Stage 4 STT and optional ESM Playwright viewport checks).
See [hardening-suite.tap](hardening-suite.tap). Playwright ran the dedicated live probes through `createRequire`
with global `NODE_PATH`; the optional existing ESM test cannot resolve that global package.
Stage 3/4/5 campaigns **9/9 each**. Stage 6 **9/9 off, 9/9 on, 9/9 with 250 ms delay**, plus no-power seed 1.
Paired Rand/off boss-time ratios are **0.709–1.009**. Longest ordinary no-Rand boss is seed 10 at 108.7 seconds;
no difficulty constants were changed. Controller diagnostic samples are in `hardening-controller-traces.json`;
final campaign rows are in `hardening-campaign.tap` and the full suite.

Audit exits **0**: pre-fight **24,904,870 / 25,000,000 bytes**, Stage 6 source **105,694 / 196,608 bytes**;
all per-file caps pass. [hardening-audit.json](hardening-audit.json).
`git diff --check`, protected HEAD diff and existing test/helper diff all pass.
The requested golden reproduction and `jq del(.sourceSha256,.baseGitCommit)` payload diff produce no output.
Only the hashes for `src/stage1.js` and `src/riley.js` were refreshed in the evidence file.

Remaining limits: physical iPad/iPhone Safari 15, touch/gamepad hardware, sound acceptance and renderer performance
are untested. Actual Rand art/MP4/voice/music files are still absent. The live injected-MP4 skip attempt finished
through a media fallback before the 900 ms skip guard; it proves clean fallback/teardown, not a successful native
skip of a playing Rand clip. Deterministic DOM/video tests pin skip, stall, refused sound and muted retry.
The measurements above are asset/renderer inventories at scale 1, not process RSS, driver memory or a native-retina
device guarantee; the known Stage 5 retina render-target risk still applies. Source still contains the pre-existing
HUD debug marker identifier and earlier-stage comments at HEAD; the protected HUD is byte-identical and no new
Stage 6 source contains that string. No marker is displayed without `?debug` in any of the six stage boss loops.

## Review-fix cycle (Codex Sol 6.1)

Started at `359e815` on `rwb-2-stage6`. Read this history, `CONTRACT.md`, and the outside review at
`/workspace/ag/codex-run-s6b/kimi-review.md`. Checked the claims against the complete runtime, including
Stage6Kit, arena, CutscenePlayer, main-player hooks, Stage1, Riley, shared Input, bot and simulation harness.
Stage 6 remains behind `?s6=1`. No commits, stashes, pushes, merges or other-branch changes.

All five confirmed defects had failing tests in new files before production changes. The corrected-fixture
baseline in [review-reproductions.tap](review-reproductions.tap) contains **14 tests: 1 pass, 13 fail**.
The failures include extra defensive terminal-state checks with deliberately retained stale timers; these
are coverage of finding 1, not claims that counter/hurt paths independently corrupt death. Initial local
fixtures without an eligible enemy were corrected before this recorded baseline and before fixes.
Existing tests and helpers were not edited, loosened, skipped or deleted.

| Finding | Verdict and reproduced evidence | Fix / touched production file |
|---|---|---|
| 1. Rand stagger overwrites Be'lal's erase | **REAL, P1.** `lethal Riley hit during Rand stagger completes erase and the real bossDown path exactly once` in `stage6-review-combat.test.mjs` applies Rand at 39 HP, then a lethal Riley hit at 1 HP. Before fixing, Be'lal remains alive after 120 updates and never reaches bossDown. Stage1 has no independent zero-HP boss cleanup: victory depends on `onEnemyDie`. The phase-3 gate allows Riley's lethal hit; Rand itself cannot kill. | `belal.js` dispatches erase/dead before temporary states and clears `randStagger` in `beginErase`. Exactly one death notification now reaches the real Stage1 victory path and the body retires. Counter and channel-break mutations occur before `guard`, and ordinary hits do not install Fighter hit stun; none independently overwrites a terminal state. Three additional regressions pin terminal priority and rejected repeated hits. `rand-call.js` needs no change. |
| 2. Throwing storage getter strands the call | **REAL, P2.** The three `throwing sessionStorage getter at initial/finish/warm cannot strand a spent Rand call` tests in `stage6-review-lifecycle.test.mjs` reproduce the escaped getter and missing strike callback. The game frame guard catches update exceptions but does not undo `trySpend`; CutscenePlayer catches a thrown completion callback but does not retry it. Neither guard repairs busy state. | `rand-call-cutscene.js` obtains storage through a safe accessor at warmup, initial selection and completion/prefetch. The bag falls back to memory, the strike runs and busy clears. `resetRandCall(storage, rng)` has no root getter access: its explicitly supplied storage's getItem/setItem accesses already run inside createBag's catches. |
| 3. Lunge continues into the protected wall zone | **REAL, P2.** Four mirrored `lunge tell/active aborts when Riley enters the left/right 140px wall zone` regressions in `stage6-review-combat.test.mjs` fail before the fix: the tell launches and active movement advances toward the wall. The contract's prohibition applies during movement, not just selection. | `belal.js` rechecks at launch and before each active movement/hit, aborts to idle with the existing 0.7 s lunge recovery, and keeps the existing 0.7 s tell. Early cancellation during the tell was rejected by campaign validation (seed 10 ratio 0.679); the final launch check preserves the existing tell clock and all campaign constraints. Away-from-wall lunges remain allowed. Both mirrored cancelled active lunges still permit close pinned flurries; the unchanged 60 s wall-pin test still passes. |
| 4. Bot sample map retains departed enemies | **REAL, P3, bot only.** `delayed bot memory follows current living enemies across replacement waves` in `stage6-review-lifecycle.test.mjs` observes 3 retained entries instead of 1 after death/removal. Bot.destroy does not clear the map; normal scene teardown releases the bot, but that does not solve retention during a campaign. | `stage6-lifecycle.js` prunes absent, dead and gone keys before sampling and excludes gone enemies from new samples. Thirty replacement waves now track live population, preserve delayed samples, and return to zero entries between waves. |

The additional review boundaries were checked as follows:

| Area | Verdict / evidence / fix |
|---|---|
| a. Skip input | **REAL for held gamepad Start; NOT REAL for the checked keyboard/touch/pointer paths.** `gamepad Start held after a Rand skip cannot leak a manual pause before the first resumed scene update` in `stage6-review-input.test.mjs` reproduced a manual pause before the Stage 6 flush wrapper. Pinned Phaser Game.step emits no STEP while game-paused; main.js polls pads on STEP before scene update. At video exit Input.pollPad therefore creates a fresh Start edge and Stage1.onPress toggles manual pause. `rand-call-cutscene.js` now polls once while the cutscene still owns onPress, then flushes: held edges are consumed, a release/new press still pauses normally. New keyboard and touch tests use production Input/Stage1.onPress, hold/repeat/release through the strike, verify idle after resume and a working fresh attack. Input ignores keyboard repeat; touch release emits no press; overlay touchend prevents the compatibility click. The overlay is a DOM sibling above the canvas, so its bubbling events do not target the canvas's pointerdown controls; the title pointer callback also rejects a started fight. Shared input bytes/controls/layout are unchanged. |
| b. Safari video/audio unlock | **NOT REAL as a reproduced unlock or listener leak.** Existing second-player reuse/muted retry tests and the new `Rand retains two owned capture listeners for muted-play unmute and removes both on teardown` test verify the blessed element is reused, both inline attributes and playsInline, play-promise rejection handling, NotAllowedError's muted retry, and gesture unmute on that same element. The two capture listeners intentionally remain after the first gesture so later muted playback can unmute; they do not accumulate and both disappear on Stage6Kit teardown. Removing them on first use would lose that recovery path. This is deterministic behavior evidence, not proof of physical Safari sound unlock. |
| c. Media cleanup | **NOT REAL.** `player abort synchronously releases its interval, listeners, source and overlay without invoking done` in `stage6-review-video.test.mjs` pins abort's immediate cleanup. CutscenePlayer.finish clears the single interval (also owns start/stall checks), removes ended/error/overlay/resize listeners, pauses, clears src/poster, calls load and detaches the overlay. Abort calls finish with null and **never calls done**, synchronously or later. Existing completion/skip/decode/refusal/stall/start-timeout/construction-failure/prefetch-race tests pass. Rand removes its shutdown listener and invalidates blob generations. The watchdog belongs to the game, not a call: a cleared scene.cutscene makes its next tick inert. A successfully completed player object is deliberately reusable; its detached video has no source or active decoding. |
| d. Exit/strike races | **NOT REAL beyond finding 1's boss-death interaction.** Eight new `death/quit/restart/stage switch / Rand exit/completion first: no late strike, damage or retained media` regressions in `stage6-review-video.test.mjs` use the real scene death hook or shutdown handler in both orders, and check the 899/900 ms guard. Exiting first aborts without invoking the strike callback; completing first creates the strike synchronously and exit disposes it. The target's HP remains unchanged, all media/timers are released, busy clears, and late events are inert. A Riley death keeps the scene's own shutdown handler (for respawn), while removing Rand's handler. Existing mid-strike death/disposal tests cover lights, visuals, freeze clocks and no granted death i-frames; continue/quit/restart/stage-switch tests remain green. |

New tests: `stage6-review-combat.test.mjs` (9), `stage6-review-lifecycle.test.mjs` (4),
`stage6-review-input.test.mjs` (3), `stage6-review-video.test.mjs` (10).
[review-focused.tap](review-focused.tap): **26 pass, 0 fail, 0 skip**.
Production edits are only `src/belal.js`, `src/rand-call-cutscene.js`, `src/stage6-lifecycle.js`.
No new source modules, audit exceptions, minification, comment removal, assets or difficulty tuning.

Final validation:

- `node --test tests/*.test.mjs`: **1325 tests, 1323 pass, 0 fail, 2 existing skips**.
  [review-suite.tap](review-suite.tap) includes Stage 3, 4 and 5 campaigns **9/9 each**, plus Stage 5 no-power seed 1.
- Stage 6 **9/9 without Rand, 9/9 with Rand, 9/9 at 250 ms lag**. Paired boss-time ratios
  **0.708–1.009** (rounded test diagnostics); all unrounded values pass 0.70–1.02.
  [review-campaign.tap](review-campaign.tap). Unchanged Stage 6 no-power and 60 s wall-pin checks also pass.
- `node tools/audit-stage1.mjs`: exit **0**, pre-fight **24,904,870 / 25,000,000 bytes**;
  Stage 6 source **106,473 / 196,608 bytes**, with all file caps passing.
  [review-audit.json](review-audit.json). Every edited source remains outside pre-fight inventory.
- `node tests/helpers/run-full-stage-simulations.mjs > /tmp/sim.json` exits **0**;
  the requested `jq del(.sourceSha256,.baseGitCommit)` payload diff is empty. All evidence source hashes
  still match, so **no hashes were refreshed** and the Stage 1 evidence file is unchanged.
- Protected diffs against `origin/rwb-w2` for Input/lib/index, against `origin/rwb-2-stage5` and HEAD
  for HUD, and against HEAD for existing tests/helpers are empty. `git diff --check` passes.
  The all-src Safari 15 forbidden syntax/API scan reports no violations. Removed the ignored Python
  bytecode cache produced by the suite; no `__pycache__` or `.pyc` remains.

Remaining limits: no new physical iPhone/iPad, Safari 15 audio-unlock, controller-hardware or rendering
acceptance run; the video/gesture/race evidence is deterministic DOM plus production gameplay logic.
Rand media/voice assets remain absent as in cycle 1. The literal no-`placeholder`-anywhere-in-src instruction
conflicts with required byte-identical HUD: that existing identifier and earlier Stage 4/5 property/comments
remain in their unchanged files, as documented in cycle 1. No edited/new Stage 6 source contains the string.

## Final hardening cycle (Codex Sol 6.1)

Started at `ccea76b` on `rwb-2-stage6`; reviewed `198b3e1..HEAD`, the two preceding cycles,
`CONTRACT.md`, and `ART.md` sections 4 and 6. Stage 6 still requires `?s6=1`.
Only reproduced bugs in the five requested areas were fixed. No combat constants, hit/hurt boxes,
controls, HUD, touch layout, painted outputs, voice/music files or generated paint manifest changed.
No commits, stashes, pushes, merges or other-branch changes.

All defects had red regressions in **new** `tests/stage6-final-*.test.mjs` files before production edits.
Existing tests/helpers remain unchanged. Red evidence:
[paint](final-reproductions-paint.tap) (4 fail / 3 pass),
[audio](final-reproductions-audio.tap) (7 fail / 1 pass),
[alignment](final-reproductions-alignment.tap) (10 fail / 1 pass), and
[outgoing crossfade](final-reproductions-crossfade.tap) (1 fail / 8 pass).
The audio red run's final failure is the immediate-stop ordering defect, not a duplicate-loop failure;
the duplicate-loop assertions preceding it passed. The separate crossfade regression was added after
that first immediate-stop fix, then reproduced the remaining outgoing-source leak before its fix.

| Scope / suspicion | Verdict, reproduction and final behavior | Fix / files |
|---|---|---|
| 1. A failed interior plate never gets a fallback texture | **REAL.** Cold all-file failure and an isolated `bg6mid3.webp` 404 left `bg6mid3` / `bg6mid4` absent. `cold all-file failures create code canvases for every painted key including interior plates` failed at `bg6mid3 missing after fallback`. Native [before](final-browser-before.json) / [after](final-browser.json) agree. All non-story painted keys now exist as canvases under all-file 404s; story keys are intentionally freed at start. | `src/stage6-art.js`: add both canvases to painter and canvas inventory. `tests/stage6-final-paint.test.mjs`. |
| 1. Atlas JSON vs WebP failure, optional-key cleanup, resident crate or missing texture after ordinary load failure | **NOT REAL beyond the two missing interior canvases.** New `atlas image/json failure falls back and cleans optional keys on shutdown` tests pass. Cold native contexts with one failure, all failures, atlas JSON 404 and atlas WebP 404 start successfully, with zero optional keys, missing non-story keys, page errors or missing-texture warnings. No change to `queueStage6Painted`, `isPainted`, `CRATE6` or generated `stage6-painted.js`. | `final-browser.json`, `tests/stage6-final-paint.test.mjs`; existing `stage6-painted-art.test.mjs` unchanged. |
| 1. Stage 5→6 double-loads the shared crate; 6→1–5 evicts needed keys or leaves Stage 6 pages resident; restart/continue reloads them | **NOT REAL.** Native 5→6→1–6 probes preserve crate object identity on 5→6 and destinations 2–6, make exactly one crate request total, remove it for Stage 1, and leave zero Stage 6 keys outside the destination inventory. Every destination's non-story texture inventory is complete; no missing-texture warnings or page errors. Restart 6 leaves optional keys empty. Continue does not preload/release textures. | [final-transitions.json](final-transitions.json), existing texture-page/release tests. No release-list changes. |
| 2. Voice manifest ids/files or Stage 6 music entries disagree | **NOT REAL.** `Stage 6 voice ids and music loop bounds match the shipped manifest and files` passes: all 25 ids equal `STAGE6_VOICES` and `VOICE_FILES`, are unique, and have MP3s. Both music files exist, loop bounds are valid, and native WebAudio starts them as looping buffers. | `tests/stage6-final-audio.test.mjs`, existing registry tests; no manifest/music-entry edits. |
| 2. Speech survives Riley death/continue; fight music survives quit/restart/disposal or Rand video | **REAL.** New death/continue/dispose pending-decode tests and active-speech/respawn test failed. Rand's `gainMul` property did not reach the backend: the native [before](final-audio-browser-before.json) kept a loop and voice playing through death and the video, and loops after shutdown. [After](final-audio-browser.json): death/video/quit have zero active loops and voices, respawn/continue/abort restore exactly one fight loop. Scene shutdown already canceled speech; the direct-kit-disposal regression additionally pins ownership without depending on that shutdown handler. | New `src/stage6-audio.js` cancels scene audio and silences the real backend. `stage6-lifecycle.js` uses it for death, continue and hook disposal, resuming fight music after respawn. `rand-call-cutscene.js` uses it with the cutscene state so return resumes the old position rather than restarting the boss intro. Audit adds the new module to `STAGE6_SRC`. |
| 2. First captured gesture cannot unlock a context created by pre-unlock speech | **REAL.** `first captured gesture unlocks a suspended context with a voice queued before any gameplay press` failed: unlocked remained false and the context stayed suspended. The capture listener now calls `unlock()` when a context already exists or the game is already unlocked. An untouched game still creates no context on an unrelated gesture, preserving the existing audio lifecycle contract. Subsequent touch gestures recover suspension. | `src/audio.js`, `tests/stage6-final-audio.test.mjs`; all existing audio lifecycle tests unchanged and green. Deterministic context evidence, not physical iOS acceptance. |
| 2. Immediate stop or unfinished crossfade leaves music sources behind | **REAL.** `Stage 6 restarts during a pending music decode cannot create duplicate loops` reproduced its final immediate-stop assertion: the old current-track check prevented stopping. The subsequent `immediate Stage 6 music teardown also cancels the outgoing loop in an unfinished crossfade` reproduced one surviving outgoing source. Native quit while two loops are active now leaves zero. | `src/audio.js` selects the new current track before stopping the old one; immediate silence also stops every outgoing track. No fade durations changed for normal transitions. |
| 2. Restart creates duplicate loops; stale decoded speech restarts after cancellation | **NOT REAL beyond exit cancellation above.** Both restart-before-decode and restart-after-decode assertions have exactly one live loop. Cancellation invalidates voice requests, and every death/continue/disposal pending decode remains stopped. Existing hidden/interrupted-context, scene/video exit-order and terminal-disposal tests pass. | New audio tests plus unchanged audio and Rand lifecycle suites. |
| 3. Gray Man glint and Be'lal flurry streak align with painted weapons | **REAL offset defects.** The Gray Man glint was at `(38.64, -107.64)` relative to his feet, about 60 px behind / 38 px below the blade tip. It is now `(100, -146)`. Be'lal's thrust streak was at `(±40, -70)` near the shins while the painted blade was near `y -184`; it now follows the blade/raised hand for the painted poses. Mirrored atlas-trim regressions failed before both fixes. [Native before](final-alignment-before.jpg) / [after](final-alignment.jpg), with [frame registration](final-alignment.json), show the correction. | `src/grayman.js`, `src/belal.js` visual sync offsets only; `tests/stage6-final-alignment.test.mjs`. Code-art offsets remain unchanged. |
| 3. Painted scaling/trim changes reach, hit/hurt boxes, feet or shadows for Be'lal, Gray Man, Fadelt, Rand, Defenders, hatch and Callandor | **NOT REAL beyond the two visual offsets.** All shipped character atlas `meta.drawScale` values are 1 and match `s6Scale`; native actors use untrimmed `sourceSize`, origin `(0.5, 0.96)`, feet at their world point and shadows at `y + 2`. Combat uses explicit existing distances and `def.shadowW`, not packed frame width. Rand/Defenders/hatch/Callandor use the painted scales, with fallback scales preserved; those decorative props have no combat hitbox. Existing painted-art, boss, Gray Man, Fadelt, Rand and wall-pin tests pass. | No scale, origin, combat, reach or shadow changes. Existing tests plus new alignment tests and native registration probe. |
| 4. Mixed painted/code plates rescale a painted exterior file as a code fallback | **REAL.** A single interior-plate 404 created 0.4-parallax tiles using painted `bg6mid` / `bg6mid2` files at 560×150. `one failed interior plate uses code tiles rather than rescaling resident painted exterior plates` failed. The tiles now select an actual failed-zone canvas (`bg6mid3` in this probe), retain flat lighting, and dispose with the view. | `src/stage6-view.js` picks the corresponding missing-zone key. `tests/stage6-final-paint.test.mjs`, native one-file fault probe. |
| 4. Plate overlaps, feathers/world ends/camera clamps or floor seam strips introduce gaps, double seams, inconsistent lighting or off-world floors | **NOT REAL.** `clamped camera never exposes world plate ends; floor seams are contiguous lit strips with one left-floor sample per pixel` checks every integer camera position 0–3920, exact 96 px neighbour overlap, and outer ends beyond the legal viewport. Painted base floors end at the world bound. Each seam has 16 adjoining 10 px strips across 160 px, unique left-floor sampling at `x - x0`, descending nonzero alpha, one seam per boundary and the same flat lighting as the base. Code floors have no seam strips; all/mixed asset-failure cases build cleanly. | Existing painted-floor/seam tests unchanged; new paint boundary test. No `plateRect`, `floorSeam`, `SEAM6`, floor geometry, feather, camera or lighting changes. |
| 5. Callandor reverts after Be'lal's body retires; failed painted Callandor never flares | **REAL.** Both `Callandor painted/code fallback flares through Be'lal retirement and resets in a fresh view` regressions failed. The painted key reverted to frame 0 after `enemies` emptied despite the scene retaining its phase-3 boss; the fallback never left frame 0. | `src/stage6-view.js` uses the retained scene boss phase and sets the frame for both painted and code textures. Painted NORMAL / code ADD and their alpha formulas remain unchanged. |
| 5. Restart, Rand strike freeze or blend mode breaks the phase-3 swap | **NOT REAL beyond the retirement/fallback cases.** Fresh views start at frame 0, phase 1 resets it, and non-boss zones hide it. Existing whole-frame/Rand-clock freeze tests pass; the frozen boss phase does not change during a strike. Painted NORMAL and code ADD are pinned in the new test and existing painted-art test. | No freeze, blend, pulse or scale changes. |

### Validation

- Full suite (Codex run): **1367 tests, 1365 pass, 0 fail, 2 existing skips** (Stage 4 STT and
  optional ESM Playwright viewport test). Twenty-seven new regressions/assertion tests across three new files.
  Focused Stage 6 run: **123 pass, 0 fail, 0 skip**.
- [final-campaign.tap](final-campaign.tap): Stage 3 / 4 / 5 **9/9 each**; Stage 6 **9/9 without Rand,
  9/9 with Rand, 9/9 at 250 ms lag**. Paired rounded Rand/no-Rand boss ratios **0.708–1.009**;
  all unrounded values pass the existing 0.70–1.02 assertions. The complete final suite repeats these campaigns.
- `node tools/audit-stage1.mjs` exits **0**. Pre-fight
  **24,905,039 < 25,000,000 bytes**; Stage 6 source **118,791 / 196,608 bytes**, all per-file caps pass.
  The small shared audio fix adds 169 pre-fight bytes; new Stage 6 audio ownership stays outside that path.
- `node tests/helpers/run-full-stage-simulations.mjs > /tmp/sim.json` exits **0**, and
  `diff <(jq 'del(.sourceSha256,.baseGitCommit)' /tmp/sim.json)
  <(jq 'del(.sourceSha256,.baseGitCommit)' docs/stage1/evidence/full-stage-simulation.json)` prints nothing.
  **Only the `src/audio.js` source hash was refreshed**, matching the previous cycle's hash-only method.
  The gameplay payload and recorded base commit were retained.
- Protected diffs are empty against `origin/rwb-w2` for Input/lib/index, and against
  `origin/rwb-2-stage5` and HEAD for HUD. Existing tests/helpers and assets/art-in have no working-tree edits.
  `git diff --check` passes; all-src Safari 15 forbidden syntax/API test passes.
  Test-generated `tools/music/__pycache__` was removed; no `__pycache__` / `.pyc` remains.
- Three **new** browser probes under `tools/stage6/final-*.mjs` record cold 404s, texture transitions,
  native WebAudio source start/stop, and trimmed-frame visual registration. They use the actual pinned Phaser
  and a static server for this worktree, Chromium/SwiftShader, 1280×720 at scale 1. Baseline audio/actor
  source comes from read-only `git show HEAD:src/...`, not asset edits or a different checkout. Production
  findings are also pinned by dependency-free Node regressions; the new probes use global Playwright.

### Ownership and remaining limits

This pass edits production `audio.js`, `stage6-audio.js` (new), `stage6-lifecycle.js`, `rand-call-cutscene.js`,
`stage6-art.js`, `stage6-view.js`, `grayman.js`, `belal.js`, and the audit's module list. It adds three new
`stage6-final-*.test.mjs` files, three new browser tools and final evidence, appends this section, and refreshes
one Stage 1 evidence hash. **This pass did not edit** `tools/stage6/browser-hardening.mjs`,
`tools/stage6/art-shots.mjs`, assets or art-in. Concurrent edits to `browser-hardening.mjs` and its JSON
appeared while this pass was running and were left untouched.

Physical iPhone/iPad Safari 15 unlock, native hardware input, listening acceptance and retina renderer
performance remain untested. The browser/context evidence proves graph ownership and deterministic recovery,
not physical-device sound acceptance. Atlas drawScale values other than the shipped 1 were not exercised.
No painted art processing output or bitmap budget changed.

The inherited literal `placeholder` occurrences in the protected HUD and unrelated Stage 4/5 source remain,
as documented in both preceding cycles: deleting them would violate protected bytes and/or this cycle's
real-bugs-only scope. No edited/new Stage 6 source contains that string, and controls/HUD are byte-identical.
