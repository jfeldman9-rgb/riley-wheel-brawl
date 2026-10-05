import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import './helpers/stage1-simulation.mjs';
import { queueStage3, STAGE3_ATLASES } from '../src/stage3.js';

function loaderScene() {
  const load = new EventEmitter(), events = new EventEmitter(), metas = new Map(), pages = [];
  for (const name of ['image', 'json', 'spritesheet']) load[name] = () => {};
  load.atlas = cfg => { if (typeof cfg === 'object') pages.push(cfg.key); };
  return { load, events, metas, pages, textures: { exists: () => false }, cache: { json: { get: k => metas.get(k) } } };
}

for (const end of ['shutdown', 'complete', 'loaderror']) {
  test(`Stage 3 atlas callbacks are detached on ${end} before retrying`, () => {
    const s = loaderScene();
    for (let attempt = 0; attempt < 10; attempt++) {
      queueStage3(s);
      for (const k of STAGE3_ATLASES) assert.equal(s.load.listenerCount('filecomplete-json-' + k + '.A'), 1);
      (end === 'shutdown' ? s.events : s.load).emit(end);
      assert.deepEqual(s.load.eventNames(), []);
      assert.equal(s.events.listenerCount('shutdown'), 0);
    }
    queueStage3(s);
    for (const k of STAGE3_ATLASES) {
      const m = JSON.parse(readFileSync(`assets/stage3/chars/${k}.anims.json`));
      s.metas.set(k + '.A', m);
      s.load.emit('filecomplete-json-' + k + '.A');
    }
    assert.equal(s.pages.length, new Set(s.pages).size, 'one atlas request per page');
    s.load.emit('complete');
    assert.deepEqual(s.load.eventNames(), []);
    assert.equal(s.stage3LoadCleanup, null);
  });
}

test('requeueing Stage 3 before a previous load ends replaces its listeners', () => {
  const s = loaderScene();
  queueStage3(s); queueStage3(s);
  for (const k of STAGE3_ATLASES) assert.equal(s.load.listenerCount('filecomplete-json-' + k + '.A'), 1);
  assert.equal(s.events.listenerCount('shutdown'), 1);
  s.events.emit('shutdown');
  assert.deepEqual(s.load.eventNames(), []);
});
