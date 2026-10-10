# Stage 6 status

Stone of Tear is behind `?s6=1`. It is not on by default. The painted sheets, backdrops and story panels (docs/stage6/ART.md), the 25 voice lines, both music loops and Rand clips R1–R3 are in. Any painted file that fails to load falls back to its code-drawn stand-in.

## Boss-peak memory

Live WebKit, `tools/stage5/texture-dump.mjs` with `RWB_STAGES=6` (the URL adds `s6=1`). The counter is RGBA base levels of every `Texture.source` and `Texture.dataSource`, the same method as Stage 5's 108.96 MiB. God mode, headless steps, samples through the clear.

| Sample | MiB |
|---|---|
| Boss-fight source peak (phase 3, clear shown), painted art | **110.91** |
| Run source peak (title, story panels still resident) | 113.46 |
| GL wrappers (includes render targets) | 124.00 |
| Boss-fight source peak on code-drawn art (before the painted pass) | 94.81 |

Clear reached. No page errors. Under 120 MiB. Stage 5 on the same tool is 108.96 MiB source.

Stage 6 loads the compact normals in `assets/stage5/normals/` through `src/texture-pages.js` (riley, grunt, spear, hound, both `_n` and `_nl`). Colour atlases stay in `assets/chars`. Those four fighters' colour plus both compact normals are 82.97 MiB, down from 117.89 MiB on the full-size maps. Cutthroat stays colour only (8.18 MiB). Leaving Stage 6 for a stage other than 5 or 6 drops the compact pages and reloads the originals. Stage 5 into Stage 6 keeps them.

The old 129.07 MiB figure was a static sum of the full-size normals. It is not the loaded-texture peak, and that style of sum undercounted versus this tool. Stage 6 still does not load Loial, the Fade atlas, cutthroat normals, Twix, `riley_lightning.png` or the planks file. It now loads the shared painted crate (`assets/props/prop-crate.webp`, colour only, 0.90 MiB) and its own painted ribbon (`s6ribbon`).

## Campaign

Seeds 1, 2, 3, 4, 5, 10, 20, 100, 97 clear with Rand off and with one Rand call on Be'lal in phase 3. Remeasured after the Stage 5 compact-normal merge. No-Rand boss times were 41.9, 44.9, 47.1, 43.0, 43.8, 45.0, 50.3, 42.2, and 44.0 s. With Rand they were 41.3, 42.4, 41.1, 40.6, 44.2, 41.5, 40.5, 40.6, and 42.7 s. Ratios were 0.984, 0.944, 0.873, 0.943, 1.011, 0.923, 0.805, 0.961, and 0.970. Seed 5 is 1.011, about four tenths of a second, which is fight noise. The strike's 2 s freeze is not added to boss time. There is no opening hold and no phase-3 hold. Stage 3, 4, and 5 campaign bots also cleared all nine seeds on this head.

Rand's boss hit is 6% of max HP (38 of 640), clamped at the next gate, and a 1 s stagger. The bot spends that window hitting him. Calling Rand does not turn off balefire during an attack.

Be'lal's flurry is 6/6/8/14. Hits 1–3 clear Riley's hurt streak so the 4th hit can still be countered. Follow-up tells are 0.48 s so a hit does not chain faster than a step out of the 36 px band. He does not flurry during a snare, for 0.4 s after one, for 0.8 s after Riley gets up, or while a Netweaver line covers Riley's band. Lines are woven on a band Riley is not standing in. He does not step into a wall within 140 px.

The same bot with a 250 ms reaction delay, and without the unseen Gray Man's attack state, cleared 8 of 9. Seed 97 still died in phase 3 with Be'lal at 81 HP. The delayed Be'lal opener is reported as a stagger for the first 0.04 s of that sample so the slow bot can poke the windup. That sample is still 250 ms old.

## Not done

Rand clips R4/R5 (reserved). (Audio landed on `rwb-2-stage6-audio`: all 25 voice lines in `assets/audio/stage6-voice-manifest.json`, and `music-stage6` / `music-boss6` set on `MUSIC` in `src/stage6.js`; see `tools/stage6/voice-render.json` and `tools/stage6/music-manifest.json`.) Antigravity's art tasks (A1–A4) and Codex's hardening tests (C1–C4) are not in this build. The seams they need are in `docs/stage6/CONTRACT.md`. Also not done: an iPhone pass. `?nopower=1` seed 1 reaches phase 3 and dies with Be'lal near 115 HP. Going live stays behind `s6=1`.
