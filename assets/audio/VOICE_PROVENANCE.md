# Character voice provenance

The game's original synthetic voices for Riley, Twinkle Toes, Moiraine, Loial and Be'lal were generated locally with Kokoro-82M v1.0 using the approved audition cast. No real-child recordings, real-person voice cloning, actor impersonation or paid TTS API were used. The characters' suggested ages are creative direction, not an assertion about the source stock voices.

## Sources and license

- Official model: https://huggingface.co/hexgrad/Kokoro-82M
- Inference software: https://pypi.org/project/kokoro/ (version 0.9.4)
- Stock voices: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- Apache-2.0 license: https://github.com/hexgrad/kokoro/blob/main/LICENSE
- Model revision: `f3ff3571791e39611d31c381e3a41a3af07b4987`
- Model SHA-256: `496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4` (verified)

The model and inference software are published under Apache-2.0. A license copy accompanies this file. Only generated speech assets are shipped; model weights and runtime dependencies are not bundled with the game.

## Approved casting

| Character | Stock voice blend | Synthesis speed | Pitch multiplier |
| --- | --- | ---: | ---: |
| Riley | 80% am_puck + 20% am_fenrir | 1.04 | 1.02 |
| Twinkle Toes | 75% af_bella + 25% af_heart | 1.08 | 1.14 |
| Moiraine | bf_emma | 0.95 | 0.97 |
| Loial | bm_george | 0.90 | 0.86 |
| Be'lal | 90% am_fenrir + 10% am_michael | 0.92 | 0.92 |

Riley, Twinkle Toes and Be'lal use the American-English phonemizer; Moiraine and Loial use British English. Processing preserves tempo during pitch shifting, shifts formants, applies a 70 Hz high-pass, trims silence conservatively, normalizes toward -16 LUFS and limits peaks. Output is mono 24 kHz MP3 at 96 kbps. No echo or reverb is added.

## Asset coverage and validation

54 MP3 files: Riley 30, Twinkle Toes 8, Moiraine 10, Loial 2 and Be'lal 4. This includes the three tower-escape lines and replaces the older female Be'lal recording. Existing narrator and other villain assets are unchanged.

The accompanying voice manifest records the exact text, filename, phonemes, duration, loudness, hash and codec for every generated line. Every clip decodes, contains audible-level signal, exceeds the game's 0.25-second placeholder cutoff and has true-peak headroom. Independent local speech recognition was used for intelligibility checks; recognition of invented names is imperfect. Machine checks do not substitute for listening to dramatic performance.

Pronunciation annotations for Callandor, Caemlyn, Loial, Saidin, Asha'man and Balefire guide speech without changing displayed dialogue. Pronunciation references: https://library.tarvalon.net/index.php?title=Pronunciation_Guide and https://www.theoryland.com/intvsresults.php?kwt=%27illian%27

Suggested credit: “Original synthetic character voices generated locally with Kokoro-82M by hexgrad (Apache-2.0), using approved stock-voice blends and character processing. No real-person voice cloning.”

An explicit primary stress on the existing contraction in “I'll guard our home” improves clarity; displayed wording and approved voice settings are unchanged.

## Angreal / ter'angreal and Twix cutscene lines (Stage 1 2.0, TTS)

`riley_angreal_01.mp3` is the approved 1.1 file, restored unchanged. The other 14 lines (5 Riley power barks and
the 9-line Twix campfire scene) were generated locally with the same Kokoro 0.9.4 / Kokoro-82M v1.0 model
(`tools/tts-power-lines.py`; text, speech input, phonemes, durations and hashes in `power-voice-manifest.json`).

- Riley: the approved cast above (80% am_puck + 20% am_fenrir, speed 1.04, pitch 1.02).
- Trollocs (new TTS casting, approved as "TTS growls/lines" for this feature; not an audition-approved cast):
  Grunt 70% am_onyx + 30% am_fenrir, speed 0.92, pitch 0.74; Spear bm_lewis (British), speed 0.98, pitch 0.80;
  Hound 60% am_fenrir + 40% am_echo, speed 1.06, pitch 0.84 with a light vibrato rasp. "ALL TROLLOCS" is the three
  Trolloc voices mixed with 70 ms offsets. A procedural growl SFX plays under each Trolloc line.
- Processing: rubberband pitch shift with shifted formants, 70 Hz high-pass, start/end silence trim, loudnorm
  toward -16 LUFS, limiter, mono 24 kHz MP3 at 96 kbps. No real-person cloning, no paid API.
- Checks: every clip decodes with audible level and headroom (peaks about -3 dBFS). Not yet reviewed by ear or by
  speech recognition; invented names (Ishamael, Aginor, Myrddraal) use explicit phoneme hints and may still be imperfect.

## Stage 2: Baerlon and the Whitecloaks (TTS)

19 new lines (`tools/tts-stage2-lines.py`), the same local Kokoro 0.9.4 / Kokoro-82M v1.0 model and processing
chain as above. Text, speech input, phonemes, durations and hashes are in `stage2-voice-manifest.json`.

- Story beat (6 lines, `st2_story_01`-`06`), Whitecloak barks (`zealot_intro_01`, `zealot_mud_01`), Jaret Byar
  (`byar_intro_01`, `byar_parry_01`, `byar_mid_01`, `byar_volley_01`, `byar_rage_01`, `byar_defeat_01`) and Riley
  (`riley_st2_stable_01`, `riley_ribbon_01`, `riley_mud_01`, `riley_st2_victory_01`, `riley_st2_clear_01`).
- Riley: the approved cast (80% am_puck + 20% am_fenrir, speed 1.04, pitch 1.02).
- New TTS casting for this stage (not audition-approved casts):
  - Narrator: bm_fable, speed 0.95, pitch 0.97 (British).
  - Jaret Byar: 70% bm_daniel + 30% bm_lewis, speed 0.94, pitch 0.90 (British).
  - Whitecloak zealot: 70% am_eric + 30% am_liam, speed 1.02, pitch 0.93.
- Pronunciation hints: Baerlon, Myrddraal and Darkfriend (displayed text unchanged).
- Checks: every clip decodes, has audible level and headroom, and is under 200 KB. A local speech-recognition pass
  (faster-whisper small.en, `docs/stage2/voice-stt-check.json`) scored a mean word match of 0.79. Most misses are
  spacing ("dark friend" vs "Darkfriend") or invented names: Myrddraal was heard as "emerald" and Byar as "Bayar".
  "Kneel" was heard as "Neil", which is the same sound. The one-word bark "Loose!" was heard as "Looser". None of
  these has been reviewed by ear.

## Stage 3: Caemlyn and the Myrddraal (ElevenLabs + Kokoro)

18 lines recorded in `stage3-voice-manifest.json`.

### ElevenLabs takes (`eleven_v4`)
Recorded by Jason via ElevenLabs `eleven_v4`. Copied byte-for-byte from `/workspace/rwb-voice/stage3-eleven/` into `assets/audio/voice/`. Fade slow-down and reverb processing are skipped because Branok's takes are already whispered and menacing.
- Basel Gill (`st3_story_02`, `st3_story_04`): voice **Grandfather Joe**
  - `st3_story_02`: "[nervous] hushed, worried, leaning in to tell a secret"
  - `st3_story_04`: "[concerned] fatherly warning"
- Cutthroat (`cutthroat_intro_01`, `cutthroat_grab_01`): voice **Eastend Steve**
  - `cutthroat_intro_01`: "[whispers] low, sneering, to his partner"
  - `cutthroat_grab_01`: "[shouting] triumphant, grabbing someone"
- The Myrddraal (`fade_intro_01`, `fade_mid_01`, `fade_split_01`, `fade_defeat_01`): voice **Branok**
  - `fade_intro_01`: "[whispers] slow, cold, menacing"
  - `fade_mid_01`: "[whispers] a hiss, dragging out \"fear\""
  - `fade_split_01`: "[whispers] mocking, echoing, taunting"
  - `fade_defeat_01`: "[whispers] fading out, weakening, defeated"

### Kokoro TTS lines
10 lines generated locally via `tools/tts-stage3-lines.py` with Kokoro 0.9.4 / Kokoro-82M v1.0.
Reuses the exact approved Stage 2 casts for Riley and Narrator:
- Riley: 80% am_puck + 20% am_fenrir, speed 1.04, pitch 1.02.
  - `st3_story_03`, `st3_story_05`, `riley_escape_01`, `riley_st3_roof_01`, `riley_st3_glimpse_01`, `riley_counter_01`, `riley_st3_victory_01`, `riley_st3_clear_01`.
- Narrator: bm_fable, speed 0.95, pitch 0.97.
  - `st3_story_01`, `st3_story_06`.
- Pronunciation hint: Caemlyn (`kˈeɪmlɪn`).
- Checks: all 18 lines scored >= 0.8 on faster-whisper small.en (`docs/stage3/voice-stt-check.json`).
