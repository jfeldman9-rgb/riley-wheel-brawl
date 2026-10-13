import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Dancer, Veiled, stepArrows } from '../src/shaido.js';

function world() {
  return {
    enemies: [], koCount: 0, bounds: { l: 0, r: 5200 }, maxTokens: 2,
    attackTokens() { return this.enemies.filter(e => e.alive && (e.state === 'lunge' || e.state === 'attack')).length; },
    riley: { x: 800, y: 630, z: 0, facing: 1, hp: 100, alive: true },
    add: {}, time: { now: 0 },
  };
}

test('a circling dancer is not an attack token, and a lunge is', () => {
  const s = world();
  const d = new Dancer(s, 700, 630);
  assert.equal(d.state, 'circle');
  assert.equal(s.attackTokens(), 0);
  d.state = 'kneel'; d.st = 0.55;
  d.kneel();
  assert.equal(d.state, 'lunge');
  assert.equal(s.attackTokens(), 1);
});

test('two archers never loose inside 0.6s, and a yield is not a death state named ash', () => {
  const s = world();
  const a = new Veiled(s, 400, 630);
  const b = new Veiled(s, 1200, 630);
  a.state = 'draw'; a.st = 0.6; a.draw();
  b.state = 'draw'; b.st = 0.6; b.draw();
  assert.equal(s.s7Arrows.length, 1);
  assert.equal(b.state, 'draw');
  stepArrows(s, 0.6);
  b.draw();
  assert.equal(s.s7Arrows.length, 2);
  a.takeHit({ dmg: 999 });
  assert.equal(a.state, 'yield');
  assert.equal(a.alive, false);
  assert.notEqual(a.state, 'ash');
});
