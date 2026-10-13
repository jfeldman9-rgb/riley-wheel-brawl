import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6Simulation } from './helpers/stage6-harness.mjs';
import { stage7Simulation } from './helpers/stage7-harness.mjs';
import { bindCallLabel } from '../src/stage7-hud.js';
import { Stage1 } from '../src/stage1.js';

test('stage 6 still has Rand and stage 7 has Moiraine and Lan', () => {
  const a = stage6Simulation({ mode: null });
  const b = stage7Simulation({ mode: null });
  try {
    assert.ok(a.s.kit.rand);
    assert.equal(a.s.kit.call, undefined);
    assert.ok(b.s.kit.call);
    assert.equal(b.s.kit.rand, undefined);
    assert.notEqual(b.s.callLoial, Stage1.prototype.callLoial);
    const hooked = b.s.callLoial;
    b.s.kit.destroy();
    assert.equal(b.s.callLoial, Stage1.prototype.callLoial);
    assert.notEqual(hooked, Stage1.prototype.callLoial);
    const hud = {
      loialT: { text: 'Loial', setText(t) { this.text = t; return this; }, setColor() { return this; } },
      loialPic: { setAlpha() {}, setTexture() { return this; }, setDisplaySize() { return this; } },
      caption(who, text) { this.said = who + ':' + text; },
      capWho: { setColor(c) { this.color = c; } },
    };
    bindCallLabel(hud);
    hud.updateLoialLabel({
      stageNo: 7, time: { now: 0 }, textures: { exists: () => false },
      kit: { call: b.s.kit.call, strike: null, helperNow: () => 'moiraine' },
    }, {});
    assert.equal(/Loial|Rand/.test(hud.loialT.text), false);
    hud.caption('ASMODEAN', 'A dirge.');
    assert.equal(hud.capWho.color, '#ffb3a0');
  } finally { a.destroy(); b.destroy(); }
});
