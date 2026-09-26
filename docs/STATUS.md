# Riley Wheel Brawl — Implementation Status

## DONE (verified)

- **Stage 1 is playable from the title, through both reels, into Emond's Field, the Chieftain, and the clear card.** A headless Chrome session drove it with the keyboard. Skipping the last caption of a reel used to throw in `Reel.draw` (the index moved past the last line while the fade was still showing that reel) and killed the frame loop, so the stage never actually started. That crash is fixed, and the same session reached gameplay.
- **Riley reads as a kid Asha'man.** Short dark hair with a side part and tufts, thin blue wire glasses, a black high-collared coat with buttons, belt, sword pin, and dragon pin, dark trousers, and boots. He is about 70px tall with a large head. Idle, walk, and the kick poses were checked on the canvas, not only in the pose table. The walk cycle still has four distinct poses (the check asserts this). A small plant offset reduces foot slide; it is not full foot-lock IK.
- **Combat uses spatial hitboxes.** The three-hit chain, flying kick, down-plus-kick 360, fireball, throw, enemy blows, boss moves, shockwave, and stomp go through `RWB.collide`. `node tools/check.cjs` builds a target and checks that each required player move damages it. An attack press during a move is latched, so the chain comes out without waiting for a tiny end window, and a press during hit-stop is kept until the freeze ends. Getting hit cancels the current attack instead of leaving a stuck move timer.
- **Enemy damage comes from attack hitboxes.** Axe, hound-snout, and spear Trollocs approach, hold a lane offset, telegraph on the ground, attack, step back, then recover. At most two attack at once. With no living attackers, Riley takes no damage for 30 seconds (the check). Horn Charge keeps its facing for the whole rush and its hitbox is low enough to jump. Ground Stomp and the axe shockwave still require a jump.
- **The Trolloc Chieftain dies for real and uses three different attacks.** Axe Crash, Horn Charge, and Ground Stomp have different tells, shapes, and timing. An attack is recorded only when its hitbox is active. The intro holds him unhittable until the name card is done. The ten-seed soak requires all three attacks on every seed.
- **Saidin, taint, angreal, Moiraine's heal, and Loial behave as wired.** Hits fill the meter. Balefire is invulnerable, hit-stops, ducks audio, draws the beam and strikes, says the line once, clears normal enemies, and chips the boss. A full meter past the grace period warns, vignettes, and chips HP but never below 1. Loial stays spent across restart and Continue (the check). One angreal can drop per stage.
- **Emond's Field is a procedural 3,000px lane** with sky, mountains, village and the Winespring Inn, fences, a cart, bonfires, snowy mud, footprints, and falling snow. Two breakable props can drop pickups.
- **Flow for what is built:** title, opening reel, Stage 1 intro, play, clear reel, "TO BE CONTINUED" card, Game Over with a 9-second Continue, pause, and a checkpoint for level, wave, score, meter, lives, and Loial. Continue costs 500 score, restores 3 lives and full HP, and keeps the wave and Loial state. The check covers that resume.
- **HUD and audio.** HP (including the colorblind color), saidin/taint, angreal time, Loial READY/SPENT, score, lives, wave, and the boss bar. Big HUD enlarges both panels without pushing the right panel off the 640px canvas. Combat cues are separate synths, not one shared blip.
- **Empty art manifest, zero image requests.** The check still asserts this. Presentation is procedural.

Verification: `node tools/check.cjs` and `node tools/soak.cjs` both exit 0. The soak rejects a missed clear, zero player damage, identical seeds, or a Chieftain who used fewer than three attacks. Latest soak, with the harness topping HP up under 28 and giving 99 lives:

```
SEED | CLEARED | SECONDS | DAMAGE | HITS | DEATHS | PICKUPS | MOVES
   1 | YES     |    86.2 |    262 |   14 |      0 |       0 | combo1,combo2,combo3,fireball,jump,spin,super
   2 | YES     |    79.7 |    188 |   10 |      0 |       1 | combo1,combo2,combo3,fireball,jump,spin,super
   3 | YES     |    87.6 |    279 |   15 |      0 |       0 | combo1,combo2,combo3,fireball,jump,spin,super
   4 | YES     |    76.1 |    183 |   10 |      0 |       1 | combo1,combo2,combo3,fireball,jump,spin,super
   5 | YES     |    85.7 |    223 |   12 |      0 |       1 | combo1,combo2,combo3,fireball,jump,spin,super
   6 | YES     |    82.3 |    228 |   12 |      0 |       1 | combo1,combo2,combo3,fireball,jump,spin,super
   7 | YES     |   132.2 |    621 |   36 |      0 |       0 | combo1,combo2,combo3,fireball,jump,super
   8 | YES     |    93.2 |    291 |   16 |      0 |       1 | combo1,combo2,combo3,fireball,jump,spin,super
   9 | YES     |    86.2 |    204 |   11 |      0 |       0 | combo1,combo2,combo3,fireball,jump,spin,super
  10 | YES     |    95.9 |    256 |   14 |      0 |       0 | combo1,combo2,combo3,fireball,jump,spin,super
MEDIAN DAMAGE: 242
```

Every seed's Chieftain used Axe Crash, Horn Charge, and Ground Stomp. The same masher with 3 lives and no HP top-up cleared 8 of 10 seeds and game-overed on seeds 7 and 10, always on the boss, after 1–3 deaths. The harness deaths column stays 0 because of that top-up, not because hits miss.

Cache stamp is `?v=20260926-g2`.

## NOT DONE / PARTIAL

- **Stages 2–5 are not built.** No encounter scripts, enemies, bosses, or cutscenes. The clear card says Stage 2 is next.
- **The Taim finale is not built.**
- **Callandor is not built.**
- **No painted sprites and no recorded voices.** Procedural art and synth cues only.
- **Stage 1 is still mash-friendly.** Light hits hold a Trolloc in place for the combo, so a player who never dodges still wins most seeds and only sometimes game-overs on the Chieftain. The fastest harness clear is 76 seconds. Grab/throw almost never shows up in the soak because the bot stops walking once it is in kick range.
- **Walk feet are only partly planted.** The contact foot is nudged by at most 7px. It is better than a free slide and it is not a locked plant.
- **Touch, gamepad, and a long human playtest are not covered here.** The browser pass used a keyboard.
