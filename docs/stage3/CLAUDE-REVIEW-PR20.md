# Independent review: draft PR #20 (`rwb-2-stage3-ag` → `rwb-w2`), Stage 3 T1–T11

*Reviewer: Claude Opus 5.5, Oct 5 2026. Head `7dcaf0c`. Read-only review: no source, test or tool file changed.
I did not run the game, `npm` or the test suite. Test counts quoted below (605/605) come from `HARDENING.md` and I
have not re-checked them.*

## 1. Verdict: **needs fixes** (not blocked)

T1–T11 are all implemented, and they follow the plan and build docs closely. The Stage 1/2 protection is good: the
`s3` flag, the registry refactor checked by the Stage 1 golden sim and the Stage 2 fingerprint, and
`riley-grab-safety`. So merging behind the flag carries little regression risk for the live game. Stage 3 itself is
not ready for a kid to play. The Myrddraal's fear aura can keep Riley stunned about half the time in phase 2–3, and it
can cancel the fireball that is meant to beat it. Roof tiles can hit a band that has no visible tile in it. And nothing
yet shows that a whole Stage 3 run can be cleared, because the bot and campaign test (T12) don't exist. Fix the top
two items before anyone plays `?stage=3&s3=1`, and land T12 before opening the flag (T17).

## 2. Task table (scope T1–T11)

| Task | Result | Evidence |
|---|---|---|
| T1 Registry + `s3` flag | PASS | `stages.js`: `STAGES`, `stageEnabled`, `maxStage`, `stageFromQuery`, `resolveStage`, `STAGE2.next`; `stage1.js`: `releaseStage(toStage, fromStage)`, `selectStage`, `onPress` → `stageDef.next(q)`; `tests/stage-registry.test.mjs` |
| T2 Placeholders + manifests | PASS | `tools/stage3/make_placeholders.py`, `tools/stage3/art-manifest.json`, `assets/stage3/ART_STATUS.json`, `docs/stage3/prompts/*.json`, `tests/stage3-placeholders.test.mjs`. Atlases are under `assets/stage3/chars/` with `dir` in the meta (differs from PLAN, matches spec) |
| T3 Stage3Kit backdrop + time of day | PASS | `stage3.js`: `timeOfDay`, `lerpColor`, `queueStage3`, `Stage3Kit.build/update/destroy`; `assets.js`: `queueCharPages` `dir`; `lights.json` 8 torches, cap 4 |
| T4 Cutthroat AI | PASS | `darkfriends.js`: `Cutthroat.startLunge/catchResult/covers/holding/mash/releaseHold/dropIn`; `stage1.js`: `spawn` side `T`, `grabBusy`, `attackTokens`, `resolveAttack` guard, body-block exclusion |
| T5 Riley grabbed/escape | PASS | `riley.js`: `GRABBED`, `enterGrabbed`, `leaveGrabbed`, `grabbed`, `escape`, `takeHit` filter, `sync` depth, `down`/`respawn` release; `tests/riley-grab-safety.test.mjs` (Stage 1/2 × 9 seeds) |
| T6 Myrddraal boss | PASS (design concern, §3 B1) | `myrddraal.js`: `Myrddraal` (blink/sunk/blinkin counter, `tickFear`, `tickLook`, `makeCopies`, `inParry`, `defeated`→melt), `FadeCopy`; `stages.js`: `STAGE3.boss/phaseLines/onBossPhase/bossDown` |
| T7 Hazards + set pieces | PASS (readability bug, §3 B2) | `stage3-hazards.js`: `Stage3Hazards.startTile/updateTiles/shadowPool/copyWisps/shadowBurst/dropMarker/onZoneClear/clearHazards/threats`; `TILE_BANDS = VOLLEY_BANDS` (not hard-coded) |
| T8 Audio | PASS (not listened to) | `audio.js`: `MUSIC.stage3/boss3` (match `music-manifest.json`), 18 `EXTRA_VOICE` lines, `sfx.hiss/shadowWhoosh/tileRattle/torchIgnite` (all `gate`d first); counter cue in `Stage3Hazards.updateHazards` |
| T9 HUD | PASS | `hud.js`: `bossLabel`, `mashRing`, `fearArc`, `drawStage3Meters`, `placeholderArt`/`updateWatermark`, `speakerColor`, `stageClear` ribbon `s.stage >= 2` |
| T10 Title select | PASS | `hud.js`: `STAGE_NAMES[3]`, `titleSelect` uses `maxStage(q)`; `stage1.js`: `selectStage` clamp. `[2,3,2]` instead of `[2,3,3,2]` (documented deviation) |
| T11 Story + flagged flow | PASS | `stage3.js`: `STORY3_SCRIPT`; `stage1.js`: `startStage3` (honours `story=0`); `hud.js`: `clearPrompt(stage, touch, next)`; Q3 carry-over not implemented (correct: Jason-gated) |

## 3. Bugs and risks (most severe first)

No blockers. No softlock path turned up in the code I read: every boss and cutthroat state has a timed or
animation-`done` exit, and holds release on death, down, respawn, victory and teardown.

### Major

**B1. The fear aura can keep Riley stunned and eats his fireballs.** `myrddraal.js` `tickFear` (lines 236–248), `NO_FEAR` (line 30).
- The meter keeps filling while Riley is in his fear `hurt`. After a 0.7 s shake it is already about 0.5, so the
  next shake comes 0.7 s later. That is roughly a 50% stun duty cycle.
- The aura radius (300) is larger than the Fade's preferred distance (`pref` 210), so in melee Riley is almost always
  inside it. Phase 3 keeps the aura on while the copies are lunging.
- `'cast'` is not in `NO_FEAR`. `startCast` spends saidin at frame 0 (`riley.js:105`), so if the meter fills before
  cast frame 2, the fireball is cancelled and the meter cost is lost. That fireball is the counter the HUD hint tells
  the player to use.
- Earning a fireball takes about 11 landed hits (34 saidin at +3 per hit), and one dispel lasts only 4 s.
- This follows spec T6 as written, so it is a design gap rather than builder error. No full-run test exercises it.
- **Fix:**
  - Don't fill the meter while Riley is `hurt`, `cast` or `balefire`.
  - Add `cast` to `NO_FEAR`.
  - Add a short "brave" cooldown after a shake (about 2–3 s) during which the meter can't refill.
  - Note: `myrddraal.js` has 0 bytes of cap headroom (B6), so Jason must OK a cap raise first.

**B2. A roof tile can hurt Riley in a band that shows no tile.** `stage3-hazards.js` `updateTiles` (lines 62–68, 78).
- With 50% chance, two bands are marked. Only one sweep sprite is drawn, in `bands[0]`, which is Riley's starting
  band. The hit test still covers every marked band.
- A kid who steps into the second marked band gets knocked down for 9 by a tile that is visible somewhere else. The
  stripe is the only warning there.
- **Fix:** draw one sweep sprite per marked band (same image, same x). Or mark only Riley's band and drop the 50%
  second band; the adjacency rule already keeps a safe band next to him.

**B3. Nothing shows that Stage 3 can be cleared end to end.**
- Each system is unit-tested in a staged arena (`stage3Simulation` + `arena`). No test plays zones 0→3 through the
  boss, and `src/bot.js` has no Stage 3 branch (T12).
- B1, grab chains (B4) and tiles hitting a held Riley (m1) only show up across a full run.
- **Fix:** build T12 next. Report per-seed grabs, shakes, tile hits and lives lost. Tune with that data, not by feel.

**B4. Grab chains: one cutthroat can grab Riley right after another's hold ends.** `darkfriends.js` `think` (lines 56–67), `GRAB_OK` (line 25); `riley.js` `escape`.
- `grabBusy` only blocks while another cutthroat is in `lunge` or `holding`.
- After an escape, the escaper is `shoved` (not busy) and Riley gets no i-frames (open item T5 §8.10). `GRAB_OK`
  also includes `hurt`, so a zealot hit can feed straight into a grab.
- Zone 1 wave 1 has two cutthroats and zone 2 wave 1 has three, so back-to-back holds are likely. Each failed hold
  costs 14 HP.
- **Fix:** add a scene-wide grab cooldown of about 2 s after any hold ends (check it in `grabBusy`), plus about 0.3 s
  of escape i-frames.

### Minor

- **m1. Tiles keep coming while Riley is held.** `updateTiles` starts tiles (and always marks Riley's band) even when
  `R.grabbedBy` is set. A held Riley needs about 1.2 s or more of mashing and the warning is 0.9 s, so a zone-2 grab
  often costs the hold *and* a 9-damage knockdown. **Fix:** pause `tileT` while Riley is grabbed, or don't mark a held
  Riley's band.
- **m2. The light budget ignores the sun.** `Stage2Kit.applyLightBudget` (`stage2.js:411–424`) never adds
  `Stage3Kit.sun` (`stage3.js:120`). The sun stays visible and uncounted in zones 0–2. Balefire alone adds 2 beam
  lights, which PLAN §2.5 doesn't count. With hero, 4 torches, Balefire, pickup, ribbon, fireball and sun, the scene
  can exceed `maxLights` 10, and Phaser may cull the hero light. The T7 light test only covers camX 3920, where the sun
  is already gone. **Fix:** count the sun in the budget (override `applyLightBudget` in `Stage3Hazards`), and add a
  daylight worst-case test that includes Balefire.
- **m3. "Real one lunges within 0.3 s" isn't a timer.** `forceLungeT` (`myrddraal.js:136,229`) is never decremented.
  It only works as a flag read in `think`, so if the Fade is mid-`attack` or `stagger` the punish lunge comes later.
  This is harmless, but the spec says 0.3 s. **Fix:** decrement it in `update` and lunge when it reaches 0, or rename
  it and document it as a flag.
- **m4. Mashing needs about 4.5–5 presses/s** (`mashNeed` 6, decay 1 per 0.5 s, 2.4 s hold). That's fine on a
  keyboard and hard for a small child on iPad touch buttons. **Fix:** after T12, consider `mashDecay` 0.7 or
  `mashNeed` 5, and test both on device.
- **m5. The fear arc is hard to see.** `hud.js:89` draws dark violet `0x280c38` at alpha 0.5 under Riley's feet on the
  night garden floor. **Fix:** use a lighter violet or a white rim so the warning is visible.
- **m6. Two shared-path behaviour changes reach Stage 1/2 and neither frozen check covers them.**
  - `audio.js:365`: `playTrack` now restarts a track that is already playing when `restart` is set. This affects
    Stage 1/2 boss music after a scene restart.
  - `stage1.js:244`: during any cutscene (Twix, Stage 2 story), presses are swallowed while a non-cutscene pause
    reason is set.
  - Both look intended (HARDENING cycle 2). They need one manual Stage 1/2 listen and tap-through on device, because
    the sims never hit them.
- **m7. Texture residency.** `fadePortrait` isn't in `STAGE_TEXTURES[3]`, so `releaseStage` never frees it after
  Stage 3. `arrow` and `ribbon` are released on 2→3 and then re-fetched by `queueStage3`. This is small, but the
  pre-fight inventory is at 24,982,182 / 25,000,000 bytes (HARDENING), so check whether that budget covers Stage 3
  before T14 adds real art. **Fix:** add the three keys to `STAGE_TEXTURES[3]` (Jason-gated: registry data).
- **m8. Interface drift.** `STAGE_TEXTURES[2]` is now a hand-written literal in `stages.js`. It used to be derived from
  `BARN_ART`/`STORY_PANELS`, so a future Stage 2 art key can go missing silently. `stage-registry.test` pins today's
  list, which catches removals but not additions.

### Maintainability

- **B6. `myrddraal.js` is 14,336 / 14,336 bytes**, and it has been near the cap since T6 (14,334 at `7b751bb`). The
  class bodies are de-indented to fit, which hurts readability. Every boss fix (B1, m3) now needs a cap decision. The
  cap is a planning number, not a technical limit. **Fix:** Jason raises it (to about 16 KB), and the next builder
  re-indents the file in a no-behaviour-change commit.

## 4. Gaps between plan/specs and code

| Item | Status |
|---|---|
| PLAN §1.2 zone 1: "Gill's line plays on zone entry" | **Missing.** `STAGE3.zones[1]` has no `intro`, and there is no separate Gill bark (his lines exist only in the story beat). |
| PLAN §1.5 night moths | Partial: embers only. Cosmetic. |
| PLAN §1.4 "real one lunges within 0.3 s" of a copy pop | Diverged: flag, not timer (m3). |
| PLAN §2.5 light table | Omits Balefire's 2 beam lights and the uncounted sun (m2). |
| PLAN T7 ribbon "mixin" | Replaced by inheritance (documented deviation; fine). |
| PLAN T7 tests in `stage3-kit` | Moved to `stage3-hazards.test.mjs` (documented; fine). |
| BUILD T7 "destroy the markers" at strike | Diverged: markers stay through the sweep. This is the better choice, and it is the only cue for B2's second band. |
| PLAN T10 `[2,3,3,2]` | `[2,3,2]` (documented; correct given the frozen flag-off test). |
| PLAN T9 split hint text | Longer text kept (documented; byte cap). |
| PLAN T5 §8.10 escape i-frames | Still open (B4). |
| T6 §8.9 vignette `strength` writable in real Phaser 4 | Unverified in a browser; the harness stubs it. If it isn't writable, the fear aura has no visible effect at all. |
| Perf (BUILD frame-rate budget) | "Not measured" in every cycle. No iPad numbers exist for the Stage 3 rooftops or boss. |
| T12–T16 | Not started (out of PR scope, but B3 depends on T12). Every Stage 3 sprite, plate and panel is still a labelled placeholder. |

## 5. Top 5 fixes for the next builder (in order)

1. **Make the fear aura fair (B1).** Don't fill the meter during `hurt`, `cast` or `balefire`. Add `cast` to
   `NO_FEAR`. Add a 2–3 s post-shake cooldown. Add tests: a fireball started at fear 0.95 still fires and dispels, and
   the shaken duty cycle stays at or under 25% in a 20 s phase-2 run. This needs Jason's OK to raise the
   `myrddraal.js` cap (B6).
2. **One visible sweep per marked tile band (B2), and no tiles at a held Riley (m1).** Test: in every marked band at
   strike time, a tile image's y lies within that band. Also: no tile starts while `R.grabbedBy` is set.
3. **Build T12 (bot + 9-seed campaign) before any more tuning (B3).** Add per-seed diagnostics for shakes, grabs,
   tile hits and lives. Treat a seed that only clears through god mode or Balefire luck as a failure.
4. **Grab-chain guard (B4).** Add a scene-wide 2 s cooldown after any hold ends (read it in `grabBusy`) and 0.3 s of
   escape i-frames. Test: with three cutthroats, there are never two holds less than 2 s apart.
5. **Light budget covers the sun and Balefire (m2).** Override `applyLightBudget` in `Stage3Hazards` to include
   `this.sun`. Add a zone-1 daylight worst case: hero, sun, 4 torches, Balefire (2), pickup, ribbon, fireball. Assert
   10 or fewer visible lights and that the hero light stays visible.
