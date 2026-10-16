import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Belal, BELAL } from '../src/belal.js';
import { GrayMan } from '../src/grayman.js';
import { Fadelt } from '../src/fadelt.js';
import { createStone, BANDS } from '../src/stage6-arena.js';
import { createStage6View } from '../src/stage6-view.js';

function scene() { return { riley: { x: 600, y: 630, hp: 100, alive: true, inv: 0, facing: 1, state: 'idle' }, enemies: [], bounds: { l: 0, r: 1280 }, bands: BANDS, kit: {}, attackTokens: () => 0 }; }
for (const protectedState of ['inv', 'story', 'pause', 'strike']) test(`all Stage 6 direct attacks preserve HP during ${protectedState}`, () => {
  for (const Actor of [Belal, GrayMan, Fadelt]) {
    const s = scene(), e = new Actor(s, 650, 630);
    if (protectedState === 'inv') s.riley.inv = 1; if (protectedState === 'story') s.cutscene = {}; if (protectedState === 'pause') s.paused = true; if (protectedState === 'strike') s.kit.strike = {};
    if (Actor === GrayMan) { e.state = 'lunge'; e.st = 0; e.lunge(0); }
    else { e.state = 'attack'; e.hitI = 0; e.st = Actor === Belal ? BELAL.tells[0] : 0.5; if (Actor === Belal) e.flurry(); else e.string(); }
    assert.equal(s.riley.hp, 100, Actor.name);
  }
});
for (const protection of ['snare', 'line', 'getup']) test(`a running Be'lal flurry cannot connect if ${protection} begins during its tell`, () => {
  const s = scene(), b = new Belal(s, 650, 630); b.startFlurry(); b.st = BELAL.tells[0] - 1 / 60;
  if (protection === 'snare') s.riley.fogSlow = 0.6; if (protection === 'getup') s.kit.getupCool = 0.8; if (protection === 'line') s.kit.stone = { lines: [{ band: 1, phase: 'fire' }] };
  for (let i = 0; i < 180; i++) b.update(1 / 60); assert.equal(s.riley.hp, 100);
});
for (const hazard of ['net', 'line']) test(`a ${hazard} cannot snare during getup invulnerability`, () => {
  const s = scene(), stone = createStone(); s.riley.inv = 1;
  if (hazard === 'net') stone.nets.push({ zone: 0, band: 1, x: 600, t: 0.99, phase: 'tell' });
  else stone.lines.push({ band: 1, t: 1.19, phase: 'tell' });
  stone.step(0.02, { scene: s, riley: s.riley, enemies: [], zone: hazard === 'net' ? 0 : 3, bounds: s.bounds, stone, belal: { alive: true, phase: 2 } });
  assert.equal(s.riley.hp, 100); assert.ok(!(stone.snare > 0));
});
test('a cleared hall cannot create fresh lamps/oil while Riley walks to its exit', () => {
  const s = scene(), stone = createStone(); stone.clearZone(1); stone.lampAt = 0;
  for (let i = 0; i < 120; i++) stone.step(1 / 60, { scene: s, riley: s.riley, enemies: [], zone: 1, bounds: s.bounds, stone });
  assert.equal(stone.lamps.length, 0); assert.equal(stone.pools.length, 0);
});
test('the view renders the actual net/lamp/oil/line tell footprints, then disposes them', () => {
  const s = scene(), made = [], removed = []; s.textures = { exists: () => true };
  const make = (x, y, key) => { const o = { x, y, key, visible: true, destroy() { removed.push(this); } }; for (const k of ['setOrigin', 'setDepth', 'setDisplaySize', 'setScrollFactor', 'setAlpha', 'setScale', 'setBlendMode', 'setTint', 'setLighting', 'setFrame']) o[k] = () => o; o.setVisible = on => { o.visible = on; return o; }; o.setPosition = (x,y) => { o.x=x; o.y=y; return o; }; made.push(o); return o; };
  s.add = { image: make, sprite: make, tileSprite: make }; s.zoneI = 0; const view = createStage6View(s); view.buildBackdrop();
  const stone = createStone(); stone.nets.push({ zone: 0, x: 300, band: 1, phase: 'tell', t: 0.4 }); stone.lamps.push({ zone: 0, x: 400, y: 630, phase: 'swing', t: 0.2 }); stone.pools.push({ zone: 0, x: 500, y: 630, t: 1 }); stone.lines.push({ band: 2, phase: 'tell', t: 0.4 });
  view.sync({ s, stone });
  for (const key of ['s6net', 's6lamp', 's6oil', 's6streak']) assert.ok(made.some(o => o.key === key && o.visible), key);
  assert.ok(made.some(o => o.key === 's6net' && o.x === 300 && o.y === (BANDS[1][0] + BANDS[1][1]) / 2));
  stone.dispose(); view.sync({ s, stone }); for (const key of ['s6net', 's6lamp', 's6oil', 's6streak']) assert.ok(!made.some(o => o.key === key && o.visible && !removed.includes(o)), key);
  view.destroy(); assert.ok(made.every(o => removed.includes(o)));
});
test('Gray Man/Fadelt recover from every transient unhittable state and retire dead bodies', () => {
  for (const Actor of [GrayMan, Fadelt]) for (const state of ['down', ...(Actor === Fadelt ? ['blink'] : []), 'dead']) {
    const s = scene(), e = new Actor(s, 900, 630); e.state = state; if (state === 'dead') e.alive = false;
    for (let i = 0; i < 120; i++) e.update(1 / 60);
    if (state === 'dead') assert.equal(e.gone, true); else assert.equal(e.canBeHit, true);
  }
});

test('Be\'lal exposes the streak during each flurry tell, including the fourth counter window', () => {
  const s = scene(), b = new Belal(s, 650, 630); let visible = false; b.streak.setVisible = v => { visible = v; }; b.startFlurry();
  for (let i = 0; i < 4; i++) { b.hitI = i; b.st = BELAL.tells[i] - 0.2; b.sync(); assert.equal(visible, true, i); }
});

test('view teardown cancels the pending gallery glimpse timer', () => {
  const s = scene(); let removed = false;
  s.time = { delayedCall() { return { remove() { removed = true; } }; } };
  const view = createStage6View(s); view.glimpse(); view.destroy(); assert.equal(removed, true);
});

test('C1 every connected non-countered flurry hit pins 6/6/8/14 and only hit four knocks down', () => {
  const s = scene(), b = new Belal(s, 650, 630), drops = [];
  for (let i = 0; i < 4; i++) {
    b.state = 'attack'; b.hitI = i; b.st = BELAL.tells[i]; b.struck = false; s.riley.hurtStreak = 3;
    const hp = s.riley.hp; b.flurry(); drops.push(hp - s.riley.hp);
    if (i < 3) { assert.equal(s.riley.state, 'idle'); assert.equal(s.riley.hurtStreak, 0); } else assert.equal(s.riley.state, 'down');
  }
  assert.deepEqual(drops, [6, 6, 8, 14]); assert.deepEqual([...BELAL.tells], [0.55, 0.48, 0.48, 0.6]);
});
for (const side of ['left', 'right']) test(`C1 Be'lal neither walks nor lunges toward a Riley at the ${side} wall`, () => {
  const s = scene(); s.riley.x = side === 'left' ? 40 : 1240; const b = new Belal(s, side === 'left' ? 500 : 780, 630), x = b.x; b.cool = 0;
  for (let i = 0; i < 60; i++) b.update(1 / 60);
  assert.equal(b.x, x); assert.equal(b.state, 'idle');
});
