# Stage 3 T12–T16 build guide for the Antigravity builder (Gemini Flash)

*Planner: Claude Opus 5.5, Oct 4 2026. Branch `rwb-2-stage3-ag` @ the **T11 commit** (`T11: Stage 3 story beat and
flagged campaign flow`; cycle 2, T7–T11, has landed on draft PR #20 into `rwb-w2`). Baseline: `node --test
tests/*.test.mjs` = **570/570**.*

There are no spec files for this cycle. The source of truth is `docs/stage3/PLAN.md`: §0 (rules), §2.1 (the flag and
the four frozen assertions), §2.5 (light budget), the task sections T12, T13, T14, T15 and T16, §4 (art list) and §5
(definition of done). This file turns those into exact steps for the current code, and it overrides PLAN.md in a few
places. Each override is marked **(deviation)** with the reason. If this file and PLAN.md disagree anywhere else,
follow PLAN.md and write the difference down in your report.

**T17 is out of scope.** Opening Stage 3 to the campaign (dropping the `s3` gate, rewriting the four §2.1 assertions)
needs Jason's explicit OK (PLAN §6 Q2). No session in this cycle starts it, even if every other task is done.

---

## How to use this file

1. **Do ONE task per session**, in this order: **T12, then T13, then T15, then T16.** Never start the next task in the
   same session.
2. **T14 is not in that order.** Run a T14 session only when Jason has approved a master (or a single non-character
   file) and the session prompt says so, and only after T13 is committed. T14 never blocks T15 or T16. Each T14
   session handles **one** approved item.
3. At the start of a session, read **§0 (setup checks)**, **your task's section** below and **your task's section in
   `docs/stage3/PLAN.md`** in full. Then begin. Each task section repeats the rules you need.
4. Find code by **searching for the quoted text** (for example `evadeStage2() {`, `releaseStage(toStage`), never by line
   number.
5. Finish with the **per-commit checks A–E**, then **commit**, then **stop and write a report**: the test count, the
   result of each check, the file sizes, every deviation, and anything you were unsure about.
6. If a **stop condition** is hit, do not commit. Report what happened and wait.
7. **Never** edit, loosen, skip or delete an existing test or helper (that includes every test added in T1–T11).
   **Never** touch `main`. **Never** push to `rwb-w2`. **Never** merge.

**Expected test totals.** Each new test is named in its task section. The number must match exactly.

| After | New tests | Total |
|---|---|---|
| start (T11 commit) | | **570** |
| T12 | 20 (`stage3-campaign.test.mjs`) | **590** |
| T13 | 9 (`stage3-assets.test.mjs`) | **599** |
| T15 | 3 (`stage3-memory.test.mjs`) | **602** |
| T16 | 0 (docs only) | **602** |
| T14 (any time after T13, per item) | 0 | unchanged |

---

## 0. Setup checks (run at the start of every session)

```bash
git status                    # must be clean
git branch --show-current     # must be rwb-2-stage3-ag
git log --oneline -1          # T12 session: the T11 commit. Later sessions: the previous task's commit
node --test tests/*.test.mjs  # must pass with the previous task's total (570 before T12)
```
Write down the T11 commit's SHA as `<T11>` at the top of your report; check E uses it. If any of these is wrong, stop
and report.

**Baselines (never recreate them, never overwrite them).**

1. **Stage 1:** the golden file is the committed `docs/stage1/evidence/full-stage-simulation.json`. Check B compares
   against it. Nothing to create.
2. **Stage 2:** the frozen fingerprint is the **8d8d17b capture** in `/workspace/ag/baselines-8d8d17b/`:
   - `s2-fingerprint.mjs`: the script (run it from the repo root);
   - `s2.base.json`: the baseline (9 seeds, all `"ended": true`).

   Never recreate a baseline from `5d24b29` or from your own HEAD. `/tmp` may be empty in a new session, so always copy:

```bash
cp /workspace/ag/baselines-8d8d17b/s2-fingerprint.mjs /tmp/s2-fingerprint.mjs
grep -c '"ended": true' /workspace/ag/baselines-8d8d17b/s2.base.json   # must print 9
```
If `/workspace/ag/baselines-8d8d17b/` or either file is missing, stop and report. Don't rebuild it.

**Sandbox note.** Some sandboxes return `EPERM` for child-process pipes (see HARDENING.md). If the **existing**
`stage2-flow` or `stage3-flow` probe tests already fail that way at the §0 check, stop and report the environment.
Don't add workarounds to the repo.

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
wc -c src/stage3.js src/darkfriends.js src/myrddraal.js src/stage3-hazards.js src/bot.js
#    stage3.js < 12288 · darkfriends.js <= 9216 · myrddraal.js <= 16384 · stage3-hazards.js <= 8192 · bot.js <= 12288

# E. Existing tests untouched: only new files appear, and nothing is removed
git diff --stat <T11> -- tests/
git diff <T11> -- tests/ | grep '^-[^-]'   # must print NOTHING
```

**Size caps.** No task in this cycle edits `stage3.js`, `stage3-hazards.js`, `myrddraal.js` (0 bytes free) or
`darkfriends.js`. The only source file that grows is **`src/bot.js`** (T12; 9623 bytes at `6fa65e0`).
**(deviation)** PLAN sets no cap for `bot.js`; this file sets **≤ 12288** so the bot can't sprawl. Never minify,
shorten names or delete comments to make room. If a file would cross its cap, stop and report the byte count.

**Cap update (Oct 5 2026).** Jason raised `myrddraal.js` from 14336 to **16384** for the fear-aura fairness fix.
Check D above uses 16384. The re-indent and the B1 fear change spend part of that room. Leave the rest for
`forceLungeT` (m3) and one more boss fix. Do not raise the cap again without Jason's OK.

Before committing, run `git status` and stage only the files the task allows, plus the evidence JSON. Never commit
anything from `/tmp`, `/workspace/rwb-voice/` or a scratch worktree. Commit messages are plain (given per task).

---

## T12 · Campaign bot for Stage 3 and the 9-seed campaign test (PLAN T12)

- **Create:** `tests/stage3-campaign.test.mjs` (20 tests).
- **Edit:** `src/bot.js` (additive only: one call line in `update(dt)` and one new method), the evidence JSON.
- **Do not touch:** every `src/` file except `bot.js`: no game constant, timer, HP, grab cooldown, tile rate or boss
  value changes to make the bot pass. Also `tests/stage2-campaign.test.mjs`, `tests/full-stage-*.test.mjs`, every
  existing test and helper, every asset.

**Deviations from PLAN T12 (write them in your report):**
- **2 extra unit tests** (tests 19–20) pin the bot's Stage 3 branch in a fast arena, so a later failure in the long
  runs has a cheap first suspect. Additive only.
- **"Settles back to baseline"** is checked as: after a 15 s settle, every `h.resources()` count is the same at +15 s
  and +20 s, `timers === 0`, `tweens === 0`, lights ≤ 10, and the Stage 3 threats are empty. Stage 3 keeps lit garden
  torches after the clear, so "equal to the start-of-run light count" would be false by design.
- **Bands are tuned in `bot.js` only.** PLAN says "tune them once, then lock them". Tuning game values would shift
  every existing Stage 3 test, so it's not allowed. If a seed falls outside a band with sensible bot logic, stop and
  report the per-seed numbers.

**Steps**
1. Read PLAN T12 and these, by search:
   - `tests/stage2-campaign.test.mjs` in full (the model for this file);
   - `src/bot.js`: `update(dt) {`, `evadeStage2() {`, `fight(e) {`, `moveTo(x, y`;
   - `tests/helpers/stage3-harness.mjs`: `stage3Simulation`, `arena`, `placeC`;
   - `GRABBED` in `src/riley.js` (`mashKeys`); `mashN` and `bump(this.scene, 'grabs')` in `src/darkfriends.js`;
   - in `src/myrddraal.js`: `auraOn`, `dispelRange`, `isCopy`, `vanish(p)`, `onCopyPopped`, and every `bump(`;
   - `threats()` and `bandOf` in `src/stage3-hazards.js`/`src/stage2.js`; `TILE_BANDS`.
2. In `src/bot.js`, in `update(dt)`, right after the line `if (this.bossCoverage) return this.updateBossCoverage();`,
   add `if (s.stageNo === 3 && this.evadeStage3()) return;`. Stage 1 and 2 never enter it (checks B and C prove that).
3. Add `evadeStage3()` after `evadeStage2()`, with a `/** … */` comment in the same style. It returns true while it
   owns the controls, in this priority order:
   1. **Grabbed:** `if (R.state === 'grabbed')`: `inp.demo = { x: 0, y: 0, run: false }`; press `'attack'` (one of
      `GRABBED.mashKeys`) at most every 0.12 s, tracked by a `this.mashT` field compared with `this.t`. Return true.
   2. **Tiles:** for each tile in `k.threats().tiles` whose `bands` include `k.bandOf(R.y)`, walk vertically toward
      the nearest unmarked band's middle (loop over `0..2` with `TILE_BANDS[i]`; no `filter`/`sort`). Also keep
      stepping while within 6 px of a marked band's edge. Return true.
   3. **Pools:** for each `{ pool }` in `threats().pools`, if `|R.x - pool.x| < 70 && |R.y - pool.y| < 30`, step
      vertically away from `pool.y` (toward the farther lane edge when level). Return true.
   4. **Fear:** if `s.boss?.alive && s.boss.auraOn && s.boss.fear > 0.5` and `s.powers?.castKind(R)` (or
      `R.saidin >= 34`) gives a cast: move onto the boss's lane within its `dispelRange`, face it, and press
      `'special'` once (throttle with `this.next = this.t + 0.9`). With no cast available, return false (keep
      fighting).
   5. **Phase 3:** if `s.boss?.alive && !s.boss.entering && s.boss.copies?.length`, call `this.fight(s.boss)` so the
      bot targets the enemy whose `isCopy` is false, and return true. That's fair: the real one casts a shadow and
      catches the torchlight.
   6. Otherwise return false (the Stage 2 and generic logic run as today).

   Rules: **no `Math.random`** in the new code (the bot's existing draws stay in their existing order), **no
   `pressLater` or `scene.time.delayedCall`**, no arrays, closures or `filter`/`sort` per frame. Copies are still popped
   when one steps into a combo, a fireball or a shield. That counts.
4. Create `tests/stage3-campaign.test.mjs`. Header comment in the style of `stage2-campaign.test.mjs`. Import
   `stage3Simulation`, `arena`, `placeC`, `withSeed`, `FULL_STAGE_SEEDS` from `./helpers/stage3-harness.mjs`. Use
   `stage3Simulation({ mode: '1' })` (bot on, `s3=1`, `story=0`). Always `h.destroy()` in `finally`; restore anything
   set on `q`/`globalThis`.
   - **`checkFrame(h, previousBounds)`:** copy Stage 2's (finite state, camera in the 5200 px world, Riley onscreen,
     lanes 572–690, `z >= 0`, `attackTokens() <= maxTokens`, enemies bounded with the same `flee`/`retreat` margin),
     and add the Stage 3 bounds: `k.tiles.length <= 1`, `k.pools.length <= 1`, `(s.boss?.copies?.length || 0) <= 2`,
     and **at most one grabber**: the number of enemies in the cutthroat hold state (search `'hold'` in
     `darkfriends.js`) is ≤ 1, and when it is 1, `R.grabbedBy` is that enemy.

   Copy the names exactly:
   - **Tests 1–9**, one per seed: `` `Stage 3 campaign bot clears Caemlyn, seed ${seed}` ``. For up to `60 * 600`
     frames, step and `checkFrame`. Then:
     - `gameOver === false`, `ended === true`, `riley.lives > 0`;
     - `h.observations.zones` deep-equals `[0, 1, 2, 3]`; boss phases seen are `[1, 2, 3]`; boss states include
       `defeated` and never `dead`;
     - `kit.stats`: `blinks >= 1`, `parries + counters >= 1`, `fears >= 1`, `dispels >= 1`, `splits >= 1`,
       `copiesPopped >= 1`, `grabs >= 1`, `escapes >= 1`, `ribbon === 1`, `glimpses === 1`;
     - `h.observations.peak.liveEnemies <= 4`; every spawn entered (as Stage 2);
     - settle 15 s: `s.enemies.length === 0`; `threats()` has `tiles`, `drops`, `pools`, `copies` empty and `aura ===
       false`; `timers === 0`, `tweens === 0`, lights ≤ 10; settle 5 s more and every `h.resources()` count is
       unchanged;
     - one `stageClear` HUD call; `s.inp.press('attack')` → `restartData` deep-equals `[{ stage: 1 }]`.
     - Put `JSON.stringify({ ...h.summary(), kit: s.kit.stats })` in every assertion message, and a
       `testContext.diagnostic` line with grabs, escapes, tile hits and copies popped.
   - **Tests 10–18**, one per seed: `` `Stage 3 grabs and tile hits stay in their target bands, seed ${seed}` ``: run
     to the end as above; `ended === true`, `gameOver === false`; `1 <= stats.grabs <= 6`; `0 <= stats.tileHits <= 4`.
   - **Test 19:** `the Stage 3 bot mashes out of a hold and steps out of a marked tile band, and never runs in Stage 1 or
     2`:
     - `arena(s)`, `placeC(s, 90)`, start the hold the way `stage3-riley-grab.test.mjs` does (search `startHold`);
       step with the bot; within 2 s Riley is not `grabbed` and `stats.escapes === 1`;
     - set the zone-2 arena (`s.zoneI = 2; s.zone = STAGE3.zones[2]; s.locked = true; s.wave = 0`), call
       `kit.startTile()`; Riley's band is unmarked before the tile's x reaches his x;
     - spy on `Bot.prototype.evadeStage3` (restore in `finally`): 600 frames of a Stage 1 and a Stage 2
       `stage1Simulation({ mode: '1', stage })` call it 0 times.
   - **Test 20:** `in phase 3 the Stage 3 bot attacks the real Myrddraal, not a shadow copy`: copy the boss setup from
     `tests/stage3-fade.test.mjs` (search `makeCopies`): phase 3, 2 copies placed nearer to Riley than the real one;
     step the bot; the real boss's `hp` drops before any copy is popped by a bot hit, and Riley's x moves toward the
     real boss.
5. Run checks A–E. **Expected total: 590.** In check D, `bot.js` ≤ 12288.
6. Commit with `T12: Stage 3 campaign bot and 9-seed campaign test`. Stop and report the per-seed table (grabs,
   escapes, tile hits, copies popped, lives left, clear time).

**Stop conditions for T12:**
- Any seed fails to clear, or a band fails, and only a game-value change would fix it.
- Check B or C fails (the new branch leaked into Stage 1/2), or `stage2-campaign`, `full-stage-simulation` or
  `bot-boss-*` change result.
- You'd need to edit any `src/` file other than `bot.js`, or an existing test.
- `bot.js` > 12288.

---

## T13 · Stage 3 asset and provenance tests (PLAN T13)

- **Create:**
  - `tools/stage3/frame-hashes.py` (Pillow; writes the frame-hash JSON);
  - `docs/stage3/frame-hashes.json` (its output);
  - `tests/stage3-assets.test.mjs` (9 tests).
- **Edit:** the evidence JSON only if check B says so.
- **Do not touch:** every `src/` file, every image, `ART_STATUS.json`, `anims.json`, every prompt JSON,
  `tests/stage3-placeholders.test.mjs` and every other existing test and helper.

**Deviations from PLAN T13:**
- **Pixel hashes are precomputed by Python.** The repo has no `package.json` and Node has no WebP decoder, so the
  mirror check (PLAN T13.6) and the painted-frame count can't decode pixels in the test. `frame-hashes.py` writes
  each frame's hash and horizontally flipped hash. The test checks the JSON is **fresh** (every recorded page sha256
  matches the current file) and then applies the rules. Stale JSON fails the test.
- **Riley's `ae700b1` hashes are frozen in the test**, not read from git: tests can't spawn `git` in some sandboxes
  (`EPERM`). Step 3 makes you prove the frozen values against `git show ae700b1:…`.
- **Atlases live in `assets/stage3/chars/`**, not `assets/chars/` as §4.1 says. That is T2's §2.4 decision (keeps
  Stage 3 out of boot and the Stage 1 audit); the test asserts the real location.

**Steps**
1. Check the tools first: `python3 -c "import PIL; print(PIL.__version__)"`. If Pillow is missing, **stop and report
   before changing files.** Never fake hashes.
2. Read PLAN T13 and §4.1, then `tests/stage2-assets.test.mjs` (the model), `tests/stage3-placeholders.test.mjs` (what
   is already covered; don't duplicate its exact assertions), `tools/stage3/art-manifest.json`,
   `assets/stage3/ART_STATUS.json`, and the three `assets/stage3/chars/*.anims.json` (anim names, `canvas`,
   `baseline`, `scale`, `pages`).
3. **Riley hashes.** For each of `riley-0.webp`, `riley-0_n.webp`, `riley-0_nl.webp`, `riley-0.json`, `riley-1.webp`,
   `riley-1_n.webp`, `riley-1_nl.webp`, `riley-1.json`, `riley.anims.json` in `assets/chars/`:
   ```bash
   git show ae700b1:assets/chars/$f | sha256sum ; sha256sum assets/chars/$f    # the two must match
   ```
   If any pair differs, stop and report. Otherwise paste the values into a frozen `RILEY_AE700B1` object in the test.
4. **`tools/stage3/frame-hashes.py`.** Header comment saying what it does and that it reads, never writes, art. For
   every `*.anims.json` in `assets/chars/` (Stage 1/2) and `assets/stage3/chars/` (Stage 3): for each page, record the
   colour page's sha256; for each frame in the page's `.json`, crop `frame` (x, y, w, h) from the RGBA image and record
   `sha256(rgba bytes)` and the sha256 of the same crop after `Image.Transpose.FLIP_LEFT_RIGHT`. If any frame has
   `rotated: true`, stop and report. Output, sorted and stable:
   `{ "pages": { "<path>": "<sha256>" }, "frames": [{ "char", "stage": 1|2|3, "page", "name", "hash", "flip" }] }`.
   Run `python3 tools/stage3/frame-hashes.py > docs/stage3/frame-hashes.json`. Run it twice; the outputs must be
   identical.
5. Create `tests/stage3-assets.test.mjs` (`dimensions`, `ROOT` from `../tools/audit-stage1.mjs`, the
   `globalThis.location`/`window` stubs as in `stage2-assets`). Copy the 9 names exactly:
   1. `cutthroat atlas matches PLAN §4.1: canvas 900×600, baseline 570, pack scale 0.62, one page`;
   2. `riley3 atlas matches PLAN §4.1: canvas 960×640, baseline 610, pack scale 0.85, one page`;
   3. `fade atlas matches PLAN §4.1: canvas 1100×700, baseline 670, pack scale 0.6, two pages`.
      Each: `meta.dir === 'assets/stage3/chars'`, the canvas, baseline, `scale` (the recorded pack scale) and page
      count; every frame inside its page; the colour, `_n` and `_nl` pages have equal sizes ≤ 4096. Read the real
      metas first: if any number differs from §4.1, stop and report. Don't change the number in the test.
   4. `cutthroat: every attack has at least five distinct painted frames (hold and grabthrow count as one)`:
      `slash` 5, `lunge` 5, `hold` + `grabthrow` 6 (use the real anim names with the manifest `prefix`);
   5. `fade: every attack has at least five distinct painted frames`: `slash` 6, `lunge` 5, `blinkout` + `blinkin`
      8, `fear` 5, `split` 5.
      For 4 and 5, "distinct painted" = the number of **different `hash` values** in `frame-hashes.json` over the
      sequence's frames is ≥ 5, not just the frame names.
   6. `riley3 has riley_grabbed (4) and riley_escape (4), and Riley's own atlas is byte-identical to ae700b1`:
      frame counts from `riley3.anims.json`; every `RILEY_AE700B1` hash matches the file.
   7. `every ART_STATUS entry names an existing prompt file with a tool, a tries count and its PLAN §4.2 prompt`:
      also, the entry ids deep-equal the §4.1 prompt-id column (copy the 30 ids from the table).
   8. `every real (non-placeholder) art entry records its source, tries and contact sheet`: write a pure
      `provenanceErrors(entry, prompt)` in the test. An entry with `placeholder: false` needs `source` in
      `['chatgpt', 'gemini']`, prompt `tries >= 1`, and a `contactSheet` path that exists. Run it over
      `ART_STATUS.json` (0 real entries today; log the count with `t.diagnostic`). Then run it on 4 fake entries:
      `source: 'grok'`, `tries: 0`, a missing `contactSheet`, and a good one. The first three each give an error; the
      good one gives none.
   9. `no Stage 3 frame is a horizontal mirror of another frame unless listed in facingFlips`:
      - every `pages` sha256 in `frame-hashes.json` matches the current file (fresh), and every Stage 3 atlas page is
        listed;
      - for every Stage 3 frame A and every other frame B (any stage, B ≠ A), `A.flip !== B.hash`, unless the pair is
        in `ART_STATUS.json` `facingFlips` (empty today);
      - identical frames (`A.hash === B.hash`) are not mirrors and are not checked here.
6. Run checks A–E. **Expected total: 599.**
7. Commit with `T13: Stage 3 asset geometry, painted-frame, Riley-hash, provenance and mirror tests`. Stop and report.

**Stop conditions for T13:**
- Pillow is missing, a frame is `rotated`, or `frame-hashes.py` output isn't stable across two runs.
- A Riley file's hash differs from `ae700b1`.
- An atlas number differs from §4.1, an attack has < 5 distinct frames, or a mirror is found. Report it; don't edit
  art or the test to pass.
- You'd need to edit an image, a manifest, `ART_STATUS.json` or an existing test.

---

## T14 · Real-art swap-in (PLAN T14; only after Jason approves each master)

Run this task **only** when the session prompt says Jason approved a specific item and gives the approved file's path.
One item per session. It never blocks T15 or T16. With no approval, there is nothing to do: report and stop.

- **Create:** the approved files at the item's existing path(s); `docs/stage3/shots/contact-<id>.jpg`; for a character
  sheet whose atlas isn't ready yet, `art-in/<id>/<id>.png` (see the deviation below).
- **Edit (only for the approved item):** its entry in `assets/stage3/ART_STATUS.json`; its prompt JSON in
  `docs/stage3/prompts/`; when a character's last sheet lands, that character's `assets/stage3/chars/*` files and its
  `anims.json` `placeholder` flag; `assets/bg3/plates.json` `placeholder` only when all 7 plates are real;
  `docs/stage3/frame-hashes.json` (re-run the T13 tool); the evidence JSON if check B says so.
- **Do not touch:** any `src/` file, any test, any other item's files or entries, Stage 1/2 art, Riley's
  `assets/chars/riley*` files.

**The approval gate.**
- **Masters** (`cutthroat-master`, `fade-master`): Jason approves the master first. No sheet of that character is
  generated or integrated before its master is approved.
- **Every other item** (sheets, plates, props, portrait, story panels) is approved **file by file** by Jason.
- Record the approval in the item's prompt JSON as `"approvedBy": "Jason", "approvedOn": "<YYYY-MM-DD>"`, quoting the
  session prompt. With no recorded approval, stop.

**Deviations from PLAN T14:**
- **Character sheets wait in `art-in/` until the whole character is approved.** All of a character's sheets share one
  atlas (`cutthroat-0`, `fade-0`/`fade-1`). The frozen `stage3-placeholders` tests check that every still-placeholder
  entry's files match their recorded placeholder sha256, and that placeholder normal maps are flat lossless cards.
  Repacking the atlas for one sheet would break those tests for the character's other sheets. So: an approved sheet is
  committed as `art-in/<id>/<id>.png`, with its contact sheet and provenance (`placeholder` stays true). When the
  **last** sheet of that character is approved, one session repacks the atlas and flips all of that character's
  entries together. `riley-s3a` is a single sheet, so it swaps right away. (This is PLAN's own "commit accepted PNGs
  under `art-in/<key>/`" rule, used for the shared-atlas case.)
- **Retiming that moves an active frame stops the task.** PLAN allows updating "the constants and their tests". That
  would edit existing tests, which this cycle forbids. Retiming holds is fine if no active, telegraph, counter or hit
  frame index changes. Edit holds in `tools/stage3/art-manifest.json` and the `anims.json` together (the placeholder
  test compares them). Otherwise stop and report for Jason.
- **Keep `prompts[0]` unchanged** (the placeholder test checks it quotes PLAN §4.2). If the generation used a changed
  prompt, append it as `prompts[1]` and record why.

**Steps (per approved item)**
1. Confirm the gate above. Read PLAN T14, §4 Conventions, the item's §4.1 row and §4.2 prompt, and its prompt JSON.
2. **The art itself.** Real art comes only from ChatGPT images (preferred) or Gemini, free tier, never Grok, never
   Seedance or Manus, with the §4 references attached. Use **only** the file Jason approved. Never generate, paint,
   recolour, blur, stretch, interpolate or mirror a substitute frame. **Flipping a sprite to face the other way is
   fine.** Record any flip in `ART_STATUS.json` `facingFlips` so T13 test 9 allows it.
3. **Check the content.** Riley on-model (16, very muscular, short dark hair, thin blue-framed glasses, sleeveless black
   Asha'man coat; never a kid). Kid-safe: no blood, no drawn knife, Twinkle Toes never shown in peril. Cutthroat and
   Fade face LEFT; Riley faces RIGHT. Exact §4 size and layout (character sheets 1536×1024, 8 cells of 384×512,
   baselines y=490/1000; plates 2172×724; strips 256 px frames; panels 1280×720; portrait generated at 1024² and
   downscaled to 256×256 WebP). Anything off-model or wrong-sized: reject it, record the rejection in the prompt JSON
   `rejections`, and stop.
4. **Contact sheet.** Run `spike-art/tools/contact.py` (read its header for usage) to write
   `docs/stage3/shots/contact-<id>.jpg`. View every frame.
5. **Integrate:**
   - **Non-character file** (plate, prop strip, portrait, story panel): replace the file **one-for-one** (same path,
     size, format, frame layout). Plates with `_n`: derive the normal with `spike-art/tools/nmap.py` (algorithmic, not
     art).
   - **Character sheet, not the last of its character:** commit `art-in/<id>/<id>.png` only.
   - **Last sheet of a character, or `riley-s3a`:** slice, register on the baseline and pack every approved sheet with
     `spike-art/tools/pack.py` at the §4.1 canvas, baseline and scale, and derive `_n`/`_nl` with `nmap.py`. Same page
     names, same frame names and same anim layout. If packing isn't possible on this box, keep the PNGs in `art-in/`,
     say so, and stop (Stage 2 handoff rule).
6. **Records:** in `ART_STATUS.json`, for every entry that now points at real bytes: `placeholder: false`, the new
   `sha256` for each file, `source` (`chatgpt`/`gemini`), `contactSheet`. In the prompt JSON: `tries` (≥ 1),
   `rejections`. Set the character's `anims.json` `placeholder: false` only when all its entries are real. Set
   `plates.json` `placeholder: false` only when all 7 plates are real. Re-run
   `python3 tools/stage3/frame-hashes.py > docs/stage3/frame-hashes.json`.
7. Look at it in game if you have a browser (`?stage=3&s3=1`; for the boss add `&skip=boss`). The `PLACEHOLDER ART`
   tag disappears only once nothing is a placeholder.
8. Run checks A–E. **Expected total: unchanged** (the previous commit's total). Every T2 (`stage3-placeholders`) and
   T13 (`stage3-assets`) test stays green.
9. Commit with `T14: real art for <id> (approved by Jason <date>)`. Stop and report the item, source, tries,
   rejections and contact-sheet path.

**Stop conditions for T14:**
- No recorded approval from Jason, or the file isn't the one he approved.
- The art is off-model, not kid-safe, the wrong size or layout, or would need a substitute or faked frame.
- Any T2 or T13 test fails (for example, a mirror that isn't a facing flip, or fewer than 5 distinct attack frames).
- Retiming would move an active frame, or a `src/` or test change would be needed.

---

## T15 · Preservation gates, perf and memory (PLAN T15)

- **Create:** `tests/stage3-memory.test.mjs` (3 tests), `docs/stage3/perf.json`, `docs/stage3/perf-runs.log`.
- **Edit:** the evidence JSON only if check B says so.
- **Do not touch:** every `src/` file, every existing test and helper, every asset, `docs/stage2/perf*`.

**Deviations from PLAN T15:**
- **The original-test count is 325, not 322.** The 322 tests in the files that existed at `ae700b1` now include T9's
  additive `hud-input` block (+3). The gate is that none of the 322 changed, checked by diff in step 1.
- **Stage 3 perf has no `ae700b1` comparison**, because Stage 3 doesn't exist there. Stage 1 and 2 are compared
  against `ae700b1`; Stage 3 is reported at head only.

**Steps**
1. **Preservation (PLAN T15.1–2):**
   ```bash
   git diff --name-only --diff-filter=MDR ae700b1 -- tests/       # must print only tests/hud-input.test.mjs
   git diff ae700b1 -- tests/ | grep '^-[^-]'                      # must print NOTHING
   git diff ae700b1 -- tests/hud-input.test.mjs | grep '^[-+]' | head   # only + lines, after the last original line
   node --test $(git ls-tree --name-only ae700b1 tests/ | grep '\.test\.mjs$')   # 325 pass, 0 fail
   ```
   Then checks B and D (Stage 1 diff empty, audit passes). If any step fails, stop.
2. **The four frozen §2.1 assertions** (`stage2-flow.test.mjs` `stageFromQuery('stage=3') === 1`, both Stage 2 clear
   `{ stage: 1 }` restarts, title select `[2, 1, 2]`) still exist unchanged and pass. Quote them in the report. They
   stay until T17.
3. Read `releaseStage(toStage` in `src/stage1.js`, `STAGE_TEXTURES`/`STAGE_CHARS`/`SHARED_TEXTURES` in
   `src/stages.js`, the `sceneA.releaseStage(3, 2)` mock in `tests/stage-registry.test.mjs`, and `textureEstimate` in
   `tools/audit-stage1.mjs` (the RGBA8 estimate method).
4. Create `tests/stage3-memory.test.mjs`. Copy the 3 names exactly:
   1. `Stage 3 resident texture estimate (colour, _n and _nl pages, plates, props, portrait, story panels) is at most
      110 MB`: RGBA8 base level, `w * h * 4` from `dimensions()`. Count every page in the three Stage 3 `anims.json`
      (colour + `_n` + `_nl`), every `art-manifest.json` image (`file` and `normal`), and `assets/bg3/plates.json`'s
      images if it lists any that aren't already counted. Assert `≤ 110 * 1024 * 1024` and print the total with
      `t.diagnostic`. If it's over, stop and report. Don't drop files from the sum.
   2. `switching stages 1 → 3 → 2 → 3 → 1 leaves only the current stage's own and shared art resident`: copy the small
      scene mock from `stage-registry.test.mjs` into this file (don't import or edit it). Call
      `Stage1.prototype.releaseStage` for each switch. After each one, every key in `STAGE_TEXTURES[j]` for j ≠ the
      current stage that isn't in `SHARED_TEXTURES` or the current stage's list is released. The same goes for the
      atlas keys of `STAGE_CHARS[j]`. The current stage's keys are never released.
   3. `three Stage 3 restarts in a row leave lights, timers, tweens, emitters and textures where they started`:
      - `stage3Simulation({ mode: '1', followRestart: true })`; record `h.resources()` once started;
      - 3 times: step 30 s with the bot, restart the way `tests/stage3-hud.test.mjs` test 3 does (search
        `followRestart`), and step until started;
      - every `h.resources()` count deep-equals the first record.
5. Run checks A–E. **Expected total: 602.**
6. **Perf (PLAN T15.4).** Needs a browser. Copy the method of `docs/stage2/perf.json` (same headless Chrome flags if
   that's what you have, 1280×720, default quality, the demo bot, cutscenes excluded, over33 = frames > 33.4 ms):
   - serve head and a scratch worktree of `ae700b1` (`git worktree add /tmp/rwb-ae700b1 ae700b1`; remove it
     afterwards with `git worktree remove /tmp/rwb-ae700b1`) with `python3 -m http.server`;
   - scenarios, 3 reps each, alternating builds: `S1-B stage start` (`?demo=1`), `S1-A boss arena`
     (`&skip=boss`), `S2-B`/`S2-A` (`?stage=2…`), then at head only `S3-B stage start` (`?stage=3&s3=1&demo=1`),
     `S3-R rooftops` (zone 2, tiles), `S3-A boss arena` (`&skip=boss`);
   - press **H**, read `window.__perf.summary.fight` (and `all`);
   - write one JSON line per rep to `docs/stage3/perf-runs.log`, and the per-scenario averages to
     `docs/stage3/perf.json`, both in Stage 2's field names (`avgFps`, `avgFightFps`, `avgFightOver33pct`,
     `avgAllOver33pct`, `avgFightFrames`). `method` states the hardware and whether the renderer was software.
   - **Frame rate must stay flat** for Stage 1 and 2. If head's avg fight fps for S1/S2 is outside the min–max of the
     `ae700b1` reps, run 3 more reps of that scenario. If it's still outside, report it as a regression.
   - **With no browser**, write `perf.json` as `{ "measured": false, "reason": "<why>", "ipad": "UNMEASURED: for
     Jason" }` and no numbers. **Never invent numbers.**
7. **iPad (PLAN T15.5):** add an `ipad` field to `perf.json`: `"UNMEASURED: for Jason"` plus the steps: open the
   githack link with `?stage=3&s3=1`, play to the boss, note stutter and the PLACEHOLDER tag.
8. Commit with `T15: Stage 3 preservation gates, memory test and perf record`. Stop and report, **smoothness first**
   (avg fps and frames over 33 ms per scenario, or "not measured").

**Stop conditions for T15:**
- Any preservation command in step 1 or 2 fails, or check B/C fails.
- The texture estimate is over 110 MB, or a stage switch leaves another stage's art resident.
- Resources grow across restarts (a leak). Report which count grows; don't fix `src/` in this task.

---

## T16 · Stage 3 docs and handoff (PLAN T16)

- **Create:** `docs/stage3/README.md`, `docs/stage3/HANDOFF.md`, `docs/stage3/shots/*` (screenshots and contact
  sheets).
- **Edit:** nothing else. No `src/`, no tests, no assets, no older docs.

**Deviation from PLAN T16:** the handoff report is a file, `docs/stage3/HANDOFF.md`, so it lands in the commit.
`docs/stage2/YETTI_HANDOFF.md` is the precedent.

**Steps**
1. Read PLAN T16 and §5, `docs/stage2/README.md` (its headings: how to play and test, layout, enemies, boss, art,
   audio, tests), `docs/stage3/perf.json`, HARDENING.md and the reports from T12–T15.
2. **`docs/stage3/README.md`**, in Stage 2's shape:
   - **How to play and test:** `?stage=3&s3=1`, `&story=0`, `&skip=boss`, `&demo=1`, `&god=1`; that `?stage=3` without
     `s3` is Stage 1; `node --test tests/*.test.mjs`; checks B and C.
   - **Layout:** 4 zones, 5200 px, golden afternoon to torchlit night; roof tiles in zone 2; the Fade-far glimpse.
   - **Enemies:** the Darkfriend cutthroat (34 HP, grab, mash out, kid-safe KO or flee), returning zealots, archers and
     hounds.
   - **Boss:** the Myrddraal (440 HP): blink, fear aura (fire or lightning dispels it), split into 2 copies (hit the
     real one, which casts a shadow).
   - **Art:** the §4.1 table with status per item (placeholder, or real with source and prompt file), from
     `ART_STATUS.json`.
   - **Audio:** music files and LUFS; voices (Kokoro for Riley/narrator, ElevenLabs `eleven_v4` for Gill, cutthroat,
     Myrddraal), the STT check.
   - **Tests:** the Stage 3 test files and what each covers; the total (602 plus nothing else).
   - Riley is described on-model (16, very muscular, short dark hair, thin blue-framed glasses, sleeveless black
     Asha'man coat). Content stays kid-safe.
3. **`docs/stage3/shots/`.** With a browser: title with STAGE 3 selected, a story panel, zone 0, a cutthroat grab with
   the mash ring, roof tiles, the boss in each phase, the fear arc, the split, the clear card. Use the names
   `NN-<what>.jpg`, like Stage 2's. Contact sheets: `spike-art/tools/contact.py` for each Stage 3 atlas →
   `contact-<char>.jpg`. These show the current art as it is (placeholders are already labelled). With no browser,
   write "screenshots not captured (no browser)" in the README and the handoff. Never mock up a screenshot.
4. **`docs/stage3/HANDOFF.md`**, in this order:
   1. branch, full head SHA (`git rev-parse HEAD`) and the githack link for `?stage=3&s3=1`;
   2. **smoothness first**: the T15 numbers, or "not measured";
   3. the test count (602) and the per-task totals (543 / 551 / 558 / 562 / 570 / 590 / 599 / 602);
   4. Stage 1 evidence identical yes/no; the audit result; check C (SAME against the 8d8d17b capture);
   5. the checklist T1–T16, each marked done, partly or not done, with **T17: not started (Jason-gated)**;
   6. every file changed in the pass and why (`git diff --stat ae700b1..HEAD`, grouped);
   7. art list status: placeholder vs real, with source and prompt file per item;
   8. open items: Q1 (counter-only, no parry button), Q2/T17 (stays behind `s3=1`), Q3 (score and lives reset;
      carry-over not implemented), Q4/Q5 defaults, ElevenLabs takes not loudness-matched to Kokoro −16 LUFS, vignette
      strength and the iPad check in a real browser, and every recorded deviation from BUILD-T3-T6, BUILD-T7-T11 and
      this file.
5. Run checks A–E. **Expected total: 602.**
6. Commit with `T16: Stage 3 README, screenshots and handoff`. Stop and report, then do the **Final steps**.

**Stop conditions for T16:**
- Any check fails, or a number in the docs doesn't match a real test run, perf file or report. Never write a number
  you didn't see.

---

## Rules for every task

- **Tests:** never edit, loosen, skip or delete an existing test or helper. New tests go in new files.
- **Frozen output:** Stage 1 and Stage 2 output stay byte-identical to their baselines (checks B and C). Without
  `s3=1` the game is the 2-stage game.
- **The four frozen Stage 2 assertions** (PLAN §2.1) stay exactly as they are until T17, which needs Jason's explicit
  OK.
- **Art:** no faked or AI-substituted art from the builder: no recolouring, blurring, stretching, interpolating,
  mirroring into "new" frames, generating or drawing shapes in place of a sprite or plate. **A horizontal flip to face
  the other way is fine** (record it in `facingFlips`). Real art only from Jason-approved ChatGPT/Gemini output, one
  item at a time (T14). Normal maps from `nmap.py` and contact sheets aren't new art.
- **Riley stays on-model:** 16, very muscular, short dark hair, thin blue-framed glasses, sleeveless black Asha'man
  coat. Never a kid.
- **Kid-safe:** no gore; cutthroats are KO'd (stars) or flee; tiles knock Riley down; the Fade melts into shadow;
  Twinkle Toes is only a ribbon or bundle, never in peril.
- **Branches:** never touch `main`, never push to `rwb-w2`, never merge, approve or mark PR #20 ready.

---

## Frame-rate budget (every task)

- **Lights (PLAN §2.5, `maxLights` 10).** The worst case stays hero 1 + torches 4 + fireball 1 + pickup 1 + ribbon 1 +
  power 1 = **9 ≤ 10**. T12–T16 add **zero** lights. T7 test 6 still asserts the budget; T12 asserts lights ≤ 10
  after every clear.
- **No new per-frame allocations.** `evadeStage3` uses index loops and fields (`mashT`, `next`), never
  `filter`/`map`/`sort`/`slice`, arrays or closures per frame, and never `scene.time.delayedCall`.
- **No new textures, shaders, pipelines or filters.** T14 replaces files one-for-one at the same sizes, so the texture
  budget (T15 test 1) doesn't move.
- **Measure, don't guess.** Headless: `h.resources()`, `kit.lightBudget`, `h.observations.peak`. Browser: T15 step 6.
  With no browser, write "not measured". **Never invent numbers.**

---

## Common risks

| Risk | What to do |
|---|---|
| Line numbers are out of date | Search for the quoted code and re-read the whole function before editing. |
| The bot branch changes Stage 1/2 | It's gated on `s.stageNo === 3` and draws no `Math.random`. Checks B and C and test 19 prove it. |
| A seed won't clear or a band fails | Tune `bot.js` only. Never change game values. Report the per-seed numbers. |
| No copy is ever popped | Copies pop when hit by a combo, fireball or shield in passing. If a seed still shows 0, report it; don't change `myrddraal.js` (0 bytes free). |
| `frame-hashes.json` is stale after an art change | Re-run `tools/stage3/frame-hashes.py`; T13 test 9 checks freshness. |
| One sheet's swap breaks the placeholder sha256 test | Sheets wait in `art-in/<id>/` until the whole character's atlas can be repacked (T14 deviation). |
| A retime moves an active frame | Stop; that needs a test change and Jason's call. |
| Tests can't spawn `git` (`EPERM`) | Riley's `ae700b1` hashes are frozen in the T13 test and proven by hand in step 3. |
| No browser for perf or screenshots | Write "not measured" / "not captured". Never mock numbers or images. |
| Someone asks to "just open Stage 3" | That's T17. It needs Jason's explicit OK. Don't start it. |

---

## Final steps (after T16 is committed and reported)

1. Run checks A–E on the T16 commit. The total must be **602**.
2. `git log --oneline <T11>..HEAD` must show T12, T13, T15, T16, plus one commit per T14 item if any ran.
3. `git push origin rwb-2-stage3-ag`. The cycle stays on the **existing draft PR #20**, which updates itself.
4. **Don't open a new PR or change PR #20's state** unless Jason asks. If he asks for a status comment, paste the
   handoff's sections 2–5 and 8.
5. **Never** use `--base main`. **Never** push to `rwb-w2`. **Never** merge, approve or mark the PR ready. **Never**
   start T17. Jason approves every merge.
