# Riley Wheel Brawl

A kid-friendly, five-stage fantasy beat-'em-up. Riley is a young Asha'man who
uses Tae Kwon Do and fireballs to rescue his sister, Twinkle Toes, from Mazrim
Taim. The game is plain HTML5 Canvas and JavaScript with no build step.

## Play locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move / change lane | WASD / arrows | D-pad / left stick |
| Three-hit kick chain | E / J / Z | X |
| Jump / flying kick | Space / K / X, then Kick | A, then X |
| 360 spinning kick | Hold Down and press Kick, or press Jump + Kick together | Down + X, or A + X |
| Fireball (**FIRE**) | Q / L / C | Y |
| Grab | Walk into a hurt or knocked-back normal Trolloc | Walk into the target |
| Knee a grabbed target | Kick, up to twice | X, up to twice |
| Throw a grabbed target | Press away from the target | Press away from the target |
| Call Loial (**LOIAL**, once per stage) | R / I / V / U | LB / RB |
| Spend full meter (**SAIDIN**) | F / B | B |
| Pause | Escape / P | Back |
| Music on/off | M | Options → MUSIC |
| Mute all sound | N | Options → SOUND |

The ground chain is front kick, roundhouse, then spinning back kick. FIRE has a
cooldown and no health cost. A full SAIDIN meter enables Balefire; holding it
past the grace period begins the warned, nonlethal taint effect. Menus support
keyboard, gamepad, mouse, and touch, and bindings can be remapped.

## Difficulty

Choose NORMAL or HARD in Options before starting a new run. HARD coordinates enemy flanks and attack timing with identical HP. Continue and Restart keep the difficulty saved with that run; old saves use Normal.

## Campaign

Five stages with distinct enemy waves and bosses. Change lanes to avoid Mashadar;
use jumping kicks or fireballs against the airborne Draghkar. Claim Callandor after
Be'lal to double the super's boss damage. On the Black Tower roof, weaken Taim to
free Twinkle Toes, then spend full saidin with POWER for the joint finish. Taim
keeps fighting until both beams hit.

## Verification

`node tools/check.cjs` covers Stage 1 combat plus all-stage progression, safe Reel
skipping, boss rules, hazards, Callandor persistence, the joint finish, taint, and
art/cache contracts. `node tools/soak.cjs` runs 10 seeds on each of five stages and
requires every boss attack on every seed. Use `--stage=3` for one stage.

The default soak keeps the inherited HP top-up below 28 HP and 99 lives; it is a
completion/attack-coverage test. `--natural` disables those assists and reports
3-life masher balance. See `docs/STATUS.md` for both sets of measured results.

## Audio

Jason's theme loops on the title, story cards and stages (starts on the first key, click or tap); M toggles it. Riley, Twinkle Toes, Moiraine, Loial, Be'lal, the other villains and the narrator speak. The new cast uses user-approved original stock voices generated locally with free Kokoro; no real-person voice cloning. Family recordings can still replace the stable filenames listed in `assets/audio/voice/RECORDING_LIST.md`. See `docs/AUDIO.md`. `node tools/audio-check.cjs` checks it in a browser.

All supplied painted assets are wired through `js/artmanifest.js`.
`CHROMIUM_PATH=/path/to/chromium node tools/review.cjs` regenerates the headless
review screenshots and image-loading audit (requires Playwright). See
`docs/review/README.md` for evidence, reproduction, and visual limitations.
No build step or new runtime dependency is required.
