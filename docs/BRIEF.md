# Riley Wheel Brawl — Design Brief

## Product

**Riley Wheel Brawl** is a kid-friendly, browser-based, side-scrolling beat-em-up inspired by *The Wheel of Time*. It is a complete thematic remake of the game currently in this repository, retaining its proven vanilla JavaScript/Canvas architecture and arcade feel while replacing its characters, story, combat fantasy, locations, art, words, and sounds.

The finished game must contain **no food, ship, or cruise references anywhere**: not in visible UI, dialogue, source identifiers, comments, storage keys, metadata, README copy, tooling, or filenames.

## Audience and tone

- Accessible to children and families: adventurous, funny, heroic, and never gory.
- Combat is energetic fantasy action. Enemies are knocked down, blasted away, or defeated without blood or graphic injury.
- Dialogue is short enough to read during an arcade game and clear enough for younger players.
- Knowledge of *The Wheel of Time* should add flavor but should not be required to understand the story.

## Hero

Riley is a muscular young Asha'man in his late teens or early twenties. He has short dark hair, thin blue-framed glasses, and a black Asha'man coat bearing sword-and-dragon pins. His silhouette, glasses, and pins must remain readable at gameplay size.

Riley fights with Tae Kwon Do. His grounded three-hit combo is:

1. front kick;
2. roundhouse kick;
3. spinning back kick.

The existing combo timing, hit-stop, attack buffering, launcher/juggle depth, grab/throw interactions, hit fairness, and input responsiveness remain intact, but all presentation and move names become appropriate to Riley. Jump attacks remain available.

Riley needs a genuine walk cycle rather than a pose toggle: planted and passing leg positions, alternating arm swing, modest body bob, stable foot contacts, and no visible foot sliding. Every enemy that walks needs the same minimum animation standard.

## Channeling and powers

### Fireball

Fireballs replace the old close-range freeze attack. Pressing the existing special input launches a visible projectile in Riley's facing direction. It damages enemies, produces fire hit effects, and uses fair collision and recovery timing. It must not inherit an unexplained HP cost from the replaced attack.

### Saidin meter

Power pickups fill a **saidin** meter. A full meter enables Riley's super. The HUD, help, tutorials, control labels, save/continue data, accessibility views, and debug helpers must all use saidin terminology.

### The taint

A full saidin meter is dangerous if hoarded. After a clear grace period, the taint builds visibly: the screen edges darken, the world develops an increasingly noticeable wobble, and Riley's HP is chipped at a fair, telegraphed rate. Spending the meter immediately clears the taint. The effect must honor Reduced Shake, remain readable in colorblind mode, pause with the game, and never damage Riley during cutscenes, menus, death, or victory.

### Super: lightning and balefire

Spending a full saidin meter triggers a dramatic, invulnerable screen-clear:

- lightning strikes across the battlefield;
- Riley fires a horizontal balefire beam;
- normal enemies are cleared;
- bosses take heavy, explicitly tuned damage rather than being skipped;
- Riley yells **“Balefire!”**

The sequence replaces the old super completely while preserving the underlying meter, input, camera punch, hit-stop, gamepad rumble, audio ducking, and boss-damage hooks. After Riley claims Callandor in Stage 4, the super is permanently stronger and visibly brighter for the rest of that run, including Continue data.

## Allies and pickups

### Moiraine

Moiraine guides Riley in cutscenes. All health pickups become Moiraine healing: a clearly magical blue-white token or effect, never an edible item. On collection she says **“Rise, Riley, Rise!”** and Riley recovers HP.

### Angreal

Angreal pickups temporarily empower fireballs. During the burst, Riley launches three larger fireballs in a spread. The HUD shows the remaining duration clearly; picking up another angreal refreshes, rather than wastefully stacking, the effect.

### Loial

Loial can be called **once per stage**. The call uses the existing tool action and its BOX/ATK mouse hit-testing path: the sticky touch control may be labeled **CALL**, but its hit region and pointer behavior must remain compatible. Loial charges across the screen with his axe, knocking down and damaging enemies. A clear HUD marker shows whether the call is ready or spent, and the charge cannot be duplicated by pausing or continuing.

## Story

Kenzie, Riley's approximately eight-year-old sister, is known as **Twinkle Toes**. She is a competitive dancer, loves blue, and has been captured by the Forsaken and Mazrim Taim. Riley follows Moiraine's guidance across five locations to rescue her.

At the Stone of Tear, Twinkle Toes reveals that she can channel lightning. Her reveal is brave, surprising, and age-appropriate. She returns in the finale to help Riley defeat Taim with a joint lightning-and-balefire finish.

### Five stages

1. **Emond's Field — Winter Night.** Tutorial stage during the attack on Winternight. Trollocs teach movement, Tae Kwon Do attacks, fireballs, Loial's call, pickups, saidin, and the super. The stage must be playable from intro through clear before later stages are built.
2. **Caemlyn Streets.** Denser city encounters culminate in a Myrddraal/Fade mini-boss with clear, fair attack tells.
3. **Shadar Logoth.** Mashadar fog is a lane and timing hazard. A Draghkar is the stage boss.
4. **Stone of Tear.** Riley faces a Forsaken boss, claims Callandor, permanently upgrades the super, and witnesses Twinkle Toes channel lightning.
5. **Black Tower.** Riley battles turned Asha'man, reaches Taim on the roof, and wins through a joint finish with Twinkle Toes.

## Cutscenes and voice

- Use the existing cinematic reel system for a new opening introduction and one story sequence associated with each stage.
- Painted stills are optional at runtime. Each scene must have a composed procedural placeholder so the entire story remains understandable if its image is absent.
- Dialogue uses the exact short lines cataloged in [`VOICE_LINES.md`](VOICE_LINES.md).
- Cutscenes remain skippable and preserve the existing lazy loading, typing, speaker medallions, cards, transitions, camera moves, effects, and retry behavior.

## Visual direction

- Target or exceed the visual quality of the existing Lido stage during a mid-fight side-by-side comparison: layered painted depth, integrated lighting, grounded shadows, readable foreground combat, rich but controlled effects, and a cohesive HUD.
- Favor dramatic fantasy realism filtered through a colorful arcade game. Avoid horror imagery even in Shadar Logoth and the Black Tower.
- Riley and all walking enemies require real walk cycles with stepping legs, arm swing, body bob, planted feet, and no foot sliding.
- Stage backdrops and story stills are listed in [`ART_LIST.md`](ART_LIST.md), with procedural placeholders required for every file.
- Effects Lite and Classic modes may simplify particles and post-processing but must preserve gameplay tells.

## Required technical inheritance

The remake remains a no-build, GitHub Pages-ready application made from relative-path HTML, CSS, JavaScript, fonts, and images. It must run correctly below `/riley-wheel-brawl/` rather than assuming the domain root.

Preserve every existing system below throughout the remake:

- BOX/ATK mouse hit-testing and clickable menu rows;
- sticky, transparent touch controls for the entire stage;
- the dynamic **PICK UP** control label;
- keyboard, gamepad, touch input, remapping, and live binding hints;
- device-pixel-ratio rendering plus Auto, Sharp, and Classic 640×360 modes;
- pause, fullscreen, mute, persistent settings, accessibility options, and Continue checkpoints;
- the gameplay upgrades already present: fair hitboxes, invulnerability, hit-stop, attack buffering, launcher/juggles, readable boss telegraphs, AI director, pooled effects, adaptive Lite mode, music ducking, and gamepad rumble;
- the shared cutscene/story-beat system;
- optional painted art with procedural fallback;
- one retry for failed painted images and the conspicuous red load-failure banner for critical art;
- cache stamps (`?v=`) on **every** script, image, and audio URL;
- relative URLs everywhere.

Although the current game synthesizes audio, any future recorded voice or music file must be optional, cache-stamped, retried where appropriate, and have a non-file fallback so a missing asset never blocks play.

## Definition of done

The remake is complete when:

1. all five stages can be completed in order on keyboard, gamepad, and touch;
2. Riley, every walking enemy, every boss, hazards, allies, powers, upgrades, and final joint finish behave as described;
3. opening and stage story sequences communicate the complete rescue plot with kid-friendly text;
4. painted assets meet or exceed the existing Lido mid-fight quality bar, while deleting any one image still yields an obvious, playable placeholder;
5. Auto/Sharp/Classic, accessibility options, persistence, Continue, remapping, pointer hit-testing, and sticky controls pass regression checks;
6. every script, image, and audio request is relative and cache-stamped;
7. a case-insensitive repository-wide audit finds no remaining food, ship, cruise, old-character, old-stage, or old-super references outside Git history.
