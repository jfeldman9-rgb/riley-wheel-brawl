# Riley Wheel Brawl — deep bug / risk review (rwb-w2, Stages 1–6)

Review only. No game code was changed on this branch; this file is the only addition.

Base: `rwb-w2` at the time of review. Engine: Phaser 4.2.1, WebGL, lit sprites with normal maps.

## TL;DR

1. **The ~119 MiB Stage 6 peak was measured at render scale 1. iPhones run at render scale 2** (`RS0 = min(2, DPR)`), where the same Stage 6 run measures **151.03 MiB of GL textures**. That is about 31 MiB over the stated 120 MiB cap. Almost all of the gap comes from full-screen camera-filter render targets: bloom needs 3 of them, the vignette 1, and they share. With both filters off at render scale 2, Stage 6 measures 108.80 MiB. This is the biggest finding and the cheapest one to fix.
2. **The 120 MiB cap does not match the other stages.** The same tool at render scale 1 measures Stage 1 at 260 MiB, Stage 2 at 218, Stage 3 at 202 and Stage 4 at 146. Either Stages 1–4 already go well past the cap on iPhone, or the cap is not what this metric measures. Someone needs to measure it on a real device before more budget work is trusted.
3. **Pre-fight byte budget:** `assets/powers/riley_lightning.png` (785,442 bytes) is counted against the 25 MB gate but the game never loads it. Moving it out of `assets/powers/` raises headroom from about 51 KB to about 837 KB with no runtime change.
4. **Stage 6 zone 2 and the boss:** the `cutthroat-0` atlas (8.18 MiB) stays resident through zone 2 and Be'lal, but cutthroats only spawn in zones 0–1. Releasing it when zone 2 starts lowers the actual peak by 8.18 MiB.
5. Leaks and softlocks: nothing critical turned up. Clock freezes, Rand strikes, Rand call pauses, story panels for Stages 5/6 and zone plates are all torn down correctly on scene shutdown. The leak/softlock findings are low or medium severity and listed below.

Test suite: all tests pass. `tests/stage4-placeholders.test.mjs` fails only when Python Pillow is missing (environment, not code); it passes after `pip install pillow`.

---

## How this was measured

- Static server: `python3 -m http.server 8765` from the repo root.
- Texture metric: `tools/stage5/texture-dump.mjs` (Playwright, WebKit and Chromium). It drives each stage through its zones with autoplay. That is the headless play-through: every stage reached its boss zone with no page errors. It reports:
  - `sourceBytes`: the sum of `w*h*4` over every `Texture.source` and `Texture.dataSource` (the normal maps).
  - `glBytes`: renderer GL texture wrappers, which **include render targets** such as camera-filter framebuffers.
- Example: `NODE_PATH=/tmp/pw/node_modules RWB_RS=2 RWB_STAGES=6 RWB_ENGINES=webkit node tools/stage5/texture-dump.mjs`
- The stock tool cannot pass extra URL flags. For the `bloom=0` / `vig=0` rows I used a local, uncommitted copy that appends `process.env.RWB_EXTRA` to the URL. Adding that one-line hook to the real tool is worth doing (tooling, not game code).
- Playwright is not in `package.json`. I installed it under `/tmp/pw` (`npm i playwright@1 && npx playwright install chromium webkit`).

### Stage 6 peak (zone 2, before the boss), WebKit, 1280×720 viewport

| Render scale | Bloom | Vignette | glBytes (MiB) | sourceBytes (MiB) |
|---|---|---|---|---|
| 2 (iPhone default) | on | on | **151.03** | 108.84 |
| 2 | on | off | 150.99 | 108.80 |
| 2 | off | on | 122.91 | 108.84 |
| 2 | off | off | **108.80** | 108.80 |
| 1.5 | on | on | 132.53 | 108.80 |
| 1 | on | off | 119.41 | 108.86 |
| 1 | off | on | 112.36 | 108.84 |
| 1 | off | off | 108.87 | 108.87 |

How to read the table: any active camera filter allocates one full-screen render target, which is 14.06 MiB at render scale 2 (2560×1440×4) and 3.52 MiB at render scale 1. Bloom (`addParallelFilters`, a threshold plus a blur) adds two more. The vignette on its own therefore costs one render target, but nothing extra once bloom is already on.

### Stages 1–4 at render scale 1 (same tool, bloom and vignette on)

| Stage | Peak glBytes (MiB) | Peak sourceBytes (MiB) | Where |
|---|---|---|---|
| 1 | 260.36 | 249.81 | zone 0 |
| 2 | 218.22 | 207.67 | zone 0 |
| 3 | 201.76 | 191.22 | zone 3 (boss) |
| 4 | 146.35 | 135.81 | zone 0 |

Stage 5 at render scale 2 was not measured directly. Applying the same render-target difference (+31.6 MiB from scale 1 to 2 with bloom on) to the reported 113.9 MiB gives an **estimated 145 MiB**.

---

## Findings, ranked by severity

Format: severity, location, repro, why it matters, fix, confidence.

### CRITICAL-1: On iPhone, render scale 2 plus bloom puts Stage 6 at 151 MiB and Stage 5 at about 145 MiB

- **Where:** `src/config.js:8` (`RS0 = … Math.min(2, DPR)`), `src/main.js` (game size `VW*RS0`), `src/stage1.js:168-169` (bloom on by default, vignette on by default), `src/stage1.js:234-237` (`setBloom` → `cam.filters.internal.addParallelFilters()`). `src/quality-governor.js` only drops bloom after a 2 s average frame time above 21 ms, so a phone that holds 60 fps keeps it.
- **Repro:** run the table rows above with `RWB_RS=2 RWB_STAGES=6`. Every iPhone has DPR 2 or 3, so `RS0` is 2.
- **Why it matters:** the budget work so far (zone streaming, compact normals) was measured at render scale 1. On the target device the three bloom render targets alone add 42 MiB. If the 120 MiB figure is a real iOS limit, Stage 5 and Stage 6 are over it by 25–31 MiB on the actual hardware.
- **Fix (do all three, in this order):**
  1. **Default bloom off on touch / iOS, or whenever `RS0 >= 2`.** In `src/stage1.js` `create()`, change line 168 to only call `this.setBloom(true)` when `q.get('bloom') === '1' || (q.get('bloom') !== '0' && !IS_TOUCH && RS0 < 2)`. Use the existing touch/iOS detection if there is one; otherwise use `matchMedia('(pointer: coarse)').matches`. Saves 28.1 MiB at render scale 2.
  2. **Replace the vignette filter with a static overlay.** Generate a 256×144 radial-gradient canvas texture once in Boot. Add it as a `setScrollFactor(0)` image scaled to `VW×VH`, with depth just under the HUD and the same 0.35 strength. Remove `addVignette` at line 169. When bloom is also off, this drops the last full-screen render target: 14.06 MiB at render scale 2, 3.52 at scale 1. Visual difference is negligible because the vignette is static.
  3. **Compute the render scale from the canvas's real backing size.** An iPhone in landscape fits a 16:9 canvas at about 390–430 CSS px tall, so `ceil(cssHeight*DPR/720)` comes out around 1.6–1.8, not 2. Make it `RS0 = clamp(round((fittedCssHeight*DPR/720)*4)/4, 1, 2)`. At 1.5, Stage 6 measures 132.5 MiB with filters on, and about 109 + 4.4 with them off. Keep the `?rs=` override.
  - Tests: add a unit test that `setBloom` is not called at create when touch or `RS0 >= 2` is stubbed, and a dump-tool assertion that Stage 6 `glBytes` at `RWB_RS=2` is ≤ 120 MiB.
- **Confidence:** high for the measurements and the cause (render targets are counted in `glBytes`, and the table isolates them exactly). Medium for the "over the cap" conclusion; see HIGH-1.

### HIGH-1: The 120 MiB cap is unverified and Stages 1–4 measure 146–260 MiB on the same metric

- **Where:** the budget convention in the docs and `tools/stage5/texture-dump.mjs`. Main contributors in Stage 1: `chief-0` at 35.57 MiB, resident from the start of the stage; the full-resolution normals of the background plates `mid0`, `mid1`, `floor` and `floor2` at about 12 MiB each; the Twix panels at 10.5 MiB, resident for the whole stage; all `_nl` textures at 28.44 MiB and all `_n` at 56.65 MiB.
- **Repro:** `RWB_RS=1 RWB_STAGES=1,2,3,4 node tools/stage5/texture-dump.mjs` (and `RWB_RS=2` for the device figure).
- **Why it matters:** if iOS really evicts or loses the context near 120 MiB of GL textures, Stages 1–4 should already be failing on iPhone, and they apparently aren't reported as failing. So either (a) Stages 1–4 are at risk and nobody has noticed, or (b) the limit is not the `glBytes` sum (for example, iOS may count process footprint including decoded audio, or the cap may be higher on current devices). Either way, Stage 5/6 work is aiming at a number nobody has confirmed.
- **Fix:**
  1. On a physical iPhone, attach Safari Web Inspector, open the Timeline's Memory track, and record Stage 1 at zone 0 and Stage 6 at zone 2. Also run a deliberate allocation probe: a test page that creates 4 MiB textures until `webglcontextlost` fires or allocation fails. Record the device, iOS version and the number in `docs/`.
  2. If the limit is real, apply CRITICAL-1 to every stage, then add Stage 1–4 rows to the dump-tool budget check. Biggest Stage 1 wins: load `chief-0` on demand at the boss zone (Stage 5's `queueBossArt` in `src/stage5-demand.js` is the pattern), halve the background-plate normal maps, and free the Twix panels when the Twix cutscene ends.
  3. Free story panels at the end of Stages 2–4 the way Stages 5 and 6 already do (`freeStory5` in `src/stage5-art.js:96`, `freeStory6` used at `src/stage6.js:183-185`). Each set is about 10.5 MiB and currently stays resident; Stage 3 still has its panels at the boss.
- **Confidence:** high that the numbers are right; low on which interpretation is true.

### HIGH-2: Pre-fight byte budget counts an asset the game never loads (+785,442 bytes headroom)

- **Where:** `tools/audit-stage1.mjs:45,84` count every file in `assets/powers/`. `src/powers.js:49` declares `ART.rileyLightning.url = 'assets/powers/riley_lightning.png'`, but `queuePowerArt` (`src/powers.js:53-57`) only loads pickups, HUD, panels and fx. The lightning frames ship inside Riley's atlas page `riley-1`, as the comments at `src/powers.js:47-48` and `:58-59` say.
- **Repro:** `rg -n "riley_lightning.png" src` finds only the declaration. `stat -c %s assets/powers/riley_lightning.png` gives 785442. No network request for it appears in the dump runs.
- **Why it matters:** headroom is about 51 KB, so the next small asset fails the gate. This one move gains roughly 15× the current headroom without touching runtime behaviour.
- **Fix:** `git mv assets/powers/riley_lightning.png art-src/powers/riley_lightning.png` (or any directory the audit does not scan). Update `ART.rileyLightning.url` in `src/powers.js:49`, `tests/powers.test.mjs:257,259` (the size assertion and the "listed" check; line 259 iterates `ART.rileyLightning`, so either drop it from that list or point it at the new manifest), and `tools/make-power-placeholders.py:62`. Re-run `node tools/audit-stage1.mjs` and confirm headroom is about 836 KB.
- **Confidence:** high.

### HIGH-3: Stage 6 keeps `cutthroat-0` (8.18 MiB) resident through zone 2 and the boss

- **Where:** `src/stage6.js:41-42` queues `cutthroat-0` from `assets/stage3/chars/`. `src/stage6.js:200` releases it only when leaving the stage. `src/stage6-def.js:11-12` puts cutthroats only in zones 0 and 1; zone 2 is fadelt/grunt/grayman/hound/spear, and the boss is Be'lal.
- **Repro:** `RWB_RS=1 RWB_STAGES=6`. The zone-2 `heavy` list still contains `cutthroat-0`.
- **Why it matters:** the Stage 6 peak is at zone 2, so this is a direct 8.18 MiB reduction of the number everyone is watching.
- **Fix:** in Stage 6's zone-enter path (where zone streaming calls `sync` for the new zone, or in the stage-6 `update` hook when `s.zoneIdx` changes), once `zoneIdx >= 2` and `!s.enemies.some(e => e.type === 'cutthroat' && !e.gone)`, call `releaseChars(this, ['cutthroat'])` once and set `this._s6cutFreed = true`. `releaseChars` (`src/assets.js:39-45`) already removes the anims, the page and `_nl` textures, and is idempotent (it checks `textures.exists`), so the stage-exit release at line 200 needs no change. A checkpoint restart re-runs preload, which re-queues the atlas because `!scene.textures.exists('cutthroat-0')`, so restart is safe. Add a test that after zone 2 `textures.exists('cutthroat-0') === false`.
- **Confidence:** high on the saving; medium-high on safety. Check that no zone-2 wave or Be'lal summon spawns a cutthroat (none does in `stage6-def.js` today).

### MEDIUM-1: More byte-budget levers, ordered by value per effort

- `assets/audio/music-main.mp3` is 2,546,668 bytes. Re-encoding to 96 kbps CBR (or 64 kbps AAC/m4a with mp3 fallback) saves about 640 KB, and the music plays under SFX.
- Stage 2 characters live in `assets/chars/`, which the pre-fight audit counts, while Stage 3 already uses `assets/stage3/chars/`. Moving the Stage-2-only atlases to `assets/stage2/chars/` (and teaching the audit's stage-split set about them) corrects about 3.2 MB of accounting. To be honest: that is an accounting fix, not a download saving. It is only valid if those atlases really aren't fetched before the first fight. Verify against the network log first.
- Twix panels (about 842 KB on disk): re-encode at WebP q≈70. They are full-screen story art shown briefly.
- Background normal maps at half resolution (about 0.9 MB on disk, and also 4× less GPU memory for those plates, see HIGH-1). The normal detail is low-frequency.
- Debris atlases `staves`, `planks` and the cart: see MEDIUM-2 (about 0.5 MB).
- Custom Phaser build without unused systems (arcade/matter physics, tilemaps, etc.). Likely several hundred KB, but it needs build tooling; do it last.
- **Confidence:** medium. Byte savings for re-encodes are estimates.

### MEDIUM-2: Oversized small textures and portraits that stay resident

- **Where:** `src/stage1.js:512-524`. Barrels and debris draw at `setScale(0.19)`. The `planks` atlas is 2.48 MiB of GPU memory and the crate source is 490×482, both shown at about 0.19×. `src/main.js:17` loads `bossPortrait`, `loialPortrait` and `byarPortrait` in Boot, and they are never released (about 0.75 MiB together), including in Stages 5/6 where only some are used.
- **Fix:** downscale `staves`, `planks` and the crate to 0.25× (round up to power-of-two padding if the packer wants it), and change the hard-coded `0.19` to `0.19 * (origW / newW)`. Better: put a per-texture `displayScale` in the atlas JSON `meta` and read it the way `fighter.js` reads `meta.scale`. Saves about 2.3 MiB of GPU memory in Stage 5. Release the portraits a stage doesn't use when it starts (for example, in Stage 5/6 `create`, `textures.remove('bossPortrait')`), and have the HUD lazy-load a portrait if one is missing.
- **Confidence:** high on the sizes; low-medium on the visual risk (debris at 0.19 is about 90 px).

### MEDIUM-3: Larger GPU-memory projects (only needed if CRITICAL-1 is not enough)

- ASTC 4×4 (or 6×6) compressed textures for the four fighter atlases, which make up about 78.4 MiB of the Stage 6 peak. Phaser 4 supports `load.texture` with a compressed-format map and a WebP fallback. ASTC 4×4 is 8 bpp against 32 for RGBA, so about 4× smaller. Normal maps need ASTC with a normal-map encoder or must stay uncompressed.
- Get rid of the `_nl` (flipped-red normal) textures. `patchFlippedNormals` in `src/assets.js` uses a second texture for flipped sprites. Flipping the X component in the light shader when `flipX` is set would remove 28 MiB in Stage 1 and the equivalent in other stages. This needs a custom light pipeline or shader hook, which makes it the riskiest change in this list.
- Repack `grunt` and `hound`. Atlas fill is 0.71 and 0.72, and a tighter pack with trimming could cut roughly 20% per page.
- **Confidence:** medium. These are larger changes; do HIGH-3 and CRITICAL-1 first.

### MEDIUM-4: About 50 MB of decoded music buffers (process memory, not GPU)

- **Where:** `src/audio.js:370-371` deliberately keeps the current and one previous decoded track. Decoded Web Audio buffers are float32 stereo, roughly 25–28 MB per 2–3 minute track, so two tracks are about 50 MB.
- **Why it matters:** this isn't in the GL number, but iOS kills tabs on total process footprint (jetsam). If HIGH-1 shows the real limit is process memory, this is the cheapest 25 MB available.
- **Fix:** in `halt()`, also drop the previous track's buffer (`tracks[k].buf = null` for every `k !== currentTrack`) on iOS or touch devices. Even better, play long tracks through the existing `<audio>` stream element path, the way Stage 1's music already works (the `T.el` / `T.fallback` branch), and keep decoded buffers only for short stingers.
- **Confidence:** high on the byte count; unknown impact until HIGH-1 is measured.

### MEDIUM-5: The first intro video on iOS can stay muted after the user taps

- **Where:** `src/cutscene.js:67-72` (`bless`), `:100-112` (overlay `touchend`/`click` handlers skip the clip), `:150-156` (`refused` → muted fallback on `NotAllowedError`).
- **Repro (needs a device, not reproduced headlessly):** iOS Safari with a cold boot and no prior gesture, or a cookie/storage-blocked boot that reaches the clip with no gesture. The clip autoplays muted. The user's first tap lands on the overlay, and its `touchend` handler calls `skip`, so the tap that could have unmuted the video advances or skips it instead. The next clip starts from `next()` with `v.muted = r.muted` (still true). Where `bless()` is wired to the gesture listeners it should flip `r.muted` back, but only if it runs *before* the overlay's skip handler, and both listen to the same `touchend`.
- **Why it matters:** silent story clips on the main target platform. Not a softlock.
- **Fix:** in the overlay tap handler, if `r.muted` is true, the first tap should only unmute (`this.bless()`, `v.muted = false`, `r.muted = false`) and show the skip hint. Skipping should need a second tap. Add a unit test with a fake video that rejects `play()` with `NotAllowedError` once: after one `touchend`, expect `muted === false` and the clip not skipped.
- **Confidence:** medium-low. This comes from reading the code; ordering between capture-phase gesture listeners and overlay listeners has to be checked on a device.

### LOW-1: Background plate callbacks run after the stage view is destroyed

- **Where:** `src/zone-stream.js:91-95` and `:103-107` (load callback → `view.paintBackdrop` and `api.sync()`); `src/stage6-paint.js:50-54` and `src/stage5-paint.js:64-68` call `fin` on scene `shutdown`.
- **Repro:** start Stage 6, then quit or restart while a zone plate is still loading (a throttled network makes this easy). On shutdown the paint helper fires `done(false)`, and zone-stream calls `paintBackdrop` on a view whose `destroy()` has already run (`src/stage6.js:171`).
- **Why it matters:** at worst a thrown error inside a shutdown handler, which can stop later shutdown listeners from running (a leak) or trip the frame guard. In this review it didn't crash, because the paint helpers use optional chaining, but that safety is incidental.
- **Fix:** add `let disposed = false` to the zone-stream API, set it in `api.destroy()` (or whatever the kit calls on teardown), and start both callbacks with `if (disposed) return;`. Add a test: queue a load, call destroy, fire the callback, and expect no `paintBackdrop` call.
- **Confidence:** high that the path exists; low impact.

### LOW-2: Stage 6 hatch cleanup hooks pile up and hatch sprites stay until the stage ends

- **Where:** `src/stage6-lifecycle.js:32-50`. Every `hatch()` pushes a closure onto `kit.hooks`. After the timer fires, the sprite is set to frame 1 and left alive; it is only destroyed by `restoreStage6Hooks` at stage end.
- **Why it matters:** few hatches spawn (only waves with side `'B'`), so the waste is small. But the hatch object also stays in `s.enemies` with `gone = true`, which other loops have to skip.
- **Fix:** in the timer callback, after spawning, schedule `s.time.delayedCall(600, () => h.sprite?.destroy())`. Store the hook function in a variable and splice it out of `kit.hooks` once the hatch is fully done. Make sure the enemy-list sweep removes `gone` entries.
- **Confidence:** high; low impact.

### LOW-3: The graphics-lifecycle game pause and the cutscene/Rand call pause can disagree about who owns the pause

- **Where:** `src/graphics-lifecycle.js:37-38,51` and `src/rand-call-cutscene.js:158-160`. Each one only takes ownership if `!game.isPaused` when it starts.
- **Scenario:** the WebGL context is lost during a Rand call clip. Graphics-lifecycle sees the game already paused, doesn't take ownership, and doesn't resume on restore; the Rand call resumes when it finishes. That case is correct. The reverse order (context lost, then a clip tries to start) can't happen because the update loop is stopped. I didn't find a real softlock. It's listed because the "ownership by snapshot" pattern is fragile if a third pauser is added.
- **Fix (optional hardening):** replace the snapshots with a small pause-reason set (`pauseFor(reason)` / `resumeFor(reason)`) that resumes only when the set is empty. `diagnostics.pauseReasons` already exists in the dump output, so the concept is there.
- **Confidence:** medium that today's code is correct.

---

## Checked and found OK (so nobody re-reviews them)

- **Clock freezes during Rand's strike and the Stage 5 beat.** `freezeStrike`/`freezeBeat` set the game-wide `anims.globalTimeScale = 0`, but they're undone on every teardown path: `restoreStage6Hooks` → `endStrike(kit, false)` → `thawStrike` (`src/stage6-lifecycle.js:195-199`); the shutdown hook at `:81`; `stage5-arena.js:22` `dispose()` → `thawBeat`; `stage5-lifecycle.js:14`. `stage1.js:694` also rewrites `globalTimeScale` every frame. No cross-stage animation freeze.
- **Rand call clips:** `abortRandCall` runs on shutdown; `unpauseGame` checks `pendingDestroy`.
- **Story panels:** Stages 5 and 6 free them on end, on skip, and when `startCutscene` returns false (`src/stage5.js:217-220`, `src/stage6.js:183-185`).
- **Be'lal phase transitions** (`src/belal.js:74,176-188`): HP is clamped to the phase floor, `beat`/`invuln` clear after 0.45 s on the boss's own clock, and erase sets `alive` with invuln. No stuck-invulnerable path found.
- **Audio unlock:** `installAudioLifecycle` listens to `pointerdown`/`touchend`/`keydown` (`src/audio.js:125-126`). `unlock()` (`:121`) calls `init()` and resumes.
- **Storage access** (seen-cutscene flags) is wrapped in try/catch, so cookie- or storage-blocked boots don't throw.
- **Stage 5 `metas.loial` after `releaseChars`:** the value goes stale, but `loialReady` is only reset in `riley.js:25` and `stage6.js:172`, and Loial is used once per stage, so it's harmless.

## Not covered or lower confidence

- No physical iOS device was used. Everything about real iOS limits, audio unlock ordering and video mute behaviour comes from reading code and from WebKit on Linux.
- Aginor, Balthamel and the Myrddraal boss scripts got only a skim for lock and invuln flags; no issues found, but the review was not exhaustive.
- The cutscene watchdog (`src/guard.js`) was read but not fault-injected.
