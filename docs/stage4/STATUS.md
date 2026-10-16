# Stage 4 status

Playable Shadar Logoth on `rwb-2-stage4`, entered with `?s4=1&stage=4`. `?god=1` and `?skip=boss` use the same switches as Stage 1 (`skipBoss` lands at the court gate).

## What is in

- Registry: `s4=1` enables stage 4 and implies stage 3. `stage=4` without the flag, and `stage=4&s3=1`, stay on stage 1. Clearing stage 3 with `s4=1` continues to stage 4; otherwise it returns to the title. Score and lives reset on that continue, the same way stage 3 ignores `fromStage2`.
- Four zones: fog tutorial, plaza, tower row with a creeping fog wall, Mordeth's court and the Draghkar.
- Fog tendrils (sprites, not a shader), moonshafts, cultist chants and bolts, collapsing towers, rubble, phase-3 walls that never close under 640 px, croon, kiss mash (8 in 3.0 s with decay), swoop counters.
- Shared controls. Stage 4 does not construct `Input`. Keys, gamepad, and the touch stick are the Stage 1–3 path.
- Headless bot in `src/bot-stage4.js`. Nine seeds clear, including a no-power seed.

## Placeholder vs final

Painted (Grok Bot image generation, 2026-10-07; provenance in `assets/bg4/ART_STATUS.json`, processing in `tools/stage4/process_bg4_art.py`, sources in `art-in/bg4` and `art-in/story4`):

- `bg4-far.jpg` 1280x602 moonlit skyline. `bg4-mid.webp` 1280x502 (Gate of Aridhol, dry fountain plaza) and `bg4-mid2.webp` 1280x588 (Tower Row, Mordeth's hall), magenta sky keyed to alpha. Three seamless floors at 1080x360, tiled at 188/360. Story panels `story4_panel_1..3.jpg` at 1280x720.
- They load in `queueStage4` under the procedural texture keys, so the boot painter skips them. A file that fails to load during a session leaves its key to the painter, and the view falls back to the old layout for that layer. On a cold boot straight into `?stage=4`, the startup guard still treats any failed file as a required-asset failure, the same as every other preload file.
- Cultist sheet `assets/bg4/s4cult.webp` (8 × 340x338): a reskin of the painted Whitecloak archer atlas (`tools/stage4/reskin_cultist.py`, same approach as the Stage 3 cutthroat and Fade). Bow cut out, oxblood and black hooded robes, the sun badge turned into the green charm, chant rings and bolt glow painted in the procedural colours. Same pose order as `cultFrame`. The actor scales the taller cell to the painter's 190 px footprint, so the feet, hitboxes and timing are unchanged. It loads under `s4cult`, and the painter is the fallback.
- Layout (`PLATES` in `src/stage4-view.js`): the two mids sit side by side at native size, parallax 0.29 with a 140 px overlap, bottom at y 590. Floors hand off over 280 px at x 1800 and 3600 and fade 40 px up into the plates. The moon light sits on the painted moon (756, 269).

Placeholder (painted at boot from `src/stage4-art.js`, `src/stage4-art-fog.js`, and `src/stage4-art-cast.js`. Not final art). The HUD `PLACEHOLDER ART` tag shows only with `?debug` while any of this is on screen:

- Mashadar banks, tapering tendrils with a bright tip, flaring vents, churning fog walls, moonshafts, stone towers with a dust frame, rubble.
- Draghkar sheet (perch, flap, glide, land, claw, croon, kiss, reel, down, ash) and the boss portrait. No painted atlas has wings, so these wait for generated stills (`docs/stage4/DRAGHKAR_STILLS_REQUEST.md`). Hitboxes, timing, and texture keys are unchanged. Backdrop and fighters use Light2D. At quality 2 and above the fog banks thin and tendrils draw five segments.
- Music `stage4` / `boss4` loop from `assets/audio/music-stage4.mp3` and `music-boss4.mp3` (loop [0.25, 40.25) s and [0.25, 30.726) s). The 23 Stage 4 voice lines play from `assets/audio/voice/` on the story, fog, tower, bridge, light, cultist, and Draghkar beats. The croon hum loops only while the croon is active.

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
- Stage 4 source does not fit the leftover Stage 1 pre-fight headroom (about 2 KB after Stage 3). `tools/audit-stage1.mjs` reports those modules under `stage4.source` (192 KB cap) instead of the 25 MB gate, the same split Stage 3 voices already use. The illustrated boot art lives in that budget. The modules are still imported by the stage 1 scene, so a cold load does download them; the split is so the existing 25 MB test can stay unchanged.

## Known issues

- The backdrop and story panels are painted. The cultist and Draghkar sheets and the Draghkar portrait are still procedural; the `PLACEHOLDER ART` tag for them shows only with `?debug`. The Stage 4 music and voice files are the rendered takes.
- The bot is tuned to demonstrate every mechanic in one clear. A human player is not carried the same way; tells are the fairness, not the bot's spacing.
