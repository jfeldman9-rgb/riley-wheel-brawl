import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { stage3Simulation } from './helpers/stage3-harness.mjs';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { stage5Simulation } from './helpers/stage5-harness.mjs';
import { q } from '../src/config.js';
import { perf } from '../src/perf.js';

let current, rendererName = 'test GPU', serial = 0;
Object.assign(Phaser, { WEBGL: 2, Scale: { FIT: 1, CENTER_BOTH: 1 },
  Game: class {
    constructor() {
      this.events = new EventEmitter();
      this.scene = { getScene: () => current };
      this.scale = { resize() {} };
      this.renderer = { gl: { getExtension: () => null, getParameter: () => rendererName }, drawingContextPool: { clear() {} } };
    }
  },
});
async function boot(s, software = false) {
  current = s; rendererName = software ? 'SwiftShader' : 'test GPU';
  q.set('q', '0');
  await import(`../src/main.js?hardening=${++serial}`);
  const game = window.__game;
  s.started = true; perf.lastSampleMs = 0;
  game.governor(1 / 60);
  return game;
}
for (const stage of [1, 2, 3, 4, 5]) test(`real governor levels 0..5 and restart with Stage ${stage}`, async () => {
  const h = stage === 5 ? stage5Simulation({ mode: null }) : stage === 4 ? stage4Simulation({ mode: null }) : stage === 3 ? stage3Simulation({ mode: null }) : stage1Simulation({ stage, mode: null });
  const s = h.s, colors = [];
  s.lights.setAmbientColor = color => { assert.ok(Number.isFinite(color), 'ambient must be finite'); colors.push(color); };
  try {
    const game = await boot(s);
    for (let level = 0; level <= 5; level++) {
      if (level) { perf.lastSampleMs = 2001; game.governor(1 / 60); }
      assert.equal(perf.quality, level);
      s.setBackdropLit(level < 4);
      if (s.kit) s.kit.update(1 / 60);
      assert.equal(colors[colors.length - 1], level >= 4 ? (s.kit?.ambientUnlit ?? 0x5a6482) : (s.kit?.ambient ?? 0x39425f));
      // Real Scene shutdown/create through the existing harness, then reapply.
      s.scene.restart({ stage }); h.step(); s.started = true;
      perf.lastSampleMs = 0; game.governor(1 / 60);
      assert.equal(perf.quality, level);
      s.setBackdropLit(level < 4); assert.ok(Number.isFinite(s.ambient));
    }
  } finally { window.__game.events.emit('destroy'); h.destroy(); q.delete('q'); }
});
test('software WebGL first frame applies level 4 to Stage 4', async () => {
  const h = stage4Simulation({ mode: null });
  try {
    const game = await boot(h.s, true);
    assert.equal(perf.quality, 4);
    assert.equal(h.s.backdropIsLit, false);
    assert.equal(h.s.ambient, 0x5a6482);
    h.s.kit.update(1 / 60);
    assert.equal(h.s.ambient, 0x5a6482);
    game.events.emit('destroy');
  } finally { h.destroy(); q.delete('q'); }
});
test('future kits with no quality method or either ambient getter use finite fallback colors', async () => {
  const h = stage1Simulation({ mode: null });
  try {
    h.s.kit = {};
    const game = await boot(h.s, true);
    assert.equal(h.s.ambient, 0x5a6482);
    for (const kit of [{}, { ambient: 123 }, { ambientUnlit: 456 }, { ambient: NaN, ambientUnlit: undefined }]) {
      h.s.kit = kit;
      h.s.setBackdropLit(true); assert.equal(h.s.ambient, Number.isFinite(kit.ambient) ? kit.ambient : 0x39425f);
      h.s.setBackdropLit(false); assert.equal(h.s.ambient, Number.isFinite(kit.ambientUnlit) ? kit.ambientUnlit : 0x5a6482);
    }
    h.s.runId++; game.governor(1 / 60);
    game.events.emit('destroy');
  } finally { h.s.kit = null; h.destroy(); q.delete('q'); }
});
