# Riley Wheel Brawl — current status

Branch `rwb-w2`; PR #4 targets `rwb-w1`. This smoothness pass starts from
`ae8022a421331ef99a6991f35d5e7ea33d8f4bc7`, including the later Riley 16,
Be’lal sprite and seamless-floor work. Runtime stamp: `?v=20260927-smooth1`.
No changes or merges to `main`; no PR merged.

## Smoothness pass

All [twenty improvements](SMOOTHNESS.md) are implemented. Gameplay advances at
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

- `node tools/check.cjs`: **66 passes**, including combat, all boss checkpoints,
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
  boss. Natural soak: **32/50 clears**, within 5–8/10 on every stage.

### Natural — three lives, no HP top-ups, seeds 1–10

| Stage | Clears | Seconds | Median damage | All boss attacks/seed |
| --- | --- | --- | --- | --- |
| 1 — Emond’s Field | 8/10 | 65.1–103.4 | 209.86 | 9/10 |
| 2 — Caemlyn | 5/10 | 54.6–72.1 | 299.73 | 10/10 |
| 3 — Shadar Logoth | 7/10 | 122.1–147.4 | 274.97 | 10/10 |
| 4 — Tear | 5/10 | 53.1–66.6 | 295.15 | 10/10 |
| 5 — Black Tower | 7/10 | 65.9–80.0 | 259.05 | 10/10 |

Natural mode still returns a nonzero exit status when individual seeds fail.
Stage 1 has one run that ends before full boss attack coverage. Ordinary healing
pickups remain available. These are bot results, not child playtesting.

### Assisted — inherited 99 lives and HP top-ups, seeds 1–10

| Stage | Clears | Seconds | Median damage | All boss attacks/seed |
| --- | --- | --- | --- | --- |
| 1 | 10/10 | 75.2–132.4 | 227.14 | 10/10 |
| 2 | 10/10 | 54.8–70.3 | 312.38 | 10/10 |
| 3 | 10/10 | 125.3–157.8 | 307.12 | 10/10 |
| 4 | 10/10 | 56.4–76.6 | 338.10 | 10/10 |
| 5 | 10/10 | 60.1–104.0 | 289.40 | 10/10 |

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
