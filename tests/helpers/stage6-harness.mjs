import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './stage1-simulation.mjs';
import { patch } from './stage3-harness.mjs';

const { q } = await import('../../src/config.js');

export { withSeed, FULL_STAGE_SEEDS, patch };

export function stage6Simulation(opts = {}) {
  q.set('s6', '1');
  q.set('story', '0');
  if (opts.rand) q.set('rand', '1'); else q.delete('rand');
  if (opts.noPower) q.set('nopower', '1'); else q.delete('nopower');
  let h;
  try {
    h = stage1Simulation({ mode: 'mode' in opts ? opts.mode : '1', stage: 6 });
  } catch (err) {
    q.delete('s6'); q.delete('story'); q.delete('rand'); q.delete('nopower');
    throw err;
  }
  patch(h.s);
  if (opts.lag && h.s.bot) h.s.bot.lag = opts.lag;
  const origDestroy = h.destroy.bind(h);
  h.destroy = function () {
    try { origDestroy(); }
    finally { q.delete('s6'); q.delete('story'); q.delete('rand'); q.delete('nopower'); }
  };
  let steps = 0;
  while (!h.s.started && steps < 180) { h.step(); steps++; }
  return h;
}
