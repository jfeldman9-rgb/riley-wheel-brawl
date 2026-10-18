# Stage 8 plan: Dumai's Wells, the final level, with Lanfear as the last boss

*Planner: Claude Opus 5.5, Oct 18 2026. Branch `rwb-2-stage8-plan`, cut from `rwb-w2` @ `23ccf14`. This is a
docs-only plan. It makes no game code changes. Names marked **†** are new. Every other name was checked in this
checkout.*

*Revision (Oct 18 2026): this is the Claude plan merged with the best of the Argon and Muse plans
(`docs/stage8/STAGE8-PLAN-ARGON.md`, `docs/stage8/STAGE8-PLAN-MUSE.md`) and corrected to Jason's
`docs/stage8/BRIEF-ADDENDUM.md`, which overrides everything else. The original Claude plan is kept at
`docs/stage8/STAGE8-PLAN-CLAUDE-orig.md`. §12 lists what came from where; §13 is the open questions.*

Jason's brief is quoted word for word in `docs/stage8/BRIEF.md`. His later decisions are in
`docs/stage8/BRIEF-ADDENDUM.md`. In short:
1. **Stage 8 is the last level**, set at **Dumai's Wells**. There is no Stage 9. This replaces
   `docs/CAMPAIGN-ARC-PLAN.md` §2–§3: no Cairhien stage and no "TDOG" boss.
2. **Shaido replace Trollocs.** The Asha'man, Perrin (with his **wolf pack** and a big grey lead wolf), Loial
   "and everyone else" fight beside Riley. Perrin and Loial are battlefield allies, **not call-ins**.
3. **Every 60 s Mazrim Taim yells "Asha'man, kill!"** A wave of rolling earth and fire then sweeps the field and
   **hits everyone**: Shaido, allies and Riley. Riley has to dodge it. **Taim stays on Riley's side. There is no
   Taim boss.**
4. **The opening scene** shows Rand in the box, "talking" to Lews Therin while he fights the saidar shield.
5. **Call-ins: Mat Cauthon first** (ashandarei, wide-brimmed hat, luck and dice), **then Rand** once he breaks
   out of the box. Moiraine and Lan sit this stage out.
6. **A Black Ajah circle guards Twinkle Toes.** Riley breaks it in a cutscene with Callandor.
7. **Twinkle Toes is Kenzie**, Riley's little sister: about 8 (third grade), long dark wavy hair, roughly chest
   height next to Riley, a pink recital outfit and a gold paper crown. **Her face is never shown**, in stills or
   video, and no real photo of her is ever used as art input. She channels. She and Riley link, and they fight
   together in a cutscene and in gameplay. That needs art of Riley and Twinkle Toes together.
8. **The final boss is Lanfear** (fitted sleeves, not bell sleeves). She is jealous that Twinkle Toes was crowned
   Queen of Love and Beauty at Medieval Times. The finale uses Jason's exact lines (§1.10).
9. **The best art in the game.** Jason is already drafting art (Lanfear, Rand in the box, Taim, a Shaido Stone Dog
   spearman, Wise Ones, Asha'man, Perrin, Loial, Mat, wolves).
10. **Music:** a **brand-new Suno song** with new lyrics, a new melody and Nordic-style vocals. Jason's original
    "Asha'man Kill" song is a **feel reference only and never plays in the game** (§6).
11. **Video:** Google Flow first (about 210 credits, about 10 clips), Grok Imagine for the rest. Prompts never name
    characters.

This plan copies the structure of `docs/STAGE7-PLAN.md`. It reuses the shipped Stage 7 building blocks:
- painted fighters: `Stage7Fighter` (`src/stage7-fighter.js`), `FRAMES7`/`frame7` (`src/stage7-frames.js`);
- Shaido AI: `Dancer`, `Veiled` (`src/shaido.js`);
- deferred loading: `demand7`, `queueStage7Painted` (`src/stage7-load.js`);
- scene hooks: `hook7`, `call7Context`, `installBossCaption7` (`src/stage7-lifecycle.js`);
- the shared damage window (`src/stage7-hurt.js`, `src/stage6-hurt.js` `strikeRiley`);
- zone streaming (`src/zone-stream.js`) and compact normals (`src/texture-pages.js`);
- the Rand call-in (`src/rand-call.js`, `src/rand-call-cutscene.js`, clips `assets/cutscenes/rand/R1–R3`) and the
  call charge engine (`src/moilan-call.js` `CALL7`, copied for Mat);
- event video playback (`src/cutscene-scene.js` `playSceneVideo`) and the Twix-style panel fallback
  (`src/twix-video.js` `startTwix`).

Tone is the same as before: teen/adult, no gore. Every enemy in this stage is human, so nobody dies. Shaido and
Black Ajah **yield**: they kneel, then fade out. Lanfear is **not killed**. She is shoved through the redstone
doorway, which fits canon, because she comes back later in the books. She is a vain, theatrical villain.
**There is no flirting or seduction with Riley or Rand, in any line or any art.** She threatens the *crown*; she
never touches the child on camera.

---

## 0. Ground rules (every task)

### 0.1 Carried over unchanged from Stages 6–7
- **Protected files.** Never edit `src/input.js`, `src/hud.js`, `lib/` or `index.html`. `tests/stage6-protected.test.mjs`
  enforces this and also bans Safari-15-unsupported syntax (`.at(`, `structuredClone`, `Object.hasOwn`, …) in every
  `src/*.js`. Never edit `src/riley.js` or `src/stage1.js`: everything Stage 8 changes about Riley goes through
  instance hooks owned by the kit and restored in `destroy()`.
- **Control parity.** There are no new actions and no new keys. Stage 8 has one call provider at a time (Mat,
  then Rand, §3), so the Stage 7 **O** / portrait-tap helper cycle is not used. The call still goes through the
  existing `assist` action and touch `CALL` button. The link mode (§2.7) changes what the same buttons do, never
  which buttons exist.
- **Stages 1–7 stay byte-identical in behaviour.** A new golden fixture covers Stages 1–7 (T1).
- **Hardening lessons.** Each of these applies to every task:
  - `releaseHold('break')` on call, death, stage switch and destroy;
  - governor-safe `setQuality` before `build()`;
  - `stage4Delta`/`substeps` at 120 Hz;
  - zone-clear disposal;
  - a `counterUsed` latch on every boss attack;
  - lights ≤ 10;
  - attack tokens ≤ 2;
  - every timer on the game clock (`kit.clock`), never `Date.now()` and never audio time.
- **Determinism.** No `Math.random()` and no `Date.now()` in Stage 8 modules. Use the seeded `rand`/`pick` from
  `src/config.js`. The `tests/stage7-memory.test.mjs` pattern is copied to cover Stage 8 files.
- **No player-visible placeholders.** Every painted key has a code-drawn fallback in `src/stage8-paint.js`†. A
  `PLACEHOLDER` stamp is drawn only under `?debug`.
- **Assets.** Everything new goes under `assets/stage8/`†, `assets/bg8/`†, `assets/cutscenes/stage8/`†,
  `assets/cutscenes/call8/`†, `assets/audio/music-*8.mp3`† or `assets/audio/voice/{st8_,riley_st8_}*`†. Never write
  into the counted `assets/{chars,bg,props,ui,powers}`.

### 0.1a Depiction rules (brief plus addendum; they override every art, video and voice task)
- **Riley** (Jason's real 16-year-old son). In video he is **always seen from behind**; his face is never visible,
  not even blurred, and his head never turns past profile. He is never repainted for gameplay and no photo or
  Riley art is attached to any prompt.
- **Twinkle Toes / Kenzie** (Jason's real niece, about 8). **Her face is never shown**, in painted stills, sprites,
  portraits, story panels or video: from behind, in silhouette, with hair over her face, or turned away. **No real
  photo of her is used as art input or reference.** Every frame of her is drawn from the written description
  only. She is never a target, never hurt on screen and never holds a weapon. Her channeling is light from her
  hands.
- **Review gate.** Every contact sheet and every clip gets a frame-by-frame review at 4 fps, logged in its
  `ART_STATUS.json` with reviewer and timestamp. **A single frame that shows either child's face fails the whole
  sheet or take**: re-roll it, never patch one figure.
- **Human gates no agent may stand in for:** Jason approves the Twinkle Toes and Lanfear sheets (T15), every
  Twinkle Toes voice take (T13), generates the Suno songs in his own account (T14), and signs off on clip likeness
  and depiction (T16).

### 0.2 New constraints found in this checkout (they shape T1–T3)

| Fact (checked Oct 18) | Consequence |
|---|---|
| `tools/audit-stage1.mjs:36` `bootSourceFiles()` adds every module reachable from `src/bootstrap.js` to the pre-fight sum, including stage sets. `src/stages.js` statically imports `stage7.js`, so Stage 7 source is already counted | Stage 8 source **will** count against the 25,000,000-byte gate. Today it stands at **20,675,453**, so the ~200 KB of Stage 8 code fits easily. Do not dodge the count with a computed `import()`. That would hide real boot bytes |
| `tests/stage7-painted-art.test.mjs:66` asserts `preFight.inventoryUpperBoundBytes === 20_675_453` **exactly** | Any byte added to a boot-graph file breaks an existing test. Jason re-pinned this number himself in `97eb483`. Open question **Q1** (§13) asks him to approve one edit, in T1, that changes the exact pin into a ceiling |
| `tests/bonus-videos.test.mjs:177` pins `EVENT_CLIPS` to `{ trex, twix }`. `tests/cutscene.test.mjs:332` requires every `STAGE_CLIPS`/`EVENT_CLIPS` id to be a top-level clip of 1.0–3.2 MB listed in the top-level `ART_STATUS.json` | Stage 8 clips **cannot** go in `src/cutscene.js`. Stage 8 keeps its own registry (`CLIPS8`† in `src/stage8-video.js`†), its own folder and its own `ART_STATUS.json`, and plays them through the shared gesture-blessed player. That is the `playSceneVideo` code path, taking ids directly. `src/cutscene.js` and `src/cutscene-hooks.js` stay untouched; `CUTSCENE_SRC` is at 22,399 of 24,576 bytes |
| Stage 7 is live **behind `s7=1`** (`src/stages.js:16`). Its 26 voice lines, two 96 BPM loops and call clips are still missing (`docs/stage7/STATUS.md`) | Stage 8 sits behind `s8=1` and is reached from Stage 7 only when both flags are on. `maxStage(Q('s7=1'))` must stay 7 (`tests/stage7-lifecycle.test.mjs:13`) |
| Stage 7 borrows `music-stage5`/`music-boss6` (`src/stage7.js`, `MUSIC.stage7`/`boss7`) | Stage 8 registers its own `MUSIC.stage8`/`boss8` in `src/stage8.js`, as `src/stage6.js:21` does, so `src/audio.js` does not grow |
| No Twinkle Toes channeling beat exists in the shipped Stage 6 code. The `view.glimpse()` in `src/stage6-view.js:188` draws `s6rand` | Stage 8 sets up her channeling itself (§1.8). The lines work whether or not a Stage 6 reveal is added later |

### 0.3 Stage-7-specific spots Stage 8 must generalise (T1)

| File:line | Today | Fix |
|---|---|---|
| `src/stages.js:11,16,22` | `MAX_STAGE = 7`; `stageEnabled(7)` reads `s7`; `maxStage` tops out at 7 | `MAX_STAGE = 8`. `stageEnabled(8)` reads `s8` and is **off by default**. `maxStage`: `s8 ? 8 : s7 ? 7 : …` |
| `src/stage7-def.js` `next` | `() => ({ stage: 1, stage7Return: true })` | `q => stageEnabled(8, q) ? { stage: 8, fromStage7: true, autostart: true } : { stage: 1, stage7Return: true }` |
| `src/stage7-hud.js:113` `fixClear7` | stage 7 → "RETURN TO THE TITLE" | When `next === 8`: "… TO CONTINUE TO STAGE 8" |
| `src/stage7-hurt.js:5,9,16,24`, `src/stage6-hurt.js:9` | `stageNo === 7` | `stageNo >= 7`, so Stage 8 shares the single damage deadline (0.5 s) and the per-source cap. `capDamage7` stays scoped to `asmodean.*`; Stage 8 adds `lanfear.*` and `volley.*` caps in its own module |
| `src/rand-call.js:14` `callInFor` | `n >= 7 ? 'moilan' : …` | `n >= 8 ? 'matrand' : n === 7 ? 'moilan' : n === 6 ? 'rand' : 'loial'` |
| `src/bot-stage4.js:14` | dispatches on 7/6/5 | add `if (s.stageNo === 8) return stage8Bot(bot);` |
| `src/texture-pages.js:5` | `COMPACT_STAGES = new Set([4, 5, 6, 7])` | add `8` |
| `src/zone-stream.js` | `STREAMS[7]` | `STREAMS[8]` is assigned from `src/stage8-def.js`†, the way Stage 7 assigns its own row |
| `src/hud.js:32,36` (protected) | `STAGE_NAMES` stops at 5; the `speakerColor` regex has no Stage 8 villains | Patch from `src/stage8-hud.js`†, the way `paintStage7Hud`/the `stage7-hud.js:150` caption wrap does. Villain list: `LANFEAR|BLACK AJAH|SHAIDO`. Two own colours: **`LEWS THERIN` cracked gold `#d8b25a`** (a voice, not a person present) and **`TAIM` black-red `#e07a5f`** (an ally whose orders hurt, so it must not read as safe ally blue) |

**T1 acceptance:**
- Every existing test passes, except the Q1 pin if Jason approves changing it.
- The new golden for Stages 1–7 is unchanged. It is generated at `23ccf14` **before** the T1 edits.
- `?stage=8` without `s8=1` resolves to Stage 1.
- `callInFor(7) === 'moilan'` and `callInFor(8) === 'matrand'`.

---

## 1. Setting and story

### 1.1 Canon used, and where the game departs from it

**Canon** (*Lord of Chaos*, ch. 54–55, checked against Dragonmount recaps):
- Rand is taken from Cairhien by the Tower embassy. He is shielded by a rotating six-sister circle and carried
  folded up in a chest.
- At **Dumai's Wells** (three stone wells in a copse on open grassland) the embassy's wagons are attacked by
  Sevanna's **Shaido**. Their Wise Ones channel.
- **Perrin**, the Two Rivers men, Rand's Aiel and Maidens, the Mayeners and **Loial** come to rescue him. Then
  **Mazrim Taim** arrives through gateways with the Asha'man, and they turn the battle with earth and fire.
- Rand slips the shield in the chaos, with Lews Therin's voice in his head.
- *The Fires of Heaven*, ch. 53: at the Cairhien docks, **Moiraine** drags **Lanfear** through a **twisted redstone
  doorframe ter'angreal** into the world of the snake-like Aelfinn. Lanfear comes back later.

**Departures, called out on purpose:**
- **Lanfear at Dumai's Wells** is the game's own twist. Her motive (the crown, §1.9) is Jason's.
- **The six-sister circle holds Rand's shield *and* guards Twinkle Toes.** Breaking it frees both. This rolls the
  canon shield circle and Jason's "Black Ajah circle" into one beat.
- **Callandor** lies in the embassy wagon beside Rand's chest, taken as a prize. Rand tells Riley to take it (§1.6).
  In Stage 6 Rand took it in the outro, and Stage 7's Asmodean already mocks "a boy with a borrowed sword"
  (`st7_asmo_intro_01`), so this follows on.
- **Moiraine and Lan are absent** (Jason's decision). The story-in explains it (`st8_story_03`): between Stages 7
  and 8 Moiraine fell through the redstone doorway with Lanfear, which is canon, and only Lanfear came back. That
  is why Lanfear screams *"Not again!"* in the finale.
- **Mat Cauthon at Dumai's Wells** is the game's own (Jason's call-in choice). In canon he is elsewhere. He joins
  at the end of Z0 (§1.4), is the call-in until Rand breaks out, then stays on as a background fighter.
- **Taim is an ally whose volleys hit everyone in their path**: Shaido, allies and Riley (Jason's decision). That
  hints at his canon allegiance without revealing it. The arc plan's "TDOG"/Taim boss is dropped.
- **The six shield knots are a visible clock.** Rand, with Lews Therin's help, loosens three of the six knots
  himself while Riley fights (Z0 clear, the first volley survived, Z1 clear). The other three are the circle's
  three anchors (§2.6). The HUD shows six small shield pips (§3), so the player *causes* the breakout by
  progressing and the bot can assert it.

### 1.2 Story beats (the timeline of the whole stage)

| # | Beat | Where | Medium | Fallback if the video is missing or off |
|---|---|---|---|---|
| C1 | **The Box**: Rand in the chest argues with Lews Therin and strains against the shield; Riley reaches the ridge | story-in | video `stage8/intro`† (22 s, voiced) → panels `story8p1–p4`† | panels plus captions plus mp3s (the `STORY6_CLIP_LINES` skip rule: panels drop the lines the clip already voiced) |
| C2 | Perrin and Loial join | Z0 start, Z1 start | in-engine barks over the background allies | captions |
| C3 | **"Asha'man, kill!"** Gateways open and Taim arrives; the **first volley** | **Z0 wave 1 start** (about 20 s into play, so the signature hazard lands early) | video `stage8/taim`† (9 s) | in-engine: the gateway slits open on the `bg8mid` ridge, Taim's sprite raises his fist, caption |
| C2b | **Mat joins** and becomes the call-in | Z0 clear (in-engine tableau, play continues) | in-engine: Mat vaults a wagon tongue, ashandarei spinning | captions |
| — | **Shield pips**: Rand and Lews Therin loosen knots 1–3 | Z0 clear, first volley survived, Z1 clear | caption-only interludes over live play (§1.3a); a pip cracks, the chest thumps | captions |
| — | **Wolf-pack charge** | Z1, between waves (§2.3a) | in-engine set piece; optional Grok insert `stage8/wolves`† | in-engine |
| C4 | **The Circle**: Riley weakens it, Rand calls out "Callandor!", Riley takes the sword and breaks the circle | Z2 set piece (§2.6) | gameplay → video `stage8/circle`† (12 s) | in-engine scripted Callandor sequence (`s8callfx`, `s8dome` shatter, sisters knocked back) |
| C5 | Rand bursts out of the box; Mat hands the call over | right after C4 | in-engine (`s8chest` burst + `s6rand` stand pose) | — |
| C6 | **The Link**: Twinkle Toes takes Riley's hand | right after C5 | video `stage8/link`† (9 s) | panels `story8c1–c2`† |
| C7 | **Lanfear's motive**: she steps out at the redstone doorway | Z3 boss intro | in-engine live dialogue (`installBossCaption7` pattern) plus the flashback panel `story8m1`† | captions only |
| C8 | **Finale**: the queen scream, the linked fireball, the doorway, the sassy walk, "Too many snack breaks." | Lanfear at 0 HP | the playable final clash (§2.8) → video `stage8/finale`† (28 s) | panels `story8f1–f2`† plus mp3s, then the **playable outro walk** (§2.8): Riley walks right while Twinkle Toes does the sassy walk and lines 4–5 play |
| C9 | Outro, credits, **CAMPAIGN COMPLETE** | after C8 | code-drawn credits scroll over `s8credits`†, music `music-main.mp3` ("Hero's Quest", Jason's own Suno track; 0 new bytes) | — |

Every video is skippable with the existing `SKIP_ACTIONS`. Every line in a video is also shipped as an mp3, so a
skip, a stall or `?nocutscenes=1` loses no story: the matching panels play.

### 1.3 C1: the opening, "The Box"

Video shots are in §7. The panels are `story8p1` (the wells and the wagon circle at dawn), `story8p2` (inside
the chest), `story8p3` (Lews Therin's reflection) and `story8p4` (Riley from behind on the ridge).

| id | Speaker | Line | Delivery |
|---|---|---|---|
| `st8_story_01` | NARRATOR | "Cairhien was empty when Riley got there. The Tower embassy had taken the Dragon Reborn — shielded, folded into a wooden chest — and ridden hard for Tar Valon." | Low and even. "Folded into a wooden chest" lands as a cold fact |
| `st8_story_02` | NARRATOR | "They caught up at Dumai's Wells: three stone wells in a sea of grass, a ring of wagons, and the Shaido coming over every hill." | Building. A battle is about to start |
| `st8_story_03` | NARRATOR | "And somewhere between Cairhien and here, Moiraine had fallen through a twisted redstone doorway with Lanfear. Only one of them came back." | Quieter. A warning, not a cliffhanger sting |
| `st8_rand_box_01` | RAND | "Six of them. Always six, holding the shield. I can feel every one." | A strained whisper in the dark. Exhausted, still counting |
| `st8_lews_01` | LEWS THERIN | "Every shield has a seam. Feel for where the women tire." | Inside Rand's head: calm and courtly, too close to the ear (processing in §5.1) |
| `st8_rand_box_02` | RAND | "Get out of my head!" | Through his teeth. A burst, then breathless |
| `st8_lews_02` | LEWS THERIN | "It is my head too. Push. There — where the weave thins." | Patient, almost tender, with a crack of madness on "too" |
| `st8_rand_box_03` | RAND | "I can't… reach it!" | Straining. The pause is the effort, not drama |
| `st8_lews_03` | LEWS THERIN | "Then wait. Someone is coming. A boy who channels… and a girl who dances." | Soft, nearly a laugh. Spooky but kind |
| `riley_st8_story_01` | RILEY | "Rand's in that box. And Twinkle Toes is down there with them." | Flat and certain, looking down at the wagons |
| `riley_st8_story_02` | RILEY | "Okay. Final round." | Short. A deep breath before it |

### 1.3a Shield-pip interludes (caption only, over live play; 0 voice bytes)

Each one shows for 4 s in the caption slot while the `s8lews`† sigil pulses over the chest prop and a pip cracks.
They never pause play. Text-only keeps Lews Therin a voice in Rand's head (and is arguably eerier).

| Pip | When | Speaker | Caption |
|---|---|---|---|
| 1 | Z0 clear | LEWS THERIN | "One knot. Feel how she tires? Again." |
| 2 | first volley survived | RAND | "That's Taim. Hold on. Just… hold on." |
| 3 | Z1 clear | LEWS THERIN | "Three left, and they are not ours to untie. The boy must cut them." |
| 4–6 | each circle anchor broken (§2.6) | — | (no caption; the pip cracks and the chest thumps harder) |

### 1.4 C2: the allies arrive (in-engine barks)

| id | Speaker | Line | When | Delivery |
|---|---|---|---|---|
| `st8_perrin_01` | PERRIN | "Two Rivers! Loose!" | Z0 wave 0 spawn; the bowmen loose on the `bg8mid` ridge | A big man's shout that carries. Not a scream |
| `st8_perrin_02` | PERRIN | "Riley. Go — we'll hold the hill." | Z0 clear | Quiet, steady, a hand on the shoulder |
| `st8_loial_01` | LOIAL | "Riley! This is far too hasty — but I will hold this side!" | Z1 wave 0 | A deep rumble; flustered, then brave |
| `st8_perrin_wolves_01` | PERRIN | "Wolves — with me!" | the wolf-pack charge howl (§2.3a) | Deep and calm, then the howl SFX |

**C2b: Mat joins (Z0 clear, about 10 s, in-engine tableau; play continues and the camera holds).** Mat vaults a
wagon tongue, his ashandarei spins once and his hat improbably stays on.

| id | Speaker | Line | Delivery |
|---|---|---|---|
| `st8_mat_join_01` | MAT | "Dice have been rattling in my head for three days. Something lucky's about to happen — probably to me." | A grinning complaint. Fast, then the grin |
| `riley_st8_mat_01` | RILEY | "Mat?! What are you —" | Genuinely startled |
| `st8_mat_join_02` | MAT | "Rescuing Rand. Again. Call me when it gets thick." | The call-in contract in one joke. The HUD flips to `MAT READY` on "Call me" |

### 1.5 C3: "Asha'man, kill!"

| id | Speaker | Line | When | Delivery |
|---|---|---|---|---|
| `st8_taim_intro_01` | TAIM | "The Black Tower answers the Dragon Reborn." | the gateways open (Z0 wave 1) | Heavy baritone, sardonic, enjoying the entrance |
| `st8_taim_kill_01` | TAIM | "Asha'man, kill!" | end of C3, then the **first volley** (§2.4) | Full battlefield roar. "Kill" is hard and clipped |
| `riley_st8_taim_01` | RILEY | "Wait — which side are they killing?!" | after the first volley resolves | Genuinely alarmed, half a joke |
| `st8_taim_kill_02` / `_03` | TAIM | "Asha'man, kill!" | every later volley, rotating 01/02/03 with no immediate repeat | 02: a clipped bark. 03: cold and bored. **Same words every time** (Jason) |
| `riley_st8_volley_01` | RILEY | "Jump the dirt. Dodge the fire. Got it." | after the second volley, once | Coaching himself, the rule spelled out for the player |

### 1.6 C4: the Circle and Callandor

| id | Speaker | Line | When | Delivery |
|---|---|---|---|---|
| `st8_sister_01` | BLACK AJAH | "Hold the circle!" | the circle encounter starts | Cold command. Not a shriek |
| `st8_sister_02` | BLACK AJAH | "The Lady wants the girl unharmed. The boy, she did not mention." | first sister wave in Z2 | Precise, aristocratic, cruelty under calm. It sets up the Lanfear twist |
| `riley_st8_lady_01` | RILEY | "Who's 'the Lady'?" | right after | Suspicious |
| `st8_tt_circle_01` | TWINKLE TOES | "Bubby! They won't let me out!" | the dome is first shown | A little girl, scared but cross about it |
| `riley_st8_circle_01` | RILEY | "Hang on, Twinkle Toes!" | right after | Big-brother urgent |
| `st8_rand_callandor_01` | RAND | "Riley! Callandor — in the wagon. Take it!" | third anchor broken (§2.6) | From inside the chest: muffled and strained, but a command |
| `riley_st8_callandor_01` | RILEY | "Okay, glass sword. Show me what you've got." | grabbing the sword (video/in-engine) | Cocky over nerves |
| `riley_st8_circle_02` | RILEY | "Circle's broken!" | the dome shatters | Triumphant shout |

### 1.7 C5: Rand is free

| id | Speaker | Line | Delivery |
|---|---|---|---|
| `st8_rand_free_01` | RAND | "Free. Light, I'm free. Riley — call, and I'll come." | Weak, then steel. It echoes his Stage 6 sign-off (`st6_clear_03`) and tells the player the call-in has switched to Rand |
| `st8_mat_handover_01` | MAT | "And that's my luck spent. Rand's turn. Try to need less rescuing!" | Cheerfully retiring. It explains the handover so nobody wonders where Mat went; he stays as a background fighter |

Stage direction: Riley tosses Callandor up to Rand as he climbs out of the wreck. Rand catches it. That settles
where the sword goes, at no voice cost.

### 1.8 C6: the link

Canon: only a woman can open a link. Twinkle Toes starting it is both canon and her moment.

| id | Speaker | Line | Delivery |
|---|---|---|---|
| `st8_tt_link_01` | TWINKLE TOES | "Bubby, I can channel too! I've been practicing!" | Proud and fast, bursting to tell him |
| `riley_st8_link_01` | RILEY | "Since when?!" | Real shock |
| `st8_tt_link_02` | TWINKLE TOES | "Only a girl can start a link. Hold my hand!" | Bossy little sister, very sure of herself |
| `riley_st8_link_02` | RILEY | "Okay. Together." | Quiet. The emotional beat of the stage |

### 1.9 C7: Lanfear's motive (boss intro, live dialogue; tap or Esc advances, as Stage 7)

Panel `story8m1`† is shown full-screen during the two motive lines: a painted flashback of Twinkle Toes, from
behind, crowned at a jousting dinner show. The Medieval Times joke lands because Lanfear is *deadly serious*
about it; nobody laughs in-world until Riley, once.

| id | Speaker | Line | Delivery |
|---|---|---|---|
| `st8_lanfear_intro_01` | LANFEAR | "So this is the little queen." | Silky contempt. She looks down at a child |
| `st8_tt_lanfear_01` | TWINKLE TOES | "Who are YOU?" | Hands on hips, unimpressed |
| `st8_lanfear_motive_01` | LANFEAR | "A hall of painted knights, roast chicken and a paper crown — and they named YOU the Queen of Love and Beauty. At Medieval Times!" | Building outrage. "Medieval Times" spat out like a curse. Played for comedy |
| `st8_lanfear_motive_02` | LANFEAR | "I have been the most beautiful woman in the world for three thousand years. That title is MINE." | Wounded vanity turning to fury |
| `st8_tt_lanfear_02` | TWINKLE TOES | "It's a paper crown, lady." | Deadpan. Sassy |
| `riley_st8_lanfear_01` | RILEY | "You're jealous of a dinner show?" | Disbelief |
| `st8_lanfear_intro_02` | LANFEAR | "I will have that crown. And I will have her." | Cold again. Fire blooms in her hands. **Boss music starts** |

### 1.10 C8: the finale (Jason's exact lines, verbatim)

The order is fixed: the playable final clash (§2.8, P4), then the finale video or panels.

| Order | id | Speaker | Line (exact) | Delivery and staging |
|---|---|---|---|---|
| 1 | `st8_lanfear_final_01` | LANFEAR | "I am the queen of love and beauty!" | A raw scream at the sky, hair loose, fire swirling. It plays at 0 HP, as the final clash opens |
| 2 | (no line) | — | Riley and Twinkle Toes launch a huge linked fireball | The `s8duo` push pose; the fireball shoves her back into the redstone doorway (`s8door`) |
| 3 | `st8_lanfear_final_02` | LANFEAR | "Not again! Not the snake people! Ahhhhhhh!" | Real panic: fury, then recognition, then horror. The scream falls away as she drops into the shimmer. Golden slit eyes glint, then the doorway snaps shut. **Her silver crown bounces out, rolls, and stops at Twinkle Toes' feet. She doesn't pick it up. Hers is paper** |
| 4 | `st8_tt_final_01` | TWINKLE TOES | "Bubby you saved me! But what took you so long?" | Over her **sassy walk dance** (strut, straighten the crown with both hands, hip sway, one spin, hands on hips for the question), seen from behind. Delighted, then teasing |
| 5 | `riley_st8_final_01` | RILEY | "Too many snack breaks." | Dry, a shrug, and he flicks a candy wrapper over his shoulder. It calls back the Stage 1 Twix snack break (`twix_01`…`09`) |

### 1.11 C9: outro and credits

| id | Speaker | Line | Delivery |
|---|---|---|---|
| `st8_rand_clear_01` | RAND | "The Shaido are breaking. Riley — Twinkle Toes — thank you." | Tired and warm |
| `st8_perrin_clear_01` | PERRIN | "Let's get you two home." | Gentle. Perrin, Loial, Mat, Rand and the Asha'man line the ridge behind them |
| `st8_story_end_01` | NARRATOR | "The Wheel turns, and Riley brought his sister home. One day it will turn toward the Last Battle. But not today." | Warm and final. A smile on "not today" |

After the last line the **CAMPAIGN COMPLETE** card shows (code-drawn over the HUD card, a `fixClear7`-style
patch). Then a skippable credits scroll plays (`src/stage8-credits.js`†; any `SKIP_ACTIONS` key skips it), and
`next: () => ({ stage: 1, campaignComplete: true })` returns to the title.

---

## 2. Level

### 2.1 Zones (same 4-zone 5200 px geometry as Stages 6–7; `WORLD_W` is global and stays 5200)

| Zone | `at` / `l`–`r` | Place | Light | Waves (type, side, delay s) | Set piece |
|---|---|---|---|---|---|
| Z0 | 260 / 0–1280 | **The grass hills**: tall grass, a Two Rivers ridge, the gateway ridge behind | dawn, low gold from the left | `[[dancer,R,0],[dancer,L,1.4]]`, `[[stonedog†,R,0],[veiled,L,1.2],[dancer,R,2.4]]` | Shaido rise out of the grass (Stage 7 silhouette tell, 0.6 s, with no storm). Bowmen loose in the background. **C3 Taim arrival and the first volley at wave 1 start.** C2b Mat joins on clear |
| Z1 | 1500 / 1240–2520 | **The battle slope**: allies fighting everywhere; the Asha'man ridge | morning haze, smoke | `[[wiseone†,R,0],[dancer,L,0.8],[stonedog,R,1.6]]`, `[[veiled,R,0],[dancer,L,0.6],[wiseone,R,1.6],[stonedog,L,2.4]]` | **Wolf-pack charge** between waves (§2.3a). A ribbon drops on wave 0 |
| Z2 | 2800 / 2560–3840 | **The wells and the wagon circle**: three stone wells, Rand's chest on a wagon, the Black Ajah dome at the right edge | bright, smoke columns | `[[sister†,R,0],[dancer,L,0.8],[veiled,R,1.6]]`, `[[stonedog,L,0],[sister,R,0.6],[wiseone,R,1.6],[dancer,L,2.4]]` | **The Circle encounter** (§2.6) after wave 1, then C4–C6 |
| Z3 | 4140 / 3920–5200 | **The scorched ring** below the ridge; the **redstone doorway** stands at x≈4880 | noon smoke, the doorway's cold shimmer | boss | Lanfear (§2.8), linked mode (§2.7) |

- **Drops:** `lightning`, `fireshield`, `airwhip`, `angreal`, `ter?`, `lightning` (Stage 7 order).
  `bossDrop: { phase: 2, kind: 'saangreal' }`.
- **Ribbon:** Z1 wave 0. This is the last ribbon, with the caption "TWINKLE TOES' RIBBON — SHE'S CLOSE!".
- **Crates:** the Stage 7 baskets (`crateProp: 's7crate'`, `cratePlanks: 's7planks'`). They are reused, so no new
  art is needed.
- **Skip:** `skipBoss: { zoneI: 2, x: 3990, camX: 3500 }`, which the harness relies on. `?skip=boss` also skips
  C4–C6 and starts Z3 already linked.
- **`T` spawns** are not used. Shaido come in from the sides or out of the grass.
- **Target time** (bot, no deaths), about 7.8 min in total, about 6 min of it live play:

  | Segment | Target |
  |---|---|
  | Story-in | 40 s |
  | Z0 (including C3 and C2b, which run over play) | 60 s |
  | Z1 | 75 s |
  | Z2 | 60 s |
  | Circle | 45 s |
  | C4–C6 | 35 s |
  | Lanfear | 120 s |
  | Finale | 35 s |

  With these numbers about **7 volleys** fire per run (the first about 20 s into Z0).

### 2.2 Enemies: the Shaido roster, mapped onto shipped archetypes

Atlas fighters: **only `riley`** (compact normals). **There are no Trollocs, so `grunt` and `spear` are dropped,
which saves 32.90 MiB** (§8). Every enemy is a painted `Stage7Fighter` drawn 1:1 with no normals. The new types
live in `src/shaido8.js`† and `src/blackajah.js`†. They are registered as `STAGE8_ACTORS`†, like
`src/stage7-actors.js`.

| Type | Archetype it copies | HP | Speed | Behaviour | Tell | Score |
|---|---|---|---|---|---|---|
| `dancer` (spear-dancer) | `Dancer` in `src/shaido.js`, **reused unchanged**, `s7dancer` | 60 | 150 | flank, then a 300 px lunge | kneel, veil up, 0.45 s | 450 |
| `veiled` (bow) | `Veiled`, **reused**, `s7veiled` | 40 | 120 | keeps 420–620 px away; 1 arrow per band; two archers never fire within 0.6 s | bow draw 0.6 s | 350 |
| `stonedog`† (Stone Dog, buckler and spear) | the Whitecloak zealot (`ZEALOT` in `src/whitecloaks.js`): front guard, a blocks-to-break count, shield charge | 90 | 95 | **Plants and holds ground** (Stone Dogs never retreat): it never backs off more than 40 px. Its buckler blocks light and medium hits from the front. **Breaking it:** 3 blocked hits, a throw, a back attack, a runkick or a fireball. Broken, it is open for 1.8 s at ×1.3 damage taken. **Buckler rush:** 0.5 s tell, 420 px/s for at most 0.9 s, 10 damage plus knockdown, `counterUsed` latch | buckler raised and flashing, 0.5 s | 500 |
| `wiseone`† (Shaido Wise One, channeler) | the cultist caster (`src/cultists.js` `casterBusy` one-chant gate): ranged, its chant broken by hits | 55 | 90 | Keeps 400–600 px away. **Only one Wise One may chant at a time.** It alternates between two attacks. **Fire bolt:** travels along her band at 380 px/s, 8 damage, and Riley's fireball pops it. **Earth burst:** a 72 px ring under Riley's last spot, 1.0 s tell, 10 damage plus knock-up, jumpable. Any hit during the 1.2 s chant cancels it and dazes her for 1.0 s | hands glow and the chant SFX plays (1.2 s); a ground ring shows for the burst | 550 |
| `sister`† (Black Ajah) | the Stage 9 sister from `CAMPAIGN-ARC-PLAN.md` §3.3: a weave shield plus an air bind through the grab system | 70 | 90 | Keeps 300–500 px away. **Weave bubble:** absorbs fireball and lightning. 3 melee hits pop it, she is open for 3 s, then re-weaves (1.0 s tell). **Air bind:** a 0.8 s pale ribbon tell along her band, then Riley is held for 1.2 s. Wiggling breaks it (`GRABBED`, `releaseHold('break')`). **Only one binder at a time**, and a bind counts as an attack token | ribbon shimmer, 0.8 s | 600 |

- **Caps:**
  - at most 2 attack tokens;
  - at most 1 Wise One chanting;
  - at most 1 sister binding;
  - at most 2 ranged shots (arrow or bolt) in flight that aim at Riley's band.
- **Humans never die.** At 0 HP every type yields: it kneels, then fades over 0.8 s (`Stage7Fighter` already draws
  `yield`). Hazards and call-ins drop humans to 1 HP or less and make them yield. They never produce ash.
- **SFX only, no speech, for the Shaido.** Shouts, ululations and the chant are synthesised in
  `src/stage8-sfx.js`†, copied from `src/stage7-sfx.js`.

### 2.3 Allies (background and foreground; never part of the combat rules)

| Layer | Who | How it is drawn | Rules |
|---|---|---|---|
| Background loops (plate depth, scrollFactor 0.4–0.6) | Two Rivers longbowmen (Z0), Rand's Aiel and **Maidens of the Spear** (Z0–Z2), Mayener lancers as a silhouette line on `bg8far`, **Asha'man** line on the ridge (Z0–Z3) | 3-frame loops from `s8allies`† and `s8ashaman`†, the `s6def` Defender pattern (`src/stage6-view.js`, alpha 0.85, depth 980) | No collision, untargetable, 0 lights. During a volley tell the Asha'man line plays its cast frames, which is part of the telegraph (§2.4) |
| Lane vignettes (at most 2 at once) | **Perrin** vs a Shaido; **Loial** vs two Shaido; a Maiden pair | `s8perrin`†/`s8loial`†/`s8allies` duel loops on the **back lane only** (y = `LANE_TOP + 6`), at a zone edge, at least 380 px from Riley | Desaturated 25% with an ally-blue rim (`0x9fd8ff`, the HUD ally colour). They never hold tokens, never count toward a wave clear and are never hit by Riley. They fade out if Riley comes within 220 px. Dropped at governor quality 2 or above |

**Taim's volley hits the allies too (Jason).** It is visual only: during the tell, allies in a doomed lane dive
toward the clear lane half a second before Riley must move (the allies *are* the tutorial); any still in a doomed
lane when the earth passes are knocked flat and get up in the aftermath. Allies have no HP, so this never changes
a rule or a number.
| Foreground strip (scrollFactor 1.15) | grass tufts, a broken banner, the silhouette of a Two Rivers bowman kneeling in the bottom corner | `bg8fg`†/`bg8fg2`† image strips | Only below y = 700 (under `LANE_BOT` 690) and never above 20% of the screen height. Dropped at quality 3 or above |

Ally barks are Perrin's, Loial's and Mat's lines in §1.4. Allies speak nowhere else, to keep the mix clear.

### 2.3a The wolf-pack charge (Perrin's set piece; `src/stage8-allies.js`†)

Scripted, never player-triggered (there is no spare button). It runs once in Z1 between waves 0 and 1, and once
at Lanfear's P2 gate, where it answers her adds.

- **Tell (1.2 s):** Perrin's howl (`st8_perrin_wolves_01` plus the howl SFX) and paw-print dust along one
  `VOLLEY_BANDS` lane. The lane is chosen with the seeded `pick` and is never Riley's lane at tell start.
- **Charge:** five wolves and the **big grey lead wolf** (`s8wolves`†, the lead drawn at 1.6×) cross at 700 px/s.
  Every Shaido in the lane is knocked down for 15 damage (never below 1 HP, so humans still only yield) and
  **herded** 120 px toward screen centre. Riley profits by herding Shaido into the lane first, then standing
  clear.
- **Riley in the lane** is jostled (a small push, 0 damage). His own side's wolves never hurt him.
- Wolf KOs do not feed combo, saidin or the call recharge. Lights 0. `s8wolves` is deferred (§8.2).

### 2.4 The Taim volley: "Asha'man, kill!" every 60 s (`src/stage8-volley.js`†)

```js
export const VOLLEY8 = Object.freeze({
  every: 60,            // seconds of live combat time on kit.clock (paused, story, cutscene, call strike excluded)
  first: 6,             // the first volley fires 6 s after C3 ends (Z0 wave 1), so the player meets it early
  tell: 3.0,            // voice + banner + lane marks + rumble before the earth enters
  earthSpeed: 1100,     // px/s across the screen, from the camera edge on the volley's side
  earthWidth: 140,      // ridge thickness along x
  earthClear: 70,       // Riley is safe from earth if z >= 70 as the front passes (a jump started <= 0.25 s before)
  earthDmg: 10,         // + knockdown, one hit per volley (counterUsed latch)
  fireLag: 0.4,         // fire ignites 0.4 s behind the earth front, on the same lanes
  fireBurn: 1.6, fireFade: 0.4,  // no damage while fading
  fireTick: 0.4, fireDmg: 4, fireTicksMax: 3,
  capPerVolley: 14,     // hard cap on Riley damage from one volley
  enemyEarth: 25, enemyFire: 10,  // it hits everyone: Shaido and sisters too; humans yield, never die
  postponeMax: 4,       // seconds a volley may wait for a fair moment, else it skips to the next cycle
  bands: 2,             // doomed lanes out of the 3 VOLLEY_BANDS; one lane is always safe
});
```

**Timeline of one volley** (t = 0 is the start of the tell):

| t (s) | What the player sees and hears | Readability rule |
|---|---|---|
| 0.0 | TAIM `st8_taim_kill_0n`. HUD flash slot: `ASHA'MAN, KILL! — FIND THE CLEAR LANE`. The `s8banner`† icon (Taim's raised fist) appears at the top centre. The Asha'man line on the ridge raises its hands | voice, text and motion together; the banner always shows, even with reduced flashes (`calm7()`) |
| 0.0–3.0 | **Ground cracks glow** red-orange along the two doomed lanes (`s8tell`†, pulsing faster as t rises). The **safe lane stays clean** and gets a soft white chevron at each screen edge. Rumble SFX rises. A dust plume shows at the origin edge | lanes are full `VOLLEY_BANDS` strips, so a mark can never be missed |
| 3.0 | **Rolling earth** (`s8earth`†) enters from the origin edge and crosses the doomed lanes at 1100 px/s, about 1.2 s across the screen. The origin side alternates by zone (left in Z0/Z2, right in Z1/Z3), so the read never goes stale | the ridge is a tall, obvious wall; jumping it is a fallback |
| 3.4–5.0 | **Fire** (`s8fire`†) ignites behind the earth front on the same lanes and burns 1.6 s, then fades 0.4 s | in the safe lane you are untouched by both |
| 5.4 | Clear. If Riley took no damage: `CLEAN DODGE +200` | — |

**There are two ways out**, and both are taught by `riley_st8_volley_01`:
1. Stand in the **clear lane**: no earth and no fire.
2. In a doomed lane, **jump the earth**, then step out before the fire. Fire hits only a grounded Riley.

An active **Fire Shield** pickup (`powers.active('fireshield')`, the check `src/balthamel.js:22` already uses)
blocks the **fire** half only. The earth still has to be dodged, so the pickup helps without erasing the read.

**Fairness rules** (each one is unit-tested in T6):
- **The safe lane** is chosen with the seeded `pick`, and is Riley's current lane or an adjacent one at the tell
  start. Riley moves 125 px/s in depth and a lane is about 39 px, so it is always reachable in ≤ 0.65 s, well
  inside the 3.0 s tell. It is never the same lane three volleys in a row. It is never a lane that holds a live
  bind ribbon, bolt or boss band tell.
- **No volley starts** while Riley is grabbed, held or bound, `down`/`getup`, in a call strike, in a cutscene or
  live dialogue, during a boss phase change, during a clash (§2.8), or within 2.0 s of another hazard's damage
  frame. If that lasts more than `postponeMax`, the volley is skipped and the 60 s cycle restarts.
- **During the Lanfear fight** she raises a sphere at the tell start and **makes no attacks** until the fire has
  faded. The arena never stacks two hazard sources.
- **Damage** goes through `strikeRiley` (`source: 'volley.earth'`/`'volley.fire'`), so the shared 0.5 s damage
  window (`src/stage7-hurt.js`, generalised in T1) applies. Hits are capped at 14 per volley. A downed Riley is
  not `vulnerable` (`src/riley.js:29`), so earth plus fire can never chain.
- **The volley hits everyone (Jason).** Earth does 25 plus knockdown to enemies, fire does 10 per tick. That makes
  it a crowd tool for players who lure Shaido into the doomed lanes, the same idea as the Stage 7 street rings.
  Volley KOs give half score and **do not** feed combo, saidin or the call recharge (Riley's own KOs only, the
  `rand-call.js` rule). Allies are knocked flat, visually (§2.3). A raised sister bubble absorbs the damage but
  **pops** (§2.6). Once linked, Twinkle Toes moves with Riley, so she is never in a doomed lane without him and is
  never shown struck.
- **Lights:** 0 for the earth and fire sprites (unlit additive) and 1 shared flash light at the earth front. The
  total stays ≤ 10.
- **Bot gates:**
  - at most 25% of Stage 8 deaths happen inside a volley window;
  - the freeze-frame check (§10) finds the tell visible on 10 of 10 volley hits.

### 2.5 Other hazards
- **Wise One earth burst and fire bolt** (§2.2).
- **Shaido grass ambush** (Z0): an enemy that spawns from the grass shows the 0.6 s silhouette first and has no
  hitbox meanwhile. This reuses the `e.silhouette` handling in `Stage7Kit.step`.
- No sandstorm, ring or column carries over from Stage 7. The volley is the stage's signature hazard.

### 2.6 The Black Ajah circle encounter (Z2, after wave 1; `src/stage8-circle.js`†)

```js
export const CIRCLE8 = Object.freeze({
  sisters: 6, anchors: 3,          // 3 of the 6 are lit "anchors" at any time; break 3 anchors total
  anchorHits: 3,                   // pop the anchor's bubble with 3 melee hits ...
  anchorOpen: 3.0, anchorHp: 40,   // ... then 40 HP in a 3 s window; she yields, the next sister lights
  whipEvery: 4.5, whipTell: 1.0, whipDmg: 8,   // air-whip down one band from a lit anchor; one band always free
  bindEvery: 9, maxBinders: 1,
  addEvery: 12, addMax: 1,         // one Shaido add at a time (dancer or veiled), so the circle stays readable
  timeout: 75,                     // anti-softlock: after 75 s the circle staggers anyway
  callandorWait: 2.0,              // after the 3rd anchor: CALLANDOR prompt; walking to the wagon or 2 s idle triggers C4
});
```

- **Layout.** Six sisters stand in a ring around Twinkle Toes under a translucent dome (`s8dome`†) at
  x≈3620–3800. The dome is invulnerable and blocks movement, the way a zone edge does. The three lit anchors glow
  white-blue. Twinkle Toes (`s8twink` pose `captive`) presses her hands to the dome.
- **The loop:**
  1. Pop a lit anchor's bubble (3 hits).
  2. Hit her for 40 HP inside the 3 s window. She yields out of the link and the next sister lights.
  3. Do this 3 times.

  The dome cracks one stage per broken anchor (`s8dome` frames 0 → 1 → 2), and each broken anchor cracks one of
  the last three shield pips over Rand's chest (§1.3a).
- **The finish is a cutscene (Jason).** After the 3rd anchor:
  - Rand calls out (`st8_rand_callandor_01`) and Callandor glows in the wagon at x≈3360 (`s6call` frame 1, reused).
  - The HUD flash says `CALLANDOR — TAKE IT!`.
  - Walking to the wagon, or 2 s passing, triggers C4: video `stage8/circle`, or the in-engine sequence. In that
    sequence Riley raises Callandor (`s8callfx`† blaze), a white lance hits the dome, the dome shatters (`s8dome`
    frame 3 plus shard burst) and all six sisters are thrown back and yield.
- **Fairness:**
  - at most one whip band is live and one band is always free;
  - binds follow the one-binder rule;
  - volleys still run and hit everyone outside the dome. A volley pops a lit anchor's bubble (no HP damage), which
    opens her 3 s window: a reward for luring, never a skip. The dome itself holds, so Twinkle Toes is never in it;
  - **Mat's call pops any bubble or buckler** in Riley's band (§3): he is the anti-sister call, which is why the
    circle comes before he hands over to Rand;
  - no damage reaches Riley during the cutscene or the 2 s after it;
  - the timeout means the encounter can never soft-lock.
- **After C4:**
  1. C5: the chest bursts (`s8chest`† frames 0 → 2). Rand stands (`s6rand` frame 1), says `st8_rand_free_01`, Mat
     says `st8_mat_handover_01`, and the call-in provider switches from Mat to Rand with one fresh charge (§3).
  2. C6: the link video, or panels.
  3. Linked mode turns on, Z2 clears and the camera unlocks.

### 2.7 Linked mode: Riley and Twinkle Toes (`src/stage8-link.js`†)

**Control parity.** The inputs, timings and hurtbox are identical. Linked mode changes only what the existing
actions *do* and how they *look*. A test asserts that the set of actions read by the scene is identical with link
on and off, and that Riley's hurtbox and `RILEY_DEF` are untouched.

| | Unlinked (Z0–Z2) | **Linked** (after C6 through the finale) |
|---|---|---|
| Visual | Riley atlas | Riley atlas, unchanged, **plus Twinkle Toes at his back shoulder** (`s8twink`†, chest height, 52 px behind him and 6 px deeper, same facing, depth −1). She is drawn **from behind or side-back with her long hair over her face**, so the camera never sees it. A **link tether** (`s8link`†) is a thin gold-white braid between their hands. A soft shared aura is **1 light**. **Duo poses** (`s8duo`†, both from behind) **replace** Riley's sprite only during the clash and the finale |
| Twinkle Toes pose map | — | Riley `idle/walk/run` → `idle/skip×2/run×2`; `squat/air` → `hop`; `combo1–3/back/runkick` → `cheer`/`spark` (combo3); `cast` → `channel×2`; `hurt` → `brace`; `down/getup` → `kneel` beside him with a shielding shimmer; `grabbed` → `pull` (cosmetic). She is untargetable, never takes damage and is never shown struck |
| Combo finisher (`combo3`) | as `src/riley.js` `ATK.combo3` | plus a **spark**: one Twinkle Toes lightning hop to the nearest other enemy within 260 px, 6 damage, no knockdown (`LIGHTNING` visuals from `src/powers.js`) |
| Special (fireball) | `spawnFireball` (`src/stage1.js:451`), 14 damage (20/26 with angreal/sa'angreal), costs 34 saidin | **Linked fireball:** a hook on `scene.spawnFireball` tags each ball `linked`. It does ×1.3 damage (18/26/34), draws 1.3× bigger with a blue-white lightning spiral, and **costs 28** through a hook on `powers.castCost`. **A linked fireball beats a Lanfear small fireball** in a clash (§2.8) |
| Meter (`saidin`) | +3 per landed hit (`landedHit`, `src/riley.js:245`) | ×1.5 per hit, through an instance hook on `riley.landedHit`, plus **+2 saidin/s** passive ("Twinkle Toes feeds the link") |
| Power (balefire) | `BALEFIRE` cost 100 | unchanged rules; the beam is tinted gold-white |
| HUD | — | `twinkPortrait`† at 30×30 beside Riley's saidin bar, with the label `LINKED` and the bar tinted gold-white. These are kit-owned display objects in the HUD scene (the `src/stage7-hud.js` `bindStage7Hud` pattern), so `src/hud.js` changes by 0 bytes |

All the hooks go through `hook7` (`src/stage7-lifecycle.js:82`), so they are restored by identity on `destroy()`.
**`?skip=boss` starts linked.**

### 2.8 Boss: Lanfear, Daughter of the Night (`src/lanfear.js`†, `src/stage8-clash.js`†)

```js
export const LANFEAR = Object.freeze({
  hp: 760, speed: 96, reach: 160, score: 15000,
  gates: Object.freeze([0.66, 0.33]),   // + a final gate at 1 HP: she cannot reach 0 except through the P4 clash
  bolt: Object.freeze({ speed: 420, dmg: 8, tell: 0.55 }),          // small fireball along a band
  great: Object.freeze({ tell: 1.6, speed: 260, dmg: 14 }),        // band-locked great fireball (P3)
  mirror: Object.freeze({ every: 12, copies: 2, last: 6, copyHp: 1 }), // P1 mirror crowns; copies deal 0 damage
  step: Object.freeze({ shimmer: 0.6 }),                           // gateway step between two marks
  grab: Object.freeze({ tell: 0.6, speed: 520, dmg: 12, tantrum: 1.05 }), // P2 crown grab dash; a dodge = tantrum window
  stars: Object.freeze({ tell: 0.9, r: 70, dmg: 10, max: 3 }),     // falling fire stars (P2)
  clash: Object.freeze({ window: 4.0, need: 2.0, press: 0.25, win: 0.06, stun: 2.0, push: 120, failDmg: 14 }),
  damageCap: 14,       // per 0.5 s, the capDamage7 rule extended to 'lanfear.*'
});
```

**Damage gates.** The `src/asmodean.js:299–308,359` gate clamp is copied: damage clamps at the next gate until
the phase beat fires, and every lethal route (throws, powers, call-ins, volleys) respects the gate.

| Phase | HP | Moves | Counterplay |
|---|---|---|---|
| **P1, "The Daughter of the Night"** | 100–66% | **Small fireballs** along bands, a 3-shot fan with one band always free, every 3.5 s. **Mirror crowns** every 12 s: she splits into three crowned Lanfears for up to 6 s (the `src/myrddraal.js` `FadeCopy` frame budget, without its fear aura). Only the real one casts a shadow and wears a **silver** crown; the copies wear gold **paper** crowns (her own vanity gives her away). Copies have 1 HP, deal 0 damage, and their fireballs gutter out at 200 px. **Gateway step** between two marks, with a 0.6 s shimmer | Each linked fireball **cancels** a small fireball head-on (a clash burst), so this is the start of the **fireball duel**. Twinkle Toes teaches the copies once (`st8_tt_mirror_01` "Silver crown's the real one!"). Hitting a copy costs only time. Punish her after each fan |
| **P2, "Queen of Love and Beauty"** (`st8_lanfear_p2_01` "A carnation from a knight on a horse?! I ruled the Age of Legends!") | 66–33% | She conjures a **crown of fire** over her head (`s8star` ring), then **falling fire stars**: up to 3 ground rings with a 0.9 s tell. **Crown grab** every 7 s: a 0.6 s tell (her hand reaches, eyes on the crown), then a 520 px/s dash along Riley's band, 12 damage. She is reaching for the crown, never touching the girl. Adds: `[dancer, veiled]` at the gate, answered by the **wolf-pack charge** (§2.3a), then `[stonedog, dancer]` at +6 s. Fans continue at half rate | Stars hit Shaido too. **Dodge the grab** (change band or jump) and she skids into a 1.05 s **tantrum**, a free punish window. The adds feed the meter for P3 |
| **P3, "The Fireball Duel"** (`st8_lanfear_p3_01` "Enough games. Burn, both of you!") | 33% → 1 HP | Every 8 s: a **great fireball**. She levitates and charges it for 1.6 s (charge pose plus a band line), then launches it down **Riley's band**. Between greats: fans and gateway steps | Two answers. **Dodge:** change band during the tell. **Clash:** cast a linked fireball into it. A clash opens the **push window** (below). Success: she is stunned 2.0 s, takes 6% (clamped) and is **pushed 120 px toward the doorway**. Failure: 14 damage plus knockdown |
| **P4, the final clash** (at 1 HP, scripted, can't be failed) | — | `st8_lanfear_final_01`. Both sides throw everything: a full-width beam struggle between her fire and the duo's huge linked fireball | Push for 2.0 s **inside an unlimited window**. It auto-completes after 6 s with no input, so it is accessible. Then C8 |

**The push window (the clash).** It is pure rules in `src/stage8-clash.js`†, so it can be unit-tested:
- The push meter fills by **0.25 s per `special` press** (`inp.take('special')`). It also fills **continuously
  while `special` is held** on keyboard or touch (`inp.held`/`inp.touchHeld`, read-only use of the existing
  `Input` fields).
- **Mashing at 4 presses/s fills exactly as fast as holding.** So touch, keyboard and pad all reach it with the
  same buttons, and the 250 ms lag bot can pass.
- **Success** is 2.0 s of push inside the 4.0 s window. While a clash runs, nothing else can hurt Riley: the world
  freezes except the two fireballs and the duo sprite (`kit.freezesWorld()`).
- **The doorway grows nearer.** Lanfear's anchor x moves +120 px per successful clash, clamped at x≈4800, so the
  P4 push into the doorway reads as the payoff of the whole phase.

**Defeat.** At 1 HP after P3 the P4 clash runs. Then:
1. Lanfear (`s8lanfear` frames `pushed` → `fall`) skids into `s8door`†, which plays shimmer → swallow → close.
2. `st8_lanfear_final_02` plays, the doorway goes dark, and her silver crown (`s8crowns`†) rolls to Twinkle Toes'
   feet.
3. C8 plays: the finale video, or panels `story8f1–f2` followed by the **playable outro walk**. In the walk,
   enemies and hazards are off, the music goes to `clear`, and Riley is controllable walking right while Twinkle
   Toes does the sassy walk (`s8twink` frames `sass×4`) and lines 4–5 play. Reaching x 4900, or 20 s, ends it.
   If the video played, the walk still runs, without the lines the video voiced.
4. Then C9.

The boss is "bound" in the same sense as Stage 7: she is defeated, not killed.

**Calls in the boss fight.** Rand (§3) can stagger her for 6% max HP, clamped at the gate, once per phase. **He
cannot clash and cannot trigger P4.**

**Bot fairness** (same gates as Stages 6–7):
- the boss time with calls on is **70–102%** of the time with calls off;
- the campaign bot clears **9/9** seeds;
- the 250 ms lag bot clears **≥ 8/9** and passes **every** clash it attempts through presses alone;
- volley and boss attacks never overlap (an invariant checked every frame).

### 2.9 Tuning summary (every number above, in one place)

| System | Key numbers |
|---|---|
| Shaido | dancer 60 HP / 150 speed; veiled 40 / 120; stonedog 90 / 95, 3 blocks to break, 1.8 s open, rush 10 dmg; wiseone 55 / 90, chant 1.2 s, bolt 8, burst 10; sister 70 / 90, bubble 3 hits, bind 1.2 s |
| Volley | first at Z0 wave 1, then a 60 s cadence, 3.0 s tell, earth 10 + knockdown (jumpable at z ≥ 70), fire 4 per 0.4 s ×3 (Fire Shield blocks fire only), cap 14 per volley, 2 of 3 lanes doomed; hits everyone |
| Wolves | 1.2 s tell, 700 px/s, Shaido 15 dmg + down + 120 px herd, Riley 0 dmg; Z1 once and the P2 gate once |
| Circle | 3 anchors × (3 bubble hits + 40 HP in 3 s), whip 8 every 4.5 s, timeout 75 s |
| Link | fireball ×1.3 damage, cost 28; meter ×1.5 plus 2/s; combo3 spark 6; aura 1 light |
| Lanfear | 760 HP; gates 66/33/1 HP; fans 8 dmg; mirror crowns every 12 s (2 copies, 1 HP, 0 dmg); crown grab 0.6 s tell / 12 dmg / 1.05 s tantrum; great 14 dmg / 1.6 s tell / every 8 s; clash 2.0 s push in 4.0 s, 0.25 s per press; stun 2.0 s; 6% per clash |
| Calls | Mat, then Rand; 1 charge, 10 KOs **and** 45 s to recharge, 4 calls per stage, 1 per boss phase, a fresh charge at the switch, boss 6% clamped |

---

## 3. Call-ins: Mat first, then Rand (`src/mat-call.js`†)

Jason's addendum: **Mat Cauthon is the call-in first, then Rand** once he breaks out of the box. Perrin and Loial
are battlefield allies (§2.3), not call-ins; Moiraine and Lan sit the stage out, and Stage 8 does not import
`src/moilan-call.js` or `src/call7-cutscene.js` (T8 asserts it).

This is the same charge engine as `CALL7` (`src/moilan-call.js`), copied into a new pure module with the
constants swapped, as T8 of Stage 7 did. There is **one `CALL` button and one shared charge pool**. The provider is
a pure function of story state and **switches once**, at C5.

```js
export const CALL8 = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 4, perPhase: 1,
  bossFrac: 0.06, humanFrac: 0.6, humanDown: 1.6, humanYield: 0.4,  // every Stage 8 enemy is human:
  eliteFrac: 0.75, eliteDown: 2.0,                                 // a call makes any human at <= 40% HP yield
  inv: 2, stagger: 1, gates: Object.freeze([0.66, 0.33]),
  mat: Object.freeze({ time: 1.1, kos: 5 }),                       // spear dash down Riley's band
});
export function provider8(randFree) { return randFree ? 'rand' : 'mat'; }   // read at spend time
```

- **Mat** (Z0 clear → C5; `s8mat`†): Mat dashes the length of Riley's band spinning the ashandarei (1.1 s, world
  frozen). Humans take 60% of current HP and are downed 1.6 s (never lethal; at ≤ 40% they yield). **Elites**
  (a Stone Dog with buckler up, a sister with bubble up) have the buckler or bubble **popped** and take 75%, down
  2.0 s: his foxhead medallion eats the weave, which makes Mat the anti-sister call before the circle.
  - **Luck is costume, never power.** A seeded roll (`rand` from `src/config.js`) picks the *presentation*: a high
    roll is a spear **sweep**, a low roll is a **dice scatter** (dice bounce down the band, the medallion flares).
    A test asserts both deal identical damage to identical targets. The HUD portrait shows the last roll's pips.
- **Rand** (C5 → end): the `src/rand-call.js` strike (`randEffect`, `allocateStrikes`) with the Stage 8 boss
  fraction of 6%, clamped at the next gate, plus 1.0 s stagger. The barks are the shipped `rand_call_01..05`, so
  there are no new voice bytes for his strike.
- **The switch** grants **one fresh charge** and resets the per-phase count. `maxCalls` is 4 (not Stage 7's 3)
  because there are two providers and the stage is longer: a typical clear is 2 Mat plus 2 Rand. The per-phase
  count is keyed by boss phase, so the fresh charge can't double up a phase.
- **Refusals spend nothing** and play `riley_st8_wait_01` (2.5 s gap): no hittable foe, balefire active, strike
  running, boss beat, victory pending, paused or in a cutscene. A call breaks any hold (`releaseHold('break')`).
  Only Riley's own KOs recharge it (not volleys, wolves or calls).
- **Clips:** Mat **M1–M3** (new, Grok, §7.3) and Rand's shipped `assets/cutscenes/rand/R1–R3` (no new Rand bytes).
  They play through `src/call8-cutscene.js`†, a copy of `src/rand-call-cutscene.js` with one shuffle bag per
  provider (`rwb-call8-bag-mat`†, and the existing `rwb-rand-bag`). Only the **current provider's** next clip is
  prefetched as a single blob; at C5 the Mat blob is revoked. Strikes never wait on a clip.
- **HUD:** the call slot paints the current provider's portrait at 4 Hz: `MAT READY` / `MAT 6/10` with
  `matPortrait`†, flipping to `RAND READY` with the existing `randPortrait` at C5. The help text reads `CALL: Mat`
  before C5 and `CALL: Rand` after. **Six shield pips** (10 px diamonds, code-drawn) sit under the slot until C5.
- **Riley's call lines:** `riley_st8_call_01` "Mat! Your luck!", `riley_st8_call_02` "Rand, now!".
- **Mat's barks** (rotating): `st8_mat_call_01` "Time to roll the dice!", `st8_mat_call_02` "Snake eyes for
  *them*!".

---

## 4. Art

### 4.1 Rules
- **Pipeline:** ChatGPT image generation on a flat chroma key, run through `tools/stage8/process_art.py`†. It is a
  copy of `tools/stage7/process_art.py` (which reuses the Stage 6 processor) with new `JOBS`. Sources are kept
  verbatim in `art-in/stage8/*.src.png`. Outputs are:
  - `assets/stage8/{chars,props,ui,story}`† and `assets/bg8/`†;
  - `assets/stage8/ART_STATUS.json`† and `src/stage8-painted.js`†, written by `--write-status`.
- **"Best art in the game" is funded by memory, not by luck.** Dropping `grunt` and `spear` frees 32.90 MiB (§8),
  so all Stage 8 cast sheets are processed at **`--res 1.25`** (about 1.56× the pixels of Stage 7), and plates are
  1280 wide instead of 1024. Each sheet is generated in **its own new chat**, with the house-style reference
  attached (`styleref-painted-draghkar-fade-on-magenta.png` from `docs/stage5/BOSS_ART_PROMPTS.md`). Re-roll the
  whole sheet if any one pose fails; never mix generations.
- **Jason's drafts come first.** Jason is already drafting Lanfear, Rand in the box, Taim, a Shaido Stone Dog
  spearman, Wise Ones, Asha'man, Perrin, Loial, Mat and the wolves. T15 drops each finished draft into
  `art-in/stage8/` and processes it as that key's source if it passes the checks below. The §4.3 prompts are for
  the keys he has not drafted and for re-rolls, and they double as the written spec his drafts are checked
  against.
- **Riley is never repainted for gameplay and never attached to a prompt.** The duo sheet and the story panels
  describe him in words, **from behind only**.
- **Twinkle Toes (Kenzie): face never shown, anywhere** (§0.1a). Every gameplay pose, portrait and panel is from
  behind, side-back with her long hair over her face, in silhouette or turned away. Describe her in words only:
  **no photo or image of her is attached to any prompt**, including the old poster
  `assets/cutscenes/twinkletoes.jpg`.
- **"Best art" quality checks** (in `process_art.py` and by eye before processing):
  - exact pose count and order, all facing right, nothing touching, no key colour on the figure, weapons attached
    to hands;
  - zero halos: flood-fill plus chroma-spill suppression and a 1 px premultiplied edge, so dark hair, black coats
    and gold glows have no magenta or green fringe against the smoke backdrops;
  - baseline lock: feet at 0.96 of the cell in every frame of `s8lanfear`, `s8twink` and `s8duo`, so nothing
    hops between idle, attack, clash and sassy-walk frames;
  - **no child's face in any frame** (a single one fails the whole sheet).
- **Palette:**

  | Colour | Hex |
  |---|---|
  | dawn gold | `#e9b45a` |
  | grass straw | `#b9a35e` |
  | smoke grey | `#7d7a74` |
  | Asha'man black | `#15161b` |
  | volley ember | `#ff7a2a` |
  | earth umber | `#6b4a2e` |
  | saidar white-blue | `#cfe6ff` |
  | Lanfear silver | `#dfe3ea` |
  | redstone | `#8e3326` |
  | doorway shimmer grey | `#9aa3a8` |
  | Twinkle Toes pink | `#ef81a2` (the ribbon light colour in `src/stage7.js` `dropRibbon`) |

- **Key colours.** Use **magenta** unless the subject holds magenta, pink or violet. **Twinkle Toes** (pink) and
  **Callandor/One Power FX** (violet-white) go on **green**, which is the Stage 3/6 lesson. Every prompt says which
  colours the subject must never contain.

### 4.2 House style (paste into every sheet prompt; from `docs/stage5/BOSS_ART_PROMPTS.md`)

```
Create ONE landscape image in 3:2 format: a character pose sheet for a 2D side-scrolling beat-'em-up video game.

LAYOUT
- Background: perfectly flat, solid {KEY} filling the whole image. No gradient, no floor, no ground shadow, no vignette, no texture.
- Draw the SAME character exactly {N} times, full body from head to feet, in {R} rows: {ROWS}.
- Space the poses evenly with wide gaps. No figure may touch or overlap another figure or the image edge.
- All figures at exactly the same scale. Standing height about {H}% of the image height. In each row, every figure's feet rest on the same invisible straight line.
- Every pose faces RIGHT (side view or slight three-quarter view) unless the pose says otherwise.
- No text, letters, numbers, labels, captions, borders, frames, panels or grid lines anywhere.

STYLE
Hand-drawn HD 2D fighting-game sprite art in the spirit of Streets of Rage 4: confident near-black ink outlines (thicker on the outer silhouette, thinner inside), clean cel shading with 2-3 tone steps and subtle painterly gradients, soft key light from the upper left, a faint cool rim light on the right edge. Rich but grounded colours and a strong readable silhouette. Not pixel art, not 3D, not photoreal, not chibi.
Match the drawing style, ink weight and shading of the attached reference. Do not copy those characters.

Keep every glow INSIDE the figure's outline unless the pose says otherwise: no halos, bloom, sparks, smoke, beams or particles on the background. No blood, no wounds, no injuries.
```

Safe wording (from Stages 3–6): glowing hands, channelling, recoiling, kneeling, pushed back, stumbling. Avoid
hits landing, wounds and bodies.

### 4.3 The prompts (the CHARACTER and POSES blocks; LAYOUT and STYLE from §4.2)

**A1. Lanfear (`s8lanfear`, magenta, N = 22, rows 6/6/5/5, H = 34).** *The centrepiece. Generate 3 times and
pick the best.*
```
CHARACTER: an immortal sorceress queen from a dark fantasy epic, who looks like a strikingly beautiful woman in her early thirties.
- Tall, regal and proud; she moves like royalty and fights like a storm. Purely a villain: imperious, vain, theatrical. Not flirtatious, not seductive.
- Long, glossy dark hair worn loose, with small silver crescent moons and silver stars set in it, and a slim silver crown. Dark, intense eyes. A cold, perfect smile.
- An elegant, modest gown of white and silver silk: high neck, long FITTED sleeves (not bell sleeves, not wide or flowing at the wrist), a long flowing skirt with silver embroidery of stars, a silver belt. Silver slippers.
- Her magic is fire: bright orange-gold flame held in her hands, white-hot at the core.
- Colour rules: absolutely no magenta, pink, violet or purple anywhere on her. Fire is orange-gold-white only.
POSES (left to right, top row first)
1 idle, chin high, one hand raised with a small flame. 2-5 a four-step gliding walk. 6 casting a small fireball, palm thrust forward.
7 a three-fireball fan: both hands sweeping, three small flames leaving her fingers (flames inside the outline). 8 mirror: standing very straight, both hands lifting her crown slightly, as if checking it in a mirror.
9 stepping through an invisible doorway, half turned, robe swirling. 10 crown of fire: both hands raised above her head, a ring of small flames floating there like a crown.
11 levitating, arms wide, a large fireball forming between her hands at chest height (keep it inside her silhouette). 12 launching the great fireball, whole body thrust forward.
13 pushing against something huge with both palms, feet sliding, hair blown back (the clash). 14 hurt: recoiling, one arm up.
15 staggered: off balance, hair wild, gown scorched at the hem (no wounds). 16 furious: fists clenched, screaming at the sky, flames whirling around her arms.
17 sneering at someone small below her. 18 lunging forward low and fast, one hand reaching ahead for something just out of reach. 19 pushed backward off her feet, arms flung forward, skidding.
20 falling backward, flailing, mouth open in a scream. 21 kneeling, exhausted, one hand on the ground. 22 regal standing pose for the HUD portrait crop, three-quarter view.
```

**A2. Twinkle Toes, the linked companion (`s8twink`, green #00FF00, N = 18, rows 6/6/6, H = 22).**
```
CHARACTER: a little girl, about eight years old (third grade), the hero's little sister: brave, bossy, funny and very sassy.
- Long, dark, wavy hair, past her shoulders.
- A pink dance-recital outfit: pink leotard, short layered pink tutu, white tights, pink ballet slippers.
- A small gold PAPER crown on her head, slightly crooked: her proudest possession.
- Her magic is the One Power: soft white-gold light and small blue-white sparks in her hands.
- HER FACE IS NEVER VISIBLE IN ANY POSE: every pose is seen from behind or from a side-back three-quarter view with her long hair covering her face. If a pose would show her face, turn her further away.
- Stylised, friendly, readable at small size. Not a likeness of any real child.
- Colour rules: absolutely no green anywhere on her. Pink, white, gold and blue-white only.
POSES (every one from behind or side-back, hair over the face): 1 idle, hands on hips. 2-3 skipping. 4-5 running. 6 hopping up. 7 cheering, both fists up. 8 spark: one hand flung forward, a small blue-white spark (inside the outline).
9-10 channelling: both hands forward, glowing white-gold. 11 bracing, arms up. 12 kneeling, hands up, a faint shimmer. 13 pulling on something with both hands, leaning back.
14 captive: standing, both palms pressed flat against an invisible wall in front of her, her back to the viewer.
15-18 sassy walk: a confident strut cycle, hips swinging, crown straightened with both hands, one spin with her hair flaring, last frame hands on hips. Poses 15-18 seen FROM BEHIND (her back to the viewer).
```
Her size: when drawn beside Riley in-engine and in the duo sheet, the top of her crown reaches about his chest.

**A3. The duo (`s8duo`, green, N = 6, rows 3/3, H = 34).** *This is the combined Riley and Twinkle Toes art.*
```
CHARACTERS (both in every pose, side by side, BOTH SEEN FROM BEHIND, three-quarter rear view, facing into the scene toward the right):
- a muscular sixteen-year-old boy: short dark hair, the arms of blue glasses visible over his ears, a sleeveless black long coat to the calf, black fingerless gloves, black trousers and boots. His face is never visible.
- the little girl from A2 (long dark wavy hair, pink recital outfit, gold paper crown), about chest height to the boy, her face never visible.
- Colour rules: no green anywhere.
POSES: 1 holding hands, a white-gold glow where their hands meet. 2 joined hands raised, a large fireball forming above them (inside the outline).
3 both thrusting forward together, a huge fireball leaving their hands. 4 leaning into a push with both arms forward, feet braced (the clash).
5 standing together relaxed, the boy shrugging. 6 the girl mid-twirl beside the boy.
```

**A4. The Shaido (`s8stonedog` N = 12, `s8wise` N = 11, magenta, one image each, H = 36).**
- **Stone Dog:** *"a desert warrior in loose grey-brown layered coat and trousers (cadin'sor) in the colours of
  sand and rock, soft laced boots, a shoufa head-wrap with a dark veil across the face up to the eyes and a red
  band, a round hide buckler and a short heavy spear; broad and immovable."* Poses: idle with buckler up, walk×4,
  block flash, buckler rush×2, guard broken (buckler knocked wide), hurt, kneel/yield, down. No magenta.
- **Wise One:** *"a stern older desert woman in a dark brown wool skirt, white blouse, dark shawl, many ivory and
  gold necklaces and bracelets, long greying hair held back by a folded scarf; no veil."* Poses: idle, walk×4,
  chant×2 (hands glowing orange), fire bolt cast, earth burst cast (palm down), dazed, kneel/yield. Glows stay
  inside the outline.

**A5. Black Ajah sisters (`s8sister`, green, N = 16 = 2 designs × 8, rows 8/8, H = 34).**
- **A:** *"a cold, stern noblewoman of indeterminate age, smooth ageless face, dark hair in a severe knot, a
  high-necked deep-blue riding dress, a long shawl with black fringe."*
- **B:** *"a younger, sharp-featured woman, ageless face, a grey silk dress, the same black-fringed shawl, a
  serpent ring on her hand."*
- Poses each: idle, walk×2, channel (pale white-blue hands), air-whip fling, bubble raised (hands crossed), hurt,
  kneel/yield.
- No green. Channel glow pale white-blue.

**A6. Perrin and Loial (`s8perrin` N = 8, `s8loial` N = 8, magenta, H = 34 / 44).**
- **Perrin:** *"a very broad-shouldered young blacksmith of about twenty, curly brown hair, a short curly beard,
  striking golden-yellow wolf eyes, a plain brown coat over a leather vest, a heavy smith's hammer in his hands
  and a half-moon-bladed axe hanging at his belt; quiet strength."* Poses: idle, run×2, hammer overhead, hammer
  strike, axe sweep, point "go", a fight loop vs an unseen enemy.
- **Loial:** *"a gentle giant scholar about three times a person's width and half again as tall, long tufted ears,
  wide nose, long drooping eyebrows, a long coat with bulging pockets full of books, a long-hafted woodsman's axe."*
  Attach a frame of the shipped Loial art (`assets/chars/loial-*.webp`; not Riley, so this is allowed) and say:
  *"keep this character's look exactly"*. Poses: idle, run×2, axe wind-up, axe sweep, apologetic shrug, cheer,
  fight loop.

**A6b. Mat and the wolves (`s8mat` N = 10, `s8wolves` N = 8, magenta, H = 34 / 18).**
- **Mat:** *"a lanky, laughing young man of about twenty, a wide-brimmed hat, a long brown coat, a silver
  fox-head medallion on a thong at his neck, and a long spear with a curved sword-like blade and ravens worked
  into the black shaft."* Poses: idle leaning on the spear, run×3, spin-sweep×2, dice toss, hat tip, vault,
  laughing stagger. Portrait from the idle head.
- **Wolves:** *"a single grey wolf, lean and fast"* in run×4, leap, skid-stop and sitting-howl poses, plus *"a much
  larger, older grey wolf with a scarred muzzle"* idle and run, drawn as the pack leader and processed at 1.6×
  cell. Keep them noble, never snarling at the viewer.

**A7. Asha'man and Taim (`s8ashaman` N = 12 = 2 × 6, `s8taim` N = 6, magenta, H = 34).**
- **Asha'man:** *"young men in plain black high-collared coats with a small silver sword pin at the collar, black
  trousers and boots, close-cropped hair."* Poses: stand, march, both hands raised channelling (orange-gold glow
  plus heaving-earth grit at their feet, inside the outline), fist pump, kneel-cast, cheer.
- **Taim:** *"a hawk-nosed man in his forties, dark hair, cold dark eyes and a thin smile, a black high-collared
  coat with blue-and-gold dragons twining up both sleeves, a silver sword pin and a red-and-gold dragon pin at the
  collar."* Poses: stand with arms crossed, raised fist shouting a command, channel, stepping out of a doorway of
  light, pointing, portrait pose. No magenta.

**A8. Allies (`s8allies`, magenta, N = 9 = 3 loops × 3, H = 30).**
- Two Rivers longbowman loosing (draw, release, nock).
- Maiden of the Spear dancing with spear and buckler, veiled.
- Aiel warrior striking with a short spear.
- Every figure wears **a narrow pale-blue armband**, so allies read apart from the Shaido (their red band).

**A9. One Power and hazard FX (green; props sheets, one per prompt line).** These use the props layout from
`docs/stage6/ART.md` §2: each element on its own, fixed rows, and **glows allowed** for these sheets only.
- `s8earth`: a rolling wall of heaved earth and rock seen from the side, 6 cells (rising, cresting ×3, breaking,
  dust).
- `s8fire`: a tiling lane of low ground fire, 4 cells.
- `s8tell`: a glowing crack line, 2 cells.
- `s8bolt`: a Wise One fire bolt, plus an earth-burst ring ×2.
- `s8fireball`: Lanfear's small fireball ×2, great fireball ×2, clash burst ×2.
- `s8clash`: a horizontal beam-struggle strip where fire meets white-gold light.
- `s8link`: a gold-white braided tether strip, plus an aura ring.
- `s8callfx`: a crystal sword's white blaze ×2, plus a wide white slash arc.
- `s8dome`: a translucent pale white-blue dome, intact / cracked / heavily cracked / shattering into shards.
- `s8weave`: a sister's bubble ×2, plus an air-bind ribbon.
- `s8star`: a falling fire star, plus its ground ring.
- `s8crowns`: a gold paper crown (the mirror copies wear it, swapped onto the `s8lanfear` head anchor; copies are
  the same sheet tinted pale, so there is no second Lanfear sheet), a slim silver crown upright, and the same
  silver crown lying on its side (the finale roll).
- No green in any element.

**A10. Redstone doorway and Rand's chest (`s8door` N = 4, `s8chest` N = 3, green).**
- **Doorway:** *"a tall doorframe of dark red stone, standing alone, its frame strangely twisted as if wrung like
  wet cloth, carved with worn spirals; inside the opening a rippling silver-grey shimmer like heat over water."*
  States: dormant (dark opening), shimmering, swallowing (the shimmer bulging inward, with a faint glint of pale
  golden slit-pupilled eyes deep inside), closed and smoking.
- **Chest:** *"a large iron-bound wooden chest on a wagon bed"*. States: shut with a faint white-blue shimmer
  leaking from the cracks, the lid bulging, the lid blown open with light.

**A11. Portraits (`lanfearPortrait`, `matPortrait`, `taimPortrait`, `twinkPortrait`; 1:1, opaque dark
backgrounds).** Run each in the same chat as its sheet, using the `docs/stage5/BOSS_ART_PROMPTS.md` Prompt 3
pattern, so the face matches. `twinkPortrait` is head and shoulders **from behind**: long dark wavy hair and the
gold paper crown, no face.
- `s8banner`: Taim's raised fist with blue-gold dragon sleeve.
- `s8credits`: a 16:9 dawn panorama of the wells with the allies resting.

**A12. Backgrounds (`assets/bg8/`, opaque or magenta-sky as each layer needs; single scenes).**
- `bg8far` (1280×580): dawn sky over rolling golden grassland. A far line of Mayener riders and Shaido dust.
  Smoke columns, driven by a code tint from dawn to noon.
- `bg8mid` (1280 wide, keyed sky): grassy hills with a ridge of Two Rivers bowmen in silhouette.
- `bg8mid2`: a battle slope churned to mud, scattered banners, and a high ridge where black-coated men stand.
- `bg8mid3`: a copse of trees around **three round stone wells**, a ring of covered wagons, and one wagon with an
  iron-bound chest.
- `bg8mid4`: a scorched ring of grass below the ridge, open sky, room for the doorway prop at the right.
- `bg8floor`/`bg8floor2`/`bg8floor3` (1280×360): trampled grass, mud and scorch, a stone well-yard with a scorched
  ring.
- `bg8fg`/`bg8fg2` (1280×160, keyed): foreground grass tufts, a broken banner pole, a kneeling bowman silhouette.
- `bg8smoke` (1024×256): a tiling smoke drift.

**A13. Story panels (three 2×2 grids at 1280×720 per panel, 10 panels; magenta gutters; Riley and Twinkle Toes
only from behind, her face never shown).**
- Grid 1: `story8p1` the wells and the wagon circle at dawn; `story8p2` inside the chest, a red-haired young man
  straining in thin blades of light; `story8p3` a translucent older man's face reflected in a brass buckle beside
  him; `story8p4` Riley from behind on the ridge.
- Grid 2:
  - `story8m1`: a jousting dinner-show arena, knights on horseback, a crowd at long tables. A little girl seen from
    behind, long dark wavy hair, wears a gold paper crown and a sash while a spotlight finds her. In a dark
    balcony, a regal woman in silver watches, furious.
  - `story8c1`/`c2`: the link, a small hand and a gloved hand joining in light.
  - `story8f1`: the push into the doorway.
- Grid 3:
  - `story8f2`: the doorway snapping shut, a silver crown rolling away from it.
  - `story8f4`: brother and sister from behind looking over the wells as the Shaido retreat (the CAMPAIGN COMPLETE
    card backdrop).
  - The fourth cell is a spare re-roll of whichever panel came out weakest.
  - (`story8f3`, the sassy walk, is not a panel: the walk is played in-engine, §2.8.)

### 4.4 Key list, sizes and residency (decoded RGBA = w × h × 4; cast at `--res 1.25`)

| Key | Content | Cells / size | Decoded cap | File cap | Resident when |
|---|---|---|---|---|---|
| `s8lanfear`† | Lanfear, 22 poses | ≤2560×360 | 3.52 MiB | 220 KB | Z3; loads on Z2 wave 1 clear (`demand7` pattern) |
| `s8twink`† | Twinkle Toes, 18 poses | ≤1920×288 | 2.11 | 130 KB | Z2–Z3 |
| `s8duo`† | duo, 6 poses | ≤1536×400 | 2.34 | 140 KB | on link (C6) to the end |
| `s8stonedog`† | Stone Dog, 12 | ≤1536×320 | 1.88 | 110 KB | Z0–Z3 |
| `s8wise`† | Wise One, 11 | ≤1408×320 | 1.72 | 100 KB | Z1–Z2 |
| `s8sister`† | 2 sisters × 8 | ≤2048×320 | 2.50 | 140 KB | Z2 only, released at C6 |
| `s8perrin`†, `s8loial`† | ally vignettes, 8 + 8 | ≤1280×320, ≤1280×384 | 1.56 + 1.88 | 90 + 100 KB | Z0–Z2 vignettes, released at C6; `s8perrin` reloaded for the outro |
| `s8mat`† | Mat (call strike, C2b), 10 | ≤1280×320 | 1.56 | 90 KB | Z0 clear (C2b), released at C6; reloaded for the outro line-up |
| `s8wolves`† | wolf pack + lead wolf, 8 | ≤1536×192 | 1.13 | 60 KB | each charge only (Z1, P2 gate), released after |
| `s8ashaman`†, `s8taim`† | 12 + 6 | ≤1536×288, ≤960×320 | 1.69 + 1.17 | 90 + 70 KB | Z1–Z3 |
| `s8allies`† | 3 loops × 3 | ≤1408×256 | 1.38 | 80 KB | Z0–Z3 |
| `s8lews`† | translucent ghost face (in-engine C1 fallback) | 512×640 | 1.25 | 45 KB | story only |
| `s8earth`†, `s8fire`†, `s8tell`† | volley | 6×256×192, 4×256×128, 2×512×64 | 1.13 + 0.50 + 0.25 | 60 KB total | Z1–Z3 |
| `s8bolt`†, `s8weave`†, `s8dome`† | casters, circle | 3×192², 3×256², 4×512×384 | 0.42 + 0.75 + 3.00 | 120 KB total | Z1–Z2; dome released at C6 |
| `s8callfx`†, `s8chest`† | Callandor, chest | 3×384², 3×256×192 | 1.69 + 0.56 | 70 KB | Z2 only |
| `s8fireball`†, `s8clash`†, `s8star`†, `s8link`†, `s8crowns`† | boss FX | 6×192², 1024×128, 2×192², 1024×96 + 256², 3×128² | 0.84 + 0.50 + 0.28 + 0.63 + 0.19 | 100 KB total | Z2 (link) – Z3 |
| `s8door`† | redstone doorway, 4 states | 4×288×512 | 2.25 | 110 KB | Z3 |
| `lanfearPortrait`†, `matPortrait`†, `taimPortrait`†, `twinkPortrait`†, `s8banner`† | UI | 136² ×4, 256×128 | 0.41 | 5 KB each | always |
| reused: `s7dancer`, `s7veiled`, `s6rand`, `s6call`, `s7crate`, `s7planks`, `s7ribbon`, `s7arrow`, `randPortrait` (Loial is no longer a call-in, so `loial-portrait` is not loaded) | | | (existing) 1.25 + 1.15 + 0.69 + 0.39 + … | 0 | as in their stages |
| `bg8far`†, `bg8mid..mid4`† | plates | 1280×580 | 2.83 each | 140 KB each | streamed: current + next zone |
| `bg8floor..floor3`† | floors | 1280×360 | 1.76 each | 130 KB each | streamed |
| `bg8fg`†, `bg8fg2`†, `bg8smoke`† | parallax foreground and haze | 1280×160 ×2, 1024×256 | 0.78 ×2 + 1.00 | 60 KB each | zone pairs; dropped at quality ≥ 2/3 |
| `story8p1–p4`†, `story8m1`†, `story8c1–c2`†, `story8f1–f2`†, `story8f4`†, `s8credits`† | panels | 1280×720 jpg | 3.52 each, transient | 220 KB each | only during their scene; at most 4 at once; freed before gameplay resumes |

**Asset count:**
- **55 new painted assets** for Stage 8:
  - 14 cast sheets (adds `s8mat` and `s8wolves`);
  - 14 prop/FX sheets (adds `s8crowns`);
  - 5 UI images (`matPortrait` replaces the old `perrinPortrait`);
  - 11 backdrop layers (5 plates, 3 floors, 2 foreground strips, 1 haze);
  - 10 story panels plus the credits backdrop.
- They come from 14 prompt groups (A1–A13 plus A6b), about 27 generated images in all, minus whatever Jason's
  drafts already cover.
- **9 reused** shipped keys.
- Plus **8 videos** and 1 optional insert with posters (§7), **2 music loops** (§6) and **65 new voice lines**
  (§5).

---

## 5. Voice

### 5.1 Cast (all existing setups reused where they exist)

| Speaker | Voice | Source in the repo |
|---|---|---|
| RILEY | ElevenLabs `eleven_v4`, **DYLO – Dark Anime Hero** `JjsQrIrIBD6TZ656NQfi`. Processing: trim, highpass 70 Hz, loudnorm I=-17.5 TP=-2, mono 24 kHz 64 kbps | `tools/riley_voice.py`, `assets/audio/riley-voice-manifest.json` |
| NARRATOR | Jason's consented clone: CosyVoice 3 (`Fun-CosyVoice3-0.5B`) zero-shot, -18 LUFS mono 24 kHz 96 kbps, Whisper `medium.en` check | `tools/jason-narrator/` (`narrator-lines.json`, `LINES.md`) |
| RAND | ElevenLabs Voice Design **"Rand al'Thor (RWB)"** `4KhtxLynQ7oUlA9AtWmc` | `tools/stage6/voice-render.json` |
| LEWS THERIN† | New Voice Design: *"Male, 40s, refined and courtly, weary and haunted, half-whisper with sudden flashes of madness."* Then an **in-head** chain: highpass 120 Hz, lowpass 6.5 kHz, `aecho=0.6:0.5:35|70:0.22|0.12`, -19 LUFS. This is the only Stage 8 voice with added echo | new |
| TWINKLE TOES | Her **established synthetic Kokoro cast**: 75% `af_bella` + 25% `af_heart`, speed 1.08, pitch 1.14, same processing. **No recording or clone of any real child.** Jason approves every take by ear; a vetoed take ships caption-only (the voice-files list makes that free) | `assets/audio/VOICE_PROVENANCE.md` "Approved casting" |
| LOIAL | His established Kokoro cast: `bm_george`, speed 0.90, pitch 0.86 | same |
| PERRIN† | New Voice Design: *"Big, quiet young man, slow and deep, gentle but heavy, a rural edge; never shouts unless he must."* | new |
| MAT† | New Voice Design: *"Quick, laughing young man, rural lilt, always half a joke ahead of trouble; warm under the complaints."* | new |
| TAIM† | New Voice Design (wording from `CAMPAIGN-ARC-PLAN.md`): *"Commanding, sardonic, heavy baritone, menace held in check."* Three takes of the same line | new |
| LANFEAR† | New Voice Design: *"Regal adult woman, rich contralto, imperious and theatrical, wounded vanity flaring into rage; elegant, never flirtatious."* | new |
| BLACK AJAH† | New Voice Design (Galina from the arc plan): *"Cold, precise, aristocratic woman; cruelty under calm."* | new |
| SHAIDO | SFX only | `src/stage8-sfx.js`† |

**Pronunciation hints** (TTS text only, never captions; Jason confirms them by ear):

| Word | Hint |
|---|---|
| Dumai's Wells | doo-MY'S WELLS |
| Asha'man | AH-shah-mahn |
| Lanfear | LAN-feer |
| Lews Therin | LOOZ THEH-rin |
| Callandor | KAL-an-dor (Stage 6) |
| Perrin | PEHR-rin |
| Loial | LOY-ahl |
| Shaido | SHY-doh |
| Taim | TAME (Jason confirms by ear; audiobooks vary) |
| Bubby | BUB-ee |
| saidar | sah-ih-DAHR (not spoken) |
| Tar Valon | TAR VAL-on |

- Every line is recorded in `tools/stage8/voice-render.json`† (the `tools/stage7/voice-render.json` format), with
  Whisper `medium.en` and up to 5 re-rolls.
- A missing mp3 shows the caption only. `src/stage8-voice-files.js`† lists the present ids, like
  `src/stage7-voice-files.js`.

### 5.2 Line list (ids; the exact text and delivery are in §1 and §3)

**Prefix `st8_` / `riley_st8_`.** The audit regex is `/^(st8_|riley_st8_)/`. **65 new lines**, budget
`65 × 200 KiB = 13,312,000` (cap 200 KiB per line). Rand's call barks reuse the shipped `rand_call_01..05`. The
shield-pip interludes (§1.3a) are captions only, 0 bytes.

| Group | ids | Speakers | Count |
|---|---|---|---|
| C1 opening | `st8_story_01..03`, `st8_rand_box_01..03`, `st8_lews_01..03`, `riley_st8_story_01..02` | NARRATOR, RAND, LEWS THERIN, RILEY | 11 |
| C2 allies, Mat, wolves | `st8_perrin_01..02`, `st8_loial_01`, `st8_perrin_wolves_01`, `st8_mat_join_01..02`, `riley_st8_mat_01` | PERRIN, LOIAL, MAT, RILEY | 7 |
| C3 and volleys | `st8_taim_intro_01`, `st8_taim_kill_01..03`, `riley_st8_taim_01`, `riley_st8_volley_01` | TAIM, RILEY | 6 |
| Sisters and circle | `st8_sister_01..02`, `riley_st8_lady_01`, `st8_tt_circle_01`, `riley_st8_circle_01..02`, `st8_rand_callandor_01`, `riley_st8_callandor_01` | BLACK AJAH, RILEY, TWINKLE TOES, RAND | 8 |
| C5 and C6 | `st8_rand_free_01`, `st8_mat_handover_01`, `st8_tt_link_01..02`, `riley_st8_link_01..02` | RAND, MAT, TWINKLE TOES, RILEY | 6 |
| C7 motive | `st8_lanfear_intro_01..02`, `st8_lanfear_motive_01..02`, `st8_tt_lanfear_01..02`, `riley_st8_lanfear_01` | LANFEAR, TWINKLE TOES, RILEY | 7 |
| Boss fight | `st8_tt_mirror_01` "Silver crown's the real one!" (first mirror split; bossy, pointing), `st8_lanfear_p2_01` "A carnation from a knight on a horse?! I ruled the Age of Legends!", `st8_lanfear_p3_01` "Enough games. Burn, both of you!", `st8_lanfear_hurt_01` "You dare?!" (first clash won), `st8_lanfear_clash_01` "You push against ME?" (first great fireball), `riley_st8_clash_01` "Twinkle Toes — push!" (first clash, delivery: urgent), `st8_tt_clash_01` "I'm pushing!" (first clash; strained, determined), `riley_st8_linkfire_01` "Together — fire!" (first linked fireball; shouted) | LANFEAR, RILEY, TWINKLE TOES | 8 |
| Calls | `riley_st8_call_01..02`, `riley_st8_wait_01` "Not yet — give it a breath.", `st8_mat_call_01..02` | RILEY, MAT | 5 |
| C8 finale (exact) | `st8_lanfear_final_01..02`, `st8_tt_final_01`, `riley_st8_final_01` | LANFEAR, TWINKLE TOES, RILEY | 4 |
| C9 outro | `st8_rand_clear_01`, `st8_perrin_clear_01`, `st8_story_end_01` | RAND, PERRIN, NARRATOR | 3 |

Lines spoken inside a video are **also mixed into that clip** (as `stage6.mp4` voices `st6_story_01–04`). The
matching panels skip them when the clip played, using the `STORY6_CLIP_LINES` rule in `src/stage6.js:34`.

---

## 6. Music (Suno)

**The firewall (addendum; read this first).** Jason supplied his original "Asha'man Kill" Suno song, and **it must
never be used in the game**. It is a **feel reference only**: a driving battle chant with call-and-response
"Asha'man, kill!" energy. So:
- The original **never plays in the game**, is **never copied into `assets/` or anywhere in the repo**, and is
  **never uploaded to Suno as a Cover, Persona, Inspo, audio reference or remix source**. Jason may listen to it
  in his own account while he writes the new prompt. (The planner cannot hear it, so the target feel is written
  out below.)
- Both Stage 8 tracks are **brand-new Suno songs** with new lyrics and new melodies, generated by **Jason in his own
  Suno account** from the prompts below. An agent cannot stand in for this step.
- **Reject any take that recognisably quotes the original's hook** or melody. That is the failure the firewall
  exists to prevent.
- T14 adds an audit check: no file in the repo is, or references, the original audio.

The repo's one shipped Suno track, `assets/audio/music-main.mp3` ("Hero's Quest" by jfeldman9,
`AUDIO_PROVENANCE.md`), is unrelated and plays only over the credits (below).

| Track | `music-stage8.mp3`† "Asha'man, Kill! (Dumai's Wells)" | `music-boss8.mp3`† "Queen of Love and Beauty" |
|---|---|---|
| How | A **new** Suno song from the style prompt and the original lyric sheet below. Generate **at least 4 takes**; Jason picks by ear on a phone speaker (the Stage 6 device rule) | A **new** Suno song. Suno **Persona/Inspo** may be taken from the *new* stage track (never the original), so the choir and drums carry over. At least 4 takes |
| Style prompt | `nordic folk metal, epic battle war chant, 120 bpm, D minor, deep male throat-sung choir, gang shouts, frame drums and taiko, tagelharpa and hurdy-gurdy drone, low distorted strings, female kulning call, cinematic, driving` | `dark symphonic folk metal, 140 bpm, E minor, regal villain theme, soaring wordless female soprano, deep nordic male choir answering, harpsichord-like ostinato, war drums, brass, building to a massive final section` |
| Tempo / key | **120 BPM, D minor** (dorian colour in the chant) | **140 BPM, E harmonic minor** |
| Loop | **30 bars = 60.000 s**: `loopStart 0.25`, `loopEnd 60.25`, gain 0.90, -16.0 LUFS, peak ≤ -2 dBFS. **One loop equals one volley cycle**, so the hazard and the song share a pulse. The game never syncs to audio time (Stage 7 §10) | **40 bars = 68.571 s**: `loopStart 0.25`, `loopEnd 68.821429`, gain 0.94, -15.2 LUFS. **Write the P3 intensity into the second half of the loop**: the game does not swap tracks per phase (the `boss5` note in `docs/stage5/VOICE-SCRIPT.md`) |
| Vocals in a loop | The **"Asha'man — KILL!" refrain sits on bars 1–2 and 17–18 only**. The rest is wordless chant, so dialogue stays clear. Ask Suno for an **instrumental version too** (or stems), the fallback under voiced scenes | Wordless only, with no lyrics, so nothing fights Lanfear's lines |
| Budget | ≤ 1,200,000 bytes (112 kbps, 60.5 s ≈ 850 KB) | ≤ 1,200,000 (≈ 970 KB) |

**Lyric sheet for the stage track.** It is written new for this game (only the two-word order "Asha'man, kill!"
comes from the books), and every line is short, so Suno can chant it. If Suno's vocals fight dialogue, ship the
**instrumental render** of the winning take for `stage8`; the chant must never mask Taim's own order.
```
[Intro: low drone, frame drum heartbeat]
[Chant — deep male choir] Hey! — Ha! — Hey! — Ha!
[Verse — half-spoken, throat singing]
Black coats on the ridge, and the grass is burning
Three stone wells, and the Wheel is turning
[Pre-chorus — choir rising]
Seize the fire — break the earth —
[Chorus — gang shout, huge]
ASHA'MAN — KILL!  ASHA'MAN — KILL!
[Post-chorus — female kulning call, wordless]
[Bridge — drums only, then choir]  Hey! — Ha! — (spoken, low) The Dragon calls.
[Final chorus]  ASHA'MAN — KILL!
```
(Write "AH-shah-mahn" in the Suno lyric box if the first takes mispronounce it.)

**Processing:**
- `tools/stage8/loop_music.py`† is a copy of `tools/stage6/loop_music.py` with `TRACKS` for `stage8`/`boss8`. It
  takes a beat-aligned start, whole bars, a 0.35 s equal-power crossfade, ±8 ms lag refinement, and the
  `[last 0.25 s] + loop + [first 0.25 s]` layout at 112k.
- Check the result with `python3 tools/music/check_loops.py OUT_DIR`.
- The manifest goes in `tools/stage8/music-manifest.json`†, using the `tools/music/music-manifest.json` fields
  (`file, bpm, bars, loopStart, loopEnd, loopSeconds, lufs, peakDbfs, bytes, doc`).
- Register `MUSIC.stage8`/`MUSIC.boss8` in `src/stage8.js`, with a `validateLoop` guard copied from
  `src/stage7-audio.js` `guardLoop7`.
- **Credits** use `music-main.mp3` ("Hero's Quest"). It is Jason's first Suno track bookending the campaign, at 0
  new bytes.
- **Provenance:** add the new Suno song URLs, the plan tier and the commercial-use note to
  `assets/audio/AUDIO_PROVENANCE.md`, and archive the exact prompt text in `tools/stage8/music-brief.md`†. The
  provenance entry states that the original "Asha'man Kill" was a listening reference only and is not in the
  game.

---

## 7. Video cutscenes (Google Flow / Grok Imagine)

### 7.1 Rules (hard)
- **Never name a character or a real person in a prompt.** Flow refuses names, and names pull TV-cast likenesses.
  Describe only. Reject any take that resembles a TV actor.
- **Riley only from behind**, in every frame, as every clip in `assets/cutscenes/ART_STATUS.json` records. Reject
  any take where his head turns past profile or any part of his face shows, even blurred.
- **Twinkle Toes from behind or in silhouette, always** (addendum): back of the head, long dark wavy hair, pink
  outfit, gold paper crown. Any frame that turns her toward the camera rejects the take. If a generator keeps
  turning her, restage the shot **hands-only** (a small hand in a pink cuff gripping a black-gloved hand) or as
  backlit silhouettes; hands cannot fail the face rule.
- **Voices are mixed in post**, from the §5 mp3s, never from generated speech. Lip-sync would need faces, and
  generated voices drift.
- **Reference continuity.** Use Flow "ingredients" or Grok reference mode (the @ picker, up to 7 refs; no start
  frame with refs). The refs are:
  - `@riley_back_ref` (existing);
  - `@rand_ref` (the Stage 6 fictional red-coated Rand);
  - `@girl_back_ref`† (a ChatGPT still of A2 from behind);
  - `@queen_ref`† (a photoreal still of the A1 description);
  - `@door_ref`† (A10);
  - `@wells_ref`† (A12 `bg8mid3`).
- **Generation length.** Use 6–8 s generations, one action per prompt. Longer clips are hard cuts of short shots,
  joined in ffmpeg (Stage 6 §4.5 method). Expect 2–3 generations per shot.
- **Tool split (addendum).** **Google Flow first**: about 210 credits, which is about **10 clips**. That buys
  roughly 5 shots at 2 generations each, so Flow goes only to the shots marked **FLOW** below: multi-person
  staging where consistency matters most. Everything marked **GROK** goes to Grok Imagine, and any FLOW shot
  still unmade when the credits run out moves to Grok too.
  - **Flow priority order:** V5.3 (the push through the doorway), V3.1 (Callandor and the circle), V5.2 (the
    linked fireball), V1.2 (Rand in the box), V5.4 (the sassy walk).
  - **Never cut:** V1.2, V3.1, V5.3. If budget runs short, drop V5.4 first (the in-engine sassy walk ships
    regardless), then the optional wolves insert, then V4 (the link panels cover it).
- **Encode:**
  - story clips: 960×540, CRF 29, `+faststart -g 24`, AAC 96k, -16 LUFS, **≤ 170 KB/s**;
  - call clips: 854×480, CRF 29, **≤ 160 KB/s** (`tools/cutscenes/encode_callins.sh` with a folder argument).
- Every clip gets a **frame-by-frame review at 4 fps**, logged in `assets/cutscenes/stage8/ART_STATUS.json`† with
  reviewer, timestamp and `likeness`.

### 7.2 Story clips (`assets/cutscenes/stage8/`†, played by `src/stage8-video.js`†)

Every prompt ends with: *"Photoreal cinematic, 16:9, natural light, shallow depth of field. No text, no logos, no
gore, no blood."*

**V1 `intro` (≈ 22 s; 4 shots; voices C1; shots 1, 3, 4 GROK, shot 2 FLOW)**
1. *"Slow aerial push-in at dawn over rolling golden grassland. A small copse of trees surrounds three old round
   stone wells. A ring of covered wooden wagons stands beside them, cookfire smoke rising. On the far hills a long
   line of dust and hundreds of small figures in sand-coloured robes with dark veils advance through the grass."*
2. *"Inside a cramped, dark wooden chest. Thin blades of daylight leak between the planks. A young man in his early
   twenties with tangled red-gold hair, a bruised, sweat-streaked face and a torn white shirt is folded tight, knees
   to his chest. A faint, barely visible skin of pale shimmering light wraps him like a soap bubble. He strains
   against it, teeth gritted; the shimmer flexes but holds. Handheld, claustrophobic."* (refs @rand_ref)
3. *"The same dark chest. In a polished brass buckle beside the young man's face, a second face is reflected: an
   older man with dark hair streaked with grey and haunted eyes, translucent like a ghost, lips moving as if
   whispering. The young man squeezes his eyes shut as if listening. Slow push-in on the reflection."*
4. *"A muscular sixteen-year-old boy seen only from behind on a grassy hilltop: short dark hair, the arms of blue
   glasses over his ears, a sleeveless black long coat, black fingerless gloves, black trousers and boots. Below
   him, the ring of wagons and the three stone wells; veiled warriors pour down the hills toward them. Wind moves
   the grass and his coat. He never turns around; camera static behind his shoulder."* (refs @riley_back_ref
   @wells_ref)

**V2 `taim` (≈ 9 s; 2 shots; voices `st8_taim_intro_01`, `st8_taim_kill_01`; GROK)**
1. *"Low wide shot of a grassy ridge. The air splits: three tall vertical lines of blue-white light open and turn
   into doorways, showing a darker landscape beyond. Men in high-collared black coats step through in a line."*
2. *"Medium shot: a hawk-nosed man in his forties with dark hair and a cold stare, in a black high-collared coat
   embroidered with blue-and-gold dragons up the sleeves, raises his fist and shouts a command. Behind him the line
   of black-coated men lift their hands; the ground in front of them heaves and begins to glow orange."*

**V3 `circle` (≈ 12 s; 2 shots; voices `riley_st8_callandor_01`, `riley_st8_circle_02`; shot 1 FLOW, shot 2 GROK)**
1. *"Seen only from behind: the same black-coated boy lifts a sword made entirely of clear crystal; it blazes
   white from within. Ahead of him six women in long dresses and black-fringed shawls stand in a ring, pale light
   flowing between their hands into a glowing dome. Inside the dome a little girl about eight, with long dark wavy
   hair, a pink dance-recital outfit and a gold paper crown, seen only from behind, presses her hands against it.
   Neither child ever turns around; no child's face is ever visible."* (refs @riley_back_ref @girl_back_ref)
2. *"The crystal sword's light lances into the dome; the dome cracks like ice and bursts into glittering shards.
   The six women are thrown backward onto the grass, stunned and unhurt. The little girl, seen from behind, stays
   standing in the middle. Camera static."*

**V4 `link` (≈ 9 s; 1–2 shots; voices C6; GROK)**
- *"Seen only from behind: the little girl with long dark wavy hair, the pink recital outfit and gold paper crown takes the black-coated
  boy's hand. Where their hands meet, warm golden light flares and spirals up both their arms, braiding into one
  bright ribbon of light above them. Across the grass, beside a tall twisted doorframe of red stone, a regal woman
  in a high-necked silver-and-white gown, silver crescent moons in her long dark hair, turns toward them, eyes
  narrowing."* (refs @riley_back_ref @girl_back_ref @queen_ref @door_ref)

**V5 `finale` (≈ 28 s; 5 shots; voices C8 in order; shots 2–4 FLOW, shots 1 and 5 GROK)**
1. *"Medium shot: the regal woman in the silver-and-white gown with long fitted sleeves, dark hair now wild, fire swirling around her raised
   hands, throws back her head and screams at the sky. A tall twisted doorframe of red stone stands behind her, its
   opening a rippling grey shimmer."* (dub `st8_lanfear_final_01`)
2. *"From behind, the boy and the little girl stand side by side holding hands; between their joined hands a ball
   of fire grows until it is bigger than both of them, roaring orange and gold with blue-white lightning crackling
   around it. They thrust it forward together. Neither turns around."*
3. *"The giant fireball slams into the woman and shoves her backward, skidding, through the shimmering opening of
   the twisted red stone doorframe. She flails as she tumbles into the grey shimmer; for an instant pale golden
   slit-pupilled eyes glint in the darkness beyond. The shimmer snaps shut; the empty doorframe smokes. A slim
   silver crown rolls out across the grass and topples over."* (dub `st8_lanfear_final_02`)
4. *"Seen only from behind, low camera: the little girl with long dark wavy hair, the pink recital outfit and gold
   paper crown struts across the grass toward the boy with huge sass, hips swinging, straightens her crown with
   both hands, does a little twirl with her hair flaring and ends with one hand on her hip. Her face is never
   shown."* (dub `st8_tt_final_01`)
5. *"Wide, warm light, from behind: the boy and the little girl stand together looking out over the three stone
   wells as veiled warriors retreat over the hills. The boy gives a small shrug and flicks a small candy wrapper
   over his shoulder."* (dub `riley_st8_final_01`)

**Optional insert `wolves` (5–7 s; GROK; cut first after V5.4):** *"Low in tall grass behind a black-coated boy
seen only from behind: five grey wolves and one huge, older grey wolf burst past the camera toward veiled
spearmen, who scatter."* It plays once over the Z1 charge's tell; the in-engine charge is the default.

### 7.3 Call-in clips (`assets/cutscenes/call8/`†, 5–7 s each, 854×480, all GROK)

Mat is the first call-in, so he gets three new clips. Rand reuses the shipped `assets/cutscenes/rand/R1–R3`
unchanged, so there are no new Rand clips.

| id | Shot (Riley from behind wherever he appears) |
|---|---|
| M1 | *"Behind a black-coated teenage boy, back only: a laughing young man in a wide-brimmed hat and long coat sprints past him spinning a spear with a curved blade, in one glittering arc past veiled spearmen. Grassland battlefield, late gold light."* |
| M2 | *"Close: dice tumble from a laughing young man's hand across a wooden wagon bed and come up all sixes; he grins under a wide-brimmed hat. A black-coated boy stands out of focus in the foreground, seen from behind."* |
| M3 | *"Behind the boy: the hatted young man's silver fox-head medallion flares, and a pale blue bubble of light around a stern woman in a shawl pops like soap."* |

**Bytes:**

| Line | Folder | Budget | Contents |
|---|---|---|---|
| `cutscenes.stage8`† | `assets/cutscenes/stage8/` | 15,000,000 | V1–V5 ≈ 80 s × ≤ 170 KB/s ≈ 13.6 MB, plus the optional wolves insert and posters |
| `cutscenes.callIns8`† | `assets/cutscenes/call8/` | 5,000,000 | M1–M3, 3 clips plus posters ≈ 3.4 MB |

- They are streamed one at a time and never preloaded, so they are outside the pre-fight gate.
- **Only the next predicted call clip is prefetched**, as a single blob (Stage 7 §3.4).

---

## 8. Memory and audit budget

### 8.1 GPU textures (estimate; measured in T15 with `tools/stage5/texture-dump.mjs RWB_STAGES=8`)

| Item | Stage 7 (conservative projection) | Stage 8 (estimate) |
|---|---|---|
| Atlas fighters (compact normals) | 67.20 MiB (riley 34.30, grunt 19.90, spear 13.00) | **34.30 MiB** (riley only) |
| Painted cast and props at the boss peak | 10.18 MiB (cap 12) | **≈ 23.8 MiB** (cap **26**): Lanfear 3.52, Twinkle Toes 2.11, duo 2.34, dancer 1.25, veiled 1.15, stonedog 1.88 (P2 adds), ashaman 1.69, taim 1.17, allies 1.38, rand 0.69, door 2.25, volley 1.88, boss FX 2.44 (with crowns), wolves 1.13 (P2 gate only), UI 0.41. Mat is released at C6, before the boss |
| Backgrounds (streamed) | 8.40 MiB | **≈ 13.8 MiB** (far 2.83 + 2 plates 5.66 + 2 floors 3.52 + fg 0.78 + smoke 1.00) |
| Powers, HUD, FX, shared | ~5.6 MiB | ~5.6 MiB |
| **Boss peak (source)** | 102.85 MiB projected | **≈ 78 MiB. Gate ≤ 105 MiB; target ≤ 85** |

- The ~27 MiB of slack is deliberate. It covers the cutscene `<video>` decode surface, story panels during
  mid-stage scenes (at most 4 × 3.52 MiB, always freed before control returns) and `--res 1.25` art.
- **If the T15 dump measures over 105 MiB, cut pixels in this order, never tells, bands or HP:** the duo, Twinkle
  Toes and Lanfear sheets back to `--res 1.0`; `bg8fg2` and `bg8smoke`; `bg8far` to 1024 wide.
- **Do not spend it on Trolloc atlases.** Stage 8 has no Trollocs.
- **T2 must verify** that no shared code path (for example a Stage 7 debug hook that spawns a grunt, or `spawn()`
  defaults) needs `grunt`/`spear` atlases.

### 8.2 Streaming and deferral
- **`STREAMS[8]`:** `far: 'bg8far'`, zones `[{bg8mid,bg8floor},{bg8mid2,bg8floor2},{bg8mid3,bg8floor2},{bg8mid4,bg8floor3}]`,
  `bleed: [128, 48, 48, 48, 128]`. The fg strips ride the same zone pairs.
- **Deferred loads** go through `demand7(kit, keys, then)` (`src/stage7-load.js`), which has a 1.5 s deadline and
  falls back to the code-drawn key:

  | Load | When |
  |---|---|
  | `s8lanfear`, `s8door`, `s8fireball`, `s8clash`, `s8star` | Z2 wave 1 clear |
  | `s8twink`, `s8dome`, `s8callfx`, `s8chest`, `s8weave` | Z2 entry |
  | `s8duo`, `s8link`, `s6rand` | circle start |
  | `s8mat` | Z0 wave 0 clear (before C2b) |
  | `s8wolves` | Z1 entry; again at Lanfear's 66% gate |

- **Released:**

  | Release | When |
  |---|---|
  | `s8sister`, `s8dome`, `s8callfx`, `s8chest`, `s8weave`, `s8wise` | after C6 |
  | `s8perrin`/`s8loial`, `s8mat` | after C6 (Rand is the provider; the vignettes end with Z2) |
  | `s8wolves` | after each charge |
  | story panels | at the end of their scene |

### 8.3 Byte audit lines (new, in `tools/audit-stage1.mjs`)

| Line | Contents | Budget |
|---|---|---|
| `stage8.source`† | `STAGE8_SRC` = `/^(stage8.*\|mat-call\|call8-cutscene\|shaido8\|blackajah\|lanfear\|bot-stage8)\.js$/` | 224 KB |
| `stage8.voices`† | `/^(st8_\|riley_st8_)/` | 13,312,000 |
| `stage8.music`† | `music-stage8.mp3`, `music-boss8.mp3` | 2,400,000 |
| `stage8.art`† | `assets/stage8/**`, `assets/bg8/**` | 9,000,000 (expected ≈ 6.3 MB including 13 panels) |
| `cutscenes.stage8`†, `cutscenes.callIns8`† | §7 | 15,000,000, 5,000,000 |

**Pre-fight impact.** Stage 8 source joins the pre-fight sum through the boot graph (§0.2): at most +224 KB, which
brings it to about 20.9 MB of the 25 MB gate. The Q1 decision handles the exact pin.

---

## 9. Build order (a builder agent, one task per draft PR, sequential)

### 9.1 Every task brief must say
1. Branch from the head of the integration branch `rwb-w2-stage8`†, cut from `rwb-w2`. Open a **draft PR into
   `rwb-w2-stage8`**. Never open a PR into `rwb-w2`, and never merge.
2. The protected files (§0.1) are untouchable. Do not edit `src/riley.js` or `src/stage1.js`. Do not edit an
   existing test, except the one Q1 pin in T1 if Jason approved it.
3. Run all of these and paste their tails into the PR:
   - `node --check` on every changed `.js`;
   - `node --test tests/*.test.mjs`;
   - `node tools/audit-stage1.mjs`;
   - `git diff --check`.
4. The golden diff for Stages 1–7 (`tests/stage8-earlier-campaigns.test.mjs`†) is empty.
5. Put a raw.githack preview URL of the head SHA, with `?stage=8&s7=1&s8=1`, in the PR body.
6. **Known baseline.** Without Pillow, `tests/stage4-placeholders.test.mjs` fails; run `pip install pillow` first.
   If this sandbox rejects Node subprocess pipes with `EPERM`, use the file-capture preload described in
   `docs/stage7/STATUS.md`.

### 9.2 Tasks

| # | Task | Files (new †) | Acceptance |
|---|---|---|---|
| **T1** | Generalise (§0.3). First, at `23ccf14`, generate the Stage 1–7 golden: `tools/stage8/golden.mjs`†, a copy of `tools/stage7/golden.mjs` with `stage<=7`, written to `tests/fixtures/stage8-earlier-campaigns.json`†. Q1 pin edit if approved | `src/stages.js`, `src/stage7-def.js`, `src/stage7-hud.js`, `src/stage7-hurt.js`, `src/stage6-hurt.js`, `src/rand-call.js`, `src/bot-stage4.js`, `src/texture-pages.js`; `tests/stage8-generalise.test.mjs`†, `tests/stage8-earlier-campaigns.test.mjs`† | (a) All tests pass. (b) Golden 1–7 empty. (c) `?stage=8` without `s8=1` → 1. (d) `maxStage(Q('s7=1')) === 7`, and `=== 8` with `s7=1&s8=1`. (e) `callInFor` 5/6/7/8 → loial/rand/moilan/matrand. (f) The Stage 7 clear card reads "CONTINUE TO STAGE 8" only with `s8=1` |
| **T2** | Skeleton: the `STAGE8` def (zones, drops, crates, skip, a dummy Lanfear with `hp 760`, `music`, `next`); a `Stage8Kit` with the full kit interface (`freezesRiley/freezesWorld`, `setQuality`, `later`, `threats`, `clearHazards`, `onZoneClear`, `destroy`); `queueStage8`; a `releaseStage` wrapper for 8 (copy of `src/stage7.js` `releaseStage7` plus the microtask hook); `STREAMS[8]` with code-drawn plates; `STAGE8_SRC` and every §8.3 line (0-byte folders allowed); title name and `speakerColor` patch | `src/stage8-def.js`†, `src/stage8.js`†, `src/stage8-paint.js`†, `src/stage8-painted.js`† (stub), `src/stage8-hud.js`†, `src/stage8-voice.js`†, `src/stage8-voice-files.js`†, `src/stages.js` (import plus registry), `tools/audit-stage1.mjs`; `tests/stage8-registry.test.mjs`†, `tests/stage8-size-caps.test.mjs`† | (a) `?stage=8&s7=1&s8=1` boots and walks Z0→Z3 with dancer/veiled waves to a beatable dummy and the clear card. (b) Harness campaign 9/9 (`tests/helpers/stage8-harness.mjs`†, a copy of `stage7-harness.mjs`). (c) 7→8 and 8→1 transitions leave no Stage 8 texture keys. (d) Chars are `['riley']` only, and no `grunt`/`spear` page is requested. (e) Audit prints every new line as PASS |
| **T3** | Story and video plumbing: `CLIPS8` registry, `playStage8Video(scene, id, done)` (the `playSceneVideo` lifecycle, ids passed directly, same blessed player), the Twix-style panel fallback, live dialogue (the `installBossCaption7` pattern), the `STORY6_CLIP_LINES`-style skip, and caption-only C1–C9 with code-drawn panels | `src/stage8-video.js`†, `src/stage8-story.js`†, `assets/cutscenes/stage8/ART_STATUS.json`† (empty entries); `tests/stage8-story.test.mjs`† | (a) With the clip present, stalled, missing or skipped, every beat completes and every line is either in the clip or played as an mp3/caption (stubbed player). (b) `EVENT_CLIPS`/`STAGE_CLIPS` are unchanged (`tests/bonus-videos.test.mjs` passes). (c) No beat can start while another runs. (d) Panels are freed after each scene (texture-key assertion) |
| **T4** | Shaido roster: `StoneDog`, `WiseOne` (plus reused `Dancer`/`Veiled`), `STAGE8_ACTORS`, grass-ambush silhouettes, the caps in §2.2, code-drawn sprites | `src/shaido8.js`†, `src/stage8-actors.js`†, `src/stage8-def.js`; `tests/stage8-shaido.test.mjs`† | (a) The buckler blocks light and medium from the front, and is broken by 3 blocks, a throw, a back attack, a runkick or a fireball. (b) At most 1 Wise One chants, and a hit cancels the chant. (c) Tokens ≤ 2. (d) Humans yield and never turn to ash. (e) 9/9 |
| **T5** | Allies: background loops, lane vignettes (back lane, ≥ 380 px from Riley, fade within 220 px), fg strips, quality drops, barks C2, the **wolf-pack charge** (§2.3a), C2b Mat tableau | `src/stage8-allies.js`†, `src/stage8-view.js`†; `tests/stage8-allies.test.mjs`† | (a) Allies are never in `s.enemies`, never hold tokens, are never hit by Riley and never block a wave clear. (b) Nothing ally-drawn overlaps the lane above y 700 except vignettes on the back lane. (c) Lights ≤ 10. (d) The wolf lane is never Riley's lane at tell start; wolves never damage Riley and never take a human below 1 HP; wolf KOs don't feed the call. (e) Golden 1–7 empty |
| **T6** | Taim volley (§2.4): first volley at Z0 wave 1, cadence on `kit.clock`, tell, safe-lane picker, earth, fire, Fire Shield (fire only), caps, postpone and skip, damage to everyone (enemies, bubbles, allies knocked flat visually), the boss-hold contract, `CLEAN DODGE` | `src/stage8-volley.js`†; `tests/stage8-volley.test.mjs`† | (a) Every volley has exactly 1 safe lane, adjacent to or equal to Riley's lane at the tell start, and never the same lane 3 times running. (b) Riley's damage per volley is ≤ 14 over a 10,000-volley fuzz. (c) It never starts in any blocked state, and is skipped after 4 s. (d) A jump started ≤ 0.25 s before contact clears the earth. (e) Fire Shield blocks fire, never earth. (f) Volley KOs never feed the call recharge. (g) Bot: ≤ 25% of deaths in volleys, 9/9 |
| **T7** | Black Ajah `sister`, the circle encounter, the Callandor trigger, C4 (video or in-engine), C5 (chest burst, Rand, Mat handover), the six shield pips and the caption-only interludes (§1.3a), the timeout | `src/blackajah.js`†, `src/stage8-circle.js`†; `tests/stage8-circle.test.mjs`† | (a) One binder at a time, the bind always breakable, `releaseHold('break')` on call, death and stage switch. (b) 3 anchors → Callandor prompt → C4 in ≤ 2 s idle. (c) The 75 s timeout always completes the circle. (d) Riley takes no damage during C4 and for 2 s after. (e) The pips crack on exactly their six beats and interludes never pause play. (f) 9/9 |
| **T8** | Call-ins: `CALL8`, `provider8`, the Mat strike (sweep and dice presentations, bubble/buckler pop), the provider switch to Rand at C5 with one fresh charge (reusing `randEffect` at 6%), refusals, HUD slot and help text, `call8-cutscene.js` bags (Mat new, Rand reused) | `src/mat-call.js`†, `src/call8-cutscene.js`†, `src/stage8-lifecycle.js`†, `src/stage8-hud.js`; `tests/mat-call.test.mjs`†, `tests/stage8-call.test.mjs`† | (a) Table tests mirror `rand-call`/`moilan-call` 1:1. (b) The switch happens only at C5 (pure function) and can't double up a boss phase. (c) **Sweep and dice deal identical damage** to identical targets (fuzz). (d) Humans never reach 0 from a call, and a human at ≤ 40% yields. (e) Boss damage is clamped at the gate. (f) Calls-on boss time is 70–102% of calls-off. (g) Stage 8 imports neither `moilan-call.js` nor `call7-cutscene.js`; Stages 1–7 call-ins are unchanged |
| **T9** | Linked mode (§2.7): the companion sprite and pose map, tether and aura, fireball, cost and meter hooks, combo3 spark, HUD, `?skip=boss` linked | `src/stage8-link.js`†; `tests/stage8-link.test.mjs`† | (a) **Parity:** the actions the scene reads and their timings are identical with the link on and off; `RILEY_DEF` and the hurtbox are unchanged. (b) Every hook is restored by identity on destroy. (c) The linked fireball does ×1.3 and costs 28. (d) Twinkle Toes is never targetable. (e) Lights ≤ 10 |
| **T10** | Lanfear P1–P2: fans with a free band, mirror crowns, gateway step, crown and stars, crown grab and tantrum, adds and the P2 wolf charge, the gate clamp, the damage cap, the volley-hold contract | `src/lanfear.js`†, `src/stage8-arena.js`†; `tests/stage8-lanfear.test.mjs`† | (a) The 66/33 gates cannot be skipped by any source, including volleys and wolves (1,000-hit fuzz). (b) Every attack has a tell ≥ 0.55 s. (c) Every fan leaves one band free (table test). (d) Mirror copies deal 0 damage and only the real one casts a shadow. (e) A dodged grab always opens the 1.05 s tantrum. (f) She never attacks between a volley tell and the fire fade |
| **T11** | Lanfear P3 and P4: great fireballs, the clash rules (press and hold parity), push toward the doorway, the 1 HP gate, the finale sequence (doorway, crown roll, C8 video or panels, the playable outro walk with the sassy walk), C9 credits, CAMPAIGN COMPLETE, `next` to the title | `src/stage8-clash.js`†, `src/lanfear.js`, `src/stage8-credits.js`†; extend `tests/stage8-lanfear.test.mjs`, add `tests/stage8-finale.test.mjs`† | (a) Mashing at 4/s fills exactly as fast as holding (unit test). (b) The P4 clash auto-completes with no input. (c) Lanfear never reaches 0 HP outside P4. (d) The finale lines play in the §1.10 order, with every clip and fallback path, and none plays twice. (e) The outro walk ends at x 4900 or 20 s. (f) Credits are skippable and return to the title |
| **T12** | Bot `stage8Bot`: safe-lane dodging, jumping earth, breaking bucklers, interrupting chants, popping bubbles, anchor order, the Callandor walk, herding Shaido into the wolf lane, picking the silver-crowned Lanfear, baiting the crown grab, clash presses, fan bands, calls by provider | `src/bot-stage8.js`†; `tests/stage8-campaign.test.mjs`† | 9/9; lag 250 ms ≥ 8/9; every attempted clash is won by presses alone; call fairness 70–102% in both provider eras; a full 1 → 8 run in one session with texture growth within ±2 MiB per stage; per-seed time logged (target ≈ 6 min of play) |
| **T13** | Voice: 65 lines (§5), `voice-render.json`, manifests, narrator hints, the Lews in-head chain, Whisper check | `assets/audio/voice/{st8_,riley_st8_}*.mp3`†, `tools/stage8/voice-render.json`†, `tools/jason-narrator/*`, `assets/audio/riley-voice-manifest.json`, `src/stage8-voice-files.js` | (a) Each line ≤ 200 KiB and the line total ≤ 13,312,000. (b) Whisper matches the script for every line, and **the 4 finale lines match character for character**. (c) Loudness is in range. (d) **Jason approves every Twinkle Toes take by ear**; a vetoed take ships caption-only. Jason also reviews Lanfear's lines |
| **T14** | Music (§6): **Jason generates** both new Suno songs in his account from the §6 prompts (the original "Asha'man Kill" never enters the repo or Suno as a source) → `tools/stage8/loop_music.py` → manifest → `MUSIC.stage8`/`boss8` | `assets/audio/music-stage8.mp3`†, `music-boss8.mp3`†, `tools/stage8/*` (including `music-brief.md`†), `assets/audio/AUDIO_PROVENANCE.md` | `check_loops.py` passes; each ≤ 1.2 MB; the loops are exactly 60.000 s and 68.571 s ±8 ms; **an audit check finds no file in the repo that is, or references, the original song**; Jason confirms no take quotes its hook |
| **T15** | Painted art (§4): ingest Jason's drafts into `art-in/stage8/`, generate the rest, `tools/stage8/process_art.py` JOBS, every §4.4 key, `ART_STATUS.json`, `stage8-painted.js`, `tools/stage8/memory.mjs`† (copy of `tools/stage7/memory.mjs`), contact sheets with a child-face audit | `art-in/stage8/*`, `assets/stage8/**`†, `assets/bg8/**`† | (a) Every key is within its caps. (b) Boss peak ≤ 105 MiB and painted ≤ 26 MiB (`tests/stage8-memory.test.mjs`†). (c) No player-visible placeholder (`tests/stage8-no-placeholder.test.mjs`†). (d) Art shots for every zone, the circle and each Lanfear phase attached to the PR. (e) **No frame shows Twinkle Toes's or Riley's face**; Jason approves the Twinkle Toes, duo and Lanfear sheets |
| **T16** | Videos (§7): Flow shots first in the §7.1 priority order, then Grok for V1–V5's other shots, M1–M3 and the optional wolves insert; frame review; encode; ART_STATUS | `assets/cutscenes/stage8/**`†, `assets/cutscenes/call8/**`† | (a) Rate caps and line budgets met. (b) The review log shows no frame with Riley's or Twinkle Toes's face. (c) Flow credit spend is logged per shot. (d) Jason signs off on likeness and depiction before any clip id is registered |
| **T17** | Hardening and enable: a browser pass (copy `tools/stage7/browser-hardening.mjs`), 60 fps p95, pause and resume in every beat, governor to low, death mid-call and mid-clash, stage switch mid-video, a full campaign 1 → 8 in one session with texture growth within ±2 MiB per stage, then flip `stageEnabled(8)` with Jason's OK | `tools/stage8/browser-hardening.mjs`†, `src/stages.js` (1 line), `docs/stage8/STATUS.md`† | (a) No console errors in 5 full runs. (b) 60 fps p95 on the reference device or the throttled WebKit profile. (c) All earlier T gates are green. (d) Jason's and Riley's playtest sign-off |

**Order rationale.**
- T1 must land first.
- T2–T3 give a shippable-but-plain stage behind `s8=1`, with every story beat playable as captions.
- T4–T12 are gameplay on code-drawn art, each testable alone.
- T13–T16 are content. They can run in parallel after T3, because every key, line and clip has a fallback.
- **Human gates** sit inside T13–T16 (§0.1a): Jason's approval of the Twinkle Toes and Lanfear art and of every
  Twinkle Toes voice take, Jason generating the Suno songs, and Jason's likeness sign-off on clips. No agent may
  substitute its own judgement for these.
- T17 turns the stage on. **It should follow Stage 7's own enable**, because the only way into Stage 8 is through
  Stage 7.

---

## 10. Test plan summary

| Test † | Covers |
|---|---|
| `stage8-generalise`, `stage8-earlier-campaigns` | T1 predicates; Stages 1–7 golden |
| `stage8-registry`, `stage8-size-caps` | def shape, queue, release, streams, audit lines, source ≤ 224 KB |
| `stage8-story` | every beat completes on every clip path; skip rules; panel release |
| `stage8-shaido`, `stage8-allies`, `stage8-volley`, `stage8-circle` | enemy, ally, hazard and set-piece rules |
| `mat-call`, `stage8-call` | pure call rules, Mat sweep ≡ dice damage, the provider switch and fresh charge, in-game strikes |
| `stage8-link` | control parity, hooks restored, linked numbers |
| `stage8-lanfear`, `stage8-finale` | gates fuzz, tells, free bands, mirror copies, crown grab tantrum, clash press/hold parity, finale order, outro walk |
| `stage8-campaign` | 9/9, lag ≥ 8/9, call fairness 70–102% in both provider eras, volley-death share ≤ 25%, 1 → 8 soak |
| `stage8-memory`, `stage8-no-placeholder` | painted ≤ 26 MiB, peak ≤ 105 MiB; no Math.random/Date.now in Stage 8 modules; debug-only stamps |

**Freeze-frame check.** For 10 random hits on Riley per seed, look at the frame 0.5 s before the hit. A tell must
be visible in at least 9 of 10. For volley hits it must be **10 of 10**.

**Depiction check (manual, T15/T16).** Every Twinkle Toes and Riley frame in contact sheets and clips is checked
against §0.1a and logged. A single face frame fails the whole sheet or take.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **The exact pre-fight pin** (`tests/stage7-painted-art.test.mjs:66`) breaks on every Stage 8 PR that touches boot-graph bytes | Q1 (§13): one approved edit in T1 turns it into a ceiling. Never dodge it with a computed `import()`. If Jason says no, each PR re-pins the number with his OK |
| **Stage 7 is still opt-in and incomplete** (voices, music, clips), and Stage 8 reuses its modules | T1's 1–7 golden; reuse through imports only, never by editing Stage 7 behaviour; T17 follows Stage 7's enable |
| **The volley every 60 s feels punishing or repetitive** | The 3 s tell, the guaranteed adjacent safe lane, a 14 damage cap, postponement, the boss-hold contract, enemy damage (it becomes a tool), and a `CLEAN DODGE` reward. `VOLLEY8.every` is one constant: if playtests say so, try 75 s. Do not shorten the tell |
| **Lanfear's tone** against a 16-year-old and a little girl | The modest gown with fitted sleeves in every prompt, no flirt or seduction anywhere (§0), no compulsion move (the original plan's compulsion pull was replaced by mirror crowns), she reaches for the crown and never touches the child, and the jealousy is comedy over a paper crown. Her lines are reviewed by Jason in T13 |
| **Real-child likeness** (Riley and Twinkle Toes/Kenzie are both real children) | §0.1a: neither face is ever shown, in stills or video; no photo of either is ever used as input; a 4 fps frame review where one face frame fails the whole sheet or take; Jason's sign-off |
| **Flow and Grok refuse names, brands or children in peril** | Prompts describe and never name. "Medieval Times" appears only in captions and voice; video and panels say "a jousting dinner show". The girl is never harmed on camera (a dome and a protective circle) |
| **Video drift** (the girl's outfit, the queen's face) across 5 clips | The `@girl_back_ref`/`@queen_ref` stills, one action per shot, side-by-side review before encoding, 2–3 generations per shot |
| **Flow credits run out** (≈ 210 credits ≈ 10 clips; face rejections burn generations) | Flow only for the 5 FLOW shots, in priority order; Grok for the rest; the hands-only restage for the girl; the cut order in §7.1; every clip has a panel or in-engine fallback, so none is load-bearing for shipping |
| **Suno:** a take quotes the original "Asha'man Kill"; BPM drift; vocals mask dialogue | The §6 firewall: the original is never a Suno input or a repo file, Jason rejects any take that echoes its hook, and T14 audits the repo for it; `loop_music.py` refines to the beat; the refrain is limited to 4 bars; an instrumental fallback; Suno plan rights noted in provenance |
| **Two call providers confuse players** (hoarding Mat's charge "for Rand") | The fresh charge at the switch, Mat's handover line, and the HUD always showing the current provider's face; there is never a dead button |
| **The linked mode becomes a new control scheme by accident** | §2.7 parity test (T9). Twinkle Toes is cosmetic and untargetable; there are no new actions |
| **Scope**: this is the biggest stage (17 tasks, 55 new art keys, 8 clips plus an optional insert, 65 lines) | Code-drawn fallbacks for everything; content runs in parallel; the stage is fully playable as captions after T3 |
| **Canon purists**: Lanfear and Mat at the wells, Callandor in a wagon, Moiraine's absence | Each departure is stated in §1.1, and each sits inside a canon frame (the doorway, Lanfear's return) |
| **Memory on iPhone** with video decode on top | A 78 MiB estimate against a 105 gate; panels freed before control returns; one call blob at a time; a pixels-only cut order (§8.1); a measured `texture-dump` in T15 and a device pass in T17 |

---

## 12. What came from Argon / Muse

The Claude plan is the backbone (structure, ground rules, the checked repo facts in §0.2–§0.3, the volley,
circle, link, clash and finale rules, budgets and task list). These elements were merged in:

**From the Argon plan (`docs/stage8/STAGE8-PLAN-ARGON.md`):**
- **An early first volley** (its D3 "showcase barrage"): Taim now arrives at Z0 wave 1, not Z1 entry, so the
  signature hazard lands about 20 s into play (§1.2, §2.4).
- **Fire Shield vs the volley**: the existing pickup now matters here. Adapted so it blocks only the fire, and the
  earth still has to be dodged (§2.4).
- **Six shield knots, three untied from inside** by Rand and Lews Therin: the backbone of the shield-pip clock,
  combined with Muse's pips (§1.1, §1.3a).
- **The crown-snatch dash and its tantrum punish window**, which makes Lanfear's jealousy playable (P2 crown grab,
  §2.8). Adapted to reach for the crown along Riley's band, never at the child.
- **The carnation joke** for Lanfear's P2 line ("A carnation from a knight on a horse?! I ruled the Age of
  Legends!").
- **The candy-wrapper flick** on "Too many snack breaks." (in-engine and V5 shot 5, unbranded).
- **The "best art" quality checklist**: halo/spill suppression and baseline lock at 0.96 of the cell (§4.1).
- **The post-credits question** (its D6, title vs a New Game+ victory lap), now Q4.

**From the Muse plan (`docs/stage8/STAGE8-PLAN-MUSE.md`):**
- **The addendum-compliant call-ins**: Mat first, then Rand; `provider8`; one shared pool with a fresh charge at
  the switch and `maxCalls` 4; Mat as the anti-sister call; "luck is costume, never power" (sweep ≡ dice damage);
  the C2b Mat entrance and the C5 handover line; Mat's M1–M3 clips with Rand's R1–R3 reused (§1.4, §1.7, §3, §7.3).
- **The wolf-pack charge set piece** with the big grey lead wolf, herding Shaido across a lane (§2.3a), and its
  P2 reprise.
- **The shield pips as a visible clock** that the player advances, with caption-only Lews Therin interludes
  (§1.3a, §3).
- **Allies hit by the volley, visually**, and diving to the safe lane during the tell, so the allies are the
  tutorial (§2.3); volley and wolf KOs don't feed the call recharge.
- **Mirror crowns** (P1): copies in gold paper crowns, the real Lanfear in silver with a shadow, taught by Twinkle
  Toes' bark. It replaces the original plan's compulsion move, which also removes a tone risk (§2.8).
- **The silver crown rolling to Twinkle Toes' feet ("Hers is paper")** and the **playable outro walk** for the
  sassy walk (§1.10, §2.8).
- **Depiction rules and human gates** (§0.1a): one face frame fails the whole sheet or take; Jason approves the
  child's art and every voice take; hands-only restaging for the girl in video.
- **The Suno firewall and workflow** (§6): Jason generates in his own account, at least 4 takes, reject any take
  that quotes the original, an audit that the original is nowhere in the repo, and the instrumental fallback.
- **The Flow/Grok split** with a priority order and a "never cut" list (§7.1).
- **Caption colours** for Lews Therin (cracked gold) and Taim (black-red, not ally blue) (§0.3); alternating volley
  origin sides by zone (§2.4); the pixels-only memory cut order (§8.1).

**Fixed to match the addendum** (conflicts in the original Claude plan): the Perrin/Loial call-ins (now Mat, then
Rand); the Suno "Cover of Jason's song" path (removed: the original is a feel reference only); Twinkle Toes'
stylised sprite face and the poster reference (now never a face, never a photo, with her real look: long dark
wavy hair, about 8, chest height); the volley sparing allies and sisters (it now hits everyone); Lanfear's sleeves
made explicit; Flow's ~10-clip budget; and the old Q1–Q4, which the addendum answered.

**Not adopted:** Argon's pre-fight figure of 24,948,685 B and Muse's "about 51 KB of headroom" (this checkout pins
20,675,453 B in `tests/stage7-painted-art.test.mjs:66`); Argon's `STAGE_CLIPS[8]` entry (it would fail
`tests/cutscene.test.mjs` and `tests/bonus-videos.test.mjs`); Argon's Moiraine/Lan call-in and its finale cameo
(addendum); Argon's damage-reducing link grace (a hidden difficulty drop); Muse's 13-sister ring and keeping the
`loial` atlas (the 6-sister canon circle and a small painted Loial sheet are cheaper).

---

## 13. Open questions for Jason (defaults apply if there is no answer)

| # | Question | Suggested default |
|---|---|---|
| **Q1** | May T1 change the exact pre-fight pin in `tests/stage7-painted-art.test.mjs:66` (`=== 20_675_453`) into a ceiling (`<= 21_000_000`), with Stage 8 pinning its own delta in a new test? Without that, every Stage 8 PR has to re-pin the number | **Yes**, one line, the same kind of edit you made in `97eb483` |
| **Q2** | Should the game ever *say* "Kenzie", or is she "Twinkle Toes" in every caption and line (with Kenzie only in these docs)? | **"Twinkle Toes" everywhere in the game**, as in Stages 1–7 |
| **Q3** | Your drafted art (Lanfear, Rand in the box, Taim, Stone Dog, Wise Ones, Asha'man, Perrin, Loial, Mat, wolves): which drafts are final? Please drop them where T15 can pick them up | Use each draft as that key's source if it passes the §4.1 checks; generate the rest from §4.3 |
| **Q4** | After the credits: return to the title (CAMPAIGN COMPLETE), or start a New Game+ victory lap at Stage 1 keeping score? | **Return to the title** |
| **Q5** | Flow priority: spend the ~10 Flow clips on the push through the doorway, Callandor and the circle, the linked fireball, Rand in the box and the sassy walk, in that order, with Grok for everything else? | **Yes** |
| **Q6** | Taim's volleys keep firing during the Lanfear fight (she shields and holds her attacks during each one)? | **Yes**; if playtests find it a tax, pause the clock in Z3 (one constant) |
