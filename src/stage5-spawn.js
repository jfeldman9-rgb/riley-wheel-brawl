// Prefer the authored spot. Use another free spot when Riley occupies it.
import { LAYOUT5 } from './stage5-def.js';
export function safeStage5Spot(scene, preferred, key) {
  const R = scene.riley, zone = Math.max(0, scene.zoneI || 0);
  const enemies = (scene.enemies || []).filter(e => e.alive && e.type === (key === 'pods' ? 'sporepod' : 'stalker'));
  const clear = p => p && (!R || Math.hypot(p.x - R.x, p.y - R.y) >= 120) && !enemies.some(e => e.x === p.x && e.y === p.y);
  if (clear(preferred)) return preferred;
  const spots = scene.kit?.lay?.[key] || LAYOUT5[key];
  const free = spots.find(p => p.zone === zone && clear(p));
  if (free) return free;
  const b = scene.zone || scene.bounds || { l: 0, r: 1280 };
  // No free authored spot: choose open ground away from Riley and the exit.
  for (let x = b.l + 120; x <= b.r - 240; x += 160) {
    const p = { x, y: preferred?.y || 630 };
    if (clear(p)) return p;
  }
  return { x: b.l + 120, y: 630 };
}
