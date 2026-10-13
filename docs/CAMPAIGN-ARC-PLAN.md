# Campaign arc plan: Stage 7 to the Dumai's Wells finale

*Planner: Claude Opus, Oct 13 2026. Branch `rwb-opus-plan`. This is a docs-only plan. It makes no game code
changes. Names marked **†** are new.*

**Input from Jason's nephew, folded in here:**
1. **Dumai's Wells is the finale and the stopping point.** Tarmon Gai'don is a possible later game.
2. **At Dumai's Wells, Rand (an ally) has been kidnapped.** The player fights to rescue him.
3. **A big Shadow villain, "TDOG", is there too** and is the final boss.
4. **Moiraine and Lan are the call-ins while Rand is captive.**

This doc covers Stages 8 and 9 at the same depth `docs/STAGE7-PLAN.md` uses for Stage 7, plus one build order
across every workstream:
- Stages 7, 8 and 9;
- meta-progression and Arena mode (specified in `docs/ENGINE-EXTRACTION-PLAN.md` §12–13);
- engine extraction.

Every rule in `docs/STAGE7-PLAN.md` §0 applies to Stages 8 and 9 unchanged:
- protected files;
- stage source sets that cost the pre-fight gate 0 bytes;
- voice prefixes `st8_`/`riley_st8_` and `st9_`/`riley_st9_`;
- code-drawn fallbacks for every painted key;
- determinism;
- campaign bots must clear 9/9 seeds, and the 250 ms lag bot at least 8/9.

---

## 1. The arc

| Stage | Place | Boss | Call-in | Status |
|---|---|---|---|---|
| 1 | Emond's Field, Winternight | Trolloc Chieftain | Loial | live |
| 2 | Baerlon | Jaret Byar | Loial | live |
| 3 | Caemlyn | Myrddraal | Loial | live |
| 4 | Shadar Logoth | Draghkar | Loial | live |
| 5 | The Blight / Eye of the World | Aginor and Balthamel | Loial | live |
| 6 | The Stone of Tear | Be'lal | **Rand** | live |
| 7 | Rhuidean and the Aiel Waste | Asmodean (bound, not killed) | **Moiraine / Lan** | planned (`docs/STAGE7-PLAN.md`) |
| 8† | **Cairhien**: the Shaido siege | **Couladin** (yields) | **Moiraine / Lan** | this doc §2 |
| 9† | **Dumai's Wells**: the rescue (**finale**) | **Galina Casban** (Z2 mid-boss), then **TDOG** (final) | **Moiraine / Lan**, then **Rand** for the last phase | this doc §3 |

**The sister thread** (Twinkle Toes, carried off by the Fade in Stage 1, with a ribbon found each stage):
1. Stage 7: Asmodean says the Fades sold her to a Tower embassy riding for Cairhien.
2. Stage 8: Riley breaks the siege, but the embassy has already shielded **Rand** and left with **both** prisoners.
3. Stage 9: Riley frees Rand at the wells, then beats TDOG. **Twinkle Toes is rescued in the finale** (decision
   A2), which closes the campaign's opening promise.

### 1.1 Canon used, and where the game departs from it

Checked against The Fires of Heaven and Lord of Chaos chapter recaps (Dragonmount):

**Canon used.**
- Couladin's Shaido besiege Cairhien, and Rand's Aiel break the siege (*The Fires of Heaven*). In the book Mat
  kills Couladin. **Game:** Couladin yields, the same rule as every human enemy.
- In *Lord of Chaos*, Rand is taken from Cairhien by the Tower embassy, led by Galina Casban (secretly Black Ajah)
  and Coiren. He is shielded, beaten and carried in a chest. At **Dumai's Wells** he is rescued by Perrin, the Aiel
  and the Asha'man under **Mazrim Taim**, while the Shaido under Sevanna also attack.

**Departures, called out on purpose.**
- **Moiraine.** In canon she disappears through the redstone doorway at the end of *The Fires of Heaven*, before
  Dumai's Wells, and Lan leaves. Riley's story keeps both of them through the finale, because that's what the
  nephew asked for. Their captions never claim book events they weren't present for.
- **TDOG.** This plan reads "TDOG" as **Mazrim Taim**: "T" for Taim, and he is the big Shadow figure physically
  present at Dumai's Wells. In canon he arrives as Rand's rescuer and is only later shown to be a Darkfriend. The
  game puts him in the open early: he "rescues" Rand only to take him for the Shadow. **Taim escapes through a
  gateway** and is not killed, which leaves him for a possible Tarmon Gai'don game.
  - If the nephew meant someone else, only the boss sheet, voice and lines change. The mechanics in §3.4 are
    generic "channeler" mechanics.
  - In game, Riley calls him **"TDOG"** and captions name him **MAZRIM TAIM** (decision A1).
- **Twinkle Toes at Dumai's Wells.** She isn't in canon. It's the game's own thread.

---

## 2. Stage 8: Cairhien, the Shaido siege

### 2.1 Story
- **In:** Moiraine and Lan bring Riley to the Foregate at dawn. The Foregate is burning: Couladin's Shaido have
  the city under siege.
- **Out:** Couladin yields. Riley reaches the embassy's lodgings and finds them empty, with a chest-shaped drag
  mark leading out the gate. Moiraine: *"They have shielded him. Galina. They ride for Tar Valon by way of Dumai's
  Wells."* Lan: *"Then we ride faster."*

### 2.2 Zones

Same 4-zone, 5200 px geometry as Stages 6 and 7, so skip, camera and stream code are reused.

| Zone | `at` / `l`–`r` | Place | Waves | Set piece |
|---|---|---|---|---|
| Z0 | 260 / 0–1280 | The Foregate burning | `[[grunt,L,0],[dancer,R,0.8]]`, `[[torch†,R,0],[grunt,L,0.6],[dancer,R,1.4]]` | **Torch-runners** light floor fire patches |
| Z1 | 1500 / 1240–2520 | Under the walls | `[[veiled,T,0],[dancer,L,0.5]]`, `[[spear,R,0],[torch†,L,0.6],[veiled,T,1.2]]` | **Fire-arrow volleys** over the wall (Stage 2 volley-band telegraph, 3 bands, one always free) |
| Z2 | 2800 / 2560–3840 | The Gate of the Dragon | `[[fadelt,R,0],[dancer,L,0.4]]`, `[[grunt,L,0],[torch†,R,0.5],[spear,R,1.0],[dancer,L,1.6]]` | **Battering ram**: a slow prop that crosses the zone and must be jumped (one 0.9 s tell) |
| Z3 | 4140 / 3920–5200 | Couladin's camp | boss | |

**New enemy: `torch`†** (Shaido torch-runner).
- HP 45, speed 190.
- Runs to a spot on a random band, then drops a fire patch. Reuse the Stage 1 `patches` system in
  `src/stage1.js`. The patch has r 60, lasts 5 s and does 4 damage per 0.5 s. At most 3 patches at once.
- Yields like the other Shaido.

### 2.3 Boss: Couladin, the false Car'a'carn

- HP 560, speed 110, reach 190 (spear).
- Phase gates `[0.66, 0.33]`. Call-ins can never skip a gate.

| Phase | HP | What happens |
|---|---|---|
| P1: spear and buckler | 100–66% | Spear thrust (tell 0.55 s, dmg 9) and **buckler bait**: if Riley attacks into the raised buckler, he parries, knocks Riley down and loses his own 0.8 s recovery. Read the buckler and throw instead. Everything has a `counterUsed` latch |
| P2: "Shaido, to me!" | 66–33% | Two add waves, `[dancer, veiled]` then `[torch, dancer]`. A burning-arrow volley every 6 s (bands, one free). Couladin only pokes |
| P3: the dragons on his arms | 33–0% | Faster combos (tells 0.45 s) plus a **leap slam** (shadow ring tell 0.8 s, dmg 14, jumpable). He rages for 6 s after each 25% of the remaining HP |

**Defeat:** he kneels and yields. Moiraine's line plays, the clear card shows, then the outro.

### 2.4 Stage 8 budgets

| Item | Estimate |
|---|---|
| Atlas fighters | riley, grunt, spear: **67.20 MiB** (same as Stage 7) |
| Painted | reuse `s7dancer` 1.25, `s7veiled` 1.15, `s6fade` 1.10, `s7moir`/`s7lan` 1.77 (on call); new `s8torch`† ≤1.0, `s8coul`† ≤2.1 (Z3 deferred), props `s8fire`/`s8ram`/`s8arrow` ≤1.2; cap **12 MiB** |
| Backgrounds | `bg8far`, `bg8mid..mid4`, `bg8floor..floor3`, streamed: ≈8.4 MiB resident |
| **Boss peak** | **≈ 90 MiB** (gate **≤ 105 MiB**) |
| Byte lines | `stage8.source` 192 KB; `stage8.voices` `/^(st8_\|riley_st8_)/` 24 × 200 KB; `stage8.music` 2 × 1.2 MB; `stage8.art` 6 MB; `cutscenes.stage8` 2,000,000 (the kidnapping clip) |

### 2.5 Audio and clips
- **New voice designs:** Couladin (*"arrogant young warrior, harsh, contemptuous"*) and Galina, who appears in the
  Stage 8 outro clip and in Stage 9 (*"cold, precise, aristocratic woman; cruelty under calm"*).
- Moiraine (`bf_emma`), Lan (Stage 7 design), Riley (DYLO) and the narrator (Jason's clone) are reused.
- Pronunciation hints: Cairhien = Kyree-EN, Couladin = KOO-lah-din, Galina = gah-LEE-nah,
  Dumai = doo-MY.
- **Clip `stage8-out`†.** Galina's embassy wagons roll out of the city gate at dusk. The camera is behind Riley,
  who arrives too late. One closed chest on a wagon is lit for a beat. **No shot of Rand's face is needed**; the
  chest tells the story. 8–10 s, ≤160 KB/s.

### 2.6 Build tasks (Grok 4.7, sequential, after Stage 7 T15)

These use the same brief format as `docs/STAGE7-PLAN.md` §8.1. The integration branch is `rwb-w2-stage8`†.

| # | Task | Acceptance |
|---|---|---|
| S8-T1 | Skeleton: `STAGE8` def, `Stage8Kit`, `queueStage8`, release, `STREAMS[8]`, `STAGE8_SRC` and all §2.4 audit lines, `stageEnabled(8)` via `s8` (off), `STAGE7.next` → 8 when enabled, `COMPACT_STAGES` += 8, `bot-stage4` dispatch, `callInFor(8)` = Moiraine/Lan | Walk-through to a dummy boss; campaign 9/9; Stages 1–7 golden diff empty; pre-fight +0 bytes from the new set |
| S8-T2 | `torch` enemy plus fire patches (reusing Stage 1 `patches`), cap 3 | Unit: at most 3 patches; patches clear on zone clear; Shaido yield, never ash; 9/9 |
| S8-T3 | Fire-arrow volleys (Z1) and battering ram (Z2) | Every volley leaves one band free (table test); ram tell ≥ 0.9 s; ≤ 10 lights; 9/9 |
| S8-T4 | Couladin P1–P3 with buckler bait, adds, leap slam | Gates fuzz (1,000 random hits) never skips; every attack has a tell ≥ 0.45 s; freeze-frame check ≥ 9/10 |
| S8-T5 | Bot `stage8Bot` | 9/9, lag bot ≥ 8/9; call-on boss time 70–102% of call-off |
| S8-T6 | Audio: 24 lines and 2 music loops | Whisper check, loudness, ≤ 200 KB/line, `check_loops.py` |
| S8-T7 | Painted art (`tools/stage8/process_art.py` JOBS) | Caps per key; `texture-dump RWB_STAGES=8` peak ≤ 105 MiB, painted ≤ 12 MiB |
| S8-T8 | `stage8-out` clip, frame review (Riley only from behind) | ≤ 2,000,000 line; review log; Jason signs off |
| S8-T9 | Hardening plus enable (`s8` default on) | Browser pass, 60 fps p95, Jason's playtest |

---

## 3. Stage 9: Dumai's Wells (finale)

### 3.1 Story
- **In:** a narrator panel shows grassland and three stone wells in a copse. The Aes Sedai camp has formed a
  wagon circle, and the Shaido are closing in from the hills. Moiraine: *"Galina will not give him up. Nor will the
  Shaido let her keep him."* Lan: *"Then we take him from both."*
- **Middle (Z2 end):** Galina falls. Riley smashes the chest open and Rand's shield breaks. Rand says, still
  weak: *"Riley. …Thank you. She's here too — your sister. In the last wagon."* Then **gateways open on the
  ridge** and Mazrim Taim steps through.
- **Out:** Taim retreats through a gateway: *"Another day, boy. The Last Battle is coming for all of us."* Riley
  opens the last wagon: **Twinkle Toes**, seen from behind Riley with her face lit (she may be shown).
  - Final narrator line: *"The Wheel turns. And one day it will turn toward Tarmon Gai'don…"*
  - Then the credits. The clear card reads **CAMPAIGN COMPLETE**, which feeds the meta scorecard.

### 3.2 Zones

| Zone | `at` / `l`–`r` | Place | Waves | Set piece |
|---|---|---|---|---|
| Z0 | 260 / 0–1280 | The grass hills | `[[dancer,L,0],[veiled,R,0.6]]`, `[[grunt,R,0],[dancer,L,0.5],[torch,R,1.2]]` | Shaido ambush out of the grass (the Stage 7 silhouette tell is reused, with no storm) |
| Z1 | 1500 / 1240–2520 | The wagon circle | `[[sister†,R,0],[dancer,L,0.6]]`, `[[sister†,T,0],[veiled,R,0.4],[spear,L,1.0]]` | `T` = a wagon roof. **Weave shield**: sisters block fireball and balefire (§3.3) |
| Z2 | 2800 / 2560–3840 | The wells | `[[grayman(s6gray),R,0],[sister†,L,0.6]]`, then **Galina mid-boss** (kit-driven, like the Stage 6 elite pattern) | Galina (§3.4). Rand's chest is a prop at the right edge |
| Z3 | 4140 / 3920–5200 | The ridge above the wells | boss | **TDOG** (§3.5) |

### 3.3 New regular enemy: `sister`† (Black Ajah sister, painted)

- HP 70, speed 90. She keeps 300–500 px from Riley.
- **Weave shield.** A visible blue bubble absorbs fireballs and balefire. Melee **pops** it with 3 hits, then she is
  open for 3 s before re-weaving (re-weave tell 1.0 s).
- **Air bind.** Tell 0.8 s, a pale ribbon along her band. If it lands, Riley is held for 1.2 s: break free by
  wiggling (reuse `GRABBED` and `releaseHold('break')`), or her ally gets one free hit.
  - Only one sister may bind at a time. It counts as an attack token.
- Human, so she yields.

### 3.4 Mid-boss: Galina Casban (Z2)

- HP 360, gates `[0.5]`.
- She is a kit-driven elite with her own HP bar in the existing boss HUD slot. Using that slot is allowed because
  it's a HUD patch from the kit, as Stage 6 does, never an edit to `src/hud.js`.
- **P1.**
  - **Severs Riley's weaves** for 8 s windows: fireball and balefire are disabled and greyed out in the HUD, so it's
    melee only. Each window has a 1.2 s tell and runs on a 14 s cycle.
  - Air-bind (as the sister, but 1.6 s).
  - **The binds are counterable**: pressing jump during the tell dodges them.
- **P2 (below 50%).** Two sisters join, and she spins air whips along the bands (one band free).
- **Defeat:** she is shielded by Moiraine and Lan holds her, as in Stage 7. Then the Rand-freed beat plays: the
  `stage9-rand`† clip, or a caption-only version if the clip is missing.

### 3.5 Final boss: TDOG (Mazrim Taim)

- HP 720, speed 100, gates `[0.66, 0.33]`. Score 12,000.

| Phase | HP | What happens |
|---|---|---|
| P1: Lightning | 100–66% | **Sky bolts** strike 3 marked spots at a time (0.8 s ground tell, dmg 12). **Fireball volleys** run along the bands (one band free). Up close, a palm blast (tell 0.5 s) |
| P2: Gateways | 66–33% | He opens **gateway slits** that slice along a band. These are line hazards like Be'lal's lines in `src/stage6-arena.js`: tell 1.0 s, dmg 14. Adds `[grunt, spear]` step through edge gateways, twice. He blinks between two gateway points, with a 0.6 s shimmer tell |
| P3: "Rand breaks free" | 33–0% | **The call-in switches to Rand.** It reuses `src/rand-call.js` and `src/rand-call-cutscene.js` with clips R1–R3 unchanged, gets a fresh charge at phase start, and keeps the one-call-per-phase rule. Every 12 s, Taim channels a **saidin clash** |

**The saidin clash.**
- A beam struggle. The player must **hold** ATTACK (not mash) for a total of 2.0 s inside a 4.0 s window, with
  Rand's beam joining Riley's.
- **Success:** Taim is stunned for 2.0 s and takes 6% HP. **Failure:** 18 damage and a knockdown.
- Holding instead of mashing is better on touch and for accessibility. The 250 ms lag bot must pass it.

**Defeat:** Taim gateways out (he is not killed). Then the outro and credits.

**Call-in rules in Stage 9.**
- Moiraine/Lan `CALL7` rules (`docs/STAGE7-PLAN.md` §3) apply in Z0–Z2 and TDOG P1–P2.
- In P3 the provider becomes `rand`.
- Both keep `maxCalls` 3 per stage in total.
- `callInFor(9)` stays `'moilan'`. The kit switches provider on phase 3, so the switch is a single pure function
  with a unit test.

### 3.6 Stage 9 budgets

| Item | Estimate |
|---|---|
| Atlas fighters | riley, grunt, spear: **67.20 MiB** |
| Painted (Z3 peak) | `s7dancer` 1.25, `s7veiled` 1.15, `s9sister`† ≤1.2, `s7moir`/`s7lan` 1.77, `s9taim`† ≤2.2 (deferred to Z3), `s6rand` 0.68 (loaded at P3), props `s9bolt`/`s9gate`/`s9beam`/`s9chest` ≤1.5. **`s9galina`† ≤1.9 is released at Z2 clear, so it is never resident with Taim.** Cap **12 MiB** |
| Backgrounds | streamed ≈ 8.4 MiB |
| **Boss peak** | **≈ 91 MiB** (gate **≤ 105 MiB**) |
| Byte lines | `stage9.source` 192 KB; `stage9.voices` `/^(st9_\|riley_st9_)/` 24 × 200 KB; `stage9.music` 2 × 1.2 MB plus `music-credits9`† 1.2 MB; `stage9.art` 6 MB; `cutscenes.stage9` **5,000,000** (`stage9-rand`† ≈1.5 MB, `stage9-finale`† ≈1.6 MB, optional intro ≈1.5 MB) |

**Clips** (Riley only ever from behind; no actor names in prompts):
- `stage9-rand`†. Riley's gloved hands, from behind, wrench open a chest lid. Light breaks out as a shield
  shatters. Rand (red-gold hair, ragged) rises in the background. 8 s.
- `stage9-finale`†. Behind Riley at sunset by the wells: he opens a wagon door. A small girl's silhouette runs
  toward him, and the camera holds on his back as she hugs him. 10 s. **The face rule applies to Riley only. Show
  Twinkle Toes's face only with Jason's sign-off** (decision A3).

**Voices.** New designs for Taim/TDOG (*"commanding, sardonic, heavy baritone, menace held in check"*) and the
sister barks (2 lines, Kokoro stock). Galina's design comes from Stage 8, and Rand uses his existing design
`4KhtxLynQ7oUlA9AtWmc`.

### 3.7 Build tasks (Grok 4.7, sequential, after S8-T9)

The integration branch is `rwb-w2-stage9`†.

| # | Task | Acceptance |
|---|---|---|
| S9-T1 | Skeleton: `STAGE9` def/kit/queue/release/streams, `STAGE9_SRC` and audit lines, `s9` flag, `STAGE8.next` → 9, `STAGE9.next` → credits then title | Walk-through; 9/9; Stages 1–8 golden diff empty |
| S9-T2 | `sister` enemy: weave shield, pop and reopen, air bind through the grab system, 1 binder at a time | Fireball and balefire absorbed while the shield is up; bind always breakable; `releaseHold('break')` on call/death/stage switch; 9/9 |
| S9-T3 | Galina mid-boss in Z2: kit elite with HP bar, weave-sever windows (powers disabled and greyed), binds, P2 | The sever window never starts during a cutscene or strike; HUD greyed state matches; the gate at 50% can't be skipped |
| S9-T4 | Rand-freed beat: chest prop, `stage9-rand` hook (caption-only fallback), Galina sheet released, Taim sheet deferred-loaded | Galina and Taim never both resident (texture-key assertion); missing clip doesn't stall |
| S9-T5 | TDOG P1–P2: sky bolts, volleys, gateway slit lines, blinks, adds | Free-band invariant; every hazard has a tell ≥ 0.5 s; freeze-frame ≥ 9/10 |
| S9-T6 | TDOG P3: provider switch to Rand (pure function), fresh charge, saidin clash (hold 2.0 s in 4.0 s) | Unit: switch only at the P3 gate; lag bot passes the clash ≥ 8/9; Rand clips reused from `assets/cutscenes/rand/` (no new bytes) |
| S9-T7 | Finale: Taim escape, finale clip, Twinkle Toes reveal, credits roll (code-drawn text on a scroll, skippable), `CAMPAIGN COMPLETE` | Credits skippable by any `SKIP_ACTIONS` key; returns to title; the meta scorecard (`ENGINE-EXTRACTION-PLAN.md` §12) gets `campaignComplete: true` |
| S9-T8 | Bot `stage9Bot` | 9/9, lag bot ≥ 8/9, call fairness 70–102% (in both provider eras) |
| S9-T9 | Audio: 24 lines, 2 loops plus the credits track | As S8-T6 |
| S9-T10 | Painted art | Peak ≤ 105 MiB, painted ≤ 12 MiB |
| S9-T11 | Clips `stage9-rand`, `stage9-finale` (optional intro) | ≤ 5,000,000 line; frame review; Jason signs off (A3) |
| S9-T12 | Hardening plus enable; full campaign run, Stage 1 → 9 in one session | Browser pass with no texture growth across stage transitions (texture-dump after each clear stays within ±2 MiB of a fresh boot of that stage); 60 fps p95; Jason's and the nephew's playtest |

---

## 4. One build order for everything

All tasks are sequential (one Grok 4.7 agent at a time). Each line is one draft PR. The integration branches
merge into `rwb-w2` only when Jason says so.

| Step | Workstream | Tasks | Why here |
|---|---|---|---|
| 1 | Stage 7 | T1 → T15 (`docs/STAGE7-PLAN.md` §8) | T1 removes the hard-coded Stage 6 assumptions everything else needs |
| 2 | Engine guard rails | **E0** (`docs/ENGINE-EXTRACTION-PLAN.md` §9) | Golden logic snapshot; the audit counts `engine/**`; CI on `rwb-w2`. It may start earlier, beside Stage 7 (decision J4), because it shares no files with Stage 7 |
| 3 | Meta-progression | **M1 → M8** (`ENGINE-EXTRACTION-PLAN.md` §12) | Written denylist-clean in `engine/meta/` from day one; RWB is its first user |
| 4 | Arena mode | **A1 → A9** (`ENGINE-EXTRACTION-PLAN.md` §13) | Needs the meta wallet and save (M2–M3) and the Stage 7 registry fixes |
| 5 | Stage 8 | S8-T1 → T9 | |
| 6 | Stage 9 (finale) | S9-T1 → T12 | S9-T7 feeds the meta scorecard |
| 7 | Engine extraction | E1 → E8 | E4 (the scene split) must wait until no stage work is in flight |

**Parallel-safe exceptions.** Content-only tasks may run beside code tasks, because they touch only `assets/`
and tool configs:
- art (S8-T7, S9-T10);
- clips (S8-T8, S9-T11);
- audio (S8-T6, S9-T9);
- Stage 7's T12–T14.

---

## 5. Decisions for Jason (and the nephew)

| # | Question | Default |
|---|---|---|
| A1 | Is "TDOG" Mazrim Taim? Riley calls him TDOG, and captions say MAZRIM TAIM | **Yes**, pending the nephew's confirmation |
| A2 | Twinkle Toes is rescued at Dumai's Wells, so the sister thread closes in the finale | **Yes** |
| A3 | May Twinkle Toes's face be shown in the finale clip? | **No** (from behind or in silhouette) unless Jason says yes |
| A4 | Keep Moiraine and Lan through the finale even though canon removes Moiraine earlier | **Yes** (the nephew's request) |
| A5 | The Black Tower stage (`plan/LEVELS.md` row 10) is parked for a possible later game | **Yes** |
| A6 | Taim escapes rather than dies | **Yes** (canon-safe, and it sets up a sequel) |
