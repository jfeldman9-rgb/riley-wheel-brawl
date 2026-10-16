# Stage 5 plan outline: the Blight and the Eye of the World

*Planner: Claude Opus 5.5, Tue Oct 6 2026, from `rwb-w2` at `afd7053` (Stages 1–4 shipped). Outline only, same shape
as `docs/stage4/PLAN-OUTLINE.md`. Names marked **†** are NEW. Every other name was checked in this checkout.* Tone is
teen/adult: Riley is 16 and Jason plays a lot. Fairness comes from readable tells and zero softlocks, not from making
the game easy. There is no gore. Shadowspawn dissolve to ash (`fx-ash` style), and the Forsaken burn or wither away.

**Setting choice.** Jason asked for the Blight and the Eye, and the canon order supports it. `plan/LEVELS.md` row 5 is
The Ways (Machin Shin) and row 6 is Tarwin's Gap and the Blight (the Worm). Stage 4's shipped outro
(`st4_clear_01..03` in `src/stage4-voice.js`) ends at a Waygate with Loial. In the book, the Ways come out at Fal Dara,
then the party crosses the Blight to the Eye. So Stage 5 **covers the Ways in the story panels** (Machin Shin is heard
but not fought) and plays the **Blight → Eye of the World** with **Aginor + Balthamel** and the **Green Man**. Tarwin's
Gap and the Worm stay as Stage 6. The Ways stage is re-slotted later (Q1).

## 0. Ground rules (every task)

- **Frozen Stages 1–4.** Existing tests and `tests/helpers/*` stay byte-identical. The Stage 1 combat payload is
  unchanged. `docs/stage1/evidence/full-stage-simulation.json` may change **only** in `sourceSha256`/`baseGitCommit`
  (because `src/stage1.js` and `src/bot.js` are hashed). Stage 2 fingerprint `cmp` = SAME. Campaigns for Stages 2, 3
  and 4 stay 9/9.
- **Flag.** `s5=1` (new) enables Stage 5, the same way Stage 4 started. `STAGE4.next` (`src/stage4-def.js`) becomes
  `q => stageEnabled(5, q) ? { stage: 5, fromStage4: true, autostart: true } : { stage: 1 }`. Without the flag it still
  returns `{ stage: 1 }`, so the assertion at `tests/stage4-campaign.test.mjs:49` holds.
- **Same controls and HUD.** No edits to `src/input.js`. Stage 5 never constructs `Input`. It uses the keys
  (E/J/Z attack, Space/K/X jump, Q/L/C special, Shift run, Esc/P pause), gamepad and touch stick/buttons. Every
  readout sits inside the existing HUD layout (§7).
- **Hardening lessons from `docs/stage4/HARDENING.md`, baked in from T1:**
  1. **Grab ownership.** Balthamel is the **only** holder in Stage 5. He uses the state names `lunge`/`holding`, so
     the existing `grabBusy` and `attackTokens()` (`src/stage1.js:305-309`) cover him with no scene edit. He sets
     `riley.grabbedBy`. Riley's own held enemy is released first. `releaseHold('break')` runs synchronously on death,
     down, respawn, continue, Loial call, hazard hit, stage switch and destroy, mirroring `src/stage4-lifecycle.js`
     `installStage4SceneHooks`/`installStage4RileyHook`. Pause freezes the hold and the mash. Two more rules from
     SL-4 in `docs/stage3/SOFTLOCK-AUDIT.md`: a **2.0 s grab lock** after any release, **0.3 s `inv`** on escape,
     and his `GRAB_OK` set excludes `hurt`. Tether, snare and hands **never** set `grabbedBy`.
  2. **Governor.** `Stage5Kit†.setQuality(level)` is null-safe before `build()` (software WebGL starts at level 4, see
     `src/main.js:31-60`). It syncs the view and every sub-kit (`blight†`, `arena5†`). It is re-applied on restart.
  3. **Delta clamp.** Every core goes through `stage4Delta` (`src/stage4-time.js`, reused as is). Boss and hold logic
     use 120 Hz substeps like `src/draghkar.js` (`hz: 120`). Results must match at 30, 60 and 120 Hz.
  4. **Hazard cleanup on zone clear.** `clearStage5Zone†` disposes every zone-owned tell, spore, gout, ignition and
     lurk. `clearStage5Hazards†` (from `clearHazards`/`destroy`/`bossDown`) also disposes tether, ring, hands, the
     Green Man and the oak, and resets `R.fogSlow = 0`.
  5. **One counter per attack, active frames only.** Each boss/elite attack instance has a `counterUsed†` latch. A
     counter is checked only while `R.attackFrame === true`, never on windup or across later substeps. This closes
     the open Stage 4 finding (the kiss lunge countered repeatedly; windup promoted to a counter frame).
- **Caps.** Lights ≤ 10 (`maxLights`, `src/main.js:20`), attack tokens ≤ `maxTokens` (2), and the per-file byte caps
  in §10.

## 1. Pitch, beat map, story

**Pitch.** The Blight is alive and it hates you. Stage 4 took space away. Stage 5 **hides threats in plain sight**:
stalkers wait in the undergrowth, trees lash, the ground spits tar, and then two Forsaken try to drink Riley dry.
Light still reveals, but this time **positioning and jumping** are the core skills.

World 5200 px, 4 zones, same registry shape. Target 4–4.5 min for the bot.

| Zone | Place | Light | Waves (new: `stalker`†, `sporepod`†) | Set piece |
|---|---|---|---|---|
| 0 (0–1280) | **Blightborder**: last green grass turning black | Red dawn, heat haze | `[grunt R 0, stalker L 1.2]`, `[spear R 0, sporepod T 0.6, grunt L 1.4]` | One harmless "show" lash, 1 thorn bed. Hint `LIGHT FLUSHES THE STALKERS`. |
| 1 (1240–2520) | **Hunting-tree wood** | Red sky through branches | `[stalker R 0, sporepod T 0.4]`, `[grunt L 0, stalker R 0.6, sporepod T 1.4]` | Grasping trees go live. Ribbon snagged in a tree: break the branch (3 hits or any fire). |
| 2 (2560–3840) | **Tar flats under the Mountains of Dhoom** | Sun low, gouts glow | `[sporepod T 0, spear R 0.5, stalker L 1.0]`, `[hound R 0, stalker L 0.6, grunt R 1.2, sporepod T 1.8]` | Tar seeps + gouts. Clear: **Twinkle Toes glimpse**, the Fade's bundle on a far ridge (`view.glimpse()` pattern, `src/stage4-view.js`). |
| 3 (3920–5200) | **The Green Man's garden**, the Eye cavern mouth | Green-gold garden light over red | Boss | Aginor waits, Balthamel arrives at P2, the Green Man at the P2 end. |

**Story in** (3 panels, 6 lines, after *"Then show me how."*):
1. NARRATOR `st5_story_01`: *"Loial led him through the Ways. In the dark, a wind whispered Riley's name."*
2. RILEY `st5_story_02` (panel: Waygate opening onto black hills): *"The trail runs north. Into the Blight."* /
   LOIAL `st5_story_03`: *"Nothing grows right here, Riley. Not even the trees."*
3. NARRATOR `st5_story_04` (panel: the Eye's glow behind dead hills): *"Past the hills, something old was waiting."* /
   RILEY `st5_story_05`: *"Good. I'm in a mood."*

**Story out** (clear card + 3 lines, hooks Stage 6): RILEY `st5_clear_01` *"She's not here. The Fade went south."* /
LOIAL `st5_clear_02` *"South is Tarwin's Gap. Every Trolloc in the Blight is going there."* / RILEY `st5_clear_03`
*"Then so am I."*

## 2. Enemies

Reused, unchanged: Stage 1 `grunt`, `spear`, `hound` (`src/enemies.js`). The Blight is Trolloc country. No new
grabber; Balthamel is the only hold.

**Blight stalker (`stalker`†, 40 HP, ambusher).** A low, wolf-sized Shadowspawn with a split jaw. Live cap **2**, and
at most **1** in a pounce tell.
- **Lurk:** spawns into a `lurks`† undergrowth patch (`assets/bg5/layout.json`†). It is visible only as two eye glints
  plus a grass shiver. A lurk patch never sits within 220 px of the zone exit. Lurk lasts at most 6 s, then it stalks
  in the open (no infinite hiding).
- **Pounce:** tell **0.7 s** (crouch, eye flare, hiss `stalkHiss`†), then a leap at 650 px/s along its band, max 380 px.
  14 dmg + knockdown. Miss = 0.9 s recovery, taking ×1.3.
- **Counter (one):** a facing active attack frame during the leap swats it down (`COUNTER!`, `down` 1.4 s, ×1.5).
- **Light:** `lightNear(s, x, 260)` (`src/myrddraal.js`) flushes every lurker in range into the open and cancels any
  pounce tell (1.0 s daze). Melee on a lurk patch also flushes it, so an empty power bar is never a dead end.
- **Token:** the `attack` state covers tell + leap, so `attackTokens()` counts it.

**Sporepod (`sporepod`†, 28 HP, rooted turret).** A bulbous Blight growth. Spawn side `T`. On spawn the actor snaps to
the nearest free `pods`† spot in the zone and plays `emerge` (1.0 s, harmless, invulnerable). It never moves. Live
cap **3**, spores in flight ≤ **2** stage-wide.
- **Lob:** 0.6 s swell (`podSwell`†), then an arcing spore lands at Riley's position **as of launch**. A red ground
  ring (r 90) shows for the full **1.0 s** flight. On landing: 10 dmg, no knockdown, then a 2.0 s spore cloud (r 90)
  that slows 30% via the existing `fogSlow` (`src/riley.js:92`). Cooldown 2.4 s. It does not lob while Riley is
  `grabbed`/`down`/`getup`.
- **Counters:** any hit interrupts the swell. Fireball or lightning kills it outright. A body thrown into it does
  20 dmg. Low threat alone; the point is crossfire with stalkers.
- **Token:** the swell is `attack`. The flight is not a token (like bolts).

## 3. Hazards (exact numbers)

| Hazard | Where | Tell | Effect | Caps / counters | Cleanup |
|---|---|---|---|---|---|
| **Grasping tree lash**† | Z0 (1 show), Z1 live | **1.1 s**: branch creaks (`treeCreak`†), the shadow of the lash swings over one `VOLLEY_BANDS` band within 300 px of the trunk | Snare: 6 dmg, `fogSlow = 0.7` for 1.2 s (Riley can still attack/jump), then **2.0 s snare immunity**. Enemies in the band: 18 dmg | ≤ 1 tell live; interval 4–6 s per tree; ≤ 2 live trees per zone. Fire on the trunk = dormant 6 s; 3 melee hits = dormant 3 s | Zone clear; `fogSlow` reset on every exit |
| **Bloodthorn bed**† | Fixed, 1–2 per zone (`thorns`†), each ≤ 220 px wide, one band | Always visible: red thorns plus a pulse every 1 s | 4 dmg per 0.5 s while inside, no knockdown. Enemies knocked in take 12 per tick | Never on the exit strip, never > 1 band. Fireball burns it for 8 s (harmless) | Static scenery. Its tick stops on zone clear |
| **Tar seep + gout**† | Z2, 3 seeps (`seeps`†), r 110 | **1.2 s**: bubbling ring brightens, `tarHiss`† | Seep: 25% slow. Gout: 14 dmg + launch (knockdown) inside r 110. Enemies 24 | ≤ 2 gout tells live. Never starts within 0.8 s of Riley's getup end. Fire ignites a seep for 3 s: 6 dmg per 0.5 s to **enemies only**, baked glow (0 lights) | Zone clear |
| **Wither ring**† | Boss P1/P3 | **0.9 s**: staff glows, ground cracks around Aginor | A ring expands from Aginor, 0 → 440 px in 1.0 s, 60 px thick. 12 dmg, no knockdown. **Jumping clears it** (z > 20 at contact), and so does being outside 440 px or inside the oak | ≤ 1 live. Test: a jump started anywhere in the 0.35 s before contact clears it at the real `riley.js` arc (vz 920) | Boss cleanup |
| **Bone hands**† | Boss P1/P3 | **1.0 s**: crack + dust ring (r 80) under Riley's position at tell start | 10 dmg + snare (same `fogSlow` 0.7 for 1.2 s) | ≤ 2 tells; never within 300 px of another tell; frozen while Riley is grabbed/down/getup; never inside the oak | Boss cleanup |

All hazards also: never spawn on a held Riley; tells pause in pause/story; a hazard hit breaks a Balthamel hold
(Stage 3 rule); none can block the exit after the last wave (each a test, mirroring `tests/stage4-towers.test.mjs`).

## 4. Boss: Aginor (`aginor`†, 600 HP, 3 phases; target ~3 min), with Balthamel and the Green Man

Aginor: withered, ancient, eager, scholar's robe, staff of bone. Balthamel: leather mask and gloves, desiccated,
fast, silent but for a dry laugh. On defeat, Aginor **burns from within** (canon: he drew too much) and collapses to ash.

**P1 The scholar (100–66%, ~50 s).** Aginor alone, keeps 300–500 px.
- **Life tether:** tell **0.8 s** (raised hand, a grey-green line draws toward Riley, `drainHum`†). It locks only if
  Riley is ≤ 520 px away **and in the same band** at the end of the tell. While locked: 2 HP + 8 saidin per 0.5 s,
  and Aginor heals 2 per tick (heal cap **30 HP per phase**, never across a phase line). Max 3.0 s. It is **not a
  hold**: Riley keeps full control. Breaks on band change, any hit on Aginor, or a light weave crossing the line.
  **Counter (one):** an active attack frame landing in the last 0.4 s of the tell = `COUNTER!`, `staggered` 1.6 s ×1.5.
- **Wither ring** (§3) every 9–11 s. **Bone hands** (§3) twice per 10 s.
- **Staff 2-string** if Riley is within 160 px: tell 0.5 s, 8/12 dmg, the second knocks back 260. Counter: none
  (spacing is the answer). After 3 hits on him within 2 s: a **short-step** blink of 300 px (0.4 s shimmer tell,
  6 s cooldown) so he can't be corner-pinned forever, and so he can't escape every punish.

**P2 Balthamel (66–33%, ~60 s).** Sa'angreal drops on entry (`bossDrop` phase 2). Balthamel (`balthamel`†, **220 HP**,
second thin bar) drops from a ledge. Aginor stays back: tether only, with a cooldown of 10 s.
- **Flail 2-string:** tell **0.5 s**, 9/11 dmg. Counter: a facing active frame on the first hit's active frames =
  parry stagger 1.0 s.
- **Shadow-step:** tell **0.6 s**, mask glint plus a dark swirl marked at the destination (behind Riley, clamped to
  bounds ±60). He arrives with a slash (12 dmg). **Counter (one):** a `back` attack active on arrival = `COUNTER!`,
  `down` 1.5 s ×1.5.
- **Withering embrace (hold):** coil **0.5 s** (arms spread, dry laugh, unique cue `embraceCue`†). Catches only a
  grounded Riley in his own `GRAB_OK` (no `hurt`). Hold: 3 HP per 0.5 s for up to **2.8 s**, screen desaturates. Mash
  **7** (any of `GRABBED.mashKeys`, held counts once), decay 1 per 0.5 s. Escape: Balthamel `shoved` 1.4 s ×1.5.
  Timeout: 16 dmg throw + knockdown and no embrace for 10 s. Fire shield active = immune. Cooldown 8–10 s; never
  two embraces without a flail or step between them.
- **Green Man beat (anti-softlock):** when Balthamel hits 0 HP **or 50 s after P2 starts** (whichever comes first),
  gameplay freezes for **2.2 s** (hazards and tells frozen, holds released first). The Green Man (`greenman`†, not
  damageable) seizes Balthamel. Vines take Balthamel, and Aginor's blast fells the Green Man. He becomes a **great
  oak** at arena centre (canon). P3 starts when **Aginor hits 33% or the beat ends, whichever is later**. Aginor is
  invulnerable during the beat, so P2 cannot be skipped by burst damage.

**P3 Too much of the Source (33–0%, ~50 s).** Aginor draws from the Eye.
- **The oak:** a fixed safe circle, r 140 at x = arena centre. No tether lock, no hands, ring blocked. It heals Riley
  1 HP/s up to 50% max HP. Stalling is capped: after 4 s inside, Aginor **roots out** (1.0 s tell, roots glow) and
  pushes Riley out 220 px with no damage. Then the oak is closed for 6 s.
- **Eye surge:** every 10–12 s the pool flares (`eyeFlare`†, 1.2 s tell). Aginor then glows **overdrawn** for 2.5 s.
  Every hit on him in that window is ×1.6, and the first one is a `COUNTER!` burn stagger of 1.4 s (one per surge).
  Ring + hands continue, and the tether cooldown drops to 7 s.
- **Below 15%:** surges every 7 s, ring every 8 s, no further changes.
- **Defeat:** Aginor ignites from inside, screams, and turns to ash. The tether, hands and ring are disposed. The oak
  stays as scenery (light off). The ribbon lies at the Eye's edge (it auto-collects on clear).

**Boss anti-softlock rules (each one a test):** P2 always ends (50 s timer). There is no state with Aginor and
Balthamel both invulnerable while Riley can act. At most one hold. Tether + hold never overlap: no tether lock while
grabbed, and a tether breaks on grab. `R.fogSlow` is 0 after every exit path. Every `done`-gated state uses a
non-looping clip. The boss can't die during the Green Man beat. Riley's death in any state releases everything in
the same call. A boss death in any of 10 states leaves no live objects.

## 5. Reuse vs new

| Piece | Builds on (real) | New |
|---|---|---|
| Registry | `STAGES`, `stageEnabled`, `maxStage`, `stageFromQuery`, `resolveStage`, `STAGE_CHARS`, `STAGE_TEXTURES` (`src/stages.js`); `src/stage4-def.js` shape | `src/stage5-def.js`† `STAGE5`†, `STAGE5_CHARS`†, `STAGE5_TEXTURES`†, `s5` flag |
| Kit | `Stage4Kit` (`src/stage4.js`), `src/stage4-lifecycle.js` hook pattern, `stage4Delta`, `stage4LightBudget` | `src/stage5.js`† `Stage5Kit`†, `queueStage5`†, `STORY5_SCRIPT`†; `src/stage5-lifecycle.js`† |
| Hazards | `VOLLEY_BANDS`, `canEscapeTower` reachability idea (`src/stage4-towers.js`), `fogSlow`, `lightNear` | `src/stage5-blight.js`† (lash, thorns, seeps, gouts) |
| Enemies | `Cultist`/`CultistActor` split (`src/cultists.js`, `src/stage4-actors.js`), `casterBusy` pattern | `src/blightspawn.js`† `Stalker`†, `Sporepod`†; `src/stage5-actors.js`† `STAGE5_ACTORS`† |
| Hold | `Cutthroat` hold, `GRAB_OK`, `GRABBED.mashKeys`, `mashRing` (`src/hud.js`) | `src/balthamel.js`† `Balthamel`† |
| Boss | `Draghkar` (substeps, phases, seeded RNG), `draghkar-impact.js` strike split; **not edited** | `src/aginor.js`† `Aginor`†, `src/stage5-arena.js`† (ring, hands, oak, surge, Green Man) |
| HUD/bot/audio | `drawStage4Meters` hook in `src/hud.js:426`, `stage4Bot` (`src/bot-stage4.js`), `STAGE_MUSIC` (`src/music.js`), `registerLines` (`src/audio.js`), `bark` pattern (`src/stage4-voice.js`) | `src/stage5-hud.js`†, `src/bot-stage5.js`†, `src/stage5-voice.js`†, `src/stage5-sfx.js`† |

**Shared-file edits (minimal, listed):** `src/stages.js` (registry); `src/stage4-def.js` (`next` only);
`src/stage1.js` (imports, `ENEMY_CLASSES` spread, `STAGES[5].queue/start`, `releaseStage` for 5, `startStage5`†);
`src/hud.js` (`STAGE_NAMES[5]`, `bossLabel` 3‖4‖5, `placeholderArt`, one `drawStage5Meters`† call); `src/bot.js`
line 73 dispatch (`stageNo >= 4`, then `stage4Bot` forwards stage 5 to `stage5Bot`†); `src/music.js`, `src/audio.js`
track rows; `tools/audit-stage1.mjs` (Stage 5 budgets). Nothing else.

## 6. HUD additions (inside the existing layout)

- `STAGE_NAMES[5] = 'STAGE 5 · THE BLIGHT — THE EYE OF THE WORLD'`. Boss bar: `AGINOR`, portrait `aginorPortrait`†.
- **P2 second bar:** a thin (6 px) Balthamel bar directly under the boss bar, in the same box. Hidden at the P2 end.
- **Hold:** the existing `mashRing` plus a `MASH ATTACK` hint at (640, 86), the same spot as `kissHint`.
- **Tether:** a world-space line, plus the existing saidin bar flashing grey-green while it drains. No new panel.
- **Surge arc:** an arc over Aginor like `croonArc`, filling across the 1.2 s tell, then gold for the overdrawn
  window. **Snare:** a vine ring at Riley's feet with a 1.2 s countdown arc.
- **Flash hints (once each):** `LIGHT FLUSHES THE STALKERS`, `JUMP THE RING`, `STEP OUT OF THE TETHER'S LINE`,
  `HIT HIM WHILE HE BURNS`.

## 7. Art (procedural boot art, `PLACEHOLDER ART` tag, like `src/stage4-art*.js`)

Painted at boot with `tex`/`sheet`/`canPaint` from `src/stage4-art.js` (imported, not copied). Files:
`src/stage5-art.js`† (orchestrator + anims), `src/stage5-art-bg.js`† (red sky gradient + sun disc, 2 parallax skylines of
twisted trees and black peaks, cracked black floor ×3 tileable, Eye cavern mouth glow, garden), `src/stage5-art-fx.js`†
(lash, thorns, seep, gout 4 fr, spore 3, spore ring, wither ring, tether segment, hands 4, oak 2 states, eye flare 4,
ash 6), `src/stage5-art-cast.js`† (stalker: lurk/stalk/pounce/hurt/down/ash; sporepod: emerge/idle/swell/lob/hurt/die;
Aginor: idle/walk/staff2/tether/ring/hands/step/surge/overdrawn/stagger/burn; Balthamel: drop/idle/flail2/step/coil/
hold/shoved/vines; Green Man: arrive/seize/fall/oak; portrait 256²; story panels ×3).
Keys† (all go in `STAGE5_TEXTURES`): `bg5far bg5mid bg5mid2 bg5floor bg5floor2 bg5floor3 s5tree s5lash s5thorn s5seep
s5gout s5spore s5ring s5tether s5hand s5oak s5flare s5stalk s5pod s5agin s5balt s5green story5p1 story5p2 story5p3
aginorPortrait`, plus the shared `crate planks ribbon`. Layout data: `assets/bg5/layout.json`† (sun keys, lurks, pods,
trees, thorns, seeps). Governor ≥ 2: one skyline, half the haze particles, 4 tether segments. **Riley is not
repainted.** Riley on-model rule for any later painted pass: 16, very muscular, short dark hair, thin blue-framed
glasses, sleeveless black Asha'man coat, never a kid.

**Voices (`src/stage5-voice.js`† `LINES`†, prefix-safe ids):** **Kokoro** (same as `tools/stage4/tts_stage4_lines.py`)
for RILEY and LOIAL: `st5_story_02/03/05`, `st5_clear_01..03`, `riley_st5_stalk_01` *"Something's in the grass."*,
`riley_st5_tree_01` *"The trees are moving!"*, `riley_st5_ring_01` *"Jump it!"*, `riley_st5_free_01` *"Get your hands
off me, corpse."*, `riley_st5_greenman_01` *"No! Not him!"*, `riley_st5_victory_01` *"Burn, then."*. **ElevenLabs**
for NARRATOR `st5_story_01/04`; AGINOR `aginor_intro_01` *"A channeler. Untrained. Delicious."*, `aginor_drain_01`
*"Your strength is wasted on you."*, `aginor_surge_01` *"The Eye... so much... more!"*, `aginor_burn_01` (scream);
BALTHAMEL `balthamel_laugh_01` (dry laugh, wordless); GREEN MAN `greenman_arrive_01` *"You will not touch my garden."*,
`greenman_fall_01` *"Grow... again..."*. 23 lines.
**Music:** `music-stage5` (low brass drone, war drums, distorted strings), `music-boss5` (choir swell plus a
heartbeat-like pulse that speeds up in P3), made with `tools/music/compose.py` and the Stage 4 composer pattern
(`tools/stage4/compose_stage4.py`). Loops are checked with `tools/music/check_loops.py`.

## 8. Audio / SFX (synth, in `src/stage5-sfx.js`†, modelled on `STAGE4_CUES`/`playStage4Sfx`)

`stalkHiss`, `stalkLeap`, `podSwell`, `sporeSplat`, `treeCreak`, `lashCrack`, `thornPulse` (quiet), `tarHiss`,
`goutBurst`, `ringCrack`, `handsBurst`, `drainHum` (loop only while the tether is locked; stops on pause, cleanup and
stage switch, like `croon(false)`), `embraceCue`, `eyeFlare`, `oakGroan`, `burnRoar`. Barks use the 8 s `bark` gap.

## 9. Perf and light budget

Worst case (P3): hero 1, sun 1, eye pool 1, oak 1, flare 1, fireball 1, pickup 1, ribbon 1, power 1 = **9 ≤ 10**.
Spores, gouts, thorns, tether and the ring are unlit sprites with baked glow. The Green Man beat swaps the eye light
for the oak light (net 0). Haze is particles, not a shader. Pools: spores 2, ring 1, hands 2, tether segments 8.
iPad smoothness is Jason's check. Headless reports avg fps and frames > 33 ms.

## 10. Byte budgets

- **Stage 1 pre-fight 25 MB gate:** unchanged and must still PASS. `tools/audit-stage1.mjs` gets a `STAGE5_SRC`† set and
  a `stage5`† section: **source 192 KB** (same as `stage4.source`), **voices 23 × 200 KB**
  (`/^(st5_|aginor_|balthamel_|greenman_|riley_st5_)/`), **music 2 × 1.2 MB**. Stage 5 adds no image files (procedural
  art). It is imported the way Stage 4 is, so the same cold-load caveat from `docs/stage4/STATUS.md` applies.
- **Per-file caps (asserted in each module's test, like `tests/stage4-draghkar.test.mjs:27`):** `aginor.js` ≤ 16384;
  `stage5.js`, `stage5-blight.js`, `stage5-arena.js`, `bot-stage5.js` ≤ 12288; `blightspawn.js`, `balthamel.js` ≤ 9216;
  each `stage5-art*.js` ≤ 24576; `stage5-hud.js`, `stage5-voice.js`, `stage5-sfx.js`, `stage5-def.js` ≤ 6144. Each
  voice < 200 KB. `src/bot.js` changes by about +1 byte. The Stage 4 outline records a 12288 cap for it, but no
  test asserts that cap. `stage5-size-caps` adds the assertion.

## 11. Test plan

**Gates rerun unchanged:** `tests/stage4-campaign.test.mjs`, `tests/stage3-campaign.test.mjs`,
`tests/stage2-campaign.test.mjs` (9/9 each), `tests/full-stage-simulation.test.mjs`, `tests/full-stage-evidence.test.mjs`
(after a metadata-only regen via `tests/helpers/run-full-stage-simulations.mjs`), `tests/stage4-hardening.test.mjs`
(idle + no-power), `tests/stage3-softlock-hardening.test.mjs`, `tests/stage4-registry.test.mjs`, `tests/hud-input.test.mjs`,
`tests/player-input.test.mjs`. Stage 2 fingerprint: `/workspace/ag/baselines-8d8d17b/s2-fingerprint.mjs`, then `cmp`
against `s2.base.json` → SAME (procedure in `docs/stage3/BUILD-T12-T16.md:63-95`). "Extend" means a new sibling file
copying the shape; existing files are not edited.
**New:** `tests/helpers/stage5-harness.mjs`† (copy of `stage4-harness.mjs`: `s5=1`, `story=0`, `noPower`);
`stage5-registry` · `stage5-input` (copy of `tests/stage4-input.test.mjs`: no Stage 5 module constructs
`Input`) · `stage5-kit` (governor before build, light cap) · `stage5-blight` (every §3 number, reachability
from the worst state at 205 px/s, exit never blocked) · `stage5-stalker` · `stage5-sporepod` · `stage5-aginor` (phases,
tells ≥ spec, heal cap, ring jump window) · `stage5-balthamel-hold` (ownership, grab lock, inv, pause, 30/60/120 Hz) ·
`stage5-greenman` (50 s timer, invulnerable beat, P3 gate) · `stage5-arena` (oak cap, surge, defeat cleanup) ·
`stage5-hud` · `stage5-flow` (s4→s5 continue only with flag; restart `{ stage: 1 }`) · `stage5-audio` (files > 2 KB,
< 200 KB, loops) · `stage5-campaign` (9 seeds `FULL_STAGE_SEEDS`; per-frame invariants as in `stage4-campaign`
`checkFrame`: finite, lanes 572–690, tokens, ≤ 1 holder, stalkers ≤ 2, spores ≤ 2, gout tells ≤ 2, lash tells ≤ 1,
lights ≤ 10, `fogSlow` = 0 when no snare/cloud; every mechanic stat ≥ 1) · `stage5-hardening` (idle 120 s, no-power
seed 1 clears, 200-input fuzz progresses ≤ 90 s per wave) · `stage5-hardening-governor` · `stage5-hardening-delta`
(NaN/0/huge dt) · `stage5-hardening-counter` (one counter per attack, windup never counts, across substeps) ·
`stage5-hardening-lifecycle` (restart/continue/stage switch mid-hold, mid-tether, mid-beat, mid-gout; no
objects/lights/loops left) · `stage5-hardening-light-budget` · `stage5-size-caps`.

## 12. Tasks (one Grok 4.7 cloud-agent session each)

| T | Task | Depends | Acceptance |
|---|---|---|---|
| T1 | Registry + `s5` flag, `STAGE5` def shell, `STAGE4.next`, `STAGE_MUSIC[5]` placeholder, `stage5-harness` | — | `stage5-registry`, `stage5-flow` (part); all gates green |
| T2 | `tools/audit-stage1.mjs` Stage 5 budgets + `stage5-size-caps` test | T1 | audit PASS, 25 MB unchanged |
| T3 | `Stage5Kit` + lifecycle hooks, `layout.json`, view (sky, sun keys, skylines, floors), `setQuality` | T1 | `stage5-kit`, `stage5-hardening-governor` |
| T4 | `stage5-blight.js` pure core: lash, thorns, seeps/gouts, `fogSlow` discipline, caps, zone cleanup | T1 | `stage5-blight`, `stage5-hardening-delta` |
| T5 | `blightspawn.js` `Stalker` + `Sporepod` (pure) + `stage5-actors.js` | T1 | `stage5-stalker`, `stage5-sporepod` |
| T6 | `aginor.js` P1 (tether, ring, hands, staff, short-step, counters) | T1 | `stage5-aginor` P1, `stage5-hardening-counter` (P1) |
| T7 | `balthamel.js` hold + flail + step; P2 wiring | T6 | `stage5-balthamel-hold` |
| T8 | `stage5-arena.js`: Green Man beat, oak, surge, P3, defeat cleanup | T4, T7 | `stage5-greenman`, `stage5-arena` |
| T9 | Procedural art: bg + fx (`stage5-art.js`, `-bg`, `-fx`) | T3 | keys painted, sizes ≤ cap, placeholder tag shows |
| T10 | Procedural art: cast + portrait + story panels (`stage5-art-cast.js`) | T5, T7, T9 | frame counts per §7, clips non-looping where `done`-gated |
| T11 | Audio: lines (Kokoro/ElevenLabs), SFX, music loops, `stage5-voice.js` | T1 | `stage5-audio` |
| T12 | HUD (`stage5-hud.js`, `hud.js` hooks), story in/out, stage select | T8, T11 | `stage5-hud`, `stage5-flow` |
| T13 | `bot-stage5.js` + 9-seed campaign + no-power + idle | T4, T5, T8, T12 | `stage5-campaign` 9/9, `stage5-hardening` |
| T14 | Hardening pass: lifecycle, light budget, fuzz, Hz parity, golden metadata regen, S2 `cmp` | T13 | `stage5-hardening-*`, `docs/stage5/HARDENING.md`† |
| T15 | Status + handoff (`docs/stage5/STATUS.md`†); **T16** open Stage 5 in the campaign only on Jason's OK | T14 | Stage 4 STATUS shape |

Lanes after T1: **A** T3→T9, **B** T4, **C** T5, **D** T6→T7→T8, **E** T11. They join at T10/T12, then T13.

## 13. Open questions for Jason

| # | Question | Default |
|---|---|---|
| Q1 | Stage 5 takes the Blight + Eye. Machin Shin becomes a story line only. Re-slot "The Ways" (LEVELS row 5) later? | Yes. Tarwin's Gap + the Worm stay Stage 6. Revisit the Ways as a short bonus stage after 10 |
| Q2 | Balthamel embrace: mash 7 in 2.8 s with decay. Right teeth? | Yes; tune once after a Riley playtest |
| Q3 | Should the oak heal (1 HP/s to 50%) in P3, or only be safe ground? | Heal to 50% with the 4 s root-out cap |
| Q4 | Score/lives carry 4 → 5? | Reset, the same as Stages 3 and 4 |
| Q5 | Procedural placeholders only, or queue painted art for Aginor/Balthamel first? | Procedural first; painted masters after the campaign is green |
