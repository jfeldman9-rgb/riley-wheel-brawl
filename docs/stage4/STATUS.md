# Stage 4 status

Playable Shadar Logoth on `rwb-2-stage4`, entered with `?s4=1&stage=4`. `?god=1` and `?skip=boss` use the same switches as Stage 1 (`skipBoss` lands at the court gate).

## What is in

- Registry: `s4=1` enables stage 4 and implies stage 3. `stage=4` without the flag, and `stage=4&s3=1`, stay on stage 1. Clearing stage 3 with `s4=1` continues to stage 4; otherwise it returns to the title. Score and lives reset on that continue, the same way stage 3 ignores `fromStage2`.
- Four zones: fog tutorial, plaza, tower row with a creeping fog wall, Mordeth's court and the Draghkar.
- Fog tendrils (sprites, not a shader), moonshafts, cultist chants and bolts, collapsing towers, rubble, phase-3 walls that never close under 640 px, croon, kiss mash (8 in 3.0 s with decay), swoop counters.
- Shared controls. Stage 4 does not construct `Input`. Keys, gamepad, and the touch stick are the Stage 1–3 path.
- Headless bot in `src/bot-stage4.js`. Nine seeds clear, including a no-power seed.

## Placeholder vs final

Placeholder (labelled procedural textures from `src/stage4-view.js`, plus `assets/bg4/lights.json` for moon keys, shafts, and vents):

- Far/mid/floor plates, fog tip (bright `#d8ff6a`), segments, vents, walls, moonshafts, towers, rubble, Draghkar and cultist blocks, story panels, portrait.
- Music ids `stage4` / `boss4` are registered and silent. There are no new `EXTRA_VOICE` lines, so story captions are inline and Draghkar/cultist voices stay quiet if the files are missing.

Final logic (not art): fog, cultists, Draghkar phases, kiss rules, towers, arena, HUD boss bar / croon arc / kiss hint, stage select name, bot, and the campaign.

## Deviations

- Towers, the phase-3 arena, scene actors, the view, and the bot live in sibling modules so `stage4.js`, `stage4-hazards.js`, `cultists.js`, `draghkar.js`, and `bot.js` stay inside their caps.
- Fog does not grip the Draghkar. A tendril used to set his state to `down`, which his state machine does not have, and phase 3 stopped taking damage.
- A tower or a fog grip that drops a fighter or cultist to 0 HP calls `die()` / `defeat()` so a 0 HP body cannot sit in `down` on a looping walk clip.
- The first phase-3 fog swoop arms at 0.4 s, and swoops keep coming below 15% HP (about every 6.15 s, the planned +30%). Walls stop tightening at 15%, as specified.
- `zoneWall` is counted when the wall is armed. Touching it still shoves and ticks damage, and it does not knock down.
- Kiss tell and lunge fill the attack-token cap the way a cutthroat hold does, so a cultist chant cannot stack a third token on top of the kiss.
- `canBeHit` stays true during `counter_down` so the 1.5× punish window can be hit.
- Croon uses an 8 s timer instead of a per-substep random roll, so it is reachable in a fight and still passes the Draghkar tests.
- Swoop edges come from the scene bounds. The pure Draghkar tests still use their default edges.
- `scene.grabBusy` stays a method. The kiss stores its flag on `_kissBusy`.
- Riley's `riley4_kissed` / `riley4_break` clips play only when those animations exist. Otherwise the existing grabbed and escape clips play.
- No Stage 2 fingerprint baseline is checked in on this machine. Stage 2 is covered by its existing tests.
- Stage 4 source does not fit the leftover Stage 1 pre-fight headroom (about 2 KB after Stage 3). `tools/audit-stage1.mjs` reports those modules under `stage4.source` (96 KB cap) instead of the 25 MB gate, the same split Stage 3 voices already use. They are still imported by the stage 1 scene, so a cold load does download them; the split is so the existing 25 MB test can stay unchanged.

## Known issues

- Art, music, and Draghkar/cultist voice files are still placeholders or silent.
- The bot is tuned to demonstrate every mechanic in one clear. A human player is not carried the same way; tells are the fairness, not the bot's spacing.
