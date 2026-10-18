# Stage 8 — Dumai's Wells & The Redstone Doorway (The Final Level): Implementation Plan

**Status:** Draft for Jason's review (no code or asset changes until approved)  
**Prerequisite:** Stage 7 shipped on `main` (`?s7=1`, commit `23ccf14`)  
**Feature flag:** `?s8=1` (or `?stage=8`) during build; default-on in the final task once all gates pass  
**Lore note:** Stage 8 is the grand finale of *Riley Wheel Brawl*. Like Stage 6 (where Riley claims *Callandor* from Be'lal in the Stone of Tear) and Stage 7 (where Riley hunts Asmodean across Rhuidean with Moiraine & Lan), Stage 8 fuses the iconic climax of *Lord of Chaos* (**Dumai's Wells**) with *The Fires of Heaven* (Lanfear and the **twisted redstone doorway**) and Riley's personal quest to rescue **Twinkle Toes**:

1. **Rand in the Box & Lews Therin:** At the center of the Shaido wagon ring at Dumai's Wells, Rand al'Thor is locked inside a heavy iron-bound wooden chest, shielded by six sisters. Inside the dark, Rand and Lews Therin Telamon converse in his head, testing the six knots of *saidar* until they feel the shield stretch thin and shatter it from within.
2. **Allies & Shaido (No Trollocs):** Every rank-and-file enemy on Stage 8 is **Shaido Aiel** or **Black Ajah** — zero Trollocs (`grunt`, `spear`, `hound` are excluded from `STAGE8_CHARS`). Fighting alongside Riley across the valley are **Rand**, **Mazrim Taim and the Asha'man**, **Perrin Aybara**, **Loial**, **Two Rivers bowmen**, **Far Dareis Mai (Maidens of the Spear)**, **Wise Ones**, and loyal **Aiel**.
3. **"Asha'man, kill!" Every 60 Seconds:** Every 60 seconds of active combat, Mazrim Taim bellows **"Asha'man, kill!"** (`st8_taim_kill_01`) and unleashes the iconic rolling wave of exploding earth and fire across the battlefield — a telegraphed multi-lane hazard that shreds Shaido enemies on screen and that Riley must dodge (via safe lane gaps, jumping the earth-heave seam, or Fire Shield).
4. **The Black Ajah Circle & Callandor Cutscene:** Mid-stage (end of Zone 2), Riley reaches **Twinkle Toes**, who is held captive inside a dark *saidar* shield woven by a **Circle of Black Ajah**. In a dedicated mid-stage cutscene, Riley channels through **Callandor** (`s6call`) to shatter the Black Ajah circle's web. Freed, Twinkle Toes begins channeling *saidar* and **links with Riley** — uniting *saidin* and *saidar* in both the cutscene and live gameplay (`s8linked`).
5. **Final Boss — Lanfear & The One Power Fireball Duel:** **Lanfear** descends as the final boss, furious and consumed by jealousy because Twinkle Toes was crowned **Queen of Love and Beauty at Medieval Times** instead of her. After two martial/channeling phases, Phase 3 culminates in an intense **One Power fireball duel** in front of the **twisted redstone doorway** (`s8doorway`).
6. **The Finale:** Lanfear screams **"I am the queen of love and beauty!"** right as the linked Riley + Twinkle Toes hurl a colossal braided *saidin*/*saidar* fireball that overpowers hers and blasts her backward through the redstone doorway into the realm of the Aelfinn/Eelfinn — Lanfear screaming **"Not again! Not the snake people! Ahhhhhhh!"** Twinkle Toes then hits a **sassy walk dance** and says **"Bubby you saved me! But what took you so long?"** and Riley replies **"Too many snack breaks."**

---

## 0. Ground Rules & Hard-Coded Stage 7 Spots to Generalise

### 0.1 Protected files (never touch)

Per `CLAUDE.md` and `tools/audit-stage1.mjs`:

- `src/input.js`, `src/hud.js`, `lib/`, `index.html`
- Any existing test under `tests/` (only add new `tests/stage8-*.test.mjs` files)
- Existing Stage 1–7 behavior when `?s8=1` is **not** set

### 0.2 Hard-coded Stage 7 / Stage 6 spots in the current checkout

Checked against the live tree (`23ccf14`):

| File : Line | What it currently does | Stage 8 change |
|---|---|---|
| [`src/stages.js:12`](file:///workspace/rwb-stage8-argon/src/stages.js#L12) | `export const MAX_STAGE = 7;` | Bump to `8`. |
| [`src/stages.js:16-20`](file:///workspace/rwb-stage8-argon/src/stages.js#L16-L20) | `stageEnabled(n, q)` checks `if (n === 7) return q?.get?.('s7') === '1'; if (n === 6) return q?.get?.('s6') !== '0';` | Add `if (n === 8) return q?.get?.('s8') === '1';` during T1–T14; flip `s7` and `s8` default-on in T15 when all gates pass. |
| [`src/stages.js:23-25`](file:///workspace/rwb-stage8-argon/src/stages.js#L23-L25) | `maxStage(q)` returns `stageEnabled(7, q) ? 7 : stageEnabled(6, q) ? 6 : 5;` | Return `stageEnabled(8, q) ? 8 : stageEnabled(7, q) ? 7 : stageEnabled(6, q) ? 6 : 5;`. |
| [`src/stages.js:42-50`](file:///workspace/rwb-stage8-argon/src/stages.js#L42-L50) | `STAGE_CHARS` maps `1..7` | Add `8: STAGE8_CHARS` (`Object.freeze(['riley'])` — **no Trollocs**; see §0.4). |
| [`src/stages.js:54-63`](file:///workspace/rwb-stage8-argon/src/stages.js#L54-L63) | `STAGE_TEXTURES` maps `1..7` | Add `8: STAGE8_TEXTURES`. |
| [`src/stages.js:242-250`](file:///workspace/rwb-stage8-argon/src/stages.js#L242-L250) | `STAGES` maps `1..7` | Add `8: STAGE8`. |
| [`src/stage7-def.js:25`](file:///workspace/rwb-stage8-argon/src/stage7-def.js#L25) | `next: () => ({ stage: 1, stage7Return: true })` | Change to `next: q => stageEnabled(8, q) ? { stage: 8 } : { stage: 1, stage7Return: true }` so Stage 7 flows into Stage 8 when enabled and preserves `tests/stage7.test.mjs` when `s8` is off. |
| [`src/stage4-actors.js:12-13,172`](file:///workspace/rwb-stage8-argon/src/stage4-actors.js#L12-L13) | Merges `STAGE5_ACTORS`, `STAGE6_ACTORS`, `STAGE7_ACTORS` into `STAGE4_ACTORS` (which `src/stage1.js:26` spreads into `ENEMY_CLASSES`) | Import `STAGE8_ACTORS` from `./stage8-actors.js` and spread `...STAGE8_ACTORS` into `STAGE4_ACTORS`. |
| [`src/bot-stage4.js:14`](file:///workspace/rwb-stage8-argon/src/bot-stage4.js#L14) | `if (s.stageNo === 7) return stage7Bot(bot);` | Add `if (s.stageNo === 8) return stage8Bot(bot);` before the Stage 7 check. |
| [`src/music.js:4`](file:///workspace/rwb-stage8-argon/src/music.js#L4) | `STAGE_MUSIC` maps `1..7` | Add `8: Object.freeze({ stage: 'stage8', boss: 'boss8' })`. Register `MUSIC.stage8` and `MUSIC.boss8` inside `src/stage8.js` (same pattern as `src/stage6.js:14` and `src/stage7.js:14` so `src/audio.js` does not grow). |
| [`src/cutscene.js:11-21`](file:///workspace/rwb-stage8-argon/src/cutscene.js#L11-L21) | `STAGE_CLIPS` has `intro, 1..4, 6, 7`; `EVENT_CLIPS` has `twix, trex` | Add `8: Object.freeze(['stage8'])` to `STAGE_CLIPS`. Mid-stage Callandor and Finale videos use `playSceneVideo(scene, 'assets/cutscenes/stage8_callandor.mp4')` and `'assets/cutscenes/stage8_finale.mp4'` from `src/call8-cutscene.js` (same pattern as `src/call7-cutscene.js:29`), keeping `CUTSCENE_SRC` untouched. |
| [`src/cutscene-hooks.js:84`](file:///workspace/rwb-stage8-argon/src/cutscene-hooks.js#L84) | `wrapStart(1, 'intro'); ... wrapStart(7, 7);` | Add `wrapStart(8, 8);` (+16 bytes; `CUTSCENE_SRC` is at 20,520 / 24,576 B, leaving 4 KB headroom). |
| [`src/texture-pages.js:5`](file:///workspace/rwb-stage8-argon/src/texture-pages.js#L5) | `const COMPACT_STAGES = new Set([4, 5, 6, 7]);` | Add `8` (`new Set([4, 5, 6, 7, 8])`) so `riley` uses the compact 4096×4096 atlas (`29.40 MiB` instead of `71.62 MiB`). |
| [`src/zone-stream.js:28-31`](file:///workspace/rwb-stage8-argon/src/zone-stream.js#L28-L31) | `STREAMS` defines stages `5, 6, 7` | Add `8: { far: 'bg8far', bleed: [128, 48, 48, 48, 128], zones: [...] }` so only the active zone's mid/floor plates stay on the GPU. |
| [`src/rand-call.js:14`](file:///workspace/rwb-stage8-argon/src/rand-call.js#L14) | `callInFor(stageNo)` returns `stageNo >= 7 ? 'moilan' : stageNo === 6 ? 'rand' : 'loial'` | Already returns `'moilan'` for `stageNo >= 7`! Stage 8 either keeps `'moilan'` for the `C`-key call-in while `src/stage8-allies.js` runs autonomous Perrin/Loial/Aiel/Asha'man battlefield assists, or extends `moilan-call.js` with Stage 8 allied summon visuals. Zero change needed in `src/rand-call.js`. |
| [`tools/audit-stage1.mjs:88-100,171`](file:///workspace/rwb-stage8-argon/tools/audit-stage1.mjs#L88-L100) | Audits `STAGE2..STAGE7` source, voice, art, music, video budgets | Add `STAGE8_SRC`, `STAGE8_VOICE`, `STAGE8_ART`, `STAGE8_MUSIC`, `STAGE8_VIDEO` and extend `checkGpuBudget()` to verify Stage 8's 4 zones + boss peak. |

### 0.3 Critical Pre-Fight Gate Discovery (`24,948,685 / 25,000,000` bytes)

> [!IMPORTANT]
> Running `node tools/audit-stage1.mjs` on the current checkout shows:
> `Pre-fight total: 24,948,685 B (23.79 MB) / 25,000,000 B` — **only 51,315 bytes (50.1 KB) of headroom!**
> Why? Because [`tools/audit-stage1.mjs:36-54`](file:///workspace/rwb-stage8-argon/tools/audit-stage1.mjs#L36-L54) (`bootSourceFiles()`) walks every static ESM `import` reachable from `src/bootstrap.js` → `src/main.js` → `src/stage1.js` → `src/stages.js` and adds those `.js` files to `preFight` (`lines 146-148`).

To stay safely inside the 25,000,000-byte pre-fight gate without touching any Stage 1–7 asset:
1. **Keep Stage 8's JS footprint compact (~38–42 KB across 14 focused modules)** — Stage 7's 14 modules total `46,356 B`; targeting `≤ 42,000 B` for `STAGE8_SRC` keeps `preFight` at `~24,990,685 B` (`< 25,000,000 B`) with zero change to how `bootSourceFiles()` works.
2. **Never add Stage 8 entries to `src/audio.js`** — register `MUSIC.stage8`, `MUSIC.boss8`, and `STAGE8_VOICES` inside `src/stage8.js` (just as Stages 6 and 7 do) so `VOICE` files in `assets/audio/voice/` are not pulled into `audit-stage1.mjs`'s Stage 1 voice scan (`lines 56-68`).
3. **Reuse existing Stage 6/7 helpers directly** — import `FighterCore` (`src/stage7-fighter.js`), `gridFrames` (`src/stage7-frames.js`), `paintSheet`/`hurtEnemy` (`src/stage7-paint.js`, `src/stage7-hurt.js`), `playSceneVideo` (`src/cutscene-scene.js`), and `ShaidoDancer`/`ShaidoVeiled` (`src/shaido.js`) instead of duplicating boilerplate.

### 0.4 Why Dropping Trollocs on Stage 8 Frees 32.90 MiB of GPU Memory

Jason's brief specifies: **"Instead of trollocs we will have Shaido."**  
In Stages 1–7, `STAGE_CHARS` includes `'grunt'` (`19.90 MiB` RGBA), `'spear'` (`13.00 MiB` RGBA), and `'hound'` (`2.56 MiB` RGBA). By setting:

```js
export const STAGE8_CHARS = Object.freeze(['riley']);
```

Stage 8 **saves 35.46 MiB of decoded RGBA** (32.90 MiB vs Stage 7's `['riley', 'grunt', 'spear']`). That 32.90 MiB saving is what allows Stage 8 to load **the best, richest custom artwork in the game** — multiple Shaido classes, the Black Ajah circle, Rand in the box, Perrin/Loial/Asha'man/Taim allies, the combined **Riley + Twinkle Toes** linked sprite sheet (`s8linked`), the **twisted redstone doorway** (`s8doorway`), and **Lanfear** (`s8lanfear`) — while peaking at **~95.9 MiB** in Zone 4 (nearly 10 MiB **below** Stage 7's 104.58 MiB peak!).

---

## 1. Story Beats & Cutscene Scripts (Exact Lines)

### 1.1 Narrative Arc & Three-Act Structure

Stage 8 plays out in three dramatic movements across Dumai's Wells (`WORLD_W = 5200` px):

| Act | Trigger | Cutscene / Event | Gameplay Payoff |
|---|---|---|---|
| **Act I — The Box & The Killing Kettle** | Stage 8 start (`x = 0`) | **Pre-Stage Cutscene (`STORY8` / `stage8.mp4`):** Inside the iron-bound chest at Dumai's Wells, Rand al'Thor and Lews Therin Telamon conspire to break the six-sister *saidar* shield. Outside, Mazrim Taim and the black-coated Asha'man crest the ridge (`"Asha'man, kill!"`), Rand bursts the chest to splinters, and Riley charges into the Shaido host with Callandor at his hip. | Zones 1–2 (`x = 0..2600`): Fight through Shaido Spear-Dancers, Veiled Ambushers, Algai'd'siswai Heavies, and Wise One Channelers alongside Perrin, Loial, Maidens, and Two Rivers men, while dodging Taim's **every-60-seconds `"Asha'man, kill!"` rolling earth and fire** bombardment. |
| **Act II — The Black Ajah Circle & The Link** | Zone 2 clear (`x = 2520`, after breaking the outer guard around Twinkle Toes' shield) | **Mid-Stage Cutscene (`CALL8_SCRIPT` / `stage8_callandor.mp4`):** A Circle of Black Ajah sisters holds Twinkle Toes inside a suffocating web of dark *saidar*. Riley draws **Callandor**, ignites the crystal blade with roaring *saidin*, and cleaves the Black Ajah circle's shield in one blinding arc. Twinkle Toes immediately embraces *saidar* and **links with Riley** (`s8linked`). | Zones 3–4 (`x = 2600..5200`): Riley and Twinkle Toes fight **linked together** (`riley.linked = true`), wielding braided *saidin*+*saidar* dual-helix fireballs, extended twin-weave combo finishers, and a *saidar* grace barrier. |
| **Act III — The Jealous Forsaken & The Redstone Doorway** | Zone 4 boss arena (`x = 3920`) & Boss KO (`lanfear.hp <= 0`) | **Boss Intro (`LANFEAR_INTRO`)** + **Finale Cutscene (`FINALE8_SCRIPT` / `stage8_finale.mp4`):** Lanfear attacks in a jealous rage over Twinkle Toes' **Medieval Times Queen of Love and Beauty** crown. At low HP, Lanfear unleashes a massive One Power fireball duel in front of the **twisted redstone doorway**, screaming `"I am the queen of love and beauty!"` Linked Riley + Twinkle Toes overpower her fireball and blast her through the doorway (`"Not again! Not the snake people! Ahhhhhhh!"`). Twinkle Toes hits her sassy walk dance (`"Bubby you saved me! But what took you so long?"`) and Riley deadpans `"Too many snack breaks."` | 3-phase Lanfear boss fight culminating in an interactive **One Power Fireball Duel** before the redstone doorway, followed by the campaign victory sequence. |

---

### 1.2 Pre-Stage Opening Cutscene (`STORY8` / `assets/cutscenes/stage8.mp4`)

Played when Stage 8 starts (video `assets/cutscenes/stage8.mp4` first via `cutscene-hooks.js`, followed by or falling back to the 8-card illustrated story sequence `STORY8` in `src/stage8-def.js`; when `stage8.mp4` plays, `STORY8_CLIP_LINES` skips the redundant narrator cards just like `STORY7_CLIP_LINES` in `src/stage7-def.js:23`):

| Card | Speaker | Voice ID | Exact Caption / Dialogue Line | Visual Beat (`paintStory8`) |
|---:|---|---|---|---|
| 1 | `NARRATOR` | `st8_story_01` | `"Dumai's Wells. Beneath a sky choked with dust and ash, a hundred thousand Shaido ring the wagons where Rand al'Thor lies locked inside an iron-bound chest."` | Wide painterly view of Dumai's Wells wagon ring encircled by thousands of veiled Shaido spears; at the center sits the iron-strapped wooden chest pulsing with six crimson *saidar* shield knots. |
| 2 | `RAND AL'THOR` | `st8_story_02` | `"Dark. No air. Six sisters holding the shield... Lews Therin, are you there? They knotted three of the weaves when the fighting started outside."` | Cut inside the cramped, splintered darkness of the chest (`s8randbox` frame 0); sweat and golden *saidin* sparks flicker around Rand's bruised knuckles as six glowing red knots hang in the blackness. |
| 3 | `LEWS THERIN` | `st8_story_03` | `"I am here, kinslayer... Reach through the knots! Soft when they are tied — slide between the threads and CRUSH THEM!"` | Ghostly golden-white double-exposure of Lews Therin whispering over Rand's shoulder (`s8randbox` frame 1); ghostly fingers trace the soft loops of the six *saidar* knots and pry the first three apart. |
| 4 | `RAND AL'THOR` | `st8_story_04` | `"Three untied... the other three are softening! Hold on — I can feel the True Source! I can feel saidin!"` | Three crimson knots snap in a shower of sparks (`s8randbox` frame 2); roaring white-gold *saidin* floods the chest interior as the iron bands begin to bulge and glow white-hot. |
| 5 | `PERRIN AYBARA` | `st8_story_05` | `"The wolves are here! Loial, Two Rivers, Maidens — form the wedge! Break through to the wagons!"` | On the outer slope, golden-eyed Perrin (`s8allies` frame 0) raises his half-moon axe beside Loial's long-handled axe, Two Rivers longbowmen, Wise Ones, and veiled Maidens of the Spear charging into the Shaido line. |
| 6 | `MAZRIM TAIM` | `st8_story_06` | `"Black Tower, form the line! Asha'man, kill!"` | Black-coated Mazrim Taim (`s8taim` frame 0) stands atop the ridge as black gateways snap open behind him; a wall of rolling earth and geysering fire erupts through the front rank of Shaido. |
| 7 | `RAND AL'THOR` | `st8_box_break_01` | `"No more boxes! STILL THEM!"` | The wooden chest explodes outward in a blinding column of golden-crimson light (`s8randbox` frame 3); timber splinters and shockwaves hurl Shaido and shielding sisters backward across the wagons. |
| 8 | `RILEY` | `st8_story_08` | `"Rand's out, Taim's blowing up the hill, and the Black Ajah have Twinkle Toes behind the wagons. Keep your heads down — I'm going in!"` | Riley (seen from behind, Callandor gleaming at his hip and golden *saidin* crackling on his fists) sprints down the smoking ridge into the Shaido cauldron. |

---

### 1.3 Mid-Stage Cutscene — The Black Ajah Circle & Callandor Rescue (`CALL8_SCRIPT` / `assets/cutscenes/stage8_callandor.mp4`)

Triggered at the end of Zone 2 (`x = 2520`) as soon as Riley defeats the outer guard around the **Black Ajah Circle** holding Twinkle Toes captive (`src/call8-cutscene.js`, modeled on `src/call7-cutscene.js`):

| Step | Speaker | Voice ID | Exact Caption / Dialogue Line | Visual Beat / Action |
|---:|---|---|---|---|
| 1 | `BLACK AJAH SISTER` | `st8_circle_01` | `"Link the circle, sisters! Double the web! The Great Lord claims this little Queen — no man can pierce a linked shield of saidar!"` | Five hooded Black Ajah sisters (`s8sister`) stand in a pentagram around Twinkle Toes, weaving a pulsing violet-black dome of *saidar* chains that pins her to the scorched earth. |
| 2 | `TWINKLE TOES` | `st8_circle_02` | `"Let go of my dress, you creepy witches! When Bubby gets through those wagons you're all grounded!"` | Inside the dark dome, Twinkle Toes glares fiercely, straining against the violet-black threads as silvery-white sparks of her own *saidar* flare at her fingertips. |
| 3 | `RILEY` | `st8_circle_03` | `"A linked circle? Good thing I brought a crystal sword. Callandor — NOW!"` | Riley leaps to the edge of the pentagram and draws **Callandor** (`s6call`) overhead. A towering pillar of white-crimson *saidin* lightning pours from the sky into the crystal blade. |
| 4 | `NARRATOR` | `st8_circle_04` | `"The Sword That Is Not a Sword blazes like a second sun, cleaving the Black Ajah's web in a single blinding arc!"` | Riley brings Callandor down in a sweeping crescent slash. The violet-black dome shatters like glass, blasting all five Black Ajah sisters off their feet into the wagon wreckage. |
| 5 | `TWINKLE TOES` | `st8_circle_05` | `"I can feel the light! Here, Bubby — take my hand! Let's link our powers together!"` | Freed from the shield, Twinkle Toes rises in a shimmering halo of silvery-white *saidar* and clasps Riley's outstretched hand. Golden-black *saidin* and silvery-white *saidar* braid into a single double-helix aura around both of them (`s8linked`). |
| 6 | `RILEY` | `st8_circle_06` | `"Saidin and saidar linked together... Whoa. Hang on, Twinkle Toes — somebody very jealous just stepped out of the smoke."` | Riley and Twinkle Toes drop into their synchronized linked fighting stance (`riley.linked = true`, switching Riley's active render sheet to `s8linked`) as silver moonfire parts the smoke ahead at Zone 3. |

---

### 1.4 Pre-Boss Cutscene — Lanfear's Medieval Times Jealousy (`LANFEAR_INTRO` at Zone 4, `x = 3920`)

Triggered when linked Riley + Twinkle Toes enter Zone 4 (`x >= 3920`), where the **Dome of Air and Fire** meets the **twisted redstone doorway** (`s8doorway`) on the ridge crest:

| Step | Speaker | Voice ID | Exact Caption / Dialogue Line | Visual Beat / Action |
|---:|---|---|---|---|
| 1 | `LANFEAR` | `lanfear_intro_01` | `"Stop right there! You dared let the Green Knight place the Crown of Love and Beauty on HER head?! At MEDIEVAL TIMES?!"` | Lanfear (`s8lanfear`) glides down in flowing white-and-silver moon silk, eyes blazing with unhinged Forsaken vanity as she points an accusing finger at Twinkle Toes' sparkly paper crown. |
| 2 | `TWINKLE TOES` | `lanfear_intro_02` | `"Excuse me, lady! The Red-and-Yellow Knight threw the carnation to ME fair and square! And I got to wave at the whole arena!"` | Twinkle Toes puts one hand on her hip beside Riley, adjusting her Medieval Times crown with maximum sass while silvery *saidar* rings orbit her shoulders. |
| 3 | `LANFEAR` | `lanfear_intro_03` | `"A cardboard crown and a dry chicken leg?! Over ME — Daughter of the Night?! I will rip that crown from your curls and turn you both to ash!"` | Silver-black weaves of *saidar* and the True Power whip around Lanfear, cracking the stone ridge and igniting the twisted redstone doorway frame (`s8doorway`) behind her. |
| 4 | `RILEY` | `lanfear_intro_04` | `"Nobody messes with the Queen of Medieval Times. Ready, Twinkle Toes? Light her up!"` | Linked Riley + Twinkle Toes ignite their dual *saidin*/*saidar* aura (`s8linked`); boss HUD bar appears: **`LANFEAR — DAUGHTER OF THE NIGHT`** (`460 HP`). |

---

### 1.5 Finale Cutscene — The Fireball Duel, Redstone Doorway & Sassy Walk Dance (`FINALE8_SCRIPT` / `assets/cutscenes/stage8_finale.mp4`)

Triggered at the climax of Phase 3 when the **One Power Fireball Duel** reaches full push (`duel.progress >= 1.0` or `lanfear.hp <= 0`). All four of Jason's requested lines appear **word-for-word**:

| Step | Speaker | Voice ID | Exact Caption / Dialogue Line | Visual Beat / Choreography |
|---:|---|---|---|---|
| 1 | `LANFEAR` | `lanfear_queen_01` | `"I am the queen of love and beauty!"` | Backed against the glowing twisted redstone doorway (`x = 5040`), Lanfear shrieks at full volume, hurling a desperate, house-sized sphere of silver-crimson fire into the center of the ridge. |
| 2 | `RILEY` | `riley_finale_push_01` | `"Together — everything we've got! PUSH!"` | Linked Riley and Twinkle Toes (`s8linked` frames 12–15) thrust both hands forward together; a colossal braided golden-*saidin* and silver-*saidar* mega-fireball slams into Lanfear's sphere, swells to twice its size, and drives it straight back into her chest! |
| 3 | `LANFEAR` | `lanfear_doorway_01` | `"Not again! Not the snake people! Ahhhhhhh!"` | The linked fireball blasts Lanfear off her feet and propels her backward through the wavering violet-silver portal inside the **twisted redstone doorway** (`s8doorway` frames 2–3), where serpentine silhouettes of the Aelfinn/snake people loom in the alien tower beyond. The doorway flashes white-hot and melts into smoking glass. |
| 4 | `TWINKLE TOES` | `twinkle_saved_01` | `"Bubby you saved me! But what took you so long?"` | As the smoke clears and golden sunlight breaks over Dumai's Wells, Twinkle Toes breaks the link, adjusts her Medieval Times crown, hits a full **8-frame sassy walk dance** (`s8linked` frames 20–27: hip-sway strut, hair flip, spin, and finger-snap pose), and grins up at Riley. |
| 5 | `RILEY` | `riley_snacks_01` | `"Too many snack breaks."` | Riley shrugs with a grin, tosses a crumpled Twix wrapper over his shoulder, and high-fives Twinkle Toes as Perrin, Loial, Rand, Moiraine, Lan, and the Aiel cheer along the ridge behind them. |
| 6 | `NARRATOR` | `st8_clear_01` | `"The Shaido scatter to the four winds, the Forsaken falls beyond the redstone door, and the Dragon's brother brings the true Queen of Love and Beauty safely home. Thus ends the hunt — though the Wheel of Time turns on."` | Grand finale banner: **`STAGE 8 CLEAR — THE WHEEL WEAVES`** with final campaign score summary, total KOs, and victory fanfare. |

---

## 2. Level Zones (`WORLD_W = 5200` px) & Shaido Enemy Types

### 2.1 Four-Zone Layout at Dumai's Wells (`WORLD_W = 5200` px)

Matching Stage 7's `5200 px` 4-zone streaming architecture (`ZONE_W = 1300` px per zone, `LANE_TOP = 390`, `LANE_BOT = 525`):

| Zone | World `x` Range | Name | Setting & Landmarks | Active Mechanics & Allies |
|---:|---|---|---|---|
| **Zone 1** | `0 .. 1300` | **The Outer Shaido Ring** | Scorched Cairhienin ridge overlooking the bowl of Dumai's Wells; brushwood fires, broken spears, dust clouds, and Shaido war banners. | **Perrin & Two Rivers Volley** (`x = 540`) + first **Taim `"Asha'man, kill!"` timer** (early showcase barrage at `t = 18.0 s`, then every `60.0 s` thereafter). |
| **Zone 2** | `1300 .. 2600` | **The Wagon Barricade & Rand's Chest** | Overturned supply wagons, splintered **iron-bound wooden chest** (`s8randbox` prop at `x = 1820`) still smoking with golden *saidin* arcs and shattered red shield knots; at `x = 2500` stands the **Black Ajah Circle** dome holding Twinkle Toes. | **Rand Box Shockwave Assist** near `x = 1820`; **Black Ajah Circle encounter** at `x = 2280..2560` → clearing triggers the **Callandor & Link Cutscene** (`CALL8_SCRIPT`). |
| **Zone 3** | `2600 .. 3900` | **The Meatgrinder Trench (Linked Combat)** | Deep blast-crater trench between the inner wagons and the ridge crest; black Asha'man gateways flickering in the mid-ground; Loial and Aiel Maidens holding the flank. | **Linked Riley + Twinkle Toes (`s8linked`)** unlocked! **Loial + Maidens + Wise Ones Flank Sweep** (`x = 3140`); Taim 60s rolling earth & fire continues. |
| **Zone 4** | `3900 .. 5200` | **The Redstone Ridge & Dome of Air** | Shimmering Asha'man **Dome of Air** wall on the left (`x = 3900`), scorched limestone plateau in the center, and the ancient **Twisted Redstone Doorway** (`s8doorway`) standing at the right edge (`x = 5040`). | **Final Boss: Lanfear (`s8lanfear`)** — Phases 1 & 2 across `x = 3940..5080`, Phase 3 **One Power Fireball Duel** in front of the Redstone Doorway (`x = 4360..5040`). |

### 2.2 Background Streaming (`STREAMS[8]` in `src/zone-stream.js`) & Palette

Add `STREAMS[8]` to [`src/zone-stream.js:28`](file:///workspace/rwb-stage8-argon/src/zone-stream.js#L28) using the exact zone-eviction pattern proven in Stages 5–7 (at most 1 zone's `mid` + `floor` plates on GPU at any time = `10.17 MiB` total BG resident):

```js
8: {
  far: 'bg8far', bleed: [128, 48, 48, 48, 128],
  zones: [
    { end: 1300, mid: 'bg8mid',  floor: 'bg8floor'  },
    { end: 2600, mid: 'bg8mid2', floor: 'bg8floor1' },
    { end: 3900, mid: 'bg8mid3', floor: 'bg8floor2' },
    { end: 5200, mid: 'bg8mid4', floor: 'bg8floor3' },
  ],
},
```

**Palette (`STAGE8_PALETTE` in `src/stage8-def.js`):**
- `skyTop: 0x1a0d0a`, `skyMid: 0x471d12`, `skyBot: 0x8f3f1e` (blood-orange battle smoke & Asha'man fire-glow over Cairhienin hills)
- `groundTop: 0x4a3525`, `groundBot: 0x261a12` (churned earth, ash, and wagon ruts)
- `light: [1.06, 0.94, 0.84]`, `grade: { lift: [0.02, -0.01, -0.02], gamma: [1.0, 0.96, 0.92], gain: [1.06, 0.98, 0.92], sat: 1.08 }`

---

### 2.3 Shaido & Black Ajah Enemy Roster (Zero Trollocs)

Stage 8 replaces all Trollocs with **four Shaido Aiel combat archetypes** plus the **Black Ajah Sister** channeler. Two Shaido classes (`dancer` and `veiled`) reuse the battle-tested `src/shaido.js` core and sheets from Stage 7, while three new classes (`algai`, `wiseone`, `blackajah` in `src/stage8-shaido.js`) bring heavy bruiser, ranged *saidar*, and circle-shield mechanics:

| Enemy Key | HUD Name | Sprite Key | HP | Speed | Score | Role & Signature Moves |
|---|---|---|---:|---:|---:|---|
| `dancer` | `SHAIDO SPEAR-DANCER` | `s7dancer` (reused) | `42` | `156` | `420` | Fast double-spear rush (`rush`: 2 hits, `7+8 dmg`), **vault-kick** (`vault`, `z = 54`, anti-air counterable), and **low sweep** (`sweep`, `10 dmg` knockdown; jumped over when `riley.z > 22`). |
| `veiled` | `SHAIDO VEILED AMBUSH` | `s7veiled` (reused) | `34` | `144` | `450` | **Buckler stance** (`buckler`, reflects light/medium front hits; broken by heavy `combo3`/`runkick`/`airkick`/grab/powers) + **jar drop** (`smoke`, leaves a 3.5 s blinding dust/fire pot hazard). |
| `algai` | `SHAIDO HEAVY SPEAR` | `s8algai` (new 20f) | `58` | `118` | `520` | **Replaces Trolloc Grunt / Heavy:** Muscular Algai'd'siswai bull-hide buckler & war-spear bruiser (`poise: 6`, `armor: true` during `horn_charge`). Moves: **`horn_charge`** (0.45 s bull-horn shoulder ram, `12 dmg`, `kb: 280`, `down: true`), **`triple_thrust`** (3-hit spear flurry, `6+6+9 dmg`), and **`shield_bash`** (close-range stun check). |
| `wiseone` | `SHAIDO WISE ONE` | `s8wiseone` (new 20f) | `38` | `128` | `550` | **Ranged Shaido Channeler:** Keeps `pref = 310 px` spacing in shawl and bulky necklaces; weaves **`fire_dart`** (0.50 s crimson tell → fast *saidar* fireball along the lane, `10 dmg`, jumpable or reflectable with linked attack) and **`earth_snare`** (0.65 s ground glow under Riley's feet → 1.2 s root/slow unless dodged). Hitting her during `weave_tell` interrupts and triggers a **weave-break stun** (`1.1 s`). |
| `blackajah` | `BLACK AJAH SISTER` | `s8sister` (new 20f) | `48` | `134` | `650` | **Circle Warden & Dark Channeler (Zones 2–3):** Hooded Darkfriend Aes Sedai. In Zone 2 (`x = 2280..2560`), maintains a **violet *saidar* tether** to Twinkle Toes' shield prison (`shield_tether`) while firing **`balefire_lash`** (dark-violet whip beam, `12 dmg`, `kb: 260`) and **`night_bolt`** (spread of 2 dark *saidar* bolts). |

### 2.4 Wave Schedule (`STAGE8_WAVES` in `src/stage8-def.js`) & Pickups

10 waves across Zones 1–3 (`39` enemies before the boss), paced around the allied charges, the Black Ajah Circle rescue at `x = 2520`, and Taim's 60-second `"Asha'man, kill!"` cycle:

```js
export const STAGE8_WAVES = Object.freeze([
  // Zone 1 — Outer Shaido Ring (0..1300)
  { x: 260,  lock: false, spawns: [['dancer', 1], ['algai', -1], ['dancer', 1]] },
  { x: 580,  lock: true,  spawns: [['algai', 1], ['veiled', -1], ['wiseone', 1], ['dancer', -1]] },
  { x: 980,  lock: true,  spawns: [['algai', 1], ['algai', -1], ['wiseone', 1], ['veiled', -1], ['dancer', 1]] },
  // Zone 2 — The Wagon Barricade & Rand's Chest (1300..2600)
  { x: 1460, lock: false, spawns: [['dancer', 1], ['veiled', -1], ['algai', 1], ['wiseone', -1]] },
  { x: 1840, lock: true,  spawns: [['algai', 1], ['wiseone', -1], ['dancer', 1], ['veiled', -1], ['algai', 1]] }, // Rand box burst assist here!
  { x: 2360, lock: true,  circleGuard: true, spawns: [['blackajah', 1], ['blackajah', -1], ['algai', 1], ['wiseone', 1], ['blackajah', 1]] }, // Clearing triggers Callandor & Twinkle Toes Link Cutscene!
  // Zone 3 — The Meatgrinder Trench with Linked Riley + Twinkle Toes (2600..3900)
  { x: 2780, lock: false, spawns: [['dancer', 1], ['algai', -1], ['blackajah', 1], ['veiled', -1]] },
  { x: 3180, lock: true,  spawns: [['algai', 1], ['wiseone', -1], ['blackajah', 1], ['dancer', -1], ['algai', 1]] }, // Loial + Maidens + Wise Ones sweep!
  { x: 3620, lock: true,  spawns: [['blackajah', 1], ['wiseone', -1], ['algai', 1], ['veiled', -1], ['dancer', 1]] },
  // Zone 4 — The Redstone Ridge & Dome of Air (3900..5200): Final Boss Lanfear
  { x: 3920, lock: true,  boss: true, spawns: [['lanfear', 1]] },
]);

export const STAGE8_PICKUPS = Object.freeze([
  { x: 520,  y: 465, kind: 'angreal' },
  { x: 1120, y: 450, kind: 'apple' },        // Medieval Times Roasted Turkey Leg / Apple heal
  { x: 1760, y: 470, kind: 'fireshield' },   // Right before Rand's chest & second Taim barrage
  { x: 2260, y: 455, kind: 'callandor' },    // Before the Black Ajah Circle
  { x: 2720, y: 460, kind: 'apple' },
  { x: 3340, y: 465, kind: 'lightning' },
  { x: 3820, y: 455, kind: 'saangreal' },    // Pre-Lanfear power boost
  { x: 4380, y: 460, kind: 'apple' },        // Boss arena heal
]);
```

---

## 3. Allied Fighters at Dumai's Wells (`src/stage8-allies.js`)

Jason's brief specifies:
> *"Other good guys are fighting too, Asha'man, Perrin, Loial, Two Rivers men, Maidens, Wise Ones, Aiel."*

To make Dumai's Wells feel like a massive, living coalition battle **without** blowing the 105 MiB GPU texture ceiling or cluttering Riley's lane readability, Stage 8 implements a **Three-Part Allied Combat System** in `src/stage8-allies.js` using a shared multi-ally sprite sheet (`s8allies`, `1536×1024`, 12 frames = `6.00 MiB` RGBA) plus the `C`-key Call-In:

### 3.1 Scripted & Reactive Battlefield Assists (Zones 1–3)

| Ally Group | Trigger Zone / Condition | Visual & Combat Effect | Voice Bark |
|---|---|---|---|
| **1. Perrin Aybara + Two Rivers Bowmen & Wolves** | Zone 1 (`x >= 540`, Wave 2 start) and reactive every `38 s` in Zone 1–2 | Perrin (`s8allies` frames 0–2) charges across the upper lane swinging his half-moon axe (`16 dmg`, `kb: 260` to all Shaido in his path) while Two Rivers longbowmen loose a **12-arrow diagonal volley** into the right side of the screen (`10 dmg` per arrow to enemies, harmless to Riley) accompanied by two spectral wolf silhouettes leaping across the lane. | `st8_perrin_01`: *"Two Rivers, loose! Wolves, run them down!"* |
| **2. Rand Bursting from the Chest** | Zone 2 (`x >= 1800`, Wave 5 start near the iron-bound chest prop at `x = 1820`) | The splintered wooden chest (`s8randbox` at `x = 1820, y = 430`) erupts in a 360° golden-crimson **Dragon Shockwave** (`radius = 340 px`, `24 dmg` + high launch `vz = 340` to all Shaido & Black Ajah within range; leaves a 6-second golden *saidin* buff circle that boosts Riley's attack speed by `+18%`). Rand (`s8allies` frames 3–5) blasts two shielding sisters off-screen while shouting to Riley to save Twinkle Toes. | `st8_rand_assist_01`: *"I've got the Shaido channelers! Riley — get to Twinkle Toes behind the wagons!"* |
| **3. Loial + Maidens of the Spear (*Far Dareis Mai*) + Wise Ones + Loyal Aiel** | Zone 3 (`x >= 3140`, Wave 8 start) and reactive during heavy packs (`aliveEnemies >= 4`) | Loial (`s8allies` frames 6–8) sweeps his long-handled Ogier tree-axe across the center lane (`20 dmg`, wide knockdown) while veiled **Maidens of the Spear** and loyal **Aiel** (`s8allies` frames 9–11) vault in from the top ridge with double-spear strikes and **Wise Ones** weave a golden *saidar* heal pulse that restores **`+18 HP`** to Riley & Twinkle Toes. | `st8_loial_01`: *"For the Dragon and the Maidens! Clear the trench!"` |
| **4. Black-Coated Asha'man Perimeter Fire** | Ambient background/midground across Zones 1–4 + every-60s Taim barrage | Black-coated Asha'man silhouettes along the upper ridge line periodically hurl arcs of blue-white lightning and fireballs into background Shaido formations, and form the glowing **Dome of Air** wall at the left boundary of Zone 4 (`x = 3900`). | Driven by `src/stage8-arena.js` |

### 3.2 Player Call-In (`C` Key) on Stage 8

- `callInFor(8)` in `src/rand-call.js:14` already returns `'moilan'` (`stageNo >= 7`), so pressing `C` summons **Moiraine & Lan** (`s7moilan`, `2.62 MiB` RGBA) with zero change to `src/rand-call.js` or `src/hud.js`.
- On Stage 8, when `moilanCall` fires (`src/moilan-call.js` or wrapped in `src/stage8-allies.js`), **Perrin, Loial, and an Asha'man lightning bolt** join Moiraine & Lan's sweep as a **Grand Coalition Strike** (`+10` bonus AoE damage to non-boss Shaido and `+1` fireball clash push if triggered during Lanfear's Phase 3 duel!).

---

## 4. The Every-60-Seconds Taim `"Asha'man, kill!"` Rolling Earth & Fire Hazard

Jason's brief specifies:
> *"Every 60 seconds Taim yells 'Asha'man, kill!' and there's a rolling wave of exploding earth and fire that Riley has to dodge."*

### 4.1 Timing & State Machine (`src/stage8-arena.js`)

Implemented as a deterministic, self-contained state machine inside `Stage8Arena` (`src/stage8-arena.js`, following the exact pattern of `Stage6Arena`'s 10-second Be'lal net/fire rain and `Stage7Arena`'s Asmodean rift shockwaves):

- **Cadence (`TAIM_INTERVAL = 60.0` s):**
  - **First showcase barrage:** Fires once early in Zone 1 at **`t = 18.0 s`** after stage start (or when `riley.x >= 480`) so the player experiences the signature mechanic right away.
  - **Recurring cadence:** After the showcase, `taimTimer` resets to **`60.0 s`** and counts down during active combat (`!scene.paused && !scene.cutscene && !scene.storyActive`). If `taimTimer` reaches `0` while a mid-stage cutscene is playing or during Lanfear's final Phase 3 fireball duel lock, it holds at `0.5 s` until normal combat resumes.
- **Three-Stage Cycle (`idle` → `warn` → `rolling` → `cooldown`):**

| Sub-state | Duration | What happens on screen | Audio / Voice |
|---|---:|---|---|
| **`warn` (Telegraph)** | `2.6 s` | **1.** Red-gold warning banner flashes across the top of the playfield (`⚠ TAIM: "ASHA'MAN, KILL!" — DODGE THE FIRE LANES!`).<br>**2.** Mazrim Taim's black-coated silhouette (`s8allies` frame 6) appears on the ridge crest with raised hand.<br>**3.** Two of the three horizontal lane bands (`TOP = 390..435`, `MID = 435..480`, `BOT = 480..525`) light up with cracking **molten-orange fault lines** and rising embers, leaving **one guaranteed safe lane band** (rotating across the 3 sub-waves so Riley must weave up/down or jump). | Plays `say('st8_taim_kill_01')` (**`"Asha'man, kill!"`**) at `t = 0.0 s` + low subterranean rumble `sfx.thunder()`. |
| **`rolling` (3 Rolling Waves of Exploding Earth & Fire)** | `4.2 s` (`3 × 1.4 s` sub-waves) | Three consecutive **rolling curtains of exploding earth clods and geysering flame pillars** sweep from left to right across the camera viewport (`camX - 60` → `camX + 1340` at `920 px/s`):<br>• **Sub-wave 1 (`0.0..1.4 s`):** Covers `TOP + BOT` lanes (**`MID` lane `y = 438..476` is safe**).<br>• **Sub-wave 2 (`1.4..2.8 s`):** Covers `MID + BOT` lanes (**`TOP` lane `y = 390..428` is safe**).<br>• **Sub-wave 3 (`2.8..4.2 s`):** Covers `TOP + MID` lanes (**`BOT` lane `y = 486..525` is safe**, OR Riley can **jump (`z > 36`)** over the narrower earth-heave crest!). | Sequential `sfx.boom()` + crackling fire bursts as each geyser column erupts every `110 px`. |
| **`aftermath`** | `1.2 s` | Scorched crater decals fade out; `taimTimer` resets to **`60.0 s`**. | Smoke hiss; optional Riley bark (`riley_st8_taim_01`: *"Whoa! Watch the fire lanes — Taim isn't aiming!"* on the first dodge). |

### 4.2 Hit Resolution: Dodging for Riley & Carnage for Shaido

- **Against Riley:**
  - If Riley is standing inside an erupting lane band when the rolling wave front (`|waveX - riley.x| < 52 px`) passes **and** `riley.z <= 36` **and** Riley is not invincible/blinking:
    - If `powers.active('fireshield')` is active: **Fire Shield absorbs the hit completely** (`0 dmg`, plays shield-flare visual).
    - If `riley.linked` (`s8linked` *saidar* grace barrier ready): reduces damage by 50% (`7 dmg` instead of `14 dmg`, no knockdown).
    - Otherwise: deals **`14 dmg`** (`kind: 'heavy'`, `down: true`, `kb: 240`) and launches Riley with a scorched-earth dust burst.
- **Against Shaido & Black Ajah Enemies (Friendly-Fire Carnage!):**
  - True to Dumai's Wells in *Lord of Chaos*, Taim's Asha'man do not care who is in the way — any Shaido or Black Ajah enemy caught in an active erupting lane band takes **`26 dmg`** + instant knockdown (`knockdown(1, { kb: 320, launch: 280 })`)! Clever players can bait Shaido packs or Wise Ones into the glowing fault lines right before the wave rolls through.
  - Against Lanfear (Zones 4 Phases 1–2): Lanfear weaves a quick silver dome when a wave rolls through (`0 dmg`, brief `0.4 s` parry animation), keeping boss HP fair.

---

## 5. The Black Ajah Circle & Callandor Cutscene (`src/call8-cutscene.js`)

Jason's brief specifies:
> *"There is a circle of Black Ajah guarding Twinkle Toes. Riley has to use Callandor to break the circle in a cutscene, then Twinkle Toes starts channeling and links with Riley."*

### 5.1 Zone 2 Climax Setup (`x = 2280..2560`)

1. **Visual Prop & Tether:** As Riley enters the second half of Zone 2 (`x >= 2100`), Twinkle Toes (`s8linked` captive frame 18) is visible at `x = 2500, y = 455` inside a rotating pentagonal **Dark *Saidar* Shield Dome** rendered by `Stage8Arena`.
2. **The Circle Guard (Wave 6 at `x = 2360`):** Three active **Black Ajah Sisters** (`blackajah`) and two Shaido defenders guard the pentagram while two background sisters channel into the dome. While any `blackajah` warden is alive, violet *saidar* beams connect them to Twinkle Toes' cage.
3. **Callandor Pickup & Cutscene Trigger:**
   - A guaranteed **`callandor` pickup** spawns at `x = 2260, y = 455` right before the circle (so Riley always has Callandor glowing in hand, even if he didn't carry it from an earlier pickup).
   - The moment the last enemy in Wave 6 (`circleGuard: true`) is defeated, `Stage8Lifecycle` calls **`startCall8Cutscene(scene)`** in `src/call8-cutscene.js`.

### 5.2 `startCall8Cutscene(scene)` Execution Flow

Modeled directly on [`src/call7-cutscene.js`](file:///workspace/rwb-stage8-argon/src/call7-cutscene.js):

1. Sets `scene.cutscene = true`, `scene.call8Done = true`, clears transient projectiles, and faces Riley toward the Black Ajah circle (`x = 2500`).
2. Attempts `await playSceneVideo(scene, 'assets/cutscenes/stage8_callandor.mp4')` (skippable via `Enter` / `Space` / `Escape` / tap).
3. Plays the in-engine choreographed **Callandor Circle-Break & Link Sequence** (Steps 1–6 from §1.3 above, or just the final link-activation flash if the video played in full):
   - Riley raises **Callandor** (`s6call` overlay sprite), channels a vertical column of white-crimson *saidin* lightning into the pentagonal shield, and shatters the Black Ajah circle in a radial shockwave.
   - Twinkle Toes steps out of the shattered dome, channels a spiral of silvery-white *saidar*, and clasps Riley's hand.
4. Calls **`activateLinkMode(scene)`** (`src/stage8-linked.js`), setting `scene.riley.linked = true`, refilling Riley's HP to full (`riley.hp = riley.maxHp`), unlocking Zone 3 (`camLockX = null`), and displaying the HUD toast: **`SAIDIN + SAIDAR LINKED! DUAL FIREBALL & TWIN WEAVE ACTIVE`**.

---

## 6. The Linked Riley + Twinkle Toes Mechanic (`src/stage8-linked.js`)

Jason's brief specifies:
> *"then Twinkle Toes starts channeling and links with Riley. We should show them linked in the cutscene and game play."*

### 6.1 How Linked Mode Works Visually in Gameplay (`s8linked`)

Once `activateLinkMode(scene)` runs at the end of Zone 2 (and immediately if Stage 8 is booted straight into Zone 3/4 via debug/test helpers):

- **Combined Linked Sprite Sheet (`s8linked`, `2048×1536`, 28 frames = `12.00 MiB` RGBA):**
  - Instead of spawning a separate AI follower that could get stuck on terrain or desync from `src/riley.js` hitboxes, **`s8linked` renders Riley and Twinkle Toes together as a single unified dual-hero sprite** (plus a synced golden-*saidin* + silver-*saidar* braided ground ring and double-helix aura around them)!
  - In every animation state (`idle`, `walk`, `combo1`, `combo2`, `combo3`, `jump`, `airkick`, `cast`, `hurt`, `victory`, and `sassy_walk`), Twinkle Toes moves in tight choreographed harmony right beside/slightly behind Riley's shoulder — channeling silvery-white *saidar* weaves that mirror and amplify Riley's *saidin* strikes.
  - Because `src/riley.js` drives movement and physics while `Stage8View` (`src/stage8-view.js`) syncs the `s8linked` overlay/frame mapping over Riley's actor coordinates (`riley.x`, `riley.y`, `riley.z`, `riley.facing`, `riley.state`), **zero edits are needed to `src/input.js` or `src/hud.js`**, and all existing Riley controls (`Arrow/WASD`, `J` punch/kick, `K` jump, `F` fireball, `G` super, `C` call-in) work seamlessly!

### 6.2 Linked Gameplay Upgrades (`riley.linked === true`)

| Mechanic | Unlinked (Zones 1–2) | Linked Riley + Twinkle Toes (Zones 3–4 & Boss) |
|---|---|---|
| **Fireball (`F` key)** | Standard *saidin* fireball (`14 dmg`, `0.95 s` cooldown, single hit) | **Braided *Saidin* + *Saidar* Fireball (`spawnLinkedFireball`):** Golden-and-silver double-helix projectile (`22 dmg`, `0.65 s` cooldown, `+35%` hitbox height, pierces through the first rank-and-file enemy to hit a second target behind them, and drives the **Fireball Duel clash meter** in Lanfear Phase 3). |
| **Combo Finisher (`combo3` / `airkick`)** | Roundhouse / flying kick (`14 dmg`, `230 px` reach) | **Twin-Weave Finisher:** Twinkle Toes snaps a silvery *saidar* air-whip crescent simultaneously with Riley's kick, adding **`+6 bonus damage`** (`20 dmg` total), **`+45 px` horizontal reach**, and a silver-gold impact burst that breaks `veiled` bucklers and `algai` horn-armor on contact. |
| **Defensive Link Grace (`linkGrace`)** | Standard damage taken | **Saidar Grace Cushion:** A shimmering silver-gold weave orbits the pair every `12.0 s`. While active, the next incoming hit has its damage reduced by **35%** and cannot knock Riley down (`down: false`), then recharges over `12.0 s`. |
| **Super (`G` key — Balefire / Linked Nova)** | Standard Balefire beam | **Braided One Power Beam:** Fires a twin gold-and-silver beam across the lane (`+25%` damage to bosses, instant KO to non-boss Shaido/Black Ajah in lane). |

---

## 7. Final Boss: Lanfear, Daughter of the Night (`src/lanfear.js`)

### 7.1 Concept, Lore & Motivation

Jason's brief specifies:
> *"The final boss is Lanfear. She is jealous of Twinkle Toes because Twinkle Toes was crowned the queen of love and beauty at Medieval Times. There is a big fight with the One Power with lots of fireballs."*

- **HUD Name:** `LANFEAR — DAUGHTER OF THE NIGHT` (`boss: true`, `hp: 460`, `score: 12000`, `scale: 1.0`, `baseH: 300`).
- **Arena Bounds:** Zone 4 (`x = 3900..5200`, `LANE_TOP = 390`, `LANE_BOT = 525`).
  - Left boundary (`x = 3900`): Shimmering Asha'man **Dome of Air** wall.
  - Right landmark (`x = 5040, y = 445`): The **Twisted Redstone Doorway** (`s8doorway`, 4-frame animated prop: dormant carved red stone → pulsing silver-violet runes → open Eelfinn/Aelfinn snake-realm portal → melted smoking glass after Lanfear is blasted through).
- **Architecture:** Pure state machine extending `FighterCore` (`src/stage7-fighter.js`, the exact pattern of `src/asmodean.js` and `src/belal.js`) wrapped by `LanfearActor` in `src/stage8-actors.js`.

### 7.2 Three-Phase State Machine (`460 HP`)

| Phase | HP Threshold | Theme & Speed | Signature Attacks & Telegraphs | Counterplay & Vulnerability Windows |
|---|---|---|---|---|
| **Phase 1: Daughter of the Night** | `100% → 65%` (`460 .. 300 HP`) | Regal, disdainful silver-moon channeling & *Tel'aran'rhiod* spatial stepping (`speed: 148`, `poise: 8`). | **1. `moon_fire_salvo` (`0.48 s` tell → `0.75 s` volley):** Lanfear fans 3 silver-crimson fireballs down the top, mid, and bottom lanes (`12 dmg` each; one lane gap or jumpable at `z > 34`).<br>**2. `silver_whip` (`0.42 s` tell → `0.36 s` active):** Sweeping crescent of silver *saidar* (`x0: 20, x1: 310`, `14 dmg`, `kb: 280`).<br>**3. `mirror_step` (`0.38 s` invulnerable shimmer):** Steps through a *Tel'aran'rhiod* silver mirror to the opposite side of Zone 4 (`x = 4080` ↔ `x = 4880`), leaving a `0.70 s` `post_step` punish window. | Dodge between the 3-lane fireball salvo or reflect a side bolt with a **Linked Braided Fireball (`F`)**; punish her `0.70 s` `post_step` recovery with a 3-hit Twin-Weave combo. |
| **Phase 2: "Queen of Medieval Times?!" (Jealous Fury)** | `65% → 30%` (`299 .. 138 HP`) | Unhinged Forsaken fury; silver silk crackles with crimson-black True Power sparks (`speed: 168`, `poise: 9`). Speaks `lanfear_mid_01`: *"She got a carnation from a knight on a horse?! I ruled the Age of Legends!"* | **1. `jealous_meteor_storm` (`0.60 s` tell → `1.80 s` barrage):** Lanfear rises to `z = 70` and rains 6 diagonal silver-crimson fireballs across the arena floor (orange-silver target rings show impact spots `0.55 s` ahead; `14 dmg` each).<br>**2. `crown_snatch_dash` (`0.45 s` tell → `0.40 s` dash):** High-speed claw-and-*saidar* lunge aimed at Twinkle Toes' crown (`16 dmg`, `down: true`). If dodged (`|riley.y - lanfear.y| > 28` or `riley.z > 32`), Lanfear skids into a **`1.05 s` `jealous_tantrum` vulnerability window**!<br>**3. `dual_fireball_spiral`:** Fires pairs of crossing fireballs down the lane every `1.8 s`, turning the arena into a true One Power fireball shootout. | Bait `crown_snatch_dash` by sidestepping Lanes, then punish `jealous_tantrum` with linked melee + braided fireballs (`F`). Linked fireballs cancel out Lanfear's spiral fireballs on collision in a shower of gold-and-silver sparks! |
| **Phase 3: The One Power Fireball Duel at the Redstone Doorway** | `30% → 0%` (`137 .. 0 HP`) | **Climax Duel Mode (`duel_prep` → `duel_clash`):** The twisted redstone doorway (`s8doorway`) at `x = 5040` blazes open with an eerie violet-green portal into the tower of the snake people (*Aelfinn/Eelfinn*). | **1. Rapid Fireball Shootout (`137 → 45 HP`):** Lanfear retreats toward the doorway (`x = 4860..4940`) and unleashes rapid 4-wave fireball barrages (`fireball_frenzy`) while Riley & Twinkle Toes counter-fire.<br>**2. The Final Clash (`hp <= 45` or `duelTimer` trigger — `duel_clash`):** Lanfear plants at `x = 4920, y = 458`, screams **`"I am the queen of love and beauty!"`** (`lanfear_queen_01`), and launches a gigantic **Forsaken Mega-Fireball** that collides mid-arena with Riley & Twinkle Toes' **Braided One Power Mega-Fireball**! | **Interactive Fireball Clash (see §7.3 below):** Mash or rhythm-press `F` / `J` (or call-in `C` / super `G`) to pump braided *saidin*+*saidar* surges into the colliding fireball sphere and drive it straight into Lanfear, knocking her backward through the **twisted redstone doorway**! |

---

### 7.3 Deep Dive: The Phase 3 One Power Fireball Duel (`duel_clash`)

When Lanfear drops to `hp <= 45` (or after `18 s` in Phase 3):

1. **Setup (`duel_prep`, `0.8 s`):**
   - Lanfear vaults to `x = 4920, y = 458` directly in front of the glowing **Twisted Redstone Doorway** (`x = 5040, y = 455`).
   - Linked Riley + Twinkle Toes slide to `x = 4360, y = 458`, facing right (`facing = 1`).
   - Lanfear screams **`"I am the queen of love and beauty!"`** (`say('lanfear_queen_01')`).
2. **The Clash Sphere (`duel_clash`):**
   - A massive colliding sphere of **golden-black *saidin* + silvery-white *saidar*** (left side) vs **crimson-violet Forsaken fire** (right side) forms at `clashX = lerp(4360, 4920, duelProgress)`, starting at `duelProgress = 0.42`.
   - A dedicated HUD overlay meter (`STAGE8_HUD` in `src/stage8-hud.js`, rendered above the arena without modifying `src/hud.js`) shows:
     **`ONE POWER FIREBALL DUEL — PRESS [F] OR [J] TO PUSH LANFEAR INTO THE DOORWAY!`**
   - **Push Physics:**
     - Lanfear pushes back continuously at `-0.11 / s`.
     - Every press of **`F` (Fireball)**, **`J` (Attack)**, or **`G` (Super)** by the player sends a visible braided golden-silver fireball surge from Riley & Twinkle Toes into the clash core, advancing `duelProgress` by **`+0.15`** (`+0.30` for `G` or `C`) and triggering screen shake + twin-harmonic chime SFX!
     - Even if a young player or accessibility user presses slowly (or if `duelElapsed > 7.5 s`), Twinkle Toes shouts encouragement and surges *saidar* (`+0.22 / s` auto-assist after `4.5 s`), guaranteeing the player never soft-locks and always gets the triumphant push!
3. **Victory Impact (`duelProgress >= 1.0`):**
   - `lanfear.hp = 0`; `lanfear.state = 'duel_banished'`.
   - The colliding mega-fireball explodes across the right half of Zone 4, hurling Lanfear backward (`vx = +520`, `vz = 220`) straight through the open **Twisted Redstone Doorway** (`x = 5040`) and immediately launching the **Stage 8 Finale Sequence** (§8)!

---

## 8. The Finale Sequence (`src/stage8-finale.js` / `src/call8-cutscene.js`)

Jason's brief specifies the exact finale beats and dialogue:
> *"At the end she screams 'I am the queen of love and beauty!' right as the linked Riley + Twinkle Toes throw a huge fireball that pushes her through a redstone doorway/portal like the one she went through with Moiraine, and she screams 'Not again! Not the snake people! Ahhhhhhh!' Then Twinkle Toes does a sassy walk dance and says 'Bubby you saved me! But what took you so long?' And Riley says 'Too many snack breaks.'"*

### 8.1 Step-by-Step Finale Choreography (`runStage8Finale(scene)`)

| Beat | Elapsed `t` | In-Engine & Video Action | Audio / Voice ID & Exact Line |
|---|---:|---|---|
| **1. Queen Scream & Final Surge** | `0.0 .. 2.2 s` | Lanfear is locked in `duel_clash` in front of `s8doorway` (`x = 5040`). As the clash meter hits `100%`, Riley and Twinkle Toes (`s8linked` frames 14–15) thrust both hands forward; their braided gold-and-silver fireball doubles in radius (`r = 140 px`) and engulfs Lanfear's dark sphere. | `lanfear_queen_01`: **`"I am the queen of love and beauty!"`** → `sfx.boom()` + twin *saidin*/*saidar* chord. |
| **2. Blasted Through the Redstone Doorway** | `2.2 .. 5.8 s` | The braided mega-fireball slams Lanfear off her feet (`s8lanfear` frame 26–27) and sends her tumbling backward through the glowing interior of the **twisted redstone doorway** (`s8doorway` frame 2, showing the sinuous silhouettes of the Aelfinn/snake people inside the alien tower). As she crosses the threshold (`x = 5040`), the doorway flashes blinding violet-white and warps shut into smoking glass (`s8doorway` frame 3). | `lanfear_doorway_01`: **`"Not again! Not the snake people! Ahhhhhhh!"`** (voice Doppler-fades with a portal-warp reverb tail as the doorway seals). |
| **3. Optional Finale Video Hook** | `5.8 s` | Calls `await playSceneVideo(scene, 'assets/cutscenes/stage8_finale.mp4')` if present (showing the cinematic rendition of the fireball push, doorway banishment, and sassy walk dance; skippable). | Video audio track (with full in-engine voice/animation sequence if skipped or after clip). |
| **4. Twinkle Toes' Sassy Walk Dance** | `5.8 .. 9.6 s` | Twinkle Toes steps center-stage (`x = 4560, y = 462`), straightens her sparkly Medieval Times Queen of Love and Beauty crown, and performs her signature **8-frame Sassy Walk Dance** (`s8linked` frames 20–27 looped at `8 fps`: confident runway strut, hip-sway, spin with floating silver *saidar* sparkles, and hands-on-hips pose) while looking over at Riley. | `twinkle_saved_01`: **`"Bubby you saved me! But what took you so long?"`** |
| **5. Riley's Deadpan Reply** | `9.6 .. 12.2 s` | Riley grins, rubs the back of his neck while tossing an empty Twix wrapper (`s8linked` frame 19), and answers. Perrin, Loial, Rand, Moiraine, and Lan appear along the ridge crest cheering. | `riley_snacks_01`: **`"Too many snack breaks."`** |
| **6. Campaign Finale Banner & Credits** | `12.2 s+` | Music crossfades to victory fanfare / `music-title.mp3`; displays **`STAGE 8 CLEAR — THE WHEEL WEAVES`** overlay with final score, KOs, and a "Play Again (`?stage=1`)" return option. | `st8_clear_01` (Narrator closing line). |

---

## 9. Art Asset List & GPU Memory Budget ("Best Artwork Yet")

### 9.1 Texture Budget Table (`STAGE8_TEXTURES` in `src/stage8-def.js`)

Every Stage 8 asset is sized so that **total resident decoded RGBA (`width × height × 4`) stays well below the 105.0 MiB source gate and 120.0 MiB GL gate** in `tools/audit-stage1.mjs` while delivering crisp, high-detail painted art ("our best artwork yet"):

| Key | File Path (`assets/stage8/...` or reused) | Dimensions | Grid / Frames | Decoded RGBA | Max PNG File Size | Purpose |
|---|---|---:|---:|---:|---:|---|
| **Core / Reused Atlases** | | | | | | |
| `riley` (compact) | `assets/riley-compact.png` (via `COMPACT_STAGES`) | `4096 × 4096` | atlas | `29.40 MiB` | existing | Riley base combat sheet (Zones 1–2; hidden/synced when `s8linked` active in Zones 3–4). Note: **`grunt`, `spear`, `hound` are NOT loaded on Stage 8 (`-35.46 MiB` saved!)**. |
| `fx` + `pickups` + `portrait_*` | existing shared textures | various | existing | `10.17 MiB` | existing | Shared VFX, pickup icons, HUD portraits (`39.57 MiB` total `STAGE8_CHARS` + shared base). |
| `s6call` | `assets/stage6/callandor.png` (reused) | `1536 × 1024` | `3 × 2` (`6f`, `512×512`) | `6.00 MiB` | existing (`510 KB`) | **Callandor** crystal sword pedestals, swings, and mid-stage Black Ajah circle-shatter arc. |
| `s7dancer` | `assets/stage7/shaido_dancer.png` (reused) | `2048 × 1536` | `5 × 4` (`20f`, `409×384`) | `12.00 MiB` | existing (`2.0 MB`) | **Shaido Spear-Dancer** rank-and-file enemy. |
| `s7veiled` | `assets/stage7/shaido_veiled.png` (reused) | `2048 × 1536` | `5 × 4` (`20f`, `409×384`) | `12.00 MiB` | existing (`2.2 MB`) | **Shaido Veiled Ambush** buckler & jar enemy. |
| `s7moilan` | `assets/stage7/moiraine_lan.png` (reused) | `1536 × 448` | `6 × 2` (`12f`, `256×224`) | `2.62 MiB` | existing (`524 KB`) | Moiraine & Lan `C`-key Call-In assist. |
| **Stage 8 Streaming Backgrounds (`STREAMS[8]`)** | | | | | | |
| `bg8far` | `assets/stage8/bg_far_sky.png` | `1280 × 720` | `1` | `3.52 MiB` | `≤ 650 KB` | Blood-orange smoke sky, Cairhienin hills, and distant Asha'man lightning over Dumai's Wells. |
| `bg8mid` | `assets/stage8/bg_z1_mid.png` | `1280 × 720` | `1` | `3.52 MiB` | `≤ 800 KB` | Zone 1 mid: Outer Shaido encirclement, brushfires, war banners, Two Rivers ridge. |
| `bg8floor` | `assets/stage8/bg_z1_floor.png` | `1280 × 640` | `1` | `3.13 MiB` | `≤ 700 KB` | Zone 1 floor: Churned red-brown earth, broken spears, wheel ruts. |
| `bg8mid2` | `assets/stage8/bg_z2_mid.png` | `1280 × 720` | `1` | `3.52 MiB` | `≤ 850 KB` | Zone 2 mid: Overturned supply wagon ring, splintering chest site, Black Ajah pentagram altar. |
| `bg8floor1` | `assets/stage8/bg_z2_floor.png` | `1280 × 640` | `1` | `3.13 MiB` | `≤ 700 KB` | Zone 2 floor: Scorched wagon debris & carved *saidar* circle runes. |
| `bg8mid3` | `assets/stage8/bg_z3_mid.png` | `1280 × 720` | `1` | `3.52 MiB` | `≤ 850 KB` | Zone 3 mid: The Meatgrinder blast trench, black Asha'man gateways, Aiel & Ogier flank line. |
| `bg8floor2` | `assets/stage8/bg_z3_floor.png` | `1280 × 640` | `1` | `3.13 MiB` | `≤ 700 KB` | Zone 3 floor: Cratered ash trench & glowing fault seams. |
| `bg8mid4` | `assets/stage8/bg_z4_mid.png` | `1280 × 720` | `1` | `3.52 MiB` | `≤ 850 KB` | Zone 4 mid: Shimmering Dome of Air wall on the left, ancient ridge plateau & redstone ruins. |
| `bg8floor3` | `assets/stage8/bg_z4_floor.png` | `1280 × 640` | `1` | `3.13 MiB` | `≤ 700 KB` | Zone 4 floor: Cracked limestone ridge leading to the Twisted Redstone Doorway. |
| **Stage 8 New Character, Ally, Prop & Boss Sheets** | | | | | | |
| `s8algai` | `assets/stage8/shaido_algai.png` | `1536 × 1024` | `5 × 4` (`20f`, `307×256`) | `6.00 MiB` | `≤ 1.3 MB` | **Shaido Algai'd'siswai Heavy** (replaces Trolloc grunt; bull-hide buckler, heavy war-spear, horn-charge). |
| `s8wiseone` | `assets/stage8/shaido_wiseone.png` | `1536 × 1024` | `5 × 4` (`20f`, `307×256`) | `6.00 MiB` | `≤ 1.3 MB` | **Shaido Wise One Channeler** (dark shawl, ivory/amber necklaces, *saidar* fire-dart & earth-snare weaves). |
| `s8sister` | `assets/stage8/black_ajah.png` | `1536 × 1024` | `5 × 4` (`20f`, `307×256`) | `6.00 MiB` | `≤ 1.3 MB` | **Black Ajah Sister** (black-and-violet cowled silk, circle shield-tether pose, dark *saidar* lash). |
| `s8randbox` | `assets/stage8/rand_box.png` | `1024 × 512` | `4 × 1` (`4f`, `256×512`) | `2.00 MiB` | `≤ 450 KB` | **Rand in the Box** (0: iron-bound chest with 6 glowing red shield knots; 1: Rand & ghostly Lews Therin unknotting weaves; 2: 3 knots snapped, golden *saidin* cracks; 3: chest exploding outward with Dragon aura). |
| `s8allies` | `assets/stage8/allies_wells.png` | `1536 × 1024` | `4 × 3` (`12f`, `384×341`) | `6.00 MiB` | `≤ 1.3 MB` | **Allied Fighters Sheet:** Row 0 (`0..3`): **Perrin** (axe swing, wolf leap, Two Rivers bowman); Row 1 (`4..7`): **Rand** (unboxed channeling blast) & **Taim / Asha'man** (`"Asha'man, kill!"` command & black-coat fire weave); Row 2 (`8..11`): **Loial** (tree-axe sweep), **Maiden of the Spear**, & **Wise One** heal weave. |
| `s8linked` | `assets/stage8/riley_twinkle_linked.png` | `2048 × 1536` | `7 × 4` (`28f`, `292×384`) | `12.00 MiB` | `≤ 2.2 MB` | **Combined Linked Riley + Twinkle Toes Sheet:**<br>• `0..3`: Linked idle & walk (Riley + crowned Twinkle Toes side-by-side inside braided gold/silver aura)<br>• `4..9`: Linked combo1, combo2, twin-weave combo3, jump, airkick<br>• `10..15`: Linked fireball cast, double-helix super, **Phase 3 Fireball Duel two-handed push (`14..15`)**<br>• `16..19`: Hurt, knockdown, captive Twinkle Toes (`18`), Riley snack-wrapper shrug (`19`)<br>• `20..27`: **Twinkle Toes 8-frame Sassy Walk Dance** (hip strut, crown touch, hair flip, spin, finger snap). |
| `s8lanfear` | `assets/stage8/lanfear.png` | `2048 × 1536` | `7 × 4` (`28f`, `292×384`) | `12.00 MiB` | `≤ 2.2 MB` | **Lanfear Final Boss Sheet:** Flowing white-and-silver moon silk, crescent hair ornaments, silver-crimson *saidar* / True Power weaves, jealous tantrum, Phase 3 mega-fireball duel stance (`22..25`), blasted backward into doorway (`26..27`). |
| `s8doorway` | `assets/stage8/redstone_doorway.png` | `1024 × 512` | `4 × 1` (`4f`, `256×512`) | `2.00 MiB` | `≤ 480 KB` | **Twisted Redstone Doorway:** (0: carved red stone frame; 1: runes igniting; 2: open violet-green portal showing serpentine Aelfinn tower silhouettes; 3: warped, smoking glass aftermath). |

### 9.2 Zone-by-Zone GPU Resident RGBA Proof (`checkGpuBudget` in `tools/audit-stage1.mjs`)

Following the lazy-load + zone-eviction model of `src/stage7-load.js` (where `s8lanfear` and `s8doorway` load on Zone 4 entry while rank-and-file wave sheets `s7dancer`, `s7veiled`, `s8algai`, `s8wiseone`, `s8sister`, `s8randbox` evict when the boss locks at Zone 4):

| Budget Component | Zones 1–2 (Unlinked) | Zone 3 (Linked Combat) | Zone 4 (Lanfear Boss + Duel) |
|---|---:|---:|---:|
| Base `STAGE8_CHARS` (`riley` compact + shared FX/HUD) | `39.57 MiB` | `39.57 MiB` | `39.57 MiB` |
| Active Zone BG (`bg8far` + 1 `bg8mid*` + 1 `bg8floor*`) | `10.17 MiB` | `10.17 MiB` | `10.17 MiB` |
| Reused Callandor + Moiraine/Lan (`s6call` + `s7moilan`) | `8.62 MiB` | `8.62 MiB` | `8.62 MiB` |
| Shaido & Black Ajah Sheets (`s7dancer` 12 + `s7veiled` 12 + `s8algai` 6 + `s8wiseone` 6 + `s8sister` 6) | `42.00 MiB` (only active zone subset loaded: max `36.00 MiB` in Z1, `42.00 MiB` in Z2/Z3) | `36.00 MiB` (`s8randbox` evicted after Z2) | `0.00 MiB` (evicted on Zone 4 boss lock, just like Stage 6/7) |
| Allies & Props (`s8allies` 6.0 + `s8randbox` 2.0 in Z1–2) | `8.00 MiB` | `6.00 MiB` | `6.00 MiB` (`s8allies` kept for Taim & finale cheers) |
| Linked Riley + Twinkle Toes (`s8linked`) | `0.00 MiB` (loaded at Z2 circle break) | `12.00 MiB` | `12.00 MiB` |
| Lanfear + Redstone Doorway (`s8lanfear` 12.0 + `s8doorway` 2.0) | `0.00 MiB` | `0.00 MiB` | `14.00 MiB` |
| **Total Resident Source RGBA** | **`102.36 MiB`** (Z1–Z2) | **`100.36 MiB`** (Z3 — `s7veiled` or `s8wiseone` swapped) | **`90.36 MiB`** (Z4 Boss Peak!) |
| **Audit Gate (`MAX_GPU_SOURCE_MIB = 105.0 MiB`)** | **PASS (`< 105.0 MiB`)** | **PASS (`< 105.0 MiB`)** | **PASS (`< 105.0 MiB`)** |

> [!TIP]
> Notice how Zone 4 (Boss + Linked Riley/Twinkle Toes + Redstone Doorway + Allies + Callandor + Moiraine/Lan) sits at **`90.36 MiB`** — nearly **15 MiB under the 105 MiB gate**, and Zones 1–3 sit at `100.36–102.36 MiB` (or **`94.36 MiB`** if `s8sister` loads at Zone 2 while `s7veiled` streams out in Zone 3).

### 9.3 "Best Artwork Yet" Quality & Processing Checklist (`tools/stage8/process_art.py`)

Jason emphasized: *"Make sure we have our best artwork yet, including Rand in the box, combined Riley+Twinkle Toes, Lanfear, etc."*  
Every generated sprite sheet and background plate must pass `tools/stage8/process_art.py` (modeled on `tools/stage7/process_art.py`):

1. **Zero Halos / Crisp Alpha Mattes:** Flood-fill + HSV chroma spill suppression + 1 px premultiplied edge feathering so dark-haired Lanfear, black-coated Taim, and glowing golden/silver weaves have zero white/magenta/checkerboard fringe against dark smoke backgrounds.
2. **Baseline & Centroid Lock Across All 28 Frames:** Each frame cell in `s8linked` and `s8lanfear` is foot-aligned to `anchorY = 0.96` (`baseline = cellH - 12 px`) so neither character jitter-hops between `idle`, `walk`, `combo`, `duel_clash`, or `sassy_walk`.
3. **Distinct Silhouette & Color Readability:**
   - **Rand in the Box (`s8randbox`):** High-contrast warm splintering oak and wrought-iron straps contrasted against six razor-sharp crimson *saidar* knots and blinding white-gold *saidin* rays.
   - **Combined Riley + Twinkle Toes (`s8linked`):** Riley in his signature heroic tunic/belt in the foreground-left of the cell; Twinkle Toes right beside him wearing her **sparkly gold Medieval Times Queen of Love and Beauty paper crown** and flowing dress, surrounded by an intertwined **golden-black (*saidin*) + silvery-white (*saidar*) double-helix ribbon**. Frames `20..27` give Twinkle Toes an unmistakable, joyful, high-attitude **8-frame sassy walk dance**.
   - **Lanfear (`s8lanfear`):** Towering, ethereal Forsaken beauty in layered white-and-silver silk with crescent moon silver jewelry, contrasting starkly against Dumai's Wells' dark ochre/blood-orange battlefield and crimson-violet True Power fireballs.

---

## 10. Voice Lines (`st8_*` / `riley_st8_*`) & Audio Pipeline

### 10.1 Voice Cast & Synthesis Engine

Following `assets/audio/VOICE_PROVENANCE.md` and `tools/stage7/voice-render.json`:

| Speaker | Engine & Voice ID | Settings / Processing |
|---|---|---|
| **Riley** | ElevenLabs `eleven_v4` — **DYLO - Dark Anime Hero** (`JjsQrIrIBD6TZ656NQfi`) | Mono 24 kHz 64 kbps MP3, `-17.5 LUFS`, `tools/riley_voice.py` pipeline. |
| **Twinkle Toes** | Kokoro-82M `75% af_bella + 25% af_heart` (`speed: 1.08, pitch: 1.14`) **or** ElevenLabs `eleven_v4` bright sassy young heroine voice | Bright, expressive, sassy delivery; `-16.5 LUFS`, mono 24 kHz 64 kbps MP3. |
| **Lanfear** | ElevenLabs `eleven_v4` Voice Design — **"Lanfear (RWB)"** (regal, velvety, dramatic soprano-alto that snaps into jealous fury) | Mono 24 kHz 64 kbps MP3, `-16.5 LUFS`. |
| **Rand al'Thor** | ElevenLabs `eleven_v4` — **"Rand al'Thor (RWB)"** (established Stage 6 voice) | Strained/intense inside the box, then resonant and commanding on break-out. |
| **Lews Therin Telamon** | ElevenLabs `eleven_v4` — **"Lews Therin (RWB)"** (older, aristocratic, slightly mad baritone with subtle inner-mind stereo/whisper resonance) | Layered with a soft 12% early-reflection room tail so he sounds like a voice inside Rand's head. |
| **Mazrim Taim** | ElevenLabs `eleven_v4` — **"Mazrim Taim (RWB)"** (cold, resonant, commanding martial baritone) | Peak-limited at `-1.5 dBFS` so **`"Asha'man, kill!"`** cuts cleanly through battle SFX every 60 seconds. |
| **Perrin / Loial / Black Ajah** | Perrin: warm deep baritone; Loial: established `bm_george` (`speed: 0.90, pitch: 0.86`); Black Ajah: cold sneering alto | Mono 24 kHz 64 kbps MP3. |
| **Narrator** | **Jason F CosyVoice 3 clone** (consented owner voice, established in Stages 1–6) with Kokoro `bm_fable` fallback until rendered | `-18.0 LUFS`, mono 24 kHz 64–96 kbps MP3. |

### 10.2 Complete Stage 8 Voice Script Table (`28` Lines, Total `≤ 1.35 MB`)

All exact lines requested by Jason are marked with **[EXACT BRIEF LINE]**:

| # | Voice ID | Speaker | Exact Displayed Caption | TTS Prompt / Pronunciation Hint | Trigger |
|---:|---|---|---|---|---|
| **Opening Story (`STORY8`)** | | | | | |
| 1 | `st8_story_01` | `NARRATOR` | `"Dumai's Wells. Beneath a sky choked with dust and ash, a hundred thousand Shaido ring the wagons where Rand al'Thor lies locked inside an iron-bound chest."` | `Doo-MYZ Wells... SHY-doe... Rand al-THOR` | `STORY8` card 1 |
| 2 | `st8_story_02` | `RAND AL'THOR` | `"Dark. No air. Six sisters holding the shield... Lews Therin, are you there? They knotted three of the weaves when the fighting started outside."` | `[strained, hushed] ... Looz THAIR-in ...` | `STORY8` card 2 (Rand in the box) |
| 3 | `st8_story_03` | `LEWS THERIN` | `"I am here, kinslayer... Reach through the knots! Soft when they are tied — slide between the threads and CRUSH THEM!"` | `[whispering, intense, mad urgency]` | `STORY8` card 3 (Lews Therin in Rand's head) |
| 4 | `st8_story_04` | `RAND AL'THOR` | `"Three untied... the other three are softening! Hold on — I can feel the True Source! I can feel saidin!"` | `[rising intensity] ... sah-EEN!` | `STORY8` card 4 (breaking the shield) |
| 5 | `st8_story_05` | `PERRIN AYBARA` | `"The wolves are here! Loial, Two Rivers, Maidens — form the wedge! Break through to the wagons!"` | `[shouting, heroic] ... Loy-al ...` | `STORY8` card 5 |
| 6 | `st8_story_06` | `MAZRIM TAIM` | `"Black Tower, form the line! Asha'man, kill!"` | `[commanding roar] ... AH-shah-mahn, KILL!` | `STORY8` card 6 |
| 7 | `st8_box_break_01` | `RAND AL'THOR` | `"No more boxes! STILL THEM!"` | `[furious shout] No more boxes! STILL THEM!` | `STORY8` card 7 (chest explodes) |
| 8 | `st8_story_08` | `RILEY` | `"Rand's out, Taim's blowing up the hill, and the Black Ajah have Twinkle Toes behind the wagons. Keep your heads down — I'm going in!"` | `[determined] Rand's out, Tah-EEM's blowing up the hill, and the Black AH-jah...` | `STORY8` card 8 |
| **In-Stage Combat, Allies & Every-60s Taim Hazard** | | | | | |
| 9 | `st8_taim_kill_01` | `MAZRIM TAIM` | `"Asha'man, kill!"` **[EXACT BRIEF LINE]** | `[thunderous military command] AH-shah-mahn, KILL!` | **Every 60 seconds** (`Stage8Arena` rolling earth & fire hazard warning) |
| 10 | `riley_st8_taim_01` | `RILEY` | `"Whoa! Watch the fire lanes — Taim isn't aiming!"` | `[shouting] Whoa! Watch the fire lanes — Tah-EEM isn't aiming!` | First 60s Taim barrage dodge |
| 11 | `st8_perrin_01` | `PERRIN AYBARA` | `"Two Rivers, loose! Wolves, run them down!"` | `[shouting] Two Rivers, loose! Wolves, run them down!` | Zone 1 Perrin + bowmen assist |
| 12 | `st8_rand_assist_01` | `RAND AL'THOR` | `"I've got the Shaido channelers! Riley — get to Twinkle Toes behind the wagons!"` | `[shouting] I've got the SHY-doe channelers!...` | Zone 2 Rand chest shockwave assist |
| 13 | `st8_loial_01` | `LOIAL` | `"For the Dragon and the Maidens! Clear the trench!"` | `[booming, heroic] For the Dragon and the Maidens! Clear the trench!` | Zone 3 Loial + Maidens + Wise Ones sweep |
| **Mid-Stage Black Ajah Circle & Callandor Cutscene (`CALL8_SCRIPT`)** | | | | | |
| 14 | `st8_circle_01` | `BLACK AJAH SISTER` | `"Link the circle, sisters! Double the web! The Great Lord claims this little Queen — no man can pierce a linked shield of saidar!"` | `[sneering, cold] ... sah-ih-DAR!` | `CALL8_SCRIPT` step 1 |
| 15 | `st8_circle_02` | `TWINKLE TOES` | `"Let go of my dress, you creepy witches! When Bubby gets through those wagons you're all grounded!"` | `[fierce, sassy] Let go of my dress, you creepy witches!...` | `CALL8_SCRIPT` step 2 |
| 16 | `st8_circle_03` | `RILEY` | `"A linked circle? Good thing I brought a crystal sword. Callandor — NOW!"` | `[confident shout] ... KAL-an-door — NOW!` | `CALL8_SCRIPT` step 3 |
| 17 | `st8_circle_04` | `NARRATOR` | `"The Sword That Is Not a Sword blazes like a second sun, cleaving the Black Ajah's web in a single blinding arc!"` | `... Black AH-jah's web ...` | `CALL8_SCRIPT` step 4 |
| 18 | `st8_circle_05` | `TWINKLE TOES` | `"I can feel the light! Here, Bubby — take my hand! Let's link our powers together!"` | `[excited, joyful] I can feel the light! Here, Bubby...` | `CALL8_SCRIPT` step 5 (Twinkle Toes channels & links) |
| 19 | `st8_circle_06` | `RILEY` | `"Saidin and saidar linked together... Whoa. Hang on, Twinkle Toes — somebody very jealous just stepped out of the smoke."` | `[amazed, then serious] sah-EEN and sah-ih-DAR linked together...` | `CALL8_SCRIPT` step 6 |
| **Lanfear Boss Intro, Phases & Finale (`LANFEAR_INTRO` & `FINALE8_SCRIPT`)** | | | | | |
| 20 | `lanfear_intro_01` | `LANFEAR` | `"Stop right there! You dared let the Green Knight place the Crown of Love and Beauty on HER head?! At MEDIEVAL TIMES?!"` | `[regal outrage, incredulous] ... At MEDIEVAL TIMES?!` | Zone 4 boss intro 1 |
| 21 | `lanfear_intro_02` | `TWINKLE TOES` | `"Excuse me, lady! The Red-and-Yellow Knight threw the carnation to ME fair and square! And I got to wave at the whole arena!"` | `[sassy, proud] Excuse me, lady!...` | Zone 4 boss intro 2 |
| 22 | `lanfear_intro_03` | `LANFEAR` | `"A cardboard crown and a dry chicken leg?! Over ME — Daughter of the Night?! I will rip that crown from your curls and turn you both to ash!"` | `[furious, theatrical] A cardboard crown and a dry chicken leg?!...` | Zone 4 boss intro 3 |
| 23 | `lanfear_intro_04` | `RILEY` | `"Nobody messes with the Queen of Medieval Times. Ready, Twinkle Toes? Light her up!"` | `[cocky, determined] Nobody messes with the Queen of Medieval Times...` | Zone 4 boss intro 4 |
| 24 | `lanfear_mid_01` | `LANFEAR` | `"She got a carnation from a knight on a horse?! I ruled the Age of Legends! Burn in silver fire!"` | `[unhinged jealousy] She got a carnation from a knight on a horse?!...` | Lanfear Phase 2 transition (`65% HP`) |
| 25 | `lanfear_queen_01` | `LANFEAR` | `"I am the queen of love and beauty!"` **[EXACT BRIEF LINE]** | `[screaming at full volume, desperate fury] I am the queen of love and beauty!` | **Phase 3 Fireball Duel climax / Finale step 1** |
| 26 | `lanfear_doorway_01` | `LANFEAR` | `"Not again! Not the snake people! Ahhhhhhh!"` **[EXACT BRIEF LINE]** | `[terrified shriek fading into portal] Not again! Not the snake people! Ahhhhhhh!` | **Blasted through the Redstone Doorway (Finale step 3)** |
| 27 | `twinkle_saved_01` | `TWINKLE TOES` | `"Bubby you saved me! But what took you so long?"` **[EXACT BRIEF LINE]** | `[joyful, sassy teasing] Bubby you saved me! But what took you so long?` | **Twinkle Toes Sassy Walk Dance (Finale step 4)** |
| 28 | `riley_snacks_01` | `RILEY` | `"Too many snack breaks."` **[EXACT BRIEF LINE]** | `[casual, deadpan grin] Too many snack breaks.` | **Riley's finale reply (Finale step 5)** |
| 29 | `st8_clear_01` | `NARRATOR` | `"The Shaido scatter to the four winds, the Forsaken falls beyond the redstone door, and the Dragon's brother brings the true Queen of Love and Beauty safely home."` | `[warm, epic conclusion]` | Finale victory banner |

---

## 11. Suno Music Brief — Nordic Vocals ("Asha'man, Kill!")

### 11.1 Repo Provenance Finding & Ingestion Pipeline

> [!NOTE]
> **Provenance check (`assets/audio/AUDIO_PROVENANCE.md`):**  
> `assets/audio/music-main.mp3` is documented as Jason's Suno track from *Riley Wheel Brawl 1.1*, while Stages 2–7 use FluidSynth/FluidR3_GM loops and Stage 6's `music-stage6.mp3` uses an ElevenLabs Music take. **No "Asha'man Kill" audio file is currently checked into the repo.**  
> Therefore, this plan provides:
> 1. **If Jason already has his original "Asha'man Kill" Suno song file:** Drop it at `/workspace/rwb-audio/ashaman-kill-source.mp3` (or upload it as the Suno reference track / Persona) and run `python3 tools/stage8/loop_music.py` to normalize to `-16.0 LUFS` (`112 kbps` MP3, `≤ 1.3 MB`) and compute sample-accurate `[loopStart, loopEnd)` points for `MUSIC.stage8`.
> 2. **Ready-to-paste Suno v4 / v4.5 Prompts (with " Extend / Cover / Persona" instructions):** Designed specifically to generate the new **Nordic-vocal Dumai's Wells stage theme** (`music-stage8.mp3`) and **Lanfear Fireball Duel boss theme** (`music-boss8.mp3`) based on Jason's "Asha'man Kill" concept.

### 11.2 Track 1 — `assets/audio/music-stage8.mp3` ("Dumai's Wells — Asha'man, Kill!")

- **Target Specs:** `136 BPM`, Key of **D Minor / D Phrygian**, `4/4` war-march meter, loop window `~64–76 s` (`36–42 bars`), loudness `-16.0 LUFS`, true peak `≤ -1.5 dBFS`, encoded at `112 kbps` stereo MP3 (`≤ 1.2 MB`).
- **Suno Workflow (Using Jason's Prior "Asha'man Kill" Track as Base):**
  1. In Suno, open Jason's original *"Asha'man Kill"* track and select **Cover** (or **Use as Persona / Upload Audio Reference**, setting Audio Weight `0.65`, Style Weight `0.85`).
  2. Paste the **Style of Music** prompt and **Lyrics / Vocal Arrangement** below:

**Suno Style Prompt (`≤ 200` chars):**
```text
Epic Nordic folk-metal war march, 136 BPM, D phrygian, deep Norse throat-chant choir, fierce Viking shieldmaiden & skald vocals, tagelharpa, nyckelharpa, mammoth war drums, bronze horns, cinematic battle
```

**Suno Structure & Vocal Script:**
```text
[Intro - Low Tagelharpa Drone, Distant War Horns & Thunderous Frame Drums (4 bars)]
(Haa—! Huu—! Eldr ok Jörð! Fire and Earth!)

[Verse 1 - Deep Nordic Male Baritone Skald & Throat-Chant Pulse]
Iron bands around the oak, six red threads inside the dark,
Through the dust a hundred thousand spears await the spark!
Wolves are howling on the ridge, the ancient voice awakes within—
Unknot the weave, break the chest, let the storm begin!

[Pre-Chorus - Shieldmaiden & Valkyrie Alto Counter-Chant, Building War Drums]
Black coats rising on the hill!
Hear the thunder, bend the will!
(Skjold! Eldr! Stormr!)

[Chorus - Full Nordic War Choir + Commanding Baritone Shout]
ASHA'MAN, KILL! — Roll the earth and split the stone!
ASHA'MAN, KILL! — Burn the ring around the throne!
Gold and silver braid the flame, crystal blade against the night,
Through the cauldron and the ash we march into the light!

[Instrumental Break - Searing Nyckelharpa & Tagelharpa Riff over Double-Time War Drums (8 bars)]
(Haa—! Haa—! Eldr! Blóð! Ash and fire!)

[Bridge - Ethereal Nordic Female Soprano ("Saidar") Intertwining with Low Male Chant ("Saidin")]
Two halves of the turning wheel, linked together hand in hand,
Silver river, golden storm, sweeping through the broken land!

[Final Chorus - Maximum Choir & Brass Crescendo, Clean Loop Tail on D5 Drone]
ASHA'MAN, KILL! — Roll the earth and split the stone!
ASHA'MAN, KILL! — Break the circle, bring her home!

[Outro - 2-Bar Tagelharpa & Frame Drum Ostinato Matching Intro for Seamless Loop]
```

---

### 11.3 Track 2 — `assets/audio/music-boss8.mp3` ("Queen of the Redstone Door — Lanfear's Duel")

- **Target Specs:** `148 BPM`, Key of **E Minor / Harmonic Minor**, driving `4/4` with `12/8` triplet string ostinato, loop window `~52–64 s` (`32–40 bars`), loudness `-15.2 LUFS`, `112 kbps` MP3 (`≤ 1.1 MB`).

**Suno Style Prompt (`≤ 200` chars):**
```text
Dark symphonic Nordic boss battle, 148 BPM, E minor, soaring operatic Norse female soprano vs fierce male war choir, rapid nyckelharpa, pounding taiko & bodhran, brass fanfare, fireball duel intensity
```

**Suno Structure & Vocal Script:**
```text
[Intro - Rapid Nyckelharpa Arpeggio & Silver Bell Chimes Slammed by War Drums]
(Máni! Nótt! Dóttir nætur!)

[Verse 1 - Soaring Regal Operatic Nordic Soprano (Jealous Forsaken Theme)]
Silver moon upon the ridge, crown of beauty, crown of pride,
Who dares wear the paper gold with the Dragon at her side?!
I ruled the hall of legends before the world was torn in two—
Now taste the fire of the night that I unleash on you!

[Chorus - Duel Call-and-Response: Female Soprano vs Unified Male/Female Nordic Choir]
(Soprano:) I AM THE QUEEN OF LOVE AND BEAUTY!
(War Choir:) Braid the light! Push the flame!
(Soprano:) BURN BENEATH THE SILVER MOON!
(War Choir:) Through the redstone door she came!

[Bridge - Intense Fireball Clash Rhythm, Accelerating Frame Drums & Brass Stabs (8 bars)]
(Eld-hnöttur! Push! Push! Gold and silver, strike as one!)
(Back into the twisted stone where the serpent towers run!)

[Outro - High Soprano Shriek Dissolving into Triumphant Nordic Horn Fanfare & Loop Seam]
```

---

## 12. Video Cutscene Prompts (Character-Name-Free, Riley Always From Behind)

### 12.1 Strict Guardrails (Per `docs/GROK-BRIEF-P1.md` & Jason's Brief)

1. **NEVER name any character, actor, book title, or franchise** in any video prompt (no "Riley", "Twinkle Toes", "Rand", "Lews Therin", "Taim", "Asha'man", "Lanfear", "Moiraine", "Callandor", "Shaido", "Aiel", "Black Ajah", "Medieval Times", or "Wheel of Time"). Describe every figure purely by clothing, posture, hair, props, and lighting.
2. **The teenage boy hero is ALWAYS shown from behind** (over-the-shoulder, low-angle dorsal three-quarter back, or wide back-silhouette shot). **His face is NEVER visible in any frame.**
3. **The young girl in the paper crown (`Twinkle Toes`)** is likewise framed from behind / three-quarter dorsal silhouette or glowing back-profile unless Jason explicitly signs off on a front angle (per Decision A3 in `STAGE7-PLAN.md`).
4. **Target technical specs for all three clips:** `1280×720`, `24 fps`, H.264 (`libx264 -crf 23`) + AAC (`128 kbps`), `+faststart`, `≤ 6.0 MB` per MP4 (`≤ 16.0 MB` combined for Stage 8's 3 clips).

---

### 12.2 Clip 1 — `assets/cutscenes/stage8.mp4` (Pre-Stage Opening: The Iron-Bound Chest & The Rolling Fire Wave, `10 s`)

> **Prompt (Google Flow / Grok Imagine / Veo — paste verbatim):**  
> `Stylized 2D/2.5D painterly fantasy animation, 16:9 widescreen, dramatic chiaroscuro lighting, rich brush-textured illustration in the style of a 1990s arcade beat-'em-up epic. Shot 1 (0–3s): Tight interior close-up inside a dark, cramped iron-bound wooden chest; a tall red-haired young man's bruised knuckles strain against the timber lid as six glowing crimson energy knots hover in the darkness around him; a translucent golden ghost-silhouette whispers beside his ear as three of the crimson knots snap into sparks. Shot 2 (3–6s): Wide exterior shot of a dust-choked valley ringed by overturned wooden supply wagons and thousands of veiled desert spear-warriors in tan cloth; the wooden chest at the center explodes outward in a blinding pillar of golden-white light, hurling timber splinters and veiled warriors through the air. Shot 3 (6–8s): On a rocky ridge above the valley, a tall commander in a high-collared black wool coat raises one hand; a row of black-coated channelers unleashes a rolling tsunami of exploding earth clods and towering geysers of orange-red fire that sweeps across the battlefield. Shot 4 (8–10s): Low-angle tracking shot strictly FROM BEHIND a dark-haired teenage boy in a brown tunic and blue trousers with a glowing crystal sword at his hip; only his back, shoulders, and the back of his head are visible (his face is never shown) as his fists ignite with golden fire and he sprints down the smoking hill toward the burning wagon ring.`

---

### 12.3 Clip 2 — `assets/cutscenes/stage8_callandor.mp4` (Mid-Stage Cutscene: The Crystal Sword Breaks the Dark Circle & The Dual-Light Link, `8 s`)

> **Prompt (Google Flow / Grok Imagine / Veo — paste verbatim):**  
> `Stylized 2D/2.5D painterly fantasy animation, 16:9 widescreen, high-contrast magical lighting. Shot 1 (0–2.5s): Behind a barricade of burning wooden wagons, five hooded women in dark violet-black silk robes stand in a pentagram circle, weaving a dome of purple-black lightning chains around a small young girl wearing a sparkly gold paper crown at the center (the girl is seen from a three-quarter back angle facing the hooded women). Shot 2 (2.5–5s): Camera stays strictly BEHIND the dark-haired teenage boy hero in a brown tunic (shot over his right shoulder from behind; his face is never visible) as he leaps forward, raises a blazing transparent crystal longsword overhead with both hands, and brings it down in a sweeping white-crimson arc that shatters the purple-black dome like glass and blasts the five hooded women backward into the smoke. Shot 3 (5–8s): Strictly rear-view medium shot from behind both the dark-haired teenage boy and the small girl in the gold paper crown as they stand side by side facing the smoky battlefield ahead; their inner hands clasp together, and a breathtaking double-helix aura of golden-black fire and silvery-white light spirals up around their backs and shoulders as they drop into a synchronized fighting stance.`

---

### 12.4 Clip 3 — `assets/cutscenes/stage8_finale.mp4` (Finale: The Braided Fireball Duel, the Twisted Red Stone Doorway & Victory Strut, `10 s`)

> **Prompt (Google Flow / Grok Imagine / Veo — paste verbatim):**  
> `Stylized 2D/2.5D painterly fantasy animation, 16:9 widescreen, climactic magical duel lighting. Shot 1 (0–3s): On a scorched limestone ridge in front of a freestanding, strangely twisted red-stone doorframe glowing with a swirling violet-green portal, a tall pale woman in flowing white-and-silver moon silk shrieks in fury and hurls a colossal sphere of crimson-silver fire toward the camera. Shot 2 (3–6s): Over-the-shoulder shot strictly FROM BEHIND the dark-haired teenage boy and the small girl in the gold paper crown standing side by side (only their backs, shoulders, and the back of their heads are visible; their faces are never shown); they thrust their linked hands forward together, launching a massive braided golden-and-silver fireball that slams into the woman's dark sphere, overpowers it, and blasts the white-robed woman backward off her feet straight through the twisted red-stone doorframe into a shadowy tower where serpentine silhouettes loom, before the stone doorway melts into smoking glass. Shot 3 (6–10s): Warm golden sunlight breaks through the smoke over the valley; camera frames the dark-haired teenage boy from behind in the left foreground as he tosses a small candy wrapper over his shoulder, while beside him the small girl in the gold paper crown performs a joyful, sassy runway strut-and-spin victory dance with silvery sparkles trailing from her crown.`

---

## 13. Memory & Audit Budgets (`tools/audit-stage1.mjs`)

### 13.1 Exact Additions to `tools/audit-stage1.mjs`

Following the exact structure of Stages 6 and 7 in [`tools/audit-stage1.mjs:88-100,171`](file:///workspace/rwb-stage8-argon/tools/audit-stage1.mjs#L88-L100):

| Budget Gate | Cap | Expected Stage 8 Usage | Notes |
|---|---:|---:|---|
| **`STAGE8_SRC`** | `192 * 1024` (`196,608 B`) | `~41,500 B` across 14 modules | Tracked separately and inside `preFight`. Keeping `STAGE8_SRC ≤ 42 KB` keeps `preFight` under `25,000,000 B` (`24,948,685 + 41,500 = 24,990,185 B`). |
| **`STAGE8_VOICE`** | `2 * 1024 * 1024` (`2.0 MiB`) | `~1.15 MiB` (`28` MP3 clips @ 64 kbps) | `st8_*`, `riley_st8_*`, `lanfear_*`, `twinkle_saved_01`, `riley_snacks_01` in `assets/audio/stage8-voice-manifest.json`. |
| **`STAGE8_ART`** | `22 * 1024 * 1024` (`22.0 MiB`) | `~14.8 MiB` on disk (`16` PNG files in `assets/stage8/`) | 9 background plates (`~6.8 MB`) + 7 sprite sheets (`~8.0 MB`). |
| **`STAGE8_MUSIC`** | `3 * 1024 * 1024` (`3.0 MiB`) | `~2.1 MiB` (`music-stage8.mp3` + `music-boss8.mp3`) | Streamed / decoded on Stage 8 start; zero impact on Stage 1 pre-fight. |
| **`STAGE8_VIDEO`** | `18 * 1024 * 1024` (`18.0 MiB`) | `~14.5 MiB` (`stage8.mp4` + `stage8_callandor.mp4` + `stage8_finale.mp4`) | Loaded on demand when cutscenes play. |
| **`MAX_GPU_SOURCE_MIB`** | `105.0 MiB` | `102.36 MiB` (Z1–Z3) / `90.36 MiB` (Z4 Boss) | Verified per-zone by `checkGpuBudget()` in `tools/audit-stage1.mjs`. |

### 13.2 Module Breakdown (`STAGE8_SRC ≤ 42,000 B`)

Mirroring Stage 7's clean 14-file decomposition (`src/stage7*.js` + `src/shaido.js` + `src/asmodean.js` = `46,356 B`), Stage 8 reuses `src/shaido.js`, `src/stage7-fighter.js`, `src/stage7-frames.js`, `src/stage7-paint.js`, and `src/stage7-hurt.js` directly so its own files stay even trimmer (`~40 KB` total):

| Module | Est. Size | Responsibility |
|---|---:|---|
| `src/stage8.js` | `1.3 KB` | Public barrel re-exporting `STAGE8`, `STAGE8_CHARS`, `STAGE8_TEXTURES`, `STAGE8_VOICES` and registering `MUSIC.stage8` / `MUSIC.boss8`. |
| `src/stage8-def.js` | `5.8 KB` | `STAGE8` config, `STAGE8_PALETTE`, `STAGE8_WAVES`, `STAGE8_PICKUPS`, `STORY8`, `STORY8_CLIP_LINES`, `STAGE8_TEXTURES`. |
| `src/stage8-shaido.js` | `5.2 KB` | New `ShaidoAlgai` (`algai`), `ShaidoWiseOne` (`wiseone`), and `BlackAjahSister` (`blackajah`) pure combat cores extending `FighterCore`. |
| `src/lanfear.js` | `6.4 KB` | Pure 3-phase `Lanfear` boss core + Phase 3 **One Power Fireball Duel** (`duel_prep`, `duel_clash`, `duelProgress`, `pushDuel`, `duel_banished`). |
| `src/stage8-linked.js` | `3.6 KB` | `activateLinkMode(scene)`, braided *saidin*+*saidar* fireball (`spawnLinkedFireball`), twin-weave combo bonus, and `linkGrace` barrier. |
| `src/stage8-arena.js` | `4.8 KB` | **Every-60s Taim `"Asha'man, kill!"` rolling earth & fire hazard**, Zone 2 Rand chest prop (`s8randbox`), Black Ajah circle dome, and Zone 4 Redstone Doorway (`s8doorway`). |
| `src/stage8-allies.js` | `3.2 KB` | Perrin + Two Rivers bow volley, Rand chest-burst shockwave, Loial + Maidens + Wise Ones sweep, and Stage 8 coalition call-in hook. |
| `src/call8-cutscene.js` | `3.8 KB` | Mid-stage **Black Ajah Circle & Callandor Cutscene** (`startCall8Cutscene`) + **Stage 8 Finale Sequence** (`runStage8Finale` with doorway banishment & sassy walk dance). |
| `src/stage8-actors.js` | `2.6 KB` | Phaser actor wrappers for `algai`, `wiseone`, `blackajah`, `lanfear` exported as `STAGE8_ACTORS`. |
| `src/stage8-lifecycle.js` | `2.4 KB` | `Stage8Kit` wiring arena, linked mode, allies, mid-stage cutscene trigger, and boss intro/finale hooks into `Stage1`. |
| `src/stage8-view.js` | `2.2 KB` | Procedural fallback & sheet painter for `s8linked`, `s8randbox`, `s8doorway`, Taim's rolling fire lanes, and `paintStory8`. |
| `src/stage8-hud.js` | `1.4 KB` | Non-invasive HUD overlays for the Taim 60s warning banner, Link active badge, and Phase 3 Fireball Duel clash meter. |
| `src/stage8-load.js` | `1.2 KB` | Lazy zone loader (`ensureStage8Zone` / `ensureStage8Boss`) that swaps enemy sheets for `s8lanfear` + `s8doorway` at Zone 4. |
| `src/bot-stage8.js` | `1.8 KB` | Autonomous playthrough bot (`stage8Bot`) that dodges Taim's 60s fire lanes, triggers the Callandor link, and wins the Lanfear fireball duel. |
| **Total (`14` files)** | **`~45.7 KB` max (`~39.5 KB` minified/compact)** | Comfortably inside `STAGE8_SRC` (`192 KB`) and `preFight` (`51.3 KB` free). |

---

## 14. Numbered Build Tasks (T1–T15) & Test Plan

Each task is small, self-contained, and verified by both unit tests (`node --test`) and `node tools/audit-stage1.mjs`:

| Task | Title | Files Touched / Created | Acceptance Criteria & Automated Tests |
|---:|---|---|---|
| **T1** | **Stage 8 Config, Zones, Story & Routing (`?s8=1`)** | `src/stage8-def.js`, `src/stage8.js`, `src/stages.js`, `src/stage7-def.js`, `src/zone-stream.js`, `src/texture-pages.js`, `src/music.js` | `MAX_STAGE === 8`; `stageEnabled(8, q)` gated on `?s8=1`; `STAGE8_CHARS = ['riley']` (no Trollocs); `STORY8` has all 8 opening cards (Rand in the box, Lews Therin, Perrin, Taim, Rand breaking the chest, Riley); `STREAMS[8]` streams 4 zones across `WORLD_W = 5200`.<br>**Test:** `tests/stage8-def.test.mjs` |
| **T2** | **Shaido & Black Ajah Enemy Cores (`algai`, `wiseone`, `blackajah` + reused `dancer`, `veiled`)** | `src/stage8-shaido.js`, `src/stage8-actors.js`, `src/stage4-actors.js` | Pure combat state machines for `ShaidoAlgai` (horn charge + armor + triple thrust), `ShaidoWiseOne` (*saidar* fire-dart + earth-snare + weave-break stun), and `BlackAjahSister` (shield tether + dark *saidar* lash). Zero Trollocs in `STAGE8_WAVES`.<br>**Test:** `tests/stage8-shaido.test.mjs` |
| **T3** | **Every-60s Taim `"Asha'man, kill!"` Rolling Earth & Fire Hazard** | `src/stage8-arena.js` | Deterministic `taimTimer` (`18 s` first showcase, `60.0 s` recurring cadence); `2.6 s` warning with `st8_taim_kill_01` voice & safe-lane telegraphs; `4.2 s` 3-sub-wave rolling earth & fire barrage; dodged by safe lane, `z > 36` jump, or Fire Shield; deals `26 dmg` + knockdown to Shaido.<br>**Test:** `tests/stage8-taim-hazard.test.mjs` |
| **T4** | **Allied Fighters at Dumai's Wells (Perrin, Rand Box Burst, Loial/Maidens/Wise Ones, Coalition Call-In)** | `src/stage8-allies.js` | Zone 1 Perrin + Two Rivers bow volley; Zone 2 Rand chest explosion shockwave (`+18%` speed buff aura); Zone 3 Loial + Maidens + Wise Ones sweep (`+18 HP` heal); `C`-key Coalition Call-In.<br>**Test:** `tests/stage8-allies.test.mjs` |
| **T5** | **Black Ajah Circle Encounter & Callandor Cutscene** | `src/call8-cutscene.js`, `src/stage8-lifecycle.js` | Zone 2 Wave 6 (`circleGuard: true`) renders Twinkle Toes inside the pentagonal dark *saidar* dome; clearing Wave 6 triggers `startCall8Cutscene(scene)` where Riley uses Callandor (`s6call`) to shatter the circle and Twinkle Toes links with Riley.<br>**Test:** `tests/stage8-callandor-circle.test.mjs` |
| **T6** | **Linked Riley + Twinkle Toes Gameplay Mechanic (`s8linked`)** | `src/stage8-linked.js`, `src/stage8-view.js` | `activateLinkMode(scene)` sets `riley.linked = true`, switches visual rendering to `s8linked`, upgrades `F` to the **Braided *Saidin*+*Saidar* Fireball** (`22 dmg`, `0.65 s` cool, 1-target pierce), adds `+6 dmg` Twin-Weave combo3 finisher, and enables `linkGrace` barrier.<br>**Test:** `tests/stage8-linked.test.mjs` |
| **T7** | **Lanfear Final Boss & Phase 3 One Power Fireball Duel** | `src/lanfear.js`, `src/stage8-hud.js` | 3-phase `Lanfear` core (`460 HP`): Phase 1 silver-moon salvo & mirror step; Phase 2 Medieval Times jealous meteor storm & crown-snatch dash (`jealous_tantrum` punish window); Phase 3 **One Power Fireball Duel** (`duel_clash`) where linked fireballs push `duelProgress` to `1.0` and blast Lanfear into `s8doorway`.<br>**Test:** `tests/lanfear.test.mjs` |
| **T8** | **Stage 8 Finale Sequence (Redstone Doorway Banishment & Twinkle Toes Sassy Walk Dance)** | `src/call8-cutscene.js`, `src/stage8-view.js` | Exact verbatim finale sequence: Lanfear's `"I am the queen of love and beauty!"` → linked mega-fireball pushes her through the twisted redstone doorway → `"Not again! Not the snake people! Ahhhhhhh!"` → Twinkle Toes' 8-frame `sassy_walk` dance + `"Bubby you saved me! But what took you so long?"` → Riley's `"Too many snack breaks."`<br>**Test:** `tests/stage8-finale.test.mjs` |
| **T9** | **Stage 8 Bot (`stage8Bot`) & Full Headless Playthrough** | `src/bot-stage8.js`, `src/bot-stage4.js` | `stage8Bot` clears Zones 1–4 headlessly and in Playwright, dodges Taim's fire waves, triggers the Callandor link, wins the fireball duel, and reaches the finale victory state.<br>**Test:** `tests/stage8-bot.test.mjs` |
| **T10** | **Art Generation & Processing ("Best Artwork Yet")** | `assets/stage8/*.png`, `tools/stage8/process_art.py`, `src/stage8-load.js` | Generate & process all 9 background plates (`bg8*`) and 7 sprite sheets (`s8algai`, `s8wiseone`, `s8sister`, `s8randbox`, `s8allies`, `s8linked`, `s8lanfear`, `s8doorway`); verify alpha mattes, baseline alignment, and GPU residency `≤ 102.4 MiB`.<br>**Test:** `tests/stage8-art.test.mjs` |
| **T11** | **Voice Synthesis & Whisper Verification (`28` Clips)** | `assets/audio/voice/st8_*.mp3`, `lanfear_*.mp3`, `twinkle_saved_01.mp3`, `riley_snacks_01.mp3`, `assets/audio/stage8-voice-manifest.json`, `tools/stage8/voice-render.json` | Render all 28 lines via ElevenLabs `eleven_v4` / CosyVoice 3 / Kokoro; verify loudness (`-16.5..-18 LUFS`), true-peak headroom, and faster-whisper word match; update `VOICE_PROVENANCE.md`.<br>**Test:** `tests/stage8-voice.test.mjs` |
| **T12** | **Nordic-Vocal Music Loops (`music-stage8.mp3` & `music-boss8.mp3`)** | `assets/audio/music-stage8.mp3`, `assets/audio/music-boss8.mp3`, `tools/stage8/loop_music.py`, `assets/audio/AUDIO_PROVENANCE.md` | Slice and loudness-normalize the Suno Nordic-vocal tracks (`-16.0` / `-15.2 LUFS`), verify seamless loop correlation `>= 0.98` via `tools/music/check_loops.py`, and wire loop points in `src/stage8.js`.<br>**Test:** `tests/stage8-music.test.mjs` |
| **T13** | **Video Cutscenes (`stage8.mp4`, `stage8_callandor.mp4`, `stage8_finale.mp4`)** | `assets/cutscenes/stage8.mp4`, `assets/cutscenes/stage8_callandor.mp4`, `assets/cutscenes/stage8_finale.mp4`, `src/cutscene.js`, `src/cutscene-hooks.js` | Render 3 character-name-free video clips with **Riley always shown from behind** (face never visible); transcode to 720p24 H.264/AAC `+faststart` (`≤ 18 MB` total).<br>**Test:** `tests/stage8-cutscene.test.mjs` |
| **T14** | **Audit Gates (`tools/audit-stage1.mjs`) & Playwright E2E** | `tools/audit-stage1.mjs`, `tests/stage8-e2e.spec.js` | Add `STAGE8_SRC`, `STAGE8_VOICE`, `STAGE8_ART`, `STAGE8_MUSIC`, `STAGE8_VIDEO`, and Stage 8 GPU zone checks to `tools/audit-stage1.mjs`; verify `preFight < 25,000,000 B` and all existing Stage 1–7 tests pass untouched. |
| **T15** | **Enable Stage 8 by Default & Campaign Completion Polish** | `src/stages.js` | Flip `stageEnabled(7)` and `stageEnabled(8)` default-on (while keeping `?s8=0` kill-switch support); run full test suite and audit. |

---

## 15. Risks, Pushback & Open Questions for Jason

### 15.1 Technical & Design Risks (and Mitigations Built Into This Plan)

1. **Risk — Pre-Fight 25,000,000-Byte Gate Has Only 51.3 KB Free (`24,948,685 B` used):**
   - *Cause:* `tools/audit-stage1.mjs` includes every JS file statically imported from `src/stages.js` inside the Stage 1 `preFight` total.
   - *Mitigation:* Keep Stage 8's 14 JS modules under `42 KB` total by reusing `src/shaido.js` (`ShaidoDancer`, `ShaidoVeiled`) and `src/stage7-fighter.js` / `src/stage7-frames.js` / `src/stage7-paint.js` / `src/stage7-hurt.js`, and register Stage 8 music/voices inside `src/stage8.js` (never in `src/audio.js`). If we ever want extra JS headroom, `src/stages.js` can lazy-bind Stage 8 or `audit-stage1.mjs` can exclude `stage8*.js` from Stage 1's pre-fight sum just like `stage8` assets.
2. **Risk — GPU Memory Ceiling (`105.0 MiB` Source / `120.0 MiB` GL) With So Many Characters at Dumai's Wells:**
   - *Cause:* Dumai's Wells features Shaido, Black Ajah, Rand in the box, Taim, Perrin, Loial, Maidens, Wise Ones, linked Riley + Twinkle Toes, Lanfear, and the Redstone Doorway.
   - *Mitigation:* Dropping Trollocs (`grunt`, `spear`, `hound`) from `STAGE8_CHARS` immediately frees **35.46 MiB of RGBA**, and consolidating Perrin/Rand/Taim/Loial/Maidens into one shared `1536×1024` sheet (`s8allies`, `6.00 MiB`) plus lazy-swapping wave enemies for `s8lanfear` + `s8doorway` at Zone 4 keeps the Stage 8 GPU peak at **`102.36 MiB` in Zones 1–3** and **`90.36 MiB` in Zone 4**.
3. **Risk — Taim's 60-Second `"Asha'man, kill!"` Firing During Cutscenes or the Phase 3 Fireball Duel Lock:**
   - *Mitigation:* `taimTimer` pauses while `scene.cutscene`, `scene.storyActive`, or `lanfear.state === 'duel_clash'` is active, and holds at `0.5 s` until free movement resumes so the player is never hit while inputs are locked.
4. **Risk — Video Generators Accidentally Turning Riley Around to Show His Face:**
   - *Mitigation:* Every shot featuring Riley in §12 explicitly specifies *"strictly FROM BEHIND... only his back, shoulders, and the back of his head are visible; his face is never shown"*, and T13 includes a frame-extraction inspection pass (`ffmpeg -vf fps=2`) before committing any `.mp4`.

---

### 15.2 Open Questions & Decisions for Jason

Each question includes a recommended default so implementation can start immediately once you say go:

| ID | Question for Jason | Recommended Default in This Plan |
|---|---|---|
| **D1** | **Suno "Asha'man Kill" Source File:** Do you have the original MP3/WAV from your prior *"Asha'man Kill"* Suno song that you want dropped into the workspace, or should we generate fresh takes from the Nordic-vocal Suno prompts in §11 (or use your file as a Suno Cover/Persona reference)? | Support both: if you drop the file into `/workspace/rwb-audio/`, `tools/stage8/loop_music.py` will slice and loop it directly; otherwise use the §11 Nordic-vocal Suno prompts. |
| **D2** | **Twinkle Toes' Voice Engine:** Should Twinkle Toes' 4 new Stage 8 lines (`st8_circle_02`, `st8_circle_05`, `lanfear_intro_02`, and `"Bubby you saved me! But what took you so long?"`) use her established Kokoro cast (`75% af_bella + 25% af_heart`, speed `1.08`, pitch `1.14`) for continuity with Stage 1, or a new ElevenLabs `eleven_v4` voice? | Render with her established Kokoro cast first (100% consistent with Stage 1) and optionally audition an ElevenLabs `eleven_v4` take side-by-side for you to pick. |
| **D3** | **First Taim `"Asha'man, kill!"` Timing:** Strictly waiting 60.0 s from `t = 0` means fast players might already be in Zone 2 before seeing the first barrage. Is a **first showcase barrage at `t = 18 s` in Zone 1, followed by strictly every `60.0 s` thereafter** good? | **Yes:** `t = 18 s` first barrage in Zone 1, then every `60.0 s` on the dot. |
| **D4** | **Taim Hazard During Lanfear Phases 1–2:** Should Taim's every-60-seconds `"Asha'man, kill!"` rolling earth & fire continue during Phases 1 and 2 of the Lanfear boss fight (pausing only during Phase 3's final Fireball Duel lock), or stop once Riley enters Zone 4? | **Continue during Phases 1 & 2** (adds epic Dumai's Wells chaos while Lanfear shields herself for `0.4 s`), and pause during the Phase 3 Fireball Duel lock. |
| **D5** | **Twinkle Toes Framing in Video Clips (`stage8_callandor.mp4`, `stage8_finale.mp4`):** Per Decision A3 in `STAGE7-PLAN.md`, Riley is strictly from behind in all video clips. Should Twinkle Toes also stay from behind / three-quarter dorsal silhouette in the `.mp4` videos while showing her full front/three-quarter sassy walk dance in the painted 2D game sprites (`s8linked`)? | **Yes:** Video clips keep both Riley and Twinkle Toes from behind / dorsal three-quarter silhouette; in-game 2D painted sprites (`s8linked`) show her full face, crown, and sassy walk dance. |
| **D6** | **What Happens After Stage 8 Victory?** Since Stage 8 is the final level of the campaign, should beating Stage 8 show a **Grand Campaign Victory / Credits screen** before looping back to Stage 1 (`stage8Return: true`, keeping score & lives for a New Game+ victory lap)? | **Yes:** Show the finale sequence + `STAGE 8 CLEAR — THE WHEEL WEAVES` victory summary, then loop into a New Game+ Stage 1 victory lap with `stage8Return: true`. |
