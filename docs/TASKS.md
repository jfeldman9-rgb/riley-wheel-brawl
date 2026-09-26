# Riley Wheel Brawl — Ordered Implementation Tasks

> **Note (2026-09-26, `rwb-fresh`):** the game is being rebuilt from scratch on the kept engine (`docs/ENGINE.md`). Section A (rename / reskin / scrub of an older theme) no longer applies — there is nothing to reskin. Use the remaining sections as the feature checklist; engine action ids are now `attack, jump, special, assist, power, pause`.

Each task is scoped to one focused session. Do them in order; do not begin content expansion while old-theme references still remain. “Acceptance check” describes a manual or automated observable result, not merely code completion.

## A. Rename, reskin, and remove the old theme

### 1. Rename the public product and repository documentation — **Easy**

- **Files to touch:** `index.html`, `README.md`, `css/style.css`, `.gitignore` only if it names old outputs.
- **Expected behavior:** The browser title, metadata, loading/no-script copy, README title, setup instructions, controls, and project description say Riley Wheel Brawl — Document only the intended fantasy actions and five-stage story. All links and relative serving instructions continue to work beneath `/riley-wheel-brawl/`.
- **Acceptance check:** Serve the root with `python3 -m http.server 8000`, load `http://localhost:8000/riley-wheel-brawl/` from an appropriate parent-root server (or load the repo root directly), and confirm the tab, no-script text inspection, and README contain the new identity while the game reaches its title screen.

### 2. Perform the complete semantic and asset-name scrub — **Hard**

- **Files to touch:** all `js/*.js`; `assets/art/*`; `assets/cutscenes/*`; `tools/*.py`, `tools/*.js`, `tools/*.cjs`; `tools/art-src/*`; `tools/gate-shots/*`; delete/rename obsolete old-theme files as needed.
- **Expected behavior:** Rename the global namespace, settings/run keys, classes/fields/actions, sprites, pickups, stages, audio cues, generated metadata, debug helpers, test fixtures, filenames, and comments to Riley/fantasy or neutral terms. Supply neutral procedural placeholders/data wherever final content is not built yet. Preserve gameplay, BOX/ATK pointer hit-testing, sticky controls, PICK UP, Continue, upgrades, display modes, cutscenes, retry/fallback loading, and the red failure banner. Every script/image/audio URL is relative and has `?v=`.
- **Acceptance check:** Run a case-insensitive repository scan using the agreed forbidden-term list (including all old names, enemies, locations, magic, vessel/journey vocabulary, ward/warding/relic/fire/saidin terminology); it returns no matches outside `.git`. Then complete one placeholder stage with keyboard and mouse, verify BOX/ATK clicks, throw/recover to see PICK UP, and reload Continue.

### 3. Establish five neutral stage slots and fallback-only art contracts — **Medium**

- **Files to touch:** `js/levels.js`, `js/assets.js`, `js/artdata.js`, `js/scenes.js`, `js/main.js`, `tools/test_and_capture.js`.
- **Expected behavior:** Define five correctly named stage records in story order, each temporarily using playable neutral enemies and procedural backgrounds. Register the final filenames from `ART_LIST.md`; no missing optional image blocks play, while deliberately missing critical title/hero art produces the red banner after retry. All stage selection, Continue validation, and debug level jumps support indexes 0–4.
- **Acceptance check:** In the browser console run the renamed equivalent of `game.debug.play(n)` for `n = 0…4`; each opens the named stage without an exception. Block one critical image request, hard-refresh, and see both a playable placeholder and the red failure banner.

## B. Riley hero rig and true walking animation

### 4. Build Riley's procedural fallback rig and Tae Kwon Do poses — **Hard**

- **Files to touch:** `js/sprites.js`, `js/entities.js`, `js/scenes.js`.
- **Expected behavior:** The fallback hero clearly reads as muscular young Riley with short dark hair, thin blue glasses, black Asha'man coat, and sword-and-dragon pins. Existing combo timing drives front kick, roundhouse, and spinning back kick poses; jump, hurt, down, grab/throw, channel, and victory states remain distinct.
- **Acceptance check:** Force optional art off, load a fight, and use Attack three times. See the three kicks in order, then jump, take damage, grab/throw, and win without missing poses or changed hit timing.

### 5. Add Riley's painted atlas and real walk cycle — **Hard**

- **Files to touch:** `tools/art-src/riley-*.webp`, `tools/bake_art.py`, `assets/art/riley.webp`, `js/artdata.js`, `js/sprites.js`, `js/art.js`.
- **Expected behavior:** Riley uses a multi-frame walk with contact, passing, opposite contact, and opposite passing poses; legs step, arms counter-swing, torso bobs subtly, and planted feet remain fixed in world space. Painted and fallback poses share foot anchors and facing behavior. Missing atlas still falls back.
- **Acceptance check:** Hold Left and Right for ten seconds in Auto and Classic. Riley's feet alternately plant without skating, his arms swing opposite the legs, and his body bobs. Rename the atlas temporarily and verify the fallback plus red critical-art warning.

### 6. Create a reusable true-walk contract for every enemy — **Hard**

- **Files to touch:** `js/entities.js`, `js/sprites.js`, `js/art.js`, `tools/bake_art.py`, `js/artdata.js`, enemy files under `tools/art-src/` and `assets/art/`.
- **Expected behavior:** Animation speed derives from actual horizontal/vertical movement; stopping returns cleanly to idle. Every walking enemy type must expose at least four walk phases with alternating contacts, arm/weapon counter-motion, bob, stable anchors, and no foot sliding. Flying enemies use a purpose-built flight cycle and are not falsely counted as walkers.
- **Acceptance check:** Open a debug lineup containing one of every enemy, let them approach, then freeze AI movement. Walkers show proper alternating steps while moving and settle to idle when stopped; slow-motion capture shows planted contacts do not slide.

## C. Channeling combat

### 7. Replace the old special with fireball projectiles — **Medium**

- **Files to touch:** `js/entities.js`, `js/sprites.js`, `js/audio.js`, `js/input.js`, `js/settings.js`, `js/scenes.js`, `js/voice.js`.
- **Expected behavior:** Special launches a cache-free procedural fireball projectile with a channel pose, travel, fair hitbox, enemy/boss damage, impact burst, and appropriate sound. It does not freeze targets or cost HP. Help, controls, remapping names, touch label, and tutorials say FIRE.
- **Acceptance check:** Press the mapped special key and touch FIRE button at different lanes. The fireball travels only in Riley's facing direction, misses across lanes, damages on contact, and neither freezes an enemy nor lowers Riley's HP.

### 8. Convert the meter and pickups to saidin — **Medium**

- **Files to touch:** `js/entities.js`, `js/scenes.js`, `js/sprites.js`, `js/levels.js`, `js/settings.js`, `js/input.js`, `js/voice.js`, `js/main.js`.
- **Expected behavior:** Power pickups add saidin; the HUD and ready prompts show SAIDIN; save/Continue and debug fill preserve the renamed meter safely. Replace all healing items with Moiraine healing tokens/effects and all score/power items with non-magic fantasy counterparts. Moiraine's required heal line plays once per heal event.
- **Acceptance check:** Collect power until the meter fills, collect a heal while hurt, clear a wave, and reload Continue. See the saidin value persist, hear/see “Rise, Riley, Rise!” exactly once on the heal, and find no edible pickup or old meter label.

### 9. Implement full-meter taint pressure — **Hard**

- **Files to touch:** `js/entities.js`, `js/scenes.js`, `js/util.js`, `js/audio.js`, `js/settings.js`.
- **Expected behavior:** A full meter starts a visible grace countdown, then ramps a dark vignette and deterministic wobble and marks HP at a telegraphed cadence. Spending saidin clears it. Pause/cutscene/death/victory stop the timer. Reduced Shake lowers motion while retaining the vignette and warning; taint cannot deliver an unfair unannounced final hit.
- **Acceptance check:** Fill saidin, wait through the grace period, and observe warning → darkening/wobble → spaced HP marks. Pause for five seconds and see no progression. Resume, spend the meter, and see the effect end immediately; repeat under Reduced Shake.

### 10. Replace the screen-clear with lightning and balefire — **Hard**

- **Files to touch:** `js/entities.js`, `js/scenes.js`, `js/sprites.js`, `js/audio.js`, `js/voice.js`, `js/input.js`, `js/settings.js`.
- **Expected behavior:** The super consumes full saidin, grants temporary invulnerability, strikes with lightning, then sweeps a readable balefire beam. Normal enemies clear; bosses take tuned heavy damage. Hit-stop, camera punch, rumble, audio ducking, effects budgets, control remapping, and accessibility modes survive. Riley says exactly “Balefire!” once per activation.
- **Acceptance check:** Fill saidin in a mixed wave, press the super key/button, and see lightning, beam, cleared normal enemies, zero meter, and the exact Riley line. Repeat on a boss to verify heavy damage without instant defeat and inspect Lite/Classic for readable tells.

## D. Build Stage 1 end to end

### 11. Build Emond's Field on Winternight — **Hard**

- **Files to touch:** `js/levels.js`, `js/sprites.js`, `js/entities.js`, `js/scenes.js`, `js/audio.js`, `js/voice.js`, Stage 1 files from `assets/art/` and `tools/art-src/`, `tools/soak.cjs`.
- **Expected behavior:** Stage 1 has layered village-at-night art plus procedural fallback, Trolloc variants with real walks, breakables, fantasy pickups, fair waves, and tutorials for movement, three-kick combo/juggle, jump, grab/throw, fire, Loial-call placeholder, saidin, taint, and super. It starts cleanly, scrolls/locks/unlocks, checkpoints, and ends in a clear state.
- **Acceptance check:** Start a new game with story skipped and play Stage 1 from spawn through its final wave. Every tutorial appears before its mechanic is required; all gates open; Continue resumes the last cleared wave; both painted and forced-fallback runs reach Stage 2.

## E. Remaining stages

### 12. Build Caemlyn and the Fade mini-boss — **Hard**

- **Files to touch:** `js/levels.js`, `js/entities.js`, `js/sprites.js`, `js/scenes.js`, `js/audio.js`, Stage 2 art source/output, regression tools.
- **Expected behavior:** Caemlyn streets introduce appropriate city enemies and culminate in a Myrddraal/Fade mini-boss. Each move has a distinct wind-up and a floor tell drawn from its actual hitbox; defeating it clears the stage.
- **Acceptance check:** Debug-load Stage 2, evade every Fade move by following the tell, defeat it, and transition to Stage 3. Boss phase marks, accessibility colors, and Continue all remain correct.

### 13. Build Shadar Logoth, Mashadar, and the Draghkar — **Hard**

- **Files to touch:** `js/levels.js`, `js/entities.js`, `js/sprites.js`, `js/scenes.js`, `js/audio.js`, Stage 3 art source/output, regression tools.
- **Expected behavior:** Mashadar fog visibly telegraphs which lanes/times are unsafe and uses the common hazard path. The Draghkar boss has readable aerial tells and fair vulnerable windows. The tone is eerie but kid-friendly.
- **Acceptance check:** Debug-load Stage 3, intentionally enter and then avoid Mashadar to verify damage and safe lanes, defeat the Draghkar without unavoidable hits, and transition to Stage 4.

### 14. Build the Stone of Tear, Forsaken, and Callandor upgrade — **Hard**

- **Files to touch:** `js/levels.js`, `js/entities.js`, `js/sprites.js`, `js/scenes.js`, `js/settings.js`, `js/audio.js`, Stage 4 art source/output, regression tools.
- **Expected behavior:** A named Forsaken boss anchors the Stone. After victory Riley claims Callandor; the super becomes permanently stronger/brighter for the run and that flag survives Continue. A temporary in-engine placeholder communicates Twinkle Toes's lightning reveal until the later cutscene task.
- **Acceptance check:** Use the super before and after Callandor against equivalent debug targets and observe the documented damage/visual increase. Reload Continue into Stage 5 and confirm the upgrade remains active.

### 15. Build the Black Tower and Taim finale — **Hard**

- **Files to touch:** `js/levels.js`, `js/entities.js`, `js/sprites.js`, `js/scenes.js`, `js/audio.js`, `js/voice.js`, Stage 5 art source/output, regression tools.
- **Expected behavior:** Turned Asha'man waves lead to a roof encounter with Mazrim Taim. Taim has fair multi-phase telegraphs; the last phase ends only through a scripted Riley/Twinkle Toes joint lightning-and-balefire finish, then enters victory cleanly.
- **Acceptance check:** Play Stage 5 from its first wave, reach the roof, reduce Taim to the finish threshold, and see player input hand off safely to the joint finish before the ending/victory flow. Continue cannot skip or duplicate the finish.

## F. Allies, extras, story, and polish

### 16. Finish angreal triple-fireball pickups — **Medium**

- **Files to touch:** `js/entities.js`, `js/sprites.js`, `js/scenes.js`, `js/levels.js`, `js/audio.js`.
- **Expected behavior:** Angreal grant a timed, HUD-visible buff producing three larger fireballs in a readable spread. A second pickup refreshes duration. Bariley prevents one pickup from erasing a boss while remaining exciting.
- **Acceptance check:** Collect an angreal, press FIRE, and see three larger projectiles with separate lane collision. Collect another before expiry to refresh the timer; wait it out and see fire return to one normal projectile.

### 17. Finish Loial's once-per-stage call — **Hard**

- **Files to touch:** `js/entities.js`, `js/sprites.js`, `js/scenes.js`, `js/input.js`, `js/settings.js`, `js/audio.js`, `js/levels.js`, Loial art source/output.
- **Expected behavior:** The former tool action calls Loial once per stage. He charges through with an axe and knockdown damage, then the HUD marks the call spent. Preserve the underlying BOX/ATK mouse hit-testing regression and dynamic PICK UP behavior in a neutral test fixture even if normal stage content now displays CALL.
- **Acceptance check:** Click/tap CALL during a wave, see one charge, and confirm repeated input does nothing. Start the next stage and see it ready again. Run the pointer regression fixture and verify BOX/ATK regions and PICK UP still pass.

### 18. Author the opening, five stage sequences, reveal, and ending — **Hard**

- **Files to touch:** `js/levels.js`, `js/cinema.js`, `js/assets.js`, `js/scenes.js`, `js/audio.js`, `js/voice.js`, `assets/cutscenes/*`, `tools/bake_story.py`, `tools/story-shots.cjs`.
- **Expected behavior:** The opening establishes Kenzie's capture and Moiraine's guidance. One sequence for each stage advances the rescue; Stone of Tear reveals Twinkle Toes's lightning; Black Tower resolves the joint victory. Use the exact cataloged lines, short typewriter timing, kid-friendly tone, and every planned still in `ART_LIST.md`. Missing stills use composed placeholders and do not block or confuse the story.
- **Acceptance check:** Start New Game and watch/advance the entire reel sequence through all five stage transitions and ending. Then block all cutscene images and repeat via story capture: names, locations, plot, reveal, and ending remain understandable with no exception.

### 19. Record and integrate optional voice clips — **Medium**

- **Files to touch:** `assets/audio/voice/*`, `js/assets.js`, `js/audio.js`, `js/voice.js`, `js/cinema.js`, `js/scenes.js`.
- **Expected behavior:** Record only the exact lines in `VOICE_LINES.md`, normalize levels, and map each clip to its trigger with subtitle fallback. Every URL is relative and `?v=` stamped. Missing/blocked clips silently retain subtitles and synthesized cues; clips respect mute/volume and duck music without overlap spam.
- **Acceptance check:** Trigger every line through a debug voice gallery, confirming speaker, subtitle, timing, and one-shot rules. Block audio requests, reload, and complete a stage with no red JavaScript errors or stalled flow.

### 20. Final visual, input, performance, and release gate — **Hard**

- **Files to touch:** `README.md`, `index.html`, `js/*.js` as defects require, `tools/chrome-smoke.cjs`, `tools/test_and_capture.js`, `tools/capture-gfx.cjs`, `tools/story-shots.cjs`, `tools/verify-hd.cjs`, `tools/soak.cjs`, `tools/gate-shots/*`.
- **Expected behavior:** Tune all stages and characters to at least the current village mid-fight visual bar. Verify no foot sliding, fair telegraphs, readable taint, stable 4K/phone budgets, relative/versioned assets, missing-art fallback/banner, all input methods, remaps, sticky controls, BOX/ATK/PICK UP regression, Continue, Callandor, and the complete forbidden-reference scrub.
- **Acceptance check:** Pass the updated automated smoke, soak, HD, story, missing-asset, URL, and forbidden-term suites; manually complete all five stages on keyboard and touch emulation; capture a representative mid-fight image for every stage beside the archived baseline and approve each at or above the bar.
