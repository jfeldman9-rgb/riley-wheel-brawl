# Stage 7 plan: Rhuidean and the Aiel Waste, with Moiraine and Lan as the call-ins

*Planner: Claude Opus, Oct 13 2026. Branch `rwb-opus-plan`, cut from `rwb-w2`. This is a docs-only plan. It
makes no game code changes. Names marked **†** are new. Every other name was checked in this checkout.*

Jason's brief:
1. **Stage 7 is the next level.** The suggested setting is Rhuidean and the Aiel Waste. An older Haiku draft
   (`plan/LEVELS.md`, row 8) had Asmodean as the boss.
2. **From Stage 7 on, Moiraine and Lan are the call-in helpers.** Rand stays the Stage 6 call-in. Loial stays on
   Stages 1–5.
3. **Cutscenes follow the Stage 6 rules.** Riley is only ever shown from behind.
4. **Budgets.** Every asset must fit the iPhone limits: about 120 MiB of GL textures, and the 25,000,000-byte
   pre-fight gate.
5. **Builders.** Grok 4.7 cloud agents build the stage one task at a time.

This plan copies the structure of `docs/stage6/PLAN.md`, and reuses the Stage 6 building blocks:
- zone streaming (`src/zone-stream.js`);
- compact normals (`src/texture-pages.js`);
- painted art through `tools/stage6/process_art.py`;
- the call-in rules and cutscene player (`src/rand-call.js`, `src/rand-call-cutscene.js`);
- the hook pattern (`src/stage6-lifecycle.js`).

The new work is the parts Stage 6 hard-coded to the number 6 (§0.2). Generalise those first, or Stage 7 will
quietly inherit Stage 6 behaviour.

Tone is the same as before: teen/adult, no gore. Shadowspawn dissolve to ash. Aiel are human, so they **yield**
(kneel, then fade out as gai'shain) instead of dying. The Forsaken boss is beaten and bound, not killed.

---

## 0. Ground rules (every task)

### 0.1 Carried over from Stage 6 unchanged
- **Protected files.** Never edit `src/input.js`, `src/hud.js`, `lib/` or `index.html`. Never edit an existing
  test. You may add new tests.
  - The touch `CALL` button (`#tbL`) and the `assist` action (keys R/V/U/I, pad LB) still drive the call.
  - `src/riley.js:36` still calls `scene.callLoial?.()`. Stage 7 reroutes that call through a kit hook, the same
    way `src/stage6-lifecycle.js` does.
  - `src/stage1.js` gets **no new Stage 7 logic**. The only allowed edits are the two generalisations in T1, which
    replace a hard-coded `6` with a predicate.
- **Stages 1–6 stay byte-identical in behaviour.**
  - Stages 1–5 keep Loial. Stage 6 keeps Rand.
  - A new test asserts that none of those stages loads Stage 7 art, audio or clips, and that the golden
    simulations for seeds `FULL_STAGE_SEEDS` are unchanged.
- **Budgets.**
  - The pre-fight gate is at **24,948,657 bytes**, about 51 KB of headroom.
  - `tools/audit-stage1.mjs` counts against the gate **every `src/*.js` that is not in a stage set**, and every
    voice whose name does not match a stage prefix.
  - So every Stage 7 module goes in a new `STAGE7_SRC`† set. Every Stage 7 voice id starts with `st7_` or
    `riley_st7_` (§6).
  - Every Stage 7 asset lives under `assets/stage7/` or `assets/bg7/`, never under the counted
    `assets/{chars,bg,props,ui,powers}`.
- **Hardening lessons (Stages 3–6).** Each one applies to every task:
  - `releaseHold('break')` on call, death, stage switch and destroy;
  - governor-safe `setQuality` before `build()`;
  - `stage4Delta` / `substeps` at 120 Hz;
  - zone-clear disposal;
  - a `counterUsed` latch on every boss attack;
  - lights ≤ 10;
  - attack tokens ≤ 2;
  - all timers on the game clock (never `Date.now()`, never audio time).
- **No placeholder text for players.** Code-drawn stand-ins show their `PLACEHOLDER` stamp only under `?debug`.
  Stage 7 joins `tests/no-placeholder.test.mjs`.
- **Determinism.** No `Math.random()` in Stage 7 rules. Use the seeded `rand`/`pick` from `src/config.js`, the
  same way the Stage 6 harness seeds through `withSeed`.

### 0.2 The hard-coded "6" spots Stage 7 must generalise (T1)

The table was checked in this checkout on Oct 13.

| File:line | Today | Problem for Stage 7 | Fix (T1) |
|---|---|---|---|
| `src/riley.js:37` | `if (this.scene.stageNo === 6 && (kit?.strike \|\| cutscene)) return;` | Riley keeps moving during a Stage 7 strike or cutscene | Change to `if (this.scene.kit?.freezesRiley?.()) return;`. Stage6Kit's `freezesRiley` returns exactly `!!(this.strike \|\| scene.cutscene)`. `riley.js` is not a protected file, but this is the only edit allowed in it |
| `src/stage1.js:697` | same check in `update` | World keeps running during a Stage 7 freeze | `this.kit?.freezesWorld?.()`. Stage6Kit implements it with today's exact condition |
| `src/stages.js:14,26,33` | `n < 7` in `stageFromQuery` / `resolveStage`; `stageEnabled(6)` reads `s6` | `?stage=7` is rejected | Change to `n <= MAX_STAGE`. Add `stageEnabled(7)` that reads `s7`, **off by default** until T14 |
| `src/stage6-def.js` | `next: () => ({ stage: 1 })` | Stage 6 loops to Stage 1 | `next: () => stageEnabled(7) ? { stage: 7 } : { stage: 1 }` |
| `src/rand-call.js:14` | `callInFor(n)` returns `n >= 6 ? 'rand' : 'loial'` | Stage 7 would call Rand | `n >= 7 ? 'moilan' : n === 6 ? 'rand' : 'loial'`. Existing tests still pass for 1–6 |
| `src/stage6-hud.js:60-61,91,94-95` | `paint` when `stageNo >= 6`; `fixHelp(hud, n >= 6)` rewrites "Loial" to "Rand" | Stage 7 HUD says "Rand" and draws the Rand slot | Change `>= 6` to `=== 6`. Stage 7 installs its own `installStage7Hud` |
| `src/bot-stage4.js:13-14` | dispatches on `stageNo === 6/5` | Bot uses Stage 4 logic on Stage 7 | Add `if (s.stageNo === 7) return stage7Bot(bot);` |
| `src/music.js:4` | `STAGE_MUSIC` frozen for 1–6 | No Stage 7 music | Stage 6 already registers its music through `MUSIC` mutation, so do the same. Better: read `stageDef.music` (engine plan, phase E2) |
| `src/hud.js:32` | `STAGE_NAMES` covers 1–5 | Title card | Patch from `stage7-hud.js` the way Stage 6 does at `stage6-hud.js:60` (protected file, so never edit it) |
| `src/hud.js:36` | `speakerColor` regex of villain names | `ASMODEAN`/`SHAIDO` captions show in ally blue | Wrap `hud.caption` in `stage7-hud.js` to colour by an explicit villain list |
| `src/cutscene.js:10` `STAGE_CLIPS`; `src/cutscene-hooks.js:78` `wrapStart(6, 6)` | no 7 | No intro clip | Add `wrapStart(7, 7)` and a `7` clip key. Both files sit in the 20 KB `CUTSCENE_SRC` line (15,979 used) |
| `src/stage1.js:111-114` `activeStages` | 1–4, with 5/6 added by `queueMicrotask` prototype wrappers | Stage 7 art never released | Copy the `src/stage6.js:189-200` wrapper for 7 (T2). Replacing the wrappers with a registry is engine work, not Stage 7 |
| `src/zone-stream.js:31-32` `plateRect` | zone 2 gets 0 bleed (Stage 6 sea-gate) | Wrong seams on Stage 7 | Move the bleed into `STREAMS[n].bleed`. Stage 6 keeps `[128,48,0,48,128]`-equivalent values, pinned by a pixel test |
| `src/texture-pages.js:3` | `COMPACT_STAGES = new Set([5, 6])` | Stage 7 loads full normals (+~27 MiB) | Add `7` |
| `src/assets.js:7` | `ALL_CHARS` hard list | Stage 7 roster must not add an atlas | No change. Stage 7 uses only `riley`, `grunt`, `spear` atlases plus painted sheets |

**Acceptance for T1:**
- Every existing test passes.
- The golden simulation diff for Stages 1–6 is empty.
- `?stage=7` without `s7=1` still resolves to Stage 1.

---

## 1. Setting and story

**Timeline: The Shadow Rising, ch. 22–26 and 58.** These are verified against chapter recaps (Dragonmount):
- **ch. 22–23.** Rand, Egwene, Moiraine, Lan and the Aiel step through a Portal Stone. They come out on
  **Chaendaer**, the mountain above Rhuidean.
- **ch. 24–26.** Rhuidean is the abandoned Aiel city:
  - a fog dome (the veil) and a dry fountain;
  - streets of unfinished palaces;
  - a plaza of **glass columns** around **Avendesora**, the last Tree of Life;
  - a "bubble of evil" that makes the city attack its visitors.
- **ch. 37.** Trollocs slaughter the people of **Imre Stand**, a small hold in the Waste.
- **ch. 58.** **Asmodean** fights Rand in Rhuidean over the access key to a great sa'angreal. The veil breaks and
  the city is damaged. Afterwards Asmodean is cut off and bound to teach Rand. He travelled as a **gleeman with a
  harp** (Jasin Natael).

**Riley's version.** Stage 6 ends with Rand saying *"Your sister's trail goes east, into the Waste … Rhuidean …
Call, and I'll come."* Stage 7 picks the trail up there:
1. Moiraine and Lan bring Riley through the Portal Stone to Chaendaer at dusk.
2. Riley crosses the Waste past the burned hold of Imre Stand, through a sandstorm.
3. Riley enters Rhuidean's fog.
4. In the glass-column plaza he catches the gleeman who has been leading the Shadowspawn: Asmodean.
5. Asmodean is beaten, not killed. Moiraine shields him and Lan puts a sword at his throat. Asmodean gives up
   the sister clue: the Fades sold her to "women in shawls", a Tower embassy riding for **Cairhien**. That sets up
   Stage 8 (Cairhien) and the **Dumai's Wells finale (Stage 9)**. The campaign now ends at Dumai's Wells; see
   `docs/CAMPAIGN-ARC-PLAN.md`. The Black Tower stage in `plan/LEVELS.md` row 10 is parked for a possible later
   game.
6. **Why Moiraine and Lan, not Rand, from Stage 7 on.** Rand stays behind holding Tear, and later Cairhien. In
   Stage 8 he is kidnapped, and in Stage 9 he is a captive the player has to rescue. Moiraine and Lan are the
   call-ins for all three stages. Rand returns as a call-in only for the last phase of the finale.

**Why Asmodean stays, and what changes from the Haiku draft.** Keep these parts:
- the harp notes;
- the desert and glass look;
- the sandstorm;
- Shaido spear-dancers and veiled archers.

Two parts change:
- **Drop "find the real column".** It repeats Stage 3's Myrddraal split (parry the real copy).
- **Drop "collapses the columns" as a phase.** Canon breaks the city as Rand wins, so the collapse is the outro.

The replacement phases (§2.4) use the stage's one strong idea, **music**, as a readable rhythm-dodge. The glass
columns become a resonance hazard, and the access-key channel mirrors Be'lal's Callandor channel, which players
already know how to interrupt.

**Story in** (3 painted panels, narrator plus Riley, about 18 s; optional intro clip §4.5):

| id | Who | Line |
|---|---|---|
| `st7_story_01` | NARRATOR | "The Portal Stone took them in a heartbeat — and spat them out on a mountain at the edge of the world." |
| `st7_story_02` | NARRATOR | "Below Chaendaer lay the Three-fold Land. And under a dome of fog, a city no outsider was meant to see." |
| `riley_st7_story_01` | RILEY | "She came through here. I can feel it." |
| `st7_story_03` | MOIRAINE | "Rhuidean. Step carefully. Something in that city is awake." |
| `st7_story_04` | LAN | "Shadowspawn tracks. Fresh. Stay on my left." |

**Story out** (clear card plus 4 lines):

| id | Who | Line |
|---|---|---|
| `st7_clear_01` | ASMODEAN | "Enough! Enough… I yield. The Fades sold the girl to women in shawls — a Tower embassy, riding for Cairhien." |
| `st7_clear_02` | MOIRAINE | "He will keep. A shielded Forsaken is still worth more than a dead one." |
| `st7_clear_03` | LAN | "Cairhien, then. We ride at dawn." |
| `riley_st7_victory_01` | RILEY | "Hold on. I'm coming." |

---

## 2. Level

### 2.1 Zones

The world is `WORLD_W` 5200 px with 4 zones, the same zone geometry as `src/stage6-def.js`, so camera, skip and
streaming code is reused unchanged.

| Zone | `at` / `l`–`r` | Place | Light | Waves (type, side, delay s) | Set piece |
|---|---|---|---|---|---|
| Z0 | 260 / 0–1280 | **Chaendaer and the Portal Stone**, at dusk on a rocky slope | low orange sun from the left, long shadows | `[[grunt,L,0],[grunt,R,1.0]]`, `[[spear,R,0],[dancer†,L,0.8],[grunt,R,1.6]]` | The Portal Stone glows at zone start (story exit). Its light is one point light that turns off at wave 1 |
| Z1 | 1500 / 1240–2520 | **Imre Stand and the open Waste**: burned hold walls, cracked clay | haze, then **sandstorm** | `[[dancer†,R,0],[veiled†,L,0.6]]`, `[[grunt,L,0],[dancer†,R,0.5],[veiled†,R,1.2],[spear,L,1.8]]` | **Sandstorm** (§2.3) |
| Z2 | 2800 / 2560–3840 | **Rhuidean streets**: the fog veil, unfinished palaces, the dry fountain | cool blue fog, glints of glass | `[[fadelt,R,0],[grunt,L,0.4],[dancer†,R,0.9]]`, `[[veiled†,T,0],[spear,L,0.5],[grunt,R,1.0],[dancer†,L,1.6]]` | **The waking street** (§2.3) |
| Z3 | 4140 / 3920–5200 | **The glass-column plaza and Avendesora** | night; the columns glow from inside; one moon key light | boss | Boss arena (§2.4) |

- `T` spawns in Z2 come off a palace balcony. They reuse the Stage 6 `T` side, so no new spawn code is needed.
- `fadelt` is the painted Myrddraal lieutenant from Stage 6 (`src/fadelt.js`, texture `s6fade`). Stage 7 loads the
  same file under the same key, so no new art is needed.
- **Drops**: same shape as Stage 6. `bossDrop: { phase: 2, kind: 'saangreal' }`.

  | Zone | Wave 0 | Wave 1 |
  |---|---|---|
  | Z0 | `lightning` | `fireshield` |
  | Z1 | `airwhip` | `angreal` |
  | Z2 | `ter?` | `lightning` |

- **Ribbon**: Z1 wave 0. **Crates**: `[[880,600],[2140,650],[3330,610],[4600,596]]`, with `crateProp: 's7crate'†`
  (a woven Aiel basket) and the planks prop `s7planks`† (basket shreds).
- **Skip**: `skipBoss: { zoneI: 2, x: 3990, camX: 3500 }`. This is the same as Stage 6, and the harness relies on
  it.

### 2.2 Enemies

The roster is cut on purpose to make room for the call-in art:
- **Atlas fighters (normal-mapped).** Only `riley`, `grunt` and `spear`, with compact normals. Dropping `hound`
  saves **15.77 MiB** of decoded RGBA, which pays for the new painted sheets (§7).
- **Painted fighters (no normals, drawn 1:1 via `meta.drawScale`).** `dancer`†, `veiled`†, plus the reused
  `fadelt`.

| Type | Base | HP | Speed | Behaviour | Tell | Dies / yields |
|---|---|---|---|---|---|---|
| `grunt` | `TYPES.grunt` in `src/enemies.js` | as Stage 6 | as Stage 6 | unchanged | unchanged | ash |
| `spear` | `TYPES.spear` | as Stage 6 | as Stage 6 | unchanged | unchanged | ash |
| `dancer`† (Shaido spear-dancer) | new `src/shaido.js`† on the `Fighter` base | 60 | 210 px/s (fast) | **Flanker.** Circles to the side of Riley that has no attacker (it reads `attackTokens()` and stays out of the token cap while circling). Then it does a **cartwheel-lunge** of 300 px along its band | Kneels and the veil goes up (0.45 s), a white glint on the spear tip | **Yields**: kneels, then fades 0.8 s. Not ash |
| `veiled`† (Shaido veiled archer) | `src/shaido.js`†, AI cloned from the Stage 2 archer (`archer` volleys) | 40 | 120 px/s | Keeps 420–620 px from Riley and fires 1 arrow along a band; 2 archers never fire in the same 0.6 s window | The bow draws (0.6 s), and a thin band line appears like the Stage 2 volley band | yields |
| `fadelt` | `src/fadelt.js` | as Stage 6 | as Stage 6 | elite, unchanged | unchanged | ash |

- Both Shaido take `humanFrac`/`humanDown` from the call-in table (§3). Call-ins never kill humans: they drop them
  to a knockdown or a yield.
- Score: dancer 450, veiled 350.

### 2.3 Hazards (all on the game clock, all seeded)

**Sandstorm (Z1 only).**
- **Cycle: 14 s.** The first gust starts 2 s after Z1 wave 0 is cleared. The storm ends when Z1 is cleared.
- **Telegraph: 2.5 s.** A dust wall rolls in from the windward edge, a HUD arrow appears at the top centre (inside
  the existing flash-text slot), and wind SFX plays.
- **Gust: 4.0 s.** Every actor is pushed 70 px/s leeward, scaled by `dt` and clamped to the zone bounds.
  - Riley holding **block** is pushed at 50%.
  - A dust overlay rises to alpha 0.35. It is one full-screen image, not lit, and counts for 0 lights.
- **Storm spawns.** Enemies that arrive during a gust show a dark silhouette for **0.6 s** before they turn on
  (alpha 0.4 → 1, no hitbox while the silhouette shows).
- **Direction** alternates L→R, then R→L, from the seeded start side.
- **Fairness.**
  - No gust starts while Riley is grabbed or in a call-in.
  - A gust never pushes Riley off the lane: Y is untouched, only X moves.
  - The bot test checks that the storm is not the main cause of deaths: no more than 30% of Z1 deaths happen
    while a gust is active.

**The waking street (Z2, the canon "bubble of evil").**
- **Spawn rule.** While a Z2 wave is active, a **shimmer ring** appears every 9 s under Riley's last position on
  one of the 3 `VOLLEY_BANDS`. It is never on the band of an active grab. Radius 72 px. At most 1 ring is active.
- **Tell: 1.1 s.** A heat-shimmer ring, with glass grit lifting.
- **Strike: 1.6 s.** Three glass shards erupt from the ground in a line along the band. Each does **9 damage** plus
  a small knock-up. They also hit enemies for 30 damage, so players can lure enemies onto the ring.
- **Avoid it** by jumping or by leaving the ring.
- `counterUsed` latch: the ring cannot hit Riley twice per strike.

**The veil (Z1 → Z2 boundary).** A visual only: a fog curtain plate at x≈2560 that Riley walks through. When the
camera passes it, the fog plate fades. There is no gameplay effect.

### 2.4 Boss: Asmodean, the gleeman

- **Constants table:** `ASMODEAN`† in `src/asmodean.js`†.
- **HP 600.** That is a little under Be'lal's 640, because the ranged phases already make the fight longer.
- **Speed 88. Reach 150** (harp-frame bash). **Score 8000.**
- **Phase gates `[0.66, 0.33]`**, the same as `RAND.gates`. Call-ins can never skip a gate.
- He moves with `substeps()` from `src/stage5-clock.js`, like `src/belal.js`.

**Phase 1: "The Song" (100% → 66%). A rhythm-dodge.**
- Asmodean stands at the back of the plaza and plays.
- **Note volleys run on a fixed 96 BPM game clock.** It is not synced to audio, because iOS audio latency varies;
  the music is composed at 96 BPM so it *sounds* synced (§6.3).
- Every 2 bars (5.0 s) he fires a **phrase**: 4 notes, one per beat, each travelling along one of the 3
  `VOLLEY_BANDS` at 360 px/s.
  - **Every phrase leaves at least one band free for its whole length.** A unit test checks this for every phrase
    in the seeded pattern table.
- **Tell:** the band lights up gold one beat (0.625 s) before each note.
- **Damage:** 7 per note.
- **Sour note:** one gold note per phrase. Hitting it with any attack while it is within 90 px **reflects** it.
  A reflected note does 4% boss HP and costs him 0.8 s of stagger.
- Between phrases he steps forward and does a **harp-frame bash** (tell 0.55 s, dmg 8, `counterUsed` latch), then
  walks back. Riley can punish the bash.

**Phase 2: "The Glass Sings" (66% → 33%). Column resonance plus adds.**
- Asmodean plucks one long note. The 5 glass columns (props on the Z3 plate, drawn as a separate `s7column`†
  overlay so they can glow) light up in sequence.
- **Every 3.2 s, one column cracks.**
  - Tell: a 1.0 s hum, and the column glows white.
  - Then a **shard rain** falls in a 220 px strip under that column, across all 3 bands, for 0.9 s: 12 damage plus
    a knockdown.
- **Adds.** Two waves of `[dancer, grunt]`, then `[veiled, dancer]`, enter on the gate. The shard rain hits enemies
  too, which gives players a crowd tool.
- **Note phrases continue**, at half rate (one phrase per 10 s).

**Phase 3: "The Key" (33% → 0). An interruptible channel.**
- Asmodean pulls out the small access-key figurine (a stylised fat-man shape; no canon art likeness needed) and
  **channels** it: a 1.8 s cast bar over his head.
- **Interrupt it** with any 3 hits, or a throw, during the channel. A successful interrupt stuns him for 1.4 s.
- **If the channel completes**, a **shockwave ring** expands from him at 520 px/s for 0.5 s. Riley must **jump**
  it. It does 16 damage plus a knockdown.
- The channel repeats every 6 s. Between channels he uses Phase 1 phrases at full rate and the harp bash.
- **At 10% HP the plaza starts to crack.** This is cosmetic: screen trauma 0.3 and the column glow flickers.

**Defeat.**
- `bossDown`: Moiraine's shield-weave FX (a blue ring) pins him, and Lan steps in from the left (painted `s7lan`
  pose `point`).
- `st7_clear_*` lines play (§1). The music changes to `clear`.
- The columns go dark one by one: a 2.5 s tween, no new art.

**Bot fairness.** The same gates as Stage 6:
- the call-ins-on boss time must be **70–102%** of the call-ins-off time;
- campaign bots clear **9/9** seeds;
- the 250 ms lag bot clears **≥ 8/9**.

---

## 3. Call-ins: Moiraine and Lan

### 3.1 How the call works

There is one `CALL` button and **one shared charge**. The game picks the helper from the situation, so touch
players never need a second button. The choice is a pure function, which makes it testable and lets the bot
predict it.

`src/moilan-call.js`† is a pure module, the same shape as `src/rand-call.js`:

```js
export const CALL7 = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3, perPhase: 1,
  bossFrac: 0.06, fadeFrac: 0.75, humanFrac: 0.6, fadeDown: 2, humanDown: 1.6,
  inv: 2, stagger: 1, gates: Object.freeze([0.66, 0.33]),
  moiraine: Object.freeze({ kos: 6, rocks: 6, rockGap: 0.1 }),
  lan: Object.freeze({ kos: 3, eliteFrac: 1.0, eliteFracHealthy: 0.75, dash: 0.45 }),
});
export function pickHelper(ctx) {
  if (ctx.boss) return 'duo';
  if (ctx.spawnOnScreen >= 3) return 'moiraine';
  if (ctx.eliteOnScreen || ctx.humansOnScreen >= 1) return 'lan';
  return 'moiraine';
}
```

- The charge rules (`createCall7`, `noteRileyKo`, `tickCall7`, `canCall`, `takeCall`) are a copy of the
  `rand-call.js` functions, with the RAND constants swapped for CALL7. When the engine work lands (engine plan,
  phase E3), both become one `assist-rules.js` driven by a table. Do not attempt that merge inside Stage 7.
- **Hooking is identical to Stage 6.**
  - `src/stage7-lifecycle.js`† wraps `spawn`, `callLoial`, `onEnemyDie`, `update`, `rileyDied` and
    `continueGame`, and restores them in `destroy()`.
  - It is a copy of the `hook()` helper in `src/stage6-lifecycle.js`.
- **Freeze.** While a strike is playing, `kit.freezesWorld()` and `kit.freezesRiley()` (added in T1) return true.
  Copy `src/stage6-freeze.js` as-is, as `stage7-freeze.js`†.

### 3.2 What each helper does

| | **Moiraine** (crowd clear) | **Lan** (precision) | **Duo** (boss zone only) |
|---|---|---|---|
| Picked when | 3 or more Shadowspawn on screen, or as the default | an elite or any Shaido on screen | `zoneI === 3` |
| Effect | Earth heaves under up to **6** Shadowspawn, then fire. They turn to ash | Lan dashes across Riley's band in 0.45 s. It kills up to **3** Shadowspawn on the band and **downs** every human it touches. An elite (`fadelt`) under 50% HP dies; otherwise it loses 75% of its HP | Moiraine's shield-flare **clears every note and shard on screen**. Then Lan strikes Asmodean for **6% HP** plus a 1 s stagger |
| Humans (Shaido) | `humanFrac 0.6` of current HP, `humanDown 1.6 s`, never lethal | downed 1.6 s, never lethal; a human already under 20% HP **yields** | n/a |
| Riley | invulnerable for 2 s | invulnerable for 2 s | invulnerable for 2 s |
| Can it skip a boss gate? | n/a | n/a | **No.** Damage is clamped at the next gate, like `RAND.bossFrac` |
| In-game time | 1.6 s strike, with the world frozen | 0.9 s strike | 1.8 s strike |
| FX (code-drawn first, painted later) | rock spikes plus fire bloom (`s7earth`† strip) | white slash streak (reuse `s6streak` tinted) | blue ring (`s7shield`†) plus slash |

### 3.3 Charges and HUD

- **Charges, recharge, max calls and one-per-phase** are exactly the Stage 6 rules: 1 charge, 10 KOs **and**
  45 s to recharge, 3 calls per stage, 1 per boss phase.
- **HUD.** It uses the existing Loial slot (`src/hud.js` ~177–181), which `src/stage6-hud.js` already repaints for
  Rand.
  - `src/stage7-hud.js`† paints the portrait of the helper the call would pick **right now**, updated at 4 Hz, so
    players learn the rule.
  - Labels: `MOIRAINE READY`, `LAN READY` or `CALL READY` (duo). It is greyed out with a recharge pip while
    charging.
  - The help text says "CALL: Moiraine / Lan" (the `fixHelp` approach, Stage 7 only).
- **Riley lines on call** (one per call, from a bag): `riley_st7_call_01` *"Moiraine!"*, `riley_st7_call_02`
  *"Lan — now!"*, `riley_st7_call_03` *"I need you!"* (used for duo).
- **Helper lines** play over the strike (§6). They are captions plus voice, ducked under the cutscene audio if a
  clip is playing.

### 3.4 Cutscene playback

The cutscene is a copy of `src/rand-call-cutscene.js` with the helper as a parameter. The new file is
`src/call7-cutscene.js`†.

- **One shuffle bag per helper** in `sessionStorage`: `rwb-call7-bag-moiraine`, `-lan`, `-duo`.
- **Prefetch.** Only the next clip of the **currently predicted** helper is prefetched, as a single blob, when
  the charge becomes ready. If the prediction changes, the old blob is revoked and the new one fetched.
- Player settings: a second `CutscenePlayer` with `startMs 1500`, `stallMs 1500`, `maxMs 11000` and
  `guard 900`, and the music is ducked.
- **The strike never waits on the clip.** If the clip stalls or is missing, the strike runs on time and Riley's
  call line still plays.
- Skippable with a tap or any `SKIP_ACTIONS` key, as now.

---

## 4. Cutscenes

### 4.1 Rules (unchanged from Stage 6, restated because they are hard rules)

- Photoreal Grok Imagine clips, **5–10 s**, encoded at **854×480, CRF 29, ≤160 KB/s**. Use
  `tools/cutscenes/encode_rand.sh`, generalised in T11 to take a folder argument.
- **Riley is only ever seen from behind.**
  - He wears a black long coat, has short dark hair, and wears fingerless gloves.
  - Reject any take where he turns his head past profile, or any part of his face shows, even blurred.
  - Every clip gets a frame-by-frame review at 4 fps before it ships, and is logged in `ART_STATUS.json` with
    reviewer and timestamp.
- **Never prompt by actor name.** Avoid any likeness to the TV series cast. If a take resembles a known actor,
  reject it.
- **Moiraine reference.** Use `assets/cutscenes/moiraine.mp4` (the Stage 1 Winternight clip) as the image
  reference for continuity. This assumes the existing clip passed the likeness review; re-check it before reusing
  it.
- **Lan, described from the books.**
  - a tall, hard, grey-eyed man;
  - a braided leather cord (*hadori*) around his forehead;
  - a Warder's cloak whose colours shift with the background;
  - a long hand-and-a-half sword with a heron mark on the blade.

### 4.2 Clip list (6 call-in clips, plus 1 optional intro)

| id | Helper | Shot (Riley from behind in every shot) | Length |
|---|---|---|---|
| M1 | Moiraine | Over Riley's shoulder: Moiraine raises her hand on a sand ridge, and the ground under distant Trollocs heaves up in a wave of stone | 6–8 s |
| M2 | Moiraine | Low angle behind Riley: Moiraine steps out of fog, her blue stone glowing on her brow, and fire blooms in an arc in front of them | 6–8 s |
| L1 | Lan | Behind Riley: Lan sprints past him, cloak shimmering, and draws in one motion. Hard cut to the slash streak | 5–7 s |
| L2 | Lan | Wide shot behind Riley: Lan stands in a sandstorm, sword low, then vanishes into the dust toward the enemy | 6–8 s |
| D1 | Duo | Behind Riley in the glass plaza: Moiraine's blue ring of light flares, and Lan leaps through it | 7–9 s |
| D2 | Duo | Behind Riley: Moiraine and Lan stand either side of him and step forward together; the glass columns flare | 7–9 s |
| S7 (optional) | Intro | Behind Riley on Chaendaer at dusk: the Portal Stone's light fades and the fog dome of Rhuidean shows far below | 8–10 s |

### 4.3 Example Grok Imagine prompt (template; fill in per clip)

> Photoreal cinematic shot, 16:9, 6 seconds. Camera behind a 16-year-old boy seen **only from behind**: black
> long coat, short dark hair, fingerless gloves, standing on a red sand ridge in the Aiel Waste at dusk. Ahead of
> him a small, ageless woman in a blue silk riding dress, a small blue stone on a fine chain across her forehead,
> raises one hand; the ground beneath distant horned beast-men heaves up in a wave of broken stone and dust.
> Warm low sun, long shadows, heat haze. **The boy never turns around; his face is never visible.** No text, no
> logos, no gore.

Lan variant: replace the woman with *"a tall, weathered swordsman with a braided leather cord around his
forehead, a cloak whose colours blur into the sand behind him, a long hand-and-a-half sword"*.

### 4.4 Byte budget

| Line in `tools/audit-stage1.mjs` | Folder | Budget | Expected |
|---|---|---|---|
| `cutscenes.callIns7`† (new `walkBytes` line, like `randCalls`) | `assets/cutscenes/call7/`† | **9,000,000** | 6 × ≈1.3 MB + 6 posters ≈ 8.0 MB |
| `cutscenes.stage7`† (new) | `assets/cutscenes/stage7/`† | **2,000,000** | ≈1.5 MB |

- The `cutscenes.clips` line only reads the top level of `assets/cutscenes/` (its `readdir` is not recursive).
  So each new subfolder **needs its own budget line**, or it is silently unbudgeted.
- The `clips` line is at 22,273,215 of 25,000,000. Do not put Stage 7 clips there.
- Clips are never preloaded. They stream on demand, so they are outside the pre-fight gate, like `rand/`.

### 4.5 iPhone

- Use the same single-blob prefetch as Rand.
- At most one call-in blob and the intro clip are in memory at once. The intro blob is released when its clip
  ends.

---

## 5. Art asset list

### 5.1 Rules
- Painted sheets go through `tools/stage6/process_art.py`. Copy its `JOBS` to `tools/stage7/process_art.py`† and
  keep the functions. Job kinds: `poses`, `props`, `bands`, `image`, `panels`.
- Its outputs: `assets/stage7/ART_STATUS.json`† and `src/stage7-painted.js`† (key → url, present).
- **Every key has a code-drawn fallback** in `src/stage7-paint.js`†, the same pattern as `paintStage6Art` in
  `src/stage6-paint.js`. The stage must be playable with zero painted files present. That is how T3–T9 land before
  the art does.
- **No normal maps on painted art.** It is drawn at painted scale 1:1 (`meta.drawScale`).
- Key colours and palette: dusk orange `#d9822b`, sand `#c8a26b`, glass cyan `#8fe3ff`, fog blue `#6f8fb0`,
  Aiel cadin'sor grey-brown `#8a7a5e`, Shaido red veil band `#a33a2a`.

### 5.2 List, with decoded size budgets

Decoded size is width × height × 4 bytes. The estimates are scaled from measured Stage 6 sheets: `s6belal`
1871×283 = 2.02 MiB, `s6fade` 1120×257 = 1.10 MiB, `s6gray` 903×206 = 0.71 MiB, and each `bg6` plate 1.07–1.81
MiB.

| Key | Kind | Content | Cells / size | Decoded cap | File cap | Resident when |
|---|---|---|---|---|---|---|
| `s7dancer`† | poses | Shaido spear-dancer: idle, run ×4, lunge ×3, hurt, kneel/yield, down | ~13 cells, ≤1280×256 | 1.25 MiB | 60 KB | Z0–Z3 |
| `s7veiled`† | poses | Veiled archer: idle, walk ×4, draw ×2, loose, hurt, kneel, down | ~11 cells, ≤1152×256 | 1.15 MiB | 55 KB | Z1–Z3 |
| `s6fade` (reuse) | poses | Stage 6 file | 1120×257 | 1.10 MiB | (exists) | Z2–Z3 |
| `s7asmo`† | poses | Asmodean: idle, walk ×4, play ×4 (harp), bash ×3, channel ×2, hurt, stagger, kneel (bound) | ~18 cells, ≤1920×288 | 2.10 MiB | 120 KB | Z3 only (deferred, §7.2) |
| `s7moir`† | poses | Moiraine strike: stand, raise ×2, cast ×2 | 5 cells, ≤800×264 | 0.80 MiB | 45 KB | on call (deferred) |
| `s7lan`† | poses | Lan strike: run ×3, draw, slash ×2, point | 7 cells, ≤960×264 | 0.97 MiB | 50 KB | on call (deferred) |
| `moiPortrait`†, `lanPortrait`†, `asmoPortrait`† | image | HUD portraits | 136×136 each | 0.21 MiB total | 4 KB each | always |
| `s7note`† | props | harp notes: normal ×2, gold ×2, burst ×2 | 384×64 | 0.09 MiB | 8 KB | Z3 |
| `s7column`† | props | glass column glow overlay ×3 states | 3 × 128×448 | 0.66 MiB | 30 KB | Z3 |
| `s7shard`† | props | glass shards and grit, ×4 | 512×64 | 0.13 MiB | 10 KB | Z2–Z3 |
| `s7earth`† | bands | earth-heave and fire strip for Moiraine | 768×128 | 0.38 MiB | 20 KB | on call |
| `s7shield`† | props | blue shield ring ×2 | 256×256 | 0.25 MiB | 12 KB | on call (duo) |
| `s7dust`† | image | sandstorm overlay (tiles horizontally) | 512×256 | 0.50 MiB | 25 KB | Z1 only |
| `s7ring`† | props | waking-street shimmer ring ×2 | 288×72 | 0.08 MiB | 6 KB | Z2 |
| `s7portal`† | props | Portal Stone glow | 256×256 | 0.25 MiB | 12 KB | Z0 |
| `s7crate`†, `s7planks`† | props | Aiel basket and shreds | 128×128, 256×64 | 0.13 MiB | 10 KB | always |
| **Painted resident peak (boss)** | | | | **≈ 7.7 MiB** with Lan and Moiraine both loaded | | |

**Backgrounds** go in `assets/bg7/`†. They are streamed through `STREAMS[7]`†, so only the current and next zone
are resident.

| Key | Content | Size | Decoded | File cap |
|---|---|---|---|---|
| `bg7far`† | Waste horizon, mesas, sky gradient (dusk → night tint driven in code) | 1024×464 | 1.81 MiB | 90 KB jpg |
| `bg7mid`† | Chaendaer slope, Portal Stone | 1024×464 | 1.81 MiB | 120 KB webp |
| `bg7mid2`† | Imre Stand ruins | 1024×464 | 1.81 MiB | 120 KB |
| `bg7mid3`† | Rhuidean street, dry fountain, fog curtain at left | 1024×464 | 1.81 MiB | 120 KB |
| `bg7mid4`† | glass-column plaza, Avendesora | 1024×464 | 1.81 MiB | 130 KB |
| `bg7floor`† | rock and sand (Z0–Z1 share it) | 1080×360 | 1.48 MiB | 130 KB jpg |
| `bg7floor2`† | city paving | 1080×360 | 1.48 MiB | 120 KB |
| `bg7floor3`† | glass-flecked plaza | 1280×180 | 0.88 MiB | 80 KB |

- Streaming peak: far plus 2 plates plus 2 floors is **≈ 8.4 MiB**, against 11.5 MiB if every plate were
  resident.
- **Story panels** (`assets/stage7/story/`†): `story7p1..3`†, 1280×720 jpg, ≤220 KB each, 3.52 MiB decoded
  each.
  - They are only resident during the story card. **T2 must check** that they are released before Z0 wave 0
    (verify against `texture-dump` output).
  - Stage 6 keeps `story6p*` in `STAGE6_TEXTURES`. If they turn out to stay resident on Stage 6, add the release
    to Stage 7 only.

**Total Stage 7 painted and background art on disk:** about 1.7 MB.
- Budget line: `stage7.art`† = **6,000,000** bytes (the same as the Stage 6 line), via `walkBytes('assets/stage7')`
  plus `walkBytes('assets/bg7')`.

---

## 6. Audio

### 6.1 Voices and pipeline
- **Riley:** ElevenLabs `eleven_v4`, voice "DYLO - Dark Anime Hero" (`JjsQrIrIBD6TZ656NQfi`).
  - Use `tools/riley_voice.py` and add the lines to `assets/audio/riley-voice-manifest.json`.
  - Processing as now: trim, highpass 70 Hz, loudnorm I=-17.5 TP=-2, mono 24 kHz 64 kbps.
- **Narrator:** Jason's own consented voice clone. CosyVoice 3 (`Fun-CosyVoice3-0.5B`, Apache-2.0) zero-shot with
  the existing 26 s reference and transcript, through `tools/jason-narrator/`.
  - Add the lines to `narrator-lines.json` and `LINES.md`.
  - Output -16 to -18 LUFS, mono 24 kHz 96 kbps.
  - Every line is checked with Whisper `medium.en` and must transcribe to the script. Re-roll up to 5 seeds.
- **Pronunciation hints for the narrator.** These are written phonetically in the CosyVoice text only, never in
  captions:

  | Word | Hint |
  |---|---|
  | Rhuidean | Rye-DEE-an |
  | Chaendaer | Shan-DARE |
  | Aiel | Eye-EEL |
  | Shaido | SHY-doh |
  | Asmodean | Az-MOH-dee-an |
  | Avendesora | Ah-ven-deh-SOR-ah |
  | Imre | IM-ray |

  Jason confirms the hints by ear before T12 closes, since audiobook readings vary.
- **Moiraine.** Her established voice is Kokoro `bf_emma` (Stage 1 and `st6_moiraine_01`). Keep it for
  continuity (decision D3).
- **Lan:** a new ElevenLabs Voice Design: *"Deep, quiet, clipped male voice, late 40s, Borderland accent hint,
  calm and dangerous, few words."*
- **Asmodean:** a new ElevenLabs Voice Design: *"Smooth, theatrical male tenor, a performer's diction,
  condescending, turns brittle when afraid."*
- Record the voice ids in `tools/stage7/voice-render.json`†, copying the `tools/stage6/voice-render.json` format.
- **Shaido:** no speech, only shouts and grunts from the SFX table, to keep the line count down.

### 6.2 Line list

**All ids start with `st7_` or `riley_st7_`.** The audit can then use one prefix:
`stage7Voice = /^(st7_|riley_st7_)/`. Budget: `24 × 200 KB` = 4,915,200, the same as Stage 6.

| id | Who | Voice | Line | When |
|---|---|---|---|---|
| `st7_story_01..02` | NARRATOR | Jason clone | §1 | story card |
| `st7_story_03` | MOIRAINE | bf_emma | §1 | story card |
| `st7_story_04` | LAN | design | §1 | story card |
| `riley_st7_story_01` | RILEY | DYLO | §1 | story card |
| `st7_storm_01` | LAN | design | "Down! Brace against it!" | first gust telegraph |
| `riley_st7_storm_01` | RILEY | DYLO | "Can't see a thing in this!" | second gust |
| `st7_veil_01` | MOIRAINE | bf_emma | "The veil. Whatever you see in there, keep moving." | enter Z2 |
| `riley_st7_street_01` | RILEY | DYLO | "The ground's moving!" | first ring |
| `st7_asmo_intro_01` | ASMODEAN | design | "A boy with a borrowed sword, chasing a girl he'll never find. Shall I play you a dirge?" | boss intro (`boss.introVoice`) |
| `st7_asmo_p2_01` | ASMODEAN | design | "Listen — even the glass sings for me." | phase 2 |
| `st7_asmo_p3_01` | ASMODEAN | design | "Do you know what this is? Of course you don't." | phase 3 |
| `st7_asmo_hurt_01` | ASMODEAN | design | "You — you dare?!" | first reflected note |
| `riley_st7_reflect_01` | RILEY | DYLO | "Off-key." | first reflected note (after Asmodean) |
| `riley_st7_call_01..03` | RILEY | DYLO | §3.3 | on call |
| `st7_moi_call_01` | MOIRAINE | bf_emma | "Stand aside." | Moiraine strike |
| `st7_moi_call_02` | MOIRAINE | bf_emma | "The Light shield you." | Moiraine strike |
| `st7_lan_call_01` | LAN | design | "Behind me." | Lan strike |
| `st7_lan_call_02` | LAN | design | "Now, sheepherder— now!" | Lan strike (a respectful nod; no copied prose) |
| `st7_duo_call_01` | MOIRAINE | bf_emma | "Lan!" | duo strike |
| `st7_clear_01..03` | ASMO / MOI / LAN | | §1 | outro |
| `riley_st7_victory_01` | RILEY | DYLO | §1 | outro |

That is **24 lines**, which fits 24 × 200 KB exactly.
- Each id is registered through `stage7Say`/`registerLines`/`setVoiceFiles`, copied from `src/stage6-voice.js`.
- **A missing mp3 shows the caption only**, as now. Lines can therefore land after the code.

### 6.3 Music and SFX
- `assets/audio/music-stage7.mp3`† (desert, hand drums plus low flute, 96 BPM, 2:00 loop) and
  `assets/audio/music-boss7.mp3`† (harp-led, 96 BPM so the phrase clock in §2.4 sits on the beat, 2:00 loop).
- Use `tools/music/compose.py` plus `tools/music/check_loops.py`, the same way `tools/stage6/compose_stage6.py` and
  `loop_music.py` were used.
- Budget line: `stage7.music`† = 2 × 1,200,000.
- **SFX are code-synthesised** (`withSfx`), copying `src/stage6-sfx.js` as `src/stage7-sfx.js`†:
  - harp pluck (normal and gold);
  - glass hum and shard crack;
  - wind loop;
  - Shaido shout ×2;
  - earth heave;
  - Lan slash;
  - shield flare.

  No new SFX files.

---

## 7. Memory and audit budget

### 7.1 GPU textures (WebKit, measured with `tools/stage5/texture-dump.mjs RWB_STAGES=7`)

Baselines today: Stage 6 boss peak is **110.91 MiB** source (124.00 MiB in GL wrappers), and Stage 5 is
108.96 MiB.

| Item | Stage 6 (measured) | Stage 7 (estimate) |
|---|---|---|
| Atlas fighters, colour plus compact normals | 82.97 MiB (riley, grunt, spear, hound) | **67.20 MiB** (riley 34.30, grunt 19.90, spear 13.00) |
| Painted cast and props | 15.82 MiB (cap 17.0) | **≈ 7.7 MiB** (cap **12.0**) |
| Backgrounds resident (streamed) | ~6.5 MiB | **≈ 8.4 MiB** |
| Powers, HUD, FX, shared | ~5.6 MiB | ~5.6 MiB |
| **Boss peak (source)** | **110.91 MiB** | **≈ 89 MiB. Gate: ≤ 105 MiB** |

- Painted cap: 12.0 MiB, set in `tests/stage7-memory.test.mjs`†.
- The 16 MiB of slack below the 120 MiB guide is deliberate. It absorbs the one call-in sheet loaded on demand,
  the cutscene `<video>` decode surface (outside the texture count, but part of iOS memory pressure), and future
  Riley moveset growth.
- **Do not spend the slack on a fourth atlas fighter.** If design later wants hounds back, that is a 15.77 MiB
  decision for Jason.

### 7.2 Streaming and deferral
- **`STREAMS[7]`†** in `src/zone-stream.js`: `far: 'bg7far'`, with zones
  `[{bg7mid, bg7floor}, {bg7mid2, bg7floor}, {bg7mid3, bg7floor2}, {bg7mid4, bg7floor3}]` and
  `bleed: [128, 48, 48, 48, 128]`.
  - Plates outside the first 2 zones are `deferredPlateKeys` and come in through `createPlateStream`.
- **Deferred sheets.** These use the Stage 5 `pump(scene, after)` pattern from `src/stage5-demand.js` /
  `src/stage5-load.js`. New file: `src/stage7-load.js`†.
  - `s7asmo` loads when Z2 is cleared. If it isn't ready at the boss trigger, the boss intro waits up to 1.5 s,
    then uses the code-drawn fallback.
  - `s7moir`, `s7lan` and `s7earth`/`s7shield` load **when the charge first becomes ready**, both helpers at
    once (about 2.4 MiB). They stay until the stage is released.
  - `s7dust` is released when Z1 is cleared. `s7portal` is released when Z0 is cleared.

### 7.3 Byte audit lines (new, in `tools/audit-stage1.mjs`)

| Line | Contents | Budget |
|---|---|---|
| `stage7.source`† | `STAGE7_SRC` set: every `src/stage7*.js`, `moilan-call.js`, `call7-cutscene.js`, `shaido.js`, `asmodean.js`, `bot-stage7.js` | 192 KB |
| `stage7.voices`† | `/^(st7_\|riley_st7_)/` | 4,915,200 |
| `stage7.music`† | `music-stage7.mp3`, `music-boss7.mp3` | 2,400,000 |
| `stage7.art`† | `assets/stage7/**`, `assets/bg7/**` | 6,000,000 |
| `cutscenes.callIns7`† | `assets/cutscenes/call7/**` | 9,000,000 |
| `cutscenes.stage7`† | `assets/cutscenes/stage7/**` | 2,000,000 |

**Pre-fight gate impact.**
- The new set is a stage set, so it must cost the gate **0 bytes**.
- The only counted bytes Stage 7 may add are T1's edits to `src/stages.js` and `src/stage6-def.js`. Those have a
  ceiling of **+400 bytes**, checked in T1.
- Edits to `src/cutscene.js` and `src/cutscene-hooks.js` count against the 20 KB `CUTSCENE_SRC` line, which has
  about 4.5 KB free.

---

## 8. Build order (Grok 4.7 cloud agents, one task per PR, sequential)

### 8.1 Every task brief must say

The brief format is the one in `docs/GROK-BRIEF-P1.md`.

1. Branch from the **current head of the Stage 7 integration branch** `rwb-w2-stage7`†, which is cut from `rwb-w2`.
   Open a **draft PR into `rwb-w2-stage7`**. Never open a PR into `rwb-w2`, and never merge.
2. The protected files (§0.1) are untouchable. Never edit an existing test.
3. Run all of these and paste their tail into the PR:
   - `node --check` on every changed `.js`;
   - `node --test tests/*.test.mjs`;
   - `node tools/audit-stage1.mjs`;
   - `git diff --check`.
4. The golden simulation diff for Stages 1–6 must be empty (`tests/helpers/stage1-simulation.mjs`, seeds
   `FULL_STAGE_SEEDS`).
5. Put the raw.githack preview URL of the head SHA, with `?stage=7&s7=1`, in the PR body.
6. Known baseline. `tests/stage4-placeholders.test.mjs` fails on machines without Pillow
   (`ModuleNotFoundError: PIL`). Run `pip install pillow` first. A failure caused only by that is not a regression.
7. CI note. `.github/workflows/stage1-regression.yml` only triggers on PRs into `rwb-2`. Run the 4 commands
   locally on Node ≥ 22.

### 8.2 Tasks

| # | Task | Files (new †) | Acceptance |
|---|---|---|---|
| **T1** | Generalise the hard-coded 6s (§0.2): kit freeze predicates; `stageFromQuery`/`resolveStage` to `MAX_STAGE`; `stageEnabled(7)` via `s7` (default off); `STAGE6.next` → 7 when enabled; `callInFor` 3-way; Stage 6 HUD guards `>= 6` → `=== 6`; `bot-stage4` dispatch; `plateRect` bleed from `STREAMS[n].bleed`; `COMPACT_STAGES` += 7 | `src/stages.js`, `src/stage6-def.js`, `src/stage6.js`, `src/stage6-hud.js`, `src/rand-call.js`, `src/bot-stage4.js`, `src/zone-stream.js`, `src/texture-pages.js`, `src/stage1.js` (2 predicates only); new `tests/stage7-generalise.test.mjs`† | (a) All existing tests pass. (b) Golden diff for 1–6 empty. (c) `?stage=7` without `s7=1` resolves to 1. (d) Stage 6 `plateRect` output is identical for i = 0–3 (pinned in the test). (e) Pre-fight gate grows ≤ 400 bytes. (f) `callInFor(5)==='loial'`, `(6)==='rand'`, `(7)==='moilan'` |
| **T2** | Stage 7 skeleton: `STAGE7` def (zones, drops, crates, skip, boss stub = Be'lal-shaped dummy with `hp 600`); `Stage7Kit` implementing the full kit interface with empty hazards; `queueStage7`; `releaseStage` wrapper for 7; `STREAMS[7]` with code-drawn plates; `STAGE7_SRC` and all §7.3 audit lines (0-byte folders allowed) | `src/stage7-def.js`†, `src/stage7.js`†, `src/stage7-paint.js`†, `src/stage7-painted.js`† (generated stub), `src/zone-stream.js`, `src/stages.js` (import plus registry entry), `tools/audit-stage1.mjs`; `tests/stage7-registry.test.mjs`†, `tests/stage7-size-caps.test.mjs`† | (a) `?stage=7&s7=1` boots, walks Z0→Z3 with grunt/spear waves, reaches a beatable dummy boss, shows clear card. (b) Harness campaign 9/9 with the dummy boss. (c) Stage 6 → 7 transition and 7 → 1 release leave no Stage 7 texture keys (assert on the stubbed texture manager). (d) Audit prints every new line, all PASS. (e) Story panels are released before Z0 wave 0 |
| **T3** | Shaido enemies: `dancer` (flank, cartwheel-lunge, yield) and `veiled` (archer volleys, 0.6 s spacing, yield); code-drawn sprites; wire into Z0–Z2 waves | `src/shaido.js`†, `src/stage7-actors.js`†, `src/stage7-def.js`; `tests/stage7-shaido.test.mjs`† | (a) Unit: dancer stays out of the attack-token cap while circling; never more than 2 tokens held. (b) Two archers never fire within 0.6 s. (c) Humans never produce ash; they yield. (d) Campaign 9/9 |
| **T4** | Sandstorm (Z1): cycle, telegraph, gust push, block halves push, silhouette spawns, overlay at 0 lights; seeded direction | `src/stage7-storm.js`†, `src/stage7.js`; `tests/stage7-storm.test.mjs`† | (a) Gust never starts during grab or call strike. (b) Push only changes X and respects zone bounds. (c) Silhouetted enemies have no hitbox for 0.6 s. (d) Lights ≤ 10 throughout. (e) Bot: ≤ 30% of Z1 deaths during gusts, campaign 9/9 |
| **T5** | Waking street (Z2): ring every 9 s while a wave is active, 1.1 s tell, 1.6 s shard strike, hits enemies too, `counterUsed` latch | `src/stage7-street.js`†; `tests/stage7-street.test.mjs`† | (a) Never on a grabbed band. (b) At most 1 ring. (c) Riley max 1 hit per strike. (d) Enemies take 30. (e) Campaign 9/9 |
| **T6** | Asmodean P1: phrase table at 96 BPM on game clock, band tells, one free band guaranteed, gold sour note reflect, harp bash with latch | `src/asmodean.js`†, `src/stage7-notes.js`†; `tests/stage7-asmodean.test.mjs`† | (a) For every phrase in the table, at least one band is free for the full phrase. (b) Reflected note does 4% and staggers 0.8 s. (c) Every note/bash has a tell ≥ 0.55 s. (d) Freeze-frame check: every hit on Riley in 9 seeds has a visible tell in the preceding 0.5 s |
| **T7** | Asmodean P2 and P3: column resonance (3.2 s, 1.0 s hum, 0.9 s rain, hits enemies), add waves; key channel (1.8 s, 3-hit or throw interrupt, 1.4 s stun), shockwave jump; defeat/bind sequence and `bossDown` | `src/asmodean.js`, `src/stage7-arena.js`†, `src/stage7-def.js`; extend `tests/stage7-asmodean.test.mjs` | (a) Gates at 66%/33% cannot be skipped by any damage source (fuzz 1,000 random hits). (b) Interrupt rules unit-tested. (c) Shockwave is avoidable by a jump started ≤ 0.2 s before contact. (d) Campaign 9/9, lag bot ≥ 8/9 |
| **T8** | Call-in rules: `CALL7`, `pickHelper`, charge/recharge/phase rules; no scene code | `src/moilan-call.js`†; `tests/moilan-call.test.mjs`† | (a) `pickHelper` table test covers boss/spawn≥3/elite/human/empty. (b) Charge rules mirror `rand-call` tests 1:1. (c) Boss damage clamps at the next gate. (d) Humans never reach 0 HP from a call |
| **T9** | Call-in in game: lifecycle hooks, Moiraine/Lan/Duo strikes with code-drawn FX, freeze, invulnerability, helper lines; HUD slot with live portrait and label; help text | `src/stage7-lifecycle.js`†, `src/stage7-freeze.js`†, `src/stage7-hud.js`†, `src/stage7-voice.js`†; `tests/stage7-call.test.mjs`†, `tests/stage7-loial-rand-unchanged.test.mjs`† | (a) Stages 1–5 still spawn Loial; Stage 6 still calls Rand (assert class/kit). (b) Hooks restored on destroy (assert function identity). (c) Call-on boss time is 70–102% of call-off over 9 seeds. (d) Stage 7 HUD never shows "Loial" or "Rand" |
| **T10** | Bot: `stage7Bot` (dodge note bands, jump shockwave, interrupt channel, brace in gusts, step off rings, use call when predicted helper fits) | `src/bot-stage7.js`†, `src/bot-stage4.js` (1 line); `tests/stage7-campaign.test.mjs`† | Campaign 9/9, lag-250 ms bot ≥ 8/9, total Stage 7 time per seed logged in the PR |
| **T11** | Cutscene plumbing: generalise `encode_rand.sh` to take a folder; `call7-cutscene.js` with per-helper bags and predicted-helper prefetch; `STAGE_CLIPS[7]` and `wrapStart(7, 7)`; poster-only placeholders are allowed (clip missing → strike still runs) | `tools/cutscenes/encode_callins.sh`†, `src/call7-cutscene.js`†, `src/cutscene.js`, `src/cutscene-hooks.js`; `tests/stage7-cutscene.test.mjs`† | (a) Strike timing identical with clip present, stalled, or missing (stubbed player). (b) Only one call-in blob alive at a time. (c) Bags persist across a page reload within the session. (d) `CUTSCENE_SRC` line ≤ 20 KB |
| **T12** | Audio: 24 voice lines (DYLO, Jason narrator clone, bf_emma, two Voice Designs), `voice-render.json`, narrator hints, Whisper check; `music-stage7`/`music-boss7` at 96 BPM with loop check | `assets/audio/voice/st7_*.mp3`†, `riley_st7_*.mp3`†, `tools/stage7/voice-render.json`†, `tools/jason-narrator/narrator-lines.json`, `assets/audio/riley-voice-manifest.json`, `assets/audio/music-*7.mp3`† | (a) Every line ≤ 200 KB; voice line ≤ 4,915,200. (b) Whisper `medium.en` transcript matches script (normalised) for every line. (c) Loudness within the ranges in §6.1. (d) `check_loops.py` passes. (e) No Stage 7 voice matches a pre-fight path |
| **T13** | Painted art: `tools/stage7/process_art.py` JOBS, all §5.2 keys, `ART_STATUS.json`, generated `stage7-painted.js` | `assets/stage7/**`†, `assets/bg7/**`†, `tools/stage7/process_art.py`† | (a) Every key within its decoded and file caps. (b) `texture-dump` with `RWB_STAGES=7`: boss peak ≤ 105 MiB source, painted resident ≤ 12.0 MiB (`tests/stage7-memory.test.mjs`†). (c) `tests/no-placeholder.test.mjs` covers 7 and passes. (d) Art shots (`tools/stage6/art-shots.mjs` pattern) for each zone attached to the PR |
| **T14** | Cutscene clips: M1, M2, L1, L2, D1, D2 (and optional S7) through Grok Imagine; frame review; encode; `ART_STATUS.json` entries with reviewer | `assets/cutscenes/call7/**`†, `assets/cutscenes/stage7/**`† | (a) Each clip ≤ 160 KB/s, 5–10 s, 854×480. (b) `cutscenes.callIns7` ≤ 9,000,000, `cutscenes.stage7` ≤ 2,000,000. (c) Frame review log shows no frame with Riley's face. (d) Jason signs off on likeness |
| **T15** | Hardening and enable: browser pass on iPhone-class WebKit (copy `tools/stage6/browser-hardening.mjs`), 60 fps p95 check, pause/resume, governor drop to low, continue after death mid-call, stage switch mid-cutscene; then flip `stageEnabled(7)` default on | `tools/stage7/browser-hardening.mjs`†, `src/stages.js` (1 line), `docs/stage7/STATUS.md`† | (a) No console errors in 5 full runs. (b) 60 fps p95 on the reference device or WebKit throttled profile. (c) All earlier T acceptance still green. (d) Jason's playtest sign-off before the default flips |

**Order rationale.**
- T1 must land first, because everything else depends on it.
- T2 gives a shippable-but-plain stage behind `s7=1`.
- T3–T10 are gameplay on code-drawn art, so each one is testable alone.
- T11–T14 are content that can be produced in parallel by humans or other agents, and that merges without code
  risk because of the fallbacks.
- T15 turns the stage on.

---

## 9. Test plan summary

| Test file † | Covers |
|---|---|
| `stage7-generalise` | T1 predicates; Stages 1–6 unchanged |
| `stage7-registry` | def shape, queue, release, streams, audit lines |
| `stage7-size-caps` | every Stage 7 file within its cap; source ≤ 192 KB |
| `stage7-shaido`, `stage7-storm`, `stage7-street` | enemy and hazard rules |
| `stage7-asmodean` | phrases, free-band invariant, gates fuzz, channel, shockwave |
| `moilan-call`, `stage7-call` | pure rules and in-game call |
| `stage7-loial-rand-unchanged` | Loial on 1–5, Rand on 6 |
| `stage7-cutscene` | strike timing independent of clip; blob lifecycle |
| `stage7-campaign` | 9/9 seeds, lag bot ≥ 8/9, call fairness 70–102% |
| `stage7-memory` | painted resident ≤ 12 MiB; reads `docs/stage7/texture-art.json`† produced by `texture-dump` |
| `no-placeholder` (existing, loops stages) | add 7 to its stage list. That is an edit to a test's data table, so ask Jason first, or add `stage7-no-placeholder` as a separate file |

**Freeze-frame check (the `plan/LEVELS.md` gate).** For 10 random hits on Riley per seed, take the frame 0.5 s
before the hit. A tell must be visible in at least 9 of 10.

---

## 10. Pushback and risks

- **Asmodean's canon fate.** He survives TSR, is shielded and becomes Rand's teacher. Stage 7 keeps him alive and
  bound, so it doesn't contradict the books. If Jason wants a cleaner "boss dies" beat, Asmodean can vanish
  instead. Do not kill him.
- **Lan and Moiraine as a pair.** In canon they reach Rhuidean together, so this fits. Two helpers do add more
  art and clips than Rand alone, which is why the roster drops the hound.
- **The rhythm phase on iPhone.** Audio latency on iOS Safari varies by 50–250 ms. That is why notes run on the
  game clock and the music only *matches* the BPM. Do not "fix" this by syncing to `AudioContext.currentTime`.
- **Sandstorm readability.** Alpha 0.35 is the ceiling. Test it on the iPhone at low brightness. If it's
  unreadable, cut to 0.25 rather than removing enemies.
- **Auto-picked helper.** Some players will want to choose. The live HUD portrait teaches the rule. A
  "double-tap = other helper" option is a possible follow-up, but it touches `src/input.js` (protected), so it is
  out of scope.
- **Moiraine's voice.** `bf_emma` (Kokoro) is lower fidelity than the ElevenLabs designs used for Lan and
  Asmodean, so the difference in a duo scene may be audible (D3).

---

## 11. Decisions for Jason (defaults apply if no answer)

| # | Question | Default |
|---|---|---|
| D1 | Boss: Asmodean (bound, not killed)? | **Yes** |
| D2 | Drop hounds from Stage 7 to fund the call-in art (−15.77 MiB)? | **Yes** |
| D3 | Moiraine voice: keep Kokoro `bf_emma`, or design an ElevenLabs voice and re-render `st1_moiraine_01`, `st1_clear_moiraine_01`, `st6_moiraine_01`? | **Keep `bf_emma`** for continuity |
| D4 | Helper choice: automatic (`pickHelper`) or alternating? | **Automatic** |
| D5 | Clips play on every call (like Rand), skippable? | **Yes** |
| D6 | Optional Stage 7 intro clip S7? | **Yes**, if T14 has budget left |
| D7 | Stage 7 → next: loop to Stage 1 until Stage 8 exists, then `next` → 8 behind `s8=1` (`docs/CAMPAIGN-ARC-PLAN.md`)? | **Yes** |
