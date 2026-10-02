# Riley Wheel Brawl 2.0 — Stage 1 vertical slice (branch `rwb-2`)

Phaser 4.2.1 (WebGL2) rewrite with frame-by-frame painted, normal-mapped sprites. This is a playable **Emond's Field** slice: 3 fight zones, then the Trolloc Chieftain. The live 1.2 game (`main`) is untouched.

- Play: open `index.html` (any static server, or the raw.githack preview link for a commit).
- Keyboard:
  - WASD or arrows: move. Shift or double-tap: run.
  - J/E/Z: attack. Attack plus back: back kick. K/Space/X: jump. Jump then attack: flying kick.
  - L/Q/C: fireball. Esc/P: pause.
  - Walk into a dazed foe to grab it.
- Touch: an on-screen stick and buttons appear only on touch devices. Gamepad works too.
- Perf: the HUD readout (press H) and `window.__perf.summary` in the console. Use the `fight` block for numbers taken while enemies are engaged.
- Flags:
  - `?demo=1` autopilot, `?skip=boss`, `?god=1`, `?hud=0`.
  - `?bloom=0`, `?lit=0`, `?rs=1|2`.
  - `?q=fixed|N` controls the quality governor.

Layout:
- `src/` holds the game modules.
- `assets/chars|bg|props|ui|audio|fonts` holds the packed atlases with normal maps, the backdrop plates, and the audio carried over from 1.2.
- `spike-art/` holds the spike's art pipeline.
- `STAGE1.md` is the slice report; `docs/stage1/` has the screenshots and contact sheets.
- The legacy `main.js` and `assets/riley*.webp` and `assets/trolloc*.webp` at the repo root are the spike prototype, kept for reference.
