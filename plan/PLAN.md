# Riley Wheel Brawl 2.0: the "Highland" plan

*Written Fri Oct 2, 2026. Source reviewed: `rwb-w2` (live) and `rwb-1-2-joins` (latest preview), commit history since Sep 29, every file in `js/`, the art folders, and new headless captures of all five stages (see `shots/`).*

---

## Executive summary (about 250 words)

Riley Wheel Brawl 1.2 is well engineered but sits at its ceiling. Enemies are single painted cutouts bent at the joints. Riley's whole seven-move kit uses four painted poses. Nothing is lit, because Canvas 2D can't do real-time light or bloom at 60 fps, and one music loop plus synthesized hits covers all five stages. The last two days of work stayed inside that ceiling: over half the files touched were docs and test gates, and pixel-hash CI locks reject bold art changes by design. That is why it felt like under 5%.

The leap means raising the ceiling. **Key recommendation: rebuild as "RWB 2.0" on Phaser 4 (WebGL2, released April 2026) with frame-by-frame painted animation.** That means about 200 frames for Riley instead of 18, 40 to 70 frames per enemy, and normal-mapped sprites under dynamic lights, so a fireball lights up the snow and the Trolloc it hits. A new AI pipeline makes the frames. Grok Imagine and Gemini Omni generate the motion, ChatGPT images paints the key poses in one house style, and box scripts clean, register and pack them. Cutscenes are short Grok Imagine and Gemini videos, with no Seedance or Manus. The story, stages, voices and Suno theme carry over.

**Vertical slice first:** Stage 1 (Emond's Field, Winternight) rebuilt end to end in about 3 weeks after a 4-day style-lock spike. It is judged by a blind side-by-side with Jason and Riley, a 10-frame freeze test, and hard numbers, with 60 fps on iPad as a guardrail. Stages 2 to 5, Loial co-op, Survival mode and unlockables follow over about 10 more weeks.

---

## 1. Honest diagnosis: why it feels like a 2020 Model 3

### 1.1 What is genuinely good (keep it)

- **The premise and the cast.** Riley as a 16-year-old Asha'man black belt rescuing an 8-year-old sister across five Wheel of Time stages is a great hook. Bosses (Trolloc Chieftain, Myrddraal, Draghkar, Be'lal, Mazrim Taim) are the right Wheel of Time picks.
- **Painted source art.** The Riley-16 frames, portraits, cutscene cards and Stage 4/5 panoramas are good illustrations. The problem is how they move, not how they were painted.
- **Engineering discipline.** It has no build step, works offline, has a campaign bot, a soak test, perf telemetry and device tiers. The *idea* of automated gates is right, but the gates are aimed at the wrong target (§1.4).
- **Voice, captions, and the Suno main theme.** All of these carry over.

### 1.2 The five things that cap the game

**A. Animation density is the largest single gap.**

![Kick chain](shots/best-3-kick-chain-annotated.png)

*`shots/best-3-kick-chain-annotated.png`: Riley's 3-hit kick chain sampled every 33 ms. He shows two painted images in a full second: "kick" held 330 ms, then "roundhouse" held about 650 ms.*

- Riley's entire kit is **19 painted frames** (`assets/art/riley16-v2/`). Gameplay uses only **4 attack images for 7 moves**: front kick, jump kick → `kick`; roundhouse, back kick, spin → `roundhouse`; knee → `knee`; throw → `fireball` (`player.js spriteFrame`). There is no anticipation, no smear and no recovery. The pose snaps in, holds, and snaps out.
- Street-brawler references run at roughly **8 to 15 painted frames per attack** and **150 to 400 frames per playable character**. 1.2 has about 5% of that density. This alone explains most of the "2010 Flash game" feel.

**B. Enemies are puppets made from a single cutout.**

![Rig poses](shots/best-2-rig-poses-annotated.png)

*`shots/best-2-rig-poses-annotated.png`: idle, walk, attack and hurt are nearly the same silhouette. Knockdown rotates the whole image 90°. Skinning bends rigid props, so the Stone Guard's spear and the Fade's sword curve like rubber.*

- All 11 rigs in `js/puppets.js` deform one painting with joint angles. Dragon's Crown proves puppets *can* look stunning, but only with dozens of swappable parts per character and a dedicated animator. Here there are no part swaps and no hand, face or weapon variants, so the result reads like a paper doll.
- Hit reactions are a lean plus a tint. The Trolloc in the kick strip barely reacts to three kicks.

**C. There is no lighting, and the renderer can't do it.**

- Canvas 2D has no shaders, normal maps, bloom, or per-pixel lights. Every fighter is lit by nothing, so they look pasted onto the plates (Stage 3, below). The burning-village and torch-lit Stone of Tear settings are begging for light the engine cannot provide at 60 fps on an iPad.
- Heavy hits fall back to a **full-screen cream flash** (`camera.js` IMPACTS; last cell of the kick strip; `shots/s1-heavyhit-flash.png`). It is the oldest trick available, and it hides the hit.

**D. The screen talks instead of showing.**

![Stage 3 mid-fight](shots/best-1-stage3-midfight-annotated.png)

*`shots/best-1-stage3-midfight-annotated.png`: on desktop, the touch overlay is always drawn over the fight (`scenes.js` draws `drawTouch` with `always: true`). The screen also shows a tutorial card ("CULTIST: DODGE THE SPELL, THEN STRIKE"), a hazard banner, and the HUD at once, plus two identical Trolloc cutouts in the same pose.*

- Boss attacks are announced as text ("HORN CHARGE", "SWOOP") and telegraphed with **yellow outline rectangles** (`shots/s1-boss.png` … `s5-boss.png`). Modern games telegraph with animation, sound, and light.
- Press Start 2P pixel font over HD painted art is a style clash. Plate, sprite, portrait and UI styles each come from a different "generation".

**E. Hit feel is tuned below genre norms.**

- Light hit-stop is **25 ms (1.5 frames)**, heavy is 60 ms, and an `impactCooldown` of 90 ms suppresses repeats (`camera.js`). In the sampled chain, only 3 of 32 frames were in hit-stop. Genre norms are about 4 frames for light hits, 8 to 12 for heavy, and longer still for finishers, with the victim shaking.
- Audio is oscillator synthesis for every hit (`audio.js`), with one music loop aliased to every stage (`content.js` Suno themes all point to `main`). A layered, sampled hit sound does more for "feel" than any timing change.

### 1.3 Smaller but visible

- Riley is about **19% of screen height** (about 70 px of 360). Reference brawlers frame heroes at about 30%. Combined with flat light, he reads small and distant.
- Enemy variety is shallow. Most regular enemies are `Trolloc` subclasses with one attack each, and bosses have three named attacks and no phases.
- Cutscenes are still JPEG cards with text boxes (`shots/cutscene-opening.png`). No motion and no camera.

### 1.4 Why two days produced under 5%

Since Sep 29 the repo got 47 commits. File touches split roughly evenly: docs 164, tools/tests 162, JS 127, assets 145. Tools and tests are now **8,236 lines against 10,983 lines of game JS**. Several CI gates compare pixel hashes against locked baselines, so *any* art leap fails CI by design. The work was competent, but it optimized frame pacing and regression safety inside a fixed content model. **Polish cannot exceed the ceiling the content model sets.** The leap has to change the content model (frames, light, sound) and the engine that draws it.

---

## 2. The vision: what "Highland with HW4" means here

Same car, new everything under the skin: **the same story, stages, cast and controls, rebuilt on a new chassis.**

| Model 3 → Highland | RWB 1.2 → 2.0 |
|---|---|
| New chassis | Phaser 4 WebGL2 engine, 1280×720 logical resolution, real camera |
| HW4 sensors | Dynamic lighting with normal-mapped sprites, bloom, fog and weather shaders |
| Ride quality | Hit-stop, hit reactions, juggles, parries, input buffer: game feel at genre standard |
| New interior | Clean fantasy UI and fonts, no text cards mid-fight, touch UI that appears only on touch |
| Software | Token-based enemy AI with roles, bosses with 3 phases and arena hazards |
| Ambient light bar | Stage music with intensity layers, layered sampled SFX, reverb per location |

### 2.1 Reference games (and what to steal from each)

| Game | Steal this |
|---|---|
| **Streets of Rage 4** (2020) | Hand-drawn HD frame-by-frame look, combo/juggle model, "special costs health you can win back" loop, readable enemy roles, lighting on sprites. **Primary target.** |
| **TMNT: Shredder's Revenge** (2022) | Snappy, joyful feel; 2-player couch co-op that is fun for a dad and son; taunts; in-engine story beats. |
| **Dragon's Crown** (Vanillaware) | Painterly richness, huge bosses that fill the screen, magic VFX. Proof that painted 2D can look premium. |
| **Absolum** (2025, Dotemu/Guard Crush) | Modern hand-drawn fantasy brawler. Spells blended into melee, run-based replay (inspires Survival mode). |
| **Hades** | Character portraits with expression sets, banter that rewards replay, a clean diegetic UI. |
| **Hollow Knight** | Hit-stop and screen-shake grammar, boss telegraph clarity. |

**North-star sentence:** *"A freeze-frame from any fight in RWB 2.0 should look like a Streets of Rage 4 screenshot set in the Wheel of Time, and Riley should say 'that's me.'"*

### 2.2 Look targets

- **House style:** hand-drawn HD with confident ink outlines and painterly shading (SoR4 line, Vanillaware light). AI image models are most consistent in this style. AI pixel art drifts badly and should not be used.
- **Camera:** 1280×720 logical resolution, Riley about 30% of screen height (about 220 px), dynamic zoom (1.0 → 1.12 on finishers, 0.92 when crowded), look-ahead.
- **Light:** every stage gets a light rig: moon rim and fire key on Stage 1, sickly green fog on Stage 3, torch and god rays in the Stone of Tear, lightning on the Black Tower. Every fighter is normal-mapped, so a passing fireball lights faces and armor.
- **Signature "wow" moments in the slice:** the fireball as a moving light source; snow that hits the fighters and blows on impact; a Trolloc wall bounce into a cottage door that splinters; Chieftain phase 2 lighting the arena with burning carts.

---

## 3. The key architecture decision

### 3.1 Renderer and engine

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Stay on vanilla Canvas 2D** | Zero migration; existing tests | No shaders, normal maps or bloom; per-pixel effects kill iPad fps; this is the ceiling we just hit | ❌ Caps the leap |
| **PixiJS v8 (8.20)** | Best-in-class WebGL renderer, filters, mature; WebGPU optional | Renderer only. We rebuild scenes, camera, input, audio, physics, scaling, and lighting ourselves | ⚠️ Strong 2nd choice |
| **Phaser 4 (v4.0, Apr 2026)** | New WebGL2 render-node renderer; **`setLighting(true)` with normal maps and self-shadow on sprites, tilemaps and particles**; unified filters (Bloom, Glow, Vignette, ColorMatrix, Blur, Shadow); particles, cameras with shake/zoom/flash, atlas animation, audio, gamepad + touch input, scale manager, context-loss recovery; **ships 28 AI-agent skill files** for coding agents | Rewrite of the render/scene layer; v4 is 6 months old; Canvas renderer deprecated (we don't need it) | ✅ **Recommended** |
| Custom WebGL2 | Total control | Months of engine work before any game gets better | ❌ |
| Godot 4 web export | Great editor and lighting | Big WASM download, slow iOS Safari startup, threads/audio quirks, agents less fluent, no GitHub Pages simplicity | ❌ |

**Recommendation: Phaser 4, WebGL2 only, with no build step.** Vendor `phaser.esm.min.js` into the repo and use native ES modules, so the GitHub Pages deploy stays "push and it's live." A Vite build can come later if it is ever needed. Gameplay *logic* (combat math, AI state machines, campaign data, captions, voice lines) is ported module by module from 1.2. Rendering, camera, FX and UI are rewritten on Phaser.

Sources: [Phaser v4.0.0 release](https://github.com/phaserjs/phaser/releases/tag/v4.0.0), [Phaser 4 lighting and normal maps](https://phaser.io/news/2026/05/phaser-4-dynamic-lighting), [PixiJS v8.20](https://github.com/pixijs/pixijs/releases/tag/v8.20.0).

### 3.2 Animation model

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Keep puppet rigs (single cutout) | Cheap | This is the current look | ❌ |
| Vanillaware-style puppet with part swaps | Smooth, memory-cheap, scalable | Needs a skilled rigger/animator; AI can't do it well; Spine costs money (not allowed); DragonBones is abandoned | ❌ for heroes |
| **Frame-by-frame painted sprites** | Matches SoR4; every frame can be an illustration; smears and squash are free; **AI video + image models are now good at exactly this** | Many frames, more texture memory, consistency risk | ✅ **Recommended** for Riley, Loial, Twinkle Toes, all bosses and core enemies |
| Hybrid: frames + mesh secondary motion | Capes, Fade cloaks, hair and banners sway via Phaser Mesh/Rope on top of frames | A bit more code | ✅ Add for cloth only |

**Frame budget (2.0 target):**

| Character | Animations | Painted frames |
|---|---|---|
| Riley | ~26 (idle, walk, run, jump ×3, 4-hit chain + 2 branches, back attack, dash attack, launcher, air ×3, grab set ×4, 5 weaves, super, parry, hurt ×3, knockdown/getup, victory, Callandor stance set) | **180–220** |
| Loial (P2) | ~20 | 140–170 |
| Twinkle Toes (unlock) | ~18 | 120–150 |
| Regular enemy (×9 types) | idle, walk, 2–4 attacks, hurt high/low/gut, knockdown, wall/ground bounce, getup, death | **40–70 each** |
| Boss (×5) | intro, 6–9 attacks, phase transitions, hurt, stagger, KO | **100–160 each** |

Playback runs at 12 fps "on twos" for most motion, with key impact frames held and 24 fps for fast kicks. The anime timing is deliberate: it reads crisper than tweening.

**Memory plan:** frames are trimmed, packed into 2048² atlases (WebP to download, KTX2/ASTC where supported), and loaded per stage. Budget is ≤ 220 MB GPU per stage on iPad and ≤ 140 MB on the phone tier (half-resolution atlases).

### 3.3 What gets thrown away, kept and ported

- **Thrown away:** canvas renderer, puppet system, pixel-hash locked gates, touch overlay drawing, text telegraph rectangles.
- **Ported:** campaign/stage data, captions and voice scripts, difficulty tables, combat math, AI state logic (extended), save/options, the campaign bot concept.
- **Kept live:** 1.2 stays on `rwb-w2` and GitHub Pages, frozen except for bug fixes, until 2.0 Stage 1 beats it in Jason's blind test. 2.0 develops on a new branch `rwb-2` with branch previews via raw.githack. A separate repo with its own Pages site is an option if Jason prefers; creating it needs his OK.

---

## 4. Art pipeline (AI tools, no new paid services)

**Rule of the pipeline: humans and agents choose and judge; models produce; scripts enforce consistency.**

### 4.1 Step 0: the Style Bible (do this once, first)

1. **Golden character sheets** (ChatGPT images, from `riley.jpg` and the current Riley-16 art): turnaround (front, ¾, side, back), face close-ups with glasses, 6 expressions, hands (fist, open, channeling), costume details. Do the same for Loial, Twinkle Toes, each enemy and each boss.
2. **Style tile:** line weight, outline color rules, shading steps, the light direction (key from upper-left, cool rim from behind-right), palette swatches with hex codes per character.
3. **Proportion locks:** Riley at 7.5 heads, adult-athletic 16-year-old build, short dark hair, glasses always on. Checked automatically (§4.4).
4. Gemini images produce a parallel version of each sheet. Jason picks the winner. The loser becomes the "drift detector" reference.

### 4.2 Motion source: three routes, use the cheapest that works per move

| Route | How | Best for |
|---|---|---|
| **A. Video → keys (default)** | Grok Imagine Video 1.5 **image-to-video** from the golden side-view pose on a flat chroma background: *"locked side camera, full body, performs a Tae Kwon Do spinning hook kick, returns to stance, plain #00FF00 background."* 1–15 s at 720p/1080p, 24 fps. Gemini Omni (up to 10 s, up to 5 reference images) is the second source when Grok drifts. A box script extracts frames, keys the background, and picks 6–12 key poses by motion energy. | Natural full-body motion: kicks, spins, getups, knockdowns, boss lunges |
| **B. Pose-sheet direct** | ChatGPT images: "6-frame strip of the same character doing X, consistent with the attached sheet." One generation means one consistent style across the strip. | Short actions (4–8 frames), hurt reactions, idles, VFX |
| **C. 3D pose proxy** | Free Mixamo martial-arts clips on a mannequin, rendered side-on with Blender headless on the box → silhouettes as pose guides for ChatGPT image edit | Exact martial-arts timing when A/B drift; Loial's heavy grapples |

Video is used **for motion only**. Every final frame is repainted by the image model against the golden sheet, so the video's style drift never ships.

### 4.3 Paint pass

- ChatGPT image edit with the golden sheet plus a 2×3 or 2×4 grid of pose guides → transparent PNG grid, 512 px cell, feet on a fixed baseline. **Grids, not single frames:** one call gives coherent style across a whole action.
- Smears and impact frames are requested explicitly: "frame 4 is a smear frame, motion-blurred leg arc."
- VFX (impact bursts, slashes, fire, Saidin wisps, Balefire) come as 6–8 frame strips on black, played back additively.

### 4.4 Automated cleanup and QA (box scripts, built by a Cursor agent)

1. **Matte cleanup:** remove fringe, despill green, refine alpha.
2. **Registration:** align by feet/pelvis anchor and normalize scale to the sheet height. Frames stop "swimming."
3. **Palette lock:** map each frame's colors to the character palette (LAB nearest + soft blend) so the coat stays the same black in every frame.
4. **Flicker/likeness check:** a vision-model judge scores every frame against the golden sheet (glasses present, hair, build, costume, no extra limbs). Frames under threshold are regenerated automatically, up to 3 tries, then flagged for a human.
5. **Normal maps:** generated algorithmically from alpha distance + luminance + a light shape prior. This gives Phaser rim light and torch-lit relief without hand-painting normals.
6. **Hitbox authoring:** a small web tool (agent-built) to draw hurt/hit boxes per frame, saved to JSON beside each atlas.
7. **Atlas packing:** `free-tex-packer-cli` → Phaser atlas JSON + WebP, with optional KTX2.
8. **Contact sheets:** every animation is rendered as a strip and a GIF into `review/` for Jason's thumbs-up.

### 4.5 Backgrounds

- Each stage becomes **6–8 parallax layers**: sky, far, mid, play-floor, near props, foreground occluders. That adds depth and a camera that feels 3D. Existing plates become concept references and some get repainted in the house style.
- Animated elements include flags, smoke, fire sprites, and NPC silhouettes fleeing. Breakables (barrels, carts, doors, Stone pillars) come with 3–4 damage states.
- Each stage gets a `lights.json` (position, color, radius, flicker) so sprites are lit by the world.

### 4.6 Cutscenes and video (Grok Imagine and Gemini only)

Seedance and Manus are **not used**, per Jason (too many credits).

| Tool | Role | Limits to design around |
|---|---|---|
| **Grok Imagine Video 1.5** | Primary. Image-to-video from painted storyboard keys; *extend* to chain shots; native 1080p | 1–15 s per clip; reference mode (up to 7 refs) capped at 720p; native audio is generated but we strip it and use our own VO/music |
| **Gemini Omni** (replaced Veo in the Gemini app) | Second source and fixer: multi-turn edits ("make his glasses visible", "slow the camera"), up to 5 photo references | Up to 10 s per clip; quota varies by plan; feature not available to under-18 accounts (Jason's account is fine) |

**Pipeline:** script → shot list → painted keyframes (ChatGPT, house style, same golden sheets) → Grok Imagine animates each key (3–8 s shots) → pick the best of 2–3 takes → `ffmpeg` on the box assembles shots, adds Kokoro/TTS voice, Suno music and SFX, and burns letterbox + captions → H.264 MP4 720p (about 3 Mbps) plus poster frame, lazy-loaded, skippable, `playsinline`, started after a user tap for iOS.

**Video budget:** 4 hero videos (opening on Winternight, the Fade taking Twinkle Toes, Callandor, the finale) at 20–40 s each. All other story beats run **in-engine** (animated portraits with 4 mouth shapes and expression sets, camera moves, letterbox), which is cheaper, consistent with gameplay art, and easy to edit. Total video ≤ 60 MB, well inside GitHub Pages limits.

**Content-policy risk:** video models may refuse an 8-year-old shown in peril. Show the abduction by implication: a shadow over the bed, a dropped ribbon, the Fade's cloak vanishing over rooftops, never the child being grabbed.

### 4.7 Worker assignments for art

| Worker | Art job |
|---|---|
| **ChatGPT Pro images** | Golden sheets, all final sprite frames (paint pass), portraits, VFX strips, UI art, storyboard keys |
| **Gemini images** | Alt sheets for selection, background plates, drift-detector references |
| **Grok Imagine** | Motion-reference clips (Route A), cutscene animation (primary) |
| **Gemini Omni video** | Cutscene alt takes and conversational fixes |
| **Codex (ChatGPT Pro)** | Batch orchestration of image calls, as before (`codex exec`) |
| **Cursor cloud agents** | Cleanup/registration/palette/normal-map scripts, hitbox editor, atlas packer, contact sheets |
| **Box orchestrator** | Runs the pipeline, captures review sheets, keeps a frame ledger |
| **Jason (+ Riley)** | Approves golden sheets and each animation's contact sheet (thumbs up/down, 5 minutes per batch) |

---

## 5. Combat and game-feel overhaul

### 5.1 Hit feel (numbers to ship)

| Element | 1.2 | 2.0 target |
|---|---|---|
| Hit-stop light / medium / heavy / finisher | 25 / – / 60 / 90 ms | **4 / 6 / 9 / 14 frames** (67/100/150/233 ms); last enemy of a wave adds 0.3× slow-mo for 250 ms |
| Victim during hit-stop | static | 2 px shake + white-hot rim flash on the sprite only |
| Screen flash | full-screen cream on heavy | **removed**; local painted impact bursts (additive), full-screen only for supers |
| Shake | fixed presets | trauma model (squared falloff, directional along hit vector) |
| Hit reactions | lean + tint | high / low / gut hurt frames, knockback slide with dust, wall bounce, ground bounce, juggle, crumple |
| Hit SFX | 1 synth layer | 3–4 sampled layers (transient + body + material + sweetener), ±8% pitch, per material (flesh, armor, stone, shadow) |
| Input | direct | 6-frame buffer, cancel windows on hit, lane-hop i-frames |

### 5.2 Riley's 2.0 moveset (Tae Kwon Do × Asha'man)

- **Ground chain (4 hits):** jab → front kick → roundhouse → spinning hook kick. **Branches:** hold forward on hit 3 → axe kick (ground bounce); up + attack → rising crescent kick (launcher).
- **Air:** flying side kick, dive kick (bounce off enemies), air roundhouse.
- **Dash attack:** tornado kick. **Back attack:** spinning back kick.
- **Grabs:** knee ×2, front throw (shoulder toss into other enemies), back throw, vault-over.
- **Weaves (cost Saidin):** Fire (fireball, chargeable, a *moving light source*), Air (gust → wall bounce), Earth (ground spikes → launcher), Spirit (ward = parry), Water (whip to pull enemies in).
- **Parry:** Spirit ward with a 6-frame perfect window → slow-mo counter. A late press gives a normal block with chip damage.
- **Super:** Balefire beam (full Saidin). The screen desaturates and the target's outline burns away.
- **Taint mechanic:** using weaves while hurt fills a Taint gauge. High Taint makes weaves stronger but drains health (SoR4's risk/reward, Wheel-of-Time flavored).
- **Callandor stance (from Stage 4):** a sword moveset swap. A whole new kit mid-campaign is the "new car" moment in the story.

### 5.3 Enemy AI

- **Attack tokens:** at most 2 enemies (3 on Hard) may commit to attacks at once. Others circle, flank, or taunt, so crowds feel smart rather than fair-by-luck.
- **Roles:** grunt, flanker (hounds), shield (Stone Guard, needs a guard break), ranged caster (Turned Asha'man), grabber (Darkfriend grabs from behind, mash to escape), aerial (Draghkar), charger (Trolloc axe), elite with super armor (flashes red on armored frames).
- Each enemy has 2–4 attacks and one unique behavior, and **telegraphs with animation, a sound sting and a light glint, never text or rectangles.**
- Difficulty scales tokens, reaction times and armor, not just HP.

### 5.4 Boss design (3 phases each, arena changes)

| Stage | Boss | Phase 1 | Phase 2 | Phase 3 / desperation |
|---|---|---|---|---|
| 1 Emond's Field | Trolloc Chieftain | Axe combos, grab | Horn charge (stuns himself on walls), summons hounds | Hurls burning carts; the arena catches fire and lights the fight |
| 2 Caemlyn road | Myrddraal | Shadow blink + sword strings | Fear stun aura; the screen edges darken | Splits into 2 shadow copies; parry the real one |
| 3 Shadar Logoth | Draghkar | Swoops from the background plane | Hypnotic kiss (mash to resist) | Mashadar fog shrinks the arena |
| 4 Stone of Tear | Be'lal | Sword flurry, parry-heavy | Balefire lines cut the floor | Riley takes Callandor mid-fight; the moveset swaps |
| 5 Black Tower | Mazrim Taim | Weave duels, lightning | Summons Turned Asha'man | Saidin tug-of-war super clash (mash + timing), with Twinkle Toes' rescue as the finale beat |

Bosses get damage-state art (torn cloak, broken horn), a cinematic intro (in-engine, 4–6 s) and a slow-mo KO.

### 5.5 Camera, lighting and VFX

- The camera does dynamic framing between players and enemies, zooms in on finishers, gives a slight dutch tilt on supers, and has letterbox for boss intros.
- **Lighting:** Phaser 4 lights with normal-mapped fighters; ambient + moon rim + local fires; fireball and Balefire are moving lights; lightning flashes light every sprite for 2 frames.
- **Post (filters):** Bloom on magic, vignette, per-stage color grade (ColorMatrix), heat haze around fire, fog via noise shader (Mashadar tendrils that react to the player).
- **Particles:** depth-sorted snow/ash/embers on 3 planes, hit sparks per material, debris from breakables.
- **Afterimages** on dash kicks; painted smears in frames.

---

## 6. Content expansion

### 6.1 Enemies (9 regular + 4 elites + 5 bosses)

Trolloc grunt (axe), Trolloc spear, Trolloc hound, Darkfriend cutthroat (grabber), Whitecloak zealot (shield + charge), Cultist caster, Stone Guard (shield), Turned Asha'man (ranged), Gray Man (invisible assassin that shimmers under light, a great use of the lighting engine). **Elites:** Trolloc Fist captain, Myrddraal lieutenant, Black Ajah sister (weave shield), Gholam mini-boss (immune to weaves; must be fought with kicks).

### 6.2 Co-op and characters

- **Loial = Player 2 in story mode** (local co-op on one device: keyboard + gamepad, or 2 gamepads; touch P1 + gamepad P2 on iPad). He is a heavy grappler with an axe and a "Song to Trees" area move, and an optional **CPU partner** for solo play.
- **Twinkle Toes = unlockable** after the first clear, and playable in the Stage 5 escape epilogue. She is a fast dancer kit with ballet spins, cartwheel kicks and sparkle dance trails, all kid-friendly.
- A team attack when P1 and P2 hit the same enemy within 10 frames.
- The **"Dad + Riley" use case** is a design pillar: Easy difficulty and assist toggles for P2, and shared lives.

### 6.3 Modes and unlockables

- **Story** (5 stages, about 45 min), **Arcade** (1 credit, score attack, leaderboard on the device), **Boss Rush**, **Survival: "The Last Battle"** (endless waves with roguelite weave perks between waves, Absolum-inspired), **Dojo** (training with move list, frame data display, combo challenges).
- **Unlockables:** costumes (Warder cloak, Dragon Reborn red coat, TKD dobok, *"1.0 Classic" costume that renders Riley as the old puppet*), concept-art gallery, music player, cutscene theater, Hard/Mania difficulties, a "big head" toggle.

---

## 7. Story and cinematic presentation

- **Three acts, five stages.** I: Winternight (Twinkle Toes taken). II: Caemlyn road and Shadar Logoth (the hunt, Riley's Saidin grows, the taint appears). III: Stone of Tear (Callandor) and Black Tower (Taim, the rescue).
- **Show it in the levels:** Twinkle Toes glimpsed in the background of every stage, carried away, leaving ribbons. Ribbons are collectibles that unlock art. Taim taunts through mirror visions mid-stage (in-engine).
- **Each stage has a cold open** (in-engine, ≤ 20 s) and a **boss KO cinematic**. The 4 hero videos (§4.6) mark the act breaks.
- **Portraits:** each speaking character gets 6 expressions plus 4 mouth shapes, with banter between Riley and Loial that changes on replays.
- **Writing pass:** Claude Pro (limited) for one tone and canon review of the full script. ChatGPT for bark lists (efforts, taunts, hurt lines for 50+ variants).

---

## 8. Audio

| Area | 1.2 | 2.0 |
|---|---|---|
| Music | One Suno loop for everything | **One track per stage + boss track + menu/victory**, each with intensity layers (explore / fight / boss) and stingers on wave clear and boss phase. Suno is used if Jason's plan allows. Otherwise stems of the existing theme are re-arranged per stage |
| SFX | Oscillator synthesis | Layered sampled SFX from free royalty-free libraries (Sonniss GDC bundles, Kenney, CC0 Freesound), per material, randomized pitch/volume, round-robin |
| Voice | TTS lines | More barks (efforts on every kick, hurt, KO, taunts), boss voices with processing (Fade: pitched + reverb; Taim: doubled) |
| Mix | Ducking | Sidechain ducking under VO and supers, reverb per stage (convolver: open snow, stone hall, cathedral), low-pass during slow-mo, a 3D-ish pan by screen x |

---

## 9. UI and onboarding

- A fantasy display font for titles plus a clean readable body font. Press Start 2P is gone except in the "Classic" unlock.
- HUD: compact portrait, health with recoverable segment, Saidin and Taint, combo counter with style grade. Boss bar with phase pips.
- **Touch UI only when touch is used** (dynamic joystick, 4 context buttons, opacity setting). It is never drawn on desktop.
- **No tutorial cards mid-fight.** A 90-second Dojo prologue teaches moves, then contextual one-line hints appear only if the player struggles (e.g. repeated hits from the same move).

---

## 10. Phased roadmap

> **Update, Oct 2, 2026:** the game now has **10 stages**. See [`LEVELS.md`](LEVELS.md) for the stage list, bosses, revised roadmap (about 19–20 weeks), effort and worker split. The style spike (`/workspace/rwb-2/spike/SPIKE.md`) found that sheets average about 2.3 image generations each, not 1.8. Raise the LEVELS.md image-generation estimate about 25%, to roughly 1,250–1,500.


Effort is in **worker-days** (one agent or person working one day). Calendar time assumes 3–5 parallel agents and Jason reviewing 2–3 times a week.

### Phase 0: Style lock spike (4 days)

**Goal:** prove the art pipeline and engine before betting the project.
- Phaser 4 test scene on `rwb-2`: one lit Stage 1 slice (3 parallax layers + floor + 3 lights + snow).
- Riley golden sheet + **roundhouse (8–10 frames) + idle (6) + walk (8)** through the full pipeline.
- One Trolloc grunt: idle, walk, hurt ×2, knockdown.
- Fireball as a moving light.
- **Demo:** a 15-second capture next to 1.2's same moment.
- **Gate:** Jason says it looks like a different game. ≥ 70% of frames pass QA within 2 tries. 60 fps on iPad. If AI frame consistency fails, fall back to Route C (3D proxies) or a hybrid where Riley is frame-by-frame and enemies use part-swap puppets.

| Work | Worker | Effort |
|---|---|---|
| Phaser 4 skeleton, lights, parallax, input | Codex | 2 |
| Art pipeline scripts v1 | Cursor agent | 2 |
| Golden sheets + frames | ChatGPT images via Codex; Grok Imagine motion refs | 2 |
| Orchestration, captures, perf | Box | 1 |

### Phase 1: **Vertical slice, Stage 1 Emond's Field (3 weeks)**

**Contents:** Riley full core kit (about 20 animations, about 150 frames), Trolloc grunt / spear / hound with full reactions, Trolloc Chieftain with 3 phases, a 6-layer lit night village with snow, burning cottages, breakables, a door-smash set piece, the Fade carrying Twinkle Toes across the background, the opening hero video (Grok Imagine), in-engine KO cinematic, the Stage 1 music with layers, the full sampled SFX set, the new HUD/fonts/touch UI, and the Dojo prologue.

**Measurable wow bar (all must pass):**
1. **Blind side-by-side:** Jason and Riley play 1.2 Stage 1 and 2.0 Stage 1 without labels and rate "feels like a modern console game" from 1 to 10. Target **≥ 8, and ≥ +4 over 1.2.**
2. **Freeze-frame test:** 10 random mid-fight pauses. Each must look like key art: lit fighters, no debug-looking shapes, no tutorial text, consistent style. Target **9/10.**
3. **Animation density:** Riley **≥ 150 unique frames**; every attack ≥ 5 frames including anticipation and recovery; each enemy ≥ 40 frames with 3 hurt types + knockdown + getup.
4. **Hit feel:** hit-stop ≥ 4 frames light and ≥ 9 heavy; every hit has ≥ 3 SFX layers; zero full-screen flashes outside supers.
5. **Light:** ≥ 4 dynamic lights per combat zone; the fireball visibly lights the fighters and the snow.
6. **Combat depth:** ≥ 12 distinct player actions; the bot script lands a 20+ hit combo.
7. **Guardrail:** 60 fps (p95 frame ≤ 16.7 ms) on Jason's iPad and desktop; ≤ 25 MB downloaded before the first fight; cold load ≤ 4 s on home Wi-Fi.
8. **Likeness:** Riley says "that's me."

| Work | Worker | Effort |
|---|---|---|
| Combat system (chain, branches, juggle, grabs, parry, buffer) | Codex | 6 |
| Enemy AI tokens + 3 enemy roles + Chieftain | Cursor agent (Grok 4.7) | 5 |
| Riley + enemy + boss frames (about 400 frames) | ChatGPT images + Grok/Gemini motion refs, via Codex | 8 |
| Stage art (6 layers, props, breakables, lights.json) | ChatGPT + Gemini images | 3 |
| VFX strips + filters + particles | Codex + ChatGPT images | 3 |
| UI, fonts, touch, Dojo | Cursor agent | 3 |
| Audio (stage track layers, SFX library, mixer) | Cursor agent + Suno | 3 |
| Opening video (about 30 s) | ChatGPT keys + Grok Imagine, ffmpeg on box | 2 |
| New gates (perf, bot completion, load budget, frame ledger) | Box + Cursor agent | 2 |
| Reviews, blind test | Jason + Riley | about 4 h total |
| **Total** | | **about 35 worker-days ≈ 3 calendar weeks** |

### Phase 2: Depth and co-op (2 weeks, about 22 worker-days)

Loial as P2 (frames + kit), CPU partner, team attacks, Taint/Saidin economy, full weave set, Survival mode prototype, gamepad support polish. **Demo:** Jason and Riley clear Stage 1 together on the couch. **Wow bar:** both want to replay it; Survival round ≥ 10 minutes without repetition complaints.

### Phase 3: Stages 2–3 (3 weeks, about 35 worker-days)

Caemlyn road and Shadar Logoth: 4 new enemy types, Myrddraal and Draghkar bosses, Mashadar fog shader, the second hero video (Twinkle Toes taken; implied, not shown). **Gate:** each new stage passes the freeze-frame test and the 60 fps guardrail on Stage 3.

### Phase 4: Stages 4–5 and finale (3 weeks, about 38 worker-days)

Stone of Tear and Black Tower: Be'lal with the Callandor stance swap, Taim with the Saidin clash, Turned Asha'man, Gray Man, Gholam, hero videos 3 and 4. **Gate:** full campaign bot run, and 60 fps on Stages 1, 3 and 5.

### Phase 5: Modes, unlocks, polish, ship 2.0 (2 weeks, about 20 worker-days)

Twinkle Toes playable, Arcade, Boss Rush, Dojo challenges, costumes including "1.0 Classic", gallery, music player, accessibility (remapping, hold-to-combo, reduced flashes, captions), device QA matrix (iPad, iPhone, Android, Windows/Mac browsers), then switch GitHub Pages to 2.0 with Jason's OK.

**Overall:** about 13–14 calendar weeks and about 155 worker-days, with the vertical slice playable at about week 3.5.

### 10.1 Testing philosophy for 2.0

- **Dropped:** pixel-hash locks on art. They freeze art by design.
- **Kept and rebuilt:** perf gate (p95 frame time per stage, per device tier), campaign completion bot, zero-console-errors, load-size budget, save compatibility.
- **New:** frame ledger (counts per character, QA pass rate), contact-sheet review pages, and a per-milestone "wow review" capture: the same 30-second scripted fight rendered for 1.2 and 2.0 side by side.

---

## 11. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI frame consistency across 200+ frames (face, glasses, coat drift) | High | High | Golden sheets, grid generation, palette lock, registration, vision-judge auto-regenerate; Phase 0 gate; fall back to 3D-proxy guides or hybrid puppets for fodder |
| Likeness: Riley drawn too young, or not like Riley | Medium | High | Proportion lock, Riley approves the golden sheet, likeness check in QA |
| Video model drift or refusals (children in peril, violence) | Medium | Medium | Imply abductions; keep video to 4 hero scenes; in-engine cinematics as fallback; Gemini Omni as second source |
| Plan quotas (ChatGPT Pro images, SuperGrok video, Gemini) | Medium | Medium | Grid batching; frame ledger tracks spend; spread across tools; no new paid services |
| iOS Safari memory / WebGL context loss | Medium | High | Per-stage atlases, KTX2, half-res phone tier, Phaser 4 context restore, memory soak test |
| Phaser 4 is young (v4.0 Apr 2026) | Low–Med | Medium | Pin a version; Phaser's agent skill files; keep engine-agnostic gameplay modules |
| Scope creep | High | High | Vertical slice first; each phase has a hard gate; content lists frozen per phase |
| Jason's review bandwidth | Medium | Medium | 5-minute contact-sheet reviews, batched 2–3× a week; Riley as playtester |
| Losing what works in 1.2 | Low | Medium | 1.2 stays live until 2.0 Stage 1 wins the blind test |

---

## 12. Decisions for Jason (to start Phase 0)

1. **Approve the rebuild on Phaser 4 + frame-by-frame painted animation** (vs. staying on canvas).
2. **Approve the vertical slice scope** (Stage 1 only, about 3.5 weeks including the spike) and the wow bar in §10.
3. **Hosting during development:** branch previews via raw.githack (default) or a new repo with its own Pages site.
4. **Co-op cast:** Loial as story P2 and Twinkle Toes as an unlock (recommended), or Twinkle Toes as story P2.
5. **Music:** new Suno tracks per stage if the plan allows, or re-arrangements of the existing theme.

---

## Appendix A: Diagnosis captures (`/workspace/rwb-2/plan/shots/`)

| File | Shows |
|---|---|
| `best-1-stage3-midfight-annotated.png` | ⭐ Clutter: touch overlay on desktop, 3 text layers, identical unlit cutouts |
| `best-2-rig-poses-annotated.png` | ⭐ Puppet rigs: idle = walk = attack = hurt; props bend like rubber |
| `best-3-kick-chain-annotated.png` | ⭐ Kick chain: 2 painted frames in 1 s; tiny hit-stop; full-screen wash |
| `s1…s5-midfight.png` | Mid-fight in each stage (desktop mode, 1280×720) |
| `s1…s5-impact.png`, `*-impact-zoom3x.png` | Impact moments and 3× crops |
| `s1-heavyhit-flash.png`, `s4-heavyhit-flash.png` | Full-screen flash on heavy hits |
| `s1…s5-boss.png` | Boss telegraphs: text callouts + outline rectangles |
| `riley-all-18-frames.png`, `riley-frame-board.png` | Riley's entire painted kit |
| `rig-pose-board.png` | Unannotated rig board |
| `cutscene-opening.png`, `00-title.png`, `phone-landscape-s3.png` | Presentation and phone layout |
| `anim-strip-kick-chain.png/.json`, `metrics.json` | Raw strip and capture metrics |

**Method:** headless Chromium (Playwright) against the `rwb-1-2-joins` build, touch input disabled and desktop mode forced (the overlay still renders because the desktop draws it by design). The player was kept alive for captures, and the strip was sampled every 33 ms. Capture scripts: `/workspace/rwb-2/plan/tools/capture.cjs` and `strip.cjs`. Headless frame timing is not representative of devices, so this plan makes no fps claims from these captures.

## Appendix B: Sources checked (Oct 2026)

- Phaser 4.0 release and renderer: https://github.com/phaserjs/phaser/releases/tag/v4.0.0 · https://phaser.io/news/2026/04/phaser-4-renderer-faster-cleaner-and-built-for-modern-games
- Phaser 4 lighting and normal maps: https://phaser.io/news/2026/05/phaser-4-dynamic-lighting
- PixiJS v8.20: https://github.com/pixijs/pixijs/releases/tag/v8.20.0
- Grok Imagine Video 1.5 (1–15 s, 1080p, up to 7 references at 720p, extend): https://x.ai/news/grok-imagine-video-1-5-references
- Gemini Omni replacing Veo in the Gemini app (10 s, up to 5 photo references, 18+): https://gemini.google/us/overview/video-generation/ · https://support.google.com/gemini/answer/16126339
