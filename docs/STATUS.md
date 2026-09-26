# Current Repository Status

## Snapshot

The repository is currently the complete **Whale Lance: Buffet Brawl** game, not yet Riley Wheel Brawl. It is a no-build, 640×360 logical-resolution Canvas 2D application served from `index.html`. The existing game has four scrolling stages, seven regular enemy types, a final boss, an opening reel, between-stage story beats, an ending, persistent options, and desktop/gamepad/touch controls.

No Riley, Kenzie/Twinkle Toes, Moiraine, Loial, Wheel of Time locations, Trollocs, Fades, Draghkar, Forsaken, turned Asha'man, Taim, fireballs, saidin taint, balefire, lightning super, angreal, Callandor, or five-stage rescue story exists yet.

## Existing systems and owners

| Existing capability | Current behavior | Primary owner(s) |
| --- | --- | --- |
| Static entry point | GitHub Pages-friendly script order, canvas shell, metadata, font preload, versioned CSS/JS URLs | `index.html`, `.nojekyll`, `css/style.css` |
| Global drawing/runtime helpers | 640×360 constants, text, bars, cached layers, lighting, shadows, scanlines, fit-image helpers | `js/util.js` |
| DPR and display modes | Auto uses DPR, Sharp supersamples, Classic retains 640×360 nearest-neighbor output; resize/fullscreen and red critical-art warning live here | `js/main.js` |
| Settings and Continue | `localStorage` settings/run records, remappable keys and pad buttons, accessibility, FX budgets, stage/wave checkpoint | `js/settings.js` |
| Input | Keyboard, gamepad polling/rumble, pointer and touch tracking, BOX/ATK hit regions, sticky transparent controls, live badges, PICK UP label | `js/input.js` |
| Audio | Procedural WebAudio SFX, stingers, songs, volume/music controls, music ducking; no audio files currently load | `js/audio.js` |
| Voice/copy tables | Short barks, enemy intro cards, combo ranks, move labels, old super lines/title | `js/voice.js` |
| Asset loading | Optional images, common `?v=` stamp derived from the current script, retry for painted files, critical-file reporting, two-at-a-time lazy story loading | `js/assets.js` |
| Painted-art metadata/runtime | Generated atlas frame/anchor/plate manifest, cached resampling, mirroring, shadows, reflections, plate layers | `js/artdata.js`, `js/art.js` |
| Procedural and painted sprites | Hero/enemy/boss/item/FX fallback drawing, painted pose mapping, portrait rendering | `js/sprites.js` |
| Player combat and entities | Combo state machine, launcher/juggles, grab/throw, jump kick, old spray and super, health/meter, pickups, enemy AI, boss, breakables, thrown toolbox projectiles | `js/entities.js` |
| Stage content | Four level records, wave/group definitions, breakables/pickups/hazards, parallax/procedural backdrops, old story beat data | `js/levels.js` |
| Gameplay scene | Camera and wave locks, AI director, spawning, checkpoints, hazard updates, collision/FX, HUD, boss tells, pause and game over | `js/scenes.js` |
| Cutscene engine | Timelines, typewriter dialogue, optional plate wait/fallback, camera pan/zoom, transitions, name cards, ambient overlays, speaker medallions | `js/cinema.js` |
| Menus | Shared Options and Controls panels, pointer/keyboard/gamepad navigation | `js/options.js`, `js/scenes.js` |
| Game flow | Loading, title, opening, stage intro/outro sequencing, Continue, ending, debug helpers, main loop | `js/main.js`, `js/scenes.js` |
| Painted source pipeline | Keying/cropping/packing pose sheets and writing `artdata.js`; story processing and legacy portrait helper | `tools/bake_art.py`, `tools/bake_story.py`, `tools/make_lance_portraits.py`, `tools/art-src/` |
| Regression tooling | Node/browser smoke tests, deterministic captures, visual gates, performance/HD checks, gameplay soak | `tools/chrome-smoke.cjs`, `tools/test_and_capture.js`, `tools/capture-gfx.cjs`, `tools/story-shots.cjs`, `tools/verify-hd.cjs`, `tools/soak.cjs`, `tools/live-shot.cjs` |

## What works now and should survive the remake

### Play and combat

- Four complete stages with scrolling cameras, wave gates, groups, breakables, fixed pickups, hazards, and a multi-phase final boss.
- Buffered three-hit melee, delayed third-hit launcher, up to three juggle follow-ups, jump/flying attack, proximity grab, knee, directional throw, projectile/tool throw and recovery, and a full-meter screen clear.
- Hit-stop, directional camera punch, screen shake, temporary invulnerability, anti-stunlock rules, attack concurrency limits, flanking, agile dodges, and boss floor telegraphs.
- Score, lives, health, combo ranks, enemy cards, stage banners, boss bar, objective tracker, tutorials, pause, game over, Continue, and victory.

### Presentation and resilience

- Painted title, Lido plates, hero, four enemy atlases, props, portrait, and fifteen story images are committed. The other stages/enemies/boss render procedurally.
- Every loaded image is optional. Procedural art appears after failure; painted files retry once; missing critical art triggers a red warning banner.
- Painted frames have metadata for crop rectangles, foot anchors, native facing, and scale. Runtime art supports cached high-DPI frames, mirroring, cast shadows, reflections, and plate layers.
- The cutscene reel works with or without its painted still and keeps typewriter text, cards, pans, effects, transitions, and skip input.

### Platforms and accessibility

- Keyboard, remappable gamepad, mouse, and multitouch input.
- Persistent transparent control overlay; on-screen buttons do not disappear after tutorials.
- Clickable title rows and explicit BOX/ATK pointer hit-testing; BOX changes to PICK UP when the thrown object is absent.
- Auto, Sharp, and Classic display modes; up to 4K backing resolution; adaptive FX budgets; bundled font.
- Large HUD, colorblind-safe health, reduced shake, overlay opacity, effects quality, sound/music levels, fullscreen, mute, and alt-tab pause.

## Current content that must be replaced

- `README.md`, `index.html`, visible text, comments, identifiers, local-storage keys, debug names, and test fixtures still describe the old company, hero, food enemies, cruise setting, A/C objective, and comic super.
- `assets/art/`, `assets/cutscenes/`, `tools/art-src/`, generated atlas metadata, visual gate shots, and helper names are all themed to the current game.
- `js/levels.js` contains four old locations and their story. It needs five Wheel of Time stages and new hazards/bosses.
- `js/entities.js` still spends HP on a short freeze cone, fills an old meter from food, throws a toolbox, and implements a fart cloud as the super.
- `js/sprites.js` maps only two-frame painted walks and procedural walking largely changes limb pose by phase. Riley and every walking enemy need genuinely planted multi-frame cycles.
- `js/audio.js` has synthesized effects and music but no recorded lines. `js/voice.js` is currently text copy, not a voice asset player.
- Current art loading version-stamps images and scripts, but there are no audio URLs to validate yet. Any recorded lines added later must also use relative cache-stamped URLs and graceful fallback.

## Missing Riley Wheel Brawl work

1. Complete identity/content scrub with neutral internal names and refreshed README/page metadata.
2. Riley's look, procedural fallback, painted atlas, true Tae Kwon Do animation set, portrait, HUD face, and real walk cycle.
3. Real multi-frame walks for Trollocs and every other walking enemy.
4. Fireball projectile and triple-fireball angreal buff.
5. Saidin pickup/meter terminology and persistence, full-meter taint buildup, screen treatment, and HP chip.
6. Lightning/balefire super, Riley's “Balefire!” line, Callandor upgrade, and Continue persistence.
7. Moiraine healing pickups and “Rise, Riley, Rise!” playback.
8. Once-per-stage Loial call while preserving tool-button pointer behavior and PICK UP regression coverage.
9. Five new stage data sets, backdrops/fallbacks, enemy rosters, hazards, bosses, telegraphs, and tuning.
10. Twinkle Toes reveal and the joint Taim finish.
11. New opening, one sequence per stage, ending flow, dialogue, medallions, and optional painted story stills.
12. New painted art pipeline inputs and generated output at or above the present Lido mid-fight bar.
13. Updated automated smoke/soak/visual checks for all five stages, missing-art fallbacks, cache stamps, forbidden-copy scan, input modes, and performance.

## Planning references

- The intended product and non-negotiable constraints are in [`BRIEF.md`](BRIEF.md).
- The ordered implementation slices are in [`TASKS.md`](TASKS.md).
- Required spoken/text barks are in [`VOICE_LINES.md`](VOICE_LINES.md).
- The proposed painted-file contract is in [`ART_LIST.md`](ART_LIST.md).
