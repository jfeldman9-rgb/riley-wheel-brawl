# Waygate Gauntlet

A self-contained, silent bonus level for **Riley Wheel Brawl**. It uses Phaser 3 from jsDelivr and carries its own character atlases and animation metadata. A small inline atlas fallback avoids browsers' local-file XHR restrictions when opening `index.html` directly; static hosting uses the bundled relative atlas files. No files in the parent game are changed.

## Run

Open `index.html` directly in a modern browser, or serve this folder as a static site (for example, place `bonus-waygate/` beside the parent game's `assets/` folder and publish it as its own GitHub Pages path). Internet access is needed for the Phaser CDN script; game art and code are local to this folder.

## Controls

| Action | Keyboard | iPad / touch |
|---|---|---|
| Move | Arrow keys or WASD | Direction pad |
| Attack | J | J · HIT |
| Jump | K | K · JUMP |
| Dodge / roll | Shift | ROLL |
| Special (spend saidin) | L | L · ONE POWER |
| Pause / resume | Esc or P | Pause button |
| Restart | R | Pause menu → Restart |

Tap **J, J, J** with a short rhythm for Riley's three-hit combo; the third hit launches a Trolloc. Each impact has a short hitstop, a white enemy flash and knockback; heavy launchers and One Power hits shake the screen. Riley automatically faces the nearest threat when starting an idle attack. **Shift / ROLL** is a brief invulnerable escape, and Riley also gets 0.6 seconds of invulnerability after a hit.

A red flash and marked floor position precede **every Gray Man strike**; move clear of the mark or jump. Trollocs telegraph their swings with an amber floor ring and warning mark. Only one Trolloc attacks during Wave 1 and no more than two hold an attack token in later waves; the rest maintain separated waiting/circling positions. Trolloc health bars replace floating health text. The bridge checkpoint can be retried indefinitely; falling costs health but does not consume a life. Death respawns at the current wave/arena checkpoint, and pausing freezes combat timers.

## Test shortcuts

Append one of these query parameters to `index.html` when play-testing. They start a normal run directly at the named checkpoint; pause, restart and score handling stay enabled.

| URL ending | Starts at |
|---|---|
| `?skip=bridge` | Falling-bridge checkpoint |
| `?skip=boss` | Gray Man arena |

## Plugging it in later

Keep this directory intact and link to `bonus-waygate/index.html` from the main game's bonus-level menu, or mount it as a separate route/iframe. Its Phaser scene, input, UI and assets are private to this folder; it does not import or alter the main game's modules. For deeper integration, port `WaygateScene` from `game.js` into the parent game's scene list and preserve its `WAYGATE_ASSET_META` frame metadata and `assets/atlases/` paths.

## Art and audio

Riley and grunt Trolloc atlas pages are copied from the supplied public reference repository's `assets/chars/` folder and reused locally so this folder works independently. The controls were matched against [`src/input.js` on `rwb-w2`](https://github.com/jfeldman9-rgb/riley-wheel-brawl/tree/rwb-w2); the [live parent game](https://jfeldman9-rgb.github.io/riley-wheel-brawl/) is unchanged. The Gray Man, Waygate environment, effects and UI are drawn in code as simple placeholders. There is no music, sound effect, video, or generated audio.
