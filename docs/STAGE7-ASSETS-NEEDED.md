# Stage 7 assets still needed

Stage 7 (Rhuidean) is fully playable today on code-drawn stand-ins (`src/stage7-art.js`)
plus two reused Stage 6 sheets. Everything below upgrades looks and sound; nothing here
blocks gameplay, the bot, or the tests. Budgets are enforced by `tools/audit-stage1.mjs`
and `tests/stage7-memory.test.mjs`.

How art lands: drop source collages where `tools/stage7/process_art.py` expects them,
run it (it regenerates `src/stage7-painted.js` with `present: true` and writes
`assets/stage7/ART_STATUS.json` — that file does not exist yet because no painted art
has been processed). Frame counts and order in the JOBS table must stay as they are:
they match `sync()` in `src/shaido.js` / `src/asmodean.js` and the code-drawn sheets.

## Painted character sheets (`assets/stage7/chars/`, via process_art `poses`)

| Key | Frames in order | Decoded cap | File cap | Status |
|---|---|---|---|---|
| `s7dancer` | idle, run, veil-tell, lunge, hurt, down, yield, yield-fade | 1.25 MiB | 60 KB | code-drawn |
| `s7veiled` | idle, walk, draw, loose, hurt, down, yield | 1.15 MiB | 55 KB | code-drawn |
| `s7asmo` | idle, walk, play, bash-tell, bash, channel, stagger, bound | 2.10 MiB | 120 KB | code-drawn |
| `s7moir` | stand, raise, cast | 0.80 MiB | 45 KB | code-drawn |
| `s7lan` | run, draw, slash, point | 0.97 MiB | 50 KB | code-drawn |
| `s6fade` | (Stage 6 sheet, reused as-is) | 1.10 MiB | exists | **shipped (reuse)** |

Note: the plan (§5.2) sketched more poses per character (run cycles etc.). The shipped
code and process_art JOBS use the reduced sets above. Adding poses means changing the
frame maps in `sync()` and JOBS together — do not just add cells.

Shaido are human: yield poses are a kneel in white (gai'shain), never a corpse.
Asmodean's last pose is bound/kneeling, never dead. Palette: dusk orange `#d9822b`,
sand `#c8a26b`, glass cyan `#8fe3ff`, fog blue `#6f8fb0`, cadin'sor `#8a7a5e`,
Shaido red band `#a33a2a`.

## Portraits (`assets/stage7/ui/`, derived by process_art from pose 0)

`moiPortrait`, `lanPortrait`, `asmoPortrait` — 136×136, ≤4 KB each. Code-drawn today.
They appear automatically once the character collages above are processed.

## Props and FX (`assets/stage7/props/`, via process_art `props`)

| Key | Cells | Decoded cap | Status |
|---|---|---|---|
| `s7note` | 6 × 64×64 (normal ×2, gold ×2, burst ×2) | 0.09 MiB | code-drawn |
| `s7column` | 3 × 128×448 glow states | 0.66 MiB | code-drawn |
| `s7shard` | 4 × 128×64 | 0.13 MiB | code-drawn |
| `s7earth` | 192×128 earth-heave strip | 0.38 MiB | code-drawn |
| `s7shield` | 2 × 128×256 ring | 0.25 MiB | code-drawn |
| `s7ring` | 2 × 144×72 shimmer ring | 0.08 MiB | code-drawn |
| `s7portal` | 2 × 128×256 | 0.25 MiB | code-drawn |
| `s7dust` | 512×256 sandstorm overlay (tiles) | 0.50 MiB | code-drawn |
| `s7crate`, `s7planks` | Aiel basket + shreds | 0.13 MiB | code-drawn |
| `s6streak` | Stage 6 slash streak | exists | **shipped (reuse)** |

## Backgrounds (`assets/bg7/`, via process_art `image`/`bands`)

`bg7far` (1024×464 jpg, Waste horizon), `bg7mid` (Chaendaer/Portal Stone),
`bg7mid2` (Imre Stand ruins), `bg7mid3` (Rhuidean street + dry fountain + fog curtain),
`bg7mid4` (glass-column plaza + Avendesora), `bg7floor` (rock/sand), `bg7floor2`
(city paving), `bg7floor3` (glass-flecked plaza). File caps 80–130 KB each; streamed,
only current + next zone resident (≈8.4 MiB). All code-drawn today.

## Story panels (`assets/stage7/story/`)

`story7p1..3`, 1280×720 jpg, ≤220 KB each: (1) Portal Stone on Chaendaer at dusk,
(2) the Waste and the fog dome from above, (3) Rhuidean street in fog. Riley, if
present at all, only from behind. Code-drawn gradients today; panels are freed before
zone 0 (`freeStory7`).

## Voice (26 lines, all caption-only today)

Ids and script live in `src/stage7-voice.js` (`LINES`); cast, engines, pronunciation
hints and processing are in `tools/stage7/voice-render.json`. To ship a line: render
the mp3 to `assets/audio/voice/<id>.mp3` (≤200 KB each, 4,915,200 bytes total) and add
the id to `present` in `assets/audio/stage7-voice-manifest.json` — `stage7Say` picks it
up with no code change. Still needed: Lan and Asmodean ElevenLabs Voice Designs
(prompts in the render json), Jason's narrator clone for `st7_story_01/02`, Kokoro
`bf_emma` for Moiraine, DYLO for Riley. Whisper `medium.en` check per line.
(The plan says "24 lines" but its own table lists 26 ids; the byte cap is what binds.)

## Music (2 loops, Stage 6 loops stand in today)

`assets/audio/music-stage7.mp3` (desert hand drums + low flute) and
`assets/audio/music-boss7.mp3` (harp-led), both **96 BPM**, ~2:00 loops, ≤1.2 MB each.
Until they exist, `src/stage7.js` points `stage7`/`boss7` at the Stage 6 files; when
the new loops land, repoint those two lines, set exact `loopStart`/`loopEnd` from
`tools/music/check_loops.py`, and add rows to `assets/audio/AUDIO_PROVENANCE.md`
(the music test requires the filename there).

## Cutscene clips (none ship yet — strikes already run without them)

Call-ins, into `assets/cutscenes/call7/` (budget 9,000,000 bytes), encoded with
`tools/cutscenes/encode_callins.sh SRC_DIR`:

| id | Shot (Riley only from behind in every frame) |
|---|---|
| `M1`, `M2` | Moiraine: earth heave over Riley's shoulder; fire arc out of fog |
| `L1`, `L2` | Lan: sprint-past draw; standing in the sandstorm, then gone |
| `D1`, `D2` | Duo: Lan leaps through Moiraine's ring; both step forward either side of Riley |

Optional intro `stage7` into `assets/cutscenes/stage7/` (budget 2,000,000): Portal
Stone light fading, fog dome below. When it ships, register it as
`7: ['stage7/stage7']` in `STAGE_CLIPS` (`src/cutscene.js`) — `wrapStart(7, 7)` is
already wired and no-ops until then.

Rules (hard): photoreal, 5–10 s, 854×480 CRF 29 ≤160 KB/s, faststart; Riley never
turns past profile and no part of his face shows, even blurred; frame-review at 4 fps;
never prompt by actor name and reject any take resembling the TV cast; log reviewer +
timestamp in the cutscene `ART_STATUS.json`; Jason signs off on likeness. Posters
(`<id>.jpg`, <60 KB) come out of the encode script.

## After the art lands

1. `node --test tests/stage7-memory.test.mjs` — decoded caps per sheet, painted
   resident ≤12 MiB, boss peak ≤105 MiB.
2. Texture dump on a real browser: `RWB_STAGES=7` with `tools/stage5/texture-dump.mjs`
   (needs Playwright + a static server; not run in the build session).
3. `tools/stage7/browser-hardening.mjs` — lifecycle/residency probes (same needs).
4. Jason's playtest, then flip `stageEnabled(7)` to default-on (plan T15).
