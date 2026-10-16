# Animation port plan: why the Waygate bonus feels smoother, and how to bring it into the stages

Branch analysed: `rwb-bonus-waygate` @ `9f53302`. This doc is the work order for a Grok 4.7 cloud build agent.
Jason's feedback on the bonus: "the overall animation and movement is smoother... Riley's kicks and stuff look a lot
better, as does his walk and run." (He also flagged the empty background and missing sound. Another agent is fixing those, so this plan leaves them alone.)

## 1. Summary of findings

1. **The art is the same.** `bonus-waygate/assets/atlases/{riley-0,riley-1,grunt-0}.webp` and the inlined data URLs in
   `atlas-inline.js` are byte-for-byte the main game's `assets/chars/*.webp` (sha256 prefixes `9b7cd5b6…`, `b3cb6ca8…`,
   `47ef1a7b…` match). All 57 Riley frame rects in `animation-data.js` match `assets/chars/riley-0.json`. Every anim the bonus uses
   has the same frame count and holds as `assets/chars/riley.anims.json`. Examples: idle 6 frames, 740 ms. Walk 8×95 ms.
   combo1 `[50,50,50,110,70,60]`. combo2 `[50,60,130,80,60,70]`. combo3 8 frames, 670 ms. airkick `[50,60,240,120,70]`.
   hurt 3 frames, 340 ms. knockdown 4 frames, 1050 ms. Both games build the anims the same way: `game.js:193` and `src/assets.js:30`.
   **So no art port is needed.** Riley is on-model by construction because he is the same pixels: sleeveless black long coat, glasses, dark hair.
   The bonus actually uses fewer frames. It has no `riley_run`, and its run plays the walk cycle (`game.js:541`). It also has no crouch, apex,
   land, back or runkick frames, and never uses page `riley-1`.
2. All of the "smoother" feel comes from **how the same frames are presented**: where the sprite pivots, how hit-freeze
   treats animation, how much the screen jitters, sprite scale relative to speed and to the Trollocs, lighting, and the camera.
3. The biggest single defect is the **pivot**. In the art, Riley's body centre sits at about x = 404–413 of the 816-px source frame,
   which is 0.50 of the width. Measured from the trimmed `spriteSourceSize` in `assets/chars/riley-0.json`, the idle/walk centres are
   407, 404, 404, 410… and 409, 402, 400, 411…. Main anchors him at `anchorX: 0.45` (x = 367; `src/riley.js:6` → `src/fighter.js:11`).
   Phaser 4.2.1 mirrors a flipped sprite around its origin: `applyITRS(x, y, rot, scaleX * -1)` followed by
   `translate(-w*originX)` in `lib/phaser.min.js`. So whenever he turns, his body jumps 2 × 41 × 0.682 ≈ **56 world px**.
   That is 4.4% of the screen width, or about 112 physical px at render scale 2. The bonus uses origin 0.5 (`game.js:315`), so he turns in place.
   Switching animations also pops him sideways, because the centres vary between anims: run ≈ 0.47, jump_crouch 0.45, land 0.46, jump_fall 0.50.
   The fixed anchor turns those differences into a 19 px shift between walk and run and up to 29 px of sideways wobble across one jump.
   Grunts have the same problem: anchor 0.55 against a body centre of ≈ 0.53 gives a ≈ 25 px pop when they turn.
4. **Hit-freeze stops every animation in main.** In main, a landed hit sets `this.anims.globalTimeScale = 0` (`src/stage1.js:646-650`)
   for `HITSTOP` light 4, medium 6, heavy 9 or finisher 14 frames (`src/config.js:9`, i.e. 67–233 ms). Heavy hits and finishers then add
   slow motion at 0.3× for 0.1 s or 0.26 s (`src/fx.js:46`, `src/stage1.js:652`). A connected 3-kick string spends about 0.6 s frozen or crawling.
   The bonus freezes logic for only 64–78 ms (`game.js:412-416`, `714`) and leaves `anims` running, so the kick frames play at their
   authored timing. This is the main reason "the kicks look better". **It cannot be ported under the current guardrails**
   (see §4, Pass 3), because in main the animation clock is game logic: the active frames come from `fi`.
5. **Screen jitter.** Main adds trauma on every hit, landing and roar (`src/fx.js:41,49`; `SHAKE` in `src/config.js:10`).
   It then applies fresh white noise every frame, up to ±18×±12 px (`src/fx.js:63`). Hit enemies also shudder by a random ±4 px each frame
   (`src/fighter.js:33`). The bonus shakes only on heavy hits (95 ms, about 7 px; `game.js:715`) and when Riley is hurt (`game.js:822`).
6. **Scale and readability.** Bonus Riley is drawn at 0.56 × 544 px = 56% of a 540 px-high view (`game.js:315`). Main Riley is
   0.58/0.85 = 0.682 × 544 = 52% of the 720 px view. Bonus Trollocs are 44% of the view height (`game.js:752`, scale 0.39).
   Main Trollocs are 64% (`src/enemies.js:7`, scale 0.56/0.75). In main, Riley is visually smaller than the Trollocs, and his
   kicks disappear into their bodies. On top of that, main lights Riley from behind: `heroLight` sits at `R.x - 90` whatever his facing
   (`src/stage1.js:684`), so a kick to the right reaches out of the light. The impact flash (`src/fx.js:44`, 1.5× additive glow)
   also covers the foot for the whole freeze.
7. **Movement versus body size.** Both games walk at 205 and run at 390 world px/s with a 760 ms walk cycle. Measured in the art's own pixels,
   bonus Riley covers 205 / 0.56 = 366 source px/s and main covers 205 / 0.682 = 300. That is about 18% less ground per step (equivalently, the bonus covers 22% more)
   for the same leg motion, so main is more likely to show "treadmill" feet. Main also restarts the walk or run cycle from frame 0 on every
   walk↔run change (`src/riley.js:71`).
8. **Camera.** The bonus uses `startFollow(hero, roundPx=true, 0.085, 0.06)` with a 360 px deadzone (`game.js:71-72`), so the background holds still while
   Riley moves. Main lerps at `dt*5` with no deadzone, plus a `facing*50` look-ahead that swings the view 100 px on every turn,
   and uses a fractional scroll (`src/stage1.js:689-698`, `108`). Fights happen in 1280-px zones (`src/stage1.js:25-29`), where the camera is pinned,
   so this only matters while walking between fights. It also drives `bounds`, which makes it a simulation-affecting change.
9. **Not causes:** both target 60 fps (`main.js:21`, `game.js:1004`). Both use variable `dt` (clamped at 50 ms in main, 40 ms in the bonus) and fractional positions.
   Both use linear filtering (`pixelArt` is off). Neither has acceleration curves; both move at a constant speed off digital ±1 input from the same `src/input.js`.
   The Phaser version differs (bonus 3.90 from a CDN, main 4.2.1 local), but that has no bearing on animation timing.
   Main has lighting, bloom and particles, so it may also drop frames on Jason's device. This is unmeasured; check it with the **H** perf panel.

## 2. Ranked causes

| # | Cause | Weight | Main (file:line) | Bonus (file:line) | Port class |
|---|---|---|---|---|---|
| 1 | Off-centre pivot: ~56 px pop on every turn, 19–29 px pops on anim switches | High | `riley.js:6`, `fighter.js:11,23` | `game.js:315` | Render-only. **Pass 1** |
| 2 | Hit-freeze/slow-mo stops all anims, up to ~0.6 s per string | High | `stage1.js:646-652`, `config.js:9`, `fx.js:40,46` | `game.js:412-416,714` | Changes sim. **Pass 3, Jason decides** |
| 3 | White-noise trauma shake on every hit and landing, plus ±4 px shudder | Med-High | `fx.js:41,49,55,63`, `fighter.js:33` | `game.js:715,822` | Render-only. **Pass 1** |
| 4 | Kick readability: light behind Riley, impact flash covers the foot | Medium | `stage1.js:684`, `fx.js:44-45` | unlit, thin slash arc `game.js:698-711` | Render-only. **Pass 1** |
| 5 | Walk↔run cycle restarts; cadence vs ground speed | Medium | `riley.js:69-71` | single walk loop, `game.js:539-543` | Render-only. **Pass 1** |
| 6 | Trolloc size dwarfs Riley (64% vs 52% of view height) | Medium | `enemies.js:7` | `game.js:315,752` | Render-only, but art direction. **Jason decides** |
| 7 | Camera: facing look-ahead swing, no deadzone, fractional scroll | Low-Med | `stage1.js:689-698` | `game.js:71-72` | Changes sim (drives `bounds`). **Pass 3** |
| 8 | Jump: 70 ms squat + 90 ms land hold, faster arc (vz 920, g 2600 → 0.71 s) | Low | `riley.js:36,39,79`, `fighter.js:28` | no squat, vz 730, g 1500 → 0.97 s (`logic.js:10-11`) | Pivot part is Pass 1. Arc changes sim (Pass 3) |
| 9 | Possible frame drops from lit, bloomed rendering | Unknown | `main.js:31-75` | unlit Phaser 3 | Measure only |

(b) Art: **nothing to port.** Same files. No art approval is needed for Pass 1, which changes no pixels. Cause 6 is a scale decision, not new art.

## 3. Determinism rules every task must obey

- `tests/helpers/stage1-simulation.mjs` runs the **production** `Stage1.update`, camera, Riley, enemies, FX timing and
  animation clock, with `Math.random` replaced by a seeded LCG (`withSeed`). So:
  - The number of `Math.random()` calls on the update path must stay exactly the same. `FX.shakeOffset` calls it twice per frame, always,
    and `Fighter.sync` calls it once whenever `shudder` is non-zero. Keep both calls even if you scale the result down to 0.
  - Do not change what `fi`, `done`, `st` or `anims.globalTimeScale` return in any state that reads them (attacks, casts, hurt, down, getup, throw, airkick).
  - `camX`, `bounds`, `camMax` and `fx.hitstop`/`fx.slowmo` are logic. Do not touch them in Pass 1.
- The sim stubs `setOrigin`, `setScale`, `setTint`, particles, lights and `setScroll`. Changes limited to those calls, and to light x/y, are sim-neutral.
- The walk/run anim frame index is never read by logic: `Riley.free()` uses only `st`. Every `setState` restarts the anim and resets
  `timeScale` to 1 (`fighter.js:17,22`). So walk/run timeScale and phase are sim-neutral.

## 4. Task list

### Pass 1: render-only feel port (one Grok run)

**T0. Capture baselines before editing anything.**
- `node tests/helpers/run-full-stage-simulations.mjs > /tmp/s1-before.json`
- Stage 2 fingerprint: write a scratch script **outside the repo**, `/tmp/s2fp.mjs`. It should import `stage1Simulation`, `withSeed` and `FULL_STAGE_SEEDS`
  from `tests/helpers/stage1-simulation.mjs`, and for each seed run `stage1Simulation({ mode: '1', stage: 2 })` until `ended` or `gameOver`
  (at most 36000 steps). It prints `JSON.stringify({ seed, ...h.summary(), kit: s.kit.stats })`. Save the output to `/tmp/s2-before.txt`.
- `node --test tests/*.test.mjs` must pass. Record the pass count.

**T1. Per-animation pivot (cause 1).**
- New file `src/anim-pivot.js` exporting `ANIM_PIVOT_X`, a frozen map from anim key to originX.
  Generate it with a new script, `tools/gen-anim-pivots.mjs`. The script reads `assets/chars/<k>.anims.json` and `<page>.json`. For each anim:
  if it loops, take the median over its frames of `(spriteSourceSize.x + spriteSourceSize.w/2) / sourceSize.w`; for a one-shot, use frame 0.
  Round to 0.005. Emit entries for `riley_*` only in T1. Expected values (rounded): idle 0.500, walk 0.495,
  run 0.465, combo1 0.490, combo2 0.495, combo3 0.500, back 0.515, runkick 0.435, airkick 0.480, jump_crouch 0.450,
  jump_rise 0.475, jump_apex 0.490, jump_fall 0.505, land 0.455, hurt 0.540, cast/balefire/knockdown/getup/grab/hold/knee/throw/lightning as generated.
  The script also accepts a small `OVERRIDES` object, empty at first, for anims where a flared coat or an extended arm skews the trim box.
- `src/fighter.js` `play()`: after `this.sprite.play(key)`, add
  `const px = ANIM_PIVOT_X[key]; if (this.sprite.setOrigin) this.sprite.setOrigin(px ?? this.def.anchorX, this.meta.baseline / this.meta.canvas[1]);`
  Keep this to a single hunk, so it merges cleanly with Stage 3, and a missing key falls back to the old `anchorX`.
  Don't touch `RILEY_DEF`, `TYPES` or `sync()`.
- Before → after: Riley's body offset from the logical x goes from +28 px facing right / −28 px facing left to about 0 for every anim.
  His shadow (`fighter.js:38`) now sits under his body instead of 28 px behind it.
- Acceptance: a new test, `tests/anim-pivot.test.mjs`, checks that every `riley_*` anim has an entry in [0.40, 0.60] and that the table
  matches the generator's output. All existing tests pass unedited.

**T1b (same pass, optional and listed separately in the PR).** Extend the table to `grunt_*`, `spear_*`, `hound_*` and `chief_*`.
Grunt walk ≈ 0.530 replaces anchor 0.55. Don't add Stage 2 Whitecloaks until Jason has seen T1. Stage 3 characters fall back to `anchorX` automatically.

**T2. Calm the shake (cause 3).** Edit `src/fx.js` only.
- `update(dt)`: store `this._dt = dt`.
- `shakeOffset()`: still call `Math.random()` exactly twice. Amplitude goes from `18 * sh` / `12 * sh` to **`10 * sh` / `5 * sh`**.
  Low-pass the noise: `this._sx += (rx - this._sx) * k`, with `k = 1 - Math.exp(-(this._dt || 1/60) * 40)`, so it reads the same at 30, 60 and 120 Hz. Return `[this._sx, this._sy]`.
- `src/fighter.js:33`: shudder amplitude goes from `* 4` to `* 2`. Keep the `Math.random()` call and the `this.shudder ?` condition.
- Leave the `SHAKE` and `HITSTOP` constants as they are, because `trauma` feeds the shake only.
- Acceptance: the moon and fire-light tests pass, since they stub `shakeOffset`. The golden simulation is identical.

**T3. Light the kick (cause 4).** Render-only.
- `src/stage1.js:684`: `heroLight.x = R.x - 90` becomes `R.x + R.facing * 30`, eased:
  `this.heroLightX += (R.x + R.facing * 30 - this.heroLightX) * (1 - Math.exp(-dt * 12))`. Initialise it in `create()` next to `heroLight`.
  y stays the same.
- `src/fx.js:44-45` impact flash: scale goes from 0.7/1.0/1.5 to **0.55/0.8/1.15**, starting alpha from 0.85 to **0.7**, and the flash holds
  `0.08 + HITSTOP/60` → `0.06 + HITSTOP/120` seconds. Particle counts don't change.
- Acceptance: the bloom, perf and lighting tests pass. Spark counts don't change. The golden simulation is identical.

**T4. Continuous locomotion cycle (cause 5).** In `src/riley.js`, inside `free()` only.
- Replace `if (this.state !== st) this.setState(st, st);` with a helper, `this.setLoco(st)`. When switching between `walk` and `run`,
  it keeps the stride phase: `const ph = (this.fi + 0.5) / 8; this.setState(st, st);` then
  `this.sprite.anims.setCurrentFrame?.(this.sprite.anims.currentAnim.frames[Math.floor(ph * 8) % 8])`. From idle it is unchanged.
- Cadence: first measure the foot travel. Use Python/PIL in the cloud sandbox, not committed. In each walk/run frame, find the lowest opaque pixels
  of the planted boot, then compute ground speed = boot travel × 0.682 / hold. Only if the measured speed differs from 205 (walk) or 390 (run) by
  more than 12%, pass `ts = 205 / measured` (or `390 / measured`) through `setState(st, st, ts)`, clamped to [0.85, 1.20].
  Put the numbers in the PR. If the gap is 12% or less, change nothing.
- Acceptance: the golden simulation is identical, because walk/run `fi` is never read by logic. Rapidly toggling run (Shift, double-tap, or the edge of the
  touch stick) shows no leg reset.

**T5. Verify and document.**
- Regenerate the golden: `node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json`.
  Then compare it with `/tmp/s1-before.json` using `jq 'del(.sourceSha256,.baseGitCommit)'` on both files. The diff **must be empty**.
- Re-run `/tmp/s2fp.mjs`. Its output must be byte-identical to `/tmp/s2-before.txt`.
- `node --test tests/*.test.mjs` must give the same pass count plus the new tests, with 0 failures and 0 skips.
- Browser check at 30 Hz, 60 Hz and 120 Hz. There is no fps query flag, so get 30 Hz from DevTools CPU throttling ×4 or a 30 Hz display mode, and use a ProMotion iPad or a 120 Hz monitor for 120 Hz. Also check iPad Safari with `?rs=1` and with the default. Steps are in §6.

### Pass 2: only after Jason has played Pass 1

- T1b, if it was deferred. **Trolloc scale (cause 6):** try `grunt`/`spear`/`hound` scale 0.56 → 0.48 behind `?tscale=1`
  first. That is render-only, but it changes how close a Trolloc looks when it is hit, so **Jason has to approve it by eye** before it becomes the default.

### Pass 3: NOT authorized by the current guardrails (each item changes the Stage 1 golden simulation)

Listed so Jason can choose. Each one needs his explicit sign-off and a regenerated, reviewed golden.
- **Animated hit-freeze (cause 2).** Keep logic frozen for the hitstop, but don't freeze the animation, using the bonus model. That needs a separate
  visual-only anim clock, or else accepting the timing change. Smaller alternative: `HITSTOP` from 4/6/9/14 to **3/4/6/9**, finisher `slowmo` from
  0.26 to **0.12**, heavy from 0.1 to **0**.
- **Camera (cause 7):** drop the `R.facing * 50` look-ahead, add a ±120 px deadzone around `VW*0.42`, and use the frame-rate-independent lerp `1 - exp(-dt*6)`.
- **Jump arc (cause 8):** remove the 70 ms squat and the 90 ms land hold. Changing vz or gravity changes reach, so it is a combat change.

## 5. Guardrails

1. `src/input.js` is untouched. So are all key, pad and touch mappings, `inp.take` windows and buffers.
2. No combat number changes: damage, hitboxes (`ATK`, `TYPES.atk`), `x0/x1/z0/z1`, speeds 205/390/125, jump 920/2600,
   `HITSTOP`, slow-mo, token caps, AI and HP all stay the same in Pass 1 and Pass 2.
3. The Stage 1 golden (`docs/stage1/evidence/full-stage-simulation.json`) is identical except for `sourceSha256` and `baseGitCommit`.
   The reason it can stay identical: Pass 1 only changes `setOrigin`, shake magnitude and smoothing (with the same RNG call count), light position,
   flash scale, alpha and duration, and the walk/run anim phase/timeScale. None of these feeds `fi`/`done` in a state that reads them,
   `camX`/`bounds`, or any RNG draw. T5 proves it with a diff.
4. The Stage 2 fingerprint (`/tmp/s2fp.mjs` output) stays byte-identical.
5. No existing test is edited, loosened or skipped. New test files are fine.
6. It must work at 30, 60 and 120 Hz: every new smoothing uses `1 - Math.exp(-dt*k)`, never a fixed per-frame factor.
   It must work on iPad Safari: no new textures, no new filters, no per-frame allocation in `play()`, `sync()` or `shakeOffset()`.
7. Merging with Stage 3: the new code lives in the new files `src/anim-pivot.js` and `tools/gen-anim-pivots.mjs`. Edits to `fighter.js`, `riley.js` and
   `fx.js` are one small hunk each. Anim keys with no table entry fall back to `def.anchorX`. Don't rename or reorder anything.
   Stage 3's new anims only need the generator re-run.
8. Don't change anything in `bonus-waygate/`. It stays standalone.
9. Riley stays 16 and on-model. No art files change in any pass.

## 6. How Jason can check by eye

Use the same device and browser for every check. Open Stage 1 with `?god=1`. Use `?skip=boss` for the arena.
1. **Turnaround:** stand still and tap left and right. Riley should spin in place, with no sideways hop. His shadow should stay under his boots.
2. **Walk to run:** walk, then hold Shift or double-tap. His legs should carry on mid-stride with no stutter, and his boots shouldn't skate.
3. **Jump:** jump in place a few times. He shouldn't drift sideways between crouch, rise, apex, fall and landing.
4. **Kick string:** do a three-hit combo on a Trolloc. The foot should be clearly lit and visible on contact (not hidden under a flash), and the screen should
   jolt rather than buzz. Hits should still feel just as heavy, because the freeze timing hasn't changed.
5. **Crowd:** fight 3 or more Trollocs. Grunts turning around shouldn't pop (only if T1b is in).
6. **Same game:** the hits it takes to kill each enemy, jump distances, controls, and Stage 2 (Baerlon) all feel exactly as before.
7. **iPad:** repeat steps 1 and 4 on the iPad. Press **H** for the perf panel (keyboard) and confirm frame time hasn't got worse than before.
8. Say whether the kicks now feel as good as the Waygate's. If not, that remaining gap is the hit-freeze (§4, Pass 3), and it's your call.
