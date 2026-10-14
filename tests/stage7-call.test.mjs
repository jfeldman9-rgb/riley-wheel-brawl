import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed } from './helpers/stage7-harness.mjs';
import { installStage7SceneHooks, restoreStage7Hooks } from '../src/stage7-lifecycle.js';
import { createCall7 } from '../src/moilan-call.js';
import { createStorm } from '../src/stage7-storm.js';
import { Stage7Kit } from '../src/stage7.js';
import { bindCallLabel } from '../src/stage7-hud.js';

test('hooks install on the scene instance and restore to the exact originals', () => {
  const orig = {
    spawn() { return null; }, callLoial() { return 'loial'; }, onEnemyDie() {}, update() {},
    rileyDied() {}, continueGame() {},
  };
  const s = { ...orig, enemies: [], riley: null, inp: { flushPresses() {} } };
  const kit = { s, storm: createStorm(1), call7: createCall7(), stats: {}, hooks: [] };
  installStage7SceneHooks(kit);
  assert.notEqual(s.callLoial, orig.callLoial);
  restoreStage7Hooks(kit);
  for (const k of Object.keys(orig)) assert.equal(s[k], orig[k], k);
  assert.equal(s.callLoial(), 'loial', 'Stages 1-5 keep their Loial call after a Stage 7 scene dies');
});

test('the kit freeze predicates track strike and cutscene exactly', () => {
  const fw = Stage7Kit.prototype.freezesWorld, fr = Stage7Kit.prototype.freezesRiley;
  assert.equal(fw.call({ strike: null, s: {} }), false);
  assert.equal(fw.call({ strike: {}, s: {} }), true);
  assert.equal(fw.call({ strike: null, s: { cutscene: {} } }), true);
  assert.equal(fr.call({ strike: {}, s: {} }), true);
  assert.equal(fr.call({ strike: null, s: {} }), false);
});

test('in game: CALL spends the charge, the strike resolves, Riley ends invulnerable, no Loial spawns', () => withSeed(1, () => {
  const h = stage7Simulation({ call: false });
  const s = h.s;
  try {
    // Walk into the first fight.
    for (let i = 0; i < 60 * 30 && !s.enemies.some(e => e.alive && !e.entering); i++) h.step();
    assert.ok(s.enemies.some(e => e.alive), 'zone 0 is fighting');
    assert.equal(s.kit.call7.calls, 0);
    const ok = s.callLoial();
    assert.equal(ok, true, 'the assist path routes to Moiraine/Lan on Stage 7');
    assert.equal(s.kit.call7.calls, 1);
    assert.equal(s.loial, null);
    let maxInv = 0, froze = false;
    for (let i = 0; i < 60 * 8 && (s.kit.strike || i < 130); i++) {
      if (s.kit.strike) froze = s.kit.freezesWorld() || froze;
      h.step();
      maxInv = Math.max(maxInv, s.riley.inv || 0);
    }
    assert.equal(s.kit.strike, null, 'the strike finished and thawed');
    assert.equal(froze, true, 'the world froze during the strike');
    assert.ok(maxInv >= 1.5, `Riley invulnerable after the call (saw ${maxInv})`);
    assert.equal(s.kit.stats.calls, 1);
    // A second immediate call is refused: the charge is spent.
    assert.equal(s.callLoial(), false);
    assert.equal(s.kit.call7.calls, 1);
  } finally { h.destroy(); }
}));

test('HUD slot shows the predicted helper and never Loial or Rand; unbind restores the Loial label', () => {
  const texts = [];
  const loialT = { setText(t) { texts.push(t); return { setColor() {} }; } };
  function origLabel() { return 'loial'; }
  const hud = { loialT, loialPic: null, updateLoialLabel: origLabel };
  const unbind = bindCallLabel(hud);
  const s = { stageNo: 7, kit: { call7: createCall7(), predicted: 'moiraine', strike: null }, textures: { exists: () => false } };
  hud.updateLoialLabel(s, {});
  assert.deepEqual(texts, ['MOIRAINE READY']);
  s.kit.predicted = 'lan'; hud._call7Key = '';
  hud.updateLoialLabel(s, {});
  assert.equal(texts.at(-1), 'LAN READY');
  s.kit.predicted = 'duo'; hud._call7Key = '';
  hud.updateLoialLabel(s, {});
  assert.equal(texts.at(-1), 'CALL READY');
  for (const t of texts) assert.doesNotMatch(t, /Loial|Rand/i);
  unbind();
  assert.equal(hud.updateLoialLabel, origLabel);
});
