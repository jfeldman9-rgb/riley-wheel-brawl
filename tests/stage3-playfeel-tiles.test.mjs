import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { TILES, TILE_BANDS } from '../src/stage3-hazards.js';
import { VW } from '../src/config.js';

for (const hz of [30, 60, 120]) test(`cutthroat does not lunge into a live tile at ${hz} Hz`, () => withSeed(hz, () => {
  assert.ok(readFileSync(new URL('../src/darkfriends.js', import.meta.url)).length <= 9216);
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);
    const c = placeC(s, -250);
    c.cool = 0;
    c.grabCool = 0;
    s.kit.tiles.push({ bands: [0], markers: [], t: 0, dir: 1, x: null, img: null, hit: new Set(), frame: 0, dustT: 0 });
    h.step(1 / hz);
    assert.notEqual(c.state, 'lunge');
    assert.ok(s.kit.tiles.length > 0);
    s.kit.tiles.length = 0;
    h.step(1 / hz);
    assert.equal(c.state, 'lunge');
  } finally { h.destroy(); }
}));

test('a roof tile shows an entry-side cue through the warning and drops it with the tile', () => withSeed(6, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s, kit = s.kit;
    arena(s);
    const seen = new Set();
    for (let n = 0; n < 40 && seen.size < 2; n++) {
      kit.clearHazards();
      kit.startTile();
      const k = kit.tiles[0];
      const onLeft = k.cue.x < s.camX + VW / 2;
      if (k.dir > 0) assert.equal(onLeft, true, 'a right-moving tile enters from the left');
      else assert.equal(onLeft, false, 'a left-moving tile enters from the right');
      seen.add(k.dir);
      for (let i = 0; i < 8; i++) {
        h.step();
        assert.equal(k.cue.dead, undefined);
        assert.ok(k.t < TILES.warn);
        const stillLeft = k.cue.x < s.camX + VW / 2;
        assert.equal(stillLeft, k.dir > 0);
      }
    }
    assert.deepEqual([...seen].sort(), [-1, 1]);

    kit.clearHazards();
    kit.startTile();
    const live = kit.tiles[0];
    assert.equal(live.cue.dead, undefined);
    kit.clearHazards();
    assert.equal(live.cue.dead, true);

    kit.startTile();
    const flown = kit.tiles[0];
    flown.t = TILES.warn;
    flown.dir = 1;
    h.step();
    assert.equal(flown.cue.dead, undefined);
    flown.x = s.camX + VW + 200;
    h.step();
    assert.equal(flown.cue.dead, true);
    assert.equal(kit.tiles.includes(flown), false);
  } finally { h.destroy(); }
}));

test('holding an enemy still leaves a safe band before the tile strikes', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s, kit = s.kit;
    arena(s);
    for (let band = 0; band < 3; band++) {
      const safeBand = band === 1 ? 0 : 1;
      const walkDir = safeBand > band ? 1 : -1;
      const worstY = walkDir > 0 ? TILE_BANDS[band][0] : TILE_BANDS[band][1] - 1;
      kit.clearHazards();
      s.enemies.length = 0;
      s.riley.held = null;
      s.riley.grabbedBy = null;
      s.riley.vx = s.riley.vy = s.riley.z = 0;
      s.riley.x = 640;
      s.riley.y = worstY;
      s.riley.facing = 1;
      s.riley.state = 'idle';
      s.inp.held = {};
      s.inp.buf = {};
      const e = placeC(s, 420);
      e.grabbed(s.riley);
      s.riley.held = e;
      s.riley.setState('hold', 'hold');
      s.riley.holdT = 0;
      kit.startTile();
      const tile = kit.tiles[0];
      tile.bands = [band];
      s.inp.press('jump');
      s.inp.held = { up: walkDir < 0, down: walkDir > 0 };
      let reached = false;
      for (let frame = 0; frame < 180; frame++) {
        h.step();
        const bandNow = kit.bandOf(s.riley.y);
        const live = kit.tiles.includes(tile);
        const struck = !live || (tile.img && Math.abs(tile.x - s.riley.x) < TILES.hitDx && tile.bands.includes(bandNow));
        if (!tile.bands.includes(bandNow)) { reached = !struck; break; }
        if (struck) break;
      }
      s.inp.held = {};
      assert.ok(reached, `band ${band} from hold reached a safe band before the strike (y ${s.riley.y}, state ${s.riley.state})`);
    }
  } finally { h.destroy(); }
}));
