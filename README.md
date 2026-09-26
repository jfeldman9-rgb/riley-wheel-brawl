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
| Move | WASD / arrows | D-pad / left stick |
| Kick combo | E / J / Z | X |
| Jump / jump kick | Space / K / X, then Kick | A, then X |
| Spinning kick | Third grounded Kick in the three-hit combo | Third grounded X |
| Fireball (**FIRE**) | Q / L / C | Y |
| Call Loial (**LOIAL**, once per stage) | R / I / V / U | LB / RB |
| Spend full meter (**SAIDIN**) | F / B | B |
| Pause | Escape / P | Back |

Kick three times for front, roundhouse, then spinning back kick. FIRE has a
cooldown but no health cost. A full SAIDIN meter enables Balefire; waiting too
long after it fills starts the warned taint effect. Menus support keyboard,
gamepad, mouse, and touch. Controls can be remapped in the Controls panel.

## Verification

`node tools/check.cjs` checks story skips, accessibility effects, airborne and
finale rules, caption fidelity, and the zero-request art fallback. Run
`node tools/soak.cjs` for the 12-seed combat tuning report.
