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
| `js/audio.js` | pass3 (content removed) | `RWB.audio`: buses (master, music→duck, sfx→compressor), `tone/noise/formant/brass` synth primitives, generic `sfx` (blip, select, swing, hit, hurt, thud, jump, pickup, whoosh, lastCall, levelClear, gameOver, impact, wipe, stinger, babble, voLine), 16-step sequencer (`playMusic/stopMusic`), `defineSfx/defineSong/defineStinger/defineVoice`, optional recorded clips `loadClip(key,url)/playClip(key)`, volume/music/mute, `trace` of fired cues, `level()` meter. **No songs are registered.** |
| `js/camera.js` | new (generic) | `RWB.Camera`: follow with lead, bounds, arena `lock/unlock`, `shake`, `punch`, `stop` (hit-stop), `flash`, `impact(dir, 'light'|'heavy'|'boss'|'super')`, `update(dt)` → true while frozen, `apply(ctx)`, `drawFlash(ctx)`. Reduced Shake scales shake 35%, punch 50%, flash dimmed/shortened. |
| `js/collide.js` | new (generic) | `RWB.collide`: `FAIR` tunables, `box`, `front(actor, reach, back, h, zOff, depth)`, `hurt(actor)`, `overlap(a,b)` (x overlap + lane depth + z range), `circle(...)` for projectiles/beams, `clampLane`, `debugDraw` (`#boxes`). |
| `js/entity.js` | new (generic) | `RWB.Entity` base: x/y/z, velocities, gravity or `flying`, facing, `setState/stateT`, hp, `invuln`, `takeHit(dmg, fromX, {kb, launch})` with `onHurt/onDeath/onLand` hooks, `drawShadow`; `RWB.Entity.sortByDepth`. |
| `js/fx.js` | new (generic) | `RWB.FX` pooled particles: `sparks`, `chunks`, `dust`, `ring`, `glow`, `text`, `spawn(kind,…)`, `update/draw`, `FX.defineKind(name,{update,draw})`. Respects `RWB.perf.fxCap/fxScale`. |
| `js/options.js` | pass3 (unchanged) | `RWB.OptionsPanel('options'|'controls', {full})`: sound, music, display mode, overlay, HUD size, colorblind health, effects, **Screen Shake FULL/REDUCED**, and live key/pad remapping. |
| `js/pause.js` | new (generic) | `RWB.PauseMenu({onQuit, extra, quitLabel})`: RESUME / OPTIONS / CONTROLS / extras / QUIT; `open()`, `update(input, dt)` → `'resume'|'quit'|null`, `draw(ctx)`. |
| `js/content.js` | original content | Title, reels, actors, combat, five arenas, HUD, bosses, finale, victory, songs, and optional-art registration. |
| `js/main.js` | pass3 (flow removed) | Canvas scaling (AUTO / SHARP / CLASSIC, up to 4K, DPR watch, fullscreen), loading screen, audio unlock, main loop (dt clamp, auto-LITE after slow seconds, mute/fullscreen keys, `#fps`), `RWB.game` scene manager: `setScene(s)` (fade), `setSceneNow(s)`, `boot()` (starts `RWB.scenes.Title` or the stub; content may override), `debug` object. |

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

`RWB.CAPTIONS` exposes every reel caption for validation. `RWB.LEVELS` describes the five arenas and boss attack names. `RWB.scenes.Play(game, levelIndex, carry)` implements the soak contract. `RWB.game.debug.play(n)` opens an arena and `RWB.game.debug.boss()` summons its boss. `RWB.ASSET_VER` is the shared external-resource cache stamp.
