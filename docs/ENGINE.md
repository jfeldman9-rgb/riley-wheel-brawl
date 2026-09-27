# Riley Wheel Brawl — Engine

The generic engine supports the original game content in `js/content.js`. The content follows `docs/BRIEF.md`, `docs/VOICE_LINES.md`, and `docs/ART_LIST.md`.

Everything lives on the global `RWB` namespace; scripts are plain `<script>` tags
in `index.html` (no bundler), each with a `?v=` cache stamp. World space is a
fixed 640x360 canvas; the floor band is `RWB.FLOOR_TOP`..`RWB.FLOOR_BOTTOM`.

## Load order (index.html)

| File | Kept from | Purpose |
|---|---|---|
| `js/util.js` | pass3 (trimmed) | `RWB.W/H`, floor band, fonts, `RWB.display`, `RWB.light`, `RWB.gfx` layer cache, `RWB.util` math + seeded PRNG, `RWB.text` (draw / cached / wrap / width), `RWB.draw` (rrect, circle, ellipse, shadow, bar, arcadeBar, hatch, tintVignette, vignette, scanlines, fitImage). Per-stage lighting table removed. |
| `js/settings.js` | pass3 (neutralized) | `RWB.settings`: persisted options (`rwb-settings`), keyboard + gamepad remaps with swap-on-conflict, labels, Continue checkpoint (`rwb-run`, `{level, wave, score, extra}` + optional `validateRun` hook). `RWB.perf` particle budget / auto-LITE. |
| `js/artdata.js` | new stub | `RWB.ARTDATA` frame table for painted atlases/plates (empty). |
| `js/artmanifest.js` | new | `RWB.ART_MANIFEST`: array of files that are actually bundled. Only listed files are requested, so missing art never 404s. |
| `js/assets.js` | pass3 (rewritten generic) | `RWB.assets.register(key, src, {lazy})`, `load(onProgress)`, `ready(keys)`, `get/has/settled`, `failed()`, `skipped()`, `VER`. Missing images resolve to `null` → caller draws procedural art. |
| `js/art.js` | pass3 | `RWB.art.has/frame/draw/castShadow/reflect/plate/plateLayer` for painted atlases; all no-ops when the art is absent. |
| `js/input.js` | pass3 (neutralized) | `RWB.input`: keyboard, gamepad (deadzone, rumble), touch (virtual stick + buttons), mouse. Actions: `up down left right attack jump special assist power pause start mute fullscreen click`. `held`, `pressed`, `axis()`, `hint(id)`, `fillKeys('{attack}')`, `legend()`, `drawTouch(ctx, {always, powerReady, assistReady})`, remap capture. Touch buttons are live when the scene has `isGameplay && phase === 'play' && !paused`. |
| `js/audio.js` | pass3 (content removed) | `RWB.audio`: buses (master, music→duck, sfx→compressor), `tone/noise/formant/brass` synth primitives, generic `sfx` (blip, select, swing, hit, hurt, thud, jump, pickup, whoosh, lastCall, levelClear, gameOver, impact, wipe, stinger, babble, voLine), 16-step sequencer (`playMusic/stopMusic`), `defineSfx/defineSong/defineStinger/defineVoice`, optional recorded clips `loadClip(key,url)/playClip(key)`, volume/music/mute, `trace` of fired cues, `level()` meter. Songs are registered by content (`title`, `story`, `stage1`, `gameover`), not by this file. |
| `js/camera.js` | new (generic) | `RWB.Camera`: follow with lead, bounds, arena `lock/unlock`, `shake`, `punch`, `stop` (hit-stop), `flash`, `impact(dir, 'light'|'heavy'|'boss'|'super')`, `update(dt)` → true while frozen, `apply(ctx)`, `drawFlash(ctx)`. Reduced Shake scales shake 35%, punch 50%, flash dimmed/shortened. Impact presets were retuned so light hits stop for 0.025s, heavy hits 0.06s, boss hits 0.08s, and supers 0.14s; ordinary impacts have a 90ms anti-chain cooldown. |
| `js/collide.js` | new (generic) | `RWB.collide`: `FAIR` tunables, `box`, `front(actor, reach, back, h, zOff, depth)`, `hurt(actor)`, `overlap(a,b)` (x overlap + lane depth + z range), `circle(...)` for projectiles/beams, `clampLane`, `debugDraw` (`#boxes`). |
| `js/entity.js` | new (generic) | `RWB.Entity` base: x/y/z, velocities, gravity or `flying`, facing, `setState/stateT`, hp, `invuln`, `takeHit(dmg, fromX, {kb, launch})` with `onHurt/onDeath/onLand` hooks, `drawShadow`; `RWB.Entity.sortByDepth`. |
| `js/fx.js` | new (generic) | `RWB.FX` pooled particles: `sparks`, `chunks`, `dust`, `ring`, `glow`, `text`, `spawn(kind,…)`, `update/draw`, `FX.defineKind(name,{update,draw})`. Respects `RWB.perf.fxCap/fxScale`. |
| `js/options.js` | pass3 (unchanged) | `RWB.OptionsPanel('options'|'controls', {full})`: sound, music, display mode, overlay, HUD size, colorblind health, effects, **Screen Shake FULL/REDUCED**, and live key/pad remapping. |
| `js/pause.js` | new (generic) | `RWB.PauseMenu({onQuit, extra, quitLabel})`: RESUME / OPTIONS / CONTROLS / extras / QUIT; `open()`, `update(input, dt)` → `'resume'|'quit'|null`, `draw(ctx)`. |
| `js/content.js` | original content | Title, reels, actors, combat, five arenas, HUD, bosses, finale, victory, songs, and optional-art registration. |
| `js/performance.js` | smoothness pass | `FrameClock`: fixed 1/60s ticks, five-tick catch-up limit, retained pressed edges. `Motion`: temporary render interpolation with guaranteed restoration. AUTO frame-cost hysteresis, reusable effect stamps, incremental image/rig/stage preparation. |
| `js/main.js` | pass3 (flow removed) | Canvas scaling (AUTO capped at 1280px coarse / 1920px desktop, SHARP up to 4K, CLASSIC 640px, DPR watch, fullscreen), loading screen, audio unlock, main loop (bounded 60Hz simulation, interpolated rendering, adaptive AUTO resolution/effects, mute/fullscreen keys, `#fps`), `RWB.game` scene manager: `setScene(s)` (fade), `setSceneNow(s)`, `boot()` (starts `RWB.scenes.Title` or the stub; content may override), `debug` object. |

## Scene contract

```js
{ enter?(), exit?(), update(dt, input), draw(ctx),
  isGameplay?: bool,  // live fight: touch buttons, auto-pause on tab hide, runtime LITE
  phase?: 'play'|…, paused?: bool, pause?(),
  music?: 'songName' } // played on first audio unlock
```

## Tools

- `tools/soak.cjs` — Node vm harness: boots every script in `index.html` with a
  stub DOM (or `@napi-rs/canvas`), seeds `Math.random`, and drives a masher bot.
  Exports `{ boot, soak }`. Needs content to provide `RWB.scenes.Play`,
  `RWB.LEVELS` and a player with `hp/hpMax/power/powerMax/state`. With the stub it
  prints "engine booted OK … nothing to soak".

## Assets kept

- `assets/fonts/press-start-2p.ttf` + `OFL.txt` (SIL Open Font License).
- `css/style.css` (full-bleed canvas, letterbox, font face).


## Content extensions

`RWB.CAPTIONS` exposes every reel caption for validation. `RWB.LEVELS` describes all five stages. `RWB.scenes.Play(game, levelIndex, carry)` implements the soak contract. `RWB.game.debug.play(levelIndex = 0)` opens any stage and `RWB.game.debug.boss()` summons that stage's boss. `RWB.ASSET_VER` is the shared external-resource cache stamp (`20260927-scroll3`).

## Chunk A content modules

Stage 1 content is split after `pause.js` in this fixed order: `data.js`,
`riley.js`, `enemies.js`, `allies.js`, `pickups.js`, `stage1.js`, `hud.js`,
`scenes.js`, and `content.js`. `content.js` now contains only audio registration
and debug glue. These files consume the existing generic entity, collision,
camera, effects, input, pause, audio, and persistence APIs. Chunk A did not add
engine methods. The g2 pass only retuned `RWB.Camera.IMPACTS` (see the camera
row above). Gameplay hit-stop still freezes `Play.update` via `camera.update`,
and that scene latches attack, jump, special, assist, power, and directions
until the freeze ends so a one-frame press is not dropped.

The Stage 1 test contract exposes `RWB.RILEY_POSES`, `RWB.MOVES`, actor
constructors, `RWB.Stage1`, and the scene constructors. `Play` publishes its
live hitbox arrays, used player moves, pickup count, damage count, and the
Chieftain's `usedAttacks` set for deterministic validation. An enemy move is
added to `usedAttacks` only when its active interval begins.

## Chunk B extensions

After `stage1.js`, load `campaign.js`, `shadow.js`, and `stages.js`, before `hud.js`
and `scenes.js`. No bundler or runtime package is added.

- `campaign.js`: exact voice catalog, stage configurations and encounter mixes,
  story groups, optional JPEG/PNG registration and painted-image helper.
- `shadow.js`: new walkers extend the existing Trolloc AI/director/throw behavior;
  distinct bosses use existing Entity physics and collision. Draghkar is truly
  flying and filters damage to jump kicks and fireballs. Taim clamps ordinary
  damage at 1 HP; only the joint beam collision can finish him.
- `stages.js`: independent procedural architecture/palettes, four-layer art hooks,
  Mashadar lane warning/drain, and Twinkle Toes drawing.
- `scenes.js`: stage-indexed encounters/checkpoints, per-stage Loial reset on
  progression, story routing, subtitle queue, Callandor award, live joint finish.
  Reel advancement is idempotent and its last caption remains drawable during fade.
- `riley.js`: finite fear stun/kiss escape, release-time anti-air fireball aim,
  persisted Callandor flag. Existing kick timing, combo queue, hit-stop latch,
  controls and combat physics stay in place.

Checkpoint `extra.callandor` persists through death, restart and Continue. Stage
clear saves the next stage with a pending Callandor reveal when appropriate; Loial becomes available only on new
stage entry, not on restarting or continuing the same stage. The final save is
cleared only after Taim dies. Finale charge-up leaves Taim's AI and damage live;
Riley can die and retry, and shield hits still refill saidin at Taim's HP floor.

Art registration uses `ART_FILES` for logical paths and `ART_MANIFEST` for the
allowlist of delivered files. The shared input renderer is called from Play with
`always: true`; CALL/FIRE labels retain the original action IDs and hit regions.

## W2 painted presentation and persistence

`puppets.js` loads after `scenes.js` and before `content.js`. It augments actor
drawing and samples final movement after `Play.updateObjects`; hitboxes, controls,
move timings, collision and existing AI remain in the inherited modules. Twelve
walking character definitions bind source pixels to head/torso and upper/lower
limb regions. A cached, alpha-culled 16x24 triangle mesh uses two-bone leg IK
and bounded shoulder/elbow/wrist deformation. Skin blends continuously through
knees and hems; source soles translate rigidly to measured world contacts. The
Stone Guard supplies explicit contacts because its painted boots overlap. Kicks
are constrained to the authored leg length. The source texture is cached at 384
pixels tall; translucent actors composite to a scratch surface once before fading
to avoid alpha seams at triangle edges. Idle uses the same processed composite as articulated motion. Attack/hurt targets and
knockdown rotation use this same rig. Draghkar uses its winged painted cutout.

`gait.phase` advances with actual world displacement, including lane movement.
Each stance foot stores an immutable world contact until toe-off. Rendered joints
are calculated relative to those contacts; drawing never advances the gait.
Visual heights are assigned during simulation, independent of whether a frame
is drawn. All rigs keep procedural rendering if their source image is unavailable.

`tools/prepare-rigs.py` extracts Riley/Twinkle's first poses from their supplied
model sheets. It removes only edge-connected neutral background and preserves
glasses, facial features and clothing highlights. It needs Pillow, NumPy and SciPy;
it is an authoring tool, not a browser dependency.

`StageWorld` owns far/mid/floor/near composition, mirrored edge tiling, the Stage 5
roof switch, depth wash and stage grading. Near props are clipped below the lowest
fight lane. `Play.draw` applies camera shake to the world only. The HUD remains
stationary. `ART_MANIFEST` allowlists all 54 delivered/derived images.

Boss checkpoint extras contain HP, attack-cycle index, used attacks, phase two,
Twinkle rescue and readiness state. They are written at boss entry, every second,
and immediately on death. Continue restores the encounter at saved HP; a pending
rescue caption is requeued. Explicit Restart Stage starts at wave zero.

Stage 4 clear saves Stage 5 plus `pendingReveal: 'callandor'`. Both live progression
and title Continue route through `resumeRun`; only advancing the final reveal
caption removes that flag. Reloading partway through replays the reveal.

`tools/review.cjs` serves this checkout and captures actual Canvas output with
headless Playwright/Chromium. Set `CHROMIUM_PATH` for an existing executable.
Evidence and audit data are under `docs/review/`. The rendered-contact audit samples the actual mesh triangles for all twelve rigs across varying speeds, directions, lane movement and update rates; it fails above 0.15 world pixels of drift/error. `rig-poses.jpeg` exposes walk, attack, channel, hurt and knockdown targets.

## Smoothness rendering contract

`Play.update` remains authoritative. `main.js` captures previous transforms before
each fixed tick, then `Play.draw` interpolates only for drawing and restores the
real values in `finally` before drawing the HUD. No interpolated coordinate is
saved or used for collision. Gait phase/contacts and camera impulses interpolate
with the actors. Blur/visibility changes clear input and accumulated time.

The painted puppet skin retains its original connected 16×24 topology. Weights,
source matrices, grading and texture data are prepared once. When WebGL is
available, indexed mesh triangles render in one batch per actor; Canvas skinning
remains the fallback after unavailability/context loss. Each live actor caches
its own bounded pose composite, so a frozen crowd does not invalidate a shared
pose surface. Stage plates/lighting and common effect textures are cached.

AUTO starts at a practical pixel budget and steps down only after sustained
overload; eight inexpensive seconds permit gradual recovery. SHARP remains
manual. Browser-software performance measurements are regression evidence,
not physical device guarantees. See `SMOOTHNESS.md` and `review/README.md`.
