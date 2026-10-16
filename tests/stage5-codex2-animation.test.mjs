// Production metadata only: the existing Stage 5 harness supplies missing Stage 3
// animations itself, which concealed the standalone browser escape softlock.
// The grab atlas stays out of the zone 0 preload. A finite alias covers a grab
// that lands before those pages arrive.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { STAGE5_CHARS } from '../src/stage5-def.js';
import { queueStage5 } from '../src/stage5.js';
import { makeCharAnims } from '../src/assets.js';
import { ensureStage4Anims } from '../src/stage4-art-thug.js';
import { queueGrab } from '../src/stage5-demand.js';

const base = JSON.parse(readFileSync('assets/chars/riley.anims.json'));
const extra = JSON.parse(readFileSync('assets/stage3/chars/riley3.anims.json'));

function animsOf() {
  const raw = new Map();
  return {
    raw,
    exists: k => raw.has(k),
    get(k) {
      const a = raw.get(k);
      if (!a) return undefined;
      return {
        key: a.key, repeat: a.repeat,
        frames: a.frames.map(f => f.frame?.texture ? f : {
          duration: f.duration,
          frame: { texture: { key: f.key }, name: f.frame },
        }),
        destroy() { raw.delete(k); },
      };
    },
    create(a) { raw.set(a.key, a); },
  };
}

test('Stage 5 boot installs a finite escape alias before the grab atlas is loaded', () => {
  const anims = animsOf();
  const scene = {
    cache: { json: { get: k => k === 'riley.A' ? base : undefined } },
    textures: { exists: () => false },
    anims,
  };
  makeCharAnims(scene, STAGE5_CHARS);
  assert.equal(anims.exists('riley_grabbed'), false);
  assert.ok(!STAGE5_CHARS.includes('riley3'));
  ensureStage4Anims(scene);
  const grabbed = anims.raw.get('riley_grabbed');
  const escape = anims.raw.get('riley_escape');
  assert.ok(grabbed, 'grabbed alias stands in for the missing sheet');
  assert.equal(grabbed.repeat, -1);
  assert.ok(escape, 'escape must exist without a harness injection');
  assert.equal(escape.repeat, 0);
  assert.equal(escape.frames.length, 4);
});

test('cold Stage 5 defers the grab atlas until the boss zone and then installs the real clips', () => {
  const load = new EventEmitter(), events = new EventEmitter(), queued = [], metas = new Map();
  load.image = load.atlas = load.spritesheet = (...args) => queued.push(args);
  load.json = (key, url) => queued.push([key, url]);
  load.start = () => {};
  const anims = animsOf();
  const scene = {
    loadedStage: 5, load, events, anims,
    textures: { exists: () => false },
    cache: { json: { get: k => metas.get(k) } },
  };
  queueStage5(scene);
  assert.equal(queued.some(row => String(row[0]).includes('riley3') || row[0]?.key === 'riley3-0'), false);
  queueGrab(scene);
  assert.ok(queued.some(row => row[0] === 'riley3.A'));
  metas.set('riley3.A', extra);
  load.emit('filecomplete-json-riley3.A');
  assert.ok(queued.some(row => row[0]?.key === 'riley3-0'));
  load.emit('complete');
  assert.equal(load.listenerCount('filecomplete-json-riley3.A'), 0);
  assert.equal(events.listenerCount('shutdown'), 0);
  const escape = anims.raw.get('riley_escape');
  assert.equal(escape.repeat, 0);
  assert.equal(escape.frames.length, 4);
  assert.equal(escape.frames[0].frame, 'riley3_escape_00');
});
