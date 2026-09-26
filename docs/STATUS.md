# Current Repository Status

## Second-pass implementation report — 2026-09-26

### Built and playable

- A five-stage campaign with six encounters per stage, unique wave compositions, stage-specific breakables and power/healing pickups.
- Stage rosters are separated by location: Trollocs and a captain; Darkfriends and assassins; Mashadar-touched fighters; Stone Defenders; and turned Asha'man.
- Each location has a canvas-rendered sky, distant silhouette, middle architecture, ground plane, and near props moving at different parallax rates.
- Five named procedural bosses use individual health/speed/damage profiles and silhouettes. The Myrddraal relocates into a telegraphed strike, the Draghkar favors aerial attacks, the two Forsaken-style guardians use ranged channeling patterns, and Taim uses the full three-phase controller.
- Shadar Logoth has two timed Mashadar fog lanes which telegraph, become active, and damage Riley on contact.
- Full saidin produces a grace period, escalating vignette, deterministic screen wobble, and nonlethal HP loss. Reduced Shake greatly reduces the wobble while retaining the warning.
- Stone of Tear awards Callandor after its boss. The upgraded boss damage is passed into the following level and written to Continue data.
- Taim's third phase hands off at its finish threshold to the Twinkle Toes and Riley joint lightning/balefire sequence before the ending.
- Keyboard, touch controls, gamepad mapping, pause, accessibility options, procedural fallback art, Continue checkpoints, Loial, angreal, fireballs, saidin, and the screen-clearing super remain integrated.

### Partial

- Bosses have bespoke procedural silhouettes, stats, attack selection, and presentation, but share the proven common tell/state machinery for consistent fairness.
- Enemy families have distinct stats, movement logic, colors, bodies, and equipment; final painted atlases are not present.
- Story is complete through subtitle-first procedural scenes. Recorded dialogue is not present.
- The final team attack is scripted and visible with lightning/balefire effects; it does not yet have a painted Twinkle Toes animation.

### Missing / not claimed complete

- Final painted stage plates and character atlases.
- Recorded voice assets.
- A physical-device touch and gamepad certification pass.
- Final art-direction and release-polish approval.

## Grok review pass — 2026-09-26

Played from `rwb-pass2` with `node tools/soak.cjs` (fake canvas, the native canvas module is not installed) and headless Chrome. Screenshots of each stage, each boss, the taint vignette, the Taim joint finish, and the victory screen are in the review artifacts.

### Found

- The five stages could already be cleared, but the bosses were on the wrong maps: Myrddraal in Emond's Field, Draghkar in Caemlyn, a Forsaken in Shadar Logoth, and a Callandor Guardian in the Stone. Stage 1 had no tutorials. Bosses mostly shared one attack kit.
- Opening lines, stage-clear lines, and the voice catalog still called the sister Kenzie. Pause text still said "duct-tape grab" and "flying boot." The jab pose drew a wand and the fireball pose a spray canister.
- Mashadar did damage, but the "MASHADAR!" label was on screen only during the safe half of the cloud and disappeared when the hit window opened.
- Callandor was written at the Stone checkpoint, then Game Over replaced that save without `callandor` or a spent Loial, so Continue after a wipe dropped the upgrade. Dying with a life left set `hasRelic`, so the CALL button threw a relic instead of calling Loial.
- The forbidden buffet/cruise/whale/food/navy grep (`WL.|buffet|whale|cruise|navy|chips|spray|froyo|lido`) was already clean. Leftover cruise copy was still in player-facing pause text, Riley's held props, and `tools/bake_story.py` (unused plate prompts: lei, vegetables, duct tape, ice sculpture).
- Painted atlases and story plates are not in the repo. The title shows "PAINTED ART FAILED TO LOAD." `tools/chrome-smoke.cjs` cannot go green until those files exist, and it was still expecting the old cruise plate ids.

### Fixed

- Boss order is now Trolloc Chieftain, Myrddraal, Draghkar, the Forsaken, Mazrim Taim. Each has its own approach attack and a name on the boss bar. Stage 1 has five short tutorials. Early packs are smaller, with extra heals.
- Sister-facing copy says Twinkle Toes (speaker id stays `kenzie`), including the opening, stage clears, and the voice-catalog lines.
- Fog shows FOG COMING, then GET CLEAR, then MASHADAR! for the half-second that actually hurts. A probe on the cloud: 7 damage in the bite window, none in the windup, none in the gap.
- Full saidin chips 4 HP after about 9.2 seconds (first chip at taint time 9.22, 100 HP down to 92 by 11.7 seconds), pauses freeze the timer, and Reduced Shake cuts the wobble from 11px to 1.1px. The vignette and TAINT label stay.
- Callandor boss damage is 240 versus 130 without it. Game Over Continue keeps Callandor and a spent Loial. A respawn no longer arms the relic throw. Loial still charges once, damages the wave, and checkpoints as spent. Moiraine's heal is +30 and shows "Rise, Riley, Rise!" Angreal fires three larger fireballs.
- Taim's phase-3 threshold still ends in the joint finish: Riley is locked in the victory pose while Twinkle Toes and the lightning are drawn. The soak masher reached `bossdead` on all five stages (81s, 89s, 126s, 123s, 116s). Cache stamp is `?v=20260926-g1`.

### Still weak

- No painted art or recorded voice. Procedural bodies, backdrops, and the joint-finish figure are what the player sees. `verify-hd.cjs` cannot run without `@napi-rs/canvas`. Chrome smoke still fails the atlas and plate checks.
- The masher took 0 damage on stage 1 and only 25 on stage 4. A child who stands in the axe or a Stone charge will get hit, but a confident masher will find those two stages easy. Stages 2, 3, and 5 still land hits.
- Bosses share one tell clock and one body rig. Silhouettes differ (horns, eyeless hood, wings, staff, black coat) but they are not separate animations.
- `tools/bake_story.py` still describes the old cruise plates. It is not used at runtime. Design docs (`BRIEF.md`, `TASKS.md`, `ART_LIST.md`) still use Kenzie as her given name; the game itself does not.
- Enemy walks are still the shared cycle. The joint finish is a drawn dancer and a lightning bolt, not a dance animation.
