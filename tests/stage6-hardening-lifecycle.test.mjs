import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage6Kit } from '../src/stage6.js';
import { installStage6SceneHooks, restoreStage6Hooks, callRand } from '../src/stage6-lifecycle.js';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';
import { Belal } from '../src/belal.js';
import { videoEnv } from './stage6-hardening-fixtures.mjs';
import { q } from '../src/config.js';

function strikeScene() {
  const visuals = [], lights = [], timers = [];
  const make = () => { const o = { destroyed: false, destroy() { this.destroyed = true; } }; for (const k of ['setOrigin', 'setDepth', 'setScale', 'setAlpha', 'setTint', 'setScrollFactor', 'setBlendMode']) o[k] = () => o; visuals.push(o); return o; };
  const s = { started: true, enemies: [{ type: 'grunt', x: 300, y: 630, hp: 10, maxHp: 10, alive: true }], riley: { hp: 100, alive: true, inv: 0, sync() {} },
    callLoial() {}, spawn() {}, onEnemyDie() {}, rileyDied() {}, update() { this.normal = (this.normal || 0) + 1; },
    inp: { flushPresses() {}, clear() {} }, add: { sprite: make, image: make }, time: { paused: false, now: 0, delayedCall(ms, fn) { const t = { fn, remove() { this.removed = true; } }; timers.push(t); return t; } },
    anims: { globalTimeScale: 0.75 }, tweens: { timeScale: 0.4 }, lights: { addLight() { const l = {}; lights.push(l); return l; }, removeLight(l) { lights.splice(lights.indexOf(l), 1); } } };
  const k = new Stage6Kit(s); s.kit = k; installStage6SceneHooks(k); return { s, k, visuals, lights, timers };
}

test('Rand freezes scene timer, tween and animation clocks and restores their previous values', () => {
  q.set('story', '0'); const { s, k } = strikeScene();
  try { assert.equal(callRand(k), true); assert.equal(s.time.paused, true); assert.equal(s.anims.globalTimeScale, 0); assert.equal(s.tweens.timeScale, 0);
    for (let i = 0; i < 121; i++) s.update(i * 17, 1000 / 60);
    assert.equal(k.strike, null); assert.equal(s.time.paused, false); assert.equal(s.anims.globalTimeScale, 0.75); assert.equal(s.tweens.timeScale, 0.4); assert.equal(s.riley.inv, 2);
  } finally { restoreStage6Hooks(k); q.delete('story'); }
});
for (const exit of ['death', 'destroy']) test(`mid-strike ${exit} releases every owned visual/light and the freeze`, () => {
  q.set('story', '0'); const { s, k, visuals, lights } = strikeScene();
  try { callRand(k); for (let i = 0; i < 70; i++) s.update(i * 17, 1000 / 60); assert.ok(lights.length > 0);
    if (exit === 'death') s.rileyDied(); else restoreStage6Hooks(k);
    assert.equal(k.strike, null); assert.equal(k.rand.on, false); assert.equal(lights.length, 0); assert.ok(visuals.every(v => v.destroyed)); assert.equal(s.time.paused, false);
  } finally { restoreStage6Hooks(k); q.delete('story'); }
});
test('a hatch pending at kit teardown cannot spawn into the next stage', () => {
  const { s, k, timers } = strikeScene(); let spawns = 0;
  k._spawn = () => { spawns++; }; const h = s.spawn('grunt', 'B'); restoreStage6Hooks(k);
  for (const t of timers) if (!t.removed) t.fn();
  assert.equal(spawns, 0); assert.equal(h.gone, true);
});
test('a skip edge is flushed again before the first resumed game update; double CALL spends once', () => {
  const e = videoEnv(), { s, k } = strikeScene(); q.set('cutscenes', '1');
  Object.assign(s, { cutRoot: e.root, events: e.scene.events, music: e.scene.music, scene: e.scene.scene, setPauseReason: e.scene.setPauseReason, pauseReasons: new Set() });
  let pending = false, observed = false, flushes = 0; s.inp.flushPresses = () => { pending = false; flushes++; };
  try { assert.equal(callRand(k), true); assert.equal(callRand(k), false); assert.equal(k.rand.calls, 1);
    e.advance(1000); pending = true; s.cutscene.press('assist'); assert.equal(pending, false); assert.equal(k.flushInp, 1);
    // DOM input handlers may record the same edge after the capture listener returns.
    pending = true; s.update(1000, 1000 / 60); observed = pending; assert.equal(observed, false); assert.ok(flushes >= 2); assert.equal(k.rand.calls, 1);
  } finally { restoreStage6Hooks(k); q.delete('cutscenes'); }
});
test('Rand recharge/boss clock counts gameplay only, including pause, story and strike', () => {
  const { s, k } = strikeScene(); k.stone = { step() {} }; s.zoneI = k._zone = 0; k.rand.charges = 0; k.rand.since = 0; k.rand.kos = 10;
  try { for (const block of ['paused', 'cutscene', 'strike']) { if (block === 'strike') k.strike = {}; else s[block] = true; k.update(45); assert.equal(k.rand.since, 0); if (block === 'strike') k.strike = null; else s[block] = null; }
    for (let i = 0; i <= 45 * 60; i++) k.update(1 / 60); assert.ok(k.rand.since >= 44.99); assert.equal(k.rand.charges, 1);
  } finally { restoreStage6Hooks(k); }
});
test('the CALL frame itself freezes enemy damage, projectiles and Riley physics', () => withSeed(1, () => {
  const h = stage6Simulation({ mode: null }), s = h.s, R = s.riley;
  try {
    s.enemies.forEach(e => e.destroy()); s.enemies = []; s.pending = []; s.zones = []; s.zoneI = 3; s.kit._zone = 3;
    R.x = 600; R.y = 630; R.z = 0; R.inv = 0; R.state = 'idle'; R.vx = 100; s.god = false; s.fx.hitstop = 0;
    const b = new Belal(s, 700, 630); b.startFlurry(); b.st = 0.55; s.boss = b;
    let projectiles = 0; s.updateFireballs = () => { projectiles++; };
    s.inp.press('assist'); const hp = R.hp, x = R.x, st = b.st;
    h.step(); assert.ok(s.kit.strike); assert.equal(R.hp, hp); assert.equal(R.x, x); assert.equal(b.st, st); assert.equal(projectiles, 0);
  } finally { h.destroy(); }
}));

for (const exit of ['death', 'quit', 'restart', 'continue', 'stage switch']) test(`${exit} mid-Rand-video releases freeze, input, hooks and busy state without running a strike`, () => {
  const e = videoEnv(), { s, k } = strikeScene(); q.set('cutscenes', '1');
  Object.assign(s, { cutRoot: e.root, events: e.scene.events, music: e.scene.music, scene: e.scene.scene, setPauseReason: e.scene.setPauseReason, pauseReasons: new Set() });
  try { callRand(k); assert.equal(k.rand.on, true); if (exit === 'death') s.rileyDied(); else restoreStage6Hooks(k);
    assert.equal(k.rand.on, false); assert.equal(k.strike || null, null); assert.equal(s.cutscene, null); assert.equal(s.paused, false); assert.equal(e.timers.size, 0); assert.equal(e.root.document.body.children.length, 0); assert.equal(e.scene.events.listenerCount('shutdown'), 0);
    if (exit !== 'death') assert.ok(!k.hooks.length); const fresh = new Stage6Kit(s); assert.equal(fresh.rand.charges, 1);
  } finally { restoreStage6Hooks(k); q.delete('cutscenes'); }
});
