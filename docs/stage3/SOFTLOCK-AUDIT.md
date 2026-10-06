# Stage 3 softlock / hang / state-leak audit

*Reviewer: Claude Opus 5.5, Oct 5 2026, head `a749402` (`docs-stage3-softlock-audit`). Read-only: no source, test or
tool file changed. I read the code and test names. I did not run the game or the suite. Line numbers are at `a749402`.*

**Summary.** I found one real softlock (SL-1). Stage 3 can start paused, and only a window focus event can unpause
it. The grab and Fade state machines are sound. Every state that waits on `done` uses a non-looping animation, and
holds have a timeout. Teardown runs synchronously. The other items are fairness gaps that are still open from the PR #20
review, plus small leaks. None of them strand the player.

## Findings

| ID | Sev | Where | Kind |
|---|---|---|---|
| SL-1 | **High** | `stage3-suspension.js:13` `installStage3Suspension`; `stage1.js:251-255` `onPress` | Softlock (paused, no in-game exit) |
| SL-2 | Med | `stage3-hazards.js:48-53, 79` `updateTiles` | Unavoidable hit on a held Riley (review m1, still open) |
| SL-3 | Med | `stage3-hazards.js:65, 79` `updateTiles` | Hit from a band with no tile drawn in it (review B2, still open) |
| SL-4 | Med | `darkfriends.js:25, 60-62`; `stage1.js:311` `grabBusy`; `riley.js:165` `leaveGrabbed` | Grab chain, grab out of hitstun (review B4, still open) |
| SL-5 | Low | `stage1.js:731`; `stage3-hazards.js:48`; `myrddraal.js:287` `FadeCopy.think` | World keeps running during game over |
| SL-6 | Low | `myrddraal.js:247-250` `tickFear` | Fear builds up during respawn i-frames |
| SL-7 | Low | `riley.js:51`; `stage1.js:387` `rileyDied` | Dead Riley stands up on the clear screen |
| SL-8 | Low | `riley.js:186, 199` | Stale `lastGrabber` after an interrupted escape |
| SL-9 | Low | `stages.js:53`; `stage1.js:128` `releaseStage` | `fadePortrait` texture never released (review m7, partly fixed) |

### SL-1 (High): Stage 3 can start paused until a window focus event
- **Code:** `installStage3Suspension` runs from `Stage3Kit.start()` (`stage3.js:130`), so on every Stage 3 start. It does
  `if (s.game.hasFocus === false) s.setPauseReason('window-blur', true)`. The bundled Phaser (`lib/phaser.min.js`) sets
  `this.hasFocus=!1` in the `Game` constructor. Only `onFocus`, which runs on the window `focus` event, sets it to true.
  At boot, Phaser calls `window.focus()`, but focusing a window that already has focus fires no event. So a player
  who never leaves the tab is likely to still have `hasFocus === false` when they press Start.
- **Trigger:** Load `?stage=3&s3=1`, or clear Stage 2 with `s3=1`, without blurring the window. Press Start. Then
  `startStage3` → `kit.start()` → `'window-blur'` pause, and then `startCutscene` → `'cutscene'`. The story clock is
  frozen (`tickCutscene` returns on any non-cutscene reason). In `onPress`, presses hit the cutscene branch, which only
  clears `'manual'`, then calls `inp.clear()` and returns. With `story=0`, the PAUSED card shows, and Start only
  toggles `'manual'`. The game recovers only if the player clicks outside the browser and back. The same hang follows
  a `blur` whose matching `focus` is lost, for example on an iPad app switch where only `visible` fires.
- **Why tests miss it:** `stage3-background-clock-hardening.test.mjs:20` hard-codes `s.game.hasFocus = true`.
  `stage3-memory.test.mjs:141` does the same. The default `stage3-harness.mjs` game has no `events`, so
  `installStage3Suspension` returns early (line 5) in every other Stage 3 test. No test starts Stage 3 with real
  Phaser defaults.
- **Fix direction:** Seed the initial state from `document.hasFocus?.() === false`, not `game.hasFocus`. Also clear
  `'window-blur'` on any gameplay press in `onPress`, before the cutscene/paused branches, because a press proves the
  window has focus. Then a lost `focus` event can't strand the player.

### SL-2 (Med): Tiles keep targeting a held Riley
- **Trigger:** Zone 2. A cutthroat grabs Riley (`R.grabbedBy` set). `updateTiles` still counts down `tileT` and calls
  `startTile`, which always marks `bandOf(R.y)`. Escaping takes about 1.2 s or more and the warning is 0.9 s. At strike, the
  `R.takeHit` filter (`riley.js:193`) lets through environment knockdowns (`team === undefined && down`), so the held
  Riley takes 9 damage and is knocked down. He couldn't move, so the warning gave him nothing to do.
- **Why tests miss it:** `stage3-hazards.test.mjs` "tiles hit enemies for 14 and break a cutthroat's hold" asserts
  this is the behaviour. No test checks that a held Riley can avoid it.
- **Fix:** Hold `tileT` while `R.grabbedBy` is set. Also skip the Riley hit for a tile whose warning began while he
  was held. Keep the hold-break for cases where he walked into the band first.

### SL-3 (Med): The second marked band has no visible tile
- **Trigger:** `startTile` pushes a second band when `Math.random() < 0.5`. `updateTiles` draws one `rooftiles` image
  at `k.bands[0]` (line 65), but the hit test at line 79 uses `k.bands.includes(...)`. If Riley steps from his band
  into the other marked band, he is hit by a tile that is drawn in a different band.
- **Why tests miss it:** `stage3-cycle2-review.test.mjs` "roof tile sweep stays on the marked band" only checks the
  sprite against `bands[0]`.
- **Fix:** Draw one image per marked band (same x, same frame) and destroy all of them on completion and in
  `clearHazards`. Or drop the optional second band.

### SL-4 (Med): Grab chains and grabs out of hitstun
- **Trigger:** In zone 1 wave 2 or zone 2 wave 2 (two cutthroats each), cutthroat A's hold ends in an escape. A goes
  to `shoved`, which `grabBusy` doesn't count. Riley's `escape` (about 0.57 s) blocks catches, but `leaveGrabbed` gives
  no i-frames. B can start its 0.45 s coil the moment Riley is idle. More serious: `GRAB_OK` includes `'hurt'`, so if
  a zealot or hound hit lands during B's coil, B catches a Riley who can't counter. That grab is unreadable.
- **Why tests miss it:** `stage3-cutthroat.test.mjs` "only one cutthroat lunges or holds at a time" covers
  simultaneous grabs, not back-to-back ones.
- **Fix:** Add a scene-wide `grabLockT` of about 2 s, set in `releaseHold` and read in `grabBusy`. Give about 0.3 s of
  `inv` on `leaveGrabbed('escape')`. Consider taking `'hurt'` out of `GRAB_OK`.

### SL-5 (Low): Stage 3 keeps running on the game-over screen
- **Trigger:** Riley loses his last life in zone 2 (or in phase 3). `gameOver` stops only `R.update`.
  `updateZones` still runs (`if (this.started)`) and `updateTiles` has no `gameOver` check, so tiles keep striking
  enemies for 14. A wave can die and the next one spawns, or the zone clears and unlocks while the continue prompt is up.
  `FadeCopy.think` lunges without checking `R.alive`, so copies keep lunging at the corpse. This doesn't lock the game,
  but the world state after Continue isn't the one Riley died in.
- **Fix:** Gate the `startTile` countdown and the zone/wave update on `!s.gameOver`. Add `R.alive` to the
  `FadeCopy.think` lunge condition, as `Myrddraal.think` already does.

### SL-6 (Low): Fear fills during respawn i-frames and shakes the frame they end
- **Trigger:** In phase 2 or 3 with the aura active, Riley respawns within 220 px (`inv = 2.5`, state `getup`). After
  `getup`, he is `idle`/`walk`, which isn't calm, so the meter fills while he is invulnerable. The shake is blocked
  only by `R.vulnerable`, so the meter sits at 1. If he stays in range, he is shaken on the first frame `inv <= 0`,
  with no fill time left. The arc is visible and he can walk out, so this is Low. Knockdown `getup` (inv 1.0) reaches
  only about 0.63.
- **Why tests miss it:** The `stage3-terminal-transition-review` respawn/continue cases check that there is "no fear
  immunity". They don't check the meter level when `inv` expires.
- **Fix:** Treat `R.inv > 0` as calm in `tickFear`, so the meter decays. Or clamp the meter below 1 while Riley isn't
  vulnerable.

### SL-7 (Low): A dead Riley gets up on the clear screen after 99 s
- **Trigger:** Riley takes a lethal hit, and the boss dies within 1.6 s, for example from a fireball already in
  flight. The `rileyDied` callback returns because `victoryPending` is set, so Riley never respawns. `R.update` still
  runs (`started && !gameOver`), and `down` exits after `st > 99` for a dead Riley (`riley.js:51`). He stands up with
  `alive === false` and can walk around the clear screen. This affects all stages.
- **Fix:** Leave a dead Riley `down` (`if (!this.alive) return`), or skip `R.update` once `victoryPending` is set.

### SL-8 (Low): `lastGrabber` survives an escape interrupted by a hit
- **Trigger:** A zealot hits Riley during `escape` before `done`. `takeHit` → `hurt`, and `lastGrabber` is only cleared
  in `escape` on `done`, in `down`, in `respawn` or on the next grab. The reference is harmless, because
  `escape()` isn't re-entered. But it can pin a destroyed cutthroat until the next hold.
- **Fix:** Clear `lastGrabber` in `takeHit`'s hurt branch, or whenever Riley leaves `escape`.

### SL-9 (Low): `fadePortrait` stays resident after leaving Stage 3
- **Trigger:** 3 → 1 or 3 → 2. `queueStage3` loads `fadePortrait`, but it isn't in `STAGE_TEXTURES[3]` or in the
  `['arrow','ribbon']` sweep at `stage1.js:128`. `bfc5c3a` fixed the arrow and ribbon part of review m7, but not this.
- **Fix:** Add `'fadePortrait'` to the leftover sweep. Adding it to `STAGE_TEXTURES[3]` changes registry data and
  needs Jason's OK.

## Checked and fine (don't re-open these)
- **Animation exits.** Every `done`-gated state uses a non-looping animation: cutthroat `lunge/grabthrow/shoved`, fade
  `intro/blinkout/blinkin/fear/split/stagger/defeated`, and `riley_escape` (`loop: false` in the
  `assets/stage3/chars/*.anims.json` files). The looping animations (`cutthroat_hold`, `riley_grabbed`) exit on
  ownership or `holdMax`, not on `done`.
- **Grabber leaves mid-grab.** Death, knockdown, tile, Loial, a thrown body, `gone`→`destroy`, victory and kit teardown
  all reach `releaseHold('break')` before the next update. A second grabber can't steal the hold (`startHold`
  guard), and `grabBusy` sees a same-frame lunge because updates run in order.
- **Grab while down, getup, airborne, holding, casting or in Balefire** is rejected by `catchResult` (state, `z` and
  `vulnerable` checks).
- **Fear and grabs.** No live cutthroat can reach the boss arena, because a zone clears only when every enemy is
  dead. So fear can overlap a grab only in tests. `tickFear` still skips a grabbed Riley, and `NO_FEAR` covers
  `grabbed/escape`.
- **Fade bounds and phases.** `poolSpot` clamps to the bounds ±70, `lungeTick` stops at ±60 and physics clamps. `sunk`
  can't be hit, so the boss can't die with a live pool. Phase changes during Riley's death wait on `R.alive` and
  `state !== 'down'`. A 1→3 phase skip would drop `pendingFear` and the sa'angreal. That needs at least 147 damage in
  one frame, and the largest single hit is Balefire on a stagger at 120, so it's unreachable today. `forceLungeT`
  survives Riley's death, but his 2.5 s respawn i-frames cover it.
- **Restarts.** There is no restart-from-pause path. `onPress` only toggles `'manual'`. Restarts come from title
  select, stage-clear `next`, or graphics recovery, and all go through `scene.restart`. Its `shutdown` handler retires
  the story, input, audio, kit and pause reasons. `scene.time` callbacks die with the scene, and `rileyDied` also
  checks `R !== this.riley`.

## Already covered (HARDENING.md and the review fixes)
- Exclusive hold ownership and synchronous release on death, down, respawn, continue and destroy:
  `stage3-grab-lifecycle`.
- Hold timing at 30/60/120 Hz, a pause during an escape, leaving grabs and boss abilities for each stage, and boss death
  in 8 states: `stage3-boundary-hardening`. Balefire and boss death in 7 states, and cast interruption ×
  knockdown/respawn/continue: `stage3-terminal-transition-review`.
- Fear fairness: `cast`/`hurt`/`balefire` are calm, brave is 1.2 s and duty is ≤ 25% (`stage3-fade`). Fear shake
  releases a held enemy (`stage3-fear-grab-hardening`). Brave and dispel clocks: `stage3-fear-clock-hardening`.
  Same-tick aura and dispel: `stage3-aura-dispel-race`. Nested pauses and restarts: `stage3-fear-lifecycle-hardening`.
- The split race and the punish latch: `stage3-split-race`, `stage3-punish-recovery`. The held-cutthroat knee:
  `stage3-held-knee-hardening`.
- Kit teardown (lights, emitters, vignette 0.35) and loader callbacks: `stage3-kit-cleanup`,
  `stage3-loader-cleanup`. Story retirement and the story freeze: `stage3-story-restart/pause-hardening`. Tile
  warning time: `stage3-tile-clock-hardening`.
- The music retry and restart fixes, and the watermark scope. The sun in the light budget:
  `stage3-light-budget-hardening`. Background clocks: `stage3-background-clock-hardening`. Voice and texture release
  on stage switch: `stage3-voice-release`, `stage3-memory`.

## Test ideas (deterministic, `withSeed`, `stage3Simulation`)
1. **`stage3-focus-start-hardening.test.mjs`**: "Stage 3 starts unpaused when Phaser has not reported focus".
   Setup: `s.game.events = new EventEmitter()`, `s.game.hasFocus = false`, `document.hasFocus = () => true`. Steps:
   `start()`, step 10 frames, press attack 6 times. Expected: no `'window-blur'` in `pauseReasons`, and the story
   reaches line 6, or with `story=0`, `s.paused === false`. Second case: emit `blur`, drop the `focus` event, press
   attack. Expected: the game unpauses.
2. **`stage3-tile-held-hardening.test.mjs`**: "a held Riley is never struck by a tile warned during the hold".
   Setup: zone 2 locked, wave 0, `tileT = 0.01`, `placeC(s, -46).startHold(R)`. Step 3 s with no mash. Expected:
   `stats.tileHits === 0` and Riley's hp loss is chips plus the throw only. Repeat at 30/60/120 Hz.
3. **`stage3-tile-band-sprite-hardening.test.mjs`**: "every marked band shows a tile at strike". Force
   `Math.random` so that two bands are marked. At `k.t = warn + dt`, expect a sprite whose y is inside each band in
   `k.bands`. After the sweep and after `clearHazards`, expect no live images.
4. **`stage3-grab-chain-hardening.test.mjs`**: "no second hold within 2 s of an escape, and none out of hurt".
   Setup: two cutthroats at 200 px, both `grabCool = 0`. Steps: A holds, 6 mashes escape it, then step 2 s with B in
   range. Expected: B doesn't enter `holding`, and Riley has `inv > 0` for 0.3 s after the escape. Second case: a
   zealot hit during B's coil, then expect `catchResult(R) === null`.
5. **`stage3-gameover-freeze-hardening.test.mjs`**: "the world holds still on the game-over screen". Zone 2 with
   `lives = 1`, then a lethal hit, then step 30 s. Expected: `stats.tiles`, `wave` and `zoneI` are unchanged. Phase-3
   variant: the copies' `state !== 'lunge'` after Riley is dead.
6. **`stage3-fear-respawn-hardening.test.mjs`**: "respawn i-frames don't fill fear". Phase 2 with `auraOn`, Riley
   respawns 100 px from the Fade and idles. Expected: `fear < 1` on the frame `inv` reaches 0, and the first shake
   comes no sooner than `fear.fill` after that.
7. **`stage3-victory-dead-riley.test.mjs`**: "a Riley who died just before victory stays down". Lethal hit, then the
   boss dies 0.5 s later, then step 120 s. Expected: `R.state === 'down'` and `alive === false`. Expected: an attack
   press after `clearShown` restarts with `{ stage: 1 }`.
8. **`stage3-escape-interrupt.test.mjs`**: a hit during `escape` frame 2 leaves `lastGrabber === null`.
9. **`stage3-memory.test.mjs`** (new case): after 3 → 1, `textures.exists('fadePortrait') === false`.

## Top 5 for the next Grok 4.7 builder pass
1. **SL-1:** seed focus from `document.hasFocus()`, and let any press clear `'window-blur'`. Add test 1. This is the
   only true softlock, and it can hit on the first Stage 3 start. Confirm once in real Chrome and iPad Safari.
2. **SL-2 and SL-3 together in `updateTiles`:** no tile warning during a hold, and one sprite per marked band. Tests
   2 and 3. `stage3-hazards.js` is at 8,169 / 8,192 bytes, so ask Jason about the cap first.
3. **SL-4:** a scene grab lock and escape i-frames. Test 4. This needs a design OK, because it makes zones 1 and 2
   easier to read but not easier to survive.
4. **SL-5:** freeze tiles, waves and copy lunges during game over. Test 5. These are small, safe gates.
5. **SL-6 and SL-7:** calm fear during `inv`, and keep a dead Riley down after victory. Tests 6 and 7. Bundle
   SL-8 and SL-9 into this pass, since each is a one-line fix.
