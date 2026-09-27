# Riley Wheel Brawl — current status

Branch `rwb-w2`; PR #4 targets `rwb-w1`. This smoothness pass starts from
`ae8022a421331ef99a6991f35d5e7ea33d8f4bc7`, including the later Riley 16,
Be’lal sprite and seamless-floor work. Runtime stamp: `?v=20260926-sol1`.
No changes or merges to `main`; no PR merged.

## Smoothness pass

All [twenty improvements](SMOOTHNESS.md) are implemented and were audited again at
60 fixed ticks/second, with render interpolation and retained input edges. A
stall cannot trigger an unlimited catch-up loop. Blur/visibility changes clear
held input and accumulated time. AUTO caps device pixels, adapts after sustained
slow frames and recovers gradually; SHARP remains an explicit higher-resolution
option. Resize events are coalesced.

Decoded assets, rig weights, texture grading, Riley’s rim, stage plates and
lighting are prepared/cached. The connected painted skin now uses an indexed
WebGL batch when supported, with optimized Canvas fallback on unavailable/lost
contexts. Each live actor retains a bounded pose composite for unchanged poses.
Offscreen drawing is culled; simulation remains active. Fireballs, glows and mist
reuse textures. Light impact pauses fall from 70ms to 25ms, ordinary impacts have
a 90ms cooldown, and camera follow/punch/shake use smoother damping. Stage 5’s
incoming damage was adjusted after changing impact timing.

This follow-up removes the remaining per-frame brightness filter on painted
enemy hit flashes and the two live `shadowBlur` Callandor strokes. Alpha overlays
and layered cached-looking strokes preserve the flash/glow without filter passes.
`tools/pace.cjs` now specifies the requested real-rAF, LITE-disabled 1280×720 bot
run for Stage 1/3/5 wave 3 and the Stage 4 boss, for at least ten seconds each.

## Art and campaign retained

- All 77 manifested resources load. Painted far/mid/near layers and quilted floors
  cover all five stages, with a separate Taim roof. Portraits, sprite crops,
  cutscene stills, title art and logo remain connected. Missing art retries once
  and uses the playable fallback.
- Riley retains ten anchored painted frames, four distance-driven walking
  frames, his 96-unit height and updated portrait. Be’lal uses ten painted frames
  with his sword in-hand. Other ground characters keep their connected painted
  rigs, opposite arm swing, body bob and world-space sole contacts. Draghkar
  retains its airborne rendering. Lighting, grounded shadows and combat effects
  stay above the painted scenery; the HUD stays outside camera shake.
- Boss Continue preserves HP, attack-cycle progress, phase and Taim rescue state.
  Reload after Stage 4 still replays the pending Callandor reveal until its final
  caption is acknowledged. No boss attack has been removed.

## Verification

- `node tools/check.cjs`: **69 passes**, including combat, all boss checkpoints,
  Callandor persistence, art paths and fresh cache stamps.
- `node tools/smoothness-check.cjs`: **9 passes** for fixed ticks, edge retention,
  catch-up bounds, restoration after interpolation, teleports, camera damping,
  hit-stop cooldown, AUTO hysteresis and cleared input.
- `tools/smoothness-browser.cjs`: real DOM keyboard input/main-loop timestamps
  cover 60/120/144Hz, one-shot buffered attacks, blur pause/release, AUTO/SHARP,
  GPU/Canvas painted coverage and loss of the WebGL context. See its JSON report.
- `tools/review.cjs`: refreshed headless screenshots for all five stages, bosses,
  character closeups, walk strips, Callandor still, title and comparison boards.
  Normal load: **77 resources, zero errors/missing/unstamped requests**. Deliberate
  missing Stage 3 mid art: two attempts, then playable fallback.
- Rendered mesh-contact audit: zero measured drift/contact error for the eleven
  bind definitions, both facings, diagonal travel, changing speeds and 30/60/120Hz
  steps. The Be’lal bind definition is fallback-only; his active frames and Riley’s
  frames are represented by the separate strips/closeups, not by this mesh metric.
- Assisted soak: **50/50 clears**; all attacks active on all ten seeds for every
  boss. Natural pressure was retuned without changing boss health or Riley's
  damage: **41/50 clears**, with full attack coverage on every seed.

### Natural — three lives, no HP top-ups, seeds 1–10

| Stage | Clears | Seconds | Median damage | All boss attacks/seed |
| --- | --- | --- | --- | --- |
| 1 — Emond’s Field | 10/10 | 76.7–104.9 | 156.26 | 10/10 |
| 2 — Caemlyn | 8/10 | 58.2–72.1 | 255.00 | 10/10 |
| 3 — Shadar Logoth | 7/10 | 124.1–152.2 | 265.69 | 10/10 |
| 4 — Tear | 8/10 | 57.9–70.3 | 219.55 | 10/10 |
| 5 — Black Tower | 8/10 | 61.7–88.2 | 257.55 | 10/10 |

Natural mode still returns a nonzero exit status when individual seeds fail.
Ordinary healing pickups remain available. These are bot results, not child
playtesting.

### Pacing measurements

The inherited pre-pass 1280×720 wave-3 observation was roughly **11–15 fps**,
**83–100 ms p99**, **21–40 ms update+draw**, with every frame over 33 ms in
software raster; SwiftShader reduced JS work to about 8 ms but suffered repeated
650–850 ms compositor gaps. The committed post-pass synthetic report improved
desktop software-raster median rAF spacing from **116.7 ms to 66.6 ms** and its
five-stage median draw work from **112.9–120.4 ms to 15.6–50.7 ms**. These are
software-renderer results and remain well short of the 60 fps target.

A fresh real-rAF before/after comparison could not honestly be produced in this
container: neither Chromium nor the optional Playwright package is installed.
Running `node tools/pace.cjs` reports that limitation immediately; no fabricated
after figures are recorded. On an environment with Playwright/Chromium, the tool
records average fps, p95, p99, counts over 33/50 ms, and mean combined update/draw
work for four requested fights with runtime LITE forced off.

### Assisted — inherited 99 lives and HP top-ups, seeds 1–10

| Stage | Clears | Seconds | Median damage | All boss attacks/seed |
| --- | --- | --- | --- | --- |
| 1 | 10/10 | 75.2–132.4 | 188.36 | 10/10 |
| 2 | 10/10 | 55.9–70.3 | 237.00 | 10/10 |
| 3 | 10/10 | 125.3–157.8 | 297.37 | 10/10 |
| 4 | 10/10 | 56.4–74.4 | 267.60 | 10/10 |
| 5 | 10/10 | 60.1–104.0 | 263.50 | 10/10 |

Complete logs and browser reports are in [review/](review/README.md).

## Still weak / limits

- Headless CPU Canvas and SwiftShader are software renderers. The GPU-batched
  path substantially reduces CPU submission work, but this environment still
  exhibits compositor/driver stalls. It does not certify sustained 60fps on a
  physical phone. AUTO trades some sharpness for headroom; SHARP can be expensive.
- Riley and Be’lal still have four discrete walking frames. Interpolation smooths
  movement between ticks; it does not invent extra painted poses. Long cloaks can
  still look elastic, and the mesh-contact metric is not an anatomy/art-quality
  judgment. Trolloc variants share a supplied cutout.
- The first load does more preparation; large art files still make cold network
  loading and image memory significant. WebGL loss falls back to Canvas, whose
  worst crowded scenes remain heavier than the batched path.
- Stage 3 remains longest. Ten seeds are a small deterministic balance sample;
  no physical gamepad/phone campaign run or child playtest is claimed.
- Lido parity remains a visual-review judgment. Fresh comparison images are
  committed for review; automated checks do not certify that artistic gate.
- Floor/backdrop styles still differ in some stages. Dialogue uses text and
  synthesized audio; no recorded character voices are claimed.
