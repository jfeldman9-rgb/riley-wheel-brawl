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
