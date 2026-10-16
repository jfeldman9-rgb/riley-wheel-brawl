// Balefire and the Loial assist, restored from 1.1 into 2.0 Stage 1.
// Production Stage1/Riley/Loial/Enemy logic runs in the headless harness; the
// controller only presses semantic inputs and holds directions (no HP, position or
// state writes). Rendering and audio are harness stubs: this is logic evidence only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { Input, PAD_MAP } = await import('../src/input.js');
const { BALEFIRE } = await import('../src/riley.js');
const { LOIAL } = await import('../src/loial.js');

const dt = 1 / 60;
/** walk right (semantic input) until at least `n` hittable enemies exist */
function walkToFight(h, n = 2, limit = 60 * 60) {
  const s = h.s;
  for (let f = 0; f < limit; f++) {
    const ready = s.enemies.filter(e => e.canBeHit);
    if (ready.length >= n) return ready;
    s.inp.held = { right: !s.zone || s.enemies.length === 0, left: false, up: false, down: false, run: false };
    h.step(dt);
  }
  assert.fail('no fight reached');
}
function idle(h, frames) { h.s.inp.held = {}; for (let f = 0; f < frames; f++) h.step(dt); }
function faceToward(h, x) {
  const s = h.s, dir = Math.sign(x - s.riley.x) || 1;
  s.inp.held = { right: dir > 0, left: dir < 0 }; h.step(dt); h.step(dt); s.inp.held = {}; h.step(dt);
  return s.riley.facing;
}

test('input: F/B fire balefire, R/V/U/I call Loial; pad B = balefire, LB = Loial, RB alone runs', () => {
  const src = readFileSync(new URL('../src/input.js', import.meta.url), 'utf8');
  for (const k of ['KeyF', 'KeyB']) assert.match(src, new RegExp(`${k}: 'power'`));
  for (const k of ['KeyR', 'KeyV', 'KeyU', 'KeyI']) assert.match(src, new RegExp(`${k}: 'assist'`));
  assert.equal(PAD_MAP[1], 'power'); assert.equal(PAD_MAP[4], 'assist'); assert.equal(PAD_MAP[5], 'run');
  assert.equal(PAD_MAP[2], 'attack'); assert.equal(PAD_MAP[0], 'jump'); assert.equal(PAD_MAP[3], 'special'); assert.equal(PAD_MAP[9], 'start');
  assert.ok(!Object.values(PAD_MAP).filter(a => a === 'run').length || Object.entries(PAD_MAP).filter(([, a]) => a === 'run').every(([b]) => b === '5'));
  let pads = [];
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
  const i = new Input(), p = { id: 'pad', index: 0, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  pads = [p]; p.buttons[4].pressed = true; i.update(dt);
  assert.equal(i.take('assist'), true); assert.equal(i.run, false, 'LB no longer runs');
  p.buttons[4].pressed = false; p.buttons[1].pressed = true; i.update(dt); assert.equal(i.take('power'), true);
  p.buttons[1].pressed = false; p.buttons[5].pressed = true; i.update(dt); assert.equal(i.run, true);
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="tbB"/); assert.match(html, /id="tbL">CALL</);
});

test('balefire needs a full saidin meter, spends all of it, and strikes every foe in front once', () => withSeed(5, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, R = s.riley;
  try {
    assert.equal(R.saidin, 100);
    const foes = walkToFight(h, 2);
    const dir = faceToward(h, foes[0].x);
    const before = new Map(s.enemies.map(e => [e, e.hp]));
    const inFront = s.enemies.filter(e => e.canBeHit && (e.x - R.x) * dir > 0);
    assert.ok(inFront.length >= 1);
    s.inp.press('power'); h.step(dt);
    assert.equal(R.state, 'balefire'); assert.equal(R.saidin, 0); assert.ok(R.inv >= BALEFIRE.invuln - 0.05);
    let fired = false, lightsWhileBeam = 0;
    for (let f = 0; f < 120; f++) { h.step(dt); if (s.beam) { fired = true; lightsWhileBeam = Math.max(lightsWhileBeam, s.beam.lights.length); } }
    assert.ok(fired, 'beam was emitted'); assert.equal(lightsWhileBeam, 2, 'two dynamic lights ride the beam');
    for (const e of inFront) assert.ok(e.hp <= before.get(e) - e.maxHp, `non-boss foe in front is destroyed (${e.type})`);
    for (const e of s.enemies) if ((e.x - R.x) * dir < -200 && before.has(e)) assert.equal(e.hp, before.get(e), 'foes well behind are untouched');
    assert.equal(s.beam, null, 'beam cleaned up'); assert.ok(['idle', 'walk', 'run'].includes(R.state));
    // empty meter: pressing again does nothing
    s.inp.press('power'); h.step(dt); assert.notEqual(R.state, 'balefire');
  } finally { h.destroy(); }
}));

test('balefire below a full meter does not fire', () => withSeed(2, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, R = s.riley;
  try {
    walkToFight(h, 1);
    s.inp.press('special'); for (let f = 0; f < 50; f++) h.step(dt);   // a fireball spends 34 saidin
    assert.ok(R.saidin < 100);
    s.inp.press('power'); h.step(dt);
    assert.notEqual(R.state, 'balefire'); assert.equal(s.beam, null);
  } finally { h.destroy(); }
}));

test('balefire on the boss deals boss damage (80, scaled only by his armor/stun) and does not one-shot him', () => withSeed(3, () => {
  const h = stage1Simulation({ mode: 'boss-coverage' }), s = h.s, R = s.riley;
  try {
    for (let f = 0; f < 60 * 400 && !(s.boss && s.boss.canBeHit && R.saidin >= 100 && !R.busy); f++) h.step(dt);
    assert.ok(s.boss && s.boss.canBeHit, 'boss reached');
    h.setController(null);
    faceToward(h, s.boss.x);
    const hp0 = s.boss.hp;
    let drop = 0;
    const take = s.boss.takeHit.bind(s.boss);
    s.boss.takeHit = (hh, from) => { const before = s.boss.hp, r = take(hh, from); if (r && hh.dmg === 80) drop = before - s.boss.hp; return r; };
    s.inp.press('power');
    for (let f = 0; f < 90; f++) h.step(dt);
    assert.ok([48, 80, 100].some(v => Math.abs(drop - v) < 1e-9), `boss took ${drop}`);
    assert.ok(s.boss.alive || hp0 <= 100);
  } finally { h.destroy(); }
}));

test('Loial: once per stage, charges in, hits foes, leaves; a second call is refused', () => withSeed(4, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, R = s.riley;
  try {
    assert.equal(R.loialReady, true);
    walkToFight(h, 2);
    const before = new Map(s.enemies.map(e => [e, e.hp]));
    s.inp.press('assist'); h.step(dt);
    assert.ok(s.loial, 'Loial spawned'); assert.equal(R.loialReady, false);
    assert.ok(s.loial.x < s.camX, 'enters from the left edge');
    const L = s.loial;
    let maxX = L.x, frames = 0;
    while (s.loial && frames++ < 60 * 12) { h.step(dt); if (s.loial) maxX = Math.max(maxX, s.loial.x); }
    assert.equal(s.loial, null, 'Loial leaves and is cleaned up');
    assert.ok(frames / 60 >= LOIAL.life - 0.1);
    const hit = [...before].filter(([e, hp]) => e.hp < hp);
    assert.ok(hit.length >= 1, 'Loial struck at least one foe');
    for (const [e, hp] of hit) assert.ok(hp - e.hp >= LOIAL.dmg || !e.alive);
    s.inp.press('assist'); h.step(dt);
    assert.equal(s.loial, null, 'spent: no second Loial'); assert.equal(R.loialReady, false);
  } finally { h.destroy(); }
}));
