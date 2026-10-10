// Hazard escapes use the same sampled enemies as the Stage 6 controller.
const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run }; return true; };

export function leave(bot, R, th, incoming) {
  for (const n of th.nets || []) {
    const y0 = n.band?.[0], y1 = n.band?.[1];
    if (y0 == null || Math.abs(R.x - n.x) >= 280) continue;
    const mid = (y0 + y1) / 2;
    if (R.y >= y0 - 18 && R.y <= y1 + 18) return go(bot, 0, R.y >= mid ? 1 : -1, 1);
  }
  for (const l of th.lamps || []) if (Math.hypot(R.x - l.x, R.y - l.y) < 150) return go(bot, Math.sign(R.x - l.x) || -1, R.y > l.y ? 1 : -1, 1);
  for (const p of th.pools || []) if (Math.hypot(R.x - p.x, R.y - p.y) < 120) return go(bot, Math.sign(R.x - p.x) || 1, R.y >= p.y ? 1 : -1, 1);
  for (const n of th.lines || []) {
    const b = (bot.s.bands || [])[n.band];
    if (!b) continue;
    const mid = (b[0] + b[1]) / 2;
    if (R.y >= b[0] - 16 && R.y <= b[1] + 16) {
      const y = R.y >= mid ? 1 : -1;
      const foe = bot.s.enemies.filter(e => e.alive && e.type !== 'hatch' && !e.entering).find(e => incoming(e, R) && Math.sign(e.y - R.y) === y);
      return go(bot, foe ? Math.sign(R.x - foe.x) || -1 : 0, y, 1);
    }
  }
  return null;
}

