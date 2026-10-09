// Regression coverage for B3, S8 and N6: real production power/projectile hits against Whitecloak guards,
// stage-restart light caps, and title-arrow touch hit areas/routing. Renderer and touch dispatch are stubs;
// these checks do not replace physical-device touch testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { Zealot, Byar } = await import('../src/whitecloaks.js');
const { LIGHTNING, AIR_WHIP, FIRE_SHIELD, POWERS } = await import('../src/powers.js');
const { Stage1, FIRE_LIGHT_CAP } = await import('../src/stage1.js');
const { HUD, STAGE_NAMES } = await import('../src/hud.js');

function stage2(fn) {
  return withSeed(23, () => {
    const h = stage1Simulation({ mode: '', stage: 2, followRestart: true }), s = h.s;
    try {
      for (let i = 0; i < 120 && !s.cutscene; i++) h.step();
      assert.ok(s.cutscene); s.endTwixCutscene('skip'); h.step();
      return fn(h, s, s.riley);
    } finally { h.destroy(); }
  });
}
function guard(s, Enemy, dx = 100, facing = -1) {
  const R = s.riley, e = new Enemy(s, R.x + dx, R.y);
  e.entering = false; e.wake = 0; e.cool = 99;
  if (e instanceof Byar) { e.startParry(); e.face(facing); }
  else { e.setState('approach', 'guard'); e.face(facing); }
  s.enemies.push(e); return e;
}
function recordHits(e) {
  const hits = [], takeHit = e.takeHit.bind(e);
  e.takeHit = (hit, from) => { hits.push({ ...hit }); return takeHit(hit, from); };
  return hits;
}
const powers = [
  ['lightning', LIGHTNING.dmg, (s, R) => s.powers.fireLightning(R)],
  ['air whip', AIR_WHIP.dmg, (s, R) => s.powers.fireWhip(R)],
  ['fire shield', FIRE_SHIELD.dmg, s => { s.powers.activate('fireshield'); s.powers.updateShield(1 / 60); }],
  ['Balefire', null, (s, R) => s.fireBalefire(R)],
];
for (const Enemy of [Zealot, Byar]) for (const [name, damage, fire] of powers) {
  test(`${name}: production hit bypasses ${Enemy === Zealot ? 'a raised zealot shield' : "Byar's parry"}`, () => stage2((h, s, R) => {
    R.face(1);
    // The whip pulls from its far-side anchor; face that impact source to exercise a frontal shield block.
    const e = guard(s, Enemy, 100, name === 'air whip' ? 1 : -1), hits = recordHits(e), hp = e.hp;
    fire(s, R);
    assert.equal(hits.length, 1, 'one production hit'); assert.equal(hits[0].power, true);
    const expected = damage ?? (Enemy === Byar ? 80 : e.maxHp + 10);
    assert.equal(hp - e.hp, expected, 'same full damage as an unguarded target');
    assert.equal(e.ripostes || 0, 0); assert.equal(s.kit.stats.blocks, 0); assert.equal(s.kit.stats.guardBreaks, 0);
    if (name === 'air whip') assert.equal(s.powers.pulls.length, Enemy === Byar ? 0 : 1, 'boss stays planted; zealot is pulled');
    if (name === 'Balefire') {
      assert.ok(s.beam.struck.has(e)); s.balefireSweep(); assert.equal(hits.length, 1, 'a landed beam does not strike twice');
    }
  }));
}

test('pressing Balefire spends one full meter and lands before Byar finishes the parry', () => stage2((h, s, R) => {
  R.face(1); const b = guard(s, Byar, 220), hits = [], takeHit = b.takeHit.bind(b);
  b.takeHit = (hit, from) => { hits.push({ state: b.state, damage: hit.dmg, power: hit.power }); return takeHit(hit, from); };
  assert.equal(R.saidin, 100); s.inp.press('power'); h.step();
  assert.equal(R.state, 'balefire'); assert.equal(R.saidin, 0);
  for (let i = 0; i < 90 && !hits.length; i++) h.step();
  assert.deepEqual(hits, [{ state: 'parry', damage: 80, power: true }]);
  assert.equal(b.hp, b.maxHp - 80); assert.equal(b.ripostes, 0);
  for (let i = 0; i < 90 && s.beam; i++) h.step();
  assert.equal(s.beam, null); assert.equal(hits.length, 1); assert.equal(R.saidin, 0);
}));

test('lightning chains keep power bypass on both initial and secondary hits, with secondary meter suppressed', () => stage2((h, s, R) => {
  R.face(1); R.saidin = 0;
  const z = guard(s, Zealot, 180), b = guard(s, Byar, 380), hits = [recordHits(z), recordHits(b)];
  assert.deepEqual(s.powers.fireLightning(R), [z, b]);
  assert.equal(z.hp, z.maxHp - LIGHTNING.dmg); assert.equal(b.hp, b.maxHp - LIGHTNING.chainDmg);
  assert.deepEqual(hits.map(h => h[0].power), [true, true]); assert.deepEqual(hits.map(h => h[0].noMeter), [false, true]);
  assert.equal(R.saidin, 3, 'one landed-hit meter award'); assert.equal(b.ripostes, 0);
}));

for (const boost of [null, 'angreal', 'saangreal']) {
  test(`${boost || 'normal'} fireballs still glance off Byar through the production projectile collision`, () => stage2((h, s, R) => {
    R.face(1); const b = guard(s, Byar, 220), hits = recordHits(b);
    if (boost) s.powers.activate(boost);
    s.spawnFireball(R);
    const n = boost ? 3 : 1; assert.equal(s.fireballs.length, n);
    for (let i = 0; i < 300 && s.fireballs.length; i++) s.updateFireballs(1 / 120);
    assert.equal(s.fireballs.length, 0, 'projectiles are removed on collision or after leaving the screen');
    assert.ok(hits.length >= 1, 'the central projectile reached the shield');
    assert.ok(hits.every(hit => !hit.power), 'fireballs remain outside the power-bypass contract');
    assert.ok(hits.every(hit => hit.dmg === (boost ? POWERS[boost].fireDmg : 14)), 'damage is unchanged');
    assert.equal(b.hp, b.maxHp); assert.equal(b.state, 'parry'); assert.equal(b.ripostes, 0);
  }));
}

test('restarting after Stage 2 rage restores the normal fire light cap in both stages', () => stage2((h, s) => {
  assert.equal(s.fireCap, FIRE_LIGHT_CAP);
  for (const stage of [2, 1]) {
    s.kit.rage({ x: 800, y: 630, facing: -1 });
    assert.ok(s.fireCap > FIRE_LIGHT_CAP, 'rage expands the scene light cap');
    s.scene.restart({ stage }); h.step();
    assert.equal(s.stageNo, stage); assert.equal(s.fireCap, FIRE_LIGHT_CAP, 'new scene does not inherit the rage cap');
  }
}));

for (const stage of [1, 2]) test(`Stage ${stage} fire patches preserve their stage-specific cap and ember size`, () => withSeed(31, () => {
  const h = stage1Simulation({ mode: '', stage }), s = h.s, created = [], addParticles = s.add.particles;
  try {
    const lights = h.resources().lights;
    s.add.particles = (...args) => { created.push(args[3]); return addParticles(...args); };
    for (let i = 0; i < 4; i++) s.addPatch(300 + i * 200, 600);
    const expected = stage === 2 ? 2 : 3;
    assert.equal(s.patches.length, expected); assert.equal(h.resources().lights, lights + expected);
    assert.equal(s.patches[0].x, 300 + (4 - expected) * 200, 'oldest patch is cleaned up first');
    assert.ok(created.filter((_, i) => i % 2 === 0).every(c => c.scale.start === (stage === 2 ? 1.2 : 1.8)));
  } finally { h.destroy(); }
}));

function titleHUD() {
  const hud = Object.create(HUD.prototype), pressed = [], handlers = new Map(), objects = [];
  const visual = (x = 0, y = 0, text = '') => {
    const v = { x, y, text, width: 40, height: 48, handlers: new Map(), active: true,
      setOrigin(x, y = x) { this.displayOriginX = this.width * x; this.displayOriginY = this.height * y; return this; },
      setInteractive(config) { this.input = config; return this; },
      setAlpha(alpha) { this.alpha = alpha; return this; }, setText(text) { this.text = text; return this; },
      on(name, fn) { this.handlers.set(name, fn); return this; }, fillStyle() {}, fillRect() {},
    }; objects.push(v); return v;
  };
  hud.add = { graphics: visual, text: visual }; hud.card = { removeAll() {}, add() {} }; hud.tweens = { add() {} };
  hud.game = { inp: { isTouch: true, press: a => pressed.push(a) } }; hud.input = { on: (name, fn) => handlers.set(name, fn) };
  hud.stage = { stageNo: 1, titleSel: 1, started: false, ended: false, hud,
    selectStage(dir) { Stage1.prototype.selectStage.call(this, dir); } };
  class Rectangle {
    constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
    static Contains(a, x, y) { return x >= a.x && y >= a.y && x <= a.x + a.width && y <= a.y + a.height; }
  }
  const before = Phaser.Geom; Phaser.Geom = { ...before, Rectangle };
  try { hud.titleCard(); } finally { Phaser.Geom = before; }
  // Phaser converts from pointer world coordinates to local top-left coordinates before applying the hit area.
  const tap = (x, y) => {
    const over = objects.filter(o => o.input && o.input.hitAreaCallback(o.input.hitArea, x - o.x + o.displayOriginX, y - o.y + o.displayOriginY));
    const pointer = { wasTouch: true, x, y };
    for (const o of over) o.handlers.get('pointerdown')?.(pointer);
    handlers.get('pointerdown')(pointer, over);
    return over;
  };
  return { hud, pressed, tap };
}

test('touch stage-select arrows have centred 120×100 targets, including edges outside the glyph', () => {
  const { hud, pressed, tap } = titleHUD();
  const right = hud.titleArrowR, left = hud.titleArrowL;
  for (const arrow of [right, left]) {
    assert.equal(arrow.input.hitArea.width, 120); assert.equal(arrow.input.hitArea.height, 100);
  }
  const corners = [[-59, -49], [59, 49], [-59, 49], [59, -49], [0, 0]];
  const expectRight = [2, 3, 4, 5, 5];
  corners.forEach(([dx, dy], i) => {
    assert.deepEqual(tap(right.x + dx, right.y + dy), [right], 'expanded touch target catches the tap');
    assert.equal(hud.stage.titleSel, expectRight[i]); assert.equal(hud.titleStageT.text, STAGE_NAMES[expectRight[i]]);
    assert.equal(pressed.length, 0, 'stage selection never emits Start, even on repeated/clamped taps');
  });
  assert.equal(hud.titleArrowR.alpha, 0.25); assert.equal(hud.titleArrowL.alpha, 1);
  const expectLeft = [4, 3, 2, 1, 1];
  corners.forEach(([dx, dy], i) => {
    assert.deepEqual(tap(left.x + dx, left.y + dy), [left]);
    assert.equal(hud.stage.titleSel, expectLeft[i]); assert.equal(hud.titleStageT.text, STAGE_NAMES[expectLeft[i]]);
    assert.equal(pressed.length, 0);
  });
  assert.equal(hud.titleArrowL.alpha, 0.25); assert.equal(hud.titleArrowR.alpha, 1);
  assert.deepEqual(tap(0, 110), []); assert.deepEqual(pressed, ['start'], 'the start prompt still starts normally');
  hud.stage.started = true; tap(0, 110); assert.deepEqual(pressed, ['start'], 'battlefield taps do not emit Start');
});

test('touch stage-select hit areas stop outside the 120×100 boundary', () => {
  for (const [dx, dy] of [[-61, 0], [61, 0], [0, -51], [0, 51]]) {
    const { hud, tap, pressed } = titleHUD(), arrow = hud.titleArrowR;
    assert.deepEqual(tap(arrow.x + dx, arrow.y + dy), []);
    assert.equal(hud.stage.titleSel, 1); assert.deepEqual(pressed, ['start'], 'outside the arrow is an ordinary title tap');
  }
});
