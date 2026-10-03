// Fixes from the Claude Code review of PR #16 (balefire + Loial). Production Stage1/Riley/Loial logic runs in the
// headless harness; the controller only presses semantic inputs and holds directions. Logic evidence only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { sfx } = await import('../src/audio.js');
const { BALEFIRE } = await import('../src/riley.js');

const dt = 1 / 60;
const readJSON = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
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
function faceToward(h, x) {
  const s = h.s, dir = Math.sign(x - s.riley.x) || 1;
  s.inp.held = { right: dir > 0, left: dir < 0 }; h.step(dt); h.step(dt); s.inp.held = {}; h.step(dt);
  return s.riley.facing;
}
/** a stage sitting on the title card (the harness's own Start press is withdrawn) */
function onTitle() {
  const h = stage1Simulation({ mode: null }), s = h.s;
  s.startRequested = false; s.inp.clear();
  for (let f = 0; f < 5; f++) h.step(dt);
  assert.equal(s.started, false); assert.equal(s.hudReady, true);
  return h;
}

for (const action of ['assist', 'power']) {
  test(`the ${action} press that starts the game is not replayed as a move`, () => withSeed(1, () => {
    const h = onTitle(), s = h.s, R = s.riley;
    try {
      s.inp.press(action);
      for (let f = 0; f < 3; f++) h.step(dt);
      assert.equal(s.started, true, 'the press still starts the game');
      assert.equal(R.loialReady, true, 'Loial not spent'); assert.equal(s.loial, null);
      assert.equal(R.saidin, 100, 'meter not spent'); assert.notEqual(R.state, 'balefire'); assert.equal(s.beam, null);
      assert.deepEqual(s.inp.buf, {}, 'no buffered press left over');
    } finally { h.destroy(); }
  }));
}

test('CALL and BALE are refused on an empty street and spend nothing; they work once a foe can be hit', () => withSeed(2, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, R = s.riley;
  try {
    for (let f = 0; f < 30; f++) h.step(dt);
    assert.equal(s.started, true); assert.equal(s.hasHittableFoe(), false, 'empty street at the start');
    s.inp.press('assist'); h.step(dt);
    assert.equal(R.loialReady, true); assert.equal(s.loial, null);
    s.inp.press('power'); h.step(dt);
    assert.equal(R.saidin, 100); assert.notEqual(R.state, 'balefire'); assert.equal(s.beam, null);
    for (let f = 0; f < 30; f++) h.step(dt);   // the refused presses do not fire later either
    assert.equal(R.loialReady, true); assert.equal(R.saidin, 100); assert.equal(s.beam, null);
    // with a foe in reach both work as before
    const foes = walkToFight(h, 1);
    assert.equal(s.hasHittableFoe(), true);
    faceToward(h, foes[0].x);
    s.inp.press('power'); h.step(dt);
    assert.equal(R.state, 'balefire'); assert.equal(R.saidin, 0);
    for (let f = 0; f < 90; f++) h.step(dt);
    walkToFight(h, 1);
    s.inp.press('assist'); h.step(dt);
    assert.ok(s.loial, 'Loial comes when a foe can be hit'); assert.equal(R.loialReady, false);
  } finally { h.destroy(); }
}));

test('balefire hits build no saidin: the meter stays empty after the beam, and only the balefire sfx plays', () => withSeed(5, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, R = s.riley;
  const calls = { fire: 0, balefire: 0 }, orig = { fire: sfx.fire, balefire: sfx.balefire };
  sfx.fire = (...a) => { calls.fire++; return orig.fire(...a); }; sfx.balefire = (...a) => { calls.balefire++; return orig.balefire(...a); };
  try {
    const foes = walkToFight(h, 2);
    faceToward(h, foes[0].x);
    s.inp.press('power'); h.step(dt);
    assert.equal(R.state, 'balefire'); assert.equal(R.saidin, 0);
    let struck = 0;
    for (let f = 0; f < 120; f++) { h.step(dt); if (s.beam) struck = Math.max(struck, s.beam.struck.size); }
    assert.ok(struck >= 1, 'the beam hit at least one foe');
    assert.equal(R.saidin, 0, `meter after the beam is ${R.saidin}`);
    assert.equal(calls.fire, 0, 'no fireball sfx on balefire'); assert.equal(calls.balefire, 1, 'one balefire sfx');
    // ordinary hits still build meter
    const before = R.saidin; R.landedHit(5); assert.equal(R.saidin, before + 3);
  } finally { sfx.fire = orig.fire; sfx.balefire = orig.balefire; h.destroy(); }
}));

test('balefire frames 04-05 are re-registered so the feet sit with the other balefire frames (offset only)', () => {
  const atlas = readJSON('../assets/chars/riley-0.json').frames;
  const bottoms = [...Array(8).keys()].map(i => { const f = atlas[`riley_balefire_0${i}`]; return f.spriteSourceSize.y + f.frame.h; });
  assert.ok(Math.max(...bottoms) - Math.min(...bottoms) <= 4, `balefire frame bottoms ${bottoms}`);
  // only the placement moved: sizes and atlas rectangles are those of the shipped art
  assert.deepEqual(atlas.riley_balefire_04.frame, { x: 3014, y: 1062, w: 304, h: 302 });
  assert.deepEqual(atlas.riley_balefire_05.frame, { x: 2268, y: 1062, w: 267, h: 307 });
  for (const n of ['riley_balefire_04', 'riley_balefire_05']) assert.equal(atlas[n].spriteSourceSize.y % 2, 0, 'even offset (half-res normal pages)');
});

test('Loial swing drops the back-view frame and keeps its timing and hit frame', () => {
  const sweep = readJSON('../assets/chars/loial.anims.json').anims.find(a => a.name === 'loial_sweep');
  assert.ok(!sweep.frames.includes('loial_sweep_02'));
  assert.deepEqual(sweep.frames, ['loial_sweep_00', 'loial_sweep_01', 'loial_sweep_03']);
  assert.equal(sweep.holds.reduce((a, b) => a + b, 0), 480, 'swing length unchanged (140+90+120+130)');
  assert.equal(sweep.frames.length, sweep.holds.length); assert.equal(sweep.frames.length, sweep.pages.length);
  const atlas = readJSON('../assets/chars/loial-0.json').frames;
  for (const a of readJSON('../assets/chars/loial.anims.json').anims) for (const n of a.frames) assert.ok(atlas[n], `${n} is in the atlas`);
});

test('touch buttons use notch-safe margins; BALE is bigger and clear of JUMP; upright phones get their own CALL spot', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const rule = id => (html.match(new RegExp(`#${id}\\{[^}]*\\}`)) || [''])[0];
  for (const id of ['tbA', 'tbJ', 'tbS', 'tbB', 'tbL']) assert.match(rule(id), /right:calc\([^;]*env\(safe-area-inset-right/, `${id} right inset`);
  for (const id of ['tbA', 'tbJ', 'tbS', 'tbB', 'tbL']) assert.match(rule(id), /bottom:calc\([^;]*env\(safe-area-inset-bottom/, `${id} bottom inset`);
  assert.match(rule('tbP'), /top:calc\([^;]*env\(safe-area-inset-top/); assert.match(rule('stick'), /left:calc\([^;]*env\(safe-area-inset-left/);
  assert.match(rule('tbB'), /width:max\(48px,min\(13vh,80px\)\)/);
  assert.match(rule('tbB'), /bottom:calc\(5vh \+ min\(11vh,70px\) \+ min\(14vh,92px\) \+ max\(20px,4vh\)/, 'BALE starts a 20px+ gap above the top of JUMP');
  const portrait = (html.match(/@media \(orientation:portrait\)\{([\s\S]*?)\n\}/) || [])[1] || '';
  assert.match(portrait, /#stick\{width:min\(38vw,30vh,200px\)/); assert.match(portrait, /#tbL\{right:calc\(3vw/);
  assert.match(portrait, /#perf-open\{top:max\(12px,env\(safe-area-inset-top\)\);bottom:auto\}/);
});
