import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { TILES } from '../src/stage3-hazards.js';
import { VW } from '../src/config.js';

for (const hz of [30, 60, 120]) for (const dir of [-1, 1]) {
  test(`tile sweep excludes warning time at ${hz} Hz moving ${dir}`, () => withSeed(9, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      const kit = s.kit;
      kit.startTile();
      const tile = kit.tiles[0]; tile.dir = dir;
      const dt = 1 / hz;
      // Deliberately cross the warning boundary between two updates.
      tile.t = TILES.warn - dt / 2;
      const edge = dir > 0 ? -120 : VW + 120;
      kit.updateHazards(dt);
      assert.ok(tile.img);
      assert.ok(Math.abs(tile.x - (edge + dir * TILES.speed * dt / 2)) < 1e-8);
      const saved = [tile.t, tile.x];
      s.setPauseReason('manual', true);
      for (let i = 0; i < hz; i++) kit.updateHazards(dt);
      assert.deepEqual([tile.t, tile.x], saved);
      s.setPauseReason('manual', false);
      for (let i = 0; i < hz / 2; i++) kit.updateHazards(dt);
      const expected = edge + dir * TILES.speed * (tile.t - TILES.warn);
      assert.ok(Math.abs(tile.x - expected) < 1e-8);
    } finally { h.destroy(); }
  }));
}

test('a tile created exactly at warning completion has not travelled yet', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s); s.kit.startTile();
    const tile = s.kit.tiles[0]; tile.dir = 1;
    s.kit.updateTiles(TILES.warn);
    assert.equal(tile.x, -120);
    s.kit.updateTiles(0.05);
    assert.ok(Math.abs(tile.x - (-120 + TILES.speed * 0.05)) < 1e-8);
  } finally { h.destroy(); }
}));
