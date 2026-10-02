# Riley Wheel Brawl 2.0 — art-style spike (branch `rwb-2-spike`)

Throwaway prototype on **Phaser 4.2.1 (WebGL2)**. It proves out the 2.0 look: frame-by-frame painted sprites, lit with normal maps, on the Stage 1 (Emond's Field) snow set.

This branch has no shared history with `main`; 2.0 is a rewrite. The live 1.2 game is untouched.

- `index.html` + `main.js` — the playable lit test scene.
  - Keys: arrows/WASD to move, J or Z attack, K or X fireball, L lights on/off, B bloom, M quarter speed. Touch buttons work on iPad.
  - URL flags: `?demo=1` (auto choreography), `?clean=1` (no HUD), `?rs=1|2` (render scale).
- `assets/` — packed WebP atlases with matching normal-map atlases.
- `spike-art/` — house style, Riley spec, master art, generated sheets, and the slicing, registration, normal-map and packing tools. `SPIKE.md` has the spike results.

The HUD shows fps, p95 frame time, and frames over 33 ms. `window.__perf.summary` returns the same numbers.
