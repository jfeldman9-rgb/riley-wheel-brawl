// World-space footprints for Rhuidean tells: note bands, street ring, columns, shockwave.
import { VOLLEY_BANDS } from './stages.js';
import { bandMid } from './stage7-notes.js';

export function createWasteTells(scene) {
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
    sync(kit) {
      const live = new Set();
      const b = scene.bounds || { l: 0, r: 1280 };
      const field = kit?.s?.boss?.field;
      (field?.tells || []).forEach((t, i) => {
        const key = 'tell' + i + ':' + t.band;
        live.add(key);
        const band = VOLLEY_BANDS[t.band] || VOLLEY_BANDS[0];
        show(key, 's7note', (b.l + b.r) / 2, bandMid(t.band), Math.max(80, b.r - b.l), band[1] - band[0], 0.35, t.gold ? 2 : 0);
      });
      (field?.notes || []).forEach((n, i) => {
        const key = 'note' + i;
        live.add(key);
        show(key, 's7note', n.x, n.y, 44, 44, 1, n.gold ? 2 : 0);
      });
      const ring = kit?.street?.ring;
      if (ring) {
        live.add('ring');
        show('ring', 's7ring', ring.x, ring.y, 164, 72, ring.phase === 'tell' ? 0.7 : 1, ring.phase === 'tell' ? 0 : 1);
      }
      (kit?.arena?.columns || []).forEach((c, i) => {
        if (!(c.glow > 0)) return;
        const key = 'col' + i;
        live.add(key);
        show(key, 's7column', c.x, 560, 52, 360, c.glow >= 2 ? 0.95 : 0.6, c.glow >= 2 ? 2 : 1);
      });
      if (kit?.arena?.rain) {
        live.add('shards');
        show('shards', 's7shard', kit.arena.rain.x, 630, 220, 90, 0.9, 0);
      }
      if (kit?.arena?.shock) {
        const s = kit.arena.shock;
        live.add('shock');
        show('shock', 's7shield', s.x, s.y, Math.max(24, s.r * 2), Math.max(24, s.r * 2), 0.7, 0);
      }
      for (const e of scene.enemies || []) {
        for (let i = 0; i < (e.arrows?.length || 0); i++) {
          const a = e.arrows[i], key = 'arrow' + (e.id || 0) + ':' + i;
          live.add(key);
          show(key, 's7shard', a.x, a.y, 44, 18, 1, 1);
        }
        if (e.type === 'veiled' && e.state === 'attack' && e.alive) {
          const key = 'draw' + (e.id || 0);
          live.add(key);
          show(key, 's7note', (b.l + b.r) / 2, e.y, Math.max(80, b.r - b.l), 18, 0.3, 0);
        }
      }
      for (const [n, im] of sprites) if (!live.has(n)) { im.destroy?.(); sprites.delete(n); }
    },
    destroy() { for (const im of sprites.values()) im.destroy?.(); sprites.clear(); },
  };
}
