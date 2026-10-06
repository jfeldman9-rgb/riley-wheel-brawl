# Stage 3 playfeel polish brief

*Planner: Claude Opus 5.5, Oct 5 2026. Written against `c49a51f` (the `rwb-2-stage3-ag` head after the softlock
pass). Read-only review: I read the code, docs and test names. I did not run the game, the suite or a browser. Anything
marked **unverified** is something I worked out from the code but did not see on screen.*

**Goal for the next Grok 4.7 pass:** make the threats easier to read without making the stage easier to survive.
Damage, timings and the fear numbers stay where they are. Each item below adds a tell, a sound or a guard against an
unfair overlap.

**Byte budget (hard rule: never minify or raise a cap, `BUILD-T12-T16.md` check D).** Free bytes today:
`myrddraal.js` 950, `stage3-hazards.js` 201, `darkfriends.js` 96, `stage3.js` 103. `stage3-lights.js`, `hud.js`
and `audio.js` have no cap. Put new logic in those three and add only one-line hooks to the capped files.

## 1. Fear aura (highest priority)

**What it does now.** `FADE.fear` in `src/myrddraal.js:20-21`: `radius 220`, `fill 1.6`, `shaken 0.7`, `brave 1.2`,
`dispel 4`, `dispelRange 400`, `vig [0.35, 0.75]`, `torchDim 0.7`, `rampIn 0.5`, `rampOut 0.3`, `pulse 0.03`,
`hurtMs 340`. The aura turns on at `fear` anim frame 3 in phase 2 (`update`, line 94) and never turns off until death.
`tickFear` (237-255) fills the meter over 1.6 s while Riley is within `hypot <= 220` of the Fade. When the meter is full
he is put into `hurt` at timeScale 340/700 ≈ 0.49 and gets 1.2 s of `braveT`. The meter drains at the same rate when he
is outside the radius or calm. Calm means `inv > 0`, a lunging copy, or `NO_FEAR` (`hurt, down, getup, cast,
balefire, grabbed, escape`). A fireball, bolt, fire shield or Balefire within 400 px of the Fade sets `dispelT = 4`
(`lightNear`, 45-55).

**How it reads.** These are the tells today:
- The magenta arc at Riley's feet (`fearArc`/`drawStage3Meters`, `src/hud.js:57-97`: radius 28, `0xff00ff` at 0.85).
  Its backing ring is `0x280c38` at 0.5, which is close to invisible on the night floor (**unverified**).
- The vignette rising from 0.35 to 0.75, with a 0.03 pulse. The pulse is off under `calmMotion()`.
- Torch light radius dropping to 70% (`tickLook`, 257-270).
- One flash line, "FEAR AURA! FIRE OR LIGHTNING DRIVES IT BACK", and one for "LIGHT DRIVES THE SHADOW BACK!".

**Remaining frustration points.**
1. **The 220 px edge is invisible.** Nothing is drawn around the Fade, so the only way to learn the radius is to
   watch the arc start filling. The Fade's slash reaches 260 (`TYPES.fade.atk.x1`) and its `pref` is 210, so melee
   always happens inside the aura. Players need to see the edge to plan in-and-out spacing.
2. **The shake is silent.** `tickFear` calls `bump(s, 'shaken')` with no hint and no `sfx`. Riley just drops into a
   slow `hurt`, often in the middle of `combo3` (combo states are not in `NO_FEAR`). That is fine as a punishment,
   but there is no audio warning as the meter nears full, so a player watching the Fade will miss the arc.
3. **Brave and dispel are invisible.** After a shake, the arc reads 0 for 1.2 s and looks the same as "no fear yet".
   During a 4 s dispel, the arc only drains. The player cannot tell they have a free window, or when it ends.
4. **Torch dim versus the copy tell (phase 3).** Copies are unlit (`FadeCopy`, `setLighting(false)`) and the hint
   says the real one "CATCHES THE TORCHLIGHT". With the aura up, torches shrink to 70% radius just as that tell is
   needed. The shadow tell (copies have no shadow) still works. **Unverified** whether the torchlight half still
   reads in the arena.

**Recommendations** (none of them change a `FADE.fear` number):
- **F1. Aura floor ring.** While `boss.auraActive`, draw a low-alpha magenta ring on the floor centred on the Fade,
  radius `FADE.fear.radius`, clipped to the lane band (`LANE_TOP..LANE_BOT`). The hit test is a true circle in (x, y),
  so draw a true circle and do not squash it. Fade it with `boss.auraK`, so it uses the same ramp as the vignette.
  Hide it while `dispelT > 0`, or switch it to warm amber (`0xff9a48`, the torch colour). Draw it in `hud.js` beside
  the arc, or as a kit image updated from `stage3-lights.js`.
- **F2. Dread audio.** Add `sfx.dread()`: a low heartbeat, gated with `gate('dread', 350)`, while `fear >= 0.6` and
  rising. That gives about 0.64 s of warning before a shake. Add `sfx.shaken()`: a short sting played once per shake,
  detected from a change in `kit.stats.shaken`, so `myrddraal.js` does not grow. Respect `calmMotion()` only for
  visuals, not audio.
- **F3. Show the windows.** Extend `fearArc` to also return `brave = braveT / FADE.fear.brave` and
  `dispel = dispelT / FADE.fear.dispel`. Draw brave as a white arc that drains and dispel as an amber arc that drains.
  Draw the magenta fill exactly as now, so `stage3-hud.test.mjs:113` keeps passing. Raise the backing ring's alpha
  to about 0.8.
- **F4. Check the copy tell.** Take a phase-3 screenshot with the aura up. If the real Fade does not clearly catch more
  light than the copies, give the real Fade a faint rim (a small lit `glow` that follows it, phase 3 only) instead of
  touching `torchDim`. If it reads fine, change nothing.

## 2. Roof tiles

**What it does now.** `TILES` in `src/stage3-hazards.js:9-12`: `zone 2` (x 2560-3840, the dusk-to-night stretch),
`warn 0.9`, `speed 900`, `every [3.0, 4.2]`, `dmg 9` (heavy, knockdown, kb 300), `enemyDmg 14` (+ launch 200),
`hitDx 60`, `hitZ 90`. `startTile` (28) always marks Riley's band. Half the time it also marks one adjacent band, so a
safe band is always next to him (each band is about 39 px; Riley walks y at 125 px/s). The markers are unlit amber
`lanemark` images at 0.32-0.6 alpha, pulsing at `sin(t*9)`, plus `sfx.tileRattle`. The countdown only runs when no tile
is live, and not while Riley is held (SL-2) or on game over (SL-5). One sprite is drawn per marked band (SL-3,
`armRoofTiles` in `stage3-lights.js`).

**Timing I derived (unverified in play).** A tile spawns 120 px off-screen on a random side. It reaches a Riley who
stands near that edge about 0.18 s after the warning ends (about 1.1 s total). It reaches a Riley at the far edge
after about 1.5 s. One tile lasts about 0.9 + 1540/900 ≈ 2.6 s, so tiles come every 5.6-6.8 s. A tile overlaps a point
for about 0.13 s (120 px / 900). From the jump numbers in `riley.js` (squat 0.07 s, `vz 920`, gravity 2600), Riley is
above `hitZ 90` from about 0.12 s to 0.59 s after he leaves the ground. So a timed jump clears a tile, but the hint
only says "CHANGE LANES".

**Frustration points.**
1. **No direction cue during the warning.** The side is picked at random (`dir`) and is only revealed when the
   sprite enters. Near the entry edge, Riley has about 0.2 s after that. Changing lanes still works, but the jump
   option and positioning cannot be read.
2. **A grab during an active warning is an unavoidable hit.** SL-2 froze only the *next* countdown. A cutthroat can
   still start a lunge (`Cutthroat.think`, `darkfriends.js:56-67`) while a tile is warning or flying. Once held, Riley
   cannot move, and `Riley.takeHit` lets environment knockdowns through (`riley.js`, the `grabbedBy` filter in
   `takeHit`). Zone 2 wave 2 has two drop-in cutthroats and a hound, so this overlap is likely there (**unverified**
   how often).
3. **Holding an enemy during a warning.** Riley's own `hold`/`knee` state cannot walk. The way out is a throw (jump),
   then he can move. The reachability test (`stage3-hazards.test.mjs`, "a safe band is reachable…") only starts from
   `idle`, `combo3` and `hurt`.
4. **The tile sprite is lit** (`setLighting(true)` in `armRoofTiles`) and zone 2 darkens from ambient `0x7a5a52` to
   `0x3a3a52`. The unlit amber markers will read. The tile itself may not (**unverified**).

**Recommendations.**
- **T1. Entry-side cue.** For the whole warning, make the marker brighter at its entry end (a second short
  `lanemark` or `glow` at the entry edge, same tint). Optionally pan `tileRattle` to that side. Put the code in `stage3-lights.js`
  with a one-line call from `startTile`.
- **T2. No lunge into a live tile.** A cutthroat does not start a lunge while `s.kit?.tiles?.length` is non-zero
  (about 22 bytes in `darkfriends.js`, which has 96 free). Holds already in progress are unchanged, and a tile still
  breaks them.
- **T3. Readable tile in the dark.** After a screenshot at camX ≈ 3300, either set the tile sprites unlit or give
  them a faint amber rim. Damage and hitbox stay the same.
- **T4. Teach the jump.** Add a second, one-time hint after the first tile hit: "JUMP THE TILES OR CHANGE LANES".
  This is optional and costs bytes in `stage3-hazards.js`. Route it through a `stage3-lights.js` helper.

## 3. Grab chains

**What it does now.** `CUTTHROAT` in `src/darkfriends.js:18-23`:
- Approach: `coil 0.45` (white `glow` glint for 0.15 s via `telegraph`, plus `sfx.hiss`), then a 620 px/s lunge for
  up to 0.45 s. Range 140-300, lane 24, catch 80 × 22.
- Cooldowns: `grabCool [5, 8]`, first grab after `[2.0, 3.5]` s.
- The hold: `holdMax 2.4`, chips of 2 hp every 0.6 s (max 3, never below 1 hp), then a throw for 8 (heavy, knockdown).
- Escape: `mashNeed 6`, `mashDecay 0.5`.
- After an escape: the cutthroat is `shoved` for 1.2 s and takes 1.3× damage. Riley gets 0.45 s of i-frames when his
  escape animation finishes (SL-4, `Riley.escape`).
- `grabBusy` (`stage1.js:317`) allows only one lunge or hold at a time. `GRAB_OK` still includes `hurt` on purpose.
- Riley's mash (`Riley.grabbed`) counts each `attack/jump/special/power` press and each *new* non-neutral direction.

**Mash maths.** Decay removes 1 point every 0.5 s, so the net rate is presses/s − 2. Escaping before the throw needs
6 / (r − 2) < 2.4, which means more than about 4.5 counted presses/s. At 6/s Riley is free in about 1.5 s (2 chips).
At 8/s it takes about 1.0 s (1 chip). Mixing directions with buttons roughly doubles the count. That is a fair teen
mash. **Keep `mashNeed` 6.**

**Chain-grab check.** After an escape, Riley is protected for the escape animation (about 0.57 s per the audit,
**unverified**) plus 0.45 s of i-frames. A second cutthroat that coils at the moment of escape catches nothing. One that
coils as the i-frames start still shows a full 0.45 s tell. No lockout is possible from back-to-back escapes. The open
case is a grab out of `hurt`: a zealot or hound hit lands during a coil and the catch lands in hitstun. The handoff kept
this on purpose.

**Frustration points and recommendations.**
- **G1. Mash feedback.** `mash()` makes no sound and the ring (`hud.js`, radius 22, `0xffe2a0`) only fills.
  Play a soft tick per counted press (gated at about 40 ms), make the ring pop slightly on each gain, and visibly
  shrink it on decay. Detect gains from a change in `grabbedBy.mashN` inside `drawStage3Meters`, so no capped file
  grows.
- **G2. Stronger coil tell in the dark.** The glint lives 0.15 s, out of a 0.45 s coil. Keep the coil length. Add a
  small `stalk`-coloured floor flash under the cutthroat for the full coil, using `kit.telegraph`'s Stage 3 override
  in `stage3-lights.js`, so zealots in Stage 2 are untouched.
- **G3 (only if the uncle asks). Hitstun grab.** Do not remove `hurt` from `GRAB_OK`. If the uncle reports unreadable
  grabs, the narrow fix is this: a catch out of `hurt` fails only when the hurt *began after* that cutthroat's coil
  started. A grab that is pre-aimed at an already-staggered Riley still lands.

## 4. Light budget

**What it does now.** `budgetStage3Lights` (`src/stage3-lights.js:5-25`) builds one list each frame, in priority order:
`heroLight`, Balefire beam lights, fire shield, bolts, zealot torches, fireballs, `fx.hitLight`, booms, fire patches,
pickups, wall fires (already capped at 4 on screen by `placeFires`, `capOnScreen 4`), and the sun. Lights with
intensity > 0 are shown first-come up to `getMaxVisibleLights()` (fallback 10). Results go to `kit.lightBudget
{active, candidates, cap}`. Nothing displays that record.

**Gameplay lights versus decoration.**
- **Gameplay, never drop:** `heroLight` (Riley in the dark). Fireball, bolt, shield and beam, because these are what
  dispel fear, so the player must see the light that `lightNear` counts. Zealot torches and patches, because they are
  hazards. `hitLight`, because it is hit confirmation.
- **Half-gameplay:** wall torches in the boss arena (the copy tell, see F4) and pickups.
- **Decoration:** booms, the sun (gone after x ≈ 3900 anyway), and torches outside the arena.

The order already matches this, except that booms sit above patches and pickups. That is harmless while candidates are
well under the cap. **Unverified:** I could not measure the real peak candidate count. The software runs are about
20 fps across the whole stage (HANDOFF), and the light shader's share of that is unmeasured. iPad has not been measured.

**Recommendations.**
- **L1. Show the budget.** Add `lights a/c/cap` from `kit.lightBudget` to the perf panel (`src/perf-panel.js`) when
  Stage 3 is active.
- **L2. Lock the priority.** Add a test: with more candidates than the cap, `heroLight`, every dispel-source light and
  `hitLight` stay visible, and the sun and wall fires drop first. Move booms below patches and pickups.
- **L3. Measure.** Log the peak `candidates` per zone over the 9 campaign seeds into `docs/stage3/perf.json`. If the
  boss arena peaks above about 8, consider lowering only `capOnScreen` there. Do not lower the cap itself.

## Do not change

- Fear numbers: `radius 220`, `fill 1.6`, `shaken 0.7`, `brave 1.2`, `dispel 4`, `dispelRange 400`, `vig`,
  `torchDim 0.7`. These are locked in `stage3-fade.test.mjs:115-123`. Duty ≤ 25% at 30/60/120 Hz is locked in
  `stage3-fear-lifecycle-hardening.test.mjs:141-158`. The uncle chose these Nemotron values (HARDENING.md).
- The magenta fill `0xff00ff` at 0.85 (`stage3-hud.test.mjs:113`). A lunging copy counts as calm, and `inv > 0` counts
  as calm (SL-6).
- `mashNeed 6` (`stage3-riley-grab.test.mjs:81`, `stage3-hud.test.mjs:28`), the 0.45 s coil
  (`stage3-cutthroat.test.mjs:29`), and the 0.45 s escape i-frames (`stage3-softlock-hardening.test.mjs:142-152`).
- `hurt` stays grabbable. There is no scene-wide grab lock.
- Tile damage 9 with a knockdown, `warn 0.9`, the safe-band adjacency rule, one sprite per band, and the countdown
  freezing while held and on game over. The "safe band reachable" test stays.
- `capOnScreen 4` (`stage3-kit.test.mjs:104`), and the Stage 1 golden sim and Stage 2 fingerprint.
- File caps. `T14`/`T17` stay out of scope.

## Task list for one Grok 4.7 pass

Run `node --test tests/*.test.mjs` before and after each task. The bar is 731/731 plus the new tests, nothing loosened.
Then run the Stage 1 golden diff and the Stage 2 sha from HANDOFF.md.

1. **F1 aura floor ring.** Accept: the ring is drawn only while `auraActive`, its radius is 220, its alpha follows
   `auraK`, and it is hidden or amber while `dispelT > 0`. Test: `stage3-playfeel-fear.test.mjs`, "aura ring tracks
   auraActive and dispel" (stub graphics, as in `stage3-hud`).
2. **F2 dread and shaken audio.** Accept: no `dread` call while `fear < 0.6` or while calm, and exactly one `shaken`
   sting per `stats.shaken` increment over 20 s of phase 2. Test: same file, using an `sfx` stub with call counts.
3. **F3 brave and dispel arcs.** Accept: `fearArc` returns `brave` and `dispel` fractions in [0, 1], and the magenta
   assertion is unchanged. Test: extend `stage3-hud.test.mjs` with a new case. Do not edit existing cases.
4. **T2 no lunge into a live tile.** Accept: a cutthroat in range with `grabCool = 0` does not enter `lunge` while
   `kit.tiles.length > 0`, and does lunge within one frame after the tile ends. `darkfriends.js` stays ≤ 9,216.
   Test: `stage3-playfeel-tiles.test.mjs`, at 30/60/120 Hz.
5. **T1 entry-side cue.** Accept: from `t = 0` to `warn`, a cue object exists on the side `dir` enters from, and it is
   destroyed with the tile and in `clearHazards`. Test: same file, plus the existing `stage3-memory` baselines.
6. **Tile reach from `hold`.** Add `hold` as a start state in a *new* test: Riley holding a dazed enemy, tile marked,
   jump (throw) then walk. Accept: a safe band is reached before the strike. If it fails, report it. Do not retune.
7. **G1 mash feedback.** Accept: one tick per counted mash, gated at 40 ms or more, and none outside `grabbed`.
   Test: `stage3-playfeel-grab.test.mjs`.
8. **L1 and L2 light budget.** Accept: the panel shows `a/c/cap`, and the priority test passes with the cap forced
   to 3. Test: extend `stage3-light-budget-hardening.test.mjs` with a new case.
9. **Screens (manual, report only).** Capture camX ≈ 3300 with a tile live, the arena with the aura up, and phase 3
   with copies. Use the screens to decide T3, G2 and F4. Do not implement those without the screens.

## Open questions for the uncle to playtest

1. Without looking at the arc, could you tell where the fear zone starts? Did the floor ring (after F1) help or clutter?
2. When you got shaken mid-combo, did you see or hear it coming? Is about 1.6 s of melee before a shake right?
3. Is a fireball (34 meter) for 4 s of no fear worth it, or did you just walk out?
4. Did you ever get grabbed straight out of a zealot or hound hit? Did it feel cheap or earned?
5. Mash: did you ever mash hard and still get thrown? Buttons, directions, or both?
6. Tiles: did you know which side they came from? Did you try jumping them? Was a tile ever on you while held?
7. In the dark end of the rooftops and in the arena, could you see tiles, cutthroat glints, and which Fade is real?
8. On the iPad: steady frames in the arena with the aura vignette and torches up?
