import test from 'node:test';
import assert from 'node:assert/strict';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';
import { Cultist, casterBusy, cultistHoldsToken } from '../src/cultists.js';
import { createFog } from '../src/stage4-hazards.js';
import { createTowers } from '../src/stage4-towers.js';

for (const hit of [{ dmg: 1 }, { dmg: 1, kind: 'heavy' }, { dmg: 1, down: true }, { dmg: 0, hazard: true }]) test(`every surviving chant hit dazes for 0.8s: ${JSON.stringify(hit)}`, () => {
  let summons = 0;
  const s = { riley: { x: 800, y: 630, alive: true }, enemies: [] };
  const c = new Cultist(s, 400, 630, { summonVent() { summons++; } });
  c.startChant(); c.update(0.9); c.takeHit(hit, s.riley);
  assert.equal(c.state, 'dazed'); assert.equal(c.st, 0); assert.equal(casterBusy(s), false); assert.equal(cultistHoldsToken(c), false);
  c.update(0.79); assert.equal(c.state, 'dazed'); c.update(0.01); assert.equal(c.state, 'approach'); assert.equal(summons, 0);
});
for (const hazard of ['fog knock', 'fog tick', 'tower']) test(`${hazard} interrupts a live chant before its vent opens`, () => {
  let summons = 0;
  const s = { riley: { x: 800, y: 630, hp: 100, alive: true, state: 'idle' }, enemies: [] };
  const c = new Cultist(s, 400, 630, { summonVent() { summons++; } });
  c.hp = 100;
  if (hazard === 'tower') {
    const t = createTowers(); t.arm(2); t.setWave(0); s.riley.x = 2780; c.x = 3000;
    t.step(1.3, s); c.startChant(); t.step(1.6, s);
  } else {
    const fog = createFog(), v = fog.addVent({ x: 0, y: 630, zone: 1 }); fog.tryEmit(v, s); fog.step(0.8, s);
    fog.tendrils[0].tip.x = c.x; c.startChant();
    if (hazard === 'fog knock') c.knocked = true; else c.fogContact = 59;
    fog.step(1 / 120, s);
  }
  assert.equal(c.state, 'dazed'); assert.equal(casterBusy(s), false);
  c.update(0.2); assert.equal(summons, 0);
});
for (const exit of ['defeat', 'actor death', 'actor destroy', 'clear hazards']) test(`caster token released on ${exit}`, () => {
  const c = kissScene();
  try {
    const e = c.s.spawn('cultist', 'R'); e.entering = false; e.startChant();
    assert.equal(casterBusy(c.s), true);
    if (exit === 'defeat') e.defeat(c.R);
    if (exit === 'actor death') e.die();
    if (exit === 'actor destroy') e.destroy();
    if (exit === 'clear hazards') c.s.kit.clearHazards();
    assert.equal(casterBusy(c.s), false); assert.equal(cultistHoldsToken(e), false);
  } finally { c.h.destroy(); }
});
