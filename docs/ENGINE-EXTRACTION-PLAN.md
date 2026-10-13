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

What Cheeseville writes itself:
- its manifest;
- its stage defs and any bespoke kits;
- its enemy and boss classes;
- its art, audio and text;
- its `index.html` and touch layout. `src/input.js`'s action names are reusable; copy the file into Cheeseville,
  where it is not protected.

---

## 11. Decisions for Jason (defaults apply if no answer)

| # | Question | Default |
|---|---|---|
| J1 | Engine at repo-root `engine/`, split later via `git subtree`? | **Yes** |
| J2 | Engine licence | **Proprietary, all rights reserved** |
| J3 | One-time test-update exception for text-reading tests (§6.3), so `guard.js`/`audio.js` can delegate to the engine? | **No.** RWB keeps its copies and Cheeseville uses the engine's |
| J4 | Start E0 before Stage 7 ships? | **Yes**, but only E0–E1 (no shared files with Stage 7). E2+ waits for Stage 7 T1; E4 waits for Stage 7 T15 |
| J5 | CI: also run on PRs into `rwb-w2`? | **Yes** (E0) |
