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

The ground chain is front kick, roundhouse, then spinning back kick. FIRE has a
cooldown and no health cost. A full SAIDIN meter enables Balefire; holding it
past the grace period begins the warned, nonlethal taint effect. Menus support
keyboard, gamepad, mouse, and touch, and bindings can be remapped.

## Verification

`node tools/check.cjs` checks story skips, accessibility effects, airborne and
finale rules, caption fidelity, and the zero-request art fallback. Run
`node tools/soak.cjs` for the 12-seed combat tuning report.
