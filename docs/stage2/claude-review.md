## Summary
Stage 2 is in good shape overall. All 322 tests pass (`node --test tests/*.test.mjs`). The code is clean, the art is consistent, and the volley safe lane is always there and reachable in time. Four things should be fixed before kids play:
- **Music fades are broken.** Every crossfade (and the rain fade) jumps instead of fading. The spec reasoning is solid, but nobody has heard it yet.
- **Phase 3 can be unfair.** Byar can throw a torch or rush into the one safe lane during a volley.
- **Powers bounce off shields.** A check for "is this a power hit" is never true, so Balefire, lightning and air whip get blocked by shields and parries.
- **The barn fire doesn't look like fire.** It reads as blurry orange light blobs.

## Blockers (must fix before kids play)

**B1. `src/audio.js:197`: the line `param.value = to;` in `fadeGain` breaks every fade.**
- **What's wrong:** In the Web Audio spec, setting `.value` is the same as scheduling `setValueAtTime(to, now)`. This lands at the same time as the starting point set on line 190 and replaces it. So each fade jumps straight to its end value and then follows the ramps from there:
  - A fade-in starts at full volume, dips, then climbs back up.
  - A fade-out cuts to silence, swells back to nearly full, then fades again.
  - Every title → stage → boss → clear change, and the rain start/stop, glitches. Two tracks can be briefly loud together.
- **Why the tests miss it:** The fake AudioParam in `tests/stage2-flow.test.mjs:122` treats `.value` as a plain property.
- **Confidence:** High, from the spec. Unverified by ear — check in Chrome and iOS Safari.
- **Fix:**
  1. Delete line 197. Line 191 can keep its `.value` set (it's harmless there).
  2. Update the fake param so its `.value` setter calls `setValueAtTime(v, ctx.currentTime)`.
  3. Add a test asserting the scheduled curve is monotonic.

**B2. `src/whitecloaks.js:236-237`, `src/stage2.js:245-266`: in phase 3, the safe lane can still hurt Riley.**
- **What's wrong:** `think()` starts a torch throw or a shield rush even while a volley is active.
  - The torch is aimed at where Riley stands (`throwTorch` sets `tx/ty = R.x/R.y`), which is the safe band he just moved to. It knocks him down for 10 and leaves a fire patch there.
  - The rush runs along Riley's lane: `ady < 36`.
  - Torches have no ground marker (sky arrows do), so there's nothing to react to in the 0.8 s flight.
  - After his volley animation, Byar's cooldown is only 0.5–0.9 s, so he can also walk into the safe lane and swing his combo while the arrows are still coming.
- **Fix:**
  1. Gate the torch, rush, parry and normal attack on volleys: add `if (this.scene.kit?.volleyActive()) { hold position at ≥300 px, play walk at speed 0; return; }` before lines 236–238, and suppress `startAttack` the same way.
  2. In `throwTorch`, draw the existing `'ring'` marker at `(tx, ty)` (orange tint) for the flight time. Destroy it on landing and in `clearHazards`.
  3. Add a test: during an active volley, Byar never enters `torch`, `rushup` or `attack`.

**B3. `src/whitecloaks.js:28,117-118,267`: `h.power` is checked but never set anywhere, so powers get blocked.**
- **What's wrong:** No hit object in `powers.js:144,182,229`, `stage1.js:395` (fireball) or `stage1.js:435` (Balefire) sets `power`. As a result:
  - Lightning (medium) and air whip / fire shield (light) are blocked by a zealot's raised shield from the front, so they look like they "don't work". The air whip can't pull a guarding zealot.
  - Balefire hitting a parrying Byar from the front goes into the "glance" branch (`from` is a `{x, facing}` object, not Riley). That wastes the whole saidin bar unless the beam outlasts the parry (unverified how long the beam lasts).
- **Fix:**
  1. Add `power: true` to the lightning, air whip, fire shield and Balefire hit objects.
  2. For fireballs, either keep the designed glance (don't set `power`; add an explicit `h.fireball` flag and check it in the parry branch) or let them through and update `tests/stage2-whitecloaks.test.mjs` 'fireballs glance off his parry'.
  3. Add tests: lightning, air whip and Balefire on a guarding zealot do damage; Balefire on a parrying Byar does damage.

**B4. Barn fire art (known limitation, but it doesn't read as fire): `09-byar-p3-barn-fire.jpg`, `09-byar-p3-rush.jpg`, `10-byar-defeated.jpg`; `src/stage2.js:235-238`.**
- **What it looks like:** Soft, blurry orange orbs (the 24 px radial `ember` texture scaled ×4.2, additive) floating over the roof, the gable and the sky above the roofline. There are no flame shapes, nothing burning at the doors or hayloft, and the boards are not charred. The barn is still painted unburnt underneath, so it reads as glowing bokeh, not a fire. The "BYAR IS TORCHING THE BARN!" banner sits on top of the blobs and is hard to read.
- **Fix:**
  1. Paint a burning-barn overlay cropped to the barn area of `bg2-mid2`, at the same perspective: flames from the hayloft door, the roof ridge and the door edges, charred boards, orange glow. Add it at the plate's position and scroll factor and fade its alpha 0 → 1 over 1.5 s in `rage()`.
  2. Add 2–3 looping painted flame strips (6–8 frames, additive) anchored at the hayloft and the roof ridge.
  3. Remove the scale-4.2 blob emitter. Keep the embers small (scale ≤ 1.2) and make the smoke non-additive grey.
  4. Keep it cartoon: no animals in or near the barn.

## Should-fix

**S1. Archers are too weak (`src/whitecloaks.js:21,171-173`, `src/stage2.js:129`).**
- **Why:** About 940 ms of bow draw (frames 0–3) plus about 0.6 s of flight, against a ±20 px lane window that Riley leaves in 0.16 s. Only one archer may draw at a time (`archerBusy`), and the cooldown is 2.2–3.2 s.
- **Fix, staying fair:**
  1. During `shoot` frames 0–3, let the archer slide its y toward Riley's at up to 90 px/s, so the arrow is in his lane when it leaves the bow.
  2. Widen the hit window to `< 26`, matching the `ady < 26` shoot condition.
  3. From zone 2 on, every third shot is a 3-arrow fan at y offsets −30/0/+30 at the same speed. Riley must jump or change lane by a band, not by 20 px.
  4. Have `archerBusy` block only the same attack type, so one archer can shoot while another lobs.
  5. Lobbed arrows: aim slightly ahead (`tx = R.x + R.vx*0.5`, clamped), raise `skyChance` to 0.5 and the hit radius from 60 to 75.
  6. Keep the telegraphs: add a glint on draw frame 2.
  7. Target 4–8 arrow hits per bot run (currently about 1–5). Add that range to the campaign test.

**S2. Byar's rush telegraph is too short (`src/whitecloaks.js:23,217`).**
- **Why:** The wind-up is 0.22 s with no glint, and the war cry only plays when the rush has already started. The zealot gets 0.5 s plus a glint.
- **Fix:** Set `rushUp` to 0.55. In `startRush`, call `kit.telegraph`/`glint` and `sfx.warcry()`, and play a `'lanemark'` strip on Byar's lane for the wind-up.

**S3. Flashing (`src/stage2.js:100-113`).**
- **Why:** Each strike is two pulses in 0.32 s: overlay alpha up to 0.275 plus an ambient jump to `0x8a9ac0`, every 11–19 s. That's under the WCAG limit of 3 flashes per second, but there's no opt-out for photosensitive kids.
- **Fix:**
  1. Make it a single soft pulse (drop the 0.05 → 0.35 second bump).
  2. Cap the overlay alpha at 0.15.
  3. Skip flashes entirely, keeping the thunder, when `matchMedia('(prefers-reduced-motion: reduce)')` matches or `?flash=0` is set. Add a title-card toggle.
  4. Test: at most one flash per strike and alpha ≤ 0.15.

**S4. Tab hidden and iOS audio (`src/audio.js:80`).**
- **Why:** There is no `visibilitychange` handling. Music and rain keep playing in a background tab while Phaser's loop is paused. On iOS the context goes to state `'interrupted'`, which `unlock()` doesn't resume because it only checks `'suspended'`.
- **Fix:**
  1. Hook `game.events.on('hidden')` to `ctx.suspend()` and `'visible'` to `ctx.resume()`.
  2. In `unlock()`, resume whenever `ctx.state !== 'running'`.
  3. Add `ctx.onstatechange` to retry on the next gesture.
  4. Add unit tests with a fake context.

**S5. Kid-safety wording (`src/audio.js:62` `byar_rage_01`).**
- **Why:** "Burn the barn! Smoke the Darkfriend out!" has an adult deliberately setting a fire to smoke out a teenager.
- **Fix:** Soften it, for example "Light the torches! Flush the Darkfriend out!", re-run TTS, and update `stage2-voice-manifest.json`/STT check. The flash text "BYAR IS TORCHING THE BARN!" (`stage2.js:243`) can stay. Everything else (story, barks) is fine for a cartoon brawler.

**S6. Lobbed-arrow marker is nearly invisible (`06-archer-skyshot-mark.jpg`; `src/stage2.js:137`).**
- **Why:** It's a thin dark-red ring at alpha 0.45–0.8 on dark mud.
- **Fix:** Add a filled inner disc (alpha 0.35) with a bright yellow outline and a shrinking shadow, at depth 950. Use the same marker for the torch from B2.

**S7. Lights (`src/main.js:19` `maxLights` 10).**
- **Why:** In phase 3 the active lights can exceed 10: 5 fire lights (cap), hero 1, torch 1, up to 3 fire patches, the sa'angreal pickup, plus Balefire/fireball lights. Phaser silently drops some, which likely shows as lights popping in and out (unverified).
- **Fix:** Merge the 3 `barnFire` lights into 2. Limit fire patches to 2 in Stage 2 (`addPatch`). Add a test that phase 3 at worst case stays ≤ 10.

**S8. `this.fireCap` leaks across restarts (`src/stage1.js:93`).**
- **Why:** Stage 2 sets it to 4, or 5 after the rage. Going back to Stage 1 keeps it, so Stage 1 runs one extra fire light.
- **Fix:** In `create()`, reset `this.fireCap = undefined; this.cutsceneAfter = null; this.storyResult = undefined;`.

**S9. Barn particles and quality.**
- **Why:** The emitter frequency is chosen once, when the barn catches fire (`s.fx.quality`). If the quality governor steps down afterwards, the barn emitters and the back rain layer (`stage2.js:69`) are never thinned; level 2 only thins `snowFront`.
- **Fix:** Keep references to the barn emitters and the back rain in `kit`. In `applyLevel` level 2, multiply their frequency by 3 and set barn `quantity` to 1.

**S10. Memory on a 2018 iPad.**
- **Textures:** Stage-2 enemy atlases in GPU memory: zealot about 27.8 MB, Byar about 39.7 MB, archer about 23.7 MB (base, `_n` and `_nl` each). That's about 91 MB, before Riley, hounds, Loial and the backdrop. All three are within 4096 px wide but have no headroom; `stage2-assets` already asserts ≤ 4096.
- **Fix for textures:** Pack the normal maps at half resolution. The UVs are normalized, so this should sample correctly (unverified with Phaser 4's lighting). Longer term, drop `_nl` by flipping the normal's red channel in the shader.
- **Music:** Fetched and decoded lazily, which is good, but each track is held as raw sound data at 48 kHz stereo (about 384 KB/s): title ~17.7 MB, stage2 ~25 MB, boss2 ~21.5 MB, boss1 ~15 MB. The code keeps at most 2 decoded, so the peak is about 47 MB. `music-main` is streamed, which is good.
- **Voices:** `preloadVoices()` (`stage1.js:238`, `audio.js:320`) decodes every Stage 1 line in Stage 2 too, and clips are never released.
- **Fix for audio:**
  1. Preload only the shared lines plus the current stage's lines, and clear the other stage's clips in `releaseStage`.
  2. Re-encode the stage2/boss loops as mono if the mix allows (halves the decoded size).
  3. Prefetch the boss2 file bytes (fetch only, no decode) when the stable zone starts, so the boss track starts on time.

## Nice-to-have

- **N1. Unused animations.** `byar_retreat` is painted but unused: `whitecloaks.js:220` uses `'walk'`. Use `setState('retreat','retreat')` and drop the `face()` flip if the frame already faces away. `byar_command` is also unused; play it on the phase-2 "Archers!" line (`stage1.js` `onBossPhase`).
- **N2. Byar's parry pose doesn't read.** `byar_parry_00` looks almost like his walk pose, so kids rely on the glint and the text, and the text hint shows only once (`hints` Set). Show a small shield icon above him for the whole parry, and a "NOW!" flash when he opens (`accuse` frame).
- **N3. `VOLLEY_BANDS` is hard-coded** (`stages.js:14`). Derive the bands from `LANE_TOP`/`LANE_BOT` so they can't drift apart.
- **N4. The ribbon can be lost.** If Riley leaves the inn-yard zone without picking it up, it's gone for the run. Auto-collect it on `onZoneClear(1)`.
- **N5. Stage 1 → 2 campaign resets score and lives.** Pass `{score, lives}` in the restart data (`stage1.js` `onPress`).
- **N6. Title arrows are small tap targets.** The ◀ ▶ at 34 px are too small on phones. Give them roughly a 120×100 hit area.
- **N7. Art notes:**
  - `byar_volley_01` and `byar_volley_02` look nearly identical (unverified at full size).
  - Zealot flee frames show the sword raised, which reads as charging rather than running away.
  - The Byar rage frames have no torch; it first appears at `torch_00`.
  - Riley's collar pin reads like a plain cross in story panels 1 and 3 (a sword in panel 2). Touch it up into a clear sword pin.
- **N8. Thunder** (`audio.js` `thunder`, vol 0.42 for 2.4 s) is the loudest unprompted sound. Duck it to about 0.3 and lower further when reduced-motion is set.

**Test gaps to add** (alongside the tests named in B1–B3 and S1–S8):
- Volley reachability from every start band and marked-band combination, with Riley starting mid-`combo3` and in `hurt`.
- Scene restart mid-volley, mid-rage and mid-torch: light count back to baseline, no leftover emitters or markers.
- Pause during a volley freezes the timer.
- Continue after a game over in phase 3 resumes boss2 without restarting it.
- Touch-arrow stage select.
- Fake-context tests for visibility and iOS `'interrupted'` audio.

**Art verdict:**
- **Riley** is on-model in all three story panels and in game: reads as 16, very muscular, short dark hair, thin blue glasses, sleeveless black coat.
- **Zealot, archer and Byar sheets** are consistent in costume, scale and facing (native left). I saw no recoloured, blurred or mirrored copies used as new poses, and no cropping at contact-sheet size (full-size frames not checked).
- **Known:** Byar's rush frames 1 and 2 look alike.
- **Barn fire:** see B4.
