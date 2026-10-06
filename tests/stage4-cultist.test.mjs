// Cultist logic on a plain scene object. No Phaser scene and no Stage 1 simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { Cultist, CULTIST, casterBusy, cultistHoldsToken, clearStage4Cultists, updateFogBolts } from '../src/cultists.js';

const root = resolve(import.meta.dirname, '..');
function scene(riley) {
  return {
    riley: { x: 500, y: 630, hp: 100, alive: true, state: 'idle', facing: 1, attackFrame: false, ...(riley || {}) },
    enemies: [],
    fogBolts: [],
    fireballs: [],
  };
}
const step = (actors, seconds, dt = 1 / 60) => {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) for (const a of actors) a.update(dt);
};

test('cultist module stays inside the cap and names the Stage 2 patterns it mirrors', () => {
  const src = readFileSync(resolve(root, 'src/cultists.js'), 'utf8');
  assert.ok(statSync(resolve(root, 'src/cultists.js')).size <= 9216);
  assert.doesNotMatch(src, /from\s+['"]|require\(/);
  assert.match(src, /casterBusy/);
  assert.match(src, /fleeOnKO/);
  assert.equal(CULTIST.hp, 30);
  assert.equal(CULTIST.pref, 380);
});

test('a hit during the chant dazes for 0.8s and does not open a vent', () => {
  const calls = [];
  const s = scene();
  const c = new Cultist(s, 200, 630, { summonVent: at => calls.push(at) });
  assert.equal(c.hp, 30);
  assert.equal(c.pref, 380);
  assert.equal(c.startChant(), true);
  assert.equal(cultistHoldsToken(c), true);
  c.update(0.5);
  assert.equal(c.takeHit({ dmg: 4, kind: 'light' }, s.riley), true);
  assert.equal(c.state, 'dazed');
  assert.equal(c.hp, 26);
  assert.equal(calls.length, 0);
  c.update(0.8 - 1 / 60);
  assert.equal(c.state, 'dazed');
  c.update(1 / 60);
  assert.equal(c.state, 'approach');
  assert.equal(c.summoned, undefined);
});

test('a finished chant summons once, and only one chant can run', () => {
  const calls = [];
  const s = scene({ x: 640, y: 600 });
  const a = new Cultist(s, 100, 600, { summonVent: at => calls.push(at) });
  const b = new Cultist(s, 900, 600, { summonVent: at => calls.push(at) });
  assert.equal(a.startChant(), true);
  assert.equal(casterBusy(s, b), true);
  assert.equal(b.startChant(), false);
  a.update(1);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { x: 640, y: 600 });
  assert.equal(a.state, 'approach');
  assert.equal(b.startChant(), true);
  let both = 0;
  for (let i = 0; i < 180; i++) {
    a.update(1 / 60); b.update(1 / 60);
    if (a.state === 'chant' && b.state === 'chant') both++;
  }
  assert.equal(both, 0);
});

test('fog bolts tell for 0.6s, fly at 260 px/s for 10 damage, and stay at two', () => {
  const s = scene({ x: 2000, y: 630 });
  const cultists = [0, 400, 800].map(x => new Cultist(s, x, 630));
  assert.equal(cultists[0].startBolt(), true);
  assert.equal(cultists[1].startBolt(), true);
  assert.equal(cultists[2].startBolt(), false, 'a third tell is refused while two are winding');
  cultists[0].update(0.6 - 1 / 60);
  assert.equal(s.fogBolts.length, 0);
  cultists[0].update(1 / 60);
  cultists[1].update(0.6);
  assert.equal(s.fogBolts.length, 2);
  assert.ok(s.fogBolts.every(b => Math.abs(b.vx) === 260 && b.dmg === 10));
  const x0 = s.fogBolts[0].x;
  updateFogBolts(s, 1);
  assert.equal(s.fogBolts[0].x, x0 + 260);
  s.fogBolts[0].x = s.riley.x;
  s.fogBolts[0].y = s.riley.y;
  const hp = s.riley.hp;
  updateFogBolts(s, 1 / 60);
  assert.equal(s.riley.hp, hp - 10);
  assert.equal(s.fogBolts.length, 1);
});

test('an attack frame or a fireball pops a bolt; a grabbed Riley is missed', () => {
  const s = scene({ x: 300, y: 630 });
  const c = new Cultist(s, 0, 630);
  c.startBolt();
  c.update(0.6);
  const bolt = s.fogBolts[0];
  bolt.x = s.riley.x + 40;
  s.riley.state = 'grabbed';
  const hp = s.riley.hp;
  updateFogBolts(s, 1 / 60);
  assert.equal(s.riley.hp, hp);
  assert.equal(s.fogBolts.length, 1);
  s.riley.state = 'idle';
  s.riley.attackFrame = true;
  s.fogBolts[0].x = s.riley.x + 40;
  updateFogBolts(s, 1 / 60);
  assert.equal(s.fogBolts.length, 0);
  assert.equal(bolt.popped, true);

  c.state = 'approach';
  c.boltCool = 0;
  assert.equal(c.startBolt(), true);
  c.update(0.6);
  s.riley.attackFrame = false;
  s.fireballs.push({ x: s.fogBolts[0].x, y: s.fogBolts[0].y, alive: true });
  updateFogBolts(s, 1 / 60);
  assert.equal(s.fogBolts.length, 0);
});

test('ward shove is 5 damage and knockback 260 inside 150 px, then a 3s cooldown', () => {
  const s = scene({ x: 100, y: 630 });
  const c = new Cultist(s, 0, 630);
  c.boltCool = 9;
  c.cool = 9;
  c.update(1 / 60);
  assert.equal(c.state, 'shove');
  assert.equal(s.riley.hp, 95);
  assert.equal(s.riley.vx, 260);
  const hp = s.riley.hp;
  assert.equal(c.shoveCool, 3);
  step([c], 2.9);
  s.riley.x = c.x + 80;
  c.update(1 / 60);
  assert.equal(s.riley.hp, hp, 'still on cooldown');
  assert.ok(c.shoveCool > 0);
  c.shoveCool = 0;
  c.boltCool = 9;
  c.cool = 9;
  c.state = 'approach';
  s.riley.x = c.x + 80;
  c.update(1 / 60);
  assert.equal(c.state, 'shove');
  assert.equal(s.riley.hp, hp - 5);
  const far = scene({ x: 400, y: 630 });
  const d = new Cultist(far, 0, 630);
  d.boltCool = 9;
  d.cool = 9;
  d.update(1 / 60);
  assert.notEqual(d.state, 'shove');
  assert.equal(far.riley.hp, 100);
});

test('heavy hits knock down at low poise; KO and flee alternate; cleanup drops bolts', () => {
  const s = scene();
  const a = new Cultist(s, 100, 630);
  const b = new Cultist(s, 200, 630);
  assert.equal(a.fleeOnKO, false);
  assert.equal(b.fleeOnKO, true);
  assert.equal(a.takeHit({ dmg: 10, kind: 'heavy' }, s.riley), true);
  assert.equal(a.state, 'down');
  assert.equal(a.hp, 20);
  a.takeHit({ dmg: 30, kind: 'heavy' }, s.riley);
  b.takeHit({ dmg: 40, kind: 'heavy' }, s.riley);
  step([a, b], 1);
  assert.equal(a.state, 'ko');
  assert.equal(a.starred, true);
  assert.equal(b.state, 'flee');
  a.startBolt();
  s.fogBolts.push({ x: 0, y: 0, vx: 0, dmg: 10, alive: true, t: 0 });
  clearStage4Cultists(s);
  assert.equal(s.fogBolts.length, 0);
  assert.equal(a.gone, true);
  assert.equal(b.gone, true);
  assert.equal(a.alive, false);
});

test('two cultists keep at most one chant and two bolts while they fight', () => {
  const s = scene({ x: 640, y: 630 });
  const pair = [new Cultist(s, 200, 630), new Cultist(s, 1100, 630)];
  let maxBolts = 0, maxChant = 0;
  for (let i = 0; i < 8 * 60; i++) {
    for (const c of pair) c.update(1 / 60);
    updateFogBolts(s, 1 / 60);
    s.riley.hp = 100;
    maxBolts = Math.max(maxBolts, s.fogBolts.length);
    maxChant = Math.max(maxChant, pair.filter(c => c.state === 'chant').length);
  }
  assert.ok(maxBolts <= 2 && maxBolts >= 1, `bolts ${maxBolts}`);
  assert.equal(maxChant, 1);
});
