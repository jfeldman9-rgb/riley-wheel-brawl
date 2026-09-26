# Riley Wheel Brawl — Implementation Status

## DONE (verified)

- **Stage 1 is playable from its opening reel through the Chieftain and clear card.** The automated ten-seed run drives all six encounters and requires every seed to clear.
- **Riley is a procedural, child-proportioned canvas actor.** His pose table includes breathing, four-step walking, rise/fall, every kick, hurt, knockdown, lying, get-up, channeling, and victory poses. The deterministic check verifies four distinct walk poses.
- **Combat uses spatial collision.** The three-hit Tae Kwon Do chain, flying kick, down-plus-kick 360 move, fireball, knee/grab/throw, enemy blows, boss moves, shockwave, and stomp use `RWB.collide` hitboxes. The check creates a target and verifies every required player move damages it.
- **Enemy pressure is real rather than scheduled player damage.** Axe, hound-snout, and spear Trollocs approach, align to a lane, telegraph, attack, recover, react, fall, rise, and die. The director limits simultaneous attackers to two. A 30-second no-attacker check verifies Riley loses no HP.
- **The Trolloc Chieftain is a distinct boss with a true death.** Axe Crash, Horn Charge, and Ground Stomp have different tells, geometry, timing, and avoidance. An attack is recorded only when active. The soak requires all three on every seed and never revives the boss.
- **Saidin systems work.** Hits fill the meter; Balefire grants temporary invulnerability, hit-stop, a super camera impact, beam/lightning presentation, one voice cue, normal-enemy clearing, and heavy non-instant boss damage. Holding a full meter produces a warning, vignette, and nonlethal HP chips after a grace period.
- **Pickups and ally systems work.** Saidin sparks, Moiraine healing, the ten-second angreal enhancement, enemy drops, two breakable props, and the once-per-stage Loial charge are active. Automated checks verify Loial stays spent through restart and Continue.
- **Emond's Field has a 3,000-pixel procedural environment.** It includes multilayer parallax, moon and stars, mountain silhouettes, lit village buildings, the Winespring Inn, bare trees, fences, a cart, flickering fires, snowy mud, footprints, lighting, and falling snow.
- **Flow and persistence work for built content.** Title, opening reel, Stage 1 intro, play, clear reel, continuation card, Game Over, nine-second Continue, pause menu, checkpoint validation, lives, score, meter, wave, and Loial state are wired. The check validates Continue state.
- **HUD and audio are active.** The HUD exposes HP, saidin/taint, angreal time, Loial status, score, lives, wave, and boss HP, including large-HUD and colorblind choices. Stage music and distinct synthesized combat cues are registered.
- **Fallback loading is verified.** The empty art manifest causes zero image requests. All executable presentation is procedural.

Verification commands are `node tools/check.cjs` and `node tools/soak.cjs`. Both must exit zero. The soak rejects uncleared seeds, zero player damage, identical seed outcomes, and any seed in which the Chieftain uses fewer than three distinct attacks.

## NOT DONE / PARTIAL

- **Stages 2–5 are placeholders and are not built.** Their environments, encounter scripts, enemies, bosses, cutscenes, and complete gameplay flow are future work.
- **The Taim finale is not built.** No final encounter or combined finishing sequence exists yet.
- **Callandor is not built.** Its acquisition, persistence, visual treatment, and power upgrade remain future work.
- **Optional painted assets and recorded voices are not bundled.** The game deliberately uses its procedural fallback and synthesized voice cue.
- **Stage 1 balancing remains open to playtest refinement.** The automated bot proves completion and mechanical coverage, but human testing across touch, keyboard, and multiple gamepads is still needed.
