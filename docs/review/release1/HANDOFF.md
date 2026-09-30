# Riley Wheel Brawl 1.0 review handoff

This is a local review candidate, not a published release. Base: `rwb-w2` at `7f3f94bd5aef9cc650aab74219f67b476014b5d5`. Work branch: `rwb-1-0-handoff`. Neither `main` nor `rwb-w2` was changed. No merge, deployment, Pages setting change, or paid service usage occurred.

## Included

- 54 approved original stock-voice clips for Riley, Twinkle Toes, Moiraine, Loial and male Be'lal, including the escape scene. Source/license and exact per-file hashes accompany the assets. Existing theme, narrator and other villains remain unchanged.
- Protected, ordered finale/story speech, with explicit-skip cancellation and suspension/mute/zero-volume recovery. Combat barks cannot interrupt it or accumulate behind it.
- New painted escape scene and family credits; new Fade, Draghkar and male Be'lal portraits; a text-free title painting with the correct muscular sixteen-year-old Riley and a single logo.
- Optional saved Hard mode: coordinated flanks and attack timing, identical HP. Old saves default to Normal; Continue/restart/progression retain the saved mode.
- Idle Callandor grip correction and tapered Taim balefire. Riley's approved r8 walking renderer and all stage paintings are unchanged.
- Fixed Options BACK activation for pointer/gamepad input.

## Quality gates

| Gate | Status | Actual evidence |
| --- | --- | --- |
| `node tools/check.cjs`, all 140 assertions | BLOCKED | 115 non-browser assertions passed; local Chromium cannot create its required Unix socket, so 25 browser assertions remain unrun |
| Stages 1/3/5, 60 fps, zero frames over 33 ms | BLOCKED | No current-build browser timing numbers available |
| Every stage cold enter under 400 ms | BLOCKED | No current-build browser timing numbers available; prepared browser test measures initial construction/render plus two RAF callbacks after ordinary boot, without extra prewarming |
| Normal: 40 seeds, three lives, unassisted | PASS | Seeds 1001–1040: 39/30/27/23/23 clears = 97.5/75/67.5/57.5/57.5%; deviations from 100/72.5/70/65/50 = −2.5/+2.5/−2.5/−7.5/+7.5 points; every stage within ±7.5 |
| Final voice-fix Normal parity | PASS | All 200 stage/seed result objects byte-identical before/after speech changes |
| Old save compatibility | PARTIAL | Node Continue/Callandor/difficulty/restart checks pass; real browser saved-string/cold-load checks remain unrun |
| Stage 4/5 seams and Stage 5 brightness | UNCHANGED / BROWSER BLOCKED | Stage composition source and stage paintings unchanged; current-build browser joins/brightness scan unrun |
| Smoothness logic | PASS | 9/9 |
| Hard behavior | PASS | 41 focused checks; 15 additional baseline result/RNG-parity cases; 50/50 assisted stage clears, complete boss repertoires, zero overlapping active attackers, 10/10 Taim joint finishes |
| Release/story/menu contracts | PASS | 15/15 |
| Voice assets | PASS | 54/54 exact text/mapping/master hashes; all decoded during generation, non-silent and >0.25 s, peak headroom; 943,848 total bytes |
| Voice sequencing/recovery | PARTIAL | 14/14 duration-clock assertions pass; actual browser decoding/playback remains unrun |
| Callandor rendering | PASS, offline | 19 poses; painted glove unchanged at scales 1/2/3 and both facings; 228 before/after comparisons differ only in armed idle |
| Taim beam rendering | PASS, offline | Original geometry/32-unit band/.96 opacity/RNG unchanged; cached dark core RGBA `[18,5,23,245]`, tapered ends, two cached textures |
| Scripted full campaign | PASS, scripted | All stages, Callandor, joint finish, escape and credits; 612.2 simulated seconds with two explicit Continues, no injected HP/damage. This is not a human playthrough |

No acceptance threshold was relaxed. `tools/check.cjs` changed only its cache stamp. Its approved r8 tear allowances remain walk3 ≤8 px, walk4 ≤4 px, walk8 ≤9 px, all other walk frames ≤2 px. The audio placeholder regression now explicitly serves a silent fixture because the shipped Riley Balefire clip is voiced; the assertion and cutoff are unchanged.

## Remaining review points

- Real browser regression/performance/audio/joins gates still need an environment capable of launching Chromium
- Inherited older story stills retain the younger, long-sleeved Riley; only the new title/escape art matches the current gameplay model
- Eight Riley tutorial/utility lines have voiced assets but inherited triggers remain unwired, as listed in the recording list
- Hard mode is not calibrated to a particular natural-bot clear curve; its behavior and no-HP-padding contracts are verified
- The four included pictures are labeled offscreen Canvas renders with actual local assets, not verified browser screenshots

## Publication status

Shell Git push had no available authentication. Connected GitHub writes did not return for both a 569 KB image and a 3,175-byte text file; those individual blob outcomes were uncertain. Some unreferenced content-addressed blobs exist remotely, but no branch, draft PR, or CI run was created. Do not claim a preview URL or successful publish. Reconcile remote state before retrying. The prepared read-only public-repository CI workflow uploads no dependency caches or billed artifacts and never deploys.
