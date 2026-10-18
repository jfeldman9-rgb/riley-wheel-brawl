# Stage 8 plan: Dumai's Wells, the Asha'man, and Lanfear (FINAL LEVEL)

*Planner: Muse Code (independent lead-planner pass), 2026-10-18. Snapshot of branch `rwb-2-stage8-muse`,
taken from `origin/rwb-w2` (Stages 1–7 live). This is a docs-only plan. It makes no game code changes.
Names marked **†** are new. Every other name was checked in this checkout.*

Jason's brief (`docs/stage8/BRIEF.md`, corrected by `docs/stage8/BRIEF-ADDENDUM.md`, which wins on conflict):

1. **Stage 8 is the final level**, at **Dumai's Wells**. There is no Stage 9.
2. **Shaido replace Trollocs.** Asha'man, Perrin (+ wolves), Loial, Two Rivers men, Maidens and Wise Ones
   fight alongside Riley in background/foreground.
3. **Every 60 s Mazrim Taim yells "Asha'man, kill!"** and rolling earth and fire sweeps the field. It hits
   **everyone** — Shaido, allies and Riley. Taim stays an ally. **There is no Taim boss.**
4. **Opening:** Rand shielded inside the box (the chest), "talking" to Lews Therin (a voice in his head)
   while straining against the saidar shield.
5. **Call-ins: Mat Cauthon first** (ashandarei, wide-brimmed hat, luck/dice), **then Rand** after he breaks
   out of the box. Moiraine and Lan sit this stage out. Perrin/Loial are allied fighters, not call-ins.
6. **Twinkle Toes = Kenzie**, about 8, long dark wavy hair, pink recital outfit, gold paper crown (Queen of
   Love and Beauty at Medieval Times). **Her face is never shown.** She is guarded by a Black Ajah circle.
   Riley breaks the circle **in a cutscene using Callandor**, then Riley and Kenzie **link** and fight
   Lanfear together in cutscene and gameplay (combined Riley+Kenzie art).
7. **Final boss Lanfear** (fitted sleeves), jealous that Kenzie was crowned Queen of Love and Beauty.
   Intense One Power fireball duel. Finale lines are exact (§1.3 CS6).
8. **Music:** a **brand-new Suno track** with Nordic-style vocals. Jason's original "Asha'man Kill" song is
   a **feel reference only and must never play in the game**.
9. **Best artwork in the game**, including Rand in the box. Video: Google Flow first (≈10 clips), Grok
   Imagine for the rest; prompts never name characters. Budgets: ~120 MiB GL textures, 25 MB pre-fight gate.

This plan copies the structure of `docs/STAGE7-PLAN.md` and `docs/stage6/PLAN.md`, and reuses their blocks:
zone streaming (`src/zone-stream.js`), compact normals (`src/texture-pages.js`), painted art through
`tools/stage7/process_art.py`, call-in rules and cutscene players (`src/rand-call.js`,
`src/rand-call-cutscene.js`, `src/moilan-call.js`, `src/call7-cutscene.js`), the hook pattern
(`src/stage6-lifecycle.js`, `src/stage7-lifecycle.js`), and the story-reel (`src/twix.js:Cutscene`,
`Stage1.startCutscene` in `src/stage1.js`).

`docs/CAMPAIGN-ARC-PLAN.md` is **superseded where it conflicts**: its Stage 8 Cairhien siege, Stage 9
TDOG/Taim boss, Galina mid-boss and Moiraine/Lan-through-the-finale are all dropped. Its reusable
mechanics (Black Ajah `sister` weave-shield/air-bind, gateway line hazards, provider-switch on a phase
gate) are kept and credited where used. Tone is unchanged: teen/adult, no gore. Shadowspawn dissolve to
ash; Shaido and sisters **yield** (kneel, fade as gai'shain / shielded prisoners). Lanfear is not killed:
she is pushed through the doorway, as Jason wrote.

**The one structural idea of this plan:** Stage 8 is a *battle Riley crosses*, not a corridor he empties.
Allied fighters hold the top and bottom edges of every zone, Taim's 60-second wave resets the whole field,
and Riley's job is to fight *through* the gaps to the wagon circle. That sells Dumai's Wells at beat-'em-up
scale without an escort mission, without allied HP bars, and without letting allies steal the call-in
economy (`noteRileyKo` counts Riley's KOs only, as in `src/rand-call.js` / `src/moilan-call.js`).

---

## 0. Ground rules (every task)

### 0.1 Carried over from Stages 6–7 unchanged

- **Protected files.** Never edit `src/input.js`, `src/hud.js`, `lib/` or `index.html`. Never edit an
  existing test. You may add new tests.
  - The touch `CALL` button (`#tbL`) and the `assist` action (keys R/V/U/I, pad LB) still drive the call.
  - `src/riley.js` still calls `scene.callLoial?.()`. Stage 8 reroutes it through a kit hook, as
    `src/stage6-lifecycle.js` (`hook(kit, s, 'callLoial', …)`) and `src/stage7-lifecycle.js` (`hook7`) do.
  - `src/stage1.js` gets **no new Stage 8 logic**. Only the registry/release wrappers in T1–T2.
- **Stages 1–7 stay byte-identical in behaviour.** Stages 1–5 keep Loial, Stage 6 keeps Rand, Stage 7 keeps
  Moiraine/Lan. A new test asserts none of them loads Stage 8 art, audio or clips, and the golden
  simulations for seeds `FULL_STAGE_SEEDS` are unchanged.
- **Control parity is absolute** (`src/input.js` `KEYS`/`PAD_MAP`, `index.html` touch buttons
  `#tbA/#tbJ/#tbS/#tbB/#tbL`). Linked mode (§2.6) adds **no button, no gesture, no combo**. If an idea
  needs a new input, it is out of scope.
- **Budgets.**
  - The pre-fight gate is at about 51 KB of headroom (Stage 7 plan §0.1). `tools/audit-stage1.mjs` counts
    every `src/*.js` not in a stage set, and every voice not matching a stage prefix.
  - So every Stage 8 module goes in a new `STAGE8_SRC`† set. Every Stage 8 voice id starts with `st8_` or
    `riley_st8_` (§6.2), so one regex `/^(st8_|riley_st8_)/` covers the audit, exactly as
    `stage7Voice` does for Stage 7.
  - Every Stage 8 asset lives under `assets/stage8/` or `assets/bg8/`, never under the counted
    `assets/{chars,bg,props,ui,powers}`. Music files keep the `music-*.mp3` names in `assets/audio/`
    (counted only on their own `stage8.music` line, as Stages 6–7 do).
- **Hardening lessons (Stages 3–7), every task:** `releaseHold('break')` on call, death, stage switch and
  destroy; governor-safe `setQuality` before `build()`; `stage4Delta` / `substeps` at 120 Hz
  (`src/stage4-time.js`, `src/stage5-clock.js`); zone-clear disposal; a `counterUsed` latch on every boss
  and hazard hit; lights ≤ 10; attack tokens ≤ 2 (`Stage1.attackTokens()`, `maxTokens`); all timers on
  the game clock (never `Date.now()`, never audio time, never `AudioContext.currentTime`).
- **No placeholder text for players.** Code-drawn stand-ins show their stamp only under `?debug`.
  Stage 8 joins `tests/no-placeholder.test.mjs` (or a `stage8-no-placeholder` sibling if editing the
  shared table needs Jason's OK, as Stage 7 planned).
- **Determinism.** No `Math.random()` in Stage 8 rules. Use the seeded `rand`/`pick` from
  `src/config.js`, seeded through `withSeed` in the harness, as Stages 6–7 do. Mat's "luck" (§3.2) is
  seeded flavour, never seeded power.

### 0.2 Depiction hard rules (brief + addendum; they override every art/video task)

- **Riley** (Jason's real 16-year-old son: muscular, short dark hair, blue glasses, sleeveless black
  Asha'man coat, fingerless gloves, black pants/boots). In **video always from behind; face never
  visible**, not even blurred, not past profile. In painted stills use the existing atlas look; do not
  repaint his face from a photo.
- **Kenzie / Twinkle Toes** (about 8, third grade, chest-height next to Riley, long dark wavy hair, pink
  recital outfit, gold paper crown). **Face never shown** in stills or video: from behind, silhouette,
  hair-over-face, or turned away. **No real photo of her is ever used as art input or reference.** Every
  Kenzie frame is drawn from the written description only. She is never a target, never hurt on screen,
  and never holds a weapon. Her channeling is light from her hands, thrown *past* the camera.
- **No actor likenesses.** Never prompt by actor, show or book-character name for video (Google Flow
  refuses named/prominent people anyway). Painted sheets describe original faces. Any take that drifts
  toward a TV-cast likeness is rejected (Stage 6/7 rule, restated).
- **Lanfear** is a purely villainous adult antagonist. No flirtation, no romance beats, fitted sleeves
  (addendum), moon-white/silver palette. She threatens the *crown*, never the child directly on camera;
  the circle holds Kenzie, Lanfear arrives after the break.
- Every clip and Kenzie/Riley still gets a frame-by-frame review at 4 fps, logged in `ART_STATUS.json`
  with reviewer and timestamp, before it ships (Stage 7 §4.1 pattern).

### 0.3 The hard-coded "7" spots Stage 8 must generalise (T1)

Checked in this checkout. Stage 7 already removed most hard-coded 6s; Stage 8 must not reintroduce any.

| File | Today | Problem for Stage 8 | Fix (T1) |
|---|---|---|---|
| `src/stages.js:12` | `MAX_STAGE = 7` | `?stage=8` rejected by `stageFromQuery`/`resolveStage` | `MAX_STAGE = 8` |
| `src/stages.js:16-25` | `stageEnabled(7)` reads `s7`; `maxStage` tops at 7 | Stage 8 unreachable from title | `stageEnabled(8)` reads `s8`, **off by default** until T18; `maxStage` → 8 when enabled |
| `src/stage7-def.js` | `next: () => ({ stage: 1, stage7Return: true })` | Stage 7 loops to 1 | `next: q => stageEnabled(8, q) ? { stage: 8 } : { stage: 1, stage7Return: true }`. Takes the query arg like `STAGE2.next`/`STAGE6.next` |
| `src/rand-call.js` `callInFor` | `n >= 7 ? 'moilan' : n === 6 ? 'rand' : 'loial'` | Stage 8 would call Moiraine/Lan | `n === 8 ? 'matrand'† : n === 7 ? 'moilan' : n === 6 ? 'rand' : 'loial'`. Existing tests for 1–7 unchanged |
| `src/music.js` `STAGE_MUSIC` | frozen for 1–7 | No Stage 8 tracks | Add `8: { stage: 'stage8', boss: 'boss8' }`. `MUSIC.stage8/boss8` registered by mutation in `src/stage8.js`†, as Stage 7 does, so `src/audio.js` need not grow |
| `src/cutscene.js` `STAGE_CLIPS`; `src/cutscene-hooks.js` `wrapStart(7, 7)` | no 8 | No intro clip | Add key `8` and `wrapStart(8, 8)`. Both files sit in the 20 KB `CUTSCENE_SRC` line; keep the edit to two lines |
| `src/stage1.js` `activeStages` / `releaseStage` wrappers | 5/6/7 added by `queueMicrotask` prototype wrappers (`src/stage7.js` `releaseStage7`) | Stage 8 art never released | Copy the Stage 7 wrapper for 8 (T2). A registry refactor is engine work, not Stage 8 |
| `src/zone-stream.js` `STREAMS` | 5, 6, 7 | No Stage 8 backdrops | `STREAMS[8]`† with its own `bleed` (§7.2). Stages 5–7 values pinned by test |
| `src/texture-pages.js` | `COMPACT_STAGES = {4,5,6,7}` | Stage 8 loads full normals (+~27 MiB) | Add `8` |
| `src/bot-stage4.js` | dispatches on `stageNo` | Bot uses wrong logic on 8 | Add `if (s.stageNo === 8) return stage8Bot(bot)` (T12) |
| `src/hud.js` `STAGE_NAMES`, `speakerColor` | covers 1–5; villain regex | Title card; `LANFEAR`/`TAIM`/`SHAIDO` captions in ally blue | Patch from `stage8-hud.js`† as Stage 6/7 do (protected file, never edit it). Villain list: `LANFEAR`, `SHAIDO`, `BLACK AJAH`, `WISE ONE` (Shaido). `TAIM` and `LEWS THERIN` get their own colours (§3.3) |
| `src/stage6-hud.js`, `src/stage7-hud.js` guards | already `=== 6` / `stageNo === 7` | — | No change. New `installStage8Hud`† must guard `=== 8` everywhere; T1 asserts Stages 6–7 HUD text unchanged |
| `src/assets.js` `ALL_CHARS` | hard list | Stage 8 roster must not silently add an atlas | No change. Stage 8 uses `riley` + `loial` atlases only (§2.2, §7.1) plus painted sheets |

**Acceptance for T1:** every existing test passes; golden diff for Stages 1–7 empty; `?stage=8` without
`s8=1` resolves to 1; `callInFor(5)==='loial'`, `(6)==='rand'`, `(7)==='moilan'`, `(8)==='matrand'`;
pre-fight gate grows ≤ 400 bytes (registry edits only).

---

## 1. Setting and story

**Timeline: *Lord of Chaos*, Dumai's Wells.** Canon used: Rand is taken by the Tower embassy, shielded
by saidar, carried in a chest; Lews Therin's voice argues in his head; Perrin leads the rescue with
wolves, Two Rivers men, Maidens, Wise Ones and Loial; the Shaido attack both sides; Taim arrives through
gateways with the Asha'man and gives the order "Asha'man, kill!"; rolling earth and fire (the book's
rolling ring of earth and fire) breaks the Shaido. Riley's departures, all Jason's: Kenzie is held by a
Black Ajah circle inside the wagon ring; Lanfear — who in canon vanished through the redstone doorway
with Moiraine — has been watching through the doorway's crack and steps back through for the crown;
Moiraine and Lan sit the stage out (their absence is now canon-true, which the narrator lampshades in
one line and never again); Callandor is in Riley's hands for one cutscene (§1.2, decision Q2).

**Where Callandor comes from.** Stage 6 leaves Callandor thrust into the Heart of the Stone
(`s6call` prop, `src/stage6-view.js`); nobody takes it during the fight and Be'lal can never take it
(`src/belal.js` `hasCallandor` stays false). Stage 8's story-in therefore spends one panel on it: before
riding for the wells, Riley went back into the Heart and drew it, because Rand — in the last message
before he was taken — told him to. It is too much sword for a brawl, so Riley carries it sheathed on his
back all stage (a visible crystal hilt prop on the Z0–Z2 sprite, §5) and draws it exactly once, to cut
the circle (CS4). After the link he throws it point-down into the well stones, where it stands glowing
through the boss fight as a light source — which is why linked fireballs burn white-gold. One prop,
three story jobs, no new melee system.

**The shield as a visible clock (distinctive idea 1).** Rand's breakout must never feel like a timer the
player failed. Instead the HUD carries five small shield pips under the boss/call slot from Z0: one pip
cracks at each of Z0 clear, Z1 clear, first Taim wave survived, Z2 wave 0 clear, and circle approach.
Each crack plays a 6-second box interlude caption (CS-Box, §1.3) without stopping play. The fifth pip
shatters in CS5 and the call-in flips from Mat to Rand. The player *causes* the breakout by progressing;
speedrunners and cautious players both get Rand for Lanfear, and the bot can assert the flip.

### 1.1 Riley's version (zone by zone)

1. **Z0, the grass hills.** Riley, Perrin, Loial and the Two Rivers men hit the Shaido screen. Mat is
   already there (he "felt lucky about this hill"). First Taim wave teaches the hazard. Kenzie's crown
   glints once on the far wagons (the `view.glimpse()` pattern from `src/stage6-view.js`, reused).
2. **Z1, the wagon circle.** Aes Sedai wagons, the chest on a wagon bed at the right edge, thumping.
   Shaido Wise Ones channel from the wagon roofs. The wolf-pack charge set piece (§2.3) crosses here.
3. **Z2, the wells.** Three stone wells in a copse. The Black Ajah circle holds Kenzie at the middle
   well. Riley fights the circle's outer sisters, draws Callandor in cutscene, links with Kenzie, and
   fights one linked tutorial wave. On the ridge, the chest bursts open: Rand is free.
4. **Z3, the ridge above the wells.** Lanfear steps out of a redstone doorway that should not be there,
   wearing a better crown. Linked fireball duel. Finale exactly as Jason wrote it, then credits and
   **CAMPAIGN COMPLETE**.

### 1.2 Story in / story out (painted panels, narrator + cast, ~22 s)

Three panels (`story8p1..3`†, §5), driven by `STAGES[8].start` → `s.startCutscene(STORY8_SCRIPT,
STORY8_PANELS, …)` exactly as `STAGE7.start` in `src/stage7.js`. An optional intro video (V1, §4) may
precede them through `wrapStart(8, 8)`; if it plays, `scene.clipShown` drops the two lines it already
voiced, as Stages 6–7 do. Lines are in §6.2; scripts with delivery notes are §1.3 CS0.

**Story out** is not a card: it is the playable outro (§2.7) — Riley walks right across the quiet field
while Kenzie dance-walks beside him and the exact finale lines play — then the clear card reads
**CAMPAIGN COMPLETE**, then a skippable credits scroll (code-drawn text, any `SKIP_ACTIONS` key), then
title. `STAGE8.next`† returns to the title with `campaignComplete: true` for the meta scorecard
(`docs/ENGINE-EXTRACTION-PLAN.md` §12), never `{ stage: 9 }`.

### 1.3 Cutscene scripts (exact lines; ids in §6.2)

Delivery notes follow `docs/stage5/VOICE-SCRIPT.md`: say it straight, teen/adult, no kid-show bounce.
Captions show the *Line* column verbatim. Phonetic respellings live only in the TTS prompt (§6.1).
All cutscenes are skippable with `SKIP_ACTIONS` (`src/cutscene.js`); skipping never skips gameplay state
(the strike, the link flag and the provider flip apply on `done` however the clip ended, as in
`src/rand-call-cutscene.js:playCall`).

**CS0 — Story in (panels; V1 may cover the first two lines).**

| # | Speaker | Line | Delivery note |
|---|---|---|---|
| 1 | NARRATOR | "They took the Dragon in a box, shielded and silent, and rode for Tar Valon. The Shaido rode to take him from them." | Low, even. A war report, not a trailer voice. |
| 2 | NARRATOR | "At Dumai's Wells, three armies met. And in the wagon circle, in a pink dress, with a paper crown — a little sister waited." | The crown beat lands dry. Do not play it cute. |
| 3 | RILEY | "That's her crown. That's Kenzie." | Flat certainty. He has chased ribbons for seven stages; this is the end of it. |
| 4 | PERRIN | "Wolves say the Shaido hold the hills. We go through them. Together." | Quiet, solid. A blacksmith giving orders he hates. |
| 5 | RILEY | "Together. Callandor stays sheathed till I reach her." | Sets up CS4. Matter-of-fact. |
| 6 | NARRATOR | "Moiraine and Lan were gone beyond a redstone door. This rescue belonged to the living." | One line, never repeated. Explains the missing call-ins without a lore lecture. |

**CS-Box — Rand in the box (opening set piece + four interludes).** The opening plays as the last
story panel holds on the chest (or as video V1/V2, §4): black, wood creaks, a heartbeat, then light
through the slats whenever the shield strains. Lews Therin is **audio only** — a drier, older take of
Rand's voice design, panned centre, no body, no face, captioned `LEWS THERIN` in cracked gold (§3.3).
Rand is heard *straining*: breath and wood, not speeches. Each interlude is captions over live play;
only the opening and the breakout (CS5) pause the game.

| Beat | Speaker | Line | Delivery note |
|---|---|---|---|
| Open | LEWS THERIN | "Break it. Break the shield, break the box, break them all —" | Urgent whisper that keeps interrupting itself. Mad, not evil. |
| Open | RAND | "Quiet. I can feel the knots. One… at… a… time." | Through teeth, on strained breaths between pushes. The gaps are effort. |
| Open | LEWS THERIN | "They beat you like a dog and locked you in the dark!" | Rising, then bitten off as Rand pushes and the slats flare. |
| Open | RAND | "Then help me count knots, old man. Or be quiet." | Cold control. The first shield pip cracks on "quiet". |
| Pip 2 (Z1 clear) | LEWS THERIN | "Do you hear that? Drums. Asha'man. *Mine* would never —" | He is listening through the wood. Trails off; he likes the drums. |
| Pip 3 (first wave survived) | RAND | "That's Taim. Hold on. Just… hold on." | Said to everyone outside, through the lid. Quieter. |
| Pip 4 (Z2 wave 0 clear) | LEWS THERIN | "One knot left, boy. One! Tear it — tear it —" | Almost kind with excitement. Fast. |
| Pip 5 (circle approach) | RAND | "Now." | One word, level. The thumping from the chest stops for a full beat. (CS5 pays it off.) |

**CS1 — Taim's arrival (first hazard telegraph, Z0 wave 1; captions over play, no pause).** Gateways
split the ridge behind the Asha'man line (background FX, §2.3). Taim's line is the hazard's voice sting
every cycle thereafter (§2.4); only the first gets the full caption pair.

| Speaker | Line | Delivery note |
|---|---|---|
| TAIM | "Asha'man… kill!" | A parade-ground order. The pause is the raised hand; "kill!" is the drop. Never shouted hoarse — *issued*. |
| RILEY | "Everybody DOWN — blue gap, MOVE!" | Riley teaching the player the safe-lane read (§2.4). A snapped order to the line. |

**CS2 — Mat joins (Z0 clear, 10 s, in-engine tableau; enables the Mat call-in).** Play continues around
a locked camera beat (`kit.freezesWorld()` false; Riley controllable). Mat vaults a wagon tongue,
ashandarei spinning once, hat staying improbably on.

| Speaker | Line | Delivery note |
|---|---|---|
| MAT | "Dice have been rattling in my head for three days. Something lucky's about to happen — probably to me." | Grinning complaint. Fast, then the grin. |
| RILEY | "Mat?! What are you —" | Genuinely startled. |
| MAT | "Rescuing Rand. Again. Call me when it gets thick. I'll be the one not dying." | The call-in contract in one joke. HUD flips to `MAT READY` on "Call me". |

**CS3 — Lanfear's motive (Z1 glimpse + Z2 approach, two fragments; full reveal in CS6-open).** The
Medieval Times joke must land as *Lanfear being deadly serious*, which is what makes it funny. Nobody
laughs at it in-world until Riley does, once, in the boss intro.

| Beat | Speaker | Line | Delivery note |
|---|---|---|---|
| Z1 glimpse (far wagon roof, moon-white figure, gone when Riley looks) | LANFEAR (distant, uncaptioned whisper under music) | "…a *paper* crown. For a *child*…" | Contempt curling into fascination. Player may miss it; that is fine. |
| Z2 approach (circle sisters look up, afraid of their own employer) | BLACK AJAH SISTER | "Hold the circle! She is watching. The Lady will not be mocked by a fairground crown!" | Terrified officiousness. "Fairground" is spat. This line names the motive before Lanfear does. |
| Z2 approach | RILEY | "She kidnapped my sister over a *Medieval Times crown*?" | Disbelief first, fury second. The audience's laugh and Riley's anger are the same beat. |

**CS4 — Breaking the circle with Callandor (mid-Z2, full cutscene, ~25 s; video V6 or panel fallback).**
Gameplay delivers Riley to the circle's edge with the outer sisters beaten (§2.5); the cutscene does the
rest, as Jason asked. Riley only from behind in video; Kenzie from behind/silhouette inside the light.
Callandor's draw is the only slow-motion beat in the game (`fx.slowmo` already exists; 0.3× for 1.2 s).

| # | Speaker | Line | Delivery note / staging |
|---|---|---|---|
| 1 | BLACK AJAH SISTER | "Thirteen linked! No man breaks this circle!" | Triumphant, then she sees what he is drawing. |
| 2 | RILEY | "Kenzie. Eyes shut. Count the Twix song." | Gentle for her, not for them. (Callbacks the Stage 1 Twix scene; Kenzie hums two notes, unseen.) |
| 3 | — | *(Callandor clears its sheath. The circle's weave-lines light up like harp strings.)* | One crystal note (SFX §6.4). No line. Let it ring. |
| 4 | RILEY | "Then let's see what a brother breaks." | Quiet. He cuts *up* through the weave, not at any sister. Sisters are thrown down by the recoil and shielded where they fall — yielded, not harmed. |
| 5 | KENZIE (from inside the light, face never shown) | "BUBBY!" | One huge kid shout. The whole campaign in one word. |

**CS5 — The link, and Rand breaks out (immediately after CS4, ~20 s, then linked tutorial wave).**
Linking is shown as Kenzie grabbing Riley's glove with both hands; pink-white saidar threads braid into
his black-gold saidin aura (existing `Powers.makeAura` tint path, §2.6). On the ridge behind them the
chest explodes outward — the player sees Rand stand up in the background mid-cutscene, which is the
provider flip made visible.

| # | Speaker | Line | Delivery note / staging |
|---|---|---|---|
| 1 | KENZIE | "I can do the sparkly thing too! Watch — no, hold my hand, it works better!" | Eight-year-old show-and-tell urgency. She revealed channeling at the Stone (Stage 6); this is her using it on purpose. |
| 2 | RILEY | "Okay. Okay! Linked. You aim the lightning, I aim everything else." | Laughing while bracing. Teaches §2.6 in one sentence: she adds, she does not steer. |
| 3 | LEWS THERIN (from the ridge, delighted) | "FREE! Ha! Do you see —" | Cut off by Rand, hard. |
| 4 | RAND | "Quiet. …Riley. You came." | Hoarse, standing in the wreck of the chest. A full beat before "Riley". |
| 5 | RILEY | "Call, and I'll come. Your line. Now it's yours again." | Mirror of Stage 6's `st6_clear_03` ("Call, and I'll come."). HUD flips to `RAND READY` with a fresh charge (§3.1). |
| 6 | MAT (cheerfully retiring) | "And that's my luck spent. Rand's turn. Try to need less rescuing!" | Explains the handover so no player wonders where Mat went. He stays as a background fighter (§2.3). |

**CS6-open — Lanfear (boss intro, `boss.introVoice`).** The redstone doorway stands open on the ridge
where no door should be, its far side wrong (heat shimmer, a hint of scales). Lanfear steps out adjusting
an actual silver crown with both hands, like a queen checking a mirror.

| Speaker | Line | Delivery note |
|---|---|---|
| LANFEAR | "Queen of Love and Beauty. Crowned at a *dinner theatre*. While I — who was beautiful when your mountains were *seabed* — watched through a crack in a door." | Silk over outrage. "Dinner theatre" gets the full Forsaken disgust. |
| RILEY | "You crossed worlds… for the paper crown." | The one permitted laugh is inside this line and dies fast. |
| LANFEAR | "Give it to me, little dancer. Or burn holding it." | To Kenzie's silhouette, never raising her voice. Fight starts on "burn". |

**CS6-finale — after the fireball duel (Jason's exact lines; do not punctuate differently in captions).**
At 0 HP Lanfear is not beaten down; she is *winning the pose* and losing the shoving match (§2.7).
Staging: linked Riley+Kenzie on the left, hands joined, the huge fireball growing between their four
hands; Lanfear centre-ridge; the redstone doorway open behind her, its far side now clearly a sunlit
marble hall with tall, sinuous silhouettes turning toward the noise.

| # | Speaker | Line (exact) | Delivery note / staging |
|---|---|---|---|
| 1 | LANFEAR | "I am the queen of love and beauty!" | Full proclamation to the battlefield, arms wide, as the fireball lights her like a portrait. She believes the moment is hers. |
| 2 | — | *(The linked fireball launches. It does not explode on her — it* pushes*, a wall of fire she skids backward against, crown first, through the redstone doorway.)* | 2.5 s of pure push (gameplay `finalePush` state, §2.7). Her scream starts as fury and changes key when she sees where she is going. |
| 3 | LANFEAR | "Not again! Not the snake people! Ahhhhhhh!" | Fury → recognition → pure horror. The doorway slams on the scream; one silver crown bounces out, rolls, and stops at Kenzie's feet. She does not pick it up. Hers is paper. |
| 4 | KENZIE | "Bubby you saved me! But what took you so long?" | Over the **sassy walk dance**: a full catwalk strut across the outro field — chin up, crown straightened with both hands, hip-sway walk, one spin, hands on hips for the question. Playable outro (§2.7): the player walks Riley beside her. Face never shown; the dance reads entirely from behind/side silhouette and hair. |
| 5 | RILEY | "Too many snack breaks." | Deadpan, exhausted, to camera-left. Beat. Kenzie nods like this explains everything. Credits sting. |

---

## 2. Level

### 2.1 Zones, segments and timeline

The world stays `WORLD_W` 5200 px with 4 zones, the same geometry as `src/stage6-def.js` /
`src/stage7-def.js`, so camera, `skipBoss`, zone locking (`Stage1` zone advance) and streaming
(`STREAMS[8]`†, `createPlateStream`) are reused unchanged. The finale earns its length from density and
set pieces, not from a fifth zone the engine does not have. Bot target **6:00–7:00** (Stages 6–7 target
4–4.5 min; the last level may breathe). Lanes stay `LANE_TOP` 572–`LANE_BOT` 690 (`src/config.js`);
`VOLLEY_BANDS` thirds (`src/stages.js`) drive every band telegraph below.

| Zone | `at` / `l`–`r` | Place | Light | Waves (type, side, delay s) | Set piece / segment |
|---|---|---|---|---|---|
| Z0 | 260 / 0–1280 | **The grass hills**: Shaido screen, gateway ridge behind | late gold, dust haze | `[[spearman†,R,0],[spearman†,L,1.0]]`, `[[stonedog†,R,0],[runner†,L,0.8],[bowman†,R,1.6]]` | **First "Asha'man, kill!"** at wave-1 start (scripted, then the 60 s clock takes over, §2.4). Crown glimpse on clear; CS2 Mat joins |
| Z1 | 1500 / 1240–2520 | **The wagon circle**: embassy wagons, the chest on a wagon bed (right edge, thumping) | wagon lanterns + gateway flicker | `[[runner†,R,0],[wise†,T,0.6]]`, `[[stonedog†,L,0],[spearman†,R,0.5],[bowman†,T,1.2],[runner†,L,1.8]]` | **Wolf-pack charge** (§2.3) between waves. `T` = wagon roofs (Stage 7 `T` side, no new spawn code). Chest thumps louder each pip |
| Z2a | 2800 / 2560–3840 | **The wells approach**: three stone wells, copse, circle light ahead | copse shade, circle glow | `[[sister†,R,0],[spearman†,L,0.4],[runner†,R,0.9]]`, `[[sister†,T,0],[stonedog†,L,0.5],[wise†,R,1.0]]` | Outer circle guard (§2.5). Wells are Taim-wave shelters (§2.4) |
| Z2b | (same zone, kit segment) | **The circle at the middle well** | linked braid light | CS4 → CS5 → linked tutorial `[[runner†,R,0],[spearman†,L,0.6],[bowman†,R,1.2]]` | Link forms here (§2.6). No ribbon drop this stage: the *crown* is the pickup that starts CS4 (§2.5) |
| Z3 | 4140 / 3920–5200 | **The ridge**: redstone doorway, planted Callandor, broken chest below | dusk violet; doorway spill; Callandor god-rays | boss | **Lanfear** (§2.7). Outro walk reuses this plate, enemies gone |

- **Drops** (`STAGE8.drops`†, same shape as Stage 7): Z0 `angreal` / `lightning`; Z1 `fireshield` /
  `airwhip`; Z2a `ter?` / `angreal`. `bossDrop: { phase: 2, kind: 'saangreal' }`. No Twix in the finale
  (`queuePowerArt(s, { twix: false })` as Stage 7); Riley's punchline works better if he has visibly
  *not* had a snack break all stage.
- **Crates:** `[[880,600],[2140,650],[3330,610],[4600,596]]`, `crateProp: 's8crate'`† (embassy supply
  chest — deliberately *not* Rand's chest, which is `s8chest`† and never breakable), planks `s8planks`†.
- **Skip:** `skipBoss: { zoneI: 2, x: 3990, camX: 3500 }`, identical to Stages 6–7; the harness relies on
  it. Skipping sets `linked = true` and provider `rand` (T2 asserts the boss is fightable linked).
- **Ribbon:** none. Seven stages of ribbons end here; `stats().ribbons` stays `undefined` for Stage 8
  and the clear card shows the crown icon instead (§3.3). A test pins that Stages 1–7 ribbon behaviour
  is untouched.

### 2.2 Enemies: Shaido mapped onto shipped AI

**Roster cut (the budget decision that funds the finale).** `STAGE8_CHARS`† `= ['riley', 'loial']`.
Dropping the `grunt` (19.90 MiB) and `spear` (13.00 MiB) atlases that Stage 7 carries frees ~33 MiB of
decoded RGBA for the linked sprite set, Lanfear, the sisters and the allied cast (§7.1). `loial` stays
because Loial the ally (§2.3) reuses his finished atlas and `src/loial.js` sweep timing for free.
Every Shaido and sister is a **painted fighter** on the `Stage7Fighter` base (`src/stage7-fighter.js`)
via a new `src/stage8-fighter.js`† copy, drawn 1:1 (`meta.drawScale`), no normals — the exact pattern
`src/shaido.js` (`Dancer`/`Veiled`) proved. Stage 7's `s7dancer`/`s7veiled` sheets are **reused as
silhouette/background Maidens** (§2.3), not as Stage 8 enemies, so the two stages never look identical.

| Type† | AI base (reuse, do not reinvent) | HP | Speed | Behaviour | Tell | Yield / score |
|---|---|---|---|---|---|---|
| `spearman` (Shaido spearman) | `TYPES.spear` slot logic in `src/enemies.js` (`Enemy.think`, `attackTokens`, hover-out) reimplemented on the painted fighter | 46 | 118 | Holds `pref` 255, thrusts. The rank-and-file Trolloc-spear replacement | Spear dips 0.50 s, veil-band flash | yields; 350 |
| `runner` (veiled runner) | Stage 7 `dancer` flanker in `src/shaido.js`: circles to the unattacked side (reads `attackTokens()`, holds no token while circling), cartwheel-lunge 300 px | 60 | 210 | Flank + lunge, exactly the shipped Shaido read | Kneel + veil up 0.45 s, spear-tip glint | yields; 450 |
| `stonedog` (Stone Dog shieldman) | Stage 2 `Zealot` block/break in `src/whitecloaks.js` (`ZEALOT.blocksToBreak 3`, dazed ×1.3) + `Enemy` armour rule | 95 | 92 | Advances behind a hide shield; frontal light/medium hits clang (`flashArmor`); 3 blocked hits or any heavy/throw breaks guard → 1.8 s dazed. Shield-bash (tell 0.60 s, dmg 10, down) | Shield plants, rim scrapes sparks | yields; 550 |
| `bowman` (Shaido bowman) | Stage 7 `veiled` archer (`src/shaido.js`) + Stage 2 `Archer` keep-range (`ARCHER.keep [390,510]`): 420–620 px, 1 arrow/band, global 0.6 s spacing via `kit.arrowAt` | 40 | 120 | Band-line arrow at 460 px/s, dmg 7 (Stage 7 numbers) | Bow draw 0.60 s + thin band line | yields; 350 |
| `wise` (Shaido Wise One channeler) | Stage 4 `Cultist` in `src/cultists.js` (`CULTIST`, `casterBusy`, token-holding cast) with fire instead of fog | 55 | 85 | Keeps 380–560 px. **Fire lance** along her band (tell 0.80 s, dmg 11) or **earth spike** under Riley's last position (ring tell 1.0 s, dmg 9 — the Stage 7 waking-street numbers, `src/stage7-street.js` `STREET`). One caster casting at a time | Hands glow orange / ground ring, chant SFX | yields; 600 |
| `sister` (Black Ajah sister) | New `src/sister8.js`† on the painted fighter; shield/bind from the superseded campaign plan §3.3, grab plumbing from `src/darkfriends.js` (`GRABBED` mash, `releaseHold('break')`) | 70 | 90 | §2.5. Z2 only | Blue bubble pop/re-weave; pale bind ribbon | yields (shielded); 700 |

- **No new grabber.** The sister's air-bind (§2.5) reuses the cutthroat hold contract
  (`Riley.enterGrabbed/leaveGrabbed`, `GRABBED.mashKeys`) and counts as the stage's one holder. No Shaido
  grabs. One binder at a time; bind holds an attack token.
- **Humans never ash, never gore.** Every `die()` routes to `yield()` as in `src/shaido.js`: kneel 0.8 s,
  fade. Call-ins and Taim waves obey the same rule (§2.4, §3.2): they down or yield humans, never kill.
- **Tokens/lights:** all attacks respect `attackTokens() < maxTokens (2)`; casters and binders included.
  Every hit that can damage Riley carries `source` strings for the damage-cap pattern
  (`src/stage6-hurt.js:strikeRiley`, Stage 7 `capDamage7`): shared 12 HP / 0.5 s cap across boss +
  hazards, so a Taim wave and a spear thrust in the same half-second cannot burst 24.

### 2.3 Allies: a battle around Riley, not an escort mission

Two tiers, both cheap. **Tier B (background, plate-anchored loops)** costs no AI: sprite pairs on the
mid plates at scrollFactor 0.4, 3-frame clash loops exactly like Stage 6's Defenders (`s6def`, frame =
⌊t/180 ms + i⌋ mod 3). **Tier F (foreground lane partners)** are at most **2 live actors**, untargetable,
no HP, no collision with Riley, who shadow Riley's lane at a fixed offset and *finish* already-yielding
or downed enemies with a visual strike that deals **0 damage** — they read as fighting the same battle
without touching KOs, score, combo or the call-in meter. When a Taim wave telegraphs, Tier F allies dive
to the safe band a half-second before Riley must (§2.4): the allies *are* the tutorial.

| Ally | Tier | Where | Behaviour |
|---|---|---|---|
| Asha'man line (black coats, sword+dragon pins) | B + 1 F captain | Ridge behind every zone; gateways flicker on zone entry | Raise hands on Taim telegraph (the safe-gap signal, §2.4). The captain (F) stands at the zone's back edge and earth-spikes *background* Shaido silhouettes on a 7 s loop |
| Perrin (axe + hammer at belt, golden eyes) | F | Z0–Z1, then Z3 outro | Lane partner at Riley.y − 44. Calls the wolf charge (below) with a howl SFX + caption bark |
| Wolves (pack of 5 + big grey lead) | set piece | Z1 between waves; Z3 P2 once (§2.7) | **Wolf-pack charge (distinctive idea 2):** a 1.2 s howl telegraph marks one `VOLLEY_BANDS` lane with paw-print dust; the pack then crosses at 700 px/s, knocking every Shaido in that lane down (dmg 15, never lethal below 1 HP) and *herding* them 120 px toward screen centre. Riley profits by herding first and standing clear — positional play no earlier stage has. Riley in the lane is jostled (0 dmg, small push), never hurt by his own side's dogs. Cooldown: scripted twice + Perrin barks; not player-triggered (no spare button exists) |
| Loial (Ogier, axe, book satchel) | F | Z1–Z2 | Lane partner at Riley.y + 44, reusing `src/loial.js` `LOIAL` sweep frames/timing at half frequency. His sweep is visual-only (0 dmg) so Stage 1–5 Loial-as-call-in numbers are untouched. Carries the chest wreckage off in the outro "for his book" |
| Two Rivers longbowmen | B | Z0–Z1 top edge | Loose a visible arrow arc every ~9 s that pins a *background* Shaido. Pure theatre; never interacts with `kit.arrows` |
| Maidens of the Spear | B (reuse `s7dancer` sheet, veils down tint) | Z0, Z2 | Spear-dance clash loops vs Shaido silhouettes. Hand-talk joke caption once in Z0 (caption only, no line budget) |
| Allied Wise Ones | B | Z2 well copse | Hold a shielding dome shimmer over the wells (explains why Lanfear must come to the ridge, Z3, and why the circle needed thirteen). One steps forward in CS5 to take the yielded sisters |

Tier F caps: ≤ 2 actors, ≤ 1 light between them (shared, off by default), removed on zone clear with
the plate stream. If the governor drops quality ≥ 2, Tier B loops freeze to frame 0; at ≥ 4 Tier F
allies hide (the fight must remain winnable without them — they deal no damage, so it is).

### 2.4 The every-60-seconds hazard: Taim — "Asha'man, kill!"

New pure-ish module `src/stage8-taim.js`† (`createTaimWave()`), stepped from `Stage8Kit.step` like
`createStorm()` / `createStreet()` in Stage 7. All timing on `kit.clock` (game time accumulated through
`substeps`, `src/stage5-clock.js`), never wall time, never audio time. The music is composed so its
chant *feels* synced (§6.3); the hazard never listens to it (Stage 7 rhythm lesson: iOS latency varies
50–250 ms).

**Cycle.** First wave scripted at Z0 wave-1 start (CS1). Thereafter every **60.0 s of combat time**
(paused during cutscenes, strikes, story and the outro, because `kit.step` does not run). The clock
keeps running in Z3 — Lanfear fights *through* Dumai's Wells, not beside it — but see the boss-beat
fairness rule below. Expected waves per clear: 6–7.

**Shape — the Rolling Ring (distinctive idea 3).** Two earth rollers and a fire sheet cross the zone
from the Asha'man ridge (screen left in Z0/Z2, right in Z1/Z3, so the read never goes stale):

1. **Telegraph (3.0 s).** Three redundant signals, any one sufficient on a phone at low brightness:
   (a) Taim's voice (`st8_taim_kill_01`, ducking music via `say()`); (b) every Asha'man silhouette raises
   both hands and the ground *rumbles* (trauma 0.15, dust lifting along the two doomed bands);
   (c) the two struck `VOLLEY_BANDS` tint ember-orange while the **safe band tints Asha'man blue** and
   Tier F allies dive onto it. HUD flash in the existing slot: `ASHA'MAN, KILL! — BLUE LANE!`
   (touch variant: `… — STAND IN BLUE!`). The safe band is seeded (`rand` from `src/config.js`) and
   **never repeats the previous wave's safe band**, so camping one lane fails by design.
2. **Roll (2.2 s).** On each struck band: an earth roller (tumbling ridge of soil and stone, `s8roller`†)
   crosses at 620 px/s, trailed 180 px behind by a fire sheet (`s8firesheet`†). Roller hit: **12 dmg +
   knockdown**. Fire sheet hit: **8 dmg**, no knockdown. One `counterUsed` latch per wave: Riley can be
   hit at most once per wave (roller *or* sheet), as every Stage 6–7 hazard does.
3. **Aftermath (2.0 s).** Scorched band decals fade; 0.5 s of hitstop-free quiet. Enemies caught in the
   roll take **40 dmg** (Stone Dogs survive at ~half; spearmen/runners yield) — luring a pack onto an
   ember band and then vacating it is the stage's core skill. Allies in struck bands are knocked flat
   (visual only, they get up in the aftermath). Kenzie, once linked, is never in a struck band without
   Riley — she moves when he moves (§2.6), so the wave can never "hit the kid" separately.

**Dodge windows (all three always available; the bot must use each in tests).**

- **Lane:** stand wholly in the blue band. Riley's band is read from feet `y` vs `VOLLEY_BANDS`
  (`bandOf` pattern, `src/stage5-hurt.js`), with an 8 px grace at the edges.
- **Jump the roller, not the fire:** a jump started ≤ 0.25 s before roller contact clears it
  (`R.z ≥ 30` gate, as `src/stage7-arena.js` shockwave); the fire sheet is tall and cannot be jumped —
  jumping the roller into the sheet trades 12 for 8, a real decision.
- **Well rims (Z2/Z3 only):** standing with feet inside a well-rim ellipse (`s8well` props, three fixed
  spots) negates the roller (earth splits around stone) but not the fire. Wells are marked by a pale
  ring at all times so the read is learned before it is needed.

**Fairness rules (unit-tested, T5).**

- Never starts while Riley is grabbed/bound, in a call-in strike, in any cutscene, or within 0.8 s of
  getup ending (Stage 6 lamp rule). The 60 s timer *holds* at 0 until the coast is clear; it never
  queues a second wave.
- Never overlaps a boss phase-beat (`boss.beat`/`invuln`) or Lanfear's channel tells (§2.7): if the timer
  fires during one, it holds. In Z3 the wave also *clears Lanfear's live fireballs* on the struck bands
  (earth swallows them) — the hazard helps as often as it hurts, which keeps 60 s from feeling like a tax.
- At most one wave live; rollers respect zone bounds; Y-push is zero (knockback is along X only, clamped
  to `bounds.l+40 / r−40` as `createStorm` does).
- Damage shares the 12 HP / 0.5 s cap (§2.2). Bot gate: ≤ 25% of deaths in any zone occur during a roll
  (Stage 7 storm gate was 30%; the finale's readable version must beat it).
- Killed-by-wave Shaido **yield** (they are buried to the knees, then fade as gai'shain). No ash, no gore.
  Wave KOs grant Riley half score and **do not** feed combo, saidin or call-in recharge (Rand-call rule).

### 2.5 The Black Ajah circle (Z2)

Thirteen linked sisters hold Kenzie at the middle well. Thirteen full AI actors would break tokens,
lights and the frame budget, so the circle is **3 real `sister` fighters + 10 linked silhouettes**
(painted ring prop `s8circle`†, women with joined hands, faces hooded/turned — Kenzie-rule-safe by
construction). The silhouettes sway as one body; when a real sister yields, a silhouette steps forward
and *becomes* real (same sprite key, `demand8` already resident), so the circle visibly thins 13 → 10
without ever fielding more than 3 fighters + the Shaido guard. That is the whole trick, and it reads
beautifully for almost no cost.

**Sister mechanics (outer guard, Z2a waves).**

- **Weave shield:** a blue bubble (`s8bubble`†, reusing the Stage 7 `s7shield` drawing approach) absorbs
  fireballs, lightning and balefire outright. **3 melee hits pop it**; she is open for 3.0 s, then
  re-weaves (tell 1.0 s, interruptible back to open by any hit). Throws pop it instantly. This teaches
  "close the distance on channelers" one zone before Lanfear.
- **Air bind:** tell 0.80 s (pale ribbon along her band, `s8bind`†). On hit Riley is held 1.2 s through
  the existing grabbed contract (mash with `GRABBED.mashKeys`, `releaseHold('break')` on call/death/
  switch/destroy). Jumping during the tell dodges it (`R.z ≥ 30`). One binder at a time, token held.
- Sisters keep 300–500 px, never enter melee, and yield by kneeling inside their own popped bubble
  (an allied Wise One shields them in CS5 — prisoners, not bodies).

**The approach and the break.** Clearing Z2a wave 1 drops Kenzie's **crown** pickup at the circle's edge
(it blew off; `s8crown`†, the ribbon system's `dropRibbon/collectRibbon` shape with kind `'crown'`).
Walking Riley into it — not pressing anything — starts CS4. Inside CS4 Callandor severs the link-weave
itself; no sister is struck by the blade. On `done` (watched, skipped, stalled or missing video — the
`playCall` contract), the kit sets `circleBroken = true`, yields any live sisters, despawns the ring
prop in a light-burst, and runs CS5 into the linked tutorial wave. If Riley dies during Z2b and
continues, he respawns already linked (the break is story state, never re-fought).

### 2.6 Linked Riley + Kenzie (Z2b → end): parity first, spectacle second

**Controls do not change at all.** Same `Input`, same `Riley` state machine, same `ATK` table
(`src/riley.js`: combo1/2/3, back, airkick, runkick, knee), same grab/hold/throw, same `special` cast,
same `power` balefire at full meter (`BALEFIRE.cost 100`), same `assist` call. A player who never looks
at the HUD can finish the stage on Stage 1 muscle memory. Everything below is additive output from
inputs that already exist — this is the only linked design that survives `src/input.js` being protected.

**Representation.** One actor (`scene.riley`) plus a **companion sprite** (`s8link`† combined sheet, §5):
Kenzie locked to Riley at offset (−facing·36, +6), chest-height, back/side to camera, both small hands
on his glove or coat-tail. She has **no HP, no hitbox, no `canBeHit`, no token, no separation** — she is
drawn, not simulated (the strike-sprite pattern from `src/stage6-lifecycle.js:startStrike`). Her pose is
derived from Riley's state each frame (`idle/walk/run` → skip-step to keep up; attacks → brace + point;
`cast` → both-hands-forward; `down/getup` → kneel beside him, hands up, shielding shimmer — she is never
shown struck). Facing flips with `Riley.face()`. On `rileyDied`/continue the companion persists; on stage
exit it is destroyed with the kit. The existing Riley atlas is untouched; Callandor's hilt prop is
removed at link (planted in the well stones, Z3 light).

**What changes (numbers; everything not listed is identical).**

| System | Unlinked | Linked | Why |
|---|---|---|---|
| Fireball (`special`, cost via `Powers.castCost()` 34 / angreal 17 / sa'angreal 0) | 1 ball (3 lanes under boost) | **Twin helix:** 2 balls spiralling on Riley's lane ±18 px, same total damage split 60/40, same cost, same cast frames | Reads as "two channelers, one cast" without doubling DPS or changing the button |
| Combo finisher (`combo3` active frames) | dmg 12, down | + **Kenzie lightning:** a 1-hop mini-bolt (`LIGHTNING` drawing, `src/powers.js`) to the nearest *other* enemy within 320 px, dmg 6, once per finisher (`counterUsed`-style latch) | Her Stage 6 lightning reveal, now aimed by his combo (CS5 line 2). Rewards finishing combos in a crowd |
| Saidin meter (`landedHit` +3/hit × `meterMul`) | ×1 (×1.6 angreal, ×2.2 sa'angreal) | **Braid meter:** ×1.5 base (boosts unchanged on top); meter bar draws pink-white braid over gold | Links *are* stronger in canon; faster balefire in the finale is fun and the boss is tuned for it (§2.7) |
| Balefire (`power`, full meter) | beam on Riley's lane | Beam +40% wider visual, same damage, same 1.5 s invuln; voice line swaps to a two-voice shout (Riley line + Kenzie wordless effort, §6.2) | Spectacle without a new super to balance |
| Grab/knee/throw | as shipped | Kenzie ducks behind Riley during `hold` (pose only); throw unchanged | She is never the grabber and never thrown |
| Hurt/down | as shipped | Damage unchanged. During `down`, her shimmer grants nothing — `inv` timings identical | No hidden difficulty drop; the fantasy is power, not protection |
| Aura / light | boost aura only | Permanent faint braid aura (reuses `Powers.makeAura` image at alpha 0.22, pink-gold) + 1 shared soft light (counts toward the ≤10 budget) | The link must be visible in every screenshot |

**Bot/fairness:** linked DPS vs a single target rises ~8% (finisher bolt only procs with a second enemy
present; twin helix splits the same damage). Lanfear's HP (§2.7) is tuned linked, and T12 asserts the
linked tutorial wave clears 9/9 with the *unmodified* Stage 7 bot inputs — proof of parity, not a claim.

### 2.7 Boss: Lanfear, Daughter of the Night (Z3)

- **Constants:** `LANFEAR`† in new `src/lanfear.js`†, on the painted-fighter boss pattern of
  `src/belal.js` / `src/asmodean.js` (`substeps`, `guard()` gates, `counterUsed`, `canBeHit`).
- **HP 720. Speed 96. Reach 170** (palm-weave blast). **Score 12,000** (finale; Be'lal/Asmodean are 8,000).
- **Phase gates `[0.66, 0.33]`**, the `RAND.gates` / `ASMODEAN.gates` values. No source — call-in,
  balefire, Taim wave, wolf charge — can cross or skip a gate (fuzz-tested, T9). In P3 every source
  clamps at 1 HP: *nothing* kills her. The doorway does.
- She never grabs, never summons Trollocs (there are none left to summon), and never targets Kenzie.
  Every attack tells ≥ 0.55 s. Shared 12 HP / 0.5 s damage cap with the Taim wave.

**P1: "The Veiled Crown" (100% → 66%). Mirrors and manners.**
- **Fireball volleys:** every 4.5 s, 3 fireballs along the 3 `VOLLEY_BANDS` at 380 px/s, one band always
  free for the volley's whole length (table-tested, the Asmodean free-band invariant). Tell: the struck
  bands kindle silver-white 0.70 s early. Dmg 9. Riley's twin helix cancels a volley ball head-on
  (projectile-vs-projectile, both die) — the duel starts here.
- **Mirror crowns (distinctive idea 4):** every 12 s Lanfear splits into 3 crowned Lanfears (the
  Myrddraal-split frame budget, `src/myrddraal.js` `FadeCopy`, without reusing its fear aura). Only the
  real one **casts a shadow** and only her crown is silver (copies wear gold *paper* crowns — her own
  vanity gives her away, and Kenzie's bark teaches it once, §6.2). Copies have 1 HP, deal 0 damage
  (their fireballs are illusions that gutter at 200 px), and shatter into moon-petals. Hitting a copy
  costs Riley nothing but time; ignoring them is legal. Split lasts ≤ 6 s.
- **Palm blast:** steps in, tell 0.55 s (sleeve flares silver), dmg 10, punishable recovery 0.7 s.

**P2: "Doors" (66% → 33%). The doorway fights back.**
- **Redstone slits:** every 5.0 s a doorway-edge line hazard crosses one band (Be'lal Netweaver-line
  geometry, `src/stage6-arena.js`): tell 1.0 s (a hairline doorframe of red light), then a slicing
  sheet 0.6 s, dmg 14. At most 1 live; always ≥ 1 band clear; never the Taim safe band in the same
  window (the kit arbitrates: if both want the field, the slit waits).
- **Doorstep blink:** Lanfear steps *sideways through* a half-open door to the opposite side of Riley
  (0.60 s shimmer tell at both ends; Fadelt blink timing, `FADELT.blinkT`). Cooldown 7 s. She always
  arrives facing Riley at 420–520 px — a reposition, never a jumpscare.
- **Adds once:** at the gate, Shaido remnants `[runner, bowman]` charge the ridge and the **wolf pack**
  answers (§2.3) — the two set pieces meet. Volleys continue at half rate.

**P3: "The Duel" (33% → 0). Fireball tennis for the crown.**
- **Duel volleys:** Lanfear takes the ridge centre and trades volleys at full rate, but now one ball per
  volley is **white-gold (returnable)**: striking it with any active attack frame within 90 px (the
  sour-note reflect, `src/stage7-notes.js:reflectNote`) sends it back at 640 px/s for **4% boss HP +
  0.9 s stagger**. Riley's own fireballs also work (projectile reflect, Stage 7 fireball-vs-note path).
  Kenzie's finisher bolt can return it too — the link's party trick, once per volley.
- **Crown channel:** every 9 s she raises the silver crown and **channels** (1.8 s cast bar, Asmodean
  numbers): interrupt with 3 hits, a throw, or a call-in → 1.4 s stun. Uninterrupted: a **moonfire ring**
  expands at 520 px/s for 0.5 s (jump it, `R.z ≥ 30`), dmg 16 + knockdown. Banner reuses the
  `CHANNEL_BANNER` slot discipline from `src/stage7-hud.js`.
- At 10% the doorway behind her **opens fully** (spill light + the snake-people silhouettes turn). This
  is the finale loading its gun; no mechanic changes.

**Defeat — the push (not a death).** At 0 HP (clamped 1 until the beat) Lanfear enters `finalePush`:
invulnerable, beat-locked, CS6-finale line 1 plays over live play while a **hold-to-push** prompt hangs:
the player **holds** `special` (already the fireball button; no new input) to feed the linked fireball
for a total of 2.0 s inside a 5.0 s window (hold, not mash — touch- and lag-friendly, the campaign
plan's clash rule). The fireball grows between Riley+Kenzie's hands; on success it launches and *pushes*
her 2.5 s through the doorway (lines 2–3). On a whiffed window nothing bad happens — she preens, the
prompt returns after 3 s. A finale must not be losable at the last input. Then `bossDown` runs the
**playable outro**: enemies cleared, hazards off, music to `clear`, Riley controllable walking right
while Kenzie performs the sassy walk dance (looping `s8kenzie` dance frames, §5) and lines 4–5 play;
reaching x 4900 (or 20 s) ends to **CAMPAIGN COMPLETE** → credits → title.

**Bot fairness (Stage 6–7 gates, restated):** call-ins-on boss time **70–102%** of call-ins-off;
campaign **9/9**; 250 ms lag bot **≥ 8/9**; freeze-frame tell check ≥ 9/10; the lag bot must complete
the hold-to-push ≥ 8/9.

---

## 3. Call-ins: Mat first, then Rand

### 3.1 How the call works

One `CALL` button, **one shared charge pool**, provider decided by story state — a pure function,
`provider8(kit) → 'mat' | 'rand'`† in new `src/mat-call.js`†, returning `'mat'` until `kit.randFree`
(CS5) and `'rand'` after. `callInFor(8)` returns `'matrand'` (T1) so no other stage's switch moves.
The switch grants **one fresh charge** and resets the per-phase count; total calls stay capped (below),
so the handover is generous without being farmable. Moiraine/Lan code (`src/moilan-call.js`,
`src/call7-cutscene.js`) is not imported by Stage 8 at all (T1 asserts it).

New pure module `src/mat-call.js`†, the same shape as `src/rand-call.js` / `src/moilan-call.js`:

```js
export const CALL8 = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 4, perPhase: 1,
  bossFrac: 0.06, humanFrac: 0.6, humanDown: 1.6, eliteFrac: 0.75, eliteDown: 2.0,
  inv: 2, stagger: 1, gates: Object.freeze([0.66, 0.33]),
  mat: Object.freeze({ sweepDmg: 44, diceDmg: 30, sweepTime: 1.1 }),
});
export function provider8(randFree) { return randFree ? 'rand' : 'mat'; }
```

- Charge rules (`createCall8`, `noteRileyKo8`, `tickCall8`, `canCall8`, `takeCall8`) copy the
  `rand-call.js` functions with `CALL8` swapped in. Do not attempt the `assist-rules.js` merge inside
  Stage 8 (engine plan E3 owns it).
- **Why `maxCalls` 4, not 3:** the stage has two providers and is ~50% longer. Typical clear: 2 Mat +
  2 Rand. Boss math: at most 1 call per Lanfear phase already held by Mat *or* earned by Rand — the
  fresh charge on switch cannot double-dip a phase (`phaseCalls` keyed by boss phase, shared pool).
- **Hooking is identical to Stages 6–7.** `src/stage8-lifecycle.js`† wraps `spawn`, `callLoial`,
  `onEnemyDie`, `update`, `rileyDied`, `continueGame`, `startBoss`, and restores them in `destroy()`
  (the `hook7` helper copied). Freeze via `kit.freezesWorld()`/`freezesRiley()` (Stage 7 T1 predicates)
  with `src/stage8-freeze.js`† copied from `src/stage7-freeze.js`.
- **Refusals spend nothing** and play Riley's wait line (2.5 s gap, as `riley_st6_rand_wait_01`):
  no hittable foe (`eligibleTargets` empty), balefire active, strike running, boss beat/invulnerable,
  victory pending, paused/cutscene. A call breaks any hold (`releaseHold('break')`) and grants Riley
  2.0 s `inv` on strike end.

### 3.2 What each helper does

| | **Mat** (Z0–Z2b, before breakout) | **Rand** (Z2b–Z3, after breakout) |
|---|---|---|
| Strike | Mat dashes the length of Riley's band spinning the ashandarei (1.1 s, world frozen). Seeded "luck" picks the *presentation*: high roll → **sweep** (spear arc); low roll → **dice scatter** (foxhead medallion flares, dice bounce down the band). Damage is identical either way — luck is costume, never power (determinism + fairness) | The Stage 6 strike, reused: Rand steps in at `camX+110`, fat-man angreal raised, ≤ 8 forked bolts + ≤ 4 fireballs staggered 0.08 s (`src/stage6-lifecycle.js:startStrike/stepStrike`, `allocateStrikes` in `src/rand-call.js`) |
| Shaido/sisters (humans) | 60% of current HP + down 1.6 s, never lethal; already under 20% HP → yields (Stage 7 Lan rule) | Same human rule (`RAND.humanFrac/humanDown`) |
| Elites (Stone Dog captain / sister with bubble up) | Bubble pops + 75% current HP + down 2.0 s, never lethal (the medallion *eats* the weave — Mat is the anti-sister call, which is why he leaves before Lanfear) | 75% current HP + down 2.0 s (Fadelt rule) |
| Lanfear | n/a (Mat has retired; if a saved charge is somehow spent in Z3 before CS5 state loads, it resolves as a Rand strike — provider is read at spend time) | **6% max HP, clamped at the next gate** (1 HP in P3), + 1.0 s stagger; clears live volley balls on screen (the Stage 7 duo clear, now Rand alone) |
| Riley | invulnerable 2 s | invulnerable 2 s |
| In-game time | 1.1 s | 2.0 s (Stage 6 timing) |
| FX (code-drawn first) | spear streak (`s8streak`†) / dice glints | `fx_lightning` strip + fireballs (already shipped) + `s6rand` sheet reused |

Mat's dice are the stage's joke with rules: the HUD portrait shows the last roll (pips), the caption
barks rotate (§6.2), and a test asserts sweep and dice deal *identical* damage to identical targets —
Jason gets Mat's luck as flavour, the bot gets determinism.

### 3.3 Charges and HUD

- Charges/recharge/per-phase as above: 1 charge, **10 Riley KOs and 45 s** to recharge, 4 calls/stage,
  1/boss phase. Wave KOs, wolf KOs and call-in KOs do not recharge (Riley's own only).
- HUD uses the existing call slot (`src/hud.js` ~177–181) repainted by `src/stage8-hud.js`† at 4 Hz, the
  `bindStage7Hud` pattern (`updateLoialLabel` wrap, set text only on change — `setColor` re-uploads):
  `MAT READY / MAT 6/10 / CALL WAIT ns` with `matPortrait`†, flipping to `RAND …` with the existing
  `randPortrait` after CS5. Help text: "CALL: Mat, then Rand". Shield pips (§1) draw as five 10 px
  diamonds under the slot; boss bar shows `LANFEAR` + `lanfearPortrait`†.
- Caption colours via the Stage 7 caption wrap: villain coral for `LANFEAR/SHAIDO/BLACK AJAH/WISE ONE`;
  **cracked gold `#d8b25a` for `LEWS THERIN`** (a voice, not a person present) and **parade black-red
  `#e07a5f` for `TAIM`** (an ally whose orders hurt — the colour must not read as "safe blue").
- Riley call barks: Mat era `riley_st8_call_01..02`; Rand era reuses Stage 6 `riley_st6_call_01..02`
  (already recorded, zero new bytes) plus one new first-Rand-call line (§6.2).

### 3.4 Cutscene playback (two bags, one blob)

New `src/call8-cutscene.js`† generalises `src/rand-call-cutscene.js` (Mat bag `rwb-call8-bag-mat`†,
Rand bag reuses `rwb-rand-bag` and clips R1–R3 unchanged from `assets/cutscenes/rand/` — no new Rand
bytes). One shuffle bag per provider in `sessionStorage`, no immediate repeat (`createBag` logic).
Prefetch: only the *current provider's* next clip as a single blob when the charge is ready; on the
CS5 flip the Mat blob is revoked and Rand's next clip fetched. Player: second `CutscenePlayer`
(`startMs 1500, stallMs 1500, maxMs 11000, guard 900`), music ducked to 0.35 (never `silence()`).
**The strike never waits on the clip** — stalled/missing/skipped all run the strike on time, with
Riley's call line already played on the press. Governor quality ≥ 4 drops the blob (`dropBlob` rule).

## 4. Video cutscenes: Flow first, Grok Imagine for the rest

### 4.1 Rules (unchanged from Stages 6–7, restated because they are hard rules)

- Photoreal clips, **5–10 s**, encoded **854×480, H.264 main, CRF 29, ≤ 160 KB/s**, `+faststart -g 24`,
  AAC 64k, via `tools/cutscenes/encode_callins.sh` (folder argument). Posters `.jpg` 640×360 ≈ 25 KB.
  Nothing is preloaded; one `<video playsinline>` element is reused and its `src` cleared after each
  clip (`src/cutscene.js:CutscenePlayer`), so the decoder surface never joins the texture peak.
- **Prompts never name characters, actors, shows or books.** Describe people by clothes, hair and props.
  Never write Rand, Mat, Taim, Lanfear, Perrin, Loial, Riley or Kenzie in a video prompt. (Painted-sheet
  prompts in §5 follow the Stage 5 house style and also describe rather than name where the generator
  requires it; the *file* may label poses, the prompt text may not lean on likenesses.)
- **Riley only from behind** in every frame (black long coat over sleeveless black top, short dark hair,
  fingerless gloves, black trousers/boots; blue glasses never visible from behind — if a take shows a
  glasses arm past profile, reject it). **The little girl's face is never shown**: back of head, long
  dark wavy hair, pink dress, gold paper crown; any frame turning her toward camera rejects the take.
- One action per generation; two-shot clips are two generations joined by a hard cut in ffmpeg (never ask
  the generator for the cut). Expect 2–3 generations per shot.
- **Tool split (addendum production note):** Google Flow ≈ 210 credits ≈ **10 clips** go to the shots
  that need consistent multi-person staging and camera moves (marked **FLOW**); Grok Imagine takes the
  single-action inserts and call-in variants (marked **GROK**), where its 6 s/10 s generations and
  reference mode already proved out on Stages 6–7. If Flow credits run short, cut in this order:
  V9 → M-bag 3rd clip → V4 (each has a panel/in-engine fallback). Never cut V1, V6 or V8.
- Story clips play through `installCutscenes:playFor` (`STAGE_CLIPS[8]`, once per session, `createSeen`);
  event clips (circle break, finale push) through `playSceneVideo` (`src/cutscene-scene.js`) with the
  painted-panel fallback on failure, exactly as the Twix video falls back to panels
  (`src/twix-video.js:startTwix`). Call clips play through §3.4. In every path, gameplay state applies
  on `done` regardless of `how`.

### 4.2 Clip list (10 Flow + 7 Grok; lengths are shipped trims)

| id | Tool | Plays | Shot (descriptive; full prompt discipline in §4.3) | Length |
|---|---|---|---|---|
| V1 | **FLOW** | Stage intro (`STAGE_CLIPS[8]`) | Dawn grassland, three stone wells, a wagon circle; on one wagon a man-sized wooden chest **thumps once** from inside. Camera drifts in. No people close | 8–10 s |
| V2 | **FLOW** | CS-Box opening (over story panel 3) | Near-black inside wooden slats; light strobes through cracks in rhythm with straining breath; wood bows outward. Sound-led; almost abstract (cheapest great-looking clip in the set) | 6–8 s |
| V3 | **FLOW** | CS1 first wave | Behind the black-coated boy on a ridge: a line of black-coated men raise their hands together; far below, the earth rolls in a tumbling ring through dust and fire | 7–9 s |
| V4 | **FLOW** | Z1 wolf charge | Low in tall grass behind the boy: five wolves and one huge grey wolf burst past camera toward veiled spearmen who scatter | 6–8 s |
| V5 | **FLOW** | CS2 Mat joins | Behind the boy: a laughing young man in a wide-brimmed hat vaults a wagon tongue spinning a bladed spear, lands, tips the hat | 6–8 s |
| V6 | **FLOW** | CS4 circle break | Behind the boy: thirteen hooded women hand-in-hand in a ring of light around a small pink-dressed girl seen from behind; the boy draws a crystal sword and cuts *upward* through the light; the ring bursts like snapped harp strings | 8–10 s |
| V7 | **FLOW** | CS5 link + breakout (two-shot hard cut) | A: close on small hands gripping a gloved hand, pink-white light braiding into gold. B: wide — the chest on the ridge explodes open and a ragged red-gold-haired man stands up out of it | 8–10 s |
| V8 | **FLOW** | Finale push (over `finalePush`) | Behind the boy and girl, hands joined: a huge fireball shoves a silver-crowned woman in a white gown backward through a free-standing red stone doorway into a bright marble hall; the door slams | 8–10 s |
| V9 | **FLOW** | Outro dance (optional capstone; in-engine dance is the fallback and the default if credits die) | Golden field at dusk, behind the walking boy: the little girl in the pink dress and paper crown struts, spins once, plants her hands on her hips — all from behind | 6–8 s |
| V10 | **FLOW** | Boss intro wipe (2 s insert inside CS6-open) | A red stone doorway standing alone on a ridge at dusk; its dark opening ripples like hot air; tall sinuous shadows pass far inside | 5–6 s |
| M1 | GROK | Mat call bag | Behind the boy: the hatted man sprints through frame spinning the bladed spear in a glittering arc past veiled spearmen | 5–7 s |
| M2 | GROK | Mat call bag | Close: dice tumble from the hatted man's hand across a wagon bed and come up all sixes; he grins (boy from behind, out of focus) | 5–6 s |
| M3 | GROK | Mat call bag | Behind the boy: the hatted man's fox-head medallion flares and a blue bubble of light around a hooded woman pops like soap | 5–7 s |
| R-reuse | — | Rand call bag | **No new clips.** R1–R3 from `assets/cutscenes/rand/` unchanged (`RAND_CLIPS`), bag `rwb-rand-bag` | — |
| G1 | GROK | Z0 gateway insert (first Taim telegraph, once) | Vertical slits of light open on a ridge at dawn; black-coated men step out in a line, dust blowing | 5–7 s |
| G2 | GROK | P2 doorway sting (first slit, once) | A hairline red doorway opens in empty air on a battlefield, light slicing out, then snaps shut | 5–6 s |
| G3 | GROK | Credits backdrop loop (muted, under scroll) | Slow push over three quiet stone wells at sunset, grass moving, one crystal sword planted in stone still glowing | 8–10 s |

Poster `.jpg` for every shipped `.mp4`. `CALL8_PRESENT`† / `STAGE_CLIPS[8]` stay empty until frame
review passes; missing clips mean the strike/panel runs with no stall (tested with a stubbed player).

### 4.3 Example prompts (fill the template per clip; note what is *not* in them)

> **V6 (Flow).** Photoreal cinematic shot, 16:9. Camera behind a muscular 16-year-old boy seen **only
> from behind**: short dark hair, sleeveless black long coat, black fingerless gloves. Before him,
> thirteen hooded women stand hand-in-hand in a glowing ring around a small girl seen **only from
> behind**: long dark wavy hair, pink dance dress, small gold paper crown. The boy draws a sword made
> of clear crystal and cuts upward through the light of the ring; strands of light snap like harp
> strings. Stone wells, dusk. **Neither child ever turns around; no child's face is ever visible.**
> No text, no logos, no gore.
>
> **V3 (Flow).** Photoreal cinematic wide shot, 16:9, camera behind the same black-coated boy on a
> grassy ridge at dawn. Below, a ranked line of men in black coats raise both hands together; a
> tumbling ridge of earth and fire rolls across the plain through dust. Distant veiled spearmen scatter.
> **The boy never turns around.** No text, no logos, no gore.
>
> **M1 (Grok).** Photoreal cinematic shot, 6 seconds. Camera behind a black-coated teenage boy, **back
> only**. A laughing young man in a wide-brimmed hat and long coat sprints past him spinning a
> spear with a curved blade, in one glittering arc. Grassland battlefield, late gold light. No text,
> no logos, no gore.
>
> **V8 girl-safe variant note.** If Flow keeps turning the girl, restage to hands-only: *extreme close
> on a small girl's hands (pink sleeve cuffs) gripping a black-gloved hand, firelight growing between
> them* for shot A, keeping the wide push (shot B) with both children as backlit silhouettes. Hands
> cannot fail the face rule.

### 4.4 Byte budget

| Line in `tools/audit-stage1.mjs` | Folder | Budget | Expected |
|---|---|---|---|
| `cutscenes.callIns8`† (new `walkBytes` line) | `assets/cutscenes/call8/`† (M1–M3 + posters) | **5,000,000** | 3 × ≈1.1 MB + posters ≈ 3.4 MB |
| `cutscenes.stage8`† (new) | `assets/cutscenes/stage8/`† (V1–V10, G1–G3 + posters) | **18,000,000** | 13 clips ≈ 1.2 MB avg ≈ 15.5 MB |

The top-level `clips` line reads only `assets/cutscenes/` non-recursively, so each subfolder needs its
own line or it is silently unbudgeted (Stages 6–7 lesson). Clips stream on demand and sit **outside**
the 25 MB pre-fight gate. At most one call blob + one story clip are ever resident; story blobs release
on clip end. The finale's larger `stage8` line (vs Stage 7's 2 MB intro line) is deliberate and must be
called out in the T17 PR: it is download-once video, not pre-fight weight, and every clip is skippable
and individually fallible.

## 5. Art asset list — the best art in the game, on the Stage 7 budget discipline

### 5.1 Rules

- Painted sheets go through `tools/stage7/process_art.py` copied to `tools/stage8/process_art.py`†
  (`JOBS` kinds: `poses`, `props`, `bands`, `image`, `panels`). Outputs:
  `assets/stage8/ART_STATUS.json`† and generated `src/stage8-painted.js`† (key → url, present).
- **Every key has a code-drawn fallback** in `src/stage8-paint.js`† (`paintStage8Art`, the
  `paintStage7Art` pattern). The stage must be playable start-to-credits with zero painted files
  present. That is how T3–T12 land before the art does. Sources kept verbatim in `art-in/stage8/`†.
- **No normal maps on painted art.** Drawn 1:1 via `meta.drawScale`; feet at 0.96 of cell; one scale per
  character (idle head-to-feet), shelf-packed JSON-hash atlases with frames `"0".."n"` in the runtime
  state order (`src/stage8-frames.js`† mirrors `src/stage7-frames.js`).
- **Palette:** Dumai gold dust `#caa46a`, well-stone grey `#7d7f78`, Asha'man black `#14161c` with
  sword-silver `#c9d2e0` and dragon-gold `#d8a53a` pins, Shaido cadin'sor `#8a7a5e` with red veil band
  `#a33a2a`, Kenzie pink `#f2a7c3` with paper-crown gold `#e8c25a`, linked braid pink-gold `#ffd9a8`,
  Lanfear moon-white `#eef1f8` / silver `#b9c2d4` (no violet-pink on any magenta-key sheet), redstone
  `#9a3f36`, Taim-wave ember `#ff8a3a` vs safe-band blue `#6fc3ff`.
- **"Best art" is spent where the camera lingers,** not spread thin: (a) the linked Riley+Kenzie sheet
  and Lanfear get `RES 1.25` retina processing (the processor's `--res` flag, ~1.56× decoded cost,
  budgeted in §5.3); (b) backdrops get a second parallax *mid-silhouette* strip (gateway ridge, wagon
  rooflines) drawn into the existing plates rather than new textures; (c) every other sheet stays at
  Stage 7 resolution and caps. Ambition without a budget line is a red texture dump.

**Master sheet prompt (prepend to every pose prompt in §5.2; one new chat per sheet, house style from
`docs/stage5/BOSS_ART_PROMPTS.md` + `docs/stage6/ART.md`):**

> Create ONE landscape image in 3:2 format: a character pose sheet for a 2D side-scrolling beat-'em-up.
> Background: perfectly flat solid magenta #FF00FF, no gradient, floor, shadow or texture. Draw the SAME
> character exactly N times, full body, in two rows, evenly spaced with wide magenta gaps; nothing
> touches a neighbour or the edge; all figures at exactly the same scale, feet on one invisible line per
> row; every pose faces RIGHT (side or slight three-quarter). No text, numbers, borders or grid lines.
> STYLE: hand-drawn HD 2D fighting-game sprite art in the spirit of Streets of Rage 4 — confident
> near-black ink (thicker outside, thinner inside), clean cel shading, 2–3 tone steps with subtle
> painterly gradients, soft key light upper-left, faint cool rim right. Not pixel art, not 3D, not
> photoreal, not chibi. No blood, wounds or defeated bodies; defeated poses kneel or sit. Keep every
> glow inside the figure's outline: no halos, beams, sparks or effects on the background.
> Colour rule for magenta sheets: absolutely no purple, violet, pink or magenta on the character
> (**exception: the little girl's dress sheet is generated on flat GREEN #00FF00 instead**, §5.2).

After generation, check by eye before processing (Stage 5 checklist): exact pose count and order, all
facing right, nothing touching, no key-colour on the figure, weapons attached to hands, and — for the
boy/girl sheets — **no face visible in any pose** (re-roll the whole sheet; never patch one figure,
which breaks the single-scale rule). Guardrail wording that has worked since Stage 3: "raises his hand
and lightning crackles", "monsters flee"; never "strikes/kills/bodies".

### 5.2 Per-sheet prompts (character + poses; master block above supplies layout/style)

1. **`s8randbox`† — the chest and the man getting out of it (2 rows: object + figure).** *Object:* a
   man-sized iron-bound travelling chest, lid chained, wood bowed outward, in 3 states (closed,
   straining with light at the seams, burst open with split boards). *Figure:* a tall young man, early
   twenties, red-gold hair, grey eyes, ragged dark-red coat with gold embroidery torn at the shoulder:
   (1) curled in darkness gripping the lid from inside (drawn as if the chest wall were cut away),
   (2) shoving the lid up, teeth gritted, (3) standing out of the wreckage swaying, hand raised warding
   off light, (4) standing steady, small dark-green seated figurine raised in his fist. The cutaway pose
   is for story panel 3 only; gameplay uses poses 3–4 (background breakout + call strike reuses
   `s6rand`). Original face; prompt never names him.
2. **Lews Therin presence — deliberately almost nothing (distinctive idea 5).** No body sheet. One prop:
   `s8lews`†, a cracked-gold whisper sigil (a thorned sun disc, 3 pulse states) drawn over the chest in
   box interludes, plus the caption colour (§3.3). A voice in a head must not become a second man in a
   box; the art budget saved here pays for the linked sheet. Prompt (props sheet, magenta): *"three
   small emblems of a cracked golden sun with thorn rays, flat game-icon style, increasing in brightness,
   no text."*
3. **`s8taim`† — the M'Hael (6 poses).** A hard-faced man in his thirties, dark hooked nose, black
   Asha'man coat with silver sword and gold dragon pins at the collar, commanding stillness: stand,
   hand raised (telegraph), hand dropping (the order), pointing, arms folded watching, turning away
   through a light-slit (exit). On-screen idle ~230 px. He is a background/ridge figure and HUD
   portrait source, never a fighter — the sheet is small on purpose.
4. **`s8mat`† — the gambler (10 poses).** A lanky laughing young man, wide-brimmed hat, long coat,
   fox-head medallion, a spear with a curved blade and ravens on the shaft: idle lean on spear, run ×3,
   spin-sweep ×2, dice toss, hat-tip, vault, hurt/laugh. Portrait from idle head. Used for the strike
   actor and CS2 tableau.
5. **Shaido set (4 sheets, cadin'sor grey-brown, red veil bands; all yield kneeling).**
   `s8spearman`† (10: idle, walk ×3, thrust tell/thrust, hurt, down, kneel-yield, getup);
   `s8runner`† (12: idle, circle-run ×4, veil-up tell, cartwheel ×2, lunge, hurt, down, yield);
   `s8stonedog`† (10: idle behind a tall hide shield, advance ×3, shield-plant tell, bash, guard-clang,
   guard-break dazed with stars, hurt, yield); `s8bowman`† (10: idle, walk ×3, draw tell ×2, loose,
   hurt, down, yield). Prompt each as *"a desert warrior in grey-brown cadin'sor with a red headband;
   face veiled below the eyes in fighting poses, veil down and head bowed in the kneeling pose"* plus
   the weapon above. Veiled faces keep the set fast to paint and impossible to likeness-fail.
6. **`s8wise`† — Shaido Wise One (8 poses).** A stern older woman, shawl and brow-band, hands that glow
   ember-orange *inside* the silhouette only: idle, walk ×2, fire-lance cast ×2, earth-spike cast,
   hurt, yield (hands raised empty). Prompt wording: "chanting, palms glowing" (safe phrasing).
7. **Allied cast (3 sheets + reuse).** `s8perrin`† (8: a broad young blacksmith, golden eyes, axe in
   hand, hammer at belt: idle, run ×2, axe sweep ×2, howl-call with head back, hurt, kneel);
   `s8asha`† Asha'man line (6: black-coated men of mixed ages with collar pins: stand, hands-raised
   telegraph ×2 in unison-able poses, cast, dive-flat, stand) — drawn as *one* figure per pose and
   instanced 5× along the ridge with tint/scale jitter; `s8wolves`† (8: five-strong pack run cycle as
   separate single-wolf poses — run ×4, leap, skitter-stop, howl sitting — plus one much larger grey
   lead wolf idle/run at 1.6× cell). Loial reuses the `loial` atlas (no new sheet); Maidens reuse
   `s7dancer` as background loops; Two Rivers men are painted **into** the Z0/Z1 plates (no sheet).
8. **`s8sister`† + `s8circle`† — Black Ajah.** Sister (10: a composed woman in a dark shawl with a
   serpent ring: idle inside a faint blue bubble outline, glide-walk ×2, bind-cast ×2, bubble-pop flinch,
   re-weave, hurt, kneel-yield inside bubble, down). Circle prop (single wide image, green key for the
   pink centre): *"thirteen hooded women hand-in-hand in a ring seen from the side, outer two-thirds of
   the ring only, faces shadowed under hoods; in the centre, seen only from behind, a small girl with
   long dark wavy hair in a pink dress and gold paper crown, sitting hugging her knees."* Drawn as one
   prop at the middle well; the 3 real sisters stand in its gaps (§2.5).
9. **`s8lanfear`† — the final boss (18 poses, RES 1.25, the flagship sheet).** A breathtakingly composed
   adult woman, black hair, moon-white gown with **fitted silver-worked sleeves** (addendum), silver
   crown: idle (adjusting crown), glide-walk ×3, volley cast ×3 (one hand, both hands, white-gold ball
   cradled), palm-blast tell/blast, mirror-split veil pose, doorstep half-turn, crown-channel (crown
   raised in both hands), hurt (offended more than pained), stagger (crown askew), proclamation (arms
   wide — CS6 line 1), skidding backward arms windmilling (finale push — dignified fury, never slapstick
   until the doorway), bound/defeat *not needed* (she exits through the door). Colour rule: silver-white
   only; absolutely no violet/pink on the magenta sheet. Mirror copies reuse this sheet tinted pale with
   paper-crown props (`s8papercrown`†) swapped onto the head anchor — no second character sheet.
10. **`s8kenzie`† + `s8link`† — the little sister and the combined linked set (GREEN key, RES 1.25).**
    Two cooperating sheets. `s8kenzie` (solo, 12 poses, **every pose from behind or strict side-back
    three-quarter with hair covering the face** — prompt must repeat this per pose): a girl of about
    eight, long dark wavy hair to mid-back, pink recital dress with sash, gold paper crown: sitting
    hugging knees (circle), standing reaching up, skip-step run ×3, hands-forward sparkle cast ×2,
    kneeling shield-hands, **sassy walk dance ×4** (strut, crown-straighten with both hands, spin with
    hair flare, hands-on-hips chin-up — all back/side readable). `s8link` (companion overlays aligned
    to Riley's states, 14 cells): the same girl scaled/anchored to draw at Riley's offset (§2.6):
    clinging to coat-tail (idle/walk/run variants ×3), braced point (attacks), both-hands-on-his-glove
    (cast), lightning point (finisher), duck-behind (hold), kneel-shield (down), held-hands fireball
    charge ×2 (finale push), dance-walk ×3 (outro, shared with `s8kenzie` cycle). Prompt both from the
    written description only; **attach no photograph and no prior Riley art**. Riley himself is not in
    either sheet (his atlas draws him); alignment is by the processor's foot/anchor maths, verified on
    contact sheets with a Riley silhouette underlay in `--debug` output only.
11. **Props/FX sheets (green key where pink/gold appears, else magenta).** `s8chest`† (see sheet 1);
    `s8door`† redstone doorway (4 states: closed frame, ajar with heat shimmer, open on a bright marble
    hall, slamming — the hall is painted *inside* the frame so no second backdrop is needed; tall
    sinuous silhouettes only in the open state, distant and non-graphic); `s8roller`† tumbling earth
    ridge (4 tumble cells) + `s8firesheet`† flame wall (3 cells, additive-friendly, no violet);
    `s8callandor`† (crystal sword: sheathed hilt-over-shoulder prop, drawn full sword ×2 glow states,
    planted in stone — reuse the `s6call` drawing language at higher res); `s8bubble`†/`s8bind`† (blue
    weave bubble 2 states, pale bind ribbon); `s8crown`† (paper crown pickup + silver crown prop ×2);
    `s8well`† (well-rim ring decal ×2: idle pale ring, shelter flash); `s8dice`† (dice glints ×3);
    `s8streak`† (spear/slit streaks); `s8crate`†/`s8planks`† (supply chest + debris);
    `s8ribbon8`† is **not** made (no ribbon this stage, §2.1). UI: `matPortrait`†, `taimPortrait`†,
    `lanfearPortrait`†, `crownIcon`† (clear-card), shield-pip diamonds drawn in code (no texture).
    Callandor FX are the drawn sword + existing `glow`/`core` particles + 1 light; no bespoke shader.

### 5.3 List, counts and decoded budgets

Decoded size = w × h × 4. Estimates scale from measured Stage 6/7 sheets (`s6belal` 1871×283 = 2.02 MiB,
`s7asmo` cap 2.10 MiB, dancers ~1.2 MiB, each 1024×464 plate 1.81 MiB).

| Key | Kind | Cells / size cap | Decoded cap | File cap | Resident when |
|---|---|---|---|---|---|
| `s8spearman`† | poses | ~10, ≤1280×256 | 1.25 MiB | 60 KB | Z0–Z3 adds |
| `s8runner`† | poses | ~12, ≤1280×256 | 1.25 MiB | 60 KB | Z0–Z3 |
| `s8stonedog`† | poses | ~10, ≤1280×288 | 1.40 MiB | 70 KB | Z0–Z2 |
| `s8bowman`† | poses | ~10, ≤1152×256 | 1.15 MiB | 55 KB | Z0–Z3 |
| `s8wise`† | poses | ~8, ≤1024×256 | 1.00 MiB | 50 KB | Z1–Z2 |
| `s8sister`† | poses | ~10, ≤1280×272 | 1.30 MiB | 65 KB | Z2 (deferred) |
| `s8lanfear`† (RES 1.25) | poses | ~18, ≤2400×360 | 3.30 MiB | 170 KB | Z3 only (deferred) |
| `s8kenzie`† (RES 1.25) | poses | ~12, ≤1600×320 | 1.95 MiB | 100 KB | Z2b–outro (deferred) |
| `s8link`† (RES 1.25) | poses | ~14, ≤1792×320 | 2.20 MiB | 115 KB | linked only (deferred) |
| `s8mat`† | poses | ~10, ≤1280×272 | 1.30 MiB | 65 KB | on call / CS2 (deferred) |
| `s8perrin`† | poses | ~8, ≤1024×272 | 1.05 MiB | 55 KB | Z0–Z1, outro |
| `s8asha`† | poses | ~6, ≤896×272 | 0.95 MiB | 50 KB | background, all zones |
| `s8wolves`† | poses | ~8, ≤1536×192 | 1.15 MiB | 60 KB | charges only (deferred) |
| `s8taim`† | poses | ~6, ≤896×272 | 0.95 MiB | 50 KB | ridge, all zones (small draw) |
| `s8randbox`† | poses+object | ~7, ≤1536×320 | 1.85 MiB | 95 KB | story/Z1 prop/CS5 |
| `s6rand` (reuse) | poses | Stage 6 file | 0.69 MiB | (exists) | Rand strike |
| `s7dancer` (reuse) | poses | Stage 7 file | 1.25 MiB | (exists) | Maiden loops Z0/Z2 |
| Portraits ×4 (`mat/taim/lanfear`† + `randPortrait` reuse) | image | 136×136 ea | 0.28 MiB (new) | 4 KB ea | always (new 3) |
| Props/FX bundle (`s8door`† 0.90, `s8circle`† 0.85, `s8roller`† 0.38, `s8firesheet`† 0.38, `s8callandor`† 0.40, `s8bubble/bind/crown/well/dice/streak/crate/planks/lews`† ≤ 0.90 total) | props/bands | mixed | **≤ 3.81 MiB** | ≤ 190 KB | by zone (deferred in part) |
| **Painted resident peak (Z3: Lanfear + link + kenzie + runner/bowman adds + door + Rand strike sheet)** | | | **≈ 12.5 MiB, cap 14.0** | | |

**Backgrounds** (`assets/bg8/`†, streamed via `STREAMS[8]`†; only current + next resident):

| Key | Content | Size | Decoded | File cap |
|---|---|---|---|---|
| `bg8far`† | Wells grassland horizon, gateway ridge, dawn→dusk tint in code | 1024×464 | 1.81 MiB | 95 KB jpg |
| `bg8mid`† | Grass hills + Asha'man ridge silhouettes | 1024×464 | 1.81 MiB | 125 KB webp |
| `bg8mid2`† | Wagon circle (chest wagon readable at right) | 1024×464 | 1.81 MiB | 130 KB |
| `bg8mid3`† | Well copse, three wells, circle clearing | 1024×464 | 1.81 MiB | 130 KB |
| `bg8mid4`† | Ridge arena: doorway stance stones, chest wreck below | 1024×464 | 1.81 MiB | 135 KB |
| `bg8floor`† / `floor2`† / `floor3`† | Grass/dust, wagon-rutted earth, scorched ridge stone | 1080×360 ×2, 1280×180 | 1.48+1.48+0.88 | 130/120/85 KB |

Streaming peak ≈ far + 2 plates + 2 floors ≈ **8.4 MiB** (Stage 7 figure). **Story panels**
`story8p1..3`† (1280×720 jpg ≤ 220 KB, 3.52 MiB decoded each) resident only during the story card and
released before Z0 wave 0 (`freeStory8`†, verified by texture dump, T2): P1 the wells + wagon circle
from the hills (Riley from behind, Callandor hilt on his back); P2 the Chest on its wagon by lantern
light, a sister's hand recoiling as it thumps; P3 cutaway-dark slats with light strobing (the box from
inside; no face) *or*, if V2 ships, the circle at the middle well seen from behind Riley.

**Counts.** New painted texture keys: **15 character/figure sheets + 3 portraits + ~14 prop/FX keys +
8 background keys + 3 panels = 43 keys** (≈ 58 files with atlases/posters). Reused finished keys:
`s6rand`, `randPortrait`, `s7dancer`, shared powers/HUD/FX. **Stage 8 painted+background disk ≈ 2.2 MB**
(Stage 7: ~1.7 MB; the finale is bigger and the line must say so): budget `stage8.art`† = **7,000,000**
bytes via `walkBytes('assets/stage8') + walkBytes('assets/bg8')` (§7.3). Painted GPU cap **14.0 MiB**
resident (Stage 7: 12.0) — funded by the atlas cut in §2.2, *not* by raising the 105 MiB boss-peak gate.

---

## 6. Audio: voices, Suno music, SFX

### 6.1 Voices and pipeline (all reused; two new designs + one careful child voice)

- **Riley:** ElevenLabs `eleven_v4`, voice "DYLO - Dark Anime Hero" (`JjsQrIrIBD6TZ656NQfi`) via
  `tools/riley_voice.py`; append takes to `assets/audio/riley-voice-manifest.json`. Processing as shipped:
  trim, highpass 70 Hz, loudnorm I=-17.5 TP=-2, mono 24 kHz 64 kbps (56 kbps for long lines). At most one
  short emotion tag per prompt; captions keep canonical spelling.
- **Narrator:** Jason's consented CosyVoice 3 clone (`Fun-CosyVoice3-0.5B`, existing 26 s reference)
  through `tools/jason-narrator/` (`narrator-lines.json`, `LINES.md`). Output −16…−18 LUFS, mono 24 kHz
  96 kbps. Whisper `medium.en` must transcribe to script (re-roll ≤ 5 seeds). Jason confirms
  pronunciations by ear before T14 closes.
- **Rand / Lews Therin:** Rand's existing ElevenLabs Voice Design ("Rand al'Thor (RWB)"). Lews Therin is
  the **same voice, second design pass**: *"the same young man's voice aged and dried out, urgent,
  interrupting himself, grandeur curdled into grief — never a demon voice."* Same throat, wrong century.
  Record both designs' ids in `tools/stage8/voice-render.json`† (copy of the Stage 6/7 format).
- **Mat (new design):** *"Quick, laughing young man, rural lilt, always half a joke ahead of trouble;
  warm under the complaints."* **Taim (new design):** *"Commanding baritone, clipped parade-ground
  diction, contempt held on a tight rein."* **Lanfear (new design):** *"Beautiful, unhurried alto, silk
  over absolute certainty; fury arrives as cold precision, never shrill — until the doorway."*
  **Perrin (new design, 3 lines only):** *"Quiet, heavy young blacksmith; few words, each one weighed."*
  **Sister (1 design, reused for both sister lines, pitch-shifted ±3%):** *"Composed, precise woman;
  serenity as a weapon."* Shaido/Wise Ones: no speech, SFX shouts only (line-count discipline).
- **Kenzie (read carefully).** No recording of any real child, no clone, no photo-derived anything.
  Use the established **synthetic Twinkle Toes Kokoro blend** from `assets/audio/VOICE_PROVENANCE.md`
  (75% `af_bella` + 25% `af_heart`, speed 1.08, pitch 1.14, Apache-2.0, already audition-approved for
  this character), rendered locally. She has **5 short lines** (§6.2), all exclamations/questions an
  adult stock voice at that pitch handles without uncanny child-imitation. Jason approves every take by
  ear; any take he dislikes ships as caption-only (the `setVoiceFiles` contract makes that free).
- **Pronunciation hints** (phonetic in TTS text only, never captions): Dumai's Wells = doo-MYZE WELZ;
  Asha'man = ah-shah-MAHN; Mazrim Taim = MAHZ-rim TAME (confirm by ear; audiobooks vary); Lanfear =
  LAN-feer; Lews Therin = LOOZ THAIR-in; Callandor = KAL-an-dor; ashandarei = ah-SHAHN-dah-rye;
  Aiel = eye-EEL; Shaido = SHY-doh; Kenzie = KEN-zee; Bubby = BUB-ee.
- Registration copies `src/stage7-voice.js`: `LINES`† map, `registerLines`, `setVoiceFiles(STAGE8_VOICES,
  VOICE_FILES)` with `src/stage8-voice-files.js`† listing on-disk ids, `stage8Say()`† wrapper. **Missing
  mp3 = caption only, no fetch.** Manifest: `assets/audio/stage8-voice-manifest.json`† (`present` list,
  Stage 6 pattern); `tests/stage8-audio` fails if `present` and disk disagree.

### 6.2 Line list (36 new ids; all `st8_` / `riley_st8_`)

Budget: **36 × 200 KB = 7,372,800** (`stage8.voices`†). The finale carries more speakers than any prior
stage; the line is bigger than Stage 6/7's 24-line line and the T14 PR must say so plainly. Reused at
zero bytes: `riley_st6_call_01..02`, `rand_call_01..05` (Rand barks), Stage 6 narrator takes untouched.

| id | Who | Voice | Line (caption verbatim; §1.3 has delivery) | When |
|---|---|---|---|---|
| `st8_story_01` | NARRATOR | Jason clone | CS0-1 | story |
| `st8_story_02` | NARRATOR | Jason clone | CS0-2 | story |
| `riley_st8_story_01` | RILEY | DYLO | "That's her crown. That's Kenzie." | story |
| `st8_story_03` | PERRIN | design | CS0-4 | story |
| `riley_st8_story_02` | RILEY | DYLO | CS0-5 | story |
| `st8_story_04` | NARRATOR | Jason clone | CS0-6 | story |
| `st8_box_01` | LEWS THERIN | Rand design B | CS-Box open 1 | box opening |
| `st8_box_02` | RAND | Rand design | CS-Box open 2 | box opening |
| `st8_box_03` | LEWS THERIN | design B | CS-Box open 3 | box opening |
| `st8_box_04` | RAND | Rand design | CS-Box open 4 | box opening |
| `st8_box_05` | LEWS THERIN | design B | Pip 2 | Z1 clear |
| `st8_box_06` | RAND | Rand design | Pip 3 | first wave survived |
| `st8_box_07` | LEWS THERIN | design B | Pip 4 | Z2 wave 0 clear |
| `st8_box_08` | RAND | Rand design | "Now." | circle approach |
| `st8_taim_kill_01` | TAIM | design | "Asha'man… kill!" | every wave telegraph (one take; ±3% pitch vary in code via playbackRate? No — one take, vary nothing; an order sounds the same every time, that is the point) |
| `riley_st8_wave_01` | RILEY | DYLO | CS1 Riley | first wave only |
| `st8_mat_join_01` | MAT | design | CS2-1 | Z0 clear |
| `st8_mat_join_02` | MAT | design | CS2-3 | Z0 clear |
| `riley_st8_call_01` | RILEY | DYLO | "Mat! Your luck!" | Mat call |
| `riley_st8_call_02` | RILEY | DYLO | "Dice time!" | Mat call (rotates) |
| `st8_mat_call_01` | MAT | design | "Time to roll the dice!" | Mat strike |
| `st8_mat_call_02` | MAT | design | "Snake eyes for *them*!" | Mat strike (rotates) |
| `riley_st8_wait_01` | RILEY | DYLO | "Not yet — he needs a breath." | call refusal (both eras) |
| `st8_sister_01` | BLACK AJAH SISTER | design | CS3 circle warning | Z2 approach |
| `riley_st8_crown_01` | RILEY | DYLO | CS3 Riley | Z2 approach |
| `st8_sister_02` | BLACK AJAH SISTER | design | CS4-1 | circle cutscene |
| `riley_st8_break_01` | RILEY | DYLO | CS4-4 | circle cutscene |
| `st8_kenzie_01` | KENZIE | Kokoro blend | "BUBBY!" | CS4 end |
| `st8_kenzie_02` | KENZIE | Kokoro blend | CS5-1 | link |
| `riley_st8_link_01` | RILEY | DYLO | CS5-2 | link |
| `st8_rand_free_01` | RAND | Rand design | CS5-4 | breakout |
| `riley_st8_rand_01` | RILEY | DYLO | CS5-5 | breakout |
| `st8_kenzie_03` | KENZIE | Kokoro blend | "Silver hat's the real one!" | first mirror split (teaches §2.7) |
| `st8_lanfear_intro_01` | LANFEAR | design | CS6-open 1 (`boss.introVoice`) | boss intro |
| `st8_lanfear_p2_01` | LANFEAR | design | "Doors, child. I have had *centuries* of doors." | P2 gate |
| `st8_lanfear_p3_01` | LANFEAR | design | "Very well. Fire, then. I invented burning beautifully." | P3 gate |
| `st8_lanfear_hurt_01` | LANFEAR | design | "My *crown* —!" | first reflected ball |
| `st8_kenzie_04` | KENZIE | Kokoro blend | "Push, Bubby, PUSH!" | `finalePush` prompt |
| `st8_lanfear_finale_01` | LANFEAR | design | **"I am the queen of love and beauty!"** (exact) | finale 1 |
| `st8_lanfear_finale_02` | LANFEAR | design | **"Not again! Not the snake people! Ahhhhhhh!"** (exact) | finale 3 |
| `st8_kenzie_05` | KENZIE | Kokoro blend | **"Bubby you saved me! But what took you so long?"** (exact) | outro |
| `riley_st8_finale_01` | RILEY | DYLO | **"Too many snack breaks."** (exact) | outro |

That is **42 rows** — six over the 36 budget. Cut before recording, in this order, to land at 36:
`st8_box_05`, `st8_box_07` (Lews interludes become text-only captions with the sigil pulse — arguably
scarier), `st8_mat_call_02`, `riley_st8_call_02`, `st8_lanfear_hurt_01`, `st8_story_03` (Perrin's story
line becomes caption-only; his two gameplay barks are SFX howls, not lines). The cut list is part of the
plan so T14 does not improvise it. Whisper-check every kept line; loudness per §6.1.

### 6.3 Music: two brand-new Suno tracks (feel reference only — read this first)

**Legal/creative firewall (addendum, non-negotiable).** Jason's original "Asha'man Kill" Suno song must
**never play in the game**, never be copied into `assets/`, and never be uploaded as a Suno reference/
remix source by the build. It may be *listened to by Jason* while he writes the new Suno prompt, in his
own account, for feel: driving battle chant, call-and-response energy. The shipped tracks are new
compositions with new lyrics and new melodies, documented in `assets/audio/AUDIO_PROVENANCE.md` as
Suno generations from Jason's account with the prompt text archived in `tools/stage8/music-brief.md`†.
If a generated take recognisably quotes the original's hook, reject it (that is the failure mode the
firewall exists to prevent).

**Conventions (from `src/audio.js:MUSIC`, `tools/music/music-manifest.json`, Stage 6's ElevenLabs/Suno
precedent).** Each file ≤ 1,200,000 bytes; `stage8.music`† line = 2 × 1,200,000 (+ credits sting below).
Seamless loop region `[loopStart 0.25, loopEnd)`, sample-accurate `AudioBufferSourceNode` looping;
stage gain 1.0 at ≈ −16 LUFS, boss gain 0.94 at ≈ −15.2 LUFS; crossfades owned by `src/music.js`
(`STAGE_MUSIC[8]`, `FADES.toBoss 1.2 s`). Suno output is not born loopable: cut the loop with the
Stage 6 pattern (`tools/stage6/loop_music.py` → `tools/stage8/loop_music8.py`†: render/trim 3 copies,
keep the middle, 40 ms equal-power join, 0.25 s handles), verify with
`tools/music/check_loops.py` (seam jump ≤ 99.9th-percentile step, ≥ 0.98 overlap correlation), and
register `MUSIC.stage8/boss8` by mutation in `src/stage8.js`† with a `validateLoop` guard copied from
`src/stage7-audio.js:guardLoop7` → `guardLoop8`†. Exact `loopEnd` values are measured from the cut
files at T15 and written into both `src/stage8.js`† and `tools/stage8/music-manifest.json`† — never
guessed in this plan.

| Track | File / id | Tempo / key | Bars → loop length | Brief |
|---|---|---|---|---|
| Stage: **"Rolling Earth"**† | `music-stage8.mp3` / `stage8` | **120 BPM, D minor** (Dorian lift on the chant) | 32 bars @ 120 = **64.0 s** loop | Nordic battle chant: frame drums + stomps on 1-and-3, tagelharpa drone, low male choir in unison/octaves with a female overtone line answering (call-and-response — the *feel* reference; new words below). War-horn every 8 bars. Keep the drum bed perfectly even so the loop seam never lands on a hit, and leave the arrangement sparse for the first 4 bars so zone entries breathe. At 120 BPM the 60 s hazard cycle is exactly 30 bars: players will *feel* Taim arrive on a downbeat roughly every other loop without the code ever syncing to audio (it must not — §2.4). |
| Boss/finale: **"Queen of Love and Beauty"**† | `music-boss8.mp3` / `boss8` | **132 BPM, D minor → F major lift** in the back half | 32 bars @ 132 = **58.18 s** loop | The same choir, now *arguing* with a solo soprano line (Lanfear's vanity as melody: high, ornate, always resolving to herself). Strings ostinato + hand-drum gallop for the duel. Write the lift into the loop's second half (the game does not swap tracks at P3, the Stage 5 rule): first half = P1/P2 menace, second half = P3/finale blaze. End the master (pre-loop cut) with a 6 s choir swell reserved as the credits sting source. |
| Credits sting (no new generation) | `music-credits8.mp3`† / reuses `clear` state → `title` track as shipped | — | 6 s swell cut from the boss master, then `MusicDirector` `clear` → existing `title` theme | Do not commission a third Suno track. The sting is an edit, counted inside the `stage8.music` line (+ ≤ 150 KB, line total 2,550,000). |

**Suno prompt (give Jason verbatim; he generates in his account).**

> *Style:* Nordic folk metal battle chant, live war drums, tagelharpa, low male choir chanting in
> unison, female overtone singing answering, war horn, no guitars in the stage version / restrained
> distorted guitar bed in the boss version, 120 BPM (stage) / 132 BPM (boss), D minor, triumphant and
> grim, video-game loop energy, no modern pop vocals, no rap.
> *Lyrics (new, chant-simple, written for this game):* verses of short shouted lines about earth
> rolling, wells, wolves running, black coats standing in a line, a brother crossing a battlefield;
> refrain built on the spoken order "Asha'man — kill!" as a *rhythmic shout answered by the full
> choir* (two words of book dialogue; everything around them is original). Boss version adds a vain
> soprano descant about a silver crown and a paper crown. Keep syllables chantable at tempo; avoid
> character surnames beyond the title order.

Generate ≥ 4 takes per track; Jason picks by ear on the phone speaker (the Stage 6 device rule). If
Suno vocals fight dialogue intelligibility, fall back to the *instrumental* render of the winning take
for `stage8` and keep vocals only in `boss8` (captions already duck music to 45% via `say()`, but a
chant under Taim's order must never mask the order itself — Taim's line ducks, the chant yields).

### 6.4 SFX (code-synthesised, no new files)

`src/stage8-sfx.js`† copying `src/stage7-sfx.js` (`withSfx` from `src/audio.js`): earth-roll rumble
(looping noise bed for 2.2 s, gain-gated), fire-sheet whoomph, gateway slit *snick*, dice rattle (three
short filtered clicks), medallion chime, wolf howl (two detuned sine glides — keep it more "signal"
than "horror"), bubble pop, bind snap, crystal draw note (Callandor: one high sine + harmonic, 1.2 s
decay — the only pretty sound in the stage), braid shimmer on link, doorway slam (stone + air thump),
chest thump (low sine knock, rate rises per pip). Every cue `gate()`-limited as in `src/audio.js:sfx`;
the 60 s wave owns a duck (0.35) so Taim is always intelligible.

---

## 7. Memory and audit budget

### 7.1 GPU textures (WebKit, `tools/stage5/texture-dump.mjs RWB_STAGES=8`)

Baselines: Stage 6 boss peak **110.91 MiB** source; Stage 7 estimate ≈ 89 MiB (gate ≤ 105 MiB).

| Item | Stage 7 (reference) | Stage 8 (estimate) |
|---|---|---|
| Atlas fighters, colour + compact normals | 67.20 MiB (riley 34.30, grunt 19.90, spear 13.00) | **≈ 44.4 MiB** (riley 34.30 + loial ~10.1; grunt/spear dropped, §2.2) |
| Painted cast + props resident | ≈ 7.7 MiB (cap 12.0) | **≈ 12.5 MiB (cap 14.0)** at Z3 peak |
| Backgrounds resident (streamed) | ≈ 8.4 MiB | ≈ 8.4 MiB |
| Powers, HUD, FX, shared | ≈ 5.6 MiB | ≈ 5.6 MiB |
| **Boss peak (source)** | ≈ 89 MiB | **≈ 71 MiB. Gate: ≤ 105 MiB** |

The ~34 MiB of slack under the gate (and ~49 MiB under the 120 MiB guide) is **deliberate and not
spendable in this plan**: it absorbs the RES 1.25 sheets if they measure hot, the cutscene `<video>`
decode surface, iOS memory pressure in a 7-minute stage, and the campaign-complete session having come
through Stage 7 without a reload. If the dump measures over 105 MiB, cut in this order (T16): linked/
Lanfear sheets to RES 1.0 (−~2.2 MiB), `bg8far` to 896×406 (−0.42), drop `s8randbox` cutaway pose
(−~0.3). Do not fix an overage by shrinking tells, bands or HP — only pixels.

### 7.2 Streaming and deferral

- **`STREAMS[8]`†** (`src/zone-stream.js`): `far: 'bg8far'`, zones `[{bg8mid,bg8floor},
  {bg8mid2,bg8floor}, {bg8mid3,bg8floor2}, {bg8mid4,bg8floor3}]`, `bleed: [128,48,48,48,128]`
  (Stage 7 values; the wagon-circle seam needs the feather, unlike Stage 6's sea-gate 0).
- **Deferred sheets** via the Stage 7 `demand7` pattern (`src/stage8-load.js`† `demand8`, 1.5 s timeout
  → code fallback): `s8sister/s8circle/s8bubble` at Z1 clear; `s8kenzie/s8link/s8callandor` at Z2 wave 0
  clear (before the crown can drop); `s8lanfear/s8door` at Z2 clear (boss intro waits ≤ 1.5 s, then
  fallback); `s8mat` at first charge-ready; `s8wolves` at Z1 entry. Sister sheets are **released at
  CS5 end** so sister+Lanfear peaks never coincide (asserted by texture-key test, the campaign plan's
  Galina/Taim rule). Story panels release before Z0 wave 0. `releaseStage8`† mirrors `releaseStage7`,
  including the canvas-vs-file guard for shared keys (`s6rand`, `s7dancer` survive only toward stages
  that own them).

### 7.3 Byte audit lines (new, in `tools/audit-stage1.mjs`)

| Line | Contents | Budget |
|---|---|---|
| `stage8.source`† | `STAGE8_SRC`†: every `src/stage8*.js`, `mat-call.js`, `call8-cutscene.js`, `sister8.js`, `lanfear.js`, `bot-stage8.js` (regex set like `STAGE7_SRC`) | 224 KB (finale carries the circle/link/outro code; Stage 6/7 are 192 KB — call the raise out in T2) |
| `stage8.voices`† | `/^(st8_\|riley_st8_)/` | 7,372,800 (36 × 200 KB after §6.2 cuts) |
| `stage8.music`† | `music-stage8.mp3`, `music-boss8.mp3`, `music-credits8.mp3` | 2,550,000 |
| `stage8.art`† | `assets/stage8/**`, `assets/bg8/**` | 7,000,000 |
| `cutscenes.callIns8`† | `assets/cutscenes/call8/**` | 5,000,000 |
| `cutscenes.stage8`† | `assets/cutscenes/stage8/**` | 18,000,000 |

**Pre-fight gate impact 0 bytes** from the new set. Counted edits are T1's touches to `src/stages.js`,
`src/stage7-def.js`, `src/rand-call.js`, `src/music.js`, `src/cutscene.js`, `src/cutscene-hooks.js`,
`src/zone-stream.js`, `src/texture-pages.js`, `src/bot-stage4.js` — ceiling **+600 bytes** total,
checked in T1 (wider than Stage 7's +400 because `STAGE_MUSIC[8]` and `STREAMS[8]` are table rows,
not logic). `CUTSCENE_SRC` stays ≤ 20 KB.

---

## 8. Build order (one task per PR, sequential; content tasks may parallel-run once their contract lands)

### 8.1 Every task brief must say

The brief format is the one in `docs/GROK-BRIEF-P1.md` / `docs/STAGE7-PLAN.md` §8.1.

1. Branch from the **current head of the Stage 8 integration branch** `rwb-w2-stage8`†, cut from
   `rwb-w2`. Draft PR into `rwb-w2-stage8`. Never PR into `rwb-w2`; never merge without Jason.
2. Protected files (§0.1) untouchable; never edit an existing test.
3. Run and paste tails: `node --check` on every changed `.js`; `node --test tests/*.test.mjs`;
   `node tools/audit-stage1.mjs`. (This planning machine cannot run git/python; the build machine can
   and must also run the art/music tools named per task.)
4. Golden sim diff for Stages 1–7 empty (seeds `FULL_STAGE_SEEDS`).
5. Preview URL of the head SHA with `?stage=8&s8=1` in the PR body.
6. Known baseline: `tests/stage4-placeholders.test.mjs` needs Pillow (`pip install pillow`); a failure
   from that alone is not a regression.

### 8.2 Tasks T1–T18 (dependency order)

| # | Task | Files (new †) | Acceptance / gates |
|---|---|---|---|
| **T1** | Generalise the 7s (§0.3): `MAX_STAGE 8`; `stageEnabled(8)` via `s8` off; `maxStage`; Stage 7 `next` → 8; `callInFor` 4-way; `STAGE_MUSIC[8]`; `STAGE_CLIPS[8]` + `wrapStart(8,8)`; `STREAMS[8]` bleed; `COMPACT_STAGES` += 8 | `src/stages.js`, `src/stage7-def.js`, `src/rand-call.js`, `src/music.js`, `src/cutscene.js`, `src/cutscene-hooks.js`, `src/zone-stream.js`, `src/texture-pages.js`; `tests/stage8-generalise.test.mjs`† | All tests pass; golden 1–7 empty; `?stage=8` w/o `s8=1` → 1; `callInFor` table; pre-fight ≤ +600 B; `CUTSCENE_SRC` ≤ 20 KB |
| **T2** | Skeleton: `STAGE8` def (zones §2.1, drops, crates, skip, dummy boss HP 720), `Stage8Kit` (full kit interface, empty hazards), `queueStage8`, `releaseStage8` wrapper, `STREAMS[8]` code plates, `STAGE8_SRC` + all §7.3 audit lines, `STAGE8.next` → title/`campaignComplete` | `src/stage8-def.js`†, `src/stage8.js`†, `src/stage8-paint.js`†, `src/stage8-painted.js`† (stub), `src/stages.js`, `tools/audit-stage1.mjs`; `tests/stage8-registry.test.mjs`†, `tests/stage8-size-caps.test.mjs`† | `?stage=8&s8=1` boots, walks Z0→Z3 (grunt/spear stand-in waves), dummy boss, clear + credits stub → title; campaign 9/9 dummy; 7→8 and 8→1 release leaves no Stage 8 keys; audit lines all PASS; story panels released before Z0 |
| **T3** | Shaido roster: `spearman`, `runner` (flank/lunge), `stonedog` (block/break), `bowman` (0.6 s spacing), `wise` (lance/spike, one caster); code-drawn sprites; real Z0–Z2 waves | `src/shaido8.js`†, `src/stage8-fighter.js`†, `src/stage8-actors.js`†, `src/stage8-def.js`; `tests/stage8-shaido.test.mjs`† | Tokens ≤ 2 incl. casters; 2 bowmen never fire < 0.6 s; Stone Dog guard rules; humans yield never ash; campaign 9/9 |
| **T4** | Allies: Tier B loops (Asha'man/Maidens/Wise Ones/bow arcs), Tier F Perrin/Loial lane partners (0 dmg), wolf-pack charge (scripted Z1) | `src/stage8-allies.js`†, `src/stage8-view.js`†; `tests/stage8-allies.test.mjs`† | Allies deal 0/never-lethal as specced; ≤ 2 Tier F; governor ≥4 hides Tier F and stage still clears 9/9; lights ≤ 10 |
| **T5** | Taim wave (`createTaimWave`): 60 s clock, 3.0 s triple telegraph, rollers + fire, safe-band never repeats, well-rim shelter, holds/fairness, CS1 first wave | `src/stage8-taim.js`†, `src/stage8.js`; `tests/stage8-taim.test.mjs`† | Unit: hold rules (grab/strike/cutscene/getup/beat); ≤ 1 hit/wave; band grace; jump clears roller not fire; bot ≤ 25% deaths in rolls; campaign 9/9 |
| **T6** | Sisters + circle: weave shield pop/open/re-weave, air-bind via grabbed contract, 3-real + silhouette ring, crown pickup → break state (cutscene stubbed to captions) | `src/sister8.js`†, `src/stage8-circle.js`†; `tests/stage8-sister.test.mjs`† | Projectiles/balefire absorbed shield-up; 3 hits/throw pop; bind always breakable, 1 binder, `releaseHold('break')` paths; continue-after-break stays broken; 9/9 |
| **T7** | Linked mode: companion sprite + pose map, twin helix, finisher bolt, braid meter (×1.5), wide balefire visual; links at Z2b, persists death/continue | `src/stage8-link.js`†, hooks in `src/stage8-lifecycle.js`† (fireball/combo observers only — no `riley.js` edit); `tests/stage8-link.test.mjs`† | Input-parity: identical `Input`/ATK trace linked vs unlinked replays identically except specced outputs; companion has no hitbox/token; DPS single-target +≤10%; 9/9 |
| **T8** | Call rules (pure): `CALL8`, `provider8`, charges/per-phase/fresh-on-switch, Mat sweep≡dice damage, gate clamps, human rules | `src/mat-call.js`†; `tests/mat-call.test.mjs`† | Table tests mirror `rand-call`/`moilan-call` 1:1; provider flips only on `randFree`; boss dmg clamps; humans never 0 HP from a call; dice≡sweep fuzz |
| **T9** | Lanfear P1–P3 + `finalePush` + playable outro + credits scroll + CAMPAIGN COMPLETE | `src/lanfear.js`†, `src/stage8-arena.js`†, `src/stage8-def.js`; `tests/stage8-lanfear.test.mjs`† | Gates fuzz 1,000 hits never skips (all sources incl. wave/wolves); free-band invariant every volley; reflect/channel/slit/blink units; push hold 2.0/5.0, whiff harmless; outro reaches clear; 9/9, lag ≥ 8/9 |
| **T10** | Call in game: lifecycle hooks, Mat/Rand strikes (code FX), freeze/invuln, HUD slot + shield pips + provider flip, help/title/boss patches, caption colours | `src/stage8-lifecycle.js`†, `src/stage8-freeze.js`†, `src/stage8-hud.js`†, `src/stage8-voice.js`†; `tests/stage8-call.test.mjs`†, `tests/stage8-earlier-calls-unchanged.test.mjs`† | Loial 1–5 / Rand 6 / Moilan 7 asserted unchanged; hooks restored (identity); call-on boss time 70–102%; HUD never shows wrong provider; pips crack on the 5 beats |
| **T11** | Cutscene plumbing: `call8-cutscene` (Mat bag + Rand reuse, 1 blob, flip revokes), story/event clip hooks, CS4/CS5/finale state-on-`done` (video → panel fallback), box interludes + chest thump | `src/call8-cutscene.js`†, `src/stage8-box.js`†; `tests/stage8-cutscene.test.mjs`† | Strike/link/flip timing identical clip present/stalled/missing/skipped (stubbed player); ≤ 1 blob; bags persist in session; interludes never pause play |
| **T12** | Bot `stage8Bot`: blue-lane stands, roller jumps, well rims, bubble-popping, bind jumps, volley lanes, reflect, channel breaks, calls by provider, hold-to-push | `src/bot-stage8.js`†, `src/bot-stage4.js` (1 line); `tests/stage8-campaign.test.mjs`† | Campaign 9/9; lag-250 ≥ 8/9 (incl. push); full-run 1→8 in one session without texture growth > ±2 MiB/stage; per-seed times logged |
| **T13** | Painted art: `tools/stage8/process_art.py` JOBS for all §5 keys, `ART_STATUS.json`, generated `stage8-painted.js`, contact sheets incl. Kenzie face audit | `assets/stage8/**`†, `assets/bg8/**`†, `tools/stage8/process_art.py`†; `tests/stage8-painted-art.test.mjs`†, `tests/stage8-memory.test.mjs`† | Every key ≤ caps; dump `RWB_STAGES=8` peak ≤ 105 MiB, painted ≤ 14.0 MiB; no-placeholder passes; per-zone art shots in PR; Jason approves Kenzie/Lanfear sheets |
| **T14** | Voices: 36 lines after §6.2 cuts (DYLO, Jason clone, Rand A/B, 4 new designs, Kokoro Kenzie), manifests, Whisper + loudness | `assets/audio/voice/st8_*.mp3`†, `riley_st8_*.mp3`†, `assets/audio/stage8-voice-manifest.json`†, `tools/stage8/voice-render.json`†, `src/stage8-voice-files.js`† | ≤ 200 KB/line, total ≤ 7,372,800; Whisper `medium.en` matches (normalised); Jason by-ear sign-off incl. Kenzie; missing = caption, no 404 |
| **T15** | Suno music: **Jason generates** (his account, §6.3 prompt; original song never enters the repo); loop-cut, `check_loops`, `MUSIC.stage8/boss8` + `guardLoop8`, provenance entry | `assets/audio/music-stage8.mp3`†, `music-boss8.mp3`†, `music-credits8.mp3`†, `tools/stage8/loop_music8.py`†, `tools/stage8/music-manifest.json`†, `tools/stage8/music-brief.md`†, `AUDIO_PROVENANCE.md` | Each ≤ 1.2 MB; loop check passes; LUFS in range; audit `stage8.music` PASS; **byte/string audit: no file in the repo is or references the original "Asha'man Kill" audio** |
| **T16** | Memory/streaming pass: `demand8` deferrals + releases (§7.2), governor drops, texture-dump evidence per zone | `src/stage8-load.js`†; extend memory tests | Sister+Lanfear never co-resident; panels freed pre-Z0; peak re-measured ≤ 105 MiB; quality ≥4 drops blobs/Tier F, still 9/9 |
| **T17** | Video clips: Flow V1–V10 (as credits allow, §4.1 cut order), Grok M1–M3/G1–G3; encode, posters, 4 fps frame review (Riley back-only, girl faceless, likeness), `ART_STATUS` | `assets/cutscenes/stage8/**`†, `assets/cutscenes/call8/**`† | Each ≤ 160 KB/s, 5–10 s, 854×480; folder lines PASS; review log clean; Jason likeness + depiction sign-off before any id enters `PRESENT`/`STAGE_CLIPS[8]` |
| **T18** | Hardening + enable: iPhone-class WebKit browser pass (copy `tools/stage7/browser-hardening.mjs`), 60 fps p95, pause/resume, death mid-call/mid-bind/mid-push, switch mid-cutscene, full campaign soak; flip `stageEnabled(8)` default on | `tools/stage8/browser-hardening.mjs`†, `src/stages.js` (1 line), `docs/stage8/STATUS.md`† | 5 full runs, no console errors; earlier acceptances still green; **Jason's playtest sign-off before the default flips** (and Riley's, if he'll give it) |

**Order rationale.** T1 unblocks everything. T2 is a shippable-plain finale behind `s8=1`. T3–T12 are
gameplay on code-drawn art, each testable alone. T13–T15 and T17 are content that merges without code
risk because of the fallbacks — but note the human gates: art depiction approval (T13), Kenzie voice
approval (T14), Jason-only Suno generation (T15), Flow credits + frame review (T17). No agent may
substitute its own judgement for those four approvals. T18 turns the stage on; nothing after T18 adds
features.

---

## 9. Test plan summary

| Test file† | Covers |
|---|---|
| `stage8-generalise` | T1 predicates, `callInFor` table, Stages 1–7 unchanged |
| `stage8-registry`, `stage8-size-caps` | def shape, queue/release, streams, audit lines, per-file caps, source ≤ 224 KB |
| `stage8-shaido`, `stage8-allies` | enemy rules, tokens, yields; ally 0-dmg/herd/governor rules |
| `stage8-taim` | 60 s clock holds, safe-band non-repeat, latch, dodge windows, death-share gate inputs |
| `stage8-sister` | shield absorb/pop, bind breakability, circle thinning, break persistence |
| `stage8-link` | input parity trace, companion non-collision, helix/bolt/meter numbers |
| `mat-call`, `stage8-call`, `stage8-earlier-calls-unchanged` | pure rules, provider flip, dice≡sweep, Loial/Rand/Moilan untouched |
| `stage8-lanfear` | free-band table, gates fuzz (all sources), reflect, channel, slits, push, outro |
| `stage8-cutscene` | state-on-`done` under present/stalled/missing/skipped; blob lifecycle |
| `stage8-campaign` | 9/9, lag ≥ 8/9, call fairness 70–102% in both provider eras, 1→8 soak |
| `stage8-painted-art`, `stage8-memory` | per-key caps; painted ≤ 14.0 MiB, peak ≤ 105 MiB (reads texture-dump JSON) |
| `stage8-audio` | `present` ↔ disk, ≤ 200 KB/line, no Stage 8 voice on a pre-fight path |
| `no-placeholder` (existing) | add 8 (or sibling file per §0.1) |

**Freeze-frame check (standing gate):** for 10 random hits on Riley per seed, the frame 0.5 s before
the hit must show a tell in ≥ 9/10 — including Taim rollers, binds, slits and volley balls.
**Depiction check (new, manual, T13/T17):** every Kenzie/Riley frame in contact sheets and clips is
eyeballed against §0.2 and logged; a single face frame fails the whole sheet/take, no exceptions.

---

## 10. Risks and mitigations

- **The 60 s wave becomes wallpaper or becomes a wall.** Too readable and players ignore Shaido for 3 s
  every minute; too harsh and the finale feels like a timer with a boss attached. Mitigation is already
  in the numbers (non-repeating safe band, 40 dmg to enemies, Z3 fireball-clearing) plus the ≤ 25%
  death-share bot gate. If playtest says "annoying", stretch to 60 s *of Z0–Z2 only* and pause the clock
  in Z3 (one-line kit change, pre-planned here so it is tuning, not redesign).
- **Linked mode reads as "escort the kid".** One hit on Kenzie would poison the whole fantasy, so she
  cannot be hit at all (§2.6). The residual risk is tonal (a child on a battlefield): mitigated by
  keeping her behind Riley, hands on *his* glove, doing light — never weapons, never targeted, never in
  a struck band alone. Jason approves the sheets and every line (T13/T14 gates).
- **Callandor logic.** Canon-purist objection ("Riley can't just take Callandor") is answered in-story
  (Rand told him to; it is drawn once and planted). If Jason prefers, Q2's default covers the swap with
  zero mechanic change.
- **Two providers, one pool confusion.** Players may hoard Mat's charge "for Rand". The fresh-charge-on-
  switch plus Mat's retirement line (CS5-6) teach spending early. HUD always shows the *current*
  provider's face; there is never a dead button.
- **Flow likeness/face failures burn the 210 credits.** Mitigations: descriptive prompts (§4.3),
  hands-only restage for the girl, cut order protecting V1/V6/V8, and full panel fallbacks so *no* clip
  is load-bearing for shipping. Budget 2–3 generations/shot in the credit estimate, not 1.
- **Suno take quotes the reference song.** The §6.3 firewall + Jason-by-ear rejection rule. Also: never
  feed the original into Suno as audio input from the build side; the take must be prompt-born.
- **Painted-fighter throughput.** Dropping two atlases means *every* enemy animates through the painted
  path. Stage 7 shipped exactly this for Shaido, but Stage 8 fields more at once. Caps hold it: ≤ 5 real
  fighters + boss on screen enforced by wave design and asserted in T3; silhouettes and Tier B loops
  carry the "army" illusion for free.
- **Finale length on a phone battery/thermal budget.** 6–7 min at full lights is the longest stage.
  Governor behaviour (Tier B freeze, Tier F hide, blob drop) is specced per tier in §2.3/§3.4 so a hot
  phone degrades theatre first, never tells.
- **Credits/next-state regressions.** Stage 8 is the first `next` that ends the campaign. T2 lands the
  credits stub immediately and T12 soaks 1→8 in one session, so a late "where does Continue go?" bug
  cannot hide until T18.

---

## 11. Decisions for Jason (defaults apply if no answer; max five, as briefed)

| # | Question | Suggested default |
|---|---|---|
| Q1 | Kenzie's voice: the synthetic Kokoro Twinkle Toes blend for her 5 lines, each take approved by you by ear (caption-only if you veto any)? | **Yes** — it is the already-approved synthetic cast; no real-child audio exists anywhere in this plan |
| Q2 | Callandor: Riley drew it from the Stone on Rand's instruction, carries it sheathed, cuts the circle once, then plants it at the wells (§1.2)? Alternative: Rand sends it through a gateway mid-CS4 (same cutscene, one extra shot) | **Riley drew it** — the hilt on his back all stage is the better promise/payoff |
| Q3 | Drop the `grunt`+`spear` atlases on Stage 8 (all-painted Shaido, `STAGE8_CHARS = [riley, loial]`) to fund the linked/Lanfear art at RES 1.25? | **Yes** — ≈71 MiB peak vs ≈104 MiB the other way; Stage 7 already proved painted Shaido |
| Q4 | Flow spend order if credits run short: protect V1 (wells/chest), V6 (circle break), V8 (finale push); sacrifice V9 (dance video — the in-engine dance ships regardless) first? | **Yes** |
| Q5 | Taim's wave keeps running during the Lanfear fight (with the beat-hold + fireball-clear rules, §2.4)? Alternative: clock pauses in Z3 for a clean duel | **Keep it running** — Dumai's Wells *is* the boss arena; the Z3 clear rule makes it help as often as it hurts. Revisit after first playtest |

---





