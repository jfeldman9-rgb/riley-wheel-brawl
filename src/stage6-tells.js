// World-space footprints for the Stone's existing hazard tells. No gameplay clock here.
import { BANDS, bandY } from './stage6-arena.js';

export function createStoneTells(scene) {
  const sprites = new Map();
  function show(n, key, x, y, w, h, alpha, frame = 0) {
    let im = sprites.get(n);
    if (!im) {
      im = scene.add?.image?.(x, y, key);
      if (!im) return;
      im.setOrigin?.(0.5); im.setDepth?.(950); sprites.set(n, im);
    }
    im.setPosition?.(x, y); im.setFrame?.(frame); im.setDisplaySize?.(w, h); im.setAlpha?.(alpha); im.setVisible?.(true);
  }
  return {
    sync(stone) {
      const live = new Set();
      for (const n of stone?.nets || []) {
        live.add(n); const b = BANDS[n.band];
        show(n, 's6net', n.x, bandY(n.band), 400, b[1] - b[0], n.phase === 'tell' ? 0.65 : 0.9);
      }
      for (const n of stone?.lamps || []) {
        live.add(n); show(n, 's6lamp', n.x, n.y, 160, 160, n.phase === 'swing' ? 0.65 : 1, n.phase === 'swing' ? 0 : 2);
      }
      for (const n of stone?.pools || []) { live.add(n); show(n, 's6oil', n.x, n.y, 160, 160, 0.75, 1); }
      const b = scene.bounds || { l: 0, r: 1280 };
      for (const n of stone?.lines || []) {
        live.add(n); const band = BANDS[n.band];
        show(n, 's6streak', (b.l + b.r) / 2, bandY(n.band), b.r - b.l, band[1] - band[0], n.phase === 'tell' ? 0.6 : 1);
      }
      for (const [n, im] of sprites) if (!live.has(n)) { im.destroy?.(); sprites.delete(n); }
    },
    destroy() { for (const im of sprites.values()) im.destroy?.(); sprites.clear(); },
  };
}
