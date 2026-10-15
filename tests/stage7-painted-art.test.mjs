import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dimensions, audit } from '../tools/audit-stage1.mjs';
import { PAINTED7 } from '../src/stage7-painted.js';
import { FRAMES7 } from '../src/stage7-frames.js';
import { paintedScale } from '../src/stage7-fighter.js';
import { Dancer, Veiled } from '../src/shaido.js';
import { Asmodean } from '../src/asmodean.js';
import { createStage7View } from '../src/stage7-view.js';
import { Stage7Kit, queueStage7 } from '../src/stage7.js';
import { demand7 } from '../src/stage7-load.js';

const json = path => JSON.parse(readFileSync(path));
const atlas = key => json(`assets/stage7/chars/${key}.json`);

function fixture(painted = true) {
  const made = [];
  function visual(x, y, key) {
    const o = { x, y, key, frame: 0, dead: false };
    for (const name of ['setLighting', 'setDepth', 'setTint', 'setOrigin', 'setScrollFactor', 'setDisplaySize', 'setAlpha'])
      o[name] = () => o;
    o.setPosition = (x, y) => { Object.assign(o, { x, y }); return o; };
    o.setScale = scale => { o.scale = scale; return o; };
    o.setFrame = frame => { o.frame = frame; return o; };
    o.destroy = () => { o.dead = true; };
    made.push(o);
    return o;
  }
  const s = {
    textures: { exists: () => true, get: () => ({ source: [{ isCanvas: !painted }] }) },
    add: { image: visual, sprite: visual },
    metas: {}, zoneI: 0, wave: 1, enemies: [], riley: { x: 400, y: 630 },
  };
  const k = s.kit = new Stage7Kit(s);
  return { s, k, made };
}

test('all 33 painted keys ship, atlases have state fields, and assets fit their budgets', () => {
  const rows = PAINTED7.filter(r => r.key !== 's6fade');
  assert.equal(rows.length, 33);
  const status = json('assets/stage7/ART_STATUS.json');
  for (const row of rows) {
    assert.equal(row.present, true, row.key);
    assert.ok(existsSync(row.url), row.url);
    const entry = status.entries.find(e => e.key === row.key);
    assert.equal(entry.placeholder, false);
    const bytes = readFileSync(row.url), [w, h] = dimensions(bytes);
    assert.ok(bytes.length <= entry.fileCapBytes, row.key);
    assert.ok(w * h * 4 <= entry.decodedCapBytes, row.key);
    if (row.atlas) {
      const data = atlas(row.key);
      assert.deepEqual([data.meta.size.w, data.meta.size.h], [w, h]);
      assert.ok(Object.values(data.frames).every(f => typeof f.state === 'string'));
    }
  }
  assert.equal(Object.keys(atlas('s7asmo').frames).length, 17);
  assert.deepEqual(dimensions(readFileSync('assets/stage7/props/s7earth.webp')), [768, 128]);
  assert.deepEqual(PAINTED7.find(r => r.key === 's7earth'), {
    key: 's7earth', url: 'assets/stage7/props/s7earth.webp', frameWidth: 128, frameHeight: 128, present: true,
  });
  const a = audit();
  // Twix video/fallback wiring is explicitly counted under cutscenes.source.
  assert.equal(a.preFight.inventoryUpperBoundBytes, 24_948_472);
  assert.equal(a.stage7.art.status, 'PASS');
});

test('runtime state sequences match the shipped JSON state labels', () => {
  const expected = {
    s7dancer: { idle: ['idle'], walk: ['run1','run2','run3','run4'], attack: ['veilTell'], lunge: ['lunge1','lunge2','lunge3'], thrown: ['handstand_flip'], held: ['hurt'], hurt: ['hurt'], down: ['ko_down'], yield: ['kneel_yield'] },
    s7veiled: { idle: ['idle'], walk: ['walk1','walk2','walk3','walk4'], aim: ['draw1','draw2'], attack: ['draw1','draw2','loose_attack'], held: ['hurt'], thrown: ['hurt'], hurt: ['hurt'], down: ['ko_down'], yield: ['kneel_yield'] },
    s7asmo: { idle: ['idle'], play: ['play1','play2','play3','play4'], walk: ['walk1','walk2','walk3','walk4'], attack: ['bash1','bash2','bash3'], channel: ['channel1','channel2'], hurt: ['hurt'], stagger: ['stagger'], down: ['ko_kneelBound'], bound: ['ko_kneelBound'] },
    s7moir: { idle: ['stand_idle'], raise: ['raise1','raise2_attack'], attack: ['cast1_attack','cast2_attack'] },
    s7lan: { run: ['run1','run2','run3'], draw: ['draw'], attack: ['slash1_attack','slash2_attack'], point: ['point'] },
  };
  for (const [key, states] of Object.entries(expected)) {
    const frames = atlas(key).frames;
    for (const [state, labels] of Object.entries(states))
      assert.deepEqual(FRAMES7[key][state].map(n => frames[n]?.state), labels, `${key} ${state}`);
  }
});

test('production fighters select painted tell, lunge, draw, release, hurt and defeat frames', () => {
  const { s } = fixture();
  for (const [Actor, states] of [
    [Dancer, { idle: [0], walk: [1,2,3,4], attack: [9], lunge: [6,7,8], hurt: [10], down: [12], yield: [11], thrown: [5] }],
    [Veiled, { idle: [0], aim: [5,6], attack: [5,6,7], hurt: [8], down: [10], yield: [9] }],
    [Asmodean, { idle: [0], attack: [9,10,11], channel: [12,13], hurt: [14], stagger: [15], down: [16], bound: [16] }],
  ]) {
    const actor = new Actor(s, 500, 630);
    for (const [state, sequence] of Object.entries(states)) {
      actor.setState(state);
      for (let i = 0; i < sequence.length; i++) {
        // Asmodean's bash holds its wind-up pose until the parry window, then strikes at the tell.
        actor.st = Actor === Asmodean && state === 'attack' ? [0.3, 0.6, 0.75][i] : i / 8;
        actor.sync();
        assert.equal(actor.sprite.frame, sequence[i], `${actor.def.key} ${state}`);
        assert.equal(actor.sprite.scale, paintedScale(actor.def.key));
      }
    }
    actor.destroy();
  }
  const boss = new Asmodean(s, 500, 630);
  s.kit.notes.pending = [{}];
  for (let i = 0; i < 4; i++) {
    boss.st = i / 8; boss.sync(); assert.equal(boss.sprite.frame, 5 + i);
  }
  s.kit.notes.pending = [];
  boss.sync(); assert.equal(boss.sprite.frame, 0);
  boss.destroy();
});

test('fighter canvases retain code frames and scale for every changed painted state', () => {
  const { s } = fixture(false);
  for (const Actor of [Dancer, Veiled, Asmodean]) {
    const actor = new Actor(s, 500, 630);
    for (const [state, frame] of Object.entries({ idle: 0, attack: 3, lunge: 3, hurt: 5, down: 6, yield: 7, bound: 7, channel: 4 })) {
      actor.setState(state); actor.st = 1; actor.sync();
      assert.equal(actor.sprite.frame, frame); assert.equal(actor.sprite.scale, 3);
    }
    actor.destroy();
  }
});

test('the live helper view raises/casts, runs/draws/slashes, and points in the outro', () => {
  const { s, k, made } = fixture();
  const view = createStage7View(s);
  const find = key => made.find(o => o.key === key && !o.dead);
  k.strike = { helper: 'duo', t: 0, duration: 1.8, targets: [] };
  for (const [t, moi, lan] of [[0,0,0], [0.125,0,1], [0.25,1,2], [0.3,1,3], [0.45,2,4], [0.58,2,5], [0.65,3,5], [0.8,4,5]]) {
    k.strike.t = t; view.sync(k);
    assert.equal(find('s7moir').frame, moi, `Moiraine at ${t}`);
    assert.equal(find('s7lan').frame, lan, `Lan at ${t}`);
  }
  k.strike = null; k.outro = true; s.boss = { x: 800, y: 630 };
  view.sync(k);
  assert.equal(find('s7lan').frame, 6); assert.equal(find('s7moir').frame, 0);
  view.destroy();
});

test('earth animates crack/growth/full spike/crumble once through the actual call view', () => {
  for (const painted of [true, false]) {
    const { s, k, made } = fixture(painted), view = createStage7View(s);
    k.strike = { helper: 'moiraine', t: 0, duration: 1.6, targets: [{ x: 500, y: 630 }] };
    for (const [t, frame] of [[0,0], [0.17,1], [0.33,2], [0.49,3], [0.65,4], [1.2,4], [1.36,5], [1.59,5]]) {
      k.strike.t = t; view.sync(k);
      assert.equal(made.find(o => o.key === 's7earth').frame, painted ? frame : 0);
    }
    assert.equal(made.filter(o => o.key === 's7earth').length, 1);
    k.strike = null; view.sync(k);
    assert.equal(made.find(o => o.key === 's7earth').dead, true);
    view.destroy();
  }
});

test('initial queue defers helpers, earth and Asmodean while earth demand loads six cells', async () => {
  const { s, k } = fixture();
  const requests = [], keys = new Set(), load = new EventEmitter();
  s.textures.exists = key => keys.has(key);
  s.load = load;
  Object.assign(load, {
    atlas: (key, url, atlas) => requests.push({ key, url, atlas }),
    image: (key, url) => requests.push({ key, url }),
    spritesheet: (key, url, config) => requests.push({ key, url, config }),
    json() {}, isLoading: () => false, start() {},
  });
  queueStage7(s);
  for (const key of ['s7asmo','s7moir','s7lan','s7earth','s7shield'])
    assert.ok(!requests.some(r => r.key === key));
  let done = 0;
  demand7(k, ['s7earth'], () => done++);
  const row = requests.find(r => r.key === 's7earth');
  assert.deepEqual(row.config, { frameWidth: 128, frameHeight: 128 });
  keys.add('s7earth'); load.emit('complete');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(done, 1);
  for (const cleanup of k.cleanups) cleanup();
});

test('missing, failed and stalled painted art creates usable code textures and settles once', async () => {
  const previous = globalThis.document;
  globalThis.document = { createElement() {
    const ctx = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
    return { getContext: () => ctx };
  } };
  try {
    for (const mode of ['missing', 'failed', 'stalled']) {
      const { s, k } = fixture(), textures = new Map(), timers = new Map(), load = new EventEmitter();
      s.textures = {
        exists: key => textures.has(key), get: key => textures.get(key), remove: key => textures.delete(key),
        addCanvas(key, canvas) {
          const texture = { canvas, source: [{ isCanvas: true }], frames: [], add(n) { this.frames.push(n); } };
          textures.set(key, texture); return texture;
        },
      };
      s.load = load;
      const queued = [];
      Object.assign(load, {
        atlas: key => queued.push(key), spritesheet: key => queued.push(key),
        isLoading: () => false, start() {},
      });
      k.artRoot = { setTimeout(fn, ms) { assert.equal(ms, 1500); timers.set(1, fn); return 1; }, clearTimeout(id) { timers.delete(id); } };
      if (mode === 'missing') k.artRows = PAINTED7.map(r => ({ ...r, present: false }));
      let done = 0;
      demand7(k, ['s7asmo','s7earth'], () => done++);
      if (mode === 'missing') assert.deepEqual(queued, []);
      else {
        assert.equal(done, 0); assert.deepEqual(queued, ['s7asmo','s7earth']);
        if (mode === 'failed') {
          // An atlas JSON failure must also drop a partially loaded image.
          textures.set('s7asmo', { source: [{ isCanvas: false }] });
          load.emit('loaderror', { multiFile: { key: 's7asmo' } });
          assert.equal(textures.has('s7asmo'), false);
          load.emit('complete');
        } else [...timers.values()][0]();
        await Promise.resolve(); await Promise.resolve();
      }
      assert.equal(done, 1);
      assert.equal(textures.get('s7asmo').source[0].isCanvas, true);
      assert.deepEqual(textures.get('s7asmo').frames, [0,1,2,3,4,5,6,7]);
      assert.equal(textures.get('s7earth').source[0].isCanvas, true);
      const boss = new Asmodean(s, 500, 630);
      boss.setState('bound'); boss.sync();
      assert.equal(boss.sprite.frame, 7); assert.equal(boss.sprite.scale, 3);
      load.emit('complete');
      await Promise.resolve(); assert.equal(done, 1);
      assert.equal(timers.size, 0); assert.equal(k.pendingArt.size, 0);
      for (const cleanup of k.cleanups) cleanup();
      boss.destroy();
    }
  } finally { globalThis.document = previous; }
});
