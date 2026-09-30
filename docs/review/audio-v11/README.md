# Riley Wheel Brawl 1.1 audio evidence

Baseline: `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc` (live 1.0).

## Measured asset coverage

The fresh audit decodes every shipped voice MP3 and matches every file to its exact game-catalogue ID and text. No file is excluded because it belongs to the older narrator/villain cast.

| Speaker | Clips |
| --- | ---: |
| Riley | 30 |
| Twinkle Toes | 8 |
| Moiraine | 10 |
| Loial | 2 |
| Be'lal | 4 |
| Narrator | 5 |
| Mazrim Taim | 6 |
| Fade | 4 |
| Draghkar | 4 |
| Trolloc chieftain | 3 |
| Trolloc | 1 |
| Darkfriend | 1 |
| Stone guard | 1 |
| Turned Asha'man | 1 |
| **Total** | **80** |

- 1,392,640 voice bytes; all unchanged from the baseline
- All decode, exceed the 0.25-second placeholder cutoff, and contain signal
- All mono, 24 kHz MP3; zero clipped decoded PCM samples
- Raw loudness −17.69 to −16.40 LUFS (1.29 LU spread); peak ≤ −1.11 dBTP
- Runtime trims −0.60 to +0.69 dB target −17 LUFS; calibrated peak ≤ −1.09 dBTP
- [Machine-readable full inventory](voice-audit.json), including exact file hashes, time lengths, PCM silence boundaries, codec, peaks, levels, text and names to listen for

The trims are scalar per-clip gains; the approved files are never re-encoded. This does not certify peak levels of all SFX, voice and music mixed together.

## Listening gate and auditions

[Open the full audition list](auditions.html) while serving the repository root. Every shipped line has its own play control and pending/pass/revise field. Only one audition player can run at once. It plays the original source level and displays the small game gain trim. Notes are local to the browser and can be exported.

**No auditory review was performed.** Feeding an actual MP3 to the available tool returned “audio content omitted because you do not support audio input”. No numeric analysis is described as listening. Performance naturalness, name pronunciation, consonant endings, and character intent still need an actual listening review. Previously approved 1.0 casting is preserved.

Name/word checks are based on catalogue text, not asserted audible errors: Riley, Twinkle Toes, Winternight, Emond's Field, Caemlyn, Andor, Shadar Logoth, Mashadar, Tear, Callandor, Loial, Saidin, Asha'man, M'Hael and Balefire. See each matching row in the audition inventory. No “robotic” or incorrect-name verdict has been fabricated.

Kokoro, Torch, speech-recognition runtimes and cached model weights are absent in this executor. Because no audible defect can be verified, there was no blind regeneration or unneeded model installation. No paid service was used.

## Runtime changes

1. Speech and impact music ducking use independent gain nodes. A short impact can no longer release a long spoken sentence's duck early
2. Scene skips release the speech duck in 120 ms; natural endings retain the 450 ms recovery
3. First visible scene-frame markers gate new music work; stale markers are ignored and the existing shared theme remains continuous
4. Every delivered line receives its independently measured loudness gain
5. An explicit clip volume of zero remains zero (the old `|| 1` fallback incorrectly converted zero to full level)

## Verification

Completed locally:

- `python3 tools/audio/audit-voices.py`: all 80 independently decoded; zero objective flags after playback calibration
- `node tools/audio/voice-audit-check.cjs`: full catalogue/files/hash/format/signal/loudness/headroom coverage
- `node tools/audio/audio-clock-check.cjs`: 15 deterministic modeled scheduling and gain tests
- `node tools/voice-assets-check.cjs`: original 54 approved-asset hash checks and Loial one-shot triggers
- `node tools/utility-voice-check.cjs`: existing utility trigger checks, unchanged

The modeled clock test checks pre-frame silence/no music requests, stale markers, continuous shared music, reuse after stop, independent impact/speech envelopes, stop-before-replacement, protected non-overlap, natural completion, scene-skip release, zero gain and calibrated gain. It is a scheduling model, **not** a browser or audition pass.

Browser gates prepared for a permitted Chromium environment:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tools/audio/audio-mix-check.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/voice-sequence-check.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/audio-check.cjs
```

Local Chromium launch failed before the page loaded with `socket() failed: Operation not permitted`, including an approved escalated launch. Further shell socket attempts were stopped. Do not label the browser gates passed based on the modeled test. Existing acceptance thresholds and existing tests have not been loosened.
