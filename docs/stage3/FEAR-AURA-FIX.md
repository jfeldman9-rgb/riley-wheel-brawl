# Stage 3 fear-aura fix plan (B1) + next-builder fix order

*Planner: Claude Opus 5.5, Mon Oct 5 2026. Branch `docs-fear-aura-fix`, HEAD `9a7222a` (PR #20, `rwb-2-stage3-ag`).
Planning only. Sources: `CLAUDE-REVIEW-PR20.md` §3/§5, `src/myrddraal.js`, `specs/T6.md` §3.5, `HARDENING.md`,
`BUILD-T*.md` cap lines. Builder: Grok 4.7. No code was changed and nothing was run while writing this plan.*

## A. Size cap: `src/myrddraal.js` ≤ **16384** bytes (was 14336)

- Jason OK'd a raise. Today the file is 14,336 / 14,336 (0 headroom, B6).
- 16384 is 16 KiB, the next power of two. It matches the review's "about 16 KB" and sits with the other caps
  (`stage3-hazards.js` 8192, `darkfriends.js` 9216, `stage3.js`/`bot.js` 12288).
- Budget: the B1 fix is about +200–250 B. Re-indenting the class bodies (`Myrddraal`, `FadeCopy`, the `switch` in
  `update`) is about +600–900 B. That lands around 15.2–15.5 KB, which leaves about 900 B for m3 (`forceLungeT`
  timer) and one more boss fix. Don't use the extra room for new features.
- Do this in **two commits**: (1) a re-indent only, no behaviour change (the Stage 3 suites must pass unchanged);
  (2) the fear fix. Update the cap where it is pinned: `BUILD-T12-T16.md:100` and any audit or size check you
  find. Record the new number in a HARDENING cycle note; don't rewrite older cycle notes.

## B. Behaviour change (precise)

1. **The meter doesn't fill while Riley is already stunned or committed.** When `R.state` is in `NO_FEAR`, the
   meter is treated as *outside*: it decays at `-dt / fear.fill`, the same rule as leaving the radius. It never
   fills there. Today `tickFear` fills whenever `inside` is true, so 0.7 s of `hurt` refills about 0.5 of the meter.
   That gives roughly a 50% stun duty cycle.
2. **A paid cast is never cancelled.** Add `'cast'` to `NO_FEAR`. `Riley.startCast` (`riley.js:104–105`) takes saidin
   at frame 0 and spawns the fireball at `fi >= 2` (`cast`). With `'cast'` in `NO_FEAR`, the shake check skips the
   whole cast, so the fireball always spawns and can dispel through `lightNear` → `dispelT = fear.dispel`. This
   also covers `startPowerCast` (lightning / air whip), which uses the same `'cast'` state.
   `'balefire'` is already in `NO_FEAR`. Because of rule 1 it now also stops the meter filling.
3. **Post-shake "brave" window.** Add `fear.brave: 2.5` (s). When a shake fires, set `this.braveT = fear.brave`.
   While `braveT > 0` the meter decays and can't fill. The window covers the 0.7 s `hurt` plus about 1.8 s to act.
   The fastest repeat is then `brave + fill` = 3.9 s, so the duty cycle is 0.7 / 3.9 ≈ **18%** (the review asks
   for ≤ 25%).
4. **Not changed now** (tune later with T12 data): aura `radius` 300 vs `TYPES.fade.pref` 210, the phase-3 aura
   during copy lunges, `hurtMs`, `fill`, `dispel`. The spec T6 §3.5 shake effect stays as it is
   (`hp` unchanged, `R.vx = 0`, `fear = 0`, `bump(s,'shaken')`).

## C. Code sketch (`src/myrddraal.js` only)

```js
// FADE.fear: add brave (s) after hurtMs
fear: { radius: 300, fill: 1.4, shaken: 0.7, ..., auraFrame: 3, hurtMs: 340, brave: 2.5 },

const NO_FEAR = ['hurt', 'down', 'getup', 'cast', 'balefire', 'grabbed', 'escape'];

// constructor: add braveT to the zero-init chain
this.auraK = this.fear = this.braveT = this.dispelT = ... = 0;

// clearAbilities(): also `this.braveT = 0;` next to `this.fear = 0;`

tickFear(dt) {
  ... dispel block unchanged ...
  if (this.braveT > 0) this.braveT -= dt;
  const calm = this.braveT > 0 || NO_FEAR.includes(R.state);
  const inside = !calm && this.auraActive && R.alive && hypot(R.x - this.x, R.y - this.y) <= fear.radius;
  this.fear = clamp(this.fear + (inside ? dt : -dt) / fear.fill, 0, 1);
  if (this.fear >= 1 && R.vulnerable && R.z <= 0 && !R.grabbedBy && !NO_FEAR.includes(R.state)) {
    R.setState('hurt', 'hurt', fear.hurtMs / (fear.shaken * 1000));
    R.vx = 0; this.fear = 0; this.braveT = fear.brave; bump(s, 'shaken');
  }
}
```

- `tickLook`, `auraActive`, `startFear` and the `case 'fear'` aura-on are unchanged. The HUD `fearArc`
  (`hud.js`) reads `fear`, so it now visibly drains during cast/hurt. That's the intended feedback.
- `FadeCopy` keeps `auraOn` false, so it isn't affected.
- Spec sync: append a dated note under T6 §3.5 in a **separate docs commit** (not in this planner's scope).
- Stage 1/2 can't change: `myrddraal.js` is only loaded for Stage 3. Still run the Stage 1 golden sim and the
  Stage 2 fingerprint as usual.

## D. Regression tests: add to `tests/stage3-fade.test.mjs`

Put them in that file so they reuse its local helpers `place(h)`, `toPhase(h, f, ph)`, `run(h, secs, until)`,
`vig`, `withSeed`, `stage3Simulation`. Shared setup for each test is the same as Test 5 (line 251):
`place` → `toPhase(h,f,2)` → `f.T.speed = 0` → Riley 200 px left, `facing = 1` → `f.startFear()` →
`run(h, 2, () => f.auraActive)` → hold `f.cool = 9` each frame so the Fade never attacks.

1. **`fade: a fireball cast at fear 0.95 completes, spawns and dispels the aura`**
   - Set `s.riley.saidin = 100` and `f.fear = 0.95`, then call `s.riley.startCast()` and keep `saidin` after the
     call.
   - Step until `s.riley.state !== 'cast'` (≤ 60 frames).
   - Assert Riley was never `hurt` during the cast and `riley.cast_fired === true`.
   - Assert a fireball existed (`s.fireballs.length >= 1` seen during the run).
   - Assert `stats.shaken` is unset/0, `stats.dispels === 1`, `!f.auraActive` and `f.dispelT > 0`. Saidin was
     spent once (no refund, no double charge).
2. **`fade: the fear meter does not fill while Riley is hurt, casting or in Balefire`**
   - For each of `hurt` (`R.setState('hurt','hurt')`), `cast` (`startCast`) and `balefire` (`startBalefire`,
     saidin 100):
   - Set `f.fear = 0.5` and `f.dispelT = 0`, then step while `R.state` stays in that state.
   - Each frame, assert `f.fear <= prev + 1e-9`. At the end assert `stats.shaken` is unchanged.
3. **`fade: after a shake the meter stays empty for FADE.fear.brave`**
   - Riley stays inside, idle. After the first shake, assert `f.fear === 0` for `brave*60 - 2` frames.
   - Assert the second shake comes `(brave + fill) * 60` frames after the first, ±3.
   - Also assert `FADE.fear.brave === 2.5` in the constants test (next to line 104).
4. **`fade: shaken duty cycle stays at or under 25% over 20 s of phase 2 at melee range`**
   - Riley idle at 150 px (inside `radius`), no light sources, 1200 frames.
   - Count frames where Riley is `hurt` after a shake.
   - Assert `hurtFrames / 1200 <= 0.25` and `stats.shaken <= 6` (the expected count is 5).
   - On today's code this would be about 50% and about 14 shakes.

- Re-run all of `stage3-fade.test.mjs`. Test 5 should still pass: the first shake is at about 84 frames, and
  the meter then decays to 0 at 700 px.
- Any other `startFear` test (lines 317, 359, 388, 428, 450, 677) that expects a second shake within 3.9 s is
  now **expected** to fail. Update its timing, and say so in the commit message.
- Re-run the boss-related Stage 3 suites too: `stage3-seeded-boss`, `stage3-campaign`, `stage3-hud`,
  `stage3-split-race`, `stage3-punish-recovery`, `stage3-boundary-hardening`.
- If `stage3-seeded-boss` pins counts, regenerate them only for the fear-related change, and record the old and
  new values.

## E. Ordered fix list for the next Grok 4.7 builder (by playability impact)

1. **Fear-aura fairness (B1, B6).** Steps A → B → C → D above. Done when the 4 new tests pass and the cap is
   16384 everywhere it is pinned.
2. **Roof tiles you can read (B2), and no tiles at a held Riley (m1).** `src/stage3-hazards.js` `updateTiles`
   (review lines 62–68, 78).
   - Prefer **marking only Riley's band** (drop the 50% second band). The adjacency rule already keeps a safe band
     next to him, and this saves bytes.
   - Watch the bytes: the file is 8,169 / 8,192, so drawing a sweep per band may need a cap call from Jason.
   - m1: while `R.grabbedBy` is set, don't count down `tileT` and don't start a tile.
   - Tests in `tests/stage3-hazards.test.mjs`:
     - every marked band at strike time has a tile image whose y lies within it;
     - no `startTile` while `R.grabbedBy` is set;
     - no tile hit on a held Riley.
3. **Grab-chain guard and escape i-frames (B4).**
   - Add a scene timer `grabCoolT = 2` (s), set whenever any hold ends (the cutthroat `releaseHold` path /
     `Riley.leaveGrabbed`). Count it down in the scene update.
   - Make `grabBusy` (`stage1.js:305`) also return true while `this.grabCoolT > 0`.
   - In `riley.js` `escape`, add `this.inv = Math.max(this.inv, 0.3)`.
   - Optional (decide it with T12 data): drop `'hurt'` from `GRAB_OK` (`darkfriends.js:25`).
   - `stage1.js` is a shared path, so re-run the Stage 1 golden sim, the Stage 2 fingerprint and
     `riley-grab-safety`.
   - Test: zone-2 wave with 3 cutthroats → no two hold starts less than 2 s apart. After `escape`,
     `R.inv >= 0.3`.
4. **The light budget counts the Stage 3 sun and Balefire (m2).**
   - Override `applyLightBudget` in `Stage3Hazards` so it counts `this.sun` (`Stage3Kit.sun`, `stage3.js:120`) and
     Balefire's 2 beam lights, in addition to `Stage2Kit.applyLightBudget` (`stage2.js:411–424`).
   - Test, zone-1 daylight worst case: hero + sun + 4 torches + Balefire (2) + pickup + ribbon + fireball. Assert
     ≤ `maxLights` 10 visible lights and that the hero light stays visible.
5. **Turn T12 into a fairness gauge (B3 follow-up).**
   - In `tests/stage3-campaign.test.mjs` (diagnostic at line 53), add `shaken`, `dispels`, the smallest gap
     between holds, and tile hits while held.
   - Add per-seed bounds (for example `shaken <= 12`, held tile hits `=== 0`, hold gap `>= 2 s`) so items 1–3
     can't regress.
   - Only after that, tune m4 (`mashNeed` / `mashDecay`), m5 (the `fearArc` colour) and m3 (`forceLungeT` as a
     real 0.3 s timer, which fits in the new cap).

*Out of scope here: m6–m8 (Stage 1/2 listen and tap-through checks, texture registry). Those need Jason's call or a
device check.*
