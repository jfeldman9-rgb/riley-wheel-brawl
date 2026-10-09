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
