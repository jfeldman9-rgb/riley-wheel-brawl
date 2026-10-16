# Stage 7 painted assets and remaining media

All 33 painted assets below now ship with their JSON metadata. Deterministic canvas art in `src/stage7-paint.js` remains available for missing or failed loads; the gallery at [stage7/evidence/fallback-art.png](stage7/evidence/fallback-art.png) shows those fallbacks. Voice, music and video still need the production passes listed below. No generated video is shipped. Riley is shown only from behind in every story panel.

## Painted art

Every row is **shipped and wired**. Paths are the loader contract. Atlas fighters are drawn without normals; keep the combined painted resident set within 12 MiB and measured total source textures within 105 MiB. `tools/stage7/process_art.py --write-status` validates available file/decoded caps and generates `src/stage7-painted.js` plus `assets/stage7/ART_STATUS.json`. `--build --src …` reuses the Stage 6 processor for pose sheets, backgrounds and panels; props/portraits accept reviewed final exports. Pose index order must match the runtime animation states before enabling a replacement.

| Key | Painted art | Destination | Missing-file fallback |
|---|---|---|---|
| `s7dancer` | Shaido spear-dancer, 13 poses; kneeling yield | `assets/stage7/chars/s7dancer.webp` | Eight-cell geometric figure sheet |
| `s7veiled` | Veiled archer, 11 poses; kneeling yield | `assets/stage7/chars/s7veiled.webp` | Eight-cell geometric figure sheet |
| `s7asmo` | Asmodean with harp/access key, 17 poses; bound defeat | `assets/stage7/chars/s7asmo.webp` | Eight-cell geometric figure sheet |
| `s7moir` | Moiraine, 5 casting poses | `assets/stage7/chars/s7moir.webp` | Eight-cell geometric figure sheet |
| `s7lan` | Lan, 7 dash/slash/point poses | `assets/stage7/chars/s7lan.webp` | Eight-cell geometric figure sheet |
| `s7note` | Normal/gold harp notes and bursts | `assets/stage7/props/s7note.webp` | Code-drawn shape/gradient effect |
| `s7column` | Glass column, three glow states | `assets/stage7/props/s7column.webp` | Code-drawn shape/gradient effect |
| `s7shard` | Four shards/grit variants | `assets/stage7/props/s7shard.webp` | Code-drawn shape/gradient effect |
| `s7earth` | Six 128×128 cells: crack, grow1–3, full spike, crumble | `assets/stage7/props/s7earth.webp` | Code-drawn shape/gradient effect |
| `s7shield` | Two blue shield-ring states | `assets/stage7/props/s7shield.webp` | Code-drawn shape/gradient effect |
| `s7dust` | Tiling sandstorm overlay | `assets/stage7/props/s7dust.webp` | Code-drawn shape/gradient effect |
| `s7ring` | Two waking-street shimmer states | `assets/stage7/props/s7ring.webp` | Code-drawn shape/gradient effect |
| `s7portal` | Portal Stone glow | `assets/stage7/props/s7portal.webp` | Code-drawn shape/gradient effect |
| `s7crate` | Woven Aiel basket | `assets/stage7/props/s7crate.webp` | Code-drawn shape/gradient effect |
| `s7planks` | Basket shreds | `assets/stage7/props/s7planks.webp` | Code-drawn shape/gradient effect |
| `s7ribbon` | Twinkle Toes’ ribbon | `assets/stage7/props/s7ribbon.webp` | Code-drawn shape/gradient effect |
| `s7arrow` | Veiled archer arrow | `assets/stage7/props/s7arrow.webp` | Code-drawn shape/gradient effect |
| `s7veil` | Fog curtain | `assets/stage7/props/s7veil.webp` | Code-drawn shape/gradient effect |
| `s7streak` | White slash and hazard-band streak | `assets/stage7/props/s7streak.webp` | Code-drawn shape/gradient effect |
| `moiPortrait` | Moiraine HUD portrait | `assets/stage7/ui/moiPortrait.webp` | Code-drawn portrait |
| `lanPortrait` | Lan HUD portrait | `assets/stage7/ui/lanPortrait.webp` | Code-drawn portrait |
| `asmoPortrait` | Asmodean HUD portrait | `assets/stage7/ui/asmoPortrait.webp` | Code-drawn portrait |
| `bg7far` | Dusk Waste skyline | `assets/bg7/bg7far.jpg` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7mid` | Chaendaer and Portal Stone | `assets/bg7/bg7mid.webp` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7mid2` | Burned Imre Stand/open Waste | `assets/bg7/bg7mid2.webp` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7mid3` | Rhuidean unfinished palaces/dry fountain | `assets/bg7/bg7mid3.webp` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7mid4` | Glass-column plaza and Avendesora | `assets/bg7/bg7mid4.webp` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7floor` | Rock/clay Waste floor | `assets/bg7/bg7floor.jpg` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7floor2` | Rhuidean street floor | `assets/bg7/bg7floor2.jpg` | Code-drawn dusk/blue architecture or tiled floor |
| `bg7floor3` | Glass plaza floor | `assets/bg7/bg7floor3.jpg` | Code-drawn dusk/blue architecture or tiled floor |
| `story7p1` | Portal Stone arrival; Riley from behind | `assets/stage7/story/story7p1.jpg` | Rear-view black-coated Riley over code-drawn scenery |
| `story7p2` | Waste/Imre Stand; Riley from behind | `assets/stage7/story/story7p2.jpg` | Rear-view black-coated Riley over code-drawn scenery |
| `story7p3` | Rhuidean veil/city; Riley from behind | `assets/stage7/story/story7p3.jpg` | Rear-view black-coated Riley over code-drawn scenery |

The cast sheets include their matching `.json` atlas files; each frame’s `state` field defines its pose. The earth strip also includes JSON metadata, while the loader uses its six fixed 128×128 cells. Existing Riley, grunt and spear atlases, their Stage 5 compact normals, Stage 6 `s6fade` art, and shared powers/HUD textures are reused as finished assets. No hound atlas is loaded. No new normal maps are needed. `s7arrow`, `s7veil`, `s7streak` and `s7ribbon` make explicit the small supporting art that the plan uses without separate rows.

## Voice recordings

All **26** IDs below still need recordings. The plan lists 26 individual IDs despite saying “24 lines”; every scripted ID is implemented. The shared voice budget remains 4,915,200 bytes, with each file ≤200 KiB. All current placeholders are the exact spoken line shown as a caption, with **no request for a missing MP3**. Destination is `assets/audio/voice/<id>.mp3`. Scripts, pronunciation hints and intended voice profiles are in `tools/stage7/voice-render.json`. Reviewed IDs must then be added to `src/stage7-voice-files.js`.

| Voice ID | Speaker | Placeholder |
|---|---|---|
| `st7_story_01` | NARRATOR | Caption only |
| `st7_story_02` | NARRATOR | Caption only |
| `riley_st7_story_01` | RILEY | Caption only |
| `st7_story_03` | MOIRAINE | Caption only |
| `st7_story_04` | LAN | Caption only |
| `st7_storm_01` | LAN | Caption only |
| `riley_st7_storm_01` | RILEY | Caption only |
| `st7_veil_01` | MOIRAINE | Caption only |
| `riley_st7_street_01` | RILEY | Caption only |
| `st7_asmo_intro_01` | ASMODEAN | Caption only |
| `st7_asmo_p2_01` | ASMODEAN | Caption only |
| `st7_asmo_p3_01` | ASMODEAN | Caption only |
| `st7_asmo_hurt_01` | ASMODEAN | Caption only |
| `riley_st7_reflect_01` | RILEY | Caption only |
| `riley_st7_call_01` | RILEY | Caption only |
| `riley_st7_call_02` | RILEY | Caption only |
| `riley_st7_call_03` | RILEY | Caption only |
| `st7_moi_call_01` | MOIRAINE | Caption only |
| `st7_moi_call_02` | MOIRAINE | Caption only |
| `st7_lan_call_01` | LAN | Caption only |
| `st7_lan_call_02` | LAN | Caption only |
| `st7_duo_call_01` | MOIRAINE | Caption only |
| `st7_clear_01` | ASMODEAN | Caption only |
| `st7_clear_02` | MOIRAINE | Caption only |
| `st7_clear_03` | LAN | Caption only |
| `riley_st7_victory_01` | RILEY | Caption only |

Use the existing Riley DYLO profile, Jason narrator reference, and Moiraine `bf_emma`; Lan and Asmodean still need their specified voice designs. Loudness, pronunciation and transcript review are pending for every recording. No claims of voice generation or Whisper verification are made.

## Music and sound effects

| Needed asset | Destination | Current placeholder |
|---|---|---|
| 96 BPM desert hand-drums/flute, seamless 2-minute loop | `assets/audio/music-stage7.mp3` | Existing `music-stage5.mp3` |
| 96 BPM harp-led boss theme, seamless 2-minute loop | `assets/audio/music-boss7.mp3` | Existing `music-boss6.mp3` |

Both commissioned loops remain needed; combined cap 2,400,000 bytes. The gameplay rhythm is independently clocked at 96 BPM, so the borrowed music is not promised to align with it. Run the existing music loop checker on replacements before changing the Stage 7 music registrations.

All ten SFX cues are implemented with short synthesized tones: normal harp, gold harp, glass hum, glass crack, wind, Shaido shout 1/2, earth heave, Lan slash and shield flare. No external SFX files are required. These cues are functional temporary sound design; richer synthesis can replace them without extra downloads.

## Call-in video and posters

Every MP4 and JPEG below remains needed. Missing clips immediately fall back to the live helper strike; missing intro media uses the three story panels. There are no fake playback delays or missing-file requests.

| Clip | Needed files | Content | Placeholder |
|---|---|---|---|
| M1 | `assets/cutscenes/call7/M1.mp4`, `M1.jpg` | Moiraine earth heave | Live earth-spike strike/caption |
| M2 | `assets/cutscenes/call7/M2.mp4`, `M2.jpg` | Moiraine shield/fire variant | Live earth-spike strike/caption |
| L1 | `assets/cutscenes/call7/L1.mp4`, `L1.jpg` | Lan draw/dash | Live dash/slash strike/caption |
| L2 | `assets/cutscenes/call7/L2.mp4`, `L2.jpg` | Lan precision slash | Live dash/slash strike/caption |
| D1 | `assets/cutscenes/call7/D1.mp4`, `D1.jpg` | Moiraine shield, Lan strike | Live duo shield/slash/caption |
| D2 | `assets/cutscenes/call7/D2.mp4`, `D2.jpg` | Duo variant | Live duo shield/slash/caption |
| S7 (optional) | `assets/cutscenes/stage7/S7.mp4`, `S7.jpg` | Portal Stone arrival | Three rear-view story panels |

Use `tools/cutscenes/encode_callins.sh`: 854×480, 5–10 seconds, ≤160 KB/s including audio. Total call7 folder ≤9,000,000 bytes; stage7 intro folder ≤2,000,000 bytes. Review every frame and poster for rear-view-only Riley, likeness, no gore/text/logos. Record reviewer approval in `ART_STATUS.json` before adding clips to `CALL7_PRESENT` or `STAGE_CLIPS[7]`. No Rand call-in footage should be reused for Stage 7.

## Resource and release contract

The initial stage loads current/next scenery; later scenery streams and old plates are removed. Boss art is demanded at the Z2 exit, helpers at initial ready charge, with code art on missing files. Story panels release on exit/skip, portal glow at wave 1, storm art at Z1 clear, and all Stage 7 textures on stage exit (the shared Fade is retained when entering Stage 6). Prefetch retains at most one predicted-helper video blob and revokes it on helper change, abort, low quality or destroy.

The static conservative texture estimate is **83.90 MiB** with all fallback scenery/story panels resident at once; it is not an iPhone measurement. Device/WebKit measurement, final art review, music/audio checks and user playtest signoff remain required before removing `s7=1` gating. TDOG and Stage 8 implementation are outside this change.
