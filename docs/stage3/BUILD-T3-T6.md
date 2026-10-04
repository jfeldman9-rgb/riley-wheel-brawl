# Stage 3 T3–T6 build guide for the Antigravity builder (Gemini Flash)

*Planner: Claude Opus 5.5, Oct 4 2026. Branch `rwb-2-stage3-ag` @ `5d24b29` (T1 `e46f251` and T2 `c0ebdaa` have
landed). Baseline: `node --test tests/*.test.mjs` = **338/338**.*

The specs are the source of truth: `docs/stage3/specs/T3.md`, `T4.md`, `T5.md`, `T6.md`. The rules are in
`docs/stage3/PLAN.md` §0 and the light budget is in §2.5. If this file and a spec disagree, follow the spec and write
down the difference in your report. Later passes (a Cursor cloud agent, then a Codex CLI hardening pass) build on your
commits, so keep each commit clean and complete.

---

## How to use this file

1. **Do ONE task per session**, in this order: **T3, then T4, then T5, then T6.** Never start the next task in the
   same session.
2. At the start of a session, read **§0 (setup checks)**, **your task's section** and **your task's spec file** in
   full. Then begin. Each task section repeats the rules you need.
3. Find code by **searching for the quoted text** (for example `class Whitecloak`, `queueStage3Stub`), never by line
   number. The specs' line numbers are from before the task, and earlier tasks shift them.
4. Finish with the **per-commit checks A–E**, then **commit**, then **stop and write a report**: the test count, the
   result of each check, any spec deviation, and anything you were unsure about.
5. If a **stop condition** is hit, do not commit. Report what happened and wait.
6. Never edit, loosen, skip or delete an existing test or helper. Never touch `main`. Never push to `rwb-w2`.

**Expected test totals.** The specs count from 336, but the real baseline is 338, so add 2 to every spec total.

| After | New tests | Total |
|---|---|---|
| T3 | 10 | **348** |
| T4 | 12 | **360** |
| T5 | 7 + 18 | **385** |
| T6 | 13 | **398** |

---

## 0. Setup checks (run at the start of every session)

```bash
git status                    # must be clean
git branch --show-current     # must be rwb-2-stage3-ag
git log --oneline -1          # T3 session: 5d24b29. Later sessions: the previous task's commit
node --test tests/*.test.mjs  # must pass with the previous task's total (338 before T3)
```
If any of these is wrong, stop and report.

**Baselines (the T3 session creates them before changing anything).**

1. Stage 1: `node tests/helpers/run-full-stage-simulations.mjs > /tmp/sim.base.json`
2. Stage 2: create `/tmp/s2-fingerprint.mjs` with exactly this text. **Never commit it.**

```js
// Stage 2 fingerprint (scratch; never commit). Run from the repo root:
//   node /tmp/s2-fingerprint.mjs > /tmp/s2.json
import { pathToFileURL } from 'node:url';
const root = pathToFileURL(process.cwd() + '/').href;
const { stage1Simulation, withSeed, FULL_STAGE_SEEDS } = await import(root + 'tests/helpers/stage1-simulation.mjs');
const out = [];
for (const seed of FULL_STAGE_SEEDS) out.push(withSeed(seed, () => {
  const h = stage1Simulation({ mode: '1', stage: 2 }), s = h.s;
  try {
    let frames = 0;
    for (; frames < 60 * 600 && !s.ended && !s.gameOver; frames++) h.step();
    return { seed, frames, stageNo: s.stageNo, summary: h.summary(), kit: s.kit.stats,
      spawns: h.observations.spawns.map(({ type, side, zone, wave, at }) => [type, side, zone, wave, at]),
      deaths: h.observations.deaths.map(({ type, at }) => [type, at]) };
  } finally { h.destroy(); }
}));
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
```

```bash
node /tmp/s2-fingerprint.mjs > /tmp/s2.base.json
node /tmp/s2-fingerprint.mjs > /tmp/s2.again.json
cmp /tmp/s2.base.json /tmp/s2.again.json && echo DETERMINISTIC   # must print DETERMINISTIC
grep -c '"ended": true' /tmp/s2.base.json                         # must print 9 (one per seed)
```
If either check fails, stop and report. Don't change the script. If `/tmp` is empty in a later session, recreate both
baselines from the base commit:
- `git worktree add /tmp/base 5d24b29`
- in `/tmp/base`, run the two baseline commands above, but keep the output paths `/tmp/sim.base.json` and
  `/tmp/s2.base.json`
- `git worktree remove /tmp/base`

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

# C. Stage 2 fingerprint: must print SAME
node /tmp/s2-fingerprint.mjs > /tmp/s2.json && cmp /tmp/s2.json /tmp/s2.base.json && echo SAME

# D. Audit and file-size caps: stage3.js < 12288, darkfriends.js <= 9216, myrddraal.js <= 14336 bytes
node tools/audit-stage1.mjs
wc -c src/stage3.js src/darkfriends.js src/myrddraal.js 2>/dev/null

# E. Existing tests untouched: only this task's new files appear, and nothing is removed
git diff --stat 5d24b29 -- tests/
git diff 5d24b29 -- tests/ | grep '^-[^-]'   # must print nothing (T6 only: the one STAGE3_METAS line)
```

Before committing, run `git status` and stage only the files the task allows, plus the evidence JSON. Never commit
anything from `/tmp`. Commit messages are plain, for example `git commit -m "T3: Stage3Kit backdrop, time of day and
Stage 3 loading"`.

---

## T3 · `Stage3Kit` backdrop, floors, time of day, Stage 3 loading (spec `docs/stage3/specs/T3.md`)

- **Create:** `src/stage3.js`, `assets/bg3/plates.json`, `assets/bg3/lights.json`, `tests/stage3-kit.test.mjs`.
- **Edit:** `src/stage1.js` (registry lines only), `src/assets.js` (`queueCharPages` only), the evidence JSON (check
  B only).
- **Do not touch:** `src/stages.js`, `src/stage2.js`, `src/main.js`, `src/fx.js`, `src/hud.js`, `ALL_CHARS`,
  `queueCharJson`, Boot, every existing test and helper, any image, `assets/stage3/ART_STATUS.json`.

**Steps**
1. Read `docs/stage3/specs/T3.md` in full.
2. Create `src/stage3.js` with the imports and constants from T3 §3.1: `STORY3_PANELS`, `STAGE3_VOICES`,
   `STAGE3_ATLASES = ['riley3','cutthroat','fade']`, `TOD_FALLBACK`, `TORCH_RAMP` 0.4, `TORCH_FLARE` 1.3,
   `TORCH_SETTLE` 0.3.
3. Add the pure helpers from T3 §3.2:
   - `lerpColor(a, b, u)`;
   - `timeOfDay(camX, keys)`, which returns a fresh `{ t, ambient, farMix, sunI, torchK }`, returns
     `{ ...TOD_FALLBACK }` for empty keys, and sets `torchK = t`.
4. Add `export function queueStage3(scene)` from T3 §3.3:
   - backdrop images, and JSON `plates3`/`lights3`;
   - the four strips as **spritesheets with 256×256 frames**;
   - `crate`, `planks`, `arrow`, `ribbon` (copy the four calls from `queueStage2` in `src/stage2.js`);
   - `fadePortrait`;
   - the atlases: for each `k` whose `scene.cache.json.get(k + '.A')` is missing, call
     `L.json(k + '.A', 'assets/stage3/chars/' + k + '.anims.json')` and
     `L.once('filecomplete-json-' + k + '.A', () => queueCharPages(scene, [k]))`.
5. Add `export class Stage3Kit extends Stage2Kit` from T3 §3.4, with `constructor`, `ambient`, `ambientUnlit`,
   `claimMudJoke() { return false; }`, `build`, `start`, `destroy`, `update`, `onZoneClear`. Rules:
   - **`build()` never reads `s.camX`**, and it sets `s.fireCap = this.cfg.capOnScreen || 4` without a condition.
   - The sun is removed when `sunI <= 0` and never re-added.
   - `s.snowFront` must exist after `build()`.
   - The last line of the file is `STAGE3.kit = Stage3Kit;`.
6. In `src/stage1.js`:
   - search `queueStage3Stub`, rename it to `queueStage3All`, and give it the body
     `queueStage3(scene); queuePowerArt(scene, { twix: false });`;
   - assign it at `STAGES[3].queue =`;
   - add `import { queueStage3 } from './stage3.js';` with the other `./` imports.
7. In `src/assets.js`, inside `queueCharPages`, after the line that reads the meta, add
   `const dir = m.dir || 'assets/chars';` and use `${dir}` in place of `assets/chars` in the four URLs.
8. Create the two JSON files **exactly** as in T3 §4 (indent 1). The night key x is 3900 and the dusk ambient is
   `0x3a3a52`.
9. Create `tests/stage3-kit.test.mjs` with the setup, `fakeScene` and `recLoader` from T3 §7. Use these 10 test names
   exactly:
   1. `timeOfDay grows darker monotonically and clamps`: camX −500..6000 step 5, luminance and `sunI` never rise;
      `farMix`/`t`/`torchK` never fall, in [0,1]; clamps at end keys; `timeOfDay(1, [])` = `TOD_FALLBACK`; one key → `t === 0`.
   2. `bg3 data files fit the Stage 3 registry`: x strictly increasing, last x ≤ 3920; `capOnScreen === 4`; torches
      6 numbers, plate ∈ {0,1}, litAt ∈ [0,1]; floors contiguous 0..5200, keys only in `STAGE_TEXTURES[3]`; at camX
      3500 `sunI > 0`, `farMix ≥ nightFrom`, some torch `litAt > t`.
   3. `torches ignite by time of day and never exceed the on-screen cap`: light iff `litAt ≤ torchK`; `s.fires` = the
      lit lights; ≤ 4 visible after `placeFires`; `baseI` peaks `1.3*I` (±1e-6) at 0.4 s, back to `I` by 0.7 s.
   4. `the sun fades out, is removed by the boss zone, and a restart rebuilds it`: 1.1 at camX 0, never rising; at
      3920 `sun === null`, not in `lights.active`, `sunRemoved === 1`, not re-added at camX 0; stale camX 3920 →
      `build()` still makes a 1.1 sun and the first `update(0)` removes it.
   5. `ambient follows the time of day, and ?lit=0 keeps ambientUnlit`: ambient = `timeOfDay(...).ambient` at camX
      0/1240/2560/3920; unlit → `0x5a6482`; `lightsOn = false` → no `setAmbientColor` call.
   6. `quality level 2 thins every Stage 3 particle layer`: `snowFront.frequency === 70`; quality 2 → motes 200,
      night layer 300 at camX 3920; quality 0 → base values; `farMix` 1 stops the motes.
   7. `the Stage 3 kit resets the fire cap (no leak from Stage 2's rage)`: `fireCap` 5 → 4 after `build()`; Stage 2 → 3
      restart under `q.set('s3','1')` → `stageNo 3`, `Stage3Kit`, `fireCap 4`, `snowFront` defined; `finally`
      `q.delete('s3')`, `h.destroy()`.
   8. `Stage 3 kit answers every hook the scene, Whitecloaks and bot call`: every method in T3 §7 test 8;
      `claimMudJoke({}) === false`; `threats()` arrays and `volley === null`; `STAGES[3].queue.name === 'queueStage3All'`.
   9. `queueStage3 queues every Stage 3 texture and re-queues what Stage 2 release drops`: keys ⊇ `STAGE_TEXTURES[3]` +
      `arrow ribbon fadePortrait plates3 lights3`; strips 256×256 spritesheets; no `assets/bg/`/`assets/bg2/` URL; all
      URLs on disk; after `releaseStage(3, 2)` `arrow`/`ribbon` re-queued, `crate`/`planks` not.
   10. `Stage 3 atlases load from assets/stage3/chars; Stage 1/2 URLs unchanged`: `.A` and pages from
       `assets/stage3/chars/`, on disk; nothing re-queued when cached; `ALL_CHARS` URLs exactly
       `assets/chars/${p}{.webp,_n.webp,.json,_nl.webp}`.
10. Run checks A–E. **Expected total: 348.**
11. Commit with `T3: Stage3Kit backdrop, time of day and Stage 3 loading`. Stop and report.

**Stop conditions for T3** (don't commit; report):
- The baseline isn't 338 green, or check B or C fails.
- A test can only pass by changing a spec number, or by editing an existing test, a helper or `src/stages.js`.
- Something the spec names doesn't exist (for example `Stage2Kit`, `MID_Y` or `queuePowerArt` aren't exported).
- `stage3.js` is 12 KB or more, or the audit fails.

---

## T4 · Darkfriend cutthroat AI, mash escape (spec `docs/stage3/specs/T4.md`)

- **Create:** `src/darkfriends.js`, `tests/helpers/stage3-harness.mjs`, `tests/stage3-cutthroat.test.mjs`.
- **Edit:**
  - `src/whitecloaks.js`: the one word `export` before `class Whitecloak`;
  - `src/stage1.js`: the six edits in step 8;
  - `src/stages.js`: the three `waves` arrays of `STAGE3.zones` only;
  - the evidence JSON.
- **Do not touch:** `src/enemies.js`, `src/riley.js`, `src/loial.js`, `src/stage2.js`, `src/stage3.js`,
  `src/assets.js`, `tests/helpers/stage1-simulation.mjs`, every other existing test and helper, loading code (T3's),
  art.

**Steps**
1. Read `docs/stage3/specs/T4.md` in full.
2. Create `src/darkfriends.js` with the header, `TYPES.cutthroat`, `CUTTHROAT`, `GRAB_OK`, `RILEY_ATTACKS` and `bump`
   from T4 §3.1. Key numbers:
   - 34 HP, slash dmg 8;
   - coil 0.45, `mashNeed` 6, `mashDecay` 0.5;
   - `holdMax` 2.4, chips every 0.6 s, 2 dmg each, at most 3;
   - shoved 1.2 s at ×1.3 damage, `dropMark` 0.7;
   - throw 8 dmg, knockdown.
3. Add `export class Cutthroat extends Whitecloak` from T4 §3.2–3.3, with `canBeHit`, `play`, `covers`,
   `catchResult`, `think`, `startLunge`, `update`, `onLand`, `sync`, `dropIn`, `takeHit`, `die`, `startHold`,
   `holding`, `mash`, `releaseHold`.
4. **Mash rule (keep exactly):**
   - `mash()` does `mashN++` and **never touches `mashT`**.
   - `holding(dt)` always decays: `mashT += dt; while (mashT >= 0.5) { mashT -= 0.5; mashN = Math.max(0, mashN - 1); }`.
   - So Riley escapes with 6 presses inside one 0.5 s window, or by mashing at about **5 presses/s**.
   - Chips are counted (`chips < chipMax`). There is no `chipT`, and hp never drops below 1 from chips.
5. `releaseHold(how)` bumps `escapes`/`throws`/`breaks` **only inside** `if (R.grabbedBy === this)` and never calls
   `setState`.
6. End the file with `export const DARKFRIENDS = Object.freeze({ cutthroat: Cutthroat });`.
7. In `src/whitecloaks.js`, search `class Whitecloak` and add `export`. Nothing else.
8. Make six edits in `src/stage1.js` (T4 §4):
   1. After `import { WHITECLOAKS }`, add `import { DARKFRIENDS, CUTTHROAT } from './darkfriends.js';`. Below the
      imports, add `export const ENEMY_CLASSES = Object.freeze({ ...WHITECLOAKS, ...DARKFRIENDS });`.
   2. Search `spawn(type, side)`.
      - Put the `side === 'T'` drop-in block **at the very top**, so the Stage 1/2 `rand` order doesn't change.
      - Then add `if (side === 'T') side = 'R';`.
      - Replace `WHITECLOAKS[type]` with `ENEMY_CLASSES[type]`.
   3. Add `grabBusy(e)`.
   4. In `attackTokens()`, return `this.maxTokens` first if any live enemy is `holding`. Then add
      `|| e.state === 'lunge' || e.state === 'holding'` to the existing filter.
   5. In the `resolveAttack` target loop, add `|| (t === this.riley && t.grabbedBy && att !== t.grabbedBy)` to the
      `continue` condition.
   6. In the body-block loop (search `e.state !== 'held'`), add `&& e.state !== 'holding' && e.state !== 'dropin'`.
9. In `src/stages.js`, replace only the three `waves:` arrays in `STAGE3.zones` with T4 §5. Keep `at`, `l`, `r`,
   `intro`, the boss zone and every `Object.freeze`.
10. Create `tests/helpers/stage3-harness.mjs` per T4 §7.1.
    - Exports: `stage3Simulation`, `arena`, `placeC`, `withSeed`, `FULL_STAGE_SEEDS`, `STAGE3_METAS`.
    - The metas list is `['cutthroat', 'riley3']`.
    - Set `q` `s3`/`story` and delete them in `finally`.
    - **It wraps `stage1Simulation`; it never edits it.**
11. Create `tests/stage3-cutthroat.test.mjs` with 12 tests. Copy the names from T4 §7.2 exactly. Timing is ±1 frame.
    1. Coil: 0.45 s of `fi === 0` and no movement; `kit.telegraph` called once with `c`; `grabCool ∈ [5,8]`.
    2. Grabs from behind (`sign(c.x-R.x) === -R.facing`), `grabs === 1`; `null` for `z>0`, `down`, `getup`, `air`,
       `!vulnerable` or already held; a live `R.down()` cancels the grab.
    3. Toward → `'counter'`, away → `'grab'`, `back` away → `'counter'`; live counter: hurt/down, hp < 34, `counters === 1`.
    4. Seeds 1–3, 6 s: ≤ 1 cutthroat in `lunge`/`holding` per frame; `grabBusy(other)` true during a lunge.
    5. Six `mash()` 4 frames apart: the 6th returns `true`, `shoved`, `escapes === 1`; a 10-dmg hit then does **13**;
       a press every 0.2 s escapes before `c.st` 2.4; `shoved` lasts 1.2 s ±1 frame.
    6. A press every 0.45 s: `mashN ≤ 1` every frame, 0 after each tick, `mashT < 0.5`; ends in `grabthrow`, `escapes === 0`.
    7. Exactly 3 chips of 2 at ≈0.6/1.2/1.8 s, throw at 2.4 s ±1 frame; `hp0 - R.hp === 14`, `down`, `throws === 1`;
       from hp 3 the chips stop at 1.
    8. While held: `attackTokens() === maxTokens`, the Zealot never attacks, `resolveAttack` leaves hp unchanged.
    9. A hazard (`down:true`, plain `{x}` source) or Loial breaks the hold: `!R.grabbedBy`, `breaks === 1`.
    10. Seeds 1–10 drop-in: 0.7 s `dropin`, `z 0`, alpha 0, not hittable; not hittable while falling; lands in bounds
        ±40, y 572..690, `dropins === 1`; `spawn('zealot','T')` enters from the right.
    11. KO pattern `[[false,false],[true,true],[false,false],[true,true]]`, `stars` +2; same seed deep-equals.
    12. Waves deep-equal T4 §5; `TYPES.cutthroat.hp === 34`, `atk.dmg === 8`; `ENEMY_CLASSES.cutthroat === Cutthroat`;
        `Object.keys(WHITECLOAKS)` = `['zealot','archer','byar']`.
12. Run checks A–E. **Expected total: 360.** `git diff src/whitecloaks.js` must show only the word `export` added.
13. Commit with `T4: Darkfriend cutthroat AI`. Stop and report.

**Stop conditions for T4:**
- Check B or C fails, or an existing test fails.
- Something the spec names doesn't exist (`hitTarget`, `callLoial`, `Enemy.think` slots …).
- T2's cutthroat anims differ from `cutthroat_{walk,hurt,slash,knockdown,lunge,getup,dazed,hold,grabthrow,shoved,stalk,flee}`.
- A test only passes by loosening 0.45 / 6 / 0.5 / 3×2 / 2.4 / ×1.3 / 1.2 / 0.7.
- `darkfriends.js` is over 9 KB.

---

## T5 · Riley `grabbed` / `escape` states (spec `docs/stage3/specs/T5.md`)

- **Create:** `tests/stage3-riley-grab.test.mjs` (7 tests), `tests/riley-grab-safety.test.mjs` (18 tests).
- **Edit:** `src/riley.js`, and the evidence JSON (`riley.js` is hashed).
- **Do not touch:**
  - `src/stage1.js` (T4 already added the `resolveAttack` guard; don't add a second one);
  - `src/loial.js`, `src/darkfriends.js`, `src/fighter.js`, `src/input.js`, `src/stages.js`;
  - `tests/helpers/stage3-harness.mjs`, every T2–T4 test, every older test and helper;
  - art.

**Steps**
1. Read `docs/stage3/specs/T5.md` in full.
2. In `src/riley.js`, after the `BALEFIRE` constant, add
   `export const GRABBED = Object.freeze({ mashKeys: Object.freeze(['attack','jump','special','power']), shoveFrame: 1 });`.
3. On the constructor field line before `this.setState('idle', 'idle')`, append
   `this.grabbedBy = null; this.lastGrabber = null; this.mashDir = '0,0'; this.shoveFx = false;`.
4. In the `update` switch, before `case 'hurt'`, add `case 'grabbed': return this.grabbed(dt, inp);` and
   `case 'escape': return this.escape(dt);`. Keep the Loial assist line first.
5. After the `throwing` method, add `enterGrabbed(c)`, `leaveGrabbed(how)`, `grabbed(dt, inp)` and `escape(dt)` from
   T5 §3.4.
   - Riley **only forwards** presses: one `this.grabbedBy.mash()` per counted press, in the same frame. No buffering,
     no rate limit, no count of his own.
   - **He never sets `grabbedBy = null`.**
   - The escape frame-1 shove is FX and sound only, with no damage.
6. In `takeHit`, right after `if (!this.vulnerable) return false;`, add
   `if (this.grabbedBy && from !== this.grabbedBy && !(from && from.team === undefined && h.down)) return false;`.
7. Add `sync() { super.sync(); if (this.grabbedBy && this.state === 'grabbed') this.sprite.setDepth(1000 + this.y + 1); }`.
8. Leave `busy`, `vulnerable`, `respawn`, `down` and `free` unchanged. Add no `Math.random`.
9. Create `tests/stage3-riley-grab.test.mjs`. Use the frame-count helpers `steps`, `runUntil`, `hold`, `press` and
   `mashEvery` from T5 §6.1, and copy the 7 test names exactly:
   1. `riley_grabbed` 4×130 ms, loops; `riley_escape` `[120,90,160,200]`, no loop; geometry = `riley.anims.json`;
      `GRABBED.shoveFrame === 1`, `mashNeed === 6`, `mashDecay === 0.5`.
   2. `mashEvery(h, 6, 4)`: after press 6 `escape`, `riley_escape`, `grabbedBy === null`; cutthroat `shoved` with hp
      **34**, `escapes === 1`; one `'medium'` impact on frame 1; `idle` within 36 frames, facing the cutthroat.
   3. `mashEvery(h, 6, 9)` (0.15 s): after press 6 `mashN === 5`, no escape, `0.75 < c.st < 0.8`; a 7th press at hold
      frame 55 escapes.
   4. Held: `jump`/`special`/`power` only add mash (no jump, saidin unchanged, no fireball, no beam); a new direction
      adds 1, neutral/still-held adds 0; a direction held before the grab doesn't count.
   5. Riley's depth > the holder's, also at `y === 572` (recording `setDepth` from the spec).
   6. Zealot and arrow-shaped hits return `false`, hp unchanged; with `s.god = false` a `down:true` hazard kills Riley,
      the hold breaks (`breaks === 1`), he respawns in `getup`; `respawn()` while held also breaks it.
   7. Pause: snapshot (`st`, `mashN`, `mashT`, `chips`, hp, Riley `st`/`fi`/`cur`) unchanged over 180 paused steps;
      after resume the throw is on time ±2 frames, damage 14, `escapes === 0`.
10. Create `tests/riley-grab-safety.test.mjs` per T5 §6.2.
    - Test name: `` `Riley never enters grabbed or escape in Stage ${n}, seed ${seed}` ``, for Stages 1 and 2 × the
      9 `FULL_STAGE_SEEDS` (18 tests).
    - Wrap `Riley.prototype.setState` to record state names, and restore it in `finally`.
    - Assert `s.ended`, no `'grabbed'`/`'escape'` in the records, `grabbedBy` never set, and no enemy with `mash`.
11. Run checks A–E. **Expected total: 385.**
12. Commit with `T5: Riley grabbed and escape states`. Stop and report.

**Stop conditions for T5:**
- Check B or C fails, or `riley-grab-safety` fails on any seed.
- The `riley3` anims or holds differ from T5 §4.
- A test needs `src/stage1.js` or `stage3-harness.mjs` changed.
- A mash test only passes by assuming a press resets `mashT`.

---

## T6 · Myrddraal boss (spec `docs/stage3/specs/T6.md`)

- **Create:** `src/myrddraal.js`, `tests/stage3-fade.test.mjs` (13 tests).
- **Edit:**
  - `src/stages.js`, inside `STAGE3` only: `boss` fields, `phaseLines`, the `onBossPhase` body;
  - `src/stage1.js`: one import and `...MYRDDRAAL`;
  - `tests/helpers/stage3-harness.mjs`: **only** add `'fade'` to the `STAGE3_METAS` list;
  - the evidence JSON.
- **Do not touch:** `startBoss`/`onBossPhase`/`bossDown` in `stage1.js`, `src/hud.js`, `src/powers.js`,
  `src/stage3.js`, `src/darkfriends.js`, `src/riley.js`, `src/enemies.js`, `src/fighter.js`, `src/whitecloaks.js`,
  `src/assets.js`, every other test and helper, art.

**Steps**
1. Read `docs/stage3/specs/T6.md` in full.
2. Create `src/myrddraal.js` with the header and these, from T6 §3.1:
   - `TYPES.fade` (440 HP);
   - `TYPES.fadecopy` (same key and prefix, hp 1, not a boss);
   - the deep-frozen `FADE`;
   - `calmMotion()`.
3. Add the pure helpers `poolSpot(R, b)` and `lightNear(s, x, range)` (T6 §3.2). `lightNear` only polls; don't edit
   `powers.js`.
4. Add `export class Myrddraal extends Enemy` (T6 §3.3–3.5):
   - **Phases** change at 66% and 33%.
   - **Blink:** `blinkout` → `sunk` (pool ≥ 0.6 s, invisible, can't be hit) → `blinkin`. Frames 2–3 counter:
     stagger 1.4 s, ×1.5 damage. Other blink states take ×0.6.
   - **Fear aura:** Riley is shaken after 1.4 s inside, for 0.7 s, with no damage. Any light power within 400 px
     dispels it for 4 s.
   - **Split:** 2 copies. Popping one forces the real Fade to lunge within 0.3 s. A parry clears the copies, and it
     re-splits after 8–10 s.
   - **Defeat:** `defeated` + `melting` → `gone`. **Never `down`/`dead`.**
   - **No `scene.time.delayedCall`, and no module-level mutable state.**
5. **Lighting (locked):**
   - The **real Myrddraal is torch-lit**: never call `setLighting` on it in any state. It keeps `Fighter`'s
     `setLighting(true)`.
   - **`FadeCopy` is unlit**: call `this.sprite.setLighting(false)` once, right after `super(...)`, and never
     re-enable it.
   - Copies: hide the shadow, never push to `s.backdropLit`, never tint or flash.
6. Add `tickLook(dt)`:
   - `auraK` ramps 0↔1 (0.5 s in, 0.3 s out) and is clamped to [0,1], so it ends at exactly 0;
   - `if (s.vignette) s.vignette.strength = 0.35 + 0.40*auraK + (calmMotion() ? 0 : 0.03*auraK*Math.sin(t*4))`;
   - torches: `L.baseR ??= L.radius; L.radius = L.baseR * (1 - 0.3*auraK)`;
   - **no new lights.**
7. Add `export class FadeCopy extends Enemy` (T6 §3.6), then `export const MYRDDRAAL = Object.freeze({ fade: Myrddraal });`.
8. In `src/stages.js`, inside `STAGE3`:
   - set `boss: { type: 'fade', name: 'THE MYRDDRAAL', portrait: 'fadePortrait', cool: 2.2, introVoice: 'fade_intro_01' }`;
   - add `phaseLines` after it;
   - replace the `onBossPhase` body (both per T6 §4.1);
   - leave `bossDown` unchanged.
9. In `src/stage1.js`, add `import { MYRDDRAAL } from './myrddraal.js';` after the darkfriends import, and change the
   line to `export const ENEMY_CLASSES = Object.freeze({ ...WHITECLOAKS, ...DARKFRIENDS, ...MYRDDRAAL });`.
10. In `tests/helpers/stage3-harness.mjs`, change `['cutthroat', 'riley3']` to `['cutthroat', 'riley3', 'fade']`.
    Change nothing else.
11. Create `tests/stage3-fade.test.mjs` with the local helpers `vig`, `litRec`, `place`, `toPhase`, `torch` and `jab`
    (T6 §6.2). Copy the 13 test names exactly. Restore any `q` key or `globalThis.matchMedia` you set, in `finally`.
    1. Data = §3.1; fade atlas has all 15 anims, `blinkin` `[100,110,120,160]`; `riley_hurt` holds sum to 340
       (`hurtMs`); `ENEMY_CLASSES.fade === Myrddraal`, `.cutthroat` still set.
    2. Phase 2 at 66%, phase 3 at 33%, each with its `flashText`; sa'angreal drops at phase 2.
    3. Seeds 1–5: pool ≥ 0.6 s before `blinkin`, behind Riley, in bounds ±70, y 578..684; meanwhile alpha 0, not hittable.
    4. `blinkin` frames 2–3: −15 and stagger 1.4 s ±1 frame (another hit in stagger −15); other blink frames −6;
       `sunk` not hittable.
    5. 1.4 s ±2 frames in the aura → `hurt` 0.7 s ±2 frames, hp unchanged, `shaken === 1`; outside, `fear` decays to 0.
    6. Fireball, lightning, fire shield, Balefire within 400 px each → `dispelT > 3.9`, `dispels === 1`; aura returns
       4 s ±2 frames later; a fireball out of range doesn't dispel.
    7. Aura on → vignette `0.75` (±1e-9), torch radius 280; dispel + 0.3 s + 1 frame → **exactly 0.35** and 400;
       light count never changes; no pulse with `?flash=0` or reduced motion, else within [0.72, 0.78] and not
       constant; null vignette doesn't throw.
    8. Exactly 2 `FadeCopy`, `fade_` frames, hp 1; **each copy `sprite.lit === false`, real `litCalls` deep-equals
       `[true]`**, held for 3 s; copies untinted; copy shadow alpha 0, real > 0; never > 2 copies.
    9. Popping a copy → real one lunges within 0.3 s + 1 frame; `copiesPopped === 1`.
    10. Parry in the lunge telegraph → stagger, −15, copies gone, `resplitT ∈ [8,10]`, next split ≥ 8 s later; a hit
        outside the parry window doesn't stagger.
    11. 0 HP → `defeated`, melts (still lit), `gone`, never `down`/`dead`; vignette **=== 0.35**, lights unchanged;
        `stageClear` 7.6 s ±1 frame later, `s.ended`.
    12. Restart mid-blink / mid-fear / mid-split (`?flash=0`): one restart, `stageNo 3`, new `Stage3Kit`, no
        `Myrddraal`/`FadeCopy`, `s.boss === null`, lights ≤ L0, a new vignette with **`strength === 0.35` (strict
        `===`, no tolerance)**, still `=== 0.35` after 60 steps.
    13. `?skip=boss` walk → `startBoss` spawns a `Myrddraal`; `bossBar` once with `cool === 2.2`; `intro` then
        `introDone`; `introVoice`/`phaseLines` match; vignette 0.35 while the aura is off.
12. Run checks A–E. **Expected total: 398.** In check E, the only changed line in an existing file is the
    `STAGE3_METAS` list.
13. Commit with `T6: Myrddraal boss`. Stop and report, then do the **Final steps**.

**Stop conditions for T6:**
- Check B or C fails.
- The fade atlas doesn't have 15 anims, or its holds differ from T6 §1.
- Test 12 only passes with a tolerance on 0.35.
- Copies would need a tint or recolour to be told apart.
- You'd need to edit `startBoss`/`bossDown`, `hud.js` or `powers.js`.
- `myrddraal.js` is over 14 KB.

---

## Art rules (every task)

- **Use T2's labelled placeholders, as generated:** `assets/bg3/*`, `assets/stage3/props/*`,
  `assets/stage3/ui/fade-portrait.webp`, `cutthroat_*`, `riley3` (`riley_grabbed`/`riley_escape`) and `fade_*`.
  - Final art is painted later and swapped in one file at a time (T14).
  - Don't edit any image or `assets/stage3/ART_STATUS.json`.
- **Never fake art.** No recolouring, tinting into a new look, blurring, stretching, interpolating, mirroring into
  "new" frames, generating, or drawing shapes in place of a sprite or plate. **Flipping a sprite to face the other way
  is fine.**
- **Allowed, because none of these is new art:**
  - day and night far plates cross-faded by alpha (T3);
  - the drop-in marker made from the existing `shadow` texture, scaled (T4);
  - "shaken", which replays Riley's existing `riley_hurt` frames at a slower speed (T6);
  - the copies' unlit render switch (T6);
  - `flashArmor` on the real Fade only.
- **No substitute frames.** If an anim is missing, stop and report.
- **Riley stays on-model** in any text you write: 16, very muscular, short dark hair, thin blue-framed glasses,
  sleeveless black Asha'man coat. Never a kid.
- **Kid-safe:** KOs are stars or running away, the cosh is a bonk, the throw is a shove, chip damage never kills, and
  the Fade kneels and melts into shadow.

---

## Frame-rate budget (every task)

- **Lights (PLAN §2.5, `maxLights` 10 at `src/main.js:19`).** The worst case is hero 1 + torches 4 + fireball 1 +
  pickup 1 + ribbon 1 + power 1 = **9 ≤ 10**.
  - The sun is *removed* when `sunI` reaches 0 (camX 3900).
  - Unlit torch spots own no light. `placeFires` uses `s.fireCap = 4`.
  - The fear aura changes torch `radius` only.
  - Copies, pools, bursts and the drop marker are unlit.
  - No `setPipeline`, no custom shaders, no extra filters. Reuse `s.vignette`.
- **No per-frame allocations in hot code** (`Stage3Kit.update`, `Cutthroat.holding`, `tickFear`, `tickLook`, Riley's
  `grabbed`):
  - plain arithmetic;
  - constant arrays (such as `['hurt','down','getup','dead']`) hoisted to frozen module constants;
  - `some`, not `filter`/`map`, inside update loops.
  - `timeOfDay` makes one small object per frame, as the spec says; add no more.
  - Precompute `torchSpots` in `build()`.
- **Pooling and lifetime.**
  - Reuse the existing particle managers. T3 adds only `motes` and `nightLayer`, each created once and thinned at
    `s.fx.quality >= 2`.
  - Never more than 2 copies, removed through `gone`.
  - All timers are `dt`-based, with no `delayedCall`.
- **Textures.**
  - Strips are 256×256 spritesheets, plates 2172×724, and each character has 1–2 atlas pages plus `_n`/`_nl`.
  - Load only through `queueStage3`. No new `STAGE_TEXTURES`/`SHARED_TEXTURES` keys.
  - Stage 3 stays within the T15 budget of ≤ 110 MB resident GPU.
- **How to measure.**
  - Headless: `h.resources().lights` and `h.observations.peak` (the tests already assert light counts).
  - Browser, if you have one: open `?stage=3&s3=1&demo=1`, press **H**, read `window.__perf.summary.fight`. Do 3 reps
    each of Stage 1 boss, Stage 2 boss, Stage 3 start, zone 2 rooftops and Stage 3 boss (`&skip=boss`), at `5d24b29`
    and at your head.
  - Report average fps and frames over 33 ms first, and whether the renderer was software.
  - If you have no browser, write "not measured". **Never invent numbers.**

---

## Common risks

| Risk | What to do |
|---|---|
| Spec line numbers are out of date | Search for the quoted code and re-read the whole function before editing. |
| Stage 1/2 randomness shifts (check B or C fails) | The T4 `'T'` block sits before the R/L `rand` line. No `Math.random` on Stage 1/2 paths. Still failing: stop. |
| `build()` reads a stale camera after a restart | `build()` never reads `s.camX` (T3 test 4). |
| The old mash model sneaks in | `mash()` never resets `mashT`. T4 test 6 and T5 test 3 are the negative cases. |
| Two `resolveAttack` guards, or Riley clearing `grabbedBy` | T4 owns both. T5 only forwards presses and filters `takeHit`. |
| The vignette isn't back to 0.35 | `auraK` clamps to 0. No `delayedCall`/module state. `create()` rebuilds the filter. |
| Vignette `strength` may not be writable in real Phaser 4 (the harness stubs it) | Say "unverified in browser" in the report. Don't change the approach. |
| `q` or `matchMedia` leaks between tests | Restore them in `finally`. |

---

## Final steps (after T6 is committed and reported)

1. Run checks A–E on the T6 commit. The total must be **398**.
2. `git log --oneline 5d24b29..HEAD` must show exactly four commits: T3, T4, T5, T6.
3. `git push -u origin rwb-2-stage3-ag`
4. Open a **draft** PR into `rwb-w2`. It exists on origin: it's the live GitHub Pages branch, at `77d4710` when this
   was written.
   ```bash
   gh pr create --draft --base rwb-w2 --head rwb-2-stage3-ag \
     --title "Stage 3 T3–T6: Caemlyn kit, cutthroat, grab/escape, Myrddraal" --body-file /tmp/pr-body.md
   ```
5. The PR body (`/tmp/pr-body.md`) lists:
   - the test count after each commit (348 / 360 / 385 / 398);
   - the check B and C results;
   - the audit result and file sizes;
   - perf numbers, or "not measured";
   - any spec deviations;
   - open items: Vignette `strength` in a real browser (T6 §8.9), escape i-frames (T5 §8.10), and T12's bot must
     mash ≥ 5 presses/s.
6. **Never** use `--base main`. **Never** push to `rwb-w2` itself. **Never** merge, approve or mark the PR ready.
   Jason approves every merge.
