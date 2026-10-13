# Engine extraction plan: from Riley Wheel Brawl to a reusable engine (first client: Cheeseville)

*Planner: Claude Opus, Oct 13 2026. Branch `rwb-opus-plan`, cut from `rwb-w2`. This is a docs-only plan. It
makes no code changes. Every file path and line number was checked in this checkout.*

**Goal.** Turn this codebase into an engine that small commercial games (about $1 each) can be built on.
- The first client is **Cheeseville**, an original IP with **no Wheel of Time content**.
- Riley Wheel Brawl (RWB) keeps shipping from `rwb-w2` via GitHub Pages **the whole time**.
- RWB becomes the engine's first consumer, so the live game keeps proving the engine works.

**Non-goals.**
- No bundler or build step. The game stays plain ES modules plus `lib/phaser.min.js`, served statically.
- No rewrite. Code is moved and parameterised, never re-authored.
- No App Store packaging in this plan. The engine just must not block it later: relative paths only, no CDNs,
  offline-safe.

---

## 1. Constraints any migration step must respect

| Constraint | Where it comes from | Consequence for the migration |
|---|---|---|
| Live game must never break | `rwb-w2` is served by GitHub Pages | Every phase is a separate PR. Each is reversible with one revert, and its golden simulation diff is empty |
| `src/input.js`, `src/hud.js`, `lib/`, `index.html` are protected | Stage 6 contract (`docs/stage6/CONTRACT.md`) | Those 4 files stay where they are, byte-identical. The engine wraps them and never moves them |
| Existing tests are never edited | Same contract | **Tests import modules by `src/` path** (e.g. 21 tests import `../src/config.js`), so every moved module leaves a re-export shim behind (§6.2). **Some tests read source text** (§6.3), so those files cannot become shims without Jason's sign-off |
| 25,000,000-byte pre-fight gate, at 24,948,657 (about 51 KB free) | `tools/audit-stage1.mjs` | Shims cost bytes. The audit must count `engine/**` files that load before the first fight, or the gate silently stops measuring them. Net growth per phase must stay small: ≤ 4 KB, and recorded |
| iPhone: ~120 MiB GL textures | `tools/stage5/texture-dump.mjs` | The engine owns the budget tooling (§5), so Cheeseville gets the same guard rails from day one |
| CI only runs on PRs into `rwb-2` | `.github/workflows/stage1-regression.yml` (`branches: [rwb-2]`) | Phase E0 adds `rwb-w2` and the engine integration branch to the trigger |
| Node 24 in CI; Node 22.14 locally | workflow file and this VM | Keep syntax at the Node 22 level |
| `tests/stage4-placeholders.test.mjs` needs Pillow | `tools/stage4/make_placeholders.py` | A machine without Pillow fails this test (it is the only failure on a clean run here). E0 adds `requirements.txt` (`pillow`) |

---

## 2. What exists today (snapshot of `rwb-w2`)

The code is 121 files in `src/`, about 16,100 lines, plus 195 test files and per-stage tool folders.

**Scene structure.**
- `src/main.js` builds `new Phaser.Game({ scene: [Boot, Stage1, HUD] })`.
- One scene, `Stage1` in `src/stage1.js` (48.5 KB), runs **every** stage. Stage behaviour comes from:
  - the registry `STAGES[n]` in `src/stages.js` (Stages 1–3 inline; 4–6 from `src/stageN-def.js`);
  - a **kit** object per stage (Stage2Kit to Stage6Kit), whose interface is documented in `src/stages.js`:
    `build`, `start`, `update`, `destroy`, `onZoneClear`, `clearHazards`, `threats`, `dropRibbon`,
    `collectRibbon`, `onPause`, `applyLightBudget`, `ambient`, `setQuality`;
  - **monkey-patches.**
    - `src/stage5.js:223` and `src/stage6.js:189` wrap `Stage1.prototype.releaseStage` inside a `queueMicrotask`.
    - `src/stage6-lifecycle.js` `hook()` wraps scene methods per run and restores them on destroy.
    - `src/stage6-hud.js:91-95` patches HUD prototype methods.

**Coupling hot spots** (the imports that stop a file from being engine code):
- `src/stage1.js` imports `whitecloaks`, `darkfriends`, `myrddraal`, `stage2`, `stage3`, `stage4`, `cultists`,
  `loial`, `twix`, `powers`, `bot` and `music`.
- `src/hud.js` (protected) imports `myrddraal`, `twix`, `stage3-lights`, `stage4-hud` and `powers`. It also hard-codes
  `STAGE_NAMES` (`:32`), the villain regex in `speakerColor` (`:36`), and the `LOIAL READY` slot (`:181`).
- `src/guard.js` imports `twix` (freeze recovery knows about the Twix cutscene).
- `src/audio.js` (36 KB) mixes the generic voice and SFX machinery (`say`, `registerLines`, `setVoiceFiles`,
  `withSfx`, `playTrack`, `releaseClips`) with the inline WoT line tables `VOICE` and `EXTRA_VOICE`.
- `src/music.js` mixes the generic `MusicDirector` with `STAGE_MUSIC` (`:4`, frozen for 1–6).
- `src/cutscene.js` mixes the generic `CutscenePlayer` with `STAGE_CLIPS` (`:10`) and storage keys
  (`rwb-cutscenes-seen`, `rwb-cutscene`, `rwb-cutscene-hint`).
- `src/zone-stream.js` mixes generic streaming with `STREAMS` (`:6`) and Stage 6-specific bleed (`:31-32`).
- `src/texture-pages.js` mixes generic compact-normal logic with `COMPACT_STAGES` (`:3`).
- `src/assets.js:7` has the hard-coded `ALL_CHARS` list.
- `src/riley.js:36` uses `scene.callLoial?.()` as the generic "assist" entry point, and `:37` has a Stage 6 check.
  The player is `scene.riley` everywhere.

**Already engine-shaped** (zero or near-zero WoT terms, imports only other generic modules; measured with a
term grep):

| File | Bytes | Imports | Notes |
|---|---|---|---|
| `src/perf.js` | 10,708 | none | frame timing, reports |
| `src/perf-panel.js` | 9,272 | none | `?perf` overlay |
| `src/quality-governor.js` | 4,160 | `render-resources` | auto quality |
| `src/render-resources.js` | 930 | none | |
| `src/recovery.js` | 2,429 | none | stuck-state UI |
| `src/viewport.js` | 7,289 | `debug-flag` | iOS viewport fixes; keys `rwb-viewport-*` |
| `src/page-base.js` | 1,416 | none | |
| `src/debug-flag.js` | 1,311 | `page-base` | |
| `src/graphics-lifecycle.js` | 4,029 | `perf` | WebGL context loss |
| `src/graphics-notice.js` | 896 | none | |
| `src/startup.js` | 3,751 | none | boot error guard |
| `src/bootstrap.js` | 498 | `startup`, `debug-flag` | dynamic `import('./main.js')` |
| `src/fighter.js` | 3,357 | `config`, `anim-pivot` | actor base: x/y/z, physics, anim pivot |
| `src/fx.js` | 6,267 | `config` | hitstop, shake, booms |
| `src/stage5-clock.js` | 782 | none | `substeps()` at 120 Hz |
| `src/stage4-time.js` | 380 | none | `stage4Delta` |
| `src/stage6-freeze.js` | 757 | (1 term) | world freeze during a strike |
| `src/config.js` | 907 | none | `VW`, `VH`, `LANE_*`, `WORLD_W`, `q`, `clamp`/`rand`/`pick` |
| `src/input.js` | 7,091 | none | **protected**; action names are neutral (`assist`, `jump`…) |

---

## 3. Engine vs game content

**The rule:** code that would make sense in Cheeseville unchanged is engine. Names, numbers, art, audio, text
and story are content. Where a file mixes both, the **mechanism** moves to the engine and the **table** stays in
the game.

| Concern | Engine (`engine/…`) | RWB content (stays in `src/…`) | Cheeseville content |
|---|---|---|---|
| Boot and platform | `platform/`: startup, guard (minus Twix), recovery, viewport, page-base, debug-flag, graphics lifecycle/notice, render-resources, quality governor, perf, perf panel | `src/main.js` (scene list, which modules to install) | `game/main.js` |
| Core | `core/config.js` (engine defaults: `VW`/`VH`/lanes, overridable), `core/math.js` (`clamp`/`rand`/`pick`, seeded), `core/clock.js` (`substeps`, `stage4Delta` → `fixedDelta`), `core/hook.js` (from `stage6-lifecycle.js`), `core/storage.js` (namespaced session/local storage) | `src/config.js` keeps its exports (shim plus RWB overrides) | `game/config.js` |
| Actors and combat | `actors/fighter.js`, `actors/player.js` (state machine from `riley.js`, data-driven moves), `actors/enemy.js` (AI and attack tokens from `enemies.js`), `combat/resolve.js` (from `Stage1.resolveAttack`/`hitTarget`) | `RILEY_DEF`, the `ATK` table, `BALEFIRE`, enemy `TYPES`, every boss (`belal.js`, `aginor.js`, `myrddraal.js`…) | the hero def, enemy types, bosses |
| Stage runtime | `stage/registry.js` (stage lookup, `MAX_STAGE`, enable flags, `next`), `stage/brawl-scene.js` (zones, waves, spawn sides, camera lock, skip, drops, crates, pause, select, clear), `stage/kit.js` (base kit: no-op interface), `stage/release.js` (release registry) | `src/stages.js` defs, `src/stageN*.js` kits | `game/stages/*.js` |
| Streaming and textures | `render/zone-stream.js` (plan comes from the stage def), `render/texture-pages.js` (`compactNormals` flag from the stage def), `render/painted.js` (optional painted key with code-drawn fallback, from the `stage6-paint` pattern), `render/demand.js` (`pump()` from `stage5-demand.js`) | `STREAMS[n]`, `STAGE*_TEXTURES`, `paintStage6Art` | per-stage plans and art |
| Assist / call-in | `assist/rules.js` (charges, KO recharge, max calls, per-phase, gates; table-driven, from `rand-call.js`), `assist/cutscene.js` (shuffle bag, single-blob prefetch, second player, duck; from `rand-call-cutscene.js`), `assist/freeze.js` | Loial, Rand, Moiraine/Lan provider tables and effects | its own helper(s) |
| Media | `media/cutscene-player.js` (`CutscenePlayer`, `SKIP_ACTIONS`), `media/music.js` (`MusicDirector`), `media/voice.js` (`say`, `registerLines`, `setVoiceFiles`, caption fallback), `media/sfx.js` (`withSfx`, the synth helpers) | `VOICE`/`EXTRA_VOICE` tables, `STAGE_CLIPS`, music file names | its own tables |
| HUD | `hud/hud-kit.js`: a **new** neutral HUD (health, score, lives, assist slot with portrait, captions, title card, pause, help) built from the stage def. It does not replace `src/hud.js`, which is protected and stays RWB's HUD | `src/hud.js`, `src/stage*-hud.js` | uses `hud-kit` directly |
| Bots and sim | `bot/bot-core.js` (from the stage-agnostic parts of `src/bot.js`), `test/phaser-stub.mjs`, `test/sim.mjs` (from `tests/helpers/stage1-simulation.mjs`) | `bot-stage4/5/6.js`, stage bots | its own bot hooks |
| Tools | `tools/engine/*` (§5) | `tools/stage*/`, `tools/jason-narrator/`, `tools/riley_voice.py` configs | `tools/` config files |

**Content in disguise: these look generic but are game data.**
- `src/anim-pivot.js` is **generated** from `assets/chars/*.anims.json` by `tools/gen-anim-pivots.mjs`, and
  `tests/anim-pivot.test.mjs` compares the committed text.
  - The **generator** is engine (`tools/engine/gen-anim-pivots.mjs`).
  - The **output** is game data.
- `src/powers.js` (16.6 KB) is a pickup/power framework plus WoT weaves (`angreal`, `lightning`, `fireshield`,
  `airwhip`, `saangreal`).
  - The engine gets `actors/powerups.js` (pickup lifecycle, timers, HUD hook).
  - The weaves stay in RWB.
- `src/twix.js` is RWB-only: a personal in-joke.

---

## 4. Target layout and contracts

### 4.1 Repository layout (inside this repo first)

```
engine/                       # no game names, no game assets (enforced, §7)
  LICENSE                     # Jason's licence for the engine (see §7.2)
  THIRD_PARTY_NOTICES.md      # Phaser (MIT), fonts, models
  core/      config.js math.js clock.js hook.js storage.js
  platform/  startup.js guard.js recovery.js viewport.js page-base.js debug-flag.js
             graphics-lifecycle.js graphics-notice.js render-resources.js quality-governor.js perf.js perf-panel.js
  actors/    fighter.js player.js enemy.js powerups.js
  combat/    resolve.js tokens.js
  stage/     registry.js brawl-scene.js kit.js release.js validate.js
  render/    zone-stream.js texture-pages.js painted.js demand.js
  assist/    rules.js cutscene.js freeze.js
  media/     cutscene-player.js music.js voice.js sfx.js
  hud/       hud-kit.js
  bot/       bot-core.js
  meta/      save.js run-stats.js scorecard.js rewards.js shop.js skins.js soundtrack.js meta-scene.js   (§12)
  modes/     arena-rules.js arena-score.js run-record.js replay.mjs (arena-kit.js after E4)             (§13)
  test/      phaser-stub.mjs sim.mjs seeds.mjs *.test.mjs
tools/engine/
  budget.mjs  texture-dump.mjs  art.py  encode_clips.sh  gen-anim-pivots.mjs
  voice_render.py  narrator_render.py  check_loops.py  denylist.txt  boundary.mjs
src/        # RWB game, unchanged paths; generic files become 1-line shims (§6.2)
```

**Why `engine/` at the repo root instead of under `src/`:**
- The engine is served by Pages at `/engine/…`, so relative imports `../engine/core/hook.js` work without a build.
- Several tests scan `readdirSync('src')` (`tests/no-placeholder.test.mjs:86,92`,
  `tests/stage5-paint-prep.test.mjs:60`). Engine files must not change what those scans see. An engine-side
  copy of those scans is added in E0.
- `git subtree split --prefix=engine` (E7) gives Cheeseville the engine with **only engine history**, so no WoT
  file history is carried over.

### 4.2 The game manifest (new)

Each game exports one object. The engine never imports game code directly. It receives this manifest.

```js
// src/game.js (RWB) — or game/game.js (Cheeseville)
export const GAME = {
  id: 'rwb', title: 'Riley Wheel Brawl', storagePrefix: 'rwb',  // keeps today's 'rwb-*' keys byte-identical
  view: { w: 1280, h: 720, laneTop: 572, laneBot: 690, worldW: 5200 },
  stages: STAGES,               // §4.3
  chars: ALL_CHARS,             // atlas fighters
  player: RILEY_DEF,            // moves table, hurt boxes, voices
  enemies: TYPES,               // enemy type table
  voices: { tables: [VOICE, EXTRA_VOICE], dir: 'assets/audio/voice/' },
  music: MUSIC,                 // key → file
  assist: ASSISTS,              // provider per stage range (Loial 1–5, Rand 6, Moiraine/Lan 7+)
  hud: { names: STAGE_NAMES, villains: VILLAIN_SPEAKERS },
};
```

### 4.3 Data-driven stage definitions

Today's def fields (`src/stage6-def.js`) are already mostly data. The engine formalises them, adds the fields
that are hard-coded elsewhere today, and validates them in `engine/stage/validate.js` (run by a test, not at
runtime, to save bytes):

| Field | Today | Engine schema |
|---|---|---|
| `no`, `key`, `title`, `loading` | in def | same |
| `zones[]` `{at,l,r,waves|boss}` | in def | same, plus optional `stream: {plate, floor}` per zone and `bleed` |
| `drops`, `bossDrop`, `ribbon`, `crates`, `crateProp`, `cratePlanks`, `skipBoss` | in def | same |
| `boss` `{type,name,portrait,introVoice}` | in def | same; `type` resolves through `GAME.enemies` / boss registry |
| `music` `{stage,boss}` | in def **and** frozen `src/music.js:4` | **def only** |
| `clip` (intro cutscene) | `src/cutscene.js:10` and `cutscene-hooks.js:78` | `clip: 'assets/cutscenes/stage6.mp4'` in def |
| `chars`, `textures` | `STAGE_CHARS`/`STAGE_TEXTURES` maps in `stages.js` | in def |
| `compactNormals` | `src/texture-pages.js:3` | boolean in def |
| `stream` `{far, zones, bleed}` | `src/zone-stream.js:6` | in def |
| `assist` | `callInFor()` in `src/rand-call.js:14` | provider key in def |
| `hudName` | `src/hud.js:32` plus `stage6-hud.js:60` patch | in def |
| `budget` `{gpuMiB, paintedMiB}` | test constants | in def; read by `tools/engine/budget.mjs` and the memory test |
| `enabled(q)` | `stageEnabled()` switch in `stages.js:14` | function in def |
| `kit` | class reference | same (the escape hatch for bespoke mechanics) |
| `next`, `onBossPhase`, `bossDown`, `start`, `queue` | functions in def | same |

**Cheeseville example** (illustrative, original IP):

```js
export const STAGE1 = {
  no: 1, key: 'market', title: 'MARKET SQUARE', hudName: 'STAGE 1 · MARKET SQUARE — THE RAT KING',
  zones: [
    { at: 260, l: 0, r: 1280, waves: [[['rat', 'L', 0], ['rat', 'R', 1.0]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['rat', 'L', 0], ['mouse', 'R', 0.6]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['ferret', 'R', 0], ['rat', 'L', 0.5]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ],
  boss: { type: 'ratking', name: 'THE RAT KING', portrait: 'ratkingPortrait', introVoice: 'cv1_ratking_intro' },
  music: { stage: 'cv-stage1', boss: 'cv-boss1' }, compactNormals: true,
  stream: { far: 'cv1far', zones: [/* … */], bleed: [128, 48, 48, 48, 128] },
  assist: 'mayor', budget: { gpuMiB: 100, paintedMiB: 12 }, kit: null, next: () => ({ stage: 2 }),
};
```

### 4.4 Engine-level contracts that replace today's patches

| Today | Replacement | Back-compat for RWB |
|---|---|---|
| `Stage1.prototype.releaseStage` wrapped in `queueMicrotask` (`src/stage5.js:223`, `src/stage6.js:189`); `activeStages` hard-coded `[1,2,(3),(4)]` (`src/stage1.js:111-114`) | `stage/release.js`: `registerRelease(no, fn)`. `BrawlScene.releaseStage(to)` calls every registered stage other than `to` | Stage 5/6 wrappers keep working until E4. Then they call `registerRelease` instead (same effect, golden-checked) |
| `hook()` in `src/stage6-lifecycle.js` | `core/hook.js` (same code) | `stage6-lifecycle.js` imports it |
| `scene.callLoial?.()` from `src/riley.js:36` | `scene.callAssist?.()`. `BrawlScene.callAssist` asks the stage's assist provider | RWB's `Stage1` keeps `callLoial` and defines `callAssist = callLoial` |
| `stageNo === 6 && (kit.strike \|\| cutscene)` (`src/riley.js:37`, `src/stage1.js:697`) | `kit.freezesWorld()` / `kit.freezesRiley()` → engine names `freezesWorld`/`freezesPlayer` | Stage 7 plan T1 adds these; engine aliases them |
| `scene.riley` | `scene.player` | RWB subclass defines `get riley() { return this.player; }` |
| `loialReady`, `updateLoialLabel`, the `LOIAL READY` slot | `assistReady`, `hud-kit` assist slot | RWB HUD untouched (protected) |
| `rwb-*` storage keys hard-coded (`src/cutscene.js`, `src/viewport.js`, `src/rand-call-cutscene.js:46`, bag `rwb-rand-bag`) | `core/storage.js` `key(name)` → `${GAME.storagePrefix}-${name}` | prefix `rwb` keeps every existing key byte-identical (saved "seen" state survives) |
| Villain regex in `speakerColor` (`src/hud.js:36`) | `hud-kit` colours from `GAME.hud.villains` | RWB unchanged |

---

## 5. Asset pipeline and budget tooling

### 5.1 `tools/engine/budget.mjs` (generalises `tools/audit-stage1.mjs`)

Today the audit is a hand-written list:
- per-stage source sets `STAGE4_SRC`…`STAGE6_SRC` (`:52-57`);
- voice prefix regexes (`:92-95`);
- music lists;
- `walkBytes` lines for art and clips;
- a non-recursive `readdir` for `assets/cutscenes` (`:122`), so subfolders are silently unbudgeted unless they get
  their own line.

The engine version reads a per-game **`budget.json`**:

```json
{
  "preFight": { "budget": 25000000, "include": ["index.html", "lib/phaser.min.js", "assets/fonts/*.ttf", "src/*.js",
      "engine/**/*.js", "assets/{chars,bg,props,ui,powers}/*", "assets/audio/music-main.mp3", "assets/audio/voice/*.mp3"],
    "excludeLines": true },
  "lines": [
    { "id": "stage6.source", "include": ["src/stage6*.js", "src/rand-call*.js", "src/belal.js"], "budget": 196608 },
    { "id": "stage6.voices", "include": ["assets/audio/voice/{st6_,rand_,belal_,grayman_,defender_,riley_st6_}*.mp3"], "budget": 4915200 },
    { "id": "cutscenes.randCalls", "include": ["assets/cutscenes/rand/**"], "budget": 7500000 }
  ],
  "gpu": { "capMiB": 115, "perStage": { "6": 115, "7": 105 } },
  "rules": { "unbudgetedFiles": "fail" }
}
```

- **Lines are subtracted from pre-fight** (`excludeLines`). That is what today's code does by hand.
- **New rule: `unbudgetedFiles: "fail"`.** Every file under `assets/` and `src/` must match exactly one line or the
  pre-fight set. This closes the subfolder hole: today `assets/cutscenes/rand/` is only budgeted because someone
  remembered to add `walkBytes`.
- **RWB compatibility.** `tools/audit-stage1.mjs` stays and keeps printing the same JSON shape, because tests and
  docs consume it. During E5 it becomes a wrapper that calls `budget.mjs` with `budget.rwb.json`. The acceptance
  check: the old and new outputs are **identical numbers** on the same tree, compared with `diff` in the PR.

### 5.2 Texture memory

- `tools/stage5/texture-dump.mjs` becomes `tools/engine/texture-dump.mjs`. It takes `--game <manifest>` and
  `--stages 1,2,…`.
- It writes `docs/<game>/texture-<stage>.json`, and **fails** if a stage's peak exceeds `budget.gpu.perStage[n]`.
- It keeps the WebKit run. iPhone Safari is the binding target.
- Add `tools/engine/rgba.mjs`, the decoded-RGBA calculator used to write the Stage 7 plan. It uses `dimensions()`
  from the audit, so Pillow isn't needed. Run it on any folder to get width × height × 4 per file, so art can be
  sized against the budget **before** it is painted.

### 5.3 Art

- `tools/stage6/process_art.py` already says "copy JOBS, keep the functions". Its job kinds (`poses`, `props`,
  `bands`, `image`, `panels`) are generic.
- Move the functions to `tools/engine/art.py`. Each game or stage supplies `art-jobs.json`
  (`{key, kind, src, cells, capDecodedMiB, capBytes, out}`).
- Outputs:
  - `ART_STATUS.json`;
  - a generated `*-painted.js` (key → url, present);
  - a fail-fast cap report.
- `requirements.txt` at the repo root pins `pillow` (and anything else `tools/**.py` imports).

### 5.4 Clips, voice, music

- **Clips.** `tools/cutscenes/encode_rand.sh` becomes `tools/engine/encode_clips.sh <src-dir> <out-dir>
  [--kbps 160 --w 854 --h 480 --crf 29]`. It writes posters plus `ART_STATUS.json`.
- **Voice.**
  - `tools/riley_voice.py` becomes `tools/engine/voice_render.py <config.json>`. The config holds the provider
    (ElevenLabs / Kokoro), voice id, model and post-chain (trim, highpass, loudnorm targets, mono/sample rate/
    bitrate). The current DYLO and Stage 6 settings become `tools/rwb/voices.json`.
  - The narrator flow in `tools/jason-narrator/` becomes `tools/engine/narrator_render.py`, run with a reference
    clip, transcript, pronunciation-hint table and Whisper check.
  - **The reference audio stays out of the engine** (§7.2).
- **Music.** `tools/music/compose.py` and `check_loops.py` move to `tools/engine/`. Game music specs stay with each
  game.

---

## 6. Test harness

### 6.1 Engine tests
- `engine/test/phaser-stub.mjs` is extracted from `tests/helpers/stage1-simulation.mjs`. The stub stays where it
  is too, because existing tests import it, and it re-exports from the engine once the extraction is proven equal.
- `engine/test/sim.mjs` runs any `GAME` manifest headlessly: seeded (`withSeed`, `FULL_STAGE_SEEDS`), fixed
  60 Hz, a bot attached. It returns the same `summary()` fields as
  `tests/helpers/run-full-stage-simulations.mjs`.
- `engine/test/*.test.mjs` cover:
  - unit tests for `core/`, `assist/rules.js` and `stage/validate.js`;
  - a boundary test (§7);
  - a tiny neutral **fixture game** (`engine/test/fixture/`: 1 stage, code-drawn boxes, 2 enemy types) that must
    clear 9/9 seeds. Cheeseville will look like this on day one.
- Run with `node --test engine/test/*.test.mjs tests/*.test.mjs`. E0 adds the engine glob to the CI workflow.

### 6.2 Shims (how files move without breaking tests)

A moved generic module leaves exactly this at its old path:

```js
export * from '../engine/platform/perf.js';
```

- Nothing in `src/` uses `export default` (checked), so `export *` is a complete re-export.
- Each shim is about 50 bytes against the pre-fight gate. The moved file's bytes now count under
  `engine/**/*.js`, so the gate total moves only by the shim size.

### 6.3 Files that tests read as text (they cannot become shims without sign-off)

| File | Test | Why it blocks |
|---|---|---|
| `src/guard.js` | `tests/restart-fix.test.mjs:132` | asserts the line `import { showStuck } from './recovery.js'` |
| `src/anim-pivot.js` | `tests/anim-pivot.test.mjs:11` | compares the generated text (it is game data anyway: stays) |
| `src/audio.js` | 5 text reads, e.g. `tests/stage6-final-audio.test.mjs:17` | source-pattern assertions |
| `src/main.js`, `src/hud.js`, `src/input.js` | `tests/freeze-guard.test.mjs:150-155` and others | protected or pattern-checked |
| `src/stage1.js`, `src/stage3.js`, `src/stage5.js`, `src/stage6.js`, `src/cultists.js`, `src/darkfriends.js`, `src/stage4-hazards.js`, `src/stage5-art-cast.js` | various | content files: they stay in `src/` anyway |
| every `src/*.js` | `tests/no-placeholder.test.mjs:86,92`, `tests/stage5-paint-prep.test.mjs:60` | directory scans: engine copies of these scans must exist so engine code is held to the same rule |

**Policy.**
- `guard.js` and `audio.js` keep their current text.
- The engine gets **new** modules, `platform/guard.js` and `media/voice.js`, which those files may delegate to
  only in ways the text assertions still allow.
- If that's impossible, Jason approves a one-time "engine migration" test-update exception. List the exact
  assertions in the PR.
- Cheeseville uses the engine modules directly, so it is never blocked by this.

### 6.4 Golden logic snapshot

`tests/helpers/run-full-stage-simulations.mjs` records `sourceSha256` of the files it depends on, so **any move
changes the evidence file even when behaviour is identical**.
- E0 adds `tests/golden/full-stage-logic.json`†, written by the same runner **without** the `sourceSha256` and
  `baseGitCommit` fields.
- E0 adds `tests/engine-golden.test.mjs`†, which re-runs the simulation and deep-compares.
- That file is the "golden diff must be empty" check for every engine phase. Do the same for Stages 2–6, using
  `tests/helpers/stageN-harness.mjs` and the Stage 2 fingerprint from `docs/GROK-BRIEF-P1.md`.

---

## 7. Licensing hygiene

### 7.1 The engine layer contains no Wheel of Time and no personal content

`tools/engine/denylist.txt` holds case-insensitive whole-word patterns:
- **WoT:** `loial`, `rand`, `moiraine`, `lan`, `trolloc`, `myrddraal`, `fade`, `draghkar`, `aiel`, `shaido`,
  `aes sedai`, `warder`, `forsaken`, `belal`, `be'lal`, `aginor`, `balthamel`, `asmodean`, `byar`, `whitecloak`,
  `saidin`, `saidar`, `angreal`, `sa'angreal`, `ter'angreal`, `balefire`, `callandor`, `tear`, `caemlyn`, `emond`,
  `baerlon`, `shadar`, `logoth`, `mashadar`, `blight`, `rhuidean`, `ways`, `two rivers`, `dragon`, `wheel of time`.
  Short words like `rand`, `lan`, `fade` and `tear` are matched as identifiers and strings only, with an
  allowlist for `random`, `lane`, `fadeIn`/`fadeOut`, and so on.
- **Personal:** `riley`, `twix`, `twinkle`, `jason`, `rwb` (except `storagePrefix` defaults in RWB's own
  manifest).

`tools/engine/boundary.mjs` (run by `engine/test/boundary.test.mjs`) fails if any of these is true:
1. Any file under `engine/` or `tools/engine/` matches the denylist, in code, comments or strings.
2. Any file under `engine/` imports from `src/`, `assets/` or a game folder.
3. Any binary asset (image, audio, video, font) exists under `engine/`. The only exception is the code-drawn
   fixture game.

The ratchet:
- In E0 the test runs in **report mode**, and the counts are recorded in the PR.
- From E6 it is **enforced**.

### 7.2 Third-party terms the engine must carry

| Item | Status today | Action |
|---|---|---|
| Phaser 4.2.1 (`lib/phaser.min.js`) | MIT, but the minified file has **no licence header** | Add `engine/THIRD_PARTY_NOTICES.md` with the MIT text and version. Cheeseville ships the notice in an About/credits screen |
| Press Start 2P subset (`assets/fonts/press-start-2p.ttf`, renamed internally `RWB Pixel`) | SIL OFL 1.1 (`assets/fonts/OFL.txt`) | OFL allows commercial use. Cheeseville must use a reserved-name-safe family name of its own (not `RWB Pixel`) and ship `OFL.txt` |
| Kokoro voices (`assets/audio/LICENSE-KOKORO.txt`) | Apache-2.0 | Fine commercially; keep the notice |
| CosyVoice 3 (`Fun-CosyVoice3-0.5B`) | Apache-2.0 model | Fine. Jason's narrator clone is his own consented voice. **The reference WAV and transcript never go in the engine or in Cheeseville's repo**; keep them private |
| ElevenLabs lines | Commercial use needs a paid plan **at generation time**; check the current ElevenLabs terms before Cheeseville launches | Record plan and date per line in each game's `VOICE_PROVENANCE.md` (RWB already has `assets/audio/VOICE_PROVENANCE.md`) |
| Grok Imagine clips and other AI art | Check the provider's commercial terms at launch | Keep per-asset provenance (`ART_STATUS.json` already records the source) |
| Engine code itself | Unlicensed today (private repo) | Jason picks a licence. Default: proprietary, "All rights reserved", in `engine/LICENSE` |

### 7.3 Cheeseville starts clean
- Create Cheeseville from `git subtree split --prefix=engine` (§9, E7), never as a fork of this repo. This repo's
  history holds every WoT asset (`.git` is about 467 MB).
- Cheeseville's own `budget.json`, `index.html`, `assets/`, fonts and `THIRD_PARTY_NOTICES.md` are written fresh.
- **No RWB asset is ever copied**, not even "temporary" ones.
- Stored keys use the prefix `cv-`, so the two games never read each other's saved state on the same origin.

---

## 8. Things that are not engine (on purpose)

These are kept out to keep the engine small:
- `src/hud.js`. It is protected, and too RWB-specific. `hud-kit` is new and lean.
- Story/cutscene scripts, line tables, music specs, `plan/`, `docs/stageN/`, `spike-art/`, and `art-in/`
  (75 MB of source art).
- `src/stage2.js`–`src/stage6*.js` and the bosses. If a later game wants a "rhythm volley" or a "plate-stream
  arena", lift the **mechanism** into `engine/` then, with its own tests. Never move a WoT file wholesale.

---

## 9. Staged migration plan

### 9.1 Rules for every phase
1. Every phase is one PR from `engine-wN`† (cut from the then-current `rwb-w2`) as a **draft into `rwb-w2`**.
   Jason merges.
2. The golden logic diff (§6.4) is empty for Stages 1–6 (and 7 once it exists). The Stage 2 fingerprint is
   identical.
3. `node --test tests/*.test.mjs engine/test/*.test.mjs` is green. The Pillow baseline is fixed in E0.
4. The pre-fight gate stays under 25,000,000. The delta is in the PR body.
5. Protected files are byte-identical (`tests/stage6-protected*.test.mjs` already enforce this).
6. Each PR includes a raw.githack preview URL of its head SHA, played through Stage 1 on an iPhone (or WebKit
   with the iPhone profile).
7. **Rollback** is `git revert <merge>`. No phase depends on a later phase to be correct.
8. **Order relative to Stage 7.** Stage 7 T1 (`docs/STAGE7-PLAN.md` §0.2) lands first. E2 then absorbs T1's
   predicates rather than fighting them. Don't run engine phases and Stage 7 tasks on the same files at the same
   time. E4 (the scene split) waits until Stage 7 T15 is merged.

### 9.2 Phases

| Phase | What | Files | Acceptance |
|---|---|---|---|
| **E0. Guard rails** | Golden logic snapshot plus test; Stage 2–6 snapshots; `requirements.txt` (pillow); CI trigger adds `rwb-w2` and `engine-*` branches and the engine test glob; `tools/engine/boundary.mjs` and `denylist.txt` in report mode; engine copies of the `src/` scans (`no-placeholder`, `fillText`) pointed at `engine/` | `tests/golden/*.json`†, `tests/engine-golden.test.mjs`†, `requirements.txt`†, `.github/workflows/stage1-regression.yml`, `tools/engine/*`†, `engine/test/boundary.test.mjs`†, `engine/test/scans.test.mjs`† | Full suite green on a clean VM after `pip install -r requirements.txt`; golden test fails if any one combat constant is changed (prove with a throwaway local edit, not committed); boundary report counts in the PR |
| **E1. Leaf extraction** | Move the zero-coupling modules to `engine/` and leave shims: `perf`, `perf-panel`, `quality-governor`, `render-resources`, `recovery`, `viewport`, `page-base`, `debug-flag`, `graphics-lifecycle`, `graphics-notice`, `startup`, `fx`, `fighter`, `stage5-clock` (as `core/clock.js` `substeps`), `stage4-time`. Audit counts `engine/**/*.js` in pre-fight. **Not** `guard.js` (text-read), not `anim-pivot.js` (data) | `engine/platform/*`, `engine/core/clock.js`, `engine/actors/fighter.js`, `engine/render/fx.js`, the shims in `src/`, `tools/audit-stage1.mjs` | Golden empty; pre-fight delta ≤ +1 KB; boundary report shows 0 hits in `engine/`; each moved file is byte-identical to its old content except relative import paths (`git diff -M` shows renames ≥ 95%) |
| **E2. Registries and tables** | `stage/registry.js` (`MAX_STAGE`, `enabled`, `resolveStage`, `stageFromQuery`, `next`) used by `src/stages.js`; `music` and `clip` read from defs (fallback to the old tables, then the old tables go away); `core/storage.js` with prefix `rwb`; `stream`, `bleed` and `compactNormals` from defs; `render/zone-stream.js` and `render/texture-pages.js` become table-free | `engine/stage/registry.js`†, `engine/core/storage.js`†, `engine/render/zone-stream.js`, `engine/render/texture-pages.js`, `src/stages.js`, `src/stageN-def.js`, `src/music.js`, `src/cutscene.js`, `src/cutscene-hooks.js`, `src/zone-stream.js` (shim), `src/texture-pages.js` (shim) | Golden empty; every storage key string observed in a stubbed `sessionStorage` run is identical before/after; Stage 6 plate rects pinned identical |
| **E3. Generic systems** | `core/hook.js` (from `stage6-lifecycle.js`); `assist/rules.js` (table-driven; RAND and CALL7 tables are data in `src/`); `assist/cutscene.js` (from `rand-call-cutscene.js`, bag key via storage); `assist/freeze.js`; `render/demand.js` (`pump`); `render/painted.js` (optional key plus fallback); `media/cutscene-player.js`, `media/music.js` (`MusicDirector`), `media/voice.js` (new, for the engine; `src/audio.js` untouched unless allowed, §6.3) | `engine/core/hook.js`, `engine/assist/*`, `engine/render/{demand,painted}.js`, `engine/media/*`; `src/rand-call.js`, `src/rand-call-cutscene.js`, `src/stage6-lifecycle.js`, `src/stage6-freeze.js`, `src/stage5-demand.js`, `src/cutscene.js` | Golden empty; `tests/rand-*` and `tests/stage6-*` green unedited; `assist/rules.js` unit tests reproduce every Rand rule test with the RAND table |
| **E4. Scene split** | `stage/brawl-scene.js` takes the generic body of `Stage1`. RWB `Stage1 extends BrawlScene` with WoT overrides (Loial, Twix, balefire, carts, story, Stage 2–4 starters). `stage/release.js` replaces the `releaseStage` prototype wrappers. `callAssist`, `player` and `freezesPlayer` aliases added. Do it in 4 sub-PRs: **E4a** camera, zones, waves, spawn sides, skip; **E4b** attack resolution and hit targets (`resolveAttack`, `hitTarget`, fireball plumbing); **E4c** barrels, pickups, crates, drops; **E4d** pause, select, start, clear, release registry | `engine/stage/{brawl-scene,kit,release}.js`†, `src/stage1.js`, `src/stage5.js`, `src/stage6.js` | Golden empty **per sub-PR**; `src/stage1.js` shrinks (record size); `Stage1.prototype.releaseStage` is no longer reassigned anywhere (`rg "releaseStage = function" src` returns nothing after E4d); 60 fps p95 unchanged on the reference device |
| **E5. Tools** | `tools/engine/budget.mjs` plus `budget.rwb.json` (old audit becomes a wrapper with identical numbers); `texture-dump.mjs --game`; `art.py`; `encode_clips.sh`; `voice_render.py` / `narrator_render.py` with configs; `rgba.mjs`; `gen-anim-pivots.mjs` | `tools/engine/*`, `tools/audit-stage1.mjs`, `tools/rwb/*.json`† | `node tools/audit-stage1.mjs` output identical before/after (diff in PR); `budget.mjs` reports **0 unbudgeted files** for RWB (fix any found by adding lines, never by raising budgets silently) |
| **E6. Enforce the boundary** | Boundary test switches from report mode to enforced; `engine/LICENSE`, `engine/THIRD_PARTY_NOTICES.md`; `hud/hud-kit.js` and `bot/bot-core.js`; the fixture game clears 9/9 | `engine/**` | Boundary test green with 0 allowlisted hits beyond the documented short-word list; fixture game 9/9 seeds |
| **E7. Split** | `git subtree split --prefix=engine -b engine-v0.1` and tag `engine-v0.1.0`. Push it to a private `engine` repo (or straight into the new Cheeseville repo with `git subtree add --prefix=engine`). Document the update flow in `engine/README.md`: `git subtree pull --prefix=engine <engine-remote> <tag>` both ways | (git only) | Cheeseville repo builds with **no** RWB history (`git log --all -- src/stage1.js` is empty there); `boundary.mjs` passes inside the new repo |
| **E8. Cheeseville vertical slice** | New repo: `index.html` (written fresh), `game/main.js`, `game/game.js`, `game/stages/stage1.js`, code-drawn art for every key (`render/painted.js` fallbacks), `budget.json`, `tests/` using `engine/test/sim.mjs` | Cheeseville repo | Boots on iPhone Safari; 1 stage clears 9/9 seeds with the bot; pre-fight ≤ its own budget; texture peak ≤ 100 MiB; no denylisted term anywhere in the repo |

**Effort shape.**
- E0–E3 are low-risk, mechanical moves, each guarded by the golden test.
- E4 is the only invasive phase, because `src/stage1.js` is the god-scene. That's why it is split four ways and
  comes after Stage 7.
- E5–E8 are tooling and new code that cannot affect the live game.

---

## 10. Cheeseville: what it gets on day one (after E8)

- The same iPhone-proven platform layer: viewport fixes, freeze guard and recovery, WebGL context-loss handling,
  quality governor, perf overlay.
- The same combat feel: `Fighter`, the player state machine, enemy AI with attack tokens ≤ 2, hitstop and shake,
  120 Hz substeps.
- 4-zone stages from data, with zone streaming, compact normals, and painted art that falls back to code-drawn
  art.
- An assist/call-in system with cutscene playback that never blocks gameplay.
- Byte and GPU budget gates, an art processor with caps, clip encoding, and voice/narrator pipelines.
- A headless, seeded simulation harness with bot clears as the acceptance gate.
- Meta-progression (§12): scorecard with letter grades, coins, a shop for skins and soundtracks, and a local
  save. No real-money purchases.
- Arena mode (§13): endless scaled waves on any shipped stage, with replayable, leaderboard-ready run records.

What Cheeseville writes itself:
- its manifest;
- its stage defs and any bespoke kits;
- its enemy and boss classes;
- its art, audio and text;
- its `index.html` and touch layout. `src/input.js`'s action names are reusable; copy the file into Cheeseville,
  where it is not protected.

---

## 11. Where meta-progression and Arena mode fit

Meta-progression (§12) and Arena mode (§13) are **engine features written engine-first**.
- Their rules live in `engine/meta/` and `engine/modes/` from the first commit, and pass the denylist and boundary
  test from day one (§7.1).
- RWB is their first user. Thin adapters in `src/` connect them.
- Cheeseville gets them unchanged after E7.

Build order across every workstream: `docs/CAMPAIGN-ARC-PLAN.md` §4. In short:
1. Stage 7.
2. E0 (it may start earlier, see J4).
3. M1–M8.
4. A1–A9.
5. Stages 8 and 9.
6. E1–E8.

**Shared rules for M and A tasks** (on top of the §9.1 rules):
- **Zero pre-fight bytes beyond a ≤ 1 KB installer.**
  - Meta and arena code is loaded with dynamic `import()`, either on the first stage clear or when the player opens
    the shop or arena.
  - New audit line `meta.source`† (`engine/meta/**`, `engine/modes/**`, `src/meta-*.js`, `src/arena-*.js`), budget
    64 KB.
  - Test `engine/test/lazy.test.mjs`† parses static imports from `src/bootstrap.js` and fails if any static chain
    reaches those files.
- **Campaign behaviour is untouched.** The golden logic snapshot (§6.4) stays empty with meta installed. The
  tracker only observes; it never changes a number.
- **The protected files stay protected.**
  - The UI is a separate Phaser scene, `MetaScene`†. The installer adds it at runtime with
    `game.scene.add('meta', MetaScene, true)`, drawn above the HUD.
  - It never edits `src/hud.js` or `index.html`.
  - Menus use the existing `game.inp` actions (move, attack = confirm, jump = back, pause) plus pointer taps. They
    add no new keys and no DOM buttons.
- **No real money, ever.**
  - No payment APIs, no network calls, no ads.
  - Test `engine/test/no-iap.test.mjs`† fails on `PaymentRequest`, `fetch(`/`XMLHttpRequest` to any absolute URL,
    or any StoreKit or billing bridge string in `engine/meta/**`, `engine/modes/**`, `src/meta-*` or
    `src/arena-*`.

---

## 12. Meta-progression module (`engine/meta/`)

### 12.1 What the player sees
1. **End-of-level scorecard.** It appears after each stage clear, and after a campaign clear or an arena run ends.
   - A letter grade **S/A/B/C/D** with a per-category breakdown: time, damage taken, best combo, clean run.
   - Coins earned, with a count-up, and the new coin total.
   - It is drawn by `MetaScene` as a side panel at the right of the screen, so it never overlaps the existing
     stage-clear card text in `src/hud.js:305-312`, which is centred.
2. **Shop.** Reached from a `SHOP` button `MetaScene` draws on the title card, and from the scorecard.
   - The player buys and equips **skins** and **soundtracks** with coins only.
   - It shows owned/equipped state, and an "export / import save" panel (§12.5).

### 12.2 Modules

| File † | Kind | Responsibility |
|---|---|---|
| `engine/meta/save.js` | pure; storage injected | Load, validate, migrate and write the save. Falls back to memory when storage fails (§12.5) |
| `engine/meta/run-stats.js` | scene adapter (hooks) | Observes one run: time, damage taken, hits landed, KOs, max combo, deaths, continues, call-ins used, secrets (ribbons). Read-only hooks via `core/hook.js` |
| `engine/meta/scorecard.js` | pure | `grade(stats, rubric)` → `{letter, points, parts: {time, damage, combo, clean}}` |
| `engine/meta/rewards.js` | pure | `coinsFor({letter, firstBest, mode, score, wave})`, per-mode caps |
| `engine/meta/shop.js` | pure | `buy(save, catalog, id)`, `equip(save, id)`, `owned(save, id)`. Returns a new save or `{error}` |
| `engine/meta/skins.js` | adapter | Applies the equipped skin: a tint tier or a page-swap tier (§12.4) |
| `engine/meta/soundtrack.js` | adapter | Maps equipped tracks onto the game's music keys before playback |
| `engine/meta/meta-scene.js` | Phaser scene | Scorecard view, shop view, title `SHOP` button, coin badge. Neutral styling; font, colours and strings come from the game manifest |
| `src/meta-rwb.js` | RWB content | RWB catalog, per-stage rubrics, strings, installer (≤ 1 KB static, the rest lazy) |

The game manifest (§4.2) gains a `meta` block:

```js
meta: {
  storagePrefix: 'rwb',                       // save key: 'rwb-save'
  rubric: { 1: { parTime: 210, comboTarget: 20, damageBudget: 240 }, /* … per stage … */ },
  catalog: [
    { id: 'tint-ember', kind: 'skin', tier: 'tint', price: 150, tint: [0xffd2a0, 0xff9a60] },
    { id: 'skin-warder', kind: 'skin', tier: 'pages', price: 400, pages: 'assets/skins/warder/riley' },
    { id: 'ost-boss6-alt', kind: 'music', price: 250, track: 'assets/audio/alt/boss6-alt.mp3', slot: 'boss6' },
  ],
  coins: { S: 120, A: 80, B: 50, C: 30, D: 15, firstBestBonus: 0.5, arenaCap: 120 },
}
```

### 12.3 Grading (pure, deterministic, unit-tested)

| Part | Weight | 100 points when | 0 points when |
|---|---|---|---|
| Time | 30 | time ≤ `parTime` | time ≥ 2 × `parTime` (linear between) |
| Damage taken | 35 | 0 damage | damage ≥ `damageBudget` (linear) |
| Best combo | 20 | maxCombo ≥ `comboTarget` | 0 (linear) |
| Clean | 15 | 0 deaths | 50 points off per death (floor 0) |

**Letter:**
- **S** needs ≥ 95 points **and** 0 deaths.
- **A** ≥ 85, **B** ≥ 70, **C** ≥ 50, otherwise **D**.
- **Any continue caps the grade at C.**

**Calibration.** `parTime` = 1.1 × the median bot clear time, and `damageBudget` = 1.5 × the median bot damage
taken, over `FULL_STAGE_SEEDS`. `tools/engine/calibrate-rubric.mjs`† generates them from the simulation harness and
writes `src/meta-rwb.js` rubric values. Recalibrate whenever a stage's balance changes.

**Stats sources in RWB.**
- `Stage1.stats()` (`src/stage1.js:381`) already gives score, max combo, time, lives and ribbons.
- `run-stats.js` adds the rest by wrapping:
  - `riley.takeHit` (`src/riley.js:219`) for damage;
  - `onEnemyDie` (`src/stage1.js:368`) for KOs;
  - `rileyDied` (`:382`) for deaths;
  - `continueGame` (`:390`) for continues;
  - `callLoial` for call-ins.

  Every wrapper calls the original first and returns its result untouched, and all are restored on stage release.
  A test asserts function identity after release.
- **Engine code never names these methods.** `run-stats.js` takes a hook map, e.g.
  `{ hurt: [player, 'takeHit'], ko: [scene, 'onEnemyDie'], … }`. `src/meta-rwb.js` supplies RWB's names
  (`riley`, `callLoial`), so the denylist (§7.1) stays clean.

### 12.4 Coins, skins and soundtracks

**Coins.**
- Stage clear: by letter, using the `coins` table. **+50%** the first time a new best letter is reached on that
  stage.
- Campaign complete (Stage 9 clear): +300 once.
- Arena: §13.4.
- Prices: tint skins 150, page skins 400, soundtracks 250.
- **Pacing target:** a full campaign at B grades (about 9 × 50 + 300 = 750 coins) buys 2–3 items. The whole RWB
  catalog (about 3 tints, 2 page skins, 4 tracks ≈ 2,250 coins) takes about 2 campaign runs plus some arena
  play. Tune by changing prices, never by changing grading.

**Skins, in two tiers sized to the iPhone budget.**
1. **Tint tier: zero texture memory.**
   - `setTint(top, bottom)` on the player sprite, a multiply on the lit pipeline.
   - **M6 must verify** that the Phaser 4 lit pipeline honours tint with normal maps on. Check it with an art-shot
     diff before shipping any tint skin.
2. **Page tier: memory-neutral.**
   - Alternative **colour** pages for the player atlas (`riley-0.webp`, `riley-1.webp`) are loaded **in place of**
     the default colour pages, under the same texture key.
   - The frame JSON, anim JSON and normal maps (`_n`/`_nl`) are reused unchanged.
   - **Decoded cost is identical:** Riley's colour pages are 32.49 MiB either way, and the two are never resident
     together.
   - **Disk:** Riley's colour pages are 2,079,478 + 144,436 = 2,223,914 bytes. Each page skin must be ≤ that, so
     the pre-fight inventory upper bound cannot grow when a skin replaces the default.
   - New audit line `skins`† (`assets/skins/**`), 9,000,000 bytes, outside the pre-fight gate.
   - `tools/engine/skin.py`† recolours the default pages with a hue/value map, keeps alpha **byte-identical**, and
     fails if any page's dimensions differ from the default.
   - Test: `texture-dump` with a page skin equipped is within ±0.1 MiB of default.
   - Never ship a skin as a second resident atlas. That would cost +32 MiB, and the Stage 6 peak is already
     110.91 MiB.

**Soundtracks.**
- Unlockable tracks in `assets/audio/alt/`† are ≤ 1,200,000 bytes each, with a new audit line `music.alt`†.
- They play through the existing streamed `<audio>` element path (`src/audio.js:303`, `new Audio(url)`), so there
  is **no decoded-PCM memory cost**.
- Equipping a track overrides one music slot (e.g. `boss6`), applied by swapping the `MUSIC[key]` url before
  playback. That is the same mutation pattern `src/stage6.js` already uses to register `stage6`/`boss6`.
- The title screen gets a **jukebox** row listing owned tracks.

### 12.5 Local save

- **Key:** `${storagePrefix}-save` (RWB: `rwb-save`; Cheeseville: `cv-save`) in `localStorage`. Example:

  ```json
  { "v": 1, "coins": 0, "owned": [], "equipped": { "skin": null, "music": {} },
    "best": { "6": { "letter": "A", "score": 48210, "time": 231.4 } },
    "arena": { "boards": { "rwb-6": [ { "score": 0, "wave": 0, "date": "2026-10-13", "seed": 0 } ] } },
    "stats": { "clears": 0, "campaignComplete": false }, "sum": "crc32" }
  ```

- **Writes** happen only on clear, purchase, equip and arena end. Never per frame.
- `sum` is a CRC to detect **corruption**, not cheating. A corrupt save is renamed to `-save-bad`, never deleted,
  and the game starts a fresh save.
- **Migrations:** `migrate[v]` functions chained up to the current version, each with a fixture test.
- **Failure modes.** In Safari private mode or when the quota is exceeded, `setItem` throws. Fall back to an
  in-memory save and show a one-line notice on the scorecard: "Progress can't be saved in this browser mode." The
  game never blocks on storage.
- **Safari storage eviction.** iOS Safari may delete script-written storage for a site that hasn't been visited
  in 7 days. Installed home-screen web apps are exempt. Mitigations:
  - call `navigator.storage.persist()` when it's available;
  - provide **export/import save codes** (base64 of the JSON plus its CRC) in the shop's settings panel;
  - the shop shows a hint to add the game to the home screen.
- **Existing rules that still hold.** `tests/freeze-guard.test.mjs:154-156` asserts that `hud.js`, `perf.js`,
  `perf-panel.js`, `debug-flag.js`, `main.js` and `guard.js` never touch storage. The save lives only in
  `engine/meta/save.js`, so this still holds.

### 12.6 Build tasks (Grok 4.7, sequential, after E0)

| # | Task | Acceptance |
|---|---|---|
| M1 | `save.js`: schema v1, CRC, migrate chain, memory fallback, export/import codes; storage injected | Unit: round-trip; a corrupt save is kept as `-bad`; a throwing `setItem` falls back to memory; a code import rejects a bad CRC; boundary/denylist clean |
| M2 | `scorecard.js` and `rewards.js` | Table tests at every letter boundary; a continue caps at C; S needs 0 deaths; the first-best bonus applies once; deterministic |
| M3 | `run-stats.js` plus `src/meta-rwb.js` hooks (no UI); `tools/engine/calibrate-rubric.mjs` writes rubrics for Stages 1–7 | Golden logic snapshot empty with the tracker on; hooks restored on release (identity test); harness stats equal hand-counted values on seed 1 |
| M4 | `MetaScene` plus scorecard view after every clear; coins credited and saved; lazy import | Pre-fight ≤ +1 KB; `lazy.test` green; scorecard never overlaps the clear-card text (bounds test); touch, keyboard and pad all dismiss it |
| M5 | `shop.js`, RWB catalog, shop view from the title `SHOP` button, buy/equip/owned, jukebox row | Unit: can't buy without coins, can't buy twice, equip only owned items; `no-iap.test` green; works with pointer only and with pad only |
| M6 | Skins: tint tier plus page tier; `tools/engine/skin.py`; one tint and one page skin for RWB | Art-shot diff shows the tint under lighting; page skin ≤ 2,223,914 bytes, dimensions identical, alpha identical; `texture-dump` equipped is within ±0.1 MiB of default; `skins` line PASS |
| M7 | Soundtracks: 2 alt tracks, slot override, jukebox playback | Each ≤ 1.2 MB, `check_loops.py` passes; `music.alt` line PASS; override reverts when unequipped |
| M8 | Hardening: private mode, quota, eviction (export/import), `persist()`, iPhone browser pass; migration v1→v2 scaffold test | No console errors in 5 runs; save survives a reload; memory-fallback notice appears when storage throws |

---

## 13. Arena mode (main game engine)

Arena mode is built on the **main game**:
- `Stage1` scene, kits and `Fighter`/`Enemy`;
- the stage's own enemy types, art and backdrops;
- the call-in rules.

It is not a separate mini-game. It reuses one existing stage's content per arena, so its memory is bounded by
that stage's already-measured budget.

### 13.1 What the player sees
- **Entry.** An `ARENA` button on the title card (drawn by `MetaScene`) lists unlocked arenas. An arena for
  Stage N unlocks after Stage N is cleared once. `?arena=N` always works, for testing.
- **Play.** Endless waves on one locked screen of Stage N's backdrop. There is no story, no cutscenes and no
  clips.
  - **3 lives, no continues.**
  - The call-in uses the stage's own provider with arena rules (§13.3).
- **End.** A results panel shows wave reached, score, kills, best combo, coins earned, and the **local top 10** for
  that arena. It also offers a **daily seed** run: the same waves for everyone that day, which makes leaderboards
  meaningful later.

### 13.2 Modules

| File † | Kind | Responsibility |
|---|---|---|
| `engine/modes/arena-rules.js` | pure | `waveFor(n, pool, rng)` → `[[type, side, delay], …]`; scaling; caps; elite and boss-lite cadence; drop and heal cadence |
| `engine/modes/arena-score.js` | pure | Score from events (kills, combo, waves, time); anti-farm rules |
| `engine/modes/run-record.js` | pure | Leaderboard-ready run record, input log (RLE), digest |
| `engine/modes/replay.mjs` | node tool via the sim | Replays a run record headlessly and recomputes the score |
| `src/arena-kit.js` | RWB adapter | `ArenaKit` and `arenaDef(N)`: wraps Stage N's kit for visuals only (`build`, `ambient`, `applyLightBudget`, `setQuality`, `destroy`) and disables its zone-driven hazards and story |
| `src/arena-rwb.js` | RWB content | Per-arena pools, elite/boss-lite choices, which plate is the arena screen, strings |

`ArenaKit` is generalised into `engine/modes/arena-kit.js` once `BrawlScene` exists (E4).

### 13.3 Rules (all numbers in `arena-rules.js`, unit-tested)

- **Arena screen:** one zone of the base stage, e.g. Stage 6 zone 1 (`bg6mid2` plus `bg6floor`). The camera is
  locked at that zone's `l`–`r`, and only that plate, its floor and the far plate are resident (`STREAMS[N]`
  restricted to one zone).
- **Enemy pool:** only types that already appear in Stage N's waves and are already in its char or texture lists.
  The arena **never loads a type its stage doesn't**.
- **Wave n (1-based):**
  - spawn count = `min(3 + floor(n / 2), 10)`, with **at most 6 alive at once**; the rest queue;
  - HP × `min(1 + 0.06 (n−1), 2.5)`;
  - damage × `min(1 + 0.03 (n−1), 1.6)`;
  - speed × `min(1 + 0.02 (n−1), 1.3)`.
- **Never scaled:** attack tokens (always ≤ 2, the hardening rule), tell durations (never shorter than the base
  type's), and grab break rules. Difficulty comes from numbers and mixes, never from unfair reads.
- **Every 5th wave:** one elite (the stage's elite, e.g. `fadelt` on Stages 6–9), and +25 HP to Riley.
- **Every 10th wave:** **boss-lite**, the stage boss with 40% HP, phase 1 only, and no story lines.
  - It needs an `arenaLite` option on each boss class. The campaign never sets that option, and the golden
    snapshot proves that.
  - The boss sheet is loaded on demand with `pump()` before wave 10, then released after.
- **Drops:** one power pickup every 3 waves, from the stage's own `drops` kinds.
- **Call-in:** 1 charge, recharged after 15 KOs **and** 60 s. There is no per-stage maximum. `bossFrac` applies to
  boss-lite only.
- **Determinism:** all randomness comes from a seeded RNG (`core/math.js`). Daily seed = hash of `YYYY-MM-DD` and
  the arena id.

### 13.4 Scoring and coins (leaderboard-ready)

**Score.**
- Σ(kill value × combo multiplier) + 250 × n per wave cleared + 500 for a no-damage wave + 10 per second survived.
- Kill values come from the existing enemy `score` fields.
- Combo multiplier = `1 + min(combo, 50) / 25`, so at most 3×.
- **Anti-farm:** an enemy alive for more than 25 s without attacking despawns with no score. A wave's time bonus
  stops after 90 s.

**Run record** (`run-record.js`):

```json
{ "schema": 1, "game": "rwb", "mode": "arena", "arena": "rwb-6", "build": "<rwb-build meta + git sha>",
  "seed": 2026101306, "daily": true, "durationMs": 412345, "wave": 14, "score": 98210, "kills": 77,
  "maxCombo": 31, "inputs": "<base64 RLE of the per-step action bitmask>", "digest": "sha256(...)" }
```

- **Fixed step.** Arena logic runs on a fixed 60 Hz accumulator, using the existing `stage4Delta`/`substeps`
  clocks, so a recorded input log replays exactly.
- **Input log size.** The action bitmask covers the `src/input.js` actions. RLE of a 10-minute run is typically
  10–40 KB. It is stored only for the **best 3** runs per arena, to keep the save small.
- **Replay check.** `engine/modes/replay.mjs` replays the record through `engine/test/sim.mjs` and must reproduce
  `score`, `wave` and `kills` exactly. That is what a future server-side leaderboard would run. **There is no
  server now** and no network code (`no-iap.test`).
- **Local boards:** top 10 per arena, plus a separate daily board, in the save (§12.5).

**Coins.** 5 per wave cleared plus 1 per 2,000 score, **capped at 120 per run**. The first daily-seed run each day
earns × 2.

### 13.5 Memory and performance

**Texture memory.**
- An arena run's peak must be **≤ its base stage's measured peak**. It uses a subset of the stage's assets, and
  one plate instead of two.
- Boss-lite is the only spike. It loads at wave 9 or 10 and is released after.
- Gate per arena: ≤ the base stage's peak and ≤ 105 MiB, using `texture-dump` with `RWB_STAGES=N` and `arena=1`.

**First arenas.**
- **Stage 6** (110.91 MiB campaign peak, so the arena must measure lower).
- **Stage 7** (an estimated 89 MiB).

**Later arenas.**
- Stages 1–5 get arenas only after each is measured in arena mode, because those stages load full normals.
- Stages 8 and 9 get arenas when they ship.

**Performance.**
- At most 6 enemies alive and ≤ 10 lights.
- 60 fps p95 at wave 20, measured on WebKit with the iPhone profile, using a forced-spawn bot.

### 13.6 Build tasks (Grok 4.7, sequential, after M3; needs Stage 7 T1)

| # | Task | Acceptance |
|---|---|---|
| A1 | `arena-rules.js`: `waveFor`, scaling curves, caps, cadences | Table tests: counts/HP/damage/speed per wave and caps; tokens ≤ 2 and tells unscaled for every n ≤ 100; same seed gives the same waves |
| A2 | `arena-score.js` and `run-record.js` (RLE, digest) | Unit: combo multiplier caps at 3×; anti-farm despawn earns no score; RLE round-trip; digest stable |
| A3 | `ArenaKit` plus `arenaDef(6)`: one-zone lock, single-plate stream, pool spawns, 3 lives with no continue, results hand-off; `?arena=6` | Boots and runs 10 waves in the harness; campaign golden snapshot empty; Stage 6 kit hazards never tick in the arena (spy test); stage release leaves no arena keys |
| A4 | Fixed-step arena loop, input recording, `replay.mjs` | Record a bot run on 3 seeds, replay: identical score/wave/kills; replay is independent of render frame rate (run at 30/60/120 fps in the harness) |
| A5 | Elites, boss-lite (`arenaLite` on `belal.js` first), drops, heal; deferred boss sheet load and release | Campaign golden snapshot unchanged (`arenaLite` off); boss sheet released after the boss-lite wave (texture-key assertion); boss-lite P1 only, 40% HP |
| A6 | Arena HUD (wave and multiplier, via a HUD patch like `stage6-hud.js`), results panel in `MetaScene`, local and daily boards, coins | Coins capped at 120 per run; daily ×2 once per day (date injected in tests); boards keep top 10 sorted; the save stores inputs for the best 3 only |
| A7 | Memory and performance: `texture-dump` for arena 6; 6-alive cap; 60 fps p95 at wave 20 | Arena 6 peak ≤ Stage 6 peak and ≤ 105 MiB; fps evidence in the PR |
| A8 | `arenaDef(7)`; unlock rule (stage cleared once); title `ARENA` list | Locked arenas are hidden (or greyed out) unless `?arena=`; Stage 7 arena memory ≤ Stage 7 peak |
| A9 | Arena bot plus difficulty tuning; hardening (pause, governor drop, tab hide/restore mid-wave, death during boss-lite) | Bot's median death wave between 8 and 20 on 9 seeds (the tuning target); no console errors in 5 runs; iPhone pass |

**For Cheeseville.** `arena-rules`, `arena-score`, `run-record`, `replay` and the meta modules work unchanged.
Cheeseville supplies its pools, boss-lite choices and catalog in its manifest.

---

## 14. Decisions for Jason (defaults apply if no answer)

| # | Question | Default |
|---|---|---|
| J1 | Engine at repo-root `engine/`, split later via `git subtree`? | **Yes** |
| J2 | Engine licence | **Proprietary, all rights reserved** |
| J3 | One-time test-update exception for text-reading tests (§6.3), so `guard.js`/`audio.js` can delegate to the engine? | **No.** RWB keeps its copies and Cheeseville uses the engine's |
| J4 | Start E0 before Stage 7 ships? | **Yes**, but only E0–E1 (no shared files with Stage 7). E2+ waits for Stage 7 T1; E4 waits for Stage 7 T15 |
| J5 | CI: also run on PRs into `rwb-w2`? | **Yes** (E0) |
| J6 | Meta-progression in RWB too (scorecard, coins, shop), or only in commercial games? | **Both.** RWB is the proving ground; it's a lazy-loaded side panel that changes no campaign numbers |
| J7 | Grade letters S/A/B/C/D with a continue capping the grade at C | **Yes** |
| J8 | First arenas: Stages 6 and 7 only (measured budgets); Stages 1–5 later after arena memory runs | **Yes** |
| J9 | Daily-seed arena runs (the same waves for everyone each day) | **Yes**: free leaderboard fairness later, and no server needed now |
