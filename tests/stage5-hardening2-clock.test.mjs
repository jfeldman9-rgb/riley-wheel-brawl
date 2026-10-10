import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { substeps, SUB_CAP } from '../src/stage5-clock.js';
import { BalthamelActor } from '../src/stage5-actors.js';

test('a clamped tab-resume frame drops the backlog before the next normal frame', () => {
  const owner = {}; let n = 0;
  assert.equal(substeps(owner, 1e8, () => n++), SUB_CAP);
  assert.equal(substeps(owner, 1 / 120, () => n++), 1);
  assert.equal(n, SUB_CAP + 1);
});

test('Balthamel drop motion agrees at 30/60/120 Hz', () => {
  const z = [];
  for (const hz of [30, 60, 120]) {
    const scene = { enemies: [], riley: { x: 100, y: 630, alive: true }, kit: {} };
    const b = new BalthamelActor(scene, 200, 630);
    for (let i = 0; i < hz / 5; i++) b.update(1 / hz);
    z.push(b.z);
  }
  assert.ok(Math.max(...z) - Math.min(...z) < 1e-8, JSON.stringify(z));
});
