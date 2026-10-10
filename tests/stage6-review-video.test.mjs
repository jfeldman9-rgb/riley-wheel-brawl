import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';
import { q } from '../src/config.js';
import { callRand } from '../src/stage6-lifecycle.js';
import { CutscenePlayer } from '../src/cutscene.js';
import { abortRandCall, resetRandCall, installRandBless, removeRandBless } from '../src/rand-call-cutscene.js';
import { videoEnv } from './stage6-hardening-fixtures.mjs';

test('player abort synchronously releases its interval, listeners, source and overlay without invoking done', () => {
  const e = videoEnv(), p = new CutscenePlayer(e.root); let done = 0;
  const handle = p.play(['R1'], { done() { done++; } }), v = p.video, overlay = v.parent;
  handle.abort(); assert.equal(handle.active, false); assert.equal(p.active, false);
  assert.equal(done, 0); assert.equal(e.timers.size, 0); assert.equal(e.root.document.body.children.length, 0);
  assert.equal(v.src, ''); assert.equal(v.getAttribute('poster'), null); assert.equal(v.paused, true);
  assert.deepEqual(v.listeners.eventNames(), []); assert.deepEqual(overlay.listeners.eventNames(), []);
  e.advance(20000); v.fire('ended'); v.fire('error'); assert.equal(done, 0);
});

test('Rand retains two owned capture listeners for muted-play unmute and removes both on teardown', async () => {
  const e = videoEnv(); resetRandCall(); q.set('cutscenes', '1');
  try {
    installRandBless(e.scene); e.root.document.fire('pointerdown'); const v = e.videos[0];
    assert.equal(v.playsInline, true); assert.equal(v.getAttribute('playsinline'), '');
    assert.equal(v.getAttribute('webkit-playsinline'), ''); assert.equal(v.muted, false);
    assert.equal(e.root.document.listeners.listenerCount('pointerdown'), 1);
    assert.equal(e.root.document.listeners.listenerCount('touchend'), 1);
    // A gesture during muted fallback must still reach the same element.
    const { playCall } = await import('../src/rand-call-cutscene.js');
    let n = 0; v.play = function() { if (!n++) return Promise.reject({ name: 'NotAllowedError' }); return Promise.resolve(); };
    playCall(e.scene, () => {}); await Promise.resolve(); assert.equal(v.muted, true);
    e.root.document.fire('touchend'); assert.equal(v.muted, false); assert.equal(e.videos.length, 1);
    removeRandBless(); assert.equal(e.root.document.listeners.listenerCount('pointerdown'), 0);
    assert.equal(e.root.document.listeners.listenerCount('touchend'), 0);
  } finally { removeRandBless(); abortRandCall(e.scene); q.delete('cutscenes'); }
});

for (const exit of ['death', 'quit', 'restart', 'stage switch']) for (const first of ['exit', 'completion']) test(`${exit} / Rand ${first} first: no late strike, damage or retained media`, () => {
  const e = videoEnv(), h = withSeed(1, () => stage6Simulation({ mode: null })), s = h.s, k = s.kit;
  s.cutRoot = e.root; q.set('cutscenes', '1'); resetRandCall();
  const foe = { type: 'grunt', alive: true, x: 300, y: 630, hp: 10, maxHp: 10, sync() {} };
  s.enemies.push(foe);
  const leave = () => { if (exit === 'death') { s.riley.alive = false; s.riley.hp = 0; s.rileyDied(); } else s.events.emit('shutdown'); };
  try {
    assert.equal(callRand(k), true); const v = e.videos[0];
    e.advance(899); s.cutscene.press('attack'); assert.equal(k.strike || null, null);
    e.advance(1);
    if (first === 'exit') { leave(); v.fire('ended'); }
    else { s.cutscene.press('attack'); assert.ok(k.strike); leave(); }
    assert.equal(k.strike || null, null); assert.equal(k.rand.on, false); assert.equal(s.cutscene, null);
    assert.equal(foe.hp, 10); assert.equal(e.timers.size, 0); assert.equal(e.root.document.body.children.length, 0);
    assert.equal(v.src, ''); assert.equal(v.paused, true);
    assert.equal(s.events.listenerCount('shutdown'), exit === 'death' ? 1 : 0, 'only the scene-owned shutdown listener survives a Riley death');
    e.advance(20000); v.fire('error'); assert.equal(k.strike || null, null);
  } finally { h.destroy(); q.delete('cutscenes'); }
});
