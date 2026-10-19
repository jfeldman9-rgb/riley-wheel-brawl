# Stage 8 assets still needed

All delivered images are used unchanged. Human audio/video production remains open. The absent opening clip now falls back to a paused Rand-in-box panel (`story8p2`) with the registered Rand/Lews captions, including demo mode; if the panel cannot load, the held caption deck remains.

## Voices

Delivered 2026-10-19: all 65 lines are in `assets/audio/voice/` and listed in `src/stage8-voice-files.js` (Jason F approved every take by ear, including Twinkle Toes and Lanfear). Cast, prompts, hashes and Whisper checks are in `tools/stage8/voice-render.json`; provenance is in `assets/audio/AUDIO_PROVENANCE.md`.

## Music

- `assets/audio/music-stage8.mp3`: new 120 BPM, 60-second loop; shipped stage5 music fallback.
- `assets/audio/music-boss8.mp3`: new 140 BPM, 68.571-second loop; shipped boss6 music fallback.
- Credits reuse `assets/audio/music-main.mp3`.

## Clips

- `assets/cutscenes/stage8/intro.mp4`: absent; panels story8p1, story8p2, story8p3, story8p4.
- `assets/cutscenes/stage8/taim.mp4`: absent; in-engine action and captions.
- `assets/cutscenes/stage8/circle.mp4`: absent; in-engine action and captions.
- `assets/cutscenes/stage8/link.mp4`: absent; panels story8c1, story8c2.
- `assets/cutscenes/stage8/finale.mp4`: absent; panels story8f1, story8f2, story8f3, story8f4.
- `assets/cutscenes/stage8/wolves.mp4`: absent; in-engine action and captions.
- `assets/cutscenes/call8/M1.mp4`: absent; Mat’s in-engine strike and captions.
- `assets/cutscenes/call8/M2.mp4`: absent; Mat’s in-engine strike and captions.
- `assets/cutscenes/call8/M3.mp4`: absent; Mat’s in-engine strike and captions.

Register clips only after Jason signs off on likeness and depiction, with a 4 fps review log. Flow order: V5.3, V3.1, V5.2, V1.2, V5.4.

Implementation update: all 58 delivered images and 14 atlas files are wired unchanged, with Taim idle 0 (alias 5), arrival 3, and native drawScale 1. No additional art is requested by this code pass. The updated foreground can use its rounded cap directly; a soft alpha fade remains.

Music fallback now selects the shipped `stage5` / `boss6` tracks without requesting absent files. After the two new music files are delivered and their loops validated, set the corresponding `MUSIC8_PRESENT` flags in `src/stage8-audio.js`. The reserved MUSIC URLs remain `assets/audio/music-stage8.mp3` and `assets/audio/music-boss8.mp3`.

The full finale video would repeat the scream already delivered by the playable P4 clash. That path stays on panels after P4 until a reviewed continuation cut is supplied. Finale fallback lines 4–5 play during the playable sassy walk, once. All other missing video beats use panels or in-engine captions; voices remain caption-only via the empty voice-file manifest. No audio or video was generated.
