import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Dancer, Veiled, DANCER, VEILED } from '../src/shaido.js';

function scene() {
  const s = {
    enemies: [], bounds: { l: 0, r: 1280 }, camX: 0, paused: false, cutscene: null,
    riley: { x: 640, y: 630, z: 0, hp: 100, alive: true, facing: 1, state: 'idle', attackFrame: false },
    kit: { yields: 0, onYield() { this.yields++; }, onDancerTell() {}, onVeiledDraw() {}, onVeiledLoose() {}, onCounter() {} },
    hud: { flashText() {} },
    died: [],
    onEnemyDie(e) { this.died.push(e.type); },
    attackTokens() { return this.enemies.filter(e => e.alive && (e.state === 'attack' || e.state === 'lunge')).length; },
    maxTokens: 2,
  };
  return s;
}
const step = (e, secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) e.update(dt); };

test('dancer circles the free side and only starts its tell inside the token cap', () => {
  const s = scene();
  const d = new Dancer(s, 300, 630);
  step(d, 1.2);
  assert.ok(Math.abs(d.x - (s.riley.x - 240)) < 60 || d.state === 'attack' || d.state === 'lunge', `x ${d.x} state ${d.state}`);
  assert.equal(d.hp, DANCER.hp);
  assert.equal(d.T.score, 450);
  // With two attackers already holding tokens, a third dancer never starts a tell.
  const s2 = scene();
  const a = new Dancer(s2, 420, 630); a.state = 'attack';
  const b = new Dancer(s2, 860, 630); b.state = 'attack';
  const c = new Dancer(s2, 400, 630);
  for (let i = 0; i < 120; i++) { c.update(1 / 60); a.state = 'attack'; b.state = 'attack'; }
  assert.notEqual(c.state, 'attack');
  assert.ok(s2.attackTokens() <= 2);
});

test('dancer tell lasts 0.45 s, then the cartwheel-lunge covers about 300 px and can hit once', () => {
  const s = scene();
  const d = new Dancer(s, 400, 630);
  d.state = 'attack'; d.st = 0; d.facing = 1;
  step(d, DANCER.tell - 0.05);
  assert.equal(d.state, 'attack', 'still telling');
  const x0 = d.x;
  step(d, 0.1);
  assert.equal(d.state, 'lunge');
  step(d, DANCER.lungeT + 0.2);
  assert.ok(Math.abs(d.x - x0) <= DANCER.lunge + 30, `lunged ${d.x - x0}`);
  assert.equal(s.riley.hp, 100 - DANCER.dmg, 'one hit for 8 (Riley was on the line)');
});

test('Shaido yield instead of dying: kneel, onYield, no ash death state', () => {
  const s = scene();
  const d = new Dancer(s, 400, 630);
  d.takeHit({ dmg: 999 });
  assert.equal(d.state, 'yield');
  assert.equal(d.yielded, true);
  assert.equal(d.alive, false);
  assert.equal(s.kit.yields, 1);
  assert.deepEqual(s.died, ['dancer']);
  step(d, 1);
  assert.equal(d.gone, true, 'fades out as gai\'shain after 0.8 s');
  const v = new Veiled(s, 300, 630);
  v.die();
  assert.equal(v.state, 'yield');
  assert.equal(s.kit.yields, 2);
});

test('veiled archer keeps 420-620 px, draws 0.6 s, and two archers never loose within 0.6 s', () => {
  const s = scene();
  const a = new Veiled(s, 100, 630);
  const b = new Veiled(s, 1180, 630);
  const loosed = [];
  let t = 0;
  const seen = new Set();
  for (let i = 0; i < 60 * 12; i++) {
    t += 1 / 60;
    for (const v of [a, b]) {
      const before = v.arrows.length;
      v.update(1 / 60);
      if (v.arrows.length > before && !seen.has(v.arrows.at(-1))) { seen.add(v.arrows.at(-1)); loosed.push(t); }
    }
  }
  assert.ok(loosed.length >= 2, loosed.join(','));
  for (let i = 1; i < loosed.length; i++) assert.ok(loosed[i] - loosed[i - 1] >= VEILED.gap - 1e-9, `gap ${loosed[i] - loosed[i - 1]}`);
  for (const v of [a, b]) {
    const d = Math.abs(v.x - s.riley.x);
    assert.ok(d >= 380 && d <= 700, `range ${d}`);
  }
  assert.equal(a.T.score, 350);
  assert.equal(a.hp, VEILED.hp);
});

test('a silhouetted Shaido (entering) cannot be hit', () => {
  const s = scene();
  const d = new Dancer(s, 400, 630);
  d.entering = true;
  assert.equal(d.canBeHit, false);
  assert.equal(d.takeHit({ dmg: 10 }), false);
  assert.equal(d.hp, DANCER.hp);
});
