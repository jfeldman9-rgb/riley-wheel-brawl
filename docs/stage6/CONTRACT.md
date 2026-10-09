# Stage 6 contract

Gameplay is in. Art (A1–A4) and hardening tests (C1–C4) build against the names below. Do not edit `src/input.js`, `src/hud.js`, `lib/`, or `index.html`. Stage 6 stays behind `?s6=1`.

## Modules

| Module | Owns |
|---|---|
| `src/stage6-def.js` | `STAGE6`, `STAGE6_CHARS`, `STAGE6_TEXTURES`. `STAGE6.next()` is `{stage:1}`. |
| `src/stage6.js` | `Stage6Kit`, `queueStage6`. `callLoial` is wrapped only while this kit is live. |
| `src/stage6-lifecycle.js` | `installStage6SceneHooks`, `callRand`, `randCtx`, `lateEnemies`, `restoreStage6Hooks`. |
| `src/stage6-arena.js` | `createStone`, `threatsOf`. Lanes stay 572–690. |
| `src/stage6-view.js` | `createStage6View`. |
| `src/stage6-art.js` | `paintStage6Art`, `STAGE6_CANVASES`, `freeStory6`. Replace canvases with sheets; keep these names. |
| `src/stage6-hud.js` | `bindRandLabel`, `syncRandReady`, `randReady`. `hud.js` stays 0 bytes. |
| `src/rand-call.js` | `RAND`, `createRand`, `tickRand`, `trySpend`, `refuseReason`, `onScreenHittable`, `eligibleTargets`, `randEffect`, `callInFor`. |
| `src/rand-call-cutscene.js` | `playCall`, `abortRandCall`, `createBag`, `installRandBless`, `removeRandBless`, `RAND_IDS`. |
| `src/belal.js` | `BELAL`, `Belal`. Damage is 6/6/8/14. |
| `src/grayman.js` | `GrayMan`, `grayVisible`. |
| `src/fadelt.js` | `Fadelt`, `linkTrollocs`, `dazeLinked`. |
| `src/bot-stage6.js` | `stage6Bot`. `src/bot.js` is not edited. |

`src/cutscene.js` accepts optional `o.src(id)` as `srcOf`. `next()` uses `srcOf` or `srcFor`. Do not change `tick()`.

## Hooks

- **Call.** `riley.js` still calls `scene.callLoial()`. Stage 6 replaces that function on the scene and restores it on teardown. `callInFor(n)` is `'rand'` for `n >= 6`, otherwise `'loial'`.
- **HUD.** `bindRandLabel(hud)` installs an own-property `updateLoialLabel` and points `loialPic` at `randPortrait`. `syncRandReady` sets `s.loial = null` and mirrors readiness onto `riley.loialReady` before `hud.update`. Labels are `RAND!`, `RAND SPENT`, `RAND READY`, and `RAND n/10`. No countdown. Boss name is set with `fixBoss` (`BE'LAL`).
- **Cutscene.** `playCall(scene, then)` sets `scene.cutscene = { rand:true, i:0, line:null, press, next }`. `progress` writes `cutscene.i`. `flushPresses()` runs on every exit and again on the first resumed frame (`kit.flushInp`). Clips cap at 11 s, skip guard is 900 ms, and the bag allows 1–5 ids (N = 1 may repeat). `installRandBless` is installed in `Stage6Kit.build` and removed in `destroy`.
- **Strike.** `onScreenHittable` is the only hittable check for refusal and for the strike. `riley.inv` is set in `endStrike` (2 s), not when the strike starts. Recharge adds `dt` in `tickRand`.
- **Release.** Leaving stage 6 drops Stage 6 textures, stage 6 voice clips, and the `fade` / `cutthroat` atlases when the destination does not use them.

## Be'lal

`BELAL.dmg` is `[6, 6, 8, 14]`. Hits 1–3 set `riley.hurtStreak = 0` before `strikeRiley`, and only hit 4 uses `down: true`. No flurry while `fogSlow > 0`, `snareCool > 0`, or `getupCool > 0` (`0.8` s after getup, `0.4` s after a snare). No forward step, and no lunge toward Riley, when he is within 140 px of a wall. A wall-pinned flurry ends after 3 hits.

## Bot seams

- `?rand=1` makes `stage6Bot` press `assist` when `refuseReason` is empty.
- `bot.lag` (seconds) swaps `scene.enemies` for `lateEnemies(bot)` during `play()`. Samples are `bot.t` old. An unseen Gray Man (`grayVisible` false) is omitted.
- A delayed Be'lal opener (`state === 'attack'`, `hitI === 0`, `st < 0.04`) is reported as `stagger` so the slow bot can poke that windup. It does not read a future frame.
- While `bot.lag` is set, attack / tell / lunge hold `openY` 72 and the frame-perfect counter block is skipped.
- Campaign seeds are `1, 2, 3, 4, 5, 10, 20, 100, 97` in `tests/stage6-campaign.test.mjs`. One process, no-Rand then Rand. Rand boss time must stay at least 70% of the paired no-Rand time. The 250 ms loop must clear at least 7 of 9.

## Art seams (A1–A4)

- Sheets go under `assets/stage6/{chars,ui,props,story}` and `assets/bg6/`. Never `assets/ui/` or `assets/chars/`.
- Texture keys are `STAGE6_TEXTURES`. Portrait key is `randPortrait`. Be'lal sheet key is `s6belal`.
- `assets/bg6/layout.json` feeds `createStage6View`.
- Clips are `assets/cutscenes/rand/R1.mp4` … `R5.mp4` plus posters. Duration is the MP4 `mvhd` value when the file exists. Posters count toward the 7.5 MB `cutscenes.randCalls` line. `ART_STATUS.json` stays `placeholder: false`.
- `paintStage6Art` may keep drawing until a texture exists. Do not leave the string `placeholder` in `src/`.

## Test seams (C1–C4)

- Protected diff: `git diff --exit-code -- src/input.js src/hud.js lib index.html` (also asserted in `tests/stage6-registry.test.mjs`). The real input test is `tests/stage4-input.test.mjs`.
- `tests/stage6-boss.test.mjs` pins damage, the 4th-hit counter, the 60 s wall pin (≤ 3 hits), and the snare / getup blocks.
- `tests/rand-call.test.mjs` and `tests/rand-call-cutscene.test.mjs` pin the shared hittable check, inv-at-unfreeze, bag N = 1..5, the 900 ms guard, the watchdog, and the bless listener.
- `tests/stage6-size-caps.test.mjs` spawns `node tools/audit-stage1.mjs` and rejects any pre-fight path matching stage 6, Rand, Be'lal, Gray Man, or Fadelt.
- `tests/stage6-memory.test.mjs` sums decoded RGBA. The recorded total is 129.07 MiB. Do not treat 115 MiB as already met.
- New hardening files should be `tests/stage6-hardening*.test.mjs`, `tests/stage6-protected.test.mjs`, and the no-placeholder loop over stages 1–6. Gameplay fixes stay in the gameplay modules above.
