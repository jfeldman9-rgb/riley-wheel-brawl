# Stage 5 hardening

Sweeps use `tests/helpers/stage5-harness.mjs` (story skipped). The nine campaign seeds are 1, 2, 3, 4, 5, 10, 20, 100, 97, plus a no-power clear on seed 1.

## Campaign

`tests/stage5-campaign.test.mjs` requires every seed to clear with each mechanic stat at least once: hints, stalkers, pounces, pounce counters, flushes, pods, spores, lashes, thorn ticks, gouts, tethers, tether counters, rings, hands, staffs, short steps, flails, parries, steps, step counters, embraces, escapes, the Green Man, surges, surge counters, the oak, the ribbon, and the ridge glimpse. Continue after the clear returns to the title, `{ stage: 1 }`. Score and lives are not carried in.

Every tenth frame checks finite positions, lanes 572–690, the attack-token cap, at most two holders, at most two gout tells, one lash tell, two stalkers, two spores, and at most 10 lights.

## What is released on the way out

- Riley dying calls `releaseHold('break')` on his grabber and on every enemy in the same call. A grabbed enemy at 0 HP is finished instead of left in `holding`.
- `clearHazards` / zone clear drops blight hazards and the arena, releases holds, and sets `riley.fogSlow` to 0.
- A second Balthamel coil cannot grab Riley while `grabbedBy` is set.
- A tether will not start while Riley is held, and a grab breaks a locked tether.
- Phase 2 calls the beat at 50 seconds. During the beat Aginor is invulnerable, so a hit cannot kill him. Balthamel stays hittable until the beat seizes him, so the two are never both invulnerable.
- Phase 2 stops scheduling wither rings and still steps a ring that already started, and it clears bone hands.

## Governor, clock, counters

`Stage5Kit.setQuality` writes `fx.quality` and forwards to the blight and the arena for levels 0–5, including the software-WebGL start at 4. `stage4Delta` rejects non-finite and non-positive deltas. `substeps` caps a huge frame at `SUB_CAP`. A lurker flush counts once per lurk entry, on the hit, and a later hit while he is not lurking does not count again.

## Idle and no power

With no bot, 120 seconds of standing still does not throw, does not leave a hold, and stays inside the light cap. `?nopower=1` on seed 1 still clears. The bot never spends saidin. Melee, the pounce counter, the flail parry, and the embrace mash are enough.

## What these sweeps do not claim

They do not measure GPU frame time, audio output, or a physical gamepad. Lights are logical handles. Painted Aginor and Balthamel atlases are in `assets/stage5/` (pending review). Stage 5 voice lines and music loops are. A burst before the Green Man beat cannot drive Aginor through the next phase gate or to 0 HP. The floor stays until `startBeat` sets `beatFired`. A hit during the beat itself does not kill him.

## Hardening cycle 2 (Codex Sol)

Confirmed failures were reproduced in new `stage5-hardening2-*` test files before fixes. Existing tests and helpers, golden evidence, controls/HUD/touch layout, `lib/`, `index.html`, `assets/`, and `bonus-waygate/` were not edited. `src/stage5.js` stays at 12196 bytes. Gameplay constants stay unchanged: mash 7 in 2.8 s, oak 1 HP/s to 50%, the Green Man clamp and both phase thresholds.

- `aginor.js`: post-beat burst damage skipped phase 3; repeated hurt could delay the P2 timeout indefinitely; a timeout starting mid-frame could run more boss substeps. Preserve the next phase gate until entry, check the beat before hurt/tether returns, and stop frozen substeps. The original synthetic `beatFired`-without-`beatDone` test contract remains intact.
- `stage5-lifecycle.js`, `stage5-beat.js`, `stage5-arena.js`: the beat froze the bosses but allowed Riley, projectiles, scene clocks and animation/tween clocks to advance. Freeze gameplay and input while advancing only the beat; restore clocks on beat end and disposal. Pause now releases Balthamel synchronously, as requested in this hardening pass.
- `stage5-hurt.js`, `aginor.js`: tether drain bypassed getup invulnerability, death, god mode and safe oak entry; direct hazard strikes could damage during a story/beat. Central damage eligibility protects these paths, including saidin drain and Aginor healing. A locked tether breaks upon entering the oak.
- `stage5-arena.js`: the oak healed dead/downed Riley; existing hand tells advanced during grabbed/down/getup; new hand/ring tells consumed the frame creating them and could resolve immediately on a huge direct delta. Protect healing eligibility, freeze busy hand tells and start new tells at zero.
- `balthamel.js`, `stage5-balthamel.js`: the first flail hit latched out the second strike; a coil could catch residual getup invulnerability; invalid actor deltas moved the drop and knockback. Reset the per-strike latch, reject invulnerable catches, validate actor/physics deltas and integrate the drop consistently at 30/60/120 Hz. Mash constants are unchanged.
- `stage5-clock.js`: a capped tab-resume frame retained 1.5 s of backlog for the next frame despite claiming to drop it. Discard excess whole substeps.
- `blightspawn.js`, `stage5-spores.js`: three simultaneously swelling pods could exceed the two-spore cap at launch, and dead stalkers/pods (also Aginor) never retired. Recheck the flight cap at launch and advance corpse cleanup clocks without firing death callbacks again.
- `stage5-actors.js`, `stage5-spawn.js`: authored spawn points could be directly on Riley. Prefer free authored spots and otherwise use open ground away from Riley and the exit.
- `stage5-blight.js`: cleared tar seeps returned to idle and could restart tells/slow Riley during exit. Mark them gone.
- `stage5-view.js`, `stage5-effects.js`: hazard footprints, hand/spore landing tells, expanding rings and shadow-step destinations had no world rendering; view teardown dropped references without removing its lights, scenery or glimpse timer. Add the missing world tells and dispose their owned resources.
- `stage5-view.js`: assigning an integer to the Eye/oak/flare light's `color` replaced Phaser's RGB vector and broke renderer reads. Retint with `setColor`; three regressions load the pinned library's actual Light implementation.
- `bot-stage5.js`, `stage5-bot-combat.js`: regression campaigns exposed real controller failures: a 50 px escape guard was unreachable at the 62 px collision separation, band-midpoint rounding reversed tether dodges, walls/boss bodies blocked hand dodges, string dodges returned during a second strike or kept stale directions, attack buffering and parry timing missed the first active flail frame, the bot killed counter opportunities before exercising them, and it sought healing from a closed oak or charged a lethal staff while overdrawn. Fix controller decisions using the existing attack windows, collision separation, damage and tell clocks; no player combat tuning. Helpers are siblings to preserve caps.
- `tools/audit-stage1.mjs` counts every new sibling in the existing Stage 5 source budget; no budget was raised.

New tests: 71 across combat (26), lifecycle (17), clock (2), bot (15), verification (8), and renderer (3). Full suite: **1063 pass, 0 fail, 2 skip** (1065 total). Stage 3/4/5 nine-seed campaigns remain **9/9**, including the Stage 5 no-power clear. The Stage 1 golden combat diff is empty. No golden-listed source file changed. Per-file caps pass; pre-fight inventory is **24905593 / 25000000 bytes** and Stage 5 source is **115628 / 196608 bytes**.

This sandbox's Node child-process capture reports `EPERM` even for successful exit-code-0 children, and loses stdout from directly spawned Node children. Validation used a temporary `/tmp/s5-spawn-shim.mjs` Python carrier, without altering repository tests/helpers. `NODE_OPTIONS='--import=/tmp/s5-spawn-shim.mjs' node --test tests/*.test.mjs` passes; a temporary runner also executes each unchanged test file directly to recover the inner test counts (the sandbox otherwise reports only file-level results). Golden reproduction uses the same environment workaround.

Already sound: held input edge counting, the 7/2.8 mash contract, synchronous down/respawn/continue/death release paths, the second-coil ownership guard, oak rate/cap, stalker/pod live caps, Stage 4→5 score/lives reset and single restart, restored listeners/hooks, light cap and the Safari 15 syntax/API scan. Logical resource/tell tests do not establish GPU performance, physical iPad rendering, audio output, or device input acceptance.

## Hardening cycle 3 (Codex Sol 6.1)

Work started at `b2f106f` on `rwb-2-stage5`; Stage 5 remains draft/non-live. All changes are left in the worktree.
Every confirmed defect was first reproduced in a new `stage5-codex2-*` test, then fixed. Existing tests and helpers
are unchanged. `src/input.js`, `lib/`, and `index.html` have zero diff against `origin/rwb-w2`; HUD, touch layout,
player controls, damage values, tell durations, mash requirements and phase thresholds are unchanged.

### Findings and evidence

| Suspicion | Verdict and evidence | Fix and covering test |
|---|---|---|
| Failed painted boss files prevent a cold start from reaching their procedural fallback | **REAL.** The startup guard registers before `queuePainted`; all three optional keys caused `guard.failed = true`. Prior Kimi tests only exercised the painter, without the startup guard. Live WebKit aborted Aginor's image, Balthamel's JSON and the portrait separately. | `src/startup.js` consults the loader's optional-key set; `src/stage5-art.js` registers and cleans that set. Required character failures remain fatal. `tests/stage5-codex2-regressions.test.mjs` covers ordering, all keys, required failures and listener cleanup. Live failure probes all enter Phase 3 and burn Aginor with no page exceptions. |
| Phase 3 never schedules another ring | **REAL.** Phase 2 parks `ringAt` at 999 every update, and nothing restored it. A production arena transitioned to Phase 3 produced no tell within the existing 9–11 second cooldown. | `src/stage5-arena.js` restores that cooldown once on the 2→3 transition. `tests/stage5-codex2-regressions.test.mjs`. |
| The bot can dodge the restored Phase 3 rings | **REAL controller bugs.** Its old 200px proximity rule jumped during the beginning of the 0.9s tell, and the attack cooldown suppressed an imminent escape. A first correction stood still preparing a jump and took both staff hits. These failures were independently reproduced; the restored mechanic initially broke seeds 1/4/10/97, then the no-power seed. | `src/bot-stage5.js` and `src/stage5-bot-combat.js` predict contact using the existing tell/radius/growth values, reserve the response window, jump independently of attack cooldown, and move out of the staff band while preparing. `tests/stage5-codex2-bot.test.mjs`. No combat constants changed. Nine seeds and the no-power run now pass. |
| Standalone Stage 5 can escape Balthamel and keep playing | **REAL softlock.** The live campaign reached the Green Man beat but remained in Riley's `escape` state for hundreds of simulated seconds. Stage 5 omitted `riley3`, which supplies `riley_grabbed` and the finite `riley_escape` animation. `Fighter.play` retained the previous looping clip when the requested clip was missing. The existing Stage 5 helper injects these Stage 3 animations, concealing the production omission. | `src/stage5-def.js` includes the existing supplemental character; `src/stage5-load.js` queues its metadata/pages with completion/shutdown cleanup. The preload moves out of `src/stage5.js` to preserve its cap. `tests/stage5-codex2-animation.test.mjs` uses production metadata without the helper injection. Final live WebKit and Chromium campaigns both reach clear. Riley artwork is reused unchanged. |
| Safari 15 can run the Stage 5 audio hooks | **REAL.** Removing `Object.hasOwn` reproduces a synchronous exception in Stage 5 voice preload/caption playback. | `src/audio.js` uses `Object.prototype.hasOwnProperty.call`. `tests/stage5-codex2-regressions.test.mjs`. |
| Safari 15 can traverse the earlier campaign into Stage 5 | **REAL compatibility failure.** Removing `Array.prototype.at` reproduces a synchronous exception when Stage 3 starts a roof warning. This was an existing forbidden API in the shared campaign, not a design change. | `src/stage3-hazards.js` uses the equivalent last-element index. `tests/stage5-codex2-regressions.test.mjs`. Stage 3 remains 9/9. A scan of all `src/` now finds none of the prohibited APIs/syntax. |
| Stage 5 stays below ~120 MiB with the original maps | **REAL excess.** Both normal directions are loaded. The earlier ~119 MiB measurement omitted attached normal sources, and the title also retains its story canvases. | Smaller, lossless Stage 5-only normal-map variants; unchanged colour pages, frame rectangles, scales and animations. `src/assets.js`, `src/stage5-texture-pages.js`, `assets/stage5/normals/`, `tools/stage5/compact_normals.py`. `tests/stage5-codex2-memory.test.mjs` counts colour plus both normal sets and reserves 27.5 MiB overhead. Switching resolutions also invalidates cached animation frames before replacing the page, tested in both directions. New helpers are counted in `tools/audit-stage1.mjs` without raising caps. See the renderer-scale limitation below. |
| Aginor still cannot fall below 33% HP | **NOT REAL in this checkout.** The Kimi fix passes both freezing and non-freezing callback regressions. Live burst probes clamp at 396/198 before the beat, enter Phase 3 after it, then reach HP 0 and `burn`. | Existing `stage5-kimi-review` and `stage5-hardening2-combat` tests; new live `tools/stage5/browser-hardening.mjs` and `docs/stage5/browser-hardening.json`. |
| Green Man clock, pause, death, respawn, continue, restart or stage switch leaves a hold/freeze behind | **NOT REAL beyond the missing escape clip above.** Existing lifecycle/verification/Kimi regressions pass unchanged. The live scene's cached update is the installed beat wrapper, and the beat restores the clock/animation scales before Phase 3. | Existing `stage5-hardening2-lifecycle`, `stage5-hardening2-verification`, `stage5-kimi-review`, `stage5-balthamel-hold` tests and live beat probes. |
| Damage bypasses getup invulnerability, story/beat suspension, god mode or the oak | **NOT REAL.** Shared Stage 5 damage eligibility and tether oak handling already cover these paths. | Existing `stage5-hardening2-combat` tests pass unchanged. Staff damage during an ordinary jump is not a promised jump counter; the plan assigns jump clearance to the ring and spores. |
| Missing voice/music stalls progression | **NOT REAL.** Audio fetch/decode errors resolve to silence and progression does not await them. The live probe aborts all audio requests and still completes the beat and burns Aginor. | Existing audio tests plus `docs/stage5/browser-hardening.json`. Audio output itself is not validated. |
| Zone hazards, death/outro timers, lights, tell visuals or listeners outlive their owner | **NOT REAL in the investigated paths.** Zone clear marks seeps gone, empties the live spore/cloud arrays and clears slow; teardown removes owned lights/graphics/glimpse timers and restores hooks. Outro timers cancel on shutdown. | Existing `stage5-kimi`, `stage5-kimi-review`, `stage5-hardening2-lifecycle`, `stage5-hardening2-renderer`, `stage5-hardening2-verification` tests pass. Live 4→5 dumps retain no Stage 4-owned texture keys. |

### Memory reconciliation

Repeat with `python3 -m http.server 8765 --bind 127.0.0.1`, then
`NODE_PATH=$(npm root -g) node tools/stage5/texture-dump.mjs`. The script opens both browsers, samples the title,
zones, boss phases/beat/outro and clear, then checks Stage 4→5 residency in the same TextureManager. It advances
real Phaser updates at 60Hz and renders each sample; god mode keeps random player deaths from truncating asset
coverage. This is a live texture inventory, not physical-device RSS or driver memory measurement.

| Live peak, MiB | Stage 4 baseline | Stage 5 baseline | Stage 4 final | Stage 5 final |
|---|---:|---:|---:|---:|
| WebKit: `Texture.source` only | 119.33 | 122.37 | 119.36 | 105.63 |
| WebKit: `source` **plus** `dataSource` | 135.81 | 144.60 | 135.84 | 108.96 |
| WebKit: live renderer texture wrappers, rs=1 | 146.35 | 155.14 | 146.39 | 119.51 |
| Chromium: `source` plus `dataSource` | 135.81 | 144.60 | 135.81 | 108.96 |
| Chromium: live renderer texture wrappers, rs=1 | 139.32 | 148.11 | 139.32 | 112.48 |

Artifacts: `texture-baseline.json`, `texture-dump.json`, `texture-dump-rs2.json`. Minor text-canvas differences
between runs account for hundredths of a MiB; the static asset dimensions are identical. The final Stage 4→5
sample is about 106.40 MiB, rising to 108.96 MiB at the Stage 5 title peak. Both final live campaigns reach clear.

- `_n` maps are loaded eagerly by the atlas loader into **`Texture.dataSource`**, not standalone texture keys.
  `_nl` maps are also loaded eagerly, as separate texture keys. Both are used by lighting and the flip-normal
  patch; removing one direction would change the look. Neither is lazily created.
- The original Stage 5 attached sources total **22.226 MiB**, including the crate normal; Stage 4's total is
  **16.479 MiB**. A sum of only `textures.list[*].source` therefore understates residency. After Stage 5 starts,
  the three story canvases are freed (2.637 MiB), bringing the colour-only sum near the earlier 119.45 MiB reading.
  Stage 4's ~118.8 MiB reading likewise resembles its colour/standalone-source sum, rather than its complete sum.
- The supplied 141.22/117.62 MiB formula is not checked in, so its exact inclusion list cannot be reconstructed.
  Its Stage 5 figure is close to the complete gameplay inventory, but misses the title/story/HUD peak; its Stage 4
  figure is below the measured complete inventory. It cannot establish a stage comparison or a resident budget.
  The complete, repeatable formula is `sum(width * height * 4)` across **both** source arrays, counting every page,
  prop, power sheet, procedural canvas, portrait and text canvas. Renderer wrappers are summed separately, never
  added on top of the asset-source sum (that would count asset GPU copies twice).
- Mipmaps are disabled: pinned config uses an empty mipmap filter and regeneration false; the rs=2 dump records
  min/mag filters 9729 (`LINEAR`), not mipmap sampling. No blanket 4/3 mip multiplier is justified.
- Stage 4-specific pages/plates are freed before Stage 5 loads. Shared Riley/Loial/hound pages replace their
  normal variant and rebuild animation references on a switch. No unused stage pages explained the excess.
- The new lighting maps use a third of their original width/height, saved as lossless WebP. Original colour
  artwork is untouched. Their broad lighting fields lose spatial resolution; a WebKit spot-check is saved as
  `codex2-normal-preview.png`. Original maps remain in use outside Stage 5. Net title-source reduction is
  **35.63 MiB**, after adding the missing 2.27 MiB supplemental Riley sheet and compact normals.
- The static character formula is **92.319 MiB**, including colour, original-direction and flipped-direction
  normals for all six character entries. The regression reserves another **27.5 MiB**, giving **119.819 MiB**
  at rs=1, above the actual WebKit 119.511 MiB renderer-wrapper estimate.

**Remaining retina limitation:** `RWB_RS=2 RWB_STAGES=5 RWB_ENGINES=webkit
RWB_TEXTURE_OUTPUT=docs/stage5/texture-dump-rs2.json` reproduces **108.964 MiB** resident sources but
**151.152 MiB** renderer texture wrappers. Three 2560×1440 targets contribute **42.188 MiB**. Thus the resident
asset budget is below 120 MiB, and the rs=1 renderer estimate is below 120 MiB; the complete native-retina GPU
estimate is still above it. No renderer-resolution, filter-look or HUD change was made to conceal this. Physical
iPad/iPhone acceptance, driver storage and whether the reported crash threshold includes these targets remain
unverified. These measurements must not be described as a device-safe or total-RSS guarantee.

### Validation

Final `node --test tests/*.test.mjs`: **1166 pass, 0 fail, 1 skip, 1167 total**. The sole skip is the existing Stage 4
STT check. For this run the global Playwright package was exposed through a temporary worktree-local symlink;
the existing WebKit viewport test ran and passed. That symlink was removed afterward. Without it the exact same
command passes with 1165 pass and 2 skips because Node ESM does not resolve global Playwright automatically.

Stage 3/4/5 campaigns: **9/9 each**, plus the Stage 5 no-power clear. `node tools/audit-stage1.mjs` exits **0**;
pre-fight inventory **24904337 / 25000000** bytes, Stage 5 source **144272 / 196608** bytes, and unchanged per-file
caps pass. `git diff --check` passes. See `codex2-suite.tap`, `codex2-audit.json`, `codex2-validation.json`.

The required golden simulation command and payload diff produce **no difference**. Only the SHA entries for
**`src/assets.js` and `src/audio.js`** were refreshed in `docs/stage1/evidence/full-stage-simulation.json`; no combat
payload, golden helper or existing test changed. No commit, stash, push, merge or other branch modification.
