import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation } from './helpers/stage4-harness.mjs';

test('P3 combat lights are capped at ten, recover after transient lights retire and obey lights-off', () => {
  const h = stage4Simulation({ mode: null }), s = h.s;
  const light = () => s.lights.addLight(4500, 630, 200, 0xffffff, 1);
  try {
    s.kit.view.budget(3920, true); s.kit.view.moon.intensity = 1;
    s.beam = { lights: [light(), light(), light()] };
    s.powers.shield = { L: light() }; s.powers.bolts = [{ L: light() }];
    s.fireballs = [{ light: light() }]; s.fx.booms = [{ L: light() }, { L: light() }];
    s.pickups = [{ L: light() }, { L: light() }]; s.fx.hitLight.intensity = 1;
    s.kit.applyLightBudget(); const record = s.kit.lightBudget;
    assert.equal(record.active, 10); assert.ok(record.candidates > 10);
    assert.equal(s.kit.lightScratch.filter(L => L.visible !== false).length, 10);
    s.lightsOn = false; s.kit.applyLightBudget(); assert.equal(record.active, 0);
    s.lightsOn = true; s.beam = null; s.powers.shield = null; s.powers.bolts = []; s.fireballs = []; s.fx.booms = []; s.pickups = [];
    s.kit.applyLightBudget(); assert.equal(s.kit.lightBudget, record); assert.ok(record.active < 10);
    assert.ok(s.kit.lightScratch.every(L => L.visible));
  } finally { s.beam = null; s.powers.shield = null; s.powers.bolts = []; h.destroy(); }
});
