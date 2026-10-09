# Stage 6 status

Stone of Tear is behind `?s6=1`. It is not on by default. Art, clips, and voice files are not generated yet. The fight, Rand rules, and the clip hook run on code-drawn stand-ins and silent captions.

## Boss-peak memory

Measured by summing `width * height * 4` for every image the Stage 6 boot queue keeps, using `dimensions()` from `tools/audit-stage1.mjs`, plus the code-drawn canvases in `src/stage6-art.js` and the small generated FX canvases (`glow` 128, `core` 64, `shadow` 64, and the streak/dot/chip/px/seam/beam textures).

| Group | RGBA |
|---|---|
| riley, grunt, spear, hound color + normal + flipped normal | 117.89 MiB |
| cutthroat color atlas only | 8.18 MiB |
| power icons, HUD icons, FX sheets, boot portraits | 2.19 MiB |
| Stage 6 canvases and generated FX | 0.81 MiB |
| **Total** | **129.07 MiB** |

This is over the plan's about-115 MiB guide. The shared fighter pages alone are 117.89 MiB, which is more than the plan's roughly-103 estimate. Stage 6 does not load Loial, the Fade atlas, cutthroat normals, Twix, `riley_lightning.png`, the crate/planks/ribbon files, or a ribbon texture file. A WebKit device capture was not available in this environment, so this is a decoded-RGBA sum, not a device allocation.

## Campaign

Seeds 1, 2, 3, 4, 5, 10, 20, 100, 97 clear with Rand off and with Rand used on cooldown. Measured no-Rand boss times were 53.0, 39.5, 61.5, 55.5, 82.5, 50.5, 37.7, 71.5, and 38.4 s. With Rand they were 53.6, 90.6, 102.8, 60.0, 100.1, 93.0, 69.0, 104.6, and 131.5 s (two calls each). Every Rand time was at least 70% of the paired no-Rand time. The bot holds for 15 seconds at the start of a boss it has already called Rand before, and for 20 seconds at phase 3 when it is still at full health with the sa'angreal up.

Be'lal's flurry is 6/6/8/14. Hits 1–3 clear Riley's hurt streak so the 4th hit can still be countered. He does not flurry during a snare, for 0.4 s after one, or for 0.8 s after Riley gets up, and he does not step into a wall within 140 px.

The same bot with a 250 ms reaction delay, and without the unseen Gray Man's attack state, cleared 7 of 9 (seeds 2 and 97 still died on the boss). The delayed Be'lal opener is reported as a stagger for the first 0.04 s of that sample so the slow bot can poke the windup. That sample is still 250 ms old.

## Not done

Painted sheets, Grok Imagine clips, ElevenLabs lines, and the `music-stage6` / `music-boss6` loops. The director already asks for those track ids (`STAGE_MUSIC[6]`). They are not entered in `MUSIC` until the files exist, so playback stays silent and the Stage 2 file check stays green. Antigravity's art tasks (A1–A4) and Codex's hardening tests (C1–C4) are not in this build. The seams they need are in `docs/stage6/CONTRACT.md`. Also not done: an iPhone pass. `?nopower=1` seed 1 reaches phase 3 and dies with Be'lal near 115 HP. Going live stays behind `s6=1`.
