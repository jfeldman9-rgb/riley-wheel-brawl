# Stage 8 music brief (Suno)

Both Stage 8 tracks are new Suno songs generated in Jason's Suno Pro account (`jfeldman9497`, public
profile `jfeldman9`) on Suno **v6 Pro**, 2026-10-19, from the STAGE8-PLAN §6 prompts. Four takes of each were
made; Jason picked **A1** (stage) and **B1** (boss) by ear. No existing recording was used as a Cover,
Persona, Inspo, audio reference or remix source.

| Id | Take | Song | Public style tags | Length |
| --- | --- | --- | --- | --- |
| `stage8` | A1 | "Ashaman Kill - Dumais Wells" https://suno.com/song/e99b6b16-7d6d-4847-9fe5-ad50535eeaea | Nordic folk metal, cinematic, battle-chant | 2:00 |
| `boss8` | B1 | "Queen of Love and Beauty" (instrumental) https://suno.com/song/46be44f1-186c-40a6-aad2-1c98c5f51292 | folk metal, symphonic | 2:19 |

The full style prompts are the ones written in `docs/STAGE8-PLAN.md` §6 (stage: nordic folk metal war chant,
120 bpm, D minor, ...; boss: dark symphonic folk metal, 140 bpm, E minor, wordless). Suno's public page shows
only the short tags above.

## Stage lyric box (as stored in the A1 download's `lyrics-eng` tag)

```
[Intro: low drone, frame drum heartbeat]
[Chant - deep male choir]
Hey! Ha! Hey! Ha!
[Verse - half-spoken, throat singing]
Black coats on the ridge, and the grass is burning
Three stone wells, and the Wheel is turning
[Pre-chorus - choir rising]
Seize the fire! Break the earth!
[Chorus - gang shout, huge]
AH-shah-mahn, KILL! AH-shah-mahn, KILL!
[Post-chorus - female kulning call, wordless]
[Bridge - drums only, then choir]
Hey! Ha! The Dragon calls.
[Final chorus]
AH-shah-mahn, KILL!
```

The boss take is instrumental (no lyrics).

## Measured tempo and the loop windows

Suno did not hold the requested tempos, so the loops follow each take's own grid (onset autocorrelation
over 10-20 s windows plus a librosa beat grid; downbeats from low-band onsets and chroma changes).

| Id | Requested | Measured | Loop window in the take | Loop | Notes |
| --- | --- | --- | --- | --- | --- |
| `stage8` | 120 BPM, 30 bars = 60.000 s | ~124.9 BPM 4/4 (drifts ~122 -> 125.5 through the intro, steady after ~50 s) | 33.07 s -> 94.56 s | 32 bars = **61.492 s** | Starts on the verse downbeat ("Black coats..."), holds all three "Asha'man, kill!" choruses (take times 45.2, 72.1, 93.1 s = 12 s, 39 s and 60 s into the loop) and ends on the last "kill!", which falls back into the verse. Lowest-novelty seam of all 112/128/144-beat candidates (10.8th percentile of the loop's own 1 s spectral change). |
| `boss8` | 140 BPM, 40 bars = 68.571 s | **184 BPM in 3/4** (every 10 s window 183.9-184.2) | 20.70 s -> 87.22 s | 204 beats = 68 bars = **66.517 s** | Starts on a downbeat; best mel-spectrum match of any 60-76 s whole-bar window. The loud full-band section (take 44-58 s) and the later build sit inside the loop. |

Because one stage loop is now 61.49 s rather than 60.000 s, the volley cycle and the song no longer share an
exact pulse; the game never syncs to audio time (Stage 7 §10), so nothing in gameplay depends on it.

Render: `python3 tools/stage8/loop_music.py RAW_DIR OUT_DIR` with the two downloads saved as
`stage8_raw.mp3` / `boss8_raw.mp3` (not shipped), then `python3 tools/music/check_loops.py OUT_DIR`.
Results are in `tools/stage8/music-manifest.json`.
