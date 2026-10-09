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

Seeds 1, 2, 3, 4, 5, 10, 20, 100, 97 clear with Rand off and with one Rand call on Be'lal in phase 3. Measured no-Rand boss times were 41.9, 44.9, 47.1, 43.0, 43.8, 45.0, 50.3, 42.2, and 44.0 s. With Rand they were 41.3, 42.4, 41.1, 40.6, 44.2, 41.5, 40.5, 40.6, and 42.7 s. Ratios were 0.984, 0.944, 0.873, 0.943, 1.011, 0.923, 0.805, 0.961, and 0.970. Seed 5 is 1.011, about four tenths of a second, which is fight noise. The strike's 2 s freeze is not added to boss time. There is no opening hold and no phase-3 hold.

Rand's boss hit is 6% of max HP (38 of 640), clamped at the next gate, and a 1 s stagger. The bot spends that window hitting him. Calling Rand does not turn off balefire during an attack.

Be'lal's flurry is 6/6/8/14. Hits 1–3 clear Riley's hurt streak so the 4th hit can still be countered. Follow-up tells are 0.48 s so a hit does not chain faster than a step out of the 36 px band. He does not flurry during a snare, for 0.4 s after one, for 0.8 s after Riley gets up, or while a Netweaver line covers Riley's band. Lines are woven on a band Riley is not standing in. He does not step into a wall within 140 px.

The same bot with a 250 ms reaction delay, and without the unseen Gray Man's attack state, cleared 8 of 9. Seed 97 still died in phase 3 with Be'lal at 81 HP. The delayed Be'lal opener is reported as a stagger for the first 0.04 s of that sample so the slow bot can poke the windup. That sample is still 250 ms old.

## Not done

Painted sheets, Grok Imagine clips, ElevenLabs lines, and the `music-stage6` / `music-boss6` loops. The director already asks for those track ids (`STAGE_MUSIC[6]`). They are not entered in `MUSIC` until the files exist, so playback stays silent and the Stage 2 file check stays green. Antigravity's art tasks (A1–A4) and Codex's hardening tests (C1–C4) are not in this build. The seams they need are in `docs/stage6/CONTRACT.md`. Also not done: an iPhone pass. `?nopower=1` seed 1 reaches phase 3 and dies with Be'lal near 115 HP. Going live stays behind `s6=1`.
