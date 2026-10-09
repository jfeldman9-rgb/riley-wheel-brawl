# Character voice provenance

> **Riley update (2026-10-09):** every Riley line is now an ElevenLabs `eleven_v4` take (voice DYLO). The Kokoro Riley cast below is kept as history. See "Riley re-recorded with ElevenLabs" at the end.

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

## Riley re-recorded with ElevenLabs (2026-10-09)

52 live Riley lines, re-recorded 2026-10-09, approved by Jason F via Grok Bot. They replace the Kokoro Riley takes (80% am_puck + 20% am_fenrir)
in Stage 1 (including the angreal and Twix lines), Stage 2, Stage 3 and Stage 4. Filenames and voice keys are unchanged.

- Engine: ElevenLabs `eleven_v4`, one generation per line, flow `SkoFiE0iYZuFV5JUfqr2`.
- Voice: **DYLO - Dark Anime Hero** (`JjsQrIrIBD6TZ656NQfi`), a stock ElevenLabs library voice. No real-person cloning.
- Exception: `riley_super_01` ("Balefire!") is Jason's audition pick, voice **Michael Dalton - Modern Male Lead**
  (`QZ1okeFI43NQd6lXAzQ5`), prompt `[shouting] Balefire!`, generation `trPBRItQDqPTOh20vzXG`.
- Prompts: at most one short emotion tag and respellings for invented names (Mwah-rain, Air-ih-dol, Murr-drahl,
  Loy-al, sah-EEN). Displayed captions are unchanged.
- Processing: ElevenLabs take (mono 44.1 kHz 128 kbps) -> trim start/end silence, highpass 70 Hz, loudnorm I=-17.5 TP=-2 LRA=7, alimiter 0.75 -> mono 24 kHz 64 kbps; the 10 longest Stage 1/2 lines use 56 kbps so the 25 MB pre-fight budget still passes (median about -18 LUFS, matching the old Riley lines).
- Story timings in `src/twix.js`, `src/stage2.js` and `src/stage3.js` carry the new clip lengths so captions hold for the whole line.
- Checks: faster-whisper medium.en (best of four silence paddings) on every encoded file. See
  `stt_word_match` in `riley-voice-manifest.json` and the Riley rows in `docs/stage2/` and `docs/stage3/voice-stt-check.json`.
  Invented names score low ("Balefire" heard as "Baelfire", Aridhol as "Eredil"). Not a substitute for listening.
- Re-render: `python3 tools/riley_voice.py OUT_DIR [line_id ...]` (needs `ELEVENLABS_API_KEY`). The Stage TTS scripts
  call the same module for Riley. A re-render is a new take and will not match these hashes.
- Full record (prompt, generation id, session id, duration, bytes, bitrate, SHA-256 for each line): `riley-voice-manifest.json`.

| Line | Text | Prompt | Voice | Generation | Bitrate | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `riley_st1_01` | I'll guard our home. | `[determined] I'll guard our home.` | DYLO | `PU4Z4u7wgbN8HvM27r7w` | 64k | `a8062e801bcdc795…` |
| `riley_combo_01` | Front kick! | `[shouting] Front kick!` | DYLO | `sjFgfxxl5BXTdL4qF0f0` | 64k | `bef85bd155363363…` |
| `riley_combo_02` | Roundhouse! | `[shouting] Roundhouse!` | DYLO | `m4WRu9w0Uh9KBTdB2gpT` | 64k | `23594fb4b19bafa7…` |
| `riley_combo_03` | Spin! | `[shouting] Spin!` | DYLO | `T2KD4uhOBTEEB07sl4C1` | 64k | `98223e3dedbbc9e9…` |
| `riley_fire_01` | Fire! | `[shouting] Fire!` | DYLO | `LepXUe8IVEBhCr8JQnZ2` | 64k | `339d7af0bdea463e…` |
| `riley_grab_01` | Not so fast! | `[cocky] Not so fast!` | DYLO | `WBfiQUHlE0CZwHiSgTiq` | 64k | `70258fd2e7011fc2…` |
| `riley_throw_01` | Over there! | `[shouting] Over there!` | DYLO | `ifJFp8uxe3ghycecnPWn` | 64k | `0fd6d1e3c38cf117…` |
| `riley_bighit_01` | Oof! That one hurt! | `[pained] Oof— that one hurt!` | DYLO | `UpsS3tLkIM63BwK3S3K4` | 64k | `329d1490cb77cb06…` |
| `riley_bighit_02` | I'm okay! Keep going! | `[determined] I'm okay! Keep going!` | DYLO | `UzkvrPp8Ol49HzY0daCn` | 64k | `a665924f98f7a80c…` |
| `riley_low_01` | I need a moment. | `[breathless] I need a moment.` | DYLO | `Zs5nixYIiCDybJeeorIO` | 64k | `3711979becd7b919…` |
| `riley_respawn_01` | Back on my feet. | `[determined] Back on my feet.` | DYLO | `Ji2r28trBMszuNlg1r11` | 64k | `dde76cc2952d156e…` |
| `riley_victory_01` | The way is clear. | `[confident] The way is clear.` | DYLO | `ciZINq1QTCgjOlm6Qm1E` | 64k | `131d6d62f9f625c7…` |
| `riley_st1_clear_01` | Twinkle Toes, I am coming. | `[determined] Twinkle Toes, I am coming.` | DYLO | `QVnhUBZkxM7AQYsVUtX5` | 64k | `d621d8d4d9c9ceb7…` |
| `riley_super_01` | Balefire! | `[shouting] Balefire!` | Michael Dalton | `trPBRItQDqPTOh20vzXG` | 64k | `94d22d9bdeadf174…` |
| `riley_call_01` | Loial, now! | `[shouting] Loy-al, now!` | DYLO | `rVfrhg2aRC1Dve8XSyUJ` | 64k | `052b1fde6f24b3eb…` |
| `riley_call_spent_01` | Loial needs a rest. | `[tired] Loy-al needs a rest.` | DYLO | `tFv37jHbWSFlMV0Rh3WK` | 64k | `a51d523cc160e636…` |
| `riley_angreal_01` | The fire burns brighter! | `[excited] The fire burns brighter!` | DYLO | `O4wnBt7lS2fhOnZenVT2` | 64k | `12dba75631106816…` |
| `riley_saangreal_01` | Whoa. That is a LOT of saidin! | `[excited] Whoa. That is a LOT of sah-EEN!` | DYLO | `9ANd1mJzunIZGEODC9WG` | 56k | `c01b02e18fd3aeea…` |
| `riley_lightning_01` | Lightning, on my call! | `[shouting] Lightning, on my call!` | DYLO | `P3MzJgYWUzGdNm2HB8Vj` | 64k | `09d6135e25880a39…` |
| `riley_fireshield_01` | Try touching me now! | `[cocky] Try touching me now!` | DYLO | `VdERxNY0d22dlBBibMWv` | 64k | `13586d8c58334663…` |
| `riley_airwhip_01` | Come here, you! | `[cocky] Come here, you!` | DYLO | `ZFuCvGYI8E18yokC06iC` | 64k | `31bfa5eb91d8852a…` |
| `riley_twix_01` | Wait... is that a Twix? | `[surprised] Wait... is that a Twix?` | DYLO | `6yYug8Enbi1OxIw05LkM` | 64k | `cf65afbcd4d52d46…` |
| `twix_01` | Snack truce. One Twix each, and nobody bites anybody. | `[casual] Snack truce. One Twix each, and nobody bites anybody.` | DYLO | `bOkR5DGwmXEEEH08FFlu` | 56k | `40923ff432745c54…` |
| `twix_07` | Have you guys ever thought about... not working for the Dark One? | `[curious] Have you guys ever thought about... not working for the Dark One?` | DYLO | `x94A4PFwpw84906PWmgd` | 56k | `afae05e25bc59b8c…` |
| `twix_09` | Ask me after I win. Break's over! | `[cocky] Ask me after I win. Break's over!` | DYLO | `y416H0aJvORrv722WUk8` | 56k | `46a7193c4c3f8ff5…` |
| `st2_story_02` | These hoofprints... a Myrddraal came this way. Hang on, Twinkle Toes. | `[serious] These hoofprints... a Murr-drahl came this way. Hang on, Twinkle Toes.` | DYLO | `N6vLmcbxhtnnTh8yFhFO` | 56k | `907ca03a2c0556af…` |
| `st2_story_03` | That's her ribbon! She was here! | `[excited] That's her ribbon! She was here!` | DYLO | `30yEOjKSQQNq0prAYqsp` | 64k | `f50c0da4bbf69c72…` |
| `st2_story_05` | Darkfriend? I'm sixteen! I'm just looking for my friend! | `[frustrated] Darkfriend? I'm sixteen! I'm just looking for my friend!` | DYLO | `QVywTynhV4rdjqccSnio` | 56k | `ec694ced7a7ce704…` |
| `riley_st2_stable_01` | Hound Trollocs? The Fade left guards behind! | `[surprised] Hound Trollocs? The Fade left guards behind!` | DYLO | `LS3pY9VWjsnF6uQHOVMZ` | 56k | `825cf57fc29af08e…` |
| `riley_ribbon_01` | Twinkle Toes' ribbon! I'm getting closer. | `[excited] Twinkle Toes' ribbon! I'm getting closer.` | DYLO | `mZa9iB1d20fEX6RTG3oR` | 56k | `ef393d6e4adca2d4…` |
| `riley_mud_01` | Try cold water! | `[sarcastic] Try cold water!` | DYLO | `bnlbgpolJpbAZxRThRUj` | 64k | `61bf1df0aed48eaf…` |
| `riley_st2_victory_01` | I'm NOT a Darkfriend! ...And your barn is on fire! | `[sarcastic] I'm NOT a Darkfriend! ...And your barn is on fire!` | DYLO | `hb7Pgy8mwI0SN1CfFo5w` | 56k | `9a54abd207b85863…` |
| `riley_st2_clear_01` | The trail keeps going. Hang on, Twinkle Toes. I am coming. | `[determined] The trail keeps going. Hang on, Twinkle Toes. I am coming.` | DYLO | `UVWwifqCoX6gUv4NTwS8` | 56k | `ed5d28c6f2df54d0…` |
| `st3_story_03` | Twinkle Toes' ribbon. He's here. | `[serious] Twinkle Toes' ribbon. He's here.` | DYLO | `VB5azp7UkRZOEb7USAWV` | 64k | `d6b4bf39a6d62e70…` |
| `st3_story_05` | I always do. | `[cocky] I always do.` | DYLO | `BYaovaM7DnnhxJlPxXmq` | 64k | `46c457729035a0d1…` |
| `riley_escape_01` | Off me! | `[shouting] Off me!` | DYLO | `6Zu7oDHrS8nsJ6VRGpUN` | 64k | `18eef3fa8061afd0…` |
| `riley_st3_roof_01` | Roof tiles. Great. Of course it's roof tiles. | `[sarcastic] Roof tiles. Great. Of course it's roof tiles.` | DYLO | `6RDXjrEjjUi9uR7GoNgx` | 64k | `2ca547c71647360c…` |
| `riley_st3_glimpse_01` | There! On the far roof! | `[shouting] There! On the far roof!` | DYLO | `MDwnPUpPXuAjBeicyEgW` | 64k | `035e19a3fd46fb0e…` |
| `riley_counter_01` | That one! | `[shouting] That one!` | DYLO | `nO49qKVKvLGZX2UGHfED` | 64k | `b601577ed4f3eb32…` |
| `riley_st3_victory_01` | Remember this, then. | `[serious] Remember this, then.` | DYLO | `saL3N9A9mgVBBjEH0J2j` | 64k | `6f1ab75af7c064df…` |
| `riley_st3_clear_01` | Another ribbon. I'm coming, Twinkle Toes. | `[determined] Another ribbon. I'm coming, Twinkle Toes.` | DYLO | `v9dCI0aqa7p1W9nFllsj` | 64k | `24a72ff43596f083…` |
| `st4_story_02` | Aridhol. Moiraine said never go in. | `[serious] Air-ih-dol. Mwah-rain said never go in.` | DYLO | `TY4ISB4kXG8kj2LKiod4` | 64k | `b974632a6d476966…` |
| `st4_story_03` | He went in. | `[serious] He went in.` | DYLO | `0aSDjSWSnP0rU5Pbx6uH` | 64k | `ab58ce23a06fab4b…` |
| `st4_clear_01` | The trail goes underground. A Waygate. | `[serious] The trail goes underground. A Waygate.` | DYLO | `B6myYgrq3YVEyS3nVe3B` | 64k | `c131ecbfc4ae12d2…` |
| `st4_clear_03` | Then show me how. | `[determined] Then show me how.` | DYLO | `BFTyx0ik1gapGOs6k1AT` | 64k | `f479bac9f00ca29e…` |
| `riley_fog_01` | Don't touch the fog. | `[serious] Don't touch the fog.` | DYLO | `PgLvHJ8rq01TxjASByi7` | 64k | `62baa84e0ac05240…` |
| `riley_fog_off_01` | Off me! | `[shouting] Off me!` | DYLO | `nty5zeulzk1gQT4CXjj3` | 64k | `592acede4d748a11…` |
| `riley_fog_off_02` | Not today! | `[cocky] Not today!` | DYLO | `6UZPmIXvs0jR6C0GWdPS` | 64k | `b1358c7758d8d252…` |
| `riley_tower_01` | That tower's coming down! | `[shouting] That tower's coming down!` | DYLO | `QXxvrWFQdoOaIAu2pboL` | 64k | `ae39eb439483717e…` |
| `riley_bridge_01` | There, on the bridge! | `[shouting] There, on the bridge!` | DYLO | `VD9AGzsETIIHQcMrJ9zS` | 64k | `0b5e6301bf83bc8c…` |
| `riley_light_01` | Light it up. | `[cocky] Light it up.` | DYLO | `rVD1iGpjbZHJbiqglFlf` | 64k | `869034bf7daabb84…` |
| `riley_st4_victory_01` | Sing to the ash. | `[serious] Sing to the ash.` | DYLO | `LjnrE5ZhqasYcKEQZi7Z` | 64k | `1720e6b5dacdd111…` |
