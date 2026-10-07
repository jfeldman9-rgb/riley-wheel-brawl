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

They do not measure GPU frame time, audio output, or a physical gamepad. Lights are logical handles. Painted sheets and rendered voice lines are not in this tree. A burst before the Green Man beat cannot drive Aginor through the next phase gate or to 0 HP. The floor stays until `startBeat` sets `beatFired`. A hit during the beat itself does not kill him.

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
