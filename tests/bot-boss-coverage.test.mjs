// No dependencies: node --test tests/bot-boss-coverage.test.mjs
// These test input policy and observed evidence, not Phaser rendering/device performance.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
const { Bot } = await import('../src/bot.js');

function setup({ phase = 1, state = 'approach', x = 700, y = 630 } = {}) {
  const boss = { id: 1, type: 'chief', T: { boss: true }, phase, state, x, y, hp: 360, alive: true };
  const presses = [];
  const s = { started: true, ended: false, gameOver: false, locked: true, zone: { boss: true }, boss,
    bounds: { l: 0, r: 1280 }, enemies: [boss], carts: [], pickups: [],
    riley: { x: 200, y: 630, hp: 100, lives: 3, alive: true, facing: 1, state: 'idle', busy: false },
    inp: { demo: null, press(a) { presses.push(a); } },
  };
  return { s, boss, presses, bot: new Bot(s, { mode: 'boss-coverage' }) };
}

test('coverage is opt-in and uses deterministic decisions without modifying fighters', () => {
  const { s, boss, bot } = setup(); const normal = new Bot(s);
  assert.equal(normal.bossCoverage, false); assert.equal(bot.bossCoverage, true);
  Object.freeze(boss); Object.freeze(s.riley);
  const random = Math.random; Math.random = () => { throw new Error('coverage input policy must not sample RNG'); };
  try { bot.update(1 / 60); } finally { Math.random = random; }
  assert.deepEqual(s.inp.demo, { x: 1, y: 0, run: false });
  assert.equal(boss.hp, 360); assert.equal(s.riley.hp, 100); assert.equal(s.riley.lives, 3);
});

test('phase 1 waits for real chop and sweep, dodging their windups', () => {
  const { s, boss, bot, presses } = setup({ state: 'attack' });
  bot.update(1 / 60); assert.deepEqual(bot.coverage.attacks, ['chop']); assert.equal(s.inp.demo.y, 1); assert.deepEqual(presses, []);
  boss.state = 'sweep'; bot.update(1 / 60); assert.deepEqual(bot.coverage.attacks, ['chop', 'sweep']);
});

test('phase 2 retreats and aligns instead of hurting boss before charge-wall coverage', () => {
  const { s, bot, presses } = setup({ phase: 2 });
  bot.update(1 / 60); assert.deepEqual(s.inp.demo, { x: -1, y: 0, run: true }); assert.deepEqual(presses, []);
});

test('charge is dodged and only charge → stunned counts as a wall stun', () => {
  const { s, boss, bot } = setup({ phase: 2, state: 'stunned' });
  bot.update(1 / 60); assert.equal(bot.coverage.wallStun, false);
  boss.state = 'charge'; bot.update(1 / 60); assert.equal(s.inp.demo.x, 0); assert.equal(s.inp.demo.y, 1);
  boss.state = 'stunned'; bot.update(1 / 60); assert.equal(bot.coverage.wallStun, true);
});

test('old hounds cannot count as newly summoned hounds', () => {
  const { s, boss, bot } = setup({ phase: 2 });
  const hound = id => ({ id, type: 'hound', T: {}, alive: true, entering: true });
  s.enemies.push(hound(2)); bot.update(1 / 60);
  boss.state = 'roar'; bot.update(1 / 60); assert.equal(bot.coverage.summonedHounds, 0);
  s.enemies.push(hound(3), hound(4)); bot.update(1 / 60); assert.equal(bot.coverage.summonedHounds, 2);
  bot.update(1 / 60); assert.equal(bot.coverage.summonedHounds, 2);
});

test('phase 3 does not call hurl coverage complete before an actual cart exists', () => {
  const { s, boss, bot, presses } = setup({ phase: 3, state: 'hurl' });
  bot.update(1 / 60); assert.equal(bot.coverage.carts, 0); assert.equal(bot.coverage.complete, false);
  assert.equal(s.inp.demo.run, true); assert.deepEqual(presses, []);
  s.carts.push({}); bot.update(1 / 60); bot.update(1 / 60);
  assert.equal(bot.coverage.carts, 1); assert.equal(s.inp.demo.y, 1);
});

test('complete requires every phase, attack, wall-stun, summons and cart observation', () => {
  const { s, boss, bot } = setup();
  for (const state of ['approach', 'attack', 'sweep']) { boss.state = state; bot.update(1 / 60); }
  boss.phase = 2;
  for (const state of ['roar', 'charge', 'stunned']) { boss.state = state; bot.update(1 / 60); }
  s.enemies.push({ id: 2, type: 'hound', entering: true }, { id: 3, type: 'hound', entering: true });
  boss.phase = 3;
  for (const state of ['lift', 'hurl']) { boss.state = state; bot.update(1 / 60); }
  assert.equal(bot.coverage.complete, false);
  s.carts.push({}); bot.update(1 / 60); assert.equal(bot.coverage.complete, true);
});

test('combo follow-ups use live player state without wall-clock timers', () => {
  const { s, boss, bot, presses } = setup();
  bot.coverage.attacks = ['chop', 'sweep']; s.riley.x = boss.x - 150;
  bot.update(1 / 60); assert.deepEqual(presses, ['attack']);
  s.riley.state = 'combo1'; s.riley.busy = true; bot.update(1 / 60); assert.deepEqual(presses, ['attack', 'attack']);
  s.riley.state = 'hurt'; bot.update(1 / 60); assert.equal(presses.length, 2);
});

for (const stop of ['ended', 'gameOver', 'dead']) test(`no inputs after ${stop}`, () => {
  const { s, bot, presses } = setup();
  if (stop === 'dead') s.riley.alive = false; else s[stop] = true;
  bot.update(1 / 60); assert.deepEqual(s.inp.demo, { x: 0, y: 0 }); assert.deepEqual(presses, []);
});

test('normal demo follow-ups use scene timers, not wall-clock timers', () => {
  const { s, boss, presses } = setup(); s.riley.x = boss.x - 170;
  const scheduled = [];
  s.time = { delayedCall(ms, fn) { scheduled.push({ ms, fn }); } };
  const bot = s.bot = new Bot(s, { mode: '1' });
  const random = Math.random, timeout = globalThis.setTimeout;
  Math.random = () => 0.5;
  globalThis.setTimeout = () => { throw new Error('Demo inputs cannot outlive the scene clock'); };
  try { bot.update(1 / 60); } finally { Math.random = random; globalThis.setTimeout = timeout; }
  assert.deepEqual(scheduled.map(t => t.ms), [220, 470]); assert.deepEqual(presses, ['attack']);
  scheduled[0].fn(); assert.deepEqual(presses, ['attack', 'attack']);
  s.ended = true; scheduled[1].fn(); assert.equal(presses.length, 2);
});

for (const changed of ['death', 'restart', 'replacement', 'gameOver']) test(`scene callback discards stale input after ${changed}`, () => {
  const { s, presses } = setup(); let callback;
  s.time = { delayedCall(ms, fn) { callback = fn; } };
  const bot = s.bot = new Bot(s, { mode: '1' }); bot.pressLater('attack', 220);
  if (changed === 'death') s.riley.alive = false;
  if (changed === 'restart') s.riley = { ...s.riley };
  if (changed === 'replacement') s.bot = new Bot(s, { mode: '1' });
  if (changed === 'gameOver') s.gameOver = true;
  callback(); assert.deepEqual(presses, []);
});
