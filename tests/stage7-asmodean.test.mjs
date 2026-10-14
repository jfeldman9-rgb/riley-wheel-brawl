import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Asmodean, ASMODEAN } from '../src/asmodean.js';
import { PHRASES, freeBand, BEAT, NOTE, createNotes, stepNotes } from '../src/stage7-notes.js';
import { createArena7, RESONANCE, SHOCK, COLUMNS } from '../src/stage7-arena.js';

function scene() {
  return {
    enemies: [], bounds: { l: 3920, r: 5200 }, camX: 3900, paused: false, cutscene: null,
    riley: { x: 4300, y: 630, z: 0, hp: 100, alive: true, facing: 1, state: 'idle', attackFrame: false },
    kit: { phases: [], channels: 0, breaks: 0, fires: 0, bound: 0,
      onAsmoPhase(b, ph) { this.phases.push(ph); }, onChannel() { this.channels++; },
      onChannelBreak() { this.breaks++; }, onChannelFire() { this.fires++; },
      onBound() { this.bound++; }, onReflect() {}, onBashTell() {}, onCounter() {} },
    hud: { flashText() {} },
    bossPhases: [],
    onBossPhase(b, ph) { this.bossPhases.push(ph); },
    onEnemyDie() { this.died = true; },
    attackTokens() { return 0; }, maxTokens: 2,
  };
}
const stepBoss = (b, secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) b.update(dt); };

test('constants: 600 HP, 88 speed, 150 reach, 8000 score, gates at 66 and 33 percent', () => {
  assert.equal(ASMODEAN.hp, 600); assert.equal(ASMODEAN.speed, 88);
  assert.equal(ASMODEAN.reach, 150); assert.equal(ASMODEAN.score, 8000);
  const s = scene(); const b = new Asmodean(s, 4800, 630);
  assert.equal(b.maxHp, 600); assert.equal(b.phase, 1);
});

test('every phrase leaves a band free for its whole length and has exactly one gold note', () => {
  assert.ok(PHRASES.length >= 8);
  for (const p of PHRASES) {
    assert.equal(p.bands.length, 4);
    assert.ok(freeBand(p) >= 0, JSON.stringify(p.bands));
    assert.ok(p.gold >= 0 && p.gold < 4);
    for (const band of p.bands) assert.ok(band >= 0 && band <= 2);
  }
  assert.equal(BEAT, 0.625, '96 BPM on the game clock');
  assert.equal(NOTE.dmg, 7);
});

test('notes telegraph a beat before they launch and a reflected gold note staggers him', () => {
  const s = scene(); const b = new Asmodean(s, 4800, 630);
  b.facing = -1;
  const field = b.field;
  // Walk the phrase clock until the first note exists; a tell must have preceded it.
  let sawTell = false;
  for (let i = 0; i < 60 * 8 && !field.notes.length; i++) {
    stepNotes(field, 1 / 60, { scene: s, riley: s.riley, boss: b, interval: 5, active: true });
    if (field.tells.length) sawTell = true;
  }
  assert.ok(field.notes.length >= 1);
  assert.equal(sawTell, true, 'the band lit up before the note flew');
  // Reflect: place a gold note in front of an attacking Riley.
  const hp0 = b.hp;
  field.notes = [{ x: s.riley.x + 60, y: s.riley.y, band: 1, dir: -1, gold: true, reflected: false, dead: false, age: 1 }];
  s.riley.attackFrame = true; s.riley.facing = 1;
  let reflected = false;
  for (let i = 0; i < 60 * 3 && b.hp === hp0; i++) {
    stepNotes(field, 1 / 60, { scene: s, riley: s.riley, boss: b, interval: 5, active: false, onReflect: () => { reflected = true; } });
  }
  assert.equal(reflected, true);
  assert.equal(b.hp, hp0 - Math.round(600 * ASMODEAN.reflectFrac), '4 percent of max HP');
  assert.equal(b.state, 'stagger');
  // A plain note costs Riley 7.
  s.riley.attackFrame = false;
  field.notes = [{ x: s.riley.x + 40, y: s.riley.y, band: 1, dir: -1, gold: false, reflected: false, dead: false, age: 1 }];
  for (let i = 0; i < 60 && s.riley.hp === 100; i++) stepNotes(field, 1 / 60, { scene: s, riley: s.riley, boss: b, interval: 5, active: false });
  assert.equal(s.riley.hp, 100 - NOTE.dmg);
});

test('gates cannot be skipped by any damage source (fuzz)', () => {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let trial = 0; trial < 25; trial++) {
    const s = scene(); const b = new Asmodean(s, 4800, 630);
    let guard = 0;
    while (b.alive && !b.bound && guard++ < 1000) {
      const before = b.phase;
      b.invuln = false; b.beat = false; if (b.state === 'stagger' || b.state === 'stun') { b.state = 'idle'; }
      b.takeHit({ dmg: 1 + Math.floor(rnd() * 300) });
      if (b.phase === 1) assert.ok(b.hp > Math.floor(600 * 0.66) || b.bound, `phase 1 hp ${b.hp}`);
      if (before === 1 && b.phase === 2) assert.equal(b.hp, Math.floor(600 * 0.66));
      if (before === 2 && b.phase === 3) assert.equal(b.hp, Math.floor(600 * 0.33));
      assert.ok(b.phase <= before + 1, 'never two phases at once');
      stepBoss(b, 0.05);
    }
    assert.equal(b.bound, true, 'beaten and bound, not killed');
    assert.deepEqual(s.bossPhases, [2, 3]);
    assert.equal(s.kit.bound, 1);
  }
});

test('phase 3 channel: 1.8 s, 3 hits (or a throw) break it into a 1.4 s stun, completion fires the ring', () => {
  const s = scene(); const b = new Asmodean(s, 4800, 630);
  b.phase = 3;
  b.startChannel();
  assert.equal(s.kit.channels, 1);
  b.takeHit({ dmg: 1 }); b.takeHit({ dmg: 1 });
  assert.equal(b.state, 'channel');
  b.takeHit({ dmg: 1 });
  assert.equal(b.state, 'stun');
  assert.equal(b.staggerDur, ASMODEAN.stun);
  assert.equal(s.kit.breaks, 1);
  // A throw (down hit) breaks it alone.
  const s2 = scene(); const b2 = new Asmodean(s2, 4800, 630);
  b2.phase = 3; b2.startChannel();
  b2.takeHit({ dmg: 1, down: true });
  assert.equal(b2.state, 'stun');
  // Uninterrupted, it completes at 1.8 s and fires.
  const s3 = scene(); const b3 = new Asmodean(s3, 4800, 630);
  b3.phase = 3; b3.startChannel();
  stepBoss(b3, ASMODEAN.channel - 0.1);
  assert.equal(s3.kit.fires, 0);
  stepBoss(b3, 0.2);
  assert.equal(s3.kit.fires, 1);
  assert.ok(b3.channelAt > ASMODEAN.channelEvery - 0.5 && b3.channelAt <= ASMODEAN.channelEvery, b3.channelAt);
});

test('harp bash tells for 0.55 s before it can hurt Riley', () => {
  const s = scene(); const b = new Asmodean(s, 4800, 630);
  s.riley.x = 4700; s.riley.y = 630;
  b.startBash();
  stepBoss(b, ASMODEAN.bashTell - 0.05);
  assert.equal(s.riley.hp, 100);
  stepBoss(b, 0.1);
  assert.equal(s.riley.hp, 100 - ASMODEAN.bashDmg);
});

test('column resonance: 1 s hum, then a 0.9 s rain in one 220 px strip that also hits enemies', () => {
  const a = createArena7();
  assert.equal(a.columns.length, 5);
  assert.deepEqual([...COLUMNS], [4100, 4350, 4600, 4850, 5050]);
  const s = scene();
  const foeHits = [];
  const foe = { x: COLUMNS[0], y: 630, alive: true, type: 'grunt', takeHit(h) { foeHits.push(h.dmg); } };
  s.riley.x = COLUMNS[0] + 40;
  const w = { scene: s, riley: s.riley, enemies: [foe], boss: { alive: true }, resonance: true };
  a.at = 0;
  a.step(1 / 60, w);
  assert.ok(a.rain); assert.equal(a.rain.phase, 'tell'); assert.equal(a.rain.x, COLUMNS[0]);
  for (let t = 0; t < RESONANCE.tell - 0.05; t += 1 / 60) a.step(1 / 60, w);
  assert.equal(s.riley.hp, 100, 'the hum is only a tell');
  for (let t = 0; t < 0.2; t += 1 / 60) a.step(1 / 60, w);
  assert.equal(s.riley.hp, 100 - RESONANCE.dmg);
  assert.deepEqual(foeHits, [RESONANCE.enemyDmg]);
  for (let t = 0; t < RESONANCE.rain; t += 1 / 60) a.step(1 / 60, w);
  assert.equal(a.rain, null);
  assert.equal(s.riley.hp, 100 - RESONANCE.dmg, 'one hit per rain');
});

test('shockwave expands at 520 px/s for 0.5 s and a jump started just before contact avoids it', () => {
  const a = createArena7();
  const s = scene();
  s.riley.x = 4550; s.riley.y = 630; s.riley.z = 0;
  a.fireShock(4800, 630);
  const w = { scene: s, riley: s.riley, enemies: [], boss: null, resonance: false };
  // Distance 250: the ring arrives at about 0.48 s. Jump at 0.35 s.
  for (let t = 0; t < 0.35; t += 1 / 60) a.step(1 / 60, w);
  s.riley.z = 90;
  for (let t = 0; t < 0.4; t += 1 / 60) a.step(1 / 60, w);
  assert.equal(s.riley.hp, 100, 'airborne over the ring');
  assert.equal(a.shock, null, 'the ring dies after 0.5 s');
  // Grounded: it lands for 16.
  const a2 = createArena7();
  const s2 = scene(); s2.riley.x = 4650; s2.riley.y = 630; s2.riley.z = 0;
  a2.fireShock(4800, 630);
  const w2 = { scene: s2, riley: s2.riley, enemies: [], boss: null, resonance: false };
  for (let t = 0; t < SHOCK.life; t += 1 / 60) a2.step(1 / 60, w2);
  assert.equal(s2.riley.hp, 100 - SHOCK.dmg);
});
