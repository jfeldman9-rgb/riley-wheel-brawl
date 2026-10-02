# Riley Wheel Brawl 2.0: Stage 1 (Emond's Field) vertical slice

Branch: `rwb-2` (started from `rwb-2-spike`). `main` and `rwb-w2` were not touched; 1.2 is still live.
**Preview (code commit 861b6c32bfd7c72fe4dfacef57a5ddfe3b8cbfd3):** https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/861b6c32bfd7c72fe4dfacef57a5ddfe3b8cbfd3/index.html
Add `?demo=1` to watch the autopilot, or `?skip=boss` to start at the Chieftain.

Engine: Phaser 4.2.1 (WebGL2), ES modules, no build step. Code is in `src/`, art in `assets/`, docs and screenshots in `docs/stage1/`.

## Milestone 1: art batch (done)

All images came from ChatGPT image generation through Codex CLI (included quota, no paid API). No Grok stills, Seedance, Manus or Gemini were used.
No frame was faked: nothing blurred, mirrored, recolored, interpolated or invented. Every in-game frame is a slice of a generated sheet that was registered (scaled and baselined) and packed.

| Sheet | Frames used | Tries (kept) | Notes |
|---|---|---|---|
| Riley run | 8 | 3 (3rd) + re-roll 3 (2nd) | Frames 1–4 come from this sheet; frames 5–8 were re-rolled on Oct 2 (see Re-rolls). |
| Riley jump + air kick | crouch, rise, apex, fall, land + kick 3 | 3 (2nd) | |
| Riley back kick + cast | 4 + 4 | 2 (2nd) | Cast now has dedicated frames; the spike reused the jab. |
| Riley grab set | grab, hold, knee ×2, throw ×2, return to guard ×2 | not logged | Return to guard is the tail of `throw`. |
| Trolloc grunt chop (re-roll) | 6 + get-up 2 | 3 (2nd) | **The blade is rigid in every frame.** It no longer stretches like the spike's smear. |
| Spear Trolloc master + sheets | walk 4, thrust 4, hurt 2, knockdown 3, get-up 3 | master 2, sheets 3 + 3 | Goat-horned, long spear. |
| Hound Trolloc master + sheets | run 4, leap slash 4, reactions 8 | master 2, sheets not logged | Wolf-headed, hooked knives, fast flanker. |
| Trolloc Chieftain master + sheets | walk 4, overhead chop 4, sweep 2, horn charge 2, roar 1, lift 1, hurl 1, stunned 1, reactions | master 2, sheets not logged | Roar frame re-rolled on Oct 2 (see Re-rolls). |
| Backdrop batch 2 | village-green mid plate (oak, Winespring, burning wagon), second floor, cart, barrel, broken barrel (8 staves) | 1 job | The mid plate joins seamlessly with the spike plate. |

- Total generations: 23 logged for 9 of the sheets above, plus at least 1 per remaining job and 5 backdrop images. Roughly 35–40 in all; the exact count wasn't logged for every job.
- Contact sheets:
  - `docs/stage1/contact-riley-new.jpg`
  - `contact-grunt-chop.jpg`
  - `contact-spear.jpg`
  - `contact-hound.jpg`
  - `contact-chieftain.jpg`
- **Scale fix:** sheets came back at different body sizes. Riley is normalized by head width (about 66 px at the registration canvas): run ×0.904, back/cast ×0.87, grab set ×0.93, jump set ×1.03. The enemies are normalized per sheet to a target height.
- **Packing:**

  | Character | Frames | Scale |
  |---|---|---|
  | Riley | 72 | 0.85 |
  | Grunt | 23 | 0.75 |
  | Spear | 16 | 0.75 |
  | Hound | 16 | 0.8 |
  | Chieftain | 24 | 0.7 |

  Each atlas page has a half-resolution normal map. The character atlases total 7.5 MB on disk, about 185 MB of GPU memory estimated. That is fine for iPad and desktop but a watch item for older phones.

## Milestone 2: the playable slice (done)

**Flow:** title, narrator, then 3 fight zones with 2 waves each (grunts, spear, hounds; the camera locks per zone; GO arrow), then the Chieftain arena and the boss, a defeat sequence, and the stage-clear card. Game over offers a continue.

**Riley:**
- 3-hit combo, back kick (attack plus the opposite direction), run kick, jump and flying kick.
- Fireball cast, which costs saidin (34). Saidin refills when Riley lands hits.
- Grab: walk into a dazed or open foe, then knees and a throw. A thrown body knocks over other enemies.
- Hurt, knockdown and get-up; 3 lives with respawn invulnerability.

**Enemies:**
- Attack tokens, so at most N enemies swing at once. Slots on both sides of Riley; hounds flank.
- Juggles are capped at 3, and enemies can't be hit while they lie on the ground.

**Chieftain:**
- 360 HP with phase ticks at 66% and 33%.
- Super armor during his attacks, shown as a short warm tint flash.
- Chop and sweep. From phase 2: a horn charge that stuns him if he hits the arena wall, and a roar that calls 2 hounds. Phase 3: lifts and hurls a burning cart that leaves a fire patch.
- He can't be hit while floored, and gets up with 0.9 s of armor and an immediate attack, so he can't be stun-locked.

**Hit feel:** hit-stop by attack weight, trauma camera shake, directional sparks, an impact light flash, dust and snow puffs, a body-thump on landing, slow motion on the boss kill.

**Lighting:** normal-mapped sprites, a hero light on Riley, flickering fire lights from the burning houses and wagon, a moving fireball light, cart and fire-patch lights, embers and bloom.

**HUD:**
- Portrait, HP and saidin bars, lives, score.
- Name and bar for the last enemy hit.
- Boss bar with portrait and phase ticks (top centre).
- Combo counter, voice captions, perf readout.

**Audio:** carried over from 1.2: music track, procedural SFX, and 20 Stage 1 voice lines with captions (same licenses and provenance files).

**Touch:** stick plus KICK/JUMP/FIRE/pause, shown only when the device reports touch (the `touch` body class). Desktop shows no buttons. On touch devices, captions move to the top so the thumb controls don't cover them (`docs/stage1/touch-ipad.jpg`, emulated iPad).

**Demo playthrough (box, autopilot, normal damage):** the bot cleared the whole stage in about 3:20 and lost 1 life. Earlier runs found and fixed:
- enemies that wandered off-screen forever while entering;
- a boss stun-lock;
- boss state timers that never advanced, which froze the roar;
- a HUD race on the first load from the live preview (a caption fired before the HUD existed).

## Re-rolls (Oct 2, about 03:00–03:45 MST)

All three images came from ChatGPT image generation through Codex, with no frames faked. Prompts are in `stage1/build_prompts.py` (jobs `riley-run2`, `chief-roar2`, `chief-portrait`), and each job folder has a `prompts-*.json` with the try count.

| Item | Tries (kept) | Result |
|---|---|---|
| Riley run, second half | 3 (2nd) | A new 4-frame sheet of the **opposite-leg phases**: left-foot contact, down on the left leg, right leg passing, flight. The near arm now swings forward where the first half had it back. The run is now the old sheet's top row (frames 1–4) plus the new sheet (frames 5–8). The new sheet came back larger, so it was scaled ×0.725 against the old row, matched on head width and body height (`frames/riley.json`). Honest note: the arm swap reads clearly in frames 5–7, but the flight frame (8) has its arms much like frame 4. The legs are different in all four. See `docs/stage1/run-before-after.jpg` and `contact-riley-run-v2.jpg`. |
| Chieftain roar | 2 (2nd) | A single new frame facing LEFT, head thrown back, axe raised (rigid, same size as the master). Registered to the walk scale by horn-to-feet height (`frames/chief.json`, ref_height 979). His build reads slightly leaner than in the walk frames, which is acceptable for one 1.1 s pose. The special-case flip was removed from `src/enemies.js`. See `docs/stage1/roar-before-after.jpg` and `roar-new.jpg`. |
| Chieftain HUD portrait | 3 (3rd) | A dedicated head-and-shoulders bust: snarling, three-quarter view toward the left, iron-banded horns and nose ring, war paint, skull pauldrons, on a night-blue background. It is cropped to a circle at 256 px like Riley's portrait and shown at 68 px with a ring in the boss bar. See `docs/stage1/portraits.jpg`. |

Riley's and the Chieftain's atlases were rebuilt and repacked (Riley 72 frames, Chieftain 24; same page sizes, give or take a few pixels).

## Performance

- **`window.__perf.summary`** gives:
  - `fps`, `avgFps`, `p50`, `p95`, `p99` (ms);
  - `over33` and `over20` (frames slower than 33 ms and 20 ms);
  - `frames`, and `fight` (the same stats, counted only while enemies are engaged);
  - `renderer`, `quality`, `rs` (render scale), `dpr`.
- **HUD readout:** H toggles it; `?hud=0` hides it.
- **Quality governor:** checks every 2 s and steps down one level when the average frame is over 21 ms.

  | Level | Change |
  |---|---|
  | L1 | bloom off |
  | L2 | fewer particles |
  | L3 | render scale −0.5 |
  | L4 | backdrop unlit (sprites stay lit; ambient light lifted so fighters stay readable) |
  | L5 | render scale 1 |

  Software renderers start at L4. `?q=fixed` turns the governor off; `?q=N` forces level N.
- **Box numbers:** SwiftShader software WebGL, no GPU, so these are **not representative** of any real device.
  - Governor on (it settles at L5): about 26 fps in a 12 s window.
  - Whole autopilot playthrough: avgFps 24.4, p95 76 ms. During fights 24.2 fps, with 82% of frames over 33 ms.
  - Everything on at RS1: about 5.6 fps.
- **Real devices: not yet measured.** Jason's iPad and Mac numbers are needed. Open the link, play one fight, and read the HUD line or `__perf.summary.fight`.

## Debug and URL flags

| Flag | Effect |
|---|---|
| `?demo=1` | autopilot |
| `?autostart=1` | skip the title |
| `?god=1` | Riley can't drop below 1 HP |
| `?skip=boss` | start at the Chieftain arena |
| `?bloom=0` | bloom off |
| `?lit=0` | backdrop unlit |
| `?rs=1` / `?rs=2` | render scale |
| `?ml=N` | max lights |
| `?q=…` | governor control (see above) |

Keys: 1 lights, 2 bloom, 3 slow motion, M music, N mute, H perf readout.

## Decisions and honest notes

1. **Facing uses runtime flipX (approved by Jason, Oct 2).** Every frame is drawn facing one way; the other way is the same frame flipped at display time. Lighting stays correct because flipped sprites switch to a flipped normal map (`_nl`, red channel inverted).
2. **Boss armor flash** is a 70 ms warm tint on the Chieftain's sprite. It is a display effect, not a new frame.
3. **Chieftain roar: correction.** The original roar frame actually faced LEFT like his other frames. My "faces right" flag from the art review was wrong. The special-case flip I added because of it made him roar facing *away* from Riley in the previous preview (`861b6c3`). The roar is now a re-rolled frame facing left, and the special case is removed.
4. **Run cycle: fixed.** The second half was re-rolled (see Re-rolls).
5. **Chieftain HUD portrait: fixed.** It is now a dedicated painted bust (see Re-rolls).
6. **The bot picks its own fights.** It rarely backs off far enough for the Chieftain's cart hurl. The cart, charge and stun were checked with forced triggers (`docs/stage1/boss-charge.jpg`).
7. **Gemini was not used.** Only ChatGPT image generation through Codex was available on this box.
8. **No audio was regenerated.** It is 1.2's audio carried over, as asked.

## Screenshots

All in `docs/stage1/`:

| File | Shows |
|---|---|
| `old-vs-new.jpg` | 1.2 live vs 2.0, mid-fight and boss |
| `midfight.jpg`, `midfight2.jpg` | mid-fight |
| `fireball.jpg` | fireball lighting |
| `boss-top-bar.jpg`, `boss-charge.jpg` | the boss |
| `clear.jpg` | stage clear |
