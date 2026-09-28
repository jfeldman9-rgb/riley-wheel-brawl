# Audio: music and voices (20260927-audio1)

## Music

- Source: Jason's Suno track (Opus in m4a, 2:45.92, 48 kHz stereo).
- Files: `assets/audio/music-main.ogg` (Vorbis q3, ~106 kbps, 2.1 MB) and `assets/audio/music-main.mp3` (128 kbps, 2.5 MB), both 159.10 s. Built by `tools/make-music-loop.py`.
- Loop: the intro plays once, then `[31.103 s, 159.103 s)` loops sample-exactly (128.0 s = 76 bars at ~143.5 BPM). The track's hard ending (~164.4 s) is cut. The last 2 bars before the loop end are equal-power crossfaded into the 2 bars that lead into the loop start, so the jump back is seamless. The points came from a beat-synchronous chroma+MFCC similarity search, phrase aligned, then refined by waveform correlation.
- Playback (`js/audio.js`, `defineTrack` / `aliasTrack`): `AudioBufferSourceNode` with `loopStart` / `loopEnd`, into a track gain of 0.35 x the MUSIC level, then the existing duck stage and master. SFX stay on their compressor bus at full level. Title, story cards and all five stages share the one track, so it keeps playing across scene changes. Game over keeps the old procedural sting.
- Lazy load: nothing is fetched at page load. The title asks for the track; before the first gesture the fetch waits 1.5 s, then downloads and decodes in the background. Browsers only allow sound after a gesture: the first key, click or tap resumes the context and starts the music. Picks Ogg where the browser supports it, else MP3.
- Ducking: voice clips duck the music to 42% for the length of the line plus a 0.45 s release. Big impacts, stingers and the pause menu still duck as before.
- Toggle: **M** turns music on/off any time (restores the chosen level and resumes where it stopped). **N** now mutes everything (it used to be M). The MUSIC row in Options (title and pause menu) still cycles 100 / 70 / 40 / OFF. Saved in `localStorage['rwb-settings'].music`.

## Voices

- Line table: `js/voices.js` (new lines, speakers, trigger points, file names). Existing lines stay in `js/campaign.js`. Every line's text is in `docs/VOICE_LINES.md` (checked by `tools/check.cjs`).
- Villains and narrator: generated with the free edge-tts neural voices by `tools/make-voices.py`, then a character effect, silence trim, loudness normalized to about -16 LUFS (true peak <= -1.5 dBTP), mono 24 kHz 48 kbps MP3. 30 clips, 564 KB total.
- Riley and Twinkle Toes: never generated. `assets/audio/voice/RECORDING_LIST.md` lists every line with the file name the game looks for. Each of those 36 names ships as a 216-byte silent placeholder, so the static host never answers 404. Dropping a real `riley_<id>.mp3` / `tt_<id>.mp3` over the placeholder is enough: when a stage or story card starts, the game loads that stage's kid lines (once per session) and plays any clip 0.25 s or longer; shorter clips count as not recorded and fall back to the chirp and the bubble/subtitle. `node tools/recording-list.cjs` rewrites the list and recreates any missing placeholder (it never overwrites a recording). GitHub Pages caches files for about 10 minutes, so a new recording can take that long to reach someone who already played.
- Loading: a story card loads its own lines when it is built; a stage loads its lines 1.2 s after the enter, so voices never add to the cold enter.
- One voice at a time: a new line cuts the previous one. Voice clips have their own bus (no SFX compressor pumping).
- Subtitles: story cards show the caption (narrator lines wrap to 2 rows); boss entrances, mook entrances and the rescue use the bottom subtitle; barks (boss half-health, boss defeat, Riley's big hit / boss win / FIRE / Balefire / Loial call) show a speech bubble over the speaker. Bubbles are drawing only and never touch the subtitle queue, so fight timing and saves are unchanged.

### Trigger points

| Trigger | Line(s) |
| --- | --- |
| Stage intro card | `st1..st5_narrator_01` (narrator), then the existing story lines (Riley's intro quips `st1..st5_riley_01`) |
| Boss entrance | chieftain `trolloc_heavy_intro_01`; Fade `fade_intro_01` + `st2_fade_01`; Draghkar `draghkar_intro_01` + `st3_draghkar_01`; Be'lal `forsaken_intro_01`; Taim `taim_phase_01` |
| Boss half health | `chieftain_mid_01`, `fade_mid_01`, `draghkar_mid_01`, `belal_mid_01`; Taim `taim_phase_02` (shield break) |
| Boss defeat | `*_defeat_01`; then 2.2 s later Riley's boss win (`riley_victory_01/02`, `riley_bosswin_05`). Boss clears now hold 3.6 s (was 1.4 s) so both lines land. |
| Special moves | `riley_super_01` (Balefire), `riley_fire_01` (first FIRE per stage), `riley_callandor_01` |
| Big hit | `riley_bighit_01/02` on a knockdown, alternating, at most every 20 s |
| Twinkle Toes rescue | `taim_phase_03`, `st5_kenzie_03`, `st5_kenzie_01` (joint finish unlocks when `st5_kenzie_03` shows, the same moment as before), `st5_riley_02` + `st5_kenzie_02` |

### Generated voices

| Character | Voice | Settings / effect |
| --- | --- | --- |
| Narrator | en-GB-RyanNeural | rate -10%, pitch -3 Hz, soft hall |
| Mazrim Taim | en-US-ChristopherNeural | rate -12%, pitch -14 Hz, bass lift + short echo |
| Trolloc Chieftain | en-US-GuyNeural | pitched down 16% (tempo kept), bass lift |
| Myrddraal (Fade) | en-GB-ThomasNeural | rate -22%, pitch -8 Hz, cold echo |
| Draghkar | en-IE-ConnorNeural | rate -15%, pitch +4 Hz, flanger + echo |
| Be'lal (woman) | en-GB-SoniaNeural | rate -8%, pitch -4 Hz, regal hall |
| Trolloc | en-US-RogerNeural | pitched down 16% |
| Darkfriend | en-US-BrianNeural | rate +4%, small room |
| Stone guard | en-US-SteffanNeural | rate -6%, pitch -6 Hz, hall |
| Turned Asha'man | en-CA-LiamNeural | rate -6%, pitch -7 Hz, cold echo |

Moiraine and Loial are unchanged (subtitle + chirp).

## Checks

`node tools/audio-check.cjs [url] [--shot=file.png]` (Playwright; honours `CHROMIUM_PATH`): silent before a gesture, first key starts the track, loop points, M off/on + saved, narrator line on the Caemlyn card, Taim's entrance line, five fresh-page cold enters with music playing, three 10 s fights with music on, and no script/console errors apart from the kid-line probes.
