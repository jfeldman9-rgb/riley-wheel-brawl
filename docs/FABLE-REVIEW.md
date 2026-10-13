# Fable review: Riley Wheel Brawl, Stages 1–6

Review only. No game code was changed. Base: `rwb-w2` at `f792182` (Merge PR #50). Phaser 4.2.1.

## What ran

| Check | Result |
|---|---|
| `node --test tests/*.test.mjs` | 1420 tests: 1418 pass, 0 fail, 2 skipped (Stage 4 STT, Playwright viewport). The first run had one failure in `tests/stage4-placeholders.test.mjs` because the VM lacked Python Pillow (`ModuleNotFoundError: No module named 'PIL'`); after `pip3 install pillow` it passes. That is an environment gap, not a code bug, but CI should pin Pillow if that test is meant to gate. |
| `node tools/audit-stage1.mjs` | `preFight.inventoryUpperBoundBytes = 24,948,657` of `25,000,000` (51,343 B headroom). PASS. |
| Headless play | Stage 6 was driven through the Node harness (`tests/helpers/stage6-harness.mjs`, bot mode) to measure camera position versus backdrop residency at each zone lock (finding 3). The harness stubs `scene.textures`, so texture lifetime findings (4) are traced from code, not executed. |
| Live WebKit/Chromium | Not available in this VM (no Playwright). GPU peaks below come from the committed dumps `docs/stage6/texture-art.json`, `docs/stage5/texture-dump-rs2.json`, and `docs/stage5/HARDENING.md`. |

Numbers quoted from dumps: Stage 6 run source peak 113.46 MiB (boss 110.91), GL wrappers 124.00 MiB at rs=1. Stage 5 source peak 108.96 MiB, GL wrappers 151.15 MiB at rs=2. The 119.35 / 113.9 MiB figures in the brief are the `Texture.source`-only counts in `docs/stage5/HARDENING.md:90`; they exclude `dataSource` normals, so they undercount what the driver holds.

## Ranked findings

| # | Sev | Confidence | Area | One line |
|---|---|---|---|---|
| 1 | High | High on arithmetic, medium that it is the on-device crash | Memory | iPhone runs rs=2: three 2560×1440 render targets (~42 MiB) sit on top of ~110 MiB of textures; nothing lowers rs for memory, and a context loss restores at the same rs. |
| 2 | High | Medium | Memory | Stage 4 is the real peak (135.8 MiB source+dataSource, 146 MiB wrappers at rs=1) because compact normals are gated to Stages 5/6 only. |
| 3 | Medium | High (simulated) | Visual / streaming | Zone stream drops the previous plate and floor the frame the zone locks, while the camera is still 231–293 px short of the zone; left strip of screen has no mid plate (and at zones 2/3, no floor) for ~40 frames. |
| 4 | Medium | Medium (traced) | Texture lifetime / correctness | `queuePlate`'s shutdown path paints a code stand-in under the real plate key and re-arms the loader during shutdown; after a same-stage restart that stand-in is permanent for the session and an orphan image is left in the display list. |
| 5 | Medium | High | Pre-fight budget | `assets/powers/riley_lightning.png` (785,442 B) is never loaded at runtime but is counted in the 25 MB gate. Moving it buys 15× the current headroom. |
| 6 | Medium | Medium | Process RAM | Stage 6 keeps two decoded 73 s stereo loops (~25–28 MB each) resident; jetsam counts this with the GPU textures. |
| 7 | Low | High | Memory | Fighter colour atlases have 18–29 % empty space; a lossless repack of grunt/hound/spear recovers ~8–10 MiB from every stage peak. |
| 8 | Low | High | Lifecycle ordering | `Stage1.create` registers its own shutdown handler after `kit.build()`, so kit/view listeners run before `kit.destroy()`. Enables 4; otherwise harmless today. |
| 9 | Low | Medium | Pre-fight budget | Smaller wins: `music-main.mp3` re-encode (−0.6 MB), Twix panels JPG→WebP (−0.2 MB), fx PNG→WebP (−31 KB), boot portraits resident in 5/6 (0.75 MiB GPU). |

Checked and not reproducible / looks correct: see "Audited and OK" at the end. It is as useful to the next agent as the findings.

---

### 1. Retina render targets double the GPU footprint; the governor never steps down for memory

Severity: High. Confidence: high that the numbers are right; medium that this is what kills iPhones (no device in this VM).

Where:
- `src/config.js:8` — `RS0 = Math.max(1, Math.min(+q.get('rs') || Math.min(2, DPR), 2))`. Every modern iPhone has DPR 3, so it boots at rs=2: a 2560×1440 canvas.
- `src/quality-governor.js:13-15` — `tierScale` only drops to `rs0 - 0.5` at tier 3 and `1` at tier 5.
- `src/quality-governor.js:76-79` — tiers advance only when a 2 s window averages > 21 ms. Memory pressure on iOS does not present as slow frames; it presents as a lost context or a page reload.
- `src/graphics-lifecycle.js:42-54` — `restore()` resumes the game at the same tier and rs. If the loss was memory, the loop repeats.

Evidence: `docs/stage5/texture-dump-rs2.json` run at `deviceScaleFactor` 2: source 108.96 MiB, GL wrappers 151.15 MiB; the `gl[]` list has three 2560×1440 RGBA targets at 14.1 MiB each (bloom ping/pong + camera/filter target). At rs=1 the same stage measures 119.51 MiB wrappers (`docs/stage5/HARDENING.md:92`). So rs=2 alone costs ~31 MiB on top of a texture set that already sits at the cap. Stage 6 at rs=2 was never dumped; by the same arithmetic it lands near 155 MiB.

Repro (desktop): `?rs=2&s5=1&skip=boss` then `window.__stage.game.renderer` → count `glTextureWrappers` sized 2560×1440. On an iPhone: play Stage 5/6 to the boss; expect either a `webglcontextlost` or a Safari "this page was reloaded" bar.

Why it matters: the whole compact-normal effort bought ~35 MiB; rs=2 render targets give most of it back.

Fix (for a Grok 4.7 agent):
1. In `src/config.js:8`, cap the default starting scale at 1 on iOS (`/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform))`). Keep the `?rs=` override so desktop and screenshot tooling are unchanged. If 1.0 looks too soft on a 6.1" phone, use 1.5 (1920×1080, three targets = 23.7 MiB, saves 18.6 MiB vs rs=2) by making `RS0` accept non-integers; `game.scale.resize` and `cameras.main.setZoom` already accept fractional values and `tierScale` already produces 1.5.
2. In `src/graphics-lifecycle.js` `restore()`, after `lost = false`, apply at least tier 3 (`game.governor` exposes `applyLevel` only internally; export a `game.setQualityFloor(3)` from `installGovernor` that raises `level` and calls `applyLevel`) so a restored context comes back with bloom off and rs lowered. Persist the floor in `sessionStorage` (guarded with try/catch like `createSeen`) so a reload after a memory kill does not start at rs=2 again.
3. Add a test beside `tests/governor-restart.test.mjs` asserting `tierScale(3, 2) === 1.5` and `tierScale(3, 1) === 1` already hold (they do), plus a new one that the restore path raises the floor.

### 2. Stage 4 is the largest texture peak and gets none of the compact-normal savings

Severity: High (if the ~120 MiB figure is a hard cap, Stage 4 exceeds it today). Confidence: medium — the numbers are from a committed live dump, but I could not re-measure.

Where:
- `src/texture-pages.js:3` — `COMPACT_STAGES = new Set([5, 6])`.
- `src/stage4-def.js:6` — `STAGE4_CHARS = ['riley', 'cutthroat', 'hound', 'loial', 'cultist', 'draghkar']`.
- `assets/stage5/normals/` already contains compact `_n`/`_nl` pages for `riley-0`, `riley-1`, `riley3-0`, `grunt-0`, `hound-0`, `spear-0`, `loial-0`.
- `docs/stage5/HARDENING.md:88-93` — Stage 4 final: 119.36 MiB source-only, 135.84 MiB source+dataSource, 146.39 MiB live wrappers at rs=1 (WebKit).

Why it matters: Stage 4 carries riley (30.97 MiB colour), hound (15.35), loial (6.89) with full-size normals. The Stage 5/6 work shows full normals for four fighters cost 39.5 MiB versus 4.6 MiB compact (`docs/stage6/STATUS.md:18`). For riley + hound + loial that is roughly 26 MiB full vs ~3 MiB compact: about 23 MiB off the Stage 4 peak, and similar for Stages 1–3 (which also run riley/hound/loial plus Stage 1–2-only fighters without compact pages).

Repro: `NODE_PATH=$(npm root -g) node tools/stage5/texture-dump.mjs` with `RWB_STAGES=4` on a machine with Playwright, or read the committed figures above.

Fix:
1. Change `COMPACT_STAGES` to include 4 (and 1–3 if the look is accepted; Stage 5/6 already ship it so the art direction has signed off on the resolution). `normalPageDir` already handles the per-page swap and anim teardown; nothing else changes.
2. Pages without a compact file (`archer`, `byar`, `chief`, `zealot`) need the loader to fall back to the original dir. Today `normalPageDir` returns the compact dir unconditionally; add a `COMPACT_PAGES` set (the file list above) and return `dir` for pages not in it. Otherwise Stages 1–2 will 404 on `archer-0_n`.
3. Generate compact pages for `archer`, `byar`, `chief`, `zealot` with the existing tool (`tools/stage5/compact_normals.py`) if Stages 1–2 are included.
4. Update the expectations in `tests/anim-release.test.mjs` and `tests/golive-stale-alias.test.mjs` (they cover `normalPageDir` and assert that leaving 5/6 restores originals; with all stages compact, the swap path becomes dead and can be deleted, which also removes the 6→1 double load).

### 3. Zone streaming drops the previous backdrop while it is still on screen

Severity: Medium (visual, every zone entry in Stages 5 and 6; not a crash). Confidence: high — measured in the harness with real `updateZones`/`updateCamera` code.

Where:
- `src/zone-stream.js:39-46` — `residentZones` keys residency on `scene.zoneI` alone.
- `src/zone-stream.js:80-87` — `sync()` destroys the previous plate/floor objects and `T.remove`s the textures the same frame `zoneI` changes.
- `src/stage1.js:325-330` — `zoneI++` and `locked = true` the frame `R.x > nz.at` (1500 / 2800 / 4140).
- `src/stage1.js:728-734` — the camera then lerps toward `zone.l` (1240 / 2560 / 3920) at `dt*5`, i.e. ~0.5–0.7 s.
- `src/stage6-view.js:63,137` and `src/stage5-view.js:191` — floor edges are `[0, zones[2].l, zones[3].l, WORLD_W]`, so the floor key also changes at zone 2 and zone 3.

Measured (Stage 6 harness, bot mode, `/tmp` script, 60 Hz):

| Zone lock | Riley x | camX at lock | zone.l | new plate left edge | uncovered px on the left | frames until camX ≥ zone.l − 8 |
|---|---|---|---|---|---|---|
| 1 | 1502 | 961 | 1240 | 1192 | 231 | 41 |
| 2 | 2806 | 2267 | 2560 | 2560 | 293 | 42 |
| 3 | 4143 | 3606 | 3920 | 3872 | 266 | 43 |

At zone 2 the dropped set is `bg6mid2` + `bg6floor` and at zone 3 it is `bg6mid3` + `bg6floor2`, so for those entries the strip has no floor either: the far plate and the lane colour show through. Stage 5 has identical `at`/`l` numbers (`src/stage5-def.js:21-24`) and the same `layoutPlates(keep)` drop, so it has the same strip. The existing test (`tests/zone-stream.test.mjs`, "frees the quay floor only when the camera locks onto the hall") checks `residentKeys` by zone index, which is exactly the thing that is wrong, so it passes.

Why it matters: a 230–290 px wide column of missing parallax/floor for ~0.7 s, three times per stage, in the two stages that got the most art attention. On iPhone (rs=2) it is a 460–590 device-pixel band.

Fix:
1. In `src/zone-stream.js` `residentZones(scene)`, keep `z - 1` while the camera has not yet reached the new plate: `if (z > 0 && typeof scene.camX === 'number' && scene.camX < plateRect(z, zones).x) out.unshift(z - 1)`. `plateRect` needs the zone list; `scene.zones` is available (the harness exposes it as `s.zones`; `stageDef.zones` is the same frozen array). Residency returns to two zones once `camX` crosses the plate edge, so the peak only gains one extra plate+floor for ~0.7 s (bg6mid2 is 1.3 MiB, bg6floor 0.6 MiB), and it never overlaps the next zone's load because `sync()` already queues `z + 1` at lock.
2. If the extra ~2 MiB for 0.7 s is unacceptable at the boss (zone 3 drops to one zone, so the gain is ~1.9 MiB there), alternatively hold the texture but drop the display object only when `camX >= plateRect(z).x`; the texture is the memory, the object is the visual.
3. Replace the zone-index test with one that steps `camX` and asserts the previous keys stay until `camX` passes the plate edge. Rebuild `docs/stage6/texture-art.json` after.

### 4. `queuePlate` shutdown path leaves a code stand-in under a real plate key and an orphan image

Severity: Medium (permanent wrong art for the rest of the session on that stage; one leaked display object). Confidence: medium — traced through Phaser 4.2.1 scene shutdown order; not executed because the harness stubs textures and the loader.

Where:
- `src/stage6-paint.js:48-54` and `src/stage5-paint.js:62-68` — `fin` is attached to both `load 'complete'` and `scene.events 'shutdown'`, and calls `done(textures.exists(key))` in both cases.
- `src/zone-stream.js:100-108` — the `done` callback does `if (!ok) view.paintBackdrop(key); api.sync();`.
- `src/stage6-view.js:105-109` → `src/stage6-art.js:30-39` — `paintBackdrop` creates a canvas texture under the plate key (`put` skips only if `textures.exists(key)`), and `api.sync()` → `showBackdrop(key)` → `scene.add.image(...)` (`src/stage6-view.js:110-125`).
- `src/stage1.js:107-129` — `releaseStage(6)` from Stage 6 (same-stage restart via Continue) keeps every key in `STAGE6_TEXTURES`, which includes `bg6mid*`/`bg6floor*`.
- `src/stage1.js:153` vs `:180` — the kit's shutdown listeners (including `fin`) are registered during `kit.build()`, before Stage1's own shutdown listener, so they run before `kit.destroy()` (finding 8). Phaser's `DisplayList`/`UpdateList`/`LoaderPlugin` shutdown listeners were registered at scene boot, so they have already run.

Sequence: Riley crosses the zone-1 trigger → `sync()` queues `bg6mid3` → the download is in flight → the scene restarts (death → Continue, or a stage-skip query) → scene `shutdown` → loader resets (listener registered first) → `fin()` → `done(false)` → `paintBackdrop('bg6mid3')` creates a 160×96 canvas texture named `bg6mid3` → `api.sync()` → `showBackdrop('bg6mid3')` adds an image to a display list that was just emptied. Next run: `releaseStage(6, 6)` keeps `bg6mid3`; `queuePlate` returns `false` because the key exists; `showBackdrop` sees `isPainted` false and places the 560×150 stand-in. The in-flight XHR's `addImage('bg6mid3')` fails with "key already in use". The orphan image from the previous run is not in the new `owned` array, so `dropBackdrop` never removes it. Stage 5 (`layoutPlates`) follows the same path through `paintBg(scene, new Set([key]))`.

Repro: Chrome DevTools → Network → "Slow 3G"; `?s6=1&god=1`; walk past x=1500; while `bg6mid3.webp` is pending, trigger a restart (die with god off, or call `window.__stage.scene.restart({stage:6})` from the console); after the restart walk to zone 2 and compare the mid plate to a clean run.

Fix:
1. In both `queuePlate`s, split the two paths: `const onComplete = () => { detach(); done?.(textures.exists(key)); }` and `const onShutdown = () => { detach(); }`. Never call `done` on shutdown.
2. Give `createPlateStream` a `dead` flag and a `destroy()` that sets it; have `sync()` and the `load` callbacks return early when `dead`. Call `backdrops.destroy()` from `Stage6Kit.destroy()` (`src/stage6.js`) and from the Stage 5 lifecycle teardown (`src/stage5-lifecycle.js:49` creates it).
3. Defensive: in `showBackdrop`, bail if `!scene.sys?.isActive?.()` (Phaser sets `settings.active = false` before emitting `shutdown`).
4. Test: a fake loader whose `start` never completes; emit `shutdown`; assert `paintBackdrop` and `scene.add.image` were not called and `textures.exists('bg6mid3')` is false.

### 5. Dead asset inside the 25 MB pre-fight gate: `riley_lightning.png`

Severity: Medium (it is the single largest, cheapest headroom available). Confidence: high.

Where:
- `src/powers.js:53-57` — `queuePowerArt` loads `ART.pickups`, `ART.hud`, `ART.panels`, and `ART.fx` only. `ART.rileyLightning` (`src/powers.js:49`) is not in `ART.fx`; its frames live in `riley-1` (`src/powers.js:46-48`, `assets/chars/riley.anims.json`).
- `tools/audit-stage1.mjs:84` — the gate adds every non-`.md` file under `assets/powers`, so `riley_lightning.png` (785,442 B, 2880×1280 RGBA) is counted although no code path requests it. `docs/stage6/STATUS.md:20` already states it is not loaded.
- `rg riley_lightning.png` finds only `powers.js` (the `url` string and a comment), `ART_LIST.md`, and `tools/make-power-placeholders.py:62`.

Why it matters: headroom goes from 51,343 B to ~836,785 B without touching anything the player sees.

Fix:
1. `git mv assets/powers/riley_lightning.png art-in/powers/riley_lightning.png` (the repo already keeps reference art under `art-in/`).
2. Update `ART.rileyLightning.url` in `src/powers.js:49` to the new path (it is a reference string; `tests/powers.test.mjs:257` reads it to assert the 2880×1280 size and `:258-259` checks the file name appears in `ART_LIST.md`). Update `tools/make-power-placeholders.py:62` to write to the new location, and the `ART_LIST.md` row.
3. Re-run `node tools/audit-stage1.mjs`; expect `inventoryUpperBoundBytes ≈ 24,163,215`. `tests/stage6-memory.test.mjs:34` (asserts the file is not in the Stage 6 set) keeps passing.

### 6. Two decoded 73 s stereo music loops stay resident in Stage 6

Severity: Medium for process footprint on iOS (jetsam uses total RSS, where decoded PCM and GPU textures add up). Confidence: medium (arithmetic from file metadata; no device RSS).

Where:
- `src/stage6.js:21-22` — `MUSIC.stage6` / `MUSIC.boss6` loop 72.25 / 72.98 s; files are 44.1 kHz stereo (`ffprobe`: 72.54 s / 73.27 s, 112 kb/s).
- `src/audio.js:361-376` — `stopTrack` halt keeps the current plus one previous decoded buffer.
- Decoded size per loop: 72.5 s × 44,100 × 2 ch × 4 B = 25.6 MB (27.9 MB if Safari resamples to 48 kHz). In the boss fight `stage6` (previous) + `boss6` (current) ≈ 51–56 MB; the comment at `:370` estimates "about 20 MB each" from the shorter Stage 1–5 loops (30–65 s).

Fix:
1. Author the Stage 6 loops as mono or shorten them toward the 40 s the other stages use; mono halves the decoded size with no code change.
2. Or make the keep-previous rule stage-aware: in `stopTrack` halt, free `tracks[k].buf` when `k` is the stage loop and the current track is that stage's boss loop (the stage loop only comes back on a restart, where `loadMusicBuffer` re-decodes from the HTTP cache). That drops ~26 MB during the Stage 6 boss, which is also the texture peak.

### 7. Fighter atlases have 18–29 % unused texels

Severity: Low (nothing is wrong; it is unclaimed headroom). Confidence: high (computed from `assets/chars/*.json` frame rects vs `meta.size`).

Fill: `grunt-0` 71.0 % (4076×1212, ~5.5 MiB empty), `hound-0` 71.5 % (3612×1084, ~4.3 MiB), `spear-0` 82.3 % (3792×852, ~2.2 MiB), `riley-0` higher. These four atlases plus cutthroat are 84.4 MiB of the ~111 MiB boss peak in Stages 5/6 (`docs/stage6/texture-art.json` entries).

Fix: repack with MaxRects + rotation (the atlas pipeline in `tools/` already writes `meta.size`; `assets.js` reads frame rects, and the `_nl` flipped-normal patch in `patchFlippedNormals` works per frame rect, so rotation must be either disabled or handled there). Target ~95 % fill: about 8–10 MiB off every stage peak, independent of findings 1–2.

### 8. `Stage1.create` registers its shutdown handler after the kit builds

Severity: Low on its own. Confidence: high.

`src/stage1.js:153` calls `kit.build()` (which, for Stages 5/6, attaches `scene.events.once('shutdown', ...)` in `queuePlate`, `pump`, `queueStage6Painted`) before `src/stage1.js:180` attaches Stage1's own `once('shutdown')` that calls `kit.destroy()`. Listeners fire in registration order, so kit-level shutdown callbacks always run against a still-live kit, and anything they add (textures, images, loader jobs) is not seen by `kit.destroy()`. Finding 4 is the concrete consequence. Fix: move the `events.once('shutdown', ...)` block above `kit.build()` (the closure only references `this`, which is fine). Phaser's EventEmitter3 has no prepend API, so order has to come from registration order.

### 9. Smaller pre-fight and GPU savings

All low severity, high confidence on the byte counts.

| Item | Where | Saving | Notes |
|---|---|---|---|
| `music-main.mp3` at 128 kb/s stereo, 159 s | `src/audio.js:269` | ~0.6 MB at 96 kb/s; ~1.3 MB at 64 kb/s | Streams via `HTMLAudioElement` (`stream: true`), so decode memory is unaffected; this is only the gate. The file length equals `loopEnd`, so there is nothing to trim. |
| Twix panels JPG → WebP q80 | `assets/powers/twix_panel_*.jpg` (842 KB) | ~220 KB | Stage 1 only; `TWIX_ART_KEYS` already releases them. |
| `fx_*.png` → lossless WebP | `assets/powers/fx_*.png` (198 KB) | ~31 KB | `tests/powers.test.mjs:255-256` reads dimensions by URL; the `size()` helper would need WebP support or the test updated. |
| Boot portraits `bossPortrait`, `byarPortrait`, `loialPortrait` resident through Stages 5/6 | `src/stage1.js:123` releases only `arrow`, `ribbon`, `fadePortrait` | 0.75 MiB GPU | Add them to the release list when `toStage >= 3`. |
| Story panels (2.6 MiB) resident at title in Stage 6 | run peak 113.46 vs boss 110.91 | 2.6 MiB off the run peak, not the boss peak | Already freed at start; only matters if the title peak is what trips the device. |

---

## Audited and OK

These were on the brief and did not turn up a defect. Listed so the next agent does not re-audit them.

- **Audio unlock on iOS Safari** — `src/audio.js` `installAudioLifecycle` uses capture-phase `pointerdown`/`touchend`/`keydown`; `touchend` is the event Safari accepts for `AudioContext.resume()`. The Rand second player (`src/rand-call-cutscene.js:81-100`) adds and removes its own capture listeners symmetrically. The gesture path checks `(unlocked || ctx)` before `unlock()`, so a context created by the music director is also resumed.
- **Cookie/storage-blocked boot** — only two `sessionStorage` sites (`createSeen` in `src/cutscene.js`, the Rand shuffle bag in `src/rand-call-cutscene.js`); both are wrapped in try/catch and degrade to in-memory. No `localStorage` use.
- **Video skip/stall paths** — `CutscenePlayer` has start (4 s), stall (3 s) and max (30 s) timeouts, a 450 ms press guard, `ended`/`error` listeners removed on `finish`, and `game.pause()` ownership tracked so a shutdown mid-clip releases it. The 250 ms watchdog in `src/guard.js` is a separate safety net.
- **Boss-down timers** — Stage 5 cancels on shutdown explicitly; Stage 6 (`src/stage6-def.js:42`) relies on `scene.time.delayedCall`, which the Scene Clock clears on shutdown, so a restart during the outro leaks nothing.
- **Rand call-in** — `restoreStage6Hooks` aborts the call, un-ducks music, ends a strike, undoes every `hook()`, and drops the blob URL. The prefetched MP4 blob is held at module level for the stage (a few MB); it is released on teardown.
- **Input** — keyboard/touch listeners are attached once per `Input` (game-lifetime object), not per scene; scene-level `inp.on('key'/'press')` handles are removed in the shutdown block (`src/stage1.js:181`).
- **Globals across restarts** — `perf` listeners (`src/perf.js:177-179`) are game-lifetime by design; `perf.reset()` runs on shutdown; `pauseReasons` are cleared (`src/stage1.js:190`).
- **Phaser upgrade surface** — the lit-sprite `_nl` texture trick and `cam.filters.external.addVignette` are the two Phaser-4-specific couplings; both are isolated in `assets.js` and `stage1.js:169`.

## Not verified

- Actual iPhone RSS/GPU behaviour. Finding 1's fix is cheap and reversible via `?rs=2`, so it is the first thing to try on a device.
- Whether Stage 4 runs on an iPhone today (finding 2). If it does, the ~120 MiB figure is softer than the brief states and finding 1 becomes the dominant risk.
- Finding 4 end-to-end in a browser.
