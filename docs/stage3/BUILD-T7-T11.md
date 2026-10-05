# Stage 3 T7–T11 build guide for the Antigravity builder (Gemini Flash)

*Planner: Claude Opus 5.5, Oct 4 2026. Branch `rwb-2-stage3-ag` @ `36d4ba7` (cycle 1, T1–T6 plus the Codex hardening
pass in `docs/stage3/HARDENING.md`, has landed; draft PR #20 into `rwb-w2`). Baseline: `node --test tests/*.test.mjs` =
**532/532**.*

There are no spec files for this cycle. The source of truth is `docs/stage3/PLAN.md`: §0 (rules), §2.5 (light budget)
and the task sections T7, T8, T9, T10 and T11. This file turns those into exact steps for the current code, and it
overrides PLAN.md in a few places. Each override is marked **(deviation)** with the reason. If this file and PLAN.md
disagree anywhere else, follow PLAN.md and write the difference down in your report. **T12–T17 are out of scope.**
T17 (opening Stage 3 to the campaign) needs Jason's explicit OK and is never part of this cycle.

---

## How to use this file

1. **Do ONE task per session**, in this order: **T7, then T8, then T9, then T10, then T11.** Never start the next task
   in the same session.
2. At the start of a session, read **§0 (setup checks)**, **your task's section** below and **your task's section in
   `docs/stage3/PLAN.md`** in full. Then begin. Each task section repeats the rules you need.
3. Find code by **searching for the quoted text** (for example `class Stage3Kit`, `startStage2() {`), never by line
   number. Earlier tasks move lines.
4. Finish with the **per-commit checks A–E**, then **commit**, then **stop and write a report**: the test count, the
   result of each check, the file sizes, every deviation, and anything you were unsure about.
5. If a **stop condition** is hit, do not commit. Report what happened and wait.
6. **Never** edit, loosen, skip or delete an existing test or helper. The one exception is T9's additive block at the
   **end** of `tests/hud-input.test.mjs` (no existing line changes). **Never** touch `main`. **Never** push to `rwb-w2`.
   **Never** merge.

**Expected test totals.** Each new test is named in its task section. The number must match exactly.

| After | New tests | Total |
|---|---|---|
| start (`36d4ba7`) | | **532** |
| T7 | 11 (`stage3-hazards.test.mjs`) | **543** |
| T8 | 8 (`stage3-audio.test.mjs`) | **551** |
| T9 | 3 (additive block in `hud-input.test.mjs`) + 4 (`stage3-hud.test.mjs`) | **558** |
| T10 | 4 (`stage3-flow.test.mjs`, part 1) | **562** |
| T11 | 8 (`stage3-flow.test.mjs`, part 2, appended) | **570** |

---

## 0. Setup checks (run at the start of every session)

```bash
git status                    # must be clean
git branch --show-current     # must be rwb-2-stage3-ag
git log --oneline -1          # T7 session: 36d4ba7. Later sessions: the previous task's commit
node --test tests/*.test.mjs  # must pass with the previous task's total (532 before T7)
```
If any of these is wrong, stop and report.

**Baselines (never recreate them, never overwrite them).**

1. **Stage 1:** the golden file is the committed `docs/stage1/evidence/full-stage-simulation.json`. Check B compares
   against it. Nothing to create.
2. **Stage 2:** the frozen fingerprint is the **8d8d17b capture** in `/workspace/ag/baselines-8d8d17b/`:
   - `s2-fingerprint.mjs`: the script (it resolves the repo from the current directory, so run it from the repo root);
   - `s2.base.json`: the baseline (9 seeds, all `"ended": true`).

   Stage 2's code changed after `5d24b29`, so **do not** recreate a baseline from `5d24b29` (the note in
   `BUILD-T3-T6.md` about that is out of date). Also do not recreate one from your own HEAD. `/tmp` may be empty in a new
   session, so always copy from the baselines directory:

```bash
cp /workspace/ag/baselines-8d8d17b/s2-fingerprint.mjs /tmp/s2-fingerprint.mjs
grep -c '"ended": true' /workspace/ag/baselines-8d8d17b/s2.base.json   # must print 9
```
If `/workspace/ag/baselines-8d8d17b/` or either file is missing, stop and report. Don't rebuild it.

**Sandbox note.** Some sandboxes return `EPERM` for child-process pipes (see HARDENING.md). If the **existing**
`stage2-flow` probe tests already fail that way at the §0 check, stop and report the environment. Don't add workarounds
to the repo.

---

## Per-commit checks A–E (every task runs all of them before committing)

```bash
# A. Full suite: the exact total for this task, 0 failures, no skip/todo
node --test tests/*.test.mjs

# B. Stage 1 golden: the diff must print NOTHING (hash fields excluded)
node tests/helpers/run-full-stage-simulations.mjs > /tmp/sim.json
diff <(jq 'del(.sourceSha256,.baseGitCommit)' /tmp/sim.json) \
     <(jq 'del(.sourceSha256,.baseGitCommit)' docs/stage1/evidence/full-stage-simulation.json)
#    Only if that printed nothing: refresh the hash fields, then re-run A (full-stage-evidence must pass)
cp /tmp/sim.json docs/stage1/evidence/full-stage-simulation.json

# C. Stage 2 fingerprint against the frozen 8d8d17b capture: must print SAME
node /tmp/s2-fingerprint.mjs > /tmp/s2.json && cmp /tmp/s2.json /workspace/ag/baselines-8d8d17b/s2.base.json && echo SAME

# D. Audit and file-size caps
node tools/audit-stage1.mjs
wc -c src/stage3.js src/darkfriends.js src/myrddraal.js src/stage3-hazards.js 2>/dev/null
#    stage3.js < 12288 · darkfriends.js <= 9216 · myrddraal.js <= 14336 · stage3-hazards.js <= 8192 (new, T7)

# E. Existing tests untouched: only new files appear, and nothing is removed
git diff --stat 36d4ba7 -- tests/
git diff 36d4ba7 -- tests/ | grep '^-[^-]'   # must print NOTHING
```

**Size caps: read this before T7.**

| File | Today | Cap | Headroom |
|---|---|---|---|
| `src/myrddraal.js` | **14336** | ≤ 14336 | **0 bytes** |
| `src/darkfriends.js` | 9058 | ≤ 9216 | 158 bytes |
| `src/stage3.js` | 11433 | < 12288 | ~855 bytes |
| `src/stage3-hazards.js` (new in T7) | — | ≤ 8192 | — |

- **`myrddraal.js` is exactly at its cap.** No task in this cycle edits it. Everything new for the boss (pool sprite,
  copy wisps, bursts, voice cues) goes through the kit hooks it **already** calls: `s.kit?.shadowPool`,
  `shadowPoolEnd`, `shadowBurst`, `copyWisps`, `copyGone`, `glint`, `hint` and `stats`. If you think `myrddraal.js`
  needs a change, stop and report. Never minify, shorten names or delete comments to make room.
- **`darkfriends.js` is not edited either.** It already calls `s.kit?.dropMarker`, `telegraph` and `hint`, and
  `sfx.hiss?.()`.
- **`stage3.js` has about 855 bytes.** T7 spends at most ~200 of them (stage3.js ≤ **11700** after T7). T11's
  `STORY3_SCRIPT` needs ~350. All the hazard code goes in the **new** `src/stage3-hazards.js`.
- **Never raise a cap silently.** If a file would cross its cap, stop and report the byte count.

Before committing, run `git status` and stage only the files the task allows, plus the evidence JSON. Never commit
anything from `/tmp` or `/workspace/rwb-voice/`. Commit messages are plain (given per task).

---

## T7 · Stage 3 hazards and set pieces (PLAN T7)

- **Create:** `src/stage3-hazards.js`, `tests/stage3-hazards.test.mjs` (11 tests).
- **Edit:**
  - `src/stage3.js`: only the four edits in step 6;
  - the evidence JSON (check B only).
- **Do not touch:** `src/myrddraal.js`, `src/darkfriends.js`, `src/stage2.js`, `src/stages.js`, `src/stage1.js`,
  `src/fx.js` (use the existing `impact`, `thump`, `dust` and `embers`), `src/hud.js`, `src/audio.js` (T8 adds the
  SFX; call them as `sfx.tileRattle?.()`), every existing test and helper, every image, `ART_STATUS.json`.

**Deviations from PLAN T7 (write them in your report):**
- **Tests go in a new file, `tests/stage3-hazards.test.mjs`,** not in `tests/stage3-kit.test.mjs`. Adding to an
  existing file would break check E.
- **The ribbon is not lifted into a mixin.** `Stage3Kit` already extends `Stage2Kit`, so `dropRibbon`/`collectRibbon`
  are shared by inheritance. Lifting them would edit `stage2.js` and risk check C for no gain. Test 11 proves that Stage 3
  uses the inherited code.
- **Drop-in markers:** T4's cutthroat already grows its own `shadow` as the marker (`Cutthroat.sync`). The kit hook
  `dropMarker(e)` only tracks the cutthroat for `threats().drops` and counts it. It adds no sprite.
- **Fear vignette and torch dimming** are already done by `Myrddraal.tickLook` (T6). T7 adds nothing for them. Test 5
  only checks that pause freezes them.
- **`threats()`** keeps every Stage 2 key, because `stage3-kit.test.mjs` asserts `arrows`/`sky`/`beams`/`torches`
  arrays and `volley === null`. It **adds** `tiles`, `drops`, `pools`, `copies` and `aura`.

**Steps**
1. Read PLAN T7, §1.2 (zone 2 row) and §2.5 in full. Then read these, by search:
   - `class Stage2Kit` in `src/stage2.js`: `bandOf`, `startVolley`, `updateVolley`, `clearHazards`, `threats`,
     `applyLightBudget`, `makeTextures` (the `lanemark` texture), `onZoneClear`;
   - `VOLLEY_BANDS` in `src/stages.js`;
   - every `s.kit?.` call in `src/myrddraal.js` and `src/darkfriends.js`.
2. Create `src/stage3-hazards.js`. The header comment says what it holds. Imports: `VW`, `LANE_TOP`, `LANE_BOT`,
   `clamp`, `rand`, `pick` from `./config.js`; `sfx`, `say` from `./audio.js`; `VOLLEY_BANDS` from `./stages.js`;
   `Stage2Kit`, `MID_Y` from `./stage2.js`. Export:
   - `export const TILES = Object.freeze({ zone: 2, warn: 0.9, speed: 900, every: Object.freeze([3.0, 4.2]), dmg: 9,
     enemyDmg: 14, hitDx: 60, hitZ: 90 })`;
   - `export const TILE_BANDS = VOLLEY_BANDS`. These are the lane thirds, computed from `LANE_TOP`/`LANE_BOT`. **Never
     hard-code band pixels.**
   - `export class Stage3Hazards extends Stage2Kit`.
3. In `Stage3Hazards`:
   - **`constructor(s)`:** `super(s)`; then `this.tiles = []; this.drops = []; this.pools = []; this.copies = [];
     this.bursts = []; this.glimpse = null; this.glimpsed = false; this.roofSaid = false; this.tileT = TILES.every[0];`
     and `Object.assign(this.stats, { tiles: 0, tileHits: 0, tileEnemyHits: 0, dropins: 0, pools: 0, bursts: 0,
     glimpses: 0 })`. **Don't reset `stats.dropins`**: `Cutthroat.onLand` already bumps it. Merge, never overwrite.
   - **Roof tiles: `updateTiles(dt)`.** Tiles run only when `s.zoneI === TILES.zone && s.zone && s.locked && s.wave >= 0
     && !s.victoryPending && !s.ended`, and at most one at a time (`this.tiles.length === 0`). Count `tileT` down by
     `dt`. At ≤ 0 call `startTile()` and set `tileT = rand(...TILES.every)`.
   - **`startTile()`:**
     - `rb = Math.max(0, this.bandOf(R.y))`. Riley's band is **always** marked.
     - With `Math.random() < 0.5`, mark one more band: `rb === 1 ? pick([0, 2]) : 2 - rb`. This **adjacency rule**
       keeps the safe band next to Riley's band, so the walk to safety is at most one band (~40 px). Write a comment
       saying so.
     - Markers: `this.img('lanemark', s.camX + VW / 2, (y0 + y1) / 2, 950).setDisplaySize(VW + 80, y1 - y0)
       .setTint(0xffb040).setAlpha(0.5)` per band. That is the existing Stage 2 texture with a warm tint, not new art.
     - Push `{ bands, markers, t: 0, dir, x: null, img: null, hit: new Set(), frame: 0, dustT: 0 }` with
       `dir = pick([-1, 1])`.
     - Call `sfx.tileRattle?.()` and `this.hint('tiles', 'ROOF TILES! CHANGE LANES!')`.
     - On the first tile of the run only, `say('riley_st3_roof_01', s.caption, false)` and set `roofSaid`. The line is
       silent until T8 adds it; `say` returns early for unknown ids.
     - `this.stats.tiles++`.
   - **Per tile, per frame:**
     - `k.t += dt`; markers follow the camera (`setPosition(s.camX + VW / 2, m.y)`) and pulse alpha the way
       `updateVolley` does.
     - At `k.t >= TILES.warn`: if `k.img` is null, create the sweep at the screen edge:
       `x = dir > 0 ? s.camX - 120 : s.camX + VW + 120`, the image `this.img('rooftiles', x, bandMidY, 1000 + y1)` with
       `.setLighting(true)`. Destroy the markers then.
     - Then `k.x += dir * TILES.speed * dt`. Step the sheet frame from `k.t` (8 fps, `img.setFrame?.(f)`). Emit dust
       through `s.fx.dust.emitParticleAt(k.x, y, 1)` at most every 0.05 s (`dustT`).
     - **Hits:**
       - Riley: if `R.alive && k.bands.includes(this.bandOf(R.y)) && Math.abs(R.x - k.x) < TILES.hitDx && R.z <
         TILES.hitZ && !k.hit.has(R)`, add him to `hit`; if `R.takeHit({ dmg: TILES.dmg, kind: 'heavy', kb: 300 * dir,
         down: true }, { x: k.x - dir })` returns true, `stats.tileHits++`, `s.fx.impact('heavy', R.x, R.y - 150, 1)`.
         The plain `{ x }` source with `down: true` is what Riley's `takeHit` grab filter lets through and what breaks a
         hold (T4/T5).
       - Enemies: the same test on each `e.canBeHit` enemy, with `dmg: TILES.enemyDmg`, `launch: 200`, `down: true`;
         `stats.tileEnemyHits++`.
     - When the tile is more than 140 px past the far screen edge, destroy it and remove it (index loop, no `slice`).
   - **Pools:**
     - `shadowPool(pool)`: create `this.img('shadowpool', pool.x, pool.y + 2, 905)`, unlit, alpha 0.4 and small. Push
       `{ pool, img }` and return it (the Fade stores it as `pool.fx`). `stats.pools++`.
     - Every frame, from `pool.t` (the Fade advances it): scale and alpha grow to full at `FADE.blink.poolWarn`. Import
       `FADE` from `./myrddraal.js`; that adds no bytes to `myrddraal.js`. The 4 frames step by `pool.t`.
     - `shadowPoolEnd(pool)` is **idempotent**: `const f = pool?.fx; if (!f) return; pool.fx = null;
       f.img.destroy();` and remove it from `this.pools`.
   - **Copy wisps:**
     - `copyWisps(copy)`: one emitter per copy, `s.add.particles(0, 0, 'smoke', { follow: copy.sprite, followOffset: {
       y: -10 }, lifespan: 700, speedY: { min: -40, max: -15 }, scale: { start: 0.35, end: 0.8 }, alpha: { start: 0.35,
       end: 0 }, tint: 0x20242c, frequency: thin ? 270 : 90 })`, depth `1000 + copy.y - 1`. Push `{ copy, em }`. Never
       more than 2.
     - `copyGone(copy)` is **idempotent**: find the entry, `em.destroy()`, remove it.
   - **Bursts:** `shadowBurst(x, y)` adds `this.img('shadowburst', x, y - 100, 1000 + y + 2)`, unlit, and pushes `{ img,
     t: 0 }`. Update steps 6 frames at 12 fps by `t` and destroys it at `t >= 0.5`. `stats.bursts++`.
   - **Drops:** `dropMarker(e) { this.drops.push(e); }`. In update, remove any entry whose `state !== 'dropin'` (index
     loop).
   - **Glimpse: `onZoneClear(i)`.** **Do not call `super.onZoneClear`**: Stage 2's version reads `STAGE2.zones[i]` and
     would run the stable collapse. Instead:
     - auto-collect a ribbon left on the ground, exactly like Stage 2: `for (const p of s.pickups.slice()) if (p.kind
       === 'ribbon') { this.collectRibbon(p); s.removePickup(p); }`. This is a zone event, not a hot loop.
     - Then, if `i === TILES.zone && !this.glimpsed`: `glimpsed = true`. Create `this.glimpse = { img:
       s.add.image(0, MID_Y - 330, 'fade_far', 0).setScrollFactor(0.3, 1).setDepth(-60), t: 0 }`, unlit, starting just
       off the left edge of the screen at parallax 0.3. Call `say('riley_st3_glimpse_01', s.caption, false)` and
       `stats.glimpses++`.
     - In update, the glimpse moves right at 700 px/s, steps its 4 frames at 10 fps, and is destroyed (and set to null)
       once it is past the right edge. It plays once per kit, which is once per run.
   - **`updateHazards(dt)`:** `if (this.s.paused) return;` then tiles, pools, wisps (set `em.frequency` from
     `s.fx.quality >= 2` only when it changes), bursts, drops and the glimpse. No `filter`/`map`/`slice`/closures here.
   - **`clearHazards()`:** `super.clearHazards()`. Then destroy every tile image and marker, every pool image (and set
     its `pool.fx = null`), every wisp emitter, every burst and the glimpse image. Empty all arrays, set `glimpse =
     null` and reset `tileT`. **Calling it twice must be safe.**
   - **`threats()`:** `return { ...super.threats(), tiles: this.tiles, drops: this.drops, pools: this.pools, copies:
     this.copies, aura: !!this.s.boss?.auraActive };`
4. Lights: **none.** Tiles, markers, pools, wisps, bursts and the glimpse own no light. (The tile image uses
   `setLighting(true)` so it is lit *by* torches, like the arrows. That adds no light.)
5. Read the frame counts of `rooftiles`, `shadowpool` (4), `shadowburst` (6) and `fade_far` (4) from the sheet widths
   ÷ 256 and from PLAN §4.1. If a sheet doesn't divide into whole 256 px frames, or its count differs from PLAN, stop.
6. In `src/stage3.js` (budget: the file stays ≤ **11700** bytes):
   1. replace `import { Stage2Kit, MID_Y } from './stage2.js';` with `import { MID_Y } from './stage2.js';` plus
      `import { Stage3Hazards } from './stage3-hazards.js';`;
   2. `export class Stage3Kit extends Stage2Kit {` becomes `export class Stage3Kit extends Stage3Hazards {`;
   3. at the end of `update(dt)`, after the `updateSticks` line, add `this.updateHazards(dt);`;
   4. delete the line `onZoneClear(i) {}` so the inherited `Stage3Hazards.onZoneClear` runs.

   Change nothing else. `Stage3Kit.destroy()` already calls `super.destroy()`, which calls `this.clearHazards()`. Its
   boss `clearAbilities()` runs first, so any burst it causes is destroyed by `clearHazards`.
7. Create `tests/stage3-hazards.test.mjs` with `stage3Simulation`, `arena`, `placeC` and `withSeed` from
   `./helpers/stage3-harness.mjs`. Put the arena in zone 2 with `s.zoneI = 2; s.zone = STAGE3.zones[2]; s.locked =
   true; s.wave = 0;`. Restore anything you set on `q`/`globalThis` in `finally`; always `h.destroy()`. Copy the 11
   names exactly:
   1. `roof tiles mark lane-third bands at least 0.9 s ahead, only on the rooftops, and always leave a safe band next to
      Riley`:
      - `TILE_BANDS` deep-equals the thirds computed from `LANE_TOP`/`LANE_BOT`;
      - seeds 1–5 × Riley in each band × 6 tiles: `bands.length ∈ {1, 2}`, includes Riley's band, and some unmarked
        band is adjacent to it;
      - no tile image exists before `t >= 0.9`;
      - ≤ 1 tile at a time;
      - in zones 0, 1 and 3, 20 s produce 0 tiles.
   2. `Riley in a safe band is never hit; Riley in the marked band at strike time is hit once for 9 and knocked down`:
      `s.god = false`, hp checked; `stats.tileHits` is 0 or 1.
   3. `a safe band is reachable within the warning from every band, even from mid-combo or hurt`:
      - start in each band at its worst-case `y` (the edge farthest from the nearest safe band);
      - start states `idle`, `combo3` (press attack 3× just before the mark) and `hurt` (a 1-dmg hit just before the
        mark);
      - hold up or down toward the safe band through the real input path;
      - assert Riley's band is unmarked **before** the tile's x reaches his x, and by `t <= 0.9 + 1/60`.

      Uses walk speed (125 px/s vertical, `riley.js`); **never** a speed or `warn` change to pass.
   4. `tiles hit enemies for 14 and break a cutthroat's hold`: a zealot in a marked band loses 14 hp and is downed; a
      held Riley in a marked band ends with `grabbedBy === null` and `stats.breaks === 1`.
   5. `pause freezes the tile, pool and fear timers`: after `s.setPauseReason('manual', true)` and 120 steps, the tile
      `t`, the pool `t`, `boss.fear`, `boss.st` and `tileT` are unchanged; after resume they advance.
   6. `the worst-case phase-3 garden keeps active lights at 10 or fewer, and hazards add no lights`:
      - camX 3920, a Myrddraal in phase 3 with 2 copies, the aura on → dispelled by a fireball → on again;
      - a fire shield, a pickup, the ribbon, 4 lit torches;
      - every frame for 3 s, `kit.lightBudget.active <= 10` (read after the scene's own `applyLightBudget`);
      - creating a tile, a pool, 2 wisps, 3 bursts and the glimpse leaves `h.resources().lights` unchanged.
   7. `clearHazards at victory destroys every tile, marker, pool, wisp emitter, burst and the glimpse`: every object has
      `dead === true`; all arrays are empty, `glimpse === null`, the inherited threats are empty; a second call doesn't
      throw; `bossDown` reaches it.
   8. `the Fade-far glimpse plays exactly once per run`:
      - `onZoneClear(2)` twice → `stats.glimpses === 1` and one `fade_far` image at scroll factor 0.3;
      - its frame advances, and it is destroyed after crossing;
      - `onZoneClear(0)`/`(1)` → none;
      - a restart → a new kit glimpses once again.
   9. `shadow pools, copy wisps and bursts follow the Myrddraal's own hooks`:
      - a blink makes exactly 1 pool image, removed at `blinkin`;
      - `makeCopies()` makes exactly 2 wisp emitters; popping a copy removes its emitter and adds a burst; the burst
        is gone 0.5 s later;
      - calling `shadowPoolEnd`/`copyGone` again is harmless.
   10. `threats() keeps the Stage 2 keys and adds tiles, drops, pools, copies and aura`: the four Stage 2 arrays and
       `volley === null` still hold; a dropping cutthroat is in `drops` until it lands; `aura` follows `auraActive`.
   11. `Stage 3 drops and collects Twinkle Toes' ribbon through the inherited Stage 2 code`:
       - `STAGE3.ribbon` makes a `ribbon` pickup in zone 1 wave 0;
       - collecting it → `kit.ribbons === 1`, `stats.ribbon === 1`, `hud.ribbon(1)` recorded;
       - an uncollected ribbon is auto-collected on zone clear;
       - `Stage3Kit.prototype.dropRibbon === Stage2Kit.prototype.dropRibbon`.
8. Run checks A–E. **Expected total: 543.** In check D, `stage3.js` ≤ 11700 and `stage3-hazards.js` ≤ 8192.
9. Commit with `T7: Stage 3 roof tiles, shadow FX, Fade glimpse and hazard cleanup`. Stop and report.

**Stop conditions for T7:**
- Check B or C fails, or any existing Stage 3 test fails (especially `stage3-kit`, `stage3-kit-cleanup`,
  `stage3-update-allocation`, `stage3-seeded-boss`).
- Test 3 only passes by lengthening `warn`, speeding Riley up or dropping the "mid-combo / hurt" cases.
- A sheet's frame count isn't a whole number or differs from PLAN §4.1.
- You'd need to edit `myrddraal.js`, `darkfriends.js`, `stage2.js`, `stages.js` or an existing test.
- `stage3.js` > 11700 or `stage3-hazards.js` > 8192.

---

## T8 · Audio: music loops, voices, SFX (PLAN T8, with Jason's overrides)

- **Create:**
  - `tools/tts-stage3-lines.py` (copied from `tools/tts-stage2-lines.py`);
  - `tools/stt-check-stage3.py`;
  - `assets/audio/stage3-voice-manifest.json`;
  - `docs/stage3/voice-stt-check.json`;
  - `assets/audio/music-stage3.mp3`, `assets/audio/music-boss3.mp3`;
  - 18 files `assets/audio/voice/<id>.mp3` (8 copied, 10 Kokoro);
  - `tests/stage3-audio.test.mjs` (8 tests).
- **Edit:**
  - `tools/music/compose.py`: two new score functions and two `TRACKS` entries;
  - `tools/music/music-manifest.json`: two new keys only;
  - `src/audio.js`: the `MUSIC.stage3`/`MUSIC.boss3` rows, 18 `EXTRA_VOICE` entries and 4 `sfx` methods;
  - `src/stage3-hazards.js`: the counter voice cue only (step 9);
  - `assets/audio/VOICE_PROVENANCE.md`, `assets/audio/AUDIO_PROVENANCE.md`: **append only**;
  - the evidence JSON.
- **Do not touch:**
  - `src/stage3.js` (`STAGE3_VOICES` fills itself from `EXTRA_VOICE` by its prefix regex);
  - `src/myrddraal.js`, `src/darkfriends.js`, `src/riley.js` (it already says `riley_escape_01`), `src/stages.js`;
  - every existing mp3, every Stage 1/2 manifest entry, the existing music files;
  - every existing test and helper.

**JASON'S OVERRIDES (these replace PLAN T8's Kokoro picks for these ids):**
- **These 8 ids are ElevenLabs takes, already recorded.** Copy them **byte-for-byte, same filenames**, from
  `/workspace/rwb-voice/stage3-eleven/` to `assets/audio/voice/`:
  `st3_story_02`, `st3_story_04`, `cutthroat_intro_01`, `cutthroat_grab_01`, `fade_intro_01`, `fade_mid_01`,
  `fade_split_01`, `fade_defeat_01`.
  - Copy only the `.mp3` files. **Don't copy `fade_intro_01.mp4` or `SCRIPT.md`.**
  - Don't re-encode, trim, normalise or pitch them.
- **Provenance:** ElevenLabs, model **`eleven_v4`**. Voices:
  - Basel Gill (`st3_story_02`, `st3_story_04`): **Grandfather Joe**;
  - the cutthroat (`cutthroat_intro_01`, `cutthroat_grab_01`): **Eastend Steve**;
  - the Myrddraal (the four `fade_*` ids): **Branok**.

  Record the per-line direction tags from `SCRIPT.md` too. **Append** a Stage 3 section to `VOICE_PROVENANCE.md` and
  `AUDIO_PROVENANCE.md`. Don't rewrite the Stage 1/2 Kokoro history.
- **The Fade processing is skipped.** The Branok clips are already whispered, so PLAN's slow-down and reverb are **not**
  applied. Say so in the provenance.
- **Riley and the narrator stay on Kokoro** through `tools/tts-stage3-lines.py`, with the **same** Stage 2 casts
  (`riley`, `narrator` entries copied unchanged from `tts-stage2-lines.py`). The 10 Kokoro ids are `st3_story_01`,
  `st3_story_03`, `st3_story_05`, `st3_story_06`, `riley_escape_01`, `riley_st3_roof_01`, `riley_st3_glimpse_01`,
  `riley_counter_01`, `riley_st3_victory_01` and `riley_st3_clear_01`. Use the PLAN T8 table text exactly. Add
  `'Caemlyn'` to `PRON` with a phoneme hint, the way `Baerlon` is done.
- **The STT check is still required for all 18 Stage 3 ids**, including the 8 ElevenLabs ones.

**Steps**
1. Check the tools first: `which ffmpeg ffprobe fluidsynth`, `ls /usr/share/sounds/sf2/FluidR3_GM.sf2` and
   `python3 -c "import kokoro, soundfile, torch, midiutil, faster_whisper"`. If anything is missing, **stop and report
   before changing files.** Never fake audio or STT results.
2. **Voices: ElevenLabs.**
   - `cp /workspace/rwb-voice/stage3-eleven/{st3_story_02,st3_story_04,cutthroat_intro_01,cutthroat_grab_01,fade_intro_01,fade_mid_01,fade_split_01,fade_defeat_01}.mp3 assets/audio/voice/`
   - then `cmp` each copy against its source; every one must be identical.
3. **Voices: Kokoro.**
   - Create `tools/tts-stage3-lines.py` from `tts-stage2-lines.py`: change the header comment, keep only the `riley` and
     `narrator` casts, put the 10 Kokoro lines in `LINES`, and add the `Caemlyn` pronunciation hint. The processing
     chain is unchanged.
   - Run it to `/tmp/st3voice/`. Copy the 10 mp3s into `assets/audio/voice/`.
4. **Manifest.** Write `assets/audio/stage3-voice-manifest.json`. Use the same top-level shape as Stage 2's (`engine`,
   `cast`, `lines`), plus a per-line `source`:
   - each Kokoro line: the generator's fields (`id`, `who`, `text`, `speech_input`, `phonemes`, `duration_s`, `sha256`,
     `asset_path`) and `"source": "kokoro"`;
   - each ElevenLabs line: `id`, `who`, `text` (from `SCRIPT.md`), `direction`, `"source": "elevenlabs"`, `"model":
     "eleven_v4"`, `voice` (`"Grandfather Joe"` / `"Eastend Steve"` / `"Branok"`), `duration_s` (ffprobe), `sha256`,
     `asset_path`.
   - `engine` names both: `"Kokoro 0.9.4 / Kokoro-82M v1.0 (Riley, narrator); ElevenLabs eleven_v4 (Basel Gill,
     cutthroat, Myrddraal)"`.
5. **STT.** Write `tools/stt-check-stage3.py`:
   - faster-whisper `small.en` on CPU, the same model as Stage 2;
   - score = `difflib.SequenceMatcher(None, a, b).ratio()` over the words of `re.findall(r"[a-z0-9]+",
     s.lower().replace("'", ""))`. This reproduces Stage 2's recorded numbers: `st2_story_01` 0.929, `st2_story_04`
     0.783.

   Run it on all 18 ids. Write `docs/stage3/voice-stt-check.json` in the Stage 2 file's shape (`id`, `text`, `heard`,
   `word_match`).
   - **Every id must score ≥ 0.8.**
   - A Kokoro line under 0.8: improve its pronunciation hint (never the displayed text) and regenerate, at most 3 tries.
   - An **ElevenLabs** line under 0.8: **stop and report the scores**. Don't process, regenerate or replace Jason's
     takes, and don't lower the 0.8.
6. **Music.**
   - In `compose.py`, add `stage3()` (Caemlyn: warm city afternoon turning to dusk, about 100–108 bpm, a 28-bar loop)
     and `boss3()` (the Myrddraal: cold, low strings and choir, sparse percussion, about 120–140 bpm, 24–32 bars), each
     with a `"Title" - …` docstring like the others. Add `'stage3': (stage3, -16.0), 'boss3': (boss3, -15.2)` to
     `TRACKS`.
   - Generate only the two new tracks, into a scratch copy of the manifest, so no existing track is re-rendered:
     ```bash
     mkdir -p /tmp/mus && cp tools/music/music-manifest.json /tmp/mus/
     python3 tools/music/compose.py /tmp/mus stage3 boss3
     python3 tools/music/check_loops.py /tmp/mus        # every line OK (old tracks are absent there; see note)
     cp /tmp/mus/music-stage3.mp3 /tmp/mus/music-boss3.mp3 assets/audio/
     cp /tmp/mus/music-manifest.json tools/music/music-manifest.json
     git diff tools/music/music-manifest.json            # only the two new keys are added
     ```
     If `check_loops.py` fails on the missing old files in `/tmp/mus`, copy the 4 existing loop mp3s there first
     (read-only use). Each new file must be < 1.2 MB.
   - In `src/audio.js`, point `MUSIC.stage3`/`MUSIC.boss3` at the new urls with the manifest's `loopStart`/`loopEnd`
     (gain 1 and 0.94). Update the comment above `MUSIC` with the new tracks' loudness.
7. **Captions.** In `src/audio.js`, add the 18 `EXTRA_VOICE` entries after the Stage 2 block, under the comment
   `// Stage 3: Caemlyn and the Myrddraal (Kokoro TTS for Riley/narrator; ElevenLabs eleven_v4 for Gill, cutthroat,
   Myrddraal)`. Speakers: `NARRATOR`, `BASEL GILL`, `RILEY`, `CUTTHROAT`, `MYRDDRAAL`. The text is exactly the PLAN T8
   table.
   - **The mp3s and the `EXTRA_VOICE` entries must land in the same commit.** `tests/powers.test.mjs` requires a file
     for every `EXTRA_VOICE` id.
   - Don't touch `hud.js` here. T9 colours the new villain speakers.
8. **SFX.** In the `sfx` object, after the Stage 2 cues, under `// Stage 3 (Caemlyn) cues`, add `hiss`,
   `shadowWhoosh`, `tileRattle` and `torchIgnite`, built from `tone`/`noise` in the existing style.
   - **Each must begin with `if (!gate('<name>', ms)) return;`**, before any `vary(...)`. `gate` returns false with no
     AudioContext, so headless runs never call `Math.random` here. Otherwise the new SFX would shift Stage 3's seeded
     random stream and break `stage3-seeded-boss`.
9. **Counter voice cue.** `riley_counter_01` ("That one!") has no caller, and `myrddraal.js` can't grow. In
   `Stage3Hazards.updateHazards`, watch the stat instead:
   `const p = this.stats.parries || 0; if (p !== this.saidParries) { this.saidParries = p; if (p) say('riley_counter_01', this.s.caption, false); }`
   Initialise `this.saidParries = 0` in the constructor. `riley_escape_01` is already said by `riley.js`;
   `riley_st3_roof_01` and `riley_st3_glimpse_01` are already called by T7.
10. Create `tests/stage3-audio.test.mjs`. Copy the 8 names exactly:
    1. `every Stage 3 voice id has a small mp3, a caption and an STT match of at least 0.8`:
       - `STAGE3_VOICES` sorted deep-equals the 18 ids;
       - each file is > 2 KB and < 200 KB;
       - `EXTRA_VOICE[id]` has a speaker and text;
       - `voice-stt-check.json` has the id with `word_match >= 0.8`.
    2. `the ElevenLabs takes are recorded with their model, voice and hash, and Stage 1/2 provenance is kept`:
       - the 8 manifest entries have `source: 'elevenlabs'`, `model: 'eleven_v4'` and the right voice name, and each
         `sha256` matches the file;
       - `VOICE_PROVENANCE.md` contains `Grandfather Joe`, `Eastend Steve`, `Branok` and `eleven_v4`, and still
         contains `## Stage 2: Baerlon and the Whitecloaks (TTS)`.
    3. `the Kokoro Stage 3 lines reuse the Stage 2 Riley and narrator casts`: the manifest cast `riley`/`narrator`
       deep-equals `stage2-voice-manifest.json`'s; the 10 Kokoro hashes match the files.
    4. `Stage 3 music files exist with loop points inside the file, a loudness entry and recorded provenance`:
       - `MUSIC.stage3.url`/`boss3.url` are the new files, each < 1.2 MB;
       - each manifest entry has `loopStart === 0.25`, `loopEnd` = `0.25 + loopSeconds` (±1e-6), `bytes` = the file
         size, and a finite `lufs`;
       - `MUSIC` `loopEnd` = the manifest (±1e-6);
       - `AUDIO_PROVENANCE.md` names both files.
    5. `MusicDirector for Stage 3 plays stage3, then boss3, then the victory silence`: `title → stage → boss → victory`
       gives tracks `['title', 'stage3', 'boss3', null]`.
    6. `the equal-power crossfade still holds into and out of boss3`:
       - use the production audio backend through the same `vm` + `tests/helpers/audio-param.mjs` approach as
         `stage2-flow.test.mjs` (copy the small `audio()` setup into this file; don't import from or edit
         `stage2-flow`);
       - check the midpoint gain `Math.SQRT1_2 * gain` (±1e-9) and monotonic ramps.
    7. `the Stage 3 preload asks only for Stage 3 voices`:
       - `STAGE3_VOICES` ∩ `STAGE2_VOICES` is empty;
       - every voice the Stage 3 registry and kits use (`STAGE3.zones[*].intro`, `boss.introVoice`, `phaseLines`, the
         ids in `bossDown`'s source, the T7/T8 cue ids) is in `STAGE3_VOICES` or Stage 1's `VOICE`.
    8. `the new Stage 3 SFX are gated, quiet without an AudioContext, and draw no random numbers`: the 4 are functions;
       calling each 3× headless doesn't throw and leaves a `Math.random` call counter at 0.
11. Run checks A–E. **Expected total: 551.**
12. Commit with `T8: Stage 3 music, voices (ElevenLabs Gill/cutthroat/Myrddraal, Kokoro Riley/narrator) and SFX`.
    Stop and report the STT table and the music LUFS.

**Stop conditions for T8:**
- A tool from step 1 is missing.
- An ElevenLabs line scores < 0.8 in STT, or any copied file's `cmp` fails.
- `git diff` shows any change to an existing mp3, an existing manifest entry, or the Stage 1/2 provenance text.
- `stage3-seeded-boss` (or any Stage 3 test) changes result after adding SFX. That means a missing `gate` guard.
- A new music file is ≥ 1.2 MB or fails `check_loops.py`.

---

## T9 · HUD for Stage 3 (PLAN T9)

- **Create:** `tests/stage3-hud.test.mjs` (4 tests).
- **Edit:**
  - `src/hud.js`;
  - `tests/hud-input.test.mjs`: **one additive block appended after the last line** (3 tests). No existing line
    changes;
  - the evidence JSON.
- **Do not touch:** `src/stage1.js`, `src/stage3.js`, `src/stage3-hazards.js`, `src/myrddraal.js`,
  `src/darkfriends.js`, `src/riley.js`, `src/stages.js`, every other test and helper, any art.

**Deviations from PLAN T9:**
- **The hints already exist** through the kit's one-shot `hint(id, text)`: `grabbed`, `fear`, `copies`, `counter`.
  The Myrddraal's split hint reads `ONLY THE REAL ONE CASTS A SHADOW AND CATCHES THE TORCHLIGHT`, longer than PLAN's
  text, and `myrddraal.js` can't grow. Keep it. The test checks that it **starts with** `ONLY THE REAL ONE CASTS A
  SHADOW`.
- **Tests that need the simulation go in a new file.** `hud-input.test.mjs` stubs `Phaser` and `location` at the top,
  so its new block holds only the pure tests. The rest go in `stage3-hud.test.mjs`.
- **The watermark sits above the perf readout** (at `VW - 10, VH - 30`), because the perf text already uses the
  bottom-right corner.

**Steps**
1. Read PLAN T9, then `hud.js` by search: `bossBar(c)`, the `if (this.boss) {` block in `update`, `ribbon(n)`,
   `stageClear(s)`, `create()`.
2. Add pure exports near `clearPrompt`:
   - `export const MASH_NEED = 6;` with a comment that it mirrors `CUTTHROAT.mashNeed`. Don't import `darkfriends.js`
     into the HUD; test 4 pins the two equal.
   - `export function bossLabel(s, has = () => true)`:
     - for `s.stageNo === 3`, return `{ name: s.stageDef.boss.name, portrait: has(s.stageDef.boss.portrait) ?
       s.stageDef.boss.portrait : 'bossPortrait' }`;
     - otherwise return **exactly** today's values: name `s.stageNo === 2 ? 'JARET BYAR, CHILD OF THE LIGHT' :
       'TROLLOC CHIEFTAIN'`, portrait `s.stageNo === 2 && has('byarPortrait') ? 'byarPortrait' : 'bossPortrait'`.
   - `export function mashRing(R)`: `null` unless `R.state === 'grabbed' && R.grabbedBy`; else `{ fill: clamp01(
     R.grabbedBy.mashN / MASH_NEED) }`.
   - `export function fearArc(s)`: `null` unless `s.stageNo === 3 && s.boss && s.boss.alive && s.boss.phase >= 2 &&
     s.boss.auraOn`; else `{ fill: clamp01(s.boss.fear) }`.
   - `export const placeholderArt = s => Object.values(s.metas || {}).some(m => m && m.placeholder === true) ||
     s.cache?.json?.get?.('plates3')?.placeholder === true;`
3. In `update`, inside `if (!this.bossName)`: use `const L = bossLabel(s, k => this.textures.exists(k));` for the
   text and the image key. The Stage 1/2 output must stay character-identical.
4. Add `drawStage3Meters(s, g)`, called from `update` right after the boss-bar block:
   - **mash ring:** at screen `(R.x - s.camX, R.y - R.z - 300)`, a dark backing circle, then a light arc from −90° by
     `fill × 360°`;
   - **fear arc:** a thin dark-violet arc under Riley's feet (`R.y + 8`), filled by `fill`.

   Draw both on the existing `this.g` (already cleared each frame). No new objects, no text, no allocations.
5. **Watermark.** In `create()`, `this.phTag = this.add.text(VW - 10, VH - 30, 'PLACEHOLDER ART', { fontFamily: PX,
   fontSize: '10px', color: '#ffcc66', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 1).setVisible(false);` and
   `this.phShown = false`.
   - Add `updateWatermark(s) { const on = placeholderArt(s); if (on === this.phShown || !this.phTag) return;
     this.phShown = on; this.phTag.setVisible(on); }`, called from `update`.
   - It changes visibility only on change, never per frame. Stage 1/2 metas have no `placeholder: true`, so it never
     shows there.
6. **Ribbon.** In `stageClear`, change `s.stage === 2 && s.ribbons` to `s.stage >= 2 && s.ribbons`. `ribbon(n)`
   already works for Stage 3 (the kit inherits `collectRibbon`). Also extend the villain branch of `speakerColor` from
   `/TROLLOC|WHITECLOAK|BYAR/` to `/TROLLOC|WHITECLOAK|BYAR|CUTTHROAT|MYRDDRAAL/`. That changes no Stage 1/2 speaker's
   colour.
7. Append to `tests/hud-input.test.mjs`, after its last line, one block that starts with
   `// ---- Stage 3 HUD (T9; additive block) ----` and `const hud3 = await import('../src/hud.js');`. Use `await
   import('node:fs')` for files. No top-of-file changes. Copy the 3 names exactly:
   1. `Stage 3 boss bar shows THE MYRDDRAAL with the fadePortrait key`: `bossLabel({ stageNo: 3, stageDef: STAGES[3]
      })`; with `has` false the portrait falls back to `'bossPortrait'`.
   2. `Stage 1 and Stage 2 boss bar strings and portraits are unchanged`: deep-equal snapshots for stages 1 and 2,
      with `has` true and false.
   3. `PLACEHOLDER ART watermark shows with placeholder metas and hides when none is a placeholder`:
      - the real `assets/stage3/chars/*.anims.json` → true; the real Stage 1 metas from `assets/chars/` → false;
        `plates3.placeholder` true → true;
      - `updateWatermark` on a fake `phTag` calls `setVisible` only when the value flips (count the calls).
8. Create `tests/stage3-hud.test.mjs` (harness: `stage3Simulation`, `arena`, `placeC`, `withSeed`). Copy the 4 names
   exactly:
   1. `mash ring shows only while Riley is grabbed and each press fills it by one sixth`:
      - `null` before the grab;
      - after `startHold`, for each `c.mash()` the fill rises by exactly `1/6` (±1e-9), compared in the same frame;
      - `null` after the escape and after a throw;
      - `MASH_NEED === CUTTHROAT.mashNeed`;
      - `drawStage3Meters` on a recording `g` draws the ring only while grabbed.
   2. `fear arc shows only in Myrddraal phase 2 or later with the aura raised`: phase 1 with `fear` 0.5 → `null`;
      phase 2 before the aura → `null`; aura on → `fill === boss.fear`; Stage 1/2 bosses → `null`; `defeated` →
      `null`.
   3. `Stage 3 hints show once each per run and again after a restart`:
      - fire each real path twice: `startHold` (grabbed), `makeCopies` (copies), `startFear` stepped to its aura frame
        (fear), a cutthroat counter during `lunge` (counter);
      - the `flashText` records hold each text once;
      - the copies text starts with `ONLY THE REAL ONE CASTS A SHADOW`;
      - after `followRestart` each shows once again.
   4. `the ribbon counter and clear card carry Stage 3's ribbon`: collecting the Stage 3 ribbon records `ribbon(1)`;
      `stageClear({ stage: 3, ribbons: 1, … })` adds `TWINKLE TOES' RIBBON FOUND`; stage 1 doesn't; stage 2 is
      unchanged.
9. Run checks A–E. **Expected total: 558.**
   - Check E is special for T9: `git diff 36d4ba7 -- tests/hud-input.test.mjs` shows **only `+` lines after the last
     original line**, and `git diff 36d4ba7 -- tests/ | grep '^-[^-]'` still prints nothing.
10. Commit with `T9: Stage 3 HUD boss bar, mash ring, fear arc and placeholder tag`. Stop and report.

**Stop conditions for T9:**
- Any Stage 1/2 boss string or portrait changes, or check B/C fails.
- A test needs an existing `hud-input` line changed, or the block can't run after the file's top-level stubs.
- The meters need new art, new `Text` per frame, or a new texture.

---

## T10 · Title stage select, 3 stages when flagged (PLAN T10)

- **Create:** `tests/stage3-flow.test.mjs` (part 1, 4 tests).
- **Edit:** `src/hud.js` (`STAGE_NAMES`, `titleSelect`, one import), the evidence JSON.
- **Do not touch:**
  - `src/stage1.js`: `selectStage` already clamps with `maxStage(q)`, and `start()` already restarts with `{ stage:
    titleSel, autostart: true }`;
  - `src/stages.js`: `STAGE3.loading` is already `'Loading Caemlyn…'`;
  - every existing test and helper.

**Deviations from PLAN T10:**
- **The title-select sequence is `[2, 3, 2]`, not `[2, 3, 3, 2]`.** `selectStage` only calls `hud.titleSelect` when
  the stage changes. A clamped third "right" makes no call. Making it call on a clamp would break the existing flag-off
  assertion `[2, 1, 2]` in `stage2-flow.test.mjs`. That rule is frozen.
- **The 120×100 arrow tap targets already exist** (`stage2-power-bypass.test.mjs` covers them). T10 only proves that
  they reach Stage 3 under the flag.

**Steps**
1. Read PLAN T10 and §2.1. In `hud.js`, search `STAGE_NAMES` and `titleSelect(n) {`.
2. Add `3: 'STAGE 3 · CAEMLYN — THE MYRDDRAAL'` to `STAGE_NAMES`. Without the flag it is never shown, because selection
   clamps at 2.
3. `import { maxStage } from './stages.js';` and `q` from `./config.js` (it already imports `VW`, `VH`). In
   `titleSelect`, change `n < 2` to `n < maxStage(q)`. Flag off, `maxStage` is 2, so the alpha is identical to today.
4. Create `tests/stage3-flow.test.mjs`:
   - use `stage1Simulation`/`withSeed` from `./helpers/stage1-simulation.mjs`;
   - set `q.set('s3', '1')` only inside each flag-on test and `q.delete('s3')` in `finally`;
   - for the tap test, copy the small `titleHUD()` fake from `stage2-power-bypass.test.mjs` into this file (don't
     import or edit it).

   Copy the 4 names exactly:
   1. `flag on: title select clamps at 3 and reports [2, 3, 2] for right, right, right, left`: `titleSel` is 2, 3, 3,
      2; the music is `title`.
   2. `flag off: title select still clamps at 2 and never names Stage 3`: `[2, 1, 2]` as before; the right arrow's alpha
      is 0.25 at 2; no `titleSelect(3)` call.
   3. `flag on: the 120×100 arrow targets select STAGE 3 · CAEMLYN and dim the right arrow at 3`: tap the right
      arrow's corners (±59, ±49) → `titleSel` 3, the label is `STAGE_NAMES[3]`, the right alpha is 0.25, the left is 1,
      no `start` pressed.
   4. `starting with Stage 3 selected restarts into { stage: 3, autostart: true } and loads Caemlyn`: `restartData` is
      `[{ stage: 3, autostart: true }]`; `STAGES[3].loading === 'Loading Caemlyn…'`. Stop stepping right after the
      restart is recorded; don't build Stage 3 in this unpatched simulation.
5. Run checks A–E. **Expected total: 562.**
6. Commit with `T10: three-stage title select behind s3=1`. Stop and report.

**Stop conditions for T10:**
- `stage2-flow`'s `[2, 1, 2]` test, or `stage2-power-bypass`'s tap tests, fail.
- The flag-off title changes in any way (text, alpha, hit area).
- You'd need to edit `selectStage` or `start` in `stage1.js`.

---

## T11 · Stage 3 story beat and campaign flow, flagged (PLAN T11)

- **Create:** `tests/helpers/stage3-query-probe.mjs` (new helper). Append part 2 (8 tests) to the end of
  `tests/stage3-flow.test.mjs`. Don't change any T10 line.
- **Edit:**
  - `src/stage3.js`: `STORY3_SCRIPT` only;
  - `src/stage1.js`: one import line, `startStage3()`, the `STAGES[3].start` body;
  - `src/hud.js`: `clearPrompt` and `stageClear` (the prompt only);
  - the evidence JSON.
- **Do not touch:** `src/stages.js` (`STAGE2.next` already returns `{ stage: 3, fromStage2: true, autostart: true }`
  with the flag, and `STAGE3.next` already returns `{ stage: 1 }`), `src/music.js`, `tests/helpers/stage-query-probe.mjs`
  and every other existing helper and test, art.

**Rules and deviations:**
- **Everything stays behind `s3=1`.** Without the flag, every Stage 1/2 path is byte-identical in behaviour.
- **Q3 (carry-over) is Jason-gated and defaults to RESET.** Score and lives are **not** carried from 2 to 3. Don't add
  `score`/`lives` to any restart data. Test 7 pins the reset, and the report must say "Q3 carry-over not implemented
  (Jason-gated)".
- **(deviation)** PLAN says to use `stage-query-probe.mjs`. That helper reads every character meta from
  `assets/chars/`, but `cutthroat`, `fade` and `riley3` live in `assets/stage3/chars/`, so it can't probe Stage 3.
  Create a new `tests/helpers/stage3-query-probe.mjs`, modelled on it:
  - read metas from `assets/stage3/chars/` for `STAGE3_ATLASES` and from `assets/chars/` otherwise;
  - mark Stage 2's textures and characters as resident;
  - run `stage3Simulation`;
  - print the same JSON fields.

  **Never edit the old probe.**

**Steps**
1. Read PLAN T11, §1.1 and §2.1. Search `startStage2() {`, `STAGES[3].start`, `startCutscene(` and `clearPrompt`.
2. In `src/stage3.js`, after `STORY3_PANELS`, add (same shape as `STORY_SCRIPT` in `stage2.js`):
   ```js
   export const STORY3_SCRIPT = Object.freeze([
     ['st3_story_01', 0, D1], ['st3_story_02', 1, D2], ['st3_story_03', 1, D3], ['st3_story_04', 1, D4], ['st3_story_05', 1, D5], ['st3_story_06', 2, D6],
   ].map(([id, panel, voice]) => Object.freeze({ id, who: EXTRA_VOICE[id][0], text: EXTRA_VOICE[id][1], panel, voice })));
   ```
   - `D1`…`D6` are the `duration_s` values from `assets/audio/stage3-voice-manifest.json`, rounded to 2 decimals.
   - Panels follow PLAN §4.2: 0 = the city gate, 1 = Gill in the Queen's Blessing, 2 = the rooftops at sunset.
   - `stage3.js` must stay < 12288. If it wouldn't, stop and report the byte count. Don't move code to make room.
3. In `src/stage1.js`:
   - extend the existing `./stage3.js` import with `STORY3_SCRIPT, STORY3_PANELS`;
   - add `startStage3()` right after `startStage2()`:
     ```js
     startStage3() {
       this.kit.start();
       if (q.get('story') === '0' || this.stageData.story === false) { this.music?.set('stage'); return; }
       this.startCutscene(STORY3_SCRIPT, STORY3_PANELS, how => { this.storyResult = how; this.music?.set('stage'); });
     }
     ```
   - make the `STAGES[3].start` body `scene.startStage3();`.

   Stage 3 can only start with the flag, so Stage 1/2 are unaffected. The harness sets `story=0`, so the existing
   Stage 3 tests still skip the beat.
4. In `src/hud.js`:
   - `clearPrompt(stage, touch, next)`: with `next === 3`, return `` `${verb} TO CONTINUE TO STAGE 3` ``; with `stage
     === 3`, return `` `${verb} TO RETURN TO THE TITLE` ``. Every other result stays exactly as today.
   - In `stageClear(s)`, pass `this.stage?.stageDef?.next?.(q)?.stage` as `next`.
   - Flag off: Stage 1 still says `CONTINUE TO STAGE 2`, Stage 2 still says `RETURN TO THE TITLE`.
5. Create `tests/helpers/stage3-query-probe.mjs` as described above. Run with `RWB_SEARCH`, exactly like the old probe.
6. Append to `tests/stage3-flow.test.mjs`, after T10's last line, under `// ---- part 2: story beat and campaign
   flow (T11) ----`. Copy the 8 names exactly:
   1. `?stage=3&s3=1 queues only Caemlyn art, releases Stage 2's own art and builds four zones with the boss last`:
      - `far3_day`, `mid3a`, `story3_panel_1`, `plates3`, `lights3`, `cutthroat.A` queued;
      - `far2`, `mid2a`, `story_panel_1`, `byar-0` released and not queued;
      - `riley-`/`hound-`/`loial-` not released;
      - `zones === 4`, `boss === true`, `stageNo === 3`;
      - a second probe, `?stage=3` without `s3`, gives `stageNo === 1`.
   2. `the Stage 3 story beat plays six lines on three panels; Attack advances and Start skips`:
      - without `story=0`, `showCutscene` gets `STORY3_PANELS`; the music is `cutscene`; the scene is paused;
      - pressing `attack` advances `cutsceneLine` ids in `STORY3_SCRIPT` order;
      - `start` ends it with `storyResult === 'skip'`; the music is `stage`.
   3. `story=0 skips the Stage 3 story beat entirely`: no `showCutscene`; the music is `stage`; `kit.start` ran once.
   4. `flag on, clearing Stage 2 restarts into Stage 3; flag off it still returns to Stage 1`:
      - Stage 2 sim with `story=0`;
      - set `s.ended = s.clearShown = true` and call `s.onPress('attack')`;
      - `restartData.at(-1)` is `{ stage: 3, fromStage2: true, autostart: true }` (flag on) or `{ stage: 1 }` (flag
        off);
      - the clear prompt reads `CONTINUE TO STAGE 3` (flag on) or `RETURN TO THE TITLE` (flag off).
   5. `clearing Stage 3 returns to the title with { stage: 1 }`: in `stage3Simulation`, the same press → `{ stage: 1
      }`; the prompt is `RETURN TO THE TITLE`.
   6. `continuing after a game over in phase 3 resumes boss3 without restarting it`:
      - reach the boss (`?skip=boss` path or `startBoss`), phase 3;
      - force a game over, then `continueGame()`;
      - the last music log entry is `boss3` with `restart === false` and `fade === FADES.resume`.
   7. `score and lives reset between Stage 2 and Stage 3 (Q3 carry-over is off)`: Stage 2's flag-on `next` has no
      `score`/`lives` keys; a fresh `stage3Simulation` Riley starts with score 0 and the default lives.
   8. `STORY3_SCRIPT is six Stage 3 voice lines with captions, panels 0–2 and recorded clip lengths`:
      - the ids are `st3_story_01..06` in order, each in `STAGE3_VOICES`;
      - `who`/`text` = `EXTRA_VOICE`; panels `[0, 1, 1, 1, 1, 2]`;
      - `voice` within 0.01 s of the manifest `duration_s`.
7. Run checks A–E. **Expected total: 570.** Also `git diff HEAD -- tests/stage3-flow.test.mjs | grep '^-[^-]'` must
   print nothing (T10's lines untouched).
8. Commit with `T11: Stage 3 story beat and flagged campaign flow`. Stop and report, then do the **Final steps**.

**Stop conditions for T11:**
- Any `stage2-flow` or `stage2-campaign` assertion fails (the four §2.1 assertions are frozen until T17).
- The probe fails with `EPERM` (report the environment; don't work around it in the repo).
- Score or lives would need carrying (that is Jason's Q3; don't do it).
- `stage3.js` ≥ 12288.

---

## Art and content rules (every task)

- **Placeholder art only.** Use T2's labelled placeholders as generated: `rooftiles`, `shadowpool`, `shadowburst`,
  `fade_far`, `fadePortrait`, `story3_panel_1..3`, the `cutthroat`/`fade`/`riley3` atlases. Don't edit any image or
  `ART_STATUS.json`. Real art is swapped in later (T14), one file at a time.
- **Never fake art.** No recolouring or tinting into a new look, blurring, stretching, interpolating, mirroring into
  "new" frames, generating, or drawing shapes in place of a sprite or plate. **Flipping a sprite to face the other way
  is fine.**
- **Allowed, because none of these is new art:**
  - tinting the existing `lanemark` warning stripe (a UI marker, like Stage 2's red volley bands);
  - HUD meters drawn as plain arcs on the HUD graphics (PLAN T9 "existing UI shapes");
  - the `PLACEHOLDER ART` text tag;
  - wisps from the existing `smoke` particle texture.
- **No substitute frames.** If a sheet or anim is missing, stop and report.
- **Riley stays on-model** in every line, caption and doc you write: 16, very muscular, short dark hair, thin
  blue-framed glasses, sleeveless black Asha'man coat. Never a kid.
- **Kid-safe:** tiles knock Riley down, they don't hurt him; cutthroats are KO'd (stars) or flee; the Fade melts into
  shadow. Twinkle Toes is only a ribbon or a bundle, never shown in peril. Voice lines are exactly the PLAN T8 text.

---

## Frame-rate budget (every task)

- **Lights (PLAN §2.5, `maxLights` 10).** The worst case stays hero 1 + torches 4 + fireball 1 + pickup 1 + ribbon 1 +
  power 1 = **9 ≤ 10**.
  - T7–T11 add **zero** lights. Tiles, markers, pools, wisps, bursts, the glimpse, the HUD meters and the watermark are
    all unlit.
  - The sun stays removed at night. The fear aura only dims existing torch radii (T6).
  - `applyLightBudget` (inherited) still caps the visible lights at 10. T7 test 6 asserts both.
  - No `setPipeline`, no shaders, no extra filters. Reuse `s.vignette`.
- **No per-frame allocations in hot code** (`updateHazards`, the tile, pool and burst loops, `drawStage3Meters`,
  `updateWatermark`):
  - index loops with in-place `splice` for removal, never `slice()`/`filter`/`map`/closures per frame;
  - constants hoisted to frozen module objects (`TILES`);
  - the tile `hit` `Set` is made once per tile, not per frame;
  - HUD text changes only on state change (`updateWatermark`), never per frame;
  - `threats()` makes one object per call, as Stage 2's already does.
- **Pooling and lifetime.**
  - At most 1 tile, 1 pool, 2 wisp emitters (one per copy), a few short bursts (0.5 s each) and 1 glimpse per run.
  - Dust reuses `s.fx.dust` at most every 0.05 s. Emitters thin at `s.fx.quality >= 2`.
  - Every timer is `dt`-based. **No `scene.time.delayedCall` in any new code.** T11 uses the existing
    `startCutscene`.
  - `clearHazards` and `destroy` free everything, and are safe to call twice.
- **Textures and memory.**
  - No new texture keys. Every sheet is already queued by `queueStage3` and listed in `STAGE_TEXTURES[3]`.
  - Voices: only `STAGE3_VOICES` are preloaded (`Stage3Kit.start`), each < 200 KB. Music: ≤ 2 tracks decoded at once,
    each file < 1.2 MB.
- **How to measure.**
  - Headless: `h.resources().lights`, `kit.lightBudget`, `h.observations.peak`.
  - Browser, if you have one: `?stage=3&s3=1&demo=1`, press **H**, read `window.__perf.summary.fight`. Do 3 reps each
    of Stage 1 boss, Stage 2 boss, Stage 3 rooftops (zone 2, tiles) and Stage 3 boss (`&skip=boss`), at `36d4ba7` and
    at your head.
  - Report average fps and frames over 33 ms first, and whether the renderer was software.
  - With no browser, write "not measured". **Never invent numbers.**

---

## Common risks

| Risk | What to do |
|---|---|
| Line numbers are out of date | Search for the quoted code and re-read the whole function before editing. |
| A file would cross its size cap | Stop and report the bytes. `myrddraal.js` has 0 bytes free: use the kit hooks. Never minify or raise a cap. |
| Check C fails | Compare against `/workspace/ag/baselines-8d8d17b/s2.base.json` only. Stage 2 code isn't touched in this cycle, so a diff means a shared path changed (`hud.js`, `audio.js`, `stage1.js`): find it. Never regenerate the baseline. |
| New SFX shift Stage 3's random stream | Every new `sfx` method starts with `if (!gate(...)) return;` before `vary`. |
| `onZoneClear` runs Stage 2's stable collapse | `Stage3Hazards.onZoneClear` never calls `super.onZoneClear`. |
| `threats()` loses a Stage 2 key | Spread `super.threats()` first; `stage3-kit` test 8 checks `volley === null`. |
| A double teardown (victory, then shutdown) | `clearHazards`, `shadowPoolEnd` and `copyGone` are idempotent; `pool.fx` is nulled. |
| `powers.test.mjs` fails on a missing mp3 | `EXTRA_VOICE` entries and their mp3s land in the same T8 commit. |
| ElevenLabs takes fail STT | Report the scores. Never edit, process or replace Jason's takes, and never lower 0.8. |
| The old query probe can't read Stage 3 metas | Use the new `stage3-query-probe.mjs`; never edit the old one. |
| `q` or `matchMedia` leaks between tests | Restore them in `finally`. |
| T9's block in `hud-input` collides with its top-level stubs | Pure tests only in that block; simulation tests go in `stage3-hud.test.mjs`. |

---

## Final steps (after T11 is committed and reported)

1. Run checks A–E on the T11 commit. The total must be **570**.
2. `git log --oneline 36d4ba7..HEAD` must show exactly five commits: T7, T8, T9, T10, T11.
3. `git push origin rwb-2-stage3-ag`. Cycle 2 stays on the **existing draft PR #20**, which updates itself.
4. **Don't open a new PR or change PR #20's state** unless Jason asks. If he asks for a status comment, list:
   - the test count after each commit (543 / 551 / 558 / 562 / 570);
   - the check B and C results (C against the 8d8d17b capture);
   - the audit result and file sizes;
   - the STT table and music LUFS;
   - perf numbers, or "not measured";
   - every deviation;
   - open items: Q3 carry-over (reset; Jason-gated); T17 not started (Jason-gated); the Fade split hint's longer text;
     ElevenLabs takes not loudness-matched to the Kokoro −16 LUFS (by ear); vignette strength in a real browser.
5. **Never** use `--base main`. **Never** push to `rwb-w2`. **Never** merge, approve or mark the PR ready. Jason
   approves every merge.
