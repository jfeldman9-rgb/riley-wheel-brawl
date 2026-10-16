# Stage 4 plan outline: Shadar Logoth and the Draghkar

*Planner: Claude Opus 5.5, Mon Oct 5 2026. Outline only; the full `docs/stage4/PLAN.md` follows the shape of
`docs/stage3/PLAN.md` once Jason answers §10. Source rows: `plan/LEVELS.md` row 4 and `plan/PLAN.md` §5–§8 (Draghkar row,
"Mashadar tendrils that react to the player").* Tone: this is a teen/adult game. Fairness comes from readable tells and
zero softlocks, not from making it easy. No gore: Shadowspawn dissolve to ash; human cultists are KO'd (stars) or flee.

**Branching.** Stage 3 (`rwb-2-stage3-ag`) merges first. Stage 4 lands on **`rwb-2-stage4`**, cut from `main` after that
merge. Before the merge, "prep" tasks (§8, marked **P**) may run on `rwb-2-stage4-prep`, cut from the Stage 3 head. They
**only add new files** (tools, docs, prompts, placeholders, pure modules + their tests), so a rebase is conflict-free.
Ground rules from Stage 3 §0 carry over unchanged: never edit existing tests, Stage 1 golden sim identical, Stage 2
fingerprint SAME, Stage 3 campaign 9/9 green, labelled placeholders only, size caps enforced by check D.

**Existing art.** Nothing for Stage 4 exists in this checkout (`assets/`, `spike-art/`, `art-in/` searched for
logoth/mashadar/draghkar/fog/pano). PLAN.md line 22 mentions painted **Stage 4/5 panoramas** from 1.2; they are not here
(see Q2). If found, they are attached as composition refs for `bg4-far`, never shipped as-is.

## 1. Pitch, beat map, story

**Pitch.** Riley follows the ribbon trail into the dead city at moonrise. Nothing alive is here except the fog, and the
fog is hungry. The stage is about **space**: Mashadar takes floor away, towers fall onto it, cultists call it toward you,
and the Draghkar finishes by closing it around you. Light is the only thing that gives space back (the Stage 3 lesson
"light beats shadow", now load-bearing).

World 5200 px, 4 zones, same registry shape as Stages 1–3; target 4–4.5 min for the bot (longer boss than Stage 3).

| Zone | Place (plate) | Light | Waves (new: `cultist`) | Set piece |
|---|---|---|---|---|
| 0 (0–1280) | **Gate of Aridhol**: broken arch, dead trees (`bg4-mid` L) | Moonrise, faint green | `[cutthroat R 0, cultist R 1.0]`, `[cultist L 0, cutthroat T 0.8, hound R 1.6]` | Tutorial fog: 2 **static vents** that never chase. First moonshaft safe pool. Hint `THE FOG FEARS LIGHT`. |
| 1 (1240–2520) | **Plaza of the dry fountain** (`bg4-mid` R) | Moon high, fog rising | `[cultist R 0, cultist L 0.6]`, `[cutthroat T 0, cultist R 0.5, cutthroat L 1.4]` | Tendrils now **chase** (§2). **Ribbon** is snagged on a fog-wrapped statue: burn the tendril (any light weave or 3 hits) to free it. |
| 2 (2560–3840) | **Tower Row** (`bg4-mid2` L) | Moon behind towers, shafts through gaps | `[cultist T 0, cutthroat R 0.4]`, `[hound R 0, cultist L 0.6, cultist R 1.2, cutthroat T 2.0]` | **Collapsing towers** (§3) + **Mashadar wall** creeping in from the left edge. On clear: the **Twinkle Toes glimpse** (the Fade with the small bundle crossing a far bridge, `fx-fade-far` reused unchanged at parallax 0.3, ribbon catching moonlight). |
| 3 (3920–5200) | **Mordeth's court** (`bg4-mid2` R) | Full moon + fog glow | Boss | Draghkar drops from the far skyline into the arena. |

**Story in** (3 panels, 6 lines; after the Stage 3 clear card's *"Another ribbon. I'm coming, Twinkle Toes."*):
1. NARRATOR: *"The Fade fled Caemlyn by night. Its trail ran east, to a city no map still names."*
2. RILEY (panel: Riley at the gate, ribbon in fist): *"Aridhol. Moiraine said never go in."* / *"He went in."*
3. MORDETH-whisper (unseen, panel: fog curling): *"Stay... and be welcome... forever."* / NARRATOR: *"Riley walked in."*

**Story out** (clear card + 2 lines, hooks Stage 5 The Ways): RILEY *"The trail goes underground. A Waygate."*;
LOIAL (call-in voice) *"Riley, the Ways are dark. Nobody goes into the Ways."* Riley: *"Then show me how."*

## 2. Mashadar fog

**Pieces.** (a) **Vents**: data in `assets/bg4/lights.json` (`vents: [x, y]`), cracks that glow green when about to emit.
(b) **Tendrils**: hazard objects (not enemies; no tokens, no HP bar) that grow from a vent toward Riley. (c) **Fog wall**
(zone 2 and boss P3): a vertical bank entering from a zone edge.

**Tendril behaviour.**
- **Tell:** vent glows and gurgles (`fogGurgle` SFX) for **0.8 s** before anything leaves it. Tendril tip is bright.
- **Chase:** the tip steers toward Riley at **90 px/s** (clearly slower than Riley's walk), max reach 520 px from its vent.
  Lifetime **6 s**, then it retracts over 1 s whatever happens.
- **Contact:** while the tip overlaps Riley: 3 dmg per 0.5 s and 30% slow. **2.0 s of continuous contact = grip**:
  10 dmg knockdown, then **2.0 s fog immunity** after getup (no stun-lock).
- **Enemies too:** tendrils hurt cultists and cutthroats the same way. Knocking a cultist into a tendril = 20 dmg.
- **Light pushes back:** reuse `lightNear(s, x, r)` from `src/myrddraal.js` (fireball, lightning, fire shield, Balefire)
  with r = 260: tendril recoils to its vent and the vent goes **dormant 5 s**. **Melee** on the tip makes it recoil for
  1.5 s, so an empty power bar is never a dead end.
- **Moonshafts:** 1–2 static light pools per fog zone (`lights.json` `moonshafts`). Tendrils cannot enter them. They are
  the readable "safe floor".

**Anti-softlock rules (each is a test).** Max live tendrils: 1 in zone 0, 2 elsewhere. Never spawn within 300 px of
Riley. A moonshaft or tendril-free strip ≥ 200 px always exists within 400 px of Riley. Tendrils **freeze** while Riley is
`grabbed`, `down`, `getup` or in a story/pause. No tendril and no tower may block the zone exit after the last wave.
Fog wall never closes below the minimum width (§5). Restart/continue/stage switch disposes every vent, tendril, wall and
emitter (mirrors `stage3-kit-cleanup`).

**Perf/light budget.** Fog is **sprites, not a shader** in this pass: 2 tileable `fx-fog-bank` layers (far + floor) with
slow UV scroll, tendrils as a chain of ≤ 8 `fx-tendril` segment sprites + tip. Fog adds **zero lights** (glow is baked
into unlit sprites). Governor level ≥ 2: one fog layer, 5 segments. Worst-case lights (boss P3): hero 1, moon 1,
moonshafts 2, cultist cast 1, fireball 1, pickup 1, ribbon 1, power 1 = **9 ≤ 10** (`maxLights`, `src/main.js:20`).

## 3. Collapsing towers (zone 2)

Three tower props stand on the mid plane. Two fall types, chosen by script, max **1 active**, interval 5–7 s:
- **Topple across** (falls toward camera): footprint is an x-range ≤ 360 px wide across all lanes. Tell **1.6 s**: dust
  cascades from the tower top, `towerCrack` SFX, a growing shadow footprint on the floor. Safe lane = either side.
- **Topple along** (falls down the street): covers one `VOLLEY_BANDS` third for the full screen width. Same 1.6 s tell
  with the band marked. Safe lanes = the other two bands. Reuses the Stage 3 tile-band logic (`src/stage3-hazards.js`).
- **Hit:** Riley 16 dmg + knockdown, enemies 30 (lure them under). Breaks any grab (Stage 3 rule: hazards break holds).
- **Rubble** stays as a **breakable** prop (crate rules, 3 hits) and may hide a drop; it never occupies more than one
  band and is cleared at wave end so the exit is never blocked.
- **Script:** zone entry plays one harmless "show" collapse in the far plane (teaches the tell), then 2 live falls in
  wave 0 and 2–3 in wave 1. The tell never starts while Riley is `down`/`getup` with < 1.0 s left; reachability is
  tested from the worst state (mid-combo, `hurt`, `getup` end) at Riley's real walk speed.

## 4. Cultist caster (`cultist`, 30 HP, ranged/controller)

Human Darkfriend in a ragged hooded robe with a green-glowing charm. Keeps range like `TYPES.archer` (pref 380).
- **Fog bolt:** 0.6 s hand glow + chant sting, then a slow orb (260 px/s, 10 dmg, `medium`) along its lane. Fireball or
  any Riley attack frame pops it. Max 2 bolts in flight stage-wide.
- **Call the fog:** 1.0 s kneel chant, a green ring grows under Riley's position; at the end a vent opens there
  (counts toward the tendril cap). **Any hit during the chant cancels it and dazes him 0.8 s** — the core counterplay.
  Only one summon chant at a time (`casterBusy`, same pattern as `archerBusy` in `src/stage2.js`).
- **Ward shove:** if Riley is within 150 px, staff shove (5 dmg, knockback 260) then backstep; 3 s cooldown.
- **Low poise:** any heavy hit knocks him down; knocking him into fog = 20 dmg. KO via the Whitecloak KO/flee path.
- **Combos with reused enemies:** cutthroat grab + cultist bolt is the nasty one. Stage 3 rule holds: while Riley is
  grabbed, only the grabber can hurt him and tendrils freeze; bolts pass through. Hounds flank into tendrils (and take
  damage), which rewards positioning. Token cap unchanged; `attackTokens()` counts `chant` and `bolt` windup.

## 5. Boss: the Draghkar (`draghkar`, 560 HP, 3 phases; target ~2.5–3 min)

Pale, gaunt, bat-winged; beautiful-wrong face; croons. Defeated, it **shrieks and dissolves to ash into the fog**.
Damage reduction ×0.6 while airborne/perched/intro/crooning (Byar/Fade convention).

**P1 Swoops (100–66%, ~50 s).** Perches on the far skyline (drawn on the far plane, untargetable).
- **Swoop:** screech + its shadow sweeps the floor + an edge arrow marks the lane band for **0.9 s**, then it dives
  across that band at 1100 px/s (14 dmg, knockdown). 2–3 swoops, then it **lands** for 4–5 s.
- **Grounded kit:** claw 2-string (10, 12 dmg; second knocks down), wing buffet (push 300, 4 dmg, sets up a swoop).
- **Punish:** landing recovery 1.2 s at ×1.3. A swoop **hit by fireball/lightning or a facing active attack frame** is
  knocked out of the air: `downed` 2 s at ×1.5 (`COUNTER!`).

**P2 The kiss (66–33%, ~60 s).** Sa'angreal drops on entry. Adds: 2 cultists, once.
- **Croon:** 2.5 s of visible gold-green sound rings. Riley **drifts** toward the Draghkar at 60 px/s (input still
  works; walking away beats it). Light weave within 400 px cancels the croon.
- **Kiss** (fair grab): tell **0.6 s** — wings flare wide, eyes glint, a unique rising chord. Lunge 700 px/s, 0.4 s max.
  Catches only a grounded Riley in `GRAB_OK` (`src/darkfriends.js`) or attacking away; facing it with an active attack
  frame = counter-hit instead. **Fire shield active = immune** (kiss fizzles, it recoils 1.2 s).
- **Hold:** frontal; Riley plays `riley4_kissed`. 3 HP per 0.5 s for up to **3.0 s**, screen desaturates toward grey.
  **Mash 8** (attack/jump/special/new direction; held input counts once), decay 1 per 0.5 s. **Escape:** headbutt-shove
  (`riley4_break`), Draghkar `reels` 1.6 s at ×1.5. **Timeout:** 18 dmg + knockdown, and no kiss for 10 s.
- **Escape rules mirror Stage 3 lessons:** exclusive ownership via `riley.grabbedBy` and `grabBusy` (no kiss while a
  cutthroat holds and vice versa); Riley's own held enemy is released first (`f996546`); synchronous release on death,
  down, respawn, continue, destruction (`f64ba1c`); pause freezes hold+mash; identical results at 30/60/120 Hz; Loial
  call breaks it; hazards break it; only the kisser holds an attack token. Kiss cooldown 7–9 s; never two kisses without
  a swoop or croon between.

**P3 The fog closes (33–0%, ~50 s).** Mashadar walls enter from both edges at 40 px/s.
- **Minimum safe width 640 px**, hard floor in every state (half the 1280 view; the arena never becomes a box).
- Wall contact: tendril DoT + push inward 200 px/s, **no knockdown** (no fog + swoop loop). Each light weave that lands
  near a wall pushes it back 120 px (never past its start), re-advance after 3 s. Moonshaft in the centre stays clear.
- **Fog swoops:** a green bulge in a wall (0.9 s tell, band marked) then it bursts out low across the strip.
- Kiss continues at 10–12 s cooldown. **Below 15%:** swoop rate +30%, croon gone; walls do **not** tighten further.
- **Defeat:** shriek, walls collapse inward over it, ash, fog recedes to reveal the Waygate leaf. Light count returns to
  baseline; every wall, tendril and cultist is cleaned up.

## 6. Reuse vs new

| Piece | Builds on (real file/symbol) | New |
|---|---|---|
| Registry + flag | `src/stages.js` `STAGES`, `stageEnabled`, `maxStage`, `STAGE_CHARS`, `STAGE_TEXTURES` | `s4=1` (implies s3), `STAGE4`, `STAGE_CHARS[4]` |
| Kit | `Stage3Kit` → `Stage3Hazards` → `Stage2Kit`; Kit interface doc in `src/stages.js` | `src/stage4.js` `Stage4Kit`, `queueStage4`, `STORY4_*`, `STAGE4_VOICES` |
| Moonlight | `addMoon`/`placeMoon`/`placeFires` in `src/stage1.js`; `timeOfDay` in `src/stage3.js` | moon-height keys + moonshaft lights in `assets/bg4/lights.json` |
| Fog + towers | `TILE_BANDS`/`VOLLEY_BANDS`, `clearHazards`/`threats()` pattern, `lightNear` | `src/stage4-hazards.js` (vents, tendrils, wall, towers, rubble) |
| Cultist | `Whitecloak` KO/flee, archer range AI, `archerBusy` | `src/cultists.js` `Cultist`, `casterBusy` |
| Grab/kiss | `Cutthroat` hold, `GRAB_OK`, `RILEY_ATTACKS`, `grabBusy`, Riley `grabbed`/`escape`, HUD mash ring | Draghkar hold driver; `riley4` atlas (`kissed`, `break`) |
| Boss shape | `Myrddraal` (phases, armour list, counter stagger, `clearAbilities`, seeded RNG) — **not edited** (15,395/16,384) | `src/draghkar.js` `Draghkar` |
| HUD/bot/audio | `src/hud.js` fear arc + hints, `src/bot.js`, `src/audio.js` `EXTRA_VOICE`, `src/music.js` `STAGE_MUSIC` | croon arc, kiss hint, bot fog/tower/kiss branches |

**Caps (check D):** `stage4.js` < 12288, `stage4-hazards.js` ≤ 12288, `cultists.js` ≤ 9216, `draghkar.js` ≤ 16384,
`bot.js` stays ≤ 12288 (it is at 12,249 — **T12 needs a bot split or a cap decision; see Q4**).

## 7. Art and audio

**On-model rule (every Riley image):** 16, very muscular, short dark hair, thin blue-framed glasses, sleeveless black
Asha'man coat; never a kid. Attach the Riley master + `riley.jpg`. House style from `spike-art/HOUSE_STYLE.txt`; formats
from Stage 3 §4 (sheets 1536×1024, 8 cells; masters 1024×1536; plates 2172×724; normal maps via `nmap.py`).

| Group | Items (ChatGPT images; Gemini backup) |
|---|---|
| Backdrops | `bg4-far` (moonlit ruined skyline, green haze; opaque), `bg4-mid` (gate + plaza, transparent sky) + `_n`, `bg4-mid2` (tower row + Mordeth's court) + `_n`, `bg4-floor` / `floor2` / `floor3` (cracked flagstones, roots, fog stains; tileable) + `_n` |
| Props/FX | `prop-tower` (3 variants, 6-frame fall each), `prop-rubble` (2 break states), `fx-vent` (4), `fx-tendril` (segment 2 + tip 4), `fx-fog-bank` (tileable 2048×256), `fx-fogwall` (4, vertical), `fx-moonshaft` (1), `fx-fogbolt` (4), `fx-ash` (6, shared Shadowspawn dissolve) |
| Cultist | master + 5 sheets (40 fr): walk/hurt, bolt/knockdown, chant/dazed/getup, shove/flee, idle/stalk |
| Draghkar | master + 8 sheets (64 fr): perch/intro, swoop/dive, land/claw, buffet/hurt, croon/kiss-lunge, kiss-hold/reels, downed/getup, shriek/defeated; portrait 256² |
| Riley | `riley-s4a`: `kissed` 4 + `break` 4 (faces RIGHT), new atlas `riley4` |
| Story | `story4_panel_1..3` (1280×720): trail at night, Riley at the gate with ribbon, fog curling through the arch |

About 112 new character frames, ~50 generations. **Audio** (ElevenLabs; Stage 3 used Kokoro, so Q3 decides whether
Riley's voice is re-cast for consistency): Draghkar ×5 (*"Come... rest..."*, *"Such a bright soul. Give it to me."*,
*"The fog is my garden."*, kiss croon (wordless hum, 3 s loop), defeat shriek); Cultist ×3 (*"The fog answers us!"*,
*"Mashadar, feed!"*, *"He burns... it burns!"*); Riley ×6 (*"Don't touch the fog."*, *"Off me!"* variant
*"Not today!"*, *"That tower's coming down!"*, *"There, on the bridge!"*, *"Light it up."*, victory *"Sing to the ash."*);
narrator/Mordeth/Loial story lines (§1). SFX (synth, existing style): `fogGurgle`, `towerCrack`, `screech`, `croonChord`.
Music: `music-stage4`, `music-boss4` via `tools/music/compose.py`.

## 8. Tasks (each one builder pass)

**AG** = Antigravity/Gemini Flash (clear specs). **GK** = Grok 4.7 Cursor agent (judgement-heavy). **P** = may start now on
`rwb-2-stage4-prep` while Stage 3 finishes (new files only).

| T | Owner | Task | Depends | Acceptance (new test file) |
|---|---|---|---|---|
| T1 | GK | Registry: `STAGE4`, `s4` flag (implies s3), `STAGE_CHARS[4]`, `releaseStage` for 4, `STAGE_MUSIC[4]` placeholder | Stage 3 merged | `stage4-registry`: `stage=4`→1 without flag, →4 with `s4=1`; S1–S3 snapshots deep-equal |
| T2 | AG **P** | `tools/stage4/art-manifest.json`, `make_placeholders.py`, `docs/stage4/prompts/*.json` | — | `stage4-placeholders`: sizes, frames, deterministic bytes |
| T3 | GK | `Stage4Kit` backdrop, floors, moon keys, moonshafts | T1, T2 | `stage4-kit`: moonshaft lights capped, `fireCap` reset, governor thins fog |
| T4 | GK **P** | `src/stage4-hazards.js` pure fog core: vents, tendril steering, contact/grip/immunity, light recoil, caps | T2 | `stage4-fog`: all §2 rules incl. 300 px spawn, freeze states, 30/60/120 Hz |
| T5 | AG | Towers + rubble + zone-2 fog wall | T3, T4 | `stage4-towers`: 1.6 s tell, safe lane reachable from worst state, exit never blocked |
| T6 | AG **P** | `src/cultists.js` `Cultist` (bolt, chant, shove, `casterBusy`) | T2 | `stage4-cultist`: chant interrupt dazes, ≤ 2 bolts, ≤ 1 chant |
| T7 | GK | `src/draghkar.js` P1 swoops + landing + counters | T1, T2 | `stage4-draghkar`: phases, swoop tells ≥ 0.9 s, knock-down-from-air |
| T8 | GK | Draghkar P2 croon + kiss hold; `riley4` states in `src/riley.js` | T7 | `stage4-kiss-lifecycle`: every §5 escape rule, ownership, pause, Hz parity |
| T9 | GK | Draghkar P3 fog walls, min width, defeat cleanup | T5, T8 | `stage4-arena`: width ≥ 640 always, no knockdown loop, light count baseline |
| T10 | AG **P** | Audio: TTS/ElevenLabs lines, manifest, SFX, music loops | — | `stage4-audio`: files > 2 KB, STT ≥ 0.8, loop points |
| T11 | AG | HUD (boss bar, croon arc, kiss hint), title select, story beat + flow | T1, T8, T10 | `stage4-flow`, new block in `hud-input` |
| T12 | GK | Bot branches + 9-seed campaign | T5, T6, T9, T11 | `stage4-campaign`: 9/9 clears, every mechanic ≥ 1, bounded hazards |
| T13 | AG | Asset/provenance tests, frame hashes | T12 | `stage4-assets` (Stage 3 T13 checks) |
| T14 | AG | Real-art swap-in after Jason approves masters | T13 | placeholders → real one-for-one |
| T15 | GK | Hardening pass (§9), perf, memory ≤ 110 MB | T12 | per-fix regression files, `docs/stage4/HARDENING.md` |
| T16 | AG | README + handoff; **T17** open campaign only on Jason's OK | T15 | Stage 3 §T16/T17 shape |

Lanes after T1: **A** T3→T5→T9, **B** T6, **C** T7→T8, **D** T10→T11; join at T12.

## 9. Hardening and risks

**Headless sims.** 9 seeds × campaign bot; invariants per frame: finite state, lanes 572–690, token cap, tendrils ≤ 2,
towers ≤ 1, bolts ≤ 2, walls never < 640 px apart, one holder at most. **Softlock sweeps:** fuzz 200 random inputs
per seed and assert progress within 90 s per wave; "idle Riley" run asserts death or progress, never a stuck state;
"no-power Riley" (powers disabled) must still clear (melee recoil path). **Lifecycle:** restart/continue/stage switch
mid-tendril, mid-collapse, mid-kiss, mid-croon, mid-P3 leaves no objects, listeners, lights or emitters. **Perf:** Stage 3
T15 protocol plus a P3 worst case (2 walls, 2 tendrils, cultists, fireball); report avg fps and frames > 33 ms first;
iPad is Jason's check. Stage 4 is a smoothness-guardrail stage (LEVELS.md §4).

**Top risks.** (1) Fog visually reads as decoration, not danger → bright tips, vent glow, contact SFX, first-contact
hint. (2) Kiss + fog + swoop stack feels cheap → token rule, tendril freeze while held, no-knockdown walls. (3) `bot.js`
cap is spent → decide Q4 before T12. (4) Fog overdraw on iPad → sprite fog only, governor fallback, shader is a later
upgrade. (5) Draghkar art (winged, large silhouette) drifts off house style → master approved before any sheet.

## 10. Open questions for Jason

| # | Question | Default |
|---|---|---|
| Q1 | Kiss hold: mash 8 in 3.0 s with decay — right teeth for Riley? | Yes; tune once from bot + Riley playtest |
| Q2 | Where are the 1.2 painted Stage 4/5 panoramas (PLAN.md line 22)? | Generate `bg4-far` fresh |
| Q3 | ElevenLabs for all Stage 4 voices, or Kokoro Riley kept for continuity? | Kokoro Riley, ElevenLabs for Draghkar/cultists |
| Q4 | `bot.js` is at 12,249/12,288: split into `bot-stage4.js` or raise the cap? | Split, no cap change |
| Q5 | Score/lives carry 3 → 4? | Same answer as Stage 3 Q3 |
