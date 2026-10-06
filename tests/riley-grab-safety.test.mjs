import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage1-simulation.mjs';
import { Riley } from '../src/riley.js';

for (const n of [1, 2]) {
  for (const seed of FULL_STAGE_SEEDS) {
    test(`Riley never enters grabbed or escape in Stage ${n}, seed ${seed}`, () => withSeed(seed, () => {
      const origSetState = Riley.prototype.setState;
      const recordedStates = new Set();
      Riley.prototype.setState = function(state, anim, ts) {
        recordedStates.add(state);
        return origSetState.call(this, state, anim, ts);
      };

      const h = stage1Simulation({ mode: '1', stage: n === 2 ? 2 : undefined });
      const s = h.s;
      let hasMashEnemy = false;

      try {
        for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) {
          h.step();
          assert.ok(!s.riley.grabbedBy, `frame ${frame}: grabbedBy must not be set`);
          if (s.enemies.some(e => typeof e.mash === 'function')) {
            hasMashEnemy = true;
          }
        }
        assert.equal(s.ended, true, 'stage ended');
        assert.ok(!recordedStates.has('grabbed'), 'Riley never entered grabbed state');
        assert.ok(!recordedStates.has('escape'), 'Riley never entered escape state');
        assert.equal(hasMashEnemy, false, 'no enemy with mash exists in Stage 1 or 2');
      } finally {
        Riley.prototype.setState = origSetState;
        h.destroy();
      }
    }));
  }
}
