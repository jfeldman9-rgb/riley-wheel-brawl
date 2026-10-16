import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './stage1-simulation.mjs';
import { patch } from './stage3-harness.mjs';

const { q } = await import('../../src/config.js');

export { withSeed, FULL_STAGE_SEEDS, patch };

export function stage5Simulation(opts = {}) {
  q.set('story', '0');
  if (opts.noPower) q.set('nopower', '1');
  else q.delete('nopower');
  let h;
  try {
    h = stage1Simulation({ ...opts, stage: 5 });
  } catch (err) {
    q.delete('story');
    q.delete('nopower');
    throw err;
  }
  patch(h.s);
  const origDestroy = h.destroy.bind(h);
  h.destroy = function () {
    try { origDestroy(); }
    finally { q.delete('story'); q.delete('nopower'); }
  };
  let steps = 0;
  while (!h.s.started && steps < 120) { h.step(); steps++; }
  return h;
}
