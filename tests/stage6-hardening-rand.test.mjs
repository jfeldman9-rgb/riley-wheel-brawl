import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Belal } from '../src/belal.js';
import { randEffect, RAND } from '../src/rand-call.js';

test('a Rand boss stagger starts a fresh state clock instead of inheriting the old attack/channel timer', () => {
  const s = { enemies: [], riley: { x: 500, y: 630, alive: true }, kit: {} };
  for (const state of ['attack', 'channel', 'stagger']) {
    const b = new Belal(s, 600, 630); b.phase = 3; b.state = state; b.st = 1.3;
    randEffect(b); b.update(1 / 60);
    assert.equal(b.state, 'stagger'); assert.ok(b.st < 0.02); assert.ok(b.randStagger > RAND.stagger - 0.02);
  }
});

test('a ray-empowered cast preserves a stronger active sa\'angreal and restores power state on exceptions', async () => {
  const { installStage6SceneHooks, restoreStage6Hooks } = await import('../src/stage6-lifecycle.js');
  const strong = { kind: 'saangreal', t: 3, total: 12 }; let seen;
  const s = { powers: { boost: strong }, spawnFireball() { seen = this.powers.boost; } }, k = { s, empowered: true };
  installStage6SceneHooks(k);
  try { s.spawnFireball({}); assert.equal(seen, strong); assert.equal(s.powers.boost, strong); assert.equal(k.empowered, false); }
  finally { restoreStage6Hooks(k); }
  const weak = { s: { powers: { boost: null }, spawnFireball() { throw new Error('allocation'); } }, empowered: true };
  installStage6SceneHooks(weak);
  try { assert.throws(() => weak.s.spawnFireball({}), /allocation/); assert.equal(weak.s.powers.boost, null); }
  finally { restoreStage6Hooks(weak); }
});
