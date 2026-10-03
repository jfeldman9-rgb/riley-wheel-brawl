# Riley Wheel Brawl 2.0 — Stage 1 vertical slice (branch `rwb-2`)

Phaser 4.2.1 (WebGL) rewrite with frame-by-frame painted, normal-mapped sprites. This is a playable **Emond's Field** slice: 3 fight zones, then the Trolloc Chieftain. The live game is **1.1 on `rwb-w2`**; it and `main` are untouched. Stage 1 is playable, but the full acceptance gate in `plan/PLAN.md` §10 has **not passed**. The pinned library requests `webgl`/`experimental-webgl`; earlier descriptions calling the shipped renderer WebGL2 were inaccurate. The renderer has not been replaced.

Current review: draft [PR #13](https://github.com/jfeldman9-rgb/riley-wheel-brawl/pull/13), `rwb-2-stage1-evidence` into `rwb-2`. See [the hardening handoff](docs/stage1/TWO_HOUR_PASS.md) for verified fixes, reproduction commands and open gates.

- Play: serve the repository over HTTP(S), then open `index.html`, or use a commit-pinned raw.githack preview. Double-clicking a `file://` page does not support this module/asset-loading workflow.
- Keyboard:
  - WASD or arrows: move. Shift or double-tap: run.
  - J/E/Z: attack. Attack plus back: back kick. K/Space/X: jump. Jump then attack: flying kick.
  - L/Q/C: fireball. Esc/P or Enter during gameplay: pause.
  - Walk into a dazed foe to grab it.
- Touch: an on-screen stick and buttons appear only on touch devices. Gamepad works too.
- Gamepad Start starts the title, pauses/resumes a fight, continues game-over, and replays stage-clear.
- Graphics recovery: startup failures show a reload action. A lost graphics context pauses combat and keeps prior performance samples; the pause lifts only after Phaser finishes restoring resources. Reloading manually starts over.
- Perf: press H for the HUD or use **Performance report** to pause, inspect strict fight p95, reset, and copy/save a local JSON capture. Use the fight block for active combat, not the all-active average. No report is uploaded automatically.
- Acceptance target remains fight p95 ≤16.7 ms on both physical iPad and desktop. Software-renderer captures and regression tests are not device acceptance.
- Checks (Node 24, no npm install): `node --test tests/*.test.mjs`; `node tools/audit-stage1.mjs`. See `docs/stage1/TWO_HOUR_PASS.md` for the current gaps.
- Flags:
  - `?demo=1` autopilot, `?demo=boss-coverage&skip=boss` input-only boss coverage, `?skip=boss`, `?god=1`, `?hud=0`.
  - `?bloom=0`, `?lit=0`, `?rs=1|2`.
  - `?q=fixed|N` controls the quality governor.

Layout:
- `src/` holds the game modules.
- `assets/chars|bg|props|ui|audio|fonts` holds the packed atlases with normal maps, the backdrop plates, and the audio carried over from 1.2.
- `spike-art/` holds the spike's art pipeline.
- `STAGE1.md` is the slice report; `docs/stage1/` has the screenshots and contact sheets.
- The legacy `main.js` and `assets/riley*.webp` and `assets/trolloc*.webp` at the repo root are the spike prototype, kept for reference.
