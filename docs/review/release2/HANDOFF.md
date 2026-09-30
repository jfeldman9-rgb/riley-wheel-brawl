> Transport-only follow-up: the original Round 2 snapshot remains at `6bf142e`. Eight new story JPEGs were re-exported at full resolution using quality 90/progressive 4:2:0, and the escape now uses its approved full-resolution quality-85 export. The nine changed images total 3,719,354 bytes, down from 5,680,343; each is below 500,000 bytes. All PNG masters remain intact. No runtime code, audio or test thresholds changed. CI screenshot output alone now uses 32 KiB base64 chunks, with name/index/total plus a metadata line containing original byte length and SHA-256, so reconstruction can detect truncation. Dimensions/registration and the real-asset offscreen loader were rechecked; browser performance must still be measured on the published head. Encoding metadata is in `story-art-runtime.json`. The report below records the original Round 2 implementation/tests.

# Riley Wheel Brawl 1.0: Round 2 review

Local branch `rwb-1-0-handoff`, from public base `7f3f94bd5aef9cc650aab74219f67b476014b5d5`. Round 1 is preserved at `c3b4a1a9e7cb03c55723051894a4a5c47a275459` and in its separate update kit. Runtime stamp: `20260930-release2`.

## Changes since Round 1

- Replaced seven older story paintings with the muscular, short-haired, blue-glasses, sleeveless Riley16 model. Moiraine is visibly adult, and Twinkle Toes remains the younger companion. Added separate Callandor-acquisition and Black-Tower-arrival paintings so the introduction cannot show a reward or rescue before it happens. Nine full-resolution JPEG exports total 5,409,653 bytes; source/runtime hashes are in `story-art-runtime.json`. No gameplay panorama or sprite frame changed.
- Wired seven delivered Riley utility/tutorial clips: successful Stage 1 front/roundhouse/spinning-back hits; surviving low-health crossing at 25 HP, rearmed above 40; first full saidin per stage; first angreal per stage; and the first attempted spent Loial call. Utility lines share six-second spacing, do not cut any active speech, and never queue obsolete chatter. Delayed downloads are discarded when the event's scene/context ends. Grab/throw callouts now have matching once-per-stage gates.
- Explicitly retired the eighth missing trigger, “Up you go!”, because this build has no distinct launcher action. The approved clip and text remain; no unrelated move was invented or mislabeled to use it.
- Fixed two Hard-only route failures. Enemies may take an available, fully telegraphed attack instead of insisting on finishing a flank first. Knocked-back enemies near the camera edge re-enter visibly instead of waiting just off-screen forever. No HP, damage, tell duration, attack-token cap or Normal path changed.

## Current gate evidence

| Gate | Status | Actual |
| --- | --- | --- |
| Existing `tools/check.cjs`, all 140 | BLOCKED | 115 Node assertions pass; 25 browser assertions unrun. `/usr/bin/chromium` aborts because its singleton Unix socket cannot be created: Operation not permitted |
| S1/S3/S5 60 fps, zero frames >33 ms | BLOCKED | No final-build browser timing measurement available locally |
| Every stage cold enter <400 ms | BLOCKED | No final-build browser cold-enter measurement available locally |
| Normal 40 seeds / three lives / no refill | PASS | Final 39/30/27/23/23 clears, 97.5/75/67.5/57.5/57.5%; all 200 result objects byte-identical to Round 1. Deviations from required targets: −2.5/+2.5/−2.5/−7.5/+7.5 points, all within ±7.5 |
| Utility voice contracts | PASS | 34 assertions, including exact contexts, once-only gates, no gameplay/global RNG draws, no interruption and stale-download cancellation |
| Story / menu / legacy-save contracts | PASS | 19 assertions, including four new scene-art routing checks; browser saved-string loading remains unrun |
| Approved voice assets | PASS | 54 exact mappings/text/master hashes; 943,848 bytes, unchanged approved MP3s |
| Protected voice sequence / recovery | PARTIAL | 14 shipped-duration clock assertions pass; actual browser decoding/playback unrun |
| Smoothness logic | PASS | 9/9 |
| Callandor rendering | PASS, offline | 19 poses and unchanged original glove pixels at scales 1/2/3, both facings |
| Taim beam | PASS, offline | Core RGBA [18,5,23,245], two cached textures, original geometry/opacity, no RNG mutation |
| Full campaign | PASS, scripted | All five stages, Callandor, joint finish, escape, credits; 612.2 simulated seconds, two explicit Continues, no injected HP/damage, save cleared |
| Painted story assets | PASS, offline | Nine original paintings visually inspected; every registered real image loads with zero failures in runtime offscreen renders |
| Stage4/5 joins, Stage5 brightness | UNCHANGED / BROWSER BLOCKED | Runtime stage paintings/composition unchanged; current browser scan unrun |
| Hard behavior and isolation | PASS | 78 checks including 15 baseline result/RNG-isolation cases, 50 assisted clears, every boss move and zero overlapping active attackers; all 200 final Normal results unchanged |
| Hard natural-controller difficulty | DIAGNOSTIC / REVIEW NEEDED | 40/29/16/4/0 of 40 clears = 100/72.5/40/10/0%; no invented Hard target. 26/40 reach Taim but none clear |

The original `tools/check.cjs` diff from the base remains only the cache stamp. The approved r8 walk tolerances remain walk3 ≤8 px, walk4 ≤4 px, walk8 ≤9 px, all other frames ≤2 px. No gate or tolerance was loosened.

## Hard diagnostic, not an invented acceptance target

Using exactly the Normal controller, seeds 1001–1040 and three unassisted lives, the first diagnostic returned 37/6/17/31/8 clears (92.5/15/42.5/77.5/20%). Stage 4 was 20 points easier than Normal. The diagnostic exposed real route deadlocks, rather than evidence to simply rename the mode or add HP.

The final corrected diagnostic returned 40/29/16/4/0 of 40 clears (100/72.5/40/10/0%). Stage 4 is now harder, and Stage 5 is a balance concern: 26/40 runs reached Taim, but none cleared. Hard remains optional and uncalibrated; human review is needed for enjoyment and fairness. The controller clears Stage 1 slightly more often on Hard, so the label is not a claim of uniformly lower bot rates. No further tuning toward a bot target was done. `hard-before.json` preserves the initial diagnostic; final results are in `hard-40.json`, and `normal-after-tactics.json` preserves exact final Normal parity. A bot result is not a human playtest.

## Review images and restoration

Four new images show the actual runtime Stage 1 introduction, Callandor reveal, Black Tower arrival and family credits using all real assets. They are explicitly labeled offscreen Canvas review renders; they are not browser screenshots or performance evidence.

The compact update kit contains the incremental Git bundle and restoration instructions requiring the public base. The bundle includes all changed code, documentation, runtime paintings and approved voices. Round 1 remains separately recoverable. Publishing and browser CI are managed separately; no merge, deployment or live-branch write is authorized by this review kit.
