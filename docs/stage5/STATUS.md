# Stage 5 status

The Blight and the Eye of the World. Branch `rwb-2-stage5`. Campaign order is 1 → 2 → 3 → 4 → 5 → title. Tarwin's Gap stays Stage 6 and is not in this build.

## Jason's answers

1. The Ways is a later bonus stage. It is not in this build.
2. Balthamel's grab is mash 7 within 2.8 s.
3. The oak heals 1 HP/s up to 50% of max HP, then the 1.0 s root-out pushes Riley 220 px and the oak stays shut for 6 s.
4. Score and lives reset on the scene restart into Stage 5. `next()` does not carry them.
5. Aginor and Balthamel have painted-art slots: the hard-coded `PAINTED` list in `src/stage5-art.js`, now `present: true`: `tools/stage5/process_bosses.py` turned the two ChatGPT collages (`art-in/stage5/`) into trimmed atlases, approved by Jason F via Grok Bot 2026-10-09 pending review. The code-drawn sheets stay as the fallback, with no text in any frame. Exact frames are in `docs/stage5/ART-NEEDED.md`.

## Tasks

| T | In this build |
|---|---|
| T1 | Stage 5 is always on, the same way Stages 3 and 4 are. `?stage=5`, title arrows through stage 5, Stage 4 `next()` is `{ stage: 5, fromStage4: true, autostart: true }`. There is no `s5` flag. |
| T2 | `STAGE5_SRC` is excluded from the 25 MB pre-fight inventory. Stage 5 source cap is 192 KB. Existing caps are unchanged. |
| T3 | `Stage5Kit`, layout, view, `setQuality` on levels 0–5. |
| T4 | Blight hazards, `fogSlow` cleared by the kit each update and on teardown, caps, zone cleanup. Spore ticking lives in `stage5-spores.js` so `blightspawn.js` stays inside 9216. |
| T5 | `Stalker`, `Sporepod`, and `STAGE5_ACTORS`, registered by spreading into `STAGE4_ACTORS` so `stage1.js` is untouched. |
| T6 | Aginor tether, staff, short-step, ring, hands. One tether counter, counted from `takeHit` because that runs before `update`. |
| T7 | Balthamel hold, flail parry, coil, step. |
| T8 | Green Man beat, oak, surge, phase 3, defeat cleanup. |
| T9–T10 | Procedural backdrop, hazards, cast, portrait, and three story panels. |
| T11 | 21 enumerated voice lines and SFX cue names. Missing voice mp3s stay silent. Music ids `stage5` and `boss5` are registered. `music-stage5.mp3` and `music-boss5.mp3` are one-second silent stand-ins so the existing music inventory still sees a file. |
| T12 | Hint line and boss meters inside the existing HUD. Same touch layout. |
| T13 | Campaign bot clears all nine seeds and a no-power seed 1. Idling 120 s does not throw. |
| T14 | Lifecycle release, light cap, delta clamp, substep cap, counter latch. See `HARDENING.md`. |
| T15 | This file. |
| T16 | Overridden by Jason: Stage 5 is in the regular campaign now, not behind a flag. |

## Deviations

- `src/bot.js` changes by one character (`stageNo === 4` to `stageNo >= 4`) so Stage 5 reaches `stage4Bot` without a TDZ import of `bot.js` from `stage5.js`. `src/input.js`, `lib/`, `index.html`, and `src/stage1.js` are unchanged. `releaseStage` learns about Stage 5 from a microtask wrapper.
- One feature light is retinted for the Eye, the oak, and the flare, so phase 3 stays inside `maxLights` 10.
- `BALTH.parry` is not a named constant; the parry is the hurt state. `balthamel.js` is at the 9216 cap.
- Phase 2 sets `ringAt` to 999 and still steps a ring that is already growing, and it clears bone hands. Nulling the ring immediately left Riley jumping for the rest of the fight.
- The oak presence stat counts a frame inside the open oak even when Riley is already at the 50% heal cap.
- A melee flush calls `onFlush`, same as a light flush. Hazard damage that takes an enemy to 0 HP finishes them.
- The campaign bot, and only when Aginor is in a staff string, Riley is under 18 HP, and the gap is under 50 px, steps off that staff instead of attacking. That is the right-wall pin on seed 3. In phase 3 a bone-hand dodge keeps one direction for the whole tell, because flipping `sign` every frame walked Riley back onto the hand.
- Until `beatFired`, damage clamps Aginor at the next phase gate (66% in phase 1, 33% in phase 2) so a burst cannot kill him or skip the Green Man beat. `startBeat` sets `beatFired` and `invuln`. After the beat, the floor lifts and he can burn.
- Planned per-mechanic test files (`stage5-blight`, `stage5-stalker`, `stage5-aginor`, `stage5-greenman`, and the rest of the split `stage5-hardening-*` list) are folded into `stage5-kit`, `stage5-hardening`, `stage5-softlock`, `stage5-balthamel-hold`, `stage5-flow`, and `stage5-campaign`. Those files were not added as empty shells.
- The plan's prose says 23 voice lines. The id list in that same section is 21, and `STAGE5_VOICES` has those 21. The audit still reserves 23 × 200 KB.
- `releaseStage` is wrapped only when `globalThis.Phaser` already exists. Tests that import the stage table without Phaser do not pull in `stage1.js`.
- Stage 5 music files are the rendered loops. The loop points in `MUSIC` are [0.250, 40.250) and [0.250, 32.000).
- `VOICE_FILES` is the `present` list in `assets/audio/stage5-voice-manifest.json`. All 21 `STAGE5_VOICES` ids are present, so those lines play. `say()` skips any Stage 5 id left off that list, including story lines. `boss.introVoice` is not set; the kit captions `aginor_intro_01` when the Eye arena opens. Add an id to `present` only when its mp3 is in `assets/audio/voice/`.
- `assets/fonts/press-start-2p.ttf` is a glyph subset (ASCII, middle dot, multiplication sign, play triangle) under the same OFL file. The internal name is `RWB Pixel` so the subset does not reuse the reserved name Press Start 2P. `@font-face` still calls the family `PressStart`. That is the pre-fight slack under the unchanged 25 MB cap.

## Audio

The 21 voice lines are rendered. The script, names, and delivery are in `docs/stage5/VOICE-SCRIPT.md`. Riley and Loial lines are the Kokoro set. Narrator, Aginor, Balthamel, and the Green Man are the ElevenLabs set. Ids are the keys of `STAGE5_VOICES` in `src/stage5-voice.js`, and each one is in `assets/audio/stage5-voice-manifest.json`. `music-stage5.mp3` and `music-boss5.mp3` are the rendered loops. The ids stay `stage5` and `boss5`, on `MUSIC` in `src/audio.js`.
