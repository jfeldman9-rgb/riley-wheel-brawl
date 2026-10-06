# Build brief: Animation port, Pass 1 (render-only)

Repo `jfeldman9-rgb/riley-wheel-brawl`. Base `rwb-w2` (live Pages branch). Work branch **`rwb-anim-port-p1`**. Output: one **DRAFT** PR into `rwb-w2`
titled **"Animation port Pass 1 (render-only)"**. Source plan: `docs/ANIMATION-PORT-PLAN.md` (by Claude). This brief folds in three model reviews
(Kimi, GLM, Nemotron), keeping only the review claims that were checked against the code. Where this brief and the plan disagree, **this brief wins**.
In scope: T0–T5 (T1b is optional and goes in its own commit). **Out of scope:** Pass 2 (Trolloc scale, `?tscale=1`) and Pass 3 (hit-freeze, HITSTOP trims,
camera deadzone/look-ahead/lerp, jump squat). Line numbers below were checked on `rwb-w2` @ `77d4710`. `src/` and `tests/` are identical at `9f53302`.

## Hard guardrails (verbatim; non-negotiable)
- `src/input.js` untouched.
- Controls, HUD and touch layout unchanged.
- No combat/logic changes: the golden simulation diff must be empty and the Stage 2 fingerprint identical.
- Don't edit existing tests (new tests OK).
- `bonus-waygate/` untouched.
- No art changes.
- Draft PR only, no merge.
- Never push to `main` or `rwb-w2`. Push only to `rwb-anim-port-p1`.

Determinism rules (plan §3): keep the same number of `Math.random()` calls on every update path (`FX.shakeOffset` makes 2 per frame, always;
`Fighter.sync` makes 1 when `shudder` is set). Don't change `fi`/`done`/`st`/`anims.globalTimeScale` in any state that reads them, and don't touch
`camX`, `bounds`, `camMax`, `fx.hitstop` or `fx.slowmo`. All new smoothing is `1 - Math.exp(-dt*k)`, never a fixed per-frame factor. No new textures, no new filters,
no per-frame allocation in `play()`, `sync()` or `shakeOffset()`. Each edited file gets one small hunk where possible, so it merges cleanly with Stage 3.

## Commit 1: docs only
Commit `docs/ANIMATION-PORT-PLAN.md` (the text supplied in the prompt, with the 22%→~18% correction already applied) and this brief as
`docs/GROK-BRIEF-P1.md`. Make no code changes in this commit.

## T0: baselines and the pass-0 determinism check (before editing any code)
1. `node tests/helpers/run-full-stage-simulations.mjs > /tmp/s1-a.json`, then run it again into `/tmp/s1-b.json`. Strip `sourceSha256` and `baseGitCommit` from both with
   `jq 'del(.sourceSha256,.baseGitCommit)'` and diff them. They **must match** (Nemotron). If they don't, stop and report: the harness is nondeterministic. Keep `/tmp/s1-a.json` as `/tmp/s1-before.json`.
2. Stage 2 fingerprint: write `/tmp/s2fp.mjs` **outside the repo**, as plan T0 describes (`stage1Simulation({ mode: '1', stage: 2 })` per `FULL_STAGE_SEEDS`, ≤36000 steps,
   print `JSON.stringify({ seed, ...h.summary(), kit: s.kit.stats })`). Run it twice and confirm the two outputs are byte-identical. Save one as `/tmp/s2-before.txt`.
3. Scope the fingerprint (Kimi): read `run-full-stage-simulations.mjs`, `summary()` and the s2fp output, and confirm they record only logic and outcome fields, not
   scene state as a whole. The new fields (`_sx`, `_sy`, `_dt`, `heroLightX`) must not be able to leak into them. Run `rg -n "getBounds|getHitArea|displayOriginX|originX" src`
   and confirm nothing on the logic path reads sprite geometry (expected: no hits on the logic path). Put the result in the PR.
4. `node --test tests/*.test.mjs`. Record the pass, fail and skip counts.
- **Accept:** double-run diffs are empty for both the golden and s2fp, the counts are recorded, and the grep result is noted.

## T1: per-animation pivot (Riley)
- New `tools/gen-anim-pivots.mjs`. It reads `assets/chars/<k>.anims.json` plus the atlas page JSON(s). For **every** anim (loop **and** one-shot), it takes the
  **median over all frames** of `(spriteSourceSize.x + spriteSourceSize.w/2) / sourceSize.w` (Kimi: not frame 0 for one-shots), rounds to 0.005,
  and applies an `OVERRIDES` map (empty at first). It emits a frozen `ANIM_PIVOT_X` map into the new file `src/anim-pivot.js` (`riley_*` only for T1).
- `src/fighter.js` `play()`, as one hunk: after `this.sprite.play(key)`, add
  `const px = ANIM_PIVOT_X[key]; if (this.sprite.setOrigin) this.sprite.setOrigin(px ?? this.def.anchorX, this.meta.baseline / this.meta.canvas[1]);`
  The same-anim early return (`if (!restart && this.cur === key) {...; return; }`) **must stay first and still skip setOrigin** (GLM). `air()` calls
  `play(want,1,false)` every frame. Don't touch `RILEY_DEF`, `TYPES` or `sync()` logic, and don't touch the constructor's setOrigin.
- Expectations (Kimi): the flip pop (~56 world px) and the inter-anim pops go away. **Intra-loop wobble of 1–3 px remains**; that is normal, so don't chase it.
  Combo chains re-origin 3–5 px per step (combo1→2→3); that's expected.
- **Visual-reach check (Kimi):** for combo1/2/3, runkick, back and airkick active frames, measure the drawn foot or fist extent relative to logical x after the pivot change,
  and compare it with `ATK[*].x0/x1`. If the art now lands more than 10 px short of, or beyond, the hit zone, **report it in the PR as a table. Do not change hitboxes.**
- New test `tests/anim-pivot.test.mjs`: every `riley_*` anim has an entry in [0.40, 0.60], **and** the committed table exactly equals a fresh generator run.
- **Accept:** all tests pass, the golden diff is empty, the PR lists the generated table with frame counts (including `riley_run`), and the reach table is in the PR.

## T1b (optional; separate commit, listed separately in the PR)
Extend the table to `grunt_*`, `spear_*`, `hound_*` and `chief_*` (grunt walk ≈ 0.530, replacing anchor 0.55). No Stage 2 Whitecloaks yet. Same acceptance as T1.

## T2: calm the shake (`src/fx.js` + one line in `fighter.js`)
- Constructor: `this._sx = 0; this._sy = 0; this._dt = 1/60;` (GLM: otherwise NaN). `update(dt)`: `this._dt = dt;` (update runs during hitstop too).
- `shakeOffset()`: still exactly **two** `Math.random()` calls, in the same order. Amplitude `18*sh`/`12*sh` → **`10*sh`/`5*sh`**. **Do not also apply a heavy
  low-pass** (GLM: double attenuation, and filtered noise reads as drift). Use only a mild, frame-rate-independent filter, e.g. `k = 1 - Math.exp(-this._dt*60)`
  (≈0.63 at 60 Hz), `this._sx += (rx - this._sx)*k`, so the output stays zero-mean jitter. When `this.trauma === 0`, set `_sx = _sy = 0` (Kimi) after the two random calls.
  Optional (Kimi): return a persistent `this._out` array instead of allocating a new one.
- `src/fighter.js` `sync()`: shudder `* 4` → `* 2`. Keep the `this.shudder ?` condition and the `Math.random()` call.
- Leave `SHAKE`/`HITSTOP` alone. Note in the PR (Kimi): shake and `setScroll` still run during hitstop, because `updateCamera` is called in the hitstop branch
  (`stage1.js:646-650`). With the lower amplitude that's now acceptable. Don't restructure it in Pass 1.
- **Accept:** moon and fire-light tests pass unedited, the golden diff is empty, and the s2fp output is identical.

## T2b: round the final camera scroll (GLM; added to Pass 1)
- `src/stage1.js` `updateCamera`, line ~698: round **only the arguments passed to `setScroll`**, in device pixels. The camera zoom equals the render scale (`cam.setZoom(this.rs)`,
  line ~108; `setRoundPixels(false)` stays), so: `const rs = this.rs || 1; this.cameras.main.setScroll(Math.round((this.camX + sx)*rs)/rs, Math.round(sy*rs)/rs);`
  `camX`, `bounds` and `camMax` stay unrounded. Leave the `placeMoon`/`placeFires` arguments as they are, unless existing tests stay green **and** the moon visibly
  swims against the plates. Then pass them the same rounded x and say so in the PR. Make sure `this.rs` is current after a governor render-scale change; read it where it's kept.
- **Accept:** the golden is identical (setScroll is stubbed), and there's no visible shimmer on plates during shake at rs=1 and the default rs.

## T3: light the kick (render-only)
- `src/stage1.js` heroLight line (~684, after `updateCamera`, skipped during hitstop, which is fine): replace `x = R.x - 90` with the eased
  `this.heroLightX += (R.x + R.facing*30 - this.heroLightX) * (1 - Math.exp(-dt*12)); this.heroLight.x = this.heroLightX;` on the **same line or hunk**, keeping
  `heroLight.y = R.y - 300 - R.z` and the `lightsOn ? 1.0 : 0` intensity unchanged (GLM). Initialise `this.heroLightX = R.x + R.facing*30` in `create()`
  right after Riley and `heroLight` exist. `create()` runs on every restart, so that also resets it (Kimi).
- `src/fx.js` `impact()`: flash scale 0.7/1.0/1.5 → **0.55/0.8/1.15**, start alpha 0.85 → **0.7**, `flashT = 0.06 + HITSTOP[kind]/120`. `update()` sets alpha to
  `flashT*8`, so cap it with `Math.min(0.7, this.flashT*8)` or the 0.7 start won't hold. Particle counts and hitLight don't change.
- **Accept:** bloom, perf and lighting tests pass, spark counts are unchanged, and the golden diff is empty.

## T4: continuous walk↔run stride (`src/riley.js`, `free()` only)
- Replace `if (this.state !== st) this.setState(st, st);` (line ~71) with `this.setLoco(st)`. From idle or any other state, it behaves exactly as today.
  On walk↔run only:
  1. **Before** touching anims, compute the target (GLM): `const a = this.sprite.anims, ca = a && a.currentAnim, fr = ca && ca.frames;`
     `const n0 = fr ? fr.length : 0, ph = n0 ? (this.fi + 0.5) / n0 : 0;` (Kimi: use `frames.length`, never 8).
  2. `this.setState(st, st, ts)`. If a cadence `ts` applies, it goes in here, **before** `setCurrentFrame` (Kimi), because play() resets timeScale.
  3. Re-read the new anim, guarding `currentAnim` and `frames` separately. `const nf = na.frames; const tgt = nf[Math.floor(ph * nf.length) % nf.length];`
     then `if (tgt && a.setCurrentFrame) a.setCurrentFrame(tgt);`. `setCurrentFrame` is present in `lib/phaser.min.js` (4.2.1). Confirm its semantics
     (whether it resets the hold accumulator). If it's unusable, use `play({key, startFrame})` or accept a one-frame phase error, and note which you chose.
  4. Footsteps (Kimi, `riley.js:72` `if (this.st % 0.3 < dt) sfx.step()`): after `setState` resets `st = 0`, seed `this.st` to preserve the
     step phase (e.g. `this.st = prevSt % 0.3`), so steps don't stutter on walk↔run. **Run `rg -n "\.st\b" src`, confirm nothing else reads `st` in walk/run, then
     verify the golden.** If the golden diff becomes non-empty, drop the st seeding and report it.
- Cadence: measure boot travel per walk/run frame with Python/PIL in the sandbox (don't commit it). Speed = travel × 0.682 / hold. Apply `ts` (clamped [0.85, 1.20])
  only if it is more than 12% off 205/390. Put the numbers in the PR either way.
- **Accept:** golden empty, s2fp identical, and rapid run toggling (Shift, double-tap, touch-stick edge) shows no leg reset or footstep stutter.

## T5: verify and document (final checklist; every item goes in the PR body)
1. `node --test tests/*.test.mjs`: **fully green**, with the T0 pass count plus the new tests, 0 failures and 0 skips. No existing test file is modified (`git diff --stat rwb-w2 -- tests` shows only new files).
2. Regenerate the golden with `node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json`, then diff it against
   `/tmp/s1-before.json` with `jq 'del(.sourceSha256,.baseGitCommit)'` on both. The diff must be **empty**. Commit the regenerated file (only sha/commit change).
3. `/tmp/s2fp.mjs` output is **byte-identical** to `/tmp/s2-before.txt`.
4. Frame-rate check at **30 / 60 / 120 Hz** (30 via DevTools CPU ×4 throttle or a 30 Hz mode; 120 via a high-refresh display, or say it wasn't available) at `?rs=1` and the default rs.
   Check that shake, light easing and stride look the same at each rate. Give short notes per rate.
5. Preview URL of the **head commit**: `https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/<HEAD_SHA>/index.html` (plus `?god=1`, and `?god=1&skip=boss`).
6. Before/after screenshots, or short notes if you can't capture them: turnaround (no hop, shadow under the boots), walk→run, jump drift, and a kick string (foot lit, flash smaller).
7. `git diff --stat rwb-w2` touches none of `src/input.js`, `bonus-waygate/`, `assets/`, HUD or touch files. Report the review-fix list as done or not done.
8. The PR stays **DRAFT**. Don't merge it or request a merge.
