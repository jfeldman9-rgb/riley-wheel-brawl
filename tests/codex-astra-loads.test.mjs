import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { queueStage2 } from '../src/stage2.js';
import { queueStage3 } from '../src/stage3.js';
import { queueStage4 } from '../src/stage4.js';
import { queueStage5 } from '../src/stage5-load.js';
import { queueStage6Painted, CRATE6 } from '../src/stage6-paint.js';
import { syncSheets } from '../src/stage5-paint.js';
import { queueBossArt, queueGrab, queueLoial } from '../src/stage5-demand.js';
import { armStory5 } from '../src/stage5-art.js';
import { Stage1 } from '../src/stage1.js';
import { q } from '../src/config.js';
import { STAGES } from '../src/stages.js';

function loaderScene() {
  const keys = new Map(), json = new Map(), requests = [], removed = [], objects = [];
  const load = new EventEmitter(), events = new EventEmitter();
  load.image = (key, url) => requests.push({ key, url });
  load.atlas = (...args) => requests.push(typeof args[0] === 'object' ? args[0] : { key: args[0], url: args[1] });
  load.spritesheet = load.image;
  load.json = load.image;
  load.start = () => {}; load.isLoading = () => true;
  const s = { runId: 1, load, events, loadedStage: 5,
    textures: { exists: k => keys.has(k), get: k => keys.get(k), remove(k) { removed.push(k); const T = keys.get(k); for (const source of T?.dataSource || []) source.destroy(); keys.delete(k); } },
    cache: { json: { get: k => json.get(k) } },
    anims: { get: () => ({ destroy() { objects.push('animation destroyed'); } }), exists: () => false, create() { objects.push('animation created'); } },
    metas: {}, riley: { loialReady: true }, callLoial() { objects.push('Loial called'); },
    add: { image() { objects.push('image'); } }, make: { textures: true }, hud: { cutsceneLine() {} },
  };
  return { s, keys, json, requests, removed, objects };
}
function arriveCrate(h) {
  const r = h.requests.findLast(r => r.key === 'crate');
  if (!r) return;
  const source = { width: 490, height: 482, destroy() { this.destroyed = true; } };
  h.keys.set('crate', { source: [source], dataSource: Array.isArray(r.url) ? [{ ...source }] : [] });
}
const crateBytes = h => [...h.keys.get('crate').source, ...h.keys.get('crate').dataSource].reduce((n, s) => n + s.width * s.height * 4, 0);
for (const [n, queue] of [[2, queueStage2], [3, queueStage3], [4, queueStage4]]) test(`Stage ${n}->5->6 destroys attached crate normals and matches fresh Stage 6 bytes`, () => {
  const h = loaderScene(); queue(h.s); arriveCrate(h);
  const oldNormal = h.keys.get('crate').dataSource[0]; assert.ok(oldNormal);
  queueStage5(h.s); arriveCrate(h);
  const colour = h.keys.get('crate');
  assert.equal(oldNormal.destroyed, true);
  assert.equal(colour.dataSource.length, 0);
  queueStage6Painted(h.s, [CRATE6]);
  assert.equal(h.keys.get('crate'), colour, '5->6 keeps the colour-only texture');
  const fresh = loaderScene(); queueStage6Painted(fresh.s, [CRATE6]); arriveCrate(fresh);
  assert.equal(crateBytes(h), crateBytes(fresh));
  const before = h.requests.filter(r => r.key === 'crate').length;
  queue(h.s); arriveCrate(h);
  assert.equal(h.requests.filter(r => r.key === 'crate').length, before + 1);
  assert.equal(h.keys.get('crate').dataSource.length, 1, 'entry to a lit stage restores its normal');
});

test('600 Stage 5 updates register sheet requests and listeners only once while pending', () => {
  const h = loaderScene(); h.s.zoneI = 1;
  syncSheets(h.s);
  const requestCount = h.requests.length, listeners = ['complete', 'loaderror'].map(ev => h.s.load.listenerCount(ev));
  const shutdownCount = h.s.events.listenerCount('shutdown');
  assert.ok(requestCount > 0);
  for (let i = 0; i < 600; i++) syncSheets(h.s);
  assert.equal(h.requests.length, requestCount);
  assert.deepEqual(['complete', 'loaderror'].map(ev => h.s.load.listenerCount(ev)), listeners);
  assert.equal(h.s.events.listenerCount('shutdown'), shutdownCount);
  h.s.load.emit('loaderror', { key: 's5seep' }); h.s.load.emit('complete');
  syncSheets(h.s);
  assert.equal(h.requests.length, 2 * requestCount, 'a failed batch can retry after settlement');
  h.s.events.emit('shutdown');
  assert.equal(h.s.load.listenerCount('complete'), 0);
  assert.equal(h.s.load.listenerCount('loaderror'), 0);
});

for (const [name, queue] of [['boss', queueBossArt], ['grab metadata', queueGrab], ['Loial metadata', queueLoial]]) test(`Stage 5 ${name} completion is cancelled by shutdown, including stale captured callbacks`, () => {
  const h = loaderScene();
  queue(h.s);
  const callbacks = h.s.load.eventNames().filter(e => e === 'complete' || String(e).startsWith('filecomplete')).flatMap(e => h.s.load.listeners(e));
  const requested = h.requests.length;
  h.s.events.emit('shutdown');
  h.s.runId++;
  for (const key of ['riley3', 'loial']) h.json.set(key + '.A', JSON.parse(readFileSync(`assets/${key === 'riley3' ? 'stage3/' : ''}chars/${key}.anims.json`, 'utf8')));
  h.s.load.emit('filecomplete-json-riley3.A'); h.s.load.emit('filecomplete-json-loial.A'); h.s.load.emit('complete');
  for (const fn of callbacks) fn();
  assert.equal(h.requests.length, requested);
  assert.deepEqual(h.objects, []);
  assert.equal(h.s.load.listenerCount('complete'), 0);
  assert.equal(h.s.load.listenerCount('filecomplete-json-riley3.A'), 0);
  assert.equal(h.s.load.listenerCount('filecomplete-json-loial.A'), 0);
});

test('Stage 5 Loial atlas arriving after shutdown cannot install animations or summon', () => {
  const h = loaderScene();
  h.json.set('loial.A', JSON.parse(readFileSync('assets/chars/loial.anims.json', 'utf8')));
  h.s._loialWanted = true;
  queueLoial(h.s);
  const completions = h.s.load.listeners('complete');
  h.s.events.emit('shutdown');
  for (const r of h.requests) h.keys.set(r.key, { source: [{}], dataSource: [] });
  for (const fn of completions) fn();
  assert.deepEqual(h.objects, []);
  assert.equal(h.s.metas.loial, undefined);
});

test('a pending Stage 5 story load cannot paint or drop another panel after shutdown', () => {
  const h = loaderScene();
  h.keys.set('story5p2', { source: [{}], dataSource: [] });
  armStory5(h.s);
  const completions = h.s.load.listeners('complete');
  h.s.events.emit('shutdown');
  h.keys.set('story5p1', { source: [{}], dataSource: [] });
  for (const fn of completions) fn();
  assert.equal(h.keys.has('story5p2'), true);
  assert.deepEqual(h.removed, []);
});

test('preload queues Stage 6 using incoming story data instead of the previous run', () => {
  const h = loaderScene(), original = STAGES[6].queue;
  Object.assign(h.s, { sys: { settings: { data: { stage: 6, story: false } } }, releaseStage() {}, game: {}, loadedStage: 6, stageData: { stage: 6, story: true } });
  h.s.load.setCORS = () => {};
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  globalThis.document = { getElementById: () => null }; globalThis.window = {};
  let incoming;
  STAGES[6].queue = s => { incoming = s.stageData; };
  q.set('touch', '1');
  try { Stage1.prototype.preload.call(h.s); assert.deepEqual(incoming, { stage: 6, story: false }); assert.equal(h.s.mobileNormals, true); }
  finally { q.delete('touch'); STAGES[6].queue = original; globalThis.document = previousDocument; globalThis.window = previousWindow; }
});
