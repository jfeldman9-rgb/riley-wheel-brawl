# Waygate Gauntlet

A self-contained, silent bonus level for **Riley Wheel Brawl**. It uses Phaser 3 from jsDelivr and carries its own character atlases and animation metadata. The atlases are inlined as data URLs in `assets/atlas-inline.js`, so the level does not fetch image files (those 403 on some static hosts and stall the loading screen). If a texture fails, the fight still reaches the title using placeholder shapes. No files in the parent game are changed.

## Run

Serve the repository root so `boot-input.js` can import `../src/input.js` (the same module Stages 1–3 use). From the repo root:

```
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/bonus-waygate/index.html`. Internet access is needed for the Phaser CDN script. Game art is inlined in this folder. Opening the file directly will not load the input module.

## Controls

Same bindings as the main game (`src/input.js`). There is no dodge roll and R does not restart.

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | WASD / arrows | Left stick and d-pad | Stick |
| Run | Shift, or double-tap a direction | RB | Push the stick far |
| Attack | E / J / Z | X | KICK |
| Jump | Space / K / X | A | JUMP |
| Fireball | Q / L / C | Y | FIRE |
| Balefire | F / B (full saidin) | B | BALE |
| Call Loial | R / V / U / I | LB | CALL |
| Pause | Esc / P | | II |
| Start | Enter | Start | |

Loial is not in this level. CALL does what the stages do when Loial is unavailable: nothing, and it does not crash. Title starts on Enter or attack (TAP TO START on a touch device). Pause resumes on P, Esc, Enter, Start, or II. Game over and the clear screen continue on attack (TAP KICK).

Tap attack with a short rhythm for Riley's three-hit combo. The third hit is a launcher. If the nearest enemy is behind Riley, the swing turns and hits them. A hit grants about 0.6 seconds of invulnerability. Balefire spends the full saidin meter and grants 1.5 seconds, the same as the stages. The fireball costs 34 saidin.

A red flash and marked floor position precede **every Gray Man strike**; move clear of the mark or jump. He still hits for the same damage, then recovers for a second — that window is when hits land, and they hit harder then. There is no roll. Trollocs telegraph their swings with an amber floor ring and warning mark. Only one Trolloc holds an attack token in Wave 1 and two in later waves; those are the ones that step in. Everyone else holds a ring on both flanks, and bodies are pushed apart so they cannot stack into one sprite. Trolloc health bars replace floating health text. The falling bridge is a timing challenge: hold run and jump to clear every gap with landing room (that arc stays the one the bridge was built for). Cracked planks drop if you wait on them, and passing the midpoint saves a checkpoint so a fall does not send you back to the start. Falling costs health but does not consume a life. Death respawns at the current wave, bridge, or arena checkpoint, and pausing freezes combat timers. The end screen shows **Trollocs killed**. Tap **Enter the Ways**, or press Enter or attack, to start.

## Test shortcuts

Append one of these query parameters to `index.html` when play-testing. They start a normal run directly at the named checkpoint; pause, restart and score handling stay enabled.

| URL ending | Starts at |
|---|---|
| `?skip=bridge` | Falling-bridge checkpoint (the entrance, not the mid-bridge mark) |
| `?skip=boss` | Gray Man arena |

## Plugging it in later

Keep this directory intact and link to `bonus-waygate/index.html` from the main game's bonus-level menu, or mount it as a separate route/iframe. It imports `../src/input.js` and does not modify that file. For deeper integration, port `WaygateScene` from `game.js` into the parent game's scene list and preserve its `WAYGATE_ASSET_META` frame metadata. Character art is loaded from the inlined atlas, not from image files.

## Art and audio

Riley and grunt Trolloc atlas pages are copied from the supplied public reference repository's `assets/chars/` folder and inlined so this folder does not fetch them. Controls come from [`src/input.js`](../src/input.js) on this branch. The Gray Man, Waygate environment, effects and UI are drawn in code as simple placeholders. There is no music, sound effect, video, or generated audio.
