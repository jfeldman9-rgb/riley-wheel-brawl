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

They do not measure GPU frame time, audio output, or a physical gamepad. Lights are logical handles. Painted sheets and rendered voice lines are not in this tree. A burst that drives Aginor to 0 HP before the Green Man beat starts can still skip the beat; the nine campaign seeds do not do that, and a hit during the beat itself does not kill him.
