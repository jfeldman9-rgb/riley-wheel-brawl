# RWB 2.0: ten stages (addendum to PLAN.md)

*Fri Oct 2, 2026. Jason: "the game is too short, 2.0 needs ten levels." This keeps the five existing stages in their current order, adds five Wheel of Time stages around them, gives every stage a boss, and revises the roadmap in PLAN.md §10.*

## 1. Why the chosen style and pipeline scale to ten stages

- **One house style, one master sheet per character.** Every animation sheet is generated *from* a locked master (`spike/gen/riley/master-side.png`, `spike/gen/trolloc/master-side.png`). New stages add new masters, never new styles.
- **Sheets, not single frames.** One generation produces a whole action (6–12 frames), so style holds inside an action and cost per frame stays low. The spike measures how well it holds *between* sheets (see `spike/SPIKE.md`).
- **Scripts do the repetitive work.** Slicing, registration, normal maps, atlas packing and loop previews are scripted (`spike/tools/`), so stage 10 costs the same as stage 2.
- **Shared archetypes.** Each stage has 1–2 *new* enemy types plus returning ones, so the cast grows by about 14 regular enemies across the game, not 40.
- **Background kit per stage:** 6–8 parallax layers + props + `lights.json`, generated against a per-stage style tile from the same house style.
- **Video stays small:** 4 hero videos (Grok Imagine primary, Gemini Omni backup) plus in-engine cinematics for every stage. Ten stages do not mean ten videos.

## 2. The ten stages

Existing stages are marked **(1.2)**. The order follows the 1.2 campaign, with new stages slotted between.

| # | Stage | Setting and set piece | New enemies | Boss (3 phases) | Light and weather |
|---|---|---|---|---|---|
| 1 | **Emond's Field, Winternight (1.2)** | The Trolloc raid on the Two Rivers; burning cottages, the Winespring Inn door smash; the Fade carries Twinkle Toes over the rooftops | Trolloc grunt, spear, hound | **Trolloc Chieftain**: axe strings → horn charge into walls + hounds → hurls burning carts | Moonlight + firelight, snow |
| 2 | **Baerlon and the Whitecloaks (NEW)** | Muddy streets, the Stag and Lion inn, Children of the Light searching for "Darkfriends"; a pursuit through a stable that collapses | Whitecloak zealot (shield + charge), Whitecloak archer | **Jaret Byar, Child of the Light**: sword and shield with parry bait → calls archer volleys (dodge lanes) → torch-the-barn rage | Overcast dusk, lanterns, rain |
| 3 | **Caemlyn (1.2)** | Royal city walls, Queen's Blessing inn, rooftop chase, palace garden | Darkfriend cutthroat (grabber) | **Myrddraal**: shadow blink → fear aura dims the screen edges → splits into 2 shadow copies (parry the real one) | Golden afternoon → torchlit night |
| 4 | **Shadar Logoth (1.2)** | Ruined city, Mashadar fog tendrils that chase the player; collapsing towers | Cultist caster | **Draghkar**: swoops from the background → hypnotic kiss (mash to resist) → fog shrinks the arena | Sickly green fog, moonlight |
| 5 | **The Ways (NEW)** | Loial guides Riley through the dark Ways: floating stone bridges, Guidings, broken ramps; Loial is a full co-op partner here | Shadowspawn in the dark (only visible in light) | **Machin Shin, the Black Wind**: a living wind of whispers; it can only be pushed back with fire/light weaves; phase 3 chase across collapsing bridges | Total dark: the only light is Riley's fire and Loial's lantern |
| 6 | **Tarwin's Gap and the Blight (NEW)** | The Borderland fortress gate, then the twisted Blight; Shienaran lancers fight beside you | Blight wolves, Myrddraal lieutenant (elite) | **The Worm (Jumara)**: bursts from the ground → grabs and slams → bursts out of the walls of a ravine | Red sky, heat haze, ash |
| 7 | **Stone of Tear (1.2)** | The great fortress, Defenders of the Stone, the Heart of the Stone; Riley takes Callandor | Stone Guard (shield) | **Be'lal**: sword flurry → balefire lines cut the floor → Riley draws Callandor mid-fight (moveset swap) | Torches, crystal god-rays |
| 8 | **Rhuidean (NEW)** | The Aiel Waste and the glass columns of Rhuidean; a sandstorm set piece | Shaido spear-dancer (fast, acrobatic), Shaido veiled archer | **Asmodean**: harp weaves (music-note projectiles) → glass column illusions (find the real one) → collapses the columns | Desert noon → glowing glass at night |
| 9 | **Dumai's Wells (NEW)** | Riley arrives with the Asha'man to free a captive; a huge field battle against Shaido and Aes Sedai | Black Ajah sister (weave shield), Gray Man (invisible until lit) | **Galina Casban** (Black Ajah, Red): shields Riley's weaves (melee only) → Shaido waves → a weave duel super-clash | Dusty sunset, lightning from the Asha'man |
| 10 | **Black Tower (1.2)** | Taim's fortress, Turned Asha'man, the rescue of Twinkle Toes and the escape as the tower falls | Turned Asha'man (ranged) | **Mazrim Taim**: weave duel and lightning → summons Turned Asha'man → Saidin tug-of-war super; Twinkle Toes joins the final hit | Storm, lightning flashes light every sprite |

**Story spine for ten stages.**
- **Act I (1–4):** Twinkle Toes is taken. Riley follows the Fade and learns he can channel.
- **Act II (5–7):** Loial and the Ways, the Blight, then Callandor. Riley's taint appears.
- **Act III (8–10):** Rhuidean's visions show Taim behind everything. At Dumai's Wells Riley joins the Asha'man, which leads to the Black Tower rescue.

Twinkle Toes is glimpsed in every stage (ribbons are collectibles).

**Hero videos (4), each 20–40 s:** opening (Winternight), Twinkle Toes taken (implied, never shown), Callandor (stage 7), finale (stage 10).

**Kid-safety notes:** no gore, Shadowspawn dissolve into ash, the abduction is only implied, and the Forsaken are theatrical villains.

## 3. Content totals for ten stages (2.0 target)

| Item | Count | Painted frames (est.) |
|---|---|---|
| Playable: Riley, Loial, Twinkle Toes | 3 | ~520 |
| Regular enemy types | 14 | ~770 (about 55 each) |
| Elites | 4 | ~260 |
| Bosses | 10 | ~1,300 (about 130 each) |
| VFX strips, portraits (expressions + mouth shapes) | | ~400 |
| **Total painted frames** | | **~3,250** |
| Backgrounds | 10 stages × 6–8 layers + props | ~90 plates |
| Image generations (sheets of 6–12 frames, about 1.8 tries per sheet) | | **~1,000–1,200** across ChatGPT Pro and Gemini (no paid usage) |

## 4. Revised roadmap for ten stages (replaces PLAN.md §10 phases 3–5)

| Phase | Scope | Calendar | Worker-days |
|---|---|---|---|
| 0 Spike | Style lock, Riley + Trolloc animation tests, lit Phaser 4 prototype (in progress) | 4 days | 7 |
| 1 Vertical slice | Stage 1 Emond's Field, full quality bar from PLAN.md §10 | 3 weeks | 35 |
| 2 Depth + co-op | Loial P2/CPU partner, full weave set, parry, Survival prototype | 2 weeks | 22 |
| 3 Stages 2–4 | Baerlon (new), Caemlyn, Shadar Logoth; 4 enemy types, 3 bosses | 4 weeks | 45 |
| 4 Stages 5–7 | The Ways (new), the Blight (new), Stone of Tear + Callandor; 4 enemy types, 3 bosses, video 3 | 4 weeks | 48 |
| 5 Stages 8–10 | Rhuidean (new), Dumai's Wells (new), Black Tower finale; 4 enemy types, 3 bosses, video 4 | 4 weeks | 48 |
| 6 Modes + ship | Twinkle Toes playable, Arcade, Boss Rush, Dojo, costumes, accessibility, device QA | 2 weeks | 22 |
| **Total** | | **about 19–20 weeks** | **about 227 worker-days** |

Each stage phase has the same gate: freeze-frame test 9/10, the campaign bot clears it, and 60 fps p95 on Jason's iPad (the smoothness guardrail now covers stages 1, 4, 7 and 10).

**Throughput assumption:** after the slice, one stage costs about 15 worker-days: about 6 art (2 new enemies + boss + background kit), 5 code (enemy AI, boss script, set piece), 2 audio/cinematic, and 2 QA/review. Running 3–5 agents in parallel gives about 1.3 weeks per stage.

## 5. Worker split (ten-stage version)

| Worker | Share | What |
|---|---|---|
| **Codex (ChatGPT Pro)** | ~35% | Engine and combat code, boss scripts, image-sheet orchestration via `codex exec` + image_gen |
| **ChatGPT Pro images** | (inside Codex runs) | Masters, all animation sheets, VFX, portraits, storyboard keys |
| **Gemini images** | ~10% | Alternative masters for selection, background plates, a second source when ChatGPT image quota is tight |
| **Cursor cloud agents (Grok 4.7)** | ~25% | Enemy AI, UI, audio mixer, pipeline tools, hitbox editor, tests and perf gates, parallel stage branches |
| **Grok Imagine / Gemini Omni** | ~5% | Motion-reference clips and the 4 hero videos only (never stills) |
| **Box orchestrator (Grok Bot)** | ~15% | Runs the pipeline, captures reviews, frame ledger, perf runs, merges |
| **Suno (if the plan allows)** | | Stage themes with intensity layers; otherwise re-arrangements of the existing theme |
| **Claude Pro (limited)** | ~2% | One full script and canon/tone review, final code review of tricky modules |
| **Perplexity Pro** | ~2% | Wheel of Time canon checks and reference research |
| **Jason + Riley** | ~6% | Approve masters and contact sheets (5 minutes per batch), blind tests at each gate |

## 6. Risks specific to ten stages

- **Image quota over about 20 weeks.** Mitigation: sheet batching, a frame ledger, and spreading work across ChatGPT and Gemini. If quota binds, cut boss frame counts (about 100 each) before cutting stages.
- **Style drift across months.** Every new master is generated against the house style tile plus Riley's master as a scale reference, and every stage gets a freeze-frame review next to stage 1.
- **Scope.** Stages 2, 5, 6, 8 and 9 are new. If the schedule slips, stages 6 and 8 are the first candidates to merge into one longer stage each, giving 8 stages, and Jason decides.
