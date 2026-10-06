# Stage 4 hardening

Sweeps run headlessly with `tests/helpers/stage4-harness.mjs` (story skipped, `s4=1`). The nine campaign seeds are the same set Stage 1 and Stage 3 use: 1, 2, 3, 4, 5, 10, 20, 100, 97.

## Campaign

`tests/stage4-campaign.test.mjs` clears all nine seeds. Each run records at least one of: tendril, melee recoil, light recoil, tower tell, zone-2 fog wall armed, swoop, swoop counter, croon, croon cancel, kiss, kiss escape, phase-3 walls, fog swoop, rubble break, cultist chant, summon, ribbon, bridge glimpse, and the fog hint.

Every frame checks finite positions, the attack-token cap, at most one kiss or cutthroat holder, at most one live tower tell, at most two fog bolts, at most two tendrils in the current zone (one in zone 0), phase-3 width at least 640, and at most 10 live lights.

## Idle Riley

With no bot, Riley is placed on the first street trigger and left alone for 120 seconds. The zone locks and the fight reaches him. Standing still is fatal or at least progresses; it does not freeze the scene.

## No power

`?nopower=1` on seed 1 still clears. The bot never spends saidin. Melee recoil, the swoop counter, and the kiss mash are enough.

## Lifecycle

`Stage4Kit.clearHazards` / `destroy` drops fog vents and tendrils, fog bolts, tower tells, and the phase-3 arena. A kiss hold releases through `releaseHold` in the same call, so `grabbedBy` is cleared before the next frame. Tower and arena `dispose` empty their lists. Pause still freezes the Draghkar hold timer (covered by `tests/stage4-kiss-lifecycle.test.mjs`). Restart after the clear returns `{ stage: 1 }`.

## What these sweeps do not claim

They do not measure GPU frame time, audio output, or a physical gamepad. Lights are logical handles. A Stage 2 fingerprint file is not in this workspace; Stage 2 is checked by its existing tests in the full `node --test` run.
