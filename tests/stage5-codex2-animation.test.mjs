// Production metadata only: the existing Stage 5 harness supplies missing Stage 3
// animations itself, which concealed the standalone browser escape softlock.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { STAGE5_CHARS } from '../src/stage5-def.js';
import { queueStage5 } from '../src/stage5.js';
import { makeCharAnims } from '../src/assets.js';

const base = JSON.parse(readFileSync('assets/chars/riley.anims.json'));
const extra = JSON.parse(readFileSync('assets/stage3/chars/riley3.anims.json'));
test('standalone Stage 5 registers a finite painted escape clip and the grabbed pose', () => {
  const definitions = new Map();
  const scene = { cache: { json: { get: k => k === 'riley.A' ? base : k === 'riley3.A' ? extra : undefined } }, textures: { exists: () => false },
    anims: { exists: k => definitions.has(k), create: a => definitions.set(a.key, a) } };
  makeCharAnims(scene, STAGE5_CHARS);
  assert.ok(definitions.has('riley_grabbed'));
  const escape = definitions.get('riley_escape');
  assert.ok(escape, 'escape must exist without a harness injection');
  assert.equal(escape.repeat, 0);
  assert.equal(escape.frames.length, 4);
});
test('cold Stage 5 queues supplemental Riley metadata and pages and cleans its callbacks', () => {
  const load = new EventEmitter(), events = new EventEmitter(), queued = [], metas = new Map();
  load.image = load.atlas = load.spritesheet = (...args) => queued.push(args);
  load.json = (key, url) => queued.push([key, url]);
  const scene = { loadedStage: 5, load, events, textures: { exists: () => false }, cache: { json: { get: k => metas.get(k) } } };
  queueStage5(scene);
  assert.ok(queued.some(row => row[0] === 'riley3.A'));
  metas.set('riley3.A', extra);
  load.emit('filecomplete-json-riley3.A');
  assert.ok(queued.some(row => row[0]?.key === 'riley3-0'));
  load.emit('complete');
  assert.equal(load.listenerCount('filecomplete-json-riley3.A'), 0);
  assert.equal(events.listenerCount('shutdown'), 0);
});
