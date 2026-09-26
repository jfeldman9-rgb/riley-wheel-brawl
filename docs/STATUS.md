# Riley Wheel Brawl - Implementation Status

Chunk B, `rwb-w1`, based on `rwb-grok2` commit `585ebec544e22ae222a67ecc55ab7a9254926178`.
Cache stamp: `?v=20260926-w1` for scripts, CSS, fonts, and the runtime image loader.

## Built

- Stage 1's combat, kick timings, hit-stop input latch, Chieftain AI, and controls remain the foundation. `Play` now selects stage configuration instead of hard-coding Stage 1. Stage 1 clear advances through its existing clear reel to Caemlyn.
- **Stage 2, Caemlyn:** warm city architecture and cobbled lane; Darkfriends mixed with Trollocs; Myrddraal with actual shadow blink, multi-swing sword combo, and finite fear stun. Each has a distinct spatial tell.
- **Stage 3, Shadar Logoth:** ruined arches and violet stone; cultists and mixed ground enemies; Mashadar alternates warned floor lanes and drains HP on contact. Changing lane or jumping avoids it. Draghkar remains airborne, flaps, swoops, uses a hypnotic kiss that really grabs/drains Riley (tap Kick to escape), and sends a low wing gust. Only jump kicks and fireballs can hurt it while flying, including during a low swoop. Grounded kicks, Loial, throws, and super cannot bypass this rule. Fireballs aim once at a visible flyer in the same lane; they do not home.
- **Stage 4, Stone of Tear:** columned halls, banners, torchlight and polished floor; guards and channelers; Be'lal with sword flurry, a lane-wide balefire tell, and weave snare. Clearing him awards Callandor and plays the lightning reveal with Twinkle Toes. Callandor is visible and doubles super damage to bosses from 78 to 156; its flag persists into Stage 5, restart, death, and Continue.
- **Stage 5, Black Tower roof:** battlements, storm skyline, banners and dark flagstones; turned Asha'man and Darkfriend waves; Taim uses Dark Balefire, Storm Strikes, and Shadow Surge. His recovery accelerates below 55% HP. Below 22%, Twinkle Toes is freed from the visible weave barrier and supplies a one-time full saidin reward. Taim keeps attacking and ordinary damage cannot reduce him below 1 HP. POWER starts the joint finish after Kenzie's readiness caption. Both visible beam tips must reach and collide with him before he dies. Riley can still die during the charge; a canceled attempt can be retried by refilling saidin, including from hits on Taim's last-HP shield.
- **Story:** opening, Stage 1 intro/clear, every subsequent stage intro, Callandor reveal, live finale dialogue, homecoming and victory. Exact catalog captions are used; Twinkle Toes is `kenzie`. Reel completion is idempotent and the final caption remains drawable during the fade, including repeated skip presses.
- **Persistence:** level/wave/score/lives/saidin/Loial/Callandor survive appropriate checkpoints. Loial resets for the next stage and stays spent on same-stage restart/Continue. A stage clear saves the next stage before its reel. Winning clears the run only after Taim falls.
- **Art:** relative `stageN-far.jpeg`, `floorN.jpeg`, `stageN-mid.png`, `stageN-near.png`, `cg-*.png`, `portrait-*.png`, and `cut-*.jpeg` hooks in `artmanifest.js`. Missing files use location-specific procedural art, visible actors, and speaker medallions. Unlisted assets produce no requests. Listed failures retry once and fall back; critical failures show the red banner, and story failures never block NEXT. The manifest is intentionally empty because no painted files are bundled in this branch.
- **Controls/presentation:** existing keyboard/gamepad/touch mappings and hit regions retained. The existing persistent transparent controls renderer is now actually called by Play, with CALL/FIRE labels. Title pointer selection selects the clicked row. Touch also advances reels. All five stages have music patterns using the existing synth engine.
- **Taint:** full-meter grace, warning, HP chip with floor of 1, vignette and spend-to-clear work in every stage. Pause/death/reels stop gameplay damage. The warning voice is gated once per full-meter cycle.

## Verification

`node tools/check.cjs` passes. It covers the inherited Stage 1 checks plus all-stage Reel routing and repeated final skips, exact subtitle text/speaker IDs, airborne damage restrictions through real hitboxes, kiss grab/escape, fog drain/safe lane/pause, actual blink and fear stun, Callandor damage/persistence, Taim's survival/continued attacks/refill/joint collision, taint in all stages, all art layer hooks, cache stamps, and a broken listed image's one retry/fallback.

`node tools/soak.cjs` passes all 50 runs. It drives the existing combat APIs with a seeded masher and requires actual active attack coverage for every boss on every seed. Stage 5 also requires joint-beam contact; Stage 3 rejects any received damage move other than jump/fireball. The harness inherits its **HP top-up below 28 and 99 lives**. These are completion and attack-coverage results, not proof of natural difficulty balance.

| Stage | Clears | Seconds, min-max | Median damage taken | Every boss attack, seeds |
| --- | --- | --- | --- | --- |
| 1 - Emond's Field | 10/10 | 76.1-132.2 | 225.5 | 10/10 |
| 2 - Caemlyn | 10/10 | 53.8-92.1 | 160.5 | 10/10 |
| 3 - Shadar Logoth | 10/10 | 119.9-144.3 | 413.5 | 10/10 |
| 4 - Stone of Tear | 10/10 | 61.6-77.7 | 125 | 10/10 |
| 5 - Black Tower | 10/10 | 62.7-114.7 | 366.5 | 10/10 |

`node tools/soak.cjs --stage=3` selects one stage. `--natural` disables top-ups and starts with three lives. The unassisted masher cleared Stage 1 **9/10**, Stage 2 **10/10**, Stage 3 **0/10**, Stage 4 **10/10**, Stage 5 **1/10**. This bot does not deliberately dodge telegraphs or Mashadar. Those failures remain visible; the difficulty was not weakened to disguise them.

A headless Chromium session verified keyboard Title -> opening -> intro -> Stage 1, rendered every stage and boss, completed Taim's joint finish into clear, rendered Classic mode with large HUD/reduced shake/colorblind HP, and clicked the Options row. A touch-emulated browser also reached Stage 1 by tapping through the title/reels and fired a projectile through the original FIRE hit region. No page errors. A real Canvas render also covered all five boss arenas and the Callandor reveal. This is a browser smoke check, not a complete human campaign playthrough.

## Still weak / not claimed complete

- **Difficulty needs human tuning, particularly Stages 3 and 5.** The unassisted masher results above are poor there. Assisted 50/50 does not mean a child can clear the campaign unaided.
- **Procedural presentation is functional, not final painted quality.** New walkers and bosses have simple bodies, stepping legs/arm swing and effects. Static `cg-*` cutouts can replace them when delivered; a full painted animation atlas is not built here. Foot planting remains approximate.
- **No recorded voices.** Subtitles and synthesized cues work; full spoken performances are absent.
- **No full physical gamepad or phone playthrough.** Shared control code is retained and browser smoke is limited; audio feel, responsiveness on actual devices and long-run balance need human playtesting.
- Checkpoints restore the start of the current wave, not a mid-boss HP snapshot. Reloading after Stage 4 clear retains Callandor but may skip the already-cleared stage's reveal.

No changes to `main` and no PR merge are part of this work.
