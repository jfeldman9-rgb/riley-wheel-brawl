// Stage 6 never loads riley3, so a grab while Riley is idle used to leave the
// looping idle clip running. escape() waited on animationcomplete and never
// returned the controls. The harness injects every Stage 3 clip, which hid that.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';
import { arena, placeC } from './helpers/stage3-harness.mjs';
import { GRABBED } from '../src/riley.js';

const HIDDEN = new Set(['riley_grabbed', 'riley_escape']);

test('Stage 6 build aliases grabbed and escape after the cutthroat clips', () => {
  const src = readFileSync(new URL('../src/stage6.js', import.meta.url), 'utf8');
  const build = src.slice(src.indexOf('build()'));
  const makeAt = build.indexOf("makeCharAnims(this.s, ['cutthroat'])");
  const ensureAt = build.indexOf('ensureStage4Anims(this.s)');
  assert.ok(makeAt > 0 && ensureAt > makeAt, 'ensureStage4Anims(this.s) follows makeCharAnims');
});

test('Stage 6 escape ends without riley_grabbed and riley_escape, then attack works', () => withSeed(1, () => {
  const h = stage6Simulation({ mode: null });
  try {
    const s = h.s, R = s.riley;
    const origExists = s.anims.exists;
    s.anims.exists = function (key) {
      if (HIDDEN.has(key)) return false;
      return origExists.call(this, key);
    };
    const origPlay = R.sprite.play;
    R.sprite.play = function (name, ...args) {
      if (HIDDEN.has(name)) return this;
      return origPlay.call(this, name, ...args);
    };
    arena(s);
    const stone = s.kit.stone;
    for (let z = 0; z <= 3; z++) stone.cleared.add(z);
    stone.nets.length = 0; stone.lamps.length = 0; stone.pools.length = 0; stone.lines.length = 0; stone.rays.length = 0;
    assert.equal(s.anims.exists('riley_grabbed'), false);
    assert.equal(s.anims.exists('riley_escape'), false);

    const c = placeC(s, -220);
    c.startLunge();
    let held = -1;
    for (let i = 0; i < 72; i++) { if (c.state === 'holding') { held = i; break; } h.step(); }
    assert.ok(held >= 0, 'cutthroat reaches holding');
    assert.equal(R.state, 'grabbed');
    assert.equal(R.cur, 'riley_idle', 'the missing grabbed clip leaves the looping idle running');

    for (let i = 0; i < 6; i++) { s.inp.press('attack'); h.step(); }
    assert.equal(R.state, 'escape');
    assert.equal(R.grabbedBy, null);
    s.enemies = s.enemies.filter(e => e !== c);

    s.inp.press('attack');
    h.step();
    assert.equal(R.state, 'escape', 'attack during the break does not start a combo');

    const early = Math.floor((GRABBED.escapeLimit - 0.05) * 60);
    for (let i = 0; i < early; i++) h.step();
    assert.equal(R.state, 'escape', 'still breaking after the painted clip would have ended');
    for (let i = 0; i < 15 && R.state === 'escape'; i++) h.step();
    assert.equal(R.state, 'idle');
    assert.equal(R.lastGrabber, null);
    assert.ok(R.inv >= 0.45);
    s.inp.press('attack');
    h.step();
    assert.equal(R.state, 'combo1');
  } finally { h.destroy(); }
}));
