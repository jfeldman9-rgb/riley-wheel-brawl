# Stage 3: Caemlyn and the Myrddraal

Riley follows the ribbon north to Caemlyn. At the Queen's Blessing, Basel Gill says a man with no eyes was on the
rooftops at dusk, carrying a small bundle tied with a blue ribbon. Riley goes up onto the roofs as the day fails,
and meets the Myrddraal in the palace garden.

Riley is 16: very muscular, short dark hair, thin blue-framed glasses, a sleeveless black Asha'man coat. There is
no gore. A beaten cutthroat is knocked out (dizzy stars, then he fades) or gets up and runs, alternating so each
outcome comes from the seed. The Myrddraal is not killed on screen. It melts back into shadow.

Stage 3 stays behind `s3=1`. `?stage=3` with no flag is still Stage 1. Opening it in the campaign is T17, and that
waits on Jason.

## How to play and test it

| What | How |
| --- | --- |
| Jump straight to Stage 3 | `index.html?stage=3&s3=1` |
| Stage 3 with the flag missing | `?stage=3` still loads Stage 1 |
| Skip the story beat | add `&story=0` (or press Start/Esc during it; Attack advances a line) |
| Boss arena | `?stage=3&s3=1&skip=boss` |
| Demo bot / invulnerable | `&demo=1`, `&god=1` |
| Full suite | `node --test tests/*.test.mjs` |
| Stage 1 combat identity | `node tests/helpers/run-full-stage-simulations.mjs`, then diff against `docs/stage1/evidence/full-stage-simulation.json` excluding `sourceSha256` and `baseGitCommit` |
| Stage 1 audit | `node tools/audit-stage1.mjs` |

Only one stage's backdrop and enemy atlases stay in memory. Switching stages releases the other stage's art,
decoded voice clips, and the procedural kit textures (`arrow`, `ribbon`, rain and lane marks). Riley, the hounds,
Loial, the crate and the planks are shared where the destination stage uses them. Boot portraits, including the
Fade portrait, stay loaded.

## Layout (4 zones, world 5200 px)

Light moves from golden afternoon to torchlit night as the camera scrolls. Keys are in `assets/bg3/lights.json`:
x 0 `0x8a7a62`, x 2400 `0x7a5a52`, x 3300 `0x3a3a52`, x 3900 `0x262c48`.

1. **New City market** (0–1280): two cutthroats, then a zealot and a cutthroat. Intro: "That's the one the Lady wants. Take him quiet."
2. **Queen's Blessing yard** (1240–2520): cutthroat and archer, then two cutthroats and a zealot. Twinkle Toes' **ribbon** drops here (+1000).
3. **Rooftops at sunset** (2560–3840): cutthroats drop from above (`T`). Roof tiles mark a lane, then sweep it. On the clear, the Fade is glimpsed once on the far roofs with the bundle.
4. **Palace garden at night** (3920–5200): the Myrddraal.

Drops follow the same table as Stages 1 and 2: angreal, lightning, fire shield, air whip, a random ter'angreal,
a second angreal, and the sa'angreal at the Myrddraal's phase 2. Balefire and the Loial call work unchanged.
Torches ramp in over 0.4 s. At most 4 are lit on screen. The sun is in the same light budget as Riley
(`maxLights` 10) and is off by the garden.

## Enemies

**Darkfriend cutthroat** (34 HP)
- A flanker. Cosh swing is 8 damage, medium. The grab lunge coils for 0.45 s, then moves at 620 px/s.
- It catches Riley only when he is grounded and idle, walking, running, hurt, landing, or attacking away. An active
  attack toward the cutthroat counters him.
- Hold lasts at most 2.4 s. Chip damage is 2, every 0.6 s, at most 3 chips, and it will not take the last hit point.
  Mash attack, jump, special or a new direction 6 times. The count drops by 1 every 0.5 s.
- Escape shoves him: open for 1.2 s at ×1.3 damage. Timeout throws Riley down (8 damage, knockdown).
- Only one cutthroat grabs at a time. Grab cooldown is 5–8 s (first grab 2.0–3.5 s). Roof tiles break the hold.
  Loial knocks him off. Drop-ins mark the ground for 0.7 s and land from z = 520.

**Returning Whitecloaks and hounds.** Zealots, archers and hounds use their Stage 1 and 2 moves unchanged.

## Boss: the Myrddraal (440 HP, 3 phases)

1. **Shadow blink** (100–66%). Slash (12 damage, the second hit a knockdown) and a lunge. Every 4–6 s it sinks.
   A shadow pool warns for 0.6 s behind Riley, then it rises and slashes. A hit on rise frames 2–3 staggers it for
   1.4 s at ×1.5 damage.
2. **Fear aura** (66–33%). The aura turns on at fear frame 3, radius **220** px. The meter fills in **1.6** s, then
   Riley is shaken for 0.7 s. **Brave** lasts **1.2** s after that, and a living copy that is lunging also counts
   as calm, so the meter does not fill. The HUD arc is magenta `0xff00ff` at alpha 0.85. Vignette runs from 0.35
   to 0.75 and garden torches dim to 70% radius. Fire, lightning, fire shield or Balefire within 400 px clears
   the aura for 4 s. Blinks slow to every 6–8 s.
3. **Shadow copies** (33–0%). Itself plus 2 copies, same frames, no tint. The real one casts a shadow. Hitting a
   copy pops it and the real one lunges within 0.3 s. Hitting the real one in its telegraph staggers it and
   removes the copies. It re-splits after 8–10 s.

Damage is ×0.6 while it blinks, casts fear, splits, during the intro, or just after it gets up. At 0 HP it kneels
and melts. It is never a knockdown death.

## Art

Everything in the stage is still a **labelled placeholder**. T14 (real art, one approved sheet at a time) is not
done. Prompts in `docs/stage3/PLAN.md` §4.2 still ask for the full design size. The files on disk are packed to
stay inside the 110 MB resident budget:

- Character pages are silhouette-trimmed. `sourceSize` is still the design canvas, so fighters draw at the same size.
- The seven backdrop plates are **1086×362** (half of 2172×724). `plateScale` draws them at the 2172 design width.
- Strips, the Fade portrait and the three story panels are at the sizes in the art table.
- Normal maps are flat placeholder cards, not painted lighting.

`assets/stage3/ART_STATUS.json` marks every entry `placeholder: true`. The HUD shows `PLACEHOLDER ART` until that
flips. Screenshots were not captured this pass. The headless browser was used for frame timing only.

## Audio

Music: `music-stage3.mp3` ("Caemlyn at Dusk", target −16.0 LUFS) and `music-boss3.mp3` ("Shadow in the Garden",
target −15.2 LUFS). See `assets/audio/AUDIO_PROVENANCE.md`.

Voices: 18 lines in `assets/audio/VOICE_PROVENANCE.md`. Riley and the narrator are local Kokoro, normalized toward
−16 LUFS. Basel Gill, the cutthroat and the Myrddraal are Jason's ElevenLabs `eleven_v4` takes (Grandfather Joe,
Eastend Steve, Branok), copied byte-for-byte and not loudness-matched to the Kokoro lines. All 18 lines scored at
least 0.8 on faster-whisper (`docs/stage3/voice-stt-check.json`).

Leaving a stage drops that stage's decoded clips. They load again on the next visit.

## Tests

`node --test tests/*.test.mjs` is **722/722** at this docs pass (716 at `150ae6e`, before the memory tests).
Stage 3 campaign clears on all 9 seeds. Stage 3 files:

- `tests/stage3-flow.test.mjs`: `?stage=3` without `s3` is Stage 1; `s3=1` loads Caemlyn; title select and clear stay flagged.
- `tests/stage3-cutthroat.test.mjs`, `tests/stage3-riley-grab.test.mjs`: grab, mash, throw, counter, drop-in.
- `tests/stage3-fade.test.mjs`: phases, blink counter, fear, dispel, split, melt.
- `tests/stage3-hazards.test.mjs`, `tests/stage3-kit.test.mjs`: tiles, glimpse, light budget, time of day.
- `tests/stage3-campaign.test.mjs`: 9 seeds, all 3 phases, no softlock.
- `tests/stage3-assets.test.mjs`, `tests/stage3-placeholders.test.mjs`: atlas geometry, distinct frames, prompts, hashes.
- `tests/stage3-audio.test.mjs`, `tests/stage3-hud.test.mjs`: music, voices, fear arc, mash ring, watermark.
- `tests/stage3-memory.test.mjs`: 110 MB page+plate estimate, one stage resident, restarts and zone changes return to baseline.
- `tests/stage3-voice-release.test.mjs`: the other stage's clips are released on a switch.
- `tests/stage3-update-allocation.test.mjs` and the `*-hardening.test.mjs` files: clocks, grabs, aura races, sun budget, knee on a held cutthroat.

Stage 1 character art-density failures (Riley, grunt, spear, hound) are the pre-existing audit result. They are not Stage 3.
