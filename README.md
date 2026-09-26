# Riley Wheel Brawl

**Riley Wheel Brawl** is a kid-friendly, side-scrolling fantasy beat-em-up inspired by *The Wheel of Time*. Riley, a young Asha'man trained in Tae Kwon Do, follows Moiraine across five dangerous locations to rescue his eight-year-old sister **Twinkle Toes** from the Forsaken and Mazrim Taim.

The adventure begins on Winternight in Emond's Field, then continues through Caemlyn, Shadar Logoth, the Stone of Tear, and the Black Tower. At the Stone, Twinkle Toes reveals that she can channel lightning. She returns in the finale to help Riley defeat Taim with lightning and balefire.

The game uses HTML5 Canvas and vanilla JavaScript, with no build step or runtime dependencies. It supports keyboard, gamepad, mouse, and touch, and is designed to run from the repository root or beneath `/riley-wheel-brawl/` on GitHub Pages.

## Play

### GitHub Pages

Enable GitHub Pages for the repository using **Settings → Pages → Deploy from a branch**, select the publishing branch, and choose `/ (root)`. Open the published `/riley-wheel-brawl/` URL when deployment completes.

### Local server

The game loads optional art through browser requests, so serve the repository over HTTP rather than opening `index.html` directly:

```bash
cd riley-wheel-brawl
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

To test the same subdirectory layout used by GitHub Pages, start the server from the repository's parent directory and open <http://localhost:8000/riley-wheel-brawl/>.

## Story and stages

1. **Emond's Field — Winter Night:** Trollocs attack during Winternight while Riley learns movement, Tae Kwon Do, channeling, and ally calls.
2. **Caemlyn Streets:** Riley crosses the crowded city and confronts a Myrddraal.
3. **Shadar Logoth:** He avoids the dangerous Mashadar fog and battles a Draghkar.
4. **Stone of Tear:** Riley faces a Forsaken, claims Callandor, and discovers Twinkle Toes can channel lightning.
5. **Black Tower:** Turned Asha'man guard Taim, and the siblings unite their powers for the final rescue.

## Fantasy controls

Two keyboard layouts work at once: the movement cluster around WASD and the arcade action cluster around J/K/L. Inputs can be remapped from **Controls**; live hints update to show the selected bindings.

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrow keys / WASD | Left stick or d-pad | Virtual stick |
| Tae Kwon Do attack | `E`, `J`, or `Z` | **X** | **ATK** |
| Jump / aerial attack | `Space`, `K`, or `X` | **A** | **JMP** |
| Channel a fireball | `Q`, `L`, or `C` | **Y** | **FIRE** |
| Call Loial | `R`, `I`, or `V` | **RB** or **LB** | **CALL** |
| Lightning and balefire super | `F` or `B` | **B** | **POWER** |
| Pause | `Esc`, `P`, or `Enter` | **Start** or **Back** | **II** |
| Mute | `M` | Pause menu | Pause menu |
| Fullscreen | Backslash | Pause menu | Pause menu |

Riley's grounded combo uses a front kick, roundhouse kick, and spinning back kick. His special launches a fireball in the direction he faces. Power pickups fill the **saidin** meter; once full, the super calls down lightning and releases balefire. Holding full saidin too long allows the taint to build, so watch its warning and spend the meter in time.

Moiraine's magic restores health. Angreal temporarily create a spread of three larger fireballs. Loial can charge through enemies once per stage, and claiming Callandor permanently strengthens Riley's super for the rest of the run.

## Display and accessibility

The pause and settings menus provide:

- Auto, Sharp, and Classic display modes;
- adjustable sound and music;
- normal or large HUD sizing;
- colorblind-safe health indicators;
- Full, Lite, or automatic effects quality;
- reduced screen shake;
- adjustable touch-control visibility;
- keyboard and gamepad remapping;
- fullscreen and mute controls.

The game preserves progress at wave checkpoints so **Continue** can restore the current stage and run upgrades after a reload.

## Project layout

```text
index.html         Browser entry point and script order
css/style.css      Fullscreen canvas shell
js/                Canvas runtime, scenes, input, combat, audio, and content
assets/art/        Optional painted character and environment art
assets/cutscenes/  Optional story stills
assets/fonts/      Bundled arcade font
docs/              Design brief, task plan, art list, and voice lines
tools/             Art preparation and regression utilities
```

All runtime URLs are relative so the project works below `/riley-wheel-brawl/`. Optional painted assets have procedural fallbacks, allowing play to continue when an image is unavailable.
