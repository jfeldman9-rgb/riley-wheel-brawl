import test from 'node:test';
import assert from 'node:assert/strict';
import { Draghkar } from '../src/draghkar.js';
import { Cultist } from '../src/cultists.js';
import { stage4Delta, STAGE4_DT_MAX } from '../src/stage4-time.js';
import { ensureStage4Anims } from '../src/stage4-art-thug.js';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';

function scene() {
  return {
    riley: { x: 740, y: 600, hp: 100, alive: true, state: 'idle', facing: -1, attackFrame: true, grabbedBy: null },
    enemies: [], fireballs: [], grabBusy: false,
  };
}

test('one attack press counters a kiss lunge once, including across later substeps', () => {
  const s = scene();
  const d = new Draghkar(s, 700, 600);
  d.phase = 2; d.kissBetweenAction = true; d.startKiss();
  const hp = d.hp;
  d.update(0.61);
  d.update(0.2);
  assert.equal(d.hp, hp - 10);
  assert.equal(d.state, 'counter_down');
  assert.equal(s.riley.grabbedBy, null);
  assert.equal(s.riley.state, 'idle');
});

test('a kiss windup frame is not a counter; the active frame still counters once', () => {
  const c = kissScene();
  try {
    c.R.x = 740; c.R.facing = -1; c.R.attackFrame = false;
    c.R.state = 'combo1'; c.R.atk = { active: [3] };
    c.d.startKiss(); c.d.update(0.61);
    const hp = c.d.hp;
    c.d.update(0.05);
    assert.equal(c.R.attackFrame, false);
    assert.equal(c.d.hp, hp);
    assert.equal(c.d.state, 'kiss_lunge');
    assert.equal(c.R.grabbedBy, null);
    c.R.attackFrame = true;
    c.d.update(0.2);
    assert.equal(c.d.hp, hp - 10);
    assert.equal(c.d.state, 'counter_down');
    assert.equal(c.R.grabbedBy, null);
  } finally { c.h.destroy(); }
});

test('replacing Riley cannot leave the kiss token stuck', () => {
  const c = kissScene();
  try {
    c.hold();
    const old = c.R;
    assert.equal(c.s._kissBusy, true);
    c.s.riley = { x: 400, y: 630, hp: 100, alive: true, state: 'idle', facing: 1, grabbedBy: null };
    c.d.releaseGrab();
    assert.equal(c.s._kissBusy, false);
    assert.equal(old.grabbedBy, null);
    assert.equal(c.d.held(), false);
    c.d.kissCooldown = 0; c.d.kissLockout = 0; c.d.kissBetweenAction = true; c.d.state = 'grounded'; c.d.alive = true;
    assert.equal(c.d.startKiss(), true);
  } finally { c.h.destroy(); }
});

test('a direct 60s step cannot run a minute of 120 Hz substeps', () => {
  const s = scene();
  const d = new Draghkar(s, 700, 600);
  let steps = 0;
  const orig = d.substep.bind(d);
  d.substep = dt => { steps++; orig(dt); };
  d.update(60);
  assert.ok(steps <= STAGE4_DT_MAX * 120, `substeps ${steps}`);
  assert.equal(stage4Delta(60), STAGE4_DT_MAX);
  assert.equal(stage4Delta(9.9), 9.9);
  const cult = new Cultist(s, 400, 630);
  cult.state = 'ko'; cult.shoveCool = 30;
  cult.update(60);
  assert.equal(cult.shoveCool, 20);
});

test('a scene method replaced after the Stage 4 hook is still restored', () => {
  const c = kissScene();
  try {
    const third = function stage4Rewrap() {};
    c.s.update = third;
    c.s.kit.destroy();
    assert.notEqual(c.s.update, third);
    assert.ok(c.s.kit.hookMiss >= 1);
  } finally { c.h.destroy(); }
});

test('Stage 4 can resolve riley_grabbed from the hurt clip', () => {
  const created = [];
  const hurt = { frames: [{ frame: { texture: { key: 'riley-0' }, name: 'riley_hurt_00' }, duration: 90 }] };
  const anims = {
    exists: key => key === 'riley_hurt' || key === 'riley_knockdown',
    get: key => key === 'riley_hurt' ? hurt : { frames: [{ frame: { texture: { key: 'riley-0' }, name: 'riley_knockdown_00' }, duration: 120 }] },
    create(def) { created.push(def); },
  };
  ensureStage4Anims({ anims });
  assert.equal(created.map(a => a.key).join(','), 'riley_grabbed,riley_escape');
  assert.equal(created[0].frames[0].frame, 'riley_hurt_00');
  assert.equal(created[0].repeat, -1);
});
