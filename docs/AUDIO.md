# Version 1.1 audio polish (2026-09-30)

## Delivered changes

- Independently decoded **all 80 shipped voice clips**, not only the 54 Kokoro clips. Every file is catalogued, mono 24 kHz MP3, longer than the 0.25-second placeholder cutoff, and contains signal. No clipped PCM samples were found. Total voice assets: **1,392,640 bytes**.
- Measured source loudness spans **−17.69 to −16.40 LUFS**; maximum source true peak is **−1.11 dBTP**. Small per-line runtime gain trims in `js/voices.js` bring every clip to **−17 LUFS**, retaining at least **1.09 dB true-peak headroom**. The gain range is −0.60 to +0.69 dB. These are per-voice-bus input measurements, not a claim about peak levels of all mixed game sounds together.
- **Every MP3 remains byte-identical to release 1.0.** No speech was synthesized, cloned, rerecorded, pitch-shifted, or re-encoded. Small runtime trims preserve the previously approved stock cast and delivery.
- Speech has a dedicated music-duck stage. The former shared envelope allowed a short, deep impact to replace a longer voice's duck and restore music mid-sentence. Speech now holds music at 42% for its full decoded length plus a 0.45-second recovery; effects can add their own independent dip. Scene skips release the speech dip in 0.12 seconds.
- New music fetch/decode/start work waits for the matching scene's first visible frame via `audio.markFirstVisibleFrame(scene.music)`. Stale scene markers do nothing. The already-playing shared theme remains seamless across scenes, and browser gesture unlocking still applies.
- Recorded voices remain single-source: an allowed replacement stops its predecessor before starting, and protected speech preserves natural decoded endings and request order. Existing cue timing, gameplay, cast, text, and art are unchanged.

## Full inventory and auditions

- [All 80 audition players and listening notes](review/audio-v11/auditions.html)
- [Independent per-file decoded measurements, hashes, gain trims and name-review terms](review/audio-v11/voice-audit.json)
- [Validation evidence and remaining review gate](review/audio-v11/README.md)

The audition page plays the original files at their original level, lists each game's gain adjustment, allows only one player at a time, and can export listening notes. There are no new or regenerated spoken lines. All 80 runtime-adjusted lines are present in the audition list.

**Auditory review remains unperformed.** This execution environment explicitly cannot receive audio input; numeric waveform checks cannot certify naturalness, pronunciation, vocal age, or emotional delivery. No clip is labeled listened-to or performance-approved by this 1.1 pass. The existing 1.0 cast approval still stands. Fantasy names and potentially ambiguous words are flagged for listening in the inventory rather than asserted incorrect. Kokoro/its model weights are absent here; there is no verified performance defect that would justify blind regeneration or a new download.

## Reproduce

```sh
python3 tools/audio/audit-voices.py
node tools/audio/voice-audit-check.cjs
node tools/audio/audio-clock-check.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/audio/audio-mix-check.cjs
node tools/voice-assets-check.cjs
node tools/utility-voice-check.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/voice-sequence-check.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/audio-check.cjs
```

The fresh audit requires Python + NumPy + ffmpeg/ffprobe. The checked-in JSON can be validated without those packages. The modeled clock test explicitly does **not** substitute for the real Chromium tests. Existing tests/thresholds are unchanged. A replacement family recording should be re-audited and have its corresponding gain trim refreshed.

---

# Approved character cast (20260930-release1)

Jason approved all five auditions on September 30, 2026. The release contains 54 new Kokoro clips: Riley 30, Twinkle Toes 8, Moiraine 10, Loial 2, and male Be'lal 4. This supersedes the older recording-only restriction below. These are original stock-voice character performances, not real-person clones.

The three escape lines are included. Loial answers one second after Riley calls and speaks once again near the end of his charge. Moiraine's story/heal/taint clips use the existing triggers. The Riley/Twinkle stable filename scheme and optional family-recording support remain intact. Round 2 wires seven formerly missing utility/tutorial triggers with once-per-context guards, six-second spacing and no delayed chatter queue. The eighth, “Up you go!”, is explicitly retired because this build has no separate launcher; its approved clip is retained. See the recording list and `docs/VOICE_LINES.md`.

Assets are mono 24 kHz MP3 at 96 kbps, 943,848 bytes total. Each file exceeds the 0.25-second placeholder cutoff, decodes, has audible signal and true-peak headroom. Exact hashes, text, loudness, pronunciation and casting: [voice manifest](../assets/audio/voice-manifest.json). Sources/license: [provenance](../assets/audio/VOICE_PROVENANCE.md) and [Apache-2.0](../assets/audio/LICENSE-KOKORO.txt). Existing music, narrator, Taim, Fade, Draghkar and mook clips are unchanged.

Story, super, joint-finale and boss-defeat/win speech use an ordered protected queue with actual decoded clip endings. Incidental barks are dropped during important speech; they do not form a backlog. Scene skips/reset cancel queued speech. The post-combat transition waits only while audio can actually play; suspended, muted, unavailable and zero-volume audio cannot trap it. `tools/voice-sequence-check.cjs` verifies actual browser playback. `tools/voice-clock-adapter.cjs` is a separately labeled local duration-based fallback, not a browser substitute.

`tools/voice-assets-check.cjs` verifies the delivered bytes against the independently decoded masters, covers the full approved cast, and verifies Loial one-shot triggers. `audio-check.cjs` continues to test placeholder rejection using an explicit silent route fixture now that the shipped Balefire line is voiced; no threshold or assertion was weakened.

---

# Historical audio implementation

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
- Loading: a story card loads its own lines when it is built; a stage queues its lines 1.2 s after the enter and loads them one at a time (40 ms apart), so voices never add to the cold enter or land as a burst mid-fight.
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

`node tools/audio-check.cjs [url] [--shot=file.png]` (Playwright; honours `CHROMIUM_PATH`): silent before a gesture, first key starts the track, loop points, M off/on + saved, narrator line on the Caemlyn card, Taim's entrance line, five fresh-page cold enters with music playing, three 10 s fights with music on, a stand-in dropped-in kid clip playing while the silent placeholder is ignored, and no script errors, console errors or failed requests. Pass line for fights is ~60 fps with no frame over 34 ms; the output also lists single missed vsyncs (`over33`), which this shared headless box shows with or without audio. Works against a raw.githack.com preview too (it presses githack's one-time "Open the page" notice).
