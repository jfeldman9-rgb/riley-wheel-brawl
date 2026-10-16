# Riley Wheel Brawl 2.0 — Stage 2 handoff to Yetti Galt (Oct 3, 2026)

Hi Yetti, this is The Coder (Jason's coding desk). Stage 2 (Baerlon and the Whitecloaks) has had its first full pass and one Claude review. Jason wants you to build from here. **Do the checklist below in priority order. Don't redo work that's already done.**

## Repo, branch, PR
- Repo: **jfeldman9-rgb/riley-wheel-brawl**
- Work branch: **`rwb-2-stage2`** (it branches off `rwb-w2` @ a483d02). Head at handoff: 0ef2dbd plus this doc. **Draft PR #19** goes into `rwb-w2`: https://github.com/jfeldman9-rgb/riley-wheel-brawl/pull/19
- Either keep committing to `rwb-2-stage2` or branch off it with your own draft PR. **Never touch `main`. Never merge anything without Jason's explicit OK.**
- Preview any commit at `https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/<full-sha>/index.html`. Useful flags:
  - `?stage=2` jumps to Stage 2.
  - `&story=0` skips the story.
  - `&skip=boss` goes straight to Byar.
  - `&demo=1` turns on autopilot.
  - `&god=1` makes Riley invulnerable.
  - Press H for the perf HUD. `window.__perf.summary.fight` gives the mid-fight numbers.

## Read first (in the repo)
- `docs/stage2/README.md`: design, how to test, art provenance, test list.
- `plan/LEVELS.md`: the 10-stage plan. Stage 2 is Baerlon, and **Stage 3 is Caemlyn**: royal city walls, the Queen's Blessing inn, a rooftop chase, the palace garden. Enemy: Darkfriend cutthroat (grabber). Boss: Myrddraal (shadow blink, then a fear aura, then splits into 2 shadow copies; parry the real one). Light goes from golden afternoon to torchlit night.
- `plan/PLAN.md`
- `assets/audio/AUDIO_PROVENANCE.md` and `assets/audio/VOICE_PROVENANCE.md`
- Art prompts: `docs/stage2/prompts/`
- Perf baseline: `docs/stage2/perf.json`
- Screenshots and contact sheets: `docs/stage2/shots/`
- `docs/stage2/claude-review.md`: Claude's raw review. The verified checklist is below.

## How to run, test, perf-check
- **Run:** serve the repo root with any static server (for example `npx http-server -p 8080` or `python3 -m http.server`) and open `index.html?stage=2`. Or use the githack preview above.
- **Tests:** `node --test tests/*.test.mjs`. That's 322/322 at 0ef2dbd. Stage 2 tests are in `tests/stage2-{whitecloaks,flow,campaign,assets}.test.mjs`.
- **Stage 1 must not change.** Run:
  - `node tests/helpers/run-full-stage-simulations.mjs > /tmp/sim.json`, then diff the results against `docs/stage1/evidence/full-stage-simulation.json`
  - `node tools/audit-stage1.mjs`
- **Perf:** open the preview with `&demo=1`, let the fight run, press H, and read `window.__perf.summary.fight` (avg fps, p95, frames over 33 ms). Do 3 reps each for Stage 1 boss/start and Stage 2 boss/start. Compare against a483d02 (the base build) and against `docs/stage2/perf.json`.
  - My box has no GPU. The baseline numbers are from software rendering: Stage 2 boss averaged 23.5 fps, with about 60% of fight frames over 33 ms. They are only useful for comparing builds against each other.
  - Real-device numbers (Jason's iPad/Mac) are what count. The bar is 60 fps mid-fight with few frames over 33 ms.
- **Art packing:** the frame atlases are `assets/chars/<key>-0.webp` + `_n` + `_nl` (normal maps), plus `<key>.anims.json`. The canvas is 900×560 with the baseline at 530; pack scale is zealot 0.62, byar 0.6, archer 0.62.
  - The slice/pack/normal-map scripts live on The Coder's box, not in the repo.
  - If you can't pack, commit the accepted frames as PNGs under `art-in/<char>/` and say so in your report. Jason can route the packing to The Coder.

## Done (first pass, all pushed to rwb-2-stage2)
- **Music:** 4 original loops (title, stage2, boss1, boss2) plus provenance, a crossfade backend (`playTrack`), and the music state machine (`src/music.js`).
- **Backdrop:** the bg2 rainy-dusk set with lanterns, rain and lightning.
- **Enemies:** Whitecloak zealot (shield, charge, guard break) and archer (shot, lobbed shot with ground marker, backstep).
- **Boss: Jaret Byar**, 3 phases:
  - P1: parry bait and riposte.
  - P2: arrow volleys with a safe lane.
  - P3: rage, torches, rush, barn fire.
- **Stable zone:** falling beams, then the collapse.
- **Story and flow:** the Stage 2 story beat, Twinkle Toes' ribbon, title stage-select, and the Stage 1 → 2 campaign.
- **Voice and art:** 19 Kokoro voice lines (checked with STT) and the Byar portrait. There is no Twix art in Stage 2.
- **Tests:** 51 new (322 total, all green). Stage 1 evidence is identical to the base. Perf is at parity with Stage 1, and Stage 2 is lighter.

## Claude review (1 pass, at 0ef2dbd) — verified checklist
Claude's raw text is in `docs/stage2/claude-review.md`. Verdicts are mine, checked against the code. Fix in this order.

**Blockers**
- [ ] **B1 — Music fades jump instead of fading.** REAL.
  - Where: `src/audio.js:197`. `param.value = to` runs after the ramps are scheduled, and per the Web Audio spec it acts as `setValueAtTime(to, now)`. Every crossfade and the rain fade snap to the end value, then ramp oddly.
  - Fix: delete line 197. Make the fake AudioParam in `tests/stage2-flow.test.mjs` (~line 122) turn `.value =` into `setValueAtTime`. Add a test that the scheduled curve is monotonic.
  - Then listen in Chrome and iOS Safari.
- [ ] **B2 — Phase 3 can break the safe lane.** REAL.
  - Where: `src/whitecloaks.js:236-238`. Byar's `think()` only checks `volleyActive()` before starting another volley. A torch (aimed at Riley's current spot, `stage2.js:246`), a rush or a plain attack can start during a volley and hit Riley in the safe band.
  - Torches also have no ground marker.
  - Fix: while `kit.volleyActive()`, Byar holds at ≥300 px and does no torch, rush, parry or attack. Add a landing marker for torches, cleaned up in `clearHazards`. Add a test.
- [ ] **B3 — Powers bounce off shields.** REAL.
  - Where: `SHIELDABLE` and `takeHit` in `src/whitecloaks.js:28,117-118,267` check `h.power`, but no power hit ever sets it (`powers.js:144,182,229`; Balefire at `stage1.js:435`).
  - Effect: lightning, air whip and fire shield are blocked by a guarding zealot. Balefire, lightning and air whip glance off a parrying Byar. Balefire is short (it ends at Riley's release frame, which is shorter than the 1.5 s parry), so the full bar can be wasted. That last part is unverified in play.
  - Fix: add `power: true` to those hit objects. Fireballs keep the designed glance (the existing test 'fireballs glance off his parry'), so use a separate flag for them. Add tests.
- [ ] **B4 — The barn fire doesn't read as fire.** REAL (known).
  - What it looks like: big soft orange blobs over the roof and sky, an unburnt barn underneath, and the banner text lost in the blobs.
  - Fix: a **painted** burning-barn overlay (ChatGPT/Gemini, matched to the `bg2-mid2` barn crop and perspective) that fades in over 1.5 s in `rage()` (`stage2.js:228-243`). Add 2–3 painted looping flame strips. Shrink the ember blobs (scale ≤1.2). Make the smoke grey and non-additive.

**Should-fix**
- [ ] **S1 — Archers are too weak.** REAL.
  - Why: a 940 ms draw against a ±20 px hit window (`stage2.js:129`) while they fire at <26 px (`whitecloaks.js:173`). Only one archer can draw at a time (`archerBusy`).
  - Suggested changes (tune by feel):
    - Track Riley's y during draw frames 0–3, at ≤90 px/s.
    - Widen the hit window to 26.
    - From zone 2, every 3rd shot is a 3-arrow fan.
    - Let one archer shoot while another lobs.
    - Lead the lobbed shot a little.
    - Add a glint on draw frame 2.
  - Target: 4–8 arrow hits per bot run (now 1–5). Add that range to the campaign test. That is a new test, not a loosened one.
- [ ] **S2 — Byar's rush telegraph is too short.** REAL.
  - Why: `rushUp` is 0.22 s with no glint, and the war cry comes late (`whitecloaks.js:23,217`).
  - Fix: set it to ~0.55 s, play the glint and war cry at wind-up, and show a lane marker.
- [ ] **S3 — Lightning flash has no opt-out.** REAL.
  - Why: each strike is two pulses, peak overlay 0.275 plus an ambient jump (`stage2.js:100-113`). That's within the WCAG limit, but there is no off switch.
  - Fix: use a single soft pulse capped at 0.15 alpha, and skip the flash when `prefers-reduced-motion` is set or `?flash=0` is in the URL.
- [ ] **S4 — Audio keeps running when the tab is hidden.** REAL.
  - Why: there is no hidden/visible handling in `src/audio.js`. Music keeps playing in a background tab, and `unlock()` (line 80) only resumes from `'suspended'`, but iOS uses `'interrupted'`.
  - Fix: suspend/resume on Phaser `hidden`/`visible`, and resume whenever `state !== 'running'`.
- [ ] **S5 — Byar's rage line.** PARTLY REAL. This is a judgment call, so **ask Jason**.
  - The line: `byar_rage_01`, "Burn the barn! Smoke the Darkfriend out!" (`audio.js:62`).
  - Claude suggests "Light the torches! Flush the Darkfriend out!" If Jason agrees, redo the TTS and update the manifest and STT check.
- [ ] **S6 — The lobbed-arrow ground marker is nearly invisible.** REAL. I checked `06-archer-skyshot-mark.jpg`: it's a thin dark-red ring on dark mud (`stage2.js:137`).
  - Fix: a filled disc with a bright outline and a shrinking shadow. Reuse it for torches.
- [ ] **S7 — Possible light budget overflow.** PARTLY REAL: plausible but not measured.
  - Why: `maxLights` is 10 (`main.js:19`). In phase 3 the scene can have about 5 fire lights, the hero light, a torch, up to 3 fire patches, pickups and power lights.
  - Fix: count the active lights in a worst-case P3 test, and cap patches at 2 in Stage 2 or merge the barn lights if it goes over.
- [ ] **S8 — Fire light cap leaks into Stage 1.** REAL, minor. `fireCap` (5 after the rage) carries over when you go back to Stage 1, because `create()` never resets it.
  - Fix: reset it in `create()`.
- [ ] **S9 — The quality governor doesn't thin the barn particles.** REAL, minor. The barn emitters and the back rain layer aren't thinned when the governor steps down mid-fight (`main.js:45` only thins `snowFront`).
  - Fix: keep references to them and thin them at level 2.
- [ ] **S10 — Memory on older iPads.** REAL: the numbers check out. Act on it only if the iPad test shows a problem.
  - Textures: the Stage 2 enemy atlases take about 91 MB of GPU memory (base + `_n` + `_nl`).
  - Music: each decoded track is 15–25 MB, and at most 2 are held at once.
  - Voices: `preloadVoices()` decodes both stages' lines.
  - Options:
    - Half-resolution normal maps (check that the lighting still looks right).
    - Preload only the current stage's voices.
    - Prefetch the boss2 bytes when the stable zone starts.

**Nice-to-have**
- [ ] **N1 — Unused painted frames.** REAL. `byar_retreat` and `byar_command` are painted but never used (`whitecloaks.js:220` plays `walk`).
  - Fix: use `retreat` for the exit, and `command` on the "Archers!" line.
- [ ] **N2 — The parry pose is hard to read.** PARTLY REAL. The parry pose is close to his walk pose, and the hint text shows only once.
  - Fix: show a shield icon over him during the parry, and a "NOW!" flash when his guard opens.
- [ ] **N3 — `VOLLEY_BANDS` is hard-coded.** REAL, trivial (`stages.js:14`). Derive the bands from `LANE_TOP`/`LANE_BOT`.
- [ ] **N4 — The ribbon can be missed.** PARTLY REAL. It doesn't expire, but it's lost if Riley moves on to the next zone without it.
  - Fix: auto-collect it on zone clear.
- [ ] **N5 — The campaign doesn't carry over.** REAL. Stage 1 → 2 resets score and lives (`stage1.js:213`).
  - Fix: pass `{score, lives}` through. **Check with Jason first, because this is a design choice.**
- [ ] **N6 — The title-screen stage arrows are small tap targets.** REAL. They are 34 px text (`hud.js:78`).
  - Fix: give them a ~120×100 hit area.
- [ ] **N7 — Art notes.**
  - PARTLY REAL: `byar_volley_01` and `_02` look alike, the zealot flee frames read a bit like a charge, the rage frames have no torch yet, and the collar pin varies between story panels.
  - Riley himself: Claude and I both checked him, and he is **on-model** in game and in the panels.
- [ ] **N8 — Thunder is loud.** REAL, judgment call: thunder is the loudest unprompted sound (vol 0.42). Duck it to ~0.3.

**Test gaps** Claude flagged, all worth adding:
- Volley reachability from every band, including when Riley starts mid-combo or in hurt.
- Restarting mid-volley, mid-rage or mid-torch puts the light count back to baseline and leaves no emitters behind.
- Pausing freezes the volley timer.
- Continuing after a game over in P3 resumes boss2 without restarting it.
- Touch stage-select.
- Visibility and iOS `'interrupted'` audio, using a fake context.

## Still unfinished (besides the checklist)
1. **iPad check:** fps, memory and touch on Jason's iPad. Nobody has run this yet.
2. **Listening review** of the 19 voice lines and 4 music loops, with Jason. Do it after B1 is fixed.
3. **Archer tuning** (S1).
4. **A painted burning barn** (B4).
5. **Byar's rush stride frames** (the 2nd and 3rd stride) look too similar. Repaint one in ChatGPT/Gemini from the existing byar master, then check it on the contact sheet.

## Jason's rules (non-negotiable)
- **No paid usage** or extra credits. **No Seedance or Manus.**
- **Still images come from ChatGPT (preferred) or Gemini only. Never Grok for stills.**
- **No faked art:** no recolouring, blurring, stretching or mirroring to make "new" frames. Flipping a character to face the other way when they turn IS fine.
- **Riley stays on-model:** 16 and very muscular, short dark hair, thin blue-framed glasses, sleeveless black Asha'man coat. **Never a kid.** (Twinkle Toes is 8.)
- **Check every frame yourself** (contact sheet plus in game) before showing Jason anything.
- **Never loosen or delete tests without Jason's explicit approval.**
- **Report smoothness first, with numbers:** avg fps and stutter frames (frames over 33 ms) mid-fight, then everything else.
- Work in focused passes on branches with draft PRs. Jason approves every merge.

## What to hand back (each pass)
1. PR number, branch, and **full head sha**, plus the githack preview link for that sha.
2. **Smoothness first:** avg fps, fight fps, and fight frames over 33 ms for Stage 1 and Stage 2 (boss + start, 3 reps each), compared with 0ef2dbd. Say what hardware (software rendering or a real device).
3. Tests: the `node --test` pass count (322 or more, none loosened), Stage 1 evidence identical yes/no, and the audit result.
4. Screenshots: before/after for each visible change, and contact sheets for any new or repainted frames.
5. The checklist above with each item marked done / partly / not done, plus a short list of every file changed and why. Also list new art with its source (ChatGPT or Gemini) and the prompt file.
