# Balefire + Loial restored from 1.1, and more Riley frames

Restore point for 1.1: tag `v1.1-live-8a17bcd`. 1.1 sources: `js/scenes.js` (`activateBalefire`, `callLoial`), `js/allies.js` (Loial).

## Balefire (special)
- F / B, controller B (button 1), touch **BALE** (dimmed until the meter is full).
- Needs a **full** saidin meter (100) and spends all of it, as in 1.1. Riley is invulnerable for 1.5 s (1.1 value).
- 8-frame `riley_balefire` animation; on the thrust frame a white-hot beam (additive core + blue glow + flare) runs from his hands to the screen edge with two dynamic scene lights riding it. It is held through the sustain frames and fades on the release frame.
- Every foe in front is struck once (normal foes: max HP + 10, so they're destroyed, like 1.1; boss: 80, scaled only by his own armor/stun rules). Barrels in front break.
- HUD: the saidin bar flashes white with **BALEFIRE READY** when full.
- Voice `riley_super_01` "Balefire!" and the 1.1 `balefire` sfx recipe.

## Loial (ally assist)
- R / V / U / I, controller LB (button 4), touch **CALL**. Run on the controller is now RB only.
- Once per stage (`LOIAL READY` → `LOIAL!` → `LOIAL SPENT` beside the saidin bar, with his portrait; the CALL button dims when spent).
- Charges in from the left edge, steers to the nearest foe, makes up to two axe sweeps, bowls over anyone he runs into, and leaves off the right edge after ~3.6 s. Damage from 1.1 normal difficulty: 44, boss 18. He can't be hit.
- Voices (same Kokoro files as 1.1): "Loial, now!", "For my friends!", "That should help!", and "Loial needs a rest." when spent; 1.1 horn sfx.

## Art (ChatGPT image gen via Codex, jfeldman9@gmail.com)
1.1's Loial was a single painted still (`cg-loial.png`) and did not fit the 2.0 sprite style, so it was used only as an identity reference. New sheets were generated in the 2.0 house style. Frames were sliced by connected components (pixels copied), then registered with uniform scale + translation only (`build_anim2.py`, which lets one animation take frames from several sheets). Nothing was blurred, recoloured, interpolated or mirrored; the only flip is the existing facing flip at runtime.

| Sheet | Used for |
|---|---|
| kick review candidate 1 (`yetti-pkg/review-candidates`) | `riley_combo1`: 6-frame front kick (was a 3-frame jab) |
| `riley-fill-a` | combo2 anticipation + return; airkick wind-up + landing; knee pull-down, peak, drop |
| `riley-fill-b` | new `riley_runkick` (5 frames, was a reuse of combo2); back-kick anticipation; cast recovery; throw follow-through |
| `riley-balefire` | `riley_balefire` (8) |
| `loial` | `loial_run` (4, loop) + `loial_sweep` (4); HUD portrait |

Riley: 72 → 98 named frames (target 150 still open). Every shipped attack now has at least 5 frames:
combo1 6, combo2 6, combo3 8, back 5, airkick 5, runkick 5, cast 5, knee 5, throw 5 (+ balefire 8).

![new frames](contact-riley-v2-attacks.jpg)
