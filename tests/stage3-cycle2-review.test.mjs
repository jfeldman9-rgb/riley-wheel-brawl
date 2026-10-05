// Cycle 2 review: tile telegraph, unlit shadow FX, wisp cap, watermark.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { TILE_BANDS, TILES } from '../src/stage3-hazards.js';
import { STAGE3 } from '../src/stages.js';
import { VH, VW } from '../src/config.js';

function watchLighting(s) {
  const orig = s.add.image.bind(s.add);
  s.add.image = (...args) => {
    const img = orig(...args);
    const set = img.setLighting.bind(img);
    img.setLighting = function(on) { this.lit = on; return set(on); };
    return img;
  };
}

test('roof tile sweep stays on the marked band and keeps its lane stripes', () => withSeed(11, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = { ...STAGE3.zones[2], waves: [] }; s.locked = true; s.wave = 0;
    kit.startTile();
    const tile = kit.tiles[0];
    // Outer bands, unsorted. The old span centered the cluster on the safe middle lane.
    tile.bands = [2, 0];
    tile.t = TILES.warn;
    kit.updateTiles(1 / 60);
    const mid = (TILE_BANDS[2][0] + TILE_BANDS[2][1]) / 2;
    const safeMid = (TILE_BANDS[1][0] + TILE_BANDS[1][1]) / 2;
    assert.ok(tile.img, 'sweep sprite exists at the warning');
    assert.ok(Math.abs(tile.img.y - mid) < 1, `sprite y ${tile.img.y} should be band 2 at ${mid}`);
    assert.ok(Math.abs(tile.img.y - safeMid) > 20, 'sprite is not centered on the safe lane');
    assert.ok(tile.markers.length > 0);
    assert.ok(tile.markers.every(m => m.dead !== true), 'lane stripes stay visible during the sweep');
    tile.dir = 1;
    tile.x = s.camX + VW + 200;
    kit.updateTiles(1 / 60);
    assert.equal(kit.tiles.length, 0);
    assert.ok(tile.markers.every(m => m.dead === true), 'stripes leave with the tile');
  } finally { h.destroy(); }
}));

test('shadow pools, bursts and the Fade glimpse are unlit, and wisps stop at two', () => withSeed(12, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    watchLighting(s);
    const kit = s.kit;
    kit.shadowPool({ x: 400, y: 620, t: 0 });
    assert.equal(kit.pools[0].img.lit, false);
    kit.shadowBurst(420, 620);
    assert.equal(kit.bursts[0].img.lit, false);
    kit.onZoneClear(2);
    assert.equal(kit.glimpse.img.lit, false);
    kit.startTile();
    const tile = kit.tiles[0];
    tile.t = TILES.warn;
    kit.updateTiles(1 / 60);
    assert.equal(tile.img.lit, true, 'the tile cluster is still lit by the street torches');
    const copy = () => ({ sprite: {}, y: 600 });
    kit.copyWisps(copy());
    kit.copyWisps(copy());
    kit.copyWisps(copy());
    assert.equal(kit.copies.length, 2);
  } finally { h.destroy(); }
}));

test('PLACEHOLDER ART clears the perf readout and is not recomputed every frame', async () => {
  const { PLACEHOLDER_TAG_Y, HUD } = await import('../src/hud.js');
  const perfTop = (VH - 8) - (12 * 2 + 2 * 2);
  assert.ok(PLACEHOLDER_TAG_Y <= perfTop - 4, `tag y ${PLACEHOLDER_TAG_Y} overlaps perf top ${perfTop}`);

  let gets = 0;
  const metas = new Proxy({ cutthroat: { placeholder: true } }, {
    get(target, prop, receiver) { gets++; return Reflect.get(target, prop, receiver); },
  });
  const fake = Object.create(HUD.prototype);
  fake.phTag = { setVisible() {} };
  fake.phShown = false;
  fake.updateWatermark({ metas });
  const afterFirst = gets;
  assert.ok(afterFirst > 0);
  for (let i = 0; i < 30; i++) fake.updateWatermark({ metas });
  assert.equal(gets, afterFirst);
});
