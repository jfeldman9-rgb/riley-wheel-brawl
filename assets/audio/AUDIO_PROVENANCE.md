# Audio provenance (music)

Every music file shipped in `assets/audio/` is listed here with its source and licence. No paid service, no
copyrighted or unlicensed material, and no AI music service other than the theme Jason supplied for 1.1.

## Stage 1 theme (unchanged file)

| File | Source | Licence / rights |
| --- | --- | --- |
| `music-main.mp3` (159.10 s, 128 kbps) | Jason's Suno track, supplied for Riley Wheel Brawl 1.1. Documented in `docs/AUDIO.md` at tag `v1.1-live-8a17bcd` ("Source: Jason's Suno track (Opus in m4a, 2:45.92, 48 kHz stereo)"), built into a loop by 1.1's `tools/make-music-loop.py`. | Jason's own track, used with his permission as in 1.1. |

In 1.1 the intro played once and `[31.103 s, 159.103 s)` looped (the last 2 bars are crossfaded into the loop start inside the file).
2.0 had been looping the whole file with `<audio loop>`, so the 31 s intro replayed every 2:39. From Stage 2 on, the element
jumps back exactly 128.000 s (one loop) inside that baked crossfade, which restores the 1.1 loop. The file is streamed rather
than decoded, because 159 s of decoded stereo PCM is about 56 MB, too much for an iPad.

## New tracks (Stage 2 work): original compositions, written in code

| File | Id | Title / mood | BPM | Bars | Loop length | Loop region in file | Loudness | Size |
| --- | --- | --- | ---: | ---: | --- | --- | --- | ---: |
| `music-title.mp3` | title | "The Wheel Turns" - title / menu / story-card theme. D dorian, gentle and heroic. 16 bars @ 84 bpm. | 84 | 16 | 45.71 s | [0.250, 45.964) s | -17.0 LUFS / -4.7 dBFS | 632 KB |
| `music-boss1.mp3` | boss1 | "Chieftain's Fury" - Stage 1 boss. E minor, driving war drums, low string ostinato, brass and choir. 24 bars @ 150 bpm. | 150 | 24 | 38.40 s | [0.250, 38.650) s | -15.2 LUFS / -1.6 dBFS | 532 KB |
| `music-stage2.mp3` | stage2 | "Baerlon in the Rain" - Stage 2. A minor, tense and wet: pizzicato ostinato, low cello, fiddle and oboe, | 104 | 28 | 64.62 s | [0.250, 64.865) s | -16.0 LUFS / -2.7 dBFS | 891 KB |
| `music-boss2.mp3` | boss2 | "Child of the Light" - Stage 2 boss (Jaret Byar). D minor, zealous and martial: military snare, minor fanfare, | 138 | 32 | 55.65 s | [0.250, 55.902) s | -15.2 LUFS / -1.9 dBFS | 768 KB |

- **Composition:** original music written note by note in `tools/music/compose.py` for this project (melodies, harmony, bass,
  drum patterns are all authored there; nothing is sampled, quoted or imitated from existing songs). Copyright: Riley Wheel
  Brawl project; free to use in this game.
- **Rendering:** MIDI written with `midiutil` (MIT licence), rendered offline with FluidSynth 2.4.4 (LGPL-2.1, used as a
  tool, not shipped) using the **FluidR3_GM** General MIDI SoundFont by Frank Wen (Debian package `fluid-soundfont-gm`,
  **MIT licence**; its Debian copyright file quotes the author: "I hereby release Fluid under the MIT license"). Audio rendered from a SoundFont belongs to whoever
  wrote the notes; the MIT licence puts no restriction on the rendered output.
- **Seamless loops:** each score is rendered three times back to back and the middle copy is kept, so reverb tails and
  sustained notes from the end of the loop are already sounding at its start. A 40 ms equal-power blend joins the last
  samples to the audio that preceded the kept copy, a loop-circular limiter (three copies through `alimiter`, middle kept)
  controls peaks, and each file carries 0.25 s of the loop on both sides of `[loopStart, loopEnd)` so any small MP3 decoder
  offset still loops cleanly. The game loops them sample-accurately with `AudioBufferSourceNode.loopStart/loopEnd`.
  `python3 tools/music/check_loops.py <dir>` verifies the seam (jump at the loop point no bigger than the track's own
  99.9th-percentile sample step, and >= 0.98 correlation across the overlap).
- **Size and memory (iPad):** 112 kbps MP3, 0.5–0.9 MB each, fetched only when first needed. At most two decoded at once
  (the outgoing and incoming track during a crossfade, about 13–23 MB each); others are released.
- **Reproduce:** `python3 tools/music/compose.py <out_dir>` (needs fluidsynth, fluid-soundfont-gm, midiutil, ffmpeg).
  Exact loop points and loudness: `tools/music/music-manifest.json`.

## Mix

- Music bus 0.34 (unchanged; the SFX mix was tuned against the Stage 1 theme). Per-track gain matches the new loops to the
  Stage 1 theme (title 1.0 at -17 LUFS is deliberately softer, boss tracks 0.94 at -15.2 LUFS, Stage 2 1.0 at -16 LUFS,
  Stage 1 theme -15.7 LUFS).
- Voice lines still duck music to 45% while they play; heavy hits and booms duck briefly as before.
- Crossfades (equal-power): stage -> boss 1.2 s, into a cutscene 1.0 s, back from a cutscene 1.4 s (resuming where the fight
  music stopped), to the title/menu theme 2.0 s, victory fade-out 2.5 s, game over 1.5 s. Logic: `src/music.js`.
- Stage 2 rain ambience is procedural (filtered noise generated in the browser), no file.

## Voices

See `VOICE_PROVENANCE.md` (Kokoro-82M, Apache-2.0).

## Stage 3 Music

Original loops rendered via `tools/music/compose.py` using FluidSynth + FluidR3_GM SoundFont:
- `music-stage3.mp3`: "Caemlyn at Dusk" (Stage 3). Warm afternoon city ambiance turning to dusk (nylon guitar, strings, flute, oboe, walking cello, light tambourine). 28 bars @ 104 bpm, target -16.0 LUFS.
- `music-boss3.mp3`: "Shadow in the Garden" (Stage 3 boss: The Myrddraal). Cold, low strings and choir, sparse percussion, oboe melody. 28 bars @ 126 bpm, target -15.2 LUFS.
Both tracks are under 1.2 MB, verified seamless by `tools/music/check_loops.py` with loopStart at 0.25 s.

## Stage 4 Music

Original loops rendered the same way (FluidSynth + FluidR3_GM), looped in `src/audio.js`:
- `music-stage4.mp3`: "Shadar Logoth". E phrygian, hollow and slow. 16 bars @ 96 bpm, -16.0 LUFS, loop [0.250, 40.250) s.
- `music-boss4.mp3`: "The Draghkar's Croon". A minor pulse under a high line. 16 bars @ 126 bpm, -15.2 LUFS, loop [0.250, 30.726) s.
Both are under 1.2 MB. Loop points are in `tools/music/music-manifest.json`. Stage 4 voice lines are in `assets/audio/stage4-voice-manifest.json`.
