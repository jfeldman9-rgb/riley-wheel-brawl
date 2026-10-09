# Stage 6 plan: the Stone of Tear, and Rand al'Thor as the call-in

*Planner: Grok Bot, Fri Oct 9 2026. Branch `rwb-2-stage6-plan`, cut from `origin/rwb-2-stage5` at `dfc2559`.
This is a docs-only plan. It makes no game code changes. Live `rwb-w2` was at `06979ff` when this was written.
Names marked **†** are new. Every other name was checked in this checkout or on `origin/rwb-w2`.*

Jason asked for three things on Oct 9:
1. **A Stone of Tear level.**
2. **From Stage 6 on, Rand al'Thor replaces Loial as the call-in.** Rand uses the fat-man angreal and wipes out
   the Trollocs on screen with fireballs and lightning.
3. **A cutscene every time Rand is called, with several variants.**

Tone stays teen/adult. Riley is 16 and Jason plays a lot. There is no gore. Shadowspawn dissolve to ash
(`fx-ash` style), and the Forsaken burn or vanish.

## 0. Ground rules (every task)

- **Protected files.** `src/input.js`, `lib/` and `index.html` never change. The touch `CALL` button
  (`#tbL`, `index.html:81`) already has a neutral label, so Rand needs no HTML change. The `assist` action
  (keys R/V/U/I, pad LB, `#tbL`; `src/input.js:8,10,70`) still drives the call. `src/riley.js:36` calls
  `scene.callLoial?.()`, and Stage 6 reroutes that call through a kit hook (§3.1). `src/stage1.js` is not edited,
  the same rule Stage 5 followed.
- **Same controls, HUD and touch layout as Stages 1–3.** Stage 6 never constructs `Input`
  (`tests/stage5-input`-style guard). Every Stage 6 readout sits inside the existing HUD slots. The `LOIAL READY` slot
  (`src/hud.js:177-181`) shows Rand's portrait and state on Stage 6 and later (§3.6).
- **Stages 1–5 keep Loial, byte-identical in behaviour.** A test asserts that Stages 1–5 still spawn `Loial` on
  `assist`, keep `loialReady` once per stage, and never load Rand art, Rand audio or Rand clips.
- **Budgets.** The 25,000,000-byte Stage 1 pre-fight gate is at about 24,997,923 bytes, which leaves only about
  2 KB. Every Stage 6 file therefore goes in a new uncounted `STAGE6_SRC`† set in `tools/audit-stage1.mjs`,
  with its own budget line (§7). Edits to counted shared files (`src/stages.js`, `src/hud.js`, `src/audio.js`) are
  limited to a few bytes each.
- **Hardening lessons carried from Stages 3–5.** Specifically:
  - grab ownership, with `releaseHold('break')` on the call, death, stage switch and destroy;
  - governor-safe `setQuality` before `build()`;
  - `stage4Delta` with 120 Hz substeps;
  - zone-clear disposal;
  - a `counterUsed` latch on every boss attack;
  - lights ≤ 10;
  - attack tokens ≤ 2.
- **No placeholder text for players.** Procedural stand-ins draw their `PLACEHOLDER` stamp only under
  `?debug`, as `tests/no-placeholder.test.mjs` on `rwb-w2` requires. Stage 6 joins that test (§9).

## 1. Setting and story

**Recommended timeline: the night the Shadow attacks the Stone (The Shadow Rising, ch. 10).** This is the canon
fit for everything Jason asked for:
- Trollocs and Myrddraal come in hidden on grain barges at the docks.
- Gray Men stalk the halls.
- Darkfriend brawlers fight beside the Shadowspawn.
- The Defenders of the Stone hold the halls.
- Rand ends the night by calling a storm whose lightning kills every Fade and Trolloc in the Stone.
- Rand found the fat-man angreal (green stone, a round cross-legged man with a sword across his knees) in the
  Stone's Great Holding (TSR ch. 22).

That makes the call-in canon flavour rather than an invention.

**Honest canon note.** Be'lal (the boss Jason suggested) died in the Heart of the Stone *before* that night (The
Dragon Reborn, ch. 55, balefired by Moiraine). Using Be'lal bends the timeline a little. That is fine for a fan
game, but Jason should choose it knowingly (Q2).

**Bridge from Stage 5.** Stage 5's recorded outro points at Tarwin's Gap (`st5_clear_02`/`03`). Stage 6's story-in
picks that up with no re-recording:
- NARRATOR `st6_story_01`: *"Tarwin's Gap held. But the Fade's trail ran south, to the greatest fortress in the world."*
- RILEY `st6_story_02` (panel: the Stone of Tear over the harbor at night): *"The Stone of Tear. She's in there."*
- NARRATOR `st6_story_03` (panel: grain barges, Trolloc eyes in the dark holds):
  *"That night, the barges at the Maule were not carrying grain."*
- RAND `st6_story_04` (panel: Rand in the torchlit hall, angreal in hand):
  *"You're the one hunting the Half-man. Then we hunt together."*
- RILEY `st6_story_05`: *"Just don't steal my kills."*

**Story out** (the clear card plus 3 lines; sets up Stage 7): RAND `st6_clear_01` *"The Stone is ours. Your sister's trail
goes east, into the Waste."* / RILEY `st6_clear_02` *"Rhuidean."* / RAND `st6_clear_03` *"Call, and I'll come."*
This matches `plan/LEVELS.md` row 8 (Rhuidean).

**Tarwin's Gap** (`plan/LEVELS.md` row 6) is displaced. Q3 asks Jason whether it becomes a later bonus stage, the
way the Ways did.

## 2. The level

World 5200 px with 4 zones, in the same registry shape as `STAGE5` (`src/stage5-def.js`). The bot target is 4–4.5 min.
Lanes stay 572–690. Stage 6 adds 2 new enemy types and 1 elite, and reuses the rest.

| Zone | Place | Light | Waves | Set piece / hazard |
|---|---|---|---|---|
| 0 (0–1280) | **The Maule docks**: wet planks, grain barges, the Stone's sea wall above | Night, harbor lanterns, rain sheen | `[grunt R 0, grunt L 1.2]`, `[spear R 0, cutthroat L 0.6, hound R 1.6]` | **Barge holds burst**: a hatch kicks open and spawns the next Trolloc (spawn side `B`†, the hatch shakes for 1.0 s as a tell). **Cargo-net drop**† from a crane (§2.3). |
| 1 (1240–2520) | **The sea-gate and the lower halls**: Defenders' barricade, redstone columns | Torches and gilded lamps | `[grayman† T 0, grunt R 0.8]`, `[cutthroat L 0, spear R 0.5, grunt R 1.8]` | **Defenders hold the line** in the background, with ambient clashes and no escort mission. **Falling lamp**† (§2.3). Twinkle Toes' ribbon is snagged on a lamp chain. |
| 2 (2560–3840) | **The Great Hall of columns** | Lamps, torches, lightning flicker through high windows | `[fadelt† R 0, grunt L 0.4, grunt R 0.8]`, `[grayman† T 0, hound L 0.6, spear R 1.2, grunt L 1.8]` | **Linked Trollocs**: killing the Myrddraal lieutenant drops the Trollocs linked to it (canon). Clear: a **Twinkle Toes glimpse** on a far gallery, using the `view.glimpse()` pattern. |
| 3 (3920–5200) | **The Heart of the Stone**: redstone dome, Callandor, the crystal sword, thrust into the floor | Crystal god-rays, cold white over warm | Boss (§2.4) | Callandor's glow pulses with the boss phases. Nobody can take it during the fight (Q6). |

### 2.1 Enemies

Reused unchanged: the Stage 1 `grunt`, `spear` and `hound` (`src/enemies.js`), and the Stage 3 `cutthroat`
grabber (`src/darkfriends.js`). The cutthroat stands in for the canon "Darkfriends siding the Shadowspawn". The
cutthroat stays the **only** regular grabber, and the boss follows the same one-holder rule.

**Gray Man (`grayman`†, 34 HP, assassin; canon "Soulless").** A plain man in drab clothes whom the eye slides off.
Live cap **1**.
- **Unseen:** drawn at alpha 0.18 with a faint heat-shimmer outline. He becomes fully visible within 240 px of
  Riley, when lit by a fireball/lightning/light within 260 px (`lightNear`, `src/myrddraal.js`), or after 5 s.
  There is no infinite hiding.
- **Knife lunge:** a **0.6 s** tell (blade glint `knifeGlint`†, a short pale flash that is always drawn, even while
  he is unseen), then a 320 px lunge for 14 damage and no knockdown. A miss leaves 0.8 s of recovery at ×1.3 damage
  taken.
- **Counter (one):** an active attack frame that faces him during the lunge knocks him down (`COUNTER!`).
- **Token:** tell plus lunge count as `attack`.

**Myrddraal lieutenant (`fadelt`†, elite, 120 HP).** It reuses the Stage 3 `fade` atlas (no new art), scaled to 0.92
with a red sash tint, and keeps the Stage 3 shadow-blink only. There is no fear aura or split; those stay boss tricks.
- **Link:** spawns with up to 3 `linked` Trollocs from its wave. When it dies, each linked Trolloc collapses into a
  1.5 s **daze**. They are not killed. A HUD hint shows once: `KILL THE HALF-MAN, ITS TROLLOCS REEL`.
- **Sword string:** 3 hits. The tells are 0.5 / 0.35 / 0.45 s, the third is counterable, and each hit does 10 / 10 / 16.

**Defenders of the Stone.** They are **background allies, not enemies** (Q5). Painted on the zone 1 plate, they have a
looping clash animation on one mid-plate prop and a voice bark (`defender_01`† *"For the Stone! For the Dragon!"*).
Fighting the Defenders as enemies is possible, but it would make the Rand rules messy (Rand would be blasting
Tear's own soldiers), so it is not the default.

### 2.2 Light and atmosphere

- The rain sheen on the docks is a scrolling overlay, not particles.
- Lightning flickers through the hall windows every 6–10 s (a tint pulse on the far plate, no light object).
- Callandor's god-rays are unlit additive sprites.
- Governor level 2 or higher: no rain overlay, half the window flicker.

### 2.3 Hazards (exact numbers, all modelled on shipped patterns)

| Hazard | Where | Tell | Effect | Caps / counters | Cleanup |
|---|---|---|---|---|---|
| **Cargo-net drop**† (clone of the Stage 2 stable beam, `STAGE2.beams`) | Z0 | **1.0 s** shadow on one `VOLLEY_BANDS` band, crane creak `craneCreak`† | Riley: 10 dmg and a 0.8 s snare (`fogSlow` 0.6). Enemies: 18 dmg and down | ≤ 1 live tell, every 3.2–4.6 s, never on the exit strip | `clearStage6Zone`† |
| **Falling lamp**† (clone of the Stage 3 roof-tile tell) | Z1, Z2 | **1.1 s** lamp swing plus a ground ring r 80, `chainRattle`† | Lands for 12 dmg and knockdown, then a burning oil pool r 80 for 3.0 s: Riley takes 4 per 0.5 s, enemies take 10 per 0.5 s | ≤ 1 tell plus 1 pool live. Never within 0.8 s of Riley's getup end. A fireball on a swinging lamp drops it early (good for luring enemies) | `clearStage6Zone`† |
| **Barge hatch**† | Z0 | 1.0 s hatch shake | Spawns 1 Trolloc only (no damage) | Spawn cap = the wave list | — |
| **Netweaver lines**† (boss, option A) | Z3 | **1.2 s** thin black-fire line across one band | 8 dmg and a 1.0 s snare | ≤ 1 band live in P2; ≤ 2 in P3, always leaving at least 1 band clear | `clearStage6Hazards`† |

### 2.4 Boss: three options (Jason picks, Q1)

**A. Be'lal, the Netweaver (recommended; Jason's own example; `plan/LEVELS.md` row 7).** HP 640, phase gates at
66% and 33%. Until a beat fires, damage clamps at the next gate, the same rule as `aginor.js`.
- **P1, Sword of black fire:** a 4-hit flurry. The tells are 0.55 / 0.35 / 0.35 / 0.6 s, and only the 4th hit is
  counterable (`COUNTER!` stuns him for 1.4 s). Then a 380 px lunge with a 0.7 s tell, telegraphed by a black-fire
  streak on his band.
- **P2, Netweaver:** adds the Netweaver lines (§2.3), and at the gate he summons 2 Trollocs from the shadows. He
  keeps the flurry.
- **P3, Callandor flares:** god-rays pulse from Callandor. Standing in a ray for 1.0 s gives Riley one empowered
  fireball (the existing angreal `fireDmg`). Be'lal tries to reach Callandor: a 1.5 s channel tell with a glowing hand
  that any hit interrupts. **He can never take it.**
- **Defeat beat:** at 0 HP he staggers, and a white bar from off-screen right erases him. That is Moiraine's
  balefire, reusing the `beam` texture from `src/stage1.js:445`. He dissolves into light motes. Moiraine then speaks
  a single line, reusing her established voice where possible.
- **Art:** 10 painted poses at 360×500 (about 6.9 MiB, the same as the Draghkar), plus a 136 px portrait.

**B. Lanfear (canon present that night, TSR ch. 10).** HP 600. She is theatrical and never dies; at 0 HP she smiles
and steps through a gateway, which keeps her as a recurring villain.
- **P1:** compulsion pulses (a ring tell; Riley walks slowly toward her unless he jumps).
- **P2:** turns Trollocs on each other (some adds attack each other, a canon detail).
- **P3:** fire lances from all three bands, with 1 band always safe.

Risk: a female Forsaken fighting a 16-year-old needs the same no-flirt, purely villain tone the rest of the game
keeps.

**C. Ba'alzamon in the dream-twisted Stone (TDR ch. 55).** HP 700. The hazards straight from the book are flames from
the floor, rising water that slows, and "heavy air" that shrinks jump height. That makes a strong hazard variety. Risk:
he is the series' biggest villain, so spending him at Stage 6 leaves less for Stage 10. It also needs the most new art
(the fire-eyed face).

*Cheapest fallback (not recommended):* a Myrddraal captain with the Stage 3 fade art. Riley already fought a Fade
boss in Stage 3.

## 3. The Rand call-in (Stage 6 and later)

### 3.1 How it replaces Loial

- `riley.js:36` calls `scene.callLoial()`. `installStage6SceneHooks`† (a copy of the `hook()` helper in
  `src/stage5-lifecycle.js`) wraps `callLoial` on Stage 6+ scenes so it calls `callRand`† instead. The hook is
  restored on teardown, so Stages 1–5 never see it.
- `STAGE6_CHARS` drops `loial` (it saves about 10.1 MB of atlas; see `docs/stage3/ART-NEEDED.md:55`) and adds the
  Rand sheet as a stage texture.
- For Stage 7+, the rule lives in one place: `callInFor(stageNo)`† returns `'rand'` when `stageNo >= 6`, else `'loial'`.

### 3.2 Charges and cooldown

Loial is once per stage (`riley.loialReady`, `src/riley.js:25`). Rand is stronger, so he is rarer per stage but can
come back:
- **1 charge at stage start.** Hold at most 1.
- **Recharge:** **10 KOs by Riley himself** (Rand's kills don't count) **and** at least **45 s** since the last call.
  The HUD shows progress (§3.6).
- **At most 3 calls per stage.** In the boss arena, **at most 1 call per boss phase.**
- **Refused, with nothing spent**, in any of these cases:
  - no hittable foe on screen (`hasHittableFoe`, `src/stage1.js:452`);
  - the boss is invulnerable or in a beat;
  - balefire is active;
  - Rand is already on screen;
  - victory is pending;
  - the game is paused.

  A refusal plays `riley_st6_rand_wait_01`† *"Rand needs a breather."*, with the same 2.5 s gap as `riley_call_spent_01`.
- A call breaks any hold on Riley (`releaseHold('break')`, the same as the Stage 4/5 `callLoial` hooks) and gives Riley
  2.0 s of `inv` after the cutscene ends, so he never eats a cheap hit straight out of the pause.

### 3.3 Screen-clear rules

"On screen" means `camX - 60 ≤ x ≤ camX + VW + 60`, `canBeHit`, and not `entering`. Enemies still walking in from off
screen are not hit, and the next wave spawns normally. Rand clears the screen, not the zone.

| Target | Result |
|---|---|
| Trolloc `grunt`, `spear`, `hound`, linked Trollocs | **Destroyed** (lightning bolt, then ash) |
| Myrddraal lieutenant `fadelt` | **75% of max HP and down 2.0 s.** It survives, so Riley still has to finish the elite |
| Humans: `cutthroat`, `grayman` | **60% of max HP and down 1.6 s. Never killed by Rand** (no hero frying people; Riley finishes them) |
| Boss | **10% of max HP, clamped at the next phase gate** (it never skips a phase, never kills, and does nothing while `invuln`). The boss's current attack is interrupted (1.0 s stagger). Boss adds follow the rows above |
| Hazards | Live tells on screen are cancelled (nets, lamps). Pools and the Netweaver lines in mid-fire are not |

**Fairness math (Be'lal, 640 HP).** Three calls at most per stage, and one per phase, means Rand deals at most 192 of
640 HP, and in practice less because of the gate clamps. Each call also costs a pause and leaves Riley to finish the
survivors. The test plan (§9) requires that a bot calling Rand on cooldown still spends **at least 70%** of the no-Rand
boss time.

**Scoring.** Rand's kills give half points and do not feed combo, saidin or the recharge.

### 3.4 In-game effect (after the clip; 2.0 s, the world frozen except the effect)

- **t 0.0:** the screen dims to 70%. A thunder SFX plays (`randThunder`†, synth). Rand's sprite steps in at
  `camX + 110` on the top lane. He is untargetable, has no collision, and is drawn behind Riley.
- **t 0.3:** he raises the angreal, and a green-gold glow becomes **1 light** (`randGlow`†).
- **t 0.5–1.3:** one forked bolt per eligible target, staggered 0.08 s, **at most 8 bolts**. The bolts use the
  existing `fx_lightning` strip (`assets/powers/fx_lightning.png`, already loaded) and a `randBolt` sky-to-ground
  stretch. Targets past 8 are hit by up to **4 fireballs** that arc from Rand's hand, using the existing fireball
  texture and trail. One shared flash light jumps from bolt to bolt. Hitstop is 0.05 s per bolt, and trauma is capped
  at 0.8.
- **t 1.3:** the struck targets resolve (ash, or down).
- **t 1.6–2.0:** Rand's bark plays (§6). He fades out in a soft white shimmer and the dim lifts.

Light budget during a call: hero 1, the Callandor or hall feature 1–2, lamps 2, `randGlow` 1, bolt flash 1, pickup 1,
power 1, which makes **9 ≤ 10**. A call is refused while balefire's 2 beam lights are up, so the two never stack.

### 3.5 Audio

- **SFX** (synth, in `src/stage6-sfx.js`†, modelled on `STAGE4_CUES`): `randThunder`, `randCrack` per bolt
  (pitch-randomised, at most 3 voices), `randWhoosh` per fireball.
- **Music:** ducks to 35% during the clip and the effect, then restores. The cutscene hook's `silence()` must not be
  used here (§4.3).
- **Rand barks:** ElevenLabs (§6), 1 per call, rotating with no immediate repeat.

### 3.6 HUD

- Stage 6+ reuses the `LOIAL READY` slot with `randPortrait`† (136 px source, drawn at 30×30):
  - `RAND READY`
  - `RAND!`
  - `RAND 6/10`, where the number counts Riley's KOs toward the next charge and the 45 s minimum shows as a dimmed
    label
  - `RAND SPENT` (after the 3rd call)
- The text is set only on a state change. Per `src/hud.js:317`, `setColor` re-uploads the texture.
- The `#tbL` touch button keeps its `off` class logic (`src/hud.js:395-402`), driven by "Rand ready".
- This is done by a Stage 6 HUD hook (`stage6-hud.js`†), the way `stage4-hud.js` routes Stage 5. The pause/help text
  reads `CALL: Rand` on Stage 6 through the same hook. `src/hud.js` itself changes by 0 bytes if the hook can reach
  the label, or at most about 40 bytes for a label getter.

## 4. Rand call-in cutscenes

### 4.1 Rules

- **It plays on every call**, as Jason asked. Each clip is **2.5–3.5 s**.
- **Any tap, click, game button or pad button skips it**, using the existing `SKIP_ACTIONS`. `assist` is already in
  that set, so pressing CALL again skips. The existing **450 ms guard** (`GUARD_MS`) stops the CALL press itself
  from skipping the clip.
- **The game pauses** while it plays (`game.pause()`, the same ownership rule as `playFor`).
- **There are 4 variants in a shuffle bag with no immediate repeat**, including across bag refills. The bag's last
  pick is kept in `sessionStorage` (`rwb-rand-bag`†), so a restart does not replay the same clip first.
- **The call never depends on the clip.** If cutscenes are off (bot, demo, webdriver, `?nocutscenes=1`), the clip
  fails, or it does not start within **1.5 s**, the in-game effect (§3.4) runs anyway.

### 4.2 Size and encode

- Encode at 960×540 H.264 main, **CRF 28**, yuv420p, `+faststart`, `-g 24` (a keyframe every second so the first
  frame decodes fast), AAC 64k stereo (thunder only), and loudness toward -20 LUFS. This is the
  `tools/cutscenes/encode_cutscenes.sh` recipe with a per-clip CRF, plus a trim start and a duration (`-t`).
- **Size:** the existing intro battle clip is 4.17 MB for 18 s (about 1.85 Mbit/s, busy action). A 3 s lightning clip
  at that rate is about 0.7 MB. Lightning and rain compress badly, so the cap is **≤ 700 KB per clip** (CRF 29–30 if a
  clip runs over) and **≤ 2.8 MB for all 4**. Posters (`.jpg`, 640×360) are about 25 KB each.
- **Budget:** the shipped clips total 19,397,047 bytes on `rwb-w2`. The encoded Stage 5 clip
  (`/workspace/cutscenes/stage5_v1_web.mp4`, 2,338,688 bytes) brings that to about 21.7 MB of the 25,000,000
  `cutscenes.clips` line, and a Stage 6 intro clip (about 2 MB) brings it to about 23.8 MB. **The Rand clips don't fit
  that line.** They go in `assets/cutscenes/rand/`†. The audit's `readdirSync` is not recursive, so that folder would
  be silently uncounted. T2 therefore adds an explicit `cutscenes.randCalls`† line with a 2,800,000-byte budget.

### 4.3 Preload strategy (iPhone)

`CutscenePlayer` sets `src` only at play time, preloads nothing, and gives a clip 4 s to start (`START_MS`). That is
fine for a stage intro but too slow for a mid-fight call. The plan:

1. **Prefetch only the next clip in the bag**, never all 4. When the Stage 6 kit's `start()` runs, after the stage
   loader finishes and never before the first fight, `fetch()` the next variant into a `Blob` (about 0.7 MB of heap).
   Then `URL.createObjectURL`.
2. **After each call,** revoke that URL, drop the blob, and prefetch the following variant. At most **1 blob** is held,
   and it is released on stage teardown, restart and the governor's low-memory path.
3. **Play through a second player** with tight timeouts:
   `new CutscenePlayer(root, { base: 'assets/cutscenes/rand/', startMs: 1500, stallMs: 1000, maxMs: 6000 })`. The
   blob URL is played by pointing `base` at `''` and the id at the blob URL, or through a 2-line `srcFor(id)` override
   (§4.4).
   - Same `<video playsinline>` lifecycle: one element, `src` cleared after each clip.
   - It is blessed for sound on the first Stage 6 gesture by the same capture-listener trick as `installCutscenes`.
   - If iOS refuses sound, it falls back to muted, as today.
4. **Fallbacks.** If the blob is not ready, play the network URL. If nothing starts in 1.5 s, skip and run the effect.
5. **Device check (Jason's iPhone)** is required before going live. Blob-URL `<video>` works in current iOS Safari
   for small faststart MP4s, but it must be confirmed. If it misbehaves, the fallback is to warm the HTTP cache with
   `fetch(url, { cache: 'force-cache' })` and play the plain URL.

### 4.4 Playback hook (in the existing cutscene system)

`installCutscenes` (`src/cutscene-hooks.js`) exposes `root.__rwbCutscenes`. Its `playFor` refuses keys already in
`seen`, because it is once per session. That is right for stage intros and wrong for calls. So Stage 6 adds its own
small module, `src/rand-call-cutscene.js`† (in `STAGE6_SRC`, not in the cutscene source line), which:

- builds the call player (§4.3) and the shuffle bag;
- exposes `playCall(scene, then)`. That function:
  - returns `false` when cutscenes are disabled (the same `cutscenesEnabled(q, navigator)`);
  - sets the same `scene.cutscene` stub and `setPauseReason('cutscene', true)`;
  - pauses the game only when it owns the pause;
  - **ducks** the music instead of calling `silence()`, then restores the previous `music.state` and track on `done`.
    `silence()` expects the stage to bring the music back, which a mid-fight call never does;
  - aborts on scene `shutdown`;
  - calls `then()` exactly once, on 'end', 'skip', 'error' or 'timeout'.
- `callRand()` spends the charge first, then `playCall(scene, () => startRandStrike())`, or calls
  `startRandStrike()` directly when `playCall` returns `false`.

If the variant id is not a plain file name, `src/cutscene.js` needs a 2-line `srcFor(id)` override point. That is the
only shared-module edit, and it counts against the 20 KB cutscene source line.

The 4 entries go in `assets/cutscenes/ART_STATUS.json` with `placeholder: false`, `source: "grok-imagine"`, sha256,
bytes, trim, encode, the likeness note ("Riley appears only from behind") and `approvedBy`.

### 4.5 Variants and Grok Imagine prompts

**Method** (it worked on the intro and the stage clips):
- grok.com/imagine in the box browser, 720p, a **6 s** generation trimmed to the best 2.5–3.5 s.
- **Reference mode** (the @ picker, up to 7 references; references cannot be combined with a start frame) keeps 16:9
  and keeps Rand the same across all 4 clips. The references are:
  - `@rand_ref`†: a ChatGPT photoreal reference still of a fictional Rand. It must not resemble the Amazon series'
    actor, so it is never prompted by name;
  - `@angreal_ref`†: the green stone figurine, close up;
  - `@riley_back_ref`: the existing back-view outfit reference used for the intro clips;
  - `@stone_hall_ref`†.
- Short, single-action shots only. Long multi-beat prompts fail.
- No gore, no blood, no text. Monsters only flee or scatter as shadows; they are never struck on camera.

Rand's look in every prompt: a tall young man, early twenties, red-gold hair, grey eyes, a dark red coat with gold
embroidery (or black, per Q7), and a heron brand on the palm when his palm faces the camera.

| # | Name | Clip | Prompt |
|---|---|---|---|
| R1 | **Heron palm** | 3.0 s close-up | `Close-up at night in a torchlit stone hall. A tall young man with red-gold hair and grey eyes, dark red coat, opens his right hand. In his palm sits a small dark green stone figurine of a round fat man sitting cross-legged with a sword across his knees, and it begins to glow gold. A heron brand is on his palm. Blue-white sparks crawl up his wrist. Slow push-in on his face. Shallow depth of field. No text.` refs: @rand_ref @angreal_ref @stone_hall_ref |
| R2 | **Storm on the wall** | 3.0 s wide | `Wide low-angle shot at night in the rain. The same red-haired man stands on top of a vast grey stone fortress wall above a dark harbor and raises a small glowing green figurine over his head. Above him the storm clouds swirl and one huge fork of lightning splits the sky. Camera static. No text.` refs: @rand_ref @angreal_ref |
| R3 | **Fire down the hall** | 2.5 s medium | `Medium shot inside an enormous hall of red stone columns and gilded lamps. The same red-haired man in a dark red coat steps forward and thrusts his open hand toward the camera, and a roaring ball of fire flies past the lens down the hall. Distant monstrous shadows scatter. Warm firelight, handheld. No text.` refs: @rand_ref @stone_hall_ref |
| R4 | **Behind you** | 3.5 s | `A teenage boy seen only from behind in the left foreground, he never turns around: short dark hair, long black calf-length coat over a black sleeveless top, black fingerless gloves, black trousers and boots. Beyond him, the same red-haired man walks out of drifting smoke toward the camera with a small green figurine glowing in his fist and lightning flickering around him. Camera static at the boy's shoulder. No text.` refs: @rand_ref @angreal_ref @riley_back_ref @stone_hall_ref |

**Known Grok Imagine risks:**
- Red-gold hair drifts toward plain ginger or brown. Regenerate rather than fix in post.
- The heron brand often won't render. That is acceptable.
- The figurine may come out as a generic idol. `@angreal_ref` helps.
- R4 may turn the boy around. Any frame showing his face is rejected outright, because Riley is a real 16-year-old.
- If R4 fails 3 times, replace it with **R5 "Lightning hand"**:
  `Extreme close-up: a man's hand in a dark red sleeve clenches around a small glowing green figurine, and blue-white lightning bursts between his fingers. Black background. No text.`
  R5 is also the cheapest fallback for any slot.

Clip audio: keep the thunder and fire. Strip anything voice-like, because Rand's bark plays in-game instead (§6). That
way a skipped or failed clip still gets the line.

## 5. Art (ChatGPT collage sheets, processed by script)

Stage 6 follows the Stage 4 Draghkar pipeline:
- ChatGPT image generation on a flat key;
- the source kept verbatim in `art-in/stage6/`;
- a processor script in `tools/stage6/` (modelled on `tools/stage4/process_draghkar.py`: key, despill, blob split,
  one scale factor, feet anchored at `FOOT = 0.96 × CELL_H`, WebP out, sha256 written to `assets/stage6/ART_STATUS.json`†).

**Key colour choice:** the angreal is **green** stone, so Rand's sheet goes on **magenta**. The storm cloud is a dark
violet-grey, and violet cannot be cut off magenta (the Stage 3 lesson), so the cloud and bolt sheet goes on **green**.

| Key | Content | Cells | Cell | Key colour | Notes |
|---|---|---|---|---|---|
| `s6rand`† | Rand: 0 step-in, 1 stand, 2 raise angreal, 3 lightning cast, 4 fire cast, 5 fade-out pose | 6 | 320×480 | magenta | about 3.5 MiB RGBA. No normal map (unlit, drawn with a rim tint) |
| `randPortrait`† | head and shoulders | 1 | 136×136 | — | HUD slot, opaque WebP |
| `s6storm`† | storm-cloud band (2 frames) plus a sky-to-ground bolt (3 frames) | 5 | 640×200 / 96×640 | green | about 1.4 MiB |
| `s6belal`† (option A) | 10 poses, same layout as `s4drag` | 10 | 360×500 | magenta | about 6.9 MiB. Black-fire sword; violet glow kept below an excess of 20 |
| `belalPortrait`† | | 1 | 136 | — | |
| `s6gray`† | Gray Man: idle, walk, tell, lunge, hurt, down | 6 | 120×180 | magenta | about 0.5 MiB |
| `bg6far/mid/mid2/floor×3`† | docks, halls, great hall, Heart | | 1280-wide plates | — | in `assets/bg6/`†, not `assets/bg/`, so they stay out of the 25 MB pre-fight sum |
| `story6p1..3`† | story panels | 3 | 640×360 | — | |
| props | net, lamp (swing 3 frames), oil pool 3, hatch 2, Callandor glow 2 | | | magenta, except Callandor on **green** (pale violet-white crystal) | about 2 MiB |

**ChatGPT guardrail wording** (from Stages 3–4): ask for "Rand raises his hand and lightning crackles across the
sky" and "monsters flee". Never ask for "lightning strikes Trollocs" or for defeated bodies.

**Rand's face:** a fictional adult man. It is fine to paint him with image generation, as long as he does not resemble
the TV actor. Riley is not repainted.

## 6. Voice (ElevenLabs) and music

**Voice script** (all ElevenLabs, `eleven_v3`). Rand's voice is a designed voice: a young adult man, calm but with steel
in it, a slight rural edge, never comic. Riley's Stage 6 lines use the new ElevenLabs Riley voice that Jason asked for
on Oct 9. The prefix list is regex-safe for the audit: `/^(st6_|rand_|belal_|grayman_|defender_|riley_st6_)/`.

- **Riley calls** (1 per call, rotating): `riley_st6_call_01` *"Rand! Now!"*, `riley_st6_call_02` *"Dragon! Little
  help!"*, `riley_st6_rand_wait_01` *"Rand needs a breather."*
- **Rand barks** (1 per call, rotating): `rand_call_01` *"Down, Riley!"*, `rand_call_02` *"Burn, Shadowspawn."*,
  `rand_call_03` *"The Dragon is here."*, `rand_call_04` *"Stay behind me."*, `rand_call_05` *"Light, there's always
  more of them."*
- **Story:** `st6_story_01..05`, `st6_clear_01..03` (§1).
- **Be'lal (option A):** `belal_intro_01` *"Another boy who thinks the Power makes him a man."*, `belal_net_01`
  *"Every thread is mine."*, `belal_mid_01` *"Callandor is not for you."*, `belal_defeat_01` (a wordless gasp).
  Moiraine: `st6_moiraine_01` *"Not today, Netweaver."*
- **Others:** `grayman_01` (whisper), `defender_01`. `riley_st6_gray_01` *"Where'd he go?"*, `riley_st6_victory_01`
  *"Stone's clear."*

That is about 24 lines.

**Music:** `music-stage6` (martial drums, brass, a harbor-bell motif) and `music-boss6` (choir plus a low string
ostinato). Both use the Stage 4/5 composer pattern (`tools/stage5/compose_stage5.py`) and are loop-checked with
`tools/music/check_loops.py`.

## 7. Memory and audit budget

**`tools/audit-stage1.mjs` (T2):**
- `STAGE6_SRC`† set: every `stage6*.js`, plus `rand-call.js`, `rand-call-cutscene.js`, `belal.js` (or the chosen
  boss), `grayman.js`, `fadelt.js` and `bot-stage6.js`.
- Source budget **192 KB**, with per-file caps:
  - boss ≤ 16384;
  - `stage6.js`, `stage6-arena.js`, `bot-stage6.js`, `rand-call.js` ≤ 12288;
  - `grayman.js`, `fadelt.js`, `rand-call-cutscene.js` ≤ 9216;
  - art modules ≤ 24576;
  - hud, voice, sfx, def ≤ 6144.
- Voices: 24 × 200 KB. Music: 2 × 1.2 MB. Stage 6 art: **6 MB** of files on disk under `assets/stage6` and
  `assets/bg6`.
- `cutscenes.randCalls`†: 2,800,000 bytes.
- **The 25 MB pre-fight number must not move by more than the few bytes of the `src/stages.js` registry edit.**

**GPU memory (WebKit, every texture key, measured the same way as the Stage 4 Draghkar note):** the **target is
≤ 115 MiB at the boss peak**, keeping 5 MiB under the ~120 MiB guide. Stage 4 is at 118.9 MiB with only 1.1 MiB
spare, so Stage 6 is planned with real headroom.

Estimated change from the Stage 5 roster (`riley, grunt, spear, hound, loial`):
- minus Loial: about −10.1 MB;
- plus cutthroat (Stage 3 atlas, measure);
- plus fade (Stage 3 atlas, measure; it shares with `fadelt`);
- plus Rand: +3.5;
- plus storm: +1.4;
- plus boss: +6.9;
- plus Gray Man: +0.5;
- plus plates and props: about 12.

**Stage 5's own peak must be measured first.** No figure exists for it in the repo. If cutthroat plus fade push the
total past 115, the fallback is to drop the `fade` atlas and paint `fadelt` as a small 6-cell sheet (about 1 MiB).

The call clip adds a video decoder only while the game is paused and Phaser is not rendering. The element's `src` is
cleared afterwards, as for the existing mid-stage Stage 1 boss clip.

## 8. Build order

Stage 5 is not live yet, and Stage 6 builds on it.

0. **Gate.**
   - Stage 5 (PR #27) must first merge `rwb-w2` (this plan branch's base `dfc2559` predates the cutscene PR #37,
     the painted Draghkar and the Stage 3 art).
   - Jason OKs Stage 5.
   - It merges into `rwb-w2`.
   - The Stage 6 build branch `rwb-2-stage6`† is cut from that `rwb-w2`.

   If Jason wants Stage 6 started earlier, it is cut from `rwb-2-stage5` and rebased later, accepting the rebase cost.
1. **T1 registry.** `STAGES[6]` from `src/stage6-def.js`†, behind a **`s6=1` flag** until Jason OKs it.
   `stageEnabled`/`maxStage`/`stageFromQuery` accept 6 only with the flag. `STAGE5.next` → Stage 6 only with the
   flag. A `stage6-harness`† is copied from `stage5-harness`. Minimal bytes in `src/stages.js`.
2. **T2 audit and size caps** (§7). `stage6-size-caps`†.
3. **T3 Rand core** (pure, `src/rand-call.js`†): charges, recharge, eligibility, the damage table, boss clamp,
   bolt/fireball allocation, the `callInFor` rule. Tests first.
4. **T4 call cutscene** (`src/rand-call-cutscene.js`†): the bag, prefetch, the second player, duck/restore, the
   fallbacks. Tests use a fake player and a fake `fetch`, in the pattern of `tests/cutscene.test.mjs`.
5. **T5 kit, layout, view and hazards:** `Stage6Kit`, `assets/bg6/layout.json`, docks/halls/hall/Heart, net, lamp,
   hatch.
6. **T6 enemies:** `grayman`, `fadelt` with the link.
7. **T7 boss** (Jason's pick).
8. **T8 art:** ChatGPT sheets and `tools/stage6/process_*.py` with ART_STATUS. Procedural stand-ins until then, stamped
   only under `?debug`.
9. **T9 cutscenes:** Rand reference stills, R1–R4 in Grok Imagine, trim and encode, ART_STATUS. A Stage 6 intro clip
   is optional.
10. **T10 audio:** ElevenLabs lines, SFX, music.
11. **T11 HUD and flow:** the Rand slot, story in/out, the hint lines.
12. **T12 bot and campaign:** `bot-stage6.js`, 9 seeds, run both with Rand and without (§9).
13. **T13 hardening:** Codex Sol pass. **T14** Kimi K3 review, with GLM as a second opinion.
14. **T15 status doc. T16:** live only after Jason's explicit yes for that merge.

**Workers:**
- Grok 4.7 (Cursor) for T1–T7, T11 and T12.
- Gemini in Antigravity in parallel for T5/T8 scaffolding.
- Grok Bot (box) for T8–T10: ChatGPT, Grok Imagine, ElevenLabs.
- Codex for T13, Kimi for T14.

## 9. Test plan

**Rerun unchanged:**
- the Stage 2/3/4/5 campaigns (9/9 each);
- `full-stage-simulation` and `full-stage-evidence` (metadata-only regen);
- `tests/no-placeholder.test.mjs`;
- `tests/cutscene.test.mjs`;
- `balefire-loial`, `hud-loial-label`, `hud-input`, `player-input`;
- the Stage 2 fingerprint `cmp` = SAME.

Protected files show no diff. `node tools/audit-stage1.mjs` exits 0.

**New tests:**
- `stage6-registry`: `s6` flag gating; restart → `{ stage: 1 }`.
- `stage6-loial-unchanged`: Stages 1–5 still use Loial, once per stage, with no Rand assets queued.
- `rand-call`, covering every §3 number:
  - 1 charge at the start; recharge only from Riley KOs plus 45 s; 3 per stage; 1 per boss phase;
  - refused with nothing spent in each refuse case;
  - Trollocs die; `fadelt` survives at 25%; humans are never killed;
  - the boss takes 10%, clamped at the gate, never while `invuln`, and is never killed;
  - ≤ 8 bolts and ≤ 4 fireballs; `entering` enemies are never hit;
  - the hold breaks; 2.0 s `inv` after the call;
  - the result is the same at 30/60/120 Hz.
- `rand-call-cutscene`:
  - plays on every call;
  - 1000 draws with no immediate repeat, including across bag refills and a `sessionStorage` restore;
  - skip by tap, button or pad; the 450 ms guard;
  - `then` runs exactly once on end, skip, error and a 1.5 s no-start timeout;
  - with cutscenes disabled, the strike runs with no clip;
  - music is ducked and restored, never left silent;
  - pause, death or stage switch mid-clip leaves no overlay, no blob URL and no paused game;
  - at most 1 blob is alive at any time.
- `stage6-hazards`, `stage6-grayman`, `stage6-fadelt` (the link daze), `stage6-boss` (phases, tells ≥ spec, counter
  latch, the can-never-take-Callandor rule), `stage6-hud` (the Rand label states, `#tbL` `off` toggling).
- `stage6-campaign`: **bots clear 9/9 seeds with Rand off** (proving the stage is beatable without him). **They also
  clear 9/9 with Rand used on cooldown**, with these per-frame invariants:
  - lanes 572–690, tokens ≤ 2, at most 1 holder, lights ≤ 10, tells ≤ caps, finite values;
  - **the boss time with Rand ≥ 70% of the time without him** (the no-trivialise guard).
- `stage6-no-placeholder`: added to `tests/no-placeholder.test.mjs`'s stage list. The Stage 6 queue loads no file that
  an ART_STATUS marks `placeholder: true`, and no `PLACEHOLDER` text is drawn without `?debug`.
- `stage6-memory`: plate and sheet RGBA sums under the §7 caps, plus a WebKit boss-peak measurement recorded in
  `docs/stage6/STATUS.md`.
- `stage6-hardening`: idle 120 s, a no-power seed 1 clear, a 200-input fuzz, the governor before `build()`, and NaN/0/huge
  delta values.

**Device check by Jason:**
- an iPhone playthrough;
- 3 Rand calls in one run;
- one clip skipped by tap;
- airplane mode partway through (the fallback path).

## 10. Honest pushback

1. **A cutscene on every call can get tiresome.** Each call is a 3 s pause in the middle of a fight, up to 3 times a
   stage, and it breaks combo rhythm. It is skippable with a tap, and the 4 variants rotate, but by the third stage
   Jason has seen them all many times. The recommendation is to build it as asked, and add a one-line option (Q4):
   the full clip on the **first** call of each stage, then a 1 s in-engine sting (flash plus Rand's bark).
2. **A screen clear can make fights too easy.** That is why there is a hard cap (3 per stage, 1 per boss phase), why
   elites and humans survive, why bosses take only 10% clamped at the phase gates, and why "Rand off" must still clear
   9/9 in the bot test. Wiping the boss's adds is still very strong in P2. If playtests feel too easy, cut the cap to 2.
3. **Callandor.** `plan/LEVELS.md` row 7 has Riley taking Callandor with a moveset swap. With Rand in the stage, canon
   says Rand takes it. A moveset swap also risks the "same controls" rule. The plan keeps Callandor as scenery and a P3
   god-ray mechanic, and Rand takes it in the outro (Q6).
4. **Timeline.** Be'lal and the fat-man angreal don't overlap in the books (§1).
5. **Budgets are tight.** The pre-fight gate has about 2 KB left. The cutscene clip line is about 87% full once Stage 5
   ships. Stage 4 GPU memory is 1.1 MiB from the guide. That is why the plan uses its own budget lines, drops Loial's
   atlas on Stage 6, and sets a 115 MiB target.
6. **Rand's look across 4 clips.** Grok Imagine drifts. Expect about 2–3 generations per variant, and a reject on
   any face that looks like the TV actor.
7. **Stage numbering.** Earlier plans put Tarwin's Gap at Stage 6 and the Stone of Tear at Stage 7. This plan moves
   the Stone up to Stage 6 (Q3).

## 11. Open questions for Jason

| # | Question | Default |
|---|---|---|
| Q1 | Boss: **A Be'lal** (sword of black fire, Netweaver lines, Moiraine's balefire finish), **B Lanfear** (theatrical, escapes, recurring), or **C Ba'alzamon** (dream-twisted Stone hazards)? | A, Be'lal |
| Q2 | Set the stage on the canon Shadowspawn-assault night (fits the barges, Gray Men, Rand's lightning and the angreal), knowing Be'lal is out of timeline? | Yes |
| Q3 | Tarwin's Gap (old Stage 6): later bonus stage, or drop it? | Later bonus stage, like the Ways |
| Q4 | Rand cutscene on **every** call (as asked), or full clip on the first call per stage and a 1 s sting after? | Every call, with a tap to skip; revisit after a playtest |
| Q5 | Defenders of the Stone: background allies (default) or enemies under a Darkfriend High Lord? | Allies |
| Q6 | Callandor: Rand takes it in the outro (canon), or Riley takes it with a moveset swap (`LEVELS.md`)? | Rand takes it; no moveset swap |
| Q7 | Rand's coat: dark red with gold herons/embroidery, or black? | Dark red |
| Q8 | Is Riley-from-behind in the R4 "Behind you" clip OK, or should Rand clips show Rand only? | OK, from behind only, rejected on any face |
| Q9 | Rand rules: 3 calls per stage, 10 Riley KOs plus 45 s to recharge, bosses take 10% clamped at the gates. Right teeth? | Yes; tune after a playtest |
| Q10 | Stage 6 behind an `s6=1` flag until you OK it, the same as Stage 5? | Yes |
