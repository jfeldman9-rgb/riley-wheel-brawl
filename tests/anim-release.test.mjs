// AnimationManager.remove drops the map entry and leaves the pauseall/resumeall
// listeners Animation registered. destroy() removes those listeners first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { releaseChars } from '../src/assets.js';
import { normalPageDir } from '../src/texture-pages.js';

const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de');
const entry = 'i(85454)})());';
const sandbox = { module: { exports: {} }, exports: {}, console };
runInNewContext(source.slice(0, -entry.length) + 'i})());', sandbox, { timeout: 1000, filename: 'phaser-anim-release.vm.js' });
const Animation = sandbox.module.exports(42099);

function rig() {
  const listeners = { pauseall: [], resumeall: [] };
  const entries = {};
  const anims = {
    anims: { entries },
    on(ev, fn, ctx) { listeners[ev].push({ fn, ctx }); },
    off(ev, fn, ctx) {
      const list = listeners[ev];
      const i = list.findIndex(l => l.fn === fn && l.ctx === ctx);
      if (i >= 0) list.splice(i, 1);
    },
    remove(key) { delete entries[key]; },
    get(key) { return entries[key]; },
    exists(key) { return key in entries; },
    textureManager: { exists: () => true, getFrame: (key, frame) => ({ key, frame }) },
  };
  const page = { dataSource: [{ image: { src: 'http://localhost/assets/chars/riley-0_n.webp' } }] };
  const tex = new Map([['riley-0', page], ['riley-0_nl', {}]]);
  const scene = {
    loadedStage: 1,
    anims,
    textures: { exists: () => true, get: k => tex.get(k) || page, remove() {} },
    cache: { json: { get: () => ({ pages: ['riley-0'], anims: [{ name: 'riley_idle' }, { name: 'riley_walk' }] }) } },
  };
  function clip(name) {
    entries[name] = new Animation(anims, name, {
      frames: [{ key: 'riley-0', frame: 'a', duration: 80 }, { key: 'riley-0', frame: 'b', duration: 80 }],
      repeat: -1,
    });
  }
  return { scene, listeners, entries, clip };
}

test('releaseChars drops pause and resume listeners on every swap', () => {
  const { scene, listeners, entries, clip } = rig();
  for (let n = 0; n < 4; n++) {
    clip('riley_idle'); clip('riley_walk');
    assert.equal(listeners.pauseall.length, 2, 'created ' + n);
    assert.equal(listeners.resumeall.length, 2, 'created ' + n);
    releaseChars(scene, ['riley']);
    assert.equal(listeners.pauseall.length, 0, 'released ' + n);
    assert.equal(listeners.resumeall.length, 0, 'released ' + n);
    assert.equal(Object.keys(entries).length, 0);
  }
});

test('a normal-page swap destroys meta clips and copied aliases without leaking listeners', () => {
  const { scene, listeners, entries, clip } = rig();
  const meta = { anims: [{ name: 'riley_idle' }, { name: 'riley_walk' }] };
  for (let n = 0; n < 4; n++) {
    scene.loadedStage = n % 2 ? 1 : 5;
    clip('riley_idle'); clip('riley_walk'); clip('riley_grabbed'); clip('riley_escape');
    assert.equal(listeners.pauseall.length, 4, 'before swap ' + n);
    assert.equal(listeners.resumeall.length, 4, 'before swap ' + n);
    normalPageDir(scene, 'riley-0', 'assets/chars', meta);
    assert.equal(listeners.pauseall.length, 0, 'after swap ' + n);
    assert.equal(listeners.resumeall.length, 0, 'after swap ' + n);
    assert.equal('riley_grabbed' in entries, false);
    assert.equal('riley_escape' in entries, false);
    assert.equal(Object.keys(entries).length, 0);
  }
});
