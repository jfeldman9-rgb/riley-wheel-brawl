import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { TILE_BANDS, TILES } from '../src/stage3-hazards.js';
import { Stage3Kit } from '../src/stage3.js';
import { Stage2Kit } from '../src/stage2.js';
import { STAGE3 } from '../src/stages.js';
import { LANE_TOP, LANE_BOT } from '../src/config.js';
import { Myrddraal } from '../src/myrddraal.js';
import { Zealot } from '../src/whitecloaks.js';

test('roof tiles mark lane-third bands at least 0.9 s ahead, only on the rooftops, and always leave a safe band next to Riley', () => withSeed(1, () => {
  const expectedBands = Array.from({ length: 3 }, (_, i) => [
    Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * i / 3),
    Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * (i + 1) / 3),
  ]);
  assert.deepEqual(TILE_BANDS, expectedBands);

  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = STAGE3.zones[2]; s.locked = true; s.wave = 0;

    for (let seed = 1; seed <= 5; seed++) {
      withSeed(seed, () => {
        for (let band = 0; band < 3; band++) {
          s.riley.y = (TILE_BANDS[band][0] + TILE_BANDS[band][1]) / 2;
          for (let t = 0; t < 6; t++) {
            kit.startTile();
            const tile = kit.tiles.at(-1);
            assert.ok([1, 2].includes(tile.bands.length), 'bands length in {1, 2}');
            assert.ok(tile.bands.includes(band), 'includes Riley band');
            const unmarked = [0, 1, 2].filter(b => !tile.bands.includes(b));
            assert.ok(unmarked.some(u => Math.abs(u - band) === 1), 'unmarked band is adjacent to Riley band');
            for (const m of tile.markers) m.destroy();
            kit.tiles.length = 0;
          }
        }
      });
    }

    kit.tileT = 0.05;
    while (kit.tiles.length === 0) h.step();
    const k = kit.tiles[0];
    while (k.t < 0.88) {
      assert.equal(k.img, null, 'no tile image before warn');
      h.step();
    }
    while (k.t < TILES.warn) h.step();
    assert.ok(k.img, 'tile image exists at warn');

    for (let step = 0; step < 1200; step++) {
      h.step();
      assert.ok(kit.tiles.length <= 1, 'at most 1 tile at a time');
    }

    for (const z of [0, 1, 3]) {
      s.zoneI = z; s.zone = STAGE3.zones[z]; s.locked = true; s.wave = 0;
      kit.clearHazards();
      const tilesBefore = kit.stats.tiles;
      for (let step = 0; step < 1200; step++) h.step();
      assert.equal(kit.tiles.length, 0, `zone ${z} produces 0 active tiles`);
      assert.equal(kit.stats.tiles, tilesBefore, `zone ${z} produces 0 tiles over 20 s`);
    }
  } finally { h.destroy(); }
}));

test('Riley in a safe band is never hit; Riley in the marked band at strike time is hit once for 9 and knocked down', () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.god = false;
    s.zoneI = 2; s.zone = STAGE3.zones[2]; s.locked = true; s.wave = 0;

    s.riley.y = (TILE_BANDS[0][0] + TILE_BANDS[0][1]) / 2;
    kit.startTile();
    const tile1 = kit.tiles[0];
    const safeBand = [0, 1, 2].find(b => !tile1.bands.includes(b));
    s.riley.y = (TILE_BANDS[safeBand][0] + TILE_BANDS[safeBand][1]) / 2;
    const hp0 = s.riley.hp;
    while (kit.tiles.length > 0) h.step();
    assert.equal(s.riley.hp, hp0);
    assert.equal(kit.stats.tileHits, 0);
    assert.notEqual(s.riley.state, 'down');

    s.riley.y = (TILE_BANDS[0][0] + TILE_BANDS[0][1]) / 2;
    kit.startTile();
    const tile2 = kit.tiles[0];
    assert.ok(tile2.bands.includes(0));
    while (kit.tiles.length > 0 && kit.stats.tileHits === 0) h.step();
    assert.equal(s.riley.hp, hp0 - 9);
    assert.equal(s.riley.state, 'down');
    assert.equal(kit.stats.tileHits, 1);
  } finally { h.destroy(); }
}));

test('a safe band is reachable within the warning from every band, even from mid-combo or hurt', () => withSeed(4, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = { ...STAGE3.zones[2], waves: [] }; s.locked = true; s.wave = 0;

    for (let band = 0; band < 3; band++) {
      const safeBand = band === 1 ? 0 : 1;
      const walkDir = safeBand > band ? 1 : -1;
      const worstY = walkDir > 0 ? TILE_BANDS[band][0] : TILE_BANDS[band][1] - 1;

      for (const startState of ['idle', 'combo3', 'hurt']) {
        kit.clearHazards();
        s.riley.state = 'idle'; s.riley.cur = 'riley_idle';
        s.riley.vx = s.riley.vy = s.riley.z = 0;
        s.riley.x = 640; s.riley.y = worstY;
        s.inp.held = {};

        if (startState === 'combo3') {
          s.inp.press('attack'); for (let f = 0; f < 15; f++) h.step();
          s.inp.press('attack'); for (let f = 0; f < 15; f++) h.step();
          s.inp.press('attack'); for (let f = 0; f < 15; f++) h.step();
        } else if (startState === 'hurt') {
          s.riley.takeHit({ dmg: 1, kind: 'light', kb: 0 }, { x: s.riley.x - 10 });
        }

        kit.clearHazards();
        kit.startTile();
        const tile = kit.tiles[0];
        tile.bands = [band];

        s.inp.held = { up: walkDir < 0, down: walkDir > 0 };
        let reachedUnmarked = false, reachedTime = 0, reachedBeforeStrike = false;

        for (let frame = 0; frame < 120; frame++) {
          h.step();
          const currentBand = kit.bandOf(s.riley.y);
          if (!tile.bands.includes(currentBand) && !reachedUnmarked) {
            reachedUnmarked = true;
            reachedTime = tile.t;
            reachedBeforeStrike = tile.img === null || (tile.dir > 0 ? tile.x < s.riley.x : tile.x > s.riley.x);
          }
        }
        s.inp.held = {};
        assert.ok(reachedUnmarked, `band ${band} from ${startState} must reach safe band`);
        assert.ok(reachedTime <= TILES.warn + 1 / 60, `band ${band} from ${startState} reached at ${reachedTime}`);
        assert.ok(reachedBeforeStrike, `band ${band} from ${startState} must reach safe band before strike`);
      }
    }
  } finally { h.destroy(); }
}));

test('tiles hit enemies for 14 and break a cutthroat\'s hold', () => withSeed(2, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = { ...STAGE3.zones[2], waves: [] }; s.locked = true; s.wave = 0;
    s.camX = s.zone.l; s.bounds = { l: s.zone.l, r: s.zone.r }; s.riley.x = s.camX + 300;

    const z = new Zealot(s, s.camX + 350, 630);
    z.entering = false;
    s.enemies.push(z);
    const zBand = kit.bandOf(z.y), hpBefore = z.hp;

    kit.startTile();
    const tile1 = kit.tiles[0];
    tile1.bands = [zBand];
    tile1.t = TILES.warn;
    h.step();
    tile1.x = z.x - 10;
    h.step();

    assert.equal(z.hp, hpBefore - 14);
    assert.equal(z.state, 'down');
    assert.equal(kit.stats.tileEnemyHits, 1);

    kit.clearHazards();
    const c = placeC(s, -46);
    c.startHold(s.riley);
    assert.equal(s.riley.grabbedBy, c);
    const rBand = kit.bandOf(s.riley.y);

    kit.startTile();
    const tile2 = kit.tiles[0];
    tile2.bands = [rBand];
    tile2.t = TILES.warn;
    h.step();
    tile2.x = s.riley.x - 10;
    h.step();

    assert.equal(s.riley.grabbedBy, null);
    assert.equal(kit.stats.breaks, 1);
  } finally { h.destroy(); }
}));

test('pause freezes the tile, pool and fear timers', () => withSeed(5, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = STAGE3.zones[2]; s.locked = true; s.wave = 0;

    const f = new Myrddraal(s, 900, 630);
    f.entering = false; f.introDone = true; f.auraOn = true;
    s.enemies.push(f);
    s.boss = f;

    kit.startTile();
    const tile = kit.tiles[0];
    const pool = { x: 800, y: 630, t: 0 };
    kit.shadowPool(pool);
    f.state = 'sunk';
    f.pool = pool;
    f.fear = 0.5; f.st = 0.3;

    s.setPauseReason('manual', true);
    const tileTBefore = tile.t, poolTBefore = pool.t, fearBefore = f.fear, stBefore = f.st, kitTileTBefore = kit.tileT;

    for (let i = 0; i < 120; i++) h.step();

    assert.equal(tile.t, tileTBefore);
    assert.equal(pool.t, poolTBefore);
    assert.equal(f.fear, fearBefore);
    assert.equal(f.st, stBefore);
    assert.equal(kit.tileT, kitTileTBefore);

    s.setPauseReason('manual', false);
    for (let i = 0; i < 10; i++) h.step();

    assert.ok(tile.t > tileTBefore);
    assert.ok(pool.t > poolTBefore);
    assert.ok(f.st > stBefore);
  } finally { h.destroy(); }
}));

test('the worst-case phase-3 garden keeps active lights at 10 or fewer, and hazards add no lights', () => withSeed(6, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.camX = 3920;
    kit.update(0.1);

    const f = new Myrddraal(s, 4200, 630);
    f.entering = false; f.introDone = true; f.hp = 100;
    s.enemies.push(f); s.boss = f; f.phase = 3;
    f.makeCopies(); f.auraOn = true;

    s.powers.activate('fireshield');
    s.dropPickup(4100, 620, 'heal');
    kit.dropRibbon();
    s.spawnFireball(s.riley);

    for (let i = 0; i < 180; i++) {
      if (i === 60) { s.fireballs = []; f.dispelT = 0; }
      h.step();
      assert.ok(kit.lightBudget.active <= 10, `active lights ${kit.lightBudget.active} <= 10 at step ${i}`);
    }

    if (f.copies.length < 2) f.makeCopies();
    for (const p of s.pickups.slice()) {
      if (p.kind === 'ribbon') { kit.collectRibbon(p); s.removePickup(p); }
    }
    const lightsBefore = h.resources().lights;
    kit.startTile();
    const pool = { x: 4000, y: 630, t: 0 };
    kit.shadowPool(pool);
    kit.copyWisps(f.copies[0]);
    kit.copyWisps(f.copies[1]);
    kit.shadowBurst(4050, 620);
    kit.shadowBurst(4060, 620);
    kit.shadowBurst(4070, 620);
    kit.onZoneClear(2);
    const lightsAfter = h.resources().lights;
    assert.equal(lightsAfter, lightsBefore);
  } finally { h.destroy(); }
}));

test('clearHazards at victory destroys every tile, marker, pool, wisp emitter, burst and the glimpse', () => withSeed(7, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = STAGE3.zones[2]; s.locked = true; s.wave = 0;

    kit.startTile();
    const tile = kit.tiles[0];
    tile.t = TILES.warn;
    kit.updateTiles(1 / 60);

    const pool = { x: 500, y: 630, t: 0 };
    const poolEntry = kit.shadowPool(pool);
    const f = new Myrddraal(s, 900, 630);
    f.entering = false; f.introDone = true;
    s.enemies.push(f); s.boss = f;
    f.makeCopies();

    kit.shadowBurst(600, 600);
    const burst = kit.bursts[0];
    kit.onZoneClear(2);
    const glimpse = kit.glimpse;

    assert.ok(kit.tiles.length > 0);
    assert.ok(kit.pools.length > 0);
    assert.ok(kit.copies.length > 0);
    assert.ok(kit.bursts.length > 0);
    assert.ok(kit.glimpse);

    kit.clearHazards();

    assert.equal(tile.img.dead, true);
    for (const m of tile.markers) assert.equal(m.dead, true);
    assert.equal(poolEntry.img.dead, true);
    assert.equal(pool.fx, null);
    for (const c of kit.copies) assert.equal(c.em.dead, true);
    assert.equal(burst.img.dead, true);
    assert.equal(glimpse.img.dead, true);

    assert.equal(kit.tiles.length, 0);
    assert.equal(kit.pools.length, 0);
    assert.equal(kit.copies.length, 0);
    assert.equal(kit.bursts.length, 0);
    assert.equal(kit.drops.length, 0);
    assert.equal(kit.glimpse, null);

    const t = kit.threats();
    assert.equal(t.arrows.length, 0);
    assert.equal(t.sky.length, 0);
    assert.equal(t.torches.length, 0);
    assert.equal(t.beams.length, 0);
    assert.equal(t.tiles.length, 0);

    assert.doesNotThrow(() => kit.clearHazards());

    kit.startTile();
    const p2 = { x: 550, y: 630, t: 0 };
    kit.shadowPool(p2);
    s.bossDown(f);
    assert.equal(kit.tiles.length, 0);
    assert.equal(kit.pools.length, 0);
  } finally { h.destroy(); }
}));

test('the Fade-far glimpse plays exactly once per run', () => withSeed(8, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  const origImage = s.add.image.bind(s.add);
  s.add.image = (...args) => {
    const img = origImage(...args);
    const origSf = img.setScrollFactor.bind(img);
    img.setScrollFactor = function(sx, sy) {
      this.scrollFactorX = sx;
      this.scrollFactorY = sy;
      return origSf(sx, sy);
    };
    img.setFrame = function(f) {
      this.frame = f;
      return this;
    };
    return img;
  };
  try {
    arena(s);
    const kit = s.kit;

    kit.onZoneClear(0);
    assert.equal(kit.stats.glimpses, 0);
    assert.equal(kit.glimpse, null);

    kit.onZoneClear(1);
    assert.equal(kit.stats.glimpses, 0);
    assert.equal(kit.glimpse, null);

    kit.onZoneClear(2);
    assert.equal(kit.stats.glimpses, 1);
    assert.ok(kit.glimpse);
    assert.equal(kit.glimpse.img.key, 'fade_far');
    assert.equal(kit.glimpse.img.scrollFactorX, 0.3);

    kit.onZoneClear(2);
    assert.equal(kit.stats.glimpses, 1);

    const g = kit.glimpse;
    const f0 = g.img.frame?.name ?? g.img.frame ?? 0;
    for (let i = 0; i < 15; i++) h.step();
    const f1 = g.img.frame?.name ?? g.img.frame ?? 0;
    assert.notEqual(f0, f1);

    for (let i = 0; i < 200; i++) h.step();
    assert.equal(kit.glimpse, null);

    const kit2 = new Stage3Kit(s);
    kit2.onZoneClear(2);
    assert.equal(kit2.stats.glimpses, 1);
    assert.ok(kit2.glimpse);
  } finally {
    s.add.image = origImage;
    h.destroy();
  }
}));

test('shadow pools, copy wisps and bursts follow the Myrddraal\'s own hooks', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    const f = new Myrddraal(s, 1000, 630);
    f.entering = false; f.introDone = true;
    s.enemies.push(f); s.boss = f;

    f.setState('blinkout', 'blinkout');
    f.sprite.anims.isPlaying = false;
    f.update(1 / 60);

    assert.equal(f.state, 'sunk');
    assert.equal(kit.pools.length, 1);
    const poolImg = kit.pools[0].img;
    assert.ok(poolImg);

    f.st = 0.6;
    f.update(1 / 60);
    assert.equal(f.state, 'blinkin');
    assert.equal(kit.pools.length, 0);
    assert.equal(poolImg.dead, true);

    assert.doesNotThrow(() => kit.shadowPoolEnd(null));
    assert.doesNotThrow(() => kit.shadowPoolEnd({ fx: null }));

    f.makeCopies();
    assert.equal(f.copies.length, 2);
    assert.equal(kit.copies.length, 2);

    const c0 = f.copies[0];
    const em0 = kit.copies.find(c => c.copy === c0).em;
    c0.vanish(true);

    assert.equal(kit.copies.length, 1);
    assert.equal(em0.dead, true);
    assert.ok(kit.bursts.length >= 1);
    const burst = kit.bursts[0];

    for (let i = 0; i < 35; i++) kit.updateHazards(1 / 60);
    assert.equal(burst.img.dead, true);
    assert.equal(kit.bursts.length, 0);

    assert.doesNotThrow(() => kit.copyGone(c0));
  } finally { h.destroy(); }
}));

test('threats() keeps the Stage 2 keys and adds tiles, drops, pools, copies and aura', () => withSeed(10, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;

    const t = kit.threats();
    for (const k of ['arrows', 'sky', 'beams', 'torches', 'tiles', 'drops', 'pools', 'copies']) {
      assert.ok(Array.isArray(t[k]), k);
    }
    assert.equal(t.volley, null);
    assert.equal(t.aura, false);

    const c = placeC(s, 100);
    c.dropIn();
    assert.ok(kit.threats().drops.includes(c));
    c.state = 'idle';
    kit.updateHazards(1 / 60);
    assert.ok(!kit.threats().drops.includes(c));

    const f = new Myrddraal(s, 1000, 630);
    s.boss = f;
    assert.equal(kit.threats().aura, false);
    f.auraOn = true;
    assert.equal(kit.threats().aura, true);
    f.dispelT = 2.0;
    assert.equal(kit.threats().aura, false);
  } finally { h.destroy(); }
}));

test('Stage 3 drops and collects Twinkle Toes\' ribbon through the inherited Stage 2 code', () => withSeed(11, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 1; s.zone = STAGE3.zones[1]; s.locked = true; s.wave = -1; s.waveGap = 0;
    s.time0 = s.time.now;

    while (!s.pickups.some(p => p.kind === 'ribbon')) h.step();
    const ribbon = s.pickups.find(p => p.kind === 'ribbon');
    assert.ok(ribbon, 'ribbon pickup must spawn in zone 1 wave 0');

    s.riley.x = ribbon.x; s.riley.y = ribbon.y;
    h.step();
    assert.equal(kit.ribbons, 1);
    assert.equal(kit.stats.ribbon, 1);
    assert.ok(h.observations.hud.some(o => o.method === 'ribbon' && o.args[0] === 1));

    kit.ribbonDropped = false;
    kit.dropRibbon();
    const uncollected = s.pickups.find(p => p.kind === 'ribbon');
    assert.ok(uncollected, 'second ribbon dropped');
    kit.onZoneClear(1);
    assert.equal(s.pickups.some(p => p.kind === 'ribbon'), false, 'auto-collected on zone clear');
    assert.equal(kit.ribbons, 2);

    assert.equal(Stage3Kit.prototype.dropRibbon, Stage2Kit.prototype.dropRibbon);
    assert.equal(Stage3Kit.prototype.collectRibbon, Stage2Kit.prototype.collectRibbon);
  } finally { h.destroy(); }
}));
