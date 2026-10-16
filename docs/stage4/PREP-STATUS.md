# Stage 4 prep status

Prep only, on `rwb-2-stage4-prep`. New files. Stage 4 is not registered. Stage 3 modules (`src/myrddraal.js`, `src/darkfriends.js`, `src/stage3-hazards.js`) are not on this branch and are not imported.

## Done

| Task | Files | Notes |
|---|---|---|
| T2 | `tools/stage4/art-manifest.json`, `tools/stage4/make_placeholders.py`, `tools/stage4/write_art_prep.py`, `docs/stage4/prompts/*.json`, `tests/stage4-placeholders.test.mjs` | 43 items, one prompt each. Placeholders are generated into a temp dir by the test. They are not committed under `assets/`. |
| T4 | `src/stage4-hazards.js`, `tests/stage4-fog.test.mjs` | Pure fog core, 10295 bytes. No Phaser. |
| T6 | `src/cultists.js`, `tests/stage4-cultist.test.mjs` | Plain `Cultist`, 8536 bytes. No Phaser. |
| T10 | `tools/stage4/audio-manifest.json`, `tools/stage4/tts_stage4_lines.py`, `tools/stage4/synth_sfx.py`, `src/stage4-sfx.js`, `tools/stage4/music-manifest.json`, `tools/stage4/compose_stage4.py`, `tests/stage4-audio.test.mjs` | Manifests and scripts are committed. Voice MP3s and music loops were not rendered (no Kokoro, no `ELEVENLABS_API_KEY`, no fluidsynth / FluidR3). The test skips STT and loop-point checks and says why. Synth WAVs are generated in temp and checked at > 2 KB. |

## Injected contracts

**Fog** (`createFog(deps)` in `src/stage4-hazards.js`):

- `deps.lightNear(world, x, r) -> boolean`. Called with the tendril tip and `r = 260`. True recoils that tendril to its vent over 1 s and sets the vent dormant for 5 s. T5 wraps the real `lightNear(scene, x, r)` from `src/myrddraal.js` and may ignore `world`.
- `step(dt, world)` reads `world.riley` `{x, y, hp, state, alive, r?}`, `world.enemies[]` `{x, y, hp, type, alive, state, r?, knocked?}`, plus `story`, `paused`, `lastWave`, `exitX`, `exitBand?`.
- Moonshafts come from `setMoonshafts([{x, y, r}])`, not from world.
- `tryEmit(vent, world)` starts the 0.8 s tell. Caps: 1 live-or-telling in zone 0, 2 elsewhere. Distance under 300 px from Riley is refused. A step that would drop the free strip inside Riley ± 400 px below 200 px is refused. After `lastWave`, a tip or vent inside `exitBand` (default 80) of `exitX` is refused.
- Contact writes `fogSlow` (0.3), `hp`, and on a 2.0 s grip sets `state = 'down'` then 2.0 s immunity after getup. A cultist with `knocked` overlapping a harmful tip takes 20 once.
- `dispose()` empties vents, tendrils, and moonshafts. Later `addVent` / `step` no-op.

**Cultist** (`src/cultists.js`):

- `new Cultist(scene, x, y, deps)` pushes onto `scene.enemies` and creates `scene.fogBolts` if missing. Scene needs `riley {x, y, hp, alive, state, facing, attackFrame?}`. Fireballs are optional `{x, y, alive?}`.
- `deps.summonVent({x, y}, cultist)` runs when a 1.0 s chant finishes. Any `takeHit` during the chant cancels it and sets `state = 'dazed'` for 0.8 s. `casterBusy(scene, self)` allows one chant.
- `updateFogBolts(scene, dt)` moves bolts. An attack frame in front of Riley, or a fireball within 36 px, pops a bolt. A grabbed Riley is not damaged. Loose bolts are capped at 2.
- `cultistHoldsToken(e)` is true during `chant` and `bolt` windup so a later `attackTokens()` can count them.
- KO / flee follows the Stage 2 Whitecloak alternation (`koCount` on the scene, even counts flee). `clearStage4Cultists(scene)` drops bolts and marks cultists gone.

**Audio:**

- Kokoro: Riley (`am_puck` 0.8 / `am_fenrir` 0.2, speed 1.04, pitch 1.02) and Loial (`bm_george`, speed 0.90, pitch 0.86).
- ElevenLabs: Draghkar, cultist, narrator, Mordeth. Needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_DRAGHKAR`, `_CULTIST`, `_NARRATOR`, `_MORDETH`.
- `playStage4Sfx(ctx, bus, name)` plays `fogGurgle`, `towerCrack`, `screech`, `croonChord`. It is not wired into `src/audio.js`.
- `python3 tools/stage4/compose_stage4.py OUT_DIR` registers `stage4` and `boss4` on `tools/music/compose.py` `TRACKS` at runtime and calls `compose.build`. It does not edit `compose.py`.

## Still to wire after Stage 3 merges

- **T1:** register Stage 4 (`STAGE4`, `s4`). Do not do that on this branch.
- **T3:** `Stage4Kit` loads backdrops, floors, moonshafts, and calls `setMoonshafts`. Pass a `lightNear` wrapper into `createFog`.
- **T5:** towers, rubble, zone-2 fog wall. The wall's minimum width is not in the fog core. `tryEmit` already refuses a spawn that would block `exitX` after the last wave. Wrap `lightNear(scene, x, r)` and feed `VOLLEY_BANDS` into the tower script as a parameter. Do not import `src/stage3-hazards.js` from these prep modules.
- **T6 scene hook (small):** construct `Cultist` on the kit, call `updateFogBolts` each tick, and point `summonVent` at `fog.addVent` + `tryEmit`. Count `cultistHoldsToken` inside `attackTokens()`.
- **T7 / T11:** Draghkar, HUD, story, and `STAGE_MUSIC` / `EXTRA_VOICE` stay out of this prep. Play `playStage4Sfx` from the existing bus when those land.
